# Official news collection

GitHub Actions runs `scripts/collect_news.py` every four hours (01:17, 05:17,
09:17, 13:17, 17:17, 21:17 UTC), on source pushes and on manual dispatch.
Scheduled jobs can be delayed. GitHub may disable schedules after prolonged
repository inactivity; check the Actions tab if the app reports stale collection.

No paid API or AI model is used. Python's standard library fetches PIB's English
RSS feed and release listing. The listing supplements the short RSS feed. Only
allowlisted HTTPS hosts are accepted, including redirects. Requests have size
limits and timeouts. Three concurrent requests and a 40-release cap limit load.

## Publication gates

1. English headline, body, and a parseable source timestamp are required.
2. A feed/listing headline must match the article headline. Missing, future and
   more-than-seven-day-old dates are rejected, never replaced by collection time.
3. Topic terms estimate syllabus relevance. Routine greetings and cleanliness
   campaigns are excluded. This is a heuristic, not a prediction of exam questions.
4. Automatic MCQs currently support ONLY exact acronym/expansion pairs from a
   fixed dictionary, a single unambiguous Indian state in a headline, and an
   explicit winning/retaining-medal statement in a sports headline.
5. Four distinct options and explicit answer evidence are required. No supported
   rule means no question. This deliberately limits quiz coverage.

`source-checked` / `rule-checked` mean the answer matches the cited official
release. They do NOT mean independent cross-source fact checking or guaranteed
truth. No AI-based summarisation, broad MCQ generation or human review occurs.
The user can open the source and report errors locally. Reports are not sent to
the collector. Do not label these checks as independently verified news.

`public/content/live.json` is the cumulative archive and collection status.
`news/review-log.json` explains the latest run's held/rejected items. No full
article scraping archive or unlicensed images are published: short excerpts,
fact evidence and source links are used, with category illustrations as fallback.
Demo content remains separately labelled in `public/content/demo.json`.

IDs are stable. New editions never erase old articles, question attempts or
bookmarks. Rechecked, changed sources withdraw obsolete questions (`pending`)
without deleting them. Sources outside the latest listing are not continuously
reverified; historical questions reflect the cited release when last checked.
Source failures preserve the existing archive and publish failure status. A run
may be partially successful; source checking is visible in collection status.

The same workflow commits generated content and deploys Pages: pushes made by
GITHUB_TOKEN do not need to trigger a second workflow. A failed build/test does
not deploy. A conflicting remote push stops publication rather than overwriting.
Secrets and user progress are never committed. The frontend refreshes on opening,
reconnection, returning to the tab, and every ten minutes while visible. Refresh
edition downloads the published bank; it does not launch a server job.

## Local checks

```sh
python -m unittest discover -s tests -p 'test_*.py'
python scripts/collect_news.py
npm run build
npm test
```

Future Gemini integration must run in this job or a secure backend, use a secret
API key, preserve evidence and validation gates, and keep uncertain output pending.
