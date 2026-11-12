# Chatpet Settings

Open **DSH Settings → 大肥鱼** for the bound Dafeiyu companion.
This guide follows the current source, including the approved
[native-service refactor](planning/native-service-refactor.md). Build
`c18f11e04c85` is installed and enabled for the owner's trial. Exact preparation,
installation and owner-trial status belong in the [current handover](handover/README.md).
The independent dsh-world plugin's **世界控制台** remains a separate upstream plugin;
it is not a second Dafeiyu settings home.

| Page | Where to go |
| --- | --- |
| **概览** | See the bound companion and service status, show/hide the normal desktop body, or choose **打开房间** for the independent Room window. |
| **角色** | Edit SOUL and USER, inspect their saved prompt contribution, and edit **基础说明**. The foundation remains active when Life is paused or absent. |
| **情绪** | Read and edit the continuing mood, reason and structured feelings; inspect expressions and configure recent mood retention. |
| **记忆与档案** | Inspect native conversation counts, search eligible Mnemosyne records and read their sources; adjust per-turn recall and batch consolidation. |
| **桌宠** | Control the same normal body, use the original Pet appearance/physics/action editor, and manage reply display, recent actions, quiet mode and timing. Preserved presentation-configuration conflicts must be resolved before replacing saved choices. |
| **生活** | Pause/resume autonomous Life, adjust its schedule and review preferences, browse eligible diaries/photos, perform directed care and open Room in its own window. |
| **连接** | Manage device-local QQ/WeChat/bridge settings and each allowed group's public-facing material. |
| **工作区** | Bind/initialize the Repo and inspect execution limits, capabilities and advanced maintenance information. |

The checkout has eight topic pages. Isolated settings and real Electron checks
covered the single Pet host, framed chat-only carrier and preserved settings.
The installed startup path is now observed as described above; the fixture
checks and startup observation do not substitute for the owner's detailed
appearance and interaction trial. [Current evidence and delivery status](mvp-runtime.md#installed-native-service-refactor-2026-11-12)

The preview uses the saved identity and user sections from Core's native
context reader. World's estimate covers those two sections. DSH records the
actual usage for a conversation. The World integration view uses the currently
mounted namespaces. The [Pet, World and Room controls](#pet-world-and-room)
use their corresponding native services and display the current workspace’s state.

Opening the archive page reads the native workspace session count. A manual
search starts the local provider on demand. The settings reader calls the
existing scoped recall and read operations with the workspace's configured count
and excerpt limits. Mnemosyne checks source and memory eligibility again when
opening a result. A corrected result shows its current content and evidence.
A withdrawn result is unavailable. Chat transcripts retained for recovery stay
under DSH ownership. The search covers material admitted to this Bank.

The overview reports whether long-term Memory is enabled for the **next turn**,
including existing conversations. A provider outage leaves chat available and
removes the previous recall block; the overview reports the temporary outage.
**工作区 → 运行状态** shows whether the provider process is running. Opening
settings reads its state without starting it. The provider starts on demand.

For a first launch, bind and initialize the companion Repo, then open the fish in
**桌宠**. Click the fish for animation feedback. Cmd/Ctrl+click, the right-click
menu or hover + L opens compact chat. Drag to reposition the fish. **收起** folds
the window. **新会话** starts a fresh conversation and archives the preceding one.
[Installation and verification](handover/README.md)

## Desktop interactions

Use **桌宠** for the managed companion's presentation. Appearance, size,
position/confinement, original movement and action controls use the original Pet
editor on this same page. It manages deliberately added bodies explicitly;
opening another settings page or compact chat must not create an extra normal body.
The original body host and compact chat use separate presentation-only carriers;
compact chat carries no extra body or tray. Startup displays **启动中** until the
helper actually runs, supports cancellation and retry, and keeps unsaved form
values while it checks status. Final host/configuration evidence is recorded in
the runtime report.

**对话表现** controls final-reply bubbles, bubble duration and selected-sticker
probability. **动作记录** sets the number and age of retained observed actions.
**互动间隔** uses seconds for whisper, sleep talk and balance checks; use the
original Pet editor for their enable switches. Save each section, then inspect
its saved/effective value. A preserved migration conflict is shown for a choice
rather than silently overwriting either configuration. Automatic migration fills
only absent fields. An existing explicit value is preserved even if it equals an
upstream default. A conflict choice is checked against the configuration hash, so
an older open form cannot overwrite a later edit.

Quiet mode suppresses proactive contact while normal owner replies remain
available. Enabling automatic whisper/sleep talk permits additional native model
requests; it starts disabled in a new companion configuration. Life and Desktop
coordinate these opportunities so one scheduled event does not create two
independent assistant turns. Balance reads the current provider's actual account
capability; unsupported providers report unavailability.

The pet menu opens compact chat and provides **进入房间**, plus available original
Pet actions, sound, sleep/wake, todos, whisper and balance. Room opens in a normal
independent window, even with Desktop hidden or unloaded. No global Room shortcut
is required by this implementation. Hover shortcuts retain upstream L (chat), S
(screenshot), D (todos) and Z (sleep). Sleep/wake is an explicit request to the
shared Behavior service; it remains available with autonomous Life paused.

Food and sleep commands, and the original locked Baifan phases, go through the
same Behavior path after the original action/surface/lock checks. A clip cannot
claim the body has finished an activity. Eating continues through a loop ending
or an emotional change until Behavior changes the actual activity. Where the
installed pack has no dedicated drinking/garden animation, the desktop shows
accurate activity text with a neutral pose. Custom packs retain valid local media
and activity text; detailed new action assets have not been invented.

In compact chat, the microphone action uses the configured recognizer; review or
edit the transcript before sending. Each assistant reply offers manual speech
playback. Voice and original menu items depend on their owning capabilities.

The original todo panel supports create, complete/reopen, delete, deadlines and
reminders. Its original store/policy are reused in `.chatpet/data/desktop/todos.json`.
It is a Desktop list, not a replacement for Core commitments or native Agent todos.
Malformed existing todo files are refused and retained, rather than overwritten.

Images can be selected, pasted or dropped onto the body/chat, or captured through
the explicit screenshot action. A preview remains editable before send. Screenshot
requires the operating system's screen-recording permission; it never starts on
its own. Images enter the same native conversation via DSH attachment admission.
Portable upload copies live under `.chatpet/data/desktop/images/`; another device
re-admits them through its native attachment service and checks the references.
The selected model must support images for a useful visual answer.

## Expression, recent experience and lasting memory

| Control | Default | Effect |
| --- | ---: | --- |
| Sticker probability | 35% | Applied once per eligible reply when the fish selects an available sticker. 0 suppresses stickers and 100 accepts every selected sticker. Body expression is independent. |
| Recent action count / age | 10 / 30 minutes | Both limits apply to observed distinctive actions and related feedback. |
| Recent mood changes / age | 3 / 24 hours | Both limits apply to retained mood changes; the continuing current emotion is separate. |
| Batch-summary turns | 10 | Summarize after this many completed turns, or after the idle threshold. |
| Batch-summary idle time | 10 minutes | Summarize pending dialogue after inactivity. |
| Minimum summary interval | 5 minutes | Limits repeat maintenance; failed work also uses the reference retry backoff. |
| Recall count | 8 blocks | Bounds provider-selected recall items. |
| Recall block size | 600 characters | Clips text at presentation only; `pet_memory_read` retrieves eligible full detail and original dialogue. |

The owner saves these values to the bound workspace's `.chatpet/core.json`.
An older file receives defaults on read. Other workspaces retain their own
settings. A stale settings draft cannot replace a newer value or a different
workspace's configuration. A zero count or retention period removes that class
of recent experience on its next read. Durable preferences remain with Mnemosyne.
Recent interaction data lives in `.chatpet/data/memory/recent-interactions.sqlite`.

The recall and batch controls use editable trial defaults. Current emotion
persists across expiry of the recent-change list. Its canonical file is
`.chatpet/data/emotion/state.json`, separate from the recent-change ledger.
**情绪** edits its text, reason and structured feelings with revision/hash checks.
Existing text-only states do not receive invented numeric values; existing Room
0–100 values are retained when present. Corrected, withdrawn or unprovable linked
material is revalidated on reload and before disclosure; affected state is shown
as unavailable while the original file remains recoverable. A damaged file is
reported and retained. Emotion does not write a second Room mood file.

## Entry And Ownership

Open **DSH Settings → 大肥鱼**. The client uses native settings section/icon
slots, theme, React and Connection transport. It owns only form drafts. The owning
services validate and save durable state. Closing the page retains acknowledged writes.

| Entry | Responsibility |
| --- | --- |
| `src/console/client.js` | Loaded `./client` browser factory, real reads, per-section drafts/save/status, conflicts and refresh |
| `src/console/plugin.ts` | Package-root carrier and finite exact native owner-only API routes |
| `src/console/settings.ts` | Finite settings operation map, strict input shapes, workspace lookup and safe Chinese failures |
| `src/core/preferences.ts` | Owner-authorized, revisioned, idempotent preferences and quiet-policy writes in the existing Core store |

DSH loads the browser factory from the package's `./client` export.
The **大肥鱼** section and its icon both use the stable ID `dsh-Chatpet` in the native `settings.section`
and `settings.section.icon` slots. The bundle mounts the `chatpet-settings`
carrier and separately declares `00-Core`, `10-Memory`, `20-Emotion`,
`25-Behavior`, `30-Desktop`, Pet presentation, Life, Room and channel capabilities. Memory enrollment changes apply to newly opened conversations.
Existing conversations keep their recorded mode and eligibility checks.

The settings page calls owner-authenticated native Connection routes under
`/api/chatpetSettings/`. It reads `snapshot` and the workspace-scoped
`worldView`, `archiveFind` and `archiveRead` routes, saves `identity`, `profile`,
`quiet`, `preferences` and `companion`, initializes the selected Repo with
`initialize`, and requests `desktopOpen` or `desktopClose` for the bound
workspace. It also reads/saves the Core foundation and Emotion state, opens Room
through `roomOpen`, and calls the owning presentation timing/reconciliation
operations. The handler checks the request shape, binding and revision as
appropriate. The native connection identifies the owner. The page receives a
readable error when its backing service is unavailable.
[Route registration](../src/console/plugin.ts) · [Operation handlers](../src/console/settings.ts)

## Supported Settings

| Area | Current behavior and effective scope |
| --- | --- |
| Role name and character | Read/write existing Core identity with its expected revision; saved values are used by subsequent Core runs and survive restart |
| Quiet mode | Revisioned policy update; suppresses proactive contact while owner replies remain admitted. Does not start autonomy |
| Execution limits | Save history count, context characters, steps, tools and duration; validated existing bounds; subsequent autonomous/background runs read the saved limits; ordinary owner turns use native DSH execution |
| Workspace target | Native Workspace Registry list, live directory check, save/clear selected ID and canonical host metadata; persisted across restart |
| Modules | Read actual Core-reported capability states; module-owned settings are not fabricated |
| Maintenance | Honest unavailable/partial-coverage explanation; no inactive export/restore form masquerading as a usable operation |

Memory and desktop values share one revisioned workspace file. **保存记忆设置** applies the memory fields. The desktop save applies its own fields and preserves pending memory edits. Forms keep drafts until a successful save or an explicit refresh. A stale
revision or binding rejects the save and preserves the draft. Refresh asks
before discarding pending edits. The browser does not store configuration.

Core identity/policy retain their existing revision streams. Preferences use an
additive `preferences/current` record in Core's existing SQLite schema. Missing
preferences inherit the host's validated conversation defaults; saved preferences
override that seed after restart. Owner checks, quiescence and request replay
controls are the existing Core controls, not a parallel authorization system.
The redesign preserves identity and provider/model routing. Presentation reconciliation and the additive Emotion/Behavior transition are recorded separately; they do not authorize replacing personal records.

## Foundation and self-description

**角色 → 基础说明** edits `.chatpet/COMPANION.md`. Until the owner saves a
custom version, the bundled default is used without adding a required manifest
entry or changing older Repos. The next eligible native request receives changed
content. Core assembles it with SOUL/USER and only the capabilities actually
available to that conversation. Native DSH permissions remain authoritative.

The companion's self-description remains at `.chatpet/data/life/self.md` for
compatibility. Core's scoped reader/writer integration permits ordinary
conversation updates without autonomous Life. It remains distinct from the
owner-authored persona, the user's profile and Memory facts. Life's daily review
is another opportunity to inspect it, not a prerequisite. Self-description and diaries remain scoped owner documents; their availability
does not depend on a running Memory provider. Forgetting a Bank record does not
erase these documents or the original transcripts. Diary and album data/tools stay with their owning
capabilities; when that optional provider is unavailable the foundation must not
claim the capability exists.

## Workspace and recovery

Binding saves the selected native workspace and initializes `.chatpet/`.
The role and user profile become available on eligible native requests in that
workspace. DSH owns the native session, logs and permission settings. Optional
Core matters retain their original records and query operations. Opening
settings reads the settings snapshot and leaves the workbench idle.

Complete native logs can travel with the bound Repo. To transfer to a second
device, follow the offline copy, rebind and conflict checks in the
[portability guide](portability.md). Workspace file authority is described in
the [workspace contract](workspace.md).

## References And Reuse

- [dot client](../references/sources/wz20/dsh-dafeiyu-dot/client.js), commit
  `ff288f57a25becfe195201b02e4fc4726ae71a5b`: browser factory and feature-owned
  settings structure, without its custom chat, accounts or Memory implementation.
- [Native settings slots](../references/sources/deepseek-ai/deepseek-harness/packages/client/ui-settings/src/client/contract/slots.ts),
  [Connection](../references/sources/deepseek-ai/deepseek-harness/packages/client/connection/src/rpc.ts)
  and [Workspace](../references/sources/deepseek-ai/deepseek-harness/packages/workspace/workspace/src/types.ts):
  host-owned slots, authenticated routes, transport and workspace identities.
- [Manifest](../references/manifest.json) and [notices](../THIRD_PARTY_NOTICES.md)
  retain upstream commits and license records.

## Earlier settings verification

- TypeScript/build, browser source syntax, archive contents, local links and diff
  checks cover structure and shipping.
- 29 Core tests passed, including saved-preference restart, next-run application,
  stale/invalid writes, owner-only access, replay and unknown-workspace refusal.
- Installed native DSH scripted execution passed (10 turns/17 local-model calls).
  These are fixture checks, not paid-model or user acceptance.
- Browser verification used installed DSH 0.2.2-rc.1 with an isolated temporary
  profile/Core store. The native page read actual settings, saved identity and
  quiet mode, listed/saved a real registered workspace, rejected 999 steps and
  saved/read back 3 steps. After a process restart, the browser read the saved
  role and quiet policy again. No provider login or external-model request ran.
- The [runtime report](mvp-runtime.md) and [handover](handover/README.md) record installed builds and subsequent verification.

## Daily Life

Open **Settings → 大肥鱼 → 生活**. Life is a separate `40-Life`
component in the existing package. A new Repo starts paused. Opening this
page, reading status, feeding, watering and local interactions do not request
a model. Enabling Life starts a dedicated native DSH home session using the
configured `agentPreset` (default `standard`) and the current native model.
It can make model requests while the owner is not chatting.

The page shows the original template's virtual activity and descriptive body
state, recent events, World alarm, home availability and tool activity. It
does not represent physical health. Behavior reuses the original movement, dwell, needs, sleep and event-cooldown
rules, with the bounded host pause policy described below. The template uses the machine's
local time; the World schedule uses that same timezone, shown on the page.
The initial World fallback wake is 09:00 and review is 22:00. `plan_next`
lets the companion choose its next alarm (upstream minimum: one minute).
The home appears in the bound workspace's ordinary DSH session list.

The switch and state live in `.chatpet/data/life/` in the bound Repo:
`control.json`, `home.json`, `life.json`, `life/wakes.jsonl`, `activity/`,
`diary/` and companion-authored `self.md` when used. Complete home-session
events use Core's existing portable native transcript copies and Mnemosyne
enrollment. Life has no separate Memory extractor or Bank. It reuses the
existing turn/idle Memory batching. Pause retains alarm and event records. It stops autonomous model wakeups,
new spontaneous body goals and automatic garden tasks. Directed feeding, touch,
sleep/wake, movement and requested garden work still use `25-Behavior`, even if
Life is unloaded. Accepted manual route/dwell work can finish; stopped automatic
work cannot manufacture a completion effect. Paused passive needs/crop time is
not caught up on resume. Enabling Life retains the body and explicit requests;
reloading the components restores the saved native home and current eligibility. Invalid JSON is reported and preserved rather than silently reset.

Quiet mode suppresses `reach_out` desktop bubbles, with an explicit failed
outlet receipt; Life can keep progressing and recording. A stopped desktop
also reports delivery failure. Home replies are not automatically repeated as
ordinary reply bubbles; proactive delivery uses World's `reach_out` once.
Life pauses automatic Desktop whispers while running and aborts an in-flight
whisper when starting. Manual whispers and normal conversations remain
available. Disabling/unloading Life cancels its current autonomous home turn and removes
its schedules and background admission. It does not unload Behavior or erase the
foreground native-home identity, retained self-description or conversations. Autonomous Core limits still apply to background input; ordinary owner chat uses DSH limits
to each turn; no aggregate daily spending cap has been added.

[Reuse and verification evidence](mvp-runtime.md#life-integration-2026-11-11).

## Pet, World and Room

**设置 → 大肥鱼 → 生活** configures the shared daily routine; the interactive Room itself opens in a separate window. The clock controls use the displayed Life time zone. The budget is a reminder based on usage reported by the home session. The activity view shows the estimate. The evening-review switch puts a completed review on the existing Memory batch queue.

- **概览 → 打开房间**, **生活 → 房间与菜园 → 打开房间**, or the pet menu's **进入房间** opens the same independent window. Repeating the command focuses it. Wake, rest, feeding, touch, movement and requested garden actions share Behavior's saved body with Desktop and remain usable while Life is paused. Closing Room releases its renderer/request lifetime; it does not reset the body or start another Agent. The TV asks the operating system to select a shared source and uses the existing native Room conversation for frame commentary. Actual physical source sharing remains a separate owner trial.
- **日记／相册** browses dates, eligible diary and activity records, searches eligible original dialogue and diary excerpts, and opens or removes saved images. The Life home's original photo tools can keep a picture from a native attachment. Changing workspaces closes the previous view.
- **连接 → 外部联络 → 管理渠道** configures the current companion’s device-local accounts. For QQ, select a loopback OneBot WebSocket, specify the account, and allow individual private conversations and groups. The token field names a device environment variable. For WeChat, provide the account and allowed chats, then connect a compatible adapter using its private discovery file. Status and receipts report connectivity, queue state and provider-reported usage. A verified owner private chat resolves the retained companion home even while autonomous Life is paused or unloaded. Group/private guest chats have independent native histories. Each allowed QQ group has its own public character card, relationship material, phrase review and stickers.
- Open an allowed QQ group to choose its public role card and how it participates. V1 replies to directed messages. V2 can observe a conversation, wake on the configured triggers and choose whether to send. The group panel shows unread activity and its observation reports. A verified owner can ask to publish a saved public QQ Space draft in private chat. Enabling the schedule also publishes queued drafts at the selected Beijing times.
- **本地程序和推送** enables the original World token-authenticated home bridge. The private discovery file contains the current home address and token. Each configured HTTP destination chooses which of `reach`, `reply` and `busy` it accepts. Turning the bridge off, switching the bound Repo or stopping Life withdraws the old bridge.
- **桌宠** controls tray visibility, work-state animation, dream interval, whisper illustrations, confinement, and the original physics, animation and text settings. The original Pet editor on the same page manages deliberately added bodies and their artwork, phone motion, notification behavior and browser placement. Each body follows the bound companion. Installed packs use the companion’s `.chatpet/data/pet-platform/pet/` directory.
- **桌宠 → 独立桌宠** can issue a private connection file for the current binding or copy a limited animation-control credential for another trusted program. Run `dafeiyu-standalone` to open the fish without DSH chat. Run `dafeiyu-standalone --connection "/absolute/path/to/standalone.json"` for the current native conversation. In a source checkout, run `source ./scripts/env.sh` and `node src/desktop/standalone.mjs`. The helper uses the device’s DSH Electron or the executable selected via `DSH_CHATBOT_ELECTRON_PATH`.
- **语音** uses DSH’s enabled recognizer for input. For playback the Pet service uses its configured synthesizer and cache. The bundled default is the original Edge network synthesizer, so manually choosing to read a reply can send that reply to the speech service. Offline voice tests use a local fixture.

[Current redesign evidence](mvp-runtime.md#four-feedback-redesign-implementation-2026-11-12) · [Previous installed integration](mvp-runtime.md#three-reference-integration)
