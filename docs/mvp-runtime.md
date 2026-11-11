# Dafeiyu MVP runtime evidence

## Three-reference integration

The selected versions are dsh-pet 0.4.7, dsh-world 0.7.4 and feiyu-room-template `9df0a6b`. The packaged Room models, textures, media, garden and original interaction logic are served locally through the native host. Origin manifests and [third-party notices](../THIRD_PARTY_NOTICES.md) identify code, media and their respective licenses.

| Critical path | Recorded evidence |
| --- | --- |
| Desktop and Emotion | The isolated Electron check decoded the six balance tiers, exercised tray hide/show, click and drag, streamed chat, sleep transitions and recorded visible Emotion playback. The catalogue contains 114 clips and 27 reaction images. Legacy emotion text remains readable. |
| Body, garden and Room | The role and owner share one persisted body. Pending sleep, arrival, cancellation, restart and rebinding are covered. Native Room checks exercised garden actions, native chat and replay, original first-person camera capture, photo tools and the TV commentary boundary. Model requests used a local fixture. |
| Daily review | A real native Life home with a local model read four eligible dialogue pieces, wrote the diary/self-description, and exposed its self-description to an ordinary conversation. A separate Memory-off chat stayed private. Withdrawal made the affected derived writing unavailable. A timed Life run verified quiet delivery, active-stop and shared Memory batch behavior. |
| Guest sessions | The installed DSH runtime opened owner, private and group sessions on disposable data. Only the owner’s verified private chat used the Life home. Group members shared their own group conversation. Account changes created distinct sessions. A visitor could not gain access by claiming to be the owner. |
| QQ and WeChat | A native Life turn sent a proactive message to local QQ, WeChat and HTTP peers. Quiet mode and replay produced no extra delivery. Replies, quoted messages, stickers, forwards, voice transcription and acknowledgement returned to the correct conversation. V2 explicitly sent a reply in one turn and remained silent in another. A scheduled QQ Space draft received a post ID from the test gateway. WeChat requires a compatible external adapter, and QQ requires a signed-in OneBot gateway. |
| Voice and photos | Pet’s original recorder, recognizer adapter, synthesis queue and scoped cache feed the compact and browser surfaces. A local recognizer and deterministic synthesis provider exercised both directions and cache isolation. In three separate ordinary owner conversations, native tools saved an attachment, found and read the same photo, and deleted it. The Room's camera also produced a first-person photo. |

The original Pet client rendered two separately controlled bodies. A throw transferred motion to the second body in both the browser and two macOS windows. A browser test delivered simulated phone-motion events and verified vibration requests. A notification callback opened the originating native session. The packaged standalone command opened real offline and connected windows. The connected window followed the existing conversation, room reminders and sleep state.

### Installed desktop build

On 2026-11-11 the DSH desktop profile installed and enabled `6e5c1796d459`. All 989 files matched the prepared package. The workspace binding, SOUL, USER, Core configuration, personal DSH patch and installed dsh-world and dsh-pet package trees matched the pre-update checks. The installer backed up Core and Memory before replacement. The installed QQ bridge and speech library loaded under this machine’s Node runtime. Room’s QQ SDK `1.14.20` is deprecated upstream. It was selected for compatibility with the installed host’s Node 24.21.

The live desktop opened **设置 → 大肥鱼 → 日常生活 → 进入 3D 房间**. Switching to the garden rendered the original scene and all eight plots, including crop-specific growth stages. The same screen showed Life paused. The device had no saved QQ or WeChat configuration, so both adapters stayed off. The personal repo was not used for a model request or an external delivery.

The release passed 69 automated tests, the six-tab settings window check, the timed native Life and daily review checks, first-person Room capture and cross-session album tests, and the local QQ and WeChat round trip. The day and evening Room checks verified the light in the rendered scene, visitor state and persisted record; both also checked a furniture command and visitor note after reopening. The settings guide additionally clarifies the immediate owner-directed QQ Space action and its separate scheduled delivery.

Natural multi-day behavior, personal QQ or WeChat delivery, a physical phone’s movement and vibration, the operating system’s notification banner, microphone capture, live voice playback quality and a real shared-screen source remain separate owner trials. These checks used no paid model calls.

## Life integration (2026-11-11)

The requested reference is [feiyu-room-template at 9df0a6b](https://github.com/sh2234113/feiyu-room-template/tree/9df0a6b76b563abc738b6d4b7ae137381c425424),
not the previously catalogued bearyluo room fork. It is a Node/HTTP room and
QQ/SnowLuma template, targeting DSH 0.2.1-rc.2, rather than a drop-in native
component. The large `src/bridge.js` combines room HTTP routes, QQ routing,
model wakeups and state. Its own setup hooks, accounts and sample persona
were not run or imported.

### Traced original flow and reuse

`src/home-state.js` supplies the independent fact/behavior layer: elapsed-time
needs → decision priority → `buildRoute` → arrival → dwell completion →
need effect and bounded `eventLog` → atomic `saveHomeState` → `homeView`
and `buildHomePromptLine`. Arriving alone does not count as drinking/eating.
The bridge's `/api/home/act` applies an interaction, advances once, saves, then
returns the shared view; `roomWakeLine` reads that same state into the role's
context. The adapter follows that path for the current companion.

The retained file under `vendor/feiyu-room-template/` matches upstream Git blob
`7fda4d0d16430a861a20d30c88f26a3026030219` byte for byte. The MIT license, pin
and adoption treatment are in its origin record, notices and reference
manifest. The template's 27 state tests passed in its expected Asia/Shanghai
timezone, including route/dwell effects, event TTL, save/load and body versus
emotion separation. Running that original test with the local Asia/Saigon
timezone exposed its fixed +08:00 nighttime-test assumption; this is not a
production change to the state machine. Original clock behavior remains local
time and is shown explicitly in settings.

World 0.7.4 supplies `createLifeRuntime`, `createHome`, persisted alarms,
wake-confirmation/recovery, early-stop handling, `plan_next`, `check_alarm`,
`cancel_alarm`, `reach_out`, journal and daily review. These factories remain
unchanged. `src/life/plugin.ts` binds them to the existing companion Repo and
native workspace/session controller. It does not start another Agent runtime,
QQ bridge, HTTP listener, persona source, Memory writer or numerical Emotion
engine. A 3D room, garden economy, TV, QQ and Voice remain separate work.

### Agreed integration boundary

The owner approved admitting World Life-source messages only in the enabled
Life home, retaining native Core execution limits and Mnemosyne. Quiet mode
pauses proactive bubbles while preserving activity; automatic whispers yield
to Life. Core now tracks the Life input's native completion receipt as well as
owner inputs. An actual second wake exposed an unknown-result defect before
this adjustment; simply creating a home was insufficient. Life observations
are `virtual_action` sources, never `owner_statement`. Background admission
disappears on unload. The existing Core execution lane and native Memory batch
remain shared; no second review summarizer is installed.

### Verified evidence and limits

- `pnpm test`: 60 tests passed, including owner/current-binding/finite-action
  admission for the settings endpoints and automatic-whisper suppression.
- `scripts/check-native-life.mjs`: actual installed DSH services and a real
  disposable Mnemosyne service, with a scripted local model. A real one-minute
  World alarm continued the same native home; its prompt contained the saved
  watering event. Two completed turns used six local model steps; a seventh held step was
  cancelled by the Life pause control. Exactly one
  proactive outlet was delivered; quiet mode withheld the second with an error
  activity receipt. Life-source records retained virtual-action attribution.
- The existing native Memory batch counted the same two completed home turns;
  no additional consolidation engine was started. Pausing an in-flight native
  model step produced an `aborted` turn receipt. Pause caused no additional calls; unload removed admission; disabled reload
  left `home.json` unchanged. Re-enable and enabled reload retained the home
  session ID, planned alarm and one watering interaction without an extra
  arrival/return call while a companion plan was pending. Paid model calls: 0.
- Existing native Desktop check passed: seven local model calls, original
  streaming/cancel/reopen, images, Memory enrollment, archive/recall, Emotion
  and component reload behavior.
- Electron renderer test passed all six settings pages, Life enable/pause and
  watering feedback. `.cache/settings-redesign/life.png` contains fixture data.

Build `85b0ff1d67f4` is installed from
`.cache/life-integration/install/dsh-Chatpet-local-85b0ff1d67f4.tgz`; its 609
files matched the installed package. The manifest, SOUL, USER, core settings
and profile plugin patch retained their pre-update hashes. The installer made
its rollback backup at
`~/.dsh/profiles/desktop/backups/codex-pet/2026-11-11T11-31-09-964Z/`.
The actual personal app opened **大肥鱼 → 日常生活**, showing activity, body
state, Asia/Saigon and a paused switch. No personal Life inference was started.
The installation retained an existing compatibility warning for the separate
`dsh-dafeiyu-room@0.6.4-preview.1`; it is not this selected template adoption,
and no version exemption or unrelated plugin setting was changed.
Verification artifacts are under `.cache/life-integration/`.

These checks demonstrate the integrated protocol and local state path. They
do not establish natural-model autonomy quality, daily review writing quality,
real billing, cross-device Life migration, manual mouse feel or owner acceptance.
The original module tests cover dwell completion; the integrated native case
uses the owner's direct water interaction and a timed subsequent wake.


## World features inside companion settings (2026-11-11)

World's console pattern of seeing the effective persona and searching excerpts
before opening a record is integrated into the companion settings. The role
page reads Core's saved native prompt sections and uses World's own token
estimator. The desktop page reads the bound companion's expressive state and
asset catalogue. The archive page reads DSH's registered workspace conversation
count. The count and the searchable Bank cover different data.
[Settings guide](settings.md)

The archive reuses Mnemosyne's scoped recall, read and source validation. An
intentional search can start the local service. It creates no chat, sends no
model prompt and adds no browsing results to a conversation's context. A real
two-Bank fixture searched for a saved preference, expanded its source text,
corrected it, switched to a second Repo, switched back and withdrew the first
record. Queries and detail reads respected the active Bank and current source
eligibility throughout. [Provider integration check](../tests/memory-process.test.mjs)

The default suite passed 59 tests, and the Memory suite passed 15 provider and
3 process tests. An isolated Electron check exercised the five pages, explicit
search and drill-down, withdrawal, binding changes, retained form drafts and
narrow layouts. The personal profile received build `474bd770830b`; all 603
installed files matched the archive. Both plugins kept their activation state
and standalone World's 198 checked files and the five protected profile/Repo
files matched their pre-update hashes. The personal DSH app opened the archive
from the overview and displayed the search field and 16 attached native
conversations. The archive and receipt are in `.cache/world-integration/`.
The installer backed up the profile and Core/Memory data to
`~/.dsh/profiles/desktop/backups/codex-pet/2026-11-11T11-12-51-226Z/`.

## Companion settings redesign (2026-11-11)

The native settings entry is **大肥鱼**. Its stable DSH slot ID remains
`dsh-Chatpet`. The overview reads the current companion, workspace and desktop
state. The other three pages group the existing controls by what the owner
wants to change. Memory and desktop edits share the workspace configuration
file but each save submits only its section's changes against the last
acknowledged configuration. [Settings guide](settings.md)

The renderer check loaded the settings slot with DSH's React in Electron,
using the production owner settings handler and a temporary workspace. It
recovered from a failed initial read, bound and initialized the workspace,
saved the role, and checked the stored values after alternating memory and
desktop saves with unsaved edits on both pages. It also checked a narrow
window for horizontal overflow, and retried after a binding succeeded but its
initialization failed. Old workspace fields were inaccessible during recovery.
The overview reads new-conversation memory enrollment separately from the
on-demand provider's process state. [Renderer check](../tests/companion-settings-window.cjs)

To repeat the renderer check on this Mac, build the project using the local
toolchain, then run
`"$HOME/.dsh/electron/Electron.app/Contents/MacOS/Electron" tests/companion-settings-window.cjs --screenshots`.
The captures in `.cache/settings-redesign/` show fixture data.

The final offline update installed build `de339f53bd54`. All 603 installed
files matched the archive. The owner's workspace files (SOUL, USER, manifest
and core settings), DSH user patch, bundle selection, unrelated dependencies
and the 198 files checked in standalone World matched their pre-update values.
The profile had both Chatpet and World enabled before the update. DSH reopened
and the personal **设置 → 大肥鱼** overview displayed all four tabs, the desktop
action and the actual new-session memory mode. The personal view showed memory
enabled for new conversations and a recall limit of eight blocks. The default
suite passed 58 tests. Receipt and verification are in
`.cache/settings-redesign/install/`. The final profile and data backup is
`~/.dsh/profiles/desktop/backups/codex-pet/2026-11-11T10-58-07-716Z/`.

## World foundation (2026-11-11)

The package exposes sixteen component namespaces through `dsh-Chatpet/world`.
Core registers them as `ctx.petWorld.modules` in DSH and resolves live session
membership through `ctx.petWorld.sessionStatus(session)`. Core and Emotion use
the same binding check. Importing the components registers no model tools,
starts no background session and opens no external account. Each factory takes
its host, store or transport when the owning component uses it. [Package entry](../src/world/index.ts) · [Native service](../src/world/service.ts)

| Checklist items | Working entry points | Connection in this build |
| --- | --- | --- |
| 1 persona, 2 scope | Persona sections and per-session refresh, membership and scoped settings | The native Standard session places SOUL, USER and Memory policy in its system prompt. An edit replaces the old prompt on the next request. Existing Pet permission and Repo binding rules apply. |
| 3 recent history, 4 archive | Select recent turns, filter already visible message IDs, render history, extract attributed native records | Available to consumers. Pet still uses its existing Mnemosyne projections and full native transcript recovery. Automatic retrieval on a warm turn has not been replaced. |
| 5 memory lookup, 6 compaction | World lookup/read API over a supplied store and the existing native batch installer | Core installs Pet's batch path through the foundation. Live fact capture, correction, forgetting and recall stay with Mnemosyne. |
| 9 reflection, 7 mood | Dated diary reader, self backup, World mood reader and renderer | Reflection factories are available. Pet's textual mood and receipts are active. Fixed expression instructions and the asset catalogue have moved to the stable prompt. Dynamic state still uses a DSH snapshot. |
| 10 Life, 11 bridge | Home, alarm, Life runtime, bridge and outlet factories | Can be constructed with explicit host dependencies. Background Life and proactive delivery are not started by Core. |
| 12 routes, 13 QQ, 14 WeChat | Speaker and group routing, QQ batching/reply planning/outbox, WeChat host module, presence and recorder | Offline adapter paths are available. SnowLuma login, Windows client integration and live sending need their channel-specific integration. |
| 15 album, 8 console/health, 16 activity/usage | Persistent photo store, console sources, faults, activity journal and per-step estimate | Available to service consumers. The existing settings UI has no new album or Life dashboard. Estimates use the schedule in the pinned World release. |

The vendored release subset contains original JavaScript, type declarations and
templates from World 0.7.4, tied to the published tarball integrity and
individual SHA-256 hashes. The older reference checkout remains documented
separately. [Origin](../vendor/dsh-world/origin.json) · [License](../vendor/dsh-world/LICENSE)

Verification used isolated data. The default test suite passed 57 tests,
including component checks for the sixteen namespaces. A native Standard
fixture covered initial placement, tool continuation, persona edits, scope
exit and resume of a pre-upgrade mixed runtime snapshot. The visible request
lost the obsolete sections while the original events and unrelated sections
were retained. The local Mnemosyne checks covered playback-linked correction
and forgetting. A two-directory restore retained 30 native events and
continued the same conversation. None of these fixtures measures provider
billing. A distributable archive is under `.cache/world-foundation/`.

At the time of the foundation installation, the desktop profile received
machine-bound archive `8daac2f1b0cd`. All 603 installed files matched the
prepared archive. The owner's bundle list then enabled standalone World and
left dsh-Chatpet disabled. Verified the
profile patch and the bound Repo's SOUL, USER, manifest and core configuration
against pre-update hashes. DSH reopened with this selection. The update
performed no companion chat or Desktop launch. Receipt and verification are in
`.cache/world-foundation/install/`. Profile and Core/Memory backups are in
`~/.dsh/profiles/desktop/backups/codex-pet/2026-11-11T10-39-01-534Z/`.

## Updated upstream Desktop audit (2026-11-11)

The owner requested another configuration/interaction comparison after an
upstream update. Review target: dsh-pet **0.4.7**, exact commit
[`c7ea8b28e2a8b04a495a3b472a871dff6969ccca`](https://github.com/PC2005-cloud/dsh-pet/commit/c7ea8b28e2a8b04a495a3b472a871dff6969ccca).
The current vendor pin remains `0e6465f29bb89b386390ba0f14fb86fa1bc656d0`
(0.4.1). Sources were retrieved through GitHub at an explicit ref, without
running upstream hooks or changing vendor files. The exact-source snapshot and
blob inventory are in `.cache/upstream-review/c7ea8b2/`. This is an audit,
not an upgrade or installation; installed candidate `a3b1366d102b` is unchanged.

The earlier feature-pass table describes connected entry points, **not complete
upstream configuration, asset or interaction parity**. The following gaps remain.

| Area | Current evidence and consequence | Verification |
| --- | --- | --- |
| Live screen confinement | `shell.js` changes `config.confineToScreen` but not the sprite's constructor-copied `confineToScreen`. Saving can leave old behavior until reload. | Actual isolated Electron: config `true`, sprite `false` after a preferences event. |
| Cascading menus | The pinned mount lacks upstream's leaf-hover handler that hides an open sibling branch. | Actual Electron: two visible columns remain after hovering a leaf; updated `src/shared/menu/mount.ts` adds the missing handler. |
| Pointer pass-through | `main.cjs` accumulates `offBodyMs` on the body and during busy input, rather than only non-busy margin time. | Current policy/pump reproduction: 1,200 ms on the body makes the first margin tick release immediately; the upstream reset preserves the grace period. |
| Hover tooltip cleanup | New upstream `pointerZone`/`leavesBody` → `pet:pointer-left` → preload callback → `setTip(false)` chain is absent. | Exact source comparison of main/windows, pointer-target, preload and sprite/init. Physical-cursor stuck-tooltip reproduction was not attempted. |
| Display changes | Adapter calls `relayout()` after replacing geometry without the previous viewport. The pinned sprite also converts a temporarily clamped corner position to custom positioning; upstream now preserves corner anchoring. | Source comparison; no physical display/remote-desktop test in this audit. |
| Animation performance/window defaults | Current video always uses the alpha filter; upstream defaults `PET_ALPHA_FIX_ENABLED` to `false` to avoid its per-frame cost. Current window also lacks upstream `hasShadow: false` and `setBackgroundThrottling(false)`. | Actual Electron reports the filter active, shadow `true`, background throttling `true`. No frame-rate measurement or attribution of the earlier orange outline. |
| Original action coverage | Current catalog has 21 clips, eight shared expression actions and four stickers. Original config has five click actions, three movement actions, five idle categories, six balance tiers and three whisper actions. Adapter substitutes one expression pool and different hard-coded weights; `balanceEnabled: false` suppresses balance-tier animation. | Catalog/config/adapter comparison; this is partial coverage, not full migration. |
| Whisper action and sleep schedule | Every `say` invokes `showWhisper(..., false)`, including dedicated whispers. Only text/image is displayed. Sleep talk shares the normal whisper interval, while upstream has independent 60-second sleep talk and 300-second whisper defaults. | Adapter, feature scheduler and original config comparison; no model request made. |
| Editable configuration | Original physics, font, home corner/margins, animation pools/weights, work-status switch and text pools lack equivalent settings. Independent whisper-image control and sleep-talk interval are absent. Existing copied defaults do not make those options configurable. | Current settings schema/UI against original config. Size, fixed position, sound, reply bubbles/duration, confinement and normal whisper/balance intervals are already exposed. |
| Other entry points | Original tray/menu-bar entry and original notification enable/permission/click-to-session flow are absent. The latter is implemented in upstream's DSH browser client, rather than the Electron body. | Main/plugin source and upstream tray-platform/client/notify comparison; no notification permission requested. |

Scope distinctions: Voice remains explicitly deferred. Native conversations,
role and Mnemosyne ownership deliberately replace upstream's independent chat
model/history/memory controls; copying those would create a conflicting runtime.
Browser overlays, multiple pets and public third-party control were not started
in the previous pass. The new “吃白饭” scene is a DSH `shell.overlay` client
feature using public control/pose/progress/menu APIs, not a self-contained
Electron sprite action; its five clips and scene have not been ported. These
expansions should be named separately from the missing single-pet behavior.
The upstream topmost watchdog is disabled by default; its absence is not evidence
of a missing enabled feature. Windows/Linux-specific safeguards were source-read,
not runtime-tested on this Mac.

Disposable audit fixture: `.cache/upstream-review/probe.cjs`; observed output:
`.cache/upstream-review/probe-results.json`. It exercised the shipped main,
preload and renderer with fake host responses in separate windows. No installed
profile, role, settings, memory or conversation was changed; no paid model call
or upstream dependency installation occurred. The existing upward-flight fix
already matches upstream overflow/content-bound options and is not an open gap.

## Upward flight boundary repair (2026-11-11)

The owner reported upward movement stopping during flight. An actual Electron
regression reproduced the missing upstream host behavior: after requesting a
transparent-window origin of -130, macOS returned 33. The large top margin for
bubbles/menus reached the OS boundary before the character reached the top.

The local adapter now matches pinned dsh-pet `main/windows.js` and `main/ipc.js`:
`useContentSize: true`, `enableLargerThanScreen: true`, and `setContentBounds` for
renderer movement reports. The upstream drag/spring/throw physics are unchanged.
The actual-window check verifies a negative origin, continued upward movement
through that boundary and the normal return to falling velocity. Existing click,
menu, bubbles, sleep, images and chat checks pass, plus two helper exit cycles.
Evidence: `.cache/desktop-drag-height-before.log`,
`.cache/desktop-drag-height-after.log`, `.cache/desktop-drag-height-lifecycle.log`.
Installed as `a3b1366d102b`, replacing `b1fedc12e4ba`, with all 437 package files
verified. Receipt/verification: `.cache/desktop-flight-repair/install/`.
Backup: `~/.dsh/profiles/desktop/backups/codex-pet/2026-11-11T09-02-43-885Z/`.
Reopened DSH, started Desktop through settings and observed the installed body
and animation. SOUL/USER/core.json/manifest match the new pre-install backup.
No model request was sent. Physical mouse/trackpad feel remains owner trial.

## Feedback repair installation (2026-11-11)

Owner-authorized replacement completed in the desktop profile. Machine-bound
archive suffix: `b1fedc12e4ba`, replacing `7732673adcf4`. Receipt:
`.cache/feedback-repair/install/installation.json`; verification:
`.cache/feedback-repair/install/verification.json`. All 437 installed files
match the prepared archive. The user profile patch is unchanged.

Rollback data/profile backup:
`~/.dsh/profiles/desktop/backups/codex-pet/2026-11-11T08-43-47-257Z/`.
A full companion-directory copy is also retained at
`.cache/feedback-repair/install/companion-repo-before/`. SOUL, USER, core.json
and manifest match that pre-install copy byte for byte after startup. Core and
Memory runtime data may acquire new acknowledgement/portability records normally.

Reopened the actual application and verified the new Desktop controls, saved
role and existing sticker probability of 100. Automatic whisper and periodic
balance remain off. Opened Desktop through settings and inspected the actual
installed helper's right-click menu. No chat/model request was sent. Natural
model quality, real-provider balance, capture permissions and owner interaction
acceptance remain trial work. The pre-existing optional Room compatibility
warning remains; no exemption or unrelated plugin change was applied.

The following implementation and pre-install evidence is historical preparation
for this installed archive, not a claim that the repair is still uninstalled.

## Remaining Desktop feature migration (2026-11-11)

The owner requested the other upstream features and selected a complete feature
pass with Voice still deferred. This extends the six-feedback local candidate;
the installed profile is unchanged. The same package path is rebuilt after checks.

| Feature | Reuse and connection |
| --- | --- |
| Click/menu/home | Original click response and squash, shared context-menu rendering/action tree and home logic. Ordinary click responds; chat uses original modifier/hover shortcuts and menu. |
| Bubble display | Original `showWhisper`, bubble hold/rendering and priority. Existing native final replies feed it directly. Scrolling retains long display text without a second summary call. |
| Sound | Original `click-duck.wav`, font/cursor assets, shared menu/tooltip styles, playback volume and throttle, served by a finite local Electron protocol route. |
| Work bubbles | Original `workStatusTexts` pools from the pinned config and existing native work events. Clicking a work bubble selects that verified bound native session in compact chat. |
| Sleep | Original three-stage state machine, three original clips and text pools. Sleep survives body reload within the component lifetime; component restart wakes, matching upstream session-state semantics. |
| Whisper/sleep talk | Unmodified upstream generator/model selection/reasoning capability checks; native LLM and current model, configured SOUL. Manual requests are explicit; automatic generation is off by default and uses settings, quiet/work/window gates and single-flight execution. No separate chat history or Memory writer. |
| Todos | Original panel, route validation, store and reminder policy. Repo-owned Desktop file; guard rejects malformed/link files before the original store can overwrite them. No private HTTP listener or replacement Agent loop. |
| Balance | Original built-in provider registry and parsers; native credential resolution/account service. Manual and optional periodic query; failures remain explicit. No credentials enter the helper or Repo. |
| Image/screenshot chat | Original image picking/encoding with native attachment admission and the existing session. Repo copies restore through the attachment service. Capture is user-triggered and requires OS permission. |
| Settings | Size, fixed/confinement, sound, reply bubble/duration, automatic whisper/interval and balance/interval persist with the existing owner/revision checks. |

Pinned source hashes and media origins are in `vendor/dsh-pet/origin.json`.
`scripts/build-desktop-animation.mjs` verifies sources and emits native feature
modules using the existing compiler; no upstream installation/build hooks run.
Voice remains excluded by the owner. Browser overlays, standalone AI setup,
multiple pets and the upstream public third-party HTTP/control API are not
started by this single-companion DSH adapter.

Evidence is retained in `.cache/desktop-extra-*.log`: actual Electron click,
menu, reply bubble, sleep transitions, sound decoding, todo panel, balance failure
notice, image preview, Chinese send/stop/reopen and helper lifecycle; original
store persistence/malformed-data protection; scripted native whisper scheduling
and quiet suppression; native image admission and restoration in two device
storage roots. Native controller, image-to-model requests, Memory batching, correction/forgetting,
workspace isolation and Repo migration regressions pass on this candidate. The
local suite has 45 passing tests. During image integration, replaying already
acknowledged observations was found to mutate a just-recalled episode version;
the adapter now revalidates acknowledged sources instead of reconsolidating them.
Provider eligibility and withdrawal checks remain active. All model replies are local fixtures. No real
provider balance query, screen permission grant or paid-model call was performed.
Manual interaction feel, real-provider balance, screen capture on an authorized
machine and natural whisper quality remain owner-trial checks.

## Owner feedback repair (2026-11-11)

The six feedback repairs are implemented and checked in the local checkout.
The prepared package is `.cache/feedback-repair/dsh-Chatpet-0.0.0.tgz`.
It has not replaced installed candidate `7732673adcf4`; no owner acceptance
or paid-model quality result is implied. Original data and rollback archives
remain intact.

### Implementation and reuse

- The Bundle declares settings, Core, Memory, Emotion and Desktop as separate
  native entries. Native component unload/reload retains conversations. Memory
  enrollment is latched per conversation: disabling affects new chats only;
  existing Memory chats keep their provider and checks, and existing plain chats
  stay plain after re-enabling. This follows the owner's final correction.
- Desktop runs the original dsh-pet PetSprite shell and shared, animation,
  motion, input and playback modules from commit
  `0e6465f29bb89b386390ba0f14fb86fa1bc656d0`. The build verifies vendor hashes
  and uses the existing TypeScript toolchain. Host adapters connect packaged
  assets, native conversation, work status and Emotion. Upstream setup hooks
  and model loops are not run. The earlier animation-only prototype and custom
  renderer are superseded; rollback sources remain under
  `.cache/desktop-repair-2026-11-11/` and in the installed candidate archive.
- Full original native events are copied under the bound Repo's
  `.chatpet/data/core/native-sessions/`. Restoration uses native persistence,
  retains session IDs and checks existing log prefixes before reuse. Conflicting
  content is refused without overwriting it. Stable storage identity preserves
  persona, configuration, Bank, emotion and the compact session when a new
  device assigns a different workspace ID. See [portability](portability.md).
- Batching adapts dsh-chatbot's turn/idle/minimum-interval workflow, uses native
  compaction and joins summaries to the existing Mnemosyne Bank as source-linked
  episodic records. Originals remain intact. A failed Bank write retries the
  retained summary without another inference. Defaults are 10 completed turns,
  10 idle minutes and a 5-minute minimum interval, editable in settings. Recall
  defaults of 8 records and 600 characters per block are also editable. Visible
  native context is excluded from automatic recall; explicit recall and
  `pet_memory_read` retain complete eligible details.
- Continuing textual emotion is updated by the same native reply and drives
  action/sticker selection. Neutral replies retain state without renewing its
  mood-change timestamp. Correcting or forgetting a linked cause retires it.
  No additional per-reply inference or numeric psychology model was added.

### Verification and limits

Repair checks use disposable data and local scripted inference, with zero
external model calls. Evidence logs are under `.cache/`:

| Check | Evidence |
| --- | --- |
| Local build and regressions | Type checking/build pass; 44 local tests, 15 Python provider tests and 2 service-process tests pass. `feedback-repair-tests.log`, `feedback-memory-provider.log`. |
| Native workspace and Memory | Isolation, streaming, correction/forgetting, guarded reads, full-tail on-demand detail and old/plain conversation policies pass. `feedback-native-workspace.log`, `feedback-native-memory.log`. |
| Components and batching | Desktop/Emotion unload/reload, retained session/state and new-chat Memory enrollment pass. Five original turns remain after one summary. Scripted request size: 27,816 to 16,363 characters (about 41% smaller). `feedback-native-desktop.log`. |
| Portability | Two independent profiles and two Repo paths retain 30 original events / 5 messages, the same session, settings, Bank and emotion, with zero restore inferences. Continuation and refusal of conflicting copies pass. `feedback-native-portability.log`. |
| Actual Electron shell | Packaged video decoding, upstream animation-driven wandering, controlled missing-pointerup recovery, terminal-before-queued-Emotion playback, Chinese composition/one send, streaming, fold/reopen and stop pass. Two helper start/exit cycles pass. `drag-recovered.png` was visually inspected. |
| Reference regressions | Original drag tests (17) and desktop geometry tests (4) pass. Earlier animation-engine tests belonged to the superseded prototype. |

The window check uses controlled DOM pointer events (capture stubbed only in
the fixture), not OS-level mouse handling. Native presentation receipts are
separate controller checks. Request characters do not measure billed tokens or
natural-reply quality. Real mouse/trackpad and multiple displays, real new-device
setup, spontaneous replies, latency, billing and owner acceptance remain trial
work.

## Historical installed candidate evidence

2026-11-11, Mac desktop, DSH 0.2.2-rc.1. The installed companion keeps the
owner's existing workspace, identity and account/model configuration. Open
**DSH Settings → dsh-Chatpet → 桌宠与近期记忆 → 打开桌宠**, then click the fish.
Open settings again to close it. The desktop window is started on demand.

| Surface | Verification |
| --- | --- |
| Installed settings | Opened the actual desktop settings and verified all six numeric controls. Clicked the launch button. DSH acknowledged startup and displayed the close button. The older workspace reads the six defaults until the owner saves a change. |
| Electron windows | Played a packaged transparent VP9 clip in the real renderer. The real fish opened the chat; composition and Enter generated one send. Visible text, folding, reopening and stop passed against a local window-host fixture. The test gives a screenshot path. |
| DSH integration | Native session controller, workspace registry, Standard Agent and persistence with deterministic inference. Verified streaming before completion, stopping, another question, long final text, archive/new and restored context. Four-module check used a renderer receipt fixture, the real Memory service and a new first model request. |
| Recent and durable memory | Verified playback-grounded preference creation, correction, forgetting, repeat handling and mood continuity. Confirmed another workspace's Bank and first request were isolated. Archive consolidation reads admitted persisted turns and retains source references. |
| Assets | 18 existing Dafeiyu whale-tail clips, including eight expression actions, and four stickers with descriptions. The source and noncommercial terms are in [third-party notices](../THIRD_PARTY_NOTICES.md). |
| Model and owner trial | All controlled integration checks used local synthetic model replies. Real generation latency, spontaneous expression choice and the owner's qualitative acceptance are outstanding. |

## Reproduce

Source the repo environment using `source ./scripts/env.sh`. Run `pnpm test`,
`pnpm test:memory`, `pnpm test:native-workspace`, `pnpm test:native-memory`,
`pnpm test:native-desktop`, `pnpm test:native-batch`,
`pnpm test:native-portability`, `pnpm test:desktop-window` and
`pnpm test:desktop-lifecycle`.
The native checks use the installed DSH libraries and disposable data.
The Electron window check needs a desktop session. The Memory process checks
start a temporary local service. See [settings](settings.md) for saved defaults.

## Installation receipt

The installer used an offline local archive and preserved the profile patch.
Receipt: `.cache/mvp-1.0/install/installation.json`; archive suffix:
`7732673adcf4`. All 375 packaged files matched the installed files. Before the
app was reopened, all files in the backed-up Core and Memory directories matched
their live counterparts. The pre-MVP rollback copy is in
`~/.dsh/profiles/desktop/backups/codex-pet/2026-11-11T04-46-36-959Z/`.
The additional backup from the final playback receipt validation update is in
/Users/hy-yin/.dsh/profiles/desktop/backups/codex-pet/2026-11-11T04-50-33-717Z.
The installer also reported an existing version incompatibility for the optional
Room plugin; DSH leaves that plugin inactive.

The current Memory runtime uses the bundled Mnemosyne engine and its workspace
adapter for source validation, archive joins and owner operations. The upstream
global capture plugin is inactive. Native session logs remain owned by DSH.
