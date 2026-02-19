import os
from openai import OpenAI
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

load_dotenv()

# 🔥 LM Studio Client
client = OpenAI(
    base_url="http://127.0.0.1:1234/v1",
    api_key="lm-studio"
)

# 🔥 Qdrant Setup
qdrant = QdrantClient("localhost", port=6333)
model = SentenceTransformer("all-MiniLM-L6-v2")
COLLECTION_NAME = "schema_embeddings"


def retrieve_schema(question: str):
    query_embedding = model.encode(question).tolist()

    search_result = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=3
    ).points

    schemas = []
    for point in search_result:
        schemas.append(point.payload["schema"])

    return "\n".join(schemas)


def generate_sql(question: str) -> str:
    # 🔥 Retrieve relevant schema dynamically
    relevant_schemas = retrieve_schema(question)

    prompt = f"""
You are a PostgreSQL expert.

Here are the available tables:
{relevant_schemas}

Generate ONLY a safe SELECT SQL query for this question:
"{question}"

Return only raw SQL.
No markdown.
No explanation.
"""

    response = client.chat.completions.create(
        model="qwen2.5-coder-7b-instruct",
        messages=[
            {"role": "system", "content": "You generate SQL queries."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    sql = response.choices[0].message.content.strip()

    # 🔥 BULLETPROOF MARKDOWN CLEANING
    sql = sql.replace("```sql", "")
    sql = sql.replace("```", "")
    sql = sql.strip()

    return sql