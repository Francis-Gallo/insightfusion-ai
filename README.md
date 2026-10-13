# InsightFusion AI: ask your database in plain English

Type a question such as *"What is total sales?"*. InsightFusion finds the relevant table schemas with vector
search, has a **local LLM** write a PostgreSQL `SELECT`, runs it, and the React UI shows the answer as a
**KPI card, a line chart, a bar chart or a table**, depending on the shape of the result.

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL%2015-4169E1?logo=postgresql&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-DC244C)
![React](https://img.shields.io/badge/React%2019%20%2B%20TS-20232A?logo=react&logoColor=61DAFB)
![LM Studio](https://img.shields.io/badge/LLM-qwen2.5--coder--7b%20via%20LM%20Studio-6D28D9)

## How it works

```mermaid
flowchart LR
    Q[Question in the React chat] --> A[FastAPI GET /ask]
    A --> E[Embed question<br/>all-MiniLM-L6-v2]
    E --> V[Qdrant: top-3 table schemas]
    V --> L[qwen2.5-coder-7b-instruct<br/>via LM Studio, temperature 0]
    L --> G{First keyword<br/>is SELECT?}
    G -- no --> X[Rejected, SQL shown to the user]
    G -- yes --> P[(PostgreSQL)]
    P --> R[Rows + generated SQL]
    R --> UI[KPI card / line / bar / table]
```

- **Schema retrieval (`schema_indexer.py`, `llm_service.py`):** each table description is embedded with
  `sentence-transformers/all-MiniLM-L6-v2` (384-d, cosine) and stored in the Qdrant collection `schema_embeddings`.
  At question time the top 3 schemas are put into the prompt, so the whole schema does not have to be hard-coded
  into it.
- **SQL generation:** `qwen2.5-coder-7b-instruct` served by LM Studio at `http://127.0.0.1:1234/v1` (temperature 0).
  Markdown fences are stripped from the answer.
- **Guard:** the backend refuses any query whose first word is not `SELECT`, and returns the generated SQL so you can see why.
- **Visualization (`frontend/src/App.tsx`):**
  - one row with one numeric value → KPI card,
  - a date-like label column plus a number → line chart (Recharts),
  - a text label plus a number → bar chart,
  - otherwise → the raw rows.
- **Demo data:** on first start the backend creates the `products` and `orders` tables and seeds 3 products and
  3 orders (Jan–Mar 2024).

## Run it locally

Requirements: Docker, Python 3.11+, Node.js 20.19+ or 22.12+, and LM Studio with `qwen2.5-coder-7b-instruct` loaded and the local server running.

```bash
git clone https://github.com/Francis-Gallo/insightfusion-ai.git
cd insightfusion-ai

# 1. PostgreSQL (admin/admin, db "analytics") + Qdrant
docker compose up -d

# 2. Backend
cd backend
python -m venv venv && source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt                           # on Linux/macOS, remove the pywin32 line first
echo "DATABASE_URL=postgresql://admin:admin@localhost:5432/analytics" > .env
python app/schema_indexer.py                              # embeds the 2 table schemas into Qdrant
uvicorn app.main:app --reload                             # http://127.0.0.1:8000

# 3. Frontend (new terminal, from the repo root)
cd frontend
npm install
npm run dev                                               # http://localhost:5173
```

### Try these questions

- Show all orders
- What is total sales?
- Show total sales per product
- Which product generated the highest revenue?
- Show revenue by month

## API

| Endpoint | What it does |
|---|---|
| `GET /ask?question=...` | Generates SQL, runs it, and returns `{question, generated_sql, result}` or `{error, generated_sql}` |
| `GET /orders` | Lists the seeded orders |
| `GET /test-db` | Runs `SELECT 1` |
| `GET /` | Health message |

## Project layout

```
backend/app/main.py            FastAPI app, seeding, /ask
backend/app/llm_service.py     schema retrieval (Qdrant) + SQL generation (LM Studio)
backend/app/schema_indexer.py  embeds table descriptions into Qdrant
backend/app/models.py          SQLAlchemy models: products, orders
backend/app/database.py        engine from DATABASE_URL (.env)
frontend/src/App.tsx           chat UI + chart selection
docker-compose.yml             postgres:15 + qdrant
```

## Limitations and honest notes

- **Small demo schema.** Two tables are indexed, and their descriptions are hard-coded in `schema_indexer.py`.
  Retrieval only starts to matter with many tables. Generating these descriptions from `information_schema` is the
  obvious next step.
- **The SELECT check is not a security boundary.** It only checks the first word. For anything beyond a local demo,
  connect with a **read-only database role** and a statement timeout, and reject multi-statement input.
- **The chart choice looks at the first row only**, and uses the first numeric and the first non-numeric column.
- **Hard-coded endpoints:** the backend URL (`127.0.0.1:8000`), LM Studio URL and model name are in the code.

## Roadmap

- Index the schema automatically from `information_schema`
- Read-only DB role, SQL parsing with `sqlglot`, and a retry when the generated SQL fails
- Explain each query in plain English next to the SQL
- A small accuracy benchmark: a set of questions with expected results

## License

MIT. See [LICENSE](LICENSE).
