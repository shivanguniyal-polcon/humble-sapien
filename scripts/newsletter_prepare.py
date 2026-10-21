#!/usr/bin/env python3
"""Prepare THS newsletter issues for the site.

Reads every issue in ``ths/newsletter/issues/*.md`` (Markdown + YAML-ish
frontmatter), validates it against the fixed template, and writes:

  * ``ths/src/data/newsletter.js``  — ES module the Newsletter section imports
  * ``ths/newsletter/dist/newsletter.json`` — machine cache for the render step

Two editions share one template:

  * ``type: weekly``  — the dispatch: data snapshot, lead, policy-term-plainly,
    chart-of-the-week, tool spotlight, reading list.
  * ``type: monthly`` — the deep-dive: the weekly set plus a policy under the
    lens, its citizen touchpoints, a plain-language rewrite and a stakeholder
    mapping.

Editorial rule, enforced here because it is the brand: data and policy content
is external and open only. Every snapshot and chart must cite a public source,
and the chart-of-the-week must not rest on unpublished/internal work — a
source that names thesis output or an in-preparation paper raises a warning.

The output is deterministic: issues are ordered by issue number, fields are
emitted in a fixed order, and dates are formatted without a locale. Running
this twice on unchanged sources produces byte-identical files.

Usage:
    python3 ths/scripts/newsletter_prepare.py
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

# Layout, resolved from the script location so it runs from anywhere.
SCRIPT_DIR = Path(__file__).resolve().parent
THS_ROOT = SCRIPT_DIR.parent
ISSUES_DIR = THS_ROOT / "newsletter" / "issues"
DIST_DIR = THS_ROOT / "newsletter" / "dist"
JS_OUT = THS_ROOT / "src" / "data" / "newsletter.js"
JSON_OUT = DIST_DIR / "newsletter.json"

# The fixed template. Every issue carries the common fields; weekly and
# monthly editions add their own. A missing piece is a hard error naming the
# file, because a half-built issue becomes a blank page in the reader's inbox.
REQUIRED_TOP = ("id", "issue", "date", "title", "standfirst", "author")
REQUIRED_SNAPSHOT = ("value", "label", "source")
REQUIRED_TOOL = ("name", "href", "blurb")
REQUIRED_TERM = ("before", "after")
REQUIRED_CHART = ("title", "takeaway", "source")
REQUIRED_SIMPLIFY = ("before", "after")
REQUIRED_STAKEHOLDERS = ("gains", "pays", "missing")
REQUIRED_SECTIONS = ("Lead", "Reading")
MONTHLY_SECTIONS = ("Touchpoints",)

# Sources that are, by definition, not open/external. The external-only rule
# bars these from the chart-of-the-week slot; hitting one is a warning, not a
# hard failure, so a legitimate exception can still ship with eyes open.
_INTERNAL_SOURCE = re.compile(
    r"thesis|working paper in preparation|in preparation|internal|"
    r"raw file|not yet published|draft only",
    re.IGNORECASE,
)

_MONTHS = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)


def fail(path: Path, msg: str) -> None:
    """Bail loudly, naming the file. A silent bad issue becomes a blank page."""
    print(f"newsletter_prepare: {path.name}: {msg}", file=sys.stderr)
    raise SystemExit(1)


def warn(path: Path, msg: str) -> None:
    """Non-blocking flag. Editorial nudges (like external-only) live here."""
    print(f"newsletter_prepare: WARNING {path.name}: {msg}", file=sys.stderr)


def unquote(v: str) -> str:
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v


def parse_frontmatter(lines: list[str], path: Path) -> tuple[dict, int]:
    """Parse the constrained frontmatter block.

    Handles exactly the shapes the template uses: top-level ``key: value``,
    top-level ``key:`` with an indented nested map, and ``key: [a, b]`` inline
    lists. Anything else is a hard error rather than a guess — a newsletter
    whose metadata half-parses is worse than one that refuses to build.
    """
    if not lines or lines[0].strip() != "---":
        fail(path, "missing opening '---' frontmatter delimiter")

    meta: dict = {}
    i = 1

    while i < len(lines):
        line = lines[i]
        if line.strip() == "---":
            return meta, i + 1

        if not line.strip():
            i += 1
            continue

        indent = len(line) - len(line.lstrip())
        if indent > 0:
            fail(path, f"unexpected indented line outside a block: {line.strip()!r}")

        if ":" not in line:
            fail(path, f"expected 'key: value', got {line.strip()!r}")

        key, _, value = line.partition(":")
        key = unquote(key)
        value = value.strip()

        if not value:
            # A key with no value opens a nested map. Collect its indented body.
            nested: dict = {}
            j = i + 1
            while j < len(lines):
                nxt = lines[j]
                nindent = len(nxt) - len(nxt.lstrip())
                if nxt.strip() and nindent == 0:
                    break
                if nxt.strip() and ":" in nxt:
                    nk, _, nv = nxt.strip().partition(":")
                    nested[unquote(nk)] = unquote(nv)
                j += 1
            meta[key] = nested
            i = j
            continue

        # Inline list: [a, b, c]
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            meta[key] = [unquote(x.strip()) for x in inner.split(",") if x.strip()]
        else:
            meta[key] = unquote(value)
        i += 1

    fail(path, "frontmatter never closed with '---'")
    raise AssertionError("unreachable")


def parse_body(body_lines: list[str], path: Path) -> dict:
    """Split the Markdown body on ``## `` headings into named sections."""
    sections: dict[str, list[str]] = {}
    current = None
    for line in body_lines:
        if line.startswith("## "):
            current = line[3:].strip()
            sections[current] = []
        elif current is not None:
            sections[current].append(line)
    if not sections:
        fail(path, "body has no '## ' sections")
    return sections


def split_paragraphs(block_lines: list[str]) -> list[str]:
    """Group non-empty lines into paragraphs, dropping blanks."""
    paras: list[str] = []
    buf: list[str] = []
    for line in block_lines:
        if line.strip():
            buf.append(line.strip())
        elif buf:
            paras.append(" ".join(buf))
            buf = []
    if buf:
        paras.append(" ".join(buf))
    return paras


_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def parse_reading(block_lines: list[str], path: Path) -> list[dict]:
    """Parse the Reading list: ``- [label](href) — optional note``."""
    items: list[dict] = []
    for line in block_lines:
        s = line.strip()
        if not s.startswith("- "):
            continue
        s = s[2:].strip()
        m = _LINK_RE.search(s)
        if not m:
            fail(path, f"reading item is not a markdown link: {s!r}")
        label, href = m.group(1), m.group(2)
        rest = s[m.end():].strip()
        note = re.sub(r"^[—–-]\s*", "", rest).strip()
        items.append({"label": label.strip(), "href": href.strip(), "note": note})
    if not items:
        fail(path, "Reading section has no list items")
    return items


def parse_touchpoints(block_lines: list[str], path: Path) -> list[dict]:
    """Parse the monthly Touchpoints list: ``- Step: detail``."""
    items: list[dict] = []
    for line in block_lines:
        s = line.strip()
        if not s.startswith("- "):
            continue
        s = s[2:].strip()
        step, sep, detail = s.partition(":")
        if not sep:
            # Tolerate an em-dash separator, then a bare step with no detail.
            step, sep, detail = s.partition("—")
        items.append({
            "step": step.strip(),
            "detail": detail.strip() if sep else "",
        })
    if not items:
        fail(path, "Touchpoints section has no list items")
    return items


def format_date(iso: str, path: Path) -> str:
    """'2026-10-18' -> '18 October 2026'. Locale-free, so it is reproducible."""
    try:
        d = date.fromisoformat(iso)
    except ValueError:
        fail(path, f"date must be ISO YYYY-MM-DD, got {iso!r}")
    return f"{d.day} {_MONTHS[d.month - 1]} {d.year}"


def reading_minutes(*blocks: list[str]) -> int:
    """Estimate reading time from word count. ~200 wpm, floor of 1."""
    words = sum(len(" ".join(b).split()) for b in blocks)
    return max(1, round(words / 200))


def check_external(path: Path, label: str, source: str) -> None:
    """Flag a source that reads as internal/unpublished (external-only rule)."""
    if _INTERNAL_SOURCE.search(source):
        warn(
            path,
            f"{label} source looks internal/non-open ({source!r}); the "
            f"external-only rule wants a public, open-access source here",
        )


def parse_issue(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    meta, body_start = parse_frontmatter(lines, path)
    sections = parse_body(lines[body_start:], path)

    for key in REQUIRED_TOP:
        if key not in meta or meta[key] in ("", None):
            fail(path, f"missing required frontmatter field '{key}'")

    etype = meta.get("type", "weekly")
    if etype not in ("weekly", "monthly"):
        fail(path, f"type must be 'weekly' or 'monthly', got {etype!r}")

    snapshot = meta.get("snapshot") or {}
    tool = meta.get("tool") or {}
    term = meta.get("term") or {}
    chart = meta.get("chart") or {}
    for key in REQUIRED_SNAPSHOT:
        if key not in snapshot:
            fail(path, f"missing snapshot.{key}")
    for key in REQUIRED_TOOL:
        if key not in tool:
            fail(path, f"missing tool.{key}")
    for name in REQUIRED_SECTIONS:
        if name not in sections:
            fail(path, f"missing required section '## {name}'")

    # The external-only rule: every snapshot cites a source, and it should be
    # public. This is the brand promise, so it is checked, not merely hoped for.
    check_external(path, "snapshot", snapshot["source"])

    # Weekly extras: the recurring policy-term and chart-of-the-week slots.
    term_out = None
    if term:
        for key in REQUIRED_TERM:
            if key not in term:
                fail(path, f"missing term.{key}")
        term_out = {
            "before": term["before"],
            "after": term["after"],
            "note": term.get("note", ""),
        }

    chart_out = None
    if chart:
        for key in REQUIRED_CHART:
            if key not in chart:
                fail(path, f"missing chart.{key}")
        check_external(path, "chart", chart["source"])
        chart_out = {
            "title": chart["title"],
            "takeaway": chart["takeaway"],
            "source": chart["source"],
            "href": chart.get("href", ""),
        }

    # Monthly deep-dive extras: policy under the lens, its plain-language
    # rewrite, and the stakeholder mapping.
    policy_out = meta.get("policy", "")
    simplify_out = None
    stakeholders_out = None
    touchpoints_out = None
    if etype == "monthly":
        if not policy_out:
            fail(path, "monthly issues need a 'policy' field naming the policy")
        simplify = meta.get("simplify") or {}
        for key in REQUIRED_SIMPLIFY:
            if key not in simplify:
                fail(path, f"missing simplify.{key}")
        simplify_out = {
            "before": simplify["before"],
            "after": simplify["after"],
            "note": simplify.get("note", ""),
        }
        stakeholders = meta.get("stakeholders") or {}
        for key in REQUIRED_STAKEHOLDERS:
            if key not in stakeholders:
                fail(path, f"missing stakeholders.{key}")
        stakeholders_out = {
            "gains": stakeholders["gains"],
            "pays": stakeholders["pays"],
            "missing": stakeholders["missing"],
        }
        for name in MONTHLY_SECTIONS:
            if name not in sections:
                fail(path, f"monthly issues need section '## {name}'")
        touchpoints_out = parse_touchpoints(sections["Touchpoints"], path)
        check_external(path, "policy", meta.get("source", "public record"))

    lead = split_paragraphs(sections["Lead"])
    fieldnote = split_paragraphs(sections.get("Field note", []))
    reading = parse_reading(sections["Reading"], path)
    if not lead:
        fail(path, "Lead section is empty")

    tags = meta.get("tags", [])
    if not isinstance(tags, list):
        fail(path, "tags must be an inline list like [a, b, c]")

    prose_blocks = [lead, fieldnote]
    if touchpoints_out:
        prose_blocks.append([f"{t['step']} {t['detail']}" for t in touchpoints_out])

    return {
        "id": meta["id"],
        "issue": int(meta["issue"]),
        "type": etype,
        "date": meta["date"],
        "dateLabel": format_date(meta["date"], path),
        "title": meta["title"],
        "standfirst": meta["standfirst"],
        "author": meta["author"],
        "tags": tags,
        "minutes": reading_minutes(*prose_blocks),
        "policy": policy_out,
        "snapshot": {
            "value": snapshot["value"],
            "label": snapshot["label"],
            "note": snapshot.get("note", ""),
            "source": snapshot["source"],
            "statTab": snapshot.get("statTab", ""),
        },
        "term": term_out,
        "chart": chart_out,
        "tool": {
            "name": tool["name"],
            "href": tool["href"],
            "blurb": tool["blurb"],
        },
        "simplify": simplify_out,
        "stakeholders": stakeholders_out,
        "touchpoints": touchpoints_out,
        "lead": lead,
        "fieldnote": fieldnote,
        "reading": reading,
    }


def load_issues() -> list[dict]:
    paths = sorted(ISSUES_DIR.glob("*.md"))
    if not paths:
        print(f"newsletter_prepare: no issues found in {ISSUES_DIR}", file=sys.stderr)
        raise SystemExit(1)
    issues = [parse_issue(p) for p in paths]

    # Uniqueness on id and issue number: two issues claiming the same slot
    # would silently shadow each other in the nav and the deep links.
    seen_ids: dict[str, str] = {}
    seen_nums: dict[int, str] = {}
    for iss in issues:
        if iss["id"] in seen_ids:
            print(
                f"newsletter_prepare: duplicate id '{iss['id']}'",
                file=sys.stderr,
            )
            raise SystemExit(1)
        if iss["issue"] in seen_nums:
            print(
                f"newsletter_prepare: duplicate issue number {iss['issue']}",
                file=sys.stderr,
            )
            raise SystemExit(1)
        seen_ids[iss["id"]] = iss["id"]
        seen_nums[iss["issue"]] = iss["id"]

    # Newest first is how a reader meets an archive.
    issues.sort(key=lambda x: x["issue"], reverse=True)
    return issues


def js_string(s: str) -> str:
    """JSON-encode a string; it is also valid JS. Escapes newlines/quotes."""
    return json.dumps(s, ensure_ascii=False)


def emit_js(issues: list[dict]) -> str:
    """Render the ES module. Fixed key order, newest first."""
    out: list[str] = []
    out.append("// THS newsletter, generated by scripts/newsletter_prepare.py.")
    out.append("// Edit the issues in newsletter/issues/*.md, then re-run:")
    out.append("//     python3 scripts/newsletter_prepare.py")
    out.append("// Do not edit this file by hand; it is overwritten on every run.")
    out.append("")
    out.append("export const NEWSLETTER = [")
    for iss in issues:
        out.append("  {")
        out.append(f"    id: {js_string(iss['id'])},")
        out.append(f"    issue: {iss['issue']},")
        out.append(f"    type: {js_string(iss['type'])},")
        out.append(f"    date: {js_string(iss['date'])},")
        out.append(f"    dateLabel: {js_string(iss['dateLabel'])},")
        out.append(f"    title: {js_string(iss['title'])},")
        out.append(f"    standfirst: {js_string(iss['standfirst'])},")
        out.append(f"    author: {js_string(iss['author'])},")
        out.append(f"    minutes: {iss['minutes']},")
        out.append(f"    policy: {js_string(iss['policy'])},")
        tags = ", ".join(js_string(t) for t in iss["tags"])
        out.append(f"    tags: [{tags}],")
        s = iss["snapshot"]
        out.append("    snapshot: {")
        out.append(f"      value: {js_string(s['value'])},")
        out.append(f"      label: {js_string(s['label'])},")
        out.append(f"      note: {js_string(s['note'])},")
        out.append(f"      source: {js_string(s['source'])},")
        out.append(f"      statTab: {js_string(s['statTab'])},")
        out.append("    },")

        if iss["term"]:
            t = iss["term"]
            out.append("    term: {")
            out.append(f"      before: {js_string(t['before'])},")
            out.append(f"      after: {js_string(t['after'])},")
            out.append(f"      note: {js_string(t['note'])},")
            out.append("    },")
        else:
            out.append("    term: null,")

        if iss["chart"]:
            ch = iss["chart"]
            out.append("    chart: {")
            out.append(f"      title: {js_string(ch['title'])},")
            out.append(f"      takeaway: {js_string(ch['takeaway'])},")
            out.append(f"      source: {js_string(ch['source'])},")
            out.append(f"      href: {js_string(ch['href'])},")
            out.append("    },")
        else:
            out.append("    chart: null,")

        t = iss["tool"]
        out.append("    tool: {")
        out.append(f"      name: {js_string(t['name'])},")
        out.append(f"      href: {js_string(t['href'])},")
        out.append(f"      blurb: {js_string(t['blurb'])},")
        out.append("    },")

        if iss["simplify"]:
            si = iss["simplify"]
            out.append("    simplify: {")
            out.append(f"      before: {js_string(si['before'])},")
            out.append(f"      after: {js_string(si['after'])},")
            out.append(f"      note: {js_string(si['note'])},")
            out.append("    },")
        else:
            out.append("    simplify: null,")

        if iss["stakeholders"]:
            st = iss["stakeholders"]
            out.append("    stakeholders: {")
            out.append(f"      gains: {js_string(st['gains'])},")
            out.append(f"      pays: {js_string(st['pays'])},")
            out.append(f"      missing: {js_string(st['missing'])},")
            out.append("    },")
        else:
            out.append("    stakeholders: null,")

        if iss["touchpoints"] is not None:
            out.append("    touchpoints: [")
            for tp in iss["touchpoints"]:
                out.append("      {")
                out.append(f"        step: {js_string(tp['step'])},")
                out.append(f"        detail: {js_string(tp['detail'])},")
                out.append("      },")
            out.append("    ],")
        else:
            out.append("    touchpoints: null,")

        out.append("    lead: [")
        for para in iss["lead"]:
            out.append(f"      {js_string(para)},")
        out.append("    ],")
        out.append("    fieldnote: [")
        for para in iss["fieldnote"]:
            out.append(f"      {js_string(para)},")
        out.append("    ],")
        out.append("    reading: [")
        for r in iss["reading"]:
            out.append("      {")
            out.append(f"        label: {js_string(r['label'])},")
            out.append(f"        href: {js_string(r['href'])},")
            out.append(f"        note: {js_string(r['note'])},")
            out.append("      },")
        out.append("    ],")
        out.append("  },")
    out.append("];")
    out.append("")
    out.append("export const LATEST_ISSUE = NEWSLETTER[0];")
    out.append("")
    return "\n".join(out)


def main() -> None:
    issues = load_issues()

    JS_OUT.parent.mkdir(parents=True, exist_ok=True)
    JS_OUT.write_text(emit_js(issues), encoding="utf-8")

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    JSON_OUT.write_text(
        json.dumps(issues, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    weekly = sum(1 for i in issues if i["type"] == "weekly")
    monthly = len(issues) - weekly
    print(
        f"newsletter_prepare: {len(issues)} issue(s) "
        f"({weekly} weekly, {monthly} monthly) -> {JS_OUT.relative_to(THS_ROOT)}"
    )
    print(f"newsletter_prepare: JSON cache -> {JSON_OUT.relative_to(THS_ROOT)}")


if __name__ == "__main__":
    main()
