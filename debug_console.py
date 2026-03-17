#!/usr/bin/env python3
"""
RailMate 开发者调试控制台
在终端中与 AI Agent 直接对话，查看工具调用过程

特性：
- 支持设置用户位置
- 实时显示工具调用
- 多轮对话记忆
- 丰富的调试命令
"""

import sys
from datetime import date, timedelta

# 尝试导入 readline 以改善终端输入体验（支持方向键、删除键等）
try:
    import readline
    # 启用历史记录
    readline.set_history_length(1000)
    # 设置编辑模式为 emacs（更好的兼容性）
    readline.parse_and_bind("set editing-mode emacs")
    # 启用自动补全（可选）
    readline.parse_and_bind("tab: complete")
except ImportError:
    # Windows 系统可能没有 readline，使用 pyreadline 或忽略
    try:
        import pyreadline3 as readline
        readline.set_history_length(1000)
    except ImportError:
        readline = None

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table
from rich.theme import Theme
from rich.prompt import Prompt

# 自定义主题
custom_theme = Theme({
    "info": "cyan",
    "warning": "yellow",
    "error": "red bold",
    "success": "green",
    "tool": "magenta",
    "location": "blue",
})

console = Console(theme=custom_theme)


def print_banner():
    """打印欢迎横幅"""
    banner = """
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   🚄  [bold cyan]RailMate 智轨伴行[/bold cyan] - 开发者调试控制台                        ║
║                                                                       ║
║   [dim]与 AI 助手直接对话，实时查看工具调用过程[/dim]                          ║
║   [dim]支持位置感知、智能推断，体验最聪明的查票 AI[/dim]                       ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
    """
    console.print(banner)


def print_help():
    """打印帮助信息"""
    help_text = """
## 📍 位置命令

| 命令 | 说明 |
|------|------|
| `/location <城市> [车站]` | 手动设置位置（如 `/location 景德镇`） |
| `/autolocate` | 重新自动定位（通过 IP） |
| `/where` | 查看当前位置 |
| `/time` | 查看当前时间 |
| `/preferences` | 查看或重新设置用户偏好（快速/省钱、风景/更快到达） |

## 🔧 调试命令

| 命令 | 说明 |
|------|------|
| `/sync` | 手动触发数据同步 |
| `/stations` | 列出所有车站 |
| `/trains <日期>` | 列出指定日期车次 |
| `/debug` | 查看最后一次完整 Prompt |
| `/clear` | 清除对话历史 |
| `/new` | 开始新对话 |
| `/quit` | 退出 |

## 💬 对话示例

位置设置后，可以这样对话：
- **"去广州的票"** → 自动使用你的位置作为出发地
- **"最快到北京"** → 查询当前时间后最快能赶上的车
- **"明天去长沙的高铁"** → 智能筛选高铁车次
- **"有没有下午3点左右的？"** → 多轮对话，继续筛选

## 🚀 快速开始

程序启动时会自动通过 IP 定位。如果定位不准确：
```
/location 景德镇
```
然后直接说："去广州的票"
    """
    console.print(Markdown(help_text))


def print_tool_calls(tool_calls):
    """打印工具调用信息"""
    if not tool_calls:
        return
    
    console.print("\n[tool]🔧 工具调用记录:[/tool]")
    
    for tc in tool_calls:
        table = Table(show_header=False, box=None, padding=(0, 2))
        table.add_column("Key", style="dim")
        table.add_column("Value")
        
        table.add_row("工具", tc.tool_name)
        table.add_row("参数", str(tc.arguments))
        
        result_preview = tc.result
        if result_preview and len(result_preview) > 200:
            result_preview = result_preview[:200] + "..."
        table.add_row("结果", result_preview or "无")
        
        console.print(Panel(table, border_style="magenta", title=f"📞 {tc.tool_name}"))


def cmd_sync():
    """执行数据同步"""
    from app.services.data_sync import DataSyncService
    
    console.print("[info]🔄 开始数据同步...[/info]")
    
    service = DataSyncService()
    try:
        stats = service.sync_common_routes(days_ahead=3)
        console.print(f"[success]✅ 同步完成![/success]")
        console.print(f"   车站: {stats['stations']} 个")
        console.print(f"   车次: {stats['trains']} 趟")
    finally:
        service.close()


def cmd_stations():
    """列出所有车站"""
    from app.services.train_service import TrainService
    
    service = TrainService()
    try:
        stations = service.list_stations()
        
        table = Table(title="🚉 车站列表")
        table.add_column("代码", style="cyan")
        table.add_column("名称", style="green")
        table.add_column("城市")
        table.add_column("枢纽", justify="center")
        
        for s in stations[:30]:
            table.add_row(s.code, s.name, s.city_name, "✓" if s.is_hub else "")
        
        if len(stations) > 30:
            console.print(f"[dim]（仅显示前 30 个，共 {len(stations)} 个）[/dim]")
        
        console.print(table)
    finally:
        service.close()


def cmd_trains(date_str: str = None):
    """列出指定日期的车次"""
    from app.services.train_service import TrainService
    from sqlmodel import select
    from app.models import Train
    from datetime import datetime
    
    if date_str:
        try:
            query_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            console.print("[error]日期格式错误，请使用 YYYY-MM-DD[/error]")
            return
    else:
        query_date = date.today()
    
    service = TrainService()
    try:
        trains = service.session.exec(
            select(Train).where(Train.run_date == query_date)
        ).all()
        
        table = Table(title=f"🚄 {query_date} 的车次")
        table.add_column("车次", style="cyan")
        table.add_column("类型")
        table.add_column("始发站")
        table.add_column("终点站")
        
        for t in trains[:20]:
            table.add_row(t.train_no, t.train_type, t.origin_station_code, t.terminal_station_code)
        
        if len(trains) > 20:
            console.print(f"[dim]（仅显示前 20 条，共 {len(trains)} 条）[/dim]")
        
        console.print(table)
    finally:
        service.close()


def cmd_location(agent, args: str):
    """设置用户位置"""
    parts = args.split(maxsplit=1)
    if not parts:
        console.print("[error]请指定城市名称，如：/location 景德镇[/error]")
        return
    
    city = parts[0]
    station = parts[1] if len(parts) > 1 else None
    
    agent.set_location(city=city, station=station)
    
    loc = agent.user_context.location
    console.print(Panel(
        f"📍 城市: [bold]{loc.city}[/bold]\n"
        f"🚉 车站: [bold]{loc.station or '自动推断'}[/bold]",
        title="位置已更新",
        border_style="blue",
    ))


def cmd_where(agent):
    """显示当前位置"""
    loc = agent.user_context.location
    if loc:
        console.print(Panel(
            f"📍 城市: [bold]{loc.city}[/bold]\n"
            f"🚉 车站: [bold]{loc.station or '未知'}[/bold]\n"
            f"🕐 更新: {loc.updated_at.strftime('%Y-%m-%d %H:%M') if loc.updated_at else '未知'}",
            title="当前位置",
            border_style="blue",
        ))
    else:
        console.print("[warning]位置未设置，使用 /location <城市> 设置[/warning]")


def cmd_time():
    """显示当前时间"""
    from datetime import datetime
    now = datetime.now()
    today = date.today()
    tomorrow = today + timedelta(days=1)
    
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    
    console.print(Panel(
        f"🕐 当前时间: [bold]{now.strftime('%Y-%m-%d %H:%M:%S')}[/bold]\n"
        f"📅 今天: {today} ({weekdays[today.weekday()]})\n"
        f"📅 明天: {tomorrow} ({weekdays[tomorrow.weekday()]})",
        title="时间信息",
        border_style="cyan",
    ))


def cmd_debug(agent, conversation_id: str):
    """查看最后一次完整 Prompt"""
    messages = agent.get_last_prompt(conversation_id)
    
    if not messages:
        console.print("[warning]当前对话无历史记录[/warning]")
        return
    
    console.print("\n[info]📜 完整对话历史:[/info]\n")
    
    for i, msg in enumerate(messages):
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        
        if role == "system":
            console.print(Panel(
                content[:800] + "..." if len(content) > 800 else content,
                title="🤖 System Prompt",
                border_style="blue",
            ))
        elif role == "user":
            console.print(f"[bold green]👤 用户:[/bold green] {content}")
        elif role == "assistant":
            if content:
                console.print(f"[bold cyan]🤖 助手:[/bold cyan] {content[:200]}...")
            if msg.get("tool_calls"):
                console.print(f"[tool]   (调用了 {len(msg['tool_calls'])} 个工具)[/tool]")
        elif role == "tool":
            tool_id = msg.get("tool_call_id", "?")
            console.print(f"[dim]   🔧 工具结果 ({tool_id[:8]}...): {content[:100]}...[/dim]")


def auto_detect_location(agent):
    """自动检测用户位置"""
    from app.services.geo_service import auto_detect_location as detect
    
    console.print("[info]📍 正在自动获取您的位置...[/info]")
    
    try:
        location = detect()
        
        if location and location.city:
            # 检查是否为中国城市
            is_china = location.country in ("中国", "China", "CN") or location.city in agent.user_context.CITY_STATION_MAP
            
            if is_china:
                # 设置到 Agent
                agent.set_location(
                    city=location.city,
                    station=location.station,
                )
                
                console.print(Panel(
                    f"🌍 IP 地址: [cyan]{location.ip or '未知'}[/cyan]\n"
                    f"📍 检测城市: [bold green]{location.city}[/bold green]\n"
                    f"🏢 省份: {location.province or '未知'}\n"
                    f"🚉 推荐车站: [bold yellow]{location.station or '未知'}[/bold yellow]",
                    title="✅ 自动定位成功",
                    border_style="green",
                ))
                return True
            else:
                # 非中国城市，提示手动设置
                console.print(Panel(
                    f"🌍 检测到您的 IP 位于: [cyan]{location.city}, {location.country}[/cyan]\n\n"
                    f"📍 请使用 [bold yellow]/location <城市>[/bold yellow] 设置您在国内的位置\n"
                    f"   例如: /location 景德镇\n"
                    f"   或者: /location 广州 广州南",
                    title="⚠️ 需要手动设置位置",
                    border_style="yellow",
                ))
                return False
        else:
            console.print("[warning]⚠️ 自动定位失败，请手动设置位置: /location <城市>[/warning]")
            return False
            
    except Exception as e:
        console.print(f"[warning]⚠️ 自动定位失败: {e}[/warning]")
        console.print("[dim]   请手动设置位置: /location <城市>[/dim]")
        return False


def _user_preferences_need_init() -> bool:
    """判断是否需要首次引导用户设置偏好（env 与本地文件均未设置时返回 True）。"""
    try:
        from app.core.config import settings
        if settings.railmate_prefer_speed_or_budget and settings.railmate_prefer_scenery_or_arrival:
            return False
    except Exception:
        pass
    from pathlib import Path
    from app.services.user_context import PREFERENCES_FILENAME
    path = Path.cwd() / PREFERENCES_FILENAME
    if path.exists():
        try:
            import json
            data = json.loads(path.read_text(encoding="utf-8"))
            if data.get("prefer_speed_vs_budget") and data.get("prefer_scenery_vs_arrival"):
                return False
        except Exception:
            pass
    return True


def run_preference_wizard() -> bool:
    """
    交互式用户偏好引导（首次加载或 /preferences 时调用）。
    返回是否成功完成并保存。
    """
    from app.services.user_context import save_preferences_to_file

    console.print(Panel(
        "[bold]请设置您的出行偏好[/bold]\n"
        "这些偏好会影响 AI 的推荐（如优先推荐快车/便宜车、直达/风景线等）",
        title="🎯 用户偏好",
        border_style="cyan",
    ))
    console.print()

    # 1. 更倾向快速还是省钱
    console.print("[bold]1. 您更倾向「快速到达」还是「省钱」？[/bold]")
    console.print("   [dim]1) 快速 — 优先高铁/动车，少考虑票价[/dim]")
    console.print("   [dim]2) 省钱 — 优先普速/便宜车次[/dim]")
    console.print("   [dim]3) 平衡 — 综合考虑[/dim]")
    try:
        choice1 = input("   请选 1 / 2 / 3 (默认 3): ").strip() or "3"
    except (EOFError, KeyboardInterrupt):
        return False
    speed_budget = "balanced"
    if choice1 == "1":
        speed_budget = "speed"
    elif choice1 == "2":
        speed_budget = "budget"
    else:
        speed_budget = "balanced"

    # 2. 更期待享受风景和运转还是更快到达
    console.print()
    console.print("[bold]2. 您更期待「享受风景和运转」还是「更快到达目的地」？[/bold]")
    console.print("   [dim]1) 风景/运转 — 喜欢看风景、体验车次运转，可接受稍慢[/dim]")
    console.print("   [dim]2) 更快到达 — 优先总时长最短[/dim]")
    console.print("   [dim]3) 平衡 — 两者兼顾[/dim]")
    try:
        choice2 = input("   请选 1 / 2 / 3 (默认 3): ").strip() or "3"
    except (EOFError, KeyboardInterrupt):
        return False
    scenery_arrival = "balanced"
    if choice2 == "1":
        scenery_arrival = "scenery"
    elif choice2 == "2":
        scenery_arrival = "arrival"
    else:
        scenery_arrival = "balanced"

    save_preferences_to_file(speed_budget, scenery_arrival)
    labels = {"speed": "快速", "budget": "省钱", "balanced": "平衡"}
    labels2 = {"scenery": "风景/运转", "arrival": "更快到达", "balanced": "平衡"}
    console.print(f"\n[success]✅ 已保存：速度/省钱 → {labels.get(speed_budget, speed_budget)}，风景/到达 → {labels2.get(scenery_arrival, scenery_arrival)}[/success]")
    return True


def cmd_preferences(agent):
    """查看当前用户偏好，并可选重新设置。"""
    from app.services.user_context import (
        _load_preferences_from_env_and_file,
        PREFERENCES_FILENAME,
    )
    from pathlib import Path

    loaded = _load_preferences_from_env_and_file()
    speed_budget = loaded.get("prefer_speed_vs_budget") or "balanced"
    scenery_arrival = loaded.get("prefer_scenery_vs_arrival") or "balanced"

    labels = {"speed": "快速", "budget": "省钱", "balanced": "平衡"}
    labels2 = {"scenery": "风景/运转", "arrival": "更快到达", "balanced": "平衡"}

    try:
        from app.core.config import settings
        from_env = bool(settings.railmate_prefer_speed_or_budget or settings.railmate_prefer_scenery_or_arrival)
    except Exception:
        from_env = False
    path = Path.cwd() / PREFERENCES_FILENAME
    source = "环境变量 .env" if from_env else (f"本地文件 {path}" if path.exists() else "默认（未持久化）")

    console.print(Panel(
        f"更倾向快速/省钱: [bold]{labels.get(speed_budget, speed_budget)}[/bold]\n"
        f"更期待风景/到达: [bold]{labels2.get(scenery_arrival, scenery_arrival)}[/bold]\n\n"
        f"[dim]来源: {source}[/dim]\n"
        f"[dim]重新设置请输入 y[/dim]",
        title="🎯 用户偏好",
        border_style="cyan",
    ))
    try:
        if input("重新设置? (y/N): ").strip().lower() == "y":
            if run_preference_wizard() and agent:
                reloaded = _load_preferences_from_env_and_file()
                agent.user_context.preferences.prefer_speed_vs_budget = reloaded.get("prefer_speed_vs_budget") or "balanced"
                agent.user_context.preferences.prefer_scenery_vs_arrival = reloaded.get("prefer_scenery_vs_arrival") or "balanced"
    except (EOFError, KeyboardInterrupt):
        pass


def main():
    """主函数"""
    print_banner()
    
    # 初始化数据库
    console.print("[info]📦 初始化系统...[/info]")
    from app.core.database import init_db
    init_db()
    
    # 首次加载时引导用户设置偏好（可从 .env 预设，未设置则交互选择）
    if _user_preferences_need_init():
        console.print("[info]🎯 首次使用，请设置您的出行偏好（也可在 .env 中配置）[/info]")
        run_preference_wizard()
        console.print()

    # 初始化 AI Agent
    console.print("[info]🤖 初始化 AI Agent...[/info]")
    try:
        from app.services.ai_agent import RailMateAgent
        agent = RailMateAgent(user_id="console_user")
        
        if agent.client is None:
            console.print(Panel(
                "⚠️ OpenAI API Key 未配置！\n\n"
                "请在 .env 文件中设置 OPENAI_API_KEY\n"
                "如使用 DeepSeek，同时设置 OPENAI_BASE_URL",
                title="配置提示",
                border_style="yellow",
            ))
    except Exception as e:
        console.print(f"[error]AI Agent 初始化失败: {e}[/error]")
        agent = None
    
    conversation_id = None
    
    # 自动检测位置
    if agent:
        console.print()
        auto_detect_location(agent)
    
    # 准备就绪
    console.print("\n[success]✅ 准备就绪！[/success]")
    console.print("[dim]   输入 /help 查看所有命令[/dim]")
    console.print("[dim]   直接说 \"去北京的票\" 开始体验智能查票[/dim]\n")
    
    # 主循环
    while True:
        try:
            # 构建提示符
            loc_hint = ""
            if agent and agent.user_context.location:
                loc_hint = f" 📍{agent.user_context.location.city}"
            
            # 显示提示符（使用 Rich 格式化）
            prompt_text = f"[bold green]You{loc_hint}[/bold green]> "
            console.print(prompt_text, end="")
            
            # 使用标准 input()，readline 模块已导入会自动启用行编辑功能
            # 这样可以正确处理方向键、删除键等特殊按键
            try:
                user_input = input().strip()
            except (KeyboardInterrupt, EOFError):
                raise
            
            if not user_input:
                continue
            
            # 处理命令
            if user_input.startswith("/"):
                parts = user_input.split(maxsplit=1)
                cmd = parts[0].lower()
                arg = parts[1] if len(parts) > 1 else None
                
                if cmd in ("/quit", "/exit", "/q"):
                    console.print("[info]👋 再见！[/info]")
                    break
                elif cmd == "/help":
                    print_help()
                elif cmd == "/sync":
                    cmd_sync()
                elif cmd == "/stations":
                    cmd_stations()
                elif cmd == "/trains":
                    cmd_trains(arg)
                elif cmd == "/location":
                    if agent:
                        cmd_location(agent, arg or "")
                    else:
                        console.print("[error]Agent 未初始化[/error]")
                elif cmd == "/where":
                    if agent:
                        cmd_where(agent)
                    else:
                        console.print("[error]Agent 未初始化[/error]")
                elif cmd == "/autolocate":
                    if agent:
                        auto_detect_location(agent)
                    else:
                        console.print("[error]Agent 未初始化[/error]")
                elif cmd == "/time":
                    cmd_time()
                elif cmd == "/preferences":
                    cmd_preferences(agent)
                elif cmd == "/debug":
                    if agent and conversation_id:
                        cmd_debug(agent, conversation_id)
                    else:
                        console.print("[warning]无对话历史[/warning]")
                elif cmd == "/clear":
                    if agent and conversation_id:
                        agent.clear_conversation(conversation_id)
                        console.print("[success]✅ 对话历史已清除[/success]")
                elif cmd == "/new":
                    conversation_id = None
                    console.print("[success]✅ 已开始新对话[/success]")
                else:
                    console.print(f"[warning]未知命令: {cmd}，输入 /help 查看帮助[/warning]")
                
                continue
            
            # AI 对话
            if agent is None or agent.client is None:
                console.print("[error]AI 功能不可用，请配置 API Key[/error]")
                continue
            
            console.print("[dim]🤔 思考中...[/dim]")
            
            try:
                response = agent.chat(user_input, conversation_id)
                conversation_id = response.conversation_id
                
                # 打印工具调用
                print_tool_calls(response.tool_calls)
                
                # 打印回复
                console.print()
                console.print(Panel(
                    Markdown(response.answer),
                    title="🤖 RailMate",
                    border_style="cyan",
                ))
                console.print(f"[dim](会话 ID: {conversation_id})[/dim]\n")
                
            except Exception as e:
                console.print(f"[error]❌ 对话失败: {e}[/error]")
        
        except KeyboardInterrupt:
            console.print("\n[info]👋 再见！[/info]")
            break
        except EOFError:
            break


if __name__ == "__main__":
    main()
