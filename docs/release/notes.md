# Her World 0.1.3

Fixes crop-growth rollback when garden state is queried before the Body clock
has recovered, including component replacement during a plugin update.

- Retains crop-clock intent in the existing Body checkpoint. Component disposal
  suspends its executor without treating it as an explicit owner pause.
- Preserves elapsed growth during state observation and storage restart;
  explicit Life disable and re-enable still exclude the paused interval.
- Uses saved clock intent when applying Economy settings while an executor is
  unavailable, and rejects checkpoints that rewind an existing crop or its
  settlement clock. Wallet, inventory and request deduplication remain intact.

Validation covers repeated state queries, partial and mature crop projections,
SQLite storage reopening, real Cordis Life unload and Body/Economy replacement,
explicit pause/resume, and rejection of regressive checkpoints. Tests use
disposable data with no paid model calls or personal companion workspaces.

This release does not reconstruct growth already lost in an older save.
Installation remains owner-controlled; publication performs no local install
or personal-data modification.
