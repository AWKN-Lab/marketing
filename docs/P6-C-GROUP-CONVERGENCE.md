# C 组：F1 收口 · F2 经验匹配 · F6 eval 口径

> 这一轮解决的是**两个仓库各自单测都绿、但组合起来不成立**的三处缺口。
> 触发点来自 P6-W8 的真实平台 E2E 取证：第一次让产品层与平台插件真正对话，
> 就暴露了下面的问题。
>
> 判定纪律：没有回执的结论不算数。本轮的每一条都有可复现的断言。

---

## 0. 本轮抓到的新缺陷（都是接线才暴露的）

| # | 缺陷 | 症状 | 危害 |
|---|---|---|---|
| 1 | 插件的 `patternFingerprint` 用未排序 JSON，产品层用排序后的 canonicalize | 同一个模式两层算出 `ptn-fp-ff35ae8e` vs `ptn-fp-b52027a6` | **跨层身份断裂** —— 平台和本地永远认不出同一个模式 |
| 2 | 两个非产品能力从 `input` 顶层读字段，而客户端把字段放在 `input.payload` | `marketing.pattern.detect` **成功返回空结果**（`detected_count: 0`）；`marketing.experience.match` 必然 VALIDATION_ERROR | 静默失败最难查：看起来成功，实际什么都没做 |
| 3 | 亲缘表在两个仓库各一份、API 已分叉 | 漂移不可避免 | 同一经验在平台和本地会得出不同匹配结果 |

**缺陷 2 是本轮最危险的一个**：如果只做「平台模式改调插件」而不修它，
F1 收口会「看起来完成」—— 能力返回 200、patterns 为空、产品层一个候选也生成不出来。

---

## 1. F1 收口：模式检测只有一份权威实现

### 收口后的结构

```text
平台模式（session.mode === "platform"）
  浏览器 ──▶ /api/patterns ──▶ 能力服务 ──▶ 营销插件 marketing.pattern.detect
                                                       │ 权威检测
                                                       ▼
                                              patternId（平台与本地同一套算法）
  浏览器 ◀── 候选 ───────────────────────────────────────┘

本地模式（session.mode === "local"）
  浏览器 ──▶ lib/pattern-detection.ts（离线回退，同一套算法与同一组 ID）
```

- 平台插件是**权威检测方**；产品层只负责送样本、收结果、拼装候选。
- 本地实现保留为**离线回退**（本地模式没有平台，这是受支持的部署形态），
  但两侧的输出由**同一组期望值**钉死，任何一侧改动都会让另一侧的测试失败。
- `patternEligibleSamples` 是**两侧共用的过滤器** —— 否则平台会检测到本地看不到的模式。

### patternId 为什么会分叉

产品层的 `snapshotFingerprint` 先做 canonicalize（对象键递归排序）再 JSON.stringify；
插件直接 `JSON.stringify`。同一组输入因此得到两个不同的哈希：

```text
排序后：{"kind":...,"signal":...,"task_type":...,"workspace_id":...}  → fp-ff35ae8e
未排序：{"kind":...,"workspace_id":...,"task_type":...,"signal":...}  → fp-b52027a6
```

插件改为排序后规范化后，两层给出同一个 ID。两侧测试都硬编码了同一组期望值：

| 模式 | 期望 patternId |
|---|---|
| `repeated-edit` | `ptn-fp-d163ce9c` |
| `repeated-outcome` | `ptn-fp-3c3c3c36` |

### 真实平台 E2E 里的跨层断言

`scripts/p6-e2e-platform.ts` 新增一条用例：**同一个 workspace、同一组样本**，
平台路径与本地路径必须给出同一组 patternId。

```json
{
  "status": 200,
  "platformIds": ["repeated-edit=ptn-fp-7a91a29e", "repeated-outcome=ptn-fp-402d1bbc"],
  "localIds":     ["repeated-edit=ptn-fp-7a91a29e", "repeated-outcome=ptn-fp-402d1bbc"]
}
```

（ID 随 workspaceId 变化，这里是 E2E 运行时生成的 workspace；关键是**两边完全一致**。）

---

## 2. F2：经验匹配必须支持「相似任务」

### 原实现与 PRD 的冲突

原规则是 `candidate.sourceTaskType === taskType`（全等）。而 PRD 写的是：

> §21.1 C「重复模式」：**相似场景**反复出现相同修改、相同选择或相同结果。
>
> 验收第 10 条：至少有 5 个 Candidate 在后续**相似任务**中被再次匹配。

全等匹配**直接违反 PRD**：跨类型的经验永远命中不了「相似任务」。

### 亲缘表（显式，不是模糊猜测）

| 来源类型 | 可用于 | 权重 |
|---|---|---|
| 资料消化 | 营销研究 | 0.8 |
| 营销研究 | 策略判断 | 0.8 |
| 策略判断 | 方案 / 内容 | 0.8 |
| 方案 / 内容 | 会前 / 沟通 | 0.8 |
| 会前 / 沟通 | 方案 / 内容 | 0.7 |
| 任务复盘 | —— | —— |

四条纪律：

1. **显式生产链**，不是字符串相似度 —— 「资料消化」和「方案 / 内容」看起来不像，
   但「营销研究」和「任务复盘」看起来像却毫无关系。
2. **只走 1 跳**。跨两跳的推断太弱，宁可漏也不猜。
3. **降权并标注来源**。跨类型命中的 confidence 乘以边权，UI 上必须看得出这是推断。
4. **审核层是唯一否决权来源**。未审核 / 已否决 / 超出 scope 的候选，
   在亲缘路径上同样不匹配 —— 亲缘只放宽「类型」，绝不放宽「审核」。

> ⚠️ **这张表在两个仓库各有一份**（仓库独立）。两侧都有断言同一组期望值的测试
> （营销仓 `scripts/p6-experience-match.ts`、插件 `marketing-plugin.test.ts`），
> 任何一侧改动都会让另一侧的测试失败。

### 顺带补上的一件事

插件的 `marketing.experience.match` 原本 `counterexamples` 恒为空数组（占位）。
现在负极性候选会正确进入反例列表。

---

## 3. F6：eval 口径必须能看见中途劣化

### 问题

`editDelta = latest.editCount - first.editCount` 只比首尾。编辑量 **8 → 12 → 3** 的序列：

- 端点是「改善 5」；
- 但中间那次比首次更差；
- 而 EVAL-ACCEPTANCE 开篇第 3 条要的是「**持续**改善」。

端点差回答不了「持续」。

### 现在的口径

`editDelta` **一字未改**（已发布公式不动），另加：

```text
peakEditCount = 组内编辑量最大值
peakEditDelta = peakEditCount - firstEditCount
trajectory     = improving | improving-with-regression | stable | deteriorating
```

| 指标 | 含义 |
|---|---|
| `improvedTaskTypes` | **持续改善**（`editDelta < 0` 且 `peakEditDelta <= 0`）—— 对外结论用它 |
| `endpointImprovedTaskTypes` | 端点改善（原公式口径，保留供对照） |
| `regressedMidwayTaskTypes` | 端点改善但中途劣化过 |

**只有 2 个样本时两个口径必然一致**（峰值就是首末的较大值），所以这个改动只影响
3 个及以上样本的组。

UI 不再说「改善 5」，改说「**端点改善 5 · 中途劣化过**」并显示峰值。

> 口径改动只**收紧不放宽**（`improvedTaskTypes` 只会更少），
> 与「首轮禁止为了通过验收临时改指标定义或删除失败样本」不冲突 ——
> 目的是让指标测得出它本来要测的东西，不是让验收更容易过。

---

## 4. 顺手修掉的两个基础设施问题

### 4.1 E2E harness 可能连到旧服务，测出假绿

上一轮 E2E 崩溃后，`npx next start` 留下的进程还占着 3111。下一次跑时 harness
连上去，测的是**旧代码**，却把结果当成当前代码的证据。

修法：

- 起服务前**检查端口是否空闲**，被占用就直接失败并说明原因；
- 退出时杀**整个进程组**（`npx` 会再生一层子进程，普通 SIGTERM 杀不到孙进程）。

### 4.2 `.gitignore` 在合并时丢了 `node_modules` / `.next`

冲突解决逻辑写反了（只保留了「对方没有的行」），结果构建产物会被提交。已恢复。

### 4.3 `lib/pattern-detection.ts` 里有裸 NUL 字节

来自 F1 分支。一个裸 NUL 让 git 把源文件当**二进制**：没有 diff、没有 blame，
合并冲突也无法用工具解决。两侧的分组键现在统一用 `\u0000` 转义 ——
分隔符语义不变（分组键不进入 patternId），但文件是纯文本了。

> 插件侧的分组键原本用**空格**，与营销仓不一致。空格会碰撞
> （workspaceId `"a b"` + taskType `"c"` 与 workspaceId `"a"` + taskType `"b c"`），
> NUL 不会。两侧现已统一为 `\u0000`。

---

## 5. 本轮的门禁与证据

| 项 | 结果 |
|---|---|
| marketing typecheck | 0 |
| marketing `test:p0` | 0 |
| marketing `test:p6` | **209 PASS / 0 FAIL / 1 SKIP**（原 191） |
| marketing `build` | 0 |
| 真实平台 E2E | **14/14 PASS**（原 13，新增 F1 跨层一致性） |
| agent-os 插件测试 | **34/34**（原 30） |
| agent-os 门禁 | PLUGIN_MANIFEST_GATE=PASS / CAPABILITY_GRAPH_GATE=PASS / CAPABILITY_IMPLEMENTATION_GATE=PASS |

新增断言：

- `scripts/p6-experience-match.ts` —— 10 条（F2：亲缘表一致性、同类型/亲缘命中、
  2 跳不匹配、跨类型标注、审核 scope、否决、反例）
- `scripts/p6-eval-trajectory.ts` —— 6 条（F6：端点公式不变、2 样本两口径一致、
  中途劣化暴露、持续改善判定、持平/恶化、顺序缺失仍排除）
- 插件测试 +4 —— 跨层 patternId、标准 wire format ×2、亲缘排序与反例
- E2E +1 —— F1 跨层 patternId 一致性

---

## 6. 仍然没有解决的

1. **F1 的两份实现仍然是两份代码**（平台权威 + 本地离线回退）。
   真正的「只有一份」需要两个仓库共享一个包，或者本地模式也强制走平台。
   当前用「同一组期望值 + 两侧互为测试」来防漂移 —— 这是可接受的折中，不是终局。
2. **亲缘表仍是两份**（同上）。
3. **亲缘表的产品语义是我定的**：PRD 只说了「相似任务」，没有定义「相似」。
   这张表需要产品确认，尤其是权重和「只走 1 跳」这两条。
4. **多副本下 exactly-once 仍不成立**（能力服务状态是进程内的）——
   上生产的硬阻断，本轮没有触及。
5. **`P6-W8` 仍然 `BLOCKED`**：真实端点、真实凭据、最终服务端授权仍缺。
