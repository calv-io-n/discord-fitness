interface HeatmapProps {
  year: number;
  month: number;
  data: Record<string, number>;
  getIntensity?: (value: number) => number;
  color?: string; // CSS color for filled cells, defaults to emerald
}

export default function Heatmap({ year, month, data, getIntensity, color }: HeatmapProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const monthStr = String(month).padStart(2, "0");
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const fillColor = color || "34, 211, 153"; // emerald RGB

  const cells: { day: number | null; dateStr: string; value: number }[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, dateStr: "", value: 0 });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
    const value = data[dateStr] || 0;
    cells.push({ day: d, dateStr, value });
  }

  return (
    <div className="grid grid-cols-7 gap-1.5 max-w-sm">
      {dayLabels.map((label, i) => (
        <div key={i} className="text-[11px] font-medium text-[#4a4d5e] text-center pb-1">{label}</div>
      ))}
      {cells.map((cell, i) => {
        if (cell.day === null) {
          return <div key={i} />;
        }
        const intensity = cell.value > 0
          ? (getIntensity ? getIntensity(cell.value) : 1)
          : 0;
        const isFilled = intensity > 0;
        return (
          <div
            key={i}
            className={`aspect-square rounded flex items-center justify-center text-[11px] font-medium transition-colors ${
              isFilled ? "text-white" : "text-[#3a3d4e] bg-[#12131a]"
            }`}
            style={isFilled ? {
              backgroundColor: `rgba(${fillColor}, ${0.15 + intensity * 0.85})`,
              color: intensity > 0.5 ? "white" : `rgba(${fillColor}, 0.9)`,
            } : undefined}
            title={`${cell.dateStr}: ${cell.value || "\u2014"}`}
          >
            {cell.day}
          </div>
        );
      })}
    </div>
  );
}
