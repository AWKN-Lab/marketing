# AWKN Marketing Automation Task Ledger

## PROJECT_STATUS

`IN_PROGRESS`

## Current branch

`feature/p6-real-awkn-integration`

## Current verified baseline

- Latest component baseline: `docs/P6-W7K-MISSING-ENTITY-ACK-BASELINE.md`
- Baseline commit: `9d1ec1b3cf656f678161440ecc38925fca6451c8`
- Verified implementation commit: `73dede8a0b068c16db506adadfe69783c32bc927`
- Verification run: GitHub Actions `33935147667` = PASS (`typecheck`, `test:p0`, `test:p6`, `build`)
- P6-W7 status: `IN_PROGRESS`
- P7: `PLANNED`

## Worker coordination

| Work Unit | Status | Owner | Claim / evidence | Notes |
|---|---|---|---|---|
| P6-W7-09 malformed JSON | DONE | Marketing-A | `docs/P6-W7I-MALFORMED-JSON-BASELINE.md` | Baseline recorded |
| P6-W7-10 malformed success payload | DONE | Marketing-B | `docs/P6-W7J-MALFORMED-SUCCESS-BASELINE.md` | Baseline recorded |
| P6-W7-11 missing entity ack | DONE | Marketing-B | `docs/P6-W7K-MISSING-ENTITY-ACK-BASELINE.md` | CI `33935147667` green; W7-12 excluded |
| P6-W7-12 identity mismatch | CLAIMED | Marketing-B | claimed `2026-09-05T09:31+08:00` | Identity consistency only; keep W7-13+ untouched |
| P6-W7-13 duplicate submit | READY | UNCLAIMED | - | Depends on prior failure hardening semantics |
| P6-W7-14 duplicate retry | READY | UNCLAIMED | - | Keep logical action / idempotency stable |
| P6-W7-15 permission revoked during active session | READY | UNCLAIMED | - | Permission Hard Gate |
| P6-W7-16 dependency temporarily unavailable | READY | UNCLAIMED | - | Stable retry/error path |
| P6-W8 real AWKN E2E | BLOCKED | UNCLAIMED | - | Requires real AWKN endpoints / credentials / authorization / network evidence |
| P7 real business acceptance | TODO | UNCLAIMED | - | Starts after P6 Release/Integration gates |

## Blocker ledger

| Scope | Status | Error / evidence | Attempts | Suspected root cause | Unblock condition |
|---|---|---|---|---|---|
| Local clone verification | BLOCKED_LOCAL_ONLY | `Could not resolve host: github.com` | 1 clone attempt; no retry loop | execution container DNS/network isolation | container gains GitHub network access; CI already supplies authoritative repo verification |
| P6-W8 real upstream | BLOCKED | real AWKN endpoints / credentials / final authorization unavailable in repo workflow | recorded, not retried | external platform dependency | valid endpoints, credentials and authorized environment supplied |
| PR integration | BLOCKED_FOR_MERGE | PR #2 stacked on docs PR #1 / old `main` baseline | recorded | branch ancestry dependency | merge #1, then retarget/rebase #2 |

## Reviewer findings carried forward

- Real AWKN server-side exactly-once evidence remains for P6-W8.
- Real Session / Product / Material credentials and final authorization remain for P6-W8.
- Cross-service trace evidence remains for P6-W8.
- Agent logical action context-version risk and UI retry same-action semantics remain reviewer concerns; W7-11 did not touch Agent core files.
- PR #2 remains stacked on docs PR #1 / old main baseline and must be retargeted or rebased before formal merge.

## Coordination rules

- Workers claim exactly one Atomic Work Unit before edits.
- A worker must abandon a claim if another worker has already advanced the same unit or core file set.
- `DONE` requires implementation, verification evidence, Baseline/ledger update and commit closure.
- Hard external blockers are recorded and skipped; they do not justify weakening Hard Gates.
- Never edit `main` directly.
