"use client";

import type { MarketingTask } from "@/lib/types";
import { ArtifactWorkspace } from "@/components/artifact-workspace";
import { EvidenceDrawer } from "@/components/evidence-drawer";
import { TaskConversation } from "@/components/task-conversation";

export function TaskWorkbench({ task }: { task: MarketingTask }) {
  const isLocal = task.id.startsWith("local-task-");
  return <main className="task-page">
    <header className="task-header"><div><p className="eyebrow">{task.workspaceName} / {task.type}{isLocal ? "" : " / DEMO"}</p><h1>{task.title}</h1><p className="muted">目标：{task.goal}</p></div><div className="row gap-sm"><EvidenceDrawer taskId={task.id} scopeId={task.workspaceId} includeDemo={!isLocal}/></div></header>
    <div className="task-grid"><TaskConversation task={task} /><ArtifactWorkspace taskId={task.id} workspaceId={task.workspaceId} taskType={task.type} taskGoal={task.goal} title={task.artifact.title} aiDraft={task.artifact.aiDraft} initialFinal={task.artifact.userFinal} /></div>
  </main>;
}
