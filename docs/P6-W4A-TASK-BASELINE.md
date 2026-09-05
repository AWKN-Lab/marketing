# P6-W4A Task Contract Component Baseline

## Status

`COMPONENT_VERIFIED`

P6-W4 整体状态仍为 `IN_PROGRESS`。本基线只关闭 W4-01～W4-04 Task Contract；W4-05～W4-10 Task Execution 与 W4-11～W4-22 Agent 继续后续工作包。

## Baseline

- Starting baseline: `29795e8f8cc4c3d84cfe91de14957bbf8eee40f9`（P6-W3 Workspace & Material）
- Implementation commit: `344bb0abf45eb01c77186bcb117dab99619380c9`
- GitHub Actions run: `33911591304`
- Branch: `feature/p6-real-awkn-integration`

Verified:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

P0–P5 回归门保持完整。

## Closed scope

### W4-01 `task.create`

- Task 使用产品生成的稳定 `task_id`。
- `payload.task.id` 必须与顶层 `task_id` 一致。
- `payload.task.workspaceId` 必须与顶层 `workspace_id` 一致。
- create 使用稳定幂等键 `task.create:{taskId}`。
- 受控上游验证：相同逻辑幂等键发送两次，仅计一个逻辑副作用。

### W4-02 `task.update`

- update 必须携带正整数 `base_revision`。
- stale revision 的 `REVISION_CONFLICT` 与 `trace_id` 原样进入产品错误路径。
- update 幂等键可绑定 task id、base revision 与 snapshot fingerprint。

### W4-03 `task.get`

- `payload.entity_id` 必须与顶层 `task_id` 一致。
- 服务端读回继续校验 `data.entity_id` 与实体 `id`。
- Task 专项响应校验增加 Workspace scope 检查，错误 Workspace 不进入 UI 投影。
- 远端 Task status 在进入 UI 投影前再次校验。

### W4-04 Task status

Task status 收紧为稳定枚举：

```text
ready
running
completed
failed
```

`queued / success / cancelled / UNKNOWN` 等未定义状态会进入明确的 Contract failure，防止上游自由字符串污染产品状态。

Task Execution 的运行状态仍由独立 Execution Domain 在 W4B 处理，不与 Task status 混用。

## Files

```text
lib/types.ts
lib/task-contract.ts
app/api/product/route.ts
scripts/p6-task.ts
package.json
```

## Automated coverage

新增：

```text
npm run test:p6:task
```

并加入统一：

```text
npm run test:p6
```

覆盖：

- Task status enum
- create stable task identity
- create Workspace scope identity
- update base revision
- get stable entity identity
- create duplicate idempotency retry
- stale revision conflict
- remote invalid status
- remote wrong Workspace scope
- trace preservation

## Hard Gate assessment

本组件已验证：

```text
Task identity mismatch before projection = blocked
Task Workspace scope mismatch before projection = blocked
invalid Task status before projection = blocked
stale task update = explicit conflict
same-key create retry = one logical side effect in controlled upstream
```

P6-W4 全局 Hard Gate 仍需 W4B / W4C 继续关闭：

```text
revoked context leakage = pending Agent scope tests
duplicate logical run = pending Agent execution tests
artifact without task identity = pending Agent result tests
unsupported external side effect = pending Agent / tool gate tests
```

## Known limitations

- 真实 AWKN Product Service 的 exactly-once 副作用计数继续在 P6-W8 Real AWKN E2E 验证。
- 本组件只覆盖 Task CRUD Contract，未修改 Task Execution 运行模型。
- 本组件未修改 Agent Runtime 输入输出契约。
- UI 结构保持现状。

## Rollback

如本组件引入回归，回退到：

```text
29795e8f8cc4c3d84cfe91de14957bbf8eee40f9
```

该 Commit 是已验证的 P6-W3 Workspace & Material 基线。

## Next

下一最小组件：

```text
P6-W4B Task Execution
W4-05 Task / Execution 解耦
W4-06 task.execution.get
W4-07 task.execution.upsert
W4-08 stable logical execution id
W4-09 retry attempt
W4-10 queued-snapshot ordering protection
```

W4B 完成并通过回归后，再进入 W4C Agent Execution。
