"use client";

import { useEffect, useMemo, useState } from "react";
import { createLearningWatch, LEARNING_WATCHES_KEY, learningSourceTypes, type LearningWatch } from "@/lib/learning-store";
import { usePersistedState } from "@/lib/use-persisted-state";

export function LearningWatchPanel({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [watches, setWatches, hydrated] = usePersistedState<LearningWatch[]>(LEARNING_WATCHES_KEY, []);
  const existing = useMemo(() => watches.find((watch) => watch.workspaceId === workspaceId), [watches, workspaceId]);
  const [topicInput, setTopicInput] = useState("");
  const [draftTopics, setDraftTopics] = useState<string[]>([]);
  const [draftSources, setDraftSources] = useState<string[]>(["政策", "客户公开动态", "行业"]);

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
  function save(enabled: boolean) {
    const next = createLearningWatch({ workspaceId, workspaceName, topics: draftTopics, sourceTypes: draftSources, enabled });
    setWatches([next, ...watches.filter((watch) => watch.workspaceId !== workspaceId)]);
  }

  return <section className="panel stack-md">
    <div className="section-title"><div><p className="eyebrow">DAILY LEARNING</p><h2>持续关注什么</h2></div><span className={`watch-status ${existing?.enabled ? "on" : "off"}`}>{existing?.enabled ? "已启用" : "未启用"}</span></div>
    <p className="muted small">只围绕当前 Workspace 学习。前端保存 Watch Scope；实际搜索、验证与定时执行由平台接口接入。</p>
    <div className="topic-input"><input value={topicInput} onChange={(event) => setTopicInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTopic(); } }} placeholder="例如：Q4 文旅促消费政策 / 关键合作方 / 竞争项目"/><button className="button secondary" onClick={addTopic}>加入关注</button></div>
    <div className="row wrap gap-sm">{draftTopics.length ? draftTopics.map((topic) => <button className="watch-chip" key={topic} onClick={() => setDraftTopics(draftTopics.filter((item) => item !== topic))}>{topic} ×</button>) : <span className="muted small">至少加入一个真正影响当前判断的关注项。</span>}</div>
    <div><span className="label">信息范围</span><div className="row wrap gap-sm">{learningSourceTypes.map((source) => <button key={source} className={`chip ${draftSources.includes(source) ? "selected" : ""}`} onClick={() => toggleSource(source)}>{source}</button>)}</div></div>
    <div className="learning-contract"><span className="pulse"/><div><strong>{existing?.enabled ? "Watch Scope 已准备" : "等待启用"}</strong><p>{existing?.enabled ? "接入 LearningPort 后，由平台执行每日搜索与证据验证，再把真实 Signal 回写 Today。" : "启用后只保存当前关注范围；浏览器不承担搜索调度。"}</p></div></div>
    <div className="row gap-sm"><button className="button primary" disabled={!draftTopics.length || !draftSources.length} onClick={() => save(true)}>{existing?.enabled ? "更新关注范围" : "启用每日学习"}</button>{existing?.enabled && <button className="button ghost" onClick={() => save(false)}>暂停</button>}</div>
  </section>;
}
