import { useEffect, useState } from "react";
import { api, type NutritionEntry, type Targets } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  return d.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
}

function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day; // Monday=1 ... Sunday=7
}

const MACRO_COLORS = {
  Protein: "#3b82f6",
  Carbs: "#f59e0b",
  Fat: "#ef4444",
};

export default function Nutrition() {
  const [targets, setTargets] = useState<Targets | null>(null);
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Also fetch previous month if the week started in it
    const weekStartDate = new Date(now);
    const dow = weekStartDate.getDay();
    weekStartDate.setDate(weekStartDate.getDate() - (dow === 0 ? 6 : dow - 1));
    const prevMonth = weekStartDate.getMonth() + 1;
    const prevYear = weekStartDate.getFullYear();
    const needsPrevMonth = prevYear !== year || prevMonth !== now.getMonth() + 1;

    const fetches: Promise<any>[] = [api.targets(), api.nutrition(year, month)];
    if (needsPrevMonth) {
      fetches.push(
        api.nutrition(prevYear, String(prevMonth).padStart(2, "0")).catch(() => ({ entries: [] }))
      );
    }

    Promise.all(fetches)
      .then(([t, current, prev]) => {
        setTargets(t);
        const allEntries = [...(prev?.entries || []), ...current.entries];
        setEntries(allEntries);
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

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
  const weekStart = getWeekStart(new Date());
  const dayOfWeek = getDayOfWeek(new Date());
  const daysRemaining = 7 - dayOfWeek;

  // Today's entries
  const todayEntries = entries.filter((e) => e.date === today);
  const todayCals = todayEntries.reduce((s, e) => s + (e.calories || 0), 0);
  const todayProtein = todayEntries.reduce((s, e) => s + (e.protein || 0), 0);
  const todayCarbs = todayEntries.reduce((s, e) => s + (e.carbs || 0), 0);
  const todayFat = todayEntries.reduce((s, e) => s + (e.fat || 0), 0);

  // This week's entries (Monday through Sunday)
  const weekEntries = entries.filter((e) => e.date >= weekStart && e.date <= today);
  const weekCals = weekEntries.reduce((s, e) => s + (e.calories || 0), 0);

  // Weekly targets
  const dailyCalTarget = targets?.nutrition?.calories ?? 0;
  const weeklyCalTarget = dailyCalTarget * 7;

  // Projection: average from completed days, project for remaining days (excluding today)
  const completedDays = dayOfWeek - 1; // Mon=0 completed, Tue=1, etc.
  const completedCals = weekCals - todayCals;
  const avgDailyCal = completedDays > 0 ? completedCals / completedDays : 0;
  const remainingDays = 7 - dayOfWeek; // days after today
  // Projected = what's already logged + avg * remaining days (today counts as logged, not projected)
  const projectedWeekly = completedDays > 0
    ? Math.round(weekCals + avgDailyCal * remainingDays)
    : 0;
  const isOnTrack = weeklyCalTarget > 0 && projectedWeekly > 0 ? projectedWeekly <= weeklyCalTarget : true;

  const nt = targets?.nutrition;

  // Pie chart data (calories from each macro: protein=4cal/g, carbs=4cal/g, fat=9cal/g)
  const proteinCals = Math.round(todayProtein * 4);
  const carbsCals = Math.round(todayCarbs * 4);
  const fatCals = Math.round(todayFat * 9);
  const totalMacroCals = proteinCals + carbsCals + fatCals;

  const pieData = [
    { name: "Protein", value: proteinCals, grams: Math.round(todayProtein) },
    { name: "Carbs", value: carbsCals, grams: Math.round(todayCarbs) },
    { name: "Fat", value: fatCals, grams: Math.round(todayFat) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Nutrition</h1>

      {/* Section 1: Daily Macro Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Calories"
          value={todayCals}
          unit="kcal"
          target={nt?.calories}
          targetUnit="kcal"
        />
        <MetricCard
          label="Protein"
          value={Math.round(todayProtein)}
          unit="g"
          target={nt?.protein}
          targetUnit="g"
        />
        <MetricCard
          label="Carbs"
          value={Math.round(todayCarbs)}
          unit="g"
          target={nt?.carbs}
          targetUnit="g"
        />
        <MetricCard
          label="Fat"
          value={Math.round(todayFat)}
          unit="g"
          target={nt?.fat}
          targetUnit="g"
        />
      </div>

      {/* Section 2: Macro Pie Chart + Weekly Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#12131a] border-[#1e2030]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#6b6f85] uppercase tracking-wider">
              Macro Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalMacroCals === 0 ? (
              <p className="text-sm text-[#6b6f85] py-4 text-center">
                No macros logged today.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={MACRO_COLORS[entry.name as keyof typeof MACRO_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#12131a",
                      border: "1px solid #1e2030",
                      borderRadius: "8px",
                      color: "#e4e4e7",
                    }}
                    formatter={(value, name, props) => [
                      `${props.payload.grams}g (${Math.round(
                        ((value as number) / totalMacroCals) * 100
                      )}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    formatter={(value, _entry) => {
                      const item = pieData.find((d) => d.name === value);
                      const pct = item
                        ? Math.round((item.value / totalMacroCals) * 100)
                        : 0;
                      return (
                        <span style={{ color: "#a0a4b8", fontSize: 12 }}>
                          {value} {pct}%
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#12131a] border-[#1e2030]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#6b6f85] uppercase tracking-wider">
              Weekly Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MetricCard
              label="Weekly Calories"
              value={weekCals}
              unit="kcal"
              target={weeklyCalTarget > 0 ? weeklyCalTarget : undefined}
              targetUnit="kcal"
              subtitle={`${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining this week`}
            />
            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight text-white">
                {projectedWeekly.toLocaleString()}{" "}
                <span className="text-sm font-normal text-[#6b6f85]">kcal projected</span>
              </div>
              {weeklyCalTarget > 0 && (
                <p className="text-xs text-[#4a4d5e] mt-1">
                  / {weeklyCalTarget.toLocaleString()} kcal target
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isOnTrack ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isOnTrack ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isOnTrack ? "On track" : "Over target"}
                </span>
              </div>
              <p className="text-xs mt-2 text-[#6b6f85]">
                Based on avg {Math.round(avgDailyCal).toLocaleString()} kcal/day ({completedDays} completed day{completedDays !== 1 ? "s" : ""})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Today's Food Log */}
      <Card className="bg-[#12131a] border-[#1e2030]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-[#a0a4b8]">
            Today's Food Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <p className="text-sm text-[#6b6f85] py-4 text-center">
              No meals logged today.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1e2030]">
                  <TableHead className="text-[#8b8fa3]">Meal</TableHead>
                  <TableHead className="text-right text-[#8b8fa3]">Calories</TableHead>
                  <TableHead className="text-right text-[#8b8fa3]">Protein</TableHead>
                  <TableHead className="text-right text-[#8b8fa3]">Carbs</TableHead>
                  <TableHead className="text-right text-[#8b8fa3]">Fat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayEntries.map((entry, i) => (
                  <TableRow key={i} className="border-[#1e2030]">
                    <TableCell className="font-medium">{entry.meal}</TableCell>
                    <TableCell className="text-right">{entry.calories}</TableCell>
                    <TableCell className="text-right">{entry.protein}g</TableCell>
                    <TableCell className="text-right">{entry.carbs}g</TableCell>
                    <TableCell className="text-right">{entry.fat}g</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="border-[#1e2030] bg-[#1a1b2e]/60">
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{todayCals}</TableCell>
                  <TableCell className="text-right font-bold">{Math.round(todayProtein)}g</TableCell>
                  <TableCell className="text-right font-bold">{Math.round(todayCarbs)}g</TableCell>
                  <TableCell className="text-right font-bold">{Math.round(todayFat)}g</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
