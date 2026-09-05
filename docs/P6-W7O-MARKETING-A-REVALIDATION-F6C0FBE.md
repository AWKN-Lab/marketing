# P6-W7O Marketing-A Current-Head Revalidation

## Status

`VERIFYING`

- Work unit: `P6-W7-15 permission revoked during active session`
- Owner: `Marketing-A`
- Branch: `feature/p6-real-awkn-integration`
- REHYDRATE head: `f6c0fbe87b75567103dd516300fdc274959ad8c3`
- Baseline: `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`
- Reviewer supplement: `docs/P6-W7O-REVIEWER-SUPPLEMENT.md`

## Rehydrate result

`PROJECT_STATUS = IN_PROGRESS` and `P6-W7-15 = VERIFYING` in the shared Ledger. `P6-W8` remains externally blocked and `P7` still depends on P6 W8/W9, so no new READY/TODO work unit is claimable by Marketing-A. This run therefore continues the already-owned W7-15 verification unit and does not claim a second unit.

Current container has no materialized repository checkout, so `git status` and repository-level npm commands cannot run locally. The previously recorded DNS/materialization blocker remains active; this run did not repeat the failed clone attempt.

## No-drift comparison

Compared prior Marketing-A focused evidence head:

```text
base = f099e6d5018f474f94b460b6c7b62efdba5b3245
head = f6c0fbe87b75567103dd516300fdc274959ad8c3
ahead = 9 commits
```

Files changed in that range:

```text
docs/AUTOMATION_TASK_LEDGER.md
docs/P6-W7P-WORKER-B-SUPPLEMENT.md
lib/learning-run-store.ts
scripts/p6-dependency-unavailable-learning.ts
```

No W7O Permission / Session implementation or W7O fault-gate file changed.

Current source identities remain:

```text
lib/product-session.ts                  blob 345e858efe475275bba185ba22b01647be643d1d
components/product-session-provider.tsx blob 78662df51ef186757bc0a410fa624b9a4d80c26b
scripts/p6-active-session-revoke.ts     blob ad43e8c778a92f6126d6897885333a4099fd4615
```

## Current-environment focused verification

Environment:

```text
Node       v22.16.0
TypeScript 5.8.3
```

Marketing-A reconstructed the current `lib/product-session.ts` contract in an isolated harness, compiled it with strict TypeScript using ES2022 + DOM libraries, then executed the emitted JavaScript.

The first harness assertion form triggered a TypeScript control-flow narrowing diagnostic inside the temporary harness only. The assertion was rewritten without changing the tested production contract, then compilation and execution passed.

Result:

```text
FOCUSED_W7O_TYPESCRIPT_PASS_HEAD_f6c0fbe
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
authorization invalidation suspends the protected projection immediately
refreshed Session filters the revoked Workspace projection
```

Static reinspection also confirms `ProductSessionProvider` still clears Session immediately on `MARKETING_SESSION_INVALIDATE_EVENT` and keeps the monotonic `refreshVersion` guard against late stale responses. The registered P6 suite still includes `test:p6:active-session-revoke`.

## Verification status

```text
W7O code drift since prior focused evidence = 0
focused TypeScript behavior gate           = PASS
repository typecheck                        = RUNTIME_VERIFICATION_PENDING
P0 regression                              = RUNTIME_VERIFICATION_PENDING
full P6 test suite                          = RUNTIME_VERIFICATION_PENDING
build                                       = RUNTIME_VERIFICATION_PENDING
```

CI/CD, GitHub Actions, Runner and deployment paths were not read, triggered, waited on or repaired.

## Blockers

### Repository runtime

Error/evidence: current container has no materialized `AWKN-Lab/marketing` checkout or dependency tree; the existing Ledger records the single DNS-failed clone attempt.

Unblock condition: a complete local worktree with dependencies becomes available to this execution environment or another authorized local runtime owner executes the repository gates against the current corrective head and records evidence.

### Real AWKN

P6-W8 still requires valid endpoints, credentials, final authorization, cross-service trace and real network same-key exactly-once evidence.

## Result

`P6-W7-15` remains `VERIFYING`. No production change is justified by the current no-drift evidence. Full repository runtime verification remains the only non-external closure gate for the Reviewer corrections.