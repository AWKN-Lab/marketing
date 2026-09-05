import type { MaterialEvidence, MaterialParseState } from "@/lib/material-upload";

export type LocalMaterial = {
  id: string;
  title: string;
  kind: string;
  source: string;
  status: string;
  parseMode: "local_text" | "platform_required" | "platform_parsed" | "reference_only";
  content?: string;
  url?: string;
  createdAt: string;
  platformStatus?: MaterialParseState;
  platformTraceId?: string;
  platformRevision?: number;
  platformUpdatedAt?: string;
  platformRunId?: string;
  platformError?: string;
  evidence?: MaterialEvidence[];
};

export const MAX_LOCAL_TEXT_CHARS = 200_000;
export const MAX_AGENT_CONTEXT_CHARS = 40_000;

const textExtensions = new Set(["TXT", "MD", "CSV", "JSON", "YAML", "YML", "XML", "HTML", "HTM", "LOG"]);
const textMimePrefixes = ["text/"];
const textMimeTypes = new Set(["application/json", "application/xml", "application/yaml", "application/x-yaml"]);

export function localMaterialsKey(workspaceId: string) {
  return `marketing:${workspaceId}:materials`;
}

export function kindFromMaterialName(name: string) {
  const extension = name.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 6 ? extension : "FILE";
}

export function isLocalTextFile(input: { name: string; type?: string }) {
  const kind = kindFromMaterialName(input.name);
  const mime = input.type ?? "";
  return textExtensions.has(kind) || textMimePrefixes.some((prefix) => mime.startsWith(prefix)) || textMimeTypes.has(mime);
}

export function buildAgentMaterialContext(materials: LocalMaterial[], maxChars = MAX_AGENT_CONTEXT_CHARS) {
  let remaining = maxChars;
  return materials.map((material) => {
    const canInline = (material.parseMode === "local_text" || material.parseMode === "platform_parsed") && Boolean(material.content) && remaining > 0;
    if (!canInline || !material.content) {
      return {
        id: material.id,
        title: material.title,
        kind: material.kind,
        source: material.source,
        status: material.status,
        parse_mode: material.parseMode,
        url: material.url,
        evidence: material.evidence?.slice(0, 5),
      };
    }
    const content = material.content.slice(0, remaining);
    remaining -= content.length;
    return {
      id: material.id,
      title: material.title,
      kind: material.kind,
      source: material.source,
      status: material.status,
      parse_mode: material.parseMode,
      content,
      truncated: content.length < material.content.length,
      evidence: material.evidence?.slice(0, 5),
    };
  });
}
