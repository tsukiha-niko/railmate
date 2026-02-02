"""
AI 对话接口
支持位置感知的智能查票
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.exceptions import AIAgentError
from app.core.logger import logger
from app.schemas.chat import ChatRequest, ChatResponse, UserLocationInput
from app.services.ai_agent import get_agent

router = APIRouter()


class GPSLocationInput(BaseModel):
    """GPS 定位输入"""
    latitude: float = Field(..., description="纬度")
    longitude: float = Field(..., description="经度")
    city: Optional[str] = Field(default=None, description="城市名（前端可能已获取）")


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    与 AI 助手对话
    
    支持传入用户位置，AI 会自动将其作为默认出发地。
    
    参数:
    - **message**: 用户消息（自然语言）
    - **conversation_id**: 可选，用于多轮对话
    - **user_id**: 用户 ID，用于隔离不同用户的上下文
    - **location**: 用户位置（前端可传入 GPS 定位结果）
    
    示例请求:
    ```json
    {
        "message": "最快到广州的票",
        "user_id": "user_001",
        "location": {
            "city": "景德镇",
            "station": "景德镇北"
        }
    }
    ```
    
    AI 会自动推断：
    - 没有说出发地 → 使用用户位置
    - 没有说日期 → 根据当前时间智能选择今天或明天
    - 说"最快" → 查找最近能赶上的车次
    """
    try:
        # 获取或创建用户专属的 Agent
        user_id = request.user_id or "default"
        agent = get_agent(user_id)
        
        if agent.client is None:
            raise HTTPException(
                status_code=503,
                detail="AI 服务未配置，请在 .env 中设置 OPENAI_API_KEY"
            )
        
        # 如果前端传入了位置信息，更新用户位置
        if request.location:
            agent.set_location(
                city=request.location.city,
                station=request.location.station,
            )
            logger.info(f"📍 更新用户位置: {request.location.city}")
        
        response = agent.chat(
            message=request.message,
            conversation_id=request.conversation_id,
        )
        
        return response
        
    except AIAgentError as e:
        logger.error(f"AI 对话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"对话接口异常: {e}")
        raise HTTPException(status_code=500, detail=f"服务内部错误: {str(e)}")


@router.delete("/{conversation_id}")
async def clear_conversation(conversation_id: str, user_id: str = "default"):
    """
    清除指定对话的历史记录
    """
    try:
        agent = get_agent(user_id)
        agent.clear_conversation(conversation_id)
        return {"message": f"对话 {conversation_id} 已清除"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/location")
async def set_user_location(location: UserLocationInput, user_id: str = "default"):
    """
    设置用户位置
    
    前端可在应用启动时调用此接口设置用户位置，
    后续对话中 AI 会自动使用此位置作为默认出发地。
    """
    try:
        agent = get_agent(user_id)
        agent.set_location(
            city=location.city,
            station=location.station,
        )
        
        return {
            "success": True,
            "location": agent.get_location(),
            "message": f"位置已设置: {location.city}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/location")
async def get_user_location(user_id: str = "default"):
    """
    获取用户当前位置设置
    """
    try:
        agent = get_agent(user_id)
        location = agent.get_location()
        
        if location:
            return {
                "success": True,
                "location": location,
            }
        else:
            return {
                "success": False,
                "message": "用户位置未设置",
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/context")
async def get_user_context(user_id: str = "default"):
    """
    获取完整的用户上下文（位置、偏好、常用路线等）
    
    前端可用此接口展示个性化信息。
    """
    try:
        agent = get_agent(user_id)
        return {
            "success": True,
            "context": agent.user_context.to_dict(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locate/ip")
async def locate_by_ip(user_id: str = "default", ip: Optional[str] = None):
    """
    通过 IP 地址自动定位
    
    - 不传 ip 参数时，自动获取请求者的公网 IP
    - 定位成功后自动更新用户位置
    
    适用场景：
    - Web 端首次打开时自动定位
    - 小程序/App 无 GPS 权限时的备选方案
    """
    from app.services.geo_service import get_geo_service
    
    try:
        geo_service = get_geo_service()
        location = geo_service.locate_by_ip(ip)
        
        if location:
            # 更新用户位置
            agent = get_agent(user_id)
            agent.set_location(
                city=location.city,
                station=location.station,
            )
            
            return {
                "success": True,
                "location": location.to_dict(),
                "message": f"定位成功: {location.city}",
            }
        else:
            return {
                "success": False,
                "message": "IP 定位失败",
            }
    except Exception as e:
        logger.error(f"IP 定位失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/locate/gps")
async def locate_by_gps(gps: GPSLocationInput, user_id: str = "default"):
    """
    通过 GPS 坐标定位
    
    前端获取到设备 GPS 坐标后调用此接口。
    
    示例请求:
    ```json
    {
        "latitude": 29.2688,
        "longitude": 117.1786,
        "city": "景德镇"
    }
    ```
    
    注意：
    - 如果前端已经获取到城市名，请一并传入，可加速定位
    - 如果只有经纬度，后端会尝试逆地理编码（可能较慢）
    """
    from app.services.geo_service import get_geo_service
    
    try:
        geo_service = get_geo_service()
        location = geo_service.locate_by_gps(
            latitude=gps.latitude,
            longitude=gps.longitude,
            city=gps.city,
        )
        
        # 更新用户位置
        agent = get_agent(user_id)
        agent.set_location(
            city=location.city,
            station=location.station,
        )
        
        return {
            "success": True,
            "location": location.to_dict(),
            "message": f"GPS 定位成功: {location.city}",
        }
    except Exception as e:
        logger.error(f"GPS 定位失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locate/auto")
async def auto_locate(user_id: str = "default"):
    """
    自动定位（服务端自动选择最佳方式）
    
    目前使用 IP 定位，未来可扩展更多定位方式。
    
    适用场景：
    - 用户首次使用时自动获取位置
    - 无需用户授权即可获取大致位置
    """
    from app.services.geo_service import auto_detect_location
    
    try:
        location = auto_detect_location()
        
        if location:
            # 更新用户位置
            agent = get_agent(user_id)
            agent.set_location(
                city=location.city,
                station=location.station,
            )
            
            return {
                "success": True,
                "location": location.to_dict(),
                "message": f"自动定位成功: {location.city} ({location.station})",
            }
        else:
            return {
                "success": False,
                "message": "自动定位失败，请手动设置位置或使用 GPS 定位",
            }
    except Exception as e:
        logger.error(f"自动定位失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
