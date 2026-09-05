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
- Centralized authorization refresh routing: `de47dfa2ca4f171536040bd8cf2cc0dec3f3dee3`
- Material upload authorization refresh: `fb7d9dbd02759e7fe6583c370de0911044ff6c56`
- Agent authorization refresh: `077ddeb9ae405f8b9ba55602c94a6a364d5caf41`
- Cross-client authorization refresh test: `1373464af3250b908295a77e875e45bcf8b392c6`
- Stale Session refresh race guard: `ff090dbadecc20c9c370e3f13a6a9e42ffabf8ea`

## Scope

This work unit closes the active-session revocation gap while preserving the P5 authorization boundary:

1. The trusted AWKN upstream remains the final authorization authority for Product writes.
2. A stale browser Session may attempt an action after a Grant has been revoked; the upstream denial prevents the side effect.
3. Authorization errors `AUTH_REQUIRED`, `FORBIDDEN`, and `WORKSPACE_REVOKED` signal Marketing Session revalidation.
4. Product requests, direct Material Upload requests, and direct Agent Runtime requests share the same authorization-denial refresh routing.
5. `ProductSessionProvider` revalidates on authorization denial, focus, visible-tab recovery, and a 60-second interval.
6. Session refresh failure clears the active Session and fails closed.
7. Concurrent Session refreshes use a monotonic refresh version. An older response cannot overwrite a newer revoke result.
8. Once the refreshed Session drops a Workspace Grant, cached visible projection, reviewed Experience matching, Learning Watch visibility, and Learning Run visibility exclude that Workspace.

No generic identity infrastructure, AWKN Engine internals, Memory OS internals, or UI redesign was introduced.

## Controlled server-side denial evidence

`scripts/p6-active-session-revoke.ts` starts with a Session that still contains a write Grant, then models the trusted upstream authorization source as already revoked.

For the stale-session `feedback.record` attempt:

```text
browser stale Grant           = write
upstream current Grant        = revoked
upstream HTTP                 = 403
product error                 = WORKSPACE_REVOKED
retryable                     = false
upstream attempts             = 1
logical side effects          = 0
trace_id preserved            = trace-w7-active-revoke-denied
service auth forwarded        = yes
actor authorization forwarded = yes
```

The controlled upstream rejects the operation before the logical write counter can advance. The Marketing product boundary preserves the denial and produces no success projection.

Real AWKN authorization evidence remains a P6-W8 external-environment requirement.

## Session invalidation behavior

Authorization denial drives deterministic refresh routing:

```text
WORKSPACE_REVOKED -> refresh
FORBIDDEN         -> refresh
AUTH_REQUIRED     -> refresh
RATE_LIMITED      -> no permission refresh
```

The same routing is applied by:

```text
Product client
Material Upload client
Agent Runtime client
```

The provider refresh paths are:

```text
authorization-denial signal
window focus
visible-tab recovery
60-second periodic revalidation
```

A failed revalidation clears the prior Session. Concurrent refresh responses are version-gated so a late stale response cannot restore a revoked Grant after a newer response has removed it.

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
product authorization refresh miss                    = 0
material authorization refresh miss                   = 0
agent authorization refresh miss                      = 0
late stale-session response restores revoked Grant    = 0
revoked visible projection leakage                    = 0
revoked Experience reuse                              = 0
revoked Learning visibility leakage                   = 0
platform local-owner fallback                         = 0
```

## Verification

### Repository static verification in current execution environment

Current execution environment cannot materialize the repository through `git clone`:

```text
fatal: unable to access 'https://github.com/AWKN-Lab/marketing.git/':
Could not resolve host: github.com
```

Attempt count: `1`. No retry loop was performed.

Static repository inspection confirms:

- `app/api/product/route.ts` forwards service authorization plus actor authorization and preserves upstream authorization failures.
- `lib/product-client.ts` refreshes Session for authorization-class Product failures.
- `lib/material-upload-client.ts` routes direct upload authorization failures to the same Session refresh signal.
- `components/assistant-ui/marketing-runtime-provider.tsx` routes Agent authorization failures to the same Session refresh signal.
- `components/product-session-provider.tsx` clears Session on failed revalidation and rejects out-of-order stale refresh results with `refreshVersion`.
- `scripts/p6-active-session-revoke.ts` covers zero-side-effect server denial, refresh routing, visible projection filtering, Experience isolation, and Learning isolation.
- `package.json` registers `test:p6:active-session-revoke` in the unified P6 suite.

Runtime execution of `typecheck`, `test:p0`, `test:p6`, and `build` for the post-close hardening commits is `RUNTIME_VERIFICATION_PENDING` because the current execution container cannot resolve GitHub and has no materialized project dependency tree.

CI/CD, GitHub Actions, runners, deployment pipelines, and workflow remediation are outside this execution path and were intentionally not used for the follow-up hardening verification.

## Self Review

### correctness

- stale browser authorization cannot create a trusted success after upstream revoke;
- denial is preserved as a failure envelope;
- current Session replaces stale Grant state after refresh;
- an older concurrent Session response cannot overwrite a newer refreshed Session.

### security

- service credential and actor authorization remain separately forwarded;
- browser capability checks remain UX/cache controls;
- trusted upstream remains final authorization truth;
- Session refresh failure closes access without restoring a local owner Session.

### state truth

- no Product success data is projected from the denied operation;
- revoked Workspace state leaves readable projection and downstream Experience/Learning inputs after Session revalidation;
- stale asynchronous Session responses are prevented from reintroducing old Grants.

### contract

- existing P0-P5 Product/Session contracts remain intact;
- refresh behavior is triggered only by authorization-class errors;
- unrelated transient failures keep their existing retry semantics;
- no ProductOperation or persisted entity identity was changed.

### regression

- No P0-P5 test or Hard Gate was deleted or weakened.
- Post-close runtime regression execution remains pending only because the local execution environment cannot materialize the repository dependencies.

## Known Limits / External Gates

- Real AWKN server-side authorization must still be demonstrated in P6-W8 with valid endpoints, credentials, and final authorization.
- Cross-service trace evidence remains P6-W8.
- Real network same-key exactly-once remains P6-W8.
- Without an authorization error, focus event, or visibility event, background revoke visibility may take up to the configured 60-second Session revalidation interval.
- PR #2 remains subject to the recorded integration ancestry dependency.

## Next

`P6-W7-15 = DONE`.

P6-W7 is complete after W7-16 closure. P6-W8 remains externally blocked until real AWKN authorization/network inputs are available. Marketing-A must rehydrate the shared Ledger before any future claim.
