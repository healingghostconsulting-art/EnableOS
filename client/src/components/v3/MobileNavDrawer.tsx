import { X } from "lucide-react";
import { Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarNavContent, type NavItem, type SidebarUser } from "./SidebarNav";

// v3 kit — the off-canvas navigation drawer for narrow viewports (below lg). Built on
// the Radix-dialog Sheet, so it inherits the focus trap, Esc-to-dismiss, backdrop click
// to close, and scroll lock for free. It renders the SAME SidebarNavContent as the
// desktop rail (co-brand logo + nav + identity card), closing itself on navigation.
export function MobileNavDrawer({ open, onOpenChange, items, user, helpHref }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
  user: SidebarUser;
  helpHref?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-72 max-w-[85vw] gap-0 border-0 bg-[linear-gradient(180deg,#0E2233,#0A1826)] p-0 text-white [&>button:last-child]:hidden"
      >
        {/* Radix requires a labelled title/description for the dialog; keep them for AT. */}
        <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
        <SheetDescription className="sr-only">Move between the workspaces you can access.</SheetDescription>

        <SheetClose
          aria-label="Close navigation menu"
          className="absolute right-2.5 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FCBC34]/60 motion-reduce:transition-none"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </SheetClose>

        <SidebarNavContent items={items} user={user} helpHref={helpHref} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
