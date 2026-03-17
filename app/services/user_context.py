"""
用户上下文管理
管理用户的位置、偏好、历史等信息，让 AI 更懂你
"""

import json
from datetime import datetime, date, time, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from dataclasses import dataclass, field, asdict

from app.core.logger import logger


@dataclass
class UserLocation:
    """用户位置信息"""
    city: str                          # 城市名称
    station: Optional[str] = None      # 最近的火车站
    latitude: Optional[float] = None   # 纬度
    longitude: Optional[float] = None  # 经度
    source: str = "manual"             # 来源: manual/gps/ip
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        return {
            "city": self.city,
            "station": self.station,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "source": self.source,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


@dataclass
class UserPreferences:
    """用户偏好设置"""
    preferred_seat_type: str = "二等座"           # 偏好座位类型
    preferred_train_types: List[str] = field(default_factory=lambda: ["G", "D"])  # 偏好车型
    max_duration_hours: Optional[float] = None    # 最长可接受时长
    avoid_night_train: bool = True                # 避免夜间列车
    prefer_direct: bool = True                    # 偏好直达
    # 更倾向快速还是省钱: speed / budget / balanced
    prefer_speed_vs_budget: str = "balanced"
    # 更期待享受风景/运转还是更快到达: scenery / arrival / balanced
    prefer_scenery_vs_arrival: str = "balanced"
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class TravelHistory:
    """出行历史记录"""
    from_station: str
    to_station: str
    travel_date: date
    train_no: str
    timestamp: datetime = field(default_factory=datetime.now)


# 用户偏好持久化文件名（项目根目录或当前工作目录）
PREFERENCES_FILENAME = ".railmate_preferences"


def _load_preferences_from_env_and_file() -> Dict[str, str]:
    """从环境变量和本地文件加载用户偏好，供 UserContext 使用。"""
    result: Dict[str, str] = {}
    try:
        from app.core.config import settings
        if settings.railmate_prefer_speed_or_budget:
            result["prefer_speed_vs_budget"] = settings.railmate_prefer_speed_or_budget
        if settings.railmate_prefer_scenery_or_arrival:
            result["prefer_scenery_vs_arrival"] = settings.railmate_prefer_scenery_or_arrival
    except Exception:
        pass
    # 未在 env 中设置的，尝试从本地文件读取
    for path in (Path.cwd() / PREFERENCES_FILENAME, Path(__file__).resolve().parents[2] / PREFERENCES_FILENAME):
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if result.get("prefer_speed_vs_budget") is None and data.get("prefer_speed_vs_budget"):
                    result["prefer_speed_vs_budget"] = data["prefer_speed_vs_budget"]
                if result.get("prefer_scenery_vs_arrival") is None and data.get("prefer_scenery_vs_arrival"):
                    result["prefer_scenery_vs_arrival"] = data["prefer_scenery_vs_arrival"]
            except Exception:
                pass
            break
    return result


def save_preferences_to_file(prefer_speed_vs_budget: str, prefer_scenery_vs_arrival: str) -> Path:
    """将用户偏好写入本地文件（首次选择后持久化）。"""
    path = Path.cwd() / PREFERENCES_FILENAME
    data = {
        "prefer_speed_vs_budget": prefer_speed_vs_budget,
        "prefer_scenery_vs_arrival": prefer_scenery_vs_arrival,
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(f"用户偏好已保存到 {path}")
    return path


class UserContext:
    """
    用户上下文
    包含位置、偏好、历史等信息
    """
    
    # 城市到主要火车站的映射
    CITY_STATION_MAP = {
        "景德镇": "景德镇北",
        "广州": "广州南",
        "深圳": "深圳北",
        "北京": "北京西",
        "上海": "上海虹桥",
        "长沙": "长沙南",
        "武汉": "武汉",
        "南京": "南京南",
        "杭州": "杭州东",
        "成都": "成都东",
        "重庆": "重庆北",
        "西安": "西安北",
        "郑州": "郑州东",
        "天津": "天津",
        "苏州": "苏州北",
        "南昌": "南昌西",
        "合肥": "合肥南",
        "福州": "福州南",
        "厦门": "厦门北",
        "昆明": "昆明南",
        "贵阳": "贵阳北",
        "南宁": "南宁东",
        "石家庄": "石家庄",
        "太原": "太原南",
        "济南": "济南西",
        "青岛": "青岛北",
        "大连": "大连北",
        "沈阳": "沈阳北",
        "哈尔滨": "哈尔滨西",
        "长春": "长春",
        "兰州": "兰州西",
        "乌鲁木齐": "乌鲁木齐",
        "海口": "海口东",
        "三亚": "三亚",
        "珠海": "珠海",
        "佛山": "佛山西",
        "东莞": "东莞",
        "无锡": "无锡东",
        "宁波": "宁波",
        "温州": "温州南",
        "常州": "常州北",
        "徐州": "徐州东",
        "九江": "九江",
        "赣州": "赣州西",
    }
    
    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.location: Optional[UserLocation] = None
        self.preferences = UserPreferences()
        # 从 env 或 .railmate_preferences 文件加载偏好
        loaded = _load_preferences_from_env_and_file()
        if loaded.get("prefer_speed_vs_budget"):
            self.preferences.prefer_speed_vs_budget = loaded["prefer_speed_vs_budget"]
        if loaded.get("prefer_scenery_vs_arrival"):
            self.preferences.prefer_scenery_vs_arrival = loaded["prefer_scenery_vs_arrival"]
        self.history: List[TravelHistory] = []
        self._created_at = datetime.now()
    
    def set_location(
        self,
        city: str,
        station: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        source: str = "manual",
    ):
        """
        设置用户位置
        
        Args:
            city: 城市名称
            station: 火车站名称（可选，会自动推断）
            latitude: 纬度
            longitude: 经度
            source: 来源（manual/gps/ip）
        """
        # 如果没有指定车站，尝试从映射表获取
        if not station:
            station = self.CITY_STATION_MAP.get(city)
            if not station:
                # 尝试模糊匹配
                for city_name, station_name in self.CITY_STATION_MAP.items():
                    if city_name in city or city in city_name:
                        station = station_name
                        break
        
        self.location = UserLocation(
            city=city,
            station=station,
            latitude=latitude,
            longitude=longitude,
            source=source,
            updated_at=datetime.now(),
        )
        logger.info(f"📍 用户位置已更新: {city} ({station or '未知站点'})")
    
    def set_location_by_station(self, station_name: str):
        """
        通过车站名称设置位置
        """
        # 从车站名推断城市
        city = station_name
        for suffix in ["北", "南", "东", "西", "站"]:
            city = city.replace(suffix, "")
        
        self.location = UserLocation(
            city=city,
            station=station_name,
            source="manual",
            updated_at=datetime.now(),
        )
        logger.info(f"📍 用户位置已更新: {city} ({station_name})")
    
    def get_nearest_station(self) -> Optional[str]:
        """获取最近的火车站"""
        if self.location and self.location.station:
            return self.location.station
        return None
    
    def get_city(self) -> Optional[str]:
        """获取当前城市"""
        if self.location:
            return self.location.city
        return None
    
    def add_history(self, from_station: str, to_station: str, travel_date: date, train_no: str):
        """添加出行历史"""
        self.history.append(TravelHistory(
            from_station=from_station,
            to_station=to_station,
            travel_date=travel_date,
            train_no=train_no,
        ))
        # 只保留最近 20 条
        if len(self.history) > 20:
            self.history = self.history[-20:]
    
    def get_frequent_routes(self) -> List[tuple]:
        """获取常用线路"""
        route_count: Dict[tuple, int] = {}
        for h in self.history:
            route = (h.from_station, h.to_station)
            route_count[route] = route_count.get(route, 0) + 1
        
        # 按频次排序
        sorted_routes = sorted(route_count.items(), key=lambda x: x[1], reverse=True)
        return [route for route, _ in sorted_routes[:5]]
    
    def to_dict(self) -> dict:
        """转换为字典（用于 API 返回）"""
        return {
            "user_id": self.user_id,
            "location": self.location.to_dict() if self.location else None,
            "preferences": self.preferences.to_dict(),
            "frequent_routes": self.get_frequent_routes(),
        }
    
    def get_context_summary(self) -> str:
        """
        获取上下文摘要（用于 AI Prompt）
        """
        parts = []
        
        # 当前时间
        now = datetime.now()
        parts.append(f"当前时间: {now.strftime('%Y年%m月%d日 %H:%M')} (星期{['一','二','三','四','五','六','日'][now.weekday()]})")
        
        # 位置信息
        if self.location:
            location_str = f"用户当前位置: {self.location.city}"
            if self.location.station:
                location_str += f"，最近火车站: {self.location.station}"
            parts.append(location_str)
        
        # 偏好
        pref = self.preferences
        pref_parts = []
        if pref.preferred_seat_type:
            pref_parts.append(f"偏好座位: {pref.preferred_seat_type}")
        if pref.preferred_train_types:
            type_map = {"G": "高铁", "D": "动车", "C": "城际", "Z": "直达", "T": "特快", "K": "快速"}
            types = [type_map.get(t, t) for t in pref.preferred_train_types]
            pref_parts.append(f"偏好车型: {'/'.join(types)}")
        # 速度 vs 省钱
        speed_budget_map = {"speed": "更倾向快速到达", "budget": "更倾向省钱", "balanced": "速度与价格平衡"}
        if pref.prefer_speed_vs_budget and pref.prefer_speed_vs_budget != "balanced":
            pref_parts.append(speed_budget_map.get(pref.prefer_speed_vs_budget, pref.prefer_speed_vs_budget))
        # 风景/运转 vs 更快到达
        scenery_arrival_map = {"scenery": "更期待享受风景和运转", "arrival": "更期待更快到达目的地", "balanced": "两者平衡"}
        if pref.prefer_scenery_vs_arrival and pref.prefer_scenery_vs_arrival != "balanced":
            pref_parts.append(scenery_arrival_map.get(pref.prefer_scenery_vs_arrival, pref.prefer_scenery_vs_arrival))
        if pref_parts:
            parts.append("用户偏好: " + "，".join(pref_parts))
        
        # 常用线路
        frequent = self.get_frequent_routes()
        if frequent:
            routes_str = "、".join([f"{f}->{t}" for f, t in frequent[:3]])
            parts.append(f"常用线路: {routes_str}")
        
        return "\n".join(parts)


# 用户上下文存储（简单的内存存储，生产环境应使用 Redis）
_user_contexts: Dict[str, UserContext] = {}


def get_user_context(user_id: str = "default") -> UserContext:
    """获取用户上下文"""
    if user_id not in _user_contexts:
        _user_contexts[user_id] = UserContext(user_id)
    return _user_contexts[user_id]


def set_user_location(
    user_id: str,
    city: str,
    station: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> UserContext:
    """设置用户位置的便捷方法"""
    ctx = get_user_context(user_id)
    ctx.set_location(city, station, latitude, longitude)
    return ctx
