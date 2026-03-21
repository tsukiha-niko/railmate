"""
数据库连接与会话管理
使用 SQLModel + SQLAlchemy 异步支持
"""

from typing import Generator

from sqlalchemy import create_engine, inspect, text
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
    from app.models import station, ticketing, train  # noqa: F401
    
    SQLModel.metadata.create_all(engine)
    _run_schema_migrations()
    _ensure_ticket_orders_checked_in_column()


def _run_schema_migrations() -> None:
    """
    轻量级数据库迁移。

    当前仅处理 ticket_orders 历史表结构与新结构不兼容的问题：
    - 旧表字段：order_id / travel_date / price / provider / note / booked_at
    - 新表字段：order_no / booking_reference / run_date / fare_amount / order_source / order_note ...
    """
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "ticket_orders" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("ticket_orders")}
    expected_columns = {
        "order_no",
        "booking_reference",
        "demo_mode",
        "run_date",
        "seat_label",
        "fare_amount",
        "order_source",
    }
    if expected_columns.issubset(columns):
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE ticket_orders RENAME TO ticket_orders_legacy"))
        SQLModel.metadata.create_all(bind=conn)

        legacy_columns = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(ticket_orders_legacy)")).fetchall()
        }
        if "order_id" in legacy_columns:
            conn.execute(
                text(
                    """
                    INSERT INTO ticket_orders (
                        id,
                        order_no,
                        booking_reference,
                        user_id,
                        account_username,
                        passenger_name,
                        demo_mode,
                        status,
                        train_no,
                        train_type,
                        run_date,
                        from_station,
                        to_station,
                        departure_time,
                        arrival_time,
                        duration_minutes,
                        seat_type,
                        seat_label,
                        seat_code,
                        coach_no,
                        seat_no,
                        fare_amount,
                        currency,
                        order_source,
                        order_note,
                        created_at,
                        updated_at,
                        refunded_at,
                        refund_note
                    )
                    SELECT
                        id,
                        order_id,
                        order_id,
                        user_id,
                        NULL,
                        passenger_name,
                        1,
                        status,
                        train_no,
                        NULL,
                        travel_date,
                        from_station,
                        to_station,
                        departure_time,
                        arrival_time,
                        duration_minutes,
                        seat_type,
                        seat_type,
                        seat_type,
                        NULL,
                        NULL,
                        COALESCE(price, 0),
                        'CNY',
                        COALESCE(provider, 'offline_demo'),
                        note,
                        created_at,
                        updated_at,
                        refunded_at,
                        CASE WHEN status = 'refunded' THEN note ELSE NULL END
                    FROM ticket_orders_legacy
                    """
                )
            )
        conn.execute(text("DROP TABLE ticket_orders_legacy"))


def _ensure_ticket_orders_checked_in_column() -> None:
    """为已有 SQLite 库追加 checked_in_at 列（create_all 不会 ALTER 旧表）。"""
    if not settings.database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "ticket_orders" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("ticket_orders")}
    if "checked_in_at" in columns:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE ticket_orders ADD COLUMN checked_in_at DATETIME"))


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
