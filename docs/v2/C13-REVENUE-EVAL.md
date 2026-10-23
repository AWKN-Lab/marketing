# C13｜营收真值与商业效果评估组件工程文档

> 状态：PROPOSED / NO_CODE_CHANGE  
> 组件 Owner：Marketing Product；资金真值 Owner：支付/账务提供方  
> 复用：现有 Feedback、Outcome、lib/eval.ts、Reviewed Experience

## M01 商业事件证据
原始证据至少包括：支付提供商 eventId/transactionId、已核实金额/币种、税项、手续费、净结算、退款/拒付、时间、订单与产品 ID、获客来源标记、模型及人工履约成本记录。
类型候选：
~~~ts
type RevenueEvidence = {
  orderId: string; offerId: string; workspaceId: string;
  provider: string; eventId: string; eventType: string;
  amountMinor: number; currency: string;
  verifiedAt: string; sourceRef: string;
  status: "observed" | "verified" | "reversed" | "disputed";
}
~~~
模型判断无权写 paid；服务商账务凭据与银行清算凭据区分，两者到账周期可能不同。不得在公开 Git 仓库存储真实客户付款信息。

## M02 单位经济
定义并保存每个分母、币种、窗口期、来源：
- 已确认营收 = 付费订单已确认金额 - 折让 - 退款/拒付（另列税务规则）。
- 单笔贡献利润 = 营收 - 支付/平台费用 - 变动算力 - 可归属营销费用 - 人工履约及售后成本。
- CAC = 指定期间渠道获客成本 / 同期该渠道新增付费客户数；分母为零则 UNKNOWN。
- 购买转化率 = 实付独立客户数 / 归因可识别的合格访问者数；跟踪失效则 UNKNOWN。
- 回款周期 = 已完成销售所对应的清算到账时间 - 销售确认时间，按事件口径分别报告。
- 复购率、退款率、投诉率以订单 ID/客户唯一 ID 去重并披露观察窗口。
固定费用、税收、外汇及资本占用单列；不能只报 GMV 或虚构“被动收入”。

## M03 可证伪归因
最低留存：source/channel、offer、campaignExperimentId、landingView、trial、checkoutStarted、paymentVerified、deliveryAccepted、refund、feedback、outcome。
归因默认描述性；如需宣称增量效果，预注册随机分组或适当对照组、样本标准与观察窗口。避免归因于无法识别的客户追踪。
失败样本、未回复、退款和人力介入须保留。任何无支付事实的业务状态只能标 pending/UNKNOWN。

## M04 进化与策略修正
将低质量需求、客户拒绝理由、提案修改、完成订单、退款和真实结果映射到 Outcome，形成 Experience Candidate。
Candidate 通过既有人工 Evolution Review，评估价格、行业与渠道适用范围，不得根据一次成功自动上升为 Active Skill。

## M05 门禁与负向案例
必要：伪支付事件不得入账；重复 webhook 不重复计数；币种/金额错误阻断；付款回滚和退款可追溯；零成交分母不能计算 CAC；撤权访问=0；更改归因模型时版本化，不回写历史结论。
测试样本：paid 后 chargeback、部分退款、支付通过但履约失败、订单跨 Workspace、开票金额与到账不一致、同渠道自然增长混淆。

## M06 商业门与推广
首单门：第三方支付事件 + 履约接收 + 成本完整度审查。初期达成一单仅构成销售可能性的证据，无法证明可规模化。
增长门：每周期报告访客、合格需求、获批联系数、回复数、付费客户、净营收、贡献利润、投诉/退订、人工分钟、失败与未知。正式扩量需要至少两个独立观察窗口的可信结果及风险裁决。

## 接入策略
V2 增加订单与支付 Port 前先评审付款真值源、隐私、币种和权限；现有 lib/eval.ts 不能被强行解释为财务账本。发布门与工程 Exact SHA 单独记录。