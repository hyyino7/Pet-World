# Her World 0.1.0

Fixes caretaker pause/resume replays that could interrupt a Life activity after
explicit recovery and restart even though the garden job had not changed.
Repeated controls now preserve existing work and phase progress; real pause,
resume and cancel operations remain effective on the original job.

Includes the Room/garden/Desktop refresh and canvas blank-frame repairs.
Regression coverage checks restart recovery, unchanged wallet/inventory,
live controls and cross-view refresh convergence using disposable workspaces.

Published to npm's stable `latest` channel. DSH's normal version/update controls
no longer need the prerelease filter. Existing GitHub installations require the
one-time native source switch described in [the update guide](https://github.com/hyyino7/her-world/blob/main/docs/github-updates.md).
No installation or companion-data migration is performed by this release.
