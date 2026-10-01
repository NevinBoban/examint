import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Play,
  CheckCircle2,
  XCircle,
  Eye,
  Flag,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Check,
  RotateCcw,
  Clock3,
} from "lucide-react";
import { useData, useToast } from "../store";
import { db } from "../db";
import { createSession, progress } from "../repositories";
import {
  dayKey,
  modes,
  selectQuestions,
  latestAttempts,
  accuracy,
  prettyDate,
} from "../logic";
import {
  PageHeader,
  DemoNote,
  Empty,
  SaveButton,
  Media,
  Attribution,
  SourceLink,
} from "../components/common";
import { Button } from "../components/ui/button";
const bankTabs = [
  "Today’s Questions",
  "Unattempted Questions",
  "High-Priority Backlog",
  "Previous Days",
  "Completed Questions",
  "Revealed Solutions",
];
export function QuizSetup() {
  const { questions, attempts, settings, bookmarks, sessions } = useData(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    toast = useToast();
  const [mode, setMode] = useState(params.get("mode") || "Daily Quiz"),
    [date, setDate] = useState(dayKey()),
    [count, setCount] = useState(10),
    [backlog, setBacklog] = useState(true),
    [tab, setTab] = useState(bankTabs[0]),
    [starting, setStarting] = useState(false);
  const articleId = params.get("article") || undefined,
    questionId = params.get("question");
  useEffect(() => {
    setMode(params.get("mode") || "Daily Quiz");
  }, [params]);
  const pool = (
    questionId
      ? questions
      : selectQuestions(questions, {
          mode: questionId ? "Question practice" : mode,
          date,
          exam: settings.exam,
          attempts,
          bookmarks,
          count: 0,
          backlog,
          articleId,
        })
  ).filter((q) => !questionId || q.id === questionId);
  const selected = count ? pool.slice(0, count) : pool;
  const latest = latestAttempts(attempts);
  const pending = sessions
    .filter((s) => !s.finishedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  async function start(
    ids = selected.map((q) => q.id),
    label = articleId
      ? "Article practice"
      : questionId
        ? "Question practice"
        : mode,
  ) {
    setStarting(true);
    try {
      navigate(`/quiz/session/${await createSession(ids, label)}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setStarting(false);
    }
  }
  const bank = questions
    .filter((q) => q.exams.includes(settings.exam))
    .filter((q) => {
      const d = dayKey(q.publishedAt),
        a = latest.get(q.id),
        answered = attempts.some(
          (x) => x.questionId === q.id && x.outcome !== "revealed",
        );
      switch (tab) {
        case bankTabs[0]:
          return d === date;
        case bankTabs[1]:
          return !answered;
        case bankTabs[2]:
          return d < dayKey() && q.priority === "High" && !answered;
        case bankTabs[3]:
          return d < dayKey();
        case bankTabs[4]:
          return answered;
        case bankTabs[5]:
          return a?.outcome === "revealed";
        default:
          return false;
      }
    });
  return (
    <>
      <PageHeader
        eyebrow="TURN KNOWLEDGE INTO CONFIDENCE"
        title={
          articleId
            ? "Article practice"
            : questionId
              ? "Question practice"
              : "Your daily practice"
        }
        description="One question at a time. Every answer is a step forward."
      />
      <DemoNote />
      {pending.length > 0 && (
        <div className="resume-banner panel">
          <Clock3 className="violet" size={22} />
          <div>
            <strong>You have an unfinished quiz</strong>
            <p>
              {pending[0].mode} · {Object.keys(pending[0].results).length} of{" "}
              {pending[0].questionIds.length} reviewed
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link to={`/quiz/session/${pending[0].id}`}>Resume</Link>
          </Button>
        </div>
      )}
      <section className="panel quiz-setup">
        <div>
          <span className="eyebrow">BUILD YOUR SESSION</span>
          <h2>A quiz that fits your day</h2>
          <p>Choose your focus. We’ll keep your place.</p>
        </div>
        <div className="filters">
          <label className="field">
            Quiz mode
            <select
              value={mode}
              disabled={!!articleId || !!questionId}
              onChange={(e) => setMode(e.target.value)}
            >
              {modes.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="field">
            {mode === "Monthly Quiz" ? "Month" : "Edition date"}
            <input
              type={mode === "Monthly Quiz" ? "month" : "date"}
              value={mode === "Monthly Quiz" ? date.slice(0, 7) : date}
              onChange={(e) => {
                if (e.target.value)
                  setDate(
                    mode === "Monthly Quiz"
                      ? e.target.value + "-01"
                      : e.target.value,
                  );
              }}
            />
          </label>
          <label className="field">
            Session length
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              <option value={10}>10 questions</option>
              <option value={20}>20 questions</option>
              <option value={30}>30 questions</option>
              <option value={0}>All available questions</option>
            </select>
          </label>
        </div>
        {mode === "Evening Quiz" && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={backlog}
              onChange={(e) => setBacklog(e.target.checked)}
            />{" "}
            Include missed high-priority questions from earlier days
          </label>
        )}
        <div className="row between wrap quiz-setup-bottom">
          <div>
            <strong>{selected.length} questions in this session</strong>
            <p>
              {pool.length} available
              {count > pool.length
                ? ` · Fewer than ${count} available; no questions will be duplicated.`
                : ""}
              {mode === "Weekly Quiz"
                ? " · Selected day and preceding six days."
                : ""}
            </p>
          </div>
          <Button
            disabled={!selected.length || starting}
            onClick={() => start()}
          >
            <Play size={16} />
            {starting ? "Opening…" : "Start quiz"}
          </Button>
        </div>
        {!selected.length && (
          <p className="inline-note">
            No questions match. This demo edition covers 24–30 Sep 2026. Try
            Weekly Quiz with 30 Sep, or Random Quiz.
          </p>
        )}
      </section>
      <div className="section-head spaced-heading">
        <div>
          <h2>Your question bank</h2>
          <p>
            Questions stay here until you’re ready. A new day never clears your
            backlog.
          </p>
        </div>
      </div>
      <div className="tabs">
        {bankTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={t === tab ? "active" : ""}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="section-head">
        <p className="muted">
          {bank.length} questions · {settings.exam}
        </p>
        {bank.length > 0 && (
          <Button
            variant="secondary"
            onClick={() =>
              start(
                bank.map((q) => q.id),
                tab,
              )
            }
          >
            Practise this set
          </Button>
        )}
      </div>
      <div className="content-list">
        {bank.map((q) => (
          <div key={q.id} className="panel list-card">
            <div>
              <div className="tags compact">
                <span className="tag">{q.category}</span>
                <span className="tag amber">{q.priority}</span>
                <span className="tag">{prettyDate(q.publishedAt)}</span>
                {latest.get(q.id) && (
                  <span className="tag">{latest.get(q.id)?.outcome}</span>
                )}
              </div>
              <h3>{q.prompt}</h3>
            </div>
            <div className="row">
              <SaveButton type="question" id={q.id} />
              <Button
                variant="ghost"
                onClick={() => start([q.id], "Question practice")}
              >
                Practise
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!bank.length && (
        <Empty
          title="Nothing in this queue"
          description="Try another bank tab or choose an edition date from 24–30 September 2026."
        />
      )}
    </>
  );
}
export function QuizSession() {
  const { id } = useParams(),
    { sessions, questions, attempts } = useData(),
    navigate = useNavigate(),
    toast = useToast();
  const session = sessions.find((s) => s.id === id),
    [selected, setSelected] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [showReport, setShowReport] = useState(false),
    [report, setReport] = useState("");
  const question = session
    ? questions.find((q) => q.id === session.questionIds[session.index])
    : undefined;
  const attempt = attempts.find((a) => a.id === `${id}:${question?.id}`);
  const sessionAttempts = useMemo(
    () => attempts.filter((a) => a.sessionId === id),
    [attempts, id],
  );
  useEffect(() => {
    setSelected(null);
    setShowReport(false);
    setReport("");
    window.scrollTo(0, 0);
  }, [question?.id]);
  if (!session)
    return (
      <Empty
        title="Session not found"
        description="Start a new quiz from your question bank."
      >
        <Button asChild>
          <Link to="/quiz">Choose a quiz</Link>
        </Button>
      </Empty>
    );
  if (!question)
    return (
      <Empty
        title="Question unavailable"
        description="Restore the complete backup or start another session."
      />
    );
  async function submit(reveal = false) {
    if (!question || !session) return;
    setBusy(true);
    try {
      await progress.saveAnswer(session.id, question.id, selected, reveal);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function move(index: number) {
    setBusy(true);
    try {
      await db.sessions.update(session!.id, {
        index,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      toast("Could not save your place.");
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    try {
      await db.sessions.update(session!.id, {
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      toast("Could not finish session.");
    }
  }
  if (session.finishedAt) {
    const answered = sessionAttempts.filter((a) => a.outcome !== "revealed");
    return (
      <>
        <PageHeader
          title="Session complete"
          description="A little practice today. More confidence tomorrow."
        />
        <section className="panel quiz-summary">
          <span className="summary-check">
            <Check size={34} />
          </span>
          <h2>{session.mode}</h2>
          <p>
            {answered.length} answered ·{" "}
            {sessionAttempts.filter((a) => a.outcome === "revealed").length}{" "}
            revealed · {session.questionIds.length - sessionAttempts.length} not
            reviewed
          </p>
          <div className="summary-numbers">
            <div>
              <strong>
                {answered.filter((a) => a.outcome === "correct").length}
              </strong>
              <span>Correct</span>
            </div>
            <div>
              <strong>
                {answered.filter((a) => a.outcome === "incorrect").length}
              </strong>
              <span>Incorrect</span>
            </div>
            <div>
              <strong>
                {answered.length ? accuracy(sessionAttempts) + "%" : "—"}
              </strong>
              <span>Accuracy</span>
            </div>
          </div>
          <p>
            Revealed solutions are excluded from accuracy and remain separate
            from answered questions.
          </p>
          <div className="row wrap">
            <Button asChild>
              <Link to="/revision">Review & remember</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/quiz">Choose another quiz</Link>
            </Button>
          </div>
        </section>
        <h2 className="spaced-heading">Session review</h2>
        <div className="content-list">
          {session.questionIds.map((qid) => {
            const q = questions.find((q) => q.id === qid),
              a = sessionAttempts.find((a) => a.questionId === qid);
            return q ? (
              <details
                className="panel review-detail"
                key={qid}
                onToggle={(event) => {
                  if (event.currentTarget.open && !a)
                    void progress
                      .saveAnswer(session.id, qid, null, true)
                      .catch((error) => toast(error.message));
                }}
              >
                <summary>
                  <span className={`result-pill ${a?.outcome || ""}`}>
                    {a?.outcome || "Unanswered"}
                  </span>
                  {q.prompt}
                </summary>
                <div>
                  {a?.selected !== null && a?.selected !== undefined && (
                    <p>Your answer: {q.options[a.selected]}</p>
                  )}
                  <p>
                    <strong>Correct answer: {q.options[q.answer]}</strong>
                  </p>
                  <p>{q.explanation}</p>
                  <SourceLink url={q.sourceUrl} name={q.source} />
                </div>
              </details>
            ) : null;
          })}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="row between reading-toolbar">
        <Link className="back-link row" to="/quiz">
          <ChevronLeft size={17} /> Your practice
        </Link>
        <Button variant="ghost" onClick={() => navigate("/quiz")}>
          <LogOut size={16} /> Exit & save
        </Button>
      </div>
      <PageHeader
        eyebrow={session.revision ? "SPACED REPETITION" : "FOCUS MODE"}
        title={session.mode}
        description={`${session.questionIds.length} questions · Your progress saves after every submission.`}
      />
      <div className="quiz-layout">
        <section className="panel question-panel">
          <div className="row between">
            <span className="muted">
              Question {session.index + 1} of {session.questionIds.length}
            </span>
            <SaveButton type="question" id={question.id} />
          </div>
          <div className="progress-track">
            <div
              style={{
                width: `${(sessionAttempts.length / session.questionIds.length) * 100}%`,
              }}
            />
          </div>
          <div className="tags">
            <span className="tag">{question.category}</span>
            <span className="tag amber">{question.priority} priority</span>
            <span className="tag">Demonstration</span>
          </div>
          <h2 className="question-prompt">{question.prompt}</h2>
          {question.image && (
            <details className="question-image">
              <summary>Show related visual</summary>
              <Media image={question.image} category={question.category} />
              <Attribution image={question.image} />
            </details>
          )}
          <div className="options" role="group" aria-label="Answer options">
            {question.options.map((option, i) => {
              const correct = !!attempt && i === question.answer,
                wrong =
                  attempt?.outcome === "incorrect" && i === attempt.selected;
              return (
                <button
                  key={option}
                  disabled={!!attempt || busy}
                  aria-pressed={(attempt?.selected ?? selected) === i}
                  onClick={() => setSelected(i)}
                  className={`option ${selected === i && !attempt ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "incorrect" : ""}`}
                >
                  <span className="option-letter">{"ABCD"[i]}</span>
                  <span>{option}</span>
                  {correct ? (
                    <CheckCircle2 size={20} />
                  ) : wrong ? (
                    <XCircle size={20} />
                  ) : null}
                </button>
              );
            })}
          </div>
          {attempt ? (
            <div className={`answer-feedback ${attempt.outcome}`} role="status">
              <strong>
                {attempt.outcome === "correct"
                  ? "That’s right. Nicely done."
                  : attempt.outcome === "incorrect"
                    ? "Not quite. Here’s the idea to remember."
                    : "Solution revealed — not counted as an answer."}
              </strong>
              <p>{question.explanation}</p>
              <SourceLink
                url={question.sourceUrl}
                name={`Reference: ${question.source}`}
              />
            </div>
          ) : (
            <div className="row wrap question-submit">
              <Button
                disabled={selected === null || busy}
                onClick={() => submit()}
              >
                Submit answer
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => submit(true)}
              >
                <Eye size={16} />
                View solution
              </Button>
            </div>
          )}
          <div className="row between question-navigation">
            <Button
              variant="secondary"
              disabled={session.index === 0 || busy}
              onClick={() => move(session.index - 1)}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            {session.index < session.questionIds.length - 1 ? (
              <Button disabled={busy} onClick={() => move(session.index + 1)}>
                Next question
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button onClick={finish}>
                Finish session
                <Check size={16} />
              </Button>
            )}
          </div>
          <button
            className="report-link"
            onClick={() => setShowReport(!showReport)}
          >
            <Flag size={14} />
            Report an error
          </button>
          {showReport && (
            <form
              className="report-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!report.trim()) return;
                try {
                  await db.reports.add({
                    id: crypto.randomUUID(),
                    questionId: question.id,
                    message: report.trim(),
                    createdAt: new Date().toISOString(),
                  });
                  toast(
                    "Report saved locally and included in your backups. It has not been sent anywhere.",
                  );
                  setShowReport(false);
                } catch {
                  toast("Could not save report.");
                }
              }}
            >
              <label className="field">
                What needs checking?
                <textarea
                  required
                  maxLength={2000}
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  placeholder="Explain the issue…"
                />
              </label>
              <p>Saved on this device for your review. No message is sent.</p>
              <Button variant="secondary">Save report</Button>
            </form>
          )}
        </section>
        <aside className="panel quiz-aside">
          <h3>Your session</h3>
          <div className="question-grid">
            {session.questionIds.map((qid, index) => {
              const a = sessionAttempts.find((a) => a.questionId === qid);
              return (
                <button
                  key={qid}
                  aria-label={`Go to question ${index + 1}${a ? ", " + a.outcome : ""}`}
                  aria-current={index === session.index ? "step" : undefined}
                  className={`${index === session.index ? "current" : ""} ${a?.outcome || ""}`}
                  onClick={() => move(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="session-counts">
            <p>
              <span className="green">●</span> Correct{" "}
              <strong>
                {sessionAttempts.filter((a) => a.outcome === "correct").length}
              </strong>
            </p>
            <p>
              <span className="red">●</span> Incorrect{" "}
              <strong>
                {
                  sessionAttempts.filter((a) => a.outcome === "incorrect")
                    .length
                }
              </strong>
            </p>
            <p>
              <span className="violet">●</span> Revealed{" "}
              <strong>
                {sessionAttempts.filter((a) => a.outcome === "revealed").length}
              </strong>
            </p>
            <p>
              Unreviewed{" "}
              <strong>
                {session.questionIds.length - sessionAttempts.length}
              </strong>
            </p>
          </div>
          <div className="quiz-tip">
            <RotateCcw size={19} />
            <p>
              Incorrect and revealed questions return for revision tomorrow.
            </p>
          </div>
          <p className="small-note">
            Answers lock when submitted. You can leave and resume this session
            anytime.
          </p>
        </aside>
      </div>
    </>
  );
}
