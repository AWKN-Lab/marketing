# P6-W5 Feedback & Outcome Baseline

## Status

`DEVELOPMENT_VERIFIED`

P6-W5 `Feedback & Outcome` 已完成开发环境验证。W5-01～W5-10 已在产品 Contract、受控 Product upstream、Task Execution 投影与 UI 入口中形成闭环；真实 AWKN Product Service 的网络级验收继续进入 P6-W8。

## Baseline

- Starting baseline: `f2f4de5548388421744b8bf702ff60f68771ad26`（P6-W4 Agent Execution）
- W5A Feedback baseline: `f5700c652c01b79361fe1dc88e1c3c3f13364fe3`
- W5B Outcome implementation: `72985c6f926dadbcc0347c7b319ee3ff070ccc0a`
- Implementation GitHub Actions: `33922252042`
- Branch: `feature/p6-real-awkn-integration`

Verification:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

P0–P5、P6-W0～W5A 原有门禁保持完整；新增 `npm run test:p6:outcome` 已进入统一 `test:p6`。

## Closed scope

### W5-01 / W5-02 Product Service append path

`feedback.record` 与 `outcome.record` 统一通过 `/api/product` → AWKN Product Service Adapter。两个 append operation 都接受产品层专项 Contract 校验；成功响应必须返回当前稳定事件 ID 的持久化 Ack。

### W5-03 Stable append event identity

Feedback 保持 W5A 已验证身份：

```text
feedback-event:{taskId}:{deterministic fingerprint}
```

Outcome 新增稳定身份：

```text
outcome-event:{taskId}:{deterministic fingerprint}
```

Outcome 逻辑身份包含 taxonomy version、Workspace、Task、Task Execution、Feedback Event、Outcome state/value、reason、Feedback、User Final、Evidence refs 与 run_id。`trace_id` 不参与事件身份，网络 trace 变化不会创建第二个逻辑事件。

### W5-04 Duplicate-submit idempotency

Outcome 幂等键固定为：

```text
outcome.record:{outcomeEventId}
```

受控上游验证：

```text
2 HTTP attempts
1 logical append side effect
same Outcome Event ID
```

### W5-05 / W5-06 Feedback evidence chain

W5A 已保留 AI Draft / User Final，并由服务端重新计算 `edit_count`。Outcome Event 引用当前稳定 `feedback_event_id`，保证 Outcome 可以回溯当前用户修改与 Feedback。

### W5-07 Versioned Outcome taxonomy

固定版本：

```text
outcome.v1
```

当前 observed values：

```text
项目推进
获得反馈
方案采用
暂时搁置
失败
```

未知结果使用独立语义值：

```text
unknown
```

taxonomy version 会进入 Outcome Event 稳定身份。未知版本、状态和值组合会在上游调用前失败。

### W5-08 Pending / unknown truth state

Outcome 真值投影固定为：

```text
null / absent → pending
unknown       → unknown
known value   → observed
```

UI 已增加“还不知道”入口，持久化值为 `unknown`。UNKNOWN 事件允许留痕，但不会生成 Experience Candidate。`pending` 保持未发生状态，不会被提交成成功 Outcome。

### W5-09 Task / Workspace / trace association

Outcome Event 强制绑定：

```text
workspace_id
task_id
task_execution_id
feedback_event_id
run_id?
trace_id?
evidence_refs[]
```

Workspace / Task / Task Execution / Feedback Event identity 漂移会在上游调用前失败；成功 Ack 继续校验稳定 Outcome Event ID 并保留 trace。

### W5-10 Event stream ↔ Task Execution consistency

Outcome Event 直接从当前 `TaskExecutionState` 可编辑投影构造，绑定：

```text
feedback
outcome
outcomeNote
finalText
```

`outcomeEventMatchesExecution()` 提供一致性判定，并进入 P6 Outcome 测试。平台模式下，当前 Feedback append 失败时停止后续 Outcome append；当前 Outcome append 成功后才生成 observed Experience Candidate。local-only 模式继续维持 P0–P5 浏览器闭环。

## Negative / adversarial coverage

新增：

```text
npm run test:p6:outcome
```

覆盖：

- versioned Outcome taxonomy
- pending / unknown / observed truth state
- stable Outcome Event ID
- trace-independent logical identity
- stable idempotency key
- Task Execution projection consistency
- Workspace identity mismatch
- Task Execution identity mismatch
- foreign Feedback Event identity
- taxonomy drift
- state / outcome mismatch
- failure / pause reason validation
- Evidence canonicalization
- tampered Outcome Event ID
- malformed idempotency key
- duplicate logical append
- ACK entity identity mismatch
- trace preservation

## Files

```text
lib/outcome-contract.ts
app/api/product/route.ts
components/artifact-workspace.tsx
components/outcome-capture.tsx
scripts/p6-outcome.ts
package.json
```

## Known limitations

- 当前自动测试使用受控 AWKN Product upstream；真实 Product Service endpoint、真实凭证、最终服务端授权与网络级 exactly-once 证据进入 P6-W8 Real AWKN E2E。
- Feedback 与 Outcome 为 append 事件；用户后续修改结果会形成新的稳定事件 ID，Task Execution 保存当前投影。完整事件历史查询由平台持久化能力负责。
- append Ack 的 revision / updated_at 由 AWKN Product Service 提供；产品层强制验证 Ack envelope 与稳定 event identity。
- UI 信息架构保持现有结构，仅增加明确的“还不知道”Outcome 入口和 UNKNOWN 行为。

## Rollback

如 W5 引入回归，回退到最近完整 W4 已验证基线：

```text
f2f4de5548388421744b8bf702ff60f68771ad26
```

如只回退 W5B Outcome，可回退到 W5A Feedback baseline：

```text
f5700c652c01b79361fe1dc88e1c3c3f13364fe3
```

## Next

下一工作包：

```text
P6-W6 Learning & Evolution
→ learning.watch.upsert
→ learning.run / get / retry
→ stable logical Learning Run identity
→ Signal source / trace
→ revoked Workspace visibility
→ Candidate evidence chain
→ Evolution review revision contract
```

P6-W6 继续继承 P0–P5 与 P6-W0～W5 全部 Hard Gate。
