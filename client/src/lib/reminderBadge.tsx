import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// Cross-component reminder unread counts (NOTIF2). A workspace panel publishes its
// unread count keyed by route; the sidebar nav in DashboardLayout reads it to show
// a badge on the matching item. Lives above DashboardLayout so both the sidebar and
// the routed panels are descendants.
type ReminderBadgeContextValue = {
  unreadByPath: Record<string, number>;
  publishUnread: (path: string, count: number) => void;
};

const ReminderBadgeContext = createContext<ReminderBadgeContextValue>({
  unreadByPath: {},
  publishUnread: () => {},
});

export function ReminderBadgeProvider({ children }: { children: ReactNode }) {
  const [unreadByPath, setUnreadByPath] = useState<Record<string, number>>({});
  const publishUnread = useCallback((path: string, count: number) => {
    setUnreadByPath((prev) => (prev[path] === count ? prev : { ...prev, [path]: count }));
  }, []);
  return <ReminderBadgeContext.Provider value={{ unreadByPath, publishUnread }}>{children}</ReminderBadgeContext.Provider>;
}

export function useReminderBadge() {
  return useContext(ReminderBadgeContext);
}
