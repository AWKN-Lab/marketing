# AWKN Marketing

自主进化营销助理产品仓库。

## 当前阶段

P0 前端可运行原型：Workspace → Task → Artifact → Evidence → Feedback → Outcome → Evolution。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 当前数据层

`lib/mock-data.ts` 仅用于 P0 产品验证。后续通过产品 Adapter 接入 AWKN 平台接口。

## 边界

产品仓库只实现营销产品层。Agent Runtime、Memory、MCP、通用 Skill Runtime 等平台能力不在本仓库重复建设。

## 文档

- `docs/PRD.md`
- `docs/FRONTEND.md`
- `docs/frontend/README.md`
