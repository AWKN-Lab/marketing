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

export function isProductOperation(value: unknown): value is ProductOperation {
  return typeof value === "string" && (PRODUCT_OPERATIONS as readonly string[]).includes(value);
}
