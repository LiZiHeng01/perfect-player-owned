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
  const teams = Object.values(pool.teams || {});
  assert.equal(teams.length, 30);
  teams.forEach(team => {
    assert.equal(team.players.length, 18, team.name + ' 应有 18 人');
    assert.equal(team.currentCount, 12, team.name + ' 应有 12 名现役');
    assert.equal(team.historicalCount, 6, team.name + ' 应有 6 名历史巅峰球员');
    team.players.forEach(player => {
      assert.ok(fs.existsSync(path.join(root, player.photoLocal)), player.name + ' 缺少本地头像');
    });
  });

  const port = 8042;
  const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    windowsHide: true,
    stdio: 'ignore'
  });
  let browser;
  try {
    const url = `http://127.0.0.1:${port}/nba-perfect-player.html`;
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
    await page.waitForSelector('#screen-menu.active');
    await page.waitForFunction(() => window.PERFECT_PLAYER_POOL_REPORT && window.PERFECT_PLAYER_POOL_REPORT.total === 540);

    assert.equal(await page.locator('.feature-card').count(), 1, '首页只应有虎扑原生涯入口');
    assert.equal(await page.locator('#screen-achievements').count(), 0, '征服联盟占位页应移除');
    assert.equal(await page.locator('.btn-share-poster').count(), 0, 'JRs 发帖入口应移除');
    const poolReport = await page.evaluate(() => window.PERFECT_PLAYER_POOL_REPORT);
    assert.deepEqual(poolReport, {
      teams: 30, teamsWithTarget18: 30, current: 360, historical: 180, total: 540,
      historicalBuildOnly: true, competitionRosterSource: 'NBA2K_DATA (current-only)'
    });
    const poolSeparation = await page.evaluate(() => ({
      buildSize: PERFECT_PLAYER_BUILD_DATA.LAL.length,
      buildHistorical: PERFECT_PLAYER_BUILD_DATA.LAL.filter(player => player._sourceKind === 'historical').length,
      leagueSize: NBA2K_DATA.LAL.length,
      leagueHistorical: NBA2K_DATA.LAL.filter(player => player._sourceKind === 'historical').length,
      lineupHistorical: Object.values(calcTeamLineup('LAL').starters).concat(calcTeamLineup('LAL').bench).filter(player => player._sourceKind === 'historical').length
    }));
    assert.equal(poolSeparation.buildSize, 18, '建模候选池应保留每队 18 人');
    assert.equal(poolSeparation.buildHistorical, 6, '建模候选池应有六名历史巅峰球员');
    assert.ok(poolSeparation.leagueSize >= 10, '正式球队应保留原现役轮换');
    assert.equal(poolSeparation.leagueHistorical, 0, '正式比赛名单不应注入经典球员');
    assert.equal(poolSeparation.lineupHistorical, 0, '比赛轮换不应出现经典球员');
    assert.equal(await page.evaluate(() => window.PERFECT_PLAYER_EVENT_REPORT.added), 12, '应扩充 12 个原机制事件');
    assert.deepEqual(await page.evaluate(() => window.PERFECT_PLAYER_DRAFT_EVENT_REPORT), {
      total: 19, pre: 10, post: 9, perRun: 2, stageChance: { pre: 0.65, post: 0.55 }
    });
    const randomDraftIds = await page.evaluate(() => {
      const ids = [];
      for (let index = 0; index < 100; index++) ids.push(pickPerfectPlayerDraftEventId('pre', []));
      return [...new Set(ids)];
    });
    assert.ok(randomDraftIds.length >= 4, '选秀事件抽取不应固定：' + randomDraftIds.join(','));

    await page.click('#feature-grid .fc-btn');
    await page.waitForSelector('#screen-character.active');
    assert.equal(await page.locator('.character-avatar').count(), 6, '角色创建应有六张真人大头照');
    await page.waitForFunction(() => [...document.querySelectorAll('.character-avatar img')].every(image => image.complete && image.naturalWidth > 0), null, { timeout: 15000 });
    const avatarLoads = await page.$$eval('.character-avatar img', images => images.map(image => image.complete && image.naturalWidth > 0));
    assert.ok(avatarLoads.every(Boolean), '六张头像都应完成加载');
    const characterBounds = await page.$eval('#screen-character', element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
    });
    assert.ok(characterBounds.top >= -1 && characterBounds.bottom <= characterBounds.viewport + 1, '角色创建可操作区应在手机单屏内');

    const outputDir = path.join(root, 'output', 'perfect-player-hupu-mobile');
    fs.mkdirSync(outputDir, { recursive: true });
    await page.screenshot({ path: path.join(outputDir, '01-character.png'), fullPage: false });

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
    const adBatchNames = await page.$$eval('.br-player .bp-name', nodes => nodes.map(node => node.textContent.trim()));
    assert.equal(new Set(adBatchNames).size, 5, '广告重选同一轮五名球员不能重复');
    const localHeadshots = await page.$$eval('.br-player .bp-headshot', elements => elements.map(element => ({ computed: getComputedStyle(element).backgroundImage, inline: element.getAttribute('style'), player: element.closest('.br-player').textContent.trim() })));
    assert.ok(localHeadshots.every(value => value.computed.includes('/assets/')), '候选球员应全部使用本地真人头像：' + JSON.stringify(localHeadshots));
    await page.screenshot({ path: path.join(outputDir, '02-five-player-build.png'), fullPage: false });

    const historicalList = await page.evaluate(() => {
      const historical = PERFECT_PLAYER_BUILD_DATA.LAL.filter(player => player._sourceKind === 'historical');
      renderRosterPlayers('LAL', historical, PERFECT_PLAYER_BUILD_DATA.LAL);
      return historical.map(player => ({ name: player.name, label: player._sourceLabel, photo: player._photoLocal }));
    });
    assert.equal(historicalList.length, 6, '每队建模池应有六名历史巅峰球员');
    assert.ok(historicalList.every(player => player.label && player.photo), '历史球员应有赛季与本地头像');
    assert.equal(await page.locator('.bp-detail').evaluateAll(nodes => nodes.filter(node => /经典|生涯巅峰/.test(node.textContent)).length), 6, '历史候选应显式标注经典赛季');

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
    assert.ok((await page.getAttribute('.reveal-player-avatar', 'src')).includes('avatar-04'), '创建头像应进入虎扑原揭幕页');

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
    assert.equal(states.keys.length, 18, '应完整展示 11 项生涯属性、6 项赛季修正和压力');
    ['压力','体能负荷','士气','状态波动','伤病风险','球队默契','媒体压力','人气','商业价值','媒体信任','争议','中国人气','忠诚','领导力','教练信任','更衣室信任','球迷支持','传奇加成'].forEach(label => {
      assert.ok(states.text.includes(label), '状态面板缺少：' + label);
    });
    const liveStateText = await page.evaluate(() => {
      addProfileDelta('mediaTrust', 3);
      addSeasonMod('mediaPressure', -2, -10, 10);
      return document.getElementById('player-state-strip').textContent.replace(/\s+/g, ' ').trim();
    });
    assert.ok(liveStateText.includes('+5') && liveStateText.includes('+2'), '状态条应在事件数值变化后立即刷新：' + liveStateText);

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
    assert.equal(simulation.report.engine, '82-win-possession');
    assert.ok(simulation.strongVsWeak.winRate > 0.58 && simulation.strongVsWeak.winRate < 0.96, '强弱队胜率应合理拉开：' + JSON.stringify(simulation));
    assert.ok(simulation.even.winRate > 0.43 && simulation.even.winRate < 0.57, '同强度对局应接近五五开：' + JSON.stringify(simulation.even));
    assert.ok(simulation.strongVsWeak.avgA > 90 && simulation.strongVsWeak.avgA < 135 && simulation.strongVsWeak.avgB > 85 && simulation.strongVsWeak.avgB < 130, '比分均值应处于现代 NBA 区间：' + JSON.stringify(simulation.strongVsWeak));
    assert.ok(simulation.strongVsWeak.minScore >= 78 && simulation.strongVsWeak.maxScore <= 180, '比分边界异常：' + JSON.stringify(simulation.strongVsWeak));

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
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(outputDir, '03-visible-player-states.png'), fullPage: false });

    const localBadResponses = badResponses.filter(item => item.includes(`127.0.0.1:${port}`));
    assert.deepEqual(localBadResponses, [], '不应有本地 4xx 资源：' + localBadResponses.join(', '));
    assert.deepEqual(errors, [], '浏览器错误：' + errors.join('\n') + '\n4xx：' + badResponses.join('\n'));
    console.log(JSON.stringify({ ok: true, pool: 540, current: 360, historical: 180, injuryEventsAdded: 12, draftEvents: 19, simulation, screenshots: outputDir }, null, 2));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
