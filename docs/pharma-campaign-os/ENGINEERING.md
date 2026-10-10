# Pharma Campaign OS｜最小 MVP 工程母文档

**版本：** v0.1（设计候选）  
**上位产品真值：** [PRD](./PRD.md)  
**复用依据：** [SOURCE-MAP](./SOURCE-MAP.md)  
**工作流：** [WORKFLOW](./WORKFLOW.md)

## 1. 工程目标与冻结范围

MVP 在同一 `campaign_id` 下完成情报→证据→三策略→五反方→选案→计划→内容→医学法务监管审核→授权执行→回执→复盘。一场战役、一款产品、一个适应症、一条受控渠道。六工作台具备真实业务状态、审批、事件与权限；外部未授权渠道只能沙盒执行。

产品与实现边界独立于现有 `marketing` 营销助理。原 `docs/PRD.md` V1 不包含战役自动化；本子项目拟扩展新业务域，待 Owner 接受并进入单组件工程 PR 后才能开发。保护 P0–P5 已验证产品行为和 P6 正在联调的工作树。

## 2. 系统层

| 层 | 职责 | 事实源与端口 |
| --- | --- | --- |
| S0 Pharma Campaign Domain | 战役、预算、受众规则、策略、内容、审批、执行投影、指标 | 本产品持有唯一 Campaign 事实源 |
| S1 产品交互 | 六大工作台、泳道状态、Owner 决策、审批操作、异常显示 | 尝试复用 AWKN UI / marketing；服务端最终授权 |
| S2 研究与思考 | 三策略生成、五位反方、证据缺口、反方分歧 | Agent OS + 可选 Forge Adapter；输出候选 |
| S3 记忆与证据 | Signal 来源、Evidence、Claim、证据失效传播 | Memory OS Authority；本产品保存引用和版本指针 |
| S4 连接与执行 | 专业渠道适配器、数据源、异步执行、回执 | AWKN MCP 连接，Agent OS 执行；本产品核验回执 |
| S5 安全合规 | 租户隔离、适应症/内容/地区/受众/渠道规则、人工审批 | 产品政策引擎与企业 MLR；默认拒绝 |

## 3. 大组件（一个组件一个 PR）

| 组件 | 所有权 | MVP 输出 | 验收 |
| --- | --- | --- | --- |
| C01 战役核心 | Pharma Product | Campaign/Plan/Budget/Task、状态机、版本与事件 | 跨六工作台 ID 一致；冷启动读回 |
| C02 情报证据 | Memory Adapter + Pharma Claim Policy | Signal/Evidence/Claim/SourceLink | 每个医疗声称有有效证据；无出处拒绝下游 |
| C03 策略沙盘 | Strategy Coordinator | StrategySet、三差异方案、CritiqueRecord ×15、Decision | 五反方分别出记录；风险与异议不可丢失 |
| C04 内容与 MLR | Pharma Compliance | AssetVersion、引用、Approval、签收链 | 不准未批准内容下发；内容改动自动失效 |
| C05 授权执行 | Channel Adapter + Pharma Dispatcher | AudienceScope、DispatchIntent、DispatchReceipt | 无权限拒绝；幂等；可暂停撤回；失败有回执 |
| C06 复盘指标 | Pharma Measurement | OutcomeEvent、KPI、Review、NextIteration | 明确模拟/真实；指标可溯源且可重算 |

横向依赖：Tenant/Actor/Grant、统一 Event Ledger、Outbox/Retry、OpenTelemetry、部署与回退。现有平台有同类能力时通过 Adapter 接入，禁止新建第二套运行时与身份权威。

## 4. 核心业务对象与关键字段

```text
Campaign(tenant_id, campaign_id, brand_id, indication_id, owner_id,
         stage, objective, audience_rule_ref, budget_cap, policy_region,
         revision, created_at, updated_at)
Signal(signal_id, source_ref, captured_at, rights, source_hash, label)
Evidence(evidence_id, source_id, page_or_section, version, valid_until, status)
Claim(claim_id, indication_id, evidence_refs[], status, scope, revision)
StrategySet(strategy_set_id, campaign_id, brief_hash, strategies[3], revision)
CritiqueRecord(record_id, strategy_id, reviewer_role, verdict,
               evidence_refs[], risks[], counter_argument, timestamp)
Decision(decision_id, chosen_strategy_ids[], owner_id, reason, version)
Plan(plan_id, budget, audience_ref, channel_rules, schedule, kpi_definition)
AssetVersion(asset_id, version, claim_refs[], body_hash, audience_scope, status)
Approval(approval_id, asset_hash, reviewer_role, signer, decision, signed_at)
DispatchIntent(intent_id, asset_hash, approval_refs[], audience_ref,
               channel_ref, idempotency_key, execution_mode)
DispatchReceipt(receipt_id, intent_id, adapter_run_id, provider_ref,
                result, failure_code, occurred_at, is_simulated)
OutcomeEvent(event_id, campaign_id, metric_key, value, source_ref, event_time)
Review(review_id, campaign_id, evidence_refs[], next_iteration, owner)
```

所有写入都须有 `tenant_id`、`actor_id`、`request_id`；涉及重试的写入要有稳定 `idempotency_key`。任何已批准素材绑定不可变 `asset_hash`；修改后重新进入 MLR 审批，旧授权失效。

## 5. 状态机

```text
DRAFT → EVIDENCE_READY → STRATEGY_REVIEW → OWNER_SELECTED
→ CONTENT_DRAFT → MLR_PENDING → APPROVED → READY_TO_EXECUTE
→ RUNNING → MEASURED → REVIEWED → CLOSED
```

允许 `REJECTED/ON_HOLD/REVOKED/FAILED` 等显式异常分支。每次转移需记录操作者、前后状态、依据、时间、事件 ID、请求 ID、预期 revision 与新的 revision。恢复后校验回执，禁止只凭 HTTP 成功宣称执行成功。

## 6. 三策略与五反方合同

同一 `brief_hash`、冻结证据集与预算约束下生成 A/B/C 三套可区分的策略，至少在受众、渠道或活动形式上存在明确差异。五反方：市场、医学、竞争、财务、合规；每人独立对三套方案分别产出 verdict/risk/evidence/flip_condition，至少 15 条可重放记录。可提出组合方案，但必须追踪原策略 ID。

合规/医学反方只产生策略硬阻断或风险，不能替代正式 MLR 签字。业务 Owner 只能在证据与风险被显式展示后选案。策略更新导致 Brief/Claim/资产版本变化时触发重评或重新审批。

## 7. 安全与法规执行

- 条件维度：`药品性质 × 地区 × 适应症 × 人群 × 渠道 × 内容类型 × 同意/授权 × 素材版本`。
- 任一条件缺失、未知、失效或权限不足时 `BLOCKED`；外部发送默认禁止。
- 正式医学、法务、法规审批由独立授权人员签字；系统不能伪造或自动提升审批身份。
- 实际触达仅可走客户批准的合规渠道；演示环境使用显著 `SIMULATED` 标记，保留模拟 Receipt。
- 数据最小化，HCP/患者数据仅在授权范围处理；公开仓库绝不保存真实敏感数据。
- 应支持暂停、撤销、内容失效传播、异常告警、重试和审计回放。

## 8. Adapter 与复用策略

优先 `COPY > ADAPTER > BUILD`：先对 `AWKN-Lab/marketing` 的 Task/Material/Feedback/Learning 产品模型做字段与许可审查，再接 Agent OS、Memory OS、MCP、UI；Forge 仅提供策略反方评审候选。可选外部供体（Docling、GrapesJS、Dittofeed、Flowable 等）须核对许可证、架构重叠、延迟与成本。详见 SOURCE-MAP。

## 9. 工程门禁

- **代码合同**：schema 与 API 类型检查；产品实体 ID、revision 和幂等逻辑可测试。
- **安全**：跨租户、越权、审批绕过、过期素材、未授权渠道必须负例通过。
- **业务**：一场战役完整流转；三策略、15 反方、Owner 选案、驳回重审、执行回执、复盘。
- **运行时**：真实服务、真实 DB、冷启动恢复、重复请求、超时重试、执行撤回、异常收敛。
- **证据**：每门输出测试、运行环境、Git Exact SHA、数据分类、模拟/真实状态和回退点。
- **发布**：未获生产授权不得上线或发送任何医药营销内容。

当前状态只认文档完成；真实代码吸收、外部渠道与完整运行时均为 `NOT_RUN`。
