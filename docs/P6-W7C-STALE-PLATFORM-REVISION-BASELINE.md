# P6-W7C Stale Platform Revision Baseline

## Status

`COMPONENT_VERIFIED`

本组件关闭 `P6-W7-03 local revision > server revision anomaly`。P6-W7 整体继续保持 `IN_PROGRESS`，本轮没有进入 W7-04 及后续故障项。

## Baseline

- Starting baseline: `963995df55285aa44a645cb59b6c1cac2fd4a29d`（P6-W7B Platform-Newer Revision Reconcile）
- Implementation commits:
  - `2a9c25907e538aeefa16d80c57cb4bd9b8e82107`
  - `de6335c76a4ff44ceb13e1a45c9218f5150053bf`
  - `ddb392a2f76843a5157f2c35690a2fdc79acc1bb`
  - `bff973ac399961ab15eb1be0f59141666f1ebe9f`
- Passing GitHub Actions: `33930036122`
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

当产品本地已知平台 baseline revision 高于本次 server read revision 时，系统固定进入 `stale-platform` anomaly：

```text
known baseline revision 4
server revision 3
local/platform content identical
→ stale-platform
→ INVALID_REVISION
→ accept platform = blocked
→ keep local and write = blocked
→ side effect = 0

known baseline revision 4
server revision 3
stale server content differs
→ stale-platform
→ INVALID_REVISION
→ stale content cannot be accepted
→ stale base revision cannot be used for write
→ side effect = 0
```

revision 异常优先于 fingerprint 判断。平台返回更旧 revision 时，即使内容看起来合理，也不能进入正常冲突解决动作。

## Production hardening

`lib/reconcile.ts` 新增 `reconcileResolutionPolicy()`：

```text
clean
→ no resolution action

stale-platform
→ canAcceptPlatform = false
→ canKeepLocalAndWrite = false
→ errorCode = INVALID_REVISION

local-newer / platform-newer / conflict / unbased
→ normal explicit resolution path remains available
```

`components/entity-reconcile-panel.tsx` 使用同一 Policy：

- stale platform 读回后显示明确异常提示；
- 隐藏“采用 AWKN 版本”；
- 禁用“保留本地并回写”；
- `keepLocal()` 内保留第二层 guard，避免 UI 状态异常触发网络写入；
- stale read 不调用 `markPlatformSnapshotAccepted()`，本地已知 baseline revision 保持不变。

## Fault matrix evidence

新增 `scripts/p6-revision-w7-03.ts`，故障记录包含：

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

本组件的异常路径固定：

```text
error code = INVALID_REVISION
retryable = false
idempotency key = null
side effect count = 0
final revision = existing known baseline revision
```

## Test evidence

新增独立门禁：

```text
npm run test:p6:revision-w7-03
```

并已加入统一 `npm run test:p6`。

覆盖：

```text
lower server revision + same content
→ stale-platform

lower server revision + different stale content
→ stale-platform

stale-platform
→ accept blocked
→ write blocked
→ INVALID_REVISION

current revision + local edit
→ local-newer
→ normal explicit resolution remains available
```

## Files

```text
lib/reconcile.ts
components/entity-reconcile-panel.tsx
scripts/p6-revision-w7-03.ts
package.json
```

## Hard Gate

当前 W7-03 结果：

```text
stale platform false-clean = 0
stale platform auto-accept = 0
stale revision write side effect = 0
known baseline revision downgrade = 0
stale content accepted as current = 0
missing anomaly error code = 0
P0–P6 prior regression = 0
```

## Known limitations

- 本组件验证营销产品层 stale revision anomaly，使用受控读回快照；真实 AWKN 数据库事务、跨副本读取、网络乱序与最终一致性证据继续进入 W7 后续组件与 P6-W8。
- W7-04 concurrent update、W7-05 stale retry、timeout、5xx、rate limit、malformed response、duplicate submit、active-session revoke 尚未关闭。
- stale platform anomaly 当前要求重新读取平台状态后再处理；自动重试与并发恢复策略留给 W7-04/W7-05。
- P6-W7 仍为 `IN_PROGRESS`，本 Baseline 只代表 W7-03 组件通过。

## Next

下一最小组件：`P6-W7-04 concurrent update`。重点验证两个并发写基于同一 revision 时只有一个成功，另一个稳定进入 `REVISION_CONFLICT`，不得发生 silent overwrite；失败写不增加业务副作用，冲突方读回后可解释并恢复。
