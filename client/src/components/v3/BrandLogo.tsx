// v3 kit — the EnableOS co-brand wordmark for light surfaces. CHCG palette only:
// a navy wordmark with a gold "OS" in navy-gold ink (#7A5200, the dual-surface gold
// on light — never #FCBC34), over a "by CH Consulting Group" attribution. No icon
// mark — the official CHCG lockups in client/public/brand are a wide 1000×120
// horizontal lockup that doesn't fit this compact wordmark slot.
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span className="text-[1.05rem] font-bold tracking-tight text-[#1B303C]">
        Enable<span className="text-[#7A5200]">OS</span>
      </span>
      <span className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#4A6373]">by CH Consulting Group</span>
    </span>
  );
}
