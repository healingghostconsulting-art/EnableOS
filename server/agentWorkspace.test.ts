import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Pilot 2 (v3 Agent Workspace) — AppShell kit + the /learner reskin. Source-level
// assertions (the repo has no DOM test runner); data correctness is covered by the
// existing secureLearner / secureCalendar suites.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v3 Agent Workspace — route swap", () => {
  const app = read("client/src/App.tsx");

  it("routes /learner to v3 AgentWorkspaceView via the chrome-less guard, keeping v2 for a one-line revert", () => {
    expect(app).toContain("import { AgentWorkspaceView }");
    expect(app).toContain('<GuardedV3Route path="/learner">');
    expect(app).toContain("<AgentWorkspaceView />");
    // v2 learner surface is retained (RoleWorkspace still imported + the commented revert block).
    expect(app).toContain("RoleWorkspace");
    expect(app).toContain('role="learner"');
    // The v3 guard brings no v2 DashboardLayout chrome (AppShell provides the rail).
    expect(app).toContain("function GuardedV3Route");
  });
});

describe("v3 AppShell kit (reusable, prop-driven)", () => {
  it("ships the shell primitives every role dashboard reuses", () => {
    for (const file of ["AppShell", "SidebarNav", "TopBar", "WidgetCard", "Donut", "BrandLogoWhite"]) {
      expect(() => read(`client/src/components/v3/${file}.tsx`)).not.toThrow();
    }
    const shell = read("client/src/components/v3/AppShell.tsx");
    expect(shell).toContain("export function AppShell");
    expect(shell).toContain("export function DashboardGrid");
    // Prop-driven, not agent-specific.
    expect(read("client/src/components/v3/SidebarNav.tsx")).toContain("items: NavItem[]");
    expect(read("client/src/components/v3/TopBar.tsx")).toContain("export function greetingFor");
  });
});

describe("v3 Agent dashboard — own data only + template widgets + brand rules", () => {
  const view = read("client/src/pages/AgentWorkspaceView.tsx");

  it("wires the learner's OWN data and never team KPIs, with a canonical-learner fallback", () => {
    // Scoped data when authenticated; the public canonical learner otherwise (so the
    // donuts/tiles populate even on an unauthenticated hit, matching the v2 view).
    expect(view).toContain("trpc.demo.secureLearner.useQuery");
    expect(view).toContain("trpc.demo.learner.useQuery");
    expect(view).toContain("secureLearner.data ?? publicLearner.data");
    // Still learner-only — never team KPIs.
    expect(view).not.toContain("secureManager");
    expect(view).not.toContain("secureCoach");
    expect(view).not.toContain("teamLearners");
  });

  it("renders the template widgets with a supportive tone", () => {
    for (const widget of ["My Priorities", "My Performance Snapshot", "My Progress", "Upcoming", "Announcements", "Quick Actions"]) {
      expect(view).toContain(widget);
    }
    expect(view).toContain("great day");
    expect(view).toContain("Thank you for all you do!");
  });

  it("obeys the dual-surface gold rule: gold TEXT on the light dashboard is #7A5200, never #FCBC34", () => {
    expect(view).not.toContain("text-[#FCBC34]");
    expect(view).toContain("text-[#7A5200]");
  });

  it("uses #FCBC34 for gold only on the dark rail (sidebar)", () => {
    expect(read("client/src/components/v3/SidebarNav.tsx")).toContain("text-[#FCBC34]");
    expect(read("client/src/components/v3/BrandLogoWhite.tsx")).toContain("#FCBC34");
  });
});
