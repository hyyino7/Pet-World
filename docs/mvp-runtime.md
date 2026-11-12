# Dafeiyu MVP runtime evidence

## Native-service refactor (2026-11-12)

The owner approved the [amended direction](planning/native-service-refactor.md)
after review of Claude's proposal: “可以，按这个方向推进吧”. Source integration
and the owner-approved installation are complete. Build `c18f11e04c85` is installed
and enabled; `99a9fb2a2fd9` remains available for rollback. No account delivery,
commit or detailed owner acceptance is recorded by these checks.

### Implemented critical paths

- Ordinary native owner/registered-guest turns use DSH execution and scoped
  service adapters, without Core activity/execution records, serial execution
  slots, per-chunk Memory gates or ordinary step/tool/time limits. Autonomous
  Life/TV retain explicit-source admission and bounded native-turn counters.
- SOUL is pinned within a turn; edits apply on the next turn. Guest presets
  share SOUL and the Bank through explicit native-preset hook attachment;
  static USER is not directly injected. Native histories and group-local tools
  remain separate, with no guest owner/file/Memory mutation tools.
- Every turn replaces recall, including an empty replacement on off/failure.
  Attributed input and final assistant text are observed with stable provider
  source keys. Tool output is not automatically ingested. Provider failure
  leaves chat available. Scope is checked after asynchronous preparation.
- Core-owned execution dependencies no longer decide whether an ordinary
  conversation or matter record remains usable. Bank correction/withdrawal
  still controls future retrieval. Original dialogue, self/diary files and
  independent emotional state are retained rather than retroactively erased.
- One Emotion file works without Memory or displays, retains legacy optional
  numeric values, supports nine semantic labels, and serializes concurrent
  footer updates without an additional model call. Guest footer updates use
  the same service. Owner tools retain their own authority boundaries.
- Behavior publishes the authoritative activity and a semantic presentation
  projection. Desktop uses events/initial snapshots instead of 500ms polling;
  Room has accurate text fallback. Eating/sleep takes precedence over expression.
- Actual normal-host and random playback starts reach Emotion's recent ledger;
  accepted requests alone do not count as playback. The normal host obeys the
  saved strict work-animation delay. Restricted external control can query/wait
  for playback results but cannot report results or use owner routes.
- Compact speech reuses its existing original Pet controls. Room now uses those
  controls through a finite scoped `roomVoice` RPC, with cancellation/rebinding
  checks. The test uses synthetic microphone/audio services, not a real device.
- `dafeiyu-backup` provides offline file-level backup/verification/recovery with
  hashes, matching-code checks and a mandatory current-state safety copy. It
  replaces only companion/selected native workspaces, merges scoped registry
  entries, preserves unrelated workspaces/settings and adds immutable shared
  attachments only when missing. Current Qzone/WeChat delivery journals,
  group read/quota records, Core delivery/deduplication/usage rows and Life spend
  are retained: restoring an older local snapshot must not replay an external
  send or reset real expenditure. Missing current journals require explicit
  reconciliation rather than restoring an old pending queue. No live personal
  recovery was performed.
- Development SDKs match the observed runtime: DSH `0.2.2-rc.1` and Cordis `4.1.0`.
  Package installation used the repo-local tools and ignored package scripts;
  no global runtime or installed DSH application was replaced.

### Verification and limits

The current checkpoint includes a passing 82-case unit/World suite, 16 Python
provider cases, focused native Core/recall/batch cases, real DSH workspace and
channel fixtures, seven platform cases (including temporary HTTP), isolated
normal-renderer video-to-ledger checks and synthetic Room speech. A new
per-observation daily-review regression also passes. The final aggregate and
package readback are recorded at delivery below; do not add overlapping case
counts together. Fixture models make no paid inference calls.

Independent review identified old-turn asynchronous cleanup and cold-background
Memory ordering/duplicate-input defects during integration. Both were repaired
and covered by the real native-service fixture rather than ignored as passing
types. The first shared-memory fixture assertion was tightened to require a
completed native turn, preventing graceful fallback from masquerading as Bank
success.

Native turn/idle compaction remains available. A checkpoint that includes
Memory-off or withdrawn/unavailable source material is withheld from Bank rather
than silently backfilled or retried forever; `memory-batch.lastSummary` records
why. Per-turn Bank writes/recall and original native logs remain available.
This does not promise that every retained native checkpoint becomes a Bank
summary. Future Bank-only forgetting does not promise erasure of facts already
present in old native dialogue or independent emotion/self files.

Physical microphone use, actual online QQ/WeChat delivery/Qzone publication,
long real-model tasks, subjective expression quality, day-long Life stability
and owner acceptance remain separate checks. The installed startup observation
below does not replace those checks.


### Prepared delivery and recorded checks

Candidate **`c18f11e04c85`** passed preparation and was subsequently installed as
recorded below. Its 1,030 regular files
passed archive readback; every source payload matches the portable package, and
only the Core machine binding differs in the prepared archive. `pnpm` omits the
source-only `packageManager` field when packing; no runtime manifest change was
ignored. The prepared Core configuration exactly matched the pre-installation
companion configuration, including identities, paths and model routing.

- Portable archive: `.cache/native-service-refactor/release/dsh-Chatpet-0.0.0.tgz`.
- Prepared archive: `.cache/native-service-refactor/release/prepared/dsh-Chatpet-local-c18f11e04c85.tgz`.
- SHA-256: `c18f11e04c85bc00ed2b50f770350eb918cd339f2248a2b20633164aeb1d74a4`.
- Combined receipt: `.cache/native-service-refactor/verification.json`.
- Final logs: `.cache/native-service-refactor/checks/` (82 unit/World cases,
  16 provider cases, 20 backup/platform cases, real native-service integration,
  synthetic microphone/speech and event-driven Room checks).
- The Room fixture excluded the original 1200ms fallback when measuring immediate
  mirroring (7ms in the recorded run) and rejected wrong-workspace, old-revision
  and old-boot responses. Speech verified delayed-permission cancellation,
  stopped late tracks and wrapper cleanup without a real microphone.
- Earlier updated native-memory/workspace/channel fixtures remain recorded in
  `.cache/native-service-refactor/native-memory.log` and the implementation
  task's verification output. No external model calls were made.

Source preservation and the previous installed archive remain intact. No commit
or publication has been requested. Detailed installed owner acceptance remains
open; this checkpoint must not be marked as full acceptance.

### Installed native-service refactor (2026-11-12)

The owner explicitly selected “现在安装供我测试”. DSH was gracefully closed before
the fresh offline backup and native plugin update. The exact approved archive
`c18f11e04c85` was installed offline with package scripts disabled. The existing
profile patch, Core binding and bundle activation were retained; no installed
DSH application or global toolchain was replaced.

- Installation receipt: `.cache/native-service-refactor/install/installation.json`.
- Fresh private backup: `.cache/native-service-refactor/install/pre-install-backup/`;
  verified before replacement, with profile package/lock/config references in
  `install/profile-before/`. The previous matching-code archive remains available
  for rollback. No personal restore was performed.
- Integrity receipt: `.cache/native-service-refactor/install/verification.json`.
  All **1,030 installed files** match the prepared archive. Before startup, all
  **26 protected roots / 116 files** matched their saved existence, type, file
  set and SHA-256; selected workspace registration and archive/pin metadata for
  **18 native sessions** also matched. This does not claim a full backup of all
  unrelated global account or workspace data.
- Startup receipt: `.cache/native-service-refactor/install/startup.json`.
  Native accessibility observation confirmed **Settings → 大肥鱼**, all eight
  topic tabs, **小汐的世界**, and **已就绪 · Deepseek-Test**. Long-term Memory
  remained enabled; the normal body remained hidden as saved. The independent
  **打开房间** control was present.
- After startup, all 18 retained native transcript copies and their 979 original
  events remained intact. The observed differences were the new Core lock and
  updated garden/home state and Pet log; no protected files were removed. These
  are startup observations, not a claim that running state remains byte-identical.
- The native installer's profile peer warnings were compared with the saved
  pre-install lockfile: the warning categories were already present; only the
  declared Chatpet host-version ranges changed as intended. Source dependency
  checks and native runtime fixtures are recorded separately above.

Installation and startup verification sent no model messages and performed no
real microphone or account-delivery tests. The build is ready for the owner's
detailed trial; subjective behavior and full acceptance remain open.

## Four-feedback redesign implementation (2026-11-12)

The owner authorized execution of the [four-feedback plan](planning/feedback-redesign-plan.md):
“按照计划执行吧，测试可以基础一些，后面我会详细测试”. The current checkpoint is
repository implementation and focused verification: W1-W6 source work and the
requested basic checks are complete. Conservative presentation reconciliation is
implemented. The final portable and pre-install machine-prepared archives passed
readback. Following the owner's explicit installation request, applied build
`99a9fb2a2fd9` replaced `6e5c1796d459`; the installation is recorded separately
below. Implementation fixtures used disposable profiles and local scripted models.
Installation verification made no model calls. Owner acceptance remains open.

### Implemented paths at this checkpoint

| Package | Source behavior | Verification actually recorded |
| --- | --- | --- |
| W1: Core foundation | `.chatpet/COMPANION.md` is an optional owner-editable foundation; old Repos use the bundled default until saved. Core scopes the foundation and self-description to eligible native conversations independently of Life. Ordinary self-description updates retain source checks. Foreground verified-owner messages can resolve the retained native home while autonomous Life is off. | `companion-foundation.test.ts` and `workspace.test.ts`: 8 focused cases passed. `check-native-channel-homes.mjs`: isolated native DSH/local fixture passed, four guest conversations remained isolated, owner private input reused its home and guest tools were empty. |
| W2: Shared Behavior | `25-Behavior` / `petBehavior` owns one retained `home.json` and `garden.json` writer. Life controls autonomous eligibility; directed care and requested route/dwell work remain available without Life. Room/Desktop read the same body and phase. The original garden effect/receipt commit remains authoritative. | The original body baseline passed before adaptation. The updated `life-body.test.ts` has two passing cases covering sleep arrival/cancellation/restart/rebinding, paused directed care, requested garden completion/replay, no passive catch-up and stopping automatic work without inventing a harvest. A native Cordis service fixture also passed reload/admission and disclosure checks. |
| W3: Emotion | `.chatpet/data/emotion/state.json` is the canonical editable state, with expected revision and content-hash checks. One-time legacy import retains text and optional existing Room values. No score is invented for text-only emotion. Structured `anger`, `boredom` and `happy` support shared presentation; source-linked content is revalidated after reload and before disclosure. | `emotion.test.ts` and `emotion-state.test.ts`: five focused cases passed, including retained state, legacy import, stale edits, invalidation and damaged-file preservation. Room presentation source syntax and a small VM check covered the three structured feelings and sleep/eat/move priority. |
| W4: One normal Desktop body | The original Pet host is the only normal body carrier. Compact chat uses a separate framed chat-only helper. Shared activity affects only the rendered configuration; the original editor keeps its saved values. Runtime configuration refresh is generated from the hash-checked upstream helper input, and updates existing sprites without rebuilding the window. | A real original-host/React/Electron-helper fixture observed one native body, zero browser bodies, persistent eating with anger, eating after the original animation-end handler, sleep and return to idle. All sampled video elements decoded the selected current clip. The chat-only fixture observed one framed/resizable window, no body/tray, three Chinese stream snapshots and send/stop/new/reopen behavior. |
| W5: Independent Room | Room depends on Behavior rather than Life. `Room.open()` opens the existing scene in a framed, isolated Electron window; repeated opens focus that process. A finite preload bridge admits only eight Room operations and carries no owner credential into the renderer. The existing native Room conversation, image admission and TV observation boundary remain in use. | A real isolated Electron process loaded the shipped scene and used the native state/garden/history bridge. Rebinding closed the window, aborted a pending native bridge request, closed an actual Chromium fetch and exited the renderer process. |
| W6: Eight-page settings and presentation reconciliation | One companion settings entry exposes eight topics and the original Pet editor. Foundation/Emotion/timing operations use their owning services. Startup success follows actual running state; starting can be cancelled/retried, and bounded status polling does not replace unsaved drafts. Migration fills absent fields only; even an explicit value equal to a default remains an explicit choice. Conflict resolution requires the configuration hash to match the owner's displayed choice. | The isolated settings fixture passed eight tabs, no iframes, no overflow at 460px, saved foundation/Emotion and canonical timing, 33 original-editor inputs, hidden disconnected persona/model controls, cross-page/appearance draft retention and startup readiness/cancel/retry. Its Room.open call is a controlled substitute proving settings routing; the separate real-window case proves actual Room opening. Two focused migration cases passed malformed-file and explicit-conflict preservation. |

The bounded feiyu adaptation separates autonomous goal selection and passive time
from explicitly accepted task progress. New autonomous body/garden goals and
model wakeups remain stopped while Life is paused; requested work may still reach
its original completion checkpoint. Existing needs/crop values do not gain
paused-time catch-up. Legacy home/garden file locations and state are retained,
with additive host attribution for accepted manual work. Life no longer owns a
second body instance or ticker.

The lifecycle follow-up repaired three concrete boundaries: a stale optional
Behavior binding cannot prevent stopping/cancelling the previous native home;
Behavior reload restores the current Life admission; and Behavior awaits Emotion's
validated read before decisions or disclosure. Current automatic activities also
receive their own activity identity instead of reusing a finished manual action.
These are runtime-control checks, not evidence of natural long-term behavior.

Desktop physical actions retain the original action-selection, surface and lock
checks before mapping food, sleep and locked Baifan phases to the same Behavior
service. An animation cannot commit an invented physical effect. Existing eating
continues until the actual body activity changes, including after the original
clip-end callback. Drinking and garden work without a matching native clip use
accurate activity text with a neutral pose. Custom packs keep valid local media
and activity text; this is not a claim that new drinking/garden/custom-pack action
assets were authored or that their detailed appearance has been accepted.

The final focused source suite passed 17 cases, including Core foundation,
Emotion, shared body, presentation migration and the original Pet host adapters.
The native Room integration also passed with 11 local scripted-model calls,
paidCalls=0: Room-to-Agent action tools updated/read the real Behavior state,
replay did not repeat the turn, TV input kept its observation boundary and the
cross-session album cases passed. These replace neither matched natural-model
quality evaluation nor the owner's planned detailed trial.

### Retained evidence and limits

- [Focused source suite](../.cache/feedback-redesign/basic-checks.log) records 17 passing cases. [Native Room integration](../.cache/feedback-redesign/native-room-check.log) records the mounted installed Standard preset and the successful 11-call local fixture, without first-person `--photo` capture in this run.
- [Actual native body fixture](../.cache/feedback-redesign/check-body-live.json), [log](../.cache/feedback-redesign/check-body-live.log) and [eating screenshot](../.cache/feedback-redesign/check-body-live.eat.png) record original-renderer playback, one body/window, activity priority and live configuration. Its body/Emotion inputs are controlled fixtures; it uses no personal profile or model.
- [Chat-only window](../.cache/feedback-redesign/check-chat-window.json), [log](../.cache/feedback-redesign/check-chat-window.log) and [Chinese streaming screenshot](../.cache/feedback-redesign/check-chat-window.stream.png) record the independent framed chat carrier with no second body.
- [Settings fixture](../tests/companion-settings-window.cjs), [World reference](../.cache/settings-redesign/world-reference.png), [overview](../.cache/settings-redesign/after.png), [role](../.cache/settings-redesign/after-角色.png), [emotion](../.cache/settings-redesign/after-情绪.png), [Desktop](../.cache/settings-redesign/after-桌宠.png), [Life](../.cache/settings-redesign/after-生活.png) and [narrow layout](../.cache/settings-redesign/after-narrow.png) retain the isolated UI checks and visual reference. Draft/timing/state checks use real owning services; desktop-readiness and Room-open timing use controlled service substitutes.
- [Body checks](../.cache/feedback-redesign/life-body-check.log) record the two passing body cases.
- [Native lifecycle fixture](../.cache/feedback-redesign/check-behavior-lifecycle.mjs), [result](../.cache/feedback-redesign/behavior-lifecycle-result.json) and [log](../.cache/feedback-redesign/behavior-lifecycle-check.log) record actual Cordis reload, current Emotion reads, paused manual care and old-home cancellation. The old-home regression uses a controlled native-runtime receipt substitute; no model executes.
- [Independent-window fixture](../.cache/feedback-redesign/check-room-window.mjs), [result](../.cache/feedback-redesign/room-window-result.json) and [log](../.cache/feedback-redesign/room-window-check.log) record the shipped page, real preload/IPC, single process, pending-request abort, actual fetch closure and process exit. The binary was the device's `~/.dsh/electron/Electron.app`; its user data and body records were temporary.
- The maintained W1/W3 tests accompany the recorded focused runs: their [foundation](../tests/companion-foundation.test.ts), [workspace](../tests/workspace.test.ts), [emotion](../tests/emotion.test.ts) and [emotion-state](../tests/emotion-state.test.ts) cases remain the reproducible inputs. They do not establish personal-channel delivery or owner acceptance.

Physical screen sharing/capture was not exercised in the independent-window
fixture; renderer-process destruction and request cancellation were. The Room's
anger/boredom expressions reuse existing sprite and simple 3D posture/face paths;
they are not newly authored detailed animation packs. Natural emotional quality,
continuous manual feel, the final settings appearance and the integrated installed
experience require the owner's later detailed trial. The installed-settings
observation below is limited to startup; it does not establish detailed owner
acceptance.

The `.cache/feedback-redesign/` evidence is ignored local output, not source
committed to Git. Retain it with package/rollback evidence until delivery is
verified. Neither prepared artifact is an installed build or an owner-acceptance
receipt; the code delivery does not wait for the owner's separate detailed trial.

### Prepared delivery (2026-11-12)

W1-W6 repository implementation, the requested basic verification and final
package preparation are complete. The last focused run passed 17/17 cases.
The [readback receipt](../.cache/feedback-redesign/release/package-verification.json)
records the following immutable archive identities:

| Artifact | Result |
| --- | --- |
| [Portable package](../.cache/feedback-redesign/release/dsh-Chatpet-0.0.0.tgz) | Prepared; 126,405,780 bytes; 1,022 files. SHA-256 `959a80dbedfb6aa1e11ed581c6774aa7ef1170d03748abb998146d906239bfe5`. |
| [Pre-install machine-prepared package](../.cache/feedback-redesign/prepared/dsh-Chatpet-local-55a28e880eb9.tgz) | Prepared build `55a28e880eb9`; `applied: false`. SHA-256 `55a28e880eb9adcf7fbb4a4fd4a14405cccf6c3d01c47c8b8bc78bda8037e201`. |

All portable archive files matched the final source inputs. Readback verified the
new native entry exports, both Room `.cjs` helpers and the current generated
settings client. The final settings guide was included before the last pack.
Machine preparation reused the installed Core workspace binding and current
provider/model configuration; its [preparation receipt](../.cache/feedback-redesign/prepared/installation.json)
is not an application/installation receipt. Preparation did not replace the
installed plugin, restart the owner's app or make personal model requests.
This is the pre-install preparation checkpoint: `55a28e880eb9` was not the archive
later applied. Its identity and source SHA remain unchanged. The subsequent
owner-requested installation used the new machine-bound archive below.

### Installed redesign (2026-11-12)

The owner explicitly requested installation after source delivery. The native DSH
installer completed the offline package update and retained bundle activation.
Actual installed/enabled build: **`99a9fb2a2fd9`**, from
[the applied archive](../.cache/feedback-redesign/install/dsh-Chatpet-local-99a9fb2a2fd9.tgz).
Its SHA-256 is `99a9fb2a2fd9f0fe7e99731519231cd030389709322f2ea193d6478d3b3e2878`.
The [installation receipt](../.cache/feedback-redesign/install/installation.json)
and [verification](../.cache/feedback-redesign/install/verification.json) record:

- All 1,022 installed package files matched the applied archive.
- Before reopening DSH, all 45 retained companion files and 168 native-session
  files matched their pre-install content hashes. The personal profile patch was
  unchanged. This preservation comparison precedes normal app-startup writes.
- The installer backed up the prior profile/Core/Memory at
  `/Users/hy-yin/.dsh/profiles/desktop/backups/codex-pet/2026-11-12T00-59-37-944Z`.
  Complete companion/native-session offline preservation copies are retained
  under `.cache/feedback-redesign/install/preservation/`.
- Installation and its integrity verification used zero model calls. No full
  functional matrix or paid-model trial was rerun for installation.

A subsequent actual-app observation reopened DSH and entered **设置 → 大肥鱼**.
There was one Dafeiyu settings entry, and all eight pages loaded: 概览、角色、情绪、
记忆与档案、桌宠、生活、连接、工作区. The original role identity was retained and
the binding remained **Deepseek-Test**. Desktop status was closed; the independent
**打开房间** button was visible. No chat message was sent. This proves installation
and the limited settings/startup path; it does not establish detailed Room,
Desktop, emotional-quality, microphone, external-account or physical-screen
acceptance. The owner's detailed trial remains pending.

The [separate startup receipt](../.cache/feedback-redesign/install/startup.json)
records expected runtime initialization changes: canonical Emotion/presentation
migration and normal locks, WAL and log updates. The pre-startup unchanged-file
result must not be extended to those later writes. A post-startup check verified
all 17 portable native transcripts: all 888 original events remained exact
prefixes, with only two session/end-seed events added. SOUL and USER retained
their original bytes. There were no owner messages or model tests. This preserves
the difference between offline installation integrity and ordinary runtime
initialization without treating legitimate startup writes as data loss.

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

Historical 2026-11-11 checkpoint, superseded by [the installed redesign](#installed-redesign-2026-11-12).

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
