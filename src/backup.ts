import { db } from "./db";
import {
  categories,
  exams,
  type Article,
  type Question,
  type Attempt,
  type Bookmark,
  type Revision,
  type Settings,
  type Session,
  type Reading,
  type Report,
} from "./types";
export interface Backup {
  app: "EXAMINT";
  schemaVersion: 2;
  exportedAt: string;
  data: {
    articles: Article[];
    questions: Question[];
    attempts: Attempt[];
    bookmarks: Bookmark[];
    revisions: Revision[];
    settings: Settings[];
    sessions: Session[];
    readings: Reading[];
    reports: Report[];
  };
}
const tableNames = [
  "articles",
  "questions",
  "attempts",
  "bookmarks",
  "revisions",
  "settings",
  "sessions",
  "readings",
  "reports",
] as const;
function fail(message: string): never {
  throw new Error(`Invalid backup: ${message}`);
}
function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    fail("expected an object.");
  return v as Record<string, unknown>;
}
function str(v: unknown, max = 20000): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}
function date(v: unknown) {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(v) &&
    Number.isFinite(Date.parse(v))
  );
}
function integer(v: unknown, min: number, max: number) {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}
function strings(v: unknown) {
  return Array.isArray(v) && v.length <= 1000 && v.every((x) => str(x));
}
function oneOf(v: unknown, values: readonly string[]) {
  return typeof v === "string" && values.includes(v);
}
function safeUrl(v: unknown) {
  if (!str(v, 3000)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}
function validMeta(x: Record<string, unknown>) {
  if (
    !str(x.id, 200) ||
    !oneOf(x.category, categories) ||
    !Array.isArray(x.exams) ||
    !x.exams.length ||
    !x.exams.every((e) => oneOf(e, exams)) ||
    !oneOf(x.priority, ["High", "Medium", "Low"]) ||
    !date(x.publishedAt) ||
    !date(x.collectedAt) ||
    !date(x.updatedAt) ||
    (x.eventAt != null && !date(x.eventAt)) ||
    !str(x.source) ||
    !safeUrl(x.sourceUrl) ||
    !oneOf(x.verification, ["demo", "verified", "unverified"]) ||
    !strings(x.organizations) ||
    !strings(x.locations)
  )
    fail("invalid content metadata.");
  if (x.image != null) {
    const i = obj(x.image);
    if (
      !safeUrl(i.url) ||
      !safeUrl(i.sourceUrl) ||
      !safeUrl(i.licenseUrl) ||
      !str(i.alt) ||
      !str(i.author) ||
      !str(i.license)
    )
      fail("invalid image or licence.");
  }
}
export function validateBackup(raw: unknown): Backup {
  const root = obj(raw);
  if (
    root.app !== "EXAMINT" ||
    root.schemaVersion !== 2 ||
    !date(root.exportedAt)
  )
    fail("unsupported format or schema version.");
  const data = obj(root.data);
  for (const name of tableNames) {
    if (!Array.isArray(data[name]) || (data[name] as unknown[]).length > 100000)
      fail(`invalid ${name} table.`);
    const seen = new Set();
    for (const raw of data[name] as unknown[]) {
      const x = obj(raw),
        key =
          x[
            name === "revisions"
              ? "questionId"
              : name === "readings"
                ? "articleId"
                : "id"
          ];
      if (!str(key, 500) || seen.has(key))
        fail(`duplicate or invalid key in ${name}.`);
      seen.add(key);
      switch (name) {
        case "articles":
          validMeta(x);
          if (
            !str(x.headline) ||
            !str(x.summary) ||
            !strings(x.body) ||
            !strings(x.facts) ||
            !strings(x.staticGK) ||
            !str(x.remember) ||
            typeof x.aiGenerated !== "boolean" ||
            !exams.every((e) => str(obj(x.relevance)[e]))
          )
            fail("invalid article.");
          break;
        case "questions":
          validMeta(x);
          if (
            !str(x.articleId) ||
            !str(x.prompt) ||
            !Array.isArray(x.options) ||
            x.options.length !== 4 ||
            !x.options.every((o) => str(o)) ||
            !integer(x.answer, 0, 3) ||
            !str(x.explanation) ||
            !oneOf(x.validation, ["demo-reviewed", "pending", "verified"])
          )
            fail("invalid question.");
          break;
        case "attempts":
          if (
            !str(x.questionId) ||
            !str(x.sessionId) ||
            x.id !== `${x.sessionId}:${x.questionId}` ||
            !oneOf(x.outcome, ["correct", "incorrect", "revealed"]) ||
            !date(x.attemptedAt) ||
            typeof x.revision !== "boolean" ||
            (x.outcome === "revealed"
              ? x.selected !== null
              : !integer(x.selected, 0, 3))
          )
            fail("invalid attempt.");
          break;
        case "bookmarks":
          if (
            !oneOf(x.type, ["article", "question"]) ||
            !str(x.targetId) ||
            x.id !== `${x.type}:${x.targetId}` ||
            !date(x.updatedAt)
          )
            fail("invalid bookmark.");
          break;
        case "revisions":
          if (
            !date(x.dueAt) ||
            !date(x.updatedAt) ||
            !integer(x.interval, 1, 60) ||
            !integer(x.consecutive, 0, 1000000) ||
            !oneOf(x.lastOutcome, ["correct", "incorrect", "revealed"])
          )
            fail("invalid revision.");
          break;
        case "settings":
          if (
            x.id !== "user" ||
            !str(x.name, 60) ||
            !oneOf(x.exam, exams) ||
            !integer(x.goal, 1, 500) ||
            !oneOf(x.theme, ["dark", "light"]) ||
            typeof x.collapsed !== "boolean" ||
            !date(x.updatedAt)
          )
            fail("invalid user settings.");
          break;
        case "sessions":
          if (
            !str(x.mode, 100) ||
            !strings(x.questionIds) ||
            !(x.questionIds as string[]).length ||
            new Set(x.questionIds as string[]).size !==
              (x.questionIds as string[]).length ||
            !integer(x.index, 0, (x.questionIds as string[]).length - 1) ||
            !date(x.startedAt) ||
            !date(x.updatedAt) ||
            (x.finishedAt !== undefined && !date(x.finishedAt)) ||
            typeof x.revision !== "boolean"
          )
            fail("invalid session.");
          obj(x.results);
          break;
        case "readings":
          if (!date(x.readAt)) fail("invalid reading.");
          break;
        case "reports":
          if (!str(x.questionId) || !str(x.message, 2000) || !date(x.createdAt))
            fail("invalid report.");
          break;
      }
    }
  }
  const b = raw as Backup;
  const articles = new Set(b.data.articles.map((a) => a.id)),
    questions = new Map(b.data.questions.map((q) => [q.id, q])),
    sessions = new Map(b.data.sessions.map((s) => [s.id, s])),
    attempts = new Map(b.data.attempts.map((a) => [a.id, a]));
  for (const q of questions.values())
    if (!articles.has(q.articleId))
      fail("question references a missing article.");
  for (const a of attempts.values()) {
    const q = questions.get(a.questionId),
      s = sessions.get(a.sessionId);
    if (!q || !s || !s.questionIds.includes(a.questionId))
      fail("attempt references missing content.");
    if (
      a.outcome !== "revealed" &&
      (a.selected === q.answer) !== (a.outcome === "correct")
    )
      fail("attempt outcome does not match its answer.");
  }
  for (const s of sessions.values()) {
    if (!s.questionIds.every((id) => questions.has(id)))
      fail("session references missing questions.");
    for (const [qid, id] of Object.entries(s.results)) {
      const a = attempts.get(id);
      if (!a || a.questionId !== qid || a.sessionId !== s.id)
        fail("invalid session results.");
    }
  }
  for (const r of b.data.revisions)
    if (!questions.has(r.questionId))
      fail("revision references missing question.");
  for (const r of b.data.reports)
    if (!questions.has(r.questionId))
      fail("report references missing question.");
  for (const r of b.data.readings)
    if (!articles.has(r.articleId)) fail("reading references missing article.");
  for (const m of b.data.bookmarks)
    if (
      m.type === "article"
        ? !articles.has(m.targetId)
        : !questions.has(m.targetId)
    )
      fail("bookmark references missing content.");
  return b;
}
export async function exportBackup(): Promise<Backup> {
  return db.transaction("r", db.tables, async () => {
    const data = {} as Backup["data"];
    for (const name of tableNames)
      Object.assign(data, { [name]: await db.table(name).toArray() });
    return {
      app: "EXAMINT",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      data,
    };
  });
}
export async function restoreBackup(raw: unknown, mode: "merge" | "replace") {
  const b = validateBackup(raw);
  await db.transaction("rw", db.tables, async () => {
    if (mode === "replace") {
      for (const name of tableNames) await db.table(name).clear();
      for (const name of tableNames) await db.table(name).bulkPut(b.data[name]);
    } else {
      for (const name of tableNames) {
        const table = db.table(name);
        for (const row of b.data[name]) {
          const record = row as unknown as Record<string, unknown>;
          const key = record[
            name === "revisions"
              ? "questionId"
              : name === "readings"
                ? "articleId"
                : "id"
          ] as string;
          const current = await table.get(key);
          if (!current) {
            await table.put(row);
            continue;
          }
          if (name === "attempts" || name === "reports") continue; // immutable identity; never count the same attempt twice
          if (name === "sessions") {
            if (
              JSON.stringify(current.questionIds) !==
              JSON.stringify(record.questionIds)
            )
              throw new Error(
                "Merge conflict: matching session IDs contain different question sets.",
              );
          }
          if (
            name === "questions" &&
            (current.answer !== record.answer ||
              JSON.stringify(current.options) !==
                JSON.stringify(record.options))
          )
            throw new Error(
              "Merge conflict: an existing question has a different answer. Keep a backup and resolve the content version first.",
            );
          const incoming = String(record.updatedAt || record.readAt || ""),
            existing = String(current.updatedAt || current.readAt || "");
          if (incoming > existing) await table.put(row);
        }
      }
    }
    // Rebuild session result maps from canonical attempts, including records merged from another device.
    const attempts = await db.attempts.toArray();
    for (const s of await db.sessions.toArray()) {
      const results = Object.fromEntries(
        attempts
          .filter((a) => a.sessionId === s.id)
          .map((a) => [a.questionId, a.id]),
      );
      await db.sessions.update(s.id, { results });
    }
  });
}
export function downloadJSON(backup: Backup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `examint-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
