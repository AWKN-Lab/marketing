# P6-W6 Learning & Evolution Baseline

## Status

`DEVELOPMENT_VERIFIED`

P6-W6 已完成开发环境验证。W6-01～W6-07 Learning 继承 `docs/P6-W6A-LEARNING-BASELINE.md`；本轮关闭 W6-08～W6-15 Evolution。真实 AWKN Product / Learning Service 的网络级验收继续进入 P6-W8。

## Baseline

- Starting baseline: `cd4b3eb23f41863a799c1ef3fe8f7ba4da879644`（P6-W6A Learning）
- Evolution contract start: `7325ca576b268667c70b8a959ac5bb86202a231c`
- Final implementation/fix commit: `cfedcdd1a178d7236916e8bb948a778444e9f755`
- Passing GitHub Actions: `33926772203`
- Branch: `feature/p6-real-awkn-integration`

Verification:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

P0–P5、P6-W0～W6A 原有门禁保持完整；新增 `npm run test:p6:evolution` 已进入统一 `test:p6`。

## Closed scope

### W6-08 Candidate evidence chain

Experience Candidate 现在保留：

```text
AI Draft
User Final
Feedback Event ID
Outcome Event ID
Evidence refs
run_id
trace_id
```

Candidate fingerprint 同时包含 AI Draft、User Final、Feedback、Outcome、Outcome Note、Evidence refs 与 run identity。Evidence refs 在进入 Candidate 前去重并排序。

缺少 P6 Evidence / revision 的历史 Candidate 可以继续显示，但不会进入审核与下一任务经验匹配；用户需要回到来源 Task 重新生成 Candidate。

### W6-09 Stable Candidate ID + revision

Candidate ID 固定为：

```text
local-ev-{taskId}
```

同一 Candidate fingerprint 重复生成时保持相同 ID、createdAt 与 revision；业务证据变化时保持 ID 并将 revision 单调递增。

### W6-10 evolution.review Product Contract

新增 `lib/evolution-contract.ts`，`evolution.review` 进入 `/api/product` 专项 Contract Gate。

Review ID 固定为：

```text
evolution-review:{candidateId}
```

请求携带 Candidate snapshot、Candidate revision、review decision、scope、reviewer actor、可选 `base_revision`，并使用状态派生幂等键。平台成功 Ack 必须返回相同 Review ID、有效 revision、updated_at；存在 `base_revision` 时成功 revision 必须推进。

### W6-11 accepted / scoped / rejected consistency

审核 UI 在平台模式下只在平台 Ack 成功后更新本地 Review projection。失败、revision conflict 或 malformed Ack 不会把按钮状态伪装成成功。

本地模式保留 P0 行为；平台接口未配置时只记录 local-only Review，不会伪造平台确认。

### W6-12 Scoped Experience

`scoped` Review 保存来源 Workspace scope。下一任务匹配要求目标 Workspace 与 Review scope 一致。

`accepted` 允许当前 Tenant 的其他可访问 Workspace 匹配；来源 Workspace Grant 被撤销后，Candidate 会先退出 readable projection，因此无法继续复用。

### W6-13 Counterexample semantics

Outcome=`失败` 的 Candidate 固定保持：

```text
polarity = negative
type = Counterexample Candidate
```

即使 Review=`accepted`，它也只进入 Counterexample 集合，不会作为正向 Applied Experience 注入下一任务。

### W6-14 Reviewed Experience matching

下一任务只匹配满足以下条件的 Candidate：

```text
P6 evidence chain complete
+ Candidate revision valid
+ 当前 Session 可读取来源 Workspace
+ Review decision accepted/scoped
+ Review candidateRevision == current Candidate revision
+ task type match
```

Candidate 内容更新导致 revision 增长后，旧 Review 自动失效，必须重新审核后才能进入下一任务。

### W6-15 Review revision conflict

Review 更新读取已确认的 platform revision 作为 `base_revision`。上游 `REVISION_CONFLICT` 原样保留 error code 与 trace；UI 不覆盖已有 Review projection。

平台若返回成功 Ack，但 revision 没有超过 `base_revision`，产品层将其转换为 `INVALID_REVISION`，阻止静默覆盖。

## Hard Gate evidence

新增 `scripts/p6-evolution.ts`，覆盖：

```text
stable Candidate ID
Candidate revision monotonicity
duplicate Candidate snapshot stability
AI Draft / User Final / Feedback / Outcome / Evidence chain
negative Candidate Counterexample semantics
review identity / scope / candidate revision validation
review state-derived idempotency
duplicate review logical side effect
review Ack stable identity
REVISION_CONFLICT preservation
success Ack revision advancement
accepted / scoped / rejected matching
old Review invalidated by Candidate revision change
revoked Workspace candidate reuse = 0
```

受控 Product upstream 的 duplicate review 验证：

```text
2 HTTP attempts
1 logical side effect
same Review entity ID
```

W6 Hard Gate 当前结果：

```text
unreviewed candidate changes behavior = 0
revoked experience reuse = 0
review revision silent overwrite = 0
learning duplicate logical run = 0
```

## CI findings and fixes

实现过程中 CI 暴露两个回归并已修复：

1. Run `33926550474`：`new-task-button.tsx` 仍将 Review store 声明为 `Record<string,string>`，无法接受 revision-aware Review state。修复后使用 `EvolutionReviewValue`。
2. Run `33926669338`：既有 P6 Permission Candidate fixture 缺少新增 Evidence / revision，导致可访问 Candidate 被新的 fail-closed matching 拒绝。测试 fixture 升级到当前 Candidate Contract，原 revoked Workspace 断言保持不变。

最终 Run `33926772203` 全量通过。

## Files

```text
lib/evolution-contract.ts
lib/evolution-store.ts
app/api/product/route.ts
components/artifact-workspace.tsx
components/evolution-review.tsx
components/new-task-button.tsx
scripts/p0-acceptance.ts
scripts/p6-permission.ts
scripts/p6-evolution.ts
package.json
```

## Known limitations

- 当前自动测试使用受控 AWKN Product upstream。真实 Product Service endpoint、真实凭证、服务端最终授权、网络级 exactly-once 与跨服务 trace 证据进入 P6-W8 Real AWKN E2E。
- Candidate 当前保持产品侧稳定 ID / revision，并随 `evolution.review` 一并发送给 Product Service；真实平台对 Candidate 持久化、并发写入与审计记录仍需 P6-W8 联调确认。
- PR #2 继续叠在尚未合并的文档 PR #1 上；正式合并前需要在 #1 合并后 retarget / rebase，确保 PR #2 只保留 P6 开发差异。

## Next

下一工作包：`P6-W7 Reconcile、Retry 与故障加固`。按计划从 W7-01 开始，只选择一个当前最小可验收故障组件推进；本轮不进入 W7。
