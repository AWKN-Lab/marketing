# 自主进化营销助理｜前端产品与复用方案

> 仓库：`AWKN-Lab/marketing`  
> 文档版本：V1.0  
> 文档定位：PRD 配套前端产品文档  
> 更新时间：2026-09-02  
> 边界：只定义营销助理产品前端、交互、组件与复用来源；不展开 Agent OS 以下基础实现。

---

# 1. 一页结论

营销助理前端采用：

```text
Next.js + TypeScript
        │
        ├─ shadcn/ui + Tailwind CSS
        │
        ├─ assistant-ui
        │   └─ 对话 / Composer / Attachment / Tool UI / Approval
        │
        ├─ Vercel Chatbot Artifact Pattern
        │   └─ 产出物 / 版本 / Diff / 独立工作区
        │
        ├─ AnythingLLM Workspace Pattern
        │   └─ Workspace / 资料投喂 / 文件上下文
        │
        ├─ Onyx Evidence Pattern
        │   └─ 来源 / 引用 / Evidence Drawer
        │
        └─ AWKN Marketing Custom UI
            ├─ 今日
            ├─ Experience Applied
            ├─ Feedback Capture
            └─ Evolution Review
```

核心原则：

> **成熟通用交互直接复用，AWKN 独有产品体验自己做。**

首版前端禁止建设：

- CRM 管道
- 联系人后台
- 商机 Kanban
- 通用 Agent Builder
- 通用 Workflow Builder
- 通用 Knowledge Base 后台
- 通用模型管理台
- Agent Runtime 调试台
- MCP 管理台
- Memory 管理台

---

# 2. GitHub 对标结论

本轮重点检查 6 个项目。

| 项目 | 2026-09-02 状态 | License | 我们吸收什么 | 决策 |
|---|---|---|---|---|
| `assistant-ui/assistant-ui` | 约 11.9k Stars，当日仍在更新 | MIT | AI Thread、Composer、附件、Tool UI、Approval、人机中断、Streaming | **直接复用** |
| `vercel/chatbot` | 约 20.9k Stars | Apache-2.0 | Artifact、Artifact Actions、Diff、产出物侧栏、版本操作 | **抽取模块 / 改造** |
| `Mintplex-Labs/anything-llm` | 约 65.4k Stars，当日仍在更新 | MIT | Workspace、资料拖拽、Workspace Thread、资料上下文组织 | **抽取模块 / 改造** |
| `onyx-dot-app/onyx` | 约 31.8k Stars，当日仍在更新 | 混合：非 `ee` 部分 MIT | Citation、Sources Drawer、来源排序、文档证据卡 | **抽取非 ee 模块 / 改造** |
| `CopilotKit/CopilotKit` | 约 37.1k Stars，当日仍在更新 | MIT | Generative UI、Shared State、Human-in-the-loop 的交互模式 | **学习模式，谨慎接入** |
| `lobehub/lobehub` | 约 82.1k Stars，当日仍在更新 | LobeHub Community License | 整体 AI Workspace、Agent 操作体验、视觉节奏 | **只做交互参考** |

## 2.1 许可边界

### 可以直接复用

- assistant-ui：MIT
- AnythingLLM：MIT
- Vercel Chatbot：Apache-2.0
- Onyx：仅限仓库中非 `ee` 目录的 MIT 部分

### 禁止直接复制

`lobehub/lobehub` 当前许可证规定，商业场景下如果基于其源码开发和分发衍生作品，需要取得商业许可。

因此：

> LobeHub 只用于 UI / IA / 交互研究，不复制源码进入本仓库。

### CopilotKit 边界

CopilotKit 的前端能力很强，包括：

- Generative UI
- Shared State
- Human-in-the-loop
- Agent 状态同步
- AG-UI

但营销助理已经有自己的 AWKN Agent 能力底座。

因此 V1：

- 学习其交互模式
- 可借鉴 React UI 设计
- 不引入第二套 Agent Runtime
- 不让 AG-UI 成为新的产品底层协议
- 如未来需要，只通过产品适配层连接

---

# 3. 前端产品原则

## 3.1 Task-first

首屏重点是：

> **现在要做什么。**

页面围绕：

```text
Workspace
↓
Task
↓
Artifact
↓
Feedback
↓
Outcome
↓
Experience
```

用户无需先维护大量结构化后台数据才能使用。

## 3.2 Artifact-first

营销工作的最终价值大量存在于：

- 研究结论
- 策略判断
- PRD
- 提案
- 文案
- 汇报框架
- 会前 Brief
- 沟通建议

所以聊天只是任务入口。

**Artifact 必须拥有独立可阅读、可编辑、可比较、可反馈的主工作区。**

## 3.3 Evidence-visible

任何高价值判断都要能快速展开来源。

默认界面保持轻。

需要时打开：

> Evidence Drawer

用户能看到：

- 来源标题
- 来源类型
- 时间
- 原文片段
- 与当前结论的关系
- 来源 Workspace / Material / Web / Task

## 3.4 Evolution-visible

自主进化必须在前端被看见。

每次重要任务都可能出现：

```text
这次用了什么历史经验
↓
用户改了什么
↓
结果怎么样
↓
系统学到了什么
↓
以后会在哪些场景应用
```

前端不展示内部记忆算法。

前端只展示：

> **它学会了什么，以及以后会怎么做。**

## 3.5 Progressive Disclosure

默认页面只显示当前任务最必要的信息。

细节通过 Drawer / Sheet / Popover 展开：

- Evidence
- Context
- Tool Run
- Applied Experience
- Version History
- Candidate Detail

避免把系统做成工程控制台。

---

# 4. 前端技术选型

## 4.1 推荐主栈

```text
Next.js
TypeScript
React
Tailwind CSS
shadcn/ui
assistant-ui
```

理由：

1. assistant-ui、Vercel Chatbot、CopilotKit 的 React/Next.js 生态成熟。
2. shadcn/ui 允许组件源码进入项目后持续修改，不依赖封闭 Design System。
3. Tailwind 适合快速建立统一 Design Token。
4. Next.js 适合营销助理这种 Workspace + Task + Artifact 的 Web 产品。
5. 后续可以单独替换 Agent 接口，不需要推倒 UI。

## 4.2 V1 不引入

- Redux 大型全局状态方案
- 前端 Workflow Engine
- 节点编排画布
- 第二套 Agent Runtime SDK
- 第二套 Memory SDK

状态优先分为：

```text
Server State
UI State
Task Streaming State
Artifact State
Approval State
Feedback State
```

---

# 5. 产品主框架

桌面端采用三层布局。

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar：Workspace / Task 状态 / 全局搜索 / 用户             │
├───────────┬───────────────────────────────┬──────────────────┤
│ Left Nav  │ Main Work Area                │ Context Drawer   │
│           │                               │                  │
│ 今日      │ Task / Chat / Artifact        │ Evidence         │
│ Workspace │                               │ Context          │
│ 营销助理  │                               │ Experience       │
│ 进化      │                               │ History          │
│           │                               │                  │
└───────────┴───────────────────────────────┴──────────────────┘
```

## 5.1 Left Nav

固定四项：

1. 今日
2. Workspace
3. 营销助理
4. 进化

底部：

- 设置
- 数据源状态
- 用户

禁止在左侧增加：

- 客户
- 商机
- 联系人
- 销售漏斗
- Agent 市场
- MCP
- Memory

除非后续真实用户数据证明有必要。

## 5.2 Main Work Area

主工作区根据任务切换：

```text
Chat Mode
Artifact Mode
Review Mode
Evolution Mode
```

## 5.3 Context Drawer

右侧抽屉统一承载：

- 当前 Context
- Evidence
- Applied Experience
- Source
- Artifact History
- Task Run Summary

不为每一种信息建设独立页面。

---

# 6. 页面一：今日

## 6.1 页面目标

用户 30 秒内完成判断：

> 今天有什么值得知道、值得做、值得确认。

## 6.2 页面组件

```text
TodayPage
├─ FocusCard x 3~5
├─ SignalFeed
├─ ContinueTaskList
├─ ApprovalQueue
├─ DailyLearningCard
└─ RecentEvolutionCard
```

## 6.3 FocusCard

每张只包含：

- Workspace
- 发生什么
- 为什么重要
- 建议动作
- 截止 / 紧急度
- Evidence 数量

按钮：

- 立即处理
- 查看依据
- 忽略

## 6.4 RecentEvolutionCard

用于制造产品差异感。

示例：

```text
最近学会

政府类汇报中，你连续 3 次删除宏观趋势铺垫。

候选方法：
优先从具体任务和结果进入。

[接受] [修改] [拒绝] [查看依据]
```

---

# 7. 页面二：Workspace

AnythingLLM 最值得吸收的是 **Workspace 作为资料和会话容器**，但我们的 Workspace 增加 Goal、Task、Artifact、Decision、Outcome。

## 7.1 Workspace 首页

```text
WorkspaceHeader
├─ Goal
├─ CurrentStatus
└─ QuickActions

WorkspaceBody
├─ CurrentBrief
├─ ActiveTasks
├─ LatestArtifacts
├─ RecentSignals
├─ KeyMaterials
└─ RecentDecisions
```

## 7.2 WorkspaceSwitcher

参考 AnythingLLM 的 Workspace 组织方式。

必须支持：

- 最近访问
- Pin
- 搜索
- 快速新建
- Workspace 类型标签

V1 不做多级文件夹。

## 7.3 Material Feed

吸收 AnythingLLM 的资料投喂体验：

- 拖拽上传
- 点击上传
- 链接输入
- 粘贴文本
- 多文件队列
- 解析状态
- 失败重试

材料完成后必须显示：

```text
已识别
├─ 关键事实 12
├─ 人物 5
├─ 机构 2
├─ 决策 3
├─ 待确认冲突 1
└─ 可用于任务
```

资料上传后不能只显示“上传成功”。

用户需要看到它变成了可工作的 Context。

---

# 8. 页面三：营销助理

这是前端核心页面。

推荐直接以 `assistant-ui` 为对话基础。

## 8.1 可直接复用的 assistant-ui 能力

- `Thread`
- `Message`
- `Composer`
- `ThreadList`
- `ActionBar`
- Attachment
- Streaming
- Retry
- Markdown
- Tool UI
- Human Tool
- Approval UI

assistant-ui 支持 Custom Runtime，因此前端无需绑定 Vercel AI SDK 或 LangGraph。

## 8.2 Task Header

聊天窗口上方必须有：

```text
Workspace
Task Type
Goal
Status
Applied Experience
```

示例：

```text
绍兴越马九周年
策略判断
目标：重新定义九周年品牌主张
运行中
已匹配 3 条历史经验
```

## 8.3 Composer

在普通输入框上增加营销任务入口：

```text
+ 资料
+ 网页
+ Workspace Context
+ 选择产出类型
+ 任务目标
```

快捷任务：

- 吃透资料
- 深度研究
- 做策略
- 写方案
- 审核方案
- 会前准备
- 复盘

快捷任务只是填写 Task Intent，不改变 Agent 架构。

## 8.4 Task Progress

禁止展示冗长 Chain-of-Thought。

只显示可理解的任务状态：

```text
正在读取 12 份资料
正在核对 4 个关键事实
正在补充外部信息
正在形成策略判断
正在生成最终产出
```

可展开“任务详情”，查看：

- 已用 SKILL
- Tool 状态
- Evidence 数量
- 等待确认项

---

# 9. Artifact 工作区

Vercel Chatbot 的 Artifact 是本产品最值得直接吸收的交互之一。

其仓库已经把 Artifact 抽象为独立定义，并有：

- Artifact content
- Artifact actions
- Artifact messages
- Artifact state hook
- Text / Code / Image 等不同 Artifact client
- DiffView

营销助理将其改造成 Marketing Artifact。

## 9.1 布局

```text
┌──────────────────┬────────────────────────────────────┐
│ Conversation     │ Artifact                           │
│                  │                                    │
│ 用户任务         │ 标题                               │
│ Agent 解释       │ 版本 V3                            │
│ 修改意见         │                                    │
│                  │ 正文                               │
│                  │                                    │
│                  │                                    │
├──────────────────┼────────────────────────────────────┤
│ Composer         │ Feedback Bar / Version / Evidence  │
└──────────────────┴────────────────────────────────────┘
```

## 9.2 Marketing Artifact 类型

V1：

- Research
- Strategy
- Proposal
- Copy
- Brief
- Review
- Retrospective

后续：

- Slides
- Spreadsheet
- Visual

## 9.3 Artifact 顶栏

必须包含：

- Artifact 类型
- 版本
- 保存状态
- 来源任务
- Evidence
- 已应用 Experience

操作：

- 复制
- 导出
- 创建新版本
- 查看 Diff
- 标记采用
- 标记需要修改

## 9.4 Diff 是核心，不是附属

用户修改是自主进化的重要输入。

Artifact 必须支持：

```text
AI V1
vs
User Final
```

系统可以识别：

- 删除
- 新增
- 重写
- 顺序调整

用户可选择：

> “把这次修改作为反馈提交给助理。”

---

# 10. Evidence Drawer

Onyx 最值得吸收的是 Sources / Citations 的信息组织。

Onyx 的 Sources UI 会：

- 将被引用来源按引用顺序排序
- 区分 Cited Sources / More / User Files
- 显示来源类型图标
- 显示标题
- 显示 metadata
- 显示命中片段
- 点击进入原文

营销助理改造成 Evidence Drawer。

## 10.1 Evidence 分组

```text
Evidence
├─ 本次直接引用
├─ Workspace 历史资料
├─ 历史 Task / Artifact
├─ 已验证 Experience
└─ 外部来源
```

## 10.2 EvidenceCard

字段：

- title
- source_type
- source_time
- snippet
- relevance
- used_for
- confidence

`used_for` 必须明确：

```text
用于支持：
“该部门 2026 年重点转向文旅消费场景”
```

---

# 11. Applied Experience UI

这是 AWKN Marketing 必须自研的前端组件。

任何任务调用历史 Experience 时，在 Task Header 下方展示：

```text
本次已应用 2 条经验

01 政府方案第一页只放一个核心判断
   来源：Task #17、Task #26
   置信度：高

02 用户更偏好“商业结果 → 机制 → 证据”的顺序
   来源：4 次相似任务修改
   置信度：中

[查看详情]
```

用户可以在任务前：

- 保留
- 暂停应用
- 查看来源

任务结束后系统记录：

> 这条 Experience 本次是否带来正向结果。

---

# 12. Feedback Capture

普通 AI 产品只有 👍 / 👎。

营销助理必须捕获更高价值反馈。

## 12.1 Artifact Feedback Bar

```text
[采用] [部分采用] [需要修改] [放弃]
```

选择“需要修改”后：

```text
为什么？

□ 判断不对
□ 信息不完整
□ 逻辑顺序不对
□ 表达风格不对
□ 不符合客户场景
□ 太泛
□ 其他
```

用户可以不填原因。

## 12.2 自动捕获

前端记录：

- AI 原版本
- 用户最终版本
- Edit Diff
- 用户选择
- 是否进入真实使用

这些数据进入产品层 Feedback / Outcome 流程。

---

# 13. Approval UI

直接吸收 assistant-ui 的 Approval Card / Human-in-the-loop 交互模式。

## 13.1 需要 Approval Card 的场景

- 正式外发
- 报价
- 承诺
- 政府正式材料
- 敏感数据外发
- 修改关键事实
- 接受高影响 Evolution Candidate

## 13.2 ApprovalCard

```text
需要你确认

动作：向 XXX 发送正式邮件
原因：当前任务要求推进会议时间
风险：将代表你对外表达

内容预览……

[允许一次] [修改后允许] [拒绝]
```

不提供“永久允许高风险动作”的快捷按钮。

---

# 14. 页面四：进化

该页面完全自研。

这是产品辨识度最高的页面之一。

## 14.1 页面结构

```text
EvolutionPage
├─ LearnedRecently
├─ CandidateInbox
├─ AcceptedExperiences
├─ RejectedPatterns
└─ UsageHistory
```

## 14.2 CandidateCard

```text
系统发现一个重复模式

场景：政府 / 国企营销方案

你在 4 次相似任务中都：
删除宏观行业铺垫
保留具体任务与商业结果

建议形成：
“政府类方案优先从具体任务、结果和执行机制进入。”

适用范围：政府营销方案
置信度：中高
证据：4 个 Task / 7 次修改

[接受] [修改] [仅此 Workspace] [拒绝]
```

## 14.3 Accepted Experience

需要显示：

- 内容
- 适用范围
- 来源
- 置信度
- 被应用次数
- 最近应用
- Outcome 趋势

用户可：

- 暂停
- 修改范围
- 回退

---

# 15. 前端组件树

```text
apps/web
│
├─ app
│  ├─ today
│  ├─ workspace
│  ├─ assistant
│  └─ evolution
│
├─ components
│  │
│  ├─ shell
│  │  ├─ AppShell
│  │  ├─ MainNav
│  │  ├─ WorkspaceSwitcher
│  │  └─ ContextDrawer
│  │
│  ├─ assistant
│  │  ├─ Thread
│  │  ├─ Composer
│  │  ├─ TaskHeader
│  │  ├─ TaskProgress
│  │  ├─ ToolStatus
│  │  └─ ApprovalCard
│  │
│  ├─ artifact
│  │  ├─ ArtifactPanel
│  │  ├─ ArtifactHeader
│  │  ├─ ArtifactEditor
│  │  ├─ ArtifactActions
│  │  ├─ VersionHistory
│  │  └─ DiffView
│  │
│  ├─ evidence
│  │  ├─ EvidenceDrawer
│  │  ├─ EvidenceGroup
│  │  └─ EvidenceCard
│  │
│  ├─ feedback
│  │  ├─ FeedbackBar
│  │  ├─ EditSummary
│  │  └─ OutcomeForm
│  │
│  ├─ evolution
│  │  ├─ CandidateCard
│  │  ├─ ExperienceCard
│  │  ├─ ExperienceAppliedBanner
│  │  └─ UsageHistory
│  │
│  └─ workspace
│     ├─ GoalCard
│     ├─ MaterialFeed
│     ├─ MaterialUploader
│     ├─ ActiveTaskList
│     ├─ ArtifactList
│     ├─ SignalList
│     └─ DecisionList
│
└─ adapters
   ├─ agent-runtime
   ├─ memory
   ├─ tool
   ├─ skill
   ├─ approval
   ├─ event
   └─ eval
```

`adapters` 只消费 PRD 已定义的产品接口。

前端不得直接绑定任何底层内部数据结构。

---

# 16. 开源复用清单

## 16.1 直接复用

### assistant-ui

优先：

- Thread primitives
- Message primitives
- Composer
- Thread List
- Attachment
- Action Bar
- Tool UI
- Approval / Human-in-the-loop UI
- Streaming state

改造重点：

- 接 AWKN Product Adapter
- 自定义 Marketing Tool Renderer
- 自定义视觉主题

## 16.2 抽取模块

### Vercel Chatbot

抽取理念与可移植实现：

- `components/chat/create-artifact.tsx`
- `components/chat/artifact.tsx`
- `components/chat/artifact-actions.tsx`
- `hooks/use-artifact.ts`
- `components/chat/diffview`
- Text Artifact 的版本 / Diff 交互

改造成 Marketing Artifact。

### AnythingLLM

重点参考 / 抽取：

- `frontend/src/pages/WorkspaceChat`
- `frontend/src/components/WorkspaceChat`
- Workspace selector
- DnD file uploader
- Workspace thread UX
- Material upload queue / state

禁止搬入：

- AnythingLLM 自己的 RAG / Agent / Workspace 后端模型

### Onyx

仅从非 `ee` 目录抽取：

- `web/src/sections/document-sidebar/DocumentsSidebar.tsx`
- Citation → SourceInfo 的映射逻辑
- Sources Sheet / Drawer
- Source row / metadata / snippet 交互

禁止复制任何 `ee` 目录代码。

## 16.3 只学模式

### CopilotKit

学习：

- Agent / UI Shared State
- Generative UI
- Human-in-the-loop
- Agent 暂停等待用户操作

V1 不把其 Agent Runtime / AG-UI 设为营销助理的新底座。

### LobeHub

学习：

- AI Workspace 信息密度
- 侧栏组织
- Agent 任务状态的视觉表达
- 设置与主工作区的分离

商业衍生限制存在，禁止源码直接进入产品。

---

# 17. Design System

## 17.1 气质

产品服务高价值、复杂、长期营销工作。

视觉关键词：

- 专业
- 克制
- 高信息密度
- 可信
- 可审计
- AI 感适量

禁止：

- 大面积炫光
- 赛博朋克
- 过度渐变
- 到处显示 Agent 图标
- 工程 Console 感
- CRM 表格感

## 17.2 色彩

V1 推荐：

```text
Base：Neutral / Zinc
Primary：Deep Blue
Accent：低饱和金 / Amber，仅用于高价值状态
Success：Green
Warning：Amber
Risk：Red
```

重点通过层级、间距、字体重量建立质感。

## 17.3 状态颜色语义

颜色只表达状态：

- Evidence Confirmed
- Waiting
- Approval Required
- Risk
- Learned / Applied Experience

禁止纯装饰性状态色泛滥。

---

# 18. 响应式

## Desktop

完整三栏：

```text
Nav | Work Area | Drawer
```

## Tablet

```text
Nav | Work Area
Drawer → Sheet
```

## Mobile

V1 只保证：

- 今日
- 任务查看
- 对话
- Approval
- Artifact 阅读
- Candidate 审核

复杂 Artifact 编辑、Diff、Workspace 管理优先桌面端。

Evidence 在移动端使用 Bottom Sheet，参考 Onyx 的 Sources Modal 思路。

---

# 19. 前端 P0

必须完成：

### Shell

- AppShell
- 四主导航
- WorkspaceSwitcher
- ContextDrawer

### 今日

- FocusCard
- Signal
- Continue Task
- Approval Queue
- Recent Evolution

### Workspace

- Goal
- Material Feed
- Upload
- Active Tasks
- Artifact List

### 营销助理

- assistant-ui Thread
- Composer
- Attachment
- Task Header
- Task Progress
- Tool UI
- Approval

### Artifact

- Artifact Panel
- Text Artifact
- Version
- Diff
- Feedback Bar

### Evidence

- Evidence Drawer
- Evidence Card
- Source Jump

### Evolution

- Candidate Inbox
- Candidate Card
- Accept / Modify / Reject / Scope
- Applied Experience Banner

---

# 20. 前端 P1

- Artifact 全屏编辑
- 多 Artifact 同任务
- Version Timeline
- Outcome 快捷录入
- Global Search
- Command Palette
- Keyboard Shortcuts
- Mobile 优化
- Signal 筛选
- Experience 使用统计

---

# 21. 前端验收标准

V1 前端完成后，必须能完整演示：

```text
1. 创建 Workspace
2. 拖入历史资料
3. 看见系统已经识别出的 Context
4. 发起营销任务
5. 查看任务运行状态
6. 看到 AI 交付 Artifact
7. 展开 Evidence Drawer 核查来源
8. 修改 Artifact
9. 查看 AI V1 vs User Final Diff
10. 提交采用 / 修改 / 拒绝反馈
11. 记录 Outcome
12. 出现 Experience Candidate
13. 用户审核 Candidate
14. 发起第二个相似任务
15. UI 显示本次自动应用的历史 Experience
16. 第二次 Artifact 中看到方法已生效
```

前端验收核心：

> **用户必须肉眼看见“工作 → 反馈 → 学会 → 再应用”的完整循环。**

---

# 22. 最终复用决策

```text
直接复用
├─ assistant-ui
├─ shadcn/ui
└─ Tailwind

抽取 / 改造
├─ Vercel Chatbot Artifact
├─ AnythingLLM Workspace / Material Feed
└─ Onyx Evidence / Sources

学习交互
├─ CopilotKit Generative UI / Human-in-the-loop
└─ LobeHub Workspace / Agent UX

必须自研
├─ Today
├─ Marketing Task Header
├─ Applied Experience
├─ Feedback Capture
├─ Outcome
├─ Evolution Review
└─ Marketing Product IA
```

最终原则：

> **通用 AI UI 少造轮子；自主进化的可见体验必须掌握在我们自己手里。**

---

# 23. 来源仓库

- https://github.com/assistant-ui/assistant-ui
- https://github.com/vercel/chatbot
- https://github.com/Mintplex-Labs/anything-llm
- https://github.com/onyx-dot-app/onyx
- https://github.com/CopilotKit/CopilotKit
- https://github.com/lobehub/lobehub
