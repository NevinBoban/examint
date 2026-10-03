import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { db } from "../src/db";
import {
  validateBank,
  LocalContentRepository,
  createSession,
  progress,
} from "../src/repositories";
import { isQuizEligible, selectQuestions } from "../src/logic";
import { validateBackup, exportBackup, restoreBackup } from "../src/backup";
import raw from "../public/content/demo.json";
import live from "../public/content/live.json";
import type { Bank } from "../src/types";

it("validates the published live bank and source evidence", () => {
  expect(() => validateBank(live)).not.toThrow();
  const bank = structuredClone(raw) as Bank;
  bank.questions[0].verification = "source-checked";
  bank.questions[0].validation = "rule-checked";
  expect(() => validateBank(bank)).toThrow(/evidence/);
});

it("blocks pending questions from selection, direct sessions and resumed submissions", async () => {
  await db.delete();
  await db.open();
  const bank = structuredClone(raw) as Bank;
  await new LocalContentRepository().upsert(bank);
  const q = bank.questions[0];
  const session = await createSession([q.id], "test");
  await db.questions.update(q.id, { validation: "pending" });
  const pending = (await db.questions.get(q.id))!;
  expect(isQuizEligible(pending)).toBe(false);
  expect(
    selectQuestions([pending], {
      mode: "Random Quiz",
      date: "2026-10-03",
      exam: "RRB JE",
      attempts: [],
      bookmarks: [],
      count: 10,
    }),
  ).toEqual([]);
  await expect(createSession([q.id], "direct")).rejects.toThrow(/verification/);
  await expect(
    progress.saveAnswer(session, q.id, q.answer, false),
  ).rejects.toThrow(/verification/);
});

it("withdraws a corrected question without losing progress, and backups retain it", async () => {
  await db.delete();
  await db.open();
  const bank = structuredClone(raw) as Bank;
  await new LocalContentRepository().upsert(bank);
  const q = bank.questions[0],
    session = await createSession([q.id], "history");
  const attempt = await progress.saveAnswer(session, q.id, q.answer, false);
  q.validation = "pending";
  q.updatedAt = "2026-10-03T18:00:00Z";
  await new LocalContentRepository().upsert(bank);
  expect(await db.attempts.get(attempt.id)).toEqual(attempt);
  const backup = validateBackup(await exportBackup());
  await restoreBackup(backup, "merge");
  expect(await db.attempts.count()).toBe(1);
  expect((await db.questions.get(q.id))?.validation).toBe("pending");
});
