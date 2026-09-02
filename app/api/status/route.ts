import { NextResponse } from "next/server";

export async function GET() {
  const agentConfigured = Boolean(process.env.AWKN_MARKETING_AGENT_URL);
  const productConfigured = Boolean(process.env.AWKN_MARKETING_API_URL);
  const mode = agentConfigured && productConfigured ? "connected" : agentConfigured || productConfigured ? "partial" : "local";

  return NextResponse.json({
    product: "awkn-marketing",
    mode,
    agentConfigured,
    productConfigured,
  });
}
