## RailMate 前端选型与架构设计

本方案面向 RailMate 智轨伴行项目的前端实现，目标是在现有 **FastAPI + AI Agent** 后端基础上，构建一套 **优雅、干净、多端适配、易扩展** 的现代 Web 前端体系，完整承接：

- AI 对话接口：`/api/v1/chat` 及其位置/上下文相关接口
- 查票/车次接口：`/api/v1/trains/...`
- 管理/统计接口：`/api/v1/admin/...`
- 地理位置能力：IP/GPS/自动定位相关接口

---

## 一、总体设计目标与原则

- **以用户任务为中心**：围绕「我想去哪 / 我现在在哪 / 我什么时候出发」设计交互，而不是围绕接口本身。
- **AI 优先体验**：AI 不是附加功能，而是首页的主入口，所有结构化功能（查票、车次详情、常用路线等）都可以从对话流自然衍生出来。
- **多端统一**：同一套前端代码，优先支持 PC / Pad / 移动 Web，保留未来迁移到小程序 / Tauri / Electron 等容器的可能。
- **平台化与可维护性**：用「前端平台」的视角来设计，而不是「单页应用」，强调：
  - 清晰的领域边界：chat / search / tickets / user-context / admin
  - 统一的数据访问层（API service）
  - 统一的状态管理与缓存策略
  - 统一的 UI 设计语言与动效规范

---

## 二、技术栈选型

### 2.1 框架与基础设施

- **框架**：Next.js（React 18 + App Router）
  - 优点：
    - 支持 SSR / SSG / ISR，便于后续 SEO 和分享（比如分享一趟车次的详情页）。
    - 内置路由与布局体系，适合构建多页面的前端平台（首页、查票、车次详情、个人中心、管理后台等）。
    - 良好的生态，方便引入 UI 库、动效库、数据请求库（如 React Query）。
- **语言**：TypeScript
  - 为接口模型（车次、站点、定位、用户上下文等）定义严格类型，减少多人协作和长期维护成本。
- **构建工具**：Next.js 内置（基于 Turbopack / Webpack），不单独选型。

> 如暂不希望引入 SSR，也可以退而选用 Vite + React + React Router；但从「平台化 + 多端 + SEO + 长期演进」角度，推荐 Next.js。

### 2.2 UI 与样式体系

- **样式方案**：Tailwind CSS
  - 原因：快速构建干净的现代 UI，便于做响应式布局和主题定制。
- **组件库**：shadcn/ui（基于 Radix UI + Tailwind）
  - 提供一整套可组合的基础组件：`Button`、`Input`、`Dialog`、`Tabs`、`Sheet` 等，可高度自定义风格。
- **图标**：Lucide Icons / Remix Icon
- **色彩与视觉语言**
  - 主色：高铁蓝 / 轨道蓝（如 `#2563EB` 或稍偏青的高铁蓝）
  - 辅色：车站信息黄（用于重要提示）、成功绿、告警橙
  - 背景：大面积白色 + 极浅灰，保留空间感

### 2.3 动画与交互

- **动效库**：Framer Motion
  - 用于页面切换、卡片浮现、时间轴展开、对话消息流入等细腻动效。
- **微动效原则**：
  - 速度：200–300ms 以内，避免拖沓。
  - 曲线：缓入缓出（ease-out）为主，强调“顺滑但不夸张”。
  - 目的：突出层级关系与用户焦点，而不是为了炫技。

### 2.4 数据请求与状态管理

- **数据请求**：React Query（TanStack Query）
  - 统一处理：
    - 请求缓存、错误重试、加载状态。
    - 列表与详情的缓存同步（如点击某个车次卡片进入详情页时复用列表数据）。
- **全局状态**：Zustand 或 Redux Toolkit（推荐 Zustand）
  - 主要用于：
    - 当前会话 ID、会话列表。
    - 用户上下文（位置、偏好、常用路线）。
    - 前端 UI 状态（主题、布局偏好、抽屉开合等）。
- **表单管理**：React Hook Form + Zod 校验
  - 用于查票表单、位置设置表单等。

---

## 三、前后端接口对接设计

### 3.1 前端 API service 抽象

在前端集中一个 `services/api` 目录，封装所有对后端的 HTTP 调用，保持：

- **统一基地址**：如 `/api/v1/...`
- **统一错误处理**：解析后端 `HTTPException` 返回的 `detail` 等信息。
- **统一类型定义**：与后端 Pydantic 模型 / Schema 对齐。

建议拆分模块：

- `services/chat.ts`
  - `postChat(request: ChatRequest): Promise<ChatResponse>`
  - `clearConversation(conversationId: string): Promise<void>`
  - `setUserLocation(location: UserLocationInput): Promise<UserLocationResponse>`
  - `getUserLocation(): Promise<UserLocationResponse>`
  - `getUserContext(): Promise<UserContextResponse>`
  - `locateByIP(): Promise<GeoLocationResponse>`
  - `locateByGPS(payload: GPSLocationInput): Promise<GeoLocationResponse>`
  - `autoLocate(): Promise<GeoLocationResponse>`
- `services/trains.ts`
  - `searchTickets(params: TrainSearchParams): Promise<TrainSearchResult[]>`
  - `getTrainSchedule(trainNo: string, date: string): Promise<TrainSchedule>`
  - `listStations(city?: string): Promise<Station[]>`
  - `getQuickestTrain(params: QuickSearchParams): Promise<TrainSearchResult>`
  - `getCheapestTrain(params: QuickSearchParams): Promise<TrainSearchResult>`
- `services/admin.ts`
  - `triggerSync(): Promise<TriggerSyncResult>`
  - `getStats(): Promise<AdminStats>`
  - `getJobs(): Promise<JobInfo[]>`

### 3.2 类型与模型（TypeScript）

根据后端 `app/schemas/chat.py` 等定义，前端建立 `types/` 目录，例如：

- `types/chat.ts`：`ChatRequest`、`ChatResponse`、`ToolCall`、`UserLocationInput` 等。
- `types/trains.ts`：`TrainSearchResult`、`TrainScheduleStop`、`Station` 等。
- `types/geo.ts`：`GeoLocation`、`GPSLocationInput` 等。
- `types/admin.ts`：统计信息、任务信息等结构。

保持命名与后端模型高度对齐，便于未来自动生成类型（通过 OpenAPI Codegen）。

---

## 四、前端信息架构与路由设计

### 4.1 顶层导航

建议的主导航（顶部或侧边）：

- **首页 / AI 助手**：`/`
- **查票**：`/search`
- **我的行程 / 常用路线**：`/trips`（可从用户上下文中逐步扩展）
- **车次详情**：`/trains/[trainNo]`
- **位置与偏好**：`/settings`
- **管理后台（可选）**：`/admin`

### 4.2 页面分层

以 Next.js App Router 为例：

- `app/layout.tsx`
  - 定义全局布局（导航栏、底部、全局主题）。
- `app/page.tsx` → AI 交互主页
- `app/search/page.tsx` → 经典查票界面
- `app/trains/[trainNo]/page.tsx` → 车次详情
- `app/settings/page.tsx` → 位置 & 偏好设置
- `app/admin/...` → 管理相关页面（后期扩展）

---

## 五、核心功能体验设计

### 5.1 AI 交互主页（/）

**布局思路**（三栏自适应）：

- **左栏：会话 & 常用路线**
  - 会话列表：最近 N 次对话，可按日期分组。
  - 「固定对话」：如「常用路线查询」、「回家路线」、「公司路线」固定入口。
  - 切换会话时，调用后端带 `conversation_id` 的对话接口。
- **中栏：对话主区域**
  - 顶部：当前位置提示条，展示「城市 / 车站 / 定位来源」，支持一键跳转到设置页。
  - 中间：消息列表
    - 用户消息：右对齐气泡。
    - AI 消息：左对齐气泡 + 卡片区（比如车次卡片列表、提示卡片）。
  - 底部：输入区
    - 文本输入框 + 发送按钮
    - 快捷按钮：如「查明天回广州的车」「查看最近车次」「帮我设计中转路线」等。
  - **动效**：
    - 新消息渐入（淡入 + 轻微上浮）。
    - AI 返回车次列表时，以卡片瀑布式依次出现。
- **右栏：用户上下文侧栏**
  - 当前定位信息（来自 `/api/v1/chat/location` 或 geo 接口）
  - 偏好设置预览：如「更偏向省钱 / 更偏向时间」。
  - 常用站点 / 常用城市。

**后端对接要点**：

- 所有对话请求走 `/api/v1/chat`，附带：
  - `message`（用户输入）
  - `conversation_id`（前端维护）
  - `user_id`（前端可使用匿名 UUID 存在 localStorage）
  - `location`（首次可从自动定位获取）
- 当用户修改位置设置后，同步调用：
  - `/api/v1/chat/location` 设置位置
  - 或 `/api/v1/chat/locate/*` 系列接口进行自动/半自动定位

### 5.2 查票页面（/search）

**上半部分：查询表单**

- 表单字段：
  - 出发站 / 城市（支持下拉 + 拼音/汉字模糊搜索，数据来自 `/api/v1/trains/stations`）
  - 到达站 / 城市
  - 日期选择器（支持「今天 / 明天 / 自选日期」快捷按钮）
  - 车次类型筛选（G/D/Z/T/K，全选 / 多选）
- 辅助功能：
  - 一键交换出发/到达。
  - 「使用当前位置为出发地」按钮（从上下文读取）。

**下半部分：车次卡片列表**

- 每一条车次以卡片形式展示：
  - 车次号、类型（高铁/动车/普快等）
  - 出发站/时间、到达站/时间、总耗时
  - 各席别票价与余票概览
  - 标记标签：如「最早发车」「最便宜」「耗时最短」
- 交互：
  - 点击卡片 → 进入 `/trains/[trainNo]?date=YYYY-MM-DD` 详情页。
  - 顶部排序与过滤：按出发时间、到达时间、耗时、价格排序。

**后端对接要点**：

- 数据来自：
  - `/api/v1/trains/search`
  - 可选 `/api/v1/trains/quickest`、`/cheapest` 用于生成「推荐卡片」。
- 前端可以对 `search` 结果做客户端标注，例如：
  - 取出最早发车标 `EARLIEST`。
  - 取出最便宜标 `CHEAPEST`。

### 5.3 车次详情页（/trains/[trainNo]）

- 顶部概览卡：
  - 车次号、车次类型
  - 出发站/时间、到达站/时间、总运行时间
- 时间轴视图：
  - 按停靠顺序罗列所有站点（来自 `/api/v1/trains/{train_no}/schedule`）
  - 用垂直时间轴 + 圆点 + 站名 + 到开时间的形式展示
- 票价与余票：
  - 根据 `TrainSearchResult` 中的票价/余票信息，展示不同席别的价格与余票状态。

**动效建议**：

- 列表进入详情页时，卡片做一个「放大到全屏」的过渡。
- 时间轴逐条渐入，突出行程感。

### 5.4 位置与偏好设置页（/settings）

- 位置设置：
  - 显示当前城市、推荐车站、定位来源（IP/GPS/手动）。
  - 按钮：
    - 「使用 IP 自动定位」（调用 `/api/v1/chat/locate/ip` 或 `/locate/auto`）。
    - 「使用浏览器 GPS 定位」（前端获取坐标后，调用 `/api/v1/chat/locate/gps`）。
    - 「手动选择城市/车站」（调用 `/api/v1/chat/location`）。
- 偏好设置（可逐步扩展，对应后端 `UserContext`）：
  - 出行偏好：更倾向省钱 / 更倾向时间 / 均衡。
  - 喜欢的中转城市（可选）。

---

## 六、多端与响应式策略

### 6.1 断点设计

基于 Tailwind 默认断点稍做调整：

- `sm`：≥ 640px（小屏手机）
- `md`：≥ 768px（大屏手机 / 小平板）
- `lg`：≥ 1024px（横屏平板 / 小笔记本）
- `xl`：≥ 1280px（桌面宽屏）

应用策略：

- `lg` 以上使用三栏布局（会话 / 对话 / 上下文）。
- `md`–`lg` 使用两栏布局（对话 + 抽屉式侧栏）。
- `sm` 以下使用单栏 + 底部 Tab 导航。

### 6.2 小程序 / App 迁移预留

- 避免直接依赖浏览器特有 API 的核心逻辑，将：
  - 定位、存储、网络请求等能力抽象成适配层（例如 `libs/platform`）。
- 为未来迁移到 Taro / UniApp / React Native 等跨端框架保留接口。

---

## 七、代码结构与工程规范

### 7.1 前端目录建议（Next.js App Router）

```text
frontend/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # AI 交互主页
│   ├── search/
│   │   └── page.tsx        # 查票页面
│   ├── trains/
│   │   └── [trainNo]/page.tsx  # 车次详情
│   ├── settings/
│   │   └── page.tsx        # 位置与偏好设置
│   └── admin/              # 管理页面（可选）
├── components/
│   ├── layout/             # 布局组件（导航栏、侧边栏、页脚）
│   ├── chat/               # 对话相关组件
│   ├── search/             # 查票表单、筛选器
│   ├── tickets/            # 车次卡片、时间轴等
│   └── common/             # 通用按钮、输入框、标签等
├── services/
│   ├── http.ts             # axios/fetch 封装
│   ├── chat.ts
│   ├── trains.ts
│   └── admin.ts
├── hooks/
│   ├── useChat.ts          # 对话业务 hook
│   ├── useTicketsSearch.ts # 查票业务 hook
│   └── useGeoLocation.ts   # 前端定位 hook
├── store/
│   ├── chatStore.ts        # 会话、conversationId
│   ├── userContextStore.ts # 用户上下文
│   └── uiStore.ts          # UI 状态（主题等）
├── types/
│   ├── chat.ts
│   ├── trains.ts
│   ├── geo.ts
│   └── admin.ts
├── styles/
│   ├── globals.css
│   └── tailwind.config.ts
└── utils/
    ├── date.ts             # 日期/时间处理（映射“今天/明天/后天”等）
    └── format.ts           # 文本格式化（城市名、站名等）
```

### 7.2 工程规范

- 使用 ESLint + Prettier + Stylelint，统一代码风格。
- 提交前自动运行 `lint` 与基础单元测试。
- 优先以函数式组件 + Hooks 风格开发。

---

## 八、动效与视觉细节建议

- **AI 消息动效**：
  - 打字机效果可以谨慎使用，避免拖慢阅读节奏；更推荐快速淡入 + 单次滑入动效。
  - 对于包含车次列表的回复，先展示文本结论，再卡片列表从下方依次出现。
- **卡片交互**：
  - 鼠标悬停：轻微放大 + 阴影增强，突出可点击性。
  - 点击进入详情时，做「从列表卡片放大到详情页」的过渡，形成空间一体感。
- **主题**：
  - 初期可只提供浅色主题，将暗色主题作为后续增强项。

---

## 九、演进路线图（前端）

- **Phase FE-1：基础骨架**
  - 搭建 Next.js + TS + Tailwind + shadcn/ui 工程。
  - 实现基础布局（导航 + 三栏布局）。
  - 接入 `/api/v1/chat`，完成最简单的 AI 对话。
- **Phase FE-2：查票与卡片**
  - 完成 `/search` 页面，打通 `/api/v1/trains/search`。
  - 实现统一的车次卡片组件，可在 AI 回复和查票页面复用。
  - 接入车次详情页 `/trains/[trainNo]`。
- **Phase FE-3：位置与上下文**
  - 完成 `/settings` 页面，接入 IP/GPS/手动位置接口。
  - 将用户位置与 AI 对话/查票体验打通（默认出发地、智能推荐）。
- **Phase FE-4：多端与优化**
  - 深化移动端体验与响应式布局。
  - 优化加载性能（代码分割、懒加载等）。
  - 增强动效与视觉细节。

---

## 十、如何继续使用 AI 完成前端

后续你可以基于本文件，直接对 AI 下达更细致的子任务，例如：

- 「按照 `FRONTEND_ARCHITECTURE.md` 的方案，帮我初始化一个 Next.js + Tailwind + shadcn/ui 的工程，并给出目录结构与基础布局。」
- 「帮我实现 `/search` 页面，包括查票表单和车次卡片组件，对接 `/api/v1/trains/search`。」
- 「根据 `useChat` hook 的设计，生成一个 AI 对话主区域组件，支持多会话切换和会话列表。」

这样可以在一个清晰、一致的前端架构下，逐步让 AI 生成具体代码，保证可维护性与扩展性。

