# Pinned Reference Module And Integration Map

- Revision: v0.1, 2026-11-05, Asia/Ho_Chi_Minh.
- Scope: All 32 entries in the local reference manifest, mapped to the eight
  confirmed product modules. Core includes resource and maintenance facets;
  Room remains an optional Desktop capability.
- Status: Research and transfer judgments only. No component adoption, code
  implementation, upstream setup/build, account connection or live test.
- Ownership: This is the detailed project/module/connection appendix of
  [reference-study.md](reference-study.md). Product scope and contracts remain
  owned by their existing planning records.

## Reading This Map

All 32 local Git HEADs or archive source markers matched the manifest during
this pass. Archive markers identify the recorded archive; they do not verify
all extracted bytes. README headings/capability descriptions and selected
source entry points, adapters and connection paths were traversed. This is not
a complete line-by-line audit, dependency/license audit or behavioral test of
these repositories. Linked files identify the evidence and follow-through
entry points; selected reads do not establish every branch in those files.

The modules in this table are **our** responsibilities, not claims that every
upstream declares these module names. A useful pattern may contribute to a
module even when the upstream implementation keeps it in a larger file.

- **S:** selected source-level evidence for the stated mechanism/interface.
- **D:** documented capability/design; its implementation or complete path was
  not established in this pass.
- **—:** no specific transfer proposed from the inspected evidence. This does
  not assert that a repository has no such functionality.

No S/D mark establishes correctness, quality, Mac compatibility or acceptance.
ASR on video content informs media processing; it is not by itself our shared
conversational Voice. A visual bubble/speech clock is not a voice engine.

## Project By Module Matrix

| # / project | Core | Memory | Life | Desktop | QQ | Bilibili | Voice | Console |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 2332239652/dsh-bilibili-retrieval | S: per-session quotas; artifact cache bounds | — | — | — | — | S: search, subtitles, comments, sampled frames | — | S: login/channel/cache diagnostics |
| 2 Alterssss/dsh-bili-whale | S: serialized session delivery and persona acknowledgment | S: diary recovery pointers | S: rhythm, quotas and pending contact work | — | — | S: evidence collection and selective sharing | — | S: shared settings/status routes |
| 3 AstrBotDevs/AstrBot | S: platform event queue and staged processing | D: knowledge-base/provider separation | — | — | S: common platform adapter boundary | — | S: STT/TTS provider roster | D: dashboard and configuration |
| 4 CZX2244/dsh-bilibili | S: source artifacts and independently degraded extraction | — | — | — | — | S: multimodal extraction and coverage | S: media-ASR adapter comparison only | — |
| 5 LittleBlackTong/dsh-plugin-heartbeat | S: native inbox handoff and one pending beat | — | S: cheap signal checks, quiet/budget gates | — | — | — | — | S: reasoned pulse diagnostics |
| 6 LittleBlackTong/dsh-plugin-memory | S: scoped context/skill installation | S: inspectable pages, boot summaries and detail on demand | D: maintenance/recall opportunities | — | — | — | — | S: memory health and graph views |
| 7 Mai-with-u/MaiBot | S: message handler routing and per-session runtime lifecycle | S: bounded person-fact writeback queue | S: conversation rhythm/runtime management | — | D: platform-IO adapter ecosystem | — | — | S: separately owned HTTP/WebUI lifecycle |
| 8 MerZlin/dsh-pet-indesktop | S: attributed multi-instance status envelopes | — | — | S: event-driven native pet state aggregation | — | — | S: replaceable TTS provider interface | D: capability-oriented settings pages |
| 9 Mieksido/surfcore | S: shared character, context, contact and usage ownership | S: central inbox maintenance and scene projections | S: purpose proposals and shared contact gates | S: local pet API contract | S: OneBot bridge and DSH mapping | S: scheduled platform capabilities | S: shared audio/transport helpers | S: integrated controls and diagnostics |
| 10 Mieksido/surfpet | S: boot identity/cursor and reconnect boundary | — | — | S: thin pet, bubble and chat surfaces | — | — | S: exclusive local playback ownership | — |
| 11 NapNeko/NapCatQQ | S: transport action/echo correlation only | — | — | — | S: ordinary-account OneBot transport | — | — | D: gateway WebUI |
| 12 PC2005-cloud/dsh-pet | S: documented Host/client/helper API boundaries | S: serialized local chat persistence | D: ambient periodic chatter | S: shell/assets/chat interaction organization | — | — | S: recognition/synthesis route organization | S: typed Host configuration routes |
| 13 QCYTSN/dsh-dafeiyu | S: native-helper supervision and actual-status projection | — | — | S: protocol-driven native pet and display handling | — | — | — | S: configuration/status/asset endpoints |
| 14 TomoyoNatsume/dsh-qq-bridge | S: executor, router and session-version boundaries | D: memo-store interface separation | D: scheduled-task plumbing, not pursuit planning | — | S: dual transport adapters and routing/security gate | — | — | S: connection/settings and interaction controls |
| 15 YOYOLnFu/dsh-bili-pond | S: bounded worker/profile and output-file boundary | S: inspectable raw history facts, not governed recall | S: scheduled reading cycle | — | — | S: tool bridge, dedupe and reading/history wall | — | S: report/history/settings routes |
| 16 Yuuyuko-uu/dsh-bili-subagent | S: native parent/reader/report boundary | — | S: bounded reading opportunity pattern | — | — | S: reading worker and internal report | — | S: selected-session/settings/report controls |
| 17 Yuuyuko-uu/dsh-fish-buddy | S: bound native input and reply correlation | — | — | S: thin sensor/body client | — | — | S: local VAD/ASR and device lifecycle | S: binding/device/status settings |
| 18 Yuuyuko-uu/dsh-fish-memory | S: deletion-aware async merge/recovery pattern | S: dated recall, correction/deletion, traces and reviewed import | — | — | — | — | — | S: memory query/edit/import routes |
| 19 Yuuyuko-uu/dsh-qq-link | S: batch/single-flight input and message watermarks | — | — | — | S: OneBot input/reply linkage | — | S: QQ audio conversion and external ASR seam | S: session/connection/ASR configuration |
| 20 Yuuyuko-uu/dsh-speak-up | S: native Agent wake and source attribution | — | S: cheap cadence/quiet/busy checks | — | — | — | — | S: initiative settings and status |
| 21 bearyluo/dsh-dafeiyu-room | S: agent/revision-bound plans and action receipts | — | S: idle opportunity and bounded body choices | S: room simulation, local motion and observation | — | — | — | — |
| 22 c1overzz/dsh-bili-scroll | S: worker/tool-profile boundary and cancellation seam | — | S: scheduled finite browsing rounds | — | — | S: subtitle-first reading, MCP and reports | — | S: configuration/run/diagnostic routes |
| 23 canyueY/dsh-mnemosyne | S: supervised capability process and API boundary | S: observations, temporal claims and derivation mechanisms | — | — | — | — | — | S: memory health/settings/tool facade |
| 24 chenkezhen480/dsh-world | S: world scope, home binding and bridge/outlet separation | S: bounded original-source search/read | S: next-check-in, daily review and wake reconciliation | S: local bridge capability only | S: optional OneBot/SnowLuma adapter | — | — | S: shared controls and fault views |
| 25 chenluQwQ/astrbot_plugin_bilibili_ai_bot | S: layered event/action identity and persistent observer | S: scoped cross-plugin API | S: governed scheduled activity opportunities | — | S: identity binding and pre-reply memory integration | S: content/social event handling | D: media-understanding capabilities only | D: platform/activity WebUI |
| 26 deepseek-ai/deepseek-harness | S: native services/events/effects and Agent/session ownership | S: context/log ownership seam only | — | — | — | — | S: provider-pinned native ASR lifecycle | S: bundle/row configuration and cleanup |
| 27 moeru-ai/airi | S: typed event routing and shared chat runtime | D: companion-memory roadmap remains WIP | — | D: reusable presentation/domain packages | — | — | S: audio-source and playback ownership contracts | — |
| 28 omesser/fidget | S: host adapter and bounded completion boundary | S: readable user-owned fact file | S: optional director and local behavior separation | S: deterministic frame/body loop and native shell | — | — | — | D: character/connection/settings experience |
| 29 whyever77/dafeiyu-astrbot | S: common contact reservation and outcome reconciliation | S: episode provenance and existing writeback outbox | S: continuing projects, decision/review and rest | — | S: OneBot delivery receipts and contact scope | S: bounded reading/research tools | D: deployed media/voice chains | D: observatory and operational diagnostics |
| 30 wz20/dsh-dafeiyu-dot | S: native-session integration and source-bound delivery | S: correction/source/recall lifecycle integration | — | S: in-DSH widget/chat controls, not standalone Mac shell | S: paired OneBot/account checks and uncertain sends | — | S: shared ASR/TTS and expression layer | S: common settings/health/recovery |
| 31 xcisxc29/dsh-qq-plugin | S: normalized router, native stream and delivery queue | — | — | — | S: official-bot adapter pattern only | — | — | S: optional settings sharing one runtime |
| 32 yuanstarstar/dafeiyu-hub | S: common state/services and unfinished-thread record | S: human-readable persona/plan/progress projections | S: continue-before-new-work rhythm | — | — | S: bridge/tools plus creation pipeline seams | — | S: common Store-backed workbench |

## How Connections Actually Work

A shared protocol, shared host, code fork and design analogy are different
relationships. Most entries are independent applications/plugins; they are
not a preconnected product bundle.

| Relationship | Evidence and mechanism | Meaning for our study |
| --- | --- | --- |
| surfpet -> SurfCore | Local endpoint/credential discovery, HTTP calls and long-poll events; Electron IPC stays inside the client | An actual companion-client interface to study, including reconnect and playback ownership. Shared character does not prove shared native-Agent execution. |
| heartbeat <-> plugin-memory | Both implement a versioned shared cooldown-file protocol; neither imports the other's service | An actual cross-plugin courtesy convention, not an atomic cross-process admission authority. |
| scroll -> subagent | The subagent README identifies scroll 0.1.10 as its fork base; the currently pinned trees are later/different snapshots. Both retain Python MCP/tool infrastructure, but subagent changes parent/reader/result flow | Code lineage and alternative orchestration, not two runtime services that must be installed together. |
| pond / scroll / subagent -> Python Bilibili MCP | Each inspected checkout vendors a Python MCP server and an internal stdio client | Significant duplicated capability; compare one connector boundary rather than stack three independent schedulers. This does not establish identical server revisions or full fork lineage for pond. |
| QCYTSN Dafeiyu and Room -> DSH | QCYTSN projects real Agent state to a supervised helper; Room adds environment/tools to the original Agent and runs its own simulation | Shared hosting/complementary designs. Inspected Room imports do not establish a mandatory direct QCYTSN-helper RPC. |
| DSH Mnemosyne adapter -> Python service | Child readiness metadata/dynamic address plus authenticated HTTP; optional MCP gateway | A real cross-process memory boundary. Core application state and the Bank do not share a transaction automatically. |
| AstrBot BiliBot -> AstrBot / peer plugins | Plugin registration/hooks, an existing dispatcher plus persistent observer, get_registered_star and memory_api object calls | In-process API composition. It does not justify importing another platform runtime into DSH. |
| dafeiyu-astrbot -> external capabilities | Plugin context API, existing memory outbox, MCP SSE/streamable HTTP and deployment-specific tunnels | A deployed-system reference with real seams; repository presence is not proof all external components are contained locally. |
| QQ adapters -> gateway | OneBot WebSocket is a common boundary; NapCat and SnowLuma are distinct gateway implementations. xcisxc29 uses Tencent's official bot API instead | Transport interoperability is a candidate, not proof of tested interchangeability/account compatibility. Ordinary-account requirements still govern selection. |
| Fidget -> Harness | ACP stdio goes out to an attached Harness; MCP supplies callback capabilities | Suitable external-host adapter example. Our in-process native DSH path has different costs and ownership. |
| AIRI packages / server | Typed WebSocket event delivery, shared frontend/domain stores and audio pipeline contracts | Reusable decomposition ideas; this is another product runtime, not a DSH module bundle. |

### Repeated Connection Patterns And Their Limits

1. **Native host service calls:** pass explicit requests/results to a service;
   inject real dependencies and release registrations with host effects. DSH,
   dot and Room illustrate this well. Host hooks/events still require exact
   scope and dispatch semantics; no observer event is durable acknowledgment.
2. **Tool/context integration:** expose a bounded capability and return evidence
   to the continuing Agent. Retrieval, extraction, Room and memory tools differ
   from an autonomous plugin independently generating/sending final replies.
3. **Authenticated local API:** put a stable request/response boundary between
   host and helper/service, retaining identity, version and correlation. Surfpet,
   fish-buddy and Mnemosyne show different directions and lifecycle ownership.
4. **Supervised child protocol:** stdio or HTTP conveys readiness/work/results;
   the owner must reconcile uncertain work and dispose its own children. QCYTSN,
   Python MCP wrappers and Mnemosyne demonstrate different versions of this.
5. **File handoff:** JSONL feeds, shared Markdown, cooldown files and report paths
   are inspectable and loosely coupled. They require writer ownership, scope,
   revisions/watermarks and recovery. File existence/rename alone does not prove
   authorization, complete processing or exactly-once external delivery.
6. **Separate worker/runtime:** headless DSH, bounded subagents, ACP Harnesses
   and another whole chatbot framework have different tool/context/permission
   scopes. Similar model outputs do not make their state or identity continuous.

## Per-Project Transfer And Connection Notes

### 01. 2332239652/dsh-bilibili-retrieval

- Pinned commit: `5ffb27e040dc0e5d5461d6df913226a22b06aa9a`.
- Module contributions: Core — S: per-session quotas; artifact cache bounds; Bilibili — S: search, subtitles, comments, sampled frames; Console — S: login/channel/cache diagnostics.
- Connection: Cordis injects tools; tools call an in-process BiliClient over HTTPS. Optional webServer mounts the panel; optional systemPrompt adds use guidance. Anonymous and authenticated request channels have separate limits.
- Transfer judgment and limits: Candidate content connector and diagnostic patterns. Sampled storyboard frames and timestamped subtitles do not establish full viewing; lexical query filtering is not semantic judgment.
- Evidence / follow-through entry points: [index.js](../../references/sources/2332239652/dsh-bilibili-retrieval/index.js), [lib/protocol.js](../../references/sources/2332239652/dsh-bilibili-retrieval/lib/protocol.js), [lib/tools.js](../../references/sources/2332239652/dsh-bilibili-retrieval/lib/tools.js).
- Manifest license-file pointers: `LICENSE`.

### 02. Alterssss/dsh-bili-whale

- Pinned commit: `8b0009f8ce2ebdc421afcb2e727b19ac18912ec6`.
- Module contributions: Core — S: serialized session delivery and persona acknowledgment; Memory — S: diary recovery pointers; Life — S: rhythm, quotas and pending contact work; Bilibili — S: evidence collection and selective sharing; Console — S: shared settings/status routes.
- Connection: The host plugin composes a scheduler, credentials/auth and one session-delivery queue; sessionController creates/prompts the selected session. CLI/tool helpers share files, credentials, diary and pending state with that host workflow.
- Transfer judgment and limits: Borrow continuing experience and delivery serialization. Own timers, session rotation, social writes, fixed cadence and account-specific quotas need replacement or explicit selection. Prompt injection of diary paths is not verified recall.
- Evidence / follow-through entry points: [lib/index.js](../../references/sources/Alterssss/dsh-bili-whale/lib/index.js), [lib/scheduler.js](../../references/sources/Alterssss/dsh-bili-whale/lib/scheduler.js), [lib/session-delivery.js](../../references/sources/Alterssss/dsh-bili-whale/lib/session-delivery.js).
- Manifest license-file pointers: `LICENSE`, `NOTICE.md`.

### 03. AstrBotDevs/AstrBot

- Pinned commit: `f926af99ec5f8bd85b64413f8bfad55da76ef73b`.
- Module contributions: Core — S: platform event queue and staged processing; Memory — D: knowledge-base/provider separation; QQ — S: common platform adapter boundary; Voice — S: STT/TTS provider roster; Console — D: dashboard and configuration.
- Connection: PlatformManager constructs adapters around a shared asyncio event queue. PipelineScheduler processes an AstrMessageEvent through ordered coroutine/generator stages with stop propagation. ProviderManager manages separate model, embedding, STT and TTS providers.
- Transfer judgment and limits: Platform/framework reference, not another runtime to install beside DSH. A knowledge base is not our governed companion Memory. Plugin/provider lifecycle and failure semantics must be mapped to DSH, not copied as a second loader.
- Evidence / follow-through entry points: [astrbot/core/platform/manager.py](../../references/sources/AstrBotDevs/AstrBot/astrbot/core/platform/manager.py), [astrbot/core/pipeline/scheduler.py](../../references/sources/AstrBotDevs/AstrBot/astrbot/core/pipeline/scheduler.py), [astrbot/core/provider/manager.py](../../references/sources/AstrBotDevs/AstrBot/astrbot/core/provider/manager.py).
- Manifest license-file pointers: `FIRST_NOTICE.en-US.md`, `FIRST_NOTICE.ja-JP.md`, `FIRST_NOTICE.md`, `FIRST_NOTICE.ru-RU.md`, `LICENSE`.

### 04. CZX2244/dsh-bilibili

- Pinned commit: `c53af9dee30cf04ee759ac6857d5803196fb2a95`.
- Module contributions: Core — S: source artifacts and independently degraded extraction; Bilibili — S: multimodal extraction and coverage; Voice — S: media-ASR adapter comparison only.
- Connection: Cordis registers bilibili_extract/login/diagnostic tools. The extractor calls platform HTTPS APIs, optionally invokes ffmpeg/local ASR subprocesses, and can call a separate vision endpoint. Structured output and frame/transcript files return to the main Agent.
- Transfer judgment and limits: Candidate read/coverage implementation. Media transcription is not the shared conversational Voice module; automatic remote ASR, video downloads, model endpoints and dependencies are not inherited.
- Evidence / follow-through entry points: [lib/index.js](../../references/sources/CZX2244/dsh-bilibili/lib/index.js), [lib/extractor.js](../../references/sources/CZX2244/dsh-bilibili/lib/extractor.js), [lib/keyframes.js](../../references/sources/CZX2244/dsh-bilibili/lib/keyframes.js).
- Manifest license-file pointers: `LICENSE`, `THIRD_PARTY_NOTICES.md`.

### 05. LittleBlackTong/dsh-plugin-heartbeat

- Pinned commit: `a13557510607911c68e2759fb1b57ccf8430b895`.
- Module contributions: Core — S: native inbox handoff and one pending beat; Life — S: cheap signal checks, quiet/budget gates; Console — S: reasoned pulse diagnostics.
- Connection: Agent/session events and optional session projections feed sensors -> rhythm -> gate -> runtime. Runtime calls native followup or replaces a queued beat. Heartbeat and the sibling memory plugin cooperate through proactive-cooldown.json rather than service imports.
- Transfer judgment and limits: Borrow opportunity detection and explainable silence. The shared cooldown is courtesy arbitration with fail-open paths, not a durable dispatch lock. Task projections do not replace owner commitments.
- Evidence / follow-through entry points: [lib/index.js](../../references/sources/LittleBlackTong/dsh-plugin-heartbeat/lib/index.js), [lib/runtime.js](../../references/sources/LittleBlackTong/dsh-plugin-heartbeat/lib/runtime.js), [lib/proactive-lock.js](../../references/sources/LittleBlackTong/dsh-plugin-heartbeat/lib/proactive-lock.js).
- Manifest license-file pointers: `LICENSE`.

### 06. LittleBlackTong/dsh-plugin-memory

- Pinned commit: `7bf77d30de57597941ec8c357c9636e44d89c2ad`.
- Module contributions: Core — S: scoped context/skill installation; Memory — S: inspectable pages, boot summaries and detail on demand; Life — D: maintenance/recall opportunities; Console — S: memory health and graph views.
- Connection: Cordis systemPrompt/skills/agents connect boot projection and a registered memory protocol. Agent events track page access; skill/CLI operations use a Markdown store. HTTP routes expose the same store as health/views; maintenance can trigger an auto-Git commit. Shared cooldown coordinates optional initiative.
- Transfer judgment and limits: Borrow transparent views and maintenance seams. Default shared directory, automatic commits, persona defaults and latest-active-session routing are not selected. Markdown workflow alone does not enforce our correction/withdrawal/use protocol.
- Evidence / follow-through entry points: [lib/index.js](../../references/sources/LittleBlackTong/dsh-plugin-memory/lib/index.js), [lib/boot.js](../../references/sources/LittleBlackTong/dsh-plugin-memory/lib/boot.js), [lib/autocommit.js](../../references/sources/LittleBlackTong/dsh-plugin-memory/lib/autocommit.js).
- Manifest license-file pointers: `LICENSE`.

### 07. Mai-with-u/MaiBot

- Pinned commit: `c6429547af711555e3d4d1b8d04b413572cb616c`.
- Module contributions: Core — S: message handler routing and per-session runtime lifecycle; Memory — S: bounded person-fact writeback queue; Life — S: conversation rhythm/runtime management; QQ — D: platform-IO adapter ecosystem; Console — S: separately owned HTTP/WebUI lifecycle.
- Connection: Main registers message_process/echo handlers on a message server and starts shared services. HeartflowManager creates one Maisaka runtime per eligible session under per-session locks and shuts them down coherently. MemoryFlow queues evidence-backed person-fact work; WebUI mounts on a separate HTTP service.
- Transfer judgment and limits: New selected-code evidence beyond the earlier README study: useful session lifecycle and async writeback patterns. Social/conversation rhythm is not evidence of our self-directed pursuit planner. Do not introduce MaiBot runtime, its global services or psychological constants into DSH.
- Evidence / follow-through entry points: [src/main.py](../../references/sources/Mai-with-u/MaiBot/src/main.py), [src/chat/heart_flow/heartflow_manager.py](../../references/sources/Mai-with-u/MaiBot/src/chat/heart_flow/heartflow_manager.py), [src/services/memory_flow_service.py](../../references/sources/Mai-with-u/MaiBot/src/services/memory_flow_service.py).
- Manifest license-file pointers: `LICENSE`.

### 08. MerZlin/dsh-pet-indesktop

- Pinned commit: `34d810b1eadd98d00e7cb9b3b51428a45b5bf03e`.
- Module contributions: Core — S: attributed multi-instance status envelopes; Desktop — S: event-driven native pet state aggregation; Voice — S: replaceable TTS provider interface; Console — D: capability-oriented settings pages.
- Connection: A DSH Host bridge subscribes to Agent/session events and batches attributed records into per-process JSONL files with a boot UUID. The Python desktop consumes normalized status; native lifecycle and local presentation remain outside DSH. A common TTS provider interface separates engines.
- Transfer judgment and limits: Borrow state attribution, lifecycle/display cases and provider boundaries. A file event feed is an observation channel, not durable owner chat/delivery. Existing local chatbot/memory and PySide6 runtime are separate choices.
- Evidence / follow-through entry points: [integrations/dsh-pet-bridge/index.js](../../references/sources/MerZlin/dsh-pet-indesktop/integrations/dsh-pet-bridge/index.js), [pet/agent_link/dsh_state.py](../../references/sources/MerZlin/dsh-pet-indesktop/pet/agent_link/dsh_state.py), [pet/tts/base.py](../../references/sources/MerZlin/dsh-pet-indesktop/pet/tts/base.py).
- Manifest license-file pointers: `LICENSE`, `THIRD_PARTY_NOTICES.md`.

### 09. Mieksido/surfcore

- Pinned commit: `0deb8261afe4c31b3127759ee4de36a1439cf422`.
- Module contributions: Core — S: shared character, context, contact and usage ownership; Memory — S: central inbox maintenance and scene projections; Life — S: purpose proposals and shared contact gates; Desktop — S: local pet API contract; QQ — S: OneBot bridge and DSH mapping; Bilibili — S: scheduled platform capabilities; Voice — S: shared audio/transport helpers; Console — S: integrated controls and diagnostics.
- Connection: DSH plugin mounts APIs, schedules work and maintains shared character/memory files. A separately supervised bridge connects SnowLuma OneBot WebSocket to DSH HTTP session.prompt/events.mux and exposes MCP tools. Pet clients use authenticated local HTTP/polling. Producers append a memory inbox; the plugin maintains projections.
- Transfer judgment and limits: Main product-ownership reference, not an installation bundle. Pet chat uses direct llm.stream and separate history; bridge has substantial coupling. Windows/SnowLuma setup, independent timers, fixed drives/weights/prices and complete control plane are not adopted.
- Evidence / follow-through entry points: [plugins/surfcore/lib/index.js](../../references/sources/Mieksido/surfcore/plugins/surfcore/lib/index.js), [src/bridge.js](../../references/sources/Mieksido/surfcore/src/bridge.js), [plugins/surfcore/lib/pet-chat.js](../../references/sources/Mieksido/surfcore/plugins/surfcore/lib/pet-chat.js), [src/voice-core.js](../../references/sources/Mieksido/surfcore/src/voice-core.js), [docs/guides/ARCHITECTURE.md](../../references/sources/Mieksido/surfcore/docs/guides/ARCHITECTURE.md).
- Manifest license-file pointers: `LICENSE`.

### 10. Mieksido/surfpet

- Pinned commit: `d825d236a2afb760c15b9332eee3a8ccad1958a4`.
- Module contributions: Core — S: boot identity/cursor and reconnect boundary; Desktop — S: thin pet, bubble and chat surfaces; Voice — S: exclusive local playback ownership.
- Connection: Electron renderer talks through preload IPC to main-process chat/window services. Main discovers SurfCore endpoint/credential, calls HTTP history/chat/status and long-polls events. bootId/cursor track connection generations; chat and bubble audio-start signals arbitrate playback.
- Transfer judgment and limits: Direct surfpet -> SurfCore connection is evidenced. Borrow transport/presentation separation; do not adopt Electron, credential-bearing media handling or live cursor replay policy as durable delivery. It is not a standalone persistent companion Core.
- Evidence / follow-through entry points: [src/main/surfcore.ts](../../references/sources/Mieksido/surfpet/src/main/surfcore.ts), [src/main/chat-host.ts](../../references/sources/Mieksido/surfpet/src/main/chat-host.ts), [src/preload/preload.ts](../../references/sources/Mieksido/surfpet/src/preload/preload.ts).
- Manifest license-file pointers: `LICENSE`.

### 11. NapNeko/NapCatQQ

- Pinned commit: `98d781d19815d1625b24d717ce280ecf0a4f6d0c`.
- Module contributions: Core — S: transport action/echo correlation only; QQ — S: ordinary-account OneBot transport; Console — D: gateway WebUI.
- Connection: QQ/NTQQ core events feed OneBot event conversion and registered network adapters. HTTP, forward/reverse WebSocket and SSE implementations expose action calls; WebSocket action handlers route params through an action map and echo correlated results.
- Transfer judgment and limits: Candidate external gateway, not assistant/persona/memory. Mac login/coexistence and actual media/send receipts remain untested. Mixed project/native-component licenses require exact later review.
- Evidence / follow-through entry points: [packages/napcat-onebot/index.ts](../../references/sources/NapNeko/NapCatQQ/packages/napcat-onebot/index.ts), [packages/napcat-onebot/network/websocket-server.ts](../../references/sources/NapNeko/NapCatQQ/packages/napcat-onebot/network/websocket-server.ts), [README.md](../../references/sources/NapNeko/NapCatQQ/README.md).
- Manifest license-file pointers: `LICENSE`.

### 12. PC2005-cloud/dsh-pet

- Pinned commit: `0e6465f29bb89b386390ba0f14fb86fa1bc656d0`.
- Module contributions: Core — S: documented Host/client/helper API boundaries; Memory — S: serialized local chat persistence; Life — D: ambient periodic chatter; Desktop — S: shell/assets/chat interaction organization; Voice — S: recognition/synthesis route organization; Console — S: typed Host configuration routes.
- Connection: Host routes coordinate client requests, chat memory, rendering assets and native helper functions. Chat generation assembles local persona/history into ctx.llm, separately from native Agent turns. Electron helper/client use the Host API and local IPC; voice and attachment routes are explicit.
- Transfer judgment and limits: Useful visual/asset/API/provider patterns. Separate chat history and direct model path do not satisfy shared native-Agent continuity. Periodic chatter is not our Life planner. Source and character art have distinct terms.
- Evidence / follow-through entry points: [dsh-pet/src/host/index.ts](../../references/sources/PC2005-cloud/dsh-pet/dsh-pet/src/host/index.ts), [dsh-pet/src/host/chat.ts](../../references/sources/PC2005-cloud/dsh-pet/dsh-pet/src/host/chat.ts), [dsh-pet/src/host/plugin/chat-memory.ts](../../references/sources/PC2005-cloud/dsh-pet/dsh-pet/src/host/plugin/chat-memory.ts), [dsh-pet/src/host/routes/voice.ts](../../references/sources/PC2005-cloud/dsh-pet/dsh-pet/src/host/routes/voice.ts).
- Manifest license-file pointers: `LICENSE`.

### 13. QCYTSN/dsh-dafeiyu

- Pinned commit: `084323845ab82b68d5388d5c638bec09d8544a8a`.
- Module contributions: Core — S: native-helper supervision and actual-status projection; Desktop — S: protocol-driven native pet and display handling; Console — S: configuration/status/asset endpoints.
- Connection: A DSH plugin reduces Agent/session events into companion status and sends versioned newline JSON through a child process stdin/stdout. Mac helper observes EOF and exits. Optional webServer routes expose configuration, events, balance and assets.
- Transfer judgment and limits: Main host/helper lifecycle reference. It is primarily a status companion; neither a complete private-assistant conversation nor durable memory follows from its animations. Hardware UX remains untested.
- Evidence / follow-through entry points: [src/plugin.js](../../references/sources/QCYTSN/dsh-dafeiyu/src/plugin.js), [src/helper-process.js](../../references/sources/QCYTSN/dsh-dafeiyu/src/helper-process.js), [src/protocol.js](../../references/sources/QCYTSN/dsh-dafeiyu/src/protocol.js), [native/macos/Sources/main.swift](../../references/sources/QCYTSN/dsh-dafeiyu/native/macos/Sources/main.swift).
- Manifest license-file pointers: `ASSET_LICENSE.md`, `LICENSE`.

### 14. TomoyoNatsume/dsh-qq-bridge

- Pinned commit: `6e13f95415bf58c9534b4616ed074087dc5e5631`.
- Module contributions: Core — S: executor, router and session-version boundaries; Memory — D: memo-store interface separation; Life — D: scheduled-task plumbing, not pursuit planning; QQ — S: dual transport adapters and routing/security gate; Console — S: connection/settings and interaction controls.
- Connection: Cordis plugin builds MessageRouter, AccessGate, an outbound transport, interaction handlers and a DSH executor. onMessage routes normalized input to handlers; the executor adapts Agent-loop/preset/query services. OneBot/NapCat and official-bot clients are alternatives, with explicit cleanup.
- Transfer judgment and limits: Borrow transport/executor separation and reply/approval correlation. General remote-control commands, shell access, control-block parsing and broader permissions do not automatically belong to a companion. Current host names require installed-version mapping.
- Evidence / follow-through entry points: [src/plugin.ts](../../references/sources/TomoyoNatsume/dsh-qq-bridge/src/plugin.ts), [src/handlers/dsh-executor.ts](../../references/sources/TomoyoNatsume/dsh-qq-bridge/src/handlers/dsh-executor.ts), [src/router.ts](../../references/sources/TomoyoNatsume/dsh-qq-bridge/src/router.ts), [src/onebot/client.ts](../../references/sources/TomoyoNatsume/dsh-qq-bridge/src/onebot/client.ts).
- Manifest license-file pointers: `LICENSE`, `THIRD_PARTY_NOTICES.md`.

### 15. YOYOLnFu/dsh-bili-pond

- Pinned commit: `57765435e33a8697c7f3b3b9f317c6146cd05faa`.
- Module contributions: Core — S: bounded worker/profile and output-file boundary; Memory — S: inspectable raw history facts, not governed recall; Life — S: scheduled reading cycle; Bilibili — S: tool bridge, dedupe and reading/history wall; Console — S: report/history/settings routes.
- Connection: Host plugin schedules a headless DSH reading round and exposes tools via an internally spawned Python MCP over stdio. Report/seen/diary files and history.jsonl connect rounds to settings/history views; the history module derives display grouping from stored facts.
- Transfer judgment and limits: Borrow evidence-backed browsing history and operational views. Model-written report parsing is not a dependable primary receipt ledger. Headless profile/tool fallbacks and another scheduler need redesign behind our Core.
- Evidence / follow-through entry points: [index.js](../../references/sources/YOYOLnFu/dsh-bili-pond/index.js), [lib/mcp.mjs](../../references/sources/YOYOLnFu/dsh-bili-pond/lib/mcp.mjs), [lib/history.mjs](../../references/sources/YOYOLnFu/dsh-bili-pond/lib/history.mjs).
- Manifest license-file pointers: `LICENSE`, `NOTICE.md`.

### 16. Yuuyuko-uu/dsh-bili-subagent

- Pinned commit: `efae852a276b7b120ca9d8ef6cd5080da3023005`.
- Module contributions: Core — S: native parent/reader/report boundary; Life — S: bounded reading opportunity pattern; Bilibili — S: reading worker and internal report; Console — S: selected-session/settings/report controls.
- Connection: A fork of scroll changes the orchestration: schedule/instruction reaches a selected native Agent; bili_scan delegates a bounded reader via subagent facilities, with compatibility fallback code for creating a native session. Python MCP supplies tools; the report returns internally for the parent to interpret.
- Transfer judgment and limits: Borrow worker results returning to the continuing companion. Inspect scope/tool exposure and fallback branches before reuse. A selected native parent, not an unrelated recent session, must own the task; no independent browsing timer is inherited.
- Evidence / follow-through entry points: [index.js](../../references/sources/Yuuyuko-uu/dsh-bili-subagent/index.js), [lib/mcp.mjs](../../references/sources/Yuuyuko-uu/dsh-bili-subagent/lib/mcp.mjs), [lib/watch.mjs](../../references/sources/Yuuyuko-uu/dsh-bili-subagent/lib/watch.mjs), [README.md](../../references/sources/Yuuyuko-uu/dsh-bili-subagent/README.md).
- Manifest license-file pointers: `LICENSE`.

### 17. Yuuyuko-uu/dsh-fish-buddy

- Pinned commit: `a102f7262da4689639dfa57ce2759b5c2ec63fe9`.
- Module contributions: Core — S: bound native input and reply correlation; Desktop — S: thin sensor/body client; Voice — S: local VAD/ASR and device lifecycle; Console — S: binding/device/status settings.
- Connection: Python widget posts hands/* input and media to local Host HTTP. Host calls the bound native Agent followup and observes session events; callbacks push replies to the widget HTTP server. Widget owns VAD/ASR, devices and display; screenshots/subtitles are separate inputs.
- Transfer judgment and limits: Borrow native input and body/host separation. At this pin README says callbacks only cover widget-started turns, while Host source comments/logic broaden forwarding to the bound session: do not inherit an assumed narrow origin filter. Screen/game scope, fixed ports and local recognition worker are not selected.
- Evidence / follow-through entry points: [lib/host.js](../../references/sources/Yuuyuko-uu/dsh-fish-buddy/lib/host.js), [app/reply_server.py](../../references/sources/Yuuyuko-uu/dsh-fish-buddy/app/reply_server.py), [app/hands/voice.py](../../references/sources/Yuuyuko-uu/dsh-fish-buddy/app/hands/voice.py), [README.md](../../references/sources/Yuuyuko-uu/dsh-fish-buddy/README.md).
- Manifest license-file pointers: `LICENSE`.

### 18. Yuuyuko-uu/dsh-fish-memory

- Pinned commit: `a070ebf096f3472c107982b5741994cabdcc18f7`.
- Module contributions: Core — S: deletion-aware async merge/recovery pattern; Memory — S: dated recall, correction/deletion, traces and reviewed import; Console — S: memory query/edit/import routes.
- Connection: A DSH Host plugin binds stores and context/processing to sessions and exposes tools/settings routes. JSON persistence uses atomic-file helpers; store-merge reconciles background snapshots with tombstones and permits explicit restore IDs, retaining bounded recall traces.
- Transfer judgment and limits: Borrow correction/trace/import and stale-write protections. Its session ownership, lexical retrieval and salience decay are not automatically our companion-wide evidence/eligibility model. Stable facts and commitments need distinct retention policy.
- Evidence / follow-through entry points: [lib/index.js](../../references/sources/Yuuyuko-uu/dsh-fish-memory/lib/index.js), [lib/store-merge.mjs](../../references/sources/Yuuyuko-uu/dsh-fish-memory/lib/store-merge.mjs), [lib/atomic-file.mjs](../../references/sources/Yuuyuko-uu/dsh-fish-memory/lib/atomic-file.mjs).
- Manifest license-file pointers: `LICENSE`.

### 19. Yuuyuko-uu/dsh-qq-link

- Pinned commit: `fba7e3ee8ffb3a8f819a7823eb05186cfb782ecb`.
- Module contributions: Core — S: batch/single-flight input and message watermarks; QQ — S: OneBot input/reply linkage; Voice — S: QQ audio conversion and external ASR seam; Console — S: session/connection/ASR configuration.
- Connection: OneBot WebSocket receives messages; Host batches/deduplicates input, resolves a configured DSH session and calls native Agent followup. Session events drive replies. Optional audio acquisition/conversion invokes ffmpeg and a configured ASR command; Windows TTS capture helpers are separate optional tools.
- Transfer judgment and limits: Borrow normalization, batching and replay boundaries; adapt speech through shared Voice instead of another model/command path. Existing TTS capture/watchdog and fixed platform assumptions do not become our audio delivery design.
- Evidence / follow-through entry points: [lib/host.js](../../references/sources/Yuuyuko-uu/dsh-qq-link/lib/host.js), [tools/asr_cli.py](../../references/sources/Yuuyuko-uu/dsh-qq-link/tools/asr_cli.py), [README.md](../../references/sources/Yuuyuko-uu/dsh-qq-link/README.md).
- Manifest license-file pointers: `LICENSE`.

### 20. Yuuyuko-uu/dsh-speak-up

- Pinned commit: `438bb636b4c631218e1d0b18b2bf957e3cb17b6d`.
- Module contributions: Core — S: native Agent wake and source attribution; Life — S: cheap cadence/quiet/busy checks; Console — S: initiative settings and status.
- Connection: Host timers evaluate local state, resolve the configured Agent/session via host services and call native followup with plugin-attributed input. HTTP settings control the same host runtime; effect disposal stops owned work.
- Transfer judgment and limits: Borrow native wake entry. A probability/cadence and successful wake are not a motive, completed activity or permission to contact. Core must admit the proposal under common limits.
- Evidence / follow-through entry points: [lib/host.js](../../references/sources/Yuuyuko-uu/dsh-speak-up/lib/host.js), [README.md](../../references/sources/Yuuyuko-uu/dsh-speak-up/README.md).
- Manifest license-file pointers: `LICENSE`.

### 21. bearyluo/dsh-dafeiyu-room

- Pinned commit: `e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed`.
- Module contributions: Core — S: agent/revision-bound plans and action receipts; Life — S: idle opportunity and bounded body choices; Desktop — S: room simulation, local motion and observation.
- Connection: Cordis installs environment context and room_observe/room_plan tools on the same root Agent. RoomRuntime validates identity/revisions and advances a local simulation; accepted plans yield later completion receipts. HTTP serves the room view; schedule and Agent events inform state.
- Transfer judgment and limits: Borrow intent -> validation -> local execution -> receipt. At this pin imports do not establish a mandatory direct call to QCYTSN helper; the shared host Agent is the main seam. Separate idle timer, inventories/needs and mobile viewer are not selected scope.
- Evidence / follow-through entry points: [src/index.js](../../references/sources/bearyluo/dsh-dafeiyu-room/src/index.js), [src/runtime.js](../../references/sources/bearyluo/dsh-dafeiyu-room/src/runtime.js), [src/life.js](../../references/sources/bearyluo/dsh-dafeiyu-room/src/life.js), [web/simulation.cjs](../../references/sources/bearyluo/dsh-dafeiyu-room/web/simulation.cjs).
- Manifest license-file pointers: `LICENSE`, `THIRD_PARTY_NOTICES.md`.

### 22. c1overzz/dsh-bili-scroll

- Pinned commit: `f883d79fa536a2d1610dbb89796e6f48266103d7`.
- Module contributions: Core — S: worker/tool-profile boundary and cancellation seam; Life — S: scheduled finite browsing rounds; Bilibili — S: subtitle-first reading, MCP and reports; Console — S: configuration/run/diagnostic routes.
- Connection: Host owns a timer and spawns headless DSH with a duty prompt and tool-profile overlay. A Python MCP child over stdio supplies platform tools; files hold seen IDs, reports and local ASR state. A control panel reads and mutates Host configuration.
- Transfer judgment and limits: Borrow bounded reading and explicit skipped-coverage reporting. This repository is named as the fork source by subagent; exact ancestry and compatibility of the current pinned snapshots were not established. Worker/profile fallback, separate assistant context and platform-write defaults need review rather than wholesale adoption.
- Evidence / follow-through entry points: [index.js](../../references/sources/c1overzz/dsh-bili-scroll/index.js), [lib/mcp.mjs](../../references/sources/c1overzz/dsh-bili-scroll/lib/mcp.mjs), [README.md](../../references/sources/c1overzz/dsh-bili-scroll/README.md).
- Manifest license-file pointers: `LICENSE`, `NOTICE.md`.

### 23. canyueY/dsh-mnemosyne

- Pinned commit: `796dc292367667d2f453885c12d09bec49f8327b`.
- Module contributions: Core — S: supervised capability process and API boundary; Memory — S: observations, temporal claims and derivation mechanisms; Console — S: memory health/settings/tool facade.
- Connection: DSH adapter registers tools and captures selected session evidence. MemoryProcess starts or discovers a Python service, obtains a dynamic endpoint via readiness metadata, and MemoryClient calls authenticated HTTP APIs. The Python service owns Bank data; optional MCP gateway is another adapter.
- Transfer judgment and limits: Primary memory component candidate. Do not directly write the Bank from other modules. Source/claim rules, leases and every ingestion/recall path need fit checks; service adoption/lifetime and cross-store receipts require explicit reconciliation. No full cognition engine or federation is selected.
- Evidence / follow-through entry points: [src/index.js](../../references/sources/canyueY/dsh-mnemosyne/src/index.js), [src/memory-process.js](../../references/sources/canyueY/dsh-mnemosyne/src/memory-process.js), [src/memory-client.js](../../references/sources/canyueY/dsh-mnemosyne/src/memory-client.js), [src/mcp-gateway.js](../../references/sources/canyueY/dsh-mnemosyne/src/mcp-gateway.js), [service/src/cognitive_memory/evidence/derivation.py](../../references/sources/canyueY/dsh-mnemosyne/service/src/cognitive_memory/evidence/derivation.py).
- Manifest license-file pointers: `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`.

### 24. chenkezhen480/dsh-world

- Pinned commit: `d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f`.
- Module contributions: Core — S: world scope, home binding and bridge/outlet separation; Memory — S: bounded original-source search/read; Life — S: next-check-in, daily review and wake reconciliation; Desktop — S: local bridge capability only; QQ — S: optional OneBot/SnowLuma adapter; Console — S: shared controls and fault views.
- Connection: Cordis composes world-scoped memory/tools, home session, life runtime and HTTP console. Life persists an alarm and observes native events. External inputs call the home through a bridge; source-specific outlets route replies/contact. QQ is a lazily loaded in-process SDK/OneBot adapter; an external gateway still owns login.
- Transfer judgment and limits: Primary Life/home-continuity reference. Bilibili integration is not implemented at the studied pin. Daily budget is an advisory reminder, not a dispatch cutoff. Latest-only bridge tracking, source=user normalization and scope/shutdown need adaptation.
- Evidence / follow-through entry points: [src/index.ts](../../references/sources/chenkezhen480/dsh-world/src/index.ts), [src/life/runtime.ts](../../references/sources/chenkezhen480/dsh-world/src/life/runtime.ts), [src/memoryTools.ts](../../references/sources/chenkezhen480/dsh-world/src/memoryTools.ts), [src/ecosystem/bridge/bridge.ts](../../references/sources/chenkezhen480/dsh-world/src/ecosystem/bridge/bridge.ts), [src/ecosystem/qq-native/index.ts](../../references/sources/chenkezhen480/dsh-world/src/ecosystem/qq-native/index.ts).
- Manifest license-file pointers: `LICENSE`.

### 25. chenluQwQ/astrbot_plugin_bilibili_ai_bot

- Pinned commit: `9f8f37bbc27b71d5f3cf0ea33edb61387da86028`.
- Module contributions: Core — S: layered event/action identity and persistent observer; Memory — S: scoped cross-plugin API; Life — S: governed scheduled activity opportunities; QQ — S: identity binding and pre-reply memory integration; Bilibili — S: content/social event handling; Voice — D: media-understanding capabilities only; Console — D: platform/activity WebUI.
- Connection: AstrBot plugin mixins compose the existing dispatcher with a persistent layered observer, storage/security/persona services and async schedules. Other plugins obtain the registered star and call memory_api in-process. QQ pre-LLM hooks resolve bound identities and inject eligible platform memories; tools return results to the host model.
- Transfer judgment and limits: Borrow explicit event/action identities, scoped memory API and role/parameter-bound action checks. Do not copy another runtime, independent autonomous loops, broad social writes or subjective affinity scores. Memory API versioning does not by itself prove the caller trust boundary.
- Evidence / follow-through entry points: [main.py](../../references/sources/chenluQwQ/astrbot_plugin_bilibili_ai_bot/main.py), [core/layered_runtime.py](../../references/sources/chenluQwQ/astrbot_plugin_bilibili_ai_bot/core/layered_runtime.py), [core/memory_api.py](../../references/sources/chenluQwQ/astrbot_plugin_bilibili_ai_bot/core/memory_api.py), [core/runtime.py](../../references/sources/chenluQwQ/astrbot_plugin_bilibili_ai_bot/core/runtime.py).
- Manifest license-file pointers: `LICENSE`.

### 26. deepseek-ai/deepseek-harness

- Pinned commit: `8bd073392eef6f54e921a093b95076248eb08cbb`.
- Module contributions: Core — S: native services/events/effects and Agent/session ownership; Memory — S: context/log ownership seam only; Voice — S: provider-pinned native ASR lifecycle; Console — S: bundle/row configuration and cleanup.
- Connection: Cordis inject/service calls connect plugins; typed dispatch modes connect observations/interceptors; reversible effects own tools, prompts, listeners and lifetimes. Native Agent execution uses session events/projections and persistence providers. speechToText resolves one selected recognizer independently of conversation submission.
- Transfer judgment and limits: Use as host mechanism, not a replacement business-domain authority. Public pinned source and installed DSH may differ. In-process modularity is not process isolation, event delivery is not durable work acknowledgment, and session persistence is not whole-companion backup.
- Evidence / follow-through entry points: [docs/cordis-primer.md](../../references/sources/deepseek-ai/deepseek-harness/docs/cordis-primer.md), [packages/core/agent/src/index.ts](../../references/sources/deepseek-ai/deepseek-harness/packages/core/agent/src/index.ts), [packages/core/session/src/index.ts](../../references/sources/deepseek-ai/deepseek-harness/packages/core/session/src/index.ts), [packages/experimental/speech-to-text/src/index.ts](../../references/sources/deepseek-ai/deepseek-harness/packages/experimental/speech-to-text/src/index.ts), [packages/boot/plugin-manager/README.md](../../references/sources/deepseek-ai/deepseek-harness/packages/boot/plugin-manager/README.md).
- Manifest license-file pointers: `LICENSE`, `THIRD_PARTY_NOTICES.md`.

### 27. moeru-ai/airi

- Pinned commit: `5951e0a7a94589097521a56e328359b5d1675a9e`.
- Module contributions: Core — S: typed event routing and shared chat runtime; Memory — D: companion-memory roadmap remains WIP; Desktop — D: reusable presentation/domain packages; Voice — S: audio-source and playback ownership contracts.
- Connection: Shared frontend stores call a core-agent runtime; the server WebSocket layer routes typed events by consumer/broadcast delivery policy and ordered middleware. AudioInput scopes streams/history to a source connection; playback drivers own platform output and group/clip cancellation.
- Transfer judgment and limits: Borrow domain/presentation/audio seams and selective pipeline patterns, not the whole provider/Agent/server stack. README memory roadmap and separate task-memory code do not establish a governed persistent companion Memory. Mac and echo/interruption behavior remain untested.
- Evidence / follow-through entry points: [packages/server-runtime/src/server-ws/airi/routing.ts](../../references/sources/moeru-ai/airi/packages/server-runtime/src/server-ws/airi/routing.ts), [packages/stage-ui/src/stores/chat.ts](../../references/sources/moeru-ai/airi/packages/stage-ui/src/stores/chat.ts), [packages/pipelines-audio/src/audio-input.ts](../../references/sources/moeru-ai/airi/packages/pipelines-audio/src/audio-input.ts), [packages/pipelines-audio/src/playback.ts](../../references/sources/moeru-ai/airi/packages/pipelines-audio/src/playback.ts), [README.md](../../references/sources/moeru-ai/airi/README.md).
- Manifest license-file pointers: `LICENSE`.

### 28. omesser/fidget

- Pinned commit: `7326ed68caaf273923f2b321a4a005215b269017`.
- Module contributions: Core — S: host adapter and bounded completion boundary; Memory — S: readable user-owned fact file; Life — S: optional director and local behavior separation; Desktop — S: deterministic frame/body loop and native shell; Console — D: character/connection/settings experience.
- Connection: Native shell/core run the frame loop independently of AI. Optional Director uses a Completer implemented by an attached Harness over ACP stdio/session prompts. Harness callbacks expose behavior/memory capabilities via MCP. A shared Markdown file holds user facts across instances.
- Transfer judgment and limits: Borrow local motion/coarse intent and replaceable host adapter. ACP/MCP round trips are unnecessary just to reach an in-process DSH host. Global multi-instance memory is not our scope/withdrawal model. speech.rs is a text bubble clock, not ASR/TTS evidence.
- Evidence / follow-through entry points: [src-tauri/src/harness.rs](../../references/sources/omesser/fidget/src-tauri/src/harness.rs), [crates/core/src/director.rs](../../references/sources/omesser/fidget/crates/core/src/director.rs), [crates/core/src/memory.rs](../../references/sources/omesser/fidget/crates/core/src/memory.rs), [crates/core/src/speech.rs](../../references/sources/omesser/fidget/crates/core/src/speech.rs), [README.md](../../references/sources/omesser/fidget/README.md).
- Manifest license-file pointers: `LICENSE`.

### 29. whyever77/dafeiyu-astrbot

- Pinned commit: `fef1e99d20381423145455b278488d951ec1de1e`.
- Module contributions: Core — S: common contact reservation and outcome reconciliation; Memory — S: episode provenance and existing writeback outbox; Life — S: continuing projects, decision/review and rest; QQ — S: OneBot delivery receipts and contact scope; Bilibili — S: bounded reading/research tools; Voice — D: deployed media/voice chains; Console — D: observatory and operational diagnostics.
- Connection: AstrBot plugins/patches integrate LivingMemory, activity stores and a contact coordinator through shared host context. Bilibili/Phone/Browser abilities use MCP over SSE/streamable HTTP; some deployments add SSH tunnels. The contact bridge wraps existing senders with preflight/reservation/dispatch/result steps; memory policy reuses an existing outbox.
- Transfer judgment and limits: Borrow continuing pursuits, source-backed experience and unified contact. This repository is a deploy/patch collection, not proof that LivingMemory or the entire external runtime is vendored or accepted here. Windows phone emulation/cloud/SSH, voice cloning and published test counts are not our selected deployment or acceptance.
- Evidence / follow-through entry points: [plugin/astrbot_plugin_bili_activity/main.py](../../references/sources/whyever77/dafeiyu-astrbot/plugin/astrbot_plugin_bili_activity/main.py), [plugin/astrbot_plugin_bili_activity/transport.py](../../references/sources/whyever77/dafeiyu-astrbot/plugin/astrbot_plugin_bili_activity/transport.py), [plugin/astrbot_plugin_bili_activity/memory_policy.py](../../references/sources/whyever77/dafeiyu-astrbot/plugin/astrbot_plugin_bili_activity/memory_policy.py), [deploy/patches/proactive_chat/contact_bridge.py](../../references/sources/whyever77/dafeiyu-astrbot/deploy/patches/proactive_chat/contact_bridge.py), [README.md](../../references/sources/whyever77/dafeiyu-astrbot/README.md).
- Manifest license-file pointers: `LICENSE`.

### 30. wz20/dsh-dafeiyu-dot

- Pinned commit: `ff288f57a25becfe195201b02e4fc4726ae71a5b`.
- Module contributions: Core — S: native-session integration and source-bound delivery; Memory — S: correction/source/recall lifecycle integration; Desktop — S: in-DSH widget/chat controls, not standalone Mac shell; QQ — S: paired OneBot/account checks and uncertain sends; Voice — S: shared ASR/TTS and expression layer; Console — S: common settings/health/recovery.
- Connection: Cordis apply creates one config/memory/speech/QQ composition through injected native services. Native session input, memory lifecycle/recall and supported prompt/context hooks share bound scopes. QQ uses OneBot WebSocket and session events; HTTP/client routes call the same objects. Speech uses DSH recognizer and selected synthesis endpoints.
- Transfer judgment and limits: Strong joined-experience reference. User-text-only memory evidence does not cover autonomous tool/body experience unchanged. Chinese-only speech cleanup, additional emotion LLM pass, preset/session identity and widget versus native-shell distinctions need adaptation.
- Evidence / follow-through entry points: [index.js](../../references/sources/wz20/dsh-dafeiyu-dot/index.js), [lib/session.js](../../references/sources/wz20/dsh-dafeiyu-dot/lib/session.js), [lib/memory-lifecycle.js](../../references/sources/wz20/dsh-dafeiyu-dot/lib/memory-lifecycle.js), [lib/qq.js](../../references/sources/wz20/dsh-dafeiyu-dot/lib/qq.js), [lib/speech.js](../../references/sources/wz20/dsh-dafeiyu-dot/lib/speech.js), [lib/speech-delivery.js](../../references/sources/wz20/dsh-dafeiyu-dot/lib/speech-delivery.js).
- Manifest license-file pointers: `LICENSE`, `THIRD_PARTY_NOTICES.md`.

### 31. xcisxc29/dsh-qq-plugin

- Pinned commit: `29cc25d1df556d7ae223c3f09a325140db6bd638`.
- Module contributions: Core — S: normalized router, native stream and delivery queue; QQ — S: official-bot adapter pattern only; Console — S: optional settings sharing one runtime.
- Connection: Host injects native session services, provides qqChannel runtime and optionally mounts settings. Tencent official QQ SDK/WebSocket receives platform input; normalized router selects native conversations. Agent assistant stream and scoped approval/question hooks route output back; tools and a durable queue handle later delivery.
- Transfer judgment and limits: Study routing, optional UI dependency, event scope and uncertain/outbox behavior. The official-bot account model is incompatible with our ordinary-account product choice; remote-control session switching and permissions are not implicitly selected.
- Evidence / follow-through entry points: [index.js](../../references/sources/xcisxc29/dsh-qq-plugin/index.js), [lib/runtime.js](../../references/sources/xcisxc29/dsh-qq-plugin/lib/runtime.js), [lib/router.js](../../references/sources/xcisxc29/dsh-qq-plugin/lib/router.js), [README.md](../../references/sources/xcisxc29/dsh-qq-plugin/README.md).
- Manifest license-file pointers: `LICENSE`.

### 32. yuanstarstar/dafeiyu-hub

- Pinned commit: `5f90bf0781882d142abc72b1562dcda1e8aa71cc`.
- Module contributions: Core — S: common state/services and unfinished-thread record; Memory — S: human-readable persona/plan/progress projections; Life — S: continue-before-new-work rhythm; Bilibili — S: bridge/tools plus creation pipeline seams; Console — S: common Store-backed workbench.
- Connection: A Cordis entry constructs one Store and passes it to tools, prompt sections, heartbeat, social/feedback, assets/library/studio and HTTP handlers. Agent/session/tool-result events update that shared state. Heartbeat resolves a native Agent and calls followup; platform helpers cross a separate bridge boundary.
- Transfer judgment and limits: Borrow coherent operating experience, common state and unfinished matters. It permits a single active thread and uses fixed satisfaction/relation dynamics; our commitments may be plural and complete only with evidence. Video creation/public social scope is unselected. Manifest lists no license file: design reference only until rights are resolved.
- Evidence / follow-through entry points: [index.js](../../references/sources/yuanstarstar/dafeiyu-hub/index.js), [lib/store.js](../../references/sources/yuanstarstar/dafeiyu-hub/lib/store.js), [lib/heartbeat.js](../../references/sources/yuanstarstar/dafeiyu-hub/lib/heartbeat.js), [lib/prompt.js](../../references/sources/yuanstarstar/dafeiyu-hub/lib/prompt.js), [lib/bridge.js](../../references/sources/yuanstarstar/dafeiyu-hub/lib/bridge.js).
- Manifest license-file pointers: none recorded; no code-reuse claim.

## Study Priority By Product Module

These are recommendations for further comparison, not selected dependencies.

| Product module | Primary study candidates | Supporting comparisons / unresolved fit |
| --- | --- | --- |
| Core | SurfCore ownership; native DSH services/events; dot joined conversation | hub unfinished matters; world home/scope; QQ adapters' delivery separation. No inspected project establishes our complete resource/restore contract. |
| Memory | Mnemosyne temporal/evidence service; dot source/correction integration | fish-memory deletion-aware merge; plugin-memory readable views; world bounded source search; MaiBot writeback; AstrBot BiliBot scoped API; Fidget for a deliberately simpler contrast. |
| Life | dsh-world self-check-in/review; dafeiyu-astrbot continuing pursuits | SurfCore purpose ownership; heartbeat silent signals; speak-up native wake; hub unfinished work; whale rhythm. Shared Core admission replaces multiple autonomous timers. |
| Desktop / Room | QCYTSN helper lifecycle; surfpet thin-client boundary; Room local simulation | Fidget local body loop; fish-buddy native input; dsh-pet assets/API; indesktop multi-instance attribution and display/cleanup cases; AIRI replaceable body/audio boundaries. |
| QQ | qq-link inbound lifecycle; qq-bridge executor/transport separation; dot pairing/outcomes; NapCat transport | world optional SDK/OneBot composition; SurfCore bridge; AstrBot adapter patterns. Official-bot xcisxc29 remains interface-only under our ordinary-account choice. |
| Bilibili | retrieval and dsh-bilibili content/coverage; subagent internal reader result | whale experience/sharing; pond history facts; scroll worker constraints; AstrBot BiliBot event/action governance; dafeiyu-astrbot research/receipt patterns. Compare duplicated MCP/ASR paths before choosing. |
| Voice | dot shared speech capability; native DSH ASR lifecycle | surfpet playback ownership; AIRI stream/group cancellation; indesktop provider seams; dsh-pet voice routes; fish-buddy/qq-link input conversion. Media ASR and notification sounds are distinct responsibilities. |
| Console | native DSH bundle/config lifecycle; dot common settings; hub common Store | heartbeat reasons; memory health; world fault views; retrieval login/cache diagnostics; optional-UI QQ channel design. Console delegates mutations to owners; it does not own backup/restore. |

## Cross-Cutting Transfer Decisions

- Keep one continuing product identity and one native Agent execution adapter.
  Borrow UI and connector patterns without importing independent persona/history
  ownership or unrelated-session fallback.
- Keep one Memory authority. User facts, activity evidence and virtual receipts
  need distinct provenance; multiple stores/diaries cannot become independent
  truth authorities. Export/readability is not a substitute for withdrawal.
- Treat Life plans, infrastructure wakeups, tool acceptance, completed activity,
  synthesis, local playback, gateway acceptance and human attention separately.
- Route owner work, autonomous work, memory processing and speech through shared
  admission/resource controls. Courtesy cooldowns and advisory reminders are
  useful signals, not hard limits.
- Use services/tools for module work; live events notify; persisted intent and
  receipts recover work. Scope/identity/version and actual stop behavior must
  survive every transport, file and child-process seam.
- Core resources/maintenance remain distinct owners even where an upstream uses
  ad hoc paths, automatic Git commits or file copying. None of this pass proves
  a ready-made full-product backup/restore implementation fits our contracts.
- Reuse of code, model assets, character art and binaries requires checking the
  exact terms and dependency fit at selection time. Manifest license filenames
  are pointers, not a completed rights or compatibility decision.

## Remaining Evidence Gaps

Full call-graph and branch coverage, actual installed DSH SDK bindings, Mac
rendering/input/audio behavior, provider reliability, QQ account coexistence and
media codecs, semantic memory quality, complete source/view/use enforcement,
whole-product backup/restore, cost/resource limits and long-term user experience
remain unverified. The broader selected reads improve source coverage over the
older README-only study; they do not convert maintainer demonstrations or test
counts into our acceptance. No contracts or implementations are changed by this
research map. Voice public types remain the separate planning gap already recorded.
