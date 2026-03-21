"""
AI 对话相关的 Schema
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, Field


class UserLocationInput(BaseModel):
    """用户位置输入"""
    
    city: str = Field(..., description="城市名称")
    station: Optional[str] = Field(default=None, description="火车站名称（可选）")
    latitude: Optional[float] = Field(default=None, description="纬度")
    longitude: Optional[float] = Field(default=None, description="经度")


class ChatRequest(BaseModel):
    """聊天请求"""
    
    message: str = Field(..., min_length=1, max_length=2000, description="用户消息")
    conversation_id: Optional[str] = Field(default=None, description="会话 ID，用于多轮对话")
    user_id: Optional[str] = Field(default="default", description="用户 ID")
    location: Optional[UserLocationInput] = Field(default=None, description="用户位置（前端可传入 GPS 定位）")
    planning_mode: Literal["efficient", "rail_experience", "stopover_explore"] = Field(
        default="efficient",
        description="规划模式：efficient=高效赶路，rail_experience=铁路运转体验，stopover_explore=沿途游玩",
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "最快到广州的票",
                "conversation_id": "conv_123456",
                "user_id": "user_001",
                "location": {
                    "city": "景德镇",
                    "station": "景德镇北",
                    "latitude": 29.2688,
                    "longitude": 117.1786
                }
            }
        }


class ToolCall(BaseModel):
    """工具调用记录"""
    
    tool_name: str
    arguments: Dict[str, Any]
    result: Optional[Any] = None


class ChatResponse(BaseModel):
    """聊天响应"""
    
    answer: str = Field(..., description="AI 回复")
    conversation_id: str = Field(..., description="会话 ID")
    tool_calls: List[ToolCall] = Field(default_factory=list, description="本次调用的工具列表")
    quick_replies: List[str] = Field(
        default_factory=list,
        description="可选 1～3 条快捷回复按钮文案（由正文末 ::actions:: 解析或结构化生成）",
    )
    timestamp: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "明天（2月2日）从广州南到长沙南的高铁有以下班次...",
                "quick_replies": ["查更快车次", "看中转方案"],
                "conversation_id": "conv_123456",
                "tool_calls": [
                    {
                        "tool_name": "search_tickets",
                        "arguments": {
                            "from_station": "广州南",
                            "to_station": "长沙南",
                            "date": "2026-02-02"
                        },
                        "result": "..."
                    }
                ],
            }
        }


class ProgressEvent(BaseModel):
    """后端真实进度事件"""

    status: Literal["queued", "running", "completed", "failed"] = Field(..., description="事件状态")
    percent: int = Field(default=0, ge=0, le=100, description="当前进度百分比")
    message: str = Field(..., description="给前端展示的进度文案")
    detail: Optional[str] = Field(default=None, description="更细的阶段信息")
    timestamp: datetime = Field(default_factory=datetime.now)


class ChatJobCreateResponse(BaseModel):
    """创建聊天任务后的响应"""

    job_id: str
    conversation_id: str
    status: Literal["queued", "running", "completed", "failed"] = "queued"
    progress_percent: int = Field(default=0, ge=0, le=100)
    current_message: str = "任务已创建"


class ChatJobStatusResponse(BaseModel):
    """聊天任务轮询状态"""

    job_id: str
    conversation_id: str
    status: Literal["queued", "running", "completed", "failed"]
    progress_percent: int = Field(default=0, ge=0, le=100)
    current_message: str
    events: List[ProgressEvent] = Field(default_factory=list)
    result: Optional[ChatResponse] = None
    error: Optional[str] = None


class TrainSearchResult(BaseModel):
    """车次搜索结果"""
    
    train_no: str
    train_type: str
    from_station: str
    to_station: str
    start_station: Optional[str] = None
    end_station: Optional[str] = None
    # Live 模式用于按需补票价/时刻表的元数据（前端可忽略）
    train_code: Optional[str] = None
    from_station_code: Optional[str] = None
    to_station_code: Optional[str] = None
    from_station_no: Optional[str] = None
    to_station_no: Optional[str] = None
    departure_time: str
    arrival_time: str
    duration_minutes: int
    price_second_seat: Optional[float] = None
    price_first_seat: Optional[float] = None
    price_business_seat: Optional[float] = None
    price_soft_sleeper: Optional[float] = None
    price_hard_sleeper: Optional[float] = None
    price_hard_seat: Optional[float] = None
    price_no_seat: Optional[float] = None
    remaining_tickets: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "train_no": "G1002",
                "train_type": "G",
                "from_station": "广州南",
                "to_station": "长沙南",
                "start_station": "深圳北",
                "end_station": "武汉",
                "departure_time": "08:00",
                "arrival_time": "10:30",
                "duration_minutes": 150,
                "price_second_seat": 314.0,
            }
        }


class TransferLeg(BaseModel):
    """中转行程段"""
    
    train_no: str
    train_type: str
    from_station: str
    to_station: str
    departure_time: str
    arrival_time: str
    duration_minutes: int
    price_second_seat: Optional[float] = None
    
    def to_compact(self) -> dict:
        """返回紧凑格式，减少token消耗"""
        return {
            "t": self.train_no,  # train
            "f": self.from_station,  # from
            "o": self.to_station,  # to
            "d": self.departure_time,  # depart
            "a": self.arrival_time,  # arrive
            "m": self.duration_minutes,  # minutes
            "p": self.price_second_seat,  # price
        }


class TransferPlan(BaseModel):
    """中转方案"""
    
    legs: List[TransferLeg] = Field(..., description="行程段列表")
    transfer_count: int = Field(..., description="中转次数（1或2）")
    transfer_stations: List[str] = Field(..., description="中转站列表")
    total_duration_minutes: int = Field(..., description="总耗时（含候车）")
    total_price: Optional[float] = Field(default=None, description="总票价（二等座）")
    wait_times: List[int] = Field(..., description="各中转站等待时间（分钟）")
    score: float = Field(default=0.0, description="方案评分（越高越优）")
    
    @property
    def summary(self) -> str:
        """生成方案摘要"""
        route = " → ".join([self.legs[0].from_station] + self.transfer_stations + [self.legs[-1].to_station])
        trains = "/".join([leg.train_no for leg in self.legs])
        hours = self.total_duration_minutes // 60
        mins = self.total_duration_minutes % 60
        return f"{route} [{trains}] {hours}h{mins}m ¥{self.total_price or '?'}"
    
    def to_compact(self) -> dict:
        """返回紧凑格式用于AI响应"""
        return {
            "legs": [leg.to_compact() for leg in self.legs],
            "via": self.transfer_stations,
            "total_min": self.total_duration_minutes,
            "total_price": self.total_price,
            "waits": self.wait_times,
            "score": round(self.score, 1),
        }


class TransferSearchResult(BaseModel):
    """中转查询结果"""
    
    success: bool
    from_station: str
    to_station: str
    date: str
    direct_count: int = Field(..., description="直达车次数量")
    plans: List[TransferPlan] = Field(default_factory=list, description="中转方案列表")
    message: Optional[str] = None
    
    def to_compact(self) -> dict:
        """紧凑格式，减少token"""
        return {
            "ok": self.success,
            "from": self.from_station,
            "to": self.to_station,
            "date": self.date,
            "direct": self.direct_count,
            "plans": [p.to_compact() for p in self.plans],
            "msg": self.message,
        }
