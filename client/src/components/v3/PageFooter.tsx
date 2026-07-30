// v3 kit — the page footer: copyright + legal labels. Legal pages don't exist yet,
// so the labels are non-interactive placeholders (styled to match) rather than dead
// links; they become anchors once the pages land.
export function PageFooter() {
  return (
    <footer className="flex flex-col gap-2 border-t border-[#1B303C]/8 pt-5 text-[13px] text-[#4A6373] sm:flex-row sm:items-center sm:justify-between">
      <p>© 2026 EnableOS · CH Consulting Group. All rights reserved.</p>
      <nav aria-label="Legal" className="flex items-center gap-5">
        <span className="text-[#4A6373]">Privacy Policy</span>
        <span className="text-[#4A6373]">Terms of Service</span>
      </nav>
    </footer>
  );
}
