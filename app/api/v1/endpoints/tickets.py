"""
离线票务接口
"""

import html
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse

from app.schemas.ticketing import (
    TicketingCapabilitiesResponse,
    TicketingListResponse,
    TicketOrderResponse,
    TicketPurchaseRequest,
    TicketRefundRequest,
    TicketScanCheckInRequest,
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


@router.post("/check-in/scan", response_model=TicketOrderResponse)
async def scan_check_in_ticket(
    payload: TicketScanCheckInRequest,
    user_id: Optional[str] = Query(None, description="前端用户标识，与购票时一致"),
):
    service = TicketingService()
    try:
        return service.scan_check_in(payload.raw, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        service.close()


@router.post("/{order_id}/check-in", response_model=TicketOrderResponse)
async def check_in_ticket_order(order_id: int):
    service = TicketingService()
    try:
        return service.check_in_ticket(order_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        service.close()


@router.get("/check-in/public/{order_no}", response_class=HTMLResponse)
async def check_in_ticket_public(order_no: str):
    service = TicketingService()
    try:
        order = service.check_in_by_order_no(order_no)
        checked_at = order.checked_in_at.strftime("%Y-%m-%d %H:%M:%S") if order.checked_in_at else "-"
        ono = html.escape(order.order_no or "")
        tno = html.escape(order.train_no or "")
        fs = html.escape(order.from_station or "")
        ts = html.escape(order.to_station or "")
        pname = html.escape(order.passenger_name or "—")
        return HTMLResponse(
            content=f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>RailMate 检票结果</title>
  <style>
    body {{ margin:0; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif; background:#0b1020; color:#e6ebff; }}
    .wrap {{ min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }}
    .card {{ width:min(560px,100%); background:rgba(20,28,52,.92); border:1px solid rgba(137,158,255,.25); border-radius:16px; padding:24px; box-shadow:0 20px 48px rgba(0,0,0,.35); }}
    .ok {{ color:#5be49b; font-weight:700; font-size:20px; margin:0 0 12px; }}
    .meta {{ color:#b8c2f2; line-height:1.7; font-size:14px; margin:0; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <p class="ok">检票成功</p>
      <p class="meta">订单号：{ono}</p>
      <p class="meta">乘车人：{pname}</p>
      <p class="meta">车次：{tno}</p>
      <p class="meta">行程：{fs} → {ts}</p>
      <p class="meta">检票时间：{html.escape(checked_at)}</p>
    </div>
  </div>
</body>
</html>"""
        )
    except ValueError as exc:
        return HTMLResponse(
            status_code=400,
            content=f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>RailMate 检票失败</title></head>
<body style="margin:0;background:#161b2d;color:#ffe3e3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    <div style="width:min(560px,100%);background:rgba(44,20,28,.9);border:1px solid rgba(255,154,154,.32);border-radius:16px;padding:24px;">
      <p style="margin:0 0 10px;font-size:20px;font-weight:700;color:#ff9f9f;">检票失败</p>
      <p style="margin:0;line-height:1.7;color:#ffd4d4;">{html.escape(str(exc))}</p>
    </div>
  </div>
</body></html>""",
        )
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
