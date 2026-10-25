export type P6FailureContext = {
  operation?: string;
  entityId?: string;
  traceId?: string;
};

export const P6_TEST_DATA_KINDS = ["fixture", "synthetic", "real-acceptance"] as const;
export type P6TestDataKind = (typeof P6_TEST_DATA_KINDS)[number];

export async function runP6Case(name: string, fn: () => void | Promise<void>, context: P6FailureContext = {}) {
  try {
    await fn();
    console.log(`[P6][PASS] ${name}`);
  } catch (error) {
    const summary = [
      context.operation ? `operation=${context.operation}` : "",
      context.entityId ? `entity=${context.entityId}` : "",
      context.traceId ? `trace=${context.traceId}` : "",
    ].filter(Boolean).join(" ");
    console.error(`[P6][FAIL] ${name}${summary ? ` ${summary}` : ""}`);
    throw error;
  }
}

export function readIntegrationConfig() {
  const dataKind = (process.env.AWKN_MARKETING_TEST_DATA || "synthetic") as P6TestDataKind;
  if (!P6_TEST_DATA_KINDS.includes(dataKind)) {
    throw new Error(`Unsupported AWKN_MARKETING_TEST_DATA: ${dataKind}`);
  }

  return {
    enabled: process.env.AWKN_P6_INTEGRATION === "true",
    allowLocalSession: process.env.AWKN_MARKETING_ALLOW_LOCAL_SESSION === "true",
    dataKind,
    endpoints: {
      session: process.env.AWKN_MARKETING_SESSION_URL || "",
      agent: process.env.AWKN_MARKETING_AGENT_URL || "",
      product: process.env.AWKN_MARKETING_API_URL || "",
      material: process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL || "",
    },
    tokenConfigured: {
      session: Boolean(process.env.AWKN_MARKETING_SESSION_TOKEN),
      agent: Boolean(process.env.AWKN_MARKETING_AGENT_TOKEN),
      product: Boolean(process.env.AWKN_MARKETING_API_TOKEN),
      material: Boolean(process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN),
    },
  };
}

/**
 * 共享的产品上游 mock。
 *
 * 「上游」现在是 AWKN 能力服务，而不是营销产品 API：
 *  - Session 端点 → 按请求里的 workspace_id 合成一个平台 Session；
 *  - 能力端点 → 把能力请求还原成旧的产品请求体交给脚本自己的 responder，
 *    再把 responder 的产品响应翻译回能力服务真实会返回的形态。
 *
 * 翻译规则严格对齐能力服务的真实契约（`{ ok:true, result }`）：
 *  - 200 + 产品成功信封 → 200 + `{ ok:true, result:{ ok:true, output } }`
 *  - 200 + 产品失败信封 → 200 + `{ ok:true, result:{ ok:false, error } }`（业务失败不走 HTTP 状态）
 *  - 200 + 非信封 body  → 200 + 原始文本（能力服务不会这么返回，路由应按无效信封处理）
 *  - 429 / 5xx         → 原样透传（限流与服务不可用是传输层语义）
 *  - 其他 4xx + 产品错误信封 → 200 + `{ ok:true, result:{ ok:false, error } }`
 *
 * 脚本自己的 responder 仍然只写「产品响应」，不需要知道能力服务的存在。
 */

export type ProductUpstreamResponder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const P6_CAPABILITY_ENDPOINT = "https://capability.integration.invalid";
export const P6_SESSION_ENDPOINT = "https://session.integration.invalid";

const P6_ALL_CAPABILITIES = [
  "workspace.read",
  "workspace.create",
  "workspace.write",
  "material.write",
  "task.create",
  "task.run",
  "feedback.write",
  "outcome.write",
  "evolution.review",
  "learning.manage",
  "team.manage",
];

function p6SessionPayload(workspaceId: string | null) {
  return {
    mode: "platform",
    tenant_id: "tenant-p6",
    actor_id: "actor-p6",
    tenant: { id: "tenant-p6", name: "P6 Tenant" },
    actor: { id: "actor-p6", name: "P6 Actor" },
    roles: ["owner"],
    capabilities: P6_ALL_CAPABILITIES,
    workspace_grants: workspaceId ? [{ workspace_id: workspaceId, access: "admin" }] : [],
    revoked_workspace_ids: [],
    team_enabled: true,
  };
}

function isProductEnvelope(value: unknown): value is { ok: boolean; data?: unknown; error?: Record<string, unknown>; trace_id?: string } {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && typeof (value as { ok?: unknown }).ok === "boolean";
}

export async function withCapabilityUpstream<T>(responder: ProductUpstreamResponder, run: () => Promise<T>): Promise<T> {
  const previousCapability = process.env.AWKN_MARKETING_CAPABILITY_URL;
  const previousSession = process.env.AWKN_MARKETING_SESSION_URL;
  const previousToken = process.env.AWKN_MARKETING_CAPABILITY_TOKEN;
  const previousFetch = globalThis.fetch;

  process.env.AWKN_MARKETING_CAPABILITY_URL = P6_CAPABILITY_ENDPOINT;
  process.env.AWKN_MARKETING_SESSION_URL = P6_SESSION_ENDPOINT;
  process.env.AWKN_MARKETING_CAPABILITY_TOKEN = "service-secret";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.startsWith(P6_SESSION_ENDPOINT)) {
      const workspaceId = new URL(url).searchParams.get("workspace_id");
      return new Response(JSON.stringify(p6SessionPayload(workspaceId)), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (!url.startsWith(P6_CAPABILITY_ENDPOINT)) {
      throw new Error(`P6_UNEXPECTED_UPSTREAM:${url}`);
    }

    const capabilityBody = JSON.parse(String(init?.body ?? "{}")) as { input?: Record<string, unknown> };
    const productBody = capabilityBody.input ?? {};
    let legacy: Response;
    try {
      legacy = await responder(input, { ...init, body: JSON.stringify(productBody) });
    } catch (error) {
      // 脚本自己的断言失败必须响亮地冒出来，不能被当成「上游不可用」吞掉。
      if (error && typeof error === "object" && (error as { name?: string }).name === "AssertionError") throw error;
      throw error;
    }

    const legacyText = await legacy.clone().text();
    let parsed: unknown = null;
    try { parsed = legacyText ? JSON.parse(legacyText) : null; } catch { parsed = null; }

    const passthrough = () => new Response(legacyText, { status: legacy.status, headers: legacy.headers });

    // 限流与服务不可用是传输层语义，原样透传。
    if (legacy.status === 429 || legacy.status >= 500) return passthrough();

    // 能力服务只会用 200 承载业务结果。
    if (legacy.status === 200) {
      if (!isProductEnvelope(parsed)) return passthrough();
      const traceId = typeof parsed.trace_id === "string" ? parsed.trace_id : legacy.headers.get("x-trace-id") ?? undefined;
      if (parsed.ok) {
        return new Response(JSON.stringify({ ok: true, result: { ok: true, output: parsed.data, traceId } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const error = parsed.error && typeof parsed.error === "object" && !Array.isArray(parsed.error)
        ? parsed.error as Record<string, unknown>
        : {};
      return new Response(JSON.stringify({
        ok: true,
        result: {
          ok: false,
          error: {
            code: typeof error.code === "string" ? error.code : undefined,
            message: typeof error.message === "string" ? error.message : undefined,
            retryable: typeof error.retryable === "boolean" ? error.retryable : undefined,
          },
          traceId,
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    // 其他 4xx：若带产品错误信封，按业务失败处理；否则原样透传。
    if (isProductEnvelope(parsed) && parsed.ok === false) {
      const error = parsed.error && typeof parsed.error === "object" && !Array.isArray(parsed.error)
        ? parsed.error as Record<string, unknown>
        : {};
      const traceId = typeof parsed.trace_id === "string" ? parsed.trace_id : legacy.headers.get("x-trace-id") ?? undefined;
      return new Response(JSON.stringify({
        ok: true,
        result: {
          ok: false,
          error: {
            code: typeof error.code === "string" ? error.code : undefined,
            message: typeof error.message === "string" ? error.message : undefined,
            retryable: typeof error.retryable === "boolean" ? error.retryable : undefined,
          },
          traceId,
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    return passthrough();
  }) as typeof fetch;

  try {
    return await run();
  } finally {
    if (typeof previousCapability === "undefined") delete process.env.AWKN_MARKETING_CAPABILITY_URL;
    else process.env.AWKN_MARKETING_CAPABILITY_URL = previousCapability;
    if (typeof previousSession === "undefined") delete process.env.AWKN_MARKETING_SESSION_URL;
    else process.env.AWKN_MARKETING_SESSION_URL = previousSession;
    if (typeof previousToken === "undefined") delete process.env.AWKN_MARKETING_CAPABILITY_TOKEN;
    else process.env.AWKN_MARKETING_CAPABILITY_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
}
