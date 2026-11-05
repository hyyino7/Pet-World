# Current Handover

- Updated: 2026-11-05, Asia/Ho_Chi_Minh.
- Status: Paused at the user's request after completing the current cleanup.
  The user cleared the active goal. Do not continue automatically or reinstall
  the desktop plugin; resume only when requested.
- Latest boundary: Core governs real execution; Memory owns long-term memory;
  Repo stores persona, user profile and configuration. The existing ledger or
  workbench does not establish a required feature.
- Current cleanup is source-only: STATE generation removed; new manifests use
  five files and format 2; legacy format 1 migrates without touching or recreating
  STATE.md. Settings no longer query the optional workbench; its unreleased tab
  and polling are removed. Ordinary native context no longer recalls that ledger.
  Unit/native validation is recorded in [completion](../core-completion.md).
  The installed desktop package below remains the earlier snapshot.
- Project direction retained from the preceding handover: complete reconstruction.
  Existing architecture, code and passing checks are material to reassess, not
  an accepted design or an obligation to preserve that implementation.

## Direction And Constraints

Keep the complete [product goals](../planning/plan.md#confirmed-outcome-and-boundaries)
and modular, DSH-native direction. Reuse existing reference implementations;
deliver usable conversation/matter/progress/result flows with proportionate checks.
Production semantics must not rely on keyword classifiers or fixed sample answers.
Plugin/package name is `dsh-Chatpet`; first component is `00-Core`, described
as `插件核心模块`. Companion identity remains 大肥鱼. Keep README unchanged.
Use the [naming convention](../planning/modular-design.md#naming-convention) for
repository, native module and internal identifier roles.
One Bundle with separate native entries is a previous recommendation to reassess.

The rejected **Core 测试** panel was removed. Do not restore it. The user has
also explicitly rejected a separate 大肥鱼 mode: workspace binding must activate
Core automatically in ordinary DSH sessions in that workspace. Do not add a
companion preset or a mode-selection step. Other workspaces remain unaffected.

## Current Installation

- `dsh-Chatpet@0.0.0` replaces `codex-pet` in desktop dependencies and selected
  bundles. Source: `.cache/install/dsh-Chatpet-local-b923611b0f85.tgz`.
- First component: patch ID/exported plugin name `00-Core`; module specifier
  `dsh-Chatpet/00-Core`; locale description `插件核心模块`.
- Settings client is registered through a state-free root carrier
  (`chatpet-settings`, package root `dsh-Chatpet`), separate from `00-Core`.
  Open **DSH Settings → dsh-Chatpet**. Five tabs are present. Identity, quiet mode, Core execution limits and
  workspace binding/initialization and USER profile can now be read/saved.
  Core automatically contributes role, USER context and matter tools to ordinary
  root sessions in the bound workspace. No companion preset is declared.
  This installed snapshot predates the scope cleanup; optional workbench work
  is not a Core completion gate.
- Installed settings client/adapter and changed Core files match the verified
  workspace/native delivery. Source cleanup now removes the unreleased workbench
  tab, polling and initial-settings dependency; optional query code is retained.
  No cleanup package was installed before pausing. Source also preserves stop/receipt inspection
  when Repo files are invalid, and refuses workspace rebind during running,
  cancelling or unknown execution. Core-owned preferences are additive; identity, model route
  and data directory are preserved. README, existing user patch, unrelated
  dependencies and bundle selection are unchanged.
- Latest backup: `~/.dsh/profiles/desktop/backups/codex-pet/2026-11-05T11-08-50-963Z/`.
- Backup: `~/.dsh/profiles/desktop/backups/codex-pet/2026-11-04T20-10-41-095Z/`.
- Reinstallation backup: `~/.dsh/profiles/desktop/backups/codex-pet/2026-11-04T20-11-54-746Z/`.
- Native settings reads, saves, validation and restart recovery were visually
  checked in an isolated DSH 0.2.2-rc.1 web profile. Direct desktop validation
  now confirms ordinary Standard-mode conversation in Deepseek-Test: one
  real-model turn, five steps and four successful Core matter calls. SQLite
  contains created/progress/result records and a completed matter; STATE.md
  projects it. [Evidence](../validation/core-workspace-desktop-2026-11-05.json).
  Full Core and user acceptance remain open.

## Previous Installation Snapshot

The preceding handover recorded these facts on 2026-11-05; documentation cleanup
did not recheck the running application. The subsequent description-only update
changed installed README/description/locales as recorded below:

- DSH 0.2.2-rc.1; `codex-pet@0.0.0` installed/enabled in the desktop profile.
  Dev SDK remains 0.2.1-rc.5; package declares both native versions.
- Installed package: `~/.dsh/profiles/desktop/node_modules/codex-pet`, from
  `.cache/install/codex-pet-local.tgz`; it is a packaged snapshot, not live source.
- Source/installed test client, test-host adapter and test Bundle entry were removed.
  No completed normal DSH conversation entry/preset was delivered. Ordinary chats
  were not modified. Final UI appearance was not visually confirmed.
- Data: `~/.dsh/codex-pet/core/` (SQLite, WAL/SHM, writer lock); writer liveness
  is unknown because the prior process probe was denied. Historical test bindings
  may remain. Preserve identity/data and handle the writer before replacement.
- Description-only update: installed README is now the two-line Chinese product
  introduction; package description and three locale files match source. Runtime
  files and Bundle patch hashes were unchanged. Backup:
  `~/.dsh/profiles/desktop/backups/codex-pet/description-20261104T200343834906Z/`.
  Existing tarballs still contain the preceding README until repacked.
- Backups: `~/.dsh/profiles/desktop/backups/codex-pet/`. Official installation
  changed package/lock/Bundle metadata, while the existing user patch was unchanged.
  Credentials were not edited; QQ/Bilibili accounts were not connected.

## Code, Evidence And Local Assets

[Core runtime](../core-runtime.md) owns code entries, supported behavior and limits.
[Flow/evidence](../core-conversation.md) owns reuse, hardcoding review and dated
behavior/native/real-model observations. These are previous author checks, not
user acceptance or a reason to repeat paid scenarios. Full provider joins,
normal-use integration, guarded restore and whole-product acceptance remain open.

Git baseline: `main`, `4ac51de265b8b4a8f8f1cafdee8ba165d99295c0`; Core work remains
uncommitted among pre-existing modified/untracked files. Refresh Git state on resume.
Keep `.tools/`, `.venv/`, `node_modules/`, reference sources and license records.
Installation continuity also uses `.cache/install/installation.json`, both package
tarballs and the prepared package; retained live evidence is linked from the flow
record. These assets and installed data are outside the commit.

## Restart

Documentation cleanup and naming edits do not begin reconstruction. For the next product task,
start from the reconstruction objective, relevant existing references and the
actual dedicated DSH interaction entry. Establish the replacement design and first
usable flow before replacing code or live data; do not resume the old sequence
merely because its tests passed. Use the [planning index](../planning/README.md)
for the affected design only.
