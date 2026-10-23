# P6-PATTERN-DETECTION Baseline｜跨任务重复模式检测

> 上位文档：`docs/PRD.md` §21.1 / §25 流程 D、`docs/ENGINEERING.md`、`docs/AGENT-SKILL-ENGINEERING.md` §10  
> 基线：P6 `feature/p6-real-awkn-integration` @ `31d99eaf7fa9ffe1dc8de4fee1d3e27ab709ac62`  
> 状态：`DEVELOPMENT_VERIFIED`（仓库级门禁通过；真实平台 E2E 仍未覆盖）

---

## 1. 补的是什么缺口

PRD §21.1 定义了三类学习源：

| 优先级 | 学习源 | V1 状态 |
|---|---|---|
| A | 真实 Outcome | 已实现（单任务 Candidate） |
| B | 用户明确行为 | 已实现（单任务 Candidate） |
| C | **重复模式** | **本次补齐** |

PRD §25 流程 D 要求的主链是：

```text
多个 Task / Feedback / Outcome
→ 发现重复模式
→ 生成 Candidate
→ Evidence Check
→ Eval
→ 用户确认
→ 限定适用范围
→ 下一次相似任务调用
```

补齐前，仓库里的 Candidate 全部由 `createExperienceCandidate()` 从**单个任务**生成，
`id = local-ev-${taskId}`，与任务 1:1 绑定。因此：

- 系统只能表达「这一次发生了什么」，无法表达「用户反复在做什么」。
- PRD §22.2 进化北极星「相似任务质量增益」缺少产生机制。
- PRD §29 核心演示第 7 步「系统形成 Experience Candidate」缺少跨任务来源。

补齐后，跨任务模式由 `lib/pattern-detection.ts` 产生，行为与 PRD 一致：
**多个任务 → 发现同向模式 → 生成可审核 Candidate → 人工确认 → 下一次任务调用。**

## 2. 检测信号

| kind | 触发条件 | 产出类型 | polarity |
|---|---|---|---|
| `repeated-edit` | 同一 Workspace、同一 taskType 下，AI 初稿中同一段表达被 ≥2 个任务的用户稿删除 | `Preference Candidate` | positive |
| `repeated-outcome` | 同一 Workspace、同一 taskType 下，≥2 个任务记录到相同 Outcome | `Decision Pattern Candidate` | positive |
| `repeated-failure` | 同上，且 Outcome 为「失败」 | `Counterexample Candidate` | negative |

三类信号对应 PRD §18 S4「进化重点」中的：用户删掉什么、用户保留什么、什么结果在重复出现。

## 3. 纪律

本模块把 PRD §21.2 / §18 / §23 的约束落到代码，不靠文档口头保证：

| 纪律 | 实现位置 | 对应 PRD |
|---|---|---|
| 单个任务永不产生模式 | `PATTERN_MIN_SUPPORT = 2` | §21.2「单次修改不自动上升为普遍经验」 |
| 模式不跨 Workspace 泄漏 | 分组键 = `workspaceId + taskType` | §11.3「标记只适用于某 Workspace」 |
| 模式不跨 taskType 合并 | 同上 | §21.4「满足 Candidate 适用边界时」 |
| 顺序不可靠的组不参与检测 | `orderSamples()` 返回 `null` 即整组跳过 | `EVAL-ACCEPTANCE.md` §7 规则 4 |
| 噪声级文本不成模式 | `MIN_SIGNAL_LENGTH = 6` | 避免无意义的重复计入 |
| 重复失败只能是反例 | `repeated-failure` → `Counterexample Candidate` | §21.1 反例语义 |
| 重复证据提高 confidence | `confidenceFor()`，2 次→0.70，3 次→0.78，5 次→0.90 | `AGENT-SKILL-ENGINEERING.md` §10 |
| 模式未审核不改变行为 | 只写入 `LOCAL_CANDIDATES_KEY`，需人工审核 | §4.3「错误 Candidate 不直接改变系统行为」 |
| 用户否决的方法不再参与模式形成 | UI 侧排除 `rejected` 候选 | `EVAL-ACCEPTANCE.md` §3 E3 |
| 模式候选不自举放大 | 模式候选不参与下一次模式检测 | 防止重复放大 |

## 4. 证据链

单任务 Candidate 的证据链是一份（`ai_draft` / `user_final` / `feedback_event_id` / `outcome_event_id`）。
模式 Candidate 跨多个任务，因此证据链扩展为：

```text
evidence
├─ ai_draft / user_final / feedback_event_id / outcome_event_id   ← 锚点任务（最近一次支撑任务）的真实链
└─ pattern_evidence
   ├─ kind
   ├─ signal
   ├─ support_count
   ├─ source_task_ids[]
   └─ supporting_chains[]                                        ← 每个支撑任务各自的事件链
```

平台契约 `validateEvolutionProductRequest()` 对模式 Candidate 施加**比单任务更严**的门：

- `pattern_evidence` 必须存在；
- `support_count ≥ 2` 且 `source_task_ids` 去重、全部非空；
- 锚点任务必须包含在 `source_task_ids` 中；
- **每个**支撑任务都必须有独立的 `feedback-event:{task_id}:` / `outcome-event:{task_id}:` 事件链；
- 支撑任务数量与 `source_task_ids` 必须一一对应（不多不少）。

任何一条不满足即 `VALIDATION_ERROR` / `IDENTITY_MISMATCH`，模式候选无法进入审核，更无法进入经验匹配。

## 5. 身份与审核

模式 Candidate 不使用 `local-ev-${taskId}`（会与该任务的单任务 Candidate 撞号），
改用独立前缀：

```text
local-evp-${patternId}
```

`patternId` 由 `snapshotFingerprint({kind, workspace_id, task_type, signal})` 派生，
因此同一模式在不同会话、不同数组顺序下得到**同一个 id**（幂等），重复检测不会产生重复候选。

审核链路复用既有机制，无需新增状态：

```text
evolutionCandidateReadyForReview()  →  buildEvolutionReview()  →  evolution.review  →  reviewDecisionForCandidate()
```

审核通过后，模式 Candidate 通过 `matchReviewedExperience()` 进入下一次相似任务匹配，
`source` 会显示「跨任务重复模式 · N 次支持」。

## 6. 入口

进化页新增动作：**「从已确认任务检测重复模式」**。

- 输入：当前 Session 可访问的、已具备完整证据链的候选；
- 排除：模式候选自身、用户已否决的候选、缺少证据链的候选；
- 输出：写入 `LOCAL_CANDIDATES_KEY`，出现在审核列表，**未审核前不进入任何任务匹配**。

## 7. 验证

```bash
npm run typecheck     ✓
npm run test:p0       ✓
npm run test:p6:pattern ✓   （21 项断言）
npm run test:p6       ✓   （191 PASS / 1 SKIP / 0 FAIL）
npm run build         ✓
```

`scripts/p6-pattern.ts` 覆盖 21 项断言，分五组：

1. **最小支持度**：单任务不产生模式；两任务才够。
2. **三类信号**：重复删除 / 重复 outcome / 重复失败反例；patternId 跨重算稳定。
3. **隔离纪律**：不同 Workspace、不同 taskType 不合并；顺序不可靠整组排除；噪声文本不成模式。
4. **证据链**：提升后可审核；支撑链断裂 / 支撑数不足 → 不可审核；平台契约放行正常模式候选，拦截缺证据链与未知支撑任务。
5. **闭环**：审核通过 → 进入下一次任务匹配；未审核 → 不进入；重复失败 → 只进 counterexamples，不进 experiences。

## 8. 已知限制

1. **检测边界限定在 `workspaceId + taskType`**。跨 taskType 的通用偏好（如「所有方案类任务都删掉宏观趋势铺垫」）尚未检测。
   这是刻意的保守选择：跨类型泛化会显著提高误报率，且 PRD §21.1 把「重复模式」限定在「相似场景」。
2. **重复删除按整行文本匹配**。同义改写、语义等价但措辞不同的删除不会被识别为同一模式。
3. **不分析删除的顺序**。PRD §18 提到「用户经常调整的逻辑顺序」，当前只识别「删了什么」，未识别「调整了什么顺序」。
4. **模式只来自已产生 Candidate 的任务**。没有 Candidate 的历史任务不参与检测（缺证据链即缺可信度）。
5. **真实平台 E2E 未覆盖**。本能力不依赖平台服务，但 `evolution.review` 的平台确认路径仍属 P6-W8 范围。

## 9. 不做什么

- 不自动把模式变成 Active SKILL（§20 S6 规则、§4.3）。
- 不因单次修改生成模式（§18「单次修改不能直接变成全局偏好」）。
- 不跨 Workspace 复用模式（§11.3 scope 纪律）。
- 不把重复失败包装成可复用方法（反例语义）。
- 不在模式未经审核时改变任务行为（§23 Human Gate）。
