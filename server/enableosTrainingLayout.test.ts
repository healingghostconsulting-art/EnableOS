import { describe, expect, it } from "vitest";
import { getLessonPageWindowStart, getStageNavigatorLabel } from "../client/src/pages/EnableOSViews";

describe("learner training layout helpers", () => {
  it("anchors the first brief window at the start of the stage", () => {
    expect(getLessonPageWindowStart(0, 8)).toBe(0);
    expect(getLessonPageWindowStart(1, 8)).toBe(0);
  });

  it("centers the active brief when there is room in the window", () => {
    expect(getLessonPageWindowStart(3, 8)).toBe(2);
    expect(getLessonPageWindowStart(4, 8)).toBe(3);
  });

  it("pins the window to the final available set of briefs near the end", () => {
    expect(getLessonPageWindowStart(7, 8)).toBe(5);
    expect(getLessonPageWindowStart(6, 8)).toBe(5);
  });

  it("returns the branded stage label for each learner training phase", () => {
    expect(getStageNavigatorLabel("brief")).toBe("Brief walkthrough");
    expect(getStageNavigatorLabel("practice")).toBe("Practice walkthrough");
    expect(getStageNavigatorLabel("apply")).toBe("Application walkthrough");
    expect(getStageNavigatorLabel("reflect")).toBe("Reflection walkthrough");
    expect(getStageNavigatorLabel()).toBe("Reflection walkthrough");
  });
});
