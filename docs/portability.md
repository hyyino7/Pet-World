# Companion Repo portability

The repair candidate keeps SOUL/USER, portable settings, Core data, Memory,
continuing emotion, Desktop todos/image uploads and full native conversation copies with the bound storage
Repo. DSH remains the conversation runtime. Restoring a log does not replay a
user message or run a model turn.

## Storage boundaries

| Location | Responsibility |
| --- | --- |
| Installed plugin | Executable code, built-in media and bundled World/Memory adapters; updates replace program files. |
| Bound Repo | This companion's identity, SOUL/USER/foundation/self, diaries/history, Bank, emotion, body/garden, album, current Life plan, wallet/inventory/economic ledger/reading content and bookmarks, portable preferences and complete original conversation copies. Channel policies, public group material, publication/outbox journals and isolated guest histories are also Repo-owned. |
| Device-local DSH profile | Account credentials, adapter URLs/discovery, connection enable switches, Python/runtime preparation, installation receipts, permissions and temporary caches. |

Normal runtime must not require the development checkout. The setup command and
its helpers ship in the plugin package; source builds are only for development.
The local Python environment is prepared beneath the DSH profile's
`chatpet-runtime/`, independently of the checkout. Program resource paths resolve
from the installed package. A recorded historical source path is provenance,
not an active runtime binding.

Channel policies and journals follow the currently bound Repo directory.
Selecting a copied Repo at another path uses that directory's records while
retaining the companion identity. Credentials and connection switches remain
device-local.

Managed setup rebinds verified bundled Memory entrypoints to the current Bundle.
If an inherited `memory.serviceEntry` cannot be identified as bundled code,
setup stops before probing Python and asks for an explicit choice. Use
`--memory-service-entry bundled` for the packaged provider, or pass an existing
absolute custom entrypoint to deliberately retain that device-local override.
Custom entries are program choices, not Bank data; another device needs its own
explicit binding. The standard `--resume-repo` path uses the packaged provider.

The economic source extension uses `.chatpet/data/economy/` for its complete
SQLite aggregate and storage marker. After one-time adoption, the retained
legacy garden JSON is provenance only. Copy/restore Economy, Body food receipts,
Life plan, Core and database sidecars together while stopped; partial wallet-only
recovery can conflict with already applied effects. Offline backup checks
`economy.lock` as well as Core/Memory writers. Missing initialized economic data
is an unavailable state, never permission to create a replacement blank wallet.
The current economic ownership implementation is `src/economy/`
in the source checkout; the installed recovery procedure is described below.

## Move to another device

1. On the source device confirm the workspace page reports storage completion.
   Core must actually run from `.chatpet/data/core/`; merely having documents
   or another database file in the Repo does not establish that fact.
2. Fully exit DSH, then copy the complete companion Repo, including hidden
   `.chatpet/` and database sidecars. A Git clone alone does not transfer ignored
   personal data. Do not merge the unrelated dsh-chatbot companion into it.
3. Install DSH and the downloaded plugin package on the new device. Configure
   that device's account/model. If the copied Repo contains a configured Memory
   Bank, also supply a compatible dependency-equipped Python environment. Use
   the package's setup command, with DSH closed (the example includes Memory):

   ```sh
   dafeiyu-setup \
     --archive "/absolute/path/to/downloaded/dsh-Chatpet.tgz" \
     --resume-repo "/absolute/path/to/copied-companion-repo" \
     --memory-python "/absolute/path/to/device/venv/bin/python" \
     --apply --offline --no-backup
   ```

   The command is `scripts/install-dsh.mjs` inside the installed package and can
   also run with DSH's bundled Electron in Node mode when a Node executable is
   not on PATH. No development checkout or repo-local toolchain is needed.
   Device runtime preparation copies a supplied compatible local environment
   offline; it does not download dependencies or replace global Python.
   If this companion has never configured long-term Memory, omit
   `--memory-python`. Its empty/recent-interaction container is not a Bank and
   resuming it requires no interpreter. An already declared/owned Bank that is
   missing or invalid remains an error; it is not treated as unconfigured.
   Resuming never creates a new replacement Bank to make the copy appear valid.
   Omit `--no-backup` to use the installer's default backup policy instead.
4. Setup reads the retained Core identity/scope and existing Bank, rewrites host
   paths and records installed actual paths. Reopen DSH, bind the copied Repo
   through the native workspace selector and initialize its documents. A new
   native workspace ID is allowed; portable storage identity remains unchanged.
   Restoring full logs uses DSH's native persistence and does not send a model
   message. Reconfigure device channel connections/permissions separately.

Initialization distinguishes ready documents from complete portable storage.
The settings page exposes actual Core/Memory locations and does not describe an
external bootstrap database as a completed installation. Setup may finish an
already recognized binding offline; a missing/deleted `.chatpet/` is never
silently recreated by application startup.

For a genuinely new binding, document initialization can finish against the
single external bootstrap Core. A subsequent stopped setup copies that same
database and atomically adds it to the Repo manifest; declaration failure can
be retried. An existing Core declaration is always required, and an initialized
identity manifest prevents missing-Core startup from manufacturing an empty
replacement, including an interrupted migration before declaration completes.

Native transcript exports capture their originating workspace and storage ID.
Switching to another Repo cannot redirect or silently discard that export.
Individual failures retain their pending item and allow other sessions to save;
three bounded automatic attempts log failures, after which an explicit flush
or restart/restore can recover from the original native logs. The final service
flush closes its timer. Abrupt process termination can still precede a copy;
complete native originals remain the recovery authority on that device.

QQ input receipts retain the original platform ID, routing identity and frozen
batch until native admission is confirmed. Recovery rechecks the current scope,
account, allowlist and speaker authority. It probes the original native session
instead of creating a new one to check. An ambiguous inbox/log result remains
pending and visible rather than rerunning the input. Confirmed admission drops
the temporary message body from the receipt; native logs own the conversation.
Uncertain outgoing replies are not automatically regenerated or resent.

These are implemented source/setup paths; a real second-device acceptance run
has not been performed for this delivery. Testing remains with the owner.

## Preservation and conflicts

Each complete log copy is under `.chatpet/data/core/native-sessions/`. Native
events, message IDs, tool records and compaction events are retained; summaries
do not replace these originals. Only the restored header's working directory is
rebound. DSH may append its own resume lifecycle markers.

An existing native session is checked before reuse. A conflicting header or log
is refused; neither side is overwritten. An exact existing prefix may be extended
through the native single-writer API. Unsupported native formats are refused by
the native validator. Keep the original Repo and installer backups until the new
device's continuation has been checked.

The native-service refactor applies the current Memory switch on the next turn,
including existing conversations. Turning it off removes the injected recall
block; it does not delete the Bank or complete transcript copies. A provider
outage permits ordinary chat without a recall block. This supersedes the earlier
per-conversation frozen-mode policy. Installed behavior remains identified by
the dated delivery record until the refactor is packaged and installed.

The controlled two-profile test is `pnpm run test:native-portability`. It checks
identity/settings/Bank/emotion continuity, full original event preservation,
same-session continuation, no inference during restore and conflict refusal.
This simulates two devices with independent local profiles; real hardware and
the owner's experience remain a separate acceptance step.

Desktop todos and image uploads travel in `.chatpet/data/desktop/`. Image uploads
are re-admitted through the new device's native attachment provider before use;
a changed native normalization/reference format is refused explicitly, retaining
the upload copy. Operating-system capture permission and provider credentials
remain device-owned. Sleep is temporary runtime state, not a portable persona.

## Offline file backup and same-machine recovery

`scripts/companion-backup.mjs` provides file-level backups of the stopped
companion. A backup is a private directory containing an inventory,
SHA-256 file hashes and byte-for-byte data copies. Keep it outside the storage
Repo and live DSH data. It may contain private conversations and local channel
credentials; do not commit or publish it.

Use a completed receipt (`status: installed`, `packageInstalled: true`), including
an installed but disabled plugin. A prepare-only setup stores its planned receipt
beside that attempt's prepared Bundle and prints `attemptReceipt`; it preserves
the current default `installation.json`. Before the actual package CLI changes
anything, setup retains the previous receipt verbatim in the attempt directory
and publishes an `applying` marker. Only verified completion atomically publishes
the new installed receipt. If apply fails after that boundary, reconcile the
actual installed binding before retrying backup/recovery; a prepared, applying
or incomplete receipt is refused. An old receipt is retained evidence, not proof
that an interrupted package change left its old binding current.

The command validates the completed receipt against the current Core identity,
ready workspace and storage ID, then reuses runtime Bank selection with its
configured-directory owner. A stale external Bank is not copied or restored as
this companion's data. Each offline gate rechecks that selection and refuses
live Memory owners in affected current/retained Bank directories. It includes
`.chatpet/` (persona,
USER, foundation, self-description, Bank, emotion, body/garden, album/diaries,
custom packs and portable native copies), the bound Repo's `AGENTS.md`, the
external Core directory when it is still the actual configured authority, and
this companion's scoped channel/voice files. Native JSONL logs
and projection-cache files are selected from the bound workspace and guest
workspaces under this companion's channel directory. The workspace registry
backup contains only those entries and their archived/pinned session IDs.

Global profile settings are retained as reference copies. DSH credentials,
account/model setup and executable packages are not restored. Shared attachment
objects are included for continuity, but recovery only adds missing objects;
it never deletes new objects or overwrites conflicting current bytes.

Recovery does **not** undo external deliveries, consumed quotas or actual model
spend. It retains these current journals rather than rolling them back:

- In the scoped channel directory, `qzone-<QQ account>/published.json` retains
  the whole current draft/publication/quota journal, including sent and uncertain
  statuses. Its embedded settings remain current with the journal.
- `wechat-<account key>/wechat-outbox.sqlite` and its present `-wal`, `-shm` and
  `-journal` sidecars are retained together as the current SQLite file group.
  Old snapshot sidecars absent from the current group are not put back.
- `group-material/<group hash>/social.json` retains current read acknowledgements
  and consumed group-wakeup limits, not old unread work.
- In Core `records`, only `channel-received`, `channel-reach`,
  `life-outlet-delivery`, `channel-usage` and `channel-usage-event` retain current
  values. Ordinary identity, matters and conversations still restore from backup.
- In `.chatpet/data/life/life.json`, only the current `spend` field is retained.
  Home-session IDs, alarms and other Life state still restore from backup.

These exceptions reuse the existing journals and are listed in the recovery
report's `preservedJournals`. They prevent an old pending draft or outbox from
being sent a second time and prevent a restored input from being accepted again
as a new platform message. If the backup contains a journal/base database or
processed-message record whose current counterpart is missing, recovery stops
with a concrete reconciliation requirement; it does not guess whether an
external operation happened or silently reactivate backup-only queues. A missing
current Life spend field also requires reconciliation when the backup has spend.

Fully quit DSH and any command-line session writers before creating or restoring
a backup. The command checks the desktop process, Core/Memory owner records and
open native session lock files. An OS without the required process/lock inspection
tools is refused rather than assumed offline.

From a source checkout with the repo-local Node 24 toolchain:

```sh
source ./scripts/env.sh
node scripts/companion-backup.mjs plan --installation /absolute/path/installation.json
node scripts/companion-backup.mjs create --installation /absolute/path/installation.json \
  --output /absolute/path/backups/fish-before-change
node scripts/companion-backup.mjs verify --installation /absolute/path/installation.json \
  --backup /absolute/path/backups/fish-before-change
node scripts/companion-backup.mjs restore --installation /absolute/path/installation.json \
  --backup /absolute/path/backups/fish-before-change \
  --before /absolute/path/backups/fish-current-safety-copy
```

The installed package exposes the same command as `dafeiyu-backup` (Node 24):

```sh
dafeiyu-backup create --installation /absolute/path/installation.json \
  --output /absolute/path/backups/fish-before-change
dafeiyu-backup restore --installation /absolute/path/installation.json \
  --backup /absolute/path/backups/fish-before-change \
  --before /absolute/path/backups/fish-current-safety-copy
```

Every output and `--before` directory must be new. Recovery first verifies the
backup, same companion/scope/path and installed-code fingerprint, then backs up
current data before staging replacements. Reinstall the matching plugin archive
before recovering data from a different code version. Replacing a package alone
does not roll back data written by another version.

Only the selected native workspace records and logs are rolled back; unrelated
workspaces, their newer conversations, archived/pinned state, global profile
settings and account setup remain current. If a native path or session ID now
belongs to an unrelated workspace, recovery refuses instead of merging it.
For changed data-path overrides, use `--bindings` with a JSON object containing
the actual `sessions`, `registry`, `projectionCache`, `attachments`, `channels`
or `voice` absolute paths. Default directory conventions match the currently
integrated native JSONL/JSON providers; a different provider needs its actual
supported bindings, not a guessed file location.

Same-machine recovery intentionally replaces the selected native log snapshot
as well as its Bank. It does not leave a newer log to be silently re-imported
into older data. Moving to a different device/path uses `--resume-repo` and
DSH's native import/conflict handling above. Isolated offline fixtures cover
restoration, unrelated-workspace preservation, corruption/version/active-writer
refusal, immutable attachment conflicts, concurrent source changes, sent/uncertain
Qzone non-replay, WeChat WAL-group preservation and current delivery/spend retention; they do
not establish owner recovery acceptance or real-device migration.
