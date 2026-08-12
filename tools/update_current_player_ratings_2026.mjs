import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TOOL_DIR);
const ROSTER_PATH = path.join(ROOT, 'assets/js/hupu/script-01-2678-5hu3djrc-upload-1783494754597-12.js');
const PER_GAME_PATH = path.join(ROOT, 'assets/data/nba-2025-26-per-game.json');
const ADVANCED_PATH = path.join(ROOT, 'assets/data/nba-2025-26-advanced.json');
const SHOOTING_PATH = path.join(ROOT, 'assets/data/nba-2025-26-shooting.json');
const OUTPUT_PATH = path.join(ROOT, 'assets/js/current-player-ratings-2026.js');

const ATTR_KEYS = ['threePT', 'MID', 'FIN', 'DNK', 'HAN', 'PAS', 'PDEF', 'IDEF', 'BLK', 'REB', 'ATH', 'STR', 'CLU'];
const OVR_WEIGHTS = {
  PG: { threePT:.10, MID:.10, FIN:.08, DNK:.04, HAN:.14, PAS:.14, PDEF:.10, IDEF:.04, BLK:.02, REB:.04, ATH:.08, STR:.04, CLU:.08 },
  SG: { threePT:.12, MID:.12, FIN:.10, DNK:.06, HAN:.10, PAS:.08, PDEF:.10, IDEF:.04, BLK:.02, REB:.04, ATH:.08, STR:.04, CLU:.10 },
  SF: { threePT:.10, MID:.10, FIN:.10, DNK:.08, HAN:.08, PAS:.06, PDEF:.10, IDEF:.08, BLK:.04, REB:.06, ATH:.08, STR:.06, CLU:.06 },
  PF: { threePT:.08, MID:.06, FIN:.12, DNK:.06, HAN:.06, PAS:.04, PDEF:.10, IDEF:.12, BLK:.08, REB:.10, ATH:.06, STR:.08, CLU:.04 },
  C:  { threePT:.04, MID:.04, FIN:.14, DNK:.06, HAN:.04, PAS:.04, PDEF:.08, IDEF:.14, BLK:.12, REB:.12, ATH:.04, STR:.10, CLU:.04 },
};

// Current roster names that differ from Basketball Reference's 2025-26 display names.
const NAME_ALIASES = {
  egordemin: 'egordmin',
  trevonscott: 'trescott',
  xaviertillman: 'xaviertillmansr',
  daronholmesii: 'daronholmes',
  ronaldhollandii: 'ronholland',
  ggjackson: 'ggjacksonii',
  walterclaytonjr: 'walterclayton',
  adamabal: 'adamaalphabal',
  treyjemisoniii: 'treyjemison',
  robertwilliamsiii: 'robertwilliams',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeName = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

function loadRoster() {
  const sandbox = {};
  vm.createContext(sandbox);
  const source = fs.readFileSync(ROSTER_PATH, 'utf8') + '\n;globalThis.__NBA2K_DATA = NBA2K_DATA;';
  vm.runInContext(source, sandbox, { filename: ROSTER_PATH });
  return sandbox.__NBA2K_DATA;
}

function loadRows(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).rows.filter(row => row.player_id);
}

function selectSeasonRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.player_id)) groups.set(row.player_id, []);
    groups.get(row.player_id).push(row);
  }
  const selected = new Map();
  for (const [playerId, playerRows] of groups) {
    const total = playerRows.find(row => /^\d+TM$/.test(row.team_name_abbr || ''));
    selected.set(playerId, total || playerRows.slice().sort((a, b) => number(b.games) - number(a.games))[0]);
  }
  return selected;
}

function bayesianPct(pct, attempts, leaguePct, priorAttempts) {
  const safeAttempts = Math.max(0, attempts);
  const safePct = Number.isFinite(pct) ? pct : leaguePct;
  return (safePct * safeAttempts + leaguePct * priorAttempts) / (safeAttempts + priorAttempts);
}

function positionKey(pos) {
  const primary = String(pos || 'SF').split('/')[0].trim();
  return OVR_WEIGHTS[primary] ? primary : 'SF';
}

function calcOvr(attrs, pos) {
  const weights = OVR_WEIGHTS[positionKey(pos)];
  return ATTR_KEYS.reduce((sum, key) => sum + number(attrs[key], 50) * weights[key], 0);
}

function percentile(value, sorted) {
  if (!sorted.length) return 0.5;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  let upper = lo;
  while (upper < sorted.length && sorted[upper] === value) upper++;
  return clamp((lo + upper - 1) / 2 / Math.max(1, sorted.length - 1), 0, 1);
}

function skillRating(rank, floor = 30) {
  return clamp(Math.round(floor + (99 - floor) * Math.pow(rank, 0.63)), 25, 99);
}

function impactOvr(rank) {
  if (rank <= 0.10) return 67 + 3 * rank / 0.10;
  if (rank <= 0.50) return 70 + 7 * (rank - 0.10) / 0.40;
  if (rank <= 0.90) return 77 + 9 * (rank - 0.50) / 0.40;
  if (rank <= 0.98) return 86 + 9 * (rank - 0.90) / 0.08;
  return 95 + 4 * (rank - 0.98) / 0.02;
}

function makeFeatureRecord(entry) {
  const { player, per, adv, shot } = entry;
  const games = Math.max(1, number(per.games));
  const mpg = Math.max(1, number(per.mp_per_g));
  const minutes = Math.max(number(adv.mp), games * mpg);
  const per36 = value => number(value) * 36 / mpg;
  const fgaTotal = number(per.fga_per_g) * games;
  const threeAtt = number(per.fg3a_per_g) * games;
  const threePct = bayesianPct(number(per.fg3_pct, 0.360), threeAtt, 0.360, 75);
  const threeA36 = per36(per.fg3a_per_g);

  const rimShare = number(shot.pct_fga_00_03);
  const closeShare = number(shot.pct_fga_03_10);
  const mid1Share = number(shot.pct_fga_10_16);
  const mid2Share = number(shot.pct_fga_16_xx);
  const rimAttempts = fgaTotal * rimShare;
  const closeAttempts = fgaTotal * closeShare;
  const mid1Attempts = fgaTotal * mid1Share;
  const mid2Attempts = fgaTotal * mid2Share;
  const finAttempts = rimAttempts + closeAttempts;
  const midAttempts = mid1Attempts + mid2Attempts;
  const finPctRaw = finAttempts > 0
    ? (number(shot.fg_pct_00_03, 0.66) * rimAttempts + number(shot.fg_pct_03_10, 0.47) * closeAttempts) / finAttempts
    : 0.60;
  const midPctRaw = midAttempts > 0
    ? (number(shot.fg_pct_10_16, 0.42) * mid1Attempts + number(shot.fg_pct_16_xx, 0.41) * mid2Attempts) / midAttempts
    : 0.42;
  const finPct = bayesianPct(finPctRaw, finAttempts, 0.60, 100);
  const midPct = bayesianPct(midPctRaw, midAttempts, 0.42, 70);
  const finA36 = finAttempts * 36 / minutes;
  const midA36 = midAttempts * 36 / minutes;
  const dunkMade = number(shot.fg_dunk);
  const dunkShare = number(shot.pct_fga_dunk);
  const dunkPer36 = dunkMade * 36 / minutes;

  const ast36 = per36(per.ast_per_g);
  const reb36 = per36(per.trb_per_g);
  const blk36 = per36(per.blk_per_g);
  const astTo = number(per.ast_per_g) / Math.max(0.5, number(per.tov_per_g));
  const astPct = number(adv.ast_pct);
  const stlPct = number(adv.stl_pct);
  const blkPct = number(adv.blk_pct);
  const orbPct = number(adv.orb_pct);
  const drbPct = number(adv.drb_pct);
  const trbPct = number(adv.trb_pct);
  const tovPct = number(adv.tov_pct, 14);
  const usage = number(adv.usg_pct, 18);
  const bpm = number(adv.bpm);
  const obpm = number(adv.obpm);
  const dbpm = number(adv.dbpm);
  const perValue = number(adv.per, 10);
  const ws48 = number(adv.ws_per_48);
  const dwsPer1000 = number(adv.dws) * 1000 / minutes;
  const tsPct = number(adv.ts_pct, 0.55);
  const ftPct = number(per.ft_pct, 0.75);
  const ftr = number(adv.fta_per_fga_pct, number(per.fta_per_g) / Math.max(1, number(per.fga_per_g)));
  const assisted2 = number(shot.pct_ast_fg2, 0.65);
  const assisted3 = number(shot.pct_ast_fg3, 0.90);
  const threeShare = number(shot.pct_fga_fg3a, number(per.fg3a_per_g) / Math.max(1, number(per.fga_per_g)));
  const selfCreation = 1 - clamp(assisted2 * (1 - threeShare) + assisted3 * threeShare, 0, 1);
  const age = number(per.age, 26);
  const awards = String(per.awards || adv.awards || '');
  const clutchBonus = /CPOY-1(?:,|$)/.test(awards) ? 1.4 : /CPOY-[2-5](?:,|$)/.test(awards) ? 0.8 : /CPOY-/.test(awards) ? 0.35 : 0;
  const awardImpact =
    (/NBA1(?:,|$)/.test(awards) ? 3.0 : /NBA2(?:,|$)/.test(awards) ? 2.2 : /NBA3(?:,|$)/.test(awards) ? 1.4 : 0) +
    (/MVP-1(?:,|$)/.test(awards) ? 3.0 : /MVP-[2-5](?:,|$)/.test(awards) ? 2.0 : /MVP-/.test(awards) ? 0.8 : 0) +
    (/DPOY-1(?:,|$)/.test(awards) ? 2.0 : /DPOY-[2-5](?:,|$)/.test(awards) ? 1.2 : /DPOY-/.test(awards) ? 0.4 : 0) +
    (/DEF1(?:,|$)/.test(awards) ? 0.8 : /DEF2(?:,|$)/.test(awards) ? 0.5 : 0) +
    (/(?:^|,)AS(?:,|$)/.test(awards) ? 0.3 : 0);
  const priorStrength = number(player.STR, 55);

  const metrics = {
    threePT: (threePct - 0.360) / 0.035 + (threeA36 - 4) * 0.18,
    MID: (midPct - 0.420) / 0.045 + (midA36 - 2) * 0.16,
    FIN: (finPct - 0.600) / 0.055 + (finA36 - 6) * 0.12 + (ftr - 0.25) * 1.2,
    DNK: Math.log1p(dunkPer36 * 3) + dunkShare * 4,
    HAN: -(tovPct - 13) * 0.12 + (usage - 20) * 0.035 + (astPct - 18) * 0.025 + selfCreation * 1.2 + obpm * 0.08,
    PAS: astPct * 0.07 + ast36 * 0.16 + Math.log1p(astTo) * 0.34 - tovPct * 0.015,
    PDEF: stlPct * 0.80 + dbpm * 0.22 + dwsPer1000 * 0.15,
    IDEF: blkPct * 0.55 + drbPct * 0.06 + dbpm * 0.25 + dwsPer1000 * 0.12,
    BLK: blkPct * 0.75 + blk36 * 0.45,
    REB: trbPct * 0.10 + reb36 * 0.22,
    ATH: Math.log1p(dunkPer36 * 3) * 0.50 + stlPct * 0.24 + orbPct * 0.08 + mpg * 0.025 - Math.max(0, age - 29) * 0.025,
    STR: orbPct * 0.055 + drbPct * 0.030 + ftr * 1.20 + finA36 * 0.08 + priorStrength * 0.015,
    CLU: bpm * 0.25 + (ftPct - 0.78) * 2 + usage * 0.04 + ws48 * 3 + clutchBonus,
  };
  // Impact deliberately combines rate production with workload and honors. This stops
  // low-minute efficiency specialists from being rated above primary creators.
  const impact = bpm * 0.30 + (perValue - 15) * 0.07 + (ws48 - 0.10) * 10 +
    (number(per.pts_per_g) - 12) * 0.12 + (number(per.ast_per_g) - 3) * 0.10 +
    (number(per.trb_per_g) - 5) * 0.04 + (mpg - 24) * 0.22 + (usage - 20) * 0.10 +
    awardImpact;
  return {
    ...entry,
    games,
    mpg,
    minutes,
    reliability: clamp(minutes / 1600, 0.08, 1),
    threeAtt,
    midAttempts,
    finAttempts,
    dunkMade,
    metrics,
    impact,
  };
}

const roster = loadRoster();
const perRows = selectSeasonRows(loadRows(PER_GAME_PATH));
const advancedRows = selectSeasonRows(loadRows(ADVANCED_PATH));
const shootingRows = selectSeasonRows(loadRows(SHOOTING_PATH));
const byName = new Map();
for (const per of perRows.values()) {
  byName.set(normalizeName(per.name_display), {
    per,
    adv: advancedRows.get(per.player_id) || {},
    shot: shootingRows.get(per.player_id) || {},
  });
}

const entries = [];
let directMatches = 0;
let aliasMatches = 0;
for (const [team, players] of Object.entries(roster)) {
  for (const player of players) {
    const directKey = normalizeName(player.name);
    const lookupKey = NAME_ALIASES[directKey] || directKey;
    const stats = byName.get(lookupKey);
    if (stats) {
      if (lookupKey === directKey) directMatches++;
      else aliasMatches++;
    }
    entries.push({ team, player, ...(stats || { per: null, adv: {}, shot: {} }) });
  }
}

const featured = entries.filter(entry => entry.per).map(makeFeatureRecord);
const featureByKey = new Map(featured.map(entry => [`${entry.team}|${entry.player.name}`, entry]));
const distributions = {};
for (const attr of ATTR_KEYS) {
  distributions[attr] = featured
    .filter(entry => entry.minutes >= 400)
    .map(entry => entry.metrics[attr])
    .sort((a, b) => a - b);
}
const impactDistribution = featured
  .filter(entry => entry.minutes >= 400)
  .map(entry => entry.impact)
  .sort((a, b) => a - b);

const ratings = {};
const samples = {};
const missing = [];
for (const entry of entries) {
  const key = `${entry.team}|${entry.player.name}`;
  const feature = featureByKey.get(key);
  const prior = Object.fromEntries(ATTR_KEYS.map(attr => [attr, number(entry.player[attr], 50)]));
  if (!feature) {
    ratings[key] = { ovr: number(entry.player.ovr, Math.round(calcOvr(prior, entry.player.pos))), ...prior };
    samples[key] = { games: 0, minutes: 0, basis: 'no-2025-26-games' };
    missing.push(key);
    continue;
  }

  const rel = feature.reliability;
  const statWeight = 0.24 + 0.62 * rel;
  const weights = {
    threePT: clamp(0.12 + 0.76 * Math.sqrt(Math.min(1, feature.threeAtt / 300)) * (0.55 + 0.45 * rel), 0.12, 0.90),
    MID: clamp(0.12 + 0.72 * Math.sqrt(Math.min(1, feature.midAttempts / 180)) * (0.55 + 0.45 * rel), 0.12, 0.86),
    FIN: clamp(0.18 + 0.70 * Math.sqrt(Math.min(1, feature.finAttempts / 300)) * (0.55 + 0.45 * rel), 0.18, 0.90),
    DNK: clamp(0.14 + 0.68 * Math.sqrt(Math.min(1, feature.dunkMade / 70)) * (0.55 + 0.45 * rel), 0.14, 0.84),
    HAN: statWeight,
    PAS: statWeight,
    PDEF: 0.20 + 0.48 * rel,
    IDEF: 0.20 + 0.48 * rel,
    BLK: 0.22 + 0.62 * rel,
    REB: 0.22 + 0.64 * rel,
    ATH: 0.14 + 0.36 * rel,
    STR: 0.14 + 0.36 * rel,
    CLU: 0.14 + 0.40 * rel,
  };
  const floors = { threePT:30, MID:30, FIN:32, DNK:25, HAN:35, PAS:30, PDEF:30, IDEF:25, BLK:25, REB:28, ATH:35, STR:35, CLU:38 };
  const maxDelta = { threePT:12, MID:12, FIN:14, DNK:10, HAN:10, PAS:10, PDEF:10, IDEF:10, BLK:12, REB:10, ATH:10, STR:10, CLU:10 };
  const attrs = {};
  for (const attr of ATTR_KEYS) {
    const evidence = skillRating(percentile(feature.metrics[attr], distributions[attr]), floors[attr]);
    const blended = Math.round(prior[attr] * (1 - weights[attr]) + evidence * weights[attr]);
    attrs[attr] = clamp(blended, Math.max(25, prior[attr] - maxDelta[attr]), Math.min(99, prior[attr] + maxDelta[attr]));
  }
  const attrOvr = calcOvr(attrs, entry.player.pos);
  const seasonOvr = impactOvr(percentile(feature.impact, impactDistribution));
  const modeledOvr = attrOvr * 0.30 + seasonOvr * 0.70;
  const ovrWeight = 0.28 + 0.50 * rel;
  let ovr = clamp(Math.round(number(entry.player.ovr, attrOvr) * (1 - ovrWeight) + modeledOvr * ovrWeight), 65, 99);
  const awards = String(feature.per.awards || feature.adv.awards || '');
  if (/MVP-1(?:,|$)/.test(awards)) ovr = Math.max(ovr, 98);
  else if (/MVP-2(?:,|$)/.test(awards)) ovr = Math.max(ovr, 97);
  else if (/MVP-[3-4](?:,|$)/.test(awards)) ovr = Math.max(ovr, 96);
  else if (/MVP-5(?:,|$)/.test(awards)) ovr = Math.max(ovr, 95);
  if (/NBA1(?:,|$)/.test(awards)) ovr = Math.max(ovr, 94);
  if (/DPOY-1(?:,|$)/.test(awards)) ovr = Math.max(ovr, 95);
  ratings[key] = { ovr, ...attrs };
  samples[key] = { games: feature.games, minutes: Math.round(feature.minutes), basis: feature.minutes >= 400 ? '2025-26-season' : '2025-26-small-sample' };
}

const meta = {
  season: '2025-26',
  seasonType: 'Regular Season',
  generated: '2026-08-12',
  players: entries.length,
  directMatches,
  aliasMatches,
  seasonMatches: featured.length,
  noSeasonGames: missing.length,
  noSeasonGamePlayers: missing,
  leagueBaseline: { pointsPerGame: 115.6, pace: 99.4, offensiveRating: 115.7, threePointPct: 0.360, effectiveFgPct: 0.546 },
  sources: [
    'https://www.basketball-reference.com/leagues/NBA_2026_per_game.html',
    'https://www.basketball-reference.com/leagues/NBA_2026_advanced.html',
    'https://www.basketball-reference.com/leagues/NBA_2026_shooting.html',
    'https://www.basketball-reference.com/leagues/NBA_stats_per_game.html',
  ],
};

const output = `/* Auto-generated by tools/update_current_player_ratings_2026.mjs. */\n` +
  `const NBA_CURRENT_RATINGS_2026_META = ${JSON.stringify(meta, null, 2)};\n` +
  `const NBA_CURRENT_RATINGS_2026 = ${JSON.stringify(ratings)};\n` +
  `const NBA_CURRENT_RATINGS_2026_SAMPLES = ${JSON.stringify(samples)};\n` +
  `(function applyCurrentPlayerRatings2026() {\n` +
  `  if (typeof NBA2K_DATA === 'undefined') return;\n` +
  `  Object.keys(NBA2K_DATA).forEach(function(team) {\n` +
  `    (NBA2K_DATA[team] || []).forEach(function(player) {\n` +
  `      var key = team + '|' + player.name;\n` +
  `      var rating = NBA_CURRENT_RATINGS_2026[key];\n` +
  `      if (!rating) return;\n` +
  `      Object.keys(rating).forEach(function(attr) { player[attr] = rating[attr]; });\n` +
  `      var sample = NBA_CURRENT_RATINGS_2026_SAMPLES[key] || {};\n` +
  `      player.ratingSeason = NBA_CURRENT_RATINGS_2026_META.season;\n` +
  `      player.ratingBasis = sample.basis || '2025-26-season';\n` +
  `      player.ratingSampleGames = sample.games || 0;\n` +
  `      player.ratingSampleMinutes = sample.minutes || 0;\n` +
  `    });\n` +
  `  });\n` +
  `  if (typeof window !== 'undefined') window.NBA_CURRENT_RATINGS_2026_META = NBA_CURRENT_RATINGS_2026_META;\n` +
  `})();\n`;

fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT_PATH), ...meta }, null, 2));
