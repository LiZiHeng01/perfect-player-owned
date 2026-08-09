#!/usr/bin/env python3
"""Build the curated player source pool used by Perfect Player.

Each NBA team receives a compact 12-player current attribute pool plus five
historical surprise cards. The 150 historical cards come from a fixed peak
table; this normal build never rescans rosters01-rosters19 to recalculate them.
"""

from __future__ import annotations

import copy
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
PEAK_TABLE_FILE = DATA_DIR / "perfect-player-historical-peak-table.json"

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

# The current Pelicans franchise inherits the New Orleans/Charlotte Hornets
# history, while the compact historical source rows often classify those cards
# under Charlotte.  Use that franchise bridge only when a team cannot fill six
# unique peak cards from its direct rows.
HISTORICAL_FRANCHISE_FALLBACKS = {
    29: [12],  # 鹈鹕 ← 山猫/夏洛特黄蜂历史
}

NBA_NAME_ALIASES = {
    "earvinjohnson": "magicjohnson",
    "nicolasclaxton": "nicclaxton",
    "mohamedbamba": "mobamba",
    "craigporter": "craigporterjr",
    "marvinbagley": "marvinbagleyiii",
    "robertwilliams": "robertwilliamsiii",
    "jimmybutler": "jimmybutleriii",
    "edriceadebayo": "bamadebayo",
}

# The historical surprise cards are deliberately curated instead of using the
# old "best by rating" rule.  This keeps the surprise pool recognizable:
# first use actual Naismith Basketball Hall of Fame players, then use a small
# modern All-Star fallback when a franchise cannot supply five Hall of Famers.
# Every retained card is a peak card.  For each identity eligible for the
# 150-card historical pool, choose the highest per-season attribute rating
# found across the complete rosters01.csv-rosters19.csv source range.  No
# single roster is treated as an automatic prime-version template.
# The set is matched against the English identity after normalization below.
HALL_OF_FAME_NAMES = {
    "Adrian Dantley", "Alex English", "Allen Iverson", "Alonzo Mourning",
    "Amar'e Stoudemire", "Artis Gilmore", "Arvydas Sabonis", "Bailey Howell", "Ben Wallace",
    "Bernard King", "Bill Russell", "Bill Sharman", "Bill Walton", "Billy Cunningham", "Bob Cousy",
    "Bob Dandridge", "Bob Lanier", "Bob McAdoo", "Bob Pettit", "Calvin Murphy",
    "Carmelo Anthony", "Chauncey Billups", "Charles Barkley", "Chris Bosh",
    "Chris Webber", "Clyde Drexler", "Cliff Hagan", "Connie Hawkins",
    "Dave Bing", "David Robinson", "Dikembe Mutombo", "Dirk Nowitzki",
    "Dan Issel", "Dave DeBusschere", "David Thompson", "Dennis Rodman", "Dolph Schayes", "Drazen Petrovic", "Dwight Howard", "Dwyane Wade",
    "Earl Monroe", "Earvin Johnson", "Elgin Baylor", "Elvin Hayes",
    "Gary Payton", "George Gervin", "George Mikan", "Grant Hill",
    "Hakeem Olajuwon", "Hal Greer", "Isiah Thomas", "Jack Sikma", "Joe Dumars",
    "James Worthy", "Jason Kidd", "Jerry Lucas", "Jerry West",
    "John Havlicek", "John Stockton", "Julius Erving", "Kareem Abdul-Jabbar",
    "Karl Malone", "Kevin Garnett", "Kevin McHale", "Kobe Bryant", "Larry Bird",
    "Lenny Wilkens", "Lou Hudson", "Louie Dampier", "Magic Johnson",
    "Mel Daniels", "Michael Cooper", "Michael Jordan", "Moses Malone",
    "Nate Archibald", "Nate Thurmond", "Oscar Robertson", "Patrick Ewing",
    "Paul Arizin", "Paul Pierce", "Pau Gasol", "Pete Maravich",
    "Ray Allen", "Reggie Miller", "Rick Barry", "Robert Parish",
    "Scottie Pippen", "Shaquille O'Neal", "Sidney Moncrief", "Steve Nash",
    "Tim Duncan", "Tim Hardaway", "Tony Parker", "Tracy McGrady", "Vince Carter",
    "Walt Frazier", "Wes Unseld", "Willis Reed", "Wilt Chamberlain", "Yao Ming",
    "Dominique Wilkins", "Mitch Richmond",
}

# Modern fallback cards (Jordan era and later).  These are not treated as
# Hall of Famers in the UI; they are only used when a franchise has fewer than
# five Hall of Fame player cards available in the source data.
MODERN_ALL_STAR_NAMES = {
    "Al Jefferson", "Anfernee Hardaway", "Antawn Jamison", "Ben Simmons",
    "Brad Daugherty", "Chris Paul", "Damon Stoudamire", "DeMarcus Cousins",
    "DeMar DeRozan", "Deron Williams", "Derrick Rose", "Elton Brand",
    "Glen Rice", "Gilbert Arenas", "Jermaine O'Neal", "Joe Johnson",
    "John Wall", "Kawhi Leonard", "Kemba Walker", "Kevin Love",
    "Kyrie Irving", "Kiki Vandeweghe", "LaMarcus Aldridge", "Lafayette Lever",
    "Marc Gasol", "Mark Eaton", "Mark Price", "Mike Conley",
    "Rasheed Wallace", "Reggie Theus", "Rolando Blackman", "Sam Cassell",
    "Isaiah Thomas", "Terrell Brandon", "Tom Chambers", "Victor Oladipo", "Zach Randolph", "Zach LaVine",
}

# These two cards were previously visible because the old pool selected any
# high-rated historical row.  They are neither Hall of Fame players nor part
# of the curated modern fallback, so they must never enter the five-card
# historical surprise pool.
HISTORICAL_EXCLUDED_NAMES = {
    "Terry Cummings", "Norm Nixon", "Norman Ellard Nixon",
}

HISTORICAL_NAME_ALIASES = {
    # The compact roster CSV uses the short display name while the historical
    # database stores the full legal name.
    "normnixon": "normanellardnixon",
}

HISTORICAL_LEGACY_NAME_FIXES = {
    # The source CSV spells Detroit's Hall of Fame guard as "Isaiah Thomas",
    # which collides with the later Boston/Celtics All-Star. The 1983-84 and
    # all-time rows are the former, whose NBA image id is 78318.
    (16, "isaiahthomas"): ("Isiah Thomas", 78318),
    (19, "isaiahthomas"): ("Isiah Thomas", 78318),
}

HISTORICAL_MODERN_START_YEAR = 1984
HISTORICAL_PEAK_SOURCE = "highest rating for each player across rosters01.csv through rosters19.csv"

# One real franchise representative for each basketball position.  Names are
# resolved to the player's best peak card below; the slot position is explicit
# because several combo forwards/guards changed primary position by season.
HISTORICAL_POSITION_LINEUPS = {
    1: ["Bob Cousy", "John Havlicek", "Larry Bird", "Kevin McHale", "Bill Russell"],
    2: ["Jason Kidd", "Vince Carter", "Julius Erving", "Buck Williams", "Brook Lopez"],
    3: ["Walt Frazier", "Allan Houston", "Carmelo Anthony", "Dave DeBusschere", "Patrick Ewing"],
    4: ["Allen Iverson", "Hal Greer", "Julius Erving", "Charles Barkley", "Wilt Chamberlain"],
    5: ["Kyle Lowry", "DeMar DeRozan", "Kawhi Leonard", "Chris Bosh", "Marc Gasol"],
    6: ["Derrick Rose", "Michael Jordan", "Scottie Pippen", "Dennis Rodman", "Artis Gilmore"],
    7: ["Mark Price", "Kyrie Irving", "LeBron James", "Kevin Love", "Brad Daugherty"],
    8: ["Isiah Thomas", "Joe Dumars", "Grant Hill", "Dennis Rodman", "Ben Wallace"],
    9: ["Mark Jackson", "Reggie Miller", "Paul George", "Jermaine O'Neal", "Mel Daniels"],
    10: ["Oscar Robertson", "Sidney Moncrief", "Marques Johnson", "Giannis Antetokounmpo", "Kareem Abdul-Jabbar"],
    11: ["Lenny Wilkens", "Pete Maravich", "Dominique Wilkins", "Bob Pettit", "Dikembe Mutombo"],
    12: ["Kemba Walker", "Eddie Jones", "Glen Rice", "Larry Johnson", "Alonzo Mourning"],
    13: ["Tim Hardaway", "Dwyane Wade", "LeBron James", "Chris Bosh", "Shaquille O'Neal"],
    14: ["Anfernee Hardaway", "Nick Anderson", "Tracy McGrady", "Rashard Lewis", "Dwight Howard"],
    15: ["Gilbert Arenas", "Earl Monroe", "Bernard King", "Elvin Hayes", "Wes Unseld"],
    16: ["Lafayette Lever", "David Thompson", "Alex English", "Dan Issel", "Nikola Jokic"],
    17: ["Sam Cassell", "Anthony Edwards", "Jimmy Butler", "Kevin Garnett", "Karl-Anthony Towns"],
    18: ["Shai Gilgeous-Alexander", "Ray Allen", "Kevin Durant", "Shawn Kemp", "Jack Sikma"],
    19: ["Damian Lillard", "Clyde Drexler", "Jerome Kersey", "LaMarcus Aldridge", "Bill Walton"],
    20: ["John Stockton", "Donovan Mitchell", "Adrian Dantley", "Karl Malone", "Rudy Gobert"],
    21: ["Stephen Curry", "Klay Thompson", "Kevin Durant", "Draymond Green", "Wilt Chamberlain"],
    22: ["Chris Paul", "Paul George", "Kawhi Leonard", "Blake Griffin", "Bob McAdoo"],
    23: ["Earvin Johnson", "Kobe Bryant", "LeBron James", "Anthony Davis", "Kareem Abdul-Jabbar"],
    24: ["Steve Nash", "Devin Booker", "Shawn Marion", "Charles Barkley", "Amar'e Stoudemire"],
    25: ["Oscar Robertson", "Mitch Richmond", "Peja Stojakovic", "Chris Webber", "DeMarcus Cousins"],
    26: ["Luka Doncic", "Rolando Blackman", "Mark Aguirre", "Dirk Nowitzki", "Tyson Chandler"],
    27: ["Calvin Murphy", "James Harden", "Tracy McGrady", "Elvin Hayes", "Hakeem Olajuwon"],
    28: ["Mike Conley", "Tony Allen", "Rudy Gay", "Zach Randolph", "Marc Gasol"],
    29: ["Chris Paul", "Jrue Holiday", "Brandon Ingram", "Zion Williamson", "Anthony Davis"],
    30: ["Tony Parker", "George Gervin", "Kawhi Leonard", "Tim Duncan", "David Robinson"],
}

# A handful of very early players predate the NBA CDN name/ID mapping. Keep
# their shipped local headshot as the primary asset instead of turning a local
# path into a remote URL during pool generation.
HISTORICAL_PHOTO_OVERRIDES = {
    "louiedampier": "assets/data/historical/headshots/draft-1967-louiedampier.png",
    "bobnetolicky": "assets/data/historical/headshots/draft-1967-bobnetolicky.png",
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


CURATED_POSITION_KEYS = {norm(name) for lineup in HISTORICAL_POSITION_LINEUPS.values() for name in lineup}
HALL_OF_FAME_KEYS = {norm(name) for name in HALL_OF_FAME_NAMES}
MODERN_ALL_STAR_KEYS = {norm(name) for name in MODERN_ALL_STAR_NAMES}
HISTORICAL_EXCLUDED_KEYS = {norm(name) for name in HISTORICAL_EXCLUDED_NAMES}


def historical_tier(record: dict) -> str:
    """Return the historical surprise tier for a peak card, or an empty string."""
    keys = {
        norm(record.get("nameEn")),
        norm(record.get("altName")),
        norm(record.get("identity")),
    }
    if keys & HISTORICAL_EXCLUDED_KEYS:
        return ""
    if keys & HALL_OF_FAME_KEYS:
        return "hall-of-fame"
    source_year = number((record.get("source") or {}).get("year"))
    # rosters19 is the all-time compilation and is stamped 1957 even for
    # Jordan-era players. The curated name set is the era guard for that file.
    source = record.get("source") or {}
    modern_card = source_year >= HISTORICAL_MODERN_START_YEAR or (
        source.get("code") == 19 and number(record.get("draftYear")) >= HISTORICAL_MODERN_START_YEAR
    )
    earned_star_honor = any(
        number((record.get("honors") or {}).get(key)) > 0
        for key in ("allStar", "allNba1", "allNba2", "allNba3", "mvp", "fmvp", "dpoy")
    )
    if keys & CURATED_POSITION_KEYS:
        return "modern-all-star"
    if modern_card and (keys & MODERN_ALL_STAR_KEYS or earned_star_honor):
        return "modern-all-star"
    return ""


def slug(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).casefold()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "player"


def number(value: object, default: int = 0) -> int:
    try:
        return int(float(str(value or "").strip()))
    except (TypeError, ValueError):
        return default


def draft_year(value: object) -> int:
    """Extract the four-digit draft year from values such as 200801."""
    text = str(value or "").strip()
    match = re.match(r"(19|20)\d{2}", text)
    return int(match.group(0)) if match else 0


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


def is_historical_candidate(record: dict) -> bool:
    """Keep a real peak-season card for every franchise's five-card legend pool.

    Several older roster snapshots do not carry cumulative honor columns even
    for players who were clearly rotation stars/all-stars.  A peak rating floor
    lets the curated five-card slots use those real prime-season rows without
    falling back to late-career cards or duplicating a legend.
    """
    return is_star(record["honors"], record["rating"]) or record["rating"] >= 80


def player_record(row: dict[str, str], source: dict, history: dict | None, nba_ids: dict[str, int], index: int) -> dict:
    tid = team_id(row)
    pos = max(1, min(5, number(row.get("positionFirst"), 3)))
    physique = number(row.get("skillPhysique"), 55)
    speed_bias = {1: 6, 2: 3, 3: 0, 4: -4, 5: -8}.get(pos, 0)
    strength_bias = {1: -6, 2: -3, 3: 0, 4: 4, 5: 8}.get(pos, 0)
    rating = number(row.get("ATT"), -1)
    defense = number(row.get("DEF"), -1)
    # The all-time compilation row has an explicit Ranks/OVR value. Use it instead
    # of averaging inflated ATT/DEF columns (Derrick Rose is 95 here, not 94).
    rank_value = number(row.get("Ranks"), -1)
    if source["code"] == 19 and rank_value > 0:
        rating = rank_value
    elif rating >= 0 and defense >= 0:
        rating = round((rating + defense) / 2)
    else:
        values = [number(row.get(k), 55) for k in ("skillPass", "skillShotInterior", "skillShotExterior", "skillShotFree", "skillPhysique", "skillBlock", "skillRebound", "skillSteal")]
        rating = round(sum(values) / len(values))
    name = str(row.get("name") or row.get("nameBirth") or "未知球员").strip()
    english = str(row.get("nameBirth") or row.get("altName") or name).strip()
    legacy_fix = HISTORICAL_LEGACY_NAME_FIXES.get((source["code"], norm(english))) if source["kind"] == "historical" else None
    if legacy_fix:
        english = legacy_fix[0]
    english_key = norm(english)
    nba_id = legacy_fix[1] if legacy_fix else (nba_ids.get(english_key) or nba_ids.get(norm(name)))
    if not nba_id:
        nba_id = nba_ids.get(NBA_NAME_ALIASES.get(english_key, ""), 0)
    fallback_photo = (history or {}).get("photoLocal", "")
    if fallback_photo and not (ROOT / fallback_photo).exists():
        fallback_photo = ""
    fallback_photo = fallback_photo or HISTORICAL_PHOTO_OVERRIDES.get(english_key, "")
    history_photo = fallback_photo
    current_photo = ""
    if source["kind"] == "current" and nba_id:
        current_photo = f"assets/images/Player/hupu-current/{slug(english)}.png"
    if source["kind"] == "historical" and (nba_id or history_photo):
        history_photo = f"assets/images/Player/historical-nba/{slug(english)}.png" if nba_id else history_photo
    photo_url = ""
    if nba_id:
        # 虎扑 BuildPlayer 的 getPlayerHeadshotStyle 使用 NBA player ID，
        # 现役头像固定走 260x190；历史名宿继续使用已缓存的高清图。
        size = "260x190" if source["kind"] == "current" else "1040x760"
        photo_url = f"https://cdn.nba.com/headshots/nba/latest/{size}/{nba_id}.png"
    # Keep photoLocal a local relative path. The downloader fills missing CDN
    # assets later; putting an HTTP URL in photoLocal makes the downloader treat
    # it as a filesystem path and breaks the local-first avatar contract.
    resolved_local = current_photo or history_photo
    honors = honor_snapshot(history, source["year"], row)
    identity = (history or {}).get("realId") or norm(english) or norm(name)
    history_draft_year = number(((history or {}).get("draft") or {}).get("year"), 0)
    historical_teams = {
        number(snapshot.get("teamId"))
        for snapshot in ((history or {}).get("rosterSnapshots") or [])
        if 1 <= number(snapshot.get("teamId")) <= 30
    }
    # rosters19 is a fantasy all-time compilation whose row team is not a
    # reliable real franchise. Prefer the historical database affiliations so
    # legends do not leak onto teams they never represented (for example,
    # Jordan on the Knicks). Real sampled seasons still contribute their row
    # team, and the all-time row is used only when no history exists at all.
    if source.get("code") != 19 or not historical_teams:
        historical_teams.add(tid)
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
        "draftYear": history_draft_year or draft_year(row.get("draft")),
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
        "historicalTeams": sorted(historical_teams),
        "starScore": round(star_score(honors, rating), 2),
    }


def _legacy_dynamic_main() -> None:
    raise RuntimeError("Dynamic roster scanning is disabled; use the frozen 150-row peak table")
    history_index = load_history_index()
    nba_ids = load_nba_ids()
    rows_by_source: dict[int, list[dict]] = {}
    for source in SEASONS:
        rows_by_source[source["code"]] = load_csv(DATA_DIR / source["file"])

    current_by_team: dict[int, list[dict]] = defaultdict(list)
    # Keep one peak card per player identity, then project that card to every
    # franchise listed in the player's historical roster snapshots. This lets
    # Vince Carter appear in both Toronto and New Jersey without inventing a
    # random cross-franchise Hall of Famer for teams that need a fifth card.
    historical_peak: dict[str, dict] = {}
    historical_team_ids: dict[str, set[int]] = defaultdict(set)

    def consider_peak(store: dict, record: dict) -> None:
        # Peak = highest per-season RATING (2K ATT/DEF avg, a genuine per-year
        # ability snapshot), ties prefer a real sampled season over the
        # synthetic all-time compilation, then the EARLIER year (the prime,
        # not a late-career defensive echo), then honors. Why not cumulative
        # starScore: it always
        # favored late seasons, so legends showed up in end-of-career form
        # (e.g. 加内特/皮尔斯 as 2009-10 Celtics instead of their real primes).
        key = record["identity"]
        old = store.get(key)
        cand = (
            record["rating"],
            1 if record["source"].get("code") != 19 else 0,
            -record["source"]["year"],
            record["starScore"],
        )
        old_key = (
            old["rating"],
            1 if old["source"].get("code") != 19 else 0,
            -old["source"]["year"],
            old["starScore"],
        ) if old else None
        if old is None or cand > old_key:
            store[key] = record

    # Build every source row first.  Current rows still populate the separate
    # 12-player current pool, but an eligible current row can also win a
    # historical player's peak comparison when it is one of the identities
    # represented by the historical source range.
    source_records: list[tuple[dict, int, dict]] = []
    for source in SEASONS:
        for index, row in enumerate(rows_by_source[source["code"]], start=1):
            tid = team_id(row)
            if tid not in TEAM_NAMES or not str(row.get("name", "")).strip():
                continue
            row_name_key = norm(row.get("nameBirth")) or norm(row.get("name"))
            legacy_fix = HISTORICAL_LEGACY_NAME_FIXES.get((source["code"], row_name_key)) if source["kind"] == "historical" else None
            history = None if legacy_fix else (history_index.get(norm(row.get("nameBirth"))) or history_index.get(norm(row.get("name"))))
            if history is None and not legacy_fix:
                alias_key = HISTORICAL_NAME_ALIASES.get(norm(row.get("nameBirth"))) or HISTORICAL_NAME_ALIASES.get(norm(row.get("name")))
                if alias_key:
                    history = history_index.get(alias_key)
            record = player_record(row, source, history, nba_ids, index)
            if source["kind"] == "current":
                current_by_team[tid].append(record)
            source_records.append((source, tid, record))

    historical_candidate_keys = {
        record["identity"]
        for source, _tid, record in source_records
        if source["kind"] == "historical" and historical_tier(record)
    }

    def peak_copy(record: dict, source: dict) -> dict:
        """Copy a current row into the historical pool without sharing state."""
        peak = dict(record)
        peak["source"] = dict(record["source"])
        peak["attrs"] = dict(record.get("attrs") or {})
        peak["honors"] = dict(record.get("honors") or {})
        peak["historicalTeams"] = list(record.get("historicalTeams") or [])
        if source["kind"] == "current":
            # The same row is still a historical surprise card once it wins
            # the all-season peak comparison.  Keep it out of the regular
            # current pool's semantics and use the historical image fallback.
            peak["source"]["kind"] = "historical"
            peak["source"]["peakFromCurrentRoster"] = True
            fallback_photo = peak.get("fallbackPhotoLocal")
            if fallback_photo and (ROOT / fallback_photo).exists():
                peak["photoLocal"] = fallback_photo
            nba_id = number(peak.get("nbaId"))
            if nba_id:
                peak["photoUrl"] = f"https://cdn.nba.com/headshots/nba/latest/1040x760/{nba_id}.png"
                peak["photoSource"] = "nba-cdn"
        return peak

    for source, tid, source_record in source_records:
        record = source_record
        tier = historical_tier(record)
        if not tier:
            continue
        # The current roster is part of the 1-19 comparison only for players
        # already represented by an eligible historical source row. This
        # prevents every active All-Star from becoming a new historical card.
        if source["kind"] == "current" and record["identity"] not in historical_candidate_keys:
            continue
        peak = peak_copy(record, source)
        peak["historicalTier"] = tier
        peak["peakSource"] = HISTORICAL_PEAK_SOURCE
        historical_team_ids[peak["identity"]].update(peak.get("historicalTeams") or [tid])
        consider_peak(historical_peak, peak)

    # Current and peak cards are intentionally separate versions. A player may
    # therefore exist in both the 2025-26 current pool and a team's five-card
    # peak pool; selecting one version must not remove the other.
    current_identities = set()
    current_name_keys = set()
    for records in current_by_team.values():
        for rec in records:
            current_identities.add(rec["identity"])
            current_name_keys.add(norm(rec.get("nameEn")))
            current_name_keys.add(norm(rec.get("altName")))

    # Mark the final historical source explicitly so the browser and the
    # regression test can prove that every surprise card is peak-form.
    for record in historical_peak.values():
        record["historicalPeak"] = True
        record["peakRating"] = record["rating"]
        record.setdefault("peakSource", HISTORICAL_PEAK_SOURCE)

    historical_by_team: dict[int, dict[str, dict]] = defaultdict(dict)
    for identity, record in historical_peak.items():
        for franchise_id in sorted(historical_team_ids.get(identity) or {record["teamId"]}):
            if franchise_id not in TEAM_NAMES:
                continue
            card = dict(record)
            card["teamId"] = franchise_id
            card["uid"] = f"{record['uid']}_franchise_{franchise_id}" if franchise_id != record["teamId"] else record["uid"]
            if franchise_id != record["teamId"]:
                card["source"] = dict(record["source"])
                card["source"]["franchiseCard"] = True
            historical_by_team[franchise_id][identity] = card

    dual_version_count = len([
        identity for identity in historical_peak
        if identity in current_identities or norm(historical_peak[identity].get("nameEn")) in current_name_keys
    ])

    def historical_sort_key(player: dict) -> tuple:
        # Prefer modern Hall of Famers, then older all-time legends, then the
        # modern All-Star fallback. This keeps Jordan-era cards visible without
        # throwing away true historical giants such as Kareem or Oscar.
        tier_score = 2 if player.get("historicalTier") == "hall-of-fame" else 1
        source = player.get("source") or {}
        modern_score = 1 if (
            number(source.get("year")) >= HISTORICAL_MODERN_START_YEAR
            or (source.get("code") == 19 and number(player.get("draftYear")) >= HISTORICAL_MODERN_START_YEAR)
        ) else 0
        return (-tier_score, -modern_score, -player["rating"], -player["starScore"], player["nameEn"])

    # Position fallback is only used when a franchise has no eligible card at
    # that spot.  Keep the same Hall-of-Fame-first ordering as the direct team
    # pool so the PG/SG/SF/PF/C requirement never lowers the surprise-card bar.
    global_historical_by_position = {
        pos: sorted(
            {
                player["identity"]: player
                for records in historical_by_team.values()
                for player in records.values()
                if player.get("pos") == pos
            }.values(),
            key=historical_sort_key,
        )
        for pos in range(1, 6)
    }
    curated_candidates = {}
    for records in historical_by_team.values():
        for player in records.values():
            for candidate_name in (player.get("nameEn"), player.get("altName"), player.get("name")):
                if norm(candidate_name):
                    old = curated_candidates.get(norm(candidate_name))
                    if old is None or historical_sort_key(player) < historical_sort_key(old):
                        curated_candidates[norm(candidate_name)] = player

    teams: dict[str, dict] = {}
    warnings: list[str] = []
    for tid, label in TEAM_NAMES.items():
        current = sorted(current_by_team[tid], key=lambda p: (-p["rating"], p["nameEn"]))
        # Five-card historical surprise pool per team. These cards are kept out
        # of the normal 12-player draw and injected only at a low probability
        # by the browser, so every round is not forced to contain legends.
        direct_history = sorted(historical_by_team[tid].values(), key=historical_sort_key)
        history = []
        used_identities = set()
        for pos in range(1, 6):
            curated_name = HISTORICAL_POSITION_LINEUPS[tid][pos - 1]
            source_record = curated_candidates.get(norm(curated_name))
            candidates = [player for player in direct_history if player.get("pos") == pos]
            for fallback_tid in HISTORICAL_FRANCHISE_FALLBACKS.get(tid, []):
                candidates.extend(
                    player
                    for player in sorted(historical_by_team[fallback_tid].values(), key=historical_sort_key)
                    if player.get("pos") == pos
                )
            used_position_fallback = False
            if source_record is None:
                warnings.append(f"{label}: curated {pos} {curated_name} missing")
                source_record = next(
                    (player for player in candidates if player["identity"] not in used_identities),
                    None,
                )
            if source_record is None:
                source_record = next(
                    (
                        player
                        for player in global_historical_by_position[pos]
                        if player["identity"] not in used_identities
                    ),
                    None,
                )
                used_position_fallback = True
            if source_record is None:
                warnings.append(f"{label}: historical position {pos} missing")
                continue
            record = dict(source_record)
            record["pos"] = pos
            record["source"] = dict(record["source"])
            record["source"]["positionCurated"] = True
            if record["teamId"] != tid:
                record["teamId"] = tid
                record["uid"] = f"{source_record['uid']}_position_{pos}_surprise_{tid}"
                record["source"]["franchiseFallback"] = True
                if used_position_fallback or norm(source_record.get("nameEn")) != norm(curated_name):
                    record["source"]["positionFallback"] = True
            history.append(record)
            used_identities.add(record["identity"])
        current_take = current[:12]
        history_take = history
        if len(current_take) < 12:
            warnings.append(f"{label}: current={len(current_take)}")
        if len(history_take) < 5:
            warnings.append(f"{label}: historical={len(history_take)}")
        teams[str(tid)] = {
            "id": tid,
            "name": label,
            "currentCount": len(current_take),
            "historicalCount": len(history_take),
            "players": current_take,
            "historicalPlayers": history_take,
        }
    print(f"historical surprise cards kept={sum(len(v) for v in historical_by_team.values())} dual_current_peak={dual_version_count}")

    payload = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rules": {
            "targetRosterSize": 12,
            "currentTarget": 12,
            "historicalTarget": 5,
            "historicalPositions": ["PG", "SG", "SF", "PF", "C"],
            "currentAndPeakVersionsIndependent": True,
            "historicalMode": "low-probability surprise card",
            "historicalDrawChance": 0.20,
            "historicalEligibility": "Naismith Hall of Fame player; modern All-Star fallback when a franchise has fewer than five",
            "historicalModernStartYear": HISTORICAL_MODERN_START_YEAR,
            "historicalPeakOnly": True,
            "historicalPeakSource": HISTORICAL_PEAK_SOURCE,
            "historicalExcluded": sorted(HISTORICAL_EXCLUDED_NAMES),
        },
        "seasons": SEASONS,
        "teams": teams,
        "warnings": warnings,
        "photoPolicy": {
            "current": "Hupu BuildPlayer NBA_PLAYER_IMAGES -> NBA CDN 260x190 headshot",
            "historical": "Naismith Hall of Fame / modern All-Star surprise cards with local 1040x760 headshots",
            "fallback": "assets/data/historical/headshots local cache or verified public portrait",
        },
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {OUT_FILE}")
    print(f"teams={len(teams)} current={sum(len(t['players']) for t in teams.values())} historical={sum(len(t['historicalPlayers']) for t in teams.values())}")
    if warnings:
        print("warnings:")
        for warning in warnings:
            print(f"- {warning}")


def load_static_peak_table() -> tuple[dict, dict[int, list[dict]]]:
    """Load and strictly validate the frozen 30-team, 150-card peak table."""
    if not PEAK_TABLE_FILE.exists():
        raise FileNotFoundError(
            f"Missing static historical peak table: {PEAK_TABLE_FILE}. "
            "The normal pool build does not scan roster history to recreate it."
        )

    table = json.loads(PEAK_TABLE_FILE.read_text(encoding="utf-8"))
    rows = table.get("rows")
    if not isinstance(rows, list):
        raise ValueError("Static historical peak table must contain a rows array")
    if number(table.get("version")) != 1:
        raise ValueError("Unsupported static historical peak table version")
    if number(table.get("rowCount")) != 150 or len(rows) != 150:
        raise ValueError(
            f"Static historical peak table must contain exactly 150 rows; got {len(rows)}"
        )
    if table.get("selection") != HISTORICAL_PEAK_SOURCE:
        raise ValueError("Static historical peak table selection metadata is out of date")

    by_team: dict[int, list[dict]] = defaultdict(list)
    occupied_slots: set[tuple[int, int]] = set()
    for row_number, frozen_row in enumerate(rows, start=1):
        if not isinstance(frozen_row, dict):
            raise ValueError(f"Static historical peak row {row_number} must be an object")
        record = copy.deepcopy(frozen_row)
        tid = number(record.get("teamId"))
        pos = number(record.get("pos"))
        slot = (tid, pos)
        source = record.get("source")

        if tid not in TEAM_NAMES:
            raise ValueError(f"Static historical peak row {row_number} has invalid teamId={tid}")
        if pos not in range(1, 6):
            raise ValueError(f"Static historical peak row {row_number} has invalid pos={pos}")
        if slot in occupied_slots:
            raise ValueError(f"Static historical peak table duplicates team/position slot {slot}")
        if not isinstance(source, dict) or source.get("kind") != "historical":
            raise ValueError(f"Static historical peak row {row_number} is not a historical card")
        if number(source.get("code")) not in range(1, 20):
            raise ValueError(f"Static historical peak row {row_number} has invalid source code")
        if record.get("historicalPeak") is not True:
            raise ValueError(f"Static historical peak row {row_number} is not marked as a peak card")
        if number(record.get("peakRating"), -1) != number(record.get("rating"), -2):
            raise ValueError(f"Static historical peak row {row_number} has inconsistent peakRating")
        if record.get("peakSource") != HISTORICAL_PEAK_SOURCE:
            raise ValueError(f"Static historical peak row {row_number} has inconsistent peakSource")
        if "peakTemplate" in source:
            raise ValueError(f"Static historical peak row {row_number} still contains peakTemplate")
        if not record.get("identity") or not isinstance(record.get("attrs"), dict):
            raise ValueError(f"Static historical peak row {row_number} is incomplete")

        occupied_slots.add(slot)
        by_team[tid].append(record)

    for tid in TEAM_NAMES:
        team_rows = sorted(by_team[tid], key=lambda record: record["pos"])
        if len(team_rows) != 5 or [record["pos"] for record in team_rows] != [1, 2, 3, 4, 5]:
            raise ValueError(f"Static historical peak table team {tid} must have PG/SG/SF/PF/C")
        by_team[tid] = team_rows

    return table, by_team


def main() -> None:
    """Build current rosters and attach the frozen peak table without rescanning history."""
    history_index = load_history_index()
    nba_ids = load_nba_ids()
    current_source = SEASONS[0]
    current_by_team: dict[int, list[dict]] = defaultdict(list)

    for index, row in enumerate(load_csv(DATA_DIR / current_source["file"]), start=1):
        tid = team_id(row)
        if tid not in TEAM_NAMES or not str(row.get("name", "")).strip():
            continue
        history = history_index.get(norm(row.get("nameBirth"))) or history_index.get(norm(row.get("name")))
        if history is None:
            alias_key = HISTORICAL_NAME_ALIASES.get(norm(row.get("nameBirth"))) or HISTORICAL_NAME_ALIASES.get(norm(row.get("name")))
            if alias_key:
                history = history_index.get(alias_key)
        current_by_team[tid].append(player_record(row, current_source, history, nba_ids, index))

    peak_table, historical_by_team = load_static_peak_table()
    warnings: list[str] = []
    teams: dict[str, dict] = {}

    current_identities = {
        record["identity"]
        for team_records in current_by_team.values()
        for record in team_records
    }
    peak_identities = {
        record["identity"]
        for team_records in historical_by_team.values()
        for record in team_records
    }
    dual_version_count = len(current_identities & peak_identities)

    for tid, label in TEAM_NAMES.items():
        current = sorted(current_by_team[tid], key=lambda player: (-player["rating"], player["nameEn"]))
        current_take = current[:12]
        history_take = historical_by_team[tid]
        if len(current_take) < 12:
            warnings.append(f"{label}: current={len(current_take)}")
        teams[str(tid)] = {
            "id": tid,
            "name": label,
            "currentCount": len(current_take),
            "historicalCount": len(history_take),
            "players": current_take,
            "historicalPlayers": history_take,
        }

    payload = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rules": {
            "targetRosterSize": 12,
            "currentTarget": 12,
            "historicalTarget": 5,
            "historicalPositions": ["PG", "SG", "SF", "PF", "C"],
            "currentAndPeakVersionsIndependent": True,
            "historicalMode": "low-probability surprise card",
            "historicalDrawChance": 0.20,
            "historicalEligibility": "fixed 150-card peak table",
            "historicalPeakOnly": True,
            "historicalPeakSource": HISTORICAL_PEAK_SOURCE,
            "historicalPeakTable": PEAK_TABLE_FILE.relative_to(ROOT).as_posix(),
            "historicalPeakTableVersion": number(peak_table.get("version")),
            "historicalPeakTableRows": len(peak_table["rows"]),
        },
        "seasons": SEASONS,
        "teams": teams,
        "warnings": warnings,
        "photoPolicy": {
            "current": "Hupu BuildPlayer NBA_PLAYER_IMAGES -> NBA CDN 260x190 headshot",
            "historical": "static peak table with local 1040x760 headshots",
            "fallback": "assets/data/historical/headshots local cache or verified public portrait",
        },
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {OUT_FILE}")
    print(
        f"teams={len(teams)} "
        f"current={sum(len(team['players']) for team in teams.values())} "
        f"historical={sum(len(team['historicalPlayers']) for team in teams.values())}"
    )
    print(f"static_peak_rows={len(peak_table['rows'])} dual_current_peak={dual_version_count}")
    if warnings:
        print("warnings:")
        for warning in warnings:
            print(f"- {warning}")


if __name__ == "__main__":
    main()
