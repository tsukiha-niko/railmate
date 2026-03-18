"""
配置管理模块
使用 Pydantic Settings 管理环境变量
"""

from functools import lru_cache
from typing import Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


# 用户偏好：速度 vs 省钱
PreferSpeedOrBudget = Literal["speed", "budget", "balanced"]
# 用户偏好：享受风景/运转 vs 更快到达
PreferSceneryOrArrival = Literal["scenery", "arrival", "balanced"]


class Settings(BaseSettings):
    """应用配置"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # 应用信息
    app_name: str = "RailMate"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # 数据库
    database_url: str = "sqlite:///./railmate.db"
    
    # OpenAI / LLM
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4-turbo-preview"
    openai_timeout_seconds: float = 120.0
    openai_max_retries: int = 1
    
    # 数据同步模式
    data_sync_mode: Literal["mock", "live"] = "mock"

    # 12306 Cookie（可选）：用于打通票价等更严格的接口（可能需要包含 RAIL_DEVICEID/RAIL_EXPIRATION）
    railway_12306_cookie: Optional[str] = None
    
    # 日志
    log_level: str = "INFO"
    
    # 定时任务
    scheduler_enabled: bool = True
    sync_interval_hours: int = 1
    
    # 用户偏好（可从 .env 预设，未设置时首次启动会引导选择）
    # 更倾向快速还是省钱: speed / budget / balanced
    railmate_prefer_speed_or_budget: Optional[Literal["speed", "budget", "balanced"]] = None
    # 更期待享受风景和运转还是更快到达: scenery / arrival / balanced
    railmate_prefer_scenery_or_arrival: Optional[Literal["scenery", "arrival", "balanced"]] = None


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()
