from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import config

connect_args = {}
if config.DATABASE_URL.startswith('sqlite'):
    connect_args = {'check_same_thread': False}

engine = create_engine(config.DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()