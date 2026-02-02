"""
自定义异常模块
"""

from typing import Any, Optional


class RailMateException(Exception):
    """RailMate 基础异常类"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class DatabaseError(RailMateException):
    """数据库操作异常"""
    pass


class DataSyncError(RailMateException):
    """数据同步异常"""
    pass


class TrainNotFoundError(RailMateException):
    """车次未找到"""
    pass


class StationNotFoundError(RailMateException):
    """车站未找到"""
    pass


class AIAgentError(RailMateException):
    """AI Agent 异常"""
    pass


class ConfigurationError(RailMateException):
    """配置错误"""
    pass
