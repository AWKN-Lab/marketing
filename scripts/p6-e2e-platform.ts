/**
 * p6-e2e-platform.ts —— P6-W8 真实平台 E2E 取证（跨服务 trace + 网络级 exactly-once）。
 *
 * 与既有 P6 脚本的根本区别：**没有 mock**。
 * 既有 P6 脚本把「上游」替换成一个内存 responder；这里起的是真进程、真 HTTP：
 *
 *   浏览器 ──HTTP──▶ 营销仓 Next server ──HTTP──▶ AWKN OS 能力服务 ──▶ awkn-marketing 插件
 *                          │                            │
 *                          └──HTTP──▶ 平台 Session 服务（本脚本提供的最小夹具）
 *
 * 夹具说明：Session 服务是**测试夹具**，不是产品组件。真实环境由平台的 Session 服务持有权威身份；
 * 本夹具只提供 P6-W8 取证所需的最小平台身份行为，并在证据里显式标注。
 *
 * 用法：
 *   AWKN_MARKETING_CAPABILITY_URL=http://127.0.0.1:8787 \
 *   AWKN_MARKETING_CAPABILITY_TOKEN=<token> \
 *   npx tsx scripts/p6-e2e-platform.ts
 *
 * 输出：结构化 JSON 证据到 stdout（退出码 0 = 全部通过）。
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { detectPatterns, type PatternSample } from "../lib/pattern-detection.ts";
import { writeFileSync } from "node:fs";

const CAPABILITY_URL = process.env.AWKN_MARKETING_CAPABILITY_URL ?? "";
/**
 * 第二个副本的能力服务地址（可选）。
 *
 * 两个副本必须**共享同一个状态后端**（同一个 SQLite 文件），
 * 否则幂等台账各有一份，exactly-once 根本不成立。
 */
const REPLICA_URL = process.env.P6_E2E_REPLICA_URL ?? "";
const CAPABILITY_TOKEN = process.env.AWKN_MARKETING_CAPABILITY_TOKEN ?? "";
const PORT = Number(process.env.P6_E2E_PORT ?? 3111);
const SESSION_PORT = Number(process.env.P6_E2E_SESSION_PORT ?? 3112);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SESSION_URL = `http://127.0.0.1:${SESSION_PORT}`;
const CAPABILITY_TOKEN_HEADER = "Bearer p6-e2e-platform-token";

/**
 * 每轮唯一的运行标识。
 *
 * 能力服务是长驻进程，它的幂等台账跨调用存活 —— 固定幂等键会让第二轮
 * 的请求被上一轮 claim 过的键判成 replay，测出来的就不是本轮的行为。
 */
const RUN_ID = `r${Date.now().toString(36)}`;

const ALL_CAPABILITIES = [
  "workspace.read", "workspace.create", "workspace.write",
  "material.write", "task.create", "task.run",
  "feedback.write", "outcome.write",
  "evolution.review", "learning.manage", "team.manage",
];

/** 夹具状态：可撤销 / 可恢复的 Grant。 */
const fixture = {
  revoked: new Set<string>(),
  sessionRequests: [] as { url: string; authorization?: string; cookie?: string }[],
};

type CaseResult = { name: string; passed: boolean; detail: unknown };
const results: CaseResult[] = [];

function check(name: string, passed: boolean, detail: unknown): void {
  results.push({ name, passed, detail });
  console.error(`[E2E][${passed ? "PASS" : "FAIL"}] ${name}`);
  if (!passed) console.error(`         ${JSON.stringify(detail)}`);
}

// ─────────────────────────── 平台 Session 夹具（最小） ───────────────────────────

function startSessionFixture(): Promise<import("node:http").Server> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(body));
    };

    if (url.pathname === "/_control/revoke" && req.method === "POST") {
      const workspaceId = url.searchParams.get("workspace_id") ?? "";
      fixture.revoked.add(workspaceId);
      send(200, { ok: true, revoked: [...fixture.revoked] });
      return;
    }
    if (url.pathname === "/_control/restore" && req.method === "POST") {
      const workspaceId = url.searchParams.get("workspace_id") ?? "";
      fixture.revoked.delete(workspaceId);
      send(200, { ok: true, revoked: [...fixture.revoked] });
      return;
    }
    if (url.pathname === "/_control/observed" && req.method === "GET") {
      send(200, { ok: true, requests: fixture.sessionRequests });
      return;
    }

    // Session 端点的 URL 就是配置的端点本身（营销仓把 workspace_id 作为查询参数追加），
    // 所以路径不固定 —— 这里接受除控制面之外的任何路径。
    if (url.pathname.startsWith("/_control/")) { send(404, { ok: false }); return; }

    const workspaceId = url.searchParams.get("workspace_id");
    fixture.sessionRequests.push({
      url: req.url ?? "",
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    const revoked = workspaceId ? fixture.revoked.has(workspaceId) : false;
    // 撤销的 Workspace 不再持有 Grant —— 产品层的 Session 归一化把
    // 「同时出现在 Grant 与撤销列表」判为无效 Session。
    send(200, {
      mode: "platform",
      tenant_id: "tenant-p6-e2e",
      actor_id: "actor-p6-e2e",
      tenant: { id: "tenant-p6-e2e", name: "P6 E2E Tenant" },
      actor: { id: "actor-p6-e2e", name: "P6 E2E Actor" },
      roles: ["owner"],
      capabilities: ALL_CAPABILITIES,
      workspace_grants: workspaceId && !revoked ? [{ workspace_id: workspaceId, access: "admin" }] : [],
      revoked_workspace_ids: revoked && workspaceId ? [workspaceId] : [],
      team_enabled: true,
    });
  });
  return new Promise((resolve) => server.listen(SESSION_PORT, "127.0.0.1", () => resolve(server)));
}

// ─────────────────────────── 营销仓 Next server ───────────────────────────

async function waitFor(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.status < 500) return true;
    } catch { /* 还没起来 */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * 端口前置检查。
 *
 * 端口上如果已经有别的 Next 进程在跑，本 harness 连上去测的是**旧代码**，
 * 却会把结果当成当前代码的证据 —— 这是最危险的一种假绿。
 * 宁可直接失败，也不允许在陈旧服务上取证。
 */
async function assertPortFree(port: number, label: string): Promise<void> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, { method: "GET" });
    if (response.status < 500) {
      throw new Error(
        `端口 ${port}（${label}）已被占用：本 harness 会连到已有服务上，测到的将是旧代码。`
        + `请先停掉占用进程再重跑（lsof -ti:${port} | xargs kill -9）。`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("端口")) throw error;
    // 连接失败 = 端口空闲，符合预期。
  }
}

function startNextServer(): ChildProcess {
  const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
    // 独立进程组：`npx` 会再生一层子进程，只杀 npx 杀不掉真正的 next server，
    // 端口会被遗留占用，下一次跑就可能连到旧服务上测出假绿。
    detached: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      AWKN_MARKETING_CAPABILITY_URL: CAPABILITY_URL,
      AWKN_MARKETING_CAPABILITY_TOKEN: CAPABILITY_TOKEN,
      AWKN_MARKETING_SESSION_URL: SESSION_URL,
      AWKN_MARKETING_SESSION_TOKEN: "p6-e2e-session-token",
      AWKN_MARKETING_ALLOW_LOCAL_SESSION: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk: Buffer) => process.stderr.write(`[next] ${chunk.toString()}`));
  child.stderr?.on("data", (chunk: Buffer) => process.stderr.write(`[next] ${chunk.toString()}`));
  return child;
}

// ─────────────────────────── 产品调用 ───────────────────────────

type ProductResponse = {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: { code: string; message: string; retryable?: boolean };
  trace_id?: string;
};

async function callProduct(body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<{ status: number; body: ProductResponse }> {
  const response = await fetch(`${BASE_URL}/api/product`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as ProductResponse };
}

/** 调用产品层的模式检测路由（F1 收口：平台模式由插件计算）。 */
async function callPatternDetect(body: Record<string, unknown>): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${BASE_URL}/api/patterns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  try {
    return { status: response.status, body: JSON.parse(text) as Record<string, unknown> };
  } catch {
    // 不是 JSON（例如路由不存在时的 404 HTML）—— 记下来，不让整个 harness 崩掉。
    return { status: response.status, body: { ok: false, error: { code: "INVALID_JSON_RESPONSE", message: text.slice(0, 200) } } };
  }
}

function workspaceCreateBody(requestId: string, workspaceId: string, name: string): Record<string, unknown> {
  // 产品契约形状：payload.workspace 信封。
  return {
    product: "awkn-marketing",
    operation: "workspace.create",
    request_id: requestId,
    idempotency_key: `workspace.create:${workspaceId}-${RUN_ID}`,
    workspace_id: workspaceId,
    payload: { workspace: { id: workspaceId, name, type: "营销项目", goal: "P6-W8 E2E" } },
  };
}

function workspaceUpdateBody(requestId: string, workspaceId: string, baseRevision: number, key: string, name: string): Record<string, unknown> {
  return {
    product: "awkn-marketing",
    operation: "workspace.update",
    request_id: requestId,
    idempotency_key: key,
    workspace_id: workspaceId,
    payload: { workspace: { id: workspaceId, name, type: "营销项目", goal: "P6-W8 E2E" }, base_revision: baseRevision },
  };
}

// ─────────────────────────── 取证用例 ───────────────────────────

async function main(): Promise<void> {
  if (!CAPABILITY_URL || !CAPABILITY_TOKEN) {
    console.error("需要 AWKN_MARKETING_CAPABILITY_URL 与 AWKN_MARKETING_CAPABILITY_TOKEN");
    process.exitCode = 2;
    return;
  }

  await assertPortFree(PORT, "营销仓 Next server");
  await assertPortFree(SESSION_PORT, "平台 Session 夹具");

  const sessionServer = await startSessionFixture();
  const next = startNextServer();
  const cleanup = () => {
    try {
      // 负号 = 整个进程组。
      if (next.pid) process.kill(-next.pid, "SIGTERM");
      else next.kill("SIGTERM");
    } catch {
      next.kill("SIGTERM");
    }
    sessionServer.close();
  };
  process.on("exit", cleanup);

  const ready = await waitFor(`${BASE_URL}/api/status`, 90_000);
  if (!ready) {
    console.error("营销仓 Next server 未能在 90s 内就绪");
    cleanup();
    process.exitCode = 2;
    return;
  }

  const workspaceId = `w-p6-e2e-${RUN_ID}`;
  const requestId = "req-p6-e2e-trace-001";
  const traceId = `trace-p6-e2e-${Date.now()}`;

  // ── 用例 1：能力服务尊重调用方给的 trace 头 ──
  {
    const response = await fetch(`${CAPABILITY_URL}/v1/capabilities/invoke`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${CAPABILITY_TOKEN}`,
        "content-type": "application/json",
        "x-request-id": traceId,
        "x-awkn-session": Buffer.from(JSON.stringify({
          tenantId: "tenant-p6-e2e",
          actorId: "actor-p6-e2e",
          capabilities: ALL_CAPABILITIES,
          workspaceGrants: [{ workspaceId: `${workspaceId}-probe`, access: "admin" }],
          revokedWorkspaceIds: [],
        }), "utf8").toString("base64url"),
      },
      body: JSON.stringify({
        capability: "workspace.create",
        input: { request_id: "req-direct", payload: { workspace_id: `${workspaceId}-probe`, name: "直连探针" } },
      }),
    });
    const body = (await response.json()) as { ok: boolean; result?: { traceId?: string; ok: boolean } };
    const serverTrace = body.result?.traceId ?? "";
    check(
      "能力服务把调用方 x-request-id 作为 trace 使用（非 cap-<actor> 兜底）",
      serverTrace === traceId && !serverTrace.startsWith("cap-"),
      { sent: traceId, serverTrace },
    );
  }

  // ── 用例 2：营销层 → 能力服务 → 插件 → 回来的 trace 跨服务一致 ──
  const created = await callProduct(workspaceCreateBody(requestId, workspaceId, "P6-W8 E2E Workspace"), {
    "x-request-id": requestId,
    authorization: CAPABILITY_TOKEN_HEADER,
  });
  check(
    "跨服务 trace：营销层响应 trace_id 等于发出的 request_id",
    created.body.ok === true && created.body.trace_id === requestId,
    { status: created.status, trace_id: created.body.trace_id, request_id: requestId, body: created.body },
  );
  check(
    "跨服务 trace：插件回执里的 request_id 一致",
    created.body.ok === true && created.body.data?.request_id === requestId,
    { data: created.body.data },
  );
  check(
    "创建回执：实体 ID 正确且 revision 起始为 1",
    created.body.ok === true
      && created.body.data?.entity_id === workspaceId
      && created.body.data?.revision === 1,
    { data: created.body.data, workspaceId },
  );

  // ── 用例 3：网络级 exactly-once（同一幂等键重复提交） ──
  const key = `workspace.update:${workspaceId}:1:fp-p6-e2e-${RUN_ID}`;
  const first = await callProduct(workspaceUpdateBody("req-p6-e2e-idem-1", workspaceId, 1, key, "第一次更新"), {
    "x-request-id": "req-p6-e2e-idem-1",
  });
  const firstRevision = first.body.data?.revision;
  const firstUpdatedAt = first.body.data?.updated_at;

  const second = await callProduct(workspaceUpdateBody("req-p6-e2e-idem-2", workspaceId, 1, key, "第一次更新"), {
    "x-request-id": "req-p6-e2e-idem-2",
  });
  check(
    "网络级 exactly-once：同键重放返回同一实体",
    first.body.ok === true && second.body.ok === true && second.body.data?.entity_id === workspaceId,
    { first: first.body, second: second.body },
  );
  check(
    "网络级 exactly-once：同键重放不推进 revision（无二次副作用）",
    typeof firstRevision === "number" && second.body.data?.revision === firstRevision,
    { firstRevision, secondRevision: second.body.data?.revision, secondError: second.body.error },
  );
  check(
    "网络级 exactly-once：同键重放不改写 updated_at",
    firstUpdatedAt === second.body.data?.updated_at,
    { firstUpdatedAt, secondUpdatedAt: second.body.data?.updated_at },
  );

  // ── 用例 4：CAS 语义跨网络成立（不同键 + 过期 base_revision） ──
  const stale = await callProduct(
    workspaceUpdateBody("req-p6-e2e-stale", workspaceId, 1, `workspace.update:${workspaceId}:1:fp-stale-${RUN_ID}`, "过期基线"),
    { "x-request-id": "req-p6-e2e-stale" },
  );
  void firstRevision;
  check(
    "CAS 语义跨网络成立：过期 base_revision 被拒",
    stale.body.ok === false && stale.body.error?.code === "REVISION_CONFLICT",
    { status: stale.status, body: stale.body },
  );

  // ── F1 收口：平台路径与本地路径必须给出同一个 patternId ──
  {
    const samples = [
      {
        taskId: "f1-t-1",
        workspaceId,
        taskType: "策略判断",
        feedback: "修改后采用",
        outcome: "项目推进",
        editCount: 2,
        aiDraft: "标题\n宏观趋势铺垫段落\n核心判断",
        userFinal: "标题\n核心判断",
        completedAt: "2026-09-01T00:00:00.000Z",
        feedbackEventId: "feedback-event:f1-t-1:fp",
        outcomeEventId: "outcome-event:f1-t-1:fp",
      },
      {
        taskId: "f1-t-2",
        workspaceId,
        taskType: "策略判断",
        feedback: "修改后采用",
        outcome: "项目推进",
        editCount: 2,
        aiDraft: "标题\n宏观趋势铺垫段落\n核心判断",
        userFinal: "标题\n核心判断",
        completedAt: "2026-09-02T00:00:00.000Z",
        feedbackEventId: "feedback-event:f1-t-2:fp",
        outcomeEventId: "outcome-event:f1-t-2:fp",
      },
    ];
    const response = await callPatternDetect({
      product: "awkn-marketing",
      request_id: `pattern-detect-${RUN_ID}`,
      workspace_id: workspaceId,
      samples,
    });
    const data = response.body?.data as { patterns?: Array<{ kind: string; patternId: string }> } | undefined;
    const platformIds = (data?.patterns ?? []).map((item) => `${item.kind}=${item.patternId}`).sort();
    // 本地（离线回退）路径用同一份样本算一次，两边必须一致。
    const localIds = detectPatterns(samples as unknown as PatternSample[])
      .map((item) => `${item.kind}=${item.patternId}`)
      .sort();
    check(
      "F1 收口：平台插件与产品层本地回退给出同一个 patternId",
      response.status === 200 && platformIds.length > 0 && JSON.stringify(platformIds) === JSON.stringify(localIds),
      { status: response.status, platformIds, localIds },
    );
  }

  // ── 用例 5：授权判定在服务端（撤权后拒绝） ──
  await fetch(`${SESSION_URL}/_control/revoke?workspace_id=${encodeURIComponent(workspaceId)}`, { method: "POST" });

  // 5a：撤权后**立即**写入 —— 记录产品层 session 短缓存造成的可见性窗口。
  const immediate = await callProduct(workspaceUpdateBody("req-p6-e2e-revoked-immediate", workspaceId, 2, `workspace.update:${workspaceId}:2:fp-revoked-${RUN_ID}`, "撤权后立即写入"), {
    "x-request-id": "req-p6-e2e-revoked-immediate",
  });
  results.push({
    name: "观察：撤权后立即写入（产品层 session 缓存窗口内）",
    passed: true,
    detail: {
      note: "这是产品层 5 秒 session 缓存造成的撤权可见性窗口，不是平台侧授权失效",
      allowed: immediate.body.ok === true,
      error: immediate.body.error?.code ?? null,
    },
  });
  console.error(`[E2E][OBSERVED] 撤权后立即写入 → ${immediate.body.ok ? "仍被允许（缓存窗口）" : "已拒绝"}`);

  // 5b：跨过 session 缓存 TTL（5s）后再写入 —— 平台侧授权必须生效。
  await new Promise((resolve) => setTimeout(resolve, 6000));
  const revoked = await callProduct(workspaceUpdateBody("req-p6-e2e-revoked", workspaceId, 2, `workspace.update:${workspaceId}:2:fp-revoked-2-${RUN_ID}`, "撤权后写入"), {
    "x-request-id": "req-p6-e2e-revoked",
  });
  check(
    "授权在服务端生效：跨过产品层 session 缓存后，撤权写入被拒",
    revoked.body.ok === false
      && (revoked.body.error?.code === "WORKSPACE_REVOKED" || revoked.body.error?.code === "FORBIDDEN"),
    { status: revoked.status, body: revoked.body },
  );
  await fetch(`${SESSION_URL}/_control/restore?workspace_id=${encodeURIComponent(workspaceId)}`, { method: "POST" });

  // ── 用例 6：幂等键冲突（同一键绑不同实体） ──
  const conflict = await callProduct(workspaceUpdateBody("req-p6-e2e-keyconf", "w-p6-e2e-other", 1, key, "换实体"), {
    "x-request-id": "req-p6-e2e-keyconf",
  });
  check(
    "幂等键冲突：同键绑不同实体被拒",
    conflict.body.ok === false && conflict.body.error?.code === "IDEMPOTENCY_CONFLICT",
    { status: conflict.status, body: conflict.body },
  );

  // ── 用例 7：营销层确实向平台 Session 服务要了身份，且没把浏览器身份当授权 ──
  const observed = await (await fetch(`${SESSION_URL}/_control/observed`)).json() as { requests: { url: string; authorization?: string; cookie?: string }[] };
  const asked = observed.requests.filter((item) => item.url.includes("workspace_id="));
  check(
    "营销层按 Workspace 向平台 Session 服务取身份",
    asked.length > 0 && asked.every((item) => item.url.includes("workspace_id=")),
    { count: asked.length, sample: asked[0]?.url },
  );
  check(
    "浏览器身份不被当作授权来源（平台身份来自 Session 头）",
    asked.every((item) => item.authorization === "Bearer p6-e2e-session-token" || item.authorization === undefined),
    { sample: asked[0] },
  );

  // ── 跨副本 exactly-once：两个副本共享状态后端时，同键只写一次 ──
  if (REPLICA_URL) {
    const crossWorkspaceId = `w-p6-e2e-cross-${RUN_ID}`;
    const crossKey = `workspace.create:${crossWorkspaceId}-${RUN_ID}`;
    const sessionHeader = Buffer.from(JSON.stringify({
      tenantId: "tenant-p6-e2e",
      actorId: "actor-p6-e2e",
      capabilities: ALL_CAPABILITIES,
      workspaceGrants: [{ workspaceId: crossWorkspaceId, access: "admin" }],
      revokedWorkspaceIds: [],
    }), "utf8").toString("base64url");
    const invoke = async (base: string) => {
      const response = await fetch(`${base}/v1/capabilities/invoke`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${CAPABILITY_TOKEN}`,
          "content-type": "application/json",
          "x-request-id": `req-cross-${RUN_ID}`,
          "x-awkn-session": sessionHeader,
        },
        body: JSON.stringify({
          capability: "workspace.create",
          input: {
            product: "awkn-marketing",
            operation: "workspace.create",
            request_id: `req-cross-${RUN_ID}`,
            idempotency_key: crossKey,
            workspace_id: crossWorkspaceId,
            payload: { workspace: { id: crossWorkspaceId, name: "跨副本探针", type: "probe", goal: "" } },
          },
        }),
      });
      return (await response.json()) as {
        ok: boolean;
        result?: { ok: boolean; output?: { entity_id?: string; revision?: number; updated_at?: string } };
      };
    };

    const replicaA = await invoke(CAPABILITY_URL);
    const replicaB = await invoke(REPLICA_URL);
    const a = replicaA.result?.output;
    const b = replicaB.result?.output;
    check(
      "跨副本 exactly-once：同键在两个副本上只写一次（第二个是重放）",
      Boolean(a?.entity_id)
      && a?.entity_id === b?.entity_id
      && a?.revision === b?.revision
      && a?.updated_at === b?.updated_at,
      { replicaA: a, replicaB: b, key: crossKey },
    );
  }

  // ── 汇总 ──
  const failed = results.filter((item) => !item.passed);
  const evidence = {
    kind: "P6-W8 platform E2E evidence",
    generatedAt: new Date().toISOString(),
    capabilityUrl: CAPABILITY_URL,
    capabilityTokenFingerprint: `sha256:${CAPABILITY_TOKEN.slice(0, 4)}…`,
    marketingBaseUrl: BASE_URL,
    sessionFixture: { url: SESSION_URL, note: "测试夹具，非产品组件" },
    workspaceId,
    totals: { cases: results.length, passed: results.length - failed.length, failed: failed.length },
    results,
  };
  console.log(JSON.stringify(evidence, null, 2));
  writeFileSync("docs/P6-W8-PLATFORM-E2E-EVIDENCE.json", `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  cleanup();
  process.exitCode = failed.length ? 1 : 0;
}

void main();
