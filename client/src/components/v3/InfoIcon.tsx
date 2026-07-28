import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// v3 kit — an (i) affordance with a keyboard-accessible tooltip. The `label` is both
// the accessible name and the tooltip text.
export function InfoIcon({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#4A6373] transition-colors hover:text-[#1B303C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 motion-reduce:transition-none"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[16rem] text-xs leading-5">{label}</TooltipContent>
    </Tooltip>
  );
}
