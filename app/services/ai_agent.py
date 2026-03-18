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
from time import perf_counter
from datetime import date, datetime, time, timedelta
from typing import Any, Callable, Dict, List, Optional

from openai import APITimeoutError, OpenAI

from app.core.config import settings
from app.core.exceptions import AIAgentError
from app.core.logger import logger
from app.schemas.chat import ChatResponse, ToolCall
from app.services.train_service import TrainService
from app.services.user_context import UserContext, get_user_context


# ==================== System Prompt（优化版v2：智能中转）====================

SYSTEM_PROMPT = """你是RailMate智轨伴行，中国铁路出行AI助手。

## 核心规则
1. 收到查票请求立即调用 search_tickets，不问确认问题
2. 用户没说出发地时，用其位置作为出发地
3. 城市名自动转主要高铁站（广州→广州南，北京→北京西，长沙→长沙南，武汉→武汉站，南昌→南昌西，郑州→郑州东，杭州→杭州东，南京→南京南，西安→西安北，成都→成都东，合肥→合肥南）
4. 日期推断：今天={today}，明天={tomorrow}，后天={day_after_tomorrow}
5. 没指定日期时：{current_hour}点前18点查今天，否则查明天
6. **不要传 train_type 参数**，除非用户明确说只要高铁/动车等。不过滤能展示更多选择

## 空结果处理（极其重要！必须严格执行！）
- 查询返回"当日无车次"或0条结果时：**必须立即调用工具查第二天的票**，拿到结果后再回复
- 中转方案返回0个结果时：**必须立即用第二天日期再调用 search_transfer_tickets**
- 如果两天都没有结果，给出具体替代建议（换车站、分段购票、附近城市等）
- **绝对禁止说"我将为您查询XX"或"建议您查询XX"然后结束对话。要查就立刻调用工具查，查到结果再回复用户**
- **工具返回 station_not_found 错误时**：站名在12306不存在，绝对不要换日期重试（问题不在日期）。应该：
  1. 告知用户该站名无法识别
  2. 如果是自动定位导致的（如定位到国外城市），建议用户在设置页手动设置中国城市
  3. 直接询问用户实际要从哪个中国城市出发

## 直达优先原则
- **默认只查直达**：使用 search_tickets 查询，展示结果
- **只在以下情况调用 search_transfer_tickets**：
  1. 用户明确说了"中转""转车""换乘"
  2. 用户问"怎么去XX"且 search_tickets 返回 0 趟直达车次
- **绝对不要在有直达车次时主动推荐中转方案**

## 当前规划模式
{planning_mode_rules}

## 时间映射
- 最快=最近能赶上的车（+1h提前量）
- 早上=06-12点，下午=12-18点，晚上=18-24点

## 用户上下文
{user_context}
（推荐时请结合用户偏好：更倾向快速/省钱、更期待风景运转/更快到达等。）

## 当前时间
{current_time}

## 回复风格
简洁专业，适当用emoji，给推荐时说明理由。先行动后确认。
**铁律：你的每一句话都必须有依据。如果你说"我来帮你查"，就必须紧接着调用工具。如果工具返回了hint字段，必须按hint的指示继续调用工具，不能忽略。**"""


def get_system_prompt(
    user_context: Optional[UserContext] = None,
    planning_mode: str = "efficient",
) -> str:
    """生成带有上下文的系统提示词（优化版）"""
    today = date.today()
    now = datetime.now()
    
    # 用户上下文（含位置与用户偏好，用于影响推荐）
    if user_context:
        context_str = user_context.get_context_summary()
    else:
        context_str = "位置:未知"
    
    weekday_names = ['一', '二', '三', '四', '五', '六', '日']
    current_time_str = f"{now.strftime('%m/%d %H:%M')} 周{weekday_names[now.weekday()]}"

    planning_rules_map = {
        "efficient": (
            "当前为【高效赶路】模式：优先直达；如必须中转，最多按1次中转来规划。"
            "应重点比较更快到达 / 更省钱 / 时间价格均衡。"
        ),
        "rail_experience": (
            "当前为【铁路运转】模式：用户更重视乘车体验、线路丰富度、列车运行过程。"
            "可主动考虑1到2次中转，不必一味最短时长。若有多段铁路运行体验更丰富的方案，可优先展示原因。"
        ),
        "stopover_explore": (
            "当前为【沿途游玩】模式：用户接受在中转城市停留、分段旅行。"
            "可主动考虑1到2次中转，并在回复中把『铁路行程段』与『沿途城市停留建议』分开说清楚。若用户提到想顺路去某城市，优先围绕该城市规划。"
        ),
    }
    
    return SYSTEM_PROMPT.format(
        today=today.strftime("%Y-%m-%d"),
        tomorrow=(today + timedelta(days=1)).strftime("%Y-%m-%d"),
        day_after_tomorrow=(today + timedelta(days=2)).strftime("%Y-%m-%d"),
        current_time=current_time_str,
        current_hour=now.hour,
        user_context=context_str,
        planning_mode_rules=planning_rules_map.get(planning_mode, planning_rules_map["efficient"]),
    )


# ==================== 工具定义（优化版：更精简的描述） ====================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_tickets",
            "description": "查询直达火车票。用户问票/车次时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_station": {
                        "type": "string",
                        "description": "出发站（城市名自动转高铁站）",
                    },
                    "to_station": {
                        "type": "string",
                        "description": "到达站",
                    },
                    "travel_date": {
                        "type": "string",
                        "description": "日期 YYYY-MM-DD",
                    },
                    "train_type": {
                        "type": "string",
                        "description": "车型过滤，多个用逗号分隔（如 G,D）。不传则不过滤",
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
            "description": "获取用户位置。需确定出发地时调用。",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "获取当前时间。判断能赶上哪些车时调用。",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_train_schedule",
            "description": "查询某车次时刻表（所有停靠站）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "train_no": {"type": "string", "description": "车次号如G1002"},
                    "run_date": {"type": "string", "description": "日期YYYY-MM-DD"},
                },
                "required": ["train_no", "run_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_fastest_train",
            "description": "找最快能出发的车。用户说'最快/最近一班/马上走'时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_station": {"type": "string", "description": "出发站"},
                    "to_station": {"type": "string", "description": "到达站"},
                    "min_buffer_minutes": {
                        "type": "integer",
                        "description": "提前量（分钟），默认15",
                        "default": 15,
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
            "description": "设置用户位置。用户说'我在XX'时调用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名"},
                    "station": {"type": "string", "description": "站名（可选）"},
                },
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_transfer_tickets",
            "description": "查询中转方案。高效赶路模式最多1次中转；铁路运转/沿途游玩模式可查到2次中转。",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_station": {"type": "string", "description": "出发站"},
                    "to_station": {"type": "string", "description": "到达站"},
                    "travel_date": {"type": "string", "description": "日期 YYYY-MM-DD"},
                    "max_transfers": {
                        "type": "integer",
                        "description": "最大中转次数。高效赶路建议1；体验/沿途游玩可用2",
                        "default": 1,
                    },
                    "preferred_via": {
                        "type": "string",
                        "description": "希望优先经过的中转城市/车站，如桂林、长沙南",
                    },
                },
                "required": ["from_station", "to_station", "travel_date"],
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
                timeout=settings.openai_timeout_seconds,
                max_retries=settings.openai_max_retries,
            )
        
        self.model = settings.openai_model
        self.memory = ConversationMemory()
        self.train_service = TrainService()
        
        # 用户上下文
        self.user_context = get_user_context(user_id)
        self._active_planning_mode = "efficient"
        
        # 注册工具函数
        self.tool_functions: Dict[str, Callable] = {
            "search_tickets": self._tool_search_tickets,
            "get_train_schedule": self._tool_get_train_schedule,
            "get_user_location": self._tool_get_user_location,
            "get_current_time": self._tool_get_current_time,
            "find_fastest_train": self._tool_find_fastest_train,
            "set_user_location": self._tool_set_user_location,
            "search_transfer_tickets": self._tool_search_transfer_tickets,
        }
        
        logger.info(f"🤖 RailMate Agent 初始化完成 (模型: {self.model}, 用户: {user_id})")

    def _create_completion(self, messages: List[Dict[str, Any]]):
        """统一封装 LLM 调用，便于控制超时与日志。"""
        start = perf_counter()
        logger.info(
            f"🧠 调用 LLM: model={self.model}, timeout={settings.openai_timeout_seconds}s, "
            f"messages={len(messages)}"
        )
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.7,
                timeout=settings.openai_timeout_seconds,
            )
            elapsed = perf_counter() - start
            logger.info(f"🧠 LLM 返回成功: {elapsed:.2f}s")
            return response
        except APITimeoutError as exc:
            elapsed = perf_counter() - start
            logger.error(
                f"🧠 LLM 调用超时: {elapsed:.2f}s "
                f"(timeout={settings.openai_timeout_seconds}s, model={self.model})"
            )
            raise AIAgentError(
                f"LLM 调用超时（{elapsed:.1f}s）。当前后端超时配置为 {settings.openai_timeout_seconds:.0f}s，"
                "可在 .env 中调大 OPENAI_TIMEOUT_SECONDS。"
            ) from exc
    
    # ==================== 工具函数实现 ====================
    
    def _tool_search_tickets(
        self,
        from_station: str,
        to_station: str,
        travel_date: str,
        train_type: Optional[str] = None,
    ) -> str:
        """工具：查询车票（站名验证+智能提示）"""
        logger.info(f"🔧 调用工具 search_tickets: {from_station} -> {to_station}, {travel_date}")
        
        err = self._validate_stations(from_station=from_station, to_station=to_station)
        if err:
            return err
        
        result_str = self.train_service.search_tickets_json(
            from_station=from_station,
            to_station=to_station,
            travel_date=travel_date,
            train_type=train_type,
        )
        
        try:
            result = json.loads(result_str)
            count = result.get("count", 0)
            
            if result.get("success"):
                if count == 0:
                    try:
                        travel_dt = datetime.strptime(travel_date, "%Y-%m-%d").date()
                        tomorrow = travel_dt + timedelta(days=1)
                        result["hint"] = f"当日无直达车次。建议查询{tomorrow}的票。如用户需要也可调用search_transfer_tickets查中转"
                    except:
                        result["hint"] = "当日无直达车次，建议查第二天"
                
                return json.dumps(result, ensure_ascii=False)
        except:
            pass
        
        return result_str
    
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
        min_buffer_minutes: int = 15,
    ) -> str:
        """工具：查找最快能出发的车次（站名验证+15分钟提前量）"""
        logger.info(f"🔧 调用工具 find_fastest_train: {from_station} -> {to_station}")
        
        err = self._validate_stations(from_station=from_station, to_station=to_station)
        if err:
            return err
        
        now = datetime.now()
        earliest_departure = now + timedelta(minutes=min_buffer_minutes)
        
        today = date.today()
        tomorrow = today + timedelta(days=1)
        today_results = []
        tomorrow_results = []
        
        # 1. 查今天的票
        try:
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
                        # 放宽条件：即使余票显示0也列出（可能是数据延迟）
                        today_results.append({
                            **ticket.model_dump(),
                            "date": str(today),
                            "can_catch": True,
                            "time_until_departure": int((dep_time - now).total_seconds() / 60),
                        })
                except:
                    pass
        except Exception as e:
            logger.warning(f"查询今天车次失败: {e}")
        
        # 2. 总是查明天的票（不管今天有没有结果，提供更多选择）
        try:
            tomorrow_tickets = self.train_service.search_tickets(
                from_station=from_station,
                to_station=to_station,
                travel_date=tomorrow,
            )
            for ticket in tomorrow_tickets[:8]:  # 明天取前8趟
                tomorrow_results.append({
                    **ticket.model_dump(),
                    "date": str(tomorrow),
                })
        except Exception as e:
            logger.warning(f"查询明天车次失败: {e}")
        
        # 3. 构建响应
        if today_results:
            today_results.sort(key=lambda x: x["departure_time"])
            return json.dumps({
                "success": True,
                "message": f"今天还有 {len(today_results)} 趟车可以赶上（{earliest_departure.strftime('%H:%M')}之后发车）",
                "current_time": now.strftime("%H:%M"),
                "today_trains": today_results[:5],
                "tomorrow_trains": tomorrow_results[:3] if tomorrow_results else [],
                "hint": "如已过末班车时间，明天早班车也已列出" if tomorrow_results else None,
            }, ensure_ascii=False)
        elif tomorrow_results:
            return json.dumps({
                "success": True,
                "message": f"今天已无合适车次，推荐明天({tomorrow})的早班车",
                "current_time": now.strftime("%H:%M"),
                "today_trains": [],
                "tomorrow_trains": tomorrow_results[:5],
            }, ensure_ascii=False)
        else:
            # 两天都没查到
            return json.dumps({
                "success": False,
                "message": f"今明两天暂未查到{from_station}→{to_station}的直达车次。建议：1)检查站名是否正确 2)考虑中转方案（如经南昌、长沙、武汉等枢纽）",
                "hint": "可分段查票组合中转方案",
            }, ensure_ascii=False)
    
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
    
    def _tool_search_transfer_tickets(
        self,
        from_station: str,
        to_station: str,
        travel_date: str,
        max_transfers: int = 1,
        preferred_via: Optional[str] = None,
    ) -> str:
        """工具：查询中转方案（站名验证+智能提示+限制日期循环）"""
        logger.info(
            f"🔧 调用工具 search_transfer_tickets: {from_station} → {to_station}, "
            f"{travel_date}, max_transfers={max_transfers}, preferred_via={preferred_via}"
        )
        
        err = self._validate_stations(from_station=from_station, to_station=to_station)
        if err:
            return err

        if preferred_via:
            via_err = self._validate_stations(via=preferred_via)
            if via_err:
                return via_err

        if self._active_planning_mode in ("rail_experience", "stopover_explore"):
            max_transfers = max(max_transfers, 2)
        else:
            max_transfers = min(max_transfers, 1)
        
        result_str = self.train_service.search_transfer_tickets_json(
            from_station=from_station,
            to_station=to_station,
            travel_date=travel_date,
            max_transfers=max_transfers,
            preferred_via=preferred_via,
        )
        
        try:
            result = json.loads(result_str)
            plans = result.get("plans", [])
            if result.get("ok") and len(plans) == 0:
                travel_dt = datetime.strptime(travel_date, "%Y-%m-%d").date()
                days_ahead = (travel_dt - date.today()).days
                
                if days_ahead <= 1:
                    tomorrow = travel_dt + timedelta(days=1)
                    result["hint"] = (
                        f"当日无合适中转方案。立即调用 search_transfer_tickets 查询 {tomorrow} "
                        f"的中转方案。"
                    )
                else:
                    result["hint"] = (
                        "已查询多天仍无中转方案。不要再换日期重试。请直接告诉用户当前没有找到合适的中转路线，"
                        "并给出建议：1)尝试从其他城市/车站出发 2)考虑飞机/大巴等替代交通 3)分段查看各段是否有车次。"
                    )
                return json.dumps(result, ensure_ascii=False)
        except Exception:
            pass
        
        return result_str
    
    # ==================== 工具辅助方法 ====================
    
    def _validate_stations(self, **stations) -> Optional[str]:
        """验证站名是否为有效的中国火车站，无效时立即返回错误JSON（避免无效查询浪费大量时间）"""
        from app.services.railway_api import get_railway_api
        api = get_railway_api()
        invalid = []
        for name in stations.values():
            if name and not api.get_station_code(name):
                invalid.append(f"'{name}'")
        if invalid:
            return json.dumps({
                "success": False,
                "error": "station_not_found",
                "msg": f"以下站名在中国铁路12306系统中不存在: {', '.join(invalid)}",
                "hint": (
                    "站名无法识别。可能原因：1)自动定位到了国外城市 2)站名输入有误。"
                    "请告知用户该站名无效，并询问用户实际要从哪个中国城市出发/到达。"
                    "不要换日期重试，问题不在日期而在站名。"
                ),
            }, ensure_ascii=False)
        return None
    
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

    @staticmethod
    def _report_progress(
        on_progress: Optional[Callable[[Dict[str, Any]], None]],
        *,
        status: str,
        percent: int,
        message: str,
        detail: Optional[str] = None,
    ) -> None:
        if not on_progress:
            return
        on_progress(
            {
                "status": status,
                "percent": max(0, min(100, percent)),
                "message": message,
                "detail": detail,
            }
        )
    
    def chat(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        stream: bool = False,
        planning_mode: str = "efficient",
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> ChatResponse:
        """
        与 Agent 对话
        """
        if not self.client:
            raise AIAgentError("OpenAI API Key 未配置")
        
        # 获取或创建对话
        conv_id, history = self.memory.get_or_create(conversation_id)
        
        # 构建消息列表（包含上下文感知的 System Prompt）
        self._active_planning_mode = planning_mode or "efficient"

        messages = [{"role": "system", "content": get_system_prompt(self.user_context, self._active_planning_mode)}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})
        
        # 记录用户消息
        self.memory.add_message(conv_id, "user", message)

        self._report_progress(
            on_progress,
            status="running",
            percent=8,
            message="正在理解你的需求",
            detail="已构建上下文与历史消息",
        )
        
        tool_calls_made: List[ToolCall] = []
        max_tool_rounds = 8
        
        try:
            # 调用 LLM
            self._report_progress(
                on_progress,
                status="running",
                percent=12,
                message="正在等待模型规划",
                detail=f"模型 {self.model} 正在决定是否调用工具",
            )
            response = self._create_completion(messages)
            
            assistant_message = response.choices[0].message
            self._report_progress(
                on_progress,
                status="running",
                percent=20,
                message="已完成需求分析",
                detail="正在决定是否调用查票/中转工具",
            )
            
            # 处理工具调用（可能多轮，设上限防止无限循环）
            tool_round = 0
            while assistant_message.tool_calls and tool_round < max_tool_rounds:
                tool_round += 1
                logger.info(f"🔧 AI 请求调用 {len(assistant_message.tool_calls)} 个工具")
                self._report_progress(
                    on_progress,
                    status="running",
                    percent=min(80, 20 + tool_round * 8),
                    message=f"正在执行第 {tool_round} 轮查询",
                    detail="AI 已决定调用铁路工具",
                )
                
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
                tool_count = len(assistant_message.tool_calls)
                for tool_index, tool_call in enumerate(assistant_message.tool_calls, start=1):
                    func_name = tool_call.function.name
                    try:
                        func_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        func_args = {}
                    
                    logger.info(f"  - {func_name}: {func_args}")
                    self._report_progress(
                        on_progress,
                        status="running",
                        percent=min(86, 24 + tool_round * 12 + tool_index * max(4, 16 // max(tool_count, 1))),
                        message=f"正在执行工具：{func_name}",
                        detail=json.dumps(func_args, ensure_ascii=False)[:160] if func_args else "无额外参数",
                    )
                    
                    result = self._execute_tool(func_name, func_args)
                    
                    tool_calls_made.append(ToolCall(
                        tool_name=func_name,
                        arguments=func_args if isinstance(func_args, dict) else {"raw": str(func_args)},
                        result=result[:20000] if len(result) > 20000 else result,
                    ))
                    
                    self.memory.add_tool_result(conv_id, tool_call.id, result)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result,
                    })
                    self._report_progress(
                        on_progress,
                        status="running",
                        percent=min(90, 30 + tool_round * 12 + tool_index * max(5, 20 // max(tool_count, 1))),
                        message=f"已拿到 {func_name} 结果",
                        detail="正在整理工具结果",
                    )
                
                # 再次调用 LLM
                self._report_progress(
                    on_progress,
                    status="running",
                    percent=min(92, 40 + tool_round * 10),
                    message="正在整合查询结果",
                    detail="AI 正在读取工具返回内容并继续推理",
                )
                response = self._create_completion(messages)
                
                assistant_message = response.choices[0].message
            
            # 获取最终回复
            self._report_progress(
                on_progress,
                status="running",
                percent=95,
                message="正在生成最终回复",
                detail="准备输出推荐与说明",
            )
            final_answer = assistant_message.content or "抱歉，我无法生成回复。"
            
            self.memory.add_message(conv_id, "assistant", final_answer)
            
            logger.info(f"✅ 对话完成 (conv_id: {conv_id})")
            
            return ChatResponse(
                answer=final_answer,
                conversation_id=conv_id,
                tool_calls=tool_calls_made,
            )
            
        except AIAgentError:
            raise
        except Exception as e:
            logger.error(f"❌ 对话失败: {e}")
            raise AIAgentError(f"对话处理失败: {str(e)}")
        finally:
            self._active_planning_mode = "efficient"
    
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
