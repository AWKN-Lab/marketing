# P6-W7H Rate Limit Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-08 rate limit`。按照当前开发规则，CI/CD、部署、凭证与真实 AWKN 上游等待只记录、不阻断独立主线；因此本 Baseline 不声明尚未观察到的 CI PASS。P6-W7 整体继续保持 `IN_PROGRESS`。

## Baseline

- Starting baseline: `db0e0d412a44c3bd216754389a1072986b74087a`（P6-W7G Upstream 5xx）
- Implementation commits:
  - `a5e9c72f581e25fa2e07e976b5fcb5c8e349ac2a`
  - `766ea500545a3d38971282426fdd4aeb8978822d`
  - `81a33c0335298e79b6e6bba2816b3d49e678787c`
- Branch: `feature/p6-real-awkn-integration`
- CI status at handoff: not awaited by current execution rule.

## Closed scope

W7-08 收紧 `/api/product` 对 HTTP 429 的产品层语义。

### 1. Stable rate-limit taxonomy

```text
HTTP 429
→ ok=false
→ RATE_LIMITED
→ retryable=true
→ trace_id preserved when upstream provides it
→ no data / no Entity Ack / no revision Ack
```

即使上游返回未知 vendor code 或 `retryable=false`，HTTP 429 在营销产品层仍统一为可安全重试的 `RATE_LIMITED`。

### 2. False-success 429 rejection

```text
HTTP 429
body = { ok:true, data:{ entity_id, revision, updated_at } }

→ reject success envelope
→ RATE_LIMITED
→ retryable=true
→ success data cannot enter local projection
```

HTTP rate-limit status优先于不可能的成功信封，防止平台被限流时制造本地假成功。

### 3. Retry-After boundary

产品 API 只透传安全、可解析的标准 `Retry-After`：

```text
integer seconds (1–6 digits)
or valid HTTP-date
```

非法、超长或不可解析值不会向下游传播。Retry-After 保持在 HTTP transport header 边界，不扩张 Product Domain error schema。

### 4. Same logical retry

```text
base revision = r4
idempotency key = K

first attempt
→ HTTP 429
→ side effect = 0

retry same logical action
→ same idempotency key K
→ success Ack r5
→ logical side effect = 1
```

限流重试不会生成新的逻辑动作身份或第二个逻辑副作用。

## Test evidence

新增：

```text
scripts/p6-rate-limit.ts
npm run test:p6:rate-limit
```

并加入统一：

```text
npm run test:p6
```

覆盖：

```text
429 → RATE_LIMITED
retryable=true
trace preservation
Retry-After seconds relay
invalid Retry-After dropped
malformed 429 normalization
HTTP 429 + ok=true rejection
no fake success data
same idempotency key retry
stable entity_id
monotonic revision
logical side effect count = 1
```

## Files

```text
app/api/product/route.ts
scripts/p6-rate-limit.ts
package.json
```

## Hard Gate implemented

```text
429 fake success = 0
vendor rate-limit code leakage = 0
RATE_LIMITED retryability ambiguity = 0
invalid Retry-After propagation = 0
same-key retry duplicate logical write = 0
revision rollback = 0
```

## Known limitations

- 本组件使用受控 Product upstream；真实 AWKN gateway rate-limit 策略、共享配额、Retry-After 精度和跨副本 idempotency receipt 证据进入 P6-W8。
- 本组件只保留 transport-level Retry-After，不新增 Domain 字段；客户端自动退避策略不在本工作包扩展。
- malformed response 的非 429/5xx 路径、duplicate submit、active-session revoke 尚未全部关闭。
- P6-W7 remains `IN_PROGRESS`.

## Next

下一最小组件：`P6-W7-09 malformed response`。

重点验证 2xx malformed envelope、错误 Ack、未知状态和不完整 success response 必须稳定失败，不能进入产品投影；保留 trace，并保持 side effect 真值为 UNKNOWN/已知值。CI/CD 等硬阻断继续只记录、不等待。
