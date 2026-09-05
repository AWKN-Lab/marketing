# AWKN Marketing Automation Task Ledger

## PROJECT_STATUS

`IN_PROGRESS`

## Current branch

`feature/p6-real-awkn-integration`

## Current verified baseline

- Latest component baseline: `docs/P6-W7J-MALFORMED-SUCCESS-BASELINE.md`
- Baseline commit: `cbc47c3b12f04b6978c3f2ea103069820e15fe05`
- P6-W7 status: `IN_PROGRESS`
- P7: `PLANNED`

## Worker coordination

| Work Unit | Status | Owner | Claim evidence | Notes |
|---|---|---|---|---|
| P6-W7-09 malformed JSON | DONE | Marketing-A | `docs/P6-W7I-MALFORMED-JSON-BASELINE.md` | Baseline recorded |
| P6-W7-10 malformed success payload | DONE | Marketing-B | `docs/P6-W7J-MALFORMED-SUCCESS-BASELINE.md` | Baseline recorded |
| P6-W7-11 missing entity ack | CLAIMED | Marketing-B | 2026-09-05 09:02 +08:00 | Scope limited to missing Ack fields; W7-12 identity mismatch excluded |
| P6-W7-12 identity mismatch | READY | UNCLAIMED | - | Keep separate from W7-11 |
| P6-W7-13 duplicate submit | READY | UNCLAIMED | - | Depends on prior failure hardening semantics |
| P6-W7-14 duplicate retry | READY | UNCLAIMED | - | Keep logical action / idempotency stable |
| P6-W7-15 permission revoked during active session | READY | UNCLAIMED | - | Permission Hard Gate |
| P6-W7-16 dependency temporarily unavailable | READY | UNCLAIMED | - | Stable retry/error path |
| P6-W8 real AWKN E2E | BLOCKED | UNCLAIMED | - | Requires real AWKN endpoints / credentials / authorization / network evidence |
| P7 real business acceptance | TODO | UNCLAIMED | - | Starts after P6 Release/Integration gates |

## Reviewer findings carried forward

- Real AWKN server-side exactly-once evidence remains for P6-W8.
- Real Session / Product / Material credentials and final authorization remain for P6-W8.
- Cross-service trace evidence remains for P6-W8.
- Agent logical action context-version risk and UI retry same-action semantics remain reviewer concerns; current W7-11 scope does not touch Agent core files.
- PR #2 remains stacked on docs PR #1 / old main baseline and must be retargeted or rebased before formal merge.

## Coordination rules

- Workers claim exactly one Atomic Work Unit before edits.
- A worker must abandon a claim if another worker has already advanced the same unit or core file set.
- `DONE` requires implementation, verification evidence, Baseline/ledger update and commit closure.
- Hard external blockers are recorded and skipped; they do not justify weakening Hard Gates.
- Never edit `main` directly.
