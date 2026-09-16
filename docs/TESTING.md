# AWKN Marketing｜测试工程文档

> 文档版本：V1.0  
> 上位文档：`docs/ENGINEERING.md`

---

# 1. 当前基础测试门

当前 `package.json`：

```bash
npm run typecheck
npm run test:p0
npm run build
```

当前 GitHub Actions `frontend-ci` 在 `push main` 与 `pull_request main` 时执行：

```text
Node 24
→ npm install
→ typecheck
→ test:p0
→ build
```

P0–P5 已验证基线继续保留这三项基础门。

---

# 2. P6 测试金字塔

```text
E2E / Real AWKN
        ↑
Contract / Integration
        ↑
Domain / State / Permission
        ↑
Typecheck / Pure Function
```

优先验证业务契约、状态一致性和失败路径，避免把主要测试投入静态 UI 快照。

---

# 3. T0 静态门

每次 PR 必须：

```bash
npm run typecheck
npm run build
```

失败即停止进入后续验收。

---

# 4. T1 Domain Tests

覆盖：

- stable entity id
- status transition
- revision compare
- stale write rejection
- capability gate
- workspace grant gate
- revoked workspace filter
- Experience scope match
- Eval metric calculation

纯函数和状态规则优先写快速、确定性测试。

---

# 5. T2 Product Contract Tests

19 个 ProductOperation 建立表驱动 Contract Test。

每项验证：

```text
operation
request schema
required ids
idempotency requirement
response schema
entity ack
revision
error code
trace id
```

必须包含 malformed response：

- missing data
- missing entity_id
- identity mismatch
- missing revision
- invalid revision
- unknown operation

---

# 6. T3 Idempotency Tests

所有副作用操作至少执行：

```text
same request
same idempotency key
send twice
```

期望：

```text
one logical side effect
same entity / run identity
consistent final state
```

重点：

- workspace.create
- material.feed
- material.parse.retry
- task.create
- task.run
- task.execution.upsert
- feedback.record
- outcome.record
- evolution.review
- learning.run
- learning.run.retry

---

# 7. T4 Revision / Reconcile Tests

必须覆盖：

```text
local == server
local < server
local > server anomaly
concurrent update
stale retry
```

Hard Gate：旧 revision 不能静默覆盖新 revision。

---

# 8. T5 Permission Tests

矩阵：

```text
Tenant
× Actor
× Capability
× Workspace Grant
× Action
```

最低负向用例：

- 无 `workspace.read` 不可读
- read grant 不可 write
- 无 `task.run` 不可执行
- 无 `evolution.review` 不可审核
- 无 `learning.manage` 不可运行学习
- Workspace 撤权后已有 cache 不可恢复访问
- 撤权 Workspace Experience 不再匹配

服务端拒绝后 side effect count 必须为 0。

---

# 9. T6 Async / Retry Tests

覆盖 Material / Task / Learning：

```text
queued
running
completed
failed
retry
```

故障注入：

- timeout
- 5xx
- rate limit
- malformed response
- temporary disconnect
- duplicate poll
- duplicate retry

验证 logical run identity、attempt、final consistency。

---

# 10. T7 Agent Tests

检查：

- Workspace scope 正确
- revoked context leakage = 0
- Applied Experience 可追踪
- Evidence refs 存在
- UNKNOWN 保留
- timeout 可恢复
- duplicate task.run 不生成重复逻辑 run
- unsupported side effect 被 gate

Agent 内容质量进入 Eval，权限与执行一致性属于 Hard Gate。

---

# 11. T8 E2E Real AWKN

P6 最小 E2E：

```text
Session
→ Workspace
→ Material
→ Task
→ Agent Run
→ Artifact / Evidence
→ Feedback
→ Outcome
→ Candidate / Review
→ Learning Run
```

至少增加 3 条负向 E2E：

1. revoked Workspace。
2. stale revision。
3. timeout + same-key retry。

---

# 12. P7 业务 E2E

执行：

```text
5 Workspace
30 Task
```

数据进入 `EVAL-ACCEPTANCE.md` 指标体系。

每个任务保存：

- task id
- run id
- trace id
- revision
- Artifact ref
- Feedback
- Outcome
- Applied Experience
- Candidate
- retry / error（若有）

---

# 13. Test Data

测试数据分三类：

```text
Fixture
确定性 Domain / Contract 测试

Synthetic Workspace
集成测试，不含真实敏感资料

Real Acceptance Workspace
P7 授权的真实业务样本
```

CI 默认使用 Fixture / Synthetic 数据。

---

# 14. CI 升级计划

P6 推荐将 CI 拆成：

```text
verify
├─ typecheck
├─ p0 acceptance
└─ build

contract
├─ domain
├─ product contract
├─ permission
├─ idempotency
└─ revision
```

真实 AWKN E2E 使用受控环境执行，Token 存放在 GitHub Actions Secret 或组织批准的 Secret Provider 中。

---

# 15. 回归规则

修复 Bug 时必须新增能复现原问题的测试。

阶段升级时：

- P0–P5 基线用例继续运行。
- 新阶段只新增门禁，不能删除旧门禁来获得绿色 CI。
- 合同变更同时更新 Contract Test 和工程文档。

---

# 16. 测试完成定义

P6 开发完成至少满足：

```text
typecheck = pass
P0 acceptance = pass
build = pass
contract = pass
permission = pass
idempotency = pass
revision = pass
real AWKN smoke = pass
```

失败路径必须有测试证据，不能只保留 Happy Path。