# P6-W7P Dependency Temporarily Unavailable Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-16 dependency temporarily unavailable`。P6-W7 的整体状态仍由 W7-15 / 后续 P6 收口状态共同决定。

## Baseline

- Starting baseline: `docs/P6-W7N-DUPLICATE-RETRY-BASELINE.md`
- Claim commit: `872709624d06715f389291cf4cd8efb87c136e06`
- Test implementation: `8b90b1f939266de913c2b4f08155c471f4add17a`
- Unified P6 gate wiring: `1ab2b8f3ac8d167f29734643d179f4174b2d7d45`
- Agent result assertion fix: `c7f69adddbcef9d6878403a779831b0f7d276ec0`
- Branch: `feature/p6-real-awkn-integration`

## Closed scope

本轮只验证 Product / Agent / Material Upload 外部依赖发生连接级临时不可用时，产品边界必须 fail closed，并允许保持同一逻辑身份进行恢复重试。

覆盖：

```text
Product dependency connection failure
→ HTTP 502
→ UPSTREAM_UNAVAILABLE
→ retryable=true
→ success data projection = 0
→ same workspace.update idempotency key retry
→ recovered stable entity / revision

Agent dependency connection failure
→ HTTP 502
→ UPSTREAM_UNAVAILABLE
→ retryable=true
→ success data projection = 0
→ same logicalActionId / task.run idempotency key retry
→ recovered stable Task / Run result

Material Upload dependency connection failure
→ HTTP 502
→ MATERIAL_UPLOAD_UPSTREAM_UNAVAILABLE
→ retryable=true
→ success data projection = 0
→ same Material ID / deterministic upload idempotency key retry
→ recovered stable Material Ack
```

三条受控故障链均保持：

```text
first failed attempt logical side effect = 0
recovery logical side effect = 1
idempotency identity drift = 0
fabricated success = 0
```

## Production assessment

现有 Adapter 已具备 W7-16 所需网络异常处理：

- `/api/product`：非 timeout 网络异常 → `UPSTREAM_UNAVAILABLE` / HTTP 502 / `retryable=true`
- `/api/agent`：非 timeout 网络异常 → `UPSTREAM_UNAVAILABLE` / HTTP 502 / `retryable=true`
- `/api/material-upload`：非 timeout 网络异常 → `MATERIAL_UPLOAD_UPSTREAM_UNAVAILABLE` / HTTP 502 / `retryable=true`

因此本组件未修改生产 Adapter，只增加 Failure Hardening 自动化证据。

## Test evidence

新增：

```text
scripts/p6-dependency-unavailable.ts
npm run test:p6:dependency-unavailable
```

并接入：

```text
npm run test:p6
```

## Verification attempts

首次统一 Gate run `33939214317`：

```text
npm install       PASS
npm run typecheck PASS
npm run test:p0   PASS
npm run test:p6   FAIL
npm run build     SKIPPED
```

失败位置为 W7-16 Agent 恢复成功后的测试断言。上游 `task_id/run_id` 经 Agent Contract 标准化后产品结果字段为 `taskId/runId`，测试仍读取 snake_case。生产网络故障映射本身没有失败。

修正提交 `c7f69adddbcef9d6878403a779831b0f7d276ec0` 仅调整测试读取标准化产品字段。

最终 GitHub Actions run `33939335113` 对 `c7f69adddbcef9d6878403a779831b0f7d276ec0` 实际执行并通过：

```text
npm install       PASS
npm run typecheck PASS
npm run test:p0   PASS
npm run test:p6   PASS
npm run build     PASS
```

该 run 同时包含 Marketing-A 已接入统一 Gate 的 W7-15 active-session revoke 测试；W7-15 测试在本次 run 中也通过，但其组件归属与闭环仍由 Marketing-A 负责。

## Hard Gate

```text
dependency connection failure fabricated success = 0
non-timeout dependency error retryable drift = 0
product retry idempotency key drift = 0
agent logical action / idempotency key drift = 0
material upload identity / idempotency key drift = 0
pre-commit outage duplicate logical side effect = 0
recovered stable entity identity drift = 0
recovery trace loss = 0
W7-15 permission/session scope leakage = 0
P0 regression = 0
```

## Reviewer / external blockers carried forward

- Real AWKN server-side exactly-once evidence remains for P6-W8; controlled W7 tests cannot replace real network evidence.
- Real Session / Product / Material credentials and final authorization remain for P6-W8.
- Cross-service trace evidence remains for P6-W8.
- Agent logical action context-version risk remains a release-review concern unless a later corrective baseline closes it.
- Material lower-revision projection guard and `PLATFORM_NOT_CONFIGURED` taxonomy consistency remain release-review concerns unless later baselines close them.
- PR #2 remains stacked on docs PR #1 / old main baseline and requires retarget/rebase before formal merge.

## Next

重新 REHYDRATE 共享账本。若 Marketing-A 已完成 W7-15，则 W7 故障矩阵 01–16 可以进入 W7 总体收口检查；P6-W8 仍依赖真实 AWKN endpoints、credentials、authorization 与网络证据，硬阻塞必须保持显式。
