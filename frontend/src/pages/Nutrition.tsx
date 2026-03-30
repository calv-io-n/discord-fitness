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

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  return d.toISOString().slice(0, 10);
}

function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day; // Monday=1 ... Sunday=7
}

export default function Nutrition() {
  const [targets, setTargets] = useState<Targets | null>(null);
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    Promise.all([api.targets(), api.nutrition(year, month)])
      .then(([t, n]) => {
        setTargets(t);
        setEntries(n.entries);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Loading...
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
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

  // Projection: average daily calories so far this week * 7
  const daysElapsed = dayOfWeek;
  const avgDailyCal = daysElapsed > 0 ? weekCals / daysElapsed : 0;
  const projectedWeekly = Math.round(avgDailyCal * 7);
  const isOnTrack = weeklyCalTarget > 0 ? projectedWeekly <= weeklyCalTarget : true;

  const nt = targets?.nutrition;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nutrition</h1>

      {/* Section 1: Daily Macro Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Calories"
          value={todayCals}
          unit="kcal"
          target={nt?.calories}
          targetUnit="kcal"
        />
        <MetricCard
          label="Protein"
          value={todayProtein}
          unit="g"
          target={nt?.protein}
          targetUnit="g"
        />
        <MetricCard
          label="Carbs"
          value={todayCarbs}
          unit="g"
          target={nt?.carbs}
          targetUnit="g"
        />
        <MetricCard
          label="Fat"
          value={todayFat}
          unit="g"
          target={nt?.fat}
          targetUnit="g"
        />
      </div>

      {/* Section 2: Weekly Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="Weekly Calories"
          value={weekCals}
          unit="kcal"
          target={weeklyCalTarget > 0 ? weeklyCalTarget : undefined}
          targetUnit="kcal"
          subtitle={`${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining this week`}
        />
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Weekly Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectedWeekly.toLocaleString()}{" "}
              <span className="text-sm font-normal text-zinc-500">kcal</span>
            </div>
            {weeklyCalTarget > 0 && (
              <p className="text-xs text-zinc-600 mt-1">
                Target: {weeklyCalTarget.toLocaleString()} kcal
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isOnTrack ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  isOnTrack ? "text-green-400" : "text-red-400"
                }`}
              >
                {isOnTrack ? "On track" : "Over target"}
              </span>
            </div>
            <p className="text-xs mt-2 text-zinc-500">
              Based on avg {Math.round(avgDailyCal).toLocaleString()} kcal/day ({daysElapsed} day{daysElapsed !== 1 ? "s" : ""} logged)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Today's Food Log */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-400">
            Today's Food Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center">
              No meals logged today.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-500">Meal</TableHead>
                  <TableHead className="text-right text-zinc-500">Calories</TableHead>
                  <TableHead className="text-right text-zinc-500">Protein</TableHead>
                  <TableHead className="text-right text-zinc-500">Carbs</TableHead>
                  <TableHead className="text-right text-zinc-500">Fat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayEntries.map((entry, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    <TableCell className="font-medium">{entry.meal}</TableCell>
                    <TableCell className="text-right">{entry.calories}</TableCell>
                    <TableCell className="text-right">{entry.protein}g</TableCell>
                    <TableCell className="text-right">{entry.carbs}g</TableCell>
                    <TableCell className="text-right">{entry.fat}g</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="border-zinc-800 bg-zinc-800/50">
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{todayCals}</TableCell>
                  <TableCell className="text-right font-bold">{todayProtein}g</TableCell>
                  <TableCell className="text-right font-bold">{todayCarbs}g</TableCell>
                  <TableCell className="text-right font-bold">{todayFat}g</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
