# Project Plan: Dafeiyu / Codex-Pet

- Project ID: `dsh-dafeiyu`; package: `dsh-Chatpet`.
- Revision: v0.14, 2026-11-05, Asia/Saigon; synchronized from PM Advisor plan v1.3.
  Product-plan and PM Advisor engagement revisions are separate namespaces.
- Source: Codex-PM Advisor commit `ef0fb56`, `projects/dsh-dafeiyu/plan.md` and
  `reuse-review.md` r4. That commit retains the exact source and review history.
- Status: Planning round closed; retained planning draft. The user requested this
  documentation synchronization, not implementation, installation or acceptance.
- Current release: [Pet MVP 1.0](mvp-1.0.md). This v0.14 document preserves
  the earlier product route and trial register. See the [handover](../handover/README.md)
  for current work and separate acceptance evidence.
- Knowledge: [Reuse review r4](reuse-review.md) records source-level candidates and
  boundaries. Live conformance, residual-risk decisions and product acceptance
  remain open; this is not a formally ready release baseline.
- Historical ownership: v0.14 recorded the design recommendations, packages and
  trial limits for its planning round.
- Retention: [Previous product plan v0.13](snapshots/plan-v0.13.md) preserves the
  local baseline. PM Advisor history remains retrievable at source commit `ef0fb56`.
- Checkout inspected for synchronization: `main` at `ef0e1b7`, clean; code checkpoint
  `f8990dd`. Only Git/document state was rechecked. Historical source/runtime and
  personal-install observations below were not rerun by this synchronization.

## Outcome And Recommendation

Build one locally running blue-fish companion that remains the same companion
across native DSH conversations, desktop chat and ordinary owner QQ chat. It
remembers attributable information, can be corrected, develops a life through
real bounded experiences, and can help with user-requested work. Mac/DSH shutdown
stops its activity. Voice belongs to the full design; a room remains optional.

Retain the user's own-product and DSH-native modular direction. Reuse DSH's
Agent, sessions, tools and lifecycle, the implemented Core, Mnemosyne service,
existing Mac helper/dialog code, QQ transport, Bilibili retrieval and speech
components. Own the integration needed for one identity, coherent memory,
truthful activity and a usable interaction. References are design inputs, not
an instruction to install several companion plugins.

Deliver complete flows in this order: native companion with memory -> desktop
companion -> QQ continuity -> autonomous Bilibili life -> shared voice and daily-use
hardening. Verify the QQ deployment route early because failure could affect the
local-only operating model. The minimum shared Voice contract is reserved in P8a in this draft, before
Desktop/QQ implementation; engine and experience selection in P8b and speech
implementation in P9 remain later work. Healthy text flows do not wait for speech. Keep all eight modules in
the overall design without making every deferred implementation a first-use gate.

The first meaningful delivery is native DSH chat that uses the bound persona and
profile, executes through the existing Agent, and remembers/corrects/forgets an
attributable preference across a new session and restart. This is a usable native
increment, not the full desktop-pet release. Core audit or interface compilation
alone does not deliver that result.

## Boundary, Prior Decisions And Current Conditions

The user is the initial owner and acceptance decision-maker. Proposed engineering
and operating roles below are assignments to agree, not staffed commitments.
Planning may read this project's existing materials and relevant public sources;
this engagement does not change the target, install packages, run models, log in,
connect accounts, send messages or change personal data.

### Requirements And Proposals

| Item | Treatment in this replan | Basis and limit |
| --- | --- | --- |
| Local Mac/DSH, own modular companion, blue fish, chat, long-term memory, QQ friend chat, autonomous Bilibili activity | Retained product goals | Prior engagement and target product plan; not reopened by this draft |
| Core governs real execution; Memory owns long-term memory; Repo owns persona, owner profile and configuration | Controlling boundary | Latest target handover and completion record supersede broader earlier Core proposals |
| Ordinary native workspace sessions; no separate companion mode or duplicate Agent/model turn | Retained interaction decision | Target workspace contract and current source; complete acceptance remains open |
| `.chatpet/README.md`, `manifest.json`, `SOUL.md`, `USER.md`, `core.json` | Retained Repo layout | Root README and existing instructions preserved; absent root `AGENTS.md` gets a native-discoverable companion entry after successful initialization (2026-11-06 owner feedback); retired STATE preserved |
| Shared Voice for Desktop and QQ | Retained eighth-module scope | Target Voice discussion; languages, engines, interaction and release timing remain open |
| Matters ledger, custom workbench, generated STATE.md | Optional ledger/UI; STATE retired | Existing code and old tests cannot make these mandatory Core requirements |
| One compatible bundle; provider discovery and supervised helpers | Recommended carrier | Native mechanism supported; exact runtime bindings require tested versions |
| Expanded room, rich embodiment, voice mode, concrete assistant duties | Proposed or undecided detail | Do not inherit every reference's persona, needs formula, room or workflow |

The inherited decisions above are attributed to project records, rather than newly
captured approvals. No blanket reconfirmation is needed for planning. Before a
later consequential operation, its operator must bind actual authorization to the
specific target, revision and action; editable documents alone do not enforce it.

### Existing Implementation And Historical Evidence

The target contains Core/workspace/native-adapter/settings implementations and
contract skeletons. Read-only spot inspection confirmed the five-file declaration,
legacy STATE retirement path, native service injection and real implementation
files. This was not a full code audit or a rerun of behavior checks.

The target reports 32 passing tests and a native-workspace fixture with eight local
model calls. Earlier desktop evidence covers an older installed real-model flow.
Those are supplied historical results, not checks performed in this engagement.
The latest source cleanup is not installed in the personal desktop profile. Memory,
Desktop, QQ, Life, Bilibili and Voice are not delivered providers at this checkpoint.
Full Core completion and whole-product acceptance are unproven.

Source/install drift is a P1 release prerequisite. Do not discard existing Core
work, blindly reinstall it, or restart a foundation project from zero. Preserve
existing identities, user data, optional ledger data and ignored installation assets.

## Overall Design And Ownership

| Owner | Responsibility | Boundary and required interface |
| --- | --- | --- |
| Repo | Storage home for companion information: persona, owner profile, configuration, Core records and Memory Bank | Module writers retain their authority; `.chatpet/data/core/` and `.chatpet/data/memory/` hold runtime data, not a second Bank |
| Core / `00-Core` | Workspace and identity binding; actual native execution admission, interruption and reconciliation; necessary conversation/channel correlation and shared controls | DSH retains native logs/tool enforcement; no compulsory matter creation or second model runtime |
| Memory | Attributed observations, temporal claims, recall, corrections, withdrawal and derived-view eligibility | One writer; source IDs/revisions, unknown/partial recall and stale-result refusal; Mnemosyne is the recommended provider candidate |
| Desktop | Blue-fish shell/body, compact chat, recent-life presentation and helper/device lifecycle | Uses the same Core; local animation is not proof of external work; optional Room is a sub-capability |
| QQ | Bound small account/owner routing, normalized input, dedupe and actual transport receipts | Fixed account/recipient/binding revision per attempt; confirmed, failed and unknown differ |
| Bilibili | Discovery and bounded reading with source and modality coverage | No independent persona, scheduler or memory; comments/transcripts/frames are different evidence |
| Life | Interests, pursuits, next check-in, reflection and rest proposals | Core admits work/contact; owner interaction has priority; no independent bypass timer/model client |
| Voice | Shared recognition/synthesis, profile revisions, audio jobs, cancellation and availability | Desktop owns capture/playback; QQ owns media transport; text remains usable without speech |
| Console | Necessary settings, connection/health and inspectable operations | Use DSH settings first; a broad custom workbench needs a demonstrated use case |

The user requested all companion information in the Repo on 2026-11-06.
Store module data under the bound Repo’s `.chatpet/data/`; physical colocation
does not merge Core and Memory ownership. DSH account credentials and native
session logs remain host-owned. Relocation preserves identity, sources, revisions
and withdrawals; changing workspace selection does not implicitly move databases.

Core-owned shared artifacts and maintenance remain explicit contract responsibilities
where required by integrated flows. Their historical API catalogue is not an order
to implement a generic resource platform or full restore engine before first chat.
Each provider owns its domain state and participates in versioned export/recovery.
Before a feature uses shared bytes, migration or restore, specify and verify the
minimum safe path it needs. A file copy or Git commit is not a complete live-data backup.

Use native services for calls and events for observations. Durable inputs, memory
work and delivery attempts need stable IDs, acknowledged persistence and recovery.
In-process modules are ownership boundaries, not security or crash isolation.
Tool availability and host policy must establish actual access; prompts cannot.

### Required Whole Flows

1. Native conversation: exact workspace binding -> valid Repo files -> existing
   DSH Agent/tools -> visible response -> necessary native/product correlation.
   No extra mode, hidden duplicate request or mandatory task ledger.
2. Memory: attributable exchange/action evidence -> semantic memory proposal ->
   scope/source/revision checks -> committed claim -> bounded eligible recall.
   A correction invalidates affected cached/derived context, including native
   session context; unrelated valid memory remains usable after failure.
3. Desktop/QQ: attributed channel input -> same Core/Memory -> one intended reply
   -> presentation or transport receipt. A new session is not a new companion.
4. Life: meaningful opportunity -> proposal or rest -> finite admission -> actual
   reading/body receipt -> source-backed experience -> optional single-channel share.
   A virtual action, an intention and a completed external action stay distinguishable.
5. Voice: attributed recording -> transcript/review policy -> normal conversation;
   reply-bound synthesis -> channel playback/send -> actual outcome. Synthesized
   audio is not a playback or delivery receipt; stopped work cannot revive later.
6. Stop/resume: close new admission -> cancel/checkpoint where supported -> preserve
   uncertain work -> reconcile on restart. Skip expired autonomous opportunities;
   do not invent offline experiences or silently replay unknown external sends.

### Reserved Interfaces And Costly Choices

Retain existing seven-module contracts as reviewed design inputs, not proof that
all operations are necessary or implemented. Reconcile only interfaces affected
by the current boundary and chosen flow. Preserve compatibility or propose an
explicit migration; never delete old data to make a revised interface look clean.

The [reuse review](reuse-review.md#voice-existing-asr-and-adapted-tts-transport)
reserves existing DSH ASR/capture and adapted dot TTS. [P8a](#p8a--minimum-shared-voice-contract-reserved-now)
now specifies the minimum integration contract before Desktop/QQ changes. P8b
later chooses modes/providers and P9 implements speech. Detailed target types are
mapped to P8a before the first affected consumer changes; this does not add a Voice
implementation gate to the text-only P1–P3 batch. No target types are edited here.

The interface reservation below keeps every planned module connected now. These
are candidate contracts, not newly accepted types or implemented services. Existing
target contracts own the baseline seven-module operation details; review changed
semantics against them rather than invent another catalogue. Voice gets its missing
design-level seam here; P8a fixes the common boundary and P8b settles experience-dependent details.

| Boundary | Reserved request / result | Common obligations and absence behavior |
| --- | --- | --- |
| Channel -> Core -> native execution | Attributed input with companion/workspace/channel/source/reply identity -> accepted/rejected input and correlated native execution/presented result | Stable replay IDs, actor binding, native permissions, no second model turn; unavailable execution is reported |
| Core/consumers -> Memory | Source ingestion, eligible recall, correction/withdrawal and view-use check -> committed revision, partial/unknown recall or rejected/stale operation | One writer, dependency stamps, source eligibility, idempotent acknowledgements; loss cannot fall back to stale native context |
| Life -> Core | Pursuit/check-in/work/contact proposal -> admitted, refused, waiting, checkpointed or actual outcome | Limits/policy/capability checked at dispatch; Life cannot send or execute directly; absent Life means no autonomous pursuit |
| Core <-> Desktop/body | Conversation/state projection and bounded body command -> presentation/started/completed/interrupted receipt | Boot/protocol version and reconnect cursor, one body writer; absent view cannot claim displayed or completed action |
| Core <-> QQ | Fixed-target contact attempt / attributed incoming message -> accepted/replayed input and confirmed/failed/unknown transport outcome | Account/recipient/binding revision immutable per attempt; offline channel does not create a fallback identity |
| Execution -> Bilibili | Question/content reference and permitted reading scope -> source/time/modality/coverage/findings or partial/unavailable outcome | Bounded work, no social write scope inferred, no independent memory writes or scheduler |
| Consumers -> Voice recognition | Source-bound audio reference, format, actor/channel and selected recognition profile -> attributed transcript, coverage/confidence if available, error or cancellation outcome | Core admission and submission policy are separate from recognition; duplicate job IDs reuse one outcome; unavailable ASR leaves text usable |
| Core/consumers -> Voice synthesis | Eligible reply/source revision, voice-profile revision and target format -> audio artifact/job outcome | Audio inherits source-use dependencies; synthesis does not mark playback/send; unavailable TTS does not disable text |
| Consumers -> Voice lifecycle | Capability/profile inspection, bounded job inspect/cancel -> actual pending/running/completed/failed/cancelled/unknown state and compatible formats | Frozen job scope/revisions; late results cannot auto-play; Desktop controls devices/playback, QQ reports media delivery |
| Console -> domain owners | Settings/health and chosen user operation -> validated revision/result or honest unavailable state | Same operation as other clients, no direct private-state writer or mandatory workbench |
| Provider -> shared artifact/maintenance facets | Scoped bytes/references and versioned export/recovery participation -> durable acknowledgement or explicit failure | Feature-sized needs only; compatibility, source guards and actual-outcome preservation before enabling destructive recovery |

For every boundary, scope and expected revision travel with the request; errors
distinguish invalid input, stale revision, unsupported/incompatible capability,
unavailable provider and uncertain execution where applicable. Cancellation reports
what stopped, not just what was requested. Reuse declared host lifecycle mechanisms.
P8a is a proposed contract awaiting content review. P8b does not reopen its
ownership/correlation/cancellation invariants silently; a material change receives
an explicit contract revision and consumer impact review. Target type mapping
remains unimplemented until separately authorized consumer work.

The stable naming is `dsh-Chatpet` and `00-Core`; other module names are not newly
frozen here. Model/provider/account IDs, paths, credentials, resource limits and
run bindings come from trusted configuration, not generic model instructions.

## Existing Solutions And Concrete Reuse

[Reuse review r4](reuse-review.md) owns exact commits, source files, licenses,
alternatives and the F01–F26 function decisions. Its recommendations are based on
actual source/document inspection, not running those components on this Mac.
Use existing mechanisms for their supported role; adapt only the named mismatch.

| Capability | Proposed existing base | Scope to retain/adapt; custom limit |
| --- | --- | --- |
| Native execution/config/settings | Current Pet Core plus DSH/Cordis | Retain the five-file/native-session/settings implementation and existing attributed adaptations. Repair observed gaps; no new Core runtime, workbench or compulsory matter ledger. |
| Long-term memory | Mnemosyne 2.0 service at `796dc292…` | Reuse Bank, API/client, retrieval, temporal claims, versions, derivations, process host and migration. Adapt exact Pet scope and native-context join; close verified partial-forgetting/missing-revision gaps. No default smaller self-built Bank. |
| Desktop | Candidate: QCYTSN Mac helper `08432384…` plus surfpet dialog `d825d236…` | P5a tests the proposed WKWebView/Core bridge and sizes the actual delta; P5b implements only the selected route. Reuse does not prove this combination is cheaper. No new shell or parallel full prototype. Legacy BigFish artwork is excluded. |
| Ordinary QQ | Conditional external NapCat plus MIT dot transport `ff288f57…` | Official native Mac route exists; assess terms/coexistence first, Docker only on a concrete gap. Adapt echo/dedupe/timeout/owner filtering; custom work is exact Core routing and fixed-target outcomes, not QQ protocol. |
| Bilibili | retrieval `5ffb27e0…`; CZX extractor `c53af9de…` only for missing essential coverage | Reuse API/login/subtitle/preview algorithms; adapt host registration, cache scope and receipt/Memory mapping. Optional ASR/frames require selected data path and runtime, not a new crawler. |
| Life | world timing/recovery primitives `d0b0ba71…`, existing Core admission | Reuse timer/early-stop/tool patterns; adapt durable wake/outcome join. Enforce actual limits and source-backed experience; no second scheduler, global compaction or advisory-only budget control. |
| Voice | DSH complete-recording ASR/capture; adapted dot TTS and surfpet playback | Reuse recognition/WAV/transport/arbitration; remove language-corrupting cleaning and extra emotion calls. Custom work is source/reply/profile and actual playback/send coordination, not a speech engine. |
| Installation/recovery | DSH package tooling, provider backup/migrations, SQLite primitives | Retain current storage/resources. Add product coverage/version/withdrawal guards only; current Core snapshot is partial and guarded restore is unavailable. |

Whole-product alternatives were screened in v0.8: AIRI offers embodiment/audio,
AstrBot offers IM/provider infrastructure, and Fidget offers another desktop/harness
path. They bring a different runtime/platform or additional integration ownership;
no inspected gap currently justifies replacing DSH or implementing those complete
routes in parallel. This is a bounded fit judgment, not proof that no other product
fits. Reopen a specific alternative only when its trigger in the reuse review occurs.

**Correction to v0.8:** the NapCat Shell page includes macOS 12+, Intel and Apple
Silicon via a Mac installer. The earlier absence claim was incorrect. The installer
modifies the QQ entry; native coexistence, restore and current use terms still need
operator evidence. Installer MIT does not supersede NapCat's custom license.
[Official installation guide](https://napneko.github.io/guide/boot/Shell).

## Decision-Specific Evidence And Open Choices

The [reuse review](reuse-review.md) separates source-backed candidate selection
from operator conformance and user acceptance. No bounded residual risk has been
accepted here; this remains a draft rather than a formally ready release baseline.

| Decision | Supported conclusion | Remaining gate / owner and consequence |
| --- | --- | --- |
| Overall route | Native modular DSH companion with existing components and limited joins | User reviews the current revision's scope/reuse/order; later operator scope binds actual actions. |
| Current Core release | Retain current code; source/install mismatch is known | P1 engineer verifies selected native/config/stop/restart path and packed version. Supplied fixtures do not accept the current personal installation. |
| Memory provider | Recommend Mnemosyne service, not a parallel new Bank | P2 verifies 0.2.2 compatibility, resource/lifetime cost and known failure contracts. Narrow patch first; alternative only for a material failed fit. P3 is dependent. |
| Correction/withdrawal | Reuse existing claim/version/derivation mechanisms with explicit gap handling | P2/P3 engineer proves complete trusted revisions, partial-forgetting handling and stale native/derived-context refusal; block affected disclosure until reconciled. |
| QQ | Native Mac route plus existing transport is a concrete candidate | P4 resolves gateway terms and native coexistence/restore. P6 proves bound routing and unknown-send behavior; Docker is an alternative only on an observed native gap. |
| Desktop | Existing Mac helper + adapted dialog is a source-backed candidate | P5a settles combined interaction/cost; a failed fit selects one evidence-backed alternative according to the actual gap, within the appraisal allowance. Documentary comparison does not prove interaction success. |
| Life/Bilibili | Existing retrieval, world timing and Core controls cover major mechanisms | P7a delivers requested reading; P7b adds controlled autonomy; P7c adds reflection/selective sharing. Each has its own usable result and exit; reading alone does not accept autonomous life. |
| Voice | P8a now reserves common ports; DSH ASR/capture and dot TTS remain component candidates | Before P8b/P9, user chooses initial mode/languages/voice/data path/retention. Verify installed service/Mac capture. These choices do not hold up the minimum contract or text batch. |
| Assistance | Native tools plus real memory support a concrete value trial | Proposed supplied-material comparison; user supplies representative content before usefulness acceptance. No compulsory follow-up ledger or implied mail/calendar access. |
| Operations | Reuse storage/provider backup/package tools | User supplies finite live limits, contact destinations and backup retention before dependent use. P10 verifies complete coverage and version-aware recovery; disabled restore stays disabled until its guards work. |

### Local Evidence Map

These local records and source files supplied evidence at `ef0e1b7`. Links now
resolve inside this repository; use that checkpoint for exact historical content
where a current record has changed. Original stage proposals are snapshots, not
current work assignments or proof of runtime acceptance.

- [Current target handover](../handover/README.md): latest pause, scope correction, source/install mismatch and restart conditions.
- [Core completion inventory](../core-completion.md) and [workspace contract](../workspace.md): implemented subset, five-file authority, native session path and evidence limits.
- [Target product plan](snapshots/plan-v0.13.md), [module design](modular-design.md), [Voice discussion](voice.md): retained goals/interfaces; older workbench/matter prose is subordinate to the latest correction.
- [Target development sequence](snapshots/development-plan-v0.7.md): historical stage/acceptance proposals, not the active order recommended here.
- [Workspace source](../../src/core/workspace.ts), [Core plugin](../../src/core/plugin.ts), [package manifest](../../package.json): limited actual-source/version inspection; no broad conformance audit.

## Function Review And Work Ownership

The detailed [F01–F26 matrix](reuse-review.md#f01f26-complete-function-disposition)
now states the existing base, exact adaptation/custom join and delivery package
for every previously planned function. It replaces v0.8's general reuse statements;
these are source reviews, not 26 independently verified runtime capabilities.
Room is deferred with its integration seam. Public social actions, spending,
cloud hosting, mobile clients and always-on capture remain unselected.

No compulsory ledger/workbench/STATE programme is scheduled. Existing data and
APIs are preserved. New custom work needs a demonstrated unmet contract, not
just an available function name or an upstream tool catalogue.

## Delivery, Resources And Handoffs

One accountable implementing engineer/agent is proposed for serial work. The
user owns actual behavior/value acceptance and account/provider choices. This
request authorizes these planning edits only; it starts no implementation batch,
provider process, test, model request, installation or account operation.

**Current batch proposal: P1 -> P2 -> P3 only.** Its outcome is the native useful
companion increment M1. Exclude Desktop, gateway/app changes, QQ, Bilibili, Life,
Voice implementation, Room, personal-data migration, workbench expansion and full
restore. Preserve their later goals and interfaces. P8a's design reservation is
included in this document now, with no target code or Voice provider work.

The default later priority is P4, P5a/P5b, P6, P7a/P7b/P7c, P8b, P9a/P9b,
then P10a/P10b. This is a serial resource preference, not a mandatory dependency
chain. When an item waits on an external fact, choose another authorized item
whose actual inputs are ready; do not open parallel worktrees/agents or expand
permissions merely to bypass the wait. P4 can be assessed early, but QQ account/
terms waiting does not block Desktop or native reading. P8b preferences may also
be settled early without starting speech implementation.

| Work | Actual prerequisites / gate owner |
| --- | --- |
| P2 then P3 | P1's tested host/port baseline -> provider conformance/patch handoff -> actual native integration; no P3 consumer is required to complete P2 |
| P5a then P5b | P3 candidate port and P8a design reservation -> selected-route essential interaction evidence; no QQ/P4 prerequisite |
| P6 | P4 eligible/tested gateway plus P3 native/Memory port. Transport/native work can precede Desktop; desktop-to-QQ acceptance waits for P5b |
| P7a | P3 and a working input/output, including ordinary native DSH; Desktop/QQ are required only if that entrance is used |
| P7b | P7a plus the background-control gate owned inside P7b; ordinary owner-turn checks in P1 do not supply this gate |
| P7c | P7b for reflection; proactive delivery additionally needs a selected policy and a verified chosen outlet, with P6 only for QQ |
| P9a then P9b | P8a/P8b plus P5b for Desktop Voice -> shared Voice capability plus P6 for QQ; P9a does not wait for QQ availability |
| P10a then P10b | Exact installed-module data/versions and prior safe-recovery evidence -> supported recovery paths -> package/install/use-observation closeout |

P5, P7, P8, P9 and P10 are stage containers. Execute their named subpackages,
not an unbounded whole-stage task. P2/P3 use the internal checkpoints below;
these do not add allowances or new implementation owners. A handoff needs one
concrete result and enough inputs to proceed, not just a module name. A stop
ceiling limits exposure; it is not evidence that the proposed work is small.
Decompose distant implementation further only when an observed delta requires it,
before committing resources. Keep user flows and all deferred goals visible.

### Trial Limit Register

This register is the sole numerical source for package effort, verification,
conditional model-request ceilings and trial timeouts in this plan. Task packages
and closeout text refer to row IDs rather than repeat values. Historical snapshots
are evidence of earlier drafts, not competing current settings. No runtime budget
framework or product constant is introduced by this documentation arrangement.

The values are proposed stop limits for a bounded attempt, not measured completion
estimates, delivery promises, approved staffing or approved spend. Change a value
here only through an explicit package/resource decision; never reset or transfer
allowance between attempts. Verification effort is included in active effort.

| Row ID | Scope | Total active effort ceiling | Included verification ceiling | Conditional live request ceiling, only after separate authorization |
| --- | --- | --- | --- | --- |
| P1 | Existing native Core | 4 hours | 2 hours | No count ceiling; subject to B-test (user decision 2026-11-06) |
| P2 | Mnemosyne conformance/adaptation | 8 hours | 4 hours | No count ceiling; subject to B-test (user decision 2026-11-06) |
| P3 | Native conversation/Memory join | 12 hours | 4 hours | No count ceiling; subject to B-test (user decision 2026-11-06) |
| Batch | P1–P3 combined; no transfer between packages | 24 hours | 10 hours | No count ceiling; all requests/failed/auxiliary work share B-test |
| P5a | Initial combined desktop-path probe | 4 hours | 2 hours | Not proposed |
| P5a-alt | Conditional appraisal of a failure-matched alternative | 2 hours | Documentary/code appraisal only; no runtime prototype | Not proposed |

| Parameter ID | Applies to | Trial value | Meaning / boundary |
| --- | --- | --- | --- |
| B-test | User-authorized P1–P3 tests in the selected desktop/deepseek-account/deepseek-flash target | Cumulative test spend ceiling CNY 6; no test/request-count ceiling | User decision 2026-11-06 supersedes the prior count limits and CNY 12 ceiling. Keep all prior attempts/costs; reserve worst-case cost before dispatch. Normal native per-turn execution controls remain. |
| D-model | All packages unless a separate live allowance is authorized | External provider requests: 0; external model spend: 0 | Use disposable workspaces/Banks and local fixtures. No personal-profile install or real account/data by default. |
| T-job | Local verification command/job | At most 10 minutes per job | Retain an existing stricter runner limit. |
| T-setup | Setup/download attempt | At most 30 minutes per attempt | Includes reporting an unfinished setup; no repeated rebuild without new evidence. |
| T-ready | Service-readiness wait | At most 60 seconds per wait | A readiness timeout leaves that observation incomplete. |

P5a-alt is a distinct conditional appraisal allowance only if included in the later
authorized operator scope; it does not extend an exhausted P5a probe or authorize
another full prototype. Other future implementation packages receive a finite
allowance from their observed delta before work starts; those future values are
added here when decided, not guessed or repeated in task prose.

Use existing runner controls for the registered trial limits. A timeout means this
trial did not complete under its configuration/allowance; it is neither success
nor sufficient evidence that a component is incompatible or a route is unusable.
Record whether setup, host load, input size, allowance or a substantive fault is
implicated; change a limit only with evidence and the relevant resource decision.
The parameters are not production latency/compatibility requirements and must not
be copied into generic product constants. Timing out the caller does not prove
its child/external work stopped; unresolved effects still require reconciliation.

Active effort includes required reading, preparation, dependency/setup work,
implementation, diagnosis, checks and closeout. Verification includes preparing
and running cases, evaluating evidence and diagnosing failures; it is not an
extra allowance. Record these two counters in the existing work record. External
waits are reported separately and do not justify new work outside the package.

Use one primary version/configuration. Within the authorized package scope and
remaining total/verification/model allowances, perform necessary fixes and recheck
only the affected paths. There is no fixed count of defect batches or corrective
reruns. A further in-scope fix or relevant rerun alone does not reopen approval.
Each cycle needs a concrete relevant change or new diagnostic evidence and a
stated observation that can resolve the issue; record the reason/result briefly
in the existing work record. Repeated attempts without new evidence stop.
Do not rerun passed cases unless a subsequent change affects them. Reference
unchanged upstream/P1 evidence rather than repeatedly checking the whole library.
Use parameter rows T-job, T-setup and T-ready in the
[trial limit register](#trial-limit-register) and its timeout-interpretation rule.

Routine repairs remain within the named flow/adapter and the later authorized
package's remaining allowance. Stop affected work for a specific scope decision
if it needs a changed solution/provider, new framework, schema redesign or changed
product/permission boundary. A newly found defect does not by itself trigger a
new approval; its required remedy, remaining allowance and evidence determine
whether work can continue. No cap may be extended or transferred automatically.

For a separately authorized live extension, the operator must name provider,
model, target environment, maximum input/output tokens, tool/step/time limits,
and an accepted finite spend bound or fixed local resource allowance. The table's
request ceilings are additional limits; they do not establish a monetary ceiling.
Count every request attempt, including automatic extraction/title/retry calls.
If existing host/provider controls cannot bound or observe those calls, use local
fixtures and report the live case blocked. Do not build a budget framework merely
to run this batch. These instructions do not themselves enforce host limits.

Before spending remaining effort, compare it with the estimated work to the next
observable result. Stop new affected work at a limit, a required solution/scope
change, or repeated attempts without new evidence. Preserve partial code/data/
evidence and report actual effort/calls, passed/failed/not-run cases, the smallest
unresolved gap and options. A failed invariant keeps the affected output disabled
and cannot count as completion; an in-scope repair may continue under the policy
above only while that output remains safely withheld and allowance remains.
Do not silently extend caps, switch provider or label an unresolved package complete.

### First-Batch Handoff And Acceptance Gate

Inputs are the current target checkpoint/handovers, exact component pins and the
linked source review. At later execution start, inspect current Git/install/host
state once; changed bindings/versions require affected reassessment. Do not treat
old records as proof of current behavior. Record the exact disposable scope and
required permissions before any test; this planning turn grants none.

Each package hands over its actual diff, reused origins/notices, exact tested
versions/configuration, commands/case evidence, cap consumption and unresolved
items through existing target owning records. Use `docs/core-runtime.md`,
`docs/core-conversation.md`, `docs/workspace.md` and `docs/handover/README.md` as
appropriate; do not create a new report/directory for every case. Do not include
credentials or unnecessary personal data in records.

Cases below are mandatory observation responsibilities. Link adequate existing
checks; implement a new focused check only for an uncovered material behavior.
Use status `pass-fixture`, `pass-live`, `user-accepted`, `failed`, `blocked` or
`not-run`, with evidence. No status can be inferred from a previous layer.

- Engineering candidate: required fixture cases pass, exact artifacts/versions and
  safe recovery are documented, with all live/user gaps visible. This permits a
  reviewable candidate handoff, not a claim that M1 is accepted or installed.
- Installed integration: approved target install/runtime and real provider paths
  are actually observed within the live envelope; fixtures cannot substitute.
- M1 user acceptance: the user completes the native conversation/memory/help flows
  below and judges continuity/usefulness. If live permission, provider access or
  owner observation is absent, record that gate blocked/pending and stop expansion.

### P1 — Close The Existing Native Core Flow

- Outcome/deliverable: exact-version Core candidate with five-file persona/profile/
  config, ordinary native chat/tools, truthful stop/restart and a source/package/
  install comparison. Produce the existing flow; do not reopen all Core responsibilities.
- Reuse/inputs: current Pet Core/settings/native code, attributed whale/dot/world
  adaptations, DSH Agent/logs/permissions; target handover, workspace contract and
  relevant existing checks. Scope reading to these dependencies.
- Allowed change boundary: necessary in-scope fixes affecting binding, configuration,
  native execution/version or cleanup. Preserve identity/data/optional ledger and
  retired STATE files. No replacement runtime/database, extra mode, workbench,
  mandatory matter creation, Memory provider or live-profile install by default.
- Owner/recipient/resources: proposed Core engineer -> P2/P3 integrator and user;
  first in sequence. Apply row P1 and the default/model parameters in the
  [trial limit register](#trial-limit-register), with the shared evidence-based
  fix/recheck policy.
- Completion/acceptance cases:
  - **P1-01 native path:** one ordinary bound request produces one intended native
    execution, visible reply and an allowed disposable file/tool result. No extra
    mode, hidden duplicate submission or required matter ledger. Record auxiliary
    host calls separately; do not confuse them with a duplicate conversation turn.
  - **P1-02 configuration/scope:** manual and settings edits share authority/revisions;
    invalid files fail visibly; stop/receipt inspection remains available. Other
    workspaces remain ordinary, and in-flight/unresolved rebind is refused.
  - **P1-03 stop/restart:** cancellation during work records what actually stopped;
    no new steps follow a settled stop. Resume/reconciliation does not replay or
    fabricate work; initialization preserves the five files and never recreates STATE.
- Stop/handoff: timeout, cap expiry, incompatible host or unresolved real execution
  yields a blocked candidate with preserved evidence. Hand P2 tested context hooks,
  actual defects and exact version/config, not a new infrastructure checklist.
  Live install/use remains separately gated; fixture success is labeled accordingly.

### P2 — Verify The Provider And Hand Over A Conformant Memory Port

- Outcome/deliverable: exact S2 service/client/process conformance, runtime footprint,
  reusable provider-facing fixture/port checks, necessary narrow upstream/Memory
  adapter patches and an explicit proceed/reconsider decision. This is a provider
  experiment; it neither installs actual Core conversation capture nor implements
  the P3 native/history join.
- Reuse/inputs: S2 Bank/API/retrieve/claims/versions/derivations, MemoryClient and
  MemoryProcessHost; P1 host/version observations, existing Memory port shape and
  the source review's known gaps. Use disposable provider data and scoped synthetic
  caller/source IDs. Preserve origin and Apache notices.
- Allowed change boundary: provider lifecycle, existing revision/withdrawal completion
  semantics and minimal provider-port assertions. First repair/reuse upstream status,
  idempotency and recovery. Any necessary unfinished-operation metadata stays within
  the single Memory authority described in the [reuse boundary](reuse-review.md#memory-adopt-the-service-adapt-its-boundary).
  No actual native-session listener, Core outbox/source mapping, UI/audio integration,
  second version/tombstone store, retriever or private-data migration belongs here.
- Owner/recipient/resources: proposed Memory engineer -> P3 integrator/user; after
  the P1 baseline. Apply row P2 in the [trial limit register](#trial-limit-register).
  Keep the selected runtime/version stable. Evidence-supported setup/configuration
  repair or rebuild may continue within scope and remaining allowance under the
  common retry policy; changing provider/version/environment approach needs its
  relevant decision. Ordinary setup correction does not need a new approval.
- Internal checkpoints, sharing the same package allowance:
  - **Provider baseline:** run the selected service/port with the existing client;
    show lifetime, API behavior, known gap reproductions and resource observations.
    Return the exact patch decision before growing integration work.
  - **Provider conformance:** apply only required narrow patches and run affected
    checks through the provider port. Hand over patches, reusable fixtures/client,
    actual port/version behavior and a sized P3 integration delta. If the baseline
    already conforms, reuse that evidence instead of adding a patch.
- Completion/acceptance cases at the provider boundary:
  - **P2-01 lifetime/scope:** configured paths/readiness and the provider's scoped
    request validation work with synthetic callers; replay does not add an observation.
    Normal owned-child shutdown must actually finish. A separately injected stop
    failure must be reported as unresolved; that can pass its reporting assertion,
    but no real unresolved child from the attempt may pass the lifecycle gate into
    P3. Cleanup/reconciliation is observed, not inferred from a timeout.
  - **P2-02 correction/revisions:** a known expected-version conflict is refused;
    missing authoritative dependency revision is unknown/refused, never eligible.
    Test current/superseded claims using existing provider operations.
  - **P2-03 partial withdrawal:** inject cascade/tombstone failures and simulate
    consumer requests to the same Memory decision port. Pending/failed operations
    block affected use while unrelated valid facts remain usable; retry/restart and
    verified settlement preserve existing provider authority and reimport refusal.
    Simulated Core/chat/audio consumers prove only the port contract. Real native
    use is P3; real audio is P9. No production consumer is a P2 prerequisite.
  - **P2-04 recovery/retrieval:** restart between provider-side observation acceptance
    and provider processing; resume/replay its work idempotently. Seeded retrieval/
    context returns attributed coverage or unknown. The Core-to-provider durable
    acknowledgement join is P3, not implemented again in this provider experiment.
    Fixtures do not prove natural-language recall quality.
- Stop/handoff: unresolved provider invariants/lifecycle block its P3 handoff;
  in-scope repairs use the common policy. At a cap, required solution/scope change
  or repeated attempts without new evidence, preserve the result and return the
  component decision. No automatic new Bank or fallback. P3 imports this same
  provider/patch/fixture artifact rather than recreate its failure-handling logic.

### P3 — Integrate The Actual Native Conversation With Memory

- Outcome/deliverable: native candidate that remembers/corrects/forgets attributable
  information across sessions/restart and completes bounded supplied-material help.
  This package owns actual Core/native consumers. Desktop, QQ, Life, speech,
  compulsory ledgers and full restore remain outside the first batch.
- Reuse/inputs: P1 tested native hooks and P2's passed provider lifecycle/port,
  exact patches, fixture helpers and sized integration delta. Use existing Core
  durable source work and the same S2 client/provider; do not rebuild the P2 adapter,
  compensation record or provider-side recovery in a second place.
- Allowed custom boundary: actual accepted native/Core sources -> provider IDs/
  operations, durable acknowledgement and native/presented-history/context use
  through the one Memory decision port. P3 triggers provider withdrawal operations
  and consumes their results; P2's Memory authority continues to own completion,
  source versions/tombstones and eligibility. Rebuild/rebind clean native context
  when necessary. Do not duplicate Bank tables or replace semantic extraction.
- Owner/recipient/resources: proposed Core/Memory integrator -> user and later
  consumers; after P1/P2 gates. Apply row P3 and default/model parameters in the
  [trial limit register](#trial-limit-register). All internal checkpoints share
  that allowance; passing a checkpoint does not reset it or accept M1.
- Internal checkpoints:
  - **Basic native join:** implement real scoped capture, provider source mapping,
    acknowledgement and bounded recall. Demonstrate native identity/continuity in
    the disposable scope; hand over a working internal candidate, not a user release
    whose correction/withdrawal/recovery gates are still unverified.
  - **Protected native use and acceptance:** join the same provider's correction/
    withdrawal/failure results to actual native history/context eligibility; finish
    race/restart/outage checks, supplied-material help and the separately permitted
    live/user observation. Both checkpoints are required for the M1 claim.
- Completion/acceptance cases, with disposable facts and injected time:
  - **P3-01 continuing fact:** state a preference and unrelated fact through the
    actual native entrance. New session/restart keeps identity and recalls eligible
    source-backed information. Real scoped capture is proved here, not assumed
    from P2's synthetic requests.
  - **P3-02 correction race:** change the preference with old extraction pending;
    release/reconcile actual Core/provider work without restoring superseded state.
    Paraphrase uses the current fact or honest uncertainty, not keyword control.
  - **P3-03 forgetting:** reuse P2's fault injection/results and verify the native
    consumer boundary: pending/failed withdrawal blocks affected ordinary history/
    context use, unrelated facts stay usable, and restart/re-ingestion cannot revive
    the source. Do not rebuild provider tombstones/compensation to make this pass.
    This is future-use eligibility, not erasure of raw logs or already shown content.
  - **P3-04 useful help:** compare supplied fixture documents through native tools,
    attribute the conclusion to the inputs and continue after a new session without
    requiring a matter. A representative live task/user observation is still needed
    for usefulness; a fixture answer cannot accept that layer.
  - **P3-05 failure isolation:** provider loss/stale result blocks affected native
    disclosure. Continue text only with verifiably clean context, otherwise expose
    the block. Reconcile without second identity, stale fallback or duplicate actual
    work. Reuse P2 provider checks; assert the real native boundary's added behavior.
- Stop/handoff: source/identity/withdrawal failure blocks affected output regardless
  of checkpoint counts. Preserve partial results at a cap or scope decision; pass
  an engineering candidate only with required fixture evidence and visible live/user
  gaps. Actual installed integration and user acceptance remain separate gates;
  neither an internal checkpoint nor P3's code completion silently accepts M1.

### P4 — Resolve QQ Gateway Terms And Native Mac Fit

- Outcome/deliverable: exact gateway/installer/QQ version and intended-use eligibility,
  native install/coexistence/restore recipe and resource/lifetime observations;
  controlled account evidence only in separately authorized operator work.
- Reuse/inputs: external NapCat distribution and official Mac installer, current
  Shell/installer documentation and pinned custom license. No QQ protocol or custom
  installer; do not bundle gateway code into Chatpet by default.
- Change boundary: configuration and entry backup/restore only as the installer
  requires. Prefer documented native route; compare Docker only for an observed
  native/coexistence/maintenance gap. Two different accounts share Tencent storage,
  so documentation alone cannot establish safe long-term coexistence here.
- Owner/recipient/resources: proposed channel engineer and owner for account/entry
  authorization -> P6 integrator. Documentary/terms assessment occurs early; login
  waits do not hold P2/P3. Gateway rights, personal data and app changes are not
  authorized by this planning request; no speculative container is installed.
- Completion/acceptance: resolve applicable gateway terms; authorized probe checks
  original-entry restoration, different-account coexistence, login/reconnect/shutdown
  and one real two-account text exchange. Separate maintainer reports from observations.
- Stop/handoff: unresolved use rights or unacceptable native interference blocks
  that route; bring a bounded deployment alternative decision, not an automatic
  cloud/official-bot substitution. Hand P6 tested gateway facts and outcome limits.

### P5 — Desktop Candidate Gate, Then Selected-Route Delivery

P5 does not lock the hybrid architecture based on source availability. The existing
helper plus adapted dialog is a candidate; calling its bridge thin does not establish
lower development or maintenance cost. P8a contract invariants precede consumer work;
Voice implementation is not a dependency of text chat.

#### P5a — Bounded Combined-Path Probe

- Outcome/deliverable: one combined Mac helper/chat path, observed essential
  interaction results, concrete changed files/dependencies and a sized route decision.
  This is a feasibility result, not the desktop release.
- Reuse/inputs: S3 Swift/helper/protocol and S4 dialog/shared chat, P3 port and P8a
  design reservation. Use rights-cleared placeholder art, not legacy BigFish frames.
- Allowed delta: one WKWebView/dialog/Core bridge prototype within the existing
  helper. Preserve body/geometry/layout; implement no room, animation pipeline,
  second model path, generic IPC framework or full alternate shell.
- Owner/recipient/resources: proposed Desktop engineer -> user/P5b implementer;
  after P3. Apply row P5a and the default/model parameters in the
  [trial limit register](#trial-limit-register), with the shared evidence-based
  fix/recheck policy.
- Completion/acceptance: prove Chinese IME/Enter, focus and click-through boundaries,
  open/fold/reopen, one Core input/reply, helper reconnect and sleep/wake with the
  actual combined path. Record remaining display/accessibility work, dependency
  changes and estimated P5b effort/maintenance, not an unmeasured saving claim.
- Stop/decision: a required interaction failure, cap expiry or excessive unresolved
  bridge scope leaves the route unselected. Identify the actual gap, then choose
  one evidence-backed candidate that addresses it, at component or route level.
  Chinese input, native window behavior and bridge/maintenance cost can justify
  different choices. Use the existing source evidence first; whole-surfpet is an
  example, not the required fallback. Keep row P5a-alt's appraisal allowance and
  document gap-to-candidate fit, scope/licensing, expected delta and the smallest
  next proof. No second full prototype or automatic new shell/platform is authorized.
  An appraisal alone does not pass the selected route's essential interaction gate;
  scope its missing proof before P5b expansion. Route choice precedes delivery.

#### P5b — Deliver Only The Selected Desktop Route

- Outcome/deliverable: blue fish/compact Chinese chat/current-recent state, fold/open,
  reconnect and sleep/wake against real Core/Memory. It is the same identity and Agent.
- Reuse/inputs: P5a route decision, successful essential-path evidence for that
  selected candidate, exact version/diff estimate, P3 port and P8a common semantics;
  usable art with independent provenance. An alternative's documentary appraisal
  cannot substitute for its required interaction proof.
- Change boundary: complete only selected-route gaps; retain the selected candidate's
  verified reusable components. Original Helper layout/body/protocol is retained only
  where that route is still selected and appropriate. Preserve companion identity,
  data ownership, public Core/body semantics and explicit compatibility/migration
  obligations across routes; do not force a new candidate back onto old internals.
  No parallel full fallback product or Voice provider activation.
- Owner/recipient/resources: proposed Desktop integrator -> user and later consumers;
  after explicit P5a route decision. Before starting, bind a finite implementation/
  verification allowance from the measured delta; P5a does not supply unlimited effort.
- Completion/acceptance: finish required display scaling/multiple-display/basic
  accessibility, input/focus, helper loss/restart and eligible history cases; reuse
  P5a evidence where unchanged. User assesses placement/readability/comfort. Recent
  life shows actual available state and does not pretend Life is already delivered.
- Stop/handoff: route/interface change or allowance expiry stops affected work for a
  specific decision. Hand over one tested Desktop/body boundary and actual remaining
  limits; a working prototype alone cannot close the user acceptance gate.

### P6 — Adapt QQ Transport Into The Same Companion

- Outcome/deliverable: ordinary owner private text continues desktop/native topics,
  with correct routing, replay protection and inspectable actual send outcomes.
- Reuse/inputs: P4 accepted gateway route, P3 Core/Memory and P8a's reserved
  consumer boundary; P5b is needed for desktop-continuation acceptance, not initial
  QQ/native transport work. Use
  S5 lib/qq.js echo-correlated RPC, connection generation, owner filtering and durable
  dedupe. Existing Core intent/storage supplies the product ledger.
- Change boundary: replace whale/persona/private queues with fixed Core-native
  routing; freeze binding/account/recipient per send. No new OneBot protocol/client
  from scratch, whole bridge CLI/control suite, groups, singing or automatic final-
  turn forwarding. S11 sendPrivateAndWait is a transport fallback only if needed.
- Owner/recipient/resources: proposed channel integrator + owner for login -> user;
  after P4/P3, with P5b for desktop cross-entrance observation. Size the bounded
  transport/native join; account waits and gateway deployment remain prerequisites
  only of dependent QQ work. Use two internal checkpoints under that allowance:
  bound QQ/native text with fixed outcomes, then cross-entrance continuity/recovery.
  Do not label the second checkpoint passed while its Desktop input is unavailable.
- Completion/acceptance: actual two-account exchange, desktop/QQ continuity and
  correction, wrong-owner refusal, replay, concurrent inputs, disconnect, accepted-
  send timeout and account rebind. Socket flush is not confirmed gateway delivery;
  acknowledgement is not read receipt. User assesses real friend-chat continuity.
- Stop/handoff: lost message ID may make get_msg insufficient; validate supported
  history matching or retain unknown/manual resolution. Never blind-resend or
  retarget an old attempt. Hand Life one tested eligible contact outlet.

### P7 — Three Independently Usable Life Increments

Use P7a -> P7b -> P7c. Each closes its own complete user flow; later features do
not retroactively become an earlier exit gate. The implementer binds finite effort,
verification and runtime/model/contact limits for each subpackage before starting,
using observed upstream results. No undifferentiated Life development programme.

#### P7a — Requested Reading And Source-Backed Conversation

- Outcome/deliverable: user specifies a Bilibili item/question -> bounded reading ->
  source/coverage-backed answer -> eligible experience retained for later discussion.
  This usable reading flow does not claim autonomous life is complete.
- Reuse/inputs: P3 Core/Memory, S8 retrieval/API/login/subtitle/preview and existing
  resources; P5 view when used. Adapt scoped registration/cache and receipt/source
  mapping. Use S9 extractor/keyframes only for a failed essential coverage case.
- Owner/recipient/resources: proposed Bilibili integrator -> user/P7b; after P3 and
  working input/output. Bind exact content, account/data path and finite reading
  steps/time before live work. Extra ASR/FFmpeg/vision cost is a specific decision.
- Completion/acceptance: subtitle, no-subtitle and one visual question show actual
  modality/time coverage, partial/skip where unsupported, cancellation and unavailable-
  login behavior. Future recall cites eligible source; no crawler/parser rewrite.
- Stop/handoff: preview sprites are not full watching; login cannot create subtitles.
  Unsupported essential coverage returns a concrete fallback/data/cost decision,
  not a new extractor project. Hand over the bounded reader and actual coverage.

#### P7b — One Controlled Autonomous Pursuit Or Rest

- Outcome/deliverable: the fish chooses a pursuit/rest, performs bounded work through
  P7a, remembers actual experience, and can be interrupted, paused and resumed honestly.
- Reuse/inputs: P7a reader, P3 Memory, S6 timer/early-stop/alarm/tool/reconciliation
  patterns and existing Core admission/receipts. No diary/outreach engine prerequisite.
- Change boundary: one pursuit/check-in, commit-before-dispatch and actual-start
  reconciliation; owner priority and real limits replace advisory-only reminders.
  No extra scheduler, fail-open shared lock as authority or copied psychology formula.
- Owner/recipient/resources: proposed Life integrator -> user/P7c; after P7a.
  P7b owns its initial background-control conformance checkpoint: use actual native
  execution/Core admission to prove finite background step/time/concurrency limits,
  owner priority and cancellation/checkpoint outcomes before autonomous dispatch.
  P1's ordinary owner-turn checks are useful evidence but do not satisfy this gate.
  Bind a finite probe/implementation allowance and explicit external model allowance
  in the register first. A demonstrated small Core admission/adapter gap can receive
  a separately sized in-scope repair decision here; do not assume it was implemented
  in P1 or start a general scheduler/control framework. Failed gate blocks autonomy,
  while the healthy requested-reading flow remains available.
- Completion/acceptance: actual pursuit/rest, owner interruption, no-progress stop,
  pause/current-run cancellation status, restart before first step, expired wake
  collapse and allowance exhaustion. User can ask what happened and get real evidence.
- Stop/handoff: unbounded dispatch, unavailable required native control or false
  receipts blocks autonomy even if reading works. Report the actual capability gap
  and bounded repair/route options; no silent prompt-only substitute. Hand over
  pursuit/control/experience results; proactive contact stays off until P7c policy
  and its selected channel are verified.

#### P7c — Continuing Interests, Reflection And Selective Sharing

- Outcome/deliverable: actual experiences support a continuing interest or bounded
  review/diary; the fish can discuss it and optionally share once through an eligible
  chosen outlet without disrupting the owner.
- Reuse/inputs: P7b pursuits/receipts, S6 review structure and S2 evidence/derivation;
  P5 presentation only when Desktop is used, and P6 only if QQ is the chosen outlet.
  Optional S7/S12 pure contact logic is adapted only for a demonstrated gap in
  existing controls.
- Change boundary: source-bound interest/diary projection and one Core contact intent;
  quiet, pause and owner replies stay distinct. No second memory/self writer or timer.
- Owner/recipient/resources: proposed Life/interaction integrator -> user/operator;
  after P7b. Agree review/contact caps and destination before unsolicited delivery;
  silence is not contact-policy acceptance. A diary need not produce a notification.
- Completion/acceptance: continue an interest from distinct actual experience, rest
  without fabricated progress, suppress unsolicited contact under quiet, avoid duplicate
  Desktop/QQ sharing, and invalidate affected reflection after source correction/
  withdrawal. User judges continuity, truthful life and attention burden separately.
- Stop/handoff: stale derived disclosure or duplicated/unauthorized contact blocks
  that function; healthy conversation/reading is retained. Use reflection and sharing
  as separate internal checkpoints. If proactive sharing is not selected/verified,
  label reflection delivered and sharing deferred/not delivered; optional wording
  cannot imply that the contact capability passed. Hand P10 actual controls/sources,
  costs and remaining usability issues.

### P8 — Early Minimum Contract, Later Voice Experience Choice

#### P8a — Minimum Shared Voice Contract Reserved Now

This section is the current design reservation, prepared in v1.0 before Desktop/QQ
implementation. It is a candidate for content review, not implemented target types
or an accepted Voice experience. Map existing target types before the first affected
consumer change; do not make P1–P3 implement a Voice provider. P8b chooses engines,
voices, languages and interaction policies without silently changing this boundary.

Owner/recipient: proposed Core/Voice contract owner -> Desktop, QQ, Memory and
resource consumers. Deliverable: the common contract below plus operation/error/
absence mapping to the actual existing target types when that code work is authorized.
No provider setup, recording, synthesis, model request or audio dependency is needed
for this planning reservation. The present turn changes only this plan.

| Conceptual operation / owner | Minimum request and result | Invariant and consumer obligation |
| --- | --- | --- |
| Capability inspection / Voice | Supported input/output formats, advertised languages/profile revisions and independent ASR/TTS availability | Capability is not preparation or successful use. Missing Voice keeps text healthy; paths/credentials are not exposed to consumers. |
| Recognition / Voice | Stable job ID, attributed source-audio reference, companion/channel scope, selected provider/profile revision and cancellation handle -> transcript with source/format/coverage, provider confidence only if supplied, or actual failure/cancel outcome | Core validates attribution/admission. The recognition service itself never submits an Agent input; channel/Core may submit automatically only under the explicitly chosen policy and trusted owner/channel binding. |
| Synthesis / Voice | Stable job ID, eligible reply/text-source ID and revision, voice-profile revision, output format and cancellation handle -> source-bound audio artifact or actual failure/cancel outcome | Recheck current source-use eligibility; synthesis completion is not playback or transport success. No independent persona/model/Memory writer. |
| Inspect/cancel job / Voice | Job ID + trusted caller/scope and expected state revision -> current pending/running/completed/failed/cancel-requested/cancelled/unknown state, result reference and actual cancellation outcome | Duplicate request IDs are idempotent; stale/conflicting reuse fails. A cancellation request does not prove an external call stopped. Late audio cannot start itself. |
| Capture/play/stop / Desktop | Explicit device/user action; eligible artifact/reply/job correlation -> actual capture/playback/stop result and optional error | Desktop owns microphone and speaker lifetime and one playback owner. QQ input never starts Mac capture or playback. Stopping playback differs from Agent cancellation. |
| Acquire/send audio / QQ | Original media message/source identity or binding-frozen contact attempt + eligible audio -> attributed media or confirmed/failed/unknown transport result | QQ owns channel media; account/recipient cannot change per attempt. Unknown send cannot cause a blind resend/text fallback. It is not a read receipt. |
| Artifact/withdrawal use / Core resources + Memory | Scoped artifact/source/dependency references -> eligible bounded bytes/use lease or refusal/unknown | Core owns bytes; Memory owns source-use eligibility. Check before recognition submission, synthesis, new playback/send/replay as applicable; already heard/sent content is not recalled. |

Common envelope: trusted actor/scope comes from configured bindings, not model-
supplied approval; operations carry companion/channel/source/reply/job correlation
as applicable, protocol/profile/source revisions, bounded time/size and idempotency
keys. Map errors to the existing common contract: invalid, unauthorized, stale,
incompatible/unsupported, unavailable, limit-reached and uncertain effects remain
distinct. This table uses conceptual labels, not invented runtime service IDs.

Verification/exit: a contract walkthrough traces one Desktop recording and one QQ
voice input, an eligible reply through both outputs, an absent provider, delayed
cancel, stale source and unknown send. Each has an accountable owner and explicit
result. No conflicting writer, recognition-service-initiated Agent submission,
unapproved submission policy or inferred delivery is allowed. Channel/Core can
apply an explicitly selected submission policy, including bound-owner automatic
submission when chosen; this is not recognition-service authority. P5b/P6 must
consume these invariants; a needed material semantic change
returns here for an explicit revision before dependent work.

#### P8b — Choose The Experience And Providers Later

- Outcome/deliverable: selected initial mode, languages/voice, transcript submission,
  auto-play, local/cloud path and retention, plus exact mature-provider mapping to P8a.
- Reuse/inputs: P8a, S1 complete-recording ASR/capture/WAV, S5 TTS transport and S4
  playback arbitration; current Voice discussion. No repeat generic speech survey.
- Owner/recipient/resources: proposed Voice integrator + user -> P9 implementer;
  before P9, preferences may be collected earlier. Bind a finite selection/probe
  allowance; private account rights/performance are operator facts, not public evidence.
- Completion/acceptance: chosen providers cover the required modes/languages/data
  path and fit the P8a result/cancel/format contract; actual microphone/WebKit and
  installed recognition behavior are checked in P9. Missing evidence remains named.
- Stop/handoff: complete-recording/read-aloud is only the starting proposal.
  Real-time interruption, always-on capture, voice cloning and QQ calls need an
  explicit outcome decision and existing-provider fit review. Hand P9 one chosen
  scope/provider route and finite limits; unsupported modes do not trigger model training.

### P9 — Shared Voice Stage, Delivered Through Two Complete Entrances

P9 is a stage, not one executable implementation batch. Its entry gate is a
handoff-ready brief and finite allowance for P9a, then an observed-delta brief for
P9b, recorded in the trial register before each starts. Preserve common P8a source/
profile/job semantics; no separate Voice runtime or memory per channel. The shared
capability is delivered alongside the first useful entrance, not as a long generic
infrastructure project. M5 requires both entrances and cross-channel acceptance.

#### P9a — Shared Voice With A Complete Desktop Flow

- Outcome/deliverable: the chosen Desktop speech flow using the same companion and
  readable text, plus the reusable shared recognition/synthesis/profile/job port.
- Reuse/inputs: P8a/P8b choices and P5b; S1 configured ASR/capture/WAV/cancellation,
  S5 TTS transport/credentials/validation and S4 playback arbitration. This work
  does not require QQ readiness and does not introduce a speech engine or codec.
- Change boundary: necessary shared adapter and Desktop join; remove Han-only
  corruption and whale-specific admission, avoid an extra emotion call, and bind
  audio jobs/cache to eligible source/reply/profile revisions. Desktop owns devices
  and actual playback; text and Core keep their existing execution/Memory ownership.
- Owner/recipient/resources: proposed Voice/Desktop integrator -> user and P9b;
  before start, bind exact provider/data/mode, scoped changed files and finite
  implementation/verification/model allowance in the register from P8b/P5b evidence.
- Completion/acceptance: actual chosen input -> native reply -> selected playback,
  inspectable names/numbers/languages, approved submission policy, truthful independent
  ASR/TTS failures, no late/double playback after cancel, device/sleep/disable cleanup,
  source withdrawal and healthy text. Measure pipeline stages; user judges the voice.
- Stop/handoff: unsupported mode/language/data path returns a bounded mature-provider
  decision, not model training. Hand P9b one tested shared port/profile and reusable
  fault fixtures; no QQ claim follows from Desktop success.

#### P9b — QQ Voice Using The Same Shared Capability

- Outcome/deliverable: bound-owner QQ audio continues the same conversation through
  P9a's shared Voice, with readable text and actual media transport outcomes.
- Reuse/inputs: P9a port/profile, P6 gateway/text/receipt route and P8a/P8b policy.
  QQ supplies attributed media and format handling; it never starts the Mac microphone.
- Change boundary: QQ acquisition/format/submission and binding-frozen voice send,
  source/job correlation and unknown-result reconciliation. Reuse ASR/TTS rather
  than create another provider/client/Memory writer for the second channel.
- Owner/recipient/resources: proposed channel/Voice integrator -> user/operator;
  after the exact shared capability and gateway prerequisites pass. Bind the observed
  QQ-specific delta and finite trial/live allowance before beginning this subpackage.
- Completion/acceptance: real approved owner voice exchange and Desktop/QQ continuation,
  same configured profile, recognition/cancel failure, account rebind, uncertain send
  and source withdrawal. Unknown voice delivery cannot cause blind resend or duplicate
  text fallback. Verify shared job/source behavior across both consumers, reusing
  unchanged P9a evidence; user acceptance and gateway confirmation stay distinct.
- Stop/handoff: unavailable gateway pauses QQ acceptance without undoing healthy
  Desktop speech. Hand P10 observed channel costs/limits/retention and M5 evidence;
  cross-channel acceptance remains pending until actually observed.

### P10 — Recovery And Release Stage With Separate Deliverables

P10 is a stage container. P10a and P10b need separate handoff-ready briefs and
finite register allowances before execution, using the actual released module/
data set. Further split a demonstrated large recovery delta before committing it.
Each earlier increment still owns its minimum safe data protection; P10 cannot
postpone a safety requirement already needed for that increment's use.

#### P10a — Complete Supported Recovery And Verify It

- Outcome/deliverable: exact coverage/version manifest and supported backup/export/
  recovery paths for delivered state, with actual fault evidence. This includes any
  necessary recovery integration implementation; it is not a verification label
  hiding an unowned coordination project.
- Reuse/inputs: existing Core storage/resources, S2 backup/migration, SQLite snapshot
  primitives, provider state ports and each increment's recovery evidence. Select
  the actual installed module/schema set and owner-approved destination/retention.
- Change boundary: the minimum coverage/version/freeze/reconcile join needed for
  that data set; preserve current Memory withdrawal authority and actual delivery/
  execution outcomes. No general backup engine, universal coordinator for deferred
  modules or mandatory dashboard. The current partial Core snapshot stays labeled.
- Owner/recipient/resources: proposed data/recovery integrator with provider owners
  -> release operator/P10b. Size actual gaps before implementation and bind finite
  effort/verification/resource limits in the register. Unowned or oversized provider
  work returns a concrete subpackage decision rather than expand this stage silently.
- Completion/acceptance: disposable-copy restore, incomplete coverage, incompatible
  schemas, interrupted migration, provider loss and restart; restored content cannot
  revive withdrawals or rewrite real external outcomes. Observe actual quiescence/
  import/reconciliation. Unsupported/unsafe restore remains disabled and is not
  counted as delivered. Engineer evidence and owner acceptance remain separate.
- Stop/handoff: coverage/source-guard failure blocks the claimed recovery path.
  Preserve a compatible prior code/data pair and evidence. Hand P10b exact supported
  operations, limitations and tested schema/version/resource manifest.

#### P10b — Package, Observe Use And Hand Over Operations

- Outcome/deliverable: source-matching versioned package/config entry, validated
  install/upgrade path, operator guide and finite normal-use observation findings.
- Reuse/inputs: delivered flow evidence, existing DSH packaging/settings, P10a
  supported recovery manifest and exact host/provider versions. Include only the
  release scope actually implemented and agreed; missing features remain visible.
- Change boundary: release/package/install integration and operation guidance only.
  A newly discovered recovery/schema change returns to its owning P10a/provider
  work instead of being repaired invisibly inside an observation task.
- Owner/recipient/resources: proposed release integrator -> user as local operator;
  after relevant P10a paths. Bind finite install/verification effort, actual data/
  account permissions and a finite observation window/thresholds before starting;
  no public publication or resource commitment follows from this plan.
- Completion/acceptance: packed/installed artifact matches source, module/helper/
  host loss and upgrades show truthful availability and preserve identity/data under
  the supported recovery scope. Guide start/stop, Repo edits, correction/forgetting,
  quiet/pause, reconnect, export/recovery and upgrade. Observe cost/resource burden,
  recovery effort and actual user continuity/helpfulness/rhythm; report these layers
  separately rather than infer user value from test counts.
- Stop/handoff: install/recovery mismatch blocks its release claim; use-value issues
  become scoped changes, not an unlimited improvement loop. User decides result
  acceptance; unsupported recovery/features and remaining risks are explicit.


### Conditional Room Package — Only After Experience Selection

Retain the Desktop body/action/receipt boundary. If the user selects concrete
room interactions, evaluate adapting the existing bearyluo room renderer/action
engine under its own license rather than create a world engine. Review content,
assets and native-view fit at that trigger. Desktop remains the one body writer;
Life/Memory remain shared. Deliver only the selected interactions with actual
virtual receipts, restart/reconnect and user-value evidence. Staffing, effort and
release timing remain uncommitted; no speculative furniture/needs simulation now.

### Milestones And Function Coverage

| Milestone | Packages and complete result | Acceptance owner |
| --- | --- | --- |
| M1 Native useful companion | P1 -> P2 -> P3 under the first-batch envelope: native chat/tools and source-backed Memory. Fixture candidate, installed integration and user acceptance are separate gates; P4 is not required. | User; P1-01–03, P2-01–04 and P3-01–05 evidence identifies the achieved layer |
| M2 Desktop companion | P5a route decision -> P5b selected-route delivery, consuming the P8a early contract and M1 ports | User; probe result is separate from desktop acceptance |
| M3 Same QQ friend | P4 + P6, with P5b for desktop continuation: actual private chat, correction and transport recovery | Owner/account user; engineer distinguishes gateway/unknown outcomes |
| M4 Bounded life | P7a requested reading -> P7b controlled pursuit/rest -> P7c reflection/selective sharing; each has its own exit | User; reader, autonomy and reflection/contact evidence remain distinct |
| M5 Shared Voice | P8a/P8b -> P9a shared capability/Desktop flow -> P9b QQ join and cross-channel acceptance; each entrance has its own usable result | User; shared-port, device and real channel evidence remain distinct |
| M6 Daily use and handover | P10a supported recovery -> P10b package/install/use observation and handover for the exact delivered scope | User; recovery, installation and usefulness are separately accepted |

Every F01–F26 row has a package or explicit defer/exclude disposition in the reuse
review. Private account facts and selected experience details remain human inputs;
source inspection does not manufacture them. When probes pass, stop expanding
research and complete the owning useful increment.

## Acceptance, Operations And Change

Use four separate evidence labels: source/document inspection; controlled fixture;
real installed integration; user acceptance. Prior r1 specialist source inspection
and its applicability are retained in current reuse review r4; no independent
runtime evaluation was performed. An
implementer's self-check cannot become user acceptance, and this plan is not a
PM Advisor product-value test.

| Risk / observable trigger | Response, owner and recovery |
| --- | --- |
| Planning/infra expands without a useful result | Implementer shows current user flow and missing acceptance observation; remove unrelated prerequisites from the batch. Architecture/type completeness alone cannot close a milestone. |
| Old workbench/matter requirements reappear | User boundary and current native flow control scope. Preserve old data; require a concrete product use case before new UI/ledger work. |
| Native version or workspace authority is wrong | Stop affected dispatch/release, retain logs/package/config, restore a compatible package/data pair only under operator permission. Engineer owns diagnosis. |
| Memory context is stale or provider unavailable | Reject affected derived disclosure or rebuild/rebind to clean context; keep unaffected valid context usable. Never pretend a missing provider is ready. Memory/Core owners reconcile. |
| Bilibili input or QQ text attempts to change permissions | Treat content as attributed data; real tool/channel policy enforces scope. If host cannot provide required control, block that operation and revise the design. |
| Runaway autonomy, repeated failure or unwanted contact | Core closes admission under finite limits; pause/cancel/checkpoint truthfully. Repeated no-progress activity rests. User sets limits/contact destinations before live autonomy. |
| QQ timeout after possible success | Retain original intent/target and unknown state; reconcile supported receipts/history. If impossible, expose manual resolution instead of blind resend or automatic alternate-channel duplication. |
| Sleep, disabled module, lost helper or account | Stop/reconcile owned work; show actual unavailable state; restore snapshot without missed-autonomy burst, fabricated diary or second identity. |
| Upgrade/restore revives withdrawn information | Preserve current withdrawal/actual-outcome guards; verify schema/provider compatibility and backup before migration. Unsupported guarded restore remains unavailable. User owns backup destination/retention; engineer owns mechanism. |
| Daily experience is annoying or unhelpful despite passing checks | User adjusts or rejects behavior; retain observations, revise only affected choices and seek the relevant decision. Do not count tool calls as companionship value. |

Operational handover must explain start/stop, Repo edits, memory inspection/correction,
quiet versus autonomy pause, channel/account status, finite limits, source coverage,
backup/export/recovery and version upgrade. Credentials stay in trusted storage.
The user is the proposed local operator; component maintenance remains with the
implementing role until an explicit handover. Loss of a provider degrades that
capability, not the identity; a Core failure stops dependent work.

Replanning is required if the local DSH lifetime, ordinary QQ identity, sole Memory
writer or native execution path must change; a second runtime, new external action
scope, compulsory workbench or destructive migration also changes this draft's
scope. Routine implementation choices within a package do not require reopening
settled product goals.

## Planning Closeout And Retained Limits

This v0.14 synchronization imports PM Advisor v1.3 and its corrections to v1.2. P2 owns provider conformance/
patches with synthetic consumers; P3 alone owns actual Core/native source and
context integration, reusing those artifacts. Both have explicit internal
checkpoints under unchanged package allowances. P9a/P9b and P10a/P10b replace
single executable whole-stage assignments; their detailed entry briefs/limits are
required before work, without inventing distant estimates now.

The prerequisite table separates actual gates from serial priority; QQ waits do
not block ready Desktop/native reading. P7b owns its background-control checkpoint
rather than assume P1 proves it. P5b retains selected-route components and stable
public semantics, not unconditional old Helper internals. Voice recognition itself
cannot submit an Agent request, while channel/Core may apply the explicitly chosen
submission policy. Normal successful process stop and correctly reported stop
failure have separate conformance meanings. Routine setup repair follows the same
remaining-allowance/new-evidence rule as other in-scope repairs.

The trial register remains the sole numerical limit source; all prior ceilings,
default restrictions, retry policy, eight modules and F01–F26 goals are retained.
First batch remains P1–P3 and no implementation starts. Existing version pins,
file names, binding freezes, state distinctions and sole data authorities keep
their stated purposes; they are not replaced with unnecessary dynamic mechanisms.

The prior local [product plan](snapshots/plan-v0.13.md) and
[development proposal](snapshots/development-plan-v0.7.md) are preserved exactly.
PM Advisor v1.2/r3 and earlier engagement history remain at source commit `ef0fb56`.
Current reuse decisions and ownership refinements are in [review r4](reuse-review.md). This is documentation revision/self-check, not
new source/runtime validation, independent evaluation or user acceptance. No target
code, tests, dependencies, installation, accounts or personal data changed; no Pet
model request ran. These planning edits do not approve spend or target execution.

The current revision is ready for plan-content review. A later implementation
request may use its P1–P3 handoff with exact current targets/versions/resources and
explicit allowed actions, preserving valid permissions and stop/recovery terms.
No further survey or target work is scheduled by this document.
