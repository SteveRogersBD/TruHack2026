from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

load_dotenv("../.env")
url = os.getenv("DATABASE_URL")
if url.startswith("postgresql://"):
    url = "postgresql+psycopg://" + url[len("postgresql://") :]

print(f"Connecting to: {url[:30]}...")
engine = create_engine(url)
inspector = inspect(engine)
print(f"Tables: {inspector.get_table_names()}")
