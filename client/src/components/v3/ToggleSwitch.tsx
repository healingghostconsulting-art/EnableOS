import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// v3 interaction primitive — an accessible on/off switch. A real <button role="switch">
// with aria-checked, a ≥44px hit target, and a focus-visible ring. The ON state is
// carried by a check glyph inside the track (plus the knob position and track fill), so
// it stays legible under grayscale(1) — never color alone. CHCG tokens.

export function ToggleSwitch({ checked, onChange, id, disabled, ...rest }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={rest["aria-label"]}
      aria-labelledby={rest["aria-labelledby"]}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors motion-reduce:transition-none", checked ? "bg-[#1B303C]" : "bg-[#1B303C]/20")}>
        {/* On-state check inside the track — the non-color cue that survives grayscale. */}
        <Check aria-hidden="true" strokeWidth={3} className={cn("pointer-events-none absolute left-1.5 h-3 w-3 text-white transition-opacity motion-reduce:transition-none", checked ? "opacity-100" : "opacity-0")} />
        <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none", checked ? "translate-x-[1.375rem]" : "translate-x-0.5")} />
      </span>
    </button>
  );
}
