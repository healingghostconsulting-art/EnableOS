import { useMemo, useState } from "react";
import { Search, UserPlus, ShieldCheck } from "lucide-react";
import { permittedWorkspaces, type GrantRole } from "@shared/workspaceAccess";
import { Button } from "@/components/v3/Button";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/v3/Modal";
import { Field, TextInput, SelectField } from "@/components/v3/Field";
import { StatusMark } from "@/components/v3/StatusMark";
import { EmptyState } from "@/components/v3/states";
import { ADMIN_ROLES, WORKSPACE_LABEL, roleLabelOf, derivedLastActive, AdminScreenHeader, AdminPanel } from "./adminShared";

// Client Admin → Users. A filterable roster with an invite flow and a detail view.
// Reads come from secureAdmin (tenantUsers); every write here is an optimistic in-session
// stub (invite appends a row, deactivate flips a flag) that resets on reload — the parent
// owns that state, so it survives navigation between admin sections within the session.

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  title: string;
  role: GrantRole;
  deactivated: boolean;
  invited?: boolean;
}

export interface InviteDraft { name: string; email: string; role: GrantRole; }

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const ROLE_FILTER_OPTIONS = [{ value: "all", label: "All roles" }, ...ADMIN_ROLES.map((r) => ({ value: r.role, label: r.label }))];
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
];
const INVITE_ROLE_OPTIONS = ADMIN_ROLES.map((r) => ({ value: r.role, label: r.label }));

function statusOf(u: AdminUser): { status: string; label: string } {
  if (u.deactivated) return { status: "neutral", label: "Deactivated" };
  if (u.invited) return { status: "overdue", label: "Invited" };
  return { status: "positive", label: "Active" };
}

export function AdminUsers({ users, onInvite, onToggleActive }: {
  users: AdminUser[];
  onInvite: (draft: InviteDraft) => void;
  onToggleActive: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesText = q === "" || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? !u.deactivated : u.deactivated);
      return matchesText && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const detail = detailId ? users.find((u) => u.id === detailId) ?? null : null;

  return (
    <div>
      <AdminScreenHeader
        title="Users"
        description="Manage the people in this workspace — invite new members, review their role and workspace access, and deactivate seats. Changes here are demo stubs and reset on reload."
        actions={<Button onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> Add user</Button>}
      />

      <AdminPanel className="p-0">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#1B303C]/8 px-5 py-4">
          <div className="relative min-w-[13rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A6373]" aria-hidden="true" />
            <TextInput
              type="search"
              aria-label="Search users by name or email"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-[10.5rem]">
            <SelectField id="user-role-filter" value={roleFilter} onValueChange={setRoleFilter} options={ROLE_FILTER_OPTIONS} />
          </div>
          <div className="w-[10.5rem]">
            <SelectField id="user-status-filter" value={statusFilter} onValueChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No matching users" description="Try a different search term or clear the role and status filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#1B303C]/8 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A6373]">
                  <th scope="col" className="px-5 py-3 font-semibold">User</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last active</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const s = statusOf(u);
                  return (
                    <tr key={u.id} className="border-b border-[#1B303C]/6 last:border-0 hover:bg-[#FBFCFD]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white ${u.deactivated ? "opacity-40" : ""}`} aria-hidden="true">{initialsOf(u.name)}</span>
                          <span className="min-w-0">
                            <span className={`block truncate text-[13px] font-semibold text-[#1B303C] ${u.deactivated ? "text-[#4A6373] line-through" : ""}`}>{u.name}</span>
                            <span className="block truncate text-[12px] text-[#4A6373]">{u.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#1B303C]">{roleLabelOf(u.role)}</td>
                      <td className="px-4 py-3"><StatusMark status={s.status} label={s.label} variant="inline" /></td>
                      <td className="px-4 py-3 text-[13px] text-[#4A6373]">{u.invited ? "Pending" : derivedLastActive(u.id)}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDetailId(u.id)} aria-label={`Manage ${u.name}`}>Manage</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-[#1B303C]/8 px-5 py-3 text-[12px] text-[#4A6373]">
          Showing <span className="font-semibold text-[#1B303C]">{filtered.length}</span> of {users.length} users
        </div>
      </AdminPanel>

      <AddUserModal open={addOpen} onOpenChange={setAddOpen} onInvite={onInvite} />
      <UserDetailModal user={detail} onClose={() => setDetailId(null)} onToggleActive={onToggleActive} />
    </div>
  );
}

function AddUserModal({ open, onOpenChange, onInvite }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (draft: InviteDraft) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<GrantRole>("learner");
  const [touched, setTouched] = useState(false);

  const nameError = touched && name.trim() === "" ? "Enter the person's name." : undefined;
  const emailError = touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Enter a valid email address." : undefined;

  const reset = () => { setName(""); setEmail(""); setRole("learner"); setTouched(false); };
  const close = (next: boolean) => { if (!next) reset(); onOpenChange(next); };

  const submit = () => {
    setTouched(true);
    if (name.trim() === "" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    onInvite({ name: name.trim(), email: email.trim(), role });
    reset();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={close} size="md">
      <ModalHeader title="Invite a user" description="They'll be added to the workspace roster as an invited member." />
      <ModalBody>
        <div className="space-y-4">
          <Field label="Full name" htmlFor="invite-name" error={nameError}>
            <TextInput id="invite-name" value={name} invalid={!!nameError} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" />
          </Field>
          <Field label="Email" htmlFor="invite-email" error={emailError}>
            <TextInput id="invite-email" type="email" value={email} invalid={!!emailError} onChange={(e) => setEmail(e.target.value)} placeholder="jordan.rivera@company.com" />
          </Field>
          <Field label="Role" htmlFor="invite-role" hint="Determines which workspaces the member can enter.">
            <SelectField id="invite-role" value={role} onValueChange={(v) => setRole(v as GrantRole)} options={INVITE_ROLE_OPTIONS} />
          </Field>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
        <Button onClick={submit}>Send invite</Button>
      </ModalFooter>
    </Modal>
  );
}

function UserDetailModal({ user, onClose, onToggleActive }: {
  user: AdminUser | null;
  onClose: () => void;
  onToggleActive: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const open = user !== null;
  const close = () => { setConfirming(false); onClose(); };
  // Keep the last non-null user so the modal content doesn't flash empty during close.
  const workspaces = user ? permittedWorkspaces(user.role) : [];
  const s = user ? statusOf(user) : { status: "neutral", label: "" };

  return (
    <Modal open={open} onOpenChange={(next) => { if (!next) close(); }} size="lg">
      {user ? (
        <>
          <ModalHeader title={user.name} description={user.email} />
          <ModalBody>
            {confirming ? (
              <div>
                <p className="text-[14px] font-semibold text-[#1B303C]">{user.deactivated ? "Reactivate this user?" : "Deactivate this user?"}</p>
                <p className="mt-1.5 text-[13px] leading-6 text-[#4A6373]">
                  {user.deactivated
                    ? `${user.name} will regain access to their permitted workspaces.`
                    : `${user.name} will lose access to every workspace until reactivated. Their record is kept.`}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-[15px] font-bold text-white ${user.deactivated ? "opacity-40" : ""}`} aria-hidden="true">{initialsOf(user.name)}</span>
                  <div className="min-w-0">
                    <p className={`text-[14px] font-semibold text-[#1B303C] ${user.deactivated ? "text-[#4A6373] line-through" : ""}`}>{user.name}</p>
                    <p className="text-[13px] text-[#4A6373]">{user.title}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A6373]">Role</dt>
                    <dd className="mt-1 text-[13px] font-semibold text-[#1B303C]">{roleLabelOf(user.role)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A6373]">Status</dt>
                    <dd className="mt-1"><StatusMark status={s.status} label={s.label} variant="inline" /></dd>
                  </div>
                </dl>

                <div>
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#4A6373]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#7A5200]" aria-hidden="true" /> Workspace access
                  </p>
                  <p className="mt-1 text-[12px] text-[#4A6373]">Derived from the role — {workspaces.length} of the platform's workspaces.</p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {workspaces.map((w) => (
                      <li key={w} className="rounded-full bg-[#1B303C]/8 px-2.5 py-1 text-[12px] font-medium text-[#1B303C]">{WORKSPACE_LABEL[w]}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </ModalBody>
          {confirming ? (
            <ModalFooter>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
              <Button
                variant={user.deactivated ? "primary" : "destructive"}
                onClick={() => { onToggleActive(user.id); close(); }}
              >
                {user.deactivated ? "Reactivate user" : "Deactivate user"}
              </Button>
            </ModalFooter>
          ) : (
            <ModalFooter
              between={
                <Button variant={user.deactivated ? "secondary" : "destructive"} onClick={() => setConfirming(true)}>
                  {user.deactivated ? "Reactivate" : "Deactivate"}
                </Button>
              }
            >
              <Button variant="ghost" onClick={close}>Close</Button>
            </ModalFooter>
          )}
        </>
      ) : null}
    </Modal>
  );
}
