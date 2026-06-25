import { Bar, CartesianGrid, ComposedChart, Line, LineChart, XAxis, YAxis } from "recharts";

// Print-optimized executive summary (REPORT2). Hidden on screen, shown only by the
// @media print rules in index.css; the user prints it to PDF via window.print().
// Light theme, fixed-size charts (so the SVGs render even while the container is
// display:none), data-driven from getExecutiveDashboard.
const INK = "#1B303C";
const MUTED = "#4A6373";

function alertLabel(alert: string): string {
  return alert === "high" ? "High alert" : alert === "medium" ? "Watch closely" : "Monitor";
}

export function ReportingPrintLayout({ data }: { data: any }) {
  if (!data) return null;
  const printedOn = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const topRisks = (data.questionReporting ?? []).slice(0, 3);

  return (
    <div data-reporting-print className="reporting-print" style={{ color: INK, background: "#fff", padding: "28px 32px", fontFamily: "system-ui, Segoe UI, Arial, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${INK}`, paddingBottom: 14, marginBottom: 18 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED }}>CHCG EnableOS · Enablement reporting</p>
          <h1 style={{ margin: "6px 0 0", fontSize: 24 }}>{data.tenant?.name ?? "Reporting"} — executive summary</h1>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Generated {printedOn}</p>
      </header>

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>{data.reportingOverview?.headline}</h2>
        <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Proof cue: {data.proofOfImpact?.headline}</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {(data.reportingOverview?.summaryCards ?? []).map((card: any) => (
          <div key={card.label} style={{ border: `1px solid ${INK}1A`, borderRadius: 12, padding: "10px 12px" }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED }}>{card.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 600 }}>{card.value}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: MUTED, lineHeight: 1.4 }}>{card.detail}</p>
          </div>
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18, breakInside: "avoid" }}>
        <div style={{ border: `1px solid ${INK}1A`, borderRadius: 12, padding: 14 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Readiness</h3>
          <p style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>{data.readiness?.score}<span style={{ fontSize: 14, color: MUTED, fontWeight: 400 }}> / {data.readiness?.target} target</span></p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: MUTED }}>Team {data.readiness?.teamScore} · uplift +{data.readiness?.uplift} pts · intervention confidence {data.interventionConfidence?.value}</p>
        </div>
        <div style={{ border: `1px solid ${INK}1A`, borderRadius: 12, padding: 14 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>ROI movement</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ color: MUTED, textAlign: "left" }}><th>Metric</th><th>Before</th><th>After</th><th>Delta</th></tr></thead>
            <tbody>
              {(data.roiMetrics ?? []).map((m: any) => (
                <tr key={m.label} style={{ borderTop: `1px solid ${INK}12` }}><td style={{ padding: "3px 0" }}>{m.label}</td><td>{m.before}</td><td>{m.after}</td><td style={{ fontWeight: 600 }}>{m.delta}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18, breakInside: "avoid" }}>
        <div>
          <h3 style={{ margin: "0 0 6px", fontSize: 13 }}>Readiness vs. peer benchmark</h3>
          <LineChart width={360} height={200} data={data.roiTrendSeries ?? []}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="period" stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} />
            <YAxis stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} />
            <Line type="monotone" dataKey="readiness" stroke="#0EA5E9" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="benchmarkReadiness" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </div>
        <div>
          <h3 style={{ margin: "0 0 6px", fontSize: 13 }}>Interventions vs. readiness</h3>
          <ComposedChart width={360} height={200} data={data.correlationSeries ?? []}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="week" stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} />
            <YAxis yAxisId="left" stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke={MUTED} tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} />
            <Bar yAxisId="left" dataKey="interventions" fill="#1B303C" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line yAxisId="right" type="monotone" dataKey="readiness" stroke="#0EA5E9" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </div>
      </section>

      <section style={{ marginBottom: 18, breakInside: "avoid" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Proof of impact</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {(data.proofOfImpact?.beforeAfter ?? []).map((b: any) => (
            <div key={b.label} style={{ border: `1px solid ${INK}1A`, borderRadius: 12, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED }}>{b.label}</p>
              <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>{b.before} → {b.after} <span style={{ color: "#0EA5E9" }}>{b.delta}</span></p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: MUTED, lineHeight: 1.4 }}>{b.evidence}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {(data.proofOfImpact?.sustainedReadiness ?? []).map((s: any) => (
            <span key={s.label} style={{ fontSize: 11, border: `1px solid ${INK}1A`, borderRadius: 999, padding: "3px 10px", color: MUTED }}><strong style={{ color: INK }}>{s.value}</strong> {s.label}</span>
          ))}
        </div>
      </section>

      <section style={{ breakInside: "avoid" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 13 }}>Top question risks</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ color: MUTED, textAlign: "left" }}><th style={{ padding: "0 6px 4px 0" }}>Module</th><th>Question</th><th>Miss</th><th>Alert</th></tr></thead>
          <tbody>
            {topRisks.map((r: any) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${INK}12` }}>
                <td style={{ padding: "4px 6px 4px 0", verticalAlign: "top" }}>{r.module}</td>
                <td style={{ padding: "4px 6px 4px 0", verticalAlign: "top" }}>{r.question}</td>
                <td style={{ padding: "4px 6px 4px 0", verticalAlign: "top", whiteSpace: "nowrap" }}>{r.missRate}%</td>
                <td style={{ padding: "4px 0", verticalAlign: "top", whiteSpace: "nowrap", fontWeight: 600 }}>{alertLabel(r.alert)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
