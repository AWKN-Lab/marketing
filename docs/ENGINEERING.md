# AWKN Marketing｜工程开发母文档

> 仓库：`AWKN-Lab/marketing`  
> 文档版本：V1.0  
> 文档定位：工程母文档  
> 基线：P0–P5 `DEVELOPMENT_VERIFIED`  
> 下一阶段：P6 Real AWKN Integration

---

# 1. 工程目标

自主进化营销助理负责营销产品层，交付完整的业务闭环、产品状态、业务契约、前端体验、业务评估与 AWKN 平台适配。

工程目标固定为四项：

1. **可运行**：核心闭环在本地和平台模式均可运行。
2. **可验证**：每一个阶段都有代码、测试、基线 Commit 与验收证据。
3. **可回退**：阶段升级保持稳定实体 ID、revision 和兼容契约，可回退到上一验证基线。
4. **可进化**：Feedback、Outcome、Experience Candidate、Evolution Review 能形成下一任务可复用的经验。

---

# 2. 产品边界

```text
AWKN Marketing
├─ Product UI
├─ Marketing Domain
├─ Product State
├─ Product API Routes
├─ Product Contract / Ports
├─ Marketing Agent Semantics
├─ Marketing Skill Semantics
├─ Feedback / Outcome
├─ Experience / Evolution Review
└─ Marketing Eval
        ↓
     Agent OS
        ↓
   AWKN Engine
    ↙       ↘
Memory OS   MCP / Tools
```

本仓库禁止重复建设：

- Agent Runtime
- 通用任务编排内核
- Memory OS
- MCP Framework
- Tool Registry
- Skill Runtime
- 通用模型路由
- 通用身份认证基础设施
- 通用文件解析与向量化基础设施

上述能力统一由 AWKN 平台提供，营销仓库通过业务 Port 与产品 Contract 接入。

---

# 3. 文档金字塔

```text
PRD.md                         产品母文档
ENGINEERING.md                 工程母文档
│
├─ ARCHITECTURE.md             系统架构
├─ DOMAIN-DATA-MODEL.md        Domain / 数据 / 状态
├─ AWKN-INTEGRATION.md         AWKN 接口与跨端契约
├─ AGENT-SKILL-ENGINEERING.md  Agent / Skill 产品工程
├─ EVAL-ACCEPTANCE.md          Eval / 业务验收
├─ TESTING.md                  测试与故障验证
├─ DEPLOYMENT.md               部署 / 发布 / 回退
│
├─ FRONTEND.md                 前端总工程文档
│  └─ frontend/*.md            C01–C10 组件工程文档
│
└─ P0–P5 *-BASELINE.md         已验证阶段证据
```

文档职责必须保持单一：

- PRD 管产品目标、范围、用户价值和业务闭环。
- ENGINEERING 管工程规则、层级、开发门禁和全局依赖。
- 专项文档管理各自契约与验收。
- Baseline 文档记录已经发生的事实，不承担未来需求设计。

---

# 4. 当前代码事实

## 4.1 已存在产品 Port

当前 `lib/ports.ts` 已定义：

- `MarketingFrontendPort`
- `MarketingProductPort`
- `WorkspacePort`
- `MaterialPort`
- `TaskPort`
- `OutcomePort`
- `EvolutionPort`
- `LearningPort`
- `ProductOperationPort`

P6 继续沿用这些业务语义边界，禁止 UI 直接绑定 AWKN 内部实现。

## 4.2 已存在产品操作契约

`lib/product-contract.ts` 已定义 19 个 `ProductOperation`：

```text
workspace.create
workspace.update
workspace.get
material.feed
material.parse.get
material.parse.retry
task.create
task.update
task.get
task.execution.get
task.execution.upsert
task.run
feedback.record
outcome.record
evolution.review
learning.watch.upsert
learning.run
learning.run.get
learning.run.retry
```

统一请求信封：

```text
product
operation
request_id
idempotency_key?
workspace_id?
task_id?
payload
```

统一响应信封：

```text
ok
data?
error { code, message, retryable? }
trace_id?
```

## 4.3 已存在权限模型

当前权限主链：

```text
Tenant + Actor
→ Marketing Capability
→ Workspace Grant
→ Product Action
```

权限判断以服务端最终授权为准。浏览器 Session 只承担产品 UI 与缓存作用域。

---

# 5. 状态权威规则

工程统一遵守以下顺序：

```text
业务 ID
→ revision
→ updated_at
→ server acknowledgement
→ local projection / UI cache
```

规则：

1. `entity_id` 在本地与平台之间保持稳定。
2. 平台返回的实体 ID 必须与产品预期 ID 一致。
3. 跨端更新必须携带或返回 revision；P6 将 revision 契约提升为 Hard Gate。
4. UI cache 无权覆盖更新 revision 的平台状态。
5. 网络失败、超时、重试不能产生重复业务实体。
6. 已撤销 Workspace Grant 的数据不能继续进入任务、经验匹配或学习流程。

---

# 6. 阶段状态

| 阶段 | 能力 | 当前状态 |
|---|---|---|
| P0 | Core Loop | DEVELOPMENT_VERIFIED |
| P1 | Material | DEVELOPMENT_VERIFIED |
| P2 | Reconcile | DEVELOPMENT_VERIFIED |
| P3 | Task Execution | DEVELOPMENT_VERIFIED |
| P4 | Learning | DEVELOPMENT_VERIFIED |
| P5 | Session & Permissions | DEVELOPMENT_VERIFIED |
| P6 | Real AWKN Integration | NEXT |
| P7 | Real Business Acceptance | PLANNED |

`DEVELOPMENT_VERIFIED` 只表示开发环境基线已通过，不等同于真实平台、真实业务、生产环境验收。

---

# 7. P6 工程目标

P6 只做真实平台联调与契约闭环，不扩大产品范围。

必须完成：

1. Session 接真实 AWKN 授权源。
2. Material 接真实上传、解析、状态查询和 retry。
3. Task 接真实 Agent Runtime。
4. Task Execution 完成 revision-aware reconcile。
5. Feedback / Outcome 写入真实产品服务。
6. Learning Run 接真实运行状态与 retry。
7. Experience Candidate / Evolution Review 完成跨端 revision 契约。
8. 所有请求具备 `request_id`；有副作用的重试路径具备 `idempotency_key`。
9. 所有错误映射到稳定 `error.code`，并保留 `trace_id`。
10. 平台模式禁止静默降级到 local session。

---

# 8. 工程 Hard Gates

任何阶段进入“已验证”前，必须同时满足：

## G1 真值门

- 文档描述能在代码或平台契约中找到事实来源。
- Mock 与真实平台状态明确区分。
- UNKNOWN 保持 UNKNOWN，禁止用默认成功掩盖未知状态。

## G2 契约门

- 稳定实体 ID。
- 幂等键策略明确。
- revision 冲突有处理路径。
- error code 稳定。
- 权限拒绝不会产生副作用。

## G3 测试门

当前基础门：

```bash
npm run typecheck
npm run test:p0
npm run build
```

P6 追加：Contract、Permission、Idempotency、Revision、Retry、E2E。

## G4 证据门

每个阶段必须记录：

- 基线 Commit SHA
- CI / Test 结果
- 验收场景
- 已知限制
- 回退点

---

# 9. 开发顺序

```text
读 PRD / ENGINEERING
→ 确认专项工程文档
→ 识别当前验证基线
→ 新建 feature/docs 分支
→ 最小修改
→ typecheck
→ contract / unit / acceptance
→ build
→ 对抗式边界审查
→ 更新 Baseline
→ PR
→ 合并
```

禁止跳过现有已验证基线进行大范围重构。

---

# 10. P7 真实业务验收

P7 最低样本：

```text
5 Workspace
30 Task
```

必须覆盖：

- 多 Workspace 权限隔离
- 资料投喂与解析
- 重复任务
- Experience 复用
- 用户修改
- Feedback
- Outcome
- Evolution Review
- Learning Watch / Run
- 撤权后的数据隔离
- 网络失败与 retry

业务结果使用 `EVAL-ACCEPTANCE.md` 统一记录。

---

# 11. 变更规则

出现以下情况必须同步更新工程文档：

- 新增或删除 ProductOperation
- Domain 实体结构变化
- 状态机变化
- revision / idempotency 规则变化
- 权限模型变化
- Agent / Skill 输入输出契约变化
- Eval 指标变化
- 部署拓扑变化

代码与文档冲突时先标记冲突并阻止基线升级，修正后再进入验证。