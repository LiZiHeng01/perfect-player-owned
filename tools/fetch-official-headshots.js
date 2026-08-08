'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const currentDataFile = path.join(root, 'assets', 'js', 'hupu', 'script-01-2678-5hu3djrc-upload-1783494754597-12.js');
const imageMapFile = path.join(root, 'assets', 'js', 'hupu', 'script-00-2678-58zyeprc-upload-1783508428855-12.js');
const officialDir = path.join(root, 'assets', 'images', 'Player', 'nba-official');
const rookieDir = path.join(root, 'assets', 'images', 'Player', 'rookies-2026');

const missingCurrentIds = {
  'Keshon Gilbert': 1642933,
  'Chaney Johnson': 1643052,
  'Malachi Smith': 1641869,
  'Tristan Enaruna': 1642400,
  'John Poulakidas': 1642967,
  'LJ Cryer': 1643018,
  'Norchad Omier': 1641807,
  'Sean Pedulla': 1642951,
  'Jahmai Mashack': 1642942,
  'Adama Bal': 1642380,
  'Cormac Ryan': 1642504,
  'Josh Oduro': 1642490,
  'Alex Morales': 1631457,
  'Jayson Kent': 1643257,
  'Blake Hinson': 1642396,
  'Bez Mbeng': 1643016,
  'Hayden Gray': 1643060,
  'Julian Reese': 1642882,
  'KyShawn George': 1642273,
  'Jimmy Butler': 202710,
};

// NBA CDN 对极少数刚签约的现实球员暂时只返回灰色剪影，使用 ESPN 官方球员资料头像补齐。
// 头像仍是球员本人照片，运行时会优先读取项目内缓存。
const alternateCurrentHeadshotUrls = {
  1630286: 'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/3934620.png', // Trevon Scott
  1642380: 'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4896365.png', // Adama Bal
  1643257: 'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4703889.png', // Jayson Kent
};

const draft2026Ids = [
  1643407, 1643408, 1643409, 1643410, 1643413, 1643414, 1643411, 1643412, 1643516, 1643415,
  1642865, 1643530, 1643417, 1643419, 1643517, 1642892, 1643536, 1643515, 1643512, 1643519,
  1643510, 1642889, 1643544, 1643418, 1643547, 1643542, 1643416, 1643538, 1642284, 1643520,
  1643570, 1643563, 1642912, 1643509, 1642350, 1642394, 1643553, 1643552, 1643583, 1641759,
  1642923, 1643551, 1643548, 1643576, 1643567, 1643590, 1643589, 1643588, 1643624, 1643558,
  1643593, 1643539, 1642391, 1643650, 1643568, 1643585, 1643712, 1643555, 1643626, 1641831,
];
const draft2026Slugs = [
  'aj-dybantsa', 'darryn-peterson', 'cameron-boozer', 'caleb-wilson', 'keaton-wagler', 'mikel-brown-jr',
  'darius-acuff-jr', 'kingston-flemings', 'morez-johnson', 'brayden-burries', 'yaxel-lendeborg', 'aday-mara',
  'nate-ament', 'hannes-steinbach', 'dailyn-swain', 'bennett-stirtz', 'ebuka-okorie', 'christian-anderson',
  'allen-graves', 'jayden-quaintance', 'karim-lopez', 'labaron-philon', 'zuby-ejiofor', 'cameron-carr',
  'sergio-de-larrea', 'tarris-reed-jr', 'chris-cenac-jr', 'joshua-jefferson', 'alex-karaban', 'koa-peat',
  'bruce-thornton', 'richie-saunders', 'isaiah-evans', 'meleek-thomas', 'trevon-brazile', 'baba-miller',
  'ryan-conwell', 'braden-smith', 'jack-kayil', 'dillon-mitchell', 'otega-oweh', 'jakobi-gillespie',
  'tyler-bilodeau', 'maliq-brown', 'emanuel-sharp', 'felix-okpara', 'tyler-nickel', 'tobi-lawal',
  'bryce-hopkins', 'jaden-bradley', 'izaiyah-nelson', 'henri-veesaar', 'ugonna-onyenso', 'lajae-jones',
  'nick-martinelli', 'vsevolod-ishchenko', 'narcisse-ngoy', 'jaron-pierre-jr', 'trey-kaufman-renn', 'malique-lewis',
];

// NBA 官方资料页对少数刚选中的球员尚未挂出 draft profile 图片：
// - Mikel Brown Jr. / Morez Johnson Jr. 已经有官方 1040x760 大头照；
// - Darius Acuff Jr. 的官方 Draft 媒体图作为最后兜底。
// 这些仍然来自 NBA.com，不使用灰色 CDN 占位剪影。
const draftPortraitFallbackUrls = {
  7: 'https://cdn.nba.com/manage/2026/06/acuff1.jpg',
};

function evaluateGlobal(file, exportName) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8') + `;this.__export=${exportName};`, context);
  return context.__export;
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function reverseNameKey(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return '';
  return normalizeName(parts[parts.length - 1] + parts.slice(0, -1).join(''));
}

function resolveId(name, imageMap, normalizedImageMap) {
  if (missingCurrentIds[name]) return missingCurrentIds[name];
  if (imageMap[name]) return Number(imageMap[name]);
  return Number(normalizedImageMap[normalizeName(name)] || normalizedImageMap[reverseNameKey(name)] || 0);
}

async function downloadOfficial(id) {
  const target = path.join(officialDir, `${id}.png`);
  const alternateUrl = alternateCurrentHeadshotUrls[id] || '';
  const draftPlaceholderAllowed = draft2026Ids.includes(Number(id));
  if (fs.existsSync(target) && fs.statSync(target).size > 1000 && (!draftPlaceholderAllowed || fs.statSync(target).size !== 4937) && !alternateUrl) return target;
  const url = alternateUrl || `https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`;
  const response = await fetch(url, { headers: { 'User-Agent': 'perfect-player-headshot-cache/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length < 1000) throw new Error(`头像响应过小: ${url}`);
  if (draftPlaceholderAllowed && (body.length === 4937 || body.length === 12430)) {
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    return '';
  }
  if (body.length === 4937 || body.length === 12430) throw new Error(`头像响应是占位图: ${url}`);
  fs.writeFileSync(target, body);
  return target;
}

function extractDraftPortraitUrl(html) {
  const urls = [...new Set((html.match(/https:\/\/cdn\.nba\.com\/manage\/2026\/[^"'&\s)]+\.(?:jpg|jpeg|png)/gi) || []))];
  return urls.find(url => !/26-NBA-DRAFT|NBA_LP|logo|fallback/i.test(url)) || '';
}

async function fetchDraftPortrait(slug) {
  const response = await fetch(`https://www.nba.com/draft/2026/prospects/${slug}`, {
    headers: { 'User-Agent': 'perfect-player-headshot-cache/1.0' },
  });
  if (!response.ok) return '';
  const html = await response.text();
  return extractDraftPortraitUrl(html);
}

async function fetchLargeOfficialHeadshot(id) {
  const url = `https://cdn.nba.com/headshots/nba/latest/1040x760/${id}.png`;
  const response = await fetch(url, { headers: { 'User-Agent': 'perfect-player-headshot-cache/1.0' } });
  if (!response.ok) return '';
  const body = Buffer.from(await response.arrayBuffer());
  // 12,430 bytes 是 NBA CDN 的默认灰色剪影，占位图不能进入最终资源。
  if (body.length < 20000) return '';
  return url;
}

async function downloadUrl(url, target) {
  if (fs.existsSync(target) && fs.statSync(target).size > 1000) return target;
  const response = await fetch(url, { headers: { 'User-Agent': 'perfect-player-headshot-cache/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length < 1000) throw new Error(`头像响应过小: ${url}`);
  fs.writeFileSync(target, body);
  return target;
}

async function main() {
  fs.mkdirSync(officialDir, { recursive: true });
  fs.mkdirSync(rookieDir, { recursive: true });

  const nbaData = evaluateGlobal(currentDataFile, 'NBA2K_DATA');
  const imageMap = evaluateGlobal(imageMapFile, 'NBA_PLAYER_IMAGES');
  const normalizedImageMap = {};
  Object.keys(imageMap).forEach(name => {
    const key = normalizeName(name);
    if (key && !normalizedImageMap[key]) normalizedImageMap[key] = Number(imageMap[name]);
  });

  const currentPlayers = Object.entries(nbaData).flatMap(([team, players]) =>
    players.map(player => {
      const nbaId = resolveId(player.name, imageMap, normalizedImageMap);
      if (!nbaId) throw new Error(`当前名单没有官方 NBA ID: ${player.name}`);
      return {
        team,
        name: player.name,
        cname: player.cname || '',
        nbaId,
        photoLocal: `assets/images/Player/nba-official/${nbaId}.png`,
        photoUrl: alternateCurrentHeadshotUrls[nbaId] || `https://cdn.nba.com/headshots/nba/latest/260x190/${nbaId}.png`,
        photoSource: alternateCurrentHeadshotUrls[nbaId] ? 'espn-official-player-headshot' : 'nba-official-headshot',
      };
    })
  );
  const allIds = [...new Set(currentPlayers.map(player => player.nbaId).concat(draft2026Ids))];
  let finished = 0;
  const concurrency = 12;
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= allIds.length) return;
      await downloadOfficial(allIds[index]);
      finished++;
      if (finished % 50 === 0 || finished === allIds.length) console.log(`cached ${finished}/${allIds.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  const draft2026 = [];
  for (let index = 0; index < draft2026Ids.length; index++) {
    const nbaId = draft2026Ids[index];
    const portraitUrl = await fetchDraftPortrait(draft2026Slugs[index])
      || await fetchLargeOfficialHeadshot(nbaId)
      || draftPortraitFallbackUrls[index + 1]
      || '';
    if (!portraitUrl) throw new Error(`NBA 官方资料页没有真实肖像: pick ${index + 1} ${draft2026Slugs[index]}`);
    const fileName = `rookie-${String(index + 1).padStart(2, '0')}.jpg`;
    const target = path.join(rookieDir, fileName);
    await downloadUrl(portraitUrl, target);
    draft2026.push({
      pick: index + 1,
      nbaId,
      photoLocal: `assets/images/Player/rookies-2026/${fileName}`,
      photoUrl: portraitUrl,
      nbaCdnUrl: `https://cdn.nba.com/headshots/nba/latest/260x190/${nbaId}.png`,
    });
  }
  const manifest = {
    source: 'NBA.com official headshot CDN + NBA.com 2026 Draft profile portraits + ESPN official player headshots fallback',
    sourceUrl: 'https://cdn.nba.com/headshots/nba/latest/260x190/{nbaId}.png',
    generatedAt: new Date().toISOString(),
    currentPlayers,
    draft2026,
  };
  fs.writeFileSync(path.join(root, 'assets', 'data', 'official-headshot-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ currentPlayers: currentPlayers.length, uniqueOfficialIds: allIds.length, draft2026: draft2026.length }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
