# Current Handover

- Updated 2026-11-12, Asia/Saigon.
- [Current selected scope](../planning/mvp-1.0.md#approved-pet-world-and-room-integration) includes the complete Pet, World and Room comparison. The owner confirmed the shared Life home, the same-turn Emotion state and isolation of external accounts, groups and speakers.
- [Current redesign implementation and verification](../mvp-runtime.md#four-feedback-redesign-implementation-2026-11-12) and [settings](../settings.md) cover the installed redesign; [the preceding integration](../mvp-runtime.md#three-reference-integration) is a dated historical baseline.
- Installed and enabled build: `99a9fb2a2fd9`, 2026-11-12. All 1,022 package files matched; the pre-startup comparison retained 45 companion files, 168 native-session files and the user profile patch unchanged. [Installation and startup evidence](../mvp-runtime.md#installed-redesign-2026-11-12)
- Preserve the personal binding, SOUL, USER, memory Bank and conversations. Online-account delivery, physical-device checks and owner acceptance must be dated separately from fixture results.

## Current task: owner trial of the installed redesign

The owner requested: **“准备handoff，我要开始测试了”**. Implementation and
installation are complete; the next activity is the owner's detailed trial of
the four confirmed feedbacks. No detailed owner result has been reported yet.
This handoff updates continuity only: it does not start more implementation,
model runs, configuration changes or another installation.

Start at **设置 → 大肥鱼**. The following are suggested entry points, not an
additional mandatory test matrix:

| Feedback | Entry and observable result |
| --- | --- |
| F1: Foundation without Life | **角色 → 基础说明**, then ordinary DSH/compact chat. Check identity and permitted self-description continuity while autonomous Life is paused; full component-unload checks can follow a concrete reported issue. |
| F2: One emotion and actual activity | **情绪**, **生活** and Room. Pause autonomous Life, request feeding or sleep/wake, and compare Room with the normal desktop body. Manual care should remain usable; an emotion change must not independently cancel eating or wake a sleeping body. |
| F3: Unified settings and normal body | **概览 / 桌宠**. Show/hide the normal body, change appearance and switch pages. Ordinary entry/settings use should not create a second body; deliberate multi-body use remains available. |
| F4: Independent Room | **概览 → 打开房间**, **生活 → 房间与菜园 → 打开房间**, or the pet context menu **进入房间**. Repeated activation should focus the same independent window; closing it should retain the activity and room data. |

The [settings guide](../settings.md) owns detailed navigation. The
[runtime record](../mvp-runtime.md#four-feedback-redesign-implementation-2026-11-12)
owns implementation and evidence: 17 focused cases and isolated real-window
checks passed, and the installed app's eight-page settings startup was observed.
Those are not detailed owner acceptance. At that startup the desktop body was
closed; that is a dated observation, not a required setting to restore during
testing. Do not assume Life, body visibility or other preferences remain unchanged
after the owner starts using them.

Keep these interpretation limits visible during the trial:

- Drinking/garden activities without a dedicated native clip use accurate text
  and a neutral pose; custom packs retain their local media with activity text.
  Anger/boredom in Room reuse existing posture/face paths. Detailed visual quality
  is still for the owner to judge.
- DSH, compact chat, Room and bridged channels retain their existing native
  conversation mappings; shared body/emotion does not mean merged chat history.
- Room has button/menu access; a universal global Room shortcut was not added.
- Conflicting saved appearance values are preserved for a field-level choice;
  an explicit value equal to a default is not silently overwritten.

Immediate restart action: take the owner's next observation, identify its entry,
Life/activity state, steps, expected result and actual result, and compare it
with installed build `99a9fb2a2fd9` before deciding a bounded repair. A new broad
redesign, history merge or test campaign has not been selected. Do not reinstall
the same package or reset personal state merely to resume the conversation.

## Checkout, delivery and recovery pointers

- Checkout: `/Users/hy-yin/Developer/Codex Repo/Codex-Pet`, branch `main`, HEAD
  `676bd65f61a0086249575d4077cd0587950b8b36`. The approved implementation includes
  extensive unstaged changes and new untracked files; nothing is staged or
  committed for this delivery. HEAD alone does not contain the installed redesign.
- Installed package: `/Users/hy-yin/.dsh/profiles/desktop/node_modules/dsh-Chatpet`.
  The profile dependency and enabled bundle were rechecked for this handoff and
  still identify `99a9fb2a2fd9`. This was a read-only handoff check, not another
  runtime or owner test.
- Preserve [the applied archive](../../.cache/feedback-redesign/install/dsh-Chatpet-local-99a9fb2a2fd9.tgz),
  [installation receipt](../../.cache/feedback-redesign/install/installation.json),
  [integrity receipt](../../.cache/feedback-redesign/install/verification.json)
  and [startup receipt](../../.cache/feedback-redesign/install/startup.json).
- Full pre-install preservation copies remain in
  `.cache/feedback-redesign/install/preservation/`; the native installer backup is
  `/Users/hy-yin/.dsh/profiles/desktop/backups/codex-pet/2026-11-12T00-59-37-944Z`.
  Keep `.cache/feedback-redesign/` and `.cache/settings-redesign/`: their archives,
  fixtures, logs and screenshots are outside Git and are not protected by a commit.
- Product requirements remain in [MVP 1.0](../planning/mvp-1.0.md#owner-trial-redesign-feedback)
  and the [execution plan](../planning/feedback-redesign-plan.md). Use the
  repo-local toolchain for any later authorized repair. Preserve the dirty scene,
  unrelated changes, personal data and native conversations; no commit, cleanup
  or rollback is authorized by the handoff alone.

## Completed: four-feedback implementation and basic checks

The owner's execution instruction is: **“按照计划执行吧，测试可以基础一些，后面我会详细测试”**
("Execute the plan; keep tests basic; I will test it in detail later.") This
superseded the earlier plan-review-only gate and authorized implementation with
proportionate verification. That source work and its basic checks are complete. The [four feedback decisions](../planning/mvp-1.0.md#owner-trial-redesign-feedback)
and [detailed execution plan](../planning/feedback-redesign-plan.md) own product
scope. The owner subsequently explicitly requested installation. Installation is now verified below; detailed owner acceptance remains pending.

| Work | Current repository state |
| --- | --- |
| W1: Core foundation | Implemented: optional editable foundation, ordinary self-description handling without Life, scoped native context and foreground owner-home resolution. Focused tests and the isolated native channel fixture passed. |
| W2: Shared Behavior | Implemented: `25-Behavior` owns the retained home/garden state; paused or unloaded Life leaves directed care available. Body and native lifecycle fixtures passed. |
| W3: Emotion | Implemented: one editable emotion file, retained legacy values, source revalidation and structured feelings; text-only operation and focused state tests passed. |
| W4: One Desktop host | Implemented: the original Pet host owns the normal body; compact chat is a framed chat-only window. Real Electron checks retained one native body, ongoing eating through Emotion/animation-end changes, sleep/wake assets and live configuration without rebuilding the window. |
| W5: Independent Room | Implemented: Room uses Behavior and opens a separate framed window. A real isolated Electron check covered the shipped page, native bridge, repeated-open focus and rebind cancellation. |
| W6: Unified settings | Implemented: eight pages, one original Pet editor and an independent Room entry. An isolated settings fixture passed saved Core/Emotion/timing values, drafts, startup readiness/cancel/retry and narrow layout checks. |
| Migration / package / installed trial | Conservative presentation reconciliation is implemented: fill missing fields only; preserve every explicit value and require a hash-checked choice for conflicts. The immutable portable/prepared archives passed readback. After the owner requested installation, build `99a9fb2a2fd9` was installed and enabled; the earlier `55a28e880eb9` preparation remains a historical receipt, not the installed archive. |

The [current runtime evidence](../mvp-runtime.md#four-feedback-redesign-implementation-2026-11-12)
records source changes, exact fixtures and their limits. The [settings guide](../settings.md)
describes the installed eight-page layout and direct Room path. The actual reopened
DSH app loaded the unique 大肥鱼 entry and all eight pages, retaining the original
role identity and bound Deepseek-Test Repo. Desktop was closed and the
independent Room button was visible; no message was sent. Installation-only hash
preservation is recorded before startup; expected initialization changes after
startup are recorded separately. All 17 portable transcripts retained their 888
original events as exact prefixes, and SOUL/USER retained their original bytes.

Keep the input surfaces and their histories distinct: DSH, compact chat, Room
chat and bridged external channels remain native DSH conversations. Merging the
owner's chosen history across surfaces has not been selected. Room's new window
reuses its existing native conversation and shared body; opening it creates no
second assistant runtime. A universal Room keyboard shortcut has not been added.

Repository implementation of W1-W6 and the requested basic verification are
complete, with 17 focused cases passing and final archive readback verified;
installation of build `99a9fb2a2fd9` and a limited startup observation are also
complete. Detailed owner acceptance is pending. The [prepared delivery](../mvp-runtime.md#prepared-delivery-2026-11-12)
records its original immutable archive identities; the [actual installation](../mvp-runtime.md#installed-redesign-2026-11-12)
records the subsequently applied archive and backup. Continue from the owner's
detailed trial; do not resume
superseded plan-only gates or expand the test matrix on its own. Preserve
SOUL/USER, foundation/self-description, Bank, complete conversations and rollback
material. Do not treat an engineering fixture as the owner's detailed trial.

## Previous installed trial baseline (2026-11-11)

Build `6e5c1796d459` was the preceding installed baseline recorded on 2026-11-11,
superseded by `99a9fb2a2fd9` on 2026-11-12. Its
entry is **设置 → 大肥鱼 → 日常生活 → 进入 3D 房间** and its manual feeding,
touch and garden actions are gated on Life. Its overlapping **大肥鱼 → 桌宠互动**
and **桌宠配置** routes were the owner's reported redesign input. Keep this dated
observation distinct from the installed redesign's startup evidence.

The four redesign requirements are independent foundation instructions, shared
emotion/actual behavior, unified World-derived settings, and direct Room access
in its own window. Paused manual care, settings consolidation and Room access
are selected requirements. One search across all eligible memories, conversations,
diaries and photos, and shared selected conversation history remain proposals.

The checkout is `main` at `676bd65f61a0086249575d4077cd0587950b8b36`, with
unstaged implementation and documentation changes and no staged scope at this
checkpoint. Continue in this checkout; preserve unrelated and parallel changes.
The prior installed-build evidence remains [dated separately](../mvp-runtime.md#installed-desktop-build).

## Previous installed Life baseline

Build `85b0ff1d67f4` added the original Room body to World’s Life home. It was installed and the owner's Life switch was paused. Its one-minute alarm, native turn, watering event, cancellation, Memory batch and settings controls were tested before the wider integration. [Previous evidence](../mvp-runtime.md#life-integration-2026-11-11)

## Historical delivery records

## Completed: World features inside the companion settings

Start in **设置 → 大肥鱼 → 概览 → 来自 World 的功能**. Preview the role, search
the bound Bank, or inspect the current companion emotion in its owning page.
The owner selected Dafeiyu's Mnemosyne Bank for archive search and source
reads. **工作区与维护** reports adoption status across all sixteen groups.
[Settings guide](../settings.md)

## World component foundation

The working tree now exposes all sixteen planned World component groups in the
package and native Core service. DSH chat uses stable profile and expression
sections. The optional channel factories remain available for subsequent integration;
Life now uses its factories through `40-Life` as described above. The foundation was packaged and tested with local fixtures.
The earlier flight repair is included. The desktop audit gaps remain open.
[Implementation and verification](../mvp-runtime.md#world-foundation-2026-11-11) · [Module checklist](../planning/mvp-1.0.md#world-074-adoption-checklist)

## Prior Desktop audit and outstanding gaps

The owner requested a fresh comparison after dsh-pet updated. Compared current
0.4.1-derived adapters against upstream 0.4.7 at `c7ea8b28e2a8b04a495a3b472a871dff6969ccca`.
The prior feature pass connected the main entry points but did not establish
complete configuration/action parity. Isolated Electron checks reproduced live
confinement, submenu cleanup and pointer-grace defects; additional upstream
tooltip/display/performance fixes and configuration/action gaps remain.
See the [audit evidence and scope distinctions](../mvp-runtime.md#updated-upstream-desktop-audit-2026-11-11).
This review changed no production source, vendor pin or installed package.
The audit used candidate `a3b1366d102b`. Desktop parity work is outstanding.

The owner clarified that upward motion stopped during flight. The host had
omitted upstream's macOS window-overflow options. Restored content-size bounds
and `enableLargerThanScreen`; actual Electron tests now cross the old upper
boundary and return to falling normally. DSH and Desktop were restarted with
the repair; personal role/configuration files are unchanged. See
[flight evidence](../mvp-runtime.md#upward-flight-boundary-repair-2026-11-11).

The owner subsequently requested the remaining upstream Desktop features and
confirmed the complete feature pass with Voice deferred. Click/menu/bubbles,
sound, sleep, native image/screenshot input, original todos/reminders, whisper
and balance adapters are now connected in the installed repair. Automatic whisper
and balance are off by default; their switches/intervals are in settings.
See [Desktop feature evidence](../mvp-runtime.md#remaining-desktop-feature-migration-2026-11-11)
and [interaction settings](../settings.md#desktop-interactions). Ordinary click
now gives feedback; chat opens through the menu, Cmd/Ctrl+click or hover + L.

The six owner-feedback repairs and the subsequent Desktop feature pass are
included in the current package. Upward-flight repair `a3b1366d102b` was verified separately. Previous
candidate `7732673adcf4`, its archive and personal-data backups remain intact.

- One package declares Core, Memory, Emotion, Desktop and the settings carrier
  as separate native entries. Memory enable/disable applies only to new
  conversations; existing conversations retain their recorded mode.
- Desktop runs the original pinned PetSprite shell, motion/input/playback and
  shared logic, with native-chat and Emotion adapters. The earlier simplified
  renderer is retained only as a local rollback artifact.
- Full native transcripts are copied into the bound Repo and restored through
  native persistence on another profile/device path, retaining the session ID.
  Stable Repo identity keeps the existing Bank, emotion, settings and compact
  conversation associated after a new native workspace ID is assigned.
- Memory batches by completed turns or idle time using native compaction and
  Mnemosyne episodic summaries. All originals are retained. Small recall,
  visible-context deduplication and `pet_memory_read` preserve full eligible
  detail without appending entire old conversations to every request.
- Emotion keeps a continuing textual state; the same native reply updates it
  and chooses actions/stickers. No extra per-reply model call or numeric
  psychology model was introduced.

The owner approved editable trial defaults and corrected the Memory-off policy:
**only new conversations change; old chats must remain unaffected**. Both the
migration and that corrected policy are implemented and tested. See
[repair evidence](../mvp-runtime.md#owner-feedback-repair-2026-11-11),
[settings](../settings.md), and the [cross-device setup](../portability.md).
That Life baseline archive was `.cache/life-integration/dsh-Chatpet-0.0.0.tgz`;
the machine-bound installation receipt is
`.cache/life-integration/install/installation.json`. Installed startup does not
establish natural reply quality or owner acceptance.

## Owner feedback 1: pluggable components

Confirmed by the owner on 2026-11-11: deliver one DSH plugin installation
package containing separate components. Components must be pluggable to support
maintenance and future feature expansion. Internal directory separation alone
does not satisfy this requirement. The local Bundle now declares separate native component entries. Unload/reload
was verified in an isolated native profile; installed-profile verification
remains part of the next owner trial. Memory keeps existing sessions alive
under their recorded mode while toggling admission for new conversations.

## Owner feedback 2: cross-device portability

Confirmed by the owner on 2026-11-11: keep the companion's role/persona,
portable configuration, memory and complete chat history in its bound storage
Repo so they can travel together to another device. After installing the plugin
on the new device, the owner must be able to continue using these records.
Workspace bindings and device/environment configuration do not have to migrate
automatically; rebinding the Repo and running setup on the new device are
acceptable. This does not require putting credentials in the Repo or committing
personal records to Git. Complete native log copies now live under `.chatpet/data/core/native-sessions/`.
An isolated two-profile, two-path migration retained the exact original event
prefix and session ID, and continued with the same role, settings, Bank and
emotion. Use the documented offline copy and `--resume-repo` setup; a Git clone
alone does not carry ignored personal data.

## Owner feedback 3: batched Memory consolidation and bounded context

Confirmed by the owner on 2026-11-11: use dsh-chatbot as the reference for
batch summarization after enough conversation turns accumulate or an idle period
elapses. Retain complete original chat records. Each chat request should load
only necessary summaries, relevant memories and the most recent turns, avoiding
duplicate context and wasted model tokens. The owner approved editable trial defaults of 10 completed turns, 10 idle
minutes and a 5-minute minimum interval. They are exposed in settings. Native
compaction retains originals, and successful summaries are idempotently joined
to Mnemosyne; a failed join retries the retained summary without another model
inference.

## Owner feedback 4: Memory token cost without quality loss

Confirmed by the owner on 2026-11-11: control Memory token cost, prioritizing
the repeated accumulation of old context. Reference dot's small recall blocks,
world's on-demand detailed reads and Mnemosyne's on-demand retrieval, together
with the batched summarization in feedback 3. Preserve complete original chat
records. Cost reduction must not sacrifice memory usefulness or conversational
continuity. Recall count and block size are also settings (initial trial values: 8 and
600 characters). Controlled native checks verify no duplicate visible dialogue
or summary, a smaller post-compaction request, full-tail on-demand reads and
correction/forgetting. These checks do not establish real model billing or
subjective conversational quality.

## Owner feedback 5: reference-driven Emotion improvement

Confirmed by the owner on 2026-11-11: improve Emotion using reference cases,
following the discussion of a continuing companion-owned emotional state that
informs actions and stickers rather than independently selecting all fields
anew for every reply. Inspect and exercise applicable reference paths before
choosing an implementation. Candidates discussed were chron303/desktop-pet for
state updates, SurfCore for state/drive continuity and sticker matching with
repeat penalties, and dsh-pet for action presentation. Mnemosyne emotion records
are a data-model reference, not an established companion emotion engine;
companion-emergence remains a broader, documentation-only candidate. The owner subsequently approved persistent textual emotion, updated by the
same native reply. No numeric emotion model or decay rule was selected. Preserve the distinction between the companion's
emotion, the user's emotion, work status and interaction status.

## Owner feedback 6: reset the Desktop implementation approach

Confirmed by the owner on 2026-11-11: Desktop has the most bugs in the owner's
hands-on trial, and the owner recommends resetting this module. Reassess from
the reference implementation instead of treating the current simplified custom
Desktop as an accepted baseline for incremental patching. Inspect and exercise
dsh-pet's existing shell, animation scheduling and interaction paths before
selecting the replacement approach. Preserve confirmed compact-chat/native
session and Emotion integration requirements, persona, configuration, memory,
complete chat records and a rollback copy of the existing implementation.
Reset refers to the Desktop implementation approach, not erasing personal data
or discarding unrelated changes. The original PetSprite shell and its shared/motion/input/playback modules
now run behind the native bridge. Actual Electron decoding, controlled drag
recovery, animation-driven wandering, terminal/Emotion order and chat passed.
Manual mouse/trackpad feel and broader owner bug cases still need trial.

## Runtime route

The normal entry is the bound workspace's DSH session or its compact desktop
window. Both use the native Agent. Memory uses the bundled Mnemosyne Bank and
the existing workspace-scoped provider adapter. The recent experience ledger
lives with the bound workspace. Preserve the single writer and the original
persona and Bank. The [MVP plan](../planning/mvp-1.0.md) owns current scope;
the older v0.14 and P1–P10 package sequence are historical.

## Checkout And Preservation

- Pet: `/Users/hy-yin/Developer/Codex Repo/Codex-Pet`, `main` at
  `ef0e1b75911e8d1f8696426162fac7dca0143ac4`. Staged scope is empty.
- The installed build was made from this working tree. It includes uncommitted
  Core and settings changes, plus untracked `src/desktop/`, `src/emotion/`,
  `src/memory/`, `src/core/companion-settings.ts`, `src/core/native-memory.ts`,
  `vendor/` and the MVP checks. Resume in this checkout to keep that code available.
- The sibling PM Advisor links above are preliminary planning history.
- Preserve owner SOUL/USER, root instructions/README, identity, bindings and
  module-owned data. Keep this repository's root README unchanged.

## Installation, Data And Historical Evidence

Current installation receipt: `.cache/life-integration/install/installation.json`.
The preceding World settings receipt remains in `.cache/world-integration/install/`.
The previous World foundation receipt remains in `.cache/world-foundation/install/`.
Candidate `a3b1366d102b` replaced `b1fedc12e4ba`; both previous installation
archives and receipts remain intact. The earlier receipt remains
at `.cache/mvp-1.0/install/installation.json`. The offline installer retained
the binding and backed up the old profile and data before replacement. The
[runtime evidence](../mvp-runtime.md) identifies the backup and checks performed.

Bound storage Repo: `/Users/hy-yin/Developer/Deepseek Repo/Deepseek-Test`.
Persona/profile/configuration remain in `.chatpet/`; Core and Memory data are
in `.chatpet/data/core/` and `.chatpet/data/memory/`. DSH credentials and native
session logs remain host-owned. Preserve rollback copies, timestamped profile
backups and `.cache/repo-storage/`; inspect current writers before any later
migration or package replacement. Do not run two writers on one Bank.

Detailed prior results and limitations belong to
[Core runtime](../core-runtime.md#memory-and-streaming-repair-from-existing-examples-2026-11-06),
[workspace/native contract](../workspace.md) and [settings](../settings.md).
Historical fixture/live passes do not prove the new four-module release or owner
acceptance. Previous owner reports include poor continuity and severe latency;
source repairs and isolated successful cases do not erase that feedback.
The earlier Mac-lock-screen handoff is a dated observation, not current app state.

Keep `.cache/p1p3/`, installation archives/receipts, backups, `.tools/`, `.venv/`,
`node_modules/` and reference checkouts. They are outside Git and are not included
in a source commit. Preserve [origins/licenses](../../references/manifest.json).

Ledger inspection on 2026-11-09: `.cache/p1p3/live-envelope.json` retains 50
usage-observed real test attempts, no request-count cap, and cumulative conservative
upper cost CNY 0.853670 under the CNY 6 ceiling. This is not wallet billing.
No allowance is reset or extended by the new plan/handoff. Recheck actual accounting
and applicable authorization before dependent paid operations.
