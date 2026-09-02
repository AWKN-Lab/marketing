import { NextResponse } from "next/server";
import {
  isProductOperation,
  type MarketingProductRequest,
  type MarketingProductResponse,
} from "@/lib/product-contract";

const TIMEOUT_MS = 20_000;

export async function POST(request: Request) {
  let body: Partial<MarketingProductRequest>;
  try {
    body = (await request.json()) as Partial<MarketingProductRequest>;
  } catch {
    return NextResponse.json<MarketingProductResponse>(
      { ok: false, error: { code: "INVALID_JSON", message: "请求体必须是 JSON。" } },
      { status: 400 },
    );
  }

  if (body.product !== "awkn-marketing" || !isProductOperation(body.operation) || !body.request_id) {
    return NextResponse.json<MarketingProductResponse>(
      {
        ok: false,
        error: {
          code: "INVALID_PRODUCT_REQUEST",
          message: "缺少 product / operation / request_id，或 operation 不受支持。",
        },
      },
      { status: 400 },
    );
  }

  const upstream = process.env.AWKN_MARKETING_API_URL;
  if (!upstream) {
    return NextResponse.json<MarketingProductResponse>(
      {
        ok: false,
        error: {
          code: "PLATFORM_NOT_CONFIGURED",
          message: "AWKN 产品接口尚未配置；P0 继续使用浏览器本地状态。",
          retryable: false,
        },
      },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.AWKN_MARKETING_API_TOKEN
          ? { authorization: `Bearer ${process.env.AWKN_MARKETING_API_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as MarketingProductResponse | null;
    if (!data) {
      return NextResponse.json<MarketingProductResponse>(
        { ok: false, error: { code: "INVALID_UPSTREAM_RESPONSE", message: "AWKN 产品接口返回了非 JSON 响应。" } },
        { status: 502 },
      );
    }

    return NextResponse.json(data, { status: response.status });
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
