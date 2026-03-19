"""
离线票务请求/响应模型
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class TicketPurchaseRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="前端用户标识")
    train_no: str
    train_type: Optional[str] = None
    run_date: date
    from_station: str
    to_station: str
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    seat_type: str
    seat_label: str
    seat_code: Optional[str] = None
    fare_amount: Decimal
    passenger_name: Optional[str] = None


class TicketRefundRequest(BaseModel):
    reason: Optional[str] = None


class TicketOrderResponse(BaseModel):
    id: int
    order_no: str
    booking_reference: str
    demo_mode: bool
    status: str
    train_no: str
    train_type: Optional[str] = None
    run_date: date
    from_station: str
    to_station: str
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    seat_type: str
    seat_label: str
    seat_code: Optional[str] = None
    coach_no: Optional[str] = None
    seat_no: Optional[str] = None
    fare_amount: float
    currency: str
    passenger_name: str
    account_username: Optional[str] = None
    order_source: str
    order_note: Optional[str] = None
    refund_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    refunded_at: Optional[datetime] = None


class TicketingSummaryResponse(BaseModel):
    total_orders: int
    active_orders: int
    refunded_orders: int
    upcoming_orders: int
    total_spent: float
    total_refunded: float


class TicketingListResponse(BaseModel):
    demo_mode: bool
    login_bound: bool
    account_username: Optional[str] = None
    summary: TicketingSummaryResponse
    trips: list[TicketOrderResponse]


class TicketingCapabilitiesResponse(BaseModel):
    demo_mode: bool = True
    demo_mode_locked: bool = True
    live_booking_enabled: bool = False
    requires_login_for_binding: bool = False
    bound_account_username: Optional[str] = None
    message: str
