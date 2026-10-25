# P6-W8 · 真实平台 E2E 取证（跨服务 trace + 网络级 exactly-once）

> 状态：**取证完成**。真实 AWKN 端点、真实凭据与最终服务端授权仍未具备，
> 因此 `P6-W8` **保持 `BLOCKED`**，本文件只把其中可在本地实证的部分做实。
> 判定纪律：无回执 = 不算闭环。

## 1. 这份证据与既有 P6 脚本的根本区别

既有 P6 脚本把「上游」替换成内存 responder —— 测的是**产品层的契约处理**。
本取证**没有 mock**：起的是两个真进程，走真 HTTP。

```text
调用方 ──HTTP──▶ 营销仓 Next server ──HTTP──▶ AWKN OS 能力服务 ──▶ awkn-marketing 插件
                        │                              │
                        └──HTTP──▶ 平台 Session 服务（本次提供的最小夹具）
```

| 组件 | 形态 | 端口 |
|---|---|---|
| 营销仓 | `next start`（生产构建）真进程 | 3111 |
| AWKN OS 能力服务 | `node --import tsx src/index.ts` 真进程，`STRICT=true` | 8787 |
| 平台 Session 服务 | **测试夹具**（非产品组件） | 3112 |

夹具说明：真实环境由平台 Session 服务持有权威身份。本夹具只提供取证所需的最小平台身份行为
（按 `workspace_id` 返回 Grant、按需撤销），并在证据 JSON 里显式标注为 `测试夹具，非产品组件`。

可复现命令：

```bash
# 1) 起平台能力服务
cd AWKN-Lab/agent-os/apps/capability-server
AWKN_CAPABILITY_SERVER_TOKEN=<token> AWKN_CAPABILITY_SERVER_PORT=8787 \
AWKN_CAPABILITY_SERVER_STRICT=true node --import tsx src/index.ts

# 2) 取证
cd AWKN-Lab/marketing
AWKN_MARKETING_CAPABILITY_URL=http://127.0.0.1:8787 \
AWKN_MARKETING_CAPABILITY_TOKEN=<token> npm run test:p6:e2e-platform
```

该脚本**不进 CI 链** —— 它需要活的平台服务，CI 里跑不了。

## 2. 结果：13/13 通过

| # | 断言 | 结果 |
|---|---|---|
| 1 | 能力服务把调用方 `x-request-id` 作为 trace 使用（非 `cap-<actor>` 兜底） | PASS |
| 2 | **跨服务 trace**：营销层响应 `trace_id` 等于发出的 `request_id` | PASS |
| 3 | **跨服务 trace**：插件回执里的 `request_id` 一致 | PASS |
| 4 | 创建回执：实体 ID 正确且 revision 起始为 1 | PASS |
| 5 | **网络级 exactly-once**：同键重放返回同一实体 | PASS |
| 6 | **网络级 exactly-once**：同键重放不推进 revision（无二次副作用） | PASS |
| 7 | **网络级 exactly-once**：同键重放不改写 `updated_at` | PASS |
| 8 | **CAS 语义跨网络成立**：过期 `base_revision` 被拒 | PASS |
| 9 | 观察：撤权后立即写入（产品层 session 缓存窗口内） | 已记录 |
| 10 | **授权在服务端生效**：跨过产品层 session 缓存后，撤权写入被拒 | PASS |
| 11 | 幂等键冲突：同键绑不同实体被拒 | PASS |
| 12 | 营销层按 Workspace 向平台 Session 服务取身份 | PASS |
| 13 | 浏览器身份不被当作授权来源（平台身份来自 Session 头） | PASS |

机器可读证据：`docs/P6-W8-PLATFORM-E2E-EVIDENCE.json`（每次运行覆盖，含逐条 detail）。

### 跨服务 trace 是怎么证明的

`request_id` → 营销层 `x-request-id` 头 → 能力服务 `buildContext` 取为 `traceId` →
插件 `result.traceId` → 营销层 `trace_id` → 调用方响应。

- 断言 1 用**直连**证明能力服务尊重调用方给的头（若忽略，trace 会退化成 `cap-<actorId>`）；
- 断言 2、3 用**经营销层**的调用证明 trace 穿过两个 HTTP 边界后原样回来。

### 网络级 exactly-once 是怎么证明的

两次**独立的 HTTP 请求**（换了 `request_id`，模拟网络重试），同一个 `idempotency_key`：

- 返回同一个 `entity_id`；
- `revision` 不推进（无第二次副作用）；
- `updated_at` 不变（没有第二次写入）。

外加：同键绑不同实体 → `IDEMPOTENCY_CONFLICT`；不同键 + 过期 `base_revision` → `REVISION_CONFLICT`。

## 3. 取证过程中发现并修复的真实缺陷

这是本轮最重要的产出。**两个仓库从未真正接过，两边的形状与语义都不兼容** ——
各自的单元测试都绿，但组合起来就是全线失败。

### 缺陷 1：19 个 operation 的请求形状系统性不兼容（P0）

| | 营销仓产品契约 | 插件实现 |
|---|---|---|
| Workspace | `payload.workspace { id, name, type, goal }` | `payload.workspace_id` / `payload.name` |
| Task | `payload.task { id, workspaceId, status }` | `payload.task_id` / `payload.task_type` |
| Task Execution | `payload.execution { id, taskId, status, attempt }` | `payload.execution_id` |
| Feedback | `payload.feedback_event { id, feedback, ai_draft, … }` | `payload.feedback_event_id` / `payload.feedback` |
| Outcome | `payload.outcome_event { … }` | `payload.outcome_event_id` |
| Evolution | `payload.candidate` + `payload.review` | `payload.candidate_id` / `payload.decision` |

**用产品契约的请求形状调用平台侧，19 个 operation 全部被拒。**

**修复方向**：产品契约是权威（P6-W1 固化），插件是实现方 → 适配方向永远是「契约 → 插件」。
新增 `plugins/awkn-marketing/src/product-shape.ts` 作为**唯一适配点**，并新增
`plugins/awkn-marketing/tests/product-contract-conformance.test.ts`：
用产品契约的规范形状驱动全部 19 个 operation，断言响应满足产品契约的响应要求
（`entity_id` / `revision` / `updated_at`，entity-read 额外要 `entity.id`，
async 操作额外要 `run_id` + 合法 `status`）。

### 缺陷 2：响应信封不满足产品契约

插件返回扁平实体，缺 `data.entity` 快照（entity-read 要求）与 `data.run_id` / `data.status`
（async 操作要求）。已在同一适配层用 `buildProductAck` 按响应类型组装。

### 缺陷 3：幂等键没有真正生效（同键重放变成 REVISION_CONFLICT）

`state.claimIdempotency` 已经算出了 `replayed: true`，但写操作**没用这个标志**，
带着过期的 `base_revision` 又走了一次写入 → `REVISION_CONFLICT`。
结果是：调用方拿不到第一次的结果，幂等语义丢失。

产品契约（W7-14）要求同键重放**复用同一次逻辑副作用**。
修复：新增 `replayGuard`，同键重放直接返回既有实体（revision / `updated_at` 不变）。

### 缺陷 4：两处实体 ID 语义不一致

- `evolution.review`：产品契约的实体是 **Review**（`payload.review.id`），插件用的是 Candidate ID。
- `learning.watch.upsert`：产品契约的 Watch ID 由 Workspace 派生（`watch-<workspaceId>`），
  插件用的是调用方给的 `watch_id`。

两处都改为按产品契约。

### 观察：产品层 5 秒 session 缓存形成撤权可见性窗口

撤权后**立即**写入仍被允许（断言 9 记录了这个行为）；跨过产品层 session 缓存 TTL 后，
平台侧授权拒绝生效（断言 10 PASS）。

这是**产品层引入的窗口**，不是平台侧授权失效 —— 平台侧的判定一直正确。
撤权可见性延迟 ≤ 5 秒是此前明确记录过的取舍，但它确实是一个安全窗口，
需要产品决定是否收紧（例如对授权类错误禁用缓存）。

### 观察：`workspace.create` 对已存在实体是 upsert

用不同幂等键对同一 workspace id 再次 create，会**覆盖**现有实体并推进 revision，
而不是报冲突。插件的 `state.write` 是 upsert 语义。当前不违反产品契约
（契约只要求幂等键），但值得产品明确。

## 4. 本证据**不**覆盖的范围

1. **不覆盖真实 AWKN 端点、真实凭据与最终服务端授权。** 本取证用的是本地回环网络
   与测试用令牌，不是生产拓扑。
2. **不覆盖跨服务 trace 的生产链路**（网关、鉴权代理、服务网格）—— 这里只证明了
   trace 穿过两个 HTTP 边界不被改写。
3. **不覆盖 exactly-once 在多副本下的行为。** 能力服务的 `MarketingProductState`
   是**进程内**的：本次 exactly-once 证据成立于**单实例**。
   多副本部署时幂等台账不共享，**exactly-once 不成立** —— 这是上生产前的硬阻断。
4. **不覆盖平台的 6 项依赖后端**（child agent、grant authority、team planner/dispatcher
   仍是未绑定端口）。依赖已提供，但后端不是生产级。
5. **不覆盖任何持久化。** 能力服务重启后状态全部丢失。
6. **不改变 `P6-W8` 的 `BLOCKED` 状态** —— 见下。

## 5. `P6-W8` 状态处置

账本对 `P6-W8` 的要求是四项：**真实端点 / 真实凭据 / 最终服务端授权 / 网络级同 key exactly-once 证据**。

| 要求 | 本取证后 |
|---|---|
| 网络级同 key exactly-once 证据 | ✅ **已具备**（断言 5–7、11） |
| 跨服务 trace 证据 | ✅ **已具备**（断言 1–3） |
| 真实 AWKN 端点 | ❌ 未具备 |
| 真实凭据 + 最终服务端授权 | ❌ 未具备 |

**因此 `P6-W8` 保持 `BLOCKED`，阻塞原因从「四项全无」收敛为「只差真实端点与凭据」。**
平台侧实现（`agent-os#212` 插件、`agent-os#234` 能力服务）已存在但**未合并、未部署**，
所以外部阻塞性质未变。

剩下的真实环境证据无法在本地伪造 —— 这是诚实的边界，不做包装。
