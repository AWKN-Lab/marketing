"use client";

import { useMemo, useState } from "react";
import { FeedbackCapture } from "@/components/feedback-capture";
import { OutcomeCapture } from "@/components/outcome-capture";
import { createExperienceCandidate, LOCAL_CANDIDATES_KEY, type LocalEvolutionCandidate } from "@/lib/evolution-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function ArtifactWorkspace({ taskId, workspaceId, title, aiDraft, initialFinal }: { taskId: string; workspaceId: string; title: string; aiDraft: string; initialFinal: string }) {
  const [mode, setMode] = useState<"edit" | "diff">("edit");
  const [finalText, setFinalText] = usePersistedState(`marketing:${taskId}:artifact`, initialFinal);
  const [feedback, setFeedback] = usePersistedState<string | null>(`marketing:${taskId}:feedback`, null);
  const [outcome, setOutcome] = usePersistedState<string | null>(`marketing:${taskId}:outcome`, null);
  const [candidateCreated, setCandidateCreated] = usePersistedState(`marketing:${taskId}:candidate-created`, false);
  const [localCandidates, setLocalCandidates] = usePersistedState<LocalEvolutionCandidate[]>(LOCAL_CANDIDATES_KEY, []);

  const diffSummary = useMemo(() => {
    const aiLines = aiDraft.split("\n").filter(Boolean);
    const finalLines = finalText.split("\n").filter(Boolean);
    return { removed: aiLines.filter((line) => !finalLines.includes(line)), added: finalLines.filter((line) => !aiLines.includes(line)) };
  }, [aiDraft, finalText]);

  function createCandidate() {
    if (!feedback || !outcome || candidateCreated) return;
    const candidate = createExperienceCandidate({ taskId, workspaceId, artifactTitle: title, feedback, outcome, editCount: diffSummary.removed.length + diffSummary.added.length });
    setLocalCandidates([candidate, ...localCandidates]);
    setCandidateCreated(true);
  }

  return (
    <section className="artifact-panel">
      <div className="artifact-toolbar"><div><p className="eyebrow">ARTIFACT</p><strong>{title}</strong></div><div className="tabs"><button type="button" className={`tab ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>编辑</button><button type="button" className={`tab ${mode === "diff" ? "active" : ""}`} onClick={() => setMode("diff")}>Diff</button></div></div>
      <div className="artifact-meta"><span>AI Initial → User Final</span><span>已保存到本地 P0 状态</span></div>
      {mode === "edit" ? <textarea aria-label="Artifact editor" className="artifact-editor" value={finalText} onChange={(event) => setFinalText(event.target.value)} /> : <div className="diff-view"><div className="diff-column removed"><p className="eyebrow">REMOVED FROM AI</p>{diffSummary.removed.length ? diffSummary.removed.map((line, index) => <p key={`${index}-${line}`}>− {line}</p>) : <p className="muted">暂无删除</p>}</div><div className="diff-column added"><p className="eyebrow">ADDED BY USER</p>{diffSummary.added.length ? diffSummary.added.map((line, index) => <p key={`${index}-${line}`}>+ {line}</p>) : <p className="muted">暂无新增</p>}</div></div>}
      <FeedbackCapture value={feedback} onChange={setFeedback} />
      {feedback && <OutcomeCapture value={outcome} onChange={setOutcome} candidateCreated={candidateCreated} onCreateCandidate={createCandidate} />}
    </section>
  );
}
