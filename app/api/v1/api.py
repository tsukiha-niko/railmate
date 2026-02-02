"""
API V1 路由聚合
"""

from fastapi import APIRouter

from .endpoints import admin, chat, trains

# 创建 V1 总路由
api_router = APIRouter()

# 注册各子路由
api_router.include_router(
    trains.router,
    prefix="/trains",
    tags=["trains"],
)

api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["chat"],
)

api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["admin"],
)
