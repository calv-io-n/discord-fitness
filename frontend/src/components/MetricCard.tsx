import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  target?: number;
  targetUnit?: string;
  status?: "on-track" | "over" | "neutral";
  subtitle?: string;
}

export default function MetricCard({ label, value, unit, target, targetUnit, status, subtitle }: MetricCardProps) {
  const numValue = typeof value === "number" ? value : 0;
  const pct = target ? Math.min((numValue / target) * 100, 100) : 0;
  const isOver = status === "over" || (target && numValue > target && status !== "on-track");

  return (
    <Card className={`bg-zinc-900 border-zinc-800 ${isOver ? "ring-red-500/30" : ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value} {unit && <span className="text-sm font-normal text-zinc-500">{unit}</span>}
        </div>
        {target !== undefined && (
          <>
            <p className="text-xs text-zinc-600 mt-1">
              Target: {target} {targetUnit || unit}
            </p>
            <Progress
              value={pct}
              className="mt-2 h-1"
            />
          </>
        )}
        {subtitle && <p className="text-xs mt-2 text-zinc-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
