import { type LucideIcon, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { BrandLogoWhite } from "./BrandLogoWhite";

// v3 kit — the persistent dark navigation rail. Generic + prop-driven so every role
// dashboard (Agent now, Coach/Manager next) reuses it. Gold accent on this dark
// surface is #FCBC34 per the dual-surface rule.
export interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  active?: boolean;
}

export interface SidebarUser {
  name: string;
  roleTitle: string;
  initials: string;
}

export function SidebarNav({ items, user, helpHref = "/guide" }: { items: NavItem[]; user: SidebarUser; helpHref?: string }) {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#0E2233,#0A1826)] text-white">
      <div className="px-5 pt-6 pb-5">
        <BrandLogoWhite />
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FCBC34]/50 motion-reduce:transition-none ${
                item.active
                  ? "border-[#FCBC34] bg-white/[0.07] text-[#FCBC34]"
                  : "border-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {item.label}
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

        <Link href={helpHref} className="flex items-center gap-3 rounded-xl px-3 py-2 text-white/70 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FCBC34]/50 motion-reduce:transition-none">
          <HelpCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold text-white">Need Help?</span>
            <span className="block text-[11px] text-[#FCBC34]">Visit our Help Center</span>
          </span>
        </Link>

        {/* CH monogram placeholder — the CHCG mark lands here as a standalone asset later. */}
        <p aria-hidden="true" className="select-none px-1 pt-1 text-[2.2rem] font-black leading-none tracking-tight text-white/10">CH</p>
      </div>
    </aside>
  );
}
