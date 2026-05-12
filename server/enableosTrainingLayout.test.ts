import { describe, expect, it } from "vitest";
import { getBriefBoxPages, getModalCheckpointResetKey, getStageNavigatorLabel } from "../client/src/pages/EnableOSViews";

describe("learner training layout helpers", () => {
  const pages = Array.from({ length: 8 }, (_, index) => ({ id: `brief-${index + 1}` }));

  it("anchors the first brief window at the start of the stage", () => {
    const result = getBriefBoxPages(pages, 0);

    expect(result.currentPage).toEqual(pages[0]);
    expect(result.previousPage).toBeNull();
    expect(result.nextPage).toEqual(pages[1]);
    expect(result.boundedIndex).toBe(0);
  });

  it("keeps the active brief centered between adjacent previews when possible", () => {
    const result = getBriefBoxPages(pages, 3);

    expect(result.currentPage).toEqual(pages[3]);
    expect(result.previousPage).toEqual(pages[2]);
    expect(result.nextPage).toEqual(pages[4]);
    expect(result.boundedIndex).toBe(3);
  });

  it("pins the final brief safely when the learner reaches the end of the sequence", () => {
    const result = getBriefBoxPages(pages, 7);

    expect(result.currentPage).toEqual(pages[7]);
    expect(result.previousPage).toEqual(pages[6]);
    expect(result.nextPage).toBeNull();
    expect(result.boundedIndex).toBe(7);
  });

  it("returns the branded stage label for each learner training phase", () => {
    expect(getStageNavigatorLabel("brief")).toBe("Brief walkthrough");
    expect(getStageNavigatorLabel("practice")).toBe("Practice walkthrough");
    expect(getStageNavigatorLabel("apply")).toBe("Application walkthrough");
    expect(getStageNavigatorLabel("reflect")).toBe("Reflection walkthrough");
    expect(getStageNavigatorLabel()).toBe("Reflection walkthrough");
  });

  it("creates a stable modal reset key from trigger identity instead of object reference", () => {
    expect(getModalCheckpointResetKey({ id: "brief-6", assessmentKey: "briefCheckpoint" })).toBe("brief-6:briefCheckpoint");
    expect(getModalCheckpointResetKey({ id: "brief-6", assessmentKey: "briefCheckpoint" })).toBe("brief-6:briefCheckpoint");
    expect(getModalCheckpointResetKey({ id: "apply-2", assessmentKey: "applicationActivity" })).toBe("apply-2:applicationActivity");
    expect(getModalCheckpointResetKey(null)).toBe("none");
  });
});
