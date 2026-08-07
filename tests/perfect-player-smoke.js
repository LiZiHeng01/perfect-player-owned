'use strict';

/**
 * 完美球员模式浏览器冒烟测试
 * 完整走一遍：新建生涯 → 锁13项属性 → 揭幕 → 选队 → 单赛季模拟 → 季后赛总结
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (err) {
    const runtimeNodeModules = path.join(
      process.env.USERPROFILE || 'C:\\Users\\46676',
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules'
    );
    const directPackage = path.join(runtimeNodeModules, 'playwright');
    try {
      return require(directPackage);
    } catch (directErr) {
      const pnpmRoot = path.join(runtimeNodeModules, '.pnpm');
      const packageDir = fs.readdirSync(pnpmRoot)
        .filter(name => name.startsWith('playwright@'))
        .sort()
        .reverse()
        .map(name => path.join(pnpmRoot, name, 'node_modules', 'playwright'))
        .find(candidate => fs.existsSync(candidate));
      if (!packageDir) throw directErr;
      return require(packageDir);
    }
  }
}

function argValue(name, fallback = '') {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Users\\46676\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1208\\chrome-headless-shell-win64\\chrome-headless-shell.exe'
  ].filter(Boolean).find(p => fs.existsSync(p));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      lastErr = new Error(`${url} returned ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(250);
  }
  throw lastErr || new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const { chromium } = loadPlaywright();
  const port = parseInt(argValue('--port', '8031'), 10);
  const chromePath = argValue('--chrome', '') || findChrome();
  assert.ok(chromePath, 'Chrome or Edge executable should exist');

  const poolPath = path.join(root, 'assets', 'data', 'perfect-player-pool.json');
  const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
  const poolTeams = Object.values(pool.teams || {});
  assert.equal(poolTeams.length, 30, '精选球员池应有 30 支球队');
  poolTeams.forEach(team => {
    assert.equal(team.players.length, 15, `${team.name} 应有 15 名精选球员`);
    assert.equal(team.currentCount, 12, `${team.name} 应保持 80% 现役球员`);
    assert.equal(team.historicalCount, 3, `${team.name} 应保持 20% 历史全明星球员`);
    team.players.filter(player => player.source && player.source.kind === 'current').forEach(player => {
      assert.ok(player.photoUrl && /\/260x190\/\d+\.png$/.test(player.photoUrl), `${player.name} 应使用虎扑同款 260x190 头像地址`);
      assert.ok(player.photoLocal && fs.existsSync(path.join(root, player.photoLocal)), `${player.name} 现役头像应已本地化`);
    });
    team.players.filter(player => player.source && player.source.kind === 'historical').forEach(player => {
      assert.ok(player.photoLocal && fs.existsSync(path.join(root, player.photoLocal)), `${player.name} 历史头像应已本地化`);
    });
  });

  const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    windowsHide: true,
    stdio: 'ignore'
  });

  let browser = null;
  const errors = [];
  try {
    const pageUrl = `http://127.0.0.1:${port}/nba-perfect-player.html`;
    await waitForHttp(pageUrl);
    browser = await chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--disable-gpu', '--disable-extensions', '--disable-background-networking', '--no-first-run', '--no-default-browser-check']
    });
    const context = await browser.newContext({
      viewport: { width: 900, height: 1400 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    page.on('console', msg => { if (msg.type() === 'error') errors.push('[console] ' + msg.text()); });
    page.on('console', msg => { if (msg.type() === 'warning' && msg.text().includes('perfect-player')) errors.push('[warn] ' + msg.text()); });
    page.on('pageerror', err => errors.push('[pageerror] ' + err.message));
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 30000 });

    // 等待主菜单
    await page.waitForSelector('#screen-menu.active', { timeout: 15000 });
    assert.ok(await page.isVisible('#btn-new-game'), '新建生涯按钮可见');
    assert.equal(await page.locator('.feature-card').count(), 2, '首页应保持虎扑两张模式卡布局');
    assert.equal(await page.locator('.feature-card.selected').count(), 1, '生涯模式卡应为选中态');
    const menuStyle = await page.$eval('#pp-app', el => {
      const style = getComputedStyle(el);
      return { maxWidth: style.maxWidth, background: style.backgroundColor };
    });
    assert.equal(menuStyle.maxWidth, '560px', '首页应使用虎扑窄栏宽度');
    assert.equal(menuStyle.background, 'rgb(250, 245, 235)', '首页应使用虎扑米白底色');
    assert.strictEqual(await page.locator('#btn-conquest').count(), 0, '征服联盟入口应已移除');
    assert.strictEqual(await page.locator('#screen-honors').count(), 0, '征服联盟页面应已移除');

    // 1) 新建生涯 → 角色创建界面
    await page.click('#btn-new-game');
    await page.waitForSelector('#screen-character.active', { timeout: 30000 });
    await page.waitForSelector('.char-avatar-cell', { timeout: 10000 });
    assert.strictEqual(await page.locator('.char-avatar-cell').count(), 6, '应有 6 张球员大头照');
    const avatarGroups = await page.$$eval('.char-avatar-meta b', nodes => nodes.map(node => node.textContent.trim()));
    assert.deepStrictEqual(avatarGroups, ['亚洲', '亚洲', '白人', '白人', '黑人', '黑人'], '头像分组应为亚洲/白人/黑人各 2 张');
    await page.fill('#char-name-input', '林一飞');
    await page.click('.char-avatar-cell[data-avatar$="avatar-03.png"]');
    await page.click('#btn-confirm-character');
    await page.waitForSelector('#screen-position.active', { timeout: 30000 });
    await page.click('.pos-card[data-pos="SG"]');
    await page.waitForFunction(() => !document.getElementById('btn-confirm-position').disabled);
    await page.click('#btn-confirm-position');
    await page.waitForSelector('#screen-build.active', { timeout: 15000 });
    fs.mkdirSync(path.join(root, 'output'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'output', 'perfect-player-smoke-build.png'), fullPage: true });

    // 2) 进入建球员页时已自动抽取球队
    await page.waitForSelector('.player-card', { timeout: 15000 });
    const sourceChain = await page.textContent('#br-slot-area');
    assert.ok(sourceChain.includes('年份') && sourceChain.includes('球队') && sourceChain.includes('球员') && sourceChain.includes('→'), '建球员页应显示随机来源链');
    assert.equal(await page.locator('.player-card').count(), 15, '每轮应只展示 15 名精选球员');

    // 3) 循环锁定 13 项属性
    for (let i = 0; i < 13; i++) {
      await page.waitForSelector('.player-card', { timeout: 15000 });
      const clicked = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.player-card')];
        const target = cards.find(c => c.style.opacity !== '0.35');
        if (!target) return { ok: false, why: 'no available card' };
        target.click();
        const cell = document.querySelector('.attr-lock-cell');
        if (!cell) return { ok: false, why: 'no attr overlay' };
        cell.click();
        return { ok: true };
      });
      assert.ok(clicked.ok, `第 ${i + 1} 轮锁定失败：${clicked.why}`);
      await sleep(120);
    }

    // 揭幕
    await page.waitForSelector('#screen-reveal.active', { timeout: 15000 });
    const ovrText = await page.textContent('.reveal-ovr');
    const ovr = parseInt(ovrText, 10);
    assert.ok(ovr >= 50 && ovr <= 99, `OVR 合理：${ovr}`);
    const revealName = await page.textContent('.reveal-name');
    assert.strictEqual(revealName.trim(), '林一飞', '自定义名字应显示在揭幕页');
    const revealImg = await page.$eval('.reveal-avatar', el => el.tagName === 'IMG' ? el.getAttribute('src') : '');
    assert.ok(revealImg.includes('avatar-03'), '选中的 AI 头像应显示在揭幕页');
    const revealSave = await page.evaluate(() => JSON.parse(localStorage.getItem('perfectPlayerSaveV1')));
    assert.equal(revealSave.career.attributeSources.length, 13, '13 项属性应各有一条随机来源记录');
    assert.ok(revealSave.career.attributeSources.every(row => row.requestedYear && row.teamId && row.playerName), '属性来源应包含年份、球队和球员');

    // 4) 选择生涯球队
    await page.click('#btn-to-career');
    await page.waitForSelector('#screen-career.active', { timeout: 15000 });
    await page.waitForSelector('.team-pick', { timeout: 15000 });
    await page.click('.team-pick');
    await page.waitForFunction(() => !document.getElementById('btn-confirm-team').disabled, { timeout: 5000 });
    await page.click('#btn-confirm-team');
    // 赛季界面应出现（有 vitals）
    await page.waitForSelector('#screen-season.active', { timeout: 20000 });
    await page.waitForSelector('#vitals-panel .vital', { timeout: 15000 });
    const vitalsText = await page.textContent('#vitals-panel');
    assert.ok(vitalsText.includes('媒体压力'), '媒体压力数值条已渲染');
    assert.ok(vitalsText.includes('体力'), '体力数值条已渲染');
    assert.ok(vitalsText.includes('球迷支持'), '球迷支持数值条已渲染');

    // 5) 模拟本场
    await page.waitForSelector('#btn-sim-next', { timeout: 15000 });
    await page.click('#btn-sim-next');
    await page.waitForSelector('#gameModal[style*="flex"]', { timeout: 30000 });
    const gameText = await page.textContent('#gameModal');
    assert.ok(gameText.includes('我的表现') || gameText.includes('缺阵'), '比赛弹窗包含我的表现');
    await page.click('#game-close');
    await page.waitForFunction(() => !document.getElementById('gameModal').style.display || document.getElementById('gameModal').style.display === 'none');
    const record1 = await page.textContent('#season-record');
    assert.match(record1, /^[01]-[01]$/, `战绩已更新：${record1}`);

    // 6) 快进剩余常规赛（自动处理途中弹出的随机事件）
    await page.click('#btn-sim-all');
    const deadline = Date.now() + 180000;
    let inPlayoffs = false;
    while (Date.now() < deadline) {
      const visible = await page.evaluate(() => {
        const ev = document.getElementById('eventModal');
        if (ev && ev.style.display === 'flex') {
          const choice = document.querySelector('.event-choice');
          if (choice) choice.click();
          return { event: true };
        }
        return { event: false, playoffs: document.getElementById('screen-playoffs').classList.contains('active') };
      });
      if (visible.event) {
        await sleep(150);
        continue;
      }
      if (visible.playoffs) { inPlayoffs = true; break; }
      await sleep(250);
    }
    assert.ok(inPlayoffs, '常规赛快进后应进入季后赛界面');
    await page.waitForSelector('#btn-run-playoffs', { timeout: 20000 });
    await page.click('#btn-run-playoffs');
    await page.waitForSelector('#btn-season-done', { timeout: 180000 });
    await page.click('#btn-season-done');
    await page.waitForSelector('#btn-single-season-done', { timeout: 15000 });
    const resultText = await page.textContent('#playoff-body');
    assert.ok(resultText.includes('常规赛场均'), '赛季总结包含场均数据');
    assert.ok(resultText.includes('虎扑单赛季已结束'), '赛季总结应标记单赛季结束');
    assert.equal(await page.locator('#btn-go-offseason').count(), 0, '不应有休赛期入口');
    assert.equal(await page.locator('#btn-next-season').count(), 0, '不应有下一赛季入口');

    // 7) 完成单赛季并返回菜单
    await page.click('#btn-single-season-done');
    await page.waitForSelector('#screen-menu.active', { timeout: 15000 });
    const continueText = await page.textContent('#btn-continue');
    assert.ok(continueText.includes('单赛季结果'), '首页继续按钮应指向单赛季结果');

    // 存档存在
    const finalSave = await page.evaluate(() => JSON.parse(localStorage.getItem('perfectPlayerSaveV1')));
    assert.ok(finalSave && finalSave.career, '本地存档已写入');
    assert.equal(finalSave.career.seasonCount, 1, '单赛季完成后赛季数应为 1');
    assert.equal(finalSave.career.singleSeasonComplete, true, '存档应标记单赛季已完成');
    await page.screenshot({ path: path.join(root, 'output', 'perfect-player-smoke-final.png'), fullPage: true });

    console.log('✅ perfect-player smoke PASSED');
    console.log('  OVR:', ovr, '| 首场战绩:', record1);
  } catch (err) {
    console.error('❌ perfect-player smoke FAILED:', err.message);
    if (browser) {
      const pages = browser.contexts().flatMap(c => c.pages());
      const p = pages[0];
      if (p) {
        try {
          const shot = path.join(root, 'output', 'perfect-player-smoke-fail.png');
          fs.mkdirSync(path.dirname(shot), { recursive: true });
          await p.screenshot({ path: shot, fullPage: true });
          console.error('screenshot:', shot);
          console.error('url:', p.url());
          console.error('body snippet:', (await p.evaluate(() => document.body.innerText.slice(0, 800))));
        } catch (e2) { /* ignore */ }
      }
    }
    process.exitCode = 1;
  } finally {
    if (errors.length) {
      console.error('browser errors:');
      errors.slice(0, 20).forEach(e => console.error('  -', e));
    }
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
