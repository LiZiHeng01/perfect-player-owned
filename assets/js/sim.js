// sim.js
// ============ CHARACTER CREATION ============
const BODY_TYPES = [
  { id: "small", n: "灵动型", d: "小体型，步频和机动性最佳", hRange: [175, 186], wRange: [70, 80], wsBonus: -3, boost: { speed: 9, stl: 5 }, nerf: { strength: -7, reb: -5, blk: -6 } },
  { id: "lean", n: "修长型", d: "纤长身材，攻防覆盖更广", hRange: [183, 196], wRange: [76, 90], wsBonus: 1, boost: { speed: 5, shotExt: 3, stl: 3 }, nerf: { strength: -4 } },
  { id: "balanced", n: "均衡型", d: "标准体型，综合能力平滑", hRange: [188, 203], wRange: [84, 102], wsBonus: 0, boost: {}, nerf: {} },
  { id: "power", n: "力量型", d: "对抗强，适合冲击和卡位", hRange: [196, 212], wRange: [98, 118], wsBonus: 2, boost: { strength: 8, physique: 5, reb: 4 }, nerf: { speed: -5, shotExt: -3 } },
  { id: "tower", n: "塔柱型", d: "超大体型，禁区存在感极强", hRange: [205, 221], wRange: [108, 130], wsBonus: 4, boost: { strength: 9, reb: 6, blk: 6 }, nerf: { speed: -7, stl: -4, shotExt: -4 } }
];

// ============ 努力程度模式 ============
const EFFORT_MODES = [
  { id: 'allout', n: '全力', icon: '🔥', desc: '拼尽全力，表现提升但体力消耗大', staminaMult: 1.6, attrMult: 1.12, injuryMult: 1.35, xpMult: 1.3, color: '#dc3545' },
  { id: 'normal', n: '普通', icon: '⚡', desc: '正常发挥', staminaMult: 1.0, attrMult: 1.0, injuryMult: 1.0, xpMult: 1.0, color: '#fdb927' },
  { id: 'conserve', n: '省力', icon: '🛡️', desc: '保存体力，表现有所降低', staminaMult: 0.55, attrMult: 0.88, injuryMult: 0.6, xpMult: 0.7, color: '#17a2b8' }
];
function normalizeEffortModeId(id) {
  const raw = String(id || '').trim().toLowerCase();
  if (raw === 'hard') return 'allout';
  if (raw === 'slack') return 'conserve';
  return raw || 'normal';
}
function getEffortMode(id) {
  const normalized = normalizeEffortModeId(id);
  return EFFORT_MODES.find(m => m.id === normalized) || EFFORT_MODES[1];
}

function getScheduleGameDay(gameIndex = G.gameNum) {
  const idx = Math.max(0, Math.floor(parseNum(gameIndex, G.gameNum)));
  if (Array.isArray(G.gameDays) && G.gameDays.length > idx) return parseNum(G.gameDays[idx], idx * 2);
  return idx * 2;
}

function countRecentGamesInSpan(gameIndex, spanDays, { includeCurrent = true } = {}) {
  const idx = Math.max(0, Math.floor(parseNum(gameIndex, 0)));
  const gameDay = getScheduleGameDay(idx);
  let count = includeCurrent ? 1 : 0;
  for (let i = idx - 1; i >= 0; i--) {
    const prevDay = getScheduleGameDay(i);
    if (gameDay - prevDay > spanDays) break;
    count++;
  }
  return count;
}

function getRecentPlayedMinutesLoad(limit = 4) {
  const recent = Array.isArray(G.results) ? G.results.slice(-Math.max(1, parseNum(limit, 4))) : [];
  const minutes = recent
    .filter(item => item && !item.injured)
    .map(item => parseNum(item?.st?.mins, parseNum(item?.mins, 0)))
    .filter(value => value > 0);
  if (!minutes.length) return clamp(parseNum(G._currentRoleMinutes, 26), 18, 40);
  return minutes.reduce((sum, value) => sum + value, 0) / minutes.length;
}

function summarizeFatigueContext(ctx = {}) {
  const parts = [];
  if (ctx.backToBack) parts.push('背靠背');
  if (ctx.threeInFour) parts.push('3天2赛/4天3赛强度');
  if (ctx.fourInSix) parts.push('6天4赛强度');
  if (!ctx.home) parts.push(`客场${Math.max(1, parseNum(ctx.roadTripLength, 1))}连客`);
  else if (parseNum(ctx.homeStandLength, 0) >= 3) parts.push(`连续${parseNum(ctx.homeStandLength, 0)}个主场`);
  if (parseNum(ctx.restDays, 0) >= 2) parts.push(`${parseNum(ctx.restDays, 0)}天休整`);
  return parts.length ? parts.join(' / ') : '常规负荷';
}

function sampleGenericFatigueContext({ teamId = 0, home = false, roundIndex = 0, phase = 'regular' } = {}) {
  const isPlayoffs = String(phase || '').trim() === 'playoffs';
  let roll = Math.random();
  let restDays = 1;
  if (isPlayoffs) {
    if (roll < 0.10) restDays = 0;
    else if (roll < 0.54) restDays = 1;
    else if (roll < 0.84) restDays = 2;
    else restDays = 3;
  } else {
    if (roll < 0.14) restDays = 0;
    else if (roll < 0.59) restDays = 1;
    else if (roll < 0.86) restDays = 2;
    else restDays = 3;
  }
  const backToBack = restDays === 0;
  const threeInFour = backToBack ? Math.random() < 0.42 : Math.random() < 0.18;
  const fourInSix = (backToBack || threeInFour) ? Math.random() < 0.22 : Math.random() < 0.08;
  let roadTripLength = 0;
  let homeStandLength = 0;
  if (home) {
    homeStandLength = Math.random() < 0.34 ? rng(3, 5) : rng(1, 3);
  } else {
    roadTripLength = Math.random() < 0.36 ? rng(3, 5) : rng(1, 3);
  }
  let loadScore = 0;
  if (backToBack) loadScore += 6;
  if (threeInFour) loadScore += 3;
  if (fourInSix) loadScore += 2;
  if (!home) loadScore += 1;
  if (roadTripLength >= 3) loadScore += Math.min(4, roadTripLength - 2);
  const skillPenalty = clamp(Math.round(loadScore * 0.62 - Math.min(restDays, 2)), 0, 10);
  const pacePenalty = clamp(Math.round(loadScore * 0.36), 0, 7);
  const energyPenalty = clamp(Math.round(loadScore * 1.4), 0, 16);
  const injuryMult = +(1 + loadScore * 0.045 + (backToBack ? 0.05 : 0)).toFixed(2);
  const summary = summarizeFatigueContext({ backToBack, threeInFour, fourInSix, home, roadTripLength, homeStandLength, restDays });
  return {
    teamId: parseNum(teamId, 0),
    roundIndex: parseNum(roundIndex, 0),
    home: !!home,
    gameDay: NaN,
    restDays,
    backToBack,
    threeInFour,
    fourInSix,
    roadTripLength,
    homeStandLength,
    recentMinutes: 30,
    loadScore,
    skillPenalty,
    pacePenalty,
    energyPenalty,
    injuryMult,
    summary,
    synthetic: true
  };
}

function buildScheduleFatigueContext({ teamId = 0, home = false, roundIndex = 0, phase = 'regular', userTeamId = 0 } = {}) {
  const tid = parseNum(teamId, 0);
  const ridx = Math.max(0, Math.floor(parseNum(roundIndex, 0)));
  const phaseKey = String(phase || 'regular').trim() || 'regular';
  const canUseUserSchedule = tid > 0
    && tid === parseNum(G.teamId, 0)
    && phaseKey === 'regular'
    && Array.isArray(G.schedule)
    && Array.isArray(G.gameDays)
    && G.schedule.length > ridx
    && G.gameDays.length > ridx;
  if (!canUseUserSchedule) {
    return sampleGenericFatigueContext({ teamId: tid, home, roundIndex: ridx, phase: phaseKey });
  }
  const game = G.schedule[ridx] || {};
  const gameDay = getScheduleGameDay(ridx);
  const prevDay = ridx > 0 ? getScheduleGameDay(ridx - 1) : -3;
  const restDays = Math.max(0, gameDay - prevDay - 1);
  const backToBack = restDays === 0;
  const gamesIn4 = countRecentGamesInSpan(ridx, 3, { includeCurrent: true });
  const gamesIn6 = countRecentGamesInSpan(ridx, 5, { includeCurrent: true });
  const threeInFour = gamesIn4 >= 3;
  const fourInSix = gamesIn6 >= 4;
  let roadTripLength = 0;
  let homeStandLength = 0;
  for (let i = ridx; i >= 0; i--) {
    const item = G.schedule[i] || {};
    if (!!item.home !== !!game.home) break;
    if (item.home) homeStandLength++;
    else roadTripLength++;
  }
  const recentMinutes = getRecentPlayedMinutesLoad(4);
  const currentStamina = clamp(parseNum(G.player?.stamina, 100), 0, 100);
  let loadScore = 0;
  if (backToBack) loadScore += 6;
  if (threeInFour) loadScore += 3;
  if (fourInSix) loadScore += 2;
  if (!game.home) loadScore += 1;
  if (!game.home && roadTripLength >= 3) loadScore += Math.min(4, roadTripLength - 2);
  if (recentMinutes >= 38) loadScore += 3;
  else if (recentMinutes >= 34) loadScore += 2;
  else if (recentMinutes >= 30) loadScore += 1;
  if (currentStamina <= 70) loadScore += Math.round((70 - currentStamina) / 8);
  const skillPenalty = clamp(Math.round(loadScore * 0.66 - Math.min(restDays, 2)), 0, 11);
  const pacePenalty = clamp(Math.round(loadScore * 0.40), 0, 8);
  const energyPenalty = clamp(Math.round(loadScore * 1.55), 0, 18);
  const injuryMult = +(1 + loadScore * 0.05 + (backToBack ? 0.06 : 0) + (roadTripLength >= 4 ? 0.04 : 0)).toFixed(2);
  const summary = summarizeFatigueContext({ backToBack, threeInFour, fourInSix, home: !!game.home, roadTripLength, homeStandLength, restDays });
  return {
    teamId: tid,
    roundIndex: ridx,
    home: !!game.home,
    gameDay,
    restDays,
    backToBack,
    threeInFour,
    fourInSix,
    roadTripLength,
    homeStandLength,
    recentMinutes: +recentMinutes.toFixed(1),
    loadScore,
    skillPenalty,
    pacePenalty,
    energyPenalty,
    injuryMult,
    summary,
    synthetic: false
  };
}

function teamIdInSimOption(teamId, optionValue) {
  const tid = parseNum(teamId, 0);
  if (!tid || !optionValue) return false;
  if (optionValue === true) return true;
  if (Array.isArray(optionValue)) return optionValue.some(id => parseNum(id, 0) === tid);
  if (optionValue instanceof Set) return optionValue.has(tid) || optionValue.has(String(tid));
  if (typeof optionValue === 'object') return !!optionValue[tid] || !!optionValue[String(tid)];
  return parseNum(optionValue, 0) === tid;
}

function buildNoFatigueContext({ teamId = 0, home = false, roundIndex = 0, phase = 'regular' } = {}) {
  return {
    teamId: parseNum(teamId, 0),
    roundIndex: Math.max(0, Math.floor(parseNum(roundIndex, 0))),
    phase: String(phase || 'regular').trim() || 'regular',
    home: !!home,
    gameDay: NaN,
    restDays: 3,
    backToBack: false,
    threeInFour: false,
    fourInSix: false,
    roadTripLength: home ? 0 : 1,
    homeStandLength: home ? 1 : 0,
    recentMinutes: 0,
    loadScore: 0,
    skillPenalty: 0,
    pacePenalty: 0,
    energyPenalty: 0,
    injuryMult: 1,
    summary: '全力出战',
    noFatigue: true,
    synthetic: true
  };
}



// ============ 体力状态系统 (APK风格) ============
function getStaminaStatus(stamina) {
  const s = clamp(parseNum(stamina, 80), 0, 100);
  if (s >= 80) return { level: 'energized', icon: '💪', name: '精力充沛', attrMult: 1, accMult: 1, injuryMult: 1 };
  if (s >= 60) return { level: 'normal', icon: '✓', name: '正常', attrMult: 1, accMult: 1, injuryMult: 1 };
  if (s >= 40) return { level: 'tired', icon: '😓', name: '疲劳', attrMult: 0.95, accMult: 0.98, injuryMult: 1.3 };
  if (s >= 20) return { level: 'exhausted', icon: '😫', name: '体力不支', attrMult: 0.88, accMult: 0.94, injuryMult: 1.8 };
  return { level: 'depleted', icon: '💀', name: '极度疲惫', attrMult: 0.80, accMult: 0.88, injuryMult: 3.0 };
}
function usagePlayerKey(player) {
  if (!player) return '';
  if (player.id !== undefined && player.id !== null && String(player.id) !== '') return String(player.id);
  const name = String(player.name || '').trim();
  return name ? `name:${name}` : '';
}
function usagePlayerAttrs(player) {
  if (typeof getEffectivePlayerAttrs === 'function') {
    return getEffectivePlayerAttrs(player);
  }
  if (player?.attrs && Object.keys(player.attrs).length) return player.attrs;
  return parsePlayerAttrs(player || {});
}
function usagePlayerRating(player) {
  const attrs = usagePlayerAttrs(player);
  return parseNum(player?.rating, ovr(attrs));
}
function usagePlayerPass(player) {
  const attrs = usagePlayerAttrs(player);
  return parseNum(attrs.pass, 55);
}

// ============ 7层球队角色体系 ============
const TEAM_TIERS = [
  { id: 'alpha', name: '当家球星', usageMod: 0.18, astMod: 0.8, minTarget: 36, minRange: [33, 40] },
  { id: 'second', name: '二当家', usageMod: 0.10, astMod: 0.4, minTarget: 34, minRange: [31, 37] },
  { id: 'third', name: '三当家', usageMod: 0.04, astMod: 0.2, minTarget: 31, minRange: [28, 34] },
  { id: 'sixthman', name: '第六人', usageMod: 0.02, astMod: 0.1, minTarget: 25, minRange: [22, 28] },
  { id: 'rolestarter', name: '首发蓝领', usageMod: -0.06, astMod: 0, minTarget: 32, minRange: [28, 35] },
  { id: 'bench', name: '替补轮换', usageMod: -0.08, astMod: 0, minTarget: 17, minRange: [13, 22] },
  { id: 'end', name: '饮水机管理员', usageMod: -0.12, astMod: 0, minTarget: 4, minRange: [0, 8] }
];
function getTierDef(tierId) { return TEAM_TIERS.find(t => t.id === tierId) || TEAM_TIERS[6]; }

function buildTeamUsageContext(teamId = 0, roster = null, rotation = null) {
  const tid = parseNum(teamId, 0);
  const includeUser = tid > 0 && tid === parseNum(G?.teamId, 0);
  const rosterPool = Array.isArray(roster) && roster.length
    ? roster.filter(Boolean)
    : (() => {
      const base = (tid > 0 ? getTeamPlayers(tid) : []) || [];
      if (!includeUser || typeof createUserRosterSnapshot !== 'function') return base;
      const self = createUserRosterSnapshot();
      const selfKey = usagePlayerKey(self);
      if (!selfKey) return base;
      const hasSelf = base.some(p => usagePlayerKey(p) === selfKey);
      return hasSelf ? base : [self, ...base];
    })();
  const rotationPool = Array.isArray(rotation) && rotation.length
    ? rotation.filter(Boolean)
    : (tid > 0 && typeof buildDynamicTeamRotation === 'function'
      ? buildDynamicTeamRotation(tid, { includeUser })
      : []);

  const byKey = new Map();
  rosterPool.forEach(p => {
    const key = usagePlayerKey(p);
    if (key && !byKey.has(key)) byKey.set(key, p);
  });
  rotationPool.forEach(p => {
    const key = usagePlayerKey(p);
    if (key && !byKey.has(key)) byKey.set(key, p);
  });

  // 按评分排序所有轮换球员
  const rotationByRating = rotationPool
    .map((p, idx) => ({ player: p, key: usagePlayerKey(p), rating: usagePlayerRating(p), idx }))
    .filter(x => x.key)
    .sort((a, b) => b.rating - a.rating || usagePlayerPass(b.player) - usagePlayerPass(a.player));

  // 分配7层角色
  const tierMap = new Map();
  const topTiers = ['alpha', 'second', 'third'];
  const assignedKeys = new Set();
  // 前3名按评分 → 当家/二当家/三当家
  rotationByRating.slice(0, 3).forEach((entry, i) => {
    tierMap.set(entry.key, topTiers[i]);
    assignedKeys.add(entry.key);
  });
  // 剩余按轮换位置分配
  rotationPool.forEach((p, idx) => {
    const key = usagePlayerKey(p);
    if (!key || assignedKeys.has(key)) return;
    assignedKeys.add(key);
    const role = p?.rotationRole || (idx < 5 ? 'starter' : (idx === 5 ? 'sixth' : 'role'));
    if (role === 'starter' || idx < 5) {
      tierMap.set(key, 'rolestarter');
    } else if (role === 'sixth' || idx === 5) {
      tierMap.set(key, 'sixthman');
    } else if (idx <= 8) {
      tierMap.set(key, 'bench');
    } else {
      tierMap.set(key, 'end');
    }
  });

  return {
    teamId: tid,
    roster: rosterPool,
    rotation: rotationPool,
    byKey,
    tierMap
  };
}
function getPlayerTier(player, usageContext) {
  const key = usagePlayerKey(player);
  if (!key || !usageContext?.tierMap) return 'end';
  return usageContext.tierMap.get(key) || 'end';
}
function collectRoleEffects(roles = []) {
  return (roles || []).reduce((acc, role) => {
    acc.usageMod += parseNum(role?.usageMod, 0);
    acc.astMod += parseNum(role?.astMod, 0);
    acc.threeMod += parseNum(role?.threeMod, 0);
    acc.insideMod += parseNum(role?.insideMod, 0);
    acc.rebMod += parseNum(role?.rebMod, 0);
    acc.stlMod += parseNum(role?.stlMod, 0);
    acc.blkMod += parseNum(role?.blkMod, 0);
    if (role?.minRange) { acc.minRange = role.minRange; acc.minTarget = parseNum(role.minTarget, acc.minTarget); }
    return acc;
  }, { usageMod: 0, astMod: 0, threeMod: 0, insideMod: 0, rebMod: 0, stlMod: 0, blkMod: 0, minTarget: 17, minRange: null });
}
function buildCoachSystemRoleEffect(player, coachFx = {}) {
  const systemId = String(coachFx?.systemId || 'balance').trim() || 'balance';
  const systemLabel = String(coachFx?.systemLabel || '均衡体系').trim() || '均衡体系';
  const attrs = usagePlayerAttrs(player);
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const shotExt = parseNum(attrs.shotExt, 55);
  const shotInt = parseNum(attrs.shotInt, 55);
  const pass = parseNum(attrs.pass, 55);
  const reb = parseNum(attrs.reb, 55);
  const stl = parseNum(attrs.stl, 55);
  const blk = parseNum(attrs.blk, 55);
  const speed = parseNum(attrs.speed, 55);
  const physique = parseNum(attrs.physique, 55);
  const perimeterCut = pos <= 3 ? 70 : 65;
  const role = {
    type: 'coachSystem',
    name: `${systemLabel}适配`,
    usageMod: parseNum(coachFx?.usageByPos?.[pos], 0),
    astMod: 0,
    threeMod: 0,
    insideMod: 0,
    rebMod: 0,
    stlMod: 0,
    blkMod: 0
  };

  switch (systemId) {
    case 'defense':
      role.name = pos >= 4 ? '防守支柱' : '防守拼图';
      role.rebMod += pos >= 4 ? 0.45 : 0.12;
      role.stlMod += pos <= 3 ? 0.16 : 0.08;
      role.blkMod += pos >= 4 ? 0.18 : 0.04;
      if (pos >= 3 && (stl + blk) < 115) {
        role.name = '防守错配';
        role.usageMod -= 0.02;
        role.stlMod -= 0.10;
        role.blkMod -= 0.10;
      }
      break;
    case 'grit':
      role.name = pos >= 4 ? '硬仗蓝领' : '强硬后场';
      role.insideMod += pos >= 4 ? 0.03 : 0.01;
      role.rebMod += pos >= 4 ? 0.38 : 0.10;
      if (pos >= 4 && (physique + reb) < 145) {
        role.name = '磨阵错配';
        role.usageMod -= 0.03;
        role.insideMod -= 0.02;
        role.rebMod += 0.12;
      }
      break;
    case 'pace_space':
      if (shotExt >= perimeterCut) {
        role.name = pos >= 4 ? '空间内线' : '空间适配';
        role.usageMod += pos <= 3 ? 0.018 : 0.008;
        role.threeMod += 0.028;
        role.astMod += pos <= 3 ? 0.12 : 0.04;
      } else {
        role.name = '空间错配';
        role.usageMod -= pos <= 3 ? 0.05 : 0.035;
        role.threeMod -= 0.02;
        if (pos >= 4) role.rebMod += 0.28;
      }
      break;
    case 'perimeter_star':
      if (pos <= 2 && (pass + shotExt) >= 145) {
        role.name = '外核引擎';
        role.usageMod += 0.035;
        role.astMod += 0.26;
        role.threeMod += 0.024;
      } else if (pos <= 2) {
        role.name = '外核错配';
        role.usageMod -= 0.055;
        role.astMod -= 0.18;
        role.threeMod -= 0.015;
      } else if (pos === 3) {
        role.name = '侧翼终结';
        role.usageMod += 0.012;
        role.threeMod += 0.012;
      } else {
        role.name = '吃饼蓝领';
        role.usageMod -= 0.03;
        role.rebMod += 0.18;
      }
      break;
    case 'interior_star':
      if (pos >= 4 && (shotInt + reb) >= 140) {
        role.name = '内线支点';
        role.usageMod += 0.035;
        role.insideMod += 0.032;
        role.rebMod += 0.30;
        role.blkMod += 0.10;
      } else if (pos >= 4) {
        role.name = '内核错配';
        role.usageMod -= 0.04;
        role.insideMod -= 0.02;
        role.rebMod += 0.16;
      } else {
        role.name = '弱侧喂饼';
        role.usageMod -= 0.015;
        role.astMod += 0.08;
      }
      break;
    case 'triangle':
      if (pos === 1 && pass >= 72) {
        role.name = '三角发牌手';
        role.usageMod += 0.01;
        role.astMod += 0.22;
      } else if (pos >= 2 && pass >= 60) {
        role.name = '三角联动';
        role.usageMod += 0.008;
        role.astMod += 0.20;
        role.insideMod += 0.015;
      } else if (pos >= 2) {
        role.name = '三角错配';
        role.usageMod -= 0.02;
        role.astMod -= 0.12;
      }
      break;
    case 'seven_seconds':
      if (pos <= 3 && (speed + physique) >= 140) {
        role.name = '快攻推进';
        role.usageMod += 0.03;
        role.astMod += pos === 1 ? 0.18 : 0.08;
        role.threeMod += 0.02;
      } else if (pos <= 3) {
        role.name = '跑轰错配';
        role.usageMod -= 0.045;
        role.threeMod -= 0.01;
      } else {
        role.name = '转换终结';
        role.usageMod -= 0.015;
        role.insideMod += 0.01;
      }
      break;
    case 'balance':
    default:
      if (pos <= 3 && pass >= 70) {
        role.name = '体系通才';
        role.astMod += 0.10;
        role.usageMod += 0.005;
      } else if (pos >= 4 && reb >= 75) {
        role.name = '内线蓝领';
        role.rebMod += 0.18;
      }
      break;
  }
  return role;
}
function buildCoachRelationshipRoleEffect(player, coachFx = {}) {
  const isUser = !!player?.isSelf || String(player?.id || '') === 'USER_SELF';
  if (!isUser || typeof getUserCoachTreatmentProfile !== 'function') return null;
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G?.teamId, 0)) : null;
  const treatment = getUserCoachTreatmentProfile(player, coach);
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const role = {
    type: 'coachRelationship',
    name: treatment.label,
    usageMod: parseNum(treatment.usageDelta, 0),
    astMod: parseNum(treatment.creationDelta, 0),
    threeMod: 0,
    insideMod: 0,
    rebMod: 0,
    stlMod: 0,
    blkMod: 0
  };
  const systemId = String(coachFx?.systemId || coach?.systemId || 'balance').trim() || 'balance';
  if (parseNum(treatment.fitScore, 50) >= 70) {
    if (systemId === 'pace_space' || systemId === 'perimeter_star' || systemId === 'seven_seconds') {
      role.threeMod += pos <= 3 ? 0.012 : 0.006;
    } else if (systemId === 'interior_star' || systemId === 'grit') {
      role.insideMod += pos >= 4 ? 0.014 : 0.006;
      role.rebMod += pos >= 4 ? 0.10 : 0.03;
    } else if (systemId === 'triangle') {
      role.astMod += pos <= 3 ? 0.05 : 0.02;
    }
  } else if (parseNum(treatment.fitScore, 50) <= 42) {
    role.usageMod -= 0.012;
    if (systemId === 'pace_space' || systemId === 'perimeter_star' || systemId === 'seven_seconds') {
      role.threeMod -= 0.010;
    }
    if (systemId === 'interior_star' || systemId === 'grit') {
      role.insideMod -= 0.010;
    }
  }
  return role;
}

// ============ 球员角色计算 (7层体系 + 技能附加) ============
function getPlayerRole(player, roster, coachFx, usageContext = null) {
  const attrs = usagePlayerAttrs(player);
  const pos = parseNum(player.pos, 3);
  const roles = [];
  const teamIdFallback = String(player?.id) === 'USER_SELF'
    ? parseNum(G?.teamId, 0)
    : parseNum(player?.teamId, 0);
  const ctx = usageContext || buildTeamUsageContext(teamIdFallback, roster);
  const tier = getPlayerTier(player, ctx);
  const tierDef = getTierDef(tier);

  // 主角色：7层体系
  roles.push({ ...tierDef, type: tier });

  // 三分炮台：三分好且教练三分倾向高
  const shotExt = parseNum(attrs.shotExt, 55);
  const threeBias = parseNum(coachFx?.threeBias, 0);
  if (shotExt >= 78 && threeBias >= 0) roles.push({ type: 'shooter', name: '三分炮台', threeMod: 0.045 + (threeBias * 0.2) });

  // 低位核心：内线好且教练内线倾向高
  const shotInt = parseNum(attrs.shotInt, 55);
  const insideBias = parseNum(coachFx?.insideBias, 0);
  if (shotInt >= 78 && pos >= 4 && insideBias >= 0) roles.push({ type: 'post', name: '低位核心', insideMod: 0.045 + (insideBias * 0.2) });

  // 防守悍将：防守数据好且教练防守倾向高
  const stl = parseNum(attrs.stl, 55), blk = parseNum(attrs.blk, 55);
  const defBias = parseNum(coachFx?.defensiveBias, 0);
  if (stl + blk >= 130 && defBias >= 0) roles.push({ type: 'defender', name: '防守悍将' });

  roles.push(buildCoachSystemRoleEffect(player, coachFx));
  const relationshipRole = buildCoachRelationshipRoleEffect(player, coachFx);
  if (relationshipRole) roles.push(relationshipRole);

  return roles;
}

// 体力恢复计算
function recoverStamina(options = {}) {
  const ecoFx = options.ecoFx || (typeof getEconomyEffects === 'function' ? getEconomyEffects() : { restStaminaBonus: 0, gameStaminaBonus: 0 });
  const xfFx = getPlayerXFactorEffect(G.player);
  const badgeFx = getBadgeEffects(G.player);
  const regen = parseNum(xfFx.staminaRegen, 0);
  const badgeRegen = parseNum(badgeFx.staminaRegen, 0);
  const physique = parseNum(G.player.attrs?.physique, 60);
  const age = parseNum(G.player.age, 22);
  const phyBonus = Math.max(0, Math.round((physique - 60) / 9));
  const agePenalty = Math.max(0, Math.round((age - 30) * 0.3));
  const base = options.rest ? rng(10, 16) : rng(2, 5);
  const coachBonus = options.rest ? parseNum(ecoFx.restStaminaBonus, 0) : parseNum(ecoFx.gameStaminaBonus, 0);
  const total = clamp(Math.round(base + coachBonus + regen + badgeRegen + phyBonus - agePenalty), 1, options.rest ? 26 : 10);
  G.player.stamina = clamp(G.player.stamina + total, 0, 100);
  return total;
}

function calculateUserGameStaminaLoss(stats = {}, fatigueContext = null, gameMod = null) {
  const effortCfg = getEffortMode(G._effortMode);
  const xfFx = getPlayerXFactorEffect(G.player);
  const badgeFx = getBadgeEffects(G.player);
  const ecoFx = getEconomyEffects();
  const physique = parseNum(G.player.attrs?.physique, 60);
  const speed = parseNum(G.player.attrs?.speed, 55);
  const currentStamina = clamp(parseNum(G.player.stamina, 100), 0, 100);
  let loss = 6
    + parseNum(stats.mins, 0) * 0.31
    + (parseNum(stats.fga, 0) + parseNum(stats.fta, 0) * 0.35) * 0.20
    + (parseNum(stats.reb, 0) + parseNum(stats.ast, 0)) * 0.08
    + (parseNum(stats.stl, 0) + parseNum(stats.blk, 0) + parseNum(stats.tov, 0)) * 0.24;
  if (parseNum(stats.pts, 0) >= 30) loss += 1.2;
  if (fatigueContext?.backToBack) loss += 3;
  if (fatigueContext?.threeInFour) loss += 1.5;
  if (fatigueContext?.fourInSix) loss += 1.2;
  if (fatigueContext && !fatigueContext.home) loss += 0.8;
  if (parseNum(fatigueContext?.roadTripLength, 0) >= 3) loss += Math.min(3, (parseNum(fatigueContext?.roadTripLength, 0) - 2) * 0.9);
  if (gameMod?.foulTrouble) loss -= 1.2;
  loss += Math.max(0, (72 - currentStamina) * 0.05);
  loss -= Math.max(0, (physique - 60) * 0.08);
  loss -= Math.max(0, (speed - 65) * 0.03);
  loss -= parseNum(ecoFx.fatigueRelief, 0) * 14;
  loss *= effortCfg.staminaMult || 1;
  loss *= parseNum(xfFx.staminaCostMult, 1);
  loss *= parseNum(badgeFx.staminaCostMult, 1);
  return clamp(Math.round(loss), 7, 34);
}

// 获取玩家当前角色效果（供simGameStats使用）
function getUserRoleFx() {
  const ctx = buildTeamUsageContext(parseNum(G?.teamId, 0));
  const self = typeof createUserRosterSnapshot === 'function' ? createUserRosterSnapshot() : G.player;
  const coachFx = typeof getCoachEffects === 'function' ? getCoachEffects(parseNum(G?.teamId, 0)) : {};
  return collectRoleEffects(getPlayerRole(self, ctx.roster, coachFx, ctx));
}

function templateScoreForAttr(attrKey, pos, tpl, bt) {
  let s = (pos?.tend?.[attrKey] || 0) * 0.7;
  if (tpl) {
    s += (tpl.boost?.[attrKey] || 0);
    s += (tpl.nerf?.[attrKey] || 0);
  }
  if (bt) {
    s += (bt.boost?.[attrKey] || 0) * 0.8;
    s += (bt.nerf?.[attrKey] || 0) * 0.8;
  }
  return s;
}
function tuneAttrsToTarget(attrs, target, pos, tpl, bt) {
  let guard = 0;
  while (ovr(attrs) !== target && guard < 320) {
    const needUp = target > ovr(attrs);
    const order = ATTRS.map(at => at.k).sort((a, b) => templateScoreForAttr(b, pos, tpl, bt) - templateScoreForAttr(a, pos, tpl, bt));
    const keys = needUp ? order : [...order].reverse();
    let moved = false;
    for (const key of keys) {
      const next = attrs[key] + (needUp ? 1 : -1);
      if (next >= 35 && next <= 96) {
        attrs[key] = next;
        moved = true;
        break;
      }
    }
    if (!moved) break;
    guard++;
  }
}
function rollAttrs() {
  const a = {};
  const targetOvr = rng(60, 85);
  const pos = getPos(G.player.pos) || { tend: {} };
  const tpl = getTemplate(G.player.template, G.player.pos);
  const bt = BODY_TYPES.find(b => b.id === G.player.bodyType) || null;
  const xfFx = getPlayerXFactorEffect(G.player);
  ATTRS.forEach(at => {
    let base = targetOvr + rng(-8, 8);
    base += Math.round((pos.tend[at.k] || 0) * 0.55);
    if (tpl) {
      base += Math.round((tpl.boost?.[at.k] || 0) * 0.75);
      base += Math.round((tpl.nerf?.[at.k] || 0) * 0.75);
    }
    if (bt) {
      base += Math.round((bt.boost?.[at.k] || 0) * 0.65);
      base += Math.round((bt.nerf?.[at.k] || 0) * 0.65);
    }
    if (xfFx.attrBonus) base += xfFx.attrBonus;
    if (xfFx.attrBoost && xfFx.attrBoost[at.k]) base += xfFx.attrBoost[at.k];
    a[at.k] = clamp(base, 35, 96);
  });
  const avg = ovr(a);
  const shift = targetOvr - avg;
  if (shift !== 0) {
    ATTRS.forEach(at => {
      a[at.k] = clamp(a[at.k] + shift, 35, 96);
    });
  }
  tuneAttrsToTarget(a, targetOvr, pos, tpl, bt);
  const finalTarget = clamp(targetOvr, 60, 85);
  tuneAttrsToTarget(a, finalTarget, pos, tpl, bt);
  return a;
}

function rollPotential() { return rng(60, 99) }

// 根据属性生成初始倾向值 (内线/中投/外线, 范围55-75)
function rollTendencies() {
  const attrs = G.player.attrs || {};
  const shotInt = parseNum(attrs.shotInt, 55);
  const shotExt = parseNum(attrs.shotExt, 55);
  const shotMid = Math.round((shotInt + shotExt) / 2);
  // 属性→倾向: 基础与属性挂钩, 随机浮动, 上限100
  const calc = (attr) => clamp(Math.round(attr * 0.85 + rng(-5, 8)), 30, 100);
  return {
    in: calc(shotInt),
    mid: calc(shotMid),
    ex: calc(shotExt)
  };
}

function weightedIndex(weights) {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return rng(0, Math.max(0, weights.length - 1));
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return i;
  }
  return Math.max(0, weights.length - 1);
}
function buildDraftOrder60() {
  const recs = getLeagueTeamRecordsArray();
  const hasGames = recs.some(r => parseNum(r.gp, 0) > 0);
  const base = [...TEAMS].sort((a, b) => {
    if (hasGames) {
      const ra = recs.find(r => r.id === a.id) || { w: 0, l: 0 };
      const rb = recs.find(r => r.id === b.id) || { w: 0, l: 0 };
      return parseNum(ra.w, 0) - parseNum(rb.w, 0) || parseNum(rb.l, 0) - parseNum(ra.l, 0);
    }
    return getTeamStrength(a.id) - getTeamStrength(b.id);
  }).map(t => t.id);
  const lottery = base.slice(0, 14);
  const nonLottery = base.slice(14);
  const lotteryWeights = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];
  const pool = lottery.map((id, i) => ({ id, w: lotteryWeights[i] || 5 }));
  const top4 = [];
  for (let i = 0; i < 4 && pool.length; i++) {
    const idx = weightedIndex(pool.map(x => x.w));
    top4.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  const orderMap = new Map(base.map((id, i) => [id, i]));
  const remainLottery = pool.map(x => x.id).sort((a, b) => orderMap.get(a) - orderMap.get(b));
  const firstRound = [...top4, ...remainLottery, ...nonLottery];
  return [...firstRound, ...firstRound];
}
function scoutScoreProspect(p, { isUser = false } = {}) {
  const attrs = p.attrs && Object.keys(p.attrs).length ? p.attrs : null;
  const rating = parseNum(p.rating, attrs ? ovr(attrs) : 70);
  const potential = parseNum(p.potential, clamp(rating + rng(6, 16), 60, 99));
  let score = rating * 0.7 + potential * 0.3;
  if (isUser) score += 0.05;
  return score;
}
function getTeamDraftNeedWeights(teamId) {
  const roster = [...getTeamPlayers(teamId)];
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  roster.forEach(p => {
    const p1 = clamp(parseNum(p.pos, 3), 1, 5);
    counts[p1] = (counts[p1] || 0) + 1;
    const p2 = parseNum(p.pos2, 0);
    if (p2 >= 1 && p2 <= 5) counts[p2] = (counts[p2] || 0) + 0.5;
  });
  const need = {};
  for (let pos = 1; pos <= 5; pos++) {
    need[pos] = Math.max(0, 2.2 - (counts[pos] || 0));
  }
  return need;
}
function chooseDraftCandidateForTeam(pool, teamId, preferredId) {
  if (!pool.length) return null;
  const top = Math.max(1, Math.min(3, pool.length));
  const candidates = pool.slice(0, top);
  if (preferredId) {
    const prefIdx = pool.findIndex(p => String(p.id) === String(preferredId));
    if (prefIdx >= 0 && !candidates.some(p => String(p.id) === String(preferredId))) {
      candidates.push(pool[prefIdx]);
    }
  }
  const need = getTeamDraftNeedWeights(teamId);
  const scored = candidates.map(p => {
    const p1 = clamp(parseNum(p.pos, 3), 1, 5);
    const p2 = parseNum(p.pos2, 0);
    let fit = (need[p1] || 0) * 5;
    if (p2 >= 1 && p2 <= 5) fit = Math.max(fit, (need[p2] || 0) * 3.5);
    let score = p.scoutScore + fit + rng(-6, 6) * 0.08;
    if (preferredId && String(p.id) === String(preferredId)) score += 12;
    return { p, score };
  }).sort((a, b) => b.score - a.score);
  if (scored.length === 1) return scored[0].p;
  const roll = Math.random();
  if (roll < 0.7) return scored[0].p;
  if (roll < 0.9) return scored[Math.min(1, scored.length - 1)].p;
  return scored[Math.min(2, scored.length - 1)].p;
}

function simulateDraft() {
  const totalPicks = 60;
  const draftClass = generateDraftClass(totalPicks - 1, { targetYear: G.year });
  const prospects = draftClass.players.map(p => ({
    ...p,
    scoutScore: scoutScoreProspect(p)
  }));
  prospects.push({
    id: 'USER_PROSPECT',
    uid: 'USER_PROSPECT',
    name: G.player.name,
    pos: G.player.pos,
    rating: ovr(G.player.attrs),
    potential: G.player.potential,
    age: G.player.age,
    attrs: { ...G.player.attrs },
    photo: G.player.avatar || G.player.photo || '',
    scoutScore: scoutScoreProspect({
      pos: G.player.pos,
      rating: ovr(G.player.attrs),
      potential: G.player.potential,
      age: G.player.age,
      attrs: G.player.attrs
    }, { isUser: true })
  });
  const order = buildDraftOrder60();
  const boardPool = [...prospects].sort((a, b) => b.scoutScore - a.scoutScore || parseNum(b.potential, 0) - parseNum(a.potential, 0) || parseNum(b.rating, 0) - parseNum(a.rating, 0));
  const pickResults = [];
  let pickIndex = totalPicks - 1;
  let draftedTeamId = order[order.length - 1];
  for (let i = 0; i < totalPicks && boardPool.length; i++) {
    const pickNo = i + 1;
    const teamId = order[i] || TEAMS[rng(0, TEAMS.length - 1)].id;
    const chosen = chooseDraftCandidateForTeam(boardPool, teamId) || boardPool[0];
    const idx = boardPool.findIndex(p => String(p.id) === String(chosen.id));
    if (idx >= 0) boardPool.splice(idx, 1);
    pickResults.push({ pick: pickNo, teamId, player: chosen });
    if (chosen.id === 'USER_PROSPECT') {
      pickIndex = i;
      draftedTeamId = teamId;
    }
  }
  if (pickIndex >= totalPicks - 1) {
    const fallbackIndex = boardPool.findIndex(p => p.id === 'USER_PROSPECT');
    if (fallbackIndex >= 0) {
      const pickNo = Math.min(totalPicks, pickResults.length + 1);
      draftedTeamId = order[Math.min(order.length - 1, pickNo - 1)] || TEAMS[rng(0, TEAMS.length - 1)].id;
      pickResults.push({ pick: pickNo, teamId: draftedTeamId, player: boardPool[fallbackIndex] });
      boardPool.splice(fallbackIndex, 1);
      pickIndex = pickNo - 1;
    }
  }
  G.draftPick = pickIndex + 1;
  G.draftBoard = {
    tier: draftClass.tier,
    year: draftClass.year,
    classSize: pickResults.length,
    _pickResults: pickResults.map(r => ({ teamId: r.teamId, player: r.player })),
    top: pickResults.slice(0, 10).map(r => ({
      pick: r.pick,
      team: getTeam(r.teamId)?.a || '--',
      name: r.player.name,
      pos: getPos(parseNum(r.player.pos, 3))?.n || '-',
      rating: parseNum(r.player.rating, 70),
      potential: parseNum(r.player.potential, 78),
      user: r.player.id === 'USER_PROSPECT'
    })),
    results: pickResults.map(r => ({
      pick: r.pick,
      teamId: r.teamId,
      team: getTeam(r.teamId)?.a || '--',
      name: r.player.name,
      pos: getPos(parseNum(r.player.pos, 3))?.n || '-',
      rating: parseNum(r.player.rating, 70),
      potential: parseNum(r.player.potential, 78),
      user: r.player.id === 'USER_PROSPECT'
    }))
  };
  return draftedTeamId;
}

function assignToDraft() {
  const teamId = simulateDraft();
  G.teamId = teamId;
  G.team = getTeam(teamId);
  G.player.draft = parseNum(G.year, G.startYear || 2025) * 100 + parseNum(G.draftPick, 0);
  G.player.draftPick = parseNum(G.draftPick, 0);
  G.player.yearsLeague = 0;
  G.player.rookie = true;
  const c = rookieContractByPick(G.draftPick);
  G.player.salary = c.salary;
  G.player.contractYears = c.years;
  if (typeof applySeasonSalaryPayout === 'function') applySeasonSalaryPayout({ force: true, reason: '新秀合同首年薪资发放' });
  if (!G.player.teamsPlayed.includes(teamId)) G.player.teamsPlayed.push(teamId);
  recalcPlayerTradeValue();
}
function getDraftClassTopNames(limit = 5) {
  const top = Array.isArray(G.draftBoard?.top) ? G.draftBoard.top : [];
  return top.slice(0, Math.max(1, parseNum(limit, 5))).map(x => String(x?.name || '').trim()).filter(Boolean);
}
function buildDraftScoutingContext() {
  const pos = getPos(G.player.pos);
  const board = G.draftBoard || {};
  const tier = board.tier === 'big' ? '大年' : board.tier === 'weak' ? '小年' : '正常年';
  const topNames = getDraftClassTopNames(6);
  const team = getTeam(G.teamId) || {};
  return {
    season: G.season,
    startYear: parseNum(G.startYear, G.year),
    draftYear: parseNum(board.year, G.year),
    draftTier: tier,
    draftPick: parseNum(G.draftPick, 0),
    team: { id: team.id, name: team.z || team.n || '--', abbr: team.a || '--' },
    player: {
      name: String(G.player.name || '球员'),
      pos: pos?.n || '-',
      age: parseNum(G.player.age, 19),
      potential: parseNum(G.player.potential, 75),
      xfactor: G.player.xfactor || '',
      xfactorInfo: (() => {
        const xf = typeof getXFactor === 'function' ? getXFactor(G.player.xfactor) : null;
        return xf ? { n: xf.n, d: xf.d, icon: xf.icon } : null;
      })(),
      strengths: {
        pass: parseNum(G.player.attrs?.pass, 50),
        shotInt: parseNum(G.player.attrs?.shotInt, 50),
        shotExt: parseNum(G.player.attrs?.shotExt, 50),
        reb: parseNum(G.player.attrs?.reb, 50),
        blk: parseNum(G.player.attrs?.blk, 50),
        stl: parseNum(G.player.attrs?.stl, 50),
        speed: parseNum(G.player.attrs?.speed, 50),
        strength: parseNum(G.player.attrs?.strength, 50)
      }
    },
    classTopProspects: topNames
  };
}
function fallbackDraftScoutingReport(context) {
  const c = context || buildDraftScoutingContext();
  const pickNo = parseNum(c.draftPick, 0);
  const pickTag = pickNo === 1 ? '状元签' : (pickNo <= 3 ? '高顺位签' : (pickNo <= 14 ? '乐透签' : '轮换签位'));
  const topNames = (c.classTopProspects || []).slice(0, 3);
  const attrs = c.player?.strengths || {};
  const rank = [
    ['pass', '组织与阅读比赛', '组织能力'],
    ['shotInt', '内线终结', '篮下终结'],
    ['shotExt', '外线投射', '外线投射'],
    ['reb', '篮板卡位', '篮板争抢'],
    ['blk', '护筐威慑', '护筐能力'],
    ['stl', '抢断预判', '抢断嗅觉'],
    ['speed', '转换推进', '脚步速度'],
    ['strength', '对抗强度', '身体对抗']
  ].sort((a, b) => parseNum(attrs[b[0]], 50) - parseNum(attrs[a[0]], 50));

  // 最强3项作为优势
  const strengths = [];
  strengths.push(rank[0][1] + `（${parseNum(attrs[rank[0][0]], 50)}）`);
  strengths.push(rank[1][1] + `（${parseNum(attrs[rank[1][0]], 50)}）`);
  strengths.push(rank[2][1] + `（${parseNum(attrs[rank[2][0]], 50)}）`);

  // X-Factor天赋加入优势
  const xf = c.player?.xfactorInfo;
  if (xf) {
    strengths.push(`${xf.icon} X天赋「${xf.n}」: ${xf.d}`);
  }

  // 最弱2-3项作为缺点，附带具体数值
  const low = [...rank].reverse();
  const weaknesses = [];
  for (let i = 0; i < 3 && i < low.length; i++) {
    const val = parseNum(attrs[low[i][0]], 50);
    if (val < 70) {
      weaknesses.push(`${low[i][2]}偏弱（${val}），需要重点提升`);
    }
  }
  if (!weaknesses.length) {
    weaknesses.push(`需要提升 ${low[0][2]}（${parseNum(attrs[low[0][0]], 50)}）`);
  }

  // 根据X天赋补充风险提示
  if (c.player?.xfactor === 'glass_man') {
    weaknesses.push('「玻璃人」天赋导致伤病风险极高');
  } else if (c.player?.xfactor === 'toxic') {
    weaknesses.push('「更衣室毒瘤」天赋可能影响球队化学反应');
  } else if (c.player?.xfactor === 'streaky') {
    weaknesses.push('「情绪化」天赋导致表现波动极大');
  }

  const projection = pickNo === 1
    ? '预计直接进入首发并承担核心球权。'
    : pickNo <= 5
      ? '预计进入主轮换，赛季中后段争取首发。'
      : '预计先从轮换起步，通过表现争取更高角色。';

  // 结合X天赋的前景补充
  const xfProjection = xf ? ` 凭借「${xf.n}」天赋，${['sniper', 'deep_range', 'finisher', 'microwave', 'clutch'].includes(c.player?.xfactor) ? '进攻端有望快速兑现天赋。' :
    ['rim_wall', 'clamps', 'pickpocket', 'two_way_force'].includes(c.player?.xfactor) ? '防守端即战力突出。' :
      ['quick_learner', 'prodigy'].includes(c.player?.xfactor) ? '成长速度值得期待。' :
        ['iron', 'workhorse'].includes(c.player?.xfactor) ? '出勤率和耐久性有保障。' :
          '独特天赋为发展增添变数。'
    }` : '';

  return {
    title: `${c.draftYear} 选秀前瞻 · 球探快报`,
    summary: `${c.draftYear} 届选秀（${c.draftTier}）即将开始，${c.player?.name || '新秀'}是本届备受关注的新秀之一。`,
    projection: projection + xfProjection,
    strengths,
    weaknesses,
    comparable: topNames.length ? `同届关注球员：${topNames.join('、')}` : '同届竞争激烈，后续观察实战适配。',
    source: 'fallback',
    ts: Date.now()
  };
}

const AUTO_CAREER_DRAFT_MEDIA_FIELDS = [
  'headline',
  'summary',
  'expertMocks',
  'latestBuzz',
  'fanTalk',
  'consensus',
  'projection',
  'strengths',
  'weaknesses',
  'comparable',
  'story'
];

function buildDraftMediaFactPacket(context = null) {
  const c = context || buildDraftScoutingContext();
  const board = G.draftBoard || {};
  const results = Array.isArray(board.results) ? board.results : [];
  const top = Array.isArray(board.top) ? board.top : [];
  const attrs = c.player?.strengths || {};
  const attrRows = Object.entries(attrs)
    .map(([key, value]) => ({ key, value: parseNum(value, 0) }))
    .sort((a, b) => b.value - a.value);
  return {
    draftYear: c.draftYear,
    draftTier: c.draftTier,
    classSize: parseNum(board.classSize, results.length),
    userProspect: {
      name: c.player?.name || G.player?.name || '新秀',
      pos: c.player?.pos || '-',
      age: c.player?.age || 19,
      potential: c.player?.potential || 75,
      expectedPick: c.draftPick,
      expectedTeam: c.team,
      xfactor: c.player?.xfactorInfo || null,
      strongestAttrs: attrRows.slice(0, 4),
      weakestAttrs: attrRows.slice(-3)
    },
    projectedBoardTop10: top.slice(0, 10).map(item => ({
      pick: item.pick,
      team: item.team,
      name: item.name,
      pos: item.pos,
      rating: item.rating,
      potential: item.potential,
      isUser: !!item.user
    })),
    draftResultsForValidation: results.slice(0, 14).map(item => ({
      pick: item.pick,
      team: item.team,
      name: item.name,
      pos: item.pos,
      isUser: !!item.user
    })),
    guardrails: {
      eventTiming: 'draft_eve_before_reveal',
      noFinalPickLanguage: true,
      noFutureCareerData: true,
      useExpectedPickOnlyAsMediaProjection: true
    }
  };
}

function extractDraftMediaItemText(item) {
  if (item == null) return '';
  if (typeof item === 'object' && !Array.isArray(item)) {
    const source = cleanSocialText(item.source || item.outlet || item.author || item.account || item.team || '');
    const body = cleanSocialText(item.text || item.note || item.body || item.buzz || item.headline || item.title || item.summary || item.content || item.message || '');
    if (source && body && !body.startsWith(source)) return `${source}：${body}`;
    return body || source;
  }
  return cleanSocialText(item);
}

function splitDraftMediaText(text) {
  const raw = String(text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
  if (!raw) return [];
  const normalized = raw.replace(/(?:^|\n)\s*(?:[-*•]|\d{1,2}[.)、]|[一二三四五六七八九十]+[、.])\s*/g, '\n');
  const parts = normalized.split(/\n+|[；;]\s*/).map(part => cleanSocialText(part)).filter(Boolean);
  return parts.length ? parts : [raw];
}

function isUsableDraftMediaText(text) {
  const clean = cleanSocialText(text);
  if (clean.length < 4) return false;
  if (/^(null|undefined|none|n\/a|\[\]|\{\}|\[object object\])$/i.test(clean)) return false;
  if (/^LLM\s*未返回/.test(clean)) return false;
  return true;
}

function coerceDraftMediaList(value, max = 6) {
  const source = Array.isArray(value) ? value : [value];
  const out = [];
  source.forEach(item => {
    const text = extractDraftMediaItemText(item);
    splitDraftMediaText(text).forEach(part => {
      if (isUsableDraftMediaText(part) && !out.includes(part)) out.push(part);
    });
  });
  return out.slice(0, max);
}

function normalizeDraftScoutingReport(parsed, context, sourceOverride = '') {
  const strengths = coerceDraftMediaList(parsed?.strengths, 5);
  const weaknesses = coerceDraftMediaList(parsed?.weaknesses, 5);

  return {
    title: cleanSocialText(parsed?.title || parsed?.headline || `${context?.draftYear || G.year} 选秀前夜 · 媒体预测`),
    headline: cleanSocialText(parsed?.headline || parsed?.title || `${context?.draftYear || G.year} 选秀前夜 · 媒体预测`),
    summary: cleanSocialText(parsed?.summary || ''),
    projection: cleanSocialText(parsed?.projection || ''),
    strengths,
    weaknesses,
    comparable: cleanSocialText(parsed?.comparable || ''),
    expertMocks: coerceDraftMediaList(parsed?.expertMocks, 6),
    latestBuzz: coerceDraftMediaList(parsed?.latestBuzz, 6),
    fanTalk: coerceDraftMediaList(parsed?.fanTalk, 6),
    consensus: cleanSocialText(parsed?.consensus || ''),
    story: cleanSocialText(parsed?.story || ''),
    source: sourceOverride || parsed?.source || 'llm',
    ts: Date.now()
  };
}
function parseDraftScoutReportFromRaw(raw, context, sourceOverride = '') {
  if (!raw) return fallbackDraftScoutingReport(context);
  if (typeof raw === 'object') return normalizeDraftScoutingReport(raw, context, sourceOverride);
  const txt = String(raw).trim();
  if (!txt) return fallbackDraftScoutingReport(context);
  let parsed = tryParseJSONText(txt);
  if (!parsed) {
    const fixed = txt.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/, '').trim();
    parsed = tryParseJSONText(fixed);
  }
  if (!parsed) return fallbackDraftScoutingReport(context);
  return normalizeDraftScoutingReport(parsed, context, sourceOverride);
}

async function generateDraftScoutingReportFromLLM(context) {
  const facts = buildDraftMediaFactPacket(context);
  const raw = await callAutoCareerLLM('draft_media_prediction', facts, AUTO_CAREER_DRAFT_MEDIA_FIELDS);
  requireLLMJsonFields(raw, AUTO_CAREER_DRAFT_MEDIA_FIELDS, 'draft_media_prediction');
  const report = normalizeDraftScoutingReport(raw, context, 'llm');
  if (!report.expertMocks.length) throw new Error('draft_media_prediction missing usable expertMocks; return expertMocks as non-empty media mock strings.');
  if (!report.latestBuzz.length) throw new Error('draft_media_prediction missing usable latestBuzz; return latestBuzz as a JSON array of non-empty rumor/update strings.');
  if (!report.fanTalk.length) throw new Error('draft_media_prediction missing usable fanTalk; return fanTalk as non-empty fan reaction strings.');
  if (!report.story) throw new Error('draft_media_prediction missing usable story; return a non-empty story string.');
  return report;
}

// ============ DAILY STORY GENERATOR ============
function getLuxuryItemsNames() {
  ensureEconomyState();
  if (!G.economy.ownedItems || !G.economy.ownedItems.length) return "无";
  const names = (G.economy.ownedItems || []).map(id => {
    const item = LUXURY_MARKET.find(x => String(x.id) === String(id));
    return item?.name || String(id || '').trim();
  }).filter(Boolean);
  return names.length ? names.join('、') : '无';
}
function sanitizeImmersiveStoryText(text, { playerName = G.player?.name || '球员' } = {}) {
  let out = String(text || '').replace(/\r/g, '').trim();
  if (!out) return '';
  out = out.replace(/【\s*第\s*\d+\s*天\s*】/g, '');
  out = out.replace(/(^|[\n。！？])\s*今天是第\s*\d+\s*天[。！？]*/g, '$1');
  out = out.replace(/(^|[\n。！？])\s*综合评分[:：]?\s*\d+[^。！？\n]*[。！？]*/g, '$1');
  out = out.replace(/(^|[\n。！？])\s*[^。！？\n]{0,24}(?:OVR|POT|能力值|潜力值|属性点|属性|面板|任务)[^。！？\n]*[。！？]*/gi, '$1');
  out = out.replace(/(^|[\n。！？])\s*[^。！？\n]{0,18}\d{2,3}\s*(?:的)?评分[^。！？\n]*[。！？]*/g, '$1');
  out = out.replace(/休赛日/g, '休息日');
  out = out.replace(/玩家/g, String(playerName || '球员').trim() || '球员');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function formatGameStoryPeriodLines(flow = {}) {
  const periodLabels = Array.isArray(flow.periodLabels) && flow.periodLabels.length
    ? flow.periodLabels.map(label => String(label || '').trim()).filter(Boolean)
    : ['Q1', 'Q2', 'Q3', 'Q4'];
  const myPeriods = Array.isArray(flow.myPeriods) ? flow.myPeriods : [];
  const oppPeriods = Array.isArray(flow.oppPeriods) ? flow.oppPeriods : [];
  const total = Math.max(periodLabels.length, myPeriods.length, oppPeriods.length);
  const lines = [];

  for (let i = 0; i < total; i++) {
    const label = periodLabels[i] || `Q${i + 1}`;
    const myScore = parseNum(myPeriods[i], NaN);
    const oppScore = parseNum(oppPeriods[i], NaN);
    const myText = Number.isFinite(myScore) ? myScore : '—';
    const oppText = Number.isFinite(oppScore) ? oppScore : '—';
    lines.push(`${label} ${myText}-${oppText}`);
  }

  return lines;
}

function formatGameStoryTeamHighlights(teamSnapshot = null, label = '我方', limit = 3) {
  const rows = Array.isArray(teamSnapshot?.boxScore) ? teamSnapshot.boxScore.slice(0, Math.max(1, limit)) : [];
  if (!rows.length) return '';
  const text = rows.map(row => {
    const name = String(row?.name || '').trim() || '球员';
    const pts = parseNum(row?.pts, 0);
    const reb = parseNum(row?.reb, 0);
    const ast = parseNum(row?.ast, 0);
    return `${name}${pts}分${reb}板${ast}助`;
  }).join('；');
  return `【${label}主要表现】${text}`;
}

function getGameEventDomainLabel(attrKey = '') {
  const key = String(attrKey || '');
  if (['shotExt', 'shotInt', 'speed'].includes(key)) return '进攻';
  if (['stl', 'blk'].includes(key)) return '防守';
  if (key === 'physique') return '拼抢对抗';
  if (key === 'strength') return '心理对抗';
  if (key === 'pass') return '组织';
  return '综合';
}

function formatGameEventNarrativeLines(gameEvent) {
  if (!gameEvent || typeof gameEvent !== 'object') return [];
  const evt = (gameEvent.evt && typeof gameEvent.evt === 'object') ? gameEvent.evt : gameEvent;
  const roll = (gameEvent.roll && typeof gameEvent.roll === 'object') ? gameEvent.roll : {};
  const result = (gameEvent.result && typeof gameEvent.result === 'object') ? gameEvent.result : {};
  const mod = (result.mod && typeof result.mod === 'object') ? result.mod : {};
  const attrKey = String(evt.attr || '').trim();
  const attrLabel = typeof ATTRS !== 'undefined' && Array.isArray(ATTRS)
    ? (ATTRS.find(a => a.k === evt.attr)?.n || '综合')
    : '综合';
  const eventName = String(evt.n || '特殊事件').trim();
  const eventResult = String(result.desc || evt.desc || '本次事件已结算。').trim();
  const outcomeType = mod.type || (roll.success ? 'pos' : 'neg') || 'neu';
  const outcomeLabel = outcomeType === 'pos' ? '正面' : outcomeType === 'neg' ? '负面' : '中性';
  const lines = [
    `【特殊事件】${eventName}`,
    `【事件大类】${getGameEventDomainLabel(attrKey)}`,
    `【检定属性】${attrLabel}`
  ];
  const rollBits = [];
  const d20 = parseNum(roll.d20, NaN);
  if (Number.isFinite(d20)) rollBits.push(`d20=${d20}`);
  const modVal = parseNum(roll.mod, NaN);
  if (Number.isFinite(modVal)) rollBits.push(`修正=${modVal >= 0 ? '+' : ''}${modVal}`);
  const totalVal = parseNum(roll.total, NaN);
  if (Number.isFinite(totalVal)) rollBits.push(`总值=${totalVal}`);
  const dcVal = parseNum(roll.dc, NaN);
  if (Number.isFinite(dcVal)) rollBits.push(`DC=${dcVal}`);
  if (rollBits.length) lines.push(`【事件检定】${rollBits.join('，')}，${roll.success ? '成功' : '失败'}`);
  lines.push(`【结果倾向】${outcomeLabel}`);
  lines.push(`【事件结果】${eventResult}`);
  return lines;
}

function buildGameStoryNarrativeContext(result, matchup) {
  const gameRes = result?.gameResult || {};
  const flow = matchup?.flow || gameRes.flow || {};
  const opp = typeof getTeam === 'function' ? (getTeam(gameRes.opp) || {}) : {};
  const userTeamName = String(matchup?.userTeam?.name || matchup?.userTeam?.abbr || G.team?.z || G.team?.abbr || '我方').trim();
  const oppTeamName = String(matchup?.opponentTeam?.name || matchup?.opponentTeam?.abbr || opp.z || opp.a || opp.name || '对手').trim();
  const userScore = parseNum(gameRes.teamPts, 0);
  const oppScore = parseNum(gameRes.oppPts, 0);
  const finalMargin = Math.abs(userScore - oppScore);
  const hasOvertime = !!flow.hasOvertime;
  const closeGame = hasOvertime || finalMargin <= 7;
  const lines = [
    `【比赛叙事模式】${closeGame ? '焦灼收官' : '全场战报'}`,
    `【最终比分】${userTeamName} ${userScore} - ${oppScore} ${oppTeamName}`,
    `【最终分差】${finalMargin}分${hasOvertime ? '（含加时）' : ''}`
  ];
  const periodLines = formatGameStoryPeriodLines(flow);
  if (periodLines.length) lines.push(`【四节走势】${periodLines.join('；')}`);
  if (flow.summary) lines.push(`【比赛走势】${String(flow.summary).trim()}`);
  if (Array.isArray(flow.runs) && flow.runs.length) {
    const runText = flow.runs.map(r => String(r || '').trim()).filter(Boolean).slice(0, 4);
    if (runText.length) lines.push(`【关键连段】${runText.join('；')}`);
  }
  const userHighlights = formatGameStoryTeamHighlights(matchup?.userTeam, '我方', 3);
  if (userHighlights) lines.push(userHighlights);
  const oppHighlights = formatGameStoryTeamHighlights(matchup?.opponentTeam, '对手', 3);
  if (oppHighlights) lines.push(oppHighlights);
  const eventLines = formatGameEventNarrativeLines(result?.gameEvent);
  if (eventLines.length) lines.push(...eventLines);
  lines.push(
    closeGame
      ? '【写作要求】最后分差接近，重点写末节或加时的收官对抗，但不要忽略前三节的铺垫。'
      : '【写作要求】这场比赛不是焦灼局，请按全场四节节奏写完整战报，第四节只作收束，不要把整篇写成末节独角戏。'
  );
  return { closeGame, finalMargin, hasOvertime, lines };
}

function buildMatchRecapPromptContext(result, matchup, narrative) {
  const gameRes = result?.gameResult || result || {};
  const opp = getTeam(gameRes.opp) || {};
  const win = gameRes.win ? '胜利' : '失败';
  const st = gameRes.st || {};
  const userTeam = matchup?.userTeam?.name || matchup?.userTeam?.abbr || G.team?.z || '我方';
  const oppTeam = matchup?.opponentTeam?.name || matchup?.opponentTeam?.abbr || opp.z || opp.a || '对手';
  let text = `${G.player.name}司职${getPos(G.player.pos).n}，目前效力于${userTeam}。\n`;
  text += `本场对阵${oppTeam}，最终比分 ${userTeam} ${parseNum(gameRes.teamPts, 0)} - ${parseNum(gameRes.oppPts, 0)} ${oppTeam}，结果：${win}。\n`;
  text += `个人数据：${parseNum(st.pts, 0)}分 ${parseNum(st.reb, 0)}板 ${parseNum(st.ast, 0)}助 ${parseNum(st.stl, 0)}断 ${parseNum(st.blk, 0)}帽，命中 ${parseNum(st.fgm, 0)}/${parseNum(st.fga, 0)}，三分 ${parseNum(st.tpm, 0)}/${parseNum(st.tpa, 0)}。\n`;
  if (narrative?.lines?.length) {
    text += `\n【比赛走势信息】\n${narrative.lines.join('\n')}\n`;
  }
  return text.trim();
}

async function generateMatchRecapByTemplate(result, opts = {}) {
  if (typeof generateMatchRecapFromPool === 'function') return generateMatchRecapFromPool(result, opts);
  return { ok: false, message: '池化回顾不可用' };
}

async function generateDailyStoryByTemplate(result, opts = {}) {
  if (typeof generateDailyStoryFromPool === 'function') return generateDailyStoryFromPool(result, opts);
  return { ok: false, story: '今日无剧情记录。', changes: {} };
}

// ============ GAME EVENTS (DND STYLE) ============
const GAME_EVENTS = [
  // --- 进攻检定 ---
  // mod 字段说明 (赛前生效，影响模拟参数):
  //   extraFGA/extraFGM: 额外两分球出手/命中 (得分 = extraFGM * 2)
  //   extraFTA/extraFTM: 额外罚球出手/命中
  //   fgPctBoost: 命中率加成 (加到 inPct/doPct/exPct)
  //   extraTOV: 额外失误
  //   stl/blk/reb/ast: 直接加到对应数据
  //   minsPenalty: 上场时间惩罚
  //   attrPctBoost: 全属性百分比加成
  //   morale/stamina/grade: 士气/体力/评分修正
  {
    id: 'hot_hand', n: '手感火热', desc: '你感觉篮筐像大海一样宽广。', icon: '🔥',
    attr: 'shotExt', dc: 15,
    success: { desc: '投篮如有神助！(命中率+12%, +4个两分球命中)', mod: { fgPctBoost: 0.12, extraFGA: 4, extraFGM: 4, type: 'pos' } },
    fail: { desc: '或者是错觉？(无效果)', mod: { type: 'neu' } }
  },
  // 1. Update GAME_EVENTS clutch_time success mod
  {
    id: 'clutch_time', n: '关键时刻', desc: '比赛进入白热化阶段，需要有人站出来。', icon: '⏱️',
    attr: 'shotExt', dc: 18,
    // Add winRateBoost: 0.30
    success: { desc: '你接管了比赛！(胜率+30%, 命中率+10%, +3个两分球命中)', mod: { winRateBoost: 0.30, fgPctBoost: 0.10, extraFGA: 3, extraFGM: 3, type: 'pos' } },
    fail: { desc: '你没能顶住压力。(失误+2)', mod: { extraTOV: 2, type: 'neg' } }
  },


  {
    id: 'iso_battle', n: '单打对决', desc: '对面王牌向你发起了挑战。', icon: '⚔️',
    attr: 'shotInt', dc: 14,
    success: { desc: '你用得分回应了挑衅！(+3个两分球命中)', mod: { extraFGA: 3, extraFGM: 3, type: 'pos' } },
    fail: { desc: '你被防守限制住了。(命中率-10%)', mod: { fgPctBoost: -0.10, type: 'neg' } }
  },
  {
    id: 'ankle_breaker', n: '脚踝终结', desc: '尝试一个大幅度变向过人。', icon: '⛸️',
    attr: 'speed', dc: 16,
    success: { desc: '对手被你晃倒在地！(+2个两分球命中, +2罚球命中)', mod: { extraFGA: 2, extraFGM: 2, extraFTA: 2, extraFTM: 2, morale: 5, type: 'pos' } },
    fail: { desc: '运球失误，球丢了！(失误+1)', mod: { extraTOV: 1, type: 'neg' } }
  },

  // --- 防守检定 ---
  {
    id: 'lockdown', n: '死亡缠绕', desc: '你决定全场领防对方核心。', icon: '🔒',
    attr: 'stl', dc: 15,
    success: { desc: '对手心态崩了！(抢断+2)', mod: { stl: 2, type: 'pos' } },
    fail: { desc: '你被一步过掉。(犯规麻烦, 上场时间-5)', mod: { minsPenalty: -5, type: 'neg' } }
  },
  {
    id: 'rim_protect', n: '禁区守护', desc: '对手冲进了内线，准备起跳。', icon: '🧱',
    attr: 'blk', dc: 16,
    success: { desc: '排球大帽！(盖帽+2, 士气+3)', mod: { blk: 2, morale: 3, type: 'pos' } },
    fail: { desc: '被对手隔扣了...(士气-5)', mod: { morale: -5, type: 'neg' } }
  },

  // --- 身体/精神检定 ---
  {
    id: 'loose_ball', n: '地板球争夺', desc: '一个五五开的球权机会。', icon: '👐',
    attr: 'physique', dc: 14,
    success: { desc: '你拼下了球权！(抢断+1, 评价提升)', mod: { stl: 1, grade: 10, type: 'pos' } },
    fail: { desc: '你慢了一步，还受了点硬伤。(体力-10)', mod: { stamina: -10, type: 'neg' } }
  },
  {
    id: 'trash_talk', n: '垃圾话', desc: '对手在耳边喋喋不休。', icon: '🗣️',
    attr: 'strength', dc: 12,
    success: { desc: '你用表现让他闭嘴。(全属性+5%)', mod: { attrPctBoost: 0.05, type: 'pos' } },
    fail: { desc: '你心态受到了影响。(失误+1, 命中率-5%)', mod: { extraTOV: 1, fgPctBoost: -0.05, type: 'neg' } }
  }
];

function rollGameEvent() {
  const ev = pick(GAME_EVENTS);
  const attrKey = ev.attr; // e.g. 'shotExt'
  // 获取玩家属性并计算调整值 (Attr - 50) / 2，类似 DND
  // 50属性 = +0, 60 = +5, 90 = +20, 99 = +24
  const attrVal = getEffectiveAttr(attrKey);
  const mod = Math.floor((attrVal - 50) / 2);

  // Dynamic Difficulty: Adjust DC based on opponent strength
  let dcMod = 0;
  try {
    // Check if G.schedule is available and valid
    if (G.schedule && G.gameNum >= 0 && G.gameNum < G.schedule.length) {
      const nextGame = G.schedule[G.gameNum];
      if (nextGame) {
        const oppId = nextGame.opp;
        const oppStr = getTeamStrength(oppId);
        // Average strength ~75. Strong teams ~90 (+15). Weak ~65 (-10).
        // Adjust DC by +1 for every 6 points of strength difference from 75
        dcMod = Math.round((oppStr - 75) / 6);
      }
    }
  } catch (e) { console.warn('Dynamic Difficulty check failed', e); }

  const d20 = rng(1, 20);
  const finalDc = ev.dc + dcMod;
  const total = d20 + mod;
  const success = total >= finalDc;

  return {
    evt: ev,
    roll: { d20, mod, total, success, dc: finalDc }, // Return final DC for UI
    result: success ? ev.success : ev.fail
  };
}

// 赛前预掷事件 (由UI层在比赛前调用，展示给玩家后再开始模拟)
function rollPreGameEvent() {
  if (G.player?.injury?.active) {
    G._gameEvent = null;
    G._gameEventResult = null;
    return null;
  }
  const ev = Math.random() < 0.15 ? rollGameEvent() : null;
  G._gameEvent = ev;
  G._gameEventResult = ev || null;
  return ev;
}

function getPlayerLiveAttrBoosts(player = G.player) {
  const isUser = player === G.player || !!player?.isSelf || String(player?.id || '') === 'USER_SELF';
  if (!isUser || typeof getEndorsementState !== 'function') return {};
  const state = getEndorsementState();
  if (!state || typeof state !== 'object') return {};
  const activeContract = state.signatureShoe
    || ((state.active || []).find(deal => deal && deal.shoe && deal.shoeEligible) || null);
  if (!activeContract) return {};
  const shoe = typeof getSignatureShoeCurrentState === 'function'
    ? getSignatureShoeCurrentState(activeContract)
    : (activeContract.shoe || null);
  const boosts = shoe?.boosts;
  return boosts && typeof boosts === 'object' ? boosts : {};
}

// 获取徽章加成效果汇总
function getBadgeEffects(player) {
  const fx = {
    // 基础命中率
    fgPctBonus: 0, tpPctBonus: 0, ftPctBonus: 0,
    // 属性加成
    attrBoost: {},
    astFlat: 0, rebFlat: 0, stlFlat: 0, blkFlat: 0,
    insidePctBonus: 0,
    // 特殊效果
    staminaCostMult: 1.0, staminaRegen: 0, injuryMult: 1.0,
    xpMult: 1.0,
    // 战斗特定
    heatUpRate: 1.0, // 微波炉
    clutchBoost: 0.0, // 关键时刻
    highlightBoost: 0.0, // 高光表现
    contestResist: 0.0, // 抗干扰
    tovMult: 1.0, // 失误倍率
    // X天赋专用
    attrPct: 0, // 全属性百分比加成
    varianceRange: 6, // 表现波动范围(默认6)
    underdogBoost: 0, // 落后时属性加成
    usageBoost: 0, // 使用率/得分加成
    rookieBoost: 0 // 新秀赛季加成
  };
  if (!player) return fx;

  // 遍历 X-Factors
  if (player.xfactor) {
    const xf = XFACTORS.find(x => x.id === player.xfactor);
    if (xf && xf.effect) mergeEffects(fx, xf.effect);
  }

  // 遍历 Badges
  if (player.badges) {
    if (Array.isArray(player.badges)) {
      // Legacy support: Array of strings
      player.badges.forEach(bid => {
        const b = BADGES.find(x => x.id === bid);
        if (b && b.effect) mergeEffects(fx, b.effect);
      });
    } else if (typeof player.badges === 'object') {
      // New support: Object { id: level }
      Object.entries(player.badges).forEach(([bid, level]) => {
        const b = BADGES.find(x => x.id === bid);
        const lv = Math.max(0, Math.min(4, parseNum(level, 0)));
        if (b && b.effect && lv > 0) {
          // Scale effect by level (Base * Level) or custom logic
          // Simple scaling for now: Effect * Level
          // Special case for multipliers (e.g. 0.95 -> 1 - (1-0.95)*lvl ?)
          // For now assuming additive bonuses like pctBonus, attrBoost
          const scaled = {};
          for (const k in b.effect) {
            const v = b.effect[k];
            if (k.toLowerCase().includes('mult')) {
              // Multipliers: start with 1, apply (val-1)*lvl + 1 ?
              // e.g. 1.05 -> 1 + 0.05*4 = 1.2
              // e.g. 0.95 -> 1 - 0.05*4 = 0.8
              // Simplified: Math.pow(v, lv) maybe?
              // Let's use linear scaling for deviation from 1
              const diff = v - 1;
              scaled[k] = 1 + (diff * lv);
            } else if (typeof v === 'number') {
              scaled[k] = v * lv;
            } else if (typeof v === 'object' && v !== null) {
              // Nested object like attrBoost
              scaled[k] = {};
              for (const subK in v) {
                scaled[k][subK] = v[subK] * lv;
              }
            } else {
              scaled[k] = v;
            }
          }
          mergeEffects(fx, scaled);
        }
      });
    }
  }
  const liveAttrBoosts = getPlayerLiveAttrBoosts(player);
  if (liveAttrBoosts && typeof liveAttrBoosts === 'object') {
    mergeEffects(fx, { attrBoost: liveAttrBoosts });
  }
  return fx;
}

function mergeEffects(target, source) {
  if (source.fgPct) target.fgPctBonus = (target.fgPctBonus || 0) + source.fgPct;
  if (source.fgPctBonus) target.fgPctBonus += source.fgPctBonus;
  if (source.tpPctBonus) target.tpPctBonus += source.tpPctBonus;
  if (source.ftPctBonus) target.ftPctBonus += source.ftPctBonus;
  if (source.staminaRegen) target.staminaRegen += source.staminaRegen;
  if (source.xpMult && source.xpMult !== 1) target.xpMult *= source.xpMult;
  if (source.highlightBoost) target.highlightBoost += source.highlightBoost;
  if (source.contestResist) target.contestResist += source.contestResist;
  if (source.deep3) target.tpPctBonus += source.deep3; // 无限射程归入三分
  if (source.corner3) target.tpPctBonus += source.corner3 * 0.3; // 简化底角加成到整体三分
  if (source.staminaCostMult) target.staminaCostMult *= source.staminaCostMult;
  if (source.staminaSave) target.staminaCostMult *= (1 - source.staminaSave);
  if (source.injuryMult) target.injuryMult *= source.injuryMult;
  if (source.heatUpRate) target.heatUpRate = Math.max(target.heatUpRate, source.heatUpRate); // 取最大
  if (source.clutchShot) target.clutchBoost += source.clutchShot;
  if (source.clutchBoost) target.clutchBoost += source.clutchBoost;
  if (source.tovMult !== undefined) {
    const tv = parseNum(source.tovMult, 0);
    if (tv > 0 && tv < 2) target.tovMult *= tv;
    else target.tovMult += tv;
  }
  if (source.astFlat) target.astFlat += source.astFlat;
  if (source.rebFlat) target.rebFlat += source.rebFlat;
  if (source.stlFlat) target.stlFlat += source.stlFlat;
  if (source.blkFlat) target.blkFlat += source.blkFlat;
  if (source.contactLayup) target.insidePctBonus += source.contactLayup;
  if (source.acrobatLayup) target.insidePctBonus += source.acrobatLayup * 0.9;
  if (source.floater) target.insidePctBonus += source.floater * 0.7;
  if (source.contactDunk) target.insidePctBonus += source.contactDunk * 0.6;
  if (source.postPush) target.insidePctBonus += source.postPush * 0.4;
  if (source.lobFinish) target.insidePctBonus += source.lobFinish * 0.5;
  if (source.teammateShotBoost) target.astFlat += source.teammateShotBoost * 10;
  if (source.passInterceptResist) target.tovMult *= Math.max(0.55, 1 - source.passInterceptResist * 0.45);
  if (source.stripResist) target.tovMult *= Math.max(0.55, 1 - source.stripResist * 0.45);
  if (source.passIntercept) target.stlFlat += source.passIntercept * 5;
  if (source.blockBoost) target.blkFlat += source.blockBoost * 4;
  if (source.chaseDownBlock) target.blkFlat += source.chaseDownBlock * 2.5;
  if (source.rebRange) target.rebFlat += source.rebRange * 10;
  if (source.boxoutStrength) target.rebFlat += source.boxoutStrength * 7;
  if (source.wormMove) target.rebFlat += source.wormMove * 6;
  if (source.teamOffAttr) {
    target.attrBoost.pass = (target.attrBoost.pass || 0) + source.teamOffAttr;
    target.attrBoost.shotInt = (target.attrBoost.shotInt || 0) + source.teamOffAttr;
    target.attrBoost.shotExt = (target.attrBoost.shotExt || 0) + source.teamOffAttr;
  }
  if (source.teamDefAttr) {
    target.attrBoost.stl = (target.attrBoost.stl || 0) + source.teamDefAttr;
    target.attrBoost.blk = (target.attrBoost.blk || 0) + source.teamDefAttr;
    target.attrBoost.reb = (target.attrBoost.reb || 0) + source.teamDefAttr;
  }

  if (source.attrBoost) {
    for (let k in source.attrBoost) {
      target.attrBoost[k] = (target.attrBoost[k] || 0) + source.attrBoost[k];
    }
  }
  // 全属性加成（玻璃人等）
  if (source.attrBonus) {
    const allKeys = ['pass', 'shotInt', 'shotExt', 'shotFree', 'speed', 'strength', 'reb', 'blk', 'stl'];
    allKeys.forEach(k => { target.attrBoost[k] = (target.attrBoost[k] || 0) + source.attrBonus; });
  }
  // 全属性百分比加成（双向统治等）
  if (source.attrPct) target.attrPct += source.attrPct;
  // 表现波动范围（情绪化/冷静心态）
  if (source.varianceRange !== undefined) target.varianceRange = source.varianceRange;
  // 落后时属性加成（逆境之王）
  if (source.underdogBoost) target.underdogBoost += source.underdogBoost;
  // 使用率/得分加成（微波炉/毒瘤）
  if (source.usageBoost) target.usageBoost += source.usageBoost;
  // 新秀赛季加成（天才新秀）
  if (source.rookieBoost) target.rookieBoost += source.rookieBoost;
}

function getEffectiveAttr(key) {
  let v = parseNum(G.player.attrs[key], 60);
  // 应用徽章/X-Factor 属性加成
  const fx = getBadgeEffects(G.player);
  if (fx.attrBoost && fx.attrBoost[key]) v += fx.attrBoost[key];

  const staminaStatus = getStaminaStatus(G.player.stamina);
  v *= staminaStatus.attrMult;

  // 努力程度倍率
  const effortCfg = getEffortMode(G._effortMode);
  v *= effortCfg.attrMult;

  // 关键属性加成 (简单判定：最后几场或季后赛)
  if (fx.clutchBoost > 0 && (G.gameNum > 75 || G.phase === 'playoffs')) {
    v *= (1 + fx.clutchBoost);
  }

  return typeof clampMatchEffectiveAttr === 'function'
    ? clampMatchEffectiveAttr(v)
    : clamp(Math.round(v), 20, 125);
}

function getUserShotPctCap(type, player = G.player) {
  const baseAttrs = (player?.attrs && typeof player.attrs === 'object') ? player.attrs : {};
  const baseShotInt = clamp(parseNum(baseAttrs.shotInt, 55), 20, 99);
  const baseShotExt = clamp(parseNum(baseAttrs.shotExt, 55), 20, 99);
  const baseShotFree = clamp(parseNum(baseAttrs.shotFree, 55), 20, 99);
  const baseShotMid = Math.round((baseShotInt + baseShotExt) / 2);
  if (type === 'in') return baseShotInt >= 99 ? 90 : 80;
  if (type === 'do') return baseShotMid >= 99 ? 70 : 60;
  if (type === 'ex') return baseShotExt >= 99 ? 55 : 48;
  if (type === 'fr') return baseShotFree >= 95 ? 95 : baseShotFree >= 85 ? 90 : baseShotFree >= 70 ? 82 : 72;
  return 99;
}

function simGameStats(oppRating) {
  const fx = getBadgeEffects(G.player);
  const coachFx = getCoachEffects(G.teamId);
  const attrs = { ...G.player.attrs };
  if (fx.attrBoost) {
    Object.entries(fx.attrBoost).forEach(([k, v]) => {
      attrs[k] = typeof clampMatchEffectiveAttr === 'function'
        ? clampMatchEffectiveAttr(parseNum(attrs[k], 55) + parseNum(v, 0))
        : clamp(Math.round(parseNum(attrs[k], 55) + parseNum(v, 0)), 20, 125);
    });
  }
  // === 赛前事件修正 (在模拟前注入参数) ===
  const evMod = (G._gameEventResult?.result?.mod) || {};
  if (evMod.attrPctBoost) {
    const boost = parseNum(evMod.attrPctBoost, 0);
    Object.keys(attrs).forEach(k => {
      attrs[k] = typeof clampMatchEffectiveAttr === 'function'
        ? clampMatchEffectiveAttr(attrs[k] * (1 + boost))
        : clamp(Math.round(attrs[k] * (1 + boost)), 20, 125);
    });
  }
  // X天赋: 全属性百分比加成（双向统治）
  if (fx.attrPct) {
    Object.keys(attrs).forEach(k => {
      attrs[k] = typeof clampMatchEffectiveAttr === 'function'
        ? clampMatchEffectiveAttr(attrs[k] * (1 + fx.attrPct))
        : clamp(Math.round(attrs[k] * (1 + fx.attrPct)), 20, 125);
    });
  }
  // X天赋: 逆境之王 - 落后时属性加成
  if (fx.underdogBoost && G.seasonStats.losses > G.seasonStats.wins) {
    Object.keys(attrs).forEach(k => {
      attrs[k] = typeof clampMatchEffectiveAttr === 'function'
        ? clampMatchEffectiveAttr(attrs[k] * (1 + fx.underdogBoost))
        : clamp(Math.round(attrs[k] * (1 + fx.underdogBoost)), 20, 125);
    });
  }

  const ovrVal = ovr(attrs);
  const diff = ovrVal - oppRating;
  const pos = parseNum(G.player.pos, 3);
  const roleFx = getUserRoleFx();
  const minsRaw = clamp(parseNum(G._currentRoleMinutes, 32) + rng(-2, 2), 14, 42);
  const mins = clamp(minsRaw + parseNum(evMod.minsPenalty, 0), 10, 42);

  // 倾向值 (内线/中投/外线)
  const tendencyIn = parseNum(G.player.tendencies?.in, 55);
  const tendencyMid = parseNum(G.player.tendencies?.mid, 55);
  const tendencyEx = parseNum(G.player.tendencies?.ex, 55);

  // 努力模式
  const effortCfg = getEffortMode(G._effortMode);
  const effortMult = effortCfg.attrMult || 1;

  // === 出手分配 (APK风格: 倾向控制出手量, 技能控制命中率) ===
  const usageExtra = parseNum(fx.usageBoost, 0);
  const usage = clamp(0.27 + ((ovrVal - 70) * 0.003) + (diff / 80) + usageExtra + roleFx.usageMod, 0.18, 0.52) * posUsageFactor(pos);
  const fga = clamp(Math.round(mins * usage * effortMult * clamp(Math.pow(parseNum(coachFx.paceMult, 1), 0.55), 0.90, 1.10)) + rng(-2, 2), 4, 28);

  // 三分出手率: 受倾向ex + 三分技能 + 位置偏好 + 角色加成
  const threeRateBase = 0.08 + parseNum(attrs.shotExt, 55) / 260 + (tendencyEx - 50) / 500 + posThreeBias(pos) + roleFx.threeMod;
  const threeRate = clamp(threeRateBase * clamp(parseNum(coachFx.threeRateMult, 1), 0.82, 1.28), 0.04, 0.60);
  const tpa = clamp(Math.round(fga * threeRate) + rng(-1, 1), 0, Math.min(14, fga));
  const nonThree = Math.max(0, fga - tpa);

  // 内线出手比例: 受倾向in + 内线技能, 中投倾向mid降低内线比例 + 角色加成
  const inShareBase = 0.32 + parseNum(attrs.shotInt, 55) / 290 + (tendencyIn - 50) / 500 - (tendencyMid - 50) / 550 - (threeRate * 0.18) + roleFx.insideMod;
  const inShare = clamp(inShareBase * clamp(parseNum(coachFx.paintRateMult, 1), 0.82, 1.24), 0.22, 0.76);
  const shotsIn = clamp(Math.round(nonThree * inShare), 0, nonThree);
  const shotsDo = Math.max(0, nonThree - shotsIn); // 中距离

  // === 命中率 (技能决定 + 事件加成) ===
  const insidePctBonus = parseNum(fx.fgPctBonus, 0) + parseNum(fx.insidePctBonus, 0);
  const evFgBoost = parseNum(evMod.fgPctBoost, 0) * 100;
  const contestBonus = parseNum(fx.contestResist, 0) * 100; // 抗干扰命中率加成
  // 关键时刻加成：赛季末段或季后赛时命中率提升
  const clutchPct = (fx.clutchBoost > 0 && (G.gameNum > 75 || G.phase === 'playoffs')) ? fx.clutchBoost * 100 : 0;
  const inPct = clamp(Math.round(shotPctByType('in', attrs, ovrVal, oppRating) + insidePctBonus * 100 + evFgBoost + contestBonus + clutchPct), 40, getUserShotPctCap('in'));
  const doPct = clamp(Math.round(shotPctByType('do', attrs, ovrVal, oppRating) + insidePctBonus * 80 + evFgBoost + contestBonus + clutchPct), 32, getUserShotPctCap('do'));
  const exPct = clamp(Math.round(shotPctByType('ex', attrs, ovrVal, oppRating) + parseNum(fx.tpPctBonus, 0) * 100 + evFgBoost + contestBonus * 0.5 + clutchPct), 22, getUserShotPctCap('ex'));
  const frPct = clamp(Math.round(shotPctByType('fr', attrs, ovrVal, oppRating) + parseNum(fx.ftPctBonus, 0) * 100), 40, getUserShotPctCap('fr'));

  // === 投篮结果 ===
  const inOk = shotInResult(inPct, shotsIn);
  const doOk = shotDoResult(doPct, shotsDo);
  const exOk = shotExResult(exPct, tpa);
  // 事件额外两分球 (extraFGA/extraFGM 代表额外的两分球出手和命中)
  const evExtraFGA = clamp(parseNum(evMod.extraFGA, 0), 0, 8);
  const evExtraFGM = clamp(parseNum(evMod.extraFGM, 0), 0, evExtraFGA);
  const fgm = inOk + doOk + exOk + evExtraFGM;
  const totalFga = fga + evExtraFGA;

  // === 罚球 (受内线出手 + 突破能力) ===
  const drive = ((parseNum(attrs.shotInt, 55) * 0.42) + (parseNum(attrs.physique, 55) * 0.3) + (parseNum(attrs.strength, 55) * 0.28));
  const ftaBase = (shotsIn * 0.31) + (shotsDo * 0.08) + (drive / 120);
  // 事件额外罚球
  const evExtraFTA = clamp(parseNum(evMod.extraFTA, 0), 0, 10);
  const evExtraFTM = clamp(parseNum(evMod.extraFTM, 0), 0, evExtraFTA);
  const fta = clamp(Math.round(ftaBase) + rng(0, 2), 0, 14) + evExtraFTA;
  const ftm = shotFrResult(frPct, fta - evExtraFTA) + evExtraFTM;

  // === 其他数据 (位置系数 + 技能) ===
  const astBase = (mins / 36) * (0.7 + parseNum(attrs.pass, 55) / 24) * posAstFactor(pos) * clamp(parseNum(coachFx.astMult, 1), 0.90, 1.24);
  const rebBase = (mins / 36) * (1.1 + parseNum(attrs.reb, 55) / 18) * posRebFactor(pos) * clamp(parseNum(coachFx.rebMult, 1), 0.90, 1.24);
  const stlBase = (mins / 36) * (parseNum(attrs.stl, 55) / 48) * posStlFactor(pos) * clamp(parseNum(coachFx.stocksMult, 1), 0.90, 1.24);
  const blkBase = (mins / 36) * (parseNum(attrs.blk, 55) / 48) * posBlkFactor(pos) * clamp(parseNum(coachFx.stocksMult, 1), 0.90, 1.24);
  const tovBase = (mins / 36) * (1 + fga / 8 + (pos <= 2 ? 0.65 : 0.25) - parseNum(attrs.pass, 55) / 95 - roleFx.astMod * 0.08);

  const ast = clamp(Math.round(astBase + roleFx.astMod + parseNum(fx.astFlat, 0)) + rng(-2, 2), 0, 14);
  const reb = clamp(Math.round(rebBase + roleFx.rebMod + parseNum(fx.rebFlat, 0)) + rng(-1, 2), 0, 20);
  const stl = clamp(Math.round(stlBase + roleFx.stlMod + parseNum(fx.stlFlat, 0)) + rng(0, 1) + parseNum(evMod.stl, 0), 0, 8);
  const blk = clamp(Math.round(blkBase + roleFx.blkMod + parseNum(fx.blkFlat, 0)) + rng(0, 1) + parseNum(evMod.blk, 0), 0, 8);
  const tov = clamp(Math.round(tovBase * clamp(parseNum(fx.tovMult, 1), 0.55, 1.8)) + rng(0, 2) + parseNum(evMod.extraTOV, 0), 0, 10);

  let line = clampLineStats({ mins, reb, ast, stl, blk, tov, fgm, fga: totalFga, tpm: exOk, tpa, ftm, fta, pts: 0 });

  // X天赋: 表现波动（情绪化=±12, 冷静心态=±2, 默认=±6）
  // 注意：所有得分修正必须通过投篮数据实现，不能直接改pts，否则pts与fgm/tpm/ftm不一致
  const variance = parseNum(fx.varianceRange, 6);
  if (variance > 0) {
    const swing = rng(-variance, variance);
    if (swing > 0) {
      const addFgm = Math.floor(swing / 2);
      const addFt = swing - addFgm * 2;
      line.fgm += addFgm; line.fga += addFgm + rng(0, 1);
      if (addFt > 0) { line.ftm += addFt; line.fta += addFt; }
    } else if (swing < 0) {
      let rem = Math.abs(swing);
      const canRm2 = Math.max(0, line.fgm - line.tpm);
      const rm2 = Math.min(Math.floor(rem / 2), canRm2);
      line.fgm -= rm2; rem -= rm2 * 2;
      if (rem > 0) { const rmFt = Math.min(rem, line.ftm); line.ftm -= rmFt; }
    }
  }
  // X天赋: 新秀赛季加成（天才新秀）
  if (fx.rookieBoost && parseNum(G.season, 1) === 1) {
    const boost = fx.rookieBoost;
    const addFgm = Math.max(0, Math.round((line.fgm - line.tpm) * boost));
    const addTpm = Math.max(0, Math.round(line.tpm * boost));
    const addFtm = Math.max(0, Math.round(line.ftm * boost));
    line.fgm += addFgm + addTpm; line.fga += addFgm + addTpm + rng(0, 1);
    line.tpm += addTpm; line.tpa += addTpm;
    line.ftm += addFtm; line.fta += addFtm + rng(0, 1);
    line.ast = Math.min(14, Math.round(line.ast * (1 + boost * 0.5)));
    line.reb = Math.min(20, Math.round(line.reb * (1 + boost * 0.5)));
  }
  // X天赋: 高光表现（花式大师）— 随机触发额外得分
  if (fx.highlightBoost && Math.random() < fx.highlightBoost) {
    const extraPts = rng(3, 8);
    const addFgm = Math.floor(extraPts / 2);
    const addFt = extraPts - addFgm * 2;
    line.fgm += addFgm; line.fga += addFgm + rng(0, 1);
    if (addFt > 0) { line.ftm += addFt; line.fta += addFt; }
    line.ast = Math.min(14, line.ast + rng(1, 2));
  }
  // 重新校验所有数据，pts从投篮数据重新计算
  line = clampLineStats(line);

  // 体力消耗
  let staminaCost = rng(10, 20) + Math.round(parseNum(line.mins, 24) / 6);
  if (fx.staminaCostMult) staminaCost = Math.round(staminaCost * fx.staminaCostMult);
  staminaCost = Math.round(staminaCost * effortCfg.staminaMult);
  G.player.stamina = clamp(G.player.stamina - staminaCost, 0, 100);
  if (fx.staminaRegen) G.player.stamina = clamp(G.player.stamina + fx.staminaRegen, 0, 100);
  // 事件体力修正
  if (evMod.stamina) G.player.stamina = clamp(G.player.stamina + evMod.stamina, 0, 100);

  return {
    mins: line.mins, pts: line.pts, reb: line.reb, ast: line.ast, stl: line.stl, blk: line.blk, tov: line.tov,
    fgm: line.fgm, fga: line.fga, tpm: line.tpm, tpa: line.tpa, ftm: line.ftm, fta: line.fta
  };
}

async function generateDraftScoutingReport({ force = false } = {}) {
  if (!force && G.draftScoutingReport) return G.draftScoutingReport;
  const context = buildDraftScoutingContext();
  const report = await generateDraftScoutingReportFromLLM(context);
  G.draftScoutingReport = report;
  return G.draftScoutingReport;
}

// ============ MATCH SIMULATION ============


const POSTGAME_FORCED_MODAL_CAP_PER_GAME = 1;
const POSTGAME_FORCED_MODAL_MIN_PRIORITY = 70;

const PREGAME_PLAN_DEFS = {
  axes: [
    {
      id: 'offense',
      title: '进攻重心',
      options: [
        { id: 'balanced_usage', title: '顺势接管', detail: '先读防守，再决定自己攻还是带队友。', effects: {}, tag: '稳定' },
        { id: 'attack_rim', title: '压迫篮筐', detail: '更多冲击和罚球，代价是失误与体能压力。', effects: { pts: 2, fga: 1, fta: 2, tov: 1, staminaLoss: 2, coachDelta: 1 }, tag: '突破' },
        { id: 'early_playmaking', title: '先带队友', detail: '用传球建立节奏，个人得分会被压一点。', effects: { pts: -1, ast: 2, tov: -1, coachDelta: 1, lockerDelta: 1 }, tag: '组织' },
        { id: 'spacing_pullup', title: '外线惩罚', detail: '增加外线出手，适合对手收缩防线时使用。', effects: { pts: 1, fga: 1, tpa: 2, reb: -1, mediaDelta: 1 }, tag: '投射' }
      ]
    },
    {
      id: 'defense',
      title: '防守任务',
      options: [
        { id: 'stay_solid', title: '稳住站位', detail: '少犯错，优先不被对方点名。', effects: { pf: -1 }, tag: '稳健' },
        { id: 'point_of_attack', title: '领防持球点', detail: '主动给对方后场压力，抢断和犯规都会上升。', effects: { stl: 1, pf: 1, staminaLoss: 1, coachDelta: 1 }, tag: '压迫' },
        { id: 'help_rim', title: '协防护筐', detail: '多收进禁区协防，篮板和盖帽机会更高。', effects: { reb: 1, blk: 1, pf: 1, lockerDelta: 1 }, tag: '协防' }
      ]
    },
    {
      id: 'tempo',
      title: '节奏选择',
      options: [
        { id: 'standard', title: '正常节奏', detail: '按球队默认速度打，不额外冒险。', effects: {}, tag: '默认' },
        { id: 'push_pace', title: '提速抢早攻', detail: '更多转换回合，也更容易打乱自己的体能。', effects: { mins: 1, pts: 1, ast: 1, tov: 1, staminaLoss: 2, mediaDelta: 1 }, tag: '提速' },
        { id: 'control_clock', title: '压节奏控回合', detail: '减少乱战和失误，个人出手也会收一点。', effects: { fga: -1, tov: -1, staminaLoss: -1, coachDelta: 1 }, tag: '控场' }
      ]
    }
  ]
};

function ensureGameplayState() {
  if (!G.gameplay || typeof G.gameplay !== 'object') G.gameplay = {};
  if (!G.gameplay.postgameDirector || typeof G.gameplay.postgameDirector !== 'object') G.gameplay.postgameDirector = {};
  const director = G.gameplay.postgameDirector;
  if (!director.lastEventDayByType || typeof director.lastEventDayByType !== 'object') director.lastEventDayByType = {};
  if (!director.lastEventGameIdByType || typeof director.lastEventGameIdByType !== 'object') director.lastEventGameIdByType = {};
  if (!director.forcedModalCountByGameId || typeof director.forcedModalCountByGameId !== 'object') director.forcedModalCountByGameId = {};
  if (!Array.isArray(director.suppressedEvents)) director.suppressedEvents = [];
  if (!Array.isArray(director.pendingInboxEvents)) director.pendingInboxEvents = [];
  if (!G.gameplay.pregamePlanByGame || typeof G.gameplay.pregamePlanByGame !== 'object') G.gameplay.pregamePlanByGame = {};
  if (!G.gameplay.careerLines || typeof G.gameplay.careerLines !== 'object') G.gameplay.careerLines = {};
  const defaults = {
    coach: { score: 50, stage: 'rotation_watch', lastDelta: 0 },
    rotation: { score: 35, stage: 'bench', lastDelta: 0 },
    lockerRoom: { score: 50, stage: 'neutral', lastDelta: 0 },
    media: { score: 20, stage: 'local_notice', heat: 0, lastDelta: 0 },
    starCircle: { score: 8, stage: 'unknown', lastDelta: 0 }
  };
  Object.entries(defaults).forEach(([key, value]) => {
    const line = G.gameplay.careerLines[key];
    if (!line || typeof line !== 'object') {
      G.gameplay.careerLines[key] = { ...value };
      return;
    }
    line.score = clamp(Math.round(parseNum(line.score, value.score)), 0, 100);
    line.lastDelta = Math.round(parseNum(line.lastDelta, 0));
    if (!String(line.stage || '').trim()) line.stage = value.stage;
  });
  return G.gameplay;
}

function getCurrentGameKey(gameContext = null) {
  const ctx = gameContext && typeof gameContext === 'object' ? gameContext : {};
  const hasGameNum = Number.isFinite(Number(ctx.gameNum));
  const gameIndex = hasGameNum
    ? Math.max(0, Math.floor(parseNum(ctx.gameNum, 0)))
    : (Number.isFinite(Number(ctx.game)) ? Math.max(0, Math.floor(parseNum(ctx.game, 1) - 1)) : Math.max(0, Math.floor(parseNum(G.gameNum, 0))));
  const schedGame = Array.isArray(G.schedule) ? (G.schedule[gameIndex] || G.schedule[G.gameNum] || {}) : {};
  const oppId = parseNum(ctx.opp ?? schedGame.opp, 0);
  const season = parseNum(ctx.season, G.season || 1);
  return `${season}_${gameIndex}_${oppId}`;
}

function getDefaultPregamePlan() {
  return { offense: 'balanced_usage', defense: 'stay_solid', tempo: 'standard' };
}

function getPregamePlanOption(axisId, optionId) {
  const axis = PREGAME_PLAN_DEFS.axes.find(item => item.id === axisId);
  if (!axis) return null;
  return axis.options.find(item => item.id === optionId) || null;
}

function normalizePregamePlan(plan = {}) {
  const next = { ...getDefaultPregamePlan(), ...(plan || {}) };
  PREGAME_PLAN_DEFS.axes.forEach(axis => {
    if (!getPregamePlanOption(axis.id, next[axis.id])) next[axis.id] = getDefaultPregamePlan()[axis.id];
  });
  return next;
}

function setPregamePlan(gameKey, plan = {}) {
  const state = ensureGameplayState();
  const key = String(gameKey || getCurrentGameKey()).trim();
  const next = normalizePregamePlan(plan);
  next.gameKey = key;
  next.day = parseNum(G.dayNum, 0);
  state.pregamePlanByGame[key] = next;
  return next;
}

function getPregamePlan(gameKey = null) {
  const state = ensureGameplayState();
  const key = String(gameKey || getCurrentGameKey()).trim();
  if (!state.pregamePlanByGame[key]) return setPregamePlan(key, getDefaultPregamePlan());
  return normalizePregamePlan(state.pregamePlanByGame[key]);
}

function setPregamePlanChoice(axisId, optionId, gameKey = null) {
  const axis = PREGAME_PLAN_DEFS.axes.find(item => item.id === axisId);
  if (!axis || !getPregamePlanOption(axisId, optionId)) return getPregamePlan(gameKey);
  const key = String(gameKey || getCurrentGameKey()).trim();
  const current = getPregamePlan(key);
  current[axisId] = optionId;
  return setPregamePlan(key, current);
}

function getPregamePlanOptions(gameContext = {}) {
  const key = String(gameContext?.gameKey || getCurrentGameKey(gameContext)).trim();
  const selected = getPregamePlan(key);
  return {
    gameKey: key,
    selected,
    axes: PREGAME_PLAN_DEFS.axes.map(axis => ({
      id: axis.id,
      title: axis.title,
      selected: selected[axis.id],
      options: axis.options.map(option => ({ ...option, active: selected[axis.id] === option.id }))
    }))
  };
}

function buildPregamePlanModifiers(plan = {}) {
  const normalized = normalizePregamePlan(plan);
  const modifiers = {};
  const labels = [];
  const tags = [];
  PREGAME_PLAN_DEFS.axes.forEach(axis => {
    const option = getPregamePlanOption(axis.id, normalized[axis.id]);
    if (!option) return;
    labels.push(`${axis.title}：${option.title}`);
    if (option.tag) tags.push(option.tag);
    Object.entries(option.effects || {}).forEach(([key, value]) => {
      modifiers[key] = parseNum(modifiers[key], 0) + parseNum(value, 0);
    });
  });
  return { plan: normalized, modifiers, labels, tags };
}

function recalcGameLinePoints(line) {
  line.tpm = clamp(Math.round(parseNum(line.tpm, 0)), 0, 20);
  line.fgm = Math.max(line.tpm, clamp(Math.round(parseNum(line.fgm, 0)), 0, 40));
  line.tpa = Math.max(line.tpm, clamp(Math.round(parseNum(line.tpa, 0)), 0, 40));
  line.fga = Math.max(line.fgm, line.tpa, clamp(Math.round(parseNum(line.fga, 0)), 0, 60));
  line.ftm = clamp(Math.round(parseNum(line.ftm, 0)), 0, 30);
  line.fta = Math.max(line.ftm, clamp(Math.round(parseNum(line.fta, 0)), 0, 34));
  line.pts = Math.max(0, (line.fgm - line.tpm) * 2 + line.tpm * 3 + line.ftm);
  return line;
}

function applyPointDeltaToLine(line, delta, preferThree = false) {
  let remain = Math.round(parseNum(delta, 0));
  if (remain > 0) {
    while (remain >= 3 && preferThree) {
      line.fgm += 1; line.fga += 1; line.tpm += 1; line.tpa += 1; remain -= 3;
    }
    while (remain >= 2) {
      line.fgm += 1; line.fga += 1; remain -= 2;
    }
    if (remain === 1) { line.ftm += 1; line.fta += 1; }
    return recalcGameLinePoints(line);
  }
  remain = Math.abs(remain);
  while (remain >= 3 && line.tpm > 0) { line.tpm -= 1; line.fgm -= 1; remain -= 3; }
  while (remain >= 2 && line.fgm > line.tpm) { line.fgm -= 1; remain -= 2; }
  if (remain === 1 && line.ftm > 0) { line.ftm -= 1; remain -= 1; }
  while (remain > 0 && line.ftm > 0 && line.fgm <= line.tpm) { line.ftm -= 1; remain -= 1; }
  return recalcGameLinePoints(line);
}

function applyReconcilePointDeltaToLine(line, delta) {
  let remain = Math.round(parseNum(delta, 0));
  if (remain > 0) {
    while (remain >= 2) {
      line.fgm += 1; line.fga += 1; remain -= 2;
    }
    if (remain === 1) { line.ftm += 1; line.fta += 1; }
    return recalcGameLinePoints(line);
  }
  remain = Math.abs(remain);
  while (remain >= 2 && line.fgm > line.tpm) { line.fgm -= 1; remain -= 2; }
  while (remain >= 2 && line.ftm >= 2) { line.ftm -= 2; remain -= 2; }
  if (remain === 1 && line.ftm > 0) { line.ftm -= 1; remain -= 1; }
  while (remain >= 3 && line.tpm > 0) { line.tpm -= 1; line.fgm -= 1; remain -= 3; }
  while (remain > 0 && line.ftm > 0) { line.ftm -= 1; remain -= 1; }
  return recalcGameLinePoints(line);
}

function applyPregamePlanToGameStats(st, plan = null, gameContext = {}) {
  const currentPlan = plan || getPregamePlan(gameContext?.gameKey || getCurrentGameKey(gameContext));
  const view = buildPregamePlanModifiers(currentPlan);
  const mins = parseNum(st?.mins, 0);
  if (!st || mins <= 0) {
    return {
      applied: false,
      plan: view.plan,
      labels: view.labels,
      tags: view.tags,
      summary: '你没有进入实际轮换，赛前计划没有落到比赛回合里。',
      staminaLoss: 0,
      coachDelta: 0,
      lockerDelta: 0,
      mediaDelta: 0
    };
  }
  const before = { ...st };
  const mod = view.modifiers;
  applyPointDeltaToLine(st, mod.pts || 0, view.plan.offense === 'spacing_pullup');
  ['reb', 'ast', 'stl', 'blk', 'tov', 'pf'].forEach(key => {
    if (!mod[key]) return;
    st[key] = clamp(Math.round(parseNum(st[key], 0) + parseNum(mod[key], 0)), 0, key === 'pf' ? 6 : 30);
  });
  ['fga', 'tpa', 'fta'].forEach(key => {
    if (!mod[key]) return;
    st[key] = Math.max(0, Math.round(parseNum(st[key], 0) + parseNum(mod[key], 0)));
  });
  if (mod.mins) st.mins = clamp(Math.round(parseNum(st.mins, 0) + parseNum(mod.mins, 0)), 0, 48);
  recalcGameLinePoints(st);
  const statDeltas = {
    pts: parseNum(st.pts, 0) - parseNum(before.pts, 0),
    reb: parseNum(st.reb, 0) - parseNum(before.reb, 0),
    ast: parseNum(st.ast, 0) - parseNum(before.ast, 0),
    stl: parseNum(st.stl, 0) - parseNum(before.stl, 0),
    blk: parseNum(st.blk, 0) - parseNum(before.blk, 0),
    tov: parseNum(st.tov, 0) - parseNum(before.tov, 0)
  };
  const impactBits = [];
  if (statDeltas.pts) impactBits.push(`${statDeltas.pts > 0 ? '+' : ''}${statDeltas.pts}分`);
  if (statDeltas.ast) impactBits.push(`${statDeltas.ast > 0 ? '+' : ''}${statDeltas.ast}助攻`);
  if (statDeltas.reb) impactBits.push(`${statDeltas.reb > 0 ? '+' : ''}${statDeltas.reb}篮板`);
  if (statDeltas.stl) impactBits.push(`${statDeltas.stl > 0 ? '+' : ''}${statDeltas.stl}抢断`);
  if (statDeltas.blk) impactBits.push(`${statDeltas.blk > 0 ? '+' : ''}${statDeltas.blk}盖帽`);
  if (statDeltas.tov) impactBits.push(`${statDeltas.tov > 0 ? '+' : ''}${statDeltas.tov}失误`);
  if (parseNum(mod.staminaLoss, 0)) impactBits.push(`体能消耗${parseNum(mod.staminaLoss, 0) > 0 ? '+' : ''}${parseNum(mod.staminaLoss, 0)}`);
  return {
    applied: true,
    changed: impactBits.length > 0,
    plan: view.plan,
    labels: view.labels,
    tags: view.tags,
    statDeltas,
    staminaLoss: Math.round(parseNum(mod.staminaLoss, 0)),
    coachDelta: Math.round(parseNum(mod.coachDelta, 0)),
    lockerDelta: Math.round(parseNum(mod.lockerDelta, 0)),
    mediaDelta: Math.round(parseNum(mod.mediaDelta, 0)),
    summary: impactBits.length
      ? `赛前计划「${view.tags.join(' / ') || '默认'}」改变了这场的回合分配：${impactBits.join('，')}。`
      : `赛前计划「${view.tags.join(' / ') || '默认'}」没有显著改变盒分，但影响了你的比赛取舍。`
  };
}

function getCareerLineStage(lineId, score) {
  const s = clamp(Math.round(parseNum(score, 0)), 0, 100);
  const table = {
    coach: [
      [78, 'core_trust', '核心权限', '教练愿意把关键回合和容错交给你。'],
      [58, 'stable_rotation', '稳定轮换', '你已经进入教练的常规计划。'],
      [38, 'rotation_watch', '观察使用', '你还需要把执行稳定下来。'],
      [0, 'cold_bench', '冷板凳边缘', '教练对你的回合选择仍有顾虑。']
    ],
    rotation: [
      [78, 'starter_claim', '首发竞争', '轮换地位已经具备上探空间。'],
      [58, 'sixth_man', '主要轮换', '你是替补席前段的选择。'],
      [35, 'bench', '替补观察', '上场时间还要靠表现争。'],
      [0, 'dnp_risk', 'DNP风险', '任何低迷都会让你掉出轮换。']
    ],
    lockerRoom: [
      [75, 'voice', '更衣室有话语权', '队友开始把你当成能定调的人。'],
      [55, 'accepted', '融入团队', '你和多数队友处在健康关系里。'],
      [35, 'neutral', '关系平稳', '更衣室还没有真正围绕你转动。'],
      [0, 'isolated', '关系偏冷', '队友对你的回合选择会更敏感。']
    ],
    media: [
      [80, 'national_topic', '全国话题', '你的每场球都会被放进大讨论。'],
      [58, 'rising_name', '热度上升', '媒体开始固定追踪你的比赛。'],
      [28, 'local_notice', '本地关注', '你主要还在球队圈层里被讨论。'],
      [0, 'quiet_rookie', '安静新秀', '外界还没有形成稳定印象。']
    ],
    starCircle: [
      [70, 'peer_respect', '球星互认', '联盟里的强者会主动回应你。'],
      [45, 'watched', '被同位置盯上', '同位置球员已经开始研究你。'],
      [18, 'mentioned', '偶尔被提到', '你的名字会出现在少量对位话题里。'],
      [0, 'unknown', '仍在圈外', '球星圈还没有真正注意到你。']
    ]
  };
  const rows = table[lineId] || table.media;
  const row = rows.find(item => s >= item[0]) || rows[rows.length - 1];
  return { stage: row[1], label: row[2], detail: row[3] };
}

function updateCareerLinesAfterGame(result, route = null) {
  const state = ensureGameplayState();
  const game = result?.gameResult || result || {};
  const mins = parseNum(game?.st?.mins, game?.mins || 0);
  const played = !game.injured && mins > 0;
  const gradeScore = parseNum(game.gradeScore, played ? calcGradeScore(game.st || game) : 45);
  const win = !!game.win;
  const planFx = game.pregamePlanEffect || {};
  const applyLine = (id, delta) => {
    const line = state.careerLines[id];
    const oldScore = parseNum(line.score, 0);
    const nextScore = clamp(Math.round(oldScore + parseNum(delta, 0)), 0, 100);
    const stage = getCareerLineStage(id, nextScore);
    line.score = nextScore;
    line.stage = stage.stage;
    line.lastDelta = nextScore - oldScore;
  };
  if (!played) {
    applyLine('coach', -1);
    applyLine('rotation', -2);
    applyLine('lockerRoom', win ? 0 : -1);
    applyLine('media', 0);
    applyLine('starCircle', 0);
    return buildCareerLinesView();
  }
  const pts = parseNum(game.pts, parseNum(game?.st?.pts, 0));
  const ast = parseNum(game.ast, parseNum(game?.st?.ast, 0));
  const tov = parseNum(game.tov, parseNum(game?.st?.tov, 0));
  const coachDelta = (gradeScore >= 82 ? 3 : gradeScore >= 68 ? 1 : gradeScore < 50 ? -3 : 0) + (win ? 1 : -1) - (tov >= 4 ? 1 : 0) + parseNum(planFx.coachDelta, 0);
  const rotationDelta = (mins >= 28 ? 2 : mins >= 16 ? 1 : -1) + (gradeScore >= 78 ? 1 : gradeScore < 50 ? -2 : 0);
  const lockerDelta = (win ? 1 : -1) + (ast >= 7 ? 2 : ast >= 4 ? 1 : 0) + parseNum(planFx.lockerDelta, 0);
  const mediaDelta = (pts >= 30 ? 4 : pts >= 22 ? 2 : pts >= 14 ? 1 : 0) + (['S+', 'S', 'A'].includes(String(game.grade || '')) ? 1 : 0) + parseNum(planFx.mediaDelta, 0);
  const starDelta = (pts >= 28 || gradeScore >= 86 ? 2 : pts >= 20 ? 1 : 0) + (route?.forcedEventType === 'postgame_clutch_media' ? 1 : 0);
  applyLine('coach', coachDelta);
  applyLine('rotation', rotationDelta);
  applyLine('lockerRoom', lockerDelta);
  applyLine('media', mediaDelta);
  applyLine('starCircle', starDelta);
  return buildCareerLinesView();
}

function buildCareerLinesView() {
  const state = ensureGameplayState();
  return [
    { id: 'coach', title: '教练线', tone: 'gold' },
    { id: 'rotation', title: '轮换线', tone: 'cyan' },
    { id: 'lockerRoom', title: '更衣室线', tone: 'green' },
    { id: 'media', title: '媒体线', tone: 'purple' },
    { id: 'starCircle', title: '球星圈线', tone: 'red' }
  ].map(meta => {
    const line = state.careerLines[meta.id] || { score: 0, lastDelta: 0 };
    const stage = getCareerLineStage(meta.id, line.score);
    line.stage = stage.stage;
    return {
      ...meta,
      score: clamp(Math.round(parseNum(line.score, 0)), 0, 100),
      stage: stage.stage,
      label: stage.label,
      detail: stage.detail,
      lastDelta: Math.round(parseNum(line.lastDelta, 0))
    };
  });
}

function reconcileLeagueBookScore(detail, prevHomeScore, prevAwayScore) {
  if (!detail || !G.leagueSeason) return;
  const nextHomeScore = parseNum(detail.homeScore, prevHomeScore);
  const nextAwayScore = parseNum(detail.awayScore, prevAwayScore);
  const homeDelta = nextHomeScore - parseNum(prevHomeScore, nextHomeScore);
  const awayDelta = nextAwayScore - parseNum(prevAwayScore, nextAwayScore);
  if (!homeDelta && !awayDelta) return;
  const homeId = parseNum(detail.homeTeamId, 0);
  const awayId = parseNum(detail.awayTeamId, 0);
  const records = G.leagueSeason.teamRecords || {};
  const homeRec = records[homeId];
  const awayRec = records[awayId];
  if (homeRec && awayRec) {
    homeRec.pf = parseNum(homeRec.pf, 0) + homeDelta;
    homeRec.pa = parseNum(homeRec.pa, 0) + awayDelta;
    awayRec.pf = parseNum(awayRec.pf, 0) + awayDelta;
    awayRec.pa = parseNum(awayRec.pa, 0) + homeDelta;
    const oldHomeWin = parseNum(prevHomeScore, 0) >= parseNum(prevAwayScore, 0);
    const newHomeWin = nextHomeScore >= nextAwayScore;
    if (oldHomeWin !== newHomeWin) {
      if (oldHomeWin) {
        homeRec.w = Math.max(0, parseNum(homeRec.w, 0) - 1);
        homeRec.l = parseNum(homeRec.l, 0) + 1;
        awayRec.w = parseNum(awayRec.w, 0) + 1;
        awayRec.l = Math.max(0, parseNum(awayRec.l, 0) - 1);
      } else {
        homeRec.w = parseNum(homeRec.w, 0) + 1;
        homeRec.l = Math.max(0, parseNum(homeRec.l, 0) - 1);
        awayRec.w = Math.max(0, parseNum(awayRec.w, 0) - 1);
        awayRec.l = parseNum(awayRec.l, 0) + 1;
      }
    }
  }
  const gameId = detail.id;
  [homeId, awayId].forEach(teamId => {
    const logs = G.leagueSeason.teamGameLogs?.[teamId];
    if (!Array.isArray(logs)) return;
    const log = logs.find(item => item?.gameId === gameId);
    if (!log) return;
    const isHomeLog = parseNum(teamId, 0) === homeId;
    log.teamPts = isHomeLog ? nextHomeScore : nextAwayScore;
    log.oppPts = isHomeLog ? nextAwayScore : nextHomeScore;
    log.win = isHomeLog ? nextHomeScore >= nextAwayScore : nextAwayScore > nextHomeScore;
  });
  const scheduleRow = Array.isArray(G.leagueSeason.roundSchedule)
    ? G.leagueSeason.roundSchedule.find(item => item?.gameId === gameId)
    : null;
  if (scheduleRow) {
    scheduleRow.homeScore = nextHomeScore;
    scheduleRow.awayScore = nextAwayScore;
  }
}

function calcGradeScore(st = {}) {
  let g = 50;
  g += parseNum(st.pts, 0) * 1.2;
  g += parseNum(st.ast, 0) * 2.5;
  g += parseNum(st.reb, 0) * 1.5;
  g += parseNum(st.stl, 0) * 4;
  g += parseNum(st.blk, 0) * 4;
  g -= parseNum(st.tov, 0) * 3;
  const fga = parseNum(st.fga, 0);
  if (fga > 0) g += (parseNum(st.fgm, 0) / fga - 0.45) * 30;
  return clamp(Math.round(g), 0, 99);
}

function gradeLetterFromScore(score) {
  const s = clamp(parseNum(score, 50), 0, 99);
  if (s >= 92) return 'S+';
  if (s >= 86) return 'S';
  if (s >= 78) return 'A';
  if (s >= 68) return 'B';
  if (s >= 58) return 'C';
  if (s >= 45) return 'D';
  return 'F';
}

function calcGrade(st = {}) {
  return gradeLetterFromScore(calcGradeScore(st));
}

function gradeXpBonus(grade) {
  const map = { 'S+': 15, S: 12, A: 8, B: 5, C: 3, D: 1, F: 0 };
  return map[String(grade || '').trim()] ?? 2;
}

function checkInjury({ gameContext = null, gameStats = null, gameMod = null } = {}) {
  const fx = getPlayerXFactorEffect(G.player);
  const badgeFx = getBadgeEffects(G.player);
  const staminaStatus = getStaminaStatus(G.player.stamina);
  const ecoFx = getEconomyEffects();
  const recentMinutes = getRecentPlayedMinutesLoad(4);
  const age = parseNum(G.player.age, 22);
  let chance = 0.0065;
  if (fx.injuryMult) chance *= fx.injuryMult;
  if (badgeFx.injuryMult) chance *= badgeFx.injuryMult;
  // 使用体力状态的伤病倍率
  chance *= staminaStatus.injuryMult;
  chance *= clamp(parseNum(ecoFx.injuryMult, 1), 0.7, 1.2);
  if (parseNum(gameStats?.mins, parseNum(G._currentRoleMinutes, 24)) >= 34) chance *= 1.14;
  if (parseNum(gameStats?.mins, 0) >= 38) chance *= 1.06;
  if (recentMinutes >= 35) chance *= 1.08;
  if (age >= 31) chance *= 1 + Math.min(0.10, (age - 30) * 0.012);
  if (gameContext?.backToBack) chance *= 1.12;
  if (gameContext?.threeInFour) chance *= 1.07;
  if (parseNum(gameContext?.roadTripLength, 0) >= 4) chance *= 1.05;
  if (gameMod?.issueTag) chance *= 1.12;
  // 努力程度影响伤病概率
  const effortCfg = getEffortMode(G._effortMode);
  chance *= effortCfg.injuryMult;
  if (Math.random() < chance) {
    const severe = Math.random() < 0.14;
    const games = Math.max(1, Math.round((severe ? rng(14, 45) : rng(2, 10)) * clamp(parseNum(ecoFx.injuryDaysMult, 1), 0.72, 1)));
    const type = severe ? pick(["ACL撕裂", "跟腱断裂", "骨折"]) : pick(["脚踝扭伤", "肌肉拉伤", "膝盖酸痛"]);
    G.player.injury = { active: true, games, type };
    addNews(`💔 ${G.player.name}遭遇${type}，预计缺阵${games}场！`, 'neg');
    addPhone("医疗团队", `诊断结果：${type}，需要休战${games}场比赛。`, 'warn');
    return true;
  }
  return false;
}

// ============ SEASON MANAGEMENT ============
// ============ 选秀前赛季模拟：让NPC球员在用户进入前已经打过一个赛季 ============
function initLeagueSeasonState() {
  ensureLeagueStateShape();
  const teamRecords = {};
  const playerStats = {};
  const teamGameLogs = {};
  (TEAMS || []).forEach(t => {
    teamRecords[t.id] = makeTeamRecord();
    teamGameLogs[t.id] = [];
    const teamObj = LEAGUE.loaded ? LEAGUE.teams?.[t.id] : null;
    if (!teamObj) return;
    (teamObj.players || []).forEach(p => {
      if (!p.injury || typeof p.injury !== 'object') p.injury = { active: false, games: 0, type: '' };
      p.injury.active = false;
      p.injury.games = 0;
      p.injury.type = '';
      playerStats[leaguePlayerKey(t.id, p.id, false)] = emptySeasonLine(t.id, p.id, p.name, p.pos, false);
    });
    teamObj.rotation = toRotation(teamObj.players || []);
    teamObj.strength = calcTeamStrength(teamObj);
  });
  if (G.player && parseNum(G.teamId, 0) > 0) {
    playerStats[leaguePlayerKey(G.teamId, 'USER_SELF', true)] = emptySeasonLine(G.teamId, 'USER_SELF', G.player.name, G.player.pos, true);
  }
  G.leagueSeason = { round: 0, teamRecords, playerStats, roundSchedule: [], roundMatchups: [], teamGameLogs, gameDetails: [] };
  return G.leagueSeason;
}

function getLeagueGameDetailById(gameId) {
  ensureLeagueStateShape();
  const id = String(gameId || '').trim();
  if (!id) return null;
  return (G.leagueSeason.gameDetails || []).find(g => String(g?.id || g?.gameId || '').trim() === id) || null;
}

function getLeagueGameDetails(filter = {}) {
  ensureLeagueStateShape();
  const season = filter.season != null ? parseNum(filter.season, NaN) : NaN;
  const year = filter.year != null ? parseNum(filter.year, NaN) : NaN;
  const round = filter.round != null ? parseNum(filter.round, NaN) : NaN;
  const teamId = filter.teamId != null ? parseNum(filter.teamId, NaN) : NaN;
  const oppId = filter.oppId != null ? parseNum(filter.oppId, NaN) : NaN;
  const phase = filter.phase != null ? String(filter.phase).trim() : '';
  return (G.leagueSeason.gameDetails || [])
    .filter(g => {
      if (Number.isFinite(season) && parseNum(g.season, NaN) !== season) return false;
      if (Number.isFinite(year) && parseNum(g.year, NaN) !== year) return false;
      if (Number.isFinite(round) && parseNum(g.round, NaN) !== round) return false;
      if (phase && String(g.phase || '').trim() !== phase) return false;
      if (Number.isFinite(teamId)) {
        const hasTeam = parseNum(g.homeTeamId, NaN) === teamId || parseNum(g.awayTeamId, NaN) === teamId;
        if (!hasTeam) return false;
      }
      if (Number.isFinite(oppId)) {
        const hasOpp = parseNum(g.homeTeamId, NaN) === oppId || parseNum(g.awayTeamId, NaN) === oppId;
        if (!hasOpp) return false;
      }
      return true;
    })
    .sort((a, b) => parseNum(a.round, 0) - parseNum(b.round, 0) || parseNum(a.seq, 0) - parseNum(b.seq, 0));
}

function findLeagueGameDetail(query = {}) {
  const teamId = query.teamId != null ? parseNum(query.teamId, NaN) : NaN;
  const oppId = query.oppId != null ? parseNum(query.oppId, NaN) : NaN;
  const round = query.round != null ? parseNum(query.round, NaN) : NaN;
  const season = query.season != null ? parseNum(query.season, NaN) : NaN;
  const year = query.year != null ? parseNum(query.year, NaN) : NaN;
  const phase = query.phase != null ? String(query.phase).trim() : '';
  return getLeagueGameDetails({ season, year, phase }).find(g => {
    if (Number.isFinite(round) && parseNum(g.round, NaN) !== round) return false;
    if (Number.isFinite(teamId) && Number.isFinite(oppId)) {
      return (
        (parseNum(g.homeTeamId, NaN) === teamId && parseNum(g.awayTeamId, NaN) === oppId) ||
        (parseNum(g.homeTeamId, NaN) === oppId && parseNum(g.awayTeamId, NaN) === teamId)
      );
    }
    if (Number.isFinite(teamId)) return parseNum(g.homeTeamId, NaN) === teamId || parseNum(g.awayTeamId, NaN) === teamId;
    if (Number.isFinite(oppId)) return parseNum(g.homeTeamId, NaN) === oppId || parseNum(g.awayTeamId, NaN) === oppId;
    return true;
  }) || null;
}

function tickLeagueInjuries() {
  ensureLeagueStateShape();
  const tick = (player) => {
    if (!player || !player.injury || !player.injury.active) return;
    player.injury.games = Math.max(0, parseNum(player.injury.games, 0) - 1);
    if (player.injury.games <= 0) {
      player.injury.active = false;
      player.injury.games = 0;
      player.injury.type = '';
    }
  };
  if (LEAGUE.loaded) {
    Object.values(LEAGUE.teams || {}).forEach(team => (team.players || []).forEach(tick));
  }
  tick(G.player);
}

function getGameRotationSnapshot(teamId, { includeUser = false } = {}) {
  const tid = parseNum(teamId, 0);
  let rotation = [];
  if (typeof buildDynamicTeamRotation === 'function') {
    rotation = buildDynamicTeamRotation(tid, { includeUser: !!includeUser && tid === parseNum(G.teamId, 0) });
  } else if (typeof toRotation === 'function') {
    rotation = toRotation(getTeamPlayers(tid) || []);
  }
  if (!Array.isArray(rotation)) rotation = [];
  const injuredIds = new Set();
  (getTeamPlayers(tid) || []).forEach(p => { if (p?.injury?.active) injuredIds.add(String(p.id)); });
  if (includeUser && tid === parseNum(G.teamId, 0) && G.player?.injury?.active) injuredIds.add('USER_SELF');
  rotation = rotation.filter(r => !injuredIds.has(String(r.id)));
  const fixedFullGameRotation = rotation.length > 0 && rotation.every(r => r?.fullGameStarter || r?.noFatigue);
  if (typeof normalizeRotationMinutes === 'function' && !fixedFullGameRotation) normalizeRotationMinutes(rotation, 240);
  return fixedFullGameRotation ? rotation.slice(0, 5) : rotation.slice(0, 10);
}

function allocateIntegerShares(total, weights = []) {
  const count = Array.isArray(weights) ? weights.length : 0;
  if (!count) return [];
  const safeWeights = weights.map(w => Math.max(0.001, parseNum(w, 1)));
  const sum = safeWeights.reduce((s, w) => s + w, 0);
  if (sum <= 0) {
    const base = Math.floor(total / count);
    const out = Array(count).fill(base);
    let rem = total - base * count;
    for (let i = 0; rem > 0; i++, rem--) out[i % count]++;
    return out;
  }
  const raw = safeWeights.map(w => total * w / sum);
  const out = raw.map(v => Math.max(0, Math.floor(v)));
  let rem = total - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v), w: safeWeights[i] })).sort((a, b) => b.frac - a.frac || b.w - a.w);
  let idx = 0;
  while (rem > 0 && order.length) {
    out[order[idx % order.length].i]++;
    rem--;
    idx++;
  }
  while (rem < 0) {
    const cutOrder = [...out.keys()].sort((a, b) => out[b] - out[a] || safeWeights[b] - safeWeights[a]);
    let changed = false;
    for (const i of cutOrder) {
      if (rem === 0) break;
      if (out[i] > 0) {
        out[i]--;
        rem++;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}

function buildSimRotationContext(teamId, { includeUser = false } = {}) {
  const tid = parseNum(teamId, 0);
  const team = getTeam(tid) || {};
  const teamName = String(team.z || team.n || '--').trim();
  const abbr = String(team.a || team.abbr || '--').trim();
  const coachFx = getCoachEffects(tid);
  let rotation = getGameRotationSnapshot(tid, { includeUser: !!includeUser || tid === parseNum(G.teamId, 0) });
  if (!rotation.length) {
    const fallbackPlayers = [...(getTeamPlayers(tid) || [])];
    if (fallbackPlayers.length) {
      rotation = fallbackPlayers.slice(0, 10).map((p, idx) => ({
        id: p.id,
        name: p.name,
        pos: parseNum(p.pos, 3),
        pos2: parseNum(p.pos2, 0),
        minutes: clamp(28 - idx * 2, 6, 36),
        rating: parseNum(p.rating, 65),
        teamTier: idx < 5 ? 'starter' : 'bench',
        isSelf: false
      }));
    }
  }
  const rosterLookup = new Map((getTeamPlayers(tid) || []).map(p => [String(p.id), p]));
  const simPlayers = rotation.map(p => {
    const src = p.isSelf
      ? (typeof createUserRosterSnapshot === 'function' ? createUserRosterSnapshot() : G.player)
      : (rosterLookup.get(String(p.id)) || p);
    return {
      ...src,
      id: p.id,
      name: p.name || src?.name,
      pos: parseNum(p.pos, parseNum(src?.pos, 3)),
      pos2: parseNum(p.pos2, parseNum(src?.pos2, 0)),
      rating: parseNum(p.rating, parseNum(src?.rating, 65)),
      minutes: parseNum(p.minutes, 18),
      rotationRole: p.rotationRole,
      teamTier: p.teamTier,
      isSelf: !!p.isSelf
    };
  });
  return { teamId: tid, team, teamName, abbr, coachFx, rotation, simPlayers };
}

function weightedRotationAverage(players, selector, fallback = 55) {
  const list = Array.isArray(players) ? players.filter(Boolean) : [];
  if (!list.length) return fallback;
  let totalWeight = 0;
  let totalValue = 0;
  list.forEach((player, idx) => {
    const weight = Math.max(1, parseNum(player?.minutes, 0) || (idx < 5 ? 28 - idx * 2 : 14 - (idx - 5)));
    const value = parseNum(selector(player), NaN);
    if (!Number.isFinite(value)) return;
    totalWeight += weight;
    totalValue += value * weight;
  });
  if (totalWeight <= 0) return fallback;
  return +(totalValue / totalWeight).toFixed(1);
}

function computePlayerMatchupEdge(player, oppProfile = {}) {
  const attrs = usagePlayerAttrs(player);
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const perimeterAttack = (parseNum(attrs.shotExt, 55) * 0.54) + (parseNum(attrs.pass, 55) * 0.20) + (parseNum(attrs.speed, 55) * 0.26);
  const interiorAttack = (parseNum(attrs.shotInt, 55) * 0.46) + (parseNum(attrs.strength, parseNum(attrs.physique, 55)) * 0.32) + (parseNum(attrs.reb, 55) * 0.14) + (parseNum(attrs.speed, 55) * 0.08);
  const perimeterDefense = parseNum(oppProfile?.perimeterDef, 55);
  const rimDefense = (parseNum(oppProfile?.rimProtection, 55) * 0.62) + (parseNum(oppProfile?.size, 58) * 0.38);
  if (pos <= 2) return clamp((perimeterAttack - perimeterDefense) / 28, -1.15, 1.15);
  if (pos >= 4) return clamp((interiorAttack - rimDefense) / 28, -1.15, 1.15);
  return clamp((((perimeterAttack * 0.55) + (interiorAttack * 0.45)) - ((perimeterDefense * 0.52) + (rimDefense * 0.48))) / 30, -1.1, 1.1);
}

function buildSingleGamePlayerModifier(player, {
  teamId = 0,
  home = false,
  teamProfile = null,
  oppProfile = null,
  fatigueContext = null,
  baseMinutes = 18,
  coachFx = null
} = {}) {
  const attrs = usagePlayerAttrs(player);
  const ecoFx = getEconomyEffects();
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const rating = clamp(parseNum(player?.rating, ovr(attrs)), 40, 99);
  const age = parseNum(player?.age, 26);
  const isSelf = !!player?.isSelf || String(player?.id || '') === 'USER_SELF';
  const stamina = isSelf ? clamp(parseNum(G.player?.stamina, 100), 0, 100) : clamp(90 - parseNum(fatigueContext?.energyPenalty, 0) + rng(-5, 3) - Math.max(0, age - 31) * 0.4, 62, 97);
  const matchupEdge = computePlayerMatchupEdge(player, oppProfile);
  const coachStocks = parseNum(coachFx?.stocksMult, parseNum(teamProfile?.coachFx?.stocksMult, 1));
  const defensiveLoad = clamp((parseNum(attrs.stl, 55) + parseNum(attrs.blk, 55)) / 120, 0.65, 1.35);
  const fatigueLoad = clamp(
    parseNum(fatigueContext?.loadScore, 0) * 0.7
    + Math.max(0, parseNum(baseMinutes, 18) - 28) * 0.22
    + Math.max(0, age - 30) * 0.35
    + Math.max(0, (72 - stamina) * 0.18),
    0,
    16
  );
  let minuteMult = clamp(1 - fatigueLoad * 0.012 + rng(-0.03, 0.03), 0.72, 1.10);
  let usageMult = clamp(1 - fatigueLoad * 0.007 + matchupEdge * 0.08 + rng(-0.03, 0.03), 0.78, 1.20);
  let efficiencyShift = clamp(matchupEdge * 0.028 - fatigueLoad * 0.0028, -0.08, 0.08);
  let astMult = clamp(1 + matchupEdge * 0.05 - fatigueLoad * 0.003, 0.88, 1.15);
  let rebMult = clamp(1 + (pos >= 4 ? matchupEdge * 0.04 : matchupEdge * 0.02) - fatigueLoad * 0.002, 0.88, 1.16);
  let stocksMult = clamp(1 - fatigueLoad * 0.003 + (coachStocks - 1) * 0.18, 0.86, 1.18);
  const notes = [];
  if (isSelf && parseNum(ecoFx.prepBonus, 0) > 0) {
    const prepBoost = clamp(parseNum(ecoFx.prepBonus, 0) / 100, 0, 0.07);
    efficiencyShift += prepBoost * 0.55;
    astMult *= 1 + prepBoost * 0.6;
    usageMult *= 1 + prepBoost * 0.25;
    notes.push(`赛前准备充分，读秒与对位判断更从容`);
  }

  const hotChance = clamp(0.08 + (rating - 70) * 0.002, 0.08, 0.15);
  const coldChance = clamp(0.09 - (rating - 70) * 0.001, 0.05, 0.11);
  const varianceRoll = Math.random();
  let varianceTag = 'steady';
  if (varianceRoll < hotChance) {
    varianceTag = 'hot';
    usageMult *= 1.06;
    efficiencyShift += 0.03;
    astMult *= 1.04;
    notes.push('手感发烫，进攻参与度上升');
  } else if (varianceRoll > 1 - coldChance) {
    varianceTag = 'cold';
    usageMult *= 0.93;
    efficiencyShift -= 0.035;
    notes.push('开场手感偏冷，效率走低');
  }

  let issueTag = '';
  const issueChance = clamp(0.025 + fatigueLoad * 0.009 + (parseNum(fatigueContext?.backToBack, 0) ? 0.02 : 0), 0.025, 0.20);
  if (Math.random() < issueChance && baseMinutes >= 18) {
    issueTag = pick(['膝盖发紧', '脚踝发酸', '腿部沉重', '腰背僵硬']);
    const minuteHit = rng(8, 16) / 100;
    minuteMult *= 1 - minuteHit;
    usageMult *= 0.95;
    efficiencyShift -= 0.02;
    rebMult *= 0.97;
    notes.push(`${issueTag}，出场时间受限`);
  }

  if (matchupEdge >= 0.45) {
    usageMult *= 1.04;
    efficiencyShift += 0.015;
    notes.push(pos >= 4 ? '对位内线点名空间更大' : '对位脚步跟不上你');
  } else if (matchupEdge <= -0.45) {
    usageMult *= 0.94;
    efficiencyShift -= 0.018;
    astMult *= 0.97;
    notes.push(pos >= 4 ? '对位护框压迫较强' : '对位外线压迫感很强');
  }

  const rivalryFx = typeof buildRivalryGameModifier === 'function'
    ? buildRivalryGameModifier(player, { teamId, oppProfile })
    : null;
  if (rivalryFx) {
    minuteMult *= parseNum(rivalryFx.minuteMult, 1);
    usageMult *= parseNum(rivalryFx.usageMult, 1);
    efficiencyShift += parseNum(rivalryFx.efficiencyShift, 0);
    astMult *= parseNum(rivalryFx.astMult, 1);
    rebMult *= parseNum(rivalryFx.rebMult, 1);
    stocksMult *= parseNum(rivalryFx.stocksMult, 1);
    if (rivalryFx.note) notes.push(String(rivalryFx.note).trim());
  }

  const foulRisk = clamp(
    0.045
    + Math.max(0, parseNum(baseMinutes, 18) - 20) * 0.003
    + (pos >= 4 ? 0.02 : 0.01)
    + Math.max(0, -matchupEdge) * 0.035
    + (defensiveLoad - 1) * 0.04
    + (coachStocks - 1) * 0.16
    + (parseNum(fatigueContext?.backToBack, 0) ? 0.015 : 0),
    0.05,
    0.22
  );
  const foulTrouble = Math.random() < foulRisk;
  let foulCount = clamp(Math.round((parseNum(baseMinutes, 18) / 11.5) + (pos >= 4 ? 0.6 : 0.2) + rng(-1, 1) + Math.max(0, -matchupEdge) * 1.2), 0, 6);
  if (foulTrouble) {
    minuteMult *= pos >= 4 ? rng(68, 84) / 100 : rng(74, 88) / 100;
    usageMult *= 0.93;
    foulCount = clamp(rng(4, 6), 4, 6);
    notes.push('遭遇犯规麻烦，轮换被迫缩短');
  }

  return {
    minuteMult: clamp(minuteMult, 0.56, 1.12),
    usageMult: clamp(usageMult, 0.75, 1.22),
    efficiencyShift: clamp(efficiencyShift, -0.09, 0.09),
    astMult: clamp(astMult, 0.86, 1.18),
    rebMult: clamp(rebMult, 0.86, 1.18),
    stocksMult: clamp(stocksMult, 0.84, 1.22),
    matchupEdge: +matchupEdge.toFixed(2),
    foulTrouble,
    foulCount,
    fatigueLoad: +fatigueLoad.toFixed(1),
    stamina,
    varianceTag,
    issueTag,
    notes
  };
}

function applySingleGameMinuteCaps(rotation = [], gameMods = []) {
  const liveRotation = Array.isArray(rotation) ? rotation : [];
  if (!liveRotation.length) return liveRotation;
  const caps = liveRotation.map((player, i) => {
    const mod = gameMods[i] || {};
    const baseMinutes = clamp(parseNum(player?.baseMinutesRaw, parseNum(player?.minutes, 18)), 0, 40);
    if (mod.foulTrouble) return clamp(Math.round(baseMinutes * 0.82), 12, 34);
    if (mod.issueTag) return clamp(Math.round(baseMinutes * 0.9), 14, 36);
    if (parseNum(mod.minuteMult, 1) < 0.97) return clamp(Math.round(baseMinutes * parseNum(mod.minuteMult, 1)), 10, 38);
    return 40;
  });
  let surplus = 0;
  liveRotation.forEach((player, i) => {
    if (parseNum(player.minutes, 0) > caps[i]) {
      surplus += parseNum(player.minutes, 0) - caps[i];
      player.minutes = caps[i];
    }
  });
  while (surplus > 0) {
    const candidates = liveRotation
      .map((player, i) => ({
        i,
        room: Math.max(0, caps[i] - parseNum(player.minutes, 0)),
        rating: parseNum(player.rating, 65),
        role: String(player.rotationRole || '')
      }))
      .filter(item => item.room > 0)
      .sort((a, b) => b.rating - a.rating || (a.role === 'starter' ? -1 : 0) - (b.role === 'starter' ? -1 : 0));
    if (!candidates.length) break;
    const next = candidates[0];
    liveRotation[next.i].minutes += 1;
    surplus -= 1;
  }
  return liveRotation;
}

function buildTeamSimulationProfile(teamId, { includeUser = false, home = false, fatigueContext = null } = {}) {
  const ctx = buildSimRotationContext(teamId, { includeUser });
  const players = (ctx.simPlayers || []).length ? ctx.simPlayers : (ctx.rotation || []);
  const fatigue = fatigueContext || sampleGenericFatigueContext({ teamId, home, roundIndex: 0, phase: 'regular' });
  const rating = weightedRotationAverage(players, p => parseNum(p?.rating, ovr(usagePlayerAttrs(p))), parseNum(getTeamStrength(teamId), 72));
  const shotExt = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).shotExt, 55), 55);
  const shotInt = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).shotInt, 55), 55);
  const shotFree = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).shotFree, 68), 68);
  const foulPressure = weightedRotationAverage(players, p => parseNum(p?.tendencies?.fr ?? p?.tendencies?.foul ?? p?.tendencyFr, 55), 55);
  const pass = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).pass, 55), 55);
  const rebounding = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).reb, 55), 55);
  const speed = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).speed, 55), 55);
  const strengthAttr = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).strength, parseNum(usagePlayerAttrs(p).physique, 55)), 55);
  const stl = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).stl, 55), 55);
  const blk = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).blk, 55), 55);
  const perimeterDef = weightedRotationAverage(players, p => {
    const attrs = usagePlayerAttrs(p);
    return (parseNum(attrs.stl, 55) * 0.42) + (parseNum(attrs.speed, 55) * 0.22) + (parseNum(p?.def, parseNum(p?.rating, 65)) * 0.36);
  }, 55);
  const rimProtection = weightedRotationAverage(players, p => {
    const attrs = usagePlayerAttrs(p);
    return (parseNum(attrs.blk, 55) * 0.52) + (parseNum(attrs.reb, 55) * 0.18) + (parseNum(attrs.strength, parseNum(attrs.physique, 55)) * 0.30);
  }, 55);
  const size = weightedRotationAverage(players, p => {
    const attrs = usagePlayerAttrs(p);
    const pos = clamp(parseNum(p?.pos, 3), 1, 5);
    const positionSize = pos >= 4 ? 66 : pos === 3 ? 60 : 54;
    return (parseNum(attrs.reb, 55) * 0.25) + (parseNum(attrs.strength, parseNum(attrs.physique, 55)) * 0.35) + positionSize;
  }, 58);
  const starters = players.slice(0, 5);
  const bench = players.slice(5);
  const starterRating = weightedRotationAverage(starters, p => parseNum(p?.rating, rating), rating);
  const benchRating = bench.length ? weightedRotationAverage(bench, p => parseNum(p?.rating, rating - 6), rating - 6) : (starterRating - 7);
  let depth = clamp(52 + (benchRating - 68) * 1.65 + Math.max(0, players.length - 8) * 1.2, 36, 88);
  let offense = 57 + parseNum(getTeamStrength(teamId), rating) * 0.24 + rating * 0.18 + shotExt * 0.11 + shotInt * 0.10 + pass * 0.12 + (parseNum(ctx.coachFx?.offPct, 0) + parseNum(ctx.coachFx?.tacticsPct, 0)) * 60 + (parseNum(ctx.coachFx?.teamRatingMult, 1) - 1) * 30;
  let defense = 55 + parseNum(getTeamStrength(teamId), rating) * 0.22 + perimeterDef * 0.14 + rimProtection * 0.12 + rebounding * 0.10 + depth * 0.08 + (parseNum(ctx.coachFx?.defPct, 0) + parseNum(ctx.coachFx?.tacticsPct, 0) * 0.5) * 60;
  let pace = clamp(48 + speed * 0.18 + pass * 0.10 + (parseNum(ctx.coachFx?.paceMult, 1) - 1) * 110 + (parseNum(ctx.coachFx?.threeRateMult, 1) - 1) * 16, 44, 84);
  offense -= parseNum(fatigue?.skillPenalty, 0) * 0.72;
  defense -= parseNum(fatigue?.skillPenalty, 0) * 0.58;
  pace -= parseNum(fatigue?.pacePenalty, 0) * 0.65;
  depth -= parseNum(fatigue?.loadScore, 0) * 0.28;
  if (parseNum(teamId, 0) === parseNum(G.teamId, 0) && G.player?.injury?.active) {
    offense -= 4.5;
    depth -= 2;
    pace -= 1;
  }
  return {
    ...ctx,
    home: !!home,
    rating: +rating.toFixed(1),
    shotExt,
    shotInt,
    shotFree,
    foulPressure,
    pass,
    rebounding,
    speed,
    strengthAttr,
    stl,
    blk,
    perimeterDef: +perimeterDef.toFixed(1),
    rimProtection: +rimProtection.toFixed(1),
    size: +size.toFixed(1),
    depth: +depth.toFixed(1),
    offense: +clamp(offense, 68, 97).toFixed(1),
    defense: +clamp(defense, 68, 97).toFixed(1),
    pace: +pace.toFixed(1),
    starterRating: +starterRating.toFixed(1),
    benchRating: +benchRating.toFixed(1),
    fatigueContext: fatigue
  };
}

const POSSESSION_FT_WEIGHT = 0.44;
const MAX_PLAYER_3PA_GAME = 16;

function simulateTeamOffensePlan(teamProfile, oppProfile, { home = false, sharedPossessions = 96 } = {}) {
  const homeBoost = home ? 0.008 : 0;
  const offenseEdge = parseNum(teamProfile?.offense, 78) - parseNum(oppProfile?.defense, 78);
  const possessions = clamp(Math.round(sharedPossessions + (home ? 1 : 0) + (parseNum(teamProfile?.depth, 55) - parseNum(oppProfile?.depth, 55)) / 22 + rng(-1, 1)), 88, 112);
  const threeShare = clamp(
    0.29
    + (parseNum(teamProfile?.shotExt, 55) - 55) / 210
    + (parseNum(teamProfile?.coachFx?.threeRateMult, 1) - 1) * 0.62
    + (parseNum(teamProfile?.coachFx?.paceMult, 1) - 1) * 0.08
    - (parseNum(oppProfile?.perimeterDef, 55) - 55) / 800
    + rng(-0.015, 0.015),
    0.22,
    0.50
  );
  const threePct = clamp(
    0.31
    + (parseNum(teamProfile?.shotExt, 55) - 55) / 240
    + offenseEdge / 500
    - (parseNum(oppProfile?.perimeterDef, 55) - 55) / 350
    + homeBoost
    + rng(-0.012, 0.012),
    0.28,
    0.43
  );
  const twoPct = clamp(
    0.47
    + (parseNum(teamProfile?.shotInt, 55) - 55) / 220
    + offenseEdge / 420
    - (parseNum(oppProfile?.rimProtection, 55) - 55) / 340
    + homeBoost
    + rng(-0.012, 0.012),
    0.43,
    0.63
  );
  const fgPct = clamp((twoPct * (1 - threeShare)) + (threePct * threeShare), 0.41, 0.58);
  const tovRate = clamp(
    0.145
    - (parseNum(teamProfile?.rating, 72) - 72) / 650
    - (parseNum(teamProfile?.pass, 55) - 55) / 450
    - (parseNum(teamProfile?.speed, 55) - 55) / 900
    + (parseNum(oppProfile?.perimeterDef, 55) - 55) / 420
    + (parseNum(oppProfile?.coachFx?.stocksMult, 1) - 1) * 0.18
    - (home ? 0.004 : 0)
    + rng(-0.006, 0.006),
    0.095,
    0.185
  );
  const orbRate = clamp(
    0.245
    + (parseNum(teamProfile?.rebounding, 55) - parseNum(oppProfile?.rebounding, 55)) / 280
    + (parseNum(teamProfile?.size, 58) - parseNum(oppProfile?.size, 58)) / 420
    + (parseNum(teamProfile?.coachFx?.rebMult, 1) - 1) * 0.45
    + rng(-0.015, 0.015),
    0.18,
    0.37
  );
  const ftr = clamp(
    0.20
    + (parseNum(teamProfile?.shotInt, 55) - parseNum(oppProfile?.rimProtection, 55)) / 260
    + (parseNum(teamProfile?.foulPressure, 55) - 55) / 230
    + (parseNum(teamProfile?.shotFree, 68) - 68) / 700
    + (parseNum(teamProfile?.coachFx?.paintRateMult, 1) - 1) * 0.26
    + homeBoost
    + rng(-0.015, 0.015),
    0.10,
    0.40
  );
  const ftPct = clamp(
    0.73
    + (parseNum(teamProfile?.shotFree, 68) - 68) / 200
    + (parseNum(teamProfile?.pass, 55) - 55) / 900
    + (home ? 0.004 : 0),
    0.67,
    0.87
  );
  const turnovers = clamp(Math.round(possessions * tovRate), 7, 22);
  const denom = clamp(1 + (POSSESSION_FT_WEIGHT * ftr) - (orbRate * (1 - fgPct)), 0.74, 1.18);
  const fga = clamp(Math.round((possessions - turnovers) / denom), 60, 104);
  const tpa = clamp(Math.round(fga * threeShare), 12, fga);
  const twoPa = Math.max(0, fga - tpa);
  const tpm = clamp(Math.round(tpa * threePct), 0, tpa);
  const twoPm = clamp(Math.round(twoPa * twoPct), 0, twoPa);
  const fgm = tpm + twoPm;
  const misses = Math.max(0, fga - fgm);
  const orb = clamp(Math.round(misses * orbRate), 4, 22);
  const fta = clamp(Math.round(fga * ftr), 8, 40);
  const ftm = clamp(Math.round(fta * ftPct), 0, fta);
  const astRate = clamp(
    0.54
    + (parseNum(teamProfile?.pass, 55) - 55) / 220
    + (parseNum(teamProfile?.coachFx?.astMult, 1) - 1) * 0.6
    - (parseNum(oppProfile?.perimeterDef, 55) - 55) / 800,
    0.42,
    0.74
  );
  const ast = clamp(Math.round(fgm * astRate), 8, fgm);
  return {
    teamId: parseNum(teamProfile?.teamId, 0),
    home: !!home,
    possessions,
    turnovers,
    tovRate: +tovRate.toFixed(3),
    orb,
    orbRate: +orbRate.toFixed(3),
    ftr: +ftr.toFixed(3),
    fga,
    fgm,
    tpa,
    tpm,
    twoPa,
    twoPm,
    fta,
    ftm,
    ftPct: +ftPct.toFixed(3),
    twoPct: +twoPct.toFixed(3),
    threePct: +threePct.toFixed(3),
    threeShare: +threeShare.toFixed(3),
    fgPct: +fgPct.toFixed(3),
    efg: +(((fgm + (0.5 * tpm)) / Math.max(1, fga))).toFixed(3),
    ast,
    astRate: +astRate.toFixed(3),
    points: (twoPm * 2) + (tpm * 3) + ftm,
    oppDefenseRating: parseNum(oppProfile?.defense, 78)
  };
}

function buildMatchupSimulationPlans(homeProfile, awayProfile, opts = {}) {
  const phase = String(opts.phase || 'regular').trim() || 'regular';
  const averagePace = (parseNum(homeProfile?.pace, 60) + parseNum(awayProfile?.pace, 60)) / 2;
  const coachPace = (parseNum(homeProfile?.coachFx?.paceMult, 1) + parseNum(awayProfile?.coachFx?.paceMult, 1)) / 2;
  let sharedPossessions = 96
    + (averagePace - 60) * 0.20
    + (coachPace - 1) * 18
    + (parseNum(homeProfile?.depth, 55) + parseNum(awayProfile?.depth, 55) - 120) * 0.03
    + rng(-4, 4);
  if (phase === 'playoffs') sharedPossessions -= 1.5;
  sharedPossessions = clamp(Math.round(sharedPossessions), 88, 111);

  const homePlan = simulateTeamOffensePlan(homeProfile, awayProfile, { home: true, sharedPossessions });
  const awayPlan = simulateTeamOffensePlan(awayProfile, homeProfile, { home: false, sharedPossessions });
  const homeStealShare = clamp(0.42 + (parseNum(homeProfile?.perimeterDef, 55) - 55) / 180 + (parseNum(homeProfile?.coachFx?.stocksMult, 1) - 1) * 0.45, 0.32, 0.66);
  const awayStealShare = clamp(0.42 + (parseNum(awayProfile?.perimeterDef, 55) - 55) / 180 + (parseNum(awayProfile?.coachFx?.stocksMult, 1) - 1) * 0.45, 0.32, 0.66);
  homePlan.stl = clamp(Math.round(parseNum(awayPlan?.turnovers, 12) * homeStealShare), 3, 14);
  awayPlan.stl = clamp(Math.round(parseNum(homePlan?.turnovers, 12) * awayStealShare), 3, 14);
  homePlan.blk = clamp(Math.round(parseNum(awayPlan?.twoPa, 48) * clamp(0.032 + (parseNum(homeProfile?.rimProtection, 55) - 55) / 680 + (parseNum(homeProfile?.coachFx?.stocksMult, 1) - 1) * 0.08, 0.02, 0.11)), 1, 10);
  awayPlan.blk = clamp(Math.round(parseNum(homePlan?.twoPa, 48) * clamp(0.032 + (parseNum(awayProfile?.rimProtection, 55) - 55) / 680 + (parseNum(awayProfile?.coachFx?.stocksMult, 1) - 1) * 0.08, 0.02, 0.11)), 1, 10);
  homePlan.drb = clamp(Math.round(Math.max(0, parseNum(awayPlan?.fga, 84) - parseNum(awayPlan?.fgm, 38)) * (1 - parseNum(awayPlan?.orbRate, 0.24))), 18, 42);
  awayPlan.drb = clamp(Math.round(Math.max(0, parseNum(homePlan?.fga, 84) - parseNum(homePlan?.fgm, 38)) * (1 - parseNum(homePlan?.orbRate, 0.24))), 18, 42);
  homePlan.reb = homePlan.orb + homePlan.drb;
  awayPlan.reb = awayPlan.orb + awayPlan.drb;

  let overtimes = 0;
  const homeOtPeriods = [];
  const awayOtPeriods = [];
  const currentMargin = Math.abs(parseNum(homePlan?.points, 0) - parseNum(awayPlan?.points, 0));
  const homeFavored = parseNum(homePlan?.points, 0) === parseNum(awayPlan?.points, 0)
    ? (parseNum(homeProfile?.offense, 78) + 1.5 >= parseNum(awayProfile?.offense, 78))
    : parseNum(homePlan?.points, 0) > parseNum(awayPlan?.points, 0);
  const otChance = parseNum(homePlan?.points, 0) === parseNum(awayPlan?.points, 0)
    ? 1
    : currentMargin <= 1 ? 0.10 : currentMargin <= 3 ? 0.04 : currentMargin <= 5 ? 0.01 : 0;
  if (Math.random() < otChance) {
    overtimes = (currentMargin <= 1 && Math.random() < 0.04) ? 2 : 1;
    const avgScore = Math.round((parseNum(homePlan?.points, 0) + parseNum(awayPlan?.points, 0)) / 2);
    const regulationTie = clamp(avgScore - rng(6, 9) * overtimes, 82, 132);
    for (let i = 0; i < overtimes; i++) {
      const loserPts = rng(4, 8);
      const winnerPts = loserPts + rng(1, 4);
      if (homeFavored) {
        homeOtPeriods.push(winnerPts);
        awayOtPeriods.push(loserPts);
      } else {
        awayOtPeriods.push(winnerPts);
        homeOtPeriods.push(loserPts);
      }
    }
    homePlan.points = regulationTie + homeOtPeriods.reduce((sum, value) => sum + value, 0);
    awayPlan.points = regulationTie + awayOtPeriods.reduce((sum, value) => sum + value, 0);
    homePlan.possessions += overtimes * 5;
    awayPlan.possessions += overtimes * 5;
  } else if (parseNum(homePlan?.points, 0) === parseNum(awayPlan?.points, 0)) {
    if (homeFavored) homePlan.points += 1;
    else awayPlan.points += 1;
  }

  homePlan.ortg = Math.round(parseNum(homePlan?.points, 0) / Math.max(1, parseNum(homePlan?.possessions, 96)) * 100);
  awayPlan.ortg = Math.round(parseNum(awayPlan?.points, 0) / Math.max(1, parseNum(awayPlan?.possessions, 96)) * 100);
  return { homePlan, awayPlan, overtimes, homeOtPeriods, awayOtPeriods };
}

function estimateLeagueThreePctForRow(attrs, rating, pos, oppRating, coachFx = null, gameMod = null) {
  const realPct = parseNum(attrs?.__realThreePct, NaN);
  if (Number.isFinite(realPct) && realPct > 0) {
    return clamp(realPct / (realPct > 1 ? 100 : 1) + rng(-0.018, 0.018), 0.255, 0.455);
  }
  const shotExt = clamp(parseNum(attrs?.shotExt, 55), 20, 99);
  const variancePct = gameMod?.varianceTag === 'hot' ? 0.012 : gameMod?.varianceTag === 'cold' ? -0.014 : 0;
  const coachPct = clamp((parseNum(coachFx?.threeRateMult, 1) - 1) * 0.045, -0.014, 0.018);
  const posPct = parseNum(pos, 3) <= 2 ? 0.006 : parseNum(pos, 3) === 3 ? 0.002 : -0.008;
  const cap = shotExt >= 94 ? 0.445 : shotExt >= 88 ? 0.425 : shotExt >= 80 ? 0.405 : shotExt >= 72 ? 0.385 : 0.360;
  return clamp(
    0.305
    + (shotExt - 70) * 0.0035
    + (parseNum(rating, 65) - 75) * 0.0011
    - (parseNum(oppRating, 75) - 75) * 0.0010
    + coachPct
    + posPct
    + variancePct,
    0.245,
    cap
  );
}

function realMinutesPerGameForSim(player = null) {
  const stats = player?.sourceRealStats || player?.realStats || player?.historicalStats || player?.sourceStats || null;
  if (!stats || typeof stats !== 'object') return NaN;
  const direct = parseNum(stats.MIN ?? stats.min ?? stats.mins ?? stats.minutes ?? stats.minutesPerGame, NaN);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return NaN;
}

function realFieldGoalAttemptsPerGameForSim(player = null) {
  const stats = player?.sourceRealStats || player?.realStats || player?.historicalStats || player?.sourceStats || null;
  if (!stats || typeof stats !== 'object') return NaN;
  const direct = parseNum(
    stats.FGA ?? stats.fga ?? stats.fieldGoalAttemptsPerGame,
    NaN
  );
  if (Number.isFinite(direct)) {
    const gp = Math.max(1, parseNum(stats.GP ?? stats.gp, 1));
    return direct > 40 && gp > 1 ? direct / gp : direct;
  }
  const total = parseNum(stats.fieldGoalAttempts ?? stats.totalFga, NaN);
  if (Number.isFinite(total)) return total / Math.max(1, parseNum(stats.GP ?? stats.gp, 1));
  return NaN;
}

function realThreeAttemptsPerGameForSim(player = null) {
  const stats = player?.sourceRealStats || player?.realStats || player?.historicalStats || player?.sourceStats || null;
  if (!stats || typeof stats !== 'object') return NaN;
  const direct = parseNum(
    stats.TPA ?? stats.tpa ?? stats.threePa ?? stats.threePA ?? stats.fg3a ?? stats.FG3A ?? stats.threeAttemptsPerGame,
    NaN
  );
  if (Number.isFinite(direct)) {
    const gp = Math.max(1, parseNum(stats.GP ?? stats.gp, 1));
    return direct > 20 && gp > 1 ? direct / gp : direct;
  }
  const total = parseNum(stats.threePointersAttempted ?? stats.totalTpa ?? stats.total3pa, NaN);
  if (Number.isFinite(total)) return total / Math.max(1, parseNum(stats.GP ?? stats.gp, 1));
  return NaN;
}

function realTurnoversPerGameForSim(player = null) {
  const stats = player?.sourceRealStats || player?.realStats || player?.historicalStats || player?.sourceStats || null;
  if (!stats || typeof stats !== 'object') return NaN;
  const direct = parseNum(
    stats.TOV ?? stats.tov ?? stats.turnovers ?? stats.turnoversPerGame,
    NaN
  );
  if (Number.isFinite(direct)) {
    const gp = Math.max(1, parseNum(stats.GP ?? stats.gp, 1));
    return direct > 12 && gp > 1 ? direct / gp : direct;
  }
  const total = parseNum(stats.totalTov ?? stats.totalTurnovers, NaN);
  if (Number.isFinite(total)) return total / Math.max(1, parseNum(stats.GP ?? stats.gp, 1));
  return NaN;
}

function realFreeThrowAttemptsPerGameForSim(player = null) {
  const stats = player?.sourceRealStats || player?.realStats || player?.historicalStats || player?.sourceStats || null;
  if (!stats || typeof stats !== 'object') return NaN;
  const direct = parseNum(
    stats.FTA ?? stats.fta ?? stats.freeThrowAttemptsPerGame,
    NaN
  );
  if (Number.isFinite(direct)) {
    const gp = Math.max(1, parseNum(stats.GP ?? stats.gp, 1));
    return direct > 20 && gp > 1 ? direct / gp : direct;
  }
  const total = parseNum(stats.freeThrowsAttempted ?? stats.totalFta, NaN);
  if (Number.isFinite(total)) return total / Math.max(1, parseNum(stats.GP ?? stats.gp, 1));
  return NaN;
}

function realThreePctForSim(player = null) {
  const stats = player?.sourceRealStats || player?.realStats || player?.historicalStats || player?.sourceStats || null;
  if (!stats || typeof stats !== 'object') return NaN;
  const direct = parseNum(
    stats.TP ?? stats.tpPct ?? stats.TPP ?? stats.threePct ?? stats.threePointPct ?? stats.threePointPercentage,
    NaN
  );
  if (Number.isFinite(direct) && direct > 0) return clamp(direct > 1.5 ? direct / 100 : direct, 0.05, 0.65);
  const tpm = parseNum(stats.TPM ?? stats.tpm ?? stats.threePointersMade ?? stats.totalTpm, NaN);
  const tpa = parseNum(stats.TPA ?? stats.tpa ?? stats.threePointersAttempted ?? stats.totalTpa, NaN);
  if (Number.isFinite(tpm) && Number.isFinite(tpa) && tpa > 0) return clamp(tpm / tpa, 0.05, 0.65);
  return NaN;
}

function realFreeThrowPctForSim(player = null) {
  const stats = player?.sourceRealStats || player?.realStats || player?.historicalStats || player?.sourceStats || null;
  if (stats && typeof stats === 'object') {
    const direct = parseNum(
      stats.FT ?? stats.ftPct ?? stats.FTP ?? stats.freeThrowPct ?? stats.freeThrowPercentage,
      NaN
    );
    if (Number.isFinite(direct) && direct > 0) {
      const pct = direct > 1.5 ? direct / 100 : direct;
      if (pct >= 0.35 && pct <= 1) return clamp(pct, 0.38, 0.96);
    }
    const ftm = parseNum(stats.FTM ?? stats.ftm ?? stats.freeThrowsMade ?? stats.totalFtm, NaN);
    const fta = parseNum(stats.FTA ?? stats.fta ?? stats.freeThrowsAttempted ?? stats.totalFta, NaN);
    if (Number.isFinite(ftm) && Number.isFinite(fta) && fta > 0) {
      return clamp(ftm / fta, 0.38, 0.96);
    }
  }

  const attrs = usagePlayerAttrs(player || {});
  const rating = clamp(parseNum(player?.rating, ovr(attrs)), 40, 99);
  const rawShotFree = parseNum(attrs.shotFree, NaN);
  const shotFree = Number.isFinite(rawShotFree) && rawShotFree > 0 ? rawShotFree : 68;
  return clamp(
    0.745
    + (shotFree - 68) / 260
    + (rating - 70) / 900,
    0.64,
    0.91
  );
}

function leagueThreeAttemptProfileForRow(player, attrs, rating, pos, threeShareMult = 1) {
  const shotExt = clamp(parseNum(attrs?.shotExt, 55), 20, 99);
  const extTendency = clamp(parseNum(
    player?.tendencies?.ex ?? player?.tendencyExt ?? player?.tendencyEx,
    shotExt
  ), 20, 100);
  const realTpa = realThreeAttemptsPerGameForSim(player);
  const hasRealTpa = Number.isFinite(realTpa) && realTpa >= 0;
  const sourceYear = parseNum(player?.sourceStatsYear || player?.sourceYear || G?.year, G?.year || 2025);
  if (sourceYear > 0 && sourceYear < 1980) {
    return { share: 0, attemptsPer36: 0, lowVolumeBig: pos >= 4, frontcourtLimited: pos >= 4, noThreeEra: true, realTpa };
  }
  const shooterFactor = clamp((shotExt - 42) / 44, 0, 1);
  const tendencyFactor = clamp((extTendency - 35) / 55, 0, 1);
  const posBaseShare = pos <= 2 ? 0.42 : pos === 3 ? 0.32 : pos === 4 ? 0.24 : 0.16;
  const posBasePer36 = pos <= 2 ? 6.0 : pos === 3 ? 4.4 : pos === 4 ? 3.5 : 2.3;
  const eraMult = sourceYear <= 1984 ? 0.12
    : sourceYear <= 1994 ? 0.24
      : sourceYear <= 2004 ? 0.46
        : sourceYear <= 2012 ? 0.62
          : sourceYear <= 2016 ? 0.80
            : 1;
  const skillFactor = clamp(0.22 + shooterFactor * 0.58 + tendencyFactor * 0.34 + (parseNum(rating, 65) - 70) * 0.006, 0.08, 1.20);
  let share = posBaseShare * skillFactor * threeShareMult;
  let attemptsPer36 = posBasePer36 * skillFactor * threeShareMult * eraMult;
  const realLowVolumeBig = pos >= 4 && hasRealTpa && realTpa < 1.25;
  const lowVolumeBig = pos >= 4 && (realLowVolumeBig || (shotExt < 62 && extTendency < 64));
  const stretchBig = pos >= 4 && (
    (hasRealTpa && realTpa >= 2.4)
    || shotExt >= 82
    || (shotExt >= 74 && extTendency >= 78)
    || extTendency >= 90
  );
  let frontcourtLimited = false;

  if (lowVolumeBig) {
    const cap = hasRealTpa ? clamp((realTpa + 0.25) / 18, 0.015, 0.085) : (shotExt < 54 ? 0.035 : 0.055);
    share = Math.min(share, cap);
    const realCapPer36 = hasRealTpa
      ? clamp(realTpa * clamp(threeShareMult, 0.85, 1.18) + 0.25, 0, 1.35)
      : (shotExt < 54 ? 0.45 : 0.85);
    attemptsPer36 = Math.min(attemptsPer36, realCapPer36);
  }
  if (pos >= 4 && !stretchBig) {
    frontcourtLimited = true;
    const eraCap = sourceYear <= 1984 ? 0.10
      : sourceYear <= 1994 ? (pos === 4 ? 0.55 : 0.25)
        : sourceYear <= 2004 ? (pos === 4 ? 1.35 : 0.65)
          : sourceYear <= 2012 ? (pos === 4 ? 2.05 : 0.95)
            : sourceYear <= 2016 ? (pos === 4 ? 2.45 : 1.35)
              : (pos === 4 ? 3.20 : 2.10);
    const skillCap = shotExt < 62 ? (pos === 4 ? 0.55 : 0.30)
      : shotExt < 70 ? (pos === 4 ? 0.95 : 0.55)
        : shotExt < 74 ? (pos === 4 ? 1.45 : 0.85)
          : eraCap;
    const tendencyCap = extTendency < 62 ? (pos === 4 ? 0.85 : 0.35)
      : extTendency < 72 ? (pos === 4 ? 1.25 : 0.60)
        : extTendency < 80 ? (pos === 4 ? 1.65 : 0.90)
          : eraCap;
    const realCap = hasRealTpa ? clamp(realTpa * clamp(threeShareMult, 0.85, 1.18) + 0.35, 0, 2.05) : eraCap;
    const capPer36 = Math.min(eraCap, tendencyCap, skillCap, realCap);
    attemptsPer36 = Math.min(attemptsPer36, capPer36);
    share = Math.min(share, clamp(capPer36 / 18, 0, pos === 4 ? 0.18 : 0.12));
  } else if (stretchBig) {
    const floorPer36 = sourceYear <= 1994 ? (pos === 4 ? 1.3 : 0.8)
      : sourceYear <= 2004 ? (pos === 4 ? 2.4 : 1.6)
        : sourceYear <= 2012 ? (pos === 4 ? 3.2 : 2.4)
          : (pos === 4 ? 4.2 : 3.1);
    attemptsPer36 = Math.max(attemptsPer36, floorPer36 * threeShareMult);
    share = Math.max(share, pos === 4 ? 0.22 : 0.17);
  }

  return {
    share: clamp(share, pos >= 4 ? 0 : 0.06, 0.62),
    attemptsPer36: clamp(attemptsPer36, 0, 8.8),
    lowVolumeBig,
    frontcourtLimited,
    noThreeEra: false,
    realTpa
  };
}

function threeAttemptEraCapPer48ForSim(sourceYear, pos) {
  const year = parseNum(sourceYear, G?.year || 2025);
  const slot = clamp(parseNum(pos, 3), 1, 5);
  if (year > 0 && year < 1980) return 0;
  if (year <= 1984) return slot <= 3 ? 2 : 0.5;
  if (year <= 1994) return slot <= 2 ? 6 : slot === 3 ? 5 : slot === 4 ? 3 : 1.5;
  if (year <= 2004) return slot <= 2 ? 9 : slot === 3 ? 8 : slot === 4 ? 5 : 3;
  if (year <= 2016) return slot <= 2 ? 12 : slot === 3 ? 11 : slot === 4 ? 8 : 5;
  return slot <= 2 ? 15 : slot === 3 ? 13 : slot === 4 ? 10 : 7;
}

function usageCapRateForSim(tierId, rating, att) {
  const base = {
    alpha: 0.36,
    second: 0.30,
    third: 0.25,
    sixthman: 0.25,
    rolestarter: 0.22,
    bench: 0.19,
    end: 0.15
  }[tierId] || 0.21;
  return clamp(base + Math.max(0, parseNum(rating, 70) - 92) * 0.001 + Math.max(0, parseNum(att, 65) - 94) * 0.001, 0.13, 0.38);
}

function buildPlayerOffensivePriorForSim(player, attrs, {
  pos = 3,
  minutes = 0,
  rating = 65,
  att = 65,
  tierId = 'bench',
  tendencies = null,
  threeProfile = null,
  threeShareMult = 1
} = {}) {
  const source = player || {};
  const slot = clamp(parseNum(pos, 3), 1, 5);
  const mins = clamp(parseNum(minutes, 0), 0, 48);
  const realMins = realMinutesPerGameForSim(source);
  const realMinuteBase = Number.isFinite(realMins) && realMins > 0 ? clamp(realMins, 10, 42) : NaN;
  const per36 = value => Number.isFinite(value) && Number.isFinite(realMinuteBase) && realMinuteBase > 0
    ? value / realMinuteBase * 36
    : NaN;
  const realFga = realFieldGoalAttemptsPerGameForSim(source);
  const realTpa = realThreeAttemptsPerGameForSim(source);
  const realFta = realFreeThrowAttemptsPerGameForSim(source);
  const realTov = realTurnoversPerGameForSim(source);
  const realFga36 = per36(realFga);
  const realTpa36 = per36(realTpa);
  const realFta36 = per36(realFta);
  const realTov36 = per36(realTov);
  const sourceYear = parseNum(source?.sourceStatsYear || source?.sourceYear || G?.year, G?.year || 2025);
  const shotExt = clamp(parseNum(attrs?.shotExt, 55), 20, 99);
  const tendencyEx = clamp(parseNum(tendencies?.ex, shotExt), 20, 100);
  const realThreePct = realThreePctForSim(source);
  const usageCapRate = usageCapRateForSim(tierId, rating, att);
  const tierComfort = {
    alpha: 0.305,
    second: 0.265,
    third: 0.225,
    sixthman: 0.225,
    rolestarter: 0.190,
    bench: 0.155,
    end: 0.115
  }[tierId] || 0.175;
  const realUsed36 = [realFga36, realFta36, realTov36].every(Number.isFinite)
    ? realFga36 + POSSESSION_FT_WEIGHT * realFta36 + realTov36
    : NaN;
  const comfortUsageRate = Number.isFinite(realUsed36)
    ? clamp(realUsed36 / 72, 0.09, usageCapRate)
    : clamp(tierComfort + (parseNum(rating, 70) - 76) / 520 + (parseNum(att, 65) - 72) / 620, 0.09, usageCapRate);
  const fallbackFga36 = clamp(9.0 + (parseNum(att, 65) - 62) / 3.9 + (parseNum(rating, 70) - 70) / 7 + (tierComfort - 0.18) * 32, 5.0, 23.5);
  const comfortFgaPer36 = Number.isFinite(realFga36) ? clamp(realFga36, 2, 28) : fallbackFga36;
  const comfortTpaPer36 = Number.isFinite(realTpa36)
    ? clamp(realTpa36 * clamp(threeShareMult, 0.86, 1.18), 0, 13)
    : clamp(parseNum(threeProfile?.attemptsPer36, 0), 0, 10.8);
  const comfortFtaPer36 = Number.isFinite(realFta36)
    ? clamp(realFta36, 0, 14)
    : clamp(2.3 + (parseNum(attrs?.shotInt, 55) - 60) / 18 + (parseNum(attrs?.strength, parseNum(attrs?.physique, 55)) - 60) / 28, 0.6, 8.5);
  const comfortTovPer36 = Number.isFinite(realTov36)
    ? clamp(realTov36, 0.2, 6.5)
    : clamp(1.2 + (parseNum(att, 65) - 62) / 55 - (parseNum(attrs?.pass, 55) - 55) / 80 + (slot <= 2 ? 0.25 : 0), 0.4, 4.5);
  const tierFgaCapPer48 = { alpha: 34, second: 29, third: 25, sixthman: 25, rolestarter: 22, bench: 18, end: 12 }[tierId] || 20;
  const realFgaCap = Number.isFinite(realFga36) ? (realFga36 * 1.35 + 2) * (mins / 36) : Infinity;
  const fgaCap = clamp(Math.round(Math.min(realFgaCap, tierFgaCapPer48 * mins / 48 + 1)), 0, 38);
  const realFtaCap = Number.isFinite(realFta36) ? (realFta36 * 1.45 + 1.5) * (mins / 36) : Infinity;
  const ftaCap = clamp(Math.round(Math.min(realFtaCap, Math.max(3, comfortFtaPer36 * mins / 36 * 1.55 + 2))), 0, 18);
  const eraCap = threeAttemptEraCapPer48ForSim(sourceYear, slot) * mins / 48;
  const absoluteCap = MAX_PLAYER_3PA_GAME * mins / 48;
  let tpaCap = Math.min(eraCap, absoluteCap);
  let tpaCapReason = 'era-position';
  if (Number.isFinite(realTpa)) {
    const realCap = realTpa >= 9
      ? Math.max(15.5, realTpa * 1.25 + 1.1)
      : realTpa * 1.45 + 1.5;
    tpaCap = Math.min(tpaCap, realCap * clamp(mins / 48, 0.45, 1.0));
    tpaCapReason = 'real-volume';
  } else {
    const attrCapPer48 = (shotExt >= 92 || tendencyEx >= 92 || realThreePct >= 0.39)
      ? (slot <= 2 ? 15 : slot === 3 ? 13 : slot === 4 ? 10 : 7)
      : (shotExt >= 85 || realThreePct >= 0.36)
        ? (slot <= 2 ? 11 : slot === 3 ? 10 : slot === 4 ? 7 : 5)
        : (shotExt >= 78 || realThreePct >= 0.33)
          ? (slot <= 2 ? 8 : slot === 3 ? 7 : slot === 4 ? 5 : 3)
          : (shotExt >= 70 || realThreePct >= 0.30)
            ? (slot <= 2 ? 6 : slot === 3 ? 5 : slot === 4 ? 3 : 2)
            : (slot <= 2 ? 4 : slot === 3 ? 3 : slot === 4 ? 1.5 : 1);
    const pctLimitedCap = Number.isFinite(realThreePct) && realThreePct < 0.33
      ? (realThreePct < 0.30 ? (slot <= 3 ? 4 : 1.5) : (slot <= 2 ? 6 : slot === 3 ? 5 : slot === 4 ? 2.5 : 1.5))
      : attrCapPer48;
    tpaCap = Math.min(tpaCap, Math.min(attrCapPer48, pctLimitedCap) * mins / 48);
    tpaCapReason = attrCapPer48 >= 13 ? 'elite-attribute' : 'attribute-volume';
  }
  if (threeProfile?.noThreeEra) {
    tpaCap = 0;
    tpaCapReason = 'pre-1980';
  } else if (threeProfile?.lowVolumeBig || threeProfile?.frontcourtLimited) {
    const profileCap = Math.max(0, parseNum(threeProfile?.attemptsPer36, 0) * mins / 36 + 0.75);
    tpaCap = Math.min(tpaCap, profileCap);
    tpaCapReason = threeProfile?.lowVolumeBig ? 'low-volume-big' : 'frontcourt-era';
  }
  return {
    sourceYear,
    realMins,
    realFga,
    realTpa,
    realFta,
    realTov,
    comfortUsageRate: +comfortUsageRate.toFixed(3),
    usageCapRate: +usageCapRate.toFixed(3),
    comfortFgaPer36: +comfortFgaPer36.toFixed(2),
    comfortTpaPer36: +comfortTpaPer36.toFixed(2),
    comfortFtaPer36: +comfortFtaPer36.toFixed(2),
    comfortTovPer36: +comfortTovPer36.toFixed(2),
    fgaCap,
    ftaCap,
    tpaCap: clamp(Math.round(tpaCap), 0, Math.round(Math.min(absoluteCap, MAX_PLAYER_3PA_GAME))),
    tpaCapReason
  };
}

function capAllocatedShares(total, weights = [], caps = []) {
  const count = Array.isArray(weights) ? weights.length : 0;
  if (!count) return [];
  const safeCaps = Array.from({ length: count }, (_, i) => clamp(Math.round(parseNum(caps?.[i], total)), 0, 999));
  const cappedTotal = Math.min(Math.max(0, Math.round(parseNum(total, 0))), safeCaps.reduce((sum, value) => sum + value, 0));
  const out = Array(count).fill(0);
  let remaining = cappedTotal;
  let open = [...Array(count).keys()].filter(i => safeCaps[i] > 0);
  let guard = 0;
  while (remaining > 0 && open.length && guard < count + 8) {
    const adds = allocateIntegerShares(remaining, open.map(i => weights[i]));
    let overflow = 0;
    open.forEach((idx, orderIdx) => {
      const room = Math.max(0, safeCaps[idx] - out[idx]);
      const add = Math.max(0, adds[orderIdx] || 0);
      const take = Math.min(room, add);
      out[idx] += take;
      overflow += add - take;
    });
    remaining = overflow;
    open = open.filter(i => out[i] < safeCaps[i]);
    guard++;
  }
  return out;
}

function adjustIntegerTargetsToTotal(targets = [], total = 0, weights = [], caps = []) {
  const out = targets.map((value, i) => clamp(Math.round(parseNum(value, 0)), 0, Math.round(parseNum(caps?.[i], 999))));
  const safeCaps = out.map((_, i) => clamp(Math.round(parseNum(caps?.[i], 999)), 0, 999));
  const target = Math.min(Math.max(0, Math.round(parseNum(total, 0))), safeCaps.reduce((sum, value) => sum + value, 0));
  let diff = target - out.reduce((sum, value) => sum + value, 0);
  let guard = 0;
  while (diff > 0 && guard < 1000) {
    const order = out.map((value, i) => ({ i, room: safeCaps[i] - value, w: parseNum(weights?.[i], 1) }))
      .filter(item => item.room > 0)
      .sort((a, b) => b.w - a.w || b.room - a.room);
    if (!order.length) break;
    for (const item of order) {
      if (diff <= 0) break;
      out[item.i]++;
      diff--;
    }
    guard++;
  }
  while (diff < 0 && guard < 2000) {
    const order = out.map((value, i) => ({ i, value, w: parseNum(weights?.[i], 1) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value || a.w - b.w);
    if (!order.length) break;
    for (const item of order) {
      if (diff >= 0) break;
      out[item.i]--;
      diff++;
    }
    guard++;
  }
  return out;
}

function expectedThreePctForVolume(player, attrs, rating, pos, oppRating, coachFx, gameMod, {
  teamPlan = null,
  shotPlan = null,
  tpa = 0,
  usedPossessions = 0,
  teamUsedPossessions = 96
} = {}) {
  const attempts = Math.max(0, Math.round(parseNum(tpa, 0)));
  const minutes = Math.max(1, parseNum(shotPlan?.minutes, 0));
  const realPct = realThreePctForSim(player);
  const attrPct = estimateLeagueThreePctForRow(attrs, rating, pos, oppRating, coachFx, gameMod);
  const teamPct = clamp(parseNum(teamPlan?.threePct, attrPct), 0.26, 0.45);
  let expected = Number.isFinite(realPct)
    ? (realPct * 0.68) + (attrPct * 0.24) + (teamPct * 0.08)
    : (attrPct * 0.82) + (teamPct * 0.18);
  const actualTpa36 = attempts / minutes * 36;
  const extraTpa36 = Math.max(0, actualTpa36 - parseNum(shotPlan?.comfortTpaPer36, actualTpa36));
  const volumePenalty = clamp(extraTpa36 * 0.006, 0, 0.055);
  const usageBase = Math.max(1, parseNum(teamUsedPossessions, 96) * minutes / 48);
  const usageRate = parseNum(usedPossessions, 0) / usageBase;
  const usagePenalty = clamp(Math.max(0, usageRate - parseNum(shotPlan?.comfortUsageRate, 0.20) - 0.04) * 0.70, 0, 0.035);
  expected -= volumePenalty + usagePenalty;
  const shotExt = clamp(parseNum(attrs?.shotExt, 55), 20, 99);
  let floor = 0.245;
  if (attempts > 0 && (Number.isFinite(realPct) || shotExt >= 85)) {
    if (realPct >= 0.39 || shotExt >= 92) floor = 0.345;
    else if (realPct >= 0.36 || shotExt >= 85) floor = 0.315;
  }
  if (attempts <= 0 || shotPlan?.threeProfile?.noThreeEra) floor = 0;
  return {
    expectedThreePct: +clamp(expected, floor, 0.455).toFixed(3),
    volumePenalty: +(volumePenalty + usagePenalty).toFixed(3),
    actualTpa36: +actualTpa36.toFixed(2),
    usageShare: +usageRate.toFixed(3)
  };
}

function fitThreeMakesToAttempts(tpa, targetThreePct, fgPts, gameMod = null) {
  const attempts = clamp(Math.round(parseNum(tpa, 0)), 0, 40);
  const maxTpm = Math.min(attempts, Math.floor(parseNum(fgPts, 0) / 3));
  if (maxTpm <= 0) return 0;
  const pct = clamp(parseNum(targetThreePct, 0.33) + parseNum(gameMod?.efficiencyShift, 0) * 0.18, 0, 0.52);
  const exactMakes = attempts * pct;
  const baseMakes = Math.floor(exactMakes);
  const fraction = exactMakes - baseMakes;
  const makeBump = Math.random() < fraction ? 1 : 0;
  return clamp(baseMakes + makeBump, 0, maxTpm);
}

function getPlayerShotTendenciesForSim(player = {}) {
  const attrs = usagePlayerAttrs(player);
  return {
    in: clamp(parseNum(player?.tendencies?.in ?? player?.tendencyIn, parseNum(attrs.shotInt, 55)), 20, 100),
    mid: clamp(parseNum(player?.tendencies?.mid ?? player?.tendencyMid, 55), 20, 100),
    ex: clamp(parseNum(player?.tendencies?.ex ?? player?.tendencyExt ?? player?.tendencyEx, parseNum(attrs.shotExt, 55)), 20, 100),
    fr: clamp(parseNum(player?.tendencies?.fr ?? player?.tendencies?.foul ?? player?.tendencyFr, 55), 20, 100)
  };
}

function coachSystemShotStyleForSim(systemId = 'balance') {
  const key = String(systemId || 'balance').trim() || 'balance';
  const styles = {
    pace_space: { usage: 1.03, three: 1.20, paint: 0.96, ftr: 0.96, creation: 1.08, reb: 0.98, stocks: 0.98 },
    seven_seconds: { usage: 1.07, three: 1.14, paint: 1.02, ftr: 0.98, creation: 1.04, reb: 0.96, stocks: 0.97 },
    perimeter_star: { usage: 1.06, three: 1.14, paint: 0.95, ftr: 0.96, creation: 1.06, reb: 0.98, stocks: 0.98 },
    interior_star: { usage: 1.04, three: 0.88, paint: 1.20, ftr: 1.10, creation: 0.98, reb: 1.10, stocks: 1.06 },
    grit: { usage: 0.96, three: 0.90, paint: 1.12, ftr: 1.10, creation: 0.96, reb: 1.08, stocks: 1.05 },
    triangle: { usage: 0.98, three: 0.94, paint: 1.08, ftr: 1.03, creation: 1.12, reb: 1.02, stocks: 1.00 },
    defense: { usage: 0.94, three: 0.92, paint: 1.06, ftr: 1.05, creation: 0.98, reb: 1.08, stocks: 1.10 },
    balance: { usage: 1.00, three: 1.00, paint: 1.00, ftr: 1.00, creation: 1.02, reb: 1.00, stocks: 1.00 }
  };
  return styles[key] || styles.balance;
}

function buildPlayerShotProfileForSim(player, rotationPlayer = null, {
  roleFx = null,
  coachFx = null,
  teamPlan = null,
  gameMod = null
} = {}) {
  const source = player || rotationPlayer || {};
  const attrs = usagePlayerAttrs(source);
  const pos = clamp(parseNum(rotationPlayer?.pos ?? source?.pos, 3), 1, 5);
  const maxMinutes = rotationPlayer?.fullGameStarter || source?.fullGameStarter ? 48 : 40;
  const minutes = clamp(parseNum(rotationPlayer?.minutes ?? source?.minutes, 0), 0, maxMinutes);
  const rating = clamp(parseNum(rotationPlayer?.rating ?? source?.rating, ovr(attrs)), 40, 99);
  const att = clamp(parseNum(source?.att ?? rotationPlayer?.att, calcPlayerAtt(attrs)), 25, 99);
  const tendencies = getPlayerShotTendenciesForSim(source);
  const systemId = String(coachFx?.systemId || source?.coach?.systemId || 'balance').trim() || 'balance';
  const style = coachSystemShotStyleForSim(systemId);
  const fitScore = clamp(parseNum(source?.coachFit?.score, 0), -4, 6);
  const fitMult = clamp(1 + fitScore * 0.025, 0.88, 1.16);
  const tierId = rotationPlayer?.teamTier || source?.teamTier || getPlayerTier(source, null);
  const tierBonus = { alpha: 1.22, second: 1.13, third: 1.07, sixthman: 1.04, rolestarter: 0.96, bench: 0.82, end: 0.56 }[tierId] || 0.92;
  const planPaceFactor = teamPlan ? clamp(Math.pow(parseNum(teamPlan?.possessions, 96) / 96, 0.45), 0.90, 1.12) : 1;
  const roleUsage = 1 + parseNum(roleFx?.usageMod, 0) * 1.05 + parseNum(coachFx?.usageByPos?.[pos], 0) * 1.20;
  const usageSkill = 0.74 + att / 125 + (rating - 70) / 260;
  const tendencyVolume = clamp(0.88 + (tendencies.in + tendencies.mid + tendencies.ex - 165) / 340, 0.76, 1.22);
  let systemFit = 1;
  if (systemId === 'pace_space') systemFit += ((parseNum(attrs.shotExt, 55) - 70) / 220) + (pos <= 3 ? 0.045 : -0.035);
  else if (systemId === 'seven_seconds') systemFit += ((parseNum(attrs.speed, 55) + parseNum(attrs.pass, 55) - 135) / 360) + (pos <= 3 ? 0.04 : -0.025);
  else if (systemId === 'perimeter_star') systemFit += ((parseNum(attrs.shotExt, 55) + parseNum(attrs.pass, 55) - 140) / 360) + (pos <= 3 ? 0.05 : -0.04);
  else if (systemId === 'interior_star' || systemId === 'grit') systemFit += ((parseNum(attrs.shotInt, 55) + parseNum(attrs.reb, 55) - 138) / 360) + (pos >= 4 ? 0.05 : -0.035);
  else if (systemId === 'triangle') systemFit += ((parseNum(attrs.pass, 55) - 62) / 320) - Math.max(0, att - 88) / 520;
  else if (systemId === 'defense') systemFit += ((parseNum(attrs.reb, 55) + parseNum(attrs.stl, 55) + parseNum(attrs.blk, 55) - 185) / 560) + (pos >= 4 ? 0.04 : -0.015);
  const usageWeight = Math.max(0.05,
    minutes
    * usageSkill
    * tendencyVolume
    * tierBonus
    * fitMult
    * clamp(systemFit, 0.82, 1.18)
    * clamp(roleUsage, 0.70, 1.42)
    * style.usage
    * planPaceFactor
    * parseNum(gameMod?.usageMult, 1)
    * (1 + rng(-0.045, 0.045))
  );

  const roleThree = parseNum(roleFx?.threeMod, 0);
  const threeShareMult = clamp(
    parseNum(coachFx?.threeRateMult, 1)
    * style.three
    * (1 + roleThree * 2.2)
    * (1 + fitScore * 0.012)
    * (gameMod?.varianceTag === 'hot' ? 1.03 : gameMod?.varianceTag === 'cold' ? 0.97 : 1),
    0.64,
    1.62
  );
  const threeProfile = leagueThreeAttemptProfileForRow(source, attrs, rating, pos, threeShareMult);
  let threeShare = threeProfile.share;
  if (systemId === 'triangle') threeShare = clamp(threeShare * 0.92 + (tendencies.mid - 55) / 900, 0, 0.56);
  if (systemId === 'defense' && pos >= 4 && parseNum(attrs.shotExt, 55) < 72) threeShare = Math.min(threeShare, 0.12);

  const insideLean = clamp(
    0.34
    + (parseNum(attrs.shotInt, 55) - 62) / 210
    + (tendencies.in - 55) / 210
    - (tendencies.ex - 55) / 520
    + parseNum(roleFx?.insideMod, 0)
    + (parseNum(coachFx?.paintRateMult, 1) - 1) * 0.42
    + (style.paint - 1) * 0.55,
    0.18,
    0.82
  );
  const realFta = realFreeThrowAttemptsPerGameForSim(source);
  const realFtaMult = Number.isFinite(realFta)
    ? clamp(0.70 + realFta / 5.2, 0.58, 1.95)
    : 1;
  const foulPressureMult = clamp(0.80 + (tendencies.fr - 55) / 100, 0.62, 1.48);
  const freeThrowWeight = Math.max(0.05,
    usageWeight
    * clamp(
      0.62
      + insideLean * 0.95
      + (tendencies.fr - 55) / 150
      + (parseNum(attrs.strength, parseNum(attrs.physique, 55)) - 60) / 230,
      0.45,
      1.85
    )
    * foulPressureMult
    * realFtaMult
    * style.ftr
  );
  const threeWeight = Math.max(0.001, usageWeight * clamp(threeShare, 0, 0.66));
  const offensivePrior = buildPlayerOffensivePriorForSim(source, attrs, {
    pos,
    minutes,
    rating,
    att,
    tierId,
    tendencies,
    threeProfile,
    threeShareMult
  });
  const tovWeight = Math.max(0.01,
    usageWeight
    * clamp(
      0.76
      + offensivePrior.comfortTovPer36 / 4.2
      - (parseNum(attrs.pass, 55) - 55) / 140
      + (pos <= 2 ? 0.12 : pos >= 4 ? -0.05 : 0),
      0.48,
      1.75
    )
  );

  return {
    usageWeight,
    threeWeight,
    freeThrowWeight,
    tovWeight,
    threeShare,
    insideLean,
    tendencies,
    realFta,
    att,
    coachFitScore: fitScore,
    coachSystemId: systemId,
    threeProfile,
    ...offensivePrior,
    astMult: style.creation,
    rebMult: style.reb,
    stocksMult: style.stocks
  };
}

function buildTeamShotPlansForSim(liveRotation = [], simPlayers = [], {
  teamPlan = null,
  coachFx = null,
  gameMods = [],
  usageContext = null
} = {}) {
  const totalFga = clamp(Math.round(parseNum(teamPlan?.fga, parseNum(teamPlan?.points, 104) / 1.20)), 48, 108);
  const totalTpa = clamp(Math.round(parseNum(teamPlan?.tpa, totalFga * parseNum(teamPlan?.threeShare, 0.34))), 0, totalFga);
  const totalFta = clamp(Math.round(parseNum(teamPlan?.fta, totalFga * parseNum(teamPlan?.ftr, 0.20))), 0, 42);
  const totalTov = clamp(Math.round(parseNum(teamPlan?.turnovers, 12)), 4, 24);
  const totalUsedPossessions = Math.round(totalFga + POSSESSION_FT_WEIGHT * totalFta + totalTov);
  const profiles = liveRotation.map((p, i) => {
    const simPlayer = simPlayers[i] || p;
    const roleFx = collectRoleEffects(getPlayerRole(simPlayer, simPlayers, coachFx, usageContext));
    return buildPlayerShotProfileForSim(simPlayer, p, { roleFx, coachFx, teamPlan, gameMod: gameMods[i] });
  });
  const minutes = liveRotation.map(player => clamp(parseNum(player?.minutes, 0), 0, 48));
  const usedCaps = profiles.map((profile, i) => Math.max(1, Math.round(totalUsedPossessions * parseNum(profile.usageCapRate, 0.21) * minutes[i] / 48)));
  const usedTargets = capAllocatedShares(totalUsedPossessions, profiles.map(p => p.usageWeight), usedCaps);
  const ftaCaps = profiles.map(profile => parseNum(profile.ftaCap, 14));
  const ftaTargets = capAllocatedShares(totalFta, profiles.map(p => p.freeThrowWeight), ftaCaps);
  const tovCaps = profiles.map((profile, i) => clamp(Math.round(parseNum(profile.comfortTovPer36, 2) * minutes[i] / 36 * 1.75 + 1.5), 1, 10));
  const tovTargets = capAllocatedShares(totalTov, profiles.map(p => p.tovWeight), tovCaps);
  const fgaCaps = profiles.map(profile => parseNum(profile.fgaCap, 32));
  let fgaTargets = profiles.map((profile, i) => {
    const used = parseNum(usedTargets[i], 0);
    const rawFga = Math.round(used - POSSESSION_FT_WEIGHT * parseNum(ftaTargets[i], 0) - parseNum(tovTargets[i], 0));
    return clamp(rawFga, 0, fgaCaps[i]);
  });
  fgaTargets = adjustIntegerTargetsToTotal(fgaTargets, totalFga, profiles.map(p => p.usageWeight), fgaCaps);
  const tpaCaps = profiles.map((profile, i) => clamp(parseNum(profile.tpaCap, 0), 0, fgaTargets[i]));
  const uncappedTpaTargets = allocateIntegerShares(totalTpa, profiles.map(p => p.threeWeight));
  const tpaTargets = capAllocatedShares(totalTpa, profiles.map(p => p.threeWeight), tpaCaps);
  return profiles.map((profile, i) => {
    const simPlayer = simPlayers[i] || liveRotation[i] || {};
    const attrs = usagePlayerAttrs(simPlayer);
    const pos = clamp(parseNum(liveRotation[i]?.pos ?? simPlayer?.pos, 3), 1, 5);
    const rating = clamp(parseNum(liveRotation[i]?.rating ?? simPlayer?.rating, ovr(attrs)), 40, 99);
    const fga = clamp(fgaTargets[i] || 0, 0, fgaCaps[i]);
    const tpa = profile.threeProfile.noThreeEra ? 0 : clamp(tpaTargets[i] || 0, 0, Math.min(fga, tpaCaps[i]));
    const fta = clamp(ftaTargets[i] || 0, 0, ftaCaps[i]);
    const tov = clamp(tovTargets[i] || 0, 0, tovCaps[i]);
    const usedPossessions = +(fga + POSSESSION_FT_WEIGHT * fta + tov).toFixed(2);
    const pctModel = expectedThreePctForVolume(simPlayer, attrs, rating, pos, parseNum(teamPlan?.oppDefenseRating, 75), coachFx, gameMods[i], {
      teamPlan,
      shotPlan: { ...profile, minutes: minutes[i] },
      tpa,
      usedPossessions,
      teamUsedPossessions: totalUsedPossessions
    });
    const capHit = tpaCaps[i] > 0 && (tpa >= tpaCaps[i] || parseNum(uncappedTpaTargets[i], 0) > tpa);
    return {
      ...profile,
      minutes: minutes[i],
      usedPossessions,
      usageShare: pctModel.usageShare,
      fgaTarget: fga,
      fga,
      tpaTarget: tpa,
      tpaCap: tpaCaps[i],
      capHit,
      tpa,
      fta,
      tov,
      expectedThreePct: pctModel.expectedThreePct,
      volumePenalty: pctModel.volumePenalty,
      actualTpa36: pctModel.actualTpa36
    };
  });
}

function reconcileTeamRowsToTargetPoints(rows = [], targetPoints = 0) {
  const activeRows = (Array.isArray(rows) ? rows : []).filter(row => row && !row.status && parseNum(row.mins, 0) > 0);
  if (!activeRows.length) return rows;
  let diff = Math.round(parseNum(targetPoints, 0) - activeRows.reduce((sum, row) => sum + parseNum(row.pts, 0), 0));
  const order = [...activeRows].sort((a, b) => parseNum(b.fga, 0) - parseNum(a.fga, 0) || parseNum(b.mins, 0) - parseNum(a.mins, 0));
  let guard = 0;
  while (diff !== 0 && guard < 60) {
    const row = order[guard % order.length];
    const step = diff > 0 ? Math.min(3, diff) : Math.max(-3, diff);
    applyReconcilePointDeltaToLine(row, step);
    diff -= step;
    guard++;
  }
  return rows;
}

function buildPlayerGameRow(player, targetPts, oppRating, { teamId = 0, home = false, sourcePlayer = null, coachFx = null, teamPlan = null, gameMod = null, shotPlan = null } = {}) {
  const isSelf = !!player.isSelf;
  const simPlayer = sourcePlayer || player;
  const attrs = usagePlayerAttrs(simPlayer);
  const teamCoachFx = coachFx || getCoachEffects(teamId);
  const systemRole = buildCoachSystemRoleEffect(simPlayer, teamCoachFx);
  const maxMinutes = player?.fullGameStarter || simPlayer?.fullGameStarter ? 48 : 40;
  const minutes = clamp(Math.round(parseNum(player.minutes, 0)), 0, maxMinutes);
  const pos = clamp(parseNum(player.pos, 3), 1, 5);
  const rating = clamp(parseNum(player.rating, 65), 40, 99);
  const planPaceFactor = teamPlan ? clamp(Math.pow(parseNum(teamPlan?.possessions, 96) / 96, 0.55), 0.88, 1.14) : 1;
  const planThreeFactor = teamPlan ? clamp(parseNum(teamPlan?.threeShare, 0.34) / 0.34, 0.82, 1.24) : 1;
  const planPaintFactor = teamPlan ? clamp(0.84 + parseNum(teamPlan?.ftr, 0.20) * 1.45, 0.82, 1.24) : 1;
  const planAstFactor = teamPlan ? clamp(0.82 + parseNum(teamPlan?.astRate, 0.58), 0.86, 1.22) : 1;
  const planRebFactor = teamPlan ? clamp(0.76 + parseNum(teamPlan?.orbRate, 0.24) * 1.2, 0.84, 1.20) : 1;
  const planStocksFactor = teamPlan ? clamp(0.82 + parseNum(teamPlan?.oppDefenseRating, 78) / 100, 0.88, 1.18) : 1;
  const threeShareMult = clamp((parseNum(teamCoachFx?.threeRateMult, 1) + parseNum(systemRole?.threeMod, 0) * 1.4) * planThreeFactor * (gameMod?.varianceTag === 'hot' ? 1.03 : gameMod?.varianceTag === 'cold' ? 0.97 : 1), 0.76, 1.38);
  const paintShareMult = clamp((parseNum(teamCoachFx?.paintRateMult, 1) + parseNum(systemRole?.insideMod, 0) * 1.4) * planPaintFactor, 0.76, 1.36);
  const astMult = clamp((parseNum(teamCoachFx?.astMult, 1) + parseNum(systemRole?.astMod, 0) * 0.10) * planAstFactor * parseNum(gameMod?.astMult, 1), 0.84, 1.34);
  const rebMult = clamp((parseNum(teamCoachFx?.rebMult, 1) + parseNum(systemRole?.rebMod, 0) * 0.12) * planRebFactor * parseNum(gameMod?.rebMult, 1), 0.84, 1.34);
  const stocksMult = clamp((parseNum(teamCoachFx?.stocksMult, 1) + (parseNum(systemRole?.stlMod, 0) + parseNum(systemRole?.blkMod, 0)) * 0.10) * planStocksFactor * parseNum(gameMod?.stocksMult, 1), 0.84, 1.32);
  const row = {
    teamId,
    playerId: isSelf ? 'USER_SELF' : (player.id ?? 0),
    name: String(player.name || 'Player'),
    pos,
    pos2: clamp(parseNum(player.pos2, 0), 0, 5),
    isSelf,
    yearsLeague: parseNum(simPlayer?.yearsLeague ?? player?.yearsLeague, -1),
    rookie: !!(simPlayer?.rookie || player?.rookie),
    draft: parseNum(simPlayer?.draft ?? player?.draft, 0),
    draftPick: parseNum(simPlayer?.draftPick ?? player?.draftPick, 0),
    home,
    mins: minutes,
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    pf: 0,
    tov: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    issueTag: '',
    foulTrouble: false,
    varianceTag: 'steady'
  };

  const plannedFga = shotPlan ? clamp(Math.round(parseNum(shotPlan.fga, shotPlan.fgaTarget)), 0, 40) : 0;

  if (minutes <= 0 || (!plannedFga && targetPts <= 0)) {
    row.reb = clamp(Math.round(((minutes / 12) * (pos >= 4 ? 1.2 : 0.5) + (rating - 60) / 35) * rebMult + parseNum(systemRole?.rebMod, 0) + rng(-1, 1)), 0, pos >= 4 ? 14 : 9);
    row.ast = clamp(Math.round(((minutes / 13) * (pos <= 2 ? 1.4 : pos === 3 ? 0.9 : 0.5) + (rating - 60) / 45) * astMult + parseNum(systemRole?.astMod, 0) + rng(-1, 1)), 0, 12);
    row.stl = clamp(Math.round(((minutes / 18) * (pos <= 3 ? 0.5 : 0.3)) * stocksMult + parseNum(systemRole?.stlMod, 0) + rng(0, 1)), 0, 5);
    row.blk = clamp(Math.round(((minutes / 18) * (pos >= 4 ? 0.65 : 0.2)) * stocksMult + parseNum(systemRole?.blkMod, 0) + rng(0, 1)), 0, 5);
    row.tov = clamp(Math.round((minutes / 10) * (pos <= 2 ? 0.75 : 0.5) + rng(0, 1)), 0, 8);
    row.pf = clamp(parseNum(gameMod?.foulCount, Math.round((minutes / 12) * (pos >= 4 ? 1.25 : 1.0) + rng(0, 1))), 0, 6);
    row.issueTag = String(gameMod?.issueTag || '').trim();
    row.foulTrouble = !!gameMod?.foulTrouble;
    row.varianceTag = String(gameMod?.varianceTag || 'steady');
    row.gameNotes = Array.isArray(gameMod?.notes) ? [...gameMod.notes] : [];
    return row;
  }

  if (shotPlan && plannedFga > 0) {
    const threeProfile = shotPlan.threeProfile || leagueThreeAttemptProfileForRow(simPlayer, attrs, rating, pos, threeShareMult);
    let fga = plannedFga;
    let tpa = threeProfile.noThreeEra ? 0 : clamp(Math.round(parseNum(shotPlan.tpa, fga * parseNum(shotPlan.threeShare, threeProfile.share))), 0, Math.min(fga, parseNum(shotPlan.tpaCap, fga)));
    const targetThreePct = clamp(parseNum(shotPlan.expectedThreePct, estimateLeagueThreePctForRow(attrs, rating, pos, oppRating, teamCoachFx, gameMod)), 0, 0.455);
    const twoPa = Math.max(0, fga - tpa);
    const ftPct = realFreeThrowPctForSim(simPlayer);
    const twoPct = clamp(
      0.465
      + (parseNum(attrs.shotInt, 55) - 62) / 235
      + (parseNum(attrs.speed, 55) - 62) / 520
      + (parseNum(shotPlan.insideLean, 0.44) - 0.44) * 0.045
      + (parseNum(teamPlan?.twoPct, 0.50) - 0.50) * 0.62
      + parseNum(gameMod?.efficiencyShift, 0)
      - (parseNum(oppRating, 75) - 75) / 520,
      0.37,
      0.68
    );
    const tpm = fitThreeMakesToAttempts(tpa, targetThreePct, 999, gameMod);
    const twoPm = clamp(Math.round(twoPa * twoPct + rng(-0.55, 0.55)), 0, twoPa);
    const fta = clamp(Math.round(parseNum(shotPlan.fta, 0)), 0, 18);
    const ftm = clamp(Math.round(fta * ftPct + rng(-0.35, 0.35)), 0, fta);
    row.fta = fta;
    row.ftm = ftm;
    row.tpa = tpa;
    row.tpm = tpm;
    row.fga = fga;
    row.fgm = twoPm + tpm;
    row.pts = (row.fgm - row.tpm) * 2 + row.tpm * 3 + row.ftm;
    row.reb = clamp(Math.round(((minutes / 12) * (pos >= 4 ? 1.25 : 0.55) + (rating - 60) / 35) * rebMult * parseNum(shotPlan.rebMult, 1) + parseNum(systemRole?.rebMod, 0) + rng(-1, 2)), 0, pos >= 4 ? 16 : 10);
    row.ast = clamp(Math.round(((minutes / 13) * (pos <= 2 ? 1.55 : pos === 3 ? 0.95 : 0.5) + (rating - 60) / 45) * astMult * parseNum(shotPlan.astMult, 1) + parseNum(systemRole?.astMod, 0) + rng(-1, 2)), 0, 14);
    row.stl = clamp(Math.round(((minutes / 18) * (pos <= 3 ? 0.55 : 0.35)) * stocksMult * parseNum(shotPlan.stocksMult, 1) + parseNum(systemRole?.stlMod, 0) + rng(0, 1)), 0, 6);
    row.blk = clamp(Math.round(((minutes / 18) * (pos >= 4 ? 0.7 : 0.25)) * stocksMult * parseNum(shotPlan.stocksMult, 1) + parseNum(systemRole?.blkMod, 0) + rng(0, 1)), 0, 6);
    row.tov = clamp(Math.round(parseNum(shotPlan.tov, (minutes / 10) * (pos <= 2 ? 0.78 : 0.52) + fga / 14 - parseNum(attrs.pass, 55) / 180 + rng(0, 1))), 0, 10);
    row.pf = clamp(parseNum(gameMod?.foulCount, Math.round((minutes / 11.5) * (pos >= 4 ? 1.2 : 0.95) + Math.max(0, -parseNum(gameMod?.matchupEdge, 0)) + rng(-1, 1))), 0, 6);
    row.issueTag = String(gameMod?.issueTag || '').trim();
    row.foulTrouble = !!gameMod?.foulTrouble;
    row.varianceTag = String(gameMod?.varianceTag || 'steady');
    row.gameNotes = Array.isArray(gameMod?.notes) ? [...gameMod.notes] : [];
    if (parseNum(shotPlan.volumePenalty, 0) >= 0.025) row.gameNotes.push('高负荷降效');
    if (shotPlan.capHit) row.gameNotes.push('三分出手封顶');
    row.usageShare = parseNum(shotPlan.usageShare, 0);
    row.comfortUsageRate = parseNum(shotPlan.comfortUsageRate, 0);
    row.tpaCap = parseNum(shotPlan.tpaCap, 0);
    row.tpaCapReason = String(shotPlan.tpaCapReason || '');
    row.volumePenalty = parseNum(shotPlan.volumePenalty, 0);
    row.expectedThreePct = targetThreePct;
    row.capHit = !!shotPlan.capHit;
    row.shotDiagnostics = {
      usageShare: row.usageShare,
      comfortUsageRate: row.comfortUsageRate,
      tpaCap: row.tpaCap,
      tpaCapReason: row.tpaCapReason,
      volumePenalty: row.volumePenalty,
      expectedThreePct: row.expectedThreePct,
      actualTpa36: parseNum(shotPlan.actualTpa36, 0),
      usedPossessions: parseNum(shotPlan.usedPossessions, 0)
    };
    return row;
  }

  let fta = clamp(Math.round(targetPts * (0.08 + (rating - 60) / 280) * paintShareMult + rng(0, 1)), 0, Math.min(12, targetPts));
  let ftm = clamp(Math.round(fta * clamp(0.68 + (rating - 65) / 90, 0.65, 0.93)), 0, fta);
  let fgPts = Math.max(0, targetPts - ftm);
  let tpm = 0;
  let fgm = 0;
  const realThreePct = parseNum(simPlayer?.sourceRealStats?.TP ?? simPlayer?.sourceRealStats?.tpPct ?? simPlayer?.realStats?.TP ?? simPlayer?.historicalStats?.TP, NaN);
  const attrsForShotModel = Number.isFinite(realThreePct) && realThreePct > 0 ? { ...attrs, __realThreePct: realThreePct } : attrs;
  const targetThreePct = estimateLeagueThreePctForRow(attrsForShotModel, rating, pos, oppRating, teamCoachFx, gameMod);
  const threeProfile = leagueThreeAttemptProfileForRow(simPlayer, attrs, rating, pos, threeShareMult);

  if ((threeProfile.lowVolumeBig || threeProfile.frontcourtLimited) && (fgPts & 1) === 1) {
    if (ftm < fta) {
      ftm += 1;
      fgPts -= 1;
    } else if (ftm > 0) {
      ftm -= 1;
      fgPts += 1;
    } else {
      fgPts = Math.max(0, fgPts - 1);
    }
  }

  if (fgPts > 0) {
    const maxTpm = Math.floor(fgPts / 3);
    tpm = threeProfile.noThreeEra ? 0 : clamp(Math.round(maxTpm * 0.35), 0, maxTpm);
    if (((fgPts - tpm) & 1) === 1 && tpm > 0) tpm--;
    fgm = Math.max(tpm, Math.round((fgPts - tpm) / 2));
  }

  const varianceEfficiency = 1 - (parseNum(gameMod?.efficiencyShift, 0) * 1.8);
  const efficiencyFactor = teamPlan ? clamp((1.08 - ((parseNum(teamPlan?.efg, 0.52) - 0.52) * 0.9)) * varianceEfficiency, 0.84, 1.16) : clamp(varianceEfficiency, 0.86, 1.16);
  let fga = clamp(Math.max(fgm + rng(1, 4), Math.round(minutes * 0.42 * planPaceFactor * efficiencyFactor) + rng(-1, 3), tpm + rng(1, 3)), Math.max(fgm, tpm), 28);
  let tpa = clamp(Math.max(tpm, Math.round(fga * threeProfile.share + rng(-1, 1))), tpm, fga);
  if (tpm > 0) {
    tpa = Math.max(tpa, Math.ceil(tpm / targetThreePct));
  }
  if (threeProfile.noThreeEra) {
    tpa = 0;
    tpm = 0;
  } else if (threeProfile.lowVolumeBig || threeProfile.frontcourtLimited) {
    const lowVolumeCap = Math.max(tpm, Math.round((minutes / 36) * threeProfile.attemptsPer36 + rng(0, 0.7)));
    tpa = clamp(tpa, tpm, Math.min(fga, lowVolumeCap));
  }
  tpm = threeProfile.noThreeEra ? 0 : fitThreeMakesToAttempts(tpa, targetThreePct, fgPts, gameMod);
  fgm = Math.max(tpm, Math.round((fgPts - tpm) / 2));
  const twoMade = Math.max(0, fgm - tpm);
  fga = clamp(Math.max(fga, tpa + twoMade + rng(0, 2)), Math.max(fgm, tpa), 34);
  tpa = clamp(tpa, tpm, fga);

  row.fta = fta;
  row.ftm = ftm;
  row.fgm = fgm;
  row.fga = fga;
  row.tpm = tpm;
  row.tpa = tpa;
  row.pts = (row.fgm - row.tpm) * 2 + row.tpm * 3 + row.ftm;
  row.reb = clamp(Math.round(((minutes / 12) * (pos >= 4 ? 1.25 : 0.55) + (rating - 60) / 35) * rebMult + parseNum(systemRole?.rebMod, 0) + rng(-1, 2)), 0, pos >= 4 ? 16 : 10);
  row.ast = clamp(Math.round(((minutes / 13) * (pos <= 2 ? 1.55 : pos === 3 ? 0.95 : 0.5) + (rating - 60) / 45) * astMult + parseNum(systemRole?.astMod, 0) + rng(-1, 2)), 0, 14);
  row.stl = clamp(Math.round(((minutes / 18) * (pos <= 3 ? 0.55 : 0.35)) * stocksMult + parseNum(systemRole?.stlMod, 0) + rng(0, 1)), 0, 6);
  row.blk = clamp(Math.round(((minutes / 18) * (pos >= 4 ? 0.7 : 0.25)) * stocksMult + parseNum(systemRole?.blkMod, 0) + rng(0, 1)), 0, 6);
  row.tov = clamp(Math.round((minutes / 10) * (pos <= 2 ? 0.8 : 0.55) + (targetPts >= 20 ? 0.5 : 0.2) + rng(0, 1)), 0, 8);
  row.pf = clamp(parseNum(gameMod?.foulCount, Math.round((minutes / 11.5) * (pos >= 4 ? 1.2 : 0.95) + Math.max(0, -parseNum(gameMod?.matchupEdge, 0)) + rng(-1, 1))), 0, 6);
  row.issueTag = String(gameMod?.issueTag || '').trim();
  row.foulTrouble = !!gameMod?.foulTrouble;
  row.varianceTag = String(gameMod?.varianceTag || 'steady');
  row.gameNotes = Array.isArray(gameMod?.notes) ? [...gameMod.notes] : [];
  return row;
}

function buildTeamGameBoxScore(teamId, teamPts, oppRating, { home = false, includeUser = false, teamProfile = null, oppProfile = null, fatigueContext = null, fullStrength = false } = {}) {
  const teamPlan = teamPts && typeof teamPts === 'object' ? teamPts : null;
  const resolvedTeamPts = parseNum(teamPlan?.points, parseNum(teamPts, 0));
  const oppRatingValue = parseNum(teamPlan?.oppDefenseRating, parseNum(oppRating?.defense, parseNum(oppRating, 75)));
  const ctx = buildSimRotationContext(teamId, { includeUser });
  const team = ctx.team;
  const teamName = ctx.teamName;
  const abbr = ctx.abbr;
  const coachFx = ctx.coachFx;
  const baseRotation = ctx.rotation;
  const baseSimPlayers = ctx.simPlayers;
  const activeIndexes = fullStrength
    ? baseRotation
      .map((player, index) => ({ player, index }))
      .filter(item => item.player?.fullGameStarter || item.player?.fantasyStarter || baseRotation.length <= 5)
      .slice(0, 5)
      .map(item => item.index)
    : baseRotation.map((_, index) => index);
  const rotation = activeIndexes.map(index => baseRotation[index]);
  const simPlayers = activeIndexes.map(index => baseSimPlayers[index] || baseRotation[index]);
  const ownProfile = teamProfile || buildTeamSimulationProfile(teamId, { includeUser, home, fatigueContext });
  const enemyProfile = oppProfile || (oppRating && typeof oppRating === 'object' ? oppRating : null);
  const gameMods = fullStrength
    ? rotation.map(() => ({
      minuteMult: 1,
      usageMult: 1,
      efficiencyShift: 0,
      astMult: 1,
      rebMult: 1,
      stocksMult: 1,
      matchupEdge: 0,
      foulTrouble: false,
      foulCount: 0,
      fatigueLoad: 0,
      stamina: 100,
      varianceTag: 'steady',
      issueTag: '',
      notes: ['全力出战']
    }))
    : rotation.map((p, i) => buildSingleGamePlayerModifier(simPlayers[i] || p, {
    teamId,
    home,
    teamProfile: ownProfile,
    oppProfile: enemyProfile,
    fatigueContext: fatigueContext || ownProfile?.fatigueContext,
    baseMinutes: parseNum(p?.minutes, 18),
    coachFx
  }));
  const liveRotation = rotation.map((p, i) => ({
    ...p,
    baseMinutesRaw: parseNum(p?.minutes, 18),
    minutes: fullStrength
      ? clamp(Math.round(parseNum(p?.minutes, p?.fullGameStarter ? 48 : 18)), 0, p?.fullGameStarter ? 48 : 40)
      : clamp(Math.round(parseNum(p?.minutes, 18) * parseNum(gameMods[i]?.minuteMult, 1)), 0, 40)
  }));
  if (!fullStrength && typeof normalizeRotationMinutes === 'function') normalizeRotationMinutes(liveRotation, 240);
  if (!fullStrength) applySingleGameMinuteCaps(liveRotation, gameMods);
  const usageContext = buildTeamUsageContext(teamId, simPlayers, simPlayers);
  const shotPlans = buildTeamShotPlansForSim(liveRotation, simPlayers, {
    teamPlan,
    coachFx,
    gameMods,
    usageContext
  });
  const fallbackTargets = allocateIntegerShares(
    Math.max(0, Math.round(resolvedTeamPts)),
    shotPlans.map(plan => plan.usageWeight)
  );
  const rows = liveRotation.map((p, i) => buildPlayerGameRow(p, fallbackTargets[i] || 0, oppRatingValue, {
    teamId,
    home,
    sourcePlayer: simPlayers[i],
    coachFx,
    teamPlan,
    gameMod: gameMods[i],
    shotPlan: shotPlans[i]
  }));
  reconcileTeamRowsToTargetPoints(rows, resolvedTeamPts);

  if (teamId === parseNum(G.teamId, 0) && G.player?.injury?.active) {
    rows.push({
      teamId,
      playerId: 'USER_SELF',
      name: String(G.player.name || 'Player'),
      pos: clamp(parseNum(G.player.pos, 3), 1, 5),
      pos2: 0,
      isSelf: true,
      home,
      mins: 0,
      pts: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      pf: 0,
      tov: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
      status: 'DNP'
    });
  }

  rows.sort((a, b) => (a.status ? 1 : 0) - (b.status ? 1 : 0) || parseNum(b.pts, 0) - parseNum(a.pts, 0) || parseNum(b.mins, 0) - parseNum(a.mins, 0) || (a.isSelf ? -1 : 0) - (b.isSelf ? -1 : 0));

  const totals = rows.reduce((acc, row) => {
    if (!row.status) acc.gp++;
    acc.mins += parseNum(row.mins, 0);
    acc.pts += parseNum(row.pts, 0);
    acc.reb += parseNum(row.reb, 0);
    acc.ast += parseNum(row.ast, 0);
    acc.stl += parseNum(row.stl, 0);
    acc.blk += parseNum(row.blk, 0);
    acc.pf += parseNum(row.pf, 0);
    acc.tov += parseNum(row.tov, 0);
    acc.fgm += parseNum(row.fgm, 0);
    acc.fga += parseNum(row.fga, 0);
    acc.tpm += parseNum(row.tpm, 0);
    acc.tpa += parseNum(row.tpa, 0);
    acc.ftm += parseNum(row.ftm, 0);
    acc.fta += parseNum(row.fta, 0);
    return acc;
  }, { gp: 0, mins: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, pf: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 });

  return { teamId: parseNum(teamId, 0), team, teamName, abbr, home: !!home, teamPts: resolvedTeamPts, oppRating: oppRatingValue, boxScore: rows, rows, totals, teamPlan };
}
function buildFallbackLeagueGameDetailRows(game, side = 'home') {
  if (!game || typeof buildTeamGameBoxScore !== 'function' || typeof buildTeamSimulationProfile !== 'function') return [];
  const isHome = side !== 'away';
  const teamId = parseNum(isHome ? game.homeTeamId : game.awayTeamId, 0);
  const oppId = parseNum(isHome ? game.awayTeamId : game.homeTeamId, 0);
  const score = parseNum(isHome ? game.homeScore : game.awayScore, 0);
  if (!teamId || !oppId || score <= 0) return [];
  const userTeamId = parseNum(G?.teamId, 0);
  const teamProfile = buildTeamSimulationProfile(teamId, { includeUser: teamId === userTeamId, home: isHome });
  const oppProfile = buildTeamSimulationProfile(oppId, { includeUser: oppId === userTeamId, home: !isHome });
  const snapshot = buildTeamGameBoxScore(teamId, { points: score }, oppProfile, {
    home: isHome,
    includeUser: teamId === userTeamId,
    teamProfile,
    oppProfile
  });
  return Array.isArray(snapshot?.boxScore) ? snapshot.boxScore : [];
}
function hydrateLeagueGameDetailRows(game = null) {
  if (!game || typeof game !== 'object') return game;
  if (!Array.isArray(game.homeRows) || !game.homeRows.length) {
    game.homeRows = buildFallbackLeagueGameDetailRows(game, 'home');
  }
  if (!Array.isArray(game.awayRows) || !game.awayRows.length) {
    game.awayRows = buildFallbackLeagueGameDetailRows(game, 'away');
  }
  return game;
}
function repairLeagueGameDetailsBoxScores() {
  const details = G?.leagueSeason?.gameDetails;
  if (!Array.isArray(details) || !details.length) return 0;
  let fixed = 0;
  details.forEach(game => {
    const homeBefore = Array.isArray(game?.homeRows) ? game.homeRows.length : 0;
    const awayBefore = Array.isArray(game?.awayRows) ? game.awayRows.length : 0;
    hydrateLeagueGameDetailRows(game);
    if ((!homeBefore && game?.homeRows?.length) || (!awayBefore && game?.awayRows?.length)) fixed += 1;
  });
  return fixed;
}

function computePeriodLeadStats(homePeriods = [], awayPeriods = []) {
  let homeCum = 0;
  let awayCum = 0;
  let biggestLeadHome = 0;
  let biggestLeadAway = 0;
  let leadChanges = 0;
  let prevLeader = 0;
  const total = Math.max(homePeriods.length, awayPeriods.length);
  for (let i = 0; i < total; i++) {
    homeCum += parseNum(homePeriods[i], 0);
    awayCum += parseNum(awayPeriods[i], 0);
    const diff = homeCum - awayCum;
    const leader = diff > 0 ? 1 : (diff < 0 ? -1 : 0);
    if (leader !== 0 && prevLeader !== 0 && leader !== prevLeader) leadChanges++;
    if (leader !== 0) prevLeader = leader;
    biggestLeadHome = Math.max(biggestLeadHome, diff);
    biggestLeadAway = Math.max(biggestLeadAway, -diff);
  }
  return { biggestLeadHome, biggestLeadAway, leadChanges };
}

function injectPeriodComebackSwing(homePeriods, awayPeriods, { winnerHome = true, forceTwoSwings = false } = {}) {
  if (!Array.isArray(homePeriods) || !Array.isArray(awayPeriods) || homePeriods.length < 4 || awayPeriods.length < 4) return;
  const primaryEarly = Math.random() < 0.5 ? 0 : 1;
  const primaryLate = 3;
  const applySwing = (fromWinner, fromLoser, amount) => {
    if (amount <= 0) return;
    if (winnerHome) {
      homePeriods[fromWinner] -= amount;
      awayPeriods[fromWinner] += amount;
      homePeriods[fromLoser] += amount;
      awayPeriods[fromLoser] -= amount;
    } else {
      awayPeriods[fromWinner] -= amount;
      homePeriods[fromWinner] += amount;
      awayPeriods[fromLoser] += amount;
      homePeriods[fromLoser] -= amount;
    }
  };
  const primaryCap = Math.min(
    winnerHome ? parseNum(homePeriods[primaryEarly], 0) : parseNum(awayPeriods[primaryEarly], 0),
    winnerHome ? parseNum(awayPeriods[primaryLate], 0) : parseNum(homePeriods[primaryLate], 0)
  );
  const primarySwing = clamp(Math.min(5, Math.floor(primaryCap / 3)), 2, 5);
  applySwing(primaryEarly, primaryLate, primarySwing);

  if (!forceTwoSwings) return;
  const secondaryEarly = primaryEarly === 0 ? 1 : 0;
  const secondaryLate = 2;
  const secondaryCap = Math.min(
    winnerHome ? parseNum(homePeriods[secondaryEarly], 0) : parseNum(awayPeriods[secondaryEarly], 0),
    winnerHome ? parseNum(awayPeriods[secondaryLate], 0) : parseNum(homePeriods[secondaryLate], 0)
  );
  const secondarySwing = clamp(Math.min(3, Math.floor(secondaryCap / 4)), 1, 3);
  applySwing(secondaryEarly, secondaryLate, secondarySwing);
}

function buildGameFlow(homeSnapshot, awaySnapshot, { userTeamId = 0, homePlan = null, awayPlan = null, overtimes = 0, homeOtPeriods = null, awayOtPeriods = null } = {}) {
  const homeScore = parseNum(homeSnapshot?.teamPts, 0);
  const awayScore = parseNum(awaySnapshot?.teamPts, 0);
  const margin = Math.abs(homeScore - awayScore);
  const closeGame = margin <= 7 || parseNum(overtimes, 0) > 0;
  const winnerHome = homeScore > awayScore;
  const resolvedHomeOt = Array.isArray(homeOtPeriods) ? homeOtPeriods.slice() : [];
  const resolvedAwayOt = Array.isArray(awayOtPeriods) ? awayOtPeriods.slice() : [];
  const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
  for (let i = 0; i < parseNum(overtimes, 0); i++) labels.push(i === 0 ? 'OT' : `${i + 1}OT`);
  let regulationHomeScore = homeScore - resolvedHomeOt.reduce((sum, value) => sum + parseNum(value, 0), 0);
  let regulationAwayScore = awayScore - resolvedAwayOt.reduce((sum, value) => sum + parseNum(value, 0), 0);
  if (parseNum(overtimes, 0) <= 0) {
    regulationHomeScore = homeScore;
    regulationAwayScore = awayScore;
  }
  const homeRegWeights = [0.24, 0.25, 0.25, 0.26].map((w, i) => Math.max(0.08, w + (closeGame && i === 3 ? 0.04 : 0) + (!winnerHome && closeGame && i === 1 ? 0.015 : 0) + (winnerHome && margin >= 10 && i === 3 ? -0.02 : 0) + rng(-0.02, 0.02)));
  const awayRegWeights = [0.25, 0.24, 0.25, 0.26].map((w, i) => Math.max(0.08, w + (closeGame && i === 3 ? 0.04 : 0) + (winnerHome && closeGame && i === 1 ? 0.015 : 0) + (!winnerHome && margin >= 10 && i === 3 ? -0.02 : 0) + rng(-0.02, 0.02)));
  const homePeriods = [...allocateIntegerShares(Math.max(0, regulationHomeScore), homeRegWeights), ...resolvedHomeOt];
  const awayPeriods = [...allocateIntegerShares(Math.max(0, regulationAwayScore), awayRegWeights), ...resolvedAwayOt];
  let leadStats = computePeriodLeadStats(homePeriods, awayPeriods);
  if (closeGame && leadStats.leadChanges === 0) {
    injectPeriodComebackSwing(homePeriods, awayPeriods, { winnerHome, forceTwoSwings: margin <= 4 || parseNum(overtimes, 0) > 0 });
    leadStats = computePeriodLeadStats(homePeriods, awayPeriods);
  }
  const homePoss = clamp(parseNum(homePlan?.possessions, Math.round(92 + rng(-3, 5) + (parseNum(homeSnapshot?.totals?.fga, 0) + parseNum(awaySnapshot?.totals?.fga, 0)) * 0.12)), 84, 115);
  const awayPoss = clamp(parseNum(awayPlan?.possessions, Math.round(homePoss + rng(-2, 2))), 84, 115);
  const homeOrtg = Math.round(homeScore / Math.max(1, homePoss) * 100);
  const awayOrtg = Math.round(awayScore / Math.max(1, awayPoss) * 100);
  const homeEfg = Number.isFinite(parseNum(homePlan?.efg, NaN))
    ? Math.round(parseNum(homePlan?.efg, 0.52) * 100)
    : (homeSnapshot?.totals?.fga > 0 ? Math.round(((homeSnapshot.totals.fgm + 0.5 * homeSnapshot.totals.tpm) / homeSnapshot.totals.fga) * 100) : 0);
  const awayEfg = Number.isFinite(parseNum(awayPlan?.efg, NaN))
    ? Math.round(parseNum(awayPlan?.efg, 0.52) * 100)
    : (awaySnapshot?.totals?.fga > 0 ? Math.round(((awaySnapshot.totals.fgm + 0.5 * awaySnapshot.totals.tpm) / awaySnapshot.totals.fga) * 100) : 0);
  const homeTovRate = Math.round(parseNum(homePlan?.tovRate, parseNum(homeSnapshot?.totals?.tov, 0) / Math.max(1, homePoss)) * 100);
  const awayTovRate = Math.round(parseNum(awayPlan?.tovRate, parseNum(awaySnapshot?.totals?.tov, 0) / Math.max(1, awayPoss)) * 100);

  const biggestLeadHome = leadStats.biggestLeadHome;
  const biggestLeadAway = leadStats.biggestLeadAway;
  const leadChanges = leadStats.leadChanges;

  const summary = parseNum(overtimes, 0) > 0
    ? (winnerHome ? '双方鏖战至加时，主队在额外回合里执行更稳。' : '比赛被拖入加时，客队在加时阶段完成收割。')
    : (winnerHome
      ? (closeGame ? '双方一路拉扯到最后，主队在收官段顶住了反扑。' : '主队在下半场逐步拉开分差，最终稳住胜势。')
      : (closeGame ? '比赛一路胶着到最后，客队在关键回合里笑到最后。' : '客队在第二节后建立优势，并把领先保持到了终场。'));
  const runs = parseNum(overtimes, 0) > 0
    ? [
        winnerHome ? `${homeSnapshot.abbr || 'HOME'} 在加时前半段连拿关键分` : `${awaySnapshot.abbr || 'AWAY'} 在加时阶段抓住了每次错位`,
        '双方常规时间战成平手，末段每个回合都在换领先'
      ]
    : closeGame
      ? [
          winnerHome ? `${homeSnapshot.abbr || 'HOME'} 在第四节守住了关键球` : `${awaySnapshot.abbr || 'AWAY'} 在第四节打出反扑高潮`,
          '双方一度陷入拉锯，分差始终维持在两个回合以内'
        ]
      : [
          winnerHome ? `${homeSnapshot.abbr || 'HOME'} 在第三节打出决定比赛的攻防高潮` : `${awaySnapshot.abbr || 'AWAY'} 在第二节后半段建立两位数优势`
        ];
  const userIsHome = userTeamId && parseNum(userTeamId, 0) === parseNum(homeSnapshot?.teamId, 0);
  return {
    periodLabels: labels,
    homePeriods,
    awayPeriods,
    homeAbbr: homeSnapshot?.abbr || 'HOME',
    awayAbbr: awaySnapshot?.abbr || 'AWAY',
    homePoss,
    awayPoss,
    homeOrtg,
    awayOrtg,
    homeEfg,
    awayEfg,
    homeTovRate,
    awayTovRate,
    biggestLeadHome,
    biggestLeadAway,
    leadChanges,
    clutch: closeGame,
    clutchMargin: margin,
    summary,
    runs,
    hasOvertime: parseNum(overtimes, 0) > 0,
    overtimeCount: parseNum(overtimes, 0),
    myPeriods: userIsHome ? homePeriods : awayPeriods,
    oppPeriods: userIsHome ? awayPeriods : homePeriods,
    myAbbr: userIsHome ? homeSnapshot?.abbr || 'HOME' : awaySnapshot?.abbr || 'AWAY',
    oppAbbr: userIsHome ? awaySnapshot?.abbr || 'AWAY' : homeSnapshot?.abbr || 'HOME',
    myPoss: userIsHome ? homePoss : awayPoss,
    oppPoss: userIsHome ? awayPoss : homePoss,
    myOrtg: userIsHome ? homeOrtg : awayOrtg,
    oppOrtg: userIsHome ? awayOrtg : homeOrtg,
    myEfg: userIsHome ? homeEfg : awayEfg,
    oppEfg: userIsHome ? awayEfg : homeEfg,
    myTovRate: userIsHome ? homeTovRate : awayTovRate,
    oppTovRate: userIsHome ? awayTovRate : homeTovRate
  };
}

function simulateLeagueMatchup(homeTeamId, awayTeamId, opts = {}) {
  ensureLeagueStateShape();
  const homeId = parseNum(homeTeamId, 0);
  const awayId = parseNum(awayTeamId, 0);
  if (!homeId || !awayId || homeId === awayId) return null;

  const season = parseNum(opts.season, G.season);
  const year = parseNum(opts.year, G.year);
  const phase = String(opts.phase || 'regular').trim() || 'regular';
  const roundIndex = parseNum(opts.roundIndex, 0);
  const userTeamId = parseNum(opts.userTeamId, 0);
  const seq = (G.leagueSeason.gameDetails || []).length + 1;
  const fullStrengthOption = opts.fullStrengthTeamIds ?? opts.fullStrengthTeamId ?? opts.noFatigueTeamIds ?? opts.noFatigueTeamId;
  const homeFullStrength = teamIdInSimOption(homeId, fullStrengthOption);
  const awayFullStrength = teamIdInSimOption(awayId, fullStrengthOption);
  const homeFatigue = homeFullStrength
    ? buildNoFatigueContext({ teamId: homeId, home: true, roundIndex, phase })
    : buildScheduleFatigueContext({ teamId: homeId, home: true, roundIndex, phase, userTeamId });
  const awayFatigue = awayFullStrength
    ? buildNoFatigueContext({ teamId: awayId, home: false, roundIndex, phase })
    : buildScheduleFatigueContext({ teamId: awayId, home: false, roundIndex, phase, userTeamId });
  const homeProfile = buildTeamSimulationProfile(homeId, { includeUser: homeId === userTeamId, home: true, fatigueContext: homeFatigue });
  const awayProfile = buildTeamSimulationProfile(awayId, { includeUser: awayId === userTeamId, home: false, fatigueContext: awayFatigue });
  const simPlans = buildMatchupSimulationPlans(homeProfile, awayProfile, { phase, roundIndex, userTeamId });
  const homeSnapshot = buildTeamGameBoxScore(homeId, simPlans.homePlan, awayProfile, { home: true, includeUser: homeId === userTeamId, teamProfile: homeProfile, oppProfile: awayProfile, fatigueContext: homeFatigue, fullStrength: homeFullStrength });
  const awaySnapshot = buildTeamGameBoxScore(awayId, simPlans.awayPlan, homeProfile, { home: false, includeUser: awayId === userTeamId, teamProfile: awayProfile, oppProfile: homeProfile, fatigueContext: awayFatigue, fullStrength: awayFullStrength });
  const flow = buildGameFlow(homeSnapshot, awaySnapshot, {
    userTeamId: parseNum(opts.userTeamId, 0),
    homePlan: simPlans.homePlan,
    awayPlan: simPlans.awayPlan,
    overtimes: simPlans.overtimes,
    homeOtPeriods: simPlans.homeOtPeriods,
    awayOtPeriods: simPlans.awayOtPeriods
  });
  const homeScore = parseNum(homeSnapshot.teamPts, 0);
  const awayScore = parseNum(awaySnapshot.teamPts, 0);
  const homeWin = homeScore >= awayScore;
  const gameId = `lg_${season}_${phase}_${roundIndex}_${seq}_${homeId}_${awayId}`;

  const detail = {
    id: gameId,
    gameId,
    season,
    year,
    phase,
    round: roundIndex + 1,
    seq,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore,
    awayScore,
    homeWin,
    awayWin: !homeWin,
    homeRows: homeSnapshot.boxScore,
    awayRows: awaySnapshot.boxScore,
    homeTeam: getTeam(homeId) || {},
    awayTeam: getTeam(awayId) || {},
    homeFatigue,
    awayFatigue,
    flow,
    userGame: !!opts.userTeamId && (homeId === parseNum(opts.userTeamId, 0) || awayId === parseNum(opts.userTeamId, 0))
  };

  const records = G.leagueSeason.teamRecords || {};
  const homeRec = records[homeId] || makeTeamRecord();
  const awayRec = records[awayId] || makeTeamRecord();
  homeRec.gp += 1;
  awayRec.gp += 1;
  homeRec.pf += homeScore;
  homeRec.pa += awayScore;
  awayRec.pf += awayScore;
  awayRec.pa += homeScore;
  if (homeWin) {
    homeRec.w += 1;
    awayRec.l += 1;
  } else {
    awayRec.w += 1;
    homeRec.l += 1;
  }
  records[homeId] = homeRec;
  records[awayId] = awayRec;
  G.leagueSeason.teamRecords = records;

  const updateStats = (row) => {
    if (!row || row.status) return;
    const key = leaguePlayerKey(row.teamId, row.playerId, !!row.isSelf);
    const cur = G.leagueSeason.playerStats[key] || emptySeasonLine(row.teamId, row.playerId, row.name, row.pos, !!row.isSelf);
    cur.key = key;
    cur.teamId = parseNum(row.teamId, cur.teamId);
    cur.playerId = row.playerId;
    cur.name = String(row.name || cur.name || 'Player');
    cur.pos = parseNum(row.pos, cur.pos);
    cur.isSelf = !!row.isSelf;
    cur.yearsLeague = parseNum(row.yearsLeague, cur.yearsLeague ?? -1);
    cur.rookie = !!row.rookie;
    cur.draft = parseNum(row.draft, cur.draft || 0);
    cur.draftPick = parseNum(row.draftPick, cur.draftPick || 0);
    cur.gp = parseNum(cur.gp, 0) + 1;
    cur.mins = parseNum(cur.mins, 0) + parseNum(row.mins, 0);
    cur.pts = parseNum(cur.pts, 0) + parseNum(row.pts, 0);
    cur.reb = parseNum(cur.reb, 0) + parseNum(row.reb, 0);
    cur.ast = parseNum(cur.ast, 0) + parseNum(row.ast, 0);
    cur.stl = parseNum(cur.stl, 0) + parseNum(row.stl, 0);
    cur.blk = parseNum(cur.blk, 0) + parseNum(row.blk, 0);
    cur.tov = parseNum(cur.tov, 0) + parseNum(row.tov, 0);
    cur.fgm = parseNum(cur.fgm, 0) + parseNum(row.fgm, 0);
    cur.fga = parseNum(cur.fga, 0) + parseNum(row.fga, 0);
    cur.tpm = parseNum(cur.tpm, 0) + parseNum(row.tpm, 0);
    cur.tpa = parseNum(cur.tpa, 0) + parseNum(row.tpa, 0);
    cur.ftm = parseNum(cur.ftm, 0) + parseNum(row.ftm, 0);
    cur.fta = parseNum(cur.fta, 0) + parseNum(row.fta, 0);
    if (row.shotDiagnostics || Number.isFinite(parseNum(row.expectedThreePct, NaN))) {
      cur.shotDiagnosticGames = parseNum(cur.shotDiagnosticGames, 0) + 1;
      cur.usageShareTotal = parseNum(cur.usageShareTotal, 0) + parseNum(row.usageShare, 0);
      cur.comfortUsageRateTotal = parseNum(cur.comfortUsageRateTotal, 0) + parseNum(row.comfortUsageRate, 0);
      cur.expectedThreePctTotal = parseNum(cur.expectedThreePctTotal, 0) + parseNum(row.expectedThreePct, 0);
      cur.volumePenaltyTotal = parseNum(cur.volumePenaltyTotal, 0) + parseNum(row.volumePenalty, 0);
      cur.tpaCapTotal = parseNum(cur.tpaCapTotal, 0) + parseNum(row.tpaCap, 0);
      cur.tpaCapHits = parseNum(cur.tpaCapHits, 0) + (row.capHit ? 1 : 0);
    }
    G.leagueSeason.playerStats[key] = cur;
  };
  (homeSnapshot.boxScore || []).forEach(updateStats);
  (awaySnapshot.boxScore || []).forEach(updateStats);

  if (!G.leagueSeason.teamGameLogs[homeId]) G.leagueSeason.teamGameLogs[homeId] = [];
  if (!G.leagueSeason.teamGameLogs[awayId]) G.leagueSeason.teamGameLogs[awayId] = [];
  G.leagueSeason.teamGameLogs[homeId].push({ gameId, round: roundIndex + 1, season, year, phase, home: true, opp: awayId, win: homeWin, teamPts: homeScore, oppPts: awayScore });
  G.leagueSeason.teamGameLogs[awayId].push({ gameId, round: roundIndex + 1, season, year, phase, home: false, opp: homeId, win: !homeWin, teamPts: awayScore, oppPts: homeScore });
  G.leagueSeason.gameDetails.push(detail);
  if (roundIndex + 1 > parseNum(G.leagueSeason.round, 0)) G.leagueSeason.round = roundIndex + 1;
  G.leagueSeason.roundSchedule.push({ gameId, round: roundIndex + 1, season, year, phase, homeTeamId: homeId, awayTeamId: awayId, homeScore, awayScore });
  return detail;
}

// ============ 比赛解释器系统 ============
function ensureMatchInterpreterState() {
  if (!G.matchInterpreter || typeof G.matchInterpreter !== 'object') {
    G.matchInterpreter = { lastGame: { gameId: null, explanations: [], factors: {} } };
  }
  return G.matchInterpreter;
}

function analyzeGamePerformance(gameResult) {
  const state = ensureMatchInterpreterState();
  state.lastGame = { gameId: gameResult?.gameId, explanations: [], factors: {} };

  if (!gameResult || gameResult.injured) {
    return state.lastGame;
  }

  const stats = gameResult.st || gameResult;
  const mins = parseNum(stats?.mins, 0);
  const pts = parseNum(stats?.pts, 0);
  const pf = parseNum(stats?.pf, 0);
  const fga = parseNum(stats?.fga, 0);
  const fgm = parseNum(stats?.fgm, 0);
  const fgPct = fga > 0 ? fgm / fga : 0;

  // 1. 犯规麻烦
  if (pf >= 5 && mins < 28) {
    state.lastGame.factors.foulTrouble = { active: true, fouls: pf, minsLost: clamp(32 - mins, 0, 15), label: '犯规麻烦', severity: pf >= 6 ? 'high' : 'medium' };
    state.lastGame.explanations.push({ type: 'foulTrouble', icon: '🚨', label: '犯规麻烦', text: `本场${pf}次犯规严重限制了出场时间，仅出战${mins}分钟。`, impact: `预计损失${Math.round((32 - mins) * 0.8)}分` });
  }

  // 2. 背靠背疲劳
  const fatigueCtx = gameResult.gameEvent?.fatigueContext || null;
  if (fatigueCtx?.backToBack || parseNum(fatigueCtx?.gamesIn5Days, 0) >= 4) {
    const staminaBefore = parseNum(G.player?.stamina, 100);
    const fatiguePenalty = staminaBefore < 70 ? 15 : staminaBefore < 85 ? 8 : 0;
    if (fatiguePenalty > 0) {
      state.lastGame.factors.backToBack = { active: true, fatiguePenalty, gamesIn5Days: fatigueCtx?.gamesIn5Days || 2, label: '背靠背疲劳', severity: fatiguePenalty >= 12 ? 'high' : 'medium' };
      state.lastGame.explanations.push({ type: 'backToBack', icon: '🔋', label: '体能透支', text: fatigueCtx?.backToBack ? '背靠背第二场，体能储备不足影响了表现。' : `5天内第${fatigueCtx?.gamesIn5Days}战，累计疲劳开始显现。`, impact: `命中率约-${Math.round(fatiguePenalty)}%` });
    }
  }

  // 3. 教练体系错配
  const coachTreatment = typeof getUserCoachTreatmentProfile === 'function' ? getUserCoachTreatmentProfile(G.player) : null;
  if (coachTreatment && coachTreatment.fitScore < 50) {
    state.lastGame.factors.systemMismatch = { active: true, mismatchScore: 50 - coachTreatment.fitScore, systemId: coachTreatment.fitLabel, label: '体系错配', severity: coachTreatment.fitScore < 35 ? 'high' : 'medium' };
    state.lastGame.explanations.push({ type: 'systemMismatch', icon: '⚙️', label: '体系不适', text: `${coachTreatment.fitLabel}的战术体系与你的技术特点存在错配，球权分配受限。`, impact: `使用率约${coachTreatment.usageDelta >= 0 ? '+' : ''}${Math.round(coachTreatment.usageDelta * 100)}%` });
  }

  // 4. 教练好感度偏低
  const coachFavor = typeof getCoachFavorability === 'function' ? getCoachFavorability() : 50;
  if (coachFavor < 35 && mins < 25) {
    state.lastGame.factors.coachTrust = { active: true, favorability: coachFavor, label: '教练信任度低', severity: coachFavor < 25 ? 'high' : 'medium' };
    state.lastGame.explanations.push({ type: 'coachTrust', icon: '👔', label: '信任危机', text: `教练当前信任度仅${coachFavor}，关键时刻没有让你留在场上。`, impact: `出场时间约-${32 - mins}分钟` });
  }

  // 5. 轻伤限时
  const injury = G.player?.injury;
  if (injury?.active && mins > 0 && mins < 25) {
    state.lastGame.factors.injuryLimit = { active: true, injuryType: injury.type || '轻伤', minsCap: mins, label: '伤病保护', severity: 'medium' };
    state.lastGame.explanations.push({ type: 'injuryLimit', icon: '🩹', label: '带伤出战', text: `带${injury.type || '伤'}出战，教练执行${mins}分钟限时保护。`, impact: '状态受限，效率打折' });
  }

  // 6. 对位被压制
  if (pts < 12 && fgPct < 0.38 && fga >= 8) {
    state.lastGame.factors.matchupDominated = { active: true, label: '对位压制', severity: fgPct < 0.32 ? 'high' : 'medium' };
    state.lastGame.explanations.push({ type: 'matchupDominated', icon: '🔒', label: '被锁死', text: `对位防守让你很难找到节奏，命中率仅${(fgPct * 100).toFixed(0)}%。`, impact: '进攻效率严重下滑' });
  }

  // 7. 体力问题
  const staminaBeforeGame = parseNum(G.player?.stamina, 100) + parseNum(gameResult.staminaLoss, 0);
  if (staminaBeforeGame < 60 && mins < 28) {
    state.lastGame.factors.staminaIssue = { active: true, staminaBefore: staminaBeforeGame, label: '体力不足', severity: staminaBeforeGame < 40 ? 'high' : 'medium' };
    state.lastGame.explanations.push({ type: 'staminaIssue', icon: '😵', label: '体能报警', text: `赛前体力仅${Math.round(staminaBeforeGame)}%，无法支撑正常出场时间。`, impact: '建议赛后休息恢复' });
  }

  // 8. 球队士气影响
  const teamMorale = parseNum(G.teamMorale, 50);
  if (teamMorale < 35 && !gameResult.win) {
    state.lastGame.factors.moraleEffect = { active: true, teamMorale, label: '士气低落', severity: 'medium' };
    state.lastGame.explanations.push({ type: 'moraleEffect', icon: '😞', label: '氛围影响', text: `球队士气仅${teamMorale}，更衣室氛围影响了全队表现。`, impact: '团队配合效率下降' });
  }

  return state.lastGame;
}

function getMatchExplanationSummary() {
  const state = ensureMatchInterpreterState();
  const explanations = state.lastGame?.explanations || [];

  if (explanations.length === 0) {
    return { hasIssues: false, summary: '本场比赛表现正常，无明显异常因素。', explanations: [] };
  }

  const highSeverity = explanations.filter(e => e.severity === 'high');
  const summary = highSeverity.length > 0
    ? `主要问题：${highSeverity.map(e => e.label).join('、')}。`
    : `存在${explanations.length}个影响因素：${explanations.map(e => e.label).join('、')}。`;

  return { hasIssues: true, summary, explanations };
}

// ============ 赛季目标系统 ============
function ensureSeasonGoalsState() {
  if (!G.seasonGoals || typeof G.seasonGoals !== 'object') {
    G.seasonGoals = { active: { streaks: { doubleFigures: { active: true, current: 0, best: 0 }, over20: { active: true, current: 0, best: 0 }, winStreak: { current: 0, best: 0 } }, season: {}, milestones: {} }, completed: [], claimed: [] };
  }
  return G.seasonGoals;
}

function initializeSeasonGoals() {
  const state = ensureSeasonGoalsState();
  const rating = parseNum(G.player?.rating, 70);

  state.active.streaks = { doubleFigures: { active: true, current: 0, best: 0 }, over20: { active: true, current: 0, best: 0 }, winStreak: { current: 0, best: 0 } };
  state.active.milestones = {
    allStar: { target: rating >= 80, progress: 0, label: '入选全明星', status: rating >= 80 ? 'in_progress' : 'locked' },
    playoffs: { target: true, progress: 0, label: '带队进季后赛', status: 'in_progress' },
    mostImproved: { target: rating < 80, label: '进步最快球员', status: rating < 80 ? 'in_progress' : 'locked' }
  };
  state.completed = [];
  state.claimed = [];

  return state;
}

function updateStreakGoals(gameStats, isWin) {
  const state = ensureSeasonGoalsState();
  const streaks = state.active.streaks || { doubleFigures: { current: 0, best: 0 }, over20: { current: 0, best: 0 }, winStreak: { current: 0, best: 0 } };
  const updates = [];

  // 连续得分上双
  if (parseNum(gameStats.pts, 0) >= 10) {
    streaks.doubleFigures.current = parseNum(streaks.doubleFigures.current, 0) + 1;
    streaks.doubleFigures.best = Math.max(parseNum(streaks.doubleFigures.best, 0), streaks.doubleFigures.current);
    if (streaks.doubleFigures.current >= 10 && streaks.doubleFigures.current === streaks.doubleFigures.best) {
      updates.push({ type: 'streak', label: `连续${streaks.doubleFigures.current}场上双！`, reward: { xp: 5, fame: 1 } });
    }
  } else {
    streaks.doubleFigures.current = 0;
  }

  // 连续20+
  if (parseNum(gameStats.pts, 0) >= 20) {
    streaks.over20.current = parseNum(streaks.over20.current, 0) + 1;
    streaks.over20.best = Math.max(parseNum(streaks.over20.best, 0), streaks.over20.current);
  } else {
    streaks.over20.current = 0;
  }

  // 连胜
  if (isWin) {
    streaks.winStreak.current = parseNum(streaks.winStreak.current, 0) + 1;
    streaks.winStreak.best = Math.max(parseNum(streaks.winStreak.best, 0), streaks.winStreak.current);
  } else {
    streaks.winStreak.current = 0;
  }

  state.active.streaks = streaks;

  updates.forEach(u => {
    if (u.reward?.xp && typeof addPlayerXP === 'function') addPlayerXP(u.reward.xp);
    if (u.reward?.fame) G.player.fame = clamp(parseNum(G.player.fame, 10) + u.reward.fame, 0, 100);
  });

  return updates;
}

function getGoalsProgressView() {
  const state = ensureSeasonGoalsState();
  const stats = G.seasonStats || {};
  const gp = Math.max(1, parseNum(stats.gp, 0));

  return {
    streaks: state.active.streaks || { doubleFigures: { current: 0, best: 0 }, over20: { current: 0, best: 0 }, winStreak: { current: 0, best: 0 } },
    averages: { ppg: parseNum(stats.pts, 0) / gp, rpg: parseNum(stats.reb, 0) / gp, apg: parseNum(stats.ast, 0) / gp },
    milestones: state.active.milestones || {},
    pendingClaims: (state.completed || []).filter(g => !(state.claimed || []).includes(g.id))
  };
}

function playGame(gameNum) {
  const sched = Array.isArray(G.schedule) ? G.schedule : [];
  const idx = clamp(Math.floor(parseNum(gameNum, G.gameNum)), 0, Math.max(0, sched.length - 1));
  const game = sched[idx] || null;
  const userTeamId = parseNum(G.teamId, 0);
  const roundMatchups = ensureLeagueRoundMatchups();
  const round = roundMatchups[idx] || null;
  const roundGames = Array.isArray(round?.games) ? round.games : [];
  backfillMissingLeagueRounds(idx);
  const userGame = roundGames.find(item => item && item.isUserGame) || game || null;
  const oppTeamId = parseNum(userGame?.opp, 0) || parseNum(game?.opp, 0) || TEAMS.find(t => t.id !== userTeamId)?.id || 0;
  const userHome = userGame ? !!userGame.home : game ? !!game.home : true;
  const homeTeamId = userHome ? userTeamId : oppTeamId;
  const awayTeamId = userHome ? oppTeamId : userTeamId;
  const rivalPreview = typeof maybeQueueRivalGamePreview === 'function'
    ? maybeQueueRivalGamePreview(oppTeamId, `${parseNum(G.season, 1)}_${idx + 1}_${oppTeamId}`)
    : null;
  let detail = null;
  if (roundGames.length) {
    for (const matchup of roundGames) {
      const homeId = parseNum(matchup?.homeTeamId, 0);
      const awayId = parseNum(matchup?.awayTeamId, 0);
      if (!homeId || !awayId || homeId === awayId) continue;
      const simDetail = simulateLeagueMatchup(homeId, awayId, { roundIndex: idx, season: G.season, year: G.year, phase: 'regular', userTeamId });
      if (!simDetail) continue;
      if (matchup?.isUserGame || (homeId === homeTeamId && awayId === awayTeamId)) {
        detail = simDetail;
      }
    }
    tickLeagueInjuries();
  } else {
    detail = simulateLeagueMatchup(homeTeamId, awayTeamId, { roundIndex: idx, season: G.season, year: G.year, phase: 'regular', userTeamId });
    tickLeagueInjuries();
  }
  if (!detail) {
    detail = findLeagueGameDetail({ teamId: userTeamId, oppId: oppTeamId, round: idx + 1, season: G.season, year: G.year, phase: 'regular' });
  }
  if (!detail) return null;
  const leagueGameCount = roundGames.length || 1;

  const prevHomeScore = parseNum(detail.homeScore, 0);
  const prevAwayScore = parseNum(detail.awayScore, 0);
  let userScore = userHome ? detail.homeScore : detail.awayScore;
  let oppScore = userHome ? detail.awayScore : detail.homeScore;
  const userRows = userHome ? detail.homeRows : detail.awayRows;
  const selfRow = (userRows || []).find(r => r.isSelf && !r.status) || null;
  const injured = !!(G.player?.injury?.active && parseNum(G.player?.injury?.games, 0) > 0 && !selfRow);
  const userFatigue = userHome ? detail.homeFatigue : detail.awayFatigue;
  const selfGameNotes = Array.isArray(selfRow?.gameNotes) ? selfRow.gameNotes : [];
  const st = selfRow ? {
    mins: parseNum(selfRow.mins, 0),
    pts: parseNum(selfRow.pts, 0),
    reb: parseNum(selfRow.reb, 0),
    ast: parseNum(selfRow.ast, 0),
    stl: parseNum(selfRow.stl, 0),
    blk: parseNum(selfRow.blk, 0),
    pf: parseNum(selfRow.pf, 0),
    tov: parseNum(selfRow.tov, 0),
    fgm: parseNum(selfRow.fgm, 0),
    fga: parseNum(selfRow.fga, 0),
    tpm: parseNum(selfRow.tpm, 0),
    tpa: parseNum(selfRow.tpa, 0),
    ftm: parseNum(selfRow.ftm, 0),
    fta: parseNum(selfRow.fta, 0)
  } : { mins: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, pf: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };

  const gameKey = getCurrentGameKey({ season: G.season, gameNum: idx, opp: oppTeamId });
  const pregamePlan = typeof getPregamePlan === 'function' ? getPregamePlan(gameKey) : null;
  const pregamePlanEffect = typeof applyPregamePlanToGameStats === 'function'
    ? applyPregamePlanToGameStats(st, pregamePlan, { gameKey, season: G.season, gameNum: idx, opp: oppTeamId, home: userHome })
    : null;
  if (selfRow && pregamePlanEffect?.applied) {
    ['mins', 'pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'tov', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta'].forEach(key => {
      selfRow[key] = st[key];
    });
    const pointDelta = parseNum(pregamePlanEffect?.statDeltas?.pts, 0);
    if (pointDelta) {
      const oldUserWin = userHome ? prevHomeScore > prevAwayScore : prevAwayScore > prevHomeScore;
      userScore += pointDelta;
      if (userScore === oppScore) {
        if (oldUserWin) userScore += 1;
        else oppScore += 1;
      }
      if (userHome) {
        detail.homeScore = userScore;
        detail.awayScore = oppScore;
      } else {
        detail.awayScore = userScore;
        detail.homeScore = oppScore;
      }
      if (typeof reconcileLeagueBookScore === 'function') reconcileLeagueBookScore(detail, prevHomeScore, prevAwayScore);
    }
  }
  const played = !injured && parseNum(st.mins, 0) > 0;
  const gradeScore = calcGradeScore(st);
  const grade = gradeLetterFromScore(gradeScore);

  const result = {
    game: idx + 1,
    gameNum: idx,
    events: [],
    opp: oppTeamId,
    home: userHome,
    teamPts: userScore,
    oppPts: oppScore,
    win: userScore > oppScore,
    injured,
    pts: st.pts,
    reb: st.reb,
    ast: st.ast,
    stl: st.stl,
    blk: st.blk,
    pf: st.pf,
    tov: st.tov,
    fgm: st.fgm,
    fga: st.fga,
    tpm: st.tpm,
    tpa: st.tpa,
    ftm: st.ftm,
    fta: st.fta,
    grade,
    gradeScore,
    st,
    flow: detail.flow,
    gameId: detail.id,
    gameKey,
    pregamePlan,
    pregamePlanEffect,
    season: G.season,
    year: G.year,
    userGame: true,
    homeTeamId: detail.homeTeamId,
    awayTeamId: detail.awayTeamId,
    homeScore: detail.homeScore,
    awayScore: detail.awayScore,
    homeRows: detail.homeRows,
    awayRows: detail.awayRows,
    gameEvent: G._gameEventResult || null,
    leagueGameCount
  };
  if (rivalPreview) result.events.push(`🔥 ${rivalPreview.title}：${rivalPreview.detail}`);
  if (userFatigue?.summary) result.events.push(`🧭 赛程负荷：${userFatigue.summary}`);
  selfGameNotes.forEach(note => result.events.push(`🎯 ${note}`));

  if (played) {
    G.seasonStats.gp += 1;
    G.seasonStats.pts += st.pts;
    G.seasonStats.reb += st.reb;
    G.seasonStats.ast += st.ast;
    G.seasonStats.stl += st.stl;
    G.seasonStats.blk += st.blk;
    G.seasonStats.tov += st.tov;
    G.seasonStats.mins += st.mins;
    G.seasonStats.fgm += st.fgm;
    G.seasonStats.fga += st.fga;
    G.seasonStats.tpm += st.tpm;
    G.seasonStats.tpa += st.tpa;
    G.seasonStats.ftm += st.ftm;
    G.seasonStats.fta += st.fta;
  }
  if (result.win) G.seasonStats.wins += 1;
  else G.seasonStats.losses += 1;

  let staminaLoss = injured ? 4 : calculateUserGameStaminaLoss(st, userFatigue, selfRow || null);
  if (pregamePlanEffect?.applied) staminaLoss = clamp(staminaLoss + parseNum(pregamePlanEffect.staminaLoss, 0), 0, 30);
  G.player.stamina = clamp(parseNum(G.player.stamina, 100) - staminaLoss, 0, 100);
  result.staminaLoss = staminaLoss;
  if (played && typeof checkInjury === 'function' && !G.player?.injury?.active) {
    checkInjury({ gameContext: userFatigue, gameStats: st, gameMod: selfRow || null });
  }

  // 添加比赛带来的 XP (基础15 + 表现加成)，未出场不结算比赛经验。
  if (played) {
    const matchXp = 15 + gradeXpBonus(result.grade);
    addPlayerXP(matchXp);
    result.events.push(`🏀 比赛表现 ${result.grade}，XP+${matchXp}`);
  } else {
    result.events.push('🧊 本场未进入轮换，没有获得比赛经验。');
  }

  G.results.push(result);
  G.gameNum = idx + 1;
  updateTeamMorale(result.win);
  if (played) updateCoachFavorabilityAfterGame(result);
  if (played && typeof syncTeammateRelationsAfterGame === 'function') {
    syncTeammateRelationsAfterGame(result);
  }
  if (typeof applyRivalryAfterGame === 'function') {
    applyRivalryAfterGame(result);
  }

  // 比赛解释器分析
  if (played) {
    analyzeGamePerformance(result);
    const explanation = getMatchExplanationSummary();
    if (explanation.hasIssues) {
      result.explanation = explanation;
      result.events.push(`📊 ${explanation.summary}`);
    }
  }

  // 赛季目标检查
  if (played) {
    const streakUpdates = updateStreakGoals(st, result.win);
    if (streakUpdates.length > 0) {
      streakUpdates.forEach(u => result.events.push(`🔥 ${u.label}`));
    }
  }

  return result;
}

function buildMatchupContext(result, { limit = 3 } = {}) {
  const gameRes = result?.gameResult || result || {};
  const homeTeam = getTeam(gameRes.homeTeamId) || {};
  const awayTeam = getTeam(gameRes.awayTeamId) || {};
  const userTeamId = parseNum(G.teamId, 0);
  const userIsHome = parseNum(gameRes.homeTeamId, 0) === userTeamId;
  const trimRows = (rows) => Array.isArray(rows)
    ? rows.slice().sort((a, b) => parseNum(b.pts, 0) - parseNum(a.pts, 0) || parseNum(b.mins, 0) - parseNum(a.mins, 0)).slice(0, Math.max(1, parseNum(limit, 3)))
    : [];
  const snap = (team, rows, score, home) => ({
    teamId: parseNum(team?.id, 0),
    name: String(team?.z || team?.n || '--').trim(),
    abbr: String(team?.a || team?.abbr || '--').trim(),
    score: parseNum(score, 0),
    home: !!home,
    boxScore: trimRows(rows)
  });
  return {
    homeTeam: snap(homeTeam, gameRes.homeRows, gameRes.homeScore, true),
    awayTeam: snap(awayTeam, gameRes.awayRows, gameRes.awayScore, false),
    userTeam: snap(userIsHome ? homeTeam : awayTeam, userIsHome ? gameRes.homeRows : gameRes.awayRows, userIsHome ? gameRes.homeScore : gameRes.awayScore, userIsHome),
    opponentTeam: snap(userIsHome ? awayTeam : homeTeam, userIsHome ? gameRes.awayRows : gameRes.homeRows, userIsHome ? gameRes.awayScore : gameRes.homeScore, !userIsHome),
    flow: gameRes.flow || null
  };
}

function simulatePreDraftSeason() {
  if (!LEAGUE.loaded) return;
  console.log('[Pre-Draft] 模拟选秀前赛季...');

  // 1. 初始化联赛赛季状态（临时）
  ensureLeagueStateShape();
  const teamRecords = {};
  const playerStats = {};
  TEAMS.forEach(t => { teamRecords[t.id] = makeTeamRecord(); });
  if (LEAGUE.loaded) {
    Object.values(LEAGUE.teams).forEach(t => {
      const tid = t.meta?.id || 0;
      (t.players || []).forEach(p => {
        if (!p.injury) p.injury = { active: false, games: 0, type: "" };
        const key = leaguePlayerKey(tid, p.id, false);
        playerStats[key] = emptySeasonLine(tid, p.id, p.name, p.pos, false);
      });
    });
  }
  G.leagueSeason = { round: 0, teamRecords, playerStats, roundSchedule: [], roundMatchups: [], teamGameLogs: {}, gameDetails: [] };
  TEAMS.forEach(t => { G.leagueSeason.teamGameLogs[t.id] = []; });

  // 2. 生成NPC-only比赛配对 — 只模拟比赛数据，不做增量成长
  const teamIds = TEAMS.map(t => t.id);
  const totalRounds = getSeasonGameCount();

  for (let round = 0; round < totalRounds; round++) {
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      simulateLeagueMatchup(shuffled[i], shuffled[i + 1], { roundIndex: round, phase: 'preDraft' });
    }
    tickLeagueInjuries();
  }

  // 3. 保存NPC赛季数据到 careerHistory
  if (G.leagueSeason?.playerStats) {
    Object.values(G.leagueSeason.playerStats).forEach(ps => {
      if (ps.isSelf || !ps.playerId || ps.gp <= 0) return;
      const teamObj = LEAGUE.teams?.[ps.teamId];
      if (!teamObj) return;
      const playerObj = (teamObj.players || []).find(p => String(p.id) === String(ps.playerId));
      if (!playerObj) return;
      if (!Array.isArray(playerObj.careerHistory)) playerObj.careerHistory = [];
      const ngp = Math.max(ps.gp, 1);
      playerObj.careerHistory.push({
        season: 0, year: G.year, team: ps.teamId, gp: ps.gp,
        ppg: +(ps.pts / ngp).toFixed(1), apg: +(ps.ast / ngp).toFixed(1), rpg: +(ps.reb / ngp).toFixed(1),
        spg: +(ps.stl / ngp).toFixed(1), bpg: +(ps.blk / ngp).toFixed(1),
        fgPct: ps.fga > 0 ? +(ps.fgm / ps.fga * 100).toFixed(1) : 0,
        tpPct: ps.tpa > 0 ? +(ps.tpm / ps.tpa * 100).toFixed(1) : 0,
        ftPct: ps.fta > 0 ? +(ps.ftm / ps.fta * 100).toFixed(1) : 0
      });
    });
  }

  // 4. 直接对每个NPC球员应用完整赛季成长（属性+年龄+1）
  Object.values(LEAGUE.teams).forEach(t => {
    const coach = t.coach || null;
    (t.players || []).forEach(p => {
      applyNpcSeasonDevelopment(p, coach);
      delete p._seasonDevApplied; // 清理标志，不影响后续赛季
    });
    t.rotation = toRotation(t.players);
    t.strength = calcTeamStrength(t);
  });

  // 5. 年份递增（选秀年已过）
  G.year++;

  // 6. 清理伤病，准备下赛季
  Object.values(LEAGUE.teams).forEach(t => {
    (t.players || []).forEach(p => {
      if (p.injury) { p.injury.active = false; p.injury.games = 0; }
    });
  });

  console.log(`[Pre-Draft] 选秀前赛季模拟完成，年份推进到 ${G.year}`);
}

// ============ 士气系统 ============
function updateTeamMorale(win) {
  // 更新连胜/连败
  if (win) G.winStreak = G.winStreak > 0 ? G.winStreak + 1 : 1;
  else G.winStreak = G.winStreak < 0 ? G.winStreak - 1 : -1;
  const streak = G.winStreak;
  const abs = Math.abs(streak);
  // 基础：赢+2 输-2，连胜/连败额外加成（上限±4）
  let delta = win ? 2 : -2;
  delta += (win ? 1 : -1) * Math.min(abs - 1, 4);
  // 信任拉动
  delta += (parseNum(G.player.trust, 50) - 50) * 0.04;
  // 自然回归50
  const cur = parseNum(G.teamMorale, 50);
  delta -= (cur - 50) * 0.05;
  G.teamMorale = clamp(Math.round(cur + delta), 0, 100);
}
function getMoraleMult() {
  return 1 + (parseNum(G.teamMorale, 50) - 50) * 0.001;
}

function getSeasonGameCount() {
  const scheduled = Array.isArray(G.schedule) && G.schedule.length ? G.schedule.length : 0;
  const leagueRounds = Array.isArray(G.leagueSeason?.roundMatchups) ? G.leagueSeason.roundMatchups.length : 0;
  const total = parseNum(G.totalGames, scheduled || leagueRounds || 82);
  return Math.max(1, Math.floor(total));
}

function shuffleTeamIds(teamIds = []) {
  const out = Array.isArray(teamIds) ? [...teamIds] : [];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildLeagueRoundMatchups(userSchedule = [], userTeamId = G.teamId) {
  const tid = parseNum(userTeamId, 0);
  const allTeamIds = TEAMS.map(t => parseNum(t.id, 0)).filter(id => id > 0);
  const opponentIds = allTeamIds.filter(id => id !== tid);
  if (!tid || !Array.isArray(userSchedule) || !userSchedule.length || !opponentIds.length) return [];

  return userSchedule.map((game, idx) => {
    const rawOpp = parseNum(game?.opp, 0);
    const oppId = opponentIds.includes(rawOpp) ? rawOpp : opponentIds[idx % opponentIds.length];
    const userHome = !!game?.home;
    const userGame = {
      seq: 1,
      isUserGame: true,
      homeTeamId: userHome ? tid : oppId,
      awayTeamId: userHome ? oppId : tid,
      home: userHome,
      opp: oppId
    };
    const roundGames = [userGame];
    const restTeamIds = shuffleTeamIds(opponentIds.filter(id => id !== oppId));
    for (let i = 0; i + 1 < restTeamIds.length; i += 2) {
      const a = restTeamIds[i];
      const b = restTeamIds[i + 1];
      const homeFirst = rng(0, 1) === 1;
      roundGames.push({
        seq: roundGames.length + 1,
        isUserGame: false,
        homeTeamId: homeFirst ? a : b,
        awayTeamId: homeFirst ? b : a,
        home: homeFirst
      });
    }
    return { round: idx + 1, userGame, games: roundGames };
  });
}

function ensureLeagueRoundMatchups() {
  ensureLeagueStateShape();
  const sched = Array.isArray(G.schedule) ? G.schedule : [];
  if (!sched.length) {
    G.leagueSeason.roundMatchups = [];
    return G.leagueSeason.roundMatchups;
  }
  const current = Array.isArray(G.leagueSeason.roundMatchups) ? G.leagueSeason.roundMatchups : [];
  if (current.length === sched.length) return current;
  G.leagueSeason.roundMatchups = buildLeagueRoundMatchups(sched, G.teamId);
  return G.leagueSeason.roundMatchups;
}

function backfillMissingLeagueRounds(targetRound = G.gameNum) {
  ensureLeagueStateShape();
  const roundMatchups = ensureLeagueRoundMatchups();
  if (!roundMatchups.length) return 0;

  const limit = clamp(Math.floor(parseNum(targetRound, 0)), 0, roundMatchups.length);
  const start = clamp(Math.floor(parseNum(G.leagueSeason._backfilledUpTo, 0)), 0, limit);
  if (start >= limit) return 0;

  const userTeamId = parseNum(G.teamId, 0);
  let simulated = 0;
  for (let roundIndex = start; roundIndex < limit; roundIndex++) {
    const round = roundMatchups[roundIndex];
    if (!round || !Array.isArray(round.games)) continue;
    for (const matchup of round.games) {
      if (!matchup || matchup.isUserGame) continue;
      const homeId = parseNum(matchup?.homeTeamId, 0);
      const awayId = parseNum(matchup?.awayTeamId, 0);
      if (!homeId || !awayId || homeId === awayId) continue;
      const exists = findLeagueGameDetail({ teamId: homeId, oppId: awayId, round: roundIndex + 1, season: G.season, year: G.year, phase: 'regular' });
      if (exists) continue;
      simulateLeagueMatchup(homeId, awayId, { roundIndex, season: G.season, year: G.year, phase: 'regular', userTeamId });
      simulated++;
    }
    tickLeagueInjuries();
  }
  G.leagueSeason._backfilledUpTo = limit;
  return simulated;
}

function generateSchedule() {
  G.schedule = []; G.results = []; G.gameNum = 0;
  G.dayNum = 0;
  G.gameDays = [];
  G._latestDayResult = null;
  G.teamMorale = 50; G.winStreak = 0;
  // Reset playoffs & all-star state for new season
  G.playoffs = defaultPlayoffState();
  if (!G.allStar || typeof G.allStar !== 'object') G.allStar = {};
  G.allStar.held = false; G.allStar.mvp = null; G.allStar.userSelected = false;
  if (G.social && typeof G.social === 'object') {
    G.social.lastGeneratedDay = -1;
    G.social.pendingRequiredDay = -1;
  }
  G.seasonStats = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, mins: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, gp: 0, wins: 0, losses: 0 };
  const others = TEAMS.filter(t => t.id !== G.teamId);
  let sched = [];
  others.forEach(t => {
    sched.push({ opp: t.id, home: true });
    sched.push({ opp: t.id, home: false });
    if (t.c === G.team.c) sched.push({ opp: t.id, home: Math.random() > 0.5 });
  });
  const totalGames = getSeasonGameCount();
  while (sched.length < totalGames) sched.push({ opp: others[rng(0, others.length - 1)].id, home: Math.random() > 0.5 });
  sched = sched.slice(0, totalGames);
  for (let i = sched.length - 1; i > 0; i--) { const j = rng(0, i);[sched[i], sched[j]] = [sched[j], sched[i]]; }
  G.schedule = sched; G.totalGames = totalGames;
  initLeagueSeasonState();
  G.leagueSeason.roundMatchups = buildLeagueRoundMatchups(G.schedule, G.teamId);
}

function makeTeamRecord() {
  return { gp: 0, w: 0, l: 0, pf: 0, pa: 0 };
}
function getLeagueTeamRecordsArray() {
  ensureLeagueStateShape();
  const records = G.leagueSeason?.teamRecords || {};
  return TEAMS.map(team => {
    const raw = records[team.id] && typeof records[team.id] === 'object' ? records[team.id] : {};
    const gp = Math.max(0, Math.floor(parseNum(raw.gp, 0)));
    const w = Math.max(0, Math.floor(parseNum(raw.w, 0)));
    const l = Math.max(0, Math.floor(parseNum(raw.l, 0)));
    const pf = Math.max(0, parseNum(raw.pf, 0));
    const pa = Math.max(0, parseNum(raw.pa, 0));
    return {
      id: team.id,
      teamId: team.id,
      team,
      z: team.z,
      n: team.n,
      a: team.a,
      c: team.c,
      gp,
      w,
      l,
      pf,
      pa,
      pct: gp > 0 ? +(w / gp).toFixed(3) : 0,
      ...raw
    };
  });
}
function getLeaguePlayerSeasonRows() {
  ensureLeagueStateShape();
  const stats = G.leagueSeason?.playerStats || {};
  return Object.entries(stats).map(([key, raw]) => {
    const ps = raw && typeof raw === 'object' ? raw : {};
    const gp = Math.max(0, Math.floor(parseNum(ps.gp, 0)));
    const pts = parseNum(ps.pts, 0);
    const reb = parseNum(ps.reb, 0);
    const ast = parseNum(ps.ast, 0);
    const stl = parseNum(ps.stl, 0);
    const blk = parseNum(ps.blk, 0);
    const tov = parseNum(ps.tov, 0);
    const fgm = parseNum(ps.fgm, 0);
    const fga = parseNum(ps.fga, 0);
    const tpm = parseNum(ps.tpm, 0);
    const tpa = parseNum(ps.tpa, 0);
    const ftm = parseNum(ps.ftm, 0);
    const fta = parseNum(ps.fta, 0);
    const row = {
      key: String(ps.key || key),
      teamId: parseNum(ps.teamId, 0),
      playerId: ps.playerId != null ? ps.playerId : 0,
      name: String(ps.name || 'Player'),
      pos: parseNum(ps.pos, 3),
      isSelf: !!ps.isSelf,
      yearsLeague: parseNum(ps.yearsLeague, -1),
      rookie: !!ps.rookie,
      draft: parseNum(ps.draft, 0),
      draftPick: parseNum(ps.draftPick, 0),
      rating: parseNum(ps.rating, 70),
      gp,
      pts,
      reb,
      ast,
      stl,
      blk,
      tov,
      fgm,
      fga,
      tpm,
      tpa,
      ftm,
      fta
    };
    row.ppg = gp > 0 ? +(pts / gp).toFixed(1) : 0;
    row.rpg = gp > 0 ? +(reb / gp).toFixed(1) : 0;
    row.apg = gp > 0 ? +(ast / gp).toFixed(1) : 0;
    row.spg = gp > 0 ? +(stl / gp).toFixed(1) : 0;
    row.bpg = gp > 0 ? +(blk / gp).toFixed(1) : 0;
    row.fgPct = fga > 0 ? +(fgm / fga * 100).toFixed(1) : 0;
    row.tpPct = tpa > 0 ? +(tpm / tpa * 100).toFixed(1) : 0;
    row.ftPct = fta > 0 ? +(ftm / fta * 100).toFixed(1) : 0;
    return row;
  });
}
function getRookieLeaderboard() {
  const allRows = getLeaguePlayerSeasonRows().filter(r => parseNum(r.gp, 0) > 0);
  // Collect rookie player IDs from league teams
  const rookieIds = new Set();
  if (LEAGUE.loaded && LEAGUE.teams) {
    Object.values(LEAGUE.teams).forEach(t => {
      (t.players || []).forEach(p => {
        if (parseNum(p.yearsLeague, 0) === 0) rookieIds.add(String(p.id));
      });
    });
  }
  // User is a rookie in season 1
  const userIsRookie = parseNum(G.player?.yearsLeague, 0) === 0 || !!G.player?.rookie;
  return allRows.filter(r => {
    if (r.isSelf) return userIsRookie;
    return rookieIds.has(String(r.playerId));
  });
}
function rookieContractByPick(pickNo) {
  const pick = clamp(Math.floor(parseNum(pickNo, 1)), 1, 60);
  if (pick <= 30) {
    const t = (pick - 1) / 29;
    const salary = 12 - (t * 8.5);
    const years = pick <= 14 ? 4 : (pick <= 26 ? 3 : 2);
    return { pick, salary: +salary.toFixed(2), years };
  }
  const t = (pick - 31) / 29;
  const salary = 2.8 - (t * 1.6);
  const years = pick <= 45 ? 2 : 1;
  return { pick, salary: +Math.max(0.85, salary).toFixed(2), years };
}
function calcPlayerTradeValue(player = G.player) {
  const attrs = player?.attrs || {};
  const rating = parseNum(player?.rating, typeof ovr === 'function' ? ovr(attrs) : 50);
  const potential = parseNum(player?.potential, rating);
  const fame = parseNum(player?.fame, 0);
  const trust = parseNum(player?.trust, 50);
  const salary = parseNum(player?.salary, 0);
  const years = parseNum(player?.contractYears, 0);
  let value = 20 + rating * 0.62 + potential * 0.18 + fame * 0.12 + (trust - 50) * 0.08 + years * 1.8 - salary * 0.35;
  if (years <= 1) value += 4;
  if (player?.isSelf) value += 4;
  return clamp(Math.round(value), 1, 99);
}
function recalcPlayerTradeValue() {
  if (!G.player || typeof G.player !== 'object') return 0;
  G.player.tradeValue = calcPlayerTradeValue(G.player);
  return G.player.tradeValue;
}
function buildTradeAssetFromPlayer(player = {}) {
  return {
    id: player.id,
    name: String(player.name || '球员'),
    pos: parseNum(player.pos, 3),
    pos2: parseNum(player.pos2, 0),
    rating: parseNum(player.rating, typeof ovr === 'function' ? ovr(player.attrs || {}) : 70),
    potential: parseNum(player.potential, parseNum(player.rating, 70)),
    salary: normalizeSalaryMillion(parseNum(player.salary, 0)),
    value: calcPlayerTradeValue(player)
  };
}
function evaluateTeamNeedForPosition(teamId, pos) {
  const rotation = typeof buildDynamicTeamRotation === 'function'
    ? buildDynamicTeamRotation(parseNum(teamId, 0), { includeUser: false })
    : [];
  const samePos = rotation
    .filter(p => parseNum(p?.pos, 0) === parseNum(pos, 0) || parseNum(p?.pos2, 0) === parseNum(pos, 0))
    .sort((a, b) => parseNum(b?.rating, 0) - parseNum(a?.rating, 0));
  const bestRating = parseNum(samePos[0]?.rating, 62);
  const depth = samePos.length;
  const needScore = clamp((74 - bestRating) / 18 + (depth <= 1 ? 0.35 : depth === 2 ? 0.14 : 0), -0.18, 0.92);
  return { bestRating, depth, needScore };
}
function getUserTradePressureProfile() {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  const favor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
  const treatment = coach && typeof getUserCoachTreatmentProfile === 'function' ? getUserCoachTreatmentProfile(G.player, coach) : null;
  const records = typeof getLeagueTeamRecordsArray === 'function' ? getLeagueTeamRecordsArray() : [];
  const record = records.find(r => parseNum(r.teamId, 0) === parseNum(G.teamId, 0)) || {};
  const pct = clamp(parseNum(record?.pct, 0.5), 0, 1);
  const favorBoost = clamp((52 - favor) / 70, 0, 0.42);
  const treatmentBoost = clamp(Math.max(0, -parseNum(treatment?.leverage, 0)) / 120, 0, 0.22);
  const teamBoost = clamp((0.44 - pct) / 0.55, 0, 0.12);
  const pressure = clamp(0.08 + favorBoost + treatmentBoost + teamBoost, 0.08, 0.72);
  return {
    favor,
    treatment,
    pct,
    pressure,
    valueDiscount: clamp(pressure * 0.22, 0.02, 0.18),
    acceptBonus: clamp(pressure * 0.26, 0.02, 0.22)
  };
}
function buildTradePackagesForTeam(teamId, targetValue, desiredSalary = normalizeSalaryMillion(G.player.salary)) {
  const assets = (typeof getTeamPlayers === 'function' ? getTeamPlayers(parseNum(teamId, 0)) : [])
    .filter(p => !p?.injury?.active)
    .map(buildTradeAssetFromPlayer)
    .sort((a, b) => Math.abs(parseNum(a.value, 0) - targetValue) - Math.abs(parseNum(b.value, 0) - targetValue) || parseNum(b.rating, 0) - parseNum(a.rating, 0))
    .slice(0, 8);
  const packages = [];
  assets.forEach(a => {
    packages.push({ players: [a], totalValue: parseNum(a.value, 0), totalSalary: normalizeSalaryMillion(a.salary) });
  });
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      packages.push({
        players: [assets[i], assets[j]],
        totalValue: parseNum(assets[i].value, 0) + parseNum(assets[j].value, 0),
        totalSalary: normalizeSalaryMillion(assets[i].salary) + normalizeSalaryMillion(assets[j].salary)
      });
    }
  }
  packages.forEach(pkg => {
    const posNeed = pkg.players.reduce((sum, asset) => sum + evaluateTeamNeedForPosition(parseNum(teamId, 0), asset.pos).needScore, 0);
    pkg.score = Math.abs(pkg.totalValue - targetValue) + Math.abs(pkg.totalSalary - desiredSalary) * 2.2 + (pkg.players.length - 1) * 3 - posNeed * 6;
  });
  packages.sort((a, b) => parseNum(a.score, 999) - parseNum(b.score, 999));
  return packages;
}
function buildUserTradeProposal(targetId) {
  const teamId = parseNum(targetId, 0);
  const team = typeof getTeam === 'function' ? getTeam(teamId) : null;
  if (!team || teamId === parseNum(G.teamId, 0)) return null;
  const myValue = recalcPlayerTradeValue();
  const pressure = getUserTradePressureProfile();
  const need = evaluateTeamNeedForPosition(teamId, parseNum(G.player.pos, 3));
  const targetValue = clamp(Math.round(myValue * (1 - pressure.valueDiscount) + need.needScore * 10), 18, 99);
  const packages = buildTradePackagesForTeam(teamId, targetValue);
  if (!packages.length) return null;
  const selected = packages[0];
  const capRoom = getSalaryCap() * 1.18 - teamPayrollMillion(teamId);
  const valueFit = clamp(1 - Math.abs(parseNum(selected.totalValue, 0) - targetValue) / 38, 0, 1);
  const capPenalty = parseNum(selected.totalSalary, 0) > capRoom ? 0.08 : 0;
  const acceptChance = clamp(0.24 + valueFit * 0.34 + need.needScore * 0.16 + pressure.acceptBonus - capPenalty + (selected.players.length === 1 ? 0.04 : 0), 0.08, 0.92);
  const valueRange = { min: Math.max(1, Math.round(targetValue - 10)), max: Math.round(targetValue + 14) };
  return {
    team,
    outgoing: [{
      id: 'USER_SELF',
      name: String(G.player.name || '球员'),
      pos: parseNum(G.player.pos, 3),
      pos2: 0,
      rating: typeof ovr === 'function' ? ovr(G.player.attrs || {}) : parseNum(G.player.tradeValue, 50),
      potential: parseNum(G.player.potential, 80),
      salary: normalizeSalaryMillion(parseNum(G.player.salary, 0)),
      value: myValue,
      isUser: true
    }],
    incoming: selected.players,
    outgoingValue: myValue,
    incomingValue: parseNum(selected.totalValue, 0),
    outgoingSalary: normalizeSalaryMillion(parseNum(G.player.salary, 0)),
    incomingSalary: parseNum(selected.totalSalary, 0),
    acceptChance,
    valueRange,
    leverage: pressure,
    need
  };
}
function executeUserTradeRequest(req) {
  const teamId = parseNum(req?.team?.id, 0);
  if (G.dayNum > G.tradeDeadline) return { ok: false, reason: 'deadline' };
  if (!teamId || teamId === parseNum(G.teamId, 0)) return { ok: false, reason: 'same_team' };
  const chance = clamp(parseNum(req?.acceptChance, 0.5), 0.05, 0.95);
  if (Math.random() > chance) return { ok: false, reason: 'rejected', chance };
  const oldTeamId = parseNum(G.teamId, 0);
  const oldTeam = typeof getTeam === 'function' ? getTeam(oldTeamId) : null;
  const newTeam = typeof getTeam === 'function' ? getTeam(teamId) : req.team || null;
  const oldTeamObj = LEAGUE.teams?.[oldTeamId] || null;
  const newTeamObj = LEAGUE.teams?.[teamId] || null;
  const incomingIds = new Set((Array.isArray(req?.incoming) ? req.incoming : []).map(p => String(p?.id || '')));
  if (oldTeamObj && newTeamObj && incomingIds.size) {
    const moved = [];
    newTeamObj.players = (newTeamObj.players || []).filter(player => {
      const keep = !incomingIds.has(String(player?.id || ''));
      if (!keep) moved.push(player);
      return keep;
    });
    oldTeamObj.players = [...(oldTeamObj.players || []), ...moved];
    oldTeamObj.rotation = typeof toRotation === 'function' ? toRotation(oldTeamObj.players) : oldTeamObj.rotation;
    newTeamObj.rotation = typeof toRotation === 'function' ? toRotation(newTeamObj.players) : newTeamObj.rotation;
    if (typeof calcTeamStrength === 'function') {
      oldTeamObj.strength = calcTeamStrength(oldTeamObj);
      newTeamObj.strength = calcTeamStrength(newTeamObj);
    }
  }
  G.teamId = teamId;
  G.team = newTeam;
  if (!Array.isArray(G.player.teamsPlayed)) G.player.teamsPlayed = [];
  if (!G.player.teamsPlayed.includes(teamId)) G.player.teamsPlayed.push(teamId);
  if (oldTeamId !== teamId) G.nomadCount = Math.max(0, parseNum(G.nomadCount, 0)) + 1;
  if (typeof ensureCoachDynamicsState === 'function') {
    const dynamics = ensureCoachDynamicsState();
    dynamics.directives.usageDemandUntilDay = -1;
    dynamics.directives.startingDemandUntilDay = -1;
    dynamics.directives.buyInUntilDay = -1;
  }
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  G._currentRotation = null;
  G._rotationGame = -1;
  G._rotationTeam = -1;
  addNews(`🔄 交易达成：${G.player.name} 从${oldTeam?.z || '原球队'}转投${newTeam?.z || '新球队'}。`, 'neu');
  addPhone('经纪人', `交易完成，你已经被送往 ${newTeam?.z || '新球队'}。准备和新的教练组重新建立关系。`, 'info');
  return { ok: true, team: newTeam };
}
function buildUserFreeAgencyProfile() {
  const overall = typeof ovr === 'function' ? ovr(G.player.attrs || {}) : parseNum(G.player.tradeValue, 50);
  const gp = Math.max(parseNum(G.seasonStats?.gp, 0), 1);
  const ppg = +(parseNum(G.seasonStats?.pts, 0) / gp).toFixed(1);
  const apg = +(parseNum(G.seasonStats?.ast, 0) / gp).toFixed(1);
  const rpg = +(parseNum(G.seasonStats?.reb, 0) / gp).toFixed(1);
  const age = parseNum(G.player.age, 24);
  const fame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const trust = clamp(parseNum(G.player.trust, 50), 0, 100);
  const baseSalary = clamp(1.2 + overall * 0.22 + ppg * 0.16 + apg * 0.09 + rpg * 0.05 + fame * 0.02 + trust * 0.01, 1.2, 42);
  return { overall, ppg, apg, rpg, age, fame, trust, baseSalary };
}
function evaluateUserOfferForTeam(teamId, profile) {
  const team = typeof getTeam === 'function' ? getTeam(teamId) : null;
  if (!team) return null;
  const need = evaluateTeamNeedForPosition(teamId, parseNum(G.player.pos, 3));
  const capRoom = getSalaryCap() * 1.18 - teamPayrollMillion(teamId);
  if (capRoom <= 0.8) return null;
  const strength = typeof getTeamStrength === 'function' ? getTeamStrength(teamId) : 75;
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(teamId) : null;
  const fitScore = coach && typeof getCoachPlayerSystemFit === 'function' ? getCoachPlayerSystemFit(G.player, coach).fitScore : 55;
  let interest = 0.22 + need.needScore * 0.30 + (profile.overall - 72) / 85 + (profile.ppg - 12) / 75 + capRoom / 180 - strength / 420;
  let years = clamp(profile.age <= 26 ? 4 : (profile.age <= 30 ? 3 : 2), 1, 4);
  let salary = clamp(profile.baseSalary * (0.80 + interest * 0.45), 1.2, Math.max(1.5, capRoom - 0.4));
  let renewalInterest = null;
  if (teamId === parseNum(G.teamId, 0)) {
    const favor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
    const treatment = coach && typeof getUserCoachTreatmentProfile === 'function' ? getUserCoachTreatmentProfile(G.player, coach) : null;
    renewalInterest = clamp(0.18 + (favor - 25) / 90 + (fitScore - 45) / 90 + (profile.overall - 70) / 85 + (profile.ppg - 10) / 120, 0, 1);
    if (renewalInterest < 0.33) return null;
    salary = clamp(profile.baseSalary * (0.92 + renewalInterest * 0.20), 1.2, Math.max(1.5, capRoom - 0.2));
    years = renewalInterest >= 0.72 ? Math.max(years, 3) : (renewalInterest >= 0.5 ? Math.max(2, years - 1) : 1);
    interest += renewalInterest * 0.22 + parseNum(treatment?.leverage, 0) / 180;
  } else if (interest < 0.28) {
    return null;
  }
  return {
    team,
    years,
    salary: +salary.toFixed(2),
    current: teamId === parseNum(G.teamId, 0),
    interest: clamp(interest, 0, 1),
    renewalInterest,
    fitScore,
    need
  };
}
function freeAgency() {
  const profile = buildUserFreeAgencyProfile();
  return (TEAMS || [])
    .map(team => evaluateUserOfferForTeam(parseNum(team?.id, 0), profile))
    .filter(Boolean)
    .sort((a, b) => parseNum(b.salary, 0) - parseNum(a.salary, 0) || parseNum(b.interest, 0) - parseNum(a.interest, 0))
    .slice(0, 6);
}
function signContract(teamId, salary, years) {
  const tid = parseNum(teamId, 0);
  const oldTeamId = parseNum(G.teamId, 0);
  G.teamId = tid;
  G.team = typeof getTeam === 'function' ? getTeam(tid) : G.team;
  G.player.salary = normalizeSalaryMillion(parseNum(salary, 0));
  G.player.contractYears = Math.max(1, Math.round(parseNum(years, 1)));
  if (!Array.isArray(G.player.teamsPlayed)) G.player.teamsPlayed = [];
  if (!G.player.teamsPlayed.includes(tid)) G.player.teamsPlayed.push(tid);
  if (oldTeamId !== tid) G.nomadCount = Math.max(0, parseNum(G.nomadCount, 0)) + 1;
  if (typeof ensureCoachDynamicsState === 'function') {
    const dynamics = ensureCoachDynamicsState();
    dynamics.directives.usageDemandUntilDay = -1;
    dynamics.directives.startingDemandUntilDay = -1;
    dynamics.directives.buyInUntilDay = -1;
  }
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  G._currentRotation = null;
  G._rotationGame = -1;
  G._rotationTeam = -1;
  addNews(`📝 ${G.player.name} 与${G.team?.z || '球队'}签下 ${G.player.contractYears} 年合同。`, 'pos');
  addPhone('经纪人', `合同敲定：${G.team?.z || '球队'} ${G.player.contractYears}年 $${formatSalaryMillion(G.player.salary)}M/年。`, 'info');
}
function checkPlayerRenewal() {
  if (parseNum(G.player?.contractYears, 0) > 1) return false;
  if (parseNum(G.dayNum, 0) < parseNum(G.renewalDeadline, 160) - 8) return false;
  if (typeof ensureCoachDynamicsState !== 'function') return false;
  const dynamics = ensureCoachDynamicsState();
  if (parseNum(dynamics.lastRenewalBriefSeason, 0) === parseNum(G.season, 1)) return false;
  dynamics.lastRenewalBriefSeason = parseNum(G.season, 1);
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  const favor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
  const treatment = coach && typeof getUserCoachTreatmentProfile === 'function' ? getUserCoachTreatmentProfile(G.player, coach) : null;
  const fitScore = parseNum(treatment?.fitScore, 55);
  const cold = favor < 35 || parseNum(treatment?.leverage, 0) < -10;
  const text = cold
    ? `当前球队的续约态度偏冷。教练好感度 ${favor}，体系契合 ${fitScore}，管理层更倾向让你去试水市场。`
    : `当前球队仍保留续约兴趣。教练好感度 ${favor}，体系契合 ${fitScore}，只要赛季后段不失控，留队仍有空间。`;
  addPhone('经纪人', text, cold ? 'warn' : 'info');
  if (cold) addNews(`📉 ${G.player.name} 与当前教练组关系偏冷，外界认为他的续约前景正在下滑。`, 'neg');
  return true;
}
function tryAIRenewal() {
  return false;
}
const GENERATED_COACH_FIRST_NAMES = ['Mike', 'Chris', 'David', 'James', 'Mark', 'Alex', 'Nate', 'Will', 'Sam', 'Ryan'];
const GENERATED_COACH_LAST_NAMES = ['Carter', 'Brooks', 'Lawson', 'Foster', 'Graham', 'Sullivan', 'Harper', 'Bailey', 'Murray', 'Reed'];
function buildTeamCoachStyleProfile(teamId) {
  const tid = parseNum(teamId, 0);
  const roster = [];
  if (tid > 0 && tid === parseNum(G.teamId, 0) && typeof createUserRosterSnapshot === 'function') {
    roster.push(createUserRosterSnapshot());
  }
  roster.push(...(typeof getTeamPlayers === 'function' ? getTeamPlayers(tid) : []));
  const core = roster
    .slice()
    .sort((a, b) => parseNum(b?.rating, 0) - parseNum(a?.rating, 0))
    .slice(0, 8);
  if (!core.length) {
    return { perimeter: 60, interior: 60, defense: 60, pace: 60, playmaking: 60, rebounding: 60 };
  }
  const sums = core.reduce((acc, player) => {
    const attrs = player?.attrs || {};
    acc.perimeter += parseNum(attrs.shotExt, 55) * (parseNum(player?.pos, 3) <= 3 ? 1.1 : 0.85);
    acc.interior += parseNum(attrs.shotInt, 55) * (parseNum(player?.pos, 3) >= 4 ? 1.1 : 0.9);
    acc.defense += (parseNum(attrs.stl, 55) + parseNum(attrs.blk, 55) + parseNum(player?.def, parseNum(player?.rating, 55))) / 3;
    acc.pace += (parseNum(attrs.speed, 55) + parseNum(attrs.pass, 55)) / 2;
    acc.playmaking += parseNum(attrs.pass, 55) * (parseNum(player?.pos, 3) <= 3 ? 1.08 : 0.95);
    acc.rebounding += parseNum(attrs.reb, 55) * (parseNum(player?.pos, 3) >= 4 ? 1.15 : 0.85);
    return acc;
  }, { perimeter: 0, interior: 0, defense: 0, pace: 0, playmaking: 0, rebounding: 0 });
  const count = core.length || 1;
  return {
    perimeter: +(sums.perimeter / count).toFixed(1),
    interior: +(sums.interior / count).toFixed(1),
    defense: +(sums.defense / count).toFixed(1),
    pace: +(sums.pace / count).toFixed(1),
    playmaking: +(sums.playmaking / count).toFixed(1),
    rebounding: +(sums.rebounding / count).toFixed(1)
  };
}
function pickCoachSystemForTeam(teamId, fallbackSystemId = 'balance') {
  const style = buildTeamCoachStyleProfile(teamId);
  const scores = {
    balance: 52 + Math.min(style.perimeter, style.interior) * 0.12 + style.playmaking * 0.1,
    defense: 42 + style.defense * 0.55 + style.rebounding * 0.22,
    grit: 36 + style.interior * 0.28 + style.rebounding * 0.4 + style.defense * 0.18,
    pace_space: 34 + style.perimeter * 0.42 + style.playmaking * 0.28 + style.pace * 0.25,
    perimeter_star: 30 + style.perimeter * 0.52 + style.playmaking * 0.2,
    interior_star: 30 + style.interior * 0.52 + style.rebounding * 0.18 + style.defense * 0.1,
    triangle: 28 + style.playmaking * 0.34 + style.perimeter * 0.18 + style.interior * 0.18,
    seven_seconds: 24 + style.pace * 0.5 + style.perimeter * 0.24 + style.playmaking * 0.16
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || fallbackSystemId || 'balance';
}
function getCoachCandidateQuality(coach, teamId = 0) {
  const fx = typeof getCoachEffectsByCoach === 'function' ? getCoachEffectsByCoach(coach) : {};
  const ratingMult = parseNum(fx.teamRatingMult, 1);
  let score = 52;
  score += parseNum(fx.techLevel, 0) * 4.6;
  score += parseNum(fx.techDev, 0) * 3.8;
  score += (parseNum(fx.baseOff, 40) - 40) * 0.7;
  score += (parseNum(fx.baseDef, 40) - 40) * 0.7;
  score += (ratingMult - 1) * 115;
  if (parseNum(teamId, 0) === parseNum(G.teamId, 0)) {
    score += (getCoachFavorability(coach) - 50) * 0.08;
  }
  return clamp(Math.round(score), 28, 94);
}
function buildCoachHireScore(teamId, coach) {
  const systemId = String(coach?.systemId || resolveCoachSystemIdByName(coach?.name, coach) || 'balance').trim() || 'balance';
  const style = buildTeamCoachStyleProfile(teamId);
  let fit = 0;
  if (systemId === 'defense') fit = style.defense * 0.45 + style.rebounding * 0.18;
  else if (systemId === 'grit') fit = style.interior * 0.22 + style.rebounding * 0.42 + style.defense * 0.18;
  else if (systemId === 'pace_space') fit = style.perimeter * 0.38 + style.pace * 0.3 + style.playmaking * 0.2;
  else if (systemId === 'perimeter_star') fit = style.perimeter * 0.48 + style.playmaking * 0.18;
  else if (systemId === 'interior_star') fit = style.interior * 0.48 + style.rebounding * 0.16;
  else if (systemId === 'triangle') fit = style.playmaking * 0.32 + style.perimeter * 0.16 + style.interior * 0.16;
  else if (systemId === 'seven_seconds') fit = style.pace * 0.46 + style.perimeter * 0.2 + style.playmaking * 0.16;
  else fit = Math.min(style.perimeter, style.interior) * 0.2 + style.playmaking * 0.18 + style.defense * 0.12;
  const agePenalty = Math.max(0, parseNum(coach?.age, 45) - 63) * 0.9;
  return getCoachCandidateQuality(coach, teamId) + fit * 0.22 - agePenalty + rng(-4, 4);
}
function estimateCoachSalary(coach) {
  const quality = getCoachCandidateQuality(coach, parseNum(coach?.teamId, 0));
  return +clamp((quality - 20) * 0.12, 2.2, 9.8).toFixed(2);
}
function buildCoachRetentionProfile(teamId, coach, teamRecord = null) {
  const teamIdNum = parseNum(teamId, 0);
  const record = teamRecord || (typeof getLeagueTeamRecordsArray === 'function'
    ? getLeagueTeamRecordsArray().find(r => parseNum(r.teamId, 0) === teamIdNum)
    : null) || {};
  const gp = Math.max(0, parseNum(record?.gp, 0));
  const pct = gp > 0 ? clamp(parseNum(record?.pct, parseNum(record?.w, 0) / Math.max(1, gp)), 0, 1) : 0.5;
  const age = parseNum(coach?.age, 45);
  const contract = Math.max(0, parseNum(coach?.yearsContract, 2));
  const loyalty = clamp(parseNum(coach?.loyalty, 5), 0, 10);
  const quality = getCoachCandidateQuality(coach, teamIdNum);
  let pressure = 26;
  pressure += clamp((0.53 - pct) * 120, -16, 36);
  pressure += clamp((age - 56) * 1.25, 0, 22);
  pressure += contract <= 0 ? 18 : contract === 1 ? 10 : contract === 2 ? 4 : -3;
  pressure -= clamp((loyalty - 5) * 2.8, -9, 12);
  pressure -= clamp((quality - 62) * 0.28, -9, 9);
  if (teamIdNum === parseNum(G.teamId, 0)) {
    pressure -= clamp((getCoachFavorability(coach) - 50) * 0.42, -18, 18);
  }
  pressure = clamp(pressure, 4, 94);
  const moveChance = clamp(0.02 + Math.max(0, pressure - 30) / 95, 0.02, 0.72);
  return {
    teamId: teamIdNum,
    pct,
    age,
    contract,
    loyalty,
    quality,
    pressure,
    moveChance,
    extensionYears: pct >= 0.6 ? rng(3, 4) : (pct >= 0.48 ? rng(2, 3) : rng(1, 2))
  };
}
function createGeneratedCoach(teamId, fallbackCoach = null) {
  const tid = parseNum(teamId, 0);
  const team = typeof getTeam === 'function' ? getTeam(tid) : null;
  const systemId = pickCoachSystemForTeam(tid, fallbackCoach?.systemId || 'balance');
  const systemProfile = typeof getCoachSystemProfile === 'function' ? getCoachSystemProfile(systemId) : { label: '均衡体系', secondaryLean: '按阵容灵活分配球权' };
  const seed = parseNum(G.year, 2025) + tid + parseNum(fallbackCoach?.id, 0);
  const name = `${GENERATED_COACH_FIRST_NAMES[seed % GENERATED_COACH_FIRST_NAMES.length]} ${GENERATED_COACH_LAST_NAMES[(seed * 3) % GENERATED_COACH_LAST_NAMES.length]}`;
  const techLevel = clamp(Math.round(1 + rng(0, 2) + (buildTeamCoachStyleProfile(tid).playmaking - 60) / 18), 1, 4);
  const techDev = clamp(Math.round(1 + rng(0, 2)), 1, 4);
  const baseShotTriplePercent = clamp(Math.round(systemId === 'pace_space' || systemId === 'perimeter_star' || systemId === 'seven_seconds' ? 42 + rng(-2, 2) : 38 + rng(-2, 2)), 35, 45);
  const baseShotIntPercent = clamp(Math.round(systemId === 'interior_star' || systemId === 'grit' ? 42 + rng(-2, 2) : 38 + rng(-2, 2)), 35, 45);
  const baseOffensive = clamp(Math.round(39 + techLevel + rng(-1, 3)), 35, 45);
  const baseDefense = clamp(Math.round(39 + techDev + (systemId === 'defense' ? 2 : 0) + rng(-1, 2)), 35, 45);
  const coach = {
    id: Date.now() + tid,
    name,
    teamId: tid,
    age: clamp(41 + (seed % 11), 38, 56),
    yearsContract: rng(2, 4),
    salary: 0,
    techLevel,
    techDev,
    baseShotIntPercent,
    baseShotTriplePercent,
    baseOffensive,
    baseDefense,
    currentShotIntPercent: baseShotIntPercent,
    currentShotTriplePercent: baseShotTriplePercent,
    currentOffensive: baseOffensive,
    currentDefense: baseDefense,
    loyalty: clamp(5 + rng(-1, 2), 3, 8),
    systemId,
    systemLabel: systemProfile.label,
    secondaryLean: systemProfile.secondaryLean,
    generated: true,
    previousTeam: team?.a || ''
  };
  coach.salary = estimateCoachSalary(coach);
  return coach;
}
function runOffseasonCoachCarousel() {
  if (!LEAGUE.loaded || !LEAGUE.teams) return [];
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  const records = typeof getLeagueTeamRecordsArray === 'function' ? getLeagueTeamRecordsArray() : [];
  const recordMap = new Map(records.map(r => [parseNum(r.teamId, 0), r]));
  const evaluations = [];
  Object.entries(LEAGUE.teams).forEach(([tidRaw, teamObj]) => {
    const teamId = parseNum(tidRaw, 0);
    if (!teamId || !teamObj?.coach) return;
    const coach = teamObj.coach;
    coach.teamId = teamId;
    coach.age = Math.max(35, parseNum(coach.age, 45) + 1);
    coach.yearsContract = Math.max(0, parseNum(coach.yearsContract, 2) - 1);
    coach.systemId = String(coach.systemId || resolveCoachSystemIdByName(coach.name, coach) || pickCoachSystemForTeam(teamId, 'balance')).trim() || 'balance';
    const systemProfile = typeof getCoachSystemProfile === 'function' ? getCoachSystemProfile(coach.systemId) : { label: '均衡体系', secondaryLean: '按阵容灵活分配球权' };
    coach.systemLabel = systemProfile.label;
    coach.secondaryLean = systemProfile.secondaryLean;
    coach.salary = parseNum(coach.salary, 0) > 0 ? parseNum(coach.salary, 0) : estimateCoachSalary(coach);
    evaluations.push({
      teamId,
      teamObj,
      team: typeof getTeam === 'function' ? getTeam(teamId) : teamObj.meta,
      coach,
      profile: buildCoachRetentionProfile(teamId, coach, recordMap.get(teamId))
    });
  });
  if (!evaluations.length) {
    if (typeof syncLeagueCoachList === 'function') syncLeagueCoachList();
    return [];
  }
  evaluations.sort((a, b) => b.profile.pressure - a.profile.pressure);
  const minMoves = evaluations[0].profile.pressure >= 66 ? 2 : (evaluations[0].profile.pressure >= 52 ? 1 : 0);
  const vacancyTeams = [];
  const releasedCoaches = [];
  const retainedLines = [];
  evaluations.forEach((entry, idx) => {
    const forcedMove = idx < minMoves;
    const shouldMove = forcedMove || Math.random() < entry.profile.moveChance;
    if (shouldMove) {
      entry.teamObj.coach = null;
      releasedCoaches.push({ coach: { ...entry.coach }, prevTeamId: entry.teamId, prevTeam: entry.team });
      vacancyTeams.push(entry);
      return;
    }
    const shouldExtend = entry.profile.contract <= 0 || (entry.profile.contract <= 1 && entry.profile.pressure <= 46) || entry.profile.pct >= 0.58;
    if (shouldExtend) {
      entry.coach.yearsContract = Math.max(entry.coach.yearsContract, entry.profile.extensionYears);
      entry.coach.salary = estimateCoachSalary(entry.coach);
      if (entry.teamId === parseNum(G.teamId, 0)) {
        retainedLines.push(`🤝 ${entry.coach.name} 获得续约，与你的好感度 ${getCoachFavorability(entry.coach)} 让留任倾向更稳。`);
      }
    }
  });
  const moveLines = [];
  vacancyTeams.forEach(vacancy => {
    const candidates = releasedCoaches
      .filter(item => parseNum(item.prevTeamId, 0) !== vacancy.teamId)
      .map(item => ({ ...item, hireScore: buildCoachHireScore(vacancy.teamId, item.coach) }))
      .sort((a, b) => b.hireScore - a.hireScore);
    let selected = candidates[0] || null;
    let nextCoach = selected ? { ...selected.coach } : createGeneratedCoach(vacancy.teamId, vacancy.coach);
    if (selected) {
      const idx = releasedCoaches.findIndex(item => String(item.coach?.id || item.coach?.name) === String(selected.coach?.id || selected.coach?.name) && parseNum(item.prevTeamId, 0) === parseNum(selected.prevTeamId, 0));
      if (idx >= 0) releasedCoaches.splice(idx, 1);
    }
    nextCoach.teamId = vacancy.teamId;
    nextCoach.systemId = String(nextCoach.systemId || pickCoachSystemForTeam(vacancy.teamId, vacancy.coach?.systemId || 'balance')).trim() || 'balance';
    const nextSystem = typeof getCoachSystemProfile === 'function' ? getCoachSystemProfile(nextCoach.systemId) : { label: '均衡体系', secondaryLean: '按阵容灵活分配球权' };
    nextCoach.systemLabel = nextSystem.label;
    nextCoach.secondaryLean = nextSystem.secondaryLean;
    nextCoach.yearsContract = Math.max(2, parseNum(nextCoach.yearsContract, 0) || rng(2, 4));
    nextCoach.salary = estimateCoachSalary(nextCoach);
    vacancy.teamObj.coach = nextCoach;
    if (vacancy.teamId === parseNum(G.teamId, 0) && typeof setCoachFavorability === 'function') {
      setCoachFavorability(nextCoach, getDefaultCoachFavorability(nextCoach, vacancy.teamId), { season: G.season, teamId: vacancy.teamId, games: 0 });
    }
    const teamAbbr = String(vacancy.team?.a || vacancy.team?.abbr || vacancy.team?.z || vacancy.team?.n || `T${vacancy.teamId}`).trim();
    moveLines.push(`🧠 ${teamAbbr} 换帅：${vacancy.coach.name} → ${nextCoach.name}（胜率 ${(vacancy.profile.pct * 100).toFixed(1)}%，年龄 ${vacancy.profile.age}，压力 ${Math.round(vacancy.profile.pressure)}）`);
    if (vacancy.teamId === parseNum(G.teamId, 0)) {
      addNews(`🧠 ${vacancy.team?.z || vacancy.team?.n || '球队'} 在休赛期更换主教练：${vacancy.coach.name} 离任，${nextCoach.name} 接任。`, vacancy.profile.pressure >= 60 ? 'neg' : 'neu');
      addPhone('管理层', `休赛期决定：${vacancy.coach.name} 离任，新帅 ${nextCoach.name} 上任，主体系 ${nextCoach.systemLabel || '均衡体系'}。`, 'info');
    }
  });
  evaluations
    .filter(entry => !vacancyTeams.some(v => v.teamId === entry.teamId) && entry.teamId === parseNum(G.teamId, 0))
    .forEach(entry => {
      const favor = getCoachFavorability(entry.coach);
      addPhone(entry.coach.name, `管理层确认我会继续带队。你目前的教练好感度 ${favor}，下赛季继续冲。`, 'info');
    });
  Object.values(LEAGUE.teams || {}).forEach(teamObj => {
    if (!teamObj) return;
    if (Array.isArray(teamObj.players) && typeof toRotation === 'function') {
      teamObj.rotation = toRotation(teamObj.players);
    }
    if (typeof calcTeamStrength === 'function') {
      teamObj.strength = calcTeamStrength(teamObj);
    }
  });
  if (typeof syncLeagueCoachList === 'function') syncLeagueCoachList();
  const summary = [];
  summary.push(`教练市场：${moveLines.length} 支球队完成换帅，评估会看胜率、年龄、合同和你与教练的好感度。`);
  summary.push(...retainedLines.slice(0, 1));
  summary.push(...moveLines.slice(0, 6));
  return summary.filter(Boolean);
}
function endSeasonPostPipeline() {
  const coachSummary = runOffseasonCoachCarousel();
  if (!Array.isArray(G.offseasonSummary)) G.offseasonSummary = [];
  if (coachSummary.length) G.offseasonSummary.push(...coachSummary);
}
function updateCoachFavorabilityAfterGame(result) {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  if (!coach || typeof changeCoachFavorability !== 'function') return null;
  const entry = typeof ensureCoachRelationEntry === 'function' ? ensureCoachRelationEntry(coach) : null;
  const gradeDeltaMap = { 'S+': 3, 'S': 2, 'A': 1.2, 'B': 0.4, 'C': 0, 'D': -0.8, 'F': -1.6 };
  let delta = result?.win ? 1.1 : -0.8;
  delta += gradeDeltaMap[result?.grade] || 0;
  const mins = parseNum(result?.st?.mins, 0);
  const pts = parseNum(result?.pts, 0);
  const ast = parseNum(result?.ast, 0);
  if (mins >= 34) delta += 0.4;
  else if (mins <= 14) delta -= 0.5;
  if (pts >= 30) delta += 0.5;
  if (ast >= 8) delta += 0.25;
  if (result?.injured) delta -= 0.4;
  const before = getCoachFavorability(coach);
  const next = changeCoachFavorability(coach, clamp(delta, -3, 3), {
    games: Math.max(0, parseNum(entry?.games, 0)) + 1,
    season: G.season,
    teamId: G.teamId
  });
  return { before, after: next, delta: next - before };
}

function getUserTeamGameRows(result) {
  const game = result?.gameResult || result || {};
  const userTeamId = parseNum(G.teamId, 0);
  const isHome = parseNum(game.homeTeamId, 0) === userTeamId;
  const rows = isHome ? game.homeRows : game.awayRows;
  return Array.isArray(rows) ? rows : [];
}

function getRecentTeamResultStreak(expectedWin = true, limit = 8) {
  const want = !!expectedWin;
  const max = Math.max(1, parseNum(limit, 8));
  let streak = 0;
  for (let i = (G.results || []).length - 1; i >= 0 && streak < max; i--) {
    const res = G.results[i];
    if (!res || !res.userGame) continue;
    if (!!res.win !== want) break;
    streak++;
  }
  return streak;
}

function syncTeammateRelationsAfterGame(result) {
  if (!result || !result.userGame || typeof ensureTeamRelationsState !== 'function') return null;
  if (typeof initTeamRelationsForCurrentTeam === 'function') initTeamRelationsForCurrentTeam();
  const state = ensureTeamRelationsState();
  const chemistryBefore = { ...(state.chemistry || {}) };
  const rosterById = new Map((getTeamPlayers(parseNum(G.teamId, 0)) || []).map(player => [String(player?.id), player]));
  const teammateRows = getUserTeamGameRows(result).filter(row => !row?.isSelf && !row?.status);
  if (!teammateRows.length) return null;

  const winStreak = getRecentTeamResultStreak(true);
  const lossStreak = getRecentTeamResultStreak(false);
  const shareGame = parseNum(result?.ast, 0) >= 7;
  const ballDominance = parseNum(result?.fga, 0) >= 20 && parseNum(result?.ast, 0) <= 4;
  const carryGame = ['S+', 'S', 'A'].includes(String(result?.grade || '').trim()) || parseNum(result?.pts, 0) >= 28;

  let bestPositive = null;
  let bestNegative = null;
  let changedCount = 0;

  teammateRows.forEach(row => {
    const player = rosterById.get(String(row.playerId)) || row;
    const entry = typeof ensureTeammateRelation === 'function' ? ensureTeammateRelation(player, G.teamId) : null;
    if (!entry) return;

    let favorDelta = result.win ? 1 : -1;
    let usageDelta = result.win ? 1 : -1;
    let veteranDelta = 0;

    const minutes = parseNum(row?.mins, 0);
    const pts = parseNum(row?.pts, 0);
    const ast = parseNum(row?.ast, 0);
    const usage = parseNum(row?.fga, 0) + parseNum(row?.fta, 0) * POSSESSION_FT_WEIGHT;

    if (shareGame) {
      favorDelta += pts >= 10 ? 1 : 0;
      usageDelta += pts >= 8 ? 2 : 1;
      if (entry.isRookie && pts >= 8) favorDelta += 1;
    }
    if (ballDominance && minutes >= 18) {
      favorDelta -= minutes >= 24 ? 1 : 0;
      usageDelta -= usage <= 8 ? 5 : 3;
    }
    if (!result.win && minutes >= 24 && pts <= 8) {
      favorDelta -= 1;
      usageDelta -= 2;
    }
    if (result.win && pts >= 18) {
      favorDelta += 1;
      if (entry.isVeteran) veteranDelta += 1;
    }
    if (ast >= 5 && carryGame) favorDelta += 1;
    if (entry.isVeteran) {
      if (result.win && shareGame) veteranDelta += 1;
      if (!result.win && ballDominance) veteranDelta -= 1;
    }
    if (winStreak >= 3 && result.win) favorDelta += 1;
    if (lossStreak >= 3 && !result.win) favorDelta -= 1;

    const oldFavor = parseNum(entry.favorability, 50);
    const oldUsage = parseNum(entry.usageSatisfaction, 0);
    const oldVeteran = parseNum(entry.veteranEndorsement, 0);
    const usageDrift = oldUsage > 0 ? -1 : (oldUsage < 0 ? 1 : 0);

    entry.favorability = clamp(Math.round(oldFavor + favorDelta), 0, 100);
    entry.usageSatisfaction = clamp(Math.round(oldUsage + usageDelta + usageDrift), -40, 40);
    entry.veteranEndorsement = clamp(Math.round(oldVeteran + veteranDelta), -20, 20);
    entry.interactions = (entry.interactions || 0) + 1;
    entry.lastInteractionDay = parseNum(G.dayNum, 0);
    entry.lastSource = result.win ? '比赛胜利反馈' : '比赛失利反馈';

    const score = favorDelta + usageDelta * 0.35 + veteranDelta * 0.75;
    const impact = Math.abs(favorDelta) + Math.abs(usageDelta) * 0.45 + Math.abs(veteranDelta) * 0.8;
    if (impact >= 2) changedCount++;

    if (!bestPositive || score > bestPositive.score) {
      bestPositive = { entry, score, favorDelta, usageDelta, veteranDelta, row };
    }
    if (!bestNegative || score < bestNegative.score) {
      bestNegative = { entry, score, favorDelta, usageDelta, veteranDelta, row };
    }
  });

  const chemistryAfter = typeof recalculateTeamChemistry === 'function'
    ? recalculateTeamChemistry()
    : (state.chemistry || chemistryBefore);

  let feature = null;
  if (shareGame && bestPositive && bestPositive.score >= 2.4) {
    feature = {
      playerId: bestPositive.entry.playerId,
      playerName: bestPositive.entry.name,
      title: `${bestPositive.entry.name} 更愿意跟你打配合了`,
      detail: `${bestPositive.entry.name} 觉得你今天把比赛节奏带得很顺，传导和分享球让他更买账。`,
      favorDelta: bestPositive.favorDelta,
      usageDelta: bestPositive.usageDelta,
      type: 'pos',
      source: '赛后更衣室反馈'
    };
  } else if (ballDominance && bestNegative && bestNegative.score <= -2.4) {
    feature = {
      playerId: bestNegative.entry.playerId,
      playerName: bestNegative.entry.name,
      title: `${bestNegative.entry.name} 对出手分配有意见`,
      detail: `${bestNegative.entry.name} 觉得这场你把回合掐得太死，输球夜里这种感觉会被放大。`,
      favorDelta: bestNegative.favorDelta,
      usageDelta: bestNegative.usageDelta,
      type: 'neg',
      source: '赛后更衣室反馈'
    };
  } else if (!result.win && lossStreak >= 3 && parseNum(chemistryAfter?.dramaLevel, 0) > 0) {
    feature = {
      title: '连败让更衣室开始变紧',
      detail: `球队已经 ${lossStreak} 连败，抱怨和小情绪开始变多，化学反应下降到 ${Math.round(parseNum(chemistryAfter?.overall, 50))}。`,
      type: 'neg',
      source: '连败压力'
    };
  }

  if (feature && typeof pushTeamRelationEvent === 'function') {
    pushTeamRelationEvent(feature);
    if (Array.isArray(result.events)) result.events.push(`🤝 ${feature.title}：${feature.detail}`);
  }

  const summary = {
    changedCount,
    chemistryBefore,
    chemistryAfter,
    shareGame,
    ballDominance,
    winStreak,
    lossStreak,
    feature
  };
  result.teamRelationSummary = summary;
  return summary;
}

function buildTeamRelationshipPrompt(result) {
  if (!result || typeof ensureTeamRelationsState !== 'function') return null;
  const state = ensureTeamRelationsState();
  if (parseNum(state.lastPromptDay, -99) === parseNum(result?.day, -100)) return null;
  if (parseNum(result?.day, 0) - parseNum(state.lastPromptDay, -99) < 2) return null;

  const chemistry = state.chemistry || {};
  const game = result?.gameResult || result || {};
  const roster = getTeamPlayers(parseNum(G.teamId, 0)) || [];
  const rows = getUserTeamGameRows(game).filter(row => !row?.isSelf && !row?.status);
  const lossStreak = getRecentTeamResultStreak(false);

  if (result.isGame && parseNum(game?.ast, 0) >= 7 && rows.length && Math.random() < 0.7) {
    const target = rows
      .slice()
      .sort((a, b) => parseNum(b?.pts, 0) - parseNum(a?.pts, 0) || parseNum(b?.mins, 0) - parseNum(a?.mins, 0))[0];
    if (target) {
      return {
        type: 'teammate_ball_movement',
        summaryMode: 'team',
        title: `${target.name} 在更衣室叫住了你`,
        desc: `赢球后，${target.name} 说今天大家都吃到了舒服的回合，想听听你怎么总结这场球。`,
        targetPlayerId: target.playerId,
        choices: [
          { id: 'share_credit', title: '把功劳分给队友', detail: '更衣室会更舒服，队友更愿意继续跟你打分享球。', badge: '目标好感↑ / 全队氛围↑' },
          { id: 'praise_grit', title: '重点夸防守和跑位', detail: '老将会更买账，你会显得更像一个带队的人。', badge: '老将认可↑ / 化学反应↑' },
          { id: 'claim_control', title: '顺势强调球该在你手里', detail: '你会更像核心，但容易让队友觉得你在抢话。', badge: '目标好感↓ / 球权积怨↑' }
        ]
      };
    }
  }

  if (result.isGame && parseNum(game?.fga, 0) >= 20 && parseNum(game?.ast, 0) <= 4 && rows.length && Math.random() < 0.8) {
    const target = rows
      .filter(row => parseNum(row?.mins, 0) >= 20)
      .sort((a, b) => parseNum(b?.mins, 0) - parseNum(a?.mins, 0) || parseNum(a?.pts, 0) - parseNum(b?.pts, 0))[0] || rows[0];
    if (target) {
      return {
        type: 'teammate_shot_tension',
        summaryMode: 'team',
        title: `${target.name} 对这场的回合分配不太满意`,
        desc: `输球后的更衣室里，${target.name} 直说这场很多回合打得太闷，大家没怎么摸到球。`,
        targetPlayerId: target.playerId,
        choices: [
          { id: 'own_it', title: '认下来，表示下场会多分享', detail: '能快速止血，但你下场要真把球动起来。', badge: '目标好感↑ / 球权积怨↓' },
          { id: 'watch_tape', title: '拉他一起看录像拆问题', detail: '不会立刻热络，但至少能把矛盾压回篮球本身。', badge: '目标好感小涨 / 氛围回稳' },
          { id: 'double_down', title: '坚持关键球就该你来', detail: '你保住姿态，但更衣室会继续记账。', badge: '目标好感↓ / 化学反应↓' }
        ]
      };
    }
  }

  if (!result.isGame && lossStreak >= 3 && Math.random() < 0.75) {
    const veteran = roster
      .filter(player => parseNum(player?.yearsLeague, 0) >= 5)
      .sort((a, b) => parseNum(b?.rating, 0) - parseNum(a?.rating, 0))[0];
    if (veteran) {
      return {
        type: 'veteran_film_session',
        summaryMode: 'team',
        title: `${veteran.name} 组织了球员会议`,
        desc: `${lossStreak} 连败后，${veteran.name} 把大家叫进录像室，想先把更衣室重新捏紧。`,
        targetPlayerId: veteran.id,
        choices: [
          { id: 'lead_session', title: '提前到场，带头复盘', detail: '老将会更认可你，队内信任也会回暖。', badge: '老将认可↑ / 氛围↑ / XP↑' },
          { id: 'show_up', title: '到场认真听，但少说', detail: '稳妥处理，不会抢老将的话语权。', badge: '目标好感↑ / 稳定' },
          { id: 'skip_session', title: '找借口缺席', detail: '会被视为不愿承担，连败期这样很伤。', badge: '目标好感↓ / 老将认可↓' }
        ]
      };
    }
  }

  if (!result.isGame && parseNum(chemistry?.dramaLevel, 0) >= 2 && Math.random() < 0.55) {
    const target = roster
      .map(player => ({ player, rel: typeof getTeammateRelationEntry === 'function' ? getTeammateRelationEntry(player.id, G.teamId) : null }))
      .filter(item => item.rel && parseNum(item.rel.usageSatisfaction, 0) <= -12)
      .sort((a, b) => parseNum(a.rel?.usageSatisfaction, 0) - parseNum(b.rel?.usageSatisfaction, 0))[0];
    if (target?.player) {
      return {
        type: 'bench_unit_talk',
        summaryMode: 'team',
        title: `${target.player.name} 主动来和你聊第二阵容`,
        desc: `${target.player.name} 直说替补时间的回合打得太碎了，他希望你带二阵时把节奏理顺。`,
        targetPlayerId: target.player.id,
        choices: [
          { id: 'promise_flow', title: '答应把第二阵容带顺', detail: '角色球员会更愿意跟着你跑。', badge: '目标好感↑ / 球权积怨↓' },
          { id: 'keep_roles', title: '强调各自先守住角色', detail: '能维持秩序，但不会立刻解决怨气。', badge: '小幅稳定' },
          { id: 'ignore_complaint', title: '表示这不是你该管的', detail: '会让板凳席对你更冷。', badge: '目标好感↓ / 氛围↓' }
        ]
      };
    }
  }

  const rookie = roster
    .filter(player => parseNum(player?.yearsLeague, 0) <= 1)
    .sort((a, b) => parseNum(b?.potential, 0) - parseNum(a?.potential, 0))[0];
  if (!result.isGame && rookie && Math.random() < 0.4) {
    return {
      type: 'rookie_help_request',
      summaryMode: 'team',
      title: `${rookie.name} 想跟你单独加一组训练`,
      desc: `${rookie.name} 想请你帮他过一遍球队的节奏和跑位，看得出来他在努力找位置。`,
      targetPlayerId: rookie.id,
      choices: [
        { id: 'mentor_rookie', title: '陪他加练一组', detail: '新秀会更服你，也会让大家看到你愿意带人。', badge: '目标好感↑ / 新秀圈好感↑ / XP↑' },
        { id: 'pass_to_staff', title: '让助教先带他', detail: '不算坏，但也谈不上建立太多连接。', badge: '小幅正面' },
        { id: 'brush_off_rookie', title: '让他自己先消化', detail: '省事，但容易让新秀觉得你并不想带他。', badge: '目标好感↓' }
      ]
    };
  }

  return null;
}

function applyTeamDailyPromptChoice(prompt, choiceId, result = null) {
  if (!prompt || typeof ensureTeamRelationsState !== 'function') return { ok: false, text: '更衣室没有出现额外变化。' };
  const state = ensureTeamRelationsState();
  const type = String(prompt?.type || '').trim();
  const id = String(choiceId || '').trim();
  const day = parseNum(result?.day, G.dayNum);
  const roster = getTeamPlayers(parseNum(G.teamId, 0)) || [];
  const targetPlayerId = parseNum(prompt?.targetPlayerId, 0);
  const targetPlayer = targetPlayerId ? (findTeamPlayerById(parseNum(G.teamId, 0), targetPlayerId) || roster.find(player => parseNum(player?.id, 0) === targetPlayerId)) : null;
  const targetEntry = targetPlayer ? ensureTeammateRelation(targetPlayer, G.teamId) : null;
  const allEntries = roster.map(player => ensureTeammateRelation(player, G.teamId)).filter(Boolean);
  const rookieEntries = allEntries.filter(entry => entry.isRookie);
  const veteranEntries = allEntries.filter(entry => entry.isVeteran);
  state.lastPromptDay = day;

  const touchEntry = (entry, { favor = 0, usage = 0, veteran = 0 } = {}) => {
    if (!entry) return;
    entry.favorability = clamp(Math.round(parseNum(entry.favorability, 50) + parseNum(favor, 0)), 0, 100);
    entry.usageSatisfaction = clamp(Math.round(parseNum(entry.usageSatisfaction, 0) + parseNum(usage, 0)), -40, 40);
    entry.veteranEndorsement = clamp(Math.round(parseNum(entry.veteranEndorsement, 0) + parseNum(veteran, 0)), -20, 20);
    entry.interactions = (entry.interactions || 0) + 1;
    entry.lastInteractionDay = day;
    entry.lastSource = type;
  };

  const touchGroup = (entries, effect = {}) => entries.forEach(entry => touchEntry(entry, effect));
  const finalise = ({ text, title, detail, phoneFrom = '', phone = '', news = '', newsType = 'pos', eventType = 'pos', favorDelta = 0, usageDelta = 0, veteranDelta = 0, xpDelta = 0, moodDelta = 0 } = {}) => {
    if (xpDelta > 0) addPlayerXP(xpDelta);
    if (moodDelta) G.player.mood = clamp(parseNum(G.player.mood, 50) + parseNum(moodDelta, 0), 0, 100);
    const chemistry = typeof recalculateTeamChemistry === 'function' ? recalculateTeamChemistry() : (state.chemistry || {});
    if (typeof pushTeamRelationEvent === 'function') {
      pushTeamRelationEvent({
        day,
        playerId: targetEntry?.playerId || targetPlayerId,
        playerName: targetEntry?.name || targetPlayer?.name || '',
        title,
        detail,
        favorDelta,
        usageDelta,
        veteranDelta,
        type: eventType,
        source: type
      });
    }
    if (Array.isArray(result?.events) && detail) result.events.push(`🤝 ${title}：${detail}`);
    if (phone) addPhone(phoneFrom || targetEntry?.name || '队友', phone, eventType === 'neg' ? 'warn' : 'info');
    if (news) addNews(news, newsType);
    return { ok: true, text, chemistry };
  };

  if (type === 'teammate_ball_movement') {
    if (id === 'share_credit') {
      touchEntry(targetEntry, { favor: 4, usage: 2 });
      touchGroup(allEntries.filter(entry => entry.playerId !== targetPlayerId), { favor: 1, usage: 1 });
      return finalise({
        text: `你把赢球的功劳分给了队友，${targetEntry?.name || '更衣室'} 会更愿意继续跟你打分享球。`,
        title: `${targetEntry?.name || '队友'} 更愿意跟你打分享球`,
        detail: '你主动把聚光灯分出去，队友会把这种处理记在心里。',
        phoneFrom: targetEntry?.name || '队友',
        phone: '你今天把话留给了大家，这种处理很对味。下次继续这样打，球会自己转起来。',
        news: `🤝 ${G.player.name} 赛后把赢球功劳分给队友，更衣室对他的分享球态度明显升温。`,
        newsType: 'pos',
        eventType: 'pos',
        favorDelta: 4,
        usageDelta: 2
      });
    }
    if (id === 'praise_grit') {
      touchEntry(targetEntry, { favor: 3, usage: 1 });
      touchGroup(veteranEntries, { favor: 1, veteran: 1 });
      return finalise({
        text: '你把重点放在防守、跑位和脏活上，老将会更认可你在队里的位置。',
        title: '老将开始更买账你的表达',
        detail: '你没有抢镜，而是把话题拉回执行力和脏活，这种表态通常很稳。',
        phoneFrom: targetEntry?.name || '队友',
        phone: '你今天夸的是最该夸的东西，老将们都会听进去。',
        news: `🧱 ${G.player.name} 赛后重点称赞球队防守与跑位，老将对他的认可度上升。`,
        newsType: 'pos',
        eventType: 'pos',
        favorDelta: 3,
        veteranDelta: 1
      });
    }
    touchEntry(targetEntry, { favor: -3, usage: -5 });
    touchGroup(veteranEntries, { favor: -1, veteran: -1 });
    return finalise({
      text: '你把话题又拉回自己手里，核心姿态有了，但队友会觉得你在抢回合的定义权。',
      title: `${targetEntry?.name || '队友'} 觉得你在抢话`,
      detail: '本来是一次舒服的分享球胜利，你却顺势把话题重新拽回自己的战术地位。',
      phoneFrom: targetEntry?.name || '队友',
      phone: '赢球当然好，但如果每次总结都变成“球该在你手里”，队友会慢慢不说话。',
      news: `📉 ${G.player.name} 在队内交流中继续强调球权控制，部分队友对这种表态感到别扭。`,
      newsType: 'neg',
      eventType: 'neg',
      favorDelta: -3,
      usageDelta: -5,
      veteranDelta: -1
    });
  }

  if (type === 'teammate_shot_tension') {
    if (id === 'own_it') {
      touchEntry(targetEntry, { favor: 3, usage: 5 });
      touchGroup(allEntries.filter(entry => entry.playerId !== targetPlayerId), { favor: 1, usage: 1 });
      return finalise({
        text: '你先把问题认了下来，更衣室的火先灭了一半，接下来要靠比赛兑现。',
        title: '你主动给更衣室止了血',
        detail: '你承认这场的回合处理太急，队友至少愿意再给你一次机会。',
        phoneFrom: targetEntry?.name || '队友',
        phone: '你能把这话说出来就行。下一场把球动起来，大家自然会跟回来。',
        news: `🤝 输球后，${G.player.name} 主动承认回合处理过急，球队内部情绪暂时得到缓和。`,
        newsType: 'pos',
        eventType: 'pos',
        favorDelta: 3,
        usageDelta: 5
      });
    }
    if (id === 'watch_tape') {
      touchEntry(targetEntry, { favor: 1, usage: 2 });
      touchGroup(veteranEntries, { favor: 1 });
      return finalise({
        text: '你没有硬顶，也没有直接认怂，而是把矛盾拉回录像和执行细节。',
        title: '矛盾被压回了篮球层面',
        detail: '这次谈话没有让关系立刻变热，但至少避免了更衣室继续发酵。',
        phoneFrom: targetEntry?.name || '队友',
        phone: '先看录像也好，至少说明你没把这事当耳旁风。',
        eventType: 'neu',
        favorDelta: 1,
        usageDelta: 2
      });
    }
    touchEntry(targetEntry, { favor: -5, usage: -6 });
    touchGroup(veteranEntries, { favor: -1, veteran: -1 });
    return finalise({
      text: '你把姿态顶住了，但输球夜里这么说，只会让更衣室继续给你记账。',
      title: `${targetEntry?.name || '队友'} 记下了这次争执`,
      detail: '你坚持关键球都该由你来处理，这让队友对后续回合分配更敏感了。',
      phoneFrom: targetEntry?.name || '队友',
      phone: '你当然可以硬顶，但下一次别人未必还愿意第一时间把球回给你。',
      news: `📉 ${G.player.name} 在输球后的队内交流中继续强硬强调球权处理，更衣室气压走低。`,
      newsType: 'neg',
      eventType: 'neg',
      favorDelta: -5,
      usageDelta: -6,
      veteranDelta: -1
    });
  }

  if (type === 'veteran_film_session') {
    if (id === 'lead_session') {
      touchEntry(targetEntry, { favor: 4, usage: 1, veteran: 3 });
      touchGroup(allEntries.filter(entry => entry.playerId !== targetPlayerId), { favor: 1 });
      return finalise({
        text: `你在 ${targetEntry?.name || '老将'} 的球员会议上站出来带头复盘，老将会更愿意替你说话。`,
        title: `${targetEntry?.name || '老将'} 开始把你当成能一起扛事的人`,
        detail: '连败期愿意主动扛责，比单场数据更能赢得更衣室尊重。',
        phoneFrom: targetEntry?.name || '老将',
        phone: '连败的时候肯进录像室带头说话，这比赛后漂亮话有用得多。',
        news: `🗂️ ${G.player.name} 在连败期间主动参与球员会议并带头复盘，球队内部评价回暖。`,
        newsType: 'pos',
        eventType: 'pos',
        favorDelta: 4,
        veteranDelta: 3,
        xpDelta: 2,
        moodDelta: -1
      });
    }
    if (id === 'show_up') {
      touchEntry(targetEntry, { favor: 2, veteran: 1 });
      touchGroup(veteranEntries.filter(entry => entry.playerId !== targetPlayerId), { favor: 1 });
      return finalise({
        text: '你至少到场把会议开完了，这会让老将觉得你愿意共担连败压力。',
        title: '你没有从连败里躲开',
        detail: '这不是最强烈的表态，但足够说明你愿意待在队里一起解决问题。',
        phoneFrom: targetEntry?.name || '老将',
        phone: '你肯来就行，连败的时候最怕的是更衣室有人先往后退。',
        eventType: 'neu',
        favorDelta: 2,
        veteranDelta: 1
      });
    }
    touchEntry(targetEntry, { favor: -5, veteran: -3 });
    touchGroup(veteranEntries.filter(entry => entry.playerId !== targetPlayerId), { favor: -1, veteran: -1 });
    return finalise({
      text: '你在最需要一起收口的时候缺席了，老将会把这件事记很久。',
      title: '老将开始质疑你是否愿意承担',
      detail: '连败期缺席球员会议，会被直接理解成你不想和大家一起扛。',
      phoneFrom: targetEntry?.name || '老将',
      phone: '录像室里少一个人，大家都看得到。连败的时候，这种事尤其伤。',
      news: `📉 ${G.player.name} 缺席球队连败期间的球员会议，队内对其担当的评价下滑。`,
      newsType: 'neg',
      eventType: 'neg',
      favorDelta: -5,
      veteranDelta: -3,
      moodDelta: 1
    });
  }

  if (type === 'rookie_help_request') {
    if (id === 'mentor_rookie') {
      touchEntry(targetEntry, { favor: 4, usage: 1 });
      touchGroup(rookieEntries.filter(entry => entry.playerId !== targetPlayerId), { favor: 1 });
      return finalise({
        text: `你陪 ${targetEntry?.name || '新秀'} 多练了一组，这种带人方式会很快传开。`,
        title: `${targetEntry?.name || '新秀'} 更愿意跟着你学`,
        detail: '你愿意花时间带新秀，会让队里把你看成更成熟的那一类人。',
        phoneFrom: targetEntry?.name || '新秀',
        phone: '谢了，今天这段加练真的有用。我知道以后该先看哪里了。',
        news: `🌱 ${G.player.name} 训练后主动带着新秀加练，队内对他的评价多了些“愿意带人”的标签。`,
        newsType: 'pos',
        eventType: 'pos',
        favorDelta: 4,
        xpDelta: 2
      });
    }
    if (id === 'pass_to_staff') {
      touchEntry(targetEntry, { favor: 1 });
      return finalise({
        text: '你把问题交给助教处理了，不算失礼，但也没真正把关系往前推。',
        title: '这次互动保持在职业层面',
        detail: '你没有拒绝，只是没有亲自接下这件事。',
        eventType: 'neu',
        favorDelta: 1
      });
    }
    touchEntry(targetEntry, { favor: -4, usage: -1 });
    return finalise({
      text: '你把这件事推回给了新秀自己，更衣室不会马上炸，但他会慢慢觉得你不好接近。',
      title: `${targetEntry?.name || '新秀'} 觉得你不太想带他`,
      detail: '对新秀来说，谁愿意搭把手，会被记得非常清楚。',
      phoneFrom: targetEntry?.name || '新秀',
      phone: '明白了，我自己再多看几遍吧。',
      eventType: 'neg',
      favorDelta: -4,
      usageDelta: -1
    });
  }

  if (type === 'bench_unit_talk') {
    if (id === 'promise_flow') {
      touchEntry(targetEntry, { favor: 3, usage: 4 });
      touchGroup(allEntries.filter(entry => entry.playerId !== targetPlayerId && !entry.isVeteran), { favor: 1, usage: 1 });
      return finalise({
        text: '你答应把第二阵容的节奏理顺，这会让角色球员更愿意跟着你打。',
        title: '第二阵容开始重新期待和你搭配',
        detail: '替补最怕回合碎，你愿意主动带顺他们，氛围会直接变好。',
        phoneFrom: targetEntry?.name || '队友',
        phone: '如果你真愿意把二阵带顺，板凳席这边会一直记着你的好。',
        eventType: 'pos',
        favorDelta: 3,
        usageDelta: 4
      });
    }
    if (id === 'keep_roles') {
      touchEntry(targetEntry, { favor: 1, usage: 1 });
      return finalise({
        text: '你把话题压回角色分工，短期不会特别热，但至少没继续失控。',
        title: '更衣室暂时稳住了节奏',
        detail: '这不是解法，但至少先把情绪按住了。',
        eventType: 'neu',
        favorDelta: 1,
        usageDelta: 1
      });
    }
    touchEntry(targetEntry, { favor: -4, usage: -4 });
    touchGroup(allEntries.filter(entry => entry.playerId !== targetPlayerId && !entry.isVeteran), { favor: -1 });
    return finalise({
      text: '你把问题推开了，板凳席会觉得你只在乎自己的回合。',
      title: '第二阵容对你更冷了',
      detail: '角色球员最在意的是有没有被带进比赛，你直接划清界线会伤关系。',
      phoneFrom: targetEntry?.name || '队友',
      phone: '明白了，那二阵这边以后也只能各打各的了。',
      eventType: 'neg',
      favorDelta: -4,
      usageDelta: -4
    });
  }

  return { ok: false, text: '更衣室没有出现额外变化。' };
}

function buildDailyInteractionPrompt(result) {
  const teamPrompt = typeof buildTeamRelationshipPrompt === 'function' ? buildTeamRelationshipPrompt(result) : null;
  const coachPrompt = typeof buildCoachDailyPrompt === 'function' ? buildCoachDailyPrompt(result) : null;
  if (teamPrompt && coachPrompt) {
    const relationPriority = parseNum(result?.gameResult?.ast, parseNum(result?.ast, 0)) >= 7
      || parseNum(result?.gameResult?.fga, parseNum(result?.fga, 0)) >= 20
      || parseNum(ensureTeamRelationsState()?.chemistry?.dramaLevel, 0) > 0;
    return relationPriority || Math.random() < 0.55 ? teamPrompt : coachPrompt;
  }
  return teamPrompt || coachPrompt || null;
}

function getPostgameEventConfig(type = '') {
  const map = {
    postgame_interview: { priority: 74, cooldownDays: 6, from: '媒体区' },
    postgame_film_review: { priority: 72, cooldownDays: 4, from: '录像室' },
    postgame_recovery_plan: { priority: 71, cooldownDays: 5, from: '体能组' },
    postgame_clutch_media: { priority: 84, cooldownDays: 7, from: '采访区' },
    postgame_accountability: { priority: 80, cooldownDays: 6, from: '更衣室' },
    teammate_ball_movement: { priority: 70, cooldownDays: 5, from: '队友' },
    teammate_shot_tension: { priority: 76, cooldownDays: 5, from: '队友' },
    veteran_film_session: { priority: 73, cooldownDays: 6, from: '老将' },
    rookie_help_request: { priority: 66, cooldownDays: 4, from: '新秀' },
    bench_unit_talk: { priority: 70, cooldownDays: 5, from: '板凳席' }
  };
  return map[String(type || '').trim()] || { priority: 62, cooldownDays: 4, from: '球队' };
}

function buildPostgameEventCandidates(result) {
  if (!result?.isGame) return [];
  const game = result.gameResult || {};
  const prompt = typeof buildDailyInteractionPrompt === 'function' ? buildDailyInteractionPrompt(result) : null;
  if (!prompt || !Array.isArray(prompt.choices) || !prompt.choices.length) return [];
  const cfg = getPostgameEventConfig(prompt.type);
  const gameKey = getCurrentGameKey(game);
  return [{
    id: `${gameKey}_${prompt.type}`,
    gameKey,
    type: String(prompt.type || '').trim(),
    title: prompt.title || '赛后事件',
    desc: prompt.desc || '',
    prompt,
    basePriority: cfg.priority,
    cooldownDays: cfg.cooldownDays,
    from: cfg.from
  }];
}

function scorePostgameEvent(event, result) {
  const game = result?.gameResult || {};
  const mins = parseNum(game?.st?.mins, game.mins || 0);
  const margin = Math.abs(parseNum(game.teamPts, 0) - parseNum(game.oppPts, 0));
  const grade = String(game.grade || '').trim();
  let score = parseNum(event?.basePriority, 60);
  if (mins < 12) score -= 18;
  if (mins >= 28) score += 4;
  if (margin <= 5) score += 6;
  if (['S+', 'S', 'A', 'D', 'F'].includes(grade)) score += 4;
  if (parseNum(game.staminaLoss, 0) >= 10 && event?.type === 'postgame_recovery_plan') score += 8;
  if (margin >= 22 && parseNum(game.pts, 0) < 10) score -= 10;
  return clamp(Math.round(score), 0, 99);
}

function canRoutePostgameEvent(event, result, { force = false } = {}) {
  const state = ensureGameplayState().postgameDirector;
  const game = result?.gameResult || {};
  const mins = parseNum(game?.st?.mins, game.mins || 0);
  if (mins <= 0) return false;
  const type = String(event?.type || '').trim();
  const gameKey = String(event?.gameKey || getCurrentGameKey(game)).trim();
  if (state.lastEventGameIdByType[type] === gameKey) return false;
  const lastDay = parseNum(state.lastEventDayByType[type], -999);
  const day = parseNum(result?.day, G.dayNum);
  if (day - lastDay < parseNum(event?.cooldownDays, 4)) return false;
  if (!force) return true;
  const forcedCount = parseNum(state.forcedModalCountByGameId[gameKey], 0);
  if (forcedCount >= POSTGAME_FORCED_MODAL_CAP_PER_GAME) return false;
  const margin = Math.abs(parseNum(game.teamPts, 0) - parseNum(game.oppPts, 0));
  if (mins < 12 && margin > 5) return false;
  return true;
}

function recordPostgameEventRoute(event, result, { forced = false } = {}) {
  if (!event) return;
  const state = ensureGameplayState().postgameDirector;
  const game = result?.gameResult || {};
  const type = String(event.type || '').trim();
  const day = parseNum(result?.day, G.dayNum);
  const gameKey = String(event.gameKey || getCurrentGameKey(game)).trim();
  state.lastEventDayByType[type] = day;
  state.lastEventGameIdByType[type] = gameKey;
  if (forced) {
    state.forcedModalCountByGameId[gameKey] = parseNum(state.forcedModalCountByGameId[gameKey], 0) + 1;
  }
}

function buildKeyPossessionCandidates(result) {
  const game = result?.gameResult || result || {};
  const mins = parseNum(game?.st?.mins, game.mins || 0);
  if (mins < 16) return [];
  const margin = Math.abs(parseNum(game.teamPts, 0) - parseNum(game.oppPts, 0));
  const candidates = [];
  if (margin <= 5) {
    candidates.push({
      id: 'late_clock_read',
      title: '末节读秒回合',
      trigger: 'close_game',
      choices: ['自己终结', '吸引夹击分球', '压时间重新组织']
    });
  }
  if (parseNum(game.tov, parseNum(game?.st?.tov, 0)) >= 4) {
    candidates.push({
      id: 'turnover_reset',
      title: '失误后的下个回合',
      trigger: 'turnover_pressure',
      choices: ['简化处理', '继续强攻', '交给队友发起']
    });
  }
  return candidates;
}

function buildPostgameSummary(result, route = {}) {
  const game = result?.gameResult || {};
  const opp = typeof getTeam === 'function' ? (getTeam(game.opp) || {}) : {};
  const mins = parseNum(game?.st?.mins, game.mins || 0);
  const scoreLine = `${G.team?.a || '主队'} ${parseNum(game.teamPts, 0)}-${parseNum(game.oppPts, 0)} ${opp.a || opp.z || '对手'}`;
  const title = game.win ? '赛后简报：赢球后的余波' : '赛后简报：输球后的余波';
  const lines = [];
  if (mins <= 0) {
    lines.push(`这场你没有进入实际轮换，比赛故事更多落在球队主力和对手回应上。`);
  } else {
    lines.push(`${scoreLine}，你打了 ${mins} 分钟，留下 ${parseNum(game.pts, 0)} 分 ${parseNum(game.reb, 0)} 板 ${parseNum(game.ast, 0)} 助，评分 ${game.grade || '--'}。`);
  }
  const planLine = game.pregamePlanEffect?.summary
    || (mins <= 0 ? '赛前计划被保留到下一次真正上场，今天没有被强行写进表现。' : '赛前计划按默认方案执行，没有额外剧情分支。');
  lines.push(planLine);
  if (route?.forcedPrompt) {
    lines.push(`赛后只保留一个必须处理的节点：${route.forcedPrompt.title || '关键沟通'}。其他反馈进入手机和简报，不连续弹窗。`);
  } else if (route?.phoneEvents?.length) {
    lines.push(`球队还有后续反馈，但这场不会继续打断流程；相关消息已经沉到手机里。`);
  } else {
    lines.push(`没有新的强制沟通，今晚的重点回到恢复、训练和下一场准备。`);
  }
  const careerLineText = (route?.careerLines || buildCareerLinesView())
    .filter(item => parseNum(item.lastDelta, 0) !== 0)
    .slice(0, 3)
    .map(item => `${item.title}${item.lastDelta > 0 ? '+' : ''}${item.lastDelta}`)
    .join('，');
  if (careerLineText) lines.push(`生涯线变化：${careerLineText}。`);
  return {
    title,
    subtitle: scoreLine,
    gameKey: route?.gameKey || getCurrentGameKey(game),
    lines,
    planLine,
    forcedPromptType: route?.forcedEventType || '',
    day: parseNum(result?.day, G.dayNum)
  };
}

function routePostgameEvents(result) {
  const state = ensureGameplayState();
  const game = result?.gameResult || {};
  const gameKey = getCurrentGameKey(game);
  const candidates = buildPostgameEventCandidates(result)
    .map(event => ({ ...event, priority: scorePostgameEvent(event, result) }))
    .filter(event => canRoutePostgameEvent(event, result));
  const forcedEvent = candidates
    .filter(event => event.priority >= POSTGAME_FORCED_MODAL_MIN_PRIORITY && canRoutePostgameEvent(event, result, { force: true }))
    .sort((a, b) => b.priority - a.priority)[0] || null;
  const phoneEvents = candidates.filter(event => event !== forcedEvent).slice(0, 2);
  phoneEvents.forEach(event => {
    if (typeof addPhone === 'function') addPhone(event.from || '球队', `${event.title}：${event.desc}`, 'info');
    recordPostgameEventRoute(event, result, { forced: false });
  });
  if (forcedEvent) recordPostgameEventRoute(forcedEvent, result, { forced: true });
  const suppressedEvents = candidates.filter(event => event !== forcedEvent && !phoneEvents.includes(event));
  if (suppressedEvents.length) {
    state.postgameDirector.suppressedEvents.unshift(...suppressedEvents.map(event => ({
      day: parseNum(result?.day, G.dayNum),
      gameKey,
      type: event.type,
      title: event.title,
      priority: event.priority
    })));
    state.postgameDirector.suppressedEvents = state.postgameDirector.suppressedEvents.slice(0, 30);
  }
  const route = {
    gameKey,
    forcedPrompt: forcedEvent?.prompt || null,
    forcedEventType: forcedEvent?.type || '',
    forcedPriority: forcedEvent?.priority || 0,
    phoneEvents: phoneEvents.map(event => ({ type: event.type, title: event.title, priority: event.priority })),
    suppressedEvents: suppressedEvents.map(event => ({ type: event.type, title: event.title, priority: event.priority })),
    keyPossessionCandidates: buildKeyPossessionCandidates(result)
  };
  route.careerLines = updateCareerLinesAfterGame(result, route);
  route.summary = buildPostgameSummary(result, route);
  state.latestPostgame = route;
  result.postgameRoute = route;
  return route;
}

function applyDailyInteractionChoice(prompt, choiceId, result = null) {
  const type = String(prompt?.type || '').trim();
  if (type === 'coach_conversation') {
    return typeof applyCoachConversationChoice === 'function' ? applyCoachConversationChoice(choiceId) : null;
  }
  if (['teammate_ball_movement', 'teammate_shot_tension', 'veteran_film_session', 'rookie_help_request', 'bench_unit_talk'].includes(type)) {
    return typeof applyTeamDailyPromptChoice === 'function' ? applyTeamDailyPromptChoice(prompt, choiceId, result) : null;
  }
  return typeof applyCoachDailyPromptChoice === 'function' ? applyCoachDailyPromptChoice(prompt, choiceId, result) : null;
}

function applyCoachRelationshipOutcome({ favorDelta = 0, fameDelta = 0, trustDelta = 0, moodDelta = 0, xpDelta = 0, directives = null, source = '', phone = '', news = '', type = 'info' } = {}) {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  if (coach && typeof changeCoachFavorability === 'function') {
    changeCoachFavorability(coach, favorDelta, { season: G.season, teamId: G.teamId });
  }
  if (typeof ensureCoachDynamicsState === 'function') {
    const dynamics = ensureCoachDynamicsState();
    if (directives && typeof directives === 'object') {
      Object.entries(directives).forEach(([key, value]) => {
        if (value == null) return;
        dynamics.directives[key] = parseNum(value, dynamics.directives[key] || -1);
      });
    }
  }
  if (fameDelta || trustDelta) applyReputationDelta({ fame: fameDelta, trust: trustDelta, source: source || '教练关系' });
  if (moodDelta) G.player.mood = clamp(parseNum(G.player.mood, 50) + parseNum(moodDelta, 0), 0, 100);
  if (xpDelta > 0) addPlayerXP(xpDelta);
  if (phone) addPhone(coach?.name || '教练组', phone, type);
  if (news) addNews(news, favorDelta >= 0 ? 'pos' : 'neg');
  return {
    favor: coach ? getCoachFavorability(coach) : 50,
    mood: clamp(parseNum(G.player.mood, 50), 0, 100)
  };
}
function normalizeChosenStatementText(text = '') {
  return String(text || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function buildCoachDailyPrompt(result) {
  if (!result || typeof ensureCoachDynamicsState !== 'function') return null;
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  if (!coach) return null;
  const dynamics = ensureCoachDynamicsState();
  if (parseNum(dynamics.lastDailyPromptDay, -99) === parseNum(result.day, -100)) return null;
  if (result.isGame) {
    const game = result.gameResult || {};
    const mins = parseNum(game?.st?.mins, game?.mins || 0);
    if (mins <= 0) return null;
    const st = game.st || {};
    const margin = Math.abs(parseNum(game.teamPts, 0) - parseNum(game.oppPts, 0));
    const grade = String(game.grade || '').trim();
    const pts = parseNum(game.pts, parseNum(st.pts, 0));
    const tov = parseNum(game.tov, parseNum(st.tov, 0));
    const pf = parseNum(game.pf, parseNum(st.pf, 0));
    const stamina = parseNum(G.player?.stamina, 70);
    const staminaLoss = parseNum(game.staminaLoss, 0);
    const pool = [];
    const pushPrompt = (prompt) => { if (prompt) pool.push(prompt); };
    const spotlight = ['S+', 'S', 'A', 'D', 'F'].includes(grade) || pts >= 28 || (margin <= 6 && mins >= 16);
    if (spotlight) pushPrompt({
      type: 'postgame_interview',
      title: '赛后采访',
      desc: `${coach.name} 希望你在镜头前给出一个明确信号。媒体刚把话筒递到你嘴边。`,
      choices: [
        { id: 'postgame_team_first', title: '先夸团队', detail: '稳住更衣室和教练关系，个人光环会少一点。', badge: '教练好感↑ / 信任↑' },
        { id: 'postgame_usage_complaint', title: '暗示自己该多拿球', detail: '短期更容易抢到球权，但会让教练不舒服。', badge: '球权施压 / 教练好感↓' },
        { id: 'postgame_credit_system', title: '公开支持教练体系', detail: '你会显得更职业，但要接受短期让出一些球权。', badge: '服从体系 / 心情↓' }
      ]
    });
    if (tov >= 4 || pf >= 4 || (parseNum(game.fga, parseNum(st.fga, 0)) >= 18 && parseNum(game.gradeScore, 70) < 70)) pushPrompt({
      type: 'postgame_film_review',
      title: '赛后录像室',
      desc: `${coach.name} 把几个关键回合剪了出来：有些选择会影响之后的战术信任。`,
      choices: [
        { id: 'film_own_turnovers', title: '主动认下决策问题', detail: '承认回合处理不够干净，换取教练耐心。', badge: '教练好感↑ / 信任↑' },
        { id: 'film_blame_spacing', title: '指出空间站位太差', detail: '能推动体系调整，但会让教练觉得你在甩锅。', badge: '球权讨论 / 风险' },
        { id: 'film_request_simple_role', title: '要求下场简化角色', detail: '降低失误风险，但个人展示空间会变小。', badge: '稳定轮换 / 心情↓' }
      ]
    });
    if (stamina <= 45 || staminaLoss >= 10) pushPrompt({
      type: 'postgame_recovery_plan',
      title: '赛后恢复安排',
      desc: `体能组提醒你今晚负荷偏高，${coach.name} 要你在恢复、媒体和加练之间做取舍。`,
      choices: [
        { id: 'recovery_ice_room', title: '完整冰浴和拉伸', detail: '优先保护身体，短期曝光会少一点。', badge: '体力↑ / 伤病风险↓' },
        { id: 'recovery_media_skip', title: '减少媒体停留', detail: '把精力留给球队，但公关团队会少拿素材。', badge: '体力↑ / 声望↓' },
        { id: 'recovery_extra_shooting', title: '坚持赛后加投', detail: '练投篮手感，但疲劳会继续堆积。', badge: 'XP↑ / 体力↓' }
      ]
    });
    if (margin <= 5 && mins >= 18) pushPrompt({
      type: 'postgame_clutch_media',
      title: '关键球追问',
      desc: `记者追问最后两分钟的选择，${coach.name} 也在旁边听着你的回答。`,
      choices: [
        { id: 'clutch_take_blame', title: '承担最后回合责任', detail: '领袖姿态更强，但压力会落到你身上。', badge: '信任↑ / 心情↓' },
        { id: 'clutch_credit_teammates', title: '强调队友执行到位', detail: '更衣室更舒服，个人英雄叙事会淡一点。', badge: '团队↑ / 声望小涨' },
        { id: 'clutch_want_ball', title: '表态下次还要拿球', detail: '会拉高热度，也会让教练更严格看你。', badge: '声望↑ / 教练好感↓' }
      ]
    });
    if (!game.win && (['D', 'F'].includes(grade) || margin >= 12)) pushPrompt({
      type: 'postgame_accountability',
      title: '输球后更衣室收口',
      desc: `输球后的气压很低，${coach.name} 希望有人先把更衣室稳住。`,
      choices: [
        { id: 'accountability_own_room', title: '在更衣室先认责', detail: '队友会更愿意继续听你说话。', badge: '信任↑ / 队友关系↑' },
        { id: 'accountability_quiet_exit', title: '安静离开球馆', detail: '避免说错话，但也错过了止血机会。', badge: '低风险 / 无明显收益' },
        { id: 'accountability_call_out_effort', title: '点出全队强度不够', detail: '可能叫醒球队，也可能制造新的怨气。', badge: '高风险 / 声望↑' }
      ]
    });
    if (!pool.length) return null;
    return pool[(parseNum(result.day, 0) + parseNum(game.game, 0) + pool.length) % pool.length];
  }
  const trained = Array.isArray(result.events) && result.events.some(x => String(x || '').includes('训练'));
  if (!trained) return null;
  return {
    type: 'training_attitude',
    title: '训练态度',
    desc: `${coach.name} 把今天的训练录像递给你，想看你到底愿不愿意按球队方案走。`,
    choices: [
      { id: 'training_extra_film', title: '加练并看录像', detail: '更累，但会被教练视为可靠球员。', badge: '教练好感↑ / XP↑' },
      { id: 'training_me_first', title: '只练自己想打的回合', detail: '短期有利于个人手感，但体系评价会下降。', badge: '球权施压 / 教练好感↓' },
      { id: 'training_system_buyin', title: '按体系跑位和战术', detail: '个人球权会被压一点，但长期更容易吃到体系红利。', badge: '服从体系 / 信任↑' }
    ]
  };
}
function applyCoachDailyPromptChoice(prompt, choiceId, result = null) {
  const promptType = String(prompt?.type || '').trim();
  const id = String(choiceId || '').trim();
  const day = parseNum(G.dayNum, 0);
  if (typeof ensureCoachDynamicsState === 'function') ensureCoachDynamicsState().lastDailyPromptDay = parseNum(result?.day, day);
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  const coachName = coach?.name || '教练';
  if (promptType === 'postgame_interview') {
    const game = result?.gameResult || {};
    if (id === 'postgame_team_first') {
      applyCoachRelationshipOutcome({
        favorDelta: game.win ? 4 : 3,
        trustDelta: 2,
        fameDelta: 1,
        moodDelta: -1,
        source: '赛后采访：强调团队',
        phone: `你在采访里先讲球队和执行力，这种表态我会记住。`,
        news: `🎙️ ${G.player.name} 赛后把功劳先让给球队和教练组，更衣室气氛稳定。`
      });
      return { ok: true, text: `你把话题压回团队，${coachName} 对你的职业态度更满意。` };
    }
    if (id === 'postgame_usage_complaint') {
      applyCoachRelationshipOutcome({
        favorDelta: parseNum(game.pts, 0) >= 30 ? -5 : -7,
        trustDelta: -2,
        fameDelta: 2,
        moodDelta: 1,
        directives: { usageDemandUntilDay: day + 6 },
        source: '赛后采访：暗示球权不够',
        phone: `媒体会放大你的发言。既然你想要更多球权，我也会更严格看你的选择。`,
        news: `🎙️ ${G.player.name} 在采访中暗示自己该获得更多球权，外界开始讨论他与教练组的张力。`,
        type: 'warn'
      });
      return { ok: true, text: `你公开给了教练组压力，短期会更容易拿到球，但关系也变紧了。` };
    }
    applyCoachRelationshipOutcome({
      favorDelta: 6,
      trustDelta: 1,
      moodDelta: -2,
      directives: { buyInUntilDay: day + 7 },
      source: '赛后采访：公开支持体系',
      phone: `你替体系说话，这能让整个更衣室更容易接受我们的打法。`,
      news: `🎙️ ${G.player.name} 赛后公开为教练体系背书，球队内部执行力预期走高。`
    });
    return { ok: true, text: `你把功劳让给体系，教练会更愿意长期重用你。` };
  }
  if (promptType === 'postgame_film_review') {
    const game = result?.gameResult || {};
    if (id === 'film_own_turnovers') {
      applyCoachRelationshipOutcome({
        favorDelta: 4,
        trustDelta: 2,
        moodDelta: -1,
        xpDelta: 2,
        directives: { buyInUntilDay: day + 5 },
        source: '赛后录像：主动认责',
        phone: '你愿意先认回合选择的问题，这比空喊口号有用。下场我会看你的调整。',
        type: 'info'
      });
      return { ok: true, text: '你把几个失误先认下来，教练组更愿意继续给你处理球的耐心。' };
    }
    if (id === 'film_blame_spacing') {
      applyCoachRelationshipOutcome({
        favorDelta: -3,
        trustDelta: -1,
        fameDelta: 1,
        moodDelta: 1,
        directives: { usageDemandUntilDay: day + 4 },
        source: '赛后录像：质疑空间',
        phone: '空间问题可以谈，但别把每个回合都推给队友。先把你自己的选择做干净。',
        news: `📹 ${G.player.name} 赛后录像会中提到球队空间问题，外界开始讨论他的战术诉求。`,
        type: 'warn'
      });
      return { ok: true, text: '你把问题指向了空间和站位，战术话题升温，但教练关系变得更敏感。' };
    }
    applyCoachRelationshipOutcome({
      favorDelta: 3,
      trustDelta: 1,
      moodDelta: -1,
      directives: { buyInUntilDay: day + 4 },
      source: '赛后录像：简化角色',
      phone: '你愿意先把角色做简单，这会帮助我们减少无谓失误。',
      type: 'info'
    });
    return { ok: true, text: `你选择先简化角色，下场失误风险会被压低，但个人展示空间也会收窄。` };
  }
  if (promptType === 'postgame_recovery_plan') {
    if (id === 'recovery_ice_room') {
      G.player.stamina = clamp(parseNum(G.player.stamina, 100) + 8, 0, 100);
      applyCoachRelationshipOutcome({
        favorDelta: 2,
        trustDelta: 1,
        fameDelta: -1,
        source: '赛后恢复：完整恢复',
        phone: '今天先把身体救回来。能长期出战，比多站十分钟采访区更重要。',
        type: 'info'
      });
      return { ok: true, text: '你把恢复放在第一位，体力回升，但当天曝光少了一些。' };
    }
    if (id === 'recovery_media_skip') {
      G.player.stamina = clamp(parseNum(G.player.stamina, 100) + 5, 0, 100);
      applyCoachRelationshipOutcome({
        favorDelta: 1,
        trustDelta: 1,
        fameDelta: -2,
        source: '赛后恢复：减少媒体',
        phone: '少说话不是坏事，尤其是身体已经报警的时候。',
        type: 'info'
      });
      return { ok: true, text: '你减少媒体停留，把精力留给恢复；公关热度下降，但身体状态更稳。' };
    }
    G.player.stamina = clamp(parseNum(G.player.stamina, 100) - 6, 0, 100);
    applyCoachRelationshipOutcome({
      favorDelta: -1,
      trustDelta: 0,
      moodDelta: 1,
      xpDelta: 4,
      source: '赛后恢复：坚持加投',
      phone: '肯练是好事，但别把疲劳当成荣誉。训练组明天会盯着你。',
      type: 'warn'
    });
    return { ok: true, text: '你坚持赛后加投，手感课题推进了，但体能压力继续堆积。' };
  }
  if (promptType === 'postgame_clutch_media') {
    if (id === 'clutch_take_blame') {
      applyCoachRelationshipOutcome({
        favorDelta: 3,
        trustDelta: 2,
        fameDelta: 1,
        moodDelta: -1,
        source: '关键球采访：主动担责',
        phone: '你愿意把关键回合扛下来，这就是球队核心该有的样子。',
        news: `🎙️ ${G.player.name} 赛后主动承担关键回合责任，球队内部对他的领袖姿态评价上升。`
      });
      return { ok: true, text: '你把最后回合的压力接到自己身上，信任和领袖评价上升。' };
    }
    if (id === 'clutch_want_ball') {
      applyCoachRelationshipOutcome({
        favorDelta: -4,
        trustDelta: -1,
        fameDelta: 2,
        moodDelta: 1,
        directives: { usageDemandUntilDay: day + 5 },
        source: '关键球采访：要求拿球',
        phone: '你想投关键球，我听到了。下一次，你也要承担对应的阅读要求。',
        news: `🔥 ${G.player.name} 表态下次关键时刻还想拿球，社媒对他的核心定位讨论升温。`,
        type: 'warn'
      });
      return { ok: true, text: '你把关键球诉求公开说出来，热度上升，教练也会更严格看你。' };
    }
    applyCoachRelationshipOutcome({
      favorDelta: 2,
      trustDelta: 1,
      fameDelta: 1,
      source: '关键球采访：强调队友',
      phone: '你没有把关键回合讲成个人秀，这会让更衣室舒服很多。',
      type: 'info'
    });
    return { ok: true, text: '你把焦点分给队友，个人热度少一点，但更衣室反馈更稳定。' };
  }
  if (promptType === 'postgame_accountability') {
    if (id === 'accountability_own_room') {
      applyCoachRelationshipOutcome({
        favorDelta: 4,
        trustDelta: 2,
        moodDelta: -1,
        source: '输球收口：更衣室认责',
        phone: '输球后愿意先把责任接住，队友才会继续听你说下一句。',
        news: `🧩 ${G.player.name} 输球后在更衣室先认责，球队内部情绪暂时稳住。`
      });
      return { ok: true, text: '你先在更衣室认责，输球后的内部情绪被压住了一部分。' };
    }
    if (id === 'accountability_call_out_effort') {
      applyCoachRelationshipOutcome({
        favorDelta: -3,
        trustDelta: -2,
        fameDelta: 2,
        moodDelta: 1,
        source: '输球收口：点名强度',
        phone: '你说的是不是事实不重要，重要的是更衣室会不会觉得你把问题抛给了所有人。',
        news: `⚠️ ${G.player.name} 输球后公开提到球队强度问题，更衣室气压继续升高。`,
        type: 'warn'
      });
      return { ok: true, text: '你点出了全队强度问题，外界会讨论，但更衣室风险也被拉高。' };
    }
    applyCoachRelationshipOutcome({
      favorDelta: 0,
      trustDelta: 0,
      moodDelta: 1,
      source: '输球收口：安静离开',
      phone: '安静离开能避免说错话，但有些时候球队也需要有人先开口。',
      type: 'info'
    });
    return { ok: true, text: '你选择安静离开，风险很低，但这次输球没有得到额外修复。' };
  }
  if (promptType === 'training_attitude') {
    if (id === 'training_extra_film') {
      applyCoachRelationshipOutcome({
        favorDelta: 5,
        trustDelta: 1,
        moodDelta: -2,
        xpDelta: 3,
        directives: { buyInUntilDay: day + 5 },
        source: '训练态度：主动加练',
        phone: `你今天把录像室坐满了。累是累，但这种态度会直接反映在轮换里。`,
        type: 'info'
      });
      return { ok: true, text: `你把训练强度拉满，教练组会把你视为更可靠的执行点。` };
    }
    if (id === 'training_me_first') {
      applyCoachRelationshipOutcome({
        favorDelta: -4,
        trustDelta: -1,
        moodDelta: 1,
        xpDelta: 2,
        directives: { usageDemandUntilDay: day + 4 },
        source: '训练态度：只练个人回合',
        phone: `你练了很多自己喜欢的东西，但对团队战术帮助有限。`,
        type: 'warn'
      });
      return { ok: true, text: `你更偏向练自己的进攻包，手感可能更顺，但教练会下调体系评价。` };
    }
    applyCoachRelationshipOutcome({
      favorDelta: 4,
      trustDelta: 2,
      moodDelta: -1,
      directives: { buyInUntilDay: day + 6 },
      source: '训练态度：服从体系',
      phone: `你今天完全按球队要求跑位，这会让之后的战术待遇更稳定。`,
      type: 'info'
    });
    return { ok: true, text: `你老老实实按体系训练，教练对你的信任更高了。` };
  }
  return { ok: false, text: '没有发生额外变化。' };
}
function buildCoachConversationPrompt() {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  if (!coach) return null;
  const rotation = typeof ensureGameRotation === 'function' ? ensureGameRotation() : [];
  const self = rotation.find(p => p?.isSelf || String(p?.id || '') === 'USER_SELF') || null;
  const isStarter = String(self?.rotationRole || '') === 'starter';
  const starterLabel = isStarter ? '要求更多核心回合' : '要求首发位置';
  return {
    type: 'coach_conversation',
    title: '教练沟通',
    desc: `${coach.name} 愿意听你一次正面表达诉求，但这次沟通会留下代价。`,
    choices: [
      { id: 'complain_usage', title: '抱怨球权', detail: '短期更容易拿到出手，但教练好感和信任会掉。', badge: '球权施压 / 教练好感↓' },
      { id: 'demand_start', title: starterLabel, detail: '你可能抢到更多分钟，但会明显冒犯教练权威。', badge: '首发施压 / 风险高' },
      { id: 'obey_system', title: '服从体系', detail: '短期要牺牲个人触球，但会换来更高信任。', badge: '服从体系 / 教练好感↑' }
    ]
  };
}
function applyCoachConversationChoice(choiceId) {
  const id = String(choiceId || '').trim();
  const day = parseNum(G.dayNum, 0);
  if (typeof ensureCoachDynamicsState === 'function') ensureCoachDynamicsState().lastConversationDay = day;
  if (id === 'complain_usage') {
    applyCoachRelationshipOutcome({
      favorDelta: -7,
      trustDelta: -3,
      moodDelta: 2,
      directives: { usageDemandUntilDay: day + 8 },
      source: '教练沟通：抱怨球权',
      phone: `你想要更多球，我听到了。但从现在开始，我也会更严苛地要求你。`,
      news: `🗣️ ${G.player.name} 被曝私下向教练组表达过对球权分配的不满。`,
      type: 'warn'
    });
    return { ok: true, text: '你把球权问题摊开了说，短期战术地位会上浮，但教练关系明显变差。' };
  }
  if (id === 'demand_start') {
    applyCoachRelationshipOutcome({
      favorDelta: -9,
      trustDelta: -4,
      moodDelta: 1,
      directives: { startingDemandUntilDay: day + 10 },
      source: '教练沟通：要求更大位置',
      phone: `你已经把立场说得很清楚了。短期我会重新审视轮换，但这不是免费的。`,
      news: `🗣️ ${G.player.name} 向教练组明确表达了自己想要更大位置的态度。`,
      type: 'warn'
    });
    return { ok: true, text: '你直接要求更大位置，分钟可能短暂上涨，但关系代价也最大。' };
  }
  applyCoachRelationshipOutcome({
    favorDelta: 6,
    trustDelta: 2,
    moodDelta: -2,
    directives: { buyInUntilDay: day + 10, usageDemandUntilDay: -1, startingDemandUntilDay: -1 },
    source: '教练沟通：服从体系',
    phone: `你愿意按体系来，我就更愿意把稳定的轮换和关键时间给你。`,
    news: `🤝 ${G.player.name} 与教练组沟通后选择先服从球队体系。`,
    type: 'info'
  });
  return { ok: true, text: '你选择先服从体系，短期数据未必最好看，但教练关系会明显回暖。' };
}
function leaguePlayerKey(teamId, playerId, isSelf = false) {
  return isSelf ? 'USER_SELF' : `${teamId}_${playerId}`;
}
function emptySeasonLine(teamId, playerId, name, pos, isSelf = false) {
  return {
    key: leaguePlayerKey(teamId, playerId, isSelf),
    teamId,
    playerId,
    name: name || 'Player',
    pos: parseNum(pos, 3),
    isSelf,
    yearsLeague: -1,
    rookie: false,
    draft: 0,
    draftPick: 0,
    gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, mins: 0,
    shotDiagnosticGames: 0, usageShareTotal: 0, comfortUsageRateTotal: 0, expectedThreePctTotal: 0, volumePenaltyTotal: 0, tpaCapTotal: 0, tpaCapHits: 0
  };
}
function ensureLeagueStateShape() {
  if (!G.leagueSeason || typeof G.leagueSeason !== 'object') {
    G.leagueSeason = { round: 0, teamRecords: {}, playerStats: {}, roundSchedule: [], roundMatchups: [], teamGameLogs: {}, gameDetails: [] };
  }
  if (!G.leagueSeason.teamRecords) G.leagueSeason.teamRecords = {};
  if (!G.leagueSeason.playerStats) G.leagueSeason.playerStats = {};
  if (!Array.isArray(G.leagueSeason.roundSchedule)) G.leagueSeason.roundSchedule = [];
  if (!Array.isArray(G.leagueSeason.roundMatchups)) G.leagueSeason.roundMatchups = [];
  if (!G.leagueSeason.teamGameLogs) G.leagueSeason.teamGameLogs = {};
  if (!Array.isArray(G.leagueSeason.gameDetails)) G.leagueSeason.gameDetails = [];
  if (!Number.isFinite(G.leagueSeason.round)) G.leagueSeason.round = 0;
}

// ============ 天数模拟系统 (APK风格) ============
function generateGameDays() {
  // 将赛季比赛均匀分布在180天内
  const days = [];
  const total = getSeasonGameCount();
  const seasonLen = G.seasonDays || 180;
  const gap = seasonLen / total;
  for (let i = 0; i < total; i++) {
    days.push(Math.floor(i * gap + rng(0, 1)));
  }
  // 去重排序
  G.gameDays = [...new Set(days)].sort((a, b) => a - b);
  // 确保有82天比赛
  while (G.gameDays.length < total) {
    const last = G.gameDays[G.gameDays.length - 1] || 0;
    if (last + 1 < seasonLen && !G.gameDays.includes(last + 1)) G.gameDays.push(last + 1);
    else if (last + 2 < seasonLen && !G.gameDays.includes(last + 2)) G.gameDays.push(last + 2);
    else break;
    G.gameDays.sort((a, b) => a - b);
  }
  return G.gameDays;
}

function getDayDateString(dayNum) {
  // 赛季从10月开始，dayNum=0对应10月1日
  const startMonth = 10;
  const base = new Date(G.year, startMonth - 1, 1);
  base.setDate(base.getDate() + dayNum);
  return `${base.getMonth() + 1}月${base.getDate()}日`;
}

function getNextGameDay() {
  for (let i = 0; i < G.gameDays.length; i++) {
    if (G.gameDays[i] >= G.dayNum) return G.gameDays[i];
  }
  return -1; // 赛季结束
}

function isGameDay(dayNum) {
  return G.gameDays.includes(dayNum);
}

function simulateDay() {
  if (G.dayNum >= G.seasonDays) return { type: 'seasonEnd' };
  ensureEconomyState();
  decayCommercialMomentum();
  const ecoFx = getEconomyEffects();

  const isGame = isGameDay(G.dayNum);
  const result = { day: G.dayNum, date: getDayDateString(G.dayNum), isGame, events: [] };

  if (isGame && G.gameNum < getSeasonGameCount()) {
    // 比赛日
    const gameRes = playGame(G.gameNum);
    result.gameResult = gameRes;
    result.gameEvent = gameRes?.gameEvent || G._gameEventResult || null;
    if (typeof buildMatchupContext === 'function') {
      result.matchup = buildMatchupContext(result, { limit: 3 });
    }
    result.events.push(`⚔️ 联盟第${G.gameNum}轮已结算（${gameRes?.leagueGameCount || 1}场比赛）`);
    const postRecovery = recoverStamina({ rest: false, ecoFx });
    result.events.push(`🔋 赛后恢复 +${postRecovery}`);
  } else {
    // 休息日
    const staminaRec = recoverStamina({ rest: true, ecoFx });
    result.events.push(`😴 休息日，体力+${staminaRec}`);
    // 训练获得少量XP
    if (Math.random() < 0.4) {
      const xp = rng(2, 6);
      addPlayerXP(xp);
      result.events.push(`🏋️ 训练，XP+${xp}`);
    }
  }

  // All-Star break check
  if (typeof checkAllStarBreak === 'function') {
    const asResult = checkAllStarBreak();
    if (asResult) {
      result.events.push(asResult);
      result.allStar = asResult;
    }
  }

  // 每日运行交易与续约系统
  if (typeof settleEndorsementIncome === 'function') settleEndorsementIncome(result);
  maybeTriggerCommercialOpportunity(result);
  if (typeof tryAITrade === 'function') tryAITrade();
  if (typeof tryAIRenewal === 'function') tryAIRenewal();
  if (typeof triggerTradeRequest === 'function') triggerTradeRequest();
  if (typeof checkPlayerRenewal === 'function') checkPlayerRenewal();

  G.dayNum++;
  return result;
}

function simulateDays(count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    if (G.dayNum >= G.seasonDays) break;
    if (G.gameNum >= getSeasonGameCount()) break;
    const res = simulateDay();
    results.push(res);
    // 如果有待处理事件，中断
    if (res.hasEvent) break;
  }
  return results;
}

function skipToNextGame() {
  const nextGame = getNextGameDay();
  if (nextGame < 0) return [];
  const daysToSkip = nextGame - G.dayNum;
  if (daysToSkip <= 0) return simulateDays(1);
  return simulateDays(daysToSkip);
}

// ============ AUTO CAREER SIMULATION ============
const AUTO_CAREER_LLM_STORAGE_KEY = 'nba_auto_career_llm_config_v1';
const AUTO_CAREER_HISTORY_STORAGE_KEY = 'nba_historical_top100_archive_v1';
const HISTORICAL_TOP100_VERSION = 4;
const HISTORICAL_LEGACY_FORMULA_VERSION = 5;
const AUTO_CAREER_WEEKLY_FIELDS = ['headline', 'weeklyStory', 'leagueNotes', 'tradeNotes', 'endorsementNotes', 'playerArc', 'rankNarrative'];
const AUTO_CAREER_RETIREMENT_FIELDS = ['media', 'players', 'fans', 'critics', 'magazine', 'legacyCommittee', 'finalMessage'];

function makeAutoCareerId() {
  const stamp = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `career_${stamp}_${rnd}`;
}

function defaultAutoCareerState() {
  return {
    mode: 'auto',
    careerId: makeAutoCareerId(),
    weekIndex: 0,
    llmConfig: { baseURL: '', model: '', apiKey: '', temperature: 0.75, maxTokens: 1800 },
    weeklyReports: [],
    autoDecisionLog: [],
    developmentLedger: { carry: 0, lastOvr: null, appliedWeeks: 0, lastAnnualTarget: 0 },
    historyArchiveMeta: { fileName: 'historical_top100.json', loaded: false, currentRank: null, lastExportAt: null },
    lastError: null
  };
}

function AutoCareerState() {
  return defaultAutoCareerState();
}

function createDefaultHistoricalArchive() {
  const updatedAt = new Date().toISOString();
  const asOfYear = parseNum(G.startYear, G.year || 2025);
  const eraEntries = typeof getHistoricalEraEntries === 'function' ? getHistoricalEraEntries(asOfYear) : [];
  const entries = (Array.isArray(eraEntries) ? eraEntries : []).map((entry, idx) => ({
    ...entry,
    id: entry.id || entry.realId || `historical-${String(idx + 1).padStart(3, '0')}`,
    source: entry.source || 'historical_db',
    rank: idx + 1,
    retired: entry.retired !== false,
    honors: normalizeUserHonorCounter(entry.honors || null),
    honorSummary: buildPlayerHonorsSummary(normalizeUserHonorCounter(entry.honors || null)),
    honorSeasons: Array.isArray(entry.honorSeasons) ? entry.honorSeasons : [],
    honorSource: entry.honorSource || entry.source || 'historical_db',
    asOfYear: entry.asOfYear || asOfYear,
    updatedAt
  }));
  const eraRankings = {};
  if (typeof getHistoricalEraEntries === 'function') {
    const supported = LEAGUE?.historicalDb?.manifest?.supportedStartYears || [];
    supported.forEach(year => {
      const list = getHistoricalEraEntries(year);
      if (Array.isArray(list) && list.length) eraRankings[year] = list;
    });
  }
  return {
    version: HISTORICAL_TOP100_VERSION,
    updatedAt,
    entries,
    eraRankings,
    generatedRankings: { source: 'historical_db', generatedAt: updatedAt, formulaVersion: HISTORICAL_LEGACY_FORMULA_VERSION },
    retiredUserCareers: []
  };
}

function safeJsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeHistoricalEntry(entry = {}, idx = 0) {
  const source = String(entry.source || (entry.careerId ? 'user' : 'historical_db')).trim() || 'historical_db';
  const id = String(entry.id || entry.careerId || `${source}-${idx + 1}`).trim();
  const name = String(entry.name || entry.displayName || 'Unknown Career').trim();
  const honors = normalizeUserHonorCounter(entry.honors || null);
  const honorSeasons = normalizeHistoricalHonorSeasons(entry.honorSeasons || entry.awardSeasons || []);
  return {
    ...entry,
    id,
    source,
    name,
    displayName: String(entry.displayName || name).trim(),
    legacyScore: +parseNum(entry.legacyScore, 0).toFixed(1),
    peakScore: +parseNum(entry.peakScore, 0).toFixed(1),
    rank: Math.max(1, Math.round(parseNum(entry.rank, idx + 1))),
    retired: entry.retired !== false,
    honors,
    honorSummary: buildPlayerHonorsSummary(honors),
    honorSeasons,
    honorSource: String(entry.honorSource || (source === 'user' ? 'game_awards' : source)),
    updatedAt: String(entry.updatedAt || new Date().toISOString())
  };
}

function normalizeHistoricalArchive(raw = null) {
  const seed = createDefaultHistoricalArchive();
  const src = raw && typeof raw === 'object' ? raw : seed;
  const shouldRefreshGeneratedRankings = parseNum(src.generatedRankings?.formulaVersion, 0) < HISTORICAL_LEGACY_FORMULA_VERSION;
  const userCareers = Array.isArray(src.retiredUserCareers)
    ? src.retiredUserCareers.map(normalizeHistoricalEntry)
    : [];
  const entries = !shouldRefreshGeneratedRankings && Array.isArray(src.entries) && src.entries.length
    ? src.entries.map(normalizeHistoricalEntry)
    : seed.entries;
  const byId = new Map();
  [...entries, ...userCareers].forEach((entry, idx) => {
    const normalized = normalizeHistoricalEntry(entry, idx);
    byId.set(normalized.id, normalized);
  });
  const sorted = Array.from(byId.values())
    .sort((a, b) => parseNum(b.legacyScore, 0) - parseNum(a.legacyScore, 0) || String(a.name).localeCompare(String(b.name)));
  sorted.forEach((entry, idx) => { entry.rank = idx + 1; });
  const retiredUserCareers = sorted.filter(entry => entry.source === 'user' || entry.careerId);
  const eraRankings = !shouldRefreshGeneratedRankings && (src.eraRankings && typeof src.eraRankings === 'object')
    ? src.eraRankings
    : (seed.eraRankings || {});
  return {
    version: Math.max(parseNum(src.version, HISTORICAL_TOP100_VERSION), HISTORICAL_TOP100_VERSION),
    updatedAt: String(src.updatedAt || new Date().toISOString()),
    entries: sorted.slice(0, 100),
    eraRankings,
    generatedRankings: {
      ...(shouldRefreshGeneratedRankings ? seed.generatedRankings : (src.generatedRankings || seed.generatedRankings || {})),
      formulaVersion: HISTORICAL_LEGACY_FORMULA_VERSION
    },
    retiredUserCareers
  };
}

function loadHistoricalArchiveFromStorage() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTO_CAREER_HISTORY_STORAGE_KEY);
    if (!raw) return null;
    return normalizeHistoricalArchive(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

function saveHistoricalArchiveToStorage(archive = null) {
  const data = normalizeHistoricalArchive(archive || G.historicalTop100);
  G.historicalTop100 = data;
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(AUTO_CAREER_HISTORY_STORAGE_KEY, JSON.stringify(data)); } catch (e) { }
  }
  return data;
}

function loadAutoCareerLLMConfigFromStorage() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTO_CAREER_LLM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function normalizeLLMConfig(config = {}) {
  return {
    baseURL: String(config.baseURL || '').trim(),
    model: String(config.model || '').trim(),
    apiKey: String(config.apiKey || '').trim(),
    temperature: clamp(parseNum(config.temperature, 0.75), 0, 2),
    maxTokens: clamp(Math.round(parseNum(config.maxTokens, 1800)), 300, 8000)
  };
}

function ensureAutoCareerState() {
  const defaults = defaultAutoCareerState();
  if (!G.autoCareer || typeof G.autoCareer !== 'object') {
    G.autoCareer = defaults;
  } else {
    G.autoCareer = {
      ...defaults,
      ...G.autoCareer,
      llmConfig: normalizeLLMConfig({ ...defaults.llmConfig, ...(G.autoCareer.llmConfig || {}) }),
      weeklyReports: Array.isArray(G.autoCareer.weeklyReports) ? G.autoCareer.weeklyReports : [],
      autoDecisionLog: Array.isArray(G.autoCareer.autoDecisionLog) ? G.autoCareer.autoDecisionLog : [],
      developmentLedger: { ...defaults.developmentLedger, ...(G.autoCareer.developmentLedger || {}) },
      historyArchiveMeta: { ...defaults.historyArchiveMeta, ...(G.autoCareer.historyArchiveMeta || {}) }
    };
  }
  G.autoCareer.mode = 'auto';
  if (!G.autoCareer.careerId) G.autoCareer.careerId = makeAutoCareerId();
  if (!G.autoCareer._loadedLocalLLMConfig) {
    const saved = loadAutoCareerLLMConfigFromStorage();
    if (saved) G.autoCareer.llmConfig = normalizeLLMConfig({ ...G.autoCareer.llmConfig, ...saved });
    G.autoCareer._loadedLocalLLMConfig = true;
  }
  if (!G.historicalTop100 || typeof G.historicalTop100 !== 'object' || !Array.isArray(G.historicalTop100.entries)) {
    G.historicalTop100 = loadHistoricalArchiveFromStorage() || createDefaultHistoricalArchive();
  }
  G.historicalTop100 = normalizeHistoricalArchive(G.historicalTop100);
  G.autoCareer.historyArchiveMeta.loaded = true;
  return G.autoCareer;
}

function isAutoCareerMode() {
  return !!G.autoCareer || G.phase === 'season';
}

function getAutoCareerLLMConfig() {
  return normalizeLLMConfig(ensureAutoCareerState().llmConfig || {});
}

function saveAutoCareerLLMConfig(config = {}, remember = true) {
  const state = ensureAutoCareerState();
  state.llmConfig = normalizeLLMConfig({ ...state.llmConfig, ...config });
  if (remember && typeof localStorage !== 'undefined') {
    try { localStorage.setItem(AUTO_CAREER_LLM_STORAGE_KEY, JSON.stringify(state.llmConfig)); } catch (e) { }
  }
  return state.llmConfig;
}

function hasAutoCareerLLMConfig() {
  if (typeof window !== 'undefined' && typeof window.__autoCareerLLMMock === 'function') return true;
  const cfg = getAutoCareerLLMConfig();
  return !!(cfg.baseURL && cfg.model && cfg.apiKey);
}

function getAutoCareerLLMConfigStatus() {
  const cfg = getAutoCareerLLMConfig();
  return {
    ok: hasAutoCareerLLMConfig(),
    baseURL: cfg.baseURL,
    model: cfg.model,
    hasApiKey: !!cfg.apiKey,
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens
  };
}

function buildOpenAICompatibleUrl(baseURL = '') {
  const base = String(baseURL || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  if (/^https?:\/\/api\.openai\.com$/i.test(base)) return `${base}/v1/chat/completions`;
  return `${base}/chat/completions`;
}

function summarizeLLMResponseText(text = '', max = 180) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function looksLikeHtmlResponse(text = '') {
  const trimmed = String(text || '').trim();
  return /^<!doctype html\b/i.test(trimmed)
    || /^<html\b/i.test(trimmed)
    || /^<head\b/i.test(trimmed)
    || /^<body\b/i.test(trimmed);
}

function buildLLMHtmlResponseError(prefix = 'LLM 接口返回 HTML 页面', text = '') {
  const suffix = summarizeLLMResponseText(text);
  const err = new Error(`${prefix}，不是 OpenAI 兼容 JSON。请检查 baseURL 是否为 API 根地址，例如 https://api.openai.com/v1 或兼容服务的 /v1；不要填写官网、控制台、模型列表网页或需要登录的反代页面。${suffix ? ` 响应片段：${suffix}` : ''}`);
  err.code = 'llm_html_response';
  return err;
}

function parseStrictJson(content) {
  if (content && typeof content === 'object') return content;
  const text = String(content || '').trim();
  if (!text) throw new Error('LLM returned empty content');
  if (looksLikeHtmlResponse(text)) throw buildLLMHtmlResponseError('LLM 返回的是 HTML/网页内容', text);
  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error(`LLM 返回内容不是合法 JSON：${e.message}。请确认模型只返回 JSON 对象，不要 Markdown 或解释。响应片段：${summarizeLLMResponseText(text)}`);
    err.code = 'llm_invalid_json';
    throw err;
  }
}

function requireLLMJsonFields(payload, fields, taskName) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error(`${taskName} must return a JSON object`);
  const out = {};
  fields.forEach(field => {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) throw new Error(`${taskName} missing field: ${field}`);
    const value = payload[field];
    if (Array.isArray(value)) out[field] = value.map(item => String(item ?? '').trim()).filter(Boolean);
    else out[field] = String(value ?? '').trim();
  });
  return out;
}

function buildAutoCareerLLMResponseContract(task, schemaFields = []) {
  if (task === 'draft_media_prediction') {
    return {
      type: 'json_object',
      required: AUTO_CAREER_DRAFT_MEDIA_FIELDS,
      arrays: {
        expertMocks: '2-4 strings; media/outlet mock draft predictions',
        latestBuzz: '2-4 strings; fresh draft-night rumors, workouts, team-interest updates, or stock movement',
        fanTalk: '2-4 strings; fan reactions or social discussion',
        strengths: '2-5 strings',
        weaknesses: '1-4 strings'
      },
      strings: ['headline', 'summary', 'consensus', 'projection', 'comparable', 'story'],
      latestBuzzRule: 'latestBuzz must be a JSON array of non-empty displayable strings, not an empty string, null, object, or Markdown paragraph.'
    };
  }
  return {
    type: 'json_object',
    required: schemaFields,
    strings: schemaFields
  };
}

function buildAutoCareerSystemPrompt(task) {
  const taskName = task === 'retirement'
    ? '退役结算'
    : (task === 'draft_media_prediction' ? '选秀前夜媒体预测' : '自动生涯周报');
  const lines = [
    `你是一个严谨的NBA生涯纪录片编剧，正在生成${taskName}。`,
    '只返回一个合法 JSON 对象，不要 Markdown，不要代码块，不要解释。',
    '只能使用用户事实包里的比分、荣誉、交易、伤病、代言和排名。',
    '不得编造未给出的比分、荣誉、交易、DNP表现、伤病、合同或冠军。',
    '允许对事实进行评论、解读、引用式评价和时代氛围描写，但必须与事实一致。'
  ];
  if (task === 'draft_media_prediction') {
    lines.push('这是选秀大会开始前的媒体预测，不得把最终顺位、最终球队或未来生涯写成已经发生；只能使用“预测、模拟、传闻、可能、行情”等表达。');
    lines.push('draft_media_prediction 必须把 expertMocks、latestBuzz、fanTalk、strengths、weaknesses 返回为 JSON 字符串数组。latestBuzz 至少 2 条，内容应是试训反馈、球队兴趣、行情变化或消息源动态，不能是空字符串、对象、Markdown 列表或解释文字。');
  }
  return lines.join('\n');
}

async function callAutoCareerLLM(task, factPacket, schemaFields) {
  const mock = typeof window !== 'undefined' && typeof window.__autoCareerLLMMock === 'function'
    ? window.__autoCareerLLMMock
    : null;
  if (mock) {
    return parseStrictJson(await mock(task, factPacket, schemaFields));
  }
  const cfg = getAutoCareerLLMConfig();
  if (!hasAutoCareerLLMConfig()) {
    const err = new Error('缺少 LLM 配置：请在设置中填写 baseURL、model 和 apiKey。');
    err.code = 'llm_missing';
    throw err;
  }
  const url = buildOpenAICompatibleUrl(cfg.baseURL);
  const messages = [
    { role: 'system', content: buildAutoCareerSystemPrompt(task) },
    {
      role: 'user',
      content: JSON.stringify({
        task,
        requiredJsonFields: schemaFields,
        responseContract: buildAutoCareerLLMResponseContract(task, schemaFields),
        facts: factPacket
      })
    }
  ];
  const requestBody = {
    model: cfg.model,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    response_format: { type: 'json_object' },
    messages
  };
  const send = async (body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify(body)
    });
    const rawText = await res.text();
    if (!res.ok) {
      const detail = summarizeLLMResponseText(rawText);
      const htmlHint = looksLikeHtmlResponse(rawText) ? '；接口返回 HTML，通常是 baseURL 填到了网页地址、代理登录页或网关错误页' : '';
      const err = new Error(`LLM request failed: HTTP ${res.status}${htmlHint}${detail ? `：${detail}` : ''}`);
      err.code = 'llm_http_error';
      throw err;
    }
    if (looksLikeHtmlResponse(rawText)) throw buildLLMHtmlResponseError('LLM 接口返回 HTML 页面', rawText);
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      const err = new Error(`LLM 接口响应不是 JSON：${e.message}。请检查 baseURL 是否指向 OpenAI 兼容 API，而不是网页地址。响应片段：${summarizeLLMResponseText(rawText)}`);
      err.code = 'llm_response_not_json';
      throw err;
    }
    const content = data?.choices?.[0]?.message?.content;
    if (content == null) {
      const err = new Error(`LLM 接口响应缺少 choices[0].message.content。请确认服务兼容 OpenAI chat/completions。响应片段：${summarizeLLMResponseText(rawText)}`);
      err.code = 'llm_bad_schema';
      throw err;
    }
    return content;
  };
  const firstContent = await send(requestBody);
  try {
    return parseStrictJson(firstContent);
  } catch (firstErr) {
    const repairBody = {
      ...requestBody,
      messages: [
        ...messages,
        { role: 'assistant', content: String(firstContent || '') },
        { role: 'user', content: `上一次不是合法 JSON 或字段不完整。请只返回包含这些字段的 JSON：${schemaFields.join(', ')}。字段类型契约：${JSON.stringify(buildAutoCareerLLMResponseContract(task, schemaFields))}` }
      ]
    };
    const repaired = await send(repairBody);
    return parseStrictJson(repaired);
  }
}

function createAutoCareerSnapshot() {
  const leagueRootHandle = LEAGUE.rootHandle || null;
  const leagueSnapshot = {
    loaded: LEAGUE.loaded,
    teams: LEAGUE.teams,
    coaches: LEAGUE.coaches,
    rookieCatalog: LEAGUE.rookieCatalog,
    loadError: LEAGUE.loadError,
    rookiesBySeason: LEAGUE.rookiesBySeason,
    namesPool: LEAGUE.namesPool,
    availableScriptYears: LEAGUE.availableScriptYears,
    historicalDb: LEAGUE.historicalDb,
    years: LEAGUE.years
  };
  return { G: safeJsonClone(G), LEAGUE: safeJsonClone(leagueSnapshot), leagueRootHandle };
}

function restoreAutoCareerSnapshot(snapshot) {
  if (!snapshot || !snapshot.G) return;
  Object.keys(G).forEach(key => { delete G[key]; });
  Object.assign(G, safeJsonClone(snapshot.G));
  if (typeof globalThis !== 'undefined') globalThis.G = G;
  if (snapshot.LEAGUE) {
    const rootHandle = snapshot.leagueRootHandle || LEAGUE.rootHandle || null;
    Object.keys(LEAGUE).forEach(key => { if (key !== 'rootHandle') delete LEAGUE[key]; });
    Object.assign(LEAGUE, safeJsonClone(snapshot.LEAGUE));
    LEAGUE.rootHandle = rootHandle;
  }
}

function appendAutoDecision(type, text, data = {}) {
  const state = ensureAutoCareerState();
  const item = {
    type: String(type || 'auto').trim(),
    text: String(text || '').trim(),
    season: parseNum(G.season, 1),
    year: parseNum(G.year, 2025),
    day: parseNum(G.dayNum, 0),
    weekIndex: parseNum(state.weekIndex, 0),
    data
  };
  state.autoDecisionLog.unshift(item);
  state.autoDecisionLog = state.autoDecisionLog.slice(0, 160);
  return item;
}

function chooseAutoEffortMode(game = null, phase = 'regular') {
  const stamina = parseNum(G.player?.stamina, 80);
  let mode = 'normal';
  if (G.player?.injury?.active || stamina <= 38) mode = 'slack';
  else if (phase === 'playoffs' || stamina >= 84) mode = 'hard';
  else if (stamina <= 54) mode = 'slack';
  G._effortMode = mode;
  appendAutoDecision('effort', `自动负荷：${mode === 'hard' ? '全力冲击' : mode === 'slack' ? '保留体能' : '标准负荷'}`, { game });
  return mode;
}

function chooseAutoPregamePlan(game = null) {
  if (!game || typeof setPregamePlan !== 'function') return null;
  const attrs = G.player?.attrs || {};
  const stamina = parseNum(G.player?.stamina, 80);
  const plan = getDefaultPregamePlan();
  if (parseNum(attrs.pass, 50) >= 72) plan.offense = 'early_playmaking';
  else if (parseNum(attrs.shotExt, 50) >= Math.max(parseNum(attrs.shotInt, 50), 65)) plan.offense = 'spacing_pullup';
  else if (parseNum(attrs.speed, 50) >= 70 || parseNum(attrs.shotInt, 50) >= 70) plan.offense = 'attack_rim';
  if (parseNum(attrs.stl, 50) >= 70 && stamina >= 55) plan.defense = 'point_of_attack';
  else if (parseNum(attrs.blk, 50) + parseNum(attrs.reb, 50) >= 138) plan.defense = 'help_rim';
  if (stamina <= 45) plan.tempo = 'control_clock';
  else if (parseNum(attrs.speed, 50) + parseNum(attrs.pass, 50) >= 142) plan.tempo = 'push_pace';
  const gameKey = getCurrentGameKey({ season: G.season, gameNum: G.gameNum, opp: game.opp });
  const chosen = setPregamePlan(gameKey, plan);
  appendAutoDecision('pregame', '自动生成赛前计划', { gameKey, plan: chosen });
  return chosen;
}

function chooseAutoPromptChoice(prompt = {}) {
  const choices = Array.isArray(prompt.choices) ? prompt.choices : [];
  if (!choices.length) return null;
  const scoreChoice = (choice) => {
    const text = `${choice.id || ''} ${choice.title || ''} ${choice.detail || ''} ${choice.badge || ''}`;
    let score = 0;
    if (/团队|信任|教练好感|体系|认责|恢复|队友|职业|稳定|化学/.test(text)) score += 8;
    if (/XP|声望|曝光|领袖|承担/.test(text)) score += 3;
    if (/抱怨|甩锅|风险|点出|强攻|不够|施压|下次还要/.test(text)) score -= 4;
    if (/体力|伤病/.test(text) && parseNum(G.player?.stamina, 80) < 55) score += 4;
    return score;
  };
  return choices.slice().sort((a, b) => scoreChoice(b) - scoreChoice(a))[0] || choices[0];
}

function autoResolveDailyPrompt(prompt, result = null) {
  const choice = chooseAutoPromptChoice(prompt);
  if (!choice) return null;
  const choiceId = String(choice.id || choice.value || choice.title || '').trim();
  const applied = typeof applyDailyInteractionChoice === 'function'
    ? applyDailyInteractionChoice(prompt, choiceId, result)
    : (typeof applyCoachDailyPromptChoice === 'function' ? applyCoachDailyPromptChoice(prompt, choiceId, result) : null);
  appendAutoDecision('prompt', `自动回应：${prompt.title || '沟通'} / ${choice.title || choiceId}`, { promptType: prompt.type, choiceId, applied });
  return applied;
}

function executePlayerTrade(proposal) {
  if (!proposal) return { ok: false, reason: 'invalid' };
  if (typeof executeUserTradeRequest !== 'function') return { ok: false, reason: 'missing_executor' };
  return executeUserTradeRequest({ ...proposal, acceptChance: 1 });
}

function autoHandlePendingTrade() {
  if (!G.pendingTrade) return null;
  const proposal = G.pendingTrade;
  const oldStrength = typeof getTeamStrength === 'function' ? getTeamStrength(G.teamId) : 75;
  const newStrength = typeof getTeamStrength === 'function' ? getTeamStrength(proposal.team?.id) : oldStrength;
  const fit = parseNum(proposal.need?.needScore, 0) + (newStrength - oldStrength) / 45 + parseNum(proposal.acceptChance, 0.5) - 0.45;
  G.pendingTrade = null;
  if (fit >= 0) {
    const res = executePlayerTrade(proposal);
    appendAutoDecision('trade', `自动接受来自${proposal.team?.z || '目标球队'}的交易`, { fit, result: res });
    return res;
  }
  addPhone('经纪人', `自动评估后拒绝了来自${proposal.team?.z || '目标球队'}的交易询价。`, 'info');
  appendAutoDecision('trade', `自动拒绝来自${proposal.team?.z || '目标球队'}的交易`, { fit });
  return { ok: true, declined: true };
}

function autoSignBestEndorsements(limit = 1) {
  if (typeof buildEndorsementOffersView !== 'function' || typeof acceptEndorsementOffer !== 'function') return [];
  const view = buildEndorsementOffersView();
  const candidates = (view.categories || [])
    .flatMap(cat => cat.items || [])
    .filter(offer => offer.status === 'available')
    .sort((a, b) => parseNum(b.tier, 0) - parseNum(a.tier, 0) || parseNum(b.signingBonus, 0) - parseNum(a.signingBonus, 0));
  const signed = [];
  for (const offer of candidates.slice(0, Math.max(0, limit))) {
    const res = acceptEndorsementOffer(offer.id);
    if (res?.ok) {
      signed.push(res.contract);
      appendAutoDecision('endorsement', `自动签下 ${offer.brand} 代言`, { offerId: offer.id, brand: offer.brand });
      if (offer.shoeEligible && typeof createSignatureShoeForOffer === 'function') {
        const shoeRes = createSignatureShoeForOffer(offer.id, 'allaround');
        appendAutoDecision('signature_shoe', `自动生成 ${offer.brand} 签名鞋事件`, { offerId: offer.id, result: shoeRes });
      }
    }
  }
  return signed;
}

function getAutoUserAnnualOvrTarget() {
  const p = G.player || {};
  const age = parseNum(p.age, 19);
  const potential = clamp(parseNum(p.potential, 80), 50, 99);
  const current = typeof ovr === 'function' ? ovr(p.attrs || {}) : parseNum(p.rating, 70);
  const gap = Math.max(0, potential - current);
  let min = 0;
  let max = 1;
  if (potential >= 95) { min = 4; max = 6; }
  else if (potential >= 88) { min = 2; max = 4; }
  else if (potential >= 80) { min = 1; max = 2; }
  else { min = 0; max = 1; }
  let target = (min + max) / 2;
  if (String(p.xfactor || '').includes('growth')) target += 0.5;
  if (age >= 30 && age <= 32) target *= 0.45;
  else if (age >= 33 && age <= 35) target = -1.6;
  else if (age >= 36) target = -2.8;
  if (target > 0) target = Math.min(target, gap);
  return +target.toFixed(2);
}

function applyAutoWeeklyPlayerDevelopment(days = 7) {
  const state = ensureAutoCareerState();
  const ledger = state.developmentLedger;
  const before = typeof ovr === 'function' ? ovr(G.player.attrs || {}) : parseNum(G.player.rating, 70);
  const annual = getAutoUserAnnualOvrTarget();
  ledger.lastAnnualTarget = annual;
  ledger.carry = parseNum(ledger.carry, 0) + annual * Math.max(1, parseNum(days, 7)) / 182;
  let applied = 0;
  while (ledger.carry >= 1) {
    applyOvrDeltaToAttrs(G.player.attrs, 1, G.player.potential, G.player.age);
    ledger.carry -= 1;
    applied += 1;
  }
  while (ledger.carry <= -1) {
    applyOvrDeltaToAttrs(G.player.attrs, -1, G.player.potential, G.player.age);
    ledger.carry += 1;
    applied -= 1;
  }
  G.player.rating = typeof ovr === 'function' ? ovr(G.player.attrs || {}) : parseNum(G.player.rating, before);
  if (typeof recalcPlayerBadges === 'function') recalcPlayerBadges(G.player);
  ledger.lastOvr = G.player.rating;
  ledger.appliedWeeks = parseNum(ledger.appliedWeeks, 0) + 1;
  if (applied) {
    appendAutoDecision('development', `自动成长：OVR ${before} -> ${G.player.rating}`, { annual, applied, carry: ledger.carry });
  }
  return { before, after: G.player.rating, annual, applied, carry: ledger.carry };
}

function autoAddUserTeamFreeAgent(pool = [], logs = []) {
  if (!Array.isArray(pool) || !pool.length) return null;
  const capRoom = typeof getSalaryCap === 'function' ? getSalaryCap() * 1.18 - teamPayrollMillion(G.teamId, { includeUser: true }) : 0;
  const pick = pool
    .filter(p => normalizeSalaryMillion(p?.contract?.amount || p?.salary || 1) <= Math.max(0.8, capRoom))
    .sort((a, b) => parseNum(b.rating, 65) - parseNum(a.rating, 65))[0];
  if (!pick) return null;
  const team = LEAGUE.teams?.[G.teamId];
  if (!team || (team.players || []).length >= 15) return null;
  pick.contract = npcFreeAgentContract(pick);
  pick.teamId = G.teamId;
  team.players.push(pick);
  const idx = pool.indexOf(pick);
  if (idx >= 0) pool.splice(idx, 1);
  team.rotation = typeof toRotation === 'function' ? toRotation(team.players) : team.rotation;
  team.strength = typeof calcTeamStrength === 'function' ? calcTeamStrength(team) : team.strength;
  logs.push(`球队自动补强：签下 ${pick.name}（OVR ${parseNum(pick.rating, 0)}）`);
  appendAutoDecision('free_agency', `球队自动补强 ${pick.name}`, { playerId: pick.id, rating: pick.rating });
  return pick;
}

function autoSignUserFreeAgency(logs = []) {
  if (parseNum(G.player?.contractYears, 0) > 0) return null;
  const offers = typeof freeAgency === 'function' ? freeAgency() : [];
  if (!offers.length) {
    G.player.contractYears = 1;
    G.player.salary = normalizeSalaryMillion(Math.max(1, parseNum(G.player.salary, 1)));
    logs.push('自由市场自动底薪留队。');
    appendAutoDecision('contract', '自由市场无正式报价，自动执行一年底薪合同');
    return null;
  }
  const best = offers.slice().sort((a, b) => {
    const scoreA = parseNum(a.salary, 0) * 0.55 + parseNum(a.fitScore, 55) * 0.22 + parseNum(a.interest, 0) * 25 + (a.current ? 4 : 0);
    const scoreB = parseNum(b.salary, 0) * 0.55 + parseNum(b.fitScore, 55) * 0.22 + parseNum(b.interest, 0) * 25 + (b.current ? 4 : 0);
    return scoreB - scoreA;
  })[0];
  signContract(best.team.id, best.salary, best.years);
  logs.push(`自由市场自动签约：${best.team.z} ${best.years}年 $${formatSalaryMillion(best.salary)}M/年`);
  appendAutoDecision('contract', `自由市场自动签约 ${best.team.z}`, { salary: best.salary, years: best.years, teamId: best.team.id });
  return best;
}

function startNewSeasonAuto() {
  G.offseasonStage = 0;
  G.offseasonSummary = [];
  G._pendingRegularSeasonAwardsModal = false;
  G._latestDayResult = null;
  G._phoneTab = 'feed';
  delete G._nextDraftPreview;
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  if (typeof ensureSocialState === 'function') ensureSocialState();
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  if (typeof ensureCoachDynamicsState === 'function') ensureCoachDynamicsState();
  if (typeof initTeamRelationsForCurrentTeam === 'function') initTeamRelationsForCurrentTeam();
  if (typeof initializeSeasonGoals === 'function') initializeSeasonGoals();
  if (typeof applySeasonSalaryPayout === 'function') applySeasonSalaryPayout({ force: false, reason: '自动新赛季薪资发放' });
  generateSchedule();
  appendAutoDecision('season', `自动开启第 ${G.season} 个赛季`, { year: G.year });
}

function runAutoOffseasonPipeline(logs = []) {
  endSeason({ staged: true });
  logs.push(`赛季结算：${G.year - 1}-${G.year} 赛季进入休赛期。`);
  const renewRes = runOffseasonStaged_renewals();
  logs.push(`续约阶段：续约 ${renewRes.renewed} 人，进入自由市场 ${renewRes.released.length} 人。`);
  const draftState = createOffseasonDraftState();
  const round1 = processDraftRoundStage(draftState, 1, null, G.teamId);
  const round2 = processDraftRoundStage(draftState, 2, null, G.teamId);
  logs.push(`选秀阶段：首轮 ${round1.length} 人，次轮 ${round2.length} 人，全部由管理层自动完成。`);
  const faPool = processDraftFinishStage(draftState, renewRes.released);
  draftState.faPool = faPool;
  autoAddUserTeamFreeAgent(faPool, logs);
  const faSummary = runOffseasonStaged_fa(draftState, renewRes, null);
  logs.push(...faSummary);
  G.offseasonSummary = logs.slice(-20);
  endSeasonPostPipeline();
  autoSignUserFreeAgency(logs);
  startNewSeasonAuto();
  return logs;
}

function autoCompletePlayoffs(logs = []) {
  if (!G.playoffs?.active && !G.playoffs?.eliminated && G.dayNum >= G.seasonDays) startPlayoffs();
  if (G.playoffs?.active) {
    let guard = 0;
    while (G.playoffs.active && guard++ < 32) {
      autoChooseEffortForPlayoff();
      const res = playPlayoffGame();
      const status = checkSeriesEnd();
      if (res) logs.push(`季后赛自动结算：${teamNameFallback(res.opp)}，系列赛 ${res.myWins}-${res.oppWins}。`);
      if (status === 'advance') logs.push(`季后赛晋级：进入第 ${G.playoffs.round} 轮。`);
      if (status === 'champion') logs.push('季后赛结算：夺得总冠军。');
      if (status === 'eliminated') logs.push('季后赛结算：球队被淘汰。');
    }
  }
  return logs;
}

function autoChooseEffortForPlayoff() {
  G._effortMode = 'hard';
  appendAutoDecision('effort', '季后赛自动全力负荷');
}

function autoRunSeasonTransitionIfNeeded(results = []) {
  if (G.dayNum < G.seasonDays && G.gameNum < getSeasonGameCount()) return [];
  const logs = [];
  autoCompletePlayoffs(logs);
  runAutoOffseasonPipeline(logs);
  results.push({ type: 'seasonTransition', events: logs.slice() });
  return logs;
}

function buildAutoCareerStatsSnapshot() {
  const s = G.seasonStats || {};
  const gp = Math.max(1, parseNum(s.gp, 0));
  const currentOvr = typeof ovr === 'function' ? ovr(G.player?.attrs || {}) : parseNum(G.player?.rating, 70);
  return {
    season: G.season,
    year: G.year,
    team: G.team?.z || '',
    age: parseNum(G.player?.age, 19),
    overall: currentOvr,
    potential: parseNum(G.player?.potential, currentOvr),
    gamesPlayed: parseNum(s.gp, 0),
    averages: {
      pts: +(parseNum(s.pts, 0) / gp).toFixed(1),
      reb: +(parseNum(s.reb, 0) / gp).toFixed(1),
      ast: +(parseNum(s.ast, 0) / gp).toFixed(1),
      stl: +(parseNum(s.stl, 0) / gp).toFixed(1),
      blk: +(parseNum(s.blk, 0) / gp).toFixed(1)
    },
    record: { wins: parseNum(s.wins, 0), losses: parseNum(s.losses, 0) },
    fame: parseNum(G.player?.fame, 0),
    trust: parseNum(G.player?.trust, 0),
    cash: +parseNum(G.player?.cash, 0).toFixed(2)
  };
}

function summarizeWeekResults(results = []) {
  const games = results.filter(r => r?.isGame && r.gameResult).map(r => {
    const g = r.gameResult;
    return {
      day: r.day,
      date: r.date,
      opponent: teamNameFallback(g.opp),
      win: !!g.win,
      score: `${parseNum(g.teamPts, 0)}-${parseNum(g.oppPts, 0)}`,
      line: {
        mins: parseNum(g.st?.mins, g.mins || 0),
        pts: parseNum(g.pts, g.st?.pts || 0),
        reb: parseNum(g.reb, g.st?.reb || 0),
        ast: parseNum(g.ast, g.st?.ast || 0),
        stl: parseNum(g.stl, g.st?.stl || 0),
        blk: parseNum(g.blk, g.st?.blk || 0),
        grade: String(g.grade || '')
      }
    };
  });
  return {
    days: results.map(r => ({ day: r.day, date: r.date, isGame: !!r.isGame, events: r.events || [] })),
    games,
    transitions: results.filter(r => r?.type === 'seasonTransition').flatMap(r => r.events || [])
  };
}

function getHistoricalArchiveEntriesForYear(archive = null, asOfYear = null) {
  const data = archive || normalizeHistoricalArchive(G.historicalTop100);
  const year = parseNum(asOfYear, parseNum(G.startYear, G.year || 2025));
  const direct = data.eraRankings?.[String(year)] || data.eraRankings?.[year];
  if (Array.isArray(direct) && direct.length) return direct.map(normalizeHistoricalEntry);
  if (typeof getHistoricalEraEntries === 'function') {
    const generated = getHistoricalEraEntries(year);
    if (Array.isArray(generated) && generated.length) return generated.map(normalizeHistoricalEntry);
  }
  return (Array.isArray(data.entries) ? data.entries : []).map(normalizeHistoricalEntry);
}

function getHistoricalRankingView(liveEntry = null) {
  ensureAutoCareerState();
  const archive = normalizeHistoricalArchive(G.historicalTop100);
  const live = liveEntry || buildUserHistoricalEntry({ retired: false });
  const asOfYear = parseNum(live.asOfYear, parseNum(G.startYear, G.year || 2025));
  const baseEntries = getHistoricalArchiveEntriesForYear(archive, asOfYear);
  const combined = [...baseEntries.filter(entry => entry.id !== live.id), ...archive.retiredUserCareers.filter(entry => entry.id !== live.id), live]
    .sort((a, b) => parseNum(b.legacyScore, 0) - parseNum(a.legacyScore, 0));
  combined.forEach((entry, idx) => { entry.rank = idx + 1; });
  const userRank = combined.findIndex(entry => entry.id === live.id) + 1;
  const gapAt = (rank) => {
    const target = combined[rank - 1];
    return target ? Math.max(0, +(parseNum(target.legacyScore, 0) - parseNum(live.legacyScore, 0)).toFixed(1)) : 0;
  };
  return {
    userRank,
    liveEntry: live,
    asOfYear,
    topEntries: combined.slice(0, 100),
    gaps: {
      rank1: gapAt(1),
      rank10: gapAt(10),
      rank25: gapAt(25),
      rank50: gapAt(50),
      rank100: gapAt(100)
    }
  };
}

function updateLiveHistoricalRanking() {
  const view = getHistoricalRankingView();
  ensureAutoCareerState().historyArchiveMeta.currentRank = view.userRank;
  return view;
}

function buildWeeklyFactPacket(results = [], beforeRank = null, afterRank = null, development = null) {
  const recentNews = (G.news || []).slice(0, 12).map(n => ({ text: n.text, type: n.type }));
  const tradeNotes = [
    ...(G.aiTradeLog || []).slice(-8).map(t => `${teamNameFallback(t.fromTeamId)} / ${teamNameFallback(t.toTeamId)}: ${(t.players || []).join(' ↔ ')}`),
    ...(G.trades || []).slice(-5).map(t => String(t.text || t.desc || JSON.stringify(t)).slice(0, 180))
  ];
  const endorsementState = typeof buildEndorsementOffersView === 'function' ? buildEndorsementOffersView() : null;
  const activeDeals = endorsementState?.activeDeals || [];
  const eraTop = typeof getHistoricalArchiveEntriesForYear === 'function'
    ? getHistoricalArchiveEntriesForYear(G.historicalTop100, parseNum(G.startYear, G.year || 2025)).slice(0, 10)
    : [];
  return {
    player: { name: G.player?.name || '', position: typeof getPos === 'function' ? getPos(G.player?.pos)?.z : G.player?.pos },
    weekIndex: parseNum(ensureAutoCareerState().weekIndex, 0) + 1,
    stats: buildAutoCareerStatsSnapshot(),
    week: summarizeWeekResults(results),
    leagueNotes: recentNews,
    tradeNotes,
    endorsementNotes: activeDeals.map(deal => ({
      brand: deal.brand,
      category: deal.category,
      remainingDays: parseNum(deal.remainingDays, 0),
      totalIncome: parseNum(deal.totalIncome, 0),
      shoe: deal.shoe ? { name: deal.shoe.name, level: deal.shoe.level } : null
    })),
    injury: G.player?.injury || null,
    awards: (G.awards || []).slice(-8),
    standings: typeof getLeagueTeamRecordsArray === 'function' ? getLeagueTeamRecordsArray().slice(0, 12) : [],
    ranking: {
      asOfYear: parseNum(G.startYear, G.year || 2025),
      before: beforeRank ? { rank: beforeRank.userRank, score: beforeRank.liveEntry?.legacyScore, gaps: beforeRank.gaps } : null,
      after: afterRank ? { rank: afterRank.userRank, score: afterRank.liveEntry?.legacyScore, gaps: afterRank.gaps } : null,
      eraTop10: eraTop.map(e => ({ rank: e.rank, name: e.name, score: e.legacyScore, source: e.source }))
    },
    historicalDb: {
      loaded: !!LEAGUE?.historicalDb?.loaded,
      generatedAt: LEAGUE?.historicalDb?.manifest?.generatedAt || '',
      sourceCoverage: LEAGUE?.historicalDb?.manifest?.sourceCoverage || null
    },
    autoDecisions: (G.autoCareer?.autoDecisionLog || []).slice(0, 18),
    development
  };
}

async function simulateCareerWeek() {
  const state = ensureAutoCareerState();
  state.lastError = null;
  if (!hasAutoCareerLLMConfig()) {
    state.lastError = { code: 'llm_missing', message: '缺少 LLM 配置，本周不会推进。' };
    return { ok: false, reason: 'llm_missing', message: state.lastError.message };
  }
  if (G._simulatingWeek) return { ok: false, reason: 'busy', message: '自动周模拟正在进行。' };
  const snapshot = createAutoCareerSnapshot();
  G._simulatingWeek = true;
  const beforeRank = updateLiveHistoricalRanking();
  const results = [];
  let development = null;
  try {
    for (let i = 0; i < 7; i++) {
      if (G.phase !== 'season') G.phase = 'season';
      if (G.dayNum >= G.seasonDays || G.gameNum >= getSeasonGameCount()) {
        autoRunSeasonTransitionIfNeeded(results);
        continue;
      }
      const game = G.schedule?.[G.gameNum] || null;
      if (typeof isGameDay === 'function' && isGameDay(G.dayNum) && game) {
        chooseAutoPregamePlan(game);
        chooseAutoEffortMode(game, 'regular');
      }
      const result = simulateDay();
      if (!result) continue;
      if (result.type === 'seasonEnd') {
        autoRunSeasonTransitionIfNeeded(results);
        continue;
      }
      if (result.isGame && typeof routePostgameEvents === 'function') {
        const route = routePostgameEvents(result);
        if (route?.forcedPrompt) autoResolveDailyPrompt(route.forcedPrompt, result);
      } else {
        const prompt = typeof buildDailyInteractionPrompt === 'function'
          ? buildDailyInteractionPrompt(result)
          : (typeof buildCoachDailyPrompt === 'function' ? buildCoachDailyPrompt(result) : null);
        if (prompt) autoResolveDailyPrompt(prompt, result);
      }
      autoHandlePendingTrade();
      autoSignBestEndorsements(1);
      results.push(result);
    }
    autoRunSeasonTransitionIfNeeded(results);
    development = applyAutoWeeklyPlayerDevelopment(7);
    const afterRank = updateLiveHistoricalRanking();
    const facts = buildWeeklyFactPacket(results, beforeRank, afterRank, development);
    const rawReport = await callAutoCareerLLM('weekly_report', facts, AUTO_CAREER_WEEKLY_FIELDS);
    const report = requireLLMJsonFields(rawReport, AUTO_CAREER_WEEKLY_FIELDS, 'weekly_report');
    const entry = {
      id: `week_${state.careerId}_${state.weekIndex + 1}`,
      season: G.season,
      year: G.year,
      day: G.dayNum,
      weekIndex: state.weekIndex + 1,
      createdAt: new Date().toISOString(),
      report,
      facts
    };
    state.weeklyReports.unshift(entry);
    state.weeklyReports = state.weeklyReports.slice(0, 120);
    state.weekIndex += 1;
    state.lastError = null;
    if (!Array.isArray(G.storyLog)) G.storyLog = [];
    G.storyLog.push(report.weeklyStory);
    if (G.storyLog.length > 80) G.storyLog = G.storyLog.slice(-80);
    saveHistoricalArchiveToStorage(G.historicalTop100);
    if (typeof localStorage !== 'undefined' && typeof buildSaveObj === 'function') {
      try { localStorage.setItem('nba_save_auto', JSON.stringify(buildSaveObj())); } catch (e) { }
    }
    return { ok: true, entry, results, ranking: afterRank };
  } catch (err) {
    restoreAutoCareerSnapshot(snapshot);
    ensureAutoCareerState().lastError = { code: err?.code || 'llm_error', message: String(err?.message || err) };
    return { ok: false, reason: err?.code || 'llm_error', message: String(err?.message || err) };
  } finally {
    G._simulatingWeek = false;
  }
}

function calculateLegacyHonorScore(honors = null) {
  const c = normalizeUserHonorCounter(honors);
  return (
    parseNum(c.rings, 0) * 70 +
    parseNum(c.mvp, 0) * 165 +
    parseNum(c.fmvp, 0) * 150 +
    parseNum(c.dpoy, 0) * 60 +
    parseNum(c.roy, 0) * 12 +
    parseNum(c.allNba1, 0) * 48 +
    parseNum(c.allNba2, 0) * 28 +
    parseNum(c.allNba3, 0) * 16 +
    parseNum(c.allDefensive, 0) * 12 +
    parseNum(c.allStar, 0) * 6 +
    parseNum(c.allStarMvp, 0) * 8 +
    parseNum(c.scoring, 0) * 18 +
    parseNum(c.rebound, 0) * 13 +
    parseNum(c.assist, 0) * 13 +
    parseNum(c.block, 0) * 11 +
    parseNum(c.steal, 0) * 11
  );
}

function calculateLegacyChampionshipScore(honors = null) {
  const c = normalizeUserHonorCounter(honors);
  const rings = parseNum(c.rings, 0);
  const fmvp = parseNum(c.fmvp, 0);
  const dynasty = rings >= 3 ? (rings - 2) * 22 : 0;
  return Math.min(290, rings * 22 + fmvp * 34 + dynasty);
}

function calculateCareerLegacyScore() {
  const honorArchive = typeof buildUserHonorArchiveFromGame === 'function'
    ? buildUserHonorArchiveFromGame()
    : { counter: defaultUserHonorCounter(), seasons: [], summary: '暂无荣誉' };
  const honors = normalizeUserHonorCounter(honorArchive.counter);
  const seasons = Array.isArray(G.careerStats) ? G.careerStats : [];
  const totals = seasons.reduce((acc, s) => {
    const gp = parseNum(s.gp, 0);
    acc.gp += gp;
    acc.pts += parseNum(s.ppg, 0) * gp;
    acc.reb += parseNum(s.rpg, 0) * gp;
    acc.ast += parseNum(s.apg, 0) * gp;
    acc.stl += parseNum(s.spg, 0) * gp;
    acc.blk += parseNum(s.bpg, 0) * gp;
    return acc;
  }, { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 });
  const peak = seasons
    .map(s => parseNum(s.ppg, 0) * 2.2 + parseNum(s.rpg, 0) * 1.15 + parseNum(s.apg, 0) * 1.35 + parseNum(s.spg, 0) * 4.2 + parseNum(s.bpg, 0) * 4.2 + parseNum(s.wins, 0) * 0.1)
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((sum, v) => sum + v, 0);
  const honorScore = calculateLegacyHonorScore(honors);
  const championshipBonus = calculateLegacyChampionshipScore(honors);
  const cumulativeScore = Math.min(220,
    Math.sqrt(Math.max(0, totals.pts)) * 0.92 +
    Math.sqrt(Math.max(0, totals.reb)) * 0.62 +
    Math.sqrt(Math.max(0, totals.ast)) * 0.72 +
    Math.sqrt(Math.max(0, totals.stl + totals.blk)) * 0.6 +
    Math.min(60, totals.gp / 22)
  );
  const peakComponent = Math.min(135, peak * 0.46);
  const longevityScore = Math.min(65, seasons.length * 3.4 + totals.gp / 58);
  const commercialScore = clamp(parseNum(G.player?.fame, 0) * 0.45 + parseNum(G.player?.trust, 0) * 0.14 + parseNum(G.player?.cash, 0) * 0.09, 0, 80);
  const score = clamp(135 + honorScore + championshipBonus + cumulativeScore + peakComponent + longevityScore + commercialScore, 160, 5000);
  return {
    legacyScore: +score.toFixed(1),
    peakScore: +peak.toFixed(1),
    totals,
    honors,
    honorSeasons: honorArchive.seasons,
    honorSummary: honorArchive.summary,
    honorScore: +honorScore.toFixed(1),
    championshipBonus: +championshipBonus.toFixed(1),
    formulaVersion: HISTORICAL_LEGACY_FORMULA_VERSION,
    commercialScore: +commercialScore.toFixed(1)
  };
}

function buildUserHistoricalEntry({ retired = false } = {}) {
  const state = ensureAutoCareerState();
  const score = calculateCareerLegacyScore();
  const currentOvr = typeof ovr === 'function' ? ovr(G.player?.attrs || {}) : parseNum(G.player?.rating, 70);
  const seasons = Array.isArray(G.careerStats) ? G.careerStats.length : 0;
  return {
    id: `user-${state.careerId}`,
    careerId: state.careerId,
    source: 'user',
    name: G.player?.name || 'User Career',
    displayName: G.player?.name || 'User Career',
    team: G.team?.z || '',
    retired: !!retired,
    active: !retired,
    season: G.season,
    year: G.year,
    age: parseNum(G.player?.age, 19),
    overall: currentOvr,
    potential: parseNum(G.player?.potential, currentOvr),
    seasons,
    legacyScore: score.legacyScore,
    peakScore: score.peakScore,
    honorScore: score.honorScore,
    formulaVersion: score.formulaVersion,
    honors: score.honors,
    honorSummary: score.honorSummary,
    honorSeasons: score.honorSeasons,
    honorSource: 'game_awards',
    totals: score.totals,
    commercialScore: score.commercialScore,
    updatedAt: new Date().toISOString()
  };
}

function finalizeUserHistoricalCareer(retirementSummary = null) {
  ensureAutoCareerState();
  const archive = normalizeHistoricalArchive(G.historicalTop100);
  const userEntry = buildUserHistoricalEntry({ retired: true });
  userEntry.retirementSummary = retirementSummary || null;
  const entries = [...archive.entries.filter(entry => entry.id !== userEntry.id), userEntry];
  const retiredUserCareers = [...archive.retiredUserCareers.filter(entry => entry.id !== userEntry.id), userEntry];
  G.historicalTop100 = normalizeHistoricalArchive({
    version: HISTORICAL_TOP100_VERSION,
    updatedAt: new Date().toISOString(),
    entries,
    eraRankings: archive.eraRankings || {},
    retiredUserCareers
  });
  saveHistoricalArchiveToStorage(G.historicalTop100);
  return getHistoricalRankingView(userEntry);
}

function serializeHistoricalArchive() {
  const archive = saveHistoricalArchiveToStorage(G.historicalTop100 || createDefaultHistoricalArchive());
  return JSON.stringify(archive, null, 2);
}

function loadHistoricalArchiveObject(obj) {
  G.historicalTop100 = normalizeHistoricalArchive(obj);
  saveHistoricalArchiveToStorage(G.historicalTop100);
  ensureAutoCareerState().historyArchiveMeta.loaded = true;
  return G.historicalTop100;
}

function buildRetirementFactPacket() {
  const ranking = getHistoricalRankingView(buildUserHistoricalEntry({ retired: true }));
  const honorArchive = typeof buildUserHonorArchiveFromGame === 'function'
    ? buildUserHonorArchiveFromGame()
    : { seasons: [], counter: {}, summary: '暂无荣誉' };
  return {
    player: buildAutoCareerStatsSnapshot(),
    careerStats: G.careerStats || [],
    awards: honorArchive.seasons,
    leagueAwards: G.leagueAwards || [],
    honors: honorArchive.counter,
    honorSummary: honorArchive.summary,
    legacy: calculateCareerLegacyScore(),
    ranking: {
      rank: ranking.userRank,
      score: ranking.liveEntry?.legacyScore,
      gaps: ranking.gaps,
      top10: ranking.topEntries.slice(0, 10).map(e => ({ rank: e.rank, name: e.name, score: e.legacyScore }))
    },
    teamsPlayed: G.player?.teamsPlayed || []
  };
}

async function generateAutoRetirementSummaryByLLM() {
  ensureAutoCareerState();
  if (!hasAutoCareerLLMConfig()) {
    const err = new Error('缺少 LLM 配置：退役结算不会生成，也不会提交历史排名。');
    err.code = 'llm_missing';
    throw err;
  }
  const facts = buildRetirementFactPacket();
  const raw = await callAutoCareerLLM('retirement', facts, AUTO_CAREER_RETIREMENT_FIELDS);
  const summary = requireLLMJsonFields(raw, AUTO_CAREER_RETIREMENT_FIELDS, 'retirement');
  summary.score = facts.legacy.legacyScore;
  summary.ranking = facts.ranking;
  return summary;
}

// ============ SOCIAL (推文) & ECONOMY (金钱) ============
const STAMINA_COACH_MARKET = [
  { level: 0, name: '未聘请', cost: 0, restBonus: 0, gameBonus: 0, injuryMult: 1 },
  { level: 1, name: '体能教练-基础', cost: 2.2, restBonus: 2, gameBonus: 1, injuryMult: 0.97 },
  { level: 2, name: '体能教练-进阶', cost: 6.5, restBonus: 4, gameBonus: 2, injuryMult: 0.92 },
  { level: 3, name: '体能教练-专家', cost: 13.0, restBonus: 6, gameBonus: 3, injuryMult: 0.88 },
  { level: 4, name: '体能教练-冠军组', cost: 24.0, restBonus: 8, gameBonus: 4, injuryMult: 0.84 }
];
const TRAINING_COACH_MARKET = [
  { level: 0, name: '未聘请', cost: 0, xpMult: 1 },
  { level: 1, name: '训练教练-基础', cost: 2.8, xpMult: 1.08 },
  { level: 2, name: '训练教练-进阶', cost: 7.8, xpMult: 1.16 },
  { level: 3, name: '训练教练-专家', cost: 16.0, xpMult: 1.26 },
  { level: 4, name: '训练教练-顶级', cost: 29.0, xpMult: 1.38 }
];
const RECOVERY_TEAM_MARKET = [
  { level: 0, name: '未聘请', cost: 0, restBonus: 0, gameBonus: 0, injuryMult: 1, injuryDaysMult: 1 },
  { level: 1, name: '康复团队-理疗组', cost: 3.4, restBonus: 1, gameBonus: 0, injuryMult: 0.97, injuryDaysMult: 0.96 },
  { level: 2, name: '康复团队-运动医学组', cost: 8.6, restBonus: 2, gameBonus: 1, injuryMult: 0.93, injuryDaysMult: 0.91 },
  { level: 3, name: '康复团队-专家组', cost: 18.5, restBonus: 3, gameBonus: 1, injuryMult: 0.88, injuryDaysMult: 0.86 },
  { level: 4, name: '康复团队-冠军实验室', cost: 31.0, restBonus: 4, gameBonus: 2, injuryMult: 0.83, injuryDaysMult: 0.8 }
];
const PR_TEAM_MARKET = [
  { level: 0, name: '未聘请', cost: 0, posRepMult: 1, negRepMult: 1, socialHeatMult: 1, eventBonus: 0, marketScoreBonus: 0 },
  { level: 1, name: '公关团队-基础', cost: 2.6, posRepMult: 1.05, negRepMult: 0.92, socialHeatMult: 1.05, eventBonus: 0.012, marketScoreBonus: 2 },
  { level: 2, name: '公关团队-进阶', cost: 6.8, posRepMult: 1.1, negRepMult: 0.84, socialHeatMult: 1.1, eventBonus: 0.024, marketScoreBonus: 4 },
  { level: 3, name: '公关团队-全国档', cost: 14.8, posRepMult: 1.16, negRepMult: 0.78, socialHeatMult: 1.16, eventBonus: 0.038, marketScoreBonus: 6 },
  { level: 4, name: '公关团队-顶流班底', cost: 27.5, posRepMult: 1.22, negRepMult: 0.72, socialHeatMult: 1.24, eventBonus: 0.052, marketScoreBonus: 9 }
];
const AGENT_TEAM_MARKET = [
  { level: 0, name: '未聘请', cost: 0, marketScoreBonus: 0, offerMult: 1, incomeMult: 1, activeCapBonus: 0 },
  { level: 1, name: '经纪团队-基础', cost: 2.9, marketScoreBonus: 3, offerMult: 1.04, incomeMult: 1.03, activeCapBonus: 0 },
  { level: 2, name: '经纪团队-进阶', cost: 7.9, marketScoreBonus: 6, offerMult: 1.08, incomeMult: 1.06, activeCapBonus: 1 },
  { level: 3, name: '经纪团队-明星班底', cost: 17.2, marketScoreBonus: 10, offerMult: 1.14, incomeMult: 1.1, activeCapBonus: 1 },
  { level: 4, name: '经纪团队-门面级', cost: 32.0, marketScoreBonus: 14, offerMult: 1.2, incomeMult: 1.15, activeCapBonus: 2 }
];
const ANALYTICS_SERVICE_MARKET = [
  { level: 0, name: '未订阅', cost: 0, xpMult: 1, prepBonus: 0, fatigueRelief: 0, marketScoreBonus: 0 },
  { level: 1, name: '数据分析-基础', cost: 2.1, xpMult: 1.03, prepBonus: 1.5, fatigueRelief: 0.01, marketScoreBonus: 1 },
  { level: 2, name: '数据分析-进阶', cost: 5.8, xpMult: 1.06, prepBonus: 2.5, fatigueRelief: 0.015, marketScoreBonus: 2 },
  { level: 3, name: '数据分析-专家', cost: 12.6, xpMult: 1.1, prepBonus: 4, fatigueRelief: 0.02, marketScoreBonus: 4 },
  { level: 4, name: '数据分析-冠军智库', cost: 22.8, xpMult: 1.15, prepBonus: 6, fatigueRelief: 0.03, marketScoreBonus: 6 }
];
const LUXURY_MARKET = [
  { id: 'loft', name: '城市高层公寓', cost: 1.8, fame: 1, trust: 0, socialTag: '房产' },
  { id: 'riverside_flat', name: '江景平层', cost: 2.6, fame: 1, trust: 0, socialTag: '房产' },
  { id: 'suburb_villa', name: '城郊独栋别墅', cost: 6.9, fame: 3, trust: 1, socialTag: '豪宅' },
  { id: 'downtown_penthouse', name: '市中心顶层公寓', cost: 8.4, fame: 3, trust: 0, socialTag: '豪宅' },
  { id: 'lake_house', name: '湖畔庄园', cost: 11.2, fame: 4, trust: 1, socialTag: '豪宅' },
  { id: 'seaview_villa', name: '海景别墅', cost: 18.5, fame: 6, trust: 1, socialTag: '豪宅' },
  { id: 'mountain_estate', name: '山景庄园', cost: 15.8, fame: 5, trust: 1, socialTag: '豪宅' },
  { id: 'historic_mansion', name: '历史风豪宅', cost: 13.3, fame: 4, trust: 0, socialTag: '豪宅' },
  { id: 'smart_mansion', name: '智能豪宅', cost: 16.1, fame: 5, trust: 1, socialTag: '豪宅' },
  { id: 'private_island_home', name: '私人岛屿住宅', cost: 38.0, fame: 9, trust: -2, socialTag: '豪宅' },
  { id: 'sports_sedan', name: '高性能轿跑', cost: 2.9, fame: 2, trust: 0, socialTag: '跑车' },
  { id: 'muscle_car', name: '经典肌肉车', cost: 2.1, fame: 1, trust: 0, socialTag: '跑车' },
  { id: 'sports_car', name: '性能跑车', cost: 4.2, fame: 3, trust: -1, socialTag: '跑车' },
  { id: 'luxury_suv', name: '旗舰豪华SUV', cost: 3.8, fame: 2, trust: 0, socialTag: '座驾' },
  { id: 'electric_supercar', name: '电动超跑', cost: 7.6, fame: 4, trust: -1, socialTag: '超跑' },
  { id: 'hyper_car', name: '限量超跑', cost: 12.8, fame: 5, trust: -2, socialTag: '超跑' },
  { id: 'collector_racecar', name: '收藏级赛车', cost: 10.9, fame: 5, trust: -1, socialTag: '超跑' },
  { id: 'offroad_beast', name: '极限越野车', cost: 5.7, fame: 3, trust: 0, socialTag: '座驾' },
  { id: 'armored_limo', name: '防弹礼宾车', cost: 6.4, fame: 3, trust: -1, socialTag: '座驾' },
  { id: 'vintage_collection', name: '复古名车收藏', cost: 9.5, fame: 4, trust: 0, socialTag: '跑车' },
  { id: 'lux_watch', name: '限量名表', cost: 2.6, fame: 2, trust: 0, socialTag: '奢侈品' },
  { id: 'diamond_watch', name: '镶钻腕表', cost: 4.1, fame: 3, trust: -1, socialTag: '奢侈品' },
  { id: 'haute_couture', name: '高定西装套装', cost: 1.4, fame: 1, trust: 0, socialTag: '奢侈品' },
  { id: 'jewelry_set', name: '高珠套装', cost: 6.7, fame: 4, trust: -1, socialTag: '奢侈品' },
  { id: 'art_collection', name: '现代艺术收藏', cost: 8.9, fame: 4, trust: 1, socialTag: '收藏' },
  { id: 'rare_wine_cellar', name: '珍藏酒窖', cost: 3.3, fame: 2, trust: 0, socialTag: '奢侈品' },
  { id: 'private_yacht', name: '私人游艇', cost: 21.0, fame: 7, trust: -2, socialTag: '游艇' },
  { id: 'mega_yacht', name: '超级游艇', cost: 44.0, fame: 10, trust: -3, socialTag: '游艇' },
  { id: 'private_jet', name: '私人飞机', cost: 32.0, fame: 8, trust: -3, socialTag: '私人飞机' },
  { id: 'charity_fund', name: '公益基金会', cost: 6.0, fame: 3, trust: 3, socialTag: '公益' }
];
const FACILITY_MARKET = [
  { id: 'private_gym', name: '私人球馆', cost: 9.8, fame: 2, trust: 1, socialTag: '设施', restBonus: 1, xpMult: 1.04, marketScoreBonus: 4, socialHeatMult: 1.05, momentum: 6 },
  { id: 'recovery_lab', name: '恢复实验室', cost: 7.4, fame: 1, trust: 2, socialTag: '设施', restBonus: 2, gameBonus: 1, injuryMult: 0.95, injuryDaysMult: 0.93, momentum: 5 },
  { id: 'film_room', name: '数据分析室', cost: 6.2, fame: 1, trust: 1, socialTag: '数据服务', xpMult: 1.03, prepBonus: 3, marketScoreBonus: 5, momentum: 4 },
  { id: 'content_studio', name: '个人内容工作室', cost: 8.9, fame: 3, trust: 0, socialTag: '媒体包装', posRepMult: 1.08, socialHeatMult: 1.12, marketScoreBonus: 6, momentum: 8 }
];
const FAME_PRIVILEGE_TIERS = [
  { level: 0, minScore: 0, label: '新秀观察', scoreBonus: 0, socialHeatMult: 1, eventChance: 0.02, activeCapBonus: 0, offerMult: 1, incomeMult: 1, perks: ['只开放基础品牌与本地活动'] },
  { level: 1, minScore: 34, label: '本地热度', scoreBonus: 3, socialHeatMult: 1.04, eventChance: 0.035, activeCapBonus: 0, offerMult: 1.02, incomeMult: 1.01, perks: ['开始进入城市活动池', '社媒热度略有放大'] },
  { level: 2, minScore: 58, label: '全国讨论', scoreBonus: 6, socialHeatMult: 1.09, eventChance: 0.05, activeCapBonus: 1, offerMult: 1.04, incomeMult: 1.03, perks: ['更高规格品牌开始主动接触', '可并行处理更多代言'] },
  { level: 3, minScore: 82, label: '品牌宠儿', scoreBonus: 10, socialHeatMult: 1.15, eventChance: 0.07, activeCapBonus: 1, offerMult: 1.07, incomeMult: 1.05, perks: ['综艺、专访、封面拍摄开始常驻', '高消费更容易转成舆论热度'] },
  { level: 4, minScore: 106, label: '城市门面', scoreBonus: 14, socialHeatMult: 1.22, eventChance: 0.095, activeCapBonus: 2, offerMult: 1.1, incomeMult: 1.08, perks: ['城市宣传和公益活动大幅增多', '顶级品牌报价明显抬升'] },
  { level: 5, minScore: 130, label: '联盟门面', scoreBonus: 18, socialHeatMult: 1.3, eventChance: 0.12, activeCapBonus: 2, offerMult: 1.14, incomeMult: 1.12, perks: ['门面级品牌与纪录片事件解锁', '推文和商业曝光会被显著放大'] }
];
function escapeSvgText(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function hashStringToHue(seed) {
  let h = 0;
  const src = String(seed || 'nba');
  for (let i = 0; i < src.length; i++) {
    h = (h * 31 + src.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}
function makeSvgDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function buildArtPalette(seed, shift = 0) {
  const hue = (hashStringToHue(seed) + shift) % 360;
  const hue2 = (hue + 34) % 360;
  return [
    `hsl(${hue} 82% 54%)`,
    `hsl(${hue2} 76% 46%)`,
    `hsl(${(hue + 180) % 360} 58% 18%)`,
    `hsl(${(hue2 + 180) % 360} 42% 14%)`
  ];
}
function buildCommercialPaletteKey(categoryKey = '', kind = '', tag = '') {
  return String(categoryKey || kind || tag || 'gear').trim().toLowerCase();
}
function getCommercialPalette(categoryKey = '', kind = '', tag = '') {
  const key = buildCommercialPaletteKey(categoryKey, kind, tag);
  return {
    gear: ['#37a6ff', '#1154bf', '#0f172a'],
    shoe: ['#37a6ff', '#1154bf', '#0f172a'],
    apparel: ['#f59e0b', '#ef4444', '#18181b'],
    wearable: ['#06b6d4', '#2563eb', '#0f172a'],
    drink: ['#22c55e', '#0ea5e9', '#09111d'],
    food: ['#ff8d3a', '#f43f5e', '#180f16'],
    tech: ['#00d4ff', '#7c3aed', '#07111e'],
    auto: ['#ef4444', '#f59e0b', '#1a1010'],
    finance: ['#22c55e', '#0f766e', '#081412'],
    fashion: ['#f97316', '#8b5cf6', '#171022'],
    beauty: ['#ec4899', '#a855f7', '#1a1020'],
    game: ['#22c55e', '#00d4ff', '#08131c'],
    public: ['#14b8a6', '#22c55e', '#081713'],
    city: ['#f59e0b', '#2563eb', '#0f172a'],
    luxury: ['#f59e0b', '#d97706', '#140f08'],
    default: buildArtPalette(`${key || 'brand'}_logo`)
  }[key] || buildArtPalette(`${key || 'brand'}_logo`);
}
function buildBrandMarkText(brand = '') {
  const clean = String(brand || '').replace(/\s+/g, '').trim();
  if (!clean) return { mark: '牌', wordmark: '品牌', submark: '' };
  const ascii = clean.replace(/[^A-Za-z0-9]/g, '');
  const mark = ascii.length >= 2 ? ascii.slice(0, 2).toUpperCase() : clean.slice(0, Math.min(2, clean.length));
  const wordmark = clean.slice(0, 8);
  const submark = clean.length > 8 ? clean.slice(8, 12) : '';
  return { mark, wordmark, submark };
}
function hashStringToInt(seed) {
  let h = 2166136261;
  const src = String(seed || 'logo');
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pickSeedItem(list, seed, shift = 0) {
  if (!Array.isArray(list) || !list.length) return '';
  const idx = (hashStringToInt(seed) + Math.max(0, parseNum(shift, 0))) % list.length;
  return list[idx];
}
function splitBrandWordmark(wordmark = '') {
  const clean = String(wordmark || '').trim();
  if (!clean) return ['品牌', ''];
  const ascii = clean.replace(/[^A-Za-z0-9]/g, '');
  if (ascii.length >= 5) return [ascii.slice(0, 4).toUpperCase(), ascii.slice(4, 8).toUpperCase()];
  if (clean.length >= 5) return [clean.slice(0, 4), clean.slice(4, 8)];
  return [clean.slice(0, 8), ''];
}
function getCommercialLogoStyle(categoryKey = '', kind = '', tag = '', seed = '') {
  const key = buildCommercialPaletteKey(categoryKey, kind, tag);
  const styleGroups = {
    gear: ['speed', 'shield', 'ribbon'],
    shoe: ['speed', 'shield', 'orbital'],
    apparel: ['ribbon', 'speed', 'luxe'],
    wearable: ['circuit', 'orbital', 'speed'],
    drink: ['wave', 'orbital', 'ribbon'],
    food: ['wave', 'ribbon', 'seal'],
    tech: ['circuit', 'orbital', 'shield'],
    auto: ['shield', 'speed', 'seal'],
    finance: ['seal', 'ribbon', 'skyline'],
    fashion: ['luxe', 'ribbon', 'orbital'],
    beauty: ['luxe', 'wave', 'orbital'],
    game: ['circuit', 'speed', 'orbital'],
    public: ['seal', 'skyline', 'ribbon'],
    city: ['skyline', 'seal', 'ribbon'],
    luxury: ['luxe', 'shield', 'seal']
  };
  return pickSeedItem(styleGroups[key] || ['shield', 'ribbon', 'orbital'], `${key}_${seed}`) || 'shield';
}
function buildCommercialLogoSvg(ctx = {}, body = '', extraDefs = '') {
  const fontFamily = "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const outerStroke = Math.max(2, Math.round(ctx.sizeNum * 0.008));
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ctx.sizeNum} ${ctx.sizeNum}" role="img" aria-label="${ctx.wordText}">
    <defs>
      <linearGradient id="${ctx.ids.bg}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${ctx.c1}" />
        <stop offset="58%" stop-color="${ctx.c2}" />
        <stop offset="100%" stop-color="${ctx.c3}" />
      </linearGradient>
      <linearGradient id="${ctx.ids.edge}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".34" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity=".02" />
      </linearGradient>
      <radialGradient id="${ctx.ids.glow}" cx="28%" cy="18%" r="78%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".28" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>
      ${extraDefs}
    </defs>
    <rect width="${ctx.sizeNum}" height="${ctx.sizeNum}" rx="${ctx.radius}" fill="url(#${ctx.ids.bg})" />
    <rect width="${ctx.sizeNum}" height="${ctx.sizeNum}" rx="${ctx.radius}" fill="url(#${ctx.ids.glow})" />
    <rect x="${outerStroke / 2}" y="${outerStroke / 2}" width="${ctx.sizeNum - outerStroke}" height="${ctx.sizeNum - outerStroke}" rx="${ctx.radius - outerStroke / 2}" fill="none" stroke="url(#${ctx.ids.edge})" stroke-width="${outerStroke}" />
    ${body}
  </svg>`;
}
function buildCommercialBrandLogo(meta = {}, { size = 320 } = {}) {
  const brand = String(meta?.brand || meta?.label || '品牌').trim() || '品牌';
  const product = String(meta?.product || meta?.subtitle || '').trim();
  const categoryKey = String(meta?.categoryKey || '').trim();
  const kind = String(meta?.kind || '').trim();
  const tag = String(meta?.tag || meta?.category || '').trim();
  const eventType = String(meta?.eventType || '').trim();
  const seed = `${brand}_${product}_${categoryKey}_${kind}_${tag}`;
  const [c1, c2, c3] = getCommercialPalette(categoryKey, kind, tag);
  const icon = meta?.eventType === 'luxury_purchase'
    ? getLuxuryIcon(tag)
    : getEndorsementIcon(kind || categoryKey || tag || 'gear');
  const { mark, wordmark, submark } = buildBrandMarkText(brand);
  const productText = escapeSvgText(product || tag || '品牌合作').slice(0, 16);
  const wordText = escapeSvgText(wordmark).slice(0, 10);
  const submarkText = escapeSvgText(submark).slice(0, 6);
  const markText = escapeSvgText(mark).slice(0, 3);
  const sizeNum = Math.max(180, parseNum(size, 320));
  const pad = Math.round(sizeNum * 0.08);
  const radius = Math.round(sizeNum * 0.18);
  const seedInt = hashStringToInt(seed);
  const ids = {
    bg: `logoBg_${seedInt.toString(36)}`,
    edge: `logoEdge_${seedInt.toString(36)}`,
    glow: `logoGlow_${seedInt.toString(36)}`,
    accent: `logoAccent_${seedInt.toString(36)}`
  };
  const [wordLine1, wordLine2] = splitBrandWordmark(wordmark);
  const style = getCommercialLogoStyle(categoryKey, kind, tag, seed);
  const categoryText = escapeSvgText((tag || categoryKey || kind || 'brand').toUpperCase()).slice(0, 12);
  const fontFamily = "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const ctx = {
    brand,
    productText,
    wordText,
    submarkText,
    markText,
    iconText: escapeSvgText(icon).slice(0, 2),
    categoryText,
    sizeNum,
    pad,
    radius,
    c1,
    c2,
    c3,
    ids,
    wordLine1: escapeSvgText(wordLine1),
    wordLine2: escapeSvgText(wordLine2),
    fontFamily,
    seedInt,
    eventType
  };
  const monogramSize = Math.round(sizeNum * 0.24);
  const chipSize = Math.round(sizeNum * 0.2);
  const chipRadius = Math.round(sizeNum * 0.07);
  const stroke = Math.max(4, Math.round(sizeNum * 0.016));
  const compactStyles = {
    speed: `
      <path d="M${pad} ${sizeNum * 0.3} C${sizeNum * 0.28} ${sizeNum * 0.12}, ${sizeNum * 0.55} ${sizeNum * 0.14}, ${sizeNum * 0.9} ${sizeNum * 0.3}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="${stroke}" stroke-linecap="round"/>
      <path d="M${sizeNum * 0.18} ${sizeNum * 0.76} L${sizeNum * 0.56} ${sizeNum * 0.34} L${sizeNum * 0.78} ${sizeNum * 0.34} L${sizeNum * 0.42} ${sizeNum * 0.82}" fill="#08111c" fill-opacity=".28"/>
      <text x="${sizeNum * 0.48}" y="${sizeNum * 0.58}" text-anchor="middle" font-size="${monogramSize}" font-family="${fontFamily}" font-style="italic" font-weight="900" fill="#fff">${ctx.markText}</text>
      <rect x="${pad}" y="${pad}" width="${chipSize}" height="${chipSize}" rx="${chipRadius}" fill="#08111c" fill-opacity=".24"/>
      <text x="${pad + chipSize / 2}" y="${pad + chipSize * 0.64}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.12)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.iconText}</text>
    `,
    shield: `
      <path d="M${sizeNum * 0.5} ${sizeNum * 0.12} L${sizeNum * 0.76} ${sizeNum * 0.22} L${sizeNum * 0.72} ${sizeNum * 0.62} C${sizeNum * 0.69} ${sizeNum * 0.8}, ${sizeNum * 0.58} ${sizeNum * 0.91}, ${sizeNum * 0.5} ${sizeNum * 0.95} C${sizeNum * 0.42} ${sizeNum * 0.91}, ${sizeNum * 0.31} ${sizeNum * 0.8}, ${sizeNum * 0.28} ${sizeNum * 0.62} L${sizeNum * 0.24} ${sizeNum * 0.22} Z" fill="#09111d" fill-opacity=".28" stroke="#fff" stroke-opacity=".18" stroke-width="${Math.max(2, sizeNum * 0.01)}"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.56}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.28)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.markText}</text>
      <circle cx="${sizeNum * 0.5}" cy="${sizeNum * 0.27}" r="${sizeNum * 0.07}" fill="#fff" fill-opacity=".14"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.295}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.08)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.iconText}</text>
    `,
    wave: `
      <circle cx="${sizeNum * 0.34}" cy="${sizeNum * 0.3}" r="${sizeNum * 0.17}" fill="#fff" fill-opacity=".14"/>
      <path d="M${pad} ${sizeNum * 0.74} C${sizeNum * 0.24} ${sizeNum * 0.66}, ${sizeNum * 0.36} ${sizeNum * 0.82}, ${sizeNum * 0.5} ${sizeNum * 0.74} C${sizeNum * 0.63} ${sizeNum * 0.67}, ${sizeNum * 0.76} ${sizeNum * 0.82}, ${sizeNum - pad} ${sizeNum * 0.72}" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="${stroke}" stroke-linecap="round"/>
      <path d="M${sizeNum * 0.3} ${sizeNum * 0.16} C${sizeNum * 0.41} ${sizeNum * 0.29}, ${sizeNum * 0.41} ${sizeNum * 0.44}, ${sizeNum * 0.3} ${sizeNum * 0.58} C${sizeNum * 0.2} ${sizeNum * 0.45}, ${sizeNum * 0.2} ${sizeNum * 0.3}, ${sizeNum * 0.3} ${sizeNum * 0.16} Z" fill="#fff" fill-opacity=".88"/>
      <text x="${sizeNum * 0.62}" y="${sizeNum * 0.56}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.24)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.markText}</text>
    `,
    circuit: `
      <rect x="${sizeNum * 0.18}" y="${sizeNum * 0.18}" width="${sizeNum * 0.64}" height="${sizeNum * 0.64}" rx="${sizeNum * 0.12}" fill="#07111d" fill-opacity=".28"/>
      <path d="M${sizeNum * 0.32} ${sizeNum * 0.22} V${sizeNum * 0.1} M${sizeNum * 0.5} ${sizeNum * 0.22} V${sizeNum * 0.1} M${sizeNum * 0.68} ${sizeNum * 0.22} V${sizeNum * 0.1} M${sizeNum * 0.32} ${sizeNum * 0.9} V${sizeNum * 0.78} M${sizeNum * 0.5} ${sizeNum * 0.9} V${sizeNum * 0.78} M${sizeNum * 0.68} ${sizeNum * 0.9} V${sizeNum * 0.78}" stroke="#fff" stroke-opacity=".24" stroke-width="${Math.max(2, sizeNum * 0.012)}" stroke-linecap="round"/>
      <circle cx="${sizeNum * 0.76}" cy="${sizeNum * 0.24}" r="${sizeNum * 0.028}" fill="#fff" fill-opacity=".82"/>
      <circle cx="${sizeNum * 0.24}" cy="${sizeNum * 0.76}" r="${sizeNum * 0.028}" fill="#fff" fill-opacity=".82"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.57}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.26)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.markText}</text>
    `,
    luxe: `
      <rect x="${sizeNum * 0.16}" y="${sizeNum * 0.16}" width="${sizeNum * 0.68}" height="${sizeNum * 0.68}" rx="${sizeNum * 0.12}" fill="#0d0e17" fill-opacity=".22" stroke="#fff" stroke-opacity=".18" stroke-width="${Math.max(2, sizeNum * 0.01)}"/>
      <path d="M${sizeNum * 0.34} ${sizeNum * 0.2} L${sizeNum * 0.4} ${sizeNum * 0.14} L${sizeNum * 0.5} ${sizeNum * 0.22} L${sizeNum * 0.6} ${sizeNum * 0.14} L${sizeNum * 0.66} ${sizeNum * 0.2}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="${Math.max(2, sizeNum * 0.01)}" stroke-linecap="round"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.58}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.25)}" font-family="${fontFamily}" font-style="italic" font-weight="800" fill="#fff">${ctx.markText}</text>
      <circle cx="${sizeNum * 0.5}" cy="${sizeNum * 0.76}" r="${sizeNum * 0.018}" fill="#fff" fill-opacity=".6"/>
    `,
    ribbon: `
      <path d="M${pad} ${sizeNum * 0.38} L${sizeNum * 0.28} ${sizeNum * 0.22} H${sizeNum - pad} L${sizeNum * 0.72} ${sizeNum * 0.78} H${pad}" fill="#09111d" fill-opacity=".24"/>
      <path d="M${sizeNum * 0.14} ${sizeNum * 0.8} L${sizeNum * 0.86} ${sizeNum * 0.2}" stroke="#fff" stroke-opacity=".22" stroke-width="${stroke}" stroke-linecap="round"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.58}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.24)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.markText}</text>
      <rect x="${pad}" y="${pad}" width="${chipSize}" height="${chipSize}" rx="${chipRadius}" fill="#fff" fill-opacity=".12"/>
      <text x="${pad + chipSize / 2}" y="${pad + chipSize * 0.64}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.1)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.iconText}</text>
    `,
    skyline: `
      <circle cx="${sizeNum * 0.76}" cy="${sizeNum * 0.24}" r="${sizeNum * 0.11}" fill="#fff" fill-opacity=".14"/>
      <path d="M${pad} ${sizeNum * 0.72} V${sizeNum * 0.92} H${sizeNum - pad} V${sizeNum * 0.72} H${sizeNum * 0.78} V${sizeNum * 0.56} H${sizeNum * 0.68} V${sizeNum * 0.62} H${sizeNum * 0.56} V${sizeNum * 0.42} H${sizeNum * 0.46} V${sizeNum * 0.6} H${sizeNum * 0.34} V${sizeNum * 0.5} H${sizeNum * 0.24} V${sizeNum * 0.72} Z" fill="#08111c" fill-opacity=".28"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.48}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.23)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.markText}</text>
    `,
    seal: `
      <circle cx="${sizeNum * 0.5}" cy="${sizeNum * 0.5}" r="${sizeNum * 0.28}" fill="#08111c" fill-opacity=".24" stroke="#fff" stroke-opacity=".2" stroke-width="${Math.max(2, sizeNum * 0.01)}"/>
      <circle cx="${sizeNum * 0.5}" cy="${sizeNum * 0.5}" r="${sizeNum * 0.21}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="${Math.max(2, sizeNum * 0.008)}"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.57}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.26)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.markText}</text>
      <circle cx="${sizeNum * 0.5}" cy="${sizeNum * 0.22}" r="${sizeNum * 0.05}" fill="#fff" fill-opacity=".14"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.238}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.06)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.iconText}</text>
    `,
    orbital: `
      <ellipse cx="${sizeNum * 0.5}" cy="${sizeNum * 0.5}" rx="${sizeNum * 0.28}" ry="${sizeNum * 0.15}" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="${Math.max(2, sizeNum * 0.01)}"/>
      <ellipse cx="${sizeNum * 0.5}" cy="${sizeNum * 0.5}" rx="${sizeNum * 0.18}" ry="${sizeNum * 0.3}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="${Math.max(2, sizeNum * 0.008)}" transform="rotate(-20 ${sizeNum * 0.5} ${sizeNum * 0.5})"/>
      <circle cx="${sizeNum * 0.68}" cy="${sizeNum * 0.34}" r="${sizeNum * 0.035}" fill="#fff" fill-opacity=".84"/>
      <text x="${sizeNum * 0.5}" y="${sizeNum * 0.58}" text-anchor="middle" font-size="${Math.round(sizeNum * 0.24)}" font-family="${fontFamily}" font-weight="900" fill="#fff">${ctx.markText}</text>
    `
  };
  const svg = buildCommercialLogoSvg(ctx, compactStyles[style] || compactStyles.shield);
  return makeSvgDataUri(svg.trim());
}
function buildCommercialEventLogo(meta = {}) {
  const src = meta || {};
  return buildCommercialBrandLogo({
    brand: String(src.brand || src.label || src.displayLabel || '品牌').trim(),
    product: String(src.product || src.category || src.tag || '').trim(),
    categoryKey: String(src.categoryKey || '').trim(),
    kind: String(src.kind || '').trim(),
    tag: String(src.tag || src.category || '').trim(),
    eventType: String(src.type || '').trim()
  });
}
function getEndorsementIcon(kind = 'gear') {
  const map = {
    gear: '鞋',
    drink: '饮',
    food: '食',
    tech: '电',
    auto: '车',
    finance: '财',
    fashion: '潮',
    beauty: '美',
    game: '游',
    public: '益',
    city: '城'
  };
  return map[String(kind || '').toLowerCase()] || '牌';
}
function getLuxuryIcon(tag = '') {
  const src = String(tag || '').trim();
  if (src.includes('房')) return '宅';
  if (src.includes('座驾') || src.includes('车')) return '车';
  if (src.includes('游艇')) return '艇';
  if (src.includes('飞机')) return '机';
  if (src.includes('收藏')) return '藏';
  if (src.includes('公益')) return '善';
  return '奢';
}
function buildCommercialArt({
  title = '',
  subtitle = '',
  badge = '',
  icon = '牌',
  seed = '',
  accent = '',
  accent2 = '',
  footer = '',
  tone = 'neutral'
} = {}) {
  const [c1, c2, c3, c4] = accent ? [accent, accent2 || accent, '#10131f', '#08101a'] : buildArtPalette(seed);
  const toneGlow = tone === 'positive' ? 0.75 : (tone === 'negative' ? 0.35 : 0.55);
  const titleText = escapeSvgText(title).slice(0, 26);
  const subtitleText = escapeSvgText(subtitle).slice(0, 36);
  const badgeText = escapeSvgText(badge).slice(0, 18);
  const footerText = escapeSvgText(footer).slice(0, 32);
  const iconText = escapeSvgText(icon).slice(0, 4);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" role="img" aria-label="${titleText}">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="55%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c3}" />
      </linearGradient>
      <linearGradient id="glow" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${c1}" stop-opacity="${toneGlow}" />
        <stop offset="100%" stop-color="${c4}" stop-opacity=".12" />
      </linearGradient>
      <radialGradient id="orb" cx="35%" cy="25%" r="70%">
        <stop offset="0%" stop-color="#fff" stop-opacity=".18" />
        <stop offset="100%" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="960" height="640" rx="48" fill="url(#bg)" />
    <circle cx="150" cy="120" r="220" fill="url(#orb)" />
    <circle cx="820" cy="130" r="180" fill="url(#orb)" />
    <rect x="52" y="52" width="856" height="536" rx="34" fill="url(#glow)" stroke="rgba(255,255,255,.18)" stroke-width="2" />
    <circle cx="160" cy="326" r="122" fill="rgba(0,0,0,.18)" stroke="rgba(255,255,255,.26)" stroke-width="3" />
    <text x="160" y="360" text-anchor="middle" font-size="116" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-weight="900" fill="#fff">${iconText}</text>
    <text x="348" y="200" font-size="34" fill="rgba(255,255,255,.78)" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif">${badgeText}</text>
    <text x="348" y="282" font-size="68" fill="#fff" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-weight="900">${titleText}</text>
    <text x="348" y="338" font-size="30" fill="rgba(255,255,255,.88)" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif">${subtitleText}</text>
    <text x="348" y="414" font-size="24" fill="rgba(255,255,255,.68)" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif">${footerText}</text>
    <rect x="342" y="448" width="260" height="12" rx="6" fill="rgba(255,255,255,.28)" />
    <rect x="342" y="448" width="182" height="12" rx="6" fill="#fff" />
    <path d="M690 178 C760 196, 818 250, 830 322" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="10" stroke-linecap="round" />
    <path d="M710 170 C784 202, 834 258, 850 330" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="4" stroke-linecap="round" />
  </svg>`;
  return makeSvgDataUri(svg.trim());
}
function buildEndorsementImage(template) {
  const kind = String(template?.kind || template?.categoryKey || 'gear');
  const palette = {
    gear: ['#37a6ff', '#1154bf'],
    food: ['#ff8d3a', '#f43f5e'],
    tech: ['#00d4ff', '#7c3aed'],
    auto: ['#ef4444', '#f59e0b'],
    finance: ['#22c55e', '#0f766e'],
    fashion: ['#f97316', '#8b5cf6'],
    beauty: ['#ec4899', '#a855f7'],
    game: ['#22c55e', '#00d4ff'],
    public: ['#14b8a6', '#22c55e'],
    city: ['#f59e0b', '#2563eb']
  }[String(template?.categoryKey || '').toLowerCase()] || buildArtPalette(template?.brand || kind);
  return buildCommercialArt({
    title: `${template?.brand || '品牌'} ${template?.product || ''}`.trim(),
    subtitle: String(template?.category || template?.categoryLabel || template?.categoryKey || ''),
    badge: `${String(template?.tier || 1)} 星代言${template?.shoeEligible ? ' · 鞋类' : ''}`,
    icon: getEndorsementIcon(kind),
    seed: `${template?.brand || ''}_${template?.product || ''}_${template?.categoryKey || ''}`,
    accent: palette[0],
    accent2: palette[1],
    footer: template?.shoeEligible ? '可打造签名鞋并叠加持续分成' : '签约后即可获得日常与比赛日收益',
    tone: 'positive'
  });
}
function buildLuxuryImage(item) {
  const tag = String(item?.socialTag || '').trim();
  const palette = {
    房产: ['#7c3aed', '#2563eb'],
    豪宅: ['#f59e0b', '#f97316'],
    座驾: ['#ef4444', '#fb7185'],
    奢侈品: ['#8b5cf6', '#ec4899'],
    收藏: ['#14b8a6', '#0ea5e9'],
    游艇: ['#06b6d4', '#2563eb'],
    私人飞机: ['#f59e0b', '#3b82f6'],
    公益: ['#22c55e', '#16a34a']
  }[tag] || buildArtPalette(item?.name || tag);
  return buildCommercialArt({
    title: String(item?.name || '奢侈品'),
    subtitle: `${tag || '高端资产'} · $${parseNum(item?.cost, 0).toFixed(1)}M`,
    badge: `${item?.fame >= 0 ? '+' : ''}${parseNum(item?.fame, 0)} 声望 · ${item?.trust >= 0 ? '+' : ''}${parseNum(item?.trust, 0)} 信任`,
    icon: getLuxuryIcon(tag),
    seed: `${item?.id || ''}_${item?.name || ''}`,
    accent: palette[0],
    accent2: palette[1],
    footer: '购买后会直接写入商业动态与手机推文',
    tone: parseNum(item?.trust, 0) < 0 ? 'negative' : 'positive'
  });
}
function summarizeCommercialEvents(events = [], limit = 4) {
  return (Array.isArray(events) ? events : [])
    .slice(0, Math.max(1, parseNum(limit, 4)))
    .map(evt => {
      const head = String(evt?.displayLabel || evt?.label || evt?.brand || '商业动态').trim();
      const detail = String(evt?.detail || '').trim();
      return detail ? `${head}（${detail}）` : head;
    })
    .filter(Boolean);
}
function buildCommercialBuzzText(event) {
  const evt = event || {};
  if (typeof TEXT_POOL_COMMERCIAL !== 'undefined') {
    const subcategory = String(evt.type || 'purchase').trim();
    const pool = TEXT_POOL_COMMERCIAL[subcategory] || TEXT_POOL_COMMERCIAL.default;
    if (Array.isArray(pool) && pool.length) {
      const seed = String(evt.eventKey || `${evt.type}_${evt.label}_${evt.detail}`).trim();
      const entry = pickSeedItem(pool, seed) || pool[0];
      return fillTextTemplate(entry, {
        playerName: String(evt.playerName || G.player?.name || '球员'),
        label: String(evt.displayLabel || evt.label || evt.brand || '商业动态').trim(),
        category: String(evt.tag || evt.category || '商业').trim(),
        detail: String(evt.detail || '').trim(),
        brand: String(evt.brand || '').trim()
      });
    }
  }
  const playerName = String(evt.playerName || G.player?.name || '球员');
  const label = String(evt.displayLabel || evt.label || evt.brand || '商业动态').trim();
  const category = String(evt.tag || evt.category || '商业').trim();
  const detail = String(evt.detail || '').trim();
  const seed = String(evt.eventKey || `${evt.type || 'purchase'}_${label}_${detail}`).trim();
  const pick = (list = []) => pickSeedItem(list, seed) || list[0] || `${playerName}和${label}有了新动向。`;
  switch (String(evt.type || 'purchase')) {
    case 'endorsement_sign':
      return pick([
        `${playerName}和${label}正式牵手，${category}合作落地了。${detail ? ` ${detail}` : ''}`.trim(),
        `${label}这份合作已经敲定，${playerName}的商业线又往前走了一步。${detail ? ` ${detail}` : ''}`.trim(),
        `${playerName}拿下了${label}这单合作，今天的场外热度也跟着起来了。${detail ? ` ${detail}` : ''}`.trim()
      ]);
    case 'endorsement_reject':
      return pick([
        `${playerName}这次没有接下${label}的邀约，外界已经在猜下一步会是谁。${detail ? ` ${detail}` : ''}`.trim(),
        `${label}这份合作没有谈成，讨论点反而被拉高了。${detail ? ` ${detail}` : ''}`.trim(),
        `${playerName}暂时放过了${label}这单，后面的商业选择更值得看。${detail ? ` ${detail}` : ''}`.trim()
      ]);
    case 'signature_shoe':
      return pick([
        `${playerName}的${label}已经成型，今天球鞋圈有新图能聊了。${detail ? ` ${detail}` : ''}`.trim(),
        `${label}这双鞋的消息放出来了，签名鞋线算是正式启动。${detail ? ` ${detail}` : ''}`.trim(),
        `${playerName}把${label}推进到了新阶段，这双签名鞋开始有实感了。${detail ? ` ${detail}` : ''}`.trim()
      ]);
    case 'coach_upgrade':
      return pick([
        `${playerName}把${label}配齐了，训练和恢复条件都在往上提。${detail ? ` ${detail}` : ''}`.trim(),
        `${label}已经到位，这套团队配置明显是冲着长期提升去的。${detail ? ` ${detail}` : ''}`.trim()
      ]);
    case 'facility_upgrade':
      return pick([
        `${playerName}把${label}也补上了，个人训练条件直接升档。${detail ? ` ${detail}` : ''}`.trim(),
        `${label}这一步落地之后，场外投入已经越来越成体系了。${detail ? ` ${detail}` : ''}`.trim()
      ]);
    case 'luxury_purchase':
      return pick([
        `${playerName}刚把${label}拿下，${category}讨论度一下就起来了。${detail ? ` ${detail}` : ''}`.trim(),
        `${label}这笔消费已经落地，场外风格又被拉高了一档。${detail ? ` ${detail}` : ''}`.trim()
      ]);
    case 'media_event':
      return pick([
        `${playerName}拿到了一档更高规格的曝光：${label}。${detail ? ` ${detail}` : ''}`.trim(),
        `${label}这次露出已经落地，媒体热度开始往上走。${detail ? ` ${detail}` : ''}`.trim()
      ]);
    case 'brand_interest':
      return pick([
        `${label}已经开始主动接触${playerName}，商业风向有点升温了。${detail ? ` ${detail}` : ''}`.trim(),
        `${playerName}和${label}之间有了新的试探接触，后续值得继续看。${detail ? ` ${detail}` : ''}`.trim()
      ]);
    default:
      return pick([
        `${playerName}这边又有新的${category}动态：${label}。${detail ? ` ${detail}` : ''}`.trim(),
        `${label}这条${category}消息已经出来了。${detail ? ` ${detail}` : ''}`.trim(),
        `${playerName}的场外动作又更新了一条：${label}。${detail ? ` ${detail}` : ''}`.trim()
      ]);
  }
}
function createCommercialBuzzPost(event, { day = Math.max(0, G.dayNum - 1), season = G.season, year = G.year } = {}) {
  const evt = event || {};
  const score = parseNum(evt.fame, 0) + parseNum(evt.trust, 0);
  const ecoFx = typeof getEconomyEffects === 'function' ? getEconomyEffects() : { socialHeatMult: 1 };
  const heatMult = clamp(parseNum(ecoFx?.socialHeatMult, 1), 0.9, 1.6);
  const tone = score >= 2 ? 'positive' : (score <= -2 ? 'negative' : 'neutral');
  const personaKey = String(evt.type || 'purchase') === 'endorsement_sign'
    ? 'news'
    : String(evt.type || 'purchase') === 'signature_shoe'
      ? 'data'
      : String(evt.type || 'purchase') === 'coach_upgrade'
        ? 'tactical'
        : String(evt.type || 'purchase') === 'facility_upgrade'
          ? 'tactical'
        : String(evt.type || 'purchase') === 'brand_interest'
            ? 'news'
        : (String(evt.tag || '').includes('公益') ? 'neutral' : 'casual');
  const text = buildCommercialBuzzText(evt);
  const eventKey = String(evt.eventKey || buildCommercialEventGroupKey(evt)).trim();
  return {
    day,
    season,
    year,
    author: personaHandle(personaKey, eventKey),
    persona: SOCIAL_PERSONAS[personaKey]?.type || SOCIAL_PERSONAS.neutral.type,
    tone,
    sourceType: 'commercial',
    eventType: String(evt.type || 'purchase').trim(),
    eventKey,
    brand: String(evt.brand || '').trim(),
    product: String(evt.product || '').trim(),
    text,
    logo: String(evt.logo || '').trim(),
    image: String(evt.image || '').trim(),
    imageStatus: String(evt.imageStatus || '').trim(),
    likes: clamp(Math.round((110 + Math.max(0, score * 22) + rng(20, 180)) * heatMult), 20, 9999),
    reposts: clamp(Math.round((18 + Math.max(0, score * 4) + rng(5, 70)) * clamp(0.92 + heatMult * 0.2, 1, 1.45)), 5, 9999),
    comments: makeFallbackComments(text, tone === 'negative' ? 'negative' : (tone === 'positive' ? 'positive' : 'neutral'), 3)
  };
}
function buildCommercialBuzzPromptPayload(event = {}, avoidTexts = []) {
  const evt = event || {};
  return JSON.stringify({
    player: String(evt.playerName || G.player?.name || '球员').trim(),
    team: String(evt.teamName || G.team?.z || '').trim(),
    type: String(evt.type || 'purchase').trim(),
    brand: String(evt.brand || '').trim(),
    product: String(evt.product || '').trim(),
    category: String(evt.category || evt.tag || '').trim(),
    label: String(evt.displayLabel || evt.label || '').trim(),
    detail: String(evt.detail || '').trim(),
    day: parseNum(evt.day, Math.max(0, G.dayNum - 1)),
    season: parseNum(evt.season, G.season),
    avoidPhrases: [
      '完成了一笔签名鞋相关采购',
      '品牌图',
      '信息量不少',
      ...avoidTexts.map(item => cleanSocialText(item || '').slice(0, 80)).filter(Boolean).slice(0, 4)
    ]
  });
}
async function generateCommercialBuzzDraftByTemplate(event = {}, { avoidTexts = [] } = {}) {
  return null;
}
async function enhanceCommercialBuzzTextByTemplateAsync(eventRef, postRef = null, { force = false } = {}) {
  return null;
}
function queueCommercialBuzzTextTemplateEnhancement(eventRef, postRef = null, opts = {}) {
  // No-op: commercial copy is already selected from local pools.
}
async function enhanceCommercialBuzzTextAsync(eventRef, postRef = null, opts = {}) {
  return enhanceCommercialBuzzTextByTemplateAsync(eventRef, postRef, opts);
}
function queueCommercialBuzzTextEnhancement(eventRef, postRef = null, opts = {}) {
  return queueCommercialBuzzTextTemplateEnhancement(eventRef, postRef, opts);
}
function getRecentCommercialEvents(limit = 5) {
  ensureSocialState();
  return [...(G.social.commercialEvents || [])].slice(0, Math.max(1, parseNum(limit, 5)));
}
function mergeCommercialEventRecord(target, incoming) {
  const base = target && typeof target === 'object' ? target : {};
  const next = incoming && typeof incoming === 'object' ? incoming : {};
  const resolvedType = commercialEventTypeRank(next.type) >= commercialEventTypeRank(base.type) ? String(next.type || '').trim() : String(base.type || '').trim();
  base.type = resolvedType || String(base.type || next.type || 'purchase').trim();
  base.day = parseNum(next.day, base.day);
  base.season = parseNum(next.season, base.season);
  base.year = parseNum(next.year, base.year);
  base.ts = Math.max(parseNum(base.ts, 0), parseNum(next.ts, 0), Date.now());
  base.eventKey = String(base.eventKey || next.eventKey || buildCommercialEventGroupKey(next)).trim();
  base.brand = String(next.brand || base.brand || '').trim();
  base.product = String(next.product || base.product || '').trim();
  base.categoryKey = String(next.categoryKey || base.categoryKey || '').trim();
  base.category = String(next.category || base.category || next.tag || '').trim();
  base.kind = String(next.kind || base.kind || '').trim();
  base.tag = base.type === 'signature_shoe'
    ? '签名鞋'
    : String(next.tag || base.tag || base.category || '').trim();
  base.fame = parseNum(base.fame, 0) + parseNum(next.fame, 0);
  base.trust = parseNum(base.trust, 0) + parseNum(next.trust, 0);
  base.detail = mergeCommercialDetailText(base.detail, next.detail);
  base.playerName = String(next.playerName || base.playerName || G.player?.name || '球员').trim();
  base.teamName = String(next.teamName || base.teamName || G.team?.z || '').trim();
  base.teamAbbr = String(next.teamAbbr || base.teamAbbr || G.team?.a || '').trim();
  base.logo = String(next.logo || base.logo || '').trim();
  if (String(next.imageStatus || '').trim().toLowerCase() === 'svg' || !String(base.image || '').trim()) {
    base.image = String(next.image || base.image || '').trim();
    base.imageStatus = String(next.imageStatus || base.imageStatus || '').trim();
  }
  base.displayLabel = buildCommercialEventDisplayLabel({
    ...base,
    displayLabel: next.displayLabel || base.displayLabel || next.label || base.label
  });
  base.label = String(next.label || base.label || base.displayLabel).trim();
  base.posted = !!(base.posted || next.posted);
  return base;
}
function upsertCommercialEventRecord(event) {
  ensureSocialState();
  if (!event || typeof event !== 'object') return null;
  const normalized = normalizeCommercialEvent(event, event.tag || '商业', event);
  normalized.displayLabel = buildCommercialEventDisplayLabel(normalized);
  normalized.eventKey = String(normalized.eventKey || buildCommercialEventGroupKey(normalized)).trim();
  const idx = (G.social.commercialEvents || []).findIndex(item => String(item?.eventKey || '').trim() === normalized.eventKey);
  if (idx < 0) {
    G.social.commercialEvents.unshift(normalized);
    if (G.social.commercialEvents.length > 30) G.social.commercialEvents.pop();
    return normalized;
  }
  const existing = G.social.commercialEvents[idx];
  mergeCommercialEventRecord(existing, normalized);
  G.social.commercialEvents.splice(idx, 1);
  G.social.commercialEvents.unshift(existing);
  return existing;
}
function findCommercialBuzzPostByEventKey(eventKey = '', day = Math.max(0, G.dayNum - 1), season = G.season) {
  const key = String(eventKey || '').trim();
  if (!key) return null;
  return (G.social?.posts || []).find(post =>
    String(post?.eventKey || '').trim() === key &&
    parseNum(post?.day, -999) === parseNum(day, -1) &&
    parseNum(post?.season, -999) === parseNum(season, -1)
  ) || null;
}
function upsertCommercialBuzzPost(event, draft = null) {
  ensureSocialState();
  const evt = event && typeof event === 'object' ? event : null;
  if (!evt) return null;
  const eventKey = String(evt.eventKey || buildCommercialEventGroupKey(evt)).trim();
  const base = createCommercialBuzzPost(evt, { day: evt.day, season: evt.season, year: evt.year });
  const personaKey = String(draft?.personaKey || '').trim().toLowerCase();
  const persona = SOCIAL_PERSONAS[personaKey] || null;
  const tone = ['positive', 'neutral', 'negative'].includes(String(draft?.tone || '').trim().toLowerCase())
    ? String(draft.tone).trim().toLowerCase()
    : String(base.tone || 'neutral').trim().toLowerCase();
  const comments = normalizeCommercialCommentList(draft?.comments, tone, eventKey, String(draft?.text || base.text || '').trim());
  const payload = {
    ...base,
    author: persona ? personaHandle(personaKey, eventKey) : String(base.author || '@线上看球'),
    persona: persona?.type || base.persona,
    tone,
    text: cleanSocialText(String(draft?.text || base.text || '').trim()) || base.text,
    comments,
    day: parseNum(evt.day, base.day),
    season: parseNum(evt.season, base.season),
    year: parseNum(evt.year, base.year),
    ts: parseNum(evt.ts, Date.now()),
    eventKey
  };
  const existing = findCommercialBuzzPostByEventKey(eventKey, payload.day, payload.season);
  if (!existing) return appendSocialPost(payload);
  const keepExistingImage = String(existing.imageStatus || '').trim() && String(existing.image || '').trim();
  Object.assign(existing, {
    ...payload,
    id: existing.id,
    image: String(keepExistingImage ? existing.image : (payload.image || existing.image || '')).trim(),
    imageStatus: String(keepExistingImage ? 'svg' : (payload.imageStatus || existing.imageStatus || '')).trim()
  });
  if (typeof updateHeader === 'function') updateHeader();
  if (typeof renderPhone === 'function' && $('phonePage')?.classList.contains('active')) renderPhone();
  return existing;
}
function recordCommercialEvent(event) {
  return upsertCommercialEventRecord(event);
}
function parseSocialMetricValue(rawValue, fallback = 0) {
  const fallbackNum = Math.max(0, Math.round(parseNum(fallback, 0)));
  if (rawValue === null || rawValue === undefined || rawValue === '') return fallbackNum;
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) return Math.max(0, Math.round(rawValue));
  const text = String(rawValue || '')
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, '');
  if (!text) return fallbackNum;
  const match = text.match(/(-?\d+(?:\.\d+)?)(w|k|m|万|千|亿)?/i);
  if (!match) return fallbackNum;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return fallbackNum;
  const unit = String(match[2] || '').toLowerCase();
  const multiplier = unit === 'w' || unit === '万'
    ? 10000
    : unit === 'k' || unit === '千'
      ? 1000
      : unit === 'm'
        ? 1000000
        : unit === '亿'
          ? 100000000
          : 1;
  return Math.max(0, Math.round(value * multiplier));
}
function clampSocialMetricToRange(rawValue, range = [0, 9999999], fallback = 0) {
  const min = Math.max(0, Math.round(parseNum(range?.[0], 0)));
  const max = Math.max(min, Math.round(parseNum(range?.[1], min)));
  const parsed = parseSocialMetricValue(rawValue, fallback);
  return clamp(parsed, min, max);
}
const SOCIAL_COMMENT_COUNT_RANGE = Object.freeze([3, 6]);
const SOCIAL_MIN_GENERATED_POSTS = 5;
function getSocialCommentCountRange(profile = null) {
  const min = Math.max(SOCIAL_COMMENT_COUNT_RANGE[0], parseNum(profile?.comments?.[0], SOCIAL_COMMENT_COUNT_RANGE[0]));
  const max = Math.max(min, parseNum(profile?.comments?.[1], SOCIAL_COMMENT_COUNT_RANGE[1]));
  return [min, max];
}
function getRandomSocialCommentCount(profile = null) {
  const [min, max] = getSocialCommentCountRange(profile);
  return rng(min, max);
}
function getTargetSocialCommentCount(profile = null, providedCount = 0) {
  const [min, max] = getSocialCommentCountRange(profile);
  if (parseNum(providedCount, 0) > 0) return clamp(parseNum(providedCount, 0), min, max);
  return rng(min, max);
}
function getSocialPostHeatProfile(post = {}) {
  const source = `${post.persona || ''} ${post.author || ''} ${post.authorType || ''} ${post.sourceType || ''}`.toLowerCase();
  const text = String(post.text || '').trim();
  const tone = String(post.tone || '').trim().toLowerCase();
  const fame = clamp(parseNum(G.player?.fame, 10), 0, 100);
  const visibility = clamp(parseNum(G.economy?.visibilityMomentum, 0), 0, 120);
  let tier = 'casual';
  if (post.authorType === 'star') tier = 'star';
  else if (post.isPlayer) tier = 'player';
  else if (post.sourceType === 'commercial') tier = 'commercial';
  else if (/记者|新闻|快报|媒体|观察|战术|数据|分析/.test(source)) tier = 'media';
  else if (/球迷|吃瓜|路人|老球迷|装备党|悲观球迷/.test(source)) tier = 'fan';
  const presets = {
    star: { likes: [6000, 38000], reposts: [360, 4200], commentLikes: [18, 420], comments: [3, 6] },
    player: { likes: [1200, 9800], reposts: [90, 1100], commentLikes: [10, 220], comments: [3, 6] },
    media: { likes: [900, 8600], reposts: [60, 780], commentLikes: [6, 140], comments: [3, 6] },
    commercial: { likes: [1800, 14000], reposts: [120, 1300], commentLikes: [8, 180], comments: [3, 6] },
    fan: { likes: [180, 2600], reposts: [14, 220], commentLikes: [3, 70], comments: [3, 6] },
    casual: { likes: [60, 1600], reposts: [6, 140], commentLikes: [2, 48], comments: [3, 6] }
  };
  const base = presets[tier] || presets.casual;
  let heatMult = 1 + fame / 240 + visibility / 420;
  if (post.mentionsPlayer) heatMult += 0.12;
  if (/签名鞋|代言|商业|合同|揭幕战|绝杀|训练|加练|流言/.test(text)) heatMult += 0.08;
  if (tone === 'negative' || tone === 'competitive') heatMult += 0.05;
  if (tier === 'star') heatMult += 0.18;
  if (tier === 'casual' && !post.mentionsPlayer) heatMult -= 0.08;
  heatMult = clamp(heatMult, 0.92, 1.9);
  const scaleRange = (pair = []) => {
    const low = Math.max(1, Math.round(parseNum(pair[0], 1) * heatMult));
    const high = Math.max(low, Math.round(parseNum(pair[1], low) * heatMult));
    return [low, high];
  };
  return {
    tier,
    heatMult,
    likes: scaleRange(base.likes),
    reposts: scaleRange(base.reposts),
    commentLikes: scaleRange(base.commentLikes),
    comments: base.comments
  };
}
function getSocialInteractionRanges(post = {}) {
  const profile = getSocialPostHeatProfile(post);
  return {
    playerReplyLikes: [
      Math.max(6, Math.round(profile.commentLikes[0] * 1.15)),
      Math.max(18, Math.round(profile.commentLikes[1] * 1.55))
    ],
    starReplyLikes: [
      Math.max(18, Math.round(profile.commentLikes[0] * 1.8)),
      Math.max(40, Math.round(profile.commentLikes[1] * 2.2))
    ],
    replyLikeBump: [
      Math.max(12, Math.round(profile.likes[0] * 0.06)),
      Math.max(50, Math.round(profile.likes[1] * 0.14))
    ],
    replyRepostBump: [
      Math.max(2, Math.round(profile.reposts[0] * 0.06)),
      Math.max(10, Math.round(profile.reposts[1] * 0.16))
    ]
  };
}
function normalizeSocialComments(rawComments, tone = 'neutral', seed = '', postMeta = null, profile = null) {
  const profileInfo = profile || getSocialPostHeatProfile(postMeta || { text: seed, tone });
  const providedCount = Array.isArray(rawComments) ? rawComments.length : 0;
  const targetCount = getTargetSocialCommentCount(profileInfo, providedCount);
  const [, maxCount] = getSocialCommentCountRange(profileInfo);
  const normalized = [];
  const used = new Set();
  const seedBase = `${seed || postMeta?.text || ''}_${postMeta?.author || ''}_${postMeta?.persona || ''}_${tone}`;
  const pushComment = (item, idx) => {
    const text = cleanSocialText(String(item?.text || item?.comment || '').trim()).slice(0, 32);
    if (!text) return;
    const key = text.replace(/\s+/g, '').toLowerCase();
    if (!key || used.has(key)) return;
    used.add(key);
    const author = String(item?.author || '').trim()
      || getSocialCommenter(`${seedBase}_${idx}`, true)
      || `@评论${normalized.length + 1}`;
    normalized.push({
      author,
      text,
      likes: clampSocialMetricToRange(item?.likes, profileInfo.commentLikes, rng(profileInfo.commentLikes[0], profileInfo.commentLikes[1]))
    });
  };
  (Array.isArray(rawComments) ? rawComments : []).forEach((item, idx) => {
    pushComment(typeof item === 'string' ? { text: item } : item, idx);
  });
  if (normalized.length < targetCount) {
    const fallbackComments = makeFallbackComments(seed || postMeta?.text || '', tone, targetCount, postMeta);
    fallbackComments.forEach((item, idx) => pushComment(item, idx + normalized.length));
  }
  return normalized.slice(0, Math.min(targetCount, maxCount));
}
function normalizeSocialPostPayload(post = {}) {
  const profile = getSocialPostHeatProfile(post);
  return {
    ...post,
    likes: clampSocialMetricToRange(post.likes, profile.likes, rng(profile.likes[0], profile.likes[1])),
    reposts: clampSocialMetricToRange(post.reposts, profile.reposts, rng(profile.reposts[0], profile.reposts[1])),
    comments: normalizeSocialComments(post.comments, String(post.tone || 'neutral').trim().toLowerCase(), String(post.text || '').trim(), post, profile)
  };
}
function appendSocialPost(post) {
  ensureSocialState();
  if (!post || typeof post !== 'object') return null;
  const normalized = normalizeSocialPostPayload(post);
  const next = {
    ...normalized,
    id: Number.isFinite(parseNum(post.id, NaN)) ? parseNum(post.id, 0) : G.social.nextPostId++,
    ts: parseNum(post.ts, Date.now()),
    day: parseNum(post.day, Math.max(0, G.dayNum - 1)),
    season: parseNum(post.season, G.season),
    year: parseNum(post.year, G.year)
  };
  G.social.posts.unshift(next);
  if (G.social.posts.length > 200) G.social.posts.length = 200;
  if (typeof updateHeader === 'function') updateHeader();
  if (typeof renderPhone === 'function' && $('phonePage')?.classList.contains('active')) renderPhone();
  return next;
}
function inferCommercialEventType(tag, fallback = 'purchase') {
  const raw = String(tag || '').toLowerCase().trim();
  if (!raw) return fallback;
  if ([
    'purchase',
    'endorsement_sign',
    'endorsement_reject',
    'signature_shoe',
    'coach_upgrade',
    'facility_upgrade',
    'media_event',
    'brand_interest',
    'luxury_purchase'
  ].includes(raw)) {
    return raw;
  }
  if (raw.includes('代言')) return 'endorsement_sign';
  if (raw.includes('签名鞋') || raw.includes('球鞋')) return 'signature_shoe';
  if (raw.includes('训练')) return 'coach_upgrade';
  if (raw.includes('设施') || raw.includes('球馆') || raw.includes('实验室') || raw.includes('工作室')) return 'facility_upgrade';
  if (raw.includes('采访') || raw.includes('曝光') || raw.includes('综艺') || raw.includes('封面')) return 'media_event';
  if (raw.includes('主动接触') || raw.includes('试探') || raw.includes('品牌邀约')) return 'brand_interest';
  if (raw.includes('车') || raw.includes('座驾') || raw.includes('豪宅') || raw.includes('房') || raw.includes('游艇') || raw.includes('飞机') || raw.includes('收藏') || raw.includes('公益') || raw.includes('奢')) {
    return 'luxury_purchase';
  }
  return fallback;
}
function normalizeCommercialKeyPart(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·•\-_/\\:：,.，。!！?？'"]/g, '');
}
function buildCommercialEventGroupKey(event = {}) {
  const evt = event || {};
  const season = parseNum(evt.season, G.season);
  const day = parseNum(evt.day, Math.max(0, G.dayNum - 1));
  const type = String(evt.type || 'purchase').trim().toLowerCase();
  const brandKey = normalizeCommercialKeyPart(evt.brand || evt.displayLabel || evt.label || '');
  const labelKey = normalizeCommercialKeyPart(evt.displayLabel || evt.label || evt.product || type).slice(0, 30);
  if (['endorsement_sign', 'endorsement_reject', 'signature_shoe'].includes(type) && brandKey) {
    return `brand_${season}_${day}_${brandKey}`;
  }
  return `event_${season}_${day}_${type}_${brandKey || labelKey || 'buzz'}`;
}
function buildCommercialEventDisplayLabel(event = {}) {
  const evt = event || {};
  const type = String(evt.type || 'purchase').trim().toLowerCase();
  const brand = String(evt.brand || '').trim();
  const product = String(evt.product || '').trim();
  if (type === 'signature_shoe' && brand) return `${brand} 签名鞋`;
  if ((type === 'endorsement_sign' || type === 'endorsement_reject') && (brand || product)) {
    return [brand, product].filter(Boolean).join(' ');
  }
  return String(evt.displayLabel || evt.label || [brand, product].filter(Boolean).join(' · ') || evt.tag || '商业动态').trim();
}
function commercialEventTypeRank(type = '') {
  return {
    signature_shoe: 5,
    endorsement_sign: 4,
    endorsement_reject: 3,
    brand_interest: 2,
    media_event: 2,
    facility_upgrade: 1,
    coach_upgrade: 1,
    luxury_purchase: 1,
    purchase: 0
  }[String(type || '').trim().toLowerCase()] ?? 0;
}
function splitCommercialDetailParts(detail = '') {
  return String(detail || '')
    .split(/[；;。]/)
    .map(part => cleanSocialText(part || '').trim())
    .filter(Boolean);
}
function mergeCommercialDetailText(existingDetail = '', incomingDetail = '') {
  const parts = [...splitCommercialDetailParts(existingDetail), ...splitCommercialDetailParts(incomingDetail)];
  const seen = new Set();
  const merged = [];
  parts.forEach(part => {
    const key = normalizeCommercialKeyPart(part);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(part);
  });
  return merged.slice(0, 3).join('；');
}
function normalizeCommercialEvent(label, tag = '消费', meta = {}) {
  const src = label && typeof label === 'object'
    ? { ...label, ...meta }
    : { ...meta, label, tag };
  const eventType = inferCommercialEventType(src.type || src.tag || tag, 'purchase');
  const brand = String(src.brand || '').trim();
  const product = String(src.product || '').trim();
  const categoryKey = String(src.categoryKey || '').trim();
  const displayLabel = String(src.displayLabel || src.label || [brand, product].filter(Boolean).join(' · ') || tag || '商业动态').trim();
  const detail = String(src.detail || '').trim();
  const image = String(src.image || '').trim();
  const imageStatus = String(src.imageStatus || (image ? 'fallback' : '')).trim();
  const logo = buildCommercialEventLogo({
    brand,
    product,
    categoryKey,
    category: String(src.category || src.tag || tag || '').trim(),
    kind: String(src.kind || '').trim(),
    tag: String(src.tag || tag || '').trim(),
    type: eventType,
    label: displayLabel
  });
  return {
    type: eventType,
    label: String(src.label || displayLabel).trim(),
    displayLabel,
    eventKey: String(src.eventKey || '').trim() || buildCommercialEventGroupKey({ ...src, type: eventType, brand, product, displayLabel }),
    tag: String(src.tag || tag || '').trim(),
    category: String(src.category || src.tag || tag || '').trim(),
    categoryKey,
    brand,
    product,
    detail,
    fame: parseNum(src.fame, 0),
    trust: parseNum(src.trust, 0),
    kind: String(src.kind || '').trim(),
    logo,
    image,
    imageStatus,
    playerName: String(src.playerName || G.player?.name || '球员').trim(),
    teamName: String(src.teamName || G.team?.z || '').trim(),
    teamAbbr: String(src.teamAbbr || G.team?.a || '').trim(),
    day: parseNum(src.day, Math.max(0, G.dayNum - 1)),
    season: parseNum(src.season, G.season),
    year: parseNum(src.year, G.year),
    ts: parseNum(src.ts, Date.now()),
    posted: !!src.posted
  };
}
function extractLegacyCommercialBrand(text = '') {
  const raw = cleanSocialText(String(text || '').trim());
  const patterns = [
    /已签下\s*([A-Za-z0-9\u4e00-\u9fa5·]+)/,
    /拒绝(?:了)?\s*([A-Za-z0-9\u4e00-\u9fa5·]+)/,
    /：\s*([A-Za-z0-9\u4e00-\u9fa5·]+)\s*(?:签名鞋|代言|联名|球鞋)/,
    /([A-Za-z0-9\u4e00-\u9fa5·]+)\s*签名鞋/
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return String(match[1]).trim();
  }
  return '';
}
function extractLegacyCommercialDetail(text = '') {
  const raw = cleanSocialText(String(text || '').trim());
  if (!raw) return '';
  const parts = raw.split(/[。.!！?？]/).map(part => cleanSocialText(part || '').trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join('；') : '';
}
function resolveCommercialBrandReference(brand = '') {
  const brandKey = normalizeCommercialKeyPart(brand);
  if (!brandKey) return null;
  const activeState = typeof getEndorsementState === 'function' ? getEndorsementState() : null;
  const activeRef = Array.isArray(activeState?.active)
    ? activeState.active.find(item => normalizeCommercialKeyPart(item?.brand) === brandKey)
    : null;
  if (activeRef) return activeRef;
  if (Array.isArray(typeof ENDORSEMENT_CATALOG !== 'undefined' ? ENDORSEMENT_CATALOG : null)) {
    const catalogRef = ENDORSEMENT_CATALOG.find(item => normalizeCommercialKeyPart(item?.brand) === brandKey);
    if (catalogRef) return catalogRef;
  }
  return null;
}
function inferLegacyCommercialEventType(src = {}) {
  const direct = String(src.type || '').trim().toLowerCase();
  const text = [
    src.text,
    src.detail,
    src.label,
    src.displayLabel,
    src.tag
  ].map(item => cleanSocialText(item || '').trim()).filter(Boolean).join(' ');
  if (/拒绝/.test(text)) return 'endorsement_reject';
  if (/已签下|代言签约|签约完成|合作落地|正式牵手/.test(text)) return 'endorsement_sign';
  if (/已创建|配色|空气动力学|签名鞋|球鞋|生图|L\d/.test(text)) return 'signature_shoe';
  if (direct && direct !== 'purchase') return inferCommercialEventType(direct, direct);
  return inferCommercialEventType(src.tag || src.type || 'purchase', 'purchase');
}
function normalizeLegacyCommercialEventPayload(src = {}) {
  const raw = src && typeof src === 'object' ? src : {};
  const text = cleanSocialText(String(raw.text || '').trim());
  const inferredBrand = String(raw.brand || '').trim() || extractLegacyCommercialBrand(text);
  const ref = resolveCommercialBrandReference(inferredBrand);
  const nextType = inferLegacyCommercialEventType({
    ...raw,
    brand: inferredBrand,
    text
  });
  const detail = String(raw.detail || '').trim() || extractLegacyCommercialDetail(text);
  const baseProduct = String(raw.product || '').trim();
  const nextProduct = nextType === 'signature_shoe'
    ? '签名鞋'
    : (baseProduct && baseProduct !== '签名鞋' ? baseProduct : String(ref?.product || baseProduct || '').trim());
  const nextCategoryKey = String(raw.categoryKey || ref?.categoryKey || '').trim();
  const nextCategory = String(raw.category || ref?.category || raw.tag || '').trim();
  const nextKind = String(raw.kind || ref?.kind || nextCategoryKey || '').trim();
  return normalizeCommercialEvent({
    ...raw,
    type: nextType,
    brand: inferredBrand,
    product: nextProduct,
    categoryKey: nextCategoryKey,
    category: nextCategory,
    kind: nextKind,
    detail,
    image: String(raw.image || '').trim(),
    imageStatus: String(raw.imageStatus || (raw.image ? 'svg' : '')).trim()
  }, raw.tag || nextCategory || '商业');
}
function buildLegacyCommercialEventFromPost(post = {}) {
  if (!post || typeof post !== 'object') return null;
  const text = cleanSocialText(String(post.text || '').trim());
  if (!text) return null;
  return normalizeLegacyCommercialEventPayload({
    label: text,
    text,
    tag: post.tag || '商业',
    detail: extractLegacyCommercialDetail(text),
    brand: String(post.brand || '').trim() || extractLegacyCommercialBrand(text),
    product: String(post.product || '').trim(),
    image: String(post.image || '').trim(),
    imageStatus: String(post.imageStatus || (post.image ? 'svg' : '')).trim(),
    day: parseNum(post.day, Math.max(0, G.dayNum - 1)),
    season: parseNum(post.season, G.season),
    year: parseNum(post.year, G.year),
    ts: parseNum(post.ts, Date.now()),
    playerName: String(post.playerName || G.player?.name || '球员').trim(),
    teamName: String(post.teamName || G.team?.z || '').trim(),
    teamAbbr: String(post.teamAbbr || G.team?.a || '').trim(),
    posted: true
  });
}
function isLegacyCommercialBuzzPost(post = {}) {
  if (!post || typeof post !== 'object') return false;
  const sourceType = String(post.sourceType || '').trim().toLowerCase();
  const text = cleanSocialText(String(post.text || '').trim());
  if (sourceType === 'commercial' && (!String(post.eventKey || '').trim() || !String(post.eventType || '').trim())) return true;
  return /完成了一笔签名鞋相关采购|品牌图/.test(text);
}
function isCommercialSocialPost(post = {}) {
  if (!post || typeof post !== 'object') return false;
  if (String(post.sourceType || '').trim().toLowerCase() === 'commercial') return true;
  return isLegacyCommercialBuzzPost(post);
}
function migrateLegacyCommercialSocialState({ force = false } = {}) {
  ensureSocialState();
  const currentVersion = parseNum(G.social?.commercialSocialVersion, 0);
  const posts = Array.isArray(G.social?.posts) ? G.social.posts : [];
  const events = Array.isArray(G.social?.commercialEvents) ? G.social.commercialEvents : [];
  const hasLegacyPosts = posts.some(post => isLegacyCommercialBuzzPost(post));
  const hasLegacyEvents = events.some(evt => {
    const type = String(evt?.type || '').trim().toLowerCase();
    return !String(evt?.eventKey || '').trim()
      || !String(evt?.logo || '').trim()
      || type === 'purchase'
      || (String(evt?.tag || '').includes('签名鞋') && type !== 'signature_shoe');
  });
  const hasBrokenCommercialPosts = posts.some(post =>
    String(post?.sourceType || '').trim().toLowerCase() === 'commercial' &&
    (!String(post?.eventKey || '').trim() || !String(post?.eventType || '').trim() || !String(post?.logo || '').trim())
  );
  if (!force && currentVersion >= 3 && !hasLegacyPosts && !hasLegacyEvents && !hasBrokenCommercialPosts) {
    return { migrated: false, events: events.length, posts: posts.length };
  }
  const preservedPosts = posts.filter(post => !isCommercialSocialPost(post));
  const legacyPostSources = posts.filter(post => isLegacyCommercialBuzzPost(post)).map(buildLegacyCommercialEventFromPost).filter(Boolean);
  const normalizedSources = [...events, ...legacyPostSources]
    .map(item => normalizeLegacyCommercialEventPayload(item))
    .filter(Boolean)
    .sort((a, b) => parseNum(a?.ts, 0) - parseNum(b?.ts, 0));
  G.social.commercialEvents = [];
  normalizedSources.forEach(item => { upsertCommercialEventRecord(item); });
  const rebuiltEvents = [...(G.social.commercialEvents || [])].sort((a, b) => parseNum(a?.ts, 0) - parseNum(b?.ts, 0));
  G.social.posts = preservedPosts;
  rebuiltEvents.forEach(evt => {
    const post = upsertCommercialBuzzPost(evt);
    if (!post) return;
    // Pool-based text already set in upsertCommercialBuzzPost
  });
  const maxPostId = (G.social.posts || []).reduce((best, post) => Math.max(best, parseNum(post?.id, 0)), 0);
  G.social.nextPostId = Math.max(1, maxPostId + 1);
  G.social.commercialSocialVersion = 3;
  return {
    migrated: true,
    events: (G.social.commercialEvents || []).length,
    posts: (G.social.posts || []).length,
    rebuiltCommercialPosts: rebuiltEvents.length
  };
}
function buildCommercialEventImagePrompt(event = {}) {
  const evt = event || {};
  const playerName = String(evt.playerName || G.player?.name || '球员').trim();
  const label = String(evt.displayLabel || evt.label || evt.brand || '商业动态').trim();
  const detail = String(evt.detail || '').trim();
  const category = String(evt.category || evt.tag || '').trim();
  let focus = '真实商业新闻配图';
  if (evt.type === 'signature_shoe') focus = '签名鞋主体完整可见，鞋型和细节清晰';
  else if (evt.type === 'endorsement_sign') focus = '品牌签约官宣氛围，球员与品牌合作感强';
  else if (evt.type === 'brand_interest') focus = '高端品牌接触的预热视觉，氛围高级';
  else if (evt.type === 'luxury_purchase') focus = '球星生活方式实拍感，主体物件完整';
  else if (evt.type === 'facility_upgrade' || evt.type === 'coach_upgrade') focus = '训练基地或恢复设施的纪实图，专业感明显';
  else if (evt.type === 'media_event') focus = '媒体活动现场图，新闻摄影感强';
  return `为一条中文篮球商业社媒动态生成 1:1 方形配图。
要求：
- 必须是正方形构图，主体完整，不要裁掉鞋、人物或产品
- 像真实社交媒体会配的摄影图，不要海报排版、不要大片文字、不要水印
- 适合手机信息流展示，留白自然，重点明确

事件主角：${playerName}
事件名称：${label}
事件分类：${category || '商业动态'}
细节补充：${detail || '根据该商业动态做真实新闻摄影风配图'}
画面重点：${focus}`;
}
async function enhanceCommercialEventVisualAsync(eventRef, postRef = null) {
  return null;
}
function queueCommercialEventVisualEnhancement(eventRef, postRef = null) {
  enhanceCommercialEventVisualAsync(eventRef, postRef).catch(() => null);
}
const ENDORSEMENT_SINGLE_SLOT_CATEGORIES = new Set(['food', 'auto']);
const SOCIAL_PERSONAS = {
  news: {
    type: '新闻型',
    handles: ['@赛场快报', '@篮球前线', '@联盟观察台', '@晚间体育讯']
  },
  fan: {
    type: '粉丝型',
    handles: ['@真爱球迷阿哲', '@主场北看台', '@湖区老粉', '@少年球迷团']
  },
  hater: {
    type: '黑子型',
    handles: ['@键盘评球', '@毒舌看台', '@杠精联盟', '@反向预测王', '@黑出感情了', '@专业拆台30年']
  },
  neutral: {
    type: '中立型',
    handles: ['@路人看球', '@篮球观察员', '@客观派', '@半场分析']
  },
  data: {
    type: '数据流',
    handles: ['@数据实验室', '@高阶统计师', '@效率模型', '@战术热图']
  },
  gambler: {
    type: '串子型',
    handles: ['@今晚稳赢', '@篮球串子哥', '@盘口分析师', '@让分大师', '@昨晚又红了', '@稳胆推荐王']
  },
  youtuber: {
    type: '野生UP主',
    handles: ['@篮球老炮儿', '@深夜看球室', '@战术大湿', '@野球帝解说', '@三分钟看懂NBA', '@震惊体育圈']
  },
  hottake: {
    type: '热评型',
    handles: ['@锐评哥', '@暴论制造机', '@逆天发言合集', '@球评界泥石流', '@我说的都对']
  },
  casual: {
    type: '吃瓜型',
    handles: ['@刚看NBA三天', '@女朋友让我看球', '@隔壁老王聊球', '@上班摸鱼看比分', '@啥也不懂但我爱看']
  },
  hupu_toxic: {
    type: '虎扑毒舌',
    handles: ['@步行街扛把子', '@虎扑JR真话哥', '@只说实话不怕喷', '@虎扑鉴球大师', '@直播间毒奶王', '@评分只给59']
  },
  oldhead: {
    type: '老球迷',
    handles: ['@看球20年老炮', '@乔丹时代过来人', '@科比门徒', '@老派篮球信徒', '@当年的禅师']
  },
  tactical: {
    type: '战术分析',
    handles: ['@挡拆实验室', '@半场战术板', '@防守端观察', '@转换进攻研究所', '@回合效率分析']
  },
  emotional: {
    type: '情绪球迷',
    handles: ['@看球气到住院', '@赢球就封神输球就交易', '@心态已崩', '@又在骂教练了', '@血压已经220了']
  }
};
function personaHandle(personaKey) {
  const key = String(personaKey || 'neutral').toLowerCase();
  const persona = SOCIAL_PERSONAS[key] || SOCIAL_PERSONAS.neutral || { handles: ['@线上看球'] };
  const handles = Array.isArray(persona.handles) ? persona.handles.filter(Boolean) : [];
  if (!handles.length) return '@线上看球';
  const seed = arguments.length > 1 ? String(arguments[1] || '').trim() : '';
  if (!seed) return handles[0];
  return pickSeedItem(handles, `${key}_${seed}`) || handles[0];
}
// 扩展的评论者用户名池 - 分为多个类别以增加多样性
const SOCIAL_COMMENTER_POOLS = {
  // 普通球迷类
  fans: [
    '@篮圈路人', '@主队铁粉', '@客队球迷', '@吃瓜群众甲', '@纯路人不站队',
    '@看球十年老粉', '@新球迷报到', '@铁杆粉丝团', '@死忠看台', '@季票持有者',
    '@主场气氛组', '@远征军小分队', '@球迷协会会长', '@看台指挥官', '@助威团团长'
  ],
  // 虎扑/论坛风格
  hupu: [
    '@虎扑步行街来的', '@JR代表发言', '@步行街扛把子', '@虎扑老哥', '@街薪百万',
    '@亮了亮了', '@这贴必火', '@前排留名', '@JR日常', '@虎扑签到党',
    '@步行街观察员', '@热评专业户', '@高亮回复', '@被亮次数多', '@虎扑老司机'
  ],
  // 搞笑/调侃类
  funny: [
    '@看热闹不嫌事大', '@前排出售瓜子', '@这也能吵起来', '@杠就完了', '@反转了家人们',
    '@教练下课吧求你了', '@这球我能吹一年', '@防守端看哭了', '@垃圾时间之王', '@血压已拉满',
    '@笑死在评论区', '@这波操作绝了', '@笑看风云淡', '@吃瓜不嫌事大', '@围观群众乙'
  ],
  // 分析/数据类
  analysts: [
    '@冷静分析', '@理性发言', '@数字派', '@懂球帝本帝', '@技术统计狂魔',
    '@赛后复盘师', '@战术板搬运工', '@数据党', '@高阶分析师', '@回合拆解达人',
    '@效率值观察', '@正负值狂魔', '@进阶数据控', '@比赛阅读者', '@战术观察室'
  ],
  // 情绪化球迷
  emotional: [
    '@赢球蜜输球黑', '@心态已崩', '@看球气到住院', '@血压已经220了', '@又在骂裁判了',
    '@爱之深责之切', '@恨铁不成钢', '@每场都看每场都喷', '@真香预警', '@打脸预定',
    '@先抑后扬党', '@情绪过山车', '@看球费烟', '@心脏病预备役', '@绝杀专业户'
  ],
  // 段子手/吐槽类
  comedians: [
    '@今日话题', '@评论区战神', '@我就看看不说话', '@选秀眼光帝', '@伤病满员出发',
    '@替补席观察员', '@更衣室消息灵通人士', '@键盘总经理', '@云教练', '@纸上谈兵大师',
    '@交易建议专家', '@首发调整狂', '@轮换方案设计师', '@战术发明家', '@临场指挥家'
  ],
  // 老球迷/怀旧类
  oldheads: [
    '@看球二十年了', '@老球迷日常', '@当年那支队', '@怀念老时代', '@以前不是这样的',
    '@乔丹时代过来人', '@科比门徒', '@老派篮球信徒', '@硬汉时代遗民', '@防守至上主义者',
    '@那个年代的球迷', '@老球迷茶馆', '@回忆杀专业户', '@经典比赛收藏家', '@历史地位鉴定师'
  ],
  // 新球迷/萌新类
  newbies: [
    '@刚看NBA三天', '@女朋友让我看球', '@隔壁老王聊球', '@上班摸鱼看比分', '@啥也不懂但我爱看',
    '@萌新提问', '@求科普', '@刚入坑', '@跟着朋友看球', '@被安利来的',
    '@新球迷报到', '@学习中', '@认真看球中', '@慢慢懂了', '@入坑真香'
  ],
  // 球队相关
  teamFans: [
    '@湖人死忠', '@凯尔特人老粉', '@勇士王朝见证者', '@热火文化拥趸', '@马刺系球迷',
    '@公牛老粉', '@尼克斯铁杆', '@快船新贵', '@独行侠拥趸', '@76人死忠',
    '@掘金高原战士', '@雄鹿鹿角', '@太阳光芒', '@灰熊磨砺者', '@骑士守护者'
  ],
  // 球星粉丝
  starFans: [
    '@詹密报到', '@库密日常', '@杜密视角', '@字密观察', '@卡密在此',
    '@哈登粉丝团', '@欧文控球粉', '@东契奇死忠', '@塔图姆铁粉', '@布克粉丝',
    '@老科密转粉', '@麦迪老粉', '@艾弗森死忠', '@邓肯门徒', '@奥尼尔时代过来的'
  ]
};

// 扁平化的完整列表（向后兼容）
const SOCIAL_COMMENTERS = Object.values(SOCIAL_COMMENTER_POOLS).flat();

// 记录最近使用的用户名，避免短期内重复
const _recentlyUsedCommenters = [];
const _recentCommentersMaxSize = 50;

// 生成动态用户名
function generateDynamicCommenter(seed = '') {
  const prefixes = ['篮球', 'NBA', '球场', '看台', '篮圈', '三分', '禁区', '快攻', '挡拆', '防守'];
  const suffixes = ['达人', '爱好者', '观察员', '分析师', '老粉', '新粉', '路人', '铁杆', '死忠', '萌新'];
  const numbers = ['', '', '', '23', '24', '30', '11', '13', '21', '3'];
  const verbs = ['看球', '聊球', '评球', '懂球', '爱球', '追球', '打球', '迷球'];
  const nouns = ['少年', '大叔', '小哥', '老哥', '兄弟', '朋友', '同学', '邻居'];

  const seedNum = hashStringToInt(String(seed || Date.now()));
  const type = seedNum % 4;

  let name = '';
  if (type === 0) {
    name = prefixes[seedNum % prefixes.length] + suffixes[(seedNum >> 2) % suffixes.length];
  } else if (type === 1) {
    name = verbs[seedNum % verbs.length] + nouns[(seedNum >> 2) % nouns.length];
  } else if (type === 2) {
    name = prefixes[seedNum % prefixes.length] + numbers[(seedNum >> 2) % numbers.length];
  } else {
    const cities = ['洛杉矶', '纽约', '芝加哥', '迈阿密', '旧金山', '波士顿', '达拉斯', '休斯顿', '费城', '凤凰城'];
    name = cities[seedNum % cities.length] + nouns[(seedNum >> 2) % nouns.length];
  }

  // 添加随机数字后缀增加唯一性
  const numSuffix = (seedNum % 1000);
  return `@${name}${numSuffix}`;
}

// 获取评论者用户名（改进版，减少重复）
function getSocialCommenter(seed = '', avoidRecent = true) {
  const seedStr = String(seed || Date.now());
  const seedNum = hashStringToInt(seedStr);

  // 优先从不同类别中混合选择，增加多样性
  const poolKeys = Object.keys(SOCIAL_COMMENTER_POOLS);
  const selectedPool = SOCIAL_COMMENTER_POOLS[poolKeys[seedNum % poolKeys.length]];

  // 尝试找到一个未使用的用户名
  let attempts = 0;
  let selected = null;

  while (attempts < 10) {
    const idx = (seedNum + attempts * 17) % selectedPool.length;
    const candidate = selectedPool[idx];

    if (!avoidRecent || !_recentlyUsedCommenters.includes(candidate)) {
      selected = candidate;
      break;
    }
    attempts++;
  }

  // 如果所有常用名都用过了，生成动态用户名
  if (!selected) {
    selected = generateDynamicCommenter(seedStr);
  }

  // 记录使用过的用户名
  if (avoidRecent) {
    _recentlyUsedCommenters.push(selected);
    if (_recentlyUsedCommenters.length > _recentCommentersMaxSize) {
      _recentlyUsedCommenters.shift();
    }
  }

  return selected;
}

function detectSocialCommentTopic(text = '', postMeta = null) {
  const sample = [text, postMeta?.author, postMeta?.persona, postMeta?.sourceType].filter(Boolean).join(' ');
  if (/签名鞋|球鞋|代言|品牌|护肤|矿泉水|合同|印钞机|商业/.test(sample)) return 'commercial';
  if (/训练|加练|球馆|脚步|助教|折返跑|清晨|早上|七点半/.test(sample)) return 'training';
  if (/实力榜|前五|垫底|西部|东部|附加赛|季后赛|摆烂|战绩|化学反应/.test(sample)) return 'ranking';
  if (/handcheck|防守|犯规|吹罚|挡拆|突破|对抗/.test(sample.toLowerCase())) return 'rules';
  if (/比较|同位置|对位|样本|窜得很快|逼着进步|联盟里最近/.test(sample)) return 'comparison';
  if (/\d+\s*[-:：]\s*\d+|本场|今晚|揭幕战|末节|绝杀|输球|赢球|战报/.test(sample)) return 'game';
  return 'general';
}
function getSocialCommentTextPool(topic = 'general', tone = 'neutral') {
  const bank = {
    general: {
      positive: ['这句不是场面话，能听出来在认真看球', '有内容，至少比空吹强多了', '能说到这个层面，说明确实关注过细节', '这种发言会让人愿意继续追后续'],
      neutral: ['这条信息量挺大，先留着回头再看', '评论区先别急，样本还得继续放', '这话题后面肯定还会发酵', '比空喊口号强，至少给了点内容'],
      negative: ['现在下结论还是太早了', '热度可以有，定论先别下', '这种话最怕后面被打脸', '我先记着，过几场再回来看']
    },
    commercial: {
      positive: ['这配色确实有记忆点，不是流水线款', '商业团队这波节奏拿捏住了', '只要场上兑现，销量应该不会差', '红金低帮这双是真有辨识度'],
      neutral: ['鞋是挺帅，关键还是得看场上能不能接住', '商业价值走得快，后面表现压力也会更大', '品牌是真会挑故事线，这波话题度够了', '没打一场就出鞋，风险和热度都拉满了'],
      negative: ['先把常规赛打明白，再聊签名鞋也不迟', '商业跑太快，翻车时声音也会更大', '我只关心别把球场表现冲淡了', '没成绩先吃代言，舆论肯定会挑刺']
    },
    training: {
      positive: ['这种清晨训练馆的内容最能拉好感', '勤奋这事骗不了同行，迟早会有人注意到', '年轻人肯这么练，后面大概率要涨球', '比起空喊口号，我更愿意看这种日常'],
      neutral: ['训练馆的故事永远比采访更说明问题', '先把这种强度坚持一个月再说', '绕掩护和脚步本来就是后卫必修课', '没有镜头的时候练成什么样，比赛里都会还回来'],
      negative: ['训练照谁都会发，比赛里兑现才算数', '别最后又变成休赛期球王剧本', '加练当然好，但还是要看正式比赛', '别让镜头只停在训练馆里']
    },
    ranking: {
      positive: ['这种排名一放出来，赛季味道就有了', '强弱分层是有的，但真打起来未必照表演', '我就爱看这种提前立靶子的榜单', '现在被看低，反而更容易憋出反弹'],
      neutral: ['纸面推演每年都有，真正难的是连败后怎么止血', '西部这种环境，一周就能把叙事改写', '排名看看就好，化学反应要打了才知道', '媒体榜单最大的作用就是先点燃评论区'],
      negative: ['这种榜单一半靠想象，另一半靠偏见', '真要按媒体排法打，赛季都不用开了', '现在唱衰容易，翻车的时候也快', '很多人只会看名字，不会看轮换']
    },
    rules: {
      positive: ['如果真这么吹，外线持球手确实要起飞', '规则尺度一变，很多球队的战术优先级都得重排', '这种改动最先受益的一定是能持续压禁区的后卫', '挡拆和第一步爆发的价值会更直接'],
      neutral: ['真正麻烦的是老派外线防守者要重新适应', '这类规则风向最考验教练组应变', '别只盯着突破手，内线协防压力也会一起抬高', '尺度统一比规则本身更重要'],
      negative: ['现在联盟本来就够偏进攻了，再这么吹会更夸张', '怀旧党肯定又要开始怀念老时代了', '尺度要是忽紧忽松，那比不改还难受', '对抗感再削一点，很多老球迷会直接开喷']
    },
    comparison: {
      positive: ['这种同位置互相点名的味道才对', '能被联盟老牌球星点到，本身就是信号', '比较不可怕，可怕的是没人把你放进讨论里', '有人拿来对标，说明已经打进视野了'],
      neutral: ['先把样本打大，比较才更有意思', '同位置之间本来就会互相盯着', '这种话看着平静，其实已经把竞争味道带出来了', '尊重和压力往往是一起到的'],
      negative: ['别急着吹成平起平坐，后面还有很多硬仗', '被点名不代表已经站稳了', '这种比较最怕后面状态一掉就被反噬', '热度先有了，真正难的是把它扛住']
    },
    game: {
      positive: ['这不是刷到数据那么简单，比赛内容也出来了', '真正让人上头的是关键回合处理得够稳', '比分是一回事，场上的气质又是另一回事', '这场之后讨论度肯定会往上走'],
      neutral: ['别只看终场比分，过程也挺有东西', '这种比赛最适合回头再看一遍回合拆解', '赢了输了都先别急，细节值得再抠一遍', '数据能说明一部分，比赛感觉也很重要'],
      negative: ['好看是好看，别把一场球吹成长期结论', '这个夜晚可以记住，但后面还得继续交作业', '输了就是输了，内容再好也得先把胜场拿回来', '有些回合处理还是会被强队针对']
    }
  };
  const safeTopic = bank[topic] ? topic : 'general';
  const safeTone = bank[safeTopic]?.[tone] ? tone : 'neutral';
  return bank[safeTopic]?.[safeTone] || bank.general.neutral;
}
function makeFallbackComments(text, tone = 'neutral', count = 3, postMeta = null) {
  const safeCount = Math.max(0, Math.floor(parseNum(count, 3)));
  const source = String(text || '').trim();
  const topic = detectSocialCommentTopic(source, postMeta);
  const primaryPool = getSocialCommentTextPool(topic, tone);
  const neutralPool = getSocialCommentTextPool(topic, 'neutral');
  const generalPool = getSocialCommentTextPool('general', tone);
  const profile = getSocialPostHeatProfile(postMeta || { text: source, tone });
  const seedBase = `${source}_${topic}_${tone}_${postMeta?.author || ''}_${postMeta?.persona || ''}`;
  const combinedPool = [...primaryPool, ...neutralPool, ...generalPool];
  const used = new Set();
  const comments = [];
  for (let i = 0; comments.length < safeCount && i < Math.max(8, safeCount * 10); i++) {
    const author = getSocialCommenter(`${seedBase}_author_${i}`, true) || `@评论${comments.length + 1}`;
    const candidate = cleanSocialText(String(pickSeedItem(combinedPool, `${seedBase}_text`, i) || '').trim()).slice(0, 32);
    const key = candidate.replace(/\s+/g, '').toLowerCase();
    if (!candidate || used.has(key)) continue;
    used.add(key);
    comments.push({
      author,
      text: candidate,
      likes: clampSocialMetricToRange('', profile.commentLikes, rng(profile.commentLikes[0], profile.commentLikes[1]))
    });
  }
  return comments;
}
function normalizeCommercialCommentList(rawComments, tone = 'neutral', seed = '', fallbackText = '') {
  const items = Array.isArray(rawComments) ? rawComments : [];
  const profile = getSocialPostHeatProfile({ sourceType: 'commercial', tone, text: fallbackText || seed });
  const targetCount = getTargetSocialCommentCount(profile, items.length);
  const normalized = items
    .map(item => typeof item === 'string' ? { text: item } : item)
    .map((item, idx) => {
      const text = cleanSocialText(String(item?.text || item?.comment || '').trim()).slice(0, 26);
      if (!text) return null;
      const author = String(item?.author || '').trim() || getSocialCommenter(`${seed}_${idx}`, true) || `@评论${idx + 1}`;
      return {
        author,
        text,
        likes: parseSocialMetricValue(item?.likes, rng(1, tone === 'positive' ? 88 : 48))
      };
    })
    .filter(Boolean)
    .slice(0, SOCIAL_COMMENT_COUNT_RANGE[1]);
  if (normalized.length < targetCount) {
    const extras = makeFallbackComments(fallbackText || seed, tone, targetCount, { sourceType: 'commercial', text: fallbackText || seed, tone });
    const used = new Set(normalized.map(item => String(item?.text || '').replace(/\s+/g, '').toLowerCase()).filter(Boolean));
    extras.forEach(item => {
      if (normalized.length >= targetCount) return;
      const key = String(item?.text || '').replace(/\s+/g, '').toLowerCase();
      if (!key || used.has(key)) return;
      used.add(key);
      normalized.push(item);
    });
  }
  return normalized.length ? normalized.slice(0, targetCount) : makeFallbackComments(fallbackText || seed, tone, targetCount, { sourceType: 'commercial', text: fallbackText || seed, tone });
}

const SOCIAL_LINK_STATUS = {
  rival: { id: 'rival', label: '宿敌', badgeClass: 'b-purple', priority: 4 },
  friend: { id: 'friend', label: '朋友', badgeClass: 'b-gold', priority: 3 },
  respect: { id: 'respect', label: '尊重', badgeClass: 'b-pri', priority: 2 },
  tense: { id: 'tense', label: '竞争', badgeClass: 'b-silver', priority: 1 },
  neutral: { id: 'neutral', label: '普通', badgeClass: '', priority: 0 }
};
function socialPlayerRefKey(teamId, playerId, isSelf = false, name = '') {
  if (isSelf) return 'USER_SELF';
  const tid = parseNum(teamId, 0);
  const pid = String(playerId ?? '').trim();
  if (tid > 0 && pid) return `${tid}_${pid}`;
  const nk = nameKey(name);
  return nk ? `name:${nk}` : '';
}
function buildStarHandleFromName(name = '', teamAbbr = '') {
  const base = String(name || '').trim().replace(/\s+/g, '');
  const clean = base.replace(/[^\p{L}\p{N}_]+/gu, '');
  if (!clean) return '@联盟球星';
  const suffixPool = ['Hoops', 'Tape', 'Talk', 'Live', String(teamAbbr || '').trim()].filter(Boolean);
  const suffix = suffixPool[(clean.length + suffixPool.length) % suffixPool.length] || '';
  const hasAscii = /^[A-Za-z0-9_]+$/.test(clean);
  if (hasAscii) return `@${clean}${suffix}`;
  return `@${clean}`;
}
function buildSocialStarArchetype(row = {}) {
  const ppg = parseNum(row.ppg, 0);
  const apg = parseNum(row.apg, 0);
  const rpg = parseNum(row.rpg, 0);
  const bpg = parseNum(row.bpg, 0);
  const spg = parseNum(row.spg, 0);
  const pos = parseNum(row.pos, 3);
  if (ppg >= 26) return pos <= 2 ? '外线得分手' : '锋线核心';
  if (apg >= 8) return '组织核心';
  if (rpg >= 11) return pos >= 4 ? '禁区支柱' : '篮板机器';
  if (bpg >= 2 || spg >= 2) return '防守尖兵';
  if (pos <= 2) return '后场球星';
  if (pos === 3) return '锋线主将';
  return '内线球星';
}
function buildSocialLeaguePlayerPool() {
  ensureSocialState();
  const cacheKey = [
    parseNum(G.season, 0),
    parseNum(G.dayNum, 0),
    String(G.player?.id || '').trim(),
    Object.keys(LEAGUE?.teams || {}).length,
    Object.keys(G.leagueSeason?.playerStats || {}).length
  ].join('_');
  const cached = G.social?._leaguePlayerPoolCache;
  if (cached?.key === cacheKey && Array.isArray(cached.pool)) return cached.pool.slice();
  const pool = [];
  const leagueTeams = LEAGUE?.teams || {};
  Object.values(leagueTeams).forEach(teamObj => {
    const teamId = parseNum(teamObj?.meta?.id, 0);
    (teamObj?.players || []).forEach(player => {
      if (!player || String(player.id || '') === String(G.player?.id || '')) return;
      const key = leaguePlayerKey(teamId, player.id, false);
      const ps = G.leagueSeason?.playerStats?.[key] || {};
      const gp = Math.max(0, Math.floor(parseNum(ps.gp, 0)));
      const rating = parseNum(player.rating, ovr(player.attrs && Object.keys(player.attrs).length ? player.attrs : parsePlayerAttrs(player)));
      pool.push({
        key,
        teamId,
        playerId: player.id,
        name: String(player.name || ps.name || '球员').trim(),
        nameEn: String(player.nameEn || player.altName || '').trim(),
        avatar: String(player.avatar || '').trim(),
        photo: String(player.photo || '').trim(),
        imageId: parseNum(player.image, parseNum(ps.image, 0)),
        pos: parseNum(player.pos, parseNum(ps.pos, 3)),
        rating,
        gp,
        ppg: gp > 0 ? +(parseNum(ps.pts, 0) / gp).toFixed(1) : 0,
        apg: gp > 0 ? +(parseNum(ps.ast, 0) / gp).toFixed(1) : 0,
        rpg: gp > 0 ? +(parseNum(ps.reb, 0) / gp).toFixed(1) : 0,
        spg: gp > 0 ? +(parseNum(ps.stl, 0) / gp).toFixed(1) : 0,
        bpg: gp > 0 ? +(parseNum(ps.blk, 0) / gp).toFixed(1) : 0,
        fgPct: gp > 0 ? +(parseNum(ps.fga, 0) > 0 ? parseNum(ps.fgm, 0) / Math.max(1, parseNum(ps.fga, 0)) * 100 : 0).toFixed(1) : 0
      });
    });
  });
  G.social._leaguePlayerPoolCache = { key: cacheKey, pool };
  return pool.slice();
}
function scoreSocialStarRow(row = {}) {
  const teamRecord = G.leagueSeason?.teamRecords?.[parseNum(row.teamId, 0)] || {};
  const gp = Math.max(0, parseNum(teamRecord.gp, 0));
  const winPct = gp > 0 ? parseNum(teamRecord.w, 0) / gp : 0.5;
  const samePosBonus = parseNum(row.pos, -1) === parseNum(G.player?.pos, -2) ? 6 : 0;
  return (
    parseNum(row.rating, 75) * 1.15 +
    parseNum(row.ppg, 0) * 3 +
    parseNum(row.apg, 0) * 2.2 +
    parseNum(row.rpg, 0) * 1.8 +
    parseNum(row.spg, 0) * 1.4 +
    parseNum(row.bpg, 0) * 1.4 +
    winPct * 14 +
    samePosBonus
  );
}
function ensureSocialStarProfile(row = {}) {
  ensureSocialState();
  const key = socialPlayerRefKey(row.teamId, row.playerId, false, row.name);
  if (!key) return null;
  if (!G.social.starProfiles[key] || typeof G.social.starProfiles[key] !== 'object') G.social.starProfiles[key] = {};
  const team = getTeam(parseNum(row.teamId, 0)) || {};
  const profile = G.social.starProfiles[key];
  profile.key = key;
  profile.playerId = row.playerId;
  profile.teamId = parseNum(row.teamId, 0);
  profile.name = String(row.name || profile.name || '球星').trim();
  profile.nameEn = String(row.nameEn || profile.nameEn || '').trim();
  profile.pos = parseNum(row.pos, profile.pos ?? 3);
  profile.rating = parseNum(row.rating, profile.rating ?? 75);
  profile.teamAbbr = String(team.a || profile.teamAbbr || '--').trim();
  profile.teamName = String(team.z || team.n || profile.teamName || '').trim();
  profile.handle = String(profile.handle || buildStarHandleFromName(profile.nameEn || profile.name, profile.teamAbbr)).trim();
  profile.archetype = String(profile.archetype || buildSocialStarArchetype(row)).trim();
  profile.avatar = String(row.avatar || profile.avatar || '').trim();
  profile.imageId = parseNum(row.imageId, profile.imageId ?? 0);
  if (typeof getPlayerPhotoSrc === 'function') {
    profile.photo = String(getPlayerPhotoSrc({
      avatar: profile.avatar,
      photo: String(row.photo || profile.photo || '').trim(),
      image: profile.imageId
    }) || profile.photo || '').trim();
  } else if (row.photo !== undefined) {
    profile.photo = String(row.photo || profile.photo || '').trim();
  }
  return profile;
}
function getSocialStarProfileByRef(ref = {}) {
  ensureSocialState();
  const key = String(ref.key || socialPlayerRefKey(ref.teamId, ref.playerId, !!ref.isSelf, ref.name)).trim();
  if (key && G.social.starProfiles?.[key]) return G.social.starProfiles[key];
  const pool = buildSocialLeaguePlayerPool();
  const matched = pool.find(row =>
    String(row.key) === key ||
    (String(ref.playerId || '') && String(row.playerId) === String(ref.playerId) && parseNum(row.teamId, 0) === parseNum(ref.teamId, 0)) ||
    (String(ref.name || '').trim() && String(row.name || '').trim() === String(ref.name || '').trim())
  );
  if (matched) return ensureSocialStarProfile(matched);
  if (!key) return null;
  return ensureSocialStarProfile({
    key,
    playerId: ref.playerId,
    teamId: parseNum(ref.teamId, 0),
    name: String(ref.name || '球星').trim(),
    pos: parseNum(ref.pos, 3),
    rating: parseNum(ref.rating, 80)
  });
}
function resolveSocialLinkStatus(link = null) {
  const affinity = clamp(parseNum(link?.affinity, 0), -100, 100);
  const respect = clamp(parseNum(link?.respect, 0), 0, 100);
  const heat = clamp(parseNum(link?.heat, 0), 0, 100);
  if (affinity <= -28 || (affinity <= -12 && heat >= 36)) return SOCIAL_LINK_STATUS.rival;
  if (affinity >= 30) return SOCIAL_LINK_STATUS.friend;
  if (respect >= 18) return SOCIAL_LINK_STATUS.respect;
  if (heat >= 18 || affinity <= -10) return SOCIAL_LINK_STATUS.tense;
  return SOCIAL_LINK_STATUS.neutral;
}
function ensureRivalryState() {
  ensureSocialState();
  if (!G.social.rivalry || typeof G.social.rivalry !== 'object') {
    G.social.rivalry = { lastPreviewGameKey: '', lastResultGameKey: '' };
  }
  if (typeof G.social.rivalry.lastPreviewGameKey !== 'string') G.social.rivalry.lastPreviewGameKey = '';
  if (typeof G.social.rivalry.lastResultGameKey !== 'string') G.social.rivalry.lastResultGameKey = '';
  return G.social.rivalry;
}
function getPrimaryRivalRelationship() {
  ensureSocialState();
  const rivalLink = Object.values(G.social.playerLinks || {})
    .filter(link => resolveSocialLinkStatus(link).id === 'rival')
    .sort((a, b) =>
      parseNum(b.heat, 0) - parseNum(a.heat, 0) ||
      parseNum(a.affinity, 0) - parseNum(b.affinity, 0) ||
      parseNum(b.respect, 0) - parseNum(a.respect, 0)
    )[0] || null;
  if (!rivalLink) return null;
  const profile = getSocialStarProfileByRef(rivalLink);
  if (!profile) return null;
  return {
    link: rivalLink,
    profile,
    status: resolveSocialLinkStatus(rivalLink)
  };
}
function getUpcomingRivalMatchupInfo() {
  const rival = getPrimaryRivalRelationship();
  if (!rival?.profile) return null;
  const schedule = Array.isArray(G.schedule) ? G.schedule : [];
  const startIdx = Math.max(0, parseNum(G.gameNum, 0));
  for (let i = startIdx; i < schedule.length; i++) {
    const game = schedule[i];
    if (parseNum(game?.opp, 0) !== parseNum(rival.profile.teamId, 0)) continue;
    const gameDay = Array.isArray(G.gameDays) ? parseNum(G.gameDays[i], NaN) : NaN;
    return {
      ...rival,
      gameIndex: i,
      gameDay: Number.isFinite(gameDay) ? gameDay : null,
      daysUntil: Number.isFinite(gameDay) ? Math.max(0, gameDay - parseNum(G.dayNum, 0)) : null,
      home: !!game?.home,
      opponent: getTeam(parseNum(game?.opp, 0)) || null
    };
  }
  return {
    ...rival,
    gameIndex: -1,
    gameDay: null,
    daysUntil: null,
    home: false,
    opponent: getTeam(parseNum(rival.profile.teamId, 0)) || null
  };
}
function syncPrimaryRivalFromSocialLinks() {
  ensureSocialState();
  const rivals = Object.values(G.social.playerLinks || {})
    .filter(link => resolveSocialLinkStatus(link).id === 'rival')
    .sort((a, b) => parseNum(b.heat, 0) - parseNum(a.heat, 0) || parseNum(a.affinity, 0) - parseNum(b.affinity, 0));
  G.player.rivalId = rivals.length ? parseNum(rivals[0].playerId, 0) : 0;
}
function syncTeammateRelationFromSocialLink(profile = {}, { affinityDelta = 0, respectDelta = 0, heatDelta = 0, source = '' } = {}) {
  const teamId = parseNum(profile?.teamId, 0);
  const playerId = parseNum(profile?.playerId, 0);
  const currentTeamId = parseNum(G.teamId, 0);
  if (!teamId || !playerId || teamId !== currentTeamId) return null;
  if (typeof ensureTeammateRelation !== 'function' || typeof recalculateTeamChemistry !== 'function') return null;

  const teammate = typeof findTeamPlayerById === 'function'
    ? findTeamPlayerById(teamId, playerId)
    : ((getTeamPlayers(teamId) || []).find(player => parseNum(player?.id, 0) === playerId) || null);
  if (!teammate) return null;

  const entry = ensureTeammateRelation(teammate, teamId);
  if (!entry) return null;

  const affinity = parseNum(affinityDelta, 0);
  const respect = parseNum(respectDelta, 0);
  const heat = parseNum(heatDelta, 0);
  let favorDelta = affinity * 0.28 + respect * 0.14;
  if (affinity < 0) favorDelta -= heat * 0.12;
  else if (affinity > 0 && respect > 0) favorDelta += Math.min(1.2, heat * 0.04);

  let usageDelta = 0;
  if (affinity >= 8 || respect >= 8) usageDelta += 1;
  if (affinity <= -8) usageDelta -= 2;
  else if (heat >= 14 && affinity <= 0) usageDelta -= 1;

  let veteranDelta = 0;
  if (entry.isVeteran && respect >= 10) veteranDelta += 1;
  if (entry.isVeteran && affinity <= -8) veteranDelta -= 1;

  favorDelta = Math.round(favorDelta);
  usageDelta = Math.round(usageDelta);
  veteranDelta = Math.round(veteranDelta);
  if (!favorDelta && !usageDelta && !veteranDelta) return null;

  const oldFavor = parseNum(entry.favorability, 50);
  const oldUsage = parseNum(entry.usageSatisfaction, 0);
  const oldVeteran = parseNum(entry.veteranEndorsement, 0);
  entry.favorability = clamp(oldFavor + favorDelta, 0, 100);
  entry.usageSatisfaction = clamp(oldUsage + usageDelta, -40, 40);
  entry.veteranEndorsement = clamp(oldVeteran + veteranDelta, -20, 20);
  entry.interactions = parseNum(entry.interactions, 0) + 1;
  entry.lastInteractionDay = parseNum(G.dayNum, 0);
  entry.lastSource = String(source || '社媒互动').trim();
  const chemistry = recalculateTeamChemistry();

  if (typeof pushTeamRelationEvent === 'function' && (Math.abs(favorDelta) >= 2 || usageDelta !== 0)) {
    const positive = favorDelta + usageDelta >= 0;
    const sourceLabel = String(source || '').includes('回复') ? '社媒回复' : '社媒互动';
    pushTeamRelationEvent({
      playerId,
      playerName: entry.name,
      title: `${entry.name} ${positive ? '注意到了你的互动' : '对你的互动有点意见'}`,
      detail: positive
        ? `你在手机上的 ${sourceLabel} 让 ${entry.name} 对你的观感有所回暖。`
        : `你在手机上的 ${sourceLabel} 让 ${entry.name} 觉得你有点呛，队内观感下降。`,
      favorDelta,
      usageDelta,
      veteranDelta,
      type: positive ? 'pos' : 'neg',
      source: sourceLabel
    });
  }

  return {
    playerId,
    playerName: entry.name,
    favorDelta,
    usageDelta,
    veteranDelta,
    chemistry
  };
}
function buildRivalryGameModifier(player, { teamId = 0, oppProfile = null } = {}) {
  const rival = getPrimaryRivalRelationship();
  if (!rival?.profile || !rival?.link) return null;
  const rivalTeamId = parseNum(rival.profile.teamId, 0);
  const rivalPlayerId = parseNum(rival.profile.playerId, 0);
  const currentTeamId = parseNum(teamId, 0);
  const opponentTeamId = parseNum(oppProfile?.teamId, 0);
  const playerId = parseNum(player?.id, 0);
  const isSelf = !!player?.isSelf || String(player?.id || '') === 'USER_SELF';
  const heat = clamp(parseNum(rival.link.heat, 0), 0, 100);
  const respect = clamp(parseNum(rival.link.respect, 0), 0, 100);
  const tension = clamp((heat * 0.75 + respect * 0.35) / 100, 0.18, 0.92);

  if (isSelf && rivalTeamId === opponentTeamId) {
    const swing = rng(-2, 3) / 100;
    return {
      usageMult: 1 + tension * 0.05,
      astMult: 1 + tension * 0.03,
      stocksMult: 1 + tension * 0.05,
      efficiencyShift: 0.008 + swing,
      note: `${rival.profile.name} 在对面，宿敌对位让你的比赛强度被拉高`,
      tag: 'rival_user'
    };
  }
  if (!isSelf && currentTeamId === rivalTeamId && opponentTeamId === parseNum(G.teamId, 0) && playerId === rivalPlayerId) {
    const swing = rng(-3, 2) / 100;
    return {
      usageMult: 1 + tension * 0.06,
      stocksMult: 1 + tension * 0.04,
      efficiencyShift: 0.004 + swing,
      note: `宿敌对位，这场 ${rival.profile.name} 明显更想在你面前证明自己`,
      tag: 'rival_opponent'
    };
  }
  return null;
}
function maybeQueueRivalGamePreview(oppTeamId = 0, gameKey = '') {
  const rival = getPrimaryRivalRelationship();
  if (!rival?.profile) return null;
  if (parseNum(oppTeamId, 0) !== parseNum(rival.profile.teamId, 0)) return null;
  const state = ensureRivalryState();
  const key = String(gameKey || `${parseNum(G.season, 1)}_${parseNum(G.dayNum, 0)}_${parseNum(oppTeamId, 0)}_${parseNum(rival.profile.playerId, 0)}`).trim();
  if (state.lastPreviewGameKey === key) return null;
  state.lastPreviewGameKey = key;
  const heat = parseNum(rival.link?.heat, 0);
  const taunts = heat >= 55
    ? [
      `${rival.profile.name} 在手机上放话：今晚别想着轻松过关，我会把每个回合都打在你脸上。`,
      `${rival.profile.name} 传来一句话：热度够了，晚上见真章。`,
      `${rival.profile.name} 赛前已经开口了：你今晚每一次拿球，我都会记住。`
    ]
    : [
      `${rival.profile.name} 提醒你：下一次对位到了，别让这条线掉下去。`,
      `${rival.profile.name} 赛前有动静：今晚这场，他显然已经准备好了。`,
      `${rival.profile.name} 的名字又出现在手机里，火药味在升。`
    ];
  const phoneText = pick(taunts);
  addPhone('宿敌动态', phoneText, 'warn');
  addNews(`🔥 今晚将对位宿敌 ${rival.profile.name}，这场比赛的舆论热度正在抬升。`, 'neg');
  return {
    rival,
    phoneText,
    title: `今晚对位宿敌 ${rival.profile.name}`,
    detail: heat >= 55 ? '双方的火药味已经拉满，这场不会只是普通常规赛。' : '这条宿敌线又推进了一步，手机和舆论都会盯着这场球。'
  };
}
function applyRivalryAfterGame(result) {
  const rival = getPrimaryRivalRelationship();
  if (!result || !rival?.profile) return null;
  const opponentTeamId = parseNum(result?.opp, 0);
  if (!opponentTeamId || parseNum(rival.profile.teamId, 0) !== opponentTeamId) return null;

  const rivalRows = parseNum(result.homeTeamId, 0) === parseNum(G.teamId, 0) ? result.awayRows : result.homeRows;
  const rivalRow = (Array.isArray(rivalRows) ? rivalRows : []).find(row => parseNum(row?.playerId, 0) === parseNum(rival.profile.playerId, 0) && !row?.status) || null;
  if (!rivalRow) return null;

  const rivalryState = ensureRivalryState();
  const resultKey = String(result?.gameId || `${parseNum(G.season, 1)}_${parseNum(result?.game, 0)}_${parseNum(rival.profile.playerId, 0)}`).trim();
  if (rivalryState.lastResultGameKey === resultKey) return null;
  rivalryState.lastResultGameKey = resultKey;

  const playerScore =
    parseNum(result.pts, 0) * 1.2 +
    parseNum(result.ast, 0) * 1.0 +
    parseNum(result.reb, 0) * 0.8 +
    parseNum(result.stl, 0) * 1.7 +
    parseNum(result.blk, 0) * 1.6 -
    parseNum(result.tov, 0) * 0.7 +
    (result.win ? 5 : 0);
  const rivalScore =
    parseNum(rivalRow.pts, 0) * 1.2 +
    parseNum(rivalRow.ast, 0) * 1.0 +
    parseNum(rivalRow.reb, 0) * 0.8 +
    parseNum(rivalRow.stl, 0) * 1.7 +
    parseNum(rivalRow.blk, 0) * 1.6 -
    parseNum(rivalRow.tov, 0) * 0.7 +
    (!result.win ? 5 : 0);
  const duelDiff = +(playerScore - rivalScore).toFixed(1);

  let affinityDelta = -1;
  let respectDelta = 1;
  let heatDelta = 4;
  let fameDelta = 0;
  let trustDelta = 0;
  let moodDelta = 0;
  let title = `你和 ${rival.profile.name} 这场打成了拉锯战`;
  let detail = `你拿到 ${parseNum(result.pts, 0)} 分 ${parseNum(result.ast, 0)} 助，对方回了 ${parseNum(rivalRow.pts, 0)} 分 ${parseNum(rivalRow.ast, 0)} 助，宿敌线继续升温。`;
  let phoneText = `${rival.profile.name} 的这场对位已经被手机和舆论记下了，这条线还会继续。`;
  let newsType = 'neu';

  if (duelDiff >= 8 && result.win) {
    affinityDelta = -3;
    respectDelta = 3;
    heatDelta = 8;
    fameDelta = 1;
    trustDelta = 1;
    moodDelta = -1;
    title = `你在宿敌对位里压过了 ${rival.profile.name}`;
    detail = `这场你赢球也赢了对位，${rival.profile.name} 只会更想在下一次把账收回来。`;
    phoneText = `${rival.profile.name} 赛后传话：这场你拿了，但别把它当结束。下一次我会把对位强度再往上拉。`;
    newsType = 'pos';
  } else if (duelDiff >= 3) {
    affinityDelta = -2;
    respectDelta = 2;
    heatDelta = 6;
    title = `你在和 ${rival.profile.name} 的对位里稍占上风`;
    detail = `对位层面你更稳一点，宿敌热度顺势又往上推了一截。`;
    phoneText = `${rival.profile.name} 对这场不太服气，手机上的火药味只会更重。`;
  } else if (duelDiff <= -8) {
    affinityDelta = -4;
    respectDelta = 2;
    heatDelta = 9;
    trustDelta = result.win ? 0 : -1;
    moodDelta = 1;
    title = `${rival.profile.name} 在这场宿敌对位里压住了你`;
    detail = `这场对位明显被对方抢了风头，下一次碰面前，外界会一直拿这场来压你。`;
    phoneText = `${rival.profile.name} 赛后放话：今晚这笔账我先收下了。下一次碰面，别再给我这么轻松。`;
    newsType = 'neg';
  } else if (duelDiff <= -3) {
    affinityDelta = -3;
    respectDelta = 1;
    heatDelta = 7;
    moodDelta = 1;
    title = `${rival.profile.name} 在关键回合里压了你一头`;
    detail = `虽然差距不算大，但这场宿敌对位最后的话题更多落到了对面。`;
    phoneText = `${rival.profile.name} 这场把话题拿走了，下一次见面前你都得带着这口气。`;
    newsType = 'neg';
  }

  const relation = applySocialPlayerLinkDelta(rival.profile, {
    affinityDelta,
    respectDelta,
    heatDelta,
    source: '宿敌对位'
  });
  if (fameDelta || trustDelta) applyReputationDelta({ fame: fameDelta, trust: trustDelta, source: '宿敌对位' });
  if (moodDelta) G.player.mood = clamp(parseNum(G.player.mood, 50) + moodDelta, 0, 100);

  addPhone('宿敌动态', phoneText, duelDiff >= 0 ? 'info' : 'warn');
  addNews(`🔥 宿敌对位更新：${title}`, newsType);

  const summary = {
    rival: rival.profile,
    rivalRow,
    duelDiff,
    title,
    detail,
    relation
  };
  result.rivalrySummary = summary;
  if (Array.isArray(result.events)) result.events.push(`🔥 ${title}：${detail}`);
  return summary;
}
function applySocialPlayerLinkDelta(ref = {}, { affinityDelta = 0, respectDelta = 0, heatDelta = 0, source = '' } = {}) {
  ensureSocialState();
  const profile = getSocialStarProfileByRef(ref);
  if (!profile) return null;
  const key = String(profile.key || '').trim();
  if (!key) return null;
  if (!G.social.playerLinks[key] || typeof G.social.playerLinks[key] !== 'object') {
    G.social.playerLinks[key] = {
      key,
      playerId: profile.playerId,
      teamId: profile.teamId,
      name: profile.name,
      handle: profile.handle,
      pos: profile.pos,
      affinity: 0,
      respect: 0,
      heat: 0,
      interactions: 0,
      lastDay: -1,
      lastSource: ''
    };
  }
  const link = G.social.playerLinks[key];
  const oldStatus = resolveSocialLinkStatus(link);
  link.playerId = profile.playerId;
  link.teamId = profile.teamId;
  link.name = profile.name;
  link.handle = profile.handle;
  link.pos = profile.pos;
  link.teamAbbr = profile.teamAbbr;
  link.teamName = profile.teamName;
  link.affinity = clamp(parseNum(link.affinity, 0) + parseNum(affinityDelta, 0), -100, 100);
  link.respect = clamp(parseNum(link.respect, 0) + Math.max(0, parseNum(respectDelta, 0)), 0, 100);
  link.heat = clamp(parseNum(link.heat, 0) + Math.max(0, parseNum(heatDelta, 0)), 0, 100);
  link.interactions = parseNum(link.interactions, 0) + 1;
  link.lastDay = parseNum(G.dayNum, 0);
  link.lastSource = String(source || '').trim();
  const newStatus = resolveSocialLinkStatus(link);
  const teamSync = syncTeammateRelationFromSocialLink(profile, { affinityDelta, respectDelta, heatDelta, source });
  syncPrimaryRivalFromSocialLinks();
  if (oldStatus.id !== newStatus.id) {
    if (newStatus.id === 'friend') {
      addPhone('社媒关系', `${profile.name} 现在更愿意公开支持你了。你们的关系已升级为朋友。`, 'info');
      addNews(`🤝 ${profile.name} 与你的关系升温，已经公开站到你这边。`, 'pos');
    } else if (newStatus.id === 'rival') {
      addPhone('社媒关系', `${profile.name} 把你视为宿敌，后续对位会更有火药味。`, 'warn');
      addNews(`🔥 ${profile.name} 开始公开把你当成宿敌。`, 'neg');
    } else if (newStatus.id === 'respect') {
      addPhone('社媒关系', `${profile.name} 开始正面评价你，你在球星圈里拿到了一层尊重。`, 'info');
    }
  }
  return { link, profile, oldStatus, newStatus, teamSync };
}
function getTrackedSocialRelationships(limit = 6) {
  ensureSocialState();
  return Object.values(G.social.playerLinks || {})
    .map(link => ({
      ...link,
      status: resolveSocialLinkStatus(link),
      profile: getSocialStarProfileByRef(link)
    }))
    .filter(link => link.status.id !== 'neutral' && link.profile)
    .sort((a, b) =>
      parseNum(b.status.priority, 0) - parseNum(a.status.priority, 0) ||
      Math.max(Math.abs(parseNum(b.affinity, 0)), parseNum(b.respect, 0), parseNum(b.heat, 0)) -
      Math.max(Math.abs(parseNum(a.affinity, 0)), parseNum(a.respect, 0), parseNum(a.heat, 0))
    )
    .slice(0, Math.max(1, parseNum(limit, 6)));
}
function buildSocialRelationshipFeedView(limit = 4) {
  const all = getTrackedSocialRelationships(32);
  const list = all.slice(0, Math.max(1, parseNum(limit, 4)));
  return {
    list,
    friendCount: all.filter(item => item.status.id === 'friend').length,
    rivalCount: all.filter(item => item.status.id === 'rival').length,
    respectCount: all.filter(item => item.status.id === 'respect').length
  };
}
function getSocialRelationshipBadgeForPost(post = {}) {
  const key = String(post.playerRefKey || '').trim();
  if (!key || !G.social?.playerLinks?.[key]) return null;
  const status = resolveSocialLinkStatus(G.social.playerLinks[key]);
  return status.id === 'neutral' ? null : status;
}
function appendPlayerStatementLog(entry = {}) {
  ensureSocialState();
  G.social.playerStatementLog.unshift({
    day: parseNum(entry.day, G.dayNum),
    season: parseNum(entry.season, G.season),
    title: String(entry.title || '社媒发言').trim(),
    type: String(entry.type || 'social').trim(),
    text: cleanSocialText(entry.text || ''),
    choiceId: String(entry.choiceId || '').trim(),
    analysisText: String(entry.analysisText || '').trim(),
    ts: parseNum(entry.ts, Date.now())
  });
  if (G.social.playerStatementLog.length > 12) G.social.playerStatementLog.length = 12;
}
function analyzePlayerSocialText(text = '', { targetPost = null, mode = 'post' } = {}) {
  const raw = normalizeChosenStatementText(text);
  const lower = raw.toLowerCase();
  const countAny = (list = []) => list.reduce((sum, token) => sum + ((raw.includes(token) || lower.includes(String(token).toLowerCase())) ? 1 : 0), 0);
  const praise = countAny(['respect', '佩服', '牛', '厉害', '欣赏', '兄弟', '喜欢看', '致敬', '支持', '合作', '一起', '谢谢']);
  const toxic = countAny(['垃圾', '软', '碰瓷', '水货', '闭嘴', '别装', '刷子', '废', '滚', '算了吧', '锁死', '打爆你']);
  const competitive = countAny(['下次见', '下一场', '对位', '碰面', '点名', '记住', '等着', '较量', '单挑', 'battle']);
  const humble = countAny(['团队', '球队', '我们', '赢球', '防守', '执行', '比赛', '继续努力', '学习']);
  const selfPromo = countAny(['我是', '我会', '该轮到我', '该我', '证明', '别忽视我', '我就是']);
  let relationAffinity = 0;
  let relationRespect = 0;
  let relationHeat = 0;
  let fame = 0;
  let trust = 0;
  let label = '普通互动';
  let tone = 'neutral';
  if (toxic >= Math.max(1, praise) || (competitive >= 2 && praise === 0 && humble === 0)) {
    relationAffinity = -12 - Math.max(0, toxic - 1) * 3;
    relationRespect = competitive > 0 ? 4 : 1;
    relationHeat = 12 + competitive * 4 + toxic * 2;
    fame = 1;
    trust = toxic >= 2 ? -2 : -1;
    label = mode === 'reply' ? '火药味上升' : '公开挑衅';
    tone = competitive > 0 ? 'competitive' : 'negative';
  } else if (praise >= 1 || humble >= 2) {
    relationAffinity = 10 + praise * 2;
    relationRespect = 8 + humble * 2 + praise;
    fame = 1;
    trust = 1;
    label = mode === 'reply' ? '关系回暖' : '职业发言';
    tone = 'positive';
  } else if (competitive >= 1) {
    relationAffinity = -4 - Math.max(0, competitive - 1) * 2;
    relationRespect = 7 + competitive * 2;
    relationHeat = 10 + competitive * 3;
    fame = 1;
    label = '形成对位话题';
    tone = 'competitive';
  } else if (selfPromo >= 2) {
    fame = 1;
    trust = -1;
    relationAffinity = -3;
    relationRespect = 2;
    relationHeat = 4;
    label = '个人锋芒外露';
  }
  if (targetPost?.authorType === 'star' && mode === 'reply' && !relationAffinity && !relationRespect && !relationHeat) {
    relationAffinity = 3;
    relationRespect = 4;
    label = '被球星注意到';
  }
  return { label, tone, fame, trust, relationAffinity, relationRespect, relationHeat, raw };
}
function findMentionedSocialStars(text = '', limit = 2) {
  const raw = normalizeChosenStatementText(text);
  const lower = raw.toLowerCase();
  const pool = [
    ...getTrackedSocialRelationships(8).map(item => item.profile).filter(Boolean),
    ...buildSocialLeaguePlayerPool().sort((a, b) => scoreSocialStarRow(b) - scoreSocialStarRow(a)).slice(0, 18).map(row => ensureSocialStarProfile(row)).filter(Boolean)
  ];
  const seen = new Set();
  const matched = [];
  pool.forEach(profile => {
    const key = String(profile?.key || '').trim();
    if (!key || seen.has(key)) return;
    const tokens = [
      String(profile.name || '').trim(),
      String(profile.nameEn || '').trim(),
      String(profile.handle || '').trim()
    ].filter(Boolean);
    if (tokens.some(token => raw.includes(token) || lower.includes(token.toLowerCase()))) {
      seen.add(key);
      matched.push(profile);
    }
  });
  return matched.slice(0, Math.max(1, parseNum(limit, 2)));
}
function buildStarTweetCandidates(dayResult = {}, count = 2) {
  const pool = buildSocialLeaguePlayerPool().sort((a, b) => scoreSocialStarRow(b) - scoreSocialStarRow(a));
  const relationRows = getTrackedSocialRelationships(8);
  const picked = [];
  const used = new Set();
  const pushProfile = (profile, topic) => {
    const safe = getSocialStarProfileByRef(profile);
    const key = String(safe?.key || '').trim();
    if (!safe || !key || used.has(key)) return;
    used.add(key);
    picked.push({ profile: safe, topic });
  };
  if (dayResult?.isGame && parseNum(dayResult?.gameResult?.opp, 0) > 0) {
    const oppStar = pool.find(row => parseNum(row.teamId, 0) === parseNum(dayResult.gameResult.opp, 0));
    if (oppStar) pushProfile(oppStar, 'opponent');
  }
  const topRival = relationRows.find(item => item.status.id === 'rival');
  if (topRival) pushProfile(topRival.profile, 'rival');
  const topFriend = relationRows.find(item => item.status.id === 'friend');
  if (topFriend && Math.random() < 0.72) pushProfile(topFriend.profile, 'friend');
  const samePosStar = pool.find(row => parseNum(row.pos, -1) === parseNum(G.player?.pos, -2));
  if (samePosStar) pushProfile(samePosStar, 'same_pos');
  for (const row of pool) {
    if (picked.length >= Math.max(1, parseNum(count, 2))) break;
    pushProfile(row, 'league');
  }
  return picked.slice(0, Math.max(1, parseNum(count, 2)));
}
function buildStarTweetSnapshot(dayResult = {}) {
  const gr = dayResult?.gameResult || {};
  const st = gr?.st || {};
  const pts = parseNum(st.pts, parseNum(gr.pts, 0));
  const reb = parseNum(st.reb, parseNum(gr.reb, 0));
  const ast = parseNum(st.ast, parseNum(gr.ast, 0));
  const stl = parseNum(st.stl, 0);
  const blk = parseNum(st.blk, 0);
  const mins = parseNum(st.mins, parseNum(gr.mins, 0));
  const played = !!dayResult?.isGame && mins > 0;
  const grade = String(gr.grade || '').trim();
  const teamPts = parseNum(gr.teamPts, parseNum(gr.homeScore, 0));
  const oppPts = parseNum(gr.oppPts, parseNum(gr.awayScore, 0));
  const margin = Math.abs(teamPts - oppPts);
  const win = !!gr.win || (teamPts > 0 && oppPts > 0 && teamPts > oppPts);
  const opp = getTeam(gr.opp) || {};
  const teamName = String(G.team?.z || G.team?.n || '球队').trim();
  const oppTeam = String(opp.z || opp.n || opp.a || '对手').trim();
  const statLine = played
    ? `${pts}分${reb}板${ast}助${stl || blk ? `，外加${stl}断${blk}帽` : ''}`
    : '没有进入轮换';
  const userStrong = played && (pts >= 24 || ['S+', 'S', 'A'].includes(grade));
  const userQuiet = !played || (played && pts <= 9 && ast <= 3 && reb <= 3);
  return {
    isGame: !!dayResult?.isGame,
    played,
    userStrong,
    userQuiet,
    pts,
    reb,
    ast,
    stl,
    blk,
    mins,
    grade,
    teamPts,
    oppPts,
    margin,
    close: margin > 0 && margin <= 6,
    win,
    resultWord: win ? '赢球' : '输球',
    scoreLine: teamPts > 0 && oppPts > 0 ? `${teamPts}:${oppPts}` : '',
    statLine,
    teamName,
    oppTeam
  };
}
function buildContextualStarTweetCopyPool(profile, relationInfo, dayResult = {}, topic = 'league') {
  const playerName = G.player?.name || '球员';
  const snap = buildStarTweetSnapshot(dayResult);
  const relationKey = relationInfo?.id || 'neutral';
  const samePos = parseNum(profile?.pos, -1) === parseNum(G.player?.pos, -2);
  const archetype = String(profile?.archetype || '联盟球星').trim();
  const starName = String(profile?.name || '球星').trim();
  const stat = snap.statLine;
  const score = snap.scoreLine ? `，比分${snap.scoreLine}` : '';
  const close = snap.close ? '最后几分钟每个回合都像季后赛' : '比赛中段的走势已经把问题摊开';
  const opponentLabel = topic === 'opponent' ? snap.oppTeam : snap.teamName;
  const baseDelta = {
    rival: { affinityDelta: -2, respectDelta: snap.userStrong ? 2 : 1, heatDelta: 5 },
    tense: { affinityDelta: -1, respectDelta: 2, heatDelta: 4 },
    friend: { affinityDelta: 3, respectDelta: 3, heatDelta: 1 },
    respect: { affinityDelta: 1, respectDelta: 4, heatDelta: 1 },
    neutral: { affinityDelta: 0, respectDelta: 2, heatDelta: snap.userStrong ? 2 : 1 }
  };
  const withMeta = (items, tone, meta = {}) => items.map(text => ({
    text,
    tone,
    ...(baseDelta[meta.deltaKey || relationKey] || baseDelta.neutral),
    ...meta
  }));
  if (!snap.isGame) {
    if (topic === 'rival' || relationKey === 'rival' || relationKey === 'tense') {
      return withMeta([
        `休息日刷到${playerName}的训练片段了。镜头里看不出全部细节，但脚步变化比上次更干净；如果下一次对位真按这个版本来，我会提前准备两套防法。`,
        `${playerName}最近名字被提得很勤，这不是坏事。真正的竞争不是热搜里一句狠话，而是你知道对方在训练馆也没停，自己就更不能偷懒。`,
        `今天录像室里看了一段${playerName}的持球选择，几个弱侧传球比集锦里那些得分更值得注意。下次碰面，我不会只盯他的出手。`,
        `有人问我怎么看${playerName}的上升势头。很简单，等我们真正站到同一块地板上再回答；到那时，每个掩护、每次换防都会比评论区诚实。`,
        `没有比赛的夜晚，竞争也不会暂停。${playerName}如果想继续往上走，就得习惯所有人开始研究他的习惯；我已经把几处细节记下来了。`,
        `同位置或者同话题被放在一起聊很正常，但别让讨论替你完成比赛。${playerName}现在最该守住的是节奏，最该提防的是对手已经开始认真做功课。`
      ], 'competitive', { deltaKey: relationKey === 'rival' ? 'rival' : 'tense' });
    }
    if (topic === 'friend' || relationKey === 'friend' || relationKey === 'respect') {
      return withMeta([
        `休息日看到${playerName}还在训练馆加练，这种东西比赛日不一定马上兑现，但球员之间都看得懂。能长期把细节磨下去的人，迟早会让讨论变得更认真。`,
        `${playerName}这段时间处理球更安静了，不是没声量，而是不急着用每个回合证明自己。年轻球员能学会等待机会，这比多剪几个高光更难。`,
        `今天和几个朋友聊到${playerName}，大家意见不完全一样，但有一点一致：他已经不是只靠冲劲打球了，阅读比赛的速度在变快。`,
        `休息日最能看出球员怎么对待赛季。${playerName}如果继续把录像、恢复和训练连成一套，他后面遇到低谷时会比别人更稳。`,
        `${playerName}还在爬坡，这个阶段最怕外界只给标签。真正重要的是他有没有每天把一个小问题修掉；目前看，他至少在认真做这件事。`,
        `我喜欢看年轻人用训练回应质疑。${playerName}不是每晚都会打出漂亮数据，但他最近的准备方式已经开始像一个真正要站稳联盟的人。`
      ], 'positive', { deltaKey: relationKey === 'friend' ? 'friend' : 'respect' });
    }
    return withMeta([
      `休息日聊${playerName}，不要只聊热度。他现在最有价值的部分是比赛里的停顿、提前传球和愿意去做脏活，这些东西不会每天上头条。`,
      `${playerName}最近被更多人看见了，接下来才是真正的考验。联盟很快会给他换防、夹击和更长的录像报告，能不能适应才决定上限。`,
      `没有比赛的时候更适合冷静看样本。${playerName}有些回合已经像轮换核心，有些回合还像新人；这不矛盾，成长本来就是这样。`,
      `我不急着给${playerName}下结论。赛季够长，防守会调整，身体会疲劳，舆论也会翻面；能把标准守住的人，最后自然会留下来。`,
      `如果只看集锦，很多人会误判${playerName}。我更想看他在第三节没手感、队友跑错位、对手开始上身体时怎么处理球。`,
      `关于${playerName}的讨论开始变多了，这说明对手和球迷都注意到了。下一步不是说得更响，而是让每场录像里都有一两个能被教练记住的回合。`
    ], samePos ? 'competitive' : 'positive', { deltaKey: samePos ? 'tense' : 'neutral' });
  }
  if (!snap.played) {
    if (topic === 'rival' || relationKey === 'rival' || relationKey === 'tense') {
      return withMeta([
        `${playerName}今晚没进轮换${score}，这种夜晚最考验耐心。别急着在网上找回应，真正的回应是下一次被叫到名字时，第一回合就让教练觉得准备好了。`,
        `我知道没出场的滋味。${playerName}今晚只能在板凳上看完比赛，但竞争不会因为DNP停掉；等机会来的时候，对手不会给他热身时间。`,
        `外界会拿${playerName}没上场做文章，但球员自己知道，轮换边缘的每一天都算数。下一次碰面也好、下一次训练也好，强度不能掉。`,
        `如果${playerName}想把名字留在这场讨论里，DNP之后的反应比今晚的数据更重要。训练馆、录像室、替补席沟通，少一项都不行。`
      ], 'competitive', { deltaKey: relationKey === 'rival' ? 'rival' : 'tense' });
    }
    return withMeta([
      `${playerName}今晚没有进入轮换${score}，但这不是故事结束。年轻球员最难的是坐着看完整场后，第二天还能带着同样的强度去训练。`,
      `别把${playerName}的DNP写成失败标签。很多人的机会都是从这种夜晚之后来的，关键是他有没有把替补席看到的东西变成下一次上场的准备。`,
      `${playerName}今晚没出场，镜头偶尔扫到他在替补席沟通。对年轻球员来说，这种参与感也重要，但最终还是要靠训练把轮换时间抢回来。`,
      `这场${snap.resultWord}${score}，${playerName}没有个人数据。真正值得看的，是他接下来几天怎么处理情绪、怎么向教练组证明自己还能帮上忙。`
    ], 'neutral', { deltaKey: relationKey === 'friend' ? 'friend' : 'neutral' });
  }
  if (topic === 'rival' || relationKey === 'rival') {
    return snap.userStrong
      ? withMeta([
        `${playerName}今晚交出${stat}${score}，这不是空热度。几个回合他敢在身体对抗里做选择，说明他开始明白被针对时该怎么打；下次对位我会把标准再抬高。`,
        `这场我承认${playerName}把声音打出来了，尤其是${close}的时候，他没有把球权当成负担。别误会，认可归认可，下次见面我会从第一回合就给压力。`,
        `${playerName}今晚的数据够硬，但真正让我注意的是他被逼到边线后还能把球传出来。年轻人能在这种局里稳住一次，就会让对手多准备一个方案。`,
        `如果${playerName}想要对位话题，今晚算是递了申请。${stat}只是表面，关键是他在高压回合里没有躲；下次碰面，我会试试这份稳定能不能延续。`,
        `这场之后再聊${playerName}，别只用新人标准。他已经开始逼对手认真看录像了。下一次我们碰上，我想看的不是热度，是他能不能连续三节保持这个判断速度。`,
        `${playerName}今晚把${opponentLabel}的防守拉出了几个缝，说明他不只是靠手感。竞争就该这样，有人往上爬，其他人就得把门槛抬高。`
      ], 'competitive', { deltaKey: 'rival' })
      : withMeta([
        `${playerName}今晚的${stat}${score}不算能服众，但我不会用一场球盖棺定论。真正的问题是当对手上身体、换节奏时，他能不能找到第二种打法。`,
        `这场看下来，${playerName}还有几个回合处理得太急。年轻人会经历这种夜晚，但如果想进更高一档的讨论，就不能每次被压住都等手感救命。`,
        `我知道外界想把${playerName}推进对位话题，可今晚样本还不够硬。下次见面他要是能把节奏稳住，我们再把火药味点起来。`,
        `${playerName}今晚有亮点，也有被针对后的犹豫。别急着吹，也别急着踩；但如果他想和强者放在一张表里，就得学会在不舒服的时候也做正确选择。`,
        `这场${snap.resultWord}${score}，${playerName}的数据没有把故事讲完整。我的问题更简单：当对手连续变防，他能不能把球队带回一个清楚的回合？`,
        `对${playerName}来说，今晚最有价值的不是评论区怎么吵，而是录像里那些慢半拍的判断。修掉这些，下次对位才有真正的内容。`
      ], 'competitive', { deltaKey: 'rival' });
  }
  if (topic === 'friend' || relationKey === 'friend') {
    return snap.userStrong
      ? withMeta([
        `${playerName}今晚这份${stat}${score}很扎实。最好的地方不是得分，而是他开始知道什么时候该冲、什么时候该把球交给队友；这才是能长期站住的比赛内容。`,
        `为${playerName}高兴。今晚他不是靠一阵手感刷存在感，而是把几个困难回合处理得很成熟。年轻球员能在这种局里稳住，队友会更愿意信他。`,
        `${playerName}今天打得硬，尤其是${close}的时候没有乱。数据会被截图，但真正让球员圈注意的是他在压力下还愿意做正确的小事。`,
        `看${playerName}今晚这场，我想到的是训练里的重复终于开始变成比赛里的自然反应。继续这样打，外界讨论会慢慢从惊喜变成期待。`,
        `${playerName}交出${stat}，但我更喜欢他几个回合的身体语言：不抱怨、不躲球、愿意补防。这样的表现，队友看得比球迷更清楚。`,
        `今晚${playerName}把自己的节奏和球队需要接上了。年轻人最难的不是打一场好球，而是知道这场好球为什么发生，然后下次还能复制。`
      ], 'positive', { deltaKey: 'friend' })
      : withMeta([
        `${playerName}今晚数据不炸，但我不觉得这是空白夜。他有几个回合在帮队友擦屁股，也有几个传球选择比之前更稳；这种进步不一定会马上上热搜。`,
        `年轻球员都会遇到${stat}这种不上不下的夜晚。关键不是外界怎么评价，而是他有没有在低手感时继续防守、跑位、沟通。`,
        `${playerName}这场有些地方还粗，但我看得到他在想比赛。只要愿意把这些慢回合拆开看，下一次会比今晚更清楚。`,
        `别只用得分判断${playerName}。今晚他有几次提前站位和弱侧补防，都是教练组会拿出来讲的细节；继续积累就好。`,
        `${playerName}今晚没把比赛打成个人秀，但这种夜晚也能长经验。把节奏、体能和出手选择理顺，比急着证明自己重要。`,
        `我会给${playerName}一点耐心。他现在最需要的不是一句夸奖，而是把每个能帮球队的小回合固定下来，等机会变大时自然会爆出来。`
      ], 'positive', { deltaKey: 'friend' });
  }
  if (topic === 'opponent' || samePos || relationKey === 'tense') {
    return snap.userStrong
      ? withMeta([
        `${playerName}今晚的${stat}${score}让同位置的人都得多看两遍录像。不是因为数据吓人，而是他在换防后没有急着证明自己，这种耐心很少见。`,
        `作为${archetype}，我看${playerName}这场最在意的是节奏。他几次把防守人带进掩护角度里，再决定攻传，这不是新人只靠冲能打出来的东西。`,
        `${playerName}今晚把对位讨论变得有内容了。下一次碰到这种防守，他如果还能保持同样的阅读速度，那就不只是状态好，而是水平到了。`,
        `同位置竞争最真实的地方，是你看得懂对方哪些回合真的难。${playerName}今晚有几次处理很难，我会把那些片段留到自己的录像课里。`,
        `这场${snap.resultWord}${score}，${playerName}用${stat}把话题打热。但我更想看他接下来面对夹击和延误时，能不能继续把球队带到正确位置。`,
        `${playerName}今晚不只是得了分，他让防守开始犹豫。对一个正在往上爬的球员来说，让对手犹豫，就是进入下一层讨论的门票。`,
        `我喜欢这种对位样本：有身体、有判断、有被针对后的调整。${playerName}如果能把今晚的选择稳定下来，同位置名单上会多一个麻烦名字。`,
        `${playerName}这场不是单纯手热。他在几次转换里提前看到了弱侧，这种提前量会让防守人很烦；下次大家会用更高规格防他。`
      ], 'competitive', { deltaKey: relationKey === 'tense' ? 'tense' : 'neutral' })
      : withMeta([
        `${playerName}今晚的${stat}${score}说明他还在找稳定版本。同位置的人都懂，有些夜晚你不是不会打，而是每个选择都慢了半拍。`,
        `这场看${playerName}，我最想看的不是进了几个球，而是他被挤到第二选择时怎么办。答案有好有坏，所以样本还得继续拉长。`,
        `${playerName}有几个回合很聪明，也有几个回合太想马上回应。年轻球员要学会把火气变成脚步和角度，不是变成仓促出手。`,
        `今晚的${playerName}还没有把比赛完全握住，但他已经能让对手在赛前报告里多写几行。下一步是把这些片段连成整场。`,
        `同位置比较别急着排座次。${playerName}今晚给了线索，也暴露了问题；真正能上台面的球员，是下一场把问题缩小的人。`,
        `${playerName}这场的价值在于暴露短板。被对手逼出不舒服的选择不是坏事，坏的是回去不修；他现在到了必须精修细节的阶段。`,
        `${playerName}今晚没把每个机会都吃干净，但他的身体条件和处理球方向都在。只要别被舆论带着急跑，他会有更好的夜晚。`,
        `对手已经开始用更严的方式看${playerName}，这本身就是信号。今晚他还没完全解开，但至少知道下一份作业在哪里。`
      ], relationKey === 'tense' ? 'competitive' : 'neutral', { deltaKey: relationKey === 'tense' ? 'tense' : 'neutral' });
  }
  if (relationKey === 'respect') {
    return withMeta([
      `${playerName}今晚的${stat}${score}不是完美答案，但比赛气质比前阵子更稳。能在压力里少犯一个错、多做一次沟通，这种进步球员之间看得到。`,
      `我尊重${playerName}这场的处理。不是每个回合都漂亮，但他没有让情绪带走判断；赛季这么长，这种稳定比一晚高分更有价值。`,
      `${playerName}现在最好的信号，是他开始让队友知道下一步会发生什么。年轻球员能给队友安全感，就已经跨过一条线。`,
      `这场之后谈${playerName}，可以少一点标签，多一点细节。他在攻防两端还有作业，但方向明显比只靠天赋往前冲更成熟。`
    ], 'positive', { deltaKey: 'respect' });
  }
  return withMeta(snap.userStrong ? [
    `${playerName}今晚交出${stat}${score}，最值得注意的是他没有把好状态打成独角戏。能在手感起来时还照顾球队节奏，这才会让教练组放心加码。`,
    `看${playerName}这场，数据是入口，细节才是正文。他几次提前做决定，让${snap.teamName}的进攻少了停顿；这种成长比一两个高光更重要。`,
    `${playerName}把自己放进了今晚的讨论里，但别把故事写得太早。下一步是当对手带着完整报告来防他时，他还能不能拿出第二套答案。`,
    `这场${snap.resultWord}${score}，${playerName}的${stat}会被转发，但我会记住他几个不显眼的回合：卡住位置、早传一拍、回防先喊人。`,
    `${playerName}今晚的表现说明他正在从“能打”往“会影响比赛”走。区别就在于，他开始让队友和对手都跟着他的选择改变节奏。`,
    `如果${playerName}能把今晚这种处理连续带两周，外界对他的称呼会变。不是因为热度，而是因为对手不得不把他写进第一层防守计划。`
  ] : [
    `${playerName}今晚的${stat}${score}不算爆，但比赛里有几个能留下来复盘的点。年轻球员不是每晚都要轰动，先把稳定回合攒起来。`,
    `我不会因为一场普通数据就看低${playerName}。真正要观察的是，他在没有手感时还愿不愿意防守、跑位、把球交到更好的位置。`,
    `${playerName}还在学习怎么让比赛慢下来。今晚有些选择急了，但这也是成长的一部分；只要录像课敢面对，下一场就有机会进步。`,
    `这场${snap.resultWord}${score}，${playerName}没有抢走所有镜头，但他已经有几次处理像稳定轮换。先把这些片段变成习惯，再谈更大的角色。`,
    `讨论${playerName}最好别只看一列数据。他有短板，也有让人愿意继续看的地方；关键是接下来能不能把波动压小。`,
    `${playerName}今晚给出的答案还不完整，但问题已经更清楚了。对年轻球员来说，知道自己该修什么，有时比一场顺风球更有价值。`
  ], snap.userStrong ? 'positive' : 'neutral', { deltaKey: 'neutral' });
}
function buildStarTweetPayload(profile, relationInfo, dayResult = {}, topic = 'league') {
  const snapshot = buildStarTweetSnapshot(dayResult);
  const pool = buildContextualStarTweetCopyPool(profile, relationInfo, dayResult, topic);
  const seed = [
    profile?.key || profile?.name || 'star',
    parseNum(dayResult?.day, G.dayNum),
    topic,
    relationInfo?.id || 'neutral',
    snapshot.played ? `${snapshot.pts}_${snapshot.reb}_${snapshot.ast}` : 'dnp',
    snapshot.win ? 'win' : 'loss',
    snapshot.close ? 'close' : 'normal'
  ].join('_');
  const entry = pickSeedItem(pool, seed) || pool[0] || {};
  const text = cleanSocialText(String(entry.text || '').trim());
  const tone = entry.tone || 'neutral';
  const persona = `${profile.archetype || '联盟球星'} · ${profile.teamAbbr || '--'}`;
  const postMeta = {
    authorType: 'star',
    persona,
    author: profile.handle,
    text,
    tone,
    mentionsPlayer: true
  };
  return {
    author: String(profile.handle || buildStarHandleFromName(profile.name, profile.teamAbbr)).trim(),
    persona,
    text,
    tone,
    likes: rng(6500, 26000),
    reposts: rng(360, 2600),
    comments: makeFallbackComments(text, tone, getRandomSocialCommentCount(getSocialPostHeatProfile(postMeta)), postMeta),
    authorType: 'star',
    mentionsPlayer: true,
    playerRefKey: profile.key,
    playerId: profile.playerId,
    teamId: profile.teamId,
    playerName: profile.name,
    avatar: String(profile.avatar || '').trim(),
    photo: String(profile.photo || '').trim(),
    affinityDelta: parseNum(entry.affinityDelta, 0),
    respectDelta: parseNum(entry.respectDelta, 0),
    heatDelta: parseNum(entry.heatDelta, 0)
  };
}
async function generateStarPostBatchByTemplate(candidates = [], dayResult = {}, { avoidTexts = [] } = {}) {
  return [];
}
async function generateStarPlayerSocialPostsByTemplate(dayResult, day, season, count = 2) {
  return [];
}
function generateStarPlayerSocialPosts(dayResult, day, season, count = 2) {
  const candidates = buildStarTweetCandidates(dayResult, count);
  const added = [];
  candidates.forEach(item => {
    const relationLink = G.social?.playerLinks?.[String(item.profile?.key || '').trim()] || null;
    const payload = buildStarTweetPayload(item.profile, resolveSocialLinkStatus(relationLink), dayResult, item.topic);
    const post = appendSocialPost({
      ...payload,
      day,
      season,
      year: G.year
    });
    if (post) {
      added.push(post);
      applySocialPlayerLinkDelta(item.profile, {
        affinityDelta: parseNum(payload.affinityDelta, 0),
        respectDelta: parseNum(payload.respectDelta, 0),
        heatDelta: parseNum(payload.heatDelta, 0),
        source: '球星社媒发声'
      });
    }
  });
  return added;
}
function buildStarReplyComment(profile, relationInfo, impact, targetPost = null) {
  const playerName = G.player?.name || '你';
  const seed = `${profile?.key || profile?.name || 'star'}_${relationInfo?.id || 'neutral'}_${impact?.tone || 'neutral'}_${targetPost?.id || targetPost?.text || ''}`;
  const pickReply = (list = [], shift = 0) => pickSeedItem(list, seed, shift) || list[0] || '';
  if (impact.tone === 'negative') {
    return pickReply([
      `${playerName}，这句我先记下。下次碰面别后退。`,
      `既然点到这儿了，那就别删。赛场上见。`,
      `行，这话我收到了。下一次对位我会回应。`
    ]);
  }
  if (impact.tone === 'competitive') {
    return relationInfo.id === 'rival'
      ? pickReply([
        `火药味可以，记得把这股劲带到下一次对位。`,
        `这种话别停，到场上继续。`,
        `终于像点样子了，下次见面把强度再抬高。`
      ], 1)
      : pickReply([
        `这才像联盟该有的味道，下一次碰面别躲。`,
        `同位置就该这样互相逼强度，下次见真章。`,
        `可以，留着这股劲，比赛里继续说话。`
      ], 2);
  }
  if (impact.tone === 'positive') {
    return relationInfo.id === 'friend'
      ? pickReply([
        `收到。继续保持，比赛里见真章，场下不用整那些虚的。`,
        `看到你这段时间的进步了，别松。`,
        `可以，别让今天白练，后面继续打硬。`
      ], 3)
      : pickReply([
        `看到了，继续把比赛打硬。联盟会记住真正肯下功夫的人。`,
        `这话没毛病，后面用表现接上。`,
        `先把样本继续打大，别让今天变成一阵风。`
      ], 4);
  }
  return targetPost?.authorType === 'star'
    ? pickReply([
      `先把比赛打好，其他话题以后再聊。`,
      `这条我看到了，后面拿球说话。`,
      `别把节奏断了，下一次碰面再聊。`
    ], 5)
    : pickReply([
      `我看到了。先把表现稳定住。`,
      `听到了，继续打。`,
      `一句话先放这儿，后面看比赛。`
    ], 6);
}
async function generateStarReplyByTemplate(profile, relationInfo, impact, targetPost = null, playerText = '') {
  return null;
}
async function enhanceStarReplyCommentByTemplate(commentRef, profile, relationInfo, impact, targetPost = null, playerText = '') {
  return null;
}
function queueStarReplyCommentEnhancement(commentRef, profile, relationInfo, impact, targetPost = null, playerText = '') {
  enhanceStarReplyCommentByTemplate(commentRef, profile, relationInfo, impact, targetPost, playerText).catch(() => null);
}
function getStarResponseTargetsForPlayerText(text = '') {
  const mentioned = findMentionedSocialStars(text, 2);
  const fallback = buildStarTweetCandidates({ isGame: false }, 1).map(item => item.profile);
  const targets = (mentioned.length ? mentioned : fallback).filter(Boolean).slice(0, 2);
  return { mentioned, targets };
}
function maybeCreateStarResponseForPlayerPost(post, text, impact) {
  const { mentioned, targets } = getStarResponseTargetsForPlayerText(text);
  if (!targets.length) return [];
  const responses = [];
  const bump = getSocialInteractionRanges(post);
  targets.forEach(profile => {
    if (!profile || Math.random() >= (mentioned.length ? 0.92 : 0.58)) return;
    const link = G.social?.playerLinks?.[String(profile.key || '').trim()] || null;
    const relationInfo = resolveSocialLinkStatus(link);
    const replyText = buildStarReplyComment(profile, relationInfo, impact, post);
    post.comments = Array.isArray(post.comments) ? post.comments : [];
    const commentRef = {
      author: String(profile.handle || buildStarHandleFromName(profile.name, profile.teamAbbr)).trim(),
      text: replyText,
      likes: rng(bump.starReplyLikes[0], bump.starReplyLikes[1])
    };
    post.comments.unshift(commentRef);
    post.likes = parseNum(post.likes, 0) + rng(bump.replyLikeBump[0], bump.replyLikeBump[1]);
    post.reposts = parseNum(post.reposts, 0) + rng(bump.replyRepostBump[0], bump.replyRepostBump[1]);
    responses.push(profile);
    addPhone('社媒提醒', `${profile.name} 回复了你的推文。`, 'info');
    const relationUpdate = applySocialPlayerLinkDelta(profile, {
      affinityDelta: parseNum(impact.relationAffinity, 0),
      respectDelta: parseNum(impact.relationRespect, 0),
      heatDelta: parseNum(impact.relationHeat, 0),
      source: '公开社媒互动'
    });
    queueStarReplyCommentEnhancement(commentRef, profile, resolveSocialLinkStatus(relationUpdate?.link), impact, post, text);
  });
  return responses;
}
async function maybeCreateStarResponseForPlayerPostAsync(post, text, impact) {
  const { mentioned, targets } = getStarResponseTargetsForPlayerText(text);
  if (!targets.length) return { responses: [] };
  const responses = [];
  const bump = getSocialInteractionRanges(post);
  post.comments = Array.isArray(post.comments) ? post.comments : [];
  for (const profile of targets) {
    if (!profile || Math.random() >= (mentioned.length ? 0.92 : 0.58)) continue;
    const relationUpdate = applySocialPlayerLinkDelta(profile, {
      affinityDelta: parseNum(impact.relationAffinity, 0),
      respectDelta: parseNum(impact.relationRespect, 0),
      heatDelta: parseNum(impact.relationHeat, 0),
      source: '公开社媒互动'
    });
    const relationInfo = resolveSocialLinkStatus(relationUpdate?.link);
    const commentRef = {
      author: String(profile.handle || buildStarHandleFromName(profile.name, profile.teamAbbr)).trim(),
      text: buildStarReplyComment(profile, relationInfo, impact, post),
      likes: rng(bump.starReplyLikes[0], bump.starReplyLikes[1])
    };
    post.comments.unshift(commentRef);
    post.likes = parseNum(post.likes, 0) + rng(bump.replyLikeBump[0], bump.replyLikeBump[1]);
    post.reposts = parseNum(post.reposts, 0) + rng(bump.replyRepostBump[0], bump.replyRepostBump[1]);
    responses.push(profile);
    addPhone('社媒提醒', `${profile.name} 回复了你的推文。`, 'info');
  }
  return { responses };
}

function ensureEconomyState() {
  if (!G.player) return;
  if (!Number.isFinite(parseNum(G.player.cash, NaN))) {
    const salary = normalizeSalaryMillion(parseNum(G.player.salary, 0));
    G.player.cash = +(Math.max(1.2, salary * 0.45 + 1)).toFixed(2);
  } else {
    G.player.cash = +Math.max(0, parseNum(G.player.cash, 0)).toFixed(2);
  }
  if (!G.economy || typeof G.economy !== 'object') G.economy = {};
  if (!Number.isFinite(parseNum(G.economy.staminaCoachLevel, NaN))) G.economy.staminaCoachLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.trainingCoachLevel, NaN))) G.economy.trainingCoachLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.recoveryTeamLevel, NaN))) G.economy.recoveryTeamLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.prTeamLevel, NaN))) G.economy.prTeamLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.agentTeamLevel, NaN))) G.economy.agentTeamLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.analyticsLevel, NaN))) G.economy.analyticsLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.salaryPaidSeason, NaN))) G.economy.salaryPaidSeason = parseNum(G.season, 1) - 1;
  G.economy.staminaCoachLevel = clamp(parseNum(G.economy.staminaCoachLevel, 0), 0, STAMINA_COACH_MARKET.length - 1);
  G.economy.trainingCoachLevel = clamp(parseNum(G.economy.trainingCoachLevel, 0), 0, TRAINING_COACH_MARKET.length - 1);
  G.economy.recoveryTeamLevel = clamp(parseNum(G.economy.recoveryTeamLevel, 0), 0, RECOVERY_TEAM_MARKET.length - 1);
  G.economy.prTeamLevel = clamp(parseNum(G.economy.prTeamLevel, 0), 0, PR_TEAM_MARKET.length - 1);
  G.economy.agentTeamLevel = clamp(parseNum(G.economy.agentTeamLevel, 0), 0, AGENT_TEAM_MARKET.length - 1);
  G.economy.analyticsLevel = clamp(parseNum(G.economy.analyticsLevel, 0), 0, ANALYTICS_SERVICE_MARKET.length - 1);
  if (!Array.isArray(G.economy.ownedItems)) G.economy.ownedItems = [];
  if (!Array.isArray(G.economy.ownedFacilities)) G.economy.ownedFacilities = [];
  if (!Array.isArray(G.economy.logs)) G.economy.logs = [];
  if (!Number.isFinite(parseNum(G.economy.totalSpent, NaN))) G.economy.totalSpent = 0;
  if (!Number.isFinite(parseNum(G.economy.visibilityMomentum, NaN))) G.economy.visibilityMomentum = 0;
  if (!Number.isFinite(parseNum(G.economy.visibilityMomentumUntilDay, NaN))) G.economy.visibilityMomentumUntilDay = -1;
  if (!Number.isFinite(parseNum(G.economy.lastOpportunityDay, NaN))) G.economy.lastOpportunityDay = -99;
  G.economy.totalSpent = +Math.max(0, parseNum(G.economy.totalSpent, 0)).toFixed(2);
  G.economy.visibilityMomentum = clamp(parseNum(G.economy.visibilityMomentum, 0), 0, 120);
  if (!G.economy.endorsements || typeof G.economy.endorsements !== 'object') G.economy.endorsements = {};
  const e = G.economy.endorsements;
  if (!Array.isArray(e.active)) e.active = [];
  if (!e.rejected || typeof e.rejected !== 'object') e.rejected = {};
  if (!Number.isFinite(parseNum(e.lastPayoutDay, NaN))) e.lastPayoutDay = -1;
  if (!Number.isFinite(parseNum(e.lastRefreshSeason, NaN))) e.lastRefreshSeason = parseNum(G.season, 1);
  if (!e.signatureShoe || typeof e.signatureShoe !== 'object') e.signatureShoe = (e.active || []).find(c => c && c.shoe) || null;
}
function ensureSocialState() {
  if (!G.social || typeof G.social !== 'object') G.social = {};
  if (!Array.isArray(G.social.posts)) G.social.posts = [];
  if (!Number.isFinite(parseNum(G.social.nextPostId, NaN))) G.social.nextPostId = 1;
  if (!Number.isFinite(parseNum(G.social.lastGeneratedDay, NaN))) G.social.lastGeneratedDay = -1;
  if (!G.social.generatedDayCounts || typeof G.social.generatedDayCounts !== 'object') G.social.generatedDayCounts = {};
  if (!Number.isFinite(parseNum(G.social.pendingRequiredDay, NaN))) G.social.pendingRequiredDay = -1;
  if (!G.social.playerRepliedPostIds || typeof G.social.playerRepliedPostIds !== 'object') G.social.playerRepliedPostIds = {};
  if (!G.social.playerPostsByDay || typeof G.social.playerPostsByDay !== 'object') G.social.playerPostsByDay = {};
  if (!Array.isArray(G.social.playerStatementLog)) G.social.playerStatementLog = [];
  if (!G.social.playerLinks || typeof G.social.playerLinks !== 'object') G.social.playerLinks = {};
  if (!G.social.rivalry || typeof G.social.rivalry !== 'object') G.social.rivalry = { lastPreviewGameKey: '', lastResultGameKey: '' };
  if (!G.social.starProfiles || typeof G.social.starProfiles !== 'object') G.social.starProfiles = {};
  if (!Array.isArray(G.social.commercialEvents)) G.social.commercialEvents = [];
  if (!Number.isFinite(parseNum(G.social.commercialSocialVersion, NaN))) G.social.commercialSocialVersion = 0;
  if (typeof G.social.rivalry.lastPreviewGameKey !== 'string') G.social.rivalry.lastPreviewGameKey = '';
  if (typeof G.social.rivalry.lastResultGameKey !== 'string') G.social.rivalry.lastResultGameKey = '';
  if (!G.social._leaguePlayerPoolCache || typeof G.social._leaguePlayerPoolCache !== 'object') G.social._leaguePlayerPoolCache = { key: '', pool: [] };
  // LLM migration: remove old LLM state from saves
  if (G.social.llm) delete G.social.llm;
  if (G.social.llmModels) delete G.social.llmModels;
  if (G.social.llmModelsFetchedAt) delete G.social.llmModelsFetchedAt;
  if (G.social.lastLLMTest) delete G.social.lastLLMTest;
  if (G.social.tweetImagesEnabled) delete G.social.tweetImagesEnabled;
  try { localStorage.removeItem('nba_social_llm_settings'); localStorage.removeItem('nba_social_llm_key'); localStorage.removeItem('nba_mainmenu_llm_draft'); } catch(e) {}
}
function stripErrorTextPreview(text) {
  const plain = String(text || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, 140);
}
function tryParseJSONText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
function getStaminaCoachConfig(level = parseNum(G?.economy?.staminaCoachLevel, 0)) {
  return STAMINA_COACH_MARKET[clamp(parseNum(level, 0), 0, STAMINA_COACH_MARKET.length - 1)];
}
function getTrainingCoachConfig(level = parseNum(G?.economy?.trainingCoachLevel, 0)) {
  return TRAINING_COACH_MARKET[clamp(parseNum(level, 0), 0, TRAINING_COACH_MARKET.length - 1)];
}
function getRecoveryTeamConfig(level = parseNum(G?.economy?.recoveryTeamLevel, 0)) {
  return RECOVERY_TEAM_MARKET[clamp(parseNum(level, 0), 0, RECOVERY_TEAM_MARKET.length - 1)];
}
function getPRTeamConfig(level = parseNum(G?.economy?.prTeamLevel, 0)) {
  return PR_TEAM_MARKET[clamp(parseNum(level, 0), 0, PR_TEAM_MARKET.length - 1)];
}
function getAgentTeamConfig(level = parseNum(G?.economy?.agentTeamLevel, 0)) {
  return AGENT_TEAM_MARKET[clamp(parseNum(level, 0), 0, AGENT_TEAM_MARKET.length - 1)];
}
function getAnalyticsConfig(level = parseNum(G?.economy?.analyticsLevel, 0)) {
  return ANALYTICS_SERVICE_MARKET[clamp(parseNum(level, 0), 0, ANALYTICS_SERVICE_MARKET.length - 1)];
}
function ownedFacilitySet() {
  ensureEconomyState();
  return new Set((G.economy.ownedFacilities || []).map(x => String(x)));
}
function getOwnedFacilityEntries() {
  const owned = ownedFacilitySet();
  return FACILITY_MARKET.filter(item => owned.has(String(item.id)));
}
function getOwnedLuxuryEntries() {
  const owned = ownedLuxurySet();
  return LUXURY_MARKET.filter(item => owned.has(String(item.id)));
}
function getActiveVisibilityMomentum() {
  ensureEconomyState();
  const raw = clamp(parseNum(G.economy.visibilityMomentum, 0), 0, 120);
  const untilDay = parseNum(G.economy.visibilityMomentumUntilDay, -1);
  if (untilDay < 0 || parseNum(G.dayNum, 0) <= untilDay) return raw;
  return clamp(raw - (parseNum(G.dayNum, 0) - untilDay) * 3, 0, 120);
}
function getFamePrivilegeTier(privilegeScore) {
  const score = parseNum(privilegeScore, 0);
  let current = FAME_PRIVILEGE_TIERS[0];
  FAME_PRIVILEGE_TIERS.forEach(rule => {
    if (score >= parseNum(rule.minScore, 0)) current = rule;
  });
  return current || FAME_PRIVILEGE_TIERS[0];
}
function buildCommercialIdentityProfile() {
  ensureEconomyState();
  const fame = clamp(parseNum(G.player?.fame, 10), 0, 100);
  const trust = clamp(parseNum(G.player?.trust, 50), 0, 100);
  const ownedLuxury = getOwnedLuxuryEntries();
  const ownedFacilities = getOwnedFacilityEntries();
  const flashyScore = ownedLuxury.reduce((sum, item) => {
    const tag = String(item.socialTag || '');
    const extra = /超跑|游艇|私人飞机|豪宅/.test(tag) ? 2 : /跑车|奢侈品|收藏/.test(tag) ? 1 : 0;
    return sum + extra;
  }, 0);
  const groundedScore = ownedLuxury.reduce((sum, item) => sum + (/公益/.test(String(item.socialTag || '')) ? 3 : /房产/.test(String(item.socialTag || '')) ? 1 : 0), 0);
  const facilityScore = ownedFacilities.reduce((sum, item) => sum + Math.max(1, parseNum(item.marketScoreBonus, 0) * 0.45 + parseNum(item.momentum, 0) * 0.25), 0);
  const visibilityMomentum = getActiveVisibilityMomentum();
  const totalSpent = parseNum(G.economy.totalSpent, 0);
  const identityLabel = flashyScore - groundedScore >= 4
    ? '顶流奢华'
    : groundedScore - flashyScore >= 3
      ? '低调公益'
      : facilityScore >= 8
        ? '专业团队流'
        : fame >= 55
          ? '联盟明星'
          : '上升新贵';
  const prestigeScore = clamp(
    fame * 0.82 +
    trust * 0.34 +
    flashyScore * 3 +
    groundedScore * 2.6 +
    facilityScore * 1.7 +
    Math.min(26, totalSpent * 0.45) +
    visibilityMomentum * 0.28,
    0,
    180
  );
  const privilegeTier = getFamePrivilegeTier(prestigeScore);
  return {
    fame,
    trust,
    flashyScore,
    groundedScore,
    facilityScore: +facilityScore.toFixed(1),
    totalSpent: +totalSpent.toFixed(2),
    visibilityMomentum,
    identityLabel,
    prestigeScore: +prestigeScore.toFixed(1),
    privilegeTier
  };
}
function getEconomyEffects() {
  ensureEconomyState();
  const sCfg = getStaminaCoachConfig();
  const tCfg = getTrainingCoachConfig();
  const recoveryCfg = getRecoveryTeamConfig();
  const prCfg = getPRTeamConfig();
  const agentCfg = getAgentTeamConfig();
  const analyticsCfg = getAnalyticsConfig();
  const identity = buildCommercialIdentityProfile();
  const ownedFacilities = getOwnedFacilityEntries();
  const facilityFx = ownedFacilities.reduce((acc, item) => {
    acc.restBonus += parseNum(item.restBonus, 0);
    acc.gameBonus += parseNum(item.gameBonus, 0);
    acc.injuryMult *= parseNum(item.injuryMult, 1);
    acc.injuryDaysMult *= parseNum(item.injuryDaysMult, 1);
    acc.xpMult *= parseNum(item.xpMult, 1);
    acc.prepBonus += parseNum(item.prepBonus, 0);
    acc.marketScoreBonus += parseNum(item.marketScoreBonus, 0);
    acc.socialHeatMult *= parseNum(item.socialHeatMult, 1);
    acc.posRepMult *= parseNum(item.posRepMult, 1);
    acc.momentum += parseNum(item.momentum, 0);
    return acc;
  }, {
    restBonus: 0,
    gameBonus: 0,
    injuryMult: 1,
    injuryDaysMult: 1,
    xpMult: 1,
    prepBonus: 0,
    marketScoreBonus: 0,
    socialHeatMult: 1,
    posRepMult: 1,
    momentum: 0
  });
  const tier = identity.privilegeTier || FAME_PRIVILEGE_TIERS[0];
  const activeDealCap = 8 + parseNum(agentCfg.activeCapBonus, 0) + parseNum(tier.activeCapBonus, 0);
  return {
    restStaminaBonus: parseNum(sCfg.restBonus, 0) + parseNum(recoveryCfg.restBonus, 0) + parseNum(facilityFx.restBonus, 0),
    gameStaminaBonus: parseNum(sCfg.gameBonus, 0) + parseNum(recoveryCfg.gameBonus, 0) + parseNum(facilityFx.gameBonus, 0),
    injuryMult: parseNum(sCfg.injuryMult, 1) * parseNum(recoveryCfg.injuryMult, 1) * parseNum(facilityFx.injuryMult, 1),
    injuryDaysMult: parseNum(recoveryCfg.injuryDaysMult, 1) * parseNum(facilityFx.injuryDaysMult, 1),
    xpMult: parseNum(tCfg.xpMult, 1) * parseNum(analyticsCfg.xpMult, 1) * parseNum(facilityFx.xpMult, 1),
    prepBonus: parseNum(analyticsCfg.prepBonus, 0) + parseNum(facilityFx.prepBonus, 0),
    fatigueRelief: parseNum(analyticsCfg.fatigueRelief, 0),
    repPositiveMult: parseNum(prCfg.posRepMult, 1) * parseNum(facilityFx.posRepMult, 1),
    repNegativeMult: parseNum(prCfg.negRepMult, 1),
    endorsementScoreBonus: parseNum(prCfg.marketScoreBonus, 0) + parseNum(agentCfg.marketScoreBonus, 0) + parseNum(analyticsCfg.marketScoreBonus, 0) + parseNum(facilityFx.marketScoreBonus, 0) + parseNum(tier.scoreBonus, 0),
    endorsementOfferMult: parseNum(agentCfg.offerMult, 1) * parseNum(tier.offerMult, 1),
    endorsementIncomeMult: parseNum(agentCfg.incomeMult, 1) * parseNum(tier.incomeMult, 1),
    socialHeatMult: parseNum(prCfg.socialHeatMult, 1) * parseNum(tier.socialHeatMult, 1) * parseNum(facilityFx.socialHeatMult, 1),
    specialEventChance: clamp(parseNum(prCfg.eventBonus, 0) + parseNum(tier.eventChance, 0) + Math.min(0.03, identity.visibilityMomentum / 2400), 0.02, 0.24),
    activeDealCap,
    visibilityMomentum: identity.visibilityMomentum,
    prestigeScore: identity.prestigeScore,
    fameTier: parseNum(tier.level, 0),
    fameTierLabel: String(tier.label || '新秀观察'),
    perkList: Array.isArray(tier.perks) ? [...tier.perks] : [],
    commercialIdentity: identity.identityLabel,
    totalSpent: identity.totalSpent,
    flashyScore: identity.flashyScore,
    groundedScore: identity.groundedScore,
    facilityScore: identity.facilityScore
  };
}
function getTrainingCoachXpMultiplier() {
  return getEconomyEffects().xpMult;
}
function addEconomyLog(text, type = 'neu') {
  ensureEconomyState();
  G.economy.logs.unshift({ text, type, season: G.season, day: G.dayNum, ts: Date.now() });
  if (G.economy.logs.length > 80) G.economy.logs.pop();
}
function adjustPlayerCash(deltaM, reason = '') {
  ensureEconomyState();
  const delta = parseNum(deltaM, 0);
  G.player.cash = +(Math.max(0, parseNum(G.player.cash, 0) + delta).toFixed(2));
  if (reason) addEconomyLog(`${delta >= 0 ? '收入' : '支出'} ${Math.abs(delta).toFixed(2)}M：${reason}`, delta >= 0 ? 'pos' : 'neu');
  return G.player.cash;
}
function applySeasonSalaryPayout({ force = false, reason = '' } = {}) {
  ensureEconomyState();
  const season = parseNum(G.season, 1);
  const paidSeason = parseNum(G.economy.salaryPaidSeason, season - 1);
  const years = parseNum(G.player.contractYears, 0);
  const salary = normalizeSalaryMillion(parseNum(G.player.salary, 0));
  if (!force && paidSeason === season) return { ok: false, reason: 'already_paid', amount: 0 };
  if (years <= 0) return { ok: false, reason: 'no_contract', amount: 0 };
  if (salary <= 0) return { ok: false, reason: 'no_salary', amount: 0 };
  adjustPlayerCash(salary, reason || `赛季薪资发放（${season}赛季）`);
  G.economy.salaryPaidSeason = season;
  addPhone('财务团队', `本赛季薪资已发放：$${salary.toFixed(2)}M`, 'info');
  return { ok: true, amount: salary, season };
}
function socialGeneratedKey(day, season = G.season) {
  return `${parseNum(season, 0)}_${parseNum(day, 0)}`;
}
function getGeneratedSocialCount(day, season = G.season) {
  ensureSocialState();
  const key = socialGeneratedKey(day, season);
  const posts = (G.social.posts || []).filter(p =>
    parseNum(p?.season, 0) === parseNum(season, 0) &&
    parseNum(p?.day, -999) === parseNum(day, -999) &&
    !p?.isPlayer &&
    String(p?.sourceType || '').trim().toLowerCase() !== 'commercial'
  );
  const count = posts.length;
  G.social.generatedDayCounts[key] = count;
  return count;
}
function hasGeneratedSocialForDay(day, season = G.season) {
  return getGeneratedSocialCount(day, season) >= SOCIAL_MIN_GENERATED_POSTS;
}
function markSocialGeneratedDay(day, count, season = G.season) {
  ensureSocialState();
  const key = socialGeneratedKey(day, season);
  G.social.generatedDayCounts[key] = Math.max(0, parseNum(count, 0));
}
function getSocialTimeline(limit = 50) {
  ensureSocialState();
  const safeLimit = Math.max(1, parseNum(limit, 50));
  return [...(G.social.posts || [])]
    .sort((a, b) => parseNum(b?.ts, 0) - parseNum(a?.ts, 0) || parseNum(b?.id, 0) - parseNum(a?.id, 0))
    .slice(0, safeLimit);
}

// ============ SOCIAL TWEET GENERATION ============
// 标记函数，用于 typeof 检查
function generateDailySocialTweets() { return true; }

// 构建社媒模板上下文
function buildSocialTemplateContext(dayResult = {}) {
  ensureSocialState();
  const s = G.seasonStats || {};
  const gp = Math.max(1, parseNum(s.gp, parseNum(G.gameNum, 0)));
  const teamRecords = typeof getLeagueTeamRecordsArray === 'function' ? getLeagueTeamRecordsArray() : [];
  const sorted = [...teamRecords].sort((a, b) => b.w - a.w || a.l - b.l);
  const leaguePlayers = typeof getLeaguePlayerSeasonRows === 'function' ? getLeaguePlayerSeasonRows().filter(r => parseNum(r.gp, 0) > 0) : [];
  const scorers = [...leaguePlayers].sort((a, b) => b.ppg - a.ppg).slice(0, 5).map(r => ({ name: r.name, team: (getTeam(r.teamId) || {}).a || '--', ppg: r.ppg?.toFixed(1) }));
  const assisters = [...leaguePlayers].sort((a, b) => b.apg - a.apg).slice(0, 5).map(r => ({ name: r.name, team: (getTeam(r.teamId) || {}).a || '--', apg: r.apg?.toFixed(1) }));
  const rebounders = [...leaguePlayers].sort((a, b) => b.rpg - a.rpg).slice(0, 5).map(r => ({ name: r.name, team: (getTeam(r.teamId) || {}).a || '--', rpg: r.rpg?.toFixed(1) }));
  const recentStories = (G.storyLog || []).slice(-3).map(s => typeof s === 'string' ? s.replace(/<[^>]+>/g, '').trim().slice(0, 200) : '').filter(Boolean);
  const recentStatements = (G.social?.playerStatementLog || []).slice(-3).map(item => ({
    title: String(item?.title || '').trim(),
    tone: String(item?.analysisText || '').trim(),
    text: cleanSocialText(item?.text || '').slice(0, 120)
  })).filter(item => item.text);
  const commercialEvents = typeof getRecentCommercialEvents === 'function' ? getRecentCommercialEvents(3).map(e => {
    const rawDetail = String(e?.detail || '').trim();
    const cleanDetail = rawDetail.replace(/[＋\+]\d+(\.\d+)?%?/g, '')
      .replace(/×\d+\.\d+/g, '')
      .replace(/(休息恢复|赛后恢复|训练\s*XP|伤病风险|伤停时间|疲劳管理|赛前准备|声望|信任|正面舆论|负面舆论|热度|商业机会|市场分|代言报价|商业分成|并行代言上限)\s*[＋\+\-]?\d*\.?\d*%?/g, '')
      .replace(/\s*\|\s*/g, '，').replace(/,+\s*$/, '').replace(/^，|，$/g, '').trim();
    return { label: e?.displayLabel || e?.label || '', detail: cleanDetail || rawDetail, type: e?.type || '' };
  }) : [];
  const relationships = getTrackedSocialRelationships(4).map(item => ({
    name: String(item?.name || '').trim(),
    team: String(item?.teamAbbr || item?.profile?.teamAbbr || '--').trim(),
    status: String(item?.status?.label || '').trim(),
    affinity: parseNum(item?.affinity, 0),
    respect: parseNum(item?.respect, 0),
    heat: parseNum(item?.heat, 0)
  }));

  const context = {
    player: {
      name: G.player?.name || '球员',
      team: G.team?.z || G.team?.n || '球队',
      teamAbbr: G.team?.a || '--',
      age: G.player?.age || 19,
      pos: posLabel(G.player?.pos),
      rating: ovr(G.player?.attrs || {}),
      seasonYear: parseNum(G.season, 1),
      ppg: (s.pts / gp).toFixed(1),
      apg: (s.ast / gp).toFixed(1),
      rpg: (s.reb / gp).toFixed(1),
      honors: (G.allAwards || []).map(a => (a.awards || []).join(', ')).filter(Boolean).join('; ') || '暂无',
      fame: parseNum(G.player?.fame, 10),
      trust: parseNum(G.player?.trust, 50)
    },
    league: {
      top5: sorted.slice(0, 5).map(r => ({ team: (getTeam(r.id) || {}).z || '--', w: r.w, l: r.l })),
      bot3: sorted.slice(-3).map(r => ({ team: (getTeam(r.id) || {}).z || '--', w: r.w, l: r.l })),
      scorers,
      assisters,
      rebounders
    },
    day: parseNum(dayResult.day, G.dayNum),
    year: G.year,
    season: G.season,
    gameToday: !!dayResult.isGame,
    recentStories,
    recentStatements,
    commercialEvents,
    relationships
  };

  if (dayResult.isGame && dayResult.gameResult) {
    const gr = dayResult.gameResult;
    const opp = getTeam(gr.opp) || {};
    context.gameStory = {
      win: !!gr.win,
      opponent: opp.z || opp.a || '--',
      teamPts: parseNum(gr.teamPts, 0),
      oppPts: parseNum(gr.oppPts, 0),
      closeGame: Math.abs(parseNum(gr.teamPts, 0) - parseNum(gr.oppPts, 0)) <= 5,
      playerStats: gr.st ? `${gr.st.pts}分${gr.st.reb}板${gr.st.ast}助${gr.st.stl}断${gr.st.blk}帽` : '',
      grade: gr.grade || ''
    };
  }
  return context;
}
function buildSocialTweetImagePrompt(post, context = {}) {
  const src = post || {};
  const text = cleanSocialText(src.text || '').slice(0, 220);
  const tags = [
    context?.gameToday ? 'basketball game night' : 'basketball lifestyle day',
    context?.player?.team || '',
    context?.player?.name || '',
    src.persona || '',
    context?.commercialEvents?.length ? 'commercial sports buzz' : ''
  ].filter(Boolean).join(', ');
  return `为一条中文篮球社媒动态生成 1:1 方形配图。画面要像真实社交媒体会配的体育图，不要出现水印、文字墙或海报排版。
主题标签：${tags}
动态内容：${text || '联盟日常讨论'}
要求：正方形构图、主体完整不要被裁切、强体育新闻感、人物与场馆氛围清晰、适合手机推文流展示。`;
}
async function attachGeneratedImagesToSocialPosts(posts = [], dayResult = {}, context = null) {
  return posts;
}

// 社媒推文生成
async function generateDailySocialTweetsSmart(dayResult = {}, { force = false, count = 6 } = {}) {
  ensureSocialState();
  const day = parseNum(dayResult.day, Math.max(0, G.dayNum - 1));
  const season = parseNum(G.season, 1);
  if (!force && hasGeneratedSocialForDay(day, season)) return [];
  return generateFallbackSocialTweets(dayResult, day, season, count);
}

function buildFallbackSocialTemplates(dayResult = {}) {
  const isGame = !!dayResult?.isGame;
  const gr = dayResult?.gameResult;
  const playerName = G.player?.name || '球员';
  const teamName = G.team?.z || '球队';
  const played = isGame && gr ? parseNum(gr.st?.mins, parseNum(gr.mins, 0)) > 0 : false;
  const playerLine = played
    ? `${playerName}贡献${gr.st?.pts || 0}分${gr.st?.reb || 0}板${gr.st?.ast || 0}助。`
    : `${playerName}本场未进入轮换，个人数据栏为DNP。`;
  return isGame && gr ? [
    { a: '@赛场快报', t: 'news', text: `${teamName}${gr.win ? '拿下' : '不敌'}${(getTeam(gr.opp) || {}).z || '对手'}，比分 ${gr.teamPts}-${gr.oppPts}。${playerLine}` },
    { a: '@真爱球迷阿哲', t: 'fan', text: played ? (gr.win ? `赢了！${playerName}今晚太猛了！` : `输了…但${playerName}已经尽力了，下一场再来`) : `${gr.win ? '赢球先给出场的人掌声。' : '输球也别乱扣锅。'}${playerName}今天没上，先等机会。` },
    { a: '@数据实验室', t: 'data', text: played ? `${playerName}本场效率值：${gr.st ? Math.round((gr.st.pts + gr.st.reb + gr.st.ast + gr.st.stl + gr.st.blk) * 1.2) : '??'}，样本来自实际出场时间。` : `${playerName}本场DNP，没有个人效率样本；这场只能评估球队整体表现。` },
    { a: '@键盘评球', t: 'hater', text: gr.win ? `赢了就吹？看看对面什么水平` : `就这？说好的核心呢？` },
    { a: '@篮球老炮儿', t: 'youtuber', text: `今晚这场球我准备做个五分钟速看，${gr.win ? '精华太多了' : '槽点太多了'}` },
    { a: '@看球气到住院', t: 'emotional', text: gr.win ? `赢球的快乐谁懂啊啊啊！！！` : `血压上来了，教练换人能不能快点` }
  ] : [
    { a: '@赛场快报', t: 'news', text: `${teamName}今日休赛，${playerName}进行了日常训练。` },
    { a: '@篮球前线', t: 'news', text: `联盟今日无大交易动态，各队继续备战。` },
    { a: '@吃瓜群众甲', t: 'casual', text: `今天没球赛看，刷刷论坛等明天的比赛` },
    { a: '@步行街扛把子', t: 'hupu_toxic', text: `休赛日水贴，大家觉得${playerName}赛季结束能拿什么荣誉？` },
    { a: '@半场分析', t: 'neutral', text: `休赛日复盘一下最近的战绩走势，${teamName}需要稳住节奏` },
    { a: '@今晚稳赢', t: 'gambler', text: `明天的比赛盘口出了，研究研究` }
  ];
}
function appendFallbackSocialPosts(dayResult, day, season, count = 6, { avoidTexts = [] } = {}) {
  ensureSocialState();
  const targetCount = Math.max(0, Math.floor(parseNum(count, 0)));
  if (!targetCount) return [];
  const existingKeys = new Set(
    [
      ...(Array.isArray(avoidTexts) ? avoidTexts : []),
      ...(G.social?.posts || [])
        .filter(post =>
          parseNum(post?.season, 0) === parseNum(season, 0) &&
          parseNum(post?.day, -999) === parseNum(day, -999) &&
          !post?.isPlayer &&
          String(post?.sourceType || '').trim().toLowerCase() !== 'commercial'
        )
        .map(post => String(post?.text || '').trim())
    ]
      .map(text => String(text || '').replace(/\s+/g, '').toLowerCase())
      .filter(Boolean)
  );
  const templates = buildFallbackSocialTemplates(dayResult);
  const added = [];
  const batchKeys = new Set();
  const tryAppend = (tpl, allowExistingDuplicates = false) => {
    if (added.length >= targetCount || !tpl) return;
    const text = String(tpl.text || '').trim();
    const key = text.replace(/\s+/g, '').toLowerCase();
    if (!text || !key || batchKeys.has(key)) return;
    if (!allowExistingDuplicates && existingKeys.has(key)) return;
    const persona = SOCIAL_PERSONAS[tpl.t]?.type || '中立型';
    const postMeta = { author: tpl.a, persona, text, tone: 'neutral' };
    const p = appendSocialPost({
      author: tpl.a,
      persona,
      text,
      tone: 'neutral',
      likes: rng(30, 300),
      reposts: rng(5, 60),
      comments: makeFallbackComments(text, 'neutral', getRandomSocialCommentCount(getSocialPostHeatProfile(postMeta)), postMeta),
      day,
      season,
      year: G.year
    });
    if (!p) return;
    batchKeys.add(key);
    added.push(p);
  };
  templates.forEach(tpl => tryAppend(tpl, false));
  if (added.length < targetCount) {
    templates.forEach(tpl => tryAppend(tpl, true));
  }
  return added;
}

// 本地推文生成
function generateFallbackSocialTweets(dayResult, day, season, count = 6) {
  const added = appendFallbackSocialPosts(dayResult, day, season, count);
  const starAdded = generateStarPlayerSocialPosts(dayResult, day, season, Math.min(2, Math.max(1, Math.round(count * 0.34))));
  const supplemental = appendFallbackSocialPosts(
    dayResult,
    day,
    season,
    Math.max(0, SOCIAL_MIN_GENERATED_POSTS - getGeneratedSocialCount(day, season)),
    { avoidTexts: added.concat(starAdded).map(post => String(post?.text || '').trim()).filter(Boolean) }
  );
  const totalAdded = added.concat(starAdded, supplemental);
  markSocialGeneratedDay(day, getGeneratedSocialCount(day, season), season);
  return totalAdded;
}
function getDailySocialGateStatus() {
  ensureSocialState();
  const currentDay = parseNum(G.dayNum, 0);
  if (currentDay <= 0) {
    return { blocked: false, requiredDay: -1, generated: true, count: 0, text: '推文状态：首日可直接开始' };
  }
  const requiredDay = currentDay - 1;
  const season = parseNum(G.season, 0);
  const count = getGeneratedSocialCount(requiredDay, season);
  const generated = count >= SOCIAL_MIN_GENERATED_POSTS;
  const blocked = !generated;
  const dateText = getDayDateString(requiredDay);
  const text = generated
    ? `推文状态：${dateText} 已生成 ${count} 条`
    : `推文状态：${dateText} 未生成（禁止进入下一天）`;
  return { blocked, requiredDay, generated, count, season, text };
}
async function ensureDailySocialReadyBeforeAdvance() {
  ensureSocialState();
  const gate = getDailySocialGateStatus();
  if (!gate.blocked) {
    G.social.pendingRequiredDay = -1;
    return { ok: true, ...gate };
  }
  const day = parseNum(gate.requiredDay, -1);
  const fallback = {
    day,
    date: getDayDateString(day),
    isGame: false,
    gameResult: null,
    events: []
  };
  const dayResult = (G._latestDayResult && parseNum(G._latestDayResult.day, -99) === day) ? G._latestDayResult : fallback;
  try {
    const added = await generateDailySocialTweetsSmart(dayResult, { force: true });
    const generated = hasGeneratedSocialForDay(day, gate.season);
    if (generated) {
      G.social.pendingRequiredDay = -1;
      return { ok: true, blocked: false, requiredDay: day, count: getGeneratedSocialCount(day, gate.season), added };
    }
    G.social.pendingRequiredDay = day;
    return { ok: false, blocked: true, requiredDay: day, count: getGeneratedSocialCount(day, gate.season), message: '自动补生成失败，请重试' };
  } catch (e) {
    const message = String(e?.message || e || '推文生成失败');
    G.social.pendingRequiredDay = day;
    return { ok: false, blocked: true, requiredDay: day, count: getGeneratedSocialCount(day, gate.season), message };
  }
}
function socialPlayerPostKey(day = G.dayNum, season = G.season) {
  return `${parseNum(season, 0)}_${parseNum(day, 0)}`;
}
function getLastPlayerGameResultForSocial() {
  const latest = G._latestDayResult?.isGame ? G._latestDayResult?.gameResult : null;
  if (latest) return latest;
  const results = Array.isArray(G.results) ? G.results : [];
  return results.length ? results[results.length - 1] : null;
}
function buildPlayerSocialChoiceContext(targetPost = null) {
  const lastGame = getLastPlayerGameResultForSocial();
  const opp = lastGame ? (getTeam(lastGame.opp) || {}) : {};
  return {
    playerName: String(G.player?.name || '我').trim(),
    teamName: String(G.team?.z || G.team?.n || '球队').trim(),
    oppName: String(opp.z || opp.n || opp.a || '对手').trim(),
    lastGame,
    targetAuthor: String(targetPost?.author || targetPost?.playerName || '这条动态').trim()
  };
}
function buildPlayerTweetOptionText(id, ctx = {}) {
  const game = ctx.lastGame || {};
  const hasGame = !!ctx.lastGame;
  const played = hasGame && parseNum(game.st?.mins, parseNum(game.mins, 0)) > 0;
  const statLine = played ? `${parseNum(game.pts, 0)}分${parseNum(game.reb, 0)}板${parseNum(game.ast, 0)}助` : '本场没有进入轮换';
  const opponent = ctx.oppName || '对手';
  const team = ctx.teamName || '球队';
  const name = ctx.playerName || '我';
  const textMap = {
    team_first: played
      ? `${team}今晚靠的是团队、防守和执行。我的${statLine}只是其中一部分，下一场继续把细节做好。`
      : hasGame
        ? `${team}今晚靠的是出场球员的执行。我${statLine}，先把训练和录像做好，等下一次机会。`
      : `${team}今天训练质量不错，继续把防守、跑位和沟通做好。赛季很长，我们一步一步来。`,
    own_mistake: played
      ? `我会先看自己的录像，尤其是几个回合的选择。${opponent}给了我们压力，下一场我会打得更干净。`
      : hasGame
        ? `今晚我没有出场，能做的是把训练、沟通和准备做扎实。机会来之前，先把该补的细节补上。`
      : `今天有些细节还不够好，我会从训练里修正。少说漂亮话，多把下一次选择做好。`,
    lock_in: `不管外界怎么说，我只专注下一场。${team}需要的是更稳定的执行、更多沟通和更少情绪。`,
    competitive_call: played
      ? `${opponent}这种对抗很有意思。下次见面我还会继续冲击，真正的回应应该留在球场。`
      : hasGame
        ? `${opponent}这场给了我很多观察角度。下一次如果得到机会，我会把回应留在球场。`
      : `${name}会继续把强度拉高。尊重每个对手，但下一次碰面我不会后退。`,
    brand_polished: `${team}的球迷今天给了很多能量。感谢支持，也感谢一直陪我们熬细节的人，下一场继续努力。`
  };
  return textMap[id] || textMap.team_first;
}
function getPlayerTweetOptions() {
  ensureSocialState();
  const day = parseNum(G.dayNum, 0);
  const key = socialPlayerPostKey(day, G.season);
  const used = parseNum(G.social.playerPostsByDay?.[key], 0);
  const ctx = buildPlayerSocialChoiceContext();
  const defs = [
    { id: 'team_first', title: '团队优先', detail: '把话题放回防守、执行和队友。', badge: '信任↑ / 稳定' },
    { id: 'own_mistake', title: '主动复盘', detail: '承认自己还要修正细节。', badge: '职业发言' },
    { id: 'lock_in', title: '专注下一场', detail: '降噪，不和舆论纠缠。', badge: '低风险' },
    { id: 'competitive_call', title: '对位宣言', detail: '制造火药味和下一场话题。', badge: '热度↑ / 风险' },
    { id: 'brand_polished', title: '感谢球迷', detail: '更适合商业和公关形象。', badge: '声望↑' }
  ];
  return defs.map(item => ({ ...item, text: buildPlayerTweetOptionText(item.id, ctx), disabled: used >= 3, used, limit: 3 }));
}
function buildPlayerReplyOptionText(id, targetPost = null) {
  const ctx = buildPlayerSocialChoiceContext(targetPost);
  const author = ctx.targetAuthor || '你';
  const team = ctx.teamName || '球队';
  const opponent = ctx.oppName || '对手';
  const textMap = {
    star_respect: `${author}，尊重你的评价。能被你点到说明我还有东西值得继续打磨，真正的回应还是留给比赛和执行。`,
    star_compete: `${author}，这句话我收到了。下一场或者下次对位我会把强度带上来，球场上见真章。`,
    star_next_match: `${author}，如果后面碰面，我会把今天看到的细节带进对位里。尊重归尊重，比赛里我不会后退。`,
    star_team: `这种话题我先放一边。${team}需要的是防守、沟通和团队执行，我要先把这些做好。`,
    hater_ignore: `质疑我看到了，但我不接喷点。下一场继续训练、继续防守、继续把选择做干净。`,
    hater_work: `批评可以留着，真正的回应在训练馆和下一场比赛。${team}需要我更稳定，我会从细节补起。`,
    hater_light_fire: `说我不行可以，记得把这条留到下一次对位之后再看。球场会比评论区更诚实。`,
    hater_team: `输赢和表现都不是一个人的事。我们会看录像、修防守、把球队该做的执行回来。`,
    media_ack: `${author}，这次拆解我认。比赛里确实有几个回合需要复盘，下一场我会把处理做得更清楚。`,
    media_context: `只看一两个镜头容易断章。${opponent}给了我们不同防守，我会把这些回合带回录像课。`,
    media_defuse: `${author}，话题可以讨论，但我不想把节奏炒偏。${team}现在最需要的是赢球和稳定执行。`,
    media_team: `如果要讲这场，我更想讲团队防守和队友的补位。我的表现只是比赛的一部分。`,
    data_ack: `${author}，数据样本我会看。效率、失误和出手选择都能提醒我下一场该修哪里。`,
    data_context: `数据有价值，但还要放回比赛节奏里看。${opponent}的策略、我们的空间和我的选择会一起影响结果。`,
    data_sample: `样本继续放大再下结论。我要做的是把训练、比赛和执行连起来，让数字慢慢稳定。`,
    data_team: `个人数据不该盖过球队问题。${team}要先把防守、篮板和沟通做好，数字才会跟着好看。`,
    fan_thanks: `谢谢支持，也谢谢你愿意陪我们看这些起伏。下一场我会继续努力，把比赛打得更稳。`,
    fan_calm: `先别太急，赛季还长。我们会看录像、修细节，也会把下一场当成新的开始。`,
    fan_work: `这份支持我收到了。真正能回报球迷的不是一句漂亮话，是训练和比赛里继续把强度拿出来。`,
    fan_team: `感谢大家，但也别只看我。队友、教练组和整个球队都在扛，下一场我们一起往回打。`,
    general_respect: `${author}，尊重你的看法。真正的回应还是要靠比赛和执行，后面继续看球场。`,
    general_compete: `${author}，这话我收到了。下次碰面我会把强度带上来，球场上见真章。`,
    general_defuse: `${author}，先不把话题炒偏。${team}现在要做的是赢下下一场，把细节处理好。`,
    general_team: `我更想把重点放在队友和球队执行上。我们还有很多东西要修，但方向不会变。`,
    respect: `${author}，尊重你的看法。真正的回应还是要靠比赛和执行，后面继续看球场。`,
    compete: `${author}，这话我收到了。下次碰面我会把强度带上来，球场上见真章。`,
    defuse: `${author}，先不把话题炒偏。${team}现在要做的是赢下下一场，把细节处理好。`,
    teammate: `我更想把重点放在队友和球队执行上。我们还有很多东西要修，但方向不会变。`
  };
  return textMap[id] || textMap.general_respect;
}
function classifySocialReplyTarget(targetPost = {}) {
  const bag = `${targetPost?.authorType || ''} ${targetPost?.persona || ''} ${targetPost?.author || ''} ${targetPost?.text || ''}`.toLowerCase();
  const raw = `${targetPost?.persona || ''} ${targetPost?.author || ''} ${targetPost?.text || ''}`;
  if (targetPost?.authorType === 'star' || String(targetPost?.playerRefKey || '').trim()) return 'star';
  if (/数据|效率|样本|命中率|真实命中|usage|bpm|epm|raptor|per|效率值|正负/.test(raw)) return 'data';
  if (/黑子|喷|就这|水货|核心呢|拉胯|别装|气到|血压|输球黑|打脸/.test(raw) || targetPost?.tone === 'negative') return 'hater';
  if (/粉丝|真爱|支持|加油|下一场再来|球迷|季票|主场/.test(raw)) return 'fan';
  if (/新闻|快报|记者|媒体|观察|战术|速看|up主|复盘|拆解|播客|专栏/.test(raw) || bag.includes('media')) return 'media';
  return 'general';
}
function buildPlayerReplyOptionDefs(targetPost = {}) {
  const kind = classifySocialReplyTarget(targetPost);
  const sets = {
    star: [
      { id: 'star_respect', title: '致意前辈', detail: '承认对方眼光，把姿态放稳。', badge: '尊重↑ / 关系↑' },
      { id: 'star_compete', title: '带火回应', detail: '把讨论推向下一次对位。', badge: '热度↑ / 火药味↑' },
      { id: 'star_next_match', title: '约下次见', detail: '既尊重对方，也留下比赛悬念。', badge: '尊重↑ / 对位话题' },
      { id: 'star_team', title: '收回球队', detail: '避免个人恩怨盖过球队任务。', badge: '信任↑' }
    ],
    hater: [
      { id: 'hater_ignore', title: '不接喷点', detail: '不和情绪号纠缠，把回应留给场上。', badge: '低风险' },
      { id: 'hater_work', title: '训练回应', detail: '把质疑转成训练和比赛承诺。', badge: '信任↑' },
      { id: 'hater_light_fire', title: '轻度反击', detail: '保留火药味，但不直接失控。', badge: '热度↑ / 风险' },
      { id: 'hater_team', title: '护住球队', detail: '把矛头从个人转回全队复盘。', badge: '更衣室稳定' }
    ],
    data: [
      { id: 'data_ack', title: '认可数据', detail: '承认样本有参考价值。', badge: '职业发言' },
      { id: 'data_context', title: '补充语境', detail: '说明数据背后还有战术和对手策略。', badge: '理解↑' },
      { id: 'data_sample', title: '拉长样本', detail: '不急着接受单场结论。', badge: '稳定' },
      { id: 'data_team', title: '团队优先', detail: '避免个人效率盖过球队问题。', badge: '信任↑' }
    ],
    media: [
      { id: 'media_ack', title: '认可拆解', detail: '接受复盘视角，显得成熟。', badge: '职业发言' },
      { id: 'media_context', title: '补一层细节', detail: '把话题导向录像和对手布置。', badge: '理解↑' },
      { id: 'media_defuse', title: '压低热度', detail: '防止媒体话题继续跑偏。', badge: '信任↑' },
      { id: 'media_team', title: '转给团队', detail: '把镜头分给队友和防守执行。', badge: '更衣室稳定' }
    ],
    fan: [
      { id: 'fan_thanks', title: '感谢支持', detail: '正面接住球迷情绪。', badge: '声望↑' },
      { id: 'fan_calm', title: '稳住球迷', detail: '降低输赢后的情绪波动。', badge: '信任↑' },
      { id: 'fan_work', title: '承诺加练', detail: '把支持转成训练动力。', badge: '职业发言' },
      { id: 'fan_team', title: '一起扛', detail: '强调球队和球迷是一体的。', badge: '氛围↑' }
    ],
    general: [
      { id: 'general_respect', title: '礼貌接球', detail: '接住对方观点，但不急着下结论。', badge: '关系↑ / 尊重↑' },
      { id: 'general_compete', title: '留到场上', detail: '给话题一点火药味，答案放进比赛。', badge: '热度↑ / 火药味↑' },
      { id: 'general_defuse', title: '拉回正题', detail: '避免继续吵，把节奏放回球队任务。', badge: '信任↑' },
      { id: 'general_team', title: '抬队友', detail: '把焦点转给队友和团队执行。', badge: '更衣室稳定' }
    ]
  };
  return sets[kind] || sets.general;
}
function getPlayerReplyOptions(postId) {
  ensureSocialState();
  const target = (G.social.posts || []).find(p => String(p.id) === String(postId));
  if (!target || target.isPlayer || G.social.playerRepliedPostIds?.[String(postId)]) return [];
  const defs = buildPlayerReplyOptionDefs(target);
  return defs.map(item => ({ ...item, text: buildPlayerReplyOptionText(item.id, target) }));
}
function createPlayerTweetRecord(text = '', meta = {}) {
  ensureSocialState();
  const cleaned = cleanSocialText(text || '');
  if (!cleaned) return { ok: false, message: '推文内容不能为空' };
  const day = parseNum(G.dayNum, 0);
  const key = socialPlayerPostKey(day, G.season);
  const used = parseNum(G.social.playerPostsByDay?.[key], 0);
  if (used >= 3) return { ok: false, message: '当天最多发 3 条推文' };
  const impact = analyzePlayerSocialText(cleaned, { mode: 'post' });
  const post = appendSocialPost({
    author: `@${String(G.player?.name || 'player').trim().replace(/\s+/g, '')}`,
    persona: '球员本人',
    text: cleaned,
    tone: impact.tone,
    likes: rng(80, 680),
    reposts: rng(8, 88),
    comments: [],
    isPlayer: true,
    avatar: String(G.player?.avatar || '').trim(),
    photo: typeof getPlayerPhotoSrc === 'function' ? getPlayerPhotoSrc(G.player || {}) : String(G.player?.photo || '').trim(),
    day,
    season: G.season,
    year: G.year
  });
  if (!post) return { ok: false, message: '发布失败' };
  G.social.playerPostsByDay[key] = used + 1;
  const rep = applyReputationDelta({ fame: impact.fame, trust: impact.trust, source: '个人推文' });
  return { ok: true, day, cleaned, impact, post, rep, choiceId: String(meta.choiceId || '').trim(), choiceTitle: String(meta.choiceTitle || '').trim() };
}
function finalizePlayerTweetRecord(base, responders = []) {
  if (!base?.ok) return base || { ok: false, message: '发布失败' };
  appendPlayerStatementLog({
    day: base.day,
    season: G.season,
    title: base.choiceTitle ? `个人推文：${base.choiceTitle}` : '个人推文',
    type: 'social_post',
    text: base.cleaned,
    choiceId: base.choiceId,
    analysisText: base.impact.label
  });
  if (responders.length) {
    const names = responders.map(p => p.name).filter(Boolean).join('、');
    addNews(`📱 你的推文引来了球星互动：${names} 公开回应了你。`, base.impact.tone === 'negative' ? 'neg' : 'pos');
  }
  return {
    ok: true,
    post: base.post,
    impact: {
      ...base.impact,
      label: base.impact.label,
      fameDelta: base.rep.fameDelta,
      trustDelta: base.rep.trustDelta
    },
    responders
  };
}
function submitPlayerTweetOptionText(text = '', meta = {}) {
  const base = createPlayerTweetRecord(text, meta);
  if (!base.ok) return base;
  const responders = maybeCreateStarResponseForPlayerPost(base.post, base.cleaned, base.impact);
  return finalizePlayerTweetRecord(base, responders);
}
function postPlayerTweetChoice(choiceId = '') {
  const options = getPlayerTweetOptions();
  const option = options.find(item => String(item.id) === String(choiceId));
  if (!option) return { ok: false, message: '发言选项不存在' };
  if (option.disabled) return { ok: false, message: `当天最多发 ${option.limit || 3} 条推文` };
  return submitPlayerTweetOptionText(option.text, { choiceId: option.id, choiceTitle: option.title });
}
function createPlayerReplyRecord(postId, text = '', meta = {}) {
  ensureSocialState();
  const target = (G.social.posts || []).find(p => String(p.id) === String(postId));
  if (!target) return { ok: false, message: '推文不存在' };
  if (target.isPlayer) return { ok: false, message: '不能回复自己的推文' };
  const key = String(postId);
  if (G.social.playerRepliedPostIds?.[key]) return { ok: false, message: '这条推文你已经回复过了' };
  const cleaned = cleanSocialText(text || '');
  if (!cleaned) return { ok: false, message: '回复内容不能为空' };
  const impact = analyzePlayerSocialText(cleaned, { targetPost: target, mode: 'reply' });
  target.comments = Array.isArray(target.comments) ? target.comments : [];
  target.comments.unshift({
    author: `@${String(G.player?.name || 'player').trim().replace(/\s+/g, '')}`,
    text: cleaned,
    likes: rng(4, 90)
  });
  target.likes = parseNum(target.likes, 0) + rng(6, 46);
  G.social.playerRepliedPostIds[key] = 1;
  const rep = applyReputationDelta({ fame: impact.fame, trust: impact.trust, source: '回复推文' });
  return { ok: true, target, cleaned, impact, rep, choiceId: String(meta.choiceId || '').trim(), choiceTitle: String(meta.choiceTitle || '').trim() };
}
function maybeCreateStarResponseForReply(target, cleaned, impact) {
  let relation = null;
  if (target.authorType === 'star' || String(target.playerRefKey || '').trim()) {
    const profile = getSocialStarProfileByRef({
      key: target.playerRefKey,
      playerId: target.playerId,
      teamId: target.teamId,
      name: target.playerName
    });
    if (profile) {
      relation = applySocialPlayerLinkDelta(profile, {
        affinityDelta: impact.relationAffinity,
        respectDelta: impact.relationRespect,
        heatDelta: impact.relationHeat,
        source: '回复球星推文'
      });
      const relationInfo = resolveSocialLinkStatus(relation?.link);
      const responseText = buildStarReplyComment(profile, relationInfo, impact, target);
      const starComment = {
        author: String(profile.handle || buildStarHandleFromName(profile.name, profile.teamAbbr)).trim(),
        text: responseText,
        likes: rng(20, 260)
      };
      target.comments.unshift(starComment);
      queueStarReplyCommentEnhancement(starComment, profile, relationInfo, impact, target, cleaned);
      addPhone('社媒提醒', `${profile.name} 看到了你的回复，并公开回了一句。`, 'info');
    }
  }
  return relation;
}
async function maybeCreateStarResponseForReplyAsync(target, cleaned, impact) {
  return { relation: maybeCreateStarResponseForReply(target, cleaned, impact) };
}
function finalizePlayerReplyRecord(base, relation = null) {
  if (!base?.ok) return base || { ok: false, message: '回复失败' };
  const teamSync = relation?.teamSync || null;
  const teamSyncText = teamSync
    ? [
      teamSync.favorDelta ? `队友好感${teamSync.favorDelta > 0 ? '+' : ''}${teamSync.favorDelta}` : '',
      teamSync.usageDelta ? `球权感受${teamSync.usageDelta > 0 ? '+' : ''}${teamSync.usageDelta}` : ''
    ].filter(Boolean).join(' / ')
    : '';
  appendPlayerStatementLog({
    day: parseNum(base.target.day, G.dayNum),
    season: parseNum(base.target.season, G.season),
    title: `回复 ${base.target.author || '推文'}`,
    type: 'social_reply',
    text: base.cleaned,
    choiceId: base.choiceId,
    analysisText: base.impact.label
  });
  return {
    ok: true,
    target: base.target,
    relation,
    impact: {
      ...base.impact,
      label: relation?.newStatus?.id && relation.newStatus.id !== 'neutral'
        ? `${base.impact.label} · ${relation.newStatus.label}${teamSyncText ? ` · ${teamSyncText}` : ''}`
        : `${base.impact.label}${teamSyncText ? ` · ${teamSyncText}` : ''}`,
      fameDelta: base.rep.fameDelta,
      trustDelta: base.rep.trustDelta
    }
  };
}
function submitPlayerReplyOptionText(postId, text = '', meta = {}) {
  const base = createPlayerReplyRecord(postId, text, meta);
  if (!base.ok) return base;
  const relation = maybeCreateStarResponseForReply(base.target, base.cleaned, base.impact);
  return finalizePlayerReplyRecord(base, relation);
}
function replyToSocialPostChoice(postId, choiceId = '') {
  const options = getPlayerReplyOptions(postId);
  const option = options.find(item => String(item.id) === String(choiceId));
  if (!option) return { ok: false, message: '回复选项不存在或已经回复过' };
  return submitPlayerReplyOptionText(postId, option.text, { choiceId: option.id, choiceTitle: option.title });
}
async function regenerateCommercialBuzzPostsForDay(day, season, { enhanceText = true } = {}) {
  ensureSocialState();
  const sourceEvents = [...(G.social.commercialEvents || [])]
    .filter(evt => parseNum(evt?.day, -999) === parseNum(day, -1) && parseNum(evt?.season, -999) === parseNum(season, -1))
    .sort((a, b) => parseNum(a?.ts, 0) - parseNum(b?.ts, 0));
  if (!sourceEvents.length) return [];
  const grouped = new Map();
  sourceEvents.forEach(raw => {
    const normalized = normalizeCommercialEvent(raw, raw?.tag || '商业', raw);
    const key = String(normalized.eventKey || buildCommercialEventGroupKey(normalized)).trim();
    if (!grouped.has(key)) {
      grouped.set(key, { ...normalized, eventKey: key });
      return;
    }
    const existing = grouped.get(key);
    mergeCommercialEventRecord(existing, normalized);
    grouped.set(key, existing);
  });
  const groupedEvents = [...grouped.values()].sort((a, b) => parseNum(b?.ts, 0) - parseNum(a?.ts, 0));
  const results = [];
  for (const evt of groupedEvents) {
    const post = upsertCommercialBuzzPost(evt);
    if (!post) continue;
    if (enhanceText) await enhanceCommercialBuzzTextByTemplateAsync(evt, post, { force: true });
    else queueCommercialBuzzTextTemplateEnhancement(evt, post, { force: true });
    queueCommercialEventVisualEnhancement(evt, post);
    results.push(post);
  }
  return results;
}
async function regenerateTodaySocialTweets() {
  ensureSocialState();
  const fallbackDay = Math.max(0, parseNum(G.dayNum, 0) - 1);
  const dayResult = G._latestDayResult || {
    day: fallbackDay,
    date: getDayDateString(fallbackDay),
    isGame: false,
    gameResult: null,
    events: []
  };
  const day = parseNum(dayResult.day, fallbackDay);
  const season = parseNum(G.season, 1);
  G.social.posts = (G.social.posts || []).filter(post => !(parseNum(post?.day, -999) === day && parseNum(post?.season, 0) === season && !post?.isPlayer));
  delete G.social.generatedDayCounts[socialGeneratedKey(day, season)];
  const generated = await generateDailySocialTweetsSmart(dayResult, { force: true });
  const commercial = await regenerateCommercialBuzzPostsForDay(day, season, { enhanceText: true });
  return [...generated, ...commercial];
}
function applyReputationDelta({ fame = 0, trust = 0, source = '' } = {}) {
  const ecoFx = getEconomyEffects();
  const scaleDelta = (value) => {
    const raw = parseNum(value, 0);
    if (!raw) return 0;
    const mult = raw > 0 ? parseNum(ecoFx.repPositiveMult, 1) : parseNum(ecoFx.repNegativeMult, 1);
    return raw > 0
      ? Math.max(1, Math.round(raw * mult))
      : -Math.max(1, Math.round(Math.abs(raw) * mult));
  };
  const oldFame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const oldTrust = clamp(parseNum(G.player.trust, 50), 0, 100);
  G.player.fame = clamp(oldFame + scaleDelta(fame), 0, 100);
  G.player.trust = clamp(oldTrust + scaleDelta(trust), 0, 100);
  const fameDelta = G.player.fame - oldFame;
  const trustDelta = G.player.trust - oldTrust;
  if ((fameDelta || trustDelta) && source) {
    const parts = [];
    if (fameDelta) parts.push(`声望${fameDelta > 0 ? '+' : ''}${fameDelta}`);
    if (trustDelta) parts.push(`信任${trustDelta > 0 ? '+' : ''}${trustDelta}`);
    addNews(`📣 舆论反馈（${source}）：${parts.join(' / ')}`, fameDelta + trustDelta >= 0 ? 'pos' : 'neg');
  }
  return { fameDelta, trustDelta };
}
function ownedLuxurySet() {
  ensureEconomyState();
  return new Set((G.economy.ownedItems || []).map(x => String(x)));
}
function buildEconomyEffectSummary(item = {}) {
  const has = key => Object.prototype.hasOwnProperty.call(item, key);
  const parts = [];
  let overview = '';
  if (has('restBonus') && has('gameBonus') && has('injuryMult') && has('injuryDaysMult')) {
    overview = '提升休息恢复、赛后恢复并缩短伤停时间';
  } else if (has('restBonus') && has('gameBonus') && has('injuryMult')) {
    overview = '提升休息恢复、赛后恢复并降低伤病风险';
  } else if (has('xpMult') && !has('prepBonus') && !has('fatigueRelief')) {
    overview = '提升训练成长效率与属性开发';
  } else if (has('posRepMult') || has('negRepMult') || has('socialHeatMult') || has('eventBonus')) {
    overview = '放大正面舆论、缓冲负面风波并提高商业曝光';
  } else if (has('offerMult') || has('incomeMult') || has('activeCapBonus')) {
    overview = '提高代言谈判能力、商业收入和并行合作上限';
  } else if (has('prepBonus') || has('fatigueRelief')) {
    overview = '提升赛前准备、训练分析和疲劳管理';
  } else if (has('fame') || has('trust')) {
    overview = '提升声望与公众形象';
  }
  if (parseNum(item.fame, 0)) parts.push(`声望 ${parseNum(item.fame, 0) > 0 ? '+' : ''}${parseNum(item.fame, 0)}`);
  if (parseNum(item.trust, 0)) parts.push(`信任 ${parseNum(item.trust, 0) > 0 ? '+' : ''}${parseNum(item.trust, 0)}`);
  if (parseNum(item.restBonus, 0)) parts.push(`休息恢复 +${parseNum(item.restBonus, 0)}`);
  if (parseNum(item.gameBonus, 0)) parts.push(`赛后恢复 +${parseNum(item.gameBonus, 0)}`);
  if (parseNum(item.xpMult, 1) > 1) parts.push(`训练 XP ×${parseNum(item.xpMult, 1).toFixed(2)}`);
  if (parseNum(item.injuryMult, 1) < 1) parts.push(`伤病风险 ×${parseNum(item.injuryMult, 1).toFixed(2)}`);
  if (parseNum(item.injuryDaysMult, 1) < 1) parts.push(`伤停时间 ×${parseNum(item.injuryDaysMult, 1).toFixed(2)}`);
  if (parseNum(item.posRepMult, 1) > 1) parts.push(`正面舆论 ×${parseNum(item.posRepMult, 1).toFixed(2)}`);
  if (parseNum(item.negRepMult, 1) < 1) parts.push(`负面舆论 ×${parseNum(item.negRepMult, 1).toFixed(2)}`);
  if (parseNum(item.socialHeatMult, 1) > 1) parts.push(`热度 ×${parseNum(item.socialHeatMult, 1).toFixed(2)}`);
  if (parseNum(item.eventBonus, 0) > 0) parts.push(`商业机会 +${(parseNum(item.eventBonus, 0) * 100).toFixed(1)}%`);
  if (parseNum(item.marketScoreBonus, 0) > 0) parts.push(`市场分 +${parseNum(item.marketScoreBonus, 0)}`);
  if (parseNum(item.offerMult, 1) > 1) parts.push(`代言报价 ×${parseNum(item.offerMult, 1).toFixed(2)}`);
  if (parseNum(item.incomeMult, 1) > 1) parts.push(`商业分成 ×${parseNum(item.incomeMult, 1).toFixed(2)}`);
  if (parseNum(item.activeCapBonus, 0) > 0) parts.push(`并行代言上限 +${parseNum(item.activeCapBonus, 0)}`);
  if (parseNum(item.prepBonus, 0) > 0) parts.push(`赛前准备 +${parseNum(item.prepBonus, 0)}`);
  if (parseNum(item.fatigueRelief, 0) > 0) parts.push(`疲劳管理 +${(parseNum(item.fatigueRelief, 0) * 100).toFixed(1)}%`);
  return [overview, ...parts].filter(Boolean).join(' | ') || '提升商业曝光与生涯体验';
}
function buildNaturalBuzzDetail(item = {}) {
  const has = key => Object.prototype.hasOwnProperty.call(item, key);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  if (has('restBonus') && has('gameBonus') && has('injuryMult') && has('injuryDaysMult')) {
    return pick([
      '康复理疗团队再升级，球员的恢复效率和伤病保障都更有底气了',
      '医疗团队扩充了理疗组，赛后恢复和长期健康管理更专业',
      '新的康复配置到位，球员身体管理进入精细化阶段'
    ]);
  }
  if (has('restBonus') && has('gameBonus') && has('injuryMult')) {
    return pick([
      '体能保障体系又进一步，恢复节奏和伤病预防都更稳了',
      '团队在恢复和减伤方面加码，为后半程赛程做足了准备',
      '这套升级偏"打底"性质，但长期看对出勤率很关键'
    ]);
  }
  if (has('xpMult') && !has('prepBonus') && !has('fatigueRelief')) {
    return pick([
      '训练团队再添一名教练，日常练习的成长节奏会更快',
      '教练配置又往上提了一档，训练质量和效率都有提升空间',
      '训练端加码了，后续属性开发和比赛状态值得期待'
    ]);
  }
  if (has('posRepMult') || has('negRepMult') || has('socialHeatMult') || has('eventBonus')) {
    return pick([
      '公关和舆论团队升级，面对风波的缓冲能力更强了',
      '品牌运营端有新动作，曝光和舆论管理都在提档',
      '这套配置更像是在为长期商业版图铺路'
    ]);
  }
  if (has('offerMult') || has('incomeMult') || has('activeCapBonus')) {
    return pick([
      '商业谈判和运营能力又进一步，后续代言和收入都有提升空间',
      '商业团队配置升级，谈判筹码和并行合作上限都在提高',
      '这套升级对商业版图的扩展会有直接帮助'
    ]);
  }
  if (has('prepBonus') || has('fatigueRelief')) {
    return pick([
      '数据分析和疲劳管理体系升级，赛前准备会更充分',
      '训练分析和体能节奏管理加码，比赛日的状态调配更精细了',
      '这套升级偏"运营向"，但对赛程后半段的稳定性很关键'
    ]);
  }
  if (has('fame') || has('trust')) {
    return pick([
      '团队在公众形象管理方面又走了一步',
      '品牌层面的积累在持续加深'
    ]);
  }
  return '团队配置持续优化，整体运营更成体系了';
}
function addCommercialMomentum({ label = '', cost = 0, extra = 0, source = '商业运作', quiet = false } = {}) {
  ensureEconomyState();
  const gain = clamp(Math.round(parseNum(cost, 0) * 0.7 + parseNum(extra, 0)), 1, 22);
  G.economy.totalSpent = +(parseNum(G.economy.totalSpent, 0) + Math.max(0, parseNum(cost, 0))).toFixed(2);
  G.economy.visibilityMomentum = clamp(getActiveVisibilityMomentum() + gain, 0, 120);
  G.economy.visibilityMomentumUntilDay = Math.max(parseNum(G.economy.visibilityMomentumUntilDay, -1), parseNum(G.dayNum, 0) + 5 + Math.round(parseNum(cost, 0)));
  if (!quiet && (parseNum(cost, 0) >= 6 || gain >= 7)) {
    addNews(`💼 商业热度上升：${label || source} 带动了额外曝光`, 'pos');
    addPhone('商业顾问', `${label || source} 开始发酵，品牌和媒体对你的关注正在升温。`, 'info');
  }
  return { gain, momentum: G.economy.visibilityMomentum, untilDay: G.economy.visibilityMomentumUntilDay };
}
function decayCommercialMomentum() {
  ensureEconomyState();
  const current = getActiveVisibilityMomentum();
  if (current <= 0) {
    G.economy.visibilityMomentum = 0;
    return 0;
  }
  G.economy.visibilityMomentum = clamp(current - 1.4, 0, 120);
  return G.economy.visibilityMomentum;
}
function buildCommercialOpportunityPool() {
  const ecoFx = getEconomyEffects();
  const identity = buildCommercialIdentityProfile();
  const pool = [
    { label: '本地电视专访', type: 'media_event', tag: '采访曝光', cash: 0.06, fame: 1, trust: 0, detail: '本地体育台录制了你的赛季专题' },
    { label: '城市球迷会见面日', type: 'media_event', tag: '城市活动', cash: 0.05, fame: 1, trust: 1, detail: '球迷互动和本地曝光一起抬升' }
  ];
  if (parseNum(ecoFx.fameTier, 0) >= 2) {
    pool.push(
      { label: '品牌短片拍摄', type: 'media_event', tag: '品牌曝光', cash: 0.12, fame: 2, trust: 0, detail: '短片上线后，商业讨论度明显升温' },
      { label: '城市公益活动', type: 'media_event', tag: '公益曝光', cash: 0.08, fame: 1, trust: 2, detail: '社区和媒体对你的好感同步提升' }
    );
  }
  if (parseNum(ecoFx.fameTier, 0) >= 3) {
    pool.push(
      { label: '综艺短访邀约', type: 'media_event', tag: '综艺曝光', cash: 0.18, fame: 2, trust: 0, detail: '这次露出把你推到了更大的受众面前' },
      { label: '高端品牌试探接触', type: 'brand_interest', tag: '品牌主动接触', cash: 0.1, fame: 1, trust: 1, detail: '品牌开始评估更高规格的合作报价', extraMomentum: 4 }
    );
  }
  if (parseNum(ecoFx.fameTier, 0) >= 4) {
    pool.push(
      { label: '封面人物拍摄', type: 'media_event', tag: '封面曝光', cash: 0.28, fame: 3, trust: 0, detail: '封面释出后，你的社媒讨论度继续抬升', extraMomentum: 5 },
      { label: '城市形象宣传片', type: 'media_event', tag: '城市活动', cash: 0.22, fame: 2, trust: 2, detail: '城市级活动开始把你当门面来用', extraMomentum: 4 }
    );
  }
  if (identity.groundedScore >= identity.flashyScore + 2) {
    pool.push({ label: '公益基金扩散报道', type: 'media_event', tag: '公益曝光', cash: 0.12, fame: 1, trust: 3, detail: '公益线的人设进一步坐实', extraMomentum: 3 });
  }
  if (identity.flashyScore >= identity.groundedScore + 2) {
    pool.push({ label: '生活方式大片', type: 'media_event', tag: '时尚曝光', cash: 0.2, fame: 3, trust: -1, detail: '张扬的生活方式再次冲上热搜', extraMomentum: 5 });
  }
  return pool;
}
function maybeTriggerCommercialOpportunity(result = null) {
  ensureEconomyState();
  const ecoFx = getEconomyEffects();
  if (parseNum(G.dayNum, 0) - parseNum(G.economy.lastOpportunityDay, -99) < 4) return null;
  let chance = clamp(parseNum(ecoFx.specialEventChance, 0.04), 0.02, 0.24);
  if (result?.isGame && result?.gameResult?.win) chance += 0.012;
  if (parseNum(ecoFx.visibilityMomentum, 0) >= 10) chance += 0.015;
  if (Math.random() >= chance) return null;
  const pool = buildCommercialOpportunityPool();
  if (!pool.length) return null;
  const evt = pool[rng(0, pool.length - 1)];
  adjustPlayerCash(parseNum(evt.cash, 0), evt.label);
  const rep = applyReputationDelta({ fame: parseNum(evt.fame, 0), trust: parseNum(evt.trust, 0), source: evt.label });
  addCommercialMomentum({ label: evt.label, cost: Math.max(0.6, parseNum(evt.cash, 0) * 16), extra: parseNum(evt.extraMomentum, 0), source: evt.label, quiet: true });
  addPhone('商业团队', `${evt.label} 已落地。${evt.detail} 收入 $${parseNum(evt.cash, 0).toFixed(2)}M。`, 'info');
  addEconomyLog(`商业机会：${evt.label}`, 'pos');
  emitPurchaseSocialBuzz({
    type: evt.type,
    label: evt.label,
    displayLabel: evt.label,
    tag: evt.tag,
    category: evt.tag,
    detail: `${evt.detail} 收入 $${parseNum(evt.cash, 0).toFixed(2)}M`,
    fame: rep.fameDelta,
    trust: rep.trustDelta,
    playerName: G.player?.name || '',
    teamName: G.team?.z || '',
    teamAbbr: G.team?.a || ''
  }, evt.tag);
  G.economy.lastOpportunityDay = parseNum(G.dayNum, 0);
  if (result && Array.isArray(result.events)) {
    const parts = [`收入 $${parseNum(evt.cash, 0).toFixed(2)}M`];
    if (rep.fameDelta) parts.push(`声望${rep.fameDelta > 0 ? '+' : ''}${rep.fameDelta}`);
    if (rep.trustDelta) parts.push(`信任${rep.trustDelta > 0 ? '+' : ''}${rep.trustDelta}`);
    result.events.push(`🎥 ${evt.label}：${parts.join(' / ')}`);
  }
  return evt;
}
function buildEconomyShopView() {
  ensureEconomyState();
  const ecoFx = getEconomyEffects();
  const staminaLevel = parseNum(G.economy.staminaCoachLevel, 0);
  const trainingLevel = parseNum(G.economy.trainingCoachLevel, 0);
  const recoveryLevel = parseNum(G.economy.recoveryTeamLevel, 0);
  const prLevel = parseNum(G.economy.prTeamLevel, 0);
  const agentLevel = parseNum(G.economy.agentTeamLevel, 0);
  const analyticsLevel = parseNum(G.economy.analyticsLevel, 0);
  const staminaCurrent = getStaminaCoachConfig(staminaLevel);
  const trainingCurrent = getTrainingCoachConfig(trainingLevel);
  const recoveryCurrent = getRecoveryTeamConfig(recoveryLevel);
  const prCurrent = getPRTeamConfig(prLevel);
  const agentCurrent = getAgentTeamConfig(agentLevel);
  const analyticsCurrent = getAnalyticsConfig(analyticsLevel);
  const staminaNext = STAMINA_COACH_MARKET[staminaLevel + 1] || null;
  const trainingNext = TRAINING_COACH_MARKET[trainingLevel + 1] || null;
  const recoveryNext = RECOVERY_TEAM_MARKET[recoveryLevel + 1] || null;
  const prNext = PR_TEAM_MARKET[prLevel + 1] || null;
  const agentNext = AGENT_TEAM_MARKET[agentLevel + 1] || null;
  const analyticsNext = ANALYTICS_SERVICE_MARKET[analyticsLevel + 1] || null;
  const owned = ownedLuxurySet();
  const facilityOwned = ownedFacilitySet();
  return {
    cash: +parseNum(G.player.cash, 0).toFixed(2),
    staminaLevel,
    trainingLevel,
    recoveryLevel,
    prLevel,
    agentLevel,
    analyticsLevel,
    staminaCurrent,
    trainingCurrent,
    recoveryCurrent,
    prCurrent,
    agentCurrent,
    analyticsCurrent,
    staminaNext,
    trainingNext,
    recoveryNext,
    prNext,
    agentNext,
    analyticsNext,
    profile: {
      privilegeLabel: ecoFx.fameTierLabel,
      commercialIdentity: ecoFx.commercialIdentity,
      visibilityMomentum: ecoFx.visibilityMomentum,
      totalSpent: ecoFx.totalSpent,
      activeDealCap: ecoFx.activeDealCap,
      specialEventChance: ecoFx.specialEventChance,
      perkList: ecoFx.perkList,
      endorsementScoreBonus: ecoFx.endorsementScoreBonus,
      socialHeatMult: ecoFx.socialHeatMult
    },
    facilities: FACILITY_MARKET.map(item => ({ ...item, owned: facilityOwned.has(String(item.id)), effectText: buildEconomyEffectSummary(item) })),
    luxury: LUXURY_MARKET.map(item => ({ ...item, image: buildLuxuryImage(item), owned: owned.has(String(item.id)), effectText: buildEconomyEffectSummary(item) })),
    logs: [...(G.economy.logs || [])]
  };
}
function emitPurchaseSocialBuzz(label, tag = '消费', meta = {}) {
  const event = normalizeCommercialEvent(label, tag, meta);
  const stored = recordCommercialEvent({ ...event, posted: true });
  if (!stored) return [];
  const appended = upsertCommercialBuzzPost(stored);
  if (stored && appended) {
    queueCommercialBuzzTextTemplateEnhancement(stored, appended, { force: true });
    queueCommercialEventVisualEnhancement(stored, appended);
  }
  return appended ? [appended] : [];
}
function buyLevelUpgrade({ levelKey = '', market = [], maxMessage = '已满级', message = '', fame = 1, trust = 1, phoneFrom = '团队', buzzTag = '团队升级', eventType = 'coach_upgrade' } = {}) {
  ensureEconomyState();
  const cur = parseNum(G.economy[levelKey], 0);
  const next = market[cur + 1];
  if (!next) return { ok: false, reason: 'max', message: maxMessage };
  if (parseNum(G.player.cash, 0) < parseNum(next.cost, 0)) return { ok: false, reason: 'cash', message: '资金不足' };
  adjustPlayerCash(-next.cost, `聘请/升级 ${next.name}`);
  G.economy[levelKey] = next.level;
  addCommercialMomentum({ label: next.name, cost: parseNum(next.cost, 0), extra: parseNum(next.marketScoreBonus, 0) * 0.8, source: buzzTag });
  const rep = applyReputationDelta({ fame, trust, source: `启用${next.name}` });
  addPhone(phoneFrom, message || `${next.name} 已就位。`, 'info');
  emitPurchaseSocialBuzz({
    type: eventType,
    label: next.name,
    displayLabel: next.name,
    tag: buzzTag,
    category: buzzTag,
    detail: buildNaturalBuzzDetail(next),
    fame: rep.fameDelta,
    trust: rep.trustDelta,
    playerName: G.player?.name || '',
    teamName: G.team?.z || '',
    teamAbbr: G.team?.a || ''
  }, buzzTag);
  return { ok: true, message: `已启用 ${next.name}`, rep };
}
function buyStaminaCoach() {
  return buyLevelUpgrade({
    levelKey: 'staminaCoachLevel',
    market: STAMINA_COACH_MARKET,
    maxMessage: '体能教练已满级',
    message: '体能恢复和赛后回补会更稳，负荷管理也更专业。',
    fame: 1,
    trust: 1,
    phoneFrom: '体能团队',
    buzzTag: '训练团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyTrainingCoach() {
  return buyLevelUpgrade({
    levelKey: 'trainingCoachLevel',
    market: TRAINING_COACH_MARKET,
    maxMessage: '训练教练已满级',
    message: '训练强度和成长效率已经拉高，日常练习回报会更明显。',
    fame: 1,
    trust: 2,
    phoneFrom: '训练师',
    buzzTag: '训练团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyRecoveryTeam() {
  return buyLevelUpgrade({
    levelKey: 'recoveryTeamLevel',
    market: RECOVERY_TEAM_MARKET,
    maxMessage: '康复团队已满级',
    message: '康复团队已接管理疗和伤后恢复，后续身体管理会更稳。',
    fame: 1,
    trust: 2,
    phoneFrom: '医疗团队',
    buzzTag: '康复团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyPRTeam() {
  return buyLevelUpgrade({
    levelKey: 'prTeamLevel',
    market: PR_TEAM_MARKET,
    maxMessage: '公关团队已满级',
    message: '公关团队已上线。今后的舆论放大和危机缓冲都会更强。',
    fame: 2,
    trust: 1,
    phoneFrom: '公关主管',
    buzzTag: '公关团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyAgentTeam() {
  return buyLevelUpgrade({
    levelKey: 'agentTeamLevel',
    market: AGENT_TEAM_MARKET,
    maxMessage: '经纪团队已满级',
    message: '经纪团队已开始推高你的报价和品牌池，后续谈判空间会更大。',
    fame: 2,
    trust: 1,
    phoneFrom: '经纪团队',
    buzzTag: '经纪团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyAnalyticsService() {
  return buyLevelUpgrade({
    levelKey: 'analyticsLevel',
    market: ANALYTICS_SERVICE_MARKET,
    maxMessage: '数据分析服务已满级',
    message: '数据分析服务已接入，训练反馈和赛前准备都会更细。',
    fame: 1,
    trust: 2,
    phoneFrom: '数据分析师',
    buzzTag: '数据服务升级',
    eventType: 'coach_upgrade'
  });
}
function buyFacilityItem(itemId) {
  ensureEconomyState();
  const item = FACILITY_MARKET.find(x => String(x.id) === String(itemId));
  if (!item) return { ok: false, reason: 'invalid', message: '设施不存在' };
  const owned = ownedFacilitySet();
  if (owned.has(String(item.id))) return { ok: false, reason: 'owned', message: '已拥有该设施' };
  if (parseNum(G.player.cash, 0) < parseNum(item.cost, 0)) return { ok: false, reason: 'cash', message: '资金不足' };
  adjustPlayerCash(-item.cost, `购入 ${item.name}`);
  G.economy.ownedFacilities.push(item.id);
  addCommercialMomentum({ label: item.name, cost: parseNum(item.cost, 0), extra: parseNum(item.momentum, 0) + parseNum(item.marketScoreBonus, 0), source: '基础设施升级' });
  const rep = applyReputationDelta({ fame: parseNum(item.fame, 0), trust: parseNum(item.trust, 0), source: `启用${item.name}` });
  addPhone('资产经理', `${item.name} 已投入使用。${buildEconomyEffectSummary(item)}`, 'info');
  emitPurchaseSocialBuzz({
    type: 'facility_upgrade',
    label: item.name,
    displayLabel: item.name,
    tag: item.socialTag || '设施升级',
    category: item.socialTag || '设施升级',
    detail: buildNaturalBuzzDetail(item),
    fame: rep.fameDelta,
    trust: rep.trustDelta,
    playerName: G.player?.name || '',
    teamName: G.team?.z || '',
    teamAbbr: G.team?.a || ''
  }, item.socialTag || '设施升级');
  return { ok: true, message: `已购入 ${item.name}`, rep };
}
function buyLuxuryItem(itemId) {
  ensureEconomyState();
  const item = LUXURY_MARKET.find(x => String(x.id) === String(itemId));
  if (!item) return { ok: false, reason: 'invalid', message: '商品不存在' };
  const owned = ownedLuxurySet();
  if (owned.has(String(item.id))) return { ok: false, reason: 'owned', message: '已拥有该资产' };
  if (parseNum(G.player.cash, 0) < parseNum(item.cost, 0)) return { ok: false, reason: 'cash', message: '资金不足' };
  adjustPlayerCash(-item.cost, `购入 ${item.name}`);
  G.economy.ownedItems.push(item.id);
  addCommercialMomentum({
    label: item.name,
    cost: parseNum(item.cost, 0),
    extra: /公益/.test(String(item.socialTag || '')) ? 4 : /豪宅|超跑|游艇|私人飞机/.test(String(item.socialTag || '')) ? 6 : 3,
    source: item.socialTag || '消费'
  });
  const rep = applyReputationDelta({ fame: parseNum(item.fame, 0), trust: parseNum(item.trust, 0), source: `购入${item.name}` });
  addPhone('私人助理', `已完成采购：${item.name}。`, 'info');
  emitPurchaseSocialBuzz({
    type: 'luxury_purchase',
    label: item.name,
    displayLabel: item.name,
    tag: item.socialTag || '消费',
    category: item.socialTag || '消费',
    brand: item.name,
    product: '',
    detail: `购买价 $${parseNum(item.cost, 0).toFixed(1)}M`,
    fame: rep.fameDelta,
    trust: rep.trustDelta,
    playerName: G.player?.name || '',
    teamName: G.team?.z || '',
    teamAbbr: G.team?.a || '',
    image: buildLuxuryImage(item)
  }, item.socialTag || '消费');
  return { ok: true, message: `已购入 ${item.name}`, rep };
}
const ENDORSEMENT_TIER_RULES = {
  1: { marketScore: 28, fame: 12, trust: 34, honor: 0, signing: 0.18, daily: 0.003, game: 0.006, termDays: 54 },
  2: { marketScore: 38, fame: 18, trust: 38, honor: 1, signing: 0.32, daily: 0.004, game: 0.008, termDays: 66 },
  3: { marketScore: 50, fame: 24, trust: 44, honor: 4, signing: 0.56, daily: 0.006, game: 0.012, termDays: 78 },
  4: { marketScore: 66, fame: 34, trust: 50, honor: 8, signing: 0.95, daily: 0.008, game: 0.016, termDays: 90 },
  5: { marketScore: 84, fame: 46, trust: 58, honor: 14, signing: 1.6, daily: 0.012, game: 0.024, termDays: 108 }
};
const ENDORSEMENT_CATEGORY_MODIFIERS = {
  gear: { score: -4, fame: -3, trust: 0, honor: 0, signingMult: 1.0, dailyMult: 1.05, gameMult: 1.1, termBonus: 0 },
  food: { score: -6, fame: -4, trust: 0, honor: 0, signingMult: 0.9, dailyMult: 0.95, gameMult: 1.0, termBonus: -6 },
  tech: { score: 0, fame: -1, trust: 0, honor: 0, signingMult: 1.05, dailyMult: 1.0, gameMult: 1.05, termBonus: 0 },
  auto: { score: 10, fame: 4, trust: 5, honor: 5, signingMult: 1.7, dailyMult: 1.45, gameMult: 1.4, termBonus: 12 },
  finance: { score: 12, fame: 3, trust: 7, honor: 6, signingMult: 1.6, dailyMult: 1.35, gameMult: 1.2, termBonus: 10 },
  fashion: { score: 4, fame: 2, trust: 2, honor: 1, signingMult: 1.3, dailyMult: 1.15, gameMult: 1.1, termBonus: 4 },
  beauty: { score: -4, fame: -2, trust: 3, honor: 0, signingMult: 0.85, dailyMult: 0.9, gameMult: 0.95, termBonus: -4 },
  game: { score: -2, fame: 0, trust: 0, honor: 0, signingMult: 1.0, dailyMult: 1.05, gameMult: 1.1, termBonus: 0 },
  public: { score: -3, fame: -1, trust: 6, honor: 2, signingMult: 0.8, dailyMult: 0.85, gameMult: 0.9, termBonus: 0 },
  city: { score: 2, fame: 1, trust: 5, honor: 1, signingMult: 1.0, dailyMult: 0.95, gameMult: 0.95, termBonus: 4 }
};
const ENDORSEMENT_CATEGORY_DEFS = [
  ['gear', '运动装备类', [
    { brand: '迅步', product: '签名鞋', tier: 1, kind: 'shoe', shoeEligible: true, shoeStyle: 'speed' },
    { brand: '铁卫', product: '训练护具', tier: 2, kind: 'gear' },
    { brand: '脉冲', product: '运动手表', tier: 3, kind: 'wearable' },
    { brand: '极光', product: '联名球衣', tier: 4, kind: 'apparel' },
    { brand: '冠军轨迹', product: '顶级签名鞋', tier: 5, kind: 'shoe', shoeEligible: true, shoeStyle: 'scoring' }
  ]],
  ['food', '饮料和食品类', [
    { brand: '能量泉', product: '运动饮料', tier: 1, kind: 'drink' },
    { brand: '冰极', product: '矿泉水', tier: 1, kind: 'drink' },
    { brand: '锋味', product: '蛋白棒', tier: 2, kind: 'food' },
    { brand: '燃点', product: '功能饮料', tier: 3, kind: 'drink' },
    { brand: '冠军补给', product: '轻食联名', tier: 4, kind: 'food' }
  ]],
  ['tech', '科技电子类', [
    { brand: '雷音', product: '运动耳机', tier: 1, kind: 'tech' },
    { brand: '智翼', product: '旗舰手机', tier: 2, kind: 'tech' },
    { brand: '星核', product: '游戏设备', tier: 3, kind: 'tech' },
    { brand: '闪步', product: '智能穿戴', tier: 4, kind: 'tech' },
    { brand: '镜界', product: '影像相机', tier: 5, kind: 'tech' }
  ]],
  ['auto', '汽车类', [
    { brand: '轮动', product: '高性能轮胎', tier: 1, kind: 'auto' },
    { brand: '远航', product: '出行平台', tier: 2, kind: 'auto' },
    { brand: '星驰', product: '新能源轿跑', tier: 3, kind: 'auto' },
    { brand: '纵横', product: '豪华SUV', tier: 4, kind: 'auto' },
    { brand: '极境', product: '性能轿跑', tier: 5, kind: 'auto' }
  ]],
  ['finance', '金融与商业服务类', [
    { brand: '快付', product: '数字钱包', tier: 1, kind: 'finance' },
    { brand: '竞篮', product: '联名信用卡', tier: 2, kind: 'finance' },
    { brand: '守护', product: '保险计划', tier: 3, kind: 'finance' },
    { brand: '稳盈', product: '投资平台', tier: 4, kind: 'finance' },
    { brand: '速联', product: '电商通讯服务', tier: 5, kind: 'finance' }
  ]],
  ['fashion', '时尚与生活方式类', [
    { brand: '霓裳', product: '潮牌联名', tier: 1, kind: 'fashion' },
    { brand: '轻奢行囊', product: '箱包', tier: 2, kind: 'fashion' },
    { brand: '银曜', product: '腕表', tier: 3, kind: 'fashion' },
    { brand: '星棱', product: '珠宝', tier: 4, kind: 'fashion' },
    { brand: '夜幕', product: '香氛', tier: 5, kind: 'fashion' }
  ]],
  ['beauty', '美妆与个人护理类', [
    { brand: '清野', product: '男士护肤', tier: 1, kind: 'beauty' },
    { brand: '速净', product: '洗护', tier: 2, kind: 'beauty' },
    { brand: '锋芒', product: '剃须', tier: 3, kind: 'beauty' },
    { brand: '活力', product: '口腔护理', tier: 4, kind: 'beauty' },
    { brand: '温和', product: '身体护理', tier: 5, kind: 'beauty' }
  ]],
  ['game', '游戏与娱乐类', [
    { brand: '篮火', product: '手游', tier: 1, kind: 'game' },
    { brand: '主机战线', product: '主机游戏', tier: 2, kind: 'game' },
    { brand: '赛场对决', product: '体育游戏联名', tier: 3, kind: 'game' },
    { brand: '全明星直播', product: '直播平台', tier: 4, kind: 'game' },
    { brand: '星途', product: '综艺合作', tier: 5, kind: 'game' }
  ]],
  ['public', '公益与社会形象类', [
    { brand: '青篮计划', product: '青少年篮球公益', tier: 1, kind: 'public' },
    { brand: '反毒行动', product: '社会倡导', tier: 2, kind: 'public' },
    { brand: '助学灯塔', product: '教育助学', tier: 3, kind: 'public' },
    { brand: '城市球场修复', product: '社区项目', tier: 4, kind: 'public' },
    { brand: '少年成长营', product: '长期公益大使', tier: 5, kind: 'public' }
  ]],
  ['city', '地方文旅与城市推广类', [
    { brand: '西部旅线', product: '文旅线路', tier: 1, kind: 'city' },
    { brand: '海港之城', product: '旅游城市推广', tier: 2, kind: 'city' },
    { brand: '地方好物', product: '城市品牌', tier: 3, kind: 'city' },
    { brand: '赛事之都', product: '国际赛事宣传', tier: 4, kind: 'city' },
    { brand: '城市节拍', product: '年度文旅大使', tier: 5, kind: 'city' }
  ]]
];
function getEndorsementTierRule(tier) {
  return ENDORSEMENT_TIER_RULES[clamp(parseNum(tier, 1), 1, 5)] || ENDORSEMENT_TIER_RULES[1];
}
function getEndorsementCategoryMod(categoryKey) {
  return ENDORSEMENT_CATEGORY_MODIFIERS[categoryKey] || ENDORSEMENT_CATEGORY_MODIFIERS.gear;
}
function makeEndorsementTemplate(categoryKey, categoryName, raw, index) {
  const template = {
    id: String(raw.id || `${categoryKey}_${index + 1}`),
    categoryKey,
    category: categoryName,
    brand: String(raw.brand || `品牌${index + 1}`),
    product: String(raw.product || '合作'),
    tier: clamp(parseNum(raw.tier, 1), 1, 5),
    kind: String(raw.kind || categoryKey),
    shoeEligible: !!raw.shoeEligible,
    shoeStyle: String(raw.shoeStyle || 'allaround'),
    note: String(raw.note || '')
  };
  template.logo = buildCommercialBrandLogo(template);
  template.exclusiveSlot = ENDORSEMENT_SINGLE_SLOT_CATEGORIES.has(String(categoryKey || '').toLowerCase()) ? categoryKey : '';
  template.image = buildEndorsementImage(template);
  return template;
}
function buildEndorsementCatalog() {
  return ENDORSEMENT_CATEGORY_DEFS.flatMap(([categoryKey, categoryName, items]) =>
    items.map((item, index) => makeEndorsementTemplate(categoryKey, categoryName, item, index))
  );
}
const ENDORSEMENT_CATALOG = buildEndorsementCatalog();
function defaultUserHonorCounter() {
  return {
    rings: 0,
    mvp: 0,
    fmvp: 0,
    dpoy: 0,
    roy: 0,
    allStar: 0,
    allStarMvp: 0,
    allNba1: 0,
    allNba2: 0,
    allNba3: 0,
    allDefensive: 0,
    scoring: 0,
    rebound: 0,
    assist: 0,
    block: 0,
    steal: 0
  };
}
function normalizeUserHonorCounter(raw = null) {
  const out = defaultUserHonorCounter();
  if (!raw || typeof raw !== 'object') return out;
  Object.keys(out).forEach(key => {
    out[key] = Math.max(0, Math.floor(parseNum(raw[key], 0)));
  });
  return out;
}
function getMutableUserHonorCounter() {
  G._userHonorCounter = normalizeUserHonorCounter(G._userHonorCounter || null);
  return G._userHonorCounter;
}
function normalizeHonorLabelForArchive(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  const lower = value.toLowerCase();
  if (/全明星mvp|all[-\s]?star mvp/.test(lower)) return '全明星MVP';
  if (/fmvp|总决赛mvp|finals mvp/.test(lower) || /总决赛mvp/.test(value)) return 'FMVP';
  if (/总冠军|nba冠军|冠军|champion|title/.test(lower)) return '总冠军';
  if (/\bmvp\b/.test(lower) || value === 'MVP' || /最有价值球员/.test(value)) return 'MVP';
  if (/dpoy|最佳防守球员|defensive player of the year/.test(lower)) return 'DPOY';
  if (/roy|最佳新秀|rookie of the year/.test(lower)) return 'ROY';
  if (/一阵|一队|all[-\s]?nba[\s-]*1|first team all nba/.test(lower)) return '一阵';
  if (/二阵|二队|all[-\s]?nba[\s-]*2|second team all nba/.test(lower)) return '二阵';
  if (/三阵|三队|all[-\s]?nba[\s-]*3|third team all nba/.test(lower)) return '三阵';
  if (/一防|最佳防守阵容|all[-\s]?defensive|all defense|defensive team/.test(lower)) return '一防';
  if (/得分王|scoring champion/.test(lower)) return '得分王';
  if (/篮板王|rebound champion/.test(lower)) return '篮板王';
  if (/助攻王|assist champion/.test(lower)) return '助攻王';
  if (/盖帽王|block champion/.test(lower)) return '盖帽王';
  if (/抢断王|steal champion/.test(lower)) return '抢断王';
  if (/全明星|all[-\s]?star/.test(lower)) return '全明星';
  return value;
}
function addHonorTextToCounter(text, counter = null) {
  const target = counter || getMutableUserHonorCounter();
  const value = String(text || '').trim();
  if (!value) return target;
  const label = normalizeHonorLabelForArchive(value);
  if (label === '总冠军') target.rings += 1;
  else if (label === 'FMVP') target.fmvp += 1;
  else if (label === 'MVP') target.mvp += 1;
  else if (label === 'DPOY') target.dpoy += 1;
  else if (label === 'ROY') target.roy += 1;
  else if (label === '一阵') target.allNba1 += 1;
  else if (label === '二阵') target.allNba2 += 1;
  else if (label === '三阵') target.allNba3 += 1;
  else if (label === '一防') target.allDefensive += 1;
  else if (label === '得分王') target.scoring += 1;
  else if (label === '篮板王') target.rebound += 1;
  else if (label === '助攻王') target.assist += 1;
  else if (label === '盖帽王') target.block += 1;
  else if (label === '抢断王') target.steal += 1;
  else if (label === '全明星MVP') { target.allStarMvp += 1; target.allStar += 1; }
  else if (label === '全明星') target.allStar += 1;
  return target;
}
function pushUniqueHonorLabel(list, label) {
  const normalized = normalizeHonorLabelForArchive(label);
  if (!normalized) return;
  if (!list.includes(normalized)) list.push(normalized);
}
function addHonorLabelsToCounter(labels = [], counter = defaultUserHonorCounter()) {
  const normalized = [];
  (Array.isArray(labels) ? labels : [labels]).forEach(label => pushUniqueHonorLabel(normalized, label));
  const hasAllStarMvp = normalized.includes('全明星MVP');
  normalized.forEach(label => {
    if (label === '全明星' && hasAllStarMvp) return;
    addHonorTextToCounter(label, counter);
  });
  return counter;
}
function normalizeHistoricalHonorSeasons(seasons = []) {
  return (Array.isArray(seasons) ? seasons : [])
    .map(item => {
      const awards = [];
      (Array.isArray(item?.awards) ? item.awards : []).forEach(label => pushUniqueHonorLabel(awards, label));
      const champion = !!item?.champion || awards.includes('总冠军');
      if (champion) pushUniqueHonorLabel(awards, '总冠军');
      return {
        season: parseNum(item?.season, 0),
        year: parseNum(item?.year, 0),
        team: parseNum(item?.team, 0),
        teamName: String(item?.teamName || '').trim(),
        wins: parseNum(item?.wins, 0),
        losses: parseNum(item?.losses, 0),
        champion,
        awards,
        stats: item?.stats && typeof item.stats === 'object' ? { ...item.stats } : null
      };
    })
    .filter(item => item.season || item.year || item.awards.length || item.champion)
    .sort((a, b) => parseNum(a.season, 0) - parseNum(b.season, 0));
}
function buildUserHonorArchiveFromGame() {
  const bySeason = new Map();
  const ensureSeason = (seasonRaw, yearRaw, base = {}) => {
    const season = parseNum(seasonRaw, G.season || 0);
    const year = parseNum(yearRaw, G.year || 0);
    const key = `${season || 'current'}-${year || ''}`;
    if (!bySeason.has(key)) {
      bySeason.set(key, {
        season,
        year,
        team: parseNum(base.team ?? G.teamId, 0),
        teamName: String(base.teamName || teamNameFallback(parseNum(base.team ?? G.teamId, 0)) || '').trim(),
        wins: parseNum(base.wins, 0),
        losses: parseNum(base.losses, 0),
        champion: !!base.champion,
        awards: [],
        stats: base.stats || null
      });
    }
    const target = bySeason.get(key);
    if (base.team !== undefined) target.team = parseNum(base.team, target.team);
    if (base.teamName) target.teamName = String(base.teamName);
    if (base.wins !== undefined) target.wins = parseNum(base.wins, target.wins);
    if (base.losses !== undefined) target.losses = parseNum(base.losses, target.losses);
    if (base.stats) target.stats = { ...base.stats };
    if (base.champion) target.champion = true;
    return target;
  };

  (Array.isArray(G.careerStats) ? G.careerStats : []).forEach(cs => {
    ensureSeason(cs.season, cs.year, {
      team: cs.team,
      teamName: teamNameFallback(parseNum(cs.team, 0)),
      wins: cs.wins,
      losses: cs.losses,
      stats: {
        ppg: parseNum(cs.ppg, 0),
        rpg: parseNum(cs.rpg, 0),
        apg: parseNum(cs.apg, 0),
        spg: parseNum(cs.spg, 0),
        bpg: parseNum(cs.bpg, 0)
      }
    });
  });

  (Array.isArray(G.allAwards) ? G.allAwards : []).forEach(item => {
    const season = ensureSeason(item?.season, item?.year, {
      team: item?.team,
      teamName: teamNameFallback(parseNum(item?.team, 0)),
      wins: item?.wins,
      losses: item?.losses,
      champion: item?.champion,
      stats: item?.stats || null
    });
    if (season.champion) pushUniqueHonorLabel(season.awards, '总冠军');
    (Array.isArray(item?.awards) ? item.awards : []).forEach(label => pushUniqueHonorLabel(season.awards, label));
  });

  (Array.isArray(G.leagueAwards) ? G.leagueAwards : []).forEach(item => {
    const season = ensureSeason(item?.season, item?.year, {});
    buildUserAwardsFromLeague(item).forEach(label => pushUniqueHonorLabel(season.awards, label));
  });

  (Array.isArray(G.awards) ? G.awards : []).forEach(item => {
    const season = ensureSeason(item?.season, item?.year, {});
    if (item?.type === 'ring') season.champion = true;
    if (item?.type === 'allStar') pushUniqueHonorLabel(season.awards, '全明星');
    if (item?.type === 'fmvp') pushUniqueHonorLabel(season.awards, 'FMVP');
    if (season.champion) pushUniqueHonorLabel(season.awards, '总冠军');
    ['text', 'title', 'label', 'name'].forEach(key => {
      if (typeof item?.[key] === 'string') pushUniqueHonorLabel(season.awards, item[key]);
    });
  });

  const seasons = normalizeHistoricalHonorSeasons(Array.from(bySeason.values()))
    .filter(item => item.champion || item.awards.length);
  const counter = defaultUserHonorCounter();
  seasons.forEach(item => addHonorLabelsToCounter(item.awards, counter));
  return {
    seasons,
    counter,
    summary: buildPlayerHonorsSummary(counter)
  };
}
function collectUserHonorCounterFromHistory() {
  const archive = buildUserHonorArchiveFromGame();
  if (archive.seasons.length || Object.values(archive.counter).some(v => parseNum(v, 0) > 0)) {
    return archive.counter;
  }
  const counter = defaultUserHonorCounter();
  const history = Array.isArray(G.allAwards) && G.allAwards.length
    ? G.allAwards
    : (Array.isArray(G.awards) ? G.awards : []);
  const stack = Array.isArray(history) ? [...history] : [history];
  while (stack.length) {
    const item = stack.shift();
    if (!item) continue;
    if (Array.isArray(item)) {
      stack.push(...item);
      continue;
    }
    if (typeof item === 'object') {
      if (item.champion) counter.rings += 1;
      if (Array.isArray(item.awards)) stack.push(...item.awards);
      else if (typeof item.awards === 'string') stack.push(item.awards);
      if (typeof item.title === 'string') addHonorTextToCounter(item.title, counter);
      if (typeof item.label === 'string') addHonorTextToCounter(item.label, counter);
      if (typeof item.name === 'string' && /mvp|dpoy|all[-\s]?nba|冠军|得分王|篮板王|助攻王|盖帽王|抢断王/i.test(item.name)) {
        addHonorTextToCounter(item.name, counter);
      }
      continue;
    }
    addHonorTextToCounter(item, counter);
  }
  return counter;
}
function buildPlayerHonorsSummary(honors = null) {
  const c = normalizeUserHonorCounter(honors || collectUserHonorCounterFromHistory());
  const labels = [
    ['rings', '总冠军'],
    ['mvp', 'MVP'],
    ['fmvp', 'FMVP'],
    ['dpoy', 'DPOY'],
    ['roy', 'ROY'],
    ['allStar', '全明星'],
    ['allStarMvp', '全明星MVP'],
    ['allNba1', '一阵'],
    ['allNba2', '二阵'],
    ['allNba3', '三阵'],
    ['allDefensive', '一防'],
    ['scoring', '得分王'],
    ['rebound', '篮板王'],
    ['assist', '助攻王'],
    ['block', '盖帽王'],
    ['steal', '抢断王']
  ];
  const parts = labels
    .filter(([key]) => parseNum(c[key], 0) > 0)
    .map(([key, label]) => `${label} x${parseNum(c[key], 0)}`);
  return parts.length ? parts.join(' / ') : '暂无荣誉';
}
function getPlayerEndorsementHonorScore(honors = null) {
  const c = normalizeUserHonorCounter(honors || (typeof collectUserHonorCounterFromHistory === 'function' ? collectUserHonorCounterFromHistory() : defaultUserHonorCounter()));
  return (
    parseNum(c.rings, 0) * 15 +
    parseNum(c.mvp, 0) * 20 +
    parseNum(c.fmvp, 0) * 14 +
    parseNum(c.dpoy, 0) * 10 +
    parseNum(c.roy, 0) * 5 +
    parseNum(c.allStar, 0) * 3 +
    parseNum(c.allStarMvp, 0) * 6 +
    parseNum(c.allNba1, 0) * 9 +
    parseNum(c.allNba2, 0) * 7 +
    parseNum(c.allNba3, 0) * 5 +
    parseNum(c.allDefensive, 0) * 4 +
    parseNum(c.scoring, 0) * 5 +
    parseNum(c.rebound, 0) * 4 +
    parseNum(c.assist, 0) * 4 +
    parseNum(c.block, 0) * 4 +
    parseNum(c.steal, 0) * 4
  );
}
function getEndorsementMarketLabel(score) {
  const s = parseNum(score, 0);
  if (s >= 110) return '门面级';
  if (s >= 95) return '超级巨星';
  if (s >= 78) return '全明星级';
  if (s >= 60) return '明星级';
  if (s >= 45) return '联盟关注';
  if (s >= 30) return '本地热度';
  return '新秀观察';
}
function buildEndorsementProfile() {
  const ecoFx = getEconomyEffects();
  const identity = buildCommercialIdentityProfile();
  const fame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const trust = clamp(parseNum(G.player.trust, 50), 0, 100);
  const overall = typeof ovr === 'function' ? ovr(G.player.attrs || {}) : parseNum(G.player.tradeValue, 50);
  const gp = Math.max(parseNum(G.seasonStats?.gp, 0), 1);
  const ppg = parseNum(G.seasonStats?.pts, 0) / gp;
  const apg = parseNum(G.seasonStats?.ast, 0) / gp;
  const rpg = parseNum(G.seasonStats?.reb, 0) / gp;
  const teamRecord = G.leagueSeason?.teamRecords?.[G.teamId] || {};
  const teamGp = Math.max(parseNum(teamRecord.w, 0) + parseNum(teamRecord.l, 0), 1);
  const winPct = parseNum(teamRecord.w, 0) / teamGp;
  const honorCounts = typeof collectUserHonorCounterFromHistory === 'function' ? collectUserHonorCounterFromHistory() : defaultUserHonorCounter();
  const honorScore = getPlayerEndorsementHonorScore(honorCounts);
  const statsScore = clamp(
    overall * 0.22 +
    ppg * 0.8 +
    apg * 0.55 +
    rpg * 0.45 +
    winPct * 20,
    0,
    70
  );
  const identityBonus = identity.visibilityMomentum * 0.18 + identity.facilityScore * 1.15 + Math.max(0, identity.totalSpent - 5) * 0.18;
  const marketScore = clamp(statsScore + fame * 0.55 + trust * 0.25 + honorScore * 0.85 + parseNum(ecoFx.endorsementScoreBonus, 0) + identityBonus, 0, 155);
  return {
    playerName: String(G.player.name || '球员'),
    teamName: String(G.team?.z || ''),
    seasonYear: parseNum(G.season, 1),
    year: parseNum(G.year, 2025),
    fame,
    trust,
    overall,
    ppg: +ppg.toFixed(1),
    apg: +apg.toFixed(1),
    rpg: +rpg.toFixed(1),
    winPct: +winPct.toFixed(3),
    honorCounts,
    honorText: buildPlayerHonorsSummary(),
    honorScore,
    statsScore: +statsScore.toFixed(1),
    marketScore: +marketScore.toFixed(1),
    marketLabel: getEndorsementMarketLabel(marketScore),
    activeCount: Array.isArray(G.economy?.endorsements?.active) ? G.economy.endorsements.active.length : 0,
    maxActiveDeals: parseNum(ecoFx.activeDealCap, 8),
    fameTier: parseNum(ecoFx.fameTier, 0),
    fameTierLabel: String(ecoFx.fameTierLabel || '新秀观察'),
    commercialIdentity: String(ecoFx.commercialIdentity || identity.identityLabel || '上升新贵'),
    visibilityMomentum: parseNum(ecoFx.visibilityMomentum, 0),
    specialEventChance: parseNum(ecoFx.specialEventChance, 0),
    endorsementOfferMult: parseNum(ecoFx.endorsementOfferMult, 1),
    endorsementIncomeMult: parseNum(ecoFx.endorsementIncomeMult, 1),
    socialHeatMult: parseNum(ecoFx.socialHeatMult, 1),
    perkList: Array.isArray(ecoFx.perkList) ? [...ecoFx.perkList] : []
  };
}
function getEndorsementState() {
  ensureEconomyState();
  return G.economy.endorsements;
}
function evaluateEndorsementOffer(template, profile, state = null) {
  const tierRule = getEndorsementTierRule(template.tier);
  const categoryMod = getEndorsementCategoryMod(template.categoryKey);
  const minScore = Math.max(0, tierRule.marketScore + parseNum(categoryMod.score, 0));
  const minFame = Math.max(0, tierRule.fame + parseNum(categoryMod.fame, 0));
  const minTrust = Math.max(0, tierRule.trust + parseNum(categoryMod.trust, 0));
  const minHonor = Math.max(0, tierRule.honor + parseNum(categoryMod.honor, 0));
  const scale = clamp((0.8 + parseNum(profile?.marketScore, 0) / 160) * parseNum(profile?.endorsementOfferMult, 1), 0.85, 3.0);
  const activeState = state || getEndorsementState();
  const active = (activeState.active || []).find(x => String(x.id) === String(template.id)) || null;
  const rejectedSeason = parseNum(activeState.rejected?.[template.id], -1);
  const eligible = profile.marketScore >= minScore && profile.fame >= minFame && profile.trust >= minTrust && profile.honorScore >= minHonor;
  const lockReason = eligible ? '' : [
    profile.marketScore < minScore ? `市场分 ${minScore}` : '',
    profile.fame < minFame ? `声望 ${minFame}` : '',
    profile.trust < minTrust ? `信任 ${minTrust}` : '',
    profile.honorScore < minHonor ? `荣誉分 ${minHonor}` : ''
  ].filter(Boolean).join(' / ');
  const signingBonus = +(tierRule.signing * parseNum(categoryMod.signingMult, 1) * scale).toFixed(2);
  const dailyIncome = +(tierRule.daily * parseNum(categoryMod.dailyMult, 1) * scale).toFixed(3);
  const gameIncome = +(tierRule.game * parseNum(categoryMod.gameMult, 1) * scale).toFixed(3);
  const termDays = Math.max(30, Math.round((tierRule.termDays + parseNum(categoryMod.termBonus, 0)) * (0.9 + scale * 0.15)));
  const status = active ? 'active' : (rejectedSeason === parseNum(G.season, 1) ? 'rejected' : (eligible ? 'available' : 'locked'));
  return {
    ...template,
    status,
    eligible,
    active,
    lockReason,
    signingBonus,
    dailyIncome,
    gameIncome,
    termDays,
    marketScore: minScore,
    minFame,
    minTrust,
    minHonor,
    categoryLabel: template.category,
    scale: +scale.toFixed(2),
    activeCap: parseNum(profile?.maxActiveDeals, 8)
  };
}
function buildEndorsementOffersView() {
  const profile = buildEndorsementProfile();
  const state = getEndorsementState();
  const liveIncomeMult = clamp(parseNum(profile?.endorsementIncomeMult, 1), 1, 1.5);
  const categories = [];
  const seen = new Map();
  ENDORSEMENT_CATALOG.forEach(template => {
    const offer = evaluateEndorsementOffer(template, profile, state);
    if (!seen.has(template.categoryKey)) {
      seen.set(template.categoryKey, { key: template.categoryKey, name: template.category, items: [] });
      categories.push(seen.get(template.categoryKey));
    }
    seen.get(template.categoryKey).items.push(offer);
  });
  const activeDeals = (state.active || []).map(deal => ({
    ...deal,
    logo: buildCommercialBrandLogo({
      brand: deal?.brand,
      product: deal?.product,
      categoryKey: deal?.categoryKey,
      category: deal?.category,
      kind: deal?.kind
    }),
    totalIncome: +((parseNum(deal.baseDailyIncome, 0) + parseNum(deal.baseGameIncome, 0) + parseNum(deal.shoe?.dailyIncome, 0) + parseNum(deal.shoe?.gameIncome, 0)) * liveIncomeMult).toFixed(3),
    remainingDays: parseNum(deal.remainingDays, 0)
  }));
  const totals = activeDeals.reduce((acc, deal) => {
    acc.daily += (parseNum(deal.baseDailyIncome, 0) + parseNum(deal.shoe?.dailyIncome, 0)) * liveIncomeMult;
    acc.game += (parseNum(deal.baseGameIncome, 0) + parseNum(deal.shoe?.gameIncome, 0)) * liveIncomeMult;
    return acc;
  }, { daily: 0, game: 0 });
  const summary = {
    catalogCount: ENDORSEMENT_CATALOG.length,
    activeCount: activeDeals.length,
    availableCount: categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'available').length, 0),
    lockedCount: categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'locked').length, 0),
    rejectedCount: categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'rejected').length, 0),
    marketScore: profile.marketScore,
    marketLabel: profile.marketLabel,
    fameTierLabel: profile.fameTierLabel,
    commercialIdentity: profile.commercialIdentity,
    visibilityMomentum: profile.visibilityMomentum,
    specialEventChance: profile.specialEventChance,
    maxActiveDeals: profile.maxActiveDeals,
    socialHeatMult: profile.socialHeatMult,
    perkList: profile.perkList,
    fame: profile.fame,
    trust: profile.trust,
    honorText: profile.honorText,
    honorScore: profile.honorScore,
    overall: profile.overall,
    ppg: profile.ppg,
    apg: profile.apg,
    rpg: profile.rpg,
    totalDailyIncome: +totals.daily.toFixed(3),
    totalGameIncome: +totals.game.toFixed(3),
    signatureShoe: state.signatureShoe || activeDeals.find(deal => deal && deal.shoe) || null
  };
  return { profile, summary, categories, activeDeals };
}
function applyEndorsementAttrBoosts(boosts, direction = 1) {
  if (!G.player?.attrs || !boosts) return;
  Object.entries(boosts).forEach(([k, v]) => {
    if (!Object.prototype.hasOwnProperty.call(G.player.attrs, k)) return;
    G.player.attrs[k] = clamp(parseNum(G.player.attrs[k], 0) + parseNum(v, 0) * direction, 25, 99);
  });
}

// ============ PLAYOFF SYSTEM ============

function defaultPlayoffState() {
  return { active: false, round: 0, eliminated: false, champion: false, bracket: [], series: { opp: 0, mySeed: 0, oppSeed: 0, myWins: 0, oppWins: 0, games: [] } };
}

function startPlayoffs() {
  const records = getLeagueTeamRecordsArray();
  const userTeamId = parseNum(G.teamId, 0);
  const east = records.filter(r => r.c === 'East').sort((a, b) => b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa));
  const west = records.filter(r => r.c === 'West').sort((a, b) => b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa));
  const east8 = east.slice(0, 8);
  const west8 = west.slice(0, 8);
  const userConf = (TEAMS.find(t => t.id === userTeamId) || {}).c || 'East';
  const userTop8 = userConf === 'East' ? east8 : west8;
  const userInPlayoffs = userTop8.some(t => t.id === userTeamId);

  // Build bracket: round 1 pairings (1v8, 2v7, 3v6, 4v5)
  const bracket = [];
  const pairings = [[0,7],[1,6],[2,5],[3,4]];
  // Round 1 — East
  pairings.forEach(([hi, lo]) => {
    bracket.push({ round: 1, conf: 'East', higherSeed: east8[hi]?.id, lowerSeed: east8[lo]?.id, higherWins: 0, lowerWins: 0, games: [], winner: null });
  });
  // Round 1 — West
  pairings.forEach(([hi, lo]) => {
    bracket.push({ round: 1, conf: 'West', higherSeed: west8[hi]?.id, lowerSeed: west8[lo]?.id, higherWins: 0, lowerWins: 0, games: [], winner: null });
  });
  // Round 2 — placeholders (filled after round 1)
  bracket.push({ round: 2, conf: 'East', higherSeed: 0, lowerSeed: 0, higherWins: 0, lowerWins: 0, games: [], winner: null });
  bracket.push({ round: 2, conf: 'East', higherSeed: 0, lowerSeed: 0, higherWins: 0, lowerWins: 0, games: [], winner: null });
  bracket.push({ round: 2, conf: 'West', higherSeed: 0, lowerSeed: 0, higherWins: 0, lowerWins: 0, games: [], winner: null });
  bracket.push({ round: 2, conf: 'West', higherSeed: 0, lowerSeed: 0, higherWins: 0, lowerWins: 0, games: [], winner: null });
  // Conference Finals
  bracket.push({ round: 3, conf: 'East', higherSeed: 0, lowerSeed: 0, higherWins: 0, lowerWins: 0, games: [], winner: null });
  bracket.push({ round: 3, conf: 'West', higherSeed: 0, lowerSeed: 0, higherWins: 0, lowerWins: 0, games: [], winner: null });
  // Finals
  bracket.push({ round: 4, conf: 'Finals', higherSeed: 0, lowerSeed: 0, higherWins: 0, lowerWins: 0, games: [], winner: null });

  G.playoffs = {
    active: userInPlayoffs,
    round: userInPlayoffs ? 1 : 0,
    eliminated: !userInPlayoffs,
    champion: false,
    bracket,
    series: { opp: 0, mySeed: 0, oppSeed: 0, myWins: 0, oppWins: 0, games: [] }
  };

  if (userInPlayoffs) {
    // Find user's first round opponent
    const userSeed = userTop8.findIndex(t => t.id === userTeamId) + 1;
    const oppSeed = 9 - userSeed;
    const oppTeamId = userTop8[oppSeed - 1]?.id || 0;
    const myTeamIsHigher = userSeed <= 4;
    G.playoffs.series = {
      opp: oppTeamId,
      mySeed: userSeed,
      oppSeed: oppSeed,
      myWins: 0,
      oppWins: 0,
      games: [],
      myTeamIsHigher
    };
    addNews(`🏆 季后赛开始！你所在的${userConf === 'East' ? '东部' : '西部'}第${userSeed}种子，对阵第${oppSeed}种子${teamNameFallback(oppTeamId)}`, 'pos');
    return true;
  } else {
    addNews(`😔 你的球队未进入季后赛。本赛季结束。`, 'neg');
    return false;
  }
}

function playPlayoffGame() {
  const s = G.playoffs.series;
  const userTeamId = parseNum(G.teamId, 0);
  const oppTeamId = parseNum(s.opp, 0);
  if (!oppTeamId) return null;

  const gameNum = s.myWins + s.oppWins + 1;
  // Higher seed gets home court in games 1,2,5,7
  const userHome = s.myTeamIsHigher ? [1,2,5,7].includes(gameNum) : ![1,2,5,7].includes(gameNum);
  const homeId = userHome ? userTeamId : oppTeamId;
  const awayId = userHome ? oppTeamId : userTeamId;

  const detail = simulateLeagueMatchup(homeId, awayId, {
    season: G.season, year: G.year, phase: 'playoffs', roundIndex: 90 + G.playoffs.round, userTeamId
  });
  if (!detail) return null;

  const userScore = userHome ? detail.homeScore : detail.awayScore;
  const oppScore = userHome ? detail.awayScore : detail.homeScore;
  const userRows = userHome ? detail.homeRows : detail.awayRows;
  const selfRow = (userRows || []).find(r => r.isSelf && !r.status) || null;
  const st = selfRow ? {
    mins: parseNum(selfRow.mins, 0), pts: parseNum(selfRow.pts, 0), reb: parseNum(selfRow.reb, 0),
    ast: parseNum(selfRow.ast, 0), stl: parseNum(selfRow.stl, 0), blk: parseNum(selfRow.blk, 0),
    pf: parseNum(selfRow.pf, 0), tov: parseNum(selfRow.tov, 0), fgm: parseNum(selfRow.fgm, 0),
    fga: parseNum(selfRow.fga, 0), tpm: parseNum(selfRow.tpm, 0), tpa: parseNum(selfRow.tpa, 0),
    ftm: parseNum(selfRow.ftm, 0), fta: parseNum(selfRow.fta, 0)
  } : { mins: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, pf: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };

  const win = userScore > oppScore;
  if (win) s.myWins++; else s.oppWins++;
  s.games.push({ gameNum, home: userHome, win, teamPts: userScore, oppPts: oppScore });

  // Also simulate other active playoff series in this round
  simulateOtherPlayoffSeries();

  const gradeScore = calcGradeScore(st);
  const grade = gradeLetterFromScore(gradeScore);
  const played = parseNum(st.mins, 0) > 0;
  if (played) {
    const matchXp = 15 + gradeXpBonus(grade) + (win ? 5 : 0);
    addPlayerXP(matchXp);
  }

  // Stamina loss
  const staminaLoss = win ? 3 : 4;
  G.player.stamina = clamp(parseNum(G.player.stamina, 100) - staminaLoss, 0, 100);

  return { win, st, grade, gradeScore, opp: oppTeamId, myWins: s.myWins, oppWins: s.oppWins, flow: detail.flow };
}

function simulateOtherPlayoffSeries() {
  const currentRound = G.playoffs.round;
  const userTeamId = parseNum(G.teamId, 0);
  const bracket = G.playoffs.bracket;
  if (!Array.isArray(bracket)) return;

  bracket.forEach(series => {
    if (series.round !== currentRound) return;
    if (series.winner) return;
    const hi = parseNum(series.higherSeed, 0);
    const lo = parseNum(series.lowerSeed, 0);
    if (!hi || !lo) return;
    // Skip user's series
    if (hi === userTeamId || lo === userTeamId) return;
    // Simulate one game per call
    const gameNum = series.higherWins + series.lowerWins + 1;
    const detail = simulateLeagueMatchup(hi, lo, { season: G.season, year: G.year, phase: 'playoffs', roundIndex: 90 + currentRound });
    if (!detail) return;
    if (detail.homeScore >= detail.awayScore) series.higherWins++;
    else series.lowerWins++;
    series.games.push({ gameNum, homeScore: detail.homeScore, awayScore: detail.awayScore });
    // Check if this series ended
    if (series.higherWins >= 4) series.winner = hi;
    else if (series.lowerWins >= 4) series.winner = lo;
  });
}

function checkSeriesEnd() {
  const s = G.playoffs.series;
  const userTeamId = parseNum(G.teamId, 0);

  // Check user's series
  if (s.myWins >= 4) {
    // User won the series — advance
    const currentRound = G.playoffs.round;
    // Mark user as winner in bracket
    const userSeries = G.playoffs.bracket.find(ser =>
      ser.round === currentRound && !ser.winner &&
      (parseNum(ser.higherSeed, 0) === userTeamId || parseNum(ser.lowerSeed, 0) === userTeamId)
    );
    if (userSeries) userSeries.winner = userTeamId;

    if (currentRound >= 4) {
      // Finals winner = champion!
      G.playoffs.champion = true;
      G.playoffs.active = false;
      // Add ring to honors
      if (typeof addHonorTextToCounter === 'function') addHonorTextToCounter('总冠军');
      G.awards.push({ season: G.season, year: G.year, text: '总冠军', type: 'ring' });
      addNews(`🏆 总冠军！你赢得了${G.year}年NBA总冠军！`, 'pos');
      // Finals MVP
      if (typeof addHonorTextToCounter === 'function') addHonorTextToCounter('FMVP');
      G.awards.push({ season: G.season, year: G.year, text: 'FMVP', type: 'fmvp' });
      return 'champion';
    }

    // Advance to next round
    G.playoffs.round = currentRound + 1;
    // Complete other series that haven't finished yet (force-simulate remaining games)
    forceCompleteOtherSeries(currentRound);

    // Find next opponent from bracket
    const nextOpponent = findNextPlayoffOpponent(currentRound + 1, userTeamId);
    if (nextOpponent) {
      const userConf = (TEAMS.find(t => t.id === userTeamId) || {}).c || 'East';
      s.opp = nextOpponent;
      s.myWins = 0;
      s.oppWins = 0;
      s.games = [];
      const roundNames = ['', '首轮', '次轮', '分区决赛', '总决赛'];
      addNews(`🏆 季后赛${roundNames[currentRound + 1]}！对阵${teamNameFallback(nextOpponent)}`, 'pos');
    }
    return 'advance';
  }

  if (s.oppWins >= 4) {
    // User eliminated
    G.playoffs.eliminated = true;
    G.playoffs.active = false;
    addNews(`😔 季后赛淘汰。你的赛季结束了。`, 'neg');
    return 'eliminated';
  }

  return 'continue';
}

function forceCompleteOtherSeries(round) {
  const userTeamId = parseNum(G.teamId, 0);
  G.playoffs.bracket.forEach(series => {
    if (series.round !== round || series.winner) return;
    if (parseNum(series.higherSeed, 0) === userTeamId || parseNum(series.lowerSeed, 0) === userTeamId) return;
    // Quick-sim remaining games
    while (series.higherWins < 4 && series.lowerWins < 4) {
      const hiStr = getTeamStrength(parseNum(series.higherSeed, 0));
      const loStr = getTeamStrength(parseNum(series.lowerSeed, 0));
      const hiWinProb = 0.5 + (hiStr - loStr) / 100;
      if (Math.random() < hiWinProb) series.higherWins++;
      else series.lowerWins++;
    }
    series.winner = series.higherWins >= 4 ? series.higherSeed : series.lowerSeed;
  });
}

function findNextPlayoffOpponent(nextRound, userTeamId) {
  const bracket = G.playoffs.bracket;
  const userConf = (TEAMS.find(t => t.id === userTeamId) || {}).c || 'East';

  if (nextRound <= 2) {
    // Find a completed series in same conference from previous round
    const prevRound = nextRound - 1;
    const completed = bracket.filter(s => s.round === prevRound && s.winner);
    const confSeries = completed.filter(s => s.conf === userConf);
    // Find the opponent from the other series in same conference
    const userPrev = confSeries.find(s => parseNum(s.winner, 0) === userTeamId);
    const otherWinner = confSeries.find(s => parseNum(s.winner, 0) !== userTeamId && s.winner);
    return parseNum(otherWinner?.winner, 0) || 0;
  }

  if (nextRound === 3) {
    // Conference Finals — find winner from other round-2 series in same conf
    const r2 = bracket.filter(s => s.round === 2 && s.winner && s.conf === userConf);
    const other = r2.find(s => parseNum(s.winner, 0) !== userTeamId);
    return parseNum(other?.winner, 0) || 0;
  }

  if (nextRound === 4) {
    // Finals — find winner from other conference's round 3
    const otherConf = userConf === 'East' ? 'West' : 'East';
    const r3 = bracket.find(s => s.round === 3 && s.winner && s.conf === otherConf);
    return parseNum(r3?.winner, 0) || 0;
  }

  return 0;
}

function isPlayerAlpha() {
  const userRating = ovr(G.player.attrs || {});
  const teammates = getTeamPlayers(parseNum(G.teamId, 0)) || [];
  if (!teammates.length) return true;
  const maxTeamRating = Math.max(...teammates.map(p => parseNum(p.rating, 0)));
  return userRating >= maxTeamRating;
}

function endSeason(opts = {}) {
  // Save season to career history
  const cs = G.seasonStats;
  const gp = Math.max(parseNum(cs.gp, 1), 1);
  G.careerStats.push({
    season: G.season, year: G.year,
    team: parseNum(G.teamId, 0),
    gp: parseNum(cs.gp, 0),
    ppg: +(parseNum(cs.pts, 0) / gp).toFixed(1),
    rpg: +(parseNum(cs.reb, 0) / gp).toFixed(1),
    apg: +(parseNum(cs.ast, 0) / gp).toFixed(1),
    spg: +(parseNum(cs.stl, 0) / gp).toFixed(1),
    bpg: +(parseNum(cs.blk, 0) / gp).toFixed(1),
    fgPct: parseNum(cs.fga, 0) > 0 ? +(parseNum(cs.fgm, 0) / parseNum(cs.fga, 0) * 100).toFixed(1) : 0,
    tpPct: parseNum(cs.tpa, 0) > 0 ? +(parseNum(cs.tpm, 0) / parseNum(cs.tpa, 0) * 100).toFixed(1) : 0,
    ftPct: parseNum(cs.fta, 0) > 0 ? +(parseNum(cs.ftm, 0) / parseNum(cs.fta, 0) * 100).toFixed(1) : 0,
    wins: parseNum(cs.wins, 0),
    losses: parseNum(cs.losses, 0)
  });

  // Apply user attribute decline (age-based)
  if (typeof applyUserAttributeDecline === 'function') applyUserAttributeDecline();

  // Age user one year
  if (typeof ageUserOneYear === 'function') ageUserOneYear();

  // Apply NPC season development
  Object.values(LEAGUE.teams || {}).forEach(t => {
    const coach = t.coach || null;
    (t.players || []).forEach(p => applyNpcSeasonDevelopment(p, coach));
  });

  // Compute season awards
  if (typeof leagueAwardEntryForSeason === 'function') {
    leagueAwardEntryForSeason(G.season);
  }

  // Add Finals MVP if champion
  if (G.playoffs.champion) {
    const lastAwards = G.leagueAwards[G.leagueAwards.length - 1];
    if (lastAwards && !lastAwards.fmvp) {
      lastAwards.fmvp = { name: G.player.name, teamId: parseNum(G.teamId, 0), team: teamNameFallback(parseNum(G.teamId, 0)) };
    }
  }

  if (typeof syncUserAwardRecordForSeason === 'function') {
    syncUserAwardRecordForSeason(G.season);
  }

  G._pendingRegularSeasonAwardsModal = true;
}

// ============ SEASON AWARDS ============

function leagueAwardEntryForSeason(seasonNum) {
  ensureLeagueStateShape();
  const rows = getLeaguePlayerSeasonRows();
  const records = getLeagueTeamRecordsArray();
  const teamWinPct = {};
  records.forEach(r => { teamWinPct[r.id] = parseNum(r.pct, 0.5); });

  const season = parseNum(seasonNum, G.season);
  const year = parseNum(G.year, 2025);

  // Helper: get ppg from stats row
  const ppg = r => parseNum(r.gp, 1) > 0 ? parseNum(r.pts, 0) / parseNum(r.gp, 1) : 0;
  const rpg = r => parseNum(r.gp, 1) > 0 ? parseNum(r.reb, 0) / parseNum(r.gp, 1) : 0;
  const apg = r => parseNum(r.gp, 1) > 0 ? parseNum(r.ast, 0) / parseNum(r.gp, 1) : 0;
  const spg = r => parseNum(r.gp, 1) > 0 ? parseNum(r.stl, 0) / parseNum(r.gp, 1) : 0;
  const bpg = r => parseNum(r.gp, 1) > 0 ? parseNum(r.blk, 0) / parseNum(r.gp, 1) : 0;
  const rated = (arr, fn, n = 1) => [...arr].sort((a, b) => fn(b) - fn(a)).slice(0, n);
  const rowName = r => r.name || r.nameCn || 'Unknown';
  const rowTeam = r => parseNum(r.teamId, 0);

  const minGP = 20;
  const eligible = rows.filter(r => parseNum(r.gp, 0) >= minGP);
  const isRookieSeasonRow = r => !!r.rookie || parseNum(r.yearsLeague, -1) === 0;
  const rookies = eligible.filter(isRookieSeasonRow);

  // MVP: composite = ppg*0.3 + apg*0.2 + rpg*0.15 + winPct*20 + rating*0.1
  const mvpScore = r => ppg(r) * 0.3 + apg(r) * 0.2 + rpg(r) * 0.15 + (teamWinPct[rowTeam(r)] || 0.5) * 20 + parseNum(r.rating, 70) * 0.1;
  const mvpRow = rated(eligible, mvpScore)[0] || eligible[0];

  // DPOY: spg + bpg + winPct bonus
  const dpoyScore = r => spg(r) + bpg(r) + (teamWinPct[rowTeam(r)] || 0.5) * 3;
  const dpoyRow = rated(eligible, dpoyScore)[0] || eligible[0];

  // ROY
  const royRow = rated(rookies, ppg)[0] || rookies[0];

  // Stat leaders
  const scoringLeader = rated(eligible, ppg)[0];
  const reboundLeader = rated(eligible, rpg)[0];
  const assistLeader = rated(eligible, apg)[0];
  const blockLeader = rated(eligible, bpg)[0];
  const stealLeader = rated(eligible, spg)[0];

  // All-NBA: top 15 players
  const top15 = rated(eligible, mvpScore, 15);
  const allNba1 = top15.slice(0, 5).map(r => ({ name: rowName(r), teamId: rowTeam(r), team: teamNameFallback(rowTeam(r)), pos: parseNum(r.pos, 3) }));
  const allNba2 = top15.slice(5, 10).map(r => ({ name: rowName(r), teamId: rowTeam(r), team: teamNameFallback(rowTeam(r)), pos: parseNum(r.pos, 3) }));
  const allNba3 = top15.slice(10, 15).map(r => ({ name: rowName(r), teamId: rowTeam(r), team: teamNameFallback(rowTeam(r)), pos: parseNum(r.pos, 3) }));

  // All-Defensive: top 10 defensive players
  const allDef = rated(eligible, dpoyScore, 10).map(r => ({ name: rowName(r), teamId: rowTeam(r), team: teamNameFallback(rowTeam(r)) }));

  const entry = {
    season, year,
    mvp: mvpRow ? { name: rowName(mvpRow), teamId: rowTeam(mvpRow), team: teamNameFallback(rowTeam(mvpRow)), ppg: +ppg(mvpRow).toFixed(1) } : null,
    dpoy: dpoyRow ? { name: rowName(dpoyRow), teamId: rowTeam(dpoyRow), team: teamNameFallback(rowTeam(dpoyRow)), spg: +spg(dpoyRow).toFixed(1), bpg: +bpg(dpoyRow).toFixed(1) } : null,
    roy: royRow ? { name: rowName(royRow), teamId: rowTeam(royRow), team: teamNameFallback(rowTeam(royRow)), ppg: +ppg(royRow).toFixed(1) } : null,
    fmvp: null,
    scoring: scoringLeader ? { name: rowName(scoringLeader), teamId: rowTeam(scoringLeader), team: teamNameFallback(rowTeam(scoringLeader)), ppg: +ppg(scoringLeader).toFixed(1) } : null,
    rebound: reboundLeader ? { name: rowName(reboundLeader), teamId: rowTeam(reboundLeader), team: teamNameFallback(rowTeam(reboundLeader)), rpg: +rpg(reboundLeader).toFixed(1) } : null,
    assist: assistLeader ? { name: rowName(assistLeader), teamId: rowTeam(assistLeader), team: teamNameFallback(rowTeam(assistLeader)), apg: +apg(assistLeader).toFixed(1) } : null,
    block: blockLeader ? { name: rowName(blockLeader), teamId: rowTeam(blockLeader), team: teamNameFallback(rowTeam(blockLeader)), bpg: +bpg(blockLeader).toFixed(1) } : null,
    steal: stealLeader ? { name: rowName(stealLeader), teamId: rowTeam(stealLeader), team: teamNameFallback(rowTeam(stealLeader)), spg: +spg(stealLeader).toFixed(1) } : null,
    allNba1, allNba2, allNba3,
    allDefensive: allDef,
    allStar: [],
    allStarMvp: null
  };

  G.leagueAwards.push(entry);
  return entry;
}

function buildUserAwardsFromLeague(leagueAwards, opts = {}) {
  if (!leagueAwards) return [];
  const userName = (G.player?.name || '').trim();
  if (!userName) return [];
  const awards = [];

  const checkMatch = (entry) => {
    if (!entry) return false;
    return String(entry.name || '').trim() === userName;
  };

  if (checkMatch(leagueAwards.mvp)) awards.push('MVP');
  if (checkMatch(leagueAwards.dpoy)) awards.push('DPOY');
  if (checkMatch(leagueAwards.roy)) awards.push('ROY');
  if (checkMatch(leagueAwards.scoring)) awards.push('得分王');
  if (checkMatch(leagueAwards.rebound)) awards.push('篮板王');
  if (checkMatch(leagueAwards.assist)) awards.push('助攻王');
  if (checkMatch(leagueAwards.block)) awards.push('盖帽王');
  if (checkMatch(leagueAwards.steal)) awards.push('抢断王');
  if (leagueAwards.fmvp && String(leagueAwards.fmvp.name || '').trim() === userName) awards.push('FMVP');
  if (leagueAwards.allStarMvp && String(leagueAwards.allStarMvp.name || '').trim() === userName) awards.push('全明星MVP');

  const inList = (list) => Array.isArray(list) && list.some(e => String(e.name || '').trim() === userName);
  if (inList(leagueAwards.allNba1)) awards.push('一阵');
  else if (inList(leagueAwards.allNba2)) awards.push('二阵');
  else if (inList(leagueAwards.allNba3)) awards.push('三阵');

  if (inList(leagueAwards.allDefensive)) awards.push('一防');
  if (inList(leagueAwards.allStar)) awards.push('全明星');

  return Array.from(new Set(awards.map(normalizeHonorLabelForArchive).filter(Boolean)));
}

function syncUserAwardRecordForSeason(seasonNum = G.season) {
  if (!Array.isArray(G.allAwards)) G.allAwards = [];
  const season = parseNum(seasonNum, G.season);
  const leagueAwards = [...(G.leagueAwards || [])].reverse().find(a => parseNum(a?.season, 0) === season) || null;
  const career = [...(G.careerStats || [])].reverse().find(a => parseNum(a?.season, 0) === season) || null;
  const directAwards = (G.awards || []).filter(a => parseNum(a?.season, 0) === season);
  const awards = [];
  (leagueAwards ? buildUserAwardsFromLeague(leagueAwards) : []).forEach(label => pushUniqueHonorLabel(awards, label));
  directAwards.forEach(item => {
    if (item?.type === 'ring') pushUniqueHonorLabel(awards, '总冠军');
    if (item?.type === 'allStar') pushUniqueHonorLabel(awards, '全明星');
    if (item?.type === 'fmvp') pushUniqueHonorLabel(awards, 'FMVP');
    ['text', 'title', 'label', 'name'].forEach(key => {
      if (typeof item?.[key] === 'string') pushUniqueHonorLabel(awards, item[key]);
    });
  });
  const champion = !!G.playoffs?.champion || awards.includes('总冠军');
  if (champion) pushUniqueHonorLabel(awards, '总冠军');
  if (!awards.length && !champion) return null;
  const record = {
    season,
    year: parseNum(career?.year, G.year),
    team: parseNum(career?.team, G.teamId),
    wins: parseNum(career?.wins, G.seasonStats?.wins || 0),
    losses: parseNum(career?.losses, G.seasonStats?.losses || 0),
    champion,
    awards,
    stats: {
      ppg: parseNum(career?.ppg, 0),
      rpg: parseNum(career?.rpg, 0),
      apg: parseNum(career?.apg, 0),
      spg: parseNum(career?.spg, 0),
      bpg: parseNum(career?.bpg, 0)
    },
    honorSource: 'leagueAwards+G.awards'
  };
  G.allAwards = G.allAwards.filter(a => parseNum(a?.season, 0) !== season);
  G.allAwards.push(record);
  G.allAwards.sort((a, b) => parseNum(a.season, 0) - parseNum(b.season, 0));
  return record;
}

function getUserHallOfFameProfile() {
  const counter = typeof collectUserHonorCounterFromHistory === 'function'
    ? collectUserHonorCounterFromHistory() : (G._userHonorCounter || {});
  const rings = parseNum(counter.rings, 0);
  const mvps = parseNum(counter.mvp, 0);
  const fmvp = parseNum(counter.fmvp, 0);
  const dpoy = parseNum(counter.dpoy, 0);
  const allNba1 = parseNum(counter.allNba1, 0);
  const allNba2 = parseNum(counter.allNba2, 0);
  const allNba3 = parseNum(counter.allNba3, 0);
  const allStar = parseNum(counter.allStar, 0);
  const scoring = parseNum(counter.scoring, 0);

  const score = rings * 15 + mvps * 20 + fmvp * 14 + dpoy * 10 + allNba1 * 9 + allNba2 * 5 + allNba3 * 3 + allStar * 4 + scoring * 6;
  const threshold = parseNum(G.hallOfFameThreshold, 120);
  return { score, threshold, eligible: score >= threshold, counter, ringCount: rings };
}

function updateUserHallOfFameProgress() {
  const profile = getUserHallOfFameProfile();
  if (profile.eligible && !G.hallOfFame?.some(h => parseNum(h.season, 0) === parseNum(G.season, 0))) {
    if (!Array.isArray(G.hallOfFame)) G.hallOfFame = [];
    G.hallOfFame.push({ season: G.season, year: G.year, score: profile.score, name: G.player.name });
  }
}

// ============ USER ATTRIBUTE DECLINE ============

function applyUserAttributeDecline() {
  const age = parseNum(G.player?.age, 19);
  if (age < 30) return;
  const attrs = G.player?.attrs;
  if (!attrs) return;

  // Decline amount: age 30-32 → -1, 33-35 → -2, 36+ → -3
  let declineTotal = age <= 32 ? 1 : age <= 35 ? 2 : 3;
  // Reduce by 50% compared to NPC (user can counteract with XP)
  declineTotal = Math.max(1, Math.round(declineTotal * 0.5));

  // Priority: speed > physique > strength > other skills
  const declineOrder = ['speed', 'physique', 'strength', 'reb', 'blk', 'stl', 'shotExt', 'shotInt', 'pass', 'shotFree'];
  let applied = 0;
  for (const key of declineOrder) {
    if (applied >= declineTotal) break;
    if (typeof attrs[key] === 'number' && attrs[key] > 25) {
      attrs[key] = Math.max(25, attrs[key] - 1);
      applied++;
    }
  }
}

// ============ AI RENEWALS ============

function runOffseasonStaged_renewals() {
  let renewed = 0;
  const released = [];

  Object.values(LEAGUE.teams || {}).forEach(team => {
    const players = team.players || [];
    const toRemove = [];

    players.forEach(p => {
      if (!p.contract) p.contract = { years: 0, amount: 0 };
      p.contract.years = Math.max(0, (parseNum(p.contract.years, 0)) - 1);

      if (parseNum(p.contract.years, 0) <= 0) {
        const rating = parseNum(p.rating, 65);
        const teamAvg = players.reduce((s, pp) => s + parseNum(pp.rating, 65), 0) / Math.max(players.length, 1);
        if (rating >= teamAvg * 0.85 && players.length > 8) {
          // Renew
          const newYears = rating >= 85 ? rng(3, 5) : rating >= 75 ? rng(2, 3) : rng(1, 2);
          const newSalary = normalizeSalaryMillion(clamp(rating * 0.18 + rng(-1, 2), 1, 45));
          p.contract = { years: newYears, amount: newSalary };
          renewed++;
        } else {
          toRemove.push(p);
        }
      }
    });

    toRemove.forEach(p => {
      const idx = team.players.indexOf(p);
      if (idx >= 0) { team.players.splice(idx, 1); released.push(p); }
    });

    // Recalculate rotation and strength
    if (team.players.length) {
      team.rotation = toRotation(team.players);
      team.strength = calcTeamStrength(team);
    }
  });

  // Decrement user contract years
  G.player.contractYears = Math.max(0, parseNum(G.player.contractYears, 0) - 1);

  return { renewed, released };
}

function npcFreeAgentContract(player) {
  const rating = parseNum(player?.rating, 65);
  const age = parseNum(player?.age, 25);
  let years = age <= 26 ? rng(2, 4) : age <= 30 ? rng(2, 3) : rng(1, 2);
  let salary = normalizeSalaryMillion(clamp(rating * 0.15 + rng(-1, 2), 0.8, 40));
  return { years, salary };
}

function createOffseasonDraftState() {
  const draftClass = generateDraftClass(64, { targetYear: G.year + 1 });
  const records = getLeagueTeamRecordsArray();
  const sorted = [...records].sort((a, b) => parseNum(a.w, 0) - parseNum(b.w, 0));
  // Simple lottery: swap top-4 with some randomness
  for (let i = 0; i < Math.min(4, sorted.length); i++) {
    const j = i + rng(0, Math.min(3, sorted.length - i - 1));
    if (j !== i && j < sorted.length) { [sorted[i], sorted[j]] = [sorted[j], sorted[i]]; }
  }
  const order = sorted.map(r => r.id);
  return { pool: draftClass.players, order, results: [], tier: draftClass.tier, year: draftClass.year };
}

function getTeamFirstRoundPick(teamId) {
  return parseNum(teamId, 0);
}

function processDraftRoundStage(state, round, pref, teamId) {
  if (!state || !state.pool || !state.order) return [];
  const results = [];
  const picksPerRound = state.order.length;

  for (let i = 0; i < picksPerRound && state.pool.length > 0; i++) {
    const pickingTeamId = state.order[i];
    const isUserPick = pickingTeamId === parseNum(teamId, G.teamId);

    let chosen = null;
    if (isUserPick && pref) {
      chosen = state.pool.find(p => String(p.id) === String(pref) || String(p.name) === String(pref));
    }
    if (!chosen) {
      // AI picks: best available with position need bias
      const teamPlayers = getTeamPlayers(pickingTeamId) || [];
      const posCount = [0, 0, 0, 0, 0, 0];
      teamPlayers.forEach(p => { posCount[clamp(parseNum(p.pos, 3), 1, 5)]++; });
      const neediestPos = posCount.slice(1).indexOf(Math.min(...posCount.slice(1))) + 1;
      // Sort pool: prefer neediest position, then by rating
      const sorted = [...state.pool].sort((a, b) => {
        const aFit = parseNum(a.pos, 3) === neediestPos ? 5 : 0;
        const bFit = parseNum(b.pos, 3) === neediestPos ? 5 : 0;
        return (bFit + parseNum(b.rating, 65)) - (aFit + parseNum(a.rating, 65));
      });
      chosen = sorted[0];
    }

    if (chosen) {
      const pickNum = (round - 1) * picksPerRound + i + 1;
      results.push({ pick: pickNum, teamId: pickingTeamId, player: chosen, round });
      state.pool = state.pool.filter(p => p.id !== chosen.id);
    }
  }

  state.results.push(...results);
  return results;
}

function processDraftFinishStage(state, released) {
  // Inject drafted rookies into teams
  if (state?.results?.length) {
    state.results.forEach(r => {
      const team = LEAGUE.teams?.[r.teamId];
      if (team && r.player) {
        r.player.teamId = r.teamId;
        r.player.contract = npcFreeAgentContract(r.player);
        team.players.push(r.player);
      }
    });
  }
  // Remaining undrafted + released = free agent pool
  const faPool = [...(state?.pool || []), ...(released || [])];

  // Recalculate all teams
  Object.values(LEAGUE.teams || {}).forEach(t => {
    if (t.players?.length) {
      t.rotation = toRotation(t.players);
      t.strength = calcTeamStrength(t);
    }
  });

  return faPool;
}

function getAffordableFreeAgents(teamId, pool, limit) {
  if (!Array.isArray(pool)) return [];
  const capRoom = getSalaryCap() * 1.18 - teamPayrollMillion(teamId, { includeUser: false });
  return pool
    .filter(p => normalizeSalaryMillion(p?.contract?.amount || p?.salary || 1) <= capRoom)
    .sort((a, b) => parseNum(b.rating, 65) - parseNum(a.rating, 65))
    .slice(0, Math.max(1, parseNum(limit, 5)));
}

function runOffseasonStaged_fa(state, renewRes, pref) {
  const summary = [];
  const faPool = Array.isArray(state?.faPool) ? state.faPool : [];

  // AI teams sign free agents to fill roster gaps
  Object.values(LEAGUE.teams || {}).forEach(team => {
    const teamId = team.meta?.id;
    if (!teamId || teamId === parseNum(G.teamId, 0)) return;
    const rosterSize = (team.players || []).length;
    if (rosterSize >= 15) return;
    const needed = Math.min(15 - rosterSize, 3);
    const affordable = getAffordableFreeAgents(teamId, faPool, needed);
    affordable.forEach(p => {
      const contract = npcFreeAgentContract(p);
      p.contract = contract;
      p.teamId = teamId;
      team.players.push(p);
      const idx = faPool.indexOf(p);
      if (idx >= 0) faPool.splice(idx, 1);
    });
    if (affordable.length) {
      team.rotation = toRotation(team.players);
      team.strength = calcTeamStrength(team);
    }
  });

  summary.push(`自由市场签约完成`);
  return summary;
}

// ============ AI TRADES ============

function tryAITrade() {
  if (Math.random() > 0.04) return; // ~4% per day
  const teamIds = Object.keys(LEAGUE.teams || {}).map(Number).filter(id => id >= 1 && id <= 30);
  if (teamIds.length < 2) return;

  const idx1 = rng(0, teamIds.length - 1);
  let idx2 = rng(0, teamIds.length - 2);
  if (idx2 >= idx1) idx2++;
  const teamA = LEAGUE.teams[teamIds[idx1]];
  const teamB = LEAGUE.teams[teamIds[idx2]];
  if (!teamA?.players?.length || !teamB?.players?.length) return;

  // Find a player each team could trade
  const playersA = teamA.players.sort((a, b) => parseNum(a.rating, 65) - parseNum(b.rating, 65));
  const playersB = teamB.players.sort((a, b) => parseNum(a.rating, 65) - parseNum(b.rating, 65));
  // Pick a mid-tier player from each team
  const pA = playersA[Math.floor(playersA.length * rng(3, 7) / 10)];
  const pB = playersB[Math.floor(playersB.length * rng(3, 7) / 10)];
  if (!pA || !pB) return;

  // Validate value balance (within 75-125%)
  const valA = parseNum(pA.rating, 65);
  const valB = parseNum(pB.rating, 65);
  if (valA === 0 || valB === 0) return;
  const ratio = valA / valB;
  if (ratio < 0.75 || ratio > 1.33) return;

  // Execute trade
  const aIdx = teamA.players.indexOf(pA);
  const bIdx = teamB.players.indexOf(pB);
  if (aIdx < 0 || bIdx < 0) return;

  teamA.players.splice(aIdx, 1);
  teamB.players.splice(bIdx, 1);
  pA.teamId = teamIds[idx2];
  pB.teamId = teamIds[idx1];
  teamB.players.push(pA);
  teamA.players.push(pB);

  // Recalculate
  teamA.rotation = toRotation(teamA.players);
  teamA.strength = calcTeamStrength(teamA);
  teamB.rotation = toRotation(teamB.players);
  teamB.strength = calcTeamStrength(teamB);

  if (!Array.isArray(G.aiTradeLog)) G.aiTradeLog = [];
  G.aiTradeLog.push({
    season: G.season, day: parseNum(G.dayNum, 0),
    fromTeamId: teamIds[idx1], toTeamId: teamIds[idx2],
    players: [pA.name, pB.name]
  });
}

function triggerTradeRequest() {
  // Low chance to generate incoming trade offer for user
  if (Math.random() > 0.02) return;
  if (parseNum(G.dayNum, 0) > G.tradeDeadline) return;
  if (!G.player || parseNum(G.player.contractYears, 0) <= 0) return;

  const teamIds = Object.keys(LEAGUE.teams || {}).map(Number).filter(id => id >= 1 && id <= 30 && id !== parseNum(G.teamId, 0));
  if (!teamIds.length) return;
  const targetId = teamIds[rng(0, teamIds.length - 1)];
  if (typeof buildUserTradeProposal === 'function') {
    const proposal = buildUserTradeProposal(targetId);
    if (proposal) {
      G.pendingTrade = proposal;
      addPhone('管理层', `收到了来自${teamNameFallback(targetId)}的交易询价，请在手机中查看。`, 'trade');
    }
  }
}

// ============ ALL-STAR GAME ============

function checkAllStarBreak() {
  if (parseNum(G.dayNum, 0) < 88 || parseNum(G.dayNum, 0) > 92) return null;
  if (G.allStar?.held) return null;

  const rows = getLeaguePlayerSeasonRows();
  const minGP = 10;
  const eligible = rows.filter(r => parseNum(r.gp, 0) >= minGP);
  const eastTeams = new Set(TEAMS.filter(t => t.c === 'East').map(t => t.id));
  const westTeams = new Set(TEAMS.filter(t => t.c === 'West').map(t => t.id));

  const ppg = r => parseNum(r.gp, 1) > 0 ? parseNum(r.pts, 0) / parseNum(r.gp, 1) : 0;
  const compositeRating = r => ppg(r) * 0.4 + parseNum(r.rating, 65) * 0.3 + (parseNum(r.ast, 0) + parseNum(r.reb, 0)) / Math.max(parseNum(r.gp, 1), 1) * 0.3;

  const eastPlayers = eligible.filter(r => eastTeams.has(parseNum(r.teamId, 0))).sort((a, b) => compositeRating(b) - compositeRating(a)).slice(0, 12);
  const westPlayers = eligible.filter(r => westTeams.has(parseNum(r.teamId, 0))).sort((a, b) => compositeRating(b) - compositeRating(a)).slice(0, 12);

  const userName = (G.player?.name || '').trim();
  const userSelected = [...eastPlayers, ...westPlayers].some(r => (r.name || '').trim() === userName);

  // Simulate exhibition game
  const eastScore = rng(140, 180);
  const westScore = rng(140, 180);
  const mvpSide = eastScore >= westScore ? eastPlayers : westPlayers;
  const mvpPlayer = mvpSide[rng(0, Math.min(2, mvpSide.length - 1))];

  G.allStar = {
    held: true,
    day: parseNum(G.dayNum, 0),
    east: eastPlayers.map(r => ({ name: r.name, teamId: parseNum(r.teamId, 0) })),
    west: westPlayers.map(r => ({ name: r.name, teamId: parseNum(r.teamId, 0) })),
    mvp: mvpPlayer ? { name: mvpPlayer.name, teamId: parseNum(mvpPlayer.teamId, 0), pts: rng(20, 40) } : null,
    userSelected,
    eastScore, westScore
  };

  // Add to season awards
  const currentAwards = G.leagueAwards[G.leagueAwards.length - 1];
  if (currentAwards) {
    currentAwards.allStar = [...eastPlayers, ...westPlayers].map(r => ({ name: r.name, teamId: parseNum(r.teamId, 0) }));
    currentAwards.allStarMvp = G.allStar.mvp;
  }

  if (userSelected) {
    if (typeof addHonorTextToCounter === 'function') addHonorTextToCounter('全明星');
    G.awards.push({ season: G.season, year: G.year, text: '全明星', type: 'allStar' });
    addNews(`⭐ 恭喜你入选全明星赛！`, 'pos');
  }

  return G.allStar;
}

// ============ SALARY CAP ERA DIFFERENCES ============

function getEraSalaryCap(rosterYear) {
  const y = parseNum(rosterYear, 2025);
  if (y <= 1970) return { capM: 0.5, luxuryMult: 1.10, eraName: 'early' };
  if (y <= 1980) return { capM: 3.5, luxuryMult: 1.12, eraName: 'early' };
  if (y <= 1990) return { capM: 12, luxuryMult: 1.15, eraName: 'historic' };
  if (y <= 2000) return { capM: 26 + (y - 1990) * 1.2, luxuryMult: 1.15, eraName: 'historic' };
  if (y <= 2010) return { capM: 42 + (y - 2000) * 1.8, luxuryMult: 1.18, eraName: 'modern' };
  if (y <= 2016) return { capM: 58 + (y - 2010) * 8, luxuryMult: 1.18, eraName: 'modern' };
  if (y <= 2020) return { capM: 99 + (y - 2016) * 3, luxuryMult: 1.18, eraName: 'modern' };
  return { capM: 170, luxuryMult: 1.18, eraName: 'modern' };
}

function getSalaryCap() {
  if (G.eraConfig?.salaryCapM) return G.eraConfig.salaryCapM;
  const rosterYear = parseNum(LEAGUE?.years?.roster, 2025);
  return getEraSalaryCap(rosterYear).capM;
}

// ============ RESTRICTED FREE AGENTS ============

function identifyRestrictedFreeAgents() {
  const rfas = [];
  Object.values(LEAGUE.teams || {}).forEach(team => {
    (team.players || []).forEach(p => {
      const years = parseNum(p.yearsLeague, 0);
      const contractYears = parseNum(p.contract?.years, 0);
      if (years >= 1 && years <= 4 && contractYears <= 0) {
        p.isRFA = true;
        const qualifyingSalary = normalizeSalaryMillion(clamp(parseNum(p.rating, 65) * 0.12, 1, 15));
        rfas.push({ player: p, teamId: parseNum(team.meta?.id, 0), qualifyingSalary });
      }
    });
  });
  return rfas;
}

function processRFAMatching(rfas) {
  rfas.forEach(rfa => {
    const team = LEAGUE.teams[rfa.teamId];
    if (!team) return;
    const p = rfa.player;
    const rating = parseNum(p.rating, 65);
    const teamAvg = (team.players || []).reduce((s, pp) => s + parseNum(pp.rating, 65), 0) / Math.max((team.players || []).length, 1);
    // Team matches if player is above average
    if (rating >= teamAvg * 0.9) {
      const contract = npcFreeAgentContract(p);
      p.contract = contract;
      p.isRFA = false;
    } else {
      // Release
      const idx = team.players.indexOf(p);
      if (idx >= 0) team.players.splice(idx, 1);
      p.isRFA = false;
    }
  });
}

// ============ TRADE DRAFT PICKS ============

function initTeamPicks() {
  G.teamPicks = {};
  const teamIds = Object.keys(LEAGUE.teams || {}).map(Number);
  for (let futureOffset = 0; futureOffset < 7; futureOffset++) {
    const season = G.season + futureOffset + 1;
    teamIds.forEach(tid => {
      if (!G.teamPicks[tid]) G.teamPicks[tid] = {};
      G.teamPicks[tid][season] = {
        r1: { originalTeamId: tid, protected: null },
        r2: { originalTeamId: tid, protected: null }
      };
    });
  }
}

function evaluatePickValue(season, round, protection) {
  const seasonsAway = season - parseNum(G.season, 1);
  const discount = Math.pow(0.85, Math.max(0, seasonsAway));
  const baseValue = round === 1 ? 30 : 12;
  const protMult = protection === 'top5' ? 0.7 : protection === 'top3' ? 0.6 : protection === 'top1' ? 0.5 : 1;
  return baseValue * discount * protMult;
}

// ============ SIGN-AND-TRADE ============

function buildSignAndTradeOptions(player, fromTeamId) {
  const options = [];
  const teamIds = Object.keys(LEAGUE.teams || {}).map(Number).filter(id => id !== parseNum(fromTeamId, 0));
  const rating = ovr(player?.attrs || {});
  const baseSalary = clamp(rating * 0.2 + rng(-2, 3), 2, 42);

  teamIds.slice(0, 5).forEach(targetId => {
    const team = LEAGUE.teams[targetId];
    if (!team?.players?.length) return;
    // Find a player the target team might send back
    const candidates = (team.players || []).filter(p => parseNum(p.rating, 65) >= rating * 0.7 && parseNum(p.rating, 65) <= rating * 1.3);
    if (!candidates.length) return;
    const incoming = candidates[rng(0, candidates.length - 1)];
    options.push({
      targetTeamId,
      targetTeamName: teamNameFallback(targetId),
      contractYears: rng(2, 4),
      contractSalary: baseSalary,
      incomingPlayer: incoming.name,
      incomingRating: parseNum(incoming.rating, 65)
    });
  });

  return options;
}

// ============ MISSING UI-REFERENCED FUNCTIONS ============


const LEGACY_SIGNATURE_SHOE_SLOT_KEYS = ['speed', 'shooting', 'finishing', 'playmaking', 'defense'];
const LEGACY_SIGNATURE_SHOE_EFFECT_LABELS = {
  speed: '??',
  shooting: '??',
  finishing: '??',
  playmaking: '??',
  defense: '??',
  speedAttr: '??',
  shotExt: '??',
  shotInt: '??',
  pass: '??',
  stl: '??',
  blk: '??',
  physique: '??'
};
const LEGACY_SIGNATURE_SHOE_STYLE_DEFS = {
  speed: { label: '速度爆发', bonusKey: 'speed', priority: ['speed', 'shooting', 'playmaking', 'finishing', 'defense'] },
  scoring: { label: '得分火力', bonusKey: 'shotExt', priority: ['shooting', 'finishing', 'speed', 'playmaking', 'defense'] },
  defense: { label: '防守压迫', bonusKey: 'stl', priority: ['defense', 'speed', 'playmaking', 'finishing', 'shooting'] },
  allaround: { label: '全能组织', bonusKey: 'pass', priority: ['speed', 'shooting', 'finishing', 'playmaking', 'defense'] }
};
const LEGACY_SIGNATURE_SHOE_LEVEL_RULES = {
  1: { level: 1, label: '样品鞋', extraPoints: 0, fame: 0, earned: 0, days: 0 },
  2: { level: 2, label: '训练版', extraPoints: 2, fame: 30, earned: 0.35, days: 10 },
  3: { level: 3, label: '市售版', extraPoints: 2, fame: 45, earned: 0.95, days: 24 },
  4: { level: 4, label: '明星版', extraPoints: 3, fame: 60, earned: 1.9, days: 42 },
  5: { level: 5, label: '旗舰版', extraPoints: 3, fame: 75, earned: 3.5, days: 60 }
};
function normalizeSignatureShoeStyle(styleKey) {
  const key = String(styleKey || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(LEGACY_SIGNATURE_SHOE_STYLE_DEFS, key) ? key : 'allaround';
}
function getSignatureShoeStyleDef(styleKey) {
  return LEGACY_SIGNATURE_SHOE_STYLE_DEFS[normalizeSignatureShoeStyle(styleKey)] || LEGACY_SIGNATURE_SHOE_STYLE_DEFS.allaround;
}
function getSignatureShoeStylePriority(styleKey) {
  return getSignatureShoeStyleDef(styleKey).priority || LEGACY_SIGNATURE_SHOE_STYLE_DEFS.allaround.priority;
}
function getSignatureShoeUpgradeRule(level) {
  const lv = clamp(parseNum(level, 1), 1, 5);
  return LEGACY_SIGNATURE_SHOE_LEVEL_RULES[lv] || LEGACY_SIGNATURE_SHOE_LEVEL_RULES[1];
}
function getSignatureShoeBaseBudget() {
  return 5;
}
function getSignatureShoeDefaultAllocations(styleKey, budget = 5) {
  const out = { speed: 0, shooting: 0, finishing: 0, playmaking: 0, defense: 0 };
  const priority = getSignatureShoeStylePriority(styleKey);
  const total = Math.max(1, Math.floor(parseNum(budget, 5)));
  for (let i = 0; i < total; i++) {
    const key = priority[i % priority.length];
    out[key] += 1;
  }
  return out;
}
function normalizeSignatureShoeAllocations(raw, styleKey, budget = 5) {
  const out = { speed: 0, shooting: 0, finishing: 0, playmaking: 0, defense: 0 };
  if (raw && typeof raw === 'object') {
    LEGACY_SIGNATURE_SHOE_SLOT_KEYS.forEach(key => {
      out[key] = clamp(Math.floor(parseNum(raw[key], 0)), 0, 99);
    });
  }
  let total = LEGACY_SIGNATURE_SHOE_SLOT_KEYS.reduce((sum, key) => sum + parseNum(out[key], 0), 0);
  const target = Math.max(1, Math.floor(parseNum(budget, 5)));
  if (total === 0) return getSignatureShoeDefaultAllocations(styleKey, target);
  const priority = getSignatureShoeStylePriority(styleKey);
  if (total < target) {
    let i = 0;
    while (total < target) {
      const key = priority[i % priority.length];
      out[key] += 1;
      total += 1;
      i += 1;
    }
    return out;
  }
  if (total > target) {
    let guard = 0;
    while (total > target && guard < 300) {
      const key = priority[(priority.length - 1 - (guard % priority.length) + priority.length) % priority.length];
      if (out[key] > 0) {
        out[key] -= 1;
        total -= 1;
      }
      guard += 1;
    }
  }
  return out;
}
function spreadSignatureShoeAllocations(allocations, styleKey, extraPoints = 0) {
  const out = { ...(allocations || {}) };
  const priority = getSignatureShoeStylePriority(styleKey);
  let points = Math.max(0, Math.floor(parseNum(extraPoints, 0)));
  let i = 0;
  while (points > 0) {
    const key = priority[i % priority.length];
    out[key] = parseNum(out[key], 0) + 1;
    points -= 1;
    i += 1;
  }
  return out;
}
function formatSignatureShoeBoostText(boosts = {}) {
  return Object.entries(boosts || {})
    .filter(([, v]) => parseNum(v, 0) > 0)
    .map(([k, v]) => (LEGACY_SIGNATURE_SHOE_EFFECT_LABELS[k] || k) + '+' + parseNum(v, 0))
    .join(' ? ');
}
function sanitizeSignatureShoeName(raw, fallback = '') {
  const txt = String(raw || '').replace(/s+/g, ' ').trim();
  const base = txt || String(fallback || '').replace(/s+/g, ' ').trim();
  return base.slice(0, 28);
}
function calculateSignatureShoeIncome(contract, shoe = {}) {
  const tier = clamp(parseNum(contract?.tier, 1), 1, 5);
  const level = clamp(parseNum(shoe?.level, 1), 1, 5);
  const pointsBudget = Math.max(5, parseNum(shoe?.pointsBudget, getSignatureShoeBaseBudget(contract)));
  const fame = clamp(parseNum(G.player?.fame, 0), 0, 100);
  const trust = clamp(parseNum(G.player?.trust, 0), 0, 100);
  const honor = clamp(parseNum(typeof getPlayerEndorsementHonorScore === 'function' ? getPlayerEndorsementHonorScore() : 0, 0), 0, 300);
  const tierFactor = 0.95 + tier * 0.18;
  const fameFactor = 0.85 + fame / 100;
  const trustFactor = 0.9 + trust / 180;
  const honorFactor = 0.92 + honor / 220;
  const levelFactor = 1 + (level - 1) * 0.28;
  const budgetFactor = 1 + Math.max(0, pointsBudget - 5) * 0.05;
  const dailyIncome = +(0.0045 * tierFactor * fameFactor * trustFactor * honorFactor * levelFactor * budgetFactor).toFixed(3);
  const gameIncome = +(dailyIncome * (1.45 + level * 0.1)).toFixed(3);
  return {
    dailyIncome,
    gameIncome,
    revenueRate: +(dailyIncome * 30).toFixed(3),
    tierFactor,
    fameFactor,
    trustFactor,
    honorFactor,
    levelFactor,
    budgetFactor
  };
}
/* Signature shoe engine moved to assets/js/signature-shoe.js
  const styleLabel = String(shoe?.label || getSignatureShoeStyleDef(shoe?.styleKey).label || '签名鞋').trim();
  const boostText = String(shoe?.summary || formatSignatureShoeBoostText(shoe?.boosts || {})).trim();
  const revenueText = '??';
  const state = getEndorsementState();
  const profile = buildEndorsementProfile();
  const template = ENDORSEMENT_CATALOG.find(x => String(x.id) === String(offerId));
  if (!template) return { ok: false, reason: 'invalid', message: '代言不存在' };
  if (state.active.length >= 8) return { ok: false, reason: 'cap', message: '最多同时签约 8 个代言' };
  if (state.active.some(x => String(x.id) === String(offerId))) return { ok: false, reason: 'active', message: '这个代言已经签约了' };
  const offer = evaluateEndorsementOffer(template, profile, state);
  if (offer.status === 'locked') return { ok: false, reason: 'locked', message: `暂时未解锁：${offer.lockReason}` };
  if (offer.status === 'rejected') return { ok: false, reason: 'rejected', message: '这个代言本季已经拒绝过了' };
  if (offer.status === 'active') return { ok: false, reason: 'active', message: '这个代言已经在生效中' };
  const contract = {
    id: offer.id,
    categoryKey: offer.categoryKey,
    category: offer.category,
    brand: offer.brand,
    product: offer.product,
    tier: offer.tier,
    kind: offer.kind,
    signingBonus: offer.signingBonus,
    baseDailyIncome: offer.dailyIncome,
    baseGameIncome: offer.gameIncome,
    remainingDays: offer.termDays,
    earned: 0,
    shoeEligible: !!offer.shoeEligible,
    shoe: null,
    signedSeason: parseNum(G.season, 1),
    signedDay: parseNum(G.dayNum, 0)
  };
  state.active.unshift(contract);
  delete state.rejected[offer.id];
  adjustPlayerCash(offer.signingBonus, `签约代言 ${offer.brand}`);
  addPhone('代言经纪人', `已签下 ${offer.brand}（${offer.category}）代言，签约金 $${offer.signingBonus.toFixed(2)}M。`, 'info');
  addEconomyLog(`签约代言 ${offer.brand}（${offer.category}）`, 'pos');
  return { ok: true, message: `已签约 ${offer.brand}`, contract };
}
function rejectEndorsementOffer(offerId) {
  const state = getEndorsementState();
  const template = ENDORSEMENT_CATALOG.find(x => String(x.id) === String(offerId));
  if (!template) return { ok: false, reason: 'invalid', message: '代言不存在' };
  state.rejected[template.id] = parseNum(G.season, 1);
  addPhone('代言经纪人', `你拒绝了 ${template.brand} 的代言邀约。`, 'neu');
  addEconomyLog(`拒绝代言 ${template.brand}`, 'neu');
  return { ok: true, message: `已拒绝 ${template.brand}` };
}
*/
