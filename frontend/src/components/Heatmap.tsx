interface HeatmapProps {
  year: number;
  month: number;
  data: Record<string, number>;
  getIntensity?: (value: number) => number;
}

export default function Heatmap({ year, month, data, getIntensity }: HeatmapProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const monthStr = String(month).padStart(2, "0");
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

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
    <div>
      <div className="grid grid-cols-7 gap-1 max-w-xs">
        {dayLabels.map((label, i) => (
          <div key={i} className="text-[10px] text-zinc-600 text-center">{label}</div>
        ))}
        {cells.map((cell, i) => {
          if (cell.day === null) {
            return <div key={i} />;
          }
          const intensity = cell.value > 0
            ? (getIntensity ? getIntensity(cell.value) : 1)
            : 0;
          return (
            <div
              key={i}
              className="aspect-square rounded-sm flex items-center justify-center text-[9px]"
              style={{
                backgroundColor: intensity > 0
                  ? `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`
                  : "rgb(24, 24, 27)",
              }}
              title={`${cell.dateStr}: ${cell.value || "\u2014"}`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
