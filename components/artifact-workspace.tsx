"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EntityReconcilePanel } from "@/components/entity-reconcile-panel";
import { FeedbackCapture } from "@/components/feedback-capture";
import { OutcomeCapture } from "@/components/outcome-capture";
import { useProductSession } from "@/components/product-session-provider";
import { candidateFingerprint, createExperienceCandidate, LOCAL_CANDIDATES_KEY, type LocalEvolutionCandidate } from "@/lib/evolution-store";
import { canMarketingAction } from "@/lib/product-session";
import { snapshotFingerprint } from "@/lib/reconcile";
import { readSyncRecord, syncMarketingProduct } from "@/lib/sync-store";
import { buildTaskExecutionState, mergeTaskExecutionEditableProjection, taskExecutionId, type TaskExecutionState } from "@/lib/task-execution";
import { useAgentTaskResult } from "@/lib/use-agent-task-result";
import { usePersistedState } from "@/lib/use-persisted-state";

export function ArtifactWorkspace({ taskId, workspaceId, taskType, taskGoal, title, aiDraft, initialFinal }: { taskId: string; workspaceId: string; taskType: string; taskGoal: string; title: string; aiDraft: string; initialFinal: string }) {
  const session = useProductSession();
  const canRead = canMarketingAction(session, "workspace.read", workspaceId, "read");
  const canExecutionWrite = canMarketingAction(session, "workspace.write", workspaceId, "write");
  const canFeedback = canExecutionWrite && canMarketingAction(session, "feedback.write", workspaceId, "write");
  const canOutcome = canExecutionWrite && canMarketingAction(session, "outcome.write", workspaceId, "write");
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
  const syncTimer = useRef<number | null>(null); const syncInFlight = useRef(false); const queuedExecution = useRef<TaskExecutionState | null>(null);
  const executionEntityKey = `task-execution:${taskId}`; const executionEntityId = taskExecutionId(taskId);
  const initialExecution = buildTaskExecutionState({ taskId, workspaceId, artifactTitle, finalText, feedback, outcome, outcomeNote });
  const executionRef = useRef<TaskExecutionState>(initialExecution);
  const currentExecution = mergeTaskExecutionEditableProjection(executionRef.current, { artifactTitle, finalText, feedback, outcome, outcomeNote });
  executionRef.current = currentExecution;

  useEffect(() => { if (agentDraft !== previousAgentDraft.current) { if (finalText === previousAgentDraft.current || finalText === initialFinal || finalText === aiDraft) setFinalText(agentDraft); previousAgentDraft.current = agentDraft; } }, [agentDraft, aiDraft, finalText, initialFinal, setFinalText]);
  useEffect(() => () => { if (syncTimer.current !== null) window.clearTimeout(syncTimer.current); }, []);
  const diffSummary = useMemo(() => { const aiLines = agentDraft.split("\n").filter(Boolean); const finalLines = finalText.split("\n").filter(Boolean); return { removed: aiLines.filter((line) => !finalLines.includes(line)), added: finalLines.filter((line) => !aiLines.includes(line)) }; }, [agentDraft, finalText]);
  const fingerprint = feedback && outcome ? candidateFingerprint({ finalText, feedback, outcome, outcomeNote }) : ""; const existingCandidate = localCandidates.find((candidate) => candidate.taskId === taskId); const candidateCurrent = Boolean(existingCandidate && existingCandidate.fingerprint === fingerprint);
  function executionWith(patch: Partial<TaskExecutionState>) { const next = { ...executionRef.current, ...patch, id: executionEntityId, taskId, workspaceId }; executionRef.current = next; return next; }
  async function flushExecutionSync(snapshot: TaskExecutionState) { if (!canExecutionWrite) return; if (syncInFlight.current) { queuedExecution.current = snapshot; return; } syncInFlight.current = true; try { const baseline = readSyncRecord(executionEntityKey); await syncMarketingProduct({ entityKey: executionEntityKey, operation: "task.execution.upsert", workspaceId, taskId, expectedEntityId: executionEntityId, idempotencyKey: `task.execution.upsert:${executionEntityId}:${baseline?.platformRevision ?? "new"}:${snapshotFingerprint(snapshot)}`, payload: { execution: snapshot, base_revision: baseline?.platformRevision }, snapshot }); } finally { syncInFlight.current = false; const next = queuedExecution.current; queuedExecution.current = null; if (next) void flushExecutionSync(next); } }
  function scheduleExecutionSync(snapshot: TaskExecutionState, delay = 700) { if (!canExecutionWrite) return; if (syncTimer.current !== null) window.clearTimeout(syncTimer.current); syncTimer.current = window.setTimeout(() => void flushExecutionSync(snapshot), delay); }
  function handleFinalText(value: string) { if (!canExecutionWrite) return; setFinalText(value); scheduleExecutionSync(executionWith({ finalText: value })); }
  function handleFeedback(value: string) { if (!canFeedback) return; setFeedback(value); const snapshot = executionWith({ feedback: value, finalText }); scheduleExecutionSync(snapshot, 0); void syncMarketingProduct({ entityKey: `feedback:${taskId}`, operation: "feedback.record", workspaceId, taskId, payload: { feedback: value, artifact_text: finalText, artifact_title: artifactTitle } }); }
  function handleOutcome(value: string) { if (!canOutcome) return; setOutcome(value); scheduleExecutionSync(executionWith({ outcome: value }), 0); }
  function handleOutcomeNote(value: string) { if (!canOutcome) return; setOutcomeNote(value); scheduleExecutionSync(executionWith({ outcomeNote: value })); }
  function applyPlatformExecution(remote: TaskExecutionState) { if (!canRead) return; setFinalText(remote.finalText); setFeedback(remote.feedback); setOutcome(remote.outcome); setOutcomeNote(remote.outcomeNote); executionRef.current = { ...remote, id: executionEntityId, taskId, workspaceId }; }
  function createCandidate() { if (!canOutcome || !feedback || !outcome) return; const candidate = createExperienceCandidate({ taskId, workspaceId, taskType, taskGoal, artifactTitle, feedback, outcome, outcomeNote, editCount: diffSummary.removed.length + diffSummary.added.length, fingerprint }); setLocalCandidates([candidate, ...localCandidates.filter((item) => item.taskId !== taskId)]); const snapshot = executionWith({ finalText, feedback, outcome, outcomeNote }); scheduleExecutionSync(snapshot, 0); void syncMarketingProduct({ entityKey: `outcome:${taskId}`, operation: "outcome.record", workspaceId, taskId, payload: { outcome, reason: outcomeNote || undefined, feedback, artifact_text: finalText, evidence_refs: agentResult?.evidenceRefs ?? agentResult?.evidence.map((item) => item.id || item.url || item.source) ?? [], run_id: agentResult?.runId, trace_id: agentResult?.traceId } }); }

  return <section className="artifact-panel">
    <EntityReconcilePanel<TaskExecutionState> entityLabel="Task Execution" entityKey={executionEntityKey} entityId={executionEntityId} workspaceId={workspaceId} taskId={taskId} getOperation="task.execution.get" updateOperation="task.execution.upsert" localEntity={currentExecution} canRead={canRead} canWrite={canExecutionWrite} buildUpdatePayload={(entity, baseRevision) => ({ execution: entity, base_revision: baseRevision })} onApplyPlatform={applyPlatformExecution}/>
    <div className="artifact-toolbar"><div><p className="eyebrow">ARTIFACT</p><strong>{artifactTitle}</strong></div><div className="tabs"><button type="button" className={`tab ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>编辑</button><button type="button" className={`tab ${mode === "diff" ? "active" : ""}`} onClick={() => setMode("diff")}>Diff</button></div></div>
    <div className="artifact-meta"><span>{agentResult?.artifact ? `AWKN Agent ${agentResult.runId ? `Run ${agentResult.runId}` : "Initial"} → User Final` : "AI Initial → User Final"}</span><span>{canExecutionWrite ? "可编辑" : "只读权限"}</span></div>
    {mode === "edit" ? <textarea aria-label="Artifact editor" className="artifact-editor" disabled={!canExecutionWrite} value={finalText} onChange={(event) => handleFinalText(event.target.value)} /> : <div className="diff-view"><div className="diff-column removed"><p className="eyebrow">REMOVED FROM AI</p>{diffSummary.removed.length ? diffSummary.removed.map((line, index) => <p key={`${index}-${line}`}>− {line}</p>) : <p className="muted">暂无删除</p>}</div><div className="diff-column added"><p className="eyebrow">ADDED BY USER</p>{diffSummary.added.length ? diffSummary.added.map((line, index) => <p key={`${index}-${line}`}>+ {line}</p>) : <p className="muted">暂无新增</p>}</div></div>}
    <fieldset disabled={!canFeedback} style={{border:0,padding:0,margin:0}}><FeedbackCapture value={feedback} onChange={handleFeedback} /></fieldset>
    {feedback && <fieldset disabled={!canOutcome} style={{border:0,padding:0,margin:0}}><OutcomeCapture value={outcome} note={outcomeNote} onChange={handleOutcome} onNoteChange={handleOutcomeNote} candidateCurrent={candidateCurrent} onCreateCandidate={createCandidate} /></fieldset>}
  </section>;
}
