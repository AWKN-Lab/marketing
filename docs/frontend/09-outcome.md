# C09 Outcome｜真实结果记录

## 1. 目标

记录“任务做完以后发生了什么”，让系统学习真实业务结果，而不只学习用户喜欢什么表达。

## 2. 边界

负责：

- Expected Outcome
- Actual Outcome
- Business Effect
- Outcome Evidence
- Outcome 时间
- 与 Task / Artifact / Feedback 关联

不负责：

- CRM 全量阶段管理
- 财务系统
- 自动认定成交归因

## 3. Outcome 入口

Task 完成后进入：

```text
Completed
→ Needs Outcome
→ Outcome Recorded
→ Closed
```

也支持用户后补 Outcome。

## 4. P0 Outcome 类型

```text
目标达成
部分达成
无明显结果
失败
等待结果
```

业务效果可补充：

- 客户接受
- 进入下一轮
- 会议目标达成
- 方案通过
- 获取关键反馈
- 项目推进
- 项目暂停
- 丢单
- 成交
- 其他

## 5. UI

轻量模式：

```text
这次任务结果怎么样？
[达成] [部分达成] [没变化] [失败] [还不知道]
```

需要时展开：

- 发生了什么
- 业务影响
- 证据 / 文件 / 消息
- 结果时间

## 6. 数据契约

```text
OutcomeRecord
- outcome_id
- task_id
- workspace_id
- artifact_ids[]
- expected_outcome
- actual_outcome
- outcome_type
- business_effect
- evidence_refs[]
- occurred_at
- recorded_at
- confidence(optional)
```

## 7. 事件

输入：

- task.completed
- user.record_outcome
- outcome.reminder_due

输出：

- outcome.recorded
- outcome.updated
- task.closed

## 8. 交互原则

- Outcome 可以晚于 Task 完成。
- “还不知道”是合法状态。
- 结果必须允许以后更新。
- 有业务结果时，Outcome 权重高于单纯用户偏好。

## 9. 禁止事项

- 禁止将用户“满意”直接等同业务成功。
- 禁止因为 Artifact 被采用就自动标记项目推进。
- 禁止没有证据的成交 / 丢单被系统自行确定。

## 10. 验收标准

1. Completed Task 可进入 Needs Outcome。
2. 用户 10 秒内能完成轻量 Outcome 记录。
3. Outcome 支持后补和修改。
4. Outcome 能追溯 Task / Artifact / Evidence。
5. Experience Candidate 可读取 Expected vs Actual。
