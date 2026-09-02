# P2 Reconcile Development-Verified Baseline

## 1. 基线

- Commit: `7fa762439a46b22b46fbb2af112109611bb89448`
- GitHub Actions Run: `33622898785`
- 状态：`DEVELOPMENT_VERIFIED`

验证：

```text
npm run typecheck  ✓
npm run test:p0    ✓
npm run build      ✓
```

本基线验证营销产品仓库中的状态读回、稳定 ID、revision/fingerprint 冲突模型、人工合并入口和 production build。AWKN 上游真实实体服务仍需独立联调。

## 2. 目标

Local-first 保证平台离线时仍可工作；平台恢复以后，需要安全地回答三件事：

1. 本地有没有发生变化；
2. AWKN 平台有没有发生变化；
3. 两边同时变化时由谁决定最终版本。

## 3. 共同基线

成功同步后记录：

```text
platformRevision
syncedFingerprint
```

`fingerprint` 基于产品实体的规范化快照生成，只服务于产品层冲突判断。

## 4. 读回契约

P2 新增：

```text
workspace.get
task.get
task.update
```

最小读回数据：

```json
{
  "ok": true,
  "data": {
    "entity_id": "local-stable-id",
    "revision": 3,
    "entity": {
      "id": "local-stable-id"
    }
  },
  "trace_id": "optional"
}
```

产品层同时校验 `data.entity_id` 与 `data.entity.id`。任一 ID 与本地稳定 ID 不一致时返回 `ENTITY_READ_IDENTITY_MISMATCH`。

## 5. 冲突状态

```text
clean
local-newer
platform-newer
conflict
unbased
stale-platform
```

判断规则：

- `clean`：本地和平台均与共同基线一致；
- `local-newer`：本地变化，平台未变化；
- `platform-newer`：平台变化，本地未变化；
- `conflict`：本地与平台均发生变化；
- `unbased`：旧数据缺少共同 fingerprint/revision 基线；
- `stale-platform`：平台 revision 低于本地已知基线。

旧 P0/P1 数据没有 `syncedFingerprint` 时，第一次读回可能进入 `unbased`。如果本地与平台快照完全一致，会直接建立新基线。

## 6. 人工合并

`platform-newer / conflict / unbased` 会保留两份快照并提供选择：

```text
采用 AWKN 版本
保留本地并回写
```

采用平台版本：

- 保留产品生成的稳定 ID；
- 更新本地实体；
- 记录平台 revision 和新 fingerprint。

保留本地并回写：

- 使用原稳定 ID；
- 携带 `base_revision`；
- 使用基于实体 ID、revision、fingerprint 的幂等键；
- 平台必须返回同一业务 ID。

`stale-platform` 不提供“采用平台版本”。

## 7. 当前覆盖

已覆盖：

- Workspace 产品实体；
- Task 产品实体；
- 创建/同步后的 revision + fingerprint 基线；
- 人工冲突决策入口。

## 8. 当前明确未覆盖

本基线没有声称以下状态已经纳入统一 revision 合并：

- Artifact 用户最终稿；
- Feedback 独立本地状态；
- Outcome / Outcome Note；
- Experience Candidate 审核历史；
- Material 解析正文的跨端编辑冲突；
- 多用户并发编辑与权限冲突。

这些进入后续产品层状态模型。

## 9. 自动验收新增项

P2 增加并通过：

- stable snapshot fingerprint；
- `clean`；
- `local-newer`；
- `platform-newer`；
- `conflict`；
- entity read ID mismatch；
- `workspace.get`；
- `task.get`；
- `task.update`。

## 10. 产品边界

P2 只定义营销产品实体的一致性与冲突处理。底层事务、Memory OS、Agent Runtime、MCP、数据库复制、分布式锁等机制仍由平台层负责，本仓库不重复建设。
