import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Training reskin — Phase 2 primitives. Source-level assertions (the repo has no DOM test
// runner; the v3 kit + player are covered this way elsewhere).

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("PlayerThemeContext (scoped, mirrors GrayscaleContext)", () => {
  const src = read("client/src/contexts/PlayerThemeContext.tsx");

  it("persists enableos.player.theme and defaults to light (mode B) per spec", () => {
    expect(src).toContain('"enableos.player.theme"');
    expect(src).toContain('return "light"'); // SSR/default is light
    expect(src).toContain('=== "focus" ? "focus" : "light"'); // stored focus wins, else light
    expect(src).toContain("localStorage.setItem");
    expect(src).toContain('type PlayerTheme = "focus" | "light"');
    expect(src).toContain("usePlayerTheme");
  });

  it("is SCOPED — never touches the document root or the app-wide theme", () => {
    // No document-root class, unlike GrayscaleContext; must not touch the document root.
    expect(src).not.toContain("documentElement");
    expect(src).not.toContain("classList");
  });

  it("is mounted in the app without replacing the app theme provider", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain("PlayerThemeProvider");
    expect(app).toContain("GrayscaleProvider"); // still there — not replaced
    expect(app).toContain("ThemeProvider"); // app-wide theme untouched
  });
});

describe("Modal tone prop (light default + dark variant)", () => {
  const src = read("client/src/components/v3/Modal.tsx");

  it("adds a tone prop defaulting to light, with a dark navy surface", () => {
    expect(src).toContain('tone?: ModalTone');
    expect(src).toContain('tone = "light"');
    expect(src).toContain("bg-[#0E2233]"); // dark surface
    expect(src).toContain("bg-white"); // light surface (default, unchanged)
  });

  it("cascades tone to header/body/footer via context (no call-site per-part overrides)", () => {
    expect(src).toContain("ModalToneContext");
    expect(src).toContain("useContext(ModalToneContext)");
  });

  it("pins the dark surface with an inline style so DialogContent's bg-background can't win", () => {
    // twMerge dedupes bg-white (known color) against bg-background, but NOT the arbitrary
    // bg-[#0E2233] — so the dark tone needs an inline style to actually render navy.
    expect(src).toContain('backgroundColor: "#0E2233"');
    expect(src).toContain("style={SURFACE_STYLE[tone]}");
  });
});

describe("v3 prop deltas for the player reformat (additive, default no-op)", () => {
  it("WidgetCard adds titleStyle spread onto the title element (KPI opt-out of card-title type)", () => {
    const src = read("client/src/components/v3/WidgetCard.tsx");
    expect(src).toContain("titleStyle?: CSSProperties");
    expect(src).toContain("titleStyle = {}"); // default no-op — existing call sites unchanged
    expect(src).toContain("style={titleStyle}"); // applied to the <h2> title element
  });

  it("InfoTile adds onDark: value+label flip to #fff, card surface delegated to a call-site wrapper", () => {
    const src = read("client/src/components/v3/InfoTile.tsx");
    expect(src).toContain("onDark?: boolean");
    expect(src).toContain("onDark = false"); // default no-op — existing light call sites unchanged
    expect(src).toContain('onDark ? "text-white" : "text-[#1B303C]"'); // value → #fff on dark
    expect(src).toContain('onDark ? "text-white" : "text-[#4A6373]"'); // label → #fff on dark
    // The correction moved the dark card surface OUT of InfoTile to a call-site wrapper, so
    // onDark renders a bare row and the light branch keeps its original white-card chrome.
    expect(src).toContain('onDark ? "flex items-center gap-3" :');
    expect(src).toContain('"flex items-center gap-3 rounded-2xl border border-[#1B303C]/10 bg-white px-4 py-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"');
  });
});

describe("v3 kit dark-tone extensions for the player regions (additive, default no-op)", () => {
  it("WidgetCard adds tone/variant/eyebrow/padding; dark tone is navy, light default unchanged", () => {
    const src = read("client/src/components/v3/WidgetCard.tsx");
    expect(src).toContain('tone?: WidgetCardTone');
    expect(src).toContain('variant?: WidgetCardVariant');
    expect(src).toContain("eyebrow?: string");
    expect(src).toContain("padding?: number");
    expect(src).toContain('tone = "light"'); // default keeps the shipped white card
    expect(src).toContain('variant = "section"'); // default keeps uppercase title + underline
    expect(src).toContain("bg-[#0b1826]"); // navy card on dark tone
    expect(src).toContain("rounded-2xl border-[#1B303C]/8 bg-white"); // light default byte-identical
  });

  it("Button adds a gold variant, a pill size, and an onDark prop (all additive)", () => {
    const src = read("client/src/components/ui/button.tsx");
    expect(src).toContain("gold: \"bg-[#FCBC34] text-[#1B303C]");
    expect(src).toContain('pill: "h-11 rounded-full');
    expect(src).toContain("onDark = false"); // default no-op
    expect(src).toContain('variant === "ghost"'); // onDark restyles ghost/secondary/outline
  });

  it("StatusMark adds onDark with a brightened navy palette; light META unchanged", () => {
    const src = read("client/src/components/v3/StatusMark.tsx");
    expect(src).toContain("onDark?: boolean");
    expect(src).toContain("onDark = false"); // default no-op
    expect(src).toContain("META_DARK");
    expect(src).toContain("onDark ? META_DARK[canonical] : meta");
    expect(src).toContain('bg-emerald-50 text-emerald-700'); // shipped light palette intact
  });
});

describe("Enlarge lightbox tone tracks the player theme", () => {
  const player = read("client/src/pages/EnableOSViews.tsx");

  it("passes tone={playerDark ? dark : light} to the lightbox Modal", () => {
    expect(player).toContain('tone={playerDark ? "dark" : "light"}');
    // The deck visual frame stays a black photo-frame inside the (now navy) chrome.
    expect(player).toContain("open={slideLightboxOpen}");
  });
});
