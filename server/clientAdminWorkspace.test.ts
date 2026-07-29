import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Pilot 5 (v3 Client Admin Workspace) — Client Control on the shared AppShell. Mirrors
// managerWorkspace.test.ts. Source-level assertions; data correctness is covered by the
// existing secureAdmin / getAdminDashboard suites.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v3 Client Admin Workspace — route swap", () => {
  const app = read("client/src/App.tsx");

  it("routes /admin to v3 ClientAdminWorkspaceView via the chrome-less guard, keeping v2 for a one-line revert", () => {
    expect(app).toContain("import { ClientAdminWorkspaceView }");
    expect(app).toContain('<GuardedV3Route path="/admin">');
    expect(app).toContain("<ClientAdminWorkspaceView />");
    expect(app).toContain("RoleWorkspace");
    expect(app).toContain('role="client_admin"'); // v2 block retained (commented) for revert
  });
});

describe("v3 Client Admin Workspace — reuses the AppShell kit (no rebuild)", () => {
  const view = read("client/src/pages/ClientAdminWorkspaceView.tsx");

  it("imports the shared v3 primitives rather than redefining them", () => {
    expect(view).toContain('from "@/components/v3/AppShell"');
    expect(view).toContain('from "@/components/v3/WidgetCard"');
    expect(view).toContain('from "@/components/v3/Donut"');
    expect(view).toContain('from "@/components/v3/TopBar"');
    expect(view).not.toContain("export function AppShell");
    expect(view).not.toContain("export function SidebarNav");
  });
});

describe("v3 Client Admin dashboard — org/config data + fallback + widgets + brand rule", () => {
  const view = read("client/src/pages/ClientAdminWorkspaceView.tsx");

  it("wires the admin's data with a canonical-admin fallback (populates unauthenticated)", () => {
    expect(view).toContain("trpc.demo.secureAdmin.useQuery");
    expect(view).toContain("trpc.demo.admin.useQuery");
    expect(view).toContain("secureAdmin.data ?? (demoMode ? publicAdmin.data : undefined)");
  });

  it("shows org/config data — not agent performance", () => {
    expect(view).toContain("tenantUsers");
    expect(view).toContain("configuration");
    expect(view).toContain("permittedWorkspaces"); // real access matrix
    // Admin does not surface agent-performance KPIs.
    expect(view).not.toContain("readinessScore");
    expect(view).not.toContain("orgRoster");
  });

  it("renders the admin/config widgets", () => {
    for (const widget of ["Org Overview", "Brand & Settings", "Workspace Access", "User Management", "Recent Admin Activity", "Quick Actions"]) {
      expect(view).toContain(widget);
    }
    for (const action of ["Add User", "Manage Roles", "Brand Settings", "Export"]) expect(view).toContain(action);
  });

  it("obeys the dual-surface gold rule: gold TEXT on the light dashboard is #7A5200, never #FCBC34", () => {
    expect(view).not.toContain("text-[#FCBC34]");
    expect(view).toContain("text-[#7A5200]");
  });
});
