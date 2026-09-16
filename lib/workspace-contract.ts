import type { MarketingProductRequest, ProductErrorCode } from "@/lib/product-contract";

type WorkspaceContractViolation = {
  code: ProductErrorCode;
  message: string;
};

type ProductRequestLike = Partial<MarketingProductRequest> & Record<string, unknown>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validRevision(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function workspaceId(input: ProductRequestLike) {
  return text(input.workspace_id);
}

export function validateWorkspaceProductRequest(input: ProductRequestLike): WorkspaceContractViolation | null {
  if (input.operation !== "workspace.create" && input.operation !== "workspace.update" && input.operation !== "workspace.get") {
    return null;
  }

  const expectedId = workspaceId(input);
  const payload = record(input.payload);
  if (!payload) return { code: "VALIDATION_ERROR", message: `operation ${input.operation} 的 payload 必须是对象。` };

  if (input.operation === "workspace.get") {
    const entityId = text(payload.entity_id);
    if (!entityId) return { code: "VALIDATION_ERROR", message: "workspace.get 缺少 payload.entity_id。" };
    if (entityId !== expectedId) {
      return { code: "IDENTITY_MISMATCH", message: `workspace.get 的 entity_id ${entityId} 与 workspace_id ${expectedId} 不一致。` };
    }
    return null;
  }

  const workspace = record(payload.workspace);
  if (!workspace) return { code: "VALIDATION_ERROR", message: `${input.operation} 缺少 payload.workspace。` };
  const payloadId = text(workspace.id);
  if (!payloadId) return { code: "VALIDATION_ERROR", message: `${input.operation} 缺少 payload.workspace.id。` };
  if (payloadId !== expectedId) {
    return { code: "IDENTITY_MISMATCH", message: `${input.operation} 的 Workspace ID ${payloadId} 与 workspace_id ${expectedId} 不一致。` };
  }

  if (input.operation === "workspace.update" && !validRevision(payload.base_revision)) {
    return { code: "INVALID_REVISION", message: "workspace.update 必须携带大于 0 的 base_revision。" };
  }

  return null;
}

export function expectedWorkspaceEntityId(input: ProductRequestLike) {
  if (input.operation !== "workspace.create" && input.operation !== "workspace.update" && input.operation !== "workspace.get") {
    return undefined;
  }
  return workspaceId(input) || undefined;
}

export function workspaceCreateIdempotencyKey(workspaceIdValue: string) {
  return `workspace.create:${workspaceIdValue}`;
}

export function workspaceUpdateIdempotencyKey(workspaceIdValue: string, baseRevision: number, fingerprint: string) {
  return `workspace.update:${workspaceIdValue}:${baseRevision}:${fingerprint}`;
}
