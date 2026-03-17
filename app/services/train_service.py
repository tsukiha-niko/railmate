"""
列车查询服务
封装标准的 CRUD 查询和票务搜索逻辑
支持 Mock 模式（本地数据库）和 Live 模式（12306 实时 API）
"""

import re
from datetime import date, time, datetime, timedelta
from typing import Callable, List, Optional, Tuple, Dict, Set

from sqlmodel import Session, and_, or_, select

from app.core.config import settings
from app.core.database import get_session_direct
from app.core.exceptions import StationNotFoundError, TrainNotFoundError
from app.core.logger import logger
from app.models import Station, Train, TrainStop
from app.schemas.chat import TrainSearchResult, TransferLeg, TransferPlan, TransferSearchResult


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
    
    def get_train_schedule(
        self,
        train_no: str,
        run_date: date,
        from_station: Optional[str] = None,
        to_station: Optional[str] = None,
    ) -> List[dict]:
        """
        获取车次时刻表（优先本地DB，fallback到12306实时查询）
        """
        train = self.get_train_by_no(train_no, run_date)
        if train:
            stops = self.get_train_stops(train.id)
            if stops:
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

        return self._get_schedule_live(train_no, run_date, from_station, to_station)

    def _get_schedule_live(
        self,
        train_no: str,
        run_date: date,
        from_station: Optional[str] = None,
        to_station: Optional[str] = None,
    ) -> List[dict]:
        """从12306实时查询车次经停站（优先使用缓存的车次编码）"""
        from app.services.railway_api import get_railway_api
        api = get_railway_api()

        if not from_station or not to_station:
            raise TrainNotFoundError(f"未找到车次 {train_no}（{run_date}）的时刻表")

        cached = api.find_cached_train_code(train_no, from_station, to_station, run_date)
        if cached:
            logger.info(f"✅ 命中车次编码缓存: {train_no} → {cached['train_code']}")
            target = cached
        else:
            tickets = api.query_tickets(from_station, to_station, run_date)
            target = None
            for t in tickets:
                if t["train_no"].upper() == train_no.upper():
                    target = t
                    break
            if not target:
                raise TrainNotFoundError(
                    f"未找到车次 {train_no}（{from_station}→{to_station}, {run_date}）"
                )

        raw_stops = api.query_train_stops(
            train_no=target["train_code"],
            from_station_code=target["start_station_code"],
            to_station_code=target["end_station_code"],
            travel_date=run_date,
        )

        if not raw_stops:
            raise TrainNotFoundError(f"车次 {train_no} 暂无经停站数据")

        return self._parse_raw_stops(raw_stops)

    @staticmethod
    def _parse_raw_stops(raw_stops: List[dict]) -> List[dict]:
        """将12306原始经停站数据转为标准格式"""
        schedule = []
        for i, s in enumerate(raw_stops):
            arr = s.get("arrive_time", "----")
            dep = s.get("start_time", "----")
            stopover = s.get("stopover_time", "----")

            stop_minutes = None
            if stopover and stopover not in ("----", "--"):
                m = re.search(r"(\d+)", stopover)
                if m:
                    stop_minutes = int(m.group(1))

            schedule.append({
                "stop_index": int(s.get("station_no", i + 1)),
                "station_name": s.get("station_name", ""),
                "arrival_time": arr if arr not in ("----", "") else "--",
                "departure_time": dep if dep not in ("----", "") else "--",
                "stop_duration": stop_minutes,
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
        改进：更好的错误处理和fallback逻辑 + 批量获取票价
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from app.services.railway_api import get_railway_api
        
        api = get_railway_api()
        api_success = False
        
        try:
            tickets = api.query_tickets(from_station, to_station, travel_date, train_type)
            api_success = True
            
            if not tickets:
                logger.info(f"12306 返回空结果：{from_station} -> {to_station} ({travel_date}) 当日无直达车次")
                return []
            
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
                    price_second_seat=None,
                    price_first_seat=None,
                    price_business_seat=None,
                    remaining_tickets=ticket.get("second_seat") or ticket.get("hard_seat") or 0,
                )
                results.append(result)
            
            results.sort(key=lambda x: x.departure_time)
            logger.info(f"从 12306 查询到 {len(results)} 趟车次")
            
            # 串行获取票价（前 8 趟，共享会话 cookie）
            price_batch = list(zip(results, tickets))[:8]
            if price_batch:
                for r, raw in price_batch:
                    try:
                        prices = api.query_ticket_price(
                            train_no=raw["train_code"],
                            from_station_code=raw["from_station_code"],
                            to_station_code=raw["to_station_code"],
                            seat_types="O,M,A9",
                            travel_date=travel_date,
                        )
                        if prices:
                            r.price_second_seat = prices.get("second_seat")
                            r.price_first_seat = prices.get("first_seat")
                            r.price_business_seat = prices.get("business_seat")
                    except Exception:
                        break
            
            return results
            
        except Exception as e:
            logger.error(f"12306 查询失败: {e}")
            # 只在API调用失败时才fallback到本地
            try:
                logger.info("尝试本地数据库查询...")
                return self._search_tickets_mock(from_station, to_station, travel_date, train_type, None)
            except StationNotFoundError:
                # 本地也没有数据，返回空列表并记录（而不是抛异常）
                logger.warning(f"本地数据库也无{from_station}或{to_station}的数据，返回空结果")
                return []  # 返回空而不是报错"车站不存在"
    
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
        compact: bool = True,
    ) -> str:
        """
        查询火车票（返回 JSON 字符串）
        专为 AI Function Calling 设计（优化版：紧凑格式减少token）
        
        Args:
            from_station: 出发站
            to_station: 到达站
            travel_date: 出行日期 (YYYY-MM-DD 格式)
            train_type: 车次类型（可选）
            compact: 是否使用紧凑格式（默认True，减少token消耗）
            
        Returns:
            JSON 格式的查询结果
        """
        import json
        
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
            
            if compact:
                # 紧凑格式：减少token消耗
                trains = []
                for r in results:
                    trains.append({
                        "t": r.train_no,  # train
                        "y": r.train_type,  # type
                        "d": r.departure_time,  # depart
                        "a": r.arrival_time,  # arrive
                        "m": r.duration_minutes,  # minutes
                        "p": r.price_second_seat,  # price
                        "r": r.remaining_tickets,  # remaining
                    })
                
                return json.dumps({
                    "success": True,
                    "count": len(trains),
                    "from": from_station,
                    "to": to_station,
                    "date": travel_date,
                    "trains": trains,
                }, ensure_ascii=False)
            else:
                # 完整格式
                data = [r.model_dump() for r in results]
                return json.dumps({
                    "success": True,
                    "count": len(data),
                    "query": {"from": from_station, "to": to_station, "date": travel_date},
                    "trains": data,
                }, ensure_ascii=False)
            
        except StationNotFoundError as e:
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
        except Exception as e:
            logger.error(f"查询失败: {e}")
            return json.dumps({"success": False, "error": f"查询失败: {str(e)}"}, ensure_ascii=False)
    
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
    
    # ==================== 中转查询（新增） ====================
    
    MAJOR_TRANSFER_HUBS = [
        "武汉", "长沙南", "南昌西", "南京南", "杭州东", "郑州东",
        "西安北", "石家庄", "济南西", "合肥南", "贵阳北", "昆明南",
        "深圳北", "广州南", "北京西", "上海虹桥", "重庆北", "成都东",
        "徐州东", "九江", "衡阳东", "株洲西", "鹰潭北", "福州南",
    ]
    
    CITY_COORDS = {
        "广州南": (23.0, 113.3), "广州": (23.0, 113.3),
        "深圳北": (22.6, 114.0), "深圳": (22.6, 114.0),
        "长沙南": (28.2, 113.0), "长沙": (28.2, 113.0),
        "武汉": (30.6, 114.3), "武汉站": (30.6, 114.3),
        "南昌西": (28.7, 115.9), "南昌": (28.7, 115.9),
        "杭州东": (30.3, 120.2), "杭州": (30.3, 120.2),
        "南京南": (32.0, 118.8), "南京": (32.0, 118.8),
        "上海虹桥": (31.2, 121.3), "上海": (31.2, 121.3),
        "北京西": (39.9, 116.3), "北京": (39.9, 116.3),
        "郑州东": (34.8, 113.7), "郑州": (34.8, 113.7),
        "西安北": (34.4, 108.9), "西安": (34.4, 108.9),
        "石家庄": (38.0, 114.5),
        "济南西": (36.7, 116.9), "济南": (36.7, 116.9),
        "合肥南": (31.8, 117.3), "合肥": (31.8, 117.3),
        "贵阳北": (26.5, 106.6), "贵阳": (26.5, 106.6),
        "昆明南": (24.9, 102.7), "昆明": (24.9, 102.7),
        "重庆北": (29.6, 106.5), "重庆": (29.6, 106.5),
        "成都东": (30.6, 104.1), "成都": (30.6, 104.1),
        "徐州东": (34.3, 117.2), "徐州": (34.3, 117.2),
        "九江": (29.7, 115.9),
        "衡阳东": (26.9, 112.6), "衡阳": (26.9, 112.6),
        "株洲西": (27.8, 113.0), "株洲": (27.8, 113.0),
        "鹰潭北": (28.3, 117.0), "鹰潭": (28.3, 117.0),
        "福州南": (25.9, 119.3), "福州": (25.9, 119.3),
        "景德镇": (29.3, 117.2), "景德镇北": (29.3, 117.2),
        "赣州": (25.8, 114.9), "厦门": (24.5, 118.1),
        "南宁东": (22.8, 108.3), "南宁": (22.8, 108.3),
        "天津": (39.1, 117.2), "沈阳": (41.8, 123.4),
    }
    
    def _get_coord(self, name: str):
        """获取站点/城市大致坐标，支持模糊匹配"""
        if name in self.CITY_COORDS:
            return self.CITY_COORDS[name]
        for key, coord in self.CITY_COORDS.items():
            if name.startswith(key) or key.startswith(name):
                return coord
        return None
    
    def _prioritize_hubs(self, from_station: str, to_station: str, max_hubs: int = 8) -> List[str]:
        """基于地理位置智能排序中转站，优先尝试路线沿途的枢纽"""
        hubs = [h for h in self.MAJOR_TRANSFER_HUBS
                if h != from_station and h != to_station]
        
        from_coord = self._get_coord(from_station)
        to_coord = self._get_coord(to_station)
        
        if not from_coord or not to_coord:
            return hubs[:max_hubs]
        
        mid_lat = (from_coord[0] + to_coord[0]) / 2
        mid_lon = (from_coord[1] + to_coord[1]) / 2
        route_dist = max(((from_coord[0] - to_coord[0]) ** 2 + (from_coord[1] - to_coord[1]) ** 2) ** 0.5, 0.1)
        
        def hub_distance(hub):
            coord = self._get_coord(hub)
            if not coord:
                return 999
            dist_to_mid = ((coord[0] - mid_lat) ** 2 + (coord[1] - mid_lon) ** 2) ** 0.5
            dist_from = ((coord[0] - from_coord[0]) ** 2 + (coord[1] - from_coord[1]) ** 2) ** 0.5
            dist_to = ((coord[0] - to_coord[0]) ** 2 + (coord[1] - to_coord[1]) ** 2) ** 0.5
            detour = (dist_from + dist_to) / route_dist - 1.0
            return dist_to_mid + max(0, detour) * 5
        
        hubs.sort(key=hub_distance)
        return hubs[:max_hubs]
    
    def search_transfer_tickets(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
        max_transfers: int = 1,
        max_plans: int = 5,
        min_transfer_minutes: int = 30,
        max_transfer_minutes: int = 240,
        on_progress: Optional[Callable] = None,
    ) -> TransferSearchResult:
        """
        查询中转方案
        live 模式下使用 12306 API 逐段搜索
        """
        logger.info(f"🔄 查询中转方案: {from_station} -> {to_station}, 日期: {travel_date}")
        
        if settings.data_sync_mode == "live":
            return self._search_transfer_live(
                from_station, to_station, travel_date,
                max_plans, min_transfer_minutes, max_transfer_minutes,
                on_progress=on_progress,
            )
        return self._search_transfer_mock(
            from_station, to_station, travel_date,
            max_transfers, max_plans, min_transfer_minutes, max_transfer_minutes,
        )
    
    def _search_transfer_live(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
        max_plans: int = 5,
        min_transfer_minutes: int = 30,
        max_transfer_minutes: int = 240,
        on_progress: Optional[Callable] = None,
    ) -> TransferSearchResult:
        """
        Live 模式：通过 12306 API 并发搜索中转方案
        优化：地理优先选择中转站 + 并发查询 + 统一时间计算
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        if on_progress:
            on_progress(f"正在查询 {from_station}→{to_station} 直达...")
        
        direct_trains = self.search_tickets(from_station, to_station, travel_date)
        direct_count = len(direct_trains)
        
        hubs = self._prioritize_hubs(from_station, to_station)
        logger.info(f"🔄 智能选择中转站（按优先级）: {hubs}")
        
        plans: List[TransferPlan] = []
        
        def query_hub(hub: str):
            svc = TrainService()
            try:
                leg1 = svc.search_tickets(from_station, hub, travel_date)
                if not leg1:
                    return hub, [], []
                leg2 = svc.search_tickets(hub, to_station, travel_date)
                return hub, leg1, leg2
            except Exception as e:
                logger.debug(f"中转站 {hub} 查询失败: {e}")
                return hub, [], []
            finally:
                svc.close()
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(query_hub, hub): hub for hub in hubs}
            
            for future in as_completed(futures):
                hub, leg1_trains, leg2_trains = future.result()
                if not leg1_trains or not leg2_trains:
                    continue
                
                if on_progress:
                    on_progress(f"匹配经 {hub} 中转方案...")
                
                leg2_sorted = sorted(leg2_trains, key=lambda x: x.departure_time)
                
                for t1 in leg1_trains:
                    if len(plans) >= max_plans * 2:
                        break
                    for t2 in leg2_sorted:
                        wait = self._calc_wait_minutes(t1.arrival_time, t2.departure_time)
                        if wait < min_transfer_minutes:
                            continue
                        if wait > max_transfer_minutes:
                            break
                        
                        total_min = t1.duration_minutes + wait + t2.duration_minutes
                        p1 = t1.price_second_seat or 0
                        p2 = t2.price_second_seat or 0
                        
                        plan = TransferPlan(
                            legs=[
                                TransferLeg(
                                    train_no=t1.train_no, train_type=t1.train_type,
                                    from_station=t1.from_station, to_station=t1.to_station,
                                    departure_time=t1.departure_time, arrival_time=t1.arrival_time,
                                    duration_minutes=t1.duration_minutes,
                                    price_second_seat=t1.price_second_seat,
                                ),
                                TransferLeg(
                                    train_no=t2.train_no, train_type=t2.train_type,
                                    from_station=t2.from_station, to_station=t2.to_station,
                                    departure_time=t2.departure_time, arrival_time=t2.arrival_time,
                                    duration_minutes=t2.duration_minutes,
                                    price_second_seat=t2.price_second_seat,
                                ),
                            ],
                            transfer_count=1,
                            transfer_stations=[hub],
                            total_duration_minutes=total_min,
                            total_price=round(p1 + p2, 1) if (p1 or p2) else None,
                            wait_times=[wait],
                        )
                        plan.score = self._score_transfer_plan(plan)
                        plans.append(plan)
                        break
        
        plans.sort(key=lambda x: x.score, reverse=True)
        plans = plans[:max_plans]
        
        logger.info(f"✅ 找到 {len(plans)} 个中转方案（直达 {direct_count} 趟）")
        
        return TransferSearchResult(
            success=True,
            from_station=from_station,
            to_station=to_station,
            date=str(travel_date),
            direct_count=direct_count,
            plans=plans,
            message=f"找到{len(plans)}个中转方案" if plans else "未找到合适的中转方案",
        )
    
    def _calc_wait_minutes(self, arrival, departure) -> int:
        """计算等待时间（分钟），支持 str("HH:MM") 和 time 对象，处理跨天"""
        if not arrival or not departure:
            return -1
        try:
            if isinstance(arrival, str):
                arr_h, arr_m = map(int, arrival.split(":"))
            else:
                arr_h, arr_m = arrival.hour, arrival.minute
            if isinstance(departure, str):
                dep_h, dep_m = map(int, departure.split(":"))
            else:
                dep_h, dep_m = departure.hour, departure.minute
            arr_min = arr_h * 60 + arr_m
            dep_min = dep_h * 60 + dep_m
            if dep_min < arr_min:
                dep_min += 24 * 60
            return dep_min - arr_min
        except Exception:
            return -1
    
    def _search_transfer_mock(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
        max_transfers: int = 2,
        max_plans: int = 10,
        min_transfer_minutes: int = 30,
        max_transfer_minutes: int = 180,
    ) -> TransferSearchResult:
        """Mock 模式：使用本地数据库搜索中转方案"""
        from_station_obj = self.get_station(from_station)
        to_station_obj = self.get_station(to_station)
        
        if not from_station_obj:
            return TransferSearchResult(
                success=False, from_station=from_station, to_station=to_station,
                date=str(travel_date), direct_count=0,
                message=f"未找到出发站: {from_station}",
            )
        if not to_station_obj:
            return TransferSearchResult(
                success=False, from_station=from_station, to_station=to_station,
                date=str(travel_date), direct_count=0,
                message=f"未找到到达站: {to_station}",
            )
        
        direct_trains = self.search_tickets(from_station, to_station, travel_date)
        direct_count = len(direct_trains)
        
        outbound_trains = self._get_outbound_trains(from_station_obj.id, travel_date)
        inbound_trains = self._get_inbound_trains(to_station_obj.id, travel_date)
        
        plans: List[TransferPlan] = []
        
        one_transfer_plans = self._find_one_transfer_plans(
            from_station_obj, to_station_obj, travel_date,
            outbound_trains, inbound_trains,
            min_transfer_minutes, max_transfer_minutes,
        )
        plans.extend(one_transfer_plans)
        
        if max_transfers >= 2 and len(plans) < max_plans:
            two_transfer_plans = self._find_two_transfer_plans(
                from_station_obj, to_station_obj, travel_date,
                outbound_trains, inbound_trains,
                min_transfer_minutes, max_transfer_minutes,
                max_plans - len(plans),
            )
            plans.extend(two_transfer_plans)
        
        for plan in plans:
            plan.score = self._score_transfer_plan(plan)
        
        plans.sort(key=lambda x: x.score, reverse=True)
        plans = plans[:max_plans]
        
        logger.info(f"✅ 找到 {len(plans)} 个中转方案（直达 {direct_count} 趟）")
        
        return TransferSearchResult(
            success=True,
            from_station=from_station_obj.name,
            to_station=to_station_obj.name,
            date=str(travel_date),
            direct_count=direct_count,
            plans=plans,
            message=f"找到{len(plans)}个中转方案" if plans else "未找到合适的中转方案",
        )
    
    def _get_outbound_trains(self, station_id: int, travel_date: date) -> Dict[int, List[dict]]:
        """
        获取从某站出发的所有车次及其可达站
        
        Returns:
            {可达站ID: [{"train": Train, "from_stop": TrainStop, "to_stop": TrainStop, "to_station": Station}, ...]}
        """
        # 获取该站的所有出发停靠记录
        from_stops = self.session.exec(
            select(TrainStop, Train)
            .join(Train, TrainStop.train_id == Train.id)
            .where(TrainStop.station_id == station_id)
            .where(Train.run_date == travel_date)
        ).all()
        
        result: Dict[int, List[dict]] = {}
        
        for from_stop, train in from_stops:
            # 获取该车次在此站之后的所有站
            later_stops = self.session.exec(
                select(TrainStop, Station)
                .join(Station, TrainStop.station_id == Station.id)
                .where(TrainStop.train_id == train.id)
                .where(TrainStop.stop_index > from_stop.stop_index)
            ).all()
            
            for to_stop, to_station in later_stops:
                if to_station.id not in result:
                    result[to_station.id] = []
                result[to_station.id].append({
                    "train": train,
                    "from_stop": from_stop,
                    "to_stop": to_stop,
                    "to_station": to_station,
                })
        
        return result
    
    def _get_inbound_trains(self, station_id: int, travel_date: date) -> Dict[int, List[dict]]:
        """
        获取到达某站的所有车次及其来源站
        
        Returns:
            {来源站ID: [{"train": Train, "from_stop": TrainStop, "to_stop": TrainStop, "from_station": Station}, ...]}
        """
        # 获取该站的所有到达停靠记录
        to_stops = self.session.exec(
            select(TrainStop, Train)
            .join(Train, TrainStop.train_id == Train.id)
            .where(TrainStop.station_id == station_id)
            .where(Train.run_date == travel_date)
        ).all()
        
        result: Dict[int, List[dict]] = {}
        
        for to_stop, train in to_stops:
            # 获取该车次在此站之前的所有站
            earlier_stops = self.session.exec(
                select(TrainStop, Station)
                .join(Station, TrainStop.station_id == Station.id)
                .where(TrainStop.train_id == train.id)
                .where(TrainStop.stop_index < to_stop.stop_index)
            ).all()
            
            for from_stop, from_station in earlier_stops:
                if from_station.id not in result:
                    result[from_station.id] = []
                result[from_station.id].append({
                    "train": train,
                    "from_stop": from_stop,
                    "to_stop": to_stop,
                    "from_station": from_station,
                })
        
        return result
    
    def _find_one_transfer_plans(
        self,
        from_station: Station,
        to_station: Station,
        travel_date: date,
        outbound_trains: Dict[int, List[dict]],
        inbound_trains: Dict[int, List[dict]],
        min_transfer_minutes: int,
        max_transfer_minutes: int,
    ) -> List[TransferPlan]:
        """查找一次中转方案"""
        plans = []
        
        # 找出发可达站与到达来源站的交集（即中转站）
        transfer_station_ids = set(outbound_trains.keys()) & set(inbound_trains.keys())
        
        for transfer_id in transfer_station_ids:
            # 跳过起点和终点
            if transfer_id == from_station.id or transfer_id == to_station.id:
                continue
            
            # 获取中转站信息
            transfer_station = self.session.get(Station, transfer_id)
            if not transfer_station:
                continue
            
            # 遍历所有可能的组合
            for leg1_info in outbound_trains[transfer_id]:
                for leg2_info in inbound_trains[transfer_id]:
                    # 计算换乘等待时间
                    arrival_time = leg1_info["to_stop"].arrival_time
                    departure_time = leg2_info["from_stop"].departure_time
                    
                    if not arrival_time or not departure_time:
                        continue
                    
                    wait_minutes = self._calc_wait_minutes(arrival_time, departure_time)
                    
                    # 检查换乘时间是否合理
                    if wait_minutes < min_transfer_minutes or wait_minutes > max_transfer_minutes:
                        continue
                    
                    # 构建方案
                    plan = self._build_transfer_plan(
                        from_station, to_station,
                        [(leg1_info, transfer_station), (leg2_info, to_station)],
                        [wait_minutes]
                    )
                    if plan:
                        plans.append(plan)
        
        return plans
    
    def _find_two_transfer_plans(
        self,
        from_station: Station,
        to_station: Station,
        travel_date: date,
        outbound_trains: Dict[int, List[dict]],
        inbound_trains: Dict[int, List[dict]],
        min_transfer_minutes: int,
        max_transfer_minutes: int,
        max_plans: int,
    ) -> List[TransferPlan]:
        """查找二次中转方案"""
        plans = []
        
        # 获取所有一次可达的中间站
        first_transfer_ids = set(outbound_trains.keys()) - {from_station.id, to_station.id}
        last_transfer_ids = set(inbound_trains.keys()) - {from_station.id, to_station.id}
        
        # 对于每个第一中转站，查找能到达的第二中转站
        for first_id in list(first_transfer_ids)[:20]:  # 限制搜索范围
            first_station = self.session.get(Station, first_id)
            if not first_station:
                continue
            
            # 获取从第一中转站出发的车次
            mid_outbound = self._get_outbound_trains(first_id, travel_date)
            
            # 找第一中转可达站与终点来源站的交集（第二中转站）
            second_transfer_ids = set(mid_outbound.keys()) & last_transfer_ids - {first_id}
            
            for second_id in list(second_transfer_ids)[:10]:
                second_station = self.session.get(Station, second_id)
                if not second_station:
                    continue
                
                # 遍历组合
                for leg1_info in outbound_trains.get(first_id, [])[:5]:
                    for leg2_info in mid_outbound.get(second_id, [])[:5]:
                        for leg3_info in inbound_trains.get(second_id, [])[:5]:
                            # 计算换乘等待时间
                            wait1 = self._calc_wait_minutes(
                                leg1_info["to_stop"].arrival_time,
                                leg2_info["from_stop"].departure_time if "from_stop" in leg2_info else leg2_info["to_stop"].departure_time
                            )
                            wait2 = self._calc_wait_minutes(
                                leg2_info["to_stop"].arrival_time,
                                leg3_info["from_stop"].departure_time
                            )
                            
                            # 检查换乘时间
                            if not (min_transfer_minutes <= wait1 <= max_transfer_minutes and
                                    min_transfer_minutes <= wait2 <= max_transfer_minutes):
                                continue
                            
                            # 构建方案
                            plan = self._build_two_transfer_plan(
                                from_station, to_station,
                                leg1_info, leg2_info, leg3_info,
                                first_station, second_station,
                                [wait1, wait2]
                            )
                            if plan:
                                plans.append(plan)
                            
                            if len(plans) >= max_plans:
                                return plans
        
        return plans
    
    def _calc_duration(self, from_stop: TrainStop, to_stop: TrainStop) -> int:
        """计算行程时长"""
        if not from_stop.departure_time or not to_stop.arrival_time:
            return 0
        
        from_min = from_stop.departure_time.hour * 60 + from_stop.departure_time.minute
        to_min = to_stop.arrival_time.hour * 60 + to_stop.arrival_time.minute
        
        if to_min < from_min:
            to_min += 24 * 60
        
        return to_min - from_min
    
    def _calc_price(self, from_stop: TrainStop, to_stop: TrainStop) -> Optional[float]:
        """计算票价"""
        if to_stop.price_second_seat and from_stop.price_second_seat:
            return float(to_stop.price_second_seat - from_stop.price_second_seat)
        elif to_stop.price_second_seat:
            return float(to_stop.price_second_seat)
        return None
    
    def _build_transfer_plan(
        self,
        from_station: Station,
        to_station: Station,
        legs_info: List[tuple],
        wait_times: List[int],
    ) -> Optional[TransferPlan]:
        """构建一次中转方案"""
        try:
            legs = []
            transfer_stations = []
            total_price = 0.0
            
            # 第一段
            leg1_info, transfer_station = legs_info[0]
            train1 = leg1_info["train"]
            from_stop1 = leg1_info["from_stop"]
            to_stop1 = leg1_info["to_stop"]
            
            duration1 = self._calc_duration(from_stop1, to_stop1)
            price1 = self._calc_price(from_stop1, to_stop1)
            
            legs.append(TransferLeg(
                train_no=train1.train_no,
                train_type=train1.train_type,
                from_station=from_station.name,
                to_station=transfer_station.name,
                departure_time=from_stop1.departure_time.strftime("%H:%M") if from_stop1.departure_time else "--",
                arrival_time=to_stop1.arrival_time.strftime("%H:%M") if to_stop1.arrival_time else "--",
                duration_minutes=duration1,
                price_second_seat=price1,
            ))
            transfer_stations.append(transfer_station.name)
            if price1:
                total_price += price1
            
            # 第二段
            leg2_info, _ = legs_info[1]
            train2 = leg2_info["train"]
            from_stop2 = leg2_info["from_stop"]
            to_stop2 = leg2_info["to_stop"]
            
            duration2 = self._calc_duration(from_stop2, to_stop2)
            price2 = self._calc_price(from_stop2, to_stop2)
            
            legs.append(TransferLeg(
                train_no=train2.train_no,
                train_type=train2.train_type,
                from_station=transfer_station.name,
                to_station=to_station.name,
                departure_time=from_stop2.departure_time.strftime("%H:%M") if from_stop2.departure_time else "--",
                arrival_time=to_stop2.arrival_time.strftime("%H:%M") if to_stop2.arrival_time else "--",
                duration_minutes=duration2,
                price_second_seat=price2,
            ))
            if price2:
                total_price += price2
            
            total_duration = duration1 + wait_times[0] + duration2
            
            return TransferPlan(
                legs=legs,
                transfer_count=1,
                transfer_stations=transfer_stations,
                total_duration_minutes=total_duration,
                total_price=total_price if total_price > 0 else None,
                wait_times=wait_times,
            )
        except Exception as e:
            logger.debug(f"构建中转方案失败: {e}")
            return None
    
    def _build_two_transfer_plan(
        self,
        from_station: Station,
        to_station: Station,
        leg1_info: dict,
        leg2_info: dict,
        leg3_info: dict,
        first_transfer: Station,
        second_transfer: Station,
        wait_times: List[int],
    ) -> Optional[TransferPlan]:
        """构建二次中转方案"""
        try:
            legs = []
            total_price = 0.0
            
            # 第一段：起点 -> 第一中转站
            train1 = leg1_info["train"]
            from_stop1 = leg1_info["from_stop"]
            to_stop1 = leg1_info["to_stop"]
            duration1 = self._calc_duration(from_stop1, to_stop1)
            price1 = self._calc_price(from_stop1, to_stop1)
            
            legs.append(TransferLeg(
                train_no=train1.train_no,
                train_type=train1.train_type,
                from_station=from_station.name,
                to_station=first_transfer.name,
                departure_time=from_stop1.departure_time.strftime("%H:%M") if from_stop1.departure_time else "--",
                arrival_time=to_stop1.arrival_time.strftime("%H:%M") if to_stop1.arrival_time else "--",
                duration_minutes=duration1,
                price_second_seat=price1,
            ))
            if price1:
                total_price += price1
            
            # 第二段：第一中转站 -> 第二中转站
            train2 = leg2_info["train"]
            # leg2_info 结构可能是 outbound 格式
            if "from_stop" in leg2_info:
                from_stop2 = leg2_info["from_stop"]
            else:
                # 需要找到从 first_transfer 出发的 stop
                from_stop2 = self.session.exec(
                    select(TrainStop)
                    .where(TrainStop.train_id == train2.id)
                    .where(TrainStop.station_id == first_transfer.id)
                ).first()
            to_stop2 = leg2_info["to_stop"]
            duration2 = self._calc_duration(from_stop2, to_stop2) if from_stop2 else 0
            price2 = self._calc_price(from_stop2, to_stop2) if from_stop2 else None
            
            legs.append(TransferLeg(
                train_no=train2.train_no,
                train_type=train2.train_type,
                from_station=first_transfer.name,
                to_station=second_transfer.name,
                departure_time=from_stop2.departure_time.strftime("%H:%M") if from_stop2 and from_stop2.departure_time else "--",
                arrival_time=to_stop2.arrival_time.strftime("%H:%M") if to_stop2.arrival_time else "--",
                duration_minutes=duration2,
                price_second_seat=price2,
            ))
            if price2:
                total_price += price2
            
            # 第三段：第二中转站 -> 终点
            train3 = leg3_info["train"]
            from_stop3 = leg3_info["from_stop"]
            to_stop3 = leg3_info["to_stop"]
            duration3 = self._calc_duration(from_stop3, to_stop3)
            price3 = self._calc_price(from_stop3, to_stop3)
            
            legs.append(TransferLeg(
                train_no=train3.train_no,
                train_type=train3.train_type,
                from_station=second_transfer.name,
                to_station=to_station.name,
                departure_time=from_stop3.departure_time.strftime("%H:%M") if from_stop3.departure_time else "--",
                arrival_time=to_stop3.arrival_time.strftime("%H:%M") if to_stop3.arrival_time else "--",
                duration_minutes=duration3,
                price_second_seat=price3,
            ))
            if price3:
                total_price += price3
            
            total_duration = duration1 + wait_times[0] + duration2 + wait_times[1] + duration3
            
            return TransferPlan(
                legs=legs,
                transfer_count=2,
                transfer_stations=[first_transfer.name, second_transfer.name],
                total_duration_minutes=total_duration,
                total_price=total_price if total_price > 0 else None,
                wait_times=wait_times,
            )
        except Exception as e:
            logger.debug(f"构建二次中转方案失败: {e}")
            return None
    
    def _score_transfer_plan(self, plan: TransferPlan) -> float:
        """
        对中转方案评分
        
        评分因素：
        - 总时长（越短越好，权重最高）
        - 中转次数（越少越好）
        - 等待时间（45-90分钟最佳，太短或太长扣分）
        - 票价（越低越好，但权重较低）
        """
        score = 100.0
        
        # 1. 时长惩罚（每小时扣5分）
        hours = plan.total_duration_minutes / 60
        score -= hours * 5
        
        # 2. 中转次数惩罚（每次中转扣10分）
        score -= plan.transfer_count * 10
        
        # 3. 等待时间评分
        for wait in plan.wait_times:
            if 45 <= wait <= 90:
                score += 5  # 最佳换乘时间加分
            elif wait < 30:
                score -= 15  # 太紧张扣分
            elif wait > 120:
                score -= (wait - 120) / 10  # 等太久扣分
        
        # 4. 票价因素（可选）
        if plan.total_price:
            # 每100元扣1分（权重较低）
            score -= plan.total_price / 100
        
        return max(score, 0)
    
    def search_transfer_tickets_json(
        self,
        from_station: str,
        to_station: str,
        travel_date: str,
        max_transfers: int = 2,
        max_plans: int = 10,
    ) -> str:
        """
        查询中转方案（JSON格式，供AI调用）
        """
        import json
        
        try:
            parsed_date = datetime.strptime(travel_date, "%Y-%m-%d").date()
            
            result = self.search_transfer_tickets(
                from_station=from_station,
                to_station=to_station,
                travel_date=parsed_date,
                max_transfers=max_transfers,
                max_plans=max_plans,
            )
            
            # 使用紧凑格式减少token
            return json.dumps(result.to_compact(), ensure_ascii=False)
            
        except Exception as e:
            logger.error(f"中转查询失败: {e}")
            return json.dumps({
                "ok": False,
                "msg": f"查询失败: {str(e)}"
            }, ensure_ascii=False)
