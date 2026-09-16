export type P6FailureContext = {
  operation?: string;
  entityId?: string;
  traceId?: string;
};

export const P6_TEST_DATA_KINDS = ["fixture", "synthetic", "real-acceptance"] as const;
export type P6TestDataKind = (typeof P6_TEST_DATA_KINDS)[number];

export async function runP6Case(name: string, fn: () => void | Promise<void>, context: P6FailureContext = {}) {
  try {
    await fn();
    console.log(`[P6][PASS] ${name}`);
  } catch (error) {
    const summary = [
      context.operation ? `operation=${context.operation}` : "",
      context.entityId ? `entity=${context.entityId}` : "",
      context.traceId ? `trace=${context.traceId}` : "",
    ].filter(Boolean).join(" ");
    console.error(`[P6][FAIL] ${name}${summary ? ` ${summary}` : ""}`);
    throw error;
  }
}

export function readIntegrationConfig() {
  const dataKind = (process.env.AWKN_MARKETING_TEST_DATA || "synthetic") as P6TestDataKind;
  if (!P6_TEST_DATA_KINDS.includes(dataKind)) {
    throw new Error(`Unsupported AWKN_MARKETING_TEST_DATA: ${dataKind}`);
  }

  return {
    enabled: process.env.AWKN_P6_INTEGRATION === "true",
    allowLocalSession: process.env.AWKN_MARKETING_ALLOW_LOCAL_SESSION === "true",
    dataKind,
    endpoints: {
      session: process.env.AWKN_MARKETING_SESSION_URL || "",
      agent: process.env.AWKN_MARKETING_AGENT_URL || "",
      product: process.env.AWKN_MARKETING_API_URL || "",
      material: process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL || "",
    },
    tokenConfigured: {
      session: Boolean(process.env.AWKN_MARKETING_SESSION_TOKEN),
      agent: Boolean(process.env.AWKN_MARKETING_AGENT_TOKEN),
      product: Boolean(process.env.AWKN_MARKETING_API_TOKEN),
      material: Boolean(process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN),
    },
  };
}
