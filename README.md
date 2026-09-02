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

复制 `.env.example` 为 `.env.local`：

```bash
AWKN_MARKETING_AGENT_URL=http://your-awkn-product-endpoint
AWKN_MARKETING_AGENT_TOKEN=
```

前端只调用本仓库 `/api/agent`。该 Route Handler 负责将产品语义请求转发给 AWKN 平台，不在本仓库实现 Agent Runtime、Memory、MCP 或通用 Skill Runtime。

当前约定上游请求：

```json
{
  "product": "awkn-marketing",
  "task_id": "...",
  "workspace_id": "...",
  "messages": [{ "role": "user", "content": "..." }]
}
```

上游最小响应：

```json
{ "text": "...", "evidence": [], "artifact": null }
```

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

这是产品验证层，后续由产品 Adapter 替换为 AWKN 平台持久化。

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
