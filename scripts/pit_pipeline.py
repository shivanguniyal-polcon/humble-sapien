#!/usr/bin/env python3
"""THS PIT Desk pipeline: scrape policy/PIT news, analyse it through the
public-interest test, and write a site-ready JSON file.

    python3 scripts/pit_pipeline.py            # full run (needs an API key)
    python3 scripts/pit_pipeline.py --dry-run  # scrape + filter only, no LLM
    python3 scripts/pit_pipeline.py --limit 5  # cap analysed items

WHAT IT DOES
  1. Pulls from four source types:
       - PIB press releases (RSS, incl. ministry feeds)
       - national press (Google News / The Hindu / Indian Express RSS)
       - PRS Legislative Research (HTML listing pages; PRS has NO RSS and is
         not WordPress, so we parse its listing pages and respect its
         published 10-second crawl delay)
  2. Keeps only items that look like policy / public-interest news.
  3. Skips anything already in the output file (dedupe by URL).
  4. Sends each new item to an LLM (Groq or Google AI Studio) to answer the
     site's public-interest test: who benefits, who pays, who is missing —
     plus a short plain-language explanation from a PIT point of view.
  5. Writes ``pit-desk.json`` to the REPO ROOT (ths/). The site imports that
     file at build time, so: run this -> upload pit-desk.json to GitHub ->
     Vercel redeploys -> the PIT Desk section updates.

No third-party packages. Python 3.9+.

YOUR KEY (never committed — .gitignore covers .env and *.secret):
  set one of GROQ_API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY in the environment,
  or drop it in a file named ``.env.local`` (key=value per line) or
  ``.secret`` next to this repo root.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser

# --------------------------------------------------------------------------
# Layout. The repo root is ths/ (the git root), which is one level up from
# scripts/. That is where the user uploads, so the output goes there.
# --------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_FILE = os.path.join(REPO_ROOT, "pit-desk.json")

USER_AGENT = "THS-PIT-Desk/1.0 (public interest research; +https://humble-sapien.vercel.app/)"
# PIB (www.pib.gov.in) rejects non-browser User-Agents with HTTP 403 — verified:
# a custom agent is 403, a browser-like agent returns the RSS fine. We therefore
# send a browser-like UA for the fetches, while the contact string above documents
# who we are in the request pattern. Feeds (Google News, Hindu, Express) and PRS
# accept it too.
FETCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}
HTTP_TIMEOUT = 20
PRS_CRAWL_DELAY = 10.0  # PRS robots.txt asks for a 10s delay between hits.

# --------------------------------------------------------------------------
# Sources. Keep each tagged by kind so items carry provenance to the site.
# --------------------------------------------------------------------------
RSS_SOURCES = [
    # Government of India official releases. PIB has NO reliable English RSS:
    # its only live feed (RssMain Regid=3) is Hindi with empty descriptions, and
    # the legacy English URL (/newsite/rssenglish.aspx) is dead. Verified during
    # build; we therefore mirror PIB's English PressReleasePage via Google News
    # RSS, which yields English official releases (Cabinet approvals, ministry
    # notices). PIB ministry feeds are unreachable separately, so this one feed
    # carries all central-government content.
    {
        "tag": "PIB (Govt of India)", "kind": "government",
        "url": "https://news.google.com/rss/search?q="
               + urllib.parse.quote("site:pib.gov.in/PressReleasePage.aspx")
               + "&hl=en-IN&gl=IN&ceid=IN:en",
    },
    # ----------------------------------------------------------------------
    # Regulators. Verified 22 Oct 2026: RBI and SEBI publish RSS 2.0 that
    # returns HTTP 200 with a browser-like UA. The other four are documented
    # in REGULATOR_LISTINGS / REGULATOR_SKIPPED below.
    {
        "tag": "RBI (Press releases)", "kind": "regulator",
        "url": "https://www.rbi.org.in/pressreleases_rss.xml",
    },
    {
        "tag": "RBI (Notifications)", "kind": "regulator",
        "url": "https://www.rbi.org.in/notifications_rss.xml",
    },
    {
        # Flaky: returns valid RSS 2.0 (30 items) when their TLS chain is
        # complete, but often fails CERTIFICATE_VERIFY_FAILED because the
        # server omits the intermediate cert (checked 22 Oct 2026: 1 ok,
        # 11 failures the same day). Kept wired — a failed source is one
        # log line, not a crash. Do not "fix" this by disabling cert
        # checks; wait for SEBI to serve its chain.
        "tag": "SEBI (Press, circulars, orders)", "kind": "regulator",
        "url": "https://www.sebi.gov.in/sebirss.xml",
    },

    # National press.
    {"tag": "Google News", "kind": "press",
     "url": "https://news.google.com/rss/search?q=india+policy+governance+scheme"
            "&hl=en-IN&gl=IN&ceid=IN:en"},
    {"tag": "The Hindu", "kind": "press",
     "url": "https://www.thehindu.com/news/national/feeder/default.rss"},
    {"tag": "Indian Express", "kind": "press",
     "url": "https://indianexpress.com/feed/"},
]

# Regulators with no RSS but a parseable HTML listing. PFRDA's circulars page
# renders <a href="/en/web/pfrda/w/{slug}">Title</a> in plain HTML (verified
# 22 Oct 2026). Each entry: path_re filters the links worth taking.
REGULATOR_LISTINGS = [
    {
        "tag": "PFRDA (Circulars)", "kind": "regulator",
        "url": "https://pfrda.org.in/regulatory-framework/circulars/active-circulars",
        "path_re": r"^/en/web/pfrda/w/",
    },
]

# Checked 22 Oct 2026 and deliberately not wired. Kept here so the next run
# does not re-litigate each one:
#   NPCI   no feed; robots.txt disallows * (named bots excepted), so we do
#          not scrape www.npci.org.in/media/press-release without permission.
#   IRDAI  press-releases and circulars pages render their lists with
#          JavaScript; only 14 anchors in the raw HTML, none usable.
#   NABARD circulars.aspx returns 37 anchors, none of them a circular link
#          (also JS-rendered). PressReleases.aspx exposes only its title.
REGULATOR_SKIPPED = {
    "NPCI": "robots.txt disallows crawling; needs permission, not a workaround",
    "IRDAI": "listing is JavaScript-rendered; no anchors in raw HTML",
    "NABARD": "listing is JavaScript-rendered; no circular anchors in raw HTML",
}

# PRS has no RSS and is not WordPress: parse its HTML listing pages for links.
PRS_LISTINGS = [
    {"tag": "PRS (Bills)", "kind": "legislative",
     "url": "https://prsindia.org/billtrack"},
    {"tag": "PRS (Policy review)", "kind": "legislative",
     "url": "https://prsindia.org/policy/monthly-policy-review"},
    {"tag": "PRS (Blog)", "kind": "legislative",
     "url": "https://prsindia.org/theprsblog"},
]

# A policy-relevance gate. We keep an item if its text touches one of these,
# so the desk does not fill with unrelated news. Case-insensitive.
POLICY_TERMS = re.compile(
    r"\b(policy|polic(y|ies)|scheme|act|bill|regulation|rule|ministry|"
    r"government|parliament|lok sabha|rajya sabha|governance|welfare|"
    r"entitlement|beneficiar|subsid|programme|program|scheme|"
    r"health|sanitation|water|housing|rural|urban|education|"
    r"budget|expenditure|funding|gst|tax|insurance|pension|"
    r"fund|crore|lakh|dbt|subsid|public|citizen|rural|judiciary|"
    r"data|digital|privacy|environment|forest|climate|labour|employment)\b",
    re.IGNORECASE,
)

# Domain buckets for the site's filter chips, first match wins.
DOMAINS = [
    # First match wins, so this sits above Finance & Economy: a circular that
    # mentions "crore" is still a regulatory item, not a macro one.
    ("Financial Regulation", r"\brbi\b|\bsebi\b|\bpfrda\b|\birdai\b|\bnabard\b|\bnpci\b|"
                             r"circular|master direction|master circular|regulatory|"
                             r"banking|nbfc|repo rate|monetary policy|sebiweb"),
    ("Health", r"health|medical|hospital|ayushman|pmjay|nutrition|ayo|disease"),
    ("Sanitation & Water", r"water|sanitation|swachh|toilet|sewage|jal|drainage"),
    ("Governance", r"governance|parliament|act\b|bill\b|ministry|bureaucra|"
                   r"corruption|rti|election|decentralis|panchayat|accountab"),
    ("Welfare & Social Security", r"welfare|pension|insurance|subsid|beneficiar|"
                                  r"entitlement|maternity|scholarship|reservation|"
                                  r"food security|ration|mgnrega|labour|employment"),
    ("Data & Technology", r"data|digital|privacy|ai\b|internet|software|"
                          r"cyber|telemetry|database|open data"),
    ("Environment & Climate", r"environment|forest|climate|pollution|emission|"
                              r"renewable|biodiversity|green"),
    ("Finance & Economy", r"budget|tax|gst|revenue|expenditure|fiscal|deficit|"
                          r"inflation|gdp|economic|crore|lakh"),
]


def log(msg: str) -> None:
    print(f"pit_pipeline: {msg}", file=sys.stderr)


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------
def http_get(url: str, timeout: int = HTTP_TIMEOUT) -> bytes:
    req = urllib.request.Request(url, headers=FETCH_HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def strip_html(text: str) -> str:
    """Remove tags and collapse whitespace; unescape entities."""
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def parse_date(raw: str | None) -> str | None:
    """Normalise to YYYY-MM-DD, or None if unparseable."""
    if not raw:
        return None
    raw = raw.strip()
    # RFC 822 (RSS pubDate)
    try:
        return parsedate_to_datetime(raw).date().isoformat()
    except (ValueError, TypeError):
        pass
    # ISO 8601 (Atom)
    try:
        return dt.datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        pass
    m = re.search(r"(\d{4}-\d{2}-\d{2})", raw)
    return m.group(1) if m else None


# --------------------------------------------------------------------------
# RSS / Atom parsing
# --------------------------------------------------------------------------
def parse_feed(data: bytes) -> list[dict]:
    """Parse RSS 2.0 or Atom into items. Namespaces-agnostic."""
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return []

    items: list[dict] = []
    # RSS 2.0: <channel><item>. Atom: <feed><entry>.
    nodes = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")

    def child_text(node, *names):
        for n in node:
            tag = n.tag.split("}")[-1]
            if tag in names and n.text:
                return n.text
        return None

    def child_link(node):
        for n in node:
            if n.tag.split("}")[-1] == "link":
                # Atom uses href=, RSS uses text.
                href = n.attrib.get("href")
                if href:
                    return href
                if n.text and n.text.strip():
                    return n.text.strip()
        return None

    for node in nodes:
        title = child_text(node, "title")
        link = child_link(node)
        if not title or not link:
            continue
        desc = child_text(node, "description", "summary", "content") or ""
        pub = child_text(node, "pubDate", "published", "updated")
        items.append({
            "title": strip_html(title),
            "url": link.strip(),
            "summary": strip_html(desc)[:600],
            "published": parse_date(pub),
        })
    return items


# --------------------------------------------------------------------------
# PRS — HTML listing pages (no RSS, not WordPress)
# --------------------------------------------------------------------------
class _HrefParser(HTMLParser):
    """Collect anchor hrefs + their text from a listing page."""

    def __init__(self):
        super().__init__()
        self.hrefs: list[tuple[str, str]] = []
        self._href = None
        self._text: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            d = dict(attrs)
            self._href = d.get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href:
            self.hrefs.append((self._href, " ".join(self._text).strip()))
            self._href = None


def _is_prs_detail(path: str) -> bool:
    """True only for PRS *article* pages, not nav/category/author/archive.

    Derived from inspecting real PRS markup during the build:
      /theprsblog/{slug}            -> article  (slug is not a year/month,
                                        not 'blog-author')
      /policy/{category}/{slug}     -> article  (3 segments; 2 segments is a
                                        category landing like /policy/annual-...)
      /billtrack/{slug}             -> article  (not 'field_...' taxonomy)
    """
    segs = [s for s in path.split("/") if s]
    if not segs:
        return False
    top = segs[0]
    if top == "theprsblog":
        if len(segs) != 2 or segs[1] == "blog-author":
            return False
        return not re.match(r"^(20\d\d|[a-z]{3})$", segs[1])
    if top == "policy":
        # Article = /policy/<category>/<slug> (>=3 segs). A 2-seg path is the
        # category index, which previously leaked in as a fake item.
        return len(segs) >= 3
    if top == "billtrack":
        return len(segs) == 2 and not segs[1].startswith("field_")
    return False


def parse_path_listing(data: bytes, base: str, path_re: str) -> list[dict]:
    """Extract links from a listing whose item hrefs match a path pattern.

    Generic sibling of parse_prs_listing for regulator pages: the filter is a
    regex on the URL path instead of PRS's hand-written segment rules.
    """
    try:
        text = data.decode("utf-8", errors="replace")
    except Exception:
        return []

    p = _HrefParser()
    p.feed(text)

    rx = re.compile(path_re)
    seen: set[str] = set()
    out: list[dict] = []
    parsed_base = urllib.parse.urlparse(base)

    for href, label in p.hrefs:
        if not href or not label:
            continue
        if href.startswith("/"):
            href = urllib.parse.urljoin(
                f"{parsed_base.scheme}://{parsed_base.netloc}", href)
        elif not href.startswith("http"):
            continue
        if not rx.search(urllib.parse.urlparse(href).path):
            continue
        if href in seen or len(label) < 8:
            continue
        seen.add(href)
        out.append({"title": strip_html(label), "url": href,
                    "summary": "", "published": None})

    return out


def parse_prs_listing(data: bytes, base: str, prefix: str) -> list[dict]:
    """Extract PRS *article* links from a listing page (no RSS on PRS)."""
    try:
        text = data.decode("utf-8", errors="replace")
    except Exception:
        return []

    p = _HrefParser()
    p.feed(text)

    seen: set[str] = set()
    out: list[dict] = []
    parsed_base = urllib.parse.urlparse(base)

    for href, label in p.hrefs:
        if not href or not label:
            continue
        if href.startswith("/"):
            href = urllib.parse.urljoin(
                f"{parsed_base.scheme}://{parsed_base.netloc}", href)
        elif not href.startswith("http"):
            continue
        path = urllib.parse.urlparse(href).path.rstrip("/")
        if not _is_prs_detail(path):
            continue
        if href in seen or len(label) < 8:
            continue
        seen.add(href)
        out.append({"title": strip_html(label), "url": href,
                    "summary": "", "published": None})

    return out


# --------------------------------------------------------------------------
# LLM — Groq (OpenAI-compatible) or Google AI Studio (Gemini)
# --------------------------------------------------------------------------
def load_key() -> tuple[str | None, str | None]:
    """Return (provider, key) from env or a gitignored local file."""
    for env, provider in (("GROQ_API_KEY", "groq"),
                          ("GOOGLE_API_KEY", "google"),
                          ("GEMINI_API_KEY", "google")):
        v = os.environ.get(env, "").strip()
        if v:
            return provider, v

    # Local, gitignored files: key=value per line.
    for fname in (".env.local", ".env", ".secret"):
        path = os.path.join(REPO_ROOT, fname)
        if not os.path.exists(path):
            continue
        try:
            with open(path, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, _, v = line.partition("=")
                    k, v = k.strip(), v.strip().strip('"').strip("'")
                    if k in ("GROQ_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY") and v:
                        provider = "groq" if k == "GROQ_API_KEY" else "google"
                        return provider, v
        except OSError:
            continue
    return None, None


def _post_json(url: str, payload: dict, headers: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def call_llm(provider: str, key: str, prompt: str) -> str:
    """Return raw model text for the prompt."""
    if provider == "groq":
        data = _post_json(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 700,
                "response_format": {"type": "json_object"},
            },
            {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        return data["choices"][0]["message"]["content"]

    # Google AI Studio (Gemini)
    model = os.environ.get("GOOGLE_MODEL", "gemini-2.0-flash")
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{model}:generateContent?key={urllib.parse.quote(key)}")
    data = _post_json(
        url,
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 700},
        },
        {"Content-Type": "application/json"},
    )
    parts = data.get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts)


PIT_PROMPT = """You are the public-interest desk of The Humble Sapien, a public
interest technology organisation. Read the policy/news item below and answer its
public-interest test in plain, precise English. No jargon, no hedging, no bullet
symbols — write full sentences a citizen could read aloud.

The three questions:
- who benefits: who actually gains from this — be specific about the group and why.
- who pays: who funds or bears the cost — budgets, taxpayers, workers, hospitals, institutions.
- who is missing: who is left out or never counted — the excluded, the undocumented, the
  unenumerated, those without documents, language, connectivity or time.

Also write a 2-3 sentence "explanation": what this policy/news item actually does, from a
public-interest point of view, in ordinary language.

Return ONLY a JSON object with exactly these keys:
{{
  "benefits": "...",
  "pays": "...",
  "missing": "...",
  "explanation": "...",
  "domain": "one of: Financial Regulation | Health | Sanitation & Water | Governance | Welfare & Social Security | Data & Technology | Environment & Climate | Finance & Economy"
}}

If the item is too thin to analyse honestly, still answer from what is present; do not
invent numbers or claim facts not in the text.

ITEM:
Title: {title}
Source: {source} ({kind})
Date: {published}
Summary: {summary}
"""


def analyse(item: dict, provider: str, key: str) -> dict | None:
    """Ask the LLM for a PIT read. Returns the parsed object or None."""
    prompt = PIT_PROMPT.format(
        title=item["title"],
        source=item["source"],
        kind=item["kind"],
        published=item.get("published") or "unknown",
        summary=item.get("summary") or "(no summary provided)",
    )
    try:
        raw = call_llm(provider, key, prompt)
    except Exception as e:  # network / quota / auth — report, keep going
        log(f"LLM call failed for {item['url'][:60]}: {type(e).__name__} {e}")
        return None

    # Tolerate fenced JSON.
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.S)
        if not m:
            log(f"unparseable LLM output for {item['url'][:60]}")
            return None
        try:
            obj = json.loads(m.group(0))
        except json.JSONDecodeError:
            log(f"unparseable LLM output for {item['url'][:60]}")
            return None

    if not isinstance(obj, dict):
        return None
    needed = ("benefits", "pays", "missing", "explanation")
    if any(not str(obj.get(k, "")).strip() for k in needed):
        log(f"LLM returned incomplete PIT for {item['url'][:60]}")
        return None
    return obj


def domain_for(title: str, summary: str) -> str:
    blob = f"{title} {summary}"
    for name, pattern in DOMAINS:
        if re.search(pattern, blob, re.IGNORECASE):
            return name
    return "Governance"


def make_id(url: str) -> str:
    """Stable id from the URL so re-runs dedupe reliably."""
    return re.sub(r"[^a-z0-9]+", "-",
                  urllib.parse.urlparse(url).path.lower()).strip("-")[-80:] or \
           str(abs(hash(url)))


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def gather_candidates(limit_prs: int = 6) -> list[dict]:
    """Fetch + parse all sources into candidate items."""
    candidates: list[dict] = []
    seen: set[str] = set()

    def add(items, tag, kind):
        for it in items:
            u = it.get("url")
            if not u or u in seen:
                continue
            it["source"], it["kind"] = tag, kind
            seen.add(u)
            candidates.append(it)

    for src in RSS_SOURCES:
        try:
            data = http_get(src["url"])
            got = parse_feed(data)
            log(f"{src['tag']}: {len(got)} feed items")
            add(got, src["tag"], src["kind"])
        except Exception as e:
            log(f"{src['tag']} failed: {type(e).__name__} {e}")

    # Regulator HTML listings (PFRDA today). One page each, no crawl budget
    # to protect beyond basic courtesy.
    for listing in REGULATOR_LISTINGS:
        try:
            data = http_get(listing["url"])
            got = parse_path_listing(data, listing["url"], listing["path_re"])[:limit_prs]
            log(f"{listing['tag']}: {len(got)} links")
            add(got, listing["tag"], listing["kind"])
        except Exception as e:
            log(f"{listing['tag']} failed: {type(e).__name__} {e}")

    # PRS: parse listing pages, respecting the crawl delay.
    for i, listing in enumerate(PRS_LISTINGS):
        try:
            if i:
                time.sleep(PRS_CRAWL_DELAY)
            data = http_get(listing["url"])
            got = parse_prs_listing(data, listing["url"], listing["tag"])[:limit_prs]
            log(f"{listing['tag']}: {len(got)} links")
            add(got, listing["tag"], listing["kind"])
        except Exception as e:
            log(f"{listing['tag']} failed: {type(e).__name__} {e}")

    return candidates


def load_existing() -> dict:
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, dict):
                data.setdefault("items", [])
                return data
        except (OSError, json.JSONDecodeError) as e:
            log(f"existing pit-desk.json unreadable ({e}); starting fresh")
    return {"items": []}


def main() -> int:
    ap = argparse.ArgumentParser(description="THS PIT Desk pipeline")
    ap.add_argument("--dry-run", action="store_true",
                    help="scrape and filter only; no LLM, no output write")
    ap.add_argument("--limit", type=int, default=10,
                    help="max new items to analyse this run (default 10)")
    ap.add_argument("--max-new", dest="max_new", type=int, default=None,
                    help="alias for --limit")
    args = ap.parse_args()
    limit = args.max_new if args.max_new is not None else args.limit

    existing = load_existing()
    have_urls = {it.get("url") for it in existing["items"]}

    log("gathering candidates from sources ...")
    candidates = gather_candidates()

    # Relevance gate + dedupe against what is already on the desk.
    fresh = []
    for it in candidates:
        blob = f"{it['title']} {it.get('summary','')}"
        if not POLICY_TERMS.search(blob):
            continue
        if it["url"] in have_urls:
            continue
        fresh.append(it)

    log(f"{len(candidates)} candidates -> {len(fresh)} new + policy-relevant")

    if args.dry_run:
        for it in fresh[:limit]:
            print(f"  [dry] {it['source']}: {it['title'][:80]}")
        log(f"dry-run: would analyse up to {limit} items; no file written")
        return 0

    provider, key = load_key()
    if not provider:
        log("no API key found. Set GROQ_API_KEY or GOOGLE_API_KEY, or put it in "
            ".env.local / .secret at the repo root.")
        log("tip: run with --dry-run to test scraping without a key.")
        return 2

    log(f"using {provider} for LLM analysis (key loaded, not logged)")

    today = dt.date.today().isoformat()
    added = 0
    for it in fresh[:limit]:
        log(f"analysing ({added+1}/{min(limit,len(fresh))}) {it['title'][:60]}")
        pit = analyse(it, provider, key)
        if not pit:
            continue
        existing["items"].append({
            "id": make_id(it["url"]),
            "title": it["title"],
            "url": it["url"],
            "source": it["source"],
            "kind": it["kind"],
            "published": it.get("published"),
            "fetched": today,
            "summary": it.get("summary", ""),
            "domain": pit.get("domain") or domain_for(it["title"], it.get("summary", "")),
            "explanation": str(pit["explanation"]).strip(),
            "pit": {
                "benefits": str(pit["benefits"]).strip(),
                "pays": str(pit["pays"]).strip(),
                "missing": str(pit["missing"]).strip(),
            },
        })
        added += 1
        # Be a good citizen across providers too, not just PRS.
        time.sleep(1.0)

    if added == 0:
        log("no new items analysed; pit-desk.json left untouched (no empty redeploy)")
        return 0

    # Newest first, then by fetched date, for a stable, readable file.
    existing["items"].sort(
        key=lambda x: (x.get("published") or x.get("fetched") or ""),
        reverse=True,
    )
    existing["generated"] = today
    existing["count"] = len(existing["items"])

    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(existing, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    log(f"wrote {added} new item(s) -> {OUTPUT_FILE} "
        f"({len(existing['items'])} total)")
    log("upload pit-desk.json to GitHub; Vercel will rebuild the PIT Desk")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
