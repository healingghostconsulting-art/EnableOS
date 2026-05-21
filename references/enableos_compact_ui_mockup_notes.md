# EnableOS Compact UI Mockup Notes

This mockup is intended to confirm the **direction** of the next interface pass before any production UI changes are implemented. The design keeps the current EnableOS visual language, but compresses the layout so more real work is visible immediately and the user reaches action faster.

| Screen | Intended change | Why it matters |
| --- | --- | --- |
| Compact Mission Hub / Library | Replace tall stacked cards with denser browse rows, a compact top shell, a sticky search/action bar, and a right-side detail panel | This reduces scroll depth and lets users scan, inspect, and launch from one surface |
| Focused Training Player | Move the active training state into a more self-contained player with a compact header, persistent outline, central lesson canvas, and short progress rail | This removes the feeling that learning is buried inside a long page and makes progression feel faster and clearer |

The mockup assumes that the biggest next move is **compression without losing richness**. Content still exists, but it appears through progressive disclosure instead of making the first screen do too much. In practice, that means shorter summaries by default, fewer oversized hero blocks, and a stronger separation between **browse mode** and **active learning mode**.

| Callout | Meaning |
| --- | --- |
| 1 | Shrink the top shell so more actionable content appears above the fold |
| 2 | Convert large cards into denser mission or module rows |
| 3 | Open module detail in-panel instead of sending the user through another long detour page |
| 4 | Use a focused player header with progress visible immediately |
| 5 | Keep lesson content and checkpoint interaction in the same frame |
| 6 | Keep next action, score, time, and reward visible without extra scrolling |

If this direction looks right, I would implement it in this order: first the mission hub and training library compaction, second the course-detail drawer or modal behavior, and third the focused training player shell.
