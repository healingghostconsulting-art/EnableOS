import ExcelJS from "exceljs";

// Client-side Reporting Hub exporters (REPORT2). XLSX via exceljs; the email
// summary is plain text + HTML for the clipboard. PDF is handled separately by the
// print-optimized layout + window.print(). All inputs come from getExecutiveDashboard.

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function addTableSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: (string | number)[][]) {
  const ws = workbook.addWorksheet(name.slice(0, 31)); // Excel caps sheet names at 31 chars.
  ws.columns = headers.map((header) => ({ header, width: Math.min(60, Math.max(12, header.length + 2)) }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((row) => ws.addRow(row));
}

/** One workbook, one sheet per Reporting Hub table. */
export async function buildReportingWorkbookBlob(data: any): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CHCG EnableOS";

  // Summary sheet: readiness + summary cards + ROI metrics, in labelled blocks.
  const summary = workbook.addWorksheet("Summary");
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 16;
  summary.getColumn(3).width = 18;
  summary.getColumn(4).width = 48;
  const heading = (text: string) => { const r = summary.addRow([text]); r.font = { bold: true }; };
  heading(`${data.tenant?.name ?? "Reporting"} — executive summary`);
  summary.addRow([data.reportingOverview?.headline ?? ""]);
  summary.addRow([]);
  heading("Readiness");
  summary.addRow(["Enterprise score", data.readiness?.score]);
  summary.addRow(["Target", data.readiness?.target]);
  summary.addRow(["Team score", data.readiness?.teamScore]);
  summary.addRow(["Uplift (pts)", data.readiness?.uplift]);
  summary.addRow(["Intervention confidence", data.interventionConfidence?.value ?? ""]);
  summary.addRow([]);
  heading("Reporting summary cards");
  const cardHead = summary.addRow(["Metric", "Value", "Detail"]); cardHead.font = { bold: true };
  (data.reportingOverview?.summaryCards ?? []).forEach((c: any) => summary.addRow([c.label, c.value, "", c.detail]));
  summary.addRow([]);
  heading("ROI metrics");
  const roiHead = summary.addRow(["Metric", "Before", "After", "Delta"]); roiHead.font = { bold: true };
  (data.roiMetrics ?? []).forEach((m: any) => summary.addRow([m.label, m.before, m.after, m.delta]));

  addTableSheet(workbook, "ROI trend", ["Period", "QA score", "CSAT", "Readiness", "Benchmark QA", "Benchmark CSAT", "Benchmark readiness"],
    (data.roiTrendSeries ?? []).map((r: any) => [r.period, r.qaScore, r.csat, r.readiness, r.benchmarkQa, r.benchmarkCsat, r.benchmarkReadiness]));
  addTableSheet(workbook, "Correlation", ["Week", "Interventions", "Readiness"],
    (data.correlationSeries ?? []).map((r: any) => [r.week, r.interventions, r.readiness]));
  addTableSheet(workbook, "Team readiness", ["Team", "Score"],
    (data.teamReadiness ?? []).map((r: any) => [r.team, r.score]));
  addTableSheet(workbook, "Question risk", ["Module", "Skill domain", "Question", "Miss rate %", "Peer miss %", "First-pass %", "Retry dep %", "Alert", "Coaching action"],
    (data.questionReporting ?? []).map((r: any) => [r.module, r.skillDomain, r.question, r.missRate, r.peerMissRate, r.firstPassSuccess, r.retryDependency, r.alert, r.coachingAction]));
  addTableSheet(workbook, "Lifecycle", ["Stage", "Tenure", "Population", "Readiness", "QA score", "Close rate %", "Peer percentile", "Error rate %"],
    (data.lifecycleReporting ?? []).map((r: any) => [r.stage, r.tenureRange, r.population, r.readiness, r.qaScore, r.interventionCloseRate, r.peerPercentile, r.errorRate]));
  addTableSheet(workbook, "Peer benchmarks", ["Cohort", "Metric", "Score", "Comparison", "Insight"],
    (data.peerBenchmarking ?? []).map((r: any) => [r.cohort, r.metric, r.score, r.comparison, r.insight]));
  addTableSheet(workbook, "Repeat escalations", ["Learner", "Module", "Assignments", "Completion", "Recommended escalation"],
    (data.repeatAssignmentReporting ?? []).map((r: any) => [r.learner, r.module, r.assignmentCount, r.completionRate, r.recommendedEscalation ?? r.behaviorChange ?? ""]));
  addTableSheet(workbook, "Coaching cadence", ["Manager", "Cadence adherence %", "Missed intervals", "Follow-up completion %", "Documentation completeness %"],
    (data.coachingConsistency?.managerRollup ?? []).map((r: any) => [r.manager, r.cadenceAdherence, r.missedIntervals, r.followUpCompletion, r.documentationCompleteness]));
  addTableSheet(workbook, "Error rate", ["Period", "Total", "Critical", "Moderate", "Minor"],
    (data.errorRateReporting?.trendSeries ?? []).map((r: any) => [r.period, r.total, r.critical, r.moderate, r.minor]));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
}

/** Plain-text + HTML email summary for the clipboard. */
export function buildReportingEmailSummary(data: any): { subject: string; text: string; html: string } {
  const tenant = data.tenant?.name ?? "Reporting";
  const cards = data.reportingOverview?.summaryCards ?? [];
  const risks = (data.questionReporting ?? []).slice(0, 3);
  const subject = `${tenant} — enablement reporting summary`;
  const readinessLine = `Readiness: ${data.readiness?.score} / target ${data.readiness?.target} (team ${data.readiness?.teamScore}, +${data.readiness?.uplift} pts) · Intervention confidence: ${data.interventionConfidence?.value ?? ""}`;
  const text = [
    subject,
    "",
    data.reportingOverview?.headline ?? "",
    "",
    readinessLine,
    "",
    ...cards.map((c: any) => `• ${c.label}: ${c.value} — ${c.detail}`),
    "",
    "Top question risks:",
    ...risks.map((r: any, i: number) => `${i + 1}. ${r.module} — "${r.question}" · miss ${r.missRate}% (${r.alert})`),
    "",
    `Proof: ${data.proofOfImpact?.headline ?? ""}`,
  ].join("\n");
  const html = [
    `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1B303C">`,
    `<h2 style="margin:0 0 8px">${subject}</h2>`,
    `<p style="margin:0 0 12px"><strong>${data.reportingOverview?.headline ?? ""}</strong></p>`,
    `<p style="margin:0 0 12px">${readinessLine}</p>`,
    `<ul style="margin:0 0 12px;padding-left:18px">${cards.map((c: any) => `<li><strong>${c.label}:</strong> ${c.value} — ${c.detail}</li>`).join("")}</ul>`,
    `<p style="margin:0 0 4px"><strong>Top question risks</strong></p>`,
    `<ol style="margin:0 0 12px;padding-left:18px">${risks.map((r: any) => `<li>${r.module} — "${r.question}" · miss ${r.missRate}% (${r.alert})</li>`).join("")}</ol>`,
    `<p style="margin:0">Proof: ${data.proofOfImpact?.headline ?? ""}</p>`,
    `</div>`,
  ].join("");
  return { subject, text, html };
}

/** Copy the email summary to the clipboard (rich HTML when supported, else plain text). */
export async function copyReportingEmailSummary(data: any): Promise<void> {
  const { text, html } = buildReportingEmailSummary(data);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return;
    }
  } catch {
    // Fall through to plain text.
  }
  await navigator.clipboard.writeText(text);
}

/** Shared Blob download (same idiom as exportRetrainingHistory). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 0);
}
