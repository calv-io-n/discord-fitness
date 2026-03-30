import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  direction: "up" | "down" | "flat";
  delta?: number;
  unit?: string;
}

export default function TrendIndicator({ direction, delta, unit = "lbs" }: TrendIndicatorProps) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-green-500 text-sm">
        <ArrowUp className="w-3 h-3" />
        {delta !== undefined && `+${delta} ${unit}`}
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 text-sm">
        <ArrowDown className="w-3 h-3" />
        {delta !== undefined && `\u2212${delta} ${unit}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-yellow-500 text-sm">
      <Minus className="w-3 h-3" />
      Same
    </span>
  );
}
