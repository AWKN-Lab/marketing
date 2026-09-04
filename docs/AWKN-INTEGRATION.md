# AWKN Marketing｜AWKN 集成与接口契约

> 文档版本：V1.0  
> 上位文档：`docs/ENGINEERING.md`  
> 目标阶段：P6 Real AWKN Integration

---

# 1. 集成边界

营销仓库通过产品契约接 AWKN 平台。

```text
Marketing UI / Product State
        ↓
MarketingProductPort
        ↓
Next.js Product API
        ↓
AWKN Product Service / Agent OS
        ↓
AWKN Engine / Memory / MCP / Skill Runtime
```

产品层只依赖业务语义和稳定契约，不依赖 AWKN 内部表结构、内部队列、模型实现或工具注册细节。

---

# 2. 环境变量

当前仓库已经预留：

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

规则：

- Token 只在服务端使用。
- 浏览器不可读取上游 Token。
- 生产 / 平台模式默认 `AWKN_MARKETING_ALLOW_LOCAL_SESSION=false`。
- URL 未配置时 `/api/status` 应能反映 dependency 未就绪状态。

---

# 3. Product Contract

统一请求：

```ts
type MarketingProductRequest<TPayload> = {
  product: "awkn-marketing"
  operation: ProductOperation
  request_id: string
  idempotency_key?: string
  workspace_id?: string
  task_id?: string
  payload: TPayload
}
```

统一响应：

```ts
type MarketingProductResponse<TData> = {
  ok: boolean
  data?: TData
  error?: {
    code: string
    message: string
    retryable?: boolean
  }
  trace_id?: string
}
```

成功写操作涉及实体时，最低返回：

```ts
{
  entity_id: string
  revision?: number
  updated_at?: string
}
```

P6 将 `revision` 与 `updated_at` 提升为所有持久化写操作的必需字段。

---

# 4. Operation Map

| Operation | 类型 | 幂等要求 | P6 核心返回 |
|---|---|---|---|
| `workspace.create` | write | 必须 | entity_id, revision |
| `workspace.update` | write | 必须 | entity_id, revision |
| `workspace.get` | read | request_id | entity, revision |
| `material.feed` | write | 必须 | material id, status, revision |
| `material.parse.get` | read | request_id | parse status |
| `material.parse.retry` | write | 必须 | same material id / run state |
| `task.create` | write | 必须 | task id, revision |
| `task.update` | write | 必须 | task id, revision |
| `task.get` | read | request_id | task, revision |
| `task.execution.get` | read | request_id | execution state |
| `task.execution.upsert` | write | 必须 | execution id, revision |
| `task.run` | write | 必须 | run id |
| `feedback.record` | append | 必须 | feedback id |
| `outcome.record` | append | 必须 | outcome id |
| `evolution.review` | write | 必须 | review / candidate revision |
| `learning.watch.upsert` | write | 必须 | watch id, revision |
| `learning.run` | write | 必须 | run id |
| `learning.run.get` | read | request_id | run state |
| `learning.run.retry` | write | 必须 | same logical run id / attempt |

---

# 5. Request ID 与幂等

## request_id

每一次网络请求唯一，用于 trace、日志和错误定位。

## idempotency_key

同一个逻辑副作用动作在 retry 时复用同一个 key。

示例：

```text
User clicks Task Run
→ idempotency_key = task:{task_id}:run:{logical_action_id}
→ timeout
→ retry with same key
→ server returns existing run_id
```

禁止以新的 idempotency key 重试同一个用户动作。

---

# 6. Stable Entity Ack

当前代码已经使用 `validateStableEntityAck()` 检查：

```text
expected entity id
==
platform entity_id
```

P6 增加：

- revision 合法性检查
- updated_at 格式检查
- stale revision 检查
- same idempotency key 返回同 entity_id 检查

以下情况必须失败：

```text
MISSING_ENTITY_ACK
IDENTITY_MISMATCH
REVISION_CONFLICT
INVALID_REVISION
```

---

# 7. Session Contract

最低 Session：

```ts
type MarketingSession = {
  mode: "local" | "platform"
  tenant: { id: string; name: string }
  actor: { id: string; name: string }
  roles: string[]
  capabilities: MarketingCapability[]
  workspaceGrants: WorkspaceGrant[]
  teamEnabled: boolean
}
```

当前 capability：

```text
workspace.read
workspace.create
workspace.write
material.write
task.create
task.run
feedback.write
outcome.write
evolution.review
learning.manage
team.manage
```

平台最终授权必须在实际服务端动作中再次校验。前端 gate 只负责产品体验和提前阻止明显无权限操作。

---

# 8. Revision-aware Reconcile

统一流程：

```text
Local Projection revision = A
Server revision = B

A == B
→ continue

A < B
→ fetch server
→ update projection
→ re-evaluate pending local action

A > B
→ mark contract anomaly
→ stop write
→ trace
```

任何 server state 不可被更旧的 browser projection 静默覆盖。

---

# 9. Async Contract

Material、Task、Learning 都可能异步执行。

推荐统一异步响应：

```ts
type AsyncRunAck = {
  entity_id: string
  run_id: string
  status: "queued" | "running" | "completed" | "failed"
  revision: number
  retryable?: boolean
}
```

客户端通过对应 `*.get` 查询或由后续事件更新状态。

P6 先以 polling / explicit refresh 完成可靠性闭环，实时事件能力后续按 AWKN 平台能力接入。

---

# 10. Error Taxonomy

最低稳定错误族：

```text
AUTH_REQUIRED
FORBIDDEN
WORKSPACE_REVOKED
NOT_FOUND
VALIDATION_ERROR
UNSUPPORTED_OPERATION
MISSING_ENTITY_ACK
IDENTITY_MISMATCH
REVISION_CONFLICT
IDEMPOTENCY_CONFLICT
UPSTREAM_UNAVAILABLE
UPSTREAM_TIMEOUT
RATE_LIMITED
RUN_FAILED
UNKNOWN_UPSTREAM_ERROR
```

要求：

- `code` 面向程序处理。
- `message` 面向产品展示或日志摘要。
- `retryable` 控制 retry UI。
- `trace_id` 支持跨服务追踪。

---

# 11. Material Upload

上传链路：

```text
Browser
→ /api/material-upload
→ AWKN Material Upload Service
→ material_id
→ parse status
→ product reconcile
```

要求：

- 文件大小受 `AWKN_MARKETING_MATERIAL_MAX_MB` 限制。
- 上传成功与解析成功分开记录。
- 上传 retry 不能产生重复 Material。
- 解析失败保留原 Material ID。

---

# 12. Agent Runtime

```text
task.run
→ /api/agent or Product API
→ AWKN Agent Runtime
→ run_id
→ execution state
→ result / artifact / evidence
```

Marketing 侧负责业务输入、上下文 scope、任务语义、产品状态和结果展示。AWKN 侧负责执行运行时。

---

# 13. P6 Contract Tests

必须覆盖：

1. 19 operations supported map。
2. request_id 全覆盖。
3. write operation idempotency。
4. stable entity ack。
5. revision monotonic / stale write conflict。
6. 401 / 403 / revoked workspace。
7. upstream timeout / retry。
8. material parse retry。
9. task run retry。
10. learning run retry。
11. platform mode 不允许静默 local session fallback。
12. trace_id 在失败路径可见。

---

# 14. P6 完成定义

P6 完成后必须有一份真实 AWKN 联调证据，至少包含：

- Session
- Workspace
- Material
- Task
- Task Execution
- Agent Result
- Feedback
- Outcome
- Learning
- Evolution Review

每项记录请求、响应摘要、entity id、revision、trace id、测试结果和已知限制。