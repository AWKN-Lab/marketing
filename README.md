# AWKN Marketing

自主进化营销助理产品仓库。

## 当前阶段

P0 可运行前端：

`Workspace → Task → Artifact → Feedback → Outcome → Experience Candidate → Review → Next Task Reuse`

另含 Daily Learning Watch Scope。没有接入平台时，前端不会伪造真实学习结果。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 接入 AWKN 产品接口

复制 `.env.example` 为 `.env.local`。

### 任务对话

```bash
AWKN_MARKETING_AGENT_URL=http://your-awkn-agent-product-endpoint
AWKN_MARKETING_AGENT_TOKEN=
```

assistant-ui 只调用本仓库 `/api/agent`，由 Route Handler 转发到 AWKN。

### 通用产品操作

```bash
AWKN_MARKETING_API_URL=http://your-awkn-marketing-product-endpoint
AWKN_MARKETING_API_TOKEN=
```

前端产品层可通过 `/api/product` 发送统一业务语义请求。当前操作包括：

- `workspace.create` / `workspace.update`
- `material.feed`
- `task.create` / `task.run`
- `feedback.record`
- `outcome.record`
- `evolution.review`
- `learning.watch.upsert` / `learning.run`

最小请求：

```json
{
  "product": "awkn-marketing",
  "operation": "task.run",
  "request_id": "req_xxx",
  "workspace_id": "ws_xxx",
  "task_id": "task_xxx",
  "payload": {}
}
```

最小响应：

```json
{
  "ok": true,
  "data": {},
  "trace_id": "trace_xxx"
}
```

这只是**产品层 Adapter Contract**。本仓库不实现 Agent Runtime、Memory、MCP、通用 Skill Runtime，也不定义它们内部协议。

## P0 本地状态

浏览器 `localStorage` 暂存：

- Workspace
- Material 元数据
- Task
- Artifact 用户修改
- Feedback
- Outcome
- Experience Candidate
- Evolution Review
- Daily Learning Watch Scope

Demo 数据与真实本地数据隔离；真实状态产生后优先展示真实状态。

## 验证

每次推送到 `main` 会运行 GitHub Actions：

```bash
npm run typecheck
npm run build
```

## 文档

- `docs/PRD.md`
- `docs/FRONTEND.md`
- `docs/frontend/README.md`
