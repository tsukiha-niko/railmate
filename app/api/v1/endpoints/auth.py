"""
12306 账户认证接口
提供扫码登录、状态查询、退出登录
"""
from fastapi import APIRouter, Query

from app.services.railway_auth import get_auth_instance

router = APIRouter()


@router.get("/12306/status")
def get_12306_status():
    """获取当前 12306 登录状态"""
    return get_auth_instance().status_dict()


@router.get("/12306/qrcode")
def create_qrcode():
    """
    申请登录二维码。
    返回 {"success": True, "uuid": "...", "image": "<base64 PNG>"}
    前端直接用 data:image/png;base64,{image} 显示
    """
    return get_auth_instance().create_qrcode()


@router.get("/12306/qrcode/poll")
def poll_qrcode(uuid: str = Query(..., description="create_qrcode 返回的 uuid")):
    """
    轮询二维码扫描状态（前端每 2 秒调用一次）。
    status: waiting | scanned | confirmed | expired | error
    """
    return get_auth_instance().poll_qrcode(uuid)


@router.post("/12306/logout")
def logout_12306():
    """退出 12306 登录，清除本地 Cookie 缓存"""
    get_auth_instance().logout()
    return {"success": True}
