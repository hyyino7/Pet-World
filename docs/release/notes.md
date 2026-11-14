# Her World release notes

This prerelease restores the complete TypeScript sources, tests, build scripts,
lockfile and provenance records alongside the compiled Git-installable runtime.
The product and package are now named **Her World** / `her-world`.

The old `dsh-Chatpet` package requires the one-time transition described in
[the update guide](https://github.com/hyyino7/her-world/blob/main/docs/github-updates.md). Existing companion data formats and
module entry IDs are unchanged. Never enable both packages together.

Known P2: replaying an old unfinished caretaker pause/resume after explicit Life
resume and a restart can interrupt the restored hold again without changing the
garden job's effective state. This publication does not repair that issue.
See [validation](https://github.com/hyyino7/her-world/blob/main/docs/validation/mapped-playback-2026-11-14.md).

CI and archive checks do not establish installed visual, resource, device,
provider or owner acceptance. No installation or personal-data migration is
performed by the release workflow.
