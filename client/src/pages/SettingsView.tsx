import { type ReactNode, useEffect, useState } from "react";
import { KeyRound, Download, Link2, Camera } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useGrayscale } from "@/contexts/GrayscaleContext";
import { useStatusLabels } from "@/contexts/StatusLabelsContext";
import { usePersistedState } from "@/lib/usePersistedState";
import type { ReminderType } from "@shared/reminders";
import { ToggleSwitch } from "@/components/v3/ToggleSwitch";
import { Field, TextInput, SelectField } from "@/components/v3/Field";
import { Button } from "@/components/v3/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/v3/Modal";
import { ComingSoonTile } from "@/components/v3/ComingSoon";

// Settings (/settings) — a role-agnostic preferences page rendered inside the shipped v3
// chrome (V3ShellWrapper provides the rail + TopBar). Four sections: Profile,
// Accessibility & display, Notifications, Account. Grayscale binds to the shipped
// GrayscaleContext; everything else persists to localStorage (client-side stub — no
// backend notification-delivery wiring yet). DEMO_MODE gating is untouched.

const ROLE_TITLE: Record<string, string> = {
  executive: "Executive",
  manager: "Operations Manager",
  coach: "Coach / Supervisor",
  learner: "Team Member",
  client_admin: "Client Administrator",
  platform_admin: "Platform Admin",
};

// One row per real ReminderType (mapped 1:1, renamed for humans).
const REMINDER_ROWS: Array<{ type: ReminderType; label: string; description: string }> = [
  { type: "training_due", label: "Training due", description: "A retraining assignment is approaching its due date." },
  { type: "coaching_follow_up", label: "Coaching follow-ups", description: "A follow-up from a coaching session needs attention." },
  { type: "one_on_one_scheduled", label: "1:1 scheduled", description: "A one-on-one has been scheduled with you." },
  { type: "knowledge_check_failed", label: "Knowledge check missed", description: "A knowledge check fell below the passing bar." },
  { type: "coaching_cadence_gap", label: "Coaching cadence gaps", description: "A coaching relationship is past its cadence." },
  { type: "announcement", label: "Announcements", description: "Broadcasts from CHCG and your workspace admins." },
];
const NOTIF_DEFAULTS = Object.fromEntries(REMINDER_ROWS.map((r) => [r.type, true])) as Record<ReminderType, boolean>;

const LANDING_OPTIONS = [
  { value: "/", label: "Workspace picker" },
  { value: "/mission-hub", label: "Mission Hub" },
  { value: "/calendar", label: "Calendar" },
  { value: "/library", label: "Training Library" },
  { value: "/guide", label: "EnableOS Guide" },
];
const DIGEST_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function SettingsView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const { user } = useAuth();
  const role = access.data?.grant.role ?? "learner";
  const roleTitle = ROLE_TITLE[role] ?? "Team Member";

  // Profile (editable stub): seed from the real account once, then persist locally.
  const [name, setName] = usePersistedState<string>("enableos.settings.profileName", "");
  const [email, setEmail] = usePersistedState<string>("enableos.settings.profileEmail", "");
  useEffect(() => { if (!name && user?.name) setName(user.name); }, [user?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!email && user?.email) setEmail(user.email); }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps
  const displayName = name || user?.name || "EnableOS";

  // Accessibility & display.
  const { grayscale, setGrayscale } = useGrayscale();
  const [highLegibility, setHighLegibility] = usePersistedState<boolean>("enableos.settings.highLegibility", false);
  const [reduceMotion, setReduceMotion] = usePersistedState<boolean>("enableos.settings.reduceMotion", false);
  // Bound to the shipped context so StatusMark reads the same source everywhere.
  const { alwaysShowLabels, setAlwaysShowLabels } = useStatusLabels();
  const [landingPage, setLandingPage] = usePersistedState<string>("enableos.settings.landingPage", "/");
  useEffect(() => { document.documentElement.classList.toggle("app-legible", highLegibility); }, [highLegibility]);
  useEffect(() => { document.documentElement.classList.toggle("app-reduce-motion", reduceMotion); }, [reduceMotion]);

  // Notifications (client-side stub — persisted only, no delivery wiring yet).
  const [muteAll, setMuteAll] = usePersistedState<boolean>("enableos.settings.muteAll", false);
  const [notifPrefs, setNotifPrefs] = usePersistedState<Record<ReminderType, boolean>>("enableos.settings.notifications", NOTIF_DEFAULTS);
  const [digest, setDigest] = usePersistedState<string>("enableos.settings.digestCadence", "daily");
  const [quietOn, setQuietOn] = usePersistedState<boolean>("enableos.settings.quietHours.enabled", false);
  const [quietHours, setQuietHours] = usePersistedState<{ start: string; end: string }>("enableos.settings.quietHours", { start: "22:00", end: "07:00" });

  // Account.
  const { logout } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-[1.35rem] font-semibold text-[#1B303C]">Settings</h1>
        <p className="text-[13px] text-[#4A6373]">Manage your profile, display, and notification preferences.</p>
      </header>

      {/* Profile */}
      <SettingsSection id="profile" title="Profile" description="Your account identity. Your role is set by your workspace administrator.">
        <div className="flex items-center gap-4 py-3.5">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-[15px] font-bold text-white" aria-hidden="true">{initialsOf(displayName)}</span>
          <ComingSoonTile label="Change photo" icon={Camera} />
        </div>
        <div className="grid gap-4 py-3.5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="set-name">
            <TextInput id="set-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </Field>
          <Field label="Role" htmlFor="set-role" hint="Set by your administrator.">
            <TextInput id="set-role" value={roleTitle} disabled />
          </Field>
          <Field label="Email" htmlFor="set-email" className="sm:col-span-2">
            <TextInput id="set-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
        </div>
      </SettingsSection>

      {/* Accessibility & display */}
      <SettingsSection id="accessibility" title="Accessibility & display" description="These apply on this device and are saved in your browser.">
        <ToggleRow id="set-grayscale" title="Grayscale mode" description="Desaturate the whole app to check non-color status cues." checked={grayscale} onChange={setGrayscale} />
        <ToggleRow id="set-legible" title="High legibility" description="Heavier body text and a little more letter spacing." checked={highLegibility} onChange={setHighLegibility} />
        <ToggleRow id="set-motion" title="Reduce motion" description="Minimize animations and transitions across the app." checked={reduceMotion} onChange={setReduceMotion} />
        <ToggleRow id="set-labels" title="Always show status labels" description="Show the text label on every status mark, including dense dot legends." checked={alwaysShowLabels} onChange={setAlwaysShowLabels} />
        <SettingsRow title="Landing page" description="Where the app opens when you arrive." htmlFor="set-landing"
          control={<SelectField id="set-landing" value={landingPage} onValueChange={setLandingPage} options={LANDING_OPTIONS} className="w-48" />} />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection id="notifications" title="Notifications" description="Choose what you're notified about. Saved in your browser for now.">
        <ToggleRow id="set-mute" title="Mute all notifications" description="Pause everything without losing the choices below." checked={muteAll} onChange={setMuteAll} />
        {REMINDER_ROWS.map((r) => (
          <ToggleRow key={r.type} id={`set-notif-${r.type}`} title={r.label} description={r.description}
            checked={notifPrefs[r.type] ?? true} onChange={(v) => setNotifPrefs((p) => ({ ...p, [r.type]: v }))} disabled={muteAll} />
        ))}
        <SettingsRow title="Digest cadence" description="Bundle non-urgent notifications into a summary." htmlFor="set-digest"
          control={<SelectField id="set-digest" value={digest} onValueChange={setDigest} options={DIGEST_OPTIONS} className="w-40" disabled={muteAll} />} />
        <ToggleRow id="set-quiet" title="Quiet hours" description="Hold notifications overnight." checked={quietOn} onChange={setQuietOn} disabled={muteAll} />
        {quietOn && !muteAll ? (
          <div className="flex flex-wrap items-end gap-4 py-3.5">
            <Field label="From" htmlFor="quiet-start">
              <TextInput id="quiet-start" type="time" value={quietHours.start} onChange={(e) => setQuietHours((q) => ({ ...q, start: e.target.value }))} className="w-36" />
            </Field>
            <Field label="To" htmlFor="quiet-end">
              <TextInput id="quiet-end" type="time" value={quietHours.end} onChange={(e) => setQuietHours((q) => ({ ...q, end: e.target.value }))} className="w-36" />
            </Field>
          </div>
        ) : null}
      </SettingsSection>

      {/* Account */}
      <SettingsSection id="account" title="Account" description="Manage credentials and access.">
        <div className="grid gap-3 py-3.5 sm:grid-cols-3">
          <ComingSoonTile label="Change password" icon={KeyRound} />
          <ComingSoonTile label="Export my data" icon={Download} />
          <ComingSoonTile label="Connected accounts" icon={Link2} />
        </div>
        <div className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <p className="text-[13.5px] font-semibold text-[#1B303C]">Sign out</p>
            <p className="mt-0.5 text-[12.5px] text-[#4A6373]">End your session on this device.</p>
          </div>
          <Button variant="destructive" onClick={() => setSignOutOpen(true)}>Sign out</Button>
        </div>
      </SettingsSection>

      <Modal open={signOutOpen} onOpenChange={setSignOutOpen} size="sm">
        <ModalHeader title="Sign out?" description="You'll need to sign in again to get back into your workspace." />
        <ModalFooter>
          <Button variant="secondary" onClick={() => setSignOutOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { void logout(); setSignOutOpen(false); }}>Sign out</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function SettingsSection({ id, title, description, children }: { id?: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-[#1B303C]/8 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-[#1B303C]/8 pb-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#1B303C]">{title}</h2>
        <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
        {description ? <p className="mt-2 text-[12.5px] text-[#4A6373]">{description}</p> : null}
      </div>
      <div className="divide-y divide-[#1B303C]/6">{children}</div>
    </section>
  );
}

function SettingsRow({ title, description, htmlFor, control }: { title: string; description?: string; htmlFor?: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-[13.5px] font-semibold text-[#1B303C]">{title}</label>
        {description ? <p className="mt-0.5 text-[12.5px] text-[#4A6373]">{description}</p> : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function ToggleRow({ id, title, description, checked, onChange, disabled }: {
  id: string; title: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-[13.5px] font-semibold text-[#1B303C]">{title}</p>
        {description ? <p className="mt-0.5 text-[12.5px] text-[#4A6373]">{description}</p> : null}
      </div>
      <ToggleSwitch aria-labelledby={`${id}-label`} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
