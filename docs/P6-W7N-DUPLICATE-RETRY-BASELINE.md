# P6-W7N Duplicate Retry Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-14 duplicate retry`。P6-W7 整体继续保持 `IN_PROGRESS`。

## Baseline

- Current prior verified component: `docs/P6-W7M-DUPLICATE-SUBMIT-BASELINE.md`
- W7-14 claim: `8b3b4cc7b46e81074a96df2d87a768f3df016f5e`
- Duplicate retry controlled test: `f24853080f78ba40f1523f10956e0fcf5843f0df`
- Unified P6 gate wiring: `0dd2e57d8bc7d068a573e241316d95ba95609ae9`
- Branch: `feature/p6-real-awkn-integration`
- Verification: GitHub Actions run `33937970221` = PASS

## Closed scope

本轮只验证 `duplicate retry`。使用 `feedback.record` 高风险 append 场景，主动制造“上游已经提交业务事件，但 Ack 在返回前超时”的 uncertain commit。

顺序：

```text
first request
→ stable feedback event ID
→ stable idempotency_key
→ upstream logical append commits once
→ Ack lost / AbortError
→ Product boundary returns UPSTREAM_TIMEOUT + retryable=true

retry request
→ new request_id
→ same feedback event ID
→ same idempotency_key
→ upstream receipt replay
→ same entity Ack / revision
→ no second logical append
```

受控 upstream receipt store 最终保持：

```text
HTTP attempts = 2
logical side effects = 1
stable entity = 1
final revision = 1
```

W7-13 已覆盖并发 duplicate submit；本组件专门覆盖失败后的 sequential retry，不重复并发提交场景。W7-15 permission revoke 保持独立。

## Production assessment

现有 `lib/feedback-contract.ts` 已提供稳定 Feedback Event ID，并由该 ID 派生确定性 `feedback.record` idempotency key。现有 `/api/product` 在超时路径返回稳定 `UPSTREAM_TIMEOUT`，并允许调用方以相同逻辑 key 重试。

因此本组件无需修改生产 Contract、Store 或 Adapter。新增独立 Failure Hardening 测试，验证产品层不会在 retry 时漂移业务身份或幂等身份。

真实 AWKN 服务端 network-level exactly-once 仍属于 P6-W8 外部集成证据，本组件不伪造该外部能力已经通过。

## Test evidence

新增：

```text
scripts/p6-duplicate-retry.ts
npm run test:p6:duplicate-retry
```

并接入统一：

```text
npm run test:p6
```

测试覆盖：

```text
first attempt commits then loses Ack
first response = UPSTREAM_TIMEOUT / retryable=true
retry uses distinct request_id
retry preserves stable feedback event ID
retry preserves identical idempotency_key
upstream receipt replay returns same Ack
logical side effect count remains 1
final revision remains 1
retry trace is preserved
```

故障矩阵记录：

```text
operation = feedback.record
expected state = same-key-retry-recovers-uncertain-append
actual state = retry-recovers-event-r1
error code = UPSTREAM_TIMEOUT
retryable = true
request id = req-w7-14-first | req-w7-14-retry
idempotency key = deterministic feedback.record key
trace id = trace-w7-14-replay
side effect count = 1
final revision = 1
final consistency = timeout-retry-one-stable-feedback-event
```

## Verification

GitHub Actions run `33937970221` 对提交 `0dd2e57d8bc7d068a573e241316d95ba95609ae9` 实际执行并通过：

```text
npm install                 PASS
npm run typecheck           PASS
npm run test:p0             PASS
npm run test:p6             PASS
npm run build               PASS
```

此前 test-file-only commit `f24853080f78ba40f1523f10956e0fcf5843f0df` 的 run `33937956693` 同样通过完整门禁；正式 W7-14 验证证据采用已接入统一 P6 Gate 的 `33937970221`。

## Self review

### correctness

- 首次请求在 Ack 丢失前只提交一个稳定 Feedback Event。
- retry 使用新的 request_id，同时保留同一业务 ID 与幂等 key。
- replay 返回同一 Ack，revision 不递增。

### permission / security

- 未修改 Session、Workspace Grant、capability、server authorization。
- 未新增 token、Secret、客户端凭证或敏感日志。

### state truth

- fixture 明确区分 HTTP attempt 与 logical side effect。
- 首次超时不制造成功 Ack。
- 真实 AWKN exactly-once 继续保持外部 UNKNOWN / W8 BLOCKED。

### contract / regression

- ProductOperation、Error Taxonomy、stable ID、revision Contract 均未改动。
- `typecheck` PASS。
- `test:p0` PASS。
- 全量 `test:p6` PASS。
- `build` PASS。

## Hard Gate

```text
duplicate retry new logical key = 0
duplicate retry second logical append = 0
retry stable entity drift = 0
retry revision inflation = 0
uncertain timeout fabricated success = 0
retry trace loss = 0
P0 regression = 0
W7-15 permission scope leakage = 0
```

## Known limitations

- W7-15 active-session permission revoke 尚未关闭。
- W7-16 dependency temporarily unavailable 尚未关闭。
- Real AWKN network-level same-key retry / exactly-once、最终授权与跨服务 trace 进入 P6-W8。
- PR #2 仍需在文档 PR #1 处理后 retarget / rebase 才具备正式合并条件。

## Next

下一顺序组件为 `P6-W7-15 permission revoked during active session`。仅在共享 Ledger 保持 READY / UNCLAIMED 且未被其他 Worker 推进时领取；本轮不扩大范围。
