from pathlib import Path
import re

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()

old_effect = '''  useEffect(() => {
    if (!activeModalQuizTrigger || completedQuizTriggerIds.includes(activeModalQuizTrigger.id)) {
      return;
    }

    setActiveQuizQuestionIndex(0);

    if (activeModalQuizTrigger.assessmentKey === "briefCheckpoint") {
      setBriefCheckpointAnswers({});
      setBriefCheckpointSubmitted(false);
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "practiceCheckpoint") {
      setPracticeCheckpointAnswers({});
      setPracticeCheckpointSubmitted(false);
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "applicationActivity") {
      setApplicationAnswers({});
      setApplicationSubmitted(false);
      return;
    }

    setFinalQuizAnswers({});
    setFinalQuizSubmitted(false);
  }, [activeModalCheckpointResetKey, completedQuizTriggerIds]);
'''
new_effect = '''  useEffect(() => {
    if (!activeModalQuizTrigger || completedQuizTriggerIds.includes(activeModalQuizTrigger.id)) {
      return;
    }

    setTrainingWorkspacePage("checkpoint");
    setActiveQuizQuestionIndex(0);

    if (activeModalQuizTrigger.assessmentKey === "briefCheckpoint") {
      setBriefCheckpointAnswers({});
      setBriefCheckpointSubmitted(false);
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "practiceCheckpoint") {
      setPracticeCheckpointAnswers({});
      setPracticeCheckpointSubmitted(false);
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "applicationActivity") {
      setApplicationAnswers({});
      setApplicationSubmitted(false);
      return;
    }

    setFinalQuizAnswers({});
    setFinalQuizSubmitted(false);
  }, [activeModalCheckpointResetKey, completedQuizTriggerIds]);
'''
if old_effect not in text:
    raise SystemExit('modal effect block not found')
text = text.replace(old_effect, new_effect, 1)

text = text.replace(
    'Move through the training in focused pages instead of one long stack. Open the brief, lesson page, checkpoint, or transfer pack as separate workspace views.',
    'The lesson stays dominant by default. Open overview, checkpoint, or resources only when you need them.',
    1,
)
text = text.replace('>Brief</Button>', '>Overview</Button>', 1)
text = text.replace('>Transfer pack</Button>', '>Resources</Button>', 1)
text = text.replace('>Open transfer pack</Button>', '>Open resources</Button>', 1)

support_old = '''                                <div className="mt-6 rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Narration access</p>
                                      <p className="mt-2 text-sm text-slate-100">Use the persistent mini audio bar to keep lesson narration controls available as you move through every page and stage.</p>
                                    </div>
                                    <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Speaks current lesson script</Badge>
                                  </div>
                                  <p className="mt-3 text-sm text-slate-200">
                                    {narrationStatus === "playing" ? "The mini audio bar is currently reading the active lesson content." : narrationStatus === "ended" ? "The mini audio bar finished reading the active lesson content." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "The mini audio bar is ready to read the content shown on this page."}
                                  </p>
                                </div>
                                <div className="mt-6 grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                                  <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Narrated lesson controls</p>
                                        <h4 className="mt-2 text-lg font-medium text-white">Read this lesson aloud as spoken guidance</h4>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">This player reads the lesson script shown below and keeps narration scoped to the active training content only.</p>
                                      </div>
                                      <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Content narration</Badge>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                      <Badge className="rounded-full border-white/10 bg-white/6 text-slate-200"><Volume2 className="mr-2 h-4 w-4" /> Browser speech preview</Badge>
                                      <Badge className="rounded-full border-white/10 bg-white/6 text-slate-200"><Mic className="mr-2 h-4 w-4" /> Uses lesson script below</Badge>
                                    </div>
                                    <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-slate-200">
                                      Lesson narration now stays inside the guided training flow only, with no uploaded reference recording surfaced in the site experience.
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Narration speed</p>
                                          <p className="mt-1 text-sm text-slate-300">Adjust pacing so the spoken lesson matches the rhythm that works best for this module.</p>
                                        </div>
                                        <Select value={narrationRate} onValueChange={setNarrationRate}>
                                          <SelectTrigger className="w-[170px] border-white/10 bg-slate-950/80 text-slate-100">
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
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                      <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-500" onClick={playNarrationPreview} disabled={!narrationSupported}>
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Play lesson narration
                                      </Button>
                                      <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white disabled:bg-white/5 disabled:text-slate-500" onClick={stopNarration} disabled={!narrationSupported || narrationStatus === "idle" || narrationStatus === "unsupported"}>
                                        <PauseCircle className="mr-2 h-4 w-4" />
                                        Stop preview
                                      </Button>
                                      <span className="text-sm text-slate-400">
                                        {narrationStatus === "playing" ? "Reading the current lesson script aloud." : narrationStatus === "ended" ? "Finished reading the current lesson script." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "Ready to read the current lesson script as audio."}
                                      </span>
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
                                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Lesson narration script</p>
                                      <div className="mt-3 max-h-[16rem] overflow-y-auto pr-2 text-sm leading-7 text-slate-100 break-words">{narrationScript}</div>
                                    </div>
                                    {currentLessonPage.speakerNotes?.length ? (
                                      <div className="mt-4 rounded-[1.4rem] border border-amber-300/20 bg-amber-300/10 p-4">
                                        <p className="text-xs uppercase tracking-[0.22em] text-amber-100/90">Speaker notes</p>
                                        <div className="mt-3 max-h-[16rem] space-y-3 overflow-y-auto pr-2 text-sm leading-7 text-slate-100 break-words">
                                          {currentLessonPage.speakerNotes.map((note) => (
                                            <p key={note}>{note}</p>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.78))] p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Narration access</p>
                                      <h4 className="mt-2 text-lg font-medium text-white">Lesson narration stays inside the training experience</h4>
                                      <p className="mt-2 text-sm leading-6 text-slate-300">The guided player now keeps narration focused on the active lesson only. No uploaded voice sample, transcript excerpt, or downloadable reference recording is exposed anywhere in this training view.</p>
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                                      <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">Privacy safeguard</p>
                                      <p className="mt-3 text-sm leading-6 text-slate-100">Learners can use the in-platform narration controls for lesson playback, while private reference audio remains removed from the visible site experience.</p>
                                    </div>
                                  </div>
                                </div>
'''

support_new = '''                                <div className="mt-6 rounded-[1.45rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Player support</p>
                                      <p className="mt-2 text-sm text-slate-100">Transcript, coach notes, and storyboard details stay collapsed until the learner chooses to reveal them.</p>
                                    </div>
                                    <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Above-the-fold focus</Badge>
                                  </div>
                                </div>
                                <div className="mt-6 grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                                  {featuredDeckVisual ? (
                                    <div className="overflow-hidden rounded-[1.7rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),rgba(2,6,23,0.94))] shadow-[0_24px_70px_rgba(8,15,35,0.28)]">
                                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
                                        <div>
                                          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/75">Primary lesson visual</p>
                                          <p className="mt-1 text-sm text-slate-300">{featuredDeckVisual.pageLabel} · {featuredDeckVisual.sourceDeck}</p>
                                        </div>
                                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/8 text-slate-100">Canvas media</Badge>
                                      </div>
                                      <div className="bg-slate-950/90 p-4 sm:p-5">
                                        <div className="flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/8 bg-slate-950/80 px-4 py-4 sm:min-h-[22rem] lg:min-h-[24rem]">
                                          <TrainingVisualFrame visual={featuredDeckVisual} />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lesson canvas</p>
                                      <h4 className="mt-2 text-lg font-medium text-white">The active page is guiding the learner without a secondary visual wall.</h4>
                                      <p className="mt-3 text-sm leading-6 text-slate-300">When a mapped deck visual is available, it appears here as the dominant lesson media above the fold.</p>
                                    </div>
                                  )}
                                  <div className="space-y-4">
                                    <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{currentStage?.label ?? "Lesson"}</Badge>
                                        {featuredDeckVisual ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{featuredDeckVisual.title}</Badge> : null}
                                      </div>
                                      <p className="mt-4 text-sm leading-6 text-slate-300">{featuredDeckVisual?.caption ?? "The player keeps the lesson frame dominant and leaves supporting material closed until the learner asks for it."}</p>
                                      <div className="mt-4 rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                                        <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">Privacy safeguard</p>
                                        <p className="mt-3 text-sm leading-6 text-slate-100">Narration stays inside the course experience, and private reference recordings remain hidden from the visible learner flow.</p>
                                      </div>
                                    </div>
                                    <details className="group rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                        <div>
                                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Transcript</p>
                                          <p className="mt-1 text-sm text-white">Open narration controls and the page transcript only when needed.</p>
                                        </div>
                                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Reveal</Badge>
                                      </summary>
                                      <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-500" onClick={playNarrationPreview} disabled={!narrationSupported}>
                                            <PlayCircle className="mr-2 h-4 w-4" />
                                            Play lesson narration
                                          </Button>
                                          <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white disabled:bg-white/5 disabled:text-slate-500" onClick={stopNarration} disabled={!narrationSupported || narrationStatus === "idle" || narrationStatus === "unsupported"}>
                                            <PauseCircle className="mr-2 h-4 w-4" />
                                            Stop preview
                                          </Button>
                                          <Select value={narrationRate} onValueChange={setNarrationRate}>
                                            <SelectTrigger className="w-[170px] border-white/10 bg-slate-950/80 text-slate-100">
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
                                        <div className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
                                          <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Lesson narration script</p>
                                          <div className="mt-3 max-h-[16rem] overflow-y-auto pr-2 text-sm leading-7 text-slate-100 break-words">{narrationScript}</div>
                                        </div>
                                        <p className="text-sm text-slate-400">{narrationStatus === "playing" ? "Reading the current lesson script aloud." : narrationStatus === "ended" ? "Finished reading the current lesson script." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "Ready to read the current lesson script as audio."}</p>
                                      </div>
                                    </details>
                                    {currentLessonPage.speakerNotes?.length ? (
                                      <details className="group rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-4">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                          <div>
                                            <p className="text-xs uppercase tracking-[0.22em] text-amber-100/90">Coach notes</p>
                                            <p className="mt-1 text-sm text-white">Speaker and facilitator notes stay out of the learner flow until opened.</p>
                                          </div>
                                          <Badge className="rounded-full border-amber-200/30 bg-white/10 text-amber-100">Reveal</Badge>
                                        </summary>
                                        <div className="mt-4 space-y-3 border-t border-amber-200/20 pt-4 text-sm leading-7 text-slate-100 break-words">
                                          {currentLessonPage.speakerNotes.map((note) => (
                                            <p key={note}>{note}</p>
                                          ))}
                                        </div>
                                      </details>
                                    ) : null}
                                  </div>
                                </div>
'''

if support_old not in text:
    raise SystemExit('support block not found')
text = text.replace(support_old, support_new, 1)

storyboard_old = '''                                {lessonVisualSequence.length ? (
                                  <div className="mt-6 rounded-[1.7rem] border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Visual storyboard</p>
                                        <p className="mt-2 text-sm text-slate-200">Each lesson page now turns the content into a visual sequence so every training step feels more like a guided in-product module.</p>
                                      </div>
                                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{lessonVisualSequence.length} step sequence</Badge>
                                    </div>
                                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                      {lessonVisualSequence.map((item, index) => (
                                        <div key={item.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/15 text-sm font-semibold text-cyan-100">{index + 1}</span>
                                            <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.stepLabel}</span>
                                          </div>
                                          <p className="mt-4 text-sm font-medium text-white">{item.title}</p>
                                          <p className="mt-3 text-sm leading-6 text-slate-300">{item.detail}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
'''

storyboard_new = '''                                {lessonVisualSequence.length ? (
                                  <details className="group mt-6 rounded-[1.7rem] border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Visual storyboard</p>
                                        <p className="mt-2 text-sm text-slate-200">Keep the storyboard hidden until the learner wants supporting sequence detail.</p>
                                      </div>
                                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{lessonVisualSequence.length} step sequence</Badge>
                                    </summary>
                                    <div className="mt-4 grid gap-3 border-t border-cyan-300/15 pt-4 lg:grid-cols-3">
                                      {lessonVisualSequence.map((item, index) => (
                                        <div key={item.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/15 text-sm font-semibold text-cyan-100">{index + 1}</span>
                                            <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.stepLabel}</span>
                                          </div>
                                          <p className="mt-4 text-sm font-medium text-white">{item.title}</p>
                                          <p className="mt-3 text-sm leading-6 text-slate-300">{item.detail}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                ) : null}
'''

if storyboard_old not in text:
    raise SystemExit('storyboard block not found')
text = text.replace(storyboard_old, storyboard_new, 1)

path.write_text(text)
print('support refactor applied')
