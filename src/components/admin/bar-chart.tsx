"use client";

function BarChart({
  data,
  maxValue,
  color = "bg-[var(--primary)]",
  label,
}: {
  data: { date: string; count: number }[];
  maxValue: number;
  color?: string;
  label: string;
}) {
  const max = maxValue || Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </h3>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d) => {
          const height = max > 0 ? (d.count / max) * 100 : 0;
          return (
            <div
              key={d.date}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className={`absolute bottom-0 w-full rounded-t ${color} transition-all`}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                {d.count} · {d.date.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-stone-400">
        <span>{data[0]?.date?.slice(5) ?? ""}</span>
        <span>{data[data.length - 1]?.date?.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}

export { BarChart };
