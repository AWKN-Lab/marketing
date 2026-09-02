# AWKN Marketing

自主进化营销助理产品仓库。

## 当前状态

### P0 可试跑基线｜DEVELOPMENT_VERIFIED

- 基线：`c64fe96202b7d8b9ac9e88dd12acdcea2bc88dbd`
- GitHub Actions Run：`33614796833`

### P1 Material 基线｜DEVELOPMENT_VERIFIED

- 基线：`81947e512aa41f3b4070756a0cd52e2830bc167d`
- GitHub Actions Run：`33622442041`

### P2 Reconcile 基线｜DEVELOPMENT_VERIFIED

- 基线：`7fa762439a46b22b46fbb2af112109611bb89448`
- GitHub Actions Run：`33622898785`

三条基线均通过：

```text
npm run typecheck  ✓
npm run test:p0    ✓
npm run build      ✓
```

---

## P0 主闭环

```text
Workspace
→ Material Feed
→ Task
→ AWKN Agent Result
→ Artifact / Evidence
→ Feedback
→ Outcome
→ Experience Candidate
→ Evolution Review
→ Reviewed Experience
→ Next Task Reuse
```

同时包含：Daily Learning、真实 Signal 回流、Local-first Sync、Product Eval、P0 数据导出/导入、Demo/真实数据隔离。

## P1 Material

```text
稳定 material_id
→ 文本 / URL：Local-first + material.feed
→ 二进制：/api/material-upload
→ AWKN upload / parse
→ queued / parsing 自动刷新
→ failed 可 retry
→ ready
→ parsed text / evidence
→ Agent Context / Evidence Drawer
```

P1 的 DEVELOPMENT_VERIFIED 表示营销产品仓库中的 Adapter、状态机、ID 边界、自动验收和 production build 已验证。AWKN 上游上传/解析服务仍需真实环境联调。

## P2 Platform Reconcile

Workspace / Task 支持产品层状态读回与 revision 冲突检测：

```text
本地快照 + 上次同步 fingerprint / revision
                 ↕
          AWKN 最新实体快照
                 ↓
clean / local-newer / platform-newer / conflict / unbased / stale-platform
```

处理原则：

- 平台读回必须保持相同 `entity_id`；
- 平台状态不会静默覆盖本地状态；
- `platform-newer` / `conflict` 提供本地与平台双快照；
- 用户可选择“采用 AWKN 版本”或“保留本地并回写”；
- 回写携带 `base_revision` 和幂等键；
- 平台 revision 低于已知基线时标记 `stale-platform`。

P2 当前覆盖 Workspace / Task 产品实体。Artifact 的独立编辑状态仍保存在任务工作台，尚未进入 revision 冲突合并范围。

---

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 接入 AWKN 产品接口

复制 `.env.example` 为 `.env.local`。

### Agent 任务

```bash
AWKN_MARKETING_AGENT_URL=http://your-awkn-agent-product-endpoint
AWKN_MARKETING_AGENT_TOKEN=
```

assistant-ui 只调用本仓库 `/api/agent`，Route Handler 再转发 AWKN。

Agent 产品结果支持：

```text
text
+ evidence[]
+ artifact
+ trace_id
```

### 通用产品操作

```bash
AWKN_MARKETING_API_URL=http://your-awkn-marketing-product-endpoint
AWKN_MARKETING_API_TOKEN=
```

`/api/product` 当前业务操作：

- `workspace.create` / `workspace.update` / `workspace.get`
- `material.feed`
- `material.parse.get` / `material.parse.retry`
- `task.create` / `task.update` / `task.get` / `task.run`
- `feedback.record`
- `outcome.record`
- `evolution.review`
- `learning.watch.upsert` / `learning.run`

### 二进制资料上传

```bash
AWKN_MARKETING_MATERIAL_UPLOAD_URL=http://your-awkn-material-upload-endpoint
AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN=
AWKN_MARKETING_MATERIAL_MAX_MB=100
```

浏览器把文件提交给 `/api/material-upload`，该 Adapter 再以 multipart/form-data 转发给 AWKN 产品上传接口。本仓库不实现文件解析器、向量化、Memory 或底层存储。

---

## Local-first

用户动作先完成本地写入，再同步 AWKN 产品接口。

```text
syncing
synced
local-only
sync-error
```

Workspace / Task / Material / Feedback / Outcome / Evolution 均遵守稳定业务 ID 与幂等约束。

成功同步后记录：

```text
platformRevision
syncedFingerprint
```

它们用于后续 `workspace.get / task.get` 的冲突判断。

---

## 自动验收

`npm run test:p0` 当前覆盖：

- Experience / Counterexample 边界
- Workspace Scoped Experience
- Product Eval
- 本地状态与导出包边界
- Material 文本 / 二进制边界
- 稳定 Workspace / Task / Material ID
- 二进制 parse lifecycle
- Material evidence / parsed text → Agent Context
- Agent Result evidence / artifact / trace
- Daily Learning Run / Signal
- Local-first Sync
- Workspace / Task entity read identity
- revision / fingerprint reconcile：clean、local-newer、platform-newer、conflict

---

## 产品边界

本仓库只实现营销产品层。

禁止在这里重复建设：

- Agent Runtime
- AWKN Engine
- Memory OS
- MCP
- 通用 Skill Runtime
- 通用模型路由
- 通用长期记忆生命周期
- 通用文件解析 / 向量化基础设施

完整平台关系：

```text
营销助理（产品层）
       ↓
    Agent OS
       ↓
  AWKN Engine
   ↙       ↘
Memory OS   MCP
```

---

## 下一阶段

1. Artifact / Feedback / Outcome 的 revision-aware 状态合并。
2. 使用真实 AWKN 上传/解析服务完成 PDF / PPT / DOC / XLS 联调。
3. 异步 `learning.run` 的完成通知 / 状态刷新。
4. 多用户、团队权限、认证与租户隔离。
5. 真实平台环境下 5 Workspace / 30 Task 业务验收。

## 文档

- `docs/PRD.md`
- `docs/FRONTEND.md`
- `docs/frontend/README.md`
- `docs/P0-BASELINE.md`
- `docs/P1-MATERIAL-BASELINE.md`
- `docs/P2-RECONCILE-BASELINE.md`
