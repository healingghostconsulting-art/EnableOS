import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          // Surface stays theme-aware (popover changes under .dark); v3 §2.8 adds the brand
          // radius so toasts match the card language.
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--eos-radius-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        // v3 §2.8 — a left status accent bar (semantic color, paired with sonner's own icon)
        // on the branded card surface + shadow.
        classNames: {
          toast: "border-l-4 shadow-[var(--eos-shadow-card)]",
          success: "border-l-[color:var(--eos-status-green)]",
          error: "border-l-[color:var(--eos-status-red)]",
          warning: "border-l-[color:var(--eos-status-amber)]",
          info: "border-l-[color:var(--eos-status-info)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
