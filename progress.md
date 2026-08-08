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

## 2026-08-08 事件池与选秀排位

- 新增 21 条无需前置条件、每条至少两个选择的赛季日常事件；每季前 12 场的首条事件只从扩充池抽取，不再固定从“来到这座城市 / 输球发布会”起步。
- 每季第 4 场起保证出现首条随机日常；之后触发率为 14%，冷却 7 场，每季最多 7 条（存在恋爱强制推进时最多 6 条）。
- 新增最近 10 条赛季事件防重复，并修复跨赛季时 `_lastSeasonBranchGame` 未清零、导致下一季事件长期无法触发的问题。
- 选秀随机事件从 19 条扩充到 35 条（选秀前 18、选秀后 17），选秀前/后触发概率调整为 90% / 85%。
- 现有选秀弹窗增加“当前预测顺位、预测区间、选秀行情”三栏；行情变化会实时前移/后移预测，最终顺位围绕预测上下浮动，并覆盖完整 1–60 顺位。
- 手机竖屏 smoke test 与通用网页游戏客户端均通过；新增赛季事件选择弹窗和选秀排名弹窗均在单屏内完成操作。

## 2026-08-08 后续随机新秀头像池

- 使用 `gemini-3.1-flash-lite-image` 生成 50 张非亚洲男性篮球新秀大头照，统一为无队标、无号码、无文字球衣。
- 最终素材位于 `assets/images/Player/generated-rookies/`，全部为 216×216 RGBA PNG，四角透明且文件内容互不重复。
- `assets/data/generated-rookie-headshots.json` 登记完整路径与 SHA-256；生成器从环境变量读取 API 密钥，项目和提交记录不保存密钥。
- 后续随机新秀从头像池打乱抽取，一轮 50 张用完前不会重复；现有 2026 真实新秀头像与正式比赛名单不变。
- 新增生成、抠图缩放和总览校验工具；自动检查尺寸、透明通道、主体覆盖率、绿幕溢色与重复文件。
- 第二批追加 `generated-rookie-051.png` 至 `generated-rookie-100.png`，后续随机新秀头像池扩展为 100 张，一轮全部用完前不重复。

## 2026-08-08 赛季事件库扩充到 200 条

- 保留原 21 条手写赛季日常，并新增 179 条由 30 个主题和 6 类赛季情境组合出的独立事件，`pp_season_` 可抽取池合计严格为 200 条。
- 触发节奏不变：14% 随机概率、7 场冷却、每季最多 7 条；存在恋爱推进时随机事件最多 6 条；第 4–12 场首条日常保底保持不变。
- 跨赛季最近事件防重复窗口从 10 条扩到 40 条，只减少重复内容，不增加弹窗次数。
- 自动测试确认 200 个 ID、标题、场景全部唯一，每条至少两个可操作选择；200 次随机抽样覆盖至少 100 条不同事件。
- 通用网页游戏客户端与手机竖屏 smoke 均通过，新增长标题事件弹窗仍可在一个屏幕内完成选择。

## 2026-08-08 主角透明头像扩充到 18 张

- 重新生成 18 张 512×512 RGBA 真人篮球主角头像：亚洲、白人、黑人各 6 张；全部穿无队标、无号码、无文字球衣。
- 每组明确区分脸型、肤色深浅、气质和发型，包括寸头、卷发、中分、侧分、脏辫、爆炸头、高顶渐变、光头等。
- `assets/data/character-avatar-manifest.json` 登记分组、路径和 SHA-256；自动检查 18 张文件唯一、透明四角、主体占比和绿幕溢色。
- 角色创建新增亚洲 / 白人 / 黑人三个标签，每次展示 6 张，18 张全部可选，同时保持手机竖屏单屏完成姓名、头像和确认操作。
- 选中的新头像会继续进入球员揭幕、生涯资料和存档；现行完整 smoke 与通用网页游戏客户端视觉检查通过。

## 2026-08-08 累计成就限定单次生涯

- 审核全部 29 项成就后，将需要多赛季累计的 `MVP 王朝` 与 `三连话题` 明确限定为同一次生涯内分别获得 3 座常规赛 MVP / 3 座总冠军。
- 首次达成累计成就时保存当前 `gameId`、达成次数和凭证版本；只有同一生涯的荣誉记录达到门槛才会解锁，多个新存档的次数不再相加。
- 已经合法达成并带单生涯凭证的成就仍作为永久成就保留，之后新开生涯不会丢失。
- 自动迁移会撤回旧版无单生涯凭证的误解锁，删除遗留 `__counters` 跨生涯计数，并同步校正可能被误带出的成就猎人 / 收藏家。
- smoke 新增“旧误解锁清理、分开生涯不叠加、同一生涯三冠、合法成就跨生涯保留、三次常规赛 MVP”回归测试；完整手机流程和通用网页游戏客户端视觉检查通过。

## 2026-08-08 退役结局媒体事件与版式扩充

- 在固定的退役发布会、退役球衣、名人堂和历史地位之间，新增两段随机“媒体时代回声”；同一局的报道主题与媒体版式均不重复，新生涯重新抽取。
- 新增 8 种可视化媒体模板：报纸头版、电视直播、杂志封面、球队官方通讯、球迷自印刊、播客、纪录片和新闻电讯。
- 新增 32 个报道主题，并按冠军、GOAT、一人一城、辗转多队、得分手、防守核心、组织核心和无冠传奇等生涯事实优先匹配；普通球员也有完整通用池。
- 退役结局组合由媒体版式和报道主题交叉生成；抽中的组合写入生涯结局，流程内保持稳定，不会因重新打开弹窗而改变。
- 退役长海报同步加入两段媒体报道，由原 4 节扩充为 6 节。
- smoke 覆盖 80 轮组合随机性、单局不重复、结局按钮连续操作、手机单屏布局、报纸/电视视觉和海报内容；通用网页游戏客户端无新增控制台错误。

## 2026-08-08 公开首页头像空白修复

- 线上复现确认 `nba-perfect-player.html` 的 18 张头像正常，而网站根地址加载的旧 `index.html` 缺少 `character-avatar-tabs`；新版角色脚本因此提前返回，头像网格为空。
- `index.html` 改为保留查询参数与锚点、立即跳转到唯一主游戏页，避免两个 1MB 级入口文件继续发生版本漂移。
- `renderCharacterCreator()` 增加旧缓存兼容：分组容器缺失时自动创建，不再因辅助 DOM 缺失阻断头像渲染。
- 完整 smoke 改为从公开首页入口启动并断言跳转到主游戏页；额外模拟删除分组节点，确认可自动恢复 3 个分组和当前 6 张头像，所有图片 `naturalWidth > 0`。

## 2026-08-08 事件结算显示实际属性变化

- 选秀、赛季、休赛期、转会、退役倒计时和退役后事件统一在结果页增加“本次实际数值变化”。
- 结算基于选择执行前后的真实状态差值，不解析文案；数值触顶、随机分支和复合加成均显示最终实际生效量。
- 覆盖球员技术属性、媒体信任等生涯属性、压力与下赛季状态、选秀行情和年龄；无可见数值变化时明确提示。
- 结果弹窗内容区支持手机竖屏滚动；smoke 验证选秀事件显示“媒体信任 +1”和实际选秀行情，并保持弹窗不超出屏幕。
