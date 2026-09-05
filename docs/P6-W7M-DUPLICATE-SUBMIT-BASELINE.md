# P6-W7M Duplicate Submit Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-13 duplicate submit`。P6-W7 整体继续保持 `IN_PROGRESS`。

## Baseline

- Current prior verified component: `docs/P6-W7L-IDENTITY-MISMATCH-BASELINE.md`
- W7-13 claim / ledger schema alignment: `c61d83676e451697b6f86c6934c19342221928de`
- Duplicate submit controlled test: `67656f5f6896a9fffcab31c9eec35437836e3d6d`
- Unified P6 gate wiring: `729b61f08a5f29e165fac866c56b710e748b3063`
- Branch: `feature/p6-real-awkn-integration`
- Verification: GitHub Actions run `33936601312` = PASS

## Closed scope

本轮只验证 `duplicate submit`，使用已经具备稳定事件身份与幂等契约的 `feedback.record` 作为高风险 append 代表场景。

两个独立用户提交请求同时发送：

```text
request_id A != request_id B
feedback_event.id A == feedback_event.id B
idempotency_key A == idempotency_key B
```

受控 Product upstream 按 `idempotency_key` 保存 receipt：

```text
2 concurrent HTTP requests
→ 1 stable feedback event
→ 1 logical append side effect
→ both responses recover the same Ack
→ entity_id unchanged
→ revision = 1
→ trace preserved
```

本组件没有制造 timeout / 5xx / uncertain commit，也没有执行失败后的 retry；这些语义继续留给 W7-14 `duplicate retry`。

## Production assessment

现有 `lib/feedback-contract.ts` 已经提供：

```text
stable feedback event ID
feedbackRecordIdempotencyKey(eventId)
request validation enforcing deterministic idempotency_key
```

现有 `/api/product` 会原样转发调用方提供的稳定幂等键。因此 W7-13 不需要修改生产代码；新增工作集中于并发双提交的 Failure Hardening 证据，避免重复实现客户端或服务端 dedupe 内核。

真实 AWKN 服务端 exactly-once 仍属于 P6-W8 外部集成证据。本组件证明产品层在重复提交时不会主动生成第二个逻辑 key，并通过受控 upstream fixture 验证期望的单副作用 Contract。

## Test evidence

新增：

```text
scripts/p6-duplicate-submit.ts
npm run test:p6:duplicate-submit
```

并接入统一：

```text
npm run test:p6
```

测试覆盖：

```text
two distinct request_id values
one stable feedback event ID
one idempotency_key
concurrent Promise.all submit
one upstream logical receipt
one logical side effect
same entity Ack for both responses
trace preservation
final revision = 1
```

故障矩阵记录：

```text
operation = feedback.record
expected state = duplicate-submit-one-logical-append
actual state = one-event-r1
error code = null
retryable = null
request id = req-w7-13-submit-a | req-w7-13-submit-b
idempotency key = deterministic feedback.record key
trace id = trace-w7-13-duplicate-submit
side effect count = 1
final revision = 1
final consistency = two-requests-one-stable-feedback-event
```

## Verification

GitHub Actions run `33936601312` 对提交 `729b61f08a5f29e165fac866c56b710e748b3063` 实际执行并通过：

```text
npm install                 PASS
npm run typecheck           PASS
npm run test:p0             PASS
npm run test:p6             PASS
npm run build               PASS
```

该提交同时包含已进入分支的 W7-12 identity mismatch 测试入口，因此本轮回归覆盖未覆盖或删除并行开发线的门禁。

本地 clone 继续受已记录的容器 DNS 限制影响，本轮没有重复执行已知失败的网络 clone；GitHub Actions 提供当前提交的权威验证证据。

## Self review

### correctness

- 相同逻辑 Feedback 使用相同 stable event ID 与 idempotency key。
- 两个独立 request_id 不会改变逻辑动作身份。
- 并发提交结果保持同一 Ack 与 revision。

### security / permission

- 本组件没有放宽 Session、Workspace Grant、server authorization 或 capability 判断。
- 没有新增客户端凭证、服务端 token 或日志泄漏。

### state truth

- fixture 明确区分 HTTP request count 与 logical side effect count。
- 没有伪造真实 AWKN exactly-once 通过；真实网络证据继续标记为 W8 dependency。

### contract

- 不新增 ProductOperation。
- 不改变 FeedbackEvent、Error Taxonomy、revision 或 idempotency Contract。

### regression

- `typecheck` PASS。
- `test:p0` PASS。
- 全量 `test:p6` PASS。
- `build` PASS。

## Hard Gate

```text
duplicate submit new logical key = 0
duplicate submit second logical append = 0
stable event identity drift = 0
trace loss = 0
P0 regression = 0
W7-14 retry scope leakage = 0
```

## Known limitations

- W7-14 duplicate retry 尚未关闭。
- W7-15 active-session permission revoke 尚未关闭。
- W7-16 dependency temporarily unavailable 尚未关闭。
- Real AWKN network-level same-key retry / exactly-once evidence进入 P6-W8。
- PR #2 仍需在文档 PR #1 处理后 retarget / rebase 才具备正式合并条件。

## Next

下一顺序组件为 `P6-W7-14 duplicate retry`。该组件只有在共享 Ledger 中保持 READY / UNCLAIMED 时才可由后续 Worker 领取；本轮不继续进入下一工作单元。
