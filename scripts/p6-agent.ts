import assert from "node:assert/strict";
import { POST as agentRoute } from "../app/api/agent/route.ts";
import {
  agentRunIdempotencyKey,
  appliedExperienceStableId,
  normalizeMarketingAgentInput,
  stableAgentLogicalActionId,
  type MarketingAgentInput,
} from "../lib/agent-contract.ts";
import { runP6Case } from "./p6-test-support.ts";

const TASK_ID = "task-p6-agent";
const WORKSPACE_ID = "w-p6-agent";
const APPLIED_ID = "local-ev-source-task";
const MESSAGES = [
  { role: "user", content: "基于当前 Workspace 资料给出下一步策略。" },
  { role: "assistant", content: "先核验资料与已确认经验。" },
];
const LOGICAL_ACTION_ID = stableAgentLogicalActionId({ taskId: TASK_ID, messages: MESSAGES, appliedExperienceIds: [APPLIED_ID] });

type UpstreamResponder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function input(requestId = "req-agent-1"): MarketingAgentInput {
  return {
    tenantId: "tenant-p6",
    actorId: "actor-p6",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    taskType: "策略判断",
    goal: "形成可执行的下一步策略",
    userPrompt: "结合当前资料和已确认经验执行任务。",
    contextRefs: ["material-1"],
    appliedExperienceIds: [APPLIED_ID],
    capabilityScope: ["workspace.read", "task.run"],
    requestId,
    logicalActionId: LOGICAL_ACTION_ID,
    messages: MESSAGES,
    materials: [{
      id: "material-1",
      workspace_id: WORKSPACE_ID,
      title: "客户资料",
      kind: "MD",
      source: "workspace",
      status: "Ready",
      parse_mode: "local_text",
      content: "当前客户只关注可验证的业务结果。",
    }],
  };
}

function request(body: unknown) {
  const row = body as Partial<MarketingAgentInput>;
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": row.requestId ?? "req-agent",
    },
    body: JSON.stringify(body),
  });
}

async function routeJson(body: unknown) {
  const response = await agentRoute(request(body));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function withAgentUpstream<T>(responder: UpstreamResponder, run: () => Promise<T>, timeout = "30000"): Promise<T> {
  const previousEndpoint = process.env.AWKN_MARKETING_AGENT_URL;
  const previousToken = process.env.AWKN_MARKETING_AGENT_TOKEN;
  const previousTimeout = process.env.AWKN_MARKETING_AGENT_TIMEOUT_MS;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_AGENT_URL = "https://agent.integration.invalid";
  process.env.AWKN_MARKETING_AGENT_TOKEN = "agent-service-secret";
  process.env.AWKN_MARKETING_AGENT_TIMEOUT_MS = timeout;
  globalThis.fetch = responder as typeof fetch;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_AGENT_URL;
    else process.env.AWKN_MARKETING_AGENT_URL = previousEndpoint;
    if (typeof previousToken === "undefined") delete process.env.AWKN_MARKETING_AGENT_TOKEN;
    else process.env.AWKN_MARKETING_AGENT_TOKEN = previousToken;
    if (typeof previousTimeout === "undefined") delete process.env.AWKN_MARKETING_AGENT_TIMEOUT_MS;
    else process.env.AWKN_MARKETING_AGENT_TIMEOUT_MS = previousTimeout;
    globalThis.fetch = previousFetch;
  }
}

function successResponse(runId = "run-agent-1") {
  return {
    ok: true,
    data: {
      task_id: TASK_ID,
      run_id: runId,
      status: "succeeded",
      text: "优先推进已有明确反馈的客户场景。",
      judgment: [{ claim: "先做高证据场景", rationale: "当前资料已有明确业务反馈", evidence_refs: ["evidence-1"] }],
      artifact: { title: "下一步策略", content: "1. 聚焦高证据场景\n2. 验证真实 Outcome" },
      evidence: [{ id: "evidence-1", type: "MATERIAL", title: "客户资料", snippet: "只关注可验证业务结果", source: "material-1" }],
      applied_experience_ids: [APPLIED_ID],
    },
    trace_id: "trace-agent-1",
  };
}

async function main() {
  await runP6Case("applied experience identity stays stable across agent requests", () => {
    assert.equal(appliedExperienceStableId({ id: APPLIED_ID, lesson: "已确认经验", source: "task-1" }), APPLIED_ID);
    const fallbackA = appliedExperienceStableId({ lesson: "旧经验", source: "legacy-task" });
    const fallbackB = appliedExperienceStableId({ lesson: "旧经验", source: "legacy-task" });
    assert.equal(fallbackA, fallbackB);
    assert.ok(fallbackA.startsWith("experience-"));
    assert.equal(LOGICAL_ACTION_ID, stableAgentLogicalActionId({ taskId: TASK_ID, messages: MESSAGES, appliedExperienceIds: [APPLIED_ID] }));
  }, { operation: "task.run", entityId: TASK_ID });

  await runP6Case("agent input fails closed on revoked workspace context and unsupported side effects", () => {
    assert.equal(normalizeMarketingAgentInput(input()).ok, true);

    const crossWorkspace = input();
    crossWorkspace.materials = [{ ...crossWorkspace.materials[0], workspace_id: "w-revoked" }];
    const revoked = normalizeMarketingAgentInput(crossWorkspace);
    assert.equal(revoked.ok, false);
    if (!revoked.ok) assert.equal(revoked.error.code, "WORKSPACE_REVOKED");

    const missingCapability = input();
    missingCapability.capabilityScope = ["workspace.read"];
    const forbidden = normalizeMarketingAgentInput(missingCapability);
    assert.equal(forbidden.ok, false);
    if (!forbidden.ok) assert.equal(forbidden.error.code, "FORBIDDEN");

    const unsupported = normalizeMarketingAgentInput({ ...input(), requestedSideEffects: [{ type: "send.email" }] });
    assert.equal(unsupported.ok, false);
    if (!unsupported.ok) assert.equal(unsupported.error.code, "UNSUPPORTED_OPERATION");
  }, { operation: "task.run", entityId: TASK_ID });

  await runP6Case("task.run forwards full scope and projects traceable agent result", async () => {
    await withAgentUpstream(async (_upstream, init) => {
      const headers = new Headers(init?.headers);
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const payload = body.payload as Record<string, unknown>;
      assert.equal(body.product, "awkn-marketing");
      assert.equal(body.operation, "task.run");
      assert.equal(body.workspace_id, WORKSPACE_ID);
      assert.equal(body.task_id, TASK_ID);
      assert.equal(body.idempotency_key, agentRunIdempotencyKey(TASK_ID, LOGICAL_ACTION_ID));
      assert.equal(headers.get("x-idempotency-key"), agentRunIdempotencyKey(TASK_ID, LOGICAL_ACTION_ID));
      assert.equal(headers.get("x-request-id"), "req-agent-scope");
      assert.equal(headers.get("authorization"), "Bearer agent-service-secret");
      assert.equal(headers.get("x-awkn-user-authorization"), "Bearer actor-token");
      assert.equal(payload.tenantId, "tenant-p6");
      assert.equal(payload.actorId, "actor-p6");
      assert.deepEqual(payload.contextRefs, ["material-1"]);
      assert.deepEqual(payload.appliedExperienceIds, [APPLIED_ID]);
      assert.equal(((payload.materials as Array<Record<string, unknown>>)[0]).workspace_id, WORKSPACE_ID);
      return new Response(JSON.stringify(successResponse()), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const result = await routeJson(input("req-agent-scope"));
      assert.equal(result.status, 200);
      assert.equal(result.body.ok, true);
      const data = result.body.data as Record<string, unknown>;
      assert.equal(data.taskId, TASK_ID);
      assert.equal(data.runId, "run-agent-1");
      assert.equal(data.status, "succeeded");
      assert.equal(data.traceId, "trace-agent-1");
      assert.deepEqual(data.evidenceRefs, ["evidence-1"]);
      assert.deepEqual(data.appliedExperienceIds, [APPLIED_ID]);
      const artifact = data.artifact as Record<string, unknown>;
      assert.equal(artifact.taskId, TASK_ID);
      assert.equal(artifact.title, "下一步策略");
    });
  }, { operation: "task.run", entityId: TASK_ID, traceId: "trace-agent-1" });

  await runP6Case("same logical task.run retry preserves one logical run", async () => {
    const runByKey = new Map<string, string>();
    let logicalSideEffects = 0;
    await withAgentUpstream(async (_upstream, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      const key = String(body.idempotency_key ?? "");
      let runId = runByKey.get(key);
      if (!runId) {
        logicalSideEffects += 1;
        runId = "run-agent-idempotent";
        runByKey.set(key, runId);
      }
      return new Response(JSON.stringify(successResponse(runId)), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const first = await routeJson(input("req-agent-retry-1"));
      const second = await routeJson(input("req-agent-retry-2"));
      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal((first.body.data as Record<string, unknown>).runId, "run-agent-idempotent");
      assert.equal((second.body.data as Record<string, unknown>).runId, "run-agent-idempotent");
    });
    assert.equal(logicalSideEffects, 1);
    assert.equal(runByKey.size, 1);
  }, { operation: "task.run", entityId: TASK_ID });

  await runP6Case("agent result blocks identity mismatch, missing run id and unsupported side effects", async () => {
    await withAgentUpstream(async () => new Response(JSON.stringify({
      ...successResponse(),
      data: { ...successResponse().data, task_id: "task-other" },
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(input("req-agent-task-mismatch"));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "IDENTITY_MISMATCH");
    });

    await withAgentUpstream(async () => new Response(JSON.stringify({
      ...successResponse(),
      data: { ...successResponse().data, run_id: undefined },
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(input("req-agent-run-missing"));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "VALIDATION_ERROR");
    });

    await withAgentUpstream(async () => new Response(JSON.stringify({
      ...successResponse(),
      data: { ...successResponse().data, side_effects: [{ type: "send.email" }] },
    }), { status: 200, headers: { "content-type": "application/json" } }), async () => {
      const result = await routeJson(input("req-agent-side-effect"));
      assert.equal(result.status, 502);
      assert.equal((result.body.error as Record<string, unknown>).code, "UNSUPPORTED_OPERATION");
    });
  }, { operation: "task.run", entityId: TASK_ID });

  await runP6Case("agent timeout is retryable with the same logical action", async () => {
    await withAgentUpstream(async (_upstream, init) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const abort = () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      };
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });
    }), async () => {
      const result = await routeJson(input("req-agent-timeout"));
      assert.equal(result.status, 504);
      assert.equal((result.body.error as Record<string, unknown>).code, "UPSTREAM_TIMEOUT");
      assert.equal((result.body.error as Record<string, unknown>).retryable, true);
    }, "10");
  }, { operation: "task.run", entityId: TASK_ID });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
