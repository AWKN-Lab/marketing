export const P0_BUNDLE_FORMAT = "awkn-marketing-p0";
export const P0_BUNDLE_VERSION = 1;

export type P0Bundle = {
  format: typeof P0_BUNDLE_FORMAT;
  version: number;
  exportedAt: string;
  entries: Record<string, string>;
};

export function buildP0Bundle(entries: Record<string, string>, exportedAt = new Date().toISOString()): P0Bundle {
  return {
    format: P0_BUNDLE_FORMAT,
    version: P0_BUNDLE_VERSION,
    exportedAt,
    entries: Object.fromEntries(Object.entries(entries).filter(([key, value]) => key.startsWith("marketing:") && typeof value === "string")),
  };
}

export function parseP0Bundle(raw: string): P0Bundle {
  const value = JSON.parse(raw) as Partial<P0Bundle>;
  if (value.format !== P0_BUNDLE_FORMAT || value.version !== P0_BUNDLE_VERSION || !value.entries || typeof value.entries !== "object") {
    throw new Error("INVALID_P0_BUNDLE");
  }

  const entries = Object.fromEntries(
    Object.entries(value.entries).filter(([key, item]) => key.startsWith("marketing:") && typeof item === "string"),
  );

  return {
    format: P0_BUNDLE_FORMAT,
    version: P0_BUNDLE_VERSION,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    entries,
  };
}
