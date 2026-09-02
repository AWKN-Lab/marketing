"use client";

import { callMarketingProduct } from "@/lib/product-client";
import type { MaterialUploadAck, MaterialUploadData } from "@/lib/material-upload";

export async function uploadMaterialFile(input: { workspaceId: string; materialId: string; file: File }): Promise<MaterialUploadAck> {
  const form = new FormData();
  form.set("workspace_id", input.workspaceId);
  form.set("material_id", input.materialId);
  form.set("file", input.file, input.file.name);
  try {
    const response = await fetch("/api/material-upload", { method: "POST", body: form });
    const payload = (await response.json().catch(() => null)) as MaterialUploadAck | null;
    if (payload) return payload;
    return { ok: false, error: { code: "INVALID_UPLOAD_RESPONSE", message: "资料上传接口返回了无效响应。", retryable: true } };
  } catch {
    return { ok: false, error: { code: "MATERIAL_UPLOAD_UNAVAILABLE", message: "暂时无法连接资料上传接口。", retryable: true } };
  }
}

export async function refreshMaterialParse(input: { workspaceId: string; materialId: string }): Promise<MaterialUploadAck> {
  return callMarketingProduct<MaterialUploadData, { material_id: string }>({
    operation: "material.parse.get",
    workspaceId: input.workspaceId,
    payload: { material_id: input.materialId },
  });
}

export async function retryMaterialParse(input: { workspaceId: string; materialId: string }): Promise<MaterialUploadAck> {
  return callMarketingProduct<MaterialUploadData, { material_id: string }>({
    operation: "material.parse.retry",
    workspaceId: input.workspaceId,
    idempotencyKey: `material.parse.retry:${input.materialId}`,
    payload: { material_id: input.materialId },
  });
}
