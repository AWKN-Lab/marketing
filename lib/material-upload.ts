import type { MarketingProductResponse } from "@/lib/product-contract";

export type MaterialEvidence = {
  type: string;
  title: string;
  snippet: string;
  source: string;
  time?: string;
};

export type MaterialParseState = "uploading" | "queued" | "parsing" | "ready" | "failed" | "local-only";

export type MaterialUploadData = {
  material_id: string;
  parse_status?: string;
  parsed_text?: string;
  evidence?: unknown[];
  revision?: number;
  updated_at?: string;
};

export type MaterialUploadAck = MarketingProductResponse<MaterialUploadData>;

export type MaterialPlatformResult = {
  ok: boolean;
  state: MaterialParseState;
  label: string;
  parsedText?: string;
  evidence: MaterialEvidence[];
  traceId?: string;
  revision?: number;
  error?: { code: string; message: string; retryable?: boolean };
};

export function normalizeMaterialParseState(value: unknown): MaterialParseState {
  const status = typeof value === "string" ? value.toLowerCase() : "queued";
  if (["ready", "completed", "complete", "done", "parsed", "success"].includes(status)) return "ready";
  if (["parsing", "processing", "extracting", "indexing"].includes(status)) return "parsing";
  if (["failed", "error", "rejected"].includes(status)) return "failed";
  return "queued";
}

export function materialParseLabel(state: MaterialParseState) {
  if (state === "uploading") return "上传中";
  if (state === "queued") return "已上传 · 等待 AWKN 解析";
  if (state === "parsing") return "AWKN 解析中";
  if (state === "ready") return "AWKN 已解析";
  if (state === "failed") return "解析失败";
  return "仅本地 · 等待 AWKN 上传接口";
}

function normalizeEvidence(value: unknown): MaterialEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const snippet = typeof record.snippet === "string" ? record.snippet : typeof record.text === "string" ? record.text : "";
    if (!snippet.trim()) return [];
    return [{
      type: typeof record.type === "string" ? record.type : "MATERIAL",
      title: typeof record.title === "string" ? record.title : `解析片段 ${index + 1}`,
      snippet,
      source: typeof record.source === "string" ? record.source : "AWKN material parser",
      time: typeof record.time === "string" ? record.time : undefined,
    }];
  });
}

export function normalizeMaterialUploadAck(response: MaterialUploadAck, expectedMaterialId: string): MaterialPlatformResult {
  if (!response.ok) {
    const localOnly = response.error?.code === "PLATFORM_NOT_CONFIGURED";
    const state: MaterialParseState = localOnly ? "local-only" : "failed";
    return { ok: false, state, label: materialParseLabel(state), evidence: [], traceId: response.trace_id, error: response.error };
  }
  if (!response.data || typeof response.data.material_id !== "string") {
    const error = { code: "MISSING_MATERIAL_ACK", message: `平台没有确认资料 ID：${expectedMaterialId}` };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }
  if (response.data.material_id !== expectedMaterialId) {
    const error = { code: "MATERIAL_IDENTITY_MISMATCH", message: `平台返回资料 ID ${response.data.material_id}，与产品 ID ${expectedMaterialId} 不一致。` };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }
  const state = normalizeMaterialParseState(response.data.parse_status);
  return {
    ok: state !== "failed",
    state,
    label: materialParseLabel(state),
    parsedText: typeof response.data.parsed_text === "string" ? response.data.parsed_text : undefined,
    evidence: normalizeEvidence(response.data.evidence),
    traceId: response.trace_id,
    revision: response.data.revision,
    error: state === "failed" ? { code: "MATERIAL_PARSE_FAILED", message: "AWKN 返回资料解析失败。" } : undefined,
  };
}
