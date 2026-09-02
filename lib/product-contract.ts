export const PRODUCT_OPERATIONS = [
  "workspace.create",
  "workspace.update",
  "material.feed",
  "task.create",
  "task.run",
  "feedback.record",
  "outcome.record",
  "evolution.review",
  "learning.watch.upsert",
  "learning.run",
] as const;

export type ProductOperation = (typeof PRODUCT_OPERATIONS)[number];

export interface MarketingProductRequest<TPayload = unknown> {
  product: "awkn-marketing";
  operation: ProductOperation;
  request_id: string;
  idempotency_key?: string;
  workspace_id?: string;
  task_id?: string;
  payload: TPayload;
}

export interface MarketingProductResponse<TData = unknown> {
  ok: boolean;
  data?: TData;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  trace_id?: string;
}

export type EntityAck = {
  entity_id: string;
  revision?: number;
  updated_at?: string;
};

export function isProductOperation(value: unknown): value is ProductOperation {
  return typeof value === "string" && (PRODUCT_OPERATIONS as readonly string[]).includes(value);
}

export function validateStableEntityAck<T>(response: MarketingProductResponse<T>, expectedEntityId: string): MarketingProductResponse<T> {
  if (!response.ok) return response;
  if (!response.data || typeof response.data !== "object") {
    return { ok: false, error: { code: "MISSING_ENTITY_ACK", message: `平台没有确认业务 ID：${expectedEntityId}` }, trace_id: response.trace_id };
  }
  const entityId = (response.data as Record<string, unknown>).entity_id;
  if (typeof entityId !== "string" || !entityId) {
    return { ok: false, error: { code: "MISSING_ENTITY_ACK", message: `平台没有确认业务 ID：${expectedEntityId}` }, trace_id: response.trace_id };
  }
  if (entityId !== expectedEntityId) {
    return { ok: false, error: { code: "IDENTITY_MISMATCH", message: `平台返回 ID ${entityId}，与产品 ID ${expectedEntityId} 不一致。` }, trace_id: response.trace_id };
  }
  return response;
}
