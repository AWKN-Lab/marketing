import { NextResponse } from "next/server";
import { LOCAL_MARKETING_SESSION, normalizeMarketingSession } from "@/lib/product-session";
import { upstreamIdentityHeaders } from "@/lib/server-upstream-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const endpoint = process.env.AWKN_MARKETING_SESSION_URL;
  if (!endpoint) {
    const allowLocal = process.env.NODE_ENV !== "production" || process.env.AWKN_MARKETING_ALLOW_LOCAL_SESSION === "true";
    if (allowLocal) return NextResponse.json(LOCAL_MARKETING_SESSION);
    return NextResponse.json({ error: "SESSION_NOT_CONFIGURED", message: "生产环境必须配置 AWKN Marketing Session。" }, { status: 503 });
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { accept: "application/json", ...upstreamIdentityHeaders(request, process.env.AWKN_MARKETING_SESSION_TOKEN) },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ error: response.status === 401 ? "UNAUTHENTICATED" : response.status === 403 ? "FORBIDDEN" : "SESSION_UPSTREAM_ERROR" }, { status: response.status });
    }
    const payload = await response.json().catch(() => null);
    const session = normalizeMarketingSession(payload);
    if (!session) return NextResponse.json({ error: "INVALID_SESSION_RESPONSE" }, { status: 502 });
    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "SESSION_UPSTREAM_UNAVAILABLE" }, { status: 502 });
  }
}
