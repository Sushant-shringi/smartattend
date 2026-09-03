import sys
from app.database.session import Base, engine, SessionLocal
from app.database.seed import seed_database
import app.models  # Load all models into SQLAlchemy metadata

def init_db():
    """
    Initializes database schema and populates initial seed data idempotently.
    Safe for running against SQLite or Neon PostgreSQL.
    """
    print("=" * 60)
    print("SmartAttend Database Initialization")
    print("=" * 60)
    print("Creating all database tables from models...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables verified and created successfully.")

    print("Checking and running seed data...")
    db = SessionLocal()
    try:
        seed_database(db)
        print("✓ Database initialization complete.")
    except Exception as e:
        print(f"✗ Database initialization error: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
