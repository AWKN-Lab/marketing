# P6-W7F Request Timeout Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-06 request timeout`。P6-W7 整体继续保持 `IN_PROGRESS`。CI/CD 按当前执行规则仅记录状态，不等待其完成，也不据此阻断后续独立工作项。

## Baseline

- Starting baseline: `103411662984afc52d6ee0710dd013b2639566ed`（P6-W7E Stale Retry）
- Implementation commits:
  - `e1ea66482fa8fd49e8067c1f87833a98b27447fb`
  - `f1bd257e8dabf69b087fc1bba1c9d2edbaa593d5`
- Branch: `feature/p6-real-awkn-integration`
- CI observed at handoff: GitHub Actions `33931789440` = `in_progress`; result not awaited and not claimed.

## Closed scope

W7-06 验证 Product Adapter 的请求超时语义，覆盖超时发生在平台提交前、平台提交后两个关键窗口。

### Path A — timeout before commit

```text
workspace.update
base_revision = r4
upstream deadline exceeded before commit
→ HTTP 504
→ UPSTREAM_TIMEOUT
→ retryable = true
→ no entity Ack
→ no revision Ack
→ side effect count = 0
```

产品层不会从超时异常推导成功实体、成功 revision 或业务失败结果。

### Path B — timeout after commit / before Ack

```text
workspace.update
base_revision = r4
idempotency_key = K

first attempt
→ upstream commits r5
→ side effect count = 1
→ Ack 未返回，表现为 AbortError
→ product returns HTTP 504 / UPSTREAM_TIMEOUT / retryable=true
→ product response contains no success data

retry same logical action
→ same idempotency_key K
→ upstream replays existing r5 Ack
→ entity_id unchanged
→ revision = r5
→ side effect count remains 1
```

超时后的状态保持未知，调用方只能用同一逻辑动作和同一幂等键恢复已提交结果；网络异常不会触发第二次业务写入。

## Test evidence

新增：

```text
scripts/p6-request-timeout.ts
npm run test:p6:request-timeout
```

并加入统一：

```text
npm run test:p6
```

测试覆盖：

```text
AbortError -> UPSTREAM_TIMEOUT
HTTP 504
retryable = true
timeout response has no fabricated data
timeout before commit side effect = 0
timeout after commit side effect = 1
same idempotency key retry
stable entity_id
committed revision replay
retry second logical side effect = 0
trace recovered from successful idempotent replay
```

## Fault matrix evidence

### Timeout before commit

```text
operation         workspace.update
error code        UPSTREAM_TIMEOUT
retryable         true
side effect count 0
final revision    r4
final consistency no-success-or-failure-ack-fabricated
```

### Timeout after commit

```text
operation         workspace.update
first error       UPSTREAM_TIMEOUT
retryable         true
idempotency key   preserved
side effect count 1
final revision    r5
final consistency one-logical-write-after-timeout-unknown-result
```

## Hard Gate implemented

```text
timeout mapped to wrong error code = 0
timeout reported as non-retryable = 0
timeout fabricated success Ack = 0
timeout fabricated business failure = 0
same-key timeout retry second logical side effect = 0
stable entity ID loss after retry = 0
revision rollback after retry = 0
```

CI verification is intentionally not claimed until a completed run is observed.

## Known limitations

- 当前使用受控 upstream 复现 AbortError 与 commit-before-Ack-timeout；真实 AWKN 网络 deadline、反向代理 timeout、跨副本 idempotency receipt 和数据库事务证据进入 P6-W8。
- timeout 发生时，HTTP 层无法从已中断连接取得 upstream trace，因此首次 timeout response 当前没有 `trace_id`；同 key 恢复成功后可取得 replay trace。真实跨服务 trace 继续列入 P6-W8。
- upstream 5xx、rate limit、malformed response、duplicate submit、active-session revoke 尚未全部关闭。

## Next

下一最小组件：`P6-W7-07 upstream 5xx`。

重点验证稳定错误映射、retryable 语义、trace 保留、未知提交结果下的幂等重试，以及 5xx 不被静默转换为 local 成功状态。
