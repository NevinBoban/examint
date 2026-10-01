import { Link } from "react-router-dom";
import {
  Flame,
  Target,
  CheckCheck,
  RotateCcw,
  Play,
  BookOpen,
  CalendarDays,
  Sun,
  ChevronRight,
  Clock3,
} from "lucide-react";
import { useData } from "../store";
import { accuracy, dayKey, streak, prettyDate } from "../logic";
import { ArticleCard, PageHeader, Empty } from "../components/common";
import { PerformanceChart } from "../components/PerformanceChart";
import { Button } from "../components/ui/button";
export default function Dashboard() {
  const { settings, articles, attempts, revisions, sessions, questions } =
    useData();
  const answered = attempts.filter((a) => a.outcome !== "revealed"),
    today = attempts.filter((a) => dayKey(a.attemptedAt) === dayKey()),
    daily = new Set(
      today.filter((a) => a.outcome !== "revealed").map((a) => a.questionId),
    ).size;
  const due = revisions.filter(
    (r) => r.dueAt <= new Date().toISOString(),
  ).length;
  const session = sessions
    .filter((s) => !s.finishedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const featured = articles
    .filter((a) => a.exams.includes(settings.exam))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);
  return (
    <>
      <PageHeader
        eyebrow="YOUR PERSONAL STUDY SPACE"
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${settings.name}.`}
        description="A little more informed. A little closer to your goal."
      >
        <span className="date-pill">
          <CalendarDays size={16} />
          {prettyDate()}
        </span>
      </PageHeader>
      <div className="dashboard-top">
        <section className="focus-card">
          <div className="focus-text">
            <span className="tag focus-tag">
              <Sun size={14} /> TODAY’S FOCUS
            </span>
            <h2>
              Small steps.
              <br />
              Stronger preparation.
            </h2>
            <p>Your next breakthrough starts with one good study session.</p>
            <div className="row wrap">
              <Button asChild>
                <Link to="/quiz">
                  <Play size={16} fill="currentColor" />
                  Start daily quiz
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link
                  to={
                    session ? `/quiz/session/${session.id}` : "/current-affairs"
                  }
                >
                  <BookOpen size={17} />
                  {session ? "Continue quiz" : "Continue learning"}
                </Link>
              </Button>
            </div>
            <span className="focus-foot">
              {settings.exam} <span>·</span> Your pace. Your progress.
            </span>
          </div>
          <div className="goal-area">
            <div
              className="goal-ring"
              style={
                {
                  "--progress": `${Math.min(100, (daily / settings.goal) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <span>
                  {daily}
                  <small> / {settings.goal}</small>
                </span>
                <p>questions today</p>
              </div>
            </div>
            <span className="goal-caption">
              <Target size={15} /> Daily study goal
            </span>
            <Link to="/settings">Adjust goal</Link>
          </div>
        </section>
        <section className="revision-callout panel">
          <span className="icon-tile violet-bg">
            <RotateCcw size={22} />
          </span>
          <p className="eyebrow">KEEP IT FRESH</p>
          <h3>
            {due ? `${due} questions to revisit` : "Make knowledge stick."}
          </h3>
          <p>
            {due
              ? "A quick revision today builds a stronger memory for tomorrow."
              : "Your revision queue grows as you practise. We’ll bring questions back at the right time."}
          </p>
          <Button variant="secondary" asChild>
            <Link to="/revision">
              {due ? "Revise today" : "Explore revision"}
              <ChevronRight size={15} />
            </Link>
          </Button>
        </section>
      </div>
      <div className="stats-grid">
        {[
          {
            label: "Study streak",
            value: streak(attempts),
            unit: "days",
            icon: Flame,
            color: "orange",
            note: streak(attempts)
              ? "Keep your momentum going"
              : "Your first session starts it",
          },
          {
            label: "Questions answered",
            value: answered.length,
            unit: "",
            icon: CheckCheck,
            color: "blue",
            note: `${attempts.filter((a) => a.outcome === "revealed").length} solutions revealed separately`,
          },
          {
            label: "Accuracy",
            value: answered.length ? accuracy(attempts) : "—",
            unit: answered.length ? "%" : "",
            icon: Target,
            color: "green",
            note: "Based on submitted answers",
          },
          {
            label: "Pending revision",
            value: due,
            unit: "",
            icon: RotateCcw,
            color: "violet",
            note: "Ready when you are",
          },
        ].map((s) => (
          <section key={s.label} className="stat-card panel">
            <div className="row between">
              <span>{s.label}</span>
              <s.icon className={s.color} size={19} />
            </div>
            <div className="stat-value">
              {s.value}
              <small>{s.unit}</small>
            </div>
            <p>{s.note}</p>
          </section>
        ))}
      </div>
      <div className="section-head">
        <div>
          <h2>Your reading shortlist</h2>
          <p>Selected for {settings.exam} · demonstration edition</p>
        </div>
        <Link className="text-link" to="/current-affairs">
          View all articles <ChevronRight size={16} />
        </Link>
      </div>
      <div className="article-grid">
        {featured.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      <div className="dashboard-bottom">
        <section className="panel chart-panel">
          <div className="section-head">
            <h2>This week, in focus</h2>
            <span className="legend">
              <i />
              Answered <i className="teal" />
              Correct
            </span>
          </div>
          {!answered.length && (
            <p className="chart-empty-note">
              Your first answer will start the story.
            </p>
          )}
          <PerformanceChart attempts={attempts} />
        </section>
        <section className="panel activity-panel">
          <div className="section-head">
            <h2>Recent activity</h2>
            <Clock3 size={18} />
          </div>
          {!attempts.length ? (
            <Empty
              title="A fresh start"
              description="Read an article or try a quiz. Your quiz activity will appear here."
            />
          ) : (
            [...attempts]
              .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
              .slice(0, 4)
              .map((a) => (
                <Link
                  key={a.id}
                  className="activity-row"
                  to={`/quiz?question=${a.questionId}`}
                >
                  <span className={`activity-dot ${a.outcome}`} />
                  <div>
                    <strong>
                      {questions.find((q) => q.id === a.questionId)?.category ||
                        "Question"}
                    </strong>
                    <p>
                      {a.outcome === "revealed"
                        ? "Solution revealed"
                        : a.outcome === "correct"
                          ? "Answered correctly"
                          : "Ready for another look"}{" "}
                      · {prettyDate(a.attemptedAt)}
                    </p>
                  </div>
                </Link>
              ))
          )}
        </section>
      </div>
    </>
  );
}
