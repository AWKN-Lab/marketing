# 自主进化营销助理 PRD

> 仓库：`AWKN-Lab/marketing`  
> 文档版本：V1.1  
> 文档定位：产品母文档  
> 当前阶段：产品结构 / MVP / 领域模型 / SKILL 契约  
> 边界：仅定义产品层。底层能力只预留接口，不展开内部实现。

---

# 1. 产品结论

## 1.1 产品定义

**自主进化营销助理**是一款面向关键客户经营场景的垂直营销产品。

它帮助用户持续经营重要客户：

- 记住客户与项目历史
- 发现新的业务变化
- 判断当前机会和风险
- 给出下一步行动
- 跟踪结果
- 从真实任务中沉淀可验证经验

第一阶段只验证一个核心问题：

> **系统能否比人更持续地经营 20 个真实关键客户。**

## 1.2 对外卖什么

不卖：

- 企业 Memory Layer
- 通用 AI 助手
- 通用 CRM
- Agent 平台
- 技术基础设施

对外卖：

> **关键客户持续经营能力。**

客户购买的直接结果：

1. 重要客户不漏跟
2. 历史信息不丢失
3. 客户变化更早发现
4. 下一步行动更明确
5. 关键项目持续往前推进
6. 团队经验可持续积累

## 1.3 产品主张

品牌表达可使用：

> **生意不能忘。**

产品解释：

> 自动记住每一个重要客户发生过什么、正在发生什么、接下来该做什么。

---

# 2. 产品边界

## 2.1 本产品负责

自主进化营销助理只负责营销产品层：

- Marketing Domain
- Marketing Agent
- Marketing SKILL
- Marketing Eval
- 产品交互
- 客户经营工作流
- 业务状态
- 业务规则
- 业务成功标准
- 产品层权限与人工确认节点

## 2.2 本产品不负责

禁止在本产品中重复建设：

- Agent Runtime
- 通用任务编排内核
- 通用记忆引擎
- 通用 MCP 框架
- 通用 Tool Registry
- 通用执行 Harness
- 通用 Skill Runtime
- 通用模型路由
- 通用长期记忆生命周期

以上能力统一视为 AWKN 平台依赖。

## 2.3 预留平台接口

产品层只声明能力需求，不约束底层实现。

预留接口类型：

1. `AgentRuntimePort`
2. `MemoryPort`
3. `ToolPort`
4. `SkillPort`
5. `ApprovalPort`
6. `EventPort`
7. `EvalPort`

所有接口遵循：

> 产品定义业务语义，平台负责通用执行能力。

---

# 3. 核心业务闭环

产品核心公式：

```text
Signal
  ↓
Customer State
  ↓
Judgment
  ↓
Action
  ↓
Outcome
  ↓
Experience
  ↓
Evolution Candidate
```

对应业务含义：

| 环节 | 产品回答的问题 |
|---|---|
| Signal | 客户或外部环境发生了什么变化 |
| Customer State | 这个客户现在处于什么状态 |
| Judgment | 当前最值得关注的机会、风险和阻塞是什么 |
| Action | 今天应该做什么 |
| Outcome | 做完以后客户有没有往前推进 |
| Experience | 这次任务学到了什么 |
| Evolution Candidate | 哪些经验值得成为可复用能力 |

---

# 4. MVP 目标

## 4.1 MVP 验证目标

选择 20 个真实关键客户，连续经营。

系统必须做到：

1. 建立完整客户档案
2. 聚合客户历史
3. 识别关键变化
4. 给出最多 3 个下一步动作
5. 所有重要判断可追溯依据
6. 用户执行后记录结果
7. 从结果中形成 Experience Candidate
8. 不自动发布进化结果

## 4.2 MVP 不做

V1 暂不做：

- 全量 CRM 替代
- 自动外呼
- 全自动邮件发送
- 全自动商务承诺
- 全自动报价
- 全自动政府正式材料提交
- 多 Agent 群体协作
- 自动发布 Skill
- 自动修改核心业务规则
- 高净值客户与政企客户同时建两套产品

---

# 5. 产品组件树

```text
Marketing Product
│
├─ 01 今日工作台
│  ├─ 今日重点客户
│  ├─ 今日行动
│  ├─ 新变化
│  ├─ 到期承诺
│  ├─ 风险预警
│  └─ 待确认建议
│
├─ 02 客户中心
│  ├─ 客户列表
│  ├─ 客户详情
│  ├─ 联系人
│  ├─ 关系网络
│  ├─ 项目 / 机会
│  ├─ 沟通时间线
│  ├─ 承诺
│  ├─ 客户状态
│  └─ 下一步行动
│
├─ 03 项目与机会
│  ├─ 项目列表
│  ├─ 机会列表
│  ├─ 阶段
│  ├─ 决策链
│  ├─ 阻塞
│  ├─ 风险
│  ├─ 竞争态势
│  └─ 推进记录
│
├─ 04 营销助理
│  ├─ 对话
│  ├─ 客户研究
│  ├─ 会前准备
│  ├─ 关系分析
│  ├─ 机会判断
│  ├─ 跟进建议
│  ├─ 文案生成
│  └─ 复盘
│
├─ 05 学习中心
│  ├─ 每日学习
│  ├─ 外部信号
│  ├─ 学习记录
│  ├─ Experience Candidate
│  └─ 待确认知识
│
├─ 06 进化中心
│  ├─ Candidate
│  ├─ 证据
│  ├─ 适用边界
│  ├─ 反例
│  ├─ Eval 结果
│  ├─ 人工审批
│  └─ 版本历史
│
└─ 07 设置
   ├─ 客户范围
   ├─ 数据源
   ├─ 权限
   ├─ 通知
   ├─ 人工确认策略
   └─ 业务目标
```

---

# 6. 核心页面

## 6.1 页面一：今日工作台

### 目标

用户打开产品后 30 秒内知道：

> **今天最值得推进什么。**

### 页面结构

#### A. 今日最重要的 5 件事

每条必须包含：

- 客户
- 项目 / 机会
- 推荐动作
- 推荐原因
- 紧急度
- 依据
- 是否需要人工确认

示例：

```text
厦门某文旅部门
建议：今天联系项目负责人确认 Q4 活动规划
原因：
- 上次会议约定本周确认
- 过去 6 天没有新互动
- 昨日发布新的文旅促消费政策
```

#### B. 新变化

展示：

- 人员变化
- 政策变化
- 项目变化
- 客户公开动态
- 企业动态
- 采购动态
- 竞争动态

#### C. 待处理承诺

展示：

- 我方承诺
- 客户承诺
- 截止日期
- 当前状态

#### D. 风险预警

例如：

- 30 天无实质推进
- 关键联系人离职
- 项目预算变化
- 竞争对手进入
- 已承诺事项逾期
- 决策链缺失

---

# 7. 客户作战页

客户作战页是 MVP 最重要页面。

## 7.1 页面目标

回答六个问题：

1. 我们知道什么
2. 最近发生什么
3. 现在是什么状态
4. 有什么机会和风险
5. 今天应该做什么
6. 做完以后怎么样

## 7.2 页面模块

### A. 客户摘要

- 客户名称
- 客户类型
- 当前关系阶段
- 当前项目
- 当前机会
- 关键联系人
- 最近互动
- 下一关键时间点

### B. 客户关系图

展示：

- 人
- 部门
- 角色
- 关系
- 决策影响力
- 我方连接人

### C. 时间线

统一展示：

- 会议
- 消息
- 邮件
- 文件
- 电话记录
- 项目变化
- 外部信号
- 承诺
- 决策
- Outcome

### D. 当前判断

统一输出：

- 客户状态
- 项目阶段
- 机会等级
- 关系温度
- 关键阻塞
- 当前风险
- 建议策略

### E. 下一步行动

最多 3 条。

每一条必须回答：

- 做什么
- 找谁
- 为什么现在做
- 预期结果
- 风险
- 依据

### F. 证据抽屉

任何关键判断均可展开查看：

- 原消息
- 原会议
- 原文件
- 原网页
- 原历史记录
- 历史 Experience

---

# 8. Marketing Domain Model

## 8.1 Account

代表一个需要持续经营的客户主体。

核心字段：

| 字段 | 含义 |
|---|---|
| account_id | 唯一 ID |
| name | 客户名称 |
| account_type | 政府 / 企业 / 机构 / 其他 |
| industry | 行业 |
| region | 地区 |
| owner | 内部负责人 |
| priority | 优先级 |
| relationship_stage | 关系阶段 |
| status | 活跃 / 暂停 / 结束 |
| last_interaction_at | 最近互动时间 |
| next_action_at | 下一动作时间 |
| tags | 标签 |

## 8.2 Organization

用于表示客户内部组织结构。

字段：

- organization_id
- account_id
- name
- organization_type
- parent_id
- responsibility
- region
- status

## 8.3 Person

字段：

- person_id
- account_id
- organization_id
- name
- title
- role
- influence_level
- decision_role
- contact_channel
- relationship_strength
- preferences
- concerns
- last_interaction_at
- status

## 8.4 Relationship

字段：

- relationship_id
- subject_id
- object_id
- relationship_type
- strength
- direction
- source
- confidence
- valid_from
- valid_to

## 8.5 Project

字段：

- project_id
- account_id
- name
- project_type
- stage
- objective
- budget_status
- timeline
- owner
- stakeholders
- blockers
- competitors
- next_milestone
- status

## 8.6 Opportunity

字段：

- opportunity_id
- account_id
- project_id
- title
- opportunity_type
- stage
- value_estimate
- probability
- urgency
- evidence
- blockers
- risks
- next_action
- status

## 8.7 Interaction

字段：

- interaction_id
- account_id
- person_ids
- project_id
- channel
- occurred_at
- summary
- key_points
- customer_requests
- objections
- commitments
- next_steps
- source_ref

## 8.8 Commitment

字段：

- commitment_id
- account_id
- project_id
- person_id
- commitment_owner
- content
- due_at
- status
- completed_at
- evidence_ref

## 8.9 Signal

字段：

- signal_id
- account_id
- person_id
- project_id
- signal_type
- source
- occurred_at
- content
- relevance
- urgency
- confidence
- status

## 8.10 Action

字段：

- action_id
- account_id
- project_id
- person_id
- action_type
- content
- reason
- expected_outcome
- due_at
- priority
- approval_required
- status

## 8.11 Outcome

字段：

- outcome_id
- action_id
- account_id
- project_id
- outcome_type
- result
- stage_change
- relationship_change
- value_change
- evidence_ref
- occurred_at

## 8.12 Experience Candidate

字段：

- experience_id
- source_task_id
- account_type
- situation
- goal
- constraints
- action
- result
- outcome
- root_cause
- lesson
- applicable_scope
- counterexamples
- evidence_refs
- confidence
- status

---

# 9. 客户阶段模型

MVP 默认采用简化阶段：

```text
发现
↓
建立联系
↓
形成需求
↓
进入项目
↓
方案 / 沟通
↓
决策推进
↓
成交 / 合作
↓
持续经营
```

每个客户和项目必须允许：

- 前进
- 停滞
- 回退
- 暂停
- 结束

阶段变化必须记录原因与证据。

---

# 10. Marketing Agent

## 10.1 单 Agent 原则

MVP 只设一个：

> **Marketing Agent**

暂不拆分研究 Agent、销售 Agent、复盘 Agent、学习 Agent。

Marketing Agent 通过不同 SKILL 完成任务。

## 10.2 核心职责

Marketing Agent 负责：

1. 理解用户营销目标
2. 获取当前客户上下文
3. 判断所需 SKILL
4. 组织业务任务
5. 输出营销判断
6. 给出可执行动作
7. 引用证据
8. 要求必要人工确认
9. 记录任务结果
10. 触发复盘与 Experience Candidate

## 10.3 禁止事项

Marketing Agent 不得：

- 未经确认对外发送高风险内容
- 未经确认做价格承诺
- 未经确认做合同承诺
- 未经确认提交政府正式文件
- 把推测写成事实
- 删除关键历史证据
- 自动发布进化后的 Skill

---

# 11. Marketing SKILL 体系

MVP 首批只做 6 个 SKILL。

```text
Marketing Agent
│
├─ S1 客户研究
├─ S2 关系分析
├─ S3 机会判断
├─ S4 会前准备
├─ S5 跟进建议
└─ S6 任务复盘
```

---

# 12. S1 客户研究 SKILL

## 输入

```text
account_id
research_goal
known_context
allowed_sources
freshness_requirement
```

## 输出

```text
account_summary
key_people
organization_changes
business_changes
policy_or_market_signals
potential_projects
risks
unknowns
evidence_refs
```

## 成功标准

- 新信息有来源
- 已知信息不重复堆砌
- 明确区分事实 / 判断 / 待验证
- 研究结果能影响后续行动

---

# 13. S2 关系分析 SKILL

## 输入

```text
account_id
project_id(optional)
relationship_graph
interaction_history
```

## 输出

```text
key_decision_makers
influencers
supporters
blockers
missing_relationships
relationship_risks
recommended_connection_path
evidence_refs
```

## 成功标准

- 决策链更清楚
- 能指出关系缺口
- 能形成具体连接动作

---

# 14. S3 机会判断 SKILL

## 输入

```text
account_id
project_id
signals
customer_state
interaction_history
```

## 输出

```text
opportunity_level
opportunity_reason
urgency
probability
blockers
risks
why_now
recommended_strategy
next_actions
evidence_refs
```

## 成功标准

判断最终必须转化成：

> 下一步是否值得投入，以及应该投入什么动作。

---

# 15. S4 会前准备 SKILL

## 输入

```text
account_id
meeting_time
participants
meeting_goal
project_id(optional)
```

## 输出

```text
one_page_brief
participant_profiles
recent_changes
open_commitments
key_questions
recommended_topics
avoid_topics
meeting_objective
ideal_next_step
evidence_refs
```

## 设计目标

会前 3 分钟可读完。

---

# 16. S5 跟进建议 SKILL

## 输入

```text
account_id
project_id
latest_interaction
current_state
commitments
signals
```

## 输出

最多 3 条：

```text
action
person
channel
reason
why_now
expected_outcome
risk
due_at
evidence_refs
```

## 成功标准

避免输出泛化建议，例如：

- 保持联系
- 加强沟通
- 持续关注

必须给出具体动作。

---

# 17. S6 任务复盘 SKILL

## 输入

```text
task_id
original_goal
original_judgment
actions
tool_evidence
user_feedback
outcome
```

## 输出

```text
facts
expected_vs_actual
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

V1 不允许自动成为：

- Rule
- Checklist
- Skill
- Prompt
- Policy

必须经过后续验证与人工确认。

---

# 18. 每日自主学习

## 18.1 目标

每日学习不是泛读新闻。

只学习可能影响：

- 关键客户
- 关键人员
- 重点项目
- 当前机会
- 客户所在行业
- 政策与采购窗口

的信息。

## 18.2 每日循环

```text
重点客户清单
↓
需要监测的 Signal
↓
获取公开信息
↓
去重 / 可信度判断
↓
客户关联
↓
影响判断
↓
生成更新
↓
必要时生成下一步行动
```

## 18.3 学习结果

每天输出：

1. 新变化
2. 涉及客户
3. 为什么重要
4. 是否影响当前判断
5. 是否需要动作
6. 原始依据

---

# 19. 自主进化产品机制

## 19.1 V1 定义

自主进化在 V1 只意味着：

> 从真实营销任务和结果中持续产生可验证的 Experience Candidate。

不意味着系统可以自行改写核心逻辑。

## 19.2 Candidate 来源

来源包括：

- 成功项目
- 失败项目
- 客户回复
- 用户否决
- 用户修改
- 阶段推进
- 阶段回退
- 成交
- 丢单
- 长期无反馈

## 19.3 Candidate 内容

必须包含：

- Situation
- Goal
- Constraints
- Action
- Evidence
- Outcome
- Root Cause
- Lesson
- Applicable Scope
- Counterexample

## 19.4 进化状态

```text
Draft
↓
Candidate
↓
Evaluated
↓
Review Required
↓
Approved / Rejected
```

V1 到此结束。

不自动进入 Active Skill。

---

# 20. Marketing Eval

## 20.1 北极星指标

> **客户阶段推进率**

## 20.2 一级指标

| 指标 | 方向 |
|---|---:|
| 关键客户历史覆盖率 | ↑ |
| 会前准备耗时 | ↓ |
| 承诺遗漏率 | ↓ |
| 超期未跟进率 | ↓ |
| Next Action 采纳率 | ↑ |
| 有效互动率 | ↑ |
| 项目阶段推进率 | ↑ |

## 20.3 判断质量指标

- Evidence Coverage
- Fact Error Rate
- Action Specificity
- Action Adoption
- User Override Rate
- Outcome Lift

## 20.4 自主进化指标

V1 不用 Candidate 数量作为成功指标。

重点看：

- Candidate 被用户认可比例
- 相似场景复现成功率
- Candidate 对后续任务是否产生增益
- 错误经验进入候选的比例

---

# 21. 人工确认 Gate

以下动作默认必须人工确认：

1. 对外发送正式消息
2. 报价
3. 商务承诺
4. 合同相关表达
5. 涉及政府正式材料
6. 涉及敏感客户数据的外发
7. 修改关键客户事实
8. 发布新的营销 Rule / Skill

低风险动作可自动执行：

- 公开信息学习
- 内部信息整理
- 客户摘要
- 会前准备
- 提醒
- 建议生成
- 待办生成

---

# 22. 产品层接口契约

PRD 只定义产品需要的平台能力。

## 22.1 AgentRuntimePort

需求：

```text
run_task(goal, context, allowed_skills, policy)
```

产品关心：

- 任务是否完成
- 使用了哪些业务能力
- 输出
- 证据
- 状态

产品不关心底层如何调度。

## 22.2 MemoryPort

需求：

```text
query_customer_context(scope, query)
write_business_record(record, evidence)
```

产品关心：

- 获取有效客户上下文
- 写入经过业务规则允许的数据
- 来源可追溯

产品不定义通用记忆内部结构。

## 22.3 ToolPort

需求：

```text
search(source, query)
execute(tool, input)
```

产品只声明业务动作和权限。

## 22.4 SkillPort

需求：

```text
invoke(skill_id, input)
evaluate(skill_id, test_case)
```

产品定义 Marketing SKILL 契约。

## 22.5 ApprovalPort

需求：

```text
request_approval(action, reason, payload)
```

必须返回：

- approved
- rejected
- approver
- timestamp
- modified_payload(optional)

## 22.6 EventPort

产品需要订阅：

```text
customer.updated
interaction.created
commitment.due
signal.detected
project.stage_changed
action.completed
outcome.recorded
```

## 22.7 EvalPort

需求：

```text
evaluate(candidate, baseline, criteria)
```

营销产品负责给出业务评价标准。

---

# 23. MVP 主流程

## 流程 A：导入客户

```text
新增客户
↓
导入资料
↓
识别人员 / 项目 / 历史互动
↓
用户确认关键事实
↓
生成客户作战页
```

## 流程 B：每日经营

```text
打开今日
↓
查看新变化
↓
查看最重要动作
↓
进入客户作战页
↓
查看依据
↓
执行 / 修改 / 忽略
↓
记录结果
```

## 流程 C：会前准备

```text
选择会议
↓
生成 1 页 Brief
↓
查看最近变化 / 历史承诺 / 人物关系
↓
给出会议目标和问题
↓
会后导入结果
```

## 流程 D：任务复盘

```text
任务结束
↓
记录 Outcome
↓
比较预期与实际
↓
识别原因
↓
产生 Experience Candidate
↓
进入进化中心待审
```

---

# 24. MVP 优先级

## P0 必须完成

- 客户列表
- 客户作战页
- 客户 / 人员 / 项目 / Interaction / Commitment
- 时间线
- 客户研究
- 会前准备
- 跟进建议
- 今日行动
- 证据引用
- Outcome 记录
- 任务复盘
- Experience Candidate

## P1 MVP 后半段

- 关系图
- Signal 自动监测
- 机会判断
- 每日学习
- 风险提醒
- 进化中心

## P2 后续

- 自动化外部执行
- 多渠道协同
- 团队版
- 多 Agent
- 高净值 Relationship Pack
- 行业专用 Pack
- 自动 Skill 晋级

---

# 25. V1 验收标准

产品进入下一阶段前，必须完成真实客户验证。

最低验收：

1. 连续导入并经营 20 个真实关键客户
2. 每个客户形成可用时间线
3. 关键事实可追溯原始依据
4. 系统每天能产生有效下一步动作
5. 用户可接受 / 修改 / 拒绝建议
6. 可记录实际 Outcome
7. 可产生结构化 Experience Candidate
8. Candidate 不自动生效
9. 至少完成一轮“建议 → 执行 → Outcome → 复盘”完整闭环
10. 能计算客户阶段推进率

---

# 26. 产品终局

自主进化营销助理最终应形成三类长期资产：

```text
客户关系资产
+
营销经验资产
+
持续生长的业务能力资产
```

产品越长期使用，应表现出三个结果：

1. 越来越了解客户
2. 越来越懂用户自己的营销方法
3. 越来越少重复犯已经发生过的错误

V1 的任务只有一个：

> **先证明这套闭环能持续推动真实客户往前走。**
