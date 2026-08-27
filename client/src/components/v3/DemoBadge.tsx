import { trpc } from "@/lib/trpc";

// Persistent "this is a demo" marker, rendered once at the app root so it sits on EVERY
// screen (entry page, every workspace, the training player). Server-truthful: reads
// demo.config.demoMode and disappears the moment DEMO_MODE is off. Defaults to shown while
// the flag loads so a demo deploy is never briefly unlabelled. Fixed + non-blocking.
export function DemoBadge() {
  const demoMode = trpc.demo.config.useQuery().data?.demoMode ?? true;
  if (!demoMode) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-3 pb-3"
    >
      <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#FCBC34]/50 bg-[#1B303C] px-4 py-1.5 text-[12px] font-semibold text-[#FCBC34] shadow-[0_10px_30px_rgba(15,23,42,0.35)]">
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-[#FCBC34]" />
        DEMO — seeded sample data, not a signed-in account
      </span>
    </div>
  );
}
