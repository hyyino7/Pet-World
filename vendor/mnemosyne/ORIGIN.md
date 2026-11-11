# Mnemosyne vendored runtime

- Source: https://github.com/canyueY/dsh-mnemosyne
- Commit: `796dc292367667d2f453885c12d09bec49f8327b` (2.0.0).
- License: Apache-2.0; retain LICENSE, NOTICE and THIRD_PARTY_NOTICES.md.
- Scope: canonical Python service and REST client/process host only. The upstream
  DSH plugin, automatic session collector, installers and presets are excluded.
- The original read-only checkout remains under references/sources; provenance is
  also retained in references/manifest.json.
- Local changes and conformance evidence belong in docs/core-runtime.md.

Local adaptations:

- `src/memory-process.js`: observe real child exit, retain unresolved ownership,
  fail startup errors explicitly, reject an existing live Bank owner, and accept
  the explicitly selected Pet service entry/environment. Bind `--token=value`
  so a random token beginning with `-` cannot break Python argument parsing.
- `service/src/cognitive_memory/evidence/derivation.py`: missing revision coverage
  is unknown rather than chosen.
- `service/src/cognitive_memory/core/service.py`: durable unfinished withdrawals
  in the existing idempotency journal, retry/settlement and source restrictions;
  optional scalar metadata scope is applied before search LIMIT. The original
  context builder accepts trusted in-process admitted memories/content rendering;
  its fragment semantics, tags and envelope budget stay upstream-owned. This
  admission seam is not exposed in the public HTTP input schema.
- `service/src/cognitive_memory/domain/models.py` and
  `service/src/cognitive_memory/retrieval/pipeline.py`: carry that optional query
  scope through the existing retriever, without adding another index/ranker.
- `service/src/cognitive_memory/cognition/consolidate.py`: retain admitted Pet
  source/scope metadata on existing inferred candidate episodes. The target port
  supplies the existing transactional write guard for immediate/background work.
- `service/src/cognitive_memory/claims/__init__.py`: lazy ClaimStore import fixes
  the first-withdrawal circular dependency without changing the public symbol.

Product-specific port and native joins are outside this copied runtime. No
upstream plugin/installer hooks were run. `requirements-test.lock` records the
exact tested environment, including test dependencies, rather than changing
upstream's supported version ranges.
