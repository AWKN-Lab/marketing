# AWKN Marketing｜Eval 与验收工程文档

> 文档版本：V1.0  
> 上位文档：`docs/ENGINEERING.md`

---

# 1. Eval 目标

营销助理需要同时证明三类结果：

1. 工程链路可靠。
2. 权限、状态与证据可信。
3. 重复任务中的实际表现持续改善。

Eval 数据来自真实 Task、用户修改、Feedback、Outcome、Experience Reuse 与运行证据。

---

# 2. 当前已经实现的 P0 指标

`lib/eval.ts` 当前已经实现：

- `feedbackCoverage`
- `firstPassAdoption`
- `outcomeCoverage`
- `outcomeSuccessRate`
- `experienceReuseRate`
- `averageEditCount`
- `repeatedTaskTypes`
- `improvedTaskTypes`

并通过 AI Draft 与 User Final 的逐行差异计算 `editCount`。

当前正向 Outcome 集合：

```text
项目推进
获得反馈
方案采用
```

P6/P7 可以扩展业务 Outcome taxonomy，但必须保持版本化，防止历史指标口径漂移。

---

# 3. 三层 Eval

## E1 Engineering Eval

关注系统是否可靠执行：

- typecheck
- build
- contract tests
- idempotency tests
- revision conflict tests
- retry tests
- permission tests
- revoked workspace isolation
- upstream failure recovery

## E2 Product Loop Eval

关注闭环是否完整：

```text
Task
→ Artifact
→ Feedback
→ Outcome
→ Candidate
→ Review
→ Experience
→ Reuse
```

每个 Task 必须能定位所在闭环阶段。

## E3 Business Learning Eval

关注重复任务是否出现可量化改善：

- edit count 是否下降
- first pass adoption 是否提升
- Reviewed Experience 是否被正确复用
- Outcome 是否改善
- 用户否决过的错误是否减少复发

---

# 4. P6 工程验收 Hard Gates

P6 以下项目必须 100% 通过：

| Gate | 标准 |
|---|---:|
| Stable entity ID | 100% |
| Write idempotency | 100% |
| Revoked workspace unauthorized read | 0 |
| Revoked workspace unauthorized write | 0 |
| Silent stale revision overwrite | 0 |
| Platform → local silent auth fallback | 0 |
| Unsupported side effect without approval | 0 |
| Required traceable error path | 100% |
| `npm run typecheck` | pass |
| `npm run test:p0` | pass |
| `npm run build` | pass |

这些属于工程正确性要求，不随业务样本波动。

---

# 5. P7 业务验收样本

最低：

```text
5 Workspace
30 Task
```

建议每个 Workspace 至少覆盖：

- 首次任务
- 同类型重复任务
- 资料追加后的任务
- 使用 Reviewed Experience 的任务
- Feedback + Outcome 完整任务
- 至少一次异常 / retry 场景

总样本中需要出现：

- accepted candidate
- scoped candidate
- rejected candidate
- material parse retry
- task run retry
- learning run
- workspace grant revoke

---

# 6. 样本记录结构

```ts
type MarketingEvalRecord = {
  workspaceId: string
  taskId: string
  taskType: string
  taskSequence: number
  aiDraftRef: string
  userFinalRef?: string
  feedback?: string
  outcome?: string
  editCount: number
  appliedExperienceIds: string[]
  evidenceRefs: string[]
  runId?: string
  traceId?: string
  candidateIds?: string[]
  startedAt: string
  completedAt?: string
}
```

Eval 记录保存引用与指标；敏感原文按平台数据治理规则保存。

---

# 7. 指标定义

## Feedback Coverage

```text
有 Feedback 的 Task / 总 Task
```

## First Pass Adoption

```text
Feedback = 采用 的 Task / 有 Feedback 的 Task
```

## Outcome Coverage

```text
有 Outcome 的 Task / 总 Task
```

## Outcome Success Rate

```text
正向 Outcome / 有 Outcome 的 Task
```

## Experience Reuse Rate

```text
调用至少 1 条 Reviewed Experience 的 Task / 总 Task
```

## Average Edit Count

```text
总 edit count / 有 Feedback 的 Task
```

## Repeated Task Improvement

同一 taskType 按时间比较：

```text
latest edit count - first edit count
```

负值代表修改量下降。

---

# 8. P7 业务阈值策略

第一轮 30 Task 的首要任务是建立真实业务基线。

固定工程阈值已经在 P6 Hard Gates 中设定。业务效果指标先记录分布、Workspace 差异和 taskType 差异，再基于真实数据设 V1 Release Gate。

首轮禁止为了通过验收临时改指标定义或删除失败样本。

---

# 9. Experience Effectiveness

每一条 Reviewed Experience 需要能够回答：

```text
在哪些 Task 被调用？
调用前后的 edit count 怎么变化？
用户是否采纳？
Outcome 如何？
是否出现 counterexample？
是否需要缩小 scope？
```

建议派生：

```text
Experience Adoption Rate
Experience Positive Outcome Rate
Experience Counterexample Rate
Experience Scope Revision Count
```

这些指标进入后续 Skill 治理依据。

---

# 10. Failure Eval

P6/P7 必测：

- agent timeout
- material parse failed
- learning run failed
- duplicated submit
- duplicated retry
- stale revision
- revoked grant
- malformed upstream response
- missing entity ack
- identity mismatch
- unsupported operation
- session unavailable

每个场景记录：

```text
expected state
actual state
error code
retryable
trace id
side effect count
final consistency
```

---

# 11. 证据要求

每轮正式验收至少保留：

- Git commit SHA
- CI / test result
- environment
- AWKN service version / endpoint environment label
- 5 Workspace / 30 Task 样本摘要
- failures
- retries
- permission negative cases
- metric output
- known limitations

---

# 12. Release 判断

Release Review 顺序：

```text
Engineering Hard Gates
→ Contract Consistency
→ Permission / Security
→ Product Loop Completeness
→ Business Eval Baseline
→ Known Risk Review
→ Release / Hold
```

任一 Hard Gate 失败时停止 Release 升级，保留当前已验证基线。