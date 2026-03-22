import sys
import os
sys.path.append(r"E:\TrumanHacks_26\BackEnd")

from db import get_engine
from sqlalchemy import text

def run_migration():
    engine = get_engine()
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN current_code TEXT;"))
            print("Added current_code")
        except Exception as e:
            print("current_code error:", e)
            
        try:
            conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN last_execution JSONB;"))
            print("Added last_execution")
        except Exception as e:
            print("last_execution error:", e)
            
        conn.commit()
    print("Migration completed.")

if __name__ == "__main__":
    run_migration()
