import "fake-indexeddb/auto";
import { beforeEach, it, expect } from "vitest";
import { db, defaultSettings } from "../src/db";
import { exportBackup, validateBackup, restoreBackup } from "../src/backup";
import {
  LocalContentRepository,
  createSession,
  progress,
} from "../src/repositories";
import rawBank from "../public/content/demo.json";
import type { Bank } from "../src/types";
const bank = rawBank as Bank;
beforeEach(async () => {
  await db.delete();
  await db.open();
  await new LocalContentRepository().upsert(bank);
  await db.settings.put(defaultSettings);
});
it("round-trips every table, restores session progress and deduplicates repeated merges", async () => {
  const q = bank.questions[0],
    id = await createSession([q.id], "backup");
  await progress.saveAnswer(id, q.id, q.answer, false);
  await db.bookmarks.put({
    id: `question:${q.id}`,
    targetId: q.id,
    type: "question",
    updatedAt: new Date().toISOString(),
  });
  await db.reports.put({
    id: "report-1",
    questionId: q.id,
    message: "Check explanation",
    createdAt: new Date().toISOString(),
  });
  const backup = JSON.parse(JSON.stringify(await exportBackup()));
  expect(() => validateBackup(backup)).not.toThrow();
  await restoreBackup(backup, "merge");
  await restoreBackup(backup, "merge");
  expect(await db.attempts.count()).toBe(1);
  await restoreBackup(backup, "replace");
  expect(await db.bookmarks.count()).toBe(1);
  expect(await db.reports.count()).toBe(1);
  expect((await db.sessions.get(id))?.results[q.id]).toBe(`${id}:${q.id}`);
});
it("rejects unsupported, malformed and unsafe content before modifying data", async () => {
  const backup = await exportBackup();
  for (const invalid of [
    {},
    { ...backup, schemaVersion: 99 },
    { ...backup, data: { ...backup.data, attempts: [{ id: "bad" }] } },
  ])
    await expect(restoreBackup(invalid, "replace")).rejects.toThrow();
  const unsafe = structuredClone(backup);
  unsafe.data.articles[0].sourceUrl = "javascript:alert(1)";
  expect(() => validateBackup(unsafe)).toThrow();
  expect(await db.articles.count()).toBe(bank.articles.length);
});
it("rejects duplicate records, missing references and invalid settings", async () => {
  const b = await exportBackup();
  const dup = structuredClone(b);
  dup.data.questions.push(dup.data.questions[0]);
  expect(() => validateBackup(dup)).toThrow(/duplicate/);
  const missing = structuredClone(b);
  missing.data.articles = [];
  expect(() => validateBackup(missing)).toThrow(/missing article/);
  const settings = structuredClone(b);
  settings.data.settings[0].goal = 0;
  expect(() => validateBackup(settings)).toThrow(/settings/);
});
it("rolls back a merge when an existing question has an incompatible answer", async () => {
  const b = await exportBackup();
  b.data.questions[0].answer = (b.data.questions[0].answer + 1) % 4;
  b.data.settings[0].name = "Changed";
  await expect(restoreBackup(b, "merge")).rejects.toThrow(/Merge conflict/);
  expect((await db.settings.get("user"))?.name).toBe(defaultSettings.name);
  expect((await db.questions.get(bank.questions[0].id))?.answer).toBe(
    bank.questions[0].answer,
  );
});
it("upgrades a version 1 database while preserving settings", async () => {
  const { default: Dexie } = await import("dexie");
  const { ExamintDB } = await import("../src/db");
  const old = new Dexie("examint-migration-test");
  old
    .version(1)
    .stores({
      articles: "id,category,publishedAt",
      questions: "id,articleId,category,publishedAt",
      attempts: "id,questionId,attemptedAt,sessionId",
      bookmarks: "id,type,targetId",
      revisions: "questionId,dueAt",
      settings: "id",
      sessions: "id,updatedAt",
      readings: "articleId",
    });
  await old.open();
  await old.table("settings").put({ id: "user", name: "Migration user" });
  old.close();
  const next = new ExamintDB("examint-migration-test");
  await next.open();
  expect((await next.settings.get("user"))?.name).toBe("Migration user");
  expect((await next.settings.get("user"))?.updatedAt).toBeTruthy();
  expect(await next.reports.count()).toBe(0);
  await next.delete();
});
