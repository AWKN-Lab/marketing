import assert from "node:assert/strict";
import { POST as agentRoute } from "../app/api/agent/route.ts";
import { POST as materialUploadRoute } from "../app/api/material-upload/route.ts";
import { POST as productRoute } from "../app/api/product/route.ts";
import {
  agentRunIdempotencyKey,
  stableAgentLogicalActionId,
  type MarketingAgentInput,
} from "../lib/agent-contract.ts";
import { materialUploadIdempotencyKey } from "../lib/material-contract.ts";
import { workspaceUpdateIdempotencyKey } from "../lib/workspace-contract.ts";
import { assertP6FaultMatrixRecord } from "./p6-failure-support.ts";
import { runP6Case } from "./p6-test-support.ts";

const NOW = "2026-09-05T10:28:00.000Z";
const WORKSPACE_ID = "w-p6-dependency-unavailable";
const TASK_ID = "task-p6-dependency-unavailable";
const MATERIAL_ID = "material-p6-dependency-unavailable";
const BASE_REVISION = 4;
const PRODUCT_KEY = workspaceUpdateIdempotencyKey(WORKSPACE_ID, BASE_REVISION, "fp-w7-16-product");
const MESSAGES = [{ role: "user", content: "验证依赖暂时不可用后的同逻辑恢复。" }];
const LOGICAL_ACTION_ID = stableAgentLogicalActionId({
  taskId: TASK_ID,
  messages: MESSAGES,
  appliedExperienceIds: [],
});
const AGENT_KEY = agentRunIdempotencyKey(TASK_ID, LOGICAL_ACTION_ID);
const MATERIAL_CONTENT = "dependency-recovery";
const MATERIAL_FILE_NAME = "dependency.txt";
const MATERIAL_FILE_SIZE = MATERIAL_CONTENT.length;
const MATERIAL_KEY = materialUploadIdempotencyKey({
  materialId: MATERIAL_ID,
  fileName: MATERIAL_FILE_NAME,
  fileSize: MATERIAL_FILE_SIZE,
});

type Responder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function withProductUpstream<T>(responder: Responder, run: () => Promise<T>) {
  const previousEndpoint = process.env.AWKN_MARKETING_API_URL;
  const previousToken = process.env.AWKN_MARKETING_API_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_API_URL = "https://product.integration.invalid";
  process.env.AWKN_MARKETING_API_TOKEN = "service-secret";
  globalThis.fetch = responder as typeof fetch;
  try {
    return await run();
  } finally {
    if (typeof previousEndpoint === "undefined") delete process.env.AWKN_MARKETING_API_URL;
    else process.env.AWKN_MARKETING_API_URL = previousEndpoint;
    if (typeof previousToken === "undefined") delete process.env.AWKN_MARKETING_API_TOKEN;
    else process.env.AWKN_MARKETING_API_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
}

async function withAgentUpstream<T>(responder: Responder, run: () => Promise<T>) {
  const previousEndpoint = process.env.AWKN_MARKETING_AGENT_URL;
  const previousToken = process.env.AWKN_MARKETING_AGENT_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_AGENT_URL = "https://agent.integration.invalid";
  process.env.AWKN_MARKETING_AGENT_TOKEN = "agent-service-secret";
  globalThis.fetch = responder as typeof fetch;
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

async function withMaterialUpstream<T>(responder: Responder, run: () => Promise<T>) {
  const previousEndpoint = process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL;
  const previousToken = process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.AWKN_MARKETING_MATERIAL_UPLOAD_URL = "https://material.integration.invalid";
  process.env.AWKN_MARKETING_MATERIAL_UPLOAD_TOKEN = "material-service-secret";
  globalThis.fetch = responder as typeof fetch;
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

function productBody(requestId: string) {
  return {
    product: "awkn-marketing" as const,
    operation: "workspace.update" as const,
    request_id: requestId,
    idempotency_key: PRODUCT_KEY,
    workspace_id: WORKSPACE_ID,
    payload: {
      workspace: {
        id: WORKSPACE_ID,
        name: "P6 Dependency Recovery",
        type: "营销项目",
        goal: "验证依赖暂时不可用后的恢复",
      },
      base_revision: BASE_REVISION,
    },
  };
}

function productRequest(requestId: string) {
  return new Request("http://localhost/api/product", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": requestId,
    },
    body: JSON.stringify(productBody(requestId)),
  });
}

function agentInput(requestId: string): MarketingAgentInput {
  return {
    tenantId: "tenant-p6",
    actorId: "actor-p6",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    taskType: "策略判断",
    goal: "验证 Agent dependency recovery",
    userPrompt: "执行受控依赖故障恢复测试。",
    contextRefs: [],
    appliedExperienceIds: [],
    capabilityScope: ["workspace.read", "task.run"],
    requestId,
    logicalActionId: LOGICAL_ACTION_ID,
    messages: MESSAGES,
    materials: [],
  };
}

function agentRequest(input: MarketingAgentInput) {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer actor-token",
      cookie: "awkn_session=actor-cookie",
      "x-request-id": input.requestId,
    },
    body: JSON.stringify(input),
  });
}

function materialRequest(requestId: string) {
  const form = new FormData();
  form.set("workspace_id", WORKSPACE_ID);
  form.set("material_id", MATERIAL_ID);
  form.set("file", new File([MATERIAL_CONTENT], MATERIAL_FILE_NAME, { type: "text/plain" }), MATERIAL_FILE_NAME);
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

function errorOf(body: Record<string, unknown>) {
  return body.error as Record<string, unknown>;
}

async function main() {
  await runP6Case("W7-16 product dependency connection failure is retryable and recovers with the same key", async () => {
    let attempts = 0;
    let logicalSideEffects = 0;
    const observedKeys: string[] = [];

    await withProductUpstream(async (_input, init) => {
      attempts += 1;
      const outgoing = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      observedKeys.push(String(outgoing.idempotency_key ?? ""));
      if (attempts === 1) throw new TypeError("connect ECONNREFUSED product dependency");

      logicalSideEffects += 1;
      return new Response(JSON.stringify({
        ok: true,
        data: { entity_id: WORKSPACE_ID, revision: 5, updated_at: NOW },
        trace_id: "trace-w7-16-product-recovered",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const firstResponse = await productRoute(productRequest("req-w7-16-product-first"));
      const firstBody = await firstResponse.json() as Record<string, unknown>;
      assert.equal(firstResponse.status, 502);
      assert.equal(firstBody.ok, false);
      assert.equal(errorOf(firstBody).code, "UPSTREAM_UNAVAILABLE");
      assert.equal(errorOf(firstBody).retryable, true);
      assert.equal("data" in firstBody, false);

      const retryResponse = await productRoute(productRequest("req-w7-16-product-retry"));
      const retryBody = await retryResponse.json() as Record<string, unknown>;
      assert.equal(retryResponse.status, 200);
      assert.equal(retryBody.ok, true);
      assert.equal((retryBody.data as Record<string, unknown>).entity_id, WORKSPACE_ID);
      assert.equal((retryBody.data as Record<string, unknown>).revision, 5);
      assert.equal(retryBody.trace_id, "trace-w7-16-product-recovered");
    });

    assert.equal(attempts, 2);
    assert.equal(logicalSideEffects, 1);
    assert.deepEqual(observedKeys, [PRODUCT_KEY, PRODUCT_KEY]);
    assertP6FaultMatrixRecord({
      operation: "workspace.update",
      expectedState: "temporary-dependency-outage-recovers-on-same-key-retry",
      actualState: "recovered-r5",
      errorCode: "UPSTREAM_UNAVAILABLE",
      retryable: true,
      requestId: "req-w7-16-product-retry",
      idempotencyKey: PRODUCT_KEY,
      traceId: "trace-w7-16-product-recovered",
      sideEffectCount: logicalSideEffects,
      finalRevision: 5,
      finalConsistency: "product-dependency-recovery-preserves-stable-write-identity",
    });
  }, { operation: "workspace.update", entityId: WORKSPACE_ID, traceId: "trace-w7-16-product-recovered" });

  await runP6Case("W7-16 agent dependency connection failure is retryable and preserves logical action identity", async () => {
    let attempts = 0;
    let logicalSideEffects = 0;
    const observedKeys: string[] = [];

    await withAgentUpstream(async (_input, init) => {
      attempts += 1;
      observedKeys.push(new Headers(init?.headers).get("x-idempotency-key") ?? "");
      if (attempts === 1) throw new TypeError("connect ECONNREFUSED agent dependency");

      logicalSideEffects += 1;
      return new Response(JSON.stringify({
        ok: true,
        data: {
          task_id: TASK_ID,
          run_id: "run-w7-16-agent",
          status: "succeeded",
          text: "dependency recovered",
          artifact: { title: "Recovered", content: "Agent dependency recovered." },
          evidence: [],
          applied_experience_ids: [],
        },
        trace_id: "trace-w7-16-agent-recovered",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const firstInput = agentInput("req-w7-16-agent-first");
      const firstResponse = await agentRoute(agentRequest(firstInput));
      const firstBody = await firstResponse.json() as Record<string, unknown>;
      assert.equal(firstResponse.status, 502);
      assert.equal(firstBody.ok, false);
      assert.equal(errorOf(firstBody).code, "UPSTREAM_UNAVAILABLE");
      assert.equal(errorOf(firstBody).retryable, true);
      assert.equal("data" in firstBody, false);

      const retryInput = agentInput("req-w7-16-agent-retry");
      const retryResponse = await agentRoute(agentRequest(retryInput));
      const retryBody = await retryResponse.json() as Record<string, unknown>;
      assert.equal(retryResponse.status, 200);
      assert.equal(retryBody.ok, true);
      assert.equal((retryBody.data as Record<string, unknown>).task_id, TASK_ID);
      assert.equal((retryBody.data as Record<string, unknown>).run_id, "run-w7-16-agent");
      assert.equal(retryBody.trace_id, "trace-w7-16-agent-recovered");
    });

    assert.equal(attempts, 2);
    assert.equal(logicalSideEffects, 1);
    assert.deepEqual(observedKeys, [AGENT_KEY, AGENT_KEY]);
    assertP6FaultMatrixRecord({
      operation: "task.run",
      expectedState: "temporary-agent-outage-recovers-with-same-logical-action",
      actualState: "agent-run-recovered",
      errorCode: "UPSTREAM_UNAVAILABLE",
      retryable: true,
      requestId: "req-w7-16-agent-retry",
      idempotencyKey: AGENT_KEY,
      traceId: "trace-w7-16-agent-recovered",
      sideEffectCount: logicalSideEffects,
      finalRevision: null,
      finalConsistency: "agent-dependency-recovery-keeps-logical-action-idempotent",
    });
  }, { operation: "task.run", entityId: TASK_ID, traceId: "trace-w7-16-agent-recovered" });

  await runP6Case("W7-16 material dependency connection failure is retryable and preserves upload identity", async () => {
    let attempts = 0;
    let logicalSideEffects = 0;
    const observedKeys: string[] = [];

    await withMaterialUpstream(async (_input, init) => {
      attempts += 1;
      const outgoing = init?.body as FormData;
      observedKeys.push(String(outgoing.get("idempotency_key") ?? ""));
      if (attempts === 1) throw new TypeError("connect ECONNREFUSED material dependency");

      logicalSideEffects += 1;
      return new Response(JSON.stringify({
        ok: true,
        data: {
          material_id: MATERIAL_ID,
          revision: 1,
          updated_at: NOW,
          parse_status: "queued",
        },
        trace_id: "trace-w7-16-material-recovered",
      }), { status: 200, headers: { "content-type": "application/json" } });
    }, async () => {
      const firstResponse = await materialUploadRoute(materialRequest("req-w7-16-material-first"));
      const firstBody = await firstResponse.json() as Record<string, unknown>;
      assert.equal(firstResponse.status, 502);
      assert.equal(firstBody.ok, false);
      assert.equal(errorOf(firstBody).code, "MATERIAL_UPLOAD_UPSTREAM_UNAVAILABLE");
      assert.equal(errorOf(firstBody).retryable, true);
      assert.equal("data" in firstBody, false);

      const retryResponse = await materialUploadRoute(materialRequest("req-w7-16-material-retry"));
      const retryBody = await retryResponse.json() as Record<string, unknown>;
      assert.equal(retryResponse.status, 200);
      assert.equal(retryBody.ok, true);
      assert.equal((retryBody.data as Record<string, unknown>).material_id, MATERIAL_ID);
      assert.equal((retryBody.data as Record<string, unknown>).revision, 1);
      assert.equal(retryBody.trace_id, "trace-w7-16-material-recovered");
    });

    assert.equal(attempts, 2);
    assert.equal(logicalSideEffects, 1);
    assert.deepEqual(observedKeys, [MATERIAL_KEY, MATERIAL_KEY]);
    assertP6FaultMatrixRecord({
      operation: "material.upload",
      expectedState: "temporary-material-outage-recovers-with-same-upload-key",
      actualState: "material-upload-recovered-r1",
      errorCode: "MATERIAL_UPLOAD_UPSTREAM_UNAVAILABLE",
      retryable: true,
      requestId: "req-w7-16-material-retry",
      idempotencyKey: MATERIAL_KEY,
      traceId: "trace-w7-16-material-recovered",
      sideEffectCount: logicalSideEffects,
      finalRevision: 1,
      finalConsistency: "material-dependency-recovery-preserves-stable-upload-identity",
    });
  }, { operation: "material.upload", entityId: MATERIAL_ID, traceId: "trace-w7-16-material-recovered" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
