# P6-W7O Marketing-A Current-Head Revalidation — 5ee7db3

## Status

`VERIFYING`

- Work unit: `P6-W7-15 permission revoked during active session`
- Owner: `Marketing-A`
- Branch: `feature/p6-real-awkn-integration`
- REHYDRATE head: `5ee7db3931969a20c54295307cb4b10236bd1606`
- Previous Marketing-A evidence head: `d88af9ace5a47d181e20549f36a74d2f9a6eca78`
- Full repository runtime: `RUNTIME_VERIFICATION_PENDING`

## Rehydrate result

Current shared Ledger keeps `PROJECT_STATUS=IN_PROGRESS`, `P6-W7-15=VERIFYING`, `P6-W7-16=VERIFYING`, and `P6-W8=BLOCKED_EXTERNAL`.

The current execution container has Git installed but no materialized `AWKN-Lab/marketing` worktree under the available runtime paths, so repository `git status`, package-level typecheck, P0/P6 regression and build cannot run locally in this turn.

Per execution rules, no CI/CD, GitHub Actions, Runner or deployment path was read, triggered, waited on or repaired.

## No-drift comparison

Comparison:

```text
base = d88af9ace5a47d181e20549f36a74d2f9a6eca78
head = 5ee7db3931969a20c54295307cb4b10236bd1606
ahead = 3 commits
```

Files changed after the previous Marketing-A evidence:

```text
docs/AUTOMATION_TASK_LEDGER.md
docs/P6-W7P-WORKER-B-REVALIDATION-REV06.md
```

No W7O Permission / Session production or test file changed.

Current W7O source identities remain:

```text
lib/product-session.ts                    blob 345e858efe475275bba185ba22b01647be643d1d
components/product-session-provider.tsx   blob 78662df51ef186757bc0a410fa624b9a4d80c26b
scripts/p6-active-session-revoke.ts       blob ad43e8c778a92f6126d6897885333a4099fd4615
```

Therefore the existing W7O Reviewer corrective contract remains the current production contract.

## Current-environment focused verification

The current `lib/product-session.ts` source was reproduced exactly from the target branch and compiled directly in the execution container.

Environment:

```text
Node       v22.16.0
TypeScript 5.8.3
compiler   --strict --target ES2022 --module commonjs --lib ES2022,DOM --skipLibCheck
```

The first focused harness compile hit a TypeScript control-flow narrowing diagnostic in the temporary assertion code. The harness assertion was rewritten without changing the reproduced production source. The second strict compile and emitted JavaScript run passed.

Result:

```text
FOCUSED_W7O_TYPESCRIPT_PASS_HEAD_5ee7db3
```

Verified behaviors:

```text
stale write Grant permits the pre-denial model action
refreshed Session without the Grant denies the revoked Workspace action
AUTH_REQUIRED invalidates Session
FORBIDDEN invalidates Session
WORKSPACE_REVOKED invalidates Session
RATE_LIMITED does not invalidate Session
routine refresh emits refresh only
authorization denial emits invalidation only
refreshed readable projection excludes the revoked Workspace
```

## Static contract recheck

Current `ProductSessionProvider` still preserves:

```text
authorization invalidation
→ session = null immediately
→ protected projection suspended
→ /api/session revalidation
→ refreshVersion rejects late stale responses
→ only current authorized Session remounts projection
```

Current W7-15 controlled test still covers server-side revoke denial with zero logical side effect, trace preservation, Experience isolation and Learning isolation.

## Verification disposition

```text
W7O production/test code drift      = 0
focused strict TypeScript behavior  = PASS
full repository typecheck           = RUNTIME_VERIFICATION_PENDING
P0 regression                       = RUNTIME_VERIFICATION_PENDING
full P6 regression                  = RUNTIME_VERIFICATION_PENDING
build                               = RUNTIME_VERIFICATION_PENDING
P6-W7-15                            = VERIFYING
```

No additional production modification is justified by the current evidence. The remaining gate requires a materialized repository plus dependencies in an authorized local runtime.

## Blocker / unblock condition

```text
blocker:
current execution container has no materialized repository/dependency tree

unblock condition:
authorized local runtime provides the current target-branch worktree and dependencies
→ run typecheck
→ run W7-15 focused repository test
→ run P0 regression
→ run full P6 regression
→ run build
→ record evidence
```

Real AWKN final authorization, cross-service trace and real network exactly-once evidence remain P6-W8 external requirements.
