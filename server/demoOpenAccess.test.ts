import { afterEach, describe, expect, it } from "vitest";
import { getViewerAccess } from "./demoPlatform";
import { isDemoOpenAccess } from "./_core/env";
import { canGrantAccessWorkspace, permittedWorkspaces } from "../shared/workspaceAccess";

// DEMO_OPEN_ACCESS opens every workspace to every role for the demo WITHOUT editing either
// permission system. The flag is read at call time and is structurally gated on isDemoMode()
// so DEMO_MODE=false makes it inert. These tests flip the env per-case and restore it.

const ENV_KEYS = ["DEMO_MODE", "DEMO_OPEN_ACCESS"] as const;
const savedEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) savedEnv[key] = process.env[key];

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("DEMO_OPEN_ACCESS", () => {
  it("(a) flag unset — viewerAccess keeps the real restricted permittedRoles", () => {
    delete process.env.DEMO_MODE; // demo mode on by default
    delete process.env.DEMO_OPEN_ACCESS;
    expect(isDemoOpenAccess()).toBe(false);

    const coach = getViewerAccess("atlas-coach");
    expect(coach?.openAccess).toBe(false);
    expect(coach?.permittedRoles).toEqual(["coach", "learner"]);

    const manager = getViewerAccess("atlas-manager");
    expect(manager?.permittedRoles).toEqual(["manager", "coach", "learner", "client_admin"]);

    // The shared helpers are unchanged when openAccess is not passed / false.
    expect(canGrantAccessWorkspace("learner", "/chcg-admin")).toBe(false);
    expect(permittedWorkspaces("learner")).not.toContain("/chcg-admin");
  });

  it("(b) DEMO_MODE on + DEMO_OPEN_ACCESS=true — every role opens up", () => {
    delete process.env.DEMO_MODE; // demo mode on
    process.env.DEMO_OPEN_ACCESS = "true";
    expect(isDemoOpenAccess()).toBe(true);

    const coach = getViewerAccess("atlas-coach");
    expect(coach?.openAccess).toBe(true);
    expect(coach?.permittedRoles).toContain("executive");
    expect(coach?.permittedRoles).toEqual(["executive", "manager", "coach", "learner", "client_admin"]);

    expect(canGrantAccessWorkspace("learner", "/chcg-admin", true)).toBe(true);
    expect(permittedWorkspaces("learner", true)).toContain("/chcg-admin");
  });

  it("(c) DEMO_MODE=false + DEMO_OPEN_ACCESS=true — the flag is inert (DEMO_MODE wins)", () => {
    process.env.DEMO_MODE = "false";
    process.env.DEMO_OPEN_ACCESS = "true";
    expect(isDemoOpenAccess()).toBe(false);

    const coach = getViewerAccess("atlas-coach");
    expect(coach?.openAccess).toBe(false);
    expect(coach?.permittedRoles).toEqual(["coach", "learner"]);
  });
});
