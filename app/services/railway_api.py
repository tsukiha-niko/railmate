"""
12306 铁路数据 API 封装
提供车站、车次、余票等真实数据查询
"""

import re
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.logger import logger


class Railway12306API:
    """
    12306 非官方 API 封装
    注意：这些接口可能随时变化，需要定期维护
    """
    
    BASE_URL = "https://kyfw.12306.cn"
    STATION_URL = "https://kyfw.12306.cn/otn/resources/js/framework/station_name.js"
    TICKET_QUERY_URL = "https://kyfw.12306.cn/otn/leftTicket/query"
    PRICE_QUERY_URL = "https://kyfw.12306.cn/otn/leftTicket/queryTicketPrice"
    TRAIN_STOP_URL = "https://kyfw.12306.cn/otn/czxx/queryByTrainNo"
    
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Referer": "https://kyfw.12306.cn/otn/leftTicket/init",
    }

    QUERY_URLS = [
        "https://kyfw.12306.cn/otn/leftTicket/queryZ",
        "https://kyfw.12306.cn/otn/leftTicket/queryA",
        "https://kyfw.12306.cn/otn/leftTicket/query",
        "https://kyfw.12306.cn/otn/leftTicket/queryT",
    ]
    
    def __init__(self, timeout: float = 15.0):
        self.timeout = timeout
        self._station_cache: Dict[str, Dict[str, str]] = {}
        self._station_code_cache: Dict[str, str] = {}
        self._train_code_cache: Dict[str, List[Dict[str, str]]] = {}
        self._last_working_query_url: Optional[str] = None
        self._session_inited = False
        self._client = httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers=self.HEADERS,
            http2=False,
        )
    
    def _ensure_session(self) -> None:
        """确保12306会话已初始化（只做一次）"""
        if self._session_inited:
            return
        try:
            self._client.get("https://kyfw.12306.cn/otn/leftTicket/init")
            self._session_inited = True
        except Exception as e:
            logger.debug(f"会话初始化失败: {e}")
    
    def _request(self, url: str, params: Optional[Dict] = None, init_session: bool = False) -> Any:
        """发送 HTTP 请求（复用持久连接）"""
        if init_session:
            self._ensure_session()
        try:
            response = self._client.get(url, params=params)
            response.raise_for_status()
            return response
        except httpx.TimeoutException:
            logger.error(f"请求超时: {url}")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP 错误 {e.response.status_code}: {url}")
            raise
        except Exception as e:
            logger.error(f"请求失败: {url}, 错误: {e}")
            self._session_inited = False
            raise
    
    def close(self) -> None:
        """关闭持久连接"""
        self._client.close()
    
    # ==================== 车站数据 ====================
    
    def fetch_all_stations(self) -> List[Dict[str, str]]:
        """
        获取全国所有车站数据
        
        Returns:
            车站列表，每个元素包含 name, code, pinyin, initial, city 等字段
        """
        logger.info("正在从 12306 获取车站数据...")
        
        try:
            response = self._request(self.STATION_URL)
            content = response.text
            
            # 解析 JS 格式数据
            # 格式: var station_names = '@bjb|北京北|VAP|beijingbei|bjb|0@...'
            match = re.search(r"'(.+)'", content)
            if not match:
                logger.error("无法解析车站数据")
                return []
            
            stations_str = match.group(1)
            stations = []
            
            for item in stations_str.split("@"):
                if not item:
                    continue
                
                parts = item.split("|")
                if len(parts) >= 5:
                    station = {
                        "initial": parts[0],      # 首字母缩写
                        "name": parts[1],         # 车站名称
                        "code": parts[2],         # 电报码
                        "pinyin": parts[3],       # 拼音全拼
                        "short_pinyin": parts[4], # 拼音首字母
                    }
                    
                    # 推断城市名（去掉"站"、"东"、"西"、"南"、"北"等后缀）
                    city = re.sub(r'(东|西|南|北|站)$', '', station["name"])
                    station["city"] = city if city else station["name"]
                    
                    stations.append(station)
                    
                    # 缓存
                    self._station_cache[station["name"]] = station
                    self._station_code_cache[station["code"]] = station["name"]
            
            logger.info(f"成功获取 {len(stations)} 个车站")
            return stations
            
        except Exception as e:
            logger.error(f"获取车站数据失败: {e}")
            return []
    
    def get_station_code(self, station_name: str) -> Optional[str]:
        """
        根据车站名称获取电报码
        """
        if not self._station_cache:
            self.fetch_all_stations()
        
        # 精确匹配
        if station_name in self._station_cache:
            return self._station_cache[station_name]["code"]
        
        # 模糊匹配（加"站"后缀）
        if station_name + "站" in self._station_cache:
            return self._station_cache[station_name + "站"]["code"]
        
        # 模糊匹配（搜索包含该名称的车站）
        for name, info in self._station_cache.items():
            if station_name in name:
                return info["code"]
        
        return None
    
    def get_station_name(self, station_code: str) -> Optional[str]:
        """
        根据电报码获取车站名称
        """
        if not self._station_code_cache:
            self.fetch_all_stations()
        
        return self._station_code_cache.get(station_code)
    
    # ==================== 余票查询 ====================
    
    def query_tickets(
        self,
        from_station: str,
        to_station: str,
        travel_date: date,
        train_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        查询余票信息
        
        Args:
            from_station: 出发站名称
            to_station: 到达站名称
            travel_date: 出行日期
            train_type: 车次类型过滤 (G/D/Z/T/K)
            
        Returns:
            车次列表
        """
        # 获取车站电报码
        from_code = self.get_station_code(from_station)
        to_code = self.get_station_code(to_station)
        
        if not from_code:
            logger.error(f"未找到出发站: {from_station}")
            return []
        if not to_code:
            logger.error(f"未找到到达站: {to_station}")
            return []
        
        logger.info(f"查询余票: {from_station}({from_code}) -> {to_station}({to_code}), {travel_date}")
        
        params = {
            "leftTicketDTO.train_date": travel_date.strftime("%Y-%m-%d"),
            "leftTicketDTO.from_station": from_code,
            "leftTicketDTO.to_station": to_code,
            "purpose_codes": "ADULT",
        }
        
        urls_to_try = list(self.QUERY_URLS)
        if self._last_working_query_url:
            urls_to_try.remove(self._last_working_query_url)
            urls_to_try.insert(0, self._last_working_query_url)
        
        for query_url in urls_to_try:
            try:
                response = self._request(query_url, params, init_session=True)
                
                content = response.text
                if not content or content.startswith("<!"):
                    continue
                
                data = response.json()
                
                if data.get("status") is not True:
                    messages = data.get("messages", [])
                    if messages:
                        logger.warning(f"12306 返回: {messages}")
                    continue
                
                result_data = data.get("data", {})
                result_list = result_data.get("result", [])
                station_map = result_data.get("map", {})
                
                if not result_list:
                    continue
                
                self._last_working_query_url = query_url
                
                allowed_types = None
                if train_type:
                    allowed_types = {t.strip().upper() for t in train_type.split(",")}
                
                tickets = []
                for item in result_list:
                    parsed = self._parse_ticket_info(item, station_map)
                    if parsed:
                        if allowed_types and parsed["train_type"] not in allowed_types:
                            continue
                        tickets.append(parsed)
                
                self._cache_train_codes(from_code, to_code, travel_date, tickets)
                
                logger.info(f"查询到 {len(tickets)} 趟车次 (接口: {query_url.split('/')[-1]})")
                return tickets
                
            except Exception as e:
                logger.debug(f"接口 {query_url} 失败: {e}")
                continue
        
        logger.error("所有 12306 接口均查询失败")
        return []
    
    def _cache_train_codes(
        self,
        from_code: str,
        to_code: str,
        travel_date: date,
        tickets: List[Dict[str, Any]],
    ) -> None:
        """缓存车次内部编码，供时刻表查询直接使用"""
        key = f"{from_code}_{to_code}_{travel_date}"
        self._train_code_cache[key] = [
            {
                "train_no": t["train_no"],
                "train_code": t["train_code"],
                "start_station_code": t["start_station_code"],
                "end_station_code": t["end_station_code"],
            }
            for t in tickets
        ]
        if len(self._train_code_cache) > 200:
            oldest = next(iter(self._train_code_cache))
            del self._train_code_cache[oldest]
    
    def find_cached_train_code(
        self,
        train_no: str,
        from_station: str,
        to_station: str,
        travel_date: date,
    ) -> Optional[Dict[str, str]]:
        """查找缓存的车次内部编码（命中则无需重新查票）"""
        from_code = self.get_station_code(from_station)
        to_code = self.get_station_code(to_station)
        if not from_code or not to_code:
            return None
        key = f"{from_code}_{to_code}_{travel_date}"
        cached = self._train_code_cache.get(key, [])
        for t in cached:
            if t["train_no"].upper() == train_no.upper():
                return t
        return None
    
    def _parse_ticket_info(self, raw_data: str, station_map: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        解析单条车票信息
        
        12306 返回的数据格式（以 | 分隔），索引说明：
        0: 加密的预订串
        1: 预订按钮文字
        2: 车次编号（内部编码）
        3: 车次号 (如 G1001)
        4: 始发站代码
        5: 终到站代码
        6: 出发站代码
        7: 到达站代码
        8: 出发时间
        9: 到达时间
        10: 历时
        11: 是否可预订 (Y/N/IS_TIME_NOT_BUY)
        12: 日期偏移
        13: 出发日期
        
        座位余票索引（可能会变化）:
        - 二等座: 30
        - 一等座: 31
        - 商务座: 32
        - 硬卧: 28
        - 硬座: 29
        - 无座: 26 或 33
        """
        try:
            parts = raw_data.split("|")
            if len(parts) < 12:
                return None
            
            train_no = parts[3]
            if not train_no:
                return None
            
            train_type = train_no[0] if train_no else "O"  # 首字母为车型
            
            # 解析时间
            departure_time = parts[8]
            arrival_time = parts[9]
            duration = parts[10]
            
            # 跳过没有时间的记录
            if not departure_time or departure_time == "--":
                return None
            
            # 解析余票（"有"、"无"、数字、"--"、"*"）
            def parse_ticket_count(val: str) -> Optional[int]:
                if not val:
                    return None
                val = val.strip()
                if val == "有":
                    return 999  # 充足
                elif val in ("无", "--", "*", ""):
                    return 0
                elif val.isdigit():
                    return int(val)
                return None
            
            # 获取站名
            from_station_code = parts[6]
            to_station_code = parts[7]
            from_station_name = station_map.get(from_station_code, from_station_code)
            to_station_name = station_map.get(to_station_code, to_station_code)
            
            # 计算时长（分钟）
            duration_minutes = 0
            if duration and ":" in duration:
                try:
                    h, m = duration.split(":")
                    duration_minutes = int(h) * 60 + int(m)
                except:
                    pass
            
            # 安全获取座位余票
            def safe_get(idx: int) -> str:
                return parts[idx] if len(parts) > idx else ""
            
            return {
                "train_code": parts[2],           # 车次编码（内部用）
                "train_no": train_no,             # 车次号
                "train_type": train_type,         # 车型
                "from_station_code": from_station_code,
                "to_station_code": to_station_code,
                "from_station_name": from_station_name,
                "to_station_name": to_station_name,
                "start_station_code": parts[4],   # 始发站
                "end_station_code": parts[5],     # 终点站
                "departure_time": departure_time,
                "arrival_time": arrival_time,
                "duration": duration,
                "duration_minutes": duration_minutes,
                "can_book": parts[11] in ("Y", "N"),  # 有按钮就算
                "date": safe_get(13),             # 出发日期
                # 座位余票（索引可能需要根据实际调整）
                "business_seat": parse_ticket_count(safe_get(32)),   # 商务座/特等座
                "first_seat": parse_ticket_count(safe_get(31)),      # 一等座
                "second_seat": parse_ticket_count(safe_get(30)),     # 二等座
                "soft_sleeper": parse_ticket_count(safe_get(23)),    # 软卧
                "hard_sleeper": parse_ticket_count(safe_get(28)),    # 硬卧
                "hard_seat": parse_ticket_count(safe_get(29)),       # 硬座
                "no_seat": parse_ticket_count(safe_get(26)) or parse_ticket_count(safe_get(33)),  # 无座
            }
            
        except Exception as e:
            logger.warning(f"解析车票数据失败: {e}, 原始数据: {raw_data[:100]}...")
            return None
    
    # ==================== 票价查询 ====================
    
    def query_ticket_price(
        self,
        train_no: str,
        from_station_code: str,
        to_station_code: str,
        seat_types: str,
        travel_date: date,
    ) -> Dict[str, Optional[float]]:
        """
        查询票价

        需要先初始化会话获取 cookie，否则 12306 返回空内容。
        """
        params = {
            "train_no": train_no,
            "from_station_no": from_station_code,
            "to_station_no": to_station_code,
            "seat_types": seat_types,
            "train_date": travel_date.strftime("%Y-%m-%d"),
        }
        
        try:
            response = self._request(self.PRICE_QUERY_URL, params, init_session=True)
            
            content = response.text.strip()
            if not content or content.startswith("<!"):
                return {}
            
            data = response.json()
            
            if data.get("status") is not True:
                return {}
            
            price_data = data.get("data", {})
            
            prices = {
                "business_seat": self._parse_price(price_data.get("A9")),
                "first_seat": self._parse_price(price_data.get("M")),
                "second_seat": self._parse_price(price_data.get("O")),
                "soft_sleeper": self._parse_price(price_data.get("A4")),
                "hard_sleeper": self._parse_price(price_data.get("A3")),
                "hard_seat": self._parse_price(price_data.get("A1")),
                "no_seat": self._parse_price(price_data.get("WZ")),
            }
            
            return prices
            
        except Exception as e:
            logger.debug(f"票价查询跳过: {train_no} ({e.__class__.__name__})")
            return {}
    
    def _parse_price(self, price_str: Optional[str]) -> Optional[float]:
        """解析票价字符串"""
        if not price_str:
            return None
        try:
            # 去掉 "¥" 符号
            price_str = price_str.replace("¥", "").replace(",", "")
            return float(price_str)
        except:
            return None
    
    # ==================== 车次经停站查询 ====================
    
    def query_train_stops(
        self,
        train_no: str,
        from_station_code: str,
        to_station_code: str,
        travel_date: date,
    ) -> List[Dict[str, Any]]:
        """
        查询车次经停站信息
        
        Args:
            train_no: 车次编码（内部编码）
            from_station_code: 出发站代码
            to_station_code: 到达站代码
            travel_date: 出行日期
            
        Returns:
            经停站列表
        """
        params = {
            "train_no": train_no,
            "from_station_telecode": from_station_code,
            "to_station_telecode": to_station_code,
            "depart_date": travel_date.strftime("%Y-%m-%d"),
        }
        
        try:
            response = self._request(self.TRAIN_STOP_URL, params)
            data = response.json()
            
            if data.get("status") is not True:
                return []
            
            stops_data = data.get("data", {}).get("data", [])
            
            stops = []
            for item in stops_data:
                stop = {
                    "station_no": item.get("station_no"),          # 站序
                    "station_name": item.get("station_name"),      # 站名
                    "arrive_time": item.get("arrive_time"),        # 到达时间
                    "start_time": item.get("start_time"),          # 出发时间
                    "stopover_time": item.get("stopover_time"),    # 停留时间
                    "is_enabled": item.get("isEnabled"),           # 是否可售
                }
                stops.append(stop)
            
            return stops
            
        except Exception as e:
            logger.warning(f"查询经停站失败: {e}")
            return []


# 全局 API 实例
_api: Optional[Railway12306API] = None


def get_railway_api() -> Railway12306API:
    """获取 API 单例"""
    global _api
    if _api is None:
        _api = Railway12306API()
    return _api
