# Pharma Campaign OS｜医药营销战役项目文档

> 状态：参赛 MVP 产品与工程候选；尚无本项目生产代码、正式医药渠道授权或药企验收。
> 归属：`AWKN-Lab/marketing` 仓库内独立医药营销产品扩展；保留原“自主进化营销助理”产品及 P6/P7 主线。
> 资料：2026-10-10 至 2026-10-11 会话定稿与公开竞品研究；需以源仓实测进一步校验。

## 唯一阅读入口

| 文档 | 角色 | 状态 |
| --- | --- | --- |
| [PRD.md](./PRD.md) | 医药战役产品母 PRD、MVP 验收、三策略五反方 | v1.2 候选 |
| [RESEARCH.md](./RESEARCH.md) | IQVIA、Veeva 官网递归、开源项目、用户反馈 | V3 研究 |
| [RETROSPECTIVE.md](./RETROSPECTIVE.md) | 方向判断复盘与边界修正，创意方法仅用于内部思考 | 历史研究 |
| [ENGINEERING.md](./ENGINEERING.md) | 战役域、角色、架构、接口、合规和验证合同 | v0.1 设计 |
| [DEVELOPMENT-PLAN.md](./DEVELOPMENT-PLAN.md) | 依赖、按组件交付顺序、退出与验收门禁 | v0.1 计划 |
| [WORKFLOW.md](./WORKFLOW.md) | 工作流程泳道图源文件、人工交接、失败回退 | v0.1 图示 |
| [SOURCE-MAP.md](./SOURCE-MAP.md) | 自有 Git 仓和外部供体吸收清单、验证等级 | v0.1 候选 |

## 产品关系

```text
AWKN Marketing（原营销助理：任务/素材/反馈/学习）
    └─ 医药战役产品扩展 Pharma Campaign OS（新领域）
        ├─ 六个业务工作台
        ├─ 三套策略与五位反方
        ├─ 医学证据、合规审批
        └─ 授权执行、效果回流
共享能力：Agent OS / Memory OS / AWKN MCP / AWKN UI / Forge（选择性）
```

**数据真值：** Pharma Campaign OS 持有 Campaign、Plan、Asset、Approval、Dispatch 与 KPI 业务事实；Memory OS 持有证据和 Claim 血缘；Agent OS 持有 Agent Run/Tool Execution 回执；AWKN MCP 持有连接健康及可用性事实。

**开发约束：** 此目录为文档设计与候选归档。原仓 `docs/PRD.md` 明确排除战役自动化，执行医药平台研发前需单独批准该扩展的业务边界；不能把文档写入当成源码、测试或真实渠道已落地。一个大组件只开一个 PR，先查现有分支，再开发。

## 演示主链

市场信号 → 医学证据 → 三方案 → 15 份独立反方意见 → 业务 Owner 选案 → 内容与 Claim → 医学/法务/监管人工审批 → 授权执行或明确沙盒模拟 → 回执与事件 → 复盘再决策。

公开仓库不得存放任何药企保密资料、受限 HCP/HCO 数据、患者数据、Token 或真实联系人。
