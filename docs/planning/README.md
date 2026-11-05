# Planning Index

This index routes design work; it is not a required reading list for every change.
[The handover](../handover/README.md) owns current task/status. The complete product
scope remains; existing architecture and implementation are subject to reconstruction.

| Subject | Owning record |
| --- | --- |
| Product outcomes, boundaries and open product choices | [Product plan](plan.md) |
| Module dependencies, ownership and lifecycle | [Modular design](modular-design.md) |
| Public operations and integration semantics | [Module contracts](module-contracts.md); [type skeletons](../../src/contracts/index.ts) |
| Proposed sequence and release cases | [Development plan](development-plan.md) |
| Ten Core duties, Console, C0–C3 and CC cases | [Core/Console proposal](core-console-implementation.md) |
| Shared Desktop/QQ speech outcomes and open choices | [Voice discussion](voice.md) |
| Source applicability and limitations | [Reference study](reference-study.md) |
| 32-project module/reuse map | [Reference map](reference-module-map.md); exact commits/licenses in [manifest](../../references/manifest.json) |

Complete planning and reserved interfaces are requirements; particular boundaries,
providers and signatures remain reviewable. Contract 0.3 covers seven baseline
ports; Voice IDs are reserved but its detailed port remains a gap. Runtime behavior
and dated checks belong to [Core runtime](../core-runtime.md) and
[flow/evidence](../core-conversation.md), not these proposals.

## History

Original planning material came from the authorized PM Advisor engagement at
`/Users/hy-yin/Developer/Codex Repo/Codex-PM Advisor/projects/dsh-dafeiyu/` on
2026-11-04. Named files under `snapshots/`, including [plan v0.7](snapshots/plan-v0.7.md)
and [module design v0.1](snapshots/modular-design-v0.1.md), preserve original bytes.
Their relative links reflect original locations; use this index for active navigation.
Read snapshots only for a specific historical question.
