"""
离线票务订单与行程模型
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


class TicketOrder(SQLModel, table=True):
    """
    离线票务订单
    仅用于演示/调试，不会对真实 12306 订单产生影响。
    """

    __tablename__ = "ticket_orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_no: str = Field(index=True, unique=True, max_length=32)
    booking_reference: str = Field(index=True, unique=True, max_length=32)

    user_id: Optional[str] = Field(default=None, index=True, max_length=128)
    account_username: Optional[str] = Field(default=None, max_length=64)
    passenger_name: str = Field(default="演示乘客", max_length=64)

    demo_mode: bool = Field(default=True, index=True)
    status: str = Field(default="booked", index=True, max_length=20)

    train_no: str = Field(index=True, max_length=20)
    train_type: Optional[str] = Field(default=None, max_length=8)
    run_date: date = Field(index=True)

    from_station: str = Field(max_length=64)
    to_station: str = Field(max_length=64)
    departure_time: Optional[str] = Field(default=None, max_length=8)
    arrival_time: Optional[str] = Field(default=None, max_length=8)
    duration_minutes: Optional[int] = Field(default=None)

    seat_type: str = Field(max_length=32)
    seat_label: str = Field(max_length=64)
    seat_code: Optional[str] = Field(default=None, max_length=16)
    coach_no: Optional[str] = Field(default=None, max_length=16)
    seat_no: Optional[str] = Field(default=None, max_length=16)

    fare_amount: Decimal = Field(default=Decimal("0.00"), decimal_places=2, max_digits=10)
    currency: str = Field(default="CNY", max_length=8)

    order_source: str = Field(default="offline_demo", max_length=32)
    order_note: Optional[str] = Field(default=None, max_length=255)

    created_at: datetime = Field(default_factory=datetime.now, index=True)
    updated_at: datetime = Field(default_factory=datetime.now)
    refunded_at: Optional[datetime] = Field(default=None)
    refund_note: Optional[str] = Field(default=None, max_length=255)
    checked_in_at: Optional[datetime] = Field(default=None)

