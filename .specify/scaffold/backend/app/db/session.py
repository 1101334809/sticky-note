"""数据库会话管理."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import get_settings

# 全局引擎和会话工厂
_engine = None
_async_session_factory = None

# 声明式基类
Base = declarative_base()


def _create_engine():
    """创建数据库引擎."""
    settings = get_settings()
    return create_async_engine(
        settings.database_url,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_pre_ping=True,
        echo=settings.DEBUG,
    )


def get_engine():
    """获取数据库引擎."""
    global _engine
    if _engine is None:
        _engine = _create_engine()
    return _engine


def get_session_factory():
    """获取会话工厂."""
    global _async_session_factory
    if _async_session_factory is None:
        _async_session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话（作为 FastAPI 依赖使用）."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def reinit_engine():
    """重新初始化数据库引擎（Nacos 配置加载后调用）."""
    global _engine, _async_session_factory
    
    if _engine is not None:
        await _engine.dispose()
    
    _engine = _create_engine()
    _async_session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    from loguru import logger
    logger.info("数据库引擎已重新初始化")
