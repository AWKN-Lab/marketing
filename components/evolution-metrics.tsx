"use client";

import { useEffect, useMemo, useState } from "react";
import { buildP0Metrics, countLineDiff, type EvalTaskSample } from "@/lib/eval";
import { LOCAL_TASKS_KEY } from "@/lib/task-store";
import type { MarketingTask } from "@/lib/types";
import { usePersistedState } from "@/lib/use-persisted-state";

function readLocal(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function EvolutionMetrics() {
  const [tasks] = usePersistedState<MarketingTask[]>(LOCAL_TASKS_KEY, []);
  const [samples, setSamples] = useState<EvalTaskSample[]>([]);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setSamples(tasks.map((task) => {
      const finalText = readLocal(`marketing:${task.id}:artifact`) ?? task.artifact.userFinal;
      const feedback = readLocal(`marketing:${task.id}:feedback`) as string | null;
      const outcome = readLocal(`marketing:${task.id}:outcome`) as string | null;
      return {
        taskId: task.id,
        taskType: task.type,
        feedback,
        outcome,
        editCount: countLineDiff(task.artifact.aiDraft, typeof finalText === "string" ? finalText : task.artifact.userFinal),
        appliedExperienceCount: task.appliedExperiences.length,
      };
    }));
  }, [tasks, revision]);

  const metrics = useMemo(() => buildP0Metrics(samples), [samples]);
  const hasEnoughData = metrics.totalTasks > 0;

  return <section className="eval-panel stack-md">
    <div className="section-title"><div><p className="eyebrow">PRODUCT EVAL</p><h2>进化有没有产生真实增益</h2><p className="muted small">只计算你的本地真实 Task；Demo 不进入指标。</p></div><button className="button ghost" onClick={() => setRevision((value) => value + 1)}>刷新指标</button></div>
    {!hasEnoughData ? <div className="empty-eval"><strong>还没有真实任务样本</strong><p>完成 Task → Feedback → Outcome 后，这里开始计算产品指标。</p></div> : <>
      <div className="eval-grid">
        <div><span className="label">真实任务</span><strong>{metrics.totalTasks}</strong><small>样本量</small></div>
        <div><span className="label">Feedback Coverage</span><strong>{pct(metrics.feedbackCoverage)}</strong><small>有明确用户判断</small></div>
        <div><span className="label">First-pass Adoption</span><strong>{pct(metrics.firstPassAdoption)}</strong><small>反馈为“采用”</small></div>
        <div><span className="label">Outcome Coverage</span><strong>{pct(metrics.outcomeCoverage)}</strong><small>记录真实结果</small></div>
        <div><span className="label">Outcome Success</span><strong>{pct(metrics.outcomeSuccessRate)}</strong><small>已记录 Outcome 中的正向推进</small></div>
        <div><span className="label">Experience Reuse</span><strong>{pct(metrics.experienceReuseRate)}</strong><small>任务使用过已审核经验</small></div>
        <div><span className="label">Average Edit Distance</span><strong>{metrics.averageEditCount.toFixed(1)}</strong><small>行级新增 + 删除</small></div>
      </div>
      <div className="trend-box"><span className="label">相似任务质量增益</span>{metrics.repeatedTaskTypes.length === 0 ? <p className="muted">同一任务类型至少完成 2 个带 Feedback 的真实任务后开始判断趋势。</p> : <>{metrics.repeatedTaskTypes.map((item) => <div className="trend-row" key={item.taskType}><strong>{item.taskType}</strong><span>{item.samples} 次</span><span>编辑量 {item.firstEditCount} → {item.latestEditCount}</span><span className={item.editDelta < 0 ? "status-ok" : "muted"}>{item.editDelta < 0 ? `改善 ${Math.abs(item.editDelta)}` : item.editDelta === 0 ? "持平" : `增加 ${item.editDelta}`}</span></div>)}<p className="muted small">当前仅视为可观察信号；样本量不足时不宣称形成稳定增益。</p></>}</div>
    </>}
  </section>;
}
