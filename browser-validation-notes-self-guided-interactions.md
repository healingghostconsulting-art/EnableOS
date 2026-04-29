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
