import type {
  Attempt,
  Question,
  Revision,
  Outcome,
  Bookmark,
  Exam,
} from "./types";
export function dayKey(d: Date | string = new Date()) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
export function addDays(date: Date | string, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
export function prettyDate(d: string | Date = new Date()) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function accuracy(attempts: Attempt[]) {
  const answered = attempts.filter((a) => a.outcome !== "revealed");
  return answered.length
    ? Math.round(
        (answered.filter((a) => a.outcome === "correct").length /
          answered.length) *
          100,
      )
    : 0;
}
export function nextRevision(
  previous: Revision | undefined,
  outcome: Outcome,
  questionId: string,
  now = new Date(),
): Revision {
  const consecutive =
    outcome === "correct" ? (previous?.consecutive || 0) + 1 : 0;
  const interval =
    outcome === "correct"
      ? [1, 3, 7, 14, 30, 60][Math.min(consecutive - 1, 5)]
      : 1;
  return {
    questionId,
    consecutive,
    interval,
    dueAt: addDays(now, interval).toISOString(),
    lastOutcome: outcome,
    updatedAt: now.toISOString(),
  };
}
export function streak(attempts: Attempt[], now = new Date()) {
  const days = new Set(attempts.map((a) => dayKey(a.attemptedAt)));
  let cursor = days.has(dayKey(now)) ? now : addDays(now, -1),
    total = 0;
  while (days.has(dayKey(cursor))) {
    total++;
    cursor = addDays(cursor, -1);
  }
  return total;
}
export function latestAttempts(attempts: Attempt[]) {
  const map = new Map<string, Attempt>();
  [...attempts]
    .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt))
    .forEach((a) => map.set(a.questionId, a));
  return map;
}
export const modes = [
  "Daily Quiz",
  "Weekly Quiz",
  "Monthly Quiz",
  "High-Priority Quiz",
  "RRB JE Quiz",
  "SSC Quiz",
  "Wrong Answers",
  "Bookmarked Quiz",
  "Random Quiz",
  "Evening Quiz",
] as const;
export type QuizMode = (typeof modes)[number];
export function selectQuestions(
  qs: Question[],
  {
    mode,
    date,
    exam,
    attempts,
    bookmarks,
    count,
    backlog = false,
    articleId,
  }: {
    mode: string;
    date: string;
    exam: Exam;
    attempts: Attempt[];
    bookmarks: Bookmark[];
    count: number;
    backlog?: boolean;
    articleId?: string;
  },
) {
  const latest = latestAttempts(attempts);
  const start = dayKey(addDays(new Date(date + "T12:00:00"), -6));
  let selected = qs.filter((q) => {
    const d = dayKey(q.publishedAt);
    if (articleId) return q.articleId === articleId;
    if (mode === "RRB JE Quiz") return q.exams.includes("RRB JE");
    if (mode === "SSC Quiz") return q.exams.some((e) => e.startsWith("SSC"));
    if (!q.exams.includes(exam)) return false;
    switch (mode) {
      case "Daily Quiz":
        return d === date;
      case "Weekly Quiz":
        return d >= start && d <= date;
      case "Monthly Quiz":
        return d.slice(0, 7) === date.slice(0, 7);
      case "High-Priority Quiz":
        return q.priority === "High";
      case "Wrong Answers":
        return latest.get(q.id)?.outcome === "incorrect";
      case "Bookmarked Quiz":
        return bookmarks.some(
          (b) => b.type === "question" && b.targetId === q.id,
        );
      case "Evening Quiz":
        return (
          !attempts.some(
            (a) => a.questionId === q.id && a.outcome !== "revealed",
          ) &&
          (d === date || (backlog && d < date && q.priority === "High"))
        );
      default:
        return true;
    }
  });
  if (mode === "Random Quiz") {
    selected = [...selected];
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }
  }
  return selected.slice(0, count || undefined);
}
