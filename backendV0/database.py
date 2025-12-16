from typing import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

# Place the SQLite DB file next to this module (backendV0/app.db)
BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "app.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_FILE}"  # absolute path


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

