"""
离线票务服务
"""

from __future__ import annotations

import json
import random
import string
from datetime import date, datetime, time as dt_time
from decimal import Decimal
from typing import Optional

from sqlmodel import Session, select

from app.core.database import get_session_direct
from app.models.ticketing import TicketOrder
from app.schemas.ticketing import (
    TicketOrderResponse,
    TicketPurchaseRequest,
    TicketingListResponse,
    TicketingSummaryResponse,
)
from app.services.railway_auth import get_auth_instance


class TicketingService:
    """
    票务服务：
    - 购票：本地落单
    - 退票：本地改状态
    - 检票：演示闸机扫码 / 手动验票
    - 行程查询：本地返回离线订单
    """

    def __init__(self, session: Optional[Session] = None):
        self.session = session or get_session_direct()
        self._owns_session = session is None

    def close(self) -> None:
        if self._owns_session:
            self.session.close()

    @staticmethod
    def _random_code(prefix: str, length: int = 10) -> str:
        body = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
        return f"{prefix}{body}"

    @staticmethod
    def _parse_departure_local(order: TicketOrder) -> Optional[datetime]:
        raw = (order.departure_time or "").strip()
        if not raw or ":" not in raw:
            return None
        try:
            parts = raw.replace("：", ":").split(":")
            h = int(parts[0])
            m = int(parts[1])
            return datetime.combine(order.run_date, dt_time(h, m))
        except (ValueError, TypeError, IndexError):
            return None

    @staticmethod
    def _departure_passed(order: TicketOrder) -> bool:
        dep = TicketingService._parse_departure_local(order)
        now = datetime.now()
        if dep is not None:
            return now >= dep
        return order.run_date < date.today()

    @classmethod
    def _compute_travel_phase(cls, order: TicketOrder) -> str:
        if order.status == "refunded":
            return "refunded"
        if order.checked_in_at:
            return "checked_in"
        if cls._departure_passed(order):
            return "expired"
        return "booked"

    def _to_response(self, order: TicketOrder) -> TicketOrderResponse:
        return TicketOrderResponse(
            id=order.id or 0,
            order_no=order.order_no,
            booking_reference=order.booking_reference,
            demo_mode=order.demo_mode,
            status=order.status,
            train_no=order.train_no,
            train_type=order.train_type,
            run_date=order.run_date,
            from_station=order.from_station,
            to_station=order.to_station,
            departure_time=order.departure_time,
            arrival_time=order.arrival_time,
            duration_minutes=order.duration_minutes,
            seat_type=order.seat_type,
            seat_label=order.seat_label,
            seat_code=order.seat_code,
            coach_no=order.coach_no,
            seat_no=order.seat_no,
            fare_amount=float(order.fare_amount),
            currency=order.currency,
            passenger_name=order.passenger_name,
            account_username=order.account_username,
            order_source=order.order_source,
            order_note=order.order_note,
            refund_note=order.refund_note,
            created_at=order.created_at,
            updated_at=order.updated_at,
            refunded_at=order.refunded_at,
            checked_in_at=order.checked_in_at,
            travel_phase=self._compute_travel_phase(order),
        )

    @staticmethod
    def _is_upcoming(order: TicketOrder) -> bool:
        """仍未发车且未退票（兼容旧统计口径）。"""
        return order.status == "booked" and order.run_date >= date.today()

    @staticmethod
    def _generate_seat_assignment(order_count: int) -> tuple[str, str]:
        coach_no = str((order_count % 8) + 1)
        row = (order_count % 20) + 1
        seat_letter = ["A", "B", "C", "D", "F"][order_count % 5]
        return coach_no, f"{row:02d}{seat_letter}"

    def get_capabilities(self) -> dict:
        auth = get_auth_instance()
        return {
            "demo_mode": True,
            "demo_mode_locked": True,
            "live_booking_enabled": False,
            "requires_login_for_binding": False,
            "bound_account_username": auth.username if auth.is_logged_in else None,
            "message": "演示模式已锁定开启，购票/退票/行程查询均为本地离线模拟，不会改动真实 12306 订单。",
        }

    def purchase_ticket(self, payload: TicketPurchaseRequest) -> TicketOrderResponse:
        auth = get_auth_instance()
        existing_count = len(self.session.exec(select(TicketOrder.id)).all())
        coach_no, seat_no = self._generate_seat_assignment(existing_count)
        passenger_name = payload.passenger_name or auth.username or "演示乘客"
        now = datetime.now()
        order = TicketOrder(
            order_no=self._random_code("RM"),
            booking_reference=self._random_code("TRIP", 8),
            user_id=payload.user_id,
            account_username=auth.username if auth.is_logged_in else None,
            passenger_name=passenger_name,
            demo_mode=True,
            status="booked",
            train_no=payload.train_no,
            train_type=payload.train_type,
            run_date=payload.run_date,
            from_station=payload.from_station,
            to_station=payload.to_station,
            departure_time=payload.departure_time,
            arrival_time=payload.arrival_time,
            duration_minutes=payload.duration_minutes,
            seat_type=payload.seat_type,
            seat_label=payload.seat_label,
            seat_code=payload.seat_code,
            coach_no=coach_no,
            seat_no=seat_no,
            fare_amount=Decimal(payload.fare_amount),
            currency="CNY",
            order_source="offline_demo",
            order_note="本订单由演示模式生成，仅用于本地调试与界面联调。",
            created_at=now,
            updated_at=now,
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        return self._to_response(order)

    def refund_ticket(self, order_id: int, reason: Optional[str] = None) -> TicketOrderResponse:
        order = self.session.get(TicketOrder, order_id)
        if not order:
            raise ValueError("未找到对应订单")
        if order.status == "refunded":
            return self._to_response(order)

        order.status = "refunded"
        order.refund_note = reason or "演示模式退票：仅更新本地订单状态，不会触发真实退款。"
        order.refunded_at = datetime.now()
        order.updated_at = datetime.now()
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        return self._to_response(order)

    def _perform_check_in(self, order: TicketOrder) -> TicketOrderResponse:
        if order.status == "refunded":
            raise ValueError("已退票的订单无法检票")
        if order.checked_in_at:
            return self._to_response(order)
        if self._departure_passed(order):
            raise ValueError("已过发车时间，无法检票（演示规则：过期车票请退票或查看已过期分类）")
        order.checked_in_at = datetime.now()
        order.updated_at = datetime.now()
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        return self._to_response(order)

    def check_in_ticket(self, order_id: int) -> TicketOrderResponse:
        order = self.session.get(TicketOrder, order_id)
        if not order:
            raise ValueError("未找到对应订单")
        return self._perform_check_in(order)

    def scan_check_in(self, raw: str, user_id: Optional[str] = None) -> TicketOrderResponse:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError("无效的二维码内容") from exc
        order_no = data.get("order_no")
        if not order_no or not isinstance(order_no, str):
            raise ValueError("二维码缺少有效 order_no")
        stmt = select(TicketOrder).where(TicketOrder.order_no == order_no.strip())
        order = self.session.exec(stmt).first()
        if not order:
            raise ValueError("未找到该电子票对应订单")
        if user_id and order.user_id and order.user_id != user_id:
            raise ValueError("该车票不属于当前用户（演示校验）")
        train_no = data.get("train_no")
        if train_no and isinstance(train_no, str) and train_no.strip().upper() != (order.train_no or "").upper():
            raise ValueError("车次信息与订单不一致")
        return self._perform_check_in(order)

    def list_orders(self, user_id: Optional[str] = None) -> TicketingListResponse:
        query = select(TicketOrder).order_by(TicketOrder.run_date.desc(), TicketOrder.created_at.desc())
        if user_id:
            query = query.where((TicketOrder.user_id == user_id) | (TicketOrder.user_id.is_(None)))
        orders = list(self.session.exec(query).all())
        auth = get_auth_instance()

        total_spent = sum(float(order.fare_amount) for order in orders if order.status == "booked")
        total_refunded = sum(float(order.fare_amount) for order in orders if order.status == "refunded")

        phases = [self._compute_travel_phase(o) for o in orders]
        pending_travel_orders = sum(1 for p in phases if p == "booked")
        checked_in_orders = sum(1 for p in phases if p == "checked_in")
        expired_orders = sum(1 for p in phases if p == "expired")

        summary = TicketingSummaryResponse(
            total_orders=len(orders),
            active_orders=sum(1 for order in orders if order.status == "booked"),
            refunded_orders=sum(1 for order in orders if order.status == "refunded"),
            upcoming_orders=sum(1 for order in orders if self._is_upcoming(order)),
            pending_travel_orders=pending_travel_orders,
            checked_in_orders=checked_in_orders,
            expired_orders=expired_orders,
            total_spent=round(total_spent, 2),
            total_refunded=round(total_refunded, 2),
        )
        return TicketingListResponse(
            demo_mode=True,
            login_bound=auth.is_logged_in,
            account_username=auth.username if auth.is_logged_in else None,
            summary=summary,
            trips=[self._to_response(order) for order in orders],
        )
