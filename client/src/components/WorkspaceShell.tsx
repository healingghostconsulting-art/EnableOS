import { type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Shared workspace chrome extracted from Coach Studio: a slim header, the dark
 * high-contrast stat-row band, and the gated mode tabs. Reused by /coach and
 * /learner so the two workspaces read as one product. The markup mirrors Coach
 * Studio exactly so routing /coach through it is a non-visual refactor.
 *
 * Overview pages with no modes (e.g. Mission Hub) can omit `tabs`; the tabs band
 * is then skipped and `children` render directly under the stat row, keeping the
 * shared slim header + stat-row design language without a hollow modes strip.
 */
export interface WorkspaceStat {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface WorkspaceTab {
  value: string;
  label: string;
  /** Tab body. Omit to supply the gated <TabsContent> blocks via `children` instead. */
  content?: ReactNode;
  /** className on the TabsContent wrapper (preserves each tab's own layout). */
  contentClassName?: string;
  /** optional id on the TabsContent wrapper (scroll anchors). */
  contentId?: string;
}

export function WorkspaceShell({
  title,
  subtitle,
  stats = [],
  tabs = [],
  activeTab,
  onTabChange,
  modesLabel,
  modesSubtitle,
  statsLead,
  actions,
  betweenStatsAndTabs,
  statsGridClassName = "grid flex-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4",
  subTruncate = false,
  children,
}: {
  title: string;
  subtitle: string;
  /** Dark stat-row tiles. Omit (or pass []) for a help/overview page with no metrics. */
  stats?: WorkspaceStat[];
  /** Mode tabs. Omit (or pass []) for an overview page with no modes. */
  tabs?: WorkspaceTab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  modesLabel?: string;
  modesSubtitle?: string;
  /** Optional leading element inside the stat band (e.g. the current-learner selector). */
  statsLead?: ReactNode;
  /** Optional header actions (rendered top-right of the slim header). */
  actions?: ReactNode;
  /** Optional element(s) between the stat band and the tabs (e.g. a priority strip).
   *  Pass a fragment so its children flatten into the space-y-3 stack. */
  betweenStatsAndTabs?: ReactNode;
  /** className for the stat-tile grid (defaults to Coach Studio's 4-up layout). */
  statsGridClassName?: string;
  /** Truncate stat sub-labels to one line (keeps long subs compact). */
  subTruncate?: boolean;
  /** Gated <TabsContent> blocks, for tabs that don't supply `content` inline. */
  children?: ReactNode;
}) {
  return (
    <div className="workspace-stack">
      <div className="rounded-[1.75rem] border border-[#1B303C]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,248,250,0.92))] px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-4xl space-y-1.5">
            <h1 className="text-[1.2rem] font-semibold leading-tight tracking-tight text-[#1B303C] sm:text-[1.3rem]">{title}</h1>
            <p className="max-w-4xl text-sm leading-6 text-[#4A6373]">{subtitle}</p>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </div>
      </div>
      <div className="focus-stack">
        <div className="space-y-3">
          {stats.length > 0 ? (
          <div className="rounded-[1.35rem] border border-white/12 bg-[linear-gradient(135deg,rgba(9,18,28,0.96),rgba(20,32,44,0.92))] px-4 py-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.13)]">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              {statsLead}
              <div className={statsGridClassName}>
                {stats.map((stat, index) => {
                  const inner = (
                    <>
                      <div className="flex items-center gap-2 text-slate-300">{stat.icon}<span className="text-[10px] font-semibold uppercase tracking-[0.22em]">{stat.label}</span></div>
                      <p className="mt-1.5 text-base font-semibold text-white">{stat.value}</p>
                      {stat.sub ? <p className={subTruncate ? "truncate text-[11px] leading-4 text-slate-400" : "text-[11px] leading-4 text-slate-400"}>{stat.sub}</p> : null}
                    </>
                  );
                  return stat.onClick ? (
                    <button key={index} type="button" onClick={stat.onClick} className="rounded-[1rem] border border-white/12 bg-slate-950/45 px-2.5 py-2 text-left transition hover:border-white/18 hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/45">
                      {inner}
                    </button>
                  ) : (
                    <div key={index} className="rounded-[1rem] border border-white/12 bg-slate-950/45 px-2.5 py-2 text-left">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          ) : null}
          {betweenStatsAndTabs}
          {tabs.length > 0 ? (
            <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-2.5">
              <div className="command-band px-4 py-2.5 md:px-4.5">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">{modesLabel}</p>
                    {modesSubtitle ? <p className="mt-1 text-sm leading-5 text-slate-700">{modesSubtitle}</p> : null}
                  </div>
                  <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 rounded-[1.1rem] border border-slate-200 bg-white/85 p-1.5 shadow-[0_10px_20px_rgba(15,23,42,0.05)] xl:w-auto">
                    {tabs.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-3.5 py-1.5 text-slate-700 transition hover:bg-slate-100 data-[state=active]:bg-white data-[state=active]:text-slate-950">{tab.label}</TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>
              {tabs.map((tab) =>
                tab.content !== undefined && activeTab === tab.value ? (
                  <TabsContent key={tab.value} value={tab.value} id={tab.contentId} className={tab.contentClassName}>
                    {tab.content}
                  </TabsContent>
                ) : null,
              )}
              {children}
            </Tabs>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
