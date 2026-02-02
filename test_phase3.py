#!/usr/bin/env python3
"""
Phase 3 功能测试脚本
测试 AI Agent 模块（工具定义、Prompt 等）
"""

from datetime import date, timedelta

# 初始化
from app.core.database import init_db
init_db()

print("=" * 60)
print("Phase 3 测试: AI Agent 模块")
print("=" * 60)

# 测试 1: System Prompt 生成
print("\n📝 测试 1: System Prompt 生成")
print("-" * 40)

from app.services.ai_agent import get_system_prompt, TOOLS

prompt = get_system_prompt()
print(f"✅ System Prompt 长度: {len(prompt)} 字符")
print(f"   包含今天日期: {'2026-02-01' in prompt}")

# 测试 2: 工具定义
print("\n🔧 测试 2: 工具定义")
print("-" * 40)

print(f"✅ 已定义 {len(TOOLS)} 个工具:")
for tool in TOOLS:
    func = tool["function"]
    print(f"   - {func['name']}: {func['description'][:50]}...")

# 测试 3: 对话记忆
print("\n💾 测试 3: 对话记忆")
print("-" * 40)

from app.services.ai_agent import ConversationMemory

memory = ConversationMemory(max_history=5)

# 创建对话
conv_id, _ = memory.get_or_create()
print(f"✅ 创建对话: {conv_id}")

# 添加消息
memory.add_message(conv_id, "user", "你好")
memory.add_message(conv_id, "assistant", "你好！有什么可以帮你的？")
memory.add_message(conv_id, "user", "明天去北京的票")

_, history = memory.get_or_create(conv_id)
print(f"✅ 对话历史: {len(history)} 条消息")

# 测试 4: Agent 初始化（不检查 API）
print("\n🤖 测试 4: Agent 初始化")
print("-" * 40)

from app.services.ai_agent import RailMateAgent

agent = RailMateAgent()
print(f"✅ Agent 创建成功")
print(f"   模型: {agent.model}")
print(f"   API 可用: {agent.client is not None}")
print(f"   工具函数: {list(agent.tool_functions.keys())}")

# 测试 5: 工具函数直接调用
print("\n🔧 测试 5: 工具函数直接调用")
print("-" * 40)

# 确保有数据
from app.services.data_sync import DataSyncService
sync = DataSyncService()
sync.sync_stations()
today = date.today()
sync.sync_trains(today)
sync.sync_trains(today + timedelta(days=1))
sync.close()

# 直接调用查票工具
result = agent._tool_search_tickets(
    from_station="广州南",
    to_station="长沙南",
    travel_date=str(today),
)

import json
data = json.loads(result)
print(f"✅ search_tickets 工具调用成功")
print(f"   查询结果: {data.get('count', 0)} 趟车次")

# 测试时刻表工具
if data.get("trains"):
    first_train = data["trains"][0]["train_no"]
    schedule_result = agent._tool_get_train_schedule(first_train, str(today))
    schedule_data = json.loads(schedule_result)
    print(f"✅ get_train_schedule 工具调用成功")
    print(f"   {first_train} 停靠站: {len(schedule_data.get('stops', []))} 站")

print("\n" + "=" * 60)
print("✅ Phase 3 测试完成!")
print("=" * 60)

print("\n💡 提示: 要测试完整 AI 对话功能，请:")
print("   1. 在 .env 中配置 OPENAI_API_KEY")
print("   2. 运行 python debug_console.py")
