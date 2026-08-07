#!/usr/bin/env python3
"""Build the curated player source pool used by Perfect Player.

Each NBA team receives a compact 15-player pool: 12 current players and
3 historical All-Star-or-better players whenever the source data contains
enough candidates. Historical source rows are kept with their era metadata
so the browser can draw year -> team -> player for every attribute round.
"""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "assets" / "data"
HIST_DIR = DATA_DIR / "historical"
OUT_FILE = DATA_DIR / "perfect-player-pool.json"

TEAM_NAMES = {
    1: "凯尔特人", 2: "篮网", 3: "尼克斯", 4: "76人", 5: "猛龙",
    6: "公牛", 7: "骑士", 8: "活塞", 9: "步行者", 10: "雄鹿",
    11: "老鹰", 12: "黄蜂", 13: "热火", 14: "魔术", 15: "奇才",
    16: "掘金", 17: "森林狼", 18: "雷霆", 19: "开拓者", 20: "爵士",
    21: "勇士", 22: "快船", 23: "湖人", 24: "太阳", 25: "国王",
    26: "独行侠", 27: "火箭", 28: "灰熊", 29: "鹈鹕", 30: "马刺",
}

TEAM_ALIASES = {
    "小牛": 26,
    "达拉斯小牛": 26,
    "超音速": 18,
    "西雅图超音速": 18,
    "子弹": 15,
    "华盛顿子弹": 15,
    "山猫": 12,
    "夏洛特黄蜂": 12,
}

NBA_NAME_ALIASES = {
    "earvinjohnson": "magicjohnson",
    "nicolasclaxton": "nicclaxton",
    "mohamedbamba": "mobamba",
    "craigporter": "craigporterjr",
    "marvinbagley": "marvinbagleyiii",
    "robertwilliams": "robertwilliamsiii",
    "jimmybutler": "jimmybutleriii",
}

SEASONS = [
    {"code": 1, "year": 2025, "label": "2025-26", "file": "rosters01.csv", "kind": "current"},
    {"code": 2, "year": 2024, "label": "2024-25", "file": "rosters02.csv", "kind": "historical"},
    {"code": 3, "year": 2023, "label": "2023-24", "file": "rosters03.csv", "kind": "historical"},
    {"code": 4, "year": 2022, "label": "2022-23", "file": "rosters04.csv", "kind": "historical"},
    {"code": 5, "year": 2021, "label": "2021-22", "file": "rosters05.csv", "kind": "historical"},
    {"code": 6, "year": 2020, "label": "2020-21", "file": "rosters06.csv", "kind": "historical"},
    {"code": 7, "year": 2019, "label": "2019-20", "file": "rosters07.csv", "kind": "historical"},
    {"code": 8, "year": 2018, "label": "2018-19", "file": "rosters08.csv", "kind": "historical"},
    {"code": 9, "year": 2017, "label": "2017-18", "file": "rosters09.csv", "kind": "historical"},
    {"code": 10, "year": 2016, "label": "2016-17", "file": "rosters10.csv", "kind": "historical"},
    {"code": 11, "year": 2011, "label": "2011-12", "file": "rosters11.csv", "kind": "historical"},
    {"code": 12, "year": 2009, "label": "2009-10", "file": "rosters12.csv", "kind": "historical"},
    {"code": 13, "year": 2005, "label": "2005-06", "file": "rosters13.csv", "kind": "historical"},
    {"code": 14, "year": 2003, "label": "2003-04", "file": "rosters14.csv", "kind": "historical"},
    {"code": 15, "year": 1996, "label": "1996-97", "file": "rosters15.csv", "kind": "historical"},
    {"code": 16, "year": 1983, "label": "1983-84", "file": "rosters16.csv", "kind": "historical"},
    {"code": 17, "year": 1970, "label": "1970-71", "file": "rosters17.csv", "kind": "historical"},
    {"code": 18, "year": 1960, "label": "1960-61", "file": "rosters18.csv", "kind": "historical"},
    {"code": 19, "year": 1957, "label": "1957-58", "file": "rosters19.csv", "kind": "historical"},
]


def norm(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).casefold()
    return "".join(ch for ch in text if ch.isalnum())


def slug(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).casefold()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "player"


def number(value: object, default: int = 0) -> int:
    try:
        return int(float(str(value or "").strip()))
    except (TypeError, ValueError):
        return default


def team_id(row: dict[str, str]) -> int:
    name = str(row.get("team", "")).strip()
    name_key = norm(name)
    for tid, label in TEAM_NAMES.items():
        if name_key in {norm(label), norm(str(tid))}:
            return tid
    for alias, tid in TEAM_ALIASES.items():
        if name_key == norm(alias):
            return tid
    raw = number(row.get("teamID"))
    return raw if 1 <= raw <= 30 else 0


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle, delimiter=";"))


def load_nba_ids() -> dict[str, int]:
    path = DATA_DIR / "nba-player-images.js"
    text = path.read_text(encoding="utf-8")
    out: dict[str, int] = {}
    pattern = re.compile(r"'((?:\\'|[^'])+)'\s*:\s*(\d+)")
    for match in pattern.finditer(text):
        key = match.group(1).replace("\\'", "'")
        out[norm(key)] = int(match.group(2))
    return out


def load_history_index() -> dict[str, dict]:
    path = HIST_DIR / "players.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    index: dict[str, dict] = {}
    for item in raw.get("players", []):
        keys = [item.get("name"), item.get("displayName"), item.get("nameEn"), item.get("nameCn")]
        keys.extend(item.get("aliases") or [])
        for key in keys:
            if norm(key):
                index[norm(key)] = item
    return index


def honor_snapshot(history: dict | None, year: int, row: dict[str, str]) -> dict[str, int]:
    if history:
        by_year = history.get("honorsFromRosters") or {}
        direct = by_year.get(str(year))
        if isinstance(direct, dict):
            return {k: number(v) for k, v in direct.items()}
        snapshots = [s for s in history.get("rosterSnapshots", []) if number(s.get("startYear")) <= year]
        if snapshots:
            return {k: number(v) for k, v in (snapshots[-1].get("honors") or {}).items()}
    # Older roster rows still carry All-NBA/MVP counters even when the
    # historical DB has no name match.
    return {
        "allStar": number(row.get("allStar")),
        "allNba1": number(row.get("allTeam1")),
        "allNba2": number(row.get("allTeam2")),
        "allNba3": number(row.get("allTeam3")),
        "mvp": number(row.get("mvps")),
        "fmvp": number(row.get("fmvps")),
        "dpoy": number(row.get("dpoy")),
        "rings": number(row.get("rings")),
    }


def star_score(honors: dict[str, int], rating: int) -> float:
    return (
        honors.get("mvp", 0) * 40
        + honors.get("fmvp", 0) * 30
        + honors.get("dpoy", 0) * 24
        + honors.get("allNba1", 0) * 16
        + honors.get("allNba2", 0) * 12
        + honors.get("allNba3", 0) * 9
        + honors.get("allStar", 0) * 10
        + honors.get("rings", 0) * 3
        + max(0, rating - 75) * 0.4
    )


def is_star(honors: dict[str, int], rating: int) -> bool:
    honor_total = sum(honors.get(k, 0) for k in ("allStar", "allNba1", "allNba2", "allNba3", "mvp", "fmvp", "dpoy"))
    return honor_total > 0 or rating >= 88


def player_record(row: dict[str, str], source: dict, history: dict | None, nba_ids: dict[str, int], index: int) -> dict:
    tid = team_id(row)
    pos = max(1, min(5, number(row.get("positionFirst"), 3)))
    physique = number(row.get("skillPhysique"), 55)
    speed_bias = {1: 6, 2: 3, 3: 0, 4: -4, 5: -8}.get(pos, 0)
    strength_bias = {1: -6, 2: -3, 3: 0, 4: 4, 5: 8}.get(pos, 0)
    rating = number(row.get("ATT"), -1)
    defense = number(row.get("DEF"), -1)
    if rating >= 0 and defense >= 0:
        rating = round((rating + defense) / 2)
    else:
        values = [number(row.get(k), 55) for k in ("skillPass", "skillShotInterior", "skillShotExterior", "skillShotFree", "skillPhysique", "skillBlock", "skillRebound", "skillSteal")]
        rating = round(sum(values) / len(values))
    name = str(row.get("name") or row.get("nameBirth") or "未知球员").strip()
    english = str(row.get("nameBirth") or row.get("altName") or name).strip()
    english_key = norm(english)
    nba_id = nba_ids.get(english_key) or nba_ids.get(norm(name))
    if not nba_id:
        nba_id = nba_ids.get(NBA_NAME_ALIASES.get(english_key, ""), 0)
    fallback_photo = (history or {}).get("photoLocal", "")
    if fallback_photo and not (ROOT / fallback_photo).exists():
        fallback_photo = ""
    history_photo = fallback_photo
    current_photo = ""
    if source["kind"] == "current" and nba_id:
        current_photo = f"assets/images/Player/hupu-current/{slug(english)}.png"
    if source["kind"] == "historical" and nba_id:
        history_photo = f"assets/images/Player/historical-nba/{slug(english)}.png"
    photo_url = ""
    if nba_id:
        # 虎扑 BuildPlayer 的 getPlayerHeadshotStyle 使用 NBA player ID，
        # 现役头像固定走 260x190；历史名宿继续使用已缓存的高清图。
        size = "260x190" if source["kind"] == "current" else "1040x760"
        photo_url = f"https://cdn.nba.com/headshots/nba/latest/{size}/{nba_id}.png"
    # Resolve the best usable image path. Many historical local caches were never
    # shipped, so a photoLocal that doesn't exist on disk would render blank in the
    # browser. When the local file is missing, fall back to the NBA CDN URL so the
    # avatar still loads. (Current players' local cache exists and is kept.)
    resolved_local = current_photo or history_photo
    if resolved_local and not (ROOT / resolved_local).exists():
        resolved_local = photo_url or ""
    honors = honor_snapshot(history, source["year"], row)
    identity = (history or {}).get("realId") or norm(english) or norm(name)
    return {
        "id": number(row.get("id"), index),
        "uid": f"pp_{source['code']}_{tid}_{identity}_{index}",
        # Stable cross-season identity (no row index) so the same person can be
        # deduped to a single peak entry regardless of which season row we see.
        "identity": identity,
        "name": name,
        "nameCn": name,
        "nameEn": english,
        "altName": english,
        "teamId": tid,
        "pos": pos,
        "pos2": max(0, min(5, number(row.get("positionSecond")))),
        "rating": max(40, min(99, rating)),
        "age": number(row.get("age"), 24),
        "yearsLeague": number(row.get("yearsLeague")),
        "image": number(row.get("image")),
        "photoLocal": resolved_local,
        "fallbackPhotoLocal": fallback_photo,
        "photoUrl": photo_url,
        "photoSource": "hupu-buildplayer-nba-cdn" if source["kind"] == "current" and nba_id else ("nba-cdn" if nba_id else ("local-historical-cache" if history_photo else "initial-fallback")),
        "nbaId": nba_id or 0,
        "attrs": {
            "pass": number(row.get("skillPass"), 55),
            "shotInt": number(row.get("skillShotInterior"), 55),
            "shotExt": number(row.get("skillShotExterior"), 55),
            "shotFree": number(row.get("skillShotFree"), 55),
            "physique": physique,
            "blk": number(row.get("skillBlock"), 55),
            "reb": number(row.get("skillRebound"), 55),
            "stl": number(row.get("skillSteal"), 55),
            "speed": max(25, min(99, physique + speed_bias)),
            "strength": max(25, min(99, physique + strength_bias)),
        },
        "honors": honors,
        "source": {
            "kind": source["kind"],
            "code": source["code"],
            "year": source["year"],
            "label": source["label"],
            "file": source["file"],
        },
        "starScore": round(star_score(honors, rating), 2),
    }


def main() -> None:
    history_index = load_history_index()
    nba_ids = load_nba_ids()
    rows_by_source: dict[int, list[dict]] = {}
    for source in SEASONS:
        rows_by_source[source["code"]] = load_csv(DATA_DIR / source["file"])

    # rosters19.csv (labeled 1957-58) is NOT a real season roster — it is an
    # all-time compilation that mixes every era's legends at INFLATED ratings
    # (Jordan 101, Duncan DEF 104, LeBron 100) under a bogus 1957-58 label.
    # Using it as a normal season made modern legends resolve to that fake card.
    # We keep it only as a LAST-RESORT source for genuine early-era players who
    # appear in no real season file; everyone else uses their real-season peak.
    ALLTIME_CODE = 19

    current_by_team: dict[int, list[dict]] = defaultdict(list)
    # Global peak lookup: identity -> best REAL-season historical record.
    historical_peak: dict[str, dict] = {}
    # Fallback lookup from the all-time file, used only for identities missing above.
    alltime_peak: dict[str, dict] = {}

    def consider_peak(store: dict, record: dict) -> None:
        # Peak = highest per-season RATING (2K ATT/DEF avg, a genuine per-year
        # ability snapshot), tie -> EARLIER year (the prime, not a late-career
        # defensive echo), tie -> honors. Why not cumulative starScore: it always
        # favored late seasons, so legends showed up in end-of-career form
        # (e.g. 加内特/皮尔斯 as 2009-10 Celtics instead of their real primes).
        key = record["identity"]
        old = store.get(key)
        cand = (record["rating"], -record["source"]["year"], record["starScore"])
        if old is None or cand > (old["rating"], -old["source"]["year"], old["starScore"]):
            store[key] = record

    for source in SEASONS:
        for index, row in enumerate(rows_by_source[source["code"]], start=1):
            tid = team_id(row)
            if tid not in TEAM_NAMES or not str(row.get("name", "")).strip():
                continue
            history = history_index.get(norm(row.get("nameBirth"))) or history_index.get(norm(row.get("name")))
            record = player_record(row, source, history, nba_ids, index)
            if source["kind"] == "current":
                current_by_team[tid].append(record)
                continue
            if not is_star(record["honors"], record["rating"]):
                continue
            consider_peak(alltime_peak if source["code"] == ALLTIME_CODE else historical_peak, record)

    # Fill in legends who appear nowhere in real seasons (their prime predates or
    # falls between our roster files). The all-time card has placeholder metadata
    # and a bogus 1957-58 label, so relabel it honestly as "生涯巅峰" (Career Peak)
    # rather than pinning e.g. 德里克-罗斯 to 1957.
    for key, record in alltime_peak.items():
        if key not in historical_peak:
            record["source"] = dict(record["source"])
            record["source"]["label"] = "生涯巅峰"
            historical_peak[key] = record

    # Current players are the live 2025-26 rosters; any historical entry that is the
    # same person as a current player must be dropped (a legend still playing is
    # represented by his current card, never by an old season).
    current_identities = set()
    for records in current_by_team.values():
        for rec in records:
            current_identities.add(rec["identity"])

    # Assign each unique historical legend to the team where he peaked.
    historical_by_team: dict[int, list[dict]] = defaultdict(list)
    dropped_current = 0
    for rec in historical_peak.values():
        if rec["identity"] in current_identities:
            dropped_current += 1
            continue
        historical_by_team[rec["teamId"]].append(rec)

    teams: dict[str, dict] = {}
    warnings: list[str] = []
    for tid, label in TEAM_NAMES.items():
        current = sorted(current_by_team[tid], key=lambda p: (-p["rating"], p["nameEn"]))
        # Top-3 legends per team by peak rating (then honors), so each team keeps
        # its highest-ability primes rather than its most-decorated late seasons.
        history = sorted(historical_by_team[tid], key=lambda p: (-p["rating"], -p["starScore"], p["nameEn"]))
        current_take = current[:12]
        history_take = history[:3]
        if len(current_take) < 12:
            warnings.append(f"{label}: current={len(current_take)}")
        if len(history_take) < 3:
            warnings.append(f"{label}: historical={len(history_take)}")
        teams[str(tid)] = {
            "id": tid,
            "name": label,
            "currentCount": len(current_take),
            "historicalCount": len(history_take),
            "players": current_take + history_take,
        }
    print(f"historical unique legends kept={sum(len(v) for v in historical_by_team.values())} dropped_as_current={dropped_current}")

    payload = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rules": {
            "targetRosterSize": 15,
            "currentTarget": 12,
            "historicalTarget": 3,
            "historicalThreshold": "All-Star or better",
        },
        "seasons": SEASONS,
        "teams": teams,
        "warnings": warnings,
        "photoPolicy": {
            "current": "Hupu BuildPlayer NBA_PLAYER_IMAGES -> NBA CDN 260x190 headshot",
            "historical": "Local NBA CDN 1040x760 cache",
            "fallback": "assets/data/historical/headshots local cache",
        },
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_FILE}")
    print(f"teams={len(teams)} players={sum(len(t['players']) for t in teams.values())}")
    if warnings:
        print("warnings:")
        for warning in warnings:
            print(f"- {warning}")


if __name__ == "__main__":
    main()
