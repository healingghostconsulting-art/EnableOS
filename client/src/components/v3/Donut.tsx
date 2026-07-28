import { type ReactNode } from "react";

// v3 kit — an accessible SVG donut/progress ring. `value` is 0–100. Children render
// centered (e.g. the number + label). Purely presentational; label it via ariaLabel.
export function Donut({ value, size = 130, stroke = 12, color = "#1B303C", trackColor = "#E6EAF0", ariaLabel, children }: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  ariaLabel: string;
  children?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      {children ? <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div> : null}
    </div>
  );
}
