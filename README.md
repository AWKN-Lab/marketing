# AWKN Marketing

自主进化营销助理产品仓库。

## 已验证基线

| 阶段 | 基线 | GitHub Actions | 状态 |
|---|---|---:|---|
| P0 Core Loop | `c64fe96202b7d8b9ac9e88dd12acdcea2bc88dbd` | `33614796833` | DEVELOPMENT_VERIFIED |
| P1 Material | `81947e512aa41f3b4070756a0cd52e2830bc167d` | `33622442041` | DEVELOPMENT_VERIFIED |
| P2 Reconcile | `7fa762439a46b22b46fbb2af112109611bb89448` | `33622898785` | DEVELOPMENT_VERIFIED |
| P3 Task Execution | `64586eef33a0c72318f367b4268be3e0bac59bef` | `33623356240` | DEVELOPMENT_VERIFIED |
| P4 Learning | `31ff83a5b2baed9d3cb1df0e19eb93098b580fb7` | `33623799799` | DEVELOPMENT_VERIFIED |
| P5 Session & Permissions | `a7dbfebfa605757d125a9c5b2f932631b142408f` | `33630073437` | DEVELOPMENT_VERIFIED |

所有基线均通过：

```text
npm run typecheck  ✓
npm run test:p0    ✓
npm run build      ✓
```

## 产品闭环

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

## P5 权限边界

```text
Tenant + Actor
→ Marketing Capability
→ Workspace Grant
→ Product Action
```

平台模式下：

- localStorage 按 `tenant + actor` 隔离；
- Workspace/Task 仅在当前 read Grant 范围内展示；
- 创建、投喂、Agent 执行、Feedback、Outcome、Evolution Review、Learning 分别受 capability + write Grant 控制；
- Workspace 撤权后，其 Candidate 退出新任务 Experience 匹配；
- 浏览器整包数据导出关闭；
- 浏览器 Session 只用于 UI / cache scope，上游 AWKN 负责最终授权。

## AWKN 产品接口

复制 `.env.example` 为 `.env.local`。

```bash
AWKN_MARKETING_SESSION_URL=
AWKN_MARKETING_SESSION_TOKEN=
AWKN_MARKETING_ALLOW_LOCAL_SESSION=false

AWKN_MARKETING_AGENT_URL=
AWKN_MARKETING_AGENT_TOKEN=

AWKN_MARKETING_API_URL=
AWKN_MARKETING_API_TOKEN=

AWKN_MARKETING_MATERIAL_UPLOAD_URL=
AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN=
AWKN_MARKETING_MATERIAL_MAX_MB=100
```

## 产品边界

本仓库只实现营销产品层。禁止重复建设：Agent Runtime、AWKN Engine、Memory OS、MCP、通用 Skill Runtime、通用模型路由、通用长期记忆生命周期、通用文件解析/向量化、通用身份认证基础设施。

```text
营销助理（产品层）
       ↓
    Agent OS
       ↓
  AWKN Engine
   ↙       ↘
Memory OS   MCP
```

## 下一阶段

### P6 Real AWKN Integration

1. Experience Candidate / Evolution Review 跨端状态与 revision 契约。
2. 使用真实 AWKN 服务完成 Session、Material、Agent、Learning 联调。
3. 补齐 Contract、Permission、Idempotency、Revision、Retry 验证。

### P7 Real Business Acceptance

真实平台环境执行：

```text
5 Workspace
30 Task
```

并建立第一轮真实业务 Eval 基线。

## 文档

### 文档入口

- `docs/README.md`
- `docs/PRD.md`
- `docs/ENGINEERING.md`
- `docs/FRONTEND.md`

### 系统级工程文档

- `docs/ARCHITECTURE.md`
- `docs/DOMAIN-DATA-MODEL.md`
- `docs/AWKN-INTEGRATION.md`
- `docs/AGENT-SKILL-ENGINEERING.md`
- `docs/EVAL-ACCEPTANCE.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`

### 前端组件工程文档

- `docs/frontend/README.md`
- `docs/frontend/01-app-shell.md` ～ `docs/frontend/10-evolution-review.md`

### 已验证阶段基线

- `docs/P0-BASELINE.md`
- `docs/P1-MATERIAL-BASELINE.md`
- `docs/P2-RECONCILE-BASELINE.md`
- `docs/P3-EXECUTION-BASELINE.md`
- `docs/P4-LEARNING-BASELINE.md`
- `docs/P5-SESSION-PERMISSIONS-BASELINE.md`
