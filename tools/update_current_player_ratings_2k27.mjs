import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TOOL_DIR);
const ROSTER_PATH = path.join(ROOT, 'assets/js/hupu/script-01-2678-5hu3djrc-upload-1783494754597-12.js');
const OUTPUT_PATH = path.join(ROOT, 'assets/js/current-player-ratings-2026.js');
const API_BASE_URL = 'https://api.nba2kapi.com/api/public/players?teamType=curr&limit=100';
const TEAM_NAME_BY_ABBR = {
  ATL: 'Atlanta Hawks',
  BKN: 'Brooklyn Nets',
  BOS: 'Boston Celtics',
  CHA: 'Charlotte Hornets',
  CHI: 'Chicago Bulls',
  CLE: 'Cleveland Cavaliers',
  DAL: 'Dallas Mavericks',
  DEN: 'Denver Nuggets',
  DET: 'Detroit Pistons',
  GSW: 'Golden State Warriors',
  HOU: 'Houston Rockets',
  IND: 'Indiana Pacers',
  LAC: 'Los Angeles Clippers',
  LAL: 'Los Angeles Lakers',
  MEM: 'Memphis Grizzlies',
  MIA: 'Miami Heat',
  MIL: 'Milwaukee Bucks',
  MIN: 'Minnesota Timberwolves',
  NOP: 'New Orleans Pelicans',
  NYK: 'New York Knicks',
  OKC: 'Oklahoma City Thunder',
  ORL: 'Orlando Magic',
  PHI: 'Philadelphia 76ers',
  PHX: 'Phoenix Suns',
  POR: 'Portland Trail Blazers',
  SAC: 'Sacramento Kings',
  SAS: 'San Antonio Spurs',
  TOR: 'Toronto Raptors',
  UTA: 'Utah Jazz',
  WAS: 'Washington Wizards',
};

const ATTR_KEYS = ['threePT', 'MID', 'FIN', 'DNK', 'HAN', 'PAS', 'PDEF', 'IDEF', 'BLK', 'REB', 'ATH', 'STR', 'CLU'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback = 50) => {
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

function map2k27Attributes(player) {
  const attrs = player?.attributes || {};
  const avg = values => Math.round(values.reduce((sum, v) => sum + number(v), 0) / values.length);
  const data = {
    ovr: clamp(Math.round(number(player?.overall, 70)), 25, 99),
    threePT: clamp(Math.round(number(attrs.threePointShot)), 25, 99),
    MID: clamp(Math.round(number(attrs.midRangeShot)), 25, 99),
    FIN: clamp(avg([attrs.closeShot, attrs.drivingLayup]), 25, 99),
    DNK: clamp(Math.round(number(attrs.drivingDunk)), 25, 99),
    HAN: clamp(Math.round(number(attrs.ballHandle)), 25, 99),
    PAS: clamp(avg([attrs.passAccuracy, attrs.passIQ, attrs.passVision]), 25, 99),
    PDEF: clamp(Math.round(number(attrs.perimeterDefense)), 25, 99),
    IDEF: clamp(Math.round(number(attrs.interiorDefense)), 25, 99),
    BLK: clamp(Math.round(number(attrs.block)), 25, 99),
    REB: clamp(avg([attrs.offensiveRebound, attrs.defensiveRebound]), 25, 99),
    ATH: clamp(avg([attrs.speed, attrs.agility, attrs.vertical]), 25, 99),
    STR: clamp(Math.round(number(attrs.strength)), 25, 99),
    CLU: clamp(avg([attrs.offensiveConsistency, attrs.defensiveConsistency, attrs.shotIQ]), 25, 99),
  };
  return data;
}

async function fetchCurrentPlayersFrom2k27() {
  const all = [];
  const seen = new Set();
  for (const teamName of Object.values(TEAM_NAME_BY_ABBR)) {
    const url = `${API_BASE_URL}&team=${encodeURIComponent(teamName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch 2K27 team ${teamName}: ${res.status}`);
    const json = await res.json();
    const players = Array.isArray(json?.data) ? json.data : [];
    for (const p of players) {
      const key = `${p.team}|${normalizeName(p.name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(p);
    }
  }
  return all;
}

async function main() {
  const roster = loadRoster();
  const players = await fetchCurrentPlayersFrom2k27();
  if (!players.length) throw new Error('2K27 source returned no players.');

  const apiByName = new Map();
  for (const player of players) {
    const key = normalizeName(player.name);
    if (!apiByName.has(key)) apiByName.set(key, []);
    apiByName.get(key).push(player);
  }

  const ratings = {};
  const samples = {};
  let directTeamMatches = 0;
  let uniqueNameMatches = 0;
  const unresolved = [];

  for (const [abbr, teamPlayers] of Object.entries(roster)) {
    const expectedTeamName = TEAM_NAME_BY_ABBR[abbr];
    for (const p of teamPlayers || []) {
      const key = `${abbr}|${p.name}`;
      const candidates = apiByName.get(normalizeName(p.name)) || [];

      let matched = null;
      if (expectedTeamName) {
        matched = candidates.find(c => c.team === expectedTeamName) || null;
      }
      if (!matched && candidates.length === 1) {
        matched = candidates[0];
        uniqueNameMatches++;
      }
      if (!matched && candidates.length > 1) {
        matched = candidates.slice().sort((a, b) => number(b.overall, 0) - number(a.overall, 0))[0];
      }

      if (matched) {
        ratings[key] = map2k27Attributes(matched);
        samples[key] = { games: 0, minutes: 0, basis: 'nba2k27-api', sourceTeam: matched.team || '' };
        if (expectedTeamName && matched.team === expectedTeamName) directTeamMatches++;
      } else {
        ratings[key] = { ovr: number(p.ovr, 70), ...Object.fromEntries(ATTR_KEYS.map(attr => [attr, number(p[attr], 50)])) };
        samples[key] = { games: 0, minutes: 0, basis: 'no-2k27-match' };
        unresolved.push(key);
      }
    }
  }

  const meta = {
    season: 'NBA 2K27',
    seasonType: 'Current Rosters',
    generated: new Date().toISOString().slice(0, 10),
    players: Object.keys(ratings).length,
    apiPlayers: players.length,
    directTeamMatches,
    uniqueNameMatches,
    unresolvedCount: unresolved.length,
    unresolvedPlayers: unresolved,
    sources: [API_BASE_URL, 'https://nba2kapi.com'],
  };

  const output = `/* Auto-generated by tools/update_current_player_ratings_2k27.mjs. */\n` +
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
    `      player.ratingBasis = sample.basis || 'nba2k27-api';\n` +
    `      player.ratingSampleGames = sample.games || 0;\n` +
    `      player.ratingSampleMinutes = sample.minutes || 0;\n` +
    `    });\n` +
    `  });\n` +
    `  if (typeof window !== 'undefined') window.NBA_CURRENT_RATINGS_2026_META = NBA_CURRENT_RATINGS_2026_META;\n` +
    `})();\n`;

  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT_PATH), ...meta }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
