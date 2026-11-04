# Repository And Environment Setup

Date: 2026-11-04, Asia/Saigon. This record describes actual preparation, not
product implementation or acceptance of the proposed architecture.

## Location And Codex Project

- Repository: `/Users/hy-yin/Developer/Codex Repo/Codex-Pet`.
- Git initialized on `main`; local-only, with no remote or publication configured.
- Codex project `Codex-Pet` is registered and was verified through `list_projects`.
- Project ID: `487765b7-a121-416a-9535-8a7a5bfff3a3`; host: local.
- Original planning material remains preserved under `docs/planning/`.

The connector had no project-creation operation and computer use could not
operate Codex itself. A later project-list read nevertheless confirmed the
requested project with the correct repository path and Git-repository status.
This record does not attribute the registration to an unobserved action.

## Installed Or Reused Tools

| Tool | Version / location | Treatment |
| --- | --- | --- |
| Node.js | 24.21.0, `.tools/node` | Project-local official distribution; SHA-256 checked |
| pnpm | 11.25.0, `.tools/pnpm` | Project-local installation |
| TypeScript | 5.9.3 | Pinned development dependency |
| Node types | 24.10.0 | Pinned development dependency |
| DSH development packages | 0.2.1-rc.5 | Agent, session, tools, system-prompt; pinned |
| Cordis | 4.0.5 | Pinned development dependency |
| Python | 3.12.14, `.tools/python` and `.venv` | Project-local managed runtime and environment |
| uv | 0.12.5 | Existing installation reused |
| Swift | 6.4 | Existing Apple toolchain reused |
| Apple developer tools | `/Library/Developer/CommandLineTools` | Existing installation reused |

Global Node/Python/pnpm selections, the installed DSH app, its profiles and
plugins were not replaced or enabled. No QQ/Bilibili login, external message or
upstream build/install hook was performed. Install used `--ignore-scripts`.
The pnpm lockfile records the resolved development dependency graph.

## Reference Library

All **32/32** repository sources are present under `references/sources/`.
See [the local index](../references/INDEX.md) and
[manifest](../references/manifest.json). The initial nine shallow Git checkouts
were retained; the remaining 23 use official GitHub commit-pinned archives after
clone timeouts/DNS failures. Old failures and partial data are retained under the
ignored `.cache` directory. Owned timed-out Git processes were stopped.

The deeply inspected projects retain their studied commits; other sources freeze
the commit resolved during preparation. Original licenses/notices stay in source
folders. Git LFS payloads and submodule dependencies were not fetched. No source
for the Bilibili whitepaper was established; its article reference stays in the
planning study. Source availability does not establish execution compatibility.

## Verification Actually Performed

- Official Node distribution SHA-256 verification.
- `pnpm run check:env`: project runtime selection; Python; compiler presence;
  actual SDK imports; all 32 Git/archive version identities and archive checksums.
- `pnpm run check:types`: TypeScript compilation of installed SDK entry-point types.
- Swift compiled and ran `import AppKit` successfully (`APPKIT_OK`).
- Project Python imported SQLite and TLS successfully; SQLite 3.53.1.
- Repository-owned JavaScript/Python syntax, documentation links, Git scope and
  whitespace inspection.

These checks do not exercise a DSH plugin, pet window, memory lifecycle, QQ
transport or Bilibili activity. Archive verification validates its cached package
and marker, not an adversarial integrity audit of every extracted working file.

## Current Boundary

The product's source modules are not implemented yet. Mac UI framework, memory
provider, final DSH runtime contracts and account integration remain decisions
from the planning baseline. The repository and its selected basic development
stack are ready for the first implementation work package.
