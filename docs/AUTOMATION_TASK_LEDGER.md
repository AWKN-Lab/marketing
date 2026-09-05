# AWKN Marketing Automation Task Ledger

## PROJECT_STATUS

`IN_PROGRESS`

## Current branch

`feature/p6-real-awkn-integration`

## Current verified baseline

- Latest component baseline: `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md`
- Latest Marketing-A baseline: `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`
- W7P baseline commit: `581eb31e7c01ae0d8094aaba504af5411af3982c`
- W7O baseline commit: `bea2af03a96589fd2b0ae66b0cb620fe56ac4879`
- Verified combined head: `c7f69adddbcef9d6878403a779831b0f7d276ec0`
- Verification run: GitHub Actions `33939335113` = PASS (`typecheck`, `test:p0`, `test:p6`, `build`)
- P6-W7 status: `COMPLETE`
- P7: `PLANNED`

## Atomic Work Units

| task_id | component | module | priority | status | owner | dependency | blocker | evidence | test_result | commit | updated_at |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P6-W7-09 | malformed JSON | Product Adapter / Contract | P0 | DONE | Marketing-A | W7H | - | `docs/P6-W7I-MALFORMED-JSON-BASELINE.md` | baseline recorded | baseline doc | 2026-09-05T08:34+08:00 |
| P6-W7-10 | malformed success payload | Product Contract / Material | P0 | DONE | Marketing-B | W7-09 | - | `docs/P6-W7J-MALFORMED-SUCCESS-BASELINE.md` | baseline recorded | baseline doc | 2026-09-05T08:38+08:00 |
| P6-W7-11 | missing entity ack | Product Contract | P0 | DONE | Marketing-B | W7-10 | - | `docs/P6-W7K-MISSING-ENTITY-ACK-BASELINE.md` | CI `33935147667` PASS | `73dede8a0b068c16db506adadfe69783c32bc927` | 2026-09-05T09:26+08:00 |
| P6-W7-12 | identity mismatch | Product Contract | P0 | DONE | Marketing-B | W7-11 | - | `docs/P6-W7L-IDENTITY-MISMATCH-BASELINE.md` | CI `33936523667` PASS | `2b43746fc57736108f4869fe108188a10cb88c1e` | 2026-09-05T09:35+08:00 |
| P6-W7-13 | duplicate submit | Idempotency / Product Boundary | P0 | DONE | Marketing-A | W7-12 | - | `docs/P6-W7M-DUPLICATE-SUBMIT-BASELINE.md` | CI `33936601312` PASS | `729b61f08a5f29e165fac866c56b710e748b3063` | 2026-09-05T09:36+08:00 |
| P6-W7-14 | duplicate retry | Idempotency / Retry | P0 | DONE | Marketing-B | W7-13 DONE | - | `docs/P6-W7N-DUPLICATE-RETRY-BASELINE.md` | CI `33937970221` PASS | `0dd2e57d8bc7d068a573e241316d95ba95609ae9` | 2026-09-05T10:05+08:00 |
| P6-W7-15 | permission revoked during active session | Permission / Session | P0 | DONE | Marketing-A | P5 permission baseline | - | `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md` | CI `33939335113` PASS | `006c2ea5a69d9852732456f46739c01468218d6e` | 2026-09-05T10:34+08:00 |
| P6-W7-16 | dependency temporarily unavailable | Adapter / Retry | P1 | DONE | Marketing-B | W7F/G/H adapter semantics | - | `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md` | CI `33939335113` PASS | `c7f69adddbcef9d6878403a779831b0f7d276ec0` | 2026-09-05T10:33+08:00 |
| P6-W8 | real AWKN E2E | Integration | P0 | BLOCKED | UNCLAIMED | W7 COMPLETE | real AWKN endpoints / credentials / authorization / network evidence | Reviewer requires authorization, cross-service trace, same-key network exactly-once | BLOCKED_EXTERNAL | - | 2026-09-05T10:34+08:00 |
| P7 | real business acceptance | Eval / Release | P0 | TODO | UNCLAIMED | P6 W8/W9 release gates | P6 not complete | 5 Workspace / 30 Task / Release Review | PENDING | - | 2026-09-05T10:33+08:00 |

## Blocker ledger

| Scope | Status | Error / evidence | Attempts | Suspected root cause | Unblock condition |
|---|---|---|---|---|---|
| Local clone verification | BLOCKED_LOCAL_ONLY | `Could not resolve host: github.com` | 1 clone attempt; no retry loop | execution container DNS/network isolation | container gains GitHub network access; CI already supplies authoritative repo verification |
| P6-W8 real upstream | BLOCKED | real AWKN endpoints / credentials / final authorization unavailable in repo workflow | recorded, not retried | external platform dependency | valid endpoints, credentials and authorized environment supplied |
| PR integration | BLOCKED_FOR_MERGE | PR #2 stacked on docs PR #1 / old `main` baseline | recorded | branch ancestry dependency | merge #1, then retarget/rebase #2 |

## Reviewer findings carried forward

- Real AWKN server-side exactly-once evidence remains for P6-W8; controlled W7 retries prove product semantics but cannot replace real network evidence.
- Real Session / Product / Material credentials and final authorization remain for P6-W8.
- Cross-service trace evidence remains for P6-W8.
- Agent logical action context-version risk remains a release-review concern unless a later corrective baseline closes it.
- Material lower-revision projection guard and `PLATFORM_NOT_CONFIGURED` taxonomy consistency remain release-review concerns unless later baselines close them.
- W7-15 active-session revoke is closed by `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`; real upstream authorization proof remains P6-W8.
- PR #2 remains stacked on docs PR #1 / old main baseline and must be retargeted or rebased before formal merge.

## Coordination rules

- Workers claim exactly one Atomic Work Unit before edits.
- A worker must abandon a claim if another worker has already advanced the same unit or core file set.
- `DONE` requires implementation, verification evidence, Baseline/ledger update and commit closure.
- Hard external blockers are recorded and skipped; they do not justify weakening Hard Gates.
- Never edit `main` directly.
