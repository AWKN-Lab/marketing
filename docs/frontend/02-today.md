# C02 Today｜今日

## 1. 目标

Today 是产品的日常入口。

用户打开后 30 秒内知道：

> **今天有什么值得我知道、值得我做、值得我确认。**

Today 不生产自己的业务数据，只聚合 Workspace、Task、Signal、Approval、Outcome、Evolution 的真实状态。

## 2. 边界

负责：

- 今日重点
- 新变化
- 继续任务
- 待确认
- Outcome 待补
- 今日学习
- 最近进化

不负责：

- CRM Dashboard
- 销售漏斗
- KPI 大屏
- 独立任务系统

## 3. 页面结构

```text
Today
├─ A. 今天最值得做
├─ B. 新变化
├─ C. 继续任务
├─ D. 待确认
├─ E. 待补 Outcome
├─ F. 今日学习
└─ G. 最近进化
```

## 4. A｜今天最值得做

最多 5 条。

每条：

```text
workspace
what_happened
why_it_matters
recommended_task_or_action
priority
evidence_refs
```

用户可：

- 开始任务
- 查看依据
- 稍后
- 忽略

## 5. B｜新变化

只展示与活跃 Workspace 相关 Signal。

卡片必须说明：

- 发生什么
- 影响哪个 Workspace
- 可能改变什么判断
- 是否建议行动
- 来源

禁止只展示新闻标题。

## 6. C｜继续任务

聚合状态：

- Running
- Waiting for User
- Waiting for Approval
- Needs Outcome

每条点击直接回到 Task Workbench。

## 7. D｜待确认

包括：

- 外部动作 Approval
- 关键事实冲突确认
- Evolution Candidate Review

按风险和时效排序。

## 8. E｜待补 Outcome

显示近期已经完成但仍缺实际结果的高价值 Task。

默认不每天无限提醒；允许：

- 结果已出
- 还不知道
- 稍后提醒
- 不再追踪

## 9. F｜今日学习

只展示 Daily Learning 的高价值结果：

```text
发现什么
为什么重要
影响什么判断
建议下一步
Evidence
```

低价值信息折叠，不制造信息流。

## 10. G｜最近进化

只展示会改变后续行为的 Candidate / Accepted Experience。

例如：

```text
从最近 3 次方案修改中发现：
政府类汇报中，你持续删掉宏观趋势铺垫。

当前状态：待确认
以后可能改变：政府汇报默认从具体任务进入。
```

## 11. 数据契约

```text
TodayView
- priorities[]
- signals[]
- active_tasks[]
- approval_items[]
- outcome_pending[]
- daily_learning[]
- evolution_updates[]
```

所有条目必须携带原业务对象引用，不复制形成第二套状态。

## 12. 排序原则

优先级综合：

1. 业务影响
2. 时效性
3. 是否阻塞任务
4. 是否需要人工确认
5. Workspace 优先级

具体打分算法由产品层后续 Eval/Policy 定义，前端只消费排序结果。

## 13. 禁止事项

- 禁止静态 KPI 卡片占据首屏。
- 禁止按“信息最新”代替“业务最重要”。
- 禁止展示与当前 Workspace 无关的新闻。
- 禁止 Today 自己创建一套 Task / Signal / Candidate 数据。

## 14. 验收标准

1. 首屏最多 5 个真正重要行动。
2. 每个重点可追溯原因和 Evidence。
3. 能直接继续未完成 Task。
4. Approval / Outcome / Evolution 不遗漏。
5. Daily Learning 只保留有行动价值的信息。
6. Today 所有数据都来自真实业务组件状态。
