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

Memory mode belongs to each conversation. Turning off the Memory component
affects new conversations only. Old Memory conversations continue with their
provider and eligibility checks; old plain conversations stay plain when Memory
is enabled later. Full transcript copies exist for both modes.

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
