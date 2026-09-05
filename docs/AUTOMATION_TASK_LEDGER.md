# AWKN Marketing Automation Task Ledger

## PROJECT_STATUS

`IN_PROGRESS`

## Current branch

`feature/p6-real-awkn-integration`

## Current verified baseline

- Latest component baseline: `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md`
- Latest Marketing-A baseline: `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`
- Reviewer W7O supplement: `docs/P6-W7O-REVIEWER-SUPPLEMENT.md`
- Marketing-B W7P supplement: `docs/P6-W7P-WORKER-B-SUPPLEMENT.md`
- W7P baseline commit: `9800fc0233e25f070fd94b24b3ad9cf03164b299`
- W7O baseline amendment commit: `d7f2caed710312b1899b2e6c982db49abfc72ecc`
- W7O stale-response hardening: `ff090dbadecc20c9c370e3f13a6a9e42ffabf8ea`
- W7O Reviewer immediate-invalidation corrective head: `515f3faa4c87a652c2e3445c90a9375c1262c2d9`
- W7O Marketing-A focused current-environment verification: `FOCUSED_TYPESCRIPT_PASS`; evidence commit `b26326dfbca0b2f14d5946f0a0c1fbc8e8275892`
- W7P Reviewer Learning recovery gate: `85f8a0c5f3bfd3e457ed505a2e3123379b78dfbf`
- W7P Marketing-B Learning lifecycle corrective head: `d54168228755e1a4e581060d21db35dc7d033109`
- Historical worker verification head: `077ddeb9ae405f8b9ba55602c94a6a364d5caf41`
- Independent Reviewer added corrective W7-15/W7-16 commits after the component Baselines; fresh full-repository runtime verification and Baseline supplementation are required.
- Marketing-A focused W7O Contract verification: `PASS` for authorization invalidation classification, refresh/invalidation event separation, and revoked Grant action denial after Session refresh; full repository runtime remains pending.
- Marketing-B focused W7P Store verification: `PASS` for attempt/status/trace/lifecycle monotonic merge; full repository runtime remains pending.
- Reviewer runtime status: `RUNTIME_VERIFICATION_PENDING` (CI/CD, GitHub Actions, Runner and deployment are outside execution scope).
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
| P6-W7-15 | permission revoked during active session | Permission / Session | P0 | VERIFYING | Marketing-A | P5 permission baseline | Full repository runtime verification unavailable in current container after one DNS-failed clone attempt; Reviewer code findings are statically closed | `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`; `docs/P6-W7O-REVIEWER-SUPPLEMENT.md`; shared invalidation routing; stale-response ordering guard; immediate stale projection suspension | FOCUSED_TYPESCRIPT_PASS / RUNTIME_VERIFICATION_PENDING | `515f3faa4c87a652c2e3445c90a9375c1262c2d9`; evidence `b26326df` | 2026-09-05T11:05+08:00 |
| P6-W7-16 | dependency temporarily unavailable | Adapter / Retry | P1 | VERIFYING | Marketing-B | W7F/G/H adapter semantics | Full repository runtime verification blocked by local clone DNS; CI/CD intentionally skipped | `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md`; `docs/P6-W7P-WORKER-B-SUPPLEMENT.md`; Reviewer Learning retry state-truth test; lifecycle reset corrective | FOCUSED_TYPESCRIPT_PASS / RUNTIME_VERIFICATION_PENDING | `d54168228755e1a4e581060d21db35dc7d033109` | 2026-09-05T11:02+08:00 |
| P6-W8 | real AWKN E2E | Integration | P0 | BLOCKED | UNCLAIMED | W7 VERIFYING | real AWKN endpoints / credentials / authorization / network evidence | authorization, cross-service trace, same-key network exactly-once | BLOCKED_EXTERNAL | - | 2026-09-05T10:38+08:00 |
| P7 | real business acceptance | Eval / Release | P0 | TODO | UNCLAIMED | P6 W8/W9 release gates | P6 not complete | 5 Workspace / 30 Task / Release Review | PENDING | - | 2026-09-05T10:33+08:00 |

## Blocker ledger

| Scope | Status | Error / evidence | Attempts | Suspected root cause | Unblock condition |
|---|---|---|---|---|---|
| Local clone verification | BLOCKED_LOCAL_ONLY | `fatal: unable to access 'https://github.com/AWKN-Lab/marketing.git/': Could not resolve host: github.com` | Marketing-A: 1 clone attempt in current run; no retry loop. Marketing-B: prior single clone attempt recorded. | execution container DNS/network isolation | container gains GitHub network access or repository is materialized locally with dependencies |
| P6-W8 real upstream | BLOCKED | real AWKN endpoints / credentials / final authorization unavailable in repo workflow | recorded, not retried | external platform dependency | valid endpoints, credentials and authorized environment supplied |
| PR integration | BLOCKED_FOR_MERGE | PR #2 stacked on docs PR #1 / old `main` baseline | recorded | branch ancestry dependency | merge #1, then retarget/rebase #2 |
| Reviewer runtime verification | RUNTIME_VERIFICATION_PENDING | W7-15/W7-16 received corrective commits after their recorded Baselines; A completed focused W7O Contract compile/behavior verification; B completed focused W7P Store verification | A: focused Contract compile/behavior PASS; B: focused Store compile/behavior PASS; 0 CI/CD attempts in this execution path | full repository unavailable in current container; execution rules exclude CI/CD/Actions/Runner/deployment | authorized local/runtime owner executes repository typecheck, P0/P6 tests and build, then updates W7O/W7P evidence |

## Independent Reviewer Findings — 2026-09-05

| finding_id | severity | task_id | file/location | problem | evidence | impact | acceptance_criteria | status |
|---|---|---|---|---|---|---|---|---|
| REV-20260905-01 | P1 | P6-W7-15 | `lib/material-upload-client.ts`; `components/assistant-ui/marketing-runtime-provider.tsx`; `lib/product-session.ts`; `lib/product-client.ts` | Direct Material Upload and Agent clients originally missed Session revalidation for authorization-class failures; Product used an equivalent two-step route rather than the centralized wrapper. | Pre-review direct clients returned/yielded authorization failures without refresh. Reviewer follow-up standardized Product, Material and Agent onto `signalMarketingSessionRefreshForProductError()`. | A revoked Workspace could remain represented by a stale browser Session after an authorization denial; divergent client routing also increases future regression risk. | Product / Material / Agent authorization-class failures use one shared routing contract. `RATE_LIMITED` and unrelated failures do not invalidate Session. W7-15 gate covers the routing. | FIXED_PENDING_FULL_RUNTIME_VERIFICATION (`de47dfa2`, `fb7d9dbd`, `077ddeb9`, `1373464a`, `d9639ed6`; focused W7O PASS `b26326df`) |
| REV-20260905-02 | P1 | P6-W7-15 | `components/product-session-provider.tsx`; `lib/product-session.ts`; `scripts/p6-active-session-revoke.ts` | Authorization-triggered revalidation retained the previous Session while `/api/session` was in flight. `refreshVersion` blocked out-of-order restoration but left a visible stale-projection interval. | Reviewer corrective code adds `MARKETING_SESSION_INVALIDATE_EVENT`; Provider clears Session before `load()`, while routine refresh remains non-destructive. Targeted W7-15 test models projection suspension before revalidation completion. Marketing-A focused Contract verification confirms invalidation routing and revoked-Grant denial behavior. | Revoked Workspace data could remain visible between trusted authorization denial and refreshed Session arrival. | Authorization-class denial immediately suspends current Session/protected projection; only a newly authorized Session may remount it. Routine refresh does not clear Session. Out-of-order stale responses remain rejected. | FIXED_PENDING_FULL_RUNTIME_VERIFICATION (`7e82d5ee`, `d9639ed6`, `3f6425ae`, `515f3faa`; supplement `51182f26`; focused W7O PASS `b26326df`) |
| REV-20260905-03 | P1 | P6-W7-16 | `scripts/p6-dependency-unavailable.ts`; `lib/learning-run-store.ts`; `scripts/p6-dependency-unavailable-learning.ts` | W7P covered Product, Agent and Material recovery but omitted Learning retry outage/state truth. Reviewer added Learning recovery evidence; Marketing-B found cross-attempt `startedAt/finishedAt` lifecycle mixing in the Store merge. | Reviewer commits `9594db0c` / `85f8a0c5`; Marketing-B corrective commits `99f5e2b9` / `d5416822`; focused TypeScript Store verification recorded in `docs/P6-W7P-WORKER-B-SUPPLEMENT.md`. | Learning attempt/status could recover while displaying lifecycle timestamps from the previous failed attempt, creating a mixed state projection. | Retry outage returns retryable failure with no success data/local mutation; recovery reuses `run_id + attempt` key; newer attempt preserves run identity, attempt/status/trace and resets attempt lifecycle timestamps/error; stale attempts remain rejected. | FIXED_PENDING_FULL_RUNTIME_VERIFICATION (`9594db0c`, `85f8a0c5`, `99f5e2b9`, `d5416822`) |
| REV-20260905-04 | P2 | P6-W7 | PR #2 metadata; `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`; shared Ledger | PR metadata and historical W7O close text still presented W7 as complete after Reviewer findings had reopened W7-15/W7-16 to `VERIFYING`. | Shared Ledger commit `f9ce79c1` explicitly reopens P6-W7. Before this review PR #2 still said W7-09..16 `DONE` / W7 `COMPLETE`; W7O historical Baseline ends with W7-15 `DONE`. | A/B workers or release reviewers could read the stale PR/Baseline summary and enter W8/P7 prematurely. | Shared Ledger remains the current status owner; PR #2 states W7-15/W7-16/W7 as `VERIFYING`; Reviewer supplement preserves historical Baseline while recording the current override and pending runtime evidence. | FIXED (`docs/P6-W7O-REVIEWER-SUPPLEMENT.md`; PR #2 metadata updated) |

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
