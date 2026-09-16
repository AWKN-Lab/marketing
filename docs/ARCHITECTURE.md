# AWKN Marketing｜系统架构工程文档

> 文档版本：V1.0  
> 上位文档：`docs/ENGINEERING.md`  
> 基线：P0–P5

---

# 1. 架构结论

```text
Browser / Product UI
        ↓
Next.js Product Layer
├─ Pages / Components
├─ Product State / Stores
├─ Product Client
└─ API Routes
        ↓
Marketing Product Contract
├─ Session
├─ Workspace
├─ Material
├─ Task / Execution
├─ Feedback
├─ Outcome
├─ Evolution
└─ Learning
        ↓
AWKN Product Service / Agent OS
        ↓
AWKN Engine
├─ Agent Runtime
├─ Memory OS
├─ Skill Runtime
├─ MCP / Tool
└─ Model / Execution Infrastructure
```

浏览器只持有产品投影、交互状态与必要缓存。业务最终授权、真实执行和长期状态由平台侧承担。

---

# 2. 层级职责

## L1 Product UI

负责：

- Workspace / Task / Artifact / Evidence / Feedback / Outcome / Evolution Review 交互
- 当前用户可见状态
- 权限不足时禁用或隐藏操作
- 展示异步执行状态、错误与 retry

禁止：

- 自行判断平台最终权限
- 直接访问 AWKN 内部数据库
- 绕过产品 API 调 Agent Runtime
- 把 localStorage 当业务真值源

## L2 Product State

当前包含 Material、Task Execution、Agent Result、Learning Run、Evolution 等产品 Store。

职责：

- 管理 UI 所需产品投影
- 保存本地开发模式状态
- 平台模式下按 `tenant + actor` 隔离 cache
- 执行 revision-aware reconcile

## L3 Product API / Adapter

当前入口包含：

- `/api/session`
- `/api/product`
- `/api/agent`
- `/api/material-upload`
- `/api/status`

职责：

- 隔离浏览器与上游服务
- 组装认证信息
- 统一 Product Contract
- 统一错误与 trace
- 控制 local / platform 模式

## L4 AWKN Platform

负责：

- 最终 Session / Authorization
- Agent Runtime
- Memory
- Tool / MCP
- Skill Runtime
- 通用文件解析能力
- 持久化与并发控制
- 平台级审计

---

# 3. 核心运行链路

## 3.1 Workspace / Material

```text
User
→ Workspace UI
→ material.feed / upload
→ Product API
→ AWKN Material Service
→ entity_id + revision + parse status
→ Product State
→ UI
```

异步解析：

```text
processing
→ ready
   or
→ needs_review
   or
→ failed → retry
```

## 3.2 Task Execution

```text
Task.create
→ task.run
→ AWKN Agent Runtime
→ execution state
→ Agent Result
→ Artifact / Evidence
→ Feedback
→ Outcome
```

执行状态查询与本地投影必须通过 `task.execution.get` / `task.execution.upsert` 对齐。

## 3.3 Evolution

```text
Task Result
→ User Feedback
→ Outcome
→ Experience Candidate
→ Evolution Review
→ accepted / scoped / rejected
→ Reviewed Experience
→ Next Task Matching
```

Candidate 在审核完成前不能直接改变 Active Skill 或全局行为。

## 3.4 Learning

```text
Learning Watch
→ learning.run
→ asynchronous execution
→ learning.run.get
→ signal / recommendation / candidate
→ user action
→ outcome
```

失败运行通过稳定 run ID 进入 retry，禁止生成第二个逻辑运行实体。

---

# 4. 真值与投影

| 数据 | 真值源 | 浏览器角色 |
|---|---|---|
| Session / Capability | AWKN | UI scope cache |
| Workspace Grant | AWKN | 可见性投影 |
| Workspace / Task | AWKN（平台模式） | projection |
| Material Parse | AWKN | 状态展示 |
| Agent Execution | AWKN | 状态展示 |
| Feedback / Outcome | AWKN | 提交与展示 |
| Evolution Review | AWKN | 提交与展示 |
| Local P0 数据 | Browser local | 开发模式真值 |

平台模式下任何 browser cache 都不能提升权限或覆盖更高 revision 的服务端状态。

---

# 5. Identity / Revision

所有跨端实体遵守：

```text
stable entity_id
+ monotonically managed revision
+ updated_at
+ trace_id on request path
```

P6 重点：

- create 返回稳定 `entity_id`
- update 返回新 revision
- reconcile 比较 revision
- stale write 返回明确冲突错误
- retry 保持同一业务实体

`validateStableEntityAck()` 已承担实体 ID 一致性检查；P6 需补齐 revision 冲突检查。

---

# 6. 权限架构

```text
Session
├─ tenant
├─ actor
├─ roles
├─ capabilities
└─ workspaceGrants
```

操作权限同时满足：

```text
Capability Gate
+
Workspace Access Gate
```

撤权要求：

- Workspace 从列表消失
- Task 不可继续读取或执行
- Candidate 不进入 Experience 匹配
- Learning 不继续读取该 Workspace
- 浏览器残留 cache 不得恢复访问

---

# 7. 故障边界

## 网络故障

- 读请求允许 retry。
- 写请求 retry 必须具备 idempotency 策略。
- UI 显示 pending / failed，禁止伪造成功。

## 上游不可用

平台模式默认失败关闭。`AWKN_MARKETING_ALLOW_LOCAL_SESSION=false` 时禁止自动进入 local 权限。

## revision 冲突

```text
local revision < server revision
→ stop overwrite
→ fetch server state
→ reconcile / ask product action
```

## 权限变化

任何 401/403 或 session refresh 后权限下降，立即清理对应可见投影。

---

# 8. 可观测性

跨端请求最低字段：

- `request_id`
- `trace_id`
- `operation`
- `tenant_id`
- `actor_id`
- `workspace_id`（适用时）
- `task_id`（适用时）
- `entity_id`（适用时）
- `revision`（适用时）
- result / error code

日志禁止记录 Token、完整敏感资料正文和未经处理的用户秘密。

---

# 9. P6 架构验收

必须验证：

1. local / platform 模式边界清晰。
2. 19 个 ProductOperation 有真实服务映射或明确 unsupported。
3. 同一实体跨端 ID 稳定。
4. revision 冲突不会静默覆盖。
5. retry 不产生重复实体。
6. 权限撤销立即影响读写与 Experience / Learning。
7. Agent / Material / Learning 异步状态可恢复。
8. 所有失败保留可追踪 error code 与 trace id。