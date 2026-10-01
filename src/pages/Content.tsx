import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Check,
  Lightbulb,
  BookOpen,
  ChevronLeft,
  Search as SearchIcon,
} from "lucide-react";
import { useData, useToast } from "../store";
import { categories, exams, type Article, type Exam } from "../types";
import { db } from "../db";
import { dayKey, prettyDate } from "../logic";
import {
  ArticleCard,
  PageHeader,
  DemoNote,
  Empty,
  Media,
  Attribution,
  SaveButton,
  SourceLink,
} from "../components/common";
import { Button } from "../components/ui/button";
export function CurrentAffairs() {
  const { articles, settings } = useData();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All categories"),
    [date, setDate] = useState(""),
    [priority, setPriority] = useState("All priorities"),
    [exam, setExam] = useState<Exam | "All exams">(settings.exam);
  useEffect(() => setExam(settings.exam), [settings.exam]);
  const matches = articles
    .filter(
      (a) =>
        (exam === "All exams" || a.exams.includes(exam)) &&
        (category === "All categories" || a.category === category) &&
        (!date || dayKey(a.publishedAt) === date) &&
        (priority === "All priorities" || a.priority === priority) &&
        searchText(a).includes(query.toLowerCase()),
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return (
    <>
      <PageHeader
        eyebrow="READ. UNDERSTAND. REMEMBER."
        title="Current affairs"
        description="The context behind the headline. The facts that stay with you."
      />
      <DemoNote />
      <div className="filters">
        <label className="field filter-search">
          Search articles
          <input
            placeholder="Headline, organisation or place…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="field">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Examination
          <select
            value={exam}
            onChange={(e) => setExam(e.target.value as Exam | "All exams")}
          >
            <option>All exams</option>
            {exams.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>All priorities</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>
        <label className="field">
          Edition date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <Button
          variant="ghost"
          onClick={() => {
            setQuery("");
            setCategory("All categories");
            setDate("");
            setPriority("All priorities");
            setExam("All exams");
          }}
        >
          Reset filters
        </Button>
      </div>
      <div className="section-head">
        <p className="muted">{matches.length} articles in your edition</p>
        <span className="tag">Saved on this device</span>
      </div>
      {matches.length ? (
        <div className="article-grid all-articles">
          {matches.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      ) : (
        <Empty
          title="No articles match"
          description="Try another category or date, or clear your filters."
        />
      )}
    </>
  );
}
function searchText(a: Article) {
  return [a.headline, a.summary, a.category, ...a.organizations, ...a.locations]
    .join(" ")
    .toLowerCase();
}
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const escaped = terms
    .filter(Boolean)
    .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return <>{text}</>;
  const pattern = new RegExp(`(${escaped.join("|")}|\\b\\d{4}\\b)`, "gi");
  return (
    <>
      {text
        .split(pattern)
        .map((s, i) => (i % 2 ? <mark key={i}>{s}</mark> : s))}
    </>
  );
}
export function ArticleReader() {
  const { id } = useParams();
  const { articles, questions, settings, readings } = useData(),
    toast = useToast();
  const a = articles.find((a) => a.id === id);
  const related = questions.filter((q) => q.articleId === id);
  const read = readings.some((r) => r.articleId === id);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  if (!a)
    return (
      <Empty
        title="Article not found"
        description="This article is not in your downloaded edition."
      />
    );
  return (
    <>
      <div className="row between reading-toolbar">
        <Link className="back-link row" to="/current-affairs">
          <ChevronLeft size={17} /> Current affairs
        </Link>
        <div className="row">
          <span className="tag">Demonstration content</span>
          <SaveButton type="article" id={a.id} />
        </div>
      </div>
      <div className="reading-layout">
        <article className="reading-main">
          <Media image={a.image} category={a.category} />
          <Attribution image={a.image} />
          <div className="reading-body">
            <span className="eyebrow">{a.category.toUpperCase()}</span>
            <h1>{a.headline}</h1>
            <div className="tags">
              <span className="tag amber">{a.priority} study priority</span>
              <span className="tag">
                Demo edition: {prettyDate(a.publishedAt)}
              </span>
              {a.eventAt && (
                <span className="tag">Event: {prettyDate(a.eventAt)}</span>
              )}
            </div>
            <p className="article-lead">{a.summary}</p>
            <h2>The story, simply explained</h2>
            {a.body.map((p, i) => (
              <p key={i}>
                <Highlight
                  text={p}
                  terms={[...a.organizations, ...a.locations]}
                />
              </p>
            ))}
            <h2>Important examination facts</h2>
            <ul>
              {a.facts.map((f) => (
                <li key={f}>
                  <Highlight
                    text={f}
                    terms={[...a.organizations, ...a.locations]}
                  />
                </li>
              ))}
            </ul>
            <h2>Related static GK</h2>
            <ul>
              {a.staticGK.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="row wrap">
              <SourceLink url={a.sourceUrl} name={`Source: ${a.source}`} />
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await db.readings.put({
                      articleId: a.id,
                      readAt: new Date().toISOString(),
                    });
                    toast("Article marked as read.");
                  } catch {
                    toast("Could not save reading progress.");
                  }
                }}
              >
                {read ? <Check size={16} /> : <BookOpen size={16} />}{" "}
                {read ? "Read" : "Mark as read"}
              </Button>
            </div>
          </div>
        </article>
        <aside className="reading-aside">
          <section className="panel remember">
            <Lightbulb />
            <h3>Remember This</h3>
            <p>{a.remember}</p>
          </section>
          <section className="panel">
            <span className="eyebrow">FOR {settings.exam}</span>
            <h3>Why this matters</h3>
            <p>{a.relevance[settings.exam]}</p>
          </section>
          <section className="panel">
            <h3>Put it into practice</h3>
            <p>{related.length} questions to turn reading into recall.</p>
            <Button asChild className="wide">
              <Link to={`/quiz?article=${a.id}`}>Practise questions</Link>
            </Button>
          </section>
          <section className="panel">
            <h3>About this edition</h3>
            <p>
              Curated historical facts and static GK. Edition dates organise
              this demo; they are not claims of recent events. No AI-generated
              content or live retrieval.
            </p>
          </section>
        </aside>
      </div>
      <section className="panel related-questions">
        <h2>Related MCQs</h2>
        {related.map((q) => (
          <div className="list-card" key={q.id}>
            <p>{q.prompt}</p>
            <Button variant="ghost" asChild>
              <Link to={`/quiz?question=${q.id}`}>Practise</Link>
            </Button>
          </div>
        ))}
      </section>
    </>
  );
}
export function GlobalSearch() {
  const [params, setParams] = useSearchParams(),
    { articles, questions } = useData();
  const query = params.get("q") || "";
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const result = useMemo(
    () => ({
      articles: query.trim()
        ? articles.filter((a) =>
            searchText(a).includes(query.trim().toLowerCase()),
          )
        : [],
      questions: query.trim()
        ? questions.filter((q) =>
            [q.prompt, q.category, ...q.organizations, ...q.locations]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
          )
        : [],
    }),
    [query, articles, questions],
  );
  return (
    <>
      <PageHeader
        title="Search your workspace"
        description="Find a headline, a concept, an organisation or a question."
      />
      <form
        className="row search-page-form"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q: draft });
        }}
      >
        <input
          aria-label="Search query"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Try ISRO, Constitution, sampling…"
        />
        <Button>
          <SearchIcon size={17} />
          Search
        </Button>
      </form>
      {!query ? (
        <Empty
          title="What would you like to learn?"
          description="Search articles and questions from your saved edition."
        />
      ) : (
        <>
          <h2 className="spaced-heading">
            Articles · {result.articles.length}
          </h2>
          <div className="article-grid all-articles">
            {result.articles.map((a) => (
              <ArticleCard article={a} key={a.id} />
            ))}
          </div>
          <h2 className="spaced-heading">
            Questions · {result.questions.length}
          </h2>
          <div className="content-list">
            {result.questions.map((q) => (
              <div className="panel list-card" key={q.id}>
                <div>
                  <span className="tag">{q.category}</span>
                  <h3>{q.prompt}</h3>
                </div>
                <Button variant="secondary" asChild>
                  <Link to={`/quiz?question=${q.id}`}>Practise</Link>
                </Button>
              </div>
            ))}
          </div>
          {!result.articles.length && !result.questions.length && (
            <Empty
              title="Nothing found"
              description="Try a shorter keyword, another spelling or a category."
            />
          )}
        </>
      )}
    </>
  );
}
export function Bookmarks() {
  const { articles, questions, bookmarks } = useData(),
    [filter, setFilter] = useState("All");
  const savedArticles = articles.filter((a) =>
      bookmarks.some((b) => b.type === "article" && b.targetId === a.id),
    ),
    savedQuestions = questions.filter((q) =>
      bookmarks.some((b) => b.type === "question" && b.targetId === q.id),
    );
  return (
    <>
      <PageHeader
        title="Your bookmarks"
        description="Good discoveries deserve a second look."
      >
        <Button asChild>
          <Link to="/quiz?mode=Bookmarked%20Quiz">
            Practise saved questions
          </Link>
        </Button>
      </PageHeader>
      <div className="tabs">
        {["All", "Articles", "Questions"].map((t) => (
          <button
            key={t}
            className={t === filter ? "active" : ""}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {filter !== "Questions" && (
        <>
          <h2 className="spaced-heading">Articles · {savedArticles.length}</h2>
          <div className="article-grid all-articles">
            {savedArticles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </>
      )}
      {filter !== "Articles" && (
        <>
          <h2 className="spaced-heading">
            Questions · {savedQuestions.length}
          </h2>
          <div className="content-list">
            {savedQuestions.map((q) => (
              <div className="panel list-card" key={q.id}>
                <div>
                  <span className="tag">{q.category}</span>
                  <h3>{q.prompt}</h3>
                </div>
                <div className="row">
                  <SaveButton type="question" id={q.id} />
                  <Button variant="secondary" asChild>
                    <Link to={`/quiz?question=${q.id}`}>Practise</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {(!bookmarks.length ||
        (filter === "Articles" && !savedArticles.length) ||
        (filter === "Questions" && !savedQuestions.length)) && (
        <Empty
          title="Save something worth remembering"
          description="Use the bookmark icon on any article or question. You’ll find it here."
        />
      )}
    </>
  );
}
