"""
车次查询接口
提供纯数据的查票接口，供前端传统界面使用
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.exceptions import StationNotFoundError, TrainNotFoundError
from app.core.logger import logger
from app.schemas.chat import TrainSearchResult
from app.services.train_service import TrainService

router = APIRouter()


@router.get("/search", response_model=List[TrainSearchResult])
async def search_tickets(
    from_station: str = Query(..., description="出发站名称或代码", example="广州南"),
    to_station: str = Query(..., description="到达站名称或代码", example="长沙南"),
    travel_date: date = Query(..., description="出行日期", example="2026-02-02"),
    train_type: Optional[str] = Query(None, description="车次类型过滤 (G/D/Z/T/K)", example="G"),
):
    """
    查询火车票
    
    返回指定日期两站之间的所有车次信息，包括：
    - 车次号、类型
    - 出发/到达时间
    - 运行时长
    - 各座位等级票价
    - 余票数量
    """
    service = TrainService()
    try:
        results = service.search_tickets(
            from_station=from_station,
            to_station=to_station,
            travel_date=travel_date,
            train_type=train_type,
        )
        return results
    except StationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"查票失败: {e}")
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
    finally:
        service.close()


@router.get("/{train_no}/schedule")
async def get_train_schedule(
    train_no: str,
    run_date: date = Query(..., description="运行日期", example="2026-02-02"),
    from_station: Optional[str] = Query(None, description="出发站（用于12306实时查询）"),
    to_station: Optional[str] = Query(None, description="到达站（用于12306实时查询）"),
):
    """
    获取车次时刻表
    
    优先从本地数据库返回，无数据时从12306实时查询（需要from/to站名）。
    """
    service = TrainService()
    try:
        schedule = service.get_train_schedule(train_no, run_date, from_station, to_station)
        return {
            "train_no": train_no,
            "date": str(run_date),
            "stops": schedule,
        }
    except TrainNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"查询时刻表失败: {e}")
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
    finally:
        service.close()


@router.get("/stations")
async def list_stations(
    city: Optional[str] = Query(None, description="按城市筛选"),
):
    """
    获取车站列表
    """
    service = TrainService()
    try:
        stations = service.list_stations(city_name=city)
        return [
            {
                "code": s.code,
                "name": s.name,
                "city": s.city_name,
                "is_hub": s.is_hub,
            }
            for s in stations
        ]
    finally:
        service.close()


@router.get("/quickest")
async def get_quickest_train(
    from_station: str = Query(..., description="出发站"),
    to_station: str = Query(..., description="到达站"),
    travel_date: date = Query(..., description="出行日期"),
):
    """
    获取最快车次
    """
    service = TrainService()
    try:
        result = service.get_quickest_train(from_station, to_station, travel_date)
        if not result:
            raise HTTPException(status_code=404, detail="未找到符合条件的车次")
        return result
    except StationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    finally:
        service.close()


@router.get("/cheapest")
async def get_cheapest_train(
    from_station: str = Query(..., description="出发站"),
    to_station: str = Query(..., description="到达站"),
    travel_date: date = Query(..., description="出行日期"),
):
    """
    获取最便宜车次（二等座）
    """
    service = TrainService()
    try:
        result = service.get_cheapest_train(from_station, to_station, travel_date)
        if not result:
            raise HTTPException(status_code=404, detail="未找到符合条件的车次")
        return result
    except StationNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    finally:
        service.close()
