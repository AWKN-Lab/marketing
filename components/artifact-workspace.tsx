"use client";

import { useMemo, useState } from "react";
import { FeedbackCapture } from "@/components/feedback-capture";
import { OutcomeCapture } from "@/components/outcome-capture";

export function ArtifactWorkspace({ title, aiDraft, initialFinal }: { title: string; aiDraft: string; initialFinal: string }) {
  const [mode, setMode] = useState<"edit" | "diff">("edit");
  const [finalText, setFinalText] = useState(initialFinal);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const diffSummary = useMemo(() => {
    const aiLines = aiDraft.split("\n").filter(Boolean);
    const finalLines = finalText.split("\n").filter(Boolean);
    const removed = aiLines.filter((line) => !finalLines.includes(line));
    const added = finalLines.filter((line) => !aiLines.includes(line));
    return { removed, added };
  }, [aiDraft, finalText]);

  return (
    <section className="artifact-panel">
      <div className="artifact-toolbar">
        <div><p className="eyebrow">ARTIFACT</p><strong>{title}</strong></div>
        <div className="tabs">
          <button type="button" className={`tab ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>编辑</button>
          <button type="button" className={`tab ${mode === "diff" ? "active" : ""}`} onClick={() => setMode("diff")}>Diff</button>
        </div>
      </div>
      <div className="artifact-meta"><span>AI Initial → User Final</span><span>本地 P0 状态</span></div>
      {mode === "edit" ? (
        <textarea aria-label="Artifact editor" className="artifact-editor" value={finalText} onChange={(event) => setFinalText(event.target.value)} />
      ) : (
        <div className="diff-view">
          <div className="diff-column removed"><p className="eyebrow">REMOVED FROM AI</p>{diffSummary.removed.length ? diffSummary.removed.map((line) => <p key={line}>− {line}</p>) : <p className="muted">暂无删除</p>}</div>
          <div className="diff-column added"><p className="eyebrow">ADDED BY USER</p>{diffSummary.added.length ? diffSummary.added.map((line) => <p key={line}>+ {line}</p>) : <p className="muted">暂无新增</p>}</div>
        </div>
      )}
      <FeedbackCapture value={feedback} onChange={setFeedback} />
      {feedback && <OutcomeCapture value={outcome} onChange={setOutcome} />}
    </section>
  );
}
