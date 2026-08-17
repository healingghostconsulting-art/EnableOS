import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // v3 §2.7/§2.8 — neutral loading surface (the shadcn default --accent is a warm gold
      // tint, so loading states used to read as branded gold; use the sunken surface instead).
      className={cn("animate-pulse rounded-md bg-[var(--eos-surface-sunken)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
