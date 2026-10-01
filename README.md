# EXAMINT

**Know the News. Crack the Exam.**

A functional, local-first preparation app for RRB JE (Electronics & Allied), SSC CGL and SSC CHSL. React + TypeScript + Vite, Tailwind CSS, a shadcn-style Radix/CVA Button primitive, Lucide, React Router, Dexie, Recharts and vite-plugin-pwa.

## Start on Windows

Install Node.js 22 LTS or newer. Extract this project, open a terminal inside the `examint` folder and run:

```bash
npm ci
npm run dev
```

Open the local address printed by Vite. For the installable/offline production version:

```bash
npm run build
npm test
npm run preview
```

A local preview is for development. To open the app reliably on both a phone and laptop, deploy it to an HTTPS host using the included GitHub Pages workflow. Opening `index.html` directly as a file is not supported.

## Included functionality

- Eight working sections: Dashboard, Current Affairs, Daily Quiz, Revision, Bookmarks, Analytics, Calendar and Settings.
- Dark/light themes, desktop sidebar, mobile bottom navigation and global search.
- 15 historical/static-GK demonstration articles and 30 reviewed demonstration MCQs across all 15 requested categories.
- Article reading, source references, facts, static GK, memory cues, related questions, bookmarks and reading records.
- Daily, weekly, monthly, priority, RRB, SSC, wrong-answer, bookmarked, random and evening sessions. Counts cap at the number actually available; no duplicated padding.
- One question at a time, locked answer submission, separate solution reveals, explanations, navigation, saved sessions and local error reports.
- Persistent question bank, backlog, completed questions and a separate revealed-solutions queue.
- Spaced revision, flashcards, revision history, actual-activity charts and 91-day heatmap.
- Calendar editions and weekly/monthly archives that distinguish publication dates from attempt dates.
- JSON export and validated, transactional merge/replace restore.
- PWA manifest, app icons, cached shell and cached content. Remote images use a separate runtime cache and an icon fallback.

## Demonstration dates and facts

The demo edition is fixed to **24–30 September 2026**. These are synthetic edition dates for testing the workflow, not claims that historical events happened then. Event dates are stored separately. If Today has no demo questions, choose Random Quiz, or select 30 September 2026 and Weekly Quiz. All content remains accessible in the archive.

Source URLs are provided. Some static-GK items reference an organisation's reference portal rather than a specific news article. The content is educational demonstration material, not a live news service or a prediction of exam questions. No AI or news collection is running.

## GitHub source control and GitHub Pages

The project includes a local Git history and `.github/workflows/deploy.yml`. The source repository is https://github.com/NevinBoban/examint. GitHub Pages is configured using the workflow below. For a separate copy, push this folder to your own empty repository.

```bash
git remote add origin https://github.com/YOUR_USERNAME/examint.git
git branch -M main
git push -u origin main
```

Authenticate using GitHub's normal Git credential flow. Do not paste tokens into project files.

1. In the repository, open **Settings → Pages**.
2. Set **Source → GitHub Actions**.
3. Open **Actions → Deploy EXAMINT to GitHub Pages → Run workflow**, or push a commit to `main`.
4. Open the URL reported by the deployment, normally `https://YOUR_USERNAME.github.io/examint/`.

The workflow runs a production build and tests before deploying `dist/`. Build precedes tests because one test validates generated PWA assets. GitHub account/repository eligibility for Pages follows GitHub's own rules.

### Repository subpaths and navigation

Vite uses `base: './'`. The router is `HashRouter`, so a deep link such as `/examint/#/revision` only requests `/examint/` from GitHub Pages and does not cause a server-side route 404. The manifest uses `start_url: './'` and `scope: './'`; app icons, content and service worker assets resolve under the repository path. Do not change the router to history routing on GitHub Pages without configuring a fallback.

### Install on Android or Windows

After deployment, open the HTTPS URL in Chrome or Edge. Use the browser's **Install app** / **Add to Home screen** action, or the install button in EXAMINT Settings if the browser exposes one. Browser support and install prompts vary. Visit while online once and let the service worker finish before relying on offline use. The PWA installation flow and real offline launch still need verification on your actual devices.

## Data and backup

All personal progress stays in IndexedDB (`examint`) in the current browser profile, origin and device. Another phone, browser or deployment domain has a separate store. There is **no automatic sync**. Private browsing, clearing site data or browser eviction can remove local data. Settings includes a persistent-storage request and export/import; export regularly.

**Settings → Export progress** downloads all tables as JSON, with `app`, schema version and export timestamp. Import accepts files up to 20 MB and validates types, IDs, dates, references, option bounds, answer consistency and HTTPS source/image URLs before writing.

- **Merge:** immutable attempts are deduplicated by `sessionId:questionId`; newer compatible mutable records win. Conflicting question answers or session question sets reject the entire transaction. Session answer maps are rebuilt from canonical attempts.
- **Replace:** requires an explicit confirmation checkbox and atomically replaces the local tables. Export your current progress first.
- The current backup schema is version 2. Unsupported versions are rejected rather than guessed.

The IndexedDB schema has v1 and v2 migrations; v2 adds local error reports and normalises settings timestamps. The migration is covered by tests.

## Progress semantics

- **Answered:** an explicitly submitted option, either correct or incorrect.
- **Revealed:** a solution shown without an answer. Never increases correct answers or the accuracy denominator.
- **Accuracy:** correct / submitted answers. Repeated practice counts as another attempt, but a question can only be submitted once in one session.
- **Completed bank question:** has at least one submitted answer. A reveal alone does not complete it.
- **Streak:** consecutive local calendar days with a submitted answer or a revealed review, with today allowed to be unfinished.
- **Daily goal:** distinct questions explicitly answered today.
- **Wrong Answers:** questions whose most recent review was incorrect.
- **Evening Quiz:** unanswered questions in the selected edition, optionally including earlier unanswered high-priority questions.
- All date calculations use the browser's local timezone, matching the user's device. Backup timestamps remain ISO timestamps.

## Spaced repetition

Review scheduling is independent of publication dates. Consecutive correct reviews schedule 1, 3, 7, 14, 30 and then 60 days ahead. An incorrect answer or revealed solution resets the consecutive count and schedules one day ahead. Three consecutive correct answers count as mastered. Flashcard flips do not change progress; practice questions do.

## Architecture and future integrations

```text
public/content/demo.json   Versioned content, independent of source/UI
src/types.ts               Content metadata and progress contracts
src/repositories.ts        Provider interfaces and local implementations
src/db.ts                  Dexie tables and migrations
src/logic.ts               Dates, selection, accuracy and scheduling
src/backup.ts              Validation, export and transactional restore
src/pages/                 User-facing pages
src/components/            Shared UI and charts
src/pwa.tsx                Install and service-worker lifecycle
src/webmcp.ts              Optional read-only browser study-summary tool
```

`NewsProvider`, `AIProvider`, `ImageProvider`, `ContentRepository` and `ProgressRepository` are explicit interfaces. `LocalAIProvider` returns a curated summary unchanged; it does not perform inference or pretend to be AI.

For future RSS/Gemini integration:

1. Add a server-side or scheduled-job provider that fetches official feeds and verifies sources.
2. Store Gemini credentials in backend secrets or GitHub Actions secrets. Never use `VITE_*` variables for secrets; Vite embeds those into public code.
3. Produce validated JSON using the existing content contract. Metadata supports source URLs, publication/event/collection/update timestamps, verification and question-validation states, image licensing, AI flags, exams and estimated study priority.
4. Commit only generated content under `public/content/` and let the existing build deploy it. Stable IDs and the content upsert preserve personal progress. Never reuse a question ID for a changed question or changed answer; create a new ID.
5. Later introduce a manifest/multiple banks and an alternate content provider if the bank grows. Frontend page components can continue using the same repository and model contracts.
6. For cloud sync, implement a separate authenticated progress adapter with conflict rules and bookmark-deletion tombstones. The current JSON merge is an explicit manual transfer, not a background sync system.

No scheduled workflow is enabled and no future integration buttons claim to be active. The source and content are already separated so automation can be introduced without rewriting the page components.

## Image credits

Remote images are only used where relevant. Every image has a source and licensing metadata; attribution appears on cards/readers. If unavailable, a category icon appears instead.

- Moon: NASA / ALSJ / Emily Lakdawalla, public domain. Representative Apollo 11 Moon photograph, **not** a photograph from Chandrayaan-3. https://commons.wikimedia.org/wiki/File:Apollo_11_image_of_a_nearly_full_Moon.jpg
- Indian passenger train: HridoyKundu, CC BY-SA 4.0. https://commons.wikimedia.org/wiki/File:A_typical_Indian_passenger_train.jpg
- Bengal tiger at Kanha: Rahulsharma photography, CC BY-SA 4.0. https://commons.wikimedia.org/wiki/File:Royal_Bengal_Tiger_at_Kanha_National_Park.jpg
- CC licence: https://creativecommons.org/licenses/by-sa/4.0/

No remote image is promised available offline before a successful cached fetch. Images are not embedded in JSON backups.

## Verification and remaining deployment checks

```bash
npm ci
npm run build
npm test
```

Automated checks cover answer locking, revealed outcomes, resumed session state, IndexedDB reopen persistence, migrations, content refresh preservation, daily/weekly/monthly filtering, high-priority backlog, revision intervals, streaks, duplicate-free backup restore, malformed imports, transactional conflict rollback, article bookmarks, reading records, all eight routes, and production manifest/service-worker asset paths.

DOM interaction tests run in jsdom. They do **not** replace real browser layout checks. A permitted real-browser QA facility was unavailable in this run. Before using the deployment as your daily app, check:

- Windows desktop and Android layouts, including 200% text zoom and a 320px viewport.
- GitHub repository-subpath launch and direct hash links.
- Browser install prompt, service-worker update and a real offline reload.
- Real image downloads/fallbacks and browser backup download/upload.

The optional feature-detected WebMCP read-only summary tool has not been validated in a supporting browser. Unsupported browsers ignore it. It has no effect on normal study workflows.
