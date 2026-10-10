# Pharma Campaign OS：IQVIA / Veeva 深度产品调研与开源降本选型

**调研日期**：2026-10-10；**官网递归复核**：2026-10-11（V2）；**独立用户评价增量**：2026-10-11（V3）  
**定位**：面向信达生物命题二的「创新药全链路营销战役平台」研发决策文件。  
**依据**：题面要求覆盖舆情监测、医学数据检索、策略制定、内容生成、精准投放、效果回环。竞品依据 IQVIA / Veeva 产品官网与官方文档，开源依据 GitHub 原仓/许可证。  
**证据边界**：仅完成公开资料研究，**未**取得 IQVIA/Veeva 企业试用、接口授权、部署报价，也**未**完成候选开源仓的代码构建与运行时审计。所有开发周期和复用收益均为估算，禁止作为实测事实。

## 0. 执行决策（一页版）

**结论**：以 Veeva 的「合规内容工厂 + CRM 战役执行」和 IQVIA 的「人群/渠道/下一最佳行动」为产品功能基准，搭建以 **Campaign 为核心业务实体** 的平台。一个战役贯穿情报→研究→策略→预算→内容→MLR审批→渠道执行→效果→复盘。多智能体置于工作台内部，无独立第二套业务真相。

- 首批集成/复用：**Dittofeed**（多渠道旅程）、**Activepieces**（外部系统连接）、**Docling**（医学资料解析）、**GrapesJS**（内容可视化编辑）、**Flowable**（BPMN与人工审批）、**Langfuse**（AI质量与执行追踪）。六件产品构成**候选**，依工程兼容性选择吸收/适配/旁路服务，不在未经审核下直接部署生产。
- 可选增强：**OpenSearch**（舆情与证据检索）、**PostHog**（点击/行为分析）、**Apache Superset**（经营战役报表）、**Qdrant**（语义检索）、**Temporal**（长任务可靠执行）；避免同类重复叠栈。
- 优先保留自研：Campaign 主实体与状态机、医学断言/证据绑定、适应症及传播渠道合规政策、审批后不可变版本、战役成本与归因、审计 Receipt、跨系统权限/数据隔离。
- **直接排除为“自由复制开源”**：n8n（Sustainable Use License 有限制）；Mautic（GPLv3，可以使用，但源码并入闭源产品的义务需法律判断）；Dittofeed 的嵌入/白标/多租户等商业扩展不能视作其 MIT 社区代码功能。

---

## 1. 信达命题的真实验收对象

题面实际要求一套有组织边界的营销战役运行系统：将「用研/医学/市场/销售」分工断裂转化为统一流程，并将传统漫长的策略/制作/执行周期缩短。需要呈现**业务流程**、**工作台**、**协作角色**、**执行动作**和**有证据的反馈**。

### 1.1 六大工作台

| 工作台 | 最小必须功能 | 真值/关键输出 | 首版建议 |
|---|---|---|---|
| 情报与证据 | 市场信号收集、文献/药品说明书入库、版本和来源标注 | Evidence / Signal | P0 |
| 策略与战役编排 | Campaign brief、目标、人群、预算、渠道、时间线、实验 | CampaignPlan / Budget | P0 |
| 内容工厂 | 复用经批准的证据断言、制作邮件/海报/资料版本 | Asset / Claim / Citation | P0 |
| 医学法务监管审批 | 医学-法务-法规(MLR)人工审核、修改、批准、撤回、过期 | Approval / Policy / Exact Version | **P0 强制** |
| 全渠道执行 | 授权人群、渠道、计划任务、执行回执和错误状态 | Audience / Journey / DispatchReceipt | P0 至少完成一条合法授权通路 |
| 战役效果与复盘 | 投入、触达、参与、转化、成本、归因限制、实验对照 | Event / Attribution / Learning | P0 基础指标；P1 高级归因 |

**必须落在平台层的横向功能**：组织/租户隔离，角色权限与数据授权，版本控制，审核时效，任务与通知，失效撤回，审计证据，数据保留/删除策略，人工接管。

**重要边界**：将“几小时完成”定义为**在已授权数据、已审批素材、批准渠道和已配置流程下完成可审查的战役准备与部分内部执行**；不得承诺数小时绕过医学/广告审批并完成面向公众投放。

---

## 2. IQVIA 详研：数据与下一最佳行动型商业体系

### 2.1 主要产品分层

1. **OneKey**：HCP/HCO 参考数据及商业接触信息。官方列出约 2,500 万 HCP、600 万 HCO、118 个国家；这些属于全球覆盖口径，**并不意味着中国可直接取得或合法使用该规模数据**。价值：专业人士主数据、分群与服务渠道偏好。官网：[OneKey](https://www.iqvia.com/solutions/commercialization/data-and-information-management/onekey)。
2. **OCE / OCE+（Orchestrated Customer Engagement）**：商业客户互动工作流，将面访、数字互动及销售现场工作整合。OCE+ 把 Next Best 建议嵌入一线活动，避免只在看板上给分析。官网：[OCE+](https://secure.constellation.iqvia.com/OCEplusdemopage)。
3. **OCE Digital**：营销旅程设计、人群细分、历史互动偏好、跨渠道触点管理、旅程效果分析，以及 Next Best 对纳入哪位 HCP、推送何种合规内容、使用何种渠道的建议。官网：[OCE Digital](https://secure.constellation.iqvia.com/DemoOCEDigital)。
4. **OCE Personal / OCE Optimizer**：前者面向一线医学/销售代表的互动场景，后者覆盖人员编制、辖区与互动计划优化；与 OCE Digital 对接。官方版本回顾：[2023 年 OCE 更新](https://www.iqvia.com/events/2023/06/fostering-the-future-of-engagement-with-iqvia-oce)。
5. **Next Best Action (NBA)**：规则 + ML，动态微分群、客户360、渠道/内容/时间优选、可调算法、实验追踪。官方宣传 200+ 可扩展算法与 300+ KPI 库；这属于供应商公开产品声明，未获独立复测。官网：[Next Best Action](https://www.iqvia.com/solutions/commercialization/commercial-analytics/orchestrated-analytics/next-best)。
6. **Orchestrated Analytics**：品牌上市、业绩与营销决策洞察集合，为 Next Best 和其他商业分析提供上层结构。官网：[Orchestrated Analytics](https://www.iqvia.com/library/fact-sheets/iqvia-orchestrated-analytics)。

### 2.2 用户操作路径（公开资料推导）

```
HCP/HCO 主数据 + 历史互动 + 品牌策略
   ↓
OCE Digital 分群、旅程与渠道编排
   ↓
Next Best Action 输出人/内容/渠道/时间建议
   ↓
OCE Personal / 数字渠道执行
   ↓
互动事件与业务反馈 → Orchestrated Analytics → 重新分群/规则调优
```

公开官网可支撑该能力链，但**实际联通范围、接口、版本和中国上线条款需要售前演示确认**。

### 2.3 IQVIA 强项及不足验证点

- **强项**：长期积累的 HCP/HCO 数据、规则与统计模型、销售现场动作整合、细分与下一最佳行动、多渠道效果运营；尤其适合成熟商业化网络的精细运营。
- **不能轻易宣称的空白**：IQVIA“没有内容生产”或“没有合规审批”——它在其他产品/合作生态可能已覆盖相关能力；公开页面无法穷举授权组合。
- **待核问题**：中国区部署与数据来源许可、HCP身份合法性、模型效果证据、准入价格、OCE Digital 连接方式、医学审批与内容撤回、客户数据是否需要复制到第三方。

**对我们的启发**：Next Best 必须成为具体“任务”，例如「对已授权的专业对象，在允许渠道，使用版本 X 已审批资料，创建待确认的触达任务」，并带有 `reason / evidence / expectedMetric / owner / policyDecision`。

---

## 3. Veeva 详研：合规内容与营销执行的工业化体系

### 3.1 主要产品分层

| 产品 | 公开确认的能力 | 对标我们的模块 |
|---|---|---|
| **Vault CRM Suite** | 生命科学销售、市场与医学团队共享客户数据/互动记录；面访、客户管理、计划及 AI | 主数据、任务与销售现场协同 |
| **Campaign Manager** | 专业营销旅程、可视化人群创建、分群和多动作战役，营销邮件、代表邮件、代表建议等 | Campaign 编排器 / Audience |
| **PromoMats** | 数字素材资产库、内容创建、MLR 审核、Claims 断言库、内容复用、批准后向 CRM 渠道分发 | 内容工厂 + 强制审批 |
| **Approved Email** | 使用批准模版/片段与合规个性化字段的专业邮件，记录发送、打开与点击 | 授权邮件执行+回执 |
| **Engage** | 与 HCP 的合规沟通、在线会议、获批资料分享，与 CRM 活动记录联动 | HCP 互动 |
| **Events Management** | 学术活动策划、演讲者/参会者、预算和费用、审批、活动执行全生命周期 | 学术活动战役 |
| **Network MDM / Align** | 客户主数据、辖区/销售运营规划 | 数据治理和资源编排 |
| **Crossix** | 广告/媒介投入与患者/医疗专业人员相关结果分析；核心 Measurement Suite 官方明确 **美国提供** | 高级营销归因（不宜照搬中国市场） |

官方出处：

- [Vault CRM Suite](https://www.veeva.com/products/crm-suite/)
- [Campaign Manager](https://www.veeva.com/products/crm-suite/campaign-manager/)
- [PromoMats](https://www.veeva.com/products/veeva-promomats/)
- [PromoMats MLR Review](https://www.veeva.com/products/veeva-promomats/mlr-review/)
- [Claims Management](https://www.veeva.com/products/veeva-promomats/claims-management/)
- [Approved Email](https://www.veeva.com/products/crm-suite/approved-email/)
- [Engage](https://www.veeva.com/products/crm-suite/engage/)
- [Events Management](https://www.veeva.com/products/crm-suite/events-management/)
- [Crossix](https://www.veeva.com/products/marketing-analytics/)

### 3.2 特别要学的 4 套机制

**A. “断言—证据—素材”三段血缘**

例如“某研究的某项结果”的 Claims 必须带原始论文、版次、适用对象、获批边界、原文定位；在海报/邮件里重用时保留可追溯引用。PromoMats 自带 Claims Library、自动识别引用及相关连接。我们的内容生产应强制“先取证，再改写，再审”，修改后不得继续借用旧审批。

**B. MLR 审批与不可变发布版本**

营销内容审批不仅是“AI 检查是否违规”。真正的业务动作是：提交内容→医学审核→法务/监管审核→批准并锁版→匹配渠道/适应症/受众→执行→追踪→失效撤回。Veeva 官方提供多文件联合审核、参考文献标注、相似度判断和分层审核；无需假定这些我们能直接复制。

**C. 战役与 CRM 共数据**

Campaign Manager 在 CRM 内使用同一份目标对象、内容、工作流、指标。这避免“营销已经发送、代表不知道；代表反馈了、营销不能用”的断裂。我们必须让 Campaign 和销售/学术活动共享统一 ID、不可混淆租户，不引入第二套对象真相。

**D. 活动也是战役渠道**

除了邮件，学术会议/专业交流可能是创新药更高价值的合规渠道。Veeva Events Management 覆盖从预算、参会、资料到审批；首版用一个模拟学术活动/经授权的 HCP 邮件通道，往往比做“全网投放”更符合题面。

### 3.3 Veeva 2026 AI 进展：必须纳入竞品基线

官方已公布 Vault AI in PromoMats 的前置内容质检、内容问答及 Claims Agent 方向，以及 Falcon MLR 的自动化路线。因此“AI 自动检查营销话术”“Agent 自动找证据”**单独拿出来已经缺少新颖性**。详见：[AI for PromoMats](https://www.veeva.com/products/ai-for-promomats/)，[创新指南](https://www.veeva.com/medtech/resources/veeva-promomats-2025-innovation-guide/)。

**对我们的启发**：重点竞争维度是从市场信号到合规执行的**端到端耗时、跨组织任务协调、失败回退及证据可追溯**。不要主张 Veeva 缺乏 AI 或缺乏战役编排。

---

## 4. IQVIA vs Veeva：产品功能矩阵

说明：`●` 官方明确、`◐` 通过邻接产品或集成可支撑、`?` 公开资料不足。此矩阵比较**公开已核实的产品能力**，不代表所有版本客户真实开通状态。

| 关键能力 | IQVIA 产品族 | Veeva 产品族 | 我们的应对 |
|---|---|---|---|
| HCP/HCO 数据 | ● OneKey | ● Network MDM | 使用合法、授权的样本数据，保留主数据来源 |
| 分群与客户旅程 | ● OCE Digital | ● Campaign Manager | COPY / ADAPTER 旅程引擎 |
| 下一最佳行动 | ● Next Best | ◐ CRM agents/建议与生态 | 建议→审核→可执行任务闭环 |
| 医学证据和 Claims | ◐ 多产品/需确认 | ● PromoMats Claims | 自研医药规则与证据真值，借助 Docling |
| MLR 审批 | ◐ 需确认组合 | ● PromoMats | 自研合规政策 + BPMN 审批 |
| 内容工厂 | ◐ 需确认组合 | ● PromoMats | GrapesJS 设计器+合规内容管理 |
| 合规邮件 | ● OCE Digital 旅程 | ● Approved Email | Dittofeed 仅授权对象/获批内容 |
| 学术活动 | ◐ OCE + 其他方案 | ● Events Management | P1 活动编排与预算核算 |
| 专业渠道互动 | ● OCE Personal | ● Engage | P1 现场任务/确认/反馈 |
| 数字触达指标 | ● OCE Digital / Analytics | ● CRM / Campaign Manager | 统一事件/阶段转化 |
| 高级广告效果归因 | ◐ 需进一步产品确认 | ● Crossix（美国重点） | 先跑可解释的局部指标，切勿模拟真实处方效果 |
| 企业级 AI / Agent | ● NBA 等 | ● CRM + PromoMats Agents | OS 负责协作，业务真值由 Campaign 管 |

**定位结论**：IQVIA 的可借鉴核心是“数据—建议—前线动作”的运营精度；Veeva 的可借鉴核心是“内容—审批—渠道—记录”的组织工业化。完整营销战役平台需要两个方向同时具备。

---

## 5. 开源工程候选：可以直接减少哪些开发？

### 5.1 P0 候选：先做隔离验证

| 项目 / 仓库 | 许可证（公开） | 能省的模块 | 吸收方式 | 主要代价 / 风险 | 裁决 |
|---|---|---|---|---|---|
| [Dittofeed](https://github.com/dittofeed/dittofeed) | MIT 核心 | 分群、消息模板、旅程、广播、反馈事件 | 独立服务 ADAPTER | 嵌入、白标、多租户扩展可能属于**付费闭源**；医学合规不可托管给它 | **P0 首试** |
| [Activepieces](https://github.com/activepieces/activepieces) | MIT 社区核心，EE 商业 | 数据源/API/Webhook/告警/连接器 | Sidecar ADAPTER | 工作流重试、租户隔离及部分 EE 权益需核；不能与 OS 形成双调度真源 | **P0 首试** |
| [Docling](https://github.com/docling-project/docling) | MIT 代码，模型需另审 | PDF/论文/说明书解析、表格与章节抽取 | COPY/服务 ADAPTER | 复杂 PDF 数字和表格必须人工/程序校对；解析不等于医学事实 | **P0 首试** |
| [GrapesJS](https://github.com/GrapesJS/grapesjs) | BSD-3-Clause | 拖拽编辑邮件/落地页/素材布局 | COPY 组件 + 自定义块 | 编辑器生成 HTML 不代表渠道合规；需插入已批 Claim 受控片段 | **P0 首试** |
| [Flowable](https://github.com/flowable/flowable-engine) | Apache-2.0 | BPMN、人审任务、审批流程、超时/驳回 | 独立 JVM 服务 ADAPTER | Java/JVM 独立部署增加运维；是否与已有 OS 流程引擎重复需先审 | **P0 评估** |
| [Langfuse](https://github.com/langfuse/langfuse) | MIT 核心，EE 商业 | Agent/LLM trace、质量评测、成本 | ADAPTER / observability | AI trace 不等于业务法定审计；日志隐私和遥测需检查 | **P0 首试** |

**重大提示（Dittofeed）**：其 GitHub README 明写 Embedding、Multi-tenancy、White-labeling 有另行授权的闭源代码。可以自研自有前端，通过 API 驱动开源旅程能力；不得把未开源的商用功能算进免费能力。

### 5.2 P1 / 按需候选：避免重复建设

| 项目 | 许可证 | 业务价值 | 使用建议 |
|---|---|---|---|
| [OpenSearch](https://github.com/opensearch-project/OpenSearch) | Apache-2.0 | 舆情文章、医学资料关键词检索及索引 | 搜索需求超过现有数据库能力时上；无需与 Qdrant 默认同时部署 |
| [PostHog](https://github.com/PostHog/posthog) | MIT 核心，`ee/` 商业 | 行为事件、漏斗、实验、归因辅助 | 优先用于**战役可控数字触点**；复杂自部署官方支持边界有限 |
| [Apache Superset](https://github.com/apache/superset) | Apache-2.0 | 多维报表/预算效果管理大屏 | 管理驾驶舱通过 SQL 数据层接入；不做第二套 KPI 真值 |
| [Qdrant](https://github.com/qdrant/qdrant) | Apache-2.0 | 医学资料语义检索/RAG | 仅当已有检索底座满足不了时新增 |
| [Temporal](https://github.com/temporalio/temporal) | MIT | 可恢复长任务、重试、执行状态 | 如果 OS 的执行持久化已有可用真值，**不要**并装第二调度 |
| [Apache Unomi](https://github.com/apache/unomi) | Apache-2.0 | 用户分群/个性化后台 | 与 Dittofeed 重叠明显，列入 P2；用于合法授权对象与数据处理 |
| [Mautic](https://github.com/mautic/mautic) | GPL-3.0-or-later | 开箱营销活动、邮件、名单、旅程 | 作为 Dittofeed 的替代产品做 PoC，不并入闭源源码；PHP 运维与 GPL 合规需审核 |
| [RSSHub](https://github.com/DIYgod/RSSHub) | MIT（按原仓许可复核） | 公开网页/订阅监测 | 仅支持遵循站点政策、访问权限和版权的信号采集 |

### 5.3 排除 / 慎用

- [n8n](https://github.com/n8n-io/n8n)：**source-available / fair-code，非可无限复制的标准宽松开源许可**。Sustainable Use License 对商用分发与作为服务提供有条款限制；不作为复制进商业产品的默认方案。
- **所有第三方数据 API**：IQVIA OneKey、Veeva OpenData、Crossix、第三方医学内容库均不是「免费开源数据」。需证明数据许可与中国市场适用范围。
- **普通广告平台自动发稿**：对于处方药，面向公众自动投放可能触及重大法规问题。外部动作默认禁用；实验环境允许使用模拟发送回执。
- **单独运行两个营销自动化系统**：例如 Dittofeed + Mautic 同时写入人群旅程，会造成双状态、重复发送、撤回不一致；只能选一条主执行链。

### 5.4 推荐的最小组合（按真实工程需求替换）

**MVP 最小组合**：

```
Pharma Campaign OS 自有 H5/Web 战役台
  │
  ├─ Campaign DB / 审计状态机 / 租户权限             [自研，唯一真源]
  ├─ 证据/药品资料 → Docling + 现有检索能力          [COPY/ADAPTER]
  ├─ 内容工厂 → GrapesJS + Claim/素材版本治理       [COPY/ADAPTER+自研]
  ├─ 审批 → 现有工作流；不足时 Flowable            [优先复用；避免重复]
  ├─ 渠道 → Dittofeed [仅合规授权名单/素材/渠道]    [ADAPTER]
  ├─ 连接 → 现有连接能力；不足时 Activepieces      [优先复用；避免重复]
  ├─ Agent → 已有 AWKN Agent OS                    [复用现有]
  └─ 结果 → 统一事件/回执；Langfuse 追踪 AI        [业务自研 + ADAPTER]
```

**PostHog 和 Superset**：第一版可简单查业务报表，无需两个都装。确有数字转化分析时再加入 PostHog；确有复杂自助 BI 时加入 Superset。

---

## 6. 关键工程契约：可执行又不会污染业务真值

### 6.1 核心实体

| 核心实体 | 关键字段建议 | 不变量 |
|---|---|---|
| `Campaign` | id, tenant_id, brand_id, indication_id, objective, stage, budget, owner | 一个战役唯一主 ID，禁止第三方旅程变成主真值 |
| `Signal` | source, observed_at, content_hash, rights, confidence | 不得无来源地宣布舆情或市场事实 |
| `Evidence` | source_id, title, page, exact_quote, retrieval_version, reviewer | 引用可以回溯文献原文及版本 |
| `Claim` | exact_text, evidence_refs, indication, approved_use, status | 没有被批准的断言不能作为外发已批内容 |
| `Asset` | campaign_id, claim_refs, blob_sha256, channel, version | 任何修改都需新的审核判定 |
| `Approval` | asset_sha, role, decision, scope, approver, valid_until | 批准锁绑定精确内容版本、受众和渠道 |
| `Audience` | lawful_basis, data_rights, opt_out, professional_status, purpose | 权利来源与接触权限明确；个人信息最小化 |
| `Journey` | campaign_id, target_scope, channel, start/stop, provider_ref | 渠道编排只能执行已签核动作 |
| `DispatchReceipt` | campaign_id, asset_sha, target_scope, action_id, provider_result, idempotency_key | 失败有回执、重复执行被阻止，外发有冻结证据 |
| `Measurement` | campaign_id, channel, denominator, source, window, model_version | 区分真实事件、模拟事件和推测归因 |

### 6.2 战役生命周期

```
DRAFT → RESEARCHED → PLANNED → CONTENT_PREPARED
  → PENDING_MLR → APPROVED → READY_TO_EXECUTE
  → RUNNING → MEASURED → CLOSED
```

其他必要分支：`REJECTED / CHANGES_REQUESTED / EXPIRED / REVOKED / PAUSED / FAILED`。

- 外发前同时验证 `approval_sha == asset_sha`、适应症、受众类别、渠道、地域、有效期、用户授权、预设频次及退订要求。
- `REVOKED` 时阻止后续分发，向已接入渠道下发撤回并收集各渠道 Receipt；撤回有失败分支，禁止宣称绝对成功。
- “Next Best Action”仅生成候选任务。发布、邀请、预算付款、触达等外部真实动作仍需业务与合规授权。
- 战役指标必须存基数、时间窗、来源、归因条件；不可将点击指标包装成新增处方或真实销售。

---

## 7. 开发路径：按组件开 PR，优先最小纵向闭环

**仅为估算**（假设现有 OS、UI、权限/审计基础可复用，1–2 名熟练工程人员，可运行 Docker/Node/Python，先用合法的合成数据，无药企生产系统授权）。依赖实际仓库审计、集成规模、数据合规审核；不构成交付承诺。

### 第 0 周：工程起步门（1–3 工作日）

1. Fresh-read 当前主仓/工作台代码、现有任务/持久化/权限/证据接口和 PR，禁止重复构建。
2. 单变量运行 Dittofeed 与 Mautic，确认 API、旅程创建、事件回写、许可证与多租户边界；**只选择一个**。
3. 比较现有流程引擎与 Flowable / Temporal、现有连接能力与 Activepieces，优先现有能力。
4. 锁定 Campaign 共享实体、状态机、事件及审批不变量；生成最小前后端合约。

### P0：第一条端到端 Golden Path（约 2–3 周）

- 战役建立：目标、预算、人群、时间线、统一 Campaign ID。
- 证据：导入 1 份公开可用且可引用的医学资料和一份获批说明书，定位引用。
- 内容：GrapesJS 生成 2 份内部审查稿，引用 Claims；人工 MLR 真实签核，锁 SHA。
- 执行：在**模拟/授权测试渠道**调用旅程 API；回执带 `provider_ref`、状态和失败原因。
- 结果：仪表盘显示发送/参与的模拟事件与真实操作事件分层，人工触发内容撤回并确认阻断。
- 验收：一次完整从 Campaign brief 到报表与复盘，全部有审计回执。重复任务无重复触达。外发审批失败时真实发送次数=0。

### P1：扩展战役引擎（约再 3–5 周）

- 多渠道执行和触达同意管理；活动日历、专业会议、代表建议；预算、并行活动与素材复用；策略 A/B；权限、租户隔离、异常恢复与审批撤回压力测试。
- 接入真实企业数据前，取得数据权利及系统授权；不得以模拟集成当真实可用宣称。

### P2：企业化（周期未评估）

- 地域法律规则、医学知识质量体系、API/SLA、广告与学术活动审查、角色职责矩阵、运营安全、外部渠道连接、集团多品牌能力、规模化监控。

**收益判断**：优先通过开源减少“通用旅程编排、界面编辑、解析、审批、连接和埋点”等基础劳动；医学合规、商业决策真值及责任仍由产品承担。不提供未经实际 PoC 验证的节省工时百分比。

---

## 8. 反方审查：六个最容易让比赛演示失真的地方

1. **演示的是对话机器人，战役主状态不存在**：看板与 Agent 内容无法回写同一个 Campaign。修正：每一步都有唯一主 ID 与状态迁移。
2. **AI 自动标记“合规通过”**：缺医学/法务/监管审批主体。修正：AI 只做预审建议，MLR 必须有被授权的审核人完成。
3. **“全渠道发布”实为按钮动效**：没有可验证回执/错误与撤回机制。修正：选一个获授权渠道做真实沙盒接线，其余标 SIMULATED。
4. **不验证医学适应症/版本**：内容引文存在但超适应症使用。修正：Claim 文本与药品说明书、适应症、市场/渠道规则绑定。
5. **错把海外成熟产品直接移植到中国**：Crossix 美国数据产品、国际 HCP 库无法自动用于中国。修正：逐一标明地域、数据权利和可用范围。
6. **开源堆叠冲淡工程主线**：两套旅程、两套身份与两套执行器。修正：COPY > ADAPTER > BUILD，选一个系统写入，留下统一审计和可撤回机制。

---

## 9. 中国合规边界（初步技术设计约束）

中华人民共和国《广告法》第十五条规定，处方药广告仅限指定的医学、药学专业刊物；《药品、医疗器械、保健食品、特殊医学用途配方食品广告审查管理暂行办法》第二十二条同样规定处方药广告发布场景。医疗专业学术交流、医学信息服务、药品广告具有不同法律性质，**不能靠“仅 HCP 可见”就自行判定都能合法投放**。实际商业上线必须由具备资质的法律/医学/药监专业人员审查具体业务路径。来源：

- [国家市场监管总局：《广告法》](https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2023/art_5474cf75173c45d6a0379730fb4e8d97.html)
- [国家市场监管总局：《药品、医疗器械、保健食品、特殊医学用途配方食品广告审查管理暂行办法》](https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2023/art_4ca076ac0eeb4a9e9204e0cee26e359b.html)

系统建议默认按 `audience_type × channel × promotion_type × geography × indication × consent` 判定，未知规则一律阻止外部触达，记录 `POLICY_REVIEW_REQUIRED`。临床原始病人数据、处方明细等高敏信息，首版不进入系统。

---

## 10. 采购/技术访谈清单

**向 IQVIA 验证**：OCE Digital 演示流程、OneKey 中国数据合法许可、Next Best 输入与 API、算法是否可解释、跨品牌预算、活动渠道、撤回链路、数据本地化及合同限制。

**向 Veeva 验证**：Campaign Manager 多渠道实际可用清单、PromoMats Claims/MLR 与 Campaign 的 API、批准素材向外部平台分发与撤回、活动类型、审批记录导出、Crossix 中国替代测量方案、订阅与实施费用。

**向信达业务方验证**：比赛重点是新药上市还是持续品牌营销？目标受众是 HCP、渠道还是公众？哪些渠道可授权展示？是否能拿到**脱敏/合成业务样本**、医学审批规则样例、既有技术栈、期望 KPI、禁触红线？没有这些答案，不应宣称已经具备真实完整的生产营销系统。

---

## 11. 研究入口及开源许可逐条清单

### 竞品官方入口

- IQVIA [Next Best Action](https://www.iqvia.com/solutions/commercialization/commercial-analytics/orchestrated-analytics/next-best)
- IQVIA [OCE Digital](https://secure.constellation.iqvia.com/DemoOCEDigital)
- IQVIA [OneKey](https://www.iqvia.com/solutions/commercialization/data-and-information-management/onekey)
- IQVIA [Orchestrated Analytics](https://www.iqvia.com/library/fact-sheets/iqvia-orchestrated-analytics)
- Veeva [Commercial Cloud](https://www.veeva.com/products/commercial-cloud/)
- Veeva [Campaign Manager](https://www.veeva.com/products/crm-suite/campaign-manager/)
- Veeva [PromoMats](https://www.veeva.com/products/veeva-promomats/)
- Veeva [Approved Email](https://www.veeva.com/products/crm-suite/approved-email/)
- Veeva [Events Management](https://www.veeva.com/products/crm-suite/events-management/)
- Veeva [Crossix](https://www.veeva.com/products/marketing-analytics/)

### 开源原仓 / 许可

- [Dittofeed](https://github.com/dittofeed/dittofeed) — MIT 社区代码；扩展授权需核
- [Activepieces](https://www.activepieces.com/docs/about/license) — MIT 核心，商业 EE
- [Docling](https://github.com/docling-project/docling) — MIT 代码，模型单独核对
- [GrapesJS](https://github.com/GrapesJS/grapesjs) — BSD-3-Clause
- [Flowable Engine](https://github.com/flowable/flowable-engine) — Apache-2.0
- [Langfuse](https://github.com/langfuse/langfuse) — MIT 核心，`ee/` 商业
- [OpenSearch](https://github.com/opensearch-project/OpenSearch) — Apache-2.0
- [PostHog](https://github.com/PostHog/posthog/blob/master/LICENSE) — MIT 核心，`ee/` 商业
- [Superset](https://github.com/apache/superset) — Apache-2.0
- [Temporal](https://github.com/temporalio/temporal/blob/main/LICENSE) — MIT
- [Qdrant](https://github.com/qdrant/qdrant/blob/master/README.md) — Apache-2.0
- [Mautic](https://github.com/mautic/mautic/blob/7.x/LICENSE.txt) — GPLv3-or-later
- [Apache Unomi](https://github.com/apache/unomi) — Apache-2.0
- [n8n](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) — Sustainable Use License，使用限制明确

### 最终工程前置条件

1. 必须 fresh-read 当前仓库和已有共享合约后才能决定吸收位置；目前未做代码级匹配。
2. 一大组件只对应一个工程 PR，已有分支复用；不在同组件开并行新分支。
3. 每个开源项目有许可证清单、依赖清单、复制范围、漏洞检查、替代与回退策略。
4. 沙盒数据 / 合成数据与真实数据、模拟操作 / 真实操作分开追踪。
5. 在真实授权、合规审查和运行时验证之前，系统状态只能记候选/测试，不能记生产可用。


---

# 附录 A｜2026-10-11 竞品官网主题递归复核（V2 更新）

## A0. 目的、方法、证据等级

**目标**：围绕信达命题二“舆情→医学证据→策略→素材→审批→授权渠道→反馈优化”重建竞争者真实产品谱系，找出功能重叠与设计机制，并为 Pharma Campaign OS MVP 调整优先级。**仅取官网当前公开内容**，不把营销指标视为独立实测。原第 1–8 章保留为初次调研快照；本附录对冲突结论具有优先解释权。

**递归方法**（主题范围内，最大深度 3）：

- `D0 官网首页`：IQVIA `https://www.iqvia.com/`；Veeva `https://www.veeva.com/`；对照参考 Adobe Experience League 文档主页。
- `D1 解决方案/产品族`：IQVIA Commercialization / Commercial Agentic AI / OneKey / Next Best Action；Veeva Commercial Solutions / CRM Suite / PromoMats / Marketing Analytics / Vault AI；Adobe Journey Optimizer Campaign Orchestration。
- `D2 产品页`：Veeva Campaign Manager、Approved Email、Events Management、PromoMats MLR、Claims、Content Strategy、Commercial Content Kernel；IQVIA OneKey、Next Best Action、Commercial Agentic AI / 家族说明。
- `D3 功能、使用说明或关联资料`：IQVIA 商业规划、文献综述、现场团队和数据目录智能体；Veeva Campaign Manager 与 CRM/PromoMats 的协同关系、Claims Auto Linking/Harvesting/Claims Agent、分层 MLR 与内容分类标准；Adobe 创建、发布、执行、监控与报告的文档。

**覆盖记录**：主页 2 个；两家官网相关产品族 8 类；相关产品/功能页及关联专题 15+ 个；Adobe 操作文档 5+ 篇。相同官网导航重复出现的链接作去重。数字为本次调研选取的主题节点，**并不代表官网完整页面总数**。

**证据等级**：`A` 当前官网产品正文直接确认；`B` 官网相关子页、销售/案例材料描述，但真实客户开通情况未知；`C` 从多个产品页推导的集成流程；`U` 未取得直接公开证明/演示页不可读。商业宣传的定量指标统一标记为“厂商宣称”，不作为我们性能基准。

**失败与缺口**：IQVIA 旧 `secure.constellation.iqvia.com/DemoOCEDigital` 演示入口无法由本次检索读取；Veeva 部分 Connections 演示入口不可达。官网无法证明特定中国客户已经开通某产品，也无法证明单一企业订阅可以无条件调用产品族所有功能；中国数据/渠道/广告法规适配及 API 授权仍为 `U`。对照记录：IQVIA 官网目前突出 Commercial Agentic AI，旧 OCE 页面应视为已有历史产品描述，具体生命周期需向厂商确认。

## A1. IQVIA 递归产品树（首页 → 商业化 → 智能体/数据/执行 → 能力）

| 深度 | 产品/页面 | 官网已明确的能力 | 我们要吸收的机制 | 证据 |
|---|---|---|---|---|
| D0→D1 | [Commercialization](https://www.iqvia.com/solutions/commercialization) | 商业数据、商业分析、HCP 互动、品牌与上市策略、AI 能力并列 | 从品牌战略到一线动作的整链分层 | A |
| D1→D2 | [OneKey](https://www.iqvia.com/solutions/commercialization/data-and-information-management/onekey) | 医护机构/专业人士主数据、渠道偏好和营销支持；官网称全球 2,500 万 HCP / 600 万 HCO / 118 国 | 数据来源/同意/地区授权成为受众门禁 | A |
| D1→D2 | [Next Best Action](https://www.iqvia.com/solutions/commercialization/commercial-analytics/orchestrated-analytics/next-best) | 客户 360、动态微分群、角色行动建议、可调算法、实验追踪、指标库 | 推荐必须落成可执行任务，记录理由、责任人、渠道和反馈 | A |
| D1→D2 | [IQVIA Commercial Agentic AI](https://www.iqvia.com/solutions/commercialization/iqvia-commercial-agentic-ai) | 品牌和商业运营多个专属智能体，依赖治理后的数据和工作流 | 产品级工作空间 + 数据治理 + Agent 结果进入真实动作 | A |
| D2→D3 | `Commercial Planner Agent`（上页产品族详情） | 官网明确描述分群、目标选择、互动计划；经对话创建、测试、调整销售及营销策略 | **三套策略不能主张市场首创**；必须用公平比较、反方意见、决策签收和后续业务效果形成新增价值 | A |
| D2→D3 | `Literature Review Agent`（上页产品族详情） | 从研究问题、检索策略、文献筛选到抽取与综合的多智能体协作 | 文献采集与证据整理可作为成熟竞品功能，不作为单独差异 | A |
| D2→D3 | `Global Market Insights Agent`（上页产品族详情） | 综合销售、推广渠道、医生互动、管线、专利到期和预测信号 | 情报源按业务问题组织，信号与证据来源分离 | A |
| D2→D3 | `Field Force Agent`（上页产品族详情） | 基于 OneKey 等可信数据辅助拜访准备、分群、动态目标选择、专业互动 | 将市场建议具体下发到受授权的一线任务 | A |
| D2→D3 | `Data Catalogue Agent`（上页产品族详情） | 企业数据源发现、结构/血缘描述、治理与分析应用 | 数据血缘、访问审计及数据许可成为平台基础设施 | A |
| D2→D3 | 旧 `OCE Digital` Demo 页面 | 本次无法直接读取具体演示细节 | 旧报告内容只作历史参考，正式 API/功能/许可须二次验证 | U |

**产品路线研判**：IQVIA 的覆盖已延伸到“市场信号→商业计划→专业人士细分→下一行动→现场执行反馈”。它的强项是专有医药数据与纵深分析。现有公开页面不足以确定其所有产品在某一个客户环境中天然联通，也不能据此断言它缺乏完整战役编排。

**供应商指标口径**：官网 Next Best Action 宣传 `300+ KPI`，OneKey 宣传全球规模，Commercial Agentic AI 宣传预测准确性提升等。数字的适用范围、实施条件、成本与独立复现均未知。报告不转换为本项目销售承诺。

## A2. Veeva 递归产品树（首页 → 商业应用 → 操作模块）

| 深度 | 产品/子页 | 官网确认的能力 | 对 MVP 的具体启发 | 证据 |
|---|---|---|---|---|
| D0→D1 | [Commercial Solutions](https://www.veeva.com/products/crm-suite/) | 共享客户资料、商业团队工作流和 AI 的商业化应用族 | 工作流围绕同一客户/战役身份贯通 | A |
| D1→D2 | [Campaign Manager](https://www.veeva.com/products/crm-suite/campaign-manager/) | 受众可视化创建、分群、多动作战役、营销邮件、销售代表邮件与建议；与 CRM 共客户数据/内容/工作流/指标 | `Campaign` 是第一实体；创建→细分→旅程→行动→回流合一 | A |
| D1→D2 | [Vault CRM Suite](https://www.veeva.com/products/crm-suite/) | CRM + 销售、市场、医学团队及现场互动，内嵌 AI；客户数据库统一 | 避免市场任务和销售执行各保存一套身份 | A |
| D2→D3 | [Approved Email](https://www.veeva.com/products/crm-suite/approved-email/) | 已批准模板、获批内容片段、受控个性化、排程及发送/打开/点击回流 | 只允许审批版本和具备授权的受众进入发送任务 | A |
| D2→D3 | [Events Management](https://www.veeva.com/products/crm-suite/events-management/) | 从计划、讲者/参与者、内容、预算及费用、审批到活动反馈；与 Approved Email、PromoMats、OpenData 集成 | **学术活动是更适合中国处方药场景评估的一条 MVP 候选渠道**，须先由企业法规确认 | A |
| D1→D2 | [PromoMats](https://www.veeva.com/products/veeva-promomats/) | 内容制作、资产库、医学法务监管审核、证据断言、渠道分发；支持开放接口集成 | 证据→断言→素材→审批→分发按版本绑定 | A |
| D2→D3 | [Claims Management](https://www.veeva.com/products/veeva-promomats/claims-management/) | Claims Library、引用资料关联、自动匹配（Auto Linking）、审批后的 Harvesting、Claims Agent | **已有自动 Claim 对齐，不能当独家创新**；要做断言失效/撤回传播的运行时硬门 | A |
| D2→D3 | [MLR Review](https://www.veeva.com/products/veeva-promomats/mlr-review/) | 面向医药行业的审查流程、批注、证据引用、合规材料审查；适用地域差异待核 | 正式人审与 Agent 自动预检分离；重提时锁版本 | A |
| D2→D3 | [Content Strategy](https://www.veeva.com/products/veeva-promomats/content-strategy/) | 模块化内容和 Communication Objective，营销目标绑定已批准内容并从 CRM 回收使用情况 | Campaign 战略目标应关联到每份素材与使用数据 | A |
| D2→D3 | [Commercial Content Kernel](https://www.veeva.com/products/veeva-promomats/commercial-content-kernel/) | 已公开行业内容分类/层级/描述标准；官方称来自 475+ PromoMats 配置分析 | 可研究分类思想和公开规范；使用或改编前核对具体许可，不默认可复制源码 | A |
| D1→D2 | [AI for PromoMats](https://www.veeva.com/products/ai-for-promomats/) | 文档质量检查、Claims 库构建、个性化 Agent、Falcon MLR 方向 | 内容审核 AI 已有强竞品，聚焦跨环节回执与阻断正确性 | A |
| D1→D2 | [Marketing Analytics / Crossix](https://www.veeva.com/products/marketing-analytics/) | 广告、细分与效果测量方案；数据覆盖具有地域/产品约束 | 首版只做可解释事件指标，不能假设拥有美国式患者层归因数据 | A；中国适配 U |

**产品之间如何连接（官方文本复原，非实际账号实测）**：

`客户/机构主数据 → Campaign Manager 分群与多动作任务 → PromoMats 获批内容/MLR → Approved Email / Events / CRM 等授权渠道 → CRM 中的互动指标 → Campaign 分析与下轮调优`。

其中：Campaign Manager 的“跨数字、现场与活动”能力为**公开产品规划/支持方向**，不能推定所有渠道已全面上线。Veeva 自称是“一体化的生命科学营销应用”，报告今后不得再写“Veeva 只有审批、没有营销编排”。

**重要更新**：Veeva 的 Content Kernel 和 Communication Objective 意味着已有内容分类标准、素材/目标关联及 CRM 数据回流。MVP 需要把 `communication_objective_id`、`claim_ref`、`approved_asset_version`、`usage_event` 绑定到 Campaign，而不能只做一个内容编辑器。

## A3. 第三参照：Adobe 营销战役引擎的可执行语义

参照 [Adobe Journey Optimizer Orchestrated Campaigns](https://experienceleague.adobe.com/en/docs/journey-optimizer/using/campaigns/orchestrated-campaigns/launch/launch-landing-page) 官方使用文档，跟进：[创建与排期](https://experienceleague.adobe.com/en/docs/journey-optimizer/using/campaigns/orchestrated-campaigns/launch/create-orchestrated-campaign)、[编排流程](https://experienceleague.adobe.com/en/docs/journey-optimizer/using/campaigns/orchestrated-campaigns/launch/gs-campaign-creation)、[开始与监控](https://experienceleague.adobe.com/en/docs/journey-optimizer/using/campaigns/orchestrated-campaigns/launch/start-monitor-campaigns)、[报告](https://experienceleague.adobe.com/en/docs/journey-optimizer/using/campaigns/orchestrated-campaigns/launch/reporting-campaigns)、[FAQ](https://experienceleague.adobe.com/en/docs/journey-optimizer/using/campaigns/orchestrated-campaigns/orchestrated-campaigns-faq)。

- 明确区分“一次性活动”与“多步骤编排战役”，包含排期、活动配置、发布、监控、报表。
- 发布动作会触发排期，先运行保存人群活动，再执行渠道动作；发布时取人群快照的机制有助于保证批量一致性。
- 官方 FAQ 明确 Consent 与发布快照相关的行为；我们的医药场景要求**发布前 + 实际发送前**均复核受众授权、素材批准状态、版本与当地法律政策，禁用“审批时合法，发送时已经过期仍放行”的漏洞。
- 医药专业监管、Claim 证据和 MLR 属于需要额外补全的行业层；不能直接把通用营销战役系统视为合规即用。

## A4. 对比信达命题的能力覆盖图（只基于官网确认程度）

标记：`强` 官网有专门产品/功能页；`覆盖` 产品族具备关联能力；`待核` 缺少直接、可复核证明。不是系统质量分数，也不代表实际同一租户已联通。

| 战役能力 | IQVIA | Veeva | Adobe 通用参考 | 对我们 PRD 的更新 |
|---|---|---|---|---|
| 情报/市场信号 | 强：Global Market Insights Agent | 覆盖：商业证据/分析 | 覆盖：数据输入 | Signal 必须带来源、时间、许可 |
| 医学文献研究 | 强：Literature Review Agent | 覆盖：医学产品族、Claims | 待核 | Evidence/Claim 的版本、出处、撤回 |
| 受众主数据 | 强：OneKey | 强：OpenData/Network | 强：受众数据模型 | 授权对象独立于投放名单 |
| 策略生成/测试 | 强：Commercial Planner Agent | 覆盖：Campaign + AI | 覆盖：活动规划 | 三策略 = 受同一约束可比较的方案集 |
| 多角度反方评审 | 待核：可配置智能体不等于该明确机制 | 待核 | 待核 | 保留五位独立反方，但不能宣称绝对首创 |
| 多动作编排 | 覆盖：OCE / Next Best | 强：Campaign Manager | 强：Campaign Orchestration | 一张统一泳道图 + 状态机 + 任务门禁 |
| 内容策略与资产 | 待核其具体客户组合 | 强：PromoMats Content Strategy | 覆盖 | 战略目标必须关联获批内容版本 |
| 医学/法务/监管审批 | 覆盖：商业合规服务待核具体联通 | 强：PromoMats MLR + AI | 待核医药行业适配 | 人工审批、审批失效与重审不可绕过 |
| 授权渠道执行 | 覆盖：Next Best / OCE | 强：Approved Email / Events / CRM | 强：通用渠道 | P0 至少一个可核查内部/沙盒执行通路 |
| 互动结果/复盘 | 强：Next Best 指标/实验 | 强：CRM + Crossix（地域依赖） | 强：报告 | 真实与模拟结果强制分隔、避免伪归因 |
| 统一业务身份与回执 | 需按客户实施核查 | 强：CRM 中共享数据与指标 | 强：发布执行语义 | Campaign ID、Receipt、Grant、精确版本必须可追溯 |

## A5. 本轮对原判断的直接修正

1. **收回“竞品只到单点智能体”的暗示。** IQVIA 已公布规划、情报、医学文献等多个专属 Agent；Veeva CRM + Campaign Manager + PromoMats + Approved Email + Events + Analytics 构成成熟商业工作流。现有方案的“全链路”覆盖需要以运行时实测差异证明。
2. **三套策略是产品交互方法，五位反方是审查机制。** 反方记录应包含 `evidence_gap / falsification_test / severity / dissent / flip_condition / owner_disposition`，每个反方针对三案独立给出裁决，不代替医学法规的正式审批。
3. **将“谁执行、何时可执行”升为一等产品概念。** 所有渠道任务携带受众授权、适应症、地区、内容精确版本、审批效期、撤回状态、执行回执和重试幂等键。
4. **内容目标与内容证据必须双向关联。** 每条 Campaign 策略、Communication Objective、Claim、Asset、Approval、Channel、Event 对齐，才能追踪哪个策略采用了哪些论据、影响了哪些业务动作。
5. **低估“学术活动”这一营销执行渠道。** Veeva Events Management 已有预算、参会者、讲者、费用、审批、参与后追踪；中国演示场景可优先选择经审核的内部专业活动模拟，实际合法性由企业医学法规部门决定。
6. **暂不以“自动预测销售增长”作为验收。** 没有授权交易、医生或处方数据，MVP 的效果指标是准备时长、审核周转、内容复用、授权触达回执率、异常止损及可追溯率。
7. **网页公开可看 ≠ 数据/功能可免费使用。** OneKey、Veeva OpenData、Crossix 和商业版 API 都是商业数据及服务，须独立采购与合规授权；Veeva 公开 Content Kernel 的具体内容许可尚须核对。

## A6. 对 Pharma Campaign OS PRD 的最小增量建议（本次只更新竞品报告）

| 优先级 | PRD 增量 | 最小验收证据 | 借鉴来源 |
|---|---|---|---|
| P0 | 全局 Campaign ID + 跨部门工作流状态机 | 一条战役跨所有工作台 ID 不变；拒绝非法状态跳转 | Veeva Campaign Manager |
| P0 | StrategySet 三套独立策略 + 5×3 反方记录 | 三套策略使用同一证据和预算；15 份意见与异议可读回 | IQVIA Planner Agent 对标后强化 |
| P0 | Communication Objective → Claim → Asset → Approval 血缘 | 策略目标到已批准素材可追溯；修改素材自动要求再审 | Veeva Content Strategy / Claims |
| P0 | 发布前与发送前双重合规门 | 审批过期、撤权、名单错误、地区错误均阻断执行 | PromoMats / Adobe 发送语义 |
| P0 | 独立真实/沙盒执行回执与数据血缘 | 回执含环境、渠道、版本、外部状态和失败原因 | Veeva Approved Email / Adobe |
| P0 | 真实事件驱动战役复盘 | 执行结果回流形成下一轮方案修订，保留人类 Owner 选择 | IQVIA Next Best / Adobe 报告 |
| P1 | 学术活动战役模板及预算/参与管理 | 计划、邀请、签到、预算、费用与反馈归档 | Veeva Events Management |
| P1 | 受许可的 HCP 主数据与细分 | 同意/许可/有效期和来源记录齐全 | IQVIA OneKey / Veeva Data |
| P1 | 内容分类字典和复用度看板 | 分类版本、已批片段重用记录、使用指标 | Veeva Commercial Content Kernel |
| HOLD | 真实跨区域处方药自动投放、处方级归因 | 无企业授权和法规证明时保持禁用 | 中国监管红线 |

**开发顺序建议**：先完整的业务对象/状态/权限，再在策略台加入三套策略及反方评审，随后实现证据与素材审批，最后接一条受控渠道、回执和复盘。外部开源 Dittofeed、Activepieces 等只在现有营销仓和 AWKN 接口无法满足差异时试配，避免重复引擎。自有 `AWKN-Lab/marketing` 可供营销任务、资料、反馈、学习等资产吸收，**其已有 PRD 明确排除 Campaign Automation**；战役引擎仍需本项目承担。

## A7. 官网追踪索引与后续采购访谈问题

### IQVIA 官网主题深度路径

1. D0 官网：https://www.iqvia.com/
2. D1 商业化：https://www.iqvia.com/solutions/commercialization
3. D2 Commercial Agentic AI：https://www.iqvia.com/solutions/commercialization/iqvia-commercial-agentic-ai
4. D3 Commercial Planner、Literature Review、Global Market Insights、Field Force、Data Catalogue：均在上条“Agent Families”模块中公开描述；独立演示/部署形态待核。
5. D2 Next Best Action：https://www.iqvia.com/solutions/commercialization/commercial-analytics/orchestrated-analytics/next-best
6. D2 OneKey：https://www.iqvia.com/solutions/commercialization/data-and-information-management/onekey
7. D2 旧 OCE Digital 演示入口（无法核全文）：https://secure.constellation.iqvia.com/DemoOCEDigital

### Veeva 官网主题深度路径

1. D0 官网：https://www.veeva.com/
2. D1 CRM Suite：https://www.veeva.com/products/crm-suite/
3. D2 Campaign Manager：https://www.veeva.com/products/crm-suite/campaign-manager/
4. D2 Approved Email：https://www.veeva.com/products/crm-suite/approved-email/
5. D2 Events Management：https://www.veeva.com/products/crm-suite/events-management/
6. D1 PromoMats：https://www.veeva.com/products/veeva-promomats/
7. D2 MLR：https://www.veeva.com/products/veeva-promomats/mlr-review/
8. D2 Claims：https://www.veeva.com/products/veeva-promomats/claims-management/
9. D2 Content Strategy：https://www.veeva.com/products/veeva-promomats/content-strategy/
10. D2 Commercial Content Kernel：https://www.veeva.com/products/veeva-promomats/commercial-content-kernel/
11. D2 AI for PromoMats：https://www.veeva.com/products/ai-for-promomats/
12. D2 Crossix / Marketing Analytics：https://www.veeva.com/products/marketing-analytics/

### 需直接向供应商核实的 8 个问题

1. 中国地区 Campaign Manager / Next Best / Agent 产品正式可用的 SKU、部署区域和签约约束？
2. 同一企业租户可以怎样联通营销计划、MLR、已批准内容、渠道执行与实时回执？
3. 人工审核后若素材已失效/撤回，跨所有已排期渠道如何传播停止信号？
4. 支持哪些中国合规专业传播或学术活动渠道？每个渠道需要哪些授权证据？
5. 数据驻留、处理协议、撤销授权与删除、身份匹配及审计导出如何解决？
6. 能否对同一战役测试三套候选策略，保留反方意见与失败假设，而非只返回建议？
7. 如何处理发布时快照与发送时权限、受众、审批有效性发生变化的冲突？
8. 试点所需连接器和第三方数据是否额外收费？演示中的功能是否属于订阅实际包含项？

**最终 V2 裁决**：继续选择完整的 Pharma Campaign OS 纵向 MVP。产品取胜假设收敛为 **“有证据、有人类签字、可合法下发、能停止与恢复、能用同一战役版本重演”**。需要一场从发现信号到真实内部回执的端到端验收来证明；竞争者覆盖多处既有能力，不能以“首创”宣传未经验证的差异。

---

# B. 客户之声：IQVIA / Veeva / Adobe 实际用户评价（2026-10-11 增量）

> 本节只使用公开的评价平台和专业社区发言，独立于厂商功能描述。产品评论属于主观体验；岗位、版本、实施质量和地区会显著改变结论。未经信达生物或目标客户访谈验证的结论一律标记为“需求假设”。调查范围：G2、Gartner Peer Insights、Capterra、TrustRadius、Reddit。资料截止 2026-10-11。

## B1. 评分与样本量（快照）

| 被评价的精确产品 | 平台 | 展示评分 | 页面展示样本 | 解释限制 |
|---|---|---:|---:|---|
| Veeva Vault PromoMats | G2 | 4.4/5 | 18 条 | 部分评论集中在 2022—2023 年；样本规模小。 |
| Veeva Vault PromoMats | Gartner Peer Insights | 4.1/5 | 37 个 ratings | 排名口径与 G2 不同；部分完整评论需登录。 |
| Veeva Vault（产品家族层） | G2 | 4.1/5 | 54 条 | 混合质量、临床和商业用例，不能外推至 PromoMats 或 CRM。 |
| Veeva Vault（产品家族层） | Capterra | 4.4/5 | 28 条 | 评价人群跨度大；部分激励评价，注意筛选岗位。 |
| Veeva CRM | Gartner Peer Insights | 4.4/5 | 28 个 ratings | 不等于新产品 Vault CRM 或 Campaign Manager 的独立评价。 |
| IQVIA OCE | Gartner Peer Insights | 4.8/5 | 4 个 ratings | **样本太少，无法据此认定满意度优于 Veeva**。 |
| IQVIA（公司/产品集合） | G2 | 4.3/5 | 14 条 | 产品混合；**不可代替 IQVIA Next Best 或 Commercial Planner Agent 的评价**。 |
| Adobe Journey Optimizer | G2 | 4.2/5 | 约 188 条 | 展示数量会更新；行业跨度大，无法直接推导药企使用评价。 |

查看入口：
- G2 PromoMats: https://www.g2.com/products/veeva-vault-promomats/reviews
- Gartner PromoMats: https://www.gartner.com/reviews/product/veeva-vault-promomats
- G2 Vault: https://www.g2.com/products/veeva-vault/reviews
- Capterra Vault: https://www.capterra.com/p/173465/Veeva-Vault/reviews/
- Gartner Veeva CRM: https://www.gartner.com/reviews/product/veeva-crm
- Gartner IQVIA OCE: https://www.gartner.com/reviews/product/iqvia-orchestrated-customer-engagement-oce
- G2 IQVIA: https://www.g2.com/products/iqvia/reviews
- G2 Adobe: https://www.g2.com/products/adobe-journey-optimizer/reviews

## B2. Veeva：具体用户体验与可验证的痛点

| 主题 | 已观察到的独立用户反馈 | 对我们造成的产品约束 | 证据强度 |
|---|---|---|---|
| 合规协作优势 | PromoMats 用户认可审阅意见集中管理、版本比较、审查留痕、批准后跨渠道素材复用；2025 年 Capterra 药企经理亦认可审计记录和流程配置。 | **不得牺牲审批可信度换取操作速度**。自有系统必须具备不可变审批快照与回执。 | 中：多平台、多岗位正向反馈。 |
| 局部修改引发返工 | G2 PromoMats 2022-01-26 一位企业咨询顾问称，材料修订后流程会要求已批准的审批人重新审批。 | 设计“变更影响报告”：解释哪些断言、素材块、地区、渠道发生变化，提出最小重审范围；是否可局部免重审由药企规则授权，系统不能自行豁免。 | 中低：明确案例，版本较旧。 |
| 医学引用迁移负担 | G2 Vault 2022-02-12 一位医疗行业营销用户反映，安全性标签更新后整套材料的引用标注重做/复核成本高，迁移旧标注有失效风险。 | 证据定位须锚定 `source_version/page/span/hash`；说明书更新后触发引用失效审查；不得自动认定沿用的医学声明仍有效。 | 中低：具体案例，尚待当前版本重测。 |
| 搜索与元数据依赖 | Capterra 2025-11-09 药企从业者反映元数据欠佳时检索效果下滑；G2 2026-04-26 另一用户提到报告和检索门槛。 | 首版至少具备全文索引、断言反查、来源与适应症筛选、零结果解释、索引质量提示。 | 中：跨时间多个案例，但产品家族混合。 |
| 流程复杂与培训成本 | G2 Vault 2026-04-19 评论提及点击步骤较多、生命周期约束严格；2023 年评论称多标签页、文件上传步骤繁多。Capterra 2025 年药企评论也提及学习曲线。 | 页面应按“一场战役”的任务交接呈现下一动作、当前阻塞人、阶段差异和退出标准；新人引导优于海量菜单。 | 中：多来源反馈。 |
| 系统提醒噪声 | G2 Vault 2026-04-26 用户抱怨任务/逾期通知容易淹没重要信息。 | 将通知收敛为三类：需要我批准、执行失败、审批/证据即将失效；默认按战役聚合。 | 中低：案例明确但未验证普遍性。 |
| 成本和配置依赖 | Capterra 2022 年评价指出企业初期采购成本高；2025 年药企人士指出缺少配置资源会降低可用性。 | MVP 应支持按模板快速启动并保留人工配置入口；不要宣传低成本优势，先测部署成本和实施人天。 | 中低：定性评价，**没有可核实的报价差额**。 |

特别注意：Veeva Vault 中临床运营或质量管理的评论，只用于启发通用体验，不作为营销战役专项产品缺陷的直接证据。早期版本投诉需要实测当前版本。

## B3. IQVIA：高评价、低样本、服务体验分化

| 公开评价 | 解释 | 产品设计影响 | 置信度 |
|---|---|---|---|
| Gartner OCE 4.8/5，但仅四个评分；2026-06-15 一位医疗行业用户称跟踪效率好、初始配置培训复杂。 | 产品好评存在；实施学习门槛值得关注。不能用单篇标题证明其所有客户部署都复杂。 | 使用可解释工作流、实例模板、清晰的任务状态。 | 低：样本极少。 |
| Gartner IQVIA 厂商评价页，2026-09-10 一条正面意见认可多机构 HCP 信息集中、自动互动记录、与其他工具集成及移动离线使用。 | 医药专业人员主数据与合规记录是成熟买点；不要把“统一客户资料”宣传成空白市场。 | 记录 HCP/HCO 数据来源、合法授权和审计链；本地演示只用合成数据。 | 低：单条意见且产品版本待确认。 |
| Gartner IQVIA 评价页有 2023-03-22 对服务缺乏业务理解、响应迟缓的负面评价。 | 这是供应商交付/支持体验反馈，不能直接推导 OCE 的软件功能缺陷。 | 产品增加可自助的流程诊断、配置健康检查、错误定位；建立实施服务 SLA 假设。 | 低：单条且较早。 |

目前**没有找到足量可直接归属于 IQVIA Next Best Action、Commercial Planner Agent 的独立真实用户评价**。这两个产品保持 `REVIEW_COVERAGE=INSUFFICIENT`；需安排药企使用者访谈，避免把 OCE 反馈扩大至整个产品族。

原始入口：
- https://www.gartner.com/reviews/product/iqvia-orchestrated-customer-engagement-oce
- https://www.gartner.com/reviews/market/crm-in-life-sciences/vendor/iqvia

## B4. Adobe Journey Optimizer：较大样本的横向参考

G2 当前页面展示约 188 条评价，整体 4.2/5。用户赞同跨渠道旅程、实时触发与个性化能力，也反复提到学习曲线、初始数据准备、配置时间、旅程编辑困难及报表界面的易用性。G2 的“77 次学习曲线相关提及”来自其自动分类摘要，**不能视为独立用户人数或正式调查比例**。

具体例证：2026-04-21 一位用户表示修改复杂旅程时重建成本较高；2025-09-12 用户称跨渠道编排方便，但学习、技术配置和报表洞察较困难。部分评价标记为激励来源，存在选择偏差。Adobe 是通用营销平台，只作为交互和系统工程对照。

原始入口：
- https://www.g2.com/products/adobe-journey-optimizer/reviews
- https://www.g2.com/products/adobe-journey-optimizer/reviews?page=7&qs=pros-and-cons

## B5. 社区非正式声音

Reddit 的 r/pharmaindustry 2021-09 讨论中，一位参与者提及旧 Zinc 的整包参考文献导入/导出体验，并希望 PromoMats 继承；另一位参与者提醒市场上同一“Veeva”称谓经常混用不同产品。

这两点仅是历史个人反馈，适合用于制定访谈问题：`参考资料能否打包迁移？`、`用户是否知道任务到底落在哪个系统？`。**不可直接当成 2026 年产品缺陷**。本轮尚未获取足量近期 Reddit 讨论来独立印证上述主题。

来源：https://www.reddit.com/r/pharmaindustry/comments/pm64h3

## B6. 客户声音转成 MVP 具体需求

| 优先级 | 用户痛点 | PRD / 交互增量 | 验收用例 |
|---|---|---|---|
| P0 | 跨部门审批返工 | `ChangeImpact` 差异报告；修改后自动失效受影响的批准范围。 | 改变关键医学声称后旧发布资格立即失效；保留未修改审批历史，不自动豁免。 |
| P0 | 医学引用失效 | `Claim → EvidenceVersion → AssetVersion` 链路，说明书变更生成待复核任务。 | 替换源证据版本后能找出所有受影响内容；未经复核无法执行。 |
| P0 | 操作步骤复杂 | 统一 Campaign 页面展示“下一步、阻塞者、为何阻塞、可执行动作”，不强迫用户跨应用寻找工作。 | 新用户在测试脚本中能从战役信号走到人审请求且不丢上下文。 |
| P0 | 渠道任务状态不透明 | 统一执行状态与环境标签：真实/沙盒、排队/执行/成功/失败/撤回。 | 注入发送超时后，无重复发送，页面显示失败原因与同幂等键安全重试。 |
| P0 | 审批资料查找慢 | 简单检索 + 来源定位 + 已批片段复用。 | 给定具体声称，能在 UI 跳转到原始文件版本及对应文本；空结果明确说明。 |
| P1 | 提醒疲劳 | 按战役聚合的待办与例外通知。 | 10 条同类执行日志聚合展示，审批超时与失效单独置顶。 |
| P1 | 学习成本和配置开销 | 一键载入“一款产品、一项适应症、一场学术教育战役”模板。 | 初始配置、错误恢复和新手完成时间录入基线；不虚构“节省百分比”。 |
| P1 | 旅程修改重建 | 战役流程版本 diff、克隆实验、发布回退。 | 修改单一阶段时，不复制无关任务与素材；未批版本无法进入外部发送。 |

### 建议补做的定性访谈（每岗至少两人作为探索目标，非统计代表性样本）

| 岗位 | 关键提问 | 观察指标 |
|---|---|---|
| 药企品牌经理 | 一场战役在哪些系统来回切换？最耗时的交接点？ | 系统切换次数、待办等待时间 |
| 医学审查员 | 一处 Claim 更改导致多少材料重审？ | 重审范围、重复标注数 |
| 法规/法务审核员 | 哪类内容和渠道必须退回？ | 驳回分类、法律依据与时间 |
| 商业运营 / 代表支持 | 谁能确认计划已真正执行？ | 外部回执可得率、失败恢复时长 |
| 营销分析 | 数据怎样归因？哪些 KPI 无法信任？ | 数据来源覆盖率、口径冲突数 |

## B7. 裁决与证据纪律

1. **已较有依据的购买价值**：可审计的内容治理、跨团队版本协作、客户/渠道记录整合；这些是成熟竞品的优势，我们必须达到可信下限。
2. **较有价值的改善机会**：减少重复审批和引用重标、提升搜索可定位性、降低战役执行和新用户入门的步骤数；仍需实际用户实验验证。
3. **保持未知**：IQVIA Planner / Next Best 的真实用户满意度、Veeva Campaign Manager 独立满意度、中国客户的法定合规流程偏好、性能与价格成本差异。
4. **反方挑战**：如果 2026 版竞品已解决历史重审批与引用问题，则我们应立即撤回“痛点独占”的表述，并把目标调整为同题任务的耗时与准确性对比。
5. **下一轮验证**：使用同一套盲测任务比较“新增战役 → 查证 → 三案决策 → 变更医学证据 → 重新审批 → 沙盒执行 → 回执复盘”，采集实际步骤数、时间、错误数和重新审批比例，全部绑定任务记录。

**研究状态**：公开评价检索已完成；未开展真实用户访谈、真实竞品账户试用或统一任务对照实验。公开星级只作背景信号，不能作为项目的核心差异化证据。