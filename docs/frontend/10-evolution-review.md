# C10 Evolution Review｜进化审核

## 1. 目标

让用户清楚看到：

> 系统最近学到了什么、从哪里学到、为什么成立、以后会在哪些场景应用。

进化页是“自主进化”从后台能力变成前台产品价值的关键页面。

## 2. 边界

负责：

- Experience Candidate
- Preference Candidate
- Decision Pattern Candidate
- Evidence
- Applicable Scope
- Counterexample
- User Review
- 使用记录
- 回退入口

不负责：

- 底层 Skill Runtime
- 自动发布 Rule / SKILL
- Memory 内部管理
- Eval 引擎后台

## 3. 页面结构

```text
Evolution
├─ 最近学会
├─ 待确认
├─ 已接受
├─ 已拒绝
└─ 使用记录
```

Candidate Detail：

```text
学到了什么
↓
来源任务
↓
Evidence / Feedback / Outcome
↓
为什么值得学
↓
适用范围
↓
反例 / 风险
↓
以后会怎么做
↓
接受 / 修改 / 限定范围 / 拒绝
```

## 4. Candidate Card

必须显示：

```text
title
candidate_type
summary
source_task_count
confidence
applicable_scope
expected_behavior_change
status
```

禁止只显示技术 ID。

## 5. Candidate 类型

P0：

- Preference Candidate
- Decision Pattern Candidate
- Experience Candidate

只展示 Checklist / SKILL Candidate 的存在，不允许前端直接一键发布。

## 6. 用户操作

```text
接受
修改后接受
只适用于当前 Workspace
限定特定任务类型
拒绝
查看来源
查看过去应用记录
回退
```

## 7. 数据契约

```text
EvolutionReviewItem
- candidate_id
- candidate_type
- title
- proposed_change
- source_experience_ids[]
- source_task_ids[]
- evidence_refs[]
- feedback_refs[]
- outcome_refs[]
- applicable_scope
- counterexamples[]
- confidence
- expected_gain
- risk
- user_status
- created_at
- last_applied_at(optional)
- applied_count
```

## 8. 状态

```text
Draft
→ Candidate
→ Evidence Checked
→ Evaluated
→ User Review
→ Accepted / Rejected / Scoped
```

P0 前端只消费状态，不实现底层状态机逻辑。

## 9. Behavior Change Preview

用户接受前必须能看到：

```text
接受后：
在“政府汇报方案”任务中，默认优先从具体任务和落地结果进入，减少宏观趋势铺垫。
```

这是审核核心。

## 10. 使用记录

Accepted Candidate 被后续任务调用后，显示：

- 使用了几次
- 用在哪些 Task
- 用户是否关闭过
- 后续 Outcome

避免“学会了以后再也不知道有没有用过”。

## 11. 禁止事项

- 禁止用 Candidate 数量制造进化感。
- 禁止用户看不到行为变化预览。
- 禁止高影响 Candidate 自动接受。
- 禁止无 Outcome / Feedback 的弱证据 Candidate 伪装成高置信度经验。

## 12. 验收标准

1. 用户能理解 Candidate 的自然语言含义。
2. 用户能查看来源任务和 Evidence。
3. 用户能限定适用范围。
4. 用户接受前能看到 Behavior Change Preview。
5. Accepted Candidate 后续被调用时可追溯使用记录。
6. 用户可以回退。
