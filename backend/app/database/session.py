import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

def get_normalized_database_url(url: str) -> str:
    """
    Normalizes database URL for SQLAlchemy compatibility.
    Handles 'postgres://' -> 'postgresql://' (common in Neon, Supabase, Render, Heroku).
    """
    trimmed = url.strip()
    if trimmed.startswith("postgres://"):
        return trimmed.replace("postgres://", "postgresql://", 1)
    return trimmed

def create_database_engine(url: str):
    db_url = get_normalized_database_url(url)
    engine_kwargs = {
        "echo": False,
        "future": True,
    }

    if db_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        # PostgreSQL / Neon configuration with connection pooling and health checks
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 300
        engine_kwargs["pool_size"] = 10
        engine_kwargs["max_overflow"] = 20

    return create_engine(db_url, **engine_kwargs)

engine = create_database_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI dependency for yielding database session with automatic cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
