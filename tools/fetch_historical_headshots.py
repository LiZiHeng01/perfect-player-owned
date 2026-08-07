#!/usr/bin/env python3
"""Download curated historical headshots from the public NBA CDN.

The pool generator records the NBA player id and a curated local destination.
This script keeps the page self-contained: it downloads the image once and
the browser never needs to request the CDN at runtime. If a CDN image is not
available, the existing local historical cache is retained as a fallback.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
POOL_FILE = ROOT / "assets" / "data" / "perfect-player-pool.json"
CURL_BIN = shutil.which("curl.exe") or shutil.which("curl")


def fetch_one(player: dict, timeout: int) -> tuple[dict, Path | None, bytes | None, str, str]:
    nba_id = int(player.get("nbaId") or 0)
    target_value = str(player.get("photoLocal") or "")
    target = ROOT / target_value if target_value else None
    if not nba_id or not target_value or target is None:
        return player, target, None, "skip", "missing nba id or target"
    url = f"https://cdn.nba.com/headshots/nba/latest/1040x760/{nba_id}.png"
    request = Request(url, headers={"User-Agent": "PerfectPlayer/1.0 (static game asset fetch)"})
    try:
        if CURL_BIN:
            fd, temp_name = tempfile.mkstemp(suffix=".png")
            os.close(fd)
            Path(temp_name).unlink(missing_ok=True)
            try:
                subprocess.run(
                    [CURL_BIN, "-L", "--fail", "--silent", "--show-error", "--max-time", str(timeout), "-A", "PerfectPlayer/1.0", "-o", temp_name, url],
                    check=True,
                    timeout=timeout + 5,
                    capture_output=True,
                )
                data = Path(temp_name).read_bytes()
            finally:
                Path(temp_name).unlink(missing_ok=True)
        else:
            with urlopen(request, timeout=timeout) as response:
                data = response.read()
        if not data.startswith(b"\x89PNG"):
            raise ValueError("response is not a PNG")
        return player, target, data, "download", url
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
        return player, target, None, "failed", str(exc)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="redownload existing curated files")
    parser.add_argument("--timeout", type=int, default=20)
    args = parser.parse_args()

    payload = json.loads(POOL_FILE.read_text(encoding="utf-8"))
    players = [
        player
        for team in payload.get("teams", {}).values()
        for player in team.get("players", [])
        if player.get("source", {}).get("kind") == "historical"
    ]
    unique_players = {}
    players_by_target = {}
    for player in players:
        target_value = str(player.get("photoLocal") or "")
        if not target_value or target_value in unique_players:
            if target_value:
                players_by_target.setdefault(target_value, []).append(player)
            continue
        unique_players[target_value] = player
        players_by_target[target_value] = [player]
    downloaded = 0
    skipped = 0
    fallback = 0
    failed = []
    jobs = []
    for target_value, player in unique_players.items():
        target = ROOT / target_value
        if target.exists() and not args.refresh:
            nba_id = int(player.get("nbaId") or 0)
            if nba_id:
                detail = f"https://cdn.nba.com/headshots/nba/latest/1040x760/{nba_id}.png"
                for same_image in players_by_target.get(target_value, [player]):
                    same_image["photoSource"] = "nba-cdn"
                    same_image["photoUrl"] = detail
            skipped += 1
            continue
        jobs.append((target_value, player))

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(fetch_one, player, args.timeout) for _, player in jobs]
        for future in as_completed(futures):
            player, target, data, status, detail = future.result()
            target_value = str(player.get("photoLocal") or "")
            if status == "download" and target is not None and data is not None:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                for same_image in players_by_target.get(target_value, [player]):
                    same_image["photoSource"] = "nba-cdn"
                    same_image["photoUrl"] = detail
                
                downloaded += 1
            elif status == "failed":
                fallback_path = str(player.get("fallbackPhotoLocal") or "")
                for same_image in players_by_target.get(target_value, [player]):
                    if fallback_path and (ROOT / fallback_path).exists():
                        same_image["photoLocal"] = fallback_path
                        same_image["photoSource"] = "local-historical-cache"
                        fallback += 1
                failed.append(f"{player.get('nameEn') or player.get('name')}: {detail}")
            else:
                skipped += 1

    POOL_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"historical={len(players)} unique={len(unique_players)} downloaded={downloaded} skipped={skipped} fallback={fallback}")
    if failed:
        print("unavailable:")
        for message in failed[:30]:
            print(f"- {message}")


if __name__ == "__main__":
    main()
