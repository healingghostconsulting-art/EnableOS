import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getDesktopSidebarAutoCollapseDelay, getDesktopSidebarUiState } from "../client/src/components/DashboardLayout";

const dashboardLayoutSource = readFileSync(join(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");

describe("getDesktopSidebarUiState", () => {
  it("uses an offcanvas desktop collapse mode with a reopen trigger when collapsed", () => {
    expect(getDesktopSidebarUiState({ isMobile: false, isCollapsed: true })).toEqual({
      collapseMode: "offcanvas",
      toggleLabel: "Open navigation",
      toggleChevronDirection: "right",
      showFloatingTrigger: true,
      mainPaddingClass: "pt-20 md:pt-24",
    });
  });

  it("keeps the sidebar inline when expanded on desktop", () => {
    expect(getDesktopSidebarUiState({ isMobile: false, isCollapsed: false })).toEqual({
      collapseMode: "offcanvas",
      toggleLabel: "Collapse navigation",
      toggleChevronDirection: "left",
      showFloatingTrigger: false,
      mainPaddingClass: "",
    });
  });

  it("avoids the desktop floating trigger on mobile", () => {
    expect(getDesktopSidebarUiState({ isMobile: true, isCollapsed: true })).toEqual({
      collapseMode: "offcanvas",
      toggleLabel: "Open navigation",
      toggleChevronDirection: "right",
      showFloatingTrigger: false,
      mainPaddingClass: "",
    });
  });

  it("uses a 12-second desktop auto-collapse timer and disables it on mobile", () => {
    expect(getDesktopSidebarAutoCollapseDelay(false)).toBe(12_000);
    expect(getDesktopSidebarAutoCollapseDelay(true)).toBeNull();
    expect(dashboardLayoutSource).toContain("onMouseEnter={restartAutoCollapseTimer}");
    expect(dashboardLayoutSource).toContain("setOpen(false);");
  });

  it("keeps desktop workspaces free of the obstructive top banner shell", () => {
    expect(dashboardLayoutSource).not.toContain("command-band px-4");
    expect(dashboardLayoutSource).not.toContain("commandSignal.headline");
    expect(dashboardLayoutSource).toContain(") : null}\n        <main className={`flex-1 p-3 pt-4 sm:p-4 sm:pt-5 md:p-6 md:pt-6 xl:p-8 xl:pt-6 ${desktopSidebarUi.mainPaddingClass}`}>{children}</main>");
  });
});
