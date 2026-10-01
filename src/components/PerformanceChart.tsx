import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { addDays, dayKey } from "../logic";
import type { Attempt } from "../types";
export function PerformanceChart({
  attempts,
  days = 7,
}: {
  attempts: Attempt[];
  days?: number;
}) {
  const data = Array.from({ length: days }, (_, i) => {
    const d = addDays(new Date(), i - days + 1);
    const a = attempts.filter((x) => dayKey(x.attemptedAt) === dayKey(d));
    return {
      day: d.toLocaleDateString(
        "en-IN",
        days > 7 ? { day: "numeric", month: "short" } : { weekday: "short" },
      ),
      answered: a.filter((x) => x.outcome !== "revealed").length,
      correct: a.filter((x) => x.outcome === "correct").length,
    };
  });
  return (
    <div
      className="chart"
      role="img"
      aria-label={`${days}-day chart of answered and correct questions`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 8, left: -28, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={`chart-fill-${days}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#8b7cfa" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#8b7cfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            vertical={false}
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
            }}
          />
          <Area
            type="monotone"
            dataKey="answered"
            name="Answered"
            stroke="#9585ff"
            strokeWidth={2.5}
            fill={`url(#chart-fill-${days})`}
          />
          <Area
            type="monotone"
            dataKey="correct"
            name="Correct"
            stroke="#54c7b0"
            strokeWidth={2}
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
