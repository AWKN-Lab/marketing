# P3 Task Execution Development-Verified Baseline

## 1. 基线

- Commit: `64586eef33a0c72318f367b4268be3e0bac59bef`
- GitHub Actions Run: `33623356240`
- 状态：`DEVELOPMENT_VERIFIED`

验证：

```text
npm run typecheck  ✓
npm run test:p0    ✓
npm run build      ✓
```

## 2. 目标

把 Task 内分散的当前状态收成一个可读回、可比较、可冲突合并的产品实体，同时保留现有浏览器 key，保证 P0/P1/P2 试跑数据继续可用。

## 3. TaskExecutionState

```text
id
taskId
workspaceId
artifactTitle
finalText
feedback
outcome
outcomeNote
```

稳定 ID：

```text
task-execution:{taskId}
```

产品操作：

```text
task.execution.get
task.execution.upsert
```

## 4. Event 与 State 分工

事件记录继续存在：

```text
feedback.record
outcome.record
```

它们记录发生过的行为和结果。

`TaskExecutionState` 保存任务当前有效状态，用于跨端继续编辑与冲突处理。

## 5. 本地兼容

现有 key 保留：

```text
marketing:{taskId}:artifact
marketing:{taskId}:feedback
marketing:{taskId}:outcome
marketing:{taskId}:outcome-note
```

产品实体在运行时由这些本地状态聚合，因此旧试跑数据无需迁移才能继续使用。

## 6. 同步策略

User Final：700ms debounce。

Feedback / Outcome：立即提交最新 Task Execution 快照。

为避免响应乱序：

```text
current request
      ↓
   in flight
      ↓
new local edits → 只保留 latest queued snapshot
      ↓
current request finished
      ↓
flush latest snapshot
```

同一 Task Execution 同时只存在一个上行请求。

幂等键包含：

```text
execution stable id
base revision
snapshot fingerprint
```

## 7. 冲突处理

Task Execution 使用 P2 的统一冲突模型：

```text
clean
local-newer
platform-newer
conflict
unbased
stale-platform
```

平台版本不会自动覆盖正在编辑的 User Final。

用户可选择：

```text
采用 AWKN 版本
保留本地并回写
```

## 8. 自动验收新增项

- Task Execution stable ID；
- `task.execution.get`；
- `task.execution.upsert`；
- Task Execution snapshot fingerprint；
- 两端同时修改 finalText → `conflict`。

## 9. 当前边界

P3 已覆盖：

- User Final；
- Feedback；
- Outcome；
- Outcome Note。

仍待后续：

- Experience Candidate / Evolution Review 跨端 revision；
- Agent conversation thread 的跨设备连续性；
- 多用户并发权限；
- 真实 AWKN 上游 Task Execution 服务联调。

本仓库仍只负责营销产品层状态和 Adapter Contract。
