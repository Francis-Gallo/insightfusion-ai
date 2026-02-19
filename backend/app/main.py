from fastapi import FastAPI
from app.database import engine, SessionLocal
from app.models import Base, Product, Order
from app.llm_service import generate_sql
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from datetime import date

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.on_event("startup")
def seed_data():
    db = SessionLocal()

    # Check if data already exists
    if db.query(Product).first():
        db.close()
        return

    # Create products
    product1 = Product(name="Laptop", category="Electronics")
    product2 = Product(name="Headphones", category="Electronics")
    product3 = Product(name="Shoes", category="Fashion")

    db.add_all([product1, product2, product3])
    db.commit()

    # Create orders
    order1 = Order(product_id=1, quantity=2, price=1000, date=date(2024, 1, 10))
    order2 = Order(product_id=2, quantity=5, price=200, date=date(2024, 2, 15))
    order3 = Order(product_id=3, quantity=3, price=150, date=date(2024, 3, 20))

    db.add_all([order1, order2, order3])
    db.commit()

    db.close()


@app.get("/")
def root():
    return {"message": "InsightFusion AI is running 🚀"}


@app.get("/test-db")
def test_db():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"database_response": result.scalar()}


@app.get("/orders")
def get_orders():
    db = SessionLocal()
    orders = db.query(Order).all()
    result = [
        {
            "id": o.id,
            "product_id": o.product_id,
            "quantity": o.quantity,
            "price": o.price,
            "date": str(o.date)
        }
        for o in orders
    ]
    db.close()
    return result

@app.get("/ask")
def ask(question: str):
    sql_query = generate_sql(question)

    # 🔥 Normalize SQL safely
    sql_query = sql_query.strip()
    sql_query_lower = sql_query.lower().lstrip()

    if not sql_query_lower.split()[0] == "select":

        return {
            "error": "Only SELECT queries are allowed.",
            "generated_sql": sql_query
        }

    with engine.connect() as connection:
        result = connection.execute(text(sql_query))
        rows = [dict(row._mapping) for row in result]

    return {
        "question": question,
        "generated_sql": sql_query,
        "result": rows
    }
