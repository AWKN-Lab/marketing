import type { MarketingProductRequest } from "@/lib/product-contract";
import type { MarketingSession } from "@/lib/product-session";

/**
 * 平台能力服务客户端（服务端侧）。
 *
 * 营销产品层的 19 个 ProductOperation 在 AWKN OS 侧由 `awkn-marketing` 插件实现，
 * 经能力服务按能力名分发。产品层不再直连产品 API：
 *
 *   POST {AWKN_MARKETING_CAPABILITY_URL}/v1/capabilities/invoke
 *   Authorization: Bearer <service token>
 *   x-awkn-session: <base64url(session json)>
 *   x-request-id: <trace>
 *
 * 纪律：
 *  - Session 只走请求头，不进请求体。调用方没有资格在 body 里自造权限；
 *  - 浏览器身份（cookie / authorization）不转发给能力服务 —— 权威身份只有平台 Session；
 *  - 能力服务返回的 result 会被翻译回「上游产品响应」形态，
 *    再交给既有的产品契约归一化管线处理，两边语义不漂移。
 */

export const CAPABILITY_SESSION_HEADER = "x-awkn-session";
const SESSION_CACHE_TTL_MS = 5_000;
const SESSION_TIMEOUT_MS = 10_000;
const CAPABILITY_TIMEOUT_MS = 20_000;

export type CapabilitySessionPayload = {
  tenantId: string;
  actorId: string;
  capabilities: string[];
  workspaceGrants: { workspaceId: string; access: string }[];
  revokedWorkspaceIds: string[];
};

export function capabilitySessionPayload(session: MarketingSession): CapabilitySessionPayload {
  return {
    tenantId: session.tenant.id,
    actorId: session.actor.id,
    capabilities: [...session.capabilities],
    workspaceGrants: session.workspaceGrants.map((grant) => ({ workspaceId: grant.workspaceId, access: grant.access })),
    revokedWorkspaceIds: [...session.revokedWorkspaceIds],
  };
}

export function encodeCapabilitySessionHeader(session: MarketingSession): string {
  return Buffer.from(JSON.stringify(capabilitySessionPayload(session)), "utf8").toString("base64url");
}

/**
 * 短缓存的平台 Session。
 *
 * 每次产品调用都回源 Session 服务会放大平台压力；缓存过久会让撤权延迟生效。
 * 5 秒是折中：撤权可见性延迟上限 5 秒，且缓存键包含身份与 Workspace，不跨租户复用。
 */
type SessionCacheEntry = { at: number; session: MarketingSession | null };
const sessionCache = new Map<string, SessionCacheEntry>();

export function clearCapabilitySessionCache(): void {
  sessionCache.clear();
}

export async function resolvePlatformSession(input: {
  endpoint: string;
  token?: string | undefined;
  identityHeaders: Record<string, string>;
  cacheKey: string;
  /** 询问平台「这个 Workspace 上的授权」，平台可按 Workspace 收敛 Grant。 */
  workspaceHint?: string | undefined;
  timeoutMs?: number;
}): Promise<MarketingSession | null> {
  const cached = sessionCache.get(input.cacheKey);
  const now = Date.now();
  if (cached && now - cached.at < SESSION_CACHE_TTL_MS) return cached.session;

  const url = new URL(input.endpoint);
  if (input.workspaceHint) url.searchParams.set("workspace_id", input.workspaceHint);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? SESSION_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/json", ...input.identityHeaders },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      sessionCache.set(input.cacheKey, { at: now, session: null });
      return null;
    }
    const payload = await response.json().catch(() => null);
    const { normalizeMarketingSession } = await import("@/lib/product-session");
    const session = normalizeMarketingSession(payload);
    sessionCache.set(input.cacheKey, { at: now, session });
    return session;
  } catch {
    sessionCache.set(input.cacheKey, { at: now, session: null });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export class CapabilityTransportError extends Error {
  readonly code: "UPSTREAM_UNAVAILABLE" | "UPSTREAM_TIMEOUT";
  readonly retryable = true;

  constructor(code: "UPSTREAM_UNAVAILABLE" | "UPSTREAM_TIMEOUT", message: string) {
    super(message);
    this.name = "CapabilityTransportError";
    this.code = code;
  }
}

export type CapabilityCall = {
  status: number;
  headers: Headers;
  /** 已解析的能力服务响应体；无法解析时为 null。 */
  body: unknown;
};

/**
 * 调用**非实体能力**（不属于 19 个产品 operation 的能力）。
 *
 * 平台插件除 19 个产品能力外还提供 `marketing.pattern.detect` 与
 * `marketing.experience.match`。它们是**派生读**：不创建、不修改任何实体，
 * 因此不属于产品契约的实体操作集，单独走一个入口。
 *
 * wire format 与实体能力完全一致（业务字段在 `input.payload`），
 * 平台侧插件按同一口径解包 —— 见 `plugins/awkn-marketing/src/plugin.ts`。
 */
export async function invokeMarketingCapability(input: {
  endpoint: string;
  token?: string | undefined;
  session: MarketingSession;
  capability: string;
  payload: unknown;
  requestId: string;
  workspaceId?: string | undefined;
  timeoutMs?: number;
}): Promise<CapabilityCall> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? CAPABILITY_TIMEOUT_MS);
  try {
    const response = await fetch(`${input.endpoint.replace(/\/+$/, "")}/v1/capabilities/invoke`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
        [CAPABILITY_SESSION_HEADER]: encodeCapabilitySessionHeader(input.session),
        "x-request-id": input.requestId,
      },
      body: JSON.stringify({
        capability: input.capability,
        input: {
          product: "awkn-marketing",
          operation: input.capability,
          request_id: input.requestId,
          workspace_id: input.workspaceId,
          payload: input.payload,
        },
        idempotencyKey: input.requestId,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = null; }
    }
    return { status: response.status, headers: response.headers, body };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new CapabilityTransportError(
      timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
      timedOut ? "AWKN 能力服务请求超时。" : "暂时无法连接 AWKN 能力服务。",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function invokeCapability(input: {
  endpoint: string;
  token?: string | undefined;
  session: MarketingSession;
  request: MarketingProductRequest;
  requestId: string;
  timeoutMs?: number;
}): Promise<CapabilityCall> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? CAPABILITY_TIMEOUT_MS);
  try {
    const response = await fetch(`${input.endpoint.replace(/\/+$/, "")}/v1/capabilities/invoke`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
        [CAPABILITY_SESSION_HEADER]: encodeCapabilitySessionHeader(input.session),
        "x-request-id": input.requestId,
      },
      body: JSON.stringify({
        capability: input.request.operation,
        input: {
          product: input.request.product,
          operation: input.request.operation,
          request_id: input.request.request_id,
          idempotency_key: input.request.idempotency_key,
          workspace_id: input.request.workspace_id,
          task_id: input.request.task_id,
          payload: input.request.payload,
        },
        idempotencyKey: input.request.idempotency_key,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = null; }
    }
    return { status: response.status, headers: response.headers, body };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new CapabilityTransportError(
      timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
      timedOut ? "AWKN 能力服务请求超时。" : "暂时无法连接 AWKN 能力服务。",
    );
  } finally {
    clearTimeout(timeout);
  }
}

type CapabilityEnvelope = {
  ok: true;
  result: {
    ok: boolean;
    output?: unknown;
    error?: { code?: string; message?: string; retryable?: boolean };
    traceId?: string;
  };
};

function readCapabilityEnvelope(body: unknown): CapabilityEnvelope | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const row = body as Record<string, unknown>;
  if (row.ok !== true) return null;
  const result = row.result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const detail = result as Record<string, unknown>;
  if (typeof detail.ok !== "boolean") return null;
  return {
    ok: true,
    result: {
      ok: detail.ok,
      output: detail.output,
      error: detail.error && typeof detail.error === "object" && !Array.isArray(detail.error)
        ? detail.error as { code?: string; message?: string; retryable?: boolean }
        : undefined,
      traceId: typeof detail.traceId === "string" ? detail.traceId : undefined,
    },
  };
}

/**
 * 产品错误码 → HTTP 状态。
 *
 * 能力服务把业务失败放在 200 + `result.ok=false` 里（HTTP 层只表达传输/鉴权/限流），
 * 所以产品路由必须从错误码还原状态码，否则「授权被拒」会被报成 502。
 * 映射与直连产品 API 时代的对外语义保持一致。
 */
export const PRODUCT_ERROR_HTTP_STATUS: Record<string, number> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  WORKSPACE_REVOKED: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  REVISION_CONFLICT: 409,
  INVALID_REVISION: 409,
  IDEMPOTENCY_CONFLICT: 409,
  UPSTREAM_TIMEOUT: 504,
  UPSTREAM_UNAVAILABLE: 503,
  UNSUPPORTED_OPERATION: 400,
  // 其余（VALIDATION_ERROR / MISSING_ENTITY_ACK / IDENTITY_MISMATCH / RUN_FAILED / ...）
  // 都属于「上游返回了不该返回的东西」，统一按产品边界故障 502。
};

export function productErrorHttpStatus(code: string | undefined, fallback: number): number {
  if (!code) return fallback;
  return PRODUCT_ERROR_HTTP_STATUS[code] ?? fallback;
}

/**
 * 把能力服务响应翻译成「上游产品响应」形态。
 *
 * 翻译后交给 `normalizeProductResponseContract` 等既有管线，
 * 保证产品层看到的错误码语义（VALIDATION_ERROR / IDENTITY_MISMATCH / ...）不变。
 */
export function translateCapabilityResponse(call: CapabilityCall): unknown {
  if (call.status !== 200) {
    // 能力服务在 HTTP 失败时给的是 { ok:false, error:"<CODE>" }（字符串）。
    // 若上游给出的是结构化产品信封，原样透传 —— 既有的 5xx / 429 归一化管线
    // 依赖信封里的 ok、error 与 trace_id，不能在这里被抹掉。
    const body = call.body && typeof call.body === "object" && !Array.isArray(call.body)
      ? call.body as Record<string, unknown>
      : null;
    if (body && typeof body.ok === "boolean") return body;
    const code = call.status === 401
      ? "AUTH_REQUIRED"
      : call.status === 403
        ? "FORBIDDEN"
        : call.status === 404
          ? "UNSUPPORTED_OPERATION"
          : call.status === 429
            ? "RATE_LIMITED"
            : call.status >= 500
              ? "UPSTREAM_UNAVAILABLE"
              : "UNKNOWN_UPSTREAM_ERROR";
    return { ok: false, error: { code, message: `AWKN 能力服务返回 HTTP ${call.status}。`, retryable: call.status === 429 || call.status >= 500 } };
  }

  const envelope = readCapabilityEnvelope(call.body);
  if (!envelope) return null;

  const { result } = envelope;
  if (result.ok) {
    return { ok: true, data: result.output, trace_id: result.traceId };
  }
  return {
    ok: false,
    error: {
      code: result.error?.code ?? "UNKNOWN_UPSTREAM_ERROR",
      message: result.error?.message ?? "AWKN 能力服务返回失败响应。",
      retryable: result.error?.retryable,
    },
    trace_id: result.traceId,
  };
}
