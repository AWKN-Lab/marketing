# 自主进化营销助理 PRD

> 仓库：`AWKN-Lab/marketing`  
> 文档版本：V1.2  
> 文档定位：产品母文档  
> 当前阶段：产品定位 / MVP / 产品组件 / Domain / SKILL / Eval  
> 边界：仅定义产品层。底层能力只预留接口，不展开内部实现。

---

# 1. 一页结论

## 1.1 产品定义

**自主进化营销助理**是一款会持续学习用户、客户、项目和营销方法，并把学到的经验自动应用到下一次任务中的 AI 营销产品。

它有三种核心工作方式：

1. **喂资料**：理解客户、项目、行业、历史方案和用户自己的方法。
2. **做任务**：研究、策略、方案、内容、会前准备、沟通与复盘。
3. **自主学习**：每天主动学习与当前客户、项目和目标相关的新信息，形成信号、判断和行动建议。

每次真实任务结束后，系统根据用户修改、采纳、否决和真实结果形成 Experience Candidate。下一次遇到相似任务时，优先调用已经验证过的方法。

一句话：

> **每做一次任务，下一次更懂你的生意。**

---

# 2. 产品战略

## 2.1 客户买什么

客户购买的核心结果：

- 新任务无需反复从头交代背景
- 以前做过的项目可以直接变成下一次任务的生产资料
- 用户自己的营销判断和方法可以长期沉淀
- 重要的新变化能够被主动发现
- 输出越来越符合用户自己的判断方式
- 已经验证有效的方法能够在相似任务中自动复用
- 已经发生过的错误有机会在后续任务中被提前识别

## 2.2 产品不做什么

V1 明确不做：

- CRM 替代品
- 销售 Pipeline 管理系统
- 通讯录管理系统
- Campaign Automation
- 群发与外呼平台
- 广告投放平台
- 通用知识库
- 通用 AI Chat
- Agent 平台
- Memory 产品
- 通用工作流平台

客户、人物、机构、项目、关系等对象继续存在，但只作为营销任务的上下文，不建设完整 CRM 产品。

## 2.3 核心竞争轴

市场上的 Sales AI 已经普遍覆盖：

```text
Context
→ Research
→ Signal
→ Next Best Action
→ Workflow
```

本产品重点增加：

```text
Task
→ User Feedback
→ Outcome
→ Experience
→ Evaluation
→ Behavior Change
→ Next Task
```

最终竞争力来自：

> **系统能否从用户自己的真实营销工作中持续学会更好的做法。**

---

# 3. 产品边界

## 3.1 本产品负责

自主进化营销助理只负责产品层：

- Marketing Workspace
- Marketing Domain
- Marketing Agent
- Marketing SKILL
- Marketing Eval
- 营销任务体验
- 项目上下文
- 业务资产
- 用户反馈
- Outcome
- Experience Candidate
- Evolution Candidate
- 产品层人工确认
- 产品界面

## 3.2 禁止重复建设

本仓库禁止重复建设：

- Agent Runtime
- 通用任务编排内核
- 通用记忆引擎
- 通用 MCP 框架
- 通用 Tool Registry
- 通用执行 Harness
- 通用 SKILL Runtime
- 通用模型路由
- 通用长期记忆生命周期

以上统一视为 AWKN 平台依赖。

## 3.3 预留接口

产品层只声明能力需求：

1. `AgentRuntimePort`
2. `MemoryPort`
3. `ToolPort`
4. `SkillPort`
5. `ApprovalPort`
6. `EventPort`
7. `EvalPort`

产品定义业务语义、业务状态和业务成功标准。

---

# 4. 产品核心闭环

## 4.1 主闭环

```text
资料 / 历史 / 外部世界
        ↓
      Context
        ↓
       Task
        ↓
     Judgment
        ↓
    Deliverable
        ↓
用户采纳 / 修改 / 否决
        ↓
      Outcome
        ↓
     Experience
        ↓
 Evolution Candidate
        ↓
 下一次相似任务自动应用
```

## 4.2 自主学习闭环

```text
当前 Workspace
      ↓
需要持续关注什么
      ↓
每日主动学习
      ↓
发现 Signal
      ↓
判断是否影响当前任务 / 项目
      ↓
生成建议
      ↓
用户行动 / 忽略
      ↓
Outcome
      ↓
Experience
```

## 4.3 V1 自主进化定义

V1 的自主进化必须能够被用户看见。

至少表现为：

1. 系统明确告诉用户“这次学到了什么”。
2. 用户能够接受、修改、否决 Candidate。
3. 系统明确告诉用户“下一次任务应用了哪些已经学会的方法”。
4. 用户可以查看学习依据和适用边界。
5. 错误 Candidate 不直接改变系统行为。

V1 暂不允许 Evolution Candidate 自动成为 Active SKILL。

---

# 5. MVP 要验证什么

MVP 不验证“能不能做一个 AI 营销工具”。

通用模型已经可以完成大量研究、写作和方案任务。

MVP 只验证三个问题：

### Q1：它能不能越来越懂用户？

同类型任务重复执行后：

- 用户需要补充的背景越来越少
- 用户修改越来越少
- 第一次输出可用率越来越高

### Q2：它能不能主动学习？

系统每天能够主动发现与当前 Workspace 真正有关的变化，并产生有行动价值的更新。

### Q3：它能不能从任务结果中学会方法？

系统能够把一次成功或失败任务提炼为结构化 Experience Candidate，并在相似任务中正确复用。

---

# 6. MVP 用户

V1 优先服务：

- 创始人 / 老板
- 高级营销负责人
- 品牌与营销顾问
- 政企客户负责人
- 负责高价值、长周期、复杂营销项目的人

共同特征：

- 同时处理多个客户和项目
- 决策依赖大量历史上下文
- 有明显个人方法和判断标准
- 工作成果大量存在于文档、会议、消息和历史方案里
- 单个项目价值高
- 经验复用价值高

V1 不针对：

- 大规模 SDR 外呼团队
- 电商自动投放团队
- 低客单高频标准化销售

---

# 7. 产品信息架构

MVP 主导航只保留 4 个入口：

```text
自主进化营销助理
│
├─ 01 今日
│  ├─ 今天该做什么
│  ├─ 新变化
│  ├─ 正在进行的任务
│  ├─ 待确认
│  └─ 今日学习
│
├─ 02 Workspace
│  ├─ 目标
│  ├─ 资料
│  ├─ 客户 / 人物 / 机构
│  ├─ 任务
│  ├─ 产出物
│  ├─ 决策
│  ├─ 关键时间线
│  └─ Outcome
│
├─ 03 营销助理
│  ├─ 对话
│  ├─ 新任务
│  ├─ 研究
│  ├─ 策略
│  ├─ 方案 / 内容
│  ├─ 会前 / 沟通准备
│  └─ 复盘
│
└─ 04 进化
   ├─ 最近学会
   ├─ Experience Candidate
   ├─ Evolution Candidate
   ├─ 已验证方法
   ├─ 被否决方法
   ├─ 使用记录
   └─ 版本 / 回退
```

删除独立的：

- 客户中心
- 联系人中心
- 机会 Pipeline
- 项目 Pipeline
- CRM 式关系管理后台

这些信息在 Workspace 中按任务需要呈现。

---

# 8. 页面一：今日

## 8.1 页面目标

用户打开产品后 30 秒内知道：

> **今天有什么值得我知道、值得我做、值得我确认。**

## 8.2 页面结构

### A. 今日重点

最多 5 条。

每条包含：

- Workspace
- 发生了什么
- 为什么重要
- 建议动作
- 依据
- 优先级

### B. 新变化

只展示与当前 Workspace 相关的变化：

- 客户变化
- 关键人员变化
- 政策变化
- 行业变化
- 项目变化
- 竞争变化
- 舆情 / 市场变化

### C. 继续任务

展示：

- 正在进行
- 等待用户信息
- 等待确认
- 等待结果

### D. 今日学习

展示系统当天主动学到的内容：

```text
发现什么
影响哪个 Workspace
影响什么判断
建议怎么处理
来源是什么
```

### E. 最近进化

只显示真正改变后续行为的内容，例如：

> 上周 3 次政府提案中，你都删除了“宏观趋势铺垫”，系统已形成候选偏好：政府项目方案优先从具体任务与落地结果进入。

用户操作：

- 接受
- 修改
- 拒绝
- 查看依据

---

# 9. 页面二：Workspace

Workspace 是产品核心业务容器。

它可以代表：

- 一个客户
- 一个政府部门
- 一个高价值客户群
- 一个品牌
- 一个营销项目
- 一次提案
- 一个长期课题

## 9.1 Workspace 首页回答 5 个问题

1. 当前目标是什么
2. 已经知道什么
3. 正在做什么
4. 最近发生什么
5. 下一步最值得做什么

## 9.2 Workspace 模块

### A. Goal

字段：

- primary_goal
- success_criteria
- deadline
- constraints
- owner
- status

### B. Context

包含：

- 客户 / 机构
- 人物
- 项目背景
- 历史合作
- 已确认事实
- 用户判断
- 关键约束

### C. Materials

支持：

- 文档
- PPT
- PDF
- 表格
- 网页
- 链接
- 会议记录
- 聊天记录
- 用户手工输入

每份材料必须保留来源和时间。

### D. Tasks

每个 Task 包含：

- 目标
- 输入
- 使用上下文
- 使用 SKILL
- 输出
- 用户反馈
- 真实结果
- 复盘

### E. Artifacts

例如：

- 研究报告
- 策略判断
- 提案
- 汇报框架
- 演讲稿
- 文案
- 会前 Brief
- 沟通建议
- 复盘

### F. Decision Log

记录：

- 做了什么判断
- 为什么
- 谁确认
- 当时依据
- 后来结果

### G. Timeline

只保留影响判断的关键事件。

避免建设完整 CRM 活动流水账。

---

# 10. 页面三：营销助理

## 10.1 产品形态

营销助理采用 Task-first 交互。

用户可以直接说：

- 把这些资料吃透
- 研究这个客户
- 帮我判断这个项目值不值得追
- 做一份明天汇报的策略框架
- 看看这版方案哪里有问题
- 帮我准备明天和某部门领导的沟通
- 复盘刚刚输掉的项目
- 每天帮我学习这个行业和这几个客户

## 10.2 每个任务输出必须包含

### 任务结果

用户真正需要的产出物。

### 关键依据

事实、来源和重要历史上下文。

### 判断

哪些是事实，哪些是推断，哪些仍待确认。

### 学到的方法

当任务存在明确用户修改或真实 Outcome 时，任务结束后提示：

> 本次是否有值得沉淀的方法？

### 已调用经验

如果系统复用了历史方法，要明确展示：

```text
本次应用：
- 政府方案先讲具体任务，再进入策略
- 同类汇报第一页控制在一个核心判断

来源：
- Workspace A / Task 17
- Workspace B / Task 09
```

这是“自主进化”最重要的可见证据之一。

---

# 11. 页面四：进化

进化中心不做技术后台。

它只回答：

> **这个助理最近学会了什么，为什么学会，之后会怎么做。**

## 11.1 最近学会

展示：

- 学到了什么
- 来源任务
- 依据
- 适用场景
- 反例
- 置信度
- 用户状态

## 11.2 Candidate 类型

V1 允许形成：

- Preference Candidate
- Decision Pattern Candidate
- Experience Candidate
- Checklist Candidate
- SKILL Candidate

V1 只允许前三类影响个性化建议。

Checklist / SKILL Candidate 必须人工确认后进入后续验证流程。

## 11.3 用户控制

用户可以：

- 接受
- 修改
- 拒绝
- 标记只适用于某 Workspace
- 标记全局适用
- 查看来源
- 查看后续被使用过几次
- 回退

---

# 12. Marketing Domain Model

V1 Domain 围绕“营销工作”设计，不围绕 CRM 设计。

## 12.1 Workspace

```text
workspace_id
name
workspace_type
goal
success_criteria
constraints
priority
owner
status
created_at
updated_at
```

## 12.2 Entity

通用上下文实体。

```text
entity_id
workspace_id
entity_type
name
attributes
relationships
source_refs
confidence
status
```

`entity_type` 可以包括：

- person
- organization
- department
- brand
- project
- policy
- competitor
- audience
- product

V1 不为每一种实体建设独立后台。

## 12.3 Material

```text
material_id
workspace_id
material_type
title
source
source_time
content_ref
summary
tags
status
```

## 12.4 Task

```text
task_id
workspace_id
task_type
goal
input_refs
context_refs
skill_ids
started_at
completed_at
status
```

## 12.5 Artifact

```text
artifact_id
task_id
workspace_id
artifact_type
content_ref
version
status
created_at
```

## 12.6 Signal

```text
signal_id
workspace_id
entity_ids
signal_type
content
source_ref
occurred_at
relevance
urgency
confidence
status
```

## 12.7 Decision

```text
decision_id
workspace_id
task_id
decision
reason
evidence_refs
confidence
confirmed_by
status
```

## 12.8 Feedback

```text
feedback_id
task_id
artifact_id
feedback_type
original_content
modified_content
reason(optional)
created_at
```

`feedback_type`：

- accept
- edit
- reject
- retry
- partial_accept

## 12.9 Outcome

```text
outcome_id
task_id
workspace_id
expected_outcome
actual_outcome
outcome_type
business_effect
evidence_refs
occurred_at
```

## 12.10 Experience Candidate

```text
experience_id
source_task_ids
situation
goal
constraints
action
feedback
outcome
success_factor
failure_factor
root_cause
lesson
applicable_scope
counterexamples
evidence_refs
confidence
status
```

## 12.11 Evolution Candidate

```text
evolution_id
candidate_type
source_experience_ids
proposed_change
applicable_scope
expected_gain
risk
validation_status
user_status
version
```

---

# 13. Marketing Agent

MVP 只设一个：

> **Marketing Agent**

不拆研究 Agent、策略 Agent、文案 Agent、学习 Agent、复盘 Agent。

通过不同 SKILL 完成任务。

## 13.1 核心职责

1. 理解营销任务目标
2. 获取 Workspace 上下文
3. 选择需要的 SKILL
4. 获取必要的外部信息
5. 形成判断
6. 交付任务结果
7. 引用依据
8. 读取适用的已验证 Experience
9. 记录用户反馈与 Outcome
10. 触发 Experience Candidate

## 13.2 禁止事项

- 把推测写成事实
- 无依据改写关键客户事实
- 未经确认对外做高风险承诺
- 未经确认发送正式外部材料
- 未经确认发布新的 Rule / SKILL
- 因单次用户修改直接形成全局规则

---

# 14. MVP SKILL 体系

首批 6 个 SKILL：

```text
Marketing Agent
│
├─ S1 资料消化与上下文构建
├─ S2 营销研究与每日学习
├─ S3 策略判断
├─ S4 方案与内容生产
├─ S5 会前与沟通准备
└─ S6 任务复盘与经验提炼
```

---

# 15. S1 资料消化与上下文构建

## 输入

```text
workspace_id
material_refs
user_goal(optional)
```

## 输出

```text
confirmed_facts
entities
important_history
user_viewpoints
constraints
open_questions
potential_conflicts
source_refs
```

## 成功标准

- 能把大量历史资料变成可调用 Context
- 重要事实有来源
- 冲突信息被标记
- 不重复生成已有事实
- 不把推测写入已确认事实

---

# 16. S2 营销研究与每日学习

## 输入

```text
workspace_id
research_goal
watch_scope
known_context
freshness_requirement
```

## 输出

```text
new_facts
signals
changes
why_it_matters
impact_on_current_judgment
action_required
unknowns
source_refs
```

## 两种模式

### On-demand Research

用户主动发起一次研究任务。

### Daily Learning

围绕 Workspace 自动学习。

每天只输出：

- 新变化
- 影响
- 建议动作
- 来源

禁止生成无关新闻摘要。

---

# 17. S3 策略判断

## 输入

```text
workspace_id
goal
context
signals
constraints
relevant_experiences
```

## 输出

```text
core_judgment
key_problem
strategic_options
recommended_direction
reasoning_summary
risks
unknowns
next_actions
evidence_refs
applied_experience_refs
```

## 成功标准

- 给出明确判断
- 结论能够转化成下一步
- 引用与当前场景相符的历史 Experience
- 不堆通用营销理论

---

# 18. S4 方案与内容生产

## 输入

```text
workspace_id
artifact_type
goal
audience
context
constraints
reference_materials
relevant_experiences
```

## 输出

```text
artifact
key_message
structure
assumptions
evidence_refs
applied_experience_refs
```

## 覆盖任务

- PRD / 提案
- 营销策略
- 品牌方案
- 汇报框架
- 演讲稿
- 文案
- 会议材料
- 一页纸

## 进化重点

用户对产出物的修改必须被捕获为 Feedback。

系统重点学习：

- 用户删掉什么
- 用户保留什么
- 用户重写什么
- 用户经常调整的逻辑顺序
- 哪些表达在什么场景被接受

单次修改不能直接变成全局偏好。

---

# 19. S5 会前与沟通准备

## 输入

```text
workspace_id
meeting_goal
participants
relevant_history
latest_signals
open_items
```

## 输出

```text
one_page_brief
what_changed
participant_context
important_history
open_commitments
meeting_objective
key_questions
recommended_talking_points
avoid_points
ideal_next_step
evidence_refs
```

## 成功标准

- 3 分钟内可读完
- 能找到历史关键承诺
- 能发现与当前会议直接相关的新变化
- 给出明确会议目标

---

# 20. S6 任务复盘与经验提炼

## 输入

```text
task_id
original_goal
original_output
user_feedback
actual_action
outcome
evidence_refs
```

## 输出

```text
facts
expected_vs_actual
user_changes
success_factors
failure_factors
root_cause
correction
lesson
applicable_scope
counterexamples
experience_candidate
```

## 规则

任务复盘只产生 Candidate。

V1 禁止直接成为：

- Rule
- Checklist
- SKILL
- Policy

---

# 21. 自主进化机制

## 21.1 什么值得学习

优先级从高到低：

### A. 真实 Outcome

- 项目推进
- 方案通过
- 客户接受
- 会议达成目标
- 成交
- 丢单
- 项目失败

### B. 用户明确行为

- 接受
- 修改
- 拒绝
- 重做
- 指定原因

### C. 重复模式

相似场景反复出现相同修改、相同选择或相同结果。

## 21.2 Candidate 最低标准

每个 Candidate 至少包含：

- Situation
- Goal
- Action
- Feedback / Outcome
- Evidence
- Lesson
- Applicable Scope
- Counterexample
- Confidence

缺失真实反馈或 Outcome 时，只能形成低置信度候选。

## 21.3 状态机

```text
Draft
↓
Candidate
↓
Evidence Checked
↓
Evaluated
↓
User Review
↓
Accepted / Rejected / Scoped
```

V1 到此结束。

## 21.4 下一次如何应用

当新任务满足 Candidate 的适用边界时：

```text
New Task
↓
Match Experiences
↓
Select Relevant Experience
↓
Apply
↓
Show User What Was Applied
↓
Task Outcome
↓
Update Confidence
```

“应用过什么经验”必须可见、可追溯。

---

# 22. Product Eval

产品必须同时评价“任务价值”和“进化价值”。

## 22.1 业务北极星

> **高价值营销任务推进成功率**

定义：

任务完成后，是否达成任务预设的业务目标或明确推动 Workspace 进入下一状态。

示例：

- 提案完成并进入下一轮
- 会议达成预设目标
- 方案获得采用
- 客户给出关键反馈
- 项目完成关键决策

## 22.2 进化北极星

> **相似任务质量增益**

观察同类任务随使用时间变化：

- 一次通过率是否提升
- 用户修改量是否下降
- 补充上下文次数是否下降
- 已验证 Experience 是否被正确复用
- Outcome 是否改善

## 22.3 一级指标

| 指标 | 方向 |
|---|---:|
| First-pass Adoption | ↑ |
| User Edit Distance | ↓ |
| Context Re-entry | ↓ |
| Evidence Coverage | ↑ |
| Fact Error Rate | ↓ |
| Task Completion Time | ↓ |
| Relevant Experience Reuse | ↑ |
| Proactive Signal Actionability | ↑ |
| User Override Rate | ↓ |
| Outcome Success | ↑ |

## 22.4 禁止虚荣指标

以下不能单独证明产品成功：

- Memory 数量
- Candidate 数量
- 每日抓取信息数量
- Agent 执行次数
- Token 数量
- SKILL 数量

---

# 23. Human Gate

以下动作默认必须人工确认：

1. 对外发送正式消息
2. 报价
3. 商务承诺
4. 合同相关表达
5. 政府正式材料提交
6. 敏感数据外发
7. 修改关键事实
8. 接受高影响全局 Evolution Candidate
9. 发布新的营销 Rule / SKILL

低风险动作可以自动：

- 公开信息学习
- 内部资料整理
- 研究
- 草稿生成
- 会前准备
- 复盘候选生成
- 提醒

---

# 24. 产品层接口契约

只定义需求，不定义底层实现。

## 24.1 AgentRuntimePort

```text
run_task(goal, workspace_context, allowed_skills, policy)
```

产品关心：

- 结果
- 状态
- 证据
- 使用了哪些 SKILL
- 使用了哪些 Experience

## 24.2 MemoryPort

```text
query_context(scope, query)
write_business_record(record, evidence)
query_experiences(scope, task_context)
```

产品关心：

- 有效上下文
- 来源
- 适用范围
- 可追溯性

## 24.3 ToolPort

```text
search(source, query)
execute(tool, input)
```

## 24.4 SkillPort

```text
invoke(skill_id, input)
evaluate(skill_id, test_case)
```

## 24.5 ApprovalPort

```text
request_approval(action, reason, payload)
```

返回：

```text
approved
rejected
approver
timestamp
modified_payload(optional)
```

## 24.6 EventPort

产品需要订阅：

```text
workspace.updated
material.added
task.completed
feedback.recorded
outcome.recorded
signal.detected
candidate.created
candidate.reviewed
```

## 24.7 EvalPort

```text
evaluate(candidate, baseline, criteria)
```

Marketing Product 定义业务评价标准。

---

# 25. MVP 主流程

## 流程 A：喂资料

```text
创建 Workspace
↓
给出目标
↓
上传资料 / 链接 / 历史内容
↓
系统提取 Context
↓
用户确认关键事实
↓
Workspace Ready
```

## 流程 B：做任务

```text
用户提出营销任务
↓
读取 Workspace Context
↓
匹配历史 Experience
↓
调用 SKILL
↓
交付结果 + 依据 + 已应用经验
↓
用户接受 / 修改 / 拒绝
↓
记录 Outcome
↓
任务复盘
↓
Experience Candidate
```

## 流程 C：每日自主学习

```text
Workspace Watch Scope
↓
主动学习
↓
发现新 Signal
↓
关联当前 Context
↓
判断影响
↓
生成今日更新
↓
需要时建议 Task / Action
```

## 流程 D：自主进化

```text
多个 Task / Feedback / Outcome
↓
发现重复模式
↓
生成 Candidate
↓
Evidence Check
↓
Eval
↓
用户确认
↓
限定适用范围
↓
下一次相似任务调用
↓
显示调用记录
```

---

# 26. MVP P0

只做能够证明三件事的能力：

> **记得住上下文、会主动学习、任务结果会反哺下一次。**

P0：

- Workspace
- Goal
- Material Feed
- Context Build
- 单 Marketing Agent
- 6 个基础 SKILL
- Task 运行记录
- Artifact
- Evidence 引用
- 用户接受 / 修改 / 拒绝
- Outcome 记录
- Experience Candidate
- Candidate Review
- Experience Match
- 下一次任务显示“应用了什么经验”
- Daily Learning
- 今日页面

---

# 27. MVP 暂缓

以下全部后移：

- 完整客户 CRM
- 完整联系人管理
- 销售漏斗
- 商机 Kanban
- 关系网络大图
- 自动外呼
- 自动群发
- Campaign Automation
- 广告投放
- 多 Agent
- 团队复杂权限
- 高净值专用 Pack
- 政企专用 Pack
- 自动 SKILL 发布

等基础闭环验证后，再根据真实用户需求决定是否进入产品。

---

# 28. V1 验收标准

产品进入下一阶段前必须完成真实任务验证。

最低验收：

1. 建立至少 5 个真实 Workspace。
2. 每个 Workspace 有真实历史资料。
3. 连续完成至少 30 个真实营销任务。
4. 任务覆盖研究、策略、内容、会议准备、复盘等多个类型。
5. 关键事实能够追溯来源。
6. 每个任务能够记录用户接受、修改或拒绝。
7. 至少 15 个任务记录真实 Outcome。
8. 能形成结构化 Experience Candidate。
9. Candidate 不自动发布为 SKILL。
10. 至少有 5 个 Candidate 在后续相似任务中被再次匹配。
11. 用户可以看到系统在新任务中应用了什么历史经验。
12. 至少有一类重复任务出现可观察的质量提升。
13. Daily Learning 连续运行，并能产生与真实 Workspace 有关的有效 Signal。

---

# 29. 核心产品演示

V1 Demo 必须用一个真实 Workspace 完成完整闭环。

推荐演示顺序：

```text
1. 喂入历史资料
2. 系统快速理解项目
3. 用户提出一个真实营销任务
4. 系统交付结果
5. 用户修改其中一个关键判断或表达
6. 记录任务结果
7. 系统形成 Experience Candidate
8. 用户确认 Candidate
9. 发起第二个相似任务
10. 系统明确显示“本次应用了上次学到的方法”
11. 第二次输出更贴近用户要求
12. 展示当天主动学习发现的新 Signal
```

如果 Demo 无法清楚展示第 7—10 步，产品就仍然只是一个带上下文的营销 AI 助手。

---

# 30. 产品终局

长期形成三类产品资产：

```text
业务上下文资产
+
营销经验资产
+
持续进化的业务能力资产
```

最终用户感受到的变化：

1. 新项目启动越来越快
2. 历史项目可以持续复用
3. 助理越来越理解用户自己的判断方式
4. 重要变化能够主动送到用户面前
5. 相似任务质量持续提升
6. 团队营销方法可以从个人经验变成长期资产

终局产品价值：

> **让一个营销高手做过的每一件事，都能成为下一次做得更好的起点。**
