# Pet Function Reuse Review

- Revision: r4, 2026-11-05, Asia/Saigon; supports [product plan v0.14](plan.md).
- Synchronization: PM Advisor plan v1.3 / reuse review r4 from Codex-PM Advisor
  commit `ef0fb56`. Only local navigation/provenance was adapted; no new component
  research, implementation or runtime acceptance is asserted.
- Input: retained source review and reviewed PM Advisor plan v1.2 (retained at source commit `ef0fb56`), existing Pet source/library
  at target checkpoint `ef0e1b7`, and cited current primary documentation.
- Scope: Source/document review of concrete adoption boundaries. No upstream
  dependency installation, build, test, model request, login or account operation.
- Ownership: This file owns detailed reuse evidence and F01–F26 dispositions.
  The plan owns recommended scope, decisions, sequencing and work packages.
- Review provenance: r1 used three bounded specialist inspections for Memory, Desktop/Voice and
  QQ/Bilibili. PM Advisor inspected Core/Life, rechecked consequential source
  findings and integrated the results. A later bounded whole-plan review checked
  package size and boundary consistency. r4 integrates its ownership/dependency/
  acceptance corrections, without new upstream/runtime evaluation. Exact
  r3 and earlier engagement research remain at source commit `ef0fb56`. Numerical
  trial limits and current work organization belong only to the plan.

## Recommendation And Meaning Of Reuse

Retain the implemented Core and native DSH path. Prefer Mnemosyne's existing
service for Memory, the existing QCYTSN Mac helper for Desktop, retrieval's
Bilibili client, DSH recognition and adapted dot speech/QQ transport. Adapt
world's life primitives rather than create a new scheduler. Custom work is the
specific connection between those components and the Pet's agreed data/control
boundaries. Do not implement another Bank, Agent runtime, QQ protocol, video
extractor, desktop body engine or speech engine by default.

- **U — Use:** keep an existing dependency/service/algorithm unmodified in its
  stated role. This does not mean untested personal installation is approved.
- **R — Retain:** use implemented Pet code; audit/fix the current flow rather
  than rebuild it. Existing code is not proof that every optional feature is needed.
- **A — Adapt:** named source or adapter is the base; the concrete delta below
  is necessary. Preserve the exact origin and license; do not install the whole
  upstream companion to obtain a small capability.
- **C — Custom join:** a product-specific operation that the inspected candidates
  do not supply under the required identity/source/permission contract. Reuse
  existing Core/native mechanisms first. This is not a general claim that no
  suitable implementation exists anywhere.
- **D/X — Defer/exclude:** no implementation package until the stated trigger,
  or an alternative is unsuitable for the current role.

These are source-backed recommendations. Operator probes still decide actual
host compatibility, account access, performance and the combined user experience.
A failed probe first identifies a narrow fix; it does not automatically authorize
replacement development. Pending user choices remain pending.

## Sources, Versions And Adoption Constraints

Pins refer to inspected code, not the latest available upstream release. Reuse
must bind the copied or installed version. Current online documentation is dated
2026-11-05 and can move independently of these sources.

| ID | Exact source | License / material adoption constraint |
| --- | --- | --- |
| S0 | Pet `ef0e1b7`; [notices](../../THIRD_PARTY_NOTICES.md) and [manifest](../../references/manifest.json) | Existing adaptations of whale delivery, dot reply/settings/tool patterns and world tool patterns are already attributed; preserve them |
| S1 | [DSH `8bd073392eef6f54e921a093b95076248eb08cbb`](https://github.com/deepseek-ai/deepseek-harness/tree/8bd073392eef6f54e921a093b95076248eb08cbb) | MIT source; reference package is 0.2.2-alpha.3, not the target's exact 0.2.2-rc.1 installed ABI |
| S2 | [Mnemosyne `796dc292367667d2f453885c12d09bec49f8327b`](https://github.com/canyueY/dsh-mnemosyne/tree/796dc292367667d2f453885c12d09bec49f8327b) | Root/service 2.0.0, Apache-2.0; retain LICENSE/NOTICE and third-party notices. Python >=3.10, FastAPI/Uvicorn/Pydantic/httpx stack; supervision is real operating cost |
| S3 | [QCYTSN Dafeiyu `084323845ab82b68d5388d5c638bec09d8544a8a`](https://github.com/QCYTSN/dsh-dafeiyu/tree/084323845ab82b68d5388d5c638bec09d8544a8a) | MIT code; [asset notice](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/ASSET_LICENSE.md) excludes archived legacy BigFish frames from MIT. Do not copy those frames; blue-fish artwork needs a separate usable source |
| S4 | [surfpet `d825d236a2afb760c15b9332eee3a8ccad1958a4`](https://github.com/Mieksido/surfpet/tree/d825d236a2afb760c15b9332eee3a8ccad1958a4) | MIT code; Windows-oriented Electron/Pixi shell and SurfCore IPC. Separately distributed skins/fonts are not cleared by source license |
| S5 | [dot `ff288f57a25becfe195201b02e4fc4726ae71a5b`](https://github.com/wz20/dsh-dafeiyu-dot/tree/ff288f57a25becfe195201b02e4fc4726ae71a5b) | 0.11.1, MIT adapter code; speech engines/models and other components retain separate terms |
| S6 | [world `d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f`](https://github.com/chenkezhen480/dsh-world/tree/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f) | MIT; package says 0.7.1 while earlier study quoted README 0.6.5. Bind the commit, not the higher filename/version. Whole package adds compaction/memory/ecosystem ownership we do not need |
| S7 | [heartbeat `a13557510607911c68e2759fb1b57ccf8430b895`](https://github.com/LittleBlackTong/dsh-plugin-heartbeat/tree/a13557510607911c68e2759fb1b57ccf8430b895) | 0.8.0, MIT; session/task heartbeat rather than complete companion life |
| S8 | [retrieval `5ffb27e040dc0e5d5461d6df913226a22b06aa9a`](https://github.com/2332239652/dsh-bilibili-retrieval/tree/5ffb27e040dc0e5d5461d6df913226a22b06aa9a) | 0.2.0, MIT, Node >=20, no runtime dependencies declared; host registration and global cache paths still need adaptation |
| S9 | [CZX Bilibili `c53af9dee30cf04ee759ac6857d5803196fb2a95`](https://github.com/CZX2244/dsh-bilibili/tree/c53af9dee30cf04ee759ac6857d5803196fb2a95) | 0.8.0, MIT code; optional FFmpeg/ASR/vision binaries, models and remote services are separate dependencies/data paths |
| S10 | [NapCat `98d781d19815d1625b24d717ce280ecf0a4f6d0c`](https://github.com/NapNeko/NapCatQQ/tree/98d781d19815d1625b24d717ce280ecf0a4f6d0c) | Custom Limited Redistribution License with author-permission and noncommercial clauses. Conditional external gateway candidate, not permission to vendor/bundle it. Resolve intended use rights before adoption |
| S11 | [QQ bridge `6e13f95415bf58c9534b4616ed074087dc5e5631`](https://github.com/TomoyoNatsume/dsh-qq-bridge/tree/6e13f95415bf58c9534b4616ed074087dc5e5631) | MIT source; useful fallback transport slice, not its whole CLI/control stack |
| S12 | [SurfCore `0deb8261afe4c31b3127759ee4de36a1439cf422`](https://github.com/Mieksido/surfcore/tree/0deb8261afe4c31b3127759ee4de36a1439cf422) | MIT own code; its license notice identifies separately restricted SnowLuma dependencies. Do not import its entire dependency/control plane |

Other screened alternatives: Fidget `7326ed68caaf273923f2b321a4a005215b269017`
(MIT, Rust/Tauri/ACP integration), AIRI `5951e0a7a94589097521a56e328359b5d1675a9e`
(MIT source, separate embodiment/runtime), and Mem0's official OSS REST source.
They remain alternatives for a named failed fit, not parallel implementations.
Yuuyuko-uu fish-buddy/qq-link use custom Yuuyuko-uu 1.2 terms, not MIT; avoid
vendoring them as the default when inspected permissive candidates cover the role.
The [earlier source study](reference-study.md) retains the broader research trail.

## Core, Configuration, Settings And Operations

**U/R:** DSH Agent/session/tools/SystemPrompt, Cordis services/effects, credentials
and native settings remain the carrier. The [official architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
corroborates this composition; it does not prove the installed plugin bindings.
Retain Pet `src/core/{plugin,agent,native,workspace,storage,execution}.ts`,
`src/console/{plugin,settings}.ts` and the existing settings client for the selected
flow. Node SQLite already supplies Core transactions; no new ORM/database is justified.

**A:** repair observed native/version/lifecycle gaps in those files, not a fresh
Core framework. Existing settings already adapt dot's native UI patterns; delivery
serialization already adapts whale's Promise-tail mechanism. Reuse and retain those
origins rather than rediscover or rewrite them. Use the actual native logs as
execution evidence before adding another ledger.

**C:** exact workspace/companion binding and the minimal joins to Memory/QQ/body
are product responsibilities. They cannot be obtained by installing another persona
plugin. Their scope is attribution, revision, admission and outcome translation.
Core's existing optional matters APIs/data are preserved but are not required by chat.

**Recovery:** `src/core/maintenance.ts` currently creates a partial domain snapshot
and deliberately disables guarded restore; that is not a complete live-data backup.
Reuse provider backup/export and SQLite's [Online Backup API or VACUUM INTO](https://www.sqlite.org/backup.html)
where the selected runtime exposes them; binding must be verified. The attempt to
read Node 24 backup documentation was unavailable, so this review does not assert
an exact Node backup API. Add only whole-product coverage/version/source guards.
Do not copy a running WAL database as if it were complete or build a backup engine.

## Memory: Adopt The Service, Adapt Its Boundary

**Primary:** S2 Mnemosyne service. `service/` is canonical; root `src/` is the DSH
adapter and `legacy/dsh-plugin/` is archival. Retain its Bank, observation/claim/
evidence persistence, versions, retrieval, derivation tracking and migration tools.
Use/adapt [MemoryClient](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/src/memory-client.js#L58)
for observations, memory CRUD/search, `/retrieve` and `/contexts/build` rather than
create a second retriever. Reuse [MemoryProcessHost](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/src/memory-process.js#L115)
for configured Python/data/token/loopback service supervision; confirm actual child
termination and readiness under DSH 0.2.2-rc.1.

**Exact changes:**

1. Replace the root adapter's broad `session/event` auto-capture with Pet's exact
   workspace/companion/source feed. [Capture source](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/src/index.js#L288)
   does not establish our scope. Install no parallel automatic collector/writer.
2. Pass known `expected_version` to the existing transactional version check in
   [service.py](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/core/service.py#L577).
   Map temporary preference, state change, correction and conflict to existing claim
   operations. Do not write another versioning/temporal-memory subsystem.
3. Obtain complete trusted dependency revision coverage from the provider's
   existing source/version authority before using [recheck_revisions](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/evidence/derivation.py#L363).
   Its `if have and have != want` check can accept a missing revision entry. Reject
   missing coverage as unknown in the adapter, or narrowly patch the helper. Expected
   references and adapter checks must not become another authoritative version store.
4. Treat [forget_memory](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/core/service.py#L631)
   as potentially partial: primary invalidation happens before best-effort cascade
   and tombstone writes; their errors are returned in the result. First repair or
   reuse the upstream operation's explicit completion status, idempotent retry and
   restart recovery using its existing persistence/transaction facilities. Do not
   start by designing a parallel withdrawal subsystem.

   If an unresolved cross-call operation still needs durable compensation, limit
   the record to an unfinished withdrawal: operation ID, target/upstream references,
   requested action, progress/completion evidence, last error and retry state. Reuse
   an existing upstream operation record when sufficient; otherwise the minimal
   record remains inside the same Memory adapter/provider authority. Record intent
   before a potentially partial call and keep affected derived use blocked until
   verified settlement; unrelated healthy memory remains usable.

   This operation metadata must not allocate independent source versions, copy
   tombstones into another authoritative store, or introduce a second eligibility
   algorithm. On verified completion, settle the pending restriction and obtain
   continuing eligibility from the provider's existing versions/tombstones/
   derivations. Retained completed metadata is audit history, not another source of
   truth. Failure/restart recovery cannot remove the pending restriction merely
   because the original caller ended.

   Core, chat/history, Life/diary and Voice/audio all ask the same Memory decision
   port. They do not independently infer validity from mirrored operation state.
   P2 proves provider-port partial-failure, retry/restart and post-settlement
   behavior using synthetic callers/consumer fixtures and necessary narrow patches.
   Its output is the reusable provider/client/patch/fixture artifact. It does not
   build a real Core capture listener or prove actual native/audio consumers.
   P3 alone maps actual Core/native inputs and protects native context/history,
   reusing that artifact; P9a/P9b later prove real audio use. No consumer rebuilds
   the provider's operation/completion logic. This is a division of planned work,
   not evidence that duplicate implementation already exists.
5. Reuse [JSONL interchange](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/migration/export_interchange.py#L13)
   and [backup utilities](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/cli.py#L18)
   with their actual coverage. Selected-memory export (default limit 500) is not
   proof of full Bank backup. Preserve current withdrawal guards across restore.

**C:** P3 owns actual Core source/channel mapping, durable acknowledgement and
native context/history use of the same Memory decision port. P2 owns provider-side
conformance and reusable patches, not that production join. Rebuild/rebind clean
native context when material becomes ineligible; Life/diary and audio joins belong
to their later packages and reuse this decision port. No second Bank, pending-
operation store or eligibility engine is built in each consumer.

**Alternatives:** dot's Markdown/queue/tombstone implementation is useful, but its
user-text-only support policy and lexical retrieval do not provide the same tool/
virtual-experience semantics unchanged. Do not activate a second memory writer.
[Mem0 OSS REST](https://github.com/mem0ai/mem0/blob/main/docs/open-source/features/rest-api.mdx)
is a credible fallback; the screened API does not establish dependency withdrawal
and native-context eligibility. No parallel Mem0 or smaller self-built Bank is
scheduled. Reopen only if the bounded Mnemosyne conformance/patch cost is unacceptable.

## Desktop: Extend An Existing Mac Helper

**A candidate:** S3 `native/macos/Sources/{PetController,PetView,AnimationModel,
LayoutStore,PetGeometry}.swift`, `main.swift`, `src/{helper-process,protocol}.js`.
Reuse transparent NSPanel, display geometry, drag/touch, layout persistence,
animation loading, JSONL protocol, ready/ping/shutdown/EOF and helper restart.
Replace upstream task/status reduction with our Core projection and package/data
paths. Do not write a new AppKit shell or window/body engine.

**A chat UI:** S4 [dialog HTML/TypeScript](https://github.com/Mieksido/surfpet/tree/d825d236a2afb760c15b9332eee3a8ccad1958a4/src/dialog),
`src/shared/chat.ts` and selected bubble/transcript styles. Its [IME guard](https://github.com/Mieksido/surfpet/blob/d825d236a2afb760c15b9332eee3a8ccad1958a4/src/dialog/index.ts#L290)
helps avoid submitting while Chinese composition is active. Candidate integration:
embed the adapted compact dialog in WKWebView alongside the existing helper;
replace Electron `window.pet` IPC with the existing versioned helper/Core boundary.

**C:** that compact-chat bridge/window extension and current/recent-life projection
are real gaps: S3 has status cards/open-WebUI, not editable compact chat; S4 is
coupled to SurfCore's transport/backend. New glue and combined WebKit/IME/focus
behavior and comparative adaptation cost are unmeasured. P5a must prove one
combined path and size its delta before P5b selects/implements the route; available
source alone does not establish a cheaper combination. Retain
existing layout/animation code; no fresh renderer/game framework is proposed.

**Fallback:** diagnose the actual failed fit, then choose one evidence-backed
candidate that addresses it under row P5a-alt in the plan's trial limit register.
A Chinese-input problem, a native-window problem and excessive bridge cost may
call for different component/route choices. Use existing source evidence first;
whole-surfpet is one option, not a mandatory fallback. Its Electron/Pixi and
Windows/SurfCore coupling, Fidget's Rust/Tauri/ACP and AIRI's broader platform
ownership remain costs to evaluate only if relevant to that specific gap.
Record gap-to-candidate fit, exact adaptation scope, licensing/maintenance and the
smallest missing proof. A bounded appraisal authorizes no second full prototype
or automatic platform change, and cannot substitute for selected-route interaction
validation. P5b follows that evidence-backed route decision and a finite allowance.
It retains the selected candidate's applicable parts and public identity/data/Core/
body semantics; original Helper layout/body/protocol is required only if that route
remains selected. A different accepted candidate is not forced onto old internals.

**Assets/Room:** S3's legacy BigFish artwork is excluded; use owner-supplied or
rights-cleared blue-fish placeholder art for the probe. Source MIT does not clear
all skins/fonts/models. Room retains a body/receipt seam; no furniture/world engine
is scheduled before its desired interaction is selected. The existing room project
is an adaptation candidate if that future scope is chosen, not a current build task.

## QQ: Existing Gateway And Transport, Narrow Product Join

The previous plan's assertion that no native macOS recipe existed was incorrect.
The current [official Shell guide](https://napneko.github.io/guide/boot/Shell) includes
macOS 12+, Intel/Apple Silicon and a Mac installer. Its [installer README](https://github.com/NapNeko/NapCat-Mac-Installer/blob/main/README.md)
describes QQ entry backup/switch/restore and different-account coexistence, while
not establishing long-running coexistence on this user's machine. A maintainer's
reported run is not our test. Assess native installation first; Docker is a fallback
for an observed gap, not a required new runtime.

**U conditional:** separately supplied NapCat gateway; never implement QQ protocol.
Its [pinned license](https://github.com/NapNeko/NapCatQQ/blob/98d781d19815d1625b24d717ce280ecf0a4f6d0c/LICENSE)
is not MIT: it contains author-permission, redistribution and noncommercial clauses.
Do not infer permission from the MIT installer or bundle NapCat code into Chatpet.
Intended-use terms are an adoption gate; this review does not resolve ambiguous rights.

**A primary:** S5 [lib/qq.js RPC/dedupe](https://github.com/wz20/dsh-dafeiyu-dot/blob/ff288f57a25becfe195201b02e4fc4726ae71a5b/lib/qq.js#L239),
owner filtering, connection-generation checks and uncertain-timeout behavior.
Replace its whale preset/persona/private queue with Core channel/native execution
and existing persistence. Preserve echo matching; never import group, singing,
sticker or automatic final-turn forwarding behavior just to get text transport.

**C:** stable incoming/contact IDs, exact owner/workspace mapping, fixed account/
recipient/binding revision per attempt, Core/Memory continuity and actual outcome
reconciliation. Gateway acknowledgement is not a human read receipt. If timeout
loses the returned message ID, `get_msg` alone cannot resolve it; test supported
history matching or retain explicit unknown/manual resolution.

**Fallback:** S11 [sendPrivateAndWait](https://github.com/TomoyoNatsume/dsh-qq-bridge/blob/6e13f95415bf58c9534b4616ed074087dc5e5631/src/onebot/client.ts#L189)
provides matching-echo transport. Its ordinary `sendPrivate` returns synthetic
success after socket flush; do not promote that result to confirmed delivery.
qq-link is reference-only for routing because its scope/terms add no demonstrated
advantage over the inspected MIT transport slice.

## Bilibili: Reuse Retrieval, Add Only Evidenced Coverage Fallback

**U algorithms/A integration primary:** S8 `lib/{protocol,tools,subtitle,frames,
login,qr}.js`. Reuse search/detail/comments, API handling, login/QR, timestamped
subtitle paging and preview-sprite retrieval. Adapt DSH registration, source scope,
credential ownership and global-home frame-cache/pruning paths to the chosen
Bilibili/Core ownership. Do not rewrite site parsing, signing, subtitles or QR.

[frames.js](https://github.com/2332239652/dsh-bilibili-retrieval/blob/5ffb27e040dc0e5d5461d6df913226a22b06aa9a/lib/frames.js#L1)
returns platform preview sprites whose timestamp metadata may be absent/unreliable.
It is not arbitrary real-time frames or full playback. [subtitle.js](https://github.com/2332239652/dsh-bilibili-retrieval/blob/5ffb27e040dc0e5d5461d6df913226a22b06aa9a/lib/subtitle.js#L197)
requires its authenticated track path; logging in does not create a missing track.

**A conditional fallback:** S9 [extractor.js](https://github.com/CZX2244/dsh-bilibili/blob/c53af9dee30cf04ee759ac6857d5803196fb2a95/lib/extractor.js#L1395)
and `lib/keyframes.js` only for essential no-subtitle or directed visual questions
that S8 cannot answer. Choose the ASR/vision data path explicitly: the upstream
ASR fallback can use remote Bcut; FFmpeg/local ASR/vision add separate costs.
Unsupported coverage returns partial/skip, not invented understanding. Literal
playback remains an open experience choice, not silently equated with extraction.

**C:** source/modality/time-range coverage -> Core action receipt -> eligible Memory
experience -> Life interpretation and optional contact. Add cancellation/admission
mapping using existing ports. No new crawler, content scheduler or second persona.
The bili-subagent report split is useful, but its whole plugin adds Python MCP,
scheduling/session selection and public comment/DM tools not needed by this route.

## Life: Reuse Timing And Recovery Primitives, Keep One Authority

**U/A:** S6 [alarmTimer.ts](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/src/life/alarmTimer.ts)
already supplies injected clock/timer operation, segmented waiting across sleep/
clock changes, backoff and stop. Reuse it as the timing primitive; make retry policy
configuration explicit rather than copying its numbers as user requirements.
Adapt `src/life/{alarm,earlyStop,tools}.ts` for a pursuit's next check-in, review and
rest, not a new scheduling framework.

Use `runtime.ts`'s pending wake/session/message correlation and actual-start
reconciliation pattern, but change two verified behaviors:

- [expect/send](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/src/life/runtime.ts#L157)
  may still dispatch after its persistence wrapper records failure. Core must commit
  admitted intent before dispatch, or expose failure without claiming recoverability.
- [spent](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/src/life/runtime.ts#L336)
  emits a budget reminder after usage; it is not a dispatch cutoff. Reuse existing
  Core allowance/admission and verify finite new-work limits/cancellation behavior.

**A optional contact logic:** S12 `src/purpose-engine.js` separates goal ownership
and evidence from I/O. Adapt only useful candidate/context/state handling under
Pet's semantic choices; exclude fixed pricing, schedules and social formulas.
S7 `lib/gate.js` supplies quiet/dedupe/no-signal patterns, but its manual bypass
and session task levels are not Pet permission. Its `proactive-lock.js` is explicitly
fail-open courtesy arbitration, not a concurrency or authorization lock. Reuse only
needed pure logic, not a second timer, signal subsystem or shared-global lock file.

**C:** one pursuit admission path, owner priority, truthful state/receipts,
Core-source-to-Memory experience, derived diary/interest eligibility and one contact
intent across Desktop/QQ. Reuse native Agent decisions, not fixed psychology.
Do not import world's global compaction, separate memory/self writer, ecosystem
bridges, default permissions or advisory-only budget as our runtime control.

P7b owns the background-native-control conformance checkpoint and any specifically
sized repair decision before autonomy. P1 ordinary conversation/stop evidence does
not establish background admission, owner priority or autonomous step limits. If
those controls fail, requested reading can remain usable while autonomy is blocked;
no advisory prompt or new general scheduler silently substitutes for them.

## Voice: Existing ASR And Adapted TTS Transport

**U:** S1 `packages/experimental/speech-to-text/{src/index.ts,src/types.ts,src/wave.ts}`
provides provider selection, complete-WAV transcription, cancellation and provider
registration lifecycle. It does not submit an Agent input automatically. Reuse the
configured existing provider and validate its exact installed availability/languages.
The inspected SenseVoice option lists Chinese/English/Cantonese/Japanese/Korean,
not Vietnamese; additional required languages trigger another existing-provider
comparison. No recognizer training/runtime is planned.

**A capture:** `packages/experimental/client-ui-voice-input/src/client/audio.ts`
provides media capture, late-permission cleanup and WAV encoding/resampling.
Adapt device/permission ownership and transport for the selected Mac view; verify
WebKit behavior before claiming reuse works there. QQ supplies its own attributed
media; it must not enable the Mac microphone.

**A TTS:** S5 [lib/speech.js](https://github.com/wz20/dsh-dafeiyu-dot/blob/ff288f57a25becfe195201b02e4fc4726ae71a5b/lib/speech.js)
supplies credential/fetch/timeout/abort, voice health and WAV validation/transport.
Reuse those portions, with a selected existing engine/service. Concrete changes:
remove Han-only filtering/Chinese-required rejection and hardcoded language; replace
whale/session admission and config keys; bind cache to reply/source/profile revisions
and current eligibility. Do not copy `speech-delivery.js`'s extra per-reply emotion
model call as a default requirement. Engine/model rights are separate from MIT code;
no Breeze model or provider is automatically selected by this review.

**A playback/C join:** S4 `src/main/chat-host.ts` has dialog/bubble arbitration.
Adapt the one-playback-owner behavior to the helper. Product jobs bind source audio
to input, eligible reply to synthesis, Desktop playback to receipts, and QQ media
send to transport outcome. Recognition completion, Agent stop, synthesis completion,
playback stop and a message already sent are different states.

Complete-recording/read-aloud is the proposed first scope. Real-time barge-in,
always-on capture, voice cloning and QQ calls are not implied. User choices of
languages/voice, transcript submission, auto-play, local/cloud and retention remain
necessary before provider activation. P8a (introduced in PM Advisor plan v1.0) reserves the common
source/job/profile/cancel/playback/send contract now, before Desktop/QQ changes;
P8b makes these later experience choices. P9a delivers shared Voice with the
complete Desktop flow; P9b joins QQ through that same capability. Recognition itself
never submits Agent input; channel/Core may use an explicitly chosen submission
policy, including bound-owner automatic submission when selected. Text remains
independently usable. The early design reservation is not target type implementation.

## F01–F26: Complete Function Disposition

| Function | Use/retain base | Exact adaptation / custom boundary | Decision and package |
| --- | --- | --- | --- |
| F01 Persona/profile/config | R S0 five-file authority and native settings | Fix only observed edit/validation issues; no STATE or replacement store | Retain / P1 |
| F02 Workspace/identity | R S0 exact workspace binding, DSH workspace/session | Native/source-install/rebind conformance; no new identity framework | Retain / P1 |
| F03 Conversation/tools | U S1 Agent/tools/logs; R native adapter | Necessary channel input/result projection only; no duplicate model path | Reuse / P1, P5–P6 |
| F04 Stop/reconcile | U native control/logs; R Core execution | Repair observed cancel/restart join, extend to background jobs only when used | Retain/adapt / P1, P7 |
| F05 Memory intake/recall | U S2 Bank/CRUD/retrieve/context and client | P2 provider-port conformance/patch; P3 actual native source mapping, no parallel Bank | Provider -> native join / P2–P3 |
| F06 Temporal correction | U S2 claim lifecycle and expected_version | P2 provider revision semantics; P3 native correction/race mapping using the same implementation | Adapt / P2–P3 |
| F07 Forgetting/derived use | U S2 derivation/tombstone stores | P2 provider completion/recovery; P3 actual native use; later Life/audio consumers reuse one Memory port, no second authority | Narrow patch -> owned joins / P2–P3, P7, P9a–P9b |
| F08 Memory durability/export | U S2 process host/migrations/SQLite utilities | P2 provider lifetime/recovery; P3 Core acknowledgement join; P10a complete supported coverage | Adapt / P2–P3, P10a |
| F09 Fish/compact chat | Candidate A S3 helper + S4 dialog UI | P5a measures combined behavior/cost; P5b adapts only the selected route | Candidate gate -> delivery / P5a–P5b |
| F10 Recent-life view | A existing dialog/card primitives; R Core state | C source-linked current/recent projection; no dashboard framework | Adapt/join / P5b, P7b–P7c |
| F11 Expanded Room | Existing room/body patterns remain reference | User selects interactions before adopting renderer/content; preserve seam | Defer / conditional Room |
| F12 Ordinary QQ | U conditional S10 external gateway; A S5 transport | Native installer/terms/coexistence gate, owner filter and Core-native mapping | Conditional adoption / P4, P6 |
| F13 Delivery/reconnect | A S5 echo/epoch/dedupe; R Core attempts | Freeze target, stable IDs, unknown result/history reconciliation; no synthetic confirmation | Adapt/join / P6 |
| F14 Bilibili reading | U S8 algorithms; A registration/cache; S9 conditional fallback | C coverage/receipt/source conversion; no parser/crawler rewrite | Requested reading / P7a |
| F15 Pursuits/rest | U native Agent; A S6 life tools | C single admitted pursuit with progress/rest meaning; no numeric psychology | Controlled autonomy / P7b |
| F16 Scheduling/restart | U/A S6 alarmTimer/earlyStop; R Core persistence | Commit before dispatch, correlate actual start, collapse expired opportunities | Controlled autonomy / P7b |
| F17 Reflection/interests/diary | A S6 review prompts/structure; U S2 evidence | C derived views with eligible roots; no separate self/memory writer | Reflection/interest / P7c |
| F18 Quiet/pause/contact | R Core controls; optional pure S7/S12 logic | P7b enforces finite dispatch/pause; P7c adds quiet/one contact intent; no fail-open lock authority | Adapt/join / P7b–P7c |
| F19 ASR | U configured S1 speechToText; A capture/WAV code | C attributed input/selected submission policy; Desktop then QQ uses shared recognition | Reuse/adapt / P8a–P8b, P9a–P9b |
| F20 TTS | A S5 transport + U selected existing engine | Shared source/profile-aware synthesis with Desktop, then QQ; no second channel engine | Adapt / P8a–P8b, P9a–P9b |
| F21 Voice lifecycle | A S4 playback arbitration + U provider cancellation | P9a device/playback; P9b transport and cross-channel acceptance; same job/source contract | Adapt/join / P9a–P9b |
| F22 Settings/health | R S0 DSH settings/client; U native slots | Add only operations needed by delivered provider; no mandatory workbench | Retain/adapt / owning package |
| F23 Shared artifacts/audio | R Core resources; U chosen existing native byte/attachment facilities where fit | C scope/source/retention mapping before use; do not repackage a generic media platform | Retain/join / P5, P7, P9–P10 |
| F24 Install/backup/upgrade | U DSH tooling/provider backup/SQLite primitives; R Core partial snapshot | Each increment owns needed protection; P10a recovery integration, P10b package/install/observation | Adapt/join / P1, P3, P10a–P10b |
| F25 Useful assistance | U native Agent/tools; U real Memory | C example-specific input/output/context only; follow-up ledger needs real scenario | Reuse / P3 |
| F26 Mandatory ledger/workbench | R existing data/APIs only | No scheduled expansion; ordinary chat cannot depend on it | Exclude compulsory scope / P1 |

## Readiness And Effect On Delivery

Source evidence now supports specific adoption candidates and bounded deltas for
every planned function. The important remaining gates are actual host/process
compatibility; Memory partial-withdrawal and missing-revision failure paths;
combined Mac helper/chat behavior and art; gateway terms/account coexistence and
unknown sends; real Bilibili coverage/data paths; Voice mode/provider/language.
These are not claims of failed runtime behavior in our environment.

Use the current plan's prerequisite table and named execution subpackages, not
the serial priority list as a mandatory dependency chain. P2 validates provider
semantics/patches through fixtures; P3 owns actual Core/native integration and
reuses those artifacts. Both use internal checkpoints under their unchanged
allowances. Normal child shutdown requires observed completion; a correctly
reported stop-failure test does not pass the normal lifecycle gate.

P8a reserves the common boundary early. P5a gates route choice before selected-
route P5b; P7b owns background-control conformance before autonomy. P7a/P7b/P7c
retain requested reading, controlled pursuits and reflection/contact. P9a/P9b
close Desktop and QQ Voice separately, using one shared capability. P10a completes
supported recovery integration/evidence; P10b closes package/install/use handover.
These stages need sized execution briefs/allowances before entry; no new distant
estimate or runtime conformance is asserted here. Each package records actual
reuse origins and only demonstrated custom gaps. Do not reopen the whole source
survey or build duplicate frameworks when the owning evidence settles a decision.
