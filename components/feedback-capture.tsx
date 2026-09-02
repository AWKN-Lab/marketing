"use client";

const options = ["采用", "部分采用", "需要修改", "放弃"];

export function FeedbackCapture({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
  return (
    <div className="learning-strip">
      <div><p className="eyebrow">FEEDBACK</p><strong>这份结果怎么处理？</strong></div>
      <div className="row wrap gap-sm">
        {options.map((option) => <button type="button" key={option} className={`chip ${value === option ? "selected" : ""}`} onClick={() => onChange(option)}>{option}</button>)}
      </div>
    </div>
  );
}
