type AgentRequest = {
  taskId?: string;
  workspaceId?: string;
  messages?: Array<{ role: string; content: string }>;
};

type UpstreamResponse = {
  text?: string;
  evidence?: unknown[];
  artifact?: unknown;
};

export async function POST(request: Request) {
  const endpoint = process.env.AWKN_MARKETING_AGENT_URL;
  if (!endpoint) {
    return Response.json({ error: "platform_not_configured" }, { status: 503 });
  }

  let body: AgentRequest;
  try {
    body = (await request.json()) as AgentRequest;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.taskId || !body.workspaceId || !Array.isArray(body.messages)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const token = process.env.AWKN_MARKETING_AGENT_TOKEN;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        product: "awkn-marketing",
        task_id: body.taskId,
        workspace_id: body.workspaceId,
        messages: body.messages,
      }),
      cache: "no-store",
    });

    const payload = (await upstream.json().catch(() => ({}))) as UpstreamResponse & { error?: string };
    if (!upstream.ok) {
      return Response.json({ error: payload.error ?? "platform_error" }, { status: upstream.status });
    }
    if (typeof payload.text !== "string") {
      return Response.json({ error: "invalid_platform_response" }, { status: 502 });
    }

    return Response.json({ text: payload.text, evidence: payload.evidence ?? [], artifact: payload.artifact ?? null });
  } catch {
    return Response.json({ error: "platform_unreachable" }, { status: 502 });
  }
}
