"""
地理位置服务
支持多种定位方式：IP 定位、GPS 定位等

为前端和控制台提供统一的定位接口
"""

import socket
from typing import Optional, Tuple
from dataclasses import dataclass

import httpx

from app.core.logger import logger


@dataclass
class GeoLocation:
    """地理位置结果"""
    city: str                          # 城市名
    province: Optional[str] = None     # 省份
    country: str = "中国"              # 国家
    latitude: Optional[float] = None   # 纬度
    longitude: Optional[float] = None  # 经度
    ip: Optional[str] = None           # IP 地址
    source: str = "unknown"            # 定位来源: ip/gps/manual
    station: Optional[str] = None      # 推荐的火车站
    
    def to_dict(self) -> dict:
        return {
            "city": self.city,
            "province": self.province,
            "country": self.country,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "ip": self.ip,
            "source": self.source,
            "station": self.station,
        }


class GeoService:
    """
    地理位置服务
    
    支持多种定位方式：
    1. IP 定位（自动获取公网 IP 并定位）
    2. GPS 定位（前端传入经纬度）
    3. 手动设置
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
        "南通": "南通",
        "扬州": "扬州东",
        "泉州": "泉州",
        "烟台": "烟台",
        "潍坊": "潍坊",
        "洛阳": "洛阳龙门",
        "桂林": "桂林北",
        "柳州": "柳州",
        "绍兴": "绍兴北",
        "嘉兴": "嘉兴南",
        "湖州": "湖州",
        "金华": "金华",
        "台州": "台州",
        "芜湖": "芜湖",
        "蚌埠": "蚌埠南",
        "淮南": "淮南东",
        "马鞍山": "马鞍山东",
        "安庆": "安庆",
        "黄山": "黄山北",
        "宣城": "宣城",
        "池州": "池州",
        "铜陵": "铜陵",
        "淮北": "淮北",
        "宿州": "宿州东",
        "亳州": "亳州南",
        "阜阳": "阜阳西",
        "滁州": "滁州",
        "六安": "六安",
        "宜春": "宜春",
        "萍乡": "萍乡北",
        "新余": "新余北",
        "鹰潭": "鹰潭北",
        "抚州": "抚州东",
        "吉安": "吉安西",
        "上饶": "上饶",
        "株洲": "株洲西",
        "湘潭": "湘潭北",
        "衡阳": "衡阳东",
        "邵阳": "邵阳",
        "岳阳": "岳阳东",
        "常德": "常德",
        "张家界": "张家界西",
        "益阳": "益阳",
        "郴州": "郴州西",
        "永州": "永州",
        "怀化": "怀化南",
        "娄底": "娄底南",
    }
    
    # IP 定位 API 列表（按优先级）
    IP_LOCATION_APIS = [
        {
            "name": "ip-api.com",
            "url": "http://ip-api.com/json/?lang=zh-CN",
            "parser": "_parse_ip_api",
        },
        {
            "name": "ipinfo.io",
            "url": "https://ipinfo.io/json",
            "parser": "_parse_ipinfo",
        },
        {
            "name": "ip.sb",
            "url": "https://api.ip.sb/geoip",
            "parser": "_parse_ipsb",
        },
    ]
    
    def __init__(self, timeout: float = 5.0):
        self.timeout = timeout
    
    def get_station_for_city(self, city: str) -> Optional[str]:
        """根据城市名获取推荐的火车站"""
        # 精确匹配
        if city in self.CITY_STATION_MAP:
            return self.CITY_STATION_MAP[city]
        
        # 模糊匹配（去掉"市"后缀）
        city_clean = city.rstrip("市")
        if city_clean in self.CITY_STATION_MAP:
            return self.CITY_STATION_MAP[city_clean]
        
        # 部分匹配
        for city_name, station in self.CITY_STATION_MAP.items():
            if city_name in city or city in city_name:
                return station
        
        # 默认返回 城市名 + "站"
        return f"{city_clean}"
    
    # ==================== IP 定位 ====================
    
    def locate_by_ip(self, ip: Optional[str] = None) -> Optional[GeoLocation]:
        """
        通过 IP 地址定位
        
        Args:
            ip: IP 地址，如果不传则自动获取公网 IP
            
        Returns:
            GeoLocation 或 None
        """
        logger.info("📍 正在通过 IP 获取位置...")
        
        for api_config in self.IP_LOCATION_APIS:
            try:
                url = api_config["url"]
                if ip:
                    url = f"{url}?ip={ip}" if "?" not in url else f"{url}&ip={ip}"
                
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.get(url)
                    response.raise_for_status()
                    data = response.json()
                
                # 调用对应的解析器
                parser = getattr(self, api_config["parser"])
                location = parser(data)
                
                if location and location.city:
                    # 补充火车站信息
                    location.station = self.get_station_for_city(location.city)
                    logger.info(f"✅ IP 定位成功: {location.city} ({location.station})")
                    return location
                    
            except Exception as e:
                logger.debug(f"API {api_config['name']} 失败: {e}")
                continue
        
        logger.warning("⚠️ 所有 IP 定位 API 均失败")
        return None
    
    def _parse_ip_api(self, data: dict) -> Optional[GeoLocation]:
        """解析 ip-api.com 响应"""
        if data.get("status") != "success":
            return None
        
        return GeoLocation(
            city=data.get("city", ""),
            province=data.get("regionName", ""),
            country=data.get("country", "中国"),
            latitude=data.get("lat"),
            longitude=data.get("lon"),
            ip=data.get("query"),
            source="ip",
        )
    
    def _parse_ipinfo(self, data: dict) -> Optional[GeoLocation]:
        """解析 ipinfo.io 响应"""
        city = data.get("city", "")
        if not city:
            return None
        
        lat, lon = None, None
        loc = data.get("loc", "")
        if loc and "," in loc:
            parts = loc.split(",")
            lat, lon = float(parts[0]), float(parts[1])
        
        return GeoLocation(
            city=city,
            province=data.get("region", ""),
            country=data.get("country", "CN"),
            latitude=lat,
            longitude=lon,
            ip=data.get("ip"),
            source="ip",
        )
    
    def _parse_ipsb(self, data: dict) -> Optional[GeoLocation]:
        """解析 ip.sb 响应"""
        city = data.get("city", "")
        if not city:
            return None
        
        return GeoLocation(
            city=city,
            province=data.get("region", ""),
            country=data.get("country", "中国"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            ip=data.get("ip"),
            source="ip",
        )
    
    # ==================== GPS 定位（前端调用） ====================
    
    def locate_by_gps(
        self,
        latitude: float,
        longitude: float,
        city: Optional[str] = None,
    ) -> GeoLocation:
        """
        通过 GPS 坐标定位
        
        前端获取到 GPS 坐标后调用此方法。
        如果前端同时提供了城市名，则直接使用；
        否则需要调用逆地理编码 API（暂未实现）。
        
        Args:
            latitude: 纬度
            longitude: 经度
            city: 城市名（前端可能已通过浏览器 API 获取）
            
        Returns:
            GeoLocation
        """
        logger.info(f"📍 GPS 定位: {latitude}, {longitude}")
        
        if not city:
            # TODO: 调用逆地理编码 API 获取城市名
            # 暂时使用 IP 定位作为补充
            ip_location = self.locate_by_ip()
            if ip_location:
                city = ip_location.city
            else:
                city = "未知"
        
        station = self.get_station_for_city(city)
        
        location = GeoLocation(
            city=city,
            latitude=latitude,
            longitude=longitude,
            source="gps",
            station=station,
        )
        
        logger.info(f"✅ GPS 定位: {city} ({station})")
        return location
    
    # ==================== 自动定位 ====================
    
    def auto_locate(self) -> Optional[GeoLocation]:
        """
        自动定位（优先使用 IP 定位）
        
        控制台启动时调用此方法。
        """
        return self.locate_by_ip()


# 全局实例
_geo_service: Optional[GeoService] = None


def get_geo_service() -> GeoService:
    """获取地理位置服务单例"""
    global _geo_service
    if _geo_service is None:
        _geo_service = GeoService()
    return _geo_service


def auto_detect_location() -> Optional[GeoLocation]:
    """自动检测位置的便捷方法"""
    return get_geo_service().auto_locate()
