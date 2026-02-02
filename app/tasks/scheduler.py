"""
定时任务配置
使用 APScheduler 管理后台任务
"""

from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.logger import logger

# 全局调度器实例
_scheduler: BackgroundScheduler | None = None


def get_scheduler() -> BackgroundScheduler:
    """获取调度器单例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(
            timezone="Asia/Shanghai",
            job_defaults={
                "coalesce": True,  # 合并错过的任务
                "max_instances": 1,  # 同一任务最多一个实例
                "misfire_grace_time": 60,  # 错过任务的容忍时间
            }
        )
    return _scheduler


def sync_data_job():
    """
    数据同步任务
    同步热门线路的车次数据
    """
    logger.info("⏰ 定时任务触发: 开始同步数据...")
    
    try:
        from app.services.data_sync import DataSyncService
        
        service = DataSyncService()
        try:
            stats = service.sync_common_routes(days_ahead=7)
            logger.info(f"✅ 数据同步完成: {stats}")
        finally:
            service.close()
            
    except Exception as e:
        logger.error(f"❌ 数据同步失败: {e}")


def init_data_job():
    """
    初始化数据任务
    应用启动时执行一次，确保数据库有基础数据
    """
    logger.info("🚀 执行初始化数据同步...")
    
    try:
        from app.services.data_sync import DataSyncService
        
        service = DataSyncService()
        try:
            # 同步车站
            service.sync_stations()
            
            # 同步今天和明天的车次
            from datetime import date, timedelta
            today = date.today()
            service.sync_trains(today)
            service.sync_trains(today + timedelta(days=1))
            
            logger.info("✅ 初始化数据同步完成")
        finally:
            service.close()
            
    except Exception as e:
        logger.error(f"❌ 初始化数据同步失败: {e}")


def start_scheduler():
    """
    启动定时任务调度器
    """
    if not settings.scheduler_enabled:
        logger.info("📅 定时任务已禁用")
        return
    
    scheduler = get_scheduler()
    
    # 添加定时同步任务
    # 方式一：按固定间隔执行
    scheduler.add_job(
        sync_data_job,
        trigger=IntervalTrigger(hours=settings.sync_interval_hours),
        id="sync_data_interval",
        name="数据同步（间隔触发）",
        replace_existing=True,
    )
    
    # 方式二：每天凌晨 2 点执行
    scheduler.add_job(
        sync_data_job,
        trigger=CronTrigger(hour=2, minute=0),
        id="sync_data_cron",
        name="数据同步（凌晨触发）",
        replace_existing=True,
    )
    
    # 启动时立即执行一次初始化
    scheduler.add_job(
        init_data_job,
        trigger="date",  # 一次性任务
        run_date=datetime.now(),
        id="init_data",
        name="初始化数据",
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info("⏰ 定时任务调度器已启动")
    
    # 打印当前任务列表
    jobs = scheduler.get_jobs()
    for job in jobs:
        logger.info(f"  - {job.name} (ID: {job.id})")


def stop_scheduler():
    """
    停止定时任务调度器
    """
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("⏰ 定时任务调度器已停止")
        _scheduler = None


def trigger_sync_now():
    """
    手动触发一次数据同步
    """
    logger.info("🔄 手动触发数据同步...")
    sync_data_job()


def list_jobs() -> list[dict]:
    """
    列出所有定时任务
    """
    scheduler = get_scheduler()
    jobs = scheduler.get_jobs()
    
    return [
        {
            "id": job.id,
            "name": job.name,
            "next_run": str(job.next_run_time) if job.next_run_time else None,
            "trigger": str(job.trigger),
        }
        for job in jobs
    ]
