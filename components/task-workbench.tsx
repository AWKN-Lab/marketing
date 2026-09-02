"use client";

import { useState } from "react";
import type { MarketingTask } from "@/lib/types";
import { EvidenceDrawer } from "@/components/evidence-drawer";

export function TaskWorkbench({ task }: { task: MarketingTask }) {
  const [draft, setDraft] = useState(task.artifact.aiDraft);
  const [finalText, setFinalText] = useState(task.artifact.userFinal);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  return <main className="task-page">
    <header className="task-header"><div><p className="eyebrow">{task.workspaceName} / {task.type}</p><h1>{task.title}</h1><p className="muted">目标：{task.goal}</p></div><div className="row gap-sm"><EvidenceDrawer/><button className="button primary">继续运行</button></div></header>
    <div className="task-grid">
      <section className="conversation-panel">
        <div className="conversation-scroll">
          <div className="message user">{task.userPrompt}</div>
          <div className="applied-box"><p className="eyebrow">APPLIED EXPERIENCE</p><strong>本次已应用 2 条历史经验</strong>{task.appliedExperiences.map(x => <div className="experience-line" key={x.lesson}><span>↗</span><div><b>{x.lesson}</b><small>{x.source}</small></div></div>)}</div>
          <div className="message assistant"><strong>任务判断</strong><p>{task.judgment}</p><div className="tool-run"><span className="pulse"/> 已完成资料检索、历史经验匹配与证据校验</div></div>
        </div>
        <div className="composer"><textarea placeholder="继续补充要求，或直接修改右侧产出物…"/><button className="send-button">↑</button></div>
      </section>

      <section className="artifact-panel">
        <div className="artifact-toolbar"><div><p className="eyebrow">ARTIFACT</p><strong>{task.artifact.title}</strong></div><div className="tabs"><button className="tab active">编辑</button><button className="tab">版本</button><button className="tab">Diff</button></div></div>
        <div className="artifact-meta"><span>AI Initial → User Final</span><span>自动保存</span></div>
        <textarea className="artifact-editor" value={finalText} onChange={(e) => setFinalText(e.target.value)} />
        <div className="learning-strip"><div><p className="eyebrow">FEEDBACK</p><strong>这份结果怎么处理？</strong></div><div className="row gap-sm">{["采用","部分采用","需要修改","放弃"].map(x => <button key={x} className={`chip ${feedback===x?"selected":""}`} onClick={() => setFeedback(x)}>{x}</button>)}</div></div>
        {feedback && <div className="outcome-box"><div><p className="eyebrow">OUTCOME</p><strong>记录真实结果，系统才知道这次方法有没有价值。</strong></div><div className="row wrap gap-sm">{["项目推进","获得反馈","方案采用","暂时搁置","失败"].map(x => <button className={`chip ${outcome===x?"selected":""}`} key={x} onClick={() => setOutcome(x)}>{x}</button>)}</div>{outcome && <div className="candidate-preview"><span className="status-ok">可生成 Experience Candidate</span><p>将 AI 初稿、用户最终稿、反馈和真实结果一起送入任务复盘。</p></div>}</div>}
      </section>
    </div>
  </main>;
}
