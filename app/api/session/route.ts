import { NextResponse } from "next/server";
import {
  LOCAL_MARKETING_SESSION,
  normalizeMarketingSession,
  sessionErrorCodeForStatus,
  type SessionErrorCode,
} from "@/lib/product-session";
import { upstreamIdentityHeaders } from "@/lib/server-upstream-auth";

export const dynamic = "force-dynamic";
const SESSION_TIMEOUT_MS = 10_000;

type SessionErrorBody = {
  error: SessionErrorCode;
  message: string;
  retryable?: boolean;
  trace_id?: string;
};

function errorResponse(
  status: number,
  error: SessionErrorCode,
  message: string,
  options: { retryable?: boolean; traceId?: string } = {},
) {
  const body: SessionErrorBody = {
    error,
    message,
    retryable: options.retryable,
    trace_id: options.traceId,
  };
  return NextResponse.json(body, { status });
}

function traceIdFromResponse(response: Response, payload: unknown) {
  const row = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const payloadTrace = typeof row?.trace_id === "string" ? row.trace_id.trim() : "";
  return payloadTrace || response.headers.get("x-trace-id") || undefined;
}

export async function GET(request: Request) {
  const endpoint = process.env.AWKN_MARKETING_SESSION_URL;
  if (!endpoint) {
    const allowLocal = process.env.NODE_ENV !== "production" || process.env.AWKN_MARKETING_ALLOW_LOCAL_SESSION === "true";
    if (allowLocal) return NextResponse.json(LOCAL_MARKETING_SESSION);
    return errorResponse(503, "SESSION_UNAVAILABLE", "AWKN Marketing Session 尚未配置。", { retryable: false });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { accept: "application/json", ...upstreamIdentityHeaders(request, process.env.AWKN_MARKETING_SESSION_TOKEN) },
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    const traceId = traceIdFromResponse(response, payload);

    if (!response.ok) {
      const error = sessionErrorCodeForStatus(response.status);
      return errorResponse(
        response.status,
        error,
        error === "AUTH_REQUIRED" ? "需要登录后才能进入营销工作区。" : error === "FORBIDDEN" ? "当前身份无权进入营销工作区。" : "AWKN Session 服务暂时不可用。",
        { retryable: response.status === 429 || response.status >= 500, traceId },
      );
    }

    const session = normalizeMarketingSession(payload);
    if (!session || session.mode !== "platform") {
      return errorResponse(502, "INVALID_SESSION_RESPONSE", "AWKN Session 返回了无效或非平台身份。", { retryable: false, traceId });
    }
    return NextResponse.json(session);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return errorResponse(
      timedOut ? 504 : 502,
      "SESSION_UNAVAILABLE",
      timedOut ? "AWKN Session 请求超时。" : "暂时无法连接 AWKN Session 服务。",
      { retryable: true },
    );
  } finally {
    clearTimeout(timeout);
  }
}
