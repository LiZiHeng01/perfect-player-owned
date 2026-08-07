#!/usr/bin/env python3
"""Cache the current-player headshots used by Hupu BuildPlayer.

Hupu's published BuildPlayer page resolves NBA_PLAYER_IMAGES to the NBA CDN's
260x190 headshot endpoint.  The game keeps that URL in the pool for provenance
and ships a local copy so GitHub Pages still renders every roster card when the
CDN is rate-limited or unavailable.
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
POOL_FILE = ROOT / "assets" / "data" / "perfect-player-pool.json"
def download(url: str, target: Path) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 128:
        return True
    try:
        request = Request(url, headers={"User-Agent": "PerfectPlayer/1.0 (Hupu BuildPlayer asset cache)"})
        with urlopen(request, timeout=30) as response:
            data = response.read()
        if len(data) <= 128:
            print(f"warning: {url}: response too small")
            return False
        target.write_bytes(data)
        return True
    except OSError as error:
        print(f"warning: {url}: {error}")
        return False


def main() -> None:
    payload = json.loads(POOL_FILE.read_text(encoding="utf-8"))
    total = 0
    cached = 0
    failed = 0
    seen: set[str] = set()
    for team in payload.get("teams", {}).values():
        for player in team.get("players", []):
            if (player.get("source") or {}).get("kind") != "current":
                continue
            url = str(player.get("photoUrl") or "")
            relative = str(player.get("photoLocal") or "")
            if not url or not relative or relative in seen:
                continue
            seen.add(relative)
            total += 1
            if download(url, ROOT / relative):
                cached += 1
            else:
                failed += 1
    print(f"current headshots: {cached}/{total} cached; failed={failed}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
