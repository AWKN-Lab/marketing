"use client";

import { useState } from "react";
import { EvolutionMetrics } from "@/components/evolution-metrics";
import { P0DataPortability } from "@/components/p0-data-portability";
import { useProductSession } from "@/components/product-session-provider";
import {
  EVOLUTION_REVIEWS_KEY,
  LOCAL_CANDIDATES_KEY,
  candidateRevision,
  evolutionCandidateReadyForReview,
  reviewDecisionForCandidate,
  type EvolutionReviewState,
  type EvolutionReviewValue,
  type LocalEvolutionCandidate,
} from "@/lib/evolution-store";
import {
  buildEvolutionReview,
  evolutionReviewIdempotencyKey,
  type EvolutionReviewDecision,
} from "@/lib/evolution-contract";
import { canMarketingAction, filterReadableWorkspaceItems } from "@/lib/product-session";
import { readSyncRecord, syncMarketingProduct } from "@/lib/sync-store";
import type { EvolutionCandidate } from "@/lib/types";
import { usePersistedState } from "@/lib/use-persisted-state";

export function EvolutionReview({ candidates }: { candidates: EvolutionCandidate[] }) {
  const session = useProductSession();
  const [states, setStates] = usePersistedState<Record<string, EvolutionReviewValue>>(EVOLUTION_REVIEWS_KEY, {});
  const [localCandidates] = usePersistedState<LocalEvolutionCandidate[]>(LOCAL_CANDIDATES_KEY, []);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const visibleLocal = filterReadableWorkspaceItems(session, localCandidates, (candidate) => candidate.workspaceId ?? "");
  const hasRealCandidates = visibleLocal.length > 0;
  const allCandidates: EvolutionCandidate[] = hasRealCandidates ? visibleLocal : candidates;

  async function review(candidate: LocalEvolutionCandidate, decision: EvolutionReviewDecision) {
    if (!candidate.workspaceId || !evolutionCandidateReadyForReview(candidate)) return;
    if (!canMarketingAction(session, "evolution.review", candidate.workspaceId, "write")) return;

    const entityKey = `evolution:${candidate.id}`;
    const baseline = readSyncRecord(entityKey);
    const baseRevision = baseline?.platformRevision;
    const reviewRecord = buildEvolutionReview({
      candidateId: candidate.id,
      candidateRevision: candidateRevision(candidate),
      workspaceId: candidate.workspaceId,
      taskId: candidate.taskId,
      decision,
      reviewerActorId: session.actor.id,
    });
    const response = await syncMarketingProduct({
      entityKey,
      operation: "evolution.review",
      workspaceId: candidate.workspaceId,
      taskId: candidate.taskId,
      expectedEntityId: reviewRecord.id,
      idempotencyKey: evolutionReviewIdempotencyKey(reviewRecord, baseRevision),
      payload: { candidate, review: reviewRecord, base_revision: baseRevision },
      snapshot: reviewRecord,
    });
    const localOnly = session.mode === "local" && response.error?.code === "PLATFORM_NOT_CONFIGURED";
    if (!response.ok && !localOnly) {
      setMessages((current) => ({
        ...current,
        [candidate.id]: response.error?.message ?? "审核未获平台确认。",
      }));
      return;
    }

    const data = response.data && typeof response.data === "object" ? response.data as Record<string, unknown> : null;
    const state: EvolutionReviewState = {
      reviewId: reviewRecord.id,
      decision,
      candidateRevision: candidateRevision(candidate),
      scopeWorkspaceId: decision === "scoped" ? candidate.workspaceId : undefined,
      platformRevision: typeof data?.revision === "number" ? data.revision : baseRevision,
      traceId: response.trace_id,
    };
    setStates((current) => ({ ...current, [candidate.id]: state }));
    setMessages((current) => ({
      ...current,
      [candidate.id]: localOnly ? "本地审核已记录；平台接口尚未配置。" : "平台审核已确认。",
    }));
  }

  return <main className="page stack-lg">
    <header className="page-header">
      <div>
        <p className="eyebrow">EVOLUTION</p>
        <h1>它最近学会了什么</h1>
        <p className="muted">撤销 Workspace read Grant 后，对应 Candidate 与指标会立即退出当前 Session 视图。</p>
      </div>
      <span className={`pill ${hasRealCandidates ? "" : "demo-badge"}`}>{hasRealCandidates ? `${allCandidates.length} 条可访问候选` : "DEMO 候选"}</span>
    </header>
    <EvolutionMetrics />
    <P0DataPortability />
    {hasRealCandidates
      ? <div className="evolution-notice"><span className="pulse" /><div><strong>这些候选来自当前可访问的真实任务</strong><p>审核需要 evolution.review + Workspace write Grant；平台确认后才进入经验匹配。</p></div></div>
      : <div className="demo-notice"><strong>当前没有可访问的真实 Candidate</strong><p>Demo 仅用于理解界面，不参与后续经验匹配。</p></div>}
    <section className="stack-md">
      {allCandidates.map((candidate) => {
        const isReal = candidate.id.startsWith("local-ev-");
        const local = candidate as LocalEvolutionCandidate;
        const ready = isReal && evolutionCandidateReadyForReview(local);
        const canReview = Boolean(ready && local.workspaceId && canMarketingAction(session, "evolution.review", local.workspaceId, "write"));
        const decision = isReal ? reviewDecisionForCandidate(states[candidate.id], local) : null;
        return <article className={`candidate-card ${isReal ? "" : "demo-card"}`} key={candidate.id}>
          <div className="candidate-top">
            <div><span className={`badge ${isReal ? "" : "demo-badge"}`}>{isReal ? candidate.type : `DEMO · ${candidate.type}`}</span><h2>{candidate.lesson}</h2></div>
            <span className="confidence">{Math.round(candidate.confidence * 100)}%</span>
          </div>
          <p>{candidate.why}</p>
          <div className="candidate-grid">
            <div><span className="label">来源</span><strong>{candidate.source}</strong></div>
            <div><span className="label">适用范围</span><strong>{candidate.scope}</strong></div>
            <div><span className="label">反例</span><strong>{candidate.counterexample}</strong></div>
          </div>
          {isReal
            ? <div className="row gap-sm">
                <button className={`button ${decision === "accepted" ? "primary" : "secondary"}`} disabled={!canReview} onClick={() => void review(local, "accepted")}>接受并用于后续任务</button>
                <button className={`button ${decision === "scoped" ? "secondary" : "ghost"}`} disabled={!canReview} onClick={() => void review(local, "scoped")}>仅当前 Workspace</button>
                <button className={`button ghost danger ${decision === "rejected" ? "selected" : ""}`} disabled={!canReview} onClick={() => void review(local, "rejected")}>拒绝</button>
                <span className="muted small">{!ready ? "候选缺少 P6 Evidence / revision，请回到 Task 重新生成。" : !canReview ? "当前账号只有读取权限" : messages[candidate.id] ?? (decision ? `已确认：${decision} · r${candidateRevision(local)}` : `等待判断 · r${candidateRevision(local)}`)}</span>
              </div>
            : <span className="muted small">示例数据，不参与审核与经验匹配。</span>}
        </article>;
      })}
    </section>
  </main>;
}
