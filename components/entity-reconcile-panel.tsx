"use client";

import { useState } from "react";
import type { ProductOperation } from "@/lib/product-contract";
import { readMarketingEntity, type EntityReadOperation } from "@/lib/reconcile-client";
import { reconcileSnapshots, snapshotFingerprint, type EntityReadData, type ReconcileAssessment } from "@/lib/reconcile";
import { markPlatformSnapshotAccepted, readSyncRecord, syncMarketingProduct } from "@/lib/sync-store";

const labels: Record<string, string> = {
  clean: "本地与 AWKN 一致",
  "local-newer": "本地有新改动",
  "platform-newer": "AWKN 有新版本",
  conflict: "本地与 AWKN 同时变化",
  unbased: "缺少共同同步基线",
  "stale-platform": "平台 revision 低于本地基线",
};

export function EntityReconcilePanel<T extends { id: string }>(props: {
  entityLabel: string;
  entityKey: string;
  entityId: string;
  workspaceId?: string;
  taskId?: string;
  getOperation: EntityReadOperation;
  updateOperation: ProductOperation;
  localEntity: T;
  buildUpdatePayload: (entity: T, baseRevision: number) => unknown;
  onApplyPlatform: (entity: T) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [assessment, setAssessment] = useState<ReconcileAssessment | null>(null);
  const [remote, setRemote] = useState<EntityReadData<T> | null>(null);
  const [message, setMessage] = useState("");

  async function check() {
    setChecking(true); setMessage("");
    try {
      const response = await readMarketingEntity<T>({ operation: props.getOperation, entityId: props.entityId, workspaceId: props.workspaceId, taskId: props.taskId });
      if (!response.ok || !response.data) {
        setAssessment(null); setRemote(null); setMessage(response.error?.message ?? "平台状态读取失败。"); return;
      }
      const baseline = readSyncRecord(props.entityKey);
      const next = reconcileSnapshots({
        localSnapshot: props.localEntity,
        platformSnapshot: response.data.entity,
        platformRevision: response.data.revision,
        baselineFingerprint: baseline?.syncedFingerprint,
        baselineRevision: baseline?.platformRevision,
      });
      setRemote(response.data); setAssessment(next);
      if (next.state === "clean") markPlatformSnapshotAccepted({ entityKey: props.entityKey, operation: props.getOperation, revision: response.data.revision, snapshot: response.data.entity, traceId: response.trace_id });
    } finally {
      setChecking(false);
    }
  }

  async function keepLocal() {
    if (!remote) return;
    setMessage("正在把本地版本回写 AWKN…");
    const response = await syncMarketingProduct({
      entityKey: props.entityKey,
      operation: props.updateOperation,
      workspaceId: props.workspaceId,
      taskId: props.taskId,
      expectedEntityId: props.entityId,
      idempotencyKey: `${props.updateOperation}:${props.entityId}:${remote.revision}:${snapshotFingerprint(props.localEntity)}`,
      payload: props.buildUpdatePayload(props.localEntity, remote.revision),
      snapshot: props.localEntity,
    });
    if (!response.ok) { setMessage(response.error?.message ?? "本地版本回写失败。"); return; }
    setMessage("本地版本已回写 AWKN。");
    await check();
  }

  function acceptPlatform() {
    if (!remote) return;
    props.onApplyPlatform(remote.entity);
    markPlatformSnapshotAccepted({ entityKey: props.entityKey, operation: props.getOperation, revision: remote.revision, snapshot: remote.entity });
    setAssessment({ ...assessment!, state: "clean", localFingerprint: snapshotFingerprint(remote.entity), platformFingerprint: snapshotFingerprint(remote.entity), baselineFingerprint: snapshotFingerprint(remote.entity), baselineRevision: remote.revision });
    setMessage("已采用 AWKN 平台版本，本地稳定 ID 保持不变。");
  }

  const showSnapshots = assessment && assessment.state !== "clean";
  return <section className="panel stack-md">
    <div className="section-title"><div><p className="eyebrow">PLATFORM RECONCILE</p><h2>{props.entityLabel} 状态读回</h2></div><button className="button ghost" disabled={checking} onClick={() => void check()}>{checking ? "检查中…" : "检查 AWKN 最新状态"}</button></div>
    <p className="muted small">只比较产品层实体快照与 revision；不会静默覆盖本地内容。</p>
    {assessment && <div className="learning-contract"><span className="pulse"/><div><strong>{labels[assessment.state]}</strong><p>本地 {assessment.localFingerprint} · 平台 r{assessment.platformRevision} {assessment.platformFingerprint}{typeof assessment.baselineRevision === "number" ? ` · 基线 r${assessment.baselineRevision}` : " · 尚无 revision 基线"}</p></div></div>}
    {message && <p className="muted small">{message}</p>}
    {showSnapshots && remote && <><details><summary>查看本地 / 平台两个快照</summary><div className="two-col"><pre className="muted small">{JSON.stringify(props.localEntity, null, 2).slice(0, 6000)}</pre><pre className="muted small">{JSON.stringify(remote.entity, null, 2).slice(0, 6000)}</pre></div></details><div className="row gap-sm">{assessment.state !== "stale-platform" && <button className="button secondary" onClick={acceptPlatform}>采用 AWKN 版本</button>}<button className="button ghost" onClick={() => void keepLocal()}>保留本地并回写</button></div></>}
  </section>;
}
