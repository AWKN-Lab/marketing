import type { AppliedExperience } from "@/lib/types";

export function AppliedExperience({ items }: { items: AppliedExperience[] }) {
  if (!items.length) return null;
  return (
    <div className="applied-box">
      <p className="eyebrow">APPLIED EXPERIENCE</p>
      <strong>本次已应用 {items.length} 条历史经验</strong>
      {items.map((item) => (
        <div className="experience-line" key={`${item.source}-${item.lesson}`}>
          <span>↗</span>
          <div><b>{item.lesson}</b><small>{item.source}</small></div>
        </div>
      ))}
    </div>
  );
}
