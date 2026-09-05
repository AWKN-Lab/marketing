import { NextResponse } from "next/server";
import {
  isProductOperation,
  normalizeProductResponseContract,
  validateProductRequestContract,
  type MarketingProductRequest,
  type MarketingProductResponse,
} from "@/lib/product-contract";
import { upstreamIdentityHeaders } from "@/lib/server-upstream-auth";
import { expectedWorkspaceEntityId, validateWorkspaceProductRequest } from "@/lib/workspace-contract";
import { expectedMaterialEntityId, validateMaterialProductRequest } from "@/lib/material-contract";
import { expectedTaskEntityId, validateTaskProductRequest, validateTaskProductResponse } from "@/lib/task-contract";
import {
  expectedTaskExecutionEntityId,
  validateTaskExecutionProductRequest,
  validateTaskExecutionProductResponse,
} from "@/lib/task-execution-contract";
import { expectedFeedbackEntityId, validateFeedbackProductRequest } from "@/lib/feedback-contract";
import { expectedOutcomeEntityId, validateOutcomeProductRequest } from "@/lib/outcome-contract";
import {
  expectedLearningEntityId,
  validateLearningProductRequest,
  validateLearningProductResponse,
} from "@/lib/learning-contract";
import {
  expectedEvolutionEntityId,
  validateEvolutionProductRequest,
  validateEvolutionProductResponse,
} from "@/lib/evolution-contract";

const TIMEOUT_MS = 20_000;

function traceFromHeaders(response: Response) {
  return response.headers.get("x-trace-id") ?? response.headers.get("trace-id") ?? undefined;
}

function normalizeServerFailure(response: Response, normalized: MarketingProductResponse): MarketingProductResponse {
  if (response.status < 500 || response.status > 599) return normalized;

  const traceId = normalized.trace_id ?? traceFromHeaders(response);
  if (normalized.ok) {
    return {
      ok: false,
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: `AWKN 产品接口返回 HTTP ${response.status}，拒绝接受成功信封。`,
        retryable: true,
      },
      trace_id: traceId,
    };
  }

  const currentCode = normalized.error?.code;
  const code = !currentCode || currentCode === "UNKNOWN_UPSTREAM_ERROR"
    ? "UPSTREAM_UNAVAILABLE"
    : currentCode;
  const retryable = typeof normalized.error?.retryable === "boolean"
    ? normalized.error.retryable
    : code === "UPSTREAM_UNAVAILABLE" || code === "UPSTREAM_TIMEOUT"
      ? true
      : undefined;

  return {
    ...normalized,
    error: {
      code,
      message: normalized.error?.message || `AWKN 产品接口返回 HTTP ${response.status}。`,
      retryable,
    },
    trace_id: traceId,
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

  const upstream = process.env.AWKN_MARKETING_API_URL;
  if (!upstream) {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: "PLATFORM_NOT_CONFIGURED", message: "AWKN 产品接口尚未配置；本地模式继续使用浏览器状态。", retryable: false } },
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...upstreamIdentityHeaders(request, process.env.AWKN_MARKETING_API_TOKEN),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const raw = await response.json().catch(() => null);
    let normalized = normalizeProductResponseContract(body.operation, raw, {
      expectedEntityId: expectedWorkspaceEntityId(body)
        ?? expectedMaterialEntityId(body)
        ?? expectedTaskEntityId(body)
        ?? expectedTaskExecutionEntityId(body)
        ?? expectedFeedbackEntityId(body)
        ?? expectedOutcomeEntityId(body)
        ?? expectedLearningEntityId(body)
        ?? expectedEvolutionEntityId(body),
      fallbackTraceId: traceFromHeaders(response),
      httpStatus: response.status,
    });
    normalized = normalizeServerFailure(response, normalized);
    normalized = validateTaskProductResponse(body.operation, normalized, body.task_id, body.workspace_id);
    normalized = validateTaskExecutionProductResponse(body.operation, normalized, body.task_id, body.workspace_id);
    normalized = validateLearningProductResponse(body.operation, normalized, body);
    normalized = validateEvolutionProductResponse(body.operation, normalized, body);
    const status = normalized.ok ? response.status : response.ok ? 502 : response.status;
    return NextResponse.json(normalized, { status });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json<MarketingProductResponse>(
      {
        ok: false,
        error: {
          code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
          message: timedOut ? "AWKN 产品接口请求超时。" : "暂时无法连接 AWKN 产品接口。",
          retryable: true,
        },
      },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
