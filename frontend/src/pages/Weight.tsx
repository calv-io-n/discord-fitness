import { useEffect, useState } from "react";
import { api, type Targets, type WeightEntry } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function movingAverage(data: { date: string; weight: number }[], window: number) {
  return data.map((_, i, arr) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    const avg = slice.reduce((s, d) => s + d.weight, 0) / slice.length;
    return { date: arr[i].date, avg: Math.round(avg * 10) / 10 };
  });
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type TimeRange = "month" | "year";

export default function Weight() {
  const [targets, setTargets] = useState<Targets | null>(null);
  const [monthEntries, setMonthEntries] = useState<WeightEntry[]>([]);
  const [yearEntries, setYearEntries] = useState<WeightEntry[][]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("month");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = String(month).padStart(2, "0");

  useEffect(() => {
    const monthPromises = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, "0");
      return api
        .weight(year, m)
        .then((res) => res.entries)
        .catch(() => [] as WeightEntry[]);
    });

    Promise.all([api.targets(), api.weight(year, monthStr), ...monthPromises])
      .then(([t, currentMonth, ...allMonths]) => {
        setTargets(t as Targets);
        setMonthEntries((currentMonth as { entries: WeightEntry[] }).entries);
        setYearEntries(allMonths as WeightEntry[][]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, monthStr]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8b8fa3]">
        Loading...
      </div>
    );
  }

  const targetWeight = targets?.weight?.target ?? 0;

  // Current weight = most recent weigh-in this month
  const sortedMonth = [...monthEntries].sort((a, b) => a.date.localeCompare(b.date));
  const currentWeight = sortedMonth.length > 0 ? sortedMonth[sortedMonth.length - 1].weight : 0;

  // Rate of loss: (first - last) / daysBetween * 7
  let ratePerWeek = 0;
  if (sortedMonth.length >= 2) {
    const first = sortedMonth[0];
    const last = sortedMonth[sortedMonth.length - 1];
    const daysBetween =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysBetween > 0) {
      ratePerWeek = Math.round(((first.weight - last.weight) / daysBetween) * 7 * 10) / 10;
    }
  }

  const toGoLbs = targetWeight > 0 ? Math.round((currentWeight - targetWeight) * 10) / 10 : 0;

  // Month chart data: merge daily weights with 7-day moving average
  const monthWeightData = sortedMonth.map((e) => ({
    date: e.date,
    weight: e.weight,
  }));
  const maData = movingAverage(monthWeightData, 7);
  const monthChartData = monthWeightData.map((d, i) => ({
    date: d.date.slice(5), // "MM-DD"
    weight: d.weight,
    trend: maData[i]?.avg,
  }));

  // Year chart data: monthly averages
  const yearChartData = yearEntries
    .map((monthData, i) => {
      if (monthData.length === 0) return null;
      const avg =
        Math.round(
          (monthData.reduce((s, e) => s + e.weight, 0) / monthData.length) * 10
        ) / 10;
      return { date: MONTH_NAMES[i], weight: avg };
    })
    .filter(Boolean) as { date: string; weight: number }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Weight</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setRange("month")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              range === "month"
                ? "bg-white/10 text-white"
                : "text-[#a0a4b8] hover:text-white"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setRange("year")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              range === "year"
                ? "bg-white/10 text-white"
                : "text-[#a0a4b8] hover:text-white"
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Current Weight"
          value={currentWeight || "\u2014"}
          unit="lbs"
        />
        <MetricCard
          label="Target Weight"
          value={targetWeight || "\u2014"}
          unit="lbs"
          subtitle={toGoLbs > 0 ? `${toGoLbs} lbs to go` : undefined}
        />
        <MetricCard
          label="Rate of Loss"
          value={ratePerWeek || "\u2014"}
          unit="lbs/week"
          subtitle={
            ratePerWeek > 0
              ? "Losing weight"
              : ratePerWeek < 0
                ? "Gaining weight"
                : undefined
          }
        />
      </div>

      {/* Weight Chart */}
      <Card className="bg-[#12131a] border-[#1e2030]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-[#a0a4b8]">
            {range === "month" ? "Daily Weigh-ins" : "Monthly Averages"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {range === "month" ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2030" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b6f85", fontSize: 12 }}
                  axisLine={{ stroke: "#1e2030" }}
                  tickLine={{ stroke: "#1e2030" }}
                />
                <YAxis
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tick={{ fill: "#6b6f85", fontSize: 12 }}
                  axisLine={{ stroke: "#1e2030" }}
                  tickLine={{ stroke: "#1e2030" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#12131a",
                    border: "1px solid #1e2030",
                    borderRadius: "8px",
                    color: "#e4e4e7",
                  }}
                  formatter={(value, name) => [
                    `${value} lbs`,
                    name === "trend" ? "7-day avg" : "Weight",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={false}
                />
                {targetWeight > 0 && (
                  <ReferenceLine
                    y={targetWeight}
                    stroke="#22c55e"
                    strokeDasharray="3 3"
                    label={{
                      value: `Target: ${targetWeight}`,
                      fill: "#22c55e",
                      fontSize: 12,
                      position: "insideTopRight",
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={yearChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2030" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b6f85", fontSize: 12 }}
                  axisLine={{ stroke: "#1e2030" }}
                  tickLine={{ stroke: "#1e2030" }}
                />
                <YAxis
                  domain={["dataMin - 5", "dataMax + 5"]}
                  tick={{ fill: "#6b6f85", fontSize: 12 }}
                  axisLine={{ stroke: "#1e2030" }}
                  tickLine={{ stroke: "#1e2030" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#12131a",
                    border: "1px solid #1e2030",
                    borderRadius: "8px",
                    color: "#e4e4e7",
                  }}
                  formatter={(value) => [`${value} lbs`, "Avg Weight"]}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                {targetWeight > 0 && (
                  <ReferenceLine
                    y={targetWeight}
                    stroke="#22c55e"
                    strokeDasharray="3 3"
                    label={{
                      value: `Target: ${targetWeight}`,
                      fill: "#22c55e",
                      fontSize: 12,
                      position: "insideTopRight",
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
