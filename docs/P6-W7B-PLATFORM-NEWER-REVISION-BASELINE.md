# P6-W7B Platform-Newer Revision Reconcile Baseline

## Status

`COMPONENT_VERIFIED`

本组件关闭 `P6-W7-02 local revision < server revision`。P6-W7 整体继续保持 `IN_PROGRESS`，本轮没有进入 W7-03 及后续故障项。

## Baseline

- Starting baseline: `b39cc092fecb639b28029eb0efa169630190863a`（P6-W7A Equal Revision Reconcile）
- Implementation commits:
  - `38b159b43fc1f93b217a3ed78f366b3ba171e073`
  - `983a438b41dffbad80040d2f47568f45f3beef04`
  - `3ddb2251862a7344afbd6bc65aeb7de0a163bc40`
- Passing GitHub Actions: `33929544248`
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

W7-02 验证产品已知平台 revision 低于当前 server revision 时，较新的平台 revision 必须保持可见，不能被旧本地投影静默吞掉。

覆盖四个关键语义：

```text
baseline revision 3
server revision 4
local snapshot unchanged
platform snapshot changed
→ platform-newer

baseline revision 3
server revision 4
local snapshot changed
platform snapshot changed
→ conflict

explicitly accept platform revision 4
→ new baseline revision 4
→ clean

baseline revision 3
server revision 4
local/platform content identical
→ platform-newer
```

最后一个场景专门验证 revision 本身就是状态权威信息。即使实体内容 fingerprint 完全一致，只要 server revision 高于本地已知 baseline revision，系统仍不能把状态判成 `clean`。

## Fault matrix evidence

W7-02 继续使用 `P6FaultMatrixRecord` 记录：

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

本组件以只读 reconcile 为主，因此所有验证：

```text
side effect count = 0
idempotency key = null
```

平台较新状态的接受属于显式用户动作；测试只验证接受后的新 baseline 一致性，不允许后台静默覆盖用户本地编辑。

## Test evidence

`scripts/p6-revision.ts` 新增：

```text
W7-02 newer server revision is authoritative when local snapshot is unchanged
W7-02 local edit plus newer server revision remains a conflict
W7-02 explicit platform acceptance establishes the newer revision baseline
```

新增独立门禁：

```text
scripts/p6-revision-w7-02.ts
npm run test:p6:revision-w7-02
```

该门禁专门覆盖：

```text
higher server revision
+ identical local/platform content
→ platform-newer
```

并已加入统一 `npm run test:p6`。

## Files

```text
scripts/p6-revision.ts
scripts/p6-revision-w7-02.ts
package.json
```

## Hard Gate

当前 W7-02 结果：

```text
newer server revision false-clean = 0
newer platform state hidden by old local projection = 0
local edit silently discarded = 0
explicit platform acceptance revision regression = 0
revision-only platform change loss = 0
read side effect = 0
P0–P6 prior regression = 0
```

## Known limitations

- 本组件验证营销产品层 reconcile 语义，使用受控快照；真实 AWKN 并发事务、网络乱序和跨服务 revision 证据继续进入 W7 后续组件与 P6-W8。
- `local revision > server revision anomaly`、concurrent update、stale retry、timeout、5xx、rate limit、malformed response、duplicate submit、active-session revoke 尚未关闭。
- 显式“保留本地并回写”仍属于用户主动冲突处理路径，后续 concurrent/stale retry 组件继续验证其 revision 与幂等行为。
- P6-W7 仍为 `IN_PROGRESS`，本 Baseline 只代表 W7-02 组件通过。

## Next

下一最小组件：`P6-W7-03 local revision > server revision anomaly`。重点验证平台返回低于本地已知 baseline 的 revision 时必须进入 `stale-platform` / anomaly 路径，禁止自动接受、禁止静默降级本地 revision，并保留可追踪故障记录。
