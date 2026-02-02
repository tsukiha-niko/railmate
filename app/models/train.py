"""
车次与停靠站数据模型
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .station import Station


class Train(SQLModel, table=True):
    """
    车次模型
    存储列车基本信息
    """
    
    __tablename__ = "trains"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # 车次号 (如 G1002)
    train_no: str = Field(index=True, max_length=20)
    
    # 车次类型: G=高铁, D=动车, Z=直达, T=特快, K=快速, 其他
    train_type: str = Field(max_length=5)
    
    # 始发站编码
    origin_station_code: str = Field(max_length=10)
    
    # 终点站编码
    terminal_station_code: str = Field(max_length=10)
    
    # 运行日期 (某些车次只在特定日期运行)
    run_date: date = Field(index=True)
    
    # 全程运行时长 (分钟)
    total_duration_minutes: Optional[int] = Field(default=None)
    
    # 全程里程 (公里)
    total_distance_km: Optional[int] = Field(default=None)
    
    # 记录时间
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 关系：该车次的所有停靠站
    stops: List["TrainStop"] = Relationship(back_populates="train")
    
    def __repr__(self) -> str:
        return f"<Train {self.train_no} ({self.run_date})>"
    
    class Config:
        json_schema_extra = {
            "example": {
                "train_no": "G1002",
                "train_type": "G",
                "origin_station_code": "GZQ",
                "terminal_station_code": "BJP",
                "run_date": "2026-02-01",
                "total_duration_minutes": 480,
            }
        }


class TrainStop(SQLModel, table=True):
    """
    停靠站模型
    记录每趟列车在各站的到发时刻和票价
    """
    
    __tablename__ = "train_stops"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # 外键：关联车次
    train_id: int = Field(foreign_key="trains.id", index=True)
    
    # 外键：关联车站
    station_id: int = Field(foreign_key="stations.id", index=True)
    
    # 站序 (第几站，从 1 开始)
    stop_index: int = Field(ge=1)
    
    # 到达时间 (始发站为 None)
    arrival_time: Optional[time] = Field(default=None)
    
    # 出发时间 (终点站为 None)
    departure_time: Optional[time] = Field(default=None)
    
    # 停留时长 (分钟)
    stop_duration_minutes: int = Field(default=0)
    
    # 从始发站到此站的运行时长 (分钟)
    running_minutes: Optional[int] = Field(default=None)
    
    # 票价信息 (从始发站到此站)
    price_business_seat: Optional[Decimal] = Field(default=None, decimal_places=2)  # 商务座
    price_first_seat: Optional[Decimal] = Field(default=None, decimal_places=2)     # 一等座
    price_second_seat: Optional[Decimal] = Field(default=None, decimal_places=2)    # 二等座
    price_soft_sleeper: Optional[Decimal] = Field(default=None, decimal_places=2)   # 软卧
    price_hard_sleeper: Optional[Decimal] = Field(default=None, decimal_places=2)   # 硬卧
    price_hard_seat: Optional[Decimal] = Field(default=None, decimal_places=2)      # 硬座
    price_no_seat: Optional[Decimal] = Field(default=None, decimal_places=2)        # 无座
    
    # 余票数量 (可选，实时查询时更新)
    remaining_tickets: Optional[int] = Field(default=None)
    
    # 记录时间
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 关系
    train: "Train" = Relationship(back_populates="stops")
    station: "Station" = Relationship(back_populates="stops")
    
    def __repr__(self) -> str:
        return f"<TrainStop #{self.stop_index} at station_id={self.station_id}>"
    
    class Config:
        json_schema_extra = {
            "example": {
                "train_id": 1,
                "station_id": 1,
                "stop_index": 1,
                "arrival_time": None,
                "departure_time": "08:00",
                "stop_duration_minutes": 0,
                "price_second_seat": 553.00,
            }
        }
