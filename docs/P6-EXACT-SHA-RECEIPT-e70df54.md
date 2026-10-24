# EXACT-SHA RECEIPT — AWKN-Lab/marketing · P6

> 本回执由授权执行环境在**完整仓库**上实际执行生成，逐条记录命令、退出码与计数。
> 用途：解除 `P6-W7-15` / `P6-W7-16` / `P6-W4C-RV1` 三项的 `RUNTIME_VERIFICATION_PENDING` 阻塞。
> 判定纪律：**无回执 = 不算闭环**。本文件即为回执。

## 1. 身份指纹

| 项 | 值 |
|---|---|
| Repository | `AWKN-Lab/marketing` |
| Branch | `feature/capability-server-integration` |
| Exact SHA | `e70df545092662dda6d07128f6ab04e9eda10620` |
| Tree | `55180a73bddbee2727738c0607d3fb19c128a78e` |
| Commit | `docs(p6): refresh the dependency status after the platform composition landed` |
| Commit Date | 2026-10-24T05:06:32+08:00 |
| Worktree | **干净**（取证前后均 0 个改动；构建产生的 `next-env.d.ts` / `tsconfig.json` / `tsconfig.tsbuildinfo` 噪声已还原，还原后 tree 与上表一致） |
| 执行开始(UTC+8) | 2026-10-24T08:38:01+08:00 |
| Node | v22.19.0 |
| npm | 10.9.3 |
| 权限来源 | `GITHUB_TOKEN_REPO`（classic PAT, repo scope） |
| 原始运行日志 | 随本次提交留存于 `docs/P6-EXACT-SHA-RECEIPT-e70df54-raw.txt` |

**为什么是这个 SHA。** 本 SHA = `31d99eaf7fa9ffe1dc8de4fee1d3e27ab709ac62`（P6 基线）
+ 平台能力服务接线（`/api/product` 改走 AWKN OS 能力服务、24 个 P6 脚本改用共享能力服务 mock、
Session 撤销列表入契约）+ 依赖状态文档刷新。

也就是说：**三项待验证工作单元的代码在基线里没有变，但它们所依赖的产品接口与 P6 测试脚手架变了。**
因此本回执证明的不只是「基线上能过」，而是**改线之后仍然过** —— 这是比 2026-10-23 那份
（SHA `31d99eaf`）更强的证据。

## 2. 仓库级门禁（全部 exit 0）

| # | 命令 | 退出码 | 耗时 | 计数 |
|---|---|---|---|---|
| 1 | `npx tsc --noEmit` | **0** | 44s | — |
| 2 | `npm run test:p0` | **0** | 1s | P0 acceptance passed |
| 3 | `npm run test:p6` | **0** | 41s | **PASS 170 / FAIL 0 / SKIP 1** |
| 4 | `npm run build` | **0** | 106s | Next 构建成功 |

`test:p6` 覆盖 34 个子套件（contract / permission / idempotency / revision ×3 / concurrent-update /
stale-retry / request-timeout / upstream-5xx / rate-limit / malformed-json / adapter-http-failure /
malformed-success / missing-entity-ack / identity-mismatch / duplicate-submit / duplicate-retry /
active-session-revoke / dependency-unavailable ×2 / workspace / material / task / task-execution ×2 /
agent / feedback / outcome / learning / evolution / integration / ci-guard）。

> 计数说明：170 是**本分支**的 P6 断言数。`feature/pattern-detection` 分支因额外含
> `scripts/p6-pattern.ts` 的 21 项断言而为 191。本回执只对上面这一列 SHA 负责。

## 3. 逐工作单元 focused 门禁

三个待收口工作单元各有专属脚本，单独再跑一次，给出**逐项**计数（不依赖全量链的聚合结论）：

| 工作单元 | 脚本 | 退出码 | 断言 | 覆盖的语义 |
|---|---|---|---|---|
| `P6-W7-15` | `scripts/p6-active-session-revoke.ts` | **0** | **7 PASS / 0 FAIL** | 会话期内权限被撤销：授权失效路由、刷新与失效事件分离、撤销 Grant 后的动作拒绝、撤销后的投影过滤 |
| `P6-W7-16` | `scripts/p6-dependency-unavailable.ts` | **0** | **3 PASS / 0 FAIL** | 依赖临时不可用：可重试失败、零副作用、同 key 恢复 |
| `P6-W7-16` | `scripts/p6-dependency-unavailable-learning.ts` | **0** | **4 PASS / 0 FAIL** | Learning 重试：跨 attempt 的 signals/trace 隔离、同 attempt 增量合并、旧 attempt 不可覆盖新 attempt |
| `P6-W4C-RV1` | `scripts/p6-agent.ts` | **0** | **8 PASS / 0 FAIL** | Agent context-version 幂等：Material revision 变化绑定到确定性上下文指纹，同一上下文重试保持同一逻辑身份，Material revision 变化产生新身份 |

## 4. 本回执逐条解除的账本条件

| 账本项 | 原状态 | 原阻塞条件 | 解除依据 |
|---|---|---|---|
| `P6-W7-15` | `VERIFYING` | 「Required repository-wide typecheck / P0 / P6 / focused W7O test / build evidence is unavailable in current container」 | 上表第 1–4 项 + 第 3 节 W7O 行，全部 exit 0 |
| `P6-W7-16` | `VERIFYING` | 「Full repository runtime verification unavailable; Reviewer code findings now have fresh focused current-head evidence」 | 上表第 1–4 项 + 第 3 节 W7P 两行，全部 exit 0 |
| `P6-W4C-RV1` | `REVIEW` | 「Exact-SHA repository runtime unavailable in GIT_ONLY; required G3/G4 verification must be executed by an authorized runtime owner」 | 本回执即为 exact-SHA 仓库运行时执行 + 第 3 节 agent 行 |
| `P6-W7`（整体） | `VERIFYING` | 「because P6-W7-15 and P6-W7-16 remain under verification」 | 上两项收口后自动解除 |

Reviewer 的处置规则是**条件式**的：「Keep `P6-W7-15` `VERIFYING` **while** required non-CI repository
runtime evidence is unavailable」。该条件的前提现已不成立，故相应阻塞随之解除。

## 4b. 回执与后续提交的边界

本回执对应的**代码状态**是 SHA `e70df54`。写入本回执文件与账本更新的后续提交**只新增文档**
（`docs/P6-EXACT-SHA-RECEIPT-e70df54.md`、`docs/P6-EXACT-SHA-RECEIPT-e70df54-raw.txt`、
`docs/AUTOMATION_TASK_LEDGER.md`），**不触碰任何生产代码或测试代码**。因此本回执的运行时证据
对后续提交同样成立。

## 5. 本回执**不**覆盖的范围（不夸大）

1. **不覆盖 `P6-W8`（真实 AWKN E2E）。** W8 要求真实端点、真实凭据、最终服务端授权、
   跨服务 trace 证据、网络级同 key exactly-once 证据。本回执是**仓库级本地运行时**证据，
   不含任何真实 AWKN 网络往返。W8 状态维持 `BLOCKED`，本回执不改变它。
2. **不覆盖生产环境授权。** 第 2 节的门禁在授权容器内执行，不是生产环境验收。
3. **不覆盖 `P7` 任何工作单元。** P7 仍为 `PLANNED`。
4. **不改变任何评审结论。** 本回执提供运行时证据；工作单元的最终处置仍由 Reviewer 在账本中记录。
5. **不声称产品层已具备生产可用的持久化。** 能力服务侧的 `MarketingProductState` 仍为进程内实现。

## 6. 与前一份回执的关系

| 回执 | SHA | 范围 |
|---|---|---|
| 2026-10-23T17:49Z（PR #2 评论） | `31d99eaf7fa9ffe1dc8de4fee1d3e27ab709ac62` | P6 基线（未改线） |
| **本回执** | `e70df545092662dda6d07128f6ab04e9eda10620` | P6 基线 + 平台能力服务接线（改线后） |

两份回执都有效；本回执**包含**前者覆盖的全部工作单元，并额外证明**改线未破坏**它们。
前一份回执已发出但**未写入账本**（账本最后提交仍是 `31d99eaf`），本次一并补齐。
