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
import { Pencil, Plus, EyeOff, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TrainingApplicationQuestion } from "../../../shared/trainingContent";

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
      await content.refetch();
      toast.success(`Saved to ${scopeLabel}`);
      return true;
    } catch {
      toast.error("Could not save the edit");
      return false;
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
              <Button type="button" size="sm" variant="ghost" onClick={() => runOp({ kind: "hide", id: asset.id })} className="rounded-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-200" title={scope === "tenant" && asset.sourceKind === "chcg" ? "Hide this CHCG asset for this client" : "Hide from the library"}>
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

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

export function ContentAuthoringPanel({ scope, tenantId }: { scope: "core" | "tenant"; tenantId?: string }) {
  const [contentType, setContentType] = useState<"quizzes" | "library">("quizzes");
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
      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {(["quizzes", "library"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setContentType(option)}
            className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${contentType === option ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            {option === "quizzes" ? "Quizzes" : "Library"}
          </button>
        ))}
      </div>
      {contentType === "library" ? (
        <LibraryAuthoring scope={scope} tenantId={tenantId} />
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
