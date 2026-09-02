"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MarketingTask } from "@/lib/types";
import { createLocalTask, LOCAL_TASKS_KEY, taskTypes } from "@/lib/task-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function NewTaskButton({ workspaceId, workspaceName, label = "新任务" }: { workspaceId: string; workspaceName: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  const [type, setType] = useState<(typeof taskTypes)[number]>("策略判断");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [prompt, setPrompt] = useState("");

  function createTask() {
    if (!title.trim() || !goal.trim() || !prompt.trim()) return;
    const task = createLocalTask({
      workspaceId,
      workspaceName,
      type,
      title: title.trim(),
      goal: goal.trim(),
      prompt: prompt.trim(),
    });
    setTasks([task, ...tasks]);
    router.push(`/tasks/${task.id}`);
  }

  return <>
    <button className="button primary" onClick={() => setOpen(true)}>{label}</button>
    {open && <div className="modal-layer" onClick={() => setOpen(false)}>
      <section className="task-modal" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head"><div><p className="eyebrow">NEW TASK</p><h2>开始一件真实营销任务</h2><p className="muted small">{workspaceName}</p></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div>
        <div className="stack-md">
          <label className="field"><span>任务类型</span><select value={type} onChange={(event) => setType(event.target.value as (typeof taskTypes)[number])}>{taskTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="field"><span>任务名称</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：重构下一轮汇报策略" /></label>
          <label className="field"><span>希望推动什么结果</span><input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="例如：让下一轮会议进入具体资源与执行讨论" /></label>
          <label className="field"><span>直接告诉助理要做什么</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="把要求、约束、已有判断直接说清楚。" /></label>
          <div className="row gap-sm"><button className="button primary" disabled={!title.trim() || !goal.trim() || !prompt.trim()} onClick={createTask}>创建并进入任务</button><button className="button ghost" onClick={() => setOpen(false)}>取消</button></div>
        </div>
      </section>
    </div>}
  </>;
}
