import { type ReactNode } from "react";
import { SidebarNav, type NavItem, type SidebarUser } from "./SidebarNav";
import { TopBar } from "./TopBar";

// v3 kit — the persistent app shell: dark SidebarNav + light TopBar + content canvas.
// Every role dashboard renders through this. Prop-driven; no role logic lives here.
export function AppShell({ nav, user, greeting, greetingName, subtitleTail, notificationCount, dateLabel, avatar, notificationsHref, children }: {
  nav: NavItem[];
  user: SidebarUser;
  greeting: string;
  greetingName: string;
  subtitleTail: string;
  notificationCount: number;
  dateLabel: string;
  avatar: ReactNode;
  /** Optional "View all" target for the notification popover (the role's alerts). */
  notificationsHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F7F8FA] text-[#1B303C]">
      <SidebarNav items={nav} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar name={greetingName} greeting={greeting} subtitleTail={subtitleTail} notificationCount={notificationCount} dateLabel={dateLabel} avatar={avatar} notificationsHref={notificationsHref} />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
