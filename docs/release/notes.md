# Her World release notes

This prerelease adds npm publication for DSH's native installed-plugin version
and Update controls. The checked archive is published unchanged to npm and
GitHub, with immutable integrity verification and token-free GitHub OIDC.
Prereleases use the `next` tag. GitHub installations need a one-time dependency
source switch; subsequent updates use the native DSH update dialog.

The Room/garden/Desktop refresh convergence and canvas blank-frame repairs from
rc.4 remain included. No companion data format, bundle ID or runtime behavior
changes in this publication.

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
