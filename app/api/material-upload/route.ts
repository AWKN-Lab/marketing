import { NextResponse } from "next/server";
import { materialUploadIdempotencyKey } from "@/lib/material-contract";
import { normalizeMaterialUploadAck, type MaterialUploadAck } from "@/lib/material-upload";
import { upstreamIdentityHeaders } from "@/lib/server-upstream-auth";

export const runtime = "nodejs";
const TIMEOUT_MS = 90_000;

function maxUploadBytes() {
  const configured = Number(process.env.AWKN_MARKETING_MATERIAL_MAX_MB ?? "100");
  const mb = Number.isFinite(configured) && configured > 0 ? configured : 100;
  return Math.floor(mb * 1024 * 1024);
}

function traceFromHeaders(response: Response) {
  return response.headers.get("x-trace-id") ?? response.headers.get("trace-id") ?? undefined;
}

function uploadRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

function falseSuccessUploadError(status: number) {
  if (status === 401) return { code: "AUTH_REQUIRED", retryable: false };
  if (status === 403) return { code: "FORBIDDEN", retryable: false };
  if (status === 429) return { code: "RATE_LIMITED", retryable: true };
  if (status >= 500 && status <= 599) return { code: "MATERIAL_UPLOAD_UPSTREAM_UNAVAILABLE", retryable: true };
  return { code: "INVALID_UPLOAD_UPSTREAM_RESPONSE", retryable: false };
}

export async function POST(request: Request) {
  const endpoint = process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL;
  if (!endpoint) {
    return NextResponse.json<MaterialUploadAck>(
      { ok: false, error: { code: "PLATFORM_NOT_CONFIGURED", message: "AWKN 资料上传接口尚未配置；当前仅保留本地资料引用。", retryable: false } },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json<MaterialUploadAck>(
      { ok: false, error: { code: "INVALID_MULTIPART", message: "资料上传必须使用 multipart/form-data。" } },
      { status: 400 },
    );
  }

  const workspaceId = form.get("workspace_id");
  const materialId = form.get("material_id");
  const file = form.get("file");
  if (typeof workspaceId !== "string" || !workspaceId || typeof materialId !== "string" || !materialId || !(file instanceof File)) {
    return NextResponse.json<MaterialUploadAck>(
      { ok: false, error: { code: "INVALID_UPLOAD_REQUEST", message: "缺少 workspace_id / material_id / file。" } },
      { status: 400 },
    );
  }
  if (file.size <= 0) {
    return NextResponse.json<MaterialUploadAck>({ ok: false, error: { code: "EMPTY_FILE", message: "不能上传空文件。" } }, { status: 400 });
  }
  if (file.size > maxUploadBytes()) {
    return NextResponse.json<MaterialUploadAck>({ ok: false, error: { code: "FILE_TOO_LARGE", message: "文件超过当前营销产品上传上限。" } }, { status: 413 });
  }

  const outgoing = new FormData();
  outgoing.set("product", "awkn-marketing");
  outgoing.set("operation", "material.upload");
  outgoing.set("request_id", uploadRequestId(request));
  outgoing.set("workspace_id", workspaceId);
  outgoing.set("material_id", materialId);
  outgoing.set("idempotency_key", materialUploadIdempotencyKey({ materialId, fileName: file.name, fileSize: file.size }));
  outgoing.set("file", file, file.name);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: upstreamIdentityHeaders(request, process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN),
      body: outgoing,
      signal: controller.signal,
      cache: "no-store",
    });
    const fallbackTraceId = traceFromHeaders(upstream);
    const payload = (await upstream.json().catch(() => null)) as MaterialUploadAck | null;
    if (!payload) {
      return NextResponse.json<MaterialUploadAck>(
        { ok: false, error: { code: "INVALID_UPLOAD_UPSTREAM_RESPONSE", message: "AWKN 资料接口返回了非 JSON 响应。" }, trace_id: fallbackTraceId },
        { status: 502 },
      );
    }

    if (!upstream.ok && payload.ok) {
      const failure = falseSuccessUploadError(upstream.status);
      return NextResponse.json<MaterialUploadAck>(
        {
          ok: false,
          error: {
            code: failure.code,
            message: `AWKN 资料接口返回 HTTP ${upstream.status}，拒绝接受成功上传结果。`,
            retryable: failure.retryable,
          },
          trace_id: payload.trace_id ?? fallbackTraceId,
        },
        { status: upstream.status },
      );
    }

    if (!payload.ok) {
      return NextResponse.json<MaterialUploadAck>(
        { ...payload, trace_id: payload.trace_id ?? fallbackTraceId },
        { status: upstream.status },
      );
    }

    const normalized = normalizeMaterialUploadAck(
      { ...payload, trace_id: payload.trace_id ?? fallbackTraceId },
      materialId,
      { strict: true },
    );
    if (!normalized.ok) {
      return NextResponse.json<MaterialUploadAck>(
        { ok: false, error: normalized.error, trace_id: normalized.traceId },
        { status: 502 },
      );
    }

    return NextResponse.json<MaterialUploadAck>(
      { ...payload, trace_id: payload.trace_id ?? fallbackTraceId },
      { status: upstream.status },
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json<MaterialUploadAck>(
      {
        ok: false,
        error: {
          code: timedOut ? "MATERIAL_UPLOAD_TIMEOUT" : "MATERIAL_UPLOAD_UPSTREAM_UNAVAILABLE",
          message: timedOut ? "AWKN 资料上传请求超时。" : "暂时无法连接 AWKN 资料上传接口。",
          retryable: true,
        },
      },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
