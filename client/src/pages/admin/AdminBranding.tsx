import { useRef, useState } from "react";
import { Check, Lock, Upload } from "lucide-react";
import { Button } from "@/components/v3/Button";
import { Field, TextInput } from "@/components/v3/Field";
import { StatusMark } from "@/components/v3/StatusMark";
import { AdminScreenHeader, AdminPanel } from "./adminShared";

// Client Admin → Branding. White-label controls with guardrails: the navy rail is locked
// and the accent is chosen from a curated, AA-checked set (no free hex picker), so tenant
// theming can never break contrast or restyle the navigation/status system. Writes are
// in-session optimistic stubs (owned by the parent) that reset on reload.

export interface BrandingState {
  accent: string;
  preferredLabel: string;
  logoMark: string;
}

// Curated accent set — every value clears AA (>= 4.5:1) against white text, since the
// accent is used as a filled chip/button with white ink. Navy is the locked primary and
// leads the list; the rest are professional, on-brand options. No free hex entry.
const ACCENT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "#1B303C", label: "CHCG Navy" },
  { value: "#115E59", label: "Teal" },
  { value: "#065F46", label: "Emerald" },
  { value: "#1E40AF", label: "Blue" },
  { value: "#334155", label: "Slate" },
  { value: "#78350F", label: "Bronze" },
  { value: "#9F1239", label: "Crimson" },
];

/** Snap a stored accent to the curated set. A pre-guardrail tenant may carry an
 *  off-set hex (no longer allowed); coerce it to the locked navy default so the picker
 *  always reflects a compliant, AA-checked selection. */
export function coerceAccent(accent: string | undefined | null): string {
  const found = ACCENT_OPTIONS.find((o) => o.value.toLowerCase() === (accent ?? "").toLowerCase());
  return found ? found.value : ACCENT_OPTIONS[0].value;
}

const deriveMark = (label: string, fallback: string) => {
  const initials = label.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return initials || fallback || "EO";
};

export function AdminBranding({ branding, onChange }: {
  branding: BrandingState;
  onChange: (patch: Partial<BrandingState>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const mark = deriveMark(branding.preferredLabel, branding.logoMark);

  return (
    <div>
      <AdminScreenHeader
        title="Branding"
        description="Tailor the workspace name, accent, and logo. Guardrails keep every tenant on-brand and accessible — the navy rail and status colors are fixed, and accents come from a curated AA-checked set. Changes are demo stubs and reset on reload."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {/* Workspace identity */}
          <AdminPanel>
            <h2 className="text-[13px] font-bold text-[#1B303C]">Workspace identity</h2>
            <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
            <div className="mt-4 space-y-4">
              <Field label="Display name" htmlFor="brand-name" hint="Shown in the sidebar and on the sign-in screen.">
                <TextInput id="brand-name" value={branding.preferredLabel} onChange={(e) => onChange({ preferredLabel: e.target.value })} placeholder="Enterprise Operations Workspace" />
              </Field>

              <div>
                <p className="text-[12px] font-semibold text-[#1B303C]">Logo</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold text-white" style={{ backgroundColor: branding.accent }} aria-hidden="true">{mark}</span>
                  <div>
                    <input ref={fileRef} type="file" accept="image/png,image/svg+xml" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
                    <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" aria-hidden="true" /> Upload logo</Button>
                    <p className="mt-1 text-[11px] text-[#4A6373]">{fileName ? `${fileName} — uploads are stubbed in the demo.` : "PNG or SVG, transparent background. Until then the monogram is derived from the name."}</p>
                  </div>
                </div>
              </div>
            </div>
          </AdminPanel>

          <BrandGuardrail accent={branding.accent} onAccent={(a) => onChange({ accent: a })} />
        </div>

        <BrandPreview branding={{ ...branding, logoMark: mark }} />
      </div>
    </div>
  );
}

function BrandGuardrail({ accent, onAccent }: { accent: string; onAccent: (value: string) => void }) {
  return (
    <AdminPanel>
      <h2 className="text-[13px] font-bold text-[#1B303C]">Brand colors</h2>
      <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />

      {/* Locked primary */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#1B303C]/8 bg-[#FBFCFD] px-4 py-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1B303C]" aria-hidden="true"><Lock className="h-4 w-4 text-white/80" /></span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#1B303C]">Primary — CHCG Navy <span className="font-mono text-[11px] font-normal text-[#4A6373]">#1B303C</span></p>
          <p className="text-[12px] text-[#4A6373]">Locked. The navigation rail is navy in every workspace and can't be changed.</p>
        </div>
      </div>

      {/* Accent picker (curated, AA-checked) */}
      <fieldset className="mt-4">
        <legend className="text-[12px] font-semibold text-[#1B303C]">Accent color</legend>
        <div role="radiogroup" aria-label="Accent color" className="mt-2 flex flex-wrap gap-2">
          {ACCENT_OPTIONS.map((o) => {
            const selected = accent.toLowerCase() === o.value.toLowerCase();
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={o.label}
                title={`${o.label} ${o.value}`}
                onClick={() => onAccent(o.value)}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 ${selected ? "ring-2 ring-[#1B303C]" : "ring-1 ring-[#1B303C]/10 hover:ring-[#1B303C]/30"}`}
                style={{ backgroundColor: o.value }}
              >
                {selected ? <Check className="h-4 w-4 text-white" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-[12px] text-[#4A6373]">A curated, AA-checked set — no free hex entry, so tenant theming can never break text contrast.</p>
      </fieldset>
    </AdminPanel>
  );
}

function BrandPreview({ branding }: { branding: BrandingState }) {
  return (
    <AdminPanel className="lg:sticky lg:top-6">
      <h2 className="text-[13px] font-bold text-[#1B303C]">Live preview</h2>
      <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />

      <div className="mt-4 overflow-hidden rounded-xl border border-[#1B303C]/10 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex min-h-[15rem]">
          {/* Rail — always CHCG navy (locked). */}
          <div className="w-24 shrink-0 bg-[linear-gradient(180deg,#0E2233,#0A1826)] p-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: branding.accent }} aria-hidden="true">{branding.logoMark}</span>
            <div className="mt-4 space-y-1.5" aria-hidden="true">
              <span className="block h-2 w-full rounded-full bg-[#FCBC34]/80" />
              <span className="block h-2 w-4/5 rounded-full bg-white/15" />
              <span className="block h-2 w-4/5 rounded-full bg-white/15" />
              <span className="block h-2 w-3/5 rounded-full bg-white/15" />
            </div>
          </div>
          {/* Content — accent themes highlights + CTAs only. */}
          <div className="min-w-0 flex-1 bg-white p-4">
            <p className="truncate text-[13px] font-bold text-[#1B303C]">{branding.preferredLabel || "Workspace"}</p>
            <span aria-hidden="true" className="mt-1 block h-[3px] w-8 rounded-full" style={{ backgroundColor: branding.accent }} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold text-white" style={{ backgroundColor: branding.accent }}>Primary action</span>
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: branding.accent, color: branding.accent }}>Secondary</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <StatusMark status="positive" />
              <StatusMark status="alert" />
              <StatusMark status="overdue" />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-6 text-[#4A6373]">
        The navigation rail stays CHCG navy and the status colors (on-track, at-risk, overdue) never change — your accent themes highlights and calls-to-action only.
      </p>
    </AdminPanel>
  );
}
