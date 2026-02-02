"""
数据库连接与会话管理
使用 SQLModel + SQLAlchemy 异步支持
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel

from .config import settings


# 创建数据库引擎
# SQLite 需要特殊配置以支持多线程
if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url,
        echo=settings.debug,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(
        settings.database_url,
        echo=settings.debug,
    )


def init_db() -> None:
    """
    初始化数据库
    创建所有表结构
    """
    # 导入所有模型以确保它们被注册
    from app.models import station, train  # noqa: F401
    
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    获取数据库会话
    用于 FastAPI 的依赖注入
    """
    with Session(engine) as session:
        yield session


def get_session_direct() -> Session:
    """
    直接获取数据库会话
    用于非 FastAPI 场景（如 CLI、定时任务）
    """
    return Session(engine)
