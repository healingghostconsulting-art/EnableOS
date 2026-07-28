// v3 kit — the EnableOS wordmark: a gold brand mark (the CHCG "C") + navy wordmark.
// Gold is used here as a decorative fill (not text), with a navy stroke for contrast.
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
        <rect width="26" height="26" rx="8" fill="#FCBC34" />
        <path d="M17.6 9.1a5.2 5.2 0 1 0 0 7.8" fill="none" stroke="#1B303C" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="text-[1.05rem] font-bold tracking-tight text-[#1B303C]">
        Enable<span className="font-semibold">OS</span>
      </span>
    </span>
  );
}
