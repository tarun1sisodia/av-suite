from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import AsyncGenerator
from app.core.config import settings

# Async engine create karte hain Supabase IPv4 pooler se
# Connection pooling configured for session reuse
# SQLite (used in tests) does not support pool_size/max_overflow (NullPool),
# so those args are only passed for real (Postgres) databases.
_engine_kwargs: dict[str, object] = {"echo": settings.DEBUG, "pool_pre_ping": True}
if not settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# SQLAlchemy 2.0 async session factory
# async_sessionmaker provides proper typing for async context manager usage
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    # Har request ke liye naya session create hota hai
    # Transaction boundary: successful request commits, exception rolls back
    async with AsyncSessionLocal() as session:
        try:
            yield session
            # Commit successful requests automatically
            # Safe even if service already committed (idempotent)
            await session.commit()
        except Exception:
            # Rollback on any exception
            await session.rollback()
            raise
        finally:
            await session.close()

