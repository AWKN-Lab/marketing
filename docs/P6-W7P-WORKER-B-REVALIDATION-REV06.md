# P6-W7P Marketing-B Revalidation — REV-20260905-06

## Status

`FOCUSED_VERIFIED / RUNTIME_VERIFICATION_PENDING`

本次只关闭 Atomic Work Unit `P6-W7-16-RV2`：对 Independent Reviewer `REV-20260905-06` 的 same-attempt failed evidence corrective 做当前 Head 复核与 focused 行为验证。父工作单元 `P6-W7-16` 继续保持 `VERIFYING`，完整仓库运行时门禁仍受本地仓库物化阻塞影响。

## Rehydrate

- Branch: `feature/p6-real-awkn-integration`
- Rehydrate Head before claim: `d88af9ace5a47d181e20549f36a74d2f9a6eca78`
- Marketing-A 最近变更：`f24665b9be720ef6c0795dcaac0bf73acabb54db`、`d88af9ace5a47d181e20549f36a74d2f9a6eca78`，均为 W7O 证据文档。
- Reviewer corrective: `ea080a2db2ad23e07fc0e83ce8a28deccb74211b`
- Reviewer regression guard: `79eab9055197e6f5f5260edcd9bc76302073dec2`
- Claim commit: `120f12c796dba01287adef0819e6d19ac8efd4ce`

`79eab905...` 到 claim Head `120f12c...` compare 只包含：

```text
docs/AUTOMATION_TASK_LEDGER.md
docs/P6-W7O-MARKETING-A-REVALIDATION-F6C0FBE.md
```

因此 `lib/learning-run-store.ts`、`lib/learning-contract.ts`、`components/learning-run-poller.tsx`、`components/learning-watch.tsx`、`lib/learning-run-client.ts` 与 `scripts/p6-dependency-unavailable-learning.ts` 在 Reviewer guard 之后没有代码漂移。

## Pre-edit contract review

调用链保持：

```text
LearningWatchPanel retryFailedRun
→ retryLearningRun
→ callMarketingProduct
→ learning.run.retry Product Contract
→ normalizeLearningRun
→ mergeLearningRun
→ persisted Learning Run projection

LearningRunPoller
→ learning.run.get
→ normalizeLearningRun
→ mergeLearningRun
```

本轮确认以下约束未漂移：

```text
Permission       = 继续经过 Marketing Product / Session 边界
stable run ID    = retry 必须返回同一 run_id
Idempotency      = learning.run.retry:${runId}:attempt:${attempt}
Revision         = 继续由通用 Product entity Ack Contract 约束
Retry            = attempt 递增；older attempt 不覆盖 newer attempt
Store            = same-attempt 单调 merge；new attempt 清理旧 attempt 输出/生命周期
Adapter          = 本轮不修改
```

`validateLearningProductResponse()` 仍校验 run identity、attempt、status、Signal scope；failed snapshot 的 `error` 允许省略，因此 Store 必须保存同 attempt 已知失败证据。

## Reviewer finding revalidation

当前 `mergeLearningRun()` 的 error 规则：

```text
newer attempt
→ error 只来自 next attempt
→ previous attempt error 不继承

same attempt + failed
→ next.error 有值：next authoritative
→ next.error 缺失：保留 previous.error

same attempt + non-failed
→ 使用 next.error
```

同时保留此前 W7P Hard Gate：

```text
newer attempt 不继承旧 signals
newer attempt 不继承旧 traceId
newer attempt 使用自己的 startedAt
newer attempt 不继承旧 finishedAt / error
same attempt 空 signals / 缺 trace 继续保留当前 attempt 增量证据
lower attempt 被拒绝
```

## Current-environment verification

本地仓库仍无法物化。本轮只进行一次 clone 尝试：

```text
fatal: unable to access 'https://github.com/AWKN-Lab/marketing.git/'
Could not resolve host: github.com
```

因此当前环境无法执行完整仓库：

```text
npm run typecheck
npm run test:p0
npm run test:p6:dependency-unavailable-learning
npm run test:p6
npm run build
```

CI/CD、GitHub Actions、Runner 与部署按执行规则全部跳过。

在当前容器使用 Node 22 `--experimental-strip-types`，按当前 `lib/learning-run-store.ts` 的 Reviewer 修正实现执行 focused TypeScript 行为门禁，覆盖：

```text
same attempt failed + sparse snapshot
→ previous error preserved
→ previous Signal preserved
→ previous trace preserved
→ previous finishedAt preserved

same attempt failed + explicit new error
→ explicit new error authoritative

newer attempt running
→ prior error cleared
→ prior Signal cleared
→ prior trace cleared
→ prior finishedAt cleared
→ new startedAt authoritative

older attempt arrives after newer attempt
→ rejected
```

结果：

```text
FOCUSED_W7P_REV06_EXACT_TS_PASS
```

## Hard Gate assessment

本 Atomic Work Unit 当前可完成范围：

```text
Reviewer corrective code drift = 0
same-attempt failed error loss = 0
explicit same-attempt error overwrite regression = 0
new-attempt stale failure evidence leakage = 0
stable run ID drift = 0
retry idempotency rule drift = 0
older-attempt overwrite = 0
```

仍待授权本地/runtime 环境补齐：

```text
full repository typecheck
P0 regression
full P6 relevant regression
build / smoke
```

## Blocker

```text
status = RUNTIME_VERIFICATION_PENDING
error = Could not resolve host: github.com
attempt = Marketing-B current automation run clone attempt #2 across W7P revalidation runs
unblock_condition = repository with dependencies becomes locally available, or container gains GitHub DNS/network access
```

## Result

`P6-W7-16-RV2 = DONE`

父工作单元 `P6-W7-16` 继续为 `VERIFYING`。当前证据关闭 Reviewer `REV-20260905-06` 的 focused current-head revalidation 缺口；完整仓库 runtime gate 仍保留为显式阻塞，不进入 P6-W8。