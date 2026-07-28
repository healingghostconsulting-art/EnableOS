import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Pilot 3 (v3 Coach Workspace) — Coach Studio on the shared AppShell. Mirrors
// agentWorkspace.test.ts. Source-level assertions; data correctness is covered by the
// existing secureCoach / getCoachDashboard suites.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v3 Coach Workspace — route swap", () => {
  const app = read("client/src/App.tsx");

  it("routes /coach to v3 CoachWorkspaceView via the chrome-less guard, keeping v2 for a one-line revert", () => {
    expect(app).toContain("import { CoachWorkspaceView }");
    expect(app).toContain('<GuardedV3Route path="/coach">');
    expect(app).toContain("<CoachWorkspaceView />");
    expect(app).toContain("RoleWorkspace"); // v2 kept in the repo/imports
    expect(app).toContain('role="coach"'); // v2 block retained (commented) for revert
  });
});

describe("v3 Coach Workspace — reuses the AppShell kit (no rebuild)", () => {
  const view = read("client/src/pages/CoachWorkspaceView.tsx");

  it("imports the shared v3 primitives rather than redefining them", () => {
    expect(view).toContain('from "@/components/v3/AppShell"');
    expect(view).toContain('from "@/components/v3/WidgetCard"');
    expect(view).toContain('from "@/components/v3/Donut"');
    expect(view).toContain('from "@/components/v3/TopBar"'); // greetingFor
    // It does not re-declare shell primitives.
    expect(view).not.toContain("export function AppShell");
    expect(view).not.toContain("export function SidebarNav");
  });
});

describe("v3 Coach dashboard — team data + fallback + widgets + brand rule", () => {
  const view = read("client/src/pages/CoachWorkspaceView.tsx");

  it("wires the coach's data with a canonical-coach fallback (populates unauthenticated)", () => {
    expect(view).toContain("trpc.demo.secureCoach.useQuery");
    expect(view).toContain("trpc.demo.coach.useQuery");
    expect(view).toContain("secureCoach.data ?? publicCoach.data");
  });

  it("shows TEAM-level coaching data (correct for the coach role)", () => {
    expect(view).toContain("teamLearners");
    expect(view).toContain("teamCoachingSessions");
  });

  it("renders the coaching widgets", () => {
    for (const widget of ["Team Coaching Pipeline", "Team Readiness", "My Coachees", "Upcoming Sessions", "Recent Activity", "Quick Actions"]) {
      expect(view).toContain(widget);
    }
    for (const action of ["Schedule Session", "Log a Session", "View Calendar"]) expect(view).toContain(action);
  });

  it("obeys the dual-surface gold rule: gold TEXT on the light dashboard is #7A5200, never #FCBC34", () => {
    expect(view).not.toContain("text-[#FCBC34]");
    expect(view).toContain("text-[#7A5200]");
  });
});
