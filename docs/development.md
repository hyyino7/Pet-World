# Development Guide

大肥鱼: a modular, DSH-backed companion for the selected Mac.
The product covers desktop presence, ordinary QQ conversation, memory,
autonomous life/Bilibili and shared Voice; settings use existing DSH surfaces,
with a custom workbench only for a demonstrated need.
Plugin/package name: `dsh-Chatpet`; first component: `00-Core`. See the
[naming convention](planning/modular-design.md#naming-convention) for identifier roles.

## Start Here

Read [the current handover](handover/README.md) for the active task,
installation snapshot, constraints and next action. It owns execution status;
existing code, passing checks and design proposals do not establish acceptance.
Use [AGENTS.md](../AGENTS.md) for collaboration rules.

## Task Navigation

| Task | Read |
| --- | --- |
| Change existing Core behavior | [Runtime and code entries](core-runtime.md); [flow/reuse/evidence](core-conversation.md) when relevant |
| Change product scope, architecture or interfaces | Relevant records in the [planning index](planning/README.md); [contract types](../src/contracts/index.ts) |
| Find reusable implementations | [Current reuse review](planning/reuse-review.md), then [reference index](../references/INDEX.md), then only relevant source files; [manifest](../references/manifest.json) and [notices](../THIRD_PARTY_NOTICES.md) retain provenance |
| Restore tools/dependencies or inspect setup | [Setup](setup.md); [reference handling](../references/README.md) |

## Local Commands

```sh
source ./scripts/env.sh
```

Choose checks for the change: `pnpm run check:types` for TypeScript contracts,
`pnpm test` for affected Core behavior, and `pnpm run test:native` for native DSH
integration changes. Detailed coverage and live-model commands belong to the
[runtime record](core-runtime.md#verify). `pnpm run check:env` diagnoses
setup/reference problems; it is not required before every edit.
Documentation-only edits need affected local-link checks and `git diff --check`.

Ignored tools, dependencies, reference checkouts and caches are local assets;
see setup before removing or recreating them.
