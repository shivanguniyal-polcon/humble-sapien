#!/usr/bin/env python3
"""Data Point build: fetch the primary sources, extract them, sample them.

The article this builds is a claim about language: how hard Indian AI and
data policy is to read, and how closely it is drafted to policy written in
the Global North and the Global South. A claim like that is only worth
printing if the corpus can be re-derived by someone else, so this script
does the whole of it and writes the receipts alongside the numbers.

    python3 scripts/datapoint_build.py            # fetch + extract
    python3 scripts/datapoint_build.py --check    # only report what resolves

Outputs
    articles/datapoint-ai-policy-readability/data/corpus.json
    articles/datapoint-ai-policy-readability/data/receipts.md

Method, stated once so it can be argued with
    1. Fetch the document named in SOURCES, from the publisher's own domain.
    2. Extract text: pypdf for PDF, BeautifulSoup for HTML, and the EUR-Lex
       Cellar XHTML structure for the two EU regulations (Article headings are
       marked up, so articles can be split exactly rather than guessed).
    3. Clean: de-hyphenate across line breaks, drop page furniture, drop
       enumerators such as "(1)" and "(a)" that are not words.
    4. Split into provisions at headings, and drop the ones that are not
       operative text: contents pages, definitions, glossaries, schedules,
       annexes, bibliographies, indexes, prefaces.
    5. Sample: keep provisions in document order at a fixed stride until a
       word budget is reached, so every instrument contributes a comparable
       amount of text spread across the whole document.

Every step is applied identically to every instrument in the corpus, and the
corpus JSON carries the URL, the publisher and the retrieval date for each.
"""

import argparse
import hashlib
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import date

try:
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover
    sys.exit("beautifulsoup4 is required: python3 -m pip install beautifulsoup4 lxml pypdf")

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    sys.exit("pypdf is required: python3 -m pip install pypdf")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "articles", "datapoint-ai-policy-readability", "data")
CACHE = os.path.join(ROOT, "scripts", ".cache", "datapoint")
# Drop a publisher's PDF or HTML in here, named after the instrument id
# (for example eu-ai-act-2024.pdf), and the build will use it instead of
# fetching. EUR-Lex in particular refuses scripted clients, so the two EU
# regulations are easier to supply by hand than to fetch.
SOURCE_DIR = os.path.join(ROOT, "articles", "datapoint-ai-policy-readability", "sources")

# Word budget per instrument. Big enough that Flesch and the cosine
# similarities have stopped moving (checked: 6k and 8k agree to 0.1 Flesch
# points and 0.005 cosine), small enough that the corpus stays a readable
# size on disk.
WORD_BUDGET = 8000

# A provision heading that means "this part is not operative text".
DROP_HEADING = re.compile(
    r"\b(table of contents|contents|list of (figures|tables|abbreviations)|"
    r"definitions?|interpretation|glossary|abbreviations|acronyms|"
    r"short title|commencement|references?|bibliography|annex|appendix|"
    r"schedules?|foreword|preface|acknowledg|index|"
    r"chapter [ivxlc]+$|part [ivxlc]+$)",
    re.I,
)

# Page furniture: running heads, footers, gazette lines, print marks.
DROP_LINE = re.compile(
    r"^(\s*$|\s*[-–—•\s]*\d+[-–—\s]*|\s*page \d+.*|\s*www\.\S+.*|"
    r"\s*Chapter [IVXLC]+\s*$|\s*PART [IVXLC]+\s*$|"
    r"\s*Printed by.*|\s*STATUTORY RULES.*|\s*MINISTRY OF LAW.*|"
    r"\s*New Delhi, the .*|\s*\d+\s*/\s*\d+\s*/\s*\d+\s*$|"
    r"\s*Form\s*-?\s*\d*\s*$|\s*The Gazette of India.*|\s*E\.\s*S\.\s*$|"
    r"\s*STAATSKOERANT.*|\s*This gazette is also available.*|"
    r"\s*\d+\s*\|\s*Page \d+.*)",
    re.I,
)

# Enumerators and legal list markers: not words, but they count as words in
# a whitespace split, and they wreck both readability and similarity.
ENUMERATOR = re.compile(r"\(\s*(?:[a-zA-Z]|[ivxlcIVXLC]{1,5}|\d{1,3})\s*\)")
DASH_ENUM = re.compile(r"(?<=[\s;—–])\((?:[a-zA-Z]|\d{1,3})\)")

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# --------------------------------------------------------------------------
# The corpus. region: india | north | south. genre drives the confound
# control later: comparing a statute to a strategy measures genre, not
# region, so the analysis compares like with like as well as pooled.
# --------------------------------------------------------------------------
SOURCES = [
    # ------------------------------- India --------------------------------
    dict(
        id="in-dpdp-act-2023",
        title="Digital Personal Data Protection Act, 2023",
        short="DPDP Act, 2023",
        jurisdiction="India",
        region="india",
        genre="statute",
        year=2023,
        status="In force (Act 22 of 2023; rules notified November 2025)",
        publisher="Parliament of India / MeitY",
        kind="pdf",
        urls=[
            "https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf",
            "https://www.indiacode.nic.in/bitstream/123456789/2056/1/A2023-22.pdf",
        ],
    ),
    dict(
        id="in-dpdp-rules-2025",
        title="Digital Personal Data Protection Rules, 2025",
        short="DPDP Rules, 2025",
        jurisdiction="India",
        region="india",
        genre="rules",
        year=2025,
        status="Notified 14 November 2025",
        publisher="MeitY, Government of India",
        kind="pdf",
        urls=[
            "https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf",
            "https://www.meity.gov.in/static/uploads/2025/11/DPDP-Rules-2025.pdf",
        ],
    ),
    dict(
        id="in-it-act-2000",
        title="Information Technology Act, 2000",
        short="IT Act, 2000",
        jurisdiction="India",
        region="india",
        genre="statute",
        year=2000,
        status="In force, as amended",
        publisher="MeitY, Government of India",
        kind="pdf",
        urls=[
            "https://www.meity.gov.in/static/uploads/2024/02/Information-Technology-Act-2000.pdf"
        ],
    ),
    dict(
        id="in-niti-rai-2021",
        title="Approach Document for India, Part 1: Responsible AI for All",
        short="NITI Aayog RAI, 2021",
        jurisdiction="India",
        region="india",
        genre="strategy",
        year=2021,
        status="Approach document (not law)",
        publisher="NITI Aayog, Government of India",
        kind="pdf",
        urls=[
            "https://www.niti.gov.in/sites/default/files/2021-02/Responsible-AI-22022021.pdf",
            "https://www.niti.gov.in/sites/default/files/2021-12/Approach-Document-for-India-Part-1.pdf",
        ],
    ),
    dict(
        id="in-ai-guidelines-2025",
        title="India AI Governance Guidelines",
        short="AI Governance Guidelines, 2025",
        jurisdiction="India",
        region="india",
        genre="guideline",
        year=2025,
        status="Published November 2025 (not law)",
        publisher="MeitY, Government of India",
        kind="pdf",
        urls=[
            "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc2025115685601.pdf",
            "https://www.meity.gov.in/static/uploads/2025/11/India-AI-Governance-Guidelines.pdf",
        ],
    ),
    dict(
        id="in-indiaai-2024",
        title="IndiaAI Mission (Union Cabinet approval)",
        short="IndiaAI Mission, 2024",
        jurisdiction="India",
        region="india",
        genre="programme",
        year=2024,
        status="Union Cabinet approval, March 2024",
        publisher="Press Information Bureau, Government of India",
        kind="html",
        urls=["https://pib.gov.in/PressReleasePage.aspx?PRID=2012375"],
    ),
    # ---------------------------- Global North ----------------------------
    dict(
        id="eu-ai-act-2024",
        title="Regulation (EU) 2024/1689 (Artificial Intelligence Act)",
        short="EU AI Act, 2024",
        jurisdiction="European Union",
        region="north",
        genre="regulation",
        year=2024,
        status="In force; obligations phasing in from 2025",
        publisher="Official Journal of the European Union",
        kind="eu_xhtml",
        urls=["https://publications.europa.eu/resource/celex/32024R1689"],
    ),
    dict(
        id="eu-gdpr-2016",
        title="Regulation (EU) 2016/679 (General Data Protection Regulation)",
        short="EU GDPR, 2016",
        jurisdiction="European Union",
        region="north",
        genre="regulation",
        year=2016,
        status="In force",
        publisher="Official Journal of the European Union",
        kind="eu_xhtml",
        urls=["https://publications.europa.eu/resource/celex/32016R0679"],
    ),
    dict(
        id="us-aap-2025",
        title="America's AI Action Plan",
        short="US AI Action Plan, 2025",
        jurisdiction="United States",
        region="north",
        genre="strategy",
        year=2025,
        status="Published July 2025",
        publisher="The White House",
        kind="pdf",
        urls=["https://www.whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf"],
    ),
    dict(
        id="us-eo-14179",
        title="Executive Order 14179: Removing Barriers to American Leadership in Artificial Intelligence",
        short="US EO 14179, 2025",
        jurisdiction="United States",
        region="north",
        genre="executive order",
        year=2025,
        status="In force",
        publisher="The White House",
        kind="html",
        urls=[
            "https://www.whitehouse.gov/presidential-actions/2025/01/removing-barriers-to-american-leadership-in-artificial-intelligence/"
        ],
    ),
    dict(
        id="us-nist-rmf-2023",
        title="Artificial Intelligence Risk Management Framework (AI RMF 1.0)",
        short="NIST AI RMF, 2023",
        jurisdiction="United States",
        region="north",
        genre="framework",
        year=2023,
        status="Published January 2023",
        publisher="National Institute of Standards and Technology",
        kind="pdf",
        urls=["https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf"],
    ),
    dict(
        id="uk-ai-whitepaper-2023",
        title="AI regulation: a pro-innovation approach (policy proposals)",
        short="UK AI policy proposals, 2023",
        jurisdiction="United Kingdom",
        region="north",
        genre="policy paper",
        year=2023,
        status="Published February 2023 (consultation)",
        publisher="Department for Science, Innovation and Technology, UK",
        kind="html",
        urls=[
            "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach/white-paper",
            "https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach",
        ],
    ),
    dict(
        id="jp-ai-act-2025",
        title="Act on the Promotion of Research, Development and Utilization of Artificial Intelligence-Related Technology (Act No. 53 of 2025)",
        short="Japan AI Promotion Act, 2025",
        jurisdiction="Japan",
        region="north",
        genre="statute",
        year=2025,
        status="In force (promotion statute, not a regulator)",
        publisher="Ministry of Justice, Japan (Japanese Law Translation)",
        kind="html",
        urls=["https://www.japaneselawtranslation.go.jp/en/laws/view/5066/en"],
    ),
    dict(
        id="ca-c27-2022",
        title="Bill C-27: Digital Charter Implementation Act",
        short="Canada C-27, 2022",
        jurisdiction="Canada",
        region="north",
        genre="bill",
        year=2022,
        status="Bill; not enacted",
        publisher="Parliament of Canada",
        kind="html",
        urls=["https://www.parl.ca/documentviewer/en/44-1/bill/C-27/first-reading"],
    ),
    dict(
        id="sg-maif-2020",
        title="Model Artificial Intelligence Governance Framework, Second Edition",
        short="Singapore MGF, 2020",
        jurisdiction="Singapore",
        region="north",
        genre="framework",
        year=2020,
        status="Published 2020 (voluntary framework)",
        publisher="Personal Data Protection Commission, Singapore",
        kind="pdf",
        urls=[
            "https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/resource-for-organisation/ai/sgmodelaigovframework2.pdf",
            "https://www.pdpc.gov.sg/files/2020-02/Model_AI_Governance_Framework.pdf",
        ],
    ),
    # ---------------------------- Global South ----------------------------
    dict(
        id="za-ai-policy-2026",
        title="Draft National Artificial Intelligence Policy",
        short="South Africa AI Policy, 2026",
        jurisdiction="South Africa",
        region="south",
        genre="draft policy",
        year=2026,
        status="Draft, published in the Government Gazette",
        publisher="Department of Communications and Digital Technologies, South Africa",
        kind="pdf",
        urls=["https://www.gov.za/sites/default/files/gcis_document/202604/54477gen3880.pdf"],
    ),
    dict(
        id="asean-ai-guide-2024",
        title="ASEAN Guide on AI Governance and Ethics",
        short="ASEAN AI Guide, 2024",
        jurisdiction="ASEAN (10 states)",
        region="south",
        genre="guideline",
        year=2024,
        status="Published January 2024 (non-binding)",
        publisher="ASEAN Secretariat",
        kind="pdf",
        urls=[
            "https://asean.org/wp-content/uploads/2024/02/ASEAN-Guide-on-AI-Governance-and-Ethics_beautified_201223_v2.pdf",
            "https://asean.org/wp-content/uploads/2024/01/ASEAN-Guide-on-AI-Governance-and-Ethics.pdf",
        ],
    ),
    dict(
        id="au-ai-strategy-2024",
        title="Continental Artificial Intelligence Strategy",
        short="AU AI Strategy, 2024",
        jurisdiction="African Union",
        region="south",
        genre="strategy",
        year=2024,
        status="Adopted July 2024 (strategy, not law)",
        publisher="African Union Commission",
        kind="pdf",
        urls=[
            "https://au.int/sites/default/files/documents/44004-doc-EN-_Continental_AI_Strategy_July_2024.pdf",
            "https://au.int/sites/default/files/documents/38595-doc-continental_ai_strategy.pdf",
        ],
    ),
    dict(
        id="ng-ai-strategy-2025",
        title="National Artificial Intelligence Strategy",
        short="Nigeria AI Strategy, 2025",
        jurisdiction="Nigeria",
        region="south",
        genre="strategy",
        year=2025,
        status="Published 2025 (strategy, not law)",
        publisher="National Centre for Artificial Intelligence, Nigeria",
        kind="pdf",
        urls=[
            "https://ncair.nitda.gov.ng/wp-content/uploads/2025/09/National-Artificial-Intelligence-Strategy-19092025.pdf",
            "https://ncair.gov.ng/wp-content/uploads/2025/04/Revised-Nigeria-Artificial-Intelligence-Strategy.pdf",
        ],
        insecure=True,
    ),
    dict(
        id="ke-ai-bill-2026",
        title="The Artificial Intelligence Bill, 2026 (Senate Bill No. 4)",
        short="Kenya AI Bill, 2026",
        jurisdiction="Kenya",
        region="south",
        genre="bill",
        year=2026,
        status="Before Parliament",
        publisher="Parliament of Kenya",
        kind="pdf",
        urls=[
            "https://libraryir.parliament.go.ke/bitstreams/9f97969f-f8f8-4532-bc0a-0239e19cffb7/download",
            "https://libraryir.parliament.go.ke/server/api/core/bitstreams/c05c7bf1-f8aa-4863-b077-2c2ceaa188f4/content",
        ],
    ),
    dict(
        id="ke-dpa-2019",
        title="Data Protection Act, 2019",
        short="Kenya DPA, 2019",
        jurisdiction="Kenya",
        region="south",
        genre="statute",
        year=2019,
        status="In force",
        publisher="National Council for Law Reporting, Kenya",
        kind="html",
        urls=["https://new.kenyalaw.org/akn/ke/act/2019/24/eng@2022-12-31"],
    ),
]

# Instruments that exist, are in scope, and are nonetheless left out of the
# scored corpus because their authoritative text is not in English. Flesch
# and TF-IDF are English-language instruments; running them on Portuguese or
# Indonesian measures the translator, not the law. They are recorded here so
# the exclusion is visible rather than silent.
NON_ENGLISH = [
    dict(
        id="br-lgpd-2018",
        title="Lei Geral de Protecao de Dados Pessoais (LGPD), Lei 13.709/2018",
        short="Brazil LGPD, 2018",
        jurisdiction="Brazil",
        region="south",
        genre="statute",
        year=2018,
        status="In force",
        publisher="Presidencia da Republica, Brazil",
        lang="pt",
        kind="html",
        urls=["https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm"],
    ),
    dict(
        id="br-pl2338-2023",
        title="PL 2338/2023 — the Brazilian AI bill",
        short="Brazil PL 2338, 2023",
        jurisdiction="Brazil",
        region="south",
        genre="bill",
        year=2023,
        status="Before the National Congress",
        publisher="Senado Federal, Brazil",
        lang="pt",
        kind="pdf",
        urls=[
            "https://legis.senado.leg.br/sdleg-getter/documento?disposition=inline&dm=9347622",
            "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=596",
        ],
    ),
    dict(
        id="id-uu27-2022",
        title="Undang-Undang Nomor 27 Tahun 2022 (Personal Data Protection)",
        short="Indonesia PDP Law, 2022",
        jurisdiction="Indonesia",
        region="south",
        genre="statute",
        year=2022,
        status="In force",
        publisher="JDIH Komdigi, Indonesia",
        lang="id",
        kind="html",
        urls=["https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang+nomor+27+tahun+2022"],
    ),
    dict(
        id="id-se9-2023",
        title="Surat Edaran Menteri Komunikasi dan Informatika Nomor 9 Tahun 2023 (AI ethics)",
        short="Indonesia AI circular, 2023",
        jurisdiction="Indonesia",
        region="south",
        genre="regulation",
        year=2023,
        status="In force",
        publisher="JDIH Komdigi, Indonesia",
        lang="id",
        kind="html",
        urls=[
            "https://jdih.komdigi.go.id/produk_hukum/view/id/883/t/surat+eddaran+menteri+komunikasi+dan+informatika+nomor+9+tahun+2023"
        ],
    ),
]


# --------------------------------------------------------------------------
# Fetch
# --------------------------------------------------------------------------
def cache_path(url):
    return os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest()[:16] + ".bin")


TIMEOUT = 25  # seconds per request; publishers here are slow but not glacial
ACCEPTS = [
    "application/xhtml+xml,application/xml;q=0.9,text/html;q=0.8,*/*;q=0.7",
    "application/pdf,text/html;q=0.8,*/*;q=0.7",
    "*/*",
]


def decompress_if_needed(data):
    """Some publishers (the Kenyan Parliament's library among them) answer
    with gzip-encoded bytes and no Content-Encoding header, which would
    otherwise arrive as a file that looks like a corrupt PDF."""
    if data[:2] == b"\x1f\x8b":
        try:
            import gzip

            return gzip.decompress(data)
        except Exception:  # noqa: BLE001
            return data
    return data


def fetch(url, insecure=False):
    """Return the bytes at `url`, or None. Cached on disk, so a second run
    of the build costs no network."""
    path = cache_path(url)
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        with open(path, "rb") as fh:
            return decompress_if_needed(fh.read())
    ctx = ssl.create_default_context()
    if insecure:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    for attempt in range(2):
        for accept in ACCEPTS:
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, "Accept": accept}
            )
            try:
                with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as resp:
                    data = resp.read()
                    encoding = (resp.headers.get("Content-Encoding") or "").lower()
                if encoding == "gzip" or data[:2] == b"\x1f\x8b":
                    data = decompress_if_needed(data)
                if len(data) > 2000:
                    os.makedirs(CACHE, exist_ok=True)
                    with open(path, "wb") as fh:
                        fh.write(data)
                    return data
            except Exception:
                continue
        time.sleep(1.0 * (attempt + 1))
    return None


def local_copy(src):
    """A hand-supplied copy in articles/.../sources, if there is one."""
    for ext in (".pdf", ".html", ".htm", ".txt", ".xhtml"):
        path = os.path.join(SOURCE_DIR, src["id"] + ext)
        if os.path.exists(path) and os.path.getsize(path) > 2000:
            with open(path, "rb") as fh:
                return fh.read(), path
    return None, None


def get_source(src, insecure=False):
    data, path = local_copy(src)
    if data:
        return data, path
    for url in src["urls"]:
        data = fetch(url, insecure=insecure)
        if data:
            return data, url
    return None, None


def prefetch_all(sources):
    """Fetch every candidate URL in parallel. One slow publisher must not
    hold the whole build up, and the fallback URLs for a source are worth
    having even when the first one works."""
    import concurrent.futures as cf

    jobs = []
    for src in sources:
        if local_copy(src)[0]:
            continue  # hand-supplied copy: no need to spend the network
        for url in src["urls"]:
            jobs.append((src["id"], url, src.get("insecure", False)))
    results = {}
    if not jobs:
        return results
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(fetch, url, insecure): (sid, url) for sid, url, insecure in jobs}
        for fut in cf.as_completed(futs):
            sid, url = futs[fut]
            try:
                data = fut.result()
            except Exception:
                data = None
            if data and sid not in results:
                results[sid] = (data, url)
    return results


# --------------------------------------------------------------------------
# Extract
# --------------------------------------------------------------------------
def extract_pdf(data):
    import io

    reader = PdfReader(io.BytesIO(data))
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return "\n".join(pages)


def extract_html(data):
    soup = BeautifulSoup(data, "lxml")
    # NB: do not decompose <form>. The Press Information Bureau wraps the
    # whole release in an ASP.NET postback form, and dropping forms drops
    # the release with it.
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    for tag in soup.find_all(class_=re.compile(r"(nav|menu|sidebar|cookie|share|related|breadcrumb)", re.I)):
        tag.decompose()
    return soup.get_text("\n")


def content_root(soup):
    """The part of the page that holds the document.

    Publisher pages wrap the text in menus, share widgets and "related
    links". The container that holds the most paragraph text is the
    document; the chrome around it is measured in list items and links,
    which do not count here."""
    paragraphs = soup.find_all("p")
    if not paragraphs:
        return soup

    def score(node):
        return sum(len(p.get_text(" ", strip=True)) for p in node.find_all("p"))

    candidates = []
    for selector in ("main", "article"):
        node = soup.find(selector)
        if node is not None:
            candidates.append(node)
    for p in paragraphs:
        if p.parent is not None:
            candidates.append(p.parent)
    for node in soup.find_all(["div", "section", "td"]):
        if len(node.find_all("p")) >= 3:
            candidates.append(node)

    best = None
    best_score = 0
    for node in candidates:
        value = score(node)
        if value > best_score:
            best_score = value
            best = node
    return best or soup


def extract_html_blocks(data):
    """HTML pages (a press release, an executive order) are read by their
    own markup: each heading opens a provision, the paragraphs under it are
    its text. Splitting on the markup is both more accurate and more
    honest than trying to spot headings in a wall of text."""
    soup = BeautifulSoup(data, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    for tag in soup.find_all(class_=re.compile(r"(navbar|sidebar|cookie|breadcrumb|tag-list|post-meta|pr-share|sticky-social)", re.I)):
        tag.decompose()
    root = content_root(soup)
    blocks = []
    heading = None
    body = []
    headings_seen = 0
    for el in root.find_all(["h1", "h2", "h3", "h4", "h5", "p", "li"]):
        text = el.get_text(" ", strip=True)
        if not text:
            continue
        if el.name in ("h1", "h2", "h3", "h4", "h5"):
            headings_seen += 1
            if heading is not None:
                blocks.append({"heading": heading, "text": " ".join(body)})
            heading = text
            body = []
        else:
            body.append(text)
    if heading is not None or body:
        blocks.append({"heading": heading or "Preamble", "text": " ".join(body)})
    paragraphs = []
    for el in root.find_all(["p", "li"]):
        text = el.get_text(" ", strip=True)
        if text:
            paragraphs.append(text)
    return {"blocks": blocks, "paragraphs": paragraphs, "headings": headings_seen}


# "Sec. 2. Policy." and "Section 1. Purpose." open a numbered section of
# an executive order or a bill.
SEC_RE = re.compile(r"^(?:Sec\.|Section)\s+(?P<num>\d+[a-z]?)\.\s*(?P<rest>.*)$", re.I)


def provisions_from_paragraphs(paragraphs):
    """Paragraph-level units, for documents that carry no section headings:
    a press release, for instance. Each paragraph is one unit."""
    return [{"heading": text[:90], "text": text} for text in paragraphs]


def extract_eu_xhtml(data):
    """EUR-Lex Cellar marks up the structure: `oj-ti-art` heads an Article,
    `oj-ti-rec` a recital, `oj-normal` is body text. Split on that markup
    rather than on patterns, so the Article numbers are exact."""
    provisions = []
    for parser in ("xml", "lxml"):
        try:
            soup = BeautifulSoup(data, parser)
        except Exception:  # noqa: BLE001
            continue
        body = soup.find("body") or soup
        found = []
        current = None
        for el in body.find_all(["p", "div"], recursive=True):
            if el.find(["p", "div"], recursive=False) is not None:
                continue
            raw_class = el.get("class")
            if raw_class is None:
                cls = ""
            elif isinstance(raw_class, str):
                cls = raw_class  # XML parser hands back a plain string
            else:
                cls = " ".join(raw_class)
            text = el.get_text(" ", strip=True)
            if not text:
                continue
            if "oj-ti-art" in cls or "oj-sti-art" in cls:
                if current:
                    found.append(current)
                current = {"heading": text, "text": []}
            elif current is not None:
                if "oj-ti-rec" in cls or "oj-note" in cls:
                    continue
                if "oj-ti-annex" in cls or "oj-ti-sec" in cls or "oj-ti-sub" in cls:
                    continue
                current["text"].append(text)
        if current:
            found.append(current)
        if len(found) > len(provisions):
            provisions = found
        if len(provisions) >= 10:
            break
    return [
        {"heading": p["heading"], "text": " ".join(p["text"])} for p in provisions
    ]


# --------------------------------------------------------------------------
# Clean
# --------------------------------------------------------------------------
def clean_lines(text):
    out = []
    for raw in text.split("\n"):
        line = raw.replace(" ", " ").replace("’", "'").replace("‘", "'")
        line = re.sub(r"[ \t]+", " ", line).strip()
        if not line:
            continue
        if DROP_LINE.match(line):
            continue
        # The Gazette PDFs embed the Hindi title in a legacy font that extracts
        # as mojibake. Those lines are not English, so they are not words.
        letters = sum(1 for c in line if c.isascii() and c.isalpha())
        if letters / max(1, len(line)) < 0.55:
            continue
        out.append(line)
    return out


def stitch(lines):
    """Join hard-wrapped lines, undo hyphenation at the break."""
    text = ""
    for line in lines:
        if not text:
            text = line
        elif text.endswith("-") and not text.endswith("--"):
            text = text[:-1] + line
        else:
            text = text + " " + line
    return text


def strip_enumerators(text):
    text = ENUMERATOR.sub(" ", text)
    text = DASH_ENUM.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


# Headings come in three shapes across the corpus.
#   "1. (1) This Act may be called ..."   a numbered section, body on the line
#   "3. Objectives"                        a numbered heading with a title
#   "Update Schedule and Versions"         a titled heading
NUM_HEADING = re.compile(r"^\s*(?P<num>\d{1,3}(?:\.\d{1,2})*)\.?\s+(?P<rest>\S.*)$")
ROMAN_RE = re.compile(r"^\s*(?P<num>[IVXLC]{1,6})\.?\s+(?P<title>\S.{0,150})$")
ARTICLE_RE = re.compile(r"^\s*Article\s+(?P<num>\d+[a-z]?)\s*$", re.I)
# Words allowed to stay lowercase inside a title.
TITLE_STOP = {
    "a", "an", "the", "of", "for", "and", "in", "on", "to", "with", "by",
    "from", "at", "as", "its", "it", "are", "is", "be", "that", "this", "or",
    "other", "new", "no", "not", "per", "via", "under", "into", "than",
}


def title_case(line):
    words = [w.strip(".,:;()[]'\u2019") for w in line.split()]
    words = [w for w in words if w]
    if not words:
        return False
    strong = 0
    for w in words:
        if w.lower() in TITLE_STOP:
            continue
        if w[0].isupper() or w.isupper() or any(c.isdigit() for c in w):
            strong += 1
    return strong >= max(1, len(words) - 2)


def looks_like_heading(line):
    words = line.split()
    if not (1 <= len(words) <= 14):
        return False
    if len(line) > 110:
        return False
    if line.endswith((",", ";", ":", ".")):
        return False
    if line[0].islower():
        return False
    return title_case(line)


# A marginal title: India Code prints the section's name under the section
# text, e.g. "Short title and" / "commencement."
MARGINAL = re.compile(r"^[A-Z][A-Za-z0-9 ,'()/-]{0,70}\.$")


def take_marginal(body_lines):
    """Pull the marginal title off the end of a section, if there is one."""
    for i in range(len(body_lines) - 1, max(-1, len(body_lines) - 5), -1):
        line = body_lines[i].strip()
        if MARGINAL.match(line) and title_case(line.rstrip(".")):
            words = line.split()
            if 1 <= len(words) <= 9:
                title = line
                if i > 0:
                    prev = body_lines[i - 1].strip()
                    if (
                        prev
                        and len(prev.split()) <= 4
                        and prev[0].isupper()
                        and not prev.endswith((".", ",", ";", ":"))
                    ):
                        title = f"{prev} {title}"
                        body_lines = body_lines[: i - 1] + body_lines[i + 1 :]
                    else:
                        body_lines = body_lines[:i] + body_lines[i + 1 :]
                return title, body_lines
    return None, body_lines


def split_provisions(lines):
    """Split cleaned lines into (heading, text) provisions.

    Documents in this corpus are laid out three different ways, so the
    splitter looks for all three and falls back to paragraphs."""
    marks = []
    for i, line in enumerate(lines):
        if len(line) > 300:
            continue
        m = ARTICLE_RE.match(line)
        if m:
            marks.append({"i": i, "kind": "art", "num": m.group("num"), "title": None, "rest": ""})
            continue
        m = SEC_RE.match(line)
        if m:
            rest = m.group("rest")
            title = rest.split(". ")[0] if len(rest.split(". ")[0].split()) <= 9 else None
            body = rest[len(title) :].strip().lstrip(". ") if title else rest
            marks.append(
                {
                    "i": i,
                    "kind": "num",
                    "num": m.group("num"),
                    "title": title,
                    "rest": body,
                }
            )
            continue
        m = NUM_HEADING.match(line)
        if m and not m.group("num").startswith("0"):
            rest = m.group("rest")
            # A short remainder is a title ("3. Objectives"); a long one is
            # the section's own text ("1. (1) This Act may be called ...").
            if len(rest.split()) <= 9 and not rest.endswith("."):
                marks.append({"i": i, "kind": "num", "num": m.group("num"), "title": rest, "rest": ""})
            else:
                marks.append({"i": i, "kind": "num", "num": m.group("num"), "title": None, "rest": rest})
            continue
        if looks_like_heading(line):
            marks.append({"i": i, "kind": "title", "num": None, "title": line, "rest": ""})

    # Merge runs of consecutive headings: "CHAPTER I" then "PRELIMINARY".
    merged = []
    for mk in marks:
        if merged and mk["i"] == merged[-1]["i"] + 1 and merged[-1]["kind"] == "title":
            merged[-1]["title"] = f"{merged[-1]['title']} {mk['title']}"
            continue
        merged.append(mk)

    if len(merged) < 3:
        text = stitch(lines)
        chunks = [c.strip() for c in re.split(r"\n{2,}", text) if c.strip()]
        if len(chunks) < 3:
            chunks = [text]
        return [{"heading": f"¶{i + 1}", "text": c} for i, c in enumerate(chunks)]

    provisions = []
    for idx, mk in enumerate(merged):
        end = merged[idx + 1]["i"] if idx + 1 < len(merged) else len(lines)
        body_lines = list(lines[mk["i"] + 1 : end])
        if mk["rest"]:
            body_lines = [mk["rest"]] + body_lines
        if mk["kind"] == "num":
            heading = f"Section {mk['num']}"
            if mk["title"]:
                heading = f"{heading} \u2014 {mk['title']}"
        elif mk["kind"] == "art":
            heading = mk["num"]
        else:
            heading = mk["title"]
        if mk["kind"] == "num" and mk["title"] is None:
            marginal, body_lines = take_marginal(body_lines)
            if marginal:
                heading = f"{heading} \u2014 {marginal}"
        provisions.append({"heading": heading, "text": stitch(body_lines)})
    return provisions


def is_tabley(text):
    words = text.split()
    if not words:
        return True
    if len(words) < 25:
        return True
    table_markers = sum(1 for w in words if w in {"|", "—", "–", "·", "•"})
    return table_markers > len(words) * 0.08


def prepare(src, data):
    """Return the cleaned provision list for one source."""
    kind = src["kind"]
    if kind == "pdf":
        raw = extract_pdf(data)
        lines = clean_lines(raw)
        provisions = split_provisions(lines)
    elif kind == "eu_xhtml":
        raw = extract_eu_xhtml(data)
        provisions = []
        for p in raw:
            body_lines = clean_lines(p["text"])
            if not body_lines:
                continue
            provisions.append(
                {"heading": p["heading"], "text": stitch(body_lines)}
            )
        if len(provisions) < 3:
            # Not the Cellar markup after all: fall back to the generic
            # HTML reader and split the regulation into its articles.
            parsed = extract_html_blocks(data)
            alt = []
            for p in provisions_from_paragraphs(parsed["paragraphs"]):
                body_lines = clean_lines(p["text"])
                if not body_lines:
                    continue
                alt.append({"heading": p["heading"], "text": stitch(body_lines)})
            if len(alt) > len(provisions):
                provisions = alt
    else:
        parsed = extract_html_blocks(data)
        candidates = []
        # Reading 1: the page's own headings, each with the text under it.
        by_heading = []
        for b in parsed["blocks"]:
            lines = clean_lines(b["text"])
            if not lines:
                continue
            by_heading.append({"heading": b["heading"] or "Preamble", "text": stitch(lines)})
        candidates.append(by_heading)
        # Reading 2: the paragraphs themselves, for documents with no
        # section headings (a press release, an executive order).
        by_paragraph = []
        for p in provisions_from_paragraphs(parsed["paragraphs"]):
            lines = clean_lines(p["text"])
            if not lines:
                continue
            by_paragraph.append({"heading": p["heading"], "text": stitch(lines)})
        candidates.append(by_paragraph)
        # Reading 3: the text on its own, split by the section markers.
        candidates.append(split_provisions(clean_lines(extract_html(data))))
        # Keep whichever reading leaves the most operative provisions.
        provisions = max(candidates, key=len)

    kept = []
    dropped = 0
    for p in provisions:
        heading = p.get("heading", "")
        text = p.get("text", "")
        if DROP_HEADING.search(heading):
            dropped += 1
            continue
        text = strip_enumerators(text)
        if not text or is_tabley(text):
            dropped += 1
            continue
        kept.append({"heading": heading.strip(), "text": text})
    return kept, dropped


def sample_provisions(provisions, budget=WORD_BUDGET):
    """Keep provisions in document order at a fixed stride until the word
    budget is reached. The stride means the sample spans the whole document
    instead of only its opening, and it is the same rule for every
    instrument."""
    counts = [len(p["text"].split()) for p in provisions]
    total = sum(counts)
    if total <= budget:
        return provisions, 1
    stride = max(1, round(total / budget))
    out = []
    words = 0
    for i, p in enumerate(provisions):
        if i % stride:
            continue
        out.append(p)
        words += counts[i]
        if words >= budget:
            break
    return out, stride


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------
def build():
    today = date.today().isoformat()
    instruments = []
    failures = []
    prefetched = prefetch_all(SOURCES + NON_ENGLISH)
    for src in SOURCES:
        hit = prefetched.get(src["id"])
        local = local_copy(src)
        if local and local[0]:
            data, url = local
        elif hit:
            data, url = hit
        else:
            data, url = get_source(src, insecure=src.get("insecure", False))
        if not data:
            failures.append((src["id"], "no URL resolved"))
            print(f"  MISS  {src['id']}", flush=True)
            continue
        try:
            provisions, dropped = prepare(src, data)
        except Exception as exc:  # noqa: BLE001
            failures.append((src["id"], f"extract failed: {exc}"))
            print(f"  ERR   {src['id']}: {exc}", flush=True)
            continue
        if len(provisions) < 3:
            failures.append((src["id"], f"only {len(provisions)} provisions"))
            print(f"  THIN  {src['id']} ({len(provisions)} provisions)", flush=True)
            continue
        sampled, stride = sample_provisions(provisions)
        words = sum(len(p["text"].split()) for p in sampled)
        record = {
            "id": src["id"],
            "title": src["title"],
            "short": src["short"],
            "jurisdiction": src["jurisdiction"],
            "region": src["region"],
            "genre": src["genre"],
            "year": src["year"],
            "status": src["status"],
            "publisher": src["publisher"],
            "url": url,
            "retrieved": today,
            "words": words,
            "provisionsFound": len(provisions),
            "provisionsDropped": dropped,
            "stride": stride,
            "provisions": [
                {"heading": p["heading"], "text": p["text"], "words": len(p["text"].split())}
                for p in sampled
            ],
        }
        instruments.append(record)
        print(
            f"  ok    {src['id']:<26} {len(sampled):>4} provisions  {words:>7,} words  stride {stride}",
            flush=True,
        )

    excluded = []
    for src in NON_ENGLISH:
        hit = prefetched.get(src["id"])
        local = local_copy(src)
        if local and local[0]:
            data, url = local
        elif hit:
            data, url = hit
        else:
            data, url = get_source(src)
        if not data:
            excluded.append(
                {
                    "id": src["id"],
                    "title": src["title"],
                    "short": src["short"],
                    "jurisdiction": src["jurisdiction"],
                    "region": src["region"],
                    "genre": src["genre"],
                    "year": src["year"],
                    "lang": src["lang"],
                    "publisher": src["publisher"],
                    "url": src["urls"][0],
                    "retrieved": today,
                    "reason": "authoritative text is not in English",
                }
            )
            continue
        kind = src["kind"]
        try:
            raw = extract_pdf(data) if kind == "pdf" else extract_html(data)
        except Exception:  # noqa: BLE001
            raw = ""
        words = len(re.findall(r"\w+", raw))
        excluded.append(
            {
                "id": src["id"],
                "title": src["title"],
                "short": src["short"],
                "jurisdiction": src["jurisdiction"],
                "region": src["region"],
                "genre": src["genre"],
                "year": src["year"],
                "lang": src["lang"],
                "publisher": src["publisher"],
                "url": url,
                "retrieved": today,
                "wordsInSource": words,
                "reason": "authoritative text is not in English",
            }
        )
        print(f"  excl  {src['id']:<26} not English ({src['lang']})", flush=True)

    corpus = {
        "generated": today,
        "method": "see scripts/datapoint_build.py",
        "wordBudget": WORD_BUDGET,
        "instruments": instruments,
        "excludedNonEnglish": excluded,
        "failures": [{"id": f[0], "reason": f[1]} for f in failures],
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, "corpus.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(corpus, fh, ensure_ascii=False, indent=1)
    size = os.path.getsize(path) / 1e6
    print(f"\nwrote {path} ({size:.2f} MB, {len(instruments)} instruments)")
    if failures:
        print("failures:")
        for fid, why in failures:
            print(f"  - {fid}: {why}")
    return corpus


def write_receipts(corpus):
    lines = [
        "| Instrument | Region | Genre | Year | Status | Publisher | Retrieved |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for ins in corpus["instruments"]:
        lines.append(
            "| [{short}]({url}) — {title} | {region} | {genre} | {year} | {status} | {publisher} | {retrieved} |".format(
                short=ins["short"],
                url=ins["url"],
                title=ins["title"],
                region=ins["jurisdiction"],
                genre=ins["genre"],
                year=ins["year"],
                status=ins["status"],
                publisher=ins["publisher"],
                retrieved=ins["retrieved"],
            )
        )
    if corpus["excludedNonEnglish"]:
        lines.append("")
        lines.append("### Left out of the scored corpus")
        lines.append("")
        lines.append("| Instrument | Region | Year | Language | Reason | Retrieved |")
        lines.append("| --- | --- | --- | --- | --- | --- |")
        for ins in corpus["excludedNonEnglish"]:
            lines.append(
                "| [{short}]({url}) — {title} | {jurisdiction} | {year} | {lang} | {reason} | {retrieved} |".format(
                    short=ins["short"],
                    url=ins["url"],
                    title=ins["title"],
                    jurisdiction=ins["jurisdiction"],
                    year=ins["year"],
                    lang=ins["lang"],
                    reason=ins["reason"],
                    retrieved=ins["retrieved"],
                )
            )
    path = os.path.join(OUT_DIR, "receipts.md")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"wrote {path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report what resolves, build nothing")
    args = ap.parse_args()
    if args.check:
        prefetched = prefetch_all(SOURCES + NON_ENGLISH)
        for src in SOURCES + NON_ENGLISH:
            hit = prefetched.get(src["id"])
            data, url = hit if hit else (None, None)
            size = len(data) if data else 0
            print(
                f"{'OK  ' if data else 'MISS'} {src['id']:<26} {size:>10,}  {url or src['urls'][0]}"
            )
    else:
        c = build()
        write_receipts(c)
