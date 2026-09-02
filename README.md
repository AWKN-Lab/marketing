# AWKN Marketing

自主进化营销助理产品仓库。

## 当前阶段

P0 前端可运行原型：Workspace → Task → Artifact → Evidence → Feedback → Outcome → Evolution。

当前 P0 使用浏览器 `localStorage` 保存 Artifact 修改、Feedback、Outcome 与 Evolution Review，用于真实任务试跑。该存储只属于前端验证层，后续通过产品 Adapter 接入 AWKN 平台能力。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 验证

每次推送到 `main` 会运行 GitHub Actions：

```bash
npm run typecheck
npm run build
```

## 边界

产品仓库只实现营销产品层。Agent Runtime、Memory、MCP、通用 Skill Runtime 等平台能力不在本仓库重复建设。

## 文档

- `docs/PRD.md`
- `docs/FRONTEND.md`
- `docs/frontend/README.md`
