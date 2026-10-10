# Pharma Campaign OS｜供体吸收与能力边界清单

> 研究基线：GitHub 公共默认分支只读文档与部分代码核查；未完成工作树实测。所有吸收均需绑定 Exact Source SHA、路径、许可证、组件 Owner、测试和回退点。

## 1. 自有 Git 仓优先

| 供体 | 可复用能力 | 初始裁决 | 验证边界 |
| --- | --- | --- | --- |
| [AWKN-Lab/marketing](https://github.com/AWKN-Lab/marketing) | Workspace / Material / TaskExecution / Feedback / Outcome / Learning / 产品端权限 | COPY / ADAPTER 首选 | 现有 PRD 明确排除 Campaign Automation；P0–P5 DEVELOPMENT_VERIFIED，P6/P7 尚未完成真实验收 |
| [AWKN-Lab/agent-os](https://github.com/AWKN-Lab/agent-os) | 多智能体协同、工具调用、Grant、执行 Receipt | ADAPTER | 不复制或重建运行时 |
| [AWKN-Lab/AWKN-Memory-OS](https://github.com/AWKN-Lab/AWKN-Memory-OS) | Evidence/Claim/Lineage、冲突与有效性 | ADAPTER | 不复写记忆数据所有权；实时迁移/线上版本需重新验 |
| [AWKN-Lab/awkn-mcp](https://github.com/AWKN-Lab/awkn-mcp) | Source/Connector/Transport/Health | ADAPTER | 已注册工具不代表数据源已可用 |
| [AWKN-Lab/UI](https://github.com/AWKN-Lab/UI) | 工作台壳、状态、通知、组件 | COPY 候选 | 需明确已进入 main 的实际源码与移动端布局 |
| [AWKN-Lab/Forge](https://github.com/AWKN-Lab/Forge) | 反方审查、证据缺口、决策综合 | ADAPTER 候选 | 与 Pharma 业务状态隔离，五反方只做辅助建议 |

## 2. 外部开源候选

| 项目 | 可能节省的工作 | 先决条件 |
| --- | --- | --- |
| [Docling](https://github.com/docling-project/docling) | 文档解析 | 医学表格/数字人工复核、解析质量测试 |
| [GrapesJS](https://github.com/GrapesJS/grapesjs) | 资产可视化编辑 | Claim 受控片段与批准版本保持一致 |
| [Dittofeed](https://github.com/dittofeed/dittofeed) | 分群与旅程执行 | 商业功能许可、仅授权渠道；排除重复状态机 |
| [Activepieces](https://github.com/activepieces/activepieces) | API 连接器 | 先核已有 MCP 连接能力，避免双调度 |
| [Flowable](https://github.com/flowable/flowable-engine) | 审批流 | 只有现有工作流确实不足时引入 |
| [Langfuse](https://github.com/langfuse/langfuse) | AI 质量与 Trace | 避免敏感日志外泄；审计 Authority 仍在产品域 |

许可与竞品详见 [RESEARCH](./RESEARCH.md)。供体以 `COPY > ADAPTER > BUILD` 评估，最终由适配测试裁决，不预设一定吸收。

## 3. 工程验收登记模板

```text
component:
source_repo:
source_ref:
source_exact_sha:
source_paths:
license:
target_paths:
reuse_mode: COPY | ADAPTER | BUILD
delta:
contract_tests:
runtime_receipt:
rollback:
decision: KEEP | SHADOW | REJECT
```

首轮可用状态：源仓存在、README/产品契约已只读核对；Exact SHA 级文件映射及实际医药链路运行一律 PENDING。
