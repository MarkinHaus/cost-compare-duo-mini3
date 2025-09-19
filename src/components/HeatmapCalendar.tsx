import React from "react";
import { cn } from "@/lib/utils";

type HeatmapCalendarProps = {
  // Pass any list of items that include a date-like numeric timestamp (ms) or Date
  items: Array<{ date: number | Date }>;
  // Optional: how many weeks to show (default 12)
  weeks?: number;
  // Optional title
  title?: string;
  // Add: allow parent to pass width classes
  className?: string;
};

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

const COLOR_CLASSES = [
  "bg-emerald-50",
  "bg-emerald-100",
  "bg-emerald-200",
  "bg-emerald-300",
  "bg-emerald-400",
  "bg-emerald-500",
  "bg-emerald-600",
];

export default function HeatmapCalendar({ items, weeks = 12, title = "Activity", className }: HeatmapCalendarProps) {

  // Build a map of counts per day (YYYY-MM-DD)
  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items ?? []) {
      const d = it?.date instanceof Date ? it.date : new Date(it?.date ?? 0);
      if (isNaN(d.getTime())) continue;
      const key = toYMD(startOfDay(d));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  // Determine the start date: beginning of the week (Sunday) weeks-1 ago
  const today = startOfDay(new Date());
  const endWeekday = today.getDay(); // 0..6 (Sun..Sat)
  const end = addDays(today, 0);
  const start = React.useMemo(() => {
    // total days = weeks * 7
    const totalDays = weeks * 7;
    // end aligned to today, start is totalDays-1 days ago
    const s = addDays(end, -(totalDays - 1));
    return s;
  }, [weeks, end]);

  // Build grid: 7 rows (Sun..Sat), columns = weeks
  const grid: { date: Date; count: number }[][] = [];
  for (let r = 0; r < 7; r++) grid.push([]);

  let cursor = new Date(start);
  const totalCells = weeks * 7;
  for (let i = 0; i < totalCells; i++) {
    const key = toYMD(cursor);
    const count = counts.get(key) ?? 0;
    grid[cursor.getDay()].push({ date: new Date(cursor), count });
    cursor = addDays(cursor, 1);
  }

  const maxCount = React.useMemo(() => {
    let m = 0;
    counts.forEach((v) => {
      if (v > m) m = v;
    });
    return m;
  }, [counts]);

  function colorFor(count: number): string {
    if (count <= 0) return COLOR_CLASSES[0];
    // Bucket across 6 non-zero levels based on maxCount
    if (maxCount <= 1) return COLOR_CLASSES[Math.min(1, COLOR_CLASSES.length - 1)];
    const bucket = Math.min(6, Math.ceil((count / maxCount) * 6));
    return COLOR_CLASSES[Math.min(bucket, COLOR_CLASSES.length - 1)];
  }

  const weekLabels: string[] = [];
  for (let w = 0; w < weeks; w++) weekLabels.push("");

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={cn("w-full", className)}>
      <div className="text-sm font-medium">{title}</div>
      <div
        className="w-full"
      >
        <div
          className="grid grid-flow-col auto-cols-[minmax(12px,1fr)] grid-rows-7 gap-1 w-full"
        >
          {
            Array.from({ length: weeks }).map((_, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, rowIdx) => {
                  const cell = grid[rowIdx]?.[colIdx];
                  const title = cell
                    ? `${toYMD(cell.date)} • ${cell.count} expense${cell.count === 1 ? "" : "s"}`
                    : "";
                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className={`w-full aspect-square rounded-sm ${cell ? colorFor(cell.count) : COLOR_CLASSES[0]} transition-colors`}
                      title={title}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-1">
          {COLOR_CLASSES.slice(0, 5).map((c, i) => (
            <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}