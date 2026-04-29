# Browser validation notes: self-guided learner interactions

## Validated in live preview

- Opened the training simulator from the preview landing page and loaded the learner training flow for **Soft Skills & Customer/Patient Service Foundation**.
- Confirmed that the first lesson page now renders a **self-guided slide challenge** directly inside the lesson content area.
- Confirmed the first page uses the new **click-to-reveal** interaction, with three reveal cards and visible progress chips.
- Revealed all three cards and submitted the challenge.
- Confirmed the flow automatically advanced beyond the opening page. The learner preview moved from **page 1** to later guided pages, showing that pass-driven page progression is active.
- On the subsequent guided page, confirmed a different interaction type rendered (**multiple-choice**, followed by a **branching-style** page after additional progression), which shows the new interaction rotation is active across guided slides.

## Observed behavior to retain

- The lesson challenge appears before the lower visual/story content and is visually distinct from the narration and checkpoint sections.
- The pass threshold is surfaced in the UI.
- Retry controls remain visible.
- Automatic advancement occurs after a successful challenge submission.

## Follow-up note

- Manual browser validation confirmed the new interaction flow is visible and advancing in the learner preview, while the full automated suite also remains green at **67/67 tests passed**.

## Deeper reliability review: fail-path check

A fresh browser pass confirmed the opening learner slide still loads with the self-guided challenge visible in the lesson page. Submitting the challenge before opening any reveal cards produced the intended failure state: the interface changed the action label to **Check again**, displayed **0% · Retry required**, and showed the hint instructing the learner to open each reveal card before retrying. This confirms the hardened fail-first path is visible in the live preview and still forces review before progression.

The retry control also behaved correctly in the fresh browser pass. After using **Review slide and retry**, the fail-state score panel cleared, the primary action returned to **Check slide challenge**, and the reveal cards returned to their hidden state. Opening the first card after the reset confirmed the learner can start a clean second attempt without stale failure feedback carrying forward.

Continuing the live retry attempt, the second and third reveal cards opened normally after the reset and the challenge chips returned to a fully passed state, including **Pass at 75%** and **Progress 100%**. This confirms the reveal interaction can recover from a failed first attempt and still reach a valid passing condition within the same learner session.

Submitting the fully recovered reveal challenge advanced the learner to the next guided page and landed on **Page 2 of 16**, where the next interaction type rendered as the expected multiple-choice challenge. The transition did not double-skip past the next page, and the new page loaded with a clean challenge state instead of carrying over the prior reveal submission. This supports the timeout cleanup hardening that was added during the review.
