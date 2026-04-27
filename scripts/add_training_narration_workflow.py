from pathlib import Path

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()

text = text.replace(
'''  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Gauge,
  Layers3,
  ShieldCheck,
  Sparkles,
  Target,
  Users2,
} from "lucide-react";
''',
'''  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Gauge,
  Layers3,
  Mic,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Volume2,
  Users2,
} from "lucide-react";
'''
)

anchor = '''const roleMeta: Record<DemoRole, { title: string; route: string; eyebrow: string; subtitle: string }> = {
'''
constants = '''const VOICE_REFERENCE_SAMPLE_URL = "/manus-storage/LettingGoRAWFINALUSETHIS_b8a8ab1a.m4a";
const VOICE_REFERENCE_SAMPLE_NAME = "LettingGoRAWFINALUSETHIS.m4a";
const VOICE_REFERENCE_TRANSCRIPT_EXCERPT = "We must learn to let go. What we hold tightly takes their toll. Time reshapes us. Change breaks us. Yet they make us whole.";
const VOICE_REFERENCE_PROFILE = {
  durationLabel: "40.6 sec",
  tone: "Reflective and steady",
  pacing: "Measured cadence with calm pauses",
  workflowNote: "Use the uploaded recording as the tonal reference, then preview lesson narration with in-browser speech for pacing and script review inside the demo.",
};

'''
if anchor not in text:
    raise SystemExit('Could not locate roleMeta anchor.')
text = text.replace(anchor, constants + anchor, 1)

state_anchor = '''  const [finalQuizAnswers, setFinalQuizAnswers] = useState<Record<string, string>>({});
  const [finalQuizSubmitted, setFinalQuizSubmitted] = useState(false);
  const [selectedDeckVisualIndex, setSelectedDeckVisualIndex] = useState(0);
'''
state_block = '''  const [finalQuizAnswers, setFinalQuizAnswers] = useState<Record<string, string>>({});
  const [finalQuizSubmitted, setFinalQuizSubmitted] = useState(false);
  const [selectedDeckVisualIndex, setSelectedDeckVisualIndex] = useState(0);
  const [narrationMode, setNarrationMode] = useState<"browser_preview" | "voice_reference">("browser_preview");
  const [narrationRate, setNarrationRate] = useState("0.95");
  const [narrationStatus, setNarrationStatus] = useState<"idle" | "playing" | "ended" | "unsupported">("idle");
'''
if state_anchor not in text:
    raise SystemExit('Could not locate narration state anchor.')
text = text.replace(state_anchor, state_block, 1)

reset_old = '''    setFinalQuizAnswers({});
    setFinalQuizSubmitted(false);
    setSelectedDeckVisualIndex(0);
'''
reset_new = '''    setFinalQuizAnswers({});
    setFinalQuizSubmitted(false);
    setSelectedDeckVisualIndex(0);
    setNarrationStatus("idle");
'''
text = text.replace(reset_old, reset_new)

insert_after = '''  const reflectionPromptPreview = presentation?.reflectionPrompts[Math.min(stageIndex, Math.max((presentation?.reflectionPrompts.length ?? 1) - 1, 0))]
    ?? `Capture the next observable behavior that should change after this lesson.`;
'''
insert_block = '''  const reflectionPromptPreview = presentation?.reflectionPrompts[Math.min(stageIndex, Math.max((presentation?.reflectionPrompts.length ?? 1) - 1, 0))]
    ?? `Capture the next observable behavior that should change after this lesson.`;
  const narrationScript = currentLessonPage
    ? `${currentLessonPage.title}. ${currentLessonPage.narrative} ${currentLessonPage.bullets.slice(0, 3).join(" ")}`
    : presentation?.heroSummary ?? "Narration preview becomes available when a lesson page is active.";
  const voiceReferenceHighlights = [
    `Tone: ${VOICE_REFERENCE_PROFILE.tone}`,
    `Pacing: ${VOICE_REFERENCE_PROFILE.pacing}`,
    `Sample length: ${VOICE_REFERENCE_PROFILE.durationLabel}`,
  ];

  const stopNarration = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setNarrationStatus("idle");
  };

  const playNarrationPreview = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setNarrationStatus("unsupported");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narrationScript);
    utterance.rate = Number(narrationRate);
    utterance.pitch = narrationMode === "voice_reference" ? 0.92 : 1;
    utterance.onstart = () => setNarrationStatus("playing");
    utterance.onend = () => setNarrationStatus("ended");
    utterance.onerror = () => setNarrationStatus("unsupported");
    window.speechSynthesis.speak(utterance);
  };
'''
if insert_after not in text:
    raise SystemExit('Could not locate narration derived-values anchor.')
text = text.replace(insert_after, insert_block, 1)

lesson_header_old = '''                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentStage?.label}</Badge>
                                <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{moduleFamilyLabel}</Badge>
                              </div>
                              <div>
'''
lesson_header_new = '''                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentStage?.label}</Badge>
                                <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{moduleFamilyLabel}</Badge>
                                <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Narration studio ready</Badge>
                              </div>
                              <div>
'''
if lesson_header_old not in text:
    raise SystemExit('Could not locate lesson header anchor.')
text = text.replace(lesson_header_old, lesson_header_new, 1)

lesson_body_anchor = '''                                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">{currentLessonPage.narrative}</p>
                                {lessonVisualSequence.length ? (
'''
lesson_body_insert = '''                                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">{currentLessonPage.narrative}</p>
                                <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                                  <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Narrated lesson controls</p>
                                        <h4 className="mt-2 text-lg font-medium text-white">Preview this lesson as spoken guidance</h4>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">The demo now pairs each lesson page with a narration workflow. The uploaded voice sample acts as the tonal reference, while this in-browser preview lets reviewers test pacing against the lesson script before any produced narration is finalized.</p>
                                      </div>
                                      <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{narrationMode === "voice_reference" ? "Voice-reference mode" : "Browser preview mode"}</Badge>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                      <Button
                                        type="button"
                                        variant={narrationMode === "browser_preview" ? "default" : "outline"}
                                        className={narrationMode === "browser_preview" ? "rounded-full bg-white text-slate-950 hover:bg-slate-100" : "rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"}
                                        onClick={() => setNarrationMode("browser_preview")}
                                      >
                                        <Volume2 className="mr-2 h-4 w-4" />
                                        Browser preview
                                      </Button>
                                      <Button
                                        type="button"
                                        variant={narrationMode === "voice_reference" ? "default" : "outline"}
                                        className={narrationMode === "voice_reference" ? "rounded-full bg-white text-slate-950 hover:bg-slate-100" : "rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"}
                                        onClick={() => setNarrationMode("voice_reference")}
                                      >
                                        <Mic className="mr-2 h-4 w-4" />
                                        Uploaded voice reference
                                      </Button>
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                      {voiceReferenceHighlights.map((item) => (
                                        <div key={item} className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">{item}</div>
                                      ))}
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Narration speed</p>
                                          <p className="mt-1 text-sm text-slate-300">Adjust pacing to match the calm cadence suggested by the uploaded recording.</p>
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
                                      <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={playNarrationPreview}>
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Play lesson narration
                                      </Button>
                                      <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white" onClick={stopNarration}>
                                        <PauseCircle className="mr-2 h-4 w-4" />
                                        Stop preview
                                      </Button>
                                      <span className="text-sm text-slate-400">
                                        {narrationStatus === "playing" ? "Narration preview is playing." : narrationStatus === "ended" ? "Narration preview finished." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "Ready to preview this lesson as audio."}
                                      </span>
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
                                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Lesson narration script</p>
                                      <p className="mt-3 text-sm leading-7 text-slate-100">{narrationScript}</p>
                                    </div>
                                  </div>
                                  <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.78))] p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Uploaded voice-reference workflow</p>
                                        <h4 className="mt-2 text-lg font-medium text-white">Reference sample from the provided recording</h4>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">This panel keeps the supplied recording inside the course review experience so stakeholders can compare lesson scripts to the reference tone before approving narrated content.</p>
                                      </div>
                                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{VOICE_REFERENCE_SAMPLE_NAME}</Badge>
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-slate-950/70 p-4">
                                      <audio controls preload="none" className="w-full">
                                        <source src={VOICE_REFERENCE_SAMPLE_URL} type="audio/mp4" />
                                      </audio>
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Transcript excerpt used for tone calibration</p>
                                      <p className="mt-3 text-sm leading-7 text-slate-200">{VOICE_REFERENCE_TRANSCRIPT_EXCERPT}</p>
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                                      <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">Workflow note</p>
                                      <p className="mt-3 text-sm leading-6 text-slate-100">{VOICE_REFERENCE_PROFILE.workflowNote}</p>
                                    </div>
                                  </div>
                                </div>
                                {lessonVisualSequence.length ? (
'''
if lesson_body_anchor not in text:
    raise SystemExit('Could not locate lesson body anchor.')
text = text.replace(lesson_body_anchor, lesson_body_insert, 1)

path.write_text(text)
print('Training narration workflow added.')
