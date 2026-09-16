# P6-W7D Concurrent Update Baseline

## Status

`COMPONENT_VERIFIED`

本组件关闭 `P6-W7-04 concurrent update`。P6-W7 整体继续保持 `IN_PROGRESS`，本轮没有进入 W7-05 stale retry 及后续故障项。

## Baseline

- Starting baseline: `28502abfb144a8f0a365b667b16d29956673fd77`（P6-W7C Stale Platform Revision）
- Implementation commits:
  - `ce9e655edbc04599f71cc21440c9778a537f1684`
  - `8d5c2215092abd2c724fef233343791077dc45f7`
- Passing GitHub Actions: `33931212575`
- Branch: `feature/p6-real-awkn-integration`

Verification:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

## Closed scope

W7-04 使用真实 `/api/product` Product Adapter 和受控 AWKN CAS 上游模拟两个同时基于相同 `base_revision` 的 `workspace.update`。

核心语义：

```text
Workspace current revision = r4

Update A base_revision = r4
Update B base_revision = r4
两条请求并发进入上游

→ 仅一条成功
→ entity_id 保持稳定
→ 成功 revision = r5
→ 另一条返回 REVISION_CONFLICT
→ retryable = false
→ 冲突 trace_id 保留
→ logical side effect count = 1
→ silent overwrite = 0
```

成功写入后立即执行 `workspace.get`，确认平台真值为 r5，读操作不增加副作用。

冲突方随后重新读回 r5，并使用新的 `base_revision = 5` 和新的状态派生 idempotency key 重新提交：

```text
conflicted update
→ read r5
→ rebuild update against r5
→ success r6
```

该恢复路径证明冲突不会被自动吞掉；客户端必须先重新获得当前平台 revision，再产生新的逻辑写入。

## Idempotency / concurrent semantics

两个并发写入具有不同业务内容，因此使用不同状态 fingerprint 和不同 idempotency key：

```text
workspace.update:{workspaceId}:4:fp-a
workspace.update:{workspaceId}:4:fp-b
```

二者代表两个竞争的逻辑副作用，不能通过 idempotency 合并。

并发控制由平台 revision CAS 决定：

```text
same base revision
+ different logical writes
→ at most one commit
```

产品 Adapter 的职责是完整保留成功 Ack、`REVISION_CONFLICT`、`retryable` 与 `trace_id`，禁止自动将冲突请求改写成成功。

## Fault matrix evidence

W7-04 记录：

```text
operation         workspace.update
expected state    one-success-one-revision-conflict
actual state      1-success-1-conflict
error code        REVISION_CONFLICT
retryable         false
side effect count 1
final revision    5
final consistency one-winner-no-silent-overwrite
```

冲突请求本身没有产生第二次写副作用。

## Test evidence

新增：

```text
scripts/p6-concurrent-update.ts
npm run test:p6:concurrent-update
```

并已加入统一：

```text
npm run test:p6
```

覆盖：

```text
same base revision concurrent updates
one success / one conflict
stable Workspace entity identity
successful revision monotonic r4 → r5
REVISION_CONFLICT preserved
conflict retryable=false
conflict trace preserved
one logical side effect during race
read-after-conflict consistency
conflicted writer recovery after fresh r5 read
recovery revision r5 → r6
```

## Files

```text
scripts/p6-concurrent-update.ts
package.json
```

本组件没有修改生产 Domain 或 UI；现有产品 Contract 已具备正确冲突透传能力，本轮通过更强的并发故障门禁把该能力提升为可重复验证的工程事实。

## Hard Gate

当前 W7-04 结果：

```text
concurrent successful writes from same base revision > 1 = 0
silent overwrite = 0
conflict request hidden as success = 0
conflict side effect = 0
entity identity drift = 0
successful revision regression = 0
conflict trace loss = 0
recovery without fresh revision = 0
P0–P6 prior regression = 0
```

## Known limitations

- 本组件使用受控 AWKN CAS 上游验证 Product Adapter 与 optimistic-concurrency Contract；真实数据库事务、跨副本竞争、网络级并发顺序进入 P6-W8。
- W7-05 stale retry 将继续验证旧请求在超时/重试后遇到已经推进的 revision 时必须稳定失败，不能产生第二次副作用。
- timeout、5xx、rate limit、malformed response、duplicate submit、active-session revoke 尚未关闭。
- P6-W7 仍为 `IN_PROGRESS`。

## Next

下一最小组件：`P6-W7-05 stale retry`。

重点验证：第一次逻辑写入的结果未知或平台 revision 已推进后，携带旧 `base_revision` 的 retry 必须进入明确的 `REVISION_CONFLICT` / 已存在结果路径；同一个逻辑动作不得产生第二个业务副作用，最终状态保持可追踪。
