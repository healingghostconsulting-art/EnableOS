# Desktop formatting audit notes

## Initial browser findings

The direct `/content` URL currently returns a 404, so the content workspace appears to be entered through the main in-app navigation rather than a standalone route.

The homepage already shows a broader typography problem on desktop: the hero heading is readable, but secondary copy, sign-in context text, and workspace action buttons feel compressed relative to the amount of horizontal space available. The overall visual system is carrying too many micro-labels and compact utility sizes for a desktop-first experience.

The user-provided screenshot of the content mission view suggests the worst density is occurring in track-selection rows, asset metadata cards, filter chips, and smaller explanatory labels. The likely root cause is an overuse of extra-small text styles, tight tracking, and compact card padding in shared page sections.

## Cross-page browser findings

The content library confirms the user's concern. The page is readable in structure, but the desktop presentation uses too many compact labels, chips, and metadata blocks inside dense cards. Track tiles, role chips, source labels, and selected-asset metadata are all undersized relative to the available monitor width, which makes the page feel cramped instead of presentation-ready.

The manager workspace shows the same pattern in a different form. The top summary cards rely on very small labels and supporting copy, while side-panel descriptions and action copy feel compressed even though the page has generous horizontal space. The issue appears to be systemic rather than isolated to one page.

The most likely shared fixes are a stronger desktop typography scale, more generous line-height, larger small-copy classes for desktop sections, wider card padding, and better use of multi-column layouts so supporting text does not stack into narrow cramped blocks.

## Post-cleanup browser validation

The content library now reads much better on desktop. The page title, summary paragraph, track cards, and selected-asset handoff panel use a more appropriate visual scale for presentation screens, and the denser metadata rows no longer feel as compressed as they did during the initial audit.

The manager workspace also benefited from the shared updates. The page heading, summary cards, sidebar shell, and key supporting copy have more visual presence and cleaner spacing, which makes the page easier to scan from a distance.

There is still room for a later polish pass on extremely dense workflow cards deeper in some pages, but the main readability issue the user flagged is materially reduced across the shared shell and the most visible role pages.
