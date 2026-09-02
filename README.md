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

### P3 Task Execution 基线｜DEVELOPMENT_VERIFIED
- 基线：`64586eef33a0c72318f367b4268be3e0bac59bef`
- GitHub Actions Run：`33623356240`

全部基线均通过：

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

## P2 Platform Reconcile

Workspace / Task 支持产品层状态读回与 revision 冲突检测：

```text
本地快照 + 上次同步 fingerprint / revision
                 ↕
          AWKN 最新实体快照
                 ↓
clean / local-newer / platform-newer / conflict / unbased / stale-platform
```

平台状态不会静默覆盖本地状态。用户可以查看双快照并选择采用 AWKN 版本，或保留本地并携带 `base_revision` 回写。

## P3 Task Execution

Task 内的当前有效执行状态统一成一个产品实体：

```text
TaskExecutionState
├─ User Final
├─ Feedback
├─ Outcome
└─ Outcome Note
```

跨端操作：

```text
task.execution.get
task.execution.upsert
```

执行状态使用稳定 ID：

```text
task-execution:{taskId}
```

同步机制：

- 本地编辑即时保存；
- User Final 编辑采用 700ms debounce；
- Feedback / Outcome 立即触发快照同步；
- 同一 Task Execution 同步采用单飞队列；
- 新编辑发生在请求执行期间时，只保留最新待发送快照；
- 幂等键包含 stable ID、base revision、snapshot fingerprint；
- `feedback.record / outcome.record` 继续保留为事件记录；
- Task Execution 保存当前有效状态快照；
- Task Execution 同样支持 P2 的 revision / fingerprint 冲突合并。

---

## 接入 AWKN 产品接口

复制 `.env.example` 为 `.env.local`。

### Agent 任务

```bash
AWKN_MARKETING_AGENT_URL=http://your-awkn-agent-product-endpoint
AWKN_MARKETING_AGENT_TOKEN=
```

### 通用产品接口

```bash
AWKN_MARKETING_API_URL=http://your-awkn-marketing-product-endpoint
AWKN_MARKETING_API_TOKEN=
```

`/api/product` 当前业务操作：

- `workspace.create` / `workspace.update` / `workspace.get`
- `material.feed`
- `material.parse.get` / `material.parse.retry`
- `task.create` / `task.update` / `task.get` / `task.run`
- `task.execution.get` / `task.execution.upsert`
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

浏览器把文件提交给 `/api/material-upload`，Adapter 再转发给 AWKN 产品上传接口。本仓库不实现文件解析、向量化、Memory 或底层存储。

---

## Local-first

用户动作先完成本地写入，再同步 AWKN 产品接口。

```text
syncing
synced
local-only
sync-error
```

成功同步后记录：

```text
platformRevision
syncedFingerprint
```

用于后续 Workspace / Task / Task Execution 的冲突判断。

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

1. 异步 `learning.run` 的运行状态自动回流与失败重试。
2. 使用真实 AWKN 上传/解析服务完成 PDF / PPT / DOC / XLS 联调。
3. 多用户、团队权限、认证与租户隔离。
4. Experience Candidate / Evolution Review 的跨端 revision 读回。
5. 真实平台环境下 5 Workspace / 30 Task 业务验收。

## 文档

- `docs/PRD.md`
- `docs/FRONTEND.md`
- `docs/frontend/README.md`
- `docs/P0-BASELINE.md`
- `docs/P1-MATERIAL-BASELINE.md`
- `docs/P2-RECONCILE-BASELINE.md`
- `docs/P3-EXECUTION-BASELINE.md`
