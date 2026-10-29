#!/usr/bin/env python3
"""Rebuild src/data/rara.json from RARA's SQLite corpus.

RARA is a Python prototype that lives outside this repository. The site ships
a committed snapshot of its corpus so the section runs offline, deterministically
and with no server; point this script at the prototype's database whenever the
corpus changes:

    python3 scripts/build-rara.py /path/to/rara_india.db

The output is stable: rows are ordered, no timestamps are written, so a rebuild
that changes nothing changes no bytes.
"""

import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "rara.json"


def as_list(raw):
    try:
        value = json.loads(raw or "[]")
    except ValueError:
        return []
    return value if isinstance(value, list) else []


def main():
    if len(sys.argv) != 2:
        print("usage: python3 scripts/build-rara.py <rara.db>")
        return 2

    db = Path(sys.argv[1]).expanduser()
    if not db.exists():
        print(f"no database at {db}")
        return 2

    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row

    statutes = []
    for row in con.execute("select * from indian_statutes order by rowid"):
        statutes.append(
            {
                "id": row["id"],
                "pillar": row["pillar"],
                "ministryRegulator": row["ministry_regulator"],
                "statute": row["statute"],
                "title": row["title"],
                "summary": row["summary"],
                "policyLag": row["policy_lag"],
                "remedy": row["dia_resolution_proposal"],
                "keywords": as_list(row["keywords_json"]),
                "riskDomains": as_list(row["risk_domains_json"]),
            }
        )

    vacuums = []
    for row in con.execute("select * from zero_policy_vacuums order by vacuum_id"):
        vacuums.append(
            {
                "id": row["vacuum_id"],
                "domain": row["domain"],
                "status": row["current_indian_law_status"],
                "benchmark": row["global_benchmark"],
                "description": row["vacuum_description"],
                "triggers": as_list(row["trigger_keywords_json"]),
                "mode": row["discovery_mode"],
            }
        )

    payload = {
        "source": "RARA Pulse (India Edition) — rara_india.db",
        "counts": {"statutes": len(statutes), "vacuums": len(vacuums)},
        "statutes": statutes,
        "vacuums": vacuums,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} — {len(statutes)} statutes, {len(vacuums)} vacuums")
    return 0


if __name__ == "__main__":
    sys.exit(main())
