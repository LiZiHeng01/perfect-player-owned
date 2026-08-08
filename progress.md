# Progress

Original prompt: 完美球员模式 UI风格修改成统一的篮球风格；征服联盟模式去掉；玩家球员的6张图片重新生成，真人风格，亚洲2张、白人2张、黑人2张；网页游戏，不是 Unity；发布到 GitHub Pages；玩法按照虎扑原玩法，增加历史球员、随机事件和玩家属性显化。

## Current task

- 历史球员只进入建球员阶段的属性抽取池，不进入比赛阵容、赛季模拟或联盟奖项名单。
- 每队属性抽取池调整为 12 名现役 + 6 名历史巅峰球员。
- 每轮固定抽取 5 名球员；同一轮不能重复，重选轮次之间允许再次出现。
- 广告重选暂时使用模拟广告，最多观看 3 次。

## Notes

- Target repository: `D:\perfect-player-publish-20260807`.
- Current published commit before this task: `3918585`.

## Completed in this pass

- `assets/data/perfect-player-pool.json` now contains 540 records: 30 teams × (12 current + 6 peak historical).
- Historical records are loaded only into `PERFECT_PLAYER_BUILD_DATA`; competition simulation, lineup calculation, awards candidates, and `NBA2K_DATA` remain current-only.
- Historical headshots are cached locally under `assets/images/Player/historical-nba/` (with shipped local fallbacks for early players); all 540 pool records now resolve to local files.
- Attribute selection draws exactly five unique players per round. Later rerolls draw from the full team pool, so the batch stays unique without exhausting the 18-player pool.
- Player reroll ads are a static mock reward: up to three watches, each immediately rerolls the five-card batch.
- Draft random events report 19 entries, have a 65% pre-draft / 55% post-draft chance, allow up to two non-repeating events per draft.
- Achievement hooks now resolve the top-level `STATE` correctly, scan current/career/list awards, and recognize draft, All-Star, and Rookie of the Year achievements.
- Profile and season modifiers refresh the visible player-state strip immediately after event changes.
- Mobile Hupu smoke test passes with the 18-player pool, current-only competition rosters, local headshots, mock rerolls, achievements, live state refresh, random draft events, and simulation checks.
- All 525 competition-roster players now resolve to official NBA headshot IDs and local cached files; the 19 names missing from the old map use verified NBA IDs.
- All 60 2026 draft picks now carry verified NBA IDs and local real-player portraits under `assets/images/Player/rookies-2026/`; sources are NBA Draft profile portraits, 1040x760 official headshots, or an NBA official Draft media portrait only where the profile CDN still returns a gray silhouette.
- The old 260x190 rookie placeholder PNGs were removed; every shipped 2026 rookie asset is a playable JPEG and is checked by the smoke test.
- Three current-roster players whose NBA CDN images were still silhouettes now use cached ESPN official player-profile headshots, with a runtime URL fallback and placeholder-size regression checks.
- Headshot lookup accepts player objects as well as names, so roster cards, draft cards, awards, and player detail views share the same local official-photo path.
