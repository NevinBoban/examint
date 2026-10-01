// @vitest-environment jsdom
import React from "react";
import "fake-indexeddb/auto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { db, defaultSettings } from "../src/db";
import { LocalContentRepository, createSession } from "../src/repositories";
import { ToastProvider } from "../src/store";
import { QuizSession } from "../src/pages/Quiz";
import { CurrentAffairs, ArticleReader } from "../src/pages/Content";
import Settings from "../src/pages/Settings";
import App from "../src/App";
import rawBank from "../public/content/demo.json";
import type { Bank } from "../src/types";
const bank = rawBank as Bank;
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    offlineReady: [false, () => {}],
    needRefresh: [false, () => {}],
    updateServiceWorker: vi.fn(),
  }),
}));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
window.matchMedia = vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});
window.scrollTo = vi.fn();
vi.stubGlobal(
  "fetch",
  vi.fn(async () => ({ ok: true, json: async () => bank })),
);
beforeEach(async () => {
  await db.delete();
  await db.open();
  await new LocalContentRepository().upsert(bank);
  await db.settings.put(defaultSettings);
});
afterEach(() => cleanup());
function quiz(id: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/quiz/session/${id}`]}>
        <Routes>
          <Route path="/quiz/session/:id" element={<QuizSession />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}
it("submits and locks an answer, reveals next solution separately, and resumes saved position", async () => {
  const user = userEvent.setup(),
    qs = bank.questions.slice(0, 2),
    id = await createSession(
      qs.map((q) => q.id),
      "UI test",
    );
  const view = quiz(id);
  await screen.findByText(qs[0].prompt);
  await user.click(
    screen.getByRole("button", {
      name: new RegExp(qs[0].options[qs[0].answer]),
    }),
  );
  await user.click(screen.getByRole("button", { name: "Submit answer" }));
  await screen.findByText("That’s right. Nicely done.");
  expect(
    (
      screen.getByRole("button", {
        name: new RegExp(qs[0].options[qs[0].answer]),
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Next question" }));
  await screen.findByText(qs[1].prompt);
  await user.click(screen.getByRole("button", { name: "View solution" }));
  await screen.findByText("Solution revealed — not counted as an answer.");
  view.unmount();
  quiz(id);
  await screen.findByText(qs[1].prompt);
  await screen.findByText("Solution revealed — not counted as an answer.");
  expect(await db.attempts.count()).toBe(2);
  await user.click(screen.getByRole("button", { name: /Finish session/ }));
  await screen.findByText("Session complete");
  expect(
    (await db.attempts.toArray()).filter((a) => a.outcome === "correct"),
  ).toHaveLength(1);
});
it("filters the article edition by date and category and persists bookmarks", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <MemoryRouter>
        <CurrentAffairs />
      </MemoryRouter>
    </ToastProvider>,
  );
  await screen.findByText(bank.articles[0].headline);
  await user.selectOptions(screen.getByLabelText("Category"), "Environment");
  await screen.findByText(bank.articles[2].headline);
  expect(screen.queryByText(bank.articles[0].headline)).toBeNull();
  fireEvent.change(screen.getByLabelText("Edition date"), {
    target: { value: "2026-08-01" },
  });
  await screen.findByText("No articles match");
  await user.click(screen.getByRole("button", { name: "Reset filters" }));
  await screen.findByText(bank.articles[0].headline);
  await user.click(
    screen.getAllByRole("button", { name: "Bookmark article" })[0],
  );
  await waitFor(async () => expect(await db.bookmarks.count()).toBe(1));
});
it("rejects an invalid backup file with a visible error and preserves progress", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    </ToastProvider>,
  );
  const f = new File(["{broken"], "bad.json", { type: "application/json" });
  Object.defineProperty(f, "text", { value: async () => "{broken" });
  await user.upload(screen.getByLabelText("Choose EXAMINT backup JSON"), f);
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toContain("Invalid JSON");
  expect(await db.questions.count()).toBe(30);
});
it("renders article details and marks a reading as completed", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/article/moon"]}>
        <Routes>
          <Route path="/article/:id" element={<ArticleReader />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
  await screen.findByRole("heading", { name: bank.articles[0].headline });
  await user.click(screen.getByRole("button", { name: "Mark as read" }));
  await screen.findByRole("button", { name: "Read" });
  expect(await db.readings.count()).toBe(1);
});
it("opens every navigation page without a missing-route placeholder", async () => {
  const user = userEvent.setup();
  window.location.hash = "#/";
  render(<App />);
  await screen.findByText(/Good .*Nevin/);
  const routes = [
    ["Current Affairs", "Current affairs"],
    ["Daily Quiz", "Your daily practice"],
    ["Revision", "A little recall goes a long way"],
    ["Bookmarks", "Your bookmarks"],
    ["Analytics", "See how far you’ve come"],
    ["Calendar", "Your learning calendar"],
    ["Settings", "Make this space yours"],
  ];
  for (const [link, title] of routes) {
    await user.click(
      screen.getAllByRole("link", { name: link, exact: true })[0],
    );
    await screen.findByRole("heading", { name: title, level: 1 });
  }
  expect(screen.queryByText("Page not found")).toBeNull();
});
it("records viewing an unanswered solution in the completed session review as revealed", async () => {
  const user = userEvent.setup(),
    q = bank.questions[0],
    id = await createSession([q.id], "Review reveal test");
  quiz(id);
  await screen.findByText(q.prompt);
  await user.click(screen.getByRole("button", { name: /Finish session/ }));
  await screen.findByText("Session complete");
  await user.click(screen.getByText(q.prompt));
  await waitFor(async () =>
    expect((await db.attempts.toArray())[0]?.outcome).toBe("revealed"),
  );
});
