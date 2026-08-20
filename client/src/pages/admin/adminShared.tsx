import { type ReactNode } from "react";
import { type GrantRole, type WorkspacePath, WORKSPACE_ORDER } from "@shared/workspaceAccess";

// Shared building blocks for the Client Admin management sub-views (Users, Roles &
// Access, Branding). These render inside the Client Admin AppShell's content area.

// The tenant-editable roles shown in the admin surfaces. platform_admin is intentionally
// excluded — it is CHCG's own role, not a tenant seat. Single display list, reused across
// the roster, the invite modal, and the access matrix.
export const ADMIN_ROLES: ReadonlyArray<{ role: GrantRole; label: string }> = [
  { role: "executive", label: "Executive" },
  { role: "manager", label: "Manager" },
  { role: "coach", label: "Coach" },
  { role: "learner", label: "Agent" },
  { role: "client_admin", label: "Client Admin" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ADMIN_ROLES.map((r) => [r.role, r.label]));

/** Human label for a role value, with a graceful fallback for unknown values. */
export function roleLabelOf(role: string): string {
  return ROLE_LABEL[role] ?? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Short column/chip labels for workspaces in the access matrix + derived-access lists.
// Display-only — access itself always derives from permittedWorkspaces() (single source).
export const WORKSPACE_LABEL: Record<WorkspacePath, string> = {
  "/mission-hub": "Mission Hub",
  "/guide": "Guide",
  "/calendar": "Calendar",
  "/reporting": "Reporting",
  "/manager": "Manager",
  "/coach": "Coach",
  "/learner": "Agent",
  "/training": "Training",
  "/library": "Library",
  "/admin": "Client Control",
  "/chcg-admin": "CHCG Command",
};

/** All workspace columns for the access matrix, in canonical sidebar order. */
export const ALL_WORKSPACES: readonly WorkspacePath[] = WORKSPACE_ORDER;

// Deterministic "last active" label. The demo seed carries no activity timestamp, so we
// derive a stable bucket from the user id — same value every render/reload, no fabricated
// churn. Purely presentational.
const LAST_ACTIVE_BUCKETS = ["Just now", "2 hours ago", "Today", "Yesterday", "2 days ago", "4 days ago", "Last week"];
export function derivedLastActive(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return LAST_ACTIVE_BUCKETS[h % LAST_ACTIVE_BUCKETS.length];
}

/** Consistent header for a management sub-view: eyebrow, title, gold rule, description. */
export function AdminScreenHeader({ eyebrow = "Client Control", title, description, actions }: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4A6373]">{eyebrow}</p>
        <h1 className="mt-1 text-[1.35rem] font-bold tracking-tight text-[#1B303C]">{title}</h1>
        <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
        {description ? <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-[#4A6373]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** A bordered content panel used by the management sub-views. */
export function AdminPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#1B303C]/8 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${className}`}>
      {children}
    </section>
  );
}
