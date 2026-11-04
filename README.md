# Codex-Pet

A modular, DSH-backed Dafeiyu desktop companion for the selected Mac.

Current scope: local Git repository, development environment, retained planning
baseline and a local source-reference library. Product behavior is not implemented
or installed in DSH yet. No QQ/Bilibili account has been connected.

## Start Here

```sh
cd "/Users/hy-yin/Developer/Codex Repo/Codex-Pet"
source ./scripts/env.sh
pnpm run check:env
```

The activation script changes PATH only in the current shell. It selects the
project's Node, pnpm and Python virtual environment without replacing global tools.

## Ownership

| Path | Responsibility |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Development collaboration and reference-source boundaries |
| [Setup record](docs/setup.md) | Current environment, verification and outstanding app setup |
| [Planning baseline](docs/planning/README.md) | Retained plan v0.7, modular design and research history |
| [Reference library](references/README.md) | Upstream checkout handling and reproduction |
| [Reference manifest](references/manifest.json) | Exact downloaded commits, paths, licenses and status |
| `scripts/` | Repository-owned environment/reference preparation and diagnostics |

The planning baseline predates this bootstrap. Statements there about a target
repository not yet being created are historical; this README and the setup record
own current preparation status. Architecture proposals have not become accepted
implementation requirements merely because they were copied here.

## Development Environment

- Node.js 24.21.0, downloaded from nodejs.org and checked against SHA-256 sums.
- pnpm 11.25.0, installed under `.tools/pnpm`.
- TypeScript 5.9.3 and Node 24 types.
- DSH Agent/session/tools/system-prompt packages at 0.2.1-rc.5 and Cordis 4.0.5,
  aligned with the inspected local DSH runtime.
- Project-local Python 3.12 runtime and `.venv`, prepared by the existing uv tool.
- Existing Apple Swift/Command Line Tools; native AppKit compilation is checked
  separately in the setup record.

Python package dependencies for Mnemosyne and framework-specific tooling remain
subject to component selection. Downloading their source does not install their
runtime dependencies. Electron, Tauri, PySide6, QQ gateways and media pipelines
are not chosen implicitly by this environment setup.

To reproduce the current preparation on the selected Apple Silicon Mac:

```sh
python3 scripts/setup-runtime.py
source ./scripts/env.sh
pnpm install --frozen-lockfile --ignore-scripts
python scripts/fetch-references.py
pnpm run check:env
```

Use `pnpm install --ignore-scripts` only when creating/updating the lockfile;
normal restoration should use `--frozen-lockfile`. Dependencies requiring native
build hooks need a specific later decision. No lifecycle hook is run by bootstrap.

## References And Git

Upstream sources are shallow Git checkouts or official commit-pinned archives inside
`references/sources/<owner>/<repository>/`. Their exact commits are tracked in
the manifest; downloaded checkouts, tools, caches and node_modules are ignored
by the parent Git repository. No upstream dependency scripts run.

This is a local Git repository with an initial bootstrap commit. No remote or
publication is configured. Removing ignored directories is not part of ordinary cleanup;
restore them using the documented preparation scripts when needed.

## Verification

```sh
source ./scripts/env.sh
pnpm run check:env
pnpm run check:types
git diff --check
git status --short --untracked-files=all
```

The environment check verifies actual runtime selection, compiler/package presence,
SDK imports, Python and recorded reference Git/archive identity. Archive checks
validate the marker and cached archive checksum, not every extracted working file. It does not establish DSH
plugin activation, desktop UX, memory quality or QQ/Bilibili behavior.
