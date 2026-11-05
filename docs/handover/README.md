# Current Handover

- Updated: 2026-11-05, Asia/Saigon.
- Status: Development paused at the user's request. The user cleared the active
  goal. This turn authorizes commit and handoff only, not resumed implementation,
  personal-profile installation or publication.
- Code checkpoint: `f8990dd727dc3524ee23e3219f983f5adf7ce520` on `main`
  (`Implement workspace-scoped Chatpet Core and settings`). This handover is a
  separate documentation commit following that checkpoint.

## Accepted Direction

Core governs real execution; Memory owns long-term memory; the Repo stores
persona, user profile and configuration. Existing code cannot establish a
requirement by its own existence. A matter ledger, custom workbench and STATE.md
are not mandatory Core completion gates. Do not resume the old ten-responsibility
checklist as if every proposed feature had independent user acceptance.

The plugin/package is `dsh-Chatpet`; first component is `00-Core`, described as
`插件核心模块`. Workspace binding activates Core in ordinary native DSH sessions
in that workspace. No separate 大肥鱼 preset/mode or Core 测试 chat panel.
Other workspaces retain ordinary behavior. Keep the root README unchanged.

Read the latest scope in the [Core plan](../planning/core-console-implementation.md)
and [completion inventory](../core-completion.md). The broader
[product plan](../planning/plan.md) remains distinct from delivered/accepted Core.

## Source Checkpoint

- Repo initialization uses five files: `.chatpet/README.md`, `manifest.json`,
  `SOUL.md`, `USER.md`, `core.json`. Format-2 manifests replace validated format-1
  declarations. STATE.md is no longer generated, read or updated; existing files
  and owner edits are preserved, and missing legacy copies are not recreated.
- Persona, USER and configuration are file-authoritative. Settings and manual
  edits share revisions and validation. Invalid files block managed loading.
- Ordinary native sessions use the existing DSH Agent, model/tool permissions,
  stop control and logs. No second model turn is submitted by the adapter.
  Native history lineage, cancellation and read-only reconciliation are retained.
- Settings no longer query the optional workbench on initial read. Its unreleased
  tab and polling are removed; ordinary context no longer automatically recalls
  the matter ledger. Existing optional APIs/query code and data remain intact.
- Execution stop/receipt inspection survives invalid Repo files. Workspace rebind
  is refused while execution is running, cancelling or unresolved.

Detailed owners: [Repo/native contract](../workspace.md),
[settings](../settings.md), [runtime](../core-runtime.md),
[flow evidence](../core-conversation.md). Historical runtime descriptions may
cover earlier optional features; latest user scope takes precedence.

## Installed State And Outside-Git Assets

The personal desktop installation is a packaged snapshot, not the checkout.
Read-only verification during this handoff found:

- Profile: `~/.dsh/profiles/desktop/`.
- Current dependency: `.cache/install/dsh-Chatpet-local-dd8ada0b6fe8.tgz`.
- Installed Core workspace/native files and client differ from the current build;
  STATE retirement is absent there. The source cleanup is **not installed**.
- Core data: `~/.dsh/codex-pet/core/`; preserve identity, data and owner bindings.
  The prior bound Repo is `/Users/hy-yin/Developer/Deepseek Repo/Deepseek-Test`.
  Neither live process state nor that binding was rechecked in this commit turn.
- Retain `.cache/install/` (including `installation.json`, archives and prepared
  package), profile backups, `.tools/`, `.venv/`, `node_modules/` and reference
  checkouts. These ignored/local assets and personal data are not in the commits.
  Reference origins/licenses are in [manifest](../../references/manifest.json).

No application upgrade, account connection, installation or user-data deletion
was performed for this commit/handoff.

## Verification And Limits

Before the code commit, `pnpm run check:types` and `pnpm test` passed (32 tests).
The earlier current-cleanup native fixture passed with eight local model calls,
no paid-model request: ordinary chat without matter creation/automatic recall,
no generated STATE, native stop/reconcile/resume and workspace isolation.
The [desktop observation](../validation/core-workspace-desktop-2026-11-05.json)
records an earlier installed Standard-mode real-model flow; it does not verify
this uninstalled cleanup or accept all Core requirements.

The remaining execution/configuration/recovery scope is not fully audited.
Memory and other providers are not delivered by this checkpoint. Full guarded
restore/autonomous coordination are not accepted. A paused optional workbench
must not become the next task merely because its code exists.

## Restart

Wait for a new user request. On resumption, confirm the intended next outcome
against the accepted Core/Memory/Repo boundary and inspect current Git/install
state before choosing work. Do not automatically reinstall, replay execution,
resume the cleared goal, or treat this checkpoint as full Core acceptance.
