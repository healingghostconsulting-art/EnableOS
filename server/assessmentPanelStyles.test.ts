import { describe, expect, it } from "vitest";

import { getAssessmentResultStyles } from "../client/src/pages/EnableOSViews";

describe("assessment result styles", () => {
  it("uses a darker emerald success treatment for readable pass states across trainings", () => {
    expect(getAssessmentResultStyles(true)).toEqual({
      containerClass: "border-emerald-300/35 bg-[linear-gradient(135deg,rgba(6,95,70,0.94),rgba(16,185,129,0.3))] shadow-[0_18px_48px_rgba(5,46,22,0.28)]",
      scoreClass: "text-emerald-50",
      bodyClass: "text-emerald-100",
    });
  });

  it("uses a darker rose retry treatment for readable fail states across trainings", () => {
    expect(getAssessmentResultStyles(false)).toEqual({
      containerClass: "border-rose-300/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.94),rgba(244,63,94,0.3))] shadow-[0_18px_48px_rgba(76,5,25,0.28)]",
      scoreClass: "text-rose-50",
      bodyClass: "text-rose-100",
    });
  });
});
