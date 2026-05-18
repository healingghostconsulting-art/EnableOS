# CHCG EnableOS UI Redesign Blueprint

## Execution Objective

This blueprint turns the approved redesign proposal into an implementation system for the product. The central objective is to replace long-scroll, stacked workspace pages with a **guided mission-control interface** that gives each user a clear command view, focused work modes, and detail on demand. The redesign must also introduce a premium motion and motivation layer that uses celebratory cues, trophies, and guide moments to reinforce progress without overwhelming the product.

## Shared Product Architecture

The redesign should apply a common three-layer interaction model to every major workspace.

| Layer | Primary purpose | Required interface pattern | Outcome |
| --- | --- | --- | --- |
| **Command layer** | Tell the user what matters now | Sticky hero band, top priority narrative, 3–5 compact summary cards, single primary CTA | Reduces hunting and orientation time |
| **Focus layer** | Let the user complete work in context | Segmented controls, tab groups, split panes, compact queues, card carousels | Replaces long vertical stacks with intentional flows |
| **Detail layer** | Reveal supporting evidence only when needed | Drawers, modals, pop-up boxes, chart drill-downs, side rails | Preserves depth without bloating the page |

This architecture should be visible in every section so the product feels like one system instead of separate pages built with different rules.

## Global UI System to Build

The current shell already has a branded sidebar, summary language, and reward cues, but the redesign needs a stronger shared system. The implementation should create these reusable primitives first.

| Shared primitive | What it should do | Where it applies |
| --- | --- | --- |
| **Mission hero band** | Summarize role, current focus, movement since last visit, and the next best action | All primary workspaces |
| **Priority rail** | Surface the one risk, one win, and one recommended action in a compact persistent zone | Mission Hub, Reporting, Manager, Coach, Learner |
| **Segmented work modes** | Switch between Overview, Actions, Evidence, History, and Settings without extra scrolling | All sections with dense content |
| **Split-view inspector** | Pair a list or queue with a selected detail pane | Reporting, Manager Ops, Content Missions, Client Control |
| **Guided modal and drawer system** | Move forms and details off the main page surface | Coaching logs, evidence review, intervention editing, reporting drill-downs |
| **Celebration and reward surfaces** | Show trophy moments, completion ribbons, confidence boosts, and tasteful celebration states | Learner Journey, Training Zone, Manager completions, Reporting wins |
| **Motion tokens** | Standardize hover, tab switch, reveal, KPI pulse, and completion animations | Product-wide |

## Motion and Motivation System

The redesign should treat motion as a navigation and feedback system, not decoration. It should feel polished and enterprise-appropriate.

| Motion category | Recommended behavior | Constraint |
| --- | --- | --- |
| **Micro-interactions** | Soft lift on hover, subtle KPI pulse, animated selection and focus states | Must remain short and low-amplitude |
| **Transitions** | Smooth segmented-view transitions, drawer entrances, tab content fades, split-pane updates | Must help orientation rather than distract |
| **Guide moments** | Minimal mascot or character hints that introduce next steps or explain state | Must be contextual and removable |
| **Reward moments** | Trophies, balloons, confetti, or badge shimmer for completions and milestone movement | Must appear only after meaningful actions |
| **Progress animations** | Animated readiness bars, streak movement, completion fills, and journey state transitions | Must represent real data or state changes |

The visual direction should remain premium, with glass, metallic, or soft luminous treatments rather than cartoon-heavy execution.

## Highest-Impact Surfaces to Redesign First

The application shell and the most scroll-heavy workspaces should move first because they will establish the system for all remaining views.

| Priority order | Surface | Current pain point | Redesign target |
| --- | --- | --- | --- |
| **1** | Global shell | Navigation is attractive but still leads into tall pages | Add sticky command band support, stronger context framing, and adaptive right-rail patterns |
| **2** | Mission Hub | Broad overview can still feel informational rather than guided | Convert into a compact command center with urgent lane, momentum snapshot, and quick jumps |
| **3** | Reporting Hub | Dense analytics risk becoming a report dump | Convert into a story-driven analytics studio with filters, chart toggles, drill-down drawers, and proof narratives |
| **4** | Manager Ops | Signals, coaching, and interventions still accumulate vertically | Convert into case-management split view with pop-up actions and collapsible evidence |
| **5** | Coach Studio | Documentation and guidance can become text-heavy | Use timeline plus evidence rail and focused composer patterns |
| **6** | Learner Journey | Progress and next steps need stronger motivation | Build a guided path with reward states, unlock moments, and fewer simultaneous choices |
| **7** | Training Zone | Training still risks feeling content-long | Shift toward cinematic progression with checkpoint framing and celebratory completions |
| **8** | Client Control / Content Missions | Administrative and library views can sprawl | Move to step-based and search-first flows with drawers |

## Current Code Surfaces That Drive the Redesign

The current implementation concentrates the redesign work into a small number of high-leverage files.

| File | Why it matters | Anticipated redesign role |
| --- | --- | --- |
| `client/src/App.tsx` | Defines workspace routes, role-based menus, and top-level shell usage | Update navigation labels, route framing, and any new shared workspace entry behavior |
| `client/src/components/DashboardLayout.tsx` | Controls the global sidebar shell, header framing, and main content container | Establish mission-control shell, sticky hero support, and shared guided context behavior |
| `client/src/index.css` | Centralizes theme tokens and reusable surface styling | Add motion tokens, reward treatments, new shell surfaces, and global spacing rules |
| `client/src/pages/EnableOSViews.tsx` | Contains the core workspace views and reusable panels | Refactor tall sections into segmented, split-view, modal-driven experiences |
| `server/*.test.ts` | Contains regression coverage for navigation, layout copy, and reporting contracts | Expand tests to cover new shell language, navigation patterns, and guided workspace affordances |

## Section-Specific Redesign Rules

| Workspace | New default above-the-fold experience | Details that should move off the page |
| --- | --- | --- |
| **Mission Hub** | Priority narrative, urgent action lane, recent wins, role-aware CTA | Secondary summaries and historical details into drawers or tabs |
| **Reporting Hub** | KPI narrative, timeframe filters, proof headline, interactive trend charts | Full benchmark detail, question-level evidence, and behavior clusters into drawers |
| **Manager Ops** | Selected learner case, active risk, next intervention, coaching launcher | Historical logs, full signal history, and documentation detail into inspectors |
| **Coach Studio** | Coaching queue, current learner focus, session prompts, progress indicator | Long notes, audit trails, and evidence references into tabs or side rails |
| **Learner Journey** | Next mission, readiness movement, unlocks, reward state, single primary CTA | Archive history and optional detail into expandable panels |
| **Training Zone** | Current lesson stage, progress line, checkpoint indicator, mascot encouragement | Supplementary resource blocks into drawers or collapsible panels |
| **Client Control** | Step completion board, urgent config item, status health | Deep settings and secondary forms into drawers |
| **Content Missions** | Search, filters, featured content, recent assignments | Detailed asset metadata and previews into drawers |

## Rollout Recommendation

The best implementation path is to build the shell and interaction system first, then redesign the most decision-heavy sections before the remaining sections inherit the same language.

| Implementation phase | Scope |
| --- | --- |
| **Phase A** | Global shell, motion tokens, mission hero band, segmented work mode primitives, drawer/modal consistency |
| **Phase B** | Mission Hub, Reporting Hub, Manager Ops |
| **Phase C** | Coach Studio, Learner Journey |
| **Phase D** | Training Zone, Client Control, Content Missions |
| **Phase E** | Regression coverage, live UX verification, checkpointing, and copy polish |

## Immediate Build Direction

The next implementation step should be to start **Phase A** by upgrading the shared layout shell and design tokens, then refactoring the highest-impact workspaces to consume the new mission-control patterns instead of rendering long vertical stacks. This will create the base system required to make the rest of the redesign consistent, faster to build, and easier to validate.
