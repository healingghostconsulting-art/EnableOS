import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

/**
 * Deep-link receiver for in-app navigation.
 *
 * Surfaces across EnableOS emit anchored links in the shape
 * `/{route}?tab={tab}#{sectionId}` (see CalendarView `hrefFor` and the
 * reminder deep-links in shared/). Historically nothing consumed the
 * `?tab=`/`#hash` on the receiving page, so those links dumped the user at
 * the top of the destination. This module is the missing receiver: on mount
 * (and on any route change) it selects the requested tab and scrolls the
 * requested section into view.
 */

/**
 * Scroll a section into view by id, retrying while the target is still
 * mounting. Pages like the Reporting Hub render their sections only after a
 * tRPC query resolves and after a tab switch commits, so a single immediate
 * scroll would miss. We poll a handful of times, then give up quietly.
 */
export function scrollToSection(
  sectionId: string,
  { attempts = 12, interval = 120, delay = 40, behavior = "smooth" }: { attempts?: number; interval?: number; delay?: number; behavior?: ScrollBehavior } = {},
): void {
  if (typeof window === "undefined" || !sectionId) return;
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(sectionId);
    // Require the target to actually be LAID OUT, not merely present: an anchor under an
    // inactive tab (display:none) is in the DOM but getClientRects() is empty, and
    // scrollIntoView on it is a silent no-op. Poll until it un-hides, then scroll.
    if (el && el.getClientRects().length > 0) {
      el.scrollIntoView({ behavior, block: "start" });
      return;
    }
    if (++tries < attempts) window.setTimeout(tick, interval);
  };
  window.setTimeout(tick, delay);
}

export interface DeepLinkTarget {
  tab: string | null;
  sectionId: string | null;
}

/** Read `?tab=` and `#sectionId` off the current URL. */
export function readDeepLinkTarget(): DeepLinkTarget {
  if (typeof window === "undefined") return { tab: null, sectionId: null };
  const tab = new URLSearchParams(window.location.search).get("tab");
  const rawHash = window.location.hash ? window.location.hash.replace(/^#/, "") : "";
  let sectionId: string | null = null;
  if (rawHash) {
    try {
      sectionId = decodeURIComponent(rawHash);
    } catch {
      sectionId = rawHash;
    }
  }
  return { tab: tab || null, sectionId };
}

export interface DeepLinkHandlers {
  /** Select the requested tab. The caller validates/narrows the string. */
  onTab?: (tab: string) => void;
  /**
   * Optionally derive a tab from a bare `#sectionId` (no `?tab=`), so that a
   * section living under an inactive tab is revealed before we scroll to it.
   */
  resolveTabForSection?: (sectionId: string) => string | undefined;
}

/**
 * Honor an incoming `?tab=`/`#sectionId` deep-link on the current page.
 * Runs on mount and whenever the wouter path changes.
 */
export function useDeepLinkTarget(handlers: DeepLinkHandlers = {}): void {
  const [location] = useLocation();
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const { tab, sectionId } = readDeepLinkTarget();
    const { onTab, resolveTabForSection } = ref.current;
    const targetTab = tab ?? (sectionId ? resolveTabForSection?.(sectionId) : undefined);
    if (targetTab && onTab) onTab(targetTab);
    if (sectionId) scrollToSection(sectionId);
    // Re-run when the route changes (path only from wouter); mount covers the
    // cross-page landing case that motivates this hook.
  }, [location]);
}
