import { describe, expect, it } from "vitest";
import { filterTrainingRecords, matchesTrainingSearch } from "../shared/trainingDiscovery";

describe("training discovery search", () => {
  const records = [
    {
      title: "Service Foundations Core Deck",
      subtitle: "Customer service, empathy, and professionalism.",
      keywords: ["learner", "service foundations", "communication"],
    },
    {
      title: "Workflow Precision Field Kit",
      subtitle: "Verification, QA discipline, and documentation accuracy.",
      keywords: ["manager", "workflow", "qa"],
    },
    {
      title: "Unlocking the Power of Data",
      subtitle: "KPI reading and executive decision quality.",
      keywords: ["executive", "kpi", "leadership"],
    },
  ];

  it("matches across titles, subtitles, and keywords", () => {
    expect(matchesTrainingSearch(records[0], "service learner")).toBe(true);
    expect(matchesTrainingSearch(records[1], "documentation qa")).toBe(true);
    expect(matchesTrainingSearch(records[2], "executive kpi")).toBe(true);
  });

  it("requires every search term to appear somewhere in the record", () => {
    expect(matchesTrainingSearch(records[0], "service executive")).toBe(false);
  });

  it("returns all records when the search is empty", () => {
    expect(filterTrainingRecords(records, "")).toHaveLength(3);
  });

  it("returns only the matching training cards for scoped searches", () => {
    expect(filterTrainingRecords(records, "workflow").map((record) => record.title)).toEqual([
      "Workflow Precision Field Kit",
    ]);
    expect(filterTrainingRecords(records, "power data").map((record) => record.title)).toEqual([
      "Unlocking the Power of Data",
    ]);
  });
});
