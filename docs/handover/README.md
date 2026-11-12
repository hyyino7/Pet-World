# Current handover

Updated 2026-11-12, Asia/Ho_Chi_Minh.

## Current task: approved native-service refactor

The owner approved proceeding after review of Claude's refactor proposal:
“可以，按这个方向推进吧”. The amended [execution direction](../planning/native-service-refactor.md)
owns current scope and product semantics. Source implementation, basic checks,
packaging and the owner-approved personal installation are complete. Build
`c18f11e04c85` is installed and enabled; detailed owner testing remains pending.
No commit or publication is recorded.

Ordinary conversation execution returns to native DSH. Per-turn shared Memory,
independent Emotion and shared Behavior/presentation are implemented together
with their dependent adapters. Preserve background Life/TV limits, verified
channel/guest identity, native permissions, full transcripts and existing data.
The new Memory switch and future-Bank-only forget semantics explicitly supersede
the earlier new-session enrollment and whole-history invalidation policies.

## Preservation and installed baseline

- Checkout: `main`, HEAD `676bd65f61a0086249575d4077cd0587950b8b36`.
  Existing tracked/untracked work is preserved; nothing is staged.
- Pre-edit source archive, patch and per-file hashes:
  `.cache/native-service-refactor/baseline-20261112T041831Z/`.
- Supplementary external copy (temporary; retain originals):
  `/private/tmp/codex-pet-refactor-baseline-20261112T041831Z/`.
- Installed and enabled build: `c18f11e04c85`; installation, integrity and
  startup receipts: `.cache/native-service-refactor/install/`.
- Fresh offline pre-installation backup:
  `.cache/native-service-refactor/install/pre-install-backup/`.
  Profile package/lock/config rollback references: `install/profile-before/`
  under the same refactor cache. Restore requires matching the original code;
  do not restore personal data merely to test recovery.
- Previous rollback build: `99a9fb2a2fd9`.
  Archive/receipts/preservation remain in `.cache/feedback-redesign/install/`;
  its earlier native installer backup:
  `/Users/hy-yin/.dsh/profiles/desktop/backups/codex-pet/2026-11-12T00-59-37-944Z`.
- Bound personal Repo: `/Users/hy-yin/Developer/Deepseek Repo/Deepseek-Test`.
  Do not run fixtures, migration or recovery against its live records.
- [Pre-refactor handover](2026-11-12-installed-redesign.md) retains the exact
  installed trial navigation, historical evidence and prior decisions.

## Implementation and verification

The four source workstreams are implemented and basically verified:
Core/per-turn Memory; independent Emotion; shared display/playback; scoped
recovery and speech. Runtime evidence and remaining limits belong in the
[native-service record](../mvp-runtime.md#native-service-refactor-2026-11-12).
The approved candidate has replaced the personal installed package.

Use the repo-local toolchain. Run proportionate temporary integration fixtures,
then prepare a reviewable package. Record exact checks and their limits in the
[runtime record](../mvp-runtime.md); code/fixture success is not installed owner
acceptance. Preserve SOUL, USER, Bank, emotion, garden, photos and complete chats.

## Installed trial

Build `c18f11e04c85` (1,030 files) passed archive and binding readback. The exact
archive is `.cache/native-service-refactor/release/prepared/dsh-Chatpet-local-c18f11e04c85.tgz`;
receipt: `.cache/native-service-refactor/verification.json`.
Final checks: 82 unit/World, 16 provider, 20 backup/platform cases and native
chat/Memory, synthetic speech and Room-window integration. These counts overlap
focused checks; do not add all historical totals. No paid inference was used.

The owner selected “现在安装供我测试”. DSH was closed, the current companion and
selected native data were backed up, and the exact prepared archive was installed
offline through DSH's native plugin installer. All 1,030 installed files matched;
26 protected roots / 116 files and the 18 selected session registrations were
unchanged before reopening. The personal profile patch and bundle activation
were preserved.

After reopening, **Settings → 大肥鱼** loaded **小汐的世界**, ready on
**Deepseek-Test**, with all eight topic tabs. The desktop remains hidden as saved;
the overview offers **打开桌宠** and **打开房间**. All 18 retained native transcript
copies / 979 events remained intact. Startup changed the Core lock, garden/home
state and Pet log only at the recorded observation. No model message or live
account/device test was sent. Next: collect the owner's detailed trial feedback;
startup observation is not full acceptance.
