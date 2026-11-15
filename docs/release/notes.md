# Her World 0.1.7

Unfinished daily reviews now retain their original dates and failure reasons
across midnight and restart. Missing diaries from previously delivered reviews
are recovered from existing Life wake records. Technical retries are bounded;
owner interruption and cancellation retain the task for a later daily review.
Disabling evening review suspends pending dispatch without deleting the backlog.

Review prompts and tool refusals direct native file work through scoped `read`
and `write`. Completion checks reconcile native write receipts with the canonical
diary file. Existing records are retained without claiming a new write. Backfill
can create a missing diary for its specified date, while existing historical
diaries cannot be overwritten, including when a file appears before dispatch.
No self-description change is required to finish a diary review.

Sleep guidance and body context explicitly distinguish quiet waiting, a pending
sleep action and actual sleep. Choosing sleep requires the existing `body/sleep`
action; reply prose, a hold and a consideration alarm do not put the body to sleep.
Sleep remains an autonomous choice. Regression checks exercise arrival, gentle
touch and wait completion through the real Life and Body coordinators.

Focused verification passed 168 related tests, native isolated Life checks,
types, build and package closure checks, without paid model calls or personal
companion workspaces. The publication workflow also runs the full shared
verification before publishing its checked archive.

Installation remains owner-controlled. Publication performs no local install
or personal-data modification. Installed functional acceptance is separate
from automated source and package checks.
