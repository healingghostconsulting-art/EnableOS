# Flash-card jump-strip validation notes

The live `/training` route now exposes the new inline card-index jump strip inside the lesson flash-card deck. The page content includes the helper copy `Use the inline index strip for faster deck navigation.` and the viewport exposes card buttons from `CARD 1` through `CARD 16`, confirming that long lesson decks now have direct-access navigation instead of step-only next/previous controls.

The live `/library` route also exposes the same shared jump strip inside the launch-brief deck. The extracted content shows the `Jump to card` label, the same helper copy, and card buttons from `Card 1` through `Card 4`, confirming that the shared flash-card component now provides consistent inline index navigation across both Training Zone and Content Missions.
