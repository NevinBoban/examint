import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  BookOpen,
  Orbit,
  TrainFront,
  Leaf,
  Landmark,
  Globe,
  FlaskConical,
  Cpu,
  Trophy,
  CalendarDays,
  Lightbulb,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import type { Article, LicensedImage } from "../types";
import { toggleBookmark } from "../db";
import { useData, useToast } from "../store";
import { prettyDate } from "../logic";
import { Button } from "./ui/button";
import { refreshNews, useNewsStatus } from "../news";
export const categoryIcons: Record<string, LucideIcon> = {
  "Space and Defence": Orbit,
  "Railways and Infrastructure": TrainFront,
  Environment: Leaf,
  "National Affairs": Landmark,
  "International Affairs": Globe,
  "Science and Technology": FlaskConical,
  "Electronics and Technology": Cpu,
  Sports: Trophy,
  "Important Days": CalendarDays,
};
export function CategoryIcon({
  category,
  size = 24,
}: {
  category: string;
  size?: number;
}) {
  const Icon = categoryIcons[category] || BookOpen;
  return <Icon size={size} />;
}
export function Media({
  image,
  category,
  className = "",
}: {
  image?: LicensedImage;
  category: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`media ${className}`}>
      {image && !failed ? (
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="media-fallback">
          <CategoryIcon category={category} size={48} />
          <span>{category}</span>
        </div>
      )}
    </div>
  );
}
export function Attribution({ image }: { image?: LicensedImage }) {
  return image ? (
    <p className="attribution">
      {image.alt}.{" "}
      <a href={image.sourceUrl} target="_blank" rel="noreferrer">
        {image.author}
      </a>{" "}
      ·{" "}
      <a href={image.licenseUrl} target="_blank" rel="noreferrer">
        {image.license}
      </a>{" "}
      · Display may be cropped.
    </p>
  ) : null;
}
export function SaveButton({
  type,
  id,
}: {
  type: "article" | "question";
  id: string;
}) {
  const { bookmarks } = useData(),
    toast = useToast();
  const active = bookmarks.some((b) => b.id === `${type}:${id}`);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={active ? "Remove bookmark" : "Bookmark " + type}
      aria-pressed={active}
      onClick={async () => {
        try {
          await toggleBookmark(type, id);
        } catch {
          toast("Could not save bookmark. Check browser storage.");
        }
      }}
    >
      <Bookmark
        size={18}
        fill={active ? "currentColor" : "none"}
        className={active ? "violet" : ""}
      />
    </Button>
  );
}
export function ArticleCard({ article: a }: { article: Article }) {
  return (
    <article className="article-card">
      <Link to={`/article/${a.id}`} className="article-image">
        <Media image={a.image} category={a.category} />
        <span className="image-label">
          {a.verification === "demo" ? "DEMO EDITION" : "OFFICIAL SOURCE"}
        </span>
      </Link>
      <div className="article-copy">
        <div className="row between">
          <span className="eyebrow">{a.category}</span>
          <SaveButton type="article" id={a.id} />
        </div>
        <Link to={`/article/${a.id}`}>
          <h3>{a.headline}</h3>
        </Link>
        <p>{a.summary}</p>
        <div className="tags">
          <span className={`tag ${a.priority === "High" ? "amber" : ""}`}>
            {a.priority} priority
          </span>
          {a.exams.map((e) => (
            <span key={e} className="tag">
              {e}
            </span>
          ))}
        </div>
        <div className="article-meta">
          {prettyDate(a.publishedAt)} · {a.source}
          {a.eventAt && <span>Event: {prettyDate(a.eventAt)}</span>}
        </div>
        <div className="row between card-actions">
          <Link className="text-link" to={`/article/${a.id}`}>
            Read more
          </Link>
          <Link className="text-link muted-link" to={`/quiz?article=${a.id}`}>
            Practise questions
          </Link>
        </div>
        {a.image && (
          <div className="card-credit">
            <a href={a.image.sourceUrl} target="_blank" rel="noreferrer">
              Photo: {a.image.author}
            </a>{" "}
            ·{" "}
            <a href={a.image.licenseUrl} target="_blank" rel="noreferrer">
              {a.image.license}
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <BookOpen />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function DemoNote() {
  const { collection, busy, error } = useNewsStatus();
  const stale =
    collection?.lastSuccessAt &&
    Date.now() - Date.parse(collection.lastSuccessAt) > 8 * 3600000;
  return (
    <div className="demo-note">
      <Lightbulb size={17} />
      <span>
        <strong>Official news + labelled practice content.</strong>{" "}
        {collection?.lastSuccessAt
          ? `Last collected: ${new Date(collection.lastSuccessAt).toLocaleString("en-IN")}. ${collection.questionCount} source-checked questions in the published bank.`
          : "No successful news collection recorded yet. Demonstration questions remain available."}{" "}
        Collection is scheduled every four hours; timing may vary. Quiz rules
        check source evidence, not independent truth. Priority estimates study
        relevance.
        {stale && (
          <span role="status">
            {" "}
            Collection is overdue; showing the last saved edition.
          </span>
        )}
        {collection?.sources.some((s) => !s.ok) && (
          <span role="status">
            {" "}
            A source could not be checked in the last run.
          </span>
        )}
        {error && <span role="status"> {error}</span>}
      </span>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => void refreshNews(true)}
      >
        {busy ? "Refreshing…" : "Refresh edition"}
      </Button>
    </div>
  );
}
export function SourceLink({ url, name }: { url: string; name: string }) {
  return (
    <a className="text-link" href={url} target="_blank" rel="noreferrer">
      {name}
      <ExternalLink size={14} />
    </a>
  );
}
