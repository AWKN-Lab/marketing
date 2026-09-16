# P6-W7O Independent Reviewer Supplement

## Status

`VERIFYING`

本文件补充 `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md` 在独立 Reviewer 审查后新增的安全修复。原 Baseline 继续作为当时工作包事实记录；Reviewer 修复尚缺授权运行环境的独立运行时验证，因此 `P6-W7-15` 暂不升级回 `DONE`。

## Reviewed delta

Reviewer 复核了 W7O Baseline 之后的授权刷新改动，包括：

```text
1373464af3250b908295a77e875e45bcf8b392c6  cross-client authorization refresh tests
ff090dbadecc20c9c370e3f13a6a9e42ffabf8ea  stale refresh response ordering guard
```

发现剩余时间窗：授权拒绝触发 `/api/session` 重校验后，旧 Session 仍会保持挂载，直到新响应返回。服务端已经拒绝副作用，但撤权 Workspace 的旧浏览器投影可在请求飞行期间继续可见。

## Reviewer corrective commits

```text
7e82d5ee9d44891e75a4a04e29b8e2467f530c3b  separate authorization invalidation from routine refresh
d9639ed60a0de7e7912e0e00d5bee4c19fe85672  route Product authorization failure through shared invalidation
3f6425aea2f19b3539d4a948182b021bf7874a02  suspend stale Session before authorization revalidation
515f3faa4c87a652c2e3445c90a9375c1262c2d9  cover invalidation routing and type-safe in-flight projection suspension
```

## Corrected contract

Routine revalidation remains non-destructive:

```text
focus / visibility / periodic / explicit refresh
→ MARKETING_SESSION_REFRESH_EVENT
→ retain current Session while revalidating
→ refreshVersion rejects stale out-of-order response
```

Authorization-class denial is fail-closed immediately:

```text
AUTH_REQUIRED / FORBIDDEN / WORKSPACE_REVOKED
→ MARKETING_SESSION_INVALIDATE_EVENT
→ current Session = null immediately
→ protected Product / Agent / Material / Experience / Learning projection unmounted
→ /api/session revalidation starts
→ only newly authorized Session may remount projection
```

`RATE_LIMITED` and non-authorization transient errors do not invalidate Session.

## Hard Gate assessment

Static contract now satisfies:

```text
authorization denial retains stale mounted Session = 0
late stale refresh restores revoked Grant          = 0
Product refresh-routing divergence                 = 0
Material refresh-routing divergence                = 0
Agent refresh-routing divergence                   = 0
platform local-owner fallback                      = 0
```

## Marketing-A current-environment verification — 2026-09-05

REHYDRATE observed branch head:

```text
700accd00e752e9503b00c41b909ebdf20e8c4bc
```

A single local materialization attempt failed:

```text
git clone --depth 1 --branch feature/p6-real-awkn-integration https://github.com/AWKN-Lab/marketing.git
fatal: unable to access 'https://github.com/AWKN-Lab/marketing.git/': Could not resolve host: github.com
```

No retry loop was performed.

Current environment still provides Node `v22.16.0` and global TypeScript `5.8.3`. Marketing-A extracted the current `lib/product-session.ts` contract (`blob 345e858efe475275bba185ba22b01647be643d1d`) into an isolated focused harness, compiled it with strict TypeScript + DOM libs, and executed the emitted JavaScript.

Focused result:

```text
FOCUSED_W7O_TYPESCRIPT_PASS
```

Focused checks covered:

```text
AUTH_REQUIRED        -> invalidation
FORBIDDEN            -> invalidation
WORKSPACE_REVOKED    -> invalidation
RATE_LIMITED         -> no invalidation
routine refresh      -> refresh event only
authorization denial -> invalidation event only
stale write Grant    -> locally permits pre-denial action
refreshed no-Grant   -> blocks revoked Workspace action
```

Static source inspection on the same branch also confirms:

- `components/product-session-provider.tsx` clears `session` immediately on `MARKETING_SESSION_INVALIDATE_EVENT` and starts revalidation.
- `refreshVersion` rejects late responses from older refresh requests.
- `lib/product-client.ts`, `lib/material-upload-client.ts`, and `components/assistant-ui/marketing-runtime-provider.tsx` all route authorization-class failures through `signalMarketingSessionRefreshForProductError()`.
- `scripts/p6-active-session-revoke.ts` covers server-side zero side effect, invalidation routing, projection suspension, Experience isolation, and Learning isolation.

Full repository `typecheck`, `test:p0`, `test:p6`, and `build` remain `RUNTIME_VERIFICATION_PENDING` because the repository and dependency tree cannot be materialized in the current container. CI/CD, GitHub Actions, Runner, and deployment paths were not read, triggered, waited on, or repaired during this verification.

`P6-W7-15` therefore remains `VERIFYING`.

## Marketing-A no-drift revalidation — 2026-09-05

Latest REHYDRATE observed:

```text
branch head = c26e2fc6a07a36b85771556989d0e136a80627db
local worktree = unavailable in current container
git status = unavailable because no repository checkout is materialized
```

The existing local-clone DNS blocker is already recorded in the shared Ledger, so this run did not repeat the failed clone attempt.

Repository comparison:

```text
base = b26326dfbca0b2f14d5946f0a0c1fbc8e8275892
head = c26e2fc6a07a36b85771556989d0e136a80627db
ahead = 5 commits
```

Files changed after Marketing-A's focused W7O evidence:

```text
components/learning-watch.tsx
docs/AUTOMATION_TASK_LEDGER.md
docs/P6-W7P-WORKER-B-SUPPLEMENT.md
scripts/p6-dependency-unavailable-learning.ts
```

No W7O permission/session implementation or test file changed. Current W7O source identities remain:

```text
lib/product-session.ts                    blob 345e858efe475275bba185ba22b01647be643d1d
components/product-session-provider.tsx   blob 78662df51ef186757bc0a410fa624b9a4d80c26b
scripts/p6-active-session-revoke.ts       blob ad43e8c778a92f6126d6897885333a4099fd4615
```

Static reinspection confirms the active contract still preserves immediate invalidation, stale-response rejection, server-side authorization truth, revoked projection isolation, and the existing W7-15 controlled fault gate. Since no W7O code drift occurred, no additional production modification is justified in this work unit.

Current result remains:

```text
W7O code drift since focused evidence = 0
focused contract evidence             = still applicable
full repository runtime               = RUNTIME_VERIFICATION_PENDING
P6-W7-15                               = VERIFYING
```

## Marketing-A focused current-head rerun — 2026-09-05

The current container provides Node `v22.16.0` and TypeScript `5.8.3`. Marketing-A rebuilt the focused W7O contract harness from the current `lib/product-session.ts` blob and executed strict TypeScript compilation plus emitted JavaScript behavior checks.

The first harness compile referenced `@types/node`, which is unavailable in the container. That failure was isolated to the test harness dependency and did not involve repository production code. The harness was reduced to DOM/ES TypeScript plus an internal assertion helper, then compiled and executed successfully without fetching packages.

Result:

```text
FOCUSED_W7O_TYPESCRIPT_PASS_CURRENT_HEAD
```

Verified behaviors:

```text
stale write Grant permits action before trusted denial
refreshed no-Grant Session blocks the revoked Workspace action
AUTH_REQUIRED invalidates Session
FORBIDDEN invalidates Session
WORKSPACE_REVOKED invalidates Session
RATE_LIMITED does not invalidate Session
routine refresh emits refresh only
authorization failure emits invalidation only
```

This focused run strengthens current-environment evidence but does not replace the repository-level gates. `typecheck`, `test:p0`, full `test:p6`, and `build` remain `RUNTIME_VERIFICATION_PENDING` until a complete worktree and dependency tree are available locally.

## External evidence still required

- Real AWKN final authorization remains P6-W8.
- Real revoked-Grant response timing and cross-service trace remain P6-W8.
- A runtime owner with a materialized repository must execute the existing repository verification suite against the corrective head and record evidence before W7-15 can return to `DONE`.
