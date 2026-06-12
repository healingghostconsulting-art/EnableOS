import { describe, expect, it } from "vitest";
import { buildCatalogCourses, listContentLibrary } from "./demoPlatform";
import { slideDecks } from "../shared/slideManifest";

describe("catalog courses (CAT3 data layer)", () => {
  const courses = buildCatalogCourses();

  it("builds one deck-backed course per slide deck with a real cover + slide count", () => {
    expect(courses.length).toBe(slideDecks.length);
    for (const course of courses) {
      const deck = slideDecks.find((d) => d.id === course.deckId);
      expect(deck).toBeTruthy();
      expect(course.coverImage).toBe(`/slides/${deck!.slides[0].file}`);
      expect(course.slideCount).toBe(deck!.slides.length);
      expect(course.durationMinutes).toBeGreaterThan(0);
      expect(course.launchPath).toContain(`journeyId=`);
      expect(course.launchPath).toContain(`moduleId=`);
    }
  });

  it("seeds a realistic mix of statuses so continue-learning + recommended are alive", () => {
    const byStatus = (s: string) => courses.filter((c) => c.status === s);
    expect(byStatus("completed").length).toBeGreaterThanOrEqual(1);
    expect(byStatus("in_progress").length).toBeGreaterThanOrEqual(1);
    expect(byStatus("recommended").length).toBeGreaterThanOrEqual(1);
    expect(byStatus("not_started").length).toBeGreaterThanOrEqual(1);
    // in-progress courses carry a percent and a resume slide index (for CAT4).
    for (const c of byStatus("in_progress")) {
      expect(c.percentComplete).toBeGreaterThan(0);
      expect(c.percentComplete).toBeLessThan(100);
      expect(typeof c.lastSlideIndex).toBe("number");
    }
    expect(byStatus("recommended").every((c) => c.recommended)).toBe(true);
  });

  it("every course's track exists in the library track list", () => {
    const lib = listContentLibrary();
    const trackIds = new Set(lib.tracks.map((t) => t.id));
    for (const course of courses) expect(trackIds.has(course.track)).toBe(true);
    expect((lib as { courses: unknown[] }).courses.length).toBe(courses.length);
  });
});
