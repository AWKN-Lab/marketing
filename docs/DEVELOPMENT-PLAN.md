# AWKN Marketing｜P6–P7 开发执行计划

> 仓库：`AWKN-Lab/marketing`  
> 文档版本：V1.0  
> 上位文档：`docs/PRD.md`、`docs/ENGINEERING.md`  
> 当前代码行为基线：P0–P5 `DEVELOPMENT_VERIFIED`  
> 当前目标：P6 Real AWKN Integration → P7 Real Business Acceptance

---

# 1. 一页结论

接下来的开发只推进两件事：

```text
P6
真实 AWKN 联调
→ 把现有 local / adapter / product contract 接到真实平台
→ Contract / Permission / Idempotency / Revision / Retry 全部过 Hard Gate

P7
真实业务验收
→ 5 Workspace
→ 30 Task
→ 建立第一轮真实业务 Eval 基线
→ Release Review
```

P6 期间保持现有产品闭环、UI 结构和 Domain 语义稳定。大规模 UI 改版、CRM、通用 Agent Builder、Workflow Builder、Memory 后台、MCP 管理台均退出本轮范围。

工程主线：

```text
锁定 P5 基线
→ 固化 Contract
→ Session / Permission
→ Workspace / Material
→ Task / Agent Execution
→ Feedback / Outcome
→ Learning / Evolution
→ Reconcile / Failure Hardening
→ Real AWKN E2E
→ P6 Baseline
→ 5 Workspace / 30 Task
→ Eval
→ P7 Release Review
```

---

# 2. 开发原则

## 2.1 基线锁定

P0–P5 已验证行为优先保护。

每个工作包执行：

```text
现有事实
→ 最小改动
→ 新测试
→ 旧测试回归
→ 验收证据
→ 基线 Commit
```

任何新增能力导致 P0–P5 回归时，先修复回归，再继续推进。

## 2.2 一个判断一个 Owner

Owner 固定分为：

| Owner | 负责范围 |
|---|---|
| Marketing Product | 本仓库 Domain、UI、Product Contract、Adapter、Store、测试、Eval |
| AWKN Platform | Session 真值、Product Service、Agent Runtime、Material Service、持久化、最终权限 |
| Product Acceptance | P7 真实任务设计、Feedback、Outcome、业务验收 |

跨系统问题仍指定单一 Owner。另一个系统作为 Dependency，不形成模糊共同责任。

## 2.3 Hard Gate 优先

以下问题优先级高于 UI 细节：

1. 权限泄漏。
2. 重复副作用。
3. stable entity ID 破坏。
4. stale revision 覆盖新状态。
5. revoked Workspace 数据泄漏。
6. 平台模式静默获得 local owner 权限。
7. Agent / Material / Learning 失败后状态失真。
8. 缺少 trace / evidence 导致问题无法追踪。

## 2.4 UNKNOWN 保留

上游没有返回、状态未确认、业务结果尚未发生时，产品状态保持 UNKNOWN / pending / failed 等真实状态。

禁止为了演示完整度写入假成功、假 Outcome、假 Evidence。

## 2.5 可回退

每个工作包必须明确：

- 起始 Commit。
- 变更文件。
- 新增测试。
- 依赖的 AWKN Contract。
- 回退点。
- 已知限制。

---

# 3. 分支与提交策略

当前文档工作继续位于：

```text
docs/engineering-system-v1
```

文档 PR 合并后，P6 代码开发从最新 `main` 建立：

```text
feature/p6-real-awkn-integration
```

P6 在同一功能分支内按工作包形成小提交，禁止把所有联调改动压成一次大提交。

推荐 Commit 组：

```text
p6-00 baseline / test harness
p6-01 contract foundation
p6-02 session permission
p6-03 workspace material
p6-04 task agent execution
p6-05 feedback outcome
p6-06 learning evolution
p6-07 reconcile failure hardening
p6-08 real awkn e2e
p6-09 baseline docs
```

每个提交保持可读、可验证、可单独定位问题。

---

# 4. P6 总验收目标

P6 完成时必须证明：

- 真实 Session 可用。
- 19 个 ProductOperation 的支持矩阵清晰。
- 持久化写操作返回稳定 `entity_id + revision + updated_at`。
- 所有网络请求拥有 `request_id`。
- 所有逻辑副作用 retry 复用同一 `idempotency_key`。
- Workspace / Material / Task / Execution / Feedback / Outcome / Learning / Evolution 可接真实 AWKN。
- Task 能通过真实 Agent Runtime 返回 Artifact / Evidence / trace。
- 权限撤销即时阻断读写与 Experience 匹配。
- stale revision 产生明确冲突结果。
- timeout / 5xx / rate limit / malformed response 均有稳定错误路径。
- local / platform 状态边界清晰。
- P0–P5 回归测试继续通过。
- Real AWKN E2E 完整通过。

P6 状态达到以上标准后新增：

```text
docs/P6-REAL-AWKN-BASELINE.md
```

---

# 5. P6-W0｜基线与测试脚手架

**Owner：Marketing Product**

## 目标

先建立 P6 的验证框架，后续每个工作包直接往同一测试体系加用例。

## 任务

- [ ] W0-01 锁定 P5 行为基线与 P6 起始 Commit。
- [ ] W0-02 保留 `npm run typecheck`、`npm run test:p0`、`npm run build`。
- [ ] W0-03 新建 P6 Contract Test 入口。
- [ ] W0-04 新建 Permission Test 入口。
- [ ] W0-05 新建 Idempotency Test 入口。
- [ ] W0-06 新建 Revision / Reconcile Test 入口。
- [ ] W0-07 建立 Real AWKN integration test 配置与环境隔离。
- [ ] W0-08 区分 Fixture、Synthetic Workspace、Real Acceptance Workspace。
- [ ] W0-09 CI 中禁止打印任何 AWKN Token。
- [ ] W0-10 给测试输出增加失败 operation / entity / trace 摘要。

## Done

```text
typecheck = pass
test:p0 = pass
build = pass
P6 test entry = executable
integration secrets = server-side only
```

---

# 6. P6-W1｜Product Contract 固化

**Owner：Marketing Product**

## 目标

把现有 19 个 ProductOperation 从“已有调用定义”提升为可自动验证的真实平台契约。

## 任务

- [ ] W1-01 为 19 个 operation 建立 metadata registry。
- [ ] W1-02 标记每个 operation 的 read / write / append / async 类型。
- [ ] W1-03 标记 idempotency 要求。
- [ ] W1-04 标记 required `workspace_id` / `task_id`。
- [ ] W1-05 持久化写 Ack 强制 `entity_id`。
- [ ] W1-06 持久化写 Ack 强制 `revision`。
- [ ] W1-07 持久化写 Ack 强制 `updated_at`。
- [ ] W1-08 扩展 `validateStableEntityAck()`。
- [ ] W1-09 建立 revision 合法性检查。
- [ ] W1-10 固化 Error Taxonomy。
- [ ] W1-11 未知 operation 返回 `UNSUPPORTED_OPERATION`。
- [ ] W1-12 malformed upstream response 统一归一化。
- [ ] W1-13 所有失败路径尽量保留 `trace_id`。
- [ ] W1-14 建立 19-operation 表驱动 Contract Test。

## 必测错误

```text
AUTH_REQUIRED
FORBIDDEN
WORKSPACE_REVOKED
NOT_FOUND
VALIDATION_ERROR
UNSUPPORTED_OPERATION
MISSING_ENTITY_ACK
IDENTITY_MISMATCH
REVISION_CONFLICT
INVALID_REVISION
IDEMPOTENCY_CONFLICT
UPSTREAM_UNAVAILABLE
UPSTREAM_TIMEOUT
RATE_LIMITED
RUN_FAILED
UNKNOWN_UPSTREAM_ERROR
```

## Done

19 个 operation 的请求、响应、ID、revision、幂等和错误路径均能由测试自动判断。

---

# 7. P6-W2｜真实 Session 与 Permission

**Owner：Marketing Product**  
**Dependency：AWKN Platform Session / Authorization**

## 目标

平台模式完全依赖真实 AWKN Session，并保持 P5 已验证的 Tenant / Actor / Capability / Workspace Grant 边界。

## 任务

- [ ] W2-01 `/api/session` 接真实 Session endpoint。
- [ ] W2-02 统一 `AUTH_REQUIRED / FORBIDDEN / SESSION_UNAVAILABLE` 映射。
- [ ] W2-03 platform mode 关闭 local session fallback。
- [ ] W2-04 验证 Tenant ID 与 Actor ID 必填。
- [ ] W2-05 验证 capability 白名单。
- [ ] W2-06 验证 Workspace Grant access 枚举。
- [ ] W2-07 浏览器缓存继续按 `tenant + actor` 隔离。
- [ ] W2-08 Workspace 撤权后清理可见投影。
- [ ] W2-09 撤权 Workspace 的 Candidate 退出 Experience 匹配。
- [ ] W2-10 所有写操作在服务端再次接受 AWKN 最终授权。
- [ ] W2-11 建立 permission matrix 自动测试。
- [ ] W2-12 建立 revoked cache 负向测试。

## Hard Gate

```text
unauthorized read = 0
unauthorized write = 0
revoked context leakage = 0
platform local-owner fallback = 0
permission denied side effect = 0
```

---

# 8. P6-W3｜Workspace 与 Material

**Owner：Marketing Product**  
**Dependency：AWKN Product Service / Material Service**

## Workspace

- [ ] W3-01 `workspace.create` 真实写入。
- [ ] W3-02 `workspace.update` revision-aware 写入。
- [ ] W3-03 `workspace.get` 真实读回。
- [ ] W3-04 stable Workspace ID 校验。
- [ ] W3-05 stale revision 阻断写入。
- [ ] W3-06 同 key 重试只产生一个 Workspace。

## Material

- [ ] W3-07 `material.feed` 接真实 Product Service。
- [ ] W3-08 二进制 `/api/material-upload` 接真实 Material Service。
- [ ] W3-09 保留产品生成的 `material_id`。
- [ ] W3-10 上传成功与解析成功分开建状态。
- [ ] W3-11 `material.parse.get` 接真实状态。
- [ ] W3-12 `material.parse.retry` 使用同一逻辑 Material ID。
- [ ] W3-13 retry 保留同一逻辑解析对象或明确 attempt。
- [ ] W3-14 parsed text / evidence 进入产品投影。
- [ ] W3-15 Material 解析失败可见且可恢复。
- [ ] W3-16 文件大小上限走配置。

## 必测

```text
upload timeout
upload duplicate
parse failed
parse retry
material identity mismatch
missing material ack
revoked workspace upload
```

## Done

真实 Workspace 与 Material 可以稳定创建、读回、更新、解析、失败和重试，ID 与 revision 全程可追踪。

---

# 9. P6-W4｜Task 与真实 Agent Execution

**Owner：Marketing Product**  
**Dependency：AWKN Agent Runtime**

## Task

- [ ] W4-01 `task.create` 真实写入。
- [ ] W4-02 `task.update` revision-aware 写入。
- [ ] W4-03 `task.get` 真实读回。
- [ ] W4-04 Task status 收紧为稳定枚举。

## Task Execution

- [ ] W4-05 Task 与 Execution 状态进一步解耦。
- [ ] W4-06 `task.execution.get` 接真实平台。
- [ ] W4-07 `task.execution.upsert` 接真实平台。
- [ ] W4-08 逻辑 Execution ID 保持稳定。
- [ ] W4-09 retry 使用 attempt 表达物理重试。
- [ ] W4-10 existing queued-snapshot 机制继续防止乱序覆盖。

## Agent

- [ ] W4-11 固化 `MarketingAgentInput`。
- [ ] W4-12 固化 `MarketingAgentResult`。
- [ ] W4-13 `task.run` 接真实 AWKN Agent Runtime。
- [ ] W4-14 Agent 输入带 tenant / actor / workspace / task scope。
- [ ] W4-15 只传当前 Workspace 可访问资料。
- [ ] W4-16 Applied Experience 使用稳定 ID。
- [ ] W4-17 Agent Result 保存 `run_id`。
- [ ] W4-18 Agent Result 保存 `trace_id`。
- [ ] W4-19 Agent Result 保存 Evidence refs。
- [ ] W4-20 Artifact 与 Evidence 写入产品投影。
- [ ] W4-21 timeout 可 retry。
- [ ] W4-22 同一逻辑 `task.run` retry 不创建第二个逻辑 run。

## Hard Gate

```text
revoked context leakage = 0
duplicate logical run = 0
artifact without task identity = 0
unsupported external side effect = 0
```

---

# 10. P6-W5｜Feedback 与 Outcome

**Owner：Marketing Product**

## 目标

把用户修改、明确反馈和真实业务结果写入真实平台，为 Experience 和 Eval 提供可信数据。

## 任务

- [ ] W5-01 `feedback.record` 接真实 Product Service。
- [ ] W5-02 `outcome.record` 接真实 Product Service。
- [ ] W5-03 append 事件使用稳定事件 ID 或平台确认 ID。
- [ ] W5-04 重复提交具备幂等保护。
- [ ] W5-05 User Final 与 AI Draft 保留关联。
- [ ] W5-06 editCount 继续可计算。
- [ ] W5-07 Outcome taxonomy 版本化。
- [ ] W5-08 Outcome 未发生时保持 pending / unknown。
- [ ] W5-09 Feedback / Outcome 保留 task / workspace / trace 关联。
- [ ] W5-10 Task Execution 投影与事件流保持一致。

## Done

每一条进入 Experience 学习链的数据都能找到 Task、用户修改、Feedback、Outcome 和平台确认记录。

---

# 11. P6-W6｜Learning 与 Evolution

**Owner：Marketing Product**  
**Dependency：AWKN Learning / Product Service**

## Learning

- [ ] W6-01 `learning.watch.upsert` 接真实平台。
- [ ] W6-02 `learning.run` 接真实异步执行。
- [ ] W6-03 `learning.run.get` 接真实状态查询。
- [ ] W6-04 `learning.run.retry` 保持同一逻辑 run identity。
- [ ] W6-05 queued / running / completed / failed 归一化。
- [ ] W6-06 Signal 保留 source / trace。
- [ ] W6-07 已撤权 Workspace 停止 Learning 可见性和操作。

## Evolution

- [ ] W6-08 Candidate 输入引用 AI Draft / User Final / Feedback / Outcome / Evidence。
- [ ] W6-09 Candidate 拥有稳定 ID 与 revision。
- [ ] W6-10 `evolution.review` 接真实平台。
- [ ] W6-11 accepted / scoped / rejected 状态跨端一致。
- [ ] W6-12 Scoped Experience 保留适用 Workspace / scope。
- [ ] W6-13 negative Candidate 保持 Counterexample 语义。
- [ ] W6-14 Reviewed Experience 进入下一次 task matching。
- [ ] W6-15 审核记录发生 revision conflict 时停止覆盖。

## Hard Gate

```text
unreviewed candidate changes behavior = 0
revoked experience reuse = 0
review revision silent overwrite = 0
learning duplicate logical run = 0
```

---

# 12. P6-W7｜Reconcile、Retry 与故障加固

**Owner：Marketing Product**

## 目标

主动制造故障，确认系统经得起网络、并发、重复提交、权限变化和异常响应。

## 故障矩阵

- [ ] W7-01 local revision == server revision。
- [ ] W7-02 local revision < server revision。
- [ ] W7-03 local revision > server revision anomaly。
- [ ] W7-04 concurrent update。
- [ ] W7-05 stale retry。
- [ ] W7-06 request timeout。
- [ ] W7-07 upstream 5xx。
- [ ] W7-08 rate limit。
- [ ] W7-09 malformed JSON。
- [ ] W7-10 malformed success payload。
- [ ] W7-11 missing entity ack。
- [ ] W7-12 identity mismatch。
- [ ] W7-13 duplicate submit。
- [ ] W7-14 duplicate retry。
- [ ] W7-15 permission revoked during active session。
- [ ] W7-16 dependency temporarily unavailable。

## 每个故障记录

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

## Done

所有 Hard Gate 故障均有自动化测试或受控 integration test，最终状态可解释、可恢复、可追踪。

---

# 13. P6-W8｜Readiness、Observability 与 Real AWKN E2E

**Owner：Marketing Product**  
**Dependency：AWKN Platform 可观测信息**

## Readiness

- [ ] W8-01 扩展 `/api/status`。
- [ ] W8-02 显示 session dependency。
- [ ] W8-03 显示 product API dependency。
- [ ] W8-04 显示 agent dependency。
- [ ] W8-05 显示 material dependency。
- [ ] W8-06 显示 current mode。
- [ ] W8-07 关键依赖缺失时 readiness 明确失败。

## Observability

- [ ] W8-08 operation error code 可统计。
- [ ] W8-09 timeout / retry 可统计。
- [ ] W8-10 revision conflict 可统计。
- [ ] W8-11 idempotency conflict 可统计。
- [ ] W8-12 permission denied 可统计。
- [ ] W8-13 Agent / Material / Learning failure 可追踪。
- [ ] W8-14 trace_id 可用于跨服务定位。

## Real AWKN 正向 E2E

```text
Session
→ Workspace
→ Material
→ Task
→ Agent Run
→ Artifact / Evidence
→ Feedback
→ Outcome
→ Candidate
→ Evolution Review
→ Reviewed Experience
→ Learning Run
```

## Real AWKN 负向 E2E

至少覆盖：

```text
revoked Workspace
stale revision
timeout + same-key retry
```

## Done

P6 E2E 证据可以逐项定位 request、response 摘要、entity ID、revision、trace ID、测试结果和已知限制。

---

# 14. P6-W9｜P6 Baseline 收口

**Owner：Marketing Product**

## 收口清单

- [ ] W9-01 `npm run typecheck` PASS。
- [ ] W9-02 `npm run test:p0` PASS。
- [ ] W9-03 `npm run build` PASS。
- [ ] W9-04 Contract PASS。
- [ ] W9-05 Permission PASS。
- [ ] W9-06 Idempotency PASS。
- [ ] W9-07 Revision PASS。
- [ ] W9-08 Retry / Failure PASS。
- [ ] W9-09 Real AWKN E2E PASS。
- [ ] W9-10 Rollback path 验证完成。
- [ ] W9-11 更新工程文档中的实际契约差异。
- [ ] W9-12 新建 `P6-REAL-AWKN-BASELINE.md`。
- [ ] W9-13 记录 P6 baseline Commit / CI / environment / known limitations。

任一工程 Hard Gate 失败时，P6 状态保持未完成。

---

# 15. P7-W0｜真实业务验收准备

**Owner：Product Acceptance**

## 目标

使用授权的真实营销工作建立第一轮业务基线，同时保证样本结构足以观察系统学习效果。

## 5 个 Workspace 类型

首轮建议覆盖五类真实工作：

```text
W-A 客户 / 项目营销策略
W-B 市场 / 竞争研究
W-C 品牌 / 内容传播
W-D 活动 / Campaign 策划
W-E 提案 / 会前准备 / 项目复盘
```

具体名称可以使用真实业务名称；Eval 汇总层保留必要脱敏。

## 每个 Workspace 6 个 Task

```text
T1 首次任务：建立无历史 Experience 基线
T2 同类型重复任务：观察修改量变化
T3 追加资料后的任务：验证 Context 更新
T4 调用 Reviewed Experience：验证经验复用
T5 完整 Feedback + Outcome：进入学习闭环
T6 异常 / retry / Learning：验证真实工作中的韧性
```

形成：

```text
5 Workspace × 6 Task = 30 Task
```

---

# 16. P7-W1｜30 Task 执行与证据采集

**Owner：Product Acceptance**

每个 Task 必须记录：

```text
workspaceId
taskId
taskType
taskSequence
runId
traceId
revision
aiDraftRef
userFinalRef
feedback
outcome
editCount
appliedExperienceIds
evidenceRefs
candidateIds
retry / error
startedAt
completedAt
```

样本设计必须出现：

- [ ] accepted Candidate。
- [ ] scoped Candidate。
- [ ] rejected Candidate。
- [ ] Reviewed Experience reuse。
- [ ] Counterexample。
- [ ] Material parse retry。
- [ ] Task run retry。
- [ ] Learning run。
- [ ] Workspace grant revoke。
- [ ] 重复 taskType。
- [ ] 用户实际修改 Artifact。
- [ ] 有明确业务 Outcome 的任务。

禁止为了获得更好指标删除失败任务、重跑后隐藏首次失败、改动 Eval 口径。

---

# 17. P7-W2｜Eval 与学习效果审查

**Owner：Product Acceptance**

## 已有指标

继续使用：

```text
feedbackCoverage
firstPassAdoption
outcomeCoverage
outcomeSuccessRate
experienceReuseRate
averageEditCount
repeatedTaskTypes
improvedTaskTypes
```

## 新增观察

```text
Experience Adoption Rate
Experience Positive Outcome Rate
Experience Counterexample Rate
Experience Scope Revision Count
```

## 核心比较

同类型任务按时间顺序检查：

```text
第一次任务 edit count
→ Reviewed Experience
→ 后续同类型任务 edit count
→ Feedback
→ Outcome
```

第一轮 30 Task 负责建立真实分布和问题清单。业务阈值依据该轮数据制定，禁止先定一个容易通过的数字再筛样本。

---

# 18. P7-W3｜Release Review

**Owner：Marketing Product**

判断顺序固定：

```text
Engineering Hard Gates
→ Contract Consistency
→ Permission / Security
→ Product Loop Completeness
→ 5 Workspace / 30 Task Data Completeness
→ Business Eval Baseline
→ Known Risk Review
→ Release / Hold
```

## Release 必须具备

- [ ] P6 Baseline 已固定。
- [ ] 30 Task 样本完整。
- [ ] 工程 Hard Gate 全绿。
- [ ] 严重权限问题为 0。
- [ ] 重复副作用问题为 0。
- [ ] silent stale overwrite 为 0。
- [ ] 关键失败均有 trace / evidence。
- [ ] 真实业务指标已产出。
- [ ] 已知限制有 Owner。
- [ ] 回退点明确。

P7 完成后新增：

```text
docs/P7-REAL-BUSINESS-ACCEPTANCE.md
```

---

# 19. AWKN Platform 依赖清单

P6 开发开始前逐项确认接口可用性。

| Dependency | AWKN Platform 需要提供 | Marketing 侧验收 |
|---|---|---|
| Session | tenant / actor / roles / capabilities / workspace grants | normalize + permission negative test |
| Product API | 19 operation 或明确 capability map | contract test |
| Persistence | stable ID / revision / updated_at / idempotency | reconcile + duplicate test |
| Material | upload / parse / get / retry | parse lifecycle |
| Agent Runtime | task scoped run / result / trace / evidence | Task E2E |
| Learning | run / get / retry / signal source | async lifecycle |
| Evolution | candidate/review persistence + revision | review consistency |
| Authorization | server-side final deny | side effect count = 0 |
| Observability | trace identifier | failure diagnosis |

AWKN 某项能力暂缺时明确标记 Dependency Blocked。Marketing 侧禁止用浏览器 mock 冒充真实平台验收结果。

---

# 20. 代码优先级

## Critical

1. Contract schema / Ack / Error。
2. Session / Permission。
3. stable ID / revision / idempotency。
4. Task / Agent Execution。
5. revoked Workspace isolation。
6. Retry / failure consistency。

## High

1. Material async lifecycle。
2. Feedback / Outcome persistence。
3. Learning lifecycle。
4. Evolution revision / reuse。
5. Readiness / trace。

## After P6

1. 业务 Eval 优化。
2. Experience effectiveness 指标。
3. 基于 30 Task 数据调整 Skill / Experience scope。
4. UI 细节优化。

---

# 21. 本轮明确退出范围

P6/P7 暂停以下扩张：

- CRM Pipeline。
- 联系人后台。
- 商机 Kanban。
- 广告投放平台。
- 群发 / 外呼。
- 通用 Agent Builder。
- 通用 Workflow Builder。
- 通用 Knowledge Base 后台。
- 通用模型管理台。
- Agent Runtime 重建。
- Memory OS 重建。
- MCP Framework 重建。
- Skill Runtime 重建。
- 与 P6 无直接关系的大规模视觉改版。

任何新增需求先判断是否影响 P6/P7 主闭环；无直接影响的需求进入后续 Backlog。

---

# 22. 执行看板

```text
P6-W0 Baseline / Test Harness       TODO
P6-W1 Product Contract              TODO
P6-W2 Session / Permission          TODO
P6-W3 Workspace / Material          TODO
P6-W4 Task / Agent Execution        TODO
P6-W5 Feedback / Outcome            TODO
P6-W6 Learning / Evolution          TODO
P6-W7 Reconcile / Failure           TODO
P6-W8 Readiness / Real AWKN E2E     TODO
P6-W9 P6 Baseline                   TODO

P7-W0 Acceptance Setup              BLOCKED_BY_P6
P7-W1 5 Workspace / 30 Task         BLOCKED_BY_P6
P7-W2 Eval Review                   BLOCKED_BY_P7_W1
P7-W3 Release Review                BLOCKED_BY_P7_W2
```

状态只允许：

```text
TODO
IN_PROGRESS
BLOCKED
VERIFYING
DONE
```

`DONE` 必须绑定验收证据，禁止只凭代码已经提交进行判断。

---

# 23. 开发完成定义

整个 P6–P7 计划完成时，营销助理需要达到以下状态：

```text
真实用户身份
→ 真实 Workspace 权限
→ 真实资料
→ 真实营销任务
→ 真实 AWKN Agent 执行
→ 可追踪 Artifact / Evidence
→ 用户真实修改
→ Feedback
→ Outcome
→ Experience Candidate
→ 人工 Evolution Review
→ Reviewed Experience
→ 下一次相似任务实际复用
→ 可量化 Eval
```

最终交付物：

1. P6 真实 AWKN 集成代码。
2. P6 Contract / Permission / Idempotency / Revision / Retry 测试。
3. Real AWKN E2E 证据。
4. `P6-REAL-AWKN-BASELINE.md`。
5. 5 Workspace / 30 Task 验收数据。
6. P7 Eval 报告。
7. `P7-REAL-BUSINESS-ACCEPTANCE.md`。
8. Release / Hold 结论与已知风险清单。

后续功能开发只从新的已验证 Baseline 继续向上迭代。