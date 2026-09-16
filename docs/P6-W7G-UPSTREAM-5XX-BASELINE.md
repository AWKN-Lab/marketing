# P6-W7G Upstream 5xx Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-07 upstream 5xx`。根据当前开发规则，CI/CD、部署、凭证与真实上游等待只记录、不阻断独立主线；因此本 Baseline 不声明尚未观察到的 CI PASS。P6-W7 整体继续保持 `IN_PROGRESS`。

## Baseline

- Starting baseline: `4002bfd8abffd5e6f32e7dc84b99a499f8ed1396`（P6-W7F Request Timeout）
- Implementation commits:
  - `bc0e292a1c74fdc0c77c32c42f826d8299df6e1e`
  - `59d794d66deb2441ef10d5a8add6dfc5a114dd1d`
  - `78acd5734779ca1a5fd6a09cb79c1fa84ef83a43`
- Branch: `feature/p6-real-awkn-integration`
- CI status at handoff: no workflow run observed yet; not awaited by current execution rule.

## Closed scope

W7-07 收紧 `/api/product` 对 HTTP 5xx 的产品层语义。

### 1. malformed 5xx

```text
HTTP 503
body = non-JSON / malformed
trace header exists

→ ok=false
→ UPSTREAM_UNAVAILABLE
→ retryable=true
→ trace_id preserved
→ no data / no Entity Ack / no revision Ack
```

### 2. false-success 5xx

```text
HTTP 502
body = { ok:true, data:{ entity_id, revision, updated_at } }

→ success envelope rejected
→ ok=false
→ UPSTREAM_UNAVAILABLE
→ retryable=true
→ success data not projected
```

HTTP transport status remains authoritative over an impossible success envelope，防止平台故障时制造本地假成功。

### 3. unknown vendor error code

```text
HTTP 500
error.code = VENDOR_INTERNAL_FAILURE

→ stable Product taxonomy
→ UPSTREAM_UNAVAILABLE
→ retryable=true
→ trace_id preserved
```

未知供应商错误码不会穿透产品层。

### 4. commit-before-500 / same-key retry

```text
base revision = r4
idempotency key = K

first attempt
→ upstream commits r5
→ Ack path returns HTTP 500
→ product keeps result failed / unknown
→ logical side effect = 1

retry same logical action
→ same idempotency key K
→ existing r5 Ack returned
→ logical side effect remains 1
```

5xx 不会成为创建第二个逻辑写入的理由。

## Test evidence

新增：

```text
scripts/p6-upstream-5xx.ts
npm run test:p6:upstream-5xx
```

并加入统一：

```text
npm run test:p6
```

覆盖：

```text
malformed 503
header trace preservation
unknown vendor 500 code normalization
HTTP 5xx + ok=true rejection
no fake success data
retryable UPSTREAM_UNAVAILABLE
commit-before-500
same idempotency key replay
stable entity_id
monotonic revision
logical side effect count = 1
```

## Files

```text
app/api/product/route.ts
scripts/p6-upstream-5xx.ts
package.json
```

## Hard Gate implemented

```text
5xx fake success = 0
unknown vendor error code leakage = 0
malformed 5xx unstable mapping = 0
5xx trace loss when upstream trace exists = 0
same-key retry duplicate logical write = 0
revision rollback = 0
```

## Known limitations

- 本组件使用受控 Product upstream；真实 AWKN gateway / service mesh / database 5xx 与跨副本 idempotency receipt 证据进入 P6-W8。
- 真实网络中 5xx 是否发生在 commit 前或 commit 后仍属于 UNKNOWN，调用方只能使用稳定 idempotency key 安全重试。
- `rate limit`、`malformed response` 的非 5xx 路径、`duplicate submit`、`active-session revoke` 尚未全部关闭。
- P6-W7 remains `IN_PROGRESS`.

## Next

下一最小组件：`P6-W7-08 rate limit`。

重点验证 HTTP 429 / `RATE_LIMITED`、retryable 语义、trace 保留、Retry-After 信息边界，以及同一逻辑副作用重试继续保持稳定 idempotency key。CI/CD 等硬阻断继续只记录，不等待。
