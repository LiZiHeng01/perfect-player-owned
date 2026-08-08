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
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
POOL_FILE = ROOT / "assets" / "data" / "perfect-player-pool.json"
HISTORICAL_DB_FILE = ROOT / "assets" / "data" / "historical" / "players.json"
HISTORICAL_HEADSHOT_DIR = ROOT / "assets" / "data" / "historical" / "headshots"
HISTORICAL_CACHE_DIR = ROOT / "assets" / "images" / "Player" / "historical-nba"
CURL_BIN = shutil.which("curl.exe") or shutil.which("curl")
NBA_PLACEHOLDER_SHA256 = "e366885fc4212e3a4100f49ed48ad866fd05b32e2d25898c2c24205e789e2632"  # NBA CDN's 1040x760 gray silhouette

# Drazen Petrovic is one of the curated Hall of Fame cards, but the NBA CDN
# returns its generic silhouette for the legacy id. Wikimedia Commons provides
# a real Nets portrait that can be shipped locally instead.
PUBLIC_PORTRAIT_URLS = {
    "drazenpetrovic": "https://commons.wikimedia.org/wiki/Special:FilePath/Lipofsky-JDra%C5%BEen%20Petrovi%C4%87.jpg?width=512",
    "philchenier": "https://commons.wikimedia.org/wiki/Special:FilePath/Phil%20Chenier.jpg?width=512",
}


def norm(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).casefold()
    return "".join(ch for ch in text if ch.isalnum())


def is_placeholder_bytes(data: bytes | None) -> bool:
    if not data:
        return True
    return len(data) == 12430 and hashlib.sha256(data).hexdigest() == NBA_PLACEHOLDER_SHA256


def is_usable_file(path: Path | None) -> bool:
    if path is None or not path.exists() or not path.is_file():
        return False
    try:
        return not is_placeholder_bytes(path.read_bytes())
    except OSError:
        return False


def load_fallback_index() -> dict[str, Path]:
    """Index shipped historical portraits by normalized player token."""
    index: dict[str, Path] = {}
    if HISTORICAL_HEADSHOT_DIR.exists():
        files = sorted(HISTORICAL_HEADSHOT_DIR.glob("*.png"), key=lambda item: (not item.name.startswith("local-"), item.name))
        for file in files:
            if not is_usable_file(file):
                continue
            stem = file.stem
            token = stem.split("-", 2)[-1] if stem.startswith("draft-") else stem.removeprefix("local-")
            token = norm(token)
            if token and token not in index:
                index[token] = file
    if HISTORICAL_DB_FILE.exists():
        try:
            raw = json.loads(HISTORICAL_DB_FILE.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            raw = {}
        for item in raw.get("players", []):
            photo = str(item.get("photoLocal") or "")
            candidate = ROOT / photo if photo else None
            if not is_usable_file(candidate):
                continue
            keys = [item.get("name"), item.get("displayName"), item.get("nameEn"), *(item.get("aliases") or [])]
            for key in keys:
                token = norm(key)
                if token and token not in index:
                    index[token] = candidate
    return index


def resolve_fallback(player: dict, fallback_index: dict[str, Path]) -> Path | None:
    candidates = [player.get("nameEn"), player.get("name"), player.get("altName")]
    explicit = str(player.get("fallbackPhotoLocal") or "")
    if explicit:
        candidates.insert(0, explicit)
    for value in candidates:
        if str(value).startswith("assets/"):
            path = ROOT / str(value)
            if is_usable_file(path):
                return path
        token = norm(value)
        if token in fallback_index:
            return fallback_index[token]
    # Short historical display name -> full legal name in the source cache.
    aliases = {"normnixon": "normanellardnixon"}
    alias = aliases.get(norm(player.get("nameEn")))
    if alias and alias in fallback_index:
        return fallback_index[alias]
    return None


def set_local_source(players: list[dict], source: str, detail: str = "") -> None:
    for player in players:
        player["photoSource"] = source
        if detail:
            player["photoUrl"] = detail


def repair_shipped_cache(fallback_index: dict[str, Path]) -> int:
    """Repair legacy placeholder files even when those players left the pool."""
    repaired = 0
    if not HISTORICAL_CACHE_DIR.exists():
        return repaired
    aliases = {"normnixon": "normanellardnixon"}
    for target in HISTORICAL_CACHE_DIR.glob("*.png"):
        if is_usable_file(target):
            continue
        token = norm(target.stem)
        fallback = fallback_index.get(token) or fallback_index.get(aliases.get(token, ""))
        if not fallback or fallback.resolve() == target.resolve():
            public_url = PUBLIC_PORTRAIT_URLS.get(token)
            if not public_url:
                continue
            try:
                request = Request(public_url, headers={"User-Agent": "PerfectPlayer/1.0 (static game asset fetch)"})
                with urlopen(request, timeout=30) as response:
                    data = response.read()
                if not data.startswith(b"\x89PNG") and not data.startswith(b"\xff\xd8"):
                    continue
                if is_placeholder_bytes(data):
                    continue
                target.write_bytes(data)
                repaired += 1
            except (HTTPError, URLError, TimeoutError, OSError):
                continue
            continue
        shutil.copyfile(fallback, target)
        repaired += 1
    return repaired


def fetch_one(player: dict, timeout: int) -> tuple[dict, Path | None, bytes | None, str, str]:
    nba_id = int(player.get("nbaId") or 0)
    target_value = str(player.get("photoLocal") or "")
    target = ROOT / target_value if target_value else None
    if not nba_id or not target_value or target is None:
        return player, target, None, "skip", "missing nba id or target"
    player_key = norm(player.get("nameEn") or player.get("name") or "")
    url = PUBLIC_PORTRAIT_URLS.get(player_key) or f"https://cdn.nba.com/headshots/nba/latest/1040x760/{nba_id}.png"
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
        if not data.startswith(b"\x89PNG") and not data.startswith(b"\xff\xd8"):
            raise ValueError("response is not a PNG/JPEG")
        if is_placeholder_bytes(data):
            raise ValueError("NBA CDN returned its gray placeholder")
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
    players = []
    for team in payload.get("teams", {}).values():
        players.extend(team.get("players", []))
        players.extend(team.get("historicalPlayers", []))
    players = [player for player in players if player.get("source", {}).get("kind") == "historical"]
    fallback_index = load_fallback_index()
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
    repaired = 0
    failed = []
    jobs = []
    for target_value, player in unique_players.items():
        target = ROOT / target_value
        same_players = players_by_target.get(target_value, [player])
        fallback_path = resolve_fallback(player, fallback_index)
        if target.exists() and not is_usable_file(target) and fallback_path and fallback_path.resolve() != target.resolve():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(fallback_path, target)
            set_local_source(same_players, "local-historical-fallback", str(fallback_path.relative_to(ROOT)).replace("\\", "/"))
            repaired += 1
            continue
        if is_usable_file(target) and not args.refresh:
            nba_id = int(player.get("nbaId") or 0)
            if nba_id:
                detail = f"https://cdn.nba.com/headshots/nba/latest/1040x760/{nba_id}.png"
                set_local_source(same_players, "nba-cdn", detail)
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
                source = "public-portrait" if "commons.wikimedia.org" in detail else "nba-cdn"
                set_local_source(players_by_target.get(target_value, [player]), source, detail)
                downloaded += 1
            elif status == "failed":
                fallback_path = resolve_fallback(player, fallback_index)
                same_players = players_by_target.get(target_value, [player])
                if fallback_path and target is not None and fallback_path.resolve() != target.resolve():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(fallback_path, target)
                    set_local_source(same_players, "local-historical-fallback", str(fallback_path.relative_to(ROOT)).replace("\\", "/"))
                    fallback += 1
                failed.append(f"{player.get('nameEn') or player.get('name')}: {detail}")
            else:
                skipped += 1

    repaired_cache = repair_shipped_cache(fallback_index)
    POOL_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"historical={len(players)} unique={len(unique_players)} downloaded={downloaded} repaired={repaired} legacy_cache_repaired={repaired_cache} skipped={skipped} fallback={fallback}")
    if failed:
        print("unavailable:")
        for message in failed[:30]:
            print(f"- {message}")


if __name__ == "__main__":
    main()
