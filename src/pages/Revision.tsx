import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RotateCcw, Eye, Clock3, CheckCheck } from "lucide-react";
import { useData, useToast } from "../store";
import { latestAttempts, prettyDate } from "../logic";
import { createSession } from "../repositories";
import {
  PageHeader,
  Empty,
  Media,
  Attribution,
  SaveButton,
} from "../components/common";
import { Button } from "../components/ui/button";
export default function Revision() {
  const { questions, revisions, attempts, bookmarks, settings, articles } =
      useData(),
    [tab, setTab] = useState("Due today"),
    [flipped, setFlipped] = useState<string[]>([]),
    toast = useToast(),
    navigate = useNavigate();
  const latest = latestAttempts(attempts);
  const due = revisions.filter((r) => r.dueAt <= new Date().toISOString());
  const shown = questions
    .filter((q) => q.exams.includes(settings.exam))
    .filter((q) =>
      tab === "Due today"
        ? due.some((r) => r.questionId === q.id)
        : tab === "Incorrect"
          ? latest.get(q.id)?.outcome === "incorrect"
          : tab === "Bookmarked"
            ? bookmarks.some(
                (b) => b.type === "question" && b.targetId === q.id,
              )
            : true,
    );
  async function start(ids: string[]) {
    try {
      navigate(
        `/quiz/session/${await createSession(ids, "Revision · " + tab, true)}`,
      );
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="MAKE IT SECOND NATURE"
        title="A little recall goes a long way"
        description="Revisit what matters, just before it starts to fade."
      >
        <Button
          disabled={
            !shown.length || tab === "History" || tab === "Image flashcards"
          }
          onClick={() => start(shown.map((q) => q.id))}
        >
          <RotateCcw size={17} />
          Revise this set
        </Button>
      </PageHeader>
      <div className="revision-stats">
        <div className="panel">
          <Clock3 className="violet" />
          <strong>
            {
              due.filter((r) =>
                questions.some(
                  (q) =>
                    q.id === r.questionId && q.exams.includes(settings.exam),
                ),
              ).length
            }
          </strong>
          <span>Due now</span>
        </div>
        <div className="panel">
          <CheckCheck className="green" />
          <strong>{revisions.filter((r) => r.consecutive >= 3).length}</strong>
          <span>Questions mastered</span>
        </div>
        <div className="panel">
          <RotateCcw className="blue" />
          <strong>{attempts.filter((a) => a.revision).length}</strong>
          <span>Revision reviews</span>
        </div>
      </div>
      <div className="tabs">
        {[
          "Due today",
          "Incorrect",
          "Bookmarked",
          "Image flashcards",
          "History",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Image flashcards" ? (
        <>
          <p className="inline-note">
            Flip a visual to recall its key fact. To update your revision
            schedule, answer its practice questions.
          </p>
          <div className="flashcard-grid">
            {articles
              .filter((a) => a.exams.includes(settings.exam))
              .map((a) => (
                <section className="panel flashcard" key={a.id}>
                  <Media image={a.image} category={a.category} />
                  <div className="flashcard-body">
                    <span className="eyebrow">{a.category}</span>
                    <h3>{a.headline}</h3>
                    {flipped.includes(a.id) ? (
                      <div className="flashcard-answer">
                        <p>{a.remember}</p>
                        <p>{a.facts[0]}</p>
                        <Attribution image={a.image} />
                      </div>
                    ) : (
                      <p>What is the one fact you remember?</p>
                    )}
                    <div className="row between">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setFlipped(
                            flipped.includes(a.id)
                              ? flipped.filter((x) => x !== a.id)
                              : [...flipped, a.id],
                          )
                        }
                      >
                        <Eye size={16} />
                        {flipped.includes(a.id) ? "Hide fact" : "Flip card"}
                      </Button>
                      <Link className="text-link" to={`/quiz?article=${a.id}`}>
                        Practise
                      </Link>
                    </div>
                  </div>
                </section>
              ))}
          </div>
        </>
      ) : tab === "History" ? (
        <div className="content-list">
          {attempts
            .filter((a) => a.revision)
            .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
            .map((a) => (
              <div className="panel list-card" key={a.id}>
                <div>
                  <span className={`result-pill ${a.outcome}`}>
                    {a.outcome}
                  </span>
                  <h3>
                    {questions.find((q) => q.id === a.questionId)?.prompt ||
                      "Archived question"}
                  </h3>
                  <p>Reviewed {prettyDate(a.attemptedAt)}</p>
                </div>
                <Link className="text-link" to={`/quiz/session/${a.sessionId}`}>
                  View session
                </Link>
              </div>
            ))}
          {!attempts.some((a) => a.revision) && (
            <Empty
              title="Your revision story starts here"
              description="Complete a revision session to see its history."
            />
          )}
        </div>
      ) : (
        <>
          <div className="content-list">
            {shown.map((q) => {
              const r = revisions.find((r) => r.questionId === q.id);
              return (
                <div className="panel list-card" key={q.id}>
                  <div>
                    <span className="tag">{q.category}</span>
                    <h3>{q.prompt}</h3>
                    <p>
                      {r
                        ? `Next due: ${prettyDate(r.dueAt)} · ${r.consecutive} consecutive correct`
                        : "Not yet scheduled"}
                    </p>
                  </div>
                  <div className="row">
                    <SaveButton type="question" id={q.id} />
                    <Button variant="secondary" onClick={() => start([q.id])}>
                      Revise
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {!shown.length && (
            <Empty
              title={
                tab === "Due today"
                  ? "You’re all caught up"
                  : "Nothing here yet"
              }
              description={
                tab === "Due today"
                  ? "No questions are due for this exam right now. Incorrect answers are available immediately in the Incorrect tab."
                  : "Practise or bookmark questions to build this collection."
              }
            >
              <Button variant="secondary" asChild>
                <Link to="/quiz">Go to practice</Link>
              </Button>
            </Empty>
          )}
        </>
      )}
      <details className="panel algorithm">
        <summary>How your revision schedule works</summary>
        <p>
          Correct answers schedule the next review after 1, 3, 7, 14, 30 and
          then 60 days as consecutive correct answers increase. Incorrect
          answers and revealed solutions reset the interval to 1 day. Three
          consecutive correct answers count as mastered. The schedule uses the
          review timestamp, never the article date. Flashcard flips do not
          change the schedule.
        </p>
      </details>
    </>
  );
}
