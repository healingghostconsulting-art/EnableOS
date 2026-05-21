from pathlib import Path

# Tighten the route-level Training header copy so it occupies a single short line.
dashboard_path = Path('/home/ubuntu/chcg-enableos-demo/client/src/components/DashboardLayout.tsx')
dashboard_text = dashboard_path.read_text()
old_header = '''  "/training": {
    eyebrow: "Training zone",
    headline: "Make training feel like progression, not a content wall.",
    focus: "Checkpoint flow",
    next: "Keep the learner inside the current stage and surface only the guidance needed right now.",
    reward: "Milestones unlocked",
  },'''
new_header = '''  "/training": {
    eyebrow: "Training zone",
    headline: "Resume the current lesson.",
    focus: "Checkpoint flow",
    next: "Open support only when needed.",
    reward: "Lesson in focus",
  },'''
if old_header not in dashboard_text:
    raise SystemExit('training dashboard header block not found')
dashboard_text = dashboard_text.replace(old_header, new_header, 1)
dashboard_path.write_text(dashboard_text)

# Replace tall preview cards with compact pill-style selectors inside the Training launch setup.
training_path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
training_text = training_path.read_text()
old_preview = '''                      <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                        {previewScenarios.map((scenario) => (
                          <button
                            key={scenario.id}
                            type="button"
                            onClick={() => setPreviewScenarioId(scenario.id)}
                            className={`rounded-[1.15rem] border px-3 py-3 text-left transition ${previewScenarioId === scenario.id ? "border-cyan-400/35 bg-cyan-400/12 shadow-[0_12px_28px_rgba(34,211,238,0.12)]" : "border-white/10 bg-slate-950/55 hover:bg-white/10"}`}
                          >
                            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{scenario.eyebrow}</p>
                            <p className="mt-2 text-sm font-medium text-white">{scenario.label}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{scenario.description}</p>
                          </button>
                        ))}
                      </div>'''
new_preview = '''                      <div className="flex flex-wrap items-center gap-2">
                        {previewScenarios.map((scenario) => (
                          <button
                            key={scenario.id}
                            type="button"
                            onClick={() => setPreviewScenarioId(scenario.id)}
                            className={`rounded-full border px-3 py-2 text-left text-sm transition ${previewScenarioId === scenario.id ? "border-cyan-400/35 bg-cyan-400/12 text-white shadow-[0_10px_22px_rgba(34,211,238,0.12)]" : "border-white/10 bg-slate-950/55 text-slate-200 hover:bg-white/10"}`}
                          >
                            <span className="font-medium">{scenario.label}</span>
                            <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">{scenario.eyebrow}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs leading-5 text-slate-400">The active preview only changes the lesson lane and supporting context. The learner still lands directly inside the player.</p>'''
if old_preview not in training_text:
    raise SystemExit('training preview selector block not found')
training_text = training_text.replace(old_preview, new_preview, 1)
training_path.write_text(training_text)

print('second training scroll compression pass applied')
