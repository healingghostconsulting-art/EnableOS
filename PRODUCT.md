# PRODUCT.md — EnableOS (CHCG)

Durable product truth for Impeccable's design context. This records what the product *is* and *does* (users, jobs, positioning, constraints); it is not a visual spec. The visual system is documented separately in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Platform

`web` — a React 19 single-page app (Vite, Tailwind v4, wouter routing). Not native; no mobile wrapper.

## What it is

EnableOS is CHCG's **white-label enablement and coaching-intelligence platform**. It is a multi-tenant, role-scoped web app that runs a client organization's frontline workforce (contact-center / service teams) through training, coaching, readiness measurement, and governance from one branded control plane. It is an **app UI / dashboard product** — every surface is a working workspace, not marketing.

## Primary users and jobs

Each role opens a dedicated, tenant-scoped workspace:

- **Learner** — completes assigned training and targeted retraining, reviews coaching follow-ups, and tracks journey progress.
- **Coach / supervisor** — selects a learner, runs and documents weekly one-on-ones, records evidence, and assigns targeted retraining (Coach Studio is the canonical workspace).
- **Manager** — tracks interventions, coaching cadence, and team readiness across direct reports.
- **Executive** — reads ROI / readiness reporting, risk queues, and the decision queue (Reporting Hub).
- **Client admin (tenant)** — manages white-label branding, tenant-scoped roles, content authoring, and governance evidence (Client Control).
- **Platform admin (CHCG)** — governs client workspaces, licenses training journeys and library assets, and sets CHCG-wide operating policy (CHCG Command).

Shared surfaces (Mission Hub, EnableOS Guide, Training Zone player, Training Library) support several roles without changing the active role.

## Meaningfully different mechanism

- **Role-scoped multi-tenancy**: one authoritative role→workspace access matrix drives both the nav and the route guard; the `?role=` param scopes persona previews without granting access.
- **Evidence-driven coaching loop**: readiness/QA signals and knowledge-check pass rates produce reminders and targeted retraining that flow between learner, coach, and manager, with documentation captured as governance evidence.
- **White-label per tenant**: branding (label, accent, logo mark) is tenant-scoped; CHCG core content and tenant uploads stay visibly distinct while feeding the same workflows.
- **Notification delivery**: event-triggered + digest email/calendar delivery, provider-abstracted and stubbed-by-default (nothing sends without credentials).

## Durable constraints, assets, and facts to preserve

- **Brand**: CHCG navy `#1B303C`, gold `#FCBC34`, lighter blue `#4A6373`, black, white. Logos in `client/public/brand/` (white logo on dark, navy on light — never recolor/stretch). Typography: **Montserrat** (brand font — intentionally chosen over generic AI-default faces).
- **Design standard**: the "Coach Studio" standard — a short-name header, a dark gold-labelled stat bar, a modes row, and the shared `WorkspaceShell` / `ActionCard` / info-tile component family. AA contrast is a hard rule (per-surface: dark surfaces use lighter labels, light surfaces darker).
- **Ownership boundary**: the `/training` player (`TrainingExperienceView`) is owned by this repo (Claude Code); Manus owns backend/coaching/manager/other non-training areas. Both must reconcile via `origin/main`.
- **Data**: the app is demo-data-driven today (seeded tenants, users, coaching records) behind tRPC; no real PII.

## v3 direction (target IA)

v3 moves to a **left-nav, dashboard-first shell**. The design tokens and component family in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) carry across unchanged; only the information architecture (persistent left navigation, dashboard landing) changes. New v3 UI is what Impeccable should hold to the design bar; the current v2 monolith (`client/src/pages/EnableOSViews.tsx`) and `ContentAuthoringPanel.tsx` are ignored in `.impeccable/config.json` to avoid churning legacy surfaces.

---

*Facts above are derived from repository evidence and the owner's brief ("app UI / dashboard product"). Update this file as product truth is confirmed or changes; do not reopen settled fields without reason.*
