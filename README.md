# Perfect Player

一个纯网页的篮球生涯模拟游戏：创建自己的球员，从现役球员与名人堂/近代全明星惊喜卡身上获取能力，完成一个虎扑风格的 NBA 单赛季。

在线体验：<https://zyz9408.github.io/perfect-player/>

## 本地运行

这是静态网页项目，不需要 Unity 或构建工具。使用任意静态服务器打开项目根目录即可，例如：

```bash
python -m http.server 8035
```

然后访问 <http://localhost:8035/>。

## 内容

- 统一篮球风格的 Perfect Player UI
- 已移除“征服联盟”模式
- 6 张球员大头照：亚洲 2 张、白人 2 张、黑人 2 张
- 固定 2025-26 单赛季：属性来源按“随机年份 → 随机球队 → 随机球员”生成
- 属性抽取池：30 支球队各保留 12 名现役球员，另有 5 张名人堂/近代全明星历史惊喜卡
- 比赛、赛季模拟、奖项名单仍只使用现役球员；历史球员只在选属性阶段出现
- 每轮固定抽取 5 人，同轮不重复；历史卡有 20% 轮次概率出现，且每轮最多 1 张
- 历史惊喜卡优先名人堂球员，名人堂不足时使用 1984 年后全明星；特里·卡明思、诺姆·尼克松不进入历史惊喜池
- 所有历史惊喜卡均直接读取 `assets/data/perfect-player-historical-peak-table.json` 中固定的 150 张巅峰卡；日常生成不再扫描 1–19 号名单
- 普通重选用完后可使用最多 3 次模拟广告重选，暂不接入真实广告 SDK
- 现役球员头像沿用虎扑 BuildPlayer 的 `NBA_PLAYER_IMAGES` → NBA player ID → `260x190` 头像接口，并已全部本地缓存
- 2026 年 60 个选秀顺位均补齐 NBA 官方资料页大头照；官方 CDN 尚未更新的少数新秀使用 NBA 官方选秀媒体肖像，不使用灰色占位剪影
- NBA CDN 尚未更新头像的 3 名现役球员使用 ESPN 官方球员资料大头照作为备用源，并一并本地缓存
- 历史惊喜球员头像由 NBA CDN 批量抓取并本地化，灰色占位图自动替换为项目历史缓存或公开真实肖像；历史缓存中的特里·卡明思、诺姆·尼克松头像也已补齐
- 头像与游戏数据均从网页本地资源加载
- `tools/generate_ai_avatars.py` 可使用 DashScope API 重新生成头像；API Key 只从环境变量读取，不写入仓库

## 头像生成 API

```powershell
$env:DASHSCOPE_API_KEY = '你的 API Key'
python tools/generate_ai_avatars.py
```

脚本默认使用 DashScope 的 `wan2.2-t2i-plus`，也支持通过 `DASHSCOPE_BASE_URL`、`DASHSCOPE_WORKSPACE_ID` 和 `DASHSCOPE_REGION` 配置兼容环境。

## 精选名单与头像来源

```powershell
python tools/build_perfect_player_pool.py
python tools/fetch_hupu_current_headshots.py
python tools/fetch_historical_headshots.py
```

虎扑参考页：<https://activity-static.hupu.com/colorbox-activities/activity-project-ai-1783761934042/__ai_app.html>。
现役头像模板：`https://cdn.nba.com/headshots/nba/latest/260x190/{nbaId}.png`。
历史头像来源模板：`https://cdn.nba.com/headshots/nba/latest/1040x760/{nbaId}.png`。下载后的静态图片随网页发布，运行时不依赖外部头像接口。
2026 选秀头像清单：`assets/data/official-headshot-manifest.json`；抓取脚本：`tools/fetch-official-headshots.js`。

## Current historical-player rules

- Historical surprise cards are drawn with a 20% chance, with at most one historical card per round.
- The 150 peak cards are frozen in `assets/data/perfect-player-historical-peak-table.json` (30 teams × PG/SG/SF/PF/C).
- Normal pool builds read that table directly and do not scan `rosters01.csv` through `rosters19.csv` to recalculate peak cards.
