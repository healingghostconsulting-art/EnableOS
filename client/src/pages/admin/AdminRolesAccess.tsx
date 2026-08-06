import { useState } from "react";
import { Check, Minus, Lock, Plus, Pencil } from "lucide-react";
import { permittedWorkspaces, type GrantRole, type WorkspacePath } from "@shared/workspaceAccess";
import { Button } from "@/components/v3/Button";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/v3/Modal";
import { Field, TextInput, TextArea, SelectField, Segmented } from "@/components/v3/Field";
import { ADMIN_ROLES, WORKSPACE_LABEL, ALL_WORKSPACES, roleLabelOf, AdminScreenHeader, AdminPanel } from "./adminShared";

// Client Admin → Roles & Access. The role→workspace access matrix as a real <table>,
// with the cell states derived entirely from permittedWorkspaces() (the single source in
// @shared/workspaceAccess — no duplicated list). Standard roles are the fixed built-in
// matrix (read-only). Custom roles are narrow-only: they start from a base role's access
// and can only be restricted, never exceed it — so a workspace outside the base ceiling
// is locked, and everything else is a toggle in Edit mode. All writes are in-session stubs.

export interface CustomRoleRecord {
  id: string;
  name: string;
  description: string;
  base: GrantRole;
  grants: WorkspacePath[];
}

type CellState = "check" | "dash" | "lock";

function cellState(base: GrantRole, grants: readonly WorkspacePath[], w: WorkspacePath): CellState {
  // The ceiling is the base role's permitted set — the narrow-only maximum.
  if (!permittedWorkspaces(base).includes(w)) return "lock";
  return grants.includes(w) ? "check" : "dash";
}

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function AdminRolesAccess({ customRoles, onChange }: {
  customRoles: CustomRoleRecord[];
  onChange: (next: CustomRoleRecord[]) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CustomRoleRecord | null>(null);

  const rows = [
    ...ADMIN_ROLES.map((r) => ({ kind: "standard" as const, id: r.role, label: r.label, base: r.role, grants: permittedWorkspaces(r.role), record: null })),
    ...customRoles.map((r) => ({ kind: "custom" as const, id: r.id, label: r.name, base: r.base, grants: r.grants, record: r })),
  ];

  const editable = mode === "edit";

  const toggleCell = (roleId: string, w: WorkspacePath) => {
    onChange(customRoles.map((r) => {
      if (r.id !== roleId) return r;
      const has = r.grants.includes(w);
      return { ...r, grants: has ? r.grants.filter((x) => x !== w) : [...r.grants, w] };
    }));
  };

  return (
    <div>
      <AdminScreenHeader
        title="Roles & Access"
        description="Which workspaces each role can enter. Standard roles are fixed. Custom roles are narrow-only — they start from a base role's access and can only be restricted, never exceed it."
        actions={
          <div className="flex items-center gap-2">
            <Segmented
              aria-label="Matrix mode"
              value={mode}
              onChange={(v) => setMode(v as "view" | "edit")}
              options={[{ value: "view", label: "View" }, { value: "edit", label: "Edit" }]}
            />
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> New role</Button>
          </div>
        }
      />

      <Legend />

      <AdminPanel className="mt-4 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <caption className="sr-only">Role access matrix — rows are roles, columns are workspaces</caption>
            <thead>
              <tr className="border-b border-[#1B303C]/8 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4A6373]">
                <th scope="col" className="sticky left-0 z-10 bg-white px-5 py-3 font-semibold">Role</th>
                {ALL_WORKSPACES.map((w) => (
                  <th key={w} scope="col" className="px-2 py-3 text-center font-semibold">{WORKSPACE_LABEL[w]}</th>
                ))}
                <th scope="col" className="px-4 py-3 text-right font-semibold">Access</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const grantedCount = ALL_WORKSPACES.filter((w) => cellState(row.base, row.grants, w) === "check").length;
                return (
                  <tr key={row.id} className="border-b border-[#1B303C]/6 last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-white px-5 py-3 text-left align-middle font-medium">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#1B303C]">{row.label}</span>
                        {row.kind === "custom" ? (
                          <>
                            <span className="rounded-full bg-[#1B303C]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1B303C]">Custom</span>
                            {editable ? (
                              <button type="button" onClick={() => setEditing(row.record)} className="text-[#4A6373] hover:text-[#1B303C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30" aria-label={`Edit ${row.label}`}>
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </span>
                      {row.kind === "custom" ? <span className="mt-0.5 block text-[11px] text-[#4A6373]">narrows {roleLabelOf(row.base)}</span> : null}
                    </th>
                    {ALL_WORKSPACES.map((w) => {
                      const state = cellState(row.base, row.grants, w);
                      const canEdit = editable && row.kind === "custom" && state !== "lock";
                      return (
                        <td key={w} className="px-2 py-2 text-center">
                          <MatrixCell
                            state={state}
                            editable={canEdit}
                            onToggle={() => toggleCell(row.id, w)}
                            roleLabel={row.label}
                            workspaceLabel={WORKSPACE_LABEL[w]}
                          />
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[12px] font-semibold text-[#1B303C]">{grantedCount}<span className="text-[#4A6373]">/{ALL_WORKSPACES.length}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <RoleFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(draft) => {
          const base = draft.base;
          onChange([...customRoles, {
            id: `custom-${slugify(draft.name) || "role"}-${base}`,
            name: draft.name,
            description: draft.description,
            base,
            grants: permittedWorkspaces(base),
          }]);
        }}
      />

      <RoleFormModal
        open={editing !== null}
        existing={editing ?? undefined}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSubmit={(draft) => {
          if (!editing) return;
          onChange(customRoles.map((r) => r.id === editing.id ? { ...r, name: draft.name, description: draft.description } : r));
        }}
        onDelete={editing ? () => { onChange(customRoles.filter((r) => r.id !== editing.id)); setEditing(null); } : undefined}
      />
    </div>
  );
}

function MatrixCell({ state, editable, onToggle, roleLabel, workspaceLabel }: {
  state: CellState;
  editable: boolean;
  onToggle: () => void;
  roleLabel: string;
  workspaceLabel: string;
}) {
  const ICON = { check: Check, dash: Minus, lock: Lock }[state];
  const tone = { check: "text-emerald-600", dash: "text-[#4A6373]/50", lock: "text-[#1B303C]/35" }[state];
  const sr = { check: "has access to", dash: "no access to", lock: "cannot be granted" }[state];

  if (editable) {
    const granted = state === "check";
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={granted}
        aria-label={`${roleLabel} ${granted ? "has access to" : "does not have access to"} ${workspaceLabel} — toggle`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#1B303C]/10 hover:border-[#7A5200]/40 hover:bg-amber-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none"
      >
        <ICON className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      </button>
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center">
      <ICON className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      <span className="sr-only">{roleLabel} {sr} {workspaceLabel}</span>
    </span>
  );
}

function Legend() {
  const items: Array<{ icon: typeof Check; tone: string; label: string; hint: string }> = [
    { icon: Check, tone: "text-emerald-600", label: "Access", hint: "granted" },
    { icon: Minus, tone: "text-[#4A6373]/60", label: "No access", hint: "available to grant" },
    { icon: Lock, tone: "text-[#1B303C]/40", label: "Locked", hint: "outside the role's ceiling" },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#4A6373]">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <li key={it.label} className="inline-flex items-center gap-1.5">
            <Icon className={`h-4 w-4 ${it.tone}`} aria-hidden="true" />
            <span className="font-semibold text-[#1B303C]">{it.label}</span>
            <span>— {it.hint}</span>
          </li>
        );
      })}
    </ul>
  );
}

function RoleFormModal({ open, onOpenChange, onSubmit, existing, onDelete }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: { name: string; description: string; base: GrantRole }) => void;
  existing?: CustomRoleRecord;
  onDelete?: () => void;
}) {
  const isEdit = existing !== undefined;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [base, setBase] = useState<GrantRole>("manager");
  const [touched, setTouched] = useState(false);
  // Sync fields when the modal opens for a specific record (edit) or fresh (create).
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = existing?.id ?? "new";
  if (open && syncedFor !== key) {
    setName(existing?.name ?? "");
    setDescription(existing?.description ?? "");
    setBase(existing?.base ?? "manager");
    setTouched(false);
    setSyncedFor(key);
  }
  if (!open && syncedFor !== null) setSyncedFor(null);

  const nameError = touched && name.trim() === "" ? "Give the role a name." : undefined;

  const submit = () => {
    setTouched(true);
    if (name.trim() === "") return;
    onSubmit({ name: name.trim(), description: description.trim(), base });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="md">
      <ModalHeader
        title={isEdit ? "Edit custom role" : "New custom role"}
        description="Custom roles start from a base role's access and can only be narrowed — never exceed the base."
      />
      <ModalBody>
        <div className="space-y-4">
          <Field label="Role name" htmlFor="role-name" error={nameError}>
            <TextInput id="role-name" value={name} invalid={!!nameError} onChange={(e) => setName(e.target.value)} placeholder="Quality Assurance Analyst" />
          </Field>
          <Field label="Base role" htmlFor="role-base" hint={isEdit ? "The base is fixed after creation so access can't widen." : "New role inherits this role's access, then you narrow it in the matrix."}>
            <SelectField
              id="role-base"
              value={base}
              onValueChange={(v) => setBase(v as GrantRole)}
              disabled={isEdit}
              options={ADMIN_ROLES.map((r) => ({ value: r.role, label: r.label }))}
            />
          </Field>
          <Field label="Description" htmlFor="role-desc" hint="Optional — what this role is for.">
            <TextArea id="role-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tenant-defined role for…" />
          </Field>
        </div>
      </ModalBody>
      <ModalFooter between={onDelete ? <Button variant="destructive" onClick={onDelete}>Delete role</Button> : undefined}>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit}>{isEdit ? "Save changes" : "Create role"}</Button>
      </ModalFooter>
    </Modal>
  );
}
