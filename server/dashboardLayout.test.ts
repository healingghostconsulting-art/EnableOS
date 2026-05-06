import { describe, expect, it } from "vitest";

import { getDesktopSidebarUiState } from "../client/src/components/DashboardLayout";

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
});
