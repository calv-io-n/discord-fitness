import { useEffect, useState } from "react";
import { api, type CardioEntry } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function getWeekNumber(dateStr: string): string {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  return `W${week}`;
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Cardio() {
  const [entries, setEntries] = useState<CardioEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    api
      .cardio(year, month)
      .then((res) => setEntries(res.entries))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8b8fa3]">
        Loading...
      </div>
    );
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekStart = getWeekStart(now);

  // Weekly total minutes
  const weekEntries = entries.filter(
    (e) => e.date >= weekStart && e.date <= today
  );
  const weekTotal = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  // Monthly total minutes
  const monthTotal = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  // Get unique cardio types
  const types = [...new Set(entries.map((e) => e.type))];

  // Bar chart data: group by day and cardio type
  const barDataMap: Record<string, Record<string, number>> = {};
  for (const entry of entries) {
    if (!barDataMap[entry.date]) {
      barDataMap[entry.date] = {};
    }
    barDataMap[entry.date][entry.type] =
      (barDataMap[entry.date][entry.type] || 0) + (entry.duration || 0);
  }

  const barData = Object.keys(barDataMap)
    .sort()
    .map((date) => {
      const row: Record<string, string | number> = {
        date: date.slice(8), // day number
      };
      for (const t of types) {
        row[t] = barDataMap[date][t] || 0;
      }
      return row;
    });

  // Weekly trend data: group by week number, sum duration
  const weeklyMap: Record<string, number> = {};
  for (const entry of entries) {
    const week = getWeekNumber(entry.date);
    weeklyMap[week] = (weeklyMap[week] || 0) + (entry.duration || 0);
  }

  const weeklyTrendData = Object.keys(weeklyMap)
    .sort()
    .map((week) => ({
      week,
      minutes: weeklyMap[week],
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cardio</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="Weekly Total"
          value={weekTotal}
          unit="min"
          subtitle={`${weekEntries.length} session${weekEntries.length !== 1 ? "s" : ""}`}
        />
        <MetricCard
          label="Monthly Total"
          value={monthTotal}
          unit="min"
          subtitle={`${entries.length} session${entries.length !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Monthly Bar Chart by type */}
      <Card className="bg-[#12131a] border-[#1e2030]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-[#a0a4b8]">
            Daily Cardio by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <p className="text-sm text-[#6b6f85] py-4 text-center">
              No cardio logged this month.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2030" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b6f85", fontSize: 12 }}
                  axisLine={{ stroke: "#1e2030" }}
                  tickLine={{ stroke: "#1e2030" }}
                />
                <YAxis
                  tick={{ fill: "#6b6f85", fontSize: 12 }}
                  axisLine={{ stroke: "#1e2030" }}
                  tickLine={{ stroke: "#1e2030" }}
                  label={{
                    value: "min",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#6b6f85",
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#12131a",
                    border: "1px solid #1e2030",
                    borderRadius: "8px",
                    color: "#e4e4e7",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} min`,
                    name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }}
                />
                {types.map((type, i) => (
                  <Bar
                    key={type}
                    dataKey={type}
                    stackId="a"
                    fill={COLORS[i % COLORS.length]}
                    radius={
                      i === types.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Weekly Volume Trend */}
      {weeklyTrendData.length > 1 && (
        <Card className="bg-[#12131a] border-[#1e2030]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[#a0a4b8]">
              Weekly Volume Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2030" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#6b6f85", fontSize: 12 }}
                  axisLine={{ stroke: "#1e2030" }}
                  tickLine={{ stroke: "#1e2030" }}
                />
                <YAxis
                  tick={{ fill: "#6b6f85", fontSize: 12 }}
                  axisLine={{ stroke: "#1e2030" }}
                  tickLine={{ stroke: "#1e2030" }}
                  label={{
                    value: "min",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#6b6f85",
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#12131a",
                    border: "1px solid #1e2030",
                    borderRadius: "8px",
                    color: "#e4e4e7",
                  }}
                  formatter={(value: number) => [`${value} min`, "Total"]}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
