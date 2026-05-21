from pathlib import Path
import re

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()

text = text.replace('          <div className="space-y-6">', '          <div className="space-y-4">', 1)
text = text.replace('        title={isDirectModuleLaunch ? (selectedModule?.title ?? "Interactive course player") : "Training player"}\n        description={isDirectModuleLaunch ? "The learner lands on the active lesson immediately." : "Lesson first. Progress and support stay compact until the learner needs them."}', '        title={selectedModule?.title ?? "Training player"}\n        description={isDirectModuleLaunch ? "Opens directly on the active lesson." : "Lesson first."}', 1)

old_launch = '''                  <details className="group rounded-[1.55rem] border border-white/10 bg-white/6 p-4">
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
                      <div className="flex flex-wrap gap-2.5">'''

new_launch = '''                  <details className="group rounded-[1.4rem] border border-white/10 bg-white/6 p-3.5">
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
                      <div className="flex flex-wrap gap-2">'''

if old_launch not in text:
    raise SystemExit('launch summary block not found')
text = text.replace(old_launch, new_launch, 1)
text = text.replace('                      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">', '                      <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">', 1)
text = text.replace('className={`rounded-[1.3rem] border px-4 py-4 text-left transition ${previewScenarioId === scenario.id ? "border-cyan-400/35 bg-cyan-400/12 shadow-[0_16px_40px_rgba(34,211,238,0.12)]" : "border-white/10 bg-slate-950/55 hover:bg-white/10"}`}', 'className={`rounded-[1.15rem] border px-3 py-3 text-left transition ${previewScenarioId === scenario.id ? "border-cyan-400/35 bg-cyan-400/12 shadow-[0_12px_28px_rgba(34,211,238,0.12)]" : "border-white/10 bg-slate-950/55 hover:bg-white/10"}`}', 1)

focused_pattern = re.compile(r'\n\s*<PremiumCard className="overflow-hidden">\n\s*<CardContent className="px-5 py-5">\n\s*<div className="grid gap-4 2xl:grid-cols-\[minmax\(0,1\.3fr\)_minmax\(220px,0\.75fr\)_minmax\(220px,0\.75fr\)\]">.*?\n\s*</PremiumCard>\n\n\s*<div className=\{`grid gap-4 \$\{navigatorCollapsed \? "2xl:grid-cols-\[104px_minmax\(0,1fr\)_240px\]" : "2xl:grid-cols-\[260px_minmax\(0,1fr\)_250px\]"\}`\}>', re.S)
focused_replacement = '''
            <PremiumCard className="overflow-hidden">
              <CardContent className="px-4 py-4">
                <div className="rounded-[1.55rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(15,23,42,0.92))] px-4 py-4 shadow-[0_18px_45px_rgba(8,15,35,0.2)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Focused player</Badge>
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedModule.format}</Badge>
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">Stage {stageIndex + 1} of {stages.length}</Badge>
                        {featuredDeckVisual ? <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{featuredDeckVisual.pageLabel}</Badge> : null}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">{selectedModule.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-200">Lesson first, with compact progress and support controls.</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white">{courseStatusLabel}</div>
                      <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white">{currentStagePages.length > 0 ? `${lessonPageIndex + 1}/${currentStagePages.length}` : "Ready"}</div>
                      <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white">{remainingRuntimeMinutes} min left</div>
                      <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white">{overallProgress}% complete</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={overallProgress} className="h-2 bg-white/8" />
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <div className={`grid gap-4 ${navigatorCollapsed ? "2xl:grid-cols-[104px_minmax(0,1fr)_240px]" : "2xl:grid-cols-[240px_minmax(0,1fr)_236px]"}`}>'''

text, count = focused_pattern.subn(focused_replacement, text, count=1)
if count != 1:
    raise SystemExit(f'focused player block replacement failed: {count}')

text = text.replace('                  <CardContent className="space-y-5">', '                  <CardContent className="space-y-4">', 1)
text = text.replace('                    <div className="grid gap-3 md:grid-cols-4">', '                    <div className="flex flex-wrap gap-2">', 1)
text = text.replace('                          <div key={stage.id} className={`rounded-2xl border px-3 py-3 text-sm ${index === stageIndex ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-white/10 bg-white/5 text-slate-300"}`}>\n                            <p className="font-medium">{stage.label}</p>\n                            <p className="mt-1 text-xs text-slate-400">Step {index + 1}</p>\n                            {stagePlan ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/80">{stagePlan.durationLabel}</p> : null}\n                          </div>', '                          <div key={stage.id} className={`rounded-full border px-3 py-2 text-sm ${index === stageIndex ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-white/10 bg-white/5 text-slate-300"}`}>\n                            <div className="flex flex-wrap items-center gap-2">\n                              <span className="font-medium">{stage.label}</span>\n                              <span className="text-xs text-slate-400">Step {index + 1}</span>\n                              {stagePlan ? <span className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/80">{stagePlan.durationLabel}</span> : null}\n                            </div>\n                          </div>', 1)
text = text.replace('                        <div className="space-y-4">', '                        <div className="space-y-3">', 1)
text = text.replace('                          <div className="command-band px-4 py-4 md:px-5">\n                          <div className="flex flex-col gap-4 border-b border-[#1B303C]/10 pb-4 xl:flex-row xl:items-center xl:justify-between">\n                            <div className="max-w-2xl">\n                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6B7E8A]">Training pages</p>\n                              <p className="mt-2 text-sm leading-6 text-[#4A6373]">The lesson stays dominant by default. Open overview, checkpoint, or resources only when you need them.</p>\n                            </div>\n                            <div className="flex flex-wrap gap-2">', '                          <div className="command-band px-4 py-3 md:px-4">\n                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">\n                            <div className="flex flex-wrap items-center gap-2">\n                              <Badge className="rounded-full border-[#1B303C]/12 bg-white text-[#1B303C]">Training pages</Badge>\n                              <span className="text-sm text-[#4A6373]">Lesson first.</span>\n                            </div>\n                            <div className="flex flex-wrap gap-2">', 1)
text = text.replace('                          <div className={trainingWorkspacePage === "brief" ? "mt-4 grid gap-4', '                          <div className={trainingWorkspacePage === "brief" ? "mt-3 grid gap-3', 1)

old_audio = '''                        <div className={trainingWorkspacePage === "lesson" ? "sticky bottom-4 z-20 mt-6 rounded-[1.5rem] border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(8,145,178,0.18),rgba(15,23,42,0.94))] px-4 py-4 shadow-[0_20px_60px_rgba(8,15,35,0.35)] backdrop-blur-xl" : "hidden"}>
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Mini audio bar</Badge>
                                <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentStage?.label ?? "Lesson"}</Badge>
                                {activeQuizTrigger ? <Badge className="rounded-full border-amber-400/20 bg-amber-400/10 text-amber-100">Next gate · {activeQuizTrigger.label}</Badge> : null}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">{miniAudioBarTitle}</p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{narrationScript}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 lg:items-end">
                              <div className="flex flex-wrap items-center gap-3">
                                <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-500" onClick={playNarrationPreview} disabled={!narrationSupported}>
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Play audio
                                </Button>
                                <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white disabled:bg-white/5 disabled:text-slate-500" onClick={stopNarration} disabled={!narrationSupported || narrationStatus === "idle" || narrationStatus === "unsupported"}>
                                  <PauseCircle className="mr-2 h-4 w-4" />
                                  Stop
                                </Button>
                                <Select value={narrationRate} onValueChange={setNarrationRate}>
                                  <SelectTrigger className="w-[160px] rounded-full border-white/12 bg-slate-950/80 text-slate-100">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0.85">Slow · 0.85x</SelectItem>
                                    <SelectItem value="0.95">Balanced · 0.95x</SelectItem>
                                    <SelectItem value="1">Standard · 1.0x</SelectItem>
                                    <SelectItem value="1.1">Energetic · 1.1x</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-xs text-slate-300 lg:text-right">
                                {narrationStatus === "playing" ? "Reading the current lesson script aloud." : narrationStatus === "ended" ? "Finished reading the current lesson script." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "Persistent narration controls stay available while you move through the lesson."}
                              </p>
                            </div>
                          </div>
                        </div>'''
new_audio = '''                        <div className={trainingWorkspacePage === "lesson" && narrationStatus === "playing" ? "sticky bottom-3 z-20 mt-4 rounded-full border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(8,145,178,0.22),rgba(15,23,42,0.96))] px-4 py-2 shadow-[0_14px_35px_rgba(8,15,35,0.28)] backdrop-blur-xl" : "hidden"}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Narration live</Badge>
                              <span className="truncate text-sm text-white">{miniAudioBarTitle}</span>
                            </div>
                            <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white disabled:bg-white/5 disabled:text-slate-500" onClick={stopNarration} disabled={!narrationSupported || narrationStatus === "idle" || narrationStatus === "unsupported"}>
                              <PauseCircle className="mr-2 h-4 w-4" />
                              Stop
                            </Button>
                          </div>
                        </div>'''
if old_audio not in text:
    raise SystemExit('mini audio block not found')
text = text.replace(old_audio, new_audio, 1)

text = text.replace('                            <div className="space-y-8">', '                            <div className="space-y-6">', 1)
text = text.replace('                                <p className="mt-4 max-w-none break-words text-sm leading-7 text-slate-200 2xl:text-[15px]">{currentLessonPage.narrative}</p>\n                                <div className="mt-6 rounded-[1.45rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">\n                                  <div className="flex flex-wrap items-center justify-between gap-3">\n                                    <div>\n                                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Player support</p>\n                                      <p className="mt-2 text-sm text-slate-100">Transcript, coach notes, and storyboard details stay collapsed until the learner chooses to reveal them.</p>\n                                    </div>\n                                    <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Above-the-fold focus</Badge>\n                                  </div>\n                                </div>\n                                <div className="mt-6 grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">', '                                <p className="mt-3 max-w-none break-words text-sm leading-7 text-slate-200 2xl:text-[15px]">{currentLessonPage.narrative}</p>\n                                <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">', 1)
text = text.replace('                                      <p className="mt-4 text-sm leading-6 text-slate-300">{featuredDeckVisual?.caption ?? "The player keeps the lesson frame dominant and leaves supporting material closed until the learner asks for it."}</p>\n                                      <div className="mt-4 rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/10 p-4">\n                                        <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">Privacy safeguard</p>\n                                        <p className="mt-3 text-sm leading-6 text-slate-100">Narration stays inside the course experience, and private reference recordings remain hidden from the visible learner flow.</p>\n                                      </div>', '                                      <p className="mt-4 text-sm leading-6 text-slate-300">{featuredDeckVisual?.caption ?? "The player keeps the lesson frame dominant and leaves supporting material closed until the learner asks for it."}</p>', 1)

path.write_text(text)
print('scroll compression refactor applied')
