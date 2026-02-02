"""
AI Agent 核心模块
负责 LLM 初始化、Prompt 管理、Tool 绑定和对话管理

特性：
- 感知用户位置和当前时间
- 智能推断出发地和目的地
- 多轮对话记忆
- Function Calling 工具调用
"""

import json
import uuid
from datetime import date, datetime, time, timedelta
from typing import Any, Callable, Dict, List, Optional

from openai import OpenAI

from app.core.config import settings
from app.core.exceptions import AIAgentError
from app.core.logger import logger
from app.schemas.chat import ChatResponse, ToolCall
from app.services.train_service import TrainService
from app.services.user_context import UserContext, get_user_context


# ==================== System Prompt ====================

SYSTEM_PROMPT = """你是 RailMate（智轨伴行），一位资深的中国铁路出行专家和私人出行助理。

## 🎯 核心能力
1. **智能查票**：查询全国火车票信息（车次、时刻、余票、票价）
2. **出行规划**：根据用户需求推荐最优出行方案
3. **上下文感知**：记住用户位置、偏好，提供个性化服务

## 🧠 智能推断规则

### 出发地推断
- 如果用户没有说明出发地，使用用户当前位置的最近火车站
- 例如：用户在景德镇，说"去广州"，你应该查询"景德镇北 -> 广州南"

### 目的地推断  
- 如果用户只说城市名，智能选择该城市的主要高铁站
- 例如："去广州" -> "广州南"，"去北京" -> "北京西"

### 日期推断
- "今天" = {today}
- "明天" = {tomorrow}  
- "后天" = {day_after_tomorrow}
- "周末" = 最近的周六({weekend})
- "下周X" = 计算具体日期
- 如果用户没指定日期，默认查询最近的合适时间：
  - 现在是 {current_hour} 点，如果现在还早（< 20:00），可以查今天剩余车次
  - 如果太晚了，建议查明天的票

### 时间推断
- "最快" = 最近一班能赶上的车（考虑当前时间 + 1小时提前量）
- "早上" = 06:00-12:00 的车次
- "下午" = 12:00-18:00 的车次
- "晚上" = 18:00-24:00 的车次

## 📍 用户上下文
{user_context}

## ⏰ 当前时间
{current_time}

## 🎨 回复风格
- 使用自然、专业的中文
- 适当使用 emoji 增加亲和力
- 给出具体推荐时说明理由（最快/最便宜/余票多等）
- 如果没有查到数据，诚实告知并给出替代建议

## ⚠️ 重要提醒
1. **最重要**：收到查票请求后立即调用工具查询，不要问任何确认问题！
2. **关键**：如果用户没说出发地但你知道他的位置，直接用他的位置作为出发地
3. **关键**：如果用户没说日期，现在是 {current_hour} 点：
   - 如果 < 18 点，查今天的票
   - 如果 >= 18 点，查明天的票
4. 用户说"去XX"、"到XX"、"XX的票"时，都是在问车票，直接查询！
5. 先行动，后确认。用户可以在你给出结果后再调整需求
6. 不要问"您是打算今天出发还是..."这种问题，直接查！
"""


def get_system_prompt(user_context: Optional[UserContext] = None) -> str:
    """生成带有上下文的系统提示词"""
    today = date.today()
    now = datetime.now()
    
    # 计算周末日期
    days_until_saturday = (5 - today.weekday()) % 7
    if days_until_saturday == 0:
        days_until_saturday = 7
    weekend = today + timedelta(days=days_until_saturday)
    
    # 用户上下文
    if user_context:
        context_str = user_context.get_context_summary()
    else:
        context_str = "用户位置: 未知\n用户偏好: 默认（高铁/动车，二等座）"
    
    weekday_names = ['一', '二', '三', '四', '五', '六', '日']
    current_time_str = f"{now.strftime('%Y年%m月%d日 %H:%M:%S')} (星期{weekday_names[now.weekday()]})"
    
    return SYSTEM_PROMPT.format(
        today=today.strftime("%Y-%m-%d"),
        tomorrow=(today + timedelta(days=1)).strftime("%Y-%m-%d"),
        day_after_tomorrow=(today + timedelta(days=2)).strftime("%Y-%m-%d"),
        weekend=weekend.strftime("%Y-%m-%d"),
        current_time=current_time_str,
        current_hour=now.hour,
        user_context=context_str,
    )


# ==================== 工具定义 ====================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_tickets",
            "description": "查询指定日期两地之间的火车票、车次和时间。当用户询问火车票、车次、时刻表时调用此工具。",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_station": {
                        "type": "string",
                        "description": "出发站名称。如果用户没有指定出发地，使用用户当前位置的最近火车站。如果用户只说城市名，使用该城市的主要高铁站（如'广州'->'广州南'）。",
                    },
                    "to_station": {
                        "type": "string",
                        "description": "到达站名称。如果用户只说城市名，使用该城市的主要高铁站。",
                    },
                    "travel_date": {
                        "type": "string",
                        "description": "出行日期，格式 YYYY-MM-DD。根据用户意图和当前时间推断具体日期。",
                    },
                    "train_type": {
                        "type": "string",
                        "description": "车次类型过滤（可选）：G=高铁, D=动车, C=城际, Z=直达, T=特快, K=快速。不指定则返回所有类型。",
                        "enum": ["G", "D", "C", "Z", "T", "K"],
                    },
                },
                "required": ["from_station", "to_station", "travel_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_location",
            "description": "获取用户当前的位置信息（城市和最近火车站）。当需要确定用户出发地或不确定用户位置时调用。",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "获取当前精确时间，用于判断今天还有哪些车次可以赶上。",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_train_schedule",
            "description": "查询某趟列车的完整时刻表（所有停靠站信息）。当用户想了解某趟车的详细停站信息时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "train_no": {
                        "type": "string",
                        "description": "车次号，如 G1002、D2001",
                    },
                    "run_date": {
                        "type": "string",
                        "description": "运行日期，格式 YYYY-MM-DD",
                    },
                },
                "required": ["train_no", "run_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_fastest_train",
            "description": "查找最快能出发的车次。当用户说'最快'、'最近一班'、'马上走'时调用。会自动考虑当前时间和提前量。",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_station": {
                        "type": "string",
                        "description": "出发站名称",
                    },
                    "to_station": {
                        "type": "string",
                        "description": "到达站名称",
                    },
                    "min_buffer_minutes": {
                        "type": "integer",
                        "description": "最少提前多少分钟到站（默认60分钟）",
                        "default": 60,
                    },
                },
                "required": ["from_station", "to_station"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_user_location",
            "description": "设置或更新用户的位置信息。当用户告知自己在哪里时调用（如'我在景德镇'、'我现在在北京'）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，如'景德镇'、'广州'",
                    },
                    "station": {
                        "type": "string",
                        "description": "具体火车站名称（可选），如'景德镇北'",
                    },
                },
                "required": ["city"],
            },
        },
    },
]


# ==================== 对话记忆 ====================

class ConversationMemory:
    """对话记忆管理"""
    
    def __init__(self, max_history: int = 20):
        self.max_history = max_history
        self.conversations: Dict[str, List[Dict[str, Any]]] = {}
    
    def get_or_create(self, conversation_id: Optional[str] = None) -> tuple[str, List[Dict]]:
        if conversation_id is None:
            conversation_id = str(uuid.uuid4())[:8]
        
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        
        return conversation_id, self.conversations[conversation_id]
    
    def add_message(self, conversation_id: str, role: str, content: str, **kwargs):
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        
        message = {"role": role, "content": content, **kwargs}
        self.conversations[conversation_id].append(message)
        
        if len(self.conversations[conversation_id]) > self.max_history:
            self.conversations[conversation_id] = self.conversations[conversation_id][-self.max_history:]
    
    def add_tool_call(self, conversation_id: str, tool_calls: List[Dict]):
        self.add_message(conversation_id, role="assistant", content=None, tool_calls=tool_calls)
    
    def add_tool_result(self, conversation_id: str, tool_call_id: str, result: str):
        self.add_message(conversation_id, role="tool", content=result, tool_call_id=tool_call_id)
    
    def clear(self, conversation_id: str):
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]


# ==================== AI Agent ====================

class RailMateAgent:
    """
    RailMate AI Agent
    核心对话引擎，支持 Function Calling 和上下文感知
    """
    
    def __init__(self, user_id: str = "default"):
        """初始化 Agent"""
        self.user_id = user_id
        
        # 检查 API Key
        if not settings.openai_api_key or settings.openai_api_key == "sk-your-api-key-here":
            logger.warning("⚠️ OpenAI API Key 未配置，AI 功能将不可用")
            self.client = None
        else:
            self.client = OpenAI(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
            )
        
        self.model = settings.openai_model
        self.memory = ConversationMemory()
        self.train_service = TrainService()
        
        # 用户上下文
        self.user_context = get_user_context(user_id)
        
        # 注册工具函数
        self.tool_functions: Dict[str, Callable] = {
            "search_tickets": self._tool_search_tickets,
            "get_train_schedule": self._tool_get_train_schedule,
            "get_user_location": self._tool_get_user_location,
            "get_current_time": self._tool_get_current_time,
            "find_fastest_train": self._tool_find_fastest_train,
            "set_user_location": self._tool_set_user_location,
        }
        
        logger.info(f"🤖 RailMate Agent 初始化完成 (模型: {self.model}, 用户: {user_id})")
    
    # ==================== 工具函数实现 ====================
    
    def _tool_search_tickets(
        self,
        from_station: str,
        to_station: str,
        travel_date: str,
        train_type: Optional[str] = None,
    ) -> str:
        """工具：查询车票"""
        logger.info(f"🔧 调用工具 search_tickets: {from_station} -> {to_station}, {travel_date}")
        
        result = self.train_service.search_tickets_json(
            from_station=from_station,
            to_station=to_station,
            travel_date=travel_date,
            train_type=train_type,
        )
        
        return result
    
    def _tool_get_train_schedule(self, train_no: str, run_date: str) -> str:
        """工具：查询列车时刻表"""
        logger.info(f"🔧 调用工具 get_train_schedule: {train_no}, {run_date}")
        
        try:
            parsed_date = datetime.strptime(run_date, "%Y-%m-%d").date()
            schedule = self.train_service.get_train_schedule(train_no, parsed_date)
            
            return json.dumps({
                "success": True,
                "train_no": train_no,
                "date": run_date,
                "stops": schedule,
            }, ensure_ascii=False, indent=2)
            
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
    
    def _tool_get_user_location(self) -> str:
        """工具：获取用户位置"""
        logger.info(f"🔧 调用工具 get_user_location")
        
        if self.user_context.location:
            return json.dumps({
                "success": True,
                "city": self.user_context.location.city,
                "station": self.user_context.location.station,
                "message": f"用户当前在{self.user_context.location.city}，最近的火车站是{self.user_context.location.station or '未知'}",
            }, ensure_ascii=False)
        else:
            return json.dumps({
                "success": False,
                "message": "用户位置未知，请询问用户在哪里",
            }, ensure_ascii=False)
    
    def _tool_get_current_time(self) -> str:
        """工具：获取当前时间"""
        logger.info(f"🔧 调用工具 get_current_time")
        
        now = datetime.now()
        today = date.today()
        
        return json.dumps({
            "current_time": now.strftime("%Y-%m-%d %H:%M:%S"),
            "today": today.strftime("%Y-%m-%d"),
            "tomorrow": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
            "weekday": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][now.weekday()],
            "hour": now.hour,
            "minute": now.minute,
            "message": f"现在是{now.strftime('%Y年%m月%d日 %H:%M')}，{'还有足够时间赶今天的车' if now.hour < 20 else '今天的车次可能赶不上了，建议查明天的票'}",
        }, ensure_ascii=False)
    
    def _tool_find_fastest_train(
        self,
        from_station: str,
        to_station: str,
        min_buffer_minutes: int = 60,
    ) -> str:
        """工具：查找最快能出发的车次"""
        logger.info(f"🔧 调用工具 find_fastest_train: {from_station} -> {to_station}")
        
        now = datetime.now()
        earliest_departure = now + timedelta(minutes=min_buffer_minutes)
        
        # 先查今天的
        today = date.today()
        today_results = []
        tomorrow_results = []
        
        try:
            # 查今天的票
            today_tickets = self.train_service.search_tickets(
                from_station=from_station,
                to_station=to_station,
                travel_date=today,
            )
            
            # 过滤出今天还能赶上的
            for ticket in today_tickets:
                try:
                    dep_time = datetime.strptime(f"{today} {ticket.departure_time}", "%Y-%m-%d %H:%M")
                    if dep_time >= earliest_departure:
                        remaining = ticket.remaining_tickets or 0
                        if remaining > 0:
                            today_results.append({
                                **ticket.model_dump(),
                                "date": str(today),
                                "can_catch": True,
                                "time_until_departure": int((dep_time - now).total_seconds() / 60),
                            })
                except:
                    pass
            
            # 如果今天没有合适的，查明天的
            if not today_results:
                tomorrow = today + timedelta(days=1)
                tomorrow_tickets = self.train_service.search_tickets(
                    from_station=from_station,
                    to_station=to_station,
                    travel_date=tomorrow,
                )
                for ticket in tomorrow_tickets[:5]:
                    remaining = ticket.remaining_tickets or 0
                    if remaining > 0:
                        tomorrow_results.append({
                            **ticket.model_dump(),
                            "date": str(tomorrow),
                            "can_catch": True,
                        })
            
            if today_results:
                # 按出发时间排序，取最早的5趟
                today_results.sort(key=lambda x: x["departure_time"])
                return json.dumps({
                    "success": True,
                    "message": f"今天还有 {len(today_results)} 趟车可以赶上",
                    "current_time": now.strftime("%H:%M"),
                    "earliest_catchable": earliest_departure.strftime("%H:%M"),
                    "trains": today_results[:5],
                }, ensure_ascii=False, indent=2)
            elif tomorrow_results:
                return json.dumps({
                    "success": True,
                    "message": f"今天的车已经赶不上了，明天最早的车次如下",
                    "trains": tomorrow_results[:5],
                }, ensure_ascii=False, indent=2)
            else:
                return json.dumps({
                    "success": False,
                    "message": "暂时没有找到有余票的车次",
                }, ensure_ascii=False)
                
        except Exception as e:
            logger.error(f"查找最快车次失败: {e}")
            return json.dumps({"success": False, "error": str(e)}, ensure_ascii=False)
    
    def _tool_set_user_location(self, city: str, station: Optional[str] = None) -> str:
        """工具：设置用户位置"""
        logger.info(f"🔧 调用工具 set_user_location: {city}, {station}")
        
        self.user_context.set_location(city=city, station=station)
        
        return json.dumps({
            "success": True,
            "city": self.user_context.location.city,
            "station": self.user_context.location.station,
            "message": f"已记住您的位置：{self.user_context.location.city}，最近火车站：{self.user_context.location.station or '未知'}",
        }, ensure_ascii=False)
    
    # ==================== 对话接口 ====================
    
    def _execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """执行工具调用"""
        if tool_name not in self.tool_functions:
            return json.dumps({"error": f"未知工具: {tool_name}"})
        
        try:
            func = self.tool_functions[tool_name]
            result = func(**arguments)
            return result
        except Exception as e:
            logger.error(f"工具执行失败: {e}")
            return json.dumps({"error": str(e)})
    
    def chat(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        stream: bool = False,
    ) -> ChatResponse:
        """
        与 Agent 对话
        """
        if not self.client:
            raise AIAgentError("OpenAI API Key 未配置")
        
        # 获取或创建对话
        conv_id, history = self.memory.get_or_create(conversation_id)
        
        # 构建消息列表（包含上下文感知的 System Prompt）
        messages = [{"role": "system", "content": get_system_prompt(self.user_context)}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})
        
        # 记录用户消息
        self.memory.add_message(conv_id, "user", message)
        
        tool_calls_made: List[ToolCall] = []
        
        try:
            # 调用 LLM
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.7,
            )
            
            assistant_message = response.choices[0].message
            
            # 处理工具调用（可能多轮）
            while assistant_message.tool_calls:
                logger.info(f"🔧 AI 请求调用 {len(assistant_message.tool_calls)} 个工具")
                
                tool_calls_data = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        }
                    }
                    for tc in assistant_message.tool_calls
                ]
                self.memory.add_tool_call(conv_id, tool_calls_data)
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": tool_calls_data,
                })
                
                # 执行每个工具调用
                for tool_call in assistant_message.tool_calls:
                    func_name = tool_call.function.name
                    try:
                        func_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        func_args = {}
                    
                    logger.info(f"  - {func_name}: {func_args}")
                    
                    result = self._execute_tool(func_name, func_args)
                    
                    tool_calls_made.append(ToolCall(
                        tool_name=func_name,
                        arguments=func_args if isinstance(func_args, dict) else {"raw": str(func_args)},
                        result=result[:500] if len(result) > 500 else result,
                    ))
                    
                    self.memory.add_tool_result(conv_id, tool_call.id, result)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result,
                    })
                
                # 再次调用 LLM
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=TOOLS,
                    tool_choice="auto",
                    temperature=0.7,
                )
                
                assistant_message = response.choices[0].message
            
            # 获取最终回复
            final_answer = assistant_message.content or "抱歉，我无法生成回复。"
            
            self.memory.add_message(conv_id, "assistant", final_answer)
            
            logger.info(f"✅ 对话完成 (conv_id: {conv_id})")
            
            return ChatResponse(
                answer=final_answer,
                conversation_id=conv_id,
                tool_calls=tool_calls_made,
            )
            
        except Exception as e:
            logger.error(f"❌ 对话失败: {e}")
            raise AIAgentError(f"对话处理失败: {str(e)}")
    
    def set_location(self, city: str, station: Optional[str] = None):
        """直接设置用户位置（API 调用）"""
        self.user_context.set_location(city=city, station=station)
    
    def get_location(self) -> Optional[dict]:
        """获取用户位置"""
        if self.user_context.location:
            return self.user_context.location.to_dict()
        return None
    
    def clear_conversation(self, conversation_id: str):
        """清除对话历史"""
        self.memory.clear(conversation_id)
        logger.info(f"🗑️ 已清除对话历史: {conversation_id}")
    
    def get_last_prompt(self, conversation_id: str) -> Optional[List[Dict]]:
        """获取最后一次对话的完整 Prompt"""
        if conversation_id not in self.memory.conversations:
            return None
        
        messages = [{"role": "system", "content": get_system_prompt(self.user_context)}]
        messages.extend(self.memory.conversations[conversation_id])
        return messages


# ==================== 全局实例 ====================

_agents: Dict[str, RailMateAgent] = {}


def get_agent(user_id: str = "default") -> RailMateAgent:
    """获取 Agent 单例（按用户隔离）"""
    if user_id not in _agents:
        _agents[user_id] = RailMateAgent(user_id)
    return _agents[user_id]
