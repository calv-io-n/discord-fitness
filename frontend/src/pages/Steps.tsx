import { useEffect, useState } from "react";
import { api, type Targets, type StepsEntry } from "@/lib/api";
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
  ReferenceLine,
} from "recharts";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day; // Monday=1 ... Sunday=7
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function Steps() {
  const [targets, setTargets] = useState<Targets | null>(null);
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    Promise.all([api.targets(), api.steps(year, month)])
      .then(([t, s]) => {
        setTargets(t);
        setEntries(s.entries);
      })
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
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toISOString().slice(0, 10);
  const weekStart = getWeekStart(now);
  const dayOfWeek = getDayOfWeek(now);
  const totalDaysInMonth = daysInMonth(year, month);
  const dayOfMonth = now.getDate();

  const dailyTarget = targets?.steps?.daily ?? 0;

  // Weekly calculations
  const weekEntries = entries.filter((e) => e.date >= weekStart && e.date <= today);
  const weekTotal = weekEntries.reduce((s, e) => s + (e.steps || 0), 0);
  const weeklyTarget = dailyTarget * 7;
  const weekDaysRemaining = 7 - dayOfWeek;
  const weekDaysElapsed = dayOfWeek;
  const weeklyOnTrack =
    weekDaysElapsed > 0
      ? (weekTotal / weekDaysElapsed) * 7 >= weeklyTarget
      : true;

  // Monthly calculations
  const monthTotal = entries.reduce((s, e) => s + (e.steps || 0), 0);
  const monthlyTarget = dailyTarget * totalDaysInMonth;
  const monthDaysRemaining = totalDaysInMonth - dayOfMonth;
  const monthDaysElapsed = dayOfMonth;
  const monthlyOnTrack =
    monthDaysElapsed > 0
      ? (monthTotal / monthDaysElapsed) * totalDaysInMonth >= monthlyTarget
      : true;

  // Build bar chart data: one entry per day of the month
  const stepsByDate: Record<string, number> = {};
  for (const e of entries) {
    stepsByDate[e.date] = (stepsByDate[e.date] || 0) + (e.steps || 0);
  }

  const chartData = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return {
      date: String(day),
      steps: stepsByDate[dateStr] || 0,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Steps</h1>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="Weekly Steps"
          value={weekTotal.toLocaleString()}
          target={weeklyTarget > 0 ? weeklyTarget : undefined}
          targetUnit="steps"
          subtitle={
            `${weekDaysRemaining} day${weekDaysRemaining !== 1 ? "s" : ""} remaining` +
            (dailyTarget > 0
              ? ` \u2022 ${weeklyOnTrack ? "On track" : "Behind pace"}`
              : "")
          }
        />
        <MetricCard
          label="Monthly Steps"
          value={monthTotal.toLocaleString()}
          target={monthlyTarget > 0 ? monthlyTarget : undefined}
          targetUnit="steps"
          subtitle={
            `${monthDaysRemaining} day${monthDaysRemaining !== 1 ? "s" : ""} remaining` +
            (dailyTarget > 0
              ? ` \u2022 ${monthlyOnTrack ? "On track" : "Behind pace"}`
              : "")
          }
        />
      </div>

      {/* Daily Steps Bar Chart */}
      <Card className="bg-[#12131a] border-[#1e2030]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-[#a0a4b8]">
            Daily Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
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
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#12131a",
                  border: "1px solid #1e2030",
                  borderRadius: "8px",
                  color: "#e4e4e7",
                }}
                formatter={(value: number) => [
                  value.toLocaleString() + " steps",
                  "Steps",
                ]}
              />
              <Bar
                dataKey="steps"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
              {dailyTarget > 0 && (
                <ReferenceLine
                  y={dailyTarget}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: `Target: ${dailyTarget.toLocaleString()}`,
                    fill: "#ef4444",
                    fontSize: 12,
                    position: "insideTopRight",
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
