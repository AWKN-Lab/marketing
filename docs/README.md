# AWKN Marketing｜文档索引

> 文档体系：产品 → 工程 → 专项 → 组件 → 阶段基线

---

# 1. 母文档

| 文档 | 职责 |
|---|---|
| `PRD.md` | 产品定位、MVP、业务闭环、产品组件、Domain / Skill / Eval 产品定义 |
| `ENGINEERING.md` | 工程边界、开发规则、Hard Gates、阶段规划、全局依赖 |
| `DEVELOPMENT-PLAN.md` | P6–P7 开发顺序、工作包、Owner、依赖、Hard Gate、验收与收口 |
| `FRONTEND.md` | 前端产品架构、组件复用与交互总方案 |

---

# 2. 系统级工程文档

| 文档 | 职责 |
|---|---|
| `ARCHITECTURE.md` | 系统分层、真值源、运行链路、权限和故障边界 |
| `DOMAIN-DATA-MODEL.md` | Domain 实体、关系、Identity、revision、状态机 |
| `AWKN-INTEGRATION.md` | Product Contract、19 operations、Session、幂等、revision、错误契约 |
| `AGENT-SKILL-ENGINEERING.md` | Marketing Agent / Skill 输入输出、Context、Experience、Tool 边界 |
| `EVAL-ACCEPTANCE.md` | 工程 Eval、业务 Eval、P6 Hard Gates、P7 5 Workspace / 30 Task |
| `TESTING.md` | 测试金字塔、Contract、Permission、Idempotency、Revision、E2E |
| `DEPLOYMENT.md` | 环境、Secret、发布、Readiness、可观测性、回退 |

---

# 3. 前端组件工程文档

目录：`docs/frontend/`

```text
01-app-shell.md
02-today.md
03-workspace.md
04-task-workbench.md
05-artifact-workspace.md
06-evidence-drawer.md
07-applied-experience.md
08-feedback-capture.md
09-outcome.md
10-evolution-review.md
```

组件索引：`docs/frontend/README.md`

---

# 4. 已验证阶段基线

```text
P0-BASELINE.md
P1-MATERIAL-BASELINE.md
P2-RECONCILE-BASELINE.md
P3-EXECUTION-BASELINE.md
P4-LEARNING-BASELINE.md
P5-SESSION-PERMISSIONS-BASELINE.md
```

Baseline 文档只记录已经验证的开发事实、Commit、测试与边界。

---

# 5. 阅读顺序

## 产品 / 业务

```text
PRD
→ FRONTEND
→ frontend component docs
```

## 工程开发

```text
ENGINEERING
→ DEVELOPMENT-PLAN
→ ARCHITECTURE
→ DOMAIN-DATA-MODEL
→ 专项工程文档
→ 当前 Baseline
```

## AWKN 联调

```text
DEVELOPMENT-PLAN
→ ENGINEERING
→ ARCHITECTURE
→ AWKN-INTEGRATION
→ TESTING
→ DEPLOYMENT
```

## Agent / 自主进化

```text
PRD
→ AGENT-SKILL-ENGINEERING
→ DOMAIN-DATA-MODEL
→ EVAL-ACCEPTANCE
```

---

# 6. 当前阶段

```text
P0 Core Loop                    DEVELOPMENT_VERIFIED
P1 Material                     DEVELOPMENT_VERIFIED
P2 Reconcile                    DEVELOPMENT_VERIFIED
P3 Task Execution               DEVELOPMENT_VERIFIED
P4 Learning                     DEVELOPMENT_VERIFIED
P5 Session & Permissions        DEVELOPMENT_VERIFIED
P6 Real AWKN Integration        NEXT
P7 Real Business Acceptance     PLANNED
```

P6–P7 的具体执行状态统一维护在 `DEVELOPMENT-PLAN.md` 的执行看板中。

---

# 7. 文档维护规则

代码变更涉及以下内容时同步更新工程文档：

- ProductOperation
- Domain schema
- state machine
- stable entity ID
- revision / idempotency
- Session / Capability / Workspace Grant
- Agent / Skill contract
- Eval metric
- CI / tests
- deployment topology

阶段完成后新增对应 Baseline 文档，禁止直接修改历史基线来覆盖旧事实。

---

# 8. V2 自主获客与营收增长扩展（提案态）

提案入口：[v2/README.md](v2/README.md)，包含 V2 扩展 PRD、C11 需求雷达、C12 获客转化、C13 营收验证组件工程文档，以及隔离执行计划。

**状态：PROPOSED / DOCUMENTATION_ONLY。** 当前 V1 业务边界与 P6–P7 的交付、运行和验收承诺均保持不变。V2 无运行代码、对外自动联系或真实收入验收结论。
