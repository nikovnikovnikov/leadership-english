"use client";

import type { HeatmapDay } from "@/lib/queries";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

const LEVEL_CLASSES = [
  "bg-stone-100 dark:bg-stone-800",
  "bg-[var(--primary)]/20",
  "bg-[var(--primary)]/40",
  "bg-[var(--primary)]/70",
  "bg-[var(--primary)]",
];

export function ActivityHeatMap({ days }: { days: HeatmapDay[] }) {
  if (!days.length) return null;

  const totalActivities = days.reduce((s, d) => s + d.count, 0);

  // Build grid: array of weeks, each week is 7 slots (Sun=0 .. Sat=6)
  const firstDate = new Date(days[0].date + "T00:00:00");
  const firstDow = firstDate.getDay(); // 0=Sun

  const weeks: (HeatmapDay | null)[][] = [[]];
  for (let i = 0; i < firstDow; i++) weeks[0].push(null);
  for (const day of days) {
    const d = new Date(day.date + "T00:00:00");
    if (d.getDay() === 0 && weeks[weeks.length - 1].length > 0) {
      weeks.push([]);
    }
    weeks[weeks.length - 1].push(day);
  }

  // Month labels
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w].find((d): d is HeatmapDay => d !== null);
    if (firstDay) {
      const m = new Date(firstDay.date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          label: new Date(2024, m, 1).toLocaleString("default", { month: "short" }),
          weekIndex: w,
        });
        lastMonth = m;
      }
    }
  }

  const cellSize = 14; // 11px cell + 3px gap

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        {/* Month labels */}
        <div className="relative pl-10" style={{ height: 14 }}>
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="absolute top-0 text-[10px] text-stone-400 dark:text-stone-500"
              style={{ left: m.weekIndex * cellSize }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] pr-1.5 pt-0">
            {DAY_LABELS.map((label, i) => (
              <span
                key={i}
                className="h-[11px] text-[10px] leading-[11px] text-stone-400 dark:text-stone-500"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`h-[11px] w-[11px] rounded-[2px] ${day ? LEVEL_CLASSES[getLevel(day.count)] : "bg-transparent"}`}
                  title={day ? `${day.date}: ${day.count} ${day.count === 1 ? "activity" : "activities"}` : ""}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend + total */}
        <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500">
          <span>{totalActivities.toLocaleString()} activities in the last year</span>
          <div className="flex items-center gap-1">
            <span>Less</span>
            {LEVEL_CLASSES.map((cls, i) => (
              <div key={i} className={`h-[11px] w-[11px] rounded-[2px] ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
