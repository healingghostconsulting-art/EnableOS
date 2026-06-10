import type { KpiScorecardData } from "../../../shared/kpiScorecards";

/**
 * Live, data-driven KPI scorecard rendered in place of the static deck slide for the
 * WFM & KPI training. Targets come from shared/kpiScorecards.ts, so each client's goals
 * stay editable without re-exporting PowerPoint.
 */
export function KpiScorecard({
  scorecard,
  clientName,
  note,
}: {
  scorecard: KpiScorecardData;
  clientName: string;
  note?: string;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.1rem] bg-[linear-gradient(160deg,#0b1826,#0f2334)] p-4 text-left text-white sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold sm:text-lg">{scorecard.title}</h3>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-100 sm:text-[11px]">
          {clientName}
        </span>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-[12px] sm:text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">
              <th className="border-b border-white/10 pb-2 pr-3 font-medium">KPI</th>
              <th className="border-b border-white/10 pb-2 pr-3 font-medium">Goal</th>
              <th className="hidden border-b border-white/10 pb-2 font-medium sm:table-cell">Definition</th>
            </tr>
          </thead>
          <tbody>
            {scorecard.rows.map((row) => (
              <tr key={row.metric} className="align-top">
                <td className="border-b border-white/5 py-2 pr-3 font-medium text-white">{row.metric}</td>
                <td className="whitespace-nowrap border-b border-white/5 py-2 pr-3 font-semibold text-[#FCBC34]">{row.goal}</td>
                <td className="hidden border-b border-white/5 py-2 text-slate-300 sm:table-cell">{row.definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="mt-2 shrink-0 text-[10px] text-slate-500 sm:text-[11px]">* {note}</p> : null}
    </div>
  );
}
