# RailMate 智轨伴行

🚄 垂直于铁路出行领域的 AI Agent 后端系统

## 项目简介

RailMate 是一款基于 Python 的铁路出行 AI 助手后端，能够通过自然语言对话帮助用户查询火车票、获取出行建议。

## 技术栈

- **Web 框架**: FastAPI
- **数据库**: SQLite (可迁移至 PostgreSQL)
- **ORM**: SQLModel
- **AI/LLM**: OpenAI / DeepSeek + Function Calling
- **任务调度**: APScheduler

## 快速开始

### 1. 安装依赖

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API Key
# OPENAI_API_KEY=sk-xxx
# 如使用 DeepSeek: OPENAI_BASE_URL=https://api.deepseek.com/v1
```

### 3. 启动服务

```bash
# 方式一：使用 uvicorn
uvicorn main:app --reload

# 方式二：直接运行
python main.py
```

服务启动后访问:
- API 文档: http://localhost:8000/docs
- ReDoc 文档: http://localhost:8000/redoc

### 4. 开发者控制台

```bash
python debug_console.py
```

在终端中与 AI 直接对话，实时查看工具调用过程：

```
You> 明天从广州到长沙的高铁有哪些？

🔧 工具调用记录:
┌─────────────────────────────────────┐
│ 📞 search_tickets                   │
│ 工具: search_tickets                │
│ 参数: {'from_station': '广州南'...} │
│ 结果: {"success": true, "count":15} │
└─────────────────────────────────────┘

╭─────────────────────────────────────╮
│ 🤖 RailMate                         │
│ 明天（2月2日）从广州南到长沙南...   │
╰─────────────────────────────────────╯
```

## 项目结构

```
railmate/
├── main.py                 # FastAPI 入口
├── debug_console.py        # 开发者控制台（AI 对话调试）
├── requirements.txt
├── .env
└── app/
    ├── core/               # 核心配置
    │   ├── config.py       # Pydantic Settings 配置管理
    │   ├── database.py     # SQLModel 数据库连接
    │   ├── logger.py       # Rich 美化日志
    │   └── exceptions.py   # 自定义异常
    ├── models/             # 数据库模型
    │   ├── station.py      # 车站模型
    │   └── train.py        # 车次/停靠站模型
    ├── schemas/            # 请求/响应模型
    │   └── chat.py         # 对话相关 Schema
    ├── services/           # 业务逻辑层
    │   ├── data_sync.py    # 数据同步服务 (Mock/Live 模式)
    │   ├── train_service.py# 车次查询服务
    │   └── ai_agent.py     # AI Agent 核心（Function Calling）
    ├── tasks/              # 定时任务
    │   └── scheduler.py    # APScheduler 配置
    └── api/v1/             # API 路由
        └── endpoints/
            ├── chat.py     # AI 对话接口
            ├── trains.py   # 查票接口
            └── admin.py    # 管理接口
```

## API 接口

### 查票接口
```bash
GET /api/v1/trains/search?from_station=广州南&to_station=长沙南&travel_date=2026-02-02
```

### AI 对话接口
```bash
POST /api/v1/chat
{
    "message": "明天从广州到北京的高铁",
    "conversation_id": null
}
```

### 管理接口
```bash
POST /api/v1/admin/trigger-sync  # 手动触发数据同步
GET  /api/v1/admin/stats         # 获取数据统计
GET  /api/v1/admin/jobs          # 查看定时任务
```

## 控制台命令

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助 |
| `/sync` | 手动触发数据同步 |
| `/stations` | 列出所有车站 |
| `/trains 2026-02-02` | 列出指定日期车次 |
| `/debug` | 查看最后一次完整 Prompt |
| `/clear` | 清除对话历史 |
| `/quit` | 退出 |

## 开发阶段

- [x] Phase 1: 骨架与数据库
- [x] Phase 2: 业务逻辑与数据模拟
- [x] Phase 3: AI 大脑
- [x] Phase 4: 交互与 API

## 数据模式

### Live 模式（生产推荐）

直接调用 12306 官方接口获取实时数据：

```env
DATA_SYNC_MODE=live
```

- ✅ 实时余票查询（全国 3000+ 车站）
- ✅ 真实车次信息、时刻表
- ✅ 实时余票数量

### Mock 模式（开发调试）

使用本地模拟数据：

```env
DATA_SYNC_MODE=mock
```

内置热门线路：广州南 → 长沙南 → 武汉 → 北京西 等

## License

MIT
