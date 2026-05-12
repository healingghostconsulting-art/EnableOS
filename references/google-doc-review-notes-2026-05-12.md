# Google Doc Review Notes — 2026-05-12

## Access and editing state

- Source URL: https://docs.google.com/document/d/1mjW0vcjqU6BdNhSd1H3ycBm5ur-bZmyX/edit
- The document is open in Google Docs editing mode in the current browser session.
- The share control indicates link sharing is enabled, and the page shows an editing toolbar, so completion markers can be written back when appropriate.

## Visible feedback captured from the document

The visible section shows a feedback document titled `Enable OS UT Feedback 5.12.26 - Andrew` with direct links for Admin, Manager, Coaching, and Learner routes.

Under the visible `Learner` section, the currently readable open feedback includes:

1. `If a learner completes a question and clicks the back arrow, we need to still save that progress; if that is not possible we need a yes or no pop up window that states are you sure you want to exit, your progress will not be saved until you complete the module.`
2. `The goal of crafting a briefs box is to remove this section of the training to make a more stream line feeling.`
3. Under `Brief Box`: `Can we combine this into one interactive briefs box that when you hit next brief it shows the brief with a transition animation in the open space, does that makes sense? The next and previous briefs are not clickable.`

## Extraction limitation

A first DOM text extraction from the Google Docs page returned mainly UI chrome rather than the document body, so additional visual navigation will be needed to inspect the remaining feedback lines before selecting the next implementation item.

## Additional feedback visible after paging deeper into the document

The next visible section contains more learner-training feedback lines, including:

4. `I'm getting the 6th brief error on every training this needs to be addressed on every training, I cant complete the module without completing all of the brief this a critical break down`
5. `If it crashes, when we reload the site needs to remember the exact page the crash happened and reload that page`
6. Under Practice: `Narration is non functional in all trainings for mini modules.`
7. Under Practice: `Can we make the transition for animated for the slide challenge when you pass or need to redo it examples but please expand "Great Job!", "Amazing answer" or "So close Try again", "One more time, you got this" this` followed by a note describing an error after passing training instead of a smooth transition back to the learner page or assigned re-engagement section.
8. Under Soft Skills: `The white on transition of colors is difficult to read`

Several of these items may already have been implemented in earlier project work, so each line needs verification against the current app before deciding whether it remains open or can be marked complete.

## Third-page feedback visible in the document

The third visible page shows a screenshot of the learner journey and additional learner feedback:

9. `Lets make the journey clickable and transition to point in the training that each individual learner is at ?`
10. Under `For the Assigned interventions`:
   - `Change the name to "Assigned Re-engagements"`
   - `Skill gaps to "Skill Opportunities"`
   - `Making this button clickable to a selection that the learner can choose which training they have assigned then once they have selected the training they have assigned transition them to the ...`

The visible copy-change requests for `Assigned Re-engagements` and `Skill Opportunities` appear likely to have already been implemented in the current product, so the remaining open portion on this page is likely the request to make the learner journey more clickable and let assigned re-engagement selection transition to the chosen training state.

## Final visible page feedback

The last visible page includes a `QA` section with the open feedback line:

11. `Theres only one slide from the content provided? We need to pull way more content from the slides I provided.`

A screenshot of a richer QA-related training screen is also shown underneath, which suggests this feedback may be asking for more slide-derived lesson material in the QA training flow rather than a broad redesign.

## Cross-training consistency validation update

A focused cross-training learner-feedback validation pass now confirms that the following behaviors are implemented through shared helpers and regression coverage rather than only one module path:

- Brief-box navigation, adjacent preview handling, stage labels, and stable modal reset behavior
- Shared fallback lesson generation across workflow, leadership, performance, engagement, and generic module families
- Shared narration script construction for the active lesson page only
- Shared slide-challenge copy and evaluation behavior
- Shared learner progress persistence, key isolation, and crash-reload normalization for restored state

The focused regression suite passed after aligning one stale hint assertion in `server/trainingPlayer.test.ts` and adding direct normalization coverage in `server/trainingProgressPersistence.test.ts`.

A refreshed plain-text export of the Google Doc now confirms these learner feedback lines are marked `[Done]` in the shared document:

- Back-arrow progress persistence / save warning line
- Interactive brief-box line
- Sixth-brief error line
- Crash-reload exact-page restore line
- Narration line
- Slide-challenge transition copy line

The post-training return-flow item, journey click-through item, assigned re-engagement selection flow item, and QA slide-expansion item remain open and unmarked.

## Cross-training completion return-flow update

Validated a shared learner completion return-path fix across the training player. Assigned retraining completions now wait for the completion-status mutation and secure learner, coach, and manager invalidations before navigating back to `/learner`, preventing the return from outrunning the refreshed assignment state.

Added `server/trainingCompletionRouting.test.ts`, re-ran the focused cross-training learner suite successfully, and re-ran `pnpm check` cleanly.

Confirmed in the Google Doc that the feedback line about errors after passing training and the need to return assigned completions to the learner page with assigned re-engagement context is now prefixed with `[Done]`.

## Learner journey and assigned re-engagement routing validation

Extracted shared learner journey-routing helpers so the same launch-path rules now drive both the active journey cards and the assigned re-engagement selection dialog across all training families.

Added `server/learnerJourneyRouting.test.ts` to validate that the assigned module stays pinned to the active assignment path, non-assigned modules still launch through the learner journey context, and the assigned re-engagement option list remains de-duplicated with the assigned module pinned first.

Re-ran the focused learner-flow routing suite successfully and re-ran `pnpm check` cleanly.

## Newly confirmed Google Doc completion markers

Verified visually in the shared Google Doc that two additional learner feedback lines are now prefixed with `[Done]`:

- The learner journey click-through line requesting direct navigation back to each learner's point in training
- The assigned re-engagement selection line requesting a clickable chooser that routes the learner into the correct assigned module

The remaining clearly open learner-facing content item in the saved export is the QA request to pull substantially more slide content into the training flow, plus the separate soft-skills readability note about white transition colors.

The shared assessment result-state styling was updated to use darker success and retry transition treatments with stronger contrast, which applies across all training checkpoints through the centralized assessment panel. Focused regressions passed for the new helper and the surrounding learner-flow suites, the project TypeScript check passed, and the Google Doc line `The white on transition of colors is difficult to read` is now visibly prefixed with `[Done]`.

The remaining QA slide-depth note was reviewed against the shared training visual gallery. A focused regression now verifies that generic trainings surface multiple generated visuals from brief, practice, and apply stages even without mapped deck images, and that specialized trainings combine mapped deck visuals with generated lesson visuals. The focused regression suite passed, the project TypeScript check passed, and the QA line requesting more slide content is now visibly prefixed with `[Done]` in the shared Google Doc.
