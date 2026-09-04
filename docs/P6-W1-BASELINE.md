# P6-W1 Product Contract Verification Baseline

## Status

`DEVELOPMENT_VERIFIED`

## Scope

P6-W1 only: Product Contract foundation for the 19 Marketing ProductOperations. This package hardens operation metadata, request requirements, persistent/async response envelopes, stable error taxonomy, upstream response normalization, and table-driven Contract verification. It does not claim real AWKN network integration.

## Baseline

- Previous verified package: `docs/P6-W0-BASELINE.md`
- W0 verified head: `7b8d4156595750a24d3d141f5cf6e36f06174994`
- W1 implementation commit: `3d0ee75e05df2575156bcda7b4e00d894256cc77`
- GitHub Actions passing run: `33901549136`

## W1 Tasks

```text
W1-01 19-operation metadata registry                      DONE
W1-02 read / write / append / async classification        DONE
W1-03 per-operation idempotency requirement               DONE
W1-04 required workspace_id / task_id metadata            DONE
W1-05 persistent Ack requires entity_id                   DONE
W1-06 persistent Ack requires revision                    DONE
W1-07 persistent Ack requires updated_at                  DONE
W1-08 validateStableEntityAck() hardened                  DONE
W1-09 revision validity check                             DONE
W1-10 stable upstream Error Taxonomy                      DONE
W1-11 unknown operation → UNSUPPORTED_OPERATION           DONE
W1-12 malformed upstream response normalization           DONE
W1-13 trace_id preservation / fallback                    DONE
W1-14 19-operation table-driven Contract Test             DONE
```

## Operation Registry

Every ProductOperation now declares:

```text
kind
idempotency
workspaceId requirement
taskId requirement
response contract
```

Response contracts are explicit:

```text
entity-ack
entity-read
entity-state
async-ack
async-read
```

Persistent entity envelopes require:

```text
entity_id
revision > 0 integer
updated_at valid timestamp
```

Async envelopes additionally require:

```text
run_id
status = queued | running | completed | failed
```

## Error Taxonomy

The stable upstream-facing taxonomy is:

```text
AUTH_REQUIRED
FORBIDDEN
WORKSPACE_REVOKED
NOT_FOUND
VALIDATION_ERROR
UNSUPPORTED_OPERATION
MISSING_ENTITY_ACK
IDENTITY_MISMATCH
REVISION_CONFLICT
INVALID_REVISION
IDEMPOTENCY_CONFLICT
UPSTREAM_UNAVAILABLE
UPSTREAM_TIMEOUT
RATE_LIMITED
RUN_FAILED
UNKNOWN_UPSTREAM_ERROR
```

`PLATFORM_NOT_CONFIGURED` remains a local adapter sentinel so existing P0–P5 local-only behavior is preserved when no Product API endpoint is configured. It is not part of the real AWKN upstream error taxonomy.

## Route Behavior

`/api/product` now:

1. rejects malformed JSON as `VALIDATION_ERROR`;
2. rejects unknown operations as `UNSUPPORTED_OPERATION`;
3. preserves the existing local `PLATFORM_NOT_CONFIGURED` path before strict real-platform validation;
4. validates metadata-required IDs and idempotency before calling a configured upstream;
5. normalizes malformed/unknown upstream failures to stable error codes;
6. preserves upstream `trace_id` or trace headers when available;
7. validates successful upstream response envelopes against the operation registry.

This ordering protects the existing local-first baseline while making platform mode fail closed on Contract violations.

## Verification Result

GitHub Actions run `33901549136`:

```text
npm install          PASS
npm run typecheck    PASS
npm run test:p0      PASS
npm run test:p6      PASS
npm run build        PASS
```

The W1 Contract suite now verifies:

- exactly 19 unique registered operations;
- metadata coverage for all 19;
- valid request acceptance for all 19;
- required workspace/task/idempotency fields table-wide;
- declared success response contract for all 19;
- stable entity identity + revision + updated_at;
- all 16 stable error codes;
- unknown operation behavior;
- malformed upstream envelope normalization;
- trace fallback preservation;
- async run identity and status validation.

No P0–P5 test was removed or weakened.

## Changed Files

```text
lib/product-contract.ts
app/api/product/route.ts
scripts/p6-contract.ts
docs/P6-W1-BASELINE.md
```

## Known Limitations

1. Real AWKN Product Service has not been called in W1. Network Contract evidence remains P6-W8.
2. Operation payload bodies are still generic at the shared envelope layer. Workspace, Material, Task, Feedback, Outcome, Learning, and Evolution payload-specific schemas are hardened in their owning P6 work packages.
3. Generic route normalization validates returned entity identity presence. Exact expected-ID matching remains strongest at call sites that already know the product-generated stable ID through `validateStableEntityAck()`; W3–W6 extend exact identity checks per entity flow.
4. Idempotency metadata is now mandatory for platform writes, while side-effect-count verification against a real service belongs to W3–W8.
5. PR #2 remains stacked on docs PR #1 until the documentation branch is merged/rebased.

## Rollback

W1 can roll back to the W0 verified head:

```text
7b8d4156595750a24d3d141f5cf6e36f06174994
```

P5 code behavior baseline remains:

```text
cf806a5408ed283ef33d5be7c01b28e7ea42e826
```

## Next

`P6-W2 Real Session & Permission`

Start with Session error normalization and platform-mode fail-closed behavior. Preserve the P5 Tenant / Actor / Capability / Workspace Grant boundary. Do not enter P6-W3 until W2 Hard Gates are green.
