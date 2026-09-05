# P6-W6A Learning Baseline

## Status

`COMPONENT_VERIFIED`

P6-W6A `Learning` 已完成开发环境验证，关闭 W6-01～W6-07。P6-W6 整体继续保持 `IN_PROGRESS`；W6-08～W6-15 Evolution 留在下一组件。真实 AWKN Learning / Product Service 的网络级验收继续进入 P6-W8。

## Baseline

- Starting baseline: `52c489d98f8ced2938936cdddbba1dc9ef5a3601`（P6-W5 Feedback & Outcome）
- W6A implementation: `8384ffedfb960db08409dc868b817c49a5706665`
- Type narrowing fix: `d0c3a3371de22d83a90d9340817bba97586a8c83`
- Passing GitHub Actions: `33924371156`
- Branch: `feature/p6-real-awkn-integration`

Verification:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

P0–P5、P6-W0～W5 原有门禁保持完整；新增 `npm run test:p6:learning` 已进入统一 `test:p6`。

首次实现 CI `33924235213` 在 TypeScript 检查发现 `payload.attempt` 未完成类型收窄。修复仅调整 retry attempt 的类型守卫，未调整产品语义或降低 Hard Gate。

## Closed scope

### W6-01 Learning Watch upsert

`learning.watch.upsert` 增加专项 Contract Gate。稳定 Watch ID 固定为：

```text
watch-{workspaceId}
```

请求强制校验 Workspace identity、topics、sourceTypes、daily cadence、enabled、updatedAt。幂等键由稳定 Watch 状态派生，`updatedAt` 不参与逻辑动作身份，同一 Watch 内容重复同步复用同一 key。

### W6-02 Learning run async execution

`learning.run` 继续通过 `/api/product` 接 AWKN Product Service，并增加 `logical_action_id`。同一个逻辑学习动作固定使用：

```text
learning.run:{watchId}:{logicalActionId}
```

受控上游验证：

```text
2 HTTP attempts
1 logical side effect
same run_id
```

### W6-03 Learning run get

`learning.run.get` 强制绑定当前 Workspace、稳定 Watch ID 与目标 `run_id`。平台成功响应必须保持：

```text
entity_id == run_id
```

并继续满足 revision、updated_at、canonical status 等通用 Product Contract。

### W6-04 Retry keeps logical run identity

Learning retry 继续使用原 `run_id`，物理重试由递增 `attempt` 表达：

```text
learning.run.retry:{runId}:attempt:{attempt}
```

retry 请求要求 `attempt >= 2`；平台返回的 `run_id` 必须与失败运行一致，返回 attempt 必须与请求一致。UI 只在收到同一 run identity 与递增 attempt 后覆盖失败记录。

### W6-05 Truthful async status

产品 canonical Learning 状态固定为：

```text
queued
running
completed
failed
```

`normalizeLearningRun()` 对历史兼容别名继续归一化；未知或缺失状态返回 `null`，禁止静默落入 queued。平台 Contract 只接受 canonical status。

### W6-06 Signal source / trace

Learning Signal 继续强制非空 `source`。存在 Signal 自身 trace 时保留自身 trace；缺少 Signal trace 时继承 Learning Run / response trace，支持后续跨服务定位。

Signal 若携带 Workspace / Watch identity，则必须与当前请求作用域一致；跨 Workspace / Watch Signal 在产品投影前失败。

### W6-07 Revoked Workspace isolation

现有 P5 权限模型继续作为 Learning 产品侧门禁：

```text
learning.manage capability
+ Workspace write Grant
→ Learning action eligible
```

Learning Poller 继续通过 readable Workspace projection 过滤待轮询运行。Workspace Grant 撤销后，Learning action eligibility 为 false，缓存运行退出可见/polling 集合。真实服务端最终授权仍由 AWKN 上游执行。

## Negative / adversarial coverage

新增：

```text
npm run test:p6:learning
```

覆盖：

- stable Watch ID
- Watch state-derived idempotency
- Watch identity drift
- malformed Watch idempotency key
- duplicate Watch upsert
- stable logical learning.run idempotency
- duplicate logical learning run
- retry same run identity
- retry attempt monotonicity
- retry run identity mismatch
- unknown Learning status rejection
- Signal source preservation
- Signal trace preservation
- malformed Signal source rejection
- revoked Workspace visibility
- revoked Workspace action eligibility

## Files

```text
lib/learning-contract.ts
lib/learning-run-client.ts
lib/learning-run-store.ts
app/api/product/route.ts
components/learning-watch.tsx
scripts/p6-learning.ts
package.json
```

## Known limitations

- 当前自动测试使用受控 AWKN Product upstream；真实 Learning / Product Service endpoint、真实凭证、最终服务端授权、真实网络 exactly-once 与真实调度证据进入 P6-W8 Real AWKN E2E。
- 浏览器点击“立即学习一次”时每次用户动作生成新的 `logical_action_id`；同一网络级逻辑动作的 retry 必须由调用方复用该 ID。当前 UI 对已获得 `run_id` 的失败运行使用稳定 run identity + attempt retry。
- P6-W6 Evolution 尚未开始，W6 全局 Hard Gate 暂不升级为 PASS。

## Next

下一最小组件：`P6-W6B Evolution`，范围仅覆盖 W6-08～W6-15：Candidate evidence chain、stable Candidate ID + revision、`evolution.review`、accepted/scoped/rejected 一致性、Scoped Experience、Counterexample、Reviewed Experience matching、review revision conflict。
