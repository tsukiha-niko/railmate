"""
配置管理模块
使用 Pydantic Settings 管理环境变量
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    
    # 数据同步模式
    data_sync_mode: Literal["mock", "live"] = "mock"
    
    # 日志
    log_level: str = "INFO"
    
    # 定时任务
    scheduler_enabled: bool = True
    sync_interval_hours: int = 1


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()
