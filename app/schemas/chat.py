"""
AI 对话相关的 Schema
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

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
    timestamp: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "明天（2月2日）从广州南到长沙南的高铁有以下班次...",
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


class TrainSearchResult(BaseModel):
    """车次搜索结果"""
    
    train_no: str
    train_type: str
    from_station: str
    to_station: str
    departure_time: str
    arrival_time: str
    duration_minutes: int
    price_second_seat: Optional[float] = None
    price_first_seat: Optional[float] = None
    price_business_seat: Optional[float] = None
    remaining_tickets: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "train_no": "G1002",
                "train_type": "G",
                "from_station": "广州南",
                "to_station": "长沙南",
                "departure_time": "08:00",
                "arrival_time": "10:30",
                "duration_minutes": 150,
                "price_second_seat": 314.0,
            }
        }
