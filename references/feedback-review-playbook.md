# Recurring Feedback Review Playbook

This workflow reviews the shared Google Doc at `https://docs.google.com/document/d/1mjW0vcjqU6BdNhSd1H3ycBm5ur-bZmyX/edit` every two hours. The document is the working source of truth for new feedback, in-progress work, and completed items.

## Operating rules

Use the shared Google Doc as the intake source. Treat any unmarked feedback line as open work unless it is clearly informational rather than actionable. Ignore lines already marked with `[Done]`.

For each newly identified actionable line, first translate it into a concise but strong implementation prompt that captures the requested behavior, affected user role or workflow, required validation, and any important constraints already known in the CHCG EnableOS project. Then begin work on the highest-priority safe items directly in the project when the request is specific enough to implement without clarification.

When implementation is completed, validate the change with the appropriate checks, including project tests and any targeted verification needed for the touched flow. Only after the work is completed and validated should the corresponding Google Doc line be marked by prefixing it with `[Done] ` while preserving the original feedback text.

If a line is ambiguous, blocked, duplicated, risky, or too broad for safe unattended implementation, leave it unmarked and document the blocker in the task instead of marking it complete.

## Completion convention

Completed feedback lines should be updated in the Google Doc using this exact convention:

`[Done] original feedback text`

This convention keeps completed items visible while allowing future review cycles to skip them reliably.
