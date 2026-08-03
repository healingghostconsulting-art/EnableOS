import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canGrantAccessWorkspace, WORKSPACE_SUBROUTE_PARENT, WORKSPACE_ACCESS } from "../shared/workspaceAccess";

// Coach "My Team" (/coachees) — a v3 sub-surface of the coach workspace. Source-level
// assertions; data-sourcing correctness rides on the secureCoach suite the dashboard
// shares.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("Coach My Team — route + access", () => {
  const app = read("client/src/App.tsx");

  it("routes /coachees to CoachTeamView behind the chrome-less v3 guard", () => {
    expect(app).toContain("import { CoachTeamView }");
    expect(app).toContain('<GuardedV3Route path="/coachees">');
    expect(app).toContain("<CoachTeamView />");
  });

  it("gates /coachees exactly like /coach via the sub-route→parent map, without joining the nav matrix", () => {
    expect(WORKSPACE_SUBROUTE_PARENT["/coachees"]).toBe("/coach");
    for (const role of ["coach", "manager", "client_admin", "platform_admin"] as const) {
      expect(canGrantAccessWorkspace(role, "/coachees")).toBe(canGrantAccessWorkspace(role, "/coach"));
    }
    // Coach-only, like /coach: a learner cannot reach it.
    expect(canGrantAccessWorkspace("learner", "/coachees")).toBe(false);
    for (const role of Object.keys(WORKSPACE_ACCESS) as Array<keyof typeof WORKSPACE_ACCESS>) {
      expect((WORKSPACE_ACCESS[role] as readonly string[]).includes("/coachees")).toBe(false);
    }
  });
});

describe("Coach My Team — view + rail wiring", () => {
  const view = read("client/src/pages/CoachTeamView.tsx");
  const dash = read("client/src/pages/CoachWorkspaceView.tsx");

  it("renders the roster on the v3 AppShell per spec", () => {
    expect(view).toContain("import { AppShell }");
    for (const bit of ["Coachee roster", "Last session", "lastSessionFor", "aria-expanded", "Readiness"]) {
      expect(view).toContain(bit);
    }
    // Deep-link receiver + a stable id so inbound #anchors land.
    expect(view).toContain("useDeepLinkTarget()");
    expect(view).toContain('id="coach-coachees"');
  });

  it("feeds from the coach team data with the demo fallback", () => {
    expect(view).toContain("trpc.demo.secureCoach.useQuery");
    expect(view).toContain("secureCoach.data ?? (demoMode ? publicCoach.data : undefined)");
    expect(view).toContain("data?.teamLearners");
  });

  it("renames the coach rail item to My Team and repoints it to /coachees", () => {
    expect(dash).toContain('label: "My Team", icon: Users2, href: "/coachees"');
    expect(dash).not.toContain('href: "/coach#coach-coachees"');
    // Dashboard widget "View All" now targets the real page, not a placeholder.
    expect(dash).toContain('<ViewLink href="/coachees">View All</ViewLink>');
  });

  it("follows the dual-surface gold rule (gold-ink on light, never text gold)", () => {
    expect(view).not.toContain("text-[#FCBC34]");
    expect(view).toContain("text-[#7A5200]");
  });
});
