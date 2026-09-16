# P6-W3 Workspace & Material Development-Verified Baseline

## 1. Status

`DEVELOPMENT_VERIFIED`

Workspace component checkpoint:

- `docs/P6-W3A-WORKSPACE-BASELINE.md`
- Workspace checkpoint head: `3d711b5549f6942c6588437678962cab27b1cbcf`

Material implementation:

- implementation commit: `d8d9387417c4e8373105e0d4c148ec49593f827e`
- type-safety fix: `4131f4ff6b10b1a89104f5164f7ce8c5202a990c`
- fail-closed projection hardening: `638b5441e39a827874c104594cce57d48cd3fc43`
- GitHub Actions run: `33910526989`

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

## 2. P6-W3 Completion

P6-W3 now closes both Workspace and Material halves.

```text
W3-01 workspace.create                        PASS
W3-02 workspace.update revision-aware        PASS
W3-03 workspace.get                           PASS
W3-04 stable Workspace ID                    PASS
W3-05 stale revision blocked/preserved       PASS
W3-06 same-key Workspace create retry        PASS

W3-07 material.feed Product Service path     PASS
W3-08 binary material upload route           PASS
W3-09 stable product material_id             PASS
W3-10 upload / parse state separation        PASS
W3-11 material.parse.get                     PASS
W3-12 material.parse.retry same Material ID  PASS
W3-13 retry logical run / attempt contract   PASS
W3-14 parsed text / evidence projection      PASS
W3-15 parse failure visible / recoverable    PASS
W3-16 configurable file-size limit           PASS
```

---

## 3. Material Contract

`lib/material-contract.ts` adds Material-specific validation on top of the generic Product Contract.

### material.feed

Requires:

```text
workspace_id
idempotency_key
payload.material_id
payload.entity_id, when present, must equal material_id
```

The Product API derives the expected Material entity ID and rejects an upstream identity mismatch before browser projection.

### material.parse.get

Requires:

```text
workspace_id
payload.material_id
```

Successful state reads preserve:

```text
material identity
revision
updated_at
parse state
parsed text
evidence
trace_id
```

### material.parse.retry

Requires:

```text
workspace_id
idempotency_key
payload.material_id
optional base_revision must be a positive safe integer
```

The retry key includes Material identity and the known base revision. A retry therefore stays attached to one logical Material and one revision context.

---

## 4. Binary Upload Contract

`/api/material-upload` now forwards:

```text
product=awkn-marketing
operation=material.upload
request_id
workspace_id
material_id
idempotency_key
file
```

The upload route preserves the product-generated `material_id` and validates successful upstream acknowledgement before the browser accepts it.

Strict successful upload acknowledgement requires:

```text
material_id or entity_id
revision > 0
valid updated_at
valid parse_status / status
```

Contract violations fail closed before UI projection.

---

## 5. Upload and Parse State Separation

Upload transport success and parser completion are separate states.

Example:

```text
HTTP upload accepted
→ upstream response ok=true
→ parse_status=failed
→ product keeps the upload acknowledgement
→ Material state becomes failed
→ retry remains available
```

A parser failure is therefore visible and recoverable without rewriting the upload as a transport failure.

---

## 6. Product Projection

`MaterialFeed` now keeps platform metadata needed for follow-up operations:

```text
platformStatus
platformRevision
platformUpdatedAt
platformRunId
platformTraceId
platformError
parsed content
evidence
```

Upload, status refresh and retry use strict normalization so malformed successful platform state cannot silently become a valid browser projection.

Parsed text and evidence remain available to the existing Agent material-context builder after the Material reaches `platform_parsed`.

---

## 7. Retry and Idempotency Evidence

`npm run test:p6:material` covers controlled idempotent upstream behavior.

### Binary upload

Two upload attempts with the same logical file identity generate the same deterministic upload key.

Expected controlled result:

```text
2 HTTP attempts
1 logical side effect
same material_id
```

### Parse retry

Two retry attempts with the same Material ID and base revision reuse the same retry key.

Expected controlled result:

```text
2 HTTP attempts
1 logical parse side effect
same material_id
same logical run_id
```

Real AWKN service exactly-once behavior remains a P6-W8 network integration requirement.

---

## 8. Negative Cases

Automated W3 Material coverage includes:

```text
material identity mismatch
missing material acknowledgement
missing revision in strict upload acknowledgement
parse failed
parse retry
upload duplicate
upload timeout
configured file-size overflow
revoked Workspace upload response
upstream trace preservation
```

Revoked Workspace responses remain failures and never enter a success projection. Final authorization remains owned by the AWKN upstream service.

---

## 9. CI Incident and Fixes

The first Material implementation run failed at TypeScript compile because optional Material response data was not sufficiently narrowed before reading revision and updated_at.

Commit `4131f4ff6b10b1a89104f5164f7ce8c5202a990c` fixed the type narrowing without changing the contract or reducing a Hard Gate.

A follow-up hardening commit `638b5441e39a827874c104594cce57d48cd3fc43` made browser upload / refresh / retry projection use strict Material normalization.

GitHub Actions run `33910526989` then passed all required steps.

---

## 10. Known Limits

1. Real AWKN Product Service, Material Service endpoints and credentials are external dependencies and are not available in this CI environment.
2. Controlled upstream tests prove Marketing Product key reuse and state handling. Real server-side exactly-once side-effect counting remains P6-W8 work.
3. Final Workspace authorization and concurrent revision authority remain on the AWKN platform.
4. `material.upload` is a dedicated multipart route and is intentionally outside the 19 JSON ProductOperation registry.

---

## 11. Rollback

Material-only rollback target:

```text
3d711b5549f6942c6588437678962cab27b1cbcf
```

This preserves the verified W3A Workspace component.

Full P6-W3 rollback should return to the P6-W2 verified baseline documented in `docs/P6-W2-BASELINE.md`.

---

## 12. Next

P6-W4 is now unblocked:

```text
Task Contract
→ Task Execution
→ stable execution identity
→ revision-aware upsert
→ real Agent execution adapter
→ scoped context
→ run_id / trace_id / evidence
→ timeout / retry / duplicate-run tests
```

P6-W4 must preserve all W0–W3 gates and keep P0–P5 regression tests green.
