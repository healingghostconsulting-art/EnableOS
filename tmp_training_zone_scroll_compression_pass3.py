from pathlib import Path

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()

text = text.replace('  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);', '  const [navigatorCollapsed, setNavigatorCollapsed] = useState(true);', 1)
text = text.replace('  const [trainingWorkspacePage, setTrainingWorkspacePage] = useState<"brief" | "lesson" | "checkpoint" | "resources">("lesson");', '  const [trainingWorkspacePage, setTrainingWorkspacePage] = useState<"brief" | "lesson" | "checkpoint" | "resources">("lesson");\n  const [launchSetupOpen, setLaunchSetupOpen] = useState(false);', 1)

old_block = '''                  <details className="group rounded-[1.4rem] border border-white/10 bg-white/6 p-3.5">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{activePreview?.eyebrow ?? "Training preview"}</Badge>
                        {requestedRoleLabel ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{requestedRoleLabel}</Badge> : null}
                        {recentUnlockMoment ? <Badge className="rounded-full border-emerald-400/20 bg-emerald-500/10 text-emerald-100">Unlock · {recentUnlockMoment.title}</Badge> : null}
                        <span className="text-sm font-medium text-white">Launch setup</span>
                        <span className="text-xs text-slate-300">{canBrowseAllTrainingFamilies ? "Switch lane only if needed." : `Scoped to ${effectiveTrainingRoleLabel.toLowerCase()}.`}</span>
                      </div>
                      <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-slate-300 transition group-open:bg-white group-open:text-slate-950">Expand</div>
                    </summary>
                    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                      <div className="flex flex-wrap gap-2">
                        {availableTrainingRoleFilterOptions.map((option) => (
                          <Button
                            key={`training-role-filter-${option.value}`}
                            type="button"
                            variant="outline"
                            onClick={() => setRoleFilter(option.value)}
                            className={`rounded-full border-white/10 ${effectiveTrainingRoleFilter === option.value ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
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
                      <p className="text-xs leading-5 text-slate-400">The active preview only changes the lesson lane and supporting context. The learner still lands directly inside the player.</p>
                    </div>
                  </details>'''

new_block = '''                  <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-3.5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{activePreview?.eyebrow ?? "Training preview"}</Badge>
                        {requestedRoleLabel ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{requestedRoleLabel}</Badge> : null}
                        {recentUnlockMoment ? <Badge className="rounded-full border-emerald-400/20 bg-emerald-500/10 text-emerald-100">Unlock · {recentUnlockMoment.title}</Badge> : null}
                        <span className="text-sm font-medium text-white">Launch setup</span>
                        <span className="text-xs text-slate-300">{canBrowseAllTrainingFamilies ? "Switch lane only if needed." : `Scoped to ${effectiveTrainingRoleLabel.toLowerCase()}.`}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-white/10 bg-slate-950/60 text-white hover:bg-white/10 hover:text-white"
                        onClick={() => setLaunchSetupOpen((current) => !current)}
                      >
                        {launchSetupOpen ? "Hide options" : "Switch lane"}
                      </Button>
                    </div>
                    {launchSetupOpen ? (
                      <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                        <div className="flex flex-wrap gap-2">
                          {availableTrainingRoleFilterOptions.map((option) => (
                            <Button
                              key={`training-role-filter-${option.value}`}
                              type="button"
                              variant="outline"
                              onClick={() => setRoleFilter(option.value)}
                              className={`rounded-full border-white/10 ${effectiveTrainingRoleFilter === option.value ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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
                        <p className="text-xs leading-5 text-slate-400">The active preview only changes the lesson lane and supporting context. The learner still lands directly inside the player.</p>
                      </div>
                    ) : null}
                  </div>'''

if old_block not in text:
    raise SystemExit('launch setup block not found')
text = text.replace(old_block, new_block, 1)

path.write_text(text)
print('third training scroll compression pass applied')
