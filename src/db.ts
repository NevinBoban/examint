import Dexie, { type EntityTable } from "dexie";
import type {
  Article,
  Question,
  Attempt,
  Bookmark,
  Revision,
  Settings,
  Session,
  Reading,
  Report,
} from "./types";
export class ExamintDB extends Dexie {
  articles!: EntityTable<Article, "id">;
  questions!: EntityTable<Question, "id">;
  attempts!: EntityTable<Attempt, "id">;
  bookmarks!: EntityTable<Bookmark, "id">;
  revisions!: EntityTable<Revision, "questionId">;
  settings!: EntityTable<Settings, "id">;
  sessions!: EntityTable<Session, "id">;
  readings!: EntityTable<Reading, "articleId">;
  reports!: EntityTable<Report, "id">;
  constructor(name = "examint") {
    super(name);
    this.version(1).stores({
      articles: "id,category,publishedAt",
      questions: "id,articleId,category,publishedAt",
      attempts: "id,questionId,attemptedAt,sessionId",
      bookmarks: "id,type,targetId",
      revisions: "questionId,dueAt",
      settings: "id",
      sessions: "id,updatedAt",
      readings: "articleId",
    });
    this.version(2)
      .stores({ reports: "id,questionId,createdAt" })
      .upgrade(async (tx) => {
        await tx
          .table("settings")
          .toCollection()
          .modify((s) => {
            s.updatedAt ||= new Date().toISOString();
          });
      });
  }
}
export const db = new ExamintDB();
export const defaultSettings: Settings = {
  id: "user",
  name: "Nevin",
  exam: "RRB JE",
  goal: 10,
  theme: "dark",
  collapsed: false,
  updatedAt: new Date().toISOString(),
};
export async function toggleBookmark(type: Bookmark["type"], targetId: string) {
  const id = `${type}:${targetId}`;
  await db.transaction("rw", db.bookmarks, async () => {
    if (await db.bookmarks.get(id)) await db.bookmarks.delete(id);
    else
      await db.bookmarks.add({
        id,
        type,
        targetId,
        updatedAt: new Date().toISOString(),
      });
  });
}
export async function updateSettings(patch: Partial<Settings>) {
  await db.settings.put({
    ...defaultSettings,
    ...(await db.settings.get("user")),
    ...patch,
    id: "user",
    updatedAt: new Date().toISOString(),
  });
}
