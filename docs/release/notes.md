# Her World 0.1.4

Fixes Life plans that stalled before breakfast because travel was represented
as an indefinite room activity. New `move` steps finish on actual arrival;
`room` and `hold` retain sustained-activity semantics. New plans reject indefinite
stays followed by unreachable steps, and execution receipts expose how the
current activity completes. Existing saved plans retain their original meaning
and remain available for explicit revision or cancellation.

Regression coverage includes arrival followed by feeding, same-location travel,
pause/resume, cancellation, restart and exactly-once feeding, finite stays,
Economy unavailability and sleeping-body refusal. Tests use disposable data
without paid models or personal companion workspaces.

Publication now uses one complete verification and checked archive. It waits
for npm metadata and ordinary install downloads to match that archive before
promoting main and publishing the GitHub Release. Re-running a failed release
reuses its frozen version and source.

Installation remains owner-controlled. Publication performs no local install,
plan rewrite or personal-data modification.
