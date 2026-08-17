import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // v3 §2.7/§2.8 — neutral loading surface, not the gold-tinted bg-accent.
      className={cn("animate-pulse rounded-md bg-[var(--eos-surface-sunken)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
