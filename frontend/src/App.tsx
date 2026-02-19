import { useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

type Message = {
  role: "user" | "assistant";
  content: string;
  sql?: string;
  result?: any[];
  error?: string;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setQuestion("");

    try {
      const res = await axios.get("http://127.0.0.1:8000/ask", {
        params: { question },
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: "Here is your result:",
        sql: res.data.generated_sql,
        result: res.data.result,
        error: res.data.error,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error contacting backend.",
          error: "Connection failed",
        },
      ]);
    }

    setLoading(false);
  };

  // 🔥 Smart Visualization Engine
  const renderChart = (data: any[]) => {
    if (!data || data.length === 0) return null;

    const keys = Object.keys(data[0]);

    // ✅ KPI Detection (single numeric value)
    if (data.length === 1 && keys.length === 1) {
      const value = data[0][keys[0]];
      if (typeof value === "number") {
        return (
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>{keys[0]}</div>
            <div style={styles.kpiValue}>{value}</div>
          </div>
        );
      }
    }

    // ✅ Detect numeric & label columns
    const numericKeys = keys.filter(
      (key) => typeof data[0][key] === "number"
    );

    const labelKeys = keys.filter(
      (key) => typeof data[0][key] !== "number"
    );

    if (numericKeys.length === 0 || labelKeys.length === 0) return null;

    const numericKey = numericKeys[0];
    const labelKey = labelKeys[0];

    const isDate = !isNaN(Date.parse(data[0][labelKey]));

    if (isDate) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid stroke="#374151" />
            <XAxis dataKey={labelKey} />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={numericKey}
              stroke="#2563eb"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid stroke="#374151" />
          <XAxis dataKey={labelKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={numericKey} fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>InsightFusion AI 💬</h1>

      <div style={styles.chatBox}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              alignSelf:
                msg.role === "user" ? "flex-end" : "flex-start",
              backgroundColor:
                msg.role === "user" ? "#2563eb" : "#1f2937",
            }}
          >
            <div>{msg.content}</div>

            {msg.sql && (
              <>
                <div style={styles.sectionTitle}>
                  Generated SQL:
                </div>
                <pre style={styles.code}>{msg.sql}</pre>
              </>
            )}

            {msg.result && msg.result.length > 0 && (
              <>
                <div style={styles.sectionTitle}>
                  Visualization:
                </div>
                {renderChart(msg.result)}

                <div style={styles.sectionTitle}>
                  Result Table:
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    marginTop: "10px",
                  }}
                >
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {Object.keys(msg.result[0]).map(
                          (key) => (
                            <th
                              key={key}
                              style={styles.th}
                            >
                              {key}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {msg.result.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map(
                            (value, j) => (
                              <td
                                key={j}
                                style={styles.td}
                              >
                                {String(value)}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {msg.error && (
              <div style={styles.error}>
                {msg.error}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ color: "#9ca3af" }}>
            Thinking...
          </div>
        )}
      </div>

      <div style={styles.inputContainer}>
        <input
          style={styles.input}
          type="text"
          placeholder="Ask about your data..."
          value={question}
          onChange={(e) =>
            setQuestion(e.target.value)
          }
          onKeyDown={(e) =>
            e.key === "Enter" && askQuestion()
          }
        />
        <button
          style={styles.button}
          onClick={askQuestion}
        >
          Ask
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#111827",
    color: "white",
    padding: "20px",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
  },
  chatBox: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    overflowY: "auto",
    padding: "10px",
  },
  message: {
    maxWidth: "70%",
    padding: "15px",
    borderRadius: "10px",
  },
  inputContainer: {
    display: "flex",
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "6px",
    border: "none",
    outline: "none",
  },
  button: {
    padding: "12px 20px",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
  },
  sectionTitle: {
    marginTop: "12px",
    fontWeight: "bold",
  },
  code: {
    backgroundColor: "#0f172a",
    padding: "10px",
    borderRadius: "6px",
    overflowX: "auto",
    marginTop: "5px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    overflow: "hidden",
  },
  th: {
    padding: "10px",
    borderBottom: "1px solid #374151",
    textAlign: "left",
    backgroundColor: "#1f2937",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #374151",
  },
  error: {
    color: "red",
    marginTop: "10px",
  },
  kpiCard: {
    backgroundColor: "#0f172a",
    padding: "30px",
    borderRadius: "12px",
    textAlign: "center",
    marginTop: "10px",
  },
  kpiLabel: {
    fontSize: "18px",
    color: "#9ca3af",
    marginBottom: "10px",
  },
  kpiValue: {
    fontSize: "42px",
    fontWeight: "bold",
    color: "#2563eb",
  },
};

export default App;
