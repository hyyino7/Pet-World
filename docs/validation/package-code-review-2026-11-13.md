# Code and runtime-package review

Date: 2026-11-13, Asia/Ho_Chi_Minh. Owner-authorized review and removal of
obsolete or development-only distribution contents. No installation, real-model
request, native-window test or personal data operation was performed.

This historical candidate is superseded by the [eight-finding audit repair](package-audit-repairs-2026-11-13.md); its results below describe the earlier archive.

Result: **166 code tests passed, zero failed/skipped**; build and type checks
passed. The reviewed candidate is `f328cb559036`, not installed. It supersedes
uninstalled integration candidate `205e94730368`. Actual installed acceptance
continues to belong to the [owner trial](../handover/autonomous-life-owner-trial.md).

## Core retirement after owner clarification

The earlier packaging pass had left the legacy Core executor in place. The
owner explicitly authorized its removal: retain binding, persona, settings and
native Memory hooks; delete the old activity/receipt/eligibility/dependency
scheduler. The [owning amendment](../planning/native-service-refactor.md#core-retirement-amendment-2026-11-13)
records the decision. Current product chat entrances already use native DSH.

Removed nine modules: core.ts, execution.ts, history.ts, dsh-driver.ts,
maintenance.ts, resources.ts, workbench.ts, matters.ts and the old serial-delivery
queue. Their baseline source totals **112,619 bytes / 1,415 lines**. A new
100-line configuration runtime and 37-line pure native-log reader retain the
needed responsibilities. Full Core source changes from **32 files / 4,404 lines
to 25 files / 2,962 lines**; that includes portable transcripts, workspace,
records and real native/Memory hooks. It is not a claim of reaching 1,500 lines.
No file was moved merely to reduce this count.

Also removed: generic Core chat/drain/idle, old pairing/receiveMessage,
activities/executions, matters/workbench tools, contact attempts, generic
artifacts and online snapshots; four unused Console RPCs; 11 unimplemented draft
contract files; orphan eligibility caches and duplicate action/view ledgers;
old driver-only scripts/tests; and the installer's Core model-route fields and
default-model prerequisite. Native conversation routing belongs to DSH.

Retained protections are owner-issued configuration contexts, request dedupe,
CAS and file/workspace checks. Native role/tool authority, Memory Bank source
versions/withdrawal, Body/Economy actual transactions, full native transcripts
and offline recovery retain their actual owners. Old activity/execution/contact/
commitment/dependency rows and legacy quiescence/history meta remain inert bytes:
no restart mutation, replay or implicit deletion. Tests cover rebind and quiet
saves in their presence. Retired history-window/cold-recall settings are accepted
when reading old data, omitted from current UI/API and absent in new saves.

## Code findings and repairs

| Finding | Evidence and disposition |
| --- | --- |
| Unreachable legacy standalone connection chain | The managed connection path delegates to the existing presentation/chat and returns. All subsequent remote HTTP, body-following and 500 ms chat polling branches were unreachable. Removed those branches from `src/desktop/standalone.mjs`, retaining the public managed launcher and local offline display controls. |
| Offline display handshake rejected identity | The actual shell startup requests catalog/preferences/identity. Offline standalone did not handle identity, so startup could reject. Return an empty display name: an unbound display does not claim Xiaoxi's identity, records or world. |
| Reply-bubble preference could not save | `Desktop.savePreference` supplied resolved fallback settings as the expected saved revision. Core compares the raw portable configuration. Changed it to `companionConfiguration()`; unrelated unset choices stay null. Three actual Core-service tests cover save/repeat/reverse toggle/reopen and delegation to PetPlatform. |
| Unread readiness flag | `Desktop.isReady` had assignments but no readers. Removed the field and assignments; the actual child/ready promise remains authoritative. |
| Released helper loaded screenshot test code | Generated PetPlatform main required `main/smoke.js` and offered `DSH_PET_SMOKE` screenshot-and-exit behavior. The existing generator now removes that import and branch, allowing the test module to leave the package. Pinned upstream inputs remain in the repository. |

The source review covered the affected Core/Life/Body/native joins, Desktop
settings and standalone routing, generator output and distribution entry points.
No additional parallel assistant or Memory runtime was found in these paths.
This is a scoped review, not a claim that all possible product defects are absent.

## Distribution decisions

`package.json.files` retains the existing runtime roots and explicitly excludes
the following source-only material. Source/provenance remains in the repository;
these files are absent from the installable archive.

| Removed from archive | Files | Previous bytes | Why it is unnecessary at runtime |
| --- | ---: | ---: | --- |
| `dist/src/**/*.js.map` | 126 | 930,666 | Development maps whose original TS sources are not shipped; executable JS and public declarations remain |
| `vendor/dsh-pet/platform/upstream/` | 4 | 1,104,024 | Inputs to the repository generator; installed presentation uses generated runtime/client code |
| `vendor/dsh-pet/platform/runtime/electron-helper/main/smoke.js` | 1 | 13,443 | Screenshot test module; its runtime import and branch were removed first |
| `src/desktop/helper/upstream/index.html` | 1 | 14,011 | Original unused page; actual helper loads `body.html` and `chat.html` |
| `vendor/feiyu-room-template/public/room/garden-showcase.html` | 1 | 2,037 | Standalone modeling preview without a production entry |
| Mnemosyne `requirements-test.lock`, service `README.md`, service `pyproject.toml` | 3 | 29,136 | Test environment and upstream development/install metadata; the installer reuses device Python rather than installing this Python project |
| `docs/core-runtime.md`, `docs/core-conversation.md` | 2 | 80,954 | Historical development evidence, with no runtime/installer reader |
| Total | **138** | **2,174,271** | Additional source-code reductions are reflected in the totals below |

Retained deliberately:

- The helper's CommonJS `package.json` boundary, actual body/chat pages and
  shared voice code. Removing that boundary changes `.js` interpretation.
- Room's dynamic 3D implementations, both model quality files, loaders, default
  animation clips and selectable assets. Their current UI/import paths use them.
- Existing migration, backup and recovery code with real callers. File age or
  a compatibility name alone does not establish that a path is obsolete.
- The complete Memory Python runtime: bootstrap loads broad service capabilities,
  and `cognitive_memory/main.py` is also a service-root validity marker.
- Public declarations, runtime origins, licenses, notices, asset credits and
  the user-facing settings/portability guides. A recorded upstream source file
  may be intentionally source-only; its origin record is not a shipped-file list.

| Measurement | Previous candidate | Reviewed candidate |
| --- | ---: | ---: |
| Archive members | 1,093 | 920 |
| Uncompressed bytes | 164,517,597 | 162,163,913 |
| Compressed bytes | 126,608,842 | 126,013,158 |

The table above describes the first 138 source-only removals. Retiring old Core
and draft contracts additionally removes 36 compiled JS/declaration files; one
needed installer configuration helper was added. The final archive has 173 fewer
members overall. A clean-build step and source-to-output check prevent deleted
modules from surviving in dist.

Most remaining bytes are active media/model resources. This review does not
remove a supported presentation option merely to make the size reduction larger.

## Verification and evidence limits

Executed `source ./scripts/env.sh`, then:

- `pnpm run check:types` — passed.
- `pnpm run test:life-integration` — build passed; 111 retained autonomous-life
  cases plus 55 current composition/configuration cases, **166 passed**. Retired
  scheduler tests were removed; seven thin-Core tests cover the retained APIs,
  legacy data inertness and old settings compatibility. The final seven also
  passed again after extending legacy execution/dependency/meta assertions.
  Settings/foundation/recall tests and three installer-configuration VM/helper
  tests cover the narrowed Core. Six Desktop/standalone cases use
  actual Core public settings services or the actual standalone CLI in a VM with
  an in-memory child and model/network boundaries blocked. The offline test runs
  the actual shell handshake prefix; no Electron process is launched.
- `pnpm run check:package ARCHIVE` — passed against the extracted candidate.
  It rejects source-only/cache/test members, checks public executable entry
  targets, **538 local executable/HTML/resource references**, catalog assets,
  both Room model URLs, CommonJS boundaries and notices. It also exercises eight
  actual packaged Room asset routes, including injected voice/identity/shared
  scripts, with in-memory Request/Response objects.
- Package provenance: **261 shipped vendor digests** match; six recorded origin
  entries are explicitly source-only. All **250 packaged build files** match the
  verified repository build. Declaration existence is retained; this executable
  closure check does not replace a downstream TypeScript consumer build.
- Relocated Body/plan/Economy code keeps one accepted plan and applies body/wallet
  effects once, without importing the development implementation. The relocated thin Core
  exposes only current configuration services; old Core modules, contracts and
  host entry points are rejected by the archive check. Declared DSH SDK peers use
  the existing local SDK fixture, as the host supplies them in an installation.
  An actual
  packaged Python MemoryPort observes/replays a source in a disposable Bank;
  no runner/listener starts, and socket connections are forbidden.

Evidence lives under `.cache/package-code-review-20261113/`: source baseline,
Git patches/status, `final-build.log`, `final-types.log`, `final-code-tests.log`,
`final-core-regression.log`, `final-pack.log`, `final-package-check.json`,
`source-checks.json`, `candidate.json` and archive lists.
The runtime record and [handover](../handover/README.md) identify the current
candidate. Nothing in this review establishes real model quality, actual OS
window behavior, hardware power use or owner acceptance.

Source files intentionally remain available for development and attribution.
Regenerate the package with the repository toolchain; do not copy the entire
checkout into an installation. The archive check is a development command and is
itself excluded from the runtime package.

## Additional installed Core checks

All remain **not run**; use ordinary interactions, not database editing.

| ID | Owner action | Expected observation |
| --- | --- | --- |
| R01 | Edit persona/foundation/quiet in settings, then open another owner conversation and restart normally | Same companion and saved choices; current native turns use the intended persona; no old Core workbench or activity admission |
| R02 | Continue a multi-step ordinary DSH conversation, interact with the body, then discuss the completed action | DSH owns the conversation and its permissions; original current plan/body/inventory continue; Memory receives actual attributed facts |
| R03 | Install/bind the complete existing workspace through the normal update path | Same identity, records, Memory and current domain plan; old Core scheduling records neither run nor block rebinding |
| R04 | On a compatible fresh device without a selected model, if available, prepare/bind and open settings | Binding/persona/settings are usable; model selection remains a native DSH step; no Core-specific model route |

Use U01–U16 and I01–I10 in the owner trial for actual life, recall, component and
device-resource acceptance. No owner results were executed or inferred here.
