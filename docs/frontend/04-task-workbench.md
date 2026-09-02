# C04 Task Workbench｜营销任务工作台

## 1. 目标

Task Workbench 是营销助理的主操作面。

它必须让用户清楚看到：

- 当前任务目标
- 使用了哪些 Context
- 正在做什么
- 结果是什么
- 使用了哪些历史 Experience
- 哪些动作需要用户确认

## 2. 边界

负责：

- Task Composer
- Streaming Response
- Tool / Skill 状态可视化
- Applied Experience
- Approval
- Task Result
- 进入 Artifact / Evidence / Feedback / Outcome

不负责：

- 展示底层 Agent Chain-of-Thought
- 展示底层 MCP/Memory 调试信息
- 通用 Agent Builder

## 3. 页面结构

```text
Task Header
├─ Workspace
├─ Task Goal
├─ Status
└─ Applied Experience Count

Conversation / Execution
├─ User Input
├─ Agent Response
├─ Tool / Skill Result Card
├─ Approval Card
└─ Evidence Reference

Result Area
├─ Final Answer / Artifact Link
├─ Feedback
└─ Outcome
```

## 4. Task Header

显示：

```text
workspace_name
task_type
goal
status
started_at
applied_experience_count
evidence_count
```

禁止显示技术性 run_id 作为主信息。

## 5. Composer

支持：

- 文本
- 文件附件
- 链接
- @ Workspace Material
- @ Artifact
- 任务模板快捷入口

快捷入口 P0：

- 吃透资料
- 研究
- 策略判断
- 方案 / 内容
- 会前准备
- 复盘

## 6. 任务状态

```text
Draft
→ Running
→ Waiting for User
→ Waiting for Approval
→ Completed
→ Needs Outcome
→ Closed
```

失败：

```text
Failed
Cancelled
```

## 7. 数据契约

```text
TaskView
- task_id
- workspace_id
- task_type
- goal
- status
- context_refs[]
- material_refs[]
- applied_experience_refs[]
- messages[]
- tool_cards[]
- artifact_refs[]
- evidence_refs[]
- approval_requests[]
- feedback_status
- outcome_status
```

## 8. Tool / Skill UI

用户看到业务动作，不看到底层协议。

示例：

```text
正在研究公开资料
找到 12 个来源
已提取 4 个与当前项目有关的新变化
```

不要显示：

```text
MCP server xxx
Tool call JSON
Memory query SQL
Agent node 7
```

## 9. Approval

有副作用动作必须用独立 Approval Card：

- 动作
- 原因
- 将发送/修改的内容
- 风险提示
- 批准
- 修改后批准
- 拒绝

## 10. 复用来源

优先直接复用 `assistant-ui`：

- Thread
- Message
- Composer
- Attachment
- Tool UI
- Streaming
- Human interrupt
- Approval Card

通过 Custom Runtime / 产品适配层连接 AWKN 能力，不引入第二套 Agent Runtime。

## 11. 禁止事项

- 禁止裸露 Chain-of-Thought。
- 禁止将 Tool JSON 作为用户主界面。
- 禁止任务完成后没有 Feedback / Outcome 入口。
- 禁止历史 Experience 被静默应用。

## 12. 验收标准

1. 用户可从空白输入直接发起真实营销任务。
2. Running / Waiting / Approval / Completed 状态明确。
3. 用户知道本任务用了哪些历史经验。
4. 高风险动作可在 UI 中修改后批准。
5. Completed 后 1 次操作进入 Feedback / Outcome。
