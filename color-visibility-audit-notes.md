# Coach Studio color visibility audit notes

Reviewed the live Coach Studio coaching-lane preview on 2026-06-04.

Key findings:
- The new popup action-card area is readable overall, but several dark-surface text treatments still look lighter than ideal for a presentation-facing interface.
- The default popup action buttons use a soft cyan tint that can look visually quiet against the darker cards and benefit from stronger border/background separation.
- The main coaching-lane summary card uses muted slate copy that should be brightened slightly for better readability.
- The default action-card eyebrow and description copy can be strengthened so the compact card layout scans faster.
- Dialog description copy inside the popup helper is slightly muted for the dark modal surface and should be lifted one step.
- The gold weekly-log action should remain highly visible and can use a stronger foreground/background relationship than the current translucent treatment.

Follow-up visual check after the first contrast pass:
- The gold weekly-log action now stands out clearly and reads well against the surrounding dark hero surface.
- The compact popup cards are more legible, but the pale-gold weekly coaching card still sits close to the edge of comfortable contrast in its body copy and may benefit from darker text or a slightly deeper card background if a stronger visual hierarchy is desired.
- The default dark cards now separate more clearly from the summary panel above them.
- The coaching summary panel copy reads better after brightening the supporting text.

Second visual check after the gold-card refinement:
- The weekly coaching action card now reads much more clearly because the card itself is light and the title/body copy are dark.
- The dark default cards continue to separate well from the summary panel and the coaching-thread panel.
- The revised cyan and slate text treatments look more presentation-ready and are easier to scan in the compact card grid.

Section-wide Coach Studio redesign check:
- The Training transfer tab now follows the same compact pattern as the coaching lane, with a concise summary panel and four popup-triggered action cards.
- The transfer summary metrics and action labels are readable against the dark surface in the live preview.
- The next visual checks still needed are the Documentation and Alerts tabs so the same compact pattern can be confirmed across the full Coach Studio module.

Additional live-preview confirmation:
- The Documentation tab now presents a compact summary strip followed by popup-triggered actions for the queue, evidence feed, and coaching handoff.
- The Alerts tab now mirrors the same approach with a compact summary strip and popup-triggered actions for the queue, selected detail, and coaching return path.
- Across the three tabs reviewed after the redesign, the compact card pattern is now visually consistent and the supporting copy remains readable against the dark surfaces used in Coach Studio.

Header refinement preview:
The /coach workspace now opens with a slim Coach Studio title strip and one short line of context. The removed oversized eyebrow-plus-headline band no longer occupies the first screen, and the metric cards now begin immediately below the compact strip in the live preview.

Functional-copy preview notes:
The slim Coach Studio header and coaching-lane summary now use direct task language. The transfer tab still shows self-referential descriptions such as "Open the assignment roster only when you need..." and "Keep the lane short until you need...", so the action-card copy needs one more pass in Training transfer and likely the remaining tabs.
The refreshed preview shows the coaching and transfer tabs now lead with coach-task instructions instead of interface-mechanics copy. The transfer summary now reads as action guidance, and the coaching lane no longer explains compactness or popups in the visible card descriptions.
The refreshed Coach Studio preview confirms the visible header, coaching lane, and transfer guidance now read as direct work instructions. The first screen no longer explains compactness, popups, or page behavior in the visible coach workflow copy.

Agent-switching repair preview:
- The compact **Current learner** panel now includes a working selector again.
- Switching from **Nina Patel** to **Avery Chen** updates the top summary and coaching-thread detail without reintroducing duplicate learner or thread copy.
- The top of the workspace remains dense, with the slim header, stat row, mode strip, action cards, and selected coaching thread still visible in the upper page region.
