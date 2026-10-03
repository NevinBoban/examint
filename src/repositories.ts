import { db, defaultSettings } from "./db";
import { nextRevision, isQuizEligible } from "./logic";
import { validateBackup } from "./backup";
import type {
  Article,
  Question,
  Bank,
  LicensedImage,
  Attempt,
  Session,
} from "./types";
export interface NewsProvider {
  fetchContent(): Promise<Bank>;
}
export interface AIProvider {
  summarize(article: Article): Promise<string>;
}
export interface ImageProvider {
  getImage(article: Article): Promise<LicensedImage | undefined>;
}
export interface ContentRepository {
  getArticles(): Promise<Article[]>;
  getQuestions(): Promise<Question[]>;
  upsert(bank: Bank): Promise<void>;
}
export interface ProgressRepository {
  saveAnswer(
    sessionId: string,
    questionId: string,
    selected: number | null,
    reveal: boolean,
  ): Promise<Attempt>;
  getAttempts(): Promise<Attempt[]>;
}
export class LocalNewsProvider implements NewsProvider {
  async fetchContent() {
    const r = await fetch(`${import.meta.env.BASE_URL}content/demo.json`);
    if (!r.ok)
      throw new Error(
        "The demonstration edition could not be loaded. Reconnect and retry.",
      );
    return validateBank(await r.json());
  }
}
export function validateBank(raw: unknown): Bank {
  const bank = raw as Bank;
  if (!Number.isInteger(bank.version) || bank.version < 1)
    throw new Error("Unsupported content bank version.");
  validateBackup({
    app: "EXAMINT",
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    data: {
      articles: bank.articles,
      questions: bank.questions,
      attempts: [],
      bookmarks: [],
      revisions: [],
      settings: [],
      sessions: [],
      readings: [],
      reports: [],
    },
  });
  return bank;
}
export class LocalAIProvider implements AIProvider {
  async summarize(article: Article) {
    return article.summary;
  }
} // Curated text only; no inference or AI call.
export class LocalImageProvider implements ImageProvider {
  async getImage(article: Article) {
    return article.image;
  }
}
export class LocalContentRepository implements ContentRepository {
  getArticles() {
    return db.articles.toArray();
  }
  getQuestions() {
    return db.questions.toArray();
  }
  async upsert(bank: Bank) {
    await db.transaction("rw", db.articles, db.questions, async () => {
      for (const article of bank.articles) {
        const existing = await db.articles.get(article.id);
        if (!existing || article.updatedAt > existing.updatedAt)
          await db.articles.put(article);
      }
      for (const question of bank.questions) {
        const existing = await db.questions.get(question.id);
        if (
          existing &&
          (existing.answer !== question.answer ||
            JSON.stringify(existing.options) !==
              JSON.stringify(question.options) ||
            existing.prompt !== question.prompt)
        )
          throw new Error(
            "A changed question must use a new stable ID to preserve answer history.",
          );
        if (!existing || question.updatedAt > existing.updatedAt)
          await db.questions.put(question);
      }
    });
  }
}
export class LocalProgressRepository implements ProgressRepository {
  getAttempts() {
    return db.attempts.toArray();
  }
  async saveAnswer(
    sessionId: string,
    questionId: string,
    selected: number | null,
    reveal: boolean,
  ) {
    return db.transaction(
      "rw",
      [db.attempts, db.sessions, db.questions, db.revisions],
      async () => {
        const session = await db.sessions.get(sessionId);
        const question = await db.questions.get(questionId);
        if (!session || !question || !session.questionIds.includes(questionId))
          throw new Error("Question or session is unavailable.");
        const id = `${sessionId}:${questionId}`;
        const saved = await db.attempts.get(id);
        if (saved) return saved;
        if (!isQuizEligible(question))
          throw new Error(
            "This question is awaiting verification. Exit this quiz and start another.",
          );
        if (
          !reveal &&
          (selected === null ||
            selected < 0 ||
            selected > 3 ||
            !Number.isInteger(selected))
        )
          throw new Error("Choose an answer first.");
        const now = new Date();
        const attempt: Attempt = {
          id,
          questionId,
          sessionId,
          selected: reveal ? null : selected,
          outcome: reveal
            ? "revealed"
            : selected === question.answer
              ? "correct"
              : "incorrect",
          attemptedAt: now.toISOString(),
          revision: session.revision,
        };
        await db.attempts.add(attempt);
        await db.revisions.put(
          nextRevision(
            await db.revisions.get(questionId),
            attempt.outcome,
            questionId,
            now,
          ),
        );
        await db.sessions.update(sessionId, {
          results: { ...session.results, [questionId]: id },
          updatedAt: now.toISOString(),
        });
        return attempt;
      },
    );
  }
}
export const progress = new LocalProgressRepository();
export async function initialize() {
  if (!(await db.settings.get("user"))) await db.settings.add(defaultSettings);
  const bank = await new LocalNewsProvider().fetchContent();
  await new LocalContentRepository().upsert(bank);
}
export async function createSession(
  ids: string[],
  mode: string,
  revision = false,
) {
  if (!ids.length) throw new Error("No questions match these filters.");
  const candidates = await db.questions.bulkGet(ids);
  if (candidates.some((q) => !q || !isQuizEligible(q)))
    throw new Error(
      "One or more questions are awaiting verification. Refresh your selection.",
    );
  const session: Session = {
    id: crypto.randomUUID(),
    questionIds: ids,
    mode,
    index: 0,
    results: {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision,
  };
  await db.sessions.add(session);
  return session.id;
}
