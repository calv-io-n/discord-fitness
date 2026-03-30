import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  target?: number;
  targetUnit?: string;
  status?: "on-track" | "over" | "neutral";
  subtitle?: string;
  accent?: string; // tailwind color class for progress bar
}

export default function MetricCard({ label, value, unit, target, targetUnit, status, subtitle, accent }: MetricCardProps) {
  const numValue = typeof value === "number" ? value : 0;
  const pct = target ? Math.min((numValue / target) * 100, 100) : 0;
  const isOver = status === "over" || (target && numValue > target && status !== "on-track");
  const barColor = isOver ? "bg-rose-500" : accent || "bg-emerald-500";

  return (
    <Card className="bg-[#12131a] border-[#1e2030] hover:border-[#2a2c42] transition-colors">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-semibold text-[#6b6f85] uppercase tracking-wider mb-3">
          {label}
        </p>
        <div className="text-3xl font-bold tracking-tight text-white">
          {value}
          {unit && <span className="text-base font-normal text-[#6b6f85] ml-1.5">{unit}</span>}
        </div>
        {target !== undefined && (
          <>
            <p className="text-xs text-[#4a4d5e] mt-2">
              / {target.toLocaleString()} {targetUnit || unit}
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-[#1a1b2e] overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
        {subtitle && <p className="text-xs mt-3 text-[#6b6f85]">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
