"""
离线票务接口
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.ticketing import (
    TicketingCapabilitiesResponse,
    TicketingListResponse,
    TicketOrderResponse,
    TicketPurchaseRequest,
    TicketRefundRequest,
)
from app.services.ticketing_service import TicketingService

router = APIRouter()


@router.get("/capabilities", response_model=TicketingCapabilitiesResponse)
async def get_ticketing_capabilities():
    service = TicketingService()
    try:
        return service.get_capabilities()
    finally:
        service.close()


@router.get("/orders", response_model=TicketingListResponse)
async def list_ticket_orders(
    user_id: Optional[str] = Query(None, description="前端用户标识"),
):
    service = TicketingService()
    try:
        return service.list_orders(user_id=user_id)
    finally:
        service.close()


@router.post("/purchase", response_model=TicketOrderResponse)
async def purchase_ticket(payload: TicketPurchaseRequest):
    service = TicketingService()
    try:
        return service.purchase_ticket(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        service.close()


@router.post("/{order_id}/refund", response_model=TicketOrderResponse)
async def refund_ticket(order_id: int, payload: TicketRefundRequest):
    service = TicketingService()
    try:
        return service.refund_ticket(order_id, reason=payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    finally:
        service.close()
