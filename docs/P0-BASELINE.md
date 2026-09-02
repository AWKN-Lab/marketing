# 自主进化营销助理｜P0 可试跑基线

> 状态：DEVELOPMENT_VERIFIED  
> 验证日期：2026-09-02  
> 基线 Commit：`c64fe96202b7d8b9ac9e88dd12acdcea2bc88dbd`  
> GitHub Actions Run：`33614796833`

---

# 1. 验证结果

```text
npm run typecheck  PASS
npm run test:p0    PASS
npm run build      PASS
```

此状态只表示：

> 当前 P0 产品前端、核心自主进化规则与 production build 已通过工程验证，可进入真实业务试跑。

不代表正式发布版本。

---

# 2. P0 已跑通产品闭环

```text
创建 Workspace
↓
喂入真实资料
↓
创建 Task
↓
匹配已审核 Experience / Counterexample
↓
运行 Marketing Agent
↓
返回 text / evidence / artifact / trace
↓
用户修改 Artifact
↓
Feedback
↓
Outcome + 原因
↓
Experience Candidate
↓
Evolution Review
↓
Accept / Scoped / Reject
↓
下一次同类型 Task 自动应用已审核 Experience
```

---

# 3. 已验证学习边界

## Experience

只有：

- 同类型任务
- 用户已审核
- Scope 匹配

才能进入下一次任务。

## Counterexample

失败任务：

- 不进入正向 Applied Experience
- 进入 Counterexample
- 下一次同类型任务明确提示先检查失败原因

## Scoped

`Scoped Experience` 只能在原 Workspace 使用。

## Rejected

被拒绝 Candidate 不再匹配。

---

# 4. Material Truth Boundary

本地可以真实读取文本内容：

```text
TXT / MD / CSV / JSON / YAML / XML / HTML / LOG / text/*
```

文本进入任务 Agent Context 前有字符预算限制。

二进制文档：

```text
PDF / PPT / DOC / XLS / ...
```

P0 只保存引用和状态：

> 等待 AWKN 解析

没有解析结果时不生成伪内容、伪摘要、伪 Evidence。

---

# 5. Agent Result Contract

AWKN Marketing Agent 可返回：

```text
text
 evidence[]
 artifact
 trace_id
```

产品层消费：

```text
text       → assistant-ui Thread
Evidence   → Evidence Drawer
Artifact   → Artifact Workspace
Trace      → Evidence provenance
```

用户已编辑 Artifact 时，新 Agent 结果不能粗暴覆盖人工最终稿。

---

# 6. Daily Learning

P0 已支持：

```text
Watch Scope
→ learning.watch.upsert
→ learning.run
→ run_id / status / signals / trace
→ Today
```

约束：

- 无真实 run，不展示为真实学习。
- 有 run 但无 Signal，只显示运行状态。
- Demo Signal 与真实 Signal 分离。

---

# 7. Local-first

核心写操作先保存本地：

- Workspace
- Task
- Feedback
- Outcome
- Evolution Review

随后同步 `/api/product`。

状态：

```text
syncing
synced
local-only
sync-error
```

平台短暂不可用时，用户可以继续工作。

---

# 8. Product Eval

只统计真实本地 Task：

- Feedback Coverage
- First-pass Adoption
- Outcome Coverage
- Outcome Success
- Experience Reuse
- Average Edit Distance
- 同类任务编辑量趋势

同类任务样本不足时，不宣称形成稳定质量增益。

---

# 9. 数据安全与可迁移性

P0 localStorage 已加入版本壳和旧数据兼容。

用户可以导出 / 导入单一 JSON P0 Bundle。

仅允许：

```text
marketing:*
```

进入数据包。

浏览器其他数据不得被导出。

---

# 10. 下一阶段 Gate

进入真实业务验证前，优先补：

### P1｜平台读回与冲突策略

解决：本地写入后，平台状态如何成为产品可读取状态，以及双端变化时谁优先。

### P1｜二进制资料上传

解决：PDF / PPT / DOC / XLS 真正进入 AWKN 解析链。

### P1｜异步 Learning Run 完成机制

解决：queued / running 后如何得到最终完成状态和 Signal。

### P1｜真实业务验收

最低：

```text
5 个真实 Workspace
30 个真实营销 Task
15 个 Task 有真实 Outcome
5 个 Experience 被后续任务再次匹配
至少 1 类重复任务出现可观察质量变化
```

---

# 11. 架构边界

P0 及后续版本继续遵守：

```text
营销助理（产品层）
       ↓
    Agent OS
       ↓
  AWKN Engine
   ↙       ↘
Memory OS   MCP
```

营销业务逻辑不得下沉或污染 Memory OS / MCP / AWKN Engine。
