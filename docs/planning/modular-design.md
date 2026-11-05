# Dafeiyu Modular Design

- Revision: v0.7, accompanying [plan v0.13](plan.md).
- Updated: 2026-11-05; client timezone Asia/Saigon.
- Status: Architecture proposal. Complete planning, modularity and reserved
  interfaces for deferred implementations are user requirements. Specific
  boundaries below remain proposed; native DSH integration is preferred.
- Ownership: This file owns the proposed module/dependency, lifecycle and
  maintenance contracts. [Module contracts](module-contracts.md) owns public
  operation semantics and maps them to [type skeletons](../../src/contracts/index.ts).
  The plan owns product scope and open decisions;
  [reference-study.md](reference-study.md) owns source applicability.

## Packaging And Host Direction

The [naming convention](#naming-convention) separates product presentation,
installation identity and module identifiers.
Use one installable Bundle containing independently owned native plugin entries
for Core, Memory, Life, Desktop, QQ, Bilibili, Voice and Console. Implementations
may be enabled separately; they do not require separate user installations by default.

Recommend one target-product source repository, one initial DSH distribution
bundle, and multiple addressable Cordis plugin entries within it. Keep the Mac
helper and any local memory service under the corresponding module's supervision.
Use DSH/Cordis services, dependency injection, events, configuration and cleanup.
Do not create another plugin loader, generic event bus or Agent runtime.

A business module is an ownership and contract boundary. A Cordis plugin entry
is a host activation unit. A bundle is an installation/release unit. A process
is a runtime isolation/lifetime boundary. These do not need a one-to-one mapping.
The desktop module can have Host, DSH Client and native-helper artifacts while
remaining one capability to maintain.

Modules selected for the initial release ship under one compatible bundle version, with a
single lockfile and explicit build/packed-artifact checks in the future target
repository. Extract separate packages only when independent reuse, dependency
weight or release cadence justifies the added compatibility work. Do not require
the user to assemble a compatible set of separately published packages.

The user agreed to a unified Console workbench delivered alongside Core. Its
Host/Client registrations remain a separate module in the same distribution;
Core does not require Console or webServer to run. Console delegates settings
and commands to their state owners, and Core resource/maintenance transactions
survive UI loss. Use native DSH slots and trusted Host/Client calls; exact
bindings remain subject to inspection.

The [Core/Console implementation plan](core-console-implementation.md) owns
C0–C3, workbench coverage and CC acceptance. It preserves the boundaries here
and retains the full scope. The later user request authorized Core first;
[Core runtime](../core-runtime.md) records the implementation and evidence.
Console and the other module implementations remain pending.

Contract 0.3 now distinguishes Core-owned raw dialogue continuity from extracted
Memory knowledge. Core projects bounded eligible records into logged native
context and exposes execution-scoped matter tools. Once a history eligibility
provider is registered, its loss remains blocked across restart. Caller-supplied
Memory-derived views still require the full view/use protocol; no replacement
Bank is created. See [implemented flow and limits](../core-conversation.md).

## Naming Convention

| Surface | Name / convention | Use |
| --- | --- | --- |
| Plugin title and npm package / DSH Bundle | `dsh-Chatpet` | Exact user-specified casing, including the English fallback |
| Plugin description | 大肥鱼：基于 DSH 的模块化陪伴助手。 | Existing bundle description; unchanged by this naming request |
| First component title and patch ID | `00-Core` | Component description: 插件核心模块 |
| First component module specifier | `dsh-Chatpet/00-Core` | Own exported locale metadata; separate from bundle metadata |
| Repository | `Codex-Pet` | Existing repository/directory label |
| Companion identity | 大肥鱼 / Dafeiyu | Existing character identity; independent of plugin title |
| Internal APIs, data and persisted formats | Existing `petCore`, `pet/…`, `pet_matter_…`, `codex-pet.…` and `~/.dsh/codex-pet/core/` | Retained for compatibility and identity continuity |

The user specified the plugin/package and first component names on 2026-11-05.
Keep the README unchanged for a later user-directed update. Bundle and component
metadata use separate exported locale directories, including the English fallback.
No naming rule for additional components has been selected. Historical snapshots,
upstream names and the originating `dsh-dafeiyu` planning ID retain their spelling.

The installation rename replaces the previous `codex-pet` bundle; it must not
activate a second Core writer. Preserve the configured identity, data directory,
provider/model route and existing user patch. Other installation/data/format ID
changes require an explicit compatibility decision.

## Module Responsibilities

The labels are proposed logical names, not registered package/service IDs.

| Module | Owns | Required collaborators and boundaries |
| --- | --- | --- |
| Core and DSH adapter | Real native execution, workspace/identity bindings, admission, actual outcomes and necessary reconciliation; existing optional commitment APIs remain subject to product need | Reuse DSH execution/session evidence. CoreService, ExecutionPort, ResourceService and MaintenanceService retain explicit ownership, but their existing implementations do not make every proposed feature mandatory. No QQ, Bilibili or desktop implementation import is needed to start. |
| Memory | Evidence mirror and source eligibility revisions; temporal claims; view/dependency validation and use leases; correction/withdrawal; derivations and Bank migrations | Core owns immutable originals; Memory alone owns mutable memory/source eligibility and withdrawal guards. Mnemosyne can be an implementation behind this contract. |
| Life | Self-chosen pursuits, next check-in, review, curiosity and reflection proposals | Core is the only dispatch/contact gate. Memory is accessed through its service. No independent model client or timer may bypass common controls. |
| Desktop | Pet/body actions, chat transport, native-helper lifetime and presentation state | Core supplies conversation and real activity state. UI never writes memory or owns a second conversation model. Native helper protocol is versioned. |
| Room view, optional Desktop sub-capability | Scene/entity presentation and interaction through the same body boundary | Desktop remains the sole body/world writer. No second persona, scheduler or memory. Rendering/world content may be deferred while its interface is planned now. |
| QQ | Gateway connection, explicit owner-account mapping, incoming normalization and transport receipts | Core supplies reply/contact intent. Gateway is external transport; no own persona/memory/scheduler. SDK is optional and loaded only when enabled. |
| Bilibili | Discovery/read capability, evidence/coverage and bounded reader integration | Core dispatches authorized work; Life or an owner request supplies its purpose. No hidden auto-browse loop, social writes or second memory authority. |
| Voice | Shared ASR/TTS adapters, profile revisions, readiness and bounded audio-job/cancel state | Core owns admission/conversation/resources; Desktop owns devices/playback; QQ owns media transport. Detailed contract/types pending outcome discussion. |
| DSH console | Unified localized workbench: overview, Core settings, matters/activity, all module entries, resources and maintenance | Client of Core-owned maintenance and each owner's application operations. No private backup/restore ledger; missing optional modules remain visible without SDK activation. |
| Shared contracts library | Public domain types, interface/error/version definitions and pure validation | Compile-time/runtime support, not a separately running plugin. No service, filesystem, timer or secret side effects at import. |

If assistance commitments are retained as a product feature, their existing
Core ownership does not authorize separate writers. They are not required for
ordinary conversation or real execution. The user explicitly rejected deriving
mandatory features from the existing matter ledger or workbench. Memory owns
long-term knowledge; the bound Repo owns persona, user profile and configuration.
Association/attention experiments belong behind Memory's recall boundary;
curiosity candidates belong behind Life's proposal boundary. The whitepaper's
full graph/neuro-modulation stack is not a mandatory module set.

## Complete Contracts And Deferred Implementation

The seven baseline modules have public contract skeletons, including deferred
implementations. Voice is the eighth confirmed module shared by Desktop and QQ;
its detailed public types, capability/event additions and compile examples
remain a Stage 0 gap after [outcome/reference discussion](voice.md), before any
Voice implementation. Voice owns speech configuration/job metadata and state
maintenance; Core owns audio resources and maintenance coordination.
Desktop/QQ text functions remain available without Voice. Capture, synthesis,
playback, Agent execution and QQ delivery have separate cancellation/outcome
states. Derived audio follows Memory eligibility/use controls.

[Module contracts](module-contracts.md) records the
operation catalogue, producers/consumers, error and recovery semantics, and
extension slots; `src/contracts/` contains only the corresponding TypeScript
interfaces. Core's execution adapter and assistance commitments are included.

All module boundaries must specify inputs/results, actor/scope, revisions,
idempotency, cancellation/uncertain outcomes, data ownership, lifecycle and
compatibility. Exact installed SDK mappings stay behind the execution adapter
and are verified separately; that does not postpone the product-facing contract.

The capability projection distinguishes `not_implemented`, `disabled`,
`initializing`, `ready`, `degraded`, `unavailable`, `incompatible` and `stopping`.
An absent provider is visible and rejects unsupported operations without side
effects. No empty provider reports successful work or imports an optional SDK to
satisfy a placeholder. Core/other healthy entrances continue according to the
degradation policy below. Actual services still use native DSH/Cordis injection
and reversible effects; no product plugin registry/loader is implemented here.

Adding a deferred provider later binds it to the documented contract, its owned
store and compatibility gates. It must pass behavioral checks before becoming
ready; compile coverage of a placeholder cannot satisfy that gate. Never create
a replacement Bank, identity or independent model client to bypass absence.

## Dependencies And Public Contracts

```mermaid
flowchart BT
  Memory[Memory provider] --> Core[Core services and DSH adapter]
  Life[Life and reflection] --> Core
  Life --> Memory
  Desktop[Desktop adapter and helper] --> Core
  QQ[QQ channel] --> Core
  Bili[Bilibili capability] --> Core
  Voice[Shared Voice capability] --> Core
  Desktop -. optional voice .-> Voice
  QQ -. optional voice .-> Voice
  Console[DSH console] --> Core
  Core --> DSH[DSH host services]
```

Solid arrows mean declared service dependence, not direct imports or call
direction. Dotted Voice edges are optional capability consumption; losing Voice
must not deactivate Desktop/QQ text functions.
Providers register capabilities with Core; Core does not depend on them to start.
Life waits for its required memory service. The console observes optional services
reactively. Shared contracts are an acyclic library dependency of each module.

Core resources and maintenance are internal service facets, not extra module
activation dependencies. Core registers base infrastructure before optional
Memory; derived resource use consults Memory only when needed, without a required
Core-to-Memory injection. Missing Memory blocks derived disclosure/restore work,
not unrelated Core startup. Cross-module calls must not hold a provider's store
transaction/lock while awaiting another provider. Commit with expected revisions
after external work, so Core resource calls and Memory exports do not deadlock.

Use service calls for requests needing a result; use typed events for observations
and notifications. Cordis events handle live coordination. Durable messages,
activity intents, receipts and memory work use the owning store/outbox and stable
IDs; an emitted event is not proof that a consumer processed or persisted it.

Public operations need explicit input, result/error, scope, cancellation,
idempotency and compatibility semantics. Cover at least:

- Attributed incoming message and conversation result, with source/actor/channel.
- Memory observation, recall/context result, change proposal and committed result.
- Activity proposal, admitted execution, checkpoint/cancel and outcome receipt.
- Proactive contact intent, selected channel and transport delivery outcome.
- Body command, accepted/started/completed outcome and current presentation snapshot.
- Health/configuration operations shared by tools and UI.

Separate internal contract version, persisted schema version, helper protocol and
external API version from the initial bundle release version. A required mismatch
blocks that capability with a clear reason. No fallback to another companion,
session, Bank or gateway identity. Do not infer compatibility from matching names.

## Data, Context And Authority

Each durable record has one writer and schema/migration owner. Core owns product
identity, conversation presentation, admitted activity/commitment and delivery
coordination records. Life owns its proposals and review state; Memory owns
evidence/judgments and withdrawal state; a channel owns transport details. Link
them through stable source, request and receipt IDs. Other modules use public
operations or rebuildable views, not private tables or another module's files.

| Cross-module record | Single authority | Boundary |
| --- | --- | --- |
| Original source payload | Core | Immutable ID/body; scoped processing or explicit owner audit |
| Source eligibility and evidence mirror | Memory | Version/tombstone queries through inspectSource; no mutable fact writes in Core |
| Derived view and permitted use | Memory | Exact material and dependency stamp, bounded lease; UI/adapter cannot rely on notifications alone |
| Delivery target and attempt | Core | Fixed binding revision/account/recipient; QQ owns transport evidence tied to that exact attempt |
| Artifact catalogue, bytes and retention | Core resources | Modules own holder references, never another module's files |
| Backup/restore intent and step ledger | Core maintenance | Survives Console disable and import of Core companion-domain state |

The Core operational ledger, resource/backup catalogue and authoritative actual
execution/delivery reconciliation receipts are outside the companion payload
that a restore replaces. Restored pending intents reconcile against retained
receipts and host/transport evidence before any dispatch. Missing evidence stays
unknown rather than replaying an old send. Each provider still owns its domain
snapshot format and import transaction; restoring an old Memory snapshot first
preserves/merges current withdrawal guards and creates a new eligibility epoch.

DSH remains authoritative for native execution/session events. Reuse committed
events and supported projections; do not append new unrecognized event types or
replace global prompt/compaction behavior. Model-visible context must enter via
supported logged mechanisms so resume/replay retains its provenance. The exact
installed APIs require live inspection before implementation.

A selected separate memory service owns its Bank; the adapter does not write its
SQLite database directly. Cross-store commits use durable, idempotent work and
reconciliation. Source correction/withdrawal invalidates derived recall and views
through the owning API. Transport retry cannot create a second memory source.

A Cordis service dependency is not an access-control sandbox. Host plugins share
the host process and execute with host-level capabilities. Declare trust and tool
exposure explicitly; enforce permission/budget/state changes in code. An actual
process, filesystem or credential boundary needs separate implementation evidence.
Secrets, paths, account IDs, ports and run bindings come from trusted configuration.

## Activation, Failure And Stop

DSH loads the bundle's declared rows. Dependencies activate through services;
subscriptions, tools, UI registrations, timers and child handles belong to the
module's effect lifecycle. Do not use hidden module-import side effects or manual
boot delays. Stopping/disabling a capability stops new admission, checkpoints or
cancels in-flight work as supported, drains/records uncertain outcomes, removes
registrations and releases owned resources. It does not erase durable state.

| Capability unavailable or disabled | Intended degraded behavior |
| --- | --- |
| Core | Dependent product capabilities stop; no orphaned helper or independent life loop continues. |
| Memory | Dependent recall/writes and derived disclosure pause. Conversation may continue only with context free of unverifiable memory; rebind/reproject if supported, otherwise report the blocked state. Raw new owner input does not authorize reinjection of old sources. Sources wait durably; no replacement Bank. |
| Life | Owner conversation, assistance and memory remain usable; autonomous check-ins/review cease. |
| Desktop | QQ/DSH entrances remain available when otherwise healthy; restarting the helper restores a snapshot without replaying stale decorations. |
| QQ | Desktop/DSH remain usable; uncertain sends remain uncertain and are not blindly resent. |
| Bilibili | Browsing-dependent activities wait, fail or choose rest; other conversation/assistance continues. |
| Voice | Audio work stops or reconciles; Desktop/QQ text functions remain available. No late playback or independent speech runtime fallback. |
| DSH console | Core-owned resources and maintenance transactions remain available through their application ports; UI loss does not change writers or cancel/erase the restore ledger. |

These are product requirements to verify, not guarantees provided automatically
by Cordis. A guarded operation failure can degrade locally; an in-process fatal
error can still affect the host. Use child processes only for a concrete native
capability, dependency or fault-isolation need, with health and lifetime handling.
No module continues autonomous model/network work after the product/DSH stop.

## Upgrade And Maintenance

Declare a tested DSH version range, host platform, dependencies and display
resources. Use the supported Plugin Manager bundle workflow at implementation
time. Keep agent behavior scoped to the companion/workspace even though package
installation is profile-wide. Do not edit DSH application files or replace its
bundled dependencies; the current planning work changes neither.

Do not promise code hot-swapping: some configuration changes can apply live;
replacing installed JavaScript or native binaries may require restart. Stop and
drain affected work, back up owned state, run explicit schema migrations and
verify readiness before resuming. Never run old and new writers on one Bank.
Code rollback is separate from data rollback; incompatible schema changes need
a tested recovery path and must preserve later unrelated user data.

Disabling, uninstalling and erasing data are separate operations. Retain personal
memory/history by default on module removal, explain what stopped, and make data
deletion a separate user-visible operation. Removing the full bundle must stop
owned processes without silently deleting or migrating the companion's data.

Before claiming modularity, verify: optional SDK absence; disabling each module;
dependency loss/recovery; duplicate events; interrupted migration; restart between
intent and receipt; incompatible provider/helper versions; memory-provider
replacement with correction/forgetting intact; and no residual timer, listener,
tool, process or outbound retry after stop. Also check the installed/packed file
list so a linked checkout cannot hide missing release artifacts.

## Decision Status

Complete planning, modularity and reserved interfaces are confirmed requirements.
Native DSH plugin integration is the
preferred route and has documentary support. One bundle, the proposed plugin
boundaries and failure policies are recommendations for this planning revision.
The installed DSH 0.2.1-rc.5 documentation and official sources were inspected;
no live API inspection, activation toggle, package build, profile mutation,
account connection or modularity test was performed. The Codex-Pet target now
exists and carries draft public type signatures. Memory provider, Mac toolkit,
native SDK mappings and runtime conformance remain open. The prior v0.1 document
is preserved in [its snapshot](snapshots/modular-design-v0.1.md).
