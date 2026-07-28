import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// v3 consistency wrap — the remaining surfaces (Reporting, Library, Training player,
// Mission Hub, Guide) render inside the v3 AppShell chrome via V3ShellWrapper, keeping
// their existing inner components. Source-level assertions.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v3 consistency wrap — surfaces wrapped in the AppShell chrome", () => {
  const app = read("client/src/App.tsx");

  it("imports the shared wrapper", () => {
    expect(app).toContain("import { V3ShellWrapper }");
  });

  it("wraps every listed surface in V3ShellWrapper (inner components unchanged), keeping v2 for revert", () => {
    const surfaces: Array<[string, string]> = [
      ["/reporting", "ReportingWorkspaceView"],
      ["/library", "ContentLibraryView"],
      ["/training", "TrainingExperienceView"],
      ["/mission-hub", "MissionHubView"],
      ["/guide", "GuideView"],
    ];
    for (const [path, view] of surfaces) {
      expect(app).toContain(`<V3ShellWrapper path="${path}"><${view} /></V3ShellWrapper>`);
      expect(app).toContain(`<GuardedV3Route path="${path}">`);
      // v2 chrome retained as a commented revert block.
      expect(app).toContain(`/* v2: <GuardedWorkspaceShell path="${path}"`);
    }
  });
});

describe("V3ShellWrapper — reuses AppShell + the real access-matrix nav", () => {
  const wrapper = read("client/src/components/v3/V3ShellWrapper.tsx");

  it("renders through the shared AppShell and derives nav from permittedWorkspaces", () => {
    expect(wrapper).toContain('from "./AppShell"');
    expect(wrapper).toContain("permittedWorkspaces(role)");
    expect(wrapper).toContain("normalizeGrantRole");
    // Safety net: keeps the reminder-badge context available to inner views.
    expect(wrapper).toContain("ReminderBadgeProvider");
    // Chrome-only — it does not redefine shell primitives.
    expect(wrapper).not.toContain("export function AppShell");
    expect(wrapper).not.toContain("export function SidebarNav");
  });
});
