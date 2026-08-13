import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        // v3 brand pill — gold fill + navy ink. Same on light and navy surfaces (the gold
        // rule: #FCBC34 is a fill behind dark text, valid on both). Used for Continue/Submit.
        gold: "bg-[#FCBC34] text-[#1B303C] hover:bg-[#FCBC34]/90 shadow-[0_10px_24px_rgba(252,188,52,0.25)]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
        // v3 pill row control — ≥44px target, fully rounded (player rails, Enlarge, nav).
        pill: "h-11 rounded-full px-5 has-[>svg]:px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  onDark = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /**
     * Restyle secondary/ghost/outline buttons for a navy surface (default false = no-op).
     * The gold/default/destructive variants read correctly on navy already and ignore it.
     */
    onDark?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const darkAdj = onDark
    ? variant === "ghost"
      ? "text-white hover:bg-white/10"
      : variant === "secondary" || variant === "outline"
        ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
        : ""
    : "";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), darkAdj, className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
