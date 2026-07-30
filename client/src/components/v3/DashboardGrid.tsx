import { type ReactNode } from "react";

// v3 kit — responsive widget canvas: a 3-column grid on wide screens; widgets set
// their own col-span. Collapses to a single column on small screens. Extracted from
// AppShell so the grid can be reused without pulling in the whole shell.
export function DashboardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
