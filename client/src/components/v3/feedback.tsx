import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

// v3 interaction primitive — the toast helper. A thin CHCG-styled wrapper over sonner
// (the Toaster is already mounted in App.tsx). Icons reuse the StatusMark silhouettes
// (check-ring for success, triangle for error) so toast semantics match the rest of the
// app. Use for the save/success/error feedback that actions previously gave silently.

export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description, icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> }),
  error: (message: string, description?: string) =>
    toast.error(message, { description, icon: <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden="true" /> }),
  info: (message: string, description?: string) =>
    toast(message, { description, icon: <Info className="h-4 w-4 text-[#1B303C]" aria-hidden="true" /> }),
};
