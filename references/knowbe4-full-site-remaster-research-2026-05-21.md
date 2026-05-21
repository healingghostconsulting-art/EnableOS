# KnowBe4 Full-Site Remaster Research Notes

## Round 1: Official product and learner-experience findings

### Sources reviewed

1. https://www.knowbe4.com/products/security-awareness-training/features
2. https://support.knowbe4.com/hc/en-us/articles/360014116634-Learner-Experience-LX-Guide

### Key product and UX patterns observed

KnowBe4 positions the platform as a unified training and risk environment rather than a disconnected set of pages. The official feature page emphasizes one platform for learner experience, configurable branding, gamification, leaderboards, badges, risk scoring, analytics, and administrative automation. The repeated pattern is that users should move through one coherent system where training, measurement, and follow-up all feel connected.

The learner guide confirms several concrete interface patterns that are relevant to CHCG EnableOS. Training assignments are intentionally surfaced at the top of the learner list, completed items fall lower in the queue, and optional learning is separated into a distinct library experience instead of cluttering the main required-training flow. The product also uses a lightweight guided tour, top-right profile navigation, localization controls, learner dashboards, team dashboards, a message center, and contextual help instead of exposing every support or configuration surface at once.

### Implications for the CHCG remaster

The CHCG site should be remastered around a stronger platform shell and clearer progressive disclosure. The most important work should appear first, optional browsing should move into dedicated secondary surfaces, and role-specific dashboards should feel like extensions of one operating system rather than visually separate microsites.

The training side should continue moving toward a queue-first learner workspace with clearer priority ordering, lighter chrome, and fewer stacked explanatory regions. The broader site should adopt the same pattern: concise mission framing, one dominant action path, optional content in tabs or drawers, and reusable summary cards for progress, readiness, and next action.

## Round 2: Admin-console and campaign-orchestration findings

### Additional sources reviewed

3. https://support.knowbe4.com/hc/en-us/articles/204948207-Training-Campaigns-Guide
4. https://support.knowbe4.com/hc/en-us/articles/115011714508-Get-Started-with-the-KnowBe4-Console

### Key admin and operations patterns observed

KnowBe4’s admin model is strongly campaign-oriented. The Training tab acts as an operations hub where admins can create campaigns, edit notification templates, prepare policy acknowledgments, and view training reports. Campaign creation is structured around a small required core, then a larger set of optional controls such as due dates, sequential completion, surveys, score tracking, group enrollment, auto-enrollment of new users, refreshers, and notifications.

The setup guide also reveals a very clear rollout sequence: first make delivery reliable, then import users and groups, then apply branding and business settings, then add security controls such as MFA, and then customize the downstream learner-facing landing pages. This shows that KnowBe4’s console is organized around operational readiness and guided setup rather than presenting every administration surface as equal.

### Implications for the CHCG remaster

The CHCG admin, manager, and content workspaces should be remastered around clearer setup and orchestration flows. Primary actions should look campaign-driven and outcome-driven, not page-driven. Grouping, assignment, notification, branding, and reporting should feel like steps in one operating model, with the most common action surfaced first and configuration depth moved behind expandable sections, drawers, or secondary tabs.

The wider platform shell should also communicate readiness in the same way KnowBe4 does: concise headline, clear first step, grouped settings, and stronger distinction between required workflow and optional enrichment.

## Round 3: Current CHCG site audit against KnowBe4 patterns

### Live CHCG surfaces reviewed

5. Mission Hub (`/`)
6. Client Control (`/admin`)

### Audit observations

The Mission Hub is already moving in the right direction. It now surfaces search, resume, preview, queue rows, and workspace launchers above the fold, which is closer to KnowBe4’s emphasis on immediate action and compact prioritization. However, the shell language and dashboard structure are still more editorial and concept-heavy than KnowBe4’s simpler operational framing. It still feels like a demo showcase in places instead of a production operations console.

The Client Control workspace also has the right strategic idea of mode-based navigation, but the current visual treatment is still too dense and decorative for a day-to-day admin console. The hero panel and large visual card consume too much attention relative to the actual actions. KnowBe4’s admin experience suggests a more restrained control-plane pattern where setup, assignment, governance, and reporting are clearer first-class tasks, and supporting narrative is reduced.

### Sitewide remaster direction emerging from the audit

The remaster should simplify the platform shell, reduce decorative storytelling cards, standardize a tighter control-plane header, and make every workspace feel more like part of a single operations suite. The Mission Hub should become the default launch console for training and workspace entry. Admin and manager views should become more task-forward, with setup actions, assignment flows, reports, and governance grouped into compact operational modules instead of highly stylized hero-driven scenes.

## Round 4: Sitewide remaster blueprint

### Highest-impact implementation targets

The first sitewide change should happen in the shared dashboard shell. The current DashboardLayout already supports a compact workspace header, but it still carries too much narrative chrome in several routes. The remaster should shift the entire shell toward a quieter operations-console treatment: shorter headlines, fewer decorative KPI pills, less emphasis on momentum language, and tighter top spacing so the workspace content becomes the primary focus.

The second change should happen in the shared section framing used by the role workspaces. The SectionShell and the reusable card language should move away from showcase-style hero treatment and toward a more restrained control-plane hierarchy. That means shorter descriptions, clearer primary actions, flatter surfaces, denser tab controls, and stronger visual consistency between executive, manager, coach, learner, training, library, and admin modes.

The third change should target the Mission Hub and the role-launch ecosystem. The mission queue, workspace launchers, and track cards should behave more like a functional home console: denser rows, more uniform card heights, clearer state labels, and stronger alignment between search results, launch actions, and role-specific entry points.

The fourth change should target the heavier role panels, especially the admin and reporting-oriented surfaces. Large decorative hero cards should be replaced or reduced in favor of operational summaries, setup checklists, assignment actions, evidence views, and decision-oriented grids. This follows the campaign and setup logic observed in KnowBe4, where the console emphasizes readiness, user management, assignment, notifications, and reporting over visual storytelling.

### Concrete implementation order

Implementation should begin with shared primitives and layout, then the Mission Hub, then the main role workspaces with the highest admin and reporting visibility, and finally any residual pages whose styling still feels like a demo rather than a daily-use console. This order should maximize visual consistency and minimize one-off fixes.

## Round 5: Post-implementation visual verification

The Mission Hub now reads much closer to a software console than a showcase hero. The header is quieter, the metrics are flatter and denser, and the queue plus workspace launchers now dominate the first screen in a more KnowBe4-like way.

The Client Control workspace is directionally improved at the copy and hierarchy level, but the current visual rendering still shows a layout problem in the dark admin summary card: the operating-queue text and action cards are visually colliding instead of reading as clean separate blocks. Before final delivery, that top admin surface should be tightened so the summary content and action cards do not overlap.

The follow-up admin pass resolved the visible collision in the client-admin hero region. The top control surface now reads as a stacked operating queue with separate summary, metric, and action sections instead of overlapping layers.

Validation status after the correction: the full Vitest suite passed again with 20 test files and 140 tests green, including the updated EnableOS layout regression coverage.
