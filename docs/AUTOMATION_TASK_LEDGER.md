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
- W7O Marketing-A no-drift revalidation: REHYDRATE head `c26e2fc6a07a36b85771556989d0e136a80627db`; compare from `b26326df...` shows later commits only touched Learning/W7P/Ledger files; W7O code drift = 0; evidence commit `ac240774d8c4cc883e9a274185a8707545fa0c48`.
- W7O Marketing-A current-head focused rerun: `FOCUSED_W7O_TYPESCRIPT_PASS_CURRENT_HEAD`; evidence commit `f099e6d5018f474f94b460b6c7b62efdba5b3245`.
- W7P Reviewer Learning recovery gate: `85f8a0c5f3bfd3e457ed505a2e3123379b78dfbf`
- W7P Marketing-B Learning Store lifecycle corrective head: `d54168228755e1a4e581060d21db35dc7d033109`
- W7P Marketing-B retry-attempt start-time corrective: `dcf1fee23da546ed59f87f57dbb498d338f0a656`; regression guard `bd662a5079e24c7041e4f2ef0e4b5876858cbf6c`
- W7P Marketing-B focused current-environment verification: `FOCUSED_TYPESCRIPT_PASS` for attempt/status/trace/lifecycle merge plus retry caller fallback; supplement commit `4cdfc0c6332664c5acc21499368e402f299c5221`
- W7P Independent Reviewer cross-attempt output isolation corrective: `7041f257ba69fb699c150be1a18845494297a2e0`; regression guard `a6effb3292db4a73cea0ae9c72f2322e1c46e901`.
- W7P Marketing-B current-head focused revalidation: `FOCUSED_W7P_ATTEMPT_ISOLATION_PASS`; verifies cross-attempt Signal/trace isolation, same-attempt incremental merge, older-attempt rejection and no code drift from `a6effb32...` through rehydrate head `0a03f83c...`; evidence commit `1bcc3b5ef08715207cfbeb85e105ac7977e9de42`.
- W7P Independent Reviewer same-attempt failure-evidence corrective: `ea080a2db2ad23e07fc0e83ce8a28deccb74211b`; regression guard `79eab9055197e6f5f5260edcd9bc76302073dec2`; full repository runtime verification remains pending.
- Historical worker verification head: `077ddeb9ae405f8b9ba55602c94a6a364d5caf41`
- Independent Reviewer added corrective W7-15/W7-16 commits after the component Baselines; fresh full-repository runtime verification and Baseline supplementation are required.
- Marketing-A focused W7O Contract verification: `PASS` for authorization invalidation classification, refresh/invalidation event separation, revoked Grant action denial after Session refresh, and current-head rerun; no-drift check confirms the same W7O blobs remain active; full repository runtime remains pending.
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
| P6-W7-15 | permission revoked during active session | Permission / Session | P0 | VERIFYING | Marketing-A | P5 permission baseline | Full repository runtime verification unavailable in current container after one DNS-failed clone attempt; Reviewer code findings are statically closed | `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`; `docs/P6-W7O-REVIEWER-SUPPLEMENT.md`; shared invalidation routing; stale-response ordering guard; immediate stale projection suspension; no-drift evidence `ac240774`; focused rerun `f099e6d5` | FOCUSED_TYPESCRIPT_PASS / FOCUSED_W7O_TYPESCRIPT_PASS_CURRENT_HEAD / NO_CODE_DRIFT_CONFIRMED / RUNTIME_VERIFICATION_PENDING | `515f3faa4c87a652c2e3445c90a9375c1262c2d9`; focused `b26326df`; no-drift `ac240774`; rerun `f099e6d5` | 2026-09-05T12:29+08:00 |
| P6-W7-16 | dependency temporarily unavailable | Adapter / Retry | P1 | VERIFYING | Marketing-B | W7F/G/H adapter semantics | Full repository runtime verification unavailable; latest Reviewer same-attempt failure-evidence corrective is newer than the focused W7P revalidation | `docs/P6-W7P-DEPENDENCY-UNAVAILABLE-BASELINE.md`; `docs/P6-W7P-WORKER-B-SUPPLEMENT.md`; Reviewer Learning retry state-truth gate; Store lifecycle reset; UI retry attempt-start fallback; cross-attempt signals/trace isolation; same-attempt failed error preservation | FOCUSED_TYPESCRIPT_PASS / FOCUSED_W7P_ATTEMPT_ISOLATION_PASS / NO_CODE_DRIFT_CONFIRMED / LATEST_REVIEWER_TEST_ADDED / RUNTIME_VERIFICATION_PENDING | `7041f257ba69fb699c150be1a18845494297a2e0`; test `a6effb3292db4a73cea0ae9c72f2322e1c46e901`; focused `1bcc3b5ef08715207cfbeb85e105ac7977e9de42`; fix `ea080a2d`; test `79eab905` | 2026-09-05T13:19+08:00 |
| P6-W8 | real AWKN E2E | Integration | P0 | BLOCKED | UNCLAIMED | W7 VERIFYING | real AWKN endpoints / credentials / authorization / network evidence | authorization, cross-service trace, same-key network exactly-once | BLOCKED_EXTERNAL | - | 2026-09-05T10:38+08:00 |
| P7 | real business acceptance | Eval / Release | P0 | TODO | UNCLAIMED | P6 W8/W9 release gates | P6 not complete | 5 Workspace / 30 Task / Release Review | PENDING | - | 2026-09-05T10:33+08:00 |

## Blocker ledger

| Scope | Status | Error / evidence | Attempts | Suspected root cause | Unblock condition |
|---|---|---|---|---|---|
| Local clone verification | BLOCKED_LOCAL_ONLY | `fatal: unable to access 'https://github.com/AWKN-Lab/marketing.git/': Could not resolve host: github.com`; current Reviewer workspace connector also unavailable | Marketing-A: 1 clone attempt in its focused run; Marketing-B: 1 clone attempt in its revalidation run; Independent Reviewer made no retry loop | execution container / local workspace connectivity unavailable | local repository becomes available with dependencies or an authorized local runtime can execute the repository gates |
| P6-W8 real upstream | BLOCKED | real AWKN endpoints / credentials / final authorization unavailable in repo workflow | recorded, not retried | external platform dependency | valid endpoints, credentials and authorized environment supplied |
| PR integration | BLOCKED_FOR_MERGE | PR #2 stacked on docs PR #1 / old `main` baseline | recorded | branch ancestry dependency | merge #1, then retarget/rebase #2 |
| Reviewer runtime verification | RUNTIME_VERIFICATION_PENDING | W7-15/W7-16 contain post-Baseline Reviewer corrections; W7-16 newest same-attempt failure-evidence fix/test is newer than the recorded focused revalidation | A: focused Contract compile/behavior evidence exists; B: focused TypeScript covers W7P through `7041f257` / `a6effb32`; latest `ea080a2d` / `79eab905` is source-reviewed with a repository regression guard added, full repository runtime remains unavailable | full repository unavailable in current Reviewer environment; execution rules exclude CI/CD/Actions/Runner/deployment | authorized local/runtime owner executes repository typecheck, P0/P6 tests and build against the latest corrective head, then updates W7O/W7P evidence |

## Independent Reviewer Findings — 2026-09-05

| finding_id | severity | task_id | file/location | problem | evidence | impact | acceptance_criteria | status |
|---|---|---|---|---|---|---|---|---|
| REV-20260905-01 | P1 | P6-W7-15 | `lib/material-upload-client.ts`; `components/assistant-ui/marketing-runtime-provider.tsx`; `lib/product-session.ts`; `lib/product-client.ts` | Direct Material Upload and Agent clients originally missed Session revalidation for authorization-class failures; Product used an equivalent two-step route rather than the centralized wrapper. | Pre-review direct clients returned/yielded authorization failures without refresh. Reviewer follow-up standardized Product, Material and Agent onto `signalMarketingSessionRefreshForProductError()`. | A revoked Workspace could remain represented by a stale browser Session after an authorization denial; divergent client routing also increases future regression risk. | Product / Material / Agent authorization-class failures use one shared routing contract. `RATE_LIMITED` and unrelated failures do not invalidate Session. W7-15 gate covers the routing. | FIXED_PENDING_FULL_RUNTIME_VERIFICATION (`de47dfa2`, `fb7d9dbd`, `077ddeb9`, `1373464a`, `d9639ed6`; focused W7O PASS `b26326df`; no-drift `ac240774`; rerun `f099e6d5`) |
| REV-20260905-02 | P1 | P6-W7-15 | `components/product-session-provider.tsx`; `lib/product-session.ts`; `scripts/p6-active-session-revoke.ts` | Authorization-triggered revalidation retained the previous Session while `/api/session` was in flight. `refreshVersion` blocked out-of-order restoration but left a visible stale-projection interval. | Reviewer corrective code adds `MARKETING_SESSION_INVALIDATE_EVENT`; Provider clears Session before `load()`, while routine refresh remains non-destructive. Targeted W7-15 test models projection suspension before revalidation completion. Marketing-A focused Contract verification confirms invalidation routing and revoked-Grant denial behavior. | Revoked Workspace data could remain visible between trusted authorization denial and refreshed Session arrival. | Authorization-class denial immediately suspends current Session/protected projection; only a newly authorized Session may remount it. Routine refresh does not clear Session. Out-of-order stale responses remain rejected. | FIXED_PENDING_FULL_RUNTIME_VERIFICATION (`7e82d5ee`, `d9639ed6`, `3f6425ae`, `515f3faa`; supplement `51182f26`; focused W7O PASS `b26326df`; no-drift `ac240774`; rerun `f099e6d5`) |
| REV-20260905-03 | P1 | P6-W7-16 | `lib/learning-run-store.ts`; `components/learning-watch.tsx`; `scripts/p6-dependency-unavailable-learning.ts` | W7P initially omitted Learning retry outage/state truth. Reviewer added Learning recovery evidence; Marketing-B then found Store cross-attempt lifecycle mixing and a UI retry fallback that could reuse attempt-1 `startedAt` when the retry response omitted `started_at`. | Reviewer commits `9594db0c` / `85f8a0c5`; Store corrective `99f5e2b9` / `d5416822`; UI corrective `dcf1fee2` / `bd662a50`; focused evidence in `docs/P6-W7P-WORKER-B-SUPPLEMENT.md`. | A recovered attempt could display lifecycle timestamps from the previous failed attempt, producing mixed attempt state even when run ID/status/trace were correct. | Retry outage returns retryable failure with no success data/local mutation; recovery reuses `run_id + attempt` key; newer attempt preserves run identity, attempt/status/trace, uses its own lifecycle start fallback, clears stale finish/error, and rejects stale attempts. | FIXED_PENDING_FULL_RUNTIME_VERIFICATION (`9594db0c`, `85f8a0c5`, `99f5e2b9`, `d5416822`, `dcf1fee2`, `bd662a50`; focused W7P PASS `4cdfc0c6`) |
| REV-20260905-04 | P2 | P6-W7 | PR #2 metadata; `docs/P6-W7O-ACTIVE-SESSION-REVOKE-BASELINE.md`; shared Ledger | PR metadata and historical W7O close text still presented W7 as complete after Reviewer findings had reopened W7-15/W7-16 to `VERIFYING`. | Shared Ledger explicitly reopens P6-W7. PR #2 now states W7-15/W7-16/W7 `VERIFYING`; W7O Reviewer supplement records the override. | A/B workers or release reviewers could read stale summary text and enter W8/P7 prematurely. | Shared Ledger remains the current status owner; PR #2 states W7-15/W7-16/W7 as `VERIFYING`; Reviewer supplement preserves historical Baseline while recording the current override and pending runtime evidence. | FIXED (`docs/P6-W7O-REVIEWER-SUPPLEMENT.md`; PR #2 metadata updated) |
| REV-20260905-05 | P1 | P6-W7-16 | `lib/learning-run-store.ts:mergeLearningRun`; `scripts/p6-dependency-unavailable-learning.ts` | New-attempt merge reset lifecycle timestamps/error but still inherited previous-attempt `signals` when the new attempt returned an empty list and inherited previous `traceId` when the new attempt omitted trace. | Pre-fix expressions were `next.signals.length ? next.signals : previous.signals` and `next.traceId ?? previous.traceId` for all attempts. Reviewer corrective `7041f257` makes both fields attempt-aware; regression guard `a6effb32` starts from a failed attempt containing stale Signal/trace and verifies attempt 2 receives neither. Marketing-B current-head focused revalidation confirms the correction and same-attempt semantics. | A recovered `attempt=2 / running` projection could display output and trace from failed attempt 1, corrupting Learning retry evidence and misleading the UI/Today projection. | When `nextAttempt > previousAttempt`, `signals` and `traceId` come only from the new attempt; empty/absent stays empty/undefined. Same-attempt incremental merge behavior remains unchanged. Older attempts still cannot overwrite the newer attempt. | FIXED_PENDING_FULL_RUNTIME_VERIFICATION (`7041f257`, `a6effb32`; focused `1bcc3b5e`) |
| REV-20260905-06 | P2 | P6-W7-16 | `lib/learning-run-store.ts:mergeLearningRun`; `lib/learning-contract.ts:validateLearningProductResponse`; `components/learning-run-poller.tsx`; `scripts/p6-dependency-unavailable-learning.ts` | Same-attempt `failed` snapshots may omit `error`; the previous merge assigned `error: next.error`, silently clearing an already recorded failure reason while preserving the same failed attempt. | Learning response Contract validates run identity, attempt, status and signals but does not require `error` for failed status. The poller repeatedly merges same-attempt snapshots. Pre-fix Store used unconditional `error: next.error`. Reviewer corrective `ea080a2d` preserves prior error only for sparse same-attempt failed snapshots; guard `79eab905` covers error/Signal/trace/finishedAt preservation and confirms newer attempts still clear stale failure evidence. | A Learning run could remain `status=failed` while losing its failure message/evidence, weakening retry truth, diagnostics and auditability without changing side-effect count. | For the same attempt and `status=failed`, an omitted error preserves the existing same-attempt error; an explicit new error remains authoritative. A newer attempt does not inherit the prior attempt error. Lower-attempt rejection, same-attempt monotonic state rules, stable run ID and retry idempotency remain unchanged. Repository regression test covers the sparse failed snapshot. | FIXED_PENDING_FULL_RUNTIME_VERIFICATION (`ea080a2d`, `79eab905`) |

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
