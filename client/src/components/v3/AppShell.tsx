import { type ReactNode } from "react";
import { SidebarNav, type NavItem, type SidebarUser } from "./SidebarNav";
import { TopBar } from "./TopBar";

// v3 kit — the persistent app shell: dark SidebarNav + light TopBar + content canvas.
// Every role dashboard renders through this. Prop-driven; no role logic lives here.
export function AppShell({ nav, user, greeting, greetingName, subtitleTail, notificationCount, dateLabel, avatar, children }: {
  nav: NavItem[];
  user: SidebarUser;
  greeting: string;
  greetingName: string;
  subtitleTail: string;
  notificationCount: number;
  dateLabel: string;
  avatar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F7F8FA] text-[#1B303C]">
      <SidebarNav items={nav} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar name={greetingName} greeting={greeting} subtitleTail={subtitleTail} notificationCount={notificationCount} dateLabel={dateLabel} avatar={avatar} />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

/** Responsive widget canvas — a 3-column grid on wide screens; widgets set their own
 *  col-span. Collapses to a single column on small screens. */
export function DashboardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
