import type { PatternSignal } from "@/lib/pattern-detection";
import type { PatternSample } from "@/lib/pattern-detection";

export type PatternDetectResponse = {
  ok: boolean;
  data?: { patterns: PatternSignal[]; detected_count: number };
  error?: { code: string; message: string; retryable?: boolean };
  trace_id?: string;
};

/**
 * 调用平台的跨任务重复模式检测。
 *
 * 平台模式下，模式由 AWKN OS 营销插件（`marketing.pattern.detect`）计算 ——
 * 产品层只负责送样本、收结果。本地模式不走这里。
 */
export async function callPatternDetect(input: {
  workspaceId?: string;
  samples: PatternSample[];
  requestId: string;
}): Promise<PatternDetectResponse> {
  try {
    const response = await fetch("/api/patterns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        product: "awkn-marketing",
        request_id: input.requestId,
        workspace_id: input.workspaceId,
        samples: input.samples,
      }),
    });
    const payload = (await response.json().catch(() => null)) as PatternDetectResponse | null;
    if (payload) return payload;
    return { ok: false, error: { code: "INVALID_PRODUCT_RESPONSE", message: "产品接口返回了无效响应。", retryable: true } };
  } catch {
    return { ok: false, error: { code: "PRODUCT_API_UNAVAILABLE", message: "暂时无法连接产品接口。", retryable: true } };
  }
}
