# Her World release notes

This prerelease uses the plain GitHub repository address for both installation
and replacement updates in DSH. No custom plugin index is needed. The release
workflow promotes the checked source and compiled runtime to the default branch.
Full TypeScript sources, tests, lockfile and provenance remain included.

This update repairs Room, garden and Desktop refresh convergence. Body keeps
full-precision simulation values while read notifications follow its existing
public display projection. Readers coalesce covered revisions and preserve
newer state, explicit refreshes and service replacement. Desktop refresh uses
its native event subscriber once.

Room now resizes its canvas before drawing, preventing blank frames after
quality changes and window resizing. Adaptive quality respects intentional
idle frame rates and the low-quality pixel-ratio limit.

Regression checks cover all three readers together, stale responses, lifecycle
changes and frame scheduling. An isolated Electron compositor check rejects
the old rendering order and passes the repaired order. These checks use no
personal companion data or model calls.

The old `dsh-Chatpet` package requires the one-time transition described in
[the update guide](https://github.com/hyyino7/her-world/blob/main/docs/github-updates.md). Existing companion data formats and
module entry IDs are unchanged. Never enable both packages together.

Known P2: replaying an old unfinished caretaker pause/resume after explicit Life
resume and a restart can interrupt the restored hold again without changing the
garden job's effective state. This publication does not repair that issue.
Stable publication remains blocked by `docs/release/status.json`.

CI and archive checks do not establish installed visual, resource, device,
provider or owner acceptance. No installation or personal-data migration is
performed by the release workflow.
