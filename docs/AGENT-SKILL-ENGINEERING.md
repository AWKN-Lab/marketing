# AWKN Marketing｜Agent / Skill 工程文档

> 文档版本：V1.0  
> 上位文档：`docs/ENGINEERING.md`  
> 边界：定义营销产品层语义与契约；运行时由 AWKN 提供。

---

# 1. 工程目标

Marketing Agent 的职责是把 Workspace Context、用户任务、历史 Experience、工具证据和业务结果组织成可执行的营销任务闭环。

```text
Context
→ Task Intent
→ Experience Match
→ Plan / Judgment
→ Tool / Research
→ Artifact + Evidence
→ Feedback
→ Outcome
→ Experience Candidate
```

Marketing Skill 负责可复用的营销方法单元。Skill Runtime、加载、调度和通用版本生命周期由 AWKN 平台承担。

---

# 2. Marketing Agent 职责

负责：

- 识别营销任务目标与 Workspace scope
- 读取当前 Workspace 可访问 Context
- 匹配已审核 Experience
- 选择营销 Skill 语义
- 生成任务计划与 Judgment
- 申请所需 Tool / MCP 能力
- 组织 Artifact 与 Evidence
- 记录 Applied Experience
- 接收用户 Feedback / Outcome
- 产出 Experience Candidate 所需证据

禁止：

- 绕过 Workspace Grant 读取上下文
- 自行提升 Capability
- 将未经审核 Candidate 直接写成 Active Skill
- 将模型输出直接当真实 Outcome
- 在缺少 Evidence 时伪造来源
- 重建通用 Agent Runtime

---

# 3. Agent 输入契约

建议最小输入：

```ts
type MarketingAgentInput = {
  tenantId: string
  actorId: string
  workspaceId: string
  taskId: string
  taskType: string
  goal: string
  userPrompt: string
  contextRefs: string[]
  appliedExperienceIds: string[]
  capabilityScope: string[]
  requestId: string
}
```

输入必须由产品层先完成：

1. Session 校验。
2. Workspace read / write gate。
3. Task 身份校验。
4. Context scope 限定。
5. Experience 可见性过滤。

---

# 4. Context Pack

Agent 使用的 Context 分四层：

```text
C1 Task
当前任务、目标、用户指令

C2 Workspace
客户 / 项目 / 资料 / 当前业务背景

C3 Reviewed Experience
过去已经审核通过且 scope 匹配的经验

C4 External Evidence
通过 Tool / MCP 获取的实时或外部证据
```

规则：

- 低层 Context 不能越过上层 scope。
- External Evidence 保存 source ref。
- Experience 必须保留来源与适用范围。
- 被撤权 Workspace 的资料和 Experience 立即退出匹配集合。

---

# 5. Judgment Contract

高价值 Judgment 最低包含：

```ts
type MarketingJudgment = {
  claim: string
  rationale: string
  evidenceRefs: string[]
  confidence?: number
  assumptions?: string[]
  unknowns?: string[]
}
```

要求：

- Fact 与判断可区分。
- UNKNOWN 明确保留。
- 缺少证据时标记 assumption / unknown。
- 高风险外部动作进入 Approval。

---

# 6. Agent 输出契约

建议：

```ts
type MarketingAgentResult = {
  taskId: string
  runId: string
  status: "succeeded" | "failed"
  judgment?: MarketingJudgment[]
  artifact?: {
    title: string
    content: string
  }
  evidenceRefs?: string[]
  appliedExperienceIds?: string[]
  error?: {
    code: string
    retryable?: boolean
  }
}
```

产品层收到结果后负责写入 Task Execution / Artifact / Evidence 投影。

---

# 7. Marketing Skill 模型

Skill 建议分三层：

```text
S1 Task Skill
完成某类具体营销任务的方法

S2 Judgment Skill
研究、判断、比较、定位、策略等可复用判断方法

S3 Output Skill
方案、文案、Brief、复盘等交付表达方法
```

每个营销 Skill 最低描述：

```text
skill_id
name
purpose
input_contract
output_contract
applicable_scope
evidence_requirement
failure_conditions
eval_cases
version
```

---

# 8. Experience 与 Skill 的关系

```text
User Work
→ Feedback / Outcome
→ Experience Candidate
→ Human Review
→ Reviewed Experience
→ repeated validation
→ possible Skill update candidate
```

V1 中 Reviewed Experience 可以被下一任务调用。Active Skill 的正式升级继续进入 AWKN Skill 治理链，禁止由单次 Candidate 自动修改。

---

# 9. Experience Matching

匹配最低考虑：

- tenant scope
- workspace visibility
- task type
- applicable scope
- source quality
- confidence
- counterexample
- review state
- revision

调用后必须把 Experience 记录到 `appliedExperiences` / `appliedExperienceIds`，保证后续 Eval 可以判断经验复用效果。

---

# 10. Feedback → Candidate

Candidate 生成输入：

```text
AI Draft
+ User Final
+ explicit Feedback
+ Outcome
+ Applied Experience
+ Evidence
```

Candidate 最低字段沿用当前 `EvolutionCandidate`：

```text
id
type
lesson
why
source
scope
counterexample
confidence
```

生成规则：

- 单次用户改字不自动上升为普遍经验。
- 有重复证据时可提高 confidence。
- Outcome 与用户反馈冲突时保留冲突。
- 经验必须有 scope。
- 反例可用于限制 scope 或拒绝 Candidate。

---

# 11. Tool / MCP 使用边界

Agent 只声明业务所需能力：

```text
search
fetch
read business source
create approved artifact
approved external action
```

具体 Tool 发现、认证、MCP 生命周期和调用执行由 AWKN 负责。

涉及外部副作用的动作必须满足：

```text
Capability
+ Workspace Grant
+ Approval（需要时）
+ Idempotency
+ Evidence / Receipt
```

---

# 12. Eval

Agent / Skill 评估至少观察：

- first pass adoption
- average edit count
- feedback coverage
- outcome coverage
- outcome success rate
- experience reuse rate
- repeated task edit delta
- evidence completeness
- unauthorized context access = 0
- unsupported side effect = 0

详细定义见 `docs/EVAL-ACCEPTANCE.md`。

---

# 13. P6 工程任务

1. 固化 MarketingAgentInput / Result schema。
2. 真实 `task.run` 接 AWKN Agent Runtime。
3. Applied Experience 使用稳定 ID。
4. Agent Result 保留 run id / trace id / evidence refs。
5. 工具副作用建立 Approval + idempotency gate。
6. Candidate 生成链引用 Feedback / Outcome / Evidence。
7. 建立 revoked workspace context leakage 测试。
8. 建立 Agent timeout / retry / duplicate run 测试。

---

# 14. 完成定义

Agent / Skill 工程达到 P6 标准时，应能从真实 Workspace 创建任务，通过真实 AWKN 执行，返回可追踪 Artifact / Evidence，记录 Feedback 与 Outcome，并产生可审核 Candidate；下一次相似任务能够显示实际调用的 Reviewed Experience。