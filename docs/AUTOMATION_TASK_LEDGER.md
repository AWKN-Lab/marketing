# AWKN Marketing Automation Task Ledger

## PROJECT_STATUS

`IN_PROGRESS`

## Current branch

`feature/p6-real-awkn-integration`

## Current verified baseline

- Latest component baseline: `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md`
- Latest Marketing-A baseline: `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`
- W7P baseline commit: `9800fc0233e25f070fd94b24b3ad9cf03164b299`
- W7O baseline amendment commit: `d7f2caed710312b1899b2e6c982db49abfc72ecc`
- W7O latest implementation hardening: `ff090dbadecc20c9c370e3f13a6a9e42ffabf8ea`
- Historical worker verification head: `077ddeb9ae405f8b9ba55602c94a6a364d5caf41`
- Independent Reviewer added corrective W7-15/W7-16 commits after the component Baselines; fresh runtime verification and Baseline supplementation are required.
- Reviewer runtime status: `RUNTIME_VERIFICATION_PENDING` (CI/CD, GitHub Actions, Runner and deployment are outside Reviewer execution scope).
- P6-W7 status: `VERIFYING`
- P7: `PLANNED`

## Atomic Work Units

| task_id | component | module | priority | status | owner | dependency | blocker | evidence | test_result | commit | updated_at |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P6-W7-09 | malformed JSON | Product Adapter / Contract | P0 | DONE | Marketing-A | W7H | - | `docs/P6-W7I-MALFORMED-JSON-BASELINE.md` | baseline recorded | baseline doc | 2026-09-05T08:34+08:00 |
| P6-W7-10 | malformed success payload | Product Contract / Material | P0 | DONE | Marketing-B | W7-09 | - | `docs/P6-W7J-MALFORMED-SUCCESS-BASELINE.md` | baseline recorded | baseline doc | 2026-09-05T08:38+08:00 |
| P6-W7-11 | missing entity ack | Product Contract | P0 | DONE | Marketing-B | W7-10 | - | `docs/P6-W7K-MISSING-ENTITY-ACK-BASELINE.md` | worker baseline evidence recorded | `73dede8a0b068c16db506adadfe69783c32bc927` | 2026-09-05T09:26+08:00 |
| P6-W7-12 | identity mismatch | Product Contract | P0 | DONE | Marketing-B | W7-11 | - | `docs/P6-W7L-IDENTITY-MISMATCH-BASELINE.md` | worker baseline evidence recorded | `2b43746fc57736108f4869fe108188a10cb88c1e` | 2026-09-05T09:35+08:00 |
| P6-W7-13 | duplicate submit | Idempotency / Product Boundary | P0 | DONE | Marketing-A | W7-12 | - | `docs/P6-W7M-DUPLICATE-SUBMIT-BASELINE.md` | controlled receipt-store evidence | `729b61f08a5f29e165fac866c56b710e748b3063` | 2026-09-05T09:36+08:00 |
| P6-W7-14 | duplicate retry | Idempotency / Retry | P0 | DONE | Marketing-B | W7-13 DONE | - | `docs/P6-W7N-DUPLICATE-RETRY-BASELINE.md` | controlled retry evidence | `0dd2e57d8bc7d068a573e241316d95ba95609ae9` | 2026-09-05T10:05+08:00 |
| P6-W7-15 | permission revoked during active session | Permission / Session | P0 | VERIFYING | Marketing-A | P5 permission baseline | reviewer corrective commits after W7O Baseline; one timing isolation finding remains | `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`; direct Product/Agent/Material denial refresh routing; stale-response ordering guard | RUNTIME_VERIFICATION_PENDING | `1373464af3250b908295a77e875e45bcf8b392c6` | 2026-09-05T10:38+08:00 |
| P6-W7-16 | dependency temporarily unavailable | Adapter / Retry | P1 | VERIFYING | Marketing-B | W7F/G/H adapter semantics | Learning recovery evidence added after W7P Baseline | `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md`; Reviewer Learning retry state-truth test | RUNTIME_VERIFICATION_PENDING | `85f8a0c5f3bfd3e457ed505a2e3123379b78dfbf` | 2026-09-05T10:38+08:00 |
| P6-W8 | real AWKN E2E | Integration | P0 | BLOCKED | UNCLAIMED | W7 VERIFYING | real AWKN endpoints / credentials / authorization / network evidence | authorization, cross-service trace, same-key network exactly-once | BLOCKED_EXTERNAL | - | 2026-09-05T10:38+08:00 |
| P7 | real business acceptance | Eval / Release | P0 | TODO | UNCLAIMED | P6 W8/W9 release gates | P6 not complete | 5 Workspace / 30 Task / Release Review | PENDING | - | 2026-09-05T10:33+08:00 |

## Blocker ledger

| Scope | Status | Error / evidence | Attempts | Suspected root cause | Unblock condition |
|---|---|---|---|---|---|
| Local clone verification | BLOCKED_LOCAL_ONLY | `Could not resolve host: github.com` | 1 clone attempt; no retry loop | execution container DNS/network isolation | container gains GitHub network access or repository is materialized locally with dependencies |
| P6-W8 real upstream | BLOCKED | real AWKN endpoints / credentials / final authorization unavailable in repo workflow | recorded, not retried | external platform dependency | valid endpoints, credentials and authorized environment supplied |
| PR integration | BLOCKED_FOR_MERGE | PR #2 stacked on docs PR #1 / old `main` baseline | recorded | branch ancestry dependency | merge #1, then retarget/rebase #2 |
| Reviewer runtime verification | RUNTIME_VERIFICATION_PENDING | W7-15/W7-16 received corrective commits after their recorded Baselines | 0 CI/CD attempts by Reviewer | Reviewer execution policy excludes CI/CD, Actions, Runner and deployment | authorized runtime owner executes verification and updates W7O/W7P evidence |

## Independent Reviewer Findings — 2026-09-05

| finding_id | severity | task_id | file/location | problem | evidence | impact | acceptance_criteria | status |
|---|---|---|---|---|---|---|---|---|
| REV-20260905-01 | P1 | P6-W7-15 | `lib/material-upload-client.ts`; `components/assistant-ui/marketing-runtime-provider.tsx`; `lib/product-session.ts` | Direct Material Upload and Agent clients did not signal Session revalidation for `AUTH_REQUIRED` / `FORBIDDEN` / `WORKSPACE_REVOKED`; the generic Product client had the refresh path. | Pre-review direct clients returned/yielded authorization failures without the Session refresh signal. W7O documented Product denial refresh and left direct client routing outside its evidence. | A revoked Workspace could remain represented by a stale browser Session after Agent or binary Material denial until a later refresh. Server denial protects side effects; browser permission state could lag. | All client paths receiving authorization-class failures call one shared refresh-routing contract. `RATE_LIMITED` and other non-authorization failures do not refresh. Shared routing is covered by the W7-15 test gate. | FIXED_PENDING_VERIFICATION (`de47dfa2`, `fb7d9dbd`, `077ddeb9`, `1373464a`) |
| REV-20260905-02 | P1 | P6-W7-15 | `components/product-session-provider.tsx` authorization-triggered refresh handler | Authorization-triggered revalidation retains the previous Session while `/api/session` is in flight. The newer `refreshVersion` guard prevents out-of-order responses from restoring older Grants but does not suspend the currently mounted stale projection at refresh start. | Current refresh handler starts `load()` without clearing the current Session. `ff090db...` adds response-order protection only. W7O acknowledges a stale interval and requires revoked projection isolation after revalidation. | Revoked Workspace data can remain visible between the authorization denial and the fresh Session response. | On the authorization-denial refresh event, immediately suspend the current Session/protected projection before network revalidation; restore only the newly authorized Session. Add a targeted test proving revoked projection is unavailable during the in-flight authorization refresh. | REPAIR_QUEUE |
| REV-20260905-03 | P1 | P6-W7-16 | `scripts/p6-dependency-unavailable.ts`; `lib/learning-run-store.ts`; `scripts/p6-dependency-unavailable-learning.ts` | W7P covered Product, Agent and Material recovery but omitted Learning retry outage/state truth. | W7P closed scope lists Product / Agent / Material Upload only. Learning contracts separately require stable `run_id`, attempt-specific idempotency and monotonic status merge. | Learning attempt/status regression during a temporary dependency outage could pass W7P unnoticed. | A controlled `learning.run.retry` outage returns retryable failure with no success data and no local state mutation; recovery reuses the same `run_id + attempt` key and preserves attempt/status/trace through monotonic merge. | FIXED_PENDING_VERIFICATION (`9594db0c`, `85f8a0c5`) |

## Reviewer findings carried forward

- Real AWKN server-side exactly-once evidence remains for P6-W8; controlled W7 retries prove product semantics but cannot replace real network evidence.
- Real Session / Product / Material credentials and final authorization remain for P6-W8.
- Cross-service trace evidence remains for P6-W8.
- Agent logical action context-version risk remains a release-review concern unless a later corrective baseline closes it.
- Material lower-revision projection guard and `PLATFORM_NOT_CONFIGURED` taxonomy consistency remain release-review concerns unless later baselines close them.
- PR #2 remains stacked on docs PR #1 / old main baseline and must be retargeted or rebased before formal merge.

## Coordination rules

- Workers claim exactly one Atomic Work Unit before edits.
- A worker must abandon a claim if another worker has already advanced the same unit or core file set.
- `DONE` requires implementation, verification evidence, Baseline/ledger update and commit closure.
- Reviewer findings with post-Baseline corrective commits force the affected unit back to `VERIFYING` until fresh evidence is recorded.
- Hard external blockers are recorded and skipped; they do not justify weakening Hard Gates.
- CI/CD, GitHub Actions, Runner and deployment are outside Independent Reviewer execution scope.
- Never edit `main` directly.
