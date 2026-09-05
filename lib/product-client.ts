"use client";

import type { MarketingProductRequest, MarketingProductResponse, ProductOperation } from "@/lib/product-contract";
import {
  shouldRefreshMarketingSessionForProductError,
  signalMarketingSessionRefresh,
} from "@/lib/product-session";

function requestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function callMarketingProduct<TData = unknown, TPayload = unknown>(input: {
  operation: ProductOperation;
  workspaceId?: string;
  taskId?: string;
  idempotencyKey?: string;
  payload: TPayload;
}): Promise<MarketingProductResponse<TData>> {
  const request: MarketingProductRequest<TPayload> = {
    product: "awkn-marketing",
    operation: input.operation,
    request_id: requestId(),
    idempotency_key: input.idempotencyKey,
    workspace_id: input.workspaceId,
    task_id: input.taskId,
    payload: input.payload,
  };
  try {
    const response = await fetch("/api/product", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
    const payload = (await response.json().catch(() => null)) as MarketingProductResponse<TData> | null;
    if (payload) {
      if (!payload.ok && shouldRefreshMarketingSessionForProductError(payload.error?.code)) {
        signalMarketingSessionRefresh();
      }
      return payload;
    }
    return { ok: false, error: { code: "INVALID_PRODUCT_RESPONSE", message: "产品接口返回了无效响应。", retryable: true } };
  } catch {
    return { ok: false, error: { code: "PRODUCT_API_UNAVAILABLE", message: "暂时无法连接产品接口。", retryable: true } };
  }
}
