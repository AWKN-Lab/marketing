# 营销助理前端 P0｜组件工程索引

> 文档定位：前端 P0 组件工程入口  
> 上位文档：`docs/PRD.md`、`docs/FRONTEND.md`  
> 原则：一个组件一份工程文档；仅定义产品前端，不展开 Agent OS 以下实现。

---

# 1. P0 目标

前端只验证三个核心产品事实：

1. 用户能把真实营销资料快速放进 Workspace 并开始任务。
2. 用户能完成“任务 → Artifact → Feedback → Outcome”。
3. 用户能看见“系统用了什么经验、学到了什么、下一次怎么改变”。

---

# 2. 组件树

```text
Marketing Frontend P0
│
├─ C01 App Shell / 产品信息架构
├─ C02 Today / 今日
├─ C03 Workspace / 工作空间
├─ C04 Task Workbench / 营销任务工作台
├─ C05 Artifact Workspace / 产出物工作区
├─ C06 Evidence Drawer / 证据抽屉
├─ C07 Applied Experience / 已调用经验
├─ C08 Feedback Capture / 用户反馈捕获
├─ C09 Outcome / 真实结果记录
└─ C10 Evolution Review / 进化审核
```

---

# 3. 文档

| ID | 组件 | 文档 | P0 |
|---|---|---|---|
| C01 | App Shell | `01-app-shell.md` | 是 |
| C02 | Today | `02-today.md` | 是 |
| C03 | Workspace | `03-workspace.md` | 是 |
| C04 | Task Workbench | `04-task-workbench.md` | 是 |
| C05 | Artifact Workspace | `05-artifact-workspace.md` | 是 |
| C06 | Evidence Drawer | `06-evidence-drawer.md` | 是 |
| C07 | Applied Experience | `07-applied-experience.md` | 是 |
| C08 | Feedback Capture | `08-feedback-capture.md` | 是 |
| C09 | Outcome | `09-outcome.md` | 是 |
| C10 | Evolution Review | `10-evolution-review.md` | 是 |

---

# 4. 统一工程约束

每个组件必须满足：

- 业务状态先于 UI 状态。
- 所有高价值判断可展开 Evidence。
- 所有会改变后续行为的 Experience 必须可见。
- 用户修改必须可被结构化记录。
- 外部副作用动作必须进入 Approval。
- 默认轻界面，复杂信息使用 Drawer / Sheet / Popover 渐进展开。
- 禁止把 Memory、MCP、Agent Runtime、模型路由做成产品后台。
- 禁止建设 CRM Pipeline、联系人后台、商机 Kanban。

---

# 5. 推荐复用边界

| 来源 | 使用位置 |
|---|---|
| assistant-ui | Task Workbench、Composer、Streaming、Tool UI、Approval |
| Vercel Chatbot | Artifact Workspace、Diff、Artifact Actions |
| AnythingLLM | Workspace、资料投喂、文件上下文交互 |
| Onyx | Evidence Drawer、Citation / Source Card |
| CopilotKit | 只参考 Generative UI / HITL 模式 |
| LobeHub | 只参考整体布局、密度和节奏，不复制源码 |

---

# 6. P0 开发顺序

```text
C01 App Shell
↓
C03 Workspace
↓
C04 Task Workbench
↓
C05 Artifact Workspace
↓
C06 Evidence Drawer
↓
C08 Feedback Capture
↓
C09 Outcome
↓
C07 Applied Experience
↓
C10 Evolution Review
↓
C02 Today
```

Today 最后接入，因为它聚合前面组件已经产生的真实状态，避免先做一个静态 Dashboard。
