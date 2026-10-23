import { NextResponse } from "next/server";
import {
  CapabilityTransportError,
  invokeCapability,
  productErrorHttpStatus,
  resolvePlatformSession,
  translateCapabilityResponse,
} from "@/lib/capability-client";
import {
  isProductOperation,
  normalizeProductResponseContract,
  validateProductRequestContract,
  type MarketingProductRequest,
  type MarketingProductResponse,
} from "@/lib/product-contract";
import { upstreamIdentityHeaders } from "@/lib/server-upstream-auth";
import { expectedWorkspaceEntityId, validateWorkspaceProductRequest } from "@/lib/workspace-contract";
import {
  expectedMaterialEntityId,
  validateMaterialProductRequest,
  validateMaterialProductResponse,
} from "@/lib/material-contract";
import { expectedTaskEntityId, validateTaskProductRequest, validateTaskProductResponse } from "@/lib/task-contract";
import {
  expectedTaskExecutionEntityId,
  validateTaskExecutionProductRequest,
  validateTaskExecutionProductResponse,
} from "@/lib/task-execution-contract";
import { expectedFeedbackEntityId, validateFeedbackProductRequest } from "@/lib/feedback-contract";
import { expectedOutcomeEntityId, validateOutcomeProductRequest } from "@/lib/outcome-contract";
import { expectedLearningEntityId, validateLearningProductRequest, validateLearningProductResponse } from "@/lib/learning-contract";
import { expectedEvolutionEntityId, validateEvolutionProductRequest, validateEvolutionProductResponse } from "@/lib/evolution-contract";

export const dynamic = "force-dynamic";

/**
 * 平台能力调用入口。
 *
 * 19 个 ProductOperation 由 AWKN OS 的 `awkn-marketing` 插件实现，
 * 经能力服务按能力名分发。本路由的职责边界：
 *  - 校验产品契约请求；
 *  - 解析平台 Session（权威身份），不转发浏览器身份；
 *  - 把能力服务结果归一化回产品契约的响应信封。
 *
 * 归一化管线（契约校验 / 实体 ID 核对 / 5xx 与 429 映射）与直连产品 API 时完全一致，
 * 差别只在传输层：从「产品 API」换成「能力服务 + 能力名」。
 */

function traceFromHeaders(headers: Headers) {
  return headers.get("x-trace-id") ?? headers.get("trace-id") ?? undefined;
}

function retryAfterFromHeaders(headers: Headers) {
  const value = headers.get("retry-after")?.trim();
  if (!value || value.length > 128) return undefined;
  if (/^\d{1,6}$/.test(value)) return value;
  return Number.isFinite(Date.parse(value)) ? value : undefined;
}

function normalizeServerFailure(status: number, headers: Headers, normalized: MarketingProductResponse): MarketingProductResponse {
  if (status < 500 || status > 599) return normalized;

  const traceId = normalized.trace_id ?? traceFromHeaders(headers);
  if (normalized.ok) {
    return {
      ok: false,
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: `AWKN 能力服务返回 HTTP ${status}，拒绝接受成功信封。`,
        retryable: true,
      },
      trace_id: traceId,
    };
  }

  const currentCode = normalized.error?.code;
  const code = !currentCode || currentCode === "UNKNOWN_UPSTREAM_ERROR" ? "UPSTREAM_UNAVAILABLE" : currentCode;
  const retryable = typeof normalized.error?.retryable === "boolean"
    ? normalized.error.retryable
    : code === "UPSTREAM_UNAVAILABLE" || code === "UPSTREAM_TIMEOUT" ? true : undefined;

  return {
    ...normalized,
    error: {
      code,
      message: normalized.error?.message || `AWKN 能力服务返回 HTTP ${status}。`,
      retryable,
    },
    trace_id: traceId,
  };
}

function normalizeRateLimitFailure(status: number, headers: Headers, normalized: MarketingProductResponse): MarketingProductResponse {
  if (status !== 429) return normalized;
  return {
    ok: false,
    error: {
      code: "RATE_LIMITED",
      message: normalized.ok
        ? "AWKN 能力服务返回 HTTP 429，拒绝接受成功信封。"
        : normalized.error?.message || "AWKN 能力服务触发限流。",
      retryable: true,
    },
    trace_id: normalized.trace_id ?? traceFromHeaders(headers),
  };
}

export async function POST(request: Request) {
  let body: Partial<MarketingProductRequest> & Record<string, unknown>;
  try {
    body = (await request.json()) as Partial<MarketingProductRequest> & Record<string, unknown>;
  } catch {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "请求体必须是 JSON。" } },
      { status: 400 },
    );
  }

  if (body.product !== "awkn-marketing" || !body.request_id) {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "缺少 product 或 request_id。" } },
      { status: 400 },
    );
  }

  if (!isProductOperation(body.operation)) {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: "UNSUPPORTED_OPERATION", message: `不支持的 operation：${String(body.operation ?? "UNKNOWN")}` } },
      { status: 400 },
    );
  }

  const capabilityEndpoint = process.env.AWKN_MARKETING_CAPABILITY_URL;
  if (!capabilityEndpoint) {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: "PLATFORM_NOT_CONFIGURED", message: "AWKN 能力服务尚未配置；本地模式继续使用浏览器状态。", retryable: false } },
      { status: 503 },
    );
  }

  const sessionEndpoint = process.env.AWKN_MARKETING_SESSION_URL;
  if (!sessionEndpoint) {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: "AUTH_REQUIRED", message: "AWKN Marketing Session 尚未配置。", retryable: false } },
      { status: 503 },
    );
  }

  const violation = validateProductRequestContract(body)
    ?? validateWorkspaceProductRequest(body)
    ?? validateMaterialProductRequest(body)
    ?? validateTaskProductRequest(body)
    ?? validateTaskExecutionProductRequest(body)
    ?? validateFeedbackProductRequest(body)
    ?? validateOutcomeProductRequest(body)
    ?? validateLearningProductRequest(body)
    ?? validateEvolutionProductRequest(body);
  if (violation) {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: violation.code, message: violation.message, retryable: false } },
      { status: 400 },
    );
  }

  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id : "";
  const identityHeaders = upstreamIdentityHeaders(request, process.env.AWKN_MARKETING_SESSION_TOKEN);
  const session = await resolvePlatformSession({
    endpoint: sessionEndpoint,
    token: process.env.AWKN_MARKETING_SESSION_TOKEN,
    identityHeaders,
    cacheKey: `${identityHeaders.authorization ?? ""}|${identityHeaders.cookie ?? ""}|${workspaceId}`,
    workspaceHint: workspaceId || undefined,
  });
  if (!session || session.mode !== "platform") {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: "AUTH_REQUIRED", message: "需要有效的平台身份才能调用营销能力。", retryable: false } },
      { status: 401 },
    );
  }

  let call: Awaited<ReturnType<typeof invokeCapability>>;
  try {
    call = await invokeCapability({
      endpoint: capabilityEndpoint,
      token: process.env.AWKN_MARKETING_CAPABILITY_TOKEN,
      session,
      request: body as MarketingProductRequest,
      requestId: body.request_id,
    });
  } catch (error) {
    if (error instanceof CapabilityTransportError) {
      return NextResponse.json<MarketingProductResponse>(
        { ok: false, error: { code: error.code, message: error.message, retryable: true } },
        { status: error.code === "UPSTREAM_TIMEOUT" ? 504 : 502 },
      );
    }
    throw error;
  }

  const raw = translateCapabilityResponse(call);
  // 只有「上游自己给出的失败」才按错误码还原状态码；
  // 路由侧校验失败（上游返回了 ok:true 但信封不合法）属于产品边界故障，一律 502。
  const upstreamErrorCode = raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { ok?: unknown }).ok === false
    ? (typeof ((raw as { error?: { code?: unknown } }).error?.code) === "string"
      ? (raw as { error: { code: string } }).error.code
      : undefined)
    : undefined;
  let normalized = normalizeProductResponseContract(body.operation, raw, {
    expectedEntityId: expectedWorkspaceEntityId(body)
      ?? expectedMaterialEntityId(body)
      ?? expectedTaskEntityId(body)
      ?? expectedTaskExecutionEntityId(body)
      ?? expectedFeedbackEntityId(body)
      ?? expectedOutcomeEntityId(body)
      ?? expectedLearningEntityId(body)
      ?? expectedEvolutionEntityId(body),
    fallbackTraceId: traceFromHeaders(call.headers),
    httpStatus: call.status,
  });
  normalized = normalizeServerFailure(call.status, call.headers, normalized);
  normalized = normalizeRateLimitFailure(call.status, call.headers, normalized);
  normalized = validateMaterialProductResponse(body.operation, normalized);
  normalized = validateTaskProductResponse(body.operation, normalized, body.task_id, body.workspace_id);
  normalized = validateTaskExecutionProductResponse(body.operation, normalized, body.task_id, body.workspace_id);
  normalized = validateLearningProductResponse(body.operation, normalized, body);
  normalized = validateEvolutionProductResponse(body.operation, normalized, body);
  const status = normalized.ok
    ? call.status
    : call.status === 200
      ? upstreamErrorCode
        ? productErrorHttpStatus(upstreamErrorCode, 502)
        : 502
      : call.status;
  const retryAfter = retryAfterFromHeaders(call.headers);
  return NextResponse.json(normalized, {
    status,
    headers: retryAfter ? { "retry-after": retryAfter } : undefined,
  });
}
