# C12｜获客转化与自助交付组件工程文档

> 状态：PROPOSED / NO_CODE_CHANGE  
> 上位：V2 PRD；现有 S3 策略判断、S4 方案生产、Task / Artifact 复用  
> 组件 Owner：Marketing Product；支付、邮件与授权 Owner 依所选供应商/AWKN 平台分配

## M01 产品/报价定义
输入：已核实痛点、准入客户、交付边界、估算劳动量、价格依据、退款说明。
输出：OfferSpec {offerId, targetSegment, deliverable, exclusions, priceCurrency, quotedPrice, taxesTreatment, fulfillmentSLA, refundPolicy, evidenceRefs, revision}。
交付示例：采购意向简报、行业报价诊断、授权商户评论回复草稿、自助网站诊断。不得虚构客户证言、收益案例和 SEO 保证排名。
价格先经有经验人员审定，报价有效期、币种和合同条件完整。

## M02 差异化提案
复用 S2/C11 证据和 S3/S4；产出有事实引用的提案、样例报告、演示页草稿。
输入：workspaceId、offerId、demandEvidenceId?、identityStatus、reviewer。
输出：Artifact draft + assumptions + priceEvidence + revision + forbiddenClaims。
每份对外稿必须标注 AI 生成并经过必要事实校验；无权使用客户标识和他人素材时用中性演示。
测试：引用失效、无法提供服务、报价超预算、非法索赔、错误客户身份应阻断发送。

## M03 主动触达控制
路径：draft → compliance_review → approved_once → provider_send_pending → provider_confirmed / failed / suppressed。
Consent 或其他合法联系依据、渠道政策、目标法域规则、联系频率、拒收名单、明确真实发件人、取消订阅/停止联系机制全部作为前置条件。
冷启动一人一审、一条一发；不得自动群发/绕平台私信规则/伪装私人联系。没有官方许可的连接器只生成草稿。
逻辑一次发送固定 idempotencyKey；超时必须先向渠道查询结果，禁止盲重发；停止联系即写 suppression。
审计：approverActorId、channel、recipientScope、policyVersion、sendReceiptId、traceId，敏感原文走授权受控库。

## M04 自助成交
路径：approved_offer → public_product_page → checkout_session(provider) → webhook_signature_verified → paid_order → delivery。
支付、订单、退款、订阅真实性由服务商事件和账务记录决定；浏览器“支付成功”页、模型文字、模拟订单均无权升级 paid。
待未来单独批准的 Proposal：CommercePort {createCheckout, verifyPaymentEvent, getOrder, recordRefund}。
当前 lib/product-contract.ts 的 19 operations 未包含以上动作，P6 不可直接调用。支付密钥只能在服务器侧；webhook 需防重放与验签。
测试：重复 webhook 只履约一次；伪造付款/退款、金额错配、币种错配、超时、撤权、退款后访问权均有拒绝路径。

## M05 交付和售后
履约：paid → queued → running → delivered / failed → support / refunded。
交付品 Artifacts 绑定 orderId、runId、version、质量评分和下载有效期。涉及专业判断、高风险内容、第三方权利时进人工审核。
失败后原 orderId 下重试；保留证据、通知用户和可回滚产物；不得因交付失败静默吞掉退款义务。
测试：订单未付不得交付付费资产；交付两次不得二次扣款；人工修订和重做成本入账。

## M06 产品体验
沿用现有 Workspace/Task/Artifact/Evidence/Feedback/Outcome 界面语义。自助页面视为后续组件扩展，先复用现有入口；不新增 CRM 管理后台。
验收：用户在明确的服务范围、价格、退款规则下自主下单并取得真实成果；外联零越权、零批量骚扰；无重复支付/履约；独立支付回执可查。

## COPY / ADAPTER / BUILD 裁决
COPY：获批/许可的公开模板和交付结构。
ADAPTER：支付/邮件/网站托管/审批/Agent OS 工具，走官方授权接口。
BUILD：独有 OfferSpec、获客判断与业务归因规则；必须通过新增功能和复用差异审查。