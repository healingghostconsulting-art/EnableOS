import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canGrantAccessWorkspace, WORKSPACE_SUBROUTE_PARENT, WORKSPACE_ACCESS } from "../shared/workspaceAccess";
import type { ReminderType } from "../shared/reminders";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("Settings — route + access", () => {
  const app = read("client/src/App.tsx");

  it("routes /settings to SettingsView inside the shipped v3 chrome", () => {
    expect(app).toContain("import { SettingsView }");
    expect(app).toContain('<GuardedV3Route path="/settings">');
    expect(app).toContain("<SettingsView />");
    expect(app).toContain('<V3ShellWrapper path="/settings">');
  });

  it("gates /settings like /guide, so any authenticated role can open it", () => {
    expect(WORKSPACE_SUBROUTE_PARENT["/settings"]).toBe("/guide");
    for (const role of Object.keys(WORKSPACE_ACCESS) as Array<keyof typeof WORKSPACE_ACCESS>) {
      expect(canGrantAccessWorkspace(role, "/settings")).toBe(true);
    }
    // Not part of the matrix-built sidebars.
    for (const role of Object.keys(WORKSPACE_ACCESS) as Array<keyof typeof WORKSPACE_ACCESS>) {
      expect((WORKSPACE_ACCESS[role] as readonly string[]).includes("/settings")).toBe(false);
    }
  });
});

describe("Settings — page contents", () => {
  const view = read("client/src/pages/SettingsView.tsx");

  it("renders the four sections with stable ids", () => {
    for (const id of ["profile", "accessibility", "notifications", "account"]) {
      expect(view).toContain(`id="${id}"`);
    }
  });

  it("binds grayscale to the shipped context and persists the other display prefs", () => {
    expect(view).toContain("useGrayscale");
    expect(view).not.toContain("GrayscaleProvider"); // reuses, does not fork
    for (const key of ["highLegibility", "reduceMotion", "alwaysShowStatusLabels", "landingPage"]) {
      expect(view).toContain(key);
    }
    expect(view).toContain("usePersistedState");
  });

  it("has one notification row per real ReminderType, plus mute-all / digest / quiet hours", () => {
    const types: ReminderType[] = ["training_due", "coaching_follow_up", "one_on_one_scheduled", "knowledge_check_failed", "coaching_cadence_gap", "announcement"];
    for (const t of types) expect(view).toContain(t);
    expect(view).toContain("muteAll");
    expect(view).toContain("digestCadence");
    expect(view).toContain("quietHours");
  });

  it("uses the disabled role field, ComingSoon rows, and a sign-out confirm modal", () => {
    expect(view).toContain('value={roleTitle} disabled'); // role reflects the real constraint
    expect(view).toContain("ComingSoonTile");
    expect(view).toContain("Sign out");
    expect(view).toContain("<Modal");
    expect(view).toContain("logout");
    expect(view).toContain("ToggleSwitch");
  });
});
