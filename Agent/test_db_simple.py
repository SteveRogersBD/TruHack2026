from db import get_db, engine
from sqlalchemy import select
from models import User

def test_db():
    print("Testing DB connection...")
    gen = get_db()
    db = next(gen)
    try:
        result = db.scalar(select(1))
        print(f"Connection successful, select 1 returned: {result}")
        
        # Try to query users
        user_count = db.scalar(select(User))
        print("Querying users successful (even if None)")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_db()
