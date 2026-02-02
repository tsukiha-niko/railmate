"""
管理接口
提供数据同步、任务管理等管理功能
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.core.logger import logger
from app.services.data_sync import DataSyncService
from app.tasks.scheduler import list_jobs, trigger_sync_now

router = APIRouter()


@router.post("/trigger-sync")
async def trigger_sync(
    days_ahead: int = Query(default=7, description="同步未来多少天的数据", ge=1, le=30),
):
    """
    手动触发数据同步
    
    同步车站和未来 N 天的车次数据。
    """
    logger.info(f"📡 收到手动同步请求 (days_ahead={days_ahead})")
    
    service = DataSyncService()
    try:
        stats = service.sync_common_routes(days_ahead=days_ahead)
        return {
            "success": True,
            "message": "数据同步完成",
            "stats": stats,
        }
    except Exception as e:
        logger.error(f"同步失败: {e}")
        raise HTTPException(status_code=500, detail=f"同步失败: {str(e)}")
    finally:
        service.close()


@router.post("/sync-stations")
async def sync_stations():
    """
    仅同步车站数据
    """
    service = DataSyncService()
    try:
        count = service.sync_stations()
        return {
            "success": True,
            "message": f"同步完成，新增 {count} 个车站",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        service.close()


@router.post("/sync-trains")
async def sync_trains(
    target_date: date = Query(..., description="目标日期"),
):
    """
    同步指定日期的车次数据
    """
    service = DataSyncService()
    try:
        count = service.sync_trains(target_date)
        return {
            "success": True,
            "message": f"同步完成，新增 {count} 趟车次",
            "date": str(target_date),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        service.close()


@router.get("/jobs")
async def get_scheduled_jobs():
    """
    获取定时任务列表
    """
    if not settings.scheduler_enabled:
        return {
            "enabled": False,
            "message": "定时任务已禁用",
            "jobs": [],
        }
    
    jobs = list_jobs()
    return {
        "enabled": True,
        "jobs": jobs,
    }


@router.get("/config")
async def get_config():
    """
    获取当前配置信息（脱敏）
    """
    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "data_sync_mode": settings.data_sync_mode,
        "scheduler_enabled": settings.scheduler_enabled,
        "sync_interval_hours": settings.sync_interval_hours,
        "openai_model": settings.openai_model,
        "openai_api_configured": bool(settings.openai_api_key and settings.openai_api_key != "sk-your-api-key-here"),
    }


@router.get("/stats")
async def get_stats():
    """
    获取数据统计信息
    """
    from sqlmodel import func, select
    
    from app.core.database import get_session_direct
    from app.models import Station, Train, TrainStop
    
    session = get_session_direct()
    try:
        station_count = session.exec(select(func.count(Station.id))).one()
        train_count = session.exec(select(func.count(Train.id))).one()
        stop_count = session.exec(select(func.count(TrainStop.id))).one()
        
        # 按日期统计车次
        today = date.today()
        today_trains = session.exec(
            select(func.count(Train.id)).where(Train.run_date == today)
        ).one()
        
        return {
            "stations": station_count,
            "trains": train_count,
            "stops": stop_count,
            "today_trains": today_trains,
        }
    finally:
        session.close()
