"use client";

const options = ["项目推进", "获得反馈", "方案采用", "暂时搁置", "失败"];

export function OutcomeCapture({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
  return (
    <div className="outcome-box">
      <div><p className="eyebrow">OUTCOME</p><strong>记录真实结果，帮助系统判断方法是否有效。</strong></div>
      <div className="row wrap gap-sm">
        {options.map((option) => <button type="button" className={`chip ${value === option ? "selected" : ""}`} key={option} onClick={() => onChange(option)}>{option}</button>)}
      </div>
      {value && <div className="candidate-preview"><span className="status-ok">可进入任务复盘</span><p>AI 初稿、用户最终稿、Feedback 与 Outcome 将共同形成 Experience Candidate 的证据。</p></div>}
    </div>
  );
}
