import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// v3 interaction layer — source-level assertions that the shared primitives exist and
// carry the accessibility + CHCG-token guarantees the surfaces rely on.

const read = (rel: string) => readFileSync(join(process.cwd(), `client/src/components/v3/${rel}`), "utf8");

describe("v3 interaction primitives", () => {
  it("ships the shared primitive modules", () => {
    for (const file of ["Button", "Field", "Modal", "feedback", "states"]) {
      expect(() => read(`${file}.tsx`)).not.toThrow();
    }
  });

  it("Button clears 44px, offers the dual-surface gold primary, and shows a focus ring", () => {
    const btn = read("Button.tsx");
    expect(btn).toContain("min-h-[44px]");
    expect(btn).toContain("bg-[#FCBC34] text-[#1B303C]"); // gold fill + navy ink
    expect(btn).toContain("focus-visible:ring-2");
  });

  it("form controls clear 44px and expose an invalid state", () => {
    const field = read("Field.tsx");
    expect(field).toContain("min-h-[44px]");
    expect(field).toContain("aria-invalid");
    expect(field).toContain("SelectField");
    expect(field).toContain("Segmented");
  });

  it("Modal composes the focus-trapping shadcn Dialog and structures header/body/footer", () => {
    const modal = read("Modal.tsx");
    expect(modal).toContain('from "@/components/ui/dialog"');
    for (const part of ["export function Modal", "ModalHeader", "ModalBody", "ModalFooter"]) {
      expect(modal).toContain(part);
    }
  });

  it("provides notify() over sonner and the loading/empty/error states", () => {
    expect(read("feedback.tsx")).toContain("export const notify");
    const states = read("states.tsx");
    for (const part of ["LoadingState", "SkeletonRows", "SkeletonCard", "EmptyState", "ErrorState"]) {
      expect(states).toContain(part);
    }
  });
});
