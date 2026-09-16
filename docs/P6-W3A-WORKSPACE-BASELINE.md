# P6-W3A Workspace Component Verified Baseline

## 1. Status

`COMPONENT_VERIFIED`

- starting commit: `2017c0a18c8be01555bd978fe8b6b3a4834852a1`
- implementation commit: `16554bb3e702b7b4b4f3ab5f7af3bd4a02613da8`
- type-safety fix: `a468b77a9b9a68fb823d7306173fb8ea8670028c`
- GitHub Actions run: `33906714979`

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

## 2. Scope

This checkpoint completes the Workspace half of P6-W3. Material remains active work and P6-W3 as a whole is not closed yet.

Completed Workspace items:

```text
W3-01 workspace.create real Product API path hardened
W3-02 workspace.update revision-aware request contract
W3-03 workspace.get real Product API read contract
W3-04 stable Workspace ID checked server-side
W3-05 stale base revision is required and REVISION_CONFLICT is preserved
W3-06 same logical create key is covered by controlled idempotent-upstream test
```

---

## 3. Workspace Contract

`lib/workspace-contract.ts` adds product-specific validation on top of the generic 19-operation contract.

### workspace.create

Requires:

```text
workspace_id
idempotency_key
payload.workspace
payload.workspace.id == workspace_id
```

### workspace.update

Requires:

```text
workspace_id
idempotency_key
payload.workspace
payload.workspace.id == workspace_id
payload.base_revision > 0 and safe integer
```

### workspace.get

Requires:

```text
workspace_id
payload.entity_id
payload.entity_id == workspace_id
```

Identity mismatches fail with `IDENTITY_MISMATCH`. Invalid update base revision fails with `INVALID_REVISION` before the request reaches the upstream Product Service.

---

## 4. Server-side Ack Identity

`app/api/product/route.ts` now derives the expected Workspace entity ID for Workspace operations and passes it into `normalizeProductResponseContract()`.

Therefore a successful upstream response with a different Workspace ID is rejected before product state accepts the response.

The route continues to preserve:

- `revision`
- `updated_at`
- stable error codes
- `trace_id`
- upstream `REVISION_CONFLICT`

---

## 5. Idempotency Evidence

`npm run test:p6:workspace` sends two `workspace.create` requests with different `request_id` values and the same logical `idempotency_key` to a controlled idempotent upstream.

Expected result:

```text
2 HTTP attempts
1 logical side effect
same Workspace identity
```

This verifies the Marketing Product request behavior and retry-key reuse contract. Real AWKN Product Service exactly-once behavior still requires P6-W8 network integration credentials.

---

## 6. Revision Evidence

Workspace update validation blocks missing, zero, negative and fractional `base_revision` values.

A controlled upstream `REVISION_CONFLICT` response is preserved through `/api/product`, including its `trace_id`, so stale writes cannot be converted into a success state by the Marketing adapter.

Existing P2 reconcile behavior remains the client-side conflict-resolution mechanism.

---

## 7. CI Incident and Fix

The first implementation run failed at TypeScript compile because the synthetic test helper inferred `product` as `string` instead of the literal `"awkn-marketing"`.

The helper was fixed with a literal type assertion. Production code and Hard Gates were unchanged.

Final GitHub Actions run `33906714979` passed all required steps.

---

## 8. Known Limits

1. Real AWKN Product Service endpoint and credentials are not available in this CI environment.
2. Real server-side duplicate side-effect counting remains a P6-W8 integration requirement.
3. The AWKN Product Service remains the authority for concurrent revision checks and final write authorization.
4. P6-W3 Material items W3-07 through W3-16 are still pending.

---

## 9. Rollback

If Workspace contract hardening causes regression, roll back to:

```text
2017c0a18c8be01555bd978fe8b6b3a4834852a1
```

This keeps P6-W0 through P6-W2 intact.

---

## 10. Next

Continue the second half of P6-W3:

```text
Material
→ material.feed
→ binary upload
→ stable material_id
→ parse status
→ parse retry / logical attempt
→ parsed text / evidence projection
→ failure recovery
→ file-size limit
→ revoked Workspace negative path
```

P6-W3 closes only after the Material component passes its tests and the combined Workspace + Material Hard Gate remains green.
