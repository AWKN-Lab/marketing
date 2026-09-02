"use client";

import type { MarketingTask } from "@/lib/types";
import { AppliedExperience } from "@/components/applied-experience";
import { ArtifactWorkspace } from "@/components/artifact-workspace";
import { EvidenceDrawer } from "@/components/evidence-drawer";

export function TaskWorkbench({ task }: { task: MarketingTask }) {
  return (
    <main className="task-page">
      <header className="task-header">
        <div><p className="eyebrow">{task.workspaceName} / {task.type}</p><h1>{task.title}</h1><p className="muted">目标：{task.goal}</p></div>
        <div className="row gap-sm"><EvidenceDrawer/><button className="button primary">继续运行</button></div>
      </header>
      <div className="task-grid">
        <section className="conversation-panel">
          <div className="conversation-scroll">
            <div className="message user">{task.userPrompt}</div>
            <AppliedExperience items={task.appliedExperiences} />
            <div className="message assistant"><strong>任务判断</strong><p>{task.judgment}</p><div className="tool-run"><span className="pulse"/> 已完成资料检索、历史经验匹配与证据校验</div></div>
          </div>
          <div className="composer"><textarea aria-label="Task composer" placeholder="继续补充要求，或直接修改右侧产出物…"/><button type="button" className="send-button">↑</button></div>
        </section>
        <ArtifactWorkspace taskId={task.id} title={task.artifact.title} aiDraft={task.artifact.aiDraft} initialFinal={task.artifact.userFinal} />
      </div>
    </main>
  );
}
