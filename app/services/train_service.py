"""
列车查询服务
封装标准的 CRUD 查询和票务搜索逻辑
支持 Mock 模式（本地数据库）和 Live 模式（12306 实时 API）
"""

from datetime import date, time
from typing import List, Optional, Tuple

from sqlmodel import Session, and_, or_, select

from app.core.config import settings
from app.core.database import get_session_direct
from app.core.exceptions import StationNotFoundError, TrainNotFoundError
from app.core.logger import logger
from app.models import Station, Train, TrainStop
from app.schemas.chat import TrainSearchResult


class TrainService:
    """
    列车查询服务
    提供车次查询、票务搜索等功能
    """
    
    def __init__(self, session: Optional[Session] = None):
        """
        初始化服务
        
        Args:
            session: 数据库会话，如不传则自动创建
        """
        self._session = session
        self._own_session = session is None
    
    @property
    def session(self) -> Session:
        if self._session is None:
            self._session = get_session_direct()
        return self._session
    
    def close(self):
        """关闭会话"""
        if self._own_session and self._session:
            self._session.close()
    
    # ==================== 车站查询 ====================
    
    def get_station_by_name(self, name: str) -> Optional[Station]:
        """
        通过名称查找车站
        支持模糊匹配（如"广州"匹配"广州南"、"广州"等）
        """
        # 精确匹配
        station = self.session.exec(
            select(Station).where(Station.name == name)
        ).first()
        
        if station:
            return station
        
        # 模糊匹配
        station = self.session.exec(
            select(Station).where(Station.name.contains(name))
        ).first()
        
        return station
    
    def get_station_by_code(self, code: str) -> Optional[Station]:
        """通过代码查找车站"""
        return self.session.exec(
            select(Station).where(Station.code == code)
        ).first()
    
    def get_station(self, name_or_code: str) -> Optional[Station]:
        """
        智能查找车站（支持名称或代码）
        """
        # 先尝试代码
        station = self.get_station_by_code(name_or_code.upper())
        if station:
            return station
        
        # 再尝试名称
        return self.get_station_by_name(name_or_code)
    
    def list_stations(self, city_name: Optional[str] = None) -> List[Station]:
        """列出车站"""
        query = select(Station)
        if city_name:
            query = query.where(Station.city_name == city_name)
        return list(self.session.exec(query).all())
    
    # ==================== 车次查询 ====================
    
    def get_train_by_no(self, train_no: str, run_date: date) -> Optional[Train]:
        """通过车次号和日期查找车次"""
        return self.session.exec(
            select(Train).where(
                Train.train_no == train_no.upper(),
                Train.run_date == run_date
            )
        ).first()
    
    def get_train_stops(self, train_id: int) -> List[Tuple[TrainStop, Station]]:
        """获取车次的所有停靠站"""
        results = self.session.exec(
            select(TrainStop, Station)
            .join(Station, TrainStop.station_id == Station.id)
            .where(TrainStop.train_id == train_id)
            .order_by(TrainStop.stop_index)
        ).all()
        return list(results)
    
    def get_train_schedule(self, train_no: str, run_date: date) -> List[dict]:
        """
        获取车次时刻表
        
        Returns:
            停靠站列表，包含站名、到发时间等信息
        """
        train = self.get_train_by_no(train_no, run_date)
        if not train:
            raise TrainNotFoundError(f"未找到车次 {train_no}（{run_date}）")
        
        stops = self.get_train_stops(train.id)
        
        schedule = []
        for stop, station in stops:
            schedule.append({
                "stop_index": stop.stop_index,
                "station_code": station.code,
                "station_name": station.name,
                "arrival_time": stop.arrival_time.strftime("%H:%M") if stop.arrival_time else "--",
                "departure_time": stop.departure_time.strftime("%H:%M") if stop.departure_time else "--",
                "stop_duration": stop.stop_duration_minutes,
            })
        
        return schedule
    
    # ==================== 票务搜索（核心功能） ====================
    
    def search_tickets(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
        train_type: Optional[str] = None,
        departure_time_range: Optional[Tuple[time, time]] = None,
    ) -> List[TrainSearchResult]:
        """
        查询火车票
        这是 AI Agent 调用的核心方法
        
        Args:
            from_station: 出发站（名称或代码）
            to_station: 到达站（名称或代码）
            travel_date: 出行日期
            train_type: 车次类型过滤（G/D/Z/K 等）
            departure_time_range: 出发时间范围过滤
            
        Returns:
            符合条件的车次列表
        """
        logger.info(f"查询车票: {from_station} -> {to_station}, 日期: {travel_date}")
        
        # 根据模式选择数据源
        if settings.data_sync_mode == "live":
            return self._search_tickets_live(from_station, to_station, travel_date, train_type)
        else:
            return self._search_tickets_mock(from_station, to_station, travel_date, train_type, departure_time_range)
    
    def _search_tickets_live(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
        train_type: Optional[str] = None,
    ) -> List[TrainSearchResult]:
        """
        Live 模式：直接调用 12306 API 查询实时数据
        """
        from app.services.railway_api import get_railway_api
        
        api = get_railway_api()
        
        try:
            tickets = api.query_tickets(from_station, to_station, travel_date, train_type)
            
            if not tickets:
                logger.warning(f"12306 未返回数据，尝试本地查询")
                return self._search_tickets_mock(from_station, to_station, travel_date, train_type, None)
            
            results: List[TrainSearchResult] = []
            
            for ticket in tickets:
                result = TrainSearchResult(
                    train_no=ticket["train_no"],
                    train_type=ticket["train_type"],
                    from_station=ticket["from_station_name"],
                    to_station=ticket["to_station_name"],
                    departure_time=ticket["departure_time"],
                    arrival_time=ticket["arrival_time"],
                    duration_minutes=ticket["duration_minutes"],
                    price_second_seat=None,  # 12306 余票查询不直接返回票价
                    price_first_seat=None,
                    price_business_seat=None,
                    remaining_tickets=ticket.get("second_seat") or ticket.get("hard_seat") or 0,
                )
                results.append(result)
            
            # 按出发时间排序
            results.sort(key=lambda x: x.departure_time)
            
            logger.info(f"从 12306 查询到 {len(results)} 趟车次")
            return results
            
        except Exception as e:
            logger.error(f"12306 查询失败: {e}，使用本地数据")
            return self._search_tickets_mock(from_station, to_station, travel_date, train_type, None)
    
    def _search_tickets_mock(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
        train_type: Optional[str] = None,
        departure_time_range: Optional[Tuple[time, time]] = None,
    ) -> List[TrainSearchResult]:
        """
        Mock 模式：从本地数据库查询
        """
        # 1. 解析车站
        from_station_obj = self.get_station(from_station)
        to_station_obj = self.get_station(to_station)
        
        if not from_station_obj:
            raise StationNotFoundError(f"未找到出发站: {from_station}")
        if not to_station_obj:
            raise StationNotFoundError(f"未找到到达站: {to_station}")
        
        logger.debug(f"解析车站: {from_station_obj.name}({from_station_obj.code}) -> {to_station_obj.name}({to_station_obj.code})")
        
        # 2. 查找经过两站的车次
        # 思路：找到同时停靠出发站和到达站的车次，且出发站在到达站之前
        
        # 子查询：获取经过出发站的停靠记录
        from_stops = self.session.exec(
            select(TrainStop)
            .where(TrainStop.station_id == from_station_obj.id)
        ).all()
        
        from_train_ids = {stop.train_id: stop for stop in from_stops}
        
        # 子查询：获取经过到达站的停靠记录
        to_stops = self.session.exec(
            select(TrainStop)
            .where(TrainStop.station_id == to_station_obj.id)
        ).all()
        
        to_train_map = {stop.train_id: stop for stop in to_stops}
        
        # 3. 找到同时经过两站且方向正确的车次
        results: List[TrainSearchResult] = []
        
        for train_id, from_stop in from_train_ids.items():
            if train_id not in to_train_map:
                continue
            
            to_stop = to_train_map[train_id]
            
            # 确保方向正确（出发站在到达站之前）
            if from_stop.stop_index >= to_stop.stop_index:
                continue
            
            # 获取车次信息
            train = self.session.get(Train, train_id)
            if not train:
                continue
            
            # 过滤日期
            if train.run_date != travel_date:
                continue
            
            # 过滤车次类型
            if train_type and train.train_type != train_type.upper():
                continue
            
            # 过滤出发时间范围
            if departure_time_range and from_stop.departure_time:
                start_time, end_time = departure_time_range
                if not (start_time <= from_stop.departure_time <= end_time):
                    continue
            
            # 计算区间票价（简化：使用到达站票价 - 出发站票价）
            price_second = None
            price_first = None
            price_business = None
            
            if to_stop.price_second_seat and from_stop.price_second_seat:
                price_second = float(to_stop.price_second_seat - from_stop.price_second_seat)
            elif to_stop.price_second_seat:
                price_second = float(to_stop.price_second_seat)
                
            if to_stop.price_first_seat and from_stop.price_first_seat:
                price_first = float(to_stop.price_first_seat - from_stop.price_first_seat)
            elif to_stop.price_first_seat:
                price_first = float(to_stop.price_first_seat)
                
            if to_stop.price_business_seat and from_stop.price_business_seat:
                price_business = float(to_stop.price_business_seat - from_stop.price_business_seat)
            elif to_stop.price_business_seat:
                price_business = float(to_stop.price_business_seat)
            
            # 计算运行时长
            duration_minutes = 0
            if from_stop.departure_time and to_stop.arrival_time:
                from_minutes = from_stop.departure_time.hour * 60 + from_stop.departure_time.minute
                to_minutes = to_stop.arrival_time.hour * 60 + to_stop.arrival_time.minute
                if to_minutes < from_minutes:
                    to_minutes += 24 * 60  # 跨天
                duration_minutes = to_minutes - from_minutes
            
            result = TrainSearchResult(
                train_no=train.train_no,
                train_type=train.train_type,
                from_station=from_station_obj.name,
                to_station=to_station_obj.name,
                departure_time=from_stop.departure_time.strftime("%H:%M") if from_stop.departure_time else "--",
                arrival_time=to_stop.arrival_time.strftime("%H:%M") if to_stop.arrival_time else "--",
                duration_minutes=duration_minutes,
                price_second_seat=price_second,
                price_first_seat=price_first,
                price_business_seat=price_business,
                remaining_tickets=to_stop.remaining_tickets,
            )
            results.append(result)
        
        # 4. 按出发时间排序
        results.sort(key=lambda x: x.departure_time)
        
        logger.info(f"从本地数据库查询到 {len(results)} 趟车次")
        return results
    
    def search_tickets_json(
        self,
        from_station: str,
        to_station: str,
        travel_date: str,
        train_type: Optional[str] = None,
    ) -> str:
        """
        查询火车票（返回 JSON 字符串）
        专为 AI Function Calling 设计
        
        Args:
            from_station: 出发站
            to_station: 到达站
            travel_date: 出行日期 (YYYY-MM-DD 格式)
            train_type: 车次类型（可选）
            
        Returns:
            JSON 格式的查询结果
        """
        import json
        from datetime import datetime
        
        try:
            # 解析日期
            parsed_date = datetime.strptime(travel_date, "%Y-%m-%d").date()
            
            # 执行查询
            results = self.search_tickets(
                from_station=from_station,
                to_station=to_station,
                travel_date=parsed_date,
                train_type=train_type,
            )
            
            # 转换为字典列表
            data = [r.model_dump() for r in results]
            
            return json.dumps({
                "success": True,
                "count": len(data),
                "query": {
                    "from": from_station,
                    "to": to_station,
                    "date": travel_date,
                },
                "trains": data,
            }, ensure_ascii=False, indent=2)
            
        except StationNotFoundError as e:
            return json.dumps({
                "success": False,
                "error": str(e),
            }, ensure_ascii=False)
        except Exception as e:
            logger.error(f"查询失败: {e}")
            return json.dumps({
                "success": False,
                "error": f"查询失败: {str(e)}",
            }, ensure_ascii=False)
    
    # ==================== 辅助方法 ====================
    
    def format_duration(self, minutes: int) -> str:
        """格式化时长"""
        hours = minutes // 60
        mins = minutes % 60
        if hours > 0:
            return f"{hours}小时{mins}分钟"
        return f"{mins}分钟"
    
    def get_quickest_train(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
    ) -> Optional[TrainSearchResult]:
        """获取最快的车次"""
        results = self.search_tickets(from_station, to_station, travel_date)
        if not results:
            return None
        return min(results, key=lambda x: x.duration_minutes)
    
    def get_cheapest_train(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
    ) -> Optional[TrainSearchResult]:
        """获取最便宜的车次（二等座）"""
        results = self.search_tickets(from_station, to_station, travel_date)
        if not results:
            return None
        # 过滤掉没有二等座价格的
        with_price = [r for r in results if r.price_second_seat]
        if not with_price:
            return None
        return min(with_price, key=lambda x: x.price_second_seat or float('inf'))
