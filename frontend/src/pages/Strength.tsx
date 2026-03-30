import { Fragment, useEffect, useState } from "react";
import { api, type StrengthEntry } from "@/lib/api";
import Heatmap from "@/components/Heatmap";
import TrendIndicator from "@/components/TrendIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ExerciseStats {
  exercise: string;
  category: string;
  lastWeight: number;
  lastReps: number;
  bestWeight: number;
  bestReps: number;
  trend: "up" | "down" | "flat";
  delta: number;
  sessions: { date: string; weight: number; reps: number; sets: number }[];
}

function computeStats(entries: StrengthEntry[]): ExerciseStats[] {
  const groups = new Map<string, StrengthEntry[]>();

  for (const e of entries) {
    const key = e.exercise.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const stats: ExerciseStats[] = [];

  for (const [, group] of groups) {
    // Sort by date ascending
    group.sort((a, b) => a.date.localeCompare(b.date));

    // Use original case from the most recent entry
    const displayName = group[group.length - 1].exercise;
    const category = group[group.length - 1].category || "";

    // Last = most recent entry
    const last = group[group.length - 1];

    // Best = entry with highest weight
    const best = group.reduce((max, e) => (e.weight > max.weight ? e : max), group[0]);

    // Trend: get last 2 unique dates, compare max weight on each
    const uniqueDates = [...new Set(group.map((e) => e.date))].sort();
    let trend: "up" | "down" | "flat" = "flat";
    let delta = 0;

    if (uniqueDates.length >= 2) {
      const lastDate = uniqueDates[uniqueDates.length - 1];
      const prevDate = uniqueDates[uniqueDates.length - 2];
      const lastMaxWeight = Math.max(
        ...group.filter((e) => e.date === lastDate).map((e) => e.weight)
      );
      const prevMaxWeight = Math.max(
        ...group.filter((e) => e.date === prevDate).map((e) => e.weight)
      );
      delta = Math.abs(lastMaxWeight - prevMaxWeight);
      if (lastMaxWeight > prevMaxWeight) trend = "up";
      else if (lastMaxWeight < prevMaxWeight) trend = "down";
      else trend = "flat";
    }

    // Sessions = all entries sorted by date
    const sessions = group.map((e) => ({
      date: e.date,
      weight: e.weight,
      reps: e.reps,
      sets: e.sets,
    }));

    stats.push({
      exercise: displayName,
      category,
      lastWeight: last.weight,
      lastReps: last.reps,
      bestWeight: best.weight,
      bestReps: best.reps,
      trend,
      delta,
      sessions,
    });
  }

  return stats;
}

function buildHeatmapData(entries: StrengthEntry[]): Record<string, number> {
  const data: Record<string, number> = {};
  for (const e of entries) {
    const volume = (e.sets || 0) * (e.reps || 0) * (e.weight || 0);
    data[e.date] = (data[e.date] || 0) + volume;
  }
  return data;
}

const PPL_CATEGORIES = ["all", "push", "pull", "legs"] as const;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function Strength() {
  const [view, setView] = useState<"current" | "summary">("current");
  const [entries, setEntries] = useState<StrengthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<
    { month: string; push: number; pull: number; legs: number }[]
  >([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = String(month).padStart(2, "0");

  // Fetch current month data
  useEffect(() => {
    setLoading(true);
    api
      .strength(year, monthStr)
      .then((res) => setEntries(res.entries))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, monthStr]);

  // Fetch 6-month summary data when switching to summary view
  useEffect(() => {
    if (view !== "summary") return;
    setSummaryLoading(true);

    const months: { y: number; m: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
    }

    Promise.all(
      months.map(({ y, m }) =>
        api
          .strength(y, String(m).padStart(2, "0"))
          .then((res) => ({ y, m, entries: res.entries }))
          .catch(() => ({ y, m, entries: [] as StrengthEntry[] }))
      )
    )
      .then((results) => {
        const data = results.map(({ m, y, entries: monthEntries }) => {
          const volumeByCategory = { push: 0, pull: 0, legs: 0 };
          for (const e of monthEntries) {
            const cat = (e.category || "").toLowerCase();
            const vol = (e.sets || 0) * (e.reps || 0) * (e.weight || 0);
            if (cat in volumeByCategory) {
              volumeByCategory[cat as keyof typeof volumeByCategory] += vol;
            }
          }
          return {
            month: `${MONTH_NAMES[m - 1]} ${y}`,
            ...volumeByCategory,
          };
        });
        setSummaryData(data);
      })
      .catch(console.error)
      .finally(() => setSummaryLoading(false));
  }, [view, year, month]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8b8fa3]">
        Loading...
      </div>
    );
  }

  const heatmapData = buildHeatmapData(entries);
  const maxVolume = Math.max(...Object.values(heatmapData), 1);
  const stats = computeStats(entries);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Strength</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("current")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "current"
                ? "bg-white/10 text-white"
                : "text-[#a0a4b8] hover:text-white"
            }`}
          >
            Current Month
          </button>
          <button
            onClick={() => setView("summary")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "summary"
                ? "bg-white/10 text-white"
                : "text-[#a0a4b8] hover:text-white"
            }`}
          >
            Monthly Summary
          </button>
        </div>
      </div>

      {view === "current" ? (
        <div className="space-y-6">
          {/* Monthly Workout Heatmap */}
          <Card className="bg-[#12131a] border-[#1e2030]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-[#a0a4b8]">
                Workout Volume Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Heatmap
                year={year}
                month={month}
                data={heatmapData}
                getIntensity={(v) => v / maxVolume}
              />
            </CardContent>
          </Card>

          {/* PPL Filter Tabs + Exercise Table */}
          <Card className="bg-[#12131a] border-[#1e2030]">
            <CardContent className="pt-6">
              <Tabs defaultValue="all">
                <TabsList>
                  {PPL_CATEGORIES.map((cat) => (
                    <TabsTrigger key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {PPL_CATEGORIES.map((cat) => (
                  <TabsContent key={cat} value={cat}>
                    <ExerciseTable
                      stats={
                        cat === "all"
                          ? stats
                          : stats.filter(
                              (s) => s.category.toLowerCase() === cat
                            )
                      }
                      expandedExercise={expandedExercise}
                      onToggleExpand={(name) =>
                        setExpandedExercise(
                          expandedExercise === name ? null : name
                        )
                      }
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Summary View */}
          <Card className="bg-[#12131a] border-[#1e2030]">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-[#a0a4b8]">
                Volume by Category (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="flex items-center justify-center h-64 text-[#8b8fa3]">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={summaryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2030" />
                    <XAxis
                      dataKey="month"
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
                        value.toLocaleString() + " lbs",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }}
                    />
                    <Bar
                      dataKey="push"
                      name="Push"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="pull"
                      name="Pull"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="legs"
                      name="Legs"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ExerciseTable({
  stats,
  expandedExercise,
  onToggleExpand,
}: {
  stats: ExerciseStats[];
  expandedExercise: string | null;
  onToggleExpand: (name: string) => void;
}) {
  if (stats.length === 0) {
    return (
      <p className="text-sm text-[#6b6f85] py-4 text-center">
        No exercises logged this month.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#1e2030]">
          <TableHead className="text-[#8b8fa3]">Exercise</TableHead>
          <TableHead className="text-[#8b8fa3]">Category</TableHead>
          <TableHead className="text-right text-[#8b8fa3]">Last</TableHead>
          <TableHead className="text-right text-[#8b8fa3]">Best</TableHead>
          <TableHead className="text-right text-[#8b8fa3]">Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map((s) => (
          <Fragment key={s.exercise}>
            <TableRow
              className="border-[#1e2030] cursor-pointer hover:bg-white/[0.04]"
              onClick={() => onToggleExpand(s.exercise)}
            >
              <TableCell className="font-medium">{s.exercise}</TableCell>
              <TableCell>
                <span className="inline-block rounded bg-[#1a1b2e] px-2 py-0.5 text-xs text-[#a0a4b8] capitalize">
                  {s.category || "\u2014"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {s.lastWeight}&times;{s.lastReps}
              </TableCell>
              <TableCell className="text-right">
                {s.bestWeight}&times;{s.bestReps}
              </TableCell>
              <TableCell className="text-right">
                <TrendIndicator direction={s.trend} delta={s.delta} unit="lbs" />
              </TableCell>
            </TableRow>
            {expandedExercise === s.exercise && (
              <TableRow className="border-[#1e2030]">
                <TableCell colSpan={5} className="bg-[#0c0d14] p-0">
                  <div className="px-4 py-3">
                    <p className="text-xs text-[#8b8fa3] mb-2 font-medium uppercase tracking-wide">
                      Session History
                    </p>
                    <div className="space-y-1">
                      {s.sessions.map((sess, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-sm text-[#a0a4b8]"
                        >
                          <span>{sess.date}</span>
                          <span>
                            {sess.sets} sets &times; {sess.reps} reps @{" "}
                            {sess.weight} lbs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
