# Companion initialization and shared identity

Date: 2026-11-12. Implementation authorized by the owner: “做吧，测试和验收我自己来就好”.
Source changes follow this plan; tests and acceptance belong to the owner. This
record consolidates the latest initialization, identity and core-record requirements. Current installed behavior remains described in the
[handover](../handover/README.md).

The later [owner-confirmed life design](autonomous-life-game.md#owner-confirmed-design-update)
adds the starting-resource and Room/Desktop rules below. This amendment is
now authorized for source implementation and isolated verification. See the
[implementation record](../validation/life-design-implementation-2026-11-14.md);
this does not authorize installation or reset retained companion data.

## 1. Confirmed requirements and proposed details

The owner has confirmed these product requirements:

- Initialization prepares all necessary files. Their personal content may be
  blank and can be filled or updated later. Missing content must not block binding.
- A fresh companion has no invented name, personality, personal profile, daily
  schedule or experiences. Removing presets must not remove the file structure.
- Room, Pet, Life and every conversation surface represent the same companion.
  Their names and persona must not be independently configured.
- Desktop is Room's adjunct: with Room open it fully mirrors Room's actual
  activity, phase and progress; with Room closed it presents the same retained
  plan and actual progress. Neither surface starts another life or identity.
- A new companion receives no starting coins, seeds, gardening supplies or system
  gifts. Starting funds/items come from the owner. Free basic food and water
  remain available; existing saved possessions and balances are not reset.
- Self-description and diaries belong to Core. They are important parts of the
  companion's personality and continuity, available without autonomous Life.
- The owner subsequently authorized implementation and retained testing and acceptance.
  The owner later authorized installation and completion of storage separation; no reset or identity merge is implied.

The ownership split below follows those requirements. Exact new paths, empty
configuration schemas and migration mechanics are engineering proposals for
review, not independent product requirements. The implementation selects the new-workspace
layout below and keeps existing record locations as a single compatibility source.
Photo access is shared through Core; Behavior is uninstantiated until first use.
Legacy self/diary locations remain single compatible sources. The later storage-completion
operation relocates the active Core database without changing companion identity.

### Confirmed storage boundaries

The owner explicitly requires three locations: installed program code/resources;
a bound Repo holding all persistent companion data and portable settings; and
device-local credentials, permissions, runtime environments and temporary caches.
Normal use must not depend on the development checkout. Installing the package
and binding a complete copied Repo must resume the same companion, with only
device connections/environment configured again. The
[portability contract](../portability.md) owns the concrete setup sequence.

Document/binding readiness and storage completion are separate. The latter
requires the active Core database in the Repo, an accurately registered existing
Bank and device-owned interpreter. Merely preparing a folder is insufficient.

## 2. Meaning of initialization

Initialization establishes a complete, readable companion workspace, with valid
empty storage and one identity source. It is separate from the following actions:

| Action | Result |
| --- | --- |
| Bind | Select the native workspace and its Repo. |
| Initialize | Prepare declared documents, configuration, module storage and references. |
| Configure | Save the owner's actual role, preferences or feature choices. |
| Enable | Start a configured feature or presentation when requested. |
| Resume | Reuse an existing companion's identity, records and settings. |
| Reset | Explicitly erase selected existing data; initialization never implies this. |

New initialization must not call a model, create a home/chat session, turn on
autonomous activity, display a default pet, connect an external account or send
a message. Existing account/model connections remain DSH-owned and unchanged.
It must not grant starter resources, settle unaccepted harvests or invent prior
experiences. Structural initialization is distinct from an actual owner gift or
fund transfer, as defined in the [economy plan](economy.md).

Repeated initialization validates and fills missing structure without replacing
existing text, saved choices, records or stable companion identifiers. Recognized
existing companion data is resumed; a different or ambiguous identity is reported
instead of adopted or overwritten silently. Binding itself imposes no role-entry gate.

## 3. Module ownership

| Owner | Durable responsibility | Other modules' relationship |
| --- | --- | --- |
| Core | Workspace identity and binding; SOUL, USER, COMPANION, self-description, self history and diaries; portable configuration and complete native transcript copies | Supplies shared identity and record interfaces. Its services do not depend on Life. |
| Memory | Mnemosyne Bank, attributed observations, recall, summaries and archive eligibility | Uses Core's scope and original sources; does not own or replace self-description or diaries. |
| Emotion | One continuing emotional state and its references | Room and Pet display the same state; neither maintains a second mood. |
| Behavior | One actual body, movement, activity, needs and garden state | Room and Pet consume this body. Life requests autonomous behavior; owner actions remain usable with Life off. |
| Desktop / Pet | Appearance, size, window placement, animations, playback receipts, Desktop todos and uploads | Room's adjunct presentation: fully mirrors actual Room activity while it is open; presents the retained plan when it is closed. Does not own another name, persona, body or assistant runtime. |
| Room | Room rendering, controls, media and TV input | Uses shared identity, Behavior and native conversations; remains usable with Desktop off and does not own self-description or diaries. |
| Life | Persistent current-life intent in the existing life.json, autonomous scheduling, wake/review jobs, replaceable home-session references, activity and actual usage journals | Reads and updates Core records through the common path. Disabling Life stops scheduling, not personality or record access. |
| Channels / Voice | Transport, speaker attribution, delivery and device integration | Uses shared identity within existing admission rules. Credentials and device setup remain device-owned. |
| DSH | Accounts, models, native execution, permissions and original session persistence | Different conversations remain native conversations; no replacement runtime is introduced. |

The proposed shared companion archive also places photo access with the core
record capability, so ordinary chat can use it with Life absent. This photo
ownership extension is a recommendation; the explicit owner correction names
self-description and diaries. It can be separated without weakening those requirements.

Ownership means one canonical resource and consistent writes. Existing native
read/write/edit tools may continue to operate on these documents; they must not
create a parallel store or bypass the same binding and consistency checks.
Moving all file editing into a new custom tool system is not required.

Core readiness requires the actual database file and its owning process lease,
not merely an open SQLite handle or a previous installation receipt. If the file
is moved during runtime, explicit initialization can persist the current live
connection without changing companion identity. It must not import an old
bootstrap. A database declared by an initialized manifest cannot be silently
replaced with blank state after restart.

## 4. Initialization file list

Paths below are relative to the bound Repo. The candidate layout makes editable
personality records easy to find and separates them from technical runtime data.
These target paths are proposed; Section 8 covers existing locations.

### 4.1 Documents and configuration created during initialization

| Target | Owner | Initial state |
| --- | --- | --- |
| `AGENTS.md` | Core integration with DSH | Minimal workspace/file navigation. Preserve existing instructions; any integration into an existing file must preserve its content and be reviewable. No template persona or invented preferences. |
| `.chatpet/README.md` | Core | File map, responsibilities and editing guidance. |
| `.chatpet/manifest.json` | Core | Format version, stable identity and the declared initialization inventory. No personal claims. |
| `.chatpet/SOUL.md` | Core; owner-authored | Empty role name/body, optionally structural headings. |
| `.chatpet/USER.md` | Core; owner-authored | Empty profile, optionally structural headings. |
| `.chatpet/COMPANION.md` | Core; owner-editable | Empty foundation, optionally structural headings. Empty means no foundation text, not a request for a bundled substitute. |
| `.chatpet/self.md` | Core; companion-authored and owner-editable | Empty self-description, optionally section headings; no invented traits or relationships. |
| `.chatpet/core.json` | Core | Valid versioned configuration with owner-selectable values explicitly unconfigured. |
| `.chatpet/data/emotion/state.json` | Emotion | Valid document with no current feeling, e.g. the module-supported equivalent of `current: null`; technical identity/version fields remain valid. |
| `.chatpet/data/pet-platform/main-config.jsonc` | Pet | Explicit `{"pets":[]}`. No automatically named or positioned body. |
| `.chatpet/data/life/control.json` | Life | Valid unconfigured schedule and not-enabled state. Empty fields must be saveable; reading them must not restore wake/review presets. |

Do not introduce an empty configuration file for a setting already owned by
`core.json`. Desktop/Memory/Emotion preferences need one owning location, even
when several pages expose them. Additional module files are included only when
the existing module actually requires them, with their format declared by that module.

### 4.2 Directories and valid empty stores

| Target | Initial preparation |
| --- | --- |
| `.chatpet/self.history/` | Empty history directory; no fabricated first revision. |
| `.chatpet/diary/` | Empty diary directory; no dated entry without an experience. |
| `.chatpet/data/core/core.sqlite` | Core-created valid database with technical identity/binding metadata, but no invented conversations or personal records. |
| `.chatpet/data/core/native-sessions/` | Empty container for future full native transcript copies. |
| `.chatpet/data/memory/` | Provider-owned empty layout. Use the existing Mnemosyne schema, including `data/memory.db` beneath this root; no seeded facts, observations or summaries. |
| `.chatpet/data/memory/recent-interactions.sqlite` | Valid empty recent-experience ledger, using the existing module schema. |
| `.chatpet/data/core/photos/` | Proposed shared archive container and valid empty `album.sqlite`; photo ownership follows the recommendation in Section 3. |
| `.chatpet/data/behavior/` | Proposed location for shared `home.json` / `garden.json`; only module-valid structural state, without an active route, task, seeded history or template personality. |
| `.chatpet/data/desktop/images/` | Empty upload container. Existing todo storage stays Desktop-owned and uses its valid empty format when initialized. |
| `.chatpet/data/life/activity/`, `.chatpet/data/life/life/` | Empty containers for later activity and wake journals. |

Databases are initialized by their owning modules, never by zero-byte placeholder
files or by initializing a second runtime. Reuse the existing constructors/schema
initializers without starting the normal service loop or paid work. For providers
whose initialization has side effects, the exact minimal initialization entry
point must be verified before implementation; do not claim complete readiness
while a required store is still invalid or unprepared.

Behavior's valid initial physical state needs a separate implementation check:
template room geometry and normalization rules are technical requirements, but
template character traits, active jobs and fabricated prior events are not.
If no valid empty body is supported, keep it explicitly uninstantiated until use
rather than inventing measurements or removing validation. This choice must be
settled in the module contract before its initialization entry is implemented.

### 4.3 Files generated only by real use

The initialized inventory declares their locations, not fictional instances:

- Dated diary entries, self-history snapshots and actual photo objects/index rows.
- Native session copies, home-session identifiers and conversation projections.
- Actual activity/wake records, alarms, spending and delivery journals.
- Desktop todo entries, uploaded images and playback/migration receipts.
- Process locks, ports, tokens, caches and SQLite sidecars.

Room does not receive a second `home.json`, nor does Memory receive a parallel
`MEMORY.md`. Old `STATE.md` is not recreated as a source of personality or memory.
Device credentials, local executable paths and host caches are outside the
portable initialization inventory; no fake connected-account configuration is generated.

## 5. Empty content and settings

| State | Meaning and behavior |
| --- | --- |
| Present and empty | Intentional empty content; load it as empty. |
| Explicitly unconfigured | Valid setting state, distinct from zero or false; show it as unconfigured. |
| Missing | Initialization may create the declared empty structure; do not infer prior personal content. |
| Invalid or unreadable | Preserve and report the original; do not replace it with defaults or label it successfully initialized. |
| Configured | Use the owner's saved value, including an intentional zero or false where the field permits it. |

Technical identifiers, schema versions and necessary native runtime mechanics
remain. Product choices such as name, character, wake time, appearance, sticker
probability or summary cadence must not appear as owner selections merely because
the code contains fallback constants. Settings UI placeholders are explanatory
text, not saved/effective values. Core initialization cannot require filling all
feature settings; each operation handles only the inputs it actually needs.

The concrete optional/null schema is still to be designed against existing
consumers. This plan does not claim that the current strict settings parsers
already accept unconfigured values.

## 6. One identity across all surfaces

`SOUL.md` is the canonical persisted owner-defined name/persona; Core validates
it and exposes one revisioned identity projection. Database copies are derived
state, not an independently editable second authority. Changes from settings or
file editing use the same reconciliation path.

All current surfaces read that projection: native chat, compact chat, Pet hover
and tray labels, Room title/chat/bubbles/garden signs, Life home/review, notifications
and authorized channel replies. Remove independent role-name/persona controls;
appearance editors may retain asset names that clearly describe media only.

- A role change affects subsequent turns and live display labels. It does not
  cancel the current reply or rewrite historical messages and diary quotations.
- An unnamed companion stays unnamed. Generic UI wording may explain the empty
  state, but must not become a model instruction or saved identity. Never fall
  back to a template name, asset name or Pet ID.
- “大肥鱼” may label the product/settings entry; it does not silently become the
  companion's given name. An owner may explicitly choose that name.
- Stable actor/source identifiers stay separate from editable names. Do not
  globally replace strings currently used for action routing or attribution.
- Names embedded in owner-authored SOUL, foundation or self text are not rewritten
  by blind replacement. A contradiction is surfaced for review; free text is not
  silently promoted over the canonical identity field.
- Shared identity does not merge native conversations or expand access. Preserve
  existing verified speaker, guest, group and tool boundaries. This proposal adds
  no new channel secrecy/filtering policy and does not broaden existing sharing.

## 7. Core personality records and context loading

| Record | Meaning | Update behavior |
| --- | --- | --- |
| SOUL | The owner's definition of the companion | Owner changes; no automatic import from a skin or guest statement. |
| COMPANION | Editable general interaction guidance | May be empty. Operational tool contracts/permissions still come from DSH and modules. |
| USER | Owner-provided user information | Available only through the existing appropriate audience rules. |
| Self-description | The companion's evolving self-understanding | Readable/updateable in ordinary chat and Life; distinguishes self-understanding from owner-authored role. |
| Diaries | Real experiences and feelings in the companion's voice | Readable/updateable without Life or Memory; source material for continuity, not a substitute transcript. |

Life can schedule a review and request these updates; it does not own their
availability. Memory-off or a provider outage cannot disable Core record access.
Memory may index eligible records, but its projections are not the original
documents and withdrawing Bank entries is not implicit diary deletion.

Creating a file is different from injecting context. Appropriate nonempty role,
foundation and self sections contribute to native context. Diaries and photos
are read when relevant; configurations and whole databases are not pasted into
each turn. Empty documents produce no invented identity text. Existing native
tool/source permissions remain in force.

## 8. Compatibility and implementation route

Current evidence shows these gaps:

| Current responsibility/path | Proposed treatment |
| --- | --- |
| Core creates five fixed files and an optional root instruction file | Expand initialization to the declared document/module inventory; verify each required result. |
| Missing COMPANION falls back to bundled guidance; companion settings merge defaults | Represent deliberate empty/unconfigured states explicitly. Preserve legacy configured content instead of silently clearing it. |
| `data/life/self.md`, `self.history/`, `diary/` | Core takes ownership and removes Life capability dependencies. Candidate targets are `.chatpet/self.md`, `self.history/`, `diary/`. |
| Life owns diary/photo browsing; foundation's records capability depends on Life | Move required self/diary capability wiring into Core. Shared photo migration remains the proposal identified above. |
| Behavior stores home/garden under `data/life/` | Preserve one Behavior writer; proposed move to `data/behavior/` is independent of Core record availability. |
| Room contains “小蓝鱼”; several windows/titles contain fixed “大肥鱼”; Pet retains a name editor | Connect presentation labels to Core identity and distinguish stable source markers from labels. |
| Current trial uses an external bootstrap Core directory | A completed portable binding must point to the bound Repo's Core store. Relocation is future implementation work, not done by this plan. |

Proposed work order, after implementation is authorized:

1. Finalize the inventory and empty-state contracts, including technical versus
   owner-selectable values; inspect/reuse existing module initializers.
2. Give Core the independent self/diary interfaces and connect ordinary chat,
   settings and Life to the same records. Reuse existing native readers/editors,
   diary/self renderers and album store where applicable.
3. Prepare a coherent initialization path that can complete the required
   structures without starting optional runtimes. A partial failure is reported
   as incomplete and can be retried without replacing existing content.
4. Wire every identity label/context consumer to Core. Remove conflicting edit
   controls and template fallbacks; preserve native sessions and stable identifiers.
5. Migrate existing paths and external Core storage only with writers stopped,
   validating content and switching all references together. Old/new locations
   must not become dual writers. Ambiguous conflicts are reported, not merged
   or deleted automatically. Do not run a destructive fresh reset on an existing Repo.
6. Perform focused critical-path checks and then, only when requested, install
   the reviewed build. No commit, publication or personal installation is implied.

This plan does not authorize creating backups. Recovery/retention handling for
a future live migration must honor the owner's explicit no-new-backup instruction;
do not quietly use an installer that makes one or delete historical archives.
Inspect the existing path before introducing any new business/control logic and
discuss a concrete reuse gap as required by repository guidance.

## 9. Acceptance criteria

These describe future verification, not tests performed for this planning task.

1. **Fresh workspace:** binding works with a blank name, persona, profile and
   schedule. Every required file/directory/store is present, valid and listed;
   no invented records, default pet or background model turn appears.
2. **Repeat:** initialization preserves filled documents, stable identity and
   saved choices; missing declared structure is repaired without unrelated writes.
3. **Empty/error distinction:** blank foundation/identity remains blank; invalid
   documents are retained and reported; no hidden persona/settings fallback occurs.
4. **One companion:** after an owner name/persona edit, all current surfaces and
   subsequent native turns use it. Skins/body IDs do not change identity; historical
   dialogue stays intact. Test both settings edits and supported file edits.
5. **Core continuity:** with Life disabled and then unloaded, ordinary native chat
   can read/update self and diaries. Repeat with Memory disabled/unavailable;
   autonomous activity stays stopped and original transcripts remain complete.
6. **Single writers:** simultaneous settings/file/Life edits cannot silently
   overwrite newer records or create separate self, diary, mood or body stores.
7. **Portable resume:** existing identity, records and configuration are retained
   on rebind; active paths stay within the selected Repo. DSH credentials and other
   workspaces/plugins are unaffected.

## 10. Selected implementation and remaining delivery

New workspaces use the proposed Core record paths; recognized legacy records
remain canonical in place. Core also owns shared photo access. Owner settings
serialize null as unconfigured, independently of native mechanical fallbacks.
Memory uses a schema-only offline initializer and RecentLedger creates only its
table. Behavior stays uninstantiated until explicitly used, retaining native
normalization on first use and a single legacy or new data directory.

Source compilation and packaging are delivery checks, not functional tests or
acceptance. The owner retained those tasks. Current personal installation,
external bootstrap relocation and any existing-record migration are separate
delivery actions and are not performed by compiling or packaging the code.

### World first arrival and empty Body/Garden

The owner subsequently authorized following World's arrival flow and removing
the Body/Garden template presets, retaining testing and acceptance personally.

World's native home session and the visual body's `home.json` are distinct.
The existing Life state owns `homeSessionId` and the pending `greeting`; the
visual file owns position and simulation state, not another persona or session.
Core foreground home creation and World Life creation now use the same extracted
World transition: record the new home and `greeting: arrival`. Existing homes
are reused without replaying arrival. Pending arrival survives foreground-first
creation and is delivered by the existing World scheduler when Life is enabled,
using its original acknowledgement/retry flow. Initialization and settings do
not send the greeting or start a model turn; self-description emptiness is never
used as a first-arrival flag.

New physical bodies reuse upstream geometry with an idle, unconsumed technical
baseline: no sleep, active route, activity history or time-of-day story. New
gardens have empty untilled plots, zero coins/seeds/produce/compost, no planting
timestamps or opening log, and automatic care off. An inactive empty garden does
not manufacture care status or a future plan on a read. The confirmed economic
boundary requires actual owner-provided starting funds/items before optional
purchases or planting; no system starter gifts or automatic earnings are added.
Free basic food and water remain available without money or mandatory work.

Existing saved body/garden data is not erased or reinterpreted as a new arrival.
Source changes apply to new state creation. No live records are reset by this
delivery, and no functional tests or model calls are run on the owner's behalf.

## Source references

- [Workspace initialization and foundation fallback](../../src/core/workspace.ts).
- [Settings default merging](../../src/core/companion-settings.ts).
- [Core foundation/self wiring](../../src/core/companion-foundation.ts) and
  [scoped writing access](../../src/core/companion-writing.ts).
- [Life configuration and runtime](../../src/life/plugin.ts),
  [diary/photo library](../../src/life/library.ts) and
  [review updates](../../src/life/review-writing.ts).
- [Shared Behavior ownership](../../src/behavior/plugin.ts) and
  [Emotion empty-state implementation](../../src/emotion/state.ts).
- [Pet configuration](../../src/desktop/platform/plugin.ts),
  [upstream adaptation](../../scripts/build-pet-platform.mjs),
  [Room window](../../src/room/window-main.cjs) and
  [Room page](../../vendor/feiyu-room-template/public/room/index.html).
- [Native-service semantics](native-service-refactor.md) and
  [existing portability contract](../portability.md).
