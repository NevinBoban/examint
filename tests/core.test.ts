import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import { db, defaultSettings } from "../src/db";
import {
  progress,
  createSession,
  LocalContentRepository,
} from "../src/repositories";
import {
  accuracy,
  dayKey,
  nextRevision,
  selectQuestions,
  streak,
} from "../src/logic";
import type { Attempt, Bank } from "../src/types";
import rawBank from "../public/content/demo.json";
const bank = rawBank as Bank;
beforeEach(async () => {
  await db.delete();
  await db.open();
  await new LocalContentRepository().upsert(bank);
  await db.settings.put(defaultSettings);
});
describe("Quiz storage invariants", () => {
  it("locks a submitted answer, prevents duplicate attempts and survives reopening", async () => {
    const q = bank.questions[0];
    const id = await createSession([q.id], "test");
    const saved = await progress.saveAnswer(id, q.id, q.answer, false);
    expect(saved.outcome).toBe("correct");
    await progress.saveAnswer(id, q.id, (q.answer + 1) % 4, false);
    expect(await db.attempts.count()).toBe(1);
    db.close();
    await db.open();
    expect((await db.attempts.get(saved.id))?.selected).toBe(q.answer);
    expect((await db.sessions.get(id))?.results[q.id]).toBe(saved.id);
  });
  it("stores revealed solutions separately and excludes them from accuracy", async () => {
    const q = bank.questions[0];
    const id = await createSession([q.id], "test");
    const a = await progress.saveAnswer(id, q.id, null, true);
    expect(a.outcome).toBe("revealed");
    expect(a.selected).toBeNull();
    expect(accuracy([a])).toBe(0);
    expect((await db.revisions.get(q.id))?.consecutive).toBe(0);
  });
  it("content refresh never removes progress", async () => {
    const q = bank.questions[0],
      id = await createSession([q.id], "test");
    await progress.saveAnswer(id, q.id, q.answer, false);
    await new LocalContentRepository().upsert(bank);
    expect(await db.attempts.count()).toBe(1);
  });
  it("rejects an invalid option without partial writes", async () => {
    const q = bank.questions[0],
      id = await createSession([q.id], "test");
    await expect(progress.saveAnswer(id, q.id, 8, false)).rejects.toThrow();
    expect(await db.attempts.count()).toBe(0);
  });
});
describe("Date filters and scheduling", () => {
  const settings = {
    date: "2026-09-30",
    exam: "RRB JE" as const,
    attempts: [],
    bookmarks: [],
    count: 30,
  };
  it("daily uses publication date; weekly covers selected day plus six; no duplicates", () => {
    const daily = selectQuestions(bank.questions, {
      ...settings,
      mode: "Daily Quiz",
    });
    expect(daily.length).toBeGreaterThan(0);
    expect(daily.every((q) => dayKey(q.publishedAt) === "2026-09-30")).toBe(
      true,
    );
    const weekly = selectQuestions(bank.questions, {
      ...settings,
      mode: "Weekly Quiz",
    });
    expect(weekly).toHaveLength(30);
    expect(new Set(weekly.map((q) => q.id)).size).toBe(30);
    expect(
      selectQuestions(bank.questions, {
        ...settings,
        mode: "Monthly Quiz",
        date: "2026-08-01",
      }),
    ).toHaveLength(0);
  });
  it("keeps unattempted high-priority questions available on later days", () => {
    const backlog = selectQuestions(bank.questions, {
      ...settings,
      mode: "Evening Quiz",
      date: "2026-10-01",
      backlog: true,
    });
    expect(backlog.length).toBeGreaterThan(0);
    expect(backlog.every((q) => q.priority === "High")).toBe(true);
  });
  it("revisions use attempt date and reset after errors", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    let r = nextRevision(undefined, "correct", "q", now);
    expect(r.interval).toBe(1);
    r = nextRevision(r, "correct", "q", now);
    expect(r.interval).toBe(3);
    r = nextRevision(r, "correct", "q", now);
    expect(r.interval).toBe(7);
    r = nextRevision(r, "incorrect", "q", now);
    expect(r.interval).toBe(1);
    expect(r.consecutive).toBe(0);
    expect(dayKey(r.dueAt)).toBe("2026-10-11");
  });
  it("counts contiguous activity days with a grace for today", () => {
    const a = (d: string) => ({ attemptedAt: d + "T12:00:00" }) as Attempt;
    expect(
      streak(
        [a("2026-09-28"), a("2026-09-29")],
        new Date("2026-09-30T12:00:00"),
      ),
    ).toBe(2);
    expect(streak([a("2026-09-27")], new Date("2026-09-30T12:00:00"))).toBe(0);
  });
});
