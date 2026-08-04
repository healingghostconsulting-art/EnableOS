import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// v3 interaction primitives — form fields on CHCG tokens. Controls clear the 44px touch
// target and show a 2px focus ring; an `invalid` state switches the border/ring to rose
// and the Field renders the error message below the control.

export function Field({ label, htmlFor, hint, error, children, className }: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[12px] font-semibold text-[#1B303C]">{label}</label>
      {children}
      {error
        ? <p className="text-[12px] font-medium text-rose-700">{error}</p>
        : hint ? <p className="text-[12px] text-[#4A6373]">{hint}</p> : null}
    </div>
  );
}

const CONTROL = "w-full rounded-xl border bg-white px-3.5 text-[13px] text-[#1B303C] outline-none transition-colors placeholder:text-[#4A6373]/60 focus:ring-2 disabled:opacity-55";
const CONTROL_OK = "border-[#1B303C]/12 focus:border-[#7A5200]/40 focus:ring-[#1B303C]/15";
const CONTROL_ERR = "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function TextInput({ className, invalid, ...props }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(CONTROL, "min-h-[44px]", invalid ? CONTROL_ERR : CONTROL_OK, className)} {...props} />;
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function TextArea({ className, invalid, ...props }, ref) {
    return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(CONTROL, "py-2.5", invalid ? CONTROL_ERR : CONTROL_OK, className)} {...props} />;
  },
);

export interface SelectOption { value: string; label: string; }

/** Accessible dropdown (Radix Select) tokened to the v3 standard. */
export function SelectField({ id, value, onValueChange, options, placeholder, disabled, className }: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn("min-h-[44px] rounded-xl border-[#1B303C]/12 bg-white text-[13px] text-[#1B303C] focus:ring-2 focus:ring-[#1B303C]/15", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Pill segmented control for a small set of mutually-exclusive options. */
export function Segmented({ options, value, onChange, ...rest }: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
}) {
  return (
    <div role="group" aria-label={rest["aria-label"]} className="inline-flex rounded-full border border-[#1B303C]/12 bg-white p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-[36px] rounded-full px-3.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none",
              active ? "bg-[#1B303C] text-white" : "text-[#4A6373] hover:bg-slate-100",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
