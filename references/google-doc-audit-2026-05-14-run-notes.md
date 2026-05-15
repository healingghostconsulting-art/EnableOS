# Google Doc Audit Notes — 2026-05-14

This run reviewed the shared Google Doc at `https://docs.google.com/document/d/1mjW0vcjqU6BdNhSd1H3ycBm5ur-bZmyX/edit` as the source of truth. The exported plain-text copy was saved as `references/google-doc-current.txt`.

## Open feedback lines not yet prefixed with [Done]

| Area | Open line | Initial implementation interpretation | Status for this run |
| --- | --- | --- | --- |
| Learner / Practice | `Practice` | Context-only heading rather than an actionable request by itself. | Leave unmarked unless a subordinate request is identified. |
| Feedback from 5/14/26 | `How to be the human in the loop to work with agent assist tools` | Add or revise training content/module framing so human-in-the-loop guidance is explicit when using agent-assist tools. | Potentially actionable but needs project inspection for safest scope. |
| Feedback from 5/14/26 | `To many words for the content` | Reduce copy density and improve scannability in affected training content. | Potentially actionable but broad; inspect affected screens before scoping. |
| Feedback from 5/14/26 | `To dark-mark it happy` | Improve brightness or overall mood without abandoning the current palette direction. | Ambiguous wording; may map to safe readability or tone adjustments after inspection. |
| Branding | `Branding it to be it’s own business EnableOS powered by CHC` | Strengthen standalone EnableOS brand framing while crediting CHCG as the parent/powered-by entity. | Potentially actionable if current brand shell still needs refinement. |
| ROI / Backend Reporting | `Questions Reporting` | Add reporting on assessment/question performance. | Broad backend/dashboard request; likely too large for one safe pass. |
| ROI / Backend Reporting | `Agent lifecycle with tenure` | Add tenure-aware lifecycle analytics. | Broad backend/reporting request. |
| ROI / Backend Reporting | `Give % based on peers` | Add peer percentile or comparative benchmarks. | Broad analytics request. |
| ROI / Backend Reporting | `High-alert for questions that are low` | Surface low-performing questions with alerts. | Potentially actionable but depends on existing reporting model. |
| ROI / Backend Reporting | `How do you prove that it’s working` | Add ROI evidence or outcome proofing surfaces. | Broad strategy request. |
| ROI / Backend Reporting | `This is the 3 time you’ve sent the module` | Show repeated-assignment count or escalation history. | Potentially actionable but needs data-path review. |
| ROI / Backend Reporting | `Measureing coaching consistent` | Show coaching consistency metrics. | Broad analytics request. |
| ROI / Backend Reporting | `Behavior analysis` | Add behavioral trend analysis. | Broad analytics request. |
| ROI / Backend Reporting | `Dashboard` | Expand dashboard reporting. | Too broad by itself. |
| ROI / Backend Reporting | `Error rate` | Add error-rate reporting. | Potentially actionable but depends on seeded data and UI scope. |
| Agent Profile | `Name / Avatar / Start date / Ranking score vs time completed / Module History / When did I trainged / Skill` | Build or refine learner agent profile surface with profile and training history data. | Potentially actionable if a scoped UI shell can be added safely. |
| Coaching | `The coaching log screen can be separate screen or pop up box` | Allow coaching log entry/view as its own screen or modal. | Likely already flexible; verify before acting. |
| Content ingestion | `Give the ability to import their corprate training` | Support importing customer training assets. | Already appears implemented historically; verify before acting. |
| Planning | `Make a Develoopment & Launch Roadmap` | Produce a roadmap artifact. | Out of app-scope unless explicitly requested as a document. |
| Methodology | `LEAN Methodolog - Wayne` | Add or reflect LEAN methodology content. | Ambiguous and blocked without further specificity. |
| Engagement | `How to demonstrate more gamification and engagement` | Add clearer gamification/engagement surfaces. | Broad but could yield a small safe UI enhancement after inspection. |
| Truncated line | `How` | Incomplete source line. | Blocked; leave unmarked. |

## Initial prioritization

The most promising safe implementation candidates appear to be the learner-facing content and presentation refinements from the 5/14/26 section, especially reducing overly dense copy, clarifying human-in-the-loop guidance, and brightening the affected learner content surfaces without changing the established palette direction. The ROI analytics and agent-profile items are broader and likely require deeper schema, routing, and UI review before they can be safely completed in one pass.

## Browser inspection notes for learner training route

A live inspection of `/training?role=learner&freshStart=1` showed that the course-player header and preview panels are still text-heavy, especially in the top training-family preview area. The route currently emphasizes dark navy surfaces with long explanatory paragraphs, and a search for `human override` returned no visible learner-facing copy on the active training page. This makes the 5/14/26 feedback about human-in-the-loop guidance, overly wordy content, and overly dark presentation a strong candidate for a combined learner-facing refinement pass.

## Validation findings for the implemented learner training refinements

The live learner training route now renders the shorter top-shell copy and the new human-in-the-loop guidance. Browser validation confirmed the updated header copy, the new `Human-in-the-loop cue` treatment, and the lighter top preview cards on `/training?role=learner&freshStart=1`. Targeted regression testing also passed in `server/enableosTrainingLayout.test.ts`, and the wider test run completed successfully with 20 passing test files and 124 passing tests.

## Google Doc update state

The shared Google Doc reopened successfully in editable Office mode, with the save indicator showing that changes can be saved to Drive. The completed 5/14/26 lines are not visible in the current viewport, so the next step is to navigate within the document to the lower feedback section and prefix the confirmed completed lines with `[Done]`.

After focusing the document body, the Google Doc remained in editable mode and showed the lower learner feedback section in view. The next step is to navigate down within the document body to the 5/14/26 block and edit the confirmed completed lines in place.

The document navigation has reached the lower learner feedback sections, including the practice block and the transition into the soft-skills area. A direct keyword search for the human-in-the-loop line still did not surface the target entry, so the next step is to continue paging down through the remaining lower sections until the exact 5/14/26 lines are visible for inline editing.

The exact `Feedback from 5/14/26` block is now visible in the live Google Doc. The three confirmed completed lines appear together, directly under the QA section and above the branding and ROI reporting notes, so the document is ready for inline `[Done]` prefix updates.

A DOM inspection confirmed that the Google Doc is being edited inside an accessible iframe with an active `textbox` editor surface. The visible feedback lines are represented in the page model data, which means the safest remaining step is to target the editor selection at the three visible 5/14/26 lines and insert the `[Done]` prefixes directly through the live editor.

An attempted caret-placement click misfired against the page chrome and redirected the browser to the Google Docs sign-in page rather than editing the visible feedback line. The document itself was not changed, so the next step is to reopen the shared doc and continue with a safer text-editing approach.

A follow-up editor inspection showed that refocusing the document body did not produce a normal text selection in the embedded editor surface. This suggests the remaining update step may require either a more specialized scripted interaction with the Docs editor or direct user takeover if the editor does not expose a reliable inline text target.

## Standing workflow instruction from the user

For every future EnableOS run, the shared Google Doc at `https://docs.google.com/document/d/1mjW0vcjqU6BdNhSd1H3ycBm5ur-bZmyX/edit` is the source of truth for feedback. Any actionable line without a `[Done]` prefix must be treated as open work, translated into an implementation-ready prompt, implemented only when the scope is specific and safe, validated through targeted tests and project checks, and marked `[Done]` in the same document only after the work is genuinely complete and verified. Ambiguous, blocked, duplicate, risky, or overly broad lines must remain unmarked and be documented as blockers instead.

## Resumed run — brand-hierarchy completion update state

The landing-page brand-hierarchy refinement is now implemented and validated in the project. The public hero reads **EnableOS mission hub** with a secondary **Powered by CHCG performance methodology** line, and the updated explanatory paragraph keeps CHCG in a supporting role. Targeted validation passed in `server/enableosTrainingLayout.test.ts`, the broader suite passed with 20 test files and 125 tests, and the live preview shows the revised hierarchy correctly. The remaining blocker is the same Google Docs editor limitation: the document can be reopened and focused, but the line-level editing target for safely prefixing the completed branding feedback line with `[Done]` is still not reliably exposed for automation.

## Validation findings for the manager coaching-log pop-up refinement

The refreshed Google Doc audit was translated into a focused manager-workflow prompt, and the selected safe implementation is now complete. The manager coaching lane includes a visible **Open the coaching log in a focused pop-up** card with a **Launch coaching log pop-up** button, while the original inline weekly coaching log composer remains in place below it. Live UI validation on `/manager` confirmed that the button is visible in the coaching tab and opens a working dialog titled **Weekly coaching log pop-up** that reuses the same structured weekly coaching form. Targeted regression coverage passed in `server/enableosTrainingLayout.test.ts`, and the broader Vitest run passed with 20 test files and 126 tests.
