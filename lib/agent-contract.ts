import type { AppliedExperience } from "@/lib/types";

export const MARKETING_AGENT_RESULT_STATUSES = ["succeeded", "failed"] as const;
export type MarketingAgentResultStatus = (typeof MARKETING_AGENT_RESULT_STATUSES)[number];

export type MarketingAgentMessage = {
  role: string;
  content: string;
};

export type MarketingAgentMaterial = {
  id: string;
  workspace_id: string;
  title: string;
  kind: string;
  source: string;
  status: string;
  parse_mode: string;
  content?: string;
  url?: string;
  truncated?: boolean;
  evidence?: unknown[];
};

export type MarketingAgentInput = {
  tenantId: string;
  actorId: string;
  workspaceId: string;
  taskId: string;
  taskType: string;
  goal: string;
  userPrompt: string;
  contextRefs: string[];
  appliedExperienceIds: string[];
  capabilityScope: string[];
  requestId: string;
  logicalActionId: string;
  messages: MarketingAgentMessage[];
  materials: MarketingAgentMaterial[];
};

export type MarketingJudgment = {
  claim: string;
  rationale: string;
  evidenceRefs: string[];
  confidence?: number;
  assumptions?: string[];
  unknowns?: string[];
};

export type AgentEvidenceProjection = {
  id?: string;
  type: string;
  title: string;
  snippet: string;
  source: string;
  time?: string;
  url?: string;
};

export type AgentArtifactProjection = {
  taskId: string;
  title: string;
  content: string;
  format?: string;
};

export type MarketingAgentResult = {
  taskId: string;
  runId: string;
  status: MarketingAgentResultStatus;
  text: string;
  judgment?: MarketingJudgment[];
  artifact: AgentArtifactProjection | null;
  evidence: AgentEvidenceProjection[];
  evidenceRefs: string[];
  appliedExperienceIds: string[];
  traceId?: string;
  error?: {
    code: string;
    retryable?: boolean;
  };
};

export type MarketingAgentRouteResponse = {
  ok: boolean;
  data?: MarketingAgentResult;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  trace_id?: string;
};

export type AgentContractViolation = {
  code: string;
  message: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizedMessages(value: unknown): MarketingAgentMessage[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  const messages: MarketingAgentMessage[] = [];
  for (const item of value) {
    const row = record(item);
    const role = text(row?.role);
    const content = text(row?.content);
    if (!role || !content) return null;
    messages.push({ role, content });
  }
  return messages;
}

function normalizedMaterials(value: unknown, workspaceId: string): MarketingAgentMaterial[] | null {
  if (!Array.isArray(value)) return null;
  const materials: MarketingAgentMaterial[] = [];
  for (const item of value) {
    const row = record(item);
    if (!row) return null;
    const id = text(row.id);
    const materialWorkspaceId = text(row.workspace_id ?? row.workspaceId);
    const title = text(row.title);
    const kind = text(row.kind);
    const source = text(row.source);
    const status = text(row.status);
    const parseMode = text(row.parse_mode ?? row.parseMode);
    if (!id || !materialWorkspaceId || materialWorkspaceId !== workspaceId || !title || !kind || !source || !status || !parseMode) return null;
    materials.push({
      id,
      workspace_id: materialWorkspaceId,
      title,
      kind,
      source,
      status,
      parse_mode: parseMode,
      content: text(row.content) || undefined,
      url: text(row.url) || undefined,
      truncated: typeof row.truncated === "boolean" ? row.truncated : undefined,
      evidence: Array.isArray(row.evidence) ? row.evidence : undefined,
    });
  }
  return materials;
}

export function appliedExperienceStableId(experience: AppliedExperience) {
  const explicit = text(experience.id);
  if (explicit) return explicit;
  return `experience-${stableHash(JSON.stringify([experience.lesson.trim(), experience.source.trim()]))}`;
}

export function stableAgentLogicalActionId(input: {
  taskId: string;
  messages: MarketingAgentMessage[];
  appliedExperienceIds: string[];
}) {
  return `action-${stableHash(JSON.stringify({
    taskId: input.taskId,
    messages: input.messages,
    appliedExperienceIds: [...input.appliedExperienceIds].sort(),
  }))}`;
}

export function agentRunIdempotencyKey(taskId: string, logicalActionId: string) {
  return `task:${taskId}:run:${logicalActionId}`;
}

export function normalizeMarketingAgentInput(value: unknown): { ok: true; data: MarketingAgentInput } | { ok: false; error: AgentContractViolation } {
  const row = record(value);
  if (!row) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Agent 请求必须是对象。" } };
  if (Array.isArray(row.requestedSideEffects) && row.requestedSideEffects.length > 0) {
    return { ok: false, error: { code: "UNSUPPORTED_OPERATION", message: "当前 Agent 请求不允许未经 Approval 的外部副作用。" } };
  }

  const tenantId = text(row.tenantId ?? row.tenant_id);
  const actorId = text(row.actorId ?? row.actor_id);
  const workspaceId = text(row.workspaceId ?? row.workspace_id);
  const taskId = text(row.taskId ?? row.task_id);
  const taskType = text(row.taskType ?? row.task_type);
  const goal = text(row.goal);
  const userPrompt = text(row.userPrompt ?? row.user_prompt);
  const requestId = text(row.requestId ?? row.request_id);
  const logicalActionId = text(row.logicalActionId ?? row.logical_action_id);
  const contextRefs = unique(strings(row.contextRefs ?? row.context_refs));
  const appliedExperienceIds = unique(strings(row.appliedExperienceIds ?? row.applied_experience_ids));
  const capabilityScope = unique(strings(row.capabilityScope ?? row.capability_scope));
  const messages = normalizedMessages(row.messages);
  const materials = normalizedMaterials(row.materials, workspaceId);

  if (!tenantId || !actorId || !workspaceId || !taskId || !taskType || !goal || !userPrompt || !requestId || !logicalActionId) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Agent 请求缺少 tenant / actor / workspace / task / goal / request / logical action scope。" } };
  }
  if (!capabilityScope.includes("task.run")) {
    return { ok: false, error: { code: "FORBIDDEN", message: "Agent capability scope 缺少 task.run。" } };
  }
  if (!messages) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Agent messages 必须包含有效消息。" } };
  if (!materials) return { ok: false, error: { code: "WORKSPACE_REVOKED", message: "Agent materials 存在越过当前 Workspace 的上下文。" } };

  const materialIds = materials.map((item) => item.id);
  if (contextRefs.some((ref) => !materialIds.includes(ref))) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Agent contextRefs 必须来自当前 Workspace materials。" } };
  }

  return {
    ok: true,
    data: {
      tenantId,
      actorId,
      workspaceId,
      taskId,
      taskType,
      goal,
      userPrompt,
      contextRefs,
      appliedExperienceIds,
      capabilityScope,
      requestId,
      logicalActionId,
      messages,
      materials,
    },
  };
}

function normalizeEvidence(value: unknown): AgentEvidenceProjection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): AgentEvidenceProjection[] => {
    const row = record(item);
    if (!row) return [];
    const title = text(row.title);
    const snippet = text(row.snippet ?? row.quote ?? row.content);
    const source = text(row.source ?? row.url);
    if (!title || !snippet || !source) return [];
    return [{
      id: text(row.id ?? row.ref) || undefined,
      type: text(row.type) || "SOURCE",
      title,
      snippet,
      source,
      time: text(row.time ?? row.occurred_at ?? row.published_at) || undefined,
      url: text(row.url) || undefined,
    }];
  });
}

function normalizeJudgments(value: unknown): MarketingJudgment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const judgments = value.flatMap((item): MarketingJudgment[] => {
    const row = record(item);
    const claim = text(row?.claim);
    const rationale = text(row?.rationale);
    if (!claim || !rationale) return [];
    const evidenceRefs = unique(strings(row?.evidence_refs ?? row?.evidenceRefs));
    return [{
      claim,
      rationale,
      evidenceRefs,
      confidence: typeof row?.confidence === "number" && Number.isFinite(row.confidence) ? row.confidence : undefined,
      assumptions: strings(row?.assumptions),
      unknowns: strings(row?.unknowns),
    }];
  });
  return judgments.length ? judgments : undefined;
}

function normalizedStatus(value: unknown): MarketingAgentResultStatus | null {
  const status = text(value).toLowerCase();
  if (status === "succeeded" || status === "success" || status === "completed") return "succeeded";
  if (status === "failed" || status === "error") return "failed";
  return null;
}

export function normalizeAgentRuntimeResponse(
  value: unknown,
  expected: { taskId: string; appliedExperienceIds: string[]; fallbackTraceId?: string },
): MarketingAgentRouteResponse {
  const envelope = record(value);
  if (!envelope) return { ok: false, error: { code: "UNKNOWN_UPSTREAM_ERROR", message: "AWKN Agent 返回了无效响应。", retryable: true }, trace_id: expected.fallbackTraceId };
  const traceId = text(envelope.trace_id ?? envelope.traceId) || expected.fallbackTraceId;

  if (typeof envelope.ok === "boolean" && !envelope.ok) {
    const upstreamError = record(envelope.error);
    return {
      ok: false,
      error: {
        code: text(upstreamError?.code) || "RUN_FAILED",
        message: text(upstreamError?.message) || "AWKN Agent 执行失败。",
        retryable: typeof upstreamError?.retryable === "boolean" ? upstreamError.retryable : undefined,
      },
      trace_id: traceId,
    };
  }

  const data = record(typeof envelope.ok === "boolean" ? envelope.data : envelope);
  if (!data) return { ok: false, error: { code: "UNKNOWN_UPSTREAM_ERROR", message: "AWKN Agent 缺少结果数据。", retryable: true }, trace_id: traceId };
  if ((Array.isArray(data.side_effects) && data.side_effects.length > 0) || (Array.isArray(data.tool_actions) && data.tool_actions.length > 0)) {
    return { ok: false, error: { code: "UNSUPPORTED_OPERATION", message: "Agent 返回了未经产品 Approval 的外部副作用。", retryable: false }, trace_id: traceId };
  }

  const taskId = text(data.task_id ?? data.taskId);
  const runId = text(data.run_id ?? data.runId);
  const status = normalizedStatus(data.status);
  const textResult = text(data.text);
  if (!taskId || taskId !== expected.taskId) return { ok: false, error: { code: "IDENTITY_MISMATCH", message: `Agent task identity 与 ${expected.taskId} 不一致。`, retryable: false }, trace_id: traceId };
  if (!runId) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Agent Result 缺少 run_id。", retryable: false }, trace_id: traceId };
  if (!status) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Agent Result 返回了无效 status。", retryable: false }, trace_id: traceId };
  if (status === "succeeded" && !textResult) return { ok: false, error: { code: "VALIDATION_ERROR", message: "成功 Agent Result 缺少 text。", retryable: false }, trace_id: traceId };

  const returnedExperienceIds = unique(strings(data.applied_experience_ids ?? data.appliedExperienceIds));
  if (returnedExperienceIds.some((id) => !expected.appliedExperienceIds.includes(id))) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Agent Result 引用了输入范围外的 Experience。", retryable: false }, trace_id: traceId };
  }
  const appliedExperienceIds = returnedExperienceIds.length ? returnedExperienceIds : expected.appliedExperienceIds;
  const evidence = normalizeEvidence(data.evidence);
  const evidenceRefs = unique([
    ...strings(data.evidence_refs ?? data.evidenceRefs),
    ...evidence.map((item) => item.id || item.url || item.source).filter(Boolean),
  ]);

  let artifact: AgentArtifactProjection | null = null;
  const artifactRow = record(data.artifact);
  if (artifactRow) {
    const content = text(artifactRow.content ?? artifactRow.text ?? artifactRow.markdown);
    if (!content) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Agent Artifact 缺少内容。", retryable: false }, trace_id: traceId };
    const artifactTaskId = text(artifactRow.task_id ?? artifactRow.taskId);
    if (artifactTaskId && artifactTaskId !== expected.taskId) {
      return { ok: false, error: { code: "IDENTITY_MISMATCH", message: "Agent Artifact task identity 与当前 Task 不一致。", retryable: false }, trace_id: traceId };
    }
    artifact = {
      taskId: expected.taskId,
      title: text(artifactRow.title) || "Agent 产出",
      content,
      format: text(artifactRow.format) || undefined,
    };
  } else if (typeof data.artifact === "string" && data.artifact.trim()) {
    artifact = { taskId: expected.taskId, title: "Agent 产出", content: data.artifact.trim() };
  }

  return {
    ok: true,
    data: {
      taskId: expected.taskId,
      runId,
      status,
      text: textResult,
      judgment: normalizeJudgments(data.judgment),
      artifact,
      evidence,
      evidenceRefs,
      appliedExperienceIds,
      traceId,
      error: status === "failed" ? {
        code: text(record(data.error)?.code) || "RUN_FAILED",
        retryable: typeof record(data.error)?.retryable === "boolean" ? Boolean(record(data.error)?.retryable) : undefined,
      } : undefined,
    },
    trace_id: traceId,
  };
}
