# Chatpet Settings

- Updated: 2026-11-05, Asia/Ho_Chi_Minh.
- Scope: Core identity, quiet policy, execution preferences, repository
  initialization and USER profile editing. Workspace-scoped native integration
  passes the installed-runtime fixture; no separate companion mode is required.
  Desktop Standard-session role, matter and STATE projection verification also
  passes. Full maintenance remains unavailable.
- Current installation and task: [handover](handover/README.md).

## Entry And Ownership

Open **DSH Settings → dsh-Chatpet**. The client uses native settings section/icon
slots, theme, React and Connection transport. It owns only form drafts. Core
owns every durable mutation; closing settings does not undo acknowledged writes.

| Entry | Responsibility |
| --- | --- |
| `src/console/client.js` | Loaded `./client` browser factory, real reads, per-section drafts/save/status, conflicts and refresh |
| `src/console/plugin.ts` | Package-root carrier and finite exact native owner-only API routes |
| `src/console/settings.ts` | Finite settings operation map, strict input shapes, workspace lookup and safe Chinese failures |
| `src/core/preferences.ts` | Owner-authorized, revisioned, idempotent preferences and quiet-policy writes in the existing Core store |

DSH discovers browser clients from mounted package roots. The Bundle mounts the
`chatpet-settings` carrier at `dsh-Chatpet` and Core at `dsh-Chatpet/00-Core`.
The carrier requires native Connection and starts no Core, model client or
separate server. Core and Workspace services are looked up when a request runs;
missing Core yields a readable unavailable error rather than sample values.

The bridge uses native Connection's exact Fetch routes at
`/api/chatpetSettings/{snapshot,identity,quiet,preferences}`. Connection applies
transport authentication and permits only owner Peers to these routes. The
adapter validates the existing browser RPC envelope and uses native client RPC
correlation. It does not replace Gateway's shared `/api` interceptor or expose
arbitrary service names, actors, operator contexts, credentials or pairing grants.
An installed-runtime check found generic RPC registration's WebServer injection
path unusable; exact routes were verified in DSH 0.2.2-rc.1, including HTTP 401
for unauthenticated access and unaffected ordinary settings API behavior.

## Supported Settings

| Area | Current behavior and effective scope |
| --- | --- |
| Role name and character | Read/write existing Core identity with its expected revision; saved values are used by subsequent Core runs and survive restart |
| Quiet mode | Revisioned policy update; suppresses proactive contact while owner replies remain admitted. Does not start autonomy |
| Execution limits | Save history count, context characters, steps, tools and duration; validated existing bounds; subsequent Core-managed runs read the saved preferences |
| Workspace target | Native Workspace Registry list, live directory check, save/clear selected ID and canonical host metadata; persisted across restart |
| Modules | Read actual Core-reported capability states; module-owned settings are not fabricated |
| Maintenance | Honest unavailable/partial-coverage explanation; no inactive export/restore form masquerading as a usable operation |

Each card saves independently and keeps edits on other tabs. Save is enabled
only when its section is dirty; controls are locked during a mutation. Validation
and stale revisions retain the draft and report failure. A transport failure says
the outcome is unconfirmed and requests a refresh. Refresh warns before dropping
unsaved drafts. No configuration is stored in the browser.

Core identity/policy retain their existing revision streams. Preferences use an
additive `preferences/current` record in Core's existing SQLite schema. Missing
preferences inherit the host's validated conversation defaults; saved preferences
override that seed after restart. Owner checks, quiescence and request replay
controls are the existing Core controls, not a parallel authorization system.
No identity, data directory or provider/model route migration is introduced.

## Scope Cleanup In Source

The unreleased **事项与进展** tab and its polling were removed from the settings
client. Initial settings reads no longer query the optional workbench service.
Existing query code and records remain preserved; they do not establish a
required feature. Normal native conversation loads persona and USER configuration,
not an automatic summary of the optional matter ledger. Core no longer generates
STATE.md; compatible legacy manifests migrate without deleting existing files.
These cleanup changes are verified in source and have not been installed into
the personal desktop profile. Work is paused at the user's request.

## Explicitly Unfinished

Binding now saves the native workspace target and initializes `.chatpet/`.
The page distinguishes saved target, loaded files and native integration readiness.
Chat directly in that workspace: Core adds its role, USER context and matter
tools automatically, including when reopening an existing session. Native presets,
logs and permissions remain DSH-owned. Other workspaces are unaffected. See the
[workspace contract](workspace.md) for file authority and loading. Autonomy, complete
Memory/QQ/Desktop/Bilibili/Voice joins and full backup/restore are not enabled.
The unsupported salutation and inactive feature controls were removed from the
usable forms rather than given local-only or fake save behavior.

## References And Reuse

- [dot client](../references/sources/wz20/dsh-dafeiyu-dot/client.js), commit
  `ff288f57a25becfe195201b02e4fc4726ae71a5b`: browser factory and feature-owned
  settings structure, without its custom chat, accounts or Memory implementation.
- [Native settings slots](../references/sources/deepseek-ai/deepseek-harness/packages/client/ui-settings/src/client/contract/slots.ts),
  [Connection](../references/sources/deepseek-ai/deepseek-harness/packages/client/connection/src/rpc.ts)
  and [Workspace](../references/sources/deepseek-ai/deepseek-harness/packages/workspace/workspace/src/types.ts):
  host-owned slots, authenticated routes, transport and workspace identities.
- [Manifest](../references/manifest.json) and [notices](../THIRD_PARTY_NOTICES.md)
  retain upstream commits and license records.

## Evidence And Limits

- TypeScript/build, browser source syntax, archive contents, local links and diff
  checks cover structure and shipping.
- 29 Core tests passed, including saved-preference restart, next-run application,
  stale/invalid writes, owner-only access, replay and unknown-workspace refusal.
- Installed native DSH scripted execution passed (10 turns/17 local-model calls).
  These are fixture checks, not paid-model or user acceptance.
- Browser verification used installed DSH 0.2.2-rc.1 with an isolated temporary
  profile/Core store. The native page read actual settings, saved identity and
  quiet mode, listed/saved a real registered workspace, rejected 999 steps and
  saved/read back 3 steps. After a process restart, the browser read the saved
  role and quiet policy again. No provider login or external-model request ran.
- The personal-profile package was updated through the official offline CLI
  after the user confirmed DSH was closed. Installed settings/Core bytes match
  verified source. README, user patch, unrelated dependencies and selected
  bundles are unchanged. Installation and backup are recorded in the handover;
  the desktop window still needs user confirmation after update.
