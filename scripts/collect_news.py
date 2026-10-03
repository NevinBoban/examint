"""No API keys. Official PIB collection and conservative, evidence-bound quizzes.

Only acronym expansions confirmed against the rule dictionary, and unambiguous
Indian-state headline clozes, can pass. All other articles have no automatic MCQ.
Source checking is not independent fact checking. See news/README.md.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from datetime import datetime, timedelta, timezone
import urllib.request
from urllib.parse import urlparse, parse_qs
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
IST = timezone(timedelta(hours=5, minutes=30))
EXAMS = ["RRB JE", "SSC CGL", "SSC CHSL"]
RULE_VERSION = "evidence-rules-v1"
TOPICS = {
    "Electronics and Technology": ["semiconductor", "electronics", "telecommunications", "bharatnet", "broadband", "digital bharat", "5g", "6g", "artificial intelligence"],
    "Railways and Infrastructure": ["railway", "railways", "kavach", "vande bharat", "metro", "highway", "nhai", "tolling", "fastag"],
    "Space and Defence": ["isro", "satellite", "space mission", "missile", "defence", "naval", "army", "air force", "drdo"],
    "Economy and Banking": ["rbi", "reserve bank", "repo rate", "inflation", "gdp", "banking", "gst", "upi", "trade", "exports", "investment", "capex"],
    "Government Schemes": ["scheme", "yojana", "scholarship", "beneficiaries", "mission karmayogi", "pm e-drive"],
    "Environment": ["biodiversity", "climate", "wildlife", "ramsar", "renewable", "solar", "green hydrogen", "carbon emission"],
    "Science and Technology": ["research", "innovation", "scientific", "biotechnology", "icar", "technology development"],
    "International Affairs": ["g20", "brics", "united nations", "bilateral", "summit", "treaty"],
    "Reports and Indices": ["census", "survey", "index", "ranking", "report released"],
    "Sports": ["asian games", "olympic", "world cup", "championship", "gold medal", "silver medal", "bronze medal"],
    "Awards and Honours": ["nobel", "padma", "national award", "bharat ratna"],
    "Appointments": ["appointed", "appointment", "takes charge"],
    "National Affairs": ["supreme court", "constitution", "parliament", "legislation", "upsc", "cabinet approves"],
}
GLOSSARY = {
    "DBN": "Digital Bharat Nidhi", "BSNL": "Bharat Sanchar Nigam Limited",
    "DoT": "Department of Telecommunications", "ABP": "Amended BharatNet Program",
    "ISRO": "Indian Space Research Organisation", "DRDO": "Defence Research and Development Organisation",
    "RBI": "Reserve Bank of India", "UPI": "Unified Payments Interface",
    "GST": "Goods and Services Tax", "GDP": "Gross Domestic Product",
    "NHAI": "National Highways Authority of India", "ICAR": "Indian Council of Agricultural Research",
    "FCI": "Food Corporation of India", "UPSC": "Union Public Service Commission",
    "TDB": "Technology Development Board", "NSP": "National Scholarship Portal",
    "NSPAAD": "National Surveillance Programme for Aquatic Animal Diseases",
    "NSS": "National Service Scheme", "PLI": "Production Linked Incentive",
    "NPCI": "National Payments Corporation of India",
    "AIME": "ASEAN-India Maritime Exercise",
}
STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"]

def clean(value):
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()

def norm(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())

def stamp(value):
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def english(text):
    letters = [c for c in text if c.isalpha()]
    return len(letters) > 15 and sum(c.isascii() for c in letters) / len(letters) > .92

def allowed(url, hosts):
    u = urlparse(url)
    return u.scheme == "https" and u.hostname in hosts and not u.username and u.port in (None, 443)

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, hosts):
        self.hosts = hosts
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed(newurl, self.hosts):
            raise ValueError("Source redirected outside its allowlist")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(url, hosts):
    if not allowed(url, hosts):
        raise ValueError("Unapproved source URL")
    request = urllib.request.Request(url, headers={"User-Agent": "EXAMINT/1.1 (+https://github.com/NevinBoban/examint)", "Accept-Language": "en-IN,en;q=0.9"})
    with urllib.request.build_opener(SafeRedirect(hosts)).open(request, timeout=18) as response:
        body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ValueError("Source response too large")
        return body.decode("utf-8-sig")

class PageParser(HTMLParser):
    """Reads only explicit release fields; excludes nav, hidden PDF duplicates and scripts."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.fields = {"headline": [], "published": [], "ministry": [], "body": []}
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and "PRID=" in attrs.get("href", ""):
            self.links.append((attrs["href"], attrs.get("title", "")))
        field = {"Titleh2": "headline", "PrDateTime": "published", "MinistryName": "ministry"}.get(attrs.get("id"))
        main = "innner-page-main-about-us-content-right-part" in attrs.get("class", "")
        inherited = self.stack[-1] if self.stack else ("", False, False, "")
        hidden = inherited[2] or tag in ("script", "style", "textarea") or attrs.get("id") == "PdfDiv"
        if tag not in ("input", "img", "br", "hr", "meta", "link", "source", "wbr"):
            self.stack.append((tag, main or inherited[1], hidden, field or inherited[3]))
        if tag in ("p", "br", "li") and inherited[1]:
            self.fields["body"].append("\n")
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break
    def handle_data(self, data):
        if not self.stack or self.stack[-1][2]:
            return
        _, main, _, field = self.stack[-1]
        if field:
            self.fields[field].append(data)
        if main and any(x[0] in ("p", "li") for x in self.stack) and not field:
            self.fields["body"].append(data)

def parse_release(document, feed_title=""):
    p = PageParser(); p.feed(document)
    fields = {k: clean(" ".join(v)) for k, v in p.fields.items()}
    if not english(fields["headline"]) or len(fields["body"]) < 100:
        raise ValueError("Missing English headline or release body")
    if feed_title and norm(feed_title) != norm(fields["headline"]):
        raise ValueError("Feed and release headline disagree")
    match = re.search(r"(\d{1,2}\s+[A-Z]{3}\s+\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)", fields["published"], re.I)
    if not match:
        raise ValueError("Missing source publication timestamp")
    published = datetime.strptime(match[1]+" "+match[2].replace(" ", ""), "%d %b %Y %I:%M%p").replace(tzinfo=IST)
    return fields, published

def relevance(headline, body):
    if re.search(r"birthday|condolence|greetings|cleanliness drive|shramdaan|swachhata hi se[wv]a|special campaign 6|meets prime minister|subhashitam", headline, re.I):
        return None
    scores = []
    for category, words in TOPICS.items():
        hits = [w for w in words if re.search(r"\b"+re.escape(w)+r"\b", headline+" "+body[:5000], re.I)]
        score = sum(3 if re.search(r"\b"+re.escape(w)+r"\b", headline, re.I) else 1 for w in hits)
        if score >= 3:
            scores.append((score, category, hits))
    return max(scores, default=None)

def make_question(article, answer, distractors, prompt, quote, rule, now):
    options = sorted([answer, *distractors], key=lambda x: digest(article["id"]+x))
    if len(options) != 4 or len({norm(o) for o in options}) != 4 or norm(answer) not in norm(quote):
        raise ValueError("Question evidence or options failed validation")
    keys = ["category", "exams", "priority", "publishedAt", "collectedAt", "source", "sourceUrl", "organizations", "locations", "verification"]
    return {**{k: article[k] for k in keys}, "id": "news-q-"+digest(article["id"]+prompt+json.dumps(options))[:24],
            "updatedAt": now, "articleId": article["id"], "prompt": prompt, "options": options,
            "answer": options.index(answer), "explanation": f"The official release explicitly states: “{quote}”. The answer is {answer}. This is a source-based recall question, not independent fact verification.",
            "validation": "rule-checked", "evidence": {"method": RULE_VERSION, "rule": rule, "quote": quote,
            "sourceUrl": article["sourceUrl"], "checkedAt": now, "sourceHash": article["evidence"]["sourceHash"]}}

def generate_questions(article, text, now):
    questions = []
    for acronym, expansion in GLOSSARY.items():
        # Both directions must explicitly pair the exact approved expansion with the acronym.
        pat = r"\b"+re.escape(expansion)+r"\s*\(\s*"+re.escape(acronym)+r"(?:\s+\d{4})?\s*\)|\b"+re.escape(acronym)+r"\s*\(\s*"+re.escape(expansion)+r"\s*\)"
        match = re.search(pat, text, re.I)
        if not match:
            continue
        # Reject competing parenthesised expansions for the same acronym.
        alternatives = re.findall(r"\b"+re.escape(acronym)+r"\s*\(([^)]+)\)", text, re.I)
        if any(norm(a) != norm(expansion) for a in alternatives):
            continue
        distractors = sorted([v for v in GLOSSARY.values() if v != expansion], key=lambda x: digest(acronym+x))[:3]
        questions.append(make_question(article, expansion, distractors, f"In this {article['category'].lower()} update, what does {acronym} stand for?", match[0], "explicit-acronym-pair", now))
        if len(questions) == 2:
            break
    title = article["headline"]
    medal = re.search(r"\bon (?:winning|retaining) (?:historic )?(Gold|Silver|Bronze)\b", title, re.I)
    if (article["category"] == "Sports" and medal and len(title) <= 300
            and not re.search(r"\b(?:not|denies|fake|false|stripped)\b", title, re.I)):
        answer = medal[1].title()
        cloze = title[:medal.start(1)]+"_____"+title[medal.end(1):]
        questions.append(make_question(article, answer, [x for x in ["Gold", "Silver", "Bronze", "No medal"] if x != answer],
            f"Which medal completes this official announcement? “{cloze}”", title, "explicit-medal-headline", now))
    locations = [s for s in STATES if re.search(r"\b"+re.escape(s)+r"\b", title, re.I)]
    if len(locations) == 1 and len(title) <= 260:
        answer = locations[0]
        cloze = re.sub(r"\b"+re.escape(answer)+r"\b", "_____", title, flags=re.I)
        distractors = sorted([s for s in STATES if s != answer], key=lambda x: digest(article["id"]+x))[:3]
        questions.append(make_question(article, answer, distractors, f"Which Indian state completes this official announcement? “{cloze}”", title, "single-state-headline", now))
    return questions

def process_release(source, url, title, now):
    fields, published = parse_release(fetch(url, source["allowedHosts"]), title)
    if published > now or published < now-timedelta(days=7):
        raise ValueError("Source publication date is future or older than seven days")
    result = relevance(fields["headline"], fields["body"])
    if not result:
        return None, [], "Below exam-relevance threshold"
    score, category, hits = result
    prid = parse_qs(urlparse(url).query)["PRID"][0]
    checked = stamp(now)
    quote = " ".join(fields["body"].split()[:40])+"…"
    article = {"id": f"pib-{prid}", "headline": fields["headline"], "summary": quote,
        "body": ["Source excerpt: “"+quote+"”", "Open the official release for the full announcement. EXAMINT selects this item using topic rules; it does not independently certify the claims in a government announcement."],
        "category": category, "exams": EXAMS, "priority": "High" if score >= 6 else "Medium",
        "publishedAt": stamp(published), "collectedAt": checked, "updatedAt": checked,
        "source": source["name"], "sourceUrl": url, "verification": "source-checked", "aiGenerated": False,
        "organizations": [fields["ministry"]] if fields["ministry"] else [],
        "locations": [s for s in STATES if re.search(r"\b"+re.escape(s)+r"\b", fields["headline"], re.I)],
        "facts": [], "staticGK": [], "remember": "Identify the programme, institution and place in the original release.",
        "relevance": {e: f"Topic match for {e}: {category}. Matched terms: {', '.join(hits)}. Estimated study relevance, not an examination prediction." for e in EXAMS},
        "evidence": {"method": RULE_VERSION, "rule": "official-release", "quote": quote, "sourceUrl": url, "checkedAt": checked, "sourceHash": digest(fields["headline"]+fields["body"])}}
    qs = generate_questions(article, fields["headline"]+" "+fields["body"], checked)
    article["facts"] = list(dict.fromkeys(q["evidence"]["quote"] for q in qs))
    if qs:
        article["remember"] = " · ".join(q["options"][q["answer"]] for q in qs)
    return article, qs, "Passed source and relevance checks" if qs else "No supported quiz rule: held out of quizzes"

def discover(source):
    found = {}
    errors = []
    # Listing supplements RSS, which may only expose the latest few releases.
    for kind, url in [("rss", source["feedUrl"]), ("listing", source["listingUrl"])]:
        try:
            document = fetch(url, source["allowedHosts"])
            if kind == "rss":
                root = ET.fromstring(document)
                items = [(i.findtext("link", ""), i.findtext("title", "")) for i in root.findall(".//item")]
            else:
                p = PageParser(); p.feed(document); items = p.links
            for link, title in items:
                if not english(title):
                    continue
                u = urllib.parse.urljoin(url, link)
                if not allowed(u, source["allowedHosts"]):
                    continue
                prid = parse_qs(urlparse(u).query).get("PRID", [""])[0]
                if prid.isdigit():
                    canonical = f"https://www.pib.gov.in/PressReleasePage.aspx?PRID={prid}&reg=3&lang=1"
                    found[prid] = (canonical, clean(title))
        except Exception as error:
            errors.append(f"{kind}: {type(error).__name__}: {error}")
    if not found:
        raise ValueError("No English releases found. "+"; ".join(errors))
    return list(found.values()), errors

def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2)+"\n")
    temp.replace(path)

def collect(output, limit=40):
    now = datetime.now(timezone.utc)
    old = json.loads(output.read_text()) if output.exists() else {"version": 1, "articles": [], "questions": []}
    articles = {a["id"]: a for a in old["articles"]}
    questions = {q["id"]: q for q in old["questions"]}
    status = {"lastRunAt": stamp(now), "lastSuccessAt": old.get("collection", {}).get("lastSuccessAt"), "schedule": "Every four hours", "sources": [], "addedArticles": 0, "addedQuestions": 0, "held": 0, "policy": RULE_VERSION}
    review = []
    for source in json.loads((ROOT/"news/sources.json").read_text())["sources"]:
        health = {"name": source["name"], "url": source["listingUrl"], "ok": False, "errors": [], "discovered": 0, "checked": 0}
        try:
            items, warnings = discover(source)
            health["discovered"] = len(items); health["errors"] = warnings
            # Highest topical score first; routine items need no article request.
            items = [x for x in items if relevance(x[1], "")]
            items.sort(key=lambda x: relevance(x[1], "")[0], reverse=True)
            items = items[:limit]
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
                jobs = [(url, title, pool.submit(process_release, source, url, title, now)) for url, title in items]
                for url, title, future in jobs:
                    try:
                        a, qs, reason = future.result()
                        health["checked"] += 1
                        if not a:
                            # A successfully parsed source which is no longer relevant
                            # must not leave a previously published quiz active.
                            for q in questions.values():
                                if q["sourceUrl"] == url and q["validation"] != "pending":
                                    q["validation"] = "pending"; q["updatedAt"] = stamp(now)
                            continue
                        existing = articles.get(a["id"])
                        if existing:
                            a["collectedAt"] = existing["collectedAt"]
                        else:
                            status["addedArticles"] += 1
                        articles[a["id"]] = a
                        new_ids = {q["id"] for q in qs}
                        # Corrected source -> withdraw old questions, retain all attempt history.
                        for q in questions.values():
                            if q["articleId"] == a["id"] and q["id"] not in new_ids and q["validation"] != "pending":
                                q["validation"] = "pending"; q["updatedAt"] = stamp(now)
                        for q in qs:
                            if q["id"] not in questions:
                                status["addedQuestions"] += 1
                            else:
                                q["collectedAt"] = questions[q["id"]]["collectedAt"]
                            questions[q["id"]] = q
                        if not qs:
                            status["held"] += 1
                        review.append({"sourceUrl": url, "headline": title, "reason": reason, "quizQuestions": len(qs)})
                    except Exception as error:
                        review.append({"sourceUrl": url, "headline": title, "reason": str(error), "quizQuestions": 0})
                        health["errors"].append(f"Release check failed: {url}: {error}")
            health["ok"] = health["checked"] > 0
        except Exception as error:
            health["errors"].append(str(error))
        status["sources"].append(health)
    if any(s["ok"] for s in status["sources"]):
        status["lastSuccessAt"] = stamp(now)
    status["articleCount"] = len(articles)
    status["questionCount"] = sum(q["validation"] == "rule-checked" for q in questions.values())
    atomic_json(output, {"version": 1, "articles": list(articles.values()), "questions": list(questions.values()), "collection": status})
    atomic_json(ROOT/"news/review-log.json", {"runAt": stamp(now), "items": review})
    print(json.dumps(status, indent=2))
    return any(s["ok"] for s in status["sources"])

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT/"public/content/live.json")
    parser.add_argument("--limit", type=int, default=40)
    args = parser.parse_args()
    sys.exit(0 if collect(args.output, args.limit) else 1)
