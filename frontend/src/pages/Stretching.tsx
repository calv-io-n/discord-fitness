import { useEffect, useState } from "react";
import { api, type StretchingEntry } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import Heatmap from "@/components/Heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
}

export default function Stretching() {
  const [entries, setEntries] = useState<StretchingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    api
      .stretching(year, month)
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
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
  const weekStart = getWeekStart(now);

  // Heatmap data: 1 if stretched that day, 0 if not
  const heatmapData: Record<string, number> = {};
  for (const entry of entries) {
    heatmapData[entry.date] = 1;
  }

  // Weekly total minutes
  const weekEntries = entries.filter(
    (e) => e.date >= weekStart && e.date <= today
  );
  const weekTotal = weekEntries.reduce(
    (sum, e) => sum + (e.duration_min || 0),
    0
  );

  // Monthly total minutes
  const monthTotal = entries.reduce(
    (sum, e) => sum + (e.duration_min || 0),
    0
  );

  // Table entries: newest first
  const tableEntries = [...entries].reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stretching</h1>

      {/* Monthly Heatmap */}
      <Card className="bg-[#12131a] border-[#1e2030]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-[#a0a4b8]">
            Monthly Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap year={year} month={month} data={heatmapData} />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="This Week"
          value={weekTotal}
          unit="min"
          subtitle={`${weekEntries.length} session${weekEntries.length !== 1 ? "s" : ""}`}
        />
        <MetricCard
          label="This Month"
          value={monthTotal}
          unit="min"
          subtitle={`${entries.length} session${entries.length !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Log Table */}
      <Card className="bg-[#12131a] border-[#1e2030]">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-[#a0a4b8]">
            Stretching Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tableEntries.length === 0 ? (
            <p className="text-sm text-[#6b6f85] py-4 text-center">
              No stretching logged this month.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#1e2030]">
                  <TableHead className="text-[#8b8fa3]">Date</TableHead>
                  <TableHead className="text-[#8b8fa3]">Stretch</TableHead>
                  <TableHead className="text-right text-[#8b8fa3]">
                    Duration (min)
                  </TableHead>
                  <TableHead className="text-[#8b8fa3]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableEntries.map((entry, i) => (
                  <TableRow key={i} className="border-[#1e2030]">
                    <TableCell>{entry.date}</TableCell>
                    <TableCell className="font-medium">
                      {entry.stretch}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.duration_min}
                    </TableCell>
                    <TableCell className="text-[#8b8fa3]">
                      {entry.notes || "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
