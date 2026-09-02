"use client";

import { callMarketingProduct } from "@/lib/product-client";
import type { ProductOperation } from "@/lib/product-contract";
import { validateEntityReadResponse, type EntityReadData } from "@/lib/reconcile";

export type EntityReadOperation = "workspace.get" | "task.get" | "task.execution.get";

export async function readMarketingEntity<T extends { id: string }>(input: { operation: EntityReadOperation; entityId: string; workspaceId?: string; taskId?: string }) {
  const response = await callMarketingProduct<EntityReadData<T>, { entity_id: string }>({
    operation: input.operation as ProductOperation,
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    payload: { entity_id: input.entityId },
  });
  return validateEntityReadResponse(response, input.entityId);
}
