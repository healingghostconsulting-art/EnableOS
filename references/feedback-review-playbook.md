# Recurring Feedback Review Playbook

This workflow reviews the shared Google Doc at `https://docs.google.com/document/d/1mjW0vcjqU6BdNhSd1H3ycBm5ur-bZmyX/edit` every two hours. The document remains the working source of truth for new feedback, implementation progress, blocked items, clarification requests, and completed work.

## Operating rules

Use the shared Google Doc as the intake source. Treat any unmarked feedback line as open work unless it is clearly informational rather than actionable. The recurring review should skip lines already marked with **[Completed]** or the legacy completion marker **[Done]**.

For each newly identified actionable line, first translate it into a concise but strong implementation prompt that captures the requested behavior, affected user role or workflow, required validation, and any important constraints already known in the CHCG EnableOS project. Then begin work on the highest-priority safe items directly in the project when the request is specific enough to implement without clarification.

If implementation is completed and validated, update the corresponding Google Doc line by prefixing it with **[Completed]** while preserving the original feedback text. Existing lines already marked **[Done]** should be treated as completed and left unchanged unless there is a separate reason to normalize them later.

If a line cannot be implemented because of a confirmed dependency, technical limitation, missing access, or another concrete blocker, prefix it with **[Blocked]** and preserve the original feedback text. When possible, append a short blocker note after an em dash so the next review cycle understands why work did not proceed.

If a line is too ambiguous, missing required decisions, or risky to implement without product clarification, prefix it with **[Needs Clarification]** and preserve the original feedback text. When possible, append a short clarification note after an em dash so the next review cycle knows what decision is still needed.

The workflow should never auto-implement lines already marked **[Blocked]** or **[Needs Clarification]**. Instead, it should preserve those states, report them as outstanding, and revisit them only after the document line is edited to remove or resolve the blocking state.

## State conventions

| State | Exact prefix | Meaning | Automation behavior |
| --- | --- | --- | --- |
| Open | none | New actionable feedback not yet processed | Convert to implementation prompt and review for safe action |
| Completed | `[Completed]` | Work is finished and validated | Skip in future review cycles |
| Legacy completed | `[Done]` | Earlier completion marker still considered final | Skip in future review cycles |
| Blocked | `[Blocked]` | Work cannot proceed because of a known blocker | Do not auto-implement; preserve and report blocker |
| Needs clarification | `[Needs Clarification]` | Work needs a decision or clearer instruction before implementation | Do not auto-implement; preserve and report clarification need |

## Examples

Completed feedback lines should follow this convention:

`[Completed] original feedback text`

Legacy completed lines may still appear in this older form and should remain valid:

`[Done] original feedback text`

Blocked feedback lines should follow this convention, with an optional short note:

`[Blocked] original feedback text — waiting on source asset or required access`

Clarification-required lines should follow this convention, with an optional short note:

`[Needs Clarification] original feedback text — confirm which learner cohort this applies to`

These conventions keep the shared document readable for humans while allowing recurring review cycles to separate open work from completed, blocked, and clarification-dependent items reliably.
