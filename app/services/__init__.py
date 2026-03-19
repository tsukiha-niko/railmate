"""
业务服务层
"""

from .ai_agent import RailMateAgent, get_agent
from .data_sync import DataSyncService
from .geo_service import GeoService, get_geo_service, auto_detect_location
from .railway_api import Railway12306API, get_railway_api
from .train_service import TrainService
from .ticketing_service import TicketingService
from .user_context import UserContext, get_user_context, set_user_location

__all__ = [
    "DataSyncService",
    "TrainService", 
    "TicketingService",
    "RailMateAgent", 
    "get_agent",
    "Railway12306API",
    "get_railway_api",
    "UserContext",
    "get_user_context",
    "set_user_location",
    "GeoService",
    "get_geo_service",
    "auto_detect_location",
]
