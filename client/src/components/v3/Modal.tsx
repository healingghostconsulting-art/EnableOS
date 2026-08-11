import { type ReactNode, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// v3 interaction primitive — the shared modal. Composes the shadcn/Radix Dialog, so it
// inherits the focus trap, Esc-to-close, outside-click close, and scroll lock; this layer
// applies the CHCG tokens and the header/body/footer structure. The header carries the
// gold accent rule (dual-surface: the rule is a fill, labels stay navy/gold-ink).
//
// `tone` (light default, or dark) themes the whole modal — the Enlarge lightbox in the
// dark training player passes tone="dark" once and the header/body/footer follow via an
// internal context, so no call site sets per-part classes. Light is unchanged.

export type ModalTone = "light" | "dark";
const ModalToneContext = createContext<ModalTone>("light");

const SIZES = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const;

const SURFACE: Record<ModalTone, string> = {
  light: "border-[#1B303C]/10 bg-white text-[#1B303C]",
  dark: "border-white/10 bg-[#0E2233] text-white",
};

export function Modal({ open, onOpenChange, size = "md", tone = "light", className, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: keyof typeof SIZES;
  tone?: ModalTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ModalToneContext.Provider value={tone}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("gap-0 overflow-hidden p-0", SURFACE[tone], SIZES[size], className)}>
          {children}
        </DialogContent>
      </Dialog>
    </ModalToneContext.Provider>
  );
}

export function ModalHeader({ title, description }: { title: string; description?: string }) {
  const dark = useContext(ModalToneContext) === "dark";
  return (
    <div className={cn("border-b px-6 py-5", dark ? "border-white/10" : "border-[#1B303C]/8")}>
      <DialogHeader className="space-y-1 text-left">
        <DialogTitle className={cn("text-[1.05rem] font-semibold", dark ? "text-white" : "text-[#1B303C]")}>{title}</DialogTitle>
        {description ? <DialogDescription className={cn("text-[13px]", dark ? "text-white/70" : "text-[#4A6373]")}>{description}</DialogDescription> : null}
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
  const dark = useContext(ModalToneContext) === "dark";
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-t px-6 py-4", dark ? "border-white/10" : "border-[#1B303C]/8", between ? "justify-between" : "justify-end")}>
      {between}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
