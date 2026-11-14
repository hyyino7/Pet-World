# Chatpet Repository And Native Session

DSH Standard discovers root `AGENTS.md`/`CLAUDE.md` instruction files; it does
not automatically scan `.chatpet/`. On successful initialization, Chatpet creates
root `AGENTS.md` only if absent, explaining the companion workspace, the profile
files and protected Memory tools. Existing root instructions are never replaced
or appended to, and the root README remains untouched. The root instruction file
is an entry for DSH's native instruction loader, separate from the five managed
profile/config files. Deleting/editing it does not change profile authority.

Core owns `.chatpet/` in the explicitly bound native workspace. Initialization
creates five profile/configuration files and preserves the project's root
README and instructions.

| File | Authority |
| --- | --- |
| README.md | Directory explanation; not a model instruction source |
| manifest.json | Schema, companion identity and managed-file declaration |
| SOUL.md | Editable role name and character; setting saves use this source |
| USER.md | Explicitly supplied owner profile; setting saves use this source |
| core.json | Validated quiet policy and conversation limits |

Manifest format 2 declares only these five files. Format 1's six-file
declaration remains readable and migrates during initialization after validation.
Core no longer generates, reads or updates STATE.md. Existing copies are left
untouched, including owner edits; a missing old copy is never recreated. No
user data is deleted by this change.

Initialization is idempotent. Existing content is validated before adoption;
foreign identities, incompatible schemas, missing files and symlinks are not
silently overwritten. Optimistic revisions reject stale settings. File edits
are validated at the next request boundary. Failure blocks managed loading.

The Repo is the storage home for companion information. The five profile/config
files remain file authorities; `.chatpet/data/core/` contains Core's database,
receipts and records, and `.chatpet/data/memory/` contains the single Memory Bank,
service state and logs. These extra data directories do not change the five-file
manifest or introduce a second writer. DSH owns its account credentials and native
session logs outside the Repo.

`scripts/install-dsh.mjs --storage-repo <bound-repo>` relocates existing module
data only with DSH and its writers stopped, verifies every copied file, and binds
the installed package to the new absolute paths. Existing data and timestamped
backups remain for rollback. A foreign identity, symlink, live owner or existing
destination is refused; no automatic merge, backfill or reset occurs. Workspace
selection alone does not move the companion's storage home. Moving that home
requires the explicit offline relocation again.

The installer adds `.chatpet/.gitignore` for `/data/`: information is physically
in the Repo without automatically publishing private databases/tokens in Git.
Stop DSH before copying the entire `.chatpet/` directory. This carries companion
data, but not host credentials, native session logs or the machine's Python setup;
it is not a promise of full cross-machine restore.

Binding itself activates Core in ordinary native DSH sessions in that workspace.
The user explicitly rejected a separate 大肥鱼 mode. The Bundle declares no
companion preset, and no mode-selection step is required. Core registers its
adapter with its own lifecycle, contributes scoped role/USER configuration
through SystemPrompt, and activates matter tools only for exact bound workspace
members. Existing DSH presets and native filesystem/search/shell tools retain
host ownership and enforcement. Core observes the existing Agent, never submits
a duplicate model turn, and excludes subagent sessions.

Tools exist before native step resolution and use per-agent activation. A
pre-step listener is too late to add tools to the first request's catalog.
Unbound and other-workspace sessions keep normal native behavior. Invalid
managed files block bound loading; they do not silently turn into ordinary
chat. History source lineage is retained and revalidated. Cancellation settles
from native evidence. Reconciliation opens observed UI logs read-only and never
resumes an Agent or clears its inbox. This requires native DSH 0.2.2-rc.1 tool
activation; the package engine gate no longer declares 0.2.1 host support.

## Verification

`pnpm run test:native-workspace` uses installed DSH 0.2.2-rc.1, the real Loader,
preset registry, storage, workspace registry, session persistence and Agent loop,
with a deterministic local model and disposable Repo. It covers ordinary Standard
sessions without an extra mode, file loading, native filesystem capability,
optional matter creation without STATE generation, role refresh, cancellation, read-only
reconciliation, native session resume, other-workspace isolation and ordinary
unattached sessions. A fresh bound ordinary session also verifies that the old
matter ledger is not automatically recalled or required. It makes no paid model call.

Direct desktop verification on 2026-11-05 confirmed initialization of the saved
Deepseek-Test target, loaded Repo status and real role
loading. Its first real-model request exposed the late tool-registration issue
above. The user then rejected that extra mode. Both the workspace-only fixture
and revised direct desktop path now pass. The Standard session made one native
turn with five steps: list, create, progress and finish all returned successful
tool results. Core SQLite and generated STATE.md independently confirm
completion. The native title service also made its normal title request.
See [desktop evidence](validation/core-workspace-desktop-2026-11-05.json).
These observations are historical evidence of the earlier installed snapshot,
not requirements to retain the ledger or STATE. The source cleanup described
above is present in the updated package; actual personal workspace use is still
separate from its synthetic installed-package tests. P1–P3 source/fixture work resumed on 2026-11-06; see the
[current execution record](core-runtime.md#p1p3-execution-2026-11-06).
