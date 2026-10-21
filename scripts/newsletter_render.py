#!/usr/bin/env python3
"""Render THS newsletter issues to self-contained, reproducible HTML.

Reads the JSON cache written by ``newsletter_prepare.py`` (or re-parses the
issues if the cache is missing), then emits one standalone HTML file per
issue plus an ``index.html`` archive. Every file is fully self-contained:
the mark, the palette and the type are inlined, so a single ``.html`` can be
opened from disk, pasted into an email, or dropped on any host.

Reproducible by construction:

  * the palette is read from the real ``index.css`` design tokens, and the
    mark path from the real ``favicon.svg`` — the newsletter cannot drift
    from the site theme;
  * no timestamps, no build ids, no absolute paths are embedded;
  * issues are ordered by number and written with a fixed newline.

Running this twice on the same sources produces byte-identical output.

Usage:
    python3 ths/scripts/newsletter_render.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
THS_ROOT = SCRIPT_DIR.parent
ISSUES_DIR = THS_ROOT / "newsletter" / "issues"
DIST_DIR = THS_ROOT / "newsletter" / "dist"
JSON_OUT = DIST_DIR / "newsletter.json"
INDEX_CSS = THS_ROOT / "src" / "index.css"
FAVICON = THS_ROOT / "public" / "favicon.svg"

SITE_URL = "https://humble-sapien.vercel.app/"

# Design-system fallbacks, used only if a token is missing from index.css.
# The point of reading index.css is that these never actually fire; they keep
# the page legible if the theme is ever refactored under us.
TOKEN_FALLBACKS = {
    "paper-50": "#ffffff",
    "paper-100": "#f6f5f3",
    "paper-200": "#eceae6",
    "paper-300": "#e0ddd8",
    "paper-700": "#4b4640",
    "paper-600": "#6f6a63",
    "paper-900": "#1b1815",
    "clay-50": "#f8f2f3",
    "clay-200": "#e2c5c9",
    "clay-600": "#7a1f2b",
    "clay-700": "#641622",
}

_FONT_STACK = (
    "'Public Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
)
_MONO_STACK = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace"
# Google Fonts, inlined as a <link>. Email clients that strip <link> simply
# fall back to the stack above; browsers get the real faces.
_FONT_LINK = (
    "https://fonts.googleapis.com/css2?"
    "family=Public+Sans:ital,wght@0,300..800;1,300..800&"
    "family=IBM+Plex+Mono:wght@400;500;600&display=swap"
)


def write_stable(path: Path, text: str) -> None:
    """Write with explicit LF newlines.

    ``Path.write_text(newline=...)`` needs Python 3.10; opening the handle
    directly works everywhere and keeps output byte-stable even on Windows,
    which would otherwise CRLF the whole file.
    """
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def esc(s: str) -> str:
    """HTML-escape text. Content is trusted (it is ours) but escaping is
    cheap insurance against a stray ampersand or angle bracket."""
    return (
        s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    )


def read_tokens() -> dict[str, str]:
    """Pull the palette out of index.css by token name."""
    tokens = dict(TOKEN_FALLBACKS)
    try:
        css = INDEX_CSS.read_text(encoding="utf-8")
    except OSError:
        print(f"newsletter_render: cannot read {INDEX_CSS}; using fallbacks",
              file=sys.stderr)
        return tokens
    for name in TOKEN_FALLBACKS:
        m = re.search(rf"--{re.escape(name)}:\s*(#[0-9a-fA-F]{{3,8}})\s*;", css)
        if m:
            tokens[name] = m.group(1)
    return tokens


def read_mark() -> tuple[str, str]:
    """Return (viewBox, inner) for the brain/face mark from favicon.svg."""
    try:
        svg = FAVICON.read_text(encoding="utf-8")
    except OSError:
        print(f"newsletter_render: cannot read {FAVICON}; mark omitted",
              file=sys.stderr)
        return ("0 0 100 100", "")
    vb = re.search(r'viewBox="([^"]+)"', svg)
    viewBox = vb.group(1) if vb else "0 0 100 100"
    # Grab everything between the root <svg ...> and </svg>.
    inner = re.sub(r"^.*?<svg[^>]*>", "", svg, flags=re.S)
    inner = re.sub(r"</svg>\s*$", "", inner, flags=re.S).strip()
    # Comments carry no ink; drop them so the output is stable and small.
    inner = re.sub(r"<!--.*?-->", "", inner, flags=re.S).strip()
    # Recolour to the token-driven maroon so it tracks the palette.
    inner = inner.replace("#7A1F2B", "currentColor")
    return (viewBox, inner)


def load_issues() -> list[dict]:
    """Load from the JSON cache; re-parse via prepare if it is absent."""
    if JSON_OUT.exists():
        issues = json.loads(JSON_OUT.read_text(encoding="utf-8"))
    else:
        print("newsletter_render: no JSON cache; running newsletter_prepare ...",
              file=sys.stderr)
        sys.path.insert(0, str(SCRIPT_DIR))
        import newsletter_prepare  # reuse the canonical parser
        newsletter_prepare.main()
        issues = json.loads(JSON_OUT.read_text(encoding="utf-8"))
    # Defensive re-sort: newest first, whatever the cache held.
    return sorted(issues, key=lambda x: x["issue"], reverse=True)


def mark_svg(tokens: dict[str, str], mark: tuple[str, str], size: int = 40) -> str:
    viewBox, inner = mark
    if not inner:
        return ""
    return (
        f'<svg width="{size}" height="{size}" viewBox="{viewBox}" '
        f'role="img" aria-label="The Humble Sapien" '
        f'style="color:{tokens["clay-600"]};flex:none">{inner}</svg>'
    )


def render_issue(iss: dict, tokens: dict[str, str], mark: tuple[str, str],
                 total: int) -> str:
    c = tokens  # shorthand
    idx = iss["issue"]

    tags = "".join(
        f'<span class="nl-tag">{esc(t)}</span>' for t in iss["tags"]
    )

    reading = "".join(
        '<li class="nl-read-item">'
        f'<a class="nl-read-link" href="{esc(r["href"])}">{esc(r["label"])}</a>'
        + (f'<span class="nl-read-note">{esc(r["note"])}</span>' if r["note"] else "")
        + "</li>"
        for r in iss["reading"]
    )

    lead = "".join(f"<p>{esc(p)}</p>" for p in iss["lead"])
    fieldnote = "".join(f"<p>{esc(p)}</p>" for p in iss["fieldnote"])

    s = iss["snapshot"]
    snap_note = (
        f'<p class="nl-snap-note">{esc(s["note"])}</p>' if s["note"] else ""
    )

    t = iss["tool"]

    # Policy term, plainly — the before/after rewrite. A recurring weekly slot.
    term_html = ""
    if iss.get("term"):
        tm = iss["term"]
        tm_note = f'<p class="nl-plain-note">{esc(tm["note"])}</p>' if tm["note"] else ""
        term_html = f"""
        <h2 class="nl-section-h">Policy term, plainly</h2>
        <div class="nl-plain">
          <p class="nl-plain-before"><span class="nl-plain-tag">As written</span>{esc(tm["before"])}</p>
          <p class="nl-plain-after"><span class="nl-plain-tag nl-plain-tag-after">In plain words</span>{esc(tm["after"])}</p>
          {tm_note}
        </div>
"""

    # Chart of the week — one external/open figure with its takeaway.
    chart_html = ""
    if iss.get("chart"):
        ch = iss["chart"]
        chart_link = (
            f'<a class="nl-chart-link" href="{SITE_URL}{esc(ch["href"])}">Explore the data →</a>'
            if ch["href"] else ""
        )
        chart_html = f"""
        <h2 class="nl-section-h">Chart of the week</h2>
        <div class="nl-chart">
          <p class="nl-chart-title">{esc(ch["title"])}</p>
          <p class="nl-chart-take">{esc(ch["takeaway"])}</p>
          <p class="nl-chart-source">Source: {esc(ch["source"])}</p>
          {chart_link}
        </div>
"""

    # Monthly deep-dive extras: touchpoints, plain-language rewrite, and the
    # stakeholder mapping. These only exist on monthly editions.
    monthly_html = ""
    if iss.get("type") == "monthly":
        tp_items = "".join(
            f'<li class="nl-tp-item">'
            f'<span class="nl-tp-step">{esc(tp["step"])}</span>'
            + (f'<span class="nl-tp-detail">{esc(tp["detail"])}</span>' if tp["detail"] else "")
            + "</li>"
            for tp in iss.get("touchpoints") or []
        )
        touchpoints_block = f"""
        <h2 class="nl-section-h">The citizen's journey</h2>
        <ol class="nl-touchpoints">{tp_items}</ol>
"""

        simp = iss.get("simplify")
        simplify_block = ""
        if simp:
            simp_note = f'<p class="nl-plain-note">{esc(simp["note"])}</p>' if simp["note"] else ""
            simplify_block = f"""
        <h2 class="nl-section-h">In plain language</h2>
        <div class="nl-plain">
          <p class="nl-plain-before"><span class="nl-plain-tag">As written</span>{esc(simp["before"])}</p>
          <p class="nl-plain-after"><span class="nl-plain-tag nl-plain-tag-after">In plain words</span>{esc(simp["after"])}</p>
          {simp_note}
        </div>
"""

        st = iss.get("stakeholders")
        stakeholder_block = ""
        if st:
            stakeholder_block = f"""
        <h2 class="nl-section-h">Who gains, who pays, who is missing</h2>
        <div class="nl-stake">
          <p class="nl-stake-row"><span class="nl-stake-k">Gains</span>{esc(st["gains"])}</p>
          <p class="nl-stake-row"><span class="nl-stake-k">Pays</span>{esc(st["pays"])}</p>
          <p class="nl-stake-row nl-stake-missing"><span class="nl-stake-k">Missing</span>{esc(st["missing"])}</p>
        </div>
"""

        monthly_html = touchpoints_block + simplify_block + stakeholder_block

    # Section order differs by edition: the weekly runs term then chart; the
    # monthly swaps those for the deep-dive blocks (journey, language, stakes).
    weekly_extras = term_html + chart_html
    edition = "Monthly deep-dive" if iss.get("type") == "monthly" else "Weekly"
    policy_line = (
        f'<span class="nl-edition-policy">Under the lens: {esc(iss["policy"])}</span>'
        if iss.get("policy") else ""
    )

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>THS Newsletter #{idx} — {esc(iss["title"])}</title>
<meta name="description" content="{esc(iss["standfirst"])}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{_FONT_LINK}">
<style>
  :root {{
    --paper-50: {c["paper-50"]};
    --paper-100: {c["paper-100"]};
    --paper-200: {c["paper-200"]};
    --paper-300: {c["paper-300"]};
    --paper-600: {c["paper-600"]};
    --paper-700: {c["paper-700"]};
    --paper-900: {c["paper-900"]};
    --clay-50: {c["clay-50"]};
    --clay-200: {c["clay-200"]};
    --clay-600: {c["clay-600"]};
    --clay-700: {c["clay-700"]};
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    background: var(--paper-100);
    color: var(--paper-900);
    font-family: {_FONT_STACK};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }}
  .nl-wrap {{
    max-width: 42rem;
    margin: 0 auto;
    padding: 2.5rem 1.25rem 4rem;
  }}
  .nl-card {{
    background: var(--paper-50);
    border: 1px solid var(--paper-300);
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(27,24,21,0.06), 0 8px 24px -12px rgba(27,24,21,0.12);
    overflow: hidden;
  }}
  .nl-masthead {{
    padding: 2rem 2rem 1.5rem;
    border-bottom: 1px solid var(--paper-300);
  }}
  .nl-brand {{
    display: flex; align-items: center; gap: 0.6rem;
    color: var(--clay-600);
    margin-bottom: 1.25rem;
  }}
  .nl-word {{
    font-weight: 700; font-size: 1.05rem; color: var(--paper-900);
    letter-spacing: -0.01em;
  }}
  .nl-issue-no {{
    font-family: {_MONO_STACK};
    font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--clay-700);
    background: var(--clay-50);
    border: 1px solid var(--clay-200);
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
  }}
  .nl-meta {{
    font-family: {_MONO_STACK};
    font-size: 0.75rem; color: var(--paper-600);
    margin: 0 0 0.75rem;
  }}
  .nl-title {{
    font-size: 1.9rem; line-height: 1.2; font-weight: 800;
    letter-spacing: -0.02em; margin: 0 0 0.75rem; color: var(--paper-900);
  }}
  .nl-standfirst {{
    font-size: 1.08rem; color: var(--paper-700); margin: 0;
    font-style: italic;
  }}
  .nl-tags {{ margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.4rem; }}
  .nl-tag {{
    font-size: 0.72rem; color: var(--paper-600);
    border: 1px solid var(--paper-300); border-radius: 999px;
    padding: 0.15rem 0.55rem;
  }}
  .nl-body {{ padding: 1.75rem 2rem 2rem; }}
  .nl-body p {{ margin: 0 0 1rem; }}
  .nl-body p:last-child {{ margin-bottom: 0; }}
  .nl-section-h {{
    font-family: {_MONO_STACK};
    font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--clay-700); margin: 2rem 0 0.75rem;
  }}
  .nl-body > .nl-section-h:first-child {{ margin-top: 0; }}
  .nl-snapshot {{
    background: var(--clay-50);
    border: 1px solid var(--clay-200);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin: 0 0 0.5rem;
  }}
  .nl-snap-value {{
    font-family: {_MONO_STACK};
    font-size: 2.4rem; font-weight: 600; line-height: 1.1;
    color: var(--clay-700); font-variant-numeric: tabular-nums;
    margin: 0;
  }}
  .nl-snap-label {{ margin: 0.35rem 0 0; color: var(--paper-900); }}
  .nl-snap-note {{ margin: 0.35rem 0 0; color: var(--paper-700); font-size: 0.92rem; }}
  .nl-snap-source {{
    font-family: {_MONO_STACK};
    font-size: 0.72rem; color: var(--paper-600); margin: 0.6rem 0 0;
  }}
  .nl-edition {{ display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 0 0 0.75rem; }}
  .nl-edition-badge {{
    font-family: {_MONO_STACK};
    font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase;
    color: #ffffff; background: var(--clay-600);
    border-radius: 999px; padding: 0.2rem 0.6rem;
  }}
  .nl-edition-policy {{ font-size: 0.82rem; color: var(--paper-600); }}
  .nl-plain {{
    background: var(--paper-100);
    border: 1px solid var(--paper-300);
    border-radius: 12px;
    padding: 1rem 1.25rem;
  }}
  .nl-plain-before, .nl-plain-after {{ margin: 0 0 0.75rem; }}
  .nl-plain-after {{ margin-bottom: 0; }}
  .nl-plain-before {{ color: var(--paper-600); font-style: italic; }}
  .nl-plain-after {{ color: var(--paper-900); }}
  .nl-plain-tag {{
    display: inline-block;
    font-family: {_MONO_STACK};
    font-size: 0.66rem; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--paper-600); margin-right: 0.5rem;
  }}
  .nl-plain-tag-after {{ color: var(--clay-700); }}
  .nl-plain-note {{ margin: 0.75rem 0 0; font-size: 0.85rem; color: var(--paper-600); }}
  .nl-chart {{
    background: var(--clay-50);
    border: 1px solid var(--clay-200);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
  }}
  .nl-chart-title {{ margin: 0 0 0.4rem; font-weight: 700; color: var(--paper-900); }}
  .nl-chart-take {{ margin: 0 0 0.6rem; color: var(--paper-700); }}
  .nl-chart-source {{
    font-family: {_MONO_STACK};
    font-size: 0.72rem; color: var(--paper-600); margin: 0;
  }}
  .nl-chart-link {{ display: inline-block; margin-top: 0.6rem; color: var(--clay-700); font-weight: 600; text-decoration: none; font-size: 0.88rem; }}
  .nl-chart-link:hover {{ text-decoration: underline; }}
  .nl-touchpoints {{ list-style: none; padding: 0; margin: 0; counter-reset: nl-tp; }}
  .nl-tp-item {{
    display: flex; gap: 0.75rem; padding: 0.7rem 0;
    border-bottom: 1px solid var(--paper-200);
    counter-increment: nl-tp;
  }}
  .nl-tp-item:last-child {{ border-bottom: 0; }}
  .nl-tp-step {{
    font-weight: 700; color: var(--paper-900); flex: none; width: 9.5rem;
  }}
  .nl-tp-step::before {{
    content: counter(nl-tp) ".";
    font-family: {_MONO_STACK};
    color: var(--clay-700); margin-right: 0.4rem;
  }}
  .nl-tp-detail {{ color: var(--paper-700); }}
  .nl-stake {{
    background: var(--paper-100);
    border: 1px solid var(--paper-300);
    border-radius: 12px;
    padding: 0.5rem 1.25rem;
  }}
  .nl-stake-row {{ margin: 0.75rem 0; color: var(--paper-700); }}
  .nl-stake-k {{
    display: block;
    font-family: {_MONO_STACK};
    font-size: 0.66rem; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--paper-600); margin-bottom: 0.15rem;
  }}
  .nl-stake-missing {{ color: var(--clay-700); }}
  .nl-stake-missing .nl-stake-k {{ color: var(--clay-700); }}
  .nl-tool {{
    background: var(--paper-100);
    border: 1px solid var(--paper-300);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin: 2rem 0 0;
  }}
  .nl-tool h3 {{ margin: 0 0 0.4rem; font-size: 1.05rem; color: var(--clay-700); }}
  .nl-tool p {{ margin: 0 0 0.9rem; color: var(--paper-700); font-size: 0.95rem; }}
  .nl-btn {{
    display: inline-block;
    background: var(--clay-600); color: #ffffff;
    text-decoration: none; font-weight: 600; font-size: 0.92rem;
    padding: 0.55rem 1.1rem; border-radius: 10px;
  }}
  .nl-btn:hover {{ background: var(--clay-700); }}
  .nl-reads {{ list-style: none; padding: 0; margin: 0; }}
  .nl-read-item {{
    padding: 0.7rem 0; border-bottom: 1px solid var(--paper-200);
  }}
  .nl-read-item:last-child {{ border-bottom: 0; }}
  .nl-read-link {{ color: var(--clay-700); font-weight: 600; text-decoration: none; }}
  .nl-read-link:hover {{ text-decoration: underline; }}
  .nl-read-note {{ display: block; color: var(--paper-600); font-size: 0.88rem; margin-top: 0.15rem; }}
  .nl-foot {{
    padding: 1.25rem 2rem;
    border-top: 1px solid var(--paper-300);
    background: var(--paper-100);
    font-size: 0.82rem; color: var(--paper-600);
  }}
  .nl-foot a {{ color: var(--clay-700); }}
  .nl-nav {{
    display: flex; justify-content: space-between; gap: 1rem;
    margin-top: 1.5rem; font-size: 0.85rem;
  }}
  .nl-nav a {{ color: var(--clay-700); text-decoration: none; }}
  .nl-nav a:hover {{ text-decoration: underline; }}
  @media (max-width: 520px) {{
    .nl-masthead, .nl-body, .nl-foot {{ padding-left: 1.25rem; padding-right: 1.25rem; }}
    .nl-title {{ font-size: 1.55rem; }}
    .nl-tp-item {{ flex-direction: column; gap: 0.15rem; }}
    .nl-tp-step {{ width: auto; }}
  }}
</style>
</head>
<body>
  <div class="nl-wrap">
    <article class="nl-card">
      <header class="nl-masthead">
        <div class="nl-brand">
          {mark_svg(tokens, mark, 40)}
          <span class="nl-word">The Humble Sapien</span>
          <span class="nl-issue-no">Issue {idx} of {total}</span>
        </div>
        <p class="nl-meta">{esc(iss["dateLabel"])} · {iss["minutes"]} min read · {esc(iss["author"])}</p>
        <p class="nl-edition"><span class="nl-edition-badge">{edition}</span>{policy_line}</p>
        <h1 class="nl-title">{esc(iss["title"])}</h1>
        <p class="nl-standfirst">{esc(iss["standfirst"])}</p>
        <div class="nl-tags">{tags}</div>
      </header>
      <div class="nl-body">
        <div class="nl-snapshot">
          <p class="nl-snap-value">{esc(s["value"])}</p>
          <p class="nl-snap-label">{esc(s["label"])}</p>
          {snap_note}
          <p class="nl-snap-source">Source: {esc(s["source"])}</p>
        </div>

        <h2 class="nl-section-h">Lead</h2>
        {lead}

        {weekly_extras}
        {monthly_html}

        <h2 class="nl-section-h">Field note</h2>
        {fieldnote}

        <div class="nl-tool">
          <h3>{esc(t["name"])}</h3>
          <p>{esc(t["blurb"])}</p>
          <a class="nl-btn" href="{SITE_URL}{esc(t["href"])}">Open {esc(t["name"])}</a>
        </div>

        <h2 class="nl-section-h">Reading</h2>
        <ul class="nl-reads">{reading}</ul>
      </div>
      <footer class="nl-foot">
        THS: The Humble Sapien — a public interest technology initiative working
        toward not-for-profit civil society registration. Evidence with receipts,
        tools in the open, data you can take apart.
        <a href="{SITE_URL}">humble-sapien.vercel.app</a>
      </footer>
    </article>
    <nav class="nl-nav">
      <span></span>
      <a href="{SITE_URL}">Back to the site →</a>
    </nav>
  </div>
</body>
</html>
"""


def render_index(issues: list[dict], tokens: dict[str, str],
                 mark: tuple[str, str]) -> str:
    rows = "".join(
        f'<li class="ix-item">'
        f'<a class="ix-link" href="{esc(i["id"])}.html">#{i["issue"]} · {esc(i["title"])}</a>'
        f'<span class="ix-meta">{esc(i["type"].title())} · {esc(i["dateLabel"])} · {i["minutes"]} min</span>'
        f"</li>"
        for i in issues
    )
    c = tokens
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>THS Newsletter — archive</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{_FONT_LINK}">
<style>
  body {{
    margin: 0; background: {c["paper-100"]}; color: {c["paper-900"]};
    font-family: {_FONT_STACK}; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }}
  .ix-wrap {{ max-width: 42rem; margin: 0 auto; padding: 3rem 1.25rem; }}
  .ix-brand {{ display: flex; align-items: center; gap: 0.6rem; color: {c["clay-600"]}; margin-bottom: 1.5rem; }}
  .ix-word {{ font-weight: 700; font-size: 1.15rem; color: {c["paper-900"]}; }}
  h1 {{ font-size: 1.8rem; margin: 0 0 0.5rem; letter-spacing: -0.02em; }}
  .ix-strap {{ color: {c["paper-700"]}; margin: 0 0 2rem; }}
  .ix-list {{ list-style: none; padding: 0; margin: 0; }}
  .ix-item {{
    background: {c["paper-50"]}; border: 1px solid {c["paper-300"]};
    border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 0.75rem;
  }}
  .ix-link {{ display: block; font-weight: 700; color: {c["clay-700"]}; text-decoration: none; font-size: 1.05rem; }}
  .ix-link:hover {{ text-decoration: underline; }}
  .ix-meta {{ font-family: {_MONO_STACK}; font-size: 0.75rem; color: {c["paper-600"]}; }}
</style>
</head>
<body>
  <div class="ix-wrap">
    <div class="ix-brand">{mark_svg(tokens, mark, 36)}<span class="ix-word">The Humble Sapien</span></div>
    <h1>Newsletter</h1>
    <p class="ix-strap">Evidence with receipts, in your inbox and on the site. Every issue is a self-contained page.</p>
    <ul class="ix-list">{rows}</ul>
  </div>
</body>
</html>
"""


def main() -> None:
    tokens = read_tokens()
    mark = read_mark()
    issues = load_issues()
    total = len(issues)

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    written = []
    for iss in issues:
        out = DIST_DIR / f"{iss['id']}.html"
        write_stable(out, render_issue(iss, tokens, mark, total))
        written.append(out)

    index = DIST_DIR / "index.html"
    write_stable(index, render_index(issues, tokens, mark))
    written.append(index)

    for w in written:
        print(f"newsletter_render: {w.relative_to(THS_ROOT)}")


if __name__ == "__main__":
    main()
