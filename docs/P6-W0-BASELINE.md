# P6-W0 Verification Baseline

## Status

`DEVELOPMENT_VERIFIED`

## Scope

P6-W0 only: baseline lock + reusable P6 test harness. No ProductOperation semantics, upstream contract shape, UI behavior, Agent Runtime behavior, or real AWKN integration behavior was expanded in this work package.

## Baseline

- P5 behavior baseline: `cf806a5408ed283ef33d5be7c01b28e7ea42e826`
- P6 feature branch start: `09044e080324971b046824caf9a030235b74895e`
- W0 harness commit: `3fbd994e40773edf33658bd0330ab4889cb26f83`
- W0 compatibility fix: `0b5e2c814b176e5c682b4f94b2d8c52ffb188d34`
- GitHub Actions passing run: `33898508536`

## W0 Tasks

```text
W0-01 lock P5 behavior baseline / P6 start commit       DONE
W0-02 retain typecheck / test:p0 / build                DONE
W0-03 P6 Contract Test entry                            DONE
W0-04 Permission Test entry                             DONE
W0-05 Idempotency Test entry                            DONE
W0-06 Revision / Reconcile Test entry                   DONE
W0-07 Real AWKN integration config + environment gate   DONE
W0-08 Fixture / Synthetic / Real Acceptance separation  DONE
W0-09 CI secret-print guard                             DONE
W0-10 failure operation / entity / trace summary        DONE
```

## Added Verification Entrypoints

```text
npm run test:p6:contract
npm run test:p6:permission
npm run test:p6:idempotency
npm run test:p6:revision
npm run test:p6:integration
npm run test:p6:ci-guard
npm run test:p6
```

CI now runs:

```text
npm run typecheck
npm run test:p0
npm run test:p6
npm run build
```

## Verification Result

Passing run `33898508536`:

```text
npm install          PASS
npm run typecheck    PASS
npm run test:p0      PASS
npm run test:p6      PASS
npm run build        PASS
```

The first W0 CI run `33898318662` failed because `tsx` executed the test files through a CJS output path and rejected top-level `await`. The scripts were changed to explicit `main().catch(...)` entrypoints. The next run passed all gates. The failed run is retained as engineering evidence rather than hidden.

## Integration Environment Boundary

`.env.integration.example` defines the P6 integration configuration contract. Real integration stays disabled unless:

```text
AWKN_P6_INTEGRATION=true
```

When enabled, the harness requires:

- local session fallback disabled;
- Session / Agent / Product / Material endpoints configured;
- corresponding tokens present server-side;
- token values never printed by the harness.

`.env.integration.local` is gitignored.

Test data scopes are explicit:

```text
fixture
synthetic
real-acceptance
```

CI defaults to synthetic/non-real integration behavior and does not require AWKN credentials for W0.

## Changed Files

```text
.env.integration.example
.github/workflows/ci.yml
.gitignore
package.json
scripts/p6-test-support.ts
scripts/p6-contract.ts
scripts/p6-permission.ts
scripts/p6-idempotency.ts
scripts/p6-revision.ts
scripts/p6-integration-config.ts
scripts/p6-ci-guard.ts
```

## Known Limitations

1. Real AWKN endpoints and credentials are not available in this work package; real network Contract/E2E verification remains P6-W8.
2. The W0 Contract/Idempotency tests are harness-level smoke gates. Full 19-operation metadata, persistent Ack requirements, idempotency side-effect tests, revision Ack validation, and error taxonomy belong to P6-W1 and later packages.
3. PR #2 is currently stacked on docs PR #1 because the feature branch was created from `docs/engineering-system-v1`. After #1 merges, PR #2 should be retargeted/rebased so the P6 code diff is isolated.
4. No P0–P5 tests were removed or weakened.

## Rollback

W0 code can be rolled back to feature start commit:

```text
09044e080324971b046824caf9a030235b74895e
```

P5 code behavior baseline remains:

```text
cf806a5408ed283ef33d5be7c01b28e7ea42e826
```

## Next

`P6-W1 Product Contract 固化`

Start with the 19-operation metadata registry and table-driven Contract Test. Do not start P6-W2 until W1 Hard Gate is green.
