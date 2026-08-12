'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function loadPlaywright() {
  try { return require('playwright'); } catch (error) {}
  const nodeModules = path.join(
    process.env.USERPROFILE || 'C:\\Users\\46676',
    '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules'
  );
  try { return require(path.join(nodeModules, 'playwright')); } catch (error) {}
  const pnpmRoot = path.join(nodeModules, '.pnpm');
  const match = fs.readdirSync(pnpmRoot)
    .filter(name => name.startsWith('playwright@'))
    .sort().reverse()
    .map(name => path.join(pnpmRoot, name, 'node_modules', 'playwright'))
    .find(candidate => fs.existsSync(candidate));
  if (!match) throw new Error('Playwright not found');
  return require(match);
}

function findBrowser() {
  return [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Users\\46676\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1208\\chrome-headless-shell-win64\\chrome-headless-shell.exe'
  ].find(file => fs.existsSync(file));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHttp(url) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {}
    await sleep(200);
  }
  throw new Error('Local server did not start: ' + url);
}

async function main() {
  const pool = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'data', 'perfect-player-pool.json'), 'utf8'));
  const peakTable = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'data', 'perfect-player-historical-peak-table.json'), 'utf8'));
  const officialHeadshots = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'data', 'official-headshot-manifest.json'), 'utf8'));
  const generatedHeadshots = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'data', 'generated-rookie-headshots.json'), 'utf8'));
  const characterAvatars = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'data', 'character-avatar-manifest.json'), 'utf8'));
  assert.equal(characterAvatars.count, 18, '主角头像池应有 18 张');
  assert.equal(characterAvatars.transparent, true, '主角头像应为透明 PNG');
  assert.deepEqual(characterAvatars.groups, { 亚洲: 6, 白人: 6, 黑人: 6 });
  assert.equal(new Set(characterAvatars.avatars.map(item => item.sha256)).size, 18, '18 张主角头像不能重复');
  characterAvatars.avatars.forEach(item => assert.ok(fs.existsSync(path.join(root, item.photoLocal)), item.id + ' 缺少头像文件'));
  assert.equal(generatedHeadshots.count, 100, '后续随机新秀头像池应有 100 张');
  assert.equal(generatedHeadshots.transparent, true, '后续随机新秀头像应为透明 PNG');
  assert.equal(new Set(generatedHeadshots.headshots.map(item => item.photoLocal)).size, 100, '随机新秀头像路径不能重复');
  generatedHeadshots.headshots.forEach(item => {
    assert.ok(fs.existsSync(path.join(root, item.photoLocal)), item.id + ' 缺少透明头像文件');
  });
  assert.equal(officialHeadshots.currentPlayers.length, 525, '现役/轮换名单应全部登记官方头像');
  assert.equal(officialHeadshots.draft2026.length, 60, '2026 新秀应全部登记官方头像');
  officialHeadshots.currentPlayers.concat(officialHeadshots.draft2026).forEach(player => {
    const localPath = path.join(root, player.photoLocal);
    assert.ok(fs.existsSync(localPath), player.name || ('2026 顺位 ' + player.pick) + ' 缺少官方头像缓存');
    assert.notEqual(fs.statSync(localPath).size, 4937, player.name || ('2026 顺位 ' + player.pick) + ' 不能使用 260x190 灰色占位图');
    assert.notEqual(fs.statSync(localPath).size, 12430, player.name || ('2026 顺位 ' + player.pick) + ' 不能使用 1040x760 灰色占位图');
  });
  const teams = Object.values(pool.teams || {});
  const expectedHistoricalLineups = {
    1:'Bob Cousy|John Havlicek|Larry Bird|Kevin McHale|Bill Russell',
    2:'Jason Kidd|Vince Carter|Julius Erving|Buck Williams|Brook Lopez',
    3:'Walt Frazier|Allan Houston|Carmelo Anthony|Dave Debusschere|Patrick Ewing',
    4:'Allen Iverson|Hal Greer|Julius Erving|Charles Barkley|Wilt Chamberlain',
    5:'Kyle Lowry|DeMar DeRozan|Kawhi Leonard|Chris Bosh|Marc Gasol',
    6:'Derrick Rose|Michael Jordan|Scottie Pippen|Dennis Rodman|Artis Gilmore',
    7:'Mark Price|Kyrie Irving|LeBron James|Kevin Love|Brad Daugherty',
    8:'Isiah Thomas|Joe Dumars|Grant Hill|Dennis Rodman|Ben Wallace',
    9:'Mark Jackson|Reggie Miller|Paul George|Jermaine ONeal|Mel Daniels',
    10:'Oscar Robertson|Sidney Moncrief|Marques Johnson|Giannis Antetokounmpo|Kareem Abdul-Jabbar',
    11:'Lenny Wilkens|Pete Maravich|Dominique Wilkins|Bob Pettit|Dikembe Mutombo',
    12:'Kemba Walker|Eddie Jones|Glen Rice|Larry Johnson|Alonzo Mourning',
    13:"Tim Hardaway|Dwyane Wade|LeBron James|Chris Bosh|Shaquille O'Neal",
    14:'Anfernee Hardaway|Nick Anderson|Tracy McGrady|Rashard Lewis|Dwight Howard',
    15:'Gilbert Arenas|Earl Monroe|Bernard King|Elvin Hayes|Wes Unseld',
    16:'Lafayette Lever|David Thompson|Alex English|Dan Issel|Nikola Jokic',
    17:'Sam Cassell|Anthony Edwards|Jimmy Butler|Kevin Garnett|Karl-Anthony Towns',
    18:'Shai Gilgeous-Alexander|Ray allen|Kevin Durant|Shawn Kemp|Jack Sikma',
    19:'Damian Lillard|Clyde Drexler|Jerome Kersey|LaMarcus Aldridge|Bill Walton',
    20:'John Stockton|Donovan Mitchell|Adrian Dantley|Karl Malone|Rudy Gobert',
    21:'Stephen Curry|Klay Thompson|Kevin Durant|Draymond Green|Wilt Chamberlain',
    22:'Chris Paul|Paul George|Kawhi Leonard|Blake Griffin|Bob McAdoo',
    23:'Earvin Johnson|Kobe Bryant|LeBron James|Anthony Davis|Kareem Abdul-Jabbar',
    24:"Steve Nash|Devin Booker|Shawn Marion|Charles Barkley|Amar'e Stoudemire",
    25:'Oscar Robertson|Mitch Richmond|Peja Stojaković|Chris Webber|DeMarcus Cousins',
    26:'Luka Dončić|Rolando Blackman|Mark Aguirre|Dirk Nowitzki|Tyson Chandler',
    27:'Calvin Murphy|James Harden|Tracy McGrady|Elvin Hayes|Hakeem Olajuwon',
    28:'Mike Conley|Tony Allen|Rudy Gay|Zach Randolph|Marc Gasol',
    29:'Chris Paul|Jrue Holiday|Brandon Ingram|Zion Williamson|Anthony Davis',
    30:'Tony Parker|George Gervin|Kawhi Leonard|Tim Duncan|David Robinson'
  };
  assert.equal(teams.length, 30);
  assert.equal(peakTable.rowCount, 150, 'Static peak table must declare 150 rows');
  assert.equal(peakTable.rows.length, 150, 'Static peak table must contain 150 rows');
  assert.equal(pool.rules.historicalPeakSource, peakTable.selection, 'Pool must use the static peak-table selection');
  assert.equal(pool.rules.historicalPeakTable, 'assets/data/perfect-player-historical-peak-table.json', 'Pool must declare its static peak table');
  assert.equal(pool.rules.historicalPeakTableRows, 150, 'Pool must declare all 150 static peak rows');
  assert.equal(pool.rules.historicalDrawChance, 0.20, '历史惊喜卡概率应提高到 20%');
  assert.equal(pool.rules.historicalPeakSource, 'highest rating for each player across rosters01.csv through rosters19.csv', '历史巅峰必须在 1-19 号名单中取最高属性评分');
  const historicalCacheDir = path.join(root, 'assets', 'images', 'Player', 'historical-nba');
  const historicalCachePlaceholders = fs.readdirSync(historicalCacheDir)
    .filter(file => file.endsWith('.png'))
    .filter(file => fs.statSync(path.join(historicalCacheDir, file)).size === 12430);
  assert.deepEqual(historicalCachePlaceholders, [], '历史头像缓存不应残留 NBA 灰色占位图');
  teams.forEach(team => {
    assert.equal(team.players.length, 12, team.name + ' 常规池应有 12 名现役球员');
    assert.equal(team.historicalPlayers.length, 5, team.name + ' 应有 5 张历史惊喜卡');
    assert.equal(team.currentCount, 12, team.name + ' 应有 12 名现役');
    assert.equal(team.historicalCount, 5, team.name + ' 应有 5 名历史惊喜球员');
    assert.deepEqual(team.historicalPlayers.map(player => player.pos).sort(), [1, 2, 3, 4, 5], team.name + ' 历史惊喜池必须覆盖 PG/SG/SF/PF/C');
    assert.equal(team.historicalPlayers.map(player => player.nameEn).join('|'), expectedHistoricalLineups[team.id], team.name + ' 历史五位置名单必须与指定版本一致');
    team.players.forEach(player => {
      assert.ok(fs.existsSync(path.join(root, player.photoLocal)), player.name + ' 缺少本地头像');
    });
    team.historicalPlayers.forEach(player => {
      const photoPath = path.join(root, player.photoLocal);
      assert.ok(fs.existsSync(photoPath), player.name + ' 缺少本地历史头像');
      assert.notEqual(fs.statSync(photoPath).size, 12430, player.name + ' 不能使用 NBA 灰色占位头像');
      assert.ok(!['Terry Cummings', 'Norm Nixon', 'Norman Ellard Nixon'].includes(player.nameEn), player.nameEn + ' 不应进入历史惊喜池');
      assert.ok(['hall-of-fame', 'modern-all-star'].includes(player.historicalTier), player.nameEn + ' 历史层级缺失');
      assert.equal(player.historicalPeak, true, player.nameEn + ' 必须使用巅峰卡');
      assert.equal(player.peakRating, player.rating, player.nameEn + ' 巅峰评分标记不一致');
    });
  });
  const historicalCards = teams.flatMap(team => team.historicalPlayers);
  assert.deepEqual(historicalCards, peakTable.rows, 'Historical pool must be copied directly from the static peak table');
  assert.ok(historicalCards.every(player => player.source && player.source.kind === 'historical'), '历史巅峰卡必须保持历史卡语义');
  assert.ok(historicalCards.every(player => player.source && player.source.code >= 1 && player.source.code <= 19), '150 张历史卡的巅峰来源必须全部来自 1-19 号名单');
  assert.ok(historicalCards.every(player => player.peakSource === 'highest rating for each player across rosters01.csv through rosters19.csv'), '150 张历史卡必须记录跨 1-19 号名单取最高属性评分');
  assert.ok(historicalCards.every(player => !player.source.peakTemplate), '历史卡不应把名单 19 当作固定巅峰模板');
  const correctedHallOfFamers = ['Kevin McHale','Dave Debusschere','Hal Greer','Artis Gilmore','Dennis Rodman','Joe Dumars','Dominique Wilkins','Bernard King','Wes Unseld','David Thompson','Dan Issel','Bill Walton','Bob McAdoo','Mitch Richmond','Tony Parker'];
  const historicalByName = new Map(teams.flatMap(team => team.historicalPlayers).map(player => [player.nameEn, player]));
  assert.deepEqual(correctedHallOfFamers.filter(name => historicalByName.get(name)?.historicalTier !== 'hall-of-fame'), [], '已入选 Naismith 名人堂的球员必须正确标记');
  const lakers = pool.teams['23'];
  const currentLeBron = lakers.players.find(player => player.nameEn === 'LeBron James');
  const peakLeBron = lakers.historicalPlayers.find(player => player.nameEn === 'LeBron James');
  assert.ok(currentLeBron && peakLeBron, '湖人应同时保留现役版和巅峰版 LeBron James');
  assert.notEqual(currentLeBron.uid, peakLeBron.uid, '现役版和巅峰版必须是两张独立球员卡');
  assert.equal(pool.rules.currentAndPeakVersionsIndependent, true, '球员池必须声明现役/巅峰版本独立');
  const derrickRose = teams.find(team => team.id === 6).historicalPlayers.find(player => player.nameEn === 'Derrick Rose');
  assert.ok(derrickRose, '公牛历史惊喜池应包含 Derrick Rose');
  assert.ok(derrickRose.rating >= 95, 'Derrick Rose 应使用巅峰评分，不能再是 86：' + derrickRose.rating);
  assert.equal(derrickRose.peakSource, 'highest rating for each player across rosters01.csv through rosters19.csv', 'Derrick Rose 应使用 1-19 号名单中的最高属性评分');
  assert.ok(derrickRose.source.code >= 1 && derrickRose.source.code <= 19, '历史巅峰来源必须落在 1-19 号名单');
  assert.equal(derrickRose.source.peakTemplate, undefined, '历史巅峰不应再标记为名单 19 模板');

  const port = 8042;
  const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    windowsHide: true,
    stdio: 'ignore'
  });
  let browser;
  try {
    const url = `http://127.0.0.1:${port}/index.html`;
    await waitForHttp(url);
    const { chromium } = loadPlaywright();
    browser = await chromium.launch({
      headless: true,
      executablePath: findBrowser(),
      args: ['--disable-background-networking', '--disable-extensions', '--no-first-run']
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const errors = [];
    const badResponses = [];
    page.on('pageerror', error => errors.push('[pageerror] ' + error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push('[console] ' + message.text() + ' @ ' + (message.location().url || 'unknown'));
    });
    page.on('response', response => {
      if (response.status() >= 400) badResponses.push(response.status() + ' ' + response.url());
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForURL(/\/nba-perfect-player\.html(?:[?#]|$)/, { timeout: 10000 });
    await page.waitForSelector('#screen-menu.active');
    await page.waitForFunction(() => window.PERFECT_PLAYER_POOL_REPORT && window.PERFECT_PLAYER_POOL_REPORT.total === 510);

    assert.equal(await page.locator('.feature-card').count(), 1, '首页只应有虎扑原生涯入口');
    assert.equal(await page.locator('#career-archive-btn').count(), 1, '生涯档案馆入口应只挂在主页生涯卡内');
    assert.equal(await page.locator('#screen-achievements').count(), 0, '征服联盟占位页应移除');
    assert.equal(await page.locator('.btn-share-poster').count(), 0, 'JRs 发帖入口应移除');
    const poolReport = await page.evaluate(() => window.PERFECT_PLAYER_POOL_REPORT);
    assert.deepEqual(poolReport, {
      teams: 30, teamsWithTarget12: 30, teamsWithHistorical5: 30, current: 360, historical: 150, total: 510,
      historicalBuildOnly: true, competitionRosterSource: 'NBA2K_DATA (current-only)'
    });
    const awardEngineProbe = await page.evaluate(() => {
      const engine = window.PERFECT_PLAYER_AWARD_ENGINE;
      function candidate(overrides) {
        return Object.assign({
          key:'candidate', name:'测试球员', team:'LAL', isUser:false, isRookie:false,
          games:82, eligibleGames:82, seasonEndingException:false, minutes:35, starts:82, benchGames:0,
          pts:25, reb:7, ast:6, stl:1.2, blk:0.8, tov:2.5, ts:0.59,
          pdef:80, idef:78, blockAttr:70, reboundAttr:75, clutch:85,
          wins:50, losses:32, winPct:50 / 82, leagueRank:8, teamDefense:0.65,
          ovr:90, age:27,
          prior:{ pts:20, reb:6, ast:5, stl:1, blk:0.6, tov:2.4, ts:0.56, minutes:30, games:75, ovr:85 }
        }, overrides || {});
      }
      const lowAttendance = candidate({ key:'low-attendance', games:64, eligibleGames:64 });
      const seasonEndingException = candidate({ key:'exception', games:62, eligibleGames:62, seasonEndingException:true });
      const starterSixth = candidate({ key:'starter-sixth', starts:50, benchGames:32 });
      const reserveSixth = candidate({ key:'reserve-sixth', starts:8, benchGames:74 });
      const rookieMip = candidate({ key:'rookie-mip', isRookie:true });
      const stagnantMip = candidate({
        key:'stagnant-mip',
        prior:{ pts:24.8, reb:6.9, ast:5.9, stl:1.2, blk:0.8, tov:2.5, ts:0.589, minutes:35, games:80, ovr:90 }
      });
      const teamMvp = candidate({ key:'team-mvp', pts:29, reb:9, ast:8, wins:62, losses:20, winPct:62/82, teamDefense:0.78, ts:0.62 });
      const emptyStatsMvp = candidate({ key:'empty-stats', pts:34, reb:5, ast:4, wins:24, losses:58, winPct:24/82, teamDefense:0.20, ts:0.55 });
      const completeDefender = candidate({ key:'complete-defender', pts:18, reb:9, ast:4, stl:1.7, blk:2.2, pdef:91, idef:96, blockAttr:94, reboundAttr:90, wins:59, losses:23, winPct:59/82, teamDefense:0.94 });
      const blockChaser = candidate({ key:'block-chaser', pts:19, reb:6, ast:2, stl:0.6, blk:3.2, pdef:55, idef:65, blockAttr:99, reboundAttr:62, wins:27, losses:55, winPct:27/82, teamDefense:0.15 });
      const mvpRanks = engine.scoreCandidates([teamMvp, emptyStatsMvp], 'mvp');
      const dpoyRanks = engine.scoreCandidates([completeDefender, blockChaser], 'dpoy');
      const ballotPool = engine.scoreCandidates([
        teamMvp, emptyStatsMvp,
        candidate({ key:'ballot-three', pts:27, wins:52, losses:30, winPct:52/82 }),
        candidate({ key:'ballot-four', pts:26, wins:48, losses:34, winPct:48/82 }),
        candidate({ key:'ballot-five', pts:24, wins:55, losses:27, winPct:55/82 })
      ], 'mvp');
      const ballot = engine.runMediaBallot(ballotPool, 'mvp', 100);
      const allNbaPool = engine.scoreCandidates(Array.from({ length:20 }, (_, index) => candidate({
        key:'all-nba-' + index,
        pts:30 - index * 0.35,
        wins:62 - index,
        losses:20 + index,
        winPct:(62 - index) / 82
      })), 'allNBA');
      const allNbaBallot = engine.runTeamBallot(allNbaPool, 'allNBA', [5,5,5], [5,3,1], 100);
      const allDefensePool = engine.scoreCandidates(Array.from({ length:15 }, (_, index) => candidate({
        key:'all-defense-' + index,
        stl:2.2 - index * 0.04,
        blk:2.5 - index * 0.06,
        pdef:96 - index,
        idef:96 - index,
        teamDefense:0.95 - index * 0.025
      })), 'allDefense');
      const allDefenseBallot = engine.runTeamBallot(allDefensePool, 'allDefense', [5,5], [2,1], 100);
      return {
        version:engine.version,
        major65GameAwards:engine.major65GameAwards,
        ballotPoints:engine.ballotPoints,
        lowAttendance:engine.eligibility(lowAttendance, 'mvp'),
        seasonEndingException:engine.eligibility(seasonEndingException, 'mvp'),
        starterSixth:engine.eligibility(starterSixth, 'sixthman'),
        reserveSixth:engine.eligibility(reserveSixth, 'sixthman'),
        rookieMip:engine.eligibility(rookieMip, 'mip'),
        stagnantMip:engine.eligibility(stagnantMip, 'mip'),
        mvpOrder:mvpRanks.map(item => item.key),
        dpoyOrder:dpoyRanks.map(item => item.key),
        ballotWinner:ballot[0] && ballot[0].candidate.key,
        ballotPointsTotal:ballot.reduce((sum, item) => sum + item.points, 0),
        allNbaPointsTotal:allNbaBallot.reduce((sum, item) => sum + item.points, 0),
        allDefensePointsTotal:allDefenseBallot.reduce((sum, item) => sum + item.points, 0)
      };
    });
    assert.equal(awardEngineProbe.version, '2026.08.13-real-ballot-v1', '应加载新版真实评奖引擎');
    assert.deepEqual(awardEngineProbe.major65GameAwards.sort(), ['allDefense','allNBA','dpoy','mip','mvp'].sort(), '65场门槛必须覆盖五类CBA奖项/阵容');
    assert.deepEqual(awardEngineProbe.ballotPoints, { mvp:[10,7,5,3,1], other:[5,3,1] }, '媒体选票计分必须符合NBA规则');
    assert.equal(awardEngineProbe.lowAttendance.eligible, false, '64场球员不得参与MVP');
    assert.equal(awardEngineProbe.seasonEndingException.eligible, true, '62场且赛季报销时应适用CBA例外');
    assert.equal(awardEngineProbe.starterSixth.eligible, false, '首发多于替补的球员不得参与最佳第六人');
    assert.equal(awardEngineProbe.reserveSixth.eligible, true, '替补出场多于首发且样本充足时应具备第六人资格');
    assert.equal(awardEngineProbe.rookieMip.eligible, false, '新秀不得进入进步最快主评选');
    assert.equal(awardEngineProbe.stagnantMip.eligible, false, '没有真实同比进步的球员不得靠当季原始数据拿MIP');
    assert.deepEqual(awardEngineProbe.mvpOrder, ['team-mvp','empty-stats'], '强队全面核心应压过弱队刷分候选');
    assert.deepEqual(awardEngineProbe.dpoyOrder, ['complete-defender','block-chaser'], 'DPOY必须综合防守影响与球队防守，不能只看盖帽');
    assert.equal(awardEngineProbe.ballotWinner, 'team-mvp', '100人媒体选票应选出履历领先的MVP');
    assert.equal(awardEngineProbe.ballotPointsTotal, 2600, '100张MVP五人选票应按10/7/5/3/1累计2600分');
    assert.equal(awardEngineProbe.allNbaPointsTotal, 4500, '100张最佳阵容选票应按一二三阵5/3/1分累计4500分');
    assert.equal(awardEngineProbe.allDefensePointsTotal, 1500, '100张最佳防守阵容选票应按一防/二防2/1分累计1500分');
    const awardCalculationProbe = await page.evaluate(() => {
      const saved = {
        career:STATE.career, season:STATE.season, careerTeam:STATE.careerTeam,
        finalOVR:STATE.finalOVR, position:STATE.position, attrs:STATE.attrs
      };
      try {
        const standings = {};
        NBA2K_TEAMS.forEach((team, index) => {
          const wins = Math.max(18, 60 - index);
          standings[team] = { wins, losses:82 - wins };
        });
        standings.LAL = { wins:61, losses:21 };
        const games = 70;
        STATE.career = Object.assign({}, saved.career, {
          seasonCount:0,
          currentAge:22,
          seasons:[],
          flags:{},
          leagueAwardHistory:{}
        });
        STATE.careerTeam = 'LAL';
        STATE.finalOVR = 96;
        STATE.position = 'SF';
        STATE.attrs = { threePT:91, MID:92, FIN:94, DNK:88, HAN:93, PAS:94, PDEF:91, IDEF:88, BLK:82, REB:90, ATH:91, STR:84, CLU:96 };
        STATE.season = {
          wins:61, losses:21, standings,
          playerStats:{
            games, pts:29 * games, reb:8 * games, ast:8 * games, stl:1.8 * games, blk:1.4 * games,
            tov:2.6 * games, fgm:11 * games, fga:20 * games, ftm:5 * games, fta:6 * games,
            threeM:2.5 * games, threeA:6.5 * games, mins:35 * games
          },
          games:Array.from({ length:games }, () => ({ stats:{ mins:35 } })),
          events:{ majorInjuryThisSeason:false },
          awards:[]
        };
        calcSeasonAwards();
        const first = JSON.stringify(STATE.season.awards);
        const acts = STATE.season.awards.map(award => award.act);
        const compactVoting = JSON.stringify(STATE.season.awardVoting);
        calcSeasonAwards();
        return {
          version:STATE.season.awardVoting.version,
          acts,
          uniqueActs:new Set(acts).size,
          stable:first === JSON.stringify(STATE.season.awards),
          hasUndefinedWinner:STATE.season.awards.some(award => !award.winner || award.winner.includes('undefined')),
          compactVotingBytes:compactVoting.length,
          mvpBallot:STATE.season.awardVoting.results.mvp,
          allNbaBallot:STATE.season.awardVoting.results.allNBA
        };
      } finally {
        STATE.career = saved.career;
        STATE.season = saved.season;
        STATE.careerTeam = saved.careerTeam;
        STATE.finalOVR = saved.finalOVR;
        STATE.position = saved.position;
        STATE.attrs = saved.attrs;
        clearLineupCache();
      }
    });
    assert.equal(awardCalculationProbe.version, '2026.08.13-real-ballot-v1', '完整赛季应使用新版评奖引擎');
    assert.deepEqual(['mvp','dpoy','mip','allStar','roty','sixthman','allNBA','allDefense','allRookie'].filter(act => !awardCalculationProbe.acts.includes(act)), [], '新秀赛季应生成全部九类主要荣誉');
    assert.equal(awardCalculationProbe.uniqueActs, awardCalculationProbe.acts.length, '同一奖项不得重复生成');
    assert.equal(awardCalculationProbe.stable, true, '同一赛季重复打开评奖页时结果必须保持不变');
    assert.equal(awardCalculationProbe.hasUndefinedWinner, false, '完整评奖不得出现空获奖者');
    assert.ok(awardCalculationProbe.compactVotingBytes < 30000, '保存的投票摘要必须保持轻量，不能写入整套球员对象');
    assert.ok(awardCalculationProbe.mvpBallot.length >= 5 && awardCalculationProbe.allNbaBallot.length >= 15, '应保存可核对的MVP与最佳阵容投票榜');
    assert.deepEqual(await page.evaluate(() => [
      PP_FX.classifyAchievementAward(null, '最佳阵容一阵'),
      PP_FX.classifyAchievementAward(null, '最佳防守二阵'),
      PP_FX.classifyAchievementAward(null, '最佳新秀一阵')
    ]), ['allNBA','allDefense','allRookie'], '归档后的一二三阵精确名称必须保持正确奖项分类');
    const poolSeparation = await page.evaluate(() => ({
      buildSize: PERFECT_PLAYER_BUILD_DATA.LAL.length,
      buildHistorical: PERFECT_PLAYER_HISTORICAL_SURPRISE_DATA.LAL.length,
      buildHistoricalNames: PERFECT_PLAYER_HISTORICAL_SURPRISE_DATA.LAL.map(player => player.name),
      leagueSize: NBA2K_DATA.LAL.length,
      leagueHistorical: NBA2K_DATA.LAL.filter(player => player._sourceKind === 'historical').length,
      lineupHistorical: Object.values(calcTeamLineup('LAL').starters).concat(calcTeamLineup('LAL').bench).filter(player => player._sourceKind === 'historical').length
    }));
    assert.equal(poolSeparation.buildSize, 12, '建模常规池应保留每队 12 名现役球员');
    assert.equal(poolSeparation.buildHistorical, 5, '建模历史惊喜池应有五名球员');
    assert.ok(!poolSeparation.buildHistoricalNames.includes('Terry Cummings') && !poolSeparation.buildHistoricalNames.includes('Norm Nixon'), '非名人堂球员不应进入历史惊喜池');
    assert.ok(poolSeparation.leagueSize >= 10, '正式球队应保留原现役轮换');
    assert.equal(poolSeparation.leagueHistorical, 0, '正式比赛名单不应注入经典球员');
    assert.equal(poolSeparation.lineupHistorical, 0, '比赛轮换不应出现经典球员');
    const leagueHeadshots = await page.evaluate(() => {
      const current = NBA2K_TEAMS.flatMap(team => NBA2K_DATA[team] || []);
      const rookies = DRAFT_CLASS_2026.map(item => (NBA2K_DATA[item.team] || []).find(player => player.cname === item.cn));
      return {
        currentCount: current.length,
        currentMissing: current.filter(player => !player.photoLocal || !player.nbaId).map(player => player.name),
        rookieCount: rookies.filter(Boolean).length,
        rookieMissing: rookies.filter(player => !player || !player.photoLocal || !player.nbaId).map(player => player && player.cname),
        rookieStyle: rookies[0] ? getPlayerHeadshotStyle(rookies[0], 44) : ''
      };
    });
    assert.equal(leagueHeadshots.currentCount, 585, '正式名单应包含 525 名原球员和 60 名 2026 新秀');
    assert.deepEqual(leagueHeadshots.currentMissing, [], '正式比赛名单的球员应全部有官方头像缓存');
    assert.equal(leagueHeadshots.rookieCount, 60, '2026 新秀应全部进入选秀名单');
    assert.deepEqual(leagueHeadshots.rookieMissing, [], '2026 新秀应全部有官方头像缓存');
    assert.ok(leagueHeadshots.rookieStyle.includes('assets/images/Player/rookies-2026/rookie-01.jpg'), '2026 新秀头像应使用 NBA 官方资料页肖像缓存');
    const generatedRookiePhotos = await page.evaluate(() => Array.from({ length: 100 }, () => nextGeneratedRookiePortrait()));
    assert.equal(new Set(generatedRookiePhotos).size, 100, '100 张随机新秀头像应在一轮内不重复');
    assert.ok(generatedRookiePhotos.every(photo => /^assets\/images\/Player\/generated-rookies\/generated-rookie-\d{3}\.png$/.test(photo)), '随机新秀应使用新头像池');
    assert.equal(await page.evaluate(() => window.PERFECT_PLAYER_EVENT_REPORT.added), 12, '应扩充 12 个原机制事件');
    assert.equal(await page.evaluate(() => window.PERFECT_PLAYER_EVENT_REPORT.seasonAdded), 200, '可直接抽取的赛季日常事件库应扩充到 200 条');
    assert.deepEqual(await page.evaluate(() => ({
      added: PERFECT_PLAYER_SEASON_EVENT_REPORT.added,
      ids: PERFECT_PLAYER_SEASON_EVENT_REPORT.ids.length,
      config: PERFECT_PLAYER_SEASON_EVENT_REPORT.config,
      openingPoolOnly: PERFECT_PLAYER_SEASON_EVENT_REPORT.openingPoolOnly
    })), {
      added: 200,
      ids: 200,
      config: { chancePercent: 14, cooldownGames: 7, maxPerSeason: 5, maxWithRelationship: 5, openingGames: 12, noRepeatCareer: true },
      openingPoolOnly: true
    });
    assert.deepEqual(await page.evaluate(() => window.PERFECT_PLAYER_DRAFT_EVENT_REPORT), {
      total: 35, pre: 18, post: 17, perRun: 2, stageChance: { pre: 0.9, post: 0.85 }
    });
    const randomDraftIds = await page.evaluate(() => {
      const ids = [];
      for (let index = 0; index < 100; index++) ids.push(pickPerfectPlayerDraftEventId('pre', []));
      return [...new Set(ids)];
    });
    assert.ok(randomDraftIds.length >= 8, '选秀事件抽取不应固定：' + randomDraftIds.join(','));
    const seasonPoolProbe = await page.evaluate(() => {
      const pool = STAGED_BRANCH_EVENTS.filter(event => event.id && event.id.startsWith('pp_season_'));
      const ids = [];
      for (let index = 0; index < 200; index++) ids.push(pickBranchEvent(pool, false).id);
      const choicePredictions = pool.flatMap(event => event.choices.map((choice, index) => getEventChoicePrediction(choice, event, index)));
      return {
        count: pool.length,
        uniqueIds: new Set(pool.map(event => event.id)).size,
        uniqueTitles: new Set(pool.map(event => event.title)).size,
        uniqueScenes: new Set(pool.map(event => (event.scenes || []).join('|'))).size,
        uniqueTopics: new Set(pool.map(event => event.topicId)).size,
        uniqueDecisionPairs: new Set(pool.map(event => event.choices.map(choice => choice.label).join('|'))).size,
        uniqueDraws: [...new Set(ids)],
        hasRequires: pool.some(event => typeof event.requires === 'function'),
        choiceCounts: pool.map(event => event.choices.length),
        choicePredictionCount: choicePredictions.length,
        missingChoicePredictions: choicePredictions.filter(text => !text || !text.trim()).length,
        genericChoicePredictions: choicePredictions.filter(text => text.includes('采取这一路线并承担相应影响') || text.includes('选择另一种处理方式')).length,
        duplicatePredictionPairs: pool.filter(event => {
          const predictions = event.choices.map((choice, index) => getEventChoicePrediction(choice, event, index));
          return new Set(predictions).size !== predictions.length;
        }).length,
        uniqueChoicePredictions: new Set(choicePredictions).size,
        fallbackPrediction: getEventChoicePrediction({ label:'测试选项' }, { title:'测试事件' }, 0),
        derivedPrediction: getEventChoicePrediction({
          label:'优先恢复',
          hint:'先照顾身体',
          apply:function() { addSeasonMod('staminaLoad', -2, -10, 10); }
        }, { title:'恢复测试' }, 0)
      };
    });
    assert.equal(seasonPoolProbe.count, 200, '赛季日常事件池应有 200 条独立事件');
    assert.equal(seasonPoolProbe.uniqueIds, 200, '200 条赛季事件 ID 必须全部唯一');
    assert.equal(seasonPoolProbe.uniqueTitles, 200, '200 条赛季事件标题必须全部唯一');
    assert.equal(seasonPoolProbe.uniqueScenes, 200, '200 条赛季事件场景必须全部唯一');
    assert.equal(seasonPoolProbe.uniqueTopics, 200, '200 条赛季事件必须拥有 200 个独立主题，不能再用场景前缀包装同一主题');
    assert.equal(seasonPoolProbe.uniqueDecisionPairs, 200, '200 条赛季事件的两项决策组合必须全部不同');
    assert.ok(seasonPoolProbe.uniqueDraws.length >= 100, '赛季日常事件抽取应有足够多样性：' + seasonPoolProbe.uniqueDraws.length);
    assert.equal(seasonPoolProbe.hasRequires, false, '新增开局事件必须全部可直接抽取');
    assert.ok(seasonPoolProbe.choiceCounts.every(count => count >= 2), '每条新增赛季事件都应至少有两个选择');
    assert.equal(seasonPoolProbe.choicePredictionCount, 400, '200 条赛季事件的 400 个选项都必须显示结果预告');
    assert.equal(seasonPoolProbe.missingChoicePredictions, 0, '所有赛季事件选项都必须显示自然的结果提示');
    assert.equal(seasonPoolProbe.genericChoicePredictions, 0, '事件选项不能继续使用两句统一的空泛模板');
    assert.equal(seasonPoolProbe.duplicatePredictionPairs, 0, '同一事件内的不同选择必须给出不同结果预告');
    assert.ok(seasonPoolProbe.uniqueChoicePredictions >= 30, '结果提示必须保持足够差异，不能换回统一模板：' + seasonPoolProbe.uniqueChoicePredictions);
    assert.ok(seasonPoolProbe.fallbackPrediction.includes('测试选项') && seasonPoolProbe.fallbackPrediction.includes('测试事件'), '缺失 hint 的未来事件也必须获得与选项和事件相关的兜底预告');
    assert.ok(seasonPoolProbe.derivedPrediction.includes('体能负荷明显下降'), '可确定的实际变化应按原有自然模板进入提示：' + seasonPoolProbe.derivedPrediction);
    const eventChoiceModalProbe = await page.evaluate(() => {
      const previousEvent = STATE._seasonBranchEvent;
      const previousPage = STATE._seasonBranchScenePage;
      try {
        const event = STAGED_BRANCH_EVENTS.find(item => item.id === 'pp_season_unique_broken_clock');
        STATE._seasonBranchEvent = event;
        STATE._seasonBranchScenePage = (event.scenes || []).length;
        showSeasonBranchEventModal();
        const modal = document.getElementById('season-branch-modal');
        const subtitles = [...modal.querySelectorAll('button span')].map(item => item.textContent.trim());
        return { subtitles, text:modal.textContent };
      } finally {
        document.getElementById('season-branch-modal')?.remove();
        STATE._seasonBranchEvent = previousEvent;
        STATE._seasonBranchScenePage = previousPage;
      }
    });
    assert.deepEqual(eventChoiceModalProbe.subtitles, [
      '领导力明显提升、媒体信任提升，但媒体压力增加',
      '教练信任提升、状态更稳定'
    ], '事件选项应沿用原有自然结果模板，并让两个选择显示不同影响');
    assert.ok(!eventChoiceModalProbe.text.includes('结果预告'), '事件界面不应额外显示“结果预告”标签');
    const stateAwareEventProbe = await page.evaluate(() => {
      const savedCareer = STATE.career;
      const savedSeason = STATE.season;
      const savedTeam = STATE.careerTeam;
      const savedOvr = STATE.finalOVR;
      const pool = STAGED_BRANCH_EVENTS.filter(event => event.id && event.id.startsWith('pp_season_'));
      function runScenario(options) {
        const wins = options.streak === 'W' ? options.streakLen : 8;
        const losses = options.streak === 'L' ? options.streakLen : 4;
        const gamesPlayed = options.gamesPlayed || wins + losses;
        STATE.career = Object.assign({}, savedCareer, {
          seasonCount: options.seasonCount == null ? 1 : options.seasonCount,
          contract: options.contract == null ? 3 : options.contract,
          branches: {},
          profile: Object.assign({}, savedCareer.profile || {}, { fame: options.fame || 0, controversy: options.controversy || 0 }),
          nextSeasonMods: Object.assign({}, savedCareer.nextSeasonMods || {}, {
            staminaLoad: options.staminaLoad || 0,
            injuryRiskBonus: options.injuryRiskBonus || 0,
            teamChemistry: options.teamChemistry || 0,
            mediaPressure: options.mediaPressure || 0
          })
        });
        STATE.careerTeam = 'LAL';
        STATE.finalOVR = options.ovr || 82;
        const recentWon = options.streak === 'W';
        STATE.season = {
          isPlayoffs: false,
          wins,
          losses,
          standings: { LAL: { wins, losses, streak: options.streak, streakLen: options.streakLen } },
          games: Array.from({ length: gamesPlayed }, (_, index) => ({
            result: { won: index >= gamesPlayed - options.streakLen ? recentWon : index % 2 === 0 },
            stats: { pts: options.poor ? 8 : 24, fgm: options.poor ? 3 : 9, fga: 18, tov: options.poor ? 6 : 2 },
            game: { home: options.home, day: Math.max(0, options.day - gamesPlayed + index + 1) }
          })),
          schedule: Array.from({ length: 82 }, () => ({})),
          playerStats: { games: gamesPlayed, pts: gamesPlayed * 24 },
          events: {}
        };
        const game = { home: options.home, day: options.day, opponent: 'BOS' };
        const result = { won: options.won };
        const stats = options.poor ? { pts: 8, fgm: 3, fga: 18, tov: 6 } : { pts: 30, fgm: 11, fga: 19, tov: 2 };
        const state = getSeasonEventState(game, result, stats);
        const eligible = pool.filter(event => isSeasonEventStateEligible(event, state));
        const draws = Array.from({ length: 300 }, () => pickSeasonStateAwareEvent(eligible, state));
        const lossPress = STAGED_BRANCH_EVENTS.find(event => event.id === 'media_first_press');
        const teammateSlump = STAGED_BRANCH_EVENTS.find(event => event.id === 'teammate_slump');
        return {
          state,
          contexts: [...new Set(eligible.map(event => event.contextId).filter(Boolean))],
          drawnContexts: [...new Set(draws.map(event => event && event.contextId).filter(Boolean))],
          eligibleIds: eligible.map(event => event.id),
          lossPressEligible: isSeasonEventStateEligible(lossPress, state),
          teammateSlumpEligible: isSeasonEventStateEligible(teammateSlump, state),
          fatigueWeight: getSeasonEventStateWeight(pool.find(event => event.id === 'pp_season_recovery_lab'), state),
          neutralWeight: getSeasonEventStateWeight(pool.find(event => event.id === 'pp_season_weather_delay'), state)
        };
      }
      try {
        return {
          generatedTagged: pool.filter(event => event.id.includes('_unique_')).every(event => !!event.topicId),
          winStreak: runScenario({ streak:'W', streakLen:4, home:true, won:true, day:60 }),
          losingStreak: runScenario({ streak:'L', streakLen:3, home:false, won:false, day:60, poor:true }),
          deadline: runScenario({ streak:'W', streakLen:1, home:true, won:true, day:105 }),
          spotlight: runScenario({ streak:'W', streakLen:1, home:true, won:true, day:60, fame:10 }),
          fatigue: runScenario({ streak:'W', streakLen:1, home:false, won:true, day:60, staminaLoad:5, injuryRiskBonus:3 }),
          roadWin: runScenario({ streak:'W', streakLen:1, home:false, won:true, day:60 })
        };
      } finally {
        STATE.career = savedCareer;
        STATE.season = savedSeason;
        STATE.careerTeam = savedTeam;
        STATE.finalOVR = savedOvr;
      }
    });
    assert.ok(stateAwareEventProbe.generatedTagged, '扩充事件必须保留主题和赛况标签');
    assert.ok(stateAwareEventProbe.winStreak.contexts.includes('streak') && !stateAwareEventProbe.winStreak.contexts.includes('slump'), '连胜时只能进入连胜池，不能出现连败事件：' + JSON.stringify(stateAwareEventProbe.winStreak));
    assert.ok(!stateAwareEventProbe.winStreak.drawnContexts.includes('slump'), '连胜抽样不得抽到连败文案');
    assert.ok(stateAwareEventProbe.losingStreak.contexts.includes('slump') && !stateAwareEventProbe.losingStreak.contexts.includes('streak'), '连败时只能进入连败池，不能出现连胜事件');
    assert.ok(!stateAwareEventProbe.losingStreak.drawnContexts.includes('streak'), '连败抽样不得抽到连胜文案');
    assert.ok(!stateAwareEventProbe.winStreak.contexts.includes('deadline') && stateAwareEventProbe.deadline.contexts.includes('deadline'), '交易截止日事件必须只在截止日窗口出现');
    assert.ok(!stateAwareEventProbe.winStreak.contexts.includes('national') && stateAwareEventProbe.spotlight.contexts.includes('national'), '全国直播事件必须匹配球星关注度或焦点赛程');
    assert.ok(!stateAwareEventProbe.winStreak.eligibleIds.includes('pp_season_locker_music'), '连胜期间不得出现明确写着连败的更衣室事件');
    assert.ok(!stateAwareEventProbe.winStreak.eligibleIds.includes('pp_season_home_booing'), '主场赢球且表现出色时不得出现主场嘘声事件');
    assert.equal(stateAwareEventProbe.winStreak.lossPressEligible, false, '赢球后不得出现输球发布会');
    assert.equal(stateAwareEventProbe.losingStreak.lossPressEligible, true, '输球后应允许出现输球发布会');
    assert.equal(stateAwareEventProbe.winStreak.teammateSlumpEligible, false, '连胜且更衣室正常时不得出现队友低谷');
    assert.equal(stateAwareEventProbe.losingStreak.teammateSlumpEligible, true, '连败时应允许出现队友低谷');
    assert.ok(stateAwareEventProbe.roadWin.eligibleIds.includes('pp_season_team_dinner'), '客场赢球后才允许出现客场赢球聚餐事件');
    assert.ok(stateAwareEventProbe.fatigue.fatigueWeight > stateAwareEventProbe.fatigue.neutralWeight, '疲劳和伤病风险升高时恢复类事件权重应提高');
    assert.deepEqual(await page.evaluate(() => window.PERFECT_PLAYER_EVENT_LIBRARY_REPORT), {
      generated: 179, uniqueStories: 179, uniqueDecisionPairs: 179, uniqueChoiceHints: 18, templateMatrix: false
    });
    const openingEventProbe = await page.evaluate(() => {
      const savedCareer = STATE.career;
      const savedSeason = STATE.season;
      const savedTeam = STATE.careerTeam;
      const originalRandom = Math.random;
      let output = null;
      try {
        STATE.career = Object.assign({}, savedCareer, {
          seasonCount: 1,
          branches: {},
          flags: Object.assign({}, savedCareer.flags || {}),
          profile: Object.assign({}, savedCareer.profile || {}),
          totalStats: Object.assign({}, savedCareer.totalStats || {}, { games: 4 }),
          branchSeasonEvents: { _season: 0, _count: 4 },
          _lastSeasonBranchGame: 75,
          _recentSeasonEventIds: [],
          _seenSeasonEventIds: []
        });
        STATE.season = {
          isPlayoffs: false,
          games: Array.from({ length: 4 }, () => ({})),
          schedule: Array.from({ length: 82 }, () => ({})),
          playerStats: { games: 4 },
          awards: []
        };
        STATE.careerTeam = 'LAL';
        Math.random = () => 0.99;
        const picked = checkSeasonBranchEvent({ opponent: 'BOS' }, { won: true }, { pts: 20 });
        output = {
          id: picked && picked.id,
          count: STATE.career.branchSeasonEvents._count,
          lastGame: STATE.career._lastSeasonBranchGame,
          seen: STATE.career._seenSeasonEventIds.slice()
        };
      } finally {
        Math.random = originalRandom;
        STATE.career = savedCareer;
        STATE.season = savedSeason;
        STATE.careerTeam = savedTeam;
      }
      return output;
    });
    assert.ok(openingEventProbe.id && openingEventProbe.id.startsWith('pp_season_'), '新生涯首条事件必须来自扩充池，而不是固定城市/失利事件：' + JSON.stringify(openingEventProbe));
    assert.equal(openingEventProbe.count, 1, '跨赛季事件计数应重置后重新开始');
    assert.equal(openingEventProbe.lastGame, 4, '跨赛季冷却场次必须重置，不能沿用上一季场次');
    assert.deepEqual(openingEventProbe.seen, [openingEventProbe.id], '出现过的事件应进入整个生涯的永久防重复记录');
    const seasonEventLimitProbe = await page.evaluate(() => {
      const savedCareer = STATE.career;
      const savedSeason = STATE.season;
      const savedTeam = STATE.careerTeam;
      const originalRandom = Math.random;
      try {
        const historyId = 'pp_season_empty_gym';
        const legacyRecentId = 'pp_season_film_detail';
        const directSeenId = 'pp_season_road_sleep';
        STATE.career = Object.assign({}, savedCareer, {
          seasonCount: 2,
          branches: {},
          branchHistory: [{ phase:'season', eventId:historyId }],
          _recentSeasonEventIds: [legacyRecentId],
          _seenSeasonEventIds: [directSeenId],
          branchSeasonEvents: { _season:2, _count:5 },
          _lastSeasonBranchGame: 10
        });
        STATE.careerTeam = 'LAL';
        STATE.season = {
          isPlayoffs:false,
          wins:18,
          losses:12,
          standings:{ LAL:{ streak:'W', streakLen:2 } },
          games:Array.from({ length:30 }, () => ({ result:{ won:true }, stats:{ pts:24 } })),
          schedule:Array.from({ length:82 }, () => ({})),
          playerStats:{ games:30, pts:720 },
          events:{}
        };
        const seen = getSeenSeasonEventIds(STATE.career).slice();
        markSeasonEventSeen({ id:directSeenId }, STATE.career);
        Math.random = () => 0;
        const blockedAtCap = checkSeasonBranchEvent({ home:true, day:60, opponent:'BOS' }, { won:true }, { pts:25, fgm:9, fga:18, tov:2 });
        return {
          seen,
          uniqueAfterDuplicateMark: new Set(STATE.career._seenSeasonEventIds).size === STATE.career._seenSeasonEventIds.length,
          blockedAtCap: blockedAtCap === null
        };
      } finally {
        Math.random = originalRandom;
        STATE.career = savedCareer;
        STATE.season = savedSeason;
        STATE.careerTeam = savedTeam;
      }
    });
    assert.ok(seasonEventLimitProbe.seen.includes('pp_season_empty_gym'), '旧存档的赛季事件历史必须迁移到永久去重集合');
    assert.ok(seasonEventLimitProbe.seen.includes('pp_season_film_detail'), '旧版最近事件记录必须迁移到永久去重集合');
    assert.ok(seasonEventLimitProbe.seen.includes('pp_season_road_sleep'), '新版已出现事件记录必须保留');
    assert.ok(seasonEventLimitProbe.uniqueAfterDuplicateMark, '同一事件重复登记时不能产生重复 ID');
    assert.ok(seasonEventLimitProbe.blockedAtCap, '每季达到 5 次后不得继续弹出普通赛季事件');

    const outputDir = path.join(root, 'output', 'perfect-player-hupu-mobile');
    fs.mkdirSync(outputDir, { recursive: true });
    const automaticCareerArchiveProbe = await page.evaluate(async () => {
      const saved = { career:STATE.career, gameId:STATE.gameId, finalOVR:STATE.finalOVR, position:STATE.position, careerTeam:STATE.careerTeam };
      await storageSet(CAREER_ARCHIVE_KEY, { v:1, records:[] });
      CAREER_ARCHIVE_READY = null;
      CAREER_ARCHIVE_CACHE = [];
      try {
        STATE.gameId = 'automatic-retired-career';
        STATE.finalOVR = 94;
        STATE.position = 'PG';
        STATE.careerTeam = 'LAL';
        STATE.career = {
          retired:true, currentAge:39, seasons:[{seasonNum:1,team:'LAL'}],
          totalStats:{games:900,pts:22000,reb:5000,ast:7000,stl:1200,blk:300,fgm:8000,fga:16000,threeM:1600,threeA:4300,ftm:4400,fta:5200},
          honors:[{seasonNum:1,label:'MVP'},{seasonNum:1,label:'总冠军'}], flags:{}, draft:{round:1,pick:5},
          legacy:{score:150,tier:'NBA历史百大',hof:true,top100:true,goat:false,historicalRank:42,seasonsCount:1,jerseyTeams:[],longestTeam:'LAL',championships:1,mvp:1,fmvp:0,dpoy:0,allNBA:0,allStar:0,points:22000,games:900}
        };
        await archiveCompletedCareer();
        return { count:CAREER_ARCHIVE_CACHE.length, id:CAREER_ARCHIVE_CACHE[0]?.id, games:CAREER_ARCHIVE_CACHE[0]?.stats.games, rank:CAREER_ARCHIVE_CACHE[0]?.historicalRank };
      } finally {
        STATE.career = saved.career;
        STATE.gameId = saved.gameId;
        STATE.finalOVR = saved.finalOVR;
        STATE.position = saved.position;
        STATE.careerTeam = saved.careerTeam;
        await storageSet(CAREER_ARCHIVE_KEY, { v:1, records:[] });
        CAREER_ARCHIVE_CACHE = [];
        CAREER_ARCHIVE_READY = null;
      }
    });
    assert.deepEqual(automaticCareerArchiveProbe, { count:1, id:'automatic-retired-career', games:900, rank:44 }, '角色退役后必须自动把荣耀、数据和百大名次写入档案馆');
    const careerArchiveSeed = await page.evaluate(async () => {
      await storageSet(CAREER_ARCHIVE_KEY, { v:1, records:[] });
      CAREER_ARCHIVE_READY = null;
      CAREER_ARCHIVE_CACHE = [];
      const baseStats = { games:1000, points:25000, rebounds:7000, assists:6500, steals:1300, blocks:600, fgm:9000, fga:18000, threeM:1800, threeA:4800, ftm:5200, fta:6100 };
      function record(id, name, score, rank, rings, mvp, avatar) {
        return {
          id, name, score, historicalRank:rank, top100:rank <= 100, tier:rank <= 10 ? '历史前十级别' : 'NBA历史百大',
          avatar, position:'控球后卫', ovr:96, age:38, seasons:16, teams:[{id:'LAL',name:'洛杉矶湖人'}], longestTeam:'洛杉矶湖人', draft:'首轮第3顺位',
          completedAt:score * 10, stats:Object.assign({}, baseStats, { points:baseStats.points + score * 10 }),
          honors:{ championships:rings, mvp, fmvp:rings, dpoy:1, allNBA:9, allStar:12, hof:true, jerseyTeams:['洛杉矶湖人'] },
          honorDetails:[{label:'总冠军',count:rings},{label:'MVP',count:mvp}]
        };
      }
      await saveCareerArchiveRecord(record('archive-a','林一飞',160,18,2,2,'assets/images/Player/ai-avatars/avatar-01.png'));
      await saveCareerArchiveRecord(record('archive-b','周天成',188,7,4,3,'assets/images/Player/ai-avatars/avatar-07.png'));
      await saveCareerArchiveRecord(record('archive-a','林一飞',170,14,3,2,'assets/images/Player/ai-avatars/avatar-01.png'));
      return { count:CAREER_ARCHIVE_CACHE.length, order:CAREER_ARCHIVE_CACHE.map(item => item.id), buttonCount:document.getElementById('career-archive-count')?.textContent };
    });
    assert.deepEqual(careerArchiveSeed, { count:2, order:['archive-b','archive-a'], buttonCount:'2' }, '档案馆应按历史分排名，并用 gameId 更新同一角色而不是重复新增');
    await page.click('#career-archive-btn');
    await page.waitForSelector('#career-archive-modal .career-archive-row');
    const careerArchiveListProbe = await page.evaluate(() => {
      const modal = document.querySelector('#career-archive-modal .career-archive-modal');
      const rows = Array.from(document.querySelectorAll('#career-archive-modal .career-archive-row'));
      return {
        rows:rows.length,
        names:rows.map(row => row.querySelector('.career-archive-row-main b')?.textContent),
        ranks:rows.map(row => row.querySelector('.career-archive-user-rank')?.textContent),
        rule:document.querySelector('.career-archive-rule')?.textContent || '',
        singleScreen:!!modal && modal.getBoundingClientRect().top >= -1 && modal.getBoundingClientRect().bottom <= innerHeight + 1,
        textState:JSON.parse(render_game_to_text()).careerArchive
      };
    });
    assert.deepEqual(careerArchiveListProbe.names, ['周天成','林一飞'], '档案馆应以历史分从高到低排列角色');
    assert.deepEqual(careerArchiveListProbe.ranks, ['#1','#2'], '档案馆必须显示玩家历代角色内部排名');
    assert.ok(careerArchiveListProbe.rows === 2 && careerArchiveListProbe.singleScreen && careerArchiveListProbe.rule.includes('历史分'), '档案馆排名列表必须在主页手机单屏内显示：' + JSON.stringify(careerArchiveListProbe));
    assert.ok(careerArchiveListProbe.textState.open && careerArchiveListProbe.textState.count === 2, '文本状态必须同步档案馆列表');
    await page.screenshot({ path:path.join(outputDir,'00-career-archive-ranking.png'), fullPage:false });
    await page.locator('#career-archive-modal .career-archive-row').first().click();
    const careerArchiveDetailProbe = await page.evaluate(() => {
      const content = document.querySelector('#career-archive-modal .career-archive-content');
      return {
        detail:!!document.querySelector('.career-archive-detail-hero'),
        text:content?.textContent.replace(/\s+/g,' ').trim() || '',
        honorCells:document.querySelectorAll('.career-archive-honor-grid span').length,
        statCells:document.querySelectorAll('.career-archive-stat-grid span').length,
        textState:JSON.parse(render_game_to_text()).careerArchive
      };
    });
    assert.ok(careerArchiveDetailProbe.detail && careerArchiveDetailProbe.honorCells === 6 && careerArchiveDetailProbe.statCells === 12, '角色详情必须展示完整荣耀和生涯数据');
    assert.ok(careerArchiveDetailProbe.text.includes('周天成') && careerArchiveDetailProbe.text.includes('历史排名第7名') && careerArchiveDetailProbe.text.includes('总得分'), '角色详情必须写明姓名、历史名次和数据：' + careerArchiveDetailProbe.text);
    assert.ok(careerArchiveDetailProbe.textState.detail, '文本状态必须同步档案详情页');
    await page.screenshot({ path:path.join(outputDir,'00b-career-archive-detail.png'), fullPage:false });
    await page.evaluate(async () => {
      closeCareerArchive();
      await storageSet(CAREER_ARCHIVE_KEY, { v:1, records:[] });
      CAREER_ARCHIVE_CACHE = [];
      CAREER_ARCHIVE_READY = null;
      refreshCareerArchiveButton();
    });

    await page.click('#feature-grid .fc-btn');
    await page.waitForSelector('#screen-character.active');
    assert.equal(await page.locator('#career-archive-btn').isVisible(), false, '生涯档案馆入口只能在主页显示');
    assert.equal(await page.locator('.character-avatar-tab').count(), 3, '角色创建应有亚洲、白人、黑人三个头像分组');
    const availableAvatarPaths = [];
    for (const group of ['亚洲', '白人', '黑人']) {
      await page.locator('.character-avatar-tab').filter({ hasText: group }).click();
      assert.equal(await page.locator('.character-avatar').count(), 6, group + '分组应有 6 张真人大头照');
      availableAvatarPaths.push(...await page.$$eval('.character-avatar', nodes => nodes.map(node => node.getAttribute('data-avatar'))));
    }
    assert.equal(new Set(availableAvatarPaths).size, 18, '三个分组应提供 18 张不同主角头像');
    await page.locator('.character-avatar-tab').filter({ hasText: '白人' }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.character-avatar img')].every(image => image.complete && image.naturalWidth > 0), null, { timeout: 15000 });
    const avatarLoads = await page.$$eval('.character-avatar img', images => images.map(image => image.complete && image.naturalWidth > 0));
    assert.ok(avatarLoads.every(Boolean), '六张头像都应完成加载');
    const cachedOldEntryRepair = await page.evaluate(() => {
      document.getElementById('character-avatar-tabs').remove();
      document.getElementById('character-avatar-grid').innerHTML = '';
      renderCharacterCreator();
      return {
        tabs: document.querySelectorAll('.character-avatar-tab').length,
        avatars: document.querySelectorAll('.character-avatar img').length
      };
    });
    assert.deepEqual(cachedOldEntryRepair, { tabs: 3, avatars: 6 }, '旧缓存入口缺少分组节点时必须自动恢复头像选择器');
    await page.waitForFunction(() => [...document.querySelectorAll('.character-avatar img')].every(image => image.complete && image.naturalWidth > 0), null, { timeout: 15000 });
    const characterBounds = await page.$eval('#screen-character', element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
    });
    assert.ok(characterBounds.top >= -1 && characterBounds.bottom <= characterBounds.viewport + 1, '角色创建可操作区应在手机单屏内');

    await page.screenshot({ path: path.join(outputDir, '01-character.png'), fullPage: false });

    await page.evaluate(() => {
      const event = STAGED_BRANCH_EVENTS.find(item => item.id === 'pp_season_unique_fan_video');
      showSeasonBranchEvent(event, () => {});
    });
    await page.waitForSelector('#season-branch-modal');
    await page.locator('#season-branch-modal button').click();
    await page.waitForFunction(() => document.querySelectorAll('#season-branch-modal button').length >= 2);
    assert.equal(await page.locator('#season-branch-modal button').count(), 2, '新增赛季事件应提供可操作选择');
    const seasonEventBounds = await page.$eval('#season-branch-modal .team-picker-modal', element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
    });
    assert.ok(seasonEventBounds.top >= -1 && seasonEventBounds.bottom <= seasonEventBounds.viewport + 1, '新增赛季事件应在手机竖屏单屏内完成选择');
    await page.screenshot({ path: path.join(outputDir, '01b-season-event-pool.png'), fullPage: false });
    await page.evaluate(() => {
      const modal = document.getElementById('season-branch-modal');
      if (modal) modal.remove();
      STATE._seasonBranchEvent = null;
      STATE._seasonBranchDone = null;
      STATE._seasonBranchScenePage = 0;
    });

    await page.fill('#character-name', '林一飞');
    await page.click('.character-avatar:nth-child(4)');
    await page.click('#screen-character .btn-primary');
    await page.waitForSelector('#screen-position.active');
    await page.click('.pos-card:nth-child(2)');
    await page.click('#screen-position .btn-primary');
    await page.waitForSelector('#screen-build.active');

    await page.locator('#br-slot-area .slot-btn').filter({ hasText: '随机球队' }).click();
    await page.waitForSelector('.br-player', { timeout: 6000 });
    assert.equal(await page.locator('.br-player').count(), 5, '虎扑原机制每轮必须只显示五人');
    const firstBatchNames = await page.$$eval('.br-player .bp-name', nodes => nodes.map(node => node.textContent.trim()));
    assert.equal(new Set(firstBatchNames).size, 5, '同一轮五名球员不能重复');
    await page.evaluate(() => {
      STATE._rerollsLeft = 0;
      STATE._mockAdRerollsLeft = 3;
      updateSlotButtons();
    });
    await page.locator('#br-slot-area .slot-btn').filter({ hasText: '看广告换球员' }).click();
    await page.waitForTimeout(850);
    assert.equal(await page.evaluate(() => STATE._mockAdRerollsLeft), 2, '模拟广告重选应消耗一次且生效');
    assert.equal(await page.locator('.br-player').count(), 5, '模拟广告重选后仍应显示五人');
    const adBatchCards = await page.evaluate(() => STATE._drawPlayers.map(player => player._poolUid));
    assert.equal(new Set(adBatchCards).size, 5, '广告重选同一轮五张版本卡不能重复');
    const localHeadshots = await page.$$eval('.br-player .bp-headshot', elements => elements.map(element => ({ computed: getComputedStyle(element).backgroundImage, inline: element.getAttribute('style'), player: element.closest('.br-player').textContent.trim() })));
    assert.ok(localHeadshots.every(value => value.computed.includes('/assets/')), '候选球员应全部使用本地真人头像：' + JSON.stringify(localHeadshots));
    await page.screenshot({ path: path.join(outputDir, '02-five-player-build.png'), fullPage: false });

    const historicalList = await page.evaluate(() => {
      const historical = PERFECT_PLAYER_HISTORICAL_SURPRISE_DATA.LAL;
      renderRosterPlayers('LAL', historical, PERFECT_PLAYER_BUILD_DATA.LAL);
      return historical.map(player => ({ name: player.name, label: player._sourceLabel, photo: player._photoLocal, peak: player._historicalPeak, peakRating: player._peakRating }));
    });
    assert.equal(historicalList.length, 5, '每队历史惊喜池应有五名球员');
    assert.ok(historicalList.every(player => player.label && player.photo), '历史球员应有赛季与本地头像');
    assert.ok(historicalList.every(player => player.peak && player.peakRating > 0), '历史候选必须显式使用巅峰标记');
    assert.equal(await page.locator('.bp-detail').evaluateAll(nodes => nodes.filter(node => /名人堂惊喜|近代全明星惊喜/.test(node.textContent)).length), 5, '历史候选应显式标注惊喜层级');
    assert.equal(await page.locator('.bp-detail').evaluateAll(nodes => nodes.filter(node => /巅峰/.test(node.textContent)).length), 5, '历史候选界面应显式标注巅峰状态');

    const hallOfFameEffect = await page.evaluate(() => {
      const cards = PERFECT_PLAYER_HISTORICAL_SURPRISE_DATA.BOS;
      STATE.currentTeam = 'BOS';
      STATE._drawPlayers = cards;
      STATE.selectedPlayer = null;
      renderRosterPlayers('BOS', cards, PERFECT_PLAYER_BUILD_DATA.BOS);
      const first = document.querySelector('.hall-of-fame-card');
      return {
        cards:document.querySelectorAll('.hall-of-fame-card').length,
        badges:document.querySelectorAll('.hall-of-fame-badge').length,
        arrival:document.querySelectorAll('.hall-of-fame-arrival').length,
        animation:first ? getComputedStyle(first).animationName : ''
      };
    });
    assert.deepEqual({ cards:hallOfFameEffect.cards, badges:hallOfFameEffect.badges, arrival:hallOfFameEffect.arrival }, { cards:5, badges:5, arrival:1 }, '凯尔特人五张名人堂卡应全部显示降临特效与 HOF 徽章');
    assert.ok(hallOfFameEffect.animation.includes('hofCardReveal') && hallOfFameEffect.animation.includes('hofCardAura'), '名人堂卡应包含入场与持续光晕动画');
    await page.waitForTimeout(520);
    await page.locator('.hall-of-fame-card').first().click();
    assert.ok(await page.locator('.hall-of-fame-card').first().evaluate(node => node.classList.contains('selected')), '名人堂特效卡必须仍可点击选中');
    const hallTextState = JSON.parse(await page.evaluate(() => render_game_to_text()));
    assert.equal(hallTextState.build.hallOfFameCandidates, 5, '文本状态应暴露当前名人堂候选数');
    assert.equal(hallTextState.build.historicalCandidates, 5, '名人堂卡也应计入全部历史特效卡');
    assert.equal(hallTextState.build.peakAllStarCandidates, 0, '名人堂预览不应混入普通巅峰卡');
    await page.screenshot({ path: path.join(outputDir, '02c-hall-of-fame-effect.png'), fullPage: false });
    const peakAllStarEffect = await page.evaluate(() => {
      const cards = PERFECT_PLAYER_HISTORICAL_SURPRISE_DATA.MEM;
      STATE.currentTeam = 'MEM';
      STATE._drawPlayers = cards;
      STATE.selectedPlayer = null;
      renderRosterPlayers('MEM', cards, PERFECT_PLAYER_BUILD_DATA.MEM);
      const first = document.querySelector('.peak-all-star-card');
      return {
        historical:document.querySelectorAll('.historical-effect-card').length,
        hall:document.querySelectorAll('.hall-of-fame-card').length,
        cards:document.querySelectorAll('.peak-all-star-card').length,
        badges:document.querySelectorAll('.peak-all-star-badge').length,
        animation:first ? getComputedStyle(first).animationName : ''
      };
    });
    assert.deepEqual({ historical:peakAllStarEffect.historical, hall:peakAllStarEffect.hall, cards:peakAllStarEffect.cards, badges:peakAllStarEffect.badges }, { historical:5, hall:0, cards:5, badges:5 }, '非名人堂巅峰卡应全部使用较弱 PEAK 特效且不能误用 HOF');
    assert.ok(peakAllStarEffect.animation.includes('peakCardReveal') && !peakAllStarEffect.animation.includes('hofCardAura'), '普通巅峰卡只能使用较弱入场动画，不能使用名人堂持续光晕');
    await page.waitForTimeout(420);
    await page.locator('.peak-all-star-card').first().click();
    assert.ok(await page.locator('.peak-all-star-card').first().evaluate(node => node.classList.contains('selected')), '普通巅峰特效卡必须仍可点击选中');
    const peakTextState = JSON.parse(await page.evaluate(() => render_game_to_text()));
    assert.deepEqual({ historical:peakTextState.build.historicalCandidates, hall:peakTextState.build.hallOfFameCandidates, peak:peakTextState.build.peakAllStarCandidates }, { historical:5, hall:0, peak:5 }, '文本状态应区分两档历史卡特效');
    await page.screenshot({ path: path.join(outputDir, '02d-peak-all-star-effect.png'), fullPage: false });

    const surpriseRolls = await page.evaluate(() => {
      const originalRandom = Math.random;
      Math.random = () => 0.05;
      const surprise = drawBuildPlayers(PERFECT_PLAYER_BUILD_DATA.LAL, 5, 'LAL');
      Math.random = () => 0.12;
      const raisedChance = drawBuildPlayers(PERFECT_PLAYER_BUILD_DATA.LAL, 5, 'LAL');
      Math.random = () => 0.99;
      const normal = drawBuildPlayers(PERFECT_PLAYER_BUILD_DATA.LAL, 5, 'LAL');
      Math.random = originalRandom;
      return {
        surprise: surprise.map(player => player._sourceKind),
        raisedChance: raisedChance.map(player => player._sourceKind),
        normal: normal.map(player => player._sourceKind),
        surpriseUnique: new Set(surprise.map(player => player._poolUid)).size,
        normalUnique: new Set(normal.map(player => player._poolUid)).size
      };
    });
    assert.equal(surpriseRolls.surprise.filter(kind => kind === 'historical').length, 1, '低概率命中时最多只插入一张历史惊喜卡');
    assert.equal(surpriseRolls.raisedChance.filter(kind => kind === 'historical').length, 1, '12% 随机值应在提高后的 20% 概率内命中历史卡');
    assert.equal(surpriseRolls.normal.filter(kind => kind === 'historical').length, 0, '未命中时不应固定出现历史球员');
    assert.equal(surpriseRolls.surpriseUnique, 5, '历史惊喜轮次仍需五张独立版本卡');

    const dualVersionDraw = await page.evaluate(() => {
      const originalRandom = Math.random;
      const originalShuffle = window.shuffleArr;
      const originalHistorical = PERFECT_PLAYER_HISTORICAL_SURPRISE_DATA.LAL;
      const current = PERFECT_PLAYER_BUILD_DATA.LAL.find(player => player.name === 'LeBron James');
      const peak = originalHistorical.find(player => player.name === 'LeBron James');
      window.shuffleArr = items => items.slice();
      PERFECT_PLAYER_HISTORICAL_SURPRISE_DATA.LAL = [peak].concat(originalHistorical.filter(player => player !== peak));
      Math.random = () => 0.05;
      const rest = PERFECT_PLAYER_BUILD_DATA.LAL.filter(player => player !== current).slice(0, 4);
      const cards = drawBuildPlayers([current].concat(rest), 5, 'LAL');
      renderRosterPlayers('LAL', cards, PERFECT_PLAYER_BUILD_DATA.LAL);
      Math.random = originalRandom;
      window.shuffleArr = originalShuffle;
      PERFECT_PLAYER_HISTORICAL_SURPRISE_DATA.LAL = originalHistorical;
      return cards.filter(player => player.name === 'LeBron James').map(player => ({ kind:player._sourceKind, uid:player._poolUid }));
    });
    assert.deepEqual(dualVersionDraw.map(card => card.kind).sort(), ['current', 'historical'], '同一轮应允许现役版与巅峰版同时出现');
    assert.equal(new Set(dualVersionDraw.map(card => card.uid)).size, 2, '同名球员两个版本必须保持独立卡 ID');
    await page.screenshot({ path: path.join(outputDir, '02b-current-and-peak-versions.png'), fullPage: false });

    for (let index = 0; index < 13; index++) {
      await page.evaluate(() => {
        STATE.currentTeam = 'LAL';
        STATE._mustLockAfterSpin = true;
        showTeamRoster('LAL');
      });
      await page.locator('.br-player').first().click();
      await page.locator('.ba-slot.clickable').first().click();
      if (index < 12) await page.waitForTimeout(760);
    }
    await page.waitForSelector('#screen-reveal.active', { timeout: 5000 });
    assert.equal((await page.textContent('.big-cname')).trim(), '林一飞', '创建姓名应进入虎扑原揭幕页');
    assert.ok((await page.getAttribute('.reveal-player-avatar', 'src')).includes('avatar-10'), '创建头像应进入虎扑原揭幕页');

    const states = await page.evaluate(() => {
      STATE.careerTeam = 'LAL';
      STATE.career.nextSeasonMods.mediaPressure = 4;
      STATE.career.nextSeasonMods.staminaLoad = 3;
      STATE.career.nextSeasonMods.moraleBonus = -2;
      STATE.career.profile.mediaTrust = 2;
      STATE.career.profile.coachTrust = 3;
      STATE.career.profile.fame = 4;
      STATE.career.profile.businessValue = 2;
      STATE.career.profile.controversy = 1;
      STATE.career.profile.chinaPopularity = 3;
      STATE.career.profile.loyalty = 2;
      STATE.career.profile.leadership = 1;
      STATE.career.profile.lockerRoomTrust = 2;
      STATE.career.profile.fanSupport = 4;
      STATE.career.profile.legacyBonus = 1;
      STATE.career.nextSeasonMods.formVariance = 1;
      STATE.career.nextSeasonMods.injuryRiskBonus = 2;
      STATE.career.nextSeasonMods.teamChemistry = 2;
      renderSeasonScreenDOM();
      showScreen('screen-season');
      return {
        text: document.getElementById('player-state-strip').textContent.replace(/\s+/g, ' ').trim(),
        keys: [...document.querySelectorAll('#player-state-strip [data-status-key]')].map(element => element.dataset.statusKey)
      };
    });
    assert.equal(states.keys.length, 22, '状态栏应展示 4 项摘要和 18 项详细状态');
    ['压力','体能负荷','士气','状态波动','伤病风险','球队默契','媒体压力','人气','商业价值','媒体信任','争议','中国人气','忠诚','领导力','教练信任','更衣室信任','球迷支持','传奇声望'].forEach(label => {
      assert.ok(states.text.includes(label), '状态面板缺少：' + label);
    });
    const liveStateText = await page.evaluate(() => {
      addProfileDelta('mediaTrust', 3);
      addSeasonMod('mediaPressure', -2, -10, 10);
      return document.getElementById('player-state-strip').textContent.replace(/\s+/g, ' ').trim();
    });
    assert.ok(liveStateText.includes('+5') && liveStateText.includes('+2'), '状态条应在事件数值变化后立即刷新：' + liveStateText);

    const careerBalance = await page.evaluate(() => {
      const savedAttrs = JSON.parse(JSON.stringify(STATE.attrs));
      const savedPending = STATE._tpPending;
      const savedAge = STATE.career.currentAge;
      const savedFlags = JSON.parse(JSON.stringify(STATE.career.flags || {}));
      const savedOvr = STATE.finalOVR;
      const high = Object.fromEntries(ATTR_KEYS.map(key => [key, 95]));
      const low = Object.fromEntries(ATTR_KEYS.map(key => [key, 60]));
      STATE.career.flags = {};
      STATE.attrs = Object.assign({}, high);
      STATE.attrs.threePT = 96;
      STATE._tpPending = { threePT:2 };
      const pendingCost = getPendingTrainingCost();
      STATE._tpPending = {};
      const maxAddAt95 = getMaxAdd(0, 6, 95);
      const age35High = rollAnnualAttributeDelta(35, 'ATH', 96, 0, () => 0);
      const age35Low = rollAnnualAttributeDelta(35, 'ATH', 70, 0, () => 0);
      const age38Maintained = rollAnnualAttributeDelta(38, 'ATH', 90, 2, () => 0);
      const highRisk36 = getPlayerRetirementRisk(36, high, 95, {});
      const lowRisk36 = getPlayerRetirementRisk(36, low, 65, {});
      const highRisk40 = getPlayerRetirementRisk(40, high, 95, {});
      STATE.career.currentAge = 42;
      STATE.attrs = Object.assign({}, high);
      STATE.finalOVR = 95;
      const canReach42 = !shouldOfferPlayerRetirement(() => 0.999);
      STATE.career.currentAge = 43;
      const forcedAfter42 = shouldOfferPlayerRetirement(() => 0.999);
      const result = {
        report: PERFECT_PLAYER_CAREER_BALANCE,
        pointCosts: [84, 85, 90, 95, 98].map(getPointCost),
        pendingCost,
        maxAddAt95,
        legacyTreeCost: PP_FX.getLegacyTreeCost(),
        legacyMaxLP: PP_FX.maxLegacyLP(),
        legacyScorerCosts: [0, 1, 2, 3, 4].map(level => PP_FX.getPerkLevelCost('scorer', level)),
        age35High,
        age35Low,
        age38Maintained,
        highRisk36,
        lowRisk36,
        highRisk40,
        canReach42,
        forcedAfter42,
        contractAt41: clampCareerContractYears(3, 41),
        contractAt42: clampCareerContractYears(3, 42),
        leagueHigh36: getLeagueRetirementChance(Object.assign({ ovr:95 }, high), 36),
        leagueLow36: getLeagueRetirementChance(Object.assign({ ovr:65 }, low), 36),
        leagueAt42: getLeagueRetirementChance(Object.assign({ ovr:95 }, high), 42),
        lebronRule: Object.assign({}, LEBRON_JAMES_SPECIAL_RULE)
      };
      STATE.attrs = savedAttrs;
      STATE._tpPending = savedPending;
      STATE.career.currentAge = savedAge;
      STATE.career.flags = savedFlags;
      STATE.finalOVR = savedOvr;
      return result;
    });
    assert.deepEqual(careerBalance.pointCosts, [1, 2, 3, 5, 7], '高属性训练成本应逐级上升');
    assert.equal(careerBalance.pendingCost, 10, '96 属性连续加 2 点必须真实消耗 10 点，而不是 2 点');
    assert.equal(careerBalance.maxAddAt95, 1, '6 点预算在 95 属性档只能提升 1 点');
    assert.equal(careerBalance.legacyTreeCost, 184, '传承全树总成本应高于全部成就 LP，强制做专精取舍');
    assert.equal(careerBalance.legacyMaxLP, 117, '全部成就可获得的传承点上限应保持 117');
    assert.deepEqual(careerBalance.legacyScorerCosts, [3, 4, 5, 7, 9], '传承路线必须逐级涨价');
    assert.ok(careerBalance.age35High < careerBalance.age35Low, '同年龄下高位属性应承受更大回落：' + JSON.stringify(careerBalance));
    assert.ok(careerBalance.age38Maintained < 0, '最高保养也不能把 38 岁身体衰退完全清零');
    assert.ok(careerBalance.lowRisk36 > careerBalance.highRisk36, '同年龄退役风险必须受当前能力影响');
    assert.ok(careerBalance.highRisk40 > careerBalance.highRisk36, '同能力退役风险必须随年龄上升');
    assert.equal(careerBalance.canReach42, true, '顶级球员应允许进入 42 岁赛季');
    assert.equal(careerBalance.forcedAfter42, true, '完成 42 岁赛季后必须退役');
    assert.deepEqual([careerBalance.contractAt41, careerBalance.contractAt42], [2, 1], '合同年限不得跨过 42 岁赛季');
    assert.ok(careerBalance.leagueLow36 > careerBalance.leagueHigh36, '联盟球员退役也必须使用年龄×能力双判定');
    assert.equal(careerBalance.leagueAt42, 100, '联盟球员打完 42 岁赛季后必须退役');
    assert.deepEqual(careerBalance.lebronRule, { initialAge:41, maxRetirementAge:42 }, 'LeBron 参考规则应允许打到 42 岁，但不能无限保护');

    const simulation = await page.evaluate(() => {
      const previousTeam = STATE.careerTeam;
      STATE.careerTeam = null;
      clearLineupCache();
      const ranked = NBA2K_TEAMS.map(team => {
        const power = calcTeamPowerWithPlayer(team);
        return { team, value: power.offense * 0.45 + power.defense * 0.45 + power.depth * 0.10 };
      }).sort((a, b) => b.value - a.value);
      const strongVsWeak = samplePerfectPlayerSimulation(ranked[0].team, ranked[ranked.length - 1].team, 800);
      const even = samplePerfectPlayerSimulation(ranked[5].team, ranked[5].team, 800);
      STATE.careerTeam = previousTeam;
      clearLineupCache();
      return { report: PERFECT_PLAYER_SIM_REPORT, ranked: [ranked[0], ranked[ranked.length - 1]], strongVsWeak, even };
    });
    assert.equal(simulation.report.engine, '2025-26-possession-and-role');
    assert.equal(simulation.report.attributeDrivenStats, true);
    assert.deepEqual(simulation.report.leagueBaseline, { pointsPerGame:115.6, pace:99.4, offensiveRating:115.7 });
    assert.ok(simulation.strongVsWeak.winRate > 0.58 && simulation.strongVsWeak.winRate < 0.96, '强弱队胜率应合理拉开：' + JSON.stringify(simulation));
    assert.ok(simulation.even.winRate > 0.43 && simulation.even.winRate < 0.57, '同强度对局应接近五五开：' + JSON.stringify(simulation.even));
    assert.ok(simulation.strongVsWeak.avgA > 90 && simulation.strongVsWeak.avgA < 135 && simulation.strongVsWeak.avgB > 85 && simulation.strongVsWeak.avgB < 130, '比分均值应处于现代 NBA 区间：' + JSON.stringify(simulation.strongVsWeak));
    assert.ok(simulation.strongVsWeak.minScore >= 78 && simulation.strongVsWeak.maxScore <= 180, '比分边界异常：' + JSON.stringify(simulation.strongVsWeak));

    const draftProjectionProbe = await page.evaluate(() => {
      STATE.finalOVR = 84;
      STATE._draftPending = { prep: 'workouts', draftStockBonus: 0, randomEventIds: [] };
      const before = getPerfectPlayerDraftProjection();
      changePerfectPlayerDraftStock(2);
      const after = getPerfectPlayerDraftProjection();
      const originalRandom = Math.random;
      Math.random = () => 0.5;
      const result = computeDraftBand();
      Math.random = originalRandom;
      showDraftChoiceModal('draft_projection_probe', '选秀前夜', '球队正在更新最后一版模拟选秀。', [
        { label: '继续', hint: '查看预测顺位', apply: () => '' }
      ], () => {});
      return {
        before,
        after,
        result: { pick: result.pick, round: result.round, type: result.type, projectedRank: result.projectedRank }
      };
    });
    await page.waitForSelector('#draft-modal [data-draft-projection]');
    const draftProjectionText = (await page.locator('#draft-modal [data-draft-projection]').textContent()).replace(/\s+/g, ' ').trim();
    assert.ok(draftProjectionText.includes('当前预测') && draftProjectionText.includes('预测区间') && draftProjectionText.includes('选秀行情'), '选秀弹窗必须持续显示预测排名：' + draftProjectionText);
    assert.ok(draftProjectionProbe.after.rank < draftProjectionProbe.before.rank, '行情上升应让预测顺位前移：' + JSON.stringify(draftProjectionProbe));
    assert.equal(draftProjectionProbe.result.pick, draftProjectionProbe.after.rank, '最终抽签中位结果应与可见预测顺位一致');
    assert.equal(draftProjectionProbe.result.projectedRank, draftProjectionProbe.after.rank, '选秀结果应保存预测排名');
    const draftModalBounds = await page.$eval('#draft-modal .team-picker-modal', element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
    });
    assert.ok(draftModalBounds.top >= -1 && draftModalBounds.bottom <= draftModalBounds.viewport + 1, '选秀排名和选择仍应在手机单屏弹窗内');
    await page.screenshot({ path: path.join(outputDir, '03-draft-ranking.png'), fullPage: false });
    await page.evaluate(() => {
      const modal = document.getElementById('draft-modal');
      if (modal) modal.remove();
      STATE._draftModalStep = null;
    });

    await page.evaluate(() => {
      STATE._draftPending = { draftStockBonus: 0, randomEventIds: [] };
      window.__draftRandomDone = 0;
      const originalRandom = Math.random;
      Math.random = () => 0;
      runPerfectPlayerDraftRandomEvent('pre', () => { window.__draftRandomDone++; });
      Math.random = originalRandom;
    });
    await page.waitForSelector('#draft-modal');
    await page.locator('#draft-modal button').first().click();
    await page.waitForSelector('#draft-result-modal');
    const firstDraftEventChanges = (await page.locator('#draft-result-modal [data-event-attribute-summary]').textContent()).replace(/\s+/g, ' ').trim();
    assert.ok(firstDraftEventChanges.includes('本次实际数值变化'), '事件结算必须显示实际属性变化：' + firstDraftEventChanges);
    assert.ok(firstDraftEventChanges.includes('媒体信任 +1'), '医疗复查事件应显示真实生效的媒体信任变化：' + firstDraftEventChanges);
    assert.ok(firstDraftEventChanges.includes('选秀行情'), '选秀事件应显示真实生效的选秀行情变化：' + firstDraftEventChanges);
    const resultModalBounds = await page.$eval('#draft-result-modal .team-picker-modal', element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
    });
    assert.ok(resultModalBounds.top >= -1 && resultModalBounds.bottom <= resultModalBounds.viewport + 1, '带属性变化的事件结算仍应保持在手机屏幕内');
    await page.screenshot({ path: path.join(outputDir, '04-event-attribute-changes.png'), fullPage: false });
    await page.click('#draft-result-modal button');
    await page.waitForFunction(() => window.__draftRandomDone === 1);
    await page.evaluate(() => {
      const originalRandom = Math.random;
      Math.random = () => 0;
      runPerfectPlayerDraftRandomEvent('post', () => { window.__draftRandomDone++; });
      Math.random = originalRandom;
    });
    await page.waitForSelector('#draft-modal');
    await page.locator('#draft-modal button').first().click();
    await page.waitForSelector('#draft-result-modal');
    await page.click('#draft-result-modal button');
    await page.waitForFunction(() => window.__draftRandomDone === 2);
    const draftRunIds = await page.evaluate(() => STATE._draftPending.randomEventIds.slice());
    assert.equal(draftRunIds.length, 2, '每次选秀流程应插入两段随机事件');
    assert.notEqual(draftRunIds[0], draftRunIds[1], '同一局随机事件不应重复');
    const achievementProbe = await page.evaluate(() => {
      PP_FX.resetAchievements();
      STATE.career.draft = { type: 'lottery', round: 1, pick: 1 };
      STATE.season.awards = [
        { act: 'allStar', label: '全明星', winner: getHupuDisplayName(), isUser: true },
        { act: 'roty', label: '年度最佳新秀', winner: getHupuDisplayName(), isUser: true }
      ];
      const facts = PP_FX.syncAchievements();
      const got = PP_FX.getUnlocked();
      return { facts, firstPick: !!got.first_pick, lottery: !!got.lottery_pick, allStar: !!got.all_star, roty: !!got.roty };
    });
    assert.ok(achievementProbe.firstPick && achievementProbe.lottery && achievementProbe.allStar && achievementProbe.roty, '选秀/全明星/最佳新秀成就应能完成：' + JSON.stringify(achievementProbe));
    const achievementRuleAudit = await page.evaluate(() => {
      const saved = {
        career: STATE.career,
        season: STATE.season,
        finalOVR: STATE.finalOVR,
        finalPosition: STATE.finalPosition,
        position: STATE.position,
        careerTeam: STATE.careerTeam,
        gameId: STATE.gameId,
        careerSaved: STATE._careerSaved,
        hadCareerSaved: Object.prototype.hasOwnProperty.call(STATE, '_careerSaved'),
        suppress: PP_FX._suppressAchievementPopups
      };
      const results = {};
      const user = getHupuDisplayName();
      let careerSeq = 0;
      function resetState() {
        PP_FX.resetAchievements();
        PP_FX._suppressAchievementPopups = true;
        STATE.gameId = Date.now().toString(36) + '-achievement-audit-' + (++careerSeq);
        STATE.finalOVR = 0;
        STATE.finalPosition = null;
        STATE.position = 'PG';
        STATE.careerTeam = 'LAL';
        STATE._careerSaved = false;
        STATE.career = { seasonCount:0, seasons:[], honors:[], draft:null, retired:false };
        STATE.season = {
          games:[], wins:0, losses:0, awards:[], playerStats:{},
          isPlayoffs:false, playoffBracket:null, playoffResult:null
        };
      }
      function award(act, label, seasonNum) {
        return { act, label, seasonNum:seasonNum || 1, winner:user, isUser:true };
      }
      function run(id, setup) {
        resetState();
        setup();
        PP_FX.syncAchievements();
        results[id] = !!PP_FX.getUnlocked()[id];
      }
      try {
        run('create_player', () => { STATE.finalOVR = 70; });
        run('ovr_80', () => { STATE.finalOVR = 80; });
        run('ovr_90', () => { STATE.finalOVR = 90; });
        run('ovr_95', () => { STATE.finalOVR = 95; });
        run('lottery_pick', () => { STATE.career.draft = { type:'lottery', round:'1', pick:'14' }; });
        run('first_pick', () => { STATE.career.draft = { type:'lottery', round:'1', pick:'1' }; });
        run('undrafted', () => { STATE.career.draft = { type:'undrafted' }; });
        run('all_star', () => { STATE.season.awards = [award('allStar', '全明星')]; });
        run('all_nba', () => { STATE.season.awards = [award('allNBA', '最佳阵容')]; });
        run('roty', () => { STATE.season.awards = [award('roty', '年度最佳新秀')]; });
        run('dpoy', () => { STATE.season.awards = [award('dpoy', 'DPOY')]; });
        run('sixth_man', () => { STATE.season.awards = [award('sixthman', '最佳第六人')]; });
        run('mvp', () => { STATE.season.awards = [award('mvp', 'MVP')]; });
        run('fmvp', () => { STATE.season.awards = [award('fmvp', '总决赛MVP')]; });
        run('mvp_x3', () => { STATE.career.honors = [1,2,3].map(n => award('mvp', 'MVP', n)); });
        run('playoffs', () => { STATE.career.seasonCount = 1; STATE.career.seasons = [{ seasonNum:1, playoffResult:'首轮', awards:[] }]; });
        run('win_60', () => { STATE.career.seasonCount = 1; STATE.career.seasons = [{ seasonNum:1, wins:60, playoffResult:'未晋级', awards:[] }]; });
        run('champion', () => { STATE.season.awards = [award('champion', '总冠军')]; });
        run('champion_x3', () => { STATE.career.honors = [1,2,3].map(n => award('champion', '总冠军', n)); });
        run('game_40', () => { STATE.season.games = [{ stats:{ pts:40, reb:2, ast:2 } }]; });
        run('game_50', () => { STATE.season.games = [{ stats:{ pts:50, reb:2, ast:2 } }]; });
        results.game_50_also_40 = !!PP_FX.getUnlocked().game_40;
        run('triple_double', () => { STATE.season.games = [{ stats:{ pts:20, reb:10, ast:10 } }]; });
        run('avg_30', () => { STATE.career.seasonCount = 1; STATE.career.seasons = [{ seasonNum:1, playerStats:{ games:40, pts:1200, reb:200 }, awards:[] }]; });
        run('season_25_10', () => { STATE.career.seasonCount = 1; STATE.career.seasons = [{ seasonNum:1, playerStats:{ games:40, pts:1000, reb:400 }, awards:[] }]; });
        run('season_5', () => { STATE.career.seasonCount = 5; });
        run('season_10', () => { STATE.career.seasonCount = 10; });
        run('retire', () => { STATE.career.retired = true; });

        resetState();
        PP_FX.ACHIEVEMENTS.filter(item => item.id !== 'explorer' && item.id !== 'collector').slice(0, 19)
          .forEach(item => PP_FX.unlock(item.id));
        PP_FX.syncMetaAchievements();
        results.explorer = !!PP_FX.getUnlocked().explorer;
        results.collector = !!PP_FX.getUnlocked().collector;

        resetState();
        STATE.gameId = Date.now().toString(36) + '-cursor-career-one';
        STATE.season.games = [{ stats:{ pts:20 } }];
        PP_FX.checkLatestGameMilestones();
        PP_FX.resetAchievements();
        STATE.gameId = (Date.now() + 1).toString(36) + '-cursor-career-two';
        STATE.season.games = [{ stats:{ pts:40 } }];
        PP_FX.checkLatestGameMilestones();
        const firstGameOfNewCareerChecked = !!PP_FX.getUnlocked().game_40;

        return {
          results,
          firstGameOfNewCareerChecked,
          definitions: PP_FX.ACHIEVEMENTS.map(item => item.id).sort(),
          tested: Object.keys(results).filter(id => id !== 'game_50_also_40').sort()
        };
      } finally {
        STATE.career = saved.career;
        STATE.season = saved.season;
        STATE.finalOVR = saved.finalOVR;
        STATE.finalPosition = saved.finalPosition;
        STATE.position = saved.position;
        STATE.careerTeam = saved.careerTeam;
        STATE.gameId = saved.gameId;
        if (saved.hadCareerSaved) STATE._careerSaved = saved.careerSaved;
        else delete STATE._careerSaved;
        PP_FX._suppressAchievementPopups = saved.suppress;
      }
    });
    assert.ok(Object.values(achievementRuleAudit.results).every(Boolean), '全部成就正例必须可达成：' + JSON.stringify(achievementRuleAudit.results));
    assert.ok(achievementRuleAudit.firstGameOfNewCareerChecked, '新生涯第一场必须使用独立检查游标');
    assert.deepEqual(achievementRuleAudit.tested, achievementRuleAudit.definitions, '29 项成就必须全部有判定正例覆盖');

    const achievementFalsePositiveAudit = await page.evaluate(() => {
      const saved = {
        career: STATE.career, season:STATE.season, finalOVR:STATE.finalOVR,
        gameId:STATE.gameId, careerSaved:STATE._careerSaved,
        hadCareerSaved:Object.prototype.hasOwnProperty.call(STATE, '_careerSaved'),
        suppress:PP_FX._suppressAchievementPopups
      };
      const user = getHupuDisplayName();
      function base(startedAt) {
        PP_FX.resetAchievements();
        PP_FX._suppressAchievementPopups = true;
        STATE.gameId = (startedAt || Date.now()).toString(36) + '-false-positive-audit';
        STATE.finalOVR = 79;
        STATE._careerSaved = false;
        STATE.career = { seasonCount:4, seasons:[], honors:[], draft:{ type:'lottery', round:1, pick:15 }, retired:false };
        STATE.season = {
          games:[{ stats:{ pts:39, reb:9, ast:9 } }], wins:59, awards:[],
          playerStats:{ games:40, pts:1199, reb:399 }, isPlayoffs:false,
          playoffBracket:null, playoffResult:null
        };
      }
      try {
        base();
        STATE.season.awards = [
          { act:'roty', label:'年度最佳新秀', winner:'其他新秀', isUser:false },
          { act:'allRookie', label:'最佳新秀阵容', winner:user, isUser:true },
          { act:'mvp', label:'MVP', winner:'其他球员', isUser:false },
          { act:'dpoy', label:'DPOY', winner:'其他球员', isUser:false },
          'MVP 候选', '最佳新秀候选', '全明星级别', '最佳防守阵容', '总冠军候选'
        ];
        const negativeFacts = PP_FX.syncAchievements();
        const negativeUnlocked = Object.keys(PP_FX.getUnlocked());

        const startedAt = Date.now() - 5000;
        base(startedAt);
        PP_FX.getUnlocked().roty = { at:startedAt + 1000 };
        STATE.season.awards = [
          { act:'roty', label:'年度最佳新秀', winner:'其他新秀', isUser:false },
          { act:'allRookie', label:'最佳新秀阵容', winner:user, isUser:true }
        ];
        PP_FX.syncAchievements();
        const currentCareerFalseRotyRemoved = !PP_FX.getUnlocked().roty;

        base(startedAt);
        PP_FX.getUnlocked().roty = { at:startedAt - 1000 };
        STATE.season.awards = [{ act:'allRookie', label:'最佳新秀阵容', winner:user, isUser:true }];
        PP_FX.syncAchievements();
        const previousCareerRotyPreserved = !!PP_FX.getUnlocked().roty;

        base(startedAt);
        STATE.season.awards = [{ act:'roty', label:'年度最佳新秀', winner:user, isUser:true }];
        PP_FX.syncAchievements();
        const validEvidence = PP_FX.getUnlocked().roty && PP_FX.getUnlocked().roty.factEvidence;
        STATE.gameId = Date.now().toString(36) + '-next-career';
        STATE.season.awards = [{ act:'allRookie', label:'最佳新秀阵容', winner:user, isUser:true }];
        PP_FX.syncAchievements();
        const provenRotySurvivesNewCareer = !!PP_FX.getUnlocked().roty;

        return {
          negativeFacts:{ roty:negativeFacts.roty, allRookie:negativeFacts.allRookie, mvp:negativeFacts.mvp, dpoy:negativeFacts.dpoy },
          negativeUnlocked,
          currentCareerFalseRotyRemoved,
          previousCareerRotyPreserved,
          validEvidence:!!validEvidence,
          provenRotySurvivesNewCareer
        };
      } finally {
        STATE.career = saved.career;
        STATE.season = saved.season;
        STATE.finalOVR = saved.finalOVR;
        STATE.gameId = saved.gameId;
        if (saved.hadCareerSaved) STATE._careerSaved = saved.careerSaved;
        else delete STATE._careerSaved;
        PP_FX._suppressAchievementPopups = saved.suppress;
      }
    });
    assert.deepEqual(achievementFalsePositiveAudit.negativeFacts, { roty:false, allRookie:true, mvp:0, dpoy:false }, '最佳新秀阵容/候选文字不得冒充正式奖项');
    const forbiddenFalseUnlocks = ['ovr_80','lottery_pick','first_pick','all_star','all_nba','roty','dpoy','sixth_man','mvp','champion','win_60','game_40','game_50','triple_double','avg_30','season_25_10','season_5','retire'];
    assert.deepEqual(forbiddenFalseUnlocks.filter(id => achievementFalsePositiveAudit.negativeUnlocked.includes(id)), [], '未达到阈值或仅为候选时不得解锁：' + JSON.stringify(achievementFalsePositiveAudit));
    assert.ok(achievementFalsePositiveAudit.currentCareerFalseRotyRemoved, '当前生涯由最佳新秀阵容造成的旧误解锁必须自动撤回');
    assert.ok(achievementFalsePositiveAudit.previousCareerRotyPreserved && achievementFalsePositiveAudit.validEvidence && achievementFalsePositiveAudit.provenRotySurvivesNewCareer, '合法跨生涯成就必须保留凭证');
    const mvpSplitProbe = await page.evaluate(() => {
      const user = getHupuDisplayName();
      STATE.career.honors = [];
      STATE.career.seasons = [];
      PP_FX.resetAchievements();
      // 模拟旧版本已经被 FMVP 误解锁的本地状态，确认同步时会修复。
      PP_FX.getUnlocked().mvp = { at: Date.now() };
      PP_FX.getUnlocked().mvp_x3 = { at: 1 };
      STATE.season.awards = [
        { act: 'fmvp', label: '👑 总决赛MVP', winner: user, isUser: true }
      ];
      const fmvpFacts = PP_FX.syncAchievements();
      const afterFmvp = PP_FX.getUnlocked();
      PP_FX.resetAchievements();
      STATE.season.awards = [
        { act: 'mvp', label: 'MVP', winner: user, isUser: true }
      ];
      const mvpFacts = PP_FX.syncAchievements();
      const afterMvp = PP_FX.getUnlocked();
      return {
        fmvpFacts: { mvp: fmvpFacts.mvp, fmvp: fmvpFacts.fmvp },
        fmvpUnlocked: { mvp: !!afterFmvp.mvp, fmvp: !!afterFmvp.fmvp },
        mvpFacts: { mvp: mvpFacts.mvp, fmvp: mvpFacts.fmvp },
        mvpUnlocked: { mvp: !!afterMvp.mvp, fmvp: !!afterMvp.fmvp },
        hasSeparateAchievement: PP_FX.ACHIEVEMENTS.some(item => item.id === 'fmvp')
      };
    });
    assert.deepEqual(mvpSplitProbe, {
      fmvpFacts: { mvp: 0, fmvp: 1 },
      fmvpUnlocked: { mvp: false, fmvp: true },
      mvpFacts: { mvp: 1, fmvp: 0 },
      mvpUnlocked: { mvp: true, fmvp: false },
      hasSeparateAchievement: true
    }, 'FMVP 与常规赛 MVP 成就必须完全分开：' + JSON.stringify(mvpSplitProbe));
    const singleCareerAchievementProbe = await page.evaluate(() => {
      const user = getHupuDisplayName();
      function honors(act, label, count) {
        return Array.from({ length: count }, (_, i) => ({ act, label, seasonNum: i + 1, winner: user, isUser: true }));
      }

      // 旧版可能把多个生涯的次数写进隐藏计数并提前解锁；当前生涯只有 1 冠时必须撤回。
      PP_FX.resetAchievements();
      STATE.gameId = 'career-migration';
      STATE.season.awards = [];
      STATE.career.seasons = [];
      STATE.career.honors = honors('champion', '总冠军', 1);
      PP_FX.getUnlocked().champion_x3 = { at: 1 };
      PP_FX.getUnlocked().__counters = { champion: 3 };
      PP_FX.syncAchievements();
      const legacyFalseUnlockRemoved = !PP_FX.getUnlocked().champion_x3 && !PP_FX.getUnlocked().__counters;

      // 分开的两次生涯各有冠军，永久的“总冠军”可以保留，但不能拼成“三冠”。
      PP_FX.resetAchievements();
      STATE.gameId = 'career-one';
      STATE.career.honors = honors('champion', '总冠军', 2);
      PP_FX.syncAchievements();
      STATE.gameId = 'career-two';
      STATE.career.honors = honors('champion', '总冠军', 1);
      PP_FX.syncAchievements();
      const splitCareersDoNotStack = !!PP_FX.getUnlocked().champion && !PP_FX.getUnlocked().champion_x3;

      // 赛季刚归档后，当前 awards 仍会暂时保留同一座冠军；不能把它当成下一年的第三冠。
      PP_FX.resetAchievements();
      STATE.gameId = 'career-saved-current-duplicate';
      STATE.career.seasonCount = 2;
      STATE.career.honors = honors('champion', '总冠军', 2);
      STATE.career.seasons = [
        { seasonNum: 1, awards: honors('champion', '总冠军', 1) },
        { seasonNum: 2, awards: [{ act: 'champion', label: '总冠军', seasonNum: 2, winner: user, isUser: true }] }
      ];
      STATE.season.awards = [{ act: 'champion', label: '总冠军', winner: user, isUser: true }];
      STATE._careerSaved = true;
      PP_FX.getUnlocked().champion_x3 = {
        at: 1,
        singleCareer: { version: 1, gameId: 'career-saved-current-duplicate', count: 3 }
      };
      const savedSeasonFacts = PP_FX.syncAchievements();
      const savedCurrentAwardDoesNotDuplicate = savedSeasonFacts.champion === 2 && !PP_FX.getUnlocked().champion_x3;

      // 同一生涯达到 3 次后写入凭证；之后开始新生涯，已合法获得的成就永久保留。
      STATE.gameId = 'career-three';
      STATE._careerSaved = false;
      STATE.career.seasonCount = 2;
      STATE.season.awards = [];
      STATE.career.honors = honors('champion', '总冠军', 3);
      PP_FX.syncAchievements();
      const champRecord = PP_FX.getUnlocked().champion_x3;
      const sameCareerChampUnlocks = !!(champRecord && champRecord.singleCareer && champRecord.singleCareer.gameId === 'career-three' && champRecord.singleCareer.count === 3);
      STATE.gameId = 'career-four';
      STATE.career.honors = honors('champion', '总冠军', 1);
      PP_FX.syncAchievements();
      const validUnlockSurvivesNewCareer = !!PP_FX.getUnlocked().champion_x3;

      PP_FX.resetAchievements();
      STATE.gameId = 'career-mvp';
      STATE.career.honors = honors('mvp', 'MVP', 3);
      PP_FX.syncAchievements();
      const mvpRecord = PP_FX.getUnlocked().mvp_x3;
      const sameCareerMvpUnlocks = !!(mvpRecord && mvpRecord.singleCareer && mvpRecord.singleCareer.gameId === 'career-mvp' && mvpRecord.singleCareer.count === 3);
      const descriptionsExplicit = PP_FX.ACHIEVEMENTS.filter(item => item.id === 'mvp_x3' || item.id === 'champion_x3').every(item => item.desc.includes('同一生涯'));

      return { legacyFalseUnlockRemoved, splitCareersDoNotStack, savedCurrentAwardDoesNotDuplicate, sameCareerChampUnlocks, validUnlockSurvivesNewCareer, sameCareerMvpUnlocks, descriptionsExplicit };
    });
    assert.deepEqual(singleCareerAchievementProbe, {
      legacyFalseUnlockRemoved: true,
      splitCareersDoNotStack: true,
      savedCurrentAwardDoesNotDuplicate: true,
      sameCareerChampUnlocks: true,
      validUnlockSurvivesNewCareer: true,
      sameCareerMvpUnlocks: true,
      descriptionsExplicit: true
    }, '累计成就必须在同一次生涯内达成：' + JSON.stringify(singleCareerAchievementProbe));
    const endingMediaProbe = await page.evaluate(() => {
      const sample = {
        score: 188, tier: '历史前十级别', hof: true, top100: true, goat: true,
        seasonsCount: 15, games: 1180, points: 32600, championships: 6, mvp: 5, fmvp: 6,
        dpoy: 2, allNBA: 11, allStar: 13, teamCount: 1, teamList: '芝加哥公牛',
        firstTeam: '芝加哥公牛', lastTeam: '芝加哥公牛', jerseyTeams: []
      };
      const sampled = [];
      for (let i = 0; i < 80; i++) sampled.push(...pickEndingMediaMoments(sample, 2));
      // 视觉回归固定覆盖报纸与电视；随机性由上面的 80 轮采样验证。
      sample.endingMediaMoments = [
        { storyId: 'ring_case', formatId: 'newspaper' },
        { storyId: 'goat_debate', formatId: 'broadcast' }
      ];
      STATE.career.legacy = sample;
      const posterSections = buildRetirementStoryPosterSections(sample);
      showLegacyModal(1, 0);
      const card = document.querySelector('#legacy-modal .legacy-media-card');
      return {
        formatCount: ENDING_MEDIA_FORMATS.length,
        storyCount: ENDING_MEDIA_STORIES.length,
        sampledFormats: new Set(sampled.map(item => item.formatId)).size,
        sampledStories: new Set(sampled.map(item => item.storyId)).size,
        twoUniqueStories: new Set(sample.endingMediaMoments.map(item => item.storyId)).size === 2,
        twoUniqueFormats: new Set(sample.endingMediaMoments.map(item => item.formatId)).size === 2,
        posterSectionCount: posterSections.length,
        posterContainsBothMediaStories: posterSections.some(item => item.text.includes('戒指陈列柜')) && posterSections.some(item => item.text.includes('历史第一的争论')),
        posterContainsExactRank: posterSections.some(item => item.title === '历史百大' && item.text.includes('最终排名：第1名')),
        firstStory: card && card.dataset.mediaStory,
        firstFormat: card && card.dataset.mediaFormat,
        hasHeadline: !!document.querySelector('#legacy-modal .legacy-media-headline'),
        singleScreen: !!card && document.querySelector('#legacy-modal .team-picker-modal').scrollHeight <= window.innerHeight * .85 + 2
      };
    });
    assert.ok(endingMediaProbe.formatCount >= 8, '结局媒体模板至少应有 8 种：' + JSON.stringify(endingMediaProbe));
    assert.ok(endingMediaProbe.storyCount >= 32, '结局媒体报道角度至少应有 32 条：' + JSON.stringify(endingMediaProbe));
    assert.ok(endingMediaProbe.sampledFormats >= 8 && endingMediaProbe.sampledStories >= 12, '多次生涯应产生足够不同的结局组合：' + JSON.stringify(endingMediaProbe));
    assert.ok(endingMediaProbe.posterSectionCount === 6 && endingMediaProbe.posterContainsBothMediaStories && endingMediaProbe.posterContainsExactRank, '退役长海报必须同步收录两段媒体回声和百大具体名次：' + JSON.stringify(endingMediaProbe));
    assert.ok(endingMediaProbe.twoUniqueStories && endingMediaProbe.twoUniqueFormats && endingMediaProbe.hasHeadline && endingMediaProbe.singleScreen, '单局两段时代回声必须不重复且保持单屏：' + JSON.stringify(endingMediaProbe));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, '05-ending-media-first.png'), fullPage: false });
    await page.click('#legacy-modal .btn-primary');
    await page.waitForTimeout(500);
    const secondEndingMediaProbe = await page.evaluate(() => {
      const card = document.querySelector('#legacy-modal .legacy-media-card');
      return { story: card && card.dataset.mediaStory, format: card && card.dataset.mediaFormat, headline: document.querySelector('#legacy-modal .legacy-media-headline')?.textContent || '' };
    });
    assert.ok(secondEndingMediaProbe.story && secondEndingMediaProbe.format && secondEndingMediaProbe.headline, '第二段结局媒体事件必须可操作显示：' + JSON.stringify(secondEndingMediaProbe));
    assert.notEqual(secondEndingMediaProbe.story, endingMediaProbe.firstStory, '同一结局的两段报道主题不能重复');
    assert.notEqual(secondEndingMediaProbe.format, endingMediaProbe.firstFormat, '同一结局的两种媒体版式不能重复');
    await page.screenshot({ path: path.join(outputDir, '06-ending-media-second.png'), fullPage: false });
    await page.evaluate(() => document.getElementById('legacy-modal')?.remove());
    const legacyRankingProbe = await page.evaluate(() => {
      const legacy = Object.assign({}, STATE.career.legacy, {
        score: 170,
        goat: false,
        tier: '历史前二十级别',
        top100: true,
        championships: 1,
        mvp: 2,
        fmvp: 1,
        dpoy: 1,
        allNBA: 8,
        allStar: 8,
        longestYears: 15,
        scoreBreakdown: null
      });
      ensureLegacyRankingDetails(legacy);
      STATE.career.legacy = legacy;
      showLegacyModal(5, 0);
      const modal = document.querySelector('#legacy-modal .team-picker-modal');
      const target = document.querySelector('#legacy-modal .legacy-rank-row.is-player');
      const top100Rows = Array.from(document.querySelectorAll('#legacy-modal .legacy-rank-row')).filter(row => Number(row.dataset.rank) <= 100);
      return {
        baselineCount: LEGACY_TOP100_BASELINE.length,
        top100Rows: top100Rows.length,
        rank: legacy.historicalRank,
        targetRank: Number(target && target.dataset.rank),
        hasPlayerAvatar: !!(target && target.querySelector('.legacy-row-avatar')),
        finishLocked: !!document.querySelector('#legacy-modal .legacy-rank-finish:disabled'),
        settlement: document.querySelector('#legacy-modal .legacy-rank-settlement')?.textContent.replace(/\s+/g, ' ').trim() || '',
        singleScreen: !!modal && modal.getBoundingClientRect().top >= -1 && modal.getBoundingClientRect().bottom <= innerHeight + 1,
        outsideRank: calculateLegacyHistoricalRank(120, false),
        goatRank: calculateLegacyHistoricalRank(250, true)
      };
    });
    assert.equal(legacyRankingProbe.baselineCount, 100, '游戏历史百大基准榜必须包含完整 100 名');
    assert.equal(legacyRankingProbe.top100Rows, 100, '百大详情界面必须真正渲染 1–100 名');
    assert.equal(legacyRankingProbe.targetRank, legacyRankingProbe.rank, '主角头像必须落在计算出的最终名次');
    assert.ok(legacyRankingProbe.rank >= 11 && legacyRankingProbe.rank <= 20 && legacyRankingProbe.hasPlayerAvatar, '170 历史分应进入历史前二十并显示主角头像：' + JSON.stringify(legacyRankingProbe));
    assert.ok(legacyRankingProbe.finishLocked && legacyRankingProbe.singleScreen, '排名动画期间应锁定结算按钮且手机单屏可见：' + JSON.stringify(legacyRankingProbe));
    assert.ok(legacyRankingProbe.settlement.includes('最终第 ' + legacyRankingProbe.rank + ' 名') && legacyRankingProbe.settlement.includes('从第150名上升'), '百大结算必须详细显示最终名次和上升位数：' + legacyRankingProbe.settlement);
    assert.ok(legacyRankingProbe.outsideRank > 100 && legacyRankingProbe.goatRank === 1, '百大门外与 GOAT 名次映射必须正确');
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(outputDir, '07-top100-climbing.png'), fullPage: false });
    await page.waitForTimeout(1800);
    const rankingSettledProbe = await page.evaluate(() => ({
      complete: document.querySelector('.legacy-top100-wrap')?.dataset.animationComplete === '1',
      landed: !!document.querySelector('.legacy-rank-row.is-player.landed'),
      finishEnabled: !document.querySelector('.legacy-rank-finish')?.disabled,
      textState: JSON.parse(render_game_to_text()).legacyRanking
    }));
    assert.ok(rankingSettledProbe.complete && rankingSettledProbe.landed && rankingSettledProbe.finishEnabled, '头像上升后必须停在最终名次并解锁结算按钮：' + JSON.stringify(rankingSettledProbe));
    assert.equal(rankingSettledProbe.textState.rank, legacyRankingProbe.rank, '文本状态必须同步百大最终名次');
    assert.equal(rankingSettledProbe.textState.animationComplete, true, '文本状态必须同步动画完成状态');
    await page.screenshot({ path: path.join(outputDir, '08-top100-landed.png'), fullPage: false });
    await page.evaluate(() => document.getElementById('legacy-modal')?.remove());
    const achievementPanelProbe = await page.evaluate(() => {
      PP_FX.resetAchievements();
      const got = PP_FX.getUnlocked();
      got.mvp = { at: 1 };
      got.fmvp = { at: 1 };
      PP_FX.openPanel();
      const text = document.getElementById('pp-ach-panel').textContent.replace(/\s+/g, ' ').trim();
      return { hasRegularMvp: text.includes('联盟 MVP'), hasFmvp: text.includes('总决赛 MVP'), text };
    });
    assert.ok(achievementPanelProbe.hasRegularMvp && achievementPanelProbe.hasFmvp, '成就面板必须分别展示 MVP 与 FMVP：' + achievementPanelProbe.text);
    await page.locator('#pp-ach-panel .pp-ach-item').filter({ hasText: '总决赛 MVP' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(outputDir, '04-achievements-mvp-fmvp.png'), fullPage: false });
    await page.evaluate(() => document.getElementById('pp-ach-panel')?.remove());
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(outputDir, '03-visible-player-states.png'), fullPage: false });

    await page.evaluate(() => {
      localStorage.setItem('pp_legacy_v1', JSON.stringify({ levels:{ scorer:5, prodigy:3 }, spent:28 }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.PP_FX && typeof PP_FX.getLegacy === 'function');
    const legacyMigration = await page.evaluate(() => ({
      legacy: PP_FX.getLegacy(),
      total: PP_FX.totalLP(),
      available: PP_FX.availableLP()
    }));
    assert.equal(legacyMigration.legacy.version, 2, '旧传承存档应迁移到新版成本结构');
    assert.deepEqual(legacyMigration.legacy.levels, {}, '旧低价强化等级必须重置，不能绕过新版成本');
    assert.equal(legacyMigration.legacy.spent, 0, '旧强化重置后已消费点数必须全部返还');
    assert.equal(legacyMigration.available, legacyMigration.total, '迁移后所有已获得传承点必须可重新分配');
    assert.equal(legacyMigration.legacy.rebalanceNoticePending, true, '旧存档应显示一次重新平衡提示');

    const localBadResponses = badResponses.filter(item => item.includes(`127.0.0.1:${port}`));
    assert.deepEqual(localBadResponses, [], '不应有本地 4xx 资源：' + localBadResponses.join(', '));
    assert.deepEqual(errors, [], '浏览器错误：' + errors.join('\n') + '\n4xx：' + badResponses.join('\n'));
    console.log(JSON.stringify({ ok: true, pool: 510, current: 360, historical: 150, injuryEventsAdded: 12, seasonEventsAdded: 200, draftEvents: 35, careerBalance, legacyMigration, simulation, screenshots: outputDir }, null, 2));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
