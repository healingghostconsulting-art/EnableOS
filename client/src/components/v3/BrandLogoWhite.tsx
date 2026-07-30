// v3 kit — the EnableOS co-brand wordmark for dark surfaces (the sidebar rail).
// CHCG palette only: white wordmark with a gold "OS" (#FCBC34 is the dual-surface
// gold, allowed here because the rail is dark), over a "by CH Consulting Group"
// attribution. No icon mark — the official CHCG lockups in client/public/brand are a
// wide 1000×120 horizontal lockup that doesn't fit this compact rail slot.
export function BrandLogoWhite() {
  return (
    <div className="leading-tight">
      <p className="text-[1.02rem] font-extrabold tracking-tight text-white">
        Enable<span className="text-[#FCBC34]">OS</span>
      </p>
      <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-white/55">by CH Consulting Group</p>
    </div>
  );
}
