# P6-W7I Malformed JSON Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-09 malformed JSON`。P6-W7 整体继续保持 `IN_PROGRESS`。

## Baseline

- Starting baseline: `7c9ddd8abd4470665d86fcf678da0f51db14fb95`（P6-W7H Rate Limit）
- Final implementation head before this Baseline: `aca6010e4396478824c390dfd998acbe22fe5d48`
- Branch: `feature/p6-real-awkn-integration`
- 新增门禁：`scripts/p6-malformed-json.ts`
- 新增命令：`npm run test:p6:malformed-json`
- 已接入统一：`npm run test:p6`

## Scope correction

`docs/DEVELOPMENT-PLAN.md` 将 W7 故障拆分为：

```text
W7-09 malformed JSON
W7-10 malformed success payload
W7-11 missing entity ack
W7-12 identity mismatch
```

因此本轮只保留 W7-09。开发过程中一度提前触及 Material success payload 响应校验，随后已恢复 W7H 生产代码，并删除过宽测试，避免抢跑 W7-10/11/12。

## Closed scope

受控 Product upstream 覆盖三类无法解析为 JSON 的响应：

```text
1. truncated JSON
2. HTML body with HTTP 200
3. empty HTTP 200 body
```

稳定产品结果：

```text
HTTP upstream = 200
response.json() = parse failure
raw upstream payload = null

→ ok=false
→ HTTP 502 at product boundary
→ error.code=UNKNOWN_UPSTREAM_ERROR
→ retryable=true
→ trace_id preserved from response header
→ success data projection = 0
```

## Hard Gate implemented

```text
malformed JSON fake success = 0
malformed JSON data projection = 0
malformed JSON unstable error code = 0
header trace loss = 0
retryability ambiguity = 0
```

受控 fixture 不模拟平台提交，因此故障矩阵中的 side effect count 为 0、final revision 保持 r4。真实网络条件下 malformed JSON 是否发生在平台提交前或提交后仍属于 UNKNOWN；后续 retry 必须继续遵守已建立的稳定 idempotency key 规则。

## Test evidence authored

```text
scripts/p6-malformed-json.ts
npm run test:p6:malformed-json
npm run test:p6
```

每个 case 输出 P6 Fault Matrix：

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

## Verification status

本轮没有声明未执行的 PASS。

- 当前工具环境无法直接访问 GitHub 网络以 clone repository，因此无法在本地执行 `npm run typecheck / test:p0 / test:p6 / build`。
- Baseline 生成前，最新 head `aca6010e4396478824c390dfd998acbe22fe5d48` 未观察到 GitHub Actions workflow run。
- CI/CD 按当前执行规则属于可记录并跳过的硬阻塞，不阻断后续独立 W7 组件。

## Commits in this work package

有效最终变更：

```text
7c48ab16f2a0e5f4d95cf2d79272e36e51644c4d  test: verify P6 W7 malformed JSON semantics
5a19f138306f76b9881cb11c962383670ac5df25  test: add W7 malformed JSON gate to P6 suite
aca6010e4396478824c390dfd998acbe22fe5d48  chore: remove over-scoped malformed response gate
```

范围纠偏期间产生并已被后续提交恢复的临时改动：

```text
14169d5a5a0c567d51c1762515adb44f87a5f7c4
61496da13e8b78e7f4e401c5d59f46617f577e33
67eaafd3442dea57cc819c33e19eb48c04e7b474
36e216b7ce8cebe9523f8575a61ad289e26baeb5
457449b396d5500865182cb3b3cfd6918d72c20e
a762ef596e794f4e514b052a3a6e0bb4621ea840
```

最终 tree 中生产代码已恢复到 W7H 行为；W7-09 新增资产只保留 malformed JSON 测试与统一测试入口。

## Known limitations

- W7-10 malformed success payload 尚未关闭。
- W7-11 missing entity ack 尚未关闭。
- W7-12 identity mismatch 尚未关闭。
- W7-13 duplicate submit 及后续故障项尚未关闭。
- 真实 AWKN malformed payload、网关 body truncation、跨副本幂等 receipt 证据进入 P6-W8。

## Next

下一最小组件：`P6-W7-10 malformed success payload`。

只处理 HTTP 成功状态下结构完整性与业务状态字段异常；missing entity ack 与 identity mismatch 继续分别留给 W7-11 / W7-12，避免重复覆盖。
