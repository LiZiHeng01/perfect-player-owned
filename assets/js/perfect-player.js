/* ============================================================
 * 完美球员 (Build-A-Player) — 模式主逻辑
 * ------------------------------------------------------------
 * 玩法框架：虎扑《我创造的完美球员》（随机年份→球队→球员→锁属性→单赛季）
 * 数据层：  本项目的 历史球员库 + 比赛模拟引擎（sim.js / core.js）
 * 增强：    随机事件系统、媒体压力/热度/球迷支持等数值 UI 明确化、历史球员头像
 * ============================================================ */
(function () {
  'use strict';

  /* ==================== 配置（玩法沿用 BuildPlayer 数值体系） ==================== */
  const ATTR_KEYS = ['threePT', 'MID', 'FIN', 'DNK', 'HAN', 'PAS', 'PDEF', 'IDEF', 'BLK', 'REB', 'ATH', 'STR', 'CLU'];
  const ATTR_CN = {
    threePT: '三分', MID: '中投', FIN: '终结', DNK: '扣篮', HAN: '手感', PAS: '传球',
    PDEF: '外防', IDEF: '内防', BLK: '盖帽', REB: '篮板', ATH: '运动', STR: '力量', CLU: '关键'
  };
  const ATTR_DESC = {
    threePT: '三分投篮能力', MID: '中距离投篮能力', FIN: '篮下终结能力', DNK: '扣篮能力',
    HAN: '控球与接球手感', PAS: '传球精准度', PDEF: '外线防守能力', IDEF: '内线防守能力',
    BLK: '盖帽能力', REB: '篮板能力', ATH: '运动能力（速度/敏捷）', STR: '力量对抗能力', CLU: '关键球能力'
  };
  const POSITIONS = { PG: '控球后卫', SG: '得分后卫', SF: '小前锋', PF: '大前锋', C: '中锋' };
  const POS_LIST = ['PG', 'SG', 'SF', 'PF', 'C'];
  const POS_ID = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 };
  const ID_POS = { 1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C' };

  // 各位置属性均值（跨位置衰减用）
  const POS_AVG = {
    PG: { threePT: 79.2, MID: 79.5, FIN: 82.5, DNK: 57.9, HAN: 85.2, PAS: 79.4, PDEF: 69.5, IDEF: 42.0, BLK: 44.6, REB: 52.2, ATH: 82.1, STR: 50.7, CLU: 73.6 },
    SG: { threePT: 79.8, MID: 77.2, FIN: 82.5, DNK: 71.3, HAN: 83.0, PAS: 71.7, PDEF: 69.6, IDEF: 48.3, BLK: 45.5, REB: 51.9, ATH: 79.6, STR: 53.7, CLU: 70.5 },
    SF: { threePT: 78.4, MID: 75.6, FIN: 82.5, DNK: 73.5, HAN: 82.8, PAS: 65.2, PDEF: 71.1, IDEF: 58.7, BLK: 50.5, REB: 57.3, ATH: 77.3, STR: 58.2, CLU: 62.5 },
    PF: { threePT: 76.2, MID: 71.4, FIN: 83.4, DNK: 75.8, HAN: 83.4, PAS: 62.4, PDEF: 67.6, IDEF: 68.1, BLK: 59.7, REB: 66.4, ATH: 73.7, STR: 66.4, CLU: 71.1 },
    C:  { threePT: 62.4, MID: 70.7, FIN: 86.4, DNK: 73.2, HAN: 80.3, PAS: 53.0, PDEF: 50.8, IDEF: 72.8, BLK: 72.7, REB: 77.0, ATH: 59.4, STR: 74.7, CLU: 64.9 }
  };

  // OVR 位置权重
  const OVR_WEIGHTS = {
    PG: { threePT: 0.10, MID: 0.10, FIN: 0.08, DNK: 0.04, HAN: 0.14, PAS: 0.14, PDEF: 0.10, IDEF: 0.04, BLK: 0.02, REB: 0.04, ATH: 0.08, STR: 0.04, CLU: 0.08 },
    SG: { threePT: 0.12, MID: 0.12, FIN: 0.10, DNK: 0.06, HAN: 0.10, PAS: 0.08, PDEF: 0.10, IDEF: 0.04, BLK: 0.02, REB: 0.04, ATH: 0.08, STR: 0.04, CLU: 0.10 },
    SF: { threePT: 0.10, MID: 0.10, FIN: 0.10, DNK: 0.08, HAN: 0.08, PAS: 0.06, PDEF: 0.10, IDEF: 0.08, BLK: 0.04, REB: 0.06, ATH: 0.08, STR: 0.06, CLU: 0.06 },
    PF: { threePT: 0.08, MID: 0.06, FIN: 0.12, DNK: 0.06, HAN: 0.06, PAS: 0.04, PDEF: 0.10, IDEF: 0.12, BLK: 0.08, REB: 0.10, ATH: 0.06, STR: 0.08, CLU: 0.04 },
    C:  { threePT: 0.04, MID: 0.04, FIN: 0.14, DNK: 0.06, HAN: 0.04, PAS: 0.04, PDEF: 0.08, IDEF: 0.14, BLK: 0.12, REB: 0.12, ATH: 0.04, STR: 0.10, CLU: 0.04 }
  };

  function getGrade(val) {
    if (val >= 95) return { letter: 'A+', color: '#ff6b6b' };
    if (val >= 90) return { letter: 'A', color: '#ff8787' };
    if (val >= 85) return { letter: 'A-', color: '#ffa07a' };
    if (val >= 80) return { letter: 'B+', color: '#ffd43b' };
    if (val >= 75) return { letter: 'B', color: '#ffd43b' };
    if (val >= 70) return { letter: 'B-', color: '#ffd43b' };
    if (val >= 65) return { letter: 'C+', color: '#69db7c' };
    if (val >= 60) return { letter: 'C', color: '#69db7c' };
    if (val >= 55) return { letter: 'C-', color: '#69db7c' };
    if (val >= 50) return { letter: 'D+', color: '#74c0fc' };
    if (val >= 45) return { letter: 'D', color: '#74c0fc' };
    if (val >= 40) return { letter: 'D-', color: '#74c0fc' };
    return { letter: 'F', color: '#868e96' };
  }

  function getOvrGrade(ovr) {
    if (ovr >= 95) return '超级巨星';
    if (ovr >= 85) return '全明星';
    if (ovr >= 75) return '首发';
    if (ovr >= 65) return '轮换';
    return '边缘';
  }

  // 13 项 → 项目 10 项属性（比赛引擎使用）
  function thirteenToProject(attrs13) {
    const a = (k, def) => Math.round(parseNum(attrs13[k], def));
    return {
      pass: a('PAS', 55),
      shotInt: a('MID', 55),
      shotExt: a('threePT', 55),
      shotFree: a('FTS', Math.round((a('threePT', 55) + a('MID', 55) + a('FIN', 55)) / 3)),
      physique: a('PHY', Math.round((a('ATH', 55) + a('STR', 55)) / 2)),
      blk: a('BLK', 55),
      reb: a('REB', 55),
      stl: a('STL', Math.round((a('PDEF', 55) + a('CLU', 55)) / 2)),
      speed: a('ATH', 55),
      strength: a('STR', 55)
    };
  }

  // 项目 10 项 → 13 项（从历史球员身上提取属性时使用）
  function projectToThirteen(p) {
    const n = (v, def) => parseNum(v, def);
    const round = v => Math.max(25, Math.min(99, Math.round(v)));
    return {
      threePT: round(n(p.shotExt, 55)),
      MID: round(n(p.shotInt, 55)),
      FIN: round((n(p.shotInt, 55) + n(p.physique, 55)) / 2),
      DNK: round((n(p.physique, 55) + n(p.speed, 55)) / 2),
      HAN: round((n(p.pass, 55) + n(p.speed, 55)) / 2),
      PAS: round(n(p.pass, 55)),
      PDEF: round((n(p.stl, 55) + n(p.speed, 55)) / 2),
      IDEF: round((n(p.blk, 55) + n(p.strength, n(p.physique, 55))) / 2),
      BLK: round(n(p.blk, 55)),
      REB: round(n(p.reb, 55)),
      ATH: round((n(p.speed, 55) + n(p.physique, 55)) / 2),
      STR: round(n(p.strength, n(p.physique, 55))),
      CLU: round((n(p.shotExt, 55) + n(p.shotInt, 55) + n(p.pass, 55)) / 3)
    };
  }

  function calcOVR(attrs13, pos) {
    const w = OVR_WEIGHTS[pos] || OVR_WEIGHTS.SF;
    let sum = 0;
    ATTR_KEYS.forEach(k => { sum += parseNum(attrs13[k], 55) * (w[k] || 0.07); });
    return Math.round(sum);
  }

  // 模板风格（Archetype）：按属性相对位置均值的突出程度命名
  function matchArchetype(attrs13, pos) {
    const avg = POS_AVG[pos] || POS_AVG.SF;
    const diff = ATTR_KEYS.map(k => ({ key: k, d: parseNum(attrs13[k], 55) - avg[k] })).sort((a, b) => b.d - a.d);
    const top = diff.slice(0, 3).map(x => x.key);
    const set = key => top.includes(key);
    if (set('PAS') && set('HAN') && set('CLU')) return 'Playmaking 组织大师';
    if (set('threePT') && set('MID')) return 'Iso Sniper 单打神射';
    if (set('threePT') && set('FIN')) return 'Three-Level 三威胁得分手';
    if (set('FIN') && set('DNK') && set('ATH')) return 'Slashing Finisher 突破终结者';
    if (set('PDEF') && set('ATH')) return 'Perimeter Lockdown 外线大锁';
    if (set('IDEF') && set('BLK')) return 'Rim Protector 护框大神';
    if (set('REB') && set('STR')) return 'Glass Cleaner 篮板怪兽';
    if (set('MID') && set('CLU')) return 'Mid-Range Maestro 中投大师';
    if (set('STR') && set('FIN') && set('IDEF')) return 'Post Power 内线巨兽';
    if (set('ATH') && set('DNK')) return 'Athletic Freak 运动怪胎';
    if (set('CLU') && set('HAN')) return 'Clutch Killer 关键杀手';
    return 'Balanced Star 全能新星';
  }

  /* ==================== 年代（对应本项目 roster 名单） ==================== */
  const ERAS = [
    { year: 2025, label: '2025-26', sub: '现役联盟' },
    { year: 2016, label: '2015-16', sub: '库昊时代' },
    { year: 2009, label: '2008-09', sub: '群星闪耀' },
    { year: 2003, label: '2002-03', sub: '黄金一代' },
    { year: 1996, label: '1995-96', sub: '96黄金一代' },
    { year: 1984, label: '1983-84', sub: '黑白双雄' }
  ];
  const SINGLE_SEASON = { year: 2025, label: '虎扑单赛季 · 2025-26' };
  const ATTRIBUTE_POOL_URL = 'assets/data/perfect-player-pool.json?v=20260809-static-peak-table';

  // 18 张透明真人风格主角头像：亚洲、白人、黑人各 6 张。
  const AI_AVATAR_META = Array.from({ length: 18 }, (_, index) => ({
    src: `assets/images/Player/ai-avatars/avatar-${String(index + 1).padStart(2, '0')}.png`,
    group: index < 6 ? '亚洲' : (index < 12 ? '白人' : '黑人'),
    role: ['后卫','锋线','内线'][index % 3],
    tone: ['冷静控场','精准投射','强硬对抗','爆发攻框','沉着终结','禁区护框'][index % 6]
  }));
  const AI_AVATARS = AI_AVATAR_META.map(item => item.src);
  const RANDOM_NAMES = ['林一飞', '陈慕白', '苏星河', '陆星辰', '赵子龙', '王一鸣', '周天宇', '吴昊', '郑凯文', '唐纳德·杨', 'Alex Wang', 'Leo Chen'];

  /* ==================== 全局状态 ==================== */
  const PP = {
    screen: 'menu',
    era: 2025,
    position: null,
    playerName: '',
    avatar: '',
    build: {
      team: null,
      roster: [],
      rerollsLeft: 3,
      swapsLeft: 3,
      selectedPlayer: null,
      lockedAttrs: {},
      lockCount: 0,
      usedPlayers: new Set(),
      showTeam: null,
      sourceRoll: null,
      sourceHistory: []
    },
    attributePool: null,
    career: null,
    season: null,
    leagueReady: false,
    busy: false,
    _origBuildRotation: null,
    _recordsSnapshot: null,
    _playerStatsSnapshot: null,
    _injured: false,
    pendingAction: null
  };
  const SAVE_KEY = 'perfectPlayerSaveV1';

  /* ==================== 工具 ==================== */
  function $(id) { return document.getElementById(id); }
  function parseNum(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rng(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function formatSalaryM(n) {
    const v = parseNum(n, 0);
    return v >= 1 ? v.toFixed(1) + 'M' : Math.round(v * 1000) + 'K';
  }

  function teamMeta(id) {
    const t = LEAGUE && LEAGUE.loaded && LEAGUE.teams ? LEAGUE.teams[id] : null;
    if (t && t.meta) return t.meta;
    const core = (typeof TEAMS !== 'undefined' && TEAMS) ? TEAMS.find(x => parseNum(x.id, 0) === parseNum(id, 0)) : null;
    return core || { id: parseNum(id, 0), n: '--', z: '未知', a: '--', c: 'East', cl: '#555', r: 70 };
  }

  function teamLogoHtml(meta, size) {
    const s = size || 40;
    const bg = meta.cl || '#556';
    return `<span class="tp-logo" style="width:${s}px;height:${s}px;background:${bg};">${esc(meta.a || meta.n || '?')}</span>`;
  }

  /* ==================== 头像：本地优先 → 线上 NBA.com → 项目图片 → 首字母 ==================== */
  function resolveAvatar(player) {
    if (!player) return '';
    const avatar = typeof player.avatar === 'string' ? player.avatar.trim() : '';
    if (avatar && (avatar.startsWith('data:image') || avatar.startsWith('blob:') || /^https?:\/\//i.test(avatar) || avatar.includes('images/'))) return avatar;
    const photoUrl = typeof player.photoUrl === 'string' ? player.photoUrl.trim() : '';
    // 虎扑 BuildPlayer 的现役球员头像：NBA_PLAYER_IMAGES -> NBA CDN 260x190。
    // 优先使用该地址，失败时再回退到项目内缓存，保持离线/限流场景可玩。
    const photoLocal = typeof player.photoLocal === 'string' ? player.photoLocal.trim() : '';
    const photo = typeof player.photo === 'string' ? player.photo.trim() : '';
    if (photoLocal && /assets\/images\/Player\/hupu-current\//i.test(photoLocal) && !/IMG0000\.png$/i.test(photoLocal)) return photoLocal;
    if (photoUrl && /\/260x190\//i.test(photoUrl)) return photoUrl;
    if (photoLocal && !/IMG0000\.png$/i.test(photoLocal)) return photoLocal;
    if (photoUrl && /^https?:\/\//i.test(photoUrl)) return photoUrl;
    if (photo && (photo.startsWith('data:image') || photo.startsWith('blob:') || /^https?:\/\//i.test(photo))) return photo;
    const nameKey = player.nameEn || player.altName || player.name || '';
    const map = (typeof window.NBA_PLAYER_IMAGES === 'object' && window.NBA_PLAYER_IMAGES) ? window.NBA_PLAYER_IMAGES : {};
    const nbaId = map[nameKey] || map[player.name] || 0;
    if (nbaId) return `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`;
    if (parseNum(player.image, 0) > 0 && typeof getPlayerPhotoPath === 'function') {
      return getPlayerPhotoPath(player.image);
    }
    return '';
  }

  function avatarHtml(player, cls, size) {
    const src = resolveAvatar(player);
    const style = size ? ` style="width:${size}px;height:${size}px;"` : '';
    const name = player ? (player.nameCn || player.name || '?') : '?';
    const initial = (name || '?').slice(0, 1);
    const inner = src
      ? `<img class="${cls}" src="${esc(src)}" alt="${esc(name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" ${style}>`
      : '';
    const fallback = `<span class="${cls} avatar-fallback" style="${style ? style.slice(1) : ''}${src ? 'display:none;' : 'display:flex;'}align-items:center;justify-content:center;font-weight:800;color:#fff;background:linear-gradient(145deg,#2b3a63,#141a2b);">${esc(initial)}</span>`;
    return `<div style="display:contents;">${inner}${src ? fallback : fallback}</div>`;
  }

  /* ==================== 存档 ==================== */
  function saveGame() {
    try {
      if (PP.season && G && G.leagueSeason) {
        PP.season._leagueRecords = G.leagueSeason.teamRecords || null;
        PP.season._leaguePlayerStats = G.leagueSeason.playerStats || null;
      }
      const payload = {
        version: 1,
        savedAt: Date.now(),
        era: PP.era,
        career: PP.career,
        season: PP.season
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) { /* ignore */ }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.career) return null;
      return data;
    } catch (e) { return null; }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  /* ==================== 数据加载（本项目历史球员库） ==================== */
  async function ensureLeague(era) {
    if (PP.leagueReady && PP.era === era && LEAGUE && LEAGUE.loaded && LEAGUE.teams && Object.keys(LEAGUE.teams).length > 0) {
      return;
    }
    PP.era = era;
    if (typeof loadLeagueData !== 'function') {
      throw new Error('loadLeagueData 未加载（请通过本地 HTTP 服务打开页面）');
    }
    showToast('正在加载 ' + era + ' 赛季名单…');
    try {
      await loadLeagueData({ startYear: era, strictRoster: true });
      if (!LEAGUE.loaded || !LEAGUE.teams || Object.keys(LEAGUE.teams).length < 10) {
        await loadLeagueData({ startYear: 2025, strictRoster: true });
      }
      PP.leagueReady = true;
    } catch (err) {
      console.error(err);
      showToast('名单加载失败，请稍后重试');
      throw err;
    }
  }

  async function ensureAttributePool() {
    if (PP.attributePool && PP.attributePool.teams && Object.keys(PP.attributePool.teams).length >= 30) return;
    const response = await fetch(ATTRIBUTE_POOL_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('精选球员池加载失败：HTTP ' + response.status);
    const payload = await response.json();
    if (!payload || !payload.teams || Object.keys(payload.teams).length < 30) {
      throw new Error('精选球员池不完整');
    }
    PP.attributePool = payload;
  }

  function sourcePlayerKey(player) {
    if (!player) return '';
    return String(player.uid || `${player.source && player.source.code || 0}:${player.teamId || 0}:${player.id || player.name || ''}`);
  }

  function sourceKindLabel(player) {
    if (!player || !player.source) return '当前名单';
    if (player.source.kind !== 'historical') return '现役';
    return player.historicalTier === 'hall-of-fame' ? '名人堂惊喜' : '近代全明星惊喜';
  }

  function sourcePlayerLabel(player) {
    return player && player.source && player.source.label ? player.source.label : '2025-26';
  }

  function sourcePoolTeams() {
    return PP.attributePool && PP.attributePool.teams ? PP.attributePool.teams : null;
  }

  function sourceSeasonPool() {
    const teams = sourcePoolTeams();
    if (!teams) return [];
    const seen = {};
    Object.keys(teams).forEach(id => {
      (teams[id].players || []).concat(teams[id].historicalPlayers || []).forEach(player => {
        const source = player.source || {};
        const year = parseNum(source.year, 0);
        if (year && !seen[year]) seen[year] = { year, label: source.label || `${year}-${String((year + 1) % 100).padStart(2, '0')}` };
      });
    });
    return Object.values(seen).sort((a, b) => b.year - a.year);
  }

  function setSelectedSourcePlayer(player) {
    const b = PP.build;
    b.selectedPlayer = player || null;
    if (!player) return;
    const source = player.source || {};
    b.sourceRoll = {
      ...(b.sourceRoll || {}),
      playerKey: sourcePlayerKey(player),
      playerName: player.nameCn || player.name || '',
      playerYear: parseNum(source.year, 0),
      playerLabel: source.label || '',
      playerKind: sourceKindLabel(player)
    };
  }

  function eraRosterByTeam() {
    const out = {};
    Object.keys(LEAGUE.teams || {}).forEach(id => {
      const players = (LEAGUE.teams[id].players || [])
        .filter(p => p && p.rating > 0 && p.name)
        .sort((a, b) => parseNum(b.rating, 0) - parseNum(a.rating, 0));
      out[id] = players;
    });
    return out;
  }

  /* ==================== 建球员 ==================== */
  function buildReset() {
    PP.build = {
      team: null,
      roster: [],
      rerollsLeft: 3,
      swapsLeft: 3,
      selectedPlayer: null,
      lockedAttrs: {},
      lockCount: 0,
      usedPlayers: new Set(),
      showTeam: null,
      sourceRoll: null,
      sourceHistory: []
    };
  }

  function spinTeam() {
    const pool = sourcePoolTeams();
    if (pool) {
      const seasons = sourceSeasonPool();
      const requested = pick(seasons.length ? seasons : [{ year: 2025, label: '2025-26' }]);
      const allIds = Object.keys(pool).filter(id => (pool[id].players || []).length >= 5);
      const matchingIds = allIds.filter(id => (pool[id].players || []).some(p => parseNum(p.source && p.source.year, 0) === requested.year));
      const eligibleIds = matchingIds.length ? matchingIds : allIds;
      if (!eligibleIds.length) return null;
      let id = pick(eligibleIds);
      let guard = 0;
      while (id === PP.build.team && eligibleIds.length > 1 && guard++ < 8) id = pick(eligibleIds);
      const currentRoster = (pool[id].players || []).slice(0, 12);
      const historicalRoster = (pool[id].historicalPlayers || []).slice(0, 5);
      const roster = currentRoster.slice();
      if (historicalRoster.length && Math.random() < 0.20) roster.push(pick(historicalRoster));
      const fresh = roster.filter(p => !PP.build.usedPlayers.has(sourcePlayerKey(p)));
      const matching = (fresh.length ? fresh : roster).filter(p => parseNum(p.source && p.source.year, 0) === requested.year);
      const candidates = matching.length ? matching : (fresh.length ? fresh : roster);
      PP.build.team = id;
      PP.build.showTeam = id;
      PP.build.roster = roster;
      PP.build.swapsLeft = 3;
      PP.build.sourceRoll = { requestedYear: requested.year, requestedLabel: requested.label, teamId: id };
      setSelectedSourcePlayer(pick(candidates));
      return PP.build.selectedPlayer;
    }
    const teams = eraRosterByTeam();
    const allIds = Object.keys(teams).filter(id => teams[id].length >= 5);
    // 优先抽仍有未用过球员的球队
    const freshIds = allIds.filter(id => teams[id].some(p => !PP.build.usedPlayers.has(sourcePlayerKey(p))));
    const ids = freshIds.length ? freshIds : allIds;
    if (!ids.length) return null;
    let id = pick(ids);
    let guard = 0;
    while (id === PP.build.team && guard++ < 8) id = pick(ids);
    PP.build.team = id;
    PP.build.showTeam = id;
    PP.build.roster = teams[id].slice(0, 5);
    PP.build.swapsLeft = 3;
    PP.build.selectedPlayer = null;
    PP.build.sourceRoll = { requestedYear: PP.era, requestedLabel: (ERAS.find(e => e.year === PP.era) || ERAS[0]).label, teamId: id };
    setSelectedSourcePlayer(teams[id][0]);
    return PP.build.selectedPlayer;
  }

  function swapPlayer() {
    const roster = PP.build.roster;
    if (!roster.length || PP.build.swapsLeft <= 0) return null;
    const used = PP.build.usedPlayers;
    const cands = roster.filter(p => !used.has(sourcePlayerKey(p)) && p !== PP.build.selectedPlayer);
    if (!cands.length) return null;
    const p = pick(cands);
    PP.build.swapsLeft--;
    setSelectedSourcePlayer(p);
    return p;
  }

  function getPosPenalty(userPos, srcPos, attrKey) {
    const srcAvg = POS_AVG[srcPos] && POS_AVG[srcPos][attrKey];
    const userAvg = POS_AVG[userPos] && POS_AVG[userPos][attrKey];
    if (!srcAvg || srcAvg <= 0) return 1.0;
    return Math.min(1.0, userAvg / srcAvg);
  }

  function lockAttr(attrKey) {
    const b = PP.build;
    if (b.lockedAttrs[attrKey] != null) return;
    const p = b.selectedPlayer;
    if (!p) { showToast('请先选择一名球员'); return; }
    const srcPos = ID_POS[parseNum(p.pos, 3)] || 'SF';
    const t13 = projectToThirteen(p.attrs || {});
    const rawVal = t13[attrKey] != null ? t13[attrKey] : parseNum(p.rating, 60);
    const penalty = getPosPenalty(PP.position, srcPos, attrKey);
    const val = clamp(Math.round(rawVal * penalty), 25, 99);
    b.lockedAttrs[attrKey] = val;
    b.usedPlayers.add(sourcePlayerKey(p));
    const source = p.source || {};
    b.sourceHistory.push({
      attrKey,
      attrName: ATTR_CN[attrKey],
      value: val,
      rawValue: rawVal,
      penalty: Number(penalty.toFixed(3)),
      requestedYear: parseNum(b.sourceRoll && b.sourceRoll.requestedYear, 0),
      requestedLabel: b.sourceRoll && b.sourceRoll.requestedLabel || '',
      teamId: parseNum(b.team, 0),
      teamName: teamMeta(b.team).z || teamMeta(b.team).n || '',
      playerId: sourcePlayerKey(p),
      playerName: p.nameCn || p.name || '',
      playerYear: parseNum(source.year, 0),
      playerLabel: source.label || '',
      playerKind: sourceKindLabel(p),
      sourceCode: parseNum(source.code, 0),
      nbaId: parseNum(p.nbaId, 0)
    });
    b.lockCount = Object.keys(b.lockedAttrs).length;
    const penTxt = penalty < 1 ? `（跨位置衰减 ${Math.round((1 - penalty) * 100)}%）` : '';
    showToast(`${ATTR_CN[attrKey]} 已锁定：${val} ${penTxt}`);
    b.selectedPlayer = null;
    if (b.lockCount >= ATTR_KEYS.length) {
      setTimeout(() => revealPlayer(), 500);
      return;
    }
    // 按 BuildPlayer 规则：锁定后自动进入下一轮，抽新球队
    spinTeam();
    renderBuild();
  }

  function revealPlayer() {
    const b = PP.build;
    const attrs13 = {};
    ATTR_KEYS.forEach(k => { attrs13[k] = b.lockedAttrs[k]; });
    const ovr = calcOVR(attrs13, PP.position);
    const archetype = matchArchetype(attrs13, PP.position);
    const attrs10 = thirteenToProject(attrs13);
    const avatarName = PP.playerName || '我的完美球员';
    const career = {
      playerName: avatarName,
      avatar: PP.avatar,
      position: PP.position,
      era: PP.era,
      attrs13,
      attrs10,
      ovr,
      archetype,
      similar: findSimilarPlayers(attrs13, PP.position),
      attributeSources: b.sourceHistory.slice(),
      sourcePool: { current: 12, historical: 5, perTeam: 17 },
      teamId: null,
      age: 22,
      seasonCount: 0,
      singleSeasonComplete: false,
      contract: 4,
      totalStats: emptyStats(),
      playoffStats: emptyStats(),
      honors: [],
      seasons: [],
      profile: {
        fame: 5, businessValue: 0, mediaTrust: 40, controversy: 0,
        chinaPopularity: 0, loyalty: 50, leadership: 30,
        coachTrust: 50, lockerRoomTrust: 50, fanSupport: 40, legacyBonus: 0
      },
      seasonMods: { injuryRiskBonus: 0, formVariance: 0, teamChemistry: 0, moraleBonus: 0, mediaPressure: 0, staminaLoad: 0 },
      branches: {},
      flags: {},
      conquest: {},
      legacy: null,
      retired: false,
      totalAwards: []
    };
    PP.career = career;
    PP.season = null;
    saveGame();
    renderReveal();
    showScreen('screen-reveal');
  }

  function findSimilarPlayers(attrs13, pos) {
    const pool = sourcePoolTeams();
    const teams = pool
      ? Object.fromEntries(Object.keys(pool).map(tid => [tid, pool[tid].players || []]))
      : eraRosterByTeam();
    const avg = POS_AVG[pos] || POS_AVG.SF;
    const myZ = {};
    ATTR_KEYS.forEach(k => { myZ[k] = parseNum(attrs13[k], 55) - avg[k]; });
    const normMy = Math.sqrt(ATTR_KEYS.reduce((s, k) => s + myZ[k] * myZ[k], 0)) || 1;
    const scored = [];
    Object.keys(teams).forEach(tid => {
      (teams[tid] || []).slice(0, 6).forEach(p => {
        const t13 = projectToThirteen(p.attrs || {});
        let dot = 0;
        ATTR_KEYS.forEach(k => { dot += myZ[k] * (parseNum(t13[k], 55) - avg[k]); });
        const normOther = Math.sqrt(ATTR_KEYS.reduce((s, k) => s + (parseNum(t13[k], 55) - avg[k]) * (parseNum(t13[k], 55) - avg[k]), 0)) || 1;
        const sim = Math.max(0, Math.min(100, Math.round(dot / (normMy * normOther) * 100)));
        scored.push({ player: p, sim });
      });
    });
    scored.sort((a, b) => b.sim - a.sim);
    return scored.slice(0, 3).map(x => ({ player: x.player, sim: x.sim }));
  }

  function emptyStats() {
    return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, threeM: 0, threeA: 0, mins: 0, games: 0 };
  }

  /* ==================== 生涯准备：球员对象 + 轮换注入 ==================== */
  function buildUserPlayer() {
    const c = PP.career;
    const attrs10 = { ...c.attrs10 };
    const rating = typeof ovr === 'function' ? ovr(attrs10) : Math.round(Object.values(attrs10).reduce((a, b) => a + b, 0) / 10);
    const avatar = c.avatar || '';
    return {
      id: 'USER_SELF',
      uid: 'USER_SELF',
      name: c.playerName,
      nameCn: c.playerName,
      nameEn: c.playerName,
      altName: c.playerName,
      pos: POS_ID[c.position],
      pos2: 0,
      rating,
      potential: Math.min(99, rating + 8),
      att: Math.round((attrs10.shotExt + attrs10.shotInt + attrs10.pass + attrs10.speed + attrs10.shotFree) / 5),
      def: Math.round((attrs10.stl + attrs10.blk + attrs10.reb + attrs10.strength + attrs10.physique) / 5),
      age: c.age,
      yearsLeague: Math.max(0, c.seasonCount),
      draft: 0,
      photo: avatar,
      avatar,
      image: 0,
      attrs: attrs10,
      tendencies: { in: 55, mid: 55, ex: 55, fr: 55, foul: 55 },
      badges: [],
      xfactor: '',
      injury: { active: false, games: 0, type: '' },
      isSelf: true,
      salary: rookieContractAmount(c),
      trust: clamp(55 + (c.profile.coachTrust || 0) * 0.2, 0, 100),
      mood: clamp(55 + (c.profile.lockerRoomTrust || 0) * 0.15, 0, 100)
    };
  }

  function rookieContractAmount(c) {
    const base = c.seasonCount <= 1 ? 8 : 12;
    return clamp(Math.round(base + (c.ovr - 65) * 0.6), 5, 45);
  }

  function installRotationHook() {
    if (PP._origBuildRotation) return;
    PP._origBuildRotation = typeof buildDynamicTeamRotation === 'function' ? buildDynamicTeamRotation : null;
    const myTeamId = () => PP.career ? parseNum(PP.career.teamId, 0) : 0;
    window.buildDynamicTeamRotation = function (teamId, opts) {
      const tid = parseNum(teamId, 0);
      if (tid === myTeamId() && PP.career && PP.season && typeof getTeamPlayers === 'function') {
        const injured = !!(G.player && G.player.injury && G.player.injury.active);
        const pool = (getTeamPlayers(tid) || []).filter(p => !(String(p.id) === 'USER_SELF' && injured));
        if (!pool.length) return PP._origBuildRotation ? PP._origBuildRotation(teamId, opts) : [];
        const ranked = pool
          .map(p => ({ ...p, roleScore: typeof roleScoreForPlayer === 'function' ? roleScoreForPlayer(p) : parseNum(p.rating, 65) }))
          .sort((a, b) => b.roleScore - a.roleScore);
        const selfIdx = ranked.findIndex(p => String(p.id) === 'USER_SELF');
        const isStarter = selfIdx >= 0 && selfIdx < 5;
        const template = [35, 34, 33, 32, 31, 24, 19, 17, 15, 10];
        return ranked.slice(0, 10).map((p, i) => ({
          id: p.id,
          name: p.name,
          pos: parseNum(p.pos, 3),
          pos2: parseNum(p.pos2, 0),
          slotPos: 0,
          rotationRole: i < 5 ? 'starter' : (i === 5 ? 'sixth' : 'role'),
          rating: parseNum(p.rating, 65),
          photo: p.photo,
          avatar: p.avatar || '',
          image: p.image,
          isSelf: !!p.isSelf,
          minutes: String(p.id) === 'USER_SELF'
            ? (isStarter ? clamp(32 + Math.round((parseNum(p.rating, 70) - 70) * 0.15), 26, 38) : 18)
            : clamp((template[i] || 10) + rng(-1, 1), 8, 40),
          roleScore: p.roleScore,
          rookie: !!p.rookie,
          draftPick: p.draftPick,
          draft: p.draft,
          yearsLeague: p.yearsLeague,
          fullGameStarter: false,
          noFatigue: false
        }));
      }
      return PP._origBuildRotation ? PP._origBuildRotation(teamId, opts) : [];
    };
  }

  function prepareSeasonState() {
    const c = PP.career;
    const myPlayer = buildUserPlayer();
    G.player = myPlayer;
    G.teamId = parseNum(c.teamId, 0);
    G.phase = 'season';
    G.startYear = c.era;
    G.year = c.era + Math.min(c.seasonCount, 12);
    G.season = c.seasonCount + 1;
    G.gameNum = 0;
    G.dayNum = 0;
    G.totalGames = 82;
    G.seasonDays = 180;
    G.gameDays = [];
    G.schedule = [];
    G.results = [];
    G.news = [];
    G.phone = [];
    G.events = [];
    G.careerStats = [];
    G.awards = [];
    G.allAwards = [];
    G.leagueAwards = [];
    G.playoffs = typeof defaultPlayoffState === 'function' ? defaultPlayoffState() : { active: false, champion: false };
    G.seasonStats = emptyStats();
    G.player.trust = clamp(55 + (c.profile.coachTrust || 0) * 0.2, 0, 100);
    G.player.mood = clamp(55 + (c.profile.lockerRoomTrust || 0) * 0.15, 0, 100);
    // 把自建球员加入所在球队名单（轮换注入依赖）
    const teamObj = LEAGUE.teams[G.teamId];
    if (teamObj) {
      const idx = (teamObj.players || []).findIndex(p => String(p.id) === 'USER_SELF');
      if (idx >= 0) teamObj.players[idx] = myPlayer;
      else teamObj.players.push(myPlayer);
      if (typeof calcTeamStrength === 'function') teamObj.strength = calcTeamStrength(teamObj);
    }
    installRotationHook();
    if (typeof initLeagueSeasonState === 'function') initLeagueSeasonState();
    if (PP.season && PP.season._leagueRecords) {
      G.leagueSeason.teamRecords = PP.season._leagueRecords;
      G.leagueSeason.playerStats = PP.season._leaguePlayerStats || G.leagueSeason.playerStats;
    }
  }

  /* ==================== 赛程与比赛模拟（本项目引擎） ==================== */
  function buildSchedule(rounds) {
    const total = rounds || 82;
    const myId = parseNum(PP.career.teamId, 0);
    const ids = Object.keys(LEAGUE.teams || {}).map(Number).filter(id => id && id !== myId);
    const opponentOrder = shuffle(ids);
    const out = [];
    for (let round = 0; round < total; round++) {
      const opponent = opponentOrder[round % opponentOrder.length];
      const shuffled = shuffle(ids.filter(id => id !== opponent));
      const pairs = [];
      const myHome = round % 2 === 0;
      pairs.push({ homeTeamId: myHome ? myId : opponent, awayTeamId: myHome ? opponent : myId, isMyGame: true });
      for (let i = 0; i + 1 < shuffled.length - 1; i += 2) {
        const a = shuffled[i];
        const b = shuffled[i + 1];
        const homeFirst = (round + i) % 2 === 0;
        pairs.push({ homeTeamId: homeFirst ? a : b, awayTeamId: homeFirst ? b : a, isMyGame: false });
      }
      out.push(pairs);
    }
    return out;
  }

  function userLiveAttrs() {
    // 体力/状态/伤病 → 临场属性修正
    const c = PP.career;
    const base = { ...c.attrs10 };
    const stamina = parseNum(c.currentStamina, 100);
    const staminaFactor = 1 - Math.max(0, (100 - stamina)) * 0.0022;
    const form = 1 + clamp(parseNum(c.seasonMods.formVariance, 0), -4, 4) * 0.012;
    const injuryFactor = PP._injured ? 0.8 : 1;
    const out = {};
    Object.keys(base).forEach(k => {
      out[k] = clamp(Math.round(base[k] * Math.max(0.6, staminaFactor) * form * injuryFactor), 25, 99);
    });
    return out;
  }

  async function simulateOneGame(pair, idx, phase, roundIndex) {
    if (!G.leagueSeason) prepareSeasonState();
    // 临场属性
    if (G.player) G.player.attrs = userLiveAttrs();
    const detail = simulateLeagueMatchup(pair.homeTeamId, pair.awayTeamId, {
      season: G.season,
      year: G.year,
      phase: phase || 'regular',
      roundIndex: roundIndex || 0,
      userTeamId: parseNum(PP.career.teamId, 0)
    });
    if (!detail) {
      console.warn('[perfect-player] simulateLeagueMatchup null', JSON.stringify({ pair, phase, roundIndex, teamId: PP.career.teamId, home: pair.homeTeamId, away: pair.awayTeamId }));
      return null;
    }
    const myId = parseNum(PP.career.teamId, 0);
    const isHome = parseNum(detail.homeTeamId, 0) === myId;
    const rows = isHome ? detail.homeRows : detail.awayRows;
    const myRow = (rows || []).find(r => r.isSelf) || null;
    const win = isHome ? detail.homeWin : !detail.homeWin;
    return {
      idx,
      phase: phase || 'regular',
      roundIndex: roundIndex || 0,
      homeTeamId: detail.homeTeamId,
      awayTeamId: detail.awayTeamId,
      homeScore: detail.homeScore,
      awayScore: detail.awayScore,
      win,
      myRow,
      flow: detail.flow || {}
    };
  }

  /* ==================== 媒体压力 / 热度 / 球迷支持（数值明确化） ==================== */
  function recentResults(n) {
    const games = (PP.season && PP.season.games) || [];
    return games.slice(-n).map(g => !!g.win);
  }

  function computeVitals() {
    const c = PP.career;
    const prof = c.profile || {};
    const mods = c.seasonMods || {};
    const recent = recentResults(5);
    let streak = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (i === recent.length - 1 || recent[i] === recent[i + 1]) {
        streak = recent[i] ? Math.max(streak, recent.length - i) : Math.min(streak, -(recent.length - i));
      }
    }
    const winStreak = Math.max(0, streak);
    const loseStreak = Math.max(0, -streak);
    const ppgLast5 = avgRecentPpg(5);

    let mediaPressure = 8;
    mediaPressure += parseNum(mods.mediaPressure, 0) * 1.5;
    mediaPressure += parseNum(prof.controversy, 0) * 0.9;
    mediaPressure += parseNum(mods.formVariance, 0) * 1.2;
    mediaPressure += parseNum(mods.injuryRiskBonus, 0) * 0.6;
    mediaPressure += parseNum(prof.fame, 0) * 0.12;
    if (loseStreak >= 3) mediaPressure += 3.5 * loseStreak;
    if (winStreak >= 4) mediaPressure += 2 * winStreak;
    mediaPressure = clamp(Math.round(mediaPressure), 0, 100);

    let heat = parseNum(prof.fame, 0) * 0.55 + ppgLast5 * 1.5 + winStreak * 2.5 + parseNum(prof.mediaTrust, 0) * 0.08;
    heat = clamp(Math.round(heat), 0, 100);

    const last10 = recentResults(10);
    const wins10 = last10.filter(Boolean).length;
    let fanSupport = 50 + parseNum(prof.fanSupport, 0) * 0.5 + parseNum(prof.mediaTrust, 0) * 0.15
      - parseNum(prof.controversy, 0) * 0.4 + (wins10 - 5) * 3.2;
    fanSupport = clamp(Math.round(fanSupport), 0, 100);

    const stamina = clamp(Math.round(parseNum(c.currentStamina, 100)), 0, 100);
    const games = (PP.season && PP.season.games) || [];
    const winRate10 = games.length ? recentResults(10).filter(Boolean).length / Math.max(1, Math.min(10, games.length)) : 0.5;
    let morale = 50 + parseNum(mods.moraleBonus, 0) * 3 + (winRate10 - 0.5) * 55 + parseNum(mods.teamChemistry, 0) * 1.5;
    morale = clamp(Math.round(morale), 0, 100);

    let lockerRoom = 50 + parseNum(prof.lockerRoomTrust, 0) * 0.6 + parseNum(prof.leadership, 0) * 0.4 - parseNum(prof.controversy, 0) * 0.2;
    lockerRoom = clamp(Math.round(lockerRoom), 0, 100);

    let coachTrust = clamp(Math.round(parseNum(prof.coachTrust, 50) * 0.85 + (PP.career.ovr - 70) * 0.5), 0, 100);
    let chinaHeat = clamp(Math.round(parseNum(prof.chinaPopularity, 0) * 1.2 + ppgLast5 * 1.2), 0, 100);

    return {
      mediaPressure, heat, fanSupport, stamina, morale, lockerRoom, coachTrust, chinaHeat,
      controversy: clamp(Math.round(parseNum(prof.controversy, 0) * 1.4), 0, 100),
      fame: clamp(Math.round(parseNum(prof.fame, 0) * 1.6), 0, 100),
      business: clamp(Math.round(parseNum(prof.businessValue, 0) * 1.5), 0, 100),
      ppgLast5
    };
  }

  function avgRecentPpg(n) {
    const games = (PP.season && PP.season.games) || [];
    const slice = games.slice(-n);
    if (!slice.length) return 0;
    const total = slice.reduce((s, g) => s + parseNum(g.myRow && g.myRow.pts, 0), 0);
    return +(total / slice.length).toFixed(1);
  }

  /* ==================== 赛季状态更新 ==================== */
  function applyGameToSeason(game) {
    const s = PP.season;
    s.games = s.games || [];
    s.games.push(game);
    if (game.win) s.wins = (s.wins || 0) + 1;
    else s.losses = (s.losses || 0) + 1;
    const row = game.myRow;
    if (row) {
      const st = s.playerStats = s.playerStats || emptyStats();
      st.games += 1;
      st.mins += parseNum(row.mins, 0);
      st.pts += parseNum(row.pts, 0);
      st.reb += parseNum(row.reb, 0);
      st.ast += parseNum(row.ast, 0);
      st.stl += parseNum(row.stl, 0);
      st.blk += parseNum(row.blk, 0);
      st.tov += parseNum(row.tov, 0);
      st.fgm += parseNum(row.fgm, 0);
      st.fga += parseNum(row.fga, 0);
      st.ftm += parseNum(row.ftm, 0);
      st.fta += parseNum(row.fta, 0);
      st.threeM += parseNum(row.tpm, 0);
      st.threeA += parseNum(row.tpa, 0);
      // 体力消耗
      const c = PP.career;
      const minutes = parseNum(row.mins, 30);
      const load = Math.round(minutes * 0.9 + parseNum(c.seasonMods.staminaLoad, 0) * 0.8);
      c.currentStamina = clamp(parseNum(c.currentStamina, 100) - load, 0, 100);
      // 媒体/热度/声望随表现浮动
      const vit = computeVitals();
      const prof = c.profile;
      prof.fame = clamp((prof.fame || 0) + (game.win ? 0.8 : 0.1) + Math.max(0, parseNum(row.pts, 0) - 20) * 0.22, 0, 99);
      if (parseNum(row.pts, 0) >= 40) prof.fame = clamp((prof.fame || 0) + 2.5, 0, 99);
      if (parseNum(row.pts, 0) >= 30) prof.mediaTrust = clamp((prof.mediaTrust || 0) + 1.2, 0, 99);
      if (game.win) prof.fanSupport = clamp((prof.fanSupport || 0) + 0.8, 0, 99);
      if (!game.win && parseNum(row.pts, 0) < 10) prof.fanSupport = clamp((prof.fanSupport || 0) - 1.2, 0, 99);
    }
    // 伤病倒计时
    if (G.player && G.player.injury && G.player.injury.active) {
      G.player.injury.games = Math.max(0, parseNum(G.player.injury.games, 0) - 1);
      if (G.player.injury.games <= 0) {
        G.player.injury.active = false;
        G.player.injury.type = '';
        PP._injured = false;
      }
    }
    PP._injured = false;
    saveGame();
  }

  function seasonAverages() {
    const st = (PP.season && PP.season.playerStats) || emptyStats();
    const gp = Math.max(1, st.games);
    return {
      pts: +(st.pts / gp).toFixed(1),
      reb: +(st.reb / gp).toFixed(1),
      ast: +(st.ast / gp).toFixed(1),
      stl: +(st.stl / gp).toFixed(1),
      blk: +(st.blk / gp).toFixed(1),
      tov: +(st.tov / gp).toFixed(1),
      gp
    };
  }

  /* ==================== 随机事件系统 ==================== */
  function getBranchState(id) {
    const c = PP.career;
    c.branches = c.branches || {};
    if (!c.branches[id]) c.branches[id] = { stage: 0, points: 0 };
    return c.branches[id];
  }
  function getBranchNode(id) {
    return getBranchState(id).node || 'start';
  }
  function advanceBranch(id, delta, data) {
    const b = getBranchState(id);
    b.stage = Math.max(0, (b.stage || 0) + (delta || 1));
    if (data) Object.keys(data).forEach(k => { b[k] = data[k]; });
    return b;
  }
  function addProfileDelta(key, delta) {
    const p = PP.career.profile;
    p[key] = clamp((p[key] || 0) + delta, -20, 99);
    return p[key];
  }
  function addSeasonMod(key, delta, minV, maxV) {
    const m = PP.career.seasonMods;
    m[key] = clamp((m[key] || 0) + delta, minV == null ? -10 : minV, maxV == null ? 10 : maxV);
    return m[key];
  }
  function addAttrDelta(key, delta) {
    const a = PP.career.attrs13;
    a[key] = clamp(parseNum(a[key], 55) + delta, 25, 99);
    PP.career.attrs10 = thirteenToProject(a);
    PP.career.ovr = calcOVR(a, PP.career.position);
  }

  const EVENT_POOL = [
    // ===== 赛季中事件 =====
    { id: 'media_day', phase: 'season', weight: 12, emoji: '🎙️', title: '媒体日采访',
      body: '赛前媒体日，记者们把话筒怼到你面前：球队最近的战术调整、上一场的失利、更衣室传闻……全被摆上台面。',
      choices: [
        { label: '霸气回应：我们就是来夺冠的', hint: '热度+，但媒体压力上升', apply() { addProfileDelta('fame', 3); addProfileDelta('mediaTrust', 2); addProfileDelta('controversy', 1); addSeasonMod('mediaPressure', 1); return '记者们兴奋地记下你的话，标题已经想好了。热度+3，媒体信任+2，争议+1，媒体压力+1。'; } },
        { label: '低调务实：一场一场来', hint: '媒体压力下降，热度小幅下降', apply() { addProfileDelta('mediaTrust', 3); addSeasonMod('mediaPressure', -2); addProfileDelta('fame', 1); return '你控制住了叙事节奏。媒体信任+3，媒体压力-2，热度小幅上升。'; } },
        { label: '调侃回避：先赢球再聊', hint: '争议-1，热度不变', apply() { addProfileDelta('controversy', -1); addProfileDelta('mediaTrust', 1); return '记者们笑了，话题被轻松带过。争议-1，媒体信任+1。'; } }
      ] },
    { id: 'locker_rumor', phase: 'season', weight: 10, emoji: '🗣️', title: '更衣室流言',
      body: '训练时你听到队友在议论交易流言，更衣室气氛微妙。有人希望你说点什么，有人希望你闭嘴。',
      choices: [
        { label: '站出来稳定军心', hint: '领袖气质+，更衣室信任+', apply() { addProfileDelta('leadership', 4); addProfileDelta('lockerRoomTrust', 3); addSeasonMod('teamChemistry', 1); return '你的话让队友们冷静下来。领袖气质+4，更衣室信任+3，球队化学反应+1。'; } },
        { label: '私下找当事人聊', hint: '更衣室信任+2，体力-', apply() { addProfileDelta('lockerRoomTrust', 2); addProfileDelta('coachTrust', 1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 5, 0, 100); return '问题在私下解决，没人知道。更衣室信任+2，教练信任+1，体力-5。'; } },
        { label: '不参与，专注训练', hint: '体力+3', apply() { addProfileDelta('leadership', -1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) + 3, 0, 100); return '你没有卷入漩涡。体力+3，领袖气质-1。'; } }
      ] },
    { id: 'fan_social', phase: 'season', weight: 11, emoji: '📱', title: '社媒风波',
      body: '你上一条社媒动态被球迷吵翻了：有人说你态度有问题，有人说你被高估。评论区已不可控。',
      choices: [
        { label: '发一条回应视频', hint: '球迷支持+，媒体信任+', apply() { addProfileDelta('fanSupport', 5); addProfileDelta('mediaTrust', 3); addProfileDelta('fame', 1); return '视频发布后风向逆转。球迷支持+5，媒体信任+3。'; } },
        { label: '直接关评', hint: '争议下降，球迷支持小降', apply() { addProfileDelta('controversy', -2); addProfileDelta('fanSupport', -1); return '评论区关闭，话题慢慢冷却。争议-2，球迷支持-1。'; } },
        { label: '硬刚网友', hint: '热度+，争议+，球迷支持-', apply() { addProfileDelta('fame', 3); addProfileDelta('controversy', 3); addProfileDelta('fanSupport', -3); return '你回怼了最狠的那条评论，流量爆炸。热度+3，争议+3，球迷支持-3。'; } }
      ] },
    { id: 'ankle_tweak', phase: 'season', weight: 9, emoji: '🩹', title: '训练中脚踝不适',
      body: '一次对抗训练中你的脚踝轻微扭伤。队医说问题不大，但建议休息两天；也有声音说忍忍就能打。',
      choices: [
        { label: '谨慎休战1场', hint: '缺阵1场，体力恢复+，避免伤病风险', apply() { const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) + 15, 0, 100); addSeasonMod('injuryRiskBonus', -1); if (G.player) G.player.injury = { active: true, games: 1, type: '脚踝扭伤' }; return '你缺阵1场，脚踝得到休息。体力+15，伤病风险-1。'; } },
        { label: '带伤轻训坚持打', hint: '本场属性约-20%，有加重风险', apply() { addSeasonMod('formVariance', 1); addProfileDelta('coachTrust', 1); PP._injured = true; return '你坚持出战。教练信任+1，状态波动+1，本场属性约-20%。'; } },
        { label: '彻底休整一周', hint: '体力+25，媒体压力+1', apply() { const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) + 25, 0, 100); addSeasonMod('mediaPressure', 1); addProfileDelta('controversy', 1); return '你选择彻底休整。体力+25，媒体压力+1，争议+1。'; } }
      ] },
    { id: 'hot_streak', phase: 'season', weight: 8, emoji: '🔥', title: '手感火热',
      body: '连续两场比赛状态爆棚，训练师说你正处于「出手就有」的窗口期。要不要趁热打铁加练？',
      choices: [
        { label: '加练保持手感', hint: '下3场三分/中投+2，体力-8', apply() { addAttrDelta('threePT', 1); addAttrDelta('MID', 1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 8, 0, 100); c.flags.hotStreak = 3; return '手感加练见效：三分+1、中投+1，未来3场手感加成，体力-8。'; } },
        { label: '保持常规节奏', hint: '体力不变', apply() { addProfileDelta('coachTrust', 1); return '你按计划训练，状态自然延续。教练信任+1。'; } }
      ] },
    { id: 'media_pressure', phase: 'season', weight: 9, emoji: '📰', title: '舆论施压',
      body: '最近球队战绩不佳，媒体把矛头指向你：得分不够爆炸、关键时刻隐身。舆论开始施压。',
      choices: [
        { label: '用表现回击：增加出手', hint: '本场球权+，状态波动+', apply() { addSeasonMod('formVariance', 1); addProfileDelta('controversy', 1); return '下一场你疯狂出手，数据会更好看，但效率可能波动。状态波动+1，争议+1。'; } },
        { label: '接受采访坦诚压力', hint: '媒体信任+3，媒体压力-3', apply() { addProfileDelta('mediaTrust', 3); addSeasonMod('mediaPressure', -3); return '你坦诚回应压力，赢得记者尊重。媒体信任+3，媒体压力-3。'; } },
        { label: '屏蔽舆论', hint: '争议+1，媒体压力-1', apply() { addProfileDelta('controversy', 1); addSeasonMod('mediaPressure', -1); return '你选择不看新闻，专注训练。争议+1，媒体压力-1。'; } }
      ] },
    { id: 'teammate_bond', phase: 'season', weight: 8, emoji: '🤝', title: '队友邀约',
      body: '队友邀请你参加他的家庭烤肉聚会，说是赛季中难得的放松。但明天有一场硬仗。',
      choices: [
        { label: '参加聚会', hint: '更衣室+4，体力-8', apply() { addProfileDelta('lockerRoomTrust', 4); addProfileDelta('fanSupport', 1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 8, 0, 100); return '聚会上你们聊到深夜。更衣室信任+4，球迷支持+1，体力-8。'; } },
        { label: '婉拒并加练', hint: '体力+5，更衣室-1', apply() { addProfileDelta('lockerRoomTrust', -1); addProfileDelta('coachTrust', 1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) + 5, 0, 100); return '你留在球馆加练。教练信任+1，体力+5，更衣室信任-1。'; } }
      ] },
    { id: 'slam_highlight', phase: 'season', weight: 7, emoji: '💥', title: '隔扣上头条',
      body: '上一场你完成一记暴力隔扣，集锦在全网疯传。商业团队想趁热推一波个人品牌。',
      choices: [
        { label: '配合商业推广', hint: '商业价值+5，体力-6', apply() { addProfileDelta('businessValue', 5); addProfileDelta('fame', 2); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 6, 0, 100); return '拍摄+采访花掉半天。商业价值+5，热度+2，体力-6。'; } },
        { label: '专注比赛，拒绝分心', hint: '教练信任+2', apply() { addProfileDelta('coachTrust', 2); return '你婉拒了推广。教练信任+2。'; } }
      ] },
    { id: 'starter_rival', phase: 'season', weight: 7, emoji: '⚔️', title: '位置竞争',
      body: '队内同位置球员状态回暖，教练暗示轮换可能调整。更衣室里开始有了火药味。',
      choices: [
        { label: '主动找教练谈定位', hint: '教练信任+3，明确首发', apply() { addProfileDelta('coachTrust', 3); addProfileDelta('lockerRoomTrust', 1); return '教练认可你的态度，承诺维持你的出场时间。教练信任+3。'; } },
        { label: '用训练回应竞争', hint: '属性+1（按位置），体力-6', apply() { const boost = PP.career.position === 'C' || PP.career.position === 'PF' ? 'IDEF' : 'PDEF'; addAttrDelta(boost, 1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 6, 0, 100); return `你在训练中展示统治力：${ATTR_CN[boost]}+1，体力-6。`; } }
      ] },
    { id: 'travel_back2back', phase: 'season', weight: 6, emoji: '✈️', title: '背靠背客场',
      body: '连续的客场背靠背让你疲惫不堪。队医建议轮休，教练想让你带队。',
      choices: [
        { label: '轮休保存体力', hint: '体力+20，媒体压力+1', apply() { const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) + 20, 0, 100); addSeasonMod('mediaPressure', 1); return '你轮休一场。体力+20，媒体压力+1。'; } },
        { label: '坚持出战', hint: '教练信任+2，体力-12', apply() { addProfileDelta('coachTrust', 2); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 12, 0, 100); return '你咬牙出战，赢得教练尊重。教练信任+2，体力-12。'; } }
      ] },
    { id: 'mentor_advice', phase: 'season', weight: 6, emoji: '🧠', title: '老将指点',
      body: '球队老将私下给你看了一段录像，指出你防守端的位置感问题。他的建议很具体。',
      choices: [
        { label: '虚心求教加练', hint: '防守属性+1', apply() { addAttrDelta(PP.career.position === 'C' || PP.career.position === 'PF' ? 'IDEF' : 'PDEF', 1); addProfileDelta('lockerRoomTrust', 2); return '你跟着老将加练到深夜。防守+1，更衣室信任+2。'; } },
        { label: '礼貌谢过，按自己节奏', hint: '无变化', apply() { return '你礼貌听完，没有改变自己的节奏。'; } }
      ] },
    // ===== 休赛期事件 =====
    { id: 'national_team', phase: 'offseason', weight: 12, emoji: '🇨🇳', title: '国家队征召',
      body: '国家队向你发来正式征召。这个夏天，国家队需要一个真正能扛球权的人。经纪团队提醒你：这是荣誉，也是压力。',
      choices: [
        { label: '接受征召', hint: '关键/传球+1，伤病风险+2', apply() { addAttrDelta('CLU', 1); addAttrDelta('PAS', 1); addSeasonMod('injuryRiskBonus', 2); addProfileDelta('fame', 3); addProfileDelta('chinaPopularity', 4); return '你代表国家队出战，国内人气大涨。关键+1、传球+1、中国热度+4，下赛季伤病风险+2。'; } },
        { label: '婉拒，专注恢复', hint: '状态波动-1', apply() { addSeasonMod('formVariance', -1); addProfileDelta('controversy', 1); return '你保留完整休整周期，但舆论有点杂音。状态波动-1，争议+1。'; } }
      ] },
    { id: 'superstar_camp', phase: 'offseason', weight: 13, emoji: '🏕️', title: '巨星训练营',
      body: '休赛期你收到几个私人训练营邀请。它们不只是训练课，更像一次路线选择：你要从谁身上偷走一部分比赛理解？',
      choices: [
        { label: '内线脚步特训', hint: '终结/内防/篮板提升', apply() { addAttrDelta('FIN', 2); addAttrDelta('IDEF', 1); addAttrDelta('REB', 1); return '一周脚步特训后，你的低位更稳了。终结+2、内防+1、篮板+1。'; } },
        { label: '投射专项', hint: '中投/三分提升', apply() { addAttrDelta('MID', 2); addAttrDelta('threePT', 1); return '每天几百次定点跳投。中投+2、三分+1。'; } },
        { label: '身体强化', hint: '运动/力量/终结提升', apply() { addAttrDelta('ATH', 2); addAttrDelta('STR', 1); addAttrDelta('FIN', 1); return '力量房+冲刺训练双管齐下。运动+2、力量+1、终结+1。'; } },
        { label: '控场特训', hint: '手感/传球/关键提升', apply() { addAttrDelta('HAN', 1); addAttrDelta('PAS', 2); addAttrDelta('CLU', 1); return '你在挡拆阅读上进步明显。手感+1、传球+2、关键+1。'; } }
      ] },
    { id: 'skill_breakthrough', phase: 'offseason', weight: 11, emoji: '💡', title: '专项技术突破',
      body: '训练师建议你把整个夏天押在一项技术上。高投入有机会换来突飞猛进，也可能遇到瓶颈。',
      choices: [
        { label: '投射突破', hint: '大概率三分/中投+2，小概率+4', apply() { const roll = Math.random(); if (roll < 0.25) { addAttrDelta('threePT', 4); return '你突破了出手瓶颈！三分+4！'; } addAttrDelta('threePT', 2); addAttrDelta('MID', 1); return '投射稳步提升。三分+2、中投+1。'; } },
        { label: '防守突破', hint: '大概率外防/抢断+2', apply() { addAttrDelta('PDEF', 2); addAttrDelta('STL', 1); return '你的横移和预判提升明显。外防+2、抢断+1。'; } },
        { label: '篮板嗅觉', hint: '篮板+3，运动+1', apply() { addAttrDelta('REB', 3); addAttrDelta('ATH', 1); return '你练出了卡位肌肉记忆。篮板+3、运动+1。'; } }
      ] },
    { id: 'endorsement_offer', phase: 'offseason', weight: 10, emoji: '💰', title: '代言邀约',
      body: '一家运动品牌想签你做代言人，报价不错，但需要你在休赛期参加一系列商业活动。',
      choices: [
        { label: '接下代言', hint: '商业价值+6，状态波动+1', apply() { addProfileDelta('businessValue', 6); addProfileDelta('fame', 2); addSeasonMod('formVariance', 1); return '你签下代言，商业价值+6、热度+2，但商业活动挤压了训练时间。'; } },
        { label: '只接限量联名', hint: '商业价值+3，无副作用', apply() { addProfileDelta('businessValue', 3); return '你只参与设计联名鞋。商业价值+3，训练节奏不受影响。'; } },
        { label: '婉拒，专注训练', hint: '状态波动-1', apply() { addSeasonMod('formVariance', -1); addProfileDelta('coachTrust', 1); return '你拒绝了商业邀约。状态波动-1，教练信任+1。'; } }
      ] },
    { id: 'media_scandal', phase: 'offseason', weight: 8, emoji: '📸', title: '场外风波',
      body: '休赛期你被拍到深夜出入夜店，配文「不自律」的帖子冲上热搜。事情不大，但舆论很大。',
      choices: [
        { label: '正面回应道歉', hint: '争议-2，媒体信任+2', apply() { addProfileDelta('controversy', -2); addProfileDelta('mediaTrust', 2); return '你的回应诚恳，风波平息。争议-2，媒体信任+2。'; } },
        { label: '否认并澄清', hint: '争议+1，媒体信任-1', apply() { addProfileDelta('controversy', 1); addProfileDelta('mediaTrust', -1); return '澄清显得苍白，话题继续发酵。争议+1，媒体信任-1。'; } }
      ] },
    { id: 'family_support', phase: 'offseason', weight: 7, emoji: '👨‍👩‍👦', title: '家庭时光',
      body: '家人希望你休赛期多回家，享受难得的团聚。老队友却约你一起去海外特训。',
      choices: [
        { label: '回家陪家人', hint: '心态+，状态波动-1', apply() { addSeasonMod('formVariance', -1); addProfileDelta('loyalty', 3); addProfileDelta('mediaTrust', 1); return '家庭时光让你心态平和。状态波动-1，忠诚+3。'; } },
        { label: '海外特训', hint: '运动+2，更衣室-2', apply() { addAttrDelta('ATH', 2); addProfileDelta('lockerRoomTrust', -2); return '你与老队友海外特训一个月。运动+2，但缺席了队内合练，更衣室信任-2。'; } }
      ] },
    { id: 'rookie_mentor', phase: 'offseason', weight: 7, emoji: '🎓', title: '新秀导师',
      body: '球队希望你在夏天带一带新秀。这会占用你的时间，但能提升你在更衣室的影响力。',
      choices: [
        { label: '接下导师任务', hint: '领袖+3，更衣室+3，体力训练-', apply() { addProfileDelta('leadership', 3); addProfileDelta('lockerRoomTrust', 3); return '新秀们视你为老大哥。领袖气质+3，更衣室信任+3。'; } },
        { label: '婉拒，专注自己', hint: '运动+2', apply() { addAttrDelta('ATH', 2); addProfileDelta('lockerRoomTrust', -1); return '你专注于个人提升。运动+2，更衣室信任-1。'; } }
      ] }
  ];

  function pickEvent(phase) {
    const pool = EVENT_POOL.filter(e => e.phase === phase);
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const e of pool) {
      roll -= e.weight;
      if (roll <= 0) return e;
    }
    return pool[pool.length - 1];
  }

  function showEventModal(ev, phase, onDone) {
    PP.pendingAction = { phase, onDone };
    $('event-emoji').textContent = ev.emoji || '📌';
    $('event-title').textContent = ev.title;
    const hintHtml = (ev.hints || []).map(h => `<div class="muted">${esc(h)}</div>`).join('');
    $('event-body').innerHTML = `<div>${esc(ev.body)}</div>${hintHtml ? `<div class="event-detail">${hintHtml}</div>` : ''}`;
    $('event-choices').innerHTML = ev.choices.map((ch, i) =>
      `<button class="event-choice" data-i="${i}"><div class="ec-label">${esc(ch.label)}</div><div class="ec-hint">${esc(ch.hint)}</div></button>`
    ).join('');
    Array.from($('event-choices').children).forEach(btn => {
      btn.addEventListener('click', () => {
        const ch = ev.choices[parseNum(btn.dataset.i, 0)];
        let result = '';
        try { result = ch.apply(); } catch (e) { result = ''; }
        const history = PP.career.branches.history = PP.career.branches.history || [];
        history.push({ season: PP.career.seasonCount + 1, phase, title: ev.title, choice: ch.label, result });
        closeEventModal();
        if (result) showToast('✨ ' + result);
        saveGame();
        if (PP.pendingAction && PP.pendingAction.onDone) {
          const fn = PP.pendingAction.onDone;
          PP.pendingAction = null;
          fn(result);
        }
      });
    });
    $('eventModal').style.display = 'flex';
  }

  function closeEventModal() {
    $('eventModal').style.display = 'none';
  }

  function maybeSeasonEvent(onDone) {
    const roll = Math.random();
    if (roll < 0.14) {
      showEventModal(pickEvent('season'), 'season', onDone);
      return true;
    }
    if (onDone) onDone(null);
    return false;
  }

  /* ==================== 周行动（训练 / 恢复 / 媒体 / 社交） ==================== */
  const WEEK_ACTIONS = [
    { id: 'shoot', name: '投篮加练', icon: '🏀', desc: '三分/中投各+1，体力-8',
      apply() { addAttrDelta('threePT', 1); addAttrDelta('MID', 1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 8, 0, 100); return '手感更顺了：三分+1、中投+1，体力-8。'; } },
    { id: 'physical', name: '体能训练', icon: '💪', desc: '运动/力量+1，体力-12',
      apply() { addAttrDelta('ATH', 1); addAttrDelta('STR', 1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 12, 0, 100); return '体能储备提升：运动+1、力量+1，体力-12。'; } },
    { id: 'defense', name: '防守训练', icon: '🛡️', desc: '外防/抢断+1，体力-10',
      apply() { addAttrDelta('PDEF', 1); addAttrDelta('STL', 1); const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) - 10, 0, 100); return '防守脚步更稳：外防+1、抢断+1，体力-10。'; } },
    { id: 'rest', name: '充分休息', icon: '😴', desc: '体力+30，士气+2',
      apply() { const c = PP.career; c.currentStamina = clamp(parseNum(c.currentStamina, 100) + 30, 0, 100); addProfileDelta('mood', 2); return '体力+30，心情+2。'; } },
    { id: 'media', name: '媒体互动', icon: '🎙️', desc: '媒体信任+3，媒体压力-2',
      apply() { addProfileDelta('mediaTrust', 3); addSeasonMod('mediaPressure', -2); return '你主动释放信息，掌控舆论。媒体信任+3，媒体压力-2。'; } },
    { id: 'social', name: '球迷互动', icon: '❤️', desc: '球迷支持+4，热度+2',
      apply() { addProfileDelta('fanSupport', 4); addProfileDelta('fame', 1); return '你现身社区球场与球迷互动。球迷支持+4，热度+2。'; } }
  ];

  function showWeekActionModal(onDone) {
    const body = WEEK_ACTIONS.map((a, i) =>
      `<button class="event-choice" data-i="${i}"><div class="ec-label">${a.icon} ${esc(a.name)}</div><div class="ec-hint">${esc(a.desc)}</div></button>`
    ).join('');
    $('event-emoji').textContent = '📅';
    $('event-title').textContent = '周行动 · 选择一项';
    $('event-body').innerHTML = `<div>休整日，选择一项行动来调整状态。</div>`;
    $('event-choices').innerHTML = body;
    Array.from($('event-choices').children).forEach(btn => {
      btn.addEventListener('click', () => {
        const a = WEEK_ACTIONS[parseNum(btn.dataset.i, 0)];
        let result = '';
        try { result = a.apply(); } catch (e) { result = ''; }
        closeEventModal();
        if (result) showToast(a.icon + ' ' + result);
        saveGame();
        if (onDone) onDone(result);
      });
    });
    $('eventModal').style.display = 'flex';
  }

  /* ==================== UI：屏幕切换与渲染入口 ==================== */
  const SCREENS = ['screen-menu', 'screen-character', 'screen-position', 'screen-build', 'screen-reveal', 'screen-career', 'screen-season', 'screen-playoffs', 'screen-mycard'];

  function showScreen(id) {
    SCREENS.forEach(s => {
      const el = $(s);
      if (el) el.classList.toggle('active', s === id);
    });
    PP.screen = id;
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = $('pp-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function renderMenu() {
    const c = PP.career;
    PP.era = SINGLE_SEASON.year;
    const eraLabel = $('menu-era-label');
    if (eraLabel) eraLabel.textContent = SINGLE_SEASON.label;
    const cont = $('btn-continue');
    if (cont) {
      cont.disabled = !c;
      cont.style.display = c ? 'inline-flex' : 'none';
      cont.textContent = c
        ? (c.singleSeasonComplete
          ? `▶ 查看单赛季结果（${c.playerName} · OVR ${c.ovr}）`
          : `▶ 继续单赛季（${c.playerName} · OVR ${c.ovr}）`)
        : '▶ 继续单赛季';
    }
  }

  function renderCharacter() {
    const box = $('char-avatar-grid');
    box.innerHTML = AI_AVATAR_META.map((meta, i) => `
      <div class="char-avatar-cell ${PP.avatar === meta.src ? 'sel' : ''}" data-avatar="${esc(meta.src)}">
        <img src="${esc(meta.src)}" alt="${esc(meta.group)}球员大头照 ${i + 1}" onerror="this.parentElement.style.borderColor='var(--red)';">
        <div class="char-avatar-meta"><b>${esc(meta.group)}</b><span>${esc(meta.role)} · ${esc(meta.tone)}</span></div>
      </div>`).join('');
    Array.from(box.children).forEach(el => {
      el.addEventListener('click', () => {
        PP.avatar = el.dataset.avatar;
        updateCharPreview();
        renderCharacter();
      });
    });
    updateCharPreview();
    const nameInput = $('char-name-input');
    nameInput.value = PP.playerName || '';
    nameInput.oninput = () => { PP.playerName = nameInput.value.trim(); };
  }

  function updateCharPreview() {
    const img = $('char-preview-img');
    const fb = $('char-preview-fallback');
    if (PP.avatar) {
      img.src = PP.avatar;
      img.style.display = 'block';
      fb.style.display = 'none';
    } else {
      img.style.display = 'none';
      fb.style.display = 'flex';
      fb.textContent = (PP.playerName || '?').slice(0, 1);
    }
  }

  function renderPosition() {
    $('position-era-sub').textContent = `${SINGLE_SEASON.label} · 属性随机来源 · 自选位置`;
    $('pos-grid').innerHTML = POS_LIST.map(p => `
      <div class="pos-card ${PP.position === p ? 'sel' : ''}" data-pos="${p}">
        <span class="pos-emoji">${p === 'PG' ? '🧠' : p === 'SG' ? '🎯' : p === 'SF' ? '🦅' : p === 'PF' ? '🪨' : '🗼'}</span>
        <div class="pos-short">${p}</div>
        <div class="pos-name">${POSITIONS[p]}</div>
      </div>`).join('');
    Array.from($('pos-grid').children).forEach(el => {
      el.addEventListener('click', () => {
        PP.position = el.dataset.pos;
        $('btn-confirm-position').disabled = false;
        renderPosition();
      });
    });
    $('btn-confirm-position').disabled = !PP.position;
  }

  function renderBuild() {
    const b = PP.build;
    $('build-pos-indicator').textContent = `我的位置：${PP.position} ${POSITIONS[PP.position]} · 已锁定 ${b.lockCount}/13`;
    $('build-progress-area').innerHTML = `
      <div class="build-progress-row">
        <span>建球员进度</span>
        <div class="build-progress-track"><div class="build-progress-fill" style="width:${Math.round(b.lockCount / 13 * 100)}%"></div></div>
        <span>${b.lockCount}/13</span>
      </div>`;
    // 左侧属性
    const attrRows = ATTR_KEYS.map(k => {
      const v = b.lockedAttrs[k];
      const grade = getGrade(v == null ? 0 : v);
      return `<div class="bl-attr-row" title="${ATTR_DESC[k]}">
        <span class="bl-attr-name">${ATTR_CN[k]}</span>
        <div class="bl-attr-slot"><i class="${v != null ? 'locked' : (b.selectedPlayer ? 'pending' : '')}"></i></div>
        <span class="bl-attr-val ${v != null ? 'locked' : ''}">${v != null ? v : '--'}</span>
      </div>`;
    }).join('');
    $('bl-attrs').innerHTML = attrRows;
    $('bl-ovr').textContent = b.lockCount ? calcOVR(b.lockedAttrs, PP.position) : '--';
    const footer = b.lockCount < 13
      ? `<div>随机年份 → 随机球队 → 随机球员 → 锁定 1 项属性（跨位置有衰减）</div>`
      : `<div style="color:var(--gold);">全部属性已锁定！即将揭晓…</div>`;
    $('bl-footer').innerHTML = footer;
    // 右侧
    renderSlotArea();
    renderRosterArea();
  }

  function renderSlotArea() {
    const b = PP.build;
    const box = $('br-slot-area');
    if (!b.team) {
      box.innerHTML = `<div class="slot-card"><div class="slot-hint">点击「开始随机」：按 年份 → 球队 → 球员，从精选池锁定一项属性。</div><button class="btn btn-primary" id="btn-spin-team">🎰 开始随机</button></div>`;
      $('btn-spin-team').addEventListener('click', () => { spinTeam(); renderBuild(); });
      return;
    }
    const meta = teamMeta(b.team);
    const remaining = ATTR_KEYS.filter(k => b.lockedAttrs[k] == null);
    const roll = b.sourceRoll || {};
    const selectedName = b.selectedPlayer ? (b.selectedPlayer.nameCn || b.selectedPlayer.name) : '待选择';
    const selectedSource = b.selectedPlayer ? `${sourceKindLabel(b.selectedPlayer)} · ${sourcePlayerLabel(b.selectedPlayer)}` : '精选名单';
    box.innerHTML = `
      <div class="slot-card">
        <div class="slot-team">
          ${teamLogoHtml(meta, 44)}
          <div>
            <div class="slot-team-name">${esc(meta.z || meta.n)}</div>
            <div class="slot-team-sub">${meta.a} · 12 现役 + 5 名人堂惊喜卡（低概率） · 还需锁定 ${remaining.length} 项</div>
          </div>
        </div>
        <div class="slot-source-chain">
          <span class="source-chip">年份 ${esc(roll.requestedLabel || '随机')}</span><b>→</b>
          <span class="source-chip">球队 ${esc(meta.z || meta.n)}</span><b>→</b>
          <span class="source-chip">球员 ${esc(selectedName)}</span>
        </div>
        <div class="slot-source-note">球员来源：${esc(selectedSource)}${roll.playerYear && roll.playerYear !== roll.requestedYear ? ` · 抽中记录年份 ${roll.playerLabel}` : ''}</div>
        <div class="slot-controls">
          <button class="btn btn-secondary btn-small" id="btn-reroll-team">🎲 重抽年份+球队</button>
          <button class="btn btn-secondary btn-small" id="btn-swap-player" ${b.swapsLeft <= 0 ? 'disabled' : ''}>🔄 换球员（剩${b.swapsLeft}）</button>
        </div>
        ${b.selectedPlayer ? `<div class="slot-hint">已选择 ${esc(b.selectedPlayer.nameCn || b.selectedPlayer.name)}，点击下方属性锁定：</div>` : `<div class="slot-hint">点击下方球员卡片选择来源，再点属性锁定。</div>`}
      </div>`;
    $('btn-reroll-team').addEventListener('click', () => { spinTeam(); renderBuild(); });
    $('btn-swap-player').addEventListener('click', () => {
      const p = swapPlayer();
      renderBuild();
      if (p) showToast(`换人：${p.nameCn || p.name}`);
    });
  }

  function renderRosterArea() {
    const b = PP.build;
    const box = $('br-roster-area');
    if (!b.team) { box.innerHTML = ''; return; }
    const roster = b.roster;
    const cards = roster.map(p => {
      const playerKey = sourcePlayerKey(p);
      const sel = b.selectedPlayer && sourcePlayerKey(b.selectedPlayer) === playerKey;
      const used = b.usedPlayers.has(playerKey);
      const t13 = projectToThirteen(p.attrs || {});
      const top3 = ATTR_KEYS.filter(k => b.lockedAttrs[k] == null)
        .map(k => ({ k, v: t13[k] }))
        .sort((x, y) => y.v - x.v)
        .slice(0, 3);
      const attrsTxt = top3.map(x => `${ATTR_CN[x.k]}${x.v}`).join(' / ');
      return `<div class="player-card ${sel ? 'sel' : ''} ${used ? 'used' : ''}" data-pid="${esc(playerKey)}" ${used ? 'style="opacity:.35;"' : ''}>
        ${avatarHtml(p, 'pc-img', 56)}
        <div class="pc-name">${esc(p.nameCn || p.name)}</div>
        <div class="pc-pos">${ID_POS[parseNum(p.pos, 3)] || '--'} · OVR ${parseNum(p.rating, 0)}</div>
        <div class="pc-source">${esc(sourceKindLabel(p))} · ${esc(sourcePlayerLabel(p))}</div>
        <div class="pc-attrs">${attrsTxt}</div>
        ${used ? '<div class="pc-lock">已用过</div>' : (sel ? '<div class="pc-lock">✓ 已选择</div>' : '')}
      </div>`;
    }).join('');
    box.innerHTML = `<div class="roster-grid">${cards}</div>`;
    Array.from(box.querySelectorAll('.player-card')).forEach(el => {
      if (el.style.opacity === '0.35') return;
      el.addEventListener('click', () => {
        const pid = String(el.dataset.pid);
        const p = b.roster.find(x => sourcePlayerKey(x) === pid);
        if (!p) return;
        setSelectedSourcePlayer(p);
        renderBuild();
        const t13 = projectToThirteen(p.attrs || {});
        const avail = ATTR_KEYS.filter(k => b.lockedAttrs[k] == null);
        if (avail.length) {
          // 弹出属性锁定网格
          const overlay = document.createElement('div');
          overlay.className = 'modal-overlay';
          const srcPos = ID_POS[parseNum(p.pos, 3)] || 'SF';
          overlay.innerHTML = `<div class="modal-content" style="max-width:420px;">
            <div class="modal-header"><span class="help-title">锁定属性 · ${esc(p.nameCn || p.name)}</span><button class="modal-close">✕</button></div>
            <div class="attr-lock-grid">
              ${avail.map(k => {
                const raw = t13[k] != null ? t13[k] : 55;
                const pen = getPosPenalty(PP.position, srcPos, k);
                const val = clamp(Math.round(raw * pen), 25, 99);
                const g = getGrade(val);
                return `<button class="attr-lock-cell" data-k="${k}">
                  <div class="alc-name">${ATTR_CN[k]}</div>
                  <div class="alc-val">${val}</div>
                  <div class="alc-grade" style="color:${g.color};">${g.letter}${pen < 1 ? ' ↓' : ''}</div>
                </button>`;
              }).join('')}
            </div>
            <div class="slot-hint" style="margin-top:10px;">跨位置属性会按位置均值比例衰减（带 ↓ 标记）。</div>
          </div>`;
          document.body.appendChild(overlay);
          const close = () => overlay.remove();
          overlay.querySelector('.modal-close').addEventListener('click', close);
          overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
          Array.from(overlay.querySelectorAll('.attr-lock-cell')).forEach(cell => {
            cell.addEventListener('click', () => {
              close();
              lockAttr(cell.dataset.k);
            });
          });
        }
      });
    });
  }

  /* ==================== 揭幕渲染 ==================== */
  function renderReveal() {
    const c = PP.career;
    const grade = getOvrGrade(c.ovr);
    const avatarHtml0 = c.avatar
      ? `<img class="reveal-avatar" src="${esc(c.avatar)}" alt="${esc(c.playerName)}">`
      : `<div class="reveal-avatar avatar-fallback" style="display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:900;color:#fff;background:linear-gradient(145deg,#ff8a4d,#c94d1e);margin:0 auto 10px;">${esc(c.playerName.slice(0, 1))}</div>`;
    const attrRows = ATTR_KEYS.map(k => `
      <div class="reveal-attr-row"><span>${ATTR_CN[k]} <small style="color:var(--text-muted);">${ATTR_DESC[k]}</small></span><b style="color:${getGrade(c.attrs13[k]).color};">${c.attrs13[k]} ${getGrade(c.attrs13[k]).letter}</b></div>`).join('');
    const similar = c.similar.map(s => `
      <div class="similar-row">
        ${avatarHtml(s.player, 'sr-img', 40)}
        <div class="sr-name">${esc(s.player.nameCn || s.player.name)} <small style="color:var(--text-muted);">${ID_POS[parseNum(s.player.pos, 3)] || ''}</small></div>
        <div class="sr-sim">相似 ${s.sim}%</div>
      </div>`).join('');
    $('reveal-content').innerHTML = `
      <div class="reveal-card">
        ${avatarHtml0}
        <div class="reveal-name">${esc(c.playerName)}</div>
        <div class="reveal-pos">${c.position} ${POSITIONS[c.position]} · ${SINGLE_SEASON.label}</div>
        <div class="reveal-ovr">${c.ovr}</div>
        <div class="reveal-grade">${grade}</div>
        <div class="reveal-archetype">🏷️ ${c.archetype}</div>
        <div class="slot-source-note" style="margin:10px 0 0;">🏀 虎扑单赛季 · 13 项属性均来自随机 年份 → 球队 → 球员 · 历史惊喜卡每轮最多 1 张</div>
        <div class="reveal-attrs">${attrRows}</div>
        <div class="similar-title">🏀 相似球员（按属性画像）</div>
        <div class="similar-list">${similar}</div>
      </div>`;
  }

  /* ==================== 生涯球队选择 ==================== */
  function renderCareerTeam() {
    const teams = eraRosterByTeam();
    const cards = Object.keys(teams).map(id => {
      const meta = teamMeta(id);
      const players = teams[id];
      const avg = Math.round(players.slice(0, 5).reduce((s, p) => s + parseNum(p.rating, 60), 0) / Math.min(5, players.length));
      const samePos = players.filter(p => parseNum(p.pos, 0) === POS_ID[PP.career.position] || parseNum(p.pos2, 0) === POS_ID[PP.career.position]);
      const samePosRatings = samePos.map(p => parseNum(p.rating, 60)).sort((a, b) => b - a);
      const myRating = PP.career.ovr;
      let role = '替补';
      if (!samePosRatings.length) role = '首发';
      else if (myRating >= samePosRatings[0]) role = '绝对首发';
      else if (myRating >= samePosRatings[Math.min(1, samePosRatings.length - 1)]) role = '首发';
      else if (myRating >= samePosRatings[Math.min(2, samePosRatings.length - 1)]) role = '主要轮换';
      return `<div class="team-pick" data-id="${id}">
        ${teamLogoHtml(meta, 40)}
        <div class="tp-name">${esc(meta.z || meta.n)}</div>
        <div class="tp-record">首发五虎 ${avg} · 同位置${samePosRatings.length ? ' ' + samePosRatings.length + '人' : '空缺'}</div>
        <div class="tp-record" style="color:var(--orange);">预计角色：${role}</div>
      </div>`;
    }).join('');
    $('career-area').innerHTML = `
      <div class="starter-badge">我的 OVR：${PP.career.ovr}（${getOvrGrade(PP.career.ovr)}）· 选择生涯球队</div>
      <div class="team-pick-grid">${cards}</div>
      <div class="career-actions">
        <button class="btn btn-primary" id="btn-confirm-team" ${PP.career.teamId ? '' : 'disabled'}>✅ 加盟这支球队</button>
        <button class="btn btn-primary" id="btn-random-team">🎲 随机分配</button>
      </div>`;
    Array.from($('career-area').querySelectorAll('.team-pick')).forEach(el => {
      el.addEventListener('click', () => {
        const id = parseNum(el.dataset.id, 0);
        Array.from($('career-area').querySelectorAll('.team-pick')).forEach(x => x.classList.remove('sel'));
        el.classList.add('sel');
        PP.career.teamId = id;
        const confirmBtn = $('btn-confirm-team');
        if (confirmBtn) confirmBtn.disabled = false;
      });
    });
    $('btn-random-team').addEventListener('click', () => {
      const ids = Object.keys(teams);
      PP.career.teamId = parseNum(pick(ids), 0);
      renderCareerTeam();
    });
    $('btn-confirm-team').addEventListener('click', () => beginCareer());
  }

  /* ==================== 赛季界面 ==================== */
  function renderSeason() {
    const c = PP.career;
    const s = PP.season;
    if (!s || !c.teamId) { showScreen('screen-menu'); return; }
    const meta = teamMeta(c.teamId);
    $('season-team-name').textContent = esc(meta.z || meta.n);
    $('season-record').textContent = `${s.wins || 0}-${s.losses || 0}`;
    $('season-date').textContent = `第 ${(s.games || []).length} / 82 场 · ${c.seasonCount + 1} 季`;
    renderVitals();
    renderSeasonBody();
  }

  function renderVitals() {
    const v = computeVitals();
    const defs = [
      { key: 'mediaPressure', label: '媒体压力', level: v.mediaPressure >= 70 ? 'bad' : v.mediaPressure >= 40 ? 'mid' : 'good', desc: '舆论/战绩/争议综合' },
      { key: 'heat', label: '热度', level: v.heat >= 70 ? 'good' : v.heat >= 40 ? 'mid' : 'info', desc: '声望+表现+连胜' },
      { key: 'fanSupport', label: '球迷支持', level: v.fanSupport >= 70 ? 'good' : v.fanSupport >= 40 ? 'mid' : 'bad', desc: '战绩/互动/争议' },
      { key: 'stamina', label: '体力', level: v.stamina >= 60 ? 'good' : v.stamina >= 30 ? 'mid' : 'bad', desc: '每场消耗，休息可恢复' },
      { key: 'morale', label: '士气', level: v.morale >= 60 ? 'good' : v.morale >= 35 ? 'mid' : 'bad', desc: '近况+球队化学反应' },
      { key: 'lockerRoom', label: '更衣室', level: v.lockerRoom >= 60 ? 'good' : v.lockerRoom >= 35 ? 'mid' : 'bad', desc: '队友信任+领袖气质' },
      { key: 'coachTrust', label: '教练信任', level: v.coachTrust >= 60 ? 'good' : v.coachTrust >= 35 ? 'mid' : 'bad', desc: '出勤+沟通+表现' },
      { key: 'controversy', label: '争议度', level: v.controversy >= 60 ? 'bad' : v.controversy >= 30 ? 'mid' : 'good', desc: '场外负面话题' },
      { key: 'fame', label: '声望', level: v.fame >= 60 ? 'good' : v.fame >= 30 ? 'mid' : 'info', desc: '生涯积累' },
      { key: 'business', label: '商业价值', level: v.business >= 60 ? 'good' : v.business >= 30 ? 'mid' : 'info', desc: '代言/热度变现' },
      { key: 'chinaHeat', label: '中国热度', level: v.chinaHeat >= 60 ? 'good' : v.chinaHeat >= 30 ? 'mid' : 'info', desc: '国内人气' },
      { key: 'ppg', label: '近5场得分', value: v.ppgLast5, level: v.ppgLast5 >= 25 ? 'good' : v.ppgLast5 >= 15 ? 'mid' : 'bad', desc: '近5场场均' }
    ];
    $('vitals-panel').innerHTML = defs.map(d => {
      const val = d.value != null ? d.value : v[d.key];
      const pct = d.key === 'ppg' ? clamp(Math.round(val / 40 * 100), 0, 100) : val;
      return `<div class="vital">
        <div class="vital-label"><span>${d.label}</span><b>${val}${d.key === 'ppg' ? ' 分' : d.key === 'stamina' ? '%' : ''}</b></div>
        <div class="vital-track"><i class="${d.level}" style="width:${pct}%"></i></div>
        <div class="vital-desc">${d.desc}</div>
      </div>`;
    }).join('');
  }

  function renderSeasonBody() {
    const c = PP.career;
    const s = PP.season;
    const games = s.games || [];
    const meta = teamMeta(c.teamId);
    const schedule = s.schedule || [];
    const nextGameIdx = games.length;
    const box = $('season-body');
    const avg = seasonAverages();
    let nextHtml = '';
    if (nextGameIdx < 82) {
      const pair = schedule[nextGameIdx] && schedule[nextGameIdx][0];
      const isHome = parseNum(pair.homeTeamId, 0) === c.teamId;
      const oppMeta = teamMeta(isHome ? pair.awayTeamId : pair.homeTeamId);
      nextHtml = `<div class="season-body-card next-game">
        <div class="sb-head"><h3>下一场 · 第 ${nextGameIdx + 1} 场</h3><span class="sb-sub">${isHome ? '主场' : '客场'}</span></div>
        <div class="ng-matchup">
          <div class="ng-team">${teamLogoHtml(meta, 34)}<span>${esc(meta.z)}</span></div>
          <span class="ng-vs">VS</span>
          <div class="ng-team" style="justify-content:flex-end;flex-direction:row-reverse;">${teamLogoHtml(oppMeta, 34)}<span>${esc(oppMeta.z)}</span></div>
        </div>
        <div class="ng-meta"><span>体力：${Math.round(parseNum(c.currentStamina, 100))}/100</span><span>我的场均：${avg.pts} 分 ${avg.reb} 板 ${avg.ast} 助</span></div>
        <div class="ng-actions">
          <button class="btn btn-primary btn-small" id="btn-sim-next">🏀 模拟本场</button>
          <button class="btn btn-secondary btn-small" id="btn-sim-10">⏩ 快进10场</button>
        </div>
        <div class="ng-actions">
          <button class="btn btn-secondary btn-small" id="btn-sim-all">⚡ 模拟剩余全部</button>
          <button class="btn btn-secondary btn-small" id="btn-week-action">📅 周行动</button>
        </div>
      </div>`;
    } else {
      nextHtml = `<div class="season-body-card">
        <div class="sb-head"><h3>常规赛结束</h3><span class="sb-sub">${s.wins}-${s.losses}</span></div>
        <button class="btn btn-primary" id="btn-to-playoffs">🏀 进入季后赛阶段</button>
      </div>`;
    }
    const recent = games.slice(-16).reverse().map(g => {
      const isHome = parseNum(g.homeTeamId, 0) === c.teamId;
      const oppMeta = teamMeta(isHome ? g.awayTeamId : g.homeTeamId);
      const myScore = isHome ? g.homeScore : g.awayScore;
      const oppScore = isHome ? g.awayScore : g.homeScore;
      return `<div class="game-row">
        <span class="gr-no">#${g.idx + 1}</span>
        <span class="gr-result ${g.win ? 'w' : 'l'}">${g.win ? '胜' : '负'}</span>
        <span class="gr-opp">${esc(oppMeta.z)}</span>
        <span class="gr-score">${myScore}-${oppScore}</span>
        <span class="gr-mine">${g.myRow ? parseNum(g.myRow.pts, 0) + '分' : '缺阵'}</span>
      </div>`;
    }).join('');
    const dots = games.slice(0, 82).map(g => `<i class="${g.win ? 'w' : 'l'}"></i>`).join('');
    const dotsPending = '<i class="pending"></i>'.repeat(Math.max(0, 82 - games.length));
    box.innerHTML = nextHtml + `
      <div class="season-body-card">
        <div class="sb-head"><h3>近期战绩</h3><span class="sb-sub">场均 ${avg.pts}/${avg.reb}/${avg.ast}</span></div>
        ${recent}
        <div class="schedule-dots">${dots}${dotsPending}</div>
      </div>`;
    if (nextGameIdx < 82) {
      $('btn-sim-next').addEventListener('click', () => simNextGame());
      $('btn-sim-10').addEventListener('click', () => simBatch(10));
      $('btn-sim-all').addEventListener('click', () => simBatch(82));
      $('btn-week-action').addEventListener('click', () => showWeekActionModal(() => renderSeason()));
    } else {
      $('btn-to-playoffs').addEventListener('click', () => enterPlayoffs());
    }
    Array.from(box.querySelectorAll('.game-row')).forEach(el => {});
  }

  /* ==================== 赛季模拟流程 ==================== */
  async function simNextGame() {
    if (PP.busy) return;
    PP.busy = true;
    try {
      const s = PP.season;
      const games = s.games || [];
      if (games.length >= 82) return;
      const schedule = s.schedule || [];
      const roundIdx = games.length;
      const pair = schedule[roundIdx] && schedule[roundIdx][0];
      if (!pair) return;
      // 随机事件（每场 14%）
      const eventDone = await new Promise(resolve => {
        if (Math.random() < 0.14 && games.length >= 1) {
          maybeSeasonEvent(() => resolve(true));
        } else resolve(false);
      });
      const game = await simulateOneGame(pair, games.length, 'regular', roundIdx);
      if (game) {
        applyGameToSeason(game);
        renderSeason();
        showGameModal(game);
      }
    } catch (err) {
      console.error(err);
      showToast('模拟出错：' + (err.message || err));
    } finally {
      PP.busy = false;
    }
  }

  async function simBatch(count) {
    if (PP.busy) return;
    PP.busy = true;
    showToast('批量模拟中…');
    try {
      const s = PP.season;
      const target = Math.min(82, (s.games || []).length + count);
      while ((s.games || []).length < target) {
        const games = s.games || [];
        const schedule = s.schedule || [];
        const roundIdx = games.length;
        const pair = schedule[roundIdx] && schedule[roundIdx][0];
        if (!pair) break;
        // 每10场一次随机事件
        if (games.length > 0 && games.length % 10 === 0 && Math.random() < 0.6) {
          await new Promise(resolve => maybeSeasonEvent(() => resolve()));
        }
        const game = await simulateOneGame(pair, games.length, 'regular', roundIdx);
        if (!game) break;
        applyGameToSeason(game);
        await sleep(0);
      }
      renderSeason();
      saveGame();
      if ((s.games || []).length >= 82) {
        showToast('常规赛结束！进入季后赛阶段');
        enterPlayoffs();
      } else {
        showToast(`已模拟到第 ${(s.games || []).length} 场`);
      }
    } catch (err) {
      console.error(err);
      showToast('批量模拟出错：' + (err.message || err));
    } finally {
      PP.busy = false;
    }
  }

  function showGameModal(game) {
    const c = PP.career;
    const isHome = parseNum(game.homeTeamId, 0) === c.teamId;
    const myMeta = teamMeta(c.teamId);
    const oppMeta = teamMeta(isHome ? game.awayTeamId : game.homeTeamId);
    const myScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;
    const periods = game.flow && game.flow.myPeriods ? game.flow : null;
    const myPeriods = periods ? periods.myPeriods : [];
    const oppPeriods = periods ? periods.oppPeriods : [];
    const periodHtml = periods
      ? `<div class="game-periods"><span>${myPeriods.map((v, i) => `<b>${v}</b>`).join('</span><span>')}</span></div>`
      : '';
    $('game-head').innerHTML = `
      <div class="gh-teams">
        <div class="gh-team">${teamLogoHtml(myMeta, 46)}<span class="gh-name">${esc(myMeta.z)}</span><span class="gh-score">${myScore}</span></div>
        <span style="color:var(--text-muted);font-weight:800;">VS</span>
        <div class="gh-team">${teamLogoHtml(oppMeta, 46)}<span class="gh-name">${esc(oppMeta.z)}</span><span class="gh-score">${oppScore}</span></div>
      </div>
      <div class="gh-winner">${game.win ? '✅ 球队获胜' : '❌ 球队失利'}${periodHtml ? '<div style="margin-top:6px;">' + periodHtml + '</div>' : ''}</div>`;
    const row = game.myRow;
    $('game-body').innerHTML = row
      ? `<h4>我的表现</h4><div class="my-line">
          ${[['pts', '得分', row.pts], ['reb', '篮板', row.reb], ['ast', '助攻', row.ast], ['stl', '抢断', row.stl], ['blk', '盖帽', row.blk], ['tov', '失误', row.tov]].map(([k, label, v]) =>
            `<div class="stat"><b>${parseNum(v, 0)}</b><span>${label}</span></div>`).join('')}
        </div>
        <h4>命中率</h4><div class="my-line">
          <div class="stat"><b>${parseNum(row.fgm, 0)}/${parseNum(row.fga, 0)}</b><span>投篮</span></div>
          <div class="stat"><b>${parseNum(row.tpm, 0)}/${parseNum(row.tpa, 0)}</b><span>三分</span></div>
          <div class="stat"><b>${parseNum(row.ftm, 0)}/${parseNum(row.fta, 0)}</b><span>罚球</span></div>
          <div class="stat"><b>${parseNum(row.mins, 0)}</b><span>分钟</span></div>
        </div>`
      : `<div class="muted" style="text-align:center;padding:18px;">本场缺阵（伤病/轮休）</div>`;
    $('gameModal').style.display = 'flex';
    $('game-close').onclick = () => {
      $('gameModal').style.display = 'none';
    };
  }

  /* ==================== 季后赛 ==================== */
  function standingsByConference() {
    const rows = typeof getLeagueTeamRecordsArray === 'function' ? getLeagueTeamRecordsArray() : [];
    const east = rows.filter(r => (teamMeta(r.id).c === 'East')).sort((a, b) => b.pct - a.pct || b.w - a.w);
    const west = rows.filter(r => (teamMeta(r.id).c === 'West')).sort((a, b) => b.pct - a.pct || b.w - a.w);
    return { east, west };
  }

  function enterPlayoffs() {
    const s = PP.season;
    s.isPlayoffs = true;
    // 快照常规赛数据，季后赛结束后恢复
    PP._recordsSnapshot = clone(G.leagueSeason.teamRecords || {});
    PP._playerStatsSnapshot = clone(G.leagueSeason.playerStats || {});
    const byConf = standingsByConference();
    const myId = parseNum(PP.career.teamId, 0);
    s.playoffState = {
      stage: 'playin',
      east: buildPlayoffBracket(byConf.east, myId),
      west: buildPlayoffBracket(byConf.west, myId),
      currentRound: 0,
      champion: null
    };
    saveGame();
    renderPlayoffs();
    showScreen('screen-playoffs');
  }

  function buildPlayoffBracket(standings, myId) {
    const seeds = standings.map((r, i) => ({ id: r.id, seed: i + 1, wins: 0, losses: 0, eliminated: false, isMy: parseNum(r.id, 0) === parseNum(myId, 0), done: false, next: null }));
    const playIn = {
      g7v8: { a: seeds[6], b: seeds[7], winner: null, loser: null, done: false },
      g9v10: { a: seeds[8], b: seeds[9], winner: null, loser: null, done: false },
      gPlay: null, // 9/10胜者 vs 7v8败者
      done: false
    };
    return { seeds, playIn, series: [], champion: null };
  }

  async function runPlayIn(conf) {
    const bracket = conf === 'east' ? PP.season.playoffState.east : PP.season.playoffState.west;
    const pi = bracket.playIn;
    const runGame = async (a, b) => {
      const g = await simulateOneGame({ homeTeamId: a.id, awayTeamId: b.id }, 0, 'playoffs', 0);
      recordPlayoffGame(g);
      return g;
    };
    const g1 = await runGame(pi.g7v8.a, pi.g7v8.b);
    const winner78 = g1.homeWin ? pi.g7v8.a : pi.g7v8.b;
    const loser78 = winner78 === pi.g7v8.a ? pi.g7v8.b : pi.g7v8.a;
    pi.g7v8.done = true;
    pi.g7v8.winner = winner78;
    pi.g7v8.loser = loser78;
    const g2 = await runGame(pi.g9v10.a, pi.g9v10.b);
    const winner910 = g2.homeWin ? pi.g9v10.a : pi.g9v10.b;
    pi.g9v10.done = true;
    pi.g9v10.winner = winner910;
    const g3 = await runGame(loser78, winner910);
    const finalWinner = g3.homeWin ? loser78 : winner910;
    pi.gPlay = { winner: finalWinner, done: true };
    pi.done = true;
    // 确定种子 7/8
    const seeds = bracket.seeds;
    seeds[6] = winner78;
    seeds[7] = finalWinner;
    return { winner78, finalWinner, games: [g1, g2, g3] };
  }

  function seriesSchedule(a, b, round) {
    const higher = a.seed <= b.seed ? a : b;
    const lower = higher === a ? b : a;
    const games = [];
    for (let i = 0; i < 7; i++) {
      // 2-2-1-1-1
      const homeIsHigher = i === 0 || i === 1 || i === 4 || i === 6;
      const home = (i < 4) ? ((i < 2) ? higher : lower) : ((i < 5) ? higher : (i < 6 ? lower : higher));
      games.push({ home: home.id, away: (home === higher ? lower : higher).id });
    }
    return { higher, lower, games, round };
  }

  async function runSeries(conf, roundIdx, sIdx) {
    const bracket = PP.season.playoffState[conf];
    const series = bracket.series ? bracket.series[roundIdx][sIdx] : bracket;
    const wins = { a: 0, b: 0 };
    for (let gIdx = 0; gIdx < series.games.length; gIdx++) {
      const pair = series.games[gIdx];
      const game = await simulateOneGame({ homeTeamId: pair.home, awayTeamId: pair.away }, gIdx, 'playoffs', roundIdx);
      recordPlayoffGame(game);
      if (!game) {
        console.warn('[perfect-player] playoff game skipped (null)', JSON.stringify({ conf, roundIdx, sIdx, gIdx, pair }));
        continue;
      }
      const homeWin = game.homeWin;
      const homeTeam = homeWin ? pair.home : pair.away;
      if (homeTeam === series.higher.id) wins.a++;
      else wins.b++;
      if (wins.a === 4 || wins.b === 4) {
        series.winner = wins.a === 4 ? series.higher : series.lower;
        series.loser = wins.a === 4 ? series.lower : series.higher;
        series.done = true;
        series.score = `${wins.a}-${wins.b}`;
        return series;
      }
    }
    series.winner = wins.a >= wins.b ? series.higher : series.lower;
    series.done = true;
    series.score = `${wins.a}-${wins.b}`;
    return series;
  }

  function recordPlayoffGame(game) {
    if (!game) return;
    const myId = parseNum(PP.career.teamId, 0);
    if (parseNum(game.homeTeamId, 0) !== myId && parseNum(game.awayTeamId, 0) !== myId) return;
    PP.season.playoffGameLog = PP.season.playoffGameLog || [];
    PP.season.playoffGameLog.push({
      myRow: game.myRow,
      win: game.win,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      phase: game.phase
    });
  }

  async function runPlayoffs() {
    if (PP.busy) return;
    PP.busy = true;
    const st = PP.season.playoffState;
    const myId = parseNum(PP.career.teamId, 0);
    try {
      if (!PP._recordsSnapshot) {
        PP._recordsSnapshot = clone(G.leagueSeason.teamRecords || {});
        PP._playerStatsSnapshot = clone(G.leagueSeason.playerStats || {});
      }
      // 附加赛
      if (!st.east.playIn.done) await runPlayIn('east');
      if (!st.west.playIn.done) await runPlayIn('west');
      st.stage = 'bracket';
      // 首轮
      [['east', st.east], ['west', st.west]].forEach(([conf, b]) => {
        if (!b.series[0]) {
          b.series[0] = [
            seriesSchedule(b.seeds[0], b.seeds[7], 0),
            seriesSchedule(b.seeds[3], b.seeds[4], 0),
            seriesSchedule(b.seeds[1], b.seeds[6], 0),
            seriesSchedule(b.seeds[2], b.seeds[5], 0)
          ];
        }
      });
      // 逐轮模拟
      const rounds = [
        { idx: 0, series: 4 },
        { idx: 1, series: 2 },
        { idx: 2, series: 1 }
      ];
      for (const r of rounds) {
        for (const conf of ['east', 'west']) {
          const b = st[conf];
          if (b.series[r.idx].some(x => !x.done)) {
            for (let i = 0; i < r.series; i++) {
              await runSeries(conf, r.idx, i);
            }
          }
        }
        // 生成下一轮对阵
        if (r.idx < 2) {
          for (const conf of ['east', 'west']) {
            const b = st[conf];
            if (!b.series[r.idx + 1]) {
              const winners = b.series[r.idx].map(x => x.winner);
              b.series[r.idx + 1] = [
                seriesSchedule({ ...winners[0], seed: 1 }, { ...winners[1], seed: 4 }, r.idx + 1),
                seriesSchedule({ ...winners[2], seed: 2 }, { ...winners[3], seed: 3 }, r.idx + 1)
              ];
            }
          }
        }
      }
      // 总决赛
      const eastChamp = st.east.series[2][0].winner;
      const westChamp = st.west.series[2][0].winner;
      if (!st.finals) {
        st.finals = seriesSchedule({ ...eastChamp, seed: 1 }, { ...westChamp, seed: 2 }, 3);
      }
      await runSeries('finals', 3, 0);
      const champ = st.finals.winner;
      st.champion = champ;
      st.stage = 'done';
      // 恢复常规赛数据
      if (PP._recordsSnapshot) G.leagueSeason.teamRecords = PP._recordsSnapshot;
      if (PP._playerStatsSnapshot) G.leagueSeason.playerStats = PP._playerStatsSnapshot;
      // 我的季后赛统计
      const myGames = collectMyPlayoffGames();
      PP.season.playoffGames = myGames;
      PP.season.playoffStats = myGames.reduce((acc, g) => {
        const r = g.myRow;
        if (!r) return acc;
        acc.games++;
        ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'fga', 'ftm', 'fta', 'mins'].forEach(k => { acc[k] += parseNum(r[k], 0); });
        acc.threeM += parseNum(r.tpm, 0);
        acc.threeA += parseNum(r.tpa, 0);
        return acc;
      }, emptyStats());
      if (parseNum(champ.id, 0) === parseNum(myId, 0)) {
        PP.career.conquest[String(myId)] = (PP.career.conquest[String(myId)] || 0) + 1;
        PP.career.honors.push({ season: PP.career.seasonCount + 1, label: '总冠军', teamId: myId });
        showToast('🏆 总冠军！');
      }
      computeSeasonAwards();
      finishSeason();
      saveGame();
      renderPlayoffs();
    } catch (err) {
      console.error(err);
      showToast('季后赛模拟出错：' + (err.message || err));
    } finally {
      PP.busy = false;
    }
  }

  function collectMyPlayoffGames() {
    return PP.season.playoffGameLog || [];
  }

  function renderPlayoffs() {
    const s = PP.season;
    const st = s.playoffState;
    if (!st) { showScreen('screen-season'); return; }
    $('po-team-name').textContent = esc(teamMeta(PP.career.teamId).z || '--');
    const myId = parseNum(PP.career.teamId, 0);
    let html = '';
    if (st.stage === 'playin' || st.stage === 'bracket') {
      html += `<div class="po-round-label">${st.stage === 'playin' ? '附加赛 7-10 名' : '季后赛对阵'}</div>
        <button class="btn btn-primary" id="btn-run-playoffs">🏀 模拟季后赛</button>
        <div style="margin-top:12px;">`;
      ['east', 'west'].forEach(conf => {
        const b = st[conf];
        const confName = conf === 'east' ? '东部' : '西部';
        const pi = b.playIn;
        html += `<div class="po-series">
          <div class="ps-head"><span>${confName} · 附加赛</span><span>${pi.done ? '已完成' : '待模拟'}</span></div>
          ${pi.done ? `<div class="ps-done">7-8胜者：${esc(teamMeta(pi.g7v8.winner.id).z)} · 第8名：${esc(teamMeta(pi.gPlay.winner.id).z)}</div>` : ''}
        </div>`;
        (b.series || []).forEach((round, ri) => {
          if (!round) return;
          const roundName = ['首轮', '分区半决赛', '分区决赛'][ri] || ('第' + (ri + 1) + '轮');
          html += `<div class="po-round-label" style="font-size:12px;color:var(--text-dim);">${confName} · ${roundName}</div>`;
          round.forEach(sr => {
            if (!sr) return;
            const isMy = parseNum(sr.higher.id, 0) === myId || parseNum(sr.lower.id, 0) === myId;
            html += `<div class="po-series">
              <div class="ps-head"><span>${isMy ? '⭐ 我的系列赛' : '系列赛'}</span><span>${sr.done ? sr.score + ' · 完成' : '待模拟'}</span></div>
              ${seriesRow(sr.higher, sr)}${seriesRow(sr.lower, sr)}
              ${sr.done ? `<div class="ps-done">${esc(teamMeta(sr.winner.id).z)} 晋级</div>` : ''}
            </div>`;
          });
        });
      });
      if (st.finals) {
        html += `<div class="po-round-label" style="font-size:12px;color:var(--text-dim);">总决赛</div>`;
        const f = st.finals;
        html += `<div class="po-series">
          <div class="ps-head"><span>⭐ ${f.done ? '已结束' : '待模拟'}</span></div>
          ${seriesRow(f.higher, f)}${seriesRow(f.lower, f)}
          ${f.done ? `<div class="ps-done">🏆 ${esc(teamMeta(f.winner.id).z)} 总冠军</div>` : ''}
        </div>`;
      }
      html += `</div>`;
    } else if (st.stage === 'done') {
      const champ = st.champion;
      const isChamp = parseNum(champ && champ.id, 0) === myId;
      html += `<div class="po-champ">
        <div class="pc-trophy">${isChamp ? '🏆' : '🥈'}</div>
        <div class="pc-title">${isChamp ? '总冠军！' : esc(teamMeta(champ && champ.id).z || '--') + ' 夺冠'}</div>
        <div class="pc-sub">${isChamp ? '你带领球队登顶联盟' : '来年再战'}</div>
      </div>
      <button class="btn btn-primary" id="btn-season-done">📋 查看赛季总结</button>`;
    }
    $('playoff-body').innerHTML = html;
    const runBtn = $('btn-run-playoffs');
    if (runBtn) runBtn.addEventListener('click', () => runPlayoffs());
    const doneBtn = $('btn-season-done');
    if (doneBtn) doneBtn.addEventListener('click', () => showSeasonResults());
  }

  function seriesRow(team, sr) {
    const isMy = parseNum(team.id, 0) === parseNum(PP.career.teamId, 0);
    return `<div class="ps-row ${isMy ? 'ps-my' : ''}">
      ${teamLogoHtml(teamMeta(team.id), 30)}
      <span class="ps-name">${isMy ? '⭐ ' : ''}${esc(teamMeta(team.id).z)}</span>
      <span class="ps-wins">${sr.done ? (sr.winner.id === team.id ? 4 : seriesLoses(sr, team)) : '--'}</span>
    </div>`;
  }
  function seriesLoses(sr, team) {
    const [a, b] = String(sr.score || '0-0').split('-').map(Number);
    return sr.winner && sr.winner.id === team.id ? a : b;
  }

  function showSeasonResults() {
    const s = PP.season;
    const c = PP.career;
    c.singleSeasonComplete = true;
    c.seasonCount = 1;
    s.singleSeasonComplete = true;
    saveGame();
    const avg = seasonAverages();
    const po = s.playoffStats || emptyStats();
    const poAvg = po.games ? {
      pts: +(po.pts / po.games).toFixed(1),
      reb: +(po.reb / po.games).toFixed(1),
      ast: +(po.ast / po.games).toFixed(1)
    } : null;
    const champ = s.playoffState && s.playoffState.champion;
    const isChamp = champ && parseNum(champ.id, 0) === parseNum(PP.career.teamId, 0);
    const resultLabel = isChamp ? '🏆 总冠军' : (champ ? `总决赛：${esc(teamMeta(champ.id).z)} 夺冠` : (s.wins >= 41 ? '打进季后赛' : '未进季后赛'));
    const awards = (s.awards || []).map(a => `<span class="event-badge" style="margin:4px;">${esc(a)}</span>`).join('');
    const html = `
      <div class="po-champ">
        <div class="pc-trophy">${isChamp ? '🏆' : '📊'}</div>
        <div class="pc-title">${s.wins}-${s.losses} · ${resultLabel}</div>
         <div class="pc-sub">虎扑单赛季已结束 · 不进入下一赛季</div>
      </div>
      <div class="season-body-card">
        <div class="sb-head"><h3>常规赛场均</h3></div>
        <div class="stats-grid">
          ${[['pts', avg.pts], ['reb', avg.reb], ['ast', avg.ast], ['stl', avg.stl], ['blk', avg.blk], ['gp', avg.gp]].map(([k, v]) =>
            `<div class="stat-cell ${k === 'pts' ? 'hl' : ''}"><b>${v}</b><span>${k === 'pts' ? '得分' : k === 'reb' ? '篮板' : k === 'ast' ? '助攻' : k === 'stl' ? '抢断' : k === 'blk' ? '盖帽' : '场次'}</span></div>`).join('')}
        </div>
      </div>
      ${poAvg ? `<div class="season-body-card">
        <div class="sb-head"><h3>季后赛（${po.games} 场）</h3></div>
        <div class="stats-grid">
          ${[['pts', poAvg.pts], ['reb', poAvg.reb], ['ast', poAvg.ast]].map(([k, v]) =>
            `<div class="stat-cell hl"><b>${v}</b><span>${k === 'pts' ? '得分' : k === 'reb' ? '篮板' : '助攻'}</span></div>`).join('')}
        </div>
      </div>` : ''}
      ${awards ? `<div class="season-body-card"><div class="sb-head"><h3>赛季荣誉</h3></div>${awards}</div>` : ''}
      <button class="btn btn-primary" id="btn-single-season-done">🏁 完成本赛季</button>`;
    $('playoff-body').innerHTML = html;
    $('btn-single-season-done').addEventListener('click', () => {
      saveGame();
      renderMenu();
      showScreen('screen-menu');
      showToast('单赛季已完成，可新建下一位球员');
    });
  }

  function computeSeasonAwards() {
    const s = PP.season;
    s.awards = s.awards || [];
    const avg = seasonAverages();
    const c = PP.career;
    const teamWinPct = (s.wins || 0) / Math.max(1, (s.wins || 0) + (s.losses || 0));
    if (c.seasonCount === 0 && avg.pts >= 15) s.awards.push(`最佳新秀候选（场均 ${avg.pts} 分）`);
    if (avg.pts >= 30) s.awards.push('得分王级表现（场均30+）');
    if (avg.pts >= 25 && teamWinPct >= 0.65) s.awards.push('MVP 候选');
    if (avg.pts >= 25) s.awards.push('全明星级别');
    if (avg.pts >= 20 && avg.ast >= 8) s.awards.push('两双常客');
    if (avg.pts >= 15 && avg.reb >= 10) s.awards.push('场均两双');
    if (c.seasonCount === 0) s.awards.push('新秀赛季');
    // 从联盟数据拿真实荣誉
    try {
      if (typeof leagueAwardEntryForSeason === 'function') {
        const entry = leagueAwardEntryForSeason(G.season);
        if (entry && entry.mvp && typeof entry.mvp === 'object') {
          if (String(entry.mvp.name || entry.mvp.rowName || '').indexOf(c.playerName) >= 0) s.awards.push('MVP 🏆');
        }
      }
    } catch (e) { /* ignore */ }
  }

  function finishSeason() {
    const c = PP.career;
    const s = PP.season;
    const avg = seasonAverages();
    // 累计生涯数据
    const st = s.playerStats || emptyStats();
    ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'fga', 'ftm', 'fta', 'threeM', 'threeA', 'mins', 'games'].forEach(k => {
      c.totalStats[k] = parseNum(c.totalStats[k], 0) + parseNum(st[k], 0);
    });
    const po = s.playoffStats || emptyStats();
    ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'fga', 'ftm', 'fta', 'threeM', 'threeA', 'mins', 'games'].forEach(k => {
      c.playoffStats[k] = parseNum(c.playoffStats[k], 0) + parseNum(po[k], 0);
    });
    const champ = s.playoffState && s.playoffState.champion;
    const isChamp = champ && parseNum(champ.id, 0) === parseNum(c.teamId, 0);
    c.seasons.push({
      season: c.seasonCount + 1,
      age: c.age,
      teamId: c.teamId,
      wins: s.wins,
      losses: s.losses,
      avg: { ...avg },
      playoffResult: isChamp ? '总冠军' : (champ ? '亚军' : (s.wins >= 41 ? '季后赛' : '未进季后赛')),
      ovr: c.ovr,
      awards: s.awards || []
    });
    c.totalAwards = c.totalAwards || [];
    (s.awards || []).forEach(a => c.totalAwards.push({ season: c.seasonCount + 1, label: a }));
    // 成长 / 衰退
    const age = c.age + 1;
    c.age = age;
    const growth = age <= 26 ? 2 : age <= 28 ? 1 : age >= 34 ? -2 : age >= 31 ? -1 : 0;
    const improved = growth >= 0;
    if (improved) {
      // 提升最弱项（均衡成长）
      const weakest = ATTR_KEYS.slice().sort((a, b) => c.attrs13[a] - c.attrs13[b]).slice(0, Math.max(1, Math.abs(growth)));
      weakest.forEach(k => addAttrDelta(k, 1));
    } else {
      const weakest = ATTR_KEYS.slice().sort((a, b) => c.attrs13[a] - c.attrs13[b]).slice(0, Math.abs(growth));
      weakest.forEach(k => addAttrDelta(k, -1));
    }
    c.ovr = calcOVR(c.attrs13, c.position);
    c.contract = Math.max(0, c.contract - 1);
    // 下赛季修正衰减
    const mods = c.seasonMods;
    Object.keys(mods).forEach(k => { mods[k] = Math.round(parseNum(mods[k], 0) * 0.5); });
    c.currentStamina = 100;
    c.seasonCount = 1;
    c.singleSeasonComplete = true;
    s.singleSeasonComplete = true;
  }

  /* ==================== 休赛期 ==================== */
  function startOffseason() {
    showToast('当前为虎扑单赛季模式，不进入休赛期');
  }

  function renderOffseason() {
    const c = PP.career;
    const box = $('offseason-body');
    const offers = contractOffers();
    const age = c.age;
    const retireOffer = age >= 36 || c.ovr < 62;
    box.innerHTML = `
      <div class="offseason-step">
        <h3>🧬 年龄与状态</h3>
        <div class="offer-card">
          <div class="oc-detail">当前年龄 <b>${age}</b> 岁 · OVR <b>${c.ovr}</b>（${getOvrGrade(c.ovr)}）· 合同剩余 <b>${c.contract}</b> 年</div>
          ${retireOffer ? `<div class="oc-detail" style="color:var(--orange);">⚠️ 球队与联盟建议你考虑退役。</div>` : ''}
        </div>
      </div>
      <div class="offseason-step">
        <h3>📋 合同选择</h3>
        <div class="offer-card">
          <div class="oc-team">${teamLogoHtml(teamMeta(c.teamId), 34)}<span>${esc(teamMeta(c.teamId).z)} · 续约报价</span></div>
          <div class="oc-detail">年薪 <b>${formatSalaryM(offerAmount(c.teamId, offers))}</b> · ${c.contract === 0 ? '合同到期，可以试水自由市场' : '提前续约'}</div>
          <div class="offer-actions">
            <button class="btn btn-primary btn-small" id="btn-renew">✅ 续约留队</button>
            <button class="btn btn-secondary btn-small" id="btn-fa">🏃 试水自由市场</button>
          </div>
        </div>
      </div>
      <div class="offseason-step">
        <h3>🏆 休赛期事件</h3>
        <button class="btn btn-secondary" id="btn-offseason-event">🎲 触发休赛期随机事件</button>
      </div>
      <div class="offseason-step">
        <h3>🚀 开启下一季</h3>
        <button class="btn btn-primary" id="btn-next-season">🏀 开始第 ${c.seasonCount + 2} 季</button>
      </div>
      ${retireOffer ? `<div class="offseason-step"><h3>🏁 生涯终点</h3><button class="btn btn-danger-ghost" id="btn-retire" style="color:var(--red);">🏁 宣布退役</button></div>` : ''}`;
    $('btn-renew').addEventListener('click', () => {
      c.contract = Math.max(2, c.contract === 0 ? 4 : c.contract);
      c.teamId = c.teamId;
      showToast(`已续约 ${esc(teamMeta(c.teamId).z)}，合同剩余 ${c.contract} 年`);
      saveGame();
      renderOffseason();
    });
    $('btn-fa').addEventListener('click', () => renderFreeAgency());
    $('btn-offseason-event').addEventListener('click', () => {
      showEventModal(pickEvent('offseason'), 'offseason', () => renderOffseason());
    });
    $('btn-next-season').addEventListener('click', () => nextSeason());
    const retireBtn = $('btn-retire');
    if (retireBtn) retireBtn.addEventListener('click', () => doRetire());
  }

  function offerAmount(teamId, offers) {
    const off = (offers || []).find(o => parseNum(o.teamId, 0) === parseNum(teamId, 0));
    return off ? off.amount : Math.max(6, Math.round((PP.career.ovr - 60) * 0.9));
  }

  function contractOffers() {
    const c = PP.career;
    const base = Math.max(6, Math.round((c.ovr - 60) * 0.9));
    const teams = Object.keys(LEAGUE.teams || {}).map(Number).filter(id => id && id !== parseNum(c.teamId, 0));
    const picks = shuffle(teams).slice(0, 3).map(id => {
      const meta = teamMeta(id);
      const premium = c.ovr >= 85 ? 1.5 : c.ovr >= 75 ? 1.15 : 1;
      return {
        teamId: id,
        teamName: meta.z,
        amount: Math.round(base * premium * (0.85 + Math.random() * 0.3)),
        years: c.ovr >= 80 ? 4 : 3
      };
    });
    // 加入母队
    const home = {
      teamId: c.teamId,
      teamName: teamMeta(c.teamId).z,
      amount: Math.round(base * 1.25),
      years: c.contract > 0 ? c.contract : 4,
      home: true
    };
    return [home, ...picks];
  }

  function renderFreeAgency() {
    const c = PP.career;
    const offers = contractOffers();
    $('offseason-body').innerHTML = `
      <div class="offseason-step">
        <h3>🏃 自由市场报价</h3>
        ${offers.map(o => `
          <div class="offer-card">
            <div class="oc-team">${teamLogoHtml(teamMeta(o.teamId), 34)}<span>${esc(o.teamName)}</span></div>
            <div class="oc-detail">年薪 <b>${formatSalaryM(o.amount)}</b> · ${o.years} 年${o.home ? ' · 母队' : ''}</div>
            <div class="offer-actions">
              <button class="btn btn-primary btn-small" data-fa="${o.teamId}">✍️ 签约</button>
            </div>
          </div>`).join('')}
        <button class="btn btn-secondary" id="btn-fa-back">◀ 返回</button>
      </div>`;
    Array.from($('offseason-body').querySelectorAll('[data-fa]')).forEach(btn => {
      btn.addEventListener('click', () => {
        const tid = parseNum(btn.dataset.fa, 0);
        const off = offers.find(o => parseNum(o.teamId, 0) === tid);
        c.teamId = tid;
        c.contract = off ? off.years : 3;
        addProfileDelta('loyalty', -4);
        showToast(`已加盟 ${esc(teamMeta(tid).z)}（年薪 ${formatSalaryM(off ? off.amount : 10)}）`);
        saveGame();
        renderOffseason();
      });
    });
    $('btn-fa-back').addEventListener('click', () => renderOffseason());
  }

  function nextSeason() {
    const c = PP.career;
    if (c.singleSeasonComplete) {
      showToast('当前为单赛季模式，没有下一赛季');
      return;
    }
    c.seasonCount++;
    PP.season = null;
    PP.leagueReady = false;
    PP._injured = false;
    c.currentStamina = 100;
    saveGame();
    const launch = async () => {
      try {
        await ensureLeague(c.era);
        const s = PP.season = {
          games: [], wins: 0, losses: 0, playerStats: emptyStats(), playoffStats: emptyStats(),
          awards: [], playoffResult: null, playoffEliminated: false, isPlayoffs: false,
          playoffState: null, schedule: null
        };
        prepareSeasonState();
        s.schedule = buildSchedule(82);
        renderSeason();
        showScreen('screen-season');
      } catch (err) {
        console.error(err);
        showToast('赛季初始化失败');
      }
    };
    launch();
  }

  function doRetire() {
    const c = PP.career;
    const legacy = calcLegacy(c);
    c.retired = true;
    c.legacy = legacy;
    saveGame();
    const avg = careerAverages(c);
    const grade = legacy.grade;
    const champTeams = Object.keys(c.conquest || {}).filter(k => c.conquest[k] > 0).length;
    const html = `
      <div class="po-champ">
        <div class="pc-trophy">🏆</div>
        <div class="pc-title">名人堂之路</div>
        <div class="pc-sub">${esc(c.playerName)} · ${c.position} · ${c.seasonCount} 季生涯</div>
      </div>
      <div class="season-body-card">
        <div class="sb-head"><h3>生涯数据</h3></div>
        <div class="stats-grid">
          ${[['pts', avg.pts], ['reb', avg.reb], ['ast', avg.ast], ['rings', champTeams], ['honors', c.totalAwards.length], ['ovr', c.ovr]].map(([k, v]) =>
            `<div class="stat-cell hl"><b>${v}</b><span>${k === 'pts' ? '场均得分' : k === 'reb' ? '篮板' : k === 'ast' ? '助攻' : k === 'rings' ? '夺冠球队' : k === 'honors' ? '荣誉数' : '最终OVR'}</span></div>`).join('')}
        </div>
      </div>
      <div class="po-champ" style="border-color:var(--blue);">
        <div class="pc-title">传奇评分：${legacy.score}</div>
        <div class="pc-sub">${grade}</div>
      </div>
      <button class="btn btn-primary" id="btn-legacy-done">返回主菜单</button>`;
    $('offseason-body').innerHTML = html;
    $('btn-legacy-done').addEventListener('click', () => {
      showScreen('screen-menu');
      renderMenu();
    });
  }

  function careerAverages(c) {
    const g = Math.max(1, parseNum(c.totalStats.games, 0));
    return {
      pts: +(c.totalStats.pts / g).toFixed(1),
      reb: +(c.totalStats.reb / g).toFixed(1),
      ast: +(c.totalStats.ast / g).toFixed(1)
    };
  }

  function calcLegacy(c) {
    const rings = Object.keys(c.conquest || {}).filter(k => c.conquest[k] > 0).length;
    const honors = (c.totalAwards || []).length;
    const games = Math.max(1, parseNum(c.totalStats.games, 0));
    const ppg = c.totalStats.pts / games;
    let score = Math.round(
      c.ovr * 0.5 +
      ppg * 1.6 +
      rings * 12 +
      Math.min(20, honors * 1.2) +
      parseNum(c.profile.fame, 0) * 0.4 +
      c.seasonCount * 0.8
    );
    const grade = score >= 95 ? '🏆 历史级传奇' : score >= 80 ? '⭐ 名人堂成员' : score >= 65 ? '🌟 全明星传奇' : score >= 50 ? '💪 优秀球员' : '📈 合格球员';
    return { score, grade };
  }

  /* ==================== 我的卡 ==================== */
  function renderMyCard() {
    const c = PP.career;
    const v = computeVitals();
    $('mycard-age-label').textContent = `${c.age} 岁 · ${c.singleSeasonComplete ? '单赛季已完成' : '单赛季进行中'} · ${SINGLE_SEASON.label}`;
    const avg = careerAverages(c);
    const seasonAvg = PP.season ? seasonAverages() : null;
    const profDefs = [
      ['fame', '声望', v.fame], ['business', '商业价值', v.business], ['mediaTrust', '媒体信任', clamp(Math.round(parseNum(c.profile.mediaTrust, 0) * 1.5), 0, 100)],
      ['controversy', '争议度', v.controversy], ['china', '中国热度', v.chinaHeat], ['loyalty', '忠诚', clamp(Math.round(parseNum(c.profile.loyalty, 0) * 1.6), 0, 100)],
      ['leadership', '领袖气质', clamp(Math.round(parseNum(c.profile.leadership, 0) * 1.6), 0, 100)], ['coach', '教练信任', v.coachTrust],
      ['locker', '更衣室信任', v.lockerRoom], ['fan', '球迷支持', v.fanSupport]
    ];
    const profileRows = profDefs.map(([k, label, val]) => {
      const level = val >= 60 ? 'good' : val >= 35 ? 'mid' : 'bad';
      return `<div class="vital">
        <div class="vital-label"><span>${label}</span><b>${val}</b></div>
        <div class="vital-track"><i class="${level}" style="width:${val}%"></i></div>
      </div>`;
    }).join('');
    const seasonRows = (c.seasons || []).slice().reverse().slice(0, 12).map(s => {
      const meta = teamMeta(s.teamId);
      const trophy = s.playoffResult === '总冠军' ? '🏆' : s.playoffResult === '亚军' ? '🥈' : '';
      return `<div class="season-row">
        <span class="sr-year">S${s.season}</span>
        <span class="sr-team">${esc(meta.z)}</span>
        <span class="sr-line">${s.wins}-${s.losses} · ${s.avg.pts}/${s.avg.reb}/${s.avg.ast}</span>
        <span class="sr-result">${s.playoffResult}</span><span class="sr-trophy">${trophy}</span>
      </div>`;
    }).join('');
    const myMeta = teamMeta(c.teamId);
    const heroAvatar = c.avatar
      ? `<img class="mycard-avatar" src="${esc(c.avatar)}" alt="${esc(c.playerName)}" style="display:block;">`
      : `<div class="mycard-avatar avatar-fallback" style="display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:900;color:#fff;background:linear-gradient(145deg,#ff8a4d,#c94d1e);margin:0 auto;">${esc(c.playerName.slice(0, 1))}</div>`;
    $('mycard-body').innerHTML = `
      <div class="mycard-hero">
        ${heroAvatar}
        <div class="mycard-name">${esc(c.playerName)}</div>
        <div class="mycard-sub">${c.position} ${POSITIONS[c.position]} · ${c.archetype}</div>
        <div class="mycard-ovr">${c.ovr}</div>
        <div class="mycard-team">${teamLogoHtml(myMeta, 22)}<span>${esc(myMeta.z || '--')}</span></div>
      </div>
      <div class="profile-panel"><h3>📊 数值面板（0-100 明确展示）</h3><div class="profile-grid">${profileRows}</div></div>
      <div class="season-body-card">
        <div class="sb-head"><h3>生涯数据</h3><span class="sb-sub">${parseNum(c.totalStats.games, 0)} 场</span></div>
        <div class="stats-grid">
          ${[['pts', avg.pts], ['reb', avg.reb], ['ast', avg.ast], ['rings', Object.keys(c.conquest || {}).filter(k => c.conquest[k] > 0).length], ['honors', (c.totalAwards || []).length], ['legacy', calcLegacy(c).score]].map(([k, v]) =>
            `<div class="stat-cell ${k === 'legacy' ? 'hl' : ''}"><b>${v}</b><span>${k === 'pts' ? '场均得分' : k === 'reb' ? '篮板' : k === 'ast' ? '助攻' : k === 'rings' ? '夺冠球队' : k === 'honors' ? '荣誉数' : '传奇评分'}</span></div>`).join('')}
        </div>
      </div>
      ${seasonAvg ? `<div class="season-body-card"><div class="sb-head"><h3>本季（进行中）</h3></div><div class="stats-grid">
        ${[['pts', seasonAvg.pts], ['reb', seasonAvg.reb], ['ast', seasonAvg.ast]].map(([k, v]) => `<div class="stat-cell hl"><b>${v}</b><span>${k === 'pts' ? '得分' : k === 'reb' ? '篮板' : '助攻'}</span></div>`).join('')}
      </div></div>` : ''}
      <div class="profile-panel"><h3>📅 生涯赛季</h3><div class="season-list">${seasonRows || '<div class="muted">暂无赛季记录</div>'}</div></div>`;
  }

  /* ==================== 玩法说明 ==================== */
  const HELP_PAGES = [
    { title: '建球员', content: '本项目固定一个虎扑风格单赛季。建球员时每轮按“随机年份 → 随机球队 → 随机球员”抽取属性来源，共锁定 13 项；每队有 12 名现役和 5 张名人堂/近代全明星历史惊喜卡，历史卡低概率出现且每轮最多 1 张。' },
    { title: '赛季', content: '选择生涯球队后进入 82 场常规赛。可以逐场模拟或批量快进，比赛由本项目模拟引擎按真实属性规则生成。比赛中途会出现随机事件与周行动，影响媒体压力、热度、球迷支持、体力与士气等数值（均在界面上以 0-100 明确展示）。' },
    { title: '季后赛', content: '常规赛结束后按战绩排名，7-10 名先打附加赛，随后东西部各 8 强进行七场四胜系列赛，直至总决赛。我的系列赛逐场模拟并生成数据。' },
    { title: '单赛季结算', content: '季后赛结束后进入最终总结，展示常规赛/季后赛数据、荣誉和冠军结果。完成总结后回到首页；本模式不进入休赛期，也没有下一赛季入口。' }
  ];
  let helpPage = 0;
  function renderHelp() {
    $('helpBody').innerHTML = `<div class="muted">${esc(HELP_PAGES[helpPage].content)}</div>`;
    $('helpPageIndicator').textContent = `${helpPage + 1}/${HELP_PAGES.length}`;
    $('helpPrevBtn').disabled = helpPage === 0;
    $('helpNextBtn').disabled = helpPage >= HELP_PAGES.length - 1;
    $('helpTabs').innerHTML = HELP_PAGES.map((p, i) => `<button class="${i === helpPage ? 'active' : ''}" data-hp="${i}">${p.title}</button>`).join('');
    Array.from($('helpTabs').children).forEach(b => {
      b.addEventListener('click', () => { helpPage = parseNum(b.dataset.hp, 0); renderHelp(); });
    });
  }

  /* ==================== 新生涯流程 ==================== */
  async function startNewCareer() {
    if (PP.busy) return;
    PP.busy = true;
    try {
      await Promise.all([ensureLeague(SINGLE_SEASON.year), ensureAttributePool()]);
      PP.era = SINGLE_SEASON.year;
      buildReset();
      PP.playerName = '';
      PP.avatar = '';
      PP.position = null;
      renderCharacter();
      showScreen('screen-character');
    } catch (err) {
      console.error(err);
    } finally {
      PP.busy = false;
    }
  }

  function beginBuild() {
    if (!PP.attributePool) {
      showToast('精选球员池尚未加载完成');
      return;
    }
    spinTeam();
    renderBuild();
    showScreen('screen-build');
  }

  function goToCareerPick() {
    renderCareerTeam();
    showScreen('screen-career');
  }

  function beginCareer() {
    if (!PP.career.teamId) { showToast('请先选择生涯球队'); return; }
    PP.career.era = SINGLE_SEASON.year;
    const launch = async () => {
      try {
        await ensureLeague(PP.career.era);
        PP.season = {
          games: [], wins: 0, losses: 0, playerStats: emptyStats(), playoffStats: emptyStats(),
          awards: [], playoffResult: null, playoffEliminated: false, isPlayoffs: false,
          playoffState: null, schedule: null
        };
        prepareSeasonState();
        PP.season.schedule = buildSchedule(82);
        PP.career.currentStamina = 100;
        saveGame();
        renderSeason();
        showScreen('screen-season');
      } catch (err) {
        console.error(err);
        showToast('生涯启动失败');
      }
    };
    launch();
  }

  function continueCareer() {
    const data = loadGame();
    if (!data) { showToast('暂无存档'); return; }
    const launch = async () => {
      try {
        PP.era = SINGLE_SEASON.year;
        PP.career = data.career;
        PP.career.era = SINGLE_SEASON.year;
        PP.season = data.season || null;
        await ensureLeague(SINGLE_SEASON.year);
        if (PP.season && !PP.season.isPlayoffs) {
          prepareSeasonState();
          if (!PP.season.schedule) PP.season.schedule = buildSchedule(82);
          renderSeason();
          showScreen('screen-season');
        } else if (PP.season && PP.season.isPlayoffs) {
          prepareSeasonState();
          if (PP.season.playoffState) {
            renderPlayoffs();
            showScreen('screen-playoffs');
          } else {
            renderSeason();
            showScreen('screen-season');
          }
        } else {
          renderMenu();
          showScreen('screen-menu');
        }
      } catch (err) {
        console.error(err);
        showToast('读档失败');
      }
    };
    launch();
  }

  // 给通用网页游戏检查器提供轻量可读状态；真实界面仍以 DOM 渲染为准。
  window.render_game_to_text = function () {
    const b = PP.build || {};
    const c = PP.career;
    const s = PP.season;
    return JSON.stringify({
      screen: PP.screen,
      build: {
        teamId: b.team,
        lockCount: b.lockCount || 0,
        remaining: ATTR_KEYS.filter(k => b.lockedAttrs && b.lockedAttrs[k] == null).length,
        selectedPlayer: b.selectedPlayer ? (b.selectedPlayer.nameCn || b.selectedPlayer.name) : null,
        sourceRoll: b.sourceRoll || null
      },
      career: c ? { playerName: c.playerName, ovr: c.ovr, teamId: c.teamId, seasonCount: c.seasonCount, singleSeasonComplete: !!c.singleSeasonComplete } : null,
      season: s ? { gameNum: s.games ? s.games.length : 0, wins: s.wins, losses: s.losses, isPlayoffs: !!s.isPlayoffs } : null
    });
  };
  window.advanceTime = window.advanceTime || function (ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(parseNum(ms, 0), 1000))));
  };

  /* ==================== 初始化与事件绑定 ==================== */
  function init() {
    renderMenu();
    $('btn-new-game').addEventListener('click', () => startNewCareer());
    $('btn-continue').addEventListener('click', () => continueCareer());
    $('btn-help').addEventListener('click', () => {
      helpPage = 0;
      renderHelp();
      $('helpModal').style.display = 'flex';
    });
    const otherBuilds = $('btn-other-builds');
    if (otherBuilds) otherBuilds.addEventListener('click', () => {
      showToast('其他 JRs 建模功能将在虎扑活动接口接入后开放');
    });
    $('help-close').addEventListener('click', () => { $('helpModal').style.display = 'none'; });
    $('helpPrevBtn').addEventListener('click', () => { if (helpPage > 0) { helpPage--; renderHelp(); } });
    $('helpNextBtn').addEventListener('click', () => { if (helpPage < HELP_PAGES.length - 1) { helpPage++; renderHelp(); } });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('确定删除存档？此操作不可恢复。')) {
        clearSave();
        PP.career = null;
        PP.season = null;
        renderMenu();
        showScreen('screen-menu');
        showToast('存档已重置');
      }
    });
    $('btn-confirm-position').addEventListener('click', () => beginBuild());
    $('btn-confirm-character').addEventListener('click', () => {
      const name = ($('char-name-input').value || '').trim();
      if (!name) { showToast('请输入你的名字'); return; }
      PP.playerName = name.slice(0, 12);
      if (!PP.avatar) {
        PP.avatar = AI_AVATARS[Math.floor(Math.random() * AI_AVATARS.length)];
      }
      renderPosition();
      showScreen('screen-position');
    });
    $('btn-random-name').addEventListener('click', () => {
      PP.playerName = pick(RANDOM_NAMES);
      $('char-name-input').value = PP.playerName;
      updateCharPreview();
    });
    $('btn-random-avatar').addEventListener('click', () => {
      const others = AI_AVATARS.filter(a => a !== PP.avatar);
      PP.avatar = pick(others.length ? others : AI_AVATARS);
      updateCharPreview();
      renderCharacter();
    });
    $('btn-to-career').addEventListener('click', () => goToCareerPick());
    $('btn-season-back').addEventListener('click', () => {
      renderMenu();
      showScreen('screen-menu');
    });
    $('btn-my-data').addEventListener('click', () => {
      renderMyCard();
      showScreen('screen-mycard');
    });
    $('btn-mycard-back').addEventListener('click', () => {
      if (PP.season && PP.season.isPlayoffs) { renderPlayoffs(); showScreen('screen-playoffs'); }
      else { renderSeason(); showScreen('screen-season'); }
    });
    $('btn-playoffs-back').addEventListener('click', () => {
      renderSeason();
      showScreen('screen-season');
    });
    // 自动读档
    const data = loadGame();
    if (data && data.career) {
      PP.era = SINGLE_SEASON.year;
      PP.career = data.career;
      PP.career.era = SINGLE_SEASON.year;
      PP.season = data.season || null;
      renderMenu();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
