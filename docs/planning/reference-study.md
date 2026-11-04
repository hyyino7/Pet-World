# Dafeiyu Reference Study

Date: 2026-11-04, Asia/Ho_Chi_Minh.
Revision: v0.7. Previous synthesis: [v0.6 snapshot](snapshots/reference-study-v0.6.md).
Scope: Inform a new DSH-backed companion product. These projects are references,
not a proposed installation bundle or automatically accepted requirements.

The user named SurfCore, surfpet, dsh-dafeiyu and dsh-dafeiyu-room. The room
project links QCYTSN/dsh-dafeiyu as its target, supporting that resolution of the
otherwise ambiguous dsh-dafeiyu name. It is distinct from dsh-dafeiyu-dot.

The user subsequently included the earlier reference set as well. The synthesis
below joins those studies by responsibility. All named projects are considered;
their research depth differs. None is selected wholesale as a runtime dependency.

The user additionally requested Mnemosyne for memory and dsh-world for activity.
They explicitly identified **canyueY/dsh-mnemosyne (Mnemosyne 2.0)** after name
disambiguation. rebron1900's SQLite/BEAM integration, mchenziyi's OKF project and
DSH-Raising-Plan's evolving-memory project are different repositories; their
screened READMEs are not evidence for the selected implementation.

## Inspected Sources

| Reference | Inspected commit | Declared state |
| --- | --- | --- |
| [Mieksido/surfcore](https://github.com/Mieksido/surfcore/tree/0deb8261afe4c31b3127759ee4de36a1439cf422) | `0deb8261afe4c31b3127759ee4de36a1439cf422` | README 0.8.8; Windows-targeted system |
| [Mieksido/surfpet](https://github.com/Mieksido/surfpet/tree/d825d236a2afb760c15b9332eee3a8ccad1958a4) | `d825d236a2afb760c15b9332eee3a8ccad1958a4` | README 0.2.0; Windows desktop client |
| [QCYTSN/dsh-dafeiyu](https://github.com/QCYTSN/dsh-dafeiyu/tree/084323845ab82b68d5388d5c638bec09d8544a8a) | `084323845ab82b68d5388d5c638bec09d8544a8a` | README 0.1.23; macOS Helper remains experimental |
| [bearyluo/dsh-dafeiyu-room](https://github.com/bearyluo/dsh-dafeiyu-room/tree/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed) | `e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed` | 0.6.4-preview.1; SDK 0.2.1-rc.5 target |
| [canyueY/dsh-mnemosyne](https://github.com/canyueY/dsh-mnemosyne/tree/796dc292367667d2f453885c12d09bec49f8327b) | `796dc292367667d2f453885c12d09bec49f8327b` | Mnemosyne 2.0; standalone distribution documented 2026-11-03 |
| [chenkezhen480/dsh-world](https://github.com/chenkezhen480/dsh-world/tree/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f) | `d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f` | README 0.6.5; DSH desktop companion world |

Evidence consists of README/design documents and selected source reads. No
upstream application, tests, model calls, accounts, or desktop windows were run.
Maintainer-reported tests and screenshots describe their conditions, not ours.
Earlier Windows installation exclusions do not diminish value as design references.

## SurfCore: A Shared Character Across Scenes

The [architecture document](https://github.com/Mieksido/surfcore/blob/0deb8261afe4c31b3127759ee4de36a1439cf422/docs/guides/ARCHITECTURE.md)
describes shared persona, memory maintenance, purpose-based outreach and usage
accounting across QQ, Bilibili and the pet. Different external conversations can
have different DSH sessions while sharing the character. Memory ingestion has
one maintenance owner and scene-specific context projections.

The inspected [purpose engine](https://github.com/Mieksido/surfcore/blob/0deb8261afe4c31b3127759ee4de36a1439cf422/src/purpose-engine.js)
separates computation from I/O and distinguishes whose goal and what kind of
evidence supports a candidate. The bridge owns actual delivery. This is useful
for choosing meaningful activity without making a timer synonymous with a motive.

**Transfer:** Own the persistent companion independently of execution sessions;
collect experiences centrally; build context for each scene; coordinate contact
and resource use in one place. Keep semantic proposals separate from dispatch.

**Do not inherit automatically:** Windows ACL/setup, SnowLuma-specific bindings,
fixed pricing/cadence, role cards or the complete bridge/control plane. Its own
architecture notes acknowledge large bridge coupling and source-path/reload costs.
These are reasons to design explicit interfaces, not proof of a runtime defect.

**Important limit:** [pet-chat source](https://github.com/Mieksido/surfcore/blob/0deb8261afe4c31b3127759ee4de36a1439cf422/plugins/surfcore/lib/pet-chat.js)
uses DSH's `llm.stream` with assembled persona/memory and a separate pet history.
Shared persona and memory do not establish a shared native Agent execution path.
Our desktop assistant should initially use the native Agent path; any later
light-chat optimization needs the same record, memory and action semantics.

## Surfpet: Presentation Without Owning The Character

The [chat design](https://github.com/Mieksido/surfpet/blob/d825d236a2afb760c15b9332eee3a8ccad1958a4/docs/CHAT.md)
and [connection source](https://github.com/Mieksido/surfpet/blob/d825d236a2afb760c15b9332eee3a8ccad1958a4/src/main/surfcore.ts)
describe separate pet, bubble and chat windows. The client connects to SurfCore
through a discovered local endpoint and credential; transport lives outside the
renderer. Host boot identity and event cursors handle reconnects and port changes.
Focus mode is coordinated with QQ, and audio playback has one active owner.

**Transfer:** Keep windows, input, playback and animation in the desktop client;
keep identity, memory, activity decisions and delivery selection in the core.
Preserve reply-to-message navigation and a shared focus/pause state.

**Do not inherit automatically:** Electron/Windows deployment, default timeouts,
reply clipping, speech behavior, or credentials in media URLs. Its documented
reconnect strategy can discard an event across a restart. Use durable history and
delivery state to recover meaningful messages; ephemeral visual events can expire.
Do not treat an event cursor as proof of reliable message delivery.

## DSH Dafeiyu: Host-Owned Desktop Lifecycle And Real Status

The [overview](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/README.md)
places native companion startup/shutdown under DSH. [Protocol source](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/src/protocol.js)
defines versioned newline-delimited messages and separate task states and alerts.
The [Swift entry point](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/native/macos/Sources/main.swift)
reads input and exits when the parent stream ends. Native rendering does not own
the Agent's reasoning or fabricate progress.

**Transfer:** Let DSH supervise the Mac helper; use a small versioned boundary,
explicit connection state, real task signals, and orderly shutdown. Distinguish
decorative reactions from work progress. Native Mac presentation is a concrete
candidate rather than an assumed cross-platform port.

**Limits:** This is primarily an Agent status companion, not evidence of complete
private-assistant chat or memory. The [acceptance log](https://github.com/QCYTSN/dsh-dafeiyu/blob/084323845ab82b68d5388d5c638bec09d8544a8a/docs/ACCEPTANCE.md)
separates CI/contributor reports from missing Mac hardware checks. Our multi-screen,
click-through, focus and sleep/wake behavior remains untested.

## Dafeiyu Room: Model Decisions And Local Body Execution

The [overview](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/README.md)
and [host integration](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/src/index.js)
add environment context and observe/plan tools to the existing Agent. The model
selects activities; a local engine supplies motion, furniture interactions and
continuous rendering. A plan being accepted is explicitly different from finishing.

[Life state](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/src/life.js)
applies completed action receipts once and maintains virtual items separately
from chat/persona memory. [Runtime state](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/src/runtime.js)
checks ownership and revisions, limits idle decisions, and pauses on errors.
Offline display is labeled local rest; the source avoids simulating deprivation
or meals over downtime.

**Transfer:** The model chooses meaning and intent; a deterministic local engine
checks feasibility and executes body actions. Preserve requested, accepted,
running, completed, interrupted and failed distinctions. Ambient animation need
not call a model. Environmental state should not force narration into every reply.

**Do not inherit automatically:** A room as a product requirement, furniture,
needs scores, virtual inventory, Beijing defaults, Android/LAN features, or an
independent idle scheduler. Our product needs one activity coordinator across
room, browsing and assistance. A virtual phone action is not a real QQ action;
an animated reading pose is not proof of reading an external source.

The [cost note](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/docs/token-cost.md)
counts example injected context separately from autonomous-turn cost. Adopt that
measurement distinction, not its example token quantities as our forecast.
The [verification record](https://github.com/bearyluo/dsh-dafeiyu-room/blob/e7c6ad6fb70e0e67c7fd1e87b12e17175a7480ed/docs/verification.md)
is a preview's maintainer evidence, not proof of our host or final experience.

## Mnemosyne 2.0: Evidence, Changing State And One Memory Authority

The selected [repository baseline](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/docs/REPO_BASELINE.md)
places the Python Core/Node in `service/` and the DSH adapter in the root `src/`.
The Bank is managed runtime data, not another code repository or a second
independent memory service. The archived 0.2 adapter is not the current baseline.
Here "Node" names the local service instance, not the JavaScript Node.js runtime.

The [temporal design](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/docs/2.0/TEMPORAL_TRACEABILITY.md)
distinguishes current validity, replacement, retraction, expiry and confirmation.
Its append-only decisions retain how a judgment changed. The document explicitly
limits implementation to a vertical slice; complete historical replay is unfinished.
The selected [lifecycle source](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/claims/lifecycle.py)
contains explicit transition rules. Their presence is evidence of a mechanism,
not proof that all API callers enforce correct authority or interpretation.

The [theory implementation report](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/docs/2.0/THEORY_IMPLEMENTATION_2026_11_01.md)
separates observations, lossy summaries, inference and verified support, including
transitive source roots. It also separates usefulness, factual correction and
task outcomes. Declared provenance does not authenticate a real-world source;
relabeling or summarizing the same root cannot supply independent corroboration.

Selected source checks support narrower implementation claims:

- [Derivation tracking](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/evidence/derivation.py)
  tracks dependencies and freshness, has source-revision invalidation and
  tombstone/reimport checks, and leaves rebuilds stale without a real processor.
  This does not demonstrate that every ingestion/retrieval route invokes them.
- [Attributed feedback](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/cognition/attributed_feedback.py)
  separates utility from verification. A successful run or favorable self-review
  must not become evidence that an unrelated factual claim is true.
- [Bounded cognitive loops](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/src/cognitive_memory/cognition/loops.py)
  check action eligibility, current claims, counterclaims and bounded work;
  incomplete checks return unknown. The code is a finite structured-rule engine,
  not a general natural-language planner or proof of improved cognition.

**Transfer:** Introduce time-valid evidence-backed state, explicit uncertainty,
dependency invalidation, distinct feedback classes and source-aware context.
Make a temporary preference, a historical preference and a correction different
operations. A diary or evolving self-description remains a derived perspective;
neither overrides owner facts or grants execution permission.

**Component decision:** Compare selective use/adaptation of this local memory
service with a smaller owned module. Reuse a proven mechanism where fit is
demonstrated instead of rebuilding the entire cognitive stack. Our product keeps
one logical memory authority, a stable contract and one writer per Bank. Application
activity/delivery state and a separate Bank require idempotent interoperation;
they are not one transaction merely because both use SQLite.

**Do not inherit automatically:** Full psychological modeling, schema-learning
authority, multi-node federation, every rule/parser, a service with an independent
assistant lifetime, broad automatic capture, or direct database writes from UI
and connectors. The [standalone guide](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/standalone/README.md)
describes its own Python runtime and service reuse, including adoption of a
pre-existing service that it does not kill on exit. Our shutdown requirement
needs an explicit lifetime binding. Its local-first storage does not itself
decide where DSH model inputs go.

**Evidence limits:** README, baseline, temporal/theory/readiness/GA documents,
standalone guide, selected adapter lines and the four source modules above were
inspected. [Readiness](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/docs/MNEMOSYNE_2.0_READINESS.md)
and [GA status](https://github.com/canyueY/dsh-mnemosyne/blob/796dc292367667d2f453885c12d09bec49f8327b/service/docs/GA_STATUS.md)
distinguish an inherited minimum surface, partial evidence and broader adoption.
Maintainer reports, synthetic rule checks and package availability do not establish
our Mac compatibility, natural-language recall quality or long-term companion value.

## DSH World: The Companion Arranges Its Own Next Step

The [README](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/README.md)
combines a home session/work directory, a self-scheduled activity line, daily
review, diary, self-description and shared conversation context. Its Bilibili
integration is explicitly not yet implemented; our browsing tools remain a
separate capability. A home execution session also does not replace our durable
product identity.

The inspected [life tools](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/src/life/tools.ts)
provide next-plan, check/cancel and outreach entry points. [Alarm handling](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/src/life/alarm.ts)
validates times and formats review/late-arrival context. The [runtime](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/src/life/runtime.ts)
persists one pending alarm and separate review/greeting state, injects work into
the home, reconciles pending wake IDs against host events after restart, and
distinguishes an enqueued wake from one whose first model step actually started.
It can ask once about an early-completed turn. Tool activity is brought back to
the next review rather than relying only on what the character intended to do.

**Transfer:** Let the Agent choose a pursuit and its next review time. Infrastructure
validates, persists and dispatches that choice within one coordinator. Allow early
completion, changed intent and rest. Persist wake intent and reconcile real host
events; record actual outcomes separately from plans. Preserve continued matters
when a schedule is replaced. Make a daily review a bounded opportunity, not a
mandatory message or invented diary entry.

The source also shows important differences from our required controls:

- Daily spending in `runtime.ts` is measured after model steps and triggers a
  once-per-day reminder to the Agent. It is **advisory**, not a dispatch cutoff.
  Our autonomous resource limits must be enforced by the coordinator, with usage
  uncertainty and the current run's bounds explicit.
- The pending-wake source documents that dispatch may still proceed after a
  recording failure. Our claimed recoverability requires durable intent before
  dispatch, or an explicit degraded/failure result; a marker alone is insufficient.
- The [world prompt](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/templates/world-prompt.md)
  describes broad autonomy and asking about major actions. This is instruction,
  not a permission sandbox. Keep our tool/action authorization independently enforced.
- [Activity summaries](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/src/life/activity.ts)
  use tool names, counts and lexical paths. They help compare intention with activity,
  but do not establish understanding, successful output or filesystem containment.
- [Diary protection](https://github.com/chenkezhen480/dsh-world/blob/d0b0ba7116ce1f186eb7f7a31ac849d55214bf7f/src/life/diary.ts)
  checks selected file-write tools; its comment explicitly excludes shell handling.
  It is a presentation/editing convention, not an immutable or undeletable store.

**Do not inherit automatically:** Replacing compaction across the whole DSH profile,
default full permissions for world sessions, default recent-history volume,
workspace-wide capture, Windows notices/WeChat/SnowLuma deployment, broad public
QQ actions, multi-outlet outreach, fixed review times or indiscriminate send retries.
Our owner-first assistance, single-channel proactive delivery, selected scopes,
source-backed memory and Mac/DSH-dependent lifetime remain in force.

**Joint design:** Use the memory component to supply applicable evidence, not to
choose the fish's life. Let the native DSH Agent propose meaningful activity;
the coordinator applies real controls; execution produces receipts; the memory
lifecycle turns eligible results into revisable experience. Diary and self-narrative
are readable views within that loop, not parallel authorities.

## Combined Reference Synthesis

### Character, Conversations And Embodiment

| Sources | Useful strength | Our adaptation and transfer limit |
| --- | --- | --- |
| [dafeiyu-hub](https://github.com/yuanstarstar/dafeiyu-hub/blob/main/README.md) | Character, current plans, progress, interests, memory and unified workbench form a continuing resident | Adopt continuity of unfinished matters. Do not inherit satisfaction rewards for external actions, fixed relationship arithmetic, live-streaming features or session fallback. |
| [dsh-dafeiyu-dot](https://github.com/wz20/dsh-dafeiyu-dot/blob/main/README.md) | Role, memory, native DSH owner conversation, QQ, settings and recovery are connected | Adopt one operating experience and explicit message outcomes. A DSH-window widget does not establish an independent Mac desktop client; voice is optional for us. |
| [dafeiyu-astrbot](https://github.com/whyever77/dafeiyu-astrbot/blob/main/README.md), [AstrBot](https://github.com/AstrBotDevs/AstrBot/blob/master/README.md) | An IM companion can combine longer-term projects, source-backed experience, life decisions and contact coordination | Learn from those seams without introducing another model/platform runtime alongside DSH. The life-decision source distinguishes a completed Agent run from a completed goal. Many reported extensions still lack real long-term/model/QQ acceptance. |
| [dsh-pet](https://github.com/PC2005-cloud/dsh-pet/blob/main/README.md), [fish-buddy](https://github.com/Yuuyuko-uu/dsh-fish-buddy/blob/main/README.md) | Existing animated fish and asset pipeline; desktop input can be bound to a native DSH session | Borrow interaction/asset packaging and the native input path. The pet's separate model/history path is not our initial chat design; fish-buddy's screenshots/game/voice scope and platform packaging are not requirements. |
| [dsh-pet-indesktop](https://github.com/MerZlin/dsh-pet-indesktop/blob/main/README.md) | Standalone PySide6 pet, tray, transparent windows and packaging; README discusses display/DPI faults and distinguishes unresolved issues | Use its operational lessons and display cases. Cross-platform claims and provided packages are not our Mac test results; a separate AI chat configuration would duplicate our core. |
| [Fidget](https://github.com/omesser/fidget/blob/main/README.md) | Local frame/body loop; an optional Director chooses bounded behavior; existing harness supplies agent capabilities; Tauri uses system webview | Strengthens the local-body/native-Agent design and provides another shell comparison. Do not add ACP plus MCP solely to reach an already in-process DSH host, or import its shared multi-instance memory model. |
| [AIRI](https://github.com/moeru-ai/airi/blob/main/README.md) | Shared character/domain, rendering and audio packages serve different presentation surfaces | Keep body and expression replaceable. Its README still marks memory work in progress; impressive embodiment is not evidence that durable memory is solved. Do not import its hosted stack, game agents or provider runtime. |
| [MaiBot](https://github.com/Mai-with-u/MaiBot/blob/main/README.md) | Frames the character as a social presence rather than only a task interface | Product-direction reference for natural conversation and silence. README-level inspection does not justify claims about planner/memory implementation; group-chat behavior is not automatically appropriate for a private owner relationship. |

The strongest new body lesson is shared by Fidget, the room reference and native
Dafeiyu: continuous motion and simple interaction belong to local execution.
The model supplies meaning when needed. This does not prove any particular
framework's resource usage or Mac interaction quality in our environment.

Fidget's [window metadata decision](https://github.com/omesser/fidget/blob/main/docs/adr/0032-one-consent-for-titles-and-application-names.md)
also distinguishes geometry from application names/titles. Our assistant does
not require ambient screen awareness simply to exist. If later selected, actual
data collection and tool permissions need a scoped design; a desktop pet is not
implicit permission to inspect unrelated work.

### Memory And Meaningful Initiative

| Sources | Useful strength | Our adaptation and transfer limit |
| --- | --- | --- |
| [fish-memory](https://github.com/Yuuyuko-uu/dsh-fish-memory/blob/main/README.md) | Dated memories, time-based salience, corrections, reviewed imports and recall inspection | Time and correction matter, but commitments and stable owner facts must not decay by the same rule as casual experience. Per-session storage is not our persistent identity model. Lexical recall is not general semantic recall. |
| [plugin-memory](https://github.com/LittleBlackTong/dsh-plugin-memory/blob/main/README.md) | Inspectable Markdown knowledge, compact boot context, detail-on-demand, consolidation, forgetting and health tools | Adopt transparent projections and diagnostics. A shared default directory, latest-active-session routing, automatic Git commits and a reference persona are not inherited. Startup injection alone does not establish correct scope or recall. |
| [dot memory design](https://github.com/wz20/dsh-dafeiyu-dot/blob/main/docs/memory.md) | Source validation, correction precedence, forgetting tombstones, durable extraction queue and compaction protection | Adopt evidence/revision/withdrawal controls. Its explicit user-text-only evidence policy excludes autonomous tool experience unless the owner confirms it. Our life requires separately typed tool and virtual receipts; we cannot claim to reuse that policy unchanged. |
| [speak-up](https://github.com/Yuuyuko-uu/dsh-speak-up/blob/main/README.md) | Wake the selected native Agent instead of generating a separate canned persona response | Useful execution entry pattern. Random chances, fixed tariffs or waking a session do not explain a meaningful reason to contact the owner. |
| [heartbeat](https://github.com/LittleBlackTong/dsh-plugin-heartbeat/blob/main/README.md) | Local projection diffs, silent no-signal pulses, bounded pending work, restart cooldown and diagnostic reasons | Use inexpensive eligibility checks. Host task projections are not a persistent commitment store. Its shared cooldown file is courtesy arbitration with fail-open paths, not a hard concurrency or permission boundary. |
| [AstrBot life decision](https://github.com/whyever77/dafeiyu-astrbot/blob/main/deploy/bili_activity/LIFE_DECISION_V01.md) | Choose continuation, exploration, writing or rest using interests, unfinished work and content progress; rest creates no fabricated experience | Adopt bounded continuing pursuits and no-progress stopping. The documented scoring constants are engineering defaults, not validated psychology. Preserve our local DSH lifetime rather than its cloud/phone bindings. |

The resulting memory design needs one authority with different evidence classes,
not several memory plugins writing each other's summaries. The activity design
needs one coordinator, not heartbeat, browsing and room timers independently
opening Agent turns. Decisions remain semantic; scope, revisions, budgets,
action availability and receipts are deterministic responsibilities.

### Bilibili: Access, Reading, Experience And Sharing

| Sources | Useful strength | Our adaptation and transfer limit |
| --- | --- | --- |
| [bili-subagent](https://github.com/Yuuyuko-uu/dsh-bili-subagent/blob/main/README.md) | Selected native companion delegates reading; a worker returns an internal report and the companion speaks in its own voice | Useful task/result contract; avoid fallback to an unrelated recent session and independent scheduled injections. Its content coverage and exposed social tools need separate selection. |
| [bili-whale](https://github.com/Alterssss/dsh-bili-whale/blob/main/README.md) | Interest/rhythm-based exploration, diary for self/owner, transcript/comments/frames and hard-subtitle inspection | Adopt experience and selective sharing rather than only reports. Claimed understanding requires coverage evidence; fixed schedules, traffic quotas, comments and outreach defaults are not ours. |
| [bili-pond](https://github.com/YOYOLnFu/dsh-bili-pond/blob/main/README.md) | History/cover wall, cross-day useful memories, diary, dedupe and preferences | Useful life-view presentation and retention lessons. Do not run its headless persona, scheduler and memory as parallel owners; forked tools sharing default directories need explicit separation. |
| [bili-scroll](https://github.com/c1overzz/dsh-bili-scroll/blob/main/README.md) | Inspect original transcripts and some visual material before reporting; document missing-content paths and operational failures | Borrow evidence-first reading and diagnostics, not a report-only definition of the fish's life. Manual success does not establish unattended scheduling/recovery. |
| [dsh-bilibili](https://github.com/CZX2244/dsh-bilibili/blob/main/README.md) | Transcript/comment/danmaku extraction, optional ASR and frame/vision paths | Compare actual no-subtitle/visual-heavy coverage against FFmpeg/model/runtime cost. Optional extraction paths do not guarantee a successful complete watch. |
| [bilibili-retrieval](https://github.com/2332239652/dsh-bilibili-retrieval/blob/main/README.md) | Search, metadata, storyboards, chunked time-anchored transcripts and capability/login visibility with few runtime dependencies | Strong read-only connector candidate. Storyboard grids are samples; login and content availability still constrain coverage. It is a content toolbox, not a life planner. |
| [AstrBot Bilibili AI bot](https://github.com/chenluQwQ/astrbot_plugin_bilibili_ai_bot/blob/main/README.md) | Multiple discovery sources, source-linked experience, dedupe, semantic retrieval and selective owner sharing | Learn source/interest integration. Comments, coins, follows, live interaction, public/private outreach and numeric affinity levels are broader than our confirmed scope. Its framework-specific memory is not a second store for ours. |

Separate four responsibilities: content access, bounded reading, interpretation
into experience, and contact. Reuse an appropriate access implementation after
compatibility checks; own the other joins in our core. A recommendation to the
owner and the fish's self-chosen interest may use the same evidence but have
different purposes. Literal browser playback remains undecided. No subtitle-only
product limit is selected by this study, and no full audiovisual capability has
been demonstrated on our Mac.

### Ordinary QQ And One Coherent Relationship

| Sources | Useful strength | Our adaptation and transfer limit |
| --- | --- | --- |
| [qq-link](https://github.com/Yuuyuko-uu/dsh-qq-link/blob/main/README.md) | Explicit native-session/private/group routing and incoming history polling | Borrow provenance and routing. Forwarding every final Agent reply is too broad when our Agent also performs internal life and memory work. Poll replay must be deduplicated. |
| [qq-bridge](https://github.com/TomoyoNatsume/dsh-qq-bridge/blob/main/README.md) | Ordinary-account OneBot route, native Agent task entry, queues and completion notices | Useful assigned-assistance path. Setup/platform assumptions and remote-control permissions need our own Mac/owner scope. A bridge does not supply persistent companion identity. |
| [dot QQ/recovery](https://github.com/wz20/dsh-dafeiyu-dot/blob/main/README.md) | Owner pairing, channel scoping, reconnect/account-change handling and no blind resend of uncertain messages | Adopt explicit delivery outcomes and recoverable operations. A confirmed gateway result is not a read receipt. |
| [NapCatQQ](https://github.com/NapNeko/NapCatQQ) | Existing ordinary QQ account gateway and OneBot interoperability | Reuse transport rather than implement QQ protocol. Supported Mac packaging, QQ coexistence, login and actual two-account behavior require an operator check before selection is final. |
| [dsh-qq-plugin](https://github.com/xcisxc29/dsh-qq-plugin) | Earlier official-bot integration reference | Account model remains excluded: the user selected an ordinary small account. Keep only as a prior interface-pattern reference; it was not re-audited for this synthesis. |

The owner already has the small account; no repeat account-availability question
is needed. The product must distinguish its identity from gateway login identity
and from the owner's identity. First-delivery owner private chat is enough to
test continuity; group and public social behavior need a separate product choice.

### Whole-System Alternatives

| Route | Attraction | Decision for this project |
| --- | --- | --- |
| Install a collection of existing DSH plugins | Fast individual capabilities | Superseded by the user's self-build direction; competing histories, timers and memory ownership also need explicit integration. This does not imply the plugins are unusable. |
| Base the product on another companion platform | AIRI, MaiBot and AstrBot provide broader embodied/social infrastructure | Useful references, but replacing DSH execution or running two Agent platforms would add ownership without a demonstrated need. |
| Fork one comprehensive companion project | Existing integrated surfaces and recovery patterns | No study establishes that one reference fits all Mac/DSH/QQ/life requirements. Source licensing, coupling and migration would need a separate adoption decision. |
| Design our DSH core and Mac client around mature components | Own identity, memory and behavior seams while reusing execution/protocol/storage/rendering | Recommended design direction, selected by the user. It carries integration, gateway support, migration, testing and Mac packaging maintenance; those costs are not eliminated by using DSH. |

## Evidence Coverage For The Wider Set

The original four focused studies and the two v0.6 additions retain
commit-pinned selected-source evidence above.
For the wider set, this revision refreshed the default-branch README documents
listed below and read the three additional design documents shown. The identifiers
are **file blob SHAs, not repository commit IDs**. Default-branch links can move;
the blob identity records the actual content inspected on 2026-11-04.

README-level capability claims are upstream descriptions. The earlier selected
implementation reads recorded in [plan v0.3](snapshots/plan-v0.3.md) remain
historical evidence, not a new full-code audit of each latest branch. In particular,
AIRI and MaiBot inform product structure/direction here, not a verified memory or
social-planning algorithm. The official-bot QQ alternative was not re-audited.

| Inspected document | File blob SHA |
| --- | --- |
| [moeru-ai/airi](https://github.com/moeru-ai/airi/blob/main/README.md) | `c1b4366a4ff2cc4d83cdddd4120a19d7343d816d` |
| [Mai-with-u/MaiBot](https://github.com/Mai-with-u/MaiBot/blob/main/README.md) | `5c4476b15a50888de680b5b8f5c8cab54f6b79a1` |
| [omesser/fidget](https://github.com/omesser/fidget/blob/main/README.md) | `1e4a31427876246f965aa6fa013d2b0eea71b802` |
| [MerZlin/dsh-pet-indesktop](https://github.com/MerZlin/dsh-pet-indesktop/blob/main/README.md) | `3927f6848a93e0bbc28e0a6a4982dd9dd4e0602a` |
| [LittleBlackTong/dsh-plugin-heartbeat](https://github.com/LittleBlackTong/dsh-plugin-heartbeat/blob/main/README.md) | `cd6065796bac736b20abea43bb67f0552b3e22a6` |
| [wz20/dsh-dafeiyu-dot](https://github.com/wz20/dsh-dafeiyu-dot/blob/main/README.md) | `745d6c9f9f3f0fc453715eb29cdd0daf9061c229` |
| [Yuuyuko-uu/dsh-fish-memory](https://github.com/Yuuyuko-uu/dsh-fish-memory/blob/main/README.md) | `a880ca35ce379b69333b272cd57ad41c38ddcc0d` |
| [Yuuyuko-uu/dsh-qq-link](https://github.com/Yuuyuko-uu/dsh-qq-link/blob/main/README.md) | `27976dfffc36593013544e4cef109e4d72c264d1` |
| [Yuuyuko-uu/dsh-bili-subagent](https://github.com/Yuuyuko-uu/dsh-bili-subagent/blob/main/README.md) | `872718e451eecb0224ab6c4d07ece930fa26fc1c` |
| [Yuuyuko-uu/dsh-speak-up](https://github.com/Yuuyuko-uu/dsh-speak-up/blob/main/README.md) | `0d2c11eeeddcb3b39a1ce5ef6766991023f50ad7` |
| [Yuuyuko-uu/dsh-fish-buddy](https://github.com/Yuuyuko-uu/dsh-fish-buddy/blob/main/README.md) | `30517bc28846b3ca5ed26f8e851d6d4f18780ce7` |
| [LittleBlackTong/dsh-plugin-memory](https://github.com/LittleBlackTong/dsh-plugin-memory/blob/main/README.md) | `dd377326f5588f3e32cd6d97642dcbe1f3d2d4b8` |
| [Alterssss/dsh-bili-whale](https://github.com/Alterssss/dsh-bili-whale/blob/main/README.md) | `d11ce3ab8e6bf027109e768f996456a9fca3daad` |
| [YOYOLnFu/dsh-bili-pond](https://github.com/YOYOLnFu/dsh-bili-pond/blob/main/README.md) | `9786f61401c9dae2492fd5fc6ec356e9b8fda2bf` |
| [c1overzz/dsh-bili-scroll](https://github.com/c1overzz/dsh-bili-scroll/blob/main/README.md) | `def1e0b117867bb3127a03f5ce15e57412263d6a` |
| [yuanstarstar/dafeiyu-hub](https://github.com/yuanstarstar/dafeiyu-hub/blob/main/README.md) | `eb01822eff65db948f6ee5ceb1e03facf26d18a8` |
| [CZX2244/dsh-bilibili](https://github.com/CZX2244/dsh-bilibili/blob/main/README.md) | `39adc1faf221e48b23559421465a2c23cea24597` |
| [2332239652/dsh-bilibili-retrieval](https://github.com/2332239652/dsh-bilibili-retrieval/blob/main/README.md) | `d8a6fa87a2ce8320ca080d3a695c684cc5f7884f` |
| [whyever77/dafeiyu-astrbot](https://github.com/whyever77/dafeiyu-astrbot/blob/main/README.md) | `2a23010c1607080a7c4935d67dbd92da0cc392e2` |
| [chenluQwQ/astrbot_plugin_bilibili_ai_bot](https://github.com/chenluQwQ/astrbot_plugin_bilibili_ai_bot/blob/main/README.md) | `ec29b4403e2a26df34928230b344e720a75030fa` |
| [TomoyoNatsume/dsh-qq-bridge](https://github.com/TomoyoNatsume/dsh-qq-bridge/blob/main/README.md) | `eca28a69a418573fa5680d00c471dac272eada76` |
| [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet/blob/main/README.md) | `09b50a438623d08503803e356aac39bddd5b145e` |
| [NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ/blob/main/README.md) | `67c0bcf7519363ee00b49d364f3b5ac20ec78692` |
| [AstrBotDevs/AstrBot](https://github.com/AstrBotDevs/AstrBot/blob/master/README.md) | `3bd2adc2d414c9d2c487db151b16c9f7cddf23ca` |
| [omesser/fidget: docs/adr/0032-one-consent-for-titles-and-application-names.md](https://github.com/omesser/fidget/blob/main/docs/adr/0032-one-consent-for-titles-and-application-names.md) | `1233037503b418c5ac8b3f132a6780f6be876a25` |
| [whyever77/dafeiyu-astrbot: deploy/bili_activity/LIFE_DECISION_V01.md](https://github.com/whyever77/dafeiyu-astrbot/blob/main/deploy/bili_activity/LIFE_DECISION_V01.md) | `22001165e535ee9696ae83132db3dd687f5d9610` |
| [wz20/dsh-dafeiyu-dot: docs/memory.md](https://github.com/wz20/dsh-dafeiyu-dot/blob/main/docs/memory.md) | `34c6c20922aabbe47d105a14b4cf1f5609330865` |

No reference was installed or run for this synthesis. Licensing/asset observations
in the focused study do not extend automatically to the wider set. Reusing a
specific component requires checking its exact version, license, dependencies,
data behavior and host contract at adoption time.

## Native DSH Module And Packaging Evidence

The user requires modularity and prefers native DSH plugin integration. This is
an architectural constraint, not another search for a third-party plugin bundle.
On 2026-11-04 the official repository was inspected at commit
`8bd073392eef6f54e921a093b95076248eb08cbb`:

- [Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/8bd073392eef6f54e921a093b95076248eb08cbb/docs/architecture.md)
  describes profiles, bundles, plugin rows, services/events and reversible effects.
  A bundle distributes configuration rows and the code they mount.
- [Cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/8bd073392eef6f54e921a093b95076248eb08cbb/docs/cordis-primer.md)
  describes service-key dependencies, declared injection, event dispatch contracts
  and effect disposal. These support modules without a custom loader/event bus.
- [Plugin Manager](https://github.com/deepseek-ai/deepseek-harness/blob/8bd073392eef6f54e921a093b95076248eb08cbb/packages/boot/plugin-manager/README.md)
  documents bundle management and individual row toggles, profile-wide scope,
  saved versus active state, platform/version checks, and restart-required paths.
  It also states that Host plugins execute in-process outside the workspace sandbox.

Read-only inspection of the installed application's `app.asar` confirmed the
packaged DSH version `0.2.1-rc.5`. Its bundled `cordis-plugin-development` guide and
`references/host-plugin.md`, `ui-plugin.md`, and `practices.md` were read. They
describe `dsh.bundle.patch`, Host export forms, client slots, effect cleanup,
native-session context/projections and supported installation. The application
archive was only read; no application file, profile or installed plugin changed.

**Transfer:** One initial distribution bundle can expose multiple logical/plugin
capabilities. Give each module stable contracts and one data writer. Prefer
services for calls and host events for live notifications; durable work requires
its own acknowledged persistence. Keep DSH execution/context semantics and do not
invent custom session-event types or replace global compaction.

**Limits:** Documentary feasibility is not runtime acceptance. We did not inspect
live service signatures/slots, toggle modules, build a bundle or test teardown.
Public master and installed artifacts may differ; implementation binds a tested
installed version/range. Hot configuration does not promise hot replacement of
code or native binaries. In-process modularity does not provide crash or security
isolation. The [module design](modular-design.md) owns the proposed adaptation.

## Attention And Association Whitepaper Disposition

The earlier [4.0 cognitive-architecture whitepaper](https://www.bilibili.com/opus/1266375251876380697)
was read as an article through the browser. It motivated discussion of associative
recall, bounded attention, curiosity and reflection. The author notes that parts
were reconstructed with later-version features. No code or behavior was verified.
Keep these as candidates behind Memory/Life interfaces; graph energy or repeated
expression must not become factual verification, and simulated state does not
change authorization. The complete biological-metaphor architecture is not
selected for the first product.

## Dispositions For Our Product

| Responsibility | Proposed treatment | Reason / required evidence |
| --- | --- | --- |
| Identity, memory and cross-scene activity | Design our own coherent core; borrow SurfCore's ownership pattern | User selected an independently designed product; session and scene lifetimes differ. |
| Model/session/tools runtime | Keep DSH as host; one bundle with distinct Cordis entries and a bounded host adapter | Official and installed documentation support the carrier; exact live signatures and teardown behavior still need confirmation. |
| Desktop client | Own Mac-first client; evaluate AppKit shell and compare Tauri/system webview or Electron when needed | Native lifecycle and thin-client references exist; actual rich-chat/body fit and maintenance cost are untested. PySide6 supplies packaging/display lessons, not an automatic Python dependency. |
| Body / room | Borrow command/receipt/local-engine pattern; evaluate a web renderer | Separates visual simulation from costly decisions. A full room remains a proposed view. |
| QQ transport | Adopt OneBot/NapCat interoperability; own channel mapping and delivery policy | Ordinary-account requirement persists; no new QQ protocol implementation is justified. |
| Bilibili access | Reuse an established compatible tool/connector behind our adapter | Own activity intent and experience ingestion; avoid rebuilding site parsing without a concrete gap. |
| Persistence | Compare SQLite transactions with simpler file storage before selecting binding | Durable identity, concurrent receipts, memory edits and delivery status require coherent commits. |

Reference code and assets have separate provenance. The reviewed source license
notices identify MIT code in SurfCore, surfpet and DSH Dafeiyu, and Apache-2.0 in
the room project. Bundled third-party components and character art have their own
notices. These observations do not authorize wholesale copying or settle asset
rights. No upstream code or art was copied into this repository in this study.

This study supports a new design proposal. It does not establish that every
reference is mature, correct, approved, compatible with the user's Mac, or a
dependency of the future product.
