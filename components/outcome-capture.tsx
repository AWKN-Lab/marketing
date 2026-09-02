"use client";

const options = ["项目推进", "获得反馈", "方案采用", "暂时搁置", "失败"];
const needsReason = new Set(["暂时搁置", "失败"]);

export function OutcomeCapture({ value, note, onChange, onNoteChange, candidateCurrent, onCreateCandidate }: { value: string | null; note: string; onChange: (value: string) => void; onNoteChange: (value: string) => void; candidateCurrent: boolean; onCreateCandidate: () => void }) {
  const noteRequired = value ? needsReason.has(value) : false;
  const canCreate = Boolean(value) && (!noteRequired || note.trim().length >= 3);

  return <div className="outcome-box">
    <div><p className="eyebrow">OUTCOME</p><strong>真实结果决定系统该学什么。</strong></div>
    <div className="row wrap gap-sm">{options.map((option) => <button type="button" className={`chip ${value === option ? "selected" : ""}`} key={option} onClick={() => onChange(option)}>{option}</button>)}</div>
    {value && <label className="outcome-note"><span>{noteRequired ? "发生了什么 / 为什么（失败与搁置必须填写）" : "结果说明（建议填写）"}</span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="例如：客户接受总体方向，但预算口径未确认，会议决定两周后再推进。" /></label>}
    {value && <div className="candidate-preview"><span className="status-ok">{noteRequired && !canCreate ? "补充原因后才能形成反例经验" : "结果已具备复盘条件"}</span><p>Candidate 会绑定任务类型、用户最终稿、Feedback、Outcome 与结果说明；修改这些内容后可重新生成并覆盖旧候选。</p><button type="button" className={`button ${candidateCurrent ? "ghost" : "primary"}`} disabled={!canCreate || candidateCurrent} onClick={onCreateCandidate}>{candidateCurrent ? "候选与当前证据一致" : "生成 / 更新 Experience Candidate"}</button></div>}
  </div>;
}
