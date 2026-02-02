"""
车站数据模型
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .train import TrainStop


class Station(SQLModel, table=True):
    """
    车站模型
    存储全国铁路车站信息
    """
    
    __tablename__ = "stations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # 车站编码 (如 GZQ = 广州南)
    code: str = Field(index=True, unique=True, max_length=10)
    
    # 车站名称
    name: str = Field(index=True, max_length=50)
    
    # 所属城市
    city_name: str = Field(max_length=50)
    
    # 拼音简码 (用于搜索)
    pinyin: Optional[str] = Field(default=None, max_length=50)
    
    # 首字母简码
    initial: Optional[str] = Field(default=None, max_length=10)
    
    # 是否为主要枢纽站
    is_hub: bool = Field(default=False)
    
    # 记录时间
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # 关系：该站的所有停靠记录
    stops: List["TrainStop"] = Relationship(back_populates="station")
    
    def __repr__(self) -> str:
        return f"<Station {self.code}: {self.name}>"
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": "GZQ",
                "name": "广州南",
                "city_name": "广州",
                "pinyin": "guangzhounan",
                "initial": "GZN",
                "is_hub": True,
            }
        }
