# P6-W7O Active Session Revoke Baseline

## Status

`COMPONENT_IMPLEMENTED`

- Work unit: `P6-W7-15 permission revoked during active session`
- Owner: `Marketing-A`
- Branch: `feature/p6-real-awkn-integration`
- Previous verified baseline: `docs/P6-W7N-DUPLICATE-RETRY-BASELINE.md`
- Claim commit: `068c722efe2a7b7ce8be19ec6cf6fa97b3738f18`
- Session invalidation contract: `6ca3df9ada519901b37305ba3cd13a456f14947a`
- Product authorization-denial refresh: `759c74083571feee5c4b8b4d5afe784f354c2c45`
- Active Session revalidation: `ab4aed43ea9852cf197f3f520ebc771aaedc947b`
- W7-15 fault gate: `69b7584792c697f9a8f969cbf9073fd51ede6097`
- P6 suite registration: `006c2ea5a69d9852732456f46739c01468218d6e`
- Verified combined head: `c7f69adddbcef9d6878403a779831b0f7d276ec0`
- GitHub Actions: `33939335113` = PASS

## Scope

This work unit closes the active-session revocation gap while preserving the P5 authorization boundary:

1. The trusted AWKN upstream remains the final authorization authority for Product writes.
2. A stale browser Session may attempt an action after a Grant has been revoked; the upstream denial prevents the side effect.
3. Product authorization errors `AUTH_REQUIRED`, `FORBIDDEN`, and `WORKSPACE_REVOKED` now signal immediate Marketing Session revalidation.
4. `ProductSessionProvider` also revalidates on focus, visible-tab recovery, and a 60-second interval so stale Grants do not remain resident indefinitely when no Product action occurs.
5. Session refresh failure clears the active Session and fails closed.
6. Once the refreshed Session drops a Workspace Grant, cached visible projection, reviewed Experience matching, Learning Watch visibility, and Learning Run visibility exclude that Workspace.

No generic identity infrastructure, AWKN Engine internals, Memory OS internals, or UI redesign was introduced.

## Controlled server-side denial evidence

`scripts/p6-active-session-revoke.ts` starts with a Session that still contains a write Grant, then models the trusted upstream authorization source as already revoked.

For the stale-session `feedback.record` attempt:

```text
browser stale Grant          = write
upstream current Grant       = revoked
upstream HTTP                = 403
product error                = WORKSPACE_REVOKED
retryable                    = false
upstream attempts            = 1
logical side effects         = 0
trace_id preserved           = trace-w7-active-revoke-denied
service auth forwarded       = yes
actor authorization forwarded= yes
```

The controlled upstream rejects the operation before the logical write counter can advance. This proves the Marketing product boundary preserves a server denial and does not manufacture a success projection.

Real AWKN authorization evidence remains a P6-W8 external-environment requirement.

## Session invalidation behavior

Authorization denial now drives a deterministic refresh signal:

```text
WORKSPACE_REVOKED -> refresh
FORBIDDEN         -> refresh
AUTH_REQUIRED     -> refresh
RATE_LIMITED      -> no permission refresh
```

The provider refresh paths are:

```text
product authorization denial
window focus
visible-tab recovery
60-second periodic revalidation
```

A failed revalidation clears the prior Session, preventing continued use of stale capabilities or Grants.

## Revocation isolation evidence

After the refreshed Session removes the revoked Workspace:

- cached Workspace projection is filtered out;
- the revoked Candidate is removed before `matchReviewedExperience`;
- an accepted revoked Candidate contributes zero Applied Experience;
- revoked Learning Watch records are hidden;
- revoked Learning Run records are hidden;
- an allowed Workspace remains visible and usable.

This keeps Experience and Learning boundaries aligned with the current Session Grant set.

## Hard Gate

```text
revoked stale-session server-side logical side effect = 0
unauthorized success projection                       = 0
authorization-denial trace loss                       = 0
stale Grant refresh-signal miss                       = 0
revoked visible projection leakage                    = 0
revoked Experience reuse                              = 0
revoked Learning visibility leakage                   = 0
platform local-owner fallback                         = 0
P0 regression                                         = 0
```

## Verification

GitHub Actions run `33939335113` on combined head `c7f69adddbcef9d6878403a779831b0f7d276ec0` completed successfully:

```text
npm install --no-audit --no-fund  PASS
npm run typecheck                 PASS
npm run test:p0                   PASS
npm run test:p6                   PASS
npm run build                     PASS
```

The full P6 suite includes `test:p6:active-session-revoke`. The same combined head also contains Marketing-B's concurrent W7-16 work; the successful run verifies both lines coexist without P0/P6/build regression.

An earlier run on `006c2ea5...` failed inside Marketing-B's W7-16 Agent assertion. Marketing-B corrected the result-contract field names in `c7f69add...`; the subsequent combined run passed. No W7-15 production/test rollback was required.

## Self Review

### correctness

- stale browser authorization cannot create a trusted success after upstream revoke;
- denial is preserved as a failure envelope;
- current Session replaces stale Grant state after refresh.

### security

- service credential and actor authorization remain separately forwarded;
- browser capability checks remain UX/cache controls;
- trusted upstream remains final authorization truth;
- Session refresh failure closes access instead of restoring a local owner Session.

### state truth

- no Product success data is projected from the denied operation;
- revoked Workspace state leaves readable projection and downstream Experience/Learning inputs after Session revalidation.

### contract

- existing P0-P5 Product/Session contracts remain intact;
- added refresh behavior is triggered only by authorization-class Product errors;
- unrelated transient failures keep their existing retry semantics.

### regression

- `typecheck`, P0 regression, full P6 suite, and production build pass on the combined branch head.

## Known Limits / External Gates

- Real AWKN server-side authorization must still be demonstrated in P6-W8 with valid endpoints, credentials, and final authorization.
- Cross-service trace evidence remains P6-W8.
- Real network same-key exactly-once remains P6-W8.
- Without an authorization error, focus event, or visibility event, background revoke visibility may take up to the configured 60-second Session revalidation interval.
- PR #2 remains stacked on the older docs/main ancestry until the recorded merge/rebase dependency is resolved.

## Next

`P6-W7-15 = DONE` after Ledger closure.

`P6-W7-16` remains owned by Marketing-B and must be read from the shared Ledger before any further A-line claim. P6-W8 remains externally blocked until real AWKN authorization/network inputs are available.
