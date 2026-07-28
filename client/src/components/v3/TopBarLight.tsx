import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandLogo } from "./BrandLogo";

// v3 kit — the light top bar: brand mark on the left, a "Need help?" affordance on
// the right. Help opens a tooltip (no dead link) until a support surface exists.
export function TopBarLight() {
  return (
    <header className="flex items-center justify-between">
      <BrandLogo />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-medium text-[#4A6373] transition-colors hover:text-[#1B303C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 motion-reduce:transition-none"
          >
            Need help? <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[18rem] text-xs leading-5">
          Contact your CHCG administrator to change your workspace access or role.
        </TooltipContent>
      </Tooltip>
    </header>
  );
}
