# Progress

Original prompt: 完美球员模式 UI风格修改成统一的篮球风格；征服联盟模式去掉；玩家球员的6张图片重新生成，真人风格，亚洲2张、白人2张、黑人2张；网页游戏，不是 Unity；发布到 GitHub Pages；玩法按照虎扑原玩法，增加历史球员、随机事件和玩家属性显化。

## Current task

- 历史球员只进入建球员阶段的属性抽取池，不进入比赛阵容、赛季模拟或联盟奖项名单。
- 每队属性抽取常规池固定 12 名现役；另有 5 张历史惊喜卡，优先名人堂球员、名人堂不足时使用近代全明星。
- 历史惊喜卡只在 10% 抽取轮次出现，每轮最多 1 张；特里·卡明思、诺姆·尼克松明确排除。
- 每轮固定抽取 5 名球员；同一轮不能重复，重选轮次之间允许再次出现。
- 广告重选暂时使用模拟广告，最多观看 3 次。
- 所有历史惊喜卡必须显式标记 `historicalPeak`；优先使用 `rosters19.csv` 的巅峰模板，缺失时使用最高评分赛季。

## Notes

- Target repository: `D:\perfect-player-publish-20260807`.
- Current published commit before this task: `3918585`.

## Completed in this pass

- `assets/data/perfect-player-pool.json` now contains 510 records: 30 teams × (12 current + 5 historical surprise cards).
- Historical records are loaded only into `PERFECT_PLAYER_BUILD_DATA`; competition simulation, lineup calculation, awards candidates, and `NBA2K_DATA` remain current-only.
- Historical headshots are cached locally under `assets/images/Player/historical-nba/`; all 150 surprise records resolve to local real images and the historical cache no longer contains the known NBA gray placeholder.
- Attribute selection draws exactly five unique players per round from the 12-player current pool, with at most one low-probability historical surprise card.
- Player reroll ads are a static mock reward: up to three watches, each immediately rerolls the five-card batch.
- Draft random events report 19 entries, have a 65% pre-draft / 55% post-draft chance, allow up to two non-repeating events per draft.
- Achievement hooks now resolve the top-level `STATE` correctly, scan current/career/list awards, and recognize draft, All-Star, and Rookie of the Year achievements.
- Profile and season modifiers refresh the visible player-state strip immediately after event changes.
- Mobile Hupu smoke test passes with the 12-player current pool plus five-card historical surprise pools, current-only competition rosters, local headshots, mock rerolls, achievements, live state refresh, random draft events, and simulation checks.
- All 525 competition-roster players now resolve to official NBA headshot IDs and local cached files; the 19 names missing from the old map use verified NBA IDs.
- All 60 2026 draft picks now carry verified NBA IDs and local real-player portraits under `assets/images/Player/rookies-2026/`; sources are NBA Draft profile portraits, 1040x760 official headshots, or an NBA official Draft media portrait only where the profile CDN still returns a gray silhouette.
- The old 260x190 rookie placeholder PNGs were removed; every shipped 2026 rookie asset is a playable JPEG and is checked by the smoke test.
- Three current-roster players whose NBA CDN images were still silhouettes now use cached ESPN official player-profile headshots, with a runtime URL fallback and placeholder-size regression checks.
- Headshot lookup accepts player objects as well as names, so roster cards, draft cards, awards, and player detail views share the same local official-photo path.

## 2026-08-08 历史球员巅峰修正

- `tools/build_perfect_player_pool.py` 改为比较每名历史球员的真实采样赛季与 `rosters19.csv` 巅峰模板，模板更强时统一替换。
- `Ranks` 作为巅峰模板 OVR；单项能力值限制在 25–99，避免 ATT/DEF 的模板超出浏览器可玩范围。
- 德里克·罗斯从伤后/末期版本 OVR 86 修正为巅峰模板 OVR 95，显示为“生涯巅峰”。
- 150 张历史惊喜卡全部带 `historicalPeak=true` 与 `peakRating`，页面历史卡显示“巅峰”标记。

## 2026-08-08 MVP / FMVP 成就拆分

- `assets/js/perfect-player-enhancements.js` 新增独立 `fmvp` 成就。
- 成就同步按 `act` 和完整奖项标签区分常规赛 MVP、总决赛 MVP、全明星 MVP，不再用“MVP”子串混判。
- 对旧版本因 FMVP 误完成的 `mvp` / `mvp_x3` 本地成就，在当前生涯重新同步且没有常规赛 MVP 时自动修复。
