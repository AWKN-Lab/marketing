# AWKN Marketing｜部署、发布与回退工程文档

> 文档版本：V1.0  
> 上位文档：`docs/ENGINEERING.md`

---

# 1. 部署目标

部署体系保证四件事：

1. local / platform 环境边界清晰。
2. 密钥不进入浏览器与仓库。
3. 每次发布都能追溯 Commit、配置与验证结果。
4. 新版本失败时可以回到最近 `DEVELOPMENT_VERIFIED` / Release Baseline。

---

# 2. 运行模式

## Local Mode

用途：

- P0–P5 开发
- UI / Domain / Contract 本地验证
- 无真实 AWKN 依赖时的产品演示

特点：

- local session 可用
- local/mock adapter 可用
- 不能作为真实平台权限验收证据

## Platform Mode

用途：

- P6 真实 AWKN 联调
- P7 真实业务验收
- 后续生产

要求：

```bash
AWKN_MARKETING_ALLOW_LOCAL_SESSION=false
```

上游 Session 不可用时进入明确失败状态，禁止自动获取 local owner 权限。

---

# 3. 环境分层

推荐：

```text
local
→ dev
→ integration
→ staging
→ production
```

当前 P6 至少需要：

```text
local
integration
```

进入 P7 前增加 staging 或等价的受控真实业务环境。

---

# 4. 服务依赖

营销产品层当前外部依赖：

```text
Session Service
Marketing Product API
Agent Service
Material Upload / Parse Service
```

由环境变量注入：

```bash
AWKN_MARKETING_SESSION_URL
AWKN_MARKETING_AGENT_URL
AWKN_MARKETING_API_URL
AWKN_MARKETING_MATERIAL_UPLOAD_URL
```

部署前必须验证 endpoint 可达与契约版本兼容。

---

# 5. Secret 管理

以下变量属于服务端 Secret：

```text
AWKN_MARKETING_SESSION_TOKEN
AWKN_MARKETING_AGENT_TOKEN
AWKN_MARKETING_API_TOKEN
AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN
```

规则：

- 禁止提交 Git。
- 禁止使用 `NEXT_PUBLIC_` 暴露。
- 禁止写入客户端 bundle。
- CI / Runtime 通过批准的 Secret Store 注入。
- 日志不得打印 Token。
- Token 轮换后需验证所有依赖 endpoint。

---

# 6. 构建

最低发布构建：

```bash
npm install --no-audit --no-fund
npm run typecheck
npm run test:p0
npm run build
```

P6 增加 Contract / Permission / Idempotency / Revision 测试。

构建产物必须绑定：

```text
Git Commit SHA
Build timestamp
Environment label
Contract version
```

---

# 7. Health / Readiness

`/api/status` 作为产品状态入口继续扩展，至少应区分：

```text
app_ready
session_dependency
product_api_dependency
agent_dependency
material_dependency
mode
```

Readiness 判断应体现关键依赖状态。

生产请求不能因为页面能打开就判断系统完整可用。

---

# 8. 发布 Gate

进入 integration / staging / production 前依次检查：

```text
G1 code baseline
G2 tests
G3 env config
G4 secret availability
G5 dependency readiness
G6 contract smoke
G7 permission negative smoke
G8 release evidence
```

P6 integration 重点验证真实 AWKN Contract。

P7 staging 重点验证 5 Workspace / 30 Task。

---

# 9. 发布策略

推荐小步发布：

```text
Verified Baseline
→ deploy candidate
→ smoke
→ contract check
→ business canary
→ promote
```

避免 P6 期间同时进行大规模 UI 重构、Domain 改名和平台契约重写。

每次发布只提升一个可验证层级。

---

# 10. Database / State Migration

本仓库当前主要维护产品状态与浏览器投影。真实持久化进入 AWKN 后：

- schema migration 由拥有真值数据的服务负责。
- Marketing 文档保存所依赖的字段与 contract version。
- revision / entity ID 变更需要兼容策略。
- Browser cache 变化需要 namespace/version，避免旧缓存污染新契约。

建议 cache key：

```text
awkn-marketing:{schemaVersion}:{tenantId}:{actorId}:...
```

---

# 11. Rollback

回退对象包括：

```text
Application commit
Environment configuration
Contract compatibility mode
Browser cache schema
```

回退触发条件：

- 权限泄漏
- stable entity ID 破坏
- revision 静默覆盖
- retry 产生重复副作用
- 核心依赖持续不可用
- 关键闭环无法完成

回退目标优先选择最近已验证 Baseline Commit。

---

# 12. Rollback 数据规则

应用代码回退不能反向破坏已产生的新 revision 数据。

若新版本已经写入新 contract 数据：

1. 先确认旧版本是否向前兼容。
2. 不兼容时停止自动回退。
3. 切换兼容 adapter 或只读模式。
4. 完成数据兼容后再恢复写入。

---

# 13. Observability

发布后最低观察：

- request success / failure
- operation error code
- upstream latency
- timeout / retry count
- idempotency conflict
- revision conflict
- permission denied
- Agent run failure
- Material parse failure
- Learning run failure

跨服务问题使用 `trace_id` 定位。

---

# 14. Incident 最小流程

```text
Detect
→ identify affected operation / workspace scope
→ stop unsafe writes when needed
→ capture trace ids
→ compare last verified baseline
→ rollback / hotfix / dependency recovery
→ regression test
→ post-incident baseline update
```

权限、重复副作用、数据覆盖类事故优先停止相关写路径。

---

# 15. P6 部署验收

Integration 环境必须证明：

1. 平台 Session 成功获取。
2. local fallback 已关闭。
3. 真实 Product API 可调用。
4. Agent Run 可追踪。
5. Material upload / parse 可追踪。
6. write retry 幂等。
7. revision conflict 有明确结果。
8. revoked workspace 被拒绝。
9. error code / trace id 可定位。
10. 最近 P0–P5 基线测试继续通过。

---

# 16. P7 发布前条件

进入真实业务验收前：

```text
P6 contract = pass
permission negative cases = pass
idempotency = pass
revision = pass
integration smoke = pass
rollback path = verified
```

完成后再执行 5 Workspace / 30 Task 业务验收。