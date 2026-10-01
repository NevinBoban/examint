import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useData } from "../store";
import { accuracy, addDays, dayKey, streak } from "../logic";
import { PageHeader, Empty } from "../components/common";
import { PerformanceChart } from "../components/PerformanceChart";
import { Target, Flame, CheckCheck, RotateCcw } from "lucide-react";
export default function Analytics() {
  const { attempts, questions, revisions } = useData(),
    [range, setRange] = useState("7");
  const answered = attempts.filter((a) => a.outcome !== "revealed");
  const categoryData = [...new Set(questions.map((q) => q.category))]
    .map((category) => {
      const a = answered.filter((a) =>
        questions.some((q) => q.id === a.questionId && q.category === category),
      );
      return { category, accuracy: accuracy(a), count: a.length };
    })
    .filter((c) => c.count)
    .sort((a, b) => b.accuracy - a.accuracy);
  const activity = Array.from({ length: 91 }, (_, i) => {
    const d = addDays(new Date(), i - 90);
    const count = attempts.filter(
      (a) => dayKey(a.attemptedAt) === dayKey(d),
    ).length;
    return { date: dayKey(d), count };
  });
  const reviewed = attempts.filter((a) => a.revision);
  return (
    <>
      <PageHeader
        eyebrow="THE BIGGER PICTURE"
        title="See how far you’ve come"
        description="Every chart comes from your activity on this device. No invented progress."
      />
      <div className="stats-grid">
        {[
          {
            label: "Questions answered",
            value: answered.length,
            icon: CheckCheck,
            note: `${new Set(answered.map((a) => a.questionId)).size} unique questions`,
          },
          {
            label: "Accuracy",
            value: answered.length ? `${accuracy(attempts)}%` : "—",
            icon: Target,
            note: `${attempts.filter((a) => a.outcome === "revealed").length} reveals excluded`,
          },
          {
            label: "Study streak",
            value: `${streak(attempts)} days`,
            icon: Flame,
            note: "Consecutive days with quiz activity",
          },
          {
            label: "Questions mastered",
            value: revisions.filter((r) => r.consecutive >= 3).length,
            icon: RotateCcw,
            note: "At least 3 consecutive correct answers",
          },
        ].map((s) => (
          <section className="panel stat-card" key={s.label}>
            <div className="row between">
              <span>{s.label}</span>
              <s.icon size={19} className="violet" />
            </div>
            <div className="stat-value">{s.value}</div>
            <p>{s.note}</p>
          </section>
        ))}
      </div>
      <section className="panel analytics-chart">
        <div className="section-head">
          <h2>Your learning rhythm</h2>
          <select
            aria-label="Chart time range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
        {!attempts.length && (
          <p className="chart-empty-note">
            Answer a question to begin tracking your learning rhythm.
          </p>
        )}
        <PerformanceChart attempts={attempts} days={Number(range)} />
        <div className="legend">
          <i />
          Answered <i className="teal" />
          Correct
        </div>
      </section>
      <section className="panel heatmap-panel">
        <div className="section-head">
          <div>
            <h2>Consistency, one day at a time</h2>
            <p>
              {
                attempts.filter(
                  (a) => dayKey(a.attemptedAt) >= activity[0].date,
                ).length
              }{" "}
              question reviews in the last 91 days
            </p>
          </div>
          <span className="tag">Local time</span>
        </div>
        <div className="heatmap-wrap">
          <div className="heatmap-labels">
            <span>Earlier</span>
            <span>Today</span>
          </div>
          <div
            className="heatmap"
            role="img"
            aria-label="91-day study activity heatmap"
          >
            {activity.map((d) => (
              <div
                key={d.date}
                tabIndex={0}
                className={`heat-cell level-${d.count === 0 ? 0 : d.count < 3 ? 1 : d.count < 6 ? 2 : d.count < 10 ? 3 : 4}`}
                title={`${d.date}: ${d.count} reviews`}
                aria-label={`${d.date}: ${d.count} reviews`}
              />
            ))}
          </div>
          <div className="heatmap-legend">
            Less{" "}
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className={`heat-cell level-${i}`} />
            ))}{" "}
            More
          </div>
        </div>
      </section>
      <div className="analytics-grid">
        <section className="panel analytics-chart">
          <h2>Category-wise accuracy</h2>
          {categoryData.length ? (
            <div
              className="category-chart"
              style={{ height: Math.max(240, categoryData.length * 45) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ left: 0, right: 15, top: 15, bottom: 0 }}
                >
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="category"
                    type="category"
                    width={135}
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: 9,
                    }}
                  />
                  <Bar
                    dataKey="accuracy"
                    name="Accuracy (%)"
                    fill="#9a85ec"
                    radius={[0, 5, 5, 0]}
                    barSize={15}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty
              title="Find your strengths"
              description="Category insights will appear as you answer questions."
            />
          )}
        </section>
        <section className="panel insights">
          <h2>Where to focus next</h2>
          {categoryData.length ? (
            <>
              <div className="insight">
                <span className="eyebrow green">STRONGEST SO FAR</span>
                <h3>{categoryData[0].category}</h3>
                <p>
                  {categoryData[0].accuracy}% across {categoryData[0].count}{" "}
                  answers
                </p>
              </div>
              {categoryData.length > 1 && (
                <div className="insight">
                  <span className="eyebrow orange">ROOM TO GROW</span>
                  <h3>{categoryData[categoryData.length - 1].category}</h3>
                  <p>
                    {categoryData[categoryData.length - 1].accuracy}% across{" "}
                    {categoryData[categoryData.length - 1].count} answers
                  </p>
                </div>
              )}
              <p className="small-note">
                Small samples can be misleading. Keep practising across
                categories.
              </p>
            </>
          ) : (
            <Empty
              title="Start small. Build steadily."
              description="Your strengths and areas to revisit will become clearer with practice."
            />
          )}
          <div className="revision-insight">
            <h3>Revision completion</h3>
            <p>
              <strong>
                {reviewed.filter((a) => a.outcome !== "revealed").length}
              </strong>{" "}
              answered ·{" "}
              {reviewed.filter((a) => a.outcome === "revealed").length} revealed
            </p>
            <p>
              {new Set(reviewed.map((a) => a.questionId)).size} unique questions
              reviewed ·{" "}
              {
                revisions.filter((r) => r.dueAt <= new Date().toISOString())
                  .length
              }{" "}
              currently due
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
