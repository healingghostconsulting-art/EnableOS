import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, EyeOff, Save, Trash2, RotateCcw, Lock, Upload, Bell, Mail, CalendarClock, MailX } from "lucide-react";
import { toast } from "sonner";
import type { TrainingApplicationQuestion } from "../../../shared/trainingContent";

// Shared restore affordance (LESSON3; reused by LIBRARY4). A compact shelf listing
// tombstoned items with a per-item Restore. Hides itself when nothing is hidden.
function HiddenItemsShelf({ items, onRestore, noun = "item" }: { items: Array<{ id: string; label: string }>; onRestore: (id: string) => void; noun?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Hidden {noun}s ({items.length})</p>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-white/8 bg-white/[0.02] px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-xs text-slate-500 line-through">{item.label}</p>
            <Button type="button" size="sm" variant="ghost" onClick={() => onRestore(item.id)} className="shrink-0 rounded-full text-slate-300 hover:bg-white/10 hover:text-white">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ContentAuthoringPanel (AUTHOR2 / Wave 1) — the shared quiz editor. The same
// component serves both admin surfaces; only the layer it writes differs:
//   • scope="core"   (CHCG Command / platform_admin) → ContentStore core layer
//   • scope="tenant" (Client Control / client_admin)  → that tenant's layer
// Reads/writes go through the demo router's previewAuthoringQuiz +
// previewAuthorQuiz{Tenant,Core} procedures (mirrors the branding preview pair).

type QuestionDraft = {
  id: string;
  prompt: string;
  type: "multiple_choice" | "short_answer";
  options: Array<{ id: string; label: string; rationale: string }>;
  correctOptionId: string;
  acceptedAnswers: string; // newline-separated in the form
  placeholder: string;
  successFeedback: string;
  failureFeedback: string;
};

// AUTHOR3 (Wave 1.5): the editor targets any of the four checkpoints per module.
// The generated questions are the editable baseline — authors edit, not author
// from scratch — and edits route to the matching ContentStore layer.
type CheckpointKey = "application" | "brief" | "practice" | "final";
const CHECKPOINTS: Array<{ key: CheckpointKey; label: string }> = [
  { key: "application", label: "Application" },
  { key: "brief", label: "Brief" },
  { key: "practice", label: "Practice" },
  { key: "final", label: "Final quiz" },
];

const inputClass = "border-white/10 bg-slate-950/60 text-slate-100 placeholder:text-slate-500";

function toDraft(question: TrainingApplicationQuestion): QuestionDraft {
  const options = (question.options ?? []).map((option) => ({ id: option.id, label: option.label, rationale: option.rationale }));
  return {
    id: question.id,
    prompt: question.prompt,
    type: question.type === "short_answer" ? "short_answer" : "multiple_choice",
    options,
    correctOptionId: question.correctOptionId ?? options[0]?.id ?? "",
    acceptedAnswers: (question.acceptedAnswers ?? []).join("\n"),
    placeholder: question.placeholder ?? "",
    successFeedback: question.successFeedback,
    failureFeedback: question.failureFeedback,
  };
}

function blankDraft(moduleId: string, checkpoint: CheckpointKey): QuestionDraft {
  const seed = `${moduleId}-${checkpoint}-custom-${Date.now()}`;
  return {
    id: seed,
    prompt: "",
    type: "multiple_choice",
    options: [
      { id: `${seed}-a`, label: "", rationale: "" },
      { id: `${seed}-b`, label: "", rationale: "" },
    ],
    correctOptionId: `${seed}-a`,
    acceptedAnswers: "",
    placeholder: "",
    successFeedback: "",
    failureFeedback: "",
  };
}

function draftToQuestion(draft: QuestionDraft): TrainingApplicationQuestion {
  if (draft.type === "short_answer") {
    return {
      id: draft.id,
      prompt: draft.prompt.trim(),
      type: "short_answer",
      acceptedAnswers: draft.acceptedAnswers.split("\n").map((line) => line.trim()).filter(Boolean),
      placeholder: draft.placeholder.trim() || undefined,
      successFeedback: draft.successFeedback.trim(),
      failureFeedback: draft.failureFeedback.trim(),
    };
  }
  const options = draft.options
    .map((option) => ({ id: option.id, label: option.label.trim(), rationale: option.rationale.trim() }))
    .filter((option) => option.label.length > 0);
  const correctOptionId = options.some((option) => option.id === draft.correctOptionId)
    ? draft.correctOptionId
    : options[0]?.id;
  return {
    id: draft.id,
    prompt: draft.prompt.trim(),
    type: "multiple_choice",
    options,
    correctOptionId,
    successFeedback: draft.successFeedback.trim(),
    failureFeedback: draft.failureFeedback.trim(),
  };
}

// ── Library authoring (LIBRARY2 / Wave 2) ───────────────────────────────────
// Same shape as the quiz editor, but the unit is a ContentLibraryAsset. core
// scope edits CHCG assets (tenantId "all"); tenant scope edits this client's and
// can hide a core asset for itself. sourceKind/tenantId are scope-derived server
// side, so the form never exposes them.
const LIBRARY_FORMATS = ["Deck", "Playbook", "Checklist", "Guide", "Worksheet", "Microlearning", "Document"] as const;
const LIBRARY_ROLES = ["all", "executive", "manager", "coach", "learner", "client_admin"] as const;

type LibraryDraft = {
  id: string;
  title: string;
  summary: string;
  category: string;
  format: (typeof LIBRARY_FORMATS)[number];
  tags: string; // comma/newline separated in the form
  linkedRoles: string[];
  sourceLabel: string;
};

function blankLibraryDraft(): LibraryDraft {
  return { id: `library-custom-${Date.now()}`, title: "", summary: "", category: "", format: "Playbook", tags: "", linkedRoles: ["all"], sourceLabel: "" };
}

function assetToLibraryDraft(asset: { id: string; title: string; summary: string; category: string; format: LibraryDraft["format"]; tags?: string[]; linkedRoles?: string[]; sourceLabel?: string }): LibraryDraft {
  return {
    id: asset.id,
    title: asset.title,
    summary: asset.summary,
    category: asset.category,
    format: asset.format,
    tags: (asset.tags ?? []).join(", "),
    linkedRoles: asset.linkedRoles ?? ["all"],
    sourceLabel: asset.sourceLabel ?? "",
  };
}

function libraryDraftToItem(draft: LibraryDraft) {
  return {
    id: draft.id,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    category: draft.category.trim(),
    format: draft.format,
    tags: draft.tags.split(/[\n,]/).map((tag) => tag.trim()).filter(Boolean),
    linkedRoles: (draft.linkedRoles.length ? draft.linkedRoles : ["all"]) as Array<(typeof LIBRARY_ROLES)[number]>,
    sourceLabel: draft.sourceLabel.trim(),
  };
}

function LibraryAuthoring({ scope, tenantId }: { scope: "core" | "tenant"; tenantId?: string }) {
  const content = trpc.demo.previewAuthoringLibrary.useQuery({ scope, tenantId });
  const assets = content.data?.assets ?? [];
  const hiddenQuery = trpc.demo.previewHiddenLibrary.useQuery({ scope, tenantId });
  const hidden = hiddenQuery.data?.assets ?? [];
  const authorTenant = trpc.demo.previewAuthorLibraryTenant.useMutation();
  const authorCore = trpc.demo.previewAuthorLibraryCore.useMutation();
  const saving = authorTenant.isPending || authorCore.isPending;
  const [draft, setDraft] = useState<LibraryDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const scopeLabel = scope === "core" ? "CHCG core content" : "this tenant";

  const runOp = async (op: Parameters<typeof authorTenant.mutateAsync>[0]["op"]) => {
    try {
      if (scope === "core") {
        await authorCore.mutateAsync({ scope: "core", op });
      } else {
        await authorTenant.mutateAsync({ scope: "tenant", tenantId, op });
      }
      await Promise.all([content.refetch(), hiddenQuery.refetch()]);
      toast.success(`Saved to ${scopeLabel}`);
      return true;
    } catch {
      toast.error("Could not save the edit");
      return false;
    }
  };

  // Reversible hide: reuse the generic hide op + the shared Undo toast (mirrors
  // the lesson slide hide). Restore also lives in the HiddenItemsShelf below.
  const hideAsset = async (id: string) => {
    try {
      if (scope === "core") {
        await authorCore.mutateAsync({ scope: "core", op: { kind: "hide", id } });
      } else {
        await authorTenant.mutateAsync({ scope: "tenant", tenantId, op: { kind: "hide", id } });
      }
      await Promise.all([content.refetch(), hiddenQuery.refetch()]);
      toast("Asset hidden", { action: { label: "Undo", onClick: () => runOp({ kind: "unhide", id }) } });
    } catch {
      toast.error("Could not hide the asset");
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    const item = libraryDraftToItem(draft);
    if (!item.title) {
      toast.error("Add a title before saving");
      return;
    }
    const op = isNew ? ({ kind: "add", item } as const) : ({ kind: "patch", id: item.id, patch: item } as const);
    const ok = await runOp(op);
    if (ok) {
      setDraft(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Library authoring</p>
          <p className="text-sm leading-6 text-slate-300">
            Edit, hide, or add library resources for {scope === "core" ? "all clients" : "this client"}. {scope === "tenant" ? "You can also hide a CHCG core asset for this client only." : "Edits reach every client unless they override them."} Saved changes surface live in the Library view.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className={`w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${scope === "core" ? "border-cyan-400/30 text-cyan-100" : "border-emerald-400/30 text-emerald-100"}`}>
            {scope === "core" ? "Core · all tenants" : "Tenant override"}
          </Badge>
          <Button type="button" onClick={() => { setDraft(blankLibraryDraft()); setIsNew(true); }} className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
            <Plus className="mr-2 h-4 w-4" /> Add asset
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {content.isLoading ? <p className="text-sm text-slate-400">Loading library…</p> : null}
        {assets.length === 0 && !content.isLoading ? <p className="text-sm text-slate-400">No library assets in this scope yet — add one above.</p> : null}
        {assets.map((asset) => (
          <div key={asset.id} className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] ${asset.sourceKind === "chcg" ? "border-cyan-400/30 text-cyan-100" : "border-emerald-400/30 text-emerald-100"}`}>
                  {asset.sourceKind === "chcg" ? "CHCG core" : "Client"}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/15 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300">{asset.format}</Badge>
                <span className="text-[11px] text-slate-500">{asset.category}</span>
              </div>
              <p className="text-sm font-medium leading-6 text-white">{asset.title}</p>
              <p className="text-xs leading-5 text-slate-400">{asset.summary}</p>
              <p className="text-[11px] text-slate-500">Roles: {(asset.linkedRoles ?? []).join(", ")} · Tags: {(asset.tags ?? []).join(", ") || "—"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft(assetToLibraryDraft(asset)); setIsNew(false); }} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white">
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => hideAsset(asset.id)} className="rounded-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-200" title={scope === "tenant" && asset.sourceKind === "chcg" ? "Hide this CHCG asset for this client" : "Hide from the library"}>
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <HiddenItemsShelf
        items={hidden.map((asset: { id: string; title: string; sourceKind: "chcg" | "client_upload"; category: string }) => ({ id: asset.id, label: `${asset.title} · ${asset.sourceKind === "chcg" ? "CHCG core" : "Client upload"} · ${asset.category}` }))}
        onRestore={(id) => runOp({ kind: "unhide", id })}
        noun="asset"
      />

      <Dialog open={draft !== null} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add library asset" : "Edit library asset"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Saving writes to {scopeLabel}. Source is set automatically ({scope === "core" ? "CHCG core" : "client upload"}).
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Title</Label>
                <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`h-9 ${inputClass}`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Summary</Label>
                <Textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} className={inputClass} rows={2} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Category</Label>
                  <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={`h-9 ${inputClass}`} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Format</Label>
                  <Select value={draft.format} onValueChange={(value) => setDraft({ ...draft, format: value as LibraryDraft["format"] })}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIBRARY_FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>{format}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Tags (comma-separated)</Label>
                <Input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="e.g. documentation, qa, coaching" className={`h-9 ${inputClass}`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Linked roles</Label>
                <div className="flex flex-wrap gap-2">
                  {LIBRARY_ROLES.map((role) => {
                    const active = draft.linkedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setDraft({ ...draft, linkedRoles: active ? draft.linkedRoles.filter((entry) => entry !== role) : [...draft.linkedRoles, role] })}
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] transition ${active ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100" : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"}`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Source label</Label>
                <Input value={draft.sourceLabel} onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })} placeholder="e.g. CHCG playbook · Client SOP" className={`h-9 ${inputClass}`} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="button" onClick={saveDraft} disabled={saving} className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Lesson authoring (LESSON3 / Wave 3) ─────────────────────────────────────
// Edits resolve on the pre-expansion seed slides. Field access is scope-aware:
// client_admin may only light-patch bullets[]/speakerNotes[] on CHCG-owned slides
// (other fields shown read-only) but has full control of tenant-added slides.
const LESSON_STAGES: Array<{ key: "brief" | "practice" | "apply"; label: string }> = [
  { key: "brief", label: "Learn" },
  { key: "practice", label: "Practice" },
  { key: "apply", label: "Apply" },
];

type SlideDraft = {
  id: string;
  eyebrow: string;
  title: string;
  narrative: string;
  bullets: string; // newline-separated in the form
  speakerNotes: string; // newline-separated in the form
  visualTone: string;
  isNew: boolean;
  origin: "core" | "tenant";
};

function slideToDraft(slide: { id: string; eyebrow?: string; title?: string; narrative?: string; bullets?: string[]; speakerNotes?: string[]; visualTone?: string; origin?: "core" | "tenant" }): SlideDraft {
  return {
    id: slide.id,
    eyebrow: slide.eyebrow ?? "",
    title: slide.title ?? "",
    narrative: slide.narrative ?? "",
    bullets: (slide.bullets ?? []).join("\n"),
    speakerNotes: (slide.speakerNotes ?? []).join("\n"),
    visualTone: slide.visualTone ?? "",
    isNew: false,
    origin: slide.origin ?? "core",
  };
}

function LessonAuthoring({ scope, tenantId }: { scope: "core" | "tenant"; tenantId?: string }) {
  const moduleList = trpc.demo.previewAuthoringQuiz.useQuery({ scope, tenantId });
  const modules = moduleList.data?.modules ?? [];
  const [chosenModuleId, setChosenModuleId] = useState<string | null>(null);
  const [stage, setStage] = useState<"brief" | "practice" | "apply">("brief");
  const activeModuleId = chosenModuleId ?? modules[0]?.moduleId ?? null;

  const lesson = trpc.demo.previewAuthoringLesson.useQuery({ scope, tenantId, moduleId: activeModuleId ?? "" }, { enabled: Boolean(activeModuleId) });
  const authorTenant = trpc.demo.previewAuthorLessonTenant.useMutation();
  const authorCore = trpc.demo.previewAuthorLessonCore.useMutation();
  const saving = authorTenant.isPending || authorCore.isPending;
  const [draft, setDraft] = useState<SlideDraft | null>(null);

  const slides = lesson.data?.stages[stage] ?? [];
  const hidden = lesson.data?.hiddenSlides[stage] ?? [];

  const runOp = async (op: unknown): Promise<boolean> => {
    if (!activeModuleId) return false;
    try {
      if (scope === "core") {
        await authorCore.mutateAsync({ moduleId: activeModuleId, stage, op: op as never });
      } else {
        await authorTenant.mutateAsync({ tenantId, moduleId: activeModuleId, stage, op: op as never });
      }
      await lesson.refetch();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(/locked/i.test(message) ? "That field is CHCG-owned and can't be edited here." : "Could not save the edit");
      return false;
    }
  };

  const hideSlide = async (id: string) => {
    if (await runOp({ kind: "hide", id })) {
      toast("Slide hidden", { action: { label: "Undo", onClick: () => runOp({ kind: "unhide", id }) } });
    }
  };

  const openNew = () => {
    if (!activeModuleId) return;
    setDraft({ id: `${activeModuleId}-${stage}-custom-${Date.now()}`, eyebrow: "", title: "", narrative: "", bullets: "", speakerNotes: "", visualTone: "", isNew: true, origin: "tenant" });
  };

  const saveDraft = async () => {
    if (!draft) return;
    const item = {
      id: draft.id,
      eyebrow: draft.eyebrow.trim(),
      title: draft.title.trim(),
      narrative: draft.narrative.trim(),
      bullets: draft.bullets.split("\n").map((line) => line.trim()).filter(Boolean),
      speakerNotes: draft.speakerNotes.split("\n").map((line) => line.trim()).filter(Boolean),
      visualTone: draft.visualTone.trim(),
    };
    if (!item.title) {
      toast.error("Add a slide title before saving");
      return;
    }
    const locked = scope === "tenant" && draft.origin === "core" && !draft.isNew;
    const op = draft.isNew
      ? { kind: "add", item }
      : { kind: "patch", id: draft.id, patch: locked ? { bullets: item.bullets, speakerNotes: item.speakerNotes } : item };
    if (await runOp(op)) {
      setDraft(null);
      toast.success(`Saved to ${scope === "core" ? "CHCG core content" : "this tenant"}`);
    }
  };

  const draftLocked = draft ? scope === "tenant" && draft.origin === "core" && !draft.isNew : false;
  const feedsCheckpoint = (index: number): string | null =>
    stage === "brief" && index === 0 ? "Brief checkpoint" : stage === "practice" && index === 0 ? "Practice checkpoint" : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Lesson authoring</p>
          <p className="text-sm leading-6 text-slate-300">
            Edit the lesson seed slides for {scope === "core" ? "all clients" : "this client"}. {scope === "tenant" ? "On CHCG-owned slides you can refine bullets and coach notes; add your own slides for full control." : "Edits reach every client unless they override them."} An edited slide re-derives its companion slides live.
          </p>
        </div>
        <Badge variant="outline" className={`w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${scope === "core" ? "border-cyan-400/30 text-cyan-100" : "border-emerald-400/30 text-emerald-100"}`}>
          {scope === "core" ? "Core · all tenants" : "Tenant override"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Module</Label>
          <Select value={activeModuleId ?? undefined} onValueChange={setChosenModuleId}>
            <SelectTrigger className={inputClass}><SelectValue placeholder="Select a module" /></SelectTrigger>
            <SelectContent>
              {modules.map((module) => (<SelectItem key={module.moduleId} value={module.moduleId}>{module.moduleTitle} · {module.journeyTitle}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={openNew} disabled={!activeModuleId} className="rounded-full bg-white text-slate-950 hover:bg-slate-100"><Plus className="mr-2 h-4 w-4" /> Add slide</Button>
      </div>

      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {LESSON_STAGES.map((entry) => (
          <button key={entry.key} type="button" onClick={() => setStage(entry.key)} className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${stage === entry.key ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"}`}>{entry.label}</button>
        ))}
      </div>

      <div className="space-y-2">
        {lesson.isLoading ? <p className="text-sm text-slate-400">Loading lesson…</p> : null}
        {slides.length === 0 && !lesson.isLoading ? <p className="text-sm text-slate-400">No slides in this stage yet — add one above.</p> : null}
        {slides.map((slide: { id: string; eyebrow?: string; title?: string; narrative?: string; bullets?: string[]; origin?: "core" | "tenant" }, index: number) => {
          const isTenantSlide = slide.origin === "tenant";
          const hint = feedsCheckpoint(index);
          return (
            <div key={slide.id} className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] ${isTenantSlide ? "border-emerald-400/30 text-emerald-100" : "border-cyan-400/30 text-cyan-100"}`}>{isTenantSlide ? "Tenant slide" : "CHCG core"}</Badge>
                  {slide.eyebrow ? <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{slide.eyebrow}</span> : null}
                  {hint ? <Badge variant="outline" className="rounded-full border-amber-400/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-100">Feeds {hint}</Badge> : null}
                </div>
                <p className="text-sm font-medium leading-6 text-white">{slide.title}</p>
                <p className="line-clamp-2 text-xs leading-5 text-slate-400">{slide.narrative}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(slideToDraft(slide))} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => hideSlide(slide.id)} className="rounded-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-200" title="Hide this slide"><EyeOff className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      <HiddenItemsShelf items={hidden.map((slide: { id: string; title?: string }) => ({ id: slide.id, label: slide.title ?? slide.id }))} onRestore={(id) => runOp({ kind: "unhide", id })} noun="slide" />

      <Dialog open={draft !== null} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.isNew ? "Add slide" : "Edit slide"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {draftLocked ? "This is a CHCG-owned slide — you can refine the bullets and coach notes; the rest is locked." : `Saving writes to ${scope === "core" ? "CHCG core content" : "this tenant"}. Editing a slide re-derives its companion slides.`}
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">Title {draftLocked ? <Lock className="h-3 w-3 text-slate-500" /> : null}</Label>
                  <Input value={draft.title} disabled={draftLocked} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`h-9 ${inputClass} disabled:opacity-50`} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">Eyebrow {draftLocked ? <Lock className="h-3 w-3 text-slate-500" /> : null}</Label>
                  <Input value={draft.eyebrow} disabled={draftLocked} onChange={(event) => setDraft({ ...draft, eyebrow: event.target.value })} className={`h-9 ${inputClass} disabled:opacity-50`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">Narrative {draftLocked ? <Lock className="h-3 w-3 text-slate-500" /> : null}</Label>
                <Textarea value={draft.narrative} disabled={draftLocked} onChange={(event) => setDraft({ ...draft, narrative: event.target.value })} className={`${inputClass} disabled:opacity-50`} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Bullets (one per line)</Label>
                <Textarea value={draft.bullets} onChange={(event) => setDraft({ ...draft, bullets: event.target.value })} className={inputClass} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Coach notes (one per line)</Label>
                <Textarea value={draft.speakerNotes} onChange={(event) => setDraft({ ...draft, speakerNotes: event.target.value })} className={inputClass} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">Visual tone {draftLocked ? <Lock className="h-3 w-3 text-slate-500" /> : null}</Label>
                <Input value={draft.visualTone} disabled={draftLocked} onChange={(event) => setDraft({ ...draft, visualTone: event.target.value })} className={`h-9 ${inputClass} disabled:opacity-50`} />
              </div>
              {draftLocked ? <p className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">Locked fields are CHCG-owned. To change them for this client, add a tenant slide instead.</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="button" onClick={saveDraft} disabled={saving} className="rounded-full bg-white text-slate-950 hover:bg-slate-100"><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save slide"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Brief authoring (LESSON3 / Wave 3) ──────────────────────────────────────
type BriefDraft = { heroTitle: string; heroSummary: string; evidenceLabel: string; scenarioTitle: string; scenarioSituation: string; scenarioLearnerTask: string; scenarioSuccessSignals: string };

function BriefAuthoring({ scope, tenantId }: { scope: "core" | "tenant"; tenantId?: string }) {
  const moduleList = trpc.demo.previewAuthoringQuiz.useQuery({ scope, tenantId });
  const modules = moduleList.data?.modules ?? [];
  const [chosenModuleId, setChosenModuleId] = useState<string | null>(null);
  const activeModuleId = chosenModuleId ?? modules[0]?.moduleId ?? null;

  const lesson = trpc.demo.previewAuthoringLesson.useQuery({ scope, tenantId, moduleId: activeModuleId ?? "" }, { enabled: Boolean(activeModuleId) });
  const brief = lesson.data?.brief;
  const authorTenant = trpc.demo.previewAuthorBriefTenant.useMutation();
  const authorCore = trpc.demo.previewAuthorBriefCore.useMutation();
  const saving = authorTenant.isPending || authorCore.isPending;
  const [draft, setDraft] = useState<BriefDraft | null>(null);
  const tenantLocked = scope === "tenant";

  const openEdit = () => {
    if (!brief) return;
    setDraft({
      heroTitle: brief.heroTitle, heroSummary: brief.heroSummary, evidenceLabel: brief.evidenceLabel,
      scenarioTitle: brief.scenarioTitle, scenarioSituation: brief.scenarioSituation, scenarioLearnerTask: brief.scenarioLearnerTask,
      scenarioSuccessSignals: (brief.scenarioSuccessSignals ?? []).join("\n"),
    });
  };

  const save = async () => {
    if (!draft || !activeModuleId) return;
    const full = {
      heroTitle: draft.heroTitle.trim(), heroSummary: draft.heroSummary.trim(), evidenceLabel: draft.evidenceLabel.trim(),
      scenarioTitle: draft.scenarioTitle.trim(), scenarioSituation: draft.scenarioSituation.trim(), scenarioLearnerTask: draft.scenarioLearnerTask.trim(),
      scenarioSuccessSignals: draft.scenarioSuccessSignals.split("\n").map((line) => line.trim()).filter(Boolean),
    };
    const patch = tenantLocked
      ? { heroSummary: full.heroSummary, scenarioSituation: full.scenarioSituation, scenarioLearnerTask: full.scenarioLearnerTask, scenarioSuccessSignals: full.scenarioSuccessSignals }
      : full;
    try {
      const payload = { moduleId: activeModuleId, op: { kind: "patch" as const, id: activeModuleId, patch } };
      if (scope === "core") await authorCore.mutateAsync(payload);
      else await authorTenant.mutateAsync({ ...payload, tenantId });
      await lesson.refetch();
      setDraft(null);
      toast.success(`Brief saved to ${scope === "core" ? "CHCG core content" : "this tenant"}`);
    } catch {
      toast.error("Could not save the brief");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Brief authoring</p>
          <p className="text-sm leading-6 text-slate-300">Edit the module intro + practice brief for {scope === "core" ? "all clients" : "this client"}. {scope === "tenant" ? "You can tailor the summary and practice scenario; the headline and evidence label are CHCG-owned." : ""}</p>
        </div>
        <Badge variant="outline" className={`w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${scope === "core" ? "border-cyan-400/30 text-cyan-100" : "border-emerald-400/30 text-emerald-100"}`}>{scope === "core" ? "Core · all tenants" : "Tenant override"}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Module</Label>
          <Select value={activeModuleId ?? undefined} onValueChange={setChosenModuleId}>
            <SelectTrigger className={inputClass}><SelectValue placeholder="Select a module" /></SelectTrigger>
            <SelectContent>{modules.map((module) => (<SelectItem key={module.moduleId} value={module.moduleId}>{module.moduleTitle} · {module.journeyTitle}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={openEdit} disabled={!brief} className="rounded-full bg-white text-slate-950 hover:bg-slate-100"><Pencil className="mr-2 h-4 w-4" /> Edit brief</Button>
      </div>

      {lesson.isLoading ? <p className="text-sm text-slate-400">Loading brief…</p> : null}
      {brief ? (
        <div className="space-y-3 rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Headline</p>
            <p className="text-sm font-semibold text-white">{brief.heroTitle}</p>
          </div>
          <div className="space-y-1"><p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Summary</p><p className="text-xs leading-5 text-slate-300">{brief.heroSummary}</p></div>
          <div className="space-y-1"><p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Evidence label</p><p className="text-xs leading-5 text-slate-400">{brief.evidenceLabel}</p></div>
          <div className="space-y-1"><p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Practice scenario · {brief.scenarioTitle}</p><p className="text-xs leading-5 text-slate-300">{brief.scenarioSituation}</p></div>
        </div>
      ) : null}

      <Dialog open={draft !== null} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit module brief</DialogTitle>
            <DialogDescription className="text-slate-400">{tenantLocked ? "Headline, evidence label, and scenario title are CHCG-owned (locked)." : `Saving writes to ${scope === "core" ? "CHCG core content" : "this tenant"}.`}</DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">Headline {tenantLocked ? <Lock className="h-3 w-3 text-slate-500" /> : null}</Label>
                <Input value={draft.heroTitle} disabled={tenantLocked} onChange={(event) => setDraft({ ...draft, heroTitle: event.target.value })} className={`h-9 ${inputClass} disabled:opacity-50`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Summary</Label>
                <Textarea value={draft.heroSummary} onChange={(event) => setDraft({ ...draft, heroSummary: event.target.value })} className={inputClass} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">Evidence label {tenantLocked ? <Lock className="h-3 w-3 text-slate-500" /> : null}</Label>
                <Input value={draft.evidenceLabel} disabled={tenantLocked} onChange={(event) => setDraft({ ...draft, evidenceLabel: event.target.value })} className={`h-9 ${inputClass} disabled:opacity-50`} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">Scenario title {tenantLocked ? <Lock className="h-3 w-3 text-slate-500" /> : null}</Label>
                  <Input value={draft.scenarioTitle} disabled={tenantLocked} onChange={(event) => setDraft({ ...draft, scenarioTitle: event.target.value })} className={`h-9 ${inputClass} disabled:opacity-50`} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Agent task</Label>
                  <Input value={draft.scenarioLearnerTask} onChange={(event) => setDraft({ ...draft, scenarioLearnerTask: event.target.value })} className={`h-9 ${inputClass}`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Scenario situation</Label>
                <Textarea value={draft.scenarioSituation} onChange={(event) => setDraft({ ...draft, scenarioSituation: event.target.value })} className={inputClass} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Success signals (one per line)</Label>
                <Textarea value={draft.scenarioSuccessSignals} onChange={(event) => setDraft({ ...draft, scenarioSuccessSignals: event.target.value })} className={inputClass} rows={3} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="button" onClick={save} disabled={saving} className="rounded-full bg-white text-slate-950 hover:bg-slate-100"><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save brief"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Deck-visual authoring (DECK4 / Wave 5) ──────────────────────────────────
// Per-module editing of the converted PowerPoint images: title/caption text, a
// secure image replace/revert (DECK3), and hide/restore. Deck slides can't be
// added; scorecard + deck identity are read-only.
type DeckDraft = {
  id: string; // slide index (string)
  title: string;
  caption: string;
  file: string;
  imageUrl: string; // current preview
  scorecard?: string;
  imageReplaced: boolean;
  pendingImageKey?: string | null; // undefined = no change, string = new key, null = revert
  uploading: boolean;
  uploadError: string | null;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the selected file"));
    reader.readAsDataURL(file);
  });
}

function DeckAuthoring({ scope, tenantId }: { scope: "core" | "tenant"; tenantId?: string }) {
  const moduleList = trpc.demo.previewAuthoringQuiz.useQuery({ scope, tenantId });
  const modules = moduleList.data?.modules ?? [];
  const [chosenModuleId, setChosenModuleId] = useState<string | null>(null);
  const activeModuleId = chosenModuleId ?? modules[0]?.moduleId ?? null;

  const deck = trpc.demo.previewAuthoringDeck.useQuery({ scope, tenantId, moduleId: activeModuleId ?? "" }, { enabled: Boolean(activeModuleId) });
  const authorTenant = trpc.demo.previewAuthorDeckTenant.useMutation();
  const authorCore = trpc.demo.previewAuthorDeckCore.useMutation();
  const uploadImage = trpc.demo.previewUploadDeckImage.useMutation();
  const saving = authorTenant.isPending || authorCore.isPending;
  const [draft, setDraft] = useState<DeckDraft | null>(null);

  const slides = deck.data?.slides ?? [];
  const hidden = deck.data?.hiddenSlides ?? [];
  const sourceDeck = deck.data?.sourceDeck ?? "this deck";
  const moduleTitle = deck.data?.moduleTitle ?? "this module";

  const runOp = async (op: unknown): Promise<boolean> => {
    if (!activeModuleId) return false;
    try {
      if (scope === "core") {
        await authorCore.mutateAsync({ moduleId: activeModuleId, op: op as never });
      } else {
        await authorTenant.mutateAsync({ tenantId, moduleId: activeModuleId, op: op as never });
      }
      await deck.refetch();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(/locked|does not belong/i.test(message) ? "That change isn't allowed here." : "Could not save the edit");
      return false;
    }
  };

  const hideSlide = async (id: string) => {
    if (await runOp({ kind: "hide", id })) {
      toast("Deck slide hidden", { action: { label: "Undo", onClick: () => runOp({ kind: "unhide", id }) } });
    }
  };

  const pickImage = async (file: File) => {
    setDraft((current) => (current ? { ...current, uploading: true, uploadError: null } : current));
    try {
      const dataBase64 = await fileToBase64(file);
      const result = await uploadImage.mutateAsync({ scope, tenantId, dataBase64 });
      setDraft((current) => (current ? { ...current, uploading: false, pendingImageKey: result.imageKey, imageUrl: result.imageUrl, imageReplaced: true } : current));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setDraft((current) => (current ? { ...current, uploading: false, uploadError: message } : current));
    }
  };

  const revertImage = () => {
    setDraft((current) => (current ? { ...current, pendingImageKey: null, imageUrl: `/slides/${current.file}`, imageReplaced: false, uploadError: null } : current));
  };

  const saveDraft = async () => {
    if (!draft) return;
    const patch: Record<string, unknown> = { title: draft.title.trim(), caption: draft.caption.trim() };
    if (draft.pendingImageKey !== undefined) patch.imageKey = draft.pendingImageKey;
    if (await runOp({ kind: "patch", id: draft.id, patch })) {
      setDraft(null);
      toast.success(`Saved to ${scope === "core" ? "CHCG core content" : "this tenant"}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Deck authoring</p>
          <p className="text-sm leading-6 text-slate-300">
            Edit the deck slides (titles, captions, images) for {scope === "core" ? "all clients" : "this client"}. Uploaded images are validated server-side (PNG/JPEG/WEBP, ≤5&nbsp;MB).
          </p>
        </div>
        <Badge variant="outline" className={`w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${scope === "core" ? "border-cyan-400/30 text-cyan-100" : "border-emerald-400/30 text-emerald-100"}`}>
          {scope === "core" ? "Core · all tenants" : "Tenant override"}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Module</Label>
        <Select value={activeModuleId ?? undefined} onValueChange={setChosenModuleId}>
          <SelectTrigger className={inputClass}><SelectValue placeholder="Select a module" /></SelectTrigger>
          <SelectContent>
            {modules.map((module) => (<SelectItem key={module.moduleId} value={module.moduleId}>{module.moduleTitle} · {module.journeyTitle}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {deck.data ? (
        <p className="rounded-[1rem] border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-2.5 text-xs leading-5 text-amber-100/90">
          Editing the <span className="font-semibold">{sourceDeck}</span> deck as used by <span className="font-semibold">{moduleTitle}</span> — other modules that share this deck are unaffected.
        </p>
      ) : null}

      <div className="space-y-2">
        {deck.isLoading ? <p className="text-sm text-slate-400">Loading deck…</p> : null}
        {slides.map((slide: { id: string; index: number; title?: string; caption?: string; imageUrl: string; scorecard?: string; imageReplaced?: boolean }) => (
          <div key={slide.id} className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-3">
            <div className="flex min-w-0 gap-3">
              <img src={slide.imageUrl} alt={slide.title ?? `Slide ${slide.index + 1}`} loading="lazy" className="h-16 w-24 shrink-0 rounded-[0.7rem] border border-white/10 bg-slate-900 object-cover" />
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-cyan-400/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-cyan-100">Slide {slide.index + 1}</Badge>
                  {slide.imageReplaced ? <Badge variant="outline" className="rounded-full border-emerald-400/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-emerald-100">Image replaced</Badge> : null}
                  {slide.scorecard ? <Badge variant="outline" className="rounded-full border-fuchsia-400/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-fuchsia-100">Scorecard · {slide.scorecard}</Badge> : null}
                </div>
                <p className="text-sm font-medium leading-5 text-white">{slide.title}</p>
                <p className="line-clamp-2 text-xs leading-5 text-slate-400">{slide.caption}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft({ id: slide.id, title: slide.title ?? "", caption: slide.caption ?? "", file: slide.imageUrl.startsWith("/slides/") ? slide.imageUrl.slice("/slides/".length) : "", imageUrl: slide.imageUrl, scorecard: slide.scorecard, imageReplaced: Boolean(slide.imageReplaced), uploading: false, uploadError: null })} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => hideSlide(slide.id)} className="rounded-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-200" title="Hide this deck slide"><EyeOff className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <HiddenItemsShelf items={hidden.map((slide: { id: string; index: number; title?: string }) => ({ id: slide.id, label: slide.title ? `Slide ${slide.index + 1} · ${slide.title}` : `Slide ${slide.index + 1}` }))} onRestore={(id) => runOp({ kind: "unhide", id })} noun="deck slide" />

      <Dialog open={draft !== null} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit deck slide</DialogTitle>
            <DialogDescription className="text-slate-400">Saving writes to {scope === "core" ? "CHCG core content" : "this tenant"}. The image, title, and caption change for this module only.</DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Image</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <img src={draft.imageUrl} alt={draft.title} className="h-24 w-36 rounded-[0.8rem] border border-white/10 bg-slate-900 object-cover" />
                  <div className="space-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-slate-100 hover:bg-white/10">
                      <Upload className="h-3.5 w-3.5" /> {draft.uploading ? "Uploading…" : "Replace image"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={draft.uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void pickImage(file); event.target.value = ""; }} />
                    </label>
                    {draft.imageReplaced ? (
                      <Button type="button" size="sm" variant="ghost" onClick={revertImage} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Revert to original</Button>
                    ) : null}
                    <p className="text-[11px] text-slate-500">PNG, JPEG, or WEBP · ≤ 5 MB. Validated server-side.</p>
                  </div>
                </div>
                {draft.uploadError ? <p className="rounded-[0.8rem] border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{draft.uploadError}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Title</Label>
                <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`h-9 ${inputClass}`} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Caption</Label>
                <Textarea value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} className={inputClass} rows={3} />
              </div>
              {draft.scorecard ? (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">Scorecard binding <Lock className="h-3 w-3 text-slate-500" /></Label>
                  <Input value={draft.scorecard} disabled className={`h-9 ${inputClass} disabled:opacity-50`} />
                  <p className="text-[11px] text-slate-500">The scorecard binding and the source deck are CHCG-owned and can't be changed here.</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="button" onClick={saveDraft} disabled={saving || draft?.uploading} className="rounded-full bg-white text-slate-950 hover:bg-slate-100"><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save slide"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Notification delivery surface (DELIVER3) ────────────────────────────────
// Read-only outbox + per-type rendered-email previews, plus a preferences/opt-out
// editor for a sample learner. All reads/writes go through the demo router's
// notification* procedures; StubProvider means nothing actually sends.
const REMINDER_TYPES = [
  "training_due",
  "coaching_follow_up",
  "one_on_one_scheduled",
  "knowledge_check_failed",
  "coaching_cadence_gap",
  "announcement",
] as const;
type NotifReminderType = (typeof REMINDER_TYPES)[number];
const REMINDER_TYPE_LABELS: Record<NotifReminderType, string> = {
  training_due: "Training due",
  coaching_follow_up: "Coaching follow-up",
  one_on_one_scheduled: "One-on-one scheduled",
  knowledge_check_failed: "Knowledge check failed",
  coaching_cadence_gap: "Coaching cadence gap",
  announcement: "Announcement",
};
const OUTBOX_STATUS_CLASS: Record<string, string> = {
  stubbed: "border-amber-400/30 text-amber-100",
  sent: "border-emerald-400/30 text-emerald-100",
  failed: "border-rose-400/30 text-rose-100",
  skipped: "border-slate-400/30 text-slate-300",
};
// Sample learner whose preferences the admin edits in this demo surface.
const SAMPLE_PREF_USER = { id: "u-learn-1", name: "Nina Patel (sample learner)" };

function NotificationsSurface({ tenantId }: { tenantId?: string }) {
  const prefTenantId = tenantId ?? "atlas-operations";
  const outbox = trpc.demo.notificationOutbox.useQuery();
  const previews = trpc.demo.notificationPreviews.useQuery({ tenantId });
  const preferences = trpc.demo.notificationPreferences.useQuery({ userId: SAMPLE_PREF_USER.id, tenantId: prefTenantId });
  const setPreference = trpc.demo.setNotificationPreference.useMutation();
  const setUnsub = trpc.demo.setNotificationUnsubscribe.useMutation();
  const [openPreview, setOpenPreview] = useState<NotifReminderType | null>("training_due");

  const rows = outbox.data ?? [];
  const prefRows = preferences.data ?? [];
  const unsubscribed = prefRows.some((row) => row.unsubscribedAt);
  const isTypeEnabled = (type: NotifReminderType): boolean => {
    if (unsubscribed) return false;
    const match = prefRows.filter((row) => (row.reminderType === type || row.reminderType === "") && (row.channel === "email" || row.channel === ""));
    if (match.length === 0) return true;
    const best = match.reduce((top, row) => ((row.reminderType !== "" ? 2 : 0) + (row.channel !== "" ? 1 : 0) > (top.reminderType !== "" ? 2 : 0) + (top.channel !== "" ? 1 : 0) ? row : top), match[0]!);
    return best.enabled;
  };

  const toggleType = async (type: NotifReminderType, enabled: boolean) => {
    try {
      await setPreference.mutateAsync({ userId: SAMPLE_PREF_USER.id, tenantId: prefTenantId, reminderType: type, channel: "email", enabled });
      await preferences.refetch();
    } catch {
      toast.error("Could not update the preference");
    }
  };
  const toggleUnsub = async (next: boolean) => {
    try {
      await setUnsub.mutateAsync({ userId: SAMPLE_PREF_USER.id, tenantId: prefTenantId, unsubscribe: next });
      await preferences.refetch();
      toast.success(next ? "Unsubscribed from all notifications" : "Re-subscribed to notifications");
    } catch {
      toast.error("Could not update the subscription");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Notification delivery</p>
          <p className="text-sm leading-6 text-slate-300">
            Event-triggered emails render here and record to the delivery outbox. Sending is stubbed by default — nothing leaves the platform until a verified sending domain and provider credentials are configured.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full border-amber-400/30 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-amber-100">Stub provider · no real send</Badge>
      </div>

      {/* Outbox */}
      <div className="space-y-2 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-300" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Delivery outbox ({rows.length})</p>
        </div>
        {outbox.isLoading ? <p className="text-sm text-slate-400">Loading outbox…</p> : null}
        {rows.length === 0 && !outbox.isLoading ? (
          <p className="text-sm text-slate-400">No delivery attempts yet. Assign retraining or log a coaching session to trigger one.</p>
        ) : null}
        {rows.map((row) => (
          <div key={row.idempotencyKey} className="flex flex-wrap items-center justify-between gap-2 rounded-[1rem] border border-white/8 bg-white/[0.02] px-3 py-2.5">
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-medium text-white">{row.renderedSubject}</p>
              <p className="text-[11px] text-slate-500">{REMINDER_TYPE_LABELS[row.reminderType as NotifReminderType] ?? row.reminderType} · {row.recipient}</p>
            </div>
            <Badge variant="outline" className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ${OUTBOX_STATUS_CLASS[row.status] ?? "border-white/15 text-slate-300"}`}>{row.status}</Badge>
          </div>
        ))}
      </div>

      {/* Template previews */}
      <div className="space-y-2 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-300" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Rendered email previews</p>
        </div>
        {(previews.data ?? []).map((preview) => {
          const isOpen = openPreview === preview.reminderType;
          return (
            <div key={preview.reminderType} className="rounded-[1rem] border border-white/8 bg-white/[0.02]">
              <button type="button" onClick={() => setOpenPreview(isOpen ? null : (preview.reminderType as NotifReminderType))} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{REMINDER_TYPE_LABELS[preview.reminderType as NotifReminderType] ?? preview.reminderType}</p>
                  <p className="truncate text-sm font-medium text-white">{preview.subject}</p>
                </div>
                {preview.ics ? <Badge variant="outline" className="shrink-0 rounded-full border-cyan-400/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-100"><CalendarClock className="mr-1 h-3 w-3" /> .ics</Badge> : null}
              </button>
              {isOpen ? (
                <div className="space-y-2 border-t border-white/8 px-3 py-3">
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-[0.8rem] bg-slate-950/60 p-3 text-[11px] leading-5 text-slate-300">{preview.text}</pre>
                  {preview.ics ? (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">Calendar invite (.ics)</p>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-[0.8rem] bg-slate-950/60 p-3 text-[11px] leading-5 text-cyan-100/80">{preview.ics}</pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Preferences / opt-out */}
      <div className="space-y-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MailX className="h-4 w-4 text-slate-300" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Preferences · {SAMPLE_PREF_USER.name}</p>
          </div>
          <button
            type="button"
            onClick={() => toggleUnsub(!unsubscribed)}
            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] transition ${unsubscribed ? "border-rose-400/40 bg-rose-400/15 text-rose-100" : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"}`}
          >
            {unsubscribed ? "Unsubscribed — click to resubscribe" : "Unsubscribe from all"}
          </button>
        </div>
        <div className="space-y-1.5">
          {REMINDER_TYPES.map((type) => {
            const enabled = isTypeEnabled(type);
            return (
              <div key={type} className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-white/[0.02] px-3 py-2">
                <p className="text-sm text-slate-200">{REMINDER_TYPE_LABELS[type]}</p>
                <button
                  type="button"
                  disabled={unsubscribed}
                  onClick={() => toggleType(type, !enabled)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition disabled:opacity-40 ${enabled ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100" : "border-white/15 bg-white/5 text-slate-400 hover:bg-white/10"}`}
                >
                  {enabled ? "Email on" : "Email off"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">Toggling writes a per-user/tenant row to notification_preferences; an unsubscribe sets a global opt-out that suppresses every type.</p>
      </div>
    </div>
  );
}

export function ContentAuthoringPanel({ scope, tenantId }: { scope: "core" | "tenant"; tenantId?: string }) {
  const [contentType, setContentType] = useState<"quizzes" | "library" | "lessons" | "briefs" | "decks" | "notifications">("quizzes");
  const content = trpc.demo.previewAuthoringQuiz.useQuery({ scope, tenantId });
  const modules = content.data?.modules ?? [];
  const [chosenModuleId, setChosenModuleId] = useState<string | null>(null);
  const [chosenCheckpoint, setChosenCheckpoint] = useState<CheckpointKey>("application");
  const activeModuleId = chosenModuleId ?? modules[0]?.moduleId ?? null;
  const activeModule = modules.find((module) => module.moduleId === activeModuleId) ?? null;
  const activeCheckpoint =
    activeModule?.checkpoints.find((entry) => entry.checkpoint === chosenCheckpoint) ?? activeModule?.checkpoints[0] ?? null;

  const authorTenant = trpc.demo.previewAuthorQuizTenant.useMutation();
  const authorCore = trpc.demo.previewAuthorQuizCore.useMutation();
  const saving = authorTenant.isPending || authorCore.isPending;

  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [passScore, setPassScore] = useState("");
  const [passPercent, setPassPercent] = useState("");

  const scopeLabel = scope === "core" ? "CHCG core content" : "this tenant";

  const runOp = async (op: Parameters<typeof authorTenant.mutateAsync>[0]["op"]) => {
    if (!activeModuleId) return;
    try {
      if (scope === "core") {
        await authorCore.mutateAsync({ scope: "core", moduleId: activeModuleId, checkpoint: chosenCheckpoint, op });
      } else {
        await authorTenant.mutateAsync({ scope: "tenant", tenantId, moduleId: activeModuleId, checkpoint: chosenCheckpoint, op });
      }
      await content.refetch();
      toast.success(`Saved to ${scopeLabel}`);
      return true;
    } catch {
      toast.error("Could not save the edit");
      return false;
    }
  };

  const openEdit = (question: TrainingApplicationQuestion) => {
    setDraft(toDraft(question));
    setIsNew(false);
  };
  const openNew = () => {
    if (!activeModuleId) return;
    setDraft(blankDraft(activeModuleId, chosenCheckpoint));
    setIsNew(true);
  };

  const saveDraft = async () => {
    if (!draft) return;
    const question = draftToQuestion(draft);
    if (!question.prompt) {
      toast.error("Add a question prompt before saving");
      return;
    }
    const op = isNew
      ? ({ kind: "add", item: question } as const)
      : ({ kind: "patch", id: question.id, patch: question } as const);
    const ok = await runOp(op);
    if (ok) {
      setDraft(null);
    }
  };

  const savePassRule = async () => {
    const meta: { passingScore?: number; passingPercent?: number } = {};
    const score = Number.parseInt(passScore, 10);
    const percent = Number.parseInt(passPercent, 10);
    if (Number.isFinite(score)) meta.passingScore = score;
    if (Number.isFinite(percent)) meta.passingPercent = percent;
    if (meta.passingScore === undefined && meta.passingPercent === undefined) {
      toast.error("Enter a passing score or percent first");
      return;
    }
    await runOp({ kind: "meta", meta });
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap rounded-full border border-white/10 bg-white/[0.03] p-1">
        {([["quizzes", "Quizzes"], ["library", "Library"], ["lessons", "Lessons"], ["briefs", "Briefs"], ["decks", "Decks"], ["notifications", "Notifications"]] as const).map(([option, label]) => (
          <button
            key={option}
            type="button"
            onClick={() => setContentType(option)}
            className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${contentType === option ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {contentType === "library" ? (
        <LibraryAuthoring scope={scope} tenantId={tenantId} />
      ) : contentType === "lessons" ? (
        <LessonAuthoring scope={scope} tenantId={tenantId} />
      ) : contentType === "briefs" ? (
        <BriefAuthoring scope={scope} tenantId={tenantId} />
      ) : contentType === "decks" ? (
        <DeckAuthoring scope={scope} tenantId={tenantId} />
      ) : contentType === "notifications" ? (
        <NotificationsSurface tenantId={tenantId} />
      ) : (
      <>
      <div className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Quiz authoring</p>
          <p className="text-sm leading-6 text-slate-300">
            Editing checkpoint questions for {scope === "core" ? "all clients" : "this client"}. Generated checkpoints load their questions as the editable baseline; saved edits surface live in the training player.
          </p>
        </div>
        <Badge variant="outline" className={`w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${scope === "core" ? "border-cyan-400/30 text-cyan-100" : "border-emerald-400/30 text-emerald-100"}`}>
          {scope === "core" ? "Core · all tenants" : "Tenant override"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Module</Label>
          <Select value={activeModuleId ?? undefined} onValueChange={setChosenModuleId}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Select a module" />
            </SelectTrigger>
            <SelectContent>
              {modules.map((module) => (
                <SelectItem key={module.moduleId} value={module.moduleId}>
                  {module.moduleTitle} · {module.journeyTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Checkpoint</Label>
          <Select value={chosenCheckpoint} onValueChange={(value) => setChosenCheckpoint(value as CheckpointKey)}>
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHECKPOINTS.map((entry) => (
                <SelectItem key={entry.key} value={entry.key}>{entry.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={openNew} disabled={!activeModuleId} className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
          <Plus className="mr-2 h-4 w-4" /> Add question
        </Button>
      </div>

      {activeCheckpoint ? (
        <div className="flex flex-wrap items-end gap-3 rounded-[1.1rem] border border-white/10 bg-slate-950/40 p-3">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Passing score</Label>
            <Input value={passScore} onChange={(event) => setPassScore(event.target.value)} inputMode="numeric" placeholder={`${activeCheckpoint.passingScore ?? "—"}`} className={`h-9 w-28 ${inputClass}`} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Passing %</Label>
            <Input value={passPercent} onChange={(event) => setPassPercent(event.target.value)} inputMode="numeric" placeholder={`${activeCheckpoint.passingPercent ?? "—"}`} className={`h-9 w-28 ${inputClass}`} />
          </div>
          <Button type="button" variant="outline" onClick={savePassRule} disabled={saving} className="rounded-full border-white/15 bg-white/5 text-slate-100 hover:bg-white/10">
            <Save className="mr-2 h-4 w-4" /> Save pass rule
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        {content.isLoading ? <p className="text-sm text-slate-400">Loading content…</p> : null}
        {activeCheckpoint?.questions.length === 0 ? <p className="text-sm text-slate-400">No questions in this checkpoint yet — add one above.</p> : null}
        {(activeCheckpoint?.questions ?? []).map((question) => (
          <div key={question.id} className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full border-white/15 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  {question.type === "short_answer" ? "Short answer" : "Multiple choice"}
                </Badge>
                {question.id.includes("-custom-") ? (
                  <Badge variant="outline" className="rounded-full border-amber-400/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-amber-100">Added</Badge>
                ) : null}
              </div>
              <p className="text-sm font-medium leading-6 text-white">{question.prompt}</p>
              {question.type === "short_answer" ? (
                <p className="text-xs text-slate-400">Accepts: {(question.acceptedAnswers ?? []).join(", ") || "—"}</p>
              ) : (
                <p className="text-xs text-slate-400">
                  {(question.options ?? []).length} options · correct: {(question.options ?? []).find((option) => option.id === question.correctOptionId)?.label ?? "—"}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(question)} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white">
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => runOp({ kind: "hide", id: question.id })} className="rounded-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-200" title="Hide from this checkpoint">
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => (!open ? setDraft(null) : undefined)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add question" : "Edit question"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Saving writes to {scopeLabel}. {scope === "core" ? "Every client sees this unless they override it." : "Only this client is affected; CHCG core is untouched."}
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Prompt</Label>
                <Textarea value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} className={inputClass} rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Type</Label>
                <Select value={draft.type} onValueChange={(value) => setDraft({ ...draft, type: value as QuestionDraft["type"] })}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                    <SelectItem value="short_answer">Short answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {draft.type === "multiple_choice" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Options</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        const nextId = `${draft.id}-opt-${draft.options.length + 1}-${Date.now()}`;
                        setDraft({ ...draft, options: [...draft.options, { id: nextId, label: "", rationale: "" }] });
                      }}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add option
                    </Button>
                  </div>
                  {draft.options.map((option, index) => (
                    <div key={option.id} className="space-y-2 rounded-[1rem] border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDraft({ ...draft, correctOptionId: option.id })}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${draft.correctOptionId === option.id ? "border-emerald-400 bg-emerald-400/20" : "border-white/30"}`}
                          title="Mark correct"
                          aria-label="Mark correct"
                        >
                          {draft.correctOptionId === option.id ? <span className="h-2 w-2 rounded-full bg-emerald-300" /> : null}
                        </button>
                        <Input value={option.label} onChange={(event) => {
                          const options = [...draft.options];
                          options[index] = { ...option, label: event.target.value };
                          setDraft({ ...draft, options });
                        }} placeholder={`Option ${index + 1}`} className={`h-9 ${inputClass}`} />
                        <Button type="button" size="icon" variant="ghost" className="shrink-0 rounded-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-200" disabled={draft.options.length <= 2} onClick={() => setDraft({ ...draft, options: draft.options.filter((entry) => entry.id !== option.id) })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input value={option.rationale} onChange={(event) => {
                        const options = [...draft.options];
                        options[index] = { ...option, rationale: event.target.value };
                        setDraft({ ...draft, options });
                      }} placeholder="Why this option is right / wrong" className={`h-9 ${inputClass}`} />
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500">The filled radio marks the correct option.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Accepted answers (one per line)</Label>
                    <Textarea value={draft.acceptedAnswers} onChange={(event) => setDraft({ ...draft, acceptedAnswers: event.target.value })} className={inputClass} rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Placeholder</Label>
                    <Input value={draft.placeholder} onChange={(event) => setDraft({ ...draft, placeholder: event.target.value })} className={`h-9 ${inputClass}`} />
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Success feedback</Label>
                  <Textarea value={draft.successFeedback} onChange={(event) => setDraft({ ...draft, successFeedback: event.target.value })} className={inputClass} rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-[0.18em] text-slate-400">Failure feedback</Label>
                  <Textarea value={draft.failureFeedback} onChange={(event) => setDraft({ ...draft, failureFeedback: event.target.value })} className={inputClass} rows={2} />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="button" onClick={saveDraft} disabled={saving} className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}
