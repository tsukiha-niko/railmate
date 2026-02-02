"""
数据同步服务
负责对接外部接口（12306）或生成模拟数据，清洗后写入数据库
"""

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import List, Optional

from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session_direct
from app.core.exceptions import DataSyncError
from app.core.logger import logger
from app.models import Station, Train, TrainStop


class DataSyncService:
    """
    数据同步服务
    支持 Mock 模式和 Live 模式
    """
    
    # 模拟数据：热门线路站点（广州-长沙-武汉-北京）
    MOCK_STATIONS = [
        {"code": "GZQ", "name": "广州南", "city_name": "广州", "pinyin": "guangzhounan", "initial": "GZN", "is_hub": True},
        {"code": "GZZ", "name": "广州", "city_name": "广州", "pinyin": "guangzhou", "initial": "GZ", "is_hub": True},
        {"code": "SZB", "name": "深圳北", "city_name": "深圳", "pinyin": "shenzhenbei", "initial": "SZB", "is_hub": True},
        {"code": "CSQ", "name": "长沙南", "city_name": "长沙", "pinyin": "changshanan", "initial": "CSN", "is_hub": True},
        {"code": "WHN", "name": "武汉", "city_name": "武汉", "pinyin": "wuhan", "initial": "WH", "is_hub": True},
        {"code": "ZZF", "name": "郑州东", "city_name": "郑州", "pinyin": "zhengzhoudong", "initial": "ZZD", "is_hub": True},
        {"code": "BJP", "name": "北京西", "city_name": "北京", "pinyin": "beijingxi", "initial": "BJX", "is_hub": True},
        {"code": "VNP", "name": "北京南", "city_name": "北京", "pinyin": "beijingnan", "initial": "BJN", "is_hub": True},
        {"code": "SHH", "name": "上海虹桥", "city_name": "上海", "pinyin": "shanghaihongqiao", "initial": "SHHQ", "is_hub": True},
        {"code": "NJN", "name": "南京南", "city_name": "南京", "pinyin": "nanjingnan", "initial": "NJN", "is_hub": True},
        {"code": "HGT", "name": "衡阳东", "city_name": "衡阳", "pinyin": "hengyangdong", "initial": "HYD", "is_hub": False},
        {"code": "LYY", "name": "岳阳东", "city_name": "岳阳", "pinyin": "yueyangdong", "initial": "YYD", "is_hub": False},
        {"code": "XGN", "name": "孝感北", "city_name": "孝感", "pinyin": "xiaoganbei", "initial": "XGB", "is_hub": False},
        {"code": "SJF", "name": "石家庄", "city_name": "石家庄", "pinyin": "shijiazhuang", "initial": "SJZ", "is_hub": True},
    ]
    
    # 模拟列车线路模板
    MOCK_TRAIN_ROUTES = [
        # 广州南 -> 北京西 (京广高铁)
        {
            "train_no_prefix": "G",
            "train_type": "G",
            "stations": ["GZQ", "CSQ", "WHN", "ZZF", "SJF", "BJP"],
            "base_times": ["08:00", "10:30", "12:45", "15:00", "17:30", "19:00"],
            "base_prices": {
                "second": [0, 314, 463, 690, 835, 862],
                "first": [0, 502, 740, 1104, 1336, 1379],
                "business": [0, 996, 1468, 2189, 2650, 2736],
            }
        },
        # 广州南 -> 长沙南 (短途)
        {
            "train_no_prefix": "G",
            "train_type": "G",
            "stations": ["GZQ", "HGT", "CSQ"],
            "base_times": ["07:30", "08:50", "09:30"],
            "base_prices": {
                "second": [0, 185, 314],
                "first": [0, 296, 502],
                "business": [0, 587, 996],
            }
        },
        # 深圳北 -> 武汉
        {
            "train_no_prefix": "G",
            "train_type": "G",
            "stations": ["SZB", "GZQ", "CSQ", "LYY", "WHN"],
            "base_times": ["09:00", "09:30", "12:00", "13:00", "14:30"],
            "base_prices": {
                "second": [0, 75, 389, 430, 538],
                "first": [0, 120, 622, 688, 861],
                "business": [0, 238, 1234, 1365, 1708],
            }
        },
        # 北京西 -> 广州南 (反向)
        {
            "train_no_prefix": "G",
            "train_type": "G",
            "stations": ["BJP", "SJF", "ZZF", "WHN", "CSQ", "GZQ"],
            "base_times": ["10:00", "11:30", "14:00", "16:15", "18:30", "21:00"],
            "base_prices": {
                "second": [0, 263, 435, 584, 733, 862],
                "first": [0, 421, 696, 934, 1173, 1379],
                "business": [0, 835, 1381, 1853, 2326, 2736],
            }
        },
        # 动车线路示例
        {
            "train_no_prefix": "D",
            "train_type": "D",
            "stations": ["GZZ", "CSQ", "WHN"],
            "base_times": ["06:30", "10:00", "13:30"],
            "base_prices": {
                "second": [0, 250, 400],
                "first": [0, 400, 640],
                "business": None,  # 动车无商务座
            }
        },
    ]
    
    def __init__(self, session: Optional[Session] = None):
        """
        初始化数据同步服务
        
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
    
    def sync_stations(self) -> int:
        """
        同步车站数据
        
        Returns:
            新增/更新的车站数量
        """
        logger.info("开始同步车站数据...")
        
        if settings.data_sync_mode == "mock":
            return self._sync_mock_stations()
        else:
            return self._sync_live_stations()
    
    def _sync_mock_stations(self) -> int:
        """同步模拟车站数据"""
        count = 0
        for station_data in self.MOCK_STATIONS:
            # 检查是否已存在
            existing = self.session.exec(
                select(Station).where(Station.code == station_data["code"])
            ).first()
            
            if existing:
                # 更新
                for key, value in station_data.items():
                    setattr(existing, key, value)
                existing.updated_at = datetime.now()
            else:
                # 新增
                station = Station(**station_data)
                self.session.add(station)
                count += 1
        
        self.session.commit()
        logger.info(f"车站数据同步完成，新增 {count} 个车站")
        return count
    
    def _sync_live_stations(self) -> int:
        """从 12306 同步真实车站数据"""
        from app.services.railway_api import get_railway_api
        
        api = get_railway_api()
        stations_data = api.fetch_all_stations()
        
        if not stations_data:
            logger.warning("无法从 12306 获取车站数据，使用 Mock 数据代替")
            return self._sync_mock_stations()
        
        count = 0
        # 只同步主要车站（避免数据过多）
        # 筛选条件：名称包含"站"或首字母大写
        major_cities = {"北京", "上海", "广州", "深圳", "杭州", "南京", "武汉", "成都", 
                       "重庆", "西安", "长沙", "郑州", "天津", "苏州", "青岛", "厦门",
                       "沈阳", "哈尔滨", "大连", "济南", "福州", "昆明", "贵阳", "南宁",
                       "合肥", "南昌", "石家庄", "太原", "兰州", "银川", "西宁", "呼和浩特",
                       "乌鲁木齐", "拉萨", "海口", "三亚", "珠海", "佛山", "东莞", "无锡",
                       "宁波", "温州", "常州", "徐州", "烟台", "潍坊", "洛阳", "桂林"}
        
        for station_data in stations_data:
            # 只同步主要城市的车站
            city = station_data.get("city", "")
            if city not in major_cities:
                continue
            
            # 判断是否为枢纽站
            name = station_data["name"]
            is_hub = any(x in name for x in ["东", "西", "南", "北", "站"]) or city == name
            
            # 检查是否已存在
            existing = self.session.exec(
                select(Station).where(Station.code == station_data["code"])
            ).first()
            
            if existing:
                existing.name = station_data["name"]
                existing.pinyin = station_data["pinyin"]
                existing.initial = station_data["initial"]
                existing.city_name = city
                existing.is_hub = is_hub
                existing.updated_at = datetime.now()
            else:
                station = Station(
                    code=station_data["code"],
                    name=station_data["name"],
                    city_name=city,
                    pinyin=station_data["pinyin"],
                    initial=station_data["initial"],
                    is_hub=is_hub,
                )
                self.session.add(station)
                count += 1
        
        self.session.commit()
        logger.info(f"从 12306 同步车站完成，新增 {count} 个车站")
        return count
    
    def sync_trains(self, target_date: date) -> int:
        """
        同步指定日期的车次数据
        
        Args:
            target_date: 目标日期
            
        Returns:
            新增/更新的车次数量
        """
        logger.info(f"开始同步 {target_date} 的车次数据...")
        
        if settings.data_sync_mode == "mock":
            return self._sync_mock_trains(target_date)
        else:
            return self._sync_live_trains(target_date)
    
    def _sync_mock_trains(self, target_date: date) -> int:
        """生成模拟车次数据"""
        count = 0
        
        # 确保车站数据已存在
        station_count = self.session.exec(select(Station)).all()
        if not station_count:
            self.sync_stations()
        
        # 获取所有车站的 code -> id 映射
        stations = self.session.exec(select(Station)).all()
        station_map = {s.code: s.id for s in stations}
        
        # 为每个路线模板生成多趟车次
        for route_idx, route in enumerate(self.MOCK_TRAIN_ROUTES):
            # 每条线路生成 3-5 趟不同时间的车次
            num_trains = random.randint(3, 5)
            
            for train_idx in range(num_trains):
                # 生成车次号：G1001, G1002, ...
                train_no = f"{route['train_no_prefix']}{1000 + route_idx * 100 + train_idx + 1}"
                
                # 检查是否已存在该日期的该车次
                existing_train = self.session.exec(
                    select(Train).where(
                        Train.train_no == train_no,
                        Train.run_date == target_date
                    )
                ).first()
                
                if existing_train:
                    continue  # 跳过已存在的车次
                
                # 时间偏移（每趟车错开 1-2 小时）
                time_offset_minutes = train_idx * random.randint(60, 120)
                
                # 创建车次
                train = Train(
                    train_no=train_no,
                    train_type=route["train_type"],
                    origin_station_code=route["stations"][0],
                    terminal_station_code=route["stations"][-1],
                    run_date=target_date,
                    total_duration_minutes=self._calculate_duration(route["base_times"]),
                )
                self.session.add(train)
                self.session.flush()  # 获取 train.id
                
                # 创建停靠站
                for stop_idx, station_code in enumerate(route["stations"]):
                    if station_code not in station_map:
                        logger.warning(f"车站 {station_code} 不存在，跳过")
                        continue
                    
                    # 计算时间
                    base_time = self._parse_time(route["base_times"][stop_idx])
                    adjusted_time = self._add_minutes(base_time, time_offset_minutes)
                    
                    # 始发站无到达时间，终点站无出发时间
                    is_origin = (stop_idx == 0)
                    is_terminal = (stop_idx == len(route["stations"]) - 1)
                    
                    stop = TrainStop(
                        train_id=train.id,
                        station_id=station_map[station_code],
                        stop_index=stop_idx + 1,
                        arrival_time=None if is_origin else adjusted_time,
                        departure_time=None if is_terminal else adjusted_time,
                        stop_duration_minutes=0 if is_origin or is_terminal else random.randint(2, 5),
                        price_second_seat=Decimal(str(route["base_prices"]["second"][stop_idx])) if route["base_prices"]["second"] else None,
                        price_first_seat=Decimal(str(route["base_prices"]["first"][stop_idx])) if route["base_prices"]["first"] else None,
                        price_business_seat=Decimal(str(route["base_prices"]["business"][stop_idx])) if route["base_prices"]["business"] else None,
                        remaining_tickets=random.randint(0, 500),
                    )
                    self.session.add(stop)
                
                count += 1
        
        self.session.commit()
        logger.info(f"车次数据同步完成，新增 {count} 趟车次")
        return count
    
    def _sync_live_trains(self, target_date: date) -> int:
        """从 12306 同步真实车次数据（占位实现）"""
        logger.warning("Live 模式暂未实现，使用 Mock 数据代替")
        return self._sync_mock_trains(target_date)
    
    def sync_common_routes(self, days_ahead: int = 7) -> dict:
        """
        同步热门线路数据（用于定时任务）
        
        Args:
            days_ahead: 提前同步多少天的数据
            
        Returns:
            同步统计信息
        """
        logger.info(f"开始同步热门线路数据（未来 {days_ahead} 天）...")
        
        stats = {
            "stations": 0,
            "trains": 0,
            "dates": [],
        }
        
        # 同步车站
        stats["stations"] = self.sync_stations()
        
        # 同步未来 N 天的车次
        today = date.today()
        for i in range(days_ahead):
            target_date = today + timedelta(days=i)
            stats["dates"].append(str(target_date))
            stats["trains"] += self.sync_trains(target_date)
        
        logger.info(f"热门线路同步完成: {stats}")
        return stats
    
    def fetch_train_data(self, target_date: date, from_station: str, to_station: str) -> List[dict]:
        """
        获取指定线路的车次数据
        
        Args:
            target_date: 查询日期
            from_station: 出发站名称或代码
            to_station: 到达站名称或代码
            
        Returns:
            车次数据列表
        """
        if settings.data_sync_mode == "mock":
            # Mock 模式下，确保数据已同步
            self.sync_trains(target_date)
        else:
            # Live 模式：调用 12306 接口（占位）
            pass
        
        # 从数据库查询（由 TrainService 负责）
        return []
    
    @staticmethod
    def _parse_time(time_str: str) -> time:
        """解析时间字符串"""
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    
    @staticmethod
    def _add_minutes(t: time, minutes: int) -> time:
        """给时间加上分钟数"""
        total_minutes = t.hour * 60 + t.minute + minutes
        # 处理跨天
        total_minutes = total_minutes % (24 * 60)
        return time(total_minutes // 60, total_minutes % 60)
    
    @staticmethod
    def _calculate_duration(times: List[str]) -> int:
        """计算全程时长（分钟）"""
        if len(times) < 2:
            return 0
        start = DataSyncService._parse_time(times[0])
        end = DataSyncService._parse_time(times[-1])
        
        start_minutes = start.hour * 60 + start.minute
        end_minutes = end.hour * 60 + end.minute
        
        # 处理跨天
        if end_minutes < start_minutes:
            end_minutes += 24 * 60
        
        return end_minutes - start_minutes
