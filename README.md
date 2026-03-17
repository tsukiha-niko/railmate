## RailMate 智轨伴行

🚄 垂直于铁路出行领域的 AI Agent 系统（后端已完成，前端规划中）

RailMate 目前包含一个功能完备的 **FastAPI 后端 + AI Agent 大脑**，下一阶段将构建一个 **优雅、干净、多端适配的 Web 前端应用**，承载 AI 交互主页、查票搜索、车次/卡片展示等能力。

本 README 主要作为「项目总览入口」，详细的前端选型与架构设计，请参考根目录的 `FRONTEND_ARCHITECTURE.md`。

---

## 一、后端项目简介

RailMate 后端是一款基于 Python 的铁路出行 AI 助手，能够通过自然语言对话帮助用户查询火车票、获取出行建议，并封装了适合前端使用的纯数据接口。

### 1.1 技术栈（后端）

- **Web 框架**: FastAPI
- **数据库**: SQLite（可平滑迁移至 PostgreSQL）
- **ORM**: SQLModel
- **AI/LLM**: OpenAI / DeepSeek + Function Calling
- **任务调度**: APScheduler
- **日志**: Rich 彩色日志

### 1.2 能力概览

- **查票能力**
  - 直达车次查询、最快车次、最便宜车次
  - 车站列表、车次时刻表
- **AI 助手能力**
  - 自然语言查票、智能补全出发地/日期
  - 多轮对话记忆
  - 结合用户位置（城市 / 车站）进行默认出发地推断
- **地理位置能力**
  - IP 定位、GPS 定位、手动设置位置
  - 城市 → 推荐高铁站的智能映射
- **运维/管理**
  - 数据同步、任务调度、统计信息

---

## 二、快速开始（后端）

### 1. 安装依赖

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境变量（后端）

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API Key
# OPENAI_API_KEY=sk-xxx
# 如使用 DeepSeek: OPENAI_BASE_URL=https://api.deepseek.com/v1
```

### 3. 启动服务（后端）

```bash
# 方式一：使用 uvicorn
uvicorn main:app --reload

# 方式二：直接运行
python main.py
```

服务启动后访问:
- API 文档: http://localhost:8000/docs
- ReDoc 文档: http://localhost:8000/redoc

### 4. 开发者控制台（后端）

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

---

## 三、项目结构（后端）

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

## 四、后端 API 接口概览

后端 API 已经为前端准备好了 **两种风格的能力**：
- 传统 REST 数据接口：适合列表、表单、卡片式展示
- 智能对话接口：适合作为 AI 交互主页的核心

### 4.1 查票接口（REST）
```bash
GET /api/v1/trains/search?from_station=广州南&to_station=长沙南&travel_date=2026-02-02
```

### 4.2 AI 对话接口
```bash
POST /api/v1/chat
{
    "message": "明天从广州到北京的高铁",
    "conversation_id": null
}
```

### 4.3 管理接口
```bash
POST /api/v1/admin/trigger-sync  # 手动触发数据同步
GET  /api/v1/admin/stats         # 获取数据统计
GET  /api/v1/admin/jobs          # 查看定时任务
```

---

## 五、控制台命令（后端调试）

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助 |
| `/sync` | 手动触发数据同步 |
| `/stations` | 列出所有车站 |
| `/trains 2026-02-02` | 列出指定日期车次 |
| `/debug` | 查看最后一次完整 Prompt |
| `/clear` | 清除对话历史 |
| `/quit` | 退出 |

---

## 六、开发阶段（Roadmap）

- [x] Phase 1: 骨架与数据库
- [x] Phase 2: 业务逻辑与数据模拟
- [x] Phase 3: AI 大脑
- [x] Phase 4: 交互与 API

---

## 七、数据模式

### 7.1 Live 模式（生产推荐）

直接调用 12306 官方接口获取实时数据：

```env
DATA_SYNC_MODE=live
```

- ✅ 实时余票查询（全国 3000+ 车站）
- ✅ 真实车次信息、时刻表
- ✅ 实时余票数量

### 7.2 Mock 模式（开发调试）

使用本地模拟数据：

```env
DATA_SYNC_MODE=mock
```

内置热门线路：广州南 → 长沙南 → 武汉 → 北京西 等

---

## 八、前端规划总览

> 详细设计请查看：`FRONTEND_ARCHITECTURE.md`

结合现有后端能力，计划构建一个 **多端（PC / 平板 / 移动 Web，可平滑迁移到小程序/跨端框架）统一体验** 的前端系统，核心设计目标：

- **优雅干净的 UI**：以铁路出行 + 时间轴 + 卡片为主视觉，强调「信息密度高但不压迫」。
- **AI 交互为中心**：首页即 AI，对话栏 + 结果卡片，通过工具调用自然切换到结构化结果展示。
- **查票体验一体化**：支持「自然语言查票」和「表单查票」两种模式，共享同一结果展示组件。
- **多端一致性**：采用响应式栅格 + 组件库（如 Tailwind CSS + shadcn/ui 或 Ant Design + 自定义主题），保证 PC/移动端一致体验。
- **维护友好**：以「领域驱动 + 功能模块化」设计前端目录，严格分层（页面 / 视图容器 / UI 组件 / hooks / service / types）。

前端大致功能模块：

- **AI 交互主页**
  - 左侧：会话历史 / 常用路线快捷入口
  - 中间：对话框 + AI 回复（富文本 + 卡片）
  - 右侧：用户上下文（当前位置、常用站点、近期查询）
- **查票页面**
  - 传统「出发地 / 目的地 / 日期 / 车次类型」表单
  - 查询结果以「车次卡片列表」呈现，支持排序、过滤、收藏路线
- **车次详情页**
  - 展示停靠站时刻表、运行时间轴、票价详情
  - 支持从 AI 回复直接「深度查看」
- **位置/个性化设置页**
  - 显示当前定位（IP/GPS/手动）
  - 可手动修正城市/车站

---

## 九、前端选型与架构设计文档

前端的详细技术选型、目录结构、状态管理、动画与交互设计等内容，统一放在根目录：

- `FRONTEND_ARCHITECTURE.md`：**前端平台化方案 + 技术栈选型 + 交互/动效原则 + 多端策略**

后续你可以直接在该文档的基础上，分模块要求 AI 生成具体页面与组件实现。

---

## License

MIT
