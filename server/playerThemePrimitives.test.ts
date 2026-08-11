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
});
