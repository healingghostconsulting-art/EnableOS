# Flash-card cleanup validation notes

On the live `/training` route, the updated lesson-surface copy is present and confirms the new combined composition: the page contains the sentence about keeping progress, context, and flash-card review inside one tighter lesson surface. The viewport element list also shows the interactive flash-card region with `Previous card`, `Flip card`, and `Next card`, which confirms the deck is still active after the cleanup.

The browser output no longer indicates a detached brief experience; instead, the page text continues to describe the lesson as a guided in-product learning surface. The flash-card deck remains embedded in the route and the interaction controls are still exposed in the live UI.

On the live `/library` route, the launch-brief copy now confirms the tighter grouped handoff: the page includes the new sentence about setting the receiving role, confirming source context, and using the flash cards as one compact launch handoff. The extracted content also shows the new `Current launch lane` panel together with the role chips, launch action, and the flash-card deck controls in the same workflow block.

The viewport element list still exposes the interactive launch deck with `Flip card` and `Next card`, confirming that the compacted layout kept the flash-card interaction intact while reducing the amount of fragmented helper content around it.
