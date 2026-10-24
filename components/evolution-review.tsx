"use client";

import { useState } from "react";
import { EvolutionMetrics } from "@/components/evolution-metrics";
import { P0DataPortability } from "@/components/p0-data-portability";
import { useProductSession } from "@/components/product-session-provider";
import {
  EVOLUTION_REVIEWS_KEY,
  LOCAL_CANDIDATES_KEY,
  buildPatternCandidates,
  patternEligibleSamples,
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
import { readPersistedValue } from "@/lib/persistence";
import { PATTERN_MIN_SUPPORT, type PatternSample } from "@/lib/pattern-detection";
import { callPatternDetect } from "@/lib/pattern-client";
import { canMarketingAction, filterReadableWorkspaceItems } from "@/lib/product-session";
import { readSyncRecord, syncMarketingProduct } from "@/lib/sync-store";
import { LOCAL_TASKS_KEY } from "@/lib/task-store";
import type { EvolutionCandidate, MarketingTask } from "@/lib/types";
import { usePersistedState } from "@/lib/use-persisted-state";

export function EvolutionReview({ candidates }: { candidates: EvolutionCandidate[] }) {
  const session = useProductSession();
  const [states, setStates] = usePersistedState<Record<string, EvolutionReviewValue>>(EVOLUTION_REVIEWS_KEY, {});
  const [localCandidates, setLocalCandidates] = usePersistedState<LocalEvolutionCandidate[]>(LOCAL_CANDIDATES_KEY, []);
  const [tasks] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  const [messages, setMessages] = usePersistedState<Record<string, string>>("marketing:evolution:pattern-messages", {});
  const [patternMessage, setPatternMessage] = useState("");
  const visibleLocal = filterReadableWorkspaceItems(session, localCandidates, (candidate) => candidate.workspaceId ?? "");
  const hasRealCandidates = visibleLocal.length > 0;
  const allCandidates: EvolutionCandidate[] = hasRealCandidates ? visibleLocal : candidates;

  /**
   * 跨任务重复模式：把已确认任务的同向信号聚合成可审核的 Pattern Candidate。
   *
   * 平台模式由 AWKN OS 营销插件（`marketing.pattern.detect`）计算 —— 产品层只送样本、收结果；
   * 本地模式没有平台，由 `lib/pattern-detection.ts` 作为离线回退承担。
   * 两条路径必须给出同一个 patternId，否则平台与本地认不出同一个模式。
   */
  async function detectCrossTaskPatterns() {
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const samples: PatternSample[] = [];
    for (const candidate of visibleLocal) {
      if (!evolutionCandidateReadyForReview(candidate)) continue;
      // 模式候选本身不参与模式形成，避免自举放大。
      if (candidate.evidence?.pattern_evidence) continue;
      // 用户已经否决的方法不得再影响下一次模式判断。
      if (reviewDecisionForCandidate(states[candidate.id], candidate) === "rejected") continue;
      const task = taskById.get(candidate.taskId);
      if (!task) continue;
      samples.push({
        taskId: candidate.taskId,
        workspaceId: candidate.workspaceId ?? "",
        taskType: candidate.sourceTaskType ?? task.type,
        feedback: readPersistedValue<string | null>(`marketing:${candidate.taskId}:feedback`, null),
        outcome: readPersistedValue<string | null>(`marketing:${candidate.taskId}:outcome`, null),
        editCount: task.artifact.aiDraft.split("\n").filter(Boolean).length,
        aiDraft: candidate.evidence?.ai_draft ?? "",
        userFinal: candidate.evidence?.user_final ?? "",
        completedAt: candidate.createdAt,
        feedbackEventId: candidate.evidence?.feedback_event_id,
        outcomeEventId: candidate.evidence?.outcome_event_id,
        evidenceRefs: candidate.evidence?.evidence_refs,
        runId: candidate.evidence?.run_id,
        traceId: candidate.evidence?.trace_id,
      });
    }

    const eligible = patternEligibleSamples(samples);
    let detected: LocalEvolutionCandidate[];
    if (session.mode === "platform") {
      const response = await callPatternDetect({
        workspaceId: samples[0]?.workspaceId,
        samples: eligible,
        requestId: `pattern-detect-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      });
      if (!response.ok) {
        setPatternMessage(`平台模式检测未成功：${response.error?.message ?? "unknown error"}`);
        return;
      }
      detected = buildPatternCandidates({ samples, previous: localCandidates, patterns: response.data?.patterns ?? [] });
    } else {
      detected = buildPatternCandidates({ samples, previous: localCandidates });
    }
    if (!detected.length) {
      setPatternMessage(`未检测到重复模式。至少需要同一 Workspace、同类型任务各 ${PATTERN_MIN_SUPPORT} 次出现同向信号。`);
      return;
    }
    setLocalCandidates((current) => {
      const incoming = new Map(detected.map((candidate) => [candidate.id, candidate]));
      return [...detected, ...current.filter((candidate) => !incoming.has(candidate.id))];
    });
    setPatternMessage(`已生成 ${detected.length} 条跨任务重复模式候选，等待人工审核后才进入经验匹配。`);
  }

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
    {hasRealCandidates
      ? <div className="stack-md">
          <div className="row gap-sm">
            <button className="button secondary" onClick={() => void detectCrossTaskPatterns()}>从已确认任务检测重复模式</button>
            <span className="muted small">{patternMessage || "跨任务重复模式是 PRD §21.1 的第三类学习源；单次修改不会自动上升为普遍经验。"}</span>
          </div>
        </div>
      : null}
    <section className="stack-md">
      {allCandidates.map((candidate) => {
        const isReal = candidate.id.startsWith("local-ev");
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
