# P6-W7P Marketing-B Supplement

## Status

`VERIFYING`

本文件补充 `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md` 与 Independent Reviewer 后续新增的 Learning retry 故障证据。

当前工作单元保持 `P6-W7-16 / Marketing-B`。完整仓库运行时门禁仍受当前执行环境的仓库物化阻塞影响，因此本轮只记录已完成的代码修复、静态检查、focused 行为验证与剩余 unblock 条件。

## Rehydrate facts

- Branch: `feature/p6-real-awkn-integration`
- Reviewer Learning recovery test: `9594db0c4f8a884f61c56f6b469cb8b5c131186d`
- Reviewer P6 gate registration: `85f8a0c5f3bfd3e457ed505a2e3123379b78dfbf`
- Marketing-B lifecycle fix: `99f5e2b9697261ef1979c837d37b6203e1eb1ad3`
- Marketing-B lifecycle assertions: `d54168228755e1a4e581060d21db35dc7d033109`

## Finding

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

## Minimal correction

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

stable `runId`、attempt-specific idempotency、Product Adapter 与 Learning Contract 均未改动。

## Test hardening

`scripts/p6-dependency-unavailable-learning.ts` 新增断言：

```text
projected.startedAt === attempt-2 startedAt
projected.finishedAt === undefined
projected.error === undefined
```

故障矩阵收口语义更新为：

```text
learning-retry-keeps-run-id-attempt-status-and-lifecycle-truth
```

## Current-environment verification

当前执行环境无法 clone GitHub 仓库：

```text
fatal: unable to access 'https://github.com/AWKN-Lab/marketing.git/'
Could not resolve host: github.com
```

因此完整以下命令无法在本轮本地执行：

```text
npm run typecheck
npm run test:p0
npm run test:p6:dependency-unavailable-learning
npm run test:p6
npm run build
```

CI/CD、GitHub Actions、Runner 与部署按本轮执行规则全部跳过。

已完成当前环境可执行的 focused TypeScript 验证：

```text
tsc --strict --target ES2022 --module NodeNext --moduleResolution NodeNext
focused mergeLearningRun behavioral check
```

结果：

```text
PASS new attempt advances to attempt=2
PASS status becomes running
PASS new trace is authoritative
PASS startedAt switches to attempt-2 start
PASS stale finishedAt is cleared
PASS stale error is cleared
PASS same-attempt state regression is rejected
PASS older attempt is rejected
```

## Hard Gate assessment

已静态与 focused 验证：

```text
learning run stable ID drift = 0
retry idempotency key drift = 0
older attempt overwrite = 0
same-attempt state regression = 0
new attempt stale startedAt leakage = 0
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
attempts = 1 in this run; no retry loop
evidence = repository not materialized locally; GitHub connector remains available for source inspection/write
suspected_root_cause = execution container DNS/network isolation
unblock_condition = local repository becomes available with dependencies, or container gains GitHub DNS/network access
```

`P6-W7-16` 保持 `VERIFYING / RUNTIME_VERIFICATION_PENDING`，本文件不宣称完整仓库门禁已通过。
