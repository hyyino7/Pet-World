# Handover Template

Use this structure to update [the current handover](README.md). Keep that file as
the current entry point; this template is not a second status record. Replace
placeholders, remove irrelevant rows and keep the result short. Record only
verified facts or explicitly label historical evidence, proposals and unknowns.
Use relative links from `docs/handover/` and keep credentials out of the record.

---

# Current Handover

- Updated: <date/time and configured timezone>.
- Status: <current checkpoint or incomplete work>.
- Repository: <absolute checkout path; list other authorized checkouts only if relevant>.

## Read First And Record Ownership

- [Repository guidance](../../AGENTS.md) and [README](../../README.md).
- <links to the owning state, plan, design and evidence records relevant to this task>.
- <which document owns each changed subject; preserve the existing authority map>.

## Goal, Current Task And Authorization

- Long-term goal/current stage: <source-backed summary and link>.
- Current task: <requested outcome and boundaries>.
- Authorization: <user instruction or applicable repository rule>.
- Next task: <already authorized, proposed, or not selected; give its basis>.

## Completed Work And Changed Files

- <what changed and why; link the relevant files>.
- <unfinished work, partial results and work deliberately outside the authorized scope>.

## Repository Scene And Local Assets

- Observed at: <timestamp; refresh for each relevant checkout>.
- Branch / HEAD: <actual branch or detached state and full commit>.
- Index / working tree: <staged and unstaged scope, untracked paths, pre-existing changes>.
- Commit/publication state: <what actually happened>.
- Outside-Git assets needed to resume: <locations, saved state and restoration source>.

Recheck this scene on resume. Preserve unrelated changes and do not infer that
local assets are included in a repository commit.

## Verification And Limits

| Check and date | Actual result / evidence | Coverage limit or reason not run |
| --- | --- | --- |
| <command, inspection or behavioral case> | <observed result or evidence link> | <what remains unverified> |

Distinguish checks performed now from historical results and proposed checks.
Static checks do not establish runtime behavior or user acceptance.

## Open Questions And Blockers

- <unresolved choice, failure or dependency; owner/source and affected work>.
- <accepted decisions versus candidates; link the owning record rather than duplicate it>.
- <stop condition needed to resume safely, if applicable>.

## Immediate Restart Action

<One concrete action supported by current authorization and source pointers.
If the next objective is not selected, say so and establish its scope first.>
