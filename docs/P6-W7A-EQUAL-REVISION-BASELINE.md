# P6-W7A Equal Revision Reconcile Baseline

## Status

`COMPONENT_VERIFIED`

本组件关闭 `P6-W7-01 local revision == server revision`。P6-W7 整体继续保持 `IN_PROGRESS`，本轮没有进入 W7-02 及后续故障项。

## Baseline

- Starting baseline: `51e218485739eeeb37dff13caac6b8254b9865d4`（P6-W6 Learning & Evolution）
- Implementation commit: `ed6f18ea0007b1033cb5b23300d41a532cb24460`
- Passing GitHub Actions: `33927917905`
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

W7-01 使用产品已保存的 `baselineRevision` 作为本地已知平台 revision，与当前 `platformRevision` 做相等 revision 场景验证。

新增四个必须保持可区分的状态：

```text
revision equal + local/platform/baseline fingerprint all match
→ clean

revision equal + local fingerprint changed only
→ local-newer

revision equal + platform fingerprint drift only
→ platform-newer

revision equal + local/platform fingerprints both changed
→ conflict
```

revision 相等不会单独把状态压成 `clean`；fingerprint 差异继续保留，防止本地修改、平台内容漂移或双端冲突被静默吞掉。

## Fault matrix record

新增 `scripts/p6-failure-support.ts`，W7 故障测试从本组件开始统一保留下列字段：

```text
operation
expected state
actual state
error code
retryable
request id
idempotency key
trace id
side effect count
final revision
final consistency
```

W7-01 是只读 reconcile 验证，因此 `side effect count = 0`，`idempotency key = null`。后续写入、retry 与网络故障组件继续复用同一记录结构。

## Test evidence

`scripts/p6-revision.ts` 已纳入现有 `npm run test:p6:revision`，并通过统一 `npm run test:p6`。

新增断言覆盖：

```text
W7-01 equal local/server revision is clean when snapshots match
W7-01 equal revision preserves local-newer fingerprint state
W7-01 equal revision preserves platform fingerprint drift
W7-01 equal revision preserves conflict when both snapshots changed
```

原有 revision 测试继续保留：

```text
newer platform revision
stale platform revision
entity read identity mismatch
```

## Files

```text
scripts/p6-failure-support.ts
scripts/p6-revision.ts
```

## Hard Gate

当前 W7-01 结果：

```text
equal revision false-clean = 0
local fingerprint loss = 0
platform fingerprint drift loss = 0
both-side change conflict loss = 0
read side effect = 0
P0–P6 prior regression = 0
```

## Known limitations

- 本组件验证营销产品层 reconcile 语义，使用受控快照；真实 AWKN 并发读写、数据库事务和网络级 revision 证据进入 W7 后续组件与 P6-W8。
- `platformRevision > baselineRevision`、`platformRevision < baselineRevision`、concurrent update、stale retry、timeout、5xx、rate limit、malformed response、duplicate submit、active-session revoke 均未在本组件关闭。
- P6-W7 仍为 `IN_PROGRESS`，本 Baseline 只代表 W7-01 组件通过。

## Next

下一最小组件：`P6-W7-02 local revision < server revision`。重点验证平台较新 revision 的读回、最终 revision 单调性与本地投影不会覆盖较新平台状态。
