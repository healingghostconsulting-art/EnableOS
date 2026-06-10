import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aspirusKpiProfile, defaultKpiProfile, getKpiProfile, getKpiScorecard } from "../shared/kpiScorecards";
import { slideDecks, slideDeckForModuleId } from "../shared/slideManifest";

describe("WFM & KPI training — data-driven scorecards", () => {
  it("ships the WFM & KPI deck mapped to the agent WFM modules", () => {
    const deck = slideDeckForModuleId("mod-wfm-1");
    expect(deck?.id).toBe("wfm-kpi");
    expect(deck?.slides.length).toBe(48);
    // The three KPI scorecard slides are flagged so the live table replaces the image.
    const flagged = deck!.slides.filter((s) => s.scorecard);
    expect(flagged.map((s) => s.scorecard)).toEqual(["patient-service", "efficiency", "wfm"]);
    expect(flagged.map((s) => s.file)).toEqual(["wfm-kpi-29.jpg", "wfm-kpi-30.jpg", "wfm-kpi-31.jpg"]);
  });

  it("exposes editable per-client KPI targets (Aspirus) for each scorecard id", () => {
    expect(aspirusKpiProfile.clientName).toBe("Aspirus");
    expect(aspirusKpiProfile.scorecards.map((c) => c.id)).toEqual(["patient-service", "efficiency", "wfm"]);

    const patientService = getKpiScorecard(aspirusKpiProfile, "patient-service");
    expect(patientService?.rows.find((r) => r.metric === "Service Level")?.goal).toBe("80% / 30 sec");
    expect(getKpiScorecard(aspirusKpiProfile, "efficiency")?.rows.find((r) => r.metric.startsWith("Occupancy"))?.goal).toBe("75%–85%");
    expect(getKpiScorecard(aspirusKpiProfile, "wfm")?.rows.find((r) => r.metric === "Shrinkage")?.goal).toBe("< 20%");
  });

  it("defaults to the source client and offers a blank template for new clients", () => {
    expect(getKpiProfile().clientId).toBe("aspirus");
    expect(getKpiProfile("unknown-client").clientId).toBe("aspirus");
    // The default template keeps the structure but blanks the goals for editing.
    expect(defaultKpiProfile.scorecards[0].rows.every((r) => r.goal === "—")).toBe(true);
  });

  it("every manifest scorecard id resolves to a real scorecard in the client profile", () => {
    const ids = slideDecks.flatMap((d) => d.slides).map((s) => s.scorecard).filter(Boolean) as string[];
    for (const id of ids) {
      expect(getKpiScorecard(aspirusKpiProfile, id)).toBeTruthy();
    }
  });

  it("renders the live scorecard (not the static image) in the lesson player", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/EnableOSViews.tsx"), "utf8");
    expect(source).toContain("activeScorecard ? (");
    expect(source).toContain("<KpiScorecard scorecard={activeScorecard}");
    expect(source).toContain("getKpiScorecard(kpiProfile, activeInteractiveVisual.scorecardId)");
  });
});
