# C07 Applied Experience｜已调用经验

## 1. 目标

把“系统正在应用以前学到的方法”明确展示给用户。

这是自主进化最重要的可见证据之一。

用户需要知道：

- 本次用了什么经验
- 经验从哪里来
- 为什么适用于当前任务
- 能否关闭或修改适用范围

## 2. 边界

负责：

- Experience Match 展示
- Experience Applied 状态
- 来源 Task / Workspace
- 适用范围
- 用户关闭 / 降权反馈

不负责：

- Memory 检索内部逻辑
- Candidate 生成算法
- SKILL 发布

## 3. UI 位置

三个入口：

### A. Task Header

轻量显示：

```text
已应用 2 条历史经验
```

### B. Task Context Panel

展开显示：

```text
经验：政府方案第一页先给具体任务与结果
来源：Workspace A / Task 17
适用原因：当前任务同为政府汇报方案
置信度：高
```

### C. Artifact

显示本 Artifact 实际应用过的 Experience。

## 4. 状态

```text
matched
applied
user_disabled
user_scoped
not_applied
```

## 5. 数据契约

```text
AppliedExperience
- experience_id
- title
- summary
- source_task_ids[]
- source_workspace_ids[]
- applicable_scope
- match_reason
- confidence
- applied_to
- user_override(optional)
```

## 6. 用户操作

P0：

- 查看来源
- 本次不用
- 只在当前 Workspace 使用
- 标记不适合当前场景

P1：

- 调整全局适用范围
- 调整优先级

## 7. 关键交互原则

系统不能静默使用会显著改变输出风格、判断路径或业务策略的历史 Experience。

低影响偏好可以轻量提示；高影响经验必须明确可见。

## 8. 禁止事项

- 禁止只显示“使用了历史记忆”。
- 禁止用户无法知道经验来源。
- 禁止错误 Experience 被重复应用却没有关闭入口。

## 9. 验收标准

1. 新 Task 如果匹配到 Experience，用户可见。
2. 用户 1 次操作可查看来源。
3. 用户可关闭本次应用。
4. 用户关闭行为可进入 Feedback。
5. Artifact 可追溯实际应用过的 Experience。
