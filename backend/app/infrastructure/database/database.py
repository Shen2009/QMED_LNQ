import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# Sử dụng đường dẫn tuyệt đối cho SQLite
_base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_db_path = os.path.join(_base_dir, 'qmed.db').replace('\\', '/')
_default_db = f"sqlite:///{_db_path}"
DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

# connect_args chỉ cần cho SQLite (multi-thread FastAPI)
_conn_args = {"check_same_thread": False}
_connect_args = _conn_args if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
