# P6-W2 Real Session & Permission Development-Verified Baseline

## 1. Status

`DEVELOPMENT_VERIFIED`

- implementation start: `9b3976998e42668f53431ffa48f6972e903b272a`
- implementation commit: `b15d5f3ea05714be7f112bb2a697c158a0771822`
- type-safety fix: `cd7df57a7468e7afac7635e2068d39fdb616d907`
- GitHub Actions run: `33904213504`

Verified:

```text
npm install          PASS
npm run typecheck    PASS
npm run test:p0      PASS
npm run test:p6      PASS
npm run build        PASS
```

No P0–P5 test was removed or weakened.

---

## 2. W2 Scope

P6-W2 hardens the product-side Session / Permission boundary before Workspace / Material integration.

Completed product-side items:

```text
W2-01 /api/session uses configured AWKN Session endpoint
W2-02 AUTH_REQUIRED / FORBIDDEN / SESSION_UNAVAILABLE stable mapping
W2-03 configured platform endpoint never falls back to local owner
W2-04 tenant id + actor id required
W2-05 capability whitelist validated fail-closed
W2-06 Workspace Grant access validated as read / write / admin
W2-07 tenant + actor cache scope regression covered
W2-08 revoked Workspace removed from visible cached projection
W2-09 revoked Workspace Candidate excluded before Experience matching
W2-10 server adapter preserves actor identity context for upstream final authorization
W2-11 permission matrix automated tests
W2-12 revoked cache negative test
```

A real external AWKN Session deployment is still an integration dependency. Network-level verification belongs to P6-W8 Real AWKN E2E; this baseline does not claim production Session availability.

---

## 3. Session Contract Hardening

`lib/product-session.ts` now fails closed when the upstream Session contains:

- missing `tenant_id` / tenant id;
- missing `actor_id` / user id;
- capability values outside `MARKETING_CAPABILITIES`;
- invalid Workspace Grant access values;
- duplicate grants for the same Workspace with ambiguous access.

Platform Session continues to normalize into:

```text
Tenant
+ Actor
+ Roles
+ Marketing Capabilities
+ Workspace Grants
```

The allowed Workspace access values remain:

```text
read
write
admin
```

Invalid access no longer silently degrades to `read`.

---

## 4. Platform Fail-Closed Behavior

When `AWKN_MARKETING_SESSION_URL` is configured:

```text
upstream 401 -> AUTH_REQUIRED
upstream 403 -> FORBIDDEN
upstream unavailable / 5xx -> SESSION_UNAVAILABLE
upstream timeout -> SESSION_UNAVAILABLE
invalid upstream identity -> INVALID_SESSION_RESPONSE
upstream mode=local -> INVALID_SESSION_RESPONSE
```

Even when local fallback is enabled for local development, a configured platform endpoint failure does not return `LOCAL_MARKETING_SESSION`.

Local P0 development behavior remains available when no Session endpoint is configured under the existing local-development rule.

---

## 5. Server Authorization Boundary

`lib/server-upstream-auth.ts` now preserves both service authentication and actor authentication context:

```text
Authorization: Bearer <service token>
x-awkn-user-authorization: <incoming actor Authorization>
Cookie: <incoming session cookie>
x-request-id: <incoming request id>
```

If no service token is configured, the incoming Authorization header remains the upstream Authorization header.

The Marketing product route still does not become authorization truth. AWKN upstream remains responsible for final authorization and side-effect rejection.

---

## 6. Permission Matrix Evidence

`npm run test:p6:permission` now covers:

- read grant permits read;
- write grant permits write actions;
- read grant rejects write actions;
- missing capability blocks side effects even when a write grant exists;
- revoked Workspace is excluded from visible projection;
- revoked Workspace Candidate cannot enter Experience matching;
- tenant / actor storage scopes cannot read each other's cache;
- Session rejects unknown capability;
- Session rejects invalid / duplicate Workspace Grants;
- 401 / 403 / unavailable error mapping;
- trace preservation on Session failures;
- configured platform Session cannot silently become local owner;
- local-mode identity returned by a configured upstream is rejected.

Hard Gate result:

```text
unauthorized read = 0 in tested matrix
unauthorized write = 0 in tested matrix
revoked context leakage = 0 in tested projection / Experience path
platform local-owner fallback = 0
permission denied side effect = 0 in tested product gate
```

---

## 7. CI Incident and Fix

The first W2 implementation run failed at TypeScript compile because the Session route test helper assigned a result through an async closure; TypeScript narrowed the post-assert value to `never`.

The test helper was changed to a generic `withSessionUpstream<T>()` that returns the callback result directly. No production logic or Hard Gate was weakened.

Final CI run `33904213504` passed all required gates.

---

## 8. Known Limits

1. Real AWKN Session endpoint availability and real credentials are not present in this CI environment.
2. The upstream must consume forwarded actor identity (`Cookie` and/or `x-awkn-user-authorization`) when a service token is used.
3. Server-side permission side-effect count against a real AWKN Product Service requires P6-W8 integration credentials.
4. Physical browser cache entries can remain on disk after revoke; all product-visible projections and matching paths must continue to filter by current grants. Trusted server-side export remains the only platform export path.

These limits do not justify local-owner fallback or relaxed permission gates.

---

## 9. Rollback

If W2 causes regression, roll back to:

```text
9b3976998e42668f53431ffa48f6972e903b272a
```

Then keep W1 Product Contract baseline intact and re-apply Session changes in smaller units.

---

## 10. Next

Next work package:

```text
P6-W3 Workspace & Material
```

Priority order:

```text
Workspace stable ID / revision / idempotency
-> Material feed / upload identity
-> parse state / retry
-> parsed text + evidence projection
-> failure and revoked-workspace negative cases
```

W3 must preserve the W2 Session / Permission Hard Gate.