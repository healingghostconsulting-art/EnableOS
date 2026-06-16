import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import {
  classifyKpi,
  formatKpiValue,
  kpiStatusLabel,
  type KpiMeasurement,
  type KpiScorecardData,
  type KpiStatus,
} from "../../../shared/kpiScorecards";

const STATUS_STYLES: Record<KpiStatus, { cls: string; Icon: typeof CheckCircle2 }> = {
  green: { cls: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100", Icon: CheckCircle2 },
  yellow: { cls: "border-amber-300/30 bg-amber-400/15 text-amber-100", Icon: AlertTriangle },
  red: { cls: "border-rose-400/30 bg-rose-500/15 text-rose-100", Icon: CircleAlert },
};

/**
 * Red/Yellow/Green status pill — semantic palette paired with an icon and a text
 * label so status is never communicated by color alone. Exported for the Manager
 * Ops KPI board's overall rollup; the per-row cell uses it internally.
 */
export function KpiStatusPill({ status, label }: { status: KpiStatus; label?: string }) {
  const { cls, Icon } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label ?? kpiStatusLabel(status)}
    </span>
  );
}

function KpiRowStatus({ measurement }: { measurement?: KpiMeasurement }) {
  if (!measurement) return <span className="text-slate-500">—</span>;
  return <KpiStatusPill status={classifyKpi(measurement)} />;
}

/**
 * Live, data-driven KPI scorecard. Two modes share one renderer:
 *  - reference (default): KPI · Goal · Definition — the WFM & KPI training slides.
 *  - board (`showStatus`): KPI · Current · Goal · Status — the Manager Ops team
 *    board, adding a current-value cell and a computed R/Y/G pill per KPI.
 * Targets come from shared/kpiScorecards.ts, so each client's goals stay editable
 * without re-exporting PowerPoint.
 */
export function KpiScorecard({
  scorecard,
  clientName,
  note,
  showStatus = false,
}: {
  scorecard: KpiScorecardData;
  clientName: string;
  note?: string;
  showStatus?: boolean;
}) {
  // Reference mode fills a fixed-height slide box (h-full + internal scroll); the
  // board sizes to its content so stacked scorecards flow naturally.
  const rootClassName = showStatus
    ? "flex w-full flex-col rounded-[1.1rem] bg-[linear-gradient(160deg,#0b1826,#0f2334)] p-4 text-left text-white sm:p-6"
    : "flex h-full w-full flex-col overflow-hidden rounded-[1.1rem] bg-[linear-gradient(160deg,#0b1826,#0f2334)] p-4 text-left text-white sm:p-6";
  const tableWrapClassName = showStatus ? "mt-3" : "mt-3 min-h-0 flex-1 overflow-auto";

  return (
    <div className={rootClassName}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold sm:text-lg">{scorecard.title}</h3>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-100 sm:text-[11px]">
          {clientName}
        </span>
      </div>
      <div className={tableWrapClassName}>
        <table className="w-full border-collapse text-left text-[12px] sm:text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:text-[11px]">
              <th className="border-b border-white/10 pb-2 pr-3 font-medium">KPI</th>
              {showStatus ? <th className="border-b border-white/10 pb-2 pr-3 font-medium">Current</th> : null}
              <th className="border-b border-white/10 pb-2 pr-3 font-medium">Goal</th>
              {showStatus ? (
                <th className="border-b border-white/10 pb-2 font-medium">Status</th>
              ) : (
                <th className="hidden border-b border-white/10 pb-2 font-medium sm:table-cell">Definition</th>
              )}
            </tr>
          </thead>
          <tbody>
            {scorecard.rows.map((row) => (
              <tr key={row.metric} className="align-top">
                <td className="border-b border-white/5 py-2 pr-3 font-medium text-white">{row.metric}</td>
                {showStatus ? (
                  <td className="whitespace-nowrap border-b border-white/5 py-2 pr-3 font-semibold text-white">
                    {row.measurement ? formatKpiValue(row.measurement) : "—"}
                  </td>
                ) : null}
                <td className="whitespace-nowrap border-b border-white/5 py-2 pr-3 font-semibold text-[#FCBC34]">{row.goal}</td>
                {showStatus ? (
                  <td className="border-b border-white/5 py-2">
                    <KpiRowStatus measurement={row.measurement} />
                  </td>
                ) : (
                  <td className="hidden border-b border-white/5 py-2 text-slate-300 sm:table-cell">{row.definition}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="mt-2 shrink-0 text-[10px] text-slate-500 sm:text-[11px]">* {note}</p> : null}
    </div>
  );
}
