import type { EvolutionCandidate, MarketingTask } from "@/lib/types";

export const workspaces = [
  { id:"w-gov", name:"厦门文旅年度营销项目", type:"政企项目", goal:"形成下一轮项目提案并推动进入正式沟通", successCriteria:"确认下一轮汇报时间与决策人", status:"推进中", updatedAt:"12:42", taskCount:12, materialCount:34, experienceCount:7, activeTaskId:"task-001", context:[{title:"当前核心任务",detail:"围绕年度文旅消费场景形成可落地提案。"},{title:"关键判断",detail:"甲方近期更关注可执行结果与资源协同。"},{title:"待确认",detail:"Q4 预算口径和最终汇报参与人仍需确认。"}], materials:[{title:"8月项目沟通纪要.pdf",kind:"PDF",source:"用户上传"},{title:"年度重点工作清单.pptx",kind:"PPT",source:"Workspace"},{title:"文旅促消费政策链接",kind:"Web",source:"公开来源"}], tasks:[{id:"task-001",title:"重构下一轮汇报策略",type:"策略",status:"进行中"},{id:"task-002",title:"准备会前一页 Brief",type:"会前准备",status:"已完成"}] },
  { id:"w-brand", name:"消费品牌新品增长", type:"品牌", goal:"建立新品首发增长策略", successCriteria:"确定首发主张、渠道与验证指标", status:"研究中", updatedAt:"昨天", taskCount:8, materialCount:21, experienceCount:4, activeTaskId:"task-003", context:[], materials:[], tasks:[] },
  { id:"w-hnw", name:"高净值客户长期经营", type:"关系经营", goal:"提升关键关系持续经营质量", successCriteria:"减少重要信息遗忘并提高有效触达", status:"观察中", updatedAt:"周一", taskCount:5, materialCount:16, experienceCount:3, activeTaskId:"task-004", context:[], materials:[], tasks:[] }
];

export const tasks: MarketingTask[] = [
  { id:"task-001", workspaceId:"w-gov", workspaceName:"厦门文旅年度营销项目", type:"策略任务", title:"重构下一轮汇报策略", goal:"让下一轮汇报更快进入可执行讨论", status:"running", userPrompt:"根据前几次沟通和我改过的方案，帮我重构下一轮汇报。不要泛泛讲趋势，先把甲方真正需要解决的事情讲清楚。", judgment:"结合历史修改记录与最近沟通，本轮建议先用具体任务和可交付结果建立共同语言，再进入策略框架。当前最大的未知项是 Q4 预算口径。", appliedExperiences:[{lesson:"政府项目第一页优先进入具体任务与落地结果",source:"Workspace A / Task 17"},{lesson:"单页只保留一个核心判断",source:"Workspace B / Task 09"}], artifact:{title:"下一轮汇报策略框架", aiDraft:"01 背景趋势\n文旅消费正在进入新的增长周期……\n\n02 当前机会\n围绕城市内容、赛事与消费联动……\n\n03 建议方向\n建立全年营销主线……", userFinal:"01 这轮要解决的事情\n把年度重点工作变成可执行、可传播、可验证的文旅消费项目。\n\n02 先抓三个结果\n一、形成一个能被市民感知的年度主动作。\n二、把重点资源接进同一条传播与消费链路。\n三、每个阶段都有可验证的数据结果。\n\n03 下一轮会议只确认三件事\n目标口径、资源边界、首个启动窗口。"} },
  { id:"task-003", workspaceId:"w-brand", workspaceName:"消费品牌新品增长", type:"研究任务", title:"新品人群与场景研究", goal:"找出首发机会", status:"ready", userPrompt:"研究新品机会", judgment:"需要先补充渠道销售数据。", appliedExperiences:[], artifact:{title:"研究摘要",aiDraft:"",userFinal:""} },
  { id:"task-004", workspaceId:"w-hnw", workspaceName:"高净值客户长期经营", type:"关系任务", title:"本周关系经营计划", goal:"确定本周优先动作", status:"ready", userPrompt:"看下本周该处理什么", judgment:"优先处理两条明确承诺。", appliedExperiences:[], artifact:{title:"行动建议",aiDraft:"",userFinal:""} }
];

export const todayItems = [
  { workspace:"厦门文旅年度营销项目", title:"完成下一轮汇报策略", reason:"上次会议已约定本周形成新框架；昨日新增政策信号可能影响提案重点。", level:"high", label:"现在处理", href:"/tasks/task-001" },
  { workspace:"消费品牌新品增长", title:"补齐首发渠道数据", reason:"当前策略判断缺少真实渠道证据，继续生成方案会放大假设。", level:"medium", label:"需补资料", href:"/workspaces/w-brand" },
  { workspace:"高净值客户长期经营", title:"处理两条即将到期的承诺", reason:"两项承诺进入 48 小时窗口。", level:"low", label:"待跟进", href:"/workspaces/w-hnw" }
];

export const signals = [
  { time:"11:20", title:"本地发布新一轮文旅促消费政策", impact:"可能改变项目的资源组合与首发窗口。", source:"公开政策源" },
  { time:"09:45", title:"关键合作方更新年度活动计划", impact:"现有时间线可能需要提前两周。", source:"合作方官网" },
  { time:"08:10", title:"历史方案中出现高频用户修改模式", impact:"连续 3 次删除宏观趋势铺垫，已形成低风险候选。", source:"Task Diff" }
];

export const recentEvolution = { lesson:"政府项目方案优先从具体任务与落地结果进入。", evidence:"来自 3 个相似任务的连续修改；2 次后续任务复用后修改量下降。" };

export const evidence = [
  { type:"会议", title:"8月26日项目沟通纪要", snippet:"下一轮希望直接讨论可以在 Q4 启动的具体动作和资源协同。", source:"Workspace / Meeting", time:"2026-08-26" },
  { type:"Artifact", title:"上一轮汇报最终稿", snippet:"用户删除了前两页趋势描述，将项目任务提前到第一页。", source:"Task 17 / User Final", time:"2026-08-28" },
  { type:"公开来源", title:"文旅促消费政策更新", snippet:"新增夜间消费与赛事联动相关支持方向。", source:"Daily Learning", time:"2026-09-02" }
];

export const candidates: EvolutionCandidate[] = [
  { id:"ev-01", type:"Decision Pattern", lesson:"政府项目方案优先从具体任务与落地结果进入", why:"3 个相似任务出现同向修改，后续 2 次复用均减少用户重写。", source:"Task 11 / 17 / 21", scope:"政企提案 / 汇报", counterexample:"研究型白皮书、行业趋势报告", confidence:0.86 },
  { id:"ev-02", type:"Preference", lesson:"一页只承担一个核心判断", why:"用户在 5 次方案修改中持续拆分复合页面。", source:"Artifact Diff × 5", scope:"汇报型 PPT / 一页纸", counterexample:"附录页、数据总览页", confidence:0.78 }
];

export function getWorkspace(id:string){ return workspaces.find(x=>x.id===id); }
export function getTask(id:string){ return tasks.find(x=>x.id===id); }
