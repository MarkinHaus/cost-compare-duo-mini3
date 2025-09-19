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
  "bg-muted",         // 0 contributions -> subtle gray
  "bg-emerald-900",
  "bg-emerald-800",
  "bg-emerald-700",
  "bg-emerald-600",
  "bg-emerald-500",
  "bg-emerald-400",
];

// Update default weeks to 52 for "last year" view and keep className support
export default function HeatmapCalendar({ items, weeks = 52, title = "Activity", className }: HeatmapCalendarProps) {

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

  const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

  // Precompute week start dates for label row
  const weekStartDates: Date[] = React.useMemo(() => {
    const dates: Date[] = [];
    for (let w = 0; w < weeks; w++) {
      dates.push(addDays(start, w * 7));
    }
    return dates;
  }, [start, weeks]);

  const weekdaySideLabels: string[] = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className={cn("w-full", className)}>
      <div className="text-sm font-medium">{title}</div>

      {/* Month labels row (fixed column width like GitHub) */}
      <div className="w-full overflow-x-auto">
        <div className="mt-2 mb-1 inline-grid grid-flow-col auto-cols-[12px] grid-rows-1 text-xs text-muted-foreground shrink-0">
          {weekStartDates.map((d, i) => {
            const prev = i > 0 ? weekStartDates[i - 1] : null;
            const show = i === 0 || (prev && d.getMonth() !== prev.getMonth());
            return (
              <div key={i} className="text-left">{show ? monthShort[d.getMonth()] : ""}</div>
            );
          })}
        </div>
      </div>

      {/* Grid with left weekday labels + heatmap cells */}
      <div className="w-full flex gap-2">
        {/* Left weekday labels (Mon, Wed, Fri) */}
        <div className="hidden sm:flex sm:flex-col sm:justify-between text-xs text-muted-foreground">
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <div key={rowIdx} className="h-full flex items-start">
              <span className={cn(rowIdx % 2 === 1 ? "opacity-100" : "opacity-0")}>
                {weekdaySideLabels[rowIdx]}
              </span>
            </div>
          ))}
        </div>

        {/* Heatmap grid - horizontally scrollable, fixed-size cells like GitHub */}
        <div className="w-full overflow-x-auto">
          <div className="inline-grid grid-flow-col auto-cols-[12px] grid-rows-7 gap-[3px] shrink-0">
            {Array.from({ length: weeks }).map((_, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, rowIdx) => {
                  const cell = grid[rowIdx]?.[colIdx];
                  const title = cell
                    ? `${toYMD(cell.date)} • ${cell.count} expense${cell.count === 1 ? "" : "s"}`
                    : "";
                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className={cn(
                        "w-[10px] h-[10px] rounded-[2px] border",
                        cell ? colorFor(cell.count) : COLOR_CLASSES[0],
                        "border-border/40 transition-colors"
                      )}
                      title={title}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend - compact squares */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-1">
          {COLOR_CLASSES.slice(0, 5).map((c, i) => (
            <div key={i} className={cn("h-[10px] w-[10px] rounded-[2px] border border-border/50", c)} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}