# AWKN Marketing

自主进化营销助理产品仓库。

## 当前状态

**P0 可试跑基线｜DEVELOPMENT_VERIFIED**

已验证基线：`c64fe96202b7d8b9ac9e88dd12acdcea2bc88dbd`  
GitHub Actions Run：`33614796833`

验证结果：

```text
npm run typecheck  ✓
npm run test:p0    ✓
npm run build      ✓
```

P0 已跑通：

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

另含：

- Daily Learning Watch Scope
- `learning.run` 真实产品接口调用
- 真实 Signal 回流 Today
- Local-first + Platform Sync 状态
- Product Eval
- P0 数据导出 / 导入
- Demo / 真实数据隔离

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

真实 Agent 返回后：

- `text` → Thread
- `evidence` → Evidence Drawer
- `artifact` → Artifact Workspace
- `trace_id` → 证据追溯

### 通用产品操作

```bash
AWKN_MARKETING_API_URL=http://your-awkn-marketing-product-endpoint
AWKN_MARKETING_API_TOKEN=
```

`/api/product` 当前业务操作：

- `workspace.create` / `workspace.update`
- `material.feed`
- `task.create` / `task.run`
- `feedback.record`
- `outcome.record`
- `evolution.review`
- `learning.watch.upsert` / `learning.run`

产品仓库只定义业务语义和 Adapter Contract。

---

## Material Feed

P0 可直接读取并进入 Agent Context：

- TXT
- MD
- CSV
- JSON
- YAML / YML
- XML
- HTML
- LOG
- 其他 `text/*`

PDF / PPT / DOC / XLS 等二进制资料：

> 明确标记“等待 AWKN 解析”，P0 不伪造文件内容。

---

## Local-first

用户动作先完成本地写入，再异步同步 AWKN 产品接口。

同步状态：

```text
syncing
synced
local-only
sync-error
```

平台不可用不会阻断 Workspace / Task / Feedback / Outcome / Evolution 的本地试跑。

---

## P0 自动验收

`npm run test:p0` 当前验证：

- 正向 Experience 与失败 Counterexample 分离
- 任务类型边界
- Workspace Scoped Experience 不越界
- Rejected Experience 不复用
- Product Eval 指标
- 本地状态版本兼容
- P0 数据包边界
- 文本 / 二进制 Material 边界
- Agent Result evidence / artifact / trace 规范化
- Daily Learning Run / Signal 规范化
- Local-first Sync 状态判定

---

## 边界

本仓库只实现营销产品层。

禁止在这里重复建设：

- Agent Runtime
- AWKN Engine
- Memory OS
- MCP
- 通用 Skill Runtime
- 通用模型路由
- 通用长期记忆生命周期

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

## 当前未完成

P0 已可试跑，以下进入下一阶段：

1. AWKN 平台真实 Workspace / Task 状态的读回与冲突合并。
2. PDF / PPT / DOC / XLS 等二进制资料的真实上传与平台解析。
3. 异步 `learning.run` 的平台完成通知 / 状态刷新。
4. 多用户、团队权限、认证与租户隔离。
5. 真实平台环境下 5 Workspace / 30 Task 的业务验收。

详细状态：`docs/P0-BASELINE.md`

## 文档

- `docs/PRD.md`
- `docs/FRONTEND.md`
- `docs/frontend/README.md`
- `docs/P0-BASELINE.md`
