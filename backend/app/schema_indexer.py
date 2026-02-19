from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
import uuid

#connect to qdrant 

client = QdrantClient("localhost", port=6333)

model = SentenceTransformer('all-MiniLM-L6-v2')

COLLECTION_NAME = "schema_embeddings"

def create_collection():
    client.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=384,
            distance=Distance.COSINE
        ),
    )

def index_schema():
    schemas = [
        "Table orders(id, product_id, quantity, price, date)",
        "Table products(id, name, category)"

    ]

    points = []

    for schema in schemas:
        vector = model.encode(schema).tolist()
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"schema": schema}
            )

        )

    client.upsert(collection_name=COLLECTION_NAME, points=points)

if __name__ == "__main__":
    create_collection()
    index_schema()
    print("schema indexed successfully.")

    