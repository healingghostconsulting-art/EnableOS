import { useEffect, useRef } from "react";
import { type LucideIcon, Check, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { BrandLogoWhite } from "./BrandLogoWhite";

// v3 kit — the persistent dark navigation rail. Generic + prop-driven so every role
// dashboard reuses it. Gold accent on this dark surface is #FCBC34 per the dual-surface
// rule. Above lg the rail is a fixed sidebar; below lg it collapses to an off-canvas
// drawer (MobileNavDrawer) that renders the SAME SidebarNavContent, so nav markup and
// its accessible active state stay identical across breakpoints.
export interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  active?: boolean;
  /** Non-navigable item: 42% opacity, aria-disabled, pointer + keyboard blocked. */
  disabled?: boolean;
}

export interface SidebarUser {
  name: string;
  roleTitle: string;
  initials: string;
}

/** The rail's inner content: co-brand logo, nav list, identity card + help. Rendered by
 *  the desktop `SidebarNav` aside and the mobile drawer alike. `onNavigate` fires when a
 *  nav/help link is chosen, so the drawer can close itself on navigation. */
export function SidebarNavContent({ items, user, helpHref = "/guide", onNavigate }: {
  items: NavItem[];
  user: SidebarUser;
  helpHref?: string;
  onNavigate?: () => void;
}) {
  const navRef = useRef<HTMLElement | null>(null);

  // Keep the selected item on screen: on mount, scroll the active (aria-current) row
  // into view so it's never below the fold in a short viewport. Honors reduced-motion
  // (the OS setting or the in-app "Reduce motion" preference) by skipping the animation.
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const reduce =
      (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) ||
      document.documentElement.classList.contains("app-reduce-motion");
    active.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <div className="px-5 pt-6 pb-5">
        <BrandLogoWhite />
      </div>

      <nav ref={navRef} aria-label="Primary" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const Icon = item.icon;

          // Active state is built to survive grayscale(1): the cue is a LUMINANCE
          // inversion (dark navy ink on a light gold pill), never hue alone, backed by
          // redundant non-color cues — a gold left rail flush to the sidebar edge (on
          // the dark bg, so it stays a visible gold marker beside the gold pill), a
          // 500→700 weight bump, and a trailing check glyph. The ≥44px min-height keeps
          // every row a valid touch target on the mobile drawer.
          const base = "relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FCBC34] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E2233] motion-reduce:transition-none";

          if (item.disabled) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                className={`${base} pointer-events-none cursor-not-allowed border-l-4 border-transparent font-medium text-white/70 opacity-[0.42]`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={item.active ? "page" : undefined}
              className={`${base} ${
                item.active
                  ? "bg-[#FCBC34] font-bold text-[#1B303C]"
                  : "font-medium text-white/70 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {/* 4px gold left rail — sits at the sidebar's left edge (‑left‑3 reaches back
                  through the nav padding onto the dark bg) so it reads as a distinct gold
                  marker rather than merging into the gold pill. */}
              {item.active ? (
                <span aria-hidden="true" className="pointer-events-none absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#FCBC34]" />
              ) : null}
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.active ? <Check className="h-4 w-4 shrink-0 text-[#1B303C]" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-3 px-3 pb-4">
        {/* Identity card — display only. The account menu (sign out / sign in) lives on
            the TopBar avatar, so no dropdown-affordance chevron here (it promised a menu
            that did not exist). */}
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCBC34] text-[13px] font-bold text-[#1B303C]" aria-hidden="true">{user.initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-white/55">{user.roleTitle}</p>
          </div>
        </div>

        <Link href={helpHref} onClick={onNavigate} className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-white/70 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FCBC34]/50 motion-reduce:transition-none">
          <HelpCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold text-white">Need Help?</span>
            <span className="block text-[11px] text-[#FCBC34]">Visit our Help Center</span>
          </span>
        </Link>

        {/* CH monogram placeholder — the CHCG mark lands here as a standalone asset later. */}
        <p aria-hidden="true" className="select-none px-1 pt-1 text-[2.2rem] font-black leading-none tracking-tight text-white/10">CH</p>
      </div>
    </div>
  );
}

/** Desktop rail — a fixed sidebar shown at lg and up; below lg it is hidden and the
 *  drawer takes over. */
export function SidebarNav({ items, user, helpHref = "/guide" }: { items: NavItem[]; user: SidebarUser; helpHref?: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-hidden bg-[linear-gradient(180deg,#0E2233,#0A1826)] lg:block">
      <SidebarNavContent items={items} user={user} helpHref={helpHref} />
    </aside>
  );
}
