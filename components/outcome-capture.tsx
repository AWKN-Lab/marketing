"use client";

const options = ["项目推进", "获得反馈", "方案采用", "暂时搁置", "失败"];

export function OutcomeCapture({ value, onChange, candidateCreated, onCreateCandidate }: { value: string | null; onChange: (value: string) => void; candidateCreated: boolean; onCreateCandidate: () => void }) {
  return (
    <div className="outcome-box">
      <div><p className="eyebrow">OUTCOME</p><strong>记录真实结果，帮助系统判断方法是否有效。</strong></div>
      <div className="row wrap gap-sm">{options.map((option) => <button type="button" className={`chip ${value === option ? "selected" : ""}`} key={option} onClick={() => onChange(option)}>{option}</button>)}</div>
      {value && <div className="candidate-preview"><span className="status-ok">结果已具备复盘条件</span><p>AI 初稿、用户最终稿、Feedback 与 Outcome 将共同成为 Experience Candidate 的证据。</p><button type="button" className={`button ${candidateCreated ? "ghost" : "primary"}`} disabled={candidateCreated} onClick={onCreateCandidate}>{candidateCreated ? "已生成候选" : "生成 Experience Candidate"}</button></div>}
    </div>
  );
}
