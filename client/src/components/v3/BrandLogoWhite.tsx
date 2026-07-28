// v3 kit — the EnableOS wordmark for dark surfaces (the sidebar rail). Gold on dark
// is #FCBC34 (the dual-surface rule); the diamond mark nods to the CHCG brand.
export function BrandLogoWhite() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0">
        <rect x="4" y="4" width="22" height="22" rx="6" transform="rotate(45 15 15)" fill="#2C6FEC" />
        <rect x="9.5" y="9.5" width="11" height="11" rx="3" transform="rotate(45 15 15)" fill="#FCBC34" />
      </svg>
      <div className="leading-tight">
        <p className="text-[1.02rem] font-extrabold tracking-tight text-white">
          ENABL<span className="text-[#FCBC34]">EOS</span>
        </p>
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-white/55">by CH Consulting Group</p>
      </div>
    </div>
  );
}
