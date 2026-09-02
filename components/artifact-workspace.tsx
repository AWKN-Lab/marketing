"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FeedbackCapture } from "@/components/feedback-capture";
import { OutcomeCapture } from "@/components/outcome-capture";
import { candidateFingerprint, createExperienceCandidate, LOCAL_CANDIDATES_KEY, type LocalEvolutionCandidate } from "@/lib/evolution-store";
import { syncMarketingProduct } from "@/lib/sync-store";
import { useAgentTaskResult } from "@/lib/use-agent-task-result";
import { usePersistedState } from "@/lib/use-persisted-state";

export function ArtifactWorkspace({ taskId, workspaceId, taskType, taskGoal, title, aiDraft, initialFinal }: { taskId: string; workspaceId: string; taskType: string; taskGoal: string; title: string; aiDraft: string; initialFinal: string }) {
  const [mode, setMode] = useState<"edit" | "diff">("edit");
  const agentResult = useAgentTaskResult(taskId);
  const agentDraft = agentResult?.artifact?.content ?? aiDraft;
  const artifactTitle = agentResult?.artifact?.title ?? title;
  const [finalText, setFinalText] = usePersistedState(`marketing:${taskId}:artifact`, initialFinal);
  const previousAgentDraft = useRef(aiDraft);
  const [feedback, setFeedback] = usePersistedState<string | null>(`marketing:${taskId}:feedback`, null);
  const [outcome, setOutcome] = usePersistedState<string | null>(`marketing:${taskId}:outcome`, null);
  const [outcomeNote, setOutcomeNote] = usePersistedState(`marketing:${taskId}:outcome-note`, "");
  const [localCandidates, setLocalCandidates] = usePersistedState<LocalEvolutionCandidate[]>(LOCAL_CANDIDATES_KEY, []);

  useEffect(() => { if (agentDraft !== previousAgentDraft.current) { if (finalText === previousAgentDraft.current || finalText === initialFinal || finalText === aiDraft) setFinalText(agentDraft); previousAgentDraft.current = agentDraft; } }, [agentDraft, aiDraft, finalText, initialFinal, setFinalText]);
  const diffSummary = useMemo(() => { const aiLines = agentDraft.split("\n").filter(Boolean); const finalLines = finalText.split("\n").filter(Boolean); return { removed: aiLines.filter((line) => !finalLines.includes(line)), added: finalLines.filter((line) => !aiLines.includes(line)) }; }, [agentDraft, finalText]);
  const fingerprint = feedback && outcome ? candidateFingerprint({ finalText, feedback, outcome, outcomeNote }) : "";
  const existingCandidate = localCandidates.find((candidate) => candidate.taskId === taskId);
  const candidateCurrent = Boolean(existingCandidate && existingCandidate.fingerprint === fingerprint);

  function handleFeedback(value: string) {
    setFeedback(value);
    void syncMarketingProduct({ entityKey: `feedback:${taskId}`, operation: "feedback.record", workspaceId, taskId, payload: { feedback: value, artifact_text: finalText, artifact_title: artifactTitle } });
  }

  function createCandidate() {
    if (!feedback || !outcome) return;
    const candidate = createExperienceCandidate({ taskId, workspaceId, taskType, taskGoal, artifactTitle, feedback, outcome, outcomeNote, editCount: diffSummary.removed.length + diffSummary.added.length, fingerprint });
    setLocalCandidates([candidate, ...localCandidates.filter((item) => item.taskId !== taskId)]);
    void syncMarketingProduct({ entityKey: `outcome:${taskId}`, operation: "outcome.record", workspaceId, taskId, payload: { outcome, reason: outcomeNote || undefined, feedback, artifact_text: finalText, evidence_refs: agentResult?.evidence.map((item) => item.source) ?? [], trace_id: agentResult?.traceId } });
  }

  return <section className="artifact-panel"><div className="artifact-toolbar"><div><p className="eyebrow">ARTIFACT</p><strong>{artifactTitle}</strong></div><div className="tabs"><button type="button" className={`tab ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>编辑</button><button type="button" className={`tab ${mode === "diff" ? "active" : ""}`} onClick={() => setMode("diff")}>Diff</button></div></div><div className="artifact-meta"><span>{agentResult?.artifact ? "AWKN Agent Initial → User Final" : "AI Initial → User Final"}</span><span>{agentResult?.receivedAt ? `Agent result · ${new Date(agentResult.receivedAt).toLocaleString()}` : "已保存到本地 P0 状态"}</span></div>{mode === "edit" ? <textarea aria-label="Artifact editor" className="artifact-editor" value={finalText} onChange={(event) => setFinalText(event.target.value)} /> : <div className="diff-view"><div className="diff-column removed"><p className="eyebrow">REMOVED FROM AI</p>{diffSummary.removed.length ? diffSummary.removed.map((line, index) => <p key={`${index}-${line}`}>− {line}</p>) : <p className="muted">暂无删除</p>}</div><div className="diff-column added"><p className="eyebrow">ADDED BY USER</p>{diffSummary.added.length ? diffSummary.added.map((line, index) => <p key={`${index}-${line}`}>+ {line}</p>) : <p className="muted">暂无新增</p>}</div></div>}<FeedbackCapture value={feedback} onChange={handleFeedback} />{feedback && <OutcomeCapture value={outcome} note={outcomeNote} onChange={setOutcome} onNoteChange={setOutcomeNote} candidateCurrent={candidateCurrent} onCreateCandidate={createCandidate} />}</section>;
}
