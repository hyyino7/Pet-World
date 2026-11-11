# Core Completion Record

- Goal: Complete the user-authorized Core requirements, including the accepted
  repository-backed workspace and native DSH interaction design.
- Started: 2026-11-05, Asia/Ho_Chi_Minh.
- Status: The user resumed work under the P1–P3 batch on 2026-11-06.
  The historical inventory below is not the active batch acceptance checklist.
  Current package evidence and remaining owner acceptance are maintained in the
  [runtime record](core-runtime.md#current-delivery-evidence-2026-11-06) and
  [handover](handover/README.md#current-planning-handoff). No whole-Core or M1
  completion is claimed.
- Product responsibilities and CC01–CC20: [owning plan](planning/core-console-implementation.md).

## Latest User Scope Correction

Core governs real execution; Memory owns long-term memory; the Repo stores
persona, user profile and configuration. The existing ledger/workbench cannot
establish a requirement by its own existence. Ordinary native conversation,
tools, stop and recovery must not depend on creating a matter or using a custom
workbench. Preserve actual execution controls and necessary receipts; reuse DSH
evidence where sufficient. No fake successful execution or replacement memory.

The earlier table below is an implementation inventory under reassessment, not
an unconditional acceptance checklist. Matter management, a unified workbench
and STATE.md are explicitly removed as mandatory Core completion gates. Their
existing tests prove those implementations only. Existing data remains intact;
source-only workbench expansion is suspended. STATE generation is removed in
source; format-1 legacy manifests migrate without altering or recreating retired
files. Settings no longer query the optional workbench, its unreleased tab/polling
was removed, and native context no longer automatically recalls the matter ledger.
The cleanup is included in the installed P1–P3 candidate; current archive and
verification are linked above. Historical desktop observations do not accept
the revised personal UI flow.

Historical cleanup verification before the earlier pause: `check:types` and client JavaScript syntax
passed; `pnpm test` passed 32 tests including legacy manifest retirement and
owner-edited/missing STATE preservation. `test:native-workspace` passed with
eight local fixture model calls and no external model request; it covers normal
conversation without matter creation/automatic ledger recall, no generated STATE,
native stop/reconcile/resume and workspace isolation. This does not accept the
entire Core goal. No installation followed that earlier checkpoint. The later P1–P3 installation
is recorded separately; no commit or user-data deletion is implied.

## Requirement And Evidence Matrix

| Requirement | Required result | Current evidence / remaining work |
| --- | --- | --- |
| Repository lifecycle | Five profile/configuration files, portable identity, idempotent initialization, existing-content preservation, explicit rebind and failures | Five-file initialization and legacy STATE retirement tests pass; cleanup installed; package-scoped configuration/rebind evidence is in the runtime record |
| File authority | SOUL/USER/core configuration loaded from files; UI and manual edits share one source; stale edit refusal; bounded reads; no generated task-summary file | Workspace and native fixture checks pass; desktop profile edit acceptance remains |
| Native entrance | Binding automatically activates Core in ordinary native sessions; actual DSH input/output/tools/stop; exact workspace scope; no extra mode or hidden duplicate model turn | Installed-runtime fixture passes including resume/cancel/isolation; desktop Standard session has one real turn with list/create/progress/finish, confirmed in SQLite and STATE; complete lifecycle audit remains |
| Identity / conversation | Stable identity across multiple native conversations/restart; attributed/deduplicated records and context recovery | Actual native/Memory join implemented and fixture/live evidence linked above; revised owner acceptance remains open |
| Optional matters / progress / results | Reassess against a concrete user need; not required for ordinary conversation or Core execution | Existing tests and desktop evidence retained; no further workbench-driven expansion |
| Coordination / allowances | Owner priority; background admission, finite limits, revoke/cancel/reconcile and honest capability status | Existing owner subset; full coordination open |
| Contact / delivery | Fixed target and binding revision; durable attempts; confirmed/failed/unknown and no blind replay | Existing Core boundaries; adapters/visible operations open |
| Resources | Scoped upload/read/integrity/holders/retention/GC including eligible derived content | Existing subset; full audit open |
| Maintenance | Complete Core snapshot/resource coverage, persistent jobs, authorized guarded restore and protected-ledger preservation | Existing partial checkpoint only; open |
| Providers / lifecycle | Explicit optional interfaces; missing modules honest; owned native hooks/tools/effects stop cleanly | Existing subset; full lifecycle audit open |
| Necessary settings / diagnostics | Bind/configure/use Core and inspect actual execution through native DSH; custom workbench is optional | Identity/policy/preferences/Repo implemented; unreleased workbench code is suspended and is not a completion gate |
| Shipping / acceptance | Packed install, preserved data/config/README, actual native critical path, source-backed evidence, requirement-by-requirement audit | Current P1–P3 archive installed and scoped integration verified; personal UI and owner usefulness acceptance remain open |

Memory, Life, Desktop, QQ, Bilibili and Voice retain their contracts and integration
obligations. Their absence cannot be represented as ready. Core-only evidence
cannot accept a real external-provider join or whole-product release case.

## Accepted Workspace Layout

First initialization creates `.chatpet/README.md`, `manifest.json`, `SOUL.md`,
`USER.md` and `core.json`. STATE.md is retired. Existing project instructions
and README remain untouched; successful initialization creates a native root
AGENTS.md entry only when absent. Memory owns its later memory files and source-use
protocol; Core must not fabricate a replacement Bank.

SOUL/USER/core configuration are file-authoritative once initialized. Core retains
operational records in `.chatpet/data/core/` under the bound storage Repo and
maintains validated cached state. Memory owns `.chatpet/data/memory/`; native
DSH credentials and session logs remain host-owned outside the Repo.
The native loader checks exact bound workspace membership before loading
bounded content through supported DSH prompt/context mechanisms. Changes take
 effect at an explicit request boundary. Ordinary DSH sessions remain ordinary.

## Current Work

The active batch is P1–P3, not expansion of the historical whole-Core inventory.
Required package fixtures and scoped installed/live integration have evidence in
the owning runtime record. The previous experience was rejected by the owner;
the revised candidate still needs owner-completed native chat, cross-session
recall, correction/forgetting and supplied-document comparison. Do not substitute
synthetic test success for that decision or resume workbench expansion. Remaining
whole-product responsibilities belong to their later planned packages.
