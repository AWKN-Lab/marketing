# C11｜需求雷达组件工程文档

> 状态：PROPOSED / NO_CODE_CHANGE  
> 上位：PRD-AUTONOMOUS-REVENUE.md；现有 S2 / Learning Watch 复用  
> 组件 Owner：Marketing Product；工具权限最终 Owner：AWKN Platform

## M01 原始需求源注册
目标：采集可用于商业研究的需求原文，保留来源及访问许可。
输入：workspaceId、sourceUrl/provider、sourcePolicyRef、market、accessMethod、timeRange。
输出：SourceRegistration {sourceId, provider, sourceUrl, policyRef, permissiblePurposes, checkedAt, status}。
约束：官方 API、RSS、用户提交、具备许可的公开入口优先。未经允许的爬虫、绕登录/验证码、禁止用途的联系方式抓取均拒绝；来源规则发生变化时暂停。
测试：合法 API 成功、规则失效 HOLD、过期信号、封禁数据源、无溯源拒绝。

## M02 证据采集与去重
目标：用现有 Material、Workspace、Task 保存需求证据，避免任务重复。
建议仅在未来新增业务数据契约后持久化：
~~~ts
type DemandEvidence = {
  id: string; workspaceId: string; sourceId: string;
  sourceUrl: string; providerRecordId?: string; capturedAt: string;
  publishedAt?: string; expiresAt?: string; contentHash: string;
  accessBasis: string; claimRefs: string[];
  status: "candidate" | "verified" | "stale" | "rejected";
}
~~~
幂等键：providerRecordId 优先；否则 sourceUrl + contentHash + scope。人工快照只证明当时页面存在，不能证明需求仍有效。
测试：重复采集仅一逻辑记录；修改原文产生新版本；失效后不继续外发。

## M03 商业适配判断
输入：DemandEvidence、可用 Skill、已验证交付清单、客户明确预算和时间（若可得）。
输出：可交付性、响应窗口、客户痛点引用、报价所需缺口、合规等级、建议服务与 UNKNOWN。
评分与理由同时显示；来源事实与推断分栏；预算缺失不得凭空补写。
测试：无预算/匿名/需求已过期进入人工核对，反例不得输出“高确定成交”。

## M04 人工决策和业务输出
输出：OpportunityCard {demandEvidenceId, suggestedOffer, why, priceEvidenceRefs, restrictions, decision, decisionBy, decisionAt}。
决策状态 candidate → reviewed → approved_for_draft / rejected / expired。仅批准草拟提案；未获单独外联授权仍不得发送。
复用 Task → Artifact/Evidence → Feedback → Outcome → Experience Candidate。

## M05 测量与失败恢复
记录有效需求率、证据完整率、过期率、可交付率、研究耗时、成本及受限源拒绝率。
测试用例：撤权、重复事件、错误来源、刷新超时、跨 Tenant 泄漏、供应商条款改变、来源删除与可追溯性。
所有错误返回 trace_id，UNKNOWN 数据不能提升为 VERIFIED。没有真实采集与人工核验记录时保持 NOT_RUN。

## 实现候选位置（不得视为已实现）
现有：lib/material-store.ts、lib/learning-store.ts、lib/task-store.ts、lib/ports.ts 与相关 UI。新的领域数据仅在真实服务端持久化契约获批后引入，不以浏览器 localStorage 保存商业权威数据。
验收门：合法来源、10 条来源证据样本、去重和过期负向测试、审批状态准确、撤权泄漏 0、Exact SHA。