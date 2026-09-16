# P6-W7K Missing Entity Ack Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-11 missing entity ack`。P6-W7 整体继续保持 `IN_PROGRESS`。

## Baseline

- Starting baseline: `cbc47c3b12f04b6978c3f2ea103069820e15fe05`（P6-W7J Malformed Success Payload）
- Shared ledger creation / claim: `82382358b35cb0c6b3d1567baa0f32b9347b22b9`
- Test implementation: `cd02eb0dbe8df72c98cbded356b14ddeb7b9701f`
- Unified P6 gate wiring: `73dede8a0b068c16db506adadfe69783c32bc927`
- Branch: `feature/p6-real-awkn-integration`

## Closed scope

本轮只验证 HTTP 成功响应中的持久化 Ack 缺失，不进入 W7-12 identity mismatch。

覆盖：

```text
ok=true + data missing
→ MISSING_ENTITY_ACK

ok=true + entity_id missing
→ MISSING_ENTITY_ACK

ok=true + entity_id present + revision missing
→ INVALID_REVISION

ok=true + entity_id/revision present + updated_at missing
→ VALIDATION_ERROR
```

所有失败结果保持：

```text
ok=false
success data projection = 0
trace_id preserved
```

`/api/product` route-level 额外验证：HTTP 200 upstream 缺失 `entity_id` 时，Marketing Product boundary 返回 HTTP 502，并保留稳定 `MISSING_ENTITY_ACK`。

## Production assessment

现有 `lib/product-contract.ts` 的 `validateEntityEnvelope()` 与 `validateStableEntityAck()` 已具备所需 fail-closed 行为，因此本组件没有修改生产 Contract。新增工作集中于独立 Failure Hardening 证据，避免重复实现。

## Test evidence

新增：

```text
scripts/p6-missing-entity-ack.ts
npm run test:p6:missing-entity-ack
```

并接入：

```text
npm run test:p6
```

## Verification

GitHub Actions run `33935147667` 对提交 `73dede8a0b068c16db506adadfe69783c32bc927` 实际执行并通过：

```text
npm install                 PASS
npm run typecheck           PASS
npm run test:p0             PASS
npm run test:p6             PASS
npm run build               PASS
```

本地执行通道另行尝试 clone repository，容器 DNS 无法解析 `github.com`：

```text
fatal: unable to access 'https://github.com/AWKN-Lab/marketing.git/': Could not resolve host: github.com
```

该本地环境限制不影响 GitHub Actions 的完整验证结果，未进行无限重试。

## Hard Gate

```text
missing entity Ack fake success = 0
missing entity Ack data projection = 0
missing Ack trace loss = 0
missing revision accepted = 0
missing updated_at accepted = 0
W7-12 identity mismatch scope leakage = 0
P0 regression = 0
```

## Reviewer / external blockers carried forward

- Real AWKN server-side exactly-once evidence remains for P6-W8.
- Real Session / Product / Material credentials and final authorization remain for P6-W8.
- Cross-service trace evidence remains for P6-W8.
- PR #2 remains stacked on docs PR #1 / old main baseline and requires retarget/rebase before formal merge.

## Next

下一未领取最小组件：`P6-W7-12 identity mismatch`。

只处理平台成功响应 ID 与产品 stable entity ID 不一致时的稳定阻断；duplicate submit 留给 W7-13。
