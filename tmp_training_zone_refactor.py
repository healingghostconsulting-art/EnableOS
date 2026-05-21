from pathlib import Path
import re

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()

pattern = re.compile(
    r'\n\s*<PremiumCard className=\{isDirectModuleLaunch \? "hidden" : undefined\}>.*?\n\s*<div className=\{`grid gap-6 \$\{navigatorCollapsed \? "2xl:grid-cols-\[112px_minmax\(0,1fr\)_230px\]" : "2xl:grid-cols-\[300px_minmax\(0,1fr\)_240px\]"\}`\}>',
    re.S,
)

replacement = '''
            {!isDirectModuleLaunch ? (
              <PremiumCard className="overflow-hidden">
                <CardContent className="px-5 py-4">
                  <details className="group rounded-[1.55rem] border border-white/10 bg-white/6 p-4">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{activePreview?.eyebrow ?? "Training preview"}</Badge>
                          {requestedRoleLabel ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Role-chip launch · {requestedRoleLabel}</Badge> : null}
                          {recentUnlockMoment ? <Badge className="rounded-full border-emerald-400/20 bg-emerald-500/10 text-emerald-100">Latest unlock · {recentUnlockMoment.title}</Badge> : null}
                        </div>
                        <p className="mt-3 text-sm font-medium text-white">Player launch setup</p>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">{canBrowseAllTrainingFamilies ? "The lesson now opens immediately. Expand this setup only when you want to switch audience lane or preview scenario before continuing." : `This route remains scoped to the ${effectiveTrainingRoleLabel.toLowerCase()} lane so the learner lands in the right context without extra pre-lesson chrome.`}</p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 transition group-open:bg-white group-open:text-slate-950">Open setup</div>
                    </summary>
                    <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                      <div className="flex flex-wrap gap-2.5">
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
                      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                        {previewScenarios.map((scenario) => (
                          <button
                            key={scenario.id}
                            type="button"
                            onClick={() => setPreviewScenarioId(scenario.id)}
                            className={`rounded-[1.3rem] border px-4 py-4 text-left transition ${previewScenarioId === scenario.id ? "border-cyan-400/35 bg-cyan-400/12 shadow-[0_16px_40px_rgba(34,211,238,0.12)]" : "border-white/10 bg-slate-950/55 hover:bg-white/10"}`}
                          >
                            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{scenario.eyebrow}</p>
                            <p className="mt-2 text-sm font-medium text-white">{scenario.label}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{scenario.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </details>
                </CardContent>
              </PremiumCard>
            ) : null}

            <PremiumCard className="overflow-hidden">
              <CardContent className="px-5 py-5">
                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.75fr)_minmax(220px,0.75fr)]">
                  <div className="rounded-[1.7rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(15,23,42,0.92))] px-5 py-5 shadow-[0_22px_60px_rgba(8,15,35,0.22)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Focused player</Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedModule.format}</Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">Stage {stageIndex + 1} of {stages.length}</Badge>
                      {featuredDeckVisual ? <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{featuredDeckVisual.pageLabel}</Badge> : null}
                    </div>
                    <div className="mt-4 max-w-3xl">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/75">Active learning frame</p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{selectedModule.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-200">{`The player now opens on the current lesson first, keeps the outline and progress compact, and reveals supporting materials only when the learner asks for them.`}</p>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Course status</p>
                        <p className="mt-2 text-sm font-medium text-white">{courseStatusLabel}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{courseStatusSupport}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current page</p>
                        <p className="mt-2 text-sm font-medium text-white">{currentStagePages.length > 0 ? `${lessonPageIndex + 1} of ${currentStagePages.length}` : "Ready"}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{stageNavigatorLabel}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Time remaining</p>
                        <p className="mt-2 text-sm font-medium text-white">{remainingRuntimeMinutes} min</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{guidedPlan.stageDurations.find((entry) => entry.stageId === currentStage?.id)?.durationLabel ?? "Runtime calibrating"}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Next gate</p>
                        <p className="mt-2 text-sm font-medium text-white">{activeQuizTrigger ? activeQuizTrigger.label : currentStage?.title}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{activeQuizTrigger ? activeQuizTrigger.modalPrompt : "Advance through the active lesson to unlock the next checkpoint."}</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <Progress value={overallProgress} className="h-2.5 bg-white/8" />
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Path signal</p>
                    <p className="mt-2 text-lg font-semibold text-white">{overallProgress}% complete</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{effectiveJourneyTitle}</p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/55 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Modules completed</p>
                        <p className="mt-2 text-sm font-medium text-white">{completedModuleCount} of {modules.length}</p>
                      </div>
                      <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/55 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current checkpoint</p>
                        <p className="mt-2 text-sm font-medium text-white">{currentStage?.label}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Reveal on demand</p>
                    <p className="mt-2 text-lg font-semibold text-white">Support stays secondary</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Transcript, coach prompts, and transfer materials remain available, but the lesson canvas owns the screen first.</p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/55 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Coach cue</p>
                        <p className="mt-2 text-sm font-medium text-white">{effectiveCoachingTitle}</p>
                      </div>
                      <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/55 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Runtime model</p>
                        <p className="mt-2 text-sm font-medium text-white">{guidedPlan.pacingLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <div className={`grid gap-4 ${navigatorCollapsed ? "2xl:grid-cols-[104px_minmax(0,1fr)_240px]" : "2xl:grid-cols-[260px_minmax(0,1fr)_250px]"}`}>
'''

new_text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Expected 1 replacement, got {count}')

new_text = new_text.replace('              <PremiumCard className="2xl:sticky 2xl:top-6">', '              <PremiumCard className="h-fit 2xl:sticky 2xl:top-5">', 1)
path.write_text(new_text)
print('preamble refactor applied')
