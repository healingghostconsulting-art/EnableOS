import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

// v3 interaction primitive — the shared button. CHCG tokens, dual-surface rule
// (primary = gold fill + navy ink). Default size clears the 44px touch target; focus
// shows a 2px ring at 2px offset. Composable via className.

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[#FCBC34] text-[#1B303C] hover:bg-[#e9ad1e] focus-visible:ring-[#1B303C]/40",
  secondary: "border border-[#1B303C]/12 bg-white text-[#1B303C] hover:border-[#7A5200]/25 hover:bg-amber-50/50 focus-visible:ring-[#1B303C]/30",
  ghost: "text-[#4A6373] hover:bg-slate-100 hover:text-[#1B303C] focus-visible:ring-[#1B303C]/30",
  destructive: "bg-rose-700 text-white hover:bg-rose-800 focus-visible:ring-rose-700/40",
};

const SIZES: Record<Size, string> = {
  md: "min-h-[44px] px-4 text-[13px]",
  sm: "min-h-[36px] px-3 text-[12px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 motion-reduce:transition-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
