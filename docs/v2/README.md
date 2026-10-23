# AWKN Marketing｜V2 自主获客与营收增长扩展索引

> 状态：PROPOSED / DOCUMENTATION_ONLY  
> 起点：main@b0b06f638b7550628d41c12deb10591f70671040（2026-10-23 核验）  
> 上位：docs/PRD.md、docs/ENGINEERING.md、docs/DEVELOPMENT-PLAN.md  
> 原则：P6/P7 不改道；任何对外动作均需独立授权与证据

## 0. 裁决
V2 探索“主动发现需求并合规触达”及“自助购买与自动交付”双泳道。复用 Marketing Agent、Workspace、Task、Material、Artifact、Evidence、Feedback、Outcome、Learning、Evolution 的现有能力。Agent OS 承担运行、权限终审、工具、记忆与执行；Marketing 只定义业务语义与产品体验。

V1 PRD 第 2.2 节明确排除 Campaign Automation、群发外呼、销售 Pipeline、CRM。V2 为隔离提案，未经独立评审不得反向改变 V1 定义、当前 19 个 ProductOperation 或已验证 P0–P5 基线。

## 1. 文档金字塔
| 层 | 单一职责 | 文件 |
|---|---|---|
| 产品扩展 PRD | 目标用户、双泳道、收入验证、权限边界 | PRD-AUTONOMOUS-REVENUE.md |
| C11 工程文档 | 原始需求证据、筛选与评分 | C11-DEMAND-RADAR.md |
| C12 工程文档 | 提案、合规触达、自助成交与交付 | C12-CONVERSION.md |
| C13 工程文档 | 支付事实、单位经济与归因 | C13-REVENUE-EVAL.md |
| 执行计划 | 依赖优先的分段实施与硬门 | EXECUTION-PLAN.md |

每组件独立工程文档，每模块只占该组件文档内一节。新建实现需先通过 P6 真实服务契约门，再形成逐模块源码、测试、回执与 Exact SHA。

## 2. 现有资产复用
- S2 营销研究与每日学习 → C11 需求监测；S3/S4 → C12 判断与产出；Outcome/Eval → C13 商业结果。
- 现有 19 个 ProductOperation → V2 规划期只读其契约，禁止假设已经存在 outreach.send、checkout.create、payment.confirmed 等服务端操作。
- 商业能力优先 COPY > ADAPTER > BUILD：平台已提供的授权支付、邮件发送、工单与网站托管用 ADAPTER；营收证据与场景差异化逻辑再评估 BUILD。
- 七 Bot（Ace/Atlas/Webster/Vista/Rex/Penny/Vega）保留为市场启发案例。未经核实的收益、增长、渠道权限均标 UNKNOWN；不设计七套独立 Runtime。

## 3. 当前证据及缺口
已核验：本仓主干文档、目录、现有 Product Contract/Ports、P6/P7 计划。
未核验：真实平台 P6 E2E、支付渠道、获客渠道合规授权、客单价、转化率、成本、真实回款。
提案态不得宣称业务已获利、生产可用或工程验收完成。

## 4. 阅读顺序
PRD-AUTONOMOUS-REVENUE → C11 → C12 → C13 → EXECUTION-PLAN；实施前复核 docs/ENGINEERING.md 与 docs/DEVELOPMENT-PLAN.md 最新版本。