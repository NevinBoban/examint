import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "../store";
import { accuracy, addDays, dayKey, prettyDate } from "../logic";
import { PageHeader, ArticleCard, Empty, DemoNote } from "../components/common";
import { Button } from "../components/ui/button";
export default function Calendar() {
  const { articles, questions, attempts, settings } = useData(),
    [month, setMonth] = useState(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [selected, setSelected] = useState(dayKey()),
    [view, setView] = useState("Day");
  const offset = (month.getDay() + 6) % 7,
    start = addDays(month, -offset);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const end =
    view === "Month"
      ? dayKey(new Date(month.getFullYear(), month.getMonth() + 1, 0))
      : selected;
  const begin =
    view === "Month"
      ? dayKey(month)
      : view === "Week"
        ? dayKey(addDays(new Date(selected + "T12:00:00"), -6))
        : selected;
  const articleMatches = articles.filter(
    (a) =>
      a.exams.includes(settings.exam) &&
      dayKey(a.publishedAt) >= begin &&
      dayKey(a.publishedAt) <= end,
  );
  const questionMatches = questions.filter(
    (q) =>
      q.exams.includes(settings.exam) &&
      dayKey(q.publishedAt) >= begin &&
      dayKey(q.publishedAt) <= end,
  );
  const completed = questionMatches.filter((q) =>
    attempts.some((a) => a.questionId === q.id && a.outcome !== "revealed"),
  );
  const attemptedInRange = attempts.filter(
    (a) => dayKey(a.attemptedAt) >= begin && dayKey(a.attemptedAt) <= end,
  );
  const rangeAnswers = attemptedInRange.filter((a) => a.outcome !== "revealed");
  return (
    <>
      <PageHeader
        title="Your learning calendar"
        description="Browse every edition. See the progress you made on any day."
      />
      <DemoNote />
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="row between calendar-heading">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <ChevronLeft />
            </Button>
            <h2>
              {month.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <ChevronRight />
            </Button>
          </div>
          <div className="calendar-grid weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {cells.map((d) => {
              const key = dayKey(d),
                hasContent = articles.some(
                  (a) =>
                    dayKey(a.publishedAt) === key &&
                    a.exams.includes(settings.exam),
                ),
                hasActivity = attempts.some(
                  (a) => dayKey(a.attemptedAt) === key,
                );
              return (
                <button
                  key={key}
                  aria-label={`${prettyDate(d)}${hasContent ? ", edition available" : ""}${hasActivity ? ", study activity" : ""}`}
                  aria-pressed={key === selected}
                  className={`${d.getMonth() !== month.getMonth() ? "outside" : ""} ${key === selected ? "selected" : ""} ${key === dayKey() ? "today" : ""}`}
                  onClick={() => {
                    setSelected(key);
                    if (d.getMonth() !== month.getMonth())
                      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  }}
                >
                  <span>{d.getDate()}</span>
                  <div>
                    {hasContent && <i className="content-dot" />}
                    {hasActivity && <i className="study-dot" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>
              <i className="content-dot" />
              Edition
            </span>
            <span>
              <i className="study-dot" />
              Study activity
            </span>
          </div>
          <Button
            variant="ghost"
            className="wide"
            onClick={() => {
              setSelected(dayKey());
              setMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              );
            }}
          >
            Jump to today
          </Button>
        </section>
        <section className="panel calendar-summary">
          <div className="tabs">
            {["Day", "Week", "Month"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={v === view ? "active" : ""}
              >
                {v}
              </button>
            ))}
          </div>
          <h2>
            {view === "Day"
              ? prettyDate(selected + "T12:00:00")
              : `${prettyDate(begin + "T12:00:00")} – ${prettyDate(end + "T12:00:00")}`}
          </h2>
          <p>
            {view === "Week"
              ? "Selected day and six preceding days"
              : view === "Month"
                ? "Archive for the displayed calendar month"
                : "Edition and activity summary"}
          </p>
          <dl>
            <div>
              <dt>Articles in this edition range</dt>
              <dd>{articleMatches.length}</dd>
            </div>
            <div>
              <dt>Available questions</dt>
              <dd>{questionMatches.length}</dd>
            </div>
            <div>
              <dt>Edition questions answered, any day</dt>
              <dd>{completed.length}</dd>
            </div>
            <div>
              <dt>Edition questions pending an answer</dt>
              <dd>{questionMatches.length - completed.length}</dd>
            </div>
            <div>
              <dt>Answers submitted during this period</dt>
              <dd>{rangeAnswers.length}</dd>
            </div>
            <div>
              <dt>Solutions revealed during this period</dt>
              <dd>{attemptedInRange.length - rangeAnswers.length}</dd>
            </div>
            <div>
              <dt>Accuracy of this period’s answers</dt>
              <dd>
                {rangeAnswers.length ? accuracy(attemptedInRange) + "%" : "—"}
              </dd>
            </div>
          </dl>
          <p className="small-note">
            Publication date groups the content. Attempt date measures study
            activity. Revealed solutions do not count as answered.
          </p>
        </section>
      </div>
      <div className="section-head spaced-heading">
        <h2>From the archive</h2>
        <Link className="text-link" to="/quiz">
          Open question bank
        </Link>
      </div>
      {articleMatches.length ? (
        <div className="article-grid all-articles">
          {articleMatches.map((a) => (
            <ArticleCard article={a} key={a.id} />
          ))}
        </div>
      ) : (
        <Empty
          title="No edition for this date range"
          description="Your existing editions are preserved. Browse 24–30 September 2026 to explore the demo archive."
        />
      )}
    </>
  );
}
