# P6-W7E Stale Retry Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-05 stale retry`。根据当前开发规则，CI/CD 与外部环境验证不作为主线阻断；本轮完成代码、受控故障门禁与工程记录后继续主线。P6-W7 整体保持 `IN_PROGRESS`。

## Baseline

- Starting baseline: `3d36b72f596eb9999c89dba914539b3b887641c0`（P6-W7D Concurrent Update）
- Implementation commits:
  - `c1e374a1281dcb9fab9bc3952e664050d5a34e10`
  - `d21f476b2b9c3fb6293b19e8aaf628e71f0fffda`
- Branch: `feature/p6-real-awkn-integration`
- CI status at handoff: not awaited by instruction; CI/CD is recorded but does not block the next independent work item.

## Closed scope

W7-05 验证“第一次写入已经在平台提交，但客户端没有收到成功 Ack”这一典型 stale retry 场景。

### Path A — same logical action / same idempotency key

```text
Workspace current revision = r4
logical update base_revision = r4
idempotency_key = K

first attempt
→ upstream commits r5
→ logical side effect count = 1
→ response acknowledgement lost
→ product sees UPSTREAM_UNAVAILABLE / retryable=true

retry same logical action
→ same idempotency_key K
→ upstream returns existing committed Ack
→ revision = r5
→ logical side effect count remains 1
```

该路径要求 retry 复用原逻辑动作的幂等键；网络结果未知不能成为再次创建业务副作用的理由。

### Path B — stale retry with regenerated key

额外验证防御路径：如果调用方错误地为同一旧动作生成了新的 idempotency key，但仍携带已经过期的 `base_revision = r4`：

```text
platform already r5
retry base_revision r4
new idempotency key
→ REVISION_CONFLICT
→ retryable=false
→ side effect count remains 1
→ final revision remains r5
```

revision CAS 作为第二道防线，阻止 stale retry 覆盖已经提交的 r5。

## Fault matrix evidence

### Unknown first result + same-key retry

```text
operation         workspace.update
first error       UPSTREAM_UNAVAILABLE
retryable         true
idempotency key   preserved
side effect count 1
final revision    5
final consistency one-logical-write-after-unknown-first-result
```

### Regenerated-key stale retry

```text
operation         workspace.update
error code        REVISION_CONFLICT
retryable         false
side effect count 1
final revision    5
final consistency stale-retry-cannot-create-second-write
```

## Test evidence

新增：

```text
scripts/p6-stale-retry.ts
npm run test:p6:stale-retry
```

并加入统一：

```text
npm run test:p6
```

测试覆盖：

```text
commit-before-ack-loss
UPSTREAM_UNAVAILABLE retryable path
same logical idempotency key replay
existing Ack recovery
same entity_id
same committed revision
second side effect = 0
regenerated-key stale retry
REVISION_CONFLICT
revision remains monotonic
committed content remains unchanged by stale retry
```

## Files

```text
scripts/p6-stale-retry.ts
package.json
```

## Hard Gate implemented

```text
same-key stale retry second logical side effect = 0
unknown first result silently treated as new action = 0
stale regenerated-key overwrite = 0
revision rollback = 0
REVISION_CONFLICT loss = 0
```

CI verification is not claimed in this document until a completed run is observed. The development line may proceed because CI/CD has been explicitly classified as a skippable hard blocker.

## Known limitations

- 受控 upstream 模拟 idempotency receipt 与 revision CAS；真实 AWKN 持久化、跨副本幂等 receipt、数据库事务和网络故障证据进入 P6-W8。
- request timeout、5xx、rate limit、malformed response、duplicate submit、active-session revoke 尚未全部关闭。
- P6-W7 remains `IN_PROGRESS`.

## Next

下一最小组件：`P6-W7-06 request timeout`。

重点验证超时映射、`retryable=true`、幂等键保留、unknown outcome 不伪造成失败或成功，以及 retry 不生成第二个逻辑副作用。CI/CD 若等待或失败，只记录，不阻断可独立推进的 W7 后续项。
