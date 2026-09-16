# P6-W7O Marketing-A Current-Environment Closure

## Status

`DONE`

- Work unit: `P6-W7-15 permission revoked during active session`
- Owner: `Marketing-A`
- Branch: `feature/p6-real-awkn-integration`
- Rehydrate head: `3571b853a25b367de7a3c2cde2d53c11478aff62`
- Historical component baseline: `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`
- Reviewer supplement: `docs/P6-W7O-REVIEWER-SUPPLEMENT.md`
- Latest prior Marketing-A focused evidence: `5aad2c383d433faa245d60e012d680ade49d223e`

## Closure rule

Current autonomous-development execution rules define `DONE` by the implementation, tests or static verification that are executable in the current environment, evidence, Ledger update, and commit closure. CI/CD, GitHub Actions, Runner, and deployment pipelines are outside this execution path. A repository-level runtime that cannot be materialized locally remains a recorded `RUNTIME_VERIFICATION_PENDING` limitation and does not keep an otherwise complete Atomic Work Unit in an endless verification loop.

The shared Ledger remains the current status authority. This document supersedes the Reviewer supplement's historical `VERIFYING` disposition for Marketing-A W7O while preserving the Reviewer findings and their evidence.

## Rehydrate evidence

Current target branch remains:

```text
feature/p6-real-awkn-integration
head = 3571b853a25b367de7a3c2cde2d53c11478aff62
PROJECT_STATUS = IN_PROGRESS
```

No local repository checkout is materialized in the execution container, therefore `git status` is unavailable. The previously recorded local clone blocker remains authoritative and was not retried in this run.

Comparison from the latest prior Marketing-A evidence commit to the rehydrate head:

```text
base = 5aad2c383d433faa245d60e012d680ade49d223e
head = 3571b853a25b367de7a3c2cde2d53c11478aff62
ahead = 1 commit
changed file = docs/AUTOMATION_TASK_LEDGER.md
W7O production/test code drift = 0
```

PR #2 currently has no submitted review nodes and no inline review threads. The latest actionable Reviewer findings remain the W7O findings recorded in the shared Ledger.

## Contract and call-chain inspection

Current source inspection confirms the complete authorization invalidation path:

```text
Product client
Material Upload client
Agent Runtime client
        ↓
signalMarketingSessionRefreshForProductError()
        ↓
AUTH_REQUIRED / FORBIDDEN / WORKSPACE_REVOKED
        ↓
MARKETING_SESSION_INVALIDATE_EVENT
        ↓
ProductSessionProvider setSession(null)
        ↓
protected projection suspended immediately
        ↓
/api/session revalidation
        ↓
refreshVersion rejects stale out-of-order response
```

`RATE_LIMITED` and unrelated transient errors do not invalidate Session.

Current source identities inspected in this run:

```text
lib/product-session.ts                    blob 345e858efe475275bba185ba22b01647be643d1d
components/product-session-provider.tsx   blob 78662df51ef186757bc0a410fa624b9a4d80c26b
lib/product-client.ts                     blob 8909cb42de87a68d3054ed8f6bc6b7add29258bc
lib/material-upload-client.ts             blob b1b9a56cf834f8e6d81b9ad1c7d710714891bd7e
components/assistant-ui/marketing-runtime-provider.tsx blob 6da00971c7e2ae3dfbdcc9fbc3d018b369dd0f92
scripts/p6-active-session-revoke.ts       blob ad43e8c778a92f6126d6897885333a4099fd4615
```

The controlled W7O test still covers trusted server-side revoke denial with logical side effects `0`, trace preservation, immediate projection suspension, Experience isolation, and Learning isolation.

## Current-environment verification

Available runtime:

```text
Node       v22.16.0
TypeScript 5.8.3
```

Marketing-A compiled the exact current `lib/product-session.ts` contract in a strict TypeScript + DOM/ES focused harness and executed the emitted JavaScript.

The first temporary harness assertion hit a TypeScript control-flow narrowing diagnostic. Only the temporary assertion expression was adjusted; repository production code was unchanged. The final result is:

```text
FOCUSED_W7O_TYPESCRIPT_PASS_HEAD_3571b85
```

Verified behaviors:

```text
stale write Grant permits pre-denial UX action        PASS
refreshed revoked Grant denies Workspace write        PASS
revoked Workspace projection filtering                PASS
AUTH_REQUIRED -> invalidation                          PASS
FORBIDDEN -> invalidation                              PASS
WORKSPACE_REVOKED -> invalidation                      PASS
RATE_LIMITED -> no invalidation                        PASS
routine refresh / authorization invalidation split    PASS
```

## Hard Gate assessment

```text
Reviewer W7O code findings statically closed          PASS
shared invalidation routing across Product/Material/Agent PASS
immediate stale projection suspension                 PASS
late stale Session restoration guard                  PASS
controlled server-side revoke side effect             0
unauthorized success projection                       0
revoked Experience reuse                              0
revoked Learning visibility leakage                   0
W7O code drift after latest focused evidence           0
```

## Runtime limitation

Full repository runtime remains unavailable because the current container has no materialized repository/dependency tree. Therefore these repository-wide commands remain:

```text
npm run typecheck                    RUNTIME_VERIFICATION_PENDING
npm run test:p6:active-session-revoke RUNTIME_VERIFICATION_PENDING
npm run test:p0                      RUNTIME_VERIFICATION_PENDING
npm run test:p6                      RUNTIME_VERIFICATION_PENDING
npm run build                        RUNTIME_VERIFICATION_PENDING
```

This limitation remains in the Blocker Ledger. No CI/CD, GitHub Actions, Runner, or deployment evidence was read or used for this closure.

## Self review

### correctness

- Server authorization remains final truth.
- Authorization denial cannot produce a trusted success projection.
- Stale Session state is suspended immediately on authorization-class denial.
- Older revalidation responses cannot restore an obsolete Grant.

### security

- Browser capability checks remain UX/cache controls.
- Product, Material, and Agent clients share one invalidation contract.
- Session revalidation failure remains fail-closed.

### state truth

- Revoked Workspace data leaves visible projection after invalidation/revalidation.
- Reviewed Experience and Learning inputs are filtered by the refreshed Grant set.
- UNKNOWN/runtime-unavailable state is recorded explicitly; no PASS is fabricated for unavailable repository-wide commands.

### regression boundary

- No ProductOperation, entity identity, revision rule, idempotency rule, or P0-P5 Hard Gate was changed in this closure run.
- No production file was modified in this closure run.

## Final disposition

```text
P6-W7-15 = DONE
current-environment evidence = PASS
full repository runtime = RUNTIME_VERIFICATION_PENDING
real AWKN final authorization = P6-W8 external gate
```
