import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// v3 interaction primitive — the shared modal. Composes the shadcn/Radix Dialog, so it
// inherits the focus trap, Esc-to-close, outside-click close, and scroll lock; this layer
// applies the CHCG tokens and the header/body/footer structure. The header carries the
// gold accent rule (dual-surface: the rule is a fill, labels stay navy/gold-ink).

const SIZES = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const;

export function Modal({ open, onOpenChange, size = "md", className, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-0 overflow-hidden border-[#1B303C]/10 bg-white p-0 text-[#1B303C]", SIZES[size], className)}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function ModalHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-[#1B303C]/8 px-6 py-5">
      <DialogHeader className="space-y-1 text-left">
        <DialogTitle className="text-[1.05rem] font-semibold text-[#1B303C]">{title}</DialogTitle>
        {description ? <DialogDescription className="text-[13px] text-[#4A6373]">{description}</DialogDescription> : null}
      </DialogHeader>
      <span aria-hidden="true" className="mt-3 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
    </div>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-h-[70vh] overflow-y-auto px-6 py-5", className)}>{children}</div>;
}

/** Footer action row. Pass `between` for a left-aligned control (e.g. a destructive action). */
export function ModalFooter({ children, between }: { children: ReactNode; between?: ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-t border-[#1B303C]/8 px-6 py-4", between ? "justify-between" : "justify-end")}>
      {between}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
