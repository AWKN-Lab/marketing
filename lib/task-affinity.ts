/**
 * 任务类型亲缘关系。
 *
 * PRD §21.1 C 把「重复模式」定义为「**相似场景**反复出现相同修改、相同选择或相同结果」，
 * PRD 验收第 10 条要求「至少有 5 个 Candidate 在后续**相似任务**中被再次匹配」。
 * 因此经验匹配不能只做 taskType 全等 —— 全等匹配直接违反 PRD。
 *
 * 纪律：
 * 1. 亲缘关系是**显式的生产链**，不是字符串相似度猜测 —— 「资料消化」和「方案 / 内容」
 *    看起来不像，但「营销研究」和「任务复盘」看起来像却毫无关系。
 * 2. 只走 **1 跳**。跨两跳的推断太弱，宁可漏也不猜。
 * 3. 亲缘匹配**降权**并**标注来源类型**，用户必须能看出这是跨类型推断而不是同类型命中。
 * 4. 审核层是唯一否决权来源：匹配层不得放宽「用户已否决」。
 * 5. 「任务复盘」没有跨类型边 —— 复盘的教训针对被复盘的任务，不构成可迁移方法。
 *
 * ⚠️ 本表与平台插件 `plugins/awkn-marketing/src/task-affinity.ts` **必须保持一致**。
 * 两侧各有一份断言同一组期望值的测试（见 `scripts/p6-experience-match.ts` 与插件测试），
 * 任何一侧改动都会让另一侧的测试失败。
 */

export type RelatedTaskType = {
  /** 目标任务类型。 */
  taskType: string;
  /** 跨类型命中的权重，作用在候选自身 confidence 上。 */
  weight: number;
};

/** 有向亲缘边：key 的经验可以用于 value 的任务。 */
export const RELATED_TASK_TYPES: Readonly<Record<string, readonly RelatedTaskType[]>> = {
  资料消化: [{ taskType: "营销研究", weight: 0.8 }],
  营销研究: [{ taskType: "策略判断", weight: 0.8 }],
  策略判断: [{ taskType: "方案 / 内容", weight: 0.8 }],
  "方案 / 内容": [{ taskType: "会前 / 沟通", weight: 0.8 }],
  "会前 / 沟通": [{ taskType: "方案 / 内容", weight: 0.7 }],
  任务复盘: [],
};

export type TaskTypeRelation = {
  /** same = 同类型命中；related = 跨类型亲缘命中。 */
  relation: "same" | "related";
  /** 权重系数：同类型 1，跨类型取亲缘边上的 weight。 */
  weight: number;
  /** 经验来源的任务类型。 */
  sourceTaskType: string;
};

/**
 * 判断来源任务类型能否用于目标任务类型。
 *
 * 返回 null 表示不匹配（无亲缘关系）。同类型永远匹配，权重 1。
 */
export function matchTaskType(sourceTaskType: string, targetTaskType: string): TaskTypeRelation | null {
  const source = sourceTaskType.trim();
  const target = targetTaskType.trim();
  if (!source || !target) return null;
  if (source === target) return { relation: "same", weight: 1, sourceTaskType: source };
  const related = RELATED_TASK_TYPES[source] ?? [];
  const hit = related.find((item) => item.taskType === target);
  if (!hit) return null;
  return { relation: "related", weight: hit.weight, sourceTaskType: source };
}
