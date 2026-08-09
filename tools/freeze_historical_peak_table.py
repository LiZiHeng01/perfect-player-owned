#!/usr/bin/env python3
"""Freeze the verified 150 historical surprise cards into a static table.

This tool does not scan roster CSV files. It snapshots the already verified
historical cards from perfect-player-pool.json so the normal pool builder can
consume a fixed table instead of recalculating peaks from rosters01-rosters19.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
POOL_FILE = ROOT / "assets" / "data" / "perfect-player-pool.json"
OUT_FILE = ROOT / "assets" / "data" / "perfect-player-historical-peak-table.json"
PEAK_SOURCE = "highest rating for each player across rosters01.csv through rosters19.csv"


def main() -> None:
    pool = json.loads(POOL_FILE.read_text(encoding="utf-8"))
    rows: list[dict] = []

    for team_id in range(1, 31):
        team = (pool.get("teams") or {}).get(str(team_id)) or {}
        cards = sorted(team.get("historicalPlayers") or [], key=lambda card: int(card.get("pos") or 0))
        if len(cards) != 5:
            raise ValueError(f"team {team_id} must have exactly five historical cards, got {len(cards)}")
        if [int(card.get("pos") or 0) for card in cards] != [1, 2, 3, 4, 5]:
            raise ValueError(f"team {team_id} historical positions must be PG/SG/SF/PF/C")

        for card in cards:
            frozen = copy.deepcopy(card)
            frozen["historicalPeak"] = True
            frozen["peakRating"] = int(frozen.get("rating") or 0)
            frozen["peakSource"] = PEAK_SOURCE
            frozen.setdefault("source", {}).pop("peakTemplate", None)
            rows.append(frozen)

    if len(rows) != 150:
        raise ValueError(f"static peak table must have 150 rows, got {len(rows)}")

    payload = {
        "version": 1,
        "rowCount": len(rows),
        "layout": "30 teams x PG/SG/SF/PF/C",
        "selection": PEAK_SOURCE,
        "sourcePoolGeneratedAt": pool.get("generatedAt", ""),
        "rows": rows,
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {OUT_FILE}")
    print(f"rows={len(rows)} teams={len({row['teamId'] for row in rows})}")


if __name__ == "__main__":
    main()
