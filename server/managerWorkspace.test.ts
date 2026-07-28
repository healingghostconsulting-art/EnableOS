import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Pilot 4 (v3 Manager Workspace) — the operational manager dashboard on the shared
// AppShell. Mirrors coachWorkspace.test.ts. Source-level assertions; data correctness
// is covered by the existing secureManager / getManagerDashboard suites.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v3 Manager Workspace — route swap", () => {
  const app = read("client/src/App.tsx");

  it("routes /manager to v3 ManagerWorkspaceView via the chrome-less guard, keeping v2 for a one-line revert", () => {
    expect(app).toContain("import { ManagerWorkspaceView }");
    expect(app).toContain('<GuardedV3Route path="/manager">');
    expect(app).toContain("<ManagerWorkspaceView />");
    expect(app).toContain("RoleWorkspace"); // v2 kept in the repo/imports
    expect(app).toContain('role="manager"'); // v2 block retained (commented) for revert
  });
});

describe("v3 Manager Workspace — reuses the AppShell kit (no rebuild)", () => {
  const view = read("client/src/pages/ManagerWorkspaceView.tsx");

  it("imports the shared v3 primitives rather than redefining them", () => {
    expect(view).toContain('from "@/components/v3/AppShell"');
    expect(view).toContain('from "@/components/v3/WidgetCard"');
    expect(view).toContain('from "@/components/v3/Donut"');
    expect(view).toContain('from "@/components/v3/TopBar"'); // greetingFor
    expect(view).not.toContain("export function AppShell");
    expect(view).not.toContain("export function SidebarNav");
  });
});

describe("v3 Manager dashboard — team/operational data + fallback + widgets + brand rule", () => {
  const view = read("client/src/pages/ManagerWorkspaceView.tsx");

  it("wires the manager's data with a canonical-manager fallback (populates unauthenticated)", () => {
    expect(view).toContain("trpc.demo.secureManager.useQuery");
    expect(view).toContain("trpc.demo.manager.useQuery");
    expect(view).toContain("secureManager.data ?? publicManager.data");
  });

  it("shows full-team operational data (broadest scope)", () => {
    expect(view).toContain("orgRoster"); // the whole team roster
    expect(view).toContain("coachingSessions");
    expect(view).toContain("openSignals"); // at-risk alerts
  });

  it("renders the operational widgets", () => {
    for (const widget of [
      "Operational Snapshot", "Team Overview", "Operational Readiness", "Upcoming",
      "Team Activity", "Recommended Actions", "Alerts", "Quick Actions",
    ]) {
      expect(view).toContain(widget);
    }
    expect(view).toContain("AI Insight");
    for (const action of ["Start Coaching", "Assign Training", "Create Goal", "View Team", "Run Report"]) expect(view).toContain(action);
  });

  it("obeys the dual-surface gold rule: gold TEXT on the light dashboard is #7A5200, never #FCBC34", () => {
    // #FCBC34 appears only as decorative fills (KPI badges, the gold underline, the AI
    // sparkle on the dark chip) — never as a text color on the light dashboard.
    expect(view).not.toContain("text-[#FCBC34]");
    expect(view).toContain("text-[#7A5200]");
  });
});
