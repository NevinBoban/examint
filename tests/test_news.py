"""Deterministic collector gates. Fictional fixtures; never published."""
import unittest
from unittest.mock import patch
from datetime import datetime, timezone
from scripts.collect_news import (parse_release, relevance, generate_questions,
    process_release, allowed, digest)

NOW = datetime(2026, 10, 3, 18, 0, tzinfo=timezone.utc)
STAMP = "2026-10-03T18:00:00Z"
TITLE = "BharatNet programme expands in Kerala"
BODY = "Digital Bharat Nidhi (DBN) coordinates the broadband programme. " * 3

def document(title=TITLE, body=BODY, date="03 OCT 2026 7:44PM"):
    return f'''<nav>Fake navigation headline</nav>
    <div class="innner-page-main-about-us-content-right-part">
    <div id="MinistryName">Ministry of Communications</div>
    <h1 id="Titleh2">{title}</h1><div id="PrDateTime">Posted On: {date} by PIB Delhi</div>
    <p>{body}</p><script>Wrong Expansion (DBN)</script></div>
    <div id="PdfDiv"><p>Wrong Expansion (DBN)</p></div>'''

def article():
    return {"id": "fixture", "headline": TITLE, "category": "Electronics and Technology",
            "exams": ["RRB JE"], "priority": "High", "publishedAt": STAMP, "collectedAt": STAMP,
            "source": "PIB", "sourceUrl": "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1",
            "organizations": [], "locations": [], "verification": "source-checked",
            "evidence": {"sourceHash": digest(BODY)}}

class NewsChecks(unittest.TestCase):
    def test_parser_excludes_hidden_copy_and_scripts(self):
        fields, date = parse_release(document(), TITLE)
        self.assertNotIn("Wrong Expansion", fields["body"])
        self.assertEqual(date.astimezone(timezone.utc).hour, 14)

    def test_mismatch_and_missing_date_are_rejected(self):
        with self.assertRaises(ValueError): parse_release(document(), "Different headline")
        with self.assertRaises(ValueError): parse_release(document(date="yesterday"))

    def test_non_english_is_rejected(self):
        with self.assertRaises(ValueError): parse_release(document(title="भारत समाचार विज्ञान और प्रौद्योगिकी विकास"))

    def test_trust_boundary(self):
        hosts = ["pib.gov.in", "www.pib.gov.in"]
        self.assertTrue(allowed("https://pib.gov.in/release", hosts))
        for url in ["https://pib.gov.in.evil.test/release", "http://pib.gov.in/release", "https://evil.test@pib.gov.in/release", "https://pib.gov.in:8080/release"]:
            self.assertFalse(allowed(url, hosts))

    def test_relevance_excludes_routine_items(self):
        self.assertIsNone(relevance("Birthday greetings", ""))
        self.assertIsNone(relevance("Ministry of Railways cleanliness drive", "railway railway"))
        self.assertEqual(relevance(TITLE, BODY)[1], "Electronics and Technology")

    def test_questions_are_stable_and_have_four_distinct_options(self):
        qs = generate_questions(article(), BODY, STAMP)
        self.assertEqual(qs, generate_questions(article(), BODY, STAMP))
        self.assertEqual(len(qs), 2)
        for q in qs:
            self.assertEqual(len(set(q["options"])), 4)
            self.assertIn(q["options"][q["answer"]], q["evidence"]["quote"])

    def test_no_guessing_expansions(self):
        a = article(); a["headline"] = "Broadband programme"
        self.assertEqual(generate_questions(a, "DBN coordinates broadband", STAMP), [])
        self.assertEqual(generate_questions(a, "Wrong Expansion (DBN)", STAMP), [])

    def test_conflicting_expansion_and_multiple_states_withheld(self):
        a = article(); a["headline"] = "Broadband in Kerala and Tamil Nadu"
        self.assertEqual(generate_questions(a, BODY+" DBN (Different Body Name)", STAMP), [])

    def test_future_and_stale_dates_are_not_relabelled_as_today(self):
        source = {"name": "PIB", "allowedHosts": ["www.pib.gov.in"]}
        url = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1"
        for date in ["04 OCT 2026 7:44PM", "01 SEP 2026 7:44PM"]:
            with patch("scripts.collect_news.fetch", return_value=document(date=date)):
                with self.assertRaises(ValueError): process_release(source, url, TITLE, NOW)

    def test_medal_question_requires_explicit_winning_statement(self):
        a = article(); a["category"] = "Sports"
        a["headline"] = "Prime Minister congratulates Test Athlete on winning Bronze at Asian Games"
        qs = generate_questions(a, "", STAMP)
        self.assertEqual(len(qs), 1)
        self.assertEqual(qs[0]["options"][qs[0]["answer"]], "Bronze")
        a["headline"] = "Test Athlete denies winning Bronze at Asian Games"
        self.assertEqual(generate_questions(a, "", STAMP), [])

    def test_real_record_requires_fetch_and_preserves_publication_date(self):
        source = {"name": "PIB", "allowedHosts": ["www.pib.gov.in"]}
        with patch("scripts.collect_news.fetch", return_value=document()):
            a, qs, _ = process_release(source, "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1", TITLE, NOW)
        self.assertEqual(a["publishedAt"], "2026-10-03T14:14:00Z")
        self.assertEqual(a["collectedAt"], STAMP)
        self.assertEqual(len(qs), 2)

if __name__ == "__main__": unittest.main()
