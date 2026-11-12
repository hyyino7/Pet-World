# Dafeiyu MVP 1.0

> Current execution update (2026-11-12): the owner approved the
> [native-service refactor](native-service-refactor.md) after review of Claude's
> proposal. It supersedes ordinary Core execution gating, new-session-only
> Memory enrollment and whole-history invalidation, and selects registered
> guest shared-Bank access with trusted speaker attribution. Other requirements
> below remain in force unless that owning record explicitly replaces them.
> Implementation and owner acceptance are tracked separately.


Project delivery plan, 2026-11-11. The release is a blue-fish desktop companion on Mac backed by an ordinary DSH conversation in its bound workspace. The owner can drag the fish, open its compact chat, type Chinese, read and stop a streamed reply, fold the window and pick up the same conversation. The fish can express a mood, remember a recent interaction and recall a lasting preference in a fresh conversation.

Implementation status and installed verification are recorded in the [MVP runtime report](../mvp-runtime.md).

## Approved Pet, World and Room integration

On 2026-11-11 the owner selected the full three-reference comparison. It extends the original four-module desktop milestone. The sections below record the decisions at that earlier milestone; the current extension covers the following product surfaces.

| Reference | Selected behavior |
| --- | --- |
| dsh-pet 0.4.7 | Scene-specific desktop actions, six balance tiers, tray, notification-to-session navigation, movement and display controls, configurable expressions, mobile motion, browser overlays, multiple bodies, custom packs, collision, third-party controls, standalone presentation, Baifan and speech. |
| dsh-world 0.7.4 | Native Life home and alarms, daily review of eligible conversations, self-description, date browsing and search, long-term photos, cold-session refresh, configurable hours and spending reminder, optional review consolidation, local messaging bridge, QQ and WeChat. |
| feiyu-room-template | Furnished 3D room, camera and models, visitor notes, role and owner interactions, autonomous garden economy, shared TV and first-person photos. Room QQ features include group-specific relationships, language, stickers, forwards, public role cards, Qzone posts, voice and usage. |

Life's dedicated home is the only companion conversation that accepts autonomous Life events. Core applies its normal execution limits and Memory controls. Quiet mode suppresses proactive bubbles while Life runs. Automatic Desktop whispers yield to Life. Room, Life and Desktop share one body. Emotion accepts text and the original Room score/dimensions from the same native reply and preserves earlier text-only entries.

The owner selected identity and conversation isolation for external messages. Only verified owner private messages may enter the Life home. Each other private conversation and group gets its own native session and public-facing material. A reply returns to its originating account and chat. Multiple bodies may choose independent appearance and position and otherwise follow the bound companion. Device credentials and external-account configuration remain device-local.

[Current integration and evidence](../mvp-runtime.md#three-reference-integration) · [User controls](../settings.md#pet-world-and-room)

## Owner trial redesign feedback

The four requirements below are the accepted product direction. The
[detailed modification plan, draft 1.1](feedback-redesign-plan.md) proposes
responsibility changes, delivery packages, migration and acceptance for them.
The owner subsequently authorized execution: “按照计划执行吧，测试可以基础一些，后面我会详细测试”.
The plan is the implementation baseline; basic verification and delivery status
belong in the runtime record, and detailed owner acceptance remains pending.

### Feedback 1: Core foundation independent of Life

Confirmed by the owner on 2026-11-12 during the trial of installed build
`6e5c1796d459`. This is an approved design direction, not an implementation or
runtime acceptance claim. Implementation is now authorized by the instruction
recorded above; this does not establish owner acceptance.

Core must provide a companion foundation instruction document, using World's
editable prompt-document approach. Core reads and assembles the applicable
context for eligible native conversations. The foundation remains available
when Life is paused, disabled or absent and covers:

| Foundation content | Responsibility |
| --- | --- |
| Identity and relationships | Name, identity, personality, speaking style, aspirations, partner address and basic world background. |
| Conversation behavior | Natural responses, no fabricated experiences or completed operations, and honest uncertainty. |
| Input and audience boundaries | Recognize the input surface and speaker; distinguish the owner, visitors and group participants and preserve each conversation's information boundaries. |
| Self-description maintenance | Explain where the companion's self-description is, what may be updated, when a lasting change warrants an update, and how to replace obsolete content and merge duplicates. Keep it distinct from the owner's authored persona. |
| Memory use | Explain recent context, lookup, supported saving and correction, conditioned on the owning Memory capability being available. |
| Emotion use and expression | Explain how to use the current emotional state and express feelings, conditioned on Emotion's available state and capabilities. |
| Diary and album use | Explain how available diary and photo capabilities may be used during ordinary interaction without requiring autonomous Life. |
| Permissions and action boundaries | Explain the permitted operating scope, actions requiring prior agreement and confirmation of actual tool outcomes; retain native DSH permission enforcement. |

Putting usage rules in the Core foundation does not transfer the corresponding
data, tools or business logic to Core. Memory remains responsible for memory
operations, Emotion for emotional state, and other capabilities retain their
owning modules. Unavailable capabilities must not be described as available.

Life adds autonomous activity/rest planning, schedules and alarms, wakeups
without user input, proactive-contact timing, scheduled daily review and the
corresponding event messages. Self-description can be updated when an ordinary
conversation reveals a lasting change; Life's daily review supplies an
additional opportunity to inspect it, not a prerequisite for updating it.

The four input categories discussed are direct DSH chat, compact desktop chat,
Room chat and bridged external channels such as QQ. This feedback does not
decide whether surfaces share one session/history or finalize window selection.
The foundation document's exact filename, schema and detailed module interfaces
remain to be designed. No change to the installed package is recorded here.

### Feedback 2: Shared emotion and behavior across Room and Desktop

Confirmed by the owner on 2026-11-12 after discussing the desired mirroring
between Emotion, Room and Desktop. This approves the design direction below;
implementation was subsequently authorized, while owner acceptance remains pending.

Emotion and actual behavior belong to the same companion, independent of any
particular presentation surface. Keep three distinct concepts: continuing
emotion, intended behavior and actual behavior. A companion may be angry while
eating, or happy while asleep; an emotional change must not independently
replace an ongoing activity in only one surface.

- Emotion maintains an editable emotion-state file, including current feelings
  and intensity, reasons and change information. The same native Agent can
  maintain this state during conversations or autonomous activity. Emotion
  influences both behavior choice and how an activity is expressed; it must
  not be reduced to a random animation selected after each reply.
- Actual behavior has one authoritative state and execution path. Room and
  Desktop present its corresponding phases: for example, going to eat,
  eating and finishing, or entering sleep and remaining asleep. Each surface
  may render differently, but cannot independently contradict the activity.
  A request or intention alone is not evidence that the behavior happened.
- Keep Emotion, Room and Desktop as separate components with explicit
  interfaces. Presentation surfaces offer available capabilities and report
  interactions and actual execution/playback results. Emotion remains usable
  in text-only chat. Desktop and Room retain basic operation without Emotion,
  with their exact fallback behavior still to be specified.
- A reopened surface reads the current shared state rather than deciding the
  companion's activity again. Missing action assets are a delivery gap; an
  unsupported animation does not establish complete activity synchronization.
- Life supplies autonomous wakeups and opportunities to choose the next
  activity when no user is speaking. Pausing Life pauses autonomous progression,
  while owner interaction and directed care remain available. Owner-directed,
  conversation-initiated and autonomous actions use the same behavior path.

The emotion dimensions, numeric scale, update/decay rules, file schema and
exact surface mappings remain open. Ownership of the shared behavior authority
must be assigned explicitly; this decision does not require a new module or
transfer all behavior logic into Core. Core assembles context and preserves
native execution/permission boundaries. No separate assistant runtime is
introduced. These decisions supersede earlier proposals that required enabled
Life for all manual care, or limited Emotion to reply-time
presentation. The current installed behavior is unchanged.

### Feedback 3: Unified settings and a World-based layout

Requested by the owner on 2026-11-12 during the trial of build `6e5c1796d459`.
The owner reports that the two settings surfaces can result in two pets being
visible, and finds the current settings confusing and visually poor. These are
owner-reported observations; this feedback-recording pass did not reproduce
the UI flow or run tests.

Consolidate the overlapping companion settings into one coherent entry and
redesign its arrangement and appearance using the original World 0.7.4
settings interface as the reference. The selected direction is:

- One companion-settings home with clear navigation and consistent control
  labels, rather than competing `大肥鱼` and `桌宠配置` homes for the same pet.
- Opening or configuring the normal desktop companion must address the same
  managed body. Using another settings route must not accidentally start a
  second independently controlled pet. Preserve deliberate multi-body support
  as an explicitly selected feature, not a side effect of settings navigation.
- Reuse World's identifiable companion/status header, clear topic tabs and
  focused cards as the starting point. Establish consistent spacing, typography,
  field alignment and primary-action placement. The final visual arrangement
  and tab names remain to be designed against the reference.
- Give role/instructions, emotion and behavior, memory/archive, Room/Life configuration,
  desktop appearance/interactions and external channels identifiable places.
  Avoid mixing unrelated controls or duplicating the same setting in separate
  forms. Advanced diagnostics and maintenance must not dominate everyday use.
- A unified settings interface remains a client of module-owned services;
  consolidating it does not merge the modules or transfer their data ownership.

This records the requested redesign, not a completed UI repair. The exact
duplicate-body trigger, the common presentation-host route and configuration
reconciliation still require source/runtime verification during implementation.
Reuse the existing upstream settings and presentation workflows before proposing
custom replacements; preserve the owner's saved configuration and personal data.
The feedback-recording round did not implement or reinstall anything. Subsequent
implementation follows the explicit execution request above; installation and
owner acceptance are reported separately.

### Feedback 4: Direct access to Room in its own window

Requested by the owner on 2026-11-12. The current placement of the interactive
Room inside settings is unsuitable for everyday use. Room must open in an
independent window through an everyday access point, without requiring the
owner to navigate settings first.

The owner proposed a keyboard shortcut, a visible button or an item in the
desktop pet's context menu. These are candidate access mechanisms, not a
requirement to implement all three. The exact entry combination, shortcut keys
and shortcut scope remain open. Settings retain Room configuration rather than
serving as the normal container for the interactive room.

The window presents the same bound companion and shared behavior state selected
in feedback 2. Opening it must not create another independent companion or
assistant runtime. Conversation sharing and history selection remain separate
open decisions. This is a recorded product requirement; no window, input
binding, installation or runtime test was changed in this feedback round.

## Original four-module milestone architecture

Build one companion around the owner's bound Repo. DSH runs each conversation. World supplies the original implementation for placing the companion's identity, recent history and changed state into those conversations. Mnemosyne owns lasting memories. The dsh-pet desktop body and compact chat present the companion and report what actually happened on screen. Core connects these pieces through DSH. The same companion can participate in several conversations, each with its own history, audience and cancellation.

**Choice of base.** Running the complete World plugin and pointing a desktop pet at its bridge looks attractive for a companion that lives solely in World's home. In 0.7.4 that home belongs to `DSH_HOME/worlds/<worldId>/room`. Its bridge accepts text into the home session and delivers replies or notifications through outlets. It starts with Life. A bridge acknowledgement cannot serve as the stream, attachment upload, stop or resume for the owner's selected DSH chat. World's archive serves conversation text and diaries. Our existing chats also need complete native events, source-backed corrections and cross-device continuation. For this release, use the original World components inside the existing pluggable package. Keep upstream sources identifiable and adapt the workspace, eligible data and playback boundaries. Running both complete plugins on the same Repo would give two components authority over prompts, history and compaction. [World assembly](https://github.com/chenkezhen480/dsh-world/blob/49bc2c9bb8183e3dbed9257404099946e0c97a1d/src/index.ts) · [World bridge and outlets](https://github.com/chenkezhen480/dsh-world/blob/49bc2c9bb8183e3dbed9257404099946e0c97a1d/README.md#桥与推送协议) · [Pet recovery contract](../portability.md)

| Responsibility | Original implementation to reuse | Dafeiyu ownership and adaptation |
| --- | --- | --- |
| Core, identity and sessions | DSH native Agent, session, stream and tools. World installs persona sections per eligible session, refreshes changed text and removes sections when a session leaves its workspace. | Core resolves the existing Repo binding and reads the owner's SOUL/USER. Apply edits on the next request. Keep the native permission preset and existing session IDs. An ordinary DSH window and compact chat use the same execution path. |
| Recent conversation and long-term memory | World's history-block placement, visible-message deduplication and scoped lookup. Mnemosyne's capture, recall, update and forget operations. | DSH owns the complete transcript. Memory selects eligible recent turns and bounded recall for continuity, owns the Bank and supplies full eligible detail on demand. World diary and self-description can support future reflection. The owner's persona and corrected facts each retain a single writer. |
| Emotion and visible expression | World's 0.7.4 mood snapshot is emitted only when its contents change. dsh-pet supplies the supported actions, sticker assets and playback events. | Emotion owns persistent **textual** mood and reason. A single native reply can update mood and choose an action or sticker. Desktop records what played. Adapt World's change detection to this contract. Its numeric mood file would introduce a second state model. |
| Desktop and images | dsh-pet's original shell, animation, drag/flight, clicks, menus, bubbles, sleep and media interactions. Keep the compact chat's Chinese input and DSH streaming controls. | Prefer the original 0.4.7 fixes for the documented desktop gaps. Images and screenshots travel as native attachments. Local clicks can animate without inference. Confirmed reminder, whisper and balance features use their existing services and switches. [Desktop audit](../mvp-runtime.md#updated-upstream-desktop-audit-2026-11-11) |
| Settings, storage and recovery | DSH settings and World's per-component status and configuration patterns. | One settings entry exposes module switches and editable values through the component that owns them. Keep persona, portable settings, Bank, emotion and native log copies with the Repo. Device paths, credentials and future channel tokens belong to the device. Rebind and validate native logs before continuing on a second device. [Settings](../settings.md) · [Portability](../portability.md) |
| Future channels | World already has channel identity, deduplication, group-session routing and delivery handling. Its QQ adapter connects to OneBot and depends on an external QQ provider. | When QQ is selected, start from that adapter. Preserve account, conversation, sender and message ID through the native turn. Keep group participants distinct from the owner, and reply to the originating chat. A transport acknowledgement and a desktop playback receipt describe different events. [Upstream channel boundaries](https://github.com/chenkezhen480/dsh-world/blob/49bc2c9bb8183e3dbed9257404099946e0c97a1d/src/ecosystem/README.md) |
| Optional Life extension; future visual Room | World's home session, persisted alarms, idle/wake cycle, journal, daily review and proactive outlets form a working reference for autonomous life. | If Life is selected, start with those original components as one optional feature. Coordinate the existing whisper and nightly/batch work so one event produces one intended action. World's daily home budget gives a reminder. It cannot enforce a hard cap or account for every channel. The desktop can receive a proactive bubble through an outlet. A visual room, Bilibili reading and Voice remain separate future choices. |

The design uses [World 0.7.4 at 49bc2c9](https://github.com/chenkezhen480/dsh-world/tree/49bc2c9bb8183e3dbed9257404099946e0c97a1d). The [local source manifest](../../references/manifest.json) still pins World 0.7.1. The desktop audit compares dsh-pet 0.4.7 against the current 0.4.1-derived shell. These versions identify proposed adoption targets. Start with World's exported runtime and the original [prompt section](https://github.com/chenkezhen480/dsh-world/blob/49bc2c9bb8183e3dbed9257404099946e0c97a1d/src/promptSection.ts), [history](https://github.com/chenkezhen480/dsh-world/blob/49bc2c9bb8183e3dbed9257404099946e0c97a1d/src/history.ts) and [mood](https://github.com/chenkezhen480/dsh-world/blob/49bc2c9bb8183e3dbed9257404099946e0c97a1d/src/mood.ts) paths. Exercise the exported entry against the bound Repo before selecting individual source adaptations. Preserve each adopted file's origin and license.

**Example across modules.** The fish plays its flower animation. The owner says in compact chat, “I liked that flower. Remember it for next time.” Desktop identifies the observed playback. Emotion associates the feedback with that action. Memory can save the stated preference with the owner's words and the playback reference. The ordinary DSH window can recall it tomorrow, even after the recent animation record has expired. If the owner withdraws the preference, its original occurrence remains in the retained log and the next eligible reply respects the withdrawal. A future QQ group message from another person cannot change the owner's preference by virtue of reaching the same companion.

### World 0.7.4 adoption checklist

On 2026-11-11 the owner selected Life as the next implementation after the
four-module MVP. Study [feiyu-room-template](https://github.com/sh2234113/feiyu-room-template)
alongside the existing World Life foundation and integrate the applicable
workflow into the bound companion. The original MVP scope below remains the
baseline for the earlier release. [Current handover](../handover/README.md)

The settings integration follows the companion's existing tasks. Role settings
show the saved prompt sections, desktop interaction shows the companion's mood,
and conversation archives search the current Repo's Mnemosyne Bank. The owner
approved using that Bank for on-demand search and eligible source detail.
The maintenance page exposes the adoption status of all sixteen groups.

Life is now implemented as a separate optional component after the original
four-module MVP. The owner approved the dedicated native-home admission,
quiet-mode outlet suppression and automatic-whisper coordination. The original
feiyu-room-template state machine and World Life factories are reused directly;
the adapter owns only Repo/native lifecycle/UI integration. New Repos start
paused. [Implementation, source trace and evidence](../mvp-runtime.md#life-integration-2026-11-11).

[User-facing access](../settings.md) · [Verification](../mvp-runtime.md#world-features-inside-companion-settings-2026-11-11)

Rows group the upstream source by user-visible capability. “MVP” identifies a proposed product integration. “Later” identifies a candidate tied to a future feature decision. All sixteen groups now have code entry points. The runtime record identifies the paths wired into DSH and the optional building blocks. [Foundation and verification](../mvp-runtime.md#world-foundation-2026-11-11) · [World source tree](https://github.com/chenkezhen480/dsh-world/tree/49bc2c9bb8183e3dbed9257404099946e0c97a1d/src)

| World capability and source | Decision | How Dafeiyu would use it |
| --- | --- | --- |
| Owner-authored persona and world prompt — `persona`, `worldPrompt`, `promptSection` | Core foundation implemented; basic checks passed, owner trial pending | Core loads SOUL/USER and assembles the Life-independent foundation described in [feedback 1](#feedback-1-core-foundation-independent-of-life). Optional modules retain their data and capability ownership; autonomous Life instructions remain specific to Life. |
| World registration, start/stop, workspace, permissions and multiple worlds — `worldScope`, `worldSwitch`, `worldRoutes`, `workspacePermissions` | MVP, reuse scope checks | Bind scope to the selected Repo. Preserve DSH permission choices and component switches. Memory enrollment changes only for new conversations. Multiple simultaneous pets and a global world power switch are outside the selected scope. |
| Recent history, open/compact/long-idle refresh — `history`, `runtime` | MVP, reuse original lifecycle | Seed eligible recent conversation once, deduplicate native messages and reuse the block during ordinary continuation. Evaluate the cold interval separately from recall count. |
| Source capture, archive scope, backfill, SQLite archive and daily text exports — `archiveSelection`, `sourceArchive`, `archive`, `store` | MVP, adapt selection only | Use scope and message IDs when selecting history. DSH and the existing Repo copies retain complete native logs for recovery. Avoid a parallel World text archive. |
| Search, excerpts, pagination and full reads across chats and diaries — `memory*` | MVP, adapt the read workflow | Use small results and on-demand detail through the existing Mnemosyne tools. Memory enforces source eligibility, corrections and forgetting for every read. |
| Dialogue compression, local-time rendering and preset replacement — `compaction*`, `timeContext` | Keep the Pet consolidation path | Preserve native batching, time and roles in summaries, retained originals and the Bank join. Borrow selective dialogue extraction if comparison exposes a gap. Omit the profile-wide preset swap. |
| Mood file and change-only snapshots — `mood`, `runtime` | MVP, adapt snapshot delivery | Emotion supplies the continuing textual state. Publish a changed state once per session. Actual dsh-pet playback and feedback remain separately attributable. |
| Settings console, archive browser, health and faults — `console/*`, `faults` | MVP, selective reuse | Use component status and error reporting in existing DSH settings where they answer an operational question. Any archive view must read through Memory's eligibility checks. |
| Author-written self-description, diary, snapshots and daily review — `self`, `life/diary`, `life/runtime` | Core usage rules approved; scheduled review belongs to Life | [Feedback 1](#feedback-1-core-foundation-independent-of-life) separates ordinary self-description updates and available diary use from Life's scheduled review. Keep owner-authored identity distinct from the companion's self-description, retain module-owned data and route durable user claims through Memory. |
| Home, room directory, alarms, wake/rest, early-stop handling and proactive contact — `life/home`, `alarm*`, `earlyStop`, `tools`, `lifeStore` | Selected Life extension; factories reused | Give autonomous activity its own native home session. Reuse persisted schedules and coordinate proactive messages with Desktop whisper. A visual room is a separate product choice. |
| General local bridge, outgoing notifications and outlets — `ecosystem/bridge`, `shared/outlets`, `life/notify` | Life desktop outlet integrated | Route an opted-in home notification to a desktop bubble once. Keep native session streaming, cancellation and attachment handling for interactive chat. |
| Shared channel identity, turn routing and delivery — `ecosystem/shared` | Later, with first external channel | Carry platform, account, conversation, speaker and message IDs. Use the originating conversation for replies and keep group participants distinct from the owner. |
| QQ, OneBot, outbox and SnowLuma control — `ecosystem/qq-native`, `ecosystem/qq`, `qq-line` | Later, preferred QQ starting point | Reuse the original adapter, deduplication, allowlist and delivery handling. Check Mac provider support, rights and the adapter's home-session dependency before selecting the integration. |
| Windows WeChat adapter, group history, images and sticker library — `ecosystem/wechat` | Outside current Mac scope | Revisit its channel implementation if WeChat becomes a product goal. Desktop stickers continue to use the selected pet's assets. |
| Photo album, photo tools and on-demand viewing — `life/photos`, `photoTools` | Optional later | Current desktop screenshots and photos enter the active native turn. Use the upstream album if the owner requests saving, listing or removing selected pictures across chats. |
| Activity journal, home model usage and daily budget reminder — `life/activity`, `journal`, `pricing` | DSH billing verification and Life activity journal | Use provider usage for chat comparisons. If Life is enabled, reuse its activity journal and home-step estimate, with the home-only scope and soft reminder visible. |

### How a conversation works

1. A desktop message or a message typed in DSH enters its selected native session once. Core resolves the bound Repo and that session's recorded Memory mode. On a fresh session it places the current identity, eligible recent history and relevant memory before the first reply. It seeds the companion's current emotion and still-relevant playback evidence.
2. While the user continues chatting, leave stable persona, Memory instructions, expression format and current asset catalogue in the session prefix. Reuse World's placement and retirement of recent history on open and after compaction. Check for source or scope changes before reusing it. Long-idle refresh is a candidate from World, whose configurable default is 24 hours. The initial Pet recall controls remain 8 records and 600 characters per block. World's 200 **dialogue rounds** is a separate setting measuring different data. [World history and refresh](https://github.com/chenkezhen480/dsh-world/blob/49bc2c9bb8183e3dbed9257404099946e0c97a1d/src/runtime.ts) · [Pet settings](../../src/core/companion-settings.ts)
3. On ordinary follow-ups use native visible dialogue. Retrieve an older fact or unfinished agreement through Memory when needed, then read the source if the excerpt is insufficient. Replace the current unconditional first-step recall and combined per-turn snapshot. Put only newly relevant material and changed mood or playback evidence into the active session. Track what each session has seen across tool steps and retries. Persona or asset edits refresh their own section. [Current recall](../../src/core/native.ts) · [Current prompt assembly](../../src/core/agent.ts) · [Current expression assembly](../../src/emotion/plugin.ts)
4. DSH streams the reply. Emotion interprets its expression once. Desktop can show a bubble, apply the sticker setting once and link actual start, finish or interruption to the same playback ID. A user compliment can refer to that observed action. Memory applies existing rules for saving a lasting preference. Folding and reopening the window follows the same native turn.
5. Completed-turn or idle consolidation keeps the existing editable 10-turn, 10-minute idle and 5-minute minimum defaults. One successful native summary feeds Mnemosyne, while complete original events stay available for recovery. Keep a single compaction path per session. World's profile-wide compaction replacement would affect other presets. After a correction or forget, check the whole model-visible history including tool results and derived emotion reasons. Rebuild eligible context before continuing. Keep unaffected facts, originals and the existing rule that disabling Memory changes only newly created chats.

### Transition and verification

| Sequence | Proposed change and acceptance evidence |
| --- | --- |
| 1. Establish the current baseline | Replay the same short exchange through DSH and compact chat with the current build. Compare first turn, ordinary continuation, tool follow-up, compaction and reopen. Earlier local traces showed 23–29 verbatim repeated memory entries per continuation in a 31–32-entry snapshot. The newer 8-entry sample contains one opening turn. It cannot establish the current warm-session cost. |
| 2. Adopt World session handling | Exercise the original session-scoped prompt/history path first. Substitute the bound Repo and Memory's eligible view. Remove the superseded per-turn injection path when switching a session. On an existing or restored log, recognize prior snapshots, preserve complete events and rebuild the active view once. Verify no duplicate message on retry, prompt edits on the next turn, isolation in another workspace and correct answers after correction/forget. |
| 3. Connect expression and the desktop | Use the original dsh-pet interaction path and World's changed-state delivery. Check fresh and warm sessions, shared state across two windows, an interrupted animation, ambiguous feedback and a stopped reply. Verify that opening a window, handling a click and restoring a chat never replay a model request. Recheck drag/flight and display changes on the Mac. |
| 4. Compare and recover | Use the same model, settings, starting history and messages before and after. Report cached input, uncached input, output and request count separately for opening, continuation and tool work. Use provider usage when available. Inspect native request contents offline for duplicates and test recall quality with an unfinished agreement, a correction and an unaffected fact. Rebind a copied Repo, resume its original chat and verify a conflicting log is preserved. Keep the prior package and data backups until continuation and desktop behavior pass. |

A warm follow-up with no relevant state change should introduce zero new copies of the old memory block or the full expression catalogue. The earlier World sample of 161–253 uncached tokens per ordinary follow-up is a comparison point. Actual savings and conversational quality require a matched trial.

## Confirmed product decisions

The owner's 2026-11-11 trial feedback supersedes the earlier implementation
assumptions: deliver pluggable components within one package; carry role, portable
configuration, Memory and complete native conversations with the bound Repo;
consolidate after completed-turn or idle thresholds while retaining originals;
use small relevant recall and full reads on demand; maintain companion-owned
emotion; reset Desktop from the original dsh-pet implementation.

The owner approved editable trial Memory defaults (10 turns / 10 idle minutes /
5 minimum minutes) and continuing textual emotion updated by the same native
reply. The owner subsequently approved native-log Repo recovery and specified that
the earlier repair should apply Memory switching only to new conversations.
The 2026-11-12 native-service refactor supersedes that switch policy with
current-turn selection, including retained chats. The other earlier repair
behaviors remain historical implementation evidence. Implemented scope and runtime evidence
remain separate from owner acceptance.

The owner then requested the remaining dsh-pet features and approved connecting
them through the existing native services while continuing to defer Voice.
The local Desktop extension reuses menu/click/bubbles, sleep, image input,
todos/reminders, whisper and balance paths. Automatic model-based whisper and
periodic balance are settings, off by default. This does not select standalone
AI, multiple pets or the upstream external-control API. See the runtime record
for changed source paths, controlled evidence and trial limits.

The existing custom Memory adapter, patched vendor copy and historical Core workbench are evidence to consult. Exercise the direct upstream path first. Preserve the existing Bank, workspace binding, SOUL/USER and backups when checking compatibility. Use one writer for each Bank. The old chatbot's archive and context behavior supplies scenarios to test. Its private history, heuristics and model loop are outside the reuse path.

## Delivery order and acceptance

| Step | Deliverable and dependency | Acceptance through the normal entry point |
| --- | --- | --- |
| 1. Bind the native conversation | Core resolves the workspace and its configured persona before a message is sent. Check DSH's workspace activation for memory tools, capture hooks, storage and reads. | An ordinary bound conversation uses the expected SOUL/USER and one native Agent turn. In a second workspace the same actions leave Dafeiyu's persona, recent context and memory inaccessible, with no writes to its store. A scoped tool alone verifies only the tool. |
| 2. Deliver basic memory and a fresh session | After step 1, exercise direct Mnemosyne save, query, correction and forgetting. On explicit session end, use the persisted native transcript and available consolidation. On a fresh session, supply relevant prior context before the first model request. | End a conversation with an unfinished agreement, reopen a fresh one and inspect the first model input and reply. The agreement appears once and is accurate. Correct or forget one item and repeat with a second unaffected item. Folding or stopping a reply leaves the conversation open. Repeated end notifications do not duplicate the archive. |
| 3. Deliver compact desktop chat | After the native binding works, connect the existing mini window to native session follow/history, visible assistant chunks and cancellation. Retain the native send flow, distinguish send acknowledgement from reply completion, and check the active turn before issuing a session-scoped cancel. This step can proceed alongside step 2. | Drag the fish, open chat, confirm a Chinese IME candidate and send exactly once. Read visible text before completion and the full reply after it. Fold and reopen mid-stream on the same session, stop, then send a new question. Also reopen after completion while hidden. No duplicated text, resend, stale stop or lost history. |
| 4. Deliver body expression and settings | With the window and body present, map reply-associated expression to described blue-fish assets, use existing movement and work-state playback, and apply the settings below. Verify the actual blue-fish files and their permitted use. | Idle and drag work without chat. A short happy reply can trigger an expressive action. Test work duration at the exact threshold, just above it, on stop, and on drag/reopen. Check sticker desire and probability independently. Missing assets and cancelled or superseded replies leave text usable. |
| 5. Connect recent experience to Memory | With playback and scoped Memory available, join what played to user feedback, maintain mood across sessions within its window and promote important experiences through Mnemosyne. | The owner can ask what the fish just did, praise a particular action and later retrieve an explicit lasting preference. Changes to retention take effect on the next read. Corrections and forgetting survive expiry and reopening. |

## Playback and settings

Daily body actions remain varied and random. Desktop may play the native reply's chosen action even on short chats. When the fish wants to send a sticker, apply the owner's probability once for that reply. Zero suppresses stickers. At 100 percent an eligible, available sticker is shown whenever the fish wants one. Reopening a reply never rolls again.

The work-animation delay defaults to **5 seconds** and is adjustable. Measure elapsed time from the start of the bound native turn. A turn ending at or below the threshold produces zero work animations, including success/error. Once strictly above the threshold and still active, enter the current DSH state directly. Tool transitions and window folding keep the same timer. Dragging takes immediate precedence. On release or animation end, consult the same eligibility decision before resuming an active work animation. A stopped turn returns to daily activity. Streaming text and stop controls remain available throughout.

## Three retention levels

All three belong to the bound workspace. Emotion owns the continuing state and the recent ledger, using observed playback from Desktop. Memory owns the durable Bank, retrieval and updates to lasting facts. Recent records survive folding the window and opening a fresh session within their retention limits.

| Level | What is retained | Proposed settings and behavior |
| --- | --- | --- |
| Recent actions | Identifiable actions actually shown, including expressive random actions, with time, result and any clearly associated feedback. Distinguish started, finished and interrupted. Skip ordinary idle/work loops. | Expose maximum count **10** and maximum age **30 minutes**. Both limits apply. If two actions plausibly match “I liked that,” clarify before attaching a preference. |
| Recent mood | Recent changes in the fish's own mood, with reason and time. Coalesce repeated unchanged mood. | Expose maximum changes **3** and maximum age **24 hours** for the history of changes. The continuing textual state survives history expiry. If the state depends on a withdrawn memory, retire the affected state and reason. |
| Important memory | An explicit lasting preference, a shared experience the owner asks to keep, or a candidate supported by distinct pieces of clear feedback. Preserve its source. | Use Mnemosyne's proposal, retrieval, correction and forget mechanisms. A single situational compliment stays recent. Repeated animation cycles add no evidence. A durable preference survives ledger expiry. An old ledger entry cannot recreate a forgotten or corrected preference. |

Keep the four numeric controls together under **Recent memory** in the bound workspace's companion settings. Verify a saved change after reopen through the actual reader. The work-animation delay belongs with playback, and sticker probability belongs with expression. The retention values are initial trial defaults.

## First integration checks

- **Workspace and first request.** The DSH APIs and Mnemosyne tools exist. A whole-workspace activation/binding for all capture paths and the injection of relevant background before the first native inference still need verification. Use one bound and one unbound session. Check the stored transcript before explicit-end consolidation. A later successful search alone cannot demonstrate the first-request behavior.
- **Window and body.** Check whether the compact window can consume the native stream directly or needs a minimal host relay. Test stop while another turn is starting, hide/reopen while generating, and a completed long reply. Inventory the selected blue-fish assets against the existing pools and their use conditions before accepting animation coverage.
- **Interaction evidence.** dsh-pet has receipts for requested playback. Distinctive random playback needs an observed start to ground “that action.” Mnemosyne's optional emotion extraction models the owner in its observed event. Read the fish's mood from Emotion. Exercise the feedback-to-action and first-request links with the two concrete cases in step 5. [Emotion extraction](../../references/sources/canyueY/dsh-mnemosyne/service/src/cognitive_memory/cognition/emotion_extract.py)

## Release decision

The owner walks the combined path on the real desktop with the selected fish, including Chinese input, streaming, stop/reopen, a short and a long task, an expressive reply, feedback on a visible action and recall in a fresh bound conversation. Check another workspace for isolation. Keep source inspection, controlled checks, installed behavior and the owner's hands-on result distinct. Scope and sequence are ready for review. Calendar estimates depend on the observed workspace, stream and asset gaps. This planning pass produced no new runtime evidence.

The initial four-module milestone deferred QQ, autonomous Life, Voice and Room. These four areas now belong to the approved integration above. Bilibili, advanced semantic retrieval, a separate archive-summary engine and a general psychological simulation retain their prior scope.
