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
  material_id?: string;
  entity_id?: string;
  parse_status?: string;
  status?: string;
  parsed_text?: string;
  evidence?: unknown[];
  revision?: number;
  updated_at?: string;
  run_id?: string;
  attempt?: number;
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
  updatedAt?: string;
  runId?: string;
  attempt?: number;
  error?: { code: string; message: string; retryable?: boolean };
};

function validRevision(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validUpdatedAt(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function parseState(value: unknown): MaterialParseState | null {
  const status = typeof value === "string" ? value.toLowerCase() : "";
  if (["queued", "waiting", "pending"].includes(status)) return "queued";
  if (["parsing", "processing", "extracting", "indexing", "running", "in_progress"].includes(status)) return "parsing";
  if (["ready", "completed", "complete", "done", "parsed", "success", "succeeded"].includes(status)) return "ready";
  if (["failed", "error", "rejected"].includes(status)) return "failed";
  return null;
}

export function normalizeMaterialParseState(value: unknown): MaterialParseState {
  return parseState(value) ?? "queued";
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

export function normalizeMaterialUploadAck(
  response: MaterialUploadAck,
  expectedMaterialId: string,
  options: { strict?: boolean } = {},
): MaterialPlatformResult {
  if (!response.ok) {
    const localOnly = response.error?.code === "PLATFORM_NOT_CONFIGURED";
    const state: MaterialParseState = localOnly ? "local-only" : "failed";
    return { ok: false, state, label: materialParseLabel(state), evidence: [], traceId: response.trace_id, error: response.error };
  }

  const data = response.data;
  const materialId = typeof data?.material_id === "string" && data.material_id.trim()
    ? data.material_id.trim()
    : typeof data?.entity_id === "string" ? data.entity_id.trim() : "";
  if (!materialId) {
    const error = { code: "MISSING_MATERIAL_ACK", message: `平台没有确认资料 ID：${expectedMaterialId}` };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }
  if (materialId !== expectedMaterialId) {
    const error = { code: "MATERIAL_IDENTITY_MISMATCH", message: `平台返回资料 ID ${materialId}，与产品 ID ${expectedMaterialId} 不一致。` };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }

  if (options.strict && !validRevision(data?.revision)) {
    const error = { code: "INVALID_REVISION", message: `平台返回了无效资料 revision：${String(data?.revision ?? "MISSING")}` };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }
  if (typeof data?.revision !== "undefined" && !validRevision(data.revision)) {
    const error = { code: "INVALID_REVISION", message: `平台返回了无效资料 revision：${String(data.revision)}` };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }
  if (options.strict && !validUpdatedAt(data?.updated_at)) {
    const error = { code: "VALIDATION_ERROR", message: "平台资料 Ack 缺少有效 updated_at。" };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }
  if (typeof data?.updated_at !== "undefined" && !validUpdatedAt(data.updated_at)) {
    const error = { code: "VALIDATION_ERROR", message: "平台资料 Ack 返回了无效 updated_at。" };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }

  const stateValue = data?.parse_status ?? data?.status;
  const normalizedState = parseState(stateValue);
  if (options.strict && !normalizedState) {
    const error = { code: "VALIDATION_ERROR", message: "平台资料 Ack 缺少有效 parse_status / status。" };
    return { ok: false, state: "failed", label: materialParseLabel("failed"), evidence: [], traceId: response.trace_id, error };
  }

  const state = normalizedState ?? "queued";
  const revision = data?.revision;
  const updatedAt = data?.updated_at;
  const runId = data?.run_id;
  const attempt = data?.attempt;
  return {
    ok: true,
    state,
    label: materialParseLabel(state),
    parsedText: typeof data?.parsed_text === "string" ? data.parsed_text : undefined,
    evidence: normalizeEvidence(data?.evidence),
    traceId: response.trace_id,
    revision: validRevision(revision) ? revision : undefined,
    updatedAt: validUpdatedAt(updatedAt) ? updatedAt : undefined,
    runId: typeof runId === "string" && runId.trim() ? runId.trim() : undefined,
    attempt: typeof attempt === "number" && Number.isSafeInteger(attempt) && attempt > 0 ? attempt : undefined,
    error: state === "failed" ? { code: "MATERIAL_PARSE_FAILED", message: "AWKN 返回资料解析失败。", retryable: true } : undefined,
  };
}
