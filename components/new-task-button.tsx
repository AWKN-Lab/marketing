"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MarketingTask } from "@/lib/types";
import {
  EVOLUTION_REVIEWS_KEY,
  LOCAL_CANDIDATES_KEY,
  matchReviewedExperience,
  type LocalEvolutionCandidate,
} from "@/lib/evolution-store";
import { createLocalTask, LOCAL_TASKS_KEY, taskTypes } from "@/lib/task-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function NewTaskButton({ workspaceId, workspaceName, label = "新任务" }: { workspaceId: string; workspaceName: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  const [candidates] = usePersistedState<LocalEvolutionCandidate[]>(LOCAL_CANDIDATES_KEY, []);
  const [reviews] = usePersistedState<Record<string,string>>(EVOLUTION_REVIEWS_KEY, {});
  const [type, setType] = useState<(typeof taskTypes)[number]>("策略判断");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [prompt, setPrompt] = useState("");

  const { experiences: matchedExperiences, counterexamples } = matchReviewedExperience({
    candidates,
    reviews,
    workspaceId,
    taskType: type,
  });

  function createTask() {
    if (!title.trim() || !goal.trim() || !prompt.trim()) return;
    const task = createLocalTask({ workspaceId, workspaceName, type, title: title.trim(), goal: goal.trim(), prompt: prompt.trim() });
    task.appliedExperiences = matchedExperiences;
    if (counterexamples.length) task.judgment = `${task.judgment} 已发现 ${counterexamples.length} 条同类失败反例，执行时需要优先检查。`;
    setTasks([task, ...tasks]);
    router.push(`/tasks/${task.id}`);
  }

  return <>
    <button className="button primary" onClick={() => setOpen(true)}>{label}</button>
    {open && <div className="modal-layer" onClick={() => setOpen(false)}><section className="task-modal" onClick={(event) => event.stopPropagation()}>
      <div className="drawer-head"><div><p className="eyebrow">NEW TASK</p><h2>开始一件真实营销任务</h2><p className="muted small">{workspaceName}</p></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div>
      {matchedExperiences.length > 0 && <div className="matched-experience-preview"><p className="eyebrow">EXPERIENCE MATCH</p><strong>当前任务类型命中 {matchedExperiences.length} 条已确认经验</strong>{matchedExperiences.map((item) => <p key={item.source}>↗ {item.lesson}</p>)}</div>}
      {counterexamples.length > 0 && <div className="counterexample-preview"><p className="eyebrow">COUNTEREXAMPLES</p><strong>发现 {counterexamples.length} 条同类失败反例</strong>{counterexamples.map((item) => <p key={item.id}>! {item.lesson}</p>)}</div>}
      <div className="stack-md"><label className="field"><span>任务类型</span><select value={type} onChange={(event) => setType(event.target.value as (typeof taskTypes)[number])}>{taskTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>任务名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：重构下一轮汇报策略" /></label><label className="field"><span>希望推动什么结果</span><input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="例如：让下一轮会议进入具体资源与执行讨论" /></label><label className="field"><span>直接告诉助理要做什么</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="把要求、约束、已有判断直接说清楚。" /></label><div className="row gap-sm"><button className="button primary" disabled={!title.trim() || !goal.trim() || !prompt.trim()} onClick={createTask}>创建并进入任务</button><button className="button ghost" onClick={() => setOpen(false)}>取消</button></div></div>
    </section></div>}
  </>;
}
