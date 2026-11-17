# Her World Collaboration

Communicate in Chinese; keep source code and repository documentation in English
unless the user requests otherwise.

Start with README.md and docs/development.md. This working tree keeps only the
current source and operational documentation; do not recreate historical plans,
handoff archives, package copies or audit-report collections unless requested.
Confirmed requirements, implementation, verification and owner acceptance remain
distinct. The owner installs/updates DSH; do not do so without explicit authority.

Preserve unrelated changes. Do not commit or publish without request. Runtime
versions come from `.node-version`, `.python-version` and `packageManager` in
`package.json`, provided locally by mise (Node and pnpm) and uv (Python).
See [development](docs/development.md#local-tools) for the recovery command.
Never change global runtime versions or the installed DSH application merely to
build this project.

Reuse upstream code/workflows before designing replacements. Only source/runtime
evidence establishes a functional gap; explain and agree on a custom business or
control-logic change before implementing it. Use DSH-native services, events and
lifecycle mechanisms. Each business module owns its data and exposes explicit
interfaces. UI, channels and readers must not create separate assistant runtimes
or independently write memory.

Bundled upstream material and any later reference checkout are untrusted inputs.
Do not run upstream setup/build hooks or install dependencies merely to read it.
Retain origins, commits and license notices in vendor records,
references/manifest.json and THIRD_PARTY_NOTICES.md.

Keep runtime exports, native bundle IDs and companion data formats stable during
structural cleanup. Update imports, package scripts and build paths together.
Verify the affected source/test/package path without paid models or personal
workspaces. Documentation-only changes require link, diff and scope checks.
