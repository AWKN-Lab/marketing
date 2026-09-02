# C01 App Shell｜产品信息架构

## 1. 目标

提供统一产品骨架，让用户始终知道：

- 当前在哪个 Workspace
- 正在做哪个 Task
- 当前是否有待确认动作
- 当前是否产生新的学习 / 进化

主导航固定为：

```text
今日
Workspace
营销助理
进化
```

## 2. 边界

负责：

- 一级导航
- 当前 Workspace 切换
- 全局任务入口
- 全局通知 / 待确认入口
- 页面布局容器
- 响应式结构

不负责：

- Workspace 业务内容
- Task 执行逻辑
- Memory / MCP / Agent Runtime 管理
- CRM 导航体系

## 3. 页面结构

桌面端：

```text
┌────────────┬──────────────────────────────┐
│ 左侧导航   │ 顶部：Workspace / Task Context │
│            ├──────────────────────────────┤
│ 今日       │                              │
│ Workspace  │        页面主内容            │
│ 营销助理   │                              │
│ 进化       │                              │
│            │                              │
│ 待确认     │                              │
└────────────┴──────────────────────────────┘
```

移动端：

- 一级导航折叠为底部或 Drawer。
- Artifact / Evidence 以 Sheet 全屏打开。
- 当前 Task 保持明显返回路径。

## 4. 核心交互状态

- `default`
- `workspace-selected`
- `task-running`
- `approval-pending`
- `new-signal`
- `new-evolution-candidate`
- `offline/error`

## 5. 数据契约

```text
AppShellState
- active_workspace_id
- active_task_id(optional)
- running_task_count
- pending_approval_count
- unread_signal_count
- unread_evolution_count
- user_profile
```

## 6. 事件

输入事件：

- workspace.changed
- task.started
- task.completed
- approval.requested
- signal.detected
- candidate.created

输出事件：

- nav.open_today
- nav.open_workspace
- nav.open_assistant
- nav.open_evolution
- workspace.switch
- global.new_task

## 7. 复用来源

- `shadcn/ui`：Sidebar、Sheet、Command、Popover、Tooltip。
- LobeHub：只参考整体 Agent Workspace 信息密度和空间节奏，不复制源码。

## 8. 禁止事项

- 禁止出现“模型管理”“MCP”“Memory”“Agent Runtime”等底层主导航。
- 禁止把系统状态堆成运维控制台。
- 禁止超过 4 个一级产品入口。

## 9. 验收标准

1. 用户 3 秒内能识别当前 Workspace。
2. 用户任意页面 1 次操作可发起新 Task。
3. Approval / Signal / Evolution 有统一可见入口。
4. 页面切换不丢失当前 Workspace 上下文。
5. 桌面与移动端都能完成核心闭环。
