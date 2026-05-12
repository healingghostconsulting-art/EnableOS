import { describe, expect, it } from "vitest";

import { getBriefBoxPages } from "../client/src/pages/EnableOSViews";

describe("getBriefBoxPages", () => {
  const pages = [
    { id: "brief-1", title: "Opening context" },
    { id: "brief-2", title: "Escalation path" },
    { id: "brief-3", title: "Behavior check" },
  ];

  it("returns the active brief with its adjacent previews", () => {
    const result = getBriefBoxPages(pages, 1);

    expect(result.currentPage).toEqual(pages[1]);
    expect(result.previousPage).toEqual(pages[0]);
    expect(result.nextPage).toEqual(pages[2]);
    expect(result.boundedIndex).toBe(1);
  });

  it("clamps to the first brief when the index is below range", () => {
    const result = getBriefBoxPages(pages, -4);

    expect(result.currentPage).toEqual(pages[0]);
    expect(result.previousPage).toBeNull();
    expect(result.nextPage).toEqual(pages[1]);
    expect(result.boundedIndex).toBe(0);
  });

  it("clamps to the final brief when the index is above range", () => {
    const result = getBriefBoxPages(pages, 99);

    expect(result.currentPage).toEqual(pages[2]);
    expect(result.previousPage).toEqual(pages[1]);
    expect(result.nextPage).toBeNull();
    expect(result.boundedIndex).toBe(2);
  });

  it("returns empty preview slots when no pages are available", () => {
    const result = getBriefBoxPages([], 0);

    expect(result.currentPage).toBeNull();
    expect(result.previousPage).toBeNull();
    expect(result.nextPage).toBeNull();
    expect(result.boundedIndex).toBe(0);
  });
});
