# P6 · 平台能力服务接线

> 状态：实现完成，门禁实测通过（typecheck / P0 / P6 191 PASS · 1 SKIP / build）。
> 平台侧对应实现：`AWKN-Lab/agent-os` 的 `plugins/awkn-marketing` + `apps/capability-server`。

## 为什么要改

19 个 `ProductOperation` 此前由产品层直连 `AWKN_MARKETING_API_URL` 调营销产品 API。
但 AWKN OS 平台侧**从来没有营销产品服务端** —— `awkn-marketing` 零命中，
19 个 operation 里 17 个零命中。这就是 P6-W8 `BLOCKED_EXTERNAL` 的真正根因：
不是缺权限、不是缺配置，是**对端服务不存在**。

现在这 19 个 operation 由 AWKN OS 的 `awkn-marketing` 插件实现，
产品层改走平台能力服务的 HTTP 分发面（按能力名分发）。

## 边界

| | 营销产品层（本仓） | AWKN OS |
|---|---|---|
| 业务语义与状态机 | 契约、校验、响应信封 | 插件 `awkn-marketing` |
| 运行时 / 授权 / 工具 / 记忆 / 执行 | 不重复建设 | 平台能力 |
| 传输 | HTTP 调用能力服务 | `apps/capability-server` |

产品层**不做**平台的事：它不实现 Agent Runtime / Memory OS / MCP / Skill Runtime /
模型路由 / 身份认证。它只声明业务语义并调用平台能力。

## 环境变量

| 变量 | 说明 |
|---|---|
| `AWKN_MARKETING_CAPABILITY_URL` | 能力服务地址，例如 `https://capability.awkn.internal` |
| `AWKN_MARKETING_CAPABILITY_TOKEN` | 能力服务 Bearer 令牌（服务间凭证） |
| `AWKN_MARKETING_SESSION_URL` | 平台 Session 服务（既有，权威身份来源） |
| `AWKN_MARKETING_SESSION_TOKEN` | Session 服务令牌（既有） |

`AWKN_MARKETING_API_URL` / `AWKN_MARKETING_API_TOKEN` **不再使用**。

## 调用形态

```
POST {AWKN_MARKETING_CAPABILITY_URL}/v1/capabilities/invoke
Authorization: Bearer <AWKN_MARKETING_CAPABILITY_TOKEN>
x-awkn-session: <base64url(JSON)>
x-request-id: <request_id>

{ "capability": "<operation>", "input": { ...产品信封... }, "idempotencyKey": "..." }
```

Session 只走请求头，不进请求体 —— 调用方没有资格在 body 里自造权限。
Session 结构：`{ tenantId, actorId, capabilities[], workspaceGrants[], revokedWorkspaceIds[] }`。

**浏览器身份不再向平台侧转发**（原 `x-awkn-user-authorization` 头已移除）：
权威身份只有平台 Session，cookie / bearer 透传只会扩大凭证暴露面。

## 响应与状态码

能力服务用 `200 + { ok:true, result }` 承载业务结果，业务失败放在 `result.ok=false` 里
（HTTP 层只表达传输 / 鉴权 / 限流）。因此产品路由需要**从错误码还原状态码**：

| 错误码 | HTTP |
|---|---|
| `AUTH_REQUIRED` | 401 |
| `FORBIDDEN` / `WORKSPACE_REVOKED` | 403 |
| `NOT_FOUND` | 404 |
| `REVISION_CONFLICT` / `INVALID_REVISION` / `IDEMPOTENCY_CONFLICT` | 409 |
| `RATE_LIMITED` | 429 |
| `UPSTREAM_TIMEOUT` | 504 |
| `UPSTREAM_UNAVAILABLE` | 503 |
| `UNSUPPORTED_OPERATION` | 400 |
| 其余（`VALIDATION_ERROR` / `MISSING_ENTITY_ACK` / `IDENTITY_MISMATCH` / …） | 502 |

区分两类失败：

- **上游自己给出的失败** → 按上表还原状态码（`REVISION_CONFLICT` 是 409，不是 502）；
- **路由侧校验失败**（上游返回了 `ok:true` 但信封不合法）→ 一律 502，
  这是产品边界故障，不是业务拒绝。

## 归一化管线未变

请求校验、实体 ID 核对、`5xx` / `429` 映射、material / task / task-execution /
learning / evolution 响应校验全部原样保留。改动只在传输层：
从「产品 API」换成「能力服务 + 能力名」。

## P6 门禁适配

`scripts/p6-test-support.ts` 新增共享 mock `withCapabilityUpstream`：

- Session 端点 → 按 `workspace_id` 合成平台 Session（`admin` grant）；
- 能力端点 → 把能力请求还原成旧的产品请求体交给脚本自己的 responder，
  再把产品响应翻译回能力服务真实会返回的形态。

**24 个 P6 脚本的 responder 逻辑一行未改** —— 它们仍然只写「产品响应」，
不需要知道能力服务的存在。翻译规则严格对齐能力服务的真实契约。

一处测试断言按新契约更新：`p6-active-session-revoke` 原先断言上游收到
`x-awkn-user-authorization`（浏览器身份），现在改为断言 `x-awkn-session` 存在
且浏览器身份**没有**被转发。

## 尚未闭环的部分

- 能力服务当前只装配营销插件。营销插件声明的 6 项平台依赖
  （`policy.evaluate` / `evidence.evaluate` / `memory.capture` / `agent.delegate` /
  `skill.evaluate` / `work.task.create`）在 `/v1/health` 的 `unresolvedRequirements`
  **如实上报**，不假装已满足。`AWKN_CAPABILITY_SERVER_STRICT=true` 时拒绝启动。
- 插件侧 `MarketingProductState` 是进程内实现，不声称生产可用。
- `component_id` C59 分配、C60 保留槽位使用与否，仍待 Owner 裁决。
- Session 的正式来源目前由产品层转发；若平台后续提供正式的 session /
  authorization capability，应改为 `requires` 依赖声明。
