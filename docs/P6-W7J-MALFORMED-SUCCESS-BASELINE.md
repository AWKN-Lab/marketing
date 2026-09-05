# P6-W7J Malformed Success Payload Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-10 malformed success payload`。P6-W7 整体继续保持 `IN_PROGRESS`。

## Baseline

- Starting baseline: `a8ae5220832d7dc10aca0544ac6d5bcd9f68460e`（P6-W7I Malformed JSON Baseline）
- Scope-correction commits:
  - `e9de2ebc9ee84dd754780dedd203e80bfdbda392`
  - `0eff7d31daad5d6fe9367d68d2d904022625b8de`
- W7-10 implementation commits:
  - `75acf0537d8ac4620f5843be2469fd74ee305146`
  - `07c404b94d5babb54572ed0b82ee14d420e2b28d`
  - `04778e26948908db5359bf897207ec4977e732f5`
  - `d46ee247e08fc241e600b26bbea9c9d85fd05527`
- Branch: `feature/p6-real-awkn-integration`
- CI observed at handoff: GitHub Actions `33933564829` = `in_progress`; not awaited by current execution rule.

## Scope correction

开发线 B 一度加入跨 W7-10 / W7-11 / W7-12 的通用 malformed contract matrix。读取 `docs/DEVELOPMENT-PLAN.md` 与 W7I Baseline 后确认故障项必须继续拆开：

```text
W7-09 malformed JSON
W7-10 malformed success payload
W7-11 missing entity ack
W7-12 identity mismatch
```

因此已删除过宽 `scripts/p6-malformed-contract.ts`，并移除其统一 Gate 接线。本组件只处理 HTTP 成功信封已经具备稳定 entity envelope，但 operation-specific 业务状态字段异常的情况。

## Closed scope

本轮关闭 `material.parse.get` 的成功 payload 状态真值缺口。

此前通用 Product Contract 会验证：

```text
entity_id
revision
updated_at
```

但 `material.parse.get` 属于 `entity-state`，一个带完整 entity envelope、却缺少或伪造解析状态的 HTTP 200 响应仍可能继续进入产品投影。

现在增加 `validateMaterialProductResponse()`：

```text
material.parse.get
+ ok=true
+ valid entity envelope
+ parse_status / status missing
→ VALIDATION_ERROR
→ retryable=false
→ trace_id preserved
→ success projection = 0

material.parse.get
+ unknown / non-text parse state
→ VALIDATION_ERROR
→ success projection = 0
```

支持已有 Material upstream 状态别名，包括：

```text
queued / waiting / pending
parsing / processing / extracting / indexing / running / in_progress
ready / completed / complete / done / parsed / success / succeeded
failed / error / rejected
```

本组件不改变 `material_id`、revision、retry、upload 或 parse state store 语义。

## Product boundary

`/api/product` 的成功响应校验顺序增加 Material 专项 Gate：

```text
normalizeProductResponseContract
→ server failure normalization
→ rate-limit normalization
→ validateMaterialProductResponse
→ Task / TaskExecution / Learning / Evolution response gates
→ product projection
```

Material payload 校验失败时，HTTP 200 upstream 会在 Marketing Product boundary 转为 HTTP 502，并保留稳定 `VALIDATION_ERROR`。

## Test evidence authored

新增：

```text
scripts/p6-malformed-success.ts
npm run test:p6:malformed-success
```

并加入统一：

```text
npm run test:p6
```

覆盖：

```text
missing parse status
unknown parse status
non-text parse status
supported parse_status values
supported status aliases
trace preservation
fake success projection = 0
read side effect = 0
```

A 线同期新增的 `test:p6:adapter-http-failure` 已保留，本轮 package 更新没有覆盖该并行门禁。

## Hard Gate implemented

```text
malformed material success payload fake success = 0
missing business state accepted = 0
unknown business state accepted = 0
trace loss = 0
malformed read side effect = 0
W7-11 missing entity ack scope leakage = 0
W7-12 identity mismatch scope leakage = 0
```

## Verification status

本轮没有声明未观察到的 PASS。

- GitHub Actions run `33933564829` 在 Baseline 生成前处于 `in_progress`。
- CI/CD、部署、凭证与真实 AWKN upstream 按当前执行规则只记录、不等待，不阻断后续独立 W7 工作。
- 真实 AWKN 对 parse state 的最终 canonical enum / alias 契约仍需在 P6-W8 真联调中确认；当前保留现有产品已兼容的状态集合。

## Files

```text
lib/material-contract.ts
app/api/product/route.ts
scripts/p6-malformed-success.ts
package.json
```

## Known limitations

- W7-11 missing entity ack 尚未关闭。
- W7-12 identity mismatch 尚未关闭。
- W7-13 duplicate submit 及后续故障项尚未关闭。
- 真实 AWKN malformed success payload / gateway mutation / service-version skew 证据进入 P6-W8。

## Next

下一最小组件：`P6-W7-11 missing entity ack`。

只验证持久化成功响应缺失 `entity_id / revision / updated_at` 时的稳定阻断、trace 与零产品投影；identity mismatch 继续留给 W7-12，避免范围重叠。
