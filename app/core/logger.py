"""
日志配置模块
使用 Python 标准 logging + Rich 美化输出
"""

import logging
import sys

from rich.console import Console
from rich.logging import RichHandler

from .config import settings


def setup_logger(name: str = "railmate") -> logging.Logger:
    """
    配置并返回 logger 实例
    """
    # 创建 logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.log_level.upper()))
    
    # 避免重复添加 handler
    if logger.handlers:
        return logger
    
    # 使用 Rich 美化控制台输出
    console = Console(stderr=True)
    handler = RichHandler(
        console=console,
        show_time=True,
        show_path=False,
        markup=True,
        rich_tracebacks=True,
    )
    handler.setFormatter(logging.Formatter("%(message)s"))
    
    logger.addHandler(handler)
    
    return logger


# 全局 logger 实例
logger = setup_logger()
