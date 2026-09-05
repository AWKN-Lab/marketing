# P6-W4B Task Execution Component Baseline

## Status

`COMPONENT_VERIFIED`

P6-W4 整体状态继续为 `IN_PROGRESS`。本基线关闭 W4-05～W4-10 Task Execution；W4-11～W4-22 Agent Execution 继续后续组件。

## Baseline

- Starting baseline: `1ed2510bfa10fa40d332158a0ccc01615e76bb25`（P6-W4A Task Contract）
- Implementation commits:
  - `01a3fac4cf8c08b33561566c2f1295e454d1c552` — Task Execution state / status / attempt
  - `bfd41ecfaad450d81dcfa361c50a2078b87aae31` — Task Execution Product Contract
  - `9b82051fc01275d30d8126cb9a3ade3c147be665` — Product API integration
  - `484deadee67e615bd0faec281252c3ea3065150d` — Task Execution automated tests
  - `07cb581d2ac5eb5a03812cce2f2226e023cfabd1` — unified P6 test gate
- GitHub Actions run: `33914404509`
- Branch: `feature/p6-real-awkn-integration`

Verified:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

P0–P5 回归门与 P6-W0～W4A 现有测试保持完整。

## Closed scope

### W4-05 Task / Execution 解耦

Task Execution 继续使用独立产品实体，并补齐执行生命周期字段：

```text
id
taskId
workspaceId
status
attempt
startedAt?
finishedAt?
errorCode?
retryable?
artifactTitle
finalText
feedback
outcome
outcomeNote
```

Execution status 固化为：

```text
queued
running
succeeded
failed
cancelled
```

Task 自身的 `ready / running / completed / failed` 状态继续独立维护，避免任务业务状态与单次执行生命周期混用。

### W4-06 `task.execution.get`

- 请求必须携带稳定 Execution ID：`task-execution:{taskId}`。
- 产品 API 校验 `entity_id`、Task ID、Workspace ID、Execution status、attempt。
- 成功响应必须包含可验证的 Execution 实体快照。
- 错误实体、错误 Workspace、错误 Task、非法 status / attempt 均在进入 UI 投影前失败。
- Contract failure 保留 `trace_id`。

### W4-07 `task.execution.upsert`

- upsert 必须绑定稳定 Execution ID、Task ID 与 Workspace ID。
- 首次创建允许没有 `base_revision`。
- 已有平台基线时使用正整数 `base_revision`。
- stale write 的 `REVISION_CONFLICT` 与 `trace_id` 保持明确错误路径。
- 相同 idempotency key 的受控重试仅计一个逻辑副作用。

### W4-08 Stable logical Execution ID

逻辑 Execution ID 固定：

```text
task-execution:{taskId}
```

物理重试不会生成第二个 Execution 实体。

### W4-09 Retry attempt

Execution 增加正整数 `attempt`。

重试规则：

```text
same execution id
attempt = previous attempt + 1
status = queued
clear transient error/runtime fields
```

本组件固化并测试 attempt 语义。Agent Run 的真实 retry 调用继续由 W4C 接入。

### W4-10 Queued snapshot ordering protection

P3 已有的单飞上行机制继续保留：

```text
one request in flight
→ new local snapshots replace queued snapshot
→ current request completes
→ flush latest queued snapshot
```

新增纯函数回归测试，连续 `edit-1 → edit-2 → edit-3` 时队列最终只保留 `edit-3`，防止较旧本地快照在后续同步中重新覆盖最新编辑。

## Files

```text
lib/task-execution.ts
lib/task-execution-contract.ts
app/api/product/route.ts
scripts/p6-task-execution.ts
package.json
```

## Automated coverage

新增：

```text
npm run test:p6:task-execution
```

并加入统一：

```text
npm run test:p6
```

覆盖：

- stable Execution ID
- execution status enum
- positive physical attempt
- retry keeps logical ID / increments attempt
- get identity / scope validation
- upsert identity / scope validation
- first upsert without revision
- revision-aware subsequent upsert
- duplicate same-key upsert
- stale revision conflict
- trace preservation
- malformed remote status / attempt / identity
- latest queued snapshot protection

## Hard Gate assessment

本组件已验证：

```text
Execution identity mismatch before projection = blocked
Execution Workspace / Task mismatch before projection = blocked
invalid Execution status / attempt before projection = blocked
stale Execution write = explicit conflict
same-key upsert retry = one logical side effect in controlled upstream
queued snapshot stale overwrite regression = blocked
```

P6-W4 全局 Hard Gate 继续由 W4C 关闭：

```text
revoked context leakage = pending Agent scope tests
duplicate logical run = pending Agent run tests
artifact without task identity = pending Agent result tests
unsupported external side effect = pending Agent / tool gate tests
```

## Known limitations

- 真实 AWKN Product Service 的 exactly-once 副作用计数继续在 P6-W8 Real AWKN E2E 验证。
- Agent Runtime 的真实 `task.run`、timeout / retry、run ID 与 Evidence 继续属于 W4C。
- `attempt` 已完成产品 Domain 与 Contract 语义，Agent 物理重试触发逻辑将在 W4C 使用。
- UI 结构保持现状。

## Rollback

如本组件引入回归，回退到：

```text
1ed2510bfa10fa40d332158a0ccc01615e76bb25
```

该 Commit 是已验证的 P6-W4A Task Contract 基线。

## Next

下一最小组件：

```text
P6-W4C Agent Execution
W4-11 MarketingAgentInput
W4-12 MarketingAgentResult
W4-13 task.run → AWKN Agent Runtime
W4-14 tenant / actor / workspace / task scope
W4-15 accessible Workspace materials only
W4-16 stable Applied Experience IDs
W4-17 run_id
W4-18 trace_id
W4-19 Evidence refs
W4-20 Artifact / Evidence projection
W4-21 timeout retry
W4-22 duplicate logical run protection
```

W4C 完成并通过 W4 全局 Hard Gate 后，才能进入 P6-W5。
