import { NextResponse } from "next/server";
import {
  CapabilityTransportError,
  invokeMarketingCapability,
  resolvePlatformSession,
} from "@/lib/capability-client";
import { PATTERN_SAMPLE_MAX_TASKS, type PatternSignal } from "@/lib/pattern-detection";
import { upstreamIdentityHeaders } from "@/lib/server-upstream-auth";

/**
 * F1 收口：跨任务重复模式检测的**平台权威**路径。
 *
 * 产品层不再自己算模式 —— 平台模式下由 AWKN OS 营销插件
 * （`marketing.pattern.detect`）计算，本地模式由 `lib/pattern-detection.ts`
 * 作为离线回退承担。
 *
 * 两层必须给出**同一个** patternId，否则平台和本地认不出同一个模式。
 * 这一点由两侧的测试钉死（营销仓 `scripts/p6-pattern.ts` 与插件测试断言同一组 ID）。
 */

type PatternDetectRequest = {
  product?: unknown;
  request_id?: unknown;
  workspace_id?: unknown;
  samples?: unknown;
};

function readSamples(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

export async function POST(request: Request) {
  let body: PatternDetectRequest;
  try {
    body = await request.json() as PatternDetectRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "请求体不是合法 JSON。" } },
      { status: 400 },
    );
  }

  if (body.product !== "awkn-marketing" || typeof body.request_id !== "string" || !body.request_id) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "缺少 product 或 request_id。" } },
      { status: 400 },
    );
  }

  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id : "";
  const samples = readSamples(body.samples);
  if (samples.length === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "至少需要 1 条任务样本。" } },
      { status: 400 },
    );
  }
  if (samples.length > PATTERN_SAMPLE_MAX_TASKS) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: `样本数超过上限 ${PATTERN_SAMPLE_MAX_TASKS}。` } },
      { status: 400 },
    );
  }

  const capabilityEndpoint = process.env.AWKN_MARKETING_CAPABILITY_URL;
  if (!capabilityEndpoint) {
    return NextResponse.json(
      { ok: false, error: { code: "PLATFORM_NOT_CONFIGURED", message: "AWKN 能力服务尚未配置；本地模式继续使用浏览器状态。", retryable: false } },
      { status: 503 },
    );
  }

  const sessionEndpoint = process.env.AWKN_MARKETING_SESSION_URL;
  if (!sessionEndpoint) {
    return NextResponse.json(
      { ok: false, error: { code: "AUTH_REQUIRED", message: "AWKN Marketing Session 尚未配置。", retryable: false } },
      { status: 503 },
    );
  }

  const identityHeaders = upstreamIdentityHeaders(request, process.env.AWKN_MARKETING_SESSION_TOKEN);
  const session = await resolvePlatformSession({
    endpoint: sessionEndpoint,
    token: process.env.AWKN_MARKETING_SESSION_TOKEN,
    identityHeaders,
    cacheKey: `${identityHeaders.authorization ?? ""}|${identityHeaders.cookie ?? ""}|${workspaceId}`,
    workspaceHint: workspaceId || undefined,
  });
  if (!session || session.mode !== "platform") {
    return NextResponse.json(
      { ok: false, error: { code: "AUTH_REQUIRED", message: "需要有效的平台身份才能调用营销能力。", retryable: false } },
      { status: 401 },
    );
  }

  let call: Awaited<ReturnType<typeof invokeMarketingCapability>>;
  try {
    call = await invokeMarketingCapability({
      endpoint: capabilityEndpoint,
      token: process.env.AWKN_MARKETING_CAPABILITY_TOKEN,
      session,
      capability: "marketing.pattern.detect",
      payload: { samples },
      requestId: body.request_id,
      workspaceId: workspaceId || undefined,
    });
  } catch (error) {
    if (error instanceof CapabilityTransportError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message, retryable: true } },
        { status: 502 },
      );
    }
    throw error;
  }

  const envelope = call.body as {
    ok?: boolean;
    result?: { ok?: boolean; output?: { patterns?: unknown }; error?: { code?: string; message?: string } };
  } | null;
  if (!envelope || envelope.ok !== true || envelope.result?.ok !== true) {
    const upstreamError = envelope?.result?.error;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: upstreamError?.code ?? "UPSTREAM_ERROR",
          message: upstreamError?.message ?? "平台模式检测失败。",
          retryable: false,
        },
      },
      { status: 502 },
    );
  }

  const patterns = Array.isArray(envelope.result?.output?.patterns)
    ? envelope.result.output.patterns as PatternSignal[]
    : [];
  return NextResponse.json(
    { ok: true, data: { patterns, detected_count: patterns.length }, trace_id: body.request_id },
    { status: 200 },
  );
}
