"""
RailMate Backend - FastAPI 入口文件
智轨伴行：铁路出行 AI Agent 后端系统
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    启动时初始化数据库，关闭时清理资源
    """
    # 启动时
    logger.info("🚄 RailMate 正在启动...")
    
    # 初始化数据库
    logger.info("📦 初始化数据库...")
    init_db()
    logger.info("✅ 数据库初始化完成")
    
    # 启动定时任务
    if settings.scheduler_enabled:
        from app.tasks.scheduler import start_scheduler
        start_scheduler()
    
    logger.info(f"🎉 RailMate {settings.app_version} 启动成功!")
    logger.info(f"📊 数据同步模式: {settings.data_sync_mode}")
    
    yield
    
    # 关闭时
    logger.info("👋 RailMate 正在关闭...")
    if settings.scheduler_enabled:
        from app.tasks.scheduler import stop_scheduler
        stop_scheduler()


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.app_name,
    description="""
## 智轨伴行 - 铁路出行 AI Agent

RailMate 是一款垂直于铁路出行领域的 AI 助手后端系统。

### 功能特性

- 🔍 **智能查票**: 支持自然语言查询火车票
- 🤖 **AI 对话**: 通过对话方式获取出行建议
- 📊 **数据同步**: 定时从 12306 拉取最新数据
- ⚡ **高性能**: 基于 FastAPI 的异步架构

### 版本说明

当前版本: V1 (开发版)
    """,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 配置 CORS (跨域资源共享)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["health"])
async def root():
    """
    根路径 - 健康检查
    """
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "message": "🚄 欢迎使用 RailMate 智轨伴行!",
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    健康检查接口
    """
    return {
        "status": "healthy",
        "database": "connected",
        "sync_mode": settings.data_sync_mode,
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
