import assert from "node:assert/strict";
import { POST as agentRoute } from "../app/api/agent/route.ts";
import { POST as materialUploadRoute } from "../app/api/material-upload/route.ts";
import { agentRunIdempotencyKey, stableAgentLogicalActionId, type MarketingAgentInput } from "../lib/agent-contract.ts";
import { materialUploadIdempotencyKey } from "../lib/material-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const WORKSPACE_ID = "w-p6-adapter-http";
const TASK_ID = "task-p6-adapter-http";
const MATERIAL_ID = "material-p6-adapter-http";
const NOW = "2026-09-05T08:40:00.000Z";
const MESSAGES = [{ role: "user", content: "验证传输层失败不能伪装成功。" }];
const LOGICAL_ACTION_ID = stableAgentLogicalActionId({ taskId: TASK_ID, messages: MESSAGES, appliedExperienceIds: [] });

function agentInput(requestId: string): MarketingAgentInput {
  return {
    tenantId: "tenant-p6",
    actorId: "actor-p6",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    taskType: "策略判断",
    goal: "验证 Adapter HTTP 失败语义",
    userPrompt: "执行受控故障测试。",
    contextRefs: [],
    appliedExperienceIds: [],
    capabilityScope: ["workspace.read", "task.run"],
    requestId,
    logicalActionId: LOGICAL_ACTION_ID,
    messages: MESSAGES,
    materials: [],
  };
}

function agentRequest(body: MarketingAgentInput) {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": body.requestId,
    },
    body: JSON.stringify(body),
  });
}

async function withAgentUpstream<T>(responder: typeof fetch, run: () => Promise<T>) {
  const previousEndpoint = process.env.AWKN_MARKETING_AGENT_URL;
  const previousToken = process.env.AWKN_MARKETING_AGENT_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_AGENT_URL = "https://agent.integration.invalid";
  process.env.AWKN_MARKETING_AGENT_TOKEN = "agent-service-secret";
  globalThis.fetch = responder;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_AGENT_URL;
    else process.env.AWKN_MARKETING_AGENT_URL = previousEndpoint;
    if (typeof previousToken === "undefined") delete process.env.AWKN_MARKETING_AGENT_TOKEN;
    else process.env.AWKN_MARKETING_AGENT_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
}

function agentSuccess(traceId: string) {
  return {
    ok: true,
    data: {
      task_id: TASK_ID,
      run_id: "run-p6-adapter-http",
      status: "succeeded",
      text: "受控成功载荷",
      artifact: { title: "测试产物", content: "transport status must remain authoritative" },
      evidence: [],
      applied_experience_ids: [],
    },
    trace_id: traceId,
  };
}

function materialRequest(requestId: string) {
  const form = new FormData();
  form.set("workspace_id", WORKSPACE_ID);
  form.set("material_id", MATERIAL_ID);
  form.set("file", new File(["adapter-http-failure"], "adapter.txt", { type: "text/plain" }), "adapter.txt");
  return new Request("http://localhost/api/material-upload", {
    method: "POST",
    headers: {
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": requestId,
    },
    body: form,
  });
}

async function withMaterialUpstream<T>(responder: typeof fetch, run: () => Promise<T>) {
  const previousEndpoint = process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL;
  const previousToken = process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL = "https://material.integration.invalid";
  process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN = "material-service-secret";
  globalThis.fetch = responder;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL;
    else process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL = previousEndpoint;
    if (typeof previousToken === "undefined") delete process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN;
    else process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
}

async function main() {
  await runP6Case("audit: agent HTTP 5xx cannot project a valid ok=true result", async () => {
    let sideEffectCount = 0;
    await withAgentUpstream(async () => {
      sideEffectCount += 1;
      return new Response(JSON.stringify(agentSuccess("trace-agent-false-success-5xx")), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }, async () => {
      const input = agentInput("req-agent-false-success-5xx");
      const response = await agentRoute(agentRequest(input));
      const body = await response.json() as Record<string, unknown>;
      const error = body.error as Record<string, unknown>;
      assert.equal(response.status, 503);
      assert.equal(body.ok, false);
      assert.equal(error.code, "UPSTREAM_UNAVAILABLE");
      assert.equal(error.retryable, true);
      assert.equal(body.trace_id, "trace-agent-false-success-5xx");
      assert.equal("data" in body, false);
      assertP6FaultMatrixRecord({
        operation: "task.run",
        expectedState: "transport-failure-fail-closed",
        actualState: String(error.code),
        errorCode: String(error.code),
        retryable: Boolean(error.retryable),
        requestId: input.requestId,
        idempotencyKey: agentRunIdempotencyKey(TASK_ID, LOGICAL_ACTION_ID),
        traceId: String(body.trace_id),
        sideEffectCount,
        finalRevision: null,
        finalConsistency: "agent-5xx-success-envelope-not-projected",
      });
    });
  }, { operation: "task.run", entityId: TASK_ID, traceId: "trace-agent-false-success-5xx" });

  await runP6Case("audit: agent HTTP 429 cannot project a valid ok=true result", async () => {
    await withAgentUpstream(async () => new Response(JSON.stringify(agentSuccess("trace-agent-false-success-429")), {
      status: 429,
      headers: { "content-type": "application/json" },
    }), async () => {
      const input = agentInput("req-agent-false-success-429");
      const response = await agentRoute(agentRequest(input));
      const body = await response.json() as Record<string, unknown>;
      const error = body.error as Record<string, unknown>;
      assert.equal(response.status, 429);
      assert.equal(body.ok, false);
      assert.equal(error.code, "RATE_LIMITED");
      assert.equal(error.retryable, true);
      assert.equal(body.trace_id, "trace-agent-false-success-429");
      assert.equal("data" in body, false);
    });
  }, { operation: "task.run", entityId: TASK_ID, traceId: "trace-agent-false-success-429" });

  await runP6Case("audit: material upload HTTP 5xx cannot project a valid ok=true Ack", async () => {
    let capturedKey = "";
    let sideEffectCount = 0;
    await withMaterialUpstream(async (_input, init) => {
      const outgoing = init?.body as FormData;
      capturedKey = String(outgoing.get("idempotency_key") ?? "");
      sideEffectCount += 1;
      return new Response(JSON.stringify({
        ok: true,
        data: { material_id: MATERIAL_ID, revision: 1, updated_at: NOW, parse_status: "queued" },
        trace_id: "trace-material-false-success-5xx",
      }), { status: 503, headers: { "content-type": "application/json" } });
    }, async () => {
      const response = await materialUploadRoute(materialRequest("req-material-false-success-5xx"));
      const body = await response.json() as Record<string, unknown>;
      const error = body.error as Record<string, unknown>;
      assert.equal(response.status, 503);
      assert.equal(body.ok, false);
      assert.equal(error.code, "MATERIAL_UPLOAD_UPSTREAM_UNAVAILABLE");
      assert.equal(error.retryable, true);
      assert.equal(body.trace_id, "trace-material-false-success-5xx");
      assert.equal("data" in body, false);
      assertP6FaultMatrixRecord({
        operation: "material.upload",
        expectedState: "transport-failure-fail-closed",
        actualState: String(error.code),
        errorCode: String(error.code),
        retryable: Boolean(error.retryable),
        requestId: "req-material-false-success-5xx",
        idempotencyKey: capturedKey,
        traceId: String(body.trace_id),
        sideEffectCount,
        finalRevision: null,
        finalConsistency: "material-5xx-success-ack-not-projected",
      });
      assert.equal(capturedKey, materialUploadIdempotencyKey({ materialId: MATERIAL_ID, fileName: "adapter.txt", fileSize: 20 }));
    });
  }, { operation: "material.upload", entityId: MATERIAL_ID, traceId: "trace-material-false-success-5xx" });

  await runP6Case("audit: material upload HTTP 429 cannot project a valid ok=true Ack", async () => {
    await withMaterialUpstream(async () => new Response(JSON.stringify({
      ok: true,
      data: { material_id: MATERIAL_ID, revision: 1, updated_at: NOW, parse_status: "queued" },
      trace_id: "trace-material-false-success-429",
    }), { status: 429, headers: { "content-type": "application/json" } }), async () => {
      const response = await materialUploadRoute(materialRequest("req-material-false-success-429"));
      const body = await response.json() as Record<string, unknown>;
      const error = body.error as Record<string, unknown>;
      assert.equal(response.status, 429);
      assert.equal(body.ok, false);
      assert.equal(error.code, "RATE_LIMITED");
      assert.equal(error.retryable, true);
      assert.equal(body.trace_id, "trace-material-false-success-429");
      assert.equal("data" in body, false);
    });
  }, { operation: "material.upload", entityId: MATERIAL_ID, traceId: "trace-material-false-success-429" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
