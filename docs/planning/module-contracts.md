# Current module contracts

Updated: 2026-11-13, Asia/Ho_Chi_Minh. The owner explicitly retired the old
Core activity, execution, contact, whole-chat eligibility and dependency
scheduler. This replaces the earlier draft service map; it does not remove
native DSH authority or a domain's real transaction receipts.

The [native service plan](native-service-refactor.md) owns this direction.
Current types are exported by [contracts/index.ts](../../src/contracts/index.ts).

| Responsibility | Current owner and boundary |
| --- | --- |
| Companion identity, bound workspace and editable settings | Thin Core configuration services: getIdentity, reviseIdentity, getPolicy and listCapabilities; workspace/preferences own their existing APIs |
| Conversations, tools, streaming, permissions and cancellation | Original DSH Agent/session/preset services; input surfaces retain their native conversations |
| Long-term memory | Existing Memory Bank; native hooks supply attributed sources and durable observation joins. The Bank owns version/withdrawal validity. No Core whole-chat admission graph |
| Physical work, current life and items | Existing Life, Behavior and Economy services; their actual operation, inventory, ledger and persistence contracts remain |
| Feelings and presentation | Independent Emotion state plus Body projections, Desktop and Room readers |
| Records and continuity | Core self/diary/album paths and portable original native transcripts; native sessions remain authoritative |
| Recovery | Existing offline companion-backup and module-owned storage; no legacy Core online snapshot or generic artifact service |

Configuration mutations require an owner-issued context, request deduplication
and expected revisions. Serialized actor claims grant no authority. File/storage
and workspace checks remain deterministic. Native tools keep their DSH permissions.
The shared [common types](../../src/contracts/common.ts) describe current errors,
settings calls, capability status, media references and attributed observations;
they do not introduce another execution runtime.

Retired: Core chat/drain/idle, pairing/receiveMessage, activity/execution APIs,
commitment/matter tools, contact/delivery attempts, generic resources, online
maintenance and their unimplemented draft module ports. Existing old database
rows remain inert historical bytes; this source cleanup does not migrate, replay
or delete personal data. Native channel deduplication and Body/Economy receipts
have separate actual owners and remain intact.

Historical draft text is retained in the task evidence under
.cache/package-code-review-20261113/module-contracts-before.md. It is not a
current implementation contract or an installable runtime dependency. Source
checks and owner acceptance are separate; see the [handover](../handover/README.md).
