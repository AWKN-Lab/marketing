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

### P4 Learning 基线｜DEVELOPMENT_VERIFIED
- 基线：`31ff83a5b2baed9d3cb1df0e19eb93098b580fb7`
- GitHub Actions Run：`33623799799`

全部已验证基线均通过：

```text
npm run typecheck  ✓
npm run test:p0    ✓
npm run build      ✓
```

P5 Session / Tenant Isolation 正在开发验证中。

---

## 核心产品闭环

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

### P1 Material

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

### P2 Platform Reconcile

Workspace / Task 支持产品层状态读回与 revision 冲突检测。平台状态不会静默覆盖本地状态。

### P3 Task Execution

Task 当前有效执行状态统一为：

```text
TaskExecutionState
├─ User Final
├─ Feedback
├─ Outcome
└─ Outcome Note
```

支持 `task.execution.get / task.execution.upsert`、revision、fingerprint、冲突合并与单飞同步。

### P4 Learning

```text
learning.run
→ queued / running
→ AppShell 全局 Poller
→ learning.run.get
→ completed / failed
→ Signal 自动回流 Today
```

失败运行支持 `learning.run.retry`，同一 Workspace 存在未完成 Run 时禁止重复提交。

---

## Session / Tenant 边界

P5 开始引入营销产品层 Session：

```text
Tenant
+ Actor
+ Roles
+ Marketing Capabilities
+ Workspace Grants
```

原则：

- 浏览器 Session 只用于 UI 与本地缓存隔离；
- 真正授权由 AWKN 上游验证；
- 前端不能通过自报 `tenant_id / actor_id` 获得权限；
- 平台模式下 localStorage 按 `tenant + actor` 命名空间隔离；
- 本地开发模式明确显示 `LOCAL SINGLE-USER`；
- 生产环境未配置 Session 时默认 fail-closed，除非显式允许本地 Session。

---

## 接入 AWKN 产品接口

复制 `.env.example` 为 `.env.local`。

### Session

```bash
AWKN_MARKETING_SESSION_URL=http://your-awkn-marketing-session-endpoint
AWKN_MARKETING_SESSION_TOKEN=
AWKN_MARKETING_ALLOW_LOCAL_SESSION=false
```

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

### 二进制资料上传

```bash
AWKN_MARKETING_MATERIAL_UPLOAD_URL=http://your-awkn-material-upload-endpoint
AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN=
AWKN_MARKETING_MATERIAL_MAX_MB=100
```

产品 Route 会把受信任的 Cookie / Authorization 上下文继续转发给 AWKN 上游；本仓库不实现通用认证系统。

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
- 通用身份认证基础设施

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

1. P5 Session / Tenant Isolation 完成 CI 验证。
2. 营销产品 capability / Workspace Grant 的前端操作约束。
3. Experience Candidate / Evolution Review 跨端 revision 读回。
4. 使用真实 AWKN 服务完成 Session、文件解析、Agent、Learning 联调。
5. 真实平台环境下 5 Workspace / 30 Task 业务验收。

## 文档

- `docs/PRD.md`
- `docs/FRONTEND.md`
- `docs/P0-BASELINE.md`
- `docs/P1-MATERIAL-BASELINE.md`
- `docs/P2-RECONCILE-BASELINE.md`
- `docs/P3-EXECUTION-BASELINE.md`
- `docs/P4-LEARNING-BASELINE.md`
