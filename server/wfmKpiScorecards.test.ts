import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aspirusKpiProfile, classifyKpi, defaultKpiProfile, formatKpiValue, getKpiProfile, getKpiScorecard, kpiStatusLabel, rollupKpiProfile } from "../shared/kpiScorecards";
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

  it("classifies measurements R/Y/G from value vs bands across all three directions", () => {
    // higher-is-better
    expect(classifyKpi({ currentValue: 92, unit: "%", direction: "higher_is_better", target: 90, green: [90, 100], yellow: [85, 90] })).toBe("green");
    expect(classifyKpi({ currentValue: 87, unit: "%", direction: "higher_is_better", target: 90, green: [90, 100], yellow: [85, 90] })).toBe("yellow");
    expect(classifyKpi({ currentValue: 80, unit: "%", direction: "higher_is_better", target: 90, green: [90, 100], yellow: [85, 90] })).toBe("red");
    // lower-is-better
    expect(classifyKpi({ currentValue: 3.5, unit: "min", direction: "lower_is_better", target: 4, green: [0, 4], yellow: [4, 4.5] })).toBe("green");
    expect(classifyKpi({ currentValue: 4.3, unit: "min", direction: "lower_is_better", target: 4, green: [0, 4], yellow: [4, 4.5] })).toBe("yellow");
    expect(classifyKpi({ currentValue: 6, unit: "min", direction: "lower_is_better", target: 4, green: [0, 4], yellow: [4, 4.5] })).toBe("red");
    // in-range
    expect(classifyKpi({ currentValue: 80, unit: "%", direction: "in_range", target: 80, green: [75, 85], yellow: [70, 90] })).toBe("green");
    expect(classifyKpi({ currentValue: 88, unit: "%", direction: "in_range", target: 80, green: [75, 85], yellow: [70, 90] })).toBe("yellow");
    expect(classifyKpi({ currentValue: 95, unit: "%", direction: "in_range", target: 80, green: [75, 85], yellow: [70, 90] })).toBe("red");
    // green wins on a shared boundary value
    expect(classifyKpi({ currentValue: 80, unit: "%", direction: "higher_is_better", target: 80, green: [80, 100], yellow: [72, 80] })).toBe("green");
  });

  it("seeds Aspirus with a believable green/yellow/red mix and a red overall rollup", () => {
    const rollup = rollupKpiProfile(aspirusKpiProfile);
    expect(rollup.total).toBe(12);
    expect(rollup).toMatchObject({ green: 6, yellow: 4, red: 2, overall: "red" });
    // Spot-check a representative status in each band.
    const find = (id: string, pred: (m: string) => boolean) => getKpiScorecard(aspirusKpiProfile, id)!.rows.find((r) => pred(r.metric))!;
    expect(classifyKpi(find("patient-service", (m) => m === "Service Level").measurement!)).toBe("yellow");
    expect(classifyKpi(find("patient-service", (m) => m === "Abandonment Rate %").measurement!)).toBe("red");
    expect(classifyKpi(find("patient-service", (m) => m.startsWith("ASA")).measurement!)).toBe("green");
  });

  it("formats values/labels and keeps the default template measurement-free", () => {
    expect(formatKpiValue({ currentValue: 78, unit: "%", direction: "higher_is_better", target: 80, green: [80, 100], yellow: [72, 80] })).toBe("78%");
    expect(formatKpiValue({ currentValue: 27, unit: "sec", direction: "lower_is_better", target: 30, green: [0, 30], yellow: [30, 40] })).toBe("27 sec");
    expect(kpiStatusLabel("green")).toBe("On target");
    expect(kpiStatusLabel("yellow")).toBe("Watch");
    expect(kpiStatusLabel("red")).toBe("Off target");
    // The blank template carries no demo measurements, so its rollup is empty.
    expect(defaultKpiProfile.scorecards.every((c) => c.rows.every((r) => r.measurement === undefined))).toBe(true);
    expect(rollupKpiProfile(defaultKpiProfile).total).toBe(0);
  });

  it("surfaces the team KPI board as a Manager Ops mode tab, leaving the training slides in reference mode", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/EnableOSViews.tsx"), "utf8");
    expect(source).toContain("{ value: \"kpi-board\", label: \"KPI board\" }");
    expect(source).toContain("id=\"manager-kpi-board\"");
    expect(source).toContain("const kpiRollup = rollupKpiProfile(kpiBoardProfile)");
    expect(source).toContain("<KpiScorecard key={card.id} scorecard={card} clientName={kpiBoardProfile.clientName} note={kpiBoardProfile.note} showStatus />");
    // Training-slide scorecards stay in reference mode (no showStatus prop).
    expect(source).toContain("<KpiScorecard scorecard={activeScorecard} clientName={kpiProfile.clientName} note={kpiProfile.note} />");
  });
});
