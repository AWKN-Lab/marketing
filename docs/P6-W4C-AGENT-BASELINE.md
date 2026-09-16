# P6-W4C Agent Execution Baseline

## Status

`DEVELOPMENT_VERIFIED`

P6-W4 `Task & Real Agent Execution` 已完成。W4A Task Contract、W4B Task Execution、W4C Agent Execution 均进入自动测试门；P6-W5 可以解锁。

## Baseline

- Starting baseline: `8904ae61cb3aa50e11d260ad8d89ba5e38b33f99`（P6-W4B Task Execution）
- Agent implementation head: `f1a0d93d42b290026b0483c5babd112c5f5084a9`
- Agent implementation GitHub Actions: `33917128055`
- Configuration head: `ed07a89e3ece137d95ba46fdd811603cc6037d30`
- Branch: `feature/p6-real-awkn-integration`

Implementation verification:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

P0–P5、P6-W0～W4B 原有门禁保持完整。W4B 后追加的 Task Execution editable projection regression test 继续保留在统一 `test:p6` 中。

## Closed scope

### W4-11 / W4-12 Agent Input / Result

新增 `lib/agent-contract.ts`，固化：

```text
MarketingAgentInput
├─ tenantId
├─ actorId
├─ workspaceId
├─ taskId
├─ taskType
├─ goal
├─ userPrompt
├─ contextRefs
├─ appliedExperienceIds
├─ capabilityScope
├─ requestId
├─ logicalActionId
├─ messages
└─ materials

MarketingAgentResult
├─ taskId
├─ runId
├─ status
├─ text
├─ judgment
├─ artifact
├─ evidence
├─ evidenceRefs
├─ appliedExperienceIds
├─ traceId
└─ error
```

结果状态固定为：

```text
succeeded
failed
```

### W4-13 `task.run` → AWKN Agent Runtime

`/api/agent` 继续作为浏览器与真实 AWKN Agent Runtime 之间的服务端 Adapter，并向上游发送标准业务信封：

```text
product = awkn-marketing
operation = task.run
request_id
idempotency_key
workspace_id
task_id
payload = MarketingAgentInput
```

服务 Token 只在服务端使用；进入请求的 Actor Authorization / Cookie 继续通过既有 upstream identity bridge 交给 AWKN 最终授权。

### W4-14 Agent scope

每次调用显式携带：

```text
tenant
actor
workspace
task
capability scope
request id
logical action id
```

缺少 `task.run` capability scope 时 fail closed。

### W4-15 Workspace Material scope

客户端只从当前 `workspaceId` 的 Material storage key 构建 Agent context；每条 Material 增加 `workspace_id`。服务端再次校验所有 Material 都属于当前 Workspace。

跨 Workspace Material 返回：

```text
WORKSPACE_REVOKED
```

`contextRefs` 只能引用当前请求中的 Material ID。

### W4-16 Stable Applied Experience ID

`AppliedExperience` 保留 Reviewed Candidate ID。新匹配经验直接使用 Candidate stable ID；旧 P0/P1 数据缺少 ID 时使用 lesson + source 的确定性 hash 生成兼容 stable ID。

同一经验跨 retry / reload 保持同一 ID。

### W4-17 / W4-18 Run / Trace

成功 Agent Result 必须包含：

```text
task identity
run_id
stable status
```

`trace_id` 从响应信封或上游 trace header 保留到产品投影。

### W4-19 Evidence refs

Agent Evidence 投影保留：

```text
id / ref
source
url
```

并生成稳定 `evidenceRefs`。Outcome 链优先复用 `evidenceRefs`，同时保存 `run_id` 与 `trace_id`。

### W4-20 Artifact / Evidence projection

`AgentTaskResult` 增加：

```text
taskId
runId
status
evidenceRefs
appliedExperienceIds
error
```

Artifact 在进入本地产品投影时强制绑定当前 `taskId`。持久化阶段再次校验 Task identity，阻止跨 Task Artifact 写入。

### W4-21 Timeout retry

Agent Adapter 增加受控 timeout：

```text
AWKN_MARKETING_AGENT_TIMEOUT_MS=30000
```

超时返回：

```text
UPSTREAM_TIMEOUT
retryable = true
```

同一逻辑动作再次执行时沿用同一个 logical action identity / idempotency key。

### W4-22 Duplicate logical run protection

逻辑动作 ID 由：

```text
task id
+ message sequence
+ applied experience ids
```

确定性生成。

幂等键：

```text
task:{taskId}:run:{logicalActionId}
```

受控上游测试连续发送两次不同 request_id、相同逻辑动作时：

```text
2 HTTP attempts
1 logical side effect
same run_id
```

真实 AWKN exactly-once 继续在 P6-W8 网络 E2E 证明。

## Negative / adversarial coverage

新增：

```text
npm run test:p6:agent
```

覆盖：

- stable Applied Experience ID
- stable logical action ID
- missing `task.run` capability
- revoked / cross-Workspace Material context
- context ref scope
- `task.run` 标准信封
- tenant / actor / workspace / task scope
- service identity + Actor identity forwarding
- run_id / trace_id
- Evidence refs
- Artifact task identity
- duplicate same-key logical run
- task identity mismatch
- missing run_id
- unsupported side effects
- retryable Agent timeout

## W4 Hard Gate

```text
revoked context leakage = 0
  → cross-Workspace materials blocked before upstream execution

duplicate logical run = 0
  → controlled same-key retry returns same logical run

artifact without task identity = 0
  → artifact projection always binds taskId; mismatch rejected

unsupported external side effect = 0
  → requested / returned unapproved side effects fail with UNSUPPORTED_OPERATION
```

## Files

```text
lib/agent-contract.ts
lib/agent-result-store.ts
lib/types.ts
lib/evolution-store.ts
app/api/agent/route.ts
components/assistant-ui/marketing-runtime-provider.tsx
components/task-conversation.tsx
components/artifact-workspace.tsx
scripts/p6-agent.ts
package.json
.env.example
.env.integration.example
```

## Known limitations

- 当前自动测试使用受控 AWKN Agent upstream；真实 Agent endpoint、真实凭证、网络级 exactly-once、副作用审计和最终授权证据继续进入 P6-W8 Real AWKN E2E。
- Agent 直接响应当前只接受完成态 `succeeded / failed`。未来需要长任务 polling / event stream 时扩展异步 Result contract，不能把 queued / running 伪装成完成。
- ApprovalPort 尚未进入本轮产品实现，因此 W4C 对外部副作用采用 fail-closed；有批准链后再开放受支持动作。
- UI 信息架构未改动。

## Rollback

如 W4C 引入回归，回退到最近 W4B 已验证基线：

```text
8904ae61cb3aa50e11d260ad8d89ba5e38b33f99
```

## Next

下一工作包：

```text
P6-W5 Feedback & Outcome
W5-01 feedback.record
W5-02 outcome.record
W5-03 stable append event identity
W5-04 duplicate-submit idempotency
W5-05 AI Draft / User Final association
W5-06 editCount
W5-07 versioned Outcome taxonomy
W5-08 pending / unknown Outcome
W5-09 task / workspace / trace association
W5-10 event stream ↔ Task Execution projection consistency
```

P6-W5 继续继承 W0～W4 全部 Hard Gate。
