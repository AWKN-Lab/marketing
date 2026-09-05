"use client";

import { useEffect, useMemo, useState } from "react";
import { retryLearningRun, startLearningRun, upsertLearningWatch } from "@/lib/learning-run-client";
import { createLearningWatch, LEARNING_WATCHES_KEY, learningSourceTypes, type LearningWatch } from "@/lib/learning-store";
import { LEARNING_RUNS_KEY, normalizeLearningRun, shouldPollLearningRun, type LearningRun } from "@/lib/learning-run-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function LearningWatchPanel({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [watches, setWatches, hydrated] = usePersistedState<LearningWatch[]>(LEARNING_WATCHES_KEY, []);
  const [runs, setRuns] = usePersistedState<LearningRun[]>(LEARNING_RUNS_KEY, []);
  const existing = useMemo(() => watches.find((watch) => watch.workspaceId === workspaceId), [watches, workspaceId]);
  const latestRun = useMemo(() => runs.find((run) => run.workspaceId === workspaceId), [runs, workspaceId]);
  const pendingWorkspaceRun = useMemo(() => runs.find((run) => run.workspaceId === workspaceId && shouldPollLearningRun(run)), [runs, workspaceId]);
  const [topicInput, setTopicInput] = useState("");
  const [draftTopics, setDraftTopics] = useState<string[]>([]);
  const [draftSources, setDraftSources] = useState<string[]>(["政策", "客户公开动态", "行业"]);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!hydrated || !existing) return;
    setDraftTopics(existing.topics);
    setDraftSources(existing.sourceTypes);
  }, [hydrated, existing?.id, existing?.updatedAt]);

  function addTopic() {
    const value = topicInput.trim();
    if (!value || draftTopics.includes(value)) return;
    setDraftTopics([...draftTopics, value]);
    setTopicInput("");
  }
  function toggleSource(source: string) { setDraftSources((current) => current.includes(source) ? current.filter((item) => item !== source) : [...current, source]); }

  async function save(enabled: boolean) {
    const next = createLearningWatch({ workspaceId, workspaceName, topics: draftTopics, sourceTypes: draftSources, enabled });
    setWatches([next, ...watches.filter((watch) => watch.workspaceId !== workspaceId)]);
    setMessage("Watch Scope 已保存到本地，正在同步产品接口…");
    const result = await upsertLearningWatch({ workspaceId, watch: next });
    if (result.ok) setMessage("Watch Scope 已保存并同步 AWKN 产品接口。");
    else if (result.error?.code === "PLATFORM_NOT_CONFIGURED") setMessage("Watch Scope 已保存到本地；AWKN 产品接口尚未配置。");
    else setMessage(`本地已保存；平台同步失败：${result.error?.message ?? "unknown error"}`);
  }

  function persistRun(run: LearningRun) {
    setRuns((current) => [run, ...current.filter((item) => item.runId !== run.runId)]);
  }

  async function runOnce() {
    if (!existing?.enabled || running || pendingWorkspaceRun) return;
    setRunning(true);
    setMessage("已提交一次真实学习运行…");
    const startedAt = new Date().toISOString();
    const result = await startLearningRun({
      workspaceId,
      watchId: existing.id,
      topics: existing.topics,
      sourceTypes: existing.sourceTypes,
    });
    if (!result.ok) {
      setMessage(result.error?.code === "PLATFORM_NOT_CONFIGURED" ? "AWKN 产品接口尚未配置，没有生成任何学习结果。" : `学习运行失败：${result.error?.message ?? "unknown error"}`);
      setRunning(false);
      return;
    }
    const run = normalizeLearningRun({ data: result.data, workspaceId, watchId: existing.id, traceId: result.trace_id, startedAt });
    if (!run) {
      setMessage("平台已响应，但缺少有效 run_id / status / attempt；本次结果未写入 Today。");
      setRunning(false);
      return;
    }
    persistRun(run);
    setMessage(run.signals.length ? `学习完成：发现 ${run.signals.length} 条真实 Signal。` : `学习运行状态：${run.status}。全局 Poller 会继续跟进未完成运行。`);
    setRunning(false);
  }

  async function retryFailedRun() {
    if (!existing?.enabled || !latestRun || latestRun.status !== "failed" || running || pendingWorkspaceRun) return;
    setRunning(true);
    setMessage(`正在重试学习运行 ${latestRun.runId}…`);
    const currentAttempt = Number.isSafeInteger(latestRun.attempt) && latestRun.attempt > 0 ? latestRun.attempt : 1;
    const retryStartedAt = new Date().toISOString();
    const result = await retryLearningRun({
      workspaceId,
      watchId: existing.id,
      runId: latestRun.runId,
      attempt: currentAttempt + 1,
      topics: existing.topics,
      sourceTypes: existing.sourceTypes,
    });
    if (!result.ok) {
      setMessage(`重试失败：${result.error?.message ?? "unknown error"}`);
      setRunning(false);
      return;
    }
    const run = normalizeLearningRun({ data: result.data, workspaceId, watchId: existing.id, traceId: result.trace_id, startedAt: retryStartedAt });
    if (!run || run.runId !== latestRun.runId || run.attempt <= currentAttempt) {
      setMessage("重试接口没有返回同一逻辑 run_id 与递增 attempt，未覆盖原失败记录。");
      setRunning(false);
      return;
    }
    persistRun(run);
    setMessage(`重试已提交：${run.status} · attempt ${run.attempt}。全局 Poller 会继续跟进。`);
    setRunning(false);
  }

  return <section className="panel stack-md">
    <div className="section-title"><div><p className="eyebrow">DAILY LEARNING</p><h2>持续关注什么</h2></div><span className={`watch-status ${existing?.enabled ? "on" : "off"}`}>{existing?.enabled ? "已启用" : "未启用"}</span></div>
    <p className="muted small">只围绕当前 Workspace 学习。浏览器定义 Watch Scope；真实搜索、验证与运行由 AWKN 产品接口执行。</p>
    <div className="topic-input"><input value={topicInput} onChange={(event) => setTopicInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTopic(); } }} placeholder="例如：Q4 文旅促消费政策 / 关键合作方 / 竞争项目"/><button className="button secondary" onClick={addTopic}>加入关注</button></div>
    <div className="row wrap gap-sm">{draftTopics.length ? draftTopics.map((topic) => <button className="watch-chip" key={topic} onClick={() => setDraftTopics(draftTopics.filter((item) => item !== topic))}>{topic} ×</button>) : <span className="muted small">至少加入一个真正影响当前判断的关注项。</span>}</div>
    <div><span className="label">信息范围</span><div className="row wrap gap-sm">{learningSourceTypes.map((source) => <button key={source} className={`chip ${draftSources.includes(source) ? "selected" : ""}`} onClick={() => toggleSource(source)}>{source}</button>)}</div></div>
    <div className="learning-contract"><span className="pulse"/><div><strong>{pendingWorkspaceRun ? `运行中：${pendingWorkspaceRun.status}` : latestRun ? `最近运行：${latestRun.status}` : existing?.enabled ? "Watch Scope 已准备" : "等待启用"}</strong><p>{pendingWorkspaceRun ? `${pendingWorkspaceRun.runId} · attempt ${pendingWorkspaceRun.attempt || 1} · 全局自动刷新中${pendingWorkspaceRun.traceId ? ` · Trace ${pendingWorkspaceRun.traceId}` : ""}` : latestRun ? `${latestRun.signals.length} 条真实 Signal · attempt ${latestRun.attempt || 1}${latestRun.traceId ? ` · Trace ${latestRun.traceId}` : ""}` : existing?.enabled ? "可以立即执行一次学习；定时调度仍由 AWKN 平台负责。" : "启用后只保存当前关注范围，不伪造学习结果。"}</p></div></div>
    {message && <p className="muted small">{message}</p>}
    <div className="row gap-sm wrap"><button className="button primary" disabled={!draftTopics.length || !draftSources.length} onClick={() => void save(true)}>{existing?.enabled ? "更新关注范围" : "启用每日学习"}</button>{existing?.enabled && latestRun?.status === "failed" && !pendingWorkspaceRun && <button className="button secondary" disabled={running} onClick={() => void retryFailedRun()}>{running ? "重试中…" : "重试失败运行"}</button>}{existing?.enabled && latestRun?.status !== "failed" && <button className="button secondary" disabled={running || Boolean(pendingWorkspaceRun)} onClick={() => void runOnce()}>{running ? "提交中…" : pendingWorkspaceRun ? "学习运行中" : "立即学习一次"}</button>}{existing?.enabled && <button className="button ghost" onClick={() => void save(false)}>暂停</button>}</div>
  </section>;
}