# Perfect Player

一个纯网页的篮球生涯模拟游戏：创建自己的球员，从现役球员与历史全明星球员身上获取能力，完成一个虎扑风格的 NBA 单赛季。

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
- 30 支球队各保留 15 名精选球员：12 名现役 + 3 名历史全明星以上球员
- 现役球员头像沿用虎扑 BuildPlayer 的 `NBA_PLAYER_IMAGES` → NBA player ID → `260x190` 头像接口，并已全部本地缓存
- 历史球员头像由 NBA CDN 批量抓取并本地化，失败时回退到项目历史头像缓存
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
