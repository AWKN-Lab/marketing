# AWKN Marketing｜Domain 与数据模型工程文档

> 文档版本：V1.0  
> 上位文档：`docs/ENGINEERING.md`

---

# 1. Domain 目标

营销助理的 Domain 围绕一条业务证据链组织：

```text
Workspace
→ Material / Context
→ Task
→ Execution
→ Artifact / Evidence
→ Feedback
→ Outcome
→ Experience Candidate
→ Evolution Review
→ Reviewed Experience
→ Next Task Reuse
```

所有实体优先服务这条闭环，避免扩展成 CRM、通用知识库或通用 Agent 平台。

---

# 2. 核心实体

## 2.1 Tenant

```ts
type Tenant = {
  id: string
  name: string
}
```

职责：数据隔离的最高产品作用域。

## 2.2 Actor

```ts
type Actor = {
  id: string
  name: string
}
```

通过 Session 绑定 roles、capabilities 与 workspace grants。

## 2.3 Workspace

建议最小结构：

```ts
type Workspace = {
  id: string
  tenantId: string
  name: string
  type: string
  goal: string
  successCriteria?: string
  revision: number
  updatedAt: string
}
```

Workspace 是营销任务、资料、学习与 Experience scope 的主要业务边界。

## 2.4 Material

```ts
type Material = {
  id: string
  workspaceId: string
  kind: "file" | "url" | "text"
  title: string
  source?: string
  contentRef?: string
  parseStatus: "processing" | "ready" | "needs_review" | "failed"
  revision: number
  updatedAt: string
}
```

Material 正文、解析、向量化等平台级存储细节不进入产品 Domain。

## 2.5 MarketingTask

当前代码已经存在：

```ts
type MarketingTask = {
  id: string
  workspaceId: string
  workspaceName: string
  type: string
  title: string
  goal: string
  status: string
  userPrompt: string
  judgment: string
  appliedExperiences: AppliedExperience[]
  artifact: {
    title: string
    aiDraft: string
    userFinal: string
  }
}
```

P6 需要逐步把 `status: string` 收紧为稳定状态枚举，并把 Execution 从 Task 展示模型中解耦。

## 2.6 TaskExecution

建议契约：

```ts
type TaskExecution = {
  id: string
  taskId: string
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
  attempt: number
  startedAt?: string
  finishedAt?: string
  errorCode?: string
  retryable?: boolean
  revision: number
}
```

逻辑执行 ID 在 retry 后保持稳定；物理 attempt 递增。

## 2.7 Artifact

```ts
type Artifact = {
  id: string
  taskId: string
  title: string
  aiDraft: string
  userFinal: string
  revision: number
}
```

用户最终稿与 AI 草稿同时保留，用于 Edit / Feedback / Eval。

## 2.8 Evidence

```ts
type Evidence = {
  id: string
  taskId: string
  sourceType: string
  sourceRef: string
  claim?: string
  capturedAt: string
}
```

高价值 Judgment 与 Experience 应能回溯 Evidence。

## 2.9 Feedback

```ts
type Feedback = {
  id: string
  taskId: string
  decision?: string
  feedback: string
  editCount?: number
  createdAt: string
}
```

Feedback 捕获用户对产出本身的修改与评价。

## 2.10 Outcome

```ts
type Outcome = {
  id: string
  taskId: string
  outcome: string
  reason?: string
  evidenceRefs?: string[]
  createdAt: string
}
```

Outcome 捕获真实业务结果，和 Feedback 分开保存。

## 2.11 AppliedExperience

当前代码结构：

```ts
type AppliedExperience = {
  lesson: string
  source: string
}
```

P6 建议补充稳定 Experience ID、scope 与 revision，保证复用可追踪。

## 2.12 EvolutionCandidate

当前代码结构：

```ts
type EvolutionCandidate = {
  id: string
  type: string
  lesson: string
  why: string
  source: string
  scope: string
  counterexample: string
  confidence: number
}
```

Candidate 必须包含依据、适用范围、反例与置信度。

## 2.13 EvolutionReview

建议结构：

```ts
type EvolutionReview = {
  id: string
  candidateId: string
  decision: "accept" | "scope" | "reject"
  scope?: string
  reviewerActorId: string
  revision: number
  reviewedAt: string
}
```

审核完成后才允许生成 Reviewed Experience。

## 2.14 LearningWatch / LearningRun

职责：

```text
Workspace
→ Watch
→ Run
→ Signal / Recommendation
→ Feedback / Outcome / Candidate
```

Watch 是持续关注条件；Run 是一次有稳定 ID 的执行实例。

---

# 3. 关系模型

```text
Tenant 1 ── N Actor
Tenant 1 ── N Workspace
Actor  N ── N Workspace (Grant)
Workspace 1 ── N Material
Workspace 1 ── N Task
Workspace 1 ── N LearningWatch
Task 1 ── N TaskExecution
Task 1 ── N Evidence
Task 1 ── N Artifact Revision
Task 1 ── N Feedback
Task 1 ── N Outcome
Task N ── N AppliedExperience
Task / Outcome / Feedback ── N EvolutionCandidate
EvolutionCandidate 1 ── N Review Revision
ReviewedExperience N ── N Future Task
LearningWatch 1 ── N LearningRun
```

---

# 4. Identity 规则

所有可跨端、可 retry、可引用实体必须具备稳定 ID。

推荐前缀：

```text
ws_      Workspace
mat_     Material
task_    Task
run_     Task / Learning Run
art_     Artifact
ev_      Evidence
fb_      Feedback
out_     Outcome
cand_    Evolution Candidate
exp_     Reviewed Experience
review_  Evolution Review
```

前缀只用于可读性，唯一性由平台 ID 策略保证。

禁止：

- 用数组索引作为业务 ID
- retry 时生成第二个逻辑实体
- 平台返回不同 ID 后静默接受
- 使用标题、名称作为唯一键

---

# 5. Revision 规则

P6 统一要求持久化实体至少具备：

```text
entity_id
revision
updated_at
```

更新规则：

1. create 建立初始 revision。
2. update 基于已知 revision 提交。
3. server 成功后返回新 revision。
4. stale revision 返回冲突。
5. reconcile 读取最新 server state 后再决定覆盖、合并或提示。

---

# 6. 状态机

## Material

```text
processing
├─→ ready
├─→ needs_review
└─→ failed → retry → processing
```

## Task Execution

```text
queued → running → succeeded
              ├─→ failed → retry
              └─→ cancelled
```

## Evolution Candidate

```text
pending_review
├─→ accepted
├─→ scoped
└─→ rejected
```

## Learning Run

```text
queued → running → completed
              └─→ failed → retry
```

任何未知平台状态先映射为 `UNKNOWN` / unsupported 展示，不可默认映射为 success。

---

# 7. 数据隔离

最小隔离键：

```text
tenant_id
+
workspace grant
```

浏览器缓存进一步按：

```text
tenant_id + actor_id
```

隔离。

撤权后必须停止：

- Workspace / Task 展示
- Material 读取
- Task 执行
- Experience 匹配
- Learning Watch / Run 读取与写入

---

# 8. 数据生命周期

```text
Created
→ Active
→ Updated / Reviewed
→ Archived / Revoked
```

V1 默认避免硬删除业务证据。Feedback、Outcome、Review 等审计对象优先使用追加式记录或 revision 记录。

---

# 9. P6 数据模型任务

1. 收紧 Task / Execution 状态枚举。
2. 为 AppliedExperience 增加稳定 ID / scope / revision。
3. 固化 EvolutionReview revision 契约。
4. 明确 LearningRun retry 与 attempt 关系。
5. 所有跨端实体补齐 `revision` / `updated_at`。
6. 为 19 个 ProductOperation 建立请求 payload / response data schema。
7. 建立 stale-write、duplicate-retry、revoked-access Contract Test。