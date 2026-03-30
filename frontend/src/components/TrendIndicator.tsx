import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  direction: "up" | "down" | "flat";
  delta?: number;
  unit?: string;
}

export default function TrendIndicator({ direction, delta, unit = "lbs" }: TrendIndicatorProps) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium">
        <ArrowUp className="w-3.5 h-3.5" />
        {delta !== undefined && `+${delta} ${unit}`}
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 text-sm font-medium">
        <ArrowDown className="w-3.5 h-3.5" />
        {delta !== undefined && `\u2212${delta} ${unit}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-400 text-sm font-medium">
      <Minus className="w-3.5 h-3.5" />
      Same
    </span>
  );
}
