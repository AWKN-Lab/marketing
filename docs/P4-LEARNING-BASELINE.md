# P4 Learning Baseline

## Status

`DEVELOPMENT_VERIFIED`

- baseline commit: `31ff83a5b2baed9d3cb1df0e19eb93098b580fb7`
- GitHub Actions run: `33623799799`

Verified:

```text
npm run typecheck  ✓
npm run test:p0    ✓
npm run build      ✓
```

## Product-layer capability

P4 closes the asynchronous Daily Learning lifecycle at the marketing product layer:

```text
learning.run
→ queued / running
→ global AppShell poller
→ learning.run.get
→ completed / failed
→ real Signal merge
→ Today / Workspace refresh
```

Failed runs can be restarted through `learning.run.retry`. A Workspace with an unfinished run cannot submit another run accidentally.

The persistent-state layer now notifies other components in the same browser when a stored value changes, so a global poller can update Today and Workspace without a full reload.

## Boundary

This baseline verifies the marketing product contract, state normalization, polling, retry behavior, local persistence coordination, automated acceptance assertions, TypeScript and production build.

It does **not** claim that the AWKN upstream learning service is deployed or that scheduled execution is implemented in this repository.

The repository still does not implement Agent Runtime, AWKN Engine, Memory OS, MCP, general schedulers, search infrastructure or generic learning infrastructure.
