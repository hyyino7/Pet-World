# Companion Repo portability

The repair candidate keeps SOUL/USER, portable settings, Core data, Memory,
continuing emotion, Desktop todos/image uploads and full native conversation copies with the bound storage
Repo. DSH remains the conversation runtime. Restoring a log does not replay a
user message or run a model turn.

## Move to another device

1. Use a supported DSH version and the repair candidate on the source device.
   The storage setup must bind Core to `.chatpet/data/core/` and Memory to
   `.chatpet/data/memory/`. The existing `--storage-repo` installer option can
   perform an offline relocation while retaining the original data for rollback.
2. Fully exit DSH before copying the Repo. Copy the whole directory, including
   hidden `.chatpet/data/` and its database sidecars. Personal data is ignored by
   Git; a normal clone or source archive does not transfer these files.
3. On the new device configure the DSH account/model and local Python runtime.
   Build/pack the plugin using the repository toolchain, then prepare installation:

   ```sh
   source ./scripts/env.sh
   pnpm run build
   pnpm pack --pack-destination .cache/feedback-repair
   node scripts/install-dsh.mjs \
     --archive .cache/feedback-repair/dsh-Chatpet-0.0.0.tgz \
     --resume-repo "/absolute/path/to/copied-repo" \
     --memory-python "/absolute/path/to/local/python" \
     --output-dir .cache/resume-install
   ```

   This prepares a machine-bound archive and receipt. Inspect them before using
   the same command with `--apply`, with DSH closed. Setup takes identity/scope
   from the retained Core database, not a newly generated companion. Credentials,
   model selection and Python paths remain device-owned.
4. Reopen DSH. In companion settings bind and initialize the copied Repo. A new
   DSH workspace ID is allowed: the stable storage identity remains unchanged.
   The plugin restores complete logs through native persistence and attaches them
   to the new workspace. The compact window picks up its saved native session.

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

`scripts/companion-backup.mjs` provides file-level backups outside the online
Core snapshot API. A backup is a private directory containing an inventory,
SHA-256 file hashes and byte-for-byte data copies. Keep it outside the storage
Repo and live DSH data. It may contain private conversations and local channel
credentials; do not commit or publish it.

The command reads the installed receipt's Core/Memory/profile paths and the
Core database's current workspace binding. It includes `.chatpet/` (persona,
USER, foundation, self-description, Bank, emotion, body/garden, album/diaries,
custom packs and portable native copies), the bound Repo's `AGENTS.md`, external Core/Memory directories when
configured, and this companion's scoped channel/voice files. Native JSONL logs
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
