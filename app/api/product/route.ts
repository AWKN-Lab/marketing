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

const TIMEOUT_MS = 20_000;

function traceFromHeaders(response: Response) {
  return response.headers.get("x-trace-id") ?? response.headers.get("trace-id") ?? undefined;
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
    ?? validateTaskExecutionProductRequest(body);
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
        ?? expectedTaskExecutionEntityId(body),
      fallbackTraceId: traceFromHeaders(response),
      httpStatus: response.status,
    });
    normalized = validateTaskProductResponse(body.operation, normalized, body.task_id, body.workspace_id);
    normalized = validateTaskExecutionProductResponse(body.operation, normalized, body.task_id, body.workspace_id);
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
