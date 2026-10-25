# D 组：亲缘表入契约 · 共享状态与多副本 exactly-once

> 承接 C 组。C 组把 F1 收口到平台插件，F2 用亲缘表让经验命中「相似任务」，
> F6 让 eval 口径看得见中途劣化。本组做两件事：
> **① 把亲缘表从实现细节升格成产品契约；② 关掉「多副本 exactly-once 不成立」这个上生产硬阻断。**

---

## 1. 亲缘表进 PRD 契约

上一轮我提出亲缘表时说过「PRD 只说了相似任务，没定义相似，这张表需要产品确认」。
确认后，它被写进 **PRD §12.10.1 经验适用范围（applicable_scope）**，
不再是实现细节，而是有出处、可评审的产品口径。

### 契约长什么样

`applicable_scope` 有**两个正交维度**，两者都必须满足：

| 维度 | 判定 | 谁来判 |
|---|---|---|
| **Workspace 范围** | 审核结论 `scoped` 时只在 `scope_workspace_id` 内生效 | 审核层 |
| **任务类型范围** | 同类型直接适用；相关类型按亲缘表降权适用 | 亲缘表 |

亲缘表（有向，1 跳）：

| 来源任务类型 | 可用于 | 权重 |
|---|---|---|
| 资料消化 | 营销研究 | 0.8 |
| 营销研究 | 策略判断 | 0.8 |
| 策略判断 | 方案 / 内容 | 0.8 |
| 方案 / 内容 | 会前 / 沟通 | 0.8 |
| 会前 / 沟通 | 方案 / 内容 | 0.7 |
| 任务复盘 | —— | —— |

四条规则：同类型权重 1；跨类型只认**有向 1 跳**边，跨两跳不推断；
跨类型命中**降权并标注来源类型**；表外任何组合都不适用。

> **审核层是唯一否决权来源。** 亲缘表只放宽「任务类型」这一个维度，
> 绝不放宽审核 —— 未审核、已否决、超出 Workspace scope 的 Candidate，
> 在同类型路径和亲缘路径上**一律不适用**。

### 两侧仍各有一份实现

两个仓库独立，代码上仍是两份表。这一点**没有假装解决**：
两侧各有测试断言同一组期望值，任一侧改动会让另一侧的测试失败。
真要「只有一份」，需要两仓共享一个包 —— 那是仓库结构问题，不是这一轮能顺手做完的事。

---

## 2. 共享状态：多副本 exactly-once

### 之前错在哪

营销状态是**每个进程一份的 `Map`**。两个后果，两个都是上生产的硬阻断：

**① 多副本下 exactly-once 不成立。**
每个副本有自己的幂等台账。同一个幂等键落到两个副本上，两个都认为是「首次」，
**副作用发生两次**。这不是「概率性重复」，是必然重复。

**② 写入失败会把幂等键烧死。**
原实现先 `claimIdempotency` 再 `write`，**写失败时键不会回滚**：

```text
客户端 ──键 K──▶ 登记键 K → 写入失败（base_revision 过期）
客户端 ──键 K 重试──▶ 判定为「重放」→ 返回一个从未写入的实体 → NOT_FOUND
```

一次 CAS 冲突就把这条幂等键**永久烧死**，客户端再也用不了它。
这是潜伏 bug —— 之前的 E2E 用的是**不同的键**做 CAS 冲突，所以没暴露。

### 现在的结构

状态变成一个**端口**，只有一个原子写操作：

```ts
applyWrite({ entityId, workspaceId, tenantId, baseRevision, fields, idempotencyKey })
  -> { entity, replayed }
```

「登记幂等键 + 写实体」是**一次**操作。写入失败 → 键一并回滚 → 重试成功。
19 个写点全部改用它，`replayGuard` 删除。

```
                       ┌─────────────────────────────┐
   能力服务副本 A ───▶ │  共享状态后端（SQLite）      │
   能力服务副本 B ───▶ │  实体表 + 幂等台账（全局唯一）│
                       └─────────────────────────────┘
```

### 两种后端的诚实对比

| 后端 | 幂等台账 | 重启后 | 多副本 exactly-once |
|---|---|---|---|
| `memory`（默认） | 每副本一份 | 全丢 | ❌ 不成立 |
| `sqlite` | 全局唯一 | 保留 | ✅ 成立（共享同一库文件的所有副本） |

**边界要说清楚**：`sqlite` 让 exactly-once 成立于**共享同一个数据库文件**的副本。
跨节点部署需要把状态端口绑到网络数据库 —— 端口就是为此留的。

### 让隐患变成响的

- `AWKN_CAPABILITY_SERVER_STATE_REPLICAS > 1` 且后端是 `memory` → **服务拒绝启动**，
  错误信息直接说明「exactly-once 不成立」并给出正确配置。
- `GET /v1/health` 上报 `marketingState`（后端 / 路径 / 副本数）—— 运维一眼能看出来。
- 用 `memory` 时启动打一条 warning。

### 真实 E2E：两个进程，一个库文件

E2E harness 新增 `P6_E2E_REPLICA_URL`，指向第二个能力服务副本。断言：
**同一个幂等键，两个独立进程 → 同一实体、同一 revision、同一 `updated_at`。**

```json
{
  "replicaA": { "entity_id": "w-p6-e2e-cross-rmvnr3497", "revision": 1, "updated_at": "2026-10-25T11:34:57.622Z" },
  "replicaB": { "entity_id": "w-p6-e2e-cross-rmvnr3497", "revision": 1, "updated_at": "2026-10-25T11:34:57.622Z" }
}
```

复现方式：

```bash
# 两个副本，共享同一个库文件
AWKN_CAPABILITY_SERVER_STATE=sqlite \
AWKN_CAPABILITY_SERVER_STATE_PATH=/tmp/e2e-shared/state.db \
AWKN_CAPABILITY_SERVER_PORT=8787 node --import tsx src/index.ts &
AWKN_CAPABILITY_SERVER_STATE=sqlite \
AWKN_CAPABILITY_SERVER_STATE_PATH=/tmp/e2e-shared/state.db \
AWKN_CAPABILITY_SERVER_PORT=8788 node --import tsx src/index.ts &

# 取证
AWKN_MARKETING_CAPABILITY_URL=http://127.0.0.1:8787 \
P6_E2E_REPLICA_URL=http://127.0.0.1:8788 \
npm run test:p6:e2e-platform
```

---

## 3. 门禁

| 项 | 结果 |
|---|---|
| agent-os 插件测试 | **39/39**（原 34，新增 5 条端口语义）|
| agent-os 能力服务测试 | **24/24**（原 15，新增 9 条）|
| PLUGIN_MANIFEST_GATE | PASS plugins=56 capabilities=335 |
| CAPABILITY_GRAPH_GATE | PASS |
| CAPABILITY_IMPLEMENTATION_GATE | PASS（--strict --runtime-strict）|
| 能力服务 typecheck | PASS |
| 真实平台 E2E | **15/15**（原 14，新增跨副本 exactly-once）|

端口语义在**两种实现上各断言一遍**（进程内 + SQLite），防止它们漂移。

---

## 4. 仍然没有解决的

1. **跨节点的 exactly-once** —— `sqlite` 只覆盖共享同一库文件的副本。
   多节点需要网络数据库，端口已留好，但没绑。
2. **亲缘表仍是两份实现** —— 靠两侧互为测试防漂移，不是「只有一份」。
3. **`P6-W8` 仍 `BLOCKED`** —— 真实端点、真实凭据、最终服务端授权仍缺；
   平台侧 PR 未合并未部署。
4. **产品层 5 秒 session 缓存的撤权可见性窗口** —— 仍未处理。
5. **能力服务自身的生产化**（网关/TLS 接入、编排、健康检查）—— 未做。
