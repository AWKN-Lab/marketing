import {
  agentRunIdempotencyKey,
  normalizeAgentRuntimeResponse,
  normalizeMarketingAgentInput,
} from "@/lib/agent-contract";
import { upstreamIdentityHeaders } from "@/lib/server-upstream-auth";

function timeoutMs() {
  const configured = Number(process.env.AWKN_MARKETING_AGENT_TIMEOUT_MS ?? "30000");
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 30_000;
}

function traceFromHeaders(response: Response) {
  return response.headers.get("x-trace-id") ?? response.headers.get("trace-id") ?? undefined;
}

function errorResponse(code: string, message: string, status: number, retryable = false, traceId?: string) {
  return Response.json({ ok: false, error: { code, message, retryable }, trace_id: traceId }, { status });
}

export async function POST(request: Request) {
  const endpoint = process.env.AWKN_MARKETING_AGENT_URL;
  if (!endpoint) return errorResponse("UPSTREAM_UNAVAILABLE", "AWKN Agent Runtime 尚未配置。", 503, false);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Agent 请求体必须是 JSON。", 400);
  }

  const normalizedInput = normalizeMarketingAgentInput(raw);
  if (!normalizedInput.ok) return errorResponse(normalizedInput.error.code, normalizedInput.error.message, normalizedInput.error.code === "FORBIDDEN" || normalizedInput.error.code === "WORKSPACE_REVOKED" ? 403 : 400);
  const input = normalizedInput.data;
  const idempotencyKey = agentRunIdempotencyKey(input.taskId, input.logicalActionId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...upstreamIdentityHeaders(request, process.env.AWKN_MARKETING_AGENT_TOKEN),
        "x-request-id": input.requestId,
        "x-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        product: "awkn-marketing",
        operation: "task.run",
        request_id: input.requestId,
        idempotency_key: idempotencyKey,
        workspace_id: input.workspaceId,
        task_id: input.taskId,
        payload: input,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const fallbackTraceId = traceFromHeaders(upstream);
    const payload = await upstream.json().catch(() => null);
    if (!payload) return errorResponse("UNKNOWN_UPSTREAM_ERROR", "AWKN Agent 返回了非 JSON 响应。", 502, true, fallbackTraceId);

    const normalizedResult = normalizeAgentRuntimeResponse(payload, {
      taskId: input.taskId,
      appliedExperienceIds: input.appliedExperienceIds,
      fallbackTraceId,
    });
    if (!normalizedResult.ok) {
      const code = normalizedResult.error?.code ?? "RUN_FAILED";
      const status = upstream.status === 401 ? 401
        : upstream.status === 403 ? 403
          : upstream.status === 429 ? 429
            : code === "IDENTITY_MISMATCH" || code === "VALIDATION_ERROR" || code === "UNSUPPORTED_OPERATION" ? 502
              : upstream.ok ? 502 : upstream.status;
      return Response.json(normalizedResult, { status });
    }
    return Response.json(normalizedResult, { status: 200 });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return errorResponse(
      timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
      timedOut ? "AWKN Agent 执行超时，可使用同一逻辑动作重试。" : "暂时无法连接 AWKN Agent Runtime。",
      timedOut ? 504 : 502,
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}
