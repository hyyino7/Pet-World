# Product Module Contracts

- Revision: v0.3, updated 2026-11-05, Asia/Ho_Chi_Minh.
- Status: Contract 0.3 adds Core turn/progress reads and direct-dialogue semantics; Voice IDs are reserved, detailed Voice port pending.
- Confirmed requirement: Plan the whole product and all module boundaries now;
  module implementation may be deferred, but its integration contract must exist.
- Current applicability: This is the retained contract 0.3 baseline. The
  [current plan](plan.md) owns P1–P10, reuse decisions and P8a's shared Voice design
  reservation. Reconcile only affected interfaces before their consumers change;
  no signatures or runtime controls are implemented by this synchronization.
- Type entry point: [src/contracts/index.ts](../../src/contracts/index.ts).

This file records existing public operation semantics and deferred-module seams.
[Modular design](modular-design.md) retains the earlier lifecycle proposal;
[the product plan](plan.md) owns current boundaries and implementation gates. Types contain
no provider implementations, SDK bindings, storage, renderer or model client.
Their existence and compilation do not establish runtime enforcement.

The [Core/Console implementation proposal](core-console-implementation.md) maps
these ports to ten Core duties, the unified owner-delegated workbench and
planned C0–C3/CC acceptance. [Core runtime](../core-runtime.md) records the current
implementation subset and denial paths. Contract 0.3 retains the 0.2 boundary
repairs, adds turn/progress reads and clarifies Core raw dialogue versus extracted
Memory knowledge. `CONTRACT_VERSION` is shared; Voice detailed types remain pending.
Earlier C0/CC and A15–A19 references identify the retained proposals, including
[historical development cases](snapshots/development-plan-v0.7.md). They do not
create a new all-contract preparation batch. P8a is a design reservation, not
implemented Voice types; text-only P1–P3 does not wait for Voice implementation.

## Review Repair Coverage

| Reviewed gap | Contract change | Behavioral evidence still required |
| --- | --- | --- |
| R1 Cached context/life/history eligibility | Dependency epochs/versions, exact view material, synchronous validation and bounded use leases; withheld history has no old text | A15, including lost events, active use and native-history rebind |
| R2 Mutable send target | Binding revision, connection reference, actual account and recipient fixed in each persisted attempt/receipt | A16, including old-account reconciliation and late receipts |
| R3 Unqueryable source revision | SourceStatus/inspectSource and observe acknowledgment; absent-source tombstone and blocked re-ingestion | A17, including source withdrawal before extraction |
| R4 Artifact ownership/read path | Core ResourceService owns catalogue, bytes, access and retention; producers own holders | A18, including derived access and resource restoration |
| R5 Console/restore ownership | Core MaintenanceService owns durable jobs and step permits; protected operational ledger and per-owner imports | A19, including Console loss, old backup and partial imports |

Compile-only examples cover required input/output shape and owner-port separation.
These repairs do not mark the behavioral cases passed or independent review done.

## Complete Planning, Staged Implementation

The planning set includes every confirmed product capability, the room extension
boundary, assistance commitments and maintenance. Choosing an initial flow only
orders implementation. It does not defer defining the remaining interfaces.
Voice is the eighth confirmed module, shared by Desktop and QQ. Its effects
and references are being discussed before detailed protocol/type drafting;
contract 0.3 does not yet supply its detailed port. Voice modes/release timing and additional
channels/renderers remain open choices.

| Owner / capability | Consumers and host dependencies | Interface already reserved | Implementation order / absence behavior |
| --- | --- | --- | --- |
| Core: identity, conversation, commitments, admission and delivery | All product modules; native DSH services through its adapter | `CoreService` | Foundation first; dependent product work stops if unavailable |
| Core: native execution adapter | Core dispatch; installed Agent/session/tools/context contracts | `ExecutionPort` | Validate bindings first; missing native support blocks affected execution |
| Core: resources | All producers/consumers through scoped calls | `ResourceService` | Owns artifact catalogue, bytes, access and retention; no module opens another module's files |
| Core: maintenance | Console/tools are clients; state owners supply snapshot/import ports | `MaintenanceService` | Owns durable export/backup/restore transactions, independently of Console availability |
| Memory | Core and Life through scoped operations; one selected provider | `MemoryService` | Integrate before durable autonomous learning; accepted observations wait if absent |
| Life | Core and Memory; Bilibili/Body availability is discovered through Core | `LifeService` | May be deferred while owner chat works; no independent dispatch/timer fallback |
| Desktop presentation and body | Core, helper transport and supported renderer | `DesktopService` | May be deferred while other enabled entrances work; current state remains in Core |
| Room, Desktop sub-capability | Same Core/body identity and Desktop world writer | `RoomViewService` | Renderer/world content may be deferred; capability reports `not_implemented` |
| QQ ordinary-account transport | Core; selected gateway and explicit owner binding | `QQService`, `ChannelTransport` | May be deferred; no QQ dependency imported by Core and no replacement channel send |
| Bilibili content access | Core admission; selected read connector | `BilibiliService` | May be deferred; exploration waits or another admitted activity/rest is chosen |
| Voice (new planning scope) | Core; Desktop/QQ consume the same optional speech capability | Detailed port/types pending; see [Voice discussion](voice.md) | Absent/disabled Voice leaves healthy text functions available; no provider selected |
| DSH console | Core application ports; trusted host configuration | `ConsoleService` | Presentation/configuration facade; does not own resource or restore transactions |
| Shared support | Each module; no implementation dependencies | `ModulePort`, `ProductEvent`, common DTOs | Type-only library, not a running module or loader |

Business plugins depend on Core services; Life additionally requires Memory.
Core observes optional providers through supported host service registration.
The execution port is internal to Core. The console delegates to owners; it
does not become their data writer. The room view is not a second character,
planner, scheduler or memory authority.

[ProductServiceMap](../../src/contracts/services.ts) groups the public service
and lifecycle ports for each module. Execution, resources and maintenance follow
Core's lifecycle; they are Core-owned facets, not three additional plugins. Room
follows Desktop's. These are product aliases, not final Cordis service keys or
a runtime registry. Real providers bind through the host adapter after V1.

## Common Call And Compatibility Rules

See [common.ts](../../src/contracts/common.ts).

1. Each call has product contract version, stable request ID, companion/scope
   and attributed actor. Trusted adapters establish actor/owner bindings; passing
   a string or type-checking an object does not authenticate its sender.
2. Mutations deduplicate on companion, scope, operation and request ID. Reusing
   an ID with different input is a conflict. Retries retain identity; a new
   transport attempt is linked to the original contact intent.
3. Mutable records use expected revisions. Missing/late revisions cannot replace
   newer state. Semantic meaning is proposed by the model; owner, source, scope,
   transitions and revisions are checked by deterministic application code.
4. `Result.ok` means that the returned value accurately describes the operation.
   `accepted`, `running`, `cancel_requested`, `completed` and `unknown` are
   distinct states. An accepted run, queued write or gateway confirmation is
   not proof of a completed commitment, understanding or human receipt.
5. `NOT_IMPLEMENTED`, `DISABLED` and incompatible/invalid admission reject with
   no side effect. `OUTCOME_UNKNOWN` requires reconciliation. A timeout or local
   cancellation can coexist with partial/unknown effects; do not blindly retry.
6. `AbortSignal` and deadlines are local call controls. A bridge serializes a
   cancellation request by stable operation ID; it never serializes the signal
   object. Only an actual receipt establishes that work stopped.
7. Contract version `0.2` is a draft product boundary. Bundle version, database
   schema, helper protocol and external gateway versions remain separate. Use
   an explicit supported-version match; incompatible capabilities do not bind.
   Compatible additions are reviewed; breaking changes require a new contract
   and an explicit migration/adapter, not a silent fallback.
8. Timestamp strings, positive finite limits, identifiers, URLs and DTOs need
   runtime validation at process/tool boundaries. No machine path, account,
   credential, port, tariff or host session is hard-coded in these types.
9. Pagination cursors are owner-scoped; results enforce configured limits.
   Artifact IDs resolve through authorized storage, not arbitrary client paths.

Version 0.2 intentionally replaces the undeployed 0.1 draft: source eligibility
revisions, memory-view leases, fixed delivery targets, resource access and
Core-owned maintenance are coordinated contract changes. There are no deployed
0.1 providers or user-data migrations in this repository. Update all callers in
the same bundle; do not accept 0.1 payloads under the 0.2 version label. Helper
protocol `0.1` remains independently provisional.

### Capability Presence And Deferred Modules

The host's capability projection lists all planned capabilities even if no
provider is loaded. `not_implemented` describes absent business implementation;
`disabled` describes configured-off implementation. `unavailable` is a dependency
or operational failure; `incompatible` is a version/binding mismatch. `degraded`
reports an implemented subset. Each exposes its actual supported operations
and an observable reason. None permits simulated success.

Reserve types and documentation now; do not register an empty plugin as `ready`.
A boundary facade may reject an absent capability, but it must not start a model,
create a database, import an optional SDK or execute a no-op reported completed.
Use host dependency injection/effects for real providers. The type directory is
not a registry implementation or a new dependency-injection framework.

## Core And Native Execution

Sources: [core.ts](../../src/contracts/core.ts),
[execution.ts](../../src/contracts/execution.ts).

| Public operations | Input → output | Ownership and required behavior |
| --- | --- | --- |
| `getIdentity`, `reviseIdentity` | Scope / expected revision and editable character → stable identity | Owner-controlled character changes; no new companion on session replacement |
| `bindChannel`, `listChannelBindings`, `revokeChannelBinding` | Trusted pairing proof, transport/account association and revision → canonical owner/channel binding | Core alone owns relationship mapping; channel-local connection records reference this binding |
| `receiveMessage`, `listConversation` | Attributed channel message / bounded cursor → accepted input / presented history | Validate owner, dedupe original message, serialize state-changing owner turns; internal reports remain separate |
| `getConversationTurn`, `listCommitmentProgress` | Activity / matter ID and cursor → final reply, related state and durable progress | Eligibility applies; pending reply is not gateway confirmation |
| `recordSource`, `getSource` | Immutable attributed evidence / processing or owner-audit query → raw evidence | Core owns original product input/action records; same ID with different evidence is a conflict; normal recall cannot bypass Memory through raw-source access |
| `createCommitment`, `reviseCommitment`, `listCommitments` | Requested outcome, sources, progress and revision → durable matters | Covers agreements, comparisons and follow-ups; completion needs result evidence, independently of run completion |
| `admitActivity`, `getActivity`, `cancelActivity`, `reportActivity` | Proposal / stable activity and admission revision / receipt → actual state | Sole permission/resource/priority gate; reports only from admitted originating capability |
| `requestContact`, `getContact`, `prepareDeliveryAttempt`, `listDeliveryAttempts`, `reportDelivery` | Intent / expected revision / immutable attempt and receipt → fixed target and actual state | Persist target and attempt before send; target includes binding ID/revision, transport account and recipient; receipt cannot retarget the intent |
| `getPolicy`, `setPolicy`, `listCapabilities` | Query / owner-authorized expected revision → effective policy/status | Shared quiet/pause and finite autonomous limits; providers cannot raise their own limits |
| Execution `bind`, `start`, `inspect`, `interrupt`, `reconcile` | Valid admission, bound context and finite allowance → native execution snapshot | Adapter alone maps to native SDK; results cite actual host turns; no separate LLM or unrelated-session fallback |

An admission reference must be checked against stored scope, provider, policy,
revision and current stop state. Supplying the reference is not authorization.
Core owns generated/presented records and delivery associations; DSH owns native
logs. Generating a reply is not external delivery or proof that the owner read it.
Default replies use the originating channel. Queueing work and committing its
source/outbox intent precede dispatch; cross-store processing is reconciled.
Exact installed service keys and host cancellation guarantees remain V1 work.

Direct authenticated dialogue/current matters are Core-owned and can support
bounded continuity before extracted Memory exists. Source lineage is retained.
Once a trusted eligibility provider is registered, its loss stays blocked across
restart; tool reads expand the checked dependencies. This is not a replacement
Bank or acceptance of the full cross-process Memory lease protocol.

Memory-derived conversation uses the same view/use gate as Life and carries its
stamp. Ineligible or unverifiable history is withheld with empty parts. Privileged
audit retention does not authorize ordinary redisplay. See the implemented
[conversation flow and limits](../core-conversation.md).

`ExecutionBinding.memoryContext` retains the lineage of memory already projected
into native history. A new turn's memory stamp covers both that lineage and new
context, not only the latest recall. If corrected/withdrawn history cannot be
removed through supported host mechanisms, rebind/reproject or reject the turn;
do not keep using invalid native context. `ExecutionStartRequest` requires a
memory-use lease for memory-derived context. Lease purpose, operation, scope,
material digest, current state and expiry are checked before native admission.

## Memory

Source: [memory.ts](../../src/contracts/memory.ts).

| Public operations | Input → output | Required behavior |
| --- | --- | --- |
| `observe`, `inspectSource`, `getFence`, `inspectProcessing` | Immutable source / source or processing ID → source eligibility revision, epoch/fence and processing state | Memory owns source eligibility and its evidence mirror; raw Core records do not become a second mutable fact authority |
| `propose`, `commit` | Versioned sources/derived memories and basis fence / expected proposal revision → proposal / committed record IDs | Check the stored basis again at commit, including new assertions; queued work cannot restore corrected or withdrawn facts |
| `recall` | Purpose, bounded query, optional historical time and minimum fence → records, trace and coverage | Relevant, current-eligible support; partial/unknown coverage is explicit; readers do not get unrestricted private context |
| `inspect`, `list`, `exportView` | Scoped record/cursor → sources, revision history / readable export | Export is a derived view; original source and history remain attributable |
| `withdraw`, `inspectWithdrawal` | Versioned source/memory target → withdrawal fence, active uses and actual operation state | Block new recall/use before acknowledgment; report waiting/unknown work instead of claiming every active use has stopped |
| `prepareView`, `validateView` | Exact material plus versioned dependency closure / view stamp → immutable stamp / current eligibility | Events are hints; lost events cannot make cached text authoritative |
| `beginUse`, `finishUse`, `inspectUse` | View, bounded purpose and operation / lease outcome → scoped lease / actual use state | Serialize eligibility admission with withdrawal; possession of an old stamp is not permission to use it |
| `exportWithdrawalGuard`, `applyWithdrawalGuard` | Restore ID / Core-authorized restore step → withdrawal guard / new effective fence | Preserve current tombstones when importing an older backup; no silent resurrection |

Corrections and withdrawals invalidate affected derivations, diary/context
eligibility and queued old processing. The provider owns dependency tracking and
schema migrations. Recall always respects its latest fence; a missing/older
caller fence and historical-time queries cannot bypass it. A separate
Bank receives durable, idempotent observation work; other modules never edit it.
Forgetting companion memory does not silently delete native DSH logs.
Normal inspect/list/export/history paths enforce the same latest withdrawal
eligibility as recall: omit or reject withdrawn text, not just flag it stale.
`inspectSource` may expose scoped status metadata. Separately authorized original
record audit uses Core's audit path and cannot be selected by a model to bypass
recall, view or export gates.

### Source Versions And Use Admission

Core evidence IDs are immutable original records. Memory keeps an attributed
mirror and separately owns `SourceStatus` revisions/tombstones. `observe` returns
that status even before a MemoryRecord exists; `inspectSource` supplies the
revision needed by withdrawal. Source withdrawal with `expectedRevision: null`
means an atomic absent-source precondition: create a tombstone if not yet
observed, or return conflict if it already exists. This blocks a late outbox
ingestion. Replay of a withdrawn source returns `blocked` with no processing job;
it cannot reactivate the source. Explicit native-log deletion remains separate.
Both source and memory withdrawal require `expectedEpoch`, taken from the source
status/fence query. Restore/replacement cannot make an old revision precondition
valid again by resetting counters; an old-epoch withdrawal is rejected unchanged.

The Memory epoch is a persistent Bank generation, not a process boot ID. Restore
or provider replacement issues a new epoch; old stamps/leases do not survive it.
Within an epoch, changes to source/claim eligibility advance the fence. Merely
storing a proposal or opening a lease does not. Writes check the captured basis
at commit; a stale proposal needs reassessment. Read validation checks the actual
dependency closure, so unrelated updates do not hide unaffected valid memory.
Record/inspection/commit results carry their observed fence; a consumer cannot
attach an old record to a separately fetched new epoch and call it current.

Every Memory-derived context, message, life entry and artifact carries a `MemoryViewStamp`
binding exact material to versioned source/memory dependencies. The trusted view
builder includes transitive source roots, native-context lineage and referenced
artifact dependencies. Memory expands/checks the closure; a caller cannot omit
known roots to obtain eligibility. Unknown/missing dependencies fail closed.
Material digests use SHA-256 over UTF-8 JCS material
([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html)); artifact content digests
use SHA-256 over raw bytes, expressed as `sha256:` plus lowercase hex. Hashes bind
bytes/material; they do not establish truth or authority. Canonicalization and
runtime validation remain implementation obligations; no new dependency is added.

Before model admission, presentation, delivery, derived-artifact reading or export,
the consumer obtains a bounded `beginUse` lease and checks it against the exact
material/operation. `validateView` alone is advisory: a separate check followed by
unprotected use is not sufficient. Memory serializes lease admission and withdrawal.
Withdrawal closes new leases/recall first, then tracks already admitted uses until
they are handed off, aborted or truthfully unresolved. It is not `completed` while
conflicting uses remain unresolved; expiry is not proof that an external handoff
never happened. `finishUse`/reconciliation records actual outcomes. Views held on
screen must be hidden/refreshed at lease expiry; reconnect revalidates snapshots.
Already exposed content or an admitted external run cannot be retroactively unseen.
Its later derived output still needs a fresh lease before exposure. Memory
unavailability blocks derived disclosure rather than treating old data as safe.

## Life And Assistance Continuity

Source: [life.ts](../../src/contracts/life.ts); assistance records use Core.

| Public operations | Input → output | Required behavior |
| --- | --- | --- |
| `proposePursuit`, `revisePursuit`, `listPursuits` | Purpose, evidence and revisions → self-chosen pursuits | Emerging interest is supported by experience; resting is valid and creates no external experience |
| `proposeActivity` | Pursuit/revision → activity proposal | Core admits actual execution; Life cannot bypass pause, user priority or resources |
| `scheduleCheckIn`, `cancelCheckIn`, `getCheckIn` | Pursuit/revision/time → one pending pursuit check-in | Persist scheduling intent; replacing the schedule preserves the unfinished pursuit |
| `reportCheckIn` | Check-in/revision/admitted activity → queued/started/completed state | Only coordinator evidence can advance dispatch state; a queued wake is not a started model step |
| `proposeReview`, `getRecentLife` | Sources / bounded cursor → review proposal / derived life entries | Review needs admission; diary and recent-life views retain provenance and withdrawal eligibility |

Core owns the low-level dispatch schedule; Life owns its semantic plan and
check-in record. Owner commitments remain durable when self-chosen schedules
change. Restart collapses overdue autonomous opportunities into one current
reassessment. All planned assistance cases use the same commitment contract;
selecting one first does not remove the others from the plan.

`getRecentLife` returns a memory stamp for each exact summary/artifact pair.
`freshness` is diagnostic, not an access grant. Desktop/Console must acquire a
presentation lease before displaying or redisplaying it, including after lost
events. Invalid entries are withheld or rebuilt; withdrawn text is not returned
as a merely stale preview. A new native reply carries the dependencies of every
memory-bearing input that could affect it until those inputs are removed/rebound.

## Desktop, Body And Room

Source: [desktop.ts](../../src/contracts/desktop.ts).

| Public operations | Input → output | Required behavior |
| --- | --- | --- |
| `getSnapshot`, `setView`, `reconnect` | View / known boot and cursor → current presentation snapshot | Fish, chat, recent-life and room are surfaces of one identity; durable conversation recovery is separate from visual replay |
| `executeBody`, `inspectBodyAction`, `cancelBodyAction` | Admitted command, expected world revision / command ID → action receipt | Accepted/started/completed are distinct; same command is applied once; local motion requires no per-frame model call |
| Room `getScene`, `interact` | Scene query / shared body command → scene/entities / same receipt | One Desktop-owned world/body writer; optional room rendering has no private planner or memory |

Body capabilities publish their available actions; Core checks actual support.
A decorative pose, completed virtual activity and external-activity indicator
remain distinguishable. Layout/render assets and scene geometry are private
renderer details until a specific renderer needs a reviewed protocol extension.
Helper protocol `0.1` is a draft independent of product contract version. Host
effects own the helper lifetime; transport must validate DTOs and trust the
configured peer. A future renderer can replace presentation without identity,
memory, commitments or gateway rebinding.

## QQ And Channel Transport

Source: [channels.ts](../../src/contracts/channels.ts).

| Public operations | Input → output | Required behavior |
| --- | --- | --- |
| `getBinding`, `pairOwner`, `unpairOwner` | Trusted pairing proof reference and revisions → owner/account binding | Explicit account association; account change suspends routing until resolved; proof reference is not itself authority |
| `normalizeIncoming` | Gateway event/account/sender → attributed message | Validate current binding, preserve original IDs and attribution; Core performs final accepted-input dedupe |
| `send`, `reconcile` | Persisted attempt / original target and IDs → attempt receipt with the same target | Send rejects a stale binding; reconciliation refers to the historical target, even after account change |

Sending deduplicates stable contact identity and preserves individual attempts.
QQ pairing/unpairing delegates canonical binding changes to Core and retains
only its linked transport state. Cross-store transitions use durable work and
reconciliation; an account change cannot reuse the previous owner's authority.
Normalized incoming messages and presented history retain their Core binding
revision. Reply targets resolve from the originating binding; proactive targets
resolve from configured preference once, then are persisted. The target contains
channel/scene, binding ID/revision, transport connection reference, actual logged-in
account ID and exact recipient. Reusing a connection reference cannot hide an
account change; the transport verifies the actual account identity separately.
Incoming dedupe uses the gateway's stable message identity within the actual
account and peer/scene namespace. A reconnect or binding revision change does
not turn a replay into a new source; the authority revision and source identity
are separate. Exact gateway ID stability is part of V4 evidence.

`prepareDeliveryAttempt` persists the immutable payload/target before gateway
access. The transport verifies them against Core's stored attempt and actual
account binding, not the caller's object alone. A binding/account/recipient change
rejects the old attempt with `STALE_BINDING`; it is not silently retargeted.
Reconciliation may inspect the original account/recipient or remain unknown if
that connection is unavailable. Receipts are accepted only for the stored attempt
and target; an old receipt cannot update a new binding's attempt. Derived sends
require a matching delivery lease, and embedded assets retain their own read gates.
The gateway's reconciliation capability is reported honestly; no blind retry or
switch to another channel after an uncertain send. Internal reading and review
turns are not automatically sent. Initial ordinary text remains an implementation
slice; `MessagePart` reserves authorized asset references for later media support.

## Bilibili And Content Evidence

Source: [bilibili.ts](../../src/contracts/bilibili.ts).

| Public operations | Input → output | Required behavior |
| --- | --- | --- |
| `describeAccess` | Scope → login state, modalities and limitations | Return account references, not credentials; unsupported reading modes remain visible |
| `discover` | Admission, query or configured feed and page bound → source-linked candidates | No hidden browsing loop, new schedule, social write or automatic preference mutation |
| `inspect` | Admission, purpose, requested modalities and bounds → source/time coverage and artifacts | Report metadata, transcript, comments, samples, actual audiovisual inspection or playback separately |

Comments remain commenters' views. Samples and subtitles cannot imply complete
watching. Missing modalities produce explicit gaps or a supported alternative.
Main companion interpretation and memory changes return through Core/Memory.
Browser playback is an explicit modality with unverified support, not an
implicit requirement or silently discarded option.

## Core Resources

Source: [resources.ts](../../src/contracts/resources.ts).

| Public operations | Input → output | Required behavior |
| --- | --- | --- |
| `beginUpload`, `writeChunk`, `commitUpload`, `abortUpload` | Scoped producer, bounded chunks and digest → upload state / committed artifact | Core owns temporary/committed bytes and catalogue; immutable publication follows size/digest and view validation |
| `inspectArtifact`, `readArtifact` | Digest-bound artifact / bounded range and access purpose → metadata / bytes | Resolve through Core-owned storage; never interpret caller paths or IDs as authorization |
| `retainArtifact`, `releaseArtifact`, `collectGarbage` | Owner record, expected revision / trusted retention policy → references or cleanup receipt | Producers own their record references; Core alone performs physical retention/deletion |

Artifact IDs are scoped by companion/scene permissions; matching content hashes
do not grant cross-scope access. Core controls bytes, metadata, holders and
retention. A module remains responsible for its own domain record and releases
its holder through the resource port. Referenced backup/checkpoint/media content
is retained under policy; abandoned uploads are bounded and collected. A full
backup includes manifests, reachable bytes and resource metadata, not local-only
IDs that become unusable on another installation.

Cross-module calls never hold a private store transaction/lock while awaiting
another module. Core resource registration does not require Memory activation;
raw non-derived assets remain usable independently. Only operations requiring
derived eligibility consult Memory, outside held storage transactions. Memory
exports prepare their dependency stamp before publishing through Core resources.

`ArtifactInfo.memoryView` binds derived bytes to their memory roots. Ordinary
reads require a matching current lease when metadata marks content derived;
the caller cannot bypass that by passing `memoryUse: null`. A producer cannot
remove dependencies by relabeling the same bytes as ordinary content. Stale
derived artifacts need explicit regeneration; they are not silently restamped.
Opaque backup/restore reads use a trusted Core maintenance transaction, are
audited and are not exposed as a model/UI read capability. They cannot restore
withdrawn eligibility. Provider raw files and credential storage remain private.

## Console, Core Maintenance And Live Events

Sources: [console.ts](../../src/contracts/console.ts),
[maintenance.ts](../../src/contracts/maintenance.ts),
[events.ts](../../src/contracts/events.ts), and common `ModulePort`.

| Public operations | Input → output | Required behavior |
| --- | --- | --- |
| `getHealth`, `getConfiguration`, `changeConfiguration` | Available modules / scoped schema and revision → effective status/settings | Delegate mutation to owning module; typed config values still need an owner schema; credential fields expose references only |
| Core `exportCompanion`, `inspectExport` | History choice / export ID → durable export record and eligible artifact | Core owns the workflow; derived exports use current eligibility and scoped resources |
| Core `createBackup`, `inspectBackup`, `listBackups`, `reconcileBackup` | Trusted destination / versioned backup record → snapshots, resource manifest and coverage | Persist job before dispatch; missing/partial provider data is reported, never silently called a full backup |
| Core `prepareRestore`, `inspectRestore`, `listRestores`, `applyRestore`, `reconcileRestore`, `cancelRestore` | Backup / versioned durable restore plan and trusted authorization → actual transaction and per-module steps | Core owns plan, intent, permits and recovery; Console is only a client |
| Module `health`, `quiesce`, `resumeFromQuiescence` | Query / controlled stop or restore freeze / same quiescence ID → health or readiness | Close business admission; keep required control ports available for restore; native disposal follows actual host stop |
| Owner `describeState`, `exportState`, `prepareImport`, `applyImport` | Snapshot ID / owner snapshot / compatible import plan and current revision → schema status, snapshot or restore receipt | Only the state owner reads/writes its store; stateless providers report that explicitly; import requires stopped writers and trusted restore authorization |

`ModulePort` includes the owner state-maintenance port. Core coordinates it rather
than opening private provider files. A snapshot records owner schema, watermark
and unresolved operations, plus companion/scope and explicit format/schema IDs.
Stateless providers report that rather than create a placeholder store.

Core's operational ledger owns backup/export/restore records, step receipts,
authorization references and reconciliation. It and the durable resource/backup
catalogue are excluded from the replaceable companion payload; importing Core's
domain snapshot cannot erase the transaction coordinating that import. Console
may be disabled without losing or moving those records. Format/version/name
similarity alone is not compatibility, and this contract does not grant arbitrary
cross-companion restore.

Restore sequence: persist plan → persist authorized apply intent → quiesce
affected business writers and reconcile outstanding uses/work → capture the
current withdrawal guard and pre-restore recovery data under those frozen
revisions → prepare/check each owner import → persist per-step permits → apply
imports and reconcile uncertain results → merge the protected withdrawal guard
into restored Memory, issuing a new epoch → invalidate old native/view/asset
eligibility → verify owners before resuming admission. Preflight may inspect a
guard earlier, but the final guard is captured after Memory mutations stop; it
cannot miss a withdrawal committed between preparation and quiescence. Required
unknown work or an inability to freeze blocks apply. Final checks use frozen revisions.
Core/resource/maintenance control endpoints survive the restore freeze. If a
required guard, provider or reconciliation is unavailable, recovery remains
blocked/unknown; no replacement Bank or falsely completed restore is created.
An old/new provider never writes concurrently. Cancellation after destructive
steps is a stop request, not an automatic undo; any rollback has an explicit
recovery plan preserving later unrelated data. Faults never silently resume a
mixed partially restored companion. Owner logs are not deleted by memory restore.

Binding revision high-water marks and actual send/execution receipts stay in the
protected Core control ledger. Imports never roll these back. Restored channel
associations are suspended until checked against the live account and current
owner, then receive a fresh binding revision. Restored pending intents reconcile
against retained actual outcomes; unavailable evidence stays unknown. Resource
holders/bytes are checked and reattached before readiness, while the pre-restore
backup retains recovery references. Imported derived views/old native contexts
cannot be silently restamped under the new Memory epoch.

`ProductEvent` is a typed observation union. Map live observations to DSH/Cordis
events with an explicit dispatch mode during V1 adaptation. No custom bus or
native session-event type is introduced. Events contain scope, boot identity,
cursor and correlation through record IDs. Receiving an event does not commit
the underlying operation; reconnect reads the owning snapshot/history. Memory
event consumers use the Memory view/use protocol even if events were lost.

## Shared Voice: Protocol Planning Gap

Voice is a confirmed module. Define recognition, synthesis, readiness/profile,
inspect/cancel and maintenance operations after outcome/reference discussion.
Bind source or reply identity, scope, selected provider/profile revision and
resources, with limits, duplicate handling and actual stop outcomes. Recognition
does not itself submit owner input; synthesis does not itself play or send.
Core owns conversation/admission/delivery; Desktop owns capture/playback; QQ
owns bound media transport. Derived audio retains Memory dependency/use checks
through ordinary replay and disclosure.

Voice service types, ModuleId/CapabilityId additions, events and compile
examples remain required Stage 0 work. They are not added to src/contracts in
this discussion. Existing 0.2 checks cannot close the gap. See [Voice discussion](voice.md).

## Extension Slots And Integration Gate

| Deferred or future capability | Reserved boundary | What stays owned by existing modules |
| --- | --- | --- |
| Full room renderer/world content | `desktop.room`, `RoomViewService`, body command and receipt | Core admission, Desktop world state, Memory provenance and Life planning |
| Other rich media, if selected | `MessagePart`/Core resources, channel and presentation ports | One conversation/delivery identity, bound target and scoped artifact access |
| Another channel or content source, if selected | Transport/evidence shapes plus a reviewed new capability ID | Core owner scope, routing/dispatch, common memory and shared resources |
| Another memory provider | `MemoryService`, source versions, epochs, view leases and withdrawal guards | Memory semantics and migration obligations; never concurrent writers on one Bank |
| Another shell/renderer | Desktop snapshot/body/room interfaces | Stable companion and history, configured lifecycle and host execution |

Adding a capability is an explicit contract/configuration change, not discovery
of arbitrary code or a new permission grant. Storage engines and host SDKs stay
behind provider implementations. The contracts add no mandatory framework.

Before a module becomes `ready`, verify its input validation and authorization,
duplicate/conflict handling, stale revisions, interruption and uncertain outcome,
restart reconciliation, absence/disable/incompatibility behavior, effect cleanup
and compatible packed artifacts. A deferred module passes only interface/static
coverage; its behavioral gate remains pending. Provider replacement additionally
checks preserved sources, corrections, withdrawals and schema recovery.

## Current Verification Boundary

`pnpm run check:types` includes these interfaces and compile-only negative/positive
examples in [contract-types.mts](../../scripts/contract-types.mts). Those examples
also reject missing source revisions, memory-use leases, fixed delivery targets,
resource access paths and restore permits, and keep restore off the Console port.
They do not validate runtime inputs, enforce authorization
or demonstrate any provider, transport, memory quality or autonomous behavior.
