# Chatpet Settings

Open **DSH Settings → 大肥鱼** for the bound Dafeiyu companion.
The independent dsh-world plugin registers **世界控制台** as a separate settings entry.

| Page | Where to go |
| --- | --- |
| **概览** | Open or close the fish and see the current role, workspace and memory mode. **来自 World 的功能** links to the prompt preview, conversation archive and expression view. |
| **角色与记忆** | Edit the companion and owner profiles. Preview their saved contribution to a bound conversation and its estimated token count. Configure recent actions and mood retention, recall and batch consolidation. |
| **对话与档案** | See the number of native conversations attached to the bound workspace. Search this companion's Mnemosyne Bank by keyword. Open a result to read the current record and expand its eligible source text. |
| **桌宠互动** | View the current companion mood and available action and sticker names. Open or close the fish and adjust appearance, movement, click feedback, bubbles, stickers, timed interactions and quiet mode. |
| **日常生活** | Open the 3D room, garden and TV. Set the companion’s day, browse diaries and photos, and manage the local bridge or external accounts. |
| **工作区与维护** | Select, bind or initialize the Repo. Inspect service health and Core execution limits. **World 功能的接入情况** groups the sixteen source components by purpose and describes which are connected to Dafeiyu. |

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

The overview reports whether **new conversations** use long-term memory. Existing
conversations keep their recorded choice. **工作区与维护 → 运行状态** shows whether
the provider process is running. Opening settings reads its state without
starting it. The provider starts when a conversation needs it.

For a first launch, bind and initialize the companion Repo, then open the fish in
**桌宠互动**. Click the fish for animation feedback. Cmd/Ctrl+click, the right-click
menu or hover + L opens compact chat. Drag to reposition the fish. **收起** folds
the window. **新会话** starts a fresh conversation and archives the preceding one.
[Installation and verification](handover/README.md)

## Desktop interactions

**桌宠互动** exposes the desktop controls for the bound workspace. Existing configuration files receive defaults on read.

| Control | Default | Effect |
| --- | --- | --- |
| Character size | 232 pixels | 96–512; saving reloads the body while retaining the native chat. |
| Fixed position | Off | Stops autonomous roaming; manual drag and menu playback remain available. |
| Confine to screen | Off | Uses the original motion confinement rule. |
| Click sound | On | Original packaged sound, volume and throttling; can be muted. |
| Reply bubble | On | Displays the existing final native reply through the original bubble renderer; no extra inference. |
| Bubble duration | 10 seconds | 1–300; long reply text can scroll. |
| Automatic whisper / sleep talk | Off | Uses the original one-shot generator over DSH's current model and SOUL; enabling permits additional model requests. Manual whisper is also available from the menu. |
| Whisper interval | 5 minutes | 1–1440; the same interval applies to sleep talk. Quiet mode, active work and a closed helper suppress scheduled calls. |
| Automatic balance | Off | Queries the current provider via the original balance adapters and native credentials/account service. Unsupported providers show a reason, never a fabricated number. |
| Balance interval | 30 minutes | 1–1440. Manual balance remains available from the menu. |

Right-click offers native chat, whisper/illustrated whisper, balance, todos,
sleep/wake, original action selection, sound/fixed/automatic-whisper switches,
bubble clearing, reload and home. Hover shortcuts reuse upstream L (chat), S
(screenshot), D (todos), Z (sleep). In compact chat, hold the microphone button, review or edit the transcript, then send it. Each assistant reply offers manual speech playback.

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
| Work-animation delay | 5 seconds | A turn must run strictly longer before the work chain can start. Short turns have no work completion animation. |
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

The five recall and batch controls use editable trial defaults. Current emotion
persists across expiry of the recent-change list. Correcting or forgetting a
linked cause retires the affected state and reason.

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
carrier and separately declares `00-Core`, `10-Memory`, `20-Emotion` and
`30-Desktop`. Memory enrollment changes apply to newly opened conversations.
Existing conversations keep their recorded mode and eligibility checks.

The settings page calls owner-authenticated native Connection routes under
`/api/chatpetSettings/`. It reads `snapshot` and the workspace-scoped
`worldView`, `archiveFind` and `archiveRead` routes, saves `identity`, `profile`,
`quiet`, `preferences` and `companion`, initializes the selected Repo with
`initialize`, and requests `desktopOpen` or `desktopClose` for the bound
workspace. The handler checks the request shape, binding and revision as
appropriate. The native connection identifies the owner. The page receives a
readable error when its backing service is unavailable.
[Route registration](../src/console/plugin.ts) · [Operation handlers](../src/console/settings.ts)

## Supported Settings

| Area | Current behavior and effective scope |
| --- | --- |
| Role name and character | Read/write existing Core identity with its expected revision; saved values are used by subsequent Core runs and survive restart |
| Quiet mode | Revisioned policy update; suppresses proactive contact while owner replies remain admitted. Does not start autonomy |
| Execution limits | Save history count, context characters, steps, tools and duration; validated existing bounds; subsequent Core-managed runs read the saved preferences |
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
No identity, data directory or provider/model route migration is introduced.

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

Open **Settings → 大肥鱼 → 日常生活**. Life is a separate `40-Life`
component in the existing package. A new Repo starts paused. Opening this
page, reading status, feeding, watering and local interactions do not request
a model. Enabling Life starts a dedicated native DSH home session using the
configured `agentPreset` (default `standard`) and the current native model.
It can make model requests while the owner is not chatting.

The page shows the original template's virtual activity and descriptive body
state, recent events, World alarm, home availability and tool activity. It
does not represent physical health. The original movement, dwell, needs,
sleep and event-cooldown rules are unchanged. The template uses the machine's
local time; the World schedule uses that same timezone, shown on the page.
The initial World fallback wake is 09:00 and review is 22:00. `plan_next`
lets the companion choose its next alarm (upstream minimum: one minute).
The home appears in the bound workspace's ordinary DSH session list.

The switch and state live in `.chatpet/data/life/` in the bound Repo:
`control.json`, `home.json`, `life.json`, `life/wakes.jsonl`, `activity/`,
`diary/` and companion-authored `self.md` when used. Complete home-session
events use Core's existing portable native transcript copies and Mnemosyne
enrollment. Life has no separate Memory extractor or Bank. It reuses the
existing turn/idle Memory batching. Pause retains the alarm and event records;
on re-enable the original template accounts for elapsed time (up to its
eight-hour cap). Enabled component reload restores the saved native home and
schedule. Invalid JSON is reported and preserved rather than silently reset.

Quiet mode suppresses `reach_out` desktop bubbles, with an explicit failed
outlet receipt; Life can keep progressing and recording. A stopped desktop
also reports delivery failure. Home replies are not automatically repeated as
ordinary reply bubbles; proactive delivery uses World's `reach_out` once.
Life pauses automatic Desktop whispers while running and aborts an in-flight
whisper when starting. Manual whispers and normal conversations remain
available. Disabling/unloading Life cancels its current home turn, removes its
timers/tools and closes background admission. Native Core limits still apply
to each turn; no aggregate daily spending cap has been added.

[Reuse and verification evidence](mvp-runtime.md#life-integration-2026-11-11).

## Pet, World and Room

**设置 → 大肥鱼 → 日常生活** opens the shared daily routine. The clock controls use the displayed Life time zone. The budget is a reminder based on usage reported by the home session. The activity view shows the estimate. The evening-review switch puts a completed review on the existing Memory batch queue.

- **房间与菜园 → 进入 3D 房间** opens the original set, garden, camera, lighting and model-quality controls. Wake, rest, feeding, touch and movement use the saved body. Start Life for actions that advance its state. The TV uses the browser’s display picker. The companion can comment on a selected frame in its native room conversation. Closing the page releases its capture.
- **日记／相册** browses dates, eligible diary and activity records, searches eligible original dialogue and diary excerpts, and opens or removes saved images. The Life home's original photo tools can keep a picture from a native attachment. Changing workspaces closes the previous view.
- **外部联络 → 管理渠道** configures the current companion’s device-local accounts. For QQ, select a loopback OneBot WebSocket, specify the account, and allow individual private conversations and groups. The token field names a device environment variable. For WeChat, provide the account and allowed chats, then connect a compatible adapter using its private discovery file. Status and receipts report connectivity, queue state and provider-reported usage. A verified owner private chat can use the Life home. Group/private guest chats have independent native histories. Each allowed QQ group has its own public character card, relationship material, phrase review and stickers.
- Open an allowed QQ group to choose its public role card and how it participates. V1 replies to directed messages. V2 can observe a conversation, wake on the configured triggers and choose whether to send. The group panel shows unread activity and its observation reports. A verified owner can ask to publish a saved public QQ Space draft in private chat. Enabling the schedule also publishes queued drafts at the selected Beijing times.
- **本地程序和推送** enables the original World token-authenticated home bridge. The private discovery file contains the current home address and token. Each configured HTTP destination chooses which of `reach`, `reply` and `busy` it accepts. Turning the bridge off, switching the bound Repo or stopping Life withdraws the old bridge.
- **桌宠互动** controls tray visibility, work-state animation, dream interval, whisper illustrations, confinement, and the original physics, animation and text settings. The original Pet presentation settings manage individual bodies and their artwork, phone motion, notification behavior and browser placement. Each body follows the bound companion. Installed packs use the companion’s `.chatpet/data/pet-platform/pet/` directory.
- **桌宠互动 → 独立桌宠** can issue a private connection file for the current binding or copy a limited animation-control credential for another trusted program. Run `dafeiyu-standalone` to open the fish without DSH chat. Run `dafeiyu-standalone --connection "/absolute/path/to/standalone.json"` for the current native conversation. In a source checkout, run `source ./scripts/env.sh` and `node src/desktop/standalone.mjs`. The helper uses the device’s DSH Electron or the executable selected via `DSH_CHATBOT_ELECTRON_PATH`.
- **语音** uses DSH’s enabled recognizer for input. For playback the Pet service uses its configured synthesizer and cache. The bundled default is the original Edge network synthesizer, so manually choosing to read a reply can send that reply to the speech service. Offline voice tests use a local fixture.

[Integration evidence](mvp-runtime.md#three-reference-integration)
