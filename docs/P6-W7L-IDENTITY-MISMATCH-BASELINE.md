# P6-W7L Identity Mismatch Baseline

## Status

`COMPONENT_IMPLEMENTED`

本组件关闭代码范围 `P6-W7-12 identity mismatch`。P6-W7 整体继续保持 `IN_PROGRESS`。

## Baseline

- Starting baseline: `docs/P6-W7K-MISSING-ENTITY-ACK-BASELINE.md`
- Claim commit: `246c1b035a416c83b0b974e011c2b1f21f88f2a2`
- Test implementation: `5805d4ff45e8fd4888bb364dd47d271be1994420`
- Unified P6 gate wiring: `2b43746fc57736108f4869fe108188a10cb88c1e`
- Verified descendant: `c61d83676e451697b6f86c6934c19342221928de`
- Branch: `feature/p6-real-awkn-integration`

## Closed scope

本轮只验证平台成功响应中的实体身份与产品 stable entity ID 不一致时必须 fail closed，不进入 W7-13 duplicate submit。

覆盖：

```text
persistent Ack entity_id != expected entity ID
→ IDENTITY_MISMATCH

entity-read envelope entity_id == expected ID
but entity snapshot id != expected ID
→ IDENTITY_MISMATCH

HTTP 200 upstream + wrong entity_id
→ Marketing Product boundary HTTP 502
→ stable IDENTITY_MISMATCH
```

所有失败结果保持：

```text
ok=false
success data projection = 0
trace_id preserved
product stable entity ID unchanged
final accepted revision unchanged
```

Route-level 受控测试同时确认请求仍携带原始 `workspace_id` 与确定性 `idempotency_key`，错误平台实体不会替换产品身份。

## Production assessment

现有 `lib/product-contract.ts` 已在 `validateEntityEnvelope()` 中校验 expected entity ID，在 `entity-read` 契约中继续校验实体快照 ID；`validateStableEntityAck()` 同样 fail closed。现有 `/api/product` 会将 HTTP 200 上的契约失败转换为产品边界 HTTP 502。因此本组件无需修改生产 Contract，新增独立 Failure Hardening 证据即可闭环。

## Test evidence

新增：

```text
scripts/p6-identity-mismatch.ts
npm run test:p6:identity-mismatch
```

并接入：

```text
npm run test:p6
```

## Verification

GitHub Actions run `33936523667` 在包含 W7-12 实现的 descendant `c61d83676e451697b6f86c6934c19342221928de` 实际执行并通过：

```text
npm install                 PASS
npm run typecheck           PASS
npm run test:p0             PASS
npm run test:p6             PASS
npm run build               PASS
```

该 descendant 仅在 W7-12 gate wiring 之后追加了 Marketing-A 对 W7-13 的账本 CLAIM，不改变 W7-12 代码与测试语义。

## Hard Gate

```text
wrong Ack entity accepted = 0
wrong read snapshot accepted = 0
identity mismatch success data projection = 0
identity mismatch trace loss = 0
product stable entity ID replacement = 0
identity mismatch accepted revision advance = 0
W7-13 duplicate-submit scope leakage = 0
P0 regression = 0
```

## Reviewer / external blockers carried forward

- Real AWKN server-side exactly-once evidence remains for P6-W8.
- Real Session / Product / Material credentials and final authorization remain for P6-W8.
- Cross-service trace evidence remains for P6-W8.
- Agent logical action context-version risk and UI retry same-action semantics remain reviewer concerns.
- Material lower-revision projection guard and `PLATFORM_NOT_CONFIGURED` taxonomy consistency remain release-review concerns unless later baselines close them.
- W7-15 active-session revoke requires explicit server-side side-effect denial evidence plus visible projection / Experience / Learning isolation.
- PR #2 remains stacked on docs PR #1 / old main baseline and requires retarget/rebase before formal merge.

## Next

Marketing-A 已领取 `P6-W7-13 duplicate submit`。Marketing-B 下一轮重新 REHYDRATE 后，只从未领取且与 A 核心文件集正交的 READY 工作中选择一个 Atomic Work Unit。
