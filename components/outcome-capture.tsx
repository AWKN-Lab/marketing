"use client";

import { OUTCOME_UNKNOWN, OUTCOME_VALUES, isOutcomeInput, requiresOutcomeReason } from "@/lib/outcome-contract";

const options = [...OUTCOME_VALUES, OUTCOME_UNKNOWN] as const;

function optionLabel(value: (typeof options)[number]) {
  return value === OUTCOME_UNKNOWN ? "还不知道" : value;
}

export function OutcomeCapture({ value, note, onChange, onNoteChange, candidateCurrent, onCreateCandidate }: { value: string | null; note: string; onChange: (value: string) => void; onNoteChange: (value: string) => void; candidateCurrent: boolean; onCreateCandidate: () => void }) {
  const validValue = isOutcomeInput(value);
  const unknown = value === OUTCOME_UNKNOWN;
  const noteRequired = requiresOutcomeReason(value);
  const canSubmit = validValue && (!noteRequired || note.trim().length >= 3);
  const buttonDisabled = !canSubmit || (!unknown && candidateCurrent);

  return <div className="outcome-box">
    <div><p className="eyebrow">OUTCOME</p><strong>真实结果决定系统该学什么。</strong></div>
    <div className="row wrap gap-sm">{options.map((option) => <button type="button" className={`chip ${value === option ? "selected" : ""}`} key={option} onClick={() => onChange(option)}>{optionLabel(option)}</button>)}</div>
    {validValue && <label className="outcome-note"><span>{noteRequired ? "发生了什么 / 为什么（失败与搁置必须填写）" : unknown ? "当前未知的原因（可选）" : "结果说明（建议填写）"}</span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder={unknown ? "例如：客户尚未回复，当前结果未知。" : "例如：客户接受总体方向，但预算口径未确认，会议决定两周后再推进。"} /></label>}
    {validValue && <div className="candidate-preview"><span className="status-ok">{unknown ? "结果保持 UNKNOWN，不生成 Experience Candidate" : noteRequired && !canSubmit ? "补充原因后才能形成反例经验" : "结果已具备复盘条件"}</span><p>{unknown ? "后续拿到真实结果后可重新记录；当前未知状态会作为独立 Outcome 事件留痕。" : "Candidate 会绑定任务类型、用户最终稿、Feedback、Outcome 与结果说明；修改这些内容后可重新生成并覆盖旧候选。"}</p><button type="button" className={`button ${!unknown && candidateCurrent ? "ghost" : "primary"}`} disabled={buttonDisabled} onClick={onCreateCandidate}>{unknown ? "记录当前未知状态" : candidateCurrent ? "候选与当前证据一致" : "生成 / 更新 Experience Candidate"}</button></div>}
  </div>;
}
