import type { MarketingProductRequest, ProductErrorCode } from "@/lib/product-contract";

type MaterialContractViolation = {
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

function payloadMaterialId(input: ProductRequestLike) {
  const payload = record(input.payload);
  return text(payload?.material_id ?? payload?.entity_id);
}

export function validateMaterialProductRequest(input: ProductRequestLike): MaterialContractViolation | null {
  if (input.operation !== "material.feed" && input.operation !== "material.parse.get" && input.operation !== "material.parse.retry") {
    return null;
  }

  const payload = record(input.payload);
  if (!payload) return { code: "VALIDATION_ERROR", message: `operation ${input.operation} 的 payload 必须是对象。` };
  const materialId = text(payload.material_id);
  if (!materialId) return { code: "VALIDATION_ERROR", message: `${input.operation} 缺少 payload.material_id。` };

  const entityId = text(payload.entity_id);
  if (entityId && entityId !== materialId) {
    return { code: "IDENTITY_MISMATCH", message: `${input.operation} 的 entity_id ${entityId} 与 material_id ${materialId} 不一致。` };
  }

  if (input.operation === "material.parse.retry" && "base_revision" in payload && typeof payload.base_revision !== "undefined" && !validRevision(payload.base_revision)) {
    return { code: "INVALID_REVISION", message: "material.parse.retry 的 base_revision 必须为大于 0 的安全整数。" };
  }

  return null;
}

export function expectedMaterialEntityId(input: ProductRequestLike) {
  if (input.operation !== "material.feed" && input.operation !== "material.parse.get" && input.operation !== "material.parse.retry") {
    return undefined;
  }
  return payloadMaterialId(input) || undefined;
}

export function materialFeedIdempotencyKey(materialId: string) {
  return `material.feed:${materialId}`;
}

export function materialParseRetryIdempotencyKey(materialId: string, baseRevision?: number) {
  const revision = validRevision(baseRevision) ? String(baseRevision) : "unbased";
  return `material.parse.retry:${materialId}:revision:${revision}`;
}

export function materialUploadIdempotencyKey(input: { materialId: string; fileName: string; fileSize: number }) {
  return `material.upload:${input.materialId}:${input.fileSize}:${input.fileName}`;
}
