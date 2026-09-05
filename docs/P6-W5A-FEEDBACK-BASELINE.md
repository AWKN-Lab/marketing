# P6-W5A Feedback Baseline

## Status

`COMPONENT_VERIFIED`

P6-W5 `Feedback & Outcome` 继续保持 `IN_PROGRESS`。本组件仅关闭 Feedback append contract；Outcome、Outcome taxonomy、pending / unknown 与完整 event/projection consistency 留给 P6-W5B。

## Baseline

- Starting baseline: `f2f4de5548388421744b8bf702ff60f68771ad26`（P6-W4 Agent Execution）
- Feedback implementation: `e35ff483e07953afb8ab7f6aa1fa944e8ebabd41`
- Test-harness typing fix: `c27521da687058201b19df8a0b90506358b00abe`
- GitHub Actions: `33919722526`
- Branch: `feature/p6-real-awkn-integration`

Verification:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

P0–P5、P6-W0～W4 原有门禁保持完整；新增 `npm run test:p6:feedback` 已进入统一 `test:p6`。

## Closed scope

### W5-01 Feedback write path

`feedback.record` 继续通过 `/api/product` → AWKN Product Service Adapter。产品层新增 Feedback 专项 contract，成功响应必须返回当前稳定 Feedback Event ID 的持久化 Ack。

### W5-03 Stable append event identity — Feedback side

新增 `FeedbackEvent`：

```text
id
workspace_id
task_id
task_execution_id
feedback
artifact_title
ai_draft
user_final
edit_count
run_id?
trace_id?
```

稳定事件 ID：

```text
feedback-event:{taskId}:{deterministic fingerprint}
```

逻辑身份包含 Workspace / Task / Task Execution、Feedback、Artifact、AI Draft、User Final、editCount 与 run_id；trace_id 不参与事件身份，因此网络 trace 变化不会创建第二个逻辑事件。

### W5-04 Duplicate-submit idempotency — Feedback side

幂等键固定为：

```text
feedback.record:{feedbackEventId}
```

同一 Feedback 逻辑事件使用不同 request_id 重试时继续复用同一 event ID 与 idempotency key。

受控上游验证：

```text
2 HTTP attempts
1 logical append side effect
same Feedback Event ID
```

### W5-05 AI Draft / User Final association

Feedback Event 同时保存：

```text
ai_draft
user_final
```

当前 Agent Artifact 作为 AI Draft；用户当前编辑文本作为 User Final。后续 Experience / Eval 可以从同一 Feedback Event 读取两侧版本。

### W5-06 editCount

Feedback Event 保存 `edit_count`。计算继续沿用当前 Artifact Diff 的行级语义：删除行数 + 新增行数。

服务端 contract 会重新计算并验证 edit_count，阻止客户端提交失真的差异计数。

### W5-09 task / workspace / trace association — Feedback side

Feedback Event 强制绑定：

```text
workspace_id = request workspace_id
task_id = request task_id
task_execution_id = task-execution:{taskId}
run_id = current Agent run when available
trace_id = current Agent trace when available
```

Workspace / Task / Task Execution identity 漂移在上游调用前返回 `IDENTITY_MISMATCH`。

## Negative / adversarial coverage

新增：

```text
npm run test:p6:feedback
```

覆盖：

- Feedback disposition enum
- stable Feedback Event ID
- stable idempotency key
- AI Draft / User Final association
- editCount calculation and server-side validation
- Workspace identity mismatch
- Task Execution identity mismatch
- tampered Feedback Event ID
- malformed idempotency key
- duplicate logical append
- ACK entity identity mismatch
- trace preservation

## Implementation note

首个实现提交 `e35ff483e07953afb8ab7f6aa1fa944e8ebabd41` 的 CI 在测试 Harness 出现 TypeScript closure narrowing：测试闭包内赋值的 `forwardedEvent` 在断言处被收窄成 `never`。生产 contract 未受影响。

随后提交 `c27521da687058201b19df8a0b90506358b00abe` 仅修复测试变量类型初始化，没有调整业务契约或降低 Hard Gate。完整 CI `33919722526` 全绿。

## Files

```text
lib/feedback-contract.ts
app/api/product/route.ts
components/artifact-workspace.tsx
scripts/p6-feedback.ts
package.json
```

## Known limitations

- 当前自动测试使用受控 AWKN Product upstream；真实 Product Service endpoint、真实凭证、最终服务端授权与网络级 exactly-once 证据继续进入 P6-W8 Real AWKN E2E。
- append Ack 的 revision / updated_at 由 AWKN Product Service 提供；产品层已强制验证 Ack envelope 与稳定 event identity。
- 本组件没有实现 Outcome contract，P6-W5 仍为 `IN_PROGRESS`。
- Outcome taxonomy version、pending / unknown、Outcome stable append ID 以及 Feedback / Outcome event 与 Task Execution 的完整一致性继续进入 P6-W5B。
- UI 信息架构没有改动。

## Rollback

如 W5A 引入回归，回退到最近完整 W4 已验证基线：

```text
f2f4de5548388421744b8bf702ff60f68771ad26
```

## Next

下一最小组件：

```text
P6-W5B Outcome
W5-02 outcome.record
W5-03 stable append event identity — Outcome side
W5-04 duplicate-submit idempotency — Outcome side
W5-07 versioned Outcome taxonomy
W5-08 pending / unknown
W5-09 task / workspace / trace association — Outcome side
W5-10 event stream ↔ Task Execution projection consistency
```

P6-W5B 继续继承 P0–P5 与 P6-W0～W5A 全部 Hard Gate。
