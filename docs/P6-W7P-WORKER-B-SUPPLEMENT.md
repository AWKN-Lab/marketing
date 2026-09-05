# P6-W7P Marketing-B Supplement

## Status

`VERIFYING`

本文件补充 `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md` 与 Independent Reviewer 后续新增的 Learning retry 故障证据。

当前工作单元保持 `P6-W7-16 / Marketing-B`。完整仓库运行时门禁仍受当前执行环境的仓库物化阻塞影响，本轮记录代码修复、静态检查、focused 行为验证与剩余 unblock 条件。

## Rehydrate facts

- Branch: `feature/p6-real-awkn-integration`
- Marketing-A latest focused W7O evidence before B change: `4268b8f39a2b90588cbfa90738f7646d5accf86c`
- Reviewer Learning recovery test: `9594db0c4f8a884f61c56f6b469cb8b5c131186d`
- Reviewer P6 gate registration: `85f8a0c5f3bfd3e457ed505a2e3123379b78dfbf`
- Marketing-B Store lifecycle fix: `99f5e2b9697261ef1979c837d37b6203e1eb1ad3`
- Marketing-B Store lifecycle assertions: `d54168228755e1a4e581060d21db35dc7d033109`
- Marketing-B UI retry-start fix: `dcf1fee23da546ed59f87f57dbb498d338f0a656`
- Marketing-B UI retry-start regression guard: `bd662a5079e24c7041e4f2ef0e4b5876858cbf6c`

## Finding 1 — Store cross-attempt lifecycle truth

Reviewer 新增的 Learning dependency recovery 场景已经覆盖：

```text
learning.run.retry connection failure
→ UPSTREAM_UNAVAILABLE
→ retryable=true
→ failed response has no success data
→ same run_id + attempt idempotency key retry
→ recovered attempt=2 / status=running / trace preserved
```

继续检查 `mergeLearningRun()` 后发现跨 attempt 生命周期字段存在混合风险：

```text
previous attempt=1 status=failed
startedAt=attempt-1 start
finishedAt=attempt-1 finish

next attempt=2 status=running
startedAt=attempt-2 start
finishedAt=undefined
```

旧合并逻辑会保留 previous.startedAt，并在 next.finishedAt 缺失时保留 previous.finishedAt。最终投影可能出现：

```text
attempt=2
status=running
startedAt=attempt-1 start
finishedAt=attempt-1 finish
```

这会破坏 Learning retry 的 attempt 生命周期真值。

## Minimal correction 1

`lib/learning-run-store.ts` 现在区分 `nextAttempt > previousAttempt`：

```text
same attempt
→ 保留现有单调状态规则
→ 拒绝 queued/running 等状态倒退
→ terminal state 不被同 attempt 的不同终态覆盖

newer attempt
→ 接受新的 attempt/status/trace
→ startedAt 使用新 attempt
→ finishedAt 使用新 attempt；running 时清除旧 terminal finish
→ error 使用新 attempt；成功进入新 attempt 时清除旧错误
```

stable `runId`、attempt-specific idempotency、Product Adapter 与 Learning Contract 均保持原有契约。

## Finding 2 — UI retry caller reused the previous attempt start fallback

继续沿调用链检查 `LearningWatchPanel.retryFailedRun()`，发现 Store 修复之外还有一个调用方缺口。

此前 retry 成功后调用：

```text
normalizeLearningRun(... startedAt: latestRun.startedAt)
```

当 AWKN retry 响应省略 `started_at` 时，`normalizeLearningRun()` 会采用调用方 fallback。这样 attempt 2 会再次拿到 attempt 1 的 `startedAt`，即使 Store 已具备跨 attempt 生命周期清理能力，输入到 Store 的新 attempt 起点仍然失真。

## Minimal correction 2

`components/learning-watch.tsx` 在提交 retry 前生成本次物理 attempt 的本地起点：

```text
retryStartedAt = new Date().toISOString()
```

retry 成功后的 normalization 使用：

```text
startedAt: retryStartedAt
```

上游若返回 `started_at`，平台时间继续优先；上游省略该字段时，本地 fallback 属于当前 retry attempt。旧 attempt 的时间不再进入新 attempt normalization。

本修复没有改变：

```text
run_id
attempt 计算
learning.run.retry idempotency key
Workspace scope
Product permission routing
Product Adapter
Learning response Contract
```

`lib/learning-run-client.ts` 仍以 `learningRunRetryIdempotencyKey(runId, attempt)` 派生稳定 retry key；`lib/learning-contract.ts` 继续校验 run identity、attempt 与同一 key 契约。

## Test hardening

`scripts/p6-dependency-unavailable-learning.ts` 当前覆盖：

```text
UI retry source must create retryStartedAt
UI retry normalization must use retryStartedAt
UI retry source must not reuse latestRun.startedAt
recovered upstream payload intentionally omits started_at
normalize fallback resolves to current attempt start
projected.startedAt === attempt-2 startedAt
projected.finishedAt === undefined
projected.error === undefined
```

故障矩阵收口语义保持：

```text
learning-retry-keeps-run-id-attempt-status-and-lifecycle-truth
```

## Current-environment verification

当前执行环境的一次 clone 尝试仍失败：

```text
fatal: unable to access 'https://github.com/AWKN-Lab/marketing.git/'
Could not resolve host: github.com
```

因此以下完整仓库命令无法在本轮本地执行：

```text
npm run typecheck
npm run test:p0
npm run test:p6:dependency-unavailable-learning
npm run test:p6
npm run build
```

CI/CD、GitHub Actions、Runner 与部署按执行规则全部跳过。

已完成当前环境可执行的 focused TypeScript 验证：

```text
tsc --strict --target ES2022 --module commonjs focused.ts
node focused.js
```

focused 场景模拟：attempt 1 已 failed；retry 上游 payload 不提供 `started_at`；attempt 2 使用当前 retry fallback 后进入 merge。

结果：

```text
PASS attempt advances to 2
PASS status becomes running
PASS new trace is authoritative
PASS startedAt uses attempt-2 fallback
PASS stale finishedAt is cleared
PASS stale error is cleared
PASS older attempt cannot overwrite attempt 2
```

远端源码静态复核同时确认：

```text
components/learning-watch.tsx contains retryStartedAt
components/learning-watch.tsx uses startedAt: retryStartedAt
components/learning-watch.tsx no longer contains startedAt: latestRun.startedAt
P6 unified test script includes test:p6:dependency-unavailable-learning
```

## Hard Gate assessment

已静态与 focused 验证：

```text
learning run stable ID drift = 0
retry idempotency key drift = 0
older attempt overwrite = 0
same-attempt state regression = 0
new attempt stale startedAt leakage in Store = 0
new attempt stale startedAt leakage from UI retry fallback = 0
new attempt stale finishedAt leakage = 0
new attempt stale error leakage = 0
```

待授权运行环境补齐：

```text
full repository typecheck
P0 regression
full P6 relevant test
build / smoke
```

## Blocker

```text
error = Could not resolve host: github.com
reproduction = git clone --branch feature/p6-real-awkn-integration --single-branch https://github.com/AWKN-Lab/marketing.git
attempts = 1 in current run; no retry loop
evidence = repository not materialized locally; GitHub connector remains available for source inspection/write
suspected_root_cause = execution container DNS/network isolation
unblock_condition = local repository becomes available with dependencies, or container gains GitHub DNS/network access
```

`P6-W7-16` 保持 `VERIFYING / RUNTIME_VERIFICATION_PENDING`。本文件不宣称完整仓库门禁已通过。
