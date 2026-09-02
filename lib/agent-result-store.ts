import { readPersistedValue, writePersistedValue } from "@/lib/persistence";

export type AgentEvidence = { type: string; title: string; snippet: string; source: string; time?: string; url?: string };
export type AgentArtifact = { title: string; content: string; format?: string };
export type AgentTaskResult = { text: string; evidence: AgentEvidence[]; artifact: AgentArtifact | null; traceId?: string; receivedAt: string };
export const AGENT_RESULT_EVENT = "awkn-marketing:agent-result";
export function agentResultKey(taskId: string) { return `marketing:${taskId}:agent-result`; }
function stringValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
export function normalizeAgentTaskResult(payload: unknown, receivedAt = new Date().toISOString()): AgentTaskResult | null {
  if (!payload || typeof payload !== "object") return null; const input = payload as Record<string, unknown>; const text = stringValue(input.text); if (!text) return null;
  const evidence = Array.isArray(input.evidence) ? input.evidence.flatMap((item): AgentEvidence[] => { if (!item || typeof item !== "object") return []; const row = item as Record<string, unknown>; const title = stringValue(row.title); const snippet = stringValue(row.snippet ?? row.quote ?? row.content); const source = stringValue(row.source ?? row.url); if (!title || !snippet || !source) return []; return [{ type: stringValue(row.type) || "SOURCE", title, snippet, source, time: stringValue(row.time ?? row.occurred_at ?? row.published_at) || undefined, url: stringValue(row.url) || undefined }]; }) : [];
  let artifact: AgentArtifact | null = null;
  if (typeof input.artifact === "string" && input.artifact.trim()) artifact = { title: "Agent 产出", content: input.artifact.trim() };
  else if (input.artifact && typeof input.artifact === "object") { const row = input.artifact as Record<string, unknown>; const content = stringValue(row.content ?? row.text ?? row.markdown); if (content) artifact = { title: stringValue(row.title) || "Agent 产出", content, format: stringValue(row.format) || undefined }; }
  return { text, evidence, artifact, traceId: stringValue(input.trace_id ?? input.traceId) || undefined, receivedAt };
}
export function readAgentTaskResult(taskId: string): AgentTaskResult | null { return readPersistedValue<AgentTaskResult | null>(agentResultKey(taskId), null); }
export function persistAgentTaskResult(taskId: string, result: AgentTaskResult) { if (typeof window === "undefined") return; writePersistedValue(agentResultKey(taskId), result); window.dispatchEvent(new CustomEvent(AGENT_RESULT_EVENT, { detail: { taskId } })); }
