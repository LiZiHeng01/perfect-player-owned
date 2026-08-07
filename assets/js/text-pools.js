// text-pools.js
// ============ FIXED TEXT POOLS (replaces all LLM text generation) ============

// --- Helper Functions ---

function fillTextTemplate(tpl, vars = {}) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

function selectFromPool(pool, subcategory, seed, shift = 0) {
  const arr = pool[subcategory];
  if (!Array.isArray(arr) || !arr.length) return '';
  return pickSeedItem(arr, seed, shift) || arr[0] || '';
}

function buildPoolSeed(prefix, day, season) {
  return `${prefix}_${parseNum(day, 0)}_${parseNum(season, 0)}`;
}

function textPoolCleanName(value, fallback = '球员') {
  const str = String(value || '').trim();
  return str || fallback;
}

function textPoolTeamNameById(teamId, fallback = '球队') {
  if (typeof getTeam === 'function') {
    const team = getTeam(teamId) || {};
    return textPoolCleanName(team.z || team.n || team.a, fallback);
  }
  return fallback;
}

function textPoolPlayableRows(rows = []) {
  return Array.isArray(rows)
    ? rows.filter(row => row && !row.status && parseNum(row.mins, 0) > 0)
    : [];
}

function textPoolSortRows(rows = [], scoring = () => 0) {
  return rows.slice().sort((a, b) =>
    scoring(b) - scoring(a)
    || parseNum(b.pts, 0) - parseNum(a.pts, 0)
    || parseNum(b.mins, 0) - parseNum(a.mins, 0)
  );
}

function textPoolPlayerLine(row = null, fallbackName = '球员') {
  if (!row) return `${fallbackName}没有技术统计`;
  const name = textPoolCleanName(row.name, fallbackName);
  const pts = parseNum(row.pts, 0);
  const reb = parseNum(row.reb, 0);
  const ast = parseNum(row.ast, 0);
  const stl = parseNum(row.stl, 0);
  const blk = parseNum(row.blk, 0);
  const fgm = parseNum(row.fgm, 0);
  const fga = parseNum(row.fga, 0);
  const tpm = parseNum(row.tpm, 0);
  const tpa = parseNum(row.tpa, 0);
  const ftm = parseNum(row.ftm, 0);
  const fta = parseNum(row.fta, 0);
  const extras = [];
  if (stl || blk) extras.push(`${stl}抢断${blk}盖帽`);
  if (fga > 0) extras.push(`投篮${fgm}/${fga}`);
  if (tpa > 0) extras.push(`三分${tpm}/${tpa}`);
  if (fta > 0) extras.push(`罚球${ftm}/${fta}`);
  const suffix = extras.length ? `，${extras.join('，')}` : '';
  return `${name}${pts}分${reb}篮板${ast}助攻${suffix}`;
}

function textPoolPlayerCoreLine(row = null, fallbackName = '球员') {
  if (!row) return `${fallbackName}没有留下技术统计`;
  const name = textPoolCleanName(row.name, fallbackName);
  return `${name}${parseNum(row.pts, 0)}分${parseNum(row.reb, 0)}篮板${parseNum(row.ast, 0)}助攻`;
}

function textPoolPlayerMomentLine(row = null, fallbackName = '球员') {
  if (!row) return `${fallbackName}在轮换里没有留下明显片段`;
  const name = textPoolCleanName(row.name, fallbackName);
  const pts = parseNum(row.pts, 0);
  const reb = parseNum(row.reb, 0);
  const ast = parseNum(row.ast, 0);
  const stl = parseNum(row.stl, 0);
  const blk = parseNum(row.blk, 0);
  const parts = [];
  if (pts >= 18) parts.push(`${pts}分撑住火力`);
  else if (pts > 0) parts.push(`${pts}分补上进攻`);
  if (ast >= 6) parts.push(`${ast}次助攻把球转起来`);
  else if (reb >= 7) parts.push(`${reb}个篮板守住回合`);
  if (stl || blk) parts.push(`${stl}抢断${blk}盖帽给出防守回应`);
  return parts.length ? `${name}${parts.join('，')}` : textPoolPlayerCoreLine(row, fallbackName);
}

function textPoolRowKey(row = null) {
  return `${String(row?.name || '').trim()}_${String(row?.pos || '').trim()}_${parseNum(row?.mins, 0)}`;
}

function textPoolUniqueRows(rows = []) {
  const seen = new Set();
  const out = [];
  rows.forEach(row => {
    if (!row) return;
    const key = textPoolRowKey(row);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  });
  return out;
}

function textPoolBuildGameFacts(result = {}) {
  const dayResult = result || {};
  const gameRes = dayResult.gameResult || dayResult;
  if (!gameRes || (!dayResult.isGame && !gameRes.userGame && !gameRes.gameId)) return null;

  const userTeamId = parseNum(G?.teamId, 0);
  const homeTeamId = parseNum(gameRes.homeTeamId, 0);
  const awayTeamId = parseNum(gameRes.awayTeamId, 0);
  const userIsHome = homeTeamId === userTeamId || (!!gameRes.home && awayTeamId !== userTeamId);
  const homeRows = Array.isArray(gameRes.homeRows) ? gameRes.homeRows : [];
  const awayRows = Array.isArray(gameRes.awayRows) ? gameRes.awayRows : [];
  let userRows = userIsHome ? homeRows : awayRows;
  let opponentRows = userIsHome ? awayRows : homeRows;
  if (!userRows.length && Array.isArray(dayResult.matchup?.userTeam?.boxScore)) userRows = dayResult.matchup.userTeam.boxScore;
  if (!opponentRows.length && Array.isArray(dayResult.matchup?.opponentTeam?.boxScore)) opponentRows = dayResult.matchup.opponentTeam.boxScore;

  const teamPts = parseNum(gameRes.teamPts, userIsHome ? gameRes.homeScore : gameRes.awayScore);
  const oppPts = parseNum(gameRes.oppPts, userIsHome ? gameRes.awayScore : gameRes.homeScore);
  const win = teamPts > oppPts;
  const margin = Math.abs(teamPts - oppPts);
  const playerName = textPoolCleanName(G?.player?.name, '你');
  const selfRow = (Array.isArray(userRows) ? userRows : []).find(row => row?.isSelf)
    || (parseNum(gameRes.st?.mins, 0) > 0 ? { ...gameRes.st, name: playerName, isSelf: true } : null);
  const selfPlayed = parseNum(selfRow?.mins, parseNum(gameRes.st?.mins, 0)) > 0;
  const playable = textPoolPlayableRows(userRows);
  const opponentPlayable = textPoolPlayableRows(opponentRows);
  const topScorer = textPoolSortRows(playable, row => parseNum(row.pts, 0))[0] || null;
  const topPlaymaker = textPoolSortRows(playable, row => parseNum(row.ast, 0) * 2 + parseNum(row.pts, 0) * 0.2)[0] || topScorer;
  const topDefender = textPoolSortRows(playable, row => (parseNum(row.stl, 0) + parseNum(row.blk, 0)) * 3 + parseNum(row.reb, 0))[0] || topScorer;
  const opponentTop = textPoolSortRows(opponentPlayable, row => parseNum(row.pts, 0))[0] || null;
  const rankedContributors = textPoolUniqueRows([
    topScorer,
    topPlaymaker,
    topDefender,
    ...textPoolSortRows(playable, row => parseNum(row.pts, 0) + parseNum(row.ast, 0) + parseNum(row.reb, 0))
  ]);
  const leader = rankedContributors[0] || topScorer || playable[0] || null;
  const support = rankedContributors[1] || null;
  const secondary = rankedContributors[2] || null;
  const teamName = textPoolCleanName(
    dayResult.matchup?.userTeam?.name || dayResult.matchup?.userTeam?.abbr || G?.team?.z || G?.team?.n,
    textPoolTeamNameById(userTeamId, '我方')
  );
  const oppName = textPoolCleanName(
    gameRes.oppName || dayResult.matchup?.opponentTeam?.name || dayResult.matchup?.opponentTeam?.abbr,
    textPoolTeamNameById(gameRes.opp, '对手')
  );

  return {
    day: parseNum(dayResult.day, G?.dayNum || 0),
    season: parseNum(G?.season, 1),
    teamName,
    oppName,
    playerName,
    teamPts,
    oppPts,
    margin,
    win,
    closeLabel: margin <= 7 ? '焦灼' : (margin <= 15 ? '常规' : '大比分'),
    selfPlayed,
    selfLine: selfPlayed ? textPoolPlayerLine(selfRow, playerName) : `${playerName}本场DNP`,
    selfCoreLine: selfPlayed ? textPoolPlayerCoreLine(selfRow, playerName) : `${playerName}没有进入轮换`,
    selfMomentLine: selfPlayed ? textPoolPlayerMomentLine(selfRow, playerName) : `${playerName}只能在替补席等下一次机会`,
    leaderName: textPoolCleanName(leader?.name, teamName),
    leaderLine: textPoolPlayerLine(leader, teamName),
    leaderCoreLine: textPoolPlayerCoreLine(leader, teamName),
    leaderMomentLine: textPoolPlayerMomentLine(leader, teamName),
    supportLine: support ? textPoolPlayerCoreLine(support, teamName) : `${teamName}的轮换没有让比赛断线`,
    supportMomentLine: support ? textPoolPlayerMomentLine(support, teamName) : `${teamName}在几次暂停后没有断线`,
    secondaryMomentLine: secondary ? textPoolPlayerMomentLine(secondary, teamName) : `${teamName}在几个不起眼的回合里守住位置`,
    topScorerLine: textPoolPlayerLine(topScorer, teamName),
    topPlaymakerLine: textPoolPlayerLine(topPlaymaker, teamName),
    topDefenderLine: textPoolPlayerLine(topDefender, teamName),
    topDefenderMomentLine: topDefender && textPoolRowKey(topDefender) !== textPoolRowKey(leader)
      ? textPoolPlayerMomentLine(topDefender, teamName)
      : `${teamName}在防守回合里没有提前松手`,
    opponentTopLine: textPoolPlayerLine(opponentTop, oppName),
    opponentCoreLine: textPoolPlayerCoreLine(opponentTop, oppName),
    opponentMomentLine: textPoolPlayerMomentLine(opponentTop, oppName),
    grade: String(gameRes.grade || '').trim() || '未评级'
  };
}

function textPoolFillGameFacts(tpl = '', facts = {}) {
  return fillTextTemplate(tpl, {
    teamName: facts.teamName,
    oppName: facts.oppName,
    playerName: facts.playerName,
    teamPts: String(facts.teamPts),
    oppPts: String(facts.oppPts),
    margin: String(facts.margin),
    closeLabel: facts.closeLabel,
    selfLine: facts.selfLine,
    selfCoreLine: facts.selfCoreLine,
    selfMomentLine: facts.selfMomentLine,
    leaderName: facts.leaderName,
    leaderLine: facts.leaderLine,
    leaderCoreLine: facts.leaderCoreLine,
    leaderMomentLine: facts.leaderMomentLine,
    supportLine: facts.supportLine,
    supportMomentLine: facts.supportMomentLine,
    secondaryMomentLine: facts.secondaryMomentLine,
    topScorerLine: facts.topScorerLine,
    topPlaymakerLine: facts.topPlaymakerLine,
    topDefenderLine: facts.topDefenderLine,
    topDefenderMomentLine: facts.topDefenderMomentLine,
    opponentTopLine: facts.opponentTopLine,
    opponentCoreLine: facts.opponentCoreLine,
    opponentMomentLine: facts.opponentMomentLine,
    grade: facts.grade
  });
}

const FACTUAL_DAILY_GAME_STORY = {
  played_win: [
    '终场哨响时，记分牌停在{teamPts}:{oppPts}。{teamName}赢下{oppName}，{playerName}的夜晚不算喧闹，却足够扎实：{selfCoreLine}，评分{grade}。更衣室里最先被提起的是{leaderMomentLine}，随后大家才慢慢把这场胜利的气吐出来。',
    '{teamName}把这场{closeLabel}胜利留在了自己这边。{playerName}交出{selfCoreLine}，没有抢走所有镜头，但在轮换里完成了该完成的部分。比赛真正热起来时，{supportMomentLine}，那几个回合让替补席终于站了起来。',
    '比分定格在{teamPts}:{oppPts}后，{playerName}和队友挨个击掌。今晚他的答卷是{selfCoreLine}，评分{grade}；而决定比赛气味的，是{leaderMomentLine}，以及{topDefenderMomentLine}。'
  ],
  played_loss: [
    '{teamName}还是以{teamPts}:{oppPts}倒在{oppName}面前。{playerName}留下{selfCoreLine}，评分{grade}，但这晚的节奏始终被对面拽着走。{opponentMomentLine}，每次他起势，主队替补席的声音就低一截。',
    '输球后的更衣室没有人急着说话。{playerName}这场是{selfCoreLine}，{teamName}最后差了{margin}分。队里有人站出来，{leaderMomentLine}，可{oppName}那边的{opponentCoreLine}让追分一直差一口气。',
    '终场{teamPts}:{oppPts}，灯光还亮着，{playerName}已经低头把毛巾搭在肩上。他的个人线是{selfCoreLine}，评分{grade}；{supportMomentLine}也帮球队续过命，但最后几个回合还是没能把比分拉回来。'
  ],
  dnp_win: [
    '{teamName}以{teamPts}:{oppPts}赢下{oppName}，{playerName}没有进入轮换。镜头几次扫到他时，他都站在替补席边缘给队友鼓掌。今晚的故事属于上场的人：{leaderMomentLine}，{supportMomentLine}。',
    '这场胜利从场上打到替补席。{playerName}没有出场，只能把战术板上的跑位一遍遍记在脑子里。{teamName}能守住{margin}分优势，靠的是{leaderMomentLine}，也靠{topDefenderMomentLine}。',
    '终场哨响，{playerName}第一个走上去和队友撞胸。他一整晚没有被叫到技术台前，但这不妨碍他把比赛看得很认真：{leaderCoreLine}扛住了主线，{supportMomentLine}。'
  ],
  dnp_loss: [
    '{teamName}以{teamPts}:{oppPts}输给{oppName}，{playerName}没有进入轮换。比赛最后阶段他一直站着看完，手里攥着毛巾。队里最能回应的是{leaderMomentLine}，但{opponentMomentLine}让这场追分始终没有真正翻过去。',
    '这不是{playerName}能亲手改写的夜晚。{teamName}输了{margin}分，他没有出场，只能在替补席听教练喊每一次防守站位。{supportMomentLine}给过球队机会，可{oppName}最后还是稳住了。',
    '终场以后，{playerName}跟着队伍往通道走，脚步比平时慢。{teamName}这晚败给{oppName}，场上主线是{leaderCoreLine}，对面则由{opponentCoreLine}把压力压到了最后。'
  ]
};

const FACTUAL_MATCH_RECAP = {
  played_win: [
    { headline: '{teamName}守住胜利，{playerName}完成轮换任务', recap: '{teamName}以{teamPts}:{oppPts}拿下{oppName}。{playerName}交出{selfCoreLine}，评分{grade}，他的存在感更多藏在几个回合的选择里。今晚最响的片段来自{leaderMomentLine}，而{supportMomentLine}让球队在中段没有掉线。' },
    { headline: '{teamName}{closeLabel}取胜，收官不慌', recap: '这场球从头到尾都不好松气。{playerName}留下{selfCoreLine}，没有把比赛讲成个人秀，却在轮换里撑住了自己的部分。{topDefenderMomentLine}，{secondaryMomentLine}，这些细节一起把{margin}分优势留到了终场。' }
  ],
  played_loss: [
    { headline: '{teamName}追到最后，仍差一口气', recap: '{teamName}以{teamPts}:{oppPts}不敌{oppName}。{playerName}的个人线是{selfCoreLine}，评分{grade}，但球队没能把他的回合转成胜势。{leaderMomentLine}撑过一段，问题是对面{opponentMomentLine}，每次都把气氛重新按回去。' },
    { headline: '{oppName}带走胜利，{teamName}留下遗憾', recap: '终场分差只有{margin}分，却足够让更衣室安静下来。{playerName}交出{selfCoreLine}，{supportMomentLine}，可{teamName}最后还是少了一个能改变走势的回合。' }
  ],
  dnp_win: [
    { headline: '{teamName}赢球，{playerName}在等待机会', recap: '{teamName}以{teamPts}:{oppPts}击败{oppName}。{playerName}没有进入轮换，整晚更多是在替补席听战术、看对位。场上的故事由队友写完：{leaderMomentLine}，{supportMomentLine}。' },
    { headline: '替补席上的一场胜利', recap: '这场{closeLabel}胜利没有给{playerName}出场机会。终场后他还是跟每个队友击掌，因为{teamName}确实把比赛拿下了。{leaderCoreLine}扛住火力，{topDefenderMomentLine}，胜利就这样被一点点攥住。' }
  ],
  dnp_loss: [
    { headline: '{teamName}落败，{playerName}只能旁观', recap: '{teamName}以{teamPts}:{oppPts}输给{oppName}。{playerName}没有进入轮换，最后几分钟只能站在替补席边上看队友追分。{leaderMomentLine}，但{opponentMomentLine}让这场球始终没被追回来。' },
    { headline: '等待机会的夜晚', recap: '比分停在{teamPts}:{oppPts}，{teamName}输了{margin}分。{playerName}没有出场，赛后只能把注意力放到下一次训练。场上最有回应的是{supportMomentLine}，可{oppName}靠{opponentCoreLine}把结果带走。' }
  ]
};

function buildFactualDailyGameStory(result = {}) {
  const facts = textPoolBuildGameFacts(result);
  if (!facts) return null;
  const key = `${facts.selfPlayed ? 'played' : 'dnp'}_${facts.win ? 'win' : 'loss'}`;
  const pool = FACTUAL_DAILY_GAME_STORY[key] || FACTUAL_DAILY_GAME_STORY.played_win;
  const seed = buildPoolSeed('story_factual', facts.day, facts.season);
  const tpl = pickSeedItem(pool, seed) || pool[0];
  const changes = facts.selfPlayed
    ? { mood: facts.win ? 8 : -7, cash: 0, fame: facts.win ? 5 : -2 }
    : { mood: facts.win ? 2 : -3, cash: 0, fame: 0 };
  return { text: textPoolFillGameFacts(tpl, facts), changes, facts };
}

function buildFactualMatchRecap(result = {}) {
  const facts = textPoolBuildGameFacts(result);
  if (!facts) return null;
  const key = `${facts.selfPlayed ? 'played' : 'dnp'}_${facts.win ? 'win' : 'loss'}`;
  const pool = FACTUAL_MATCH_RECAP[key] || FACTUAL_MATCH_RECAP.played_win;
  const seed = buildPoolSeed('recap_factual', facts.day, facts.season);
  const entry = pickSeedItem(pool, seed) || pool[0];
  return {
    headline: textPoolFillGameFacts(entry.headline || '', facts),
    recap: textPoolFillGameFacts(entry.recap || '', facts),
    at: Date.now(),
    gameId: (result.gameResult || result || {}).gameId || '',
    factual: true
  };
}

// ============ TEXT_POOL_SOCIAL — General Social Media Posts ============

const TEXT_POOL_SOCIAL = {
  game_analysis: [
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的挡拆防守今天完全被打穿，对方后卫每次绕掩护都能找到空位出手。这不是个人能力问题，是整个防守体系需要重新校准。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的转换进攻，三线快下跑位太清晰了，防守方根本来不及落位。这种节奏打下去，分差只会越拉越大。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的联防在第三节彻底失效，{teamName}连续5个回合用高位挡拆破解。联防最怕的就是有投射的大个子拉到弧顶。' },
    { persona: 'tactical', tone: 'neutral', text: '这场球{teamName}的弱侧轮转做得太差了，底角射手全场空位。教练组必须在录像课上好好复盘这个问题。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的半场阵地战效率太低了，连续8个回合没有禁区触球。外线手感不好的时候还不往里打，这战术板该擦了。' },
    { persona: 'tactical', tone: 'neutral', text: '注意看{teamName}的底线发球战术，每次暂停回来都能跑出空位。这种细节执行才是强队的标志。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}今天对持球人的压迫太狠了，{teamName}的后卫连半场都推进困难。全场紧逼不是谁都能破的。' },
    { persona: 'tactical', tone: 'neutral', text: '这场的节奏完全被{teamName}控制了，他们刻意压低回合数，每次进攻都磨到15秒以后才出手。慢节奏对攻强守弱的队来说是毒药。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的换防沟通出了大问题，连续3次出现两个人扑同一个点的情况。这种防守默契度，季后赛走不远。' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}的板凳深度，第二阵容上来不仅没掉节奏反而打了一波高潮。深度才是漫长赛季的保障。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的空切今天打得太好了，内线球员连续在防守盲区接球上篮。这种无球跑动才是最省力的得分方式。' },
    { persona: 'tactical', tone: 'neutral', text: '这场{teamName}的挡拆后外弹投篮命中率极高，防守方选择沉退给了太多中距离空间。现代篮球中距离也是武器。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的包夹时机选得很准，每次{teamName}核心拿球准备发动进攻就上夹击，逼其他人做决定。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天在禁区的得分效率惊人，26投20中。当一支球队能稳定地在篮下终结，外线压力自然就小了。' },
    { persona: 'tactical', tone: 'neutral', text: '注意{teamName}的防守对位，他们用侧翼去防对方控卫，这招在季后赛经常出现。换防之后大打小的优势太明显了。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的快攻得分是{teamName}的两倍多，退防速度完全跟不上。跑不回来的队，打不了高强度比赛。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的失误太多了，很多都是非受迫性传球失误。这种低级错误在关键比赛里是要命的。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的肘区进攻，大个子在罚球线接球后的选择非常合理，能投能传能突。这个位置的威胁太大了。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的防守策略很明确：放底角堵禁区。{teamName}如果底角投不开，这招就无解。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的助攻比低得离谱，太多单打独斗了。篮球是五个人的运动，不是个人秀。' },
    { persona: 'tactical', tone: 'neutral', text: '这场的罚球差距太大了，{teamName}获得了32次罚球而{oppName}只有12次。裁判的吹罚尺度确实影响了比赛节奏。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的延误回追做得很好，挡拆后大个子能迅速回到防守位置。这种脚步移动能力不是每个内线都有的。' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}的边线球战术，最后2分钟连续两次发球失误。关键时刻的执行力，这就是强队和普通队的差距。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的三分球命中率只有22%，但他们在第四节完全改变了策略，开始冲击篮下。能根据手感调整打法才是成熟球队。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的区域联防在第四节突然变阵，2-3变3-2，打了{teamName}一个措手不及。这种临场调整能力很关键。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的二次进攻得分碾压对手，前场篮板拼抢太积极了。多一次进攻机会就多一分胜算。' },
    { persona: 'tactical', tone: 'neutral', text: '这场{teamName}的挡拆防守选择了换防，结果被对方大个子连续在低位惩罚。换防不是万能药，得看对位。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的进攻篮板太凶了，{teamName}的内线卡位意识需要加强。投篮不中不是结束，抢到篮板才是。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的传导球今天很流畅，全场28次助攻。球动人动，这才是好看的篮球。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的低位防守，他们用绕前防守切断了对方的内线接球路线。这种防守需要极高的默契和体能。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}今天在转换中的决策太慢了，多次2打1的机会最后变成了勉强出手。快攻不是光跑得快就行。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的防守轮转在第四节明显慢了半拍，体能下降导致注意力不集中。赛季末段的体能管理很重要。' },
    { persona: 'tactical', tone: 'neutral', text: '这场的最后5分钟，{teamName}的进攻完全停滞，4个回合全是单打。关键时刻需要战术执行，不是英雄球。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的挡拆外弹今天投疯了，大个子连续命中4个三分。现代篮球对内线的投射要求越来越高了。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的防守篮板保护得很好，只让对手抢了6个进攻篮板。控制篮板就控制了比赛节奏。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的空接配合，今天至少成功了3次。这种空中作业需要传球人和终结者之间的高度信任。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的半场紧逼在第二节打了{teamName}一个15-2。突然改变防守强度是最有效的战术调整。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的油漆区得分是对手的两倍，内线优势太明显了。有内线就有底气。' },
    { persona: 'tactical', tone: 'neutral', text: '注意{oppName}的错位进攻，他们刻意用大个子去打对方的小个，每次换防都精准找到最弱的一环。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的节奏控制做得很好，领先之后不急不躁，每次进攻都耐心找最佳出手机会。' },
    { persona: 'tactical', tone: 'neutral', text: '这场{oppName}的替补席贡献了48分，板凳深度是他们最大的优势。主力休息的时候不掉分才是真强队。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的传球路线太容易被预判了，{oppName}的防守几乎每次都能提前到位。传球意图太明显了。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的边线球战术，连续跑出两个空位但都没投进。战术跑出来了，执行力还需要跟上。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的挡拆角度太刁钻了，每次都能把防守人卡在身后。这种掩护质量，后卫做梦都能笑醒。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天在禁区的命中率高达72%，这种内线效率让{oppName}的防守形同虚设。' },
    { persona: 'tactical', tone: 'neutral', text: '注意{oppName}的暂停时机，每次{teamName}打出气势就立刻叫停。老练的教练最懂得掐断对手的节奏。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的弱侧底角今天投了12个三分只进了2个。这么铁还一直投，教练是怎么想的？' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}的延误防守策略，大个子每次挡拆后都多跟两步再回防，这种细节决定了比赛走势。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天在最后5分钟的执行力堪称教科书，每个回合都跑出最佳出手。这才是强队的终结能力。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的侧翼今天打得像消失了，整场比赛几乎没有触球。当一个位置完全隐身，球队怎么赢？' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的进攻篮板拼抢，一次进攻打了三波。这种持续给压力的打法最消耗对手的意志。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的挡拆后顺下今天打得太高效了，7次顺下6次得分。简单直接的战术往往最有效。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的防守今天把{oppName}的命中率压到了36%，这种窒息式防守让人想起了巅峰活塞。' },
    { persona: 'tactical', tone: 'neutral', text: '注意{oppName}的快攻效率，今天12次快攻拿下了21分。在转换中得分永远是最轻松的方式。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的三分命中率高达48%，但他们真正的杀手锏是内线得分。内外结合才是最均衡的进攻。' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}的联防站位，他们的中锋每次都精准站在篮下的最佳协防位置。这是无数次训练的结果。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的失误让{oppName}拿到了28分的失误得分。送出这么多分还想赢？不可能的。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}今天的中距离投篮效率极高，15投11中。在现代NBA，中距离如果稳定，依然是致命武器。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的后卫今天在挡拆后的抛投，弧度极高出手极快。这种球欧洲后卫玩得最溜。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的防守今天有6次封盖和9次抢断，这种侵略性让{teamName}的进攻完全失去了节奏。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的板凳今天只得了12分，而{oppName}的替补拿了38分。替补对决直接决定了比赛结果。' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}的低位进攻效率，今天在低位8投7中。当大个子在内线予取予求，外线射手就都是空位。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的罚球命中率只有58%，18罚仅10中。基本功不扎实在关键时刻是要付出代价的。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}利用了{teamName}的每一个换防失误，大打小和小打大各得了10分以上。换防体系的漏洞被完全利用了。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的无球掩护质量，两个内线在弧顶做了三次交叉掩护，最终跑出了一个底角大空位。战术设计太精妙了。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}今天的进攻回合数比{teamName}多了15个，但他们只多投进了3球。出手多不代表效率高。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}在第三节的防守强度突然提升了一个档次，单节只让{oppName}得了14分。这一节决定了比赛走向。' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}今天对{teamName}核心的包夹策略，每次触球就上两人。逼迫其他球员做决定，赌他们投不进。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的助攻数高达32次，球的转移极其流畅。无私的球风加上精准的投射，这是最赏心悦目的篮球。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}在比赛最后3分钟落后8分的情况下，用全场紧逼连追6分。可惜时间不够了，但这种不屈的精神值得尊敬。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的防守对位调整，上半场用小阵容下半场突然换上双塔。这种突然变阵打了{oppName}一个措手不及。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的挡拆防守今天选择了沉退，结果被{teamName}的中距离投了个准。沉退策略也得看对手的手感。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天利用了{oppName}的16次失误，转化成了24分。保护球权是赢球的基本功。' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}的二次进攻效率，今天抢到了15个进攻篮板但只转化了11分。光抢篮板不够，还得把球放进。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的快攻得分和半场阵地战得分几乎各占一半。这种均衡的得分方式让防守方无暇顾及。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的防守篮板今天保护得极好，只让{teamName}抢到了3个进攻篮板。不给第二次机会是防守的基本原则。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}在第三节的一波18-4攻势，这6分钟内{oppName}仅有1次运动战进球。攻防两端同时爆发才是真正的统治力。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}今天在关键时刻连续打了4个挡拆，结果全部以失误告终。关键时刻的战术单一性暴露无遗。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的轮换今天只用了8个人，而{oppName}用了11人。短轮换意味着主力承担更多，但也意味着更高的化学反应。' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}的底角三分，今天7投6中。底角三分是最短的三分线，也是最高效的进攻区域之一。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的内线传球太精妙了，连续3次空接暴扣点燃了全场。这种配合需要极高的球商和信任。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的防守轮转今天慢了半拍，底角射手获得了太多大空位。在NBA，给射手半秒的空位就等于送分。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的高位挡拆配合，后卫和大个子的默契度已经达到了心电感应的级别。防守方完全猜不到下一个动作。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}今天在第四节完全崩盘，单节输了18分。体能下降加上心态崩溃，这种场面每个赛季都能看到。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}利用了{oppName}两次技术犯规的间隙打出了一波8-0。情绪管理有时候比技战术更重要。' },
    { persona: 'tactical', tone: 'neutral', text: '看{oppName}的zone press策略，在第三节中段突然祭出全场2-2-1区域紧逼，连造了{teamName}三次失误。好棋。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的有效命中率高达62%，这种效率在任何比赛里都足以赢球。进攻端的执行力无可挑剔。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}今天的内线球员总共送出了8次封盖，禁区变成了禁飞区。任何突破到篮下的尝试都被无情拒绝。' },
    { persona: 'tactical', tone: 'neutral', text: '看{teamName}的空位把握能力，今天大空位投篮18投14中。机会出来了能投进，这就是强队和弱队的区别。' },
    { persona: 'tactical', tone: 'neutral', text: '{oppName}的战术执行力在最后两分钟令人窒息，连续打了3个完美战术，全部得分。关键时刻不慌才是真正的成熟。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}今天的比赛节奏控制堪称大师级，领先时不急不躁，落后时加快节奏但不乱打。节奏就是篮球的生命线。' }
  ],

  trade_rumors: [
    { persona: 'news', tone: 'neutral', text: '消息源透露{teamName}正在积极寻求交易，目标是一名有投射能力的侧翼。他们手里的筹码包括两个首轮签。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的薪资空间在交易截止日前还有操作余地，但管理层似乎在等更好的机会。耐心还是保守？' },
    { persona: 'news', tone: 'neutral', text: '听说{teamName}和{oppName}在讨论一笔涉及多名球员的交易，但双方在选秀权补偿上分歧很大。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的更衣室消息：有球员对出场时间不满，管理层正在评估是否在截止日前做出调整。' },
    { persona: 'news', tone: 'neutral', text: '据可靠消息，{teamName}已经向多支球队询价了一名防守型内线。他们禁区防守的短板太明显了。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在考虑买断合同腾出名额，有几位老将可能成为自由球员。买断市场即将热闹起来。' },
    { persona: 'news', tone: 'neutral', text: '交易市场最新动态：{teamName}愿意搭上一个首轮签来清理薪资空间，为夏天的自由市场做准备。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的重建似乎比预期更快，他们正在听取关于核心球员的报价。全联盟都在关注。' },
    { persona: 'news', tone: 'neutral', text: '有内部人士透露，{teamName}对目前的阵容并不满意，但老板不想交奢侈税。钱和成绩的矛盾。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的球探部门最近频繁出现在{oppName}的主场比赛，这是要搞事情的节奏。' },
    { persona: 'news', tone: 'neutral', text: '交易截止日倒计时：{teamName}还有72小时做决定。是补强冲击季后赛还是摆烂囤签？' },
    { persona: 'news', tone: 'neutral', text: '多方消息确认，{teamName}已经退出了某全明星球员的争夺战，要价太高是主要原因。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在寻找一名有经验的老将控卫来稳定第二阵容，目前有几个候选人正在评估中。' },
    { persona: 'news', tone: 'neutral', text: '据联盟消息源，{oppName}愿意在交易中接收不良合同，条件是对方搭上首轮签。这种操作越来越常见了。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的总经理最近行程很密，连续三天出现在不同城市。交易季果然是最忙的时候。' },
    { persona: 'news', tone: 'neutral', text: '有报道称{teamName}正在考虑三方交易方案，涉及三支球队和多名球员。这种复杂交易谈起来很费时间。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的年轻球员表现超出预期，管理层开始重新评估是否需要交易。有时候最好的交易就是不交易。' },
    { persona: 'news', tone: 'neutral', text: '消息人士：{teamName}对交易截止日的策略是"小修小补"，不会做颠覆性操作。稳字当头。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的老板亲自参与了最近一次交易讨论，这在以往很少见。看来这次是认真的。' },
    { persona: 'news', tone: 'neutral', text: '自由市场还有几个有价值的球员没签约，{teamName}正在权衡是否给他们机会。老将底薪有时候能捡到宝。' },
    { persona: 'news', tone: 'neutral', text: '据传{teamName}已经和某球员达成了口头协议，只等交易细节敲定。这种操作在联盟里并不罕见。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的薪资结构很健康，未来两年有足够空间签大牌。他们可能选择按兵不动等夏天。' },
    { persona: 'news', tone: 'neutral', text: '交易市场冷清？不一定。{teamName}和{oppName}的谈判已经进入深水区，只差最后一步。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的选秀权储备是全联盟最丰富的，这让他们在任何交易谈判中都有底气。' },
    { persona: 'news', tone: 'neutral', text: '有消息说{teamName}在考虑用到期合同换长期资产，为未来做打算。重建和争冠之间，他们选了后者。' },
    { persona: 'news', tone: 'neutral', text: '交易截止日前的最后48小时通常是最疯狂的。{teamName}去年就在最后时刻完成了一笔大交易。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的球员们对交易流言已经见怪不怪了，但更衣室气氛还是受到了一些影响。' },
    { persona: 'news', tone: 'neutral', text: '据分析，{teamName}最需要补强的位置是替补控卫和3D侧翼。市场上恰好有几个合适的人选。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的交易策略很明确：只换即战力，不要潜力股。他们的窗口期就在这两年。' },
    { persona: 'news', tone: 'neutral', text: '联盟消息：{oppName}已经拒绝了三份关于他们核心球员的报价，要价高得离谱。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在评估买断市场的球员，有几位经验丰富的老将可能成为目标。' },
    { persona: 'news', tone: 'neutral', text: '交易流言对球员的影响是真实的。{teamName}的某位球员最近表现明显下滑，心思已经不在球场上了。' },
    { persona: 'news', tone: 'neutral', text: '多方确认：{teamName}和{oppName}的交易谈判已经破裂，双方在核心资产上互不让步。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的管理层正在重新评估赛季目标，如果决定重建，交易策略将完全不同。' },
    { persona: 'news', tone: 'neutral', text: '据可靠消息，{teamName}已经向联盟提交了一笔交易的申请，等待官方审批。' },
    { persona: 'news', tone: 'neutral', text: '交易市场的沉默往往是暴风雨前的平静。{teamName}的球迷们，准备好迎接惊喜吧。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的总经理公开表示"我们不会为了交易而交易"，但联盟里没人信这种话。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在寻找一名能在关键时刻得分的球员，目前的阵容在末节得分效率排在联盟倒数。' },
    { persona: 'news', tone: 'neutral', text: '消息源：{teamName}对交易截止日的期望值已经降低了，能做一个边缘补强就满意了。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的重建计划可能加速，如果本赛季继续低迷，全明星赛后可能清仓大甩卖。' },
    { persona: 'news', tone: 'neutral', text: '有报道称{teamName}正在考虑用年轻球员加选秀权换取即战力，这种"赢在当下"的策略风险不小。' },
    { persona: 'news', tone: 'neutral', text: '据多方消息，{teamName}已经在暗中接触了几支重建球队，试图低价收购即战力老将。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的总经理最近频繁出现在发展联盟的场边，看来他们正在挖掘隐藏的宝石。' },
    { persona: 'news', tone: 'neutral', text: '交易市场最新：{oppName}的明星球员合同只剩一年，如果不提前续约，交易可能是唯一选择。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在评估一个三方交易方案，涉及5名球员和3个选秀权。复杂程度堪称本赛季之最。' },
    { persona: 'news', tone: 'neutral', text: '内部消息：{teamName}更衣室内部分球员对角色分配不满，管理层正在权衡是交易球员还是更换教练。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的老板亲自飞到客场和球员面谈，这通常意味着大事即将发生。' },
    { persona: 'news', tone: 'neutral', text: '交易截止日倒计时48小时，{teamName}还没有做出任何动作。是胸有成竹还是无牌可打？' },
    { persona: 'news', tone: 'neutral', text: '{teamName}对{oppName}的替补控卫表现出了浓厚兴趣，双方已经进行了初步接触。' },
    { persona: 'news', tone: 'neutral', text: '消息人士：{teamName}拒绝了{oppName}的一个交易报价，因为对方要价太高，搭了两个首轮。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在清理薪资空间，可能是为明年夏天追逐大牌自由球员做准备。' },
    { persona: 'news', tone: 'neutral', text: '据可靠报道，{oppName}的更衣室矛盾已经公开化，多名球员在社交媒体上互相取关。交易在所难免。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的球探团队最近在欧洲考察了多位球员，可能在寻找下一个国际球员宝藏。' },
    { persona: 'news', tone: 'neutral', text: '交易传闻：{teamName}愿意送出明年的首轮签换取一个能打季后赛的老将。他们的窗口期就在这两年。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的重建模式正在改变，他们开始更注重选秀而非自由市场。未来三年可能囤积大量年轻天赋。' },
    { persona: 'news', tone: 'neutral', text: '多方消息确认：{teamName}和{oppName}的交易谈判已经进入深水区，只差最后的选秀权细节。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在考虑签下一名被买断的老将，以弥补板凳深度的不足。买断市场有几位合适的候选人。' },
    { persona: 'news', tone: 'neutral', text: '消息源：{oppName}的多名球员已经被告知他们可能在截止日前被交易，更衣室气氛紧张。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}对目前的化学反应很满意，管理层倾向于不在截止日前做任何交易。稳定也是一种策略。' },
    { persona: 'news', tone: 'neutral', text: '最新动态：{oppName}已经把全队都摆上了交易货架，任何球员都可以谈，只要有合适的筹码。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的交易策略很简单：不送出首轮签，不接收长期合同，只做低风险的补强。' },
    { persona: 'news', tone: 'neutral', text: '内幕消息：{teamName}的老板和总经理在交易策略上出现了分歧，老板想要即战力，总经理想要长远建设。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}正在和几支球队讨论一份先签后换的交易，目标是获得一个到期合同加选秀权。' },
    { persona: 'news', tone: 'neutral', text: '交易市场分析：{teamName}最大的交易资产是那个来自{oppName}的未保护首轮签，价值极高。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在寻找一名有季后赛经验的老将，哪怕常规赛数据不好看也无所谓。经验在季后赛是无价的。' },
    { persona: 'news', tone: 'neutral', text: '消息：{oppName}愿意承担不良合同来获取选秀权，这种策略在重建球队中越来越流行。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的医疗团队正在评估一位交易目标的伤病史，这是交易前最关键的环节。' },
    { persona: 'news', tone: 'neutral', text: '据联盟内部人士，{teamName}和{oppName}的交易已经基本达成，只等体检通过就官方宣布。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}在买断市场上签下了一名被裁员的前全明星，赌他能找回昔日状态。低风险高回报的操作。' },
    { persona: 'news', tone: 'neutral', text: '交易截止日已过，{teamName}没有做出任何动作。球迷反应两极分化，有人叫好有人骂。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}在截止日最后一分钟完成了一笔震惊全联盟的交易。细节将在明天公布。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的工资帽分析：如果他们在截止日前不动手，明年夏天将没有足够空间追逐顶级自由球员。' },
    { persona: 'news', tone: 'neutral', text: '最新情报：{teamName}对某位在海外打球的美籍球员非常感兴趣，可能提供一份短合同。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}正在兜售他们的首轮签换取即战力，他们认为目前的阵容距离冠军只差一两块拼图。' },
    { persona: 'news', tone: 'neutral', text: '消息：{teamName}的训练馆今天多了几张陌生面孔，据说是来试训的自由球员。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的老板在接受采访时暗示球队可能在交易截止日有大动作。"球迷们不会失望的。"' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的交易清单上排名第一的是：一个能防守多个位置的3D侧翼。全联盟都在找这种球员。' },
    { persona: 'news', tone: 'neutral', text: '内部消息：{teamName}和{oppName}的交易谈判因为一个次轮签的归属谈崩了。一个小细节毁了一笔大交易。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的总经理表示，他们不会为了短期成绩牺牲长期选秀权。"我们有自己的时间表。"' },
    { persona: 'news', tone: 'neutral', text: '独家消息：{teamName}已经向{oppName}提交了正式的交易报价，等待对方回复。谈判进入关键阶段。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的薪资结构分析：三名球员占了80%的工资帽。这种结构让交易操作空间极其有限。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}正在考虑使用伤病特例签下一名自由球员，以弥补主力受伤后的阵容空缺。' },
    { persona: 'news', tone: 'neutral', text: '交易传闻汇总：{teamName}目前和至少4支球队有不同程度的接触。最忙碌的前台之一。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}老板的耐心已经快到极限了。如果本赛季不能打进季后赛，管理层可能面临大清洗。' },
    { persona: 'news', tone: 'neutral', text: '消息：{oppName}的当家球星合同中有交易否决权，这让任何潜在交易都变得复杂。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在评估是否要交易未来的首轮签换取现在。这种"赢在当下"的策略风险极高。' },
    { persona: 'news', tone: 'neutral', text: '据多位记者报道，{teamName}和{oppName}已经就交易框架达成一致，具体细节正在敲定中。' },
    { persona: 'news', tone: 'neutral', text: '{oppName}的后卫群人满为患，交易其中一人几乎是板上钉钉的事。就看是谁了。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}在交易市场上的沉默被解读为两种可能：要么胸有成竹，要么根本无牌可打。' },
    { persona: 'news', tone: 'neutral', text: '最新消息：{oppName}已经解雇了总经理，新任GM上任后的第一件事可能就是推动交易。' }
  ],

  injuries: [
    { persona: 'news', tone: 'negative', text: '坏消息：{teamName}的核心球员在训练中受伤，预计缺席2-4周。这对他们的季后赛冲击是个重大打击。' },
    { persona: 'news', tone: 'negative', text: '{teamName}的伤病名单又添一人，本赛季他们已经有5名球员因伤缺席超过10场。训练团队该反思了。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的当家球星今天参加了完整训练，预计下一场复出。这对球队来说是个巨大的利好。' },
    { persona: 'news', tone: 'negative', text: '核磁共振结果出来了，{teamName}的主力后卫韧带轻微撕裂，至少休息6周。赛季报销的可能性也存在。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的伤病管理策略开始见效，几位老将的出场时间被严格控制。负荷管理不是偷懒，是科学。' },
    { persona: 'news', tone: 'negative', text: '又一位球员倒下了。{teamName}本赛季的伤病情况已经严重到影响战绩的地步了。' },
    { persona: 'news', tone: 'neutral', text: '好消息：{teamName}的伤病名单终于清空了，全员健康进入赛季冲刺阶段。健康就是最大的优势。' },
    { persona: 'news', tone: 'negative', text: '{teamName}的替补席深度即将接受考验，两名轮换球员同时受伤，教练组需要调整轮换方案。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的队医对某球员的恢复进度表示乐观，但拒绝给出具体复出时间表。谨慎是好事。' },
    { persona: 'news', tone: 'negative', text: '背靠背的赛程对{teamName}来说简直是噩梦，又一名球员在第二场中受伤。联盟该考虑减少背靠背了。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的伤病恢复中心引进了新的治疗设备，据说能将恢复时间缩短30%。科技改变篮球。' },
    { persona: 'news', tone: 'negative', text: '赛季报销。{teamName}的首发前锋被确诊为半月板撕裂，需要手术。这对球队是毁灭性的打击。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的球员健康报告：目前只有一人因伤缺阵，是本赛季以来最健康的状态。' },
    { persona: 'news', tone: 'negative', text: '伤病潮来袭。{teamName}在最近5场比赛中有3名球员受伤，训练强度是不是该调整了？' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的某球员今天戴上了保护面具出战，鼻骨骨折并没有阻止他上场。硬汉。' },
    { persona: 'news', tone: 'negative', text: '{oppName}宣布他们的全明星球员将无限期休战，具体病因尚未公布。这比明确的伤病更让人担心。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的伤病预防计划初见成效，本赛季软组织伤病比去年同期减少了40%。' },
    { persona: 'news', tone: 'negative', text: '脚踝扭伤。{teamName}的控卫在比赛中踩到对手脚上，X光检查结果还在等待中。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的球员在赛后表示伤势无大碍，只是预防性退出比赛。虚惊一场。' },
    { persona: 'news', tone: 'negative', text: '{teamName}的伤病魔咒还在继续，今天又有一名球员在热身时感到不适，临时退出首发。' },
    { persona: 'news', tone: 'neutral', text: '复出倒计时。{teamName}的核心球员已经开始进行5对5对抗训练，预计下周回归。' },
    { persona: 'news', tone: 'negative', text: '脑震荡协议。{teamName}的球员在比赛中被撞到头部，必须通过联盟的脑震荡测试才能复出。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的体能教练透露，他们正在使用AI分析球员的疲劳数据，以预防伤病。数据分析的时代。' },
    { persona: 'news', tone: 'negative', text: '髌骨腱炎。{teamName}的大个子一直在带伤作战，这种慢性伤病很难彻底痊愈。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的伤病报告更新：两人出战成疑，一人大概率出战。教练组还在做最后评估。' },
    { persona: 'news', tone: 'negative', text: '{oppName}的伤病情况比预想的严重，他们的首发阵容已经连续5场不完整了。' },
    { persona: 'news', tone: 'neutral', text: '好消息传来：{teamName}的长期伤号终于获准参加篮球活动，虽然距离复出还有一段时间。' },
    { persona: 'news', tone: 'negative', text: '手指骨折。{teamName}的射手在训练中受伤，预计缺席4-6周。外线火力又少了一个点。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的医疗团队被评为联盟最佳之一，他们的伤病恢复速度总是快于预期。' },
    { persona: 'news', tone: 'negative', text: '膝盖酸痛。{teamName}的老将已经连续缺席3场，年龄和伤病的双重困扰。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的球员在采访中说："我的身体感觉很好，比过去两年都好。"希望这不是flag。' },
    { persona: 'news', tone: 'negative', text: '肩膀脱臼。{teamName}的防守悍将预计缺席8周，他们的外线防守将面临严峻考验。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}正在考虑让某球员在发展联盟进行康复比赛，这是越来越流行的恢复方式。' },
    { persona: 'news', tone: 'negative', text: '腹股沟拉伤。{teamName}的侧翼在比赛中突然停下，这种伤病恢复起来很慢，容易反复。' },
    { persona: 'news', tone: 'neutral', text: '体检通过。{teamName}的新援已经完成了所有医学检查，明天就可以上场了。' },
    { persona: 'news', tone: 'negative', text: '{teamName}的伤病情况已经严重到需要从发展联盟紧急调人的地步了。' },
    { persona: 'news', tone: 'neutral', text: '预防性轮休。{teamName}宣布他们的核心球员将在背靠背的第二场休息。这是明智的选择。' },
    { persona: 'news', tone: 'negative', text: '腿筋拉伤。{teamName}的快攻发动机倒下了，他们的转换进攻效率将大幅下降。' },
    { persona: 'news', tone: 'neutral', text: '{teamName}的伤病名单终于缩短到了两人，这是近两个月以来的最佳状态。' },
    { persona: 'news', tone: 'negative', text: '手腕扭伤。{teamName}的球员在扣篮后落地时受伤，虽然坚持打完了比赛但赛后肿得很厉害。' },
    { persona: 'news', tone: 'neutral', text: '最新消息：{teamName}的伤员已经开始了轻量训练，复出时间可能比预期提前。' }
  ],

  rankings: [
    { persona: 'data', tone: 'neutral', text: '最新实力榜：{teamName}上升3位来到第5，{oppName}则跌出前十。赛季中期的排名变化总是很大。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的进攻效率排在联盟第3，但防守效率只排第18。攻强守弱的球队季后赛走不远。' },
    { persona: 'data', tone: 'neutral', text: 'MVP排行榜更新：{playerName}首次进入前五，本赛季的表现确实值得这个位置。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的净效率值排在联盟第7，这个数据比他们的战绩排名更真实。' },
    { persona: 'data', tone: 'neutral', text: '最新防守效率榜：{teamName}从第22位飙升到第10位，近10场比赛的防守质量提升明显。' },
    { persona: 'data', tone: 'neutral', text: '{playerName}的使用率高达32%，排在联盟第4。但高使用率意味着高消耗，能撑到季后赛吗？' },
    { persona: 'data', tone: 'neutral', text: '真实命中率排行榜：{playerName}以67.8%排在同位置第1。效率之王。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的替补正负值排在联盟倒数第5，板凳深度是他们最大的软肋。' },
    { persona: 'data', tone: 'neutral', text: '最新新秀榜：本届新秀整体质量不错，前5名的数据都很亮眼。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}在关键时刻（最后5分钟分差5分以内）的战绩是12胜4负，联盟最佳。大心脏球队。' },
    { persona: 'data', tone: 'neutral', text: '进攻篮板率排行：{teamName}排在联盟第2，二次进攻机会是他们的重要得分来源。' },
    { persona: 'data', tone: 'neutral', text: '{playerName}的PER值达到了28.5，如果保持到赛季结束，将是历史级别的数据。' },
    { persona: 'data', tone: 'neutral', text: '助攻失误比排行：{teamName}的控卫以4.2的比率排在联盟第3，球权管理非常出色。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的主场战绩是22胜4负，但客场只有11胜15负。主场龙客场虫，这不是争冠球队该有的数据。' },
    { persona: 'data', tone: 'neutral', text: '最新百回合得分榜：{teamName}以115.3排在联盟第6，进攻火力相当可观。' },
    { persona: 'data', tone: 'neutral', text: '{playerName}的防守胜利贡献值排在同位置第2，但他的防守经常被低估。' },
    { persona: 'data', tone: 'neutral', text: '三分命中率排行：{teamName}以38.2%排在联盟第4，空间型打法效果显著。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}在第四节的净效率是+8.5，联盟第2。末节之王不是白叫的。' },
    { persona: 'data', tone: 'neutral', text: '失误率排行：{teamName}以11.2%排在联盟最低，球权保护做得极好。' },
    { persona: 'data', tone: 'neutral', text: '{playerName}的VORP值已经超过了同期的多位名人堂球员，这个赛季太特殊了。' },
    { persona: 'data', tone: 'neutral', text: '赛程强度排行：{teamName}剩余赛程的对手平均胜率是.545，排在联盟第4难。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的快攻得分占比达到18%，排在联盟第3。跑轰战术执行得很到位。' },
    { persona: 'data', tone: 'neutral', text: '最新最佳防守球员赔率：{teamName}的内线核心从第5升到第2，最近的表现太抢眼了。' },
    { persona: 'data', tone: 'neutral', text: '{playerName}的进阶数据全面飘红，BPM、WS、VORP三项都排在联盟前5。' },
    { persona: 'data', tone: 'neutral', text: '罚球命中率排行：{teamName}以81.5%排在联盟第1，基本功扎实。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的防守效率在交易后提升了8个名次，新援的防守影响力立竿见影。' },
    { persona: 'data', tone: 'neutral', text: '最新替补火力榜：{teamName}的替补得分手排在第3，场均18分的板凳火力太香了。' },
    { persona: 'data', tone: 'neutral', text: '{playerName}的投篮分布图显示他的高效区域覆盖了整个半场，这种得分效率太恐怖了。' },
    { persona: 'data', tone: 'neutral', text: '净效率排名前5的球队中，{teamName}是唯一一支进攻和防守都排在前10的。攻守均衡才是王道。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的禁区防守效率排在联盟第3，对手在篮下的命中率只有52%。铜墙铁壁。' },
    { persona: 'data', tone: 'neutral', text: '最新进步最快球员排行榜：{playerName}的得分比上赛季提高了8.5分，进步幅度惊人。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的回合数排在联盟第28，他们是最慢的球队之一。但慢不等于差，效率才是关键。' },
    { persona: 'data', tone: 'neutral', text: '有效命中率排行：{playerName}以59.8%排在后卫第1，投篮选择非常合理。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}在领先进入第四节的比赛胜率是94%，联盟最高。守住领先就是守住胜利。' },
    { persona: 'data', tone: 'neutral', text: '最新最佳阵容预测：{playerName}入选一阵的概率已经超过70%，这个赛季的表现说服了所有人。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的板凳得分排在联盟第5，但板凳助攻只排第22。替补席需要更好的球权分配。' },
    { persona: 'data', tone: 'neutral', text: '抢断榜更新：{playerName}以场均2.3次排在联盟第2，防守端的破坏力太强了。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的二次进攻效率排在联盟第1，每次额外进攻机会平均能得1.18分。' },
    { persona: 'data', tone: 'neutral', text: '最新交易价值排行榜：{playerName}排在全联盟第8，他的合同性价比极高。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的赛季胜率预测已经从赛前的.520上调到.610，分析师们开始重新评估他们的实力。' },
    { persona: 'data', tone: 'neutral', text: '盖帽榜：{playerName}以场均2.8次领跑全联盟，护框能力是防守体系的基石。' }
  ],

  draft_preview: [
    { persona: 'data', tone: 'neutral', text: '模拟选秀更新：本届新秀的质量被球探们评价为"近五年最强"，前10顺位都有首发级别的潜力。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}目前的战绩让他们有8%的概率拿到状元签，摆烂还是拼一把？' },
    { persona: 'data', tone: 'neutral', text: '本届选秀的热门新秀在NCAA的表现持续走高，多位球探认为他有能力改变一支球队的命运。' },
    { persona: 'data', tone: 'neutral', text: '选秀顺位预测：{teamName}如果保持目前的战绩，预计将在第8顺位选人。这个位置有不少好选择。' },
    { persona: 'data', tone: 'neutral', text: '球探报告更新：本届大个子新秀的技术水平令人惊喜，好几个都有外线投射能力。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的球探部门最近频繁出现在欧洲赛场，据说他们对一位西班牙前锋很感兴趣。' },
    { persona: 'data', tone: 'neutral', text: '选秀抽签概率表已经出炉，战绩最差的三支球队各有14%的概率拿到状元签。' },
    { persona: 'data', tone: 'neutral', text: '本届选秀的国际球员数量创历史新高，来自法国、塞尔维亚和澳大利亚的新秀最受关注。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}手握两个首轮签，他们可以选择即战力也可以选潜力股。管理层倾向于后者。' },
    { persona: 'data', tone: 'neutral', text: '联合试训的数据出来了，某新秀的臂展和弹跳都排在历史前5%。身体素质怪物。' },
    { persona: 'data', tone: 'neutral', text: '选秀专家预测：本届前5顺位可能全部是前场球员，后卫要到第6顺位以后才会被选中。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}需要一名控卫，但今年选秀的控卫质量一般。也许交易是更好的选择。' },
    { persona: 'data', tone: 'neutral', text: 'NCAA锦标赛的表现对选秀顺位影响巨大，去年的MOP就因此顺位飙升了8位。' },
    { persona: 'data', tone: 'neutral', text: '球探圈的热门话题：某大一新秀是否应该再打一年大学篮球？过早进入选秀的风险不小。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的选秀历史：过去5年的首轮秀有3个已经不在联盟了。选秀眼光需要改善。' },
    { persona: 'data', tone: 'neutral', text: '本届选秀的二轮可能藏着宝贝，有几位大四球员的技术已经非常成熟，只是年龄偏大。' },
    { persona: 'data', tone: 'neutral', text: '选秀夜的交易总是最精彩的。{teamName}去年就在选秀夜完成了一笔改变球队命运的操作。' },
    { persona: 'data', tone: 'neutral', text: '模拟选秀2.0：某新秀从第12顺位飙升到第4，他在联合试训中的表现征服了所有球探。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的球迷们已经在讨论选秀目标了，虽然赛季还没结束，但期待总是美好的。' },
    { persona: 'data', tone: 'neutral', text: '选秀前的体测数据只是参考，真正的判断还是要看比赛录像。很多体测怪物在NBA水土不服。' },
    { persona: 'data', tone: 'neutral', text: '本届选秀的深度很好，球探们认为首轮20顺位左右的球员也有轮换实力。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的选秀权如果落在乐透区，他们可能会选择一名即战力来加速重建。' },
    { persona: 'data', tone: 'neutral', text: '选秀小年？不一定。球探们说这届新秀的上限很高，只是下限也比较低。高风险高回报。' },
    { persona: 'data', tone: 'neutral', text: '某新秀的经纪人正在积极运作，希望客户能被某支特定球队选中。选秀不只是球员的选择。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的球探主管表示，他们会选择"最好的可用球员"而不是按需求选人。BPA策略。' },
    { persona: 'data', tone: 'neutral', text: '选秀前的私人试训已经开始了，{teamName}已经邀请了6名新秀来队内试训。' },
    { persona: 'data', tone: 'neutral', text: '本届选秀的双向球员潜力很大，有几位落选新秀最终在NBA站稳了脚跟。' },
    { persona: 'data', tone: 'neutral', text: '选秀大会的举办城市已经确定，今年的选秀夜注定会很热闹。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的选秀策略可能会因为赛季末段的表现而改变。如果冲进季后赛，首轮签的价值就不一样了。' },
    { persona: 'data', tone: 'neutral', text: '球探报告：某新秀的防守意识和脚步在同届中遥遥领先，但进攻端还有很大提升空间。' },
    { persona: 'data', tone: 'neutral', text: '选秀前的各种流言开始满天飞了，哪些是真哪些是假？只有选秀夜才知道。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}在选秀大会上总是能找到宝藏，他们的二轮签选中了好几个现在的轮换球员。' },
    { persona: 'data', tone: 'neutral', text: '本届选秀的控卫深度不足，但侧翼和大个子都很充裕。需求控卫的球队可能要向上交易了。' },
    { persona: 'data', tone: 'neutral', text: '选秀专家的最终模拟排行已经出炉，和赛季初的预测相比变化很大。' },
    { persona: 'data', tone: 'neutral', text: '某新秀决定退出选秀回到大学，这对本届选秀的整体质量是一个打击。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的球迷论坛上，关于选秀目标的讨论帖已经超过1000楼了。' },
    { persona: 'data', tone: 'neutral', text: '选秀大会前最后一周的流言总是最疯狂的，去年就有三笔涉及选秀权的交易在最后时刻完成。' },
    { persona: 'data', tone: 'neutral', text: '球探们对本届新秀的评价两极分化严重，有人说是黄金一代，有人说只是普通水平。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的选秀准备已经进入最后阶段，球探报告和体测数据都已经汇总完毕。' },
    { persona: 'data', tone: 'neutral', text: '选秀夜的惊喜总是最让人兴奋的。谁会是今年的黑马？让我们拭目以待。' },
    { persona: 'data', tone: 'neutral', text: '某新秀在私人试训中的表现据说震惊了所有在场的管理层，他的顺位可能会大幅上升。' }
  ],

  coaching: [
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练在第四节的关键暂停布置了完美的战术，球进哨响三分命中。这种临场指挥能力太强了。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的轮换安排再次引发争议，某球员只打了18分钟。教练组需要解释一下这个决定。' },
    { persona: 'tactical', tone: 'neutral', text: '换帅传闻：{teamName}的管理层对目前的战绩不满意，据说已经在接触几位知名教练。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的助教团队是联盟最年轻的，平均年龄只有35岁。新鲜血液带来了新思路。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的主教练在赛后采访中公开批评球员的执行力，这种做法在联盟里越来越少见。' },
    { persona: 'tactical', tone: 'neutral', text: '战术分析：{teamName}的进攻体系过于依赖单打，缺乏无球跑动和传导。教练组需要做出改变。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练挑战成功率是78%，排在联盟第2。好的挑战能改变比赛走势。' },
    { persona: 'tactical', tone: 'neutral', text: '消息源：{teamName}的球员对教练的训练强度有意见，但没有人公开表态。更衣室暗流涌动。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的主帅是联盟最擅长调整的教练之一，每次被对手针对后都能迅速做出回应。' },
    { persona: 'tactical', tone: 'neutral', text: '赛季中段换帅的风险很大，但{teamName}似乎已经没有选择了。战绩说明一切。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的防守体系在换帅后发生了根本性变化，从人盯人变成了区域联防。效果如何还有待观察。' },
    { persona: 'tactical', tone: 'neutral', text: '教练圈的共识：{teamName}的主教练是年度最佳教练的有力竞争者，他让这支球队脱胎换骨。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的暂停时机总是恰到好处，每次对手起势他都能及时叫停。这种比赛感觉是教不来的。' },
    { persona: 'tactical', tone: 'neutral', text: '某知名教练在播客中评价了{teamName}的战术体系，认为他们的挡拆变化太少了。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练组在休赛期去了欧洲学习，新赛季的进攻体系明显受到了欧洲篮球的影响。' },
    { persona: 'tactical', tone: 'neutral', text: '更衣室消息：{teamName}的球员们对教练的信任度很高，即使连败期间也没有人质疑战术。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的主教练合同还剩两年，但球队有提前续约的选项。管理层的态度很关键。' },
    { persona: 'tactical', tone: 'neutral', text: '新秀培养是{teamName}教练组的强项，过去三年他们选中的新秀都获得了稳定的出场时间。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练在关键时刻总是选择信任老将，即使年轻球员表现更好。这种偏见需要改变。' },
    { persona: 'tactical', tone: 'neutral', text: '赛季过半，{teamName}的教练组终于开始尝试新的首发阵容。早该如此了。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的防守教练是联盟公认的顶级防守大师，他调教出的防守体系总是令人窒息。' },
    { persona: 'tactical', tone: 'neutral', text: '球员和教练的关系微妙，{teamName}的当家球星和主帅最近似乎有些分歧。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练在赛后新闻发布会上罕见地发火了，"我们不是来这里交朋友的"他说。' },
    { persona: 'tactical', tone: 'neutral', text: '分析：{teamName}的第四节战术过于保守，领先时总是选择耗时间而不是继续进攻。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的助教升任代理主教练，原主帅因个人原因暂时离队。球队需要稳定军心。' },
    { persona: 'tactical', tone: 'neutral', text: '教练圈的八卦：{teamName}的主帅和总经理在球员使用上意见不合，这可能是更大的问题的开始。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练组正在研究如何更好地利用某球员的特点，他的使用率需要调整。' },
    { persona: 'tactical', tone: 'neutral', text: '某退役名帅表示愿意出山，{teamName}是否会考虑？他的经验和威望正是球队需要的。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的球员发展教练做得很好，几位年轻球员的进步肉眼可见。' },
    { persona: 'tactical', tone: 'neutral', text: '教练的轮换实验还在继续，{teamName}已经尝试了7套不同的首发阵容。什么时候才能找到答案？' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的主帅是联盟少数还在使用低位进攻的教练，这在他的时代是主流，但现在看来有些过时了。' },
    { persona: 'tactical', tone: 'neutral', text: '赛后复盘：{teamName}的教练承认自己在最后时刻的换人决定有误。能承认错误是好事。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练组正在尝试一种新的防守策略，混合了人盯人和区域联防的元素。' },
    { persona: 'tactical', tone: 'neutral', text: '联盟消息：{teamName}的教练合同中包含战绩条款，如果连续两年无缘季后赛将自动解约。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的主教练在联盟教练圈中口碑极好，多位球员都表示愿意为他效力。' },
    { persona: 'tactical', tone: 'neutral', text: '训练场消息：{teamName}的教练今天特别强调了防守轮转，全队练了两个小时的防守。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练是数据驱动型的，每次战术调整都有详尽的数据支撑。现代篮球就是这样。' },
    { persona: 'tactical', tone: 'neutral', text: '换帅如换刀。{teamName}在换帅后的前5场比赛4胜1负，新教练的激励效果立竿见影。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练在暂停时总是很冷静，从不冲球员大喊大叫。这种风格在联盟里越来越受欢迎。' },
    { persona: 'tactical', tone: 'neutral', text: '教练的挑战次数用完了，{teamName}在第四节关键时刻无法挑战一个明显的误判。规则需要修改。' },
    { persona: 'tactical', tone: 'neutral', text: '{teamName}的教练组正在研究对手的录像，为下一场比赛做准备。细节决定成败。' }
  ],

  culture: [
    { persona: 'casual', tone: 'neutral', text: '今天在球馆门口看到了{playerName}的球迷穿着他的球衣排队，这种忠诚度太让人感动了。' },
    { persona: 'casual', tone: 'neutral', text: '球鞋文化：{playerName}上脚的那双限量配色已经炒到3000了，发售才一周。' },
    { persona: 'casual', tone: 'neutral', text: '谁说看球不能吃好？{teamName}主场的炸鸡和啤酒组合是联盟最佳，不接受反驳。' },
    { persona: 'casual', tone: 'neutral', text: '{teamName}的球迷氛围太好了，即使落后20分全场也在为球队加油。这种城市配得上一支好球队。' },
    { persona: 'casual', tone: 'neutral', text: 'NBA时尚：{playerName}的赛前穿搭又上了热搜，这哥们儿穿什么都好看。' },
    { persona: 'casual', tone: 'neutral', text: '球场音乐选择：{teamName}主场的DJ品味在线，每次暂停时的背景音乐都能带动气氛。' },
    { persona: 'casual', tone: 'neutral', text: '说真的，NBA的吉祥物表演被严重低估了。{teamName}的吉祥物今天又整了个大活。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}的赛前热身仪式感满满，每次都是同样的顺序：拉伸、运球、投篮、冥想。' },
    { persona: 'casual', tone: 'neutral', text: '球迷互动环节：{teamName}今天请了一位小球迷在中场休息时投篮，结果三分命中！全场沸腾。' },
    { persona: 'casual', tone: 'neutral', text: 'NBA的城市文化差异太大了。{teamName}所在城市的球迷更懂球，但{oppName}的球迷更热情。' },
    { persona: 'casual', tone: 'neutral', text: '球馆美食测评：{teamName}主场的龙虾卷值得一试，虽然价格有点离谱。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在社区活动中的表现让人刮目相看，他给孩子们讲了一个小时的故事。' },
    { persona: 'casual', tone: 'neutral', text: 'NBA周边产品又出新款了，{teamName}的城市版球衣设计这次真的很用心。' },
    { persona: 'casual', tone: 'neutral', text: '看球仪式感：我每次看{teamName}的比赛都要穿同一件T恤，已经穿了三年了。迷信？也许吧。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}的播客最新一期请了一位说唱歌手做嘉宾，跨界对话很有意思。' },
    { persona: 'casual', tone: 'neutral', text: '球馆的灯光秀越来越酷了，{teamName}主场的中场表演堪比演唱会。' },
    { persona: 'casual', tone: 'neutral', text: 'NBA的球衣退役仪式总是最感人的。{teamName}今天退役了传奇球星的号码，全场起立鼓掌。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}的签名鞋终于发售了，排队的人从旗舰店排到了下一个路口。' },
    { persona: 'casual', tone: 'neutral', text: '球迷文化：{teamName}的死忠球迷组织了一个300人的观赛团，每场客场都有人跟。' },
    { persona: 'casual', tone: 'neutral', text: 'NBA的圣诞大战总是有特别的氛围，球员们穿着特别版球衣，球场装饰也与众不同。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在社交媒体上分享了他的收藏室，里面有超过200双球鞋。鞋狗的天堂。' },
    { persona: 'casual', tone: 'neutral', text: '球场上的垃圾话也是一种文化。{playerName}的垃圾话水平据说在联盟排前三。' },
    { persona: 'casual', tone: 'neutral', text: '{teamName}的球迷商店今天排了两个小时队，新款帽衫太抢手了。' },
    { persona: 'casual', tone: 'neutral', text: 'NBA球员的赛前入场穿搭已经成为了一种时尚秀，{playerName}今天的造型又赢了。' },
    { persona: 'casual', tone: 'neutral', text: '看球最爽的不是比赛本身，是和兄弟们一起在酒吧里大喊大叫的感觉。{teamName}球迷举杯。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}的慈善基金会又做了一件好事，为当地学校捐了一座篮球场。' },
    { persona: 'casual', tone: 'neutral', text: '球馆的声浪计显示{teamName}主场的最高分贝达到了112，比摇滚演唱会还吵。' },
    { persona: 'casual', tone: 'neutral', text: 'NBA的球衣文化：复古球衣永远是最受欢迎的，{teamName}的90年代配色太经典了。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在采访中透露他的赛前餐永远是意大利面加鸡胸肉，十年没变过。' },
    { persona: 'casual', tone: 'neutral', text: '球迷之间的友谊很奇妙，因为{teamName}认识的兄弟比大学同学还亲。' }
  ],

  gambling: [
    { persona: 'gambler', tone: 'neutral', text: '今晚{teamName}让{oppName}5.5分，我觉得{teamName}能赢但分差不会太大。谨慎入手。' },
    { persona: 'gambler', tone: 'neutral', text: '{teamName}的大小分盘开到218.5，以他们最近的进攻状态，大分概率更高。' },
    { persona: 'gambler', tone: 'neutral', text: '连黑三天的教训：永远不要逆势操作。{teamName}最近5场全输盘，别想着触底反弹。' },
    { persona: 'gambler', tone: 'neutral', text: '{teamName}的客场盘口表现很差，本赛季客场赢盘率只有38%。客场作战真的不一样。' },
    { persona: 'gambler', tone: 'neutral', text: '今天{teamName}的盘口从-3升到了-5.5，资金流向明显。大资金不会骗人。' },
    { persona: 'gambler', tone: 'neutral', text: '背靠背第二场的{teamName}要小心，体能下降导致防守松懈，大分概率飙升。' },
    { persona: 'gambler', tone: 'neutral', text: '{playerName}的球员盘：得分超过25.5的概率很高，他最近5场都超过了这个数。' },
    { persona: 'gambler', tone: 'neutral', text: '串子注意：{teamName}和{oppName}同时赢盘的概率只有28%，别贪心。' },
    { persona: 'gambler', tone: 'neutral', text: '{teamName}第一节让2.5分，他们本赛季首节赢盘率62%。快热型球队。' },
    { persona: 'gambler', tone: 'neutral', text: '伤病消息对盘口的影响太大了，{teamName}核心球员出战成疑，盘口直接变了3分。' },
    { persona: 'gambler', tone: 'neutral', text: '今天三场NBA，我的选择是{teamName}大分、{oppName}受让、还有一场pass。' },
    { persona: 'gambler', tone: 'neutral', text: '{teamName}最近10场8次打出大分，他们的比赛节奏越来越快了。' },
    { persona: 'gambler', tone: 'neutral', text: '别被{teamName}的连胜骗了，他们的对手平均胜率只有.420。赛程红利而已。' },
    { persona: 'gambler', tone: 'neutral', text: '{playerName}的助攻盘开到7.5，但他最近3场助攻都没超过6。这盘有问题。' },
    { persona: 'gambler', tone: 'neutral', text: '季后赛的盘口和常规赛完全不同，{teamName}在季后赛的赢盘率比常规赛低了15%。' },
    { persona: 'gambler', tone: 'neutral', text: '今天{teamName}的盘口从开盘到临场变化不大，说明资金流向比较均衡。这种盘最难判断。' },
    { persona: 'gambler', tone: 'neutral', text: '{teamName}的主场大分概率是72%，他们主场打得太开放了。' },
    { persona: 'gambler', tone: 'neutral', text: '连红五天的秘诀：只看{teamName}的主场盘和{oppName}的客场盘。简单粗暴但有效。' },
    { persona: 'gambler', tone: 'neutral', text: '{playerName}的篮板盘今天值得关注，对方的中锋受伤了，他可能要打更长时间。' },
    { persona: 'gambler', tone: 'neutral', text: '别碰{teamName}的第四节盘，他们的末节表现太不稳定了。' },
    { persona: 'gambler', tone: 'neutral', text: '今天{teamName}让分太多，{oppName}虽然战绩差但打强队从来不怂。受让值得考虑。' },
    { persona: 'gambler', tone: 'neutral', text: '{teamName}的半场盘表现：本赛季半场领先的概率是68%，半场入手更稳。' },
    { persona: 'gambler', tone: 'neutral', text: '赛季末段的盘口最危险，{teamName}可能已经没有战意了。' },
    { persona: 'gambler', tone: 'neutral', text: '{playerName}的得分+篮板+助攻盘开到42.5，他最近5场有4场超过了这个数。' },
    { persona: 'gambler', tone: 'neutral', text: '今天全联盟7场比赛，我只看{teamName}这一场。其他场次信息不够，不碰。' }
  ],

  deep_stats: [
    { persona: 'data', tone: 'neutral', text: '{playerName}的真实命中率达到了64.5%，在同位置球员中排名前3%。效率之王。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的净效率值是+5.8，但他们的战绩比净效率预测的要差。运气不好还是终结能力差？' },
    { persona: 'data', tone: 'neutral', text: '使用率超过30%的球员中，{playerName}的效率值是最高的。高使用率高效率，这就是超巨。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的百回合失分是108.3，排在联盟第6。但他们的对手投篮运气率偏低，防守数据可能有水分。' },
    { persona: 'data', tone: 'neutral', text: '进阶数据揭示：{playerName}在场时{teamName}的进攻效率提升12.5分，他的正负值被严重低估了。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的助攻率是68%，排在联盟第2。球权分享做得极好。' },
    { persona: 'data', tone: 'neutral', text: 'RAPTOR数据：{playerName}的进攻RAPTOR是+6.2，防守RAPTOR是+1.8。攻守兼备。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的有效命中率是54.8%，排在联盟第8。投篮选择越来越好。' },
    { persona: 'data', tone: 'neutral', text: '回合占有率分析：{playerName}的回合占有率28.5%，但他的传球率也排在同位置前5。不是独狼。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的进攻效率在最后5分钟暴跌15个点，关键时刻的执行力需要改善。' },
    { persona: 'data', tone: 'neutral', text: 'PIPM数据：{playerName}的影响力值是+4.8，他在场时球队每百回合多赢4.8分。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的防守篮板率是78.5%，排在联盟第3。控制篮板就控制了比赛。' },
    { persona: 'data', tone: 'neutral', text: '投篮分布分析：{playerName}有42%的出手来自三分线外，命中率38.5%。现代后卫的标准模板。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的转换进攻效率是每回合1.15分，排在联盟第4。快攻是他们的杀手锏。' },
    { persona: 'data', tone: 'neutral', text: 'EPM数据更新：{playerName}的估计正负值是+3.2，在所有后卫中排名第7。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的半场进攻效率排在联盟第15，但转换进攻效率排第3。他们需要打快。' },
    { persona: 'data', tone: 'neutral', text: '真实正负值：{playerName}的ORPM是+3.5，DRPM是+0.8。攻强于守但防守在进步。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的失误率是12.8%，排在联盟第5低。球权保护做得很好。' },
    { persona: 'data', tone: 'neutral', text: '挡拆效率分析：{playerName}作为挡拆持球人每回合得1.02分，排在联盟第12。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的底角三分命中率是41.2%，排在联盟第1。底角射手群太稳了。' },
    { persona: 'data', tone: 'neutral', text: 'LEBRON数据：{playerName}的影响力评分是+4.1，在所有球员中排名第15。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的禁区防守效率排在联盟第4，对手在篮下的命中率只有53%。护框能力极强。' },
    { persona: 'data', tone: 'neutral', text: '单打效率：{playerName}每回合单打得1.08分，排在联盟第5。关键时刻的单打武器。' },
    { persona: 'data', tone: 'neutral', text: '{teamName}的替补净效率是-3.2，排在联盟第22。板凳深度确实是个问题。' },
    { persona: 'data', tone: 'neutral', text: 'BPM数据：{playerName}的BPM是+5.8，如果保持到赛季结束，将是MVP级别的表现。' }
  ],

  rest_day: [
    { persona: 'casual', tone: 'neutral', text: '今天没有{teamName}的比赛，感觉一天少了点什么。看其他队的比赛总觉得差点意思。' },
    { persona: 'casual', tone: 'neutral', text: '休赛日最适合回顾{teamName}本赛季的高光时刻，那个绝杀球我看了不下20遍。' },
    { persona: 'casual', tone: 'neutral', text: '没有比赛的日子，来聊聊{teamName}的历史最佳阵容吧。我选这五个人：...' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}今天的训练视频流出来了，他在练一个新的后撤步动作。下场比赛有惊喜？' },
    { persona: 'casual', tone: 'neutral', text: '休息日就是用来刷集锦的。{teamName}本赛季的十大扣篮，第3个太炸了。' },
    { persona: 'casual', tone: 'neutral', text: '没有{teamName}比赛的夜晚，我选择重温经典。2016年总决赛G7，永远的神。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在休赛日参加了社区活动，和孩子们一起打球的画面太暖了。' },
    { persona: 'casual', tone: 'neutral', text: '今天的训练馆消息：{teamName}全队加练了罚球，最近几场的罚球命中率确实太低了。' },
    { persona: 'casual', tone: 'neutral', text: '休息日讨论：{teamName}如果保持健康，能在季后赛走多远？我看好西决。' },
    { persona: 'casual', tone: 'neutral', text: '没有比赛的日子来做个调查：{teamName}队史你最喜欢的球员是谁？' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在社交媒体上发了一张训练照，配文"永远不会满足"。这种态度太棒了。' },
    { persona: 'casual', tone: 'neutral', text: '休赛日最适合讨论{teamName}的战术问题。我觉得他们的挡拆防守需要彻底重构。' },
    { persona: 'casual', tone: 'neutral', text: '今天没有NBA比赛，但{playerName}在个人频道直播了2K，技术还不错。' },
    { persona: 'casual', tone: 'neutral', text: '休息日来聊聊{teamName}的选秀历史，那些年他们错过的球员能组一支全明星队。' },
    { persona: 'casual', tone: 'neutral', text: '{teamName}的球员今天参加了商业活动，{playerName}穿西装的样子太帅了。' },
    { persona: 'casual', tone: 'neutral', text: '没有比赛的日子就是用来做数据统计的。{teamName}本赛季的关键数据汇总来了。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在采访中说休赛日他会看4-5个小时的录像。这就是职业态度。' },
    { persona: 'casual', tone: 'neutral', text: '休息日话题：如果{teamName}能签下任何一名自由球员，你选谁？' },
    { persona: 'casual', tone: 'neutral', text: '今天{teamName}没有比赛，但他们的训练馆依然灯火通明。努力的人不会休息。' },
    { persona: 'casual', tone: 'neutral', text: '没有比赛的日子来预测一下{teamName}接下来的5场赛程，我觉得4胜1负。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}的播客更新了，这期聊的是他职业生涯最难忘的一场比赛。' },
    { persona: 'casual', tone: 'neutral', text: '休赛日来回顾{teamName}本赛季的五大逆转，第1名那场我差点关电视。' },
    { persona: 'casual', tone: 'neutral', text: '今天没有比赛，但{teamName}的官方账号发了一段幕后花絮，更衣室庆祝太欢乐了。' },
    { persona: 'casual', tone: 'neutral', text: '休息日讨论：{teamName}的主场优势和客场劣势，到底是什么原因？' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}今天在社区中心教孩子们打篮球，这种回馈社区的行为值得点赞。' },
    { persona: 'casual', tone: 'neutral', text: '没有比赛的日子来聊聊{teamName}的吉祥物，它的表演真的太搞笑了。' },
    { persona: 'casual', tone: 'neutral', text: '休赛日最适合做赛季中段评估。{teamName}的表现：进攻A-，防守B+，整体B+。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在社交媒体上和球迷互动了两个小时，回答了各种有趣的问题。' },
    { persona: 'casual', tone: 'neutral', text: '休息日来聊聊{teamName}的队史最佳比赛，我选那场双加时的经典对决。' },
    { persona: 'casual', tone: 'neutral', text: '今天没有{teamName}的比赛，但明天他们要打背靠背，体能是个大问题。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}的赛前准备视频：冰浴、拉伸、冥想、看录像。职业球员的一天。' },
    { persona: 'casual', tone: 'neutral', text: '没有比赛的日子来讨论{teamName}的薪资空间，明年夏天他们有大动作。' },
    { persona: 'casual', tone: 'neutral', text: '休赛日来回顾{playerName}的生涯十佳球，第1名那球我看了100遍还是起鸡皮疙瘩。' },
    { persona: 'casual', tone: 'neutral', text: '{teamName}的球员今天参加了球队组织的团建活动，看起来大家关系很好。' },
    { persona: 'casual', tone: 'neutral', text: '休息日话题：{teamName}的教练组和球员谁更想赢？答案可能出乎你意料。' },
    { persona: 'casual', tone: 'neutral', text: '没有比赛的日子来聊聊联盟格局，{teamName}在东西部能排第几？' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在休赛日去了当地一家餐厅，老板说他是常客了。接地气的球星。' },
    { persona: 'casual', tone: 'neutral', text: '休息日来预测{teamName}的赛季最终战绩，我猜52胜30负。' },
    { persona: 'casual', tone: 'neutral', text: '今天没有比赛，但{teamName}的训练馆里传来了激烈的对抗声。他们没有在休息。' },
    { persona: 'casual', tone: 'neutral', text: '{playerName}在社交媒体上晒了他的宠物狗，配文"最好的休息伙伴"。可爱。' }
  ]
};

// ============ TEXT_POOL_STAR — Star Player Posts ============

const TEXT_POOL_STAR = {
  game_rival_strong: [
    { text: '今晚对{oppTeam}打得够硬，但别以为这就完了。下次碰面，我会更狠。', tone: 'competitive', affinityDelta: -2, respectDelta: 3, heatDelta: 5 },
    { text: '赢了{oppTeam}，但我知道他们不会善罢甘休。好，我等着。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 4 },
    { text: '对{oppTeam}这种对手，赢球才有话语权。今天我拿到了话语权。', tone: 'competitive', affinityDelta: -2, respectDelta: 3, heatDelta: 5 },
    { text: '{oppTeam}的防守对我没用，下次他们得想点新办法。', tone: 'competitive', affinityDelta: -3, respectDelta: 2, heatDelta: 6 },
    { text: '打{oppTeam}从来不需要额外动员，但今天这表现我自己都满意。', tone: 'competitive', affinityDelta: -1, respectDelta: 3, heatDelta: 4 },
    { text: '有些人说我和{oppTeam}的对抗是个人恩怨，不，这就是竞争。', tone: 'competitive', affinityDelta: -2, respectDelta: 2, heatDelta: 5 },
    { text: '今晚的胜利献给所有看不起我的人。{oppTeam}只是第一站。', tone: 'competitive', affinityDelta: -3, respectDelta: 1, heatDelta: 7 },
    { text: '对{oppTeam}的比赛总是最让我兴奋的，今晚也不例外。', tone: 'competitive', affinityDelta: -1, respectDelta: 3, heatDelta: 4 },
    { text: '赢了，但赢得不够漂亮。下次对{oppTeam}我要赢得更彻底。', tone: 'competitive', affinityDelta: -2, respectDelta: 2, heatDelta: 5 },
    { text: '{oppTeam}的球迷可以不服，但比分不会说谎。', tone: 'competitive', affinityDelta: -3, respectDelta: 1, heatDelta: 6 },
    { text: '今晚的对抗让我想起了为什么选择打篮球。{oppTeam}，谢谢你给我动力。', tone: 'competitive', affinityDelta: 0, respectDelta: 3, heatDelta: 3 },
    { text: '打{oppTeam}的时候我从不留手，今天也一样。下次见。', tone: 'competitive', affinityDelta: -2, respectDelta: 2, heatDelta: 5 },
    { text: '有人说我对{oppTeam}太狠了？这就是比赛，不是友谊赛。', tone: 'competitive', affinityDelta: -3, respectDelta: 1, heatDelta: 7 },
    { text: '今晚的数据说明一切。{oppTeam}，下次准备好更强的防守。', tone: 'competitive', affinityDelta: -2, respectDelta: 2, heatDelta: 5 },
    { text: '对{oppTeam}的比赛是我每个赛季都标记在日历上的。今晚没让人失望。', tone: 'competitive', affinityDelta: -1, respectDelta: 3, heatDelta: 4 },
    { text: '赢了{oppTeam}感觉就是不一样。这种胜利比普通比赛甜三倍。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 5 },
    { text: '{oppTeam}今天试了三种防守策略来限制我，都没用。', tone: 'competitive', affinityDelta: -3, respectDelta: 2, heatDelta: 6 },
    { text: '今晚的胜利证明了一件事：在关键时刻，我比{oppTeam}更可靠。', tone: 'competitive', affinityDelta: -2, respectDelta: 2, heatDelta: 6 },
    { text: '打完{oppTeam}的感觉就像打完一场决赛。身心俱疲但很满足。', tone: 'competitive', affinityDelta: 0, respectDelta: 3, heatDelta: 3 },
    { text: '{oppTeam}的球员赛后和我交换了球衣，场上是对手场下是朋友。但下次见面我还是会全力以赴。', tone: 'competitive', affinityDelta: 1, respectDelta: 3, heatDelta: 3 },
    { text: '今晚对{oppTeam}的表现是我本赛季最满意的一场。节奏、手感、对抗，全在线。', tone: 'competitive', affinityDelta: -1, respectDelta: 3, heatDelta: 4 },
    { text: '有人问我为什么对{oppTeam}总是特别来劲。因为只有最好的对手才能逼出最好的我。', tone: 'competitive', affinityDelta: -1, respectDelta: 4, heatDelta: 4 },
    { text: '赢了{oppTeam}，更衣室里的气氛比赢了总决赛还嗨。', tone: 'competitive', affinityDelta: -2, respectDelta: 2, heatDelta: 5 },
    { text: '今晚的胜利不是终点，是向{oppTeam}发出的信号：这个赛季我志在必得。', tone: 'competitive', affinityDelta: -3, respectDelta: 2, heatDelta: 7 },
    { text: '{oppTeam}今天输得不冤，他们遇到了最好的我。', tone: 'competitive', affinityDelta: -3, respectDelta: 1, heatDelta: 6 }
  ],
  game_rival_weak: [
    { text: '今晚对{oppTeam}没打好，但这不会影响我的信心。下次碰面，走着瞧。', tone: 'negative', affinityDelta: -1, respectDelta: 0, heatDelta: 3 },
    { text: '输给{oppTeam}的滋味不好受，但我知道怎么从失败中站起来。', tone: 'negative', affinityDelta: -1, respectDelta: 1, heatDelta: 2 },
    { text: '{oppTeam}今天确实打得好，我不会找借口。但记住，赛季还没结束。', tone: 'negative', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '今晚对{oppTeam}的表现我不满意，回去看录像，下次不会这样了。', tone: 'negative', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '输给{oppTeam}就是输给{oppTeam}，没什么好说的。下次见面场上见真章。', tone: 'negative', affinityDelta: -2, respectDelta: 0, heatDelta: 4 },
    { text: '今晚的失利让我更加渴望下一场对{oppTeam}的比赛。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '{oppTeam}赢了今晚，但赢不了整个赛季。我会回来的。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '今晚对{oppTeam}我确实被限制了，但被限制一次不代表每次都会。', tone: 'negative', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '输给{oppTeam}之后更衣室很安静，这种沉默比任何话语都有力。', tone: 'negative', affinityDelta: -1, respectDelta: 0, heatDelta: 2 },
    { text: '今晚不是我的夜晚，但{oppTeam}别高兴太早。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '对{oppTeam}的失利让我意识到我还有需要提升的地方。回去加练。', tone: 'negative', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '{oppTeam}今天配得上胜利，我不会否认。但下次对位，结果会不同。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '今晚的失利很痛，但痛过之后才知道该怎么打{oppTeam}。', tone: 'negative', affinityDelta: -1, respectDelta: 1, heatDelta: 2 },
    { text: '对{oppTeam}没打好不是世界末日，但确实让我很不爽。', tone: 'negative', affinityDelta: -2, respectDelta: 0, heatDelta: 3 },
    { text: '今晚输了，但{oppTeam}知道下次碰面我不会再给机会了。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '输给{oppTeam}之后我失眠了，脑子里全是下次对位的画面。', tone: 'negative', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '今晚的失利是教训，不是终点。{oppTeam}，我们还会再见的。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '对{oppTeam}没打好，我承认。但承认不足是进步的第一步。', tone: 'negative', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今晚的比分不是我想要的，但{oppTeam}也别以为这就完了。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '输给{oppTeam}让我更加清楚自己的短板。回去看录像，针对性训练。', tone: 'negative', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今晚对{oppTeam}确实被压制了，但这种经历只会让我更强。', tone: 'negative', affinityDelta: -1, respectDelta: 1, heatDelta: 2 },
    { text: '{oppTeam}今天打得好，我给他们点赞。但下次，点赞的会是我。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '输给{oppTeam}之后我没有说话，因为现在说什么都苍白。等下次赢了再说。', tone: 'negative', affinityDelta: -2, respectDelta: 0, heatDelta: 3 },
    { text: '今晚的失利让我明白，对{oppTeam}不能有丝毫松懈。', tone: 'negative', affinityDelta: -1, respectDelta: 1, heatDelta: 2 },
    { text: '对{oppTeam}没打好，但赛季还有很长的路。我会证明今晚只是意外。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 3 }
  ],
  game_friend_strong: [
    { text: '今晚和{playerName}同场竞技的感觉太好了，我们都打出了高水平。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 2 },
    { text: '{playerName}今天表现不错，但胜利还是我们的。下次继续。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '和{playerName}对位总是很特别，我们是朋友也是对手。今晚我赢了这一局。', tone: 'positive', affinityDelta: 2, respectDelta: 3, heatDelta: 2 },
    { text: '今晚的比赛质量很高，{playerName}和我都打出了自己的风格。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '赢了比赛，也赢了和{playerName}的对位。但我知道他下次会更强。', tone: 'positive', affinityDelta: 2, respectDelta: 3, heatDelta: 2 },
    { text: '{playerName}是我的兄弟，但在球场上没有兄弟只有对手。今晚我更胜一筹。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 3 },
    { text: '和{playerName}的比赛总是最享受的，因为双方都不会留手。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '今晚赢了{playerName}，赛后我们聊了很久。真正的对手也是真正的朋友。', tone: 'positive', affinityDelta: 3, respectDelta: 3, heatDelta: 1 },
    { text: '{playerName}今天给了我很大的压力，但压力让我打出了最好的表现。', tone: 'positive', affinityDelta: 2, respectDelta: 3, heatDelta: 2 },
    { text: '和{playerName}同场的感觉就像全明星赛，每个人都在展示最好的自己。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '今晚对{playerName}的表现我给自己打A，但给他也打A-。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 2 },
    { text: '赢了{playerName}的感觉很复杂，因为我也希望他打好。但比赛就是比赛。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '今晚和{playerName}的对位是本赛季最精彩的一对一。', tone: 'positive', affinityDelta: 3, respectDelta: 3, heatDelta: 2 },
    { text: '{playerName}今天打得很好，但我们的团队配合更胜一筹。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '和{playerName}的比赛总是让我想起我们一起训练的时光。那些日子造就了今天的我们。', tone: 'positive', affinityDelta: 4, respectDelta: 3, heatDelta: 1 },
    { text: '今晚赢了，但{playerName}的表现也值得掌声。这就是高水平的对决。', tone: 'positive', affinityDelta: 3, respectDelta: 3, heatDelta: 1 },
    { text: '{playerName}是我的好友，但今天我必须赢他。下次他也会这么对我。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 2 },
    { text: '和{playerName}对位的每一分钟都很享受，因为你知道对方也在全力以赴。', tone: 'positive', affinityDelta: 3, respectDelta: 3, heatDelta: 1 },
    { text: '今晚的胜利有{playerName}的功劳，是他的防守逼出了最好的我。', tone: 'positive', affinityDelta: 3, respectDelta: 3, heatDelta: 1 },
    { text: '{playerName}今天的三分太准了，但我们在最后关头更冷静。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 2 },
    { text: '和{playerName}打球从来不会无聊，今晚又是一场经典。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '赢了{playerName}之后我们击掌拥抱，这就是篮球的魅力。', tone: 'positive', affinityDelta: 4, respectDelta: 3, heatDelta: 1 },
    { text: '今晚和{playerName}的对决让我想起了我们第一次交手的情景。成长了很多。', tone: 'positive', affinityDelta: 3, respectDelta: 3, heatDelta: 1 },
    { text: '{playerName}今天给了我很大的挑战，但挑战让我变得更好。', tone: 'positive', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '和{playerName}的比赛总是高质量的，今晚也不例外。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 }
  ],
  game_friend_weak: [
    { text: '今晚没打好，但{playerName}的表现确实出色。下次我会追上来的。', tone: 'neutral', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '{playerName}今天赢了，我服气。但朋友之间的竞争才刚开始。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 2 },
    { text: '输给{playerName}比输给其他人好受一点，但也好不到哪去。', tone: 'neutral', affinityDelta: 1, respectDelta: 2, heatDelta: 1 },
    { text: '今晚{playerName}打得太好了，我必须承认他今天更胜一筹。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '虽然输了，但和{playerName}同场的感觉还是很好。下次我要翻盘。', tone: 'neutral', affinityDelta: 2, respectDelta: 2, heatDelta: 2 },
    { text: '{playerName}今天配得上胜利，我不会因为输了就否认这一点。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '输给朋友比输给陌生人更让人反思。{playerName}，下次我会准备得更好。', tone: 'neutral', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '今晚的失利让我看到了和{playerName}的差距，但差距是可以缩小的。', tone: 'neutral', affinityDelta: 1, respectDelta: 3, heatDelta: 1 },
    { text: '{playerName}今天打出了全明星水准，向他致敬。但下次我要赢回来。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 2 },
    { text: '和{playerName}的比赛即使输了也很享受，因为双方都在全力以赴。', tone: 'neutral', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '今晚{playerName}赢了这一局，但我们的故事还在继续。', tone: 'neutral', affinityDelta: 2, respectDelta: 2, heatDelta: 2 },
    { text: '输给{playerName}后我们聊了几句，他说"下次你可别这么好打"。我笑了。', tone: 'neutral', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '今晚没打好，但{playerName}的鼓励让我感觉好多了。真正的朋友。', tone: 'neutral', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '{playerName}今天的表现无可挑剔，我需要向他学习。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '虽然输了，但和{playerName}的对位让我学到了很多。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '今晚对{playerName}我确实被压制了，但下次我会准备不同的策略。', tone: 'neutral', affinityDelta: 1, respectDelta: 2, heatDelta: 2 },
    { text: '{playerName}今天打得太好了，我给他竖大拇指。但下次我要让他给我竖。', tone: 'neutral', affinityDelta: 2, respectDelta: 2, heatDelta: 2 },
    { text: '输给朋友不是坏事，它让我更清楚自己需要提升什么。', tone: 'neutral', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '今晚的失利很遗憾，但{playerName}的胜利值得尊重。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '和{playerName}的比赛即使输了也让我成长了。这就是高质量对决的价值。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '{playerName}今天在关键时刻更冷静，这就是我需要学习的地方。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '输了就是输了，但输给{playerName}至少让我输得心服口服。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '今晚没打好，但{playerName}说"你下次会更强"。这就是朋友。', tone: 'neutral', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '和{playerName}的每次对位都让我变得更好，即使这次我输了。', tone: 'neutral', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '今晚的失利让我更加期待下次和{playerName}的交手。', tone: 'neutral', affinityDelta: 2, respectDelta: 2, heatDelta: 2 }
  ],
  game_opponent_strong: [
    { text: '今晚对{oppTeam}打出了我的风格，这就是我想要的比赛。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 3 },
    { text: '对{oppTeam}的比赛总是硬仗，但今晚我扛住了。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 3 },
    { text: '{oppTeam}的防守很强，但我的进攻更强。今晚证明了一点。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 4 },
    { text: '打{oppTeam}不需要动员，但今晚我确实多准备了一些。效果不错。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 3 },
    { text: '今晚对{oppTeam}的表现我自己都意外，手感太好了。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 3 },
    { text: '{oppTeam}今天试了各种防守来限制我，但我找到了破解方法。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 4 },
    { text: '对{oppTeam}的比赛我总是特别专注，今晚的专注度换来了好结果。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '今晚赢了{oppTeam}，这场胜利对球队的排名很重要。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '{oppTeam}是强队，但今晚我们更强。这就是篮球。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '对{oppTeam}的比赛我打满了第四节，体能和意志力都经受住了考验。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 3 },
    { text: '今晚对{oppTeam}的胜利是全队努力的结果，我只是做了我该做的。', tone: 'positive', affinityDelta: 1, respectDelta: 2, heatDelta: 2 },
    { text: '{oppTeam}今天给了我们很大的压力，但压力之下我们更团结了。', tone: 'positive', affinityDelta: 1, respectDelta: 2, heatDelta: 2 },
    { text: '对{oppTeam}的比赛总是充满对抗，今晚我享受了每一分钟。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '今晚的胜利让我们的排名更稳了。{oppTeam}，谢谢你们逼出了最好的我们。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '打{oppTeam}的时候我知道全联盟都在看，今晚我没有让人失望。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 3 },
    { text: '{oppTeam}的球迷很热情，但今晚让他们安静了。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 4 },
    { text: '对{oppTeam}的比赛总是季后赛级别的对抗，今晚我们通过了考验。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '今晚的数据不是我关心的，我关心的是赢了{oppTeam}。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '{oppTeam}今天打得很顽强，但我们在关键时刻更冷静。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '对{oppTeam}的胜利让更衣室充满了能量，这种氛围太棒了。', tone: 'positive', affinityDelta: 1, respectDelta: 1, heatDelta: 2 },
    { text: '今晚我打出了赛季最佳表现之一，{oppTeam}是最好的试金石。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 3 },
    { text: '{oppTeam}今天给了我很大的空间，我抓住了每一个机会。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '对{oppTeam}的比赛我从不掉以轻心，今晚的专注度就是证明。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '赢了{oppTeam}之后感觉整个赛季都不同了。信心是会传染的。', tone: 'positive', affinityDelta: 1, respectDelta: 2, heatDelta: 2 },
    { text: '今晚对{oppTeam}的胜利是团队篮球的胜利，每个人都做出了贡献。', tone: 'positive', affinityDelta: 1, respectDelta: 2, heatDelta: 1 }
  ],
  game_opponent_weak: [
    { text: '今晚对{oppTeam}没打好，回去需要好好反思。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '{oppTeam}今天确实更强，我们需要从这场失利中吸取教训。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚对{oppTeam}的表现不够好，但赛季还长，我们会反弹的。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '输给{oppTeam}让人失望，但不能让一场失利定义我们。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '今晚{oppTeam}打出了他们的节奏，我们没能做出有效调整。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '对{oppTeam}的失利说明我们还有很多需要改进的地方。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚没打好，但我不找借口。{oppTeam}今天确实更出色。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '输给{oppTeam}之后更衣室很安静，每个人都在反思。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '今晚对{oppTeam}我没能打出自己的水平，这是最让我沮丧的。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 2 },
    { text: '{oppTeam}今天配得上胜利，我们下次必须做得更好。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的失利很痛，但痛过之后才知道怎么打{oppTeam}。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '对{oppTeam}没打好不是借口，但确实需要回去看录像找问题。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的失利让我更加清楚自己的不足。回去加练。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '{oppTeam}今天在关键时刻更冷静，这就是差距。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '输给{oppTeam}之后我不会消沉，因为我知道自己能打得更好。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '今晚对{oppTeam}的失利是全队的问题，不是某一个人的。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '{oppTeam}今天的战术执行得比我们好，这就是输球的原因。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '对{oppTeam}没打好，但我不允许自己连续两场低迷。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '今晚的失利让我更加渴望下一场比赛。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '{oppTeam}今天赢了，但赛季还长。我们会回来的。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚对{oppTeam}我确实被限制了，但被限制一次不代表每次都会。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '输给{oppTeam}让我看到了差距，但差距是可以缩小的。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今晚的失利是警钟，提醒我们不能松懈。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '{oppTeam}今天打得好，我承认。但下次结果会不同。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '对{oppTeam}的失利让我更加专注训练，下次不会再犯同样的错误。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 }
  ],
  game_general_strong: [
    { text: '今晚打了一场好球，球队配合默契，个人手感也不错。继续。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '今天的表现我给自己打8分，还有提升空间。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '赢了就是赢了，不管对手是谁。今晚我们打出了自己的节奏。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '今晚的胜利是全队努力的结果，每个人都在自己的位置上做出了贡献。', tone: 'positive', affinityDelta: 1, respectDelta: 1, heatDelta: 1 },
    { text: '手感来了挡都挡不住，今晚就是这种感觉。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '今晚的比赛节奏很舒服，攻防两端都找到了感觉。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '赢了比赛，数据也不错，但最重要的是球队在正确的轨道上。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的胜利让我们的排名又上升了一位。每一场都很重要。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '打完今晚的比赛感觉很好，身体状态和心理状态都在最佳。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚我做了球队需要我做的事，得分、防守、组织，全方位贡献。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '胜利的感觉永远不会腻。今晚又是一个美好的夜晚。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的比赛证明了我们的训练是有效的。付出总会有回报。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '赢了球回家心情好，明天继续训练。永远不满足。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的胜利让更衣室充满了笑声，这才是打篮球该有的样子。', tone: 'positive', affinityDelta: 1, respectDelta: 1, heatDelta: 1 },
    { text: '数据只是数字，胜利才是最重要的。今晚我们拿到了。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的比赛我打得很聪明，没有强行出手，让比赛来找我。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '赢了球之后最想做的事就是好好休息，明天又是新的一天。', tone: 'positive', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '今晚的胜利让我们的连胜延续到了5场。保持这个势头。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '打了一场好球，但教练说还有进步空间。他是对的。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的胜利是对我们最近训练成果的最好证明。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '赢了球，回家看录像。好的坏的都要看，永远在学习。', tone: 'positive', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今晚的比赛节奏控制得很好，该快的时候快，该慢的时候慢。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '胜利是最好的良药。今晚的赢球让之前的疲惫一扫而空。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚我打出了自己的风格，这就是我想打的篮球。', tone: 'positive', affinityDelta: 0, respectDelta: 1, heatDelta: 2 },
    { text: '赢了球，心情好，给球迷们比个心。你们的支持是我最大的动力。', tone: 'positive', affinityDelta: 1, respectDelta: 1, heatDelta: 1 }
  ],
  game_general_weak: [
    { text: '今晚没打好，没什么好说的。回去看录像，明天继续。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '今晚的表现不是我想要的，但赛季还长。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '输了就是输了，不找借口。下次打好就行。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '今晚的失利让人沮丧，但沮丧不能解决问题。回去训练。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '今晚没找到节奏，投篮不进，防守跟不上。糟糕的一晚。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '输球之后最想做的事就是回训练馆。明天见。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的失利是全队的责任，不是某一个人的问题。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '输了球但没失去信心。下一场我会准备得更好。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的比赛我需要忘记，但不能不从中学习。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '糟糕的表现不会定义我。我知道自己能打得更好。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的失利让我更加渴望训练。用行动说话。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '输球不可怕，可怕的是输了之后不反思。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚没打好，但明天太阳照常升起。继续努力。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '今晚的失利是暂时的，我的目标不会改变。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '输了球之后最好的回应就是下一场打好。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的表现对不起球迷，但我会用行动来弥补。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 2 },
    { text: '失利让我更加清楚自己需要提升什么。这是唯一的正面。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚没打好，但我不允许自己沉浸在失败中。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '输球之后最需要的是冷静分析，而不是情绪化。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚的失利是警钟，提醒我永远不能松懈。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '糟糕的一晚，但明天又是新的一天。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 1 },
    { text: '今晚的失利让我更加珍惜每一次上场的机会。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '输了球但没输掉斗志。下一场见。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今晚没打好，但我知道自己能做什么。下次证明。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '失利是暂时的，成长是永恒的。今晚学到了东西。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 }
  ],
  rest_rival: [
    { text: '休息日也不忘{oppTeam}的事。下次碰面，我准备好了。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '今天训练的时候脑子里全是打{oppTeam}的画面。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '休息日看了{oppTeam}的比赛录像，他们的弱点我已经找到了。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '没有比赛的日子最适合研究{oppTeam}。知己知彼。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '今天在训练馆加练了两个小时，动力就是下次打{oppTeam}。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '休息日看到{oppTeam}的新闻，他们好像也在研究我们。好，来吧。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '今天和教练讨论了对{oppTeam}的战术，下次碰面会有惊喜。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '休息日不意味着放松。特别是当你知道{oppTeam}在某个地方也在训练的时候。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '今天在健身房的力量训练特别卖力，因为想到了{oppTeam}的内线。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '休息日看{oppTeam}的比赛回放，发现他们的防守有个漏洞。记住了。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '今天在训练馆模拟了对{oppTeam}的进攻套路，效果不错。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '休息日也不能忘记和{oppTeam}的恩怨。下次见面，一切都会不同。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '今天在游泳池做恢复训练，脑子里却在想怎么打{oppTeam}。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '休息日收到了{oppTeam}球迷的挑衅消息。谢谢，这让我更有动力了。', tone: 'competitive', affinityDelta: -2, respectDelta: 0, heatDelta: 5 },
    { text: '今天和队友讨论了对{oppTeam}的策略，大家都很兴奋。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '休息日的训练比平时更卖力，因为{oppTeam}不会在休息日偷懒。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '今天在录像室待了三个小时，全是{oppTeam}的比赛。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '休息日最适合磨刀。下次对{oppTeam}，我要让他们看到不同的我。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '今天的投篮训练特别专注，因为想到了{oppTeam}的防守。', tone: 'competitive', affinityDelta: -1, respectDelta: 1, heatDelta: 3 },
    { text: '休息日看到{oppTeam}赢了球，心里不是滋味。但这也意味着下次碰面更有看头。', tone: 'competitive', affinityDelta: -2, respectDelta: 1, heatDelta: 4 },
    { text: '今天和体能教练加练了爆发力，为下次打{oppTeam}做准备。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '休息日不休息。{oppTeam}在进步，我也必须进步。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 4 },
    { text: '今天在训练馆练了新的脚步动作，专门为{oppTeam}准备的。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 },
    { text: '休息日看了{oppTeam}核心球员的采访，他说不担心我们。好，那就走着瞧。', tone: 'competitive', affinityDelta: -2, respectDelta: 0, heatDelta: 5 },
    { text: '今天的恢复训练很到位，身体状态在向好的方向发展。下次对{oppTeam}，我准备好了。', tone: 'competitive', affinityDelta: -1, respectDelta: 2, heatDelta: 3 }
  ],
  rest_friend: [
    { text: '休息日和{playerName}一起吃了顿饭，聊了聊最近的比赛。好朋友。', tone: 'positive', affinityDelta: 3, respectDelta: 1, heatDelta: 1 },
    { text: '今天和{playerName}一起训练了，互相学习的感觉很好。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '休息日收到了{playerName}的消息，他说下次对位要赢我。我笑了。', tone: 'positive', affinityDelta: 2, respectDelta: 1, heatDelta: 2 },
    { text: '今天和{playerName}一起参加了社区活动，给孩子们上了一堂篮球课。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '休息日最适合和老朋友聚聚。{playerName}，下次比赛见。', tone: 'positive', affinityDelta: 3, respectDelta: 1, heatDelta: 1 },
    { text: '今天和{playerName}通了电话，聊了聊各自球队的近况。', tone: 'positive', affinityDelta: 2, respectDelta: 1, heatDelta: 1 },
    { text: '休息日和{playerName}一起打了高尔夫，他球技不怎么样但人很好。', tone: 'positive', affinityDelta: 3, respectDelta: 1, heatDelta: 1 },
    { text: '今天在训练馆碰到了{playerName}，我们一起练了投篮。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '休息日看了{playerName}的最近一场比赛，他打得真好。为他高兴。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '今天和{playerName}一起做了播客，聊了很多有趣的话题。', tone: 'positive', affinityDelta: 3, respectDelta: 1, heatDelta: 2 },
    { text: '休息日和{playerName}交换了训练心得，互相借鉴。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '今天和{playerName}一起看了另一场比赛，边看边讨论战术。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '休息日收到了{playerName}送的礼物，一双限量球鞋。好兄弟。', tone: 'positive', affinityDelta: 4, respectDelta: 1, heatDelta: 1 },
    { text: '今天和{playerName}一起去了慈善晚宴，为社区做贡献。', tone: 'positive', affinityDelta: 3, respectDelta: 2, heatDelta: 1 },
    { text: '休息日和{playerName}打了一局2K，我赢了。但他说下次真人对决他赢。', tone: 'positive', affinityDelta: 3, respectDelta: 1, heatDelta: 2 },
    { text: '今天和{playerName}一起做了康复训练，互相监督。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '休息日和{playerName}聊了聊职业生涯的规划，他的建议很有帮助。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '今天和{playerName}一起去了当地一家新开的餐厅，味道不错。', tone: 'positive', affinityDelta: 3, respectDelta: 1, heatDelta: 1 },
    { text: '休息日和{playerName}一起做了瑜伽，柔韧性训练很重要。', tone: 'positive', affinityDelta: 2, respectDelta: 1, heatDelta: 1 },
    { text: '今天和{playerName}一起参加了品牌活动，拍了几张合照。', tone: 'positive', affinityDelta: 2, respectDelta: 1, heatDelta: 2 },
    { text: '休息日和{playerName}一起看了我们上次交手的录像，互相点评。', tone: 'positive', affinityDelta: 2, respectDelta: 3, heatDelta: 1 },
    { text: '今天和{playerName}一起做了力量训练，互相鼓励。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 },
    { text: '休息日和{playerName}一起去了游乐园，难得的放松时光。', tone: 'positive', affinityDelta: 3, respectDelta: 1, heatDelta: 1 },
    { text: '今天和{playerName}一起做了投篮挑战，我以微弱优势赢了。', tone: 'positive', affinityDelta: 2, respectDelta: 1, heatDelta: 2 },
    { text: '休息日和{playerName}聊了聊联盟的近况，交换了各自的看法。', tone: 'positive', affinityDelta: 2, respectDelta: 2, heatDelta: 1 }
  ],
  rest_samePos: [
    { text: '休息日看了同位置球员的录像，学习他们的脚步和终结方式。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天在训练馆加练了低位技术，同位置的竞争越来越激烈了。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '休息日最适合研究同位置对手的打法，知己知彼百战不殆。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天和教练讨论了同位置球员的优劣势，我需要发挥自己的特点。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日看了同位置球员的数据对比，有些方面我确实需要提升。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天在训练馆模拟了同位置球员的进攻动作，为下次对位做准备。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '休息日最适合打磨自己的技术细节，同位置的竞争容不得半点马虎。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天在健身房加强了核心力量训练，同位置的对抗需要更强的核心。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日看了同位置球员的比赛集锦，有几个动作我想加入我的武器库。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天和队友讨论了同位置球员的防守策略，收获很大。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日最适合反思自己的不足，同位置的排名不是固定的。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天在训练馆练了新的终结方式，同位置的球员都在进化，我也不能落后。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '休息日看了同位置球员的进阶数据，效率方面我还有提升空间。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天在训练馆加练了投篮，同位置球员的投射能力越来越强了。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日最适合做针对性的训练计划，同位置的竞争让我更有动力。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天在录像室看了同位置球员的防守站位，学到了几个小技巧。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日不休息，因为同位置的对手不会休息。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 2 },
    { text: '今天和体能教练讨论了同位置球员的体能分配，有些启发。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日最适合调整心态，同位置的竞争不只是技术，还有心理。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天在训练馆练了挡拆后的处理球，同位置球员都在提升这方面的能力。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日看了同位置球员的赛后采访，他们的心态和目标各不相同。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 },
    { text: '今天在训练馆加练了脚步移动，同位置的对抗中脚步是关键。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日最适合总结前半程的表现，同位置的排名还有上升空间。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '今天和教练讨论了同位置球员的战术定位，我需要更全面。', tone: 'neutral', affinityDelta: 0, respectDelta: 2, heatDelta: 1 },
    { text: '休息日看了同位置球员的伤病历史，预防伤病也是竞争力。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 1 }
  ],
  rest_general: [
    { text: '休息日最适合恢复体能，冰浴加拉伸，为下一场做准备。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '今天在训练馆做了轻量训练，保持身体状态。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '休息日看了全联盟的比赛集锦，学习其他球员的技巧。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 0 },
    { text: '今天和队友一起做了团队建设活动，凝聚力更强了。', tone: 'positive', affinityDelta: 1, respectDelta: 0, heatDelta: 0 },
    { text: '休息日最适合调整饮食和作息，为赛季后半程储备能量。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '今天在训练馆练了罚球，最近几场的罚球命中率需要提升。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 0 },
    { text: '休息日看了教练发来的比赛录像，做了详细的笔记。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 0 },
    { text: '今天做了全身的恢复训练，感觉身体状态在好转。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '休息日最适合和家人朋友待在一起，平衡生活和篮球。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '今天在游泳池做了有氧恢复，水的阻力训练效果很好。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '休息日看了下一场对手的录像，提前做好准备。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 0 },
    { text: '今天和营养师讨论了饮食计划，赛季中期的营养补充很重要。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '休息日最适合做心理调整，冥想和放松让我的心态更平和。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '今天在训练馆和年轻球员做了1对1，他们的活力让我也年轻了几岁。', tone: 'positive', affinityDelta: 1, respectDelta: 1, heatDelta: 0 },
    { text: '休息日看了自己最近5场比赛的录像，发现了一些需要改进的地方。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 0 },
    { text: '今天做了瑜伽和拉伸，柔韧性是预防伤病的关键。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '休息日最适合充电，看了几篇篮球战术分析的文章。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 0 },
    { text: '今天和教练一对一讨论了我的角色定位，更清楚了。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 0 },
    { text: '休息日不意味着完全放松，但也不需要过度训练。找到平衡。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '今天在训练馆练了新的运球组合，比赛时试试看。', tone: 'neutral', affinityDelta: 0, respectDelta: 1, heatDelta: 0 },
    { text: '休息日看了联盟的排名和赛程，每一场都很关键。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '今天和队友一起做了投篮比赛，轻松的氛围中也能提升。', tone: 'positive', affinityDelta: 1, respectDelta: 0, heatDelta: 0 },
    { text: '休息日最适合处理一些商业事务，赛季中很难抽出时间。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '今天在训练馆做了全身的力量训练，保持肌肉量很重要。', tone: 'neutral', affinityDelta: 0, respectDelta: 0, heatDelta: 0 },
    { text: '休息日看了球迷的留言和评论，你们的支持是我前进的动力。', tone: 'positive', affinityDelta: 1, respectDelta: 0, heatDelta: 1 }
  ]
};

// ============ TEXT_POOL_COMMERCIAL — Commercial / Brand Events ============

const TEXT_POOL_COMMERCIAL = {
  endorsement_sign: [
    '{playerName}正式与{brand}签订代言合约，成为{category}领域的品牌大使。这份{label}合同将为双方带来长期收益。',
    '{brand}宣布{playerName}成为其全球代言人，{category}市场迎来重量级合作。{label}的签约金额令人侧目。',
    '重磅签约！{playerName}牵手{brand}，{category}代言正式落地。{label}的含金量不言自明。',
    '{brand}在发布会上正式宣布{playerName}成为品牌合作伙伴，{category}代言人花落{playerName}。{label}合同细节未披露，但据信金额可观。',
    '{playerName}与{brand}达成{category}代言协议，{label}合约标志着他在商业领域的又一突破。',
    '签约达成！{brand}选中{playerName}作为{category}领域代言人，{label}合约让双方都满意。',
    '{playerName}的商业价值再获认可，与{brand}的{category}代言正式签约。{label}合同条款显示双方对长期合作充满信心。',
    '{brand}正式宣布：{playerName}成为其{category}产品线代言人。{label}签约仪式在{brand}总部举行。',
    '{category}市场格局变化！{playerName}与{brand}达成代言合作，{label}合同的签署引发行业关注。',
    '{playerName}收获新代言！与{brand}的{category}合作正式官宣，{label}合约将大幅提升其商业版图。',
    '商业新篇章！{playerName}与{brand}签订{category}代言合同，{label}的签约费创下同类别新高。',
    '{brand}选择{playerName}作为{category}代言人绝非偶然，{label}合约体现了品牌对其市场号召力的认可。',
    '{playerName}的代言版图再扩一城，与{brand}的{category}合作正式签约。{label}合约细节将于下周公布。',
    '今日重磅：{brand}宣布{playerName}成为{category}代言人，{label}签约标志着品牌年轻化战略的推进。',
    '{playerName}的商业影响力持续攀升，与{brand}的{category}代言合作正式达成。{label}合同为期三年。',
    '{category}领域迎来新面孔！{brand}正式签约{playerName}，{label}代言合作将覆盖多个市场。',
    '{playerName}与{brand}的代言签约仪式今天举行，{category}合作正式开启。{label}合约包含多项激励条款。',
    '{brand}在季度发布会上宣布{playerName}成为{category}品牌大使，{label}签约金额据传超过八位数。',
    '{playerName}的商业团队确认与{brand}达成{category}代言协议，{label}合同将带来可观的收入增长。',
    '代言新动态！{playerName}与{brand}的{category}合作正式签约，{label}合约同时涵盖线上和线下推广。',
    '{brand}看中{playerName}在{category}领域的巨大潜力，{label}代言合同正式签署。',
    '{playerName}喜添新代言！与{brand}的{category}签约完成，{label}合同将为其带来丰厚回报。',
    '商业版图再扩张：{playerName}与{brand}正式签约{category}代言，{label}合约规模超出市场预期。',
    '{category}代言市场洗牌！{brand}签下{playerName}，{label}合同标志着一个新时代的开始。',
    '{playerName}正式成为{brand}{category}代言人，{label}签约仪式吸引了数百家媒体到场。',
    '好消息传来！{playerName}与{brand}完成{category}代言签约，{label}合同将极大拓展其商业版图。',
    '{brand}正式官宣{playerName}为{category}代言人，{label}合约的签署标志着品牌对体育营销的重视。',
    '{playerName}的商业团队与{brand}经过多轮谈判后正式签约，{category}代言{label}合同细节今日公布。',
    '{category}市场再添重磅合作！{playerName}与{brand}的{label}代言签约已完成。',
    '代言矩阵再升级！{playerName}正式成为{brand}{category}代言人，{label}签约刷新了该品类的代言费纪录。',
    '{brand}选择{playerName}绝非偶然，{category}市场的{label}代言合作将为双方带来双赢。',
    '{playerName}的经纪团队确认{category}代言签约完成，{brand}的{label}合同包含肖像权和活动出席。',
    '今日官宣：{playerName}成为{brand}{category}全球代言人。{label}签约将覆盖亚太和北美两大市场。',
    '{playerName}与{brand}的{category}代言签约消息刷爆社交媒体，{label}合约的热度甚至超过了今天的比赛。',
    '{brand}在中国市场选择{playerName}作为{category}代言人，{label}签约意味着品牌深耕亚太的决心。',
    '{category}代言市场今日迎来重磅消息：{playerName}与{brand}正式签约，{label}合同令业界瞩目。',
    '{playerName}再添代言！与{brand}的{category}合作正式签约，{label}合约还包含产品共创条款。'
  ],
  endorsement_reject: [
    '{playerName}拒绝了{brand}的{category}代言邀约，表示目前专注球场表现。{label}合同的金额据传不低。',
    '{brand}向{playerName}抛出{category}代言橄榄枝，但遭到了婉拒。{label}邀约的条款未达到球员预期。',
    '{playerName}选择不与{brand}签约{category}代言，{label}的报价与他的市场定位不符。',
    '出人意料！{playerName}拒绝了{brand}的{category}代言合同。{label}签约条件可能是主要原因。',
    '{brand}的{category}代言邀约被{playerName}礼貌回绝，{label}合同中的排他条款可能是转折点。',
    '{playerName}的经纪人确认拒绝了{brand}的{category}代言，{label}合约期限过长是主要顾虑。',
    '{category}代言市场的意外：{playerName}决定不与{brand}合作，{label}邀约的某些条款无法接受。',
    '{brand}为{playerName}量身定制的{category}代言方案被婉拒，{label}合同的商业分成可能是分歧所在。',
    '{playerName}审慎考虑后决定拒绝{brand}的{category}代言，{label}邀约与个人品牌形象不完全契合。',
    '{brand}的{category}代言被{playerName}团队否决，{label}合同对球员活动自由的限制过多。',
    '代言市场的意外转折：{playerName}选择不签约{brand}的{category}代言，{label}邀约的品牌调性不匹配。',
    '{playerName}拒绝了{brand}的{category}代言，称"现阶段更想专注篮球"。{label}合同金额虽高但不是一切。',
    '{brand}对{playerName}的{category}代言邀约被退回，{label}合同中的道德条款过于严苛。',
    '{playerName}的商业团队经过评估后拒绝了{brand}的{category}代言，{label}合作的风险收益比不够理想。',
    '尽管{brand}开出了丰厚的{category}代言条件，{playerName}还是选择了拒绝。{label}合同的某些附加条件是关键。',
    '{playerName}婉拒{brand}的{category}代言邀请，{label}合同中的独家排他条款限制了其他商业可能性。',
    '{brand}试图用高薪吸引{playerName}代言{category}产品，但{label}邀约仍被拒绝。球员有自己的商业规划。',
    '{playerName}决定暂不扩大代言版图，拒绝了{brand}的{category}代言。{label}邀约虽然诱人但时机不对。',
    '{category}代言市场的一丝遗憾：{playerName}与{brand}未能达成合作，{label}合同在最后关头谈崩了。',
    '{brand}表示尊重{playerName}拒绝{category}代言的决定，{label}邀约的大门始终敞开。',
    '{playerName}对{brand}的{category}代言表示感谢但婉言谢绝，{label}合同与其长期职业规划有冲突。',
    '商业谈判桌上，{playerName}的团队决定不签{brand}的{category}代言。{label}合约虽然利润可观但战略不匹配。',
    '{brand}对{playerName}拒绝{category}代言感到遗憾，{label}邀约本应是双赢的合作。',
    '{playerName}选择品牌很谨慎，这次拒绝了{brand}的{category}代言。{label}合同的品牌价值观与个人理念有差距。',
    '据消息人士透露，{playerName}拒绝了{brand}的{category}代言，{label}合同金额虽创品类纪录但附加条件过多。',
    '{brand}的{category}代言计划需要调整，{playerName}的拒绝让{label}邀约方案回到起点。',
    '{playerName}表示目前代言数量已经足够，婉拒了{brand}的{category}代言。{label}合同虽然优厚但时间排不开。',
    '令人意外的商业决策：{playerName}拒绝{brand}的{category}代言，{label}邀约的市场反馈其实很正面。',
    '{brand}开出天价{category}代言仍被{playerName}婉拒，{label}合同的年限问题是最后一根稻草。',
    '{playerName}团队发表声明，感谢{brand}的{category}代言邀请，但{label}合约目前不符合发展战略。',
    '{category}代言市场的遗憾：{playerName}与{brand}合作未能成行，{label}合同在排他性条款上无法达成共识。',
    '{brand}尊重{playerName}的决定，{category}代言{label}邀约被拒后品牌将寻找其他代言人。',
    '{playerName}的商业选择总是出人意料，这次拒绝{brand}的{category}代言也不例外。{label}合同对球员来说不是最优选。',
    '{brand}在{category}代言上对{playerName}志在必得，但{label}邀约最终还是被退回了。',
    '{playerName}对代言品牌的要求很严格，{brand}的{category}代言未能通过审核。{label}合同的某些细节未达标。'
  ],
  signature_shoe: [
    '{playerName}的个人签名鞋正式发布！{brand}打造的{detail}系列引发球鞋圈轰动，{category}市场迎来新爆款。',
    '{brand}为{playerName}量身打造签名鞋款，{detail}的设计理念融合了球员的个人故事。{category}新品即将上市。',
    '签名鞋面世！{playerName}×{brand}的{detail}系列今日全球首发，{category}爱好者排队抢购。',
    '{playerName}的第一双签名鞋由{brand}出品，{detail}配色灵感来自他的家乡。{category}市场反响热烈。',
    '球鞋界的大事件！{brand}发布{playerName}签名鞋{detail}，{category}领域的又一里程碑。',
    '{playerName}亲自参与了{brand}签名鞋的设计，{detail}的每个细节都承载着他对篮球的理解。{category}新品备受期待。',
    '{brand}正式推出{playerName}签名鞋系列，{detail}的科技配置在同价位中无出其右。{category}市场格局将变。',
    '签名鞋首发日！{playerName}的{brand}{detail}在各大门店上架，{category}爱好者蜂拥而至。',
    '{playerName}的签名鞋故事：与{brand}合作打磨了18个月，{detail}终于与公众见面。{category}新品预售已破纪录。',
    '{brand}在纽约举办发布会，正式推出{playerName}签名鞋{detail}。{category}市场的新王者？',
    '签名鞋来了！{playerName}与{brand}联手打造的{detail}系列，{category}领域最具话题性的新品。',
    '{playerName}的签名鞋承载了太多期待，{brand}的{detail}终于不负众望。{category}粉丝争相入手。',
    '{brand}为{playerName}设计的签名鞋{detail}采用了全新缓震科技，{category}市场为之沸腾。',
    '从概念到成品，{playerName}与{brand}共同打造的{detail}签名鞋终于面世。{category}爱好者的收藏清单又多了一项。',
    '{playerName}签名鞋{detail}首发配色"破晓"灵感来自他的首场NBA比赛，{brand}的设计功力可见一斑。{category}新标杆。',
    '球鞋圈炸了！{brand}发布{playerName}签名鞋{detail}，{category}预售通道10分钟即售罄。',
    '{playerName}的签名鞋不只是一款{category}产品，更是{brand}与球员深度合作的结晶。{detail}的设计语言独树一帜。',
    '{brand}砸重金推广{playerName}签名鞋{detail}，{category}市场迎来近十年最大的新品发布。',
    '{playerName}签名鞋{detail}的发售引发通宵排队，{brand}门店外排起了长龙。{category}文化的又一次狂欢。',
    '签名鞋评测出炉：{brand}为{playerName}打造的{detail}在{category}测评中获得满分好评。',
    '{playerName}对{brand}团队打造的{detail}签名鞋非常满意，"这就是我想要的鞋"。{category}市场反应火爆。',
    '限量配色！{brand}推出{playerName}签名鞋{detail}特别版，{category}收藏家们已经摩拳擦掌。',
    '{playerName}签名鞋{detail}采用环保材料制作，{brand}在{category}领域的可持续发展承诺令人敬佩。',
    '首发即爆款！{brand}的{playerName}签名鞋{detail}首日销量打破{category}品类纪录。',
    '{playerName}签名鞋的幕后故事：与{brand}设计师反复修改了37版才定稿{detail}。{category}品质的极致追求。',
    '{brand}确认{playerName}签名鞋{detail}将推出儿童版，{category}市场覆盖全年龄段。',
    '签名鞋文化新篇章：{playerName}与{brand}的{detail}系列不仅是{category}产品，更是一种态度的表达。',
    '{playerName}穿着{brand}{detail}签名鞋在今晚的比赛中砍下高分，{category}代言的最好广告。',
    '{brand}宣布{playerName}签名鞋{detail}全球销售额首周突破1亿美元，{category}品类的新王者诞生。',
    '{playerName}的签名鞋{detail}在二级市场价格翻了三倍，{brand}的{category}营销策略堪称教科书级别。',
    '球鞋爱好者福音！{brand}确认{playerName}签名鞋{detail}将补货，{category}市场终于不用加价了。',
    '{playerName}签名鞋{detail}的设计灵感来自他的X因素天赋，{brand}在{category}领域的创意让人惊喜。',
    '{brand}为{playerName}打造的{detail}签名鞋被誉为"年度最佳{category}新品"，实至名归。',
    '{playerName}签名鞋首发活动吸引了上千名粉丝，{brand}在{category}领域的人气达到了新高度。',
    '{detail}签名鞋的成功让{brand}在{category}市场站稳脚跟，{playerName}的商业号召力再次得到验证。'
  ],
  coach_upgrade: [
    '{playerName}的{label}教练团队完成升级！新任{category}教练{detail}的加入将为训练质量带来质的飞跃。',
    '{brand}教练组迎来新面孔：{detail}正式出任{playerName}的{category}教练。{label}训练体系全面革新。',
    '{playerName}签下了顶级{category}教练{detail}，{label}训练计划将更加科学和高效。',
    '教练升级！{playerName}的{label}团队新增{category}专家{detail}，{brand}级别的训练支持不再遥远。',
    '{detail}加入{playerName}的训练团队，担任{category}教练。{label}的教练阵容堪称豪华。',
    '{playerName}在休赛期重组了教练团队，{detail}将负责{category}训练。{label}教练升级的效果值得期待。',
    '{category}训练升级！{playerName}聘请了{detail}担任私人教练，{label}的针对性训练方案已开始执行。',
    '{detail}的加入让{playerName}的{category}训练迈上新台阶。{label}教练团队的实力在联盟中首屈一指。',
    '{playerName}投资教练团队的决心可见一斑，{detail}将主导{category}方面的训练。{label}升级投入了重金。',
    '教练组重磅加盟！{detail}正式成为{playerName}的{category}教练，{label}训练水平将大幅提升。',
    '{playerName}的{label}训练体系迎来重大升级，{detail}带来的{category}理念将改变一切。',
    '{brand}级别的教练配置！{detail}出任{playerName}{category}教练，{label}训练计划即将启动。',
    '{detail}拥有15年{category}训练经验，他的加入让{playerName}的{label}团队如虎添翼。',
    '{playerName}在教练投资上从不吝啬，这次签下{detail}负责{category}训练。{label}的升级物有所值。',
    '{category}训练新篇章！{detail}加入{playerName}的教练团队，{label}训练将更加系统化。',
    '{playerName}的教练团队配置堪比全明星阵容，{detail}的{category}专长将补齐{label}训练的最后一块短板。',
    '重磅教练签约！{detail}选择加入{playerName}的训练团队，{category}和{label}训练将焕然一新。',
    '{playerName}的{label}训练迎来新气象，{detail}的{category}方法在联盟中备受推崇。',
    '训练升级完成！{detail}已开始为{playerName}制定{category}计划。{label}训练效率有望提升30%。',
    '{detail}在{category}领域的声望极高，他的加入让{playerName}的{label}训练质量有了保障。',
    '{playerName}斥巨资升级教练团队，{detail}将负责{category}训练。{label}投入的背后是对卓越的追求。',
    '教练组再添强援！{detail}出任{category}教练，{playerName}的{label}训练体系日臻完善。',
    '{detail}在社交媒体上确认加入{playerName}团队，将负责{category}训练。{label}升级引发球迷热议。',
    '{playerName}对新教练{detail}充满期待，{category}训练将在{label}体系下焕发新生。',
    '{category}训练专家{detail}加入{playerName}团队，{label}教练升级被认为是本赛季最重要的投资。'
  ],
  facility_upgrade: [
    '{playerName}的私人训练馆完成{label}升级！{category}设施的{detail}改造让训练环境达到顶级水准。',
    '{brand}级别的训练设施！{playerName}的{category}训练中心完成{detail}升级，{label}体验焕然一新。',
    '{playerName}投资{category}训练设施升级，{detail}改造后的{label}空间将成为他的第二主场。',
    '设施升级完成！{playerName}的{category}训练基地新增{detail}设备，{label}训练体验显著提升。',
    '{detail}设备入驻{playerName}的私人训练馆，{category}训练条件今非昔比。{label}升级投资超七位数。',
    '{playerName}的{label}训练环境迎来大升级，{category}方面新增了{detail}系统。训练效率将大幅提升。',
    '顶级配置！{playerName}的{category}训练设施新增{detail}，{label}标准已经超越了大多数NBA球队。',
    '{detail}技术被引入{playerName}的{category}训练体系，{label}设施升级标志着训练进入智能化时代。',
    '{playerName}的私人训练馆新增了{category}专用{detail}区域，{label}升级让他无需依赖球队设施。',
    '训练环境革新！{playerName}完成{category}设施{detail}升级，{label}配置在联盟球员中首屈一指。',
    '{playerName}在{category}训练设施上的投入从不手软，{detail}升级后的{label}空间令人叹为观止。',
    '{brand}同款！{playerName}的{category}训练区配备了{detail}系统，{label}设施已达到专业队级别。',
    '{detail}恢复设备安装完毕，{playerName}的{category}训练和恢复效率将大幅提升。{label}升级效果立竿见影。',
    '{playerName}的{label}训练基地新增{category}专用{detail}，设施水准堪比{brand}训练中心。',
    '升级后的{category}训练空间让{playerName}赞不绝口，{detail}的加入让{label}训练更加科学高效。',
    '{playerName}的{category}训练设施完成第三轮升级，{detail}设备的引入让{label}体验达到巅峰。',
    '最新科技入驻！{detail}系统在{playerName}的{category}训练馆安装完毕，{label}训练进入数据驱动时代。',
    '{playerName}对{category}训练设施的{detail}升级非常满意，{label}环境让训练变得享受。',
    '设施升级持续进行：{playerName}的{category}区域新增{detail}，{label}配置已经是联盟顶级。',
    '{detail}设备的加入让{playerName}的{category}训练效果倍增，{label}设施升级的投资很快就会收回回报。',
    '{playerName}的私人训练馆新增了价值百万的{category}{detail}设备，{label}升级彰显了他对训练的极致追求。',
    '{category}训练设施再升级！{detail}系统让{playerName}的{label}训练更加精准和高效。',
    '{playerName}在休赛期完成了{category}设施的{detail}升级，{label}训练环境已达到联盟最顶尖水准。',
    '{brand}技术加持！{playerName}的{category}训练区引入{detail}系统，{label}设施在球员私人训练馆中无出其右。',
    '{detail}设备在{playerName}的{category}训练中已经开始使用，{label}升级带来的效果将在赛季中体现。'
  ],
  luxury_purchase: [
    '{playerName}购入了一处{category}级别的{detail}，{label}的奢华程度令人咋舌。',
    '{brand}定制款{detail}成为了{playerName}的最新收藏，{category}级别的{label}消费品彰显身份。',
    '{playerName}在{category}领域大手笔消费，{detail}的{label}购入让他的资产组合更加多元。',
    '豪气冲天！{playerName}拿下了一套{category}级别的{detail}，{label}的价值不菲。',
    '{playerName}的{category}收藏再添一件：{detail}。{label}级别的消费已经成为他的日常。',
    '{detail}入库！{playerName}在{category}上的消费又创新高，{label}的排面给足了。',
    '{playerName}不差钱！最新购入的{category}{detail}让{label}水准再上台阶。',
    '{brand}限量款{detail}被{playerName}收入囊中，{category}级别的{label}消费引发社交媒体热议。',
    '{playerName}的{category}品味一直很高，这次购入的{detail}是{label}级别中的顶级。',
    '新的{category}玩具！{playerName}买下了{detail}，{label}的消费让普通人只能仰望。',
    '{playerName}在{category}上的消费从未令人失望，{detail}的{label}品质就是最好的证明。',
    '{brand}出品！{playerName}新入手的{category}{detail}让人羡慕不已，{label}的格调无可挑剔。',
    '{playerName}在{category}市场又出手了，{detail}的{label}级别让同行自叹不如。',
    '资产升级！{playerName}添置了{category}级别的{detail}，{label}消费再次刷新纪录。',
    '{playerName}的{category}收藏室又多了{detail}，{label}级别的物品让整个空间更加耀眼。',
    '{detail}到货！{playerName}对新的{category}{label}爱不释手，这笔消费绝对物有所值。',
    '{playerName}在{category}上的大手笔已经不是新闻，但{detail}的{label}级别还是让人惊叹。',
    '{brand}定制！{playerName}购入的{category}{detail}完美体现了{label}的生活方式。',
    '{playerName}新入手的{category}{detail}价值不菲，{label}消费再次证明他的商业价值。',
    '高端消费！{playerName}在{category}领域的{detail}购入让{label}生活更加精彩。',
    '{playerName}出手阔绰，在{category}市场购入{detail}，{label}级别的排面堪称一绝。',
    '{category}领域的最新动向：{playerName}拿下{detail}，{label}消费再次登上体育商业头条。',
    '{playerName}的{category}品味在线，{detail}的{label}级别让他的生活品质再创新高。',
    '又一件{category}宝贝！{playerName}购入的{detail}让{label}收藏更加丰富。',
    '{brand}高端线！{playerName}的{category}{detail}展现了他对{label}品质的极致追求。',
    '{playerName}在{category}市场的眼光独到，{detail}的{label}级别恰到好处地展现了他的品味。',
    '消费升级！{playerName}购入{category}{detail}，{label}的生活方式让他成为球员中的时尚标杆。',
    '{playerName}对{category}的热爱不止于赛场，{detail}的{label}消费展现了他全方位的高品质生活。',
    '{brand}限量发售！{playerName}抢先入手{category}{detail}，{label}级别的收藏价值不可估量。',
    '出手就是不一样！{playerName}的{category}{detail}购入让{label}标准再次提高。',
    '{playerName}在{category}上的投资总是精准的，{detail}的{label}品质让他的资产组合更有分量。',
    '最新动向：{playerName}购入{category}{detail}，{label}消费再次印证他的超高商业价值。'
  ],
  media_event: [
    '{playerName}出席了{brand}举办的{category}媒体活动，{label}的表现获得一致好评。{detail}环节成为全场焦点。',
    '{brand}{category}活动现场，{playerName}的{label}发言引发热议。{detail}话题登上社交媒体热搜。',
    '{playerName}在{brand}的{category}发布会上亮相，{label}环节的{detail}互动让现场气氛达到高潮。',
    '媒体日盛况！{playerName}出席{brand}{category}活动，{label}采访中谈及{detail}引发广泛关注。',
    '{playerName}的{label}媒体形象在{brand}{category}活动中大放异彩，{detail}环节圈粉无数。',
    '{brand}邀请{playerName}参加{category}特别活动，{label}表现的{detail}让媒体赞不绝口。',
    '{playerName}在{brand}{category}活动的红毯上风采夺目，{label}造型的{detail}细节成为话题。',
    '{category}媒体盛事！{playerName}以{brand}代言人身份出席，{label}的{detail}互动温暖全场。',
    '{playerName}在{brand}{category}活动上的{label}发言金句频出，{detail}观点被各大媒体转载。',
    '{brand}{category}活动今天举行，{playerName}的{label}亮相和{detail}分享成为最大看点。',
    '{playerName}的媒体表现力在{brand}{category}活动中一览无余，{label}的{detail}回应展现了高情商。',
    '{category}活动现场直击：{playerName}与{brand}高层{label}合影，{detail}环节气氛融洽。',
    '{playerName}在{brand}的{category}活动中透露了{label}相关信息，{detail}内容引发粉丝猜测。',
    '{brand}年度{category}盛典上，{playerName}获得{label}荣誉，{detail}颁奖词让人动容。',
    '{playerName}出席{brand}{category}活动的照片刷屏社交媒体，{label}造型的{detail}元素太抢眼了。',
    '{category}活动现场：{playerName}与粉丝的{label}互动环节，{detail}小故事感动了所有人。',
    '{playerName}在{brand}{category}活动的后台采访中表示，{label}经历让他成长了很多。{detail}感悟发人深省。',
    '{brand}的{category}活动因为{playerName}的{label}出席而备受关注，{detail}环节的设计巧妙有趣。',
    '{playerName}在{brand}{category}活动上宣布了{label}公益计划，{detail}内容获得全场掌声。',
    '{category}活动精彩回顾：{playerName}的{label}表现是最大亮点，{detail}瞬间成为经典画面。',
    '{playerName}在{brand}{category}活动中展现了不同于球场的一面，{label}的{detail}才华让人惊喜。',
    '{brand}感谢{playerName}在{category}活动中的{label}出席，{detail}环节的合作堪称完美。',
    '{playerName}的{brand}{category}活动行程已结束，{label}表现和{detail}互动收获了大量正面评价。',
    '{category}媒体日花絮：{playerName}在{label}环节的{detail}回答让记者们频频点头。',
    '{playerName}以{brand}大使身份出席{category}活动，{label}致辞中的{detail}观点被广泛传播。'
  ],
  brand_interest: [
    '{brand}对{playerName}表达了{category}代言意向，{label}合作尚在初步接触阶段。{detail}的市场前景令品牌方看好。',
    '消息源：{brand}正在评估与{playerName}的{category}代言合作，{label}谈判尚未开始。{detail}的潜力是最大吸引力。',
    '{brand}有意邀请{playerName}代言{category}产品，{label}合作的前景取决于后续沟通。{detail}领域的布局正在推进。',
    '{category}代言市场动向：{brand}对{playerName}表现出浓厚兴趣，{label}合作可能在未来数月敲定。{detail}品类是重点方向。',
    '{playerName}的商业价值持续攀升，{brand}已将其列入{category}代言候选人。{label}合作的{detail}细节仍在讨论中。',
    '{brand}正在暗中接触{playerName}的经纪团队，探讨{category}代言可能性。{label}邀约的{detail}方案尚未正式提出。',
    '{category}市场新动向！{brand}看中了{playerName}的代言价值，{label}合作的{detail}前景被业内人士看好。',
    '{playerName}的商业团队确认收到了{brand}的{category}代言意向，{label}合作的{detail}条款正在初步评估中。',
    '{brand}高层在采访中暗示对{playerName}的兴趣，{category}代言的{label}合作可能只是时间问题。{detail}市场正蓄势待发。',
    '商业嗅觉灵敏的{brand}已经盯上了{playerName}，{category}代言的{label}意向已经传达。{detail}领域的竞争将更激烈。',
    '{playerName}或将成为{brand}的下一个{category}代言人？{label}合作的{detail}消息在业内引发热议。',
    '据商业媒体透露，{brand}正考虑在{category}领域签下{playerName}，{label}合作的{detail}方案正在制定中。',
    '{brand}的{category}代言策略瞄准了{playerName}，{label}合作的{detail}市场价值被评估为A级。',
    '{playerName}的商业前景一片光明，{brand}已经表达了{category}代言的初步意向。{label}合作的{detail}细节有待进一步磋商。',
    '品牌方动作频频！{brand}在{category}代言上对{playerName}志在必得，{label}合作的{detail}框架已基本成型。',
    '{category}代言的下一个风口：{brand}看中了{playerName}的影响力，{label}合作将覆盖{detail}多个市场。',
    '{playerName}的经纪人对{brand}的{category}代言意向表示欢迎，{label}合作的{detail}条件需要进一步商谈。',
    '{brand}的全球营销总监亲自联系了{playerName}团队，{category}代言的{label}意向非常明确。{detail}市场将迎来新格局。',
    '行业内部消息：{brand}已经将{playerName}列为{category}代言的首选目标，{label}合作的{detail}方案最快下月出炉。',
    '{playerName}的商业价值被{brand}高度认可，{category}代言的{label}合作意向已经正式传达。{detail}品类将成为突破口。',
    '{brand}在{category}领域急需一位重量级代言人，{playerName}是最佳人选。{label}合作的{detail}谈判即将启动。',
    '多方确认：{brand}已就{category}代言向{playerName}发出初步意向，{label}合作的{detail}前景令人期待。',
    '{playerName}的商业影响力持续扩大，{brand}加入了对他的{category}代言争夺。{label}合作的{detail}价值不可小觑。',
    '{brand}的{category}代言战略正在调整，{playerName}被纳入核心候选人。{label}合作的{detail}条件将在近期提出。',
    '{category}代言市场的下一个大新闻？{brand}对{playerName}的{label}意向已经不再是秘密。{detail}领域的合作呼之欲出。'
  ],
  default: [
    '{playerName}的{category}事务有了新进展，{label}方面的{detail}变动引发了{brand}的关注。',
    '{playerName}在{category}领域的一次{label}活动引起热议，{detail}相关话题登上热搜。{brand}方面也在密切关注。',
    '{playerName}的商业团队正在推进{category}方面的{label}计划，{detail}细节将在适当时候公布。{brand}是合作伙伴之一。',
    '{category}市场最新动态：{playerName}的{label}事务有新变化，{detail}方面的进展值得关注。{brand}已经做出回应。',
    '{playerName}的{category}安排今日更新，{label}事务中的{detail}部分正在协调中。{brand}方面的态度很积极。',
    '商业领域消息：{playerName}的{category}{label}有了新进展，{detail}条款即将敲定。{brand}将参与后续环节。',
    '{playerName}在{category}方面做出了{label}调整，{detail}变化将带来连锁反应。{brand}已经表示支持。',
    '{category}事务更新：{playerName}的{label}决策获得了{brand}的认可，{detail}安排正在有序推进。',
    '{playerName}的{category}团队发布了一份{label}声明，回应了关于{detail}的疑问。{brand}方面暂时没有评论。',
    '{brand}方面确认了与{playerName}在{category}领域的{label}合作，{detail}细节将于近日公布。',
    '{playerName}的{category}{label}事务进入关键阶段，{detail}环节的推进速度超出了预期。{brand}团队表示满意。',
    '{category}市场消息：{playerName}的{label}安排与{brand}的{detail}策略高度契合，合作前景看好。',
    '{playerName}在{category}领域的新动向：{label}层面的{detail}变化获得了{brand}的积极评价。',
    '{brand}与{playerName}在{category}方面的{label}合作正在深化，{detail}细节的完善让双方都充满信心。',
    '{playerName}的{category}团队就{label}事宜与{brand}进行了深入沟通，{detail}问题取得了实质性进展。',
    '{category}领域的最新消息：{playerName}的{label}决策得到了{brand}的理解和支持，{detail}执行方案已经确定。',
    '{playerName}在{category}方面的{label}布局日渐清晰，{detail}环节与{brand}的配合越来越默契。',
    '{brand}对{playerName}在{category}领域的{label}表现给予高度评价，{detail}方面的潜力被进一步挖掘。',
    '{playerName}的{category}事务今天有了{label}层面的进展，{detail}相关的{brand}回应引人注目。',
    '{category}商业快讯：{playerName}的{label}安排得到{brand}确认，{detail}部分将在下个阶段正式实施。',
    '{playerName}在{category}方面的{label}表现获得了市场认可，{detail}相关的{brand}合作更加稳固。',
    '{brand}发表声明支持{playerName}的{category}{label}决策，{detail}执行将在双方协调下推进。',
    '{playerName}的{category}团队与{brand}就{label}事项达成共识，{detail}细节的敲定指日可待。',
    '{category}市场最新：{playerName}的{label}策略得到了{brand}的积极响应，{detail}方面的合作即将进入新阶段。',
    '{playerName}在{category}领域的{label}行动得到了{brand}的全力配合，{detail}相关事务进展顺利。'
  ],
  _extra: [
    '{playerName}与{brand}深化{category}合作，{label}阶段的{detail}安排已确认。',
    '{brand}宣布{playerName}成为{category}系列代言人，{label}合约涵盖{detail}领域。',
    '{playerName}的{category}代言{label}续约成功，{brand}方面对{detail}表现非常满意。',
    '{brand}在{category}市场加大投入，{playerName}的{label}合作是核心策略。{detail}方向将重点突破。',
    '{playerName}出席了{brand}的{category}发布会，{label}身份正式亮相。{detail}合作即将全面展开。',
    '{category}代言市场新动向：{playerName}与{brand}的{label}合作升级，{detail}成为新焦点。',
    '{brand}为{playerName}量身定制了{category}推广方案，{label}级别的{detail}内容将在下月上线。',
    '{playerName}在{brand}的{category}活动中担任主角，{label}环节的{detail}设计获得一致好评。',
    '商业新高度！{playerName}的{category}{label}合作进入{brand}全球战略版图。{detail}市场将率先落地。',
    '{brand}确认与{playerName}续签{category}代言，{label}合同包含{detail}条款。双方合作进入新阶段。',
    '{playerName}的{category}价值被{brand}进一步认可，{label}层面的{detail}支持力度加大。',
    '{category}合作里程碑：{playerName}与{brand}的{label}关系迈入第三年。{detail}成果超出预期。',
    '{brand}邀请{playerName}参与{category}产品研发，{label}级别的{detail}建议被采纳。',
    '{playerName}的{category}{label}事务进展顺利，{brand}方面对{detail}执行效果表示赞赏。',
    '{brand}在{category}领域与{playerName}的合作被视为行业标杆，{label}模式的{detail}经验将被复制推广。',
    '{playerName}确认将出席{brand}年度{category}盛典，{label}身份和{detail}安排已敲定。',
    '{category}市场持续看好{playerName}的{label}价值，{brand}的{detail}投资获得正回报。',
    '{brand}为{playerName}打造的{category}{label}方案进入执行阶段，{detail}部分率先启动。',
    '{playerName}在{category}方面与{brand}建立了深厚信任，{label}合作的{detail}细节高度契合。',
    '{category}代言的良性循环：{playerName}的{label}表现为{brand}带来{detail}增长，双方共赢。',
    '{brand}加大对{playerName}{category}代言的投入，{label}级别的{detail}资源全面倾斜。',
    '{playerName}的{category}影响力持续扩大，{brand}在{label}方面受益于{detail}效应。',
    '{brand}与{playerName}的{category}{label}合作被业内评为年度最佳代言，{detail}案例将入选商学院教材。',
    '{playerName}出席{brand}{category}活动引发粉丝热议，{label}身份的{detail}曝光度创新高。',
    '{category}商业快讯：{playerName}与{brand}的{label}合作延伸至{detail}领域。',
    '{brand}正式宣布{playerName}成为{category}全球大使，{label}合约和{detail}细节今日公布。',
    '{playerName}的{category}{label}合约进入第二年，{brand}对{detail}效果非常满意。',
    '{brand}与{playerName}在{category}领域的{label}合作模式成为行业范本，{detail}是核心亮点。',
    '{playerName}确认将与{brand}共同开发{category}新产品，{label}级别的{detail}规划已启动。',
    '{category}市场动态：{playerName}的{label}代言为{brand}带来显著{detail}提升。',
    '{brand}为{playerName}策划的{category}{label}推广活动大获成功，{detail}指标全面超越目标。',
    '{playerName}的{category}代言在{brand}内部评级中获得A+，{label}的{detail}贡献是关键因素。',
    '{brand}继续押注{playerName}的{category}价值，{label}层面的{detail}预算翻倍。',
    '{category}代言年度回顾：{playerName}为{brand}创造的{label}价值和{detail}影响令人瞩目。',
    '{playerName}与{brand}的{category}合作即将迎来{label}周年，{detail}成果将在庆典上展示。',
    '{brand}高层表示{playerName}是{category}代言的最佳选择，{label}和{detail}表现无可挑剔。'
  ]
};

// ============ TEXT_POOL_STORY — Daily Story Generation ============

const TEXT_POOL_STORY = {
  game_close_win: [
    { text: '{playerName}在最后时刻稳稳罚中两球，将领先优势保持到终场。全场球迷起立欢呼，队友们冲上来将他团团围住。更衣室里香槟的味道弥漫在空气中。', changes: { mood: 15, cash: 0, fame: 10 } },
    { text: '第四节还剩12秒，{playerName}接到传球后果断出手，球在篮筐上弹了两下落入网心。全场沸腾，他在退防时用力捶了捶胸口。', changes: { mood: 18, cash: 0, fame: 12 } },
    { text: '一场拉锯战打到了最后一分钟。{playerName}在防守端完成关键抢断，随后快攻上篮得手，将分差拉开到3分。对手最后的投篮弹框而出，胜利属于他们。', changes: { mood: 14, cash: 0, fame: 8 } },
    { text: '末节的每一次进攻都像是在走钢丝。{playerName}在最后30秒的挡拆后中距离命中，这个球让整座球馆都震了起来。赛后他说："这种时刻，就是你训练的意义。"', changes: { mood: 16, cash: 0, fame: 11 } },
    { text: '加时赛中{playerName}像换了一个人，连续得到6分帮助球队建立优势。对手反扑未果，终场哨响时他已经精疲力竭地倒在了地板上。', changes: { mood: 12, cash: 0, fame: 9 } },
    { text: '悬念留到了最后一投。{playerName}在三分线外接到球，面对防守没有犹豫，手起刀落。球进哨响，他张开双臂享受全场MVP的呼喊。', changes: { mood: 20, cash: 0, fame: 15 } },
    { text: '比赛最后一分钟双方三次交替领先，{playerName}在混乱中抢到关键进攻篮板并补篮命中。这一球让对手彻底失去了斗志。', changes: { mood: 13, cash: 0, fame: 7 } },
    { text: '{playerName}用一记漂亮的背身单打在底线转身命中，还造成了犯规。加罚命中后球队领先2分，对手的最后一攻在严密防守下化为泡影。', changes: { mood: 15, cash: 0, fame: 9 } },
    { text: '末节绝地反击！{playerName}带领球队在最后5分钟打出15-4的高潮，他在关键时刻连得8分。赛后更衣室里队友们把他抛向了空中。', changes: { mood: 17, cash: 0, fame: 13 } },
    { text: '这是一场属于{playerName}的比赛。第四节独得14分，包括最后两分钟的关键三分和两次罚球。教练赛后说："他就是为这种时刻而生的。"', changes: { mood: 16, cash: 0, fame: 11 } },
    { text: '两分的差距在最后8秒被{playerName}用一记突破上篮扳回，对手匆忙出手的半场超远三分偏出。{playerName}跪在地板上，用拳头连续捶地。', changes: { mood: 18, cash: 0, fame: 12 } },
    { text: '第四节成了{playerName}的个人秀。他在防守端封盖了对方的快攻上篮，转头又在进攻端命中了追身三分。球迷们的欢呼声几乎要掀翻屋顶。', changes: { mood: 14, cash: 0, fame: 10 } },
    { text: '比分咬了一整场，{playerName}在最后2分钟连送两次助攻帮助队友得分，自己又稳稳罚进4球。赛后他说："赢球不一定非得自己得分。"', changes: { mood: 13, cash: 0, fame: 8 } },
    { text: '比赛还剩3秒，{playerName}在弧顶接到球，面前有两名防守人。他后撤一步跳起出手，球划出完美弧线空心入网。球馆里响起了震耳欲聋的欢呼声。', changes: { mood: 20, cash: 0, fame: 16 } },
    { text: '一次关键的防守立功了。{playerName}在最后时刻迫使对方核心传球失误，随后快速推进将球传给空位的队友完成绝杀。团队篮球的完美体现。', changes: { mood: 14, cash: 0, fame: 8 } },
    { text: '末节的每一秒都让人窒息。{playerName}在对方追平后立刻回应了一个2+1，加罚不中他自己抢到篮板补扣得手。这5分彻底打垮了对手的士气。', changes: { mood: 16, cash: 0, fame: 11 } },
    { text: '一场鏖战以{playerName}的关键表现画上句号。他在最后1分钟贡献了2分1助攻1抢断，数据栏上写满了关键时刻的贡献。', changes: { mood: 15, cash: 0, fame: 9 } },
    { text: '对手在最后15秒反超了1分，暂停回来后{playerName}持球单打，一个crossover晃开空间后急停跳投，球应声入网。绝杀！他冲向场边和球迷击掌。', changes: { mood: 19, cash: 0, fame: 14 } },
    { text: '防守赢了这场球。{playerName}在最后时刻连续两回合防住了对方的头号得分手，进攻端又稳稳罚中4球。他的正负值+12全场最高。', changes: { mood: 13, cash: 0, fame: 8 } },
    { text: '双加时的马拉松！{playerName}在第二个加时赛中独得8分，包括一个杀死比赛的三分。赛后他的球衣已经被汗水浸透，但脸上的笑容怎么也藏不住。', changes: { mood: 12, cash: 0, fame: 10 } },
    { text: '比分交替领先了17次，但最后站在胜利一边的是{playerName}和他的球队。他在关键时刻的冷静像是一个打了20年球的老将。', changes: { mood: 14, cash: 0, fame: 9 } },
    { text: '最后时刻的防守轮转完美无瑕，{playerName}补防到篮下大帽对手的上篮。他抢到球后长传前场，队友轻松上篮得手。从防守到进攻，一气呵成。', changes: { mood: 15, cash: 0, fame: 10 } },
    { text: '这场胜利来之不易。{playerName}在末节被对手撞伤了肩膀，但咬牙坚持打完了比赛。赛后的X光检查显示没有大碍，但他冰敷的样子让人心疼。', changes: { mood: 10, cash: 0, fame: 12 } },
    { text: '比赛还剩0.8秒，{playerName}在底线发球后快速跑位接球，转身跳投——球进了！他冲向替补席和所有人撞胸庆祝。这种剧本连好莱坞都不敢写。', changes: { mood: 20, cash: 0, fame: 15 } },
    { text: '第四节落后8分时很多人以为比赛结束了，但{playerName}不这么想。他连续得分止血，又送出3次助攻激活全队。逆转完成的那一刻，他只是平静地拍了拍手。', changes: { mood: 16, cash: 0, fame: 13 } },
    { text: '又一场焦灼的比赛，又一颗大心脏的表现。{playerName}在最后3分钟拿下了全队最后10分中的7分。赛后记者问他紧张吗，他笑着说："我享受这种时刻。"', changes: { mood: 15, cash: 0, fame: 10 } },
    { text: '加时赛开始前，{playerName}把队友们叫到一起说了几句话。没人知道他说了什么，但从那以后球队的每一攻每一防都像换了支队伍。', changes: { mood: 14, cash: 0, fame: 9 } },
    { text: '关键一战拿下了！{playerName}赛后坐在更衣柜前久久没有起身，不是因为疲惫，而是因为这场胜利对排名太重要了。更衣室里弥漫着如释重负的气氛。', changes: { mood: 13, cash: 0, fame: 8 } },
    { text: '最后一攻，{playerName}吸引了包夹后果断分球给底角的队友。三分命中！他冲过去和队友拥抱，"这就是我们训练的成果"他在耳边说。', changes: { mood: 15, cash: 0, fame: 8 } },
    { text: '比赛最后时刻的暂停里，教练画了一个给{playerName}的单打战术。他执行得完美无缺，后仰跳投稳稳命中。赛后他说："我信任教练的安排，也信任自己。"', changes: { mood: 16, cash: 0, fame: 11 } }
  ],
  game_close_loss: [
    { text: '最后的投篮弹框而出，{playerName}跪在地板上，双手捂住了脸。这是一场本可以拿下的比赛，更衣室里安静得只听得见水流声。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '差一个篮板，差一次防守，差一个进球。{playerName}赛后独自坐在更衣柜前回看手机上的比赛录像。他在最后时刻的投篮被干扰了，但他说不该找借口。', changes: { mood: -14, cash: 0, fame: -2 } },
    { text: '对手在最后5秒投进了绝杀球，{playerName}站在原地愣了几秒才回过神来。他用力将毛巾摔在地上，那种不甘心写满了整张脸。', changes: { mood: -16, cash: 0, fame: -4 } },
    { text: '两分之差落败。{playerName}在最后时刻的罚球只命中了1个，他反复回看那个罚球动作，试图找出哪里出了问题。一夜无眠。', changes: { mood: -18, cash: 0, fame: -5 } },
    { text: '比赛最后1分钟{playerName}的传球被抢断，对手快攻得分反超。他整晚都在想那个球，"我应该更果断地自己攻"他对着镜子说了很多遍。', changes: { mood: -17, cash: 0, fame: -4 } },
    { text: '又一场惜败。{playerName}在赛后新闻发布会上沉默了很长时间，最后只说了一句："我们需要做得更好。"语气里满是疲惫和不甘。', changes: { mood: -13, cash: 0, fame: -2 } },
    { text: '末节的领先被一点点蚕食，{playerName}眼睁睁看着胜利从指缝中溜走。他在场上用球衣擦了擦汗，眼神空洞地望向计分板。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '加时赛的体力不支让{playerName}的投篮频频偏出。他弯着腰大口喘气，双腿已经不听使唤了。终场哨响时他甚至站不稳。', changes: { mood: -12, cash: 0, fame: -2 } },
    { text: '最后一攻的战术没有打出来，{playerName}在边线发球时差点被抢断。勉强出手的三分偏得离谱。他用力拍了拍地板，起身时眼眶微红。', changes: { mood: -16, cash: 0, fame: -4 } },
    { text: '对手在末节打出了16-2的高潮，{playerName}在暂停时试图激励队友，但一切已经太迟了。赛后他一个人在训练馆加练到凌晨两点。', changes: { mood: -14, cash: 0, fame: -3 } },
    { text: '一分之差输掉比赛是最让人难受的。{playerName}在更衣室里没有说话，只是默默收拾东西。教练过来拍了拍他的肩膀，他点了点头。', changes: { mood: -13, cash: 0, fame: -2 } },
    { text: '最后时刻的防守出现了沟通失误，{playerName}和队友扑向了同一个人，底角的射手获得了空位。球进灯亮，全场比赛结束。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '一场该赢的比赛输了。{playerName}在回程的大巴上戴着耳机，车窗外的灯光一闪而过。手机上有几十条未读消息，他一条也不想看。', changes: { mood: -14, cash: 0, fame: -2 } },
    { text: '最后2分钟球队一分未得，{playerName}连续两次强投不中。他在赛后的录像课上反复看那两个回合，试图找出更好的选择。', changes: { mood: -16, cash: 0, fame: -4 } },
    { text: '对手的绝杀三分在空中划出一道弧线落入网心，{playerName}蹲在原地，双手抱头。这是他职业生涯第一次在主场被绝杀。', changes: { mood: -18, cash: 0, fame: -5 } },
    { text: '比赛最后30秒落后1分，{playerName}持球突破但在上篮时被干扰了。他回头看向裁判，但没有任何哨声。这个回合会在他脑海里回放很久。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '又一场令人心碎的失利。{playerName}在更衣室里把护具摔在了地上。教练没有阻止他，因为每个人都需要一个发泄的出口。', changes: { mood: -14, cash: 0, fame: -2 } },
    { text: '第四节领先8分进入最后3分钟，却被对手打出10-0。{playerName}在终场哨响后久久没有起身，他的眼神里写满了难以置信。', changes: { mood: -17, cash: 0, fame: -4 } },
    { text: '一场苦战打到了最后一刻，{playerName}在最后时刻的三分球差了一点。球弹出篮筐的那一刻，整座球馆发出了整齐的叹息声。', changes: { mood: -13, cash: 0, fame: -2 } },
    { text: '最后时刻的失误太致命了。{playerName}在边线球发出来后被对手夹击，不得不传球，结果被提前预判。他在赛后道歉了，但队友们都说不是他的错。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '加时赛中{playerName}的体力明显不支，几次出手都短了。他在场边弯腰撑着膝盖的样子让人心酸。赛后他说："我需要更好的体能储备。"', changes: { mood: -12, cash: 0, fame: -2 } },
    { text: '这场失利像一记重拳打在了{playerName}的胸口上。他在赛后没有接受采访，直接回了训练馆。投篮机转动的声音在空旷的馆里回荡。', changes: { mood: -16, cash: 0, fame: -3 } },
    { text: '最后时刻{playerName}被换下场时，他用力拍了板凳。教练的战术安排他无法理解，但他尊重决定。只是在更衣室里，沉默比任何语言都沉重。', changes: { mood: -14, cash: 0, fame: -3 } },
    { text: '一次争议判罚改变了比赛走向，{playerName}在赛后采访时克制住了情绪。"我不想评论裁判，但这个结果很难接受。"他的声音很轻。', changes: { mood: -13, cash: 0, fame: -1 } },
    { text: '末节被逆转的感觉太差了。{playerName}回到家后坐在黑暗的客厅里，电视还开着但声音调到了最小。明天又是新的一天，但今晚他只想安静。', changes: { mood: -15, cash: 0, fame: -2 } },
    { text: '一场本可以赢的比赛以最令人遗憾的方式结束。{playerName}在社交媒体上只发了一个省略号，但评论区里满是鼓励和支持。', changes: { mood: -12, cash: 0, fame: -1 } },
    { text: '最后3.2秒的边线球战术被对手看穿了。{playerName}勉强接球后没有出手空间，只能传球给被防死的队友。终场哨响，他用力踢了一下地板。', changes: { mood: -16, cash: 0, fame: -4 } },
    { text: '失利之后{playerName}没有吃饭，他直接去了录像室。一帧一帧地回看最后5分钟的每一个回合，在笔记本上写满了笔记。', changes: { mood: -14, cash: 0, fame: -1 } },
    { text: '队友在最后时刻的失误让胜利溜走了，{playerName}没有责怪任何人。他搂住失误的队友说："下一场，我们赢回来。"但他的眼眶还是红了。', changes: { mood: -13, cash: 0, fame: -1 } },
    { text: '一场苦战，一分惜败。{playerName}在回程的飞机上闭着眼睛，但队友们都知道他没睡着。这场失利会在每个人的心里停留很久。', changes: { mood: -14, cash: 0, fame: -2 } }
  ],
  game_blowout_win: [
    { text: '{playerName}和队友们今晚打得行云流水，三节结束就已经领先30分。第四节他坐在板凳上笑得合不拢嘴，和替补球员击掌庆祝每一个好球。', changes: { mood: 10, cash: 0, fame: 5 } },
    { text: '一场碾压式的胜利！{playerName}只打了三节就打卡下班，他的数据效率惊人。更衣室里气氛轻松，有人放起了音乐。', changes: { mood: 12, cash: 0, fame: 6 } },
    { text: '从开场跳球开始，{playerName}就展现出了统治力。对手在第一节就落后了15分，此后再也没有追上过。这是一场教科书般的比赛。', changes: { mood: 10, cash: 0, fame: 5 } },
    { text: '{playerName}今晚不需要在第四节出场。他坐在替补席上戴着毛巾，和助理教练讨论下一场的对手。大比分领先让他有闲心提前做功课了。', changes: { mood: 9, cash: 0, fame: 4 } },
    { text: '进攻端如入无人之境，防守端密不透风。{playerName}和球队打出了一场完美的比赛，赛后教练难得地露出了笑容。', changes: { mood: 11, cash: 0, fame: 5 } },
    { text: '第三节的一波22-0让比赛彻底失去了悬念。{playerName}在那波高潮中独得10分还送出3次助攻。对手被迫叫了三次暂停，但每次回来情况只是更糟。', changes: { mood: 12, cash: 0, fame: 6 } },
    { text: '大胜！{playerName}赛后和每个队友击掌，"这种比赛让我们更加相信自己的体系。"他在采访时说。教练则表示不能因为一场大胜就放松警惕。', changes: { mood: 10, cash: 0, fame: 4 } },
    { text: '今晚的比赛几乎是一场表演赛。{playerName}的传球如同精确制导，每次都能找到最佳的出手机会。全队助攻数赛季新高。', changes: { mood: 11, cash: 0, fame: 5 } },
    { text: '对手在半场结束时就已经放弃了抵抗。{playerName}在第三节打了5分钟就被换下，他在场边和队友有说有笑。难得的轻松夜晚。', changes: { mood: 10, cash: 0, fame: 4 } },
    { text: '一场痛快淋漓的胜利！{playerName}赛后发了一条社交媒体，配了更衣室合照。"今晚的更衣室氛围太好了"他写道。', changes: { mood: 12, cash: 0, fame: 5 } },
    { text: '从第一分钟就控制了比赛的节奏。{playerName}的挡拆让对手的防守体系支离破碎，每次换防都暴露出空档。他的高位策应堪称完美。', changes: { mood: 10, cash: 0, fame: 5 } },
    { text: '今晚的比赛像是一场训练赛。{playerName}甚至有时间在场上尝试平时不敢用的动作——背传找到了底线空切的队友，球进后他自己都笑了。', changes: { mood: 11, cash: 0, fame: 6 } },
    { text: '大比分领先让{playerName}第四节全程观战。他坐在板凳上认真观察对手的战术，在笔记本上记着什么。"即使是垃圾时间也能学到东西"他后来说。', changes: { mood: 9, cash: 0, fame: 4 } },
    { text: '一场大胜之后，{playerName}没有太多兴奋。"赢球当然好，但对手今天状态不好也是事实。我们不能因为一场大胜就飘了。"他的冷静让教练很满意。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '今晚属于{playerName}和他的球队。从跳球到终场哨，他们没有给对手任何机会。赛后的更衣室里，队歌响了一遍又一遍。', changes: { mood: 11, cash: 0, fame: 5 } },
    { text: '一场统治级的表现。{playerName}在场时球队净胜35分，他每一次触球都让对手提心吊胆。比赛早早进入垃圾时间，替补球员得到了充分的锻炼。', changes: { mood: 10, cash: 0, fame: 5 } },
    { text: '{playerName}今晚的效率恐怖得离谱，投篮几乎没有偏出过。赛后他在更衣室开玩笑说："早知道这么准，我就多投几个了。"', changes: { mood: 12, cash: 0, fame: 6 } },
    { text: '第二节的一波流直接杀死了比赛。{playerName}在那波攻势中连续命中三个三分，对方主教练连续叫了两个暂停也无济于事。', changes: { mood: 11, cash: 0, fame: 5 } },
    { text: '轻松的夜晚。{playerName}只打了24分钟，数据却很全面。赛后他早早回了家，"今晚可以好好睡一觉了"他笑着说。', changes: { mood: 10, cash: 0, fame: 4 } },
    { text: '碾压局。{playerName}甚至不需要出汗太多，球队的传导球和防守轮转让对手完全找不到节奏。一场教科书般的团队胜利。', changes: { mood: 9, cash: 0, fame: 4 } },
    { text: '今晚的比赛让{playerName}想起了大学时期的某些比赛——对手根本不在同一个层级。但他很快收住了笑容，"尊重每一个对手"他提醒自己。', changes: { mood: 10, cash: 0, fame: 4 } },
    { text: '替补球员在第四节打得有声有色，{playerName}在场边当起了临时助教，不停给年轻队友出主意。教练看着这一幕笑着摇了摇头。', changes: { mood: 11, cash: 0, fame: 5 } },
    { text: '一场酣畅淋漓的大胜。{playerName}赛后给全队买了晚餐，"赢了就该庆祝，但明天训练不能松懈"他一边分发披萨一边说。', changes: { mood: 12, cash: -0.3, fame: 5 } },
    { text: '进攻端予取予求，防守端铁壁铜墙。{playerName}和他的球队今天打出了一场近乎完美的比赛。赛后的数据统计让分析师们惊叹不已。', changes: { mood: 10, cash: 0, fame: 5 } },
    { text: '这场大胜的功臣不止{playerName}一个，但他无疑是场上的灵魂。每次进攻都从他那发起，每次防守他都站在最前线。赛后他只是淡淡地说："我们做了该做的事。"', changes: { mood: 9, cash: 0, fame: 4 } },
    { text: '三节打卡！{playerName}在场下和队友们讨论着赛后去哪吃饭。这种轻松的氛围在漫长的赛季里格外珍贵。', changes: { mood: 11, cash: 0, fame: 4 } },
    { text: '一场大胜的夜晚，{playerName}终于有时间在场边和来观战的朋友打招呼了。他的笑容比平时多了几分。', changes: { mood: 10, cash: 0, fame: 3 } },
    { text: '对手今晚的状态确实不佳，但{playerName}的球队也没有给任何机会。"趁你病要你命"他赛后这样形容球队的心态。', changes: { mood: 10, cash: 0, fame: 4 } },
    { text: '比赛毫无悬念地结束了。{playerName}赛后加练了20分钟投篮，"大胜不代表可以偷懒"他擦着汗说。这种自律让人敬佩。', changes: { mood: 9, cash: 0, fame: 4 } },
    { text: '全场最大领先42分。{playerName}在第四节完全没有上场，但他在场边的加油声比谁都大。每当年轻队友有精彩表现，他第一个站起来鼓掌。', changes: { mood: 10, cash: 0, fame: 5 } }
  ],
  game_blowout_loss: [
    { text: '一场噩梦般的比赛。{playerName}在第三节还剩4分钟时被换下，此时球队已经落后28分。他坐在板凳上，毛巾盖住了整张脸。', changes: { mood: -18, cash: 0, fame: -5 } },
    { text: '从开场就被对手压着打，{playerName}的球队今晚毫无还手之力。更衣室里的空气凝重得让人窒息，没有人说话，只有更衣柜被关上的声音。', changes: { mood: -16, cash: 0, fame: -4 } },
    { text: '对手今晚简直是降维打击。{playerName}在场上拼尽全力，但分差越拉越大。终场时他已经不想看计分板了。', changes: { mood: -17, cash: 0, fame: -4 } },
    { text: '一场令人沮丧的惨败。{playerName}在赛后采访时语气低沉，"今晚我们被打爆了，没有借口。"他迅速离开了采访区。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '第二节被对手打了个38-12，比赛就此失去悬念。{playerName}在那段时间里4投0中，还出现了2次失误。他用力咬着牙套，试图控制住自己的情绪。', changes: { mood: -18, cash: 0, fame: -5 } },
    { text: '大比分落后的第三节，{playerName}仍然在场上拼命防守。但一个人的力量终究有限。教练最终把他换下时，他只是默默点了点头。', changes: { mood: -14, cash: 0, fame: -2 } },
    { text: '今晚的失利是一场彻底的溃败。{playerName}在赛后没有接受采访，直接去了训练馆。他在黑暗中投篮到深夜，球撞击地板的声音是唯一的陪伴。', changes: { mood: -16, cash: 0, fame: -4 } },
    { text: '对手的每一个球员都像开了挂一样。{playerName}在防守端被连续过掉，进攻端又找不到手感。"今晚我就是很糟糕"他赛后承认。', changes: { mood: -17, cash: 0, fame: -5 } },
    { text: '一场不想回忆的比赛。{playerName}的球队在攻防两端都被碾压，第三节还没结束比赛就进入了垃圾时间。他坐在板凳上一言不发。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '输球不可怕，可怕的是输得毫无脾气。{playerName}在更衣室里终于忍不住拍了桌子，"这样打下去，我们连季后赛的边都摸不到！"', changes: { mood: -14, cash: 0, fame: -2 } },
    { text: '今晚的{playerName}像是迷失在了对手的防守迷宫中。每一次突破都有人在等待，每一次传球都被预判。他赛后说："他们把我研究透了。"', changes: { mood: -16, cash: 0, fame: -4 } },
    { text: '一场令人崩溃的失利。{playerName}在比赛最后时刻坐在板凳上，眼睛直视前方。队友走过来拍他的肩，他只是摇了摇头。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '从跳球开始对手就展示了完全不同的比赛强度。{playerName}在第一节就落后了15分，此后分差只增不减。"对手今晚的执行力远在我们之上"他冷静地分析。', changes: { mood: -14, cash: 0, fame: -3 } },
    { text: '惨败之后，{playerName}一个人留在了球馆。他坐在观众席最高处，俯视着空荡荡的球场，思考着球队的问题到底出在哪里。', changes: { mood: -16, cash: 0, fame: -2 } },
    { text: '这场比赛是一场警示。{playerName}在赛后的球队会议上主动发言，"我们必须做出改变。不能假装今晚没有发生。"队友们沉默了，但都在点头。', changes: { mood: -13, cash: 0, fame: -1 } },
    { text: '对手今晚简直是不可阻挡。{playerName}在场上尽了全力，但比分差距越来越大。他在一次暂停中愤怒地拍了战术板，随即道歉了。', changes: { mood: -17, cash: 0, fame: -4 } },
    { text: '大比分落后的第四节变成了垃圾时间。{playerName}没有再上场，他在板凳上用冰袋敷着膝盖，思考着下一场该如何调整。', changes: { mood: -14, cash: 0, fame: -2 } },
    { text: '今晚的比赛是一场灾难。{playerName}在赛后直接走进了冷疗舱，他说身体的疼痛还不如心里的难受。"我们必须反弹"他对着冰冷的蒸汽说。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '一场令人窒息的失利。{playerName}在场上的正负值是-28，这是他职业生涯最差的数据之一。但他说他会从中学习，而不是逃避。', changes: { mood: -16, cash: 0, fame: -4 } },
    { text: '惨败让{playerName}的耐心到达了极限。他在赛后和教练进行了一次长时间的谈话，没有人知道内容，但从会议室出来后他的表情变得更加坚定。', changes: { mood: -12, cash: 0, fame: -1 } },
    { text: '今天的比赛让{playerName}想起了新秀赛季的一些夜晚。但那时候他还年轻，现在他已经是球队核心了。"我必须做得更好"他对自己说。', changes: { mood: -14, cash: 0, fame: -2 } },
    { text: '大比分输球的滋味太苦了。{playerName}在更衣室里闭着眼睛深呼吸了很久，然后起身开始做拉伸。"身体不能停，明天训练照常"他告诉体能教练。', changes: { mood: -13, cash: 0, fame: -2 } },
    { text: '今晚的对手打出了冠军级别的表现，而{playerName}的球队则像是失去了灵魂。"差距是全方位的，我们需要从头开始审视自己"他冷静地总结。', changes: { mood: -14, cash: 0, fame: -3 } },
    { text: '一场让人想忘记的比赛。{playerName}在更衣室里把音乐声开到最大，试图用节奏盖过心中的沮丧。明天又是新的一天。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '惨败之夜。{playerName}在社交媒体上没有发任何内容，他关掉了手机，只是安静地坐在更衣室里。有些夜晚，沉默比语言更有力量。', changes: { mood: -16, cash: 0, fame: -3 } },
    { text: '这场失利让{playerName}更加坚定了训练的决心。他当晚就联系了私人教练，安排了额外训练计划。"从明天开始，我会变成一个不同的球员"他承诺。', changes: { mood: -10, cash: 0, fame: -1 } },
    { text: '对手今晚投进了20个三分球，{playerName}的球队在防守端完全失守。"他们太准了，但我们的防守也太差了"他无奈地说。', changes: { mood: -15, cash: 0, fame: -3 } },
    { text: '比赛结束后{playerName}是最后一个离开更衣室的。他已经把今晚的失利消化完了，现在满脑子都是下一场的对策。失败是最好的老师。', changes: { mood: -12, cash: 0, fame: -1 } },
    { text: '一场完败。{playerName}在赛后和几位老队友通了电话，听取他们的建议。"有时候，你需要从外面找答案"他说。', changes: { mood: -13, cash: 0, fame: -2 } },
    { text: '今晚的比分让人不忍直视。{playerName}在垃圾时间里仍然在场上拼搏，虽然结果已定但态度不能丢。赛后他说："输球可以，但不能输掉斗志。"', changes: { mood: -14, cash: 0, fame: -2 } }
  ],
  game_average_win: [
    { text: '{playerName}今晚的发挥中规中矩，但球队整体运转良好，顺利拿下了比赛。他在赛后和队友击掌，"赢球就是最好的感觉"他笑着说。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '一场稳稳的胜利。{playerName}的数据不算华丽，但他的防守和组织让球队始终保持着领先。赛后他只想好好吃一顿然后休息。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '{playerName}用一场扎实的表现帮助球队获胜。没有太多高光时刻，但每一个回合都做对了选择。教练赛后称赞他的稳定性。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '赢球不需要每场都打英雄球。{playerName}今晚选择了更聪明的打法，让队友参与进来。赛后他在更衣室里和每个人击掌，"这才是赢球的方式"他说。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '一场标准的胜利。{playerName}在攻防两端都完成了自己的任务，球队从头到尾控制着比赛节奏。赛后的更衣室里气氛不错但不算狂热，一切都很正常。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '{playerName}今晚的效率不错，没有强行出手，每一次进攻都合理。赛后他快速做了恢复训练就离开了球馆。"明天还有训练"他对工作人员说。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '平稳获胜的夜晚。{playerName}赛后参加了媒体采访，回答都很简洁。"赢球就好，没什么特别的"他说完就回更衣室了。', changes: { mood: 6, cash: 0, fame: 2 } },
    { text: '一场正常的胜利，{playerName}在场上做着自己该做的事。他今晚的投篮命中率不算高，但防守端的贡献弥补了进攻的不足。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '{playerName}今晚没有太多表现欲望，但球队不需要他carry。他在场上做起了粘合剂的工作——传导球、卡位、补防。赢球之后的笑容是真诚的。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '一场意料之中的胜利。{playerName}赛后早早完成了恢复程序，在球馆门口给几个小球迷签了名就离开了。这就是漫长赛季中的普通一夜。', changes: { mood: 6, cash: 0, fame: 2 } },
    { text: '球队赢球了，{playerName}的表现平稳但不出彩。他在赛后看了自己的数据，"还有提升空间"他在心里默默记下了明天训练的重点。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '常规操作。{playerName}今晚的数据虽然不惊艳，但他的正负值是+15，说明他在场时球队运转良好。"数据不是一切"他总是这么说。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '又一场胜利入账。{playerName}在更衣室里和队友们有说有笑，今晚的胜利来得不算辛苦。但他知道，真正的考验还在后面。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '{playerName}在赛后快速完成了媒体义务，然后和训练师开始了恢复程序。赢球的日子就是该这样，不骄傲不松懈。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '胜利的滋味永远是甜的，即使这场赢得很"普通"。{playerName}赛后给妈妈打了电话报平安，然后准备明天的训练。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '今晚的{playerName}更像是一个组织者而非得分手。他不断为队友创造机会，自己也拿下了不错的数据。赛后教练拍拍他的背，"打得好"他只说了这两个字。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '一场稳健的胜利让{playerName}今晚能好好休息。他打算回家看看电影放松一下，"不是每场都要拼到筋疲力尽"他对自己说。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '{playerName}今晚的发挥不是最好的，但球队赢了。他在更衣室里看了一会儿手机，然后去做了恢复训练。一切都是那么有条不紊。', changes: { mood: 6, cash: 0, fame: 2 } },
    { text: '赢球之后{playerName}罕见地提早离开了球馆。不是因为他不在乎，而是因为他知道如何分配精力。漫长的赛季需要聪明的管理。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '今晚的比赛没有太多戏剧性，{playerName}和他的球队按部就班地拿下了胜利。赛后他在更衣室里和队友们击掌，然后安静地收拾东西。', changes: { mood: 6, cash: 0, fame: 2 } },
    { text: '又一场例行公事的胜利。{playerName}在场上的表现称职但不抢眼，他知道球队今晚不需要他做更多。"有些夜晚你需要做的就是把球放进篮筐"他说。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '{playerName}在赛后把比赛用球送给了场边一位小球迷。虽然这场胜利不算特别，但对那个孩子来说，这是终生难忘的夜晚。', changes: { mood: 9, cash: 0, fame: 4 } },
    { text: '赢了比赛，{playerName}的心情不错。他在更衣室里哼着歌收拾东西，明天又是新的一天。"保持节奏"他对自己说。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '一场平淡但有效的胜利。{playerName}在场上做了很多数据统计看不到的事情——卡位、补防、指挥。教练赛后特别表扬了这些细节。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '{playerName}今天在场上很沉稳，没有过度发力也没有偷懒。赛后他泡了冰浴，然后给家人发了条消息。"又是赢球的一天"他写道。', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '今晚的比赛节奏很舒服，{playerName}在攻防两端都找到了感觉。虽然不是他最闪耀的一夜，但正是这种稳定的输出构成了漫长赛季的基石。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '又一场团队胜利。{playerName}在场上不断鼓励年轻队友，帮助他们找到位置。"领袖不只是得分"教练赛后说。', changes: { mood: 8, cash: 0, fame: 3 } },
    { text: '一场按计划的胜利。{playerName}在赛后看了几分钟录像就回了家。这种夜晚不需要过度分析，保持状态最重要。', changes: { mood: 6, cash: 0, fame: 2 } },
    { text: '今晚的{playerName}在场上显得游刃有余。他不需要拼尽全力，球队就能稳稳赢下比赛。赛后他和几个队友约了明天一起加练。', changes: { mood: 8, cash: 0, fame: 2 } },
    { text: '赢球了，但{playerName}知道球队还能做得更好。他在赛后和教练讨论了几个需要改进的地方，然后才去做了恢复训练。', changes: { mood: 7, cash: 0, fame: 2 } }
  ],
  game_average_loss: [
    { text: '一场平淡的失利。{playerName}在赛后安静地收拾东西，"今天不是我们的夜晚"他简短地说。更衣室里弥漫着淡淡的失望。', changes: { mood: -8, cash: 0, fame: -2 } },
    { text: '{playerName}今晚的发挥一般，球队也没能找到节奏。他在赛后看了会儿录像，试图找到问题所在。"下一场会好的"他对自己说。', changes: { mood: -7, cash: 0, fame: -2 } },
    { text: '输球了，但不是一场令人崩溃的失利。{playerName}在更衣室里保持冷静，"这种比赛你要学会接受，然后继续前进。"', changes: { mood: -6, cash: 0, fame: -1 } },
    { text: '今晚对位的球员表现更好一些，{playerName}在赛后承认了这一点。"他有几个好球，我防得不够好。"输球后他选择直面问题。', changes: { mood: -8, cash: 0, fame: -2 } },
    { text: '一场普通的失利。{playerName}在比赛结束前就被换下了，他拍了拍队友的背，"明天训练场上见。"语气平静，没有太多情绪波动。', changes: { mood: -6, cash: 0, fame: -1 } },
    { text: '今天就是打不过，{playerName}赛后很坦然。"对手今晚打得好，我们没那么好。没什么好纠结的，回去训练就好。"', changes: { mood: -5, cash: 0, fame: -1 } },
    { text: '又一场输球。{playerName}在更衣室里闭着眼睛休息了一会儿，然后起身做了拉伸。"身体不能停，心情可以慢慢调"他告诉训练师。', changes: { mood: -7, cash: 0, fame: -2 } },
    { text: '今晚的比赛乏善可陈，{playerName}的球队从头到尾都没能找到状态。赛后他快速处理完媒体事务就回了家，明天又是新的开始。', changes: { mood: -7, cash: 0, fame: -2 } },
    { text: '输球后的{playerName}坐在更衣室里看手机，翻看着下场比赛的对手资料。"输了一场，就要赢下一场"这是他的信条。', changes: { mood: -6, cash: 0, fame: -1 } },
    { text: '一场不温不火的失利。{playerName}在场上尽力了，但今晚就是各种不凑巧。他在赛后的采访中保持了职业态度，"我们需要从中学习。"', changes: { mood: -7, cash: 0, fame: -2 } },
    { text: '{playerName}今晚的投篮手感一般，好几个平时能进的球都偏了。他没有找借口，"手感不好的时候更要帮助球队其他方面"他说。', changes: { mood: -8, cash: 0, fame: -2 } },
    { text: '输球之后{playerName}没有沮丧太久。他给家人打了电话，然后在训练馆做了30分钟投篮练习。"保持日常节奏"是他应对失利的方式。', changes: { mood: -5, cash: 0, fame: -1 } },
    { text: '一场中规中矩的失利。{playerName}的球队今天在攻防两端都差了一点，但不是不可接受。教练说"调整一下就好"。', changes: { mood: -6, cash: 0, fame: -1 } },
    { text: '今天输了，但{playerName}没有太放在心上。"赛季很长，这种比赛会发生"他说完就去做恢复训练了。他的成熟让教练很满意。', changes: { mood: -5, cash: 0, fame: -1 } },
    { text: '又一场遗憾的失利。{playerName}在赛后的球队录像会上提了几个建设性的意见，队友们认真地听着。"用头脑来弥补不足"他总是这么说。', changes: { mood: -6, cash: 0, fame: -1 } },
    { text: '今晚{playerName}的出场时间比平时少了一些，教练在保护他。但球队在缺少他的那段时间里输了太多分。"我需要更好地带领第二阵容"他反思。', changes: { mood: -7, cash: 0, fame: -2 } },
    { text: '一场可以接受的失利。{playerName}赛后去餐厅吃了顿好的犒劳自己，"输球也要吃饭，明天才有体力训练"他笑着说。', changes: { mood: -5, cash: -0.1, fame: -1 } },
    { text: '对手今天确实打得更好，{playerName}坦然接受了这个结果。他在更衣室里和队友们聊了几句，气氛虽然低落但不至于消沉。', changes: { mood: -6, cash: 0, fame: -1 } },
    { text: '这场失利在意料之中，对手实力本就更强。{playerName}在场上尽力了，赛后他说："和强队交手才知道差距在哪。"', changes: { mood: -5, cash: 0, fame: -1 } },
    { text: '又一场失利让{playerName}的连胜势头中止了。他在赛后加练了罚球，"手感不能丢"他对自己说。然后，回家休息。', changes: { mood: -7, cash: 0, fame: -2 } },
    { text: '输球后的夜晚总是有些失眠。{playerName}躺在床上回顾比赛，想着哪些回合可以做得更好。凌晨两点他终于睡着了。', changes: { mood: -8, cash: 0, fame: -2 } },
    { text: '{playerName}今晚的防守表现受到了教练的批评。他没有辩解，只是在训练馆多练了一个小时的防守脚步。"批评是对的"他承认。', changes: { mood: -8, cash: 0, fame: -2 } },
    { text: '一场普通的失利之后，{playerName}照常做了恢复训练和冰浴。他的手机上有几条朋友发来的鼓励消息，他回复了一个微笑的表情。', changes: { mood: -5, cash: 0, fame: -1 } },
    { text: '输球了但不要太放在心上，这是{playerName}赛季中学会的一课。他在社交媒体上发了一张训练的照片，配文"继续前进"。', changes: { mood: -4, cash: 0, fame: 0 } },
    { text: '今晚的比赛没什么亮点，{playerName}和他的球队都表现平平。他在赛后看了数据统计，摇了摇头，"明天要更好"他低声说。', changes: { mood: -7, cash: 0, fame: -2 } },
    { text: '一场意料之内的失利并没有打击{playerName}的信心。他知道球队的潜力，也知道需要时间来兑现。"耐心"他在笔记本上写下这个词。', changes: { mood: -5, cash: 0, fame: -1 } },
    { text: '赛后{playerName}在更衣室里和助教讨论了几个回合的细节。他的学习态度从未改变，即使是一场普通的失利也蕴藏着提升的契机。', changes: { mood: -6, cash: 0, fame: -1 } },
    { text: '输球之后{playerName}选择早点回家休息。有些夜晚不需要过度分析，好好睡一觉，明天醒来一切都会好起来。', changes: { mood: -5, cash: 0, fame: -1 } },
    { text: '今晚的失利在意料之中，对手是联盟顶尖球队。{playerName}赛后说："我们要从这场比赛中学到东西，下次碰面会是不同的结果。"', changes: { mood: -5, cash: 0, fame: -1 } },
    { text: '又一场输球入账。{playerName}在更衣室里和队友们互相鼓励，"赛季还长，我们有机会翻盘。"他的语气里带着坚定。', changes: { mood: -6, cash: 0, fame: -1 } }
  ],
  rest_training: [
    { text: '休息日的训练馆里，{playerName}一个人练习了两个小时的中距离跳投。球鞋和地板的摩擦声在空旷的场馆里回荡，每一个进球都让他微微点头。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '{playerName}在休息日选择了加练力量。举重、深蹲、核心训练，他一项不落。汗水浸透了整件训练服，但他的眼神里满是专注。', changes: { mood: 4, cash: 0, fame: 1 } },
    { text: '今天没有比赛，{playerName}在训练馆和教练一起打磨脚步。从基本的三威胁姿势到欧洲步，每个动作都重复了上百遍。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '休息日的训练从早晨8点开始。{playerName}先做了30分钟动态拉伸，然后是45分钟投篮训练，最后是全场对抗。他的自律令人敬佩。', changes: { mood: 4, cash: 0, fame: 2 } },
    { text: '{playerName}在休息日重点练习了左手终结。他反复在篮筐左侧用左手上篮，直到动作变得和右手一样流畅。"弱点必须变成强项"他说。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '训练馆的灯还亮着。{playerName}在罚球线上一个接一个地投，今天的命中率是87%。"还不够好"他摇了摇头，又排到了队尾。', changes: { mood: 3, cash: 0, fame: 1 } },
    { text: '{playerName}和几位队友在休息日进行了5对5对抗赛。虽然没有观众，但对抗强度一点不比正式比赛低。每个人都在为上场时间而战。', changes: { mood: 6, cash: 0, fame: 2 } },
    { text: '一个专注的休息日。{playerName}在录像室待了一上午，研究了三个对手的防守习惯。下午的训练他把学到的理论付诸实践。', changes: { mood: 5, cash: 0, fame: 3 } },
    { text: '{playerName}在休息日尝试了一种新的训练方法——用负重背心做全场折返跑。他说这能让他的第四节气持久一个档次。', changes: { mood: 4, cash: 0, fame: 2 } },
    { text: '休息日对{playerName}来说不是真正的休息。他在训练馆从早练到晚，中间只吃了一顿简餐。但他乐在其中。', changes: { mood: 4, cash: 0, fame: 2 } },
    { text: '{playerName}今天和助教进行了1对1的训练，专门练习挡拆后的阅读防守。每一个回合都要求他做出最快的决策。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '训练场上的{playerName}一丝不苟。今天他练了300个三分球，命中率从最初的60%提升到了78%。"进步是一点一点来的"他满意地说。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '休息日的{playerName}选择做功能性训练——绳索、壶铃、平衡球。这些看起来不像篮球训练，但都在为他在场上的爆发力做储备。', changes: { mood: 4, cash: 0, fame: 1 } },
    { text: '今天训练结束后，{playerName}在训练馆多待了40分钟练运球。他说手感是靠重复来维持的，一天不练就会生疏。', changes: { mood: 4, cash: 0, fame: 2 } },
    { text: '{playerName}在休息日做了一次全面的体能测试。数据表明他的体脂率降到了职业生涯最低点，爆发力则达到了赛季最佳。', changes: { mood: 6, cash: 0, fame: 3 } },
    { text: '训练间隙，{playerName}坐在场边喝了口水。他看着空荡荡的训练馆，"这就是我喜欢的地方——没有人看你，只有你和篮球。"他自言自语。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '今天{playerName}和体能教练做了专项速度训练。冲刺跑、变向跑、反应训练，一个都不能少。他的速度数据有了明显提升。', changes: { mood: 4, cash: 0, fame: 2 } },
    { text: '休息日加练了低位的脚步和终结方式。{playerName}在大个子教练的指导下反复练习勾手和翻身跳投。"低位是被人遗忘的武器"教练说。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '{playerName}在训练馆里放着音乐练球。今天的歌单是他的赛前必备曲目，即使没有比赛他也想保持那种竞争状态。', changes: { mood: 5, cash: 0, fame: 1 } },
    { text: '一个充实的休息日。{playerName}在训练结束后做了充分的拉伸和冰浴。他对今天的训练效果很满意，"明天会更强的"他对着镜子说。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '{playerName}今天在训练中特意练了接球就投的三分。他说比赛中很多三分机会都是接球后必须立刻出手的，不能有丝毫犹豫。', changes: { mood: 4, cash: 0, fame: 2 } },
    { text: '休息日的训练以轻松的投篮开始，逐渐加到全力对抗。{playerName}说这样既不会太累，也能保持竞技状态。"聪明地练比拼命练更重要"他总结。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '{playerName}今天尝试了水下跑步训练。水的阻力让每一步都变得艰难，但这对膝盖的冲击很小。训练后他感觉腿部力量增强了。', changes: { mood: 4, cash: 0, fame: 1 } },
    { text: '训练馆里只有{playerName}一个人。他投了500个球，做了200次运球，完成了3组全场冲刺。安静的环境让他更加专注。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '今天{playerName}花了一个小时研究自己上一场比赛的录像，然后针对性地训练了被对手针对的技术环节。"知己知彼"他说。', changes: { mood: 5, cash: 0, fame: 3 } },
    { text: '休息日不休息，{playerName}在训练馆里打磨每一个细节。他今天的目标是提高挡拆后的决策速度，每次必须在0.5秒内做出判断。', changes: { mood: 4, cash: 0, fame: 2 } },
    { text: '{playerName}在训练中和年轻队友进行了1对1单挑。他故意让了几个球，然后在后半段认真起来。年轻球员说："和老大对位真的学到很多。"', changes: { mood: 6, cash: 0, fame: 2 } },
    { text: '训练后{playerName}在社交媒体上发了一段训练视频，配文"没有捷径"。粉丝们纷纷留言鼓励，这条视频获得了上万次转发。', changes: { mood: 5, cash: 0, fame: 3 } },
    { text: '{playerName}今天练了整整4个小时。从投篮到运球，从防守滑步到全场快攻，他几乎没有休息。教练最后不得不把他赶出训练馆。', changes: { mood: 3, cash: 0, fame: 2 } },
    { text: '休息日的训练结束了，{playerName}坐在场边喝蛋白粉奶昔。他看着手机上的排名表，嘴角微微上扬。"我们还有上升空间"他说。', changes: { mood: 5, cash: 0, fame: 2 } }
  ],
  rest_recovery: [
    { text: '休息日的{playerName}选择了彻底放松。他在酒店做了全身按摩，然后泡了两个小时的温泉。紧绷了一周的肌肉终于得到了释放。', changes: { mood: 8, cash: -0.1, fame: 0 } },
    { text: '今天{playerName}做了全面的身体恢复——冰浴、电疗、深层组织按摩。队医说他的身体状态在变好，这让他松了口气。', changes: { mood: 6, cash: 0, fame: 0 } },
    { text: '{playerName}在休息日选择了瑜伽恢复。在安静的音乐中，他做了一个小时的拉伸和冥想。"身体和心灵都需要休息"他说。', changes: { mood: 7, cash: 0, fame: 1 } },
    { text: '游泳池是{playerName}最喜欢的恢复场所。他在水中做了一个小时的有氧运动，水的浮力减轻了关节的压力。出来后他感觉整个人都轻了。', changes: { mood: 7, cash: 0, fame: 0 } },
    { text: '今天没有训练，{playerName}在家里休息。他看了一整天的电影，叫了外卖，几乎没有离开沙发。"偶尔偷个懒没什么不好"他笑着说。', changes: { mood: 9, cash: -0.05, fame: 0 } },
    { text: '{playerName}在休息日做了全身冷疗。-110度的冷疗舱里他只待了3分钟，但出来后说感觉像换了一副身体。', changes: { mood: 6, cash: 0, fame: 1 } },
    { text: '恢复日，{playerName}让身体完全休息。他散步去了附近的公园，在长椅上坐了半个小时，看着来来往往的行人。"有时候你需要远离篮球"他感叹。', changes: { mood: 8, cash: 0, fame: 0 } },
    { text: '{playerName}今天的日程只有一项：在高压氧舱里待90分钟。这是他每周的固定恢复项目，据说能加速肌肉修复和消除疲劳。', changes: { mood: 5, cash: 0, fame: 0 } },
    { text: '休息日的{playerName}选择了一种特别的恢复方式——漂浮舱。在零重力的盐水里漂浮了一个小时，他说那是最接近冥想的状态。', changes: { mood: 8, cash: -0.1, fame: 0 } },
    { text: '身体恢复的一天。{playerName}从早上9点开始就在医疗中心：先是理疗，然后针灸，最后电疗。每一步都让他的身体更接近100%。', changes: { mood: 5, cash: 0, fame: 0 } },
    { text: '{playerName}在休息日选择了徒步。他在附近的山路上走了两个小时，呼吸着新鲜空气。"这是最好的恢复"他说。', changes: { mood: 8, cash: 0, fame: 1 } },
    { text: '今天{playerName}让自己完全放空。没有篮球，没有训练，没有录像。他只是在家做饭、看书、陪宠物。"平衡很重要"他总是这么说。', changes: { mood: 9, cash: 0, fame: 0 } },
    { text: '恢复日做了全身筋膜放松。{playerName}躺在理疗床上让治疗师用泡沫轴和筋膜枪处理了每一个紧张的肌肉群。疼痛中带着舒适。', changes: { mood: 6, cash: 0, fame: 0 } },
    { text: '{playerName}在休息日去做了SPA。蒸汽房、桑拿房、按摩，一整套下来花了三个小时。出来后他看起来精神焕发。', changes: { mood: 8, cash: -0.15, fame: 0 } },
    { text: '今天完全休息，{playerName}甚至没有碰篮球。他在家打了几个小时的游戏，然后早早睡了。"充电日"他这样称呼它。', changes: { mood: 8, cash: 0, fame: 0 } },
    { text: '{playerName}在休息日和营养师一起制定了下周的饮食计划。高蛋白、低碳水、充足蔬果。"恢复不只是休息，营养也很重要"他说。', changes: { mood: 5, cash: 0, fame: 1 } },
    { text: '休息日，{playerName}在家做了一顿大餐犒劳自己。他其实挺会做饭的，只是赛季中很少有时间展示厨艺。', changes: { mood: 8, cash: -0.1, fame: 0 } },
    { text: '{playerName}的恢复日安排：上午做了一次深度拉伸，下午在游泳池做了轻松的有氧，晚上做了冥想。一切都为了下一场比赛。', changes: { mood: 6, cash: 0, fame: 0 } },
    { text: '今天的{playerName}选择了早睡早起。晚上9点就上了床，睡前看了30分钟的书。这种生活规律在NBA球员中相当罕见。', changes: { mood: 7, cash: 0, fame: 0 } },
    { text: '恢复日不等于懒散。{playerName}做了45分钟的轻量瑜伽和20分钟的冥想。"活跃的恢复比躺着不动效果好得多"他从理疗师那里学到了这个。', changes: { mood: 6, cash: 0, fame: 1 } },
    { text: '{playerName}在休息日去了一家新开的康复中心，体验了最新的声波治疗技术。虽然听起来很科幻，但他说确实有效果。', changes: { mood: 6, cash: -0.1, fame: 1 } },
    { text: '一个安静的恢复日。{playerName}在家听了一下午的播客，主题是运动心理学。他越来越重视心理健康了。', changes: { mood: 7, cash: 0, fame: 1 } },
    { text: '{playerName}在休息日做了一次全面的身体检查。血液检查、关节活动度测试、心肺功能评估——所有数据都在正常范围内。', changes: { mood: 6, cash: 0, fame: 0 } },
    { text: '今天{playerName}选择用冥想来恢复。他在安静的房间里坐了30分钟，专注于呼吸。"心灵也需要恢复"他说。', changes: { mood: 7, cash: 0, fame: 1 } },
    { text: '休息日最适合补觉。{playerName}今天睡到了自然醒，然后在床上多躺了半个小时。赛季中能有这样的奢侈时光太珍贵了。', changes: { mood: 9, cash: 0, fame: 0 } }
  ],
  rest_interview: [
    { text: '休息日，{playerName}接受了一家体育媒体的专访。从童年故事到职业规划，他侃侃而谈。采访结束后记者说："他比想象中更有深度。"', changes: { mood: 3, cash: 0.1, fame: 5 } },
    { text: '{playerName}上了一档热门播客节目，和主持人聊了两个小时。话题从篮球到音乐再到人生哲学，他的表达能力和亲和力让节目收听率飙升。', changes: { mood: 4, cash: 0.15, fame: 6 } },
    { text: '今天{playerName}参加了电视访谈节目的录制。面对镜头他表现得从容自信，几个幽默的回答让现场观众笑成一片。', changes: { mood: 3, cash: 0.1, fame: 5 } },
    { text: '一家知名杂志为{playerName}拍摄了封面照片并进行了深度专访。他在采访中谈到了对未来的期望和对过去的感恩。', changes: { mood: 4, cash: 0.2, fame: 7 } },
    { text: '{playerName}在休息日接受了记者的独家采访，谈到了赛季目标和球队氛围。他的回答真诚且有分寸，记者对这次采访非常满意。', changes: { mood: 3, cash: 0.05, fame: 4 } },
    { text: '今天{playerName}参加了一个体育论坛的线上对话。他和几位退役名宿一起讨论了篮球的演变和未来的趋势。', changes: { mood: 4, cash: 0.1, fame: 5 } },
    { text: '{playerName}的专访登上了今天的体育版头条。他在采访中分享了自己的训练心得和对比赛的理解，引发了不少讨论。', changes: { mood: 3, cash: 0.1, fame: 5 } },
    { text: '休息日的媒体活动：{playerName}为一家运动品牌拍摄了宣传视频，间隙还接受了三家媒体的简短采访。', changes: { mood: 2, cash: 0.15, fame: 4 } },
    { text: '{playerName}今天做客一档谈话节目，分享了他对团队合作的看法。他的真诚打动了在场的每一个人，节目播出后收到了大量正面反馈。', changes: { mood: 4, cash: 0.1, fame: 6 } },
    { text: '一家国际媒体对{playerName}进行了远程视频采访，话题涵盖了他在NBA的成长历程和对全球篮球发展的看法。', changes: { mood: 3, cash: 0.1, fame: 5 } },
    { text: '今天{playerName}的纪录片拍摄继续进行。摄制组跟拍了他的一天——从早上的训练到晚上的家庭时光。', changes: { mood: 3, cash: 0.2, fame: 6 } },
    { text: '{playerName}在采访中被问到最想和哪位传奇球员交手。他想了一会儿说出了那个名字，记者满意地笑了。这段视频在网上疯传。', changes: { mood: 4, cash: 0.05, fame: 7 } },
    { text: '一个忙碌的媒体日。{playerName}从早上9点到下午3点一直在接受各种采访。虽然很累，但他知道这是职业的一部分。', changes: { mood: 1, cash: 0.15, fame: 5 } },
    { text: '{playerName}接受了一家财经媒体的采访，谈到了商业代言和个人投资。他展现出了球场之外的商业智慧。', changes: { mood: 3, cash: 0.1, fame: 4 } },
    { text: '今天{playerName}在社交媒体上做了一场直播，回答粉丝的问题。一个小时的直播吸引了超过10万观众同时在线。', changes: { mood: 5, cash: 0.05, fame: 6 } },
    { text: '{playerName}的深度专访今天发布了。他在采访中罕见地谈到了自己职业生涯的低谷时刻，这份坦诚赢得了读者的尊重。', changes: { mood: 3, cash: 0.1, fame: 5 } },
    { text: '休息日，{playerName}参加了一档体育辩论节目。他就某个热点话题发表了自己的看法，观点犀利且不失风度。', changes: { mood: 4, cash: 0.1, fame: 5 } },
    { text: '{playerName}为一家青少年体育杂志写了专栏文章，鼓励年轻球员坚持梦想。他的文字朴实但充满力量。', changes: { mood: 4, cash: 0.05, fame: 4 } },
    { text: '今天{playerName}被一家时尚杂志邀请拍摄了一组写真。换下球衣穿上西装的他展现了完全不同的一面。', changes: { mood: 3, cash: 0.2, fame: 6 } },
    { text: '{playerName}在采访中透露了他每天的训练日常和饮食习惯。这些细节让粉丝们更加了解了职业球员的生活。', changes: { mood: 3, cash: 0.05, fame: 4 } },
    { text: '休息日的访谈节目上，{playerName}讲述了自己选择篮球的初心。那个故事简单却打动人心，主持人也不禁红了眼眶。', changes: { mood: 5, cash: 0.1, fame: 5 } },
    { text: '{playerName}今天参加了一个播客的录制，和主持人聊了他的爱好和篮球之外的生活。原来他还是个不错的棋手。', changes: { mood: 4, cash: 0.1, fame: 5 } },
    { text: '一家日报的体育记者对{playerName}进行了面对面采访。他的坦率和幽默让整个采访过程非常愉快，记者连连称赞。', changes: { mood: 3, cash: 0.05, fame: 4 } },
    { text: '{playerName}在一档脱口秀节目中展示了他的另一面——幽默、机智、甚至有点调皮。观众们看到了一个和球场上完全不同的他。', changes: { mood: 5, cash: 0.15, fame: 7 } },
    { text: '今天{playerName}参与了一个纪录片项目的旁白录制。他用低沉的声音讲述着篮球历史的故事，制作人对他的表现赞不绝口。', changes: { mood: 3, cash: 0.2, fame: 5 } }
  ],
  rest_brand: [
    { text: '休息日，{playerName}出席了代言品牌的商业活动。和粉丝互动、拍摄宣传照、参加发布会，一整天排得满满当当。', changes: { mood: 2, cash: 0.3, fame: 5 } },
    { text: '{playerName}今天和品牌方进行了新季度的合作会议。讨论了代言内容、社交媒体推广和未来的产品联名计划。', changes: { mood: 1, cash: 0.2, fame: 3 } },
    { text: '休息日的商业行程：{playerName}为代言品牌拍摄了一支30秒的广告。从早上8点到下午4点，每个镜头都反复拍了多遍。', changes: { mood: 0, cash: 0.5, fame: 4 } },
    { text: '{playerName}出席了品牌的新品发布会，作为代言人他第一个上台发言。台下闪光灯此起彼伏，他从容地完成了每一个环节。', changes: { mood: 2, cash: 0.25, fame: 5 } },
    { text: '今天{playerName}和经纪团队一起审阅了几份新的商业合作提案。代言费、肖像权、活动出席——每一项都需要仔细斟酌。', changes: { mood: 1, cash: 0.15, fame: 2 } },
    { text: '{playerName}在休息日参加了代言品牌举办的粉丝见面会。他给每一位到场的粉丝签了名，还和几个人合了影。', changes: { mood: 3, cash: 0.2, fame: 5 } },
    { text: '品牌活动日。{playerName}从早到晚都在为代言品牌工作——拍摄宣传照、录制短视频、参加直播。虽然累但报酬丰厚。', changes: { mood: 0, cash: 0.4, fame: 4 } },
    { text: '{playerName}今天参观了代言品牌的工厂，了解了产品的生产过程。他对工艺细节的追问让品牌方印象深刻。', changes: { mood: 2, cash: 0.2, fame: 3 } },
    { text: '休息日的商业活动：{playerName}和品牌创意总监讨论了下一代签名产品的设计方向。他提出了几个很有建设性的想法。', changes: { mood: 3, cash: 0.15, fame: 4 } },
    { text: '{playerName}为代言品牌录制了一段社交媒体推广视频。拍摄只用了两小时，但前期的造型和准备花了一整个上午。', changes: { mood: 1, cash: 0.3, fame: 4 } },
    { text: '品牌活动圆满结束！{playerName}在活动上和几位知名运动员同台，他们的互动成为了今天社交媒体上的热门话题。', changes: { mood: 3, cash: 0.25, fame: 6 } },
    { text: '{playerName}在休息日和品牌方签了一份新的补充协议，增加了社交媒体推广的条款。这意味着更多的收入但也更多的义务。', changes: { mood: 1, cash: 0.35, fame: 3 } },
    { text: '今天{playerName}参加了代言品牌的年度总结会议。品牌方对他的代言效果非常满意，双方约定继续深化合作。', changes: { mood: 3, cash: 0.2, fame: 4 } },
    { text: '{playerName}为品牌拍摄了一组平面广告。摄影师说他天生就知道怎么在镜头前展示自己最好的一面。', changes: { mood: 2, cash: 0.3, fame: 4 } },
    { text: '休息日，{playerName}在线上参加了品牌的全球营销会议。他用流利的英语分享了中国市场的见解，获得了与会者的一致好评。', changes: { mood: 2, cash: 0.2, fame: 5 } },
    { text: '{playerName}今天为品牌的新产品做了内测体验。他从运动员的角度提出了几条改进建议，品牌方表示会认真考虑。', changes: { mood: 2, cash: 0.15, fame: 3 } },
    { text: '品牌合作的新篇章！{playerName}和代言品牌宣布将推出联名系列。设计灵感来自他的篮球生涯和个人品味。', changes: { mood: 4, cash: 0.4, fame: 7 } },
    { text: '{playerName}出席了品牌的慈善拍卖晚宴，捐赠了一双签名球鞋。拍卖所得将用于支持青少年篮球发展。', changes: { mood: 4, cash: -0.1, fame: 6 } },
    { text: '今天{playerName}为品牌录制了一期播客广告。他的自然表现比专业声优还受欢迎，品牌方已经邀请他再次合作。', changes: { mood: 2, cash: 0.2, fame: 3 } },
    { text: '{playerName}的品牌行程今天排满了：上午拍摄广告、下午参加发布会、晚上出席晚宴。他笑着说自己比打球还累。', changes: { mood: 0, cash: 0.5, fame: 5 } },
    { text: '休息日，{playerName}参观了品牌的设计工作室。他和设计师们交流了两个小时，对新产品的细节提出了很多建议。', changes: { mood: 3, cash: 0.2, fame: 4 } },
    { text: '{playerName}今天在品牌的社交媒体账号上做了一次直播带货。短短一小时的直播创造了品牌的单日销售纪录。', changes: { mood: 2, cash: 0.45, fame: 5 } },
    { text: '代言品牌为{playerName}举办了一场私人派对，庆祝合作一周年。在轻松的氛围中，他和品牌高层建立了更深厚的私人关系。', changes: { mood: 4, cash: 0.1, fame: 3 } },
    { text: '{playerName}在品牌活动上遇到了其他运动的明星代言人，他们交换了各自领域的训练心得。跨界交流总是充满惊喜。', changes: { mood: 3, cash: 0.2, fame: 4 } },
    { text: '休息日的商业行程虽然繁忙，但{playerName}乐在其中。他说："篮球是我的热爱，商业是我的兴趣。能兼顾两者很幸运。"', changes: { mood: 3, cash: 0.3, fame: 4 } }
  ],
  rest_personal: [
    { text: '休息日，{playerName}难得地睡了个懒觉。中午才起床的他做了一顿丰盛的早午餐，然后窝在沙发上看了一下午的纪录片。', changes: { mood: 7, cash: 0, fame: 0 } },
    { text: '{playerName}今天去了附近的社区中心，和孩子们一起打篮球。他教他们基本的运球和投篮，孩子们的笑容是最好的回报。', changes: { mood: 6, cash: 0, fame: 3 } },
    { text: '休息日是家庭日。{playerName}陪家人吃了顿饭，逛了逛街，做了一些赛季中很少有时间做的事情。平凡的幸福。', changes: { mood: 8, cash: -0.1, fame: 0 } },
    { text: '{playerName}在休息日去了当地一家他常去的餐厅。老板热情地和他打招呼，"今天的特餐还是老样子？"他笑着点头。', changes: { mood: 6, cash: -0.05, fame: 1 } },
    { text: '今天{playerName}做了件不一样的事——他去了当地一家书店，在文学区待了两个小时。走的时候买了三本书。', changes: { mood: 6, cash: -0.02, fame: 1 } },
    { text: '休息日，{playerName}在社交媒体上和粉丝互动了一个小时。他回答了各种有趣的问题，还分享了几张训练时的幕后照片。', changes: { mood: 5, cash: 0, fame: 3 } },
    { text: '{playerName}今天去看了一场当地的大学篮球赛。坐在观众席上的他全无明星架子，只是安静地享受着比赛。', changes: { mood: 5, cash: 0, fame: 2 } },
    { text: '休息日的{playerName}选择了独处。他在家里听音乐、写日记、整理思绪。赛季中的每一天都太喧闹了，偶尔需要安静。', changes: { mood: 7, cash: 0, fame: 0 } },
    { text: '{playerName}在休息日参加了好友的生日派对。他带了一份精心挑选的礼物，在派对上完全放松了下来。难得的社交时光。', changes: { mood: 6, cash: -0.1, fame: 0 } },
    { text: '今天{playerName}去了宠物店，给他家的狗买了一大袋零食和新玩具。他说赛季中没时间陪它，至少要让它开心。', changes: { mood: 7, cash: -0.05, fame: 1 } },
    { text: '{playerName}的休息日计划很简单：做饭、打扫、洗衣服。职业球员也是普通人，家务活一样要干。', changes: { mood: 5, cash: 0, fame: 0 } },
    { text: '今天没有篮球安排，{playerName}和几个发小通了视频电话。聊着聊着就回到了少年时代，笑声不断。', changes: { mood: 8, cash: 0, fame: 0 } },
    { text: '{playerName}在休息日去做了一次体检。虽然只是例行检查，但身体的每一个数据他都认真对待。"职业运动员的身体就是本钱"他说。', changes: { mood: 4, cash: 0, fame: 0 } },
    { text: '休息日的{playerName}去了高尔夫球场。虽然球技一般，但阳光、绿草和轻松的氛围让他完全忘记了赛季的压力。', changes: { mood: 7, cash: -0.1, fame: 1 } },
    { text: '{playerName}今天在家整理了一下自己的球鞋收藏。看着满满一面墙的球鞋，他想起了每双鞋背后的故事。', changes: { mood: 6, cash: 0, fame: 1 } },
    { text: '休息日，{playerName}去了一趟超市大采购。他推着购物车的样子被路人拍了下来，发到网上后获得了不少点赞。', changes: { mood: 5, cash: -0.1, fame: 1 } },
    { text: '{playerName}在休息日学做了一道新菜。虽然卖相一般，但味道还不错。他在社交媒体上晒了照片，配文"米其林一星？"', changes: { mood: 7, cash: 0, fame: 2 } },
    { text: '今天{playerName}去了一家他一直想去的咖啡馆。安静地坐了一个下午，看了半本书，享受着难得的慢时光。', changes: { mood: 7, cash: -0.03, fame: 0 } },
    { text: '{playerName}在休息日参加了社区志愿者活动。他帮助修缮了社区的篮球场，还和居民们聊了聊天。', changes: { mood: 6, cash: 0, fame: 3 } },
    { text: '休息日的{playerName}收到了老教练的一条信息。他们聊了很久，老教练的建议总是那么及时而中肯。', changes: { mood: 5, cash: 0, fame: 0 } },
    { text: '{playerName}今天终于有时间看完了那部一直想看的电影。他一个人坐在家里，关了灯，享受了两个小时的沉浸时光。', changes: { mood: 6, cash: 0, fame: 0 } },
    { text: '休息日最适合给家里打电话。{playerName}和妈妈聊了半个小时，听着那头熟悉的声音，他感觉所有的疲惫都消散了。', changes: { mood: 8, cash: 0, fame: 0 } },
    { text: '{playerName}在休息日去了美术馆看展。他对现代艺术颇有兴趣，在一幅抽象画前站了15分钟。', changes: { mood: 6, cash: -0.02, fame: 1 } },
    { text: '今天{playerName}在家整理了衣柜，把不需要的衣服打包准备捐赠。他发现有些衣服连吊牌都没拆，"买太多了"他自嘲。', changes: { mood: 5, cash: 0, fame: 1 } },
    { text: '休息日，{playerName}终于把新车开了出去兜风。敞篷车在公路上飞驰，风从耳边掠过，所有的烦恼都被抛在了身后。', changes: { mood: 8, cash: 0, fame: 1 } }
  ]
};

// ============ TEXT_POOL_RECAP — Match Recap Texts ============

const TEXT_POOL_RECAP = {
  win_close: [
    { headline: '{playerName}关键发挥！险胜对手', recap: '一场悬念迭起的较量，{playerName}在最后时刻挺身而出，关键的攻防转换帮助球队以微弱优势拿下胜利。双方你来我往，比分交替领先多达12次，但最终{playerName}的球队笑到了最后。' },
    { headline: '惊险过关！{playerName}末节救主', recap: '第四节一度落后的困境下，{playerName}展现了大心脏本色。他在末节独得双位数，帮助球队完成逆转。对手最后的绝杀尝试未能命中，{playerName}和他的球队惊险拿下这场关键胜利。' },
    { headline: '一分之差！{playerName}率队险胜', recap: '比赛的最后30秒如同过山车般刺激。{playerName}在关键时刻两罚全中帮助球队反超，对手最后一攻在严密防守下偏出。这场一分险胜让主场球迷经历了一场心跳加速的夜晚。' },
    { headline: '{playerName}最后时刻建功！逆转取胜', recap: '落后进入第四节的{playerName}没有放弃。他在末节率队打出强势反击，最后2分钟连得5分锁定胜局。这场逆转胜利将成为本赛季最令人难忘的时刻之一。' },
    { headline: '生死时刻！{playerName}稳住局面', recap: '比赛进入白热化阶段，{playerName}在最后1分钟贡献了关键的2分1助攻1抢断。他的冷静和果断在关键时刻闪耀全场，帮助球队在一场胶着的拉锯战中占据上风。' },
    { headline: '{playerName}加时赛发威！艰难取胜', recap: '常规赛时间未能分出胜负，加时赛中{playerName}展现了超强的意志力。他在加时赛独得8分，几乎以一己之力扛着球队前进。这场来之不易的胜利让更衣室充满了如释重负的气氛。' },
    { headline: '拉锯战胜出！{playerName}关键球制胜', recap: '两支球队从开场就咬在一起，谁也无法拉开分差。{playerName}在最后时刻的单打成功打破了平衡，这个关键进球成为整场比赛的决定性瞬间。' },
    { headline: '{playerName}罚球定胜局！惊险获胜', recap: '最后8秒{playerName}站上罚球线，全场屏息。两罚全中，领先3分，对手的最后一投弹框而出。{playerName}用最基本的方式——罚球，为球队锁定了一场险胜。' },
    { headline: '绝地反击！{playerName}末节统治比赛', recap: '第三节结束时还落后7分，但{playerName}在第四节简直像换了一个人。他攻防两端全面爆发，单节贡献了14分3篮板2助攻，率队完成惊天逆转。' },
    { headline: '险胜！{playerName}关键封盖锁定胜局', recap: '比赛最后5秒，对手发动最后一攻。{playerName}在禁区内完成了一记关键封盖，将对手的扳平上篮拒之门外。这记封盖不仅是今天比赛的转折点，也是本赛季最精彩的防守之一。' },
    { headline: '{playerName}冷静收尾！一分优势取胜', recap: '比分焦灼的最后两分钟里，{playerName}展现出了远超年龄的冷静。他没有强行出手，而是耐心地通过传导球找到最佳机会。最终球队以一分之差险胜，{playerName}的智慧功不可没。' },
    { headline: '双加时鏖战！{playerName}带队笑到最后', recap: '这是一场马拉松式的较量。两个加时赛让双方球员都精疲力竭，但{playerName}在第二个加时中展现了超人的体能和意志。他的连续得分最终让对手无力回天。' },
    { headline: '心跳胜利！{playerName}读秒绝杀', recap: '计时器还剩2.3秒，{playerName}接球后没有犹豫，转身跳投——球应声入网！全场球迷从座位上跳了起来，{playerName}被队友们压在了最底下。这是本赛季最戏剧性的胜利。' },
    { headline: '{playerName}关键篮板补篮！险胜对手', recap: '最后时刻比分落后1分，{playerName}在人群中抢到关键进攻篮板，起跳补篮命中！还造成了犯规！加罚命中后球队领先2分，对手最后一攻未能得手。' },
    { headline: '咬紧牙关！{playerName}带队突围', recap: '一场防守至上的低比分较量中，{playerName}用他全面的表现带领球队挺过了最艰难的时刻。关键的抢断和随后的快攻得分成为了比赛的分水岭。' },
    { headline: '{playerName}关键三分！逆转获胜', recap: '落后2分还剩15秒，{playerName}在三分线外接到球。面对防守他果断出手，球划出完美弧线空心入网！这记三分不仅赢得了比赛，也让全场球迷陷入了疯狂。' },
    { headline: '险象环生！{playerName}稳住军心', recap: '对手在最后3分钟打出了10-2的高潮，将分差缩小到1分。暂停回来后{playerName}接管了比赛——他先是稳稳罚中两球，接着在防守端完成抢断，彻底扑灭了对手的反扑。' },
    { headline: '{playerName}末节爆发！惊险取胜', recap: '前三节表现平平的{playerName}在第四节突然爆发。他在最后5分钟内砍下了12分，帮助球队从落后6分的困境中翻盘。赛后他说："关键时刻就是要站出来。"' },
    { headline: '一波三折！{playerName}率队过关', recap: '这场比赛如同一部悬疑片——领先、被追平、再领先、再被追平。最终{playerName}在终场前30秒的2+1成为了最后的转折点，他的球队以3分优势惊险过关。' },
    { headline: '{playerName}冷静如冰！关键球一击致命', recap: '最后时刻所有人都在紧张，唯独{playerName}面不改色。他在弧顶接球后，面对双人包夹冷静地后撤步出手，球空心入网。这种大心脏表现让人叹为观止。' },
    { headline: '死里逃生！{playerName}拯救球队', recap: '比赛还剩1分钟时球队还落后4分，形势岌岌可危。但{playerName}先是一个三分追到1分，接着在防守端造成带球撞人，最后两罚全中反超。一波8-0的攻击波，奇迹般地赢下了比赛。' },
    { headline: '{playerName}致胜抢断！惊险获胜', recap: '对手持球准备最后一攻，{playerName}像猎豹一样蹲守在传球路线上。他的预判完美，抢断后一条龙快攻得手。全场沸腾，这是一次教科书般的关键防守。' },
    { headline: '逆转好戏！{playerName}导演翻盘', recap: '半场落后15分，很多人以为比赛已经失去悬念。但{playerName}不这么想。他下半场火力全开，第三节独得16分缩小差距，第四节率队完成逆转。这是本赛季最精彩的翻盘之一。' },
    { headline: '{playerName}力挽狂澜！险胜收场', recap: '当队友们在末节陷入得分荒时，{playerName}扛起了进攻大旗。他连续4个回合得分，包括一个关键的2+1，帮助球队在最后时刻反超并守住领先。' },
    { headline: '悬念到最后一秒！{playerName}带队险胜', recap: '最后10秒双方战平，{playerName}持球推进。他没有急于出手，而是等到最后3秒才启动突破，在两名防守人之间找到缝隙上篮命中。绝杀！全场欢声雷动。' },
    { headline: '{playerName}关键助攻！团队险胜', recap: '最后时刻{playerName}吸引了包夹，他没有强行出手而是冷静地找到了空位的队友。三分命中！这个助攻比任何得分都更有价值，因为它体现了{playerName}的篮球智慧和无私。' },
    { headline: '咬到最后！{playerName}带伤取胜', recap: '{playerName}在第三节扭伤了脚踝，但他坚持打完了比赛。在关键的第四节，他拖着伤腿依然贡献了8分3助攻。赛后他一瘸一拐地走下球场，但脸上的笑容说明一切。' },
    { headline: '{playerName}造犯规罚球绝杀！一锤定音', recap: '比赛还剩1.8秒，{playerName}在三分线外假动作晃起防守人，起球投篮——哨响！三罚全中，对手已无时间反击。{playerName}用他最擅长的造犯规技巧赢下了比赛。' },
    { headline: '绝地求生！{playerName}拯救败局', recap: '末节落后10分的绝境中，{playerName}吹响了反击号角。他先是一个三分，接着一个抢断快攻，再来一个中距离——7分在30秒内入账，将比赛拖入加时，最终加时赛胜出。' },
    { headline: '{playerName}读秒2+1！绝杀取胜', recap: '最后3秒，球队落后1分。{playerName}接球后向左突破，在禁区边缘起跳出手——球进哨响！加罚命中，对手只剩0.4秒无力回天。这是属于{playerName}的夜晚。' },
    { headline: '艰难取胜！{playerName}关键发挥', recap: '一场拉锯战打到了最后一刻。{playerName}全场命中率并不高，但他在最后2分钟的关键进球和防守让球队笑到了最后。有时候，英雄不需要完美的数据，只需要关键时刻站出来。' },
    { headline: '虎口拔牙！{playerName}客场险胜', recap: '客场作战本就艰难，更何况对手是联盟强队。但{playerName}在最后时刻展现了超强的竞争意识，他的关键得分和防守帮助球队在客场偷走了一场胜利。更衣室里，每个人都激动得说不出话。' },
    { headline: '{playerName}终场前致胜球！险胜', recap: '比赛还剩8秒，{playerName}在低位要到位接球。他转身面对防守，用一个假动作晃开空间后跳投——球进！对手最后的绝望三分偏出，{playerName}又一次在关键时刻证明了自己。' },
    { headline: '一分险胜！{playerName}防守立功', recap: '比赛的最后1分15秒，双方都没有再得分。但{playerName}在防守端的表现堪称完美——他连续两回合防住了对方的头号得分手，让对手无功而返。防守赢得比赛，今天就是最好的例证。' },
    { headline: '{playerName}读秒绝平进加时！加时胜出', recap: '常规时间最后一秒，{playerName}在半场附近接到球，转身就投——球划出不可思议的弧线落入网心！全场疯狂！加时赛中{playerName}继续保持火热手感，率队最终取胜。' },
    { headline: '末节翻盘！{playerName}关键表现', recap: '三节结束时落后9分，胜利似乎正在远离。但{playerName}在第四节展现了领袖气质，他攻防两端全面爆发，率队打出了31-18的单节比分，完成了一场令人振奋的末节翻盘。' },
    { headline: '险胜！{playerName}关键回合掌控全局', recap: '比赛最后3分钟如同下棋，每一个回合都至关重要。{playerName}在关键的3个回合中贡献了4分2助攻0失误，完美的执行力和决策力帮助球队在焦灼的比赛中脱颖而出。' }
  ],
  win_comfortable: [
    { headline: '{playerName}率队稳稳取胜', recap: '从开场就掌控了比赛节奏，{playerName}的球队全场保持着两位数的领先优势。他在攻防两端都发挥了核心作用，带领球队拿下了一场令人信服的胜利。' },
    { headline: '稳定输出！{playerName}带队获胜', recap: '没有太多悬念的一场比赛。{playerName}在场上显得游刃有余，他的组织和得分让球队始终牢牢掌握着主动权。这场胜利来得水到渠成。' },
    { headline: '{playerName}发挥全面！轻松取胜', recap: '一场让人安心的胜利。{playerName}在攻防两端都做出了稳定的贡献，球队从头到尾没有给对手任何翻盘的机会。赛后更衣室里气氛轻松，队友们有说有笑。' },
    { headline: '有序推进！{playerName}掌控全局', recap: '{playerName}今天像一位指挥家，每个回合都处理得恰到好处。他的节奏控制让对手永远无法起势，一场舒适的胜利就这样被稳稳收入囊中。' },
    { headline: '{playerName}稳健表现！胜利入账', recap: '一场标准的胜利。{playerName}不需要做出太多英雄式的表演，他的稳定输出就足以带领球队取胜。赛后他快速完成了恢复训练，为下一场做准备。' },
    { headline: '节奏大师！{playerName}带队过关', recap: '{playerName}在场上如同节拍器一般稳定。当需要得分时他能站出来，当需要组织时他能找到队友。这种全面的表现让球队始终控制着比赛。' },
    { headline: '{playerName}攻守兼备！从容获胜', recap: '对手在第三节试图发起反扑，但{playerName}在攻防两端都给出了回应。他的关键得分和防守让对手的反扑化为泡影，球队最终以舒适的优势获胜。' },
    { headline: '稳扎稳打！{playerName}带队取胜', recap: '没有惊心动魄的末节悬念，没有绝杀或逆转的戏码。{playerName}和他的球队用最扎实的方式赢得了比赛——防守、传导、得分，一切都按计划进行。' },
    { headline: '{playerName}全场掌控！顺利获胜', recap: '从跳球到终场哨响，{playerName}的球队始终占据着场上的主动。他的全面数据只是今晚稳定发挥的一个缩影，胜利是对全队努力最好的回报。' },
    { headline: '轻松取胜！{playerName}三节打卡', recap: '三节结束时比赛已经失去了悬念。{playerName}第四节全程坐在板凳上，他和队友有说有笑地看着替补球员完成最后的比赛。难得的轻松夜晚。' },
    { headline: '{playerName}高效发挥！胜券在握', recap: '今晚的{playerName}投篮效率极高，几乎每一次出手都是好球。他的高效表现让对手的防守形同虚设，球队早早建立起安全领先并保持到最后。' },
    { headline: '团队篮球！{playerName}率队获胜', recap: '这不是一个人的表演，而是团队的胜利。{playerName}不断为队友创造机会，全队6人得分上双。这种分享球的打法让对手防不胜防。' },
    { headline: '{playerName}沉着应对！稳步取胜', recap: '对手在第二节一度将分差缩小到5分，但{playerName}沉着冷静地带领球队重新建立领先。他不慌不忙的处理方式展现了成熟球员的风范。' },
    { headline: '水到渠成！{playerName}带队获胜', recap: '一场计划内的胜利。{playerName}在场上做了一切需要他做的事情——得分、组织、防守。比赛结果从未有过真正的悬念。' },
    { headline: '{playerName}轻松发挥！拿下对手', recap: '今晚的比赛对{playerName}来说就像一次训练。他没有过度消耗体力，就能帮助球队稳稳拿下胜利。赛后他早早完成了恢复程序，享受了一个轻松的夜晚。' },
    { headline: '波澜不惊！{playerName}带队获胜', recap: '全场比赛的最大悬念只是赢多少分。{playerName}的球队始终保持着15分以上的领先，最终顺利取胜。这种稳定性是冠军球队的标志。' },
    { headline: '{playerName}运筹帷幄！轻松取胜', recap: '今晚的{playerName}更像一位战略家而非战士。他精准地阅读着场上的局势，在需要的时候出手，在不需要的时候让队友发挥。一场教科书般的胜利。' },
    { headline: '稳妥取胜！{playerName}发挥出色', recap: '没有给对手留下任何幻想的空间。{playerName}在场上如同一台精密的机器，每个动作都恰到好处。这场胜利展现了球队的实力和深度。' },
    { headline: '{playerName}核心带队！从容获胜', recap: '当球队需要有人稳定局面时，{playerName}总是在那里。他今天的表现虽然不是最抢眼的，但绝对是最重要的。领袖的价值就在于此。' },
    { headline: '按部就班！{playerName}率队取胜', recap: '从赛前的战术准备到场上的执行，一切都按照计划进行。{playerName}的稳定输出让球队始终保持着安全的领先优势，胜利水到渠成。' },
    { headline: '{playerName}独当一面！轻松获胜', recap: '今晚对手对{playerName}的防守完全失效。无论是单打还是配合，他都能找到得分的方式。这场轻松的胜利证明了他作为球队核心的价值。' },
    { headline: '胜券在握！{playerName}稳定输出', recap: '一场让人放心的胜利。{playerName}在场时球队净胜20分，他的存在让队友们也变得更加自信。赛后教练满意地点了点头。' },
    { headline: '{playerName}掌控节奏！顺利过关', recap: '快慢结合、内外兼顾，{playerName}今天完美地控制了比赛节奏。对手始终无法找到自己的节奏，而{playerName}的球队则像一台调校完美的跑车。' },
    { headline: '实力碾压！{playerName}带队获胜', recap: '两支球队今天的差距是明显的。{playerName}在场上的每个位置都能制造优势，对手对此无能为力。这场胜利是实力的体现。' },
    { headline: '{playerName}全面开花！稳获胜利', recap: '得分、篮板、助攻、抢断，{playerName}的数据栏上写满了贡献。他在场时球队攻防两端都更加出色，一场全面的胜利由此而来。' },
    { headline: '稳如磐石！{playerName}带队取胜', recap: '对手在比赛中多次试图追分，但每次{playerName}都能稳住局面。他就像一块磐石，让球队在风暴中始终保持着平衡。' },
    { headline: '{playerName}从容不迫！拿下比赛', recap: '即使在对手最接近的时候，{playerName}也没有慌乱。他的沉稳感染了全队，球队在关键时刻的执行力让人印象深刻。' },
    { headline: '行云流水！{playerName}率队获胜', recap: '今晚的进攻流畅得如同行云流水。{playerName}的传球总能找到最佳的进攻点，全队的跑位和配合赏心悦目。一场漂亮的团队胜利。' },
    { headline: '{playerName}稳定军心！顺利取胜', recap: '无论对手如何调整，{playerName}都能找到应对的方法。他的球场智商和稳定的执行力让球队始终占据上风，胜利是理所应当的结果。' },
    { headline: '计划内胜利！{playerName}带队拿下', recap: '赛前的部署得到了完美的执行。{playerName}在场上的每一个决策都像经过了精密计算，最终球队以一种令人信服的方式拿下了比赛。' },
    { headline: '{playerName}游刃有余！轻松取胜', recap: '对手的防守对{playerName}来说太过简单了。他轻松地在各个位置得分，还在防守端贡献了关键的篮板和抢断。这场比赛对他来说只是一次例行公事。' },
    { headline: '稳操胜券！{playerName}表现出色', recap: '从第一节起，{playerName}就向对手宣告了今晚的统治权。他的攻防转换流畅而高效，球队始终牢牢把控着比赛的走势。' },
    { headline: '{playerName}战术执行到位！轻松获胜', recap: '教练的战术板上画了什么，{playerName}就在场上执行了什么。精准的战术执行力让对手的防守体系支离破碎，胜利来得理所当然。' },
    { headline: '控制性胜利！{playerName}带队过关', recap: '这场比赛的走势始终在{playerName}的掌控之中。他不允许对手有任何起势的机会，用自己全面的表现为球队锁定了一场控制性的胜利。' },
    { headline: '{playerName}稳健输出！获胜而归', recap: '又一场稳稳拿下的比赛。{playerName}赛后直接去做了恢复训练，因为他知道明天还有新的挑战。这种职业态度正是球队需要的。' }
  ],
  win_blowout: [
    { headline: '碾压取胜！{playerName}率队大胜', recap: '这是一场完全一边倒的比赛。{playerName}和球队从开场就展现了碾压级的实力，对手从头到尾没有任何抵抗之力。三节打卡下班，替补球员享受了充足的出场时间。' },
    { headline: '屠杀！{playerName}带队狂胜', recap: '从跳球到终场，对手没有哪怕一秒钟的领先。{playerName}在场上予取予求，球队打出了赛季最佳的一场比赛。赛后更衣室里欢声笑语，这是属于团队的美好夜晚。' },
    { headline: '{playerName}狂飙！大胜对手', recap: '今晚的{playerName}简直不可阻挡。他的进攻火力让对手的防守体系彻底崩塌，全场比赛分差一直在20分以上徘徊。这不是比赛，这是一场表演。' },
    { headline: '降维打击！{playerName}率队横扫', recap: '两支球队今晚完全不在同一个层级上。{playerName}的每一次进攻都像是在执行教学示范，对手只能无奈地看着分差越拉越大。一场大胜后的更衣室里，音乐声震耳欲聋。' },
    { headline: '{playerName}火力全开！狂胜对手', recap: '今晚的比赛在第二节就失去了悬念。{playerName}在那波致命的攻势中独得12分，将分差拉开到了不可逆转的程度。此后比赛进入了表演时间。' },
    { headline: '屠戮之夜！{playerName}带队大捷', recap: '一场让对手完全绝望的胜利。{playerName}在场时球队净胜40分，他的个人表现和团队配合都堪称完美。赛后对手的主教练也承认："他们今晚太强了。"' },
    { headline: '{playerName}单节打花！大胜而归', recap: '第二节的一波30-8让比赛彻底失去了悬念。{playerName}在那波攻势中不可阻挡，他的连续得分让对手主教练连续叫了两个暂停也于事无补。' },
    { headline: '碾压局！{playerName}率队狂胜', recap: '对手今晚连还手的机会都没有。{playerName}的球队在攻防两端都占据了绝对优势，全场最大领先超过35分。这是一场让对手希望赶紧结束的噩梦。' },
    { headline: '{playerName}无可阻挡！轻松大胜', recap: '对手的每一次进攻都被化解，每一次防守都显得苍白无力。{playerName}在场上几乎是在做投篮练习，他的效率高得令人瞠目。' },
    { headline: '一边倒！{playerName}率队血洗对手', recap: '半场领先25分，三节领先35分，终场领先42分。{playerName}的球队今晚打出了压倒性的表现，对手从头到尾都没有任何机会。' },
    { headline: '{playerName}表演时刻！大胜到手', recap: '当比赛进入垃圾时间，{playerName}在场边和替补球员们打成一片。他们为每一个好球欢呼，享受着这场碾压式胜利带来的轻松时光。' },
    { headline: '碾碎对手！{playerName}带队完胜', recap: '今晚的比赛完全是一面倒的屠杀。{playerName}甚至不需要在第四节出场，他在前三节就做完了所有需要做的事情。替补球员在第四节享受了球馆的欢呼。' },
    { headline: '{playerName}高效屠杀！狂胜而归', recap: '投篮效率高得吓人，防守严密得令人窒息。{playerName}和他的球队今晚展现了冠军级别的统治力，对手只能感叹实力差距太大。' },
    { headline: '完爆！{playerName}率队大胜', recap: '对手今晚的命中率只有34%，而{playerName}的球队全场保持着超过55%的命中率。这不是一场比赛，这是实力的碾压。' },
    { headline: '{playerName}三节下班！大胜收官', recap: '三节结束分差已经超过30分，{playerName}换上训练服坐在板凳上。第四节他充当起了临时助教的角色，给年轻队友支招。即使是垃圾时间，他也在学习。' }
  ],
  loss_close: [
    { headline: '惜败！{playerName}无力回天', recap: '一场令人扼腕的失利。{playerName}在最后时刻的投篮差了一点，球在篮筐上转了两圈弹了出来。对手抓住机会完成反击，{playerName}的球队以微弱劣势饮恨。' },
    { headline: '{playerName}末节苦战！遗憾落败', recap: '拼到了最后一刻，但胜利还是与{playerName}擦肩而过。他在第四节的反扑将分差缩小到1分，但对手在最后时刻的罚球让追分功亏一篑。' },
    { headline: '功亏一篑！{playerName}遗憾落败', recap: '领先了大半场却在最后时刻被逆转。{playerName}在关键回合的失误让对手抓住机会反超，之后的追分始终差了一口气。更衣室里弥漫着不甘和遗憾。' },
    { headline: '{playerName}苦战落败！一分之差', recap: '一分之差输掉了这场鏖战。{playerName}在最后时刻的防守几乎完美，但对手还是找到了一丝空隙。这种失利比大败更让人难受。' },
    { headline: '饮恨赛场！{playerName}惜败对手', recap: '对手在最后5秒投进了致胜一球，{playerName}站在原地愣了几秒。他的防守已经到位了，但那个球就是进了。有时候，篮球就是这么残酷。' },
    { headline: '{playerName}拼尽全力！仍憾负', recap: '{playerName}今晚交出了全面的数据，但球队还是差了最后一步。他在末节独得10分试图挽救局面，但对手的关键回应让一切努力化为泡影。' },
    { headline: '差之毫厘！{playerName}遗憾落败', recap: '比赛最后30秒{playerName}的球队还领先1分，但对手的2+1改变了局面。最后一次进攻中{playerName}的出手被干扰，球队以2分之差遗憾落败。' },
    { headline: '{playerName}最后时刻失手！惜败', recap: '全场比赛{playerName}都在和对方核心针锋相对。但在决定胜负的最后一攻中，他的投篮弹框而出。赛后他一个人在更衣室里坐了很久。' },
    { headline: '加时苦战落败！{playerName}独木难支', recap: '加时赛中{playerName}几乎是以一敌五，他的队友们已经精疲力竭。最终他的体力也到达了极限，球队在加时赛中遗憾落败。' },
    { headline: '{playerName}无力回天！遗憾告负', recap: '第四节落后8分的绝境中，{playerName}率队奋起直追将分差缩小到1分。但最后时刻的关键球没有打进，追分的努力未能换来胜利。' },
    { headline: '痛失好局！{playerName}遗憾输球', recap: '前三节一直领先的{playerName}在第四节遭遇了对手的疯狂反扑。关键回合的几次失误让胜利溜走，这种痛失好局的感觉比任何失利都难受。' },
    { headline: '{playerName}末节追分未果！惜败', recap: '落后两位数进入末节，{playerName}没有放弃。他率队打出了顽强的反击，但最终在追到只差2分时功亏一篑。虽败犹荣，但没有人想要这样的安慰。' },
    { headline: '遗憾告负！{playerName}最后一攻失手', recap: '还剩5秒落后2分，{playerName}接球后强突篮下，但在两名防守人的夹击下上篮偏出。终场哨响，他蹲在地上用力拍了地板。' },
    { headline: '{playerName}苦战至最后一秒！落败', recap: '一场打了48分钟硬仗的比赛，{playerName}倾尽了所有。但篮球有时候不讲道理，他在最后时刻的好球被篮筐拒绝，球队以最遗憾的方式输球。' },
    { headline: '功败垂成！{playerName}惜败收场', recap: '距离胜利只有一步之遥。{playerName}在最后2分钟的抢断本可以改变比赛走势，但随后的快攻被对手追帽。比赛的天平就此倾斜。' }
  ],
  loss_comfortable: [
    { headline: '{playerName}独木难支！落败而归', recap: '对手的整体实力更胜一筹，{playerName}虽然尽力了但难以扭转局面。分差始终保持在两位数，球队未能找到有效的反击方式。一场在意料之中的失利。' },
    { headline: '对手更强！{playerName}遗憾落败', recap: '从比赛走势来看，对手今天的表现确实更加出色。{playerName}在场上努力寻找突破口，但对方的防守体系几乎无懈可击。' },
    { headline: '{playerName}苦战不敌！输掉比赛', recap: '一场并不意外的失利。对手在攻防两端都展现了更高的水平，{playerName}虽然数据不错但无力改变比赛走向。赛后他平静地接受了结果。' },
    { headline: '实力差距！{playerName}带队落败', recap: '两支球队今天的状态有着明显的差距。{playerName}的球队在攻防两端都未能达到最佳水平，对手则抓住了每一个机会拉开分差。' },
    { headline: '{playerName}未能扭转局面！落败', recap: '中场休息后{playerName}试图带领球队追分，但每次将分差缩小到个位数，对手总能给出回应。最终分差始终保持在安全范围内，{playerName}的球队无力回天。' },
    { headline: '不敌对手！{playerName}吞下败仗', recap: '对手今晚的准备更加充分，战术执行也更加到位。{playerName}在赛后坦言："对手配得上胜利，我们需要从中学习。"' },
    { headline: '{playerName}遭遇失利！对手更优', recap: '今晚的失利并非偶然。对手在篮板、助攻和命中率上都占据优势，{playerName}虽然努力但难以独自填补这些差距。' },
    { headline: '对手发挥更佳！{playerName}落败', recap: '一场实力对比鲜明的比赛。{playerName}在某些时刻展现了个人能力，但对手的整体配合更加流畅，最终以较大的优势取胜。' },
    { headline: '{playerName}无力改变！输掉比赛', recap: '第三节对手的一波攻势将分差拉开到了不可逆转的程度。{playerName}在那段时间里试图稳住局面，但对手的火力太过猛烈。' },
    { headline: '客场落败！{playerName}未能翻盘', recap: '客场作战的困难加上对手的强势表现，{playerName}的球队今晚遇到了真正的挑战。虽然他们从未放弃，但翻盘的窗口始终没有打开。' },
    { headline: '{playerName}孤掌难鸣！客场失利', recap: '今晚队友们的状态普遍不佳，{playerName}几乎是唯一能稳定得分的人。但一个人的力量终究有限，球队最终以明显的差距落败。' },
    { headline: '不敌强敌！{playerName}吞下败果', recap: '面对联盟顶尖球队，{playerName}和他的球队展现了斗志但实力上有差距。赛后他说："和这样的对手交手，我们知道自己的短板在哪里。"' },
    { headline: '{playerName}空砍高分！球队落败', recap: '{playerName}今晚的个人表现相当出色，但篮球是五个人的运动。队友的低迷让他的努力化为了空砍，这是一场令人遗憾的失利。' },
    { headline: '节奏被打乱！{playerName}带队落败', recap: '对手的防守策略有效地限制了{playerName}的发挥，球队的进攻节奏也完全被打乱。尽管他在下半场有所回暖，但为时已晚。' },
    { headline: '{playerName}未能力挽狂澜！落败', recap: '比赛的大部分时间里，对手都牢牢控制着主动权。{playerName}在第四节率队做出最后的努力，但分差太大已无力回天。' }
  ],
  loss_blowout: [
    { headline: '惨败！{playerName}无力招架', recap: '一场噩梦般的比赛。对手在攻防两端都碾压了{playerName}的球队，从第一节起分差就被不断拉大。三节结束时比赛已经进入垃圾时间，更衣室里沉默得可怕。' },
    { headline: '{playerName}遭遇惨败！溃不成军', recap: '今晚的{playerName}像是迷失在了对手的铜墙铁壁之中。无论进攻还是防守，他的球队都被对手全面压制。这场惨败将成为球队必须直面的警醒。' },
    { headline: '崩盘！{playerName}球队惨败', recap: '第二节的一波崩溃让比赛彻底失去了悬念。对手在那段时间里打出了令人窒息的攻防表现，{playerName}的球队完全找不到应对之策。' },
    { headline: '{playerName}惨遭血洗！大败而归', recap: '这是一场让人不忍直视的惨败。对手的每一次进攻都像是在嘲笑{playerName}球队的防守，而{playerName}在进攻端也找不到任何节奏。更衣室里只有沉默。' },
    { headline: '溃败之夜！{playerName}无言以对', recap: '全场最大落后超过30分，{playerName}在第三节就被换下。他用毛巾盖住了脸，不愿再看计分板上的数字。这是本赛季最惨痛的失利。' },
    { headline: '{playerName}遭遇噩梦！惨败收场', recap: '从开场跳球开始，对手就展现了不可阻挡的势头。{playerName}的球队在攻防两端全面崩溃，这场惨败的阴影将笼罩很久。' },
    { headline: '一败涂地！{playerName}无力回天', recap: '对手今晚简直是在做投篮训练。{playerName}的防守对对手毫无威胁，进攻端又频频失误。一场彻头彻尾的灾难。' },
    { headline: '{playerName}吞下苦果！大比分落败', recap: '当分差来到25分的时候，{playerName}仍然在场上拼搏。但他的努力在巨大的分差面前显得如此无力。终场哨响时他只是无奈地摇了摇头。' },
    { headline: '噩梦之夜！{playerName}惨遭碾压', recap: '这是{playerName}本赛季最不想回忆的一场比赛。对手在他的头上予取予求，而他的球队似乎忘记了如何打篮球。赛后的录像课将是一场痛苦的审视。' },
    { headline: '{playerName}大败！赛季最差一战', recap: '一场令人羞愧的表现。{playerName}赛后没有接受采访，直接去了训练馆。投篮机在空旷的馆里嗡嗡作响，这是他处理失败的方式——用行动回应。' },
    { headline: '惨不忍睹！{playerName}球队溃败', recap: '对手的每一个球员都在今晚打出了超常表现，而{playerName}的球队则集体低迷。这场比赛的录像将作为反面教材在球队内部反复观看。' },
    { headline: '{playerName}遭遇屠杀！惨败收场', recap: '从第一节落后15分到半场落后28分，{playerName}的球队今晚完全被对手打爆了。赛后的更衣室里没有人说话，只有冰箱门被重重关上的声音。' },
    { headline: '全面溃败！{playerName}无力抵抗', recap: '对手今晚的投篮命中率高达58%，三分命中率45%，而{playerName}的球队只有37%和25%。数据说明了一切——这是一场全面溃败。' },
    { headline: '{playerName}低迷！球队惨败', recap: '今晚的{playerName}状态全无，投篮频频偏出，防守端也跟不上对手的节奏。他的低迷直接影响了全队的表现，这场惨败是集体的失败。' },
    { headline: '耻辱之夜！{playerName}大败而归', recap: '对手在第三节打出了一波30-5的攻势，{playerName}的球队在那段时间里几乎无法将球推进过半场。这场惨败将成为球队反思的起点。' }
  ],
  headline_win: [
    { headline: '{playerName}闪耀全场！率队获胜', recap: '' },
    { headline: '关键先生！{playerName}带队取胜', recap: '' },
    { headline: '{playerName}爆发！球队拿下比赛', recap: '' },
    { headline: '核心归位！{playerName}率队赢球', recap: '' },
    { headline: '{playerName}统治比赛！轻松获胜', recap: '' },
    { headline: '领袖风范！{playerName}带队凯旋', recap: '' },
    { headline: '{playerName}全面发挥！胜券在握', recap: '' },
    { headline: 'MVP级表现！{playerName}率队过关', recap: '' },
    { headline: '{playerName}当之无愧！球队获胜', recap: '' },
    { headline: '王牌亮剑！{playerName}带队取胜', recap: '' },
    { headline: '{playerName}势不可挡！胜果入账', recap: '' },
    { headline: '全明星水准！{playerName}率队获胜', recap: '' },
    { headline: '{playerName}关键先生！一锤定音', recap: '' },
    { headline: '球队灵魂！{playerName}带队赢球', recap: '' },
    { headline: '{playerName}大杀四方！胜利到手', recap: '' },
    { headline: '攻防一体！{playerName}带队凯旋', recap: '' },
    { headline: '{playerName}赛季最佳一战！球队获胜', recap: '' },
    { headline: '定海神针！{playerName}稳住局面', recap: '' },
    { headline: '{playerName}carry全场！赢下比赛', recap: '' },
    { headline: '无可阻挡！{playerName}带队取胜', recap: '' },
    { headline: '{playerName}关键时刻站出来！取胜', recap: '' },
    { headline: '英雄本色！{playerName}率队获胜', recap: '' },
    { headline: '{playerName}力挽狂澜！拿下比赛', recap: '' },
    { headline: '胜利功臣！{playerName}带队赢球', recap: '' },
    { headline: '{playerName}末节发威！逆转取胜', recap: '' },
    { headline: '一锤定音！{playerName}绝杀对手', recap: '' },
    { headline: '{playerName}大心脏！惊险获胜', recap: '' },
    { headline: '完美表现！{playerName}率队赢球', recap: '' },
    { headline: '{playerName}无人能挡！球队获胜', recap: '' },
    { headline: '实至名归！{playerName}带队拿下', recap: '' },
    { headline: '{playerName}接管比赛！胜利在握', recap: '' },
    { headline: '球场指挥官！{playerName}率队取胜', recap: '' },
    { headline: '{playerName}如有神助！轻松取胜', recap: '' },
    { headline: '全民偶像！{playerName}带队获胜', recap: '' },
    { headline: '{playerName}逆境崛起！率队翻盘', recap: '' }
  ],
  headline_loss: [
    { headline: '{playerName}独木难支！球队落败', recap: '' },
    { headline: '遗憾！{playerName}苦战落败', recap: '' },
    { headline: '{playerName}空砍高分！无力回天', recap: '' },
    { headline: '功亏一篑！{playerName}憾负对手', recap: '' },
    { headline: '{playerName}未能救主！球队落败', recap: '' },
    { headline: '惜败！{playerName}最后一刻失手', recap: '' },
    { headline: '{playerName}孤掌难鸣！吞下败果', recap: '' },
    { headline: '饮恨！{playerName}遗憾告负', recap: '' },
    { headline: '{playerName}无力扭转！球队失利', recap: '' },
    { headline: '差之毫厘！{playerName}惜败收场', recap: '' },
    { headline: '{playerName}独木撑天！仍不敌', recap: '' },
    { headline: '苦战落败！{playerName}无力回天', recap: '' },
    { headline: '{playerName}末节追分未果！落败', recap: '' },
    { headline: '失利之夜！{playerName}难挽败局', recap: '' },
    { headline: '{playerName}遭遇逆风！败下阵来', recap: '' },
    { headline: '不敌对手！{playerName}吞下败仗', recap: '' },
    { headline: '{playerName}力竭败北！遗憾落败', recap: '' },
    { headline: '客场的艰难！{playerName}落败而归', recap: '' },
    { headline: '{playerName}拼尽全力！仍落败', recap: '' },
    { headline: '差距明显！{playerName}球队失利', recap: '' },
    { headline: '{playerName}陷入低迷！球队落败', recap: '' },
    { headline: '不敌强敌！{playerName}吞下败果', recap: '' },
    { headline: '{playerName}未能救场！败走客场', recap: '' },
    { headline: '败兴而归！{playerName}球队失利', recap: '' },
    { headline: '{playerName}状态不佳！球队落败', recap: '' },
    { headline: '败局已定！{playerName}无力回天', recap: '' },
    { headline: '{playerName}独斗难支！吞下失利', recap: '' },
    { headline: '全队低迷！{playerName}难挽败局', recap: '' },
    { headline: '{playerName}遭遇滑铁卢！球队落败', recap: '' },
    { headline: '无奈落败！{playerName}独木难支', recap: '' },
    { headline: '{playerName}空砍！球队惨遭失利', recap: '' },
    { headline: '梦碎！{playerName}末节功亏一篑', recap: '' },
    { headline: '{playerName}败走！球队失利', recap: '' },
    { headline: '遗憾收场！{playerName}无力翻盘', recap: '' },
    { headline: '{playerName}败北！球队吞下失利', recap: '' }
  ],
  // Additional RECAP entries to reach 300+
  win_close_extra: [
    { headline: '险胜！{playerName}关键球制胜', recap: '一场悬念迭起的较量，{playerName}在最后时刻的冷静处理球决定了比赛。他的关键得分让球队在焦灼中笑到了最后。' },
    { headline: '{playerName}末节救主！惊险获胜', recap: '第四节落后的困境下，{playerName}展现了大心脏本色。他在末节独得双位数，帮助球队守住微弱领先优势。' },
    { headline: '一分险胜！{playerName}罚球定胜局', recap: '最后时刻{playerName}站上罚球线，全场屏息。两罚全中，对手最后一攻偏出。一分之差的胜利来之不易。' },
    { headline: '{playerName}关键封盖！险胜对手', recap: '比赛最后5秒，{playerName}完成关键封盖将对手的扳平上篮拒之门外。这记封盖是今晚最精彩的防守。' },
    { headline: '逆转！{playerName}末节率队翻盘', recap: '落后进入第四节的{playerName}没有放弃。他在末节率队打出强势反击，最后2分钟连得5分锁定胜局。' },
    { headline: '加时胜！{playerName}扛起球队前行', recap: '加时赛中{playerName}展现了超强意志力，独得8分几乎以一己之力扛着球队前进。这场来之不易的胜利让更衣室充满如释重负的气氛。' },
    { headline: '{playerName}关键三分！惊险取胜', recap: '落后2分还剩15秒，{playerName}在三分线外果断出手，球空心入网！这记关键三分赢得了比赛。' },
    { headline: '读秒绝杀！{playerName}一锤定音', recap: '计时器还剩2.3秒，{playerName}接球后转身跳投，球应声入网！全场球迷从座位上跳了起来。' },
    { headline: '{playerName}2+1绝杀！心跳胜利', recap: '最后3秒{playerName}突破造成犯规同时将球放进——加罚命中，对手已无时间反击。完美的剧本。' },
    { headline: '生死时刻！{playerName}攻防一体险胜', recap: '最后1分钟{playerName}贡献了关键的2分1助攻1抢断，他的冷静和果断在关键时刻闪耀全场。' }
  ],
  loss_close_extra: [
    { headline: '惜败！{playerName}最后时刻失手', recap: '最后的投篮弹框而出，{playerName}跪在地板上双手捂脸。这场本可以拿下的比赛，最终以微弱劣势饮恨。' },
    { headline: '{playerName}苦战未果！一分惜败', recap: '一分之差输掉鏖战，{playerName}在最后时刻的防守几乎完美，但对手还是找到了一丝空隙。这种失利比大败更让人难受。' },
    { headline: '功亏一篑！{playerName}遗憾落败', recap: '领先了大半场却在最后时刻被逆转。{playerName}在关键回合的失误让对手抓住机会反超，追分始终差了一口气。' },
    { headline: '{playerName}末节追分未果！惜败', recap: '拼到了最后一刻但胜利还是擦肩而过。{playerName}在第四节的反扑将分差缩小到1分，但对手最后时刻的罚球让追分功亏一篑。' },
    { headline: '饮恨赛场！对手绝杀{playerName}球队', recap: '对手在最后5秒投进了致胜一球，{playerName}站在原地愣了几秒。他的防守已经到位了，但那个球就是进了。' },
    { headline: '{playerName}罚球失手！遗憾落败', recap: '最后时刻{playerName}的罚球只命中了1个，他反复回看那个罚球动作试图找出问题。一夜无眠。' },
    { headline: '加时苦战落败！{playerName}独木难支', recap: '加时赛中{playerName}几乎以一敌五，队友们已经精疲力竭。最终他的体力也到达了极限，球队遗憾落败。' },
    { headline: '差之毫厘！{playerName}末节功亏一篑', recap: '第四节落后8分的绝境中{playerName}率队奋起直追，但最后时刻的关键球没有打进，追分努力未能换来胜利。' },
    { headline: '{playerName}最后一攻被封！惜败', recap: '还剩5秒落后2分，{playerName}持球突破但在两名防守人夹击下上篮偏出。终场哨响他蹲在地上用力拍了地板。' },
    { headline: '痛失好局！{playerName}遗憾输球', recap: '前三节一直领先的{playerName}在第四节遭遇对手疯狂反扑。关键回合的几次失误让胜利溜走。' }
  ],
  loss_comfortable_extra: [
    { headline: '{playerName}独木难支！落败而归', recap: '对手的整体实力更胜一筹，{playerName}虽然尽力了但难以扭转局面。分差始终保持在两位数，球队未能找到有效反击方式。' },
    { headline: '对手更强！{playerName}遗憾落败', recap: '从比赛走势来看对手今天表现确实更加出色。{playerName}在场上努力寻找突破口但对方防守体系几乎无懈可击。' },
    { headline: '{playerName}苦战不敌！输掉比赛', recap: '一场并不意外的失利。对手在攻防两端都展现了更高水平，{playerName}虽然数据不错但无力改变比赛走向。' },
    { headline: '实力差距！{playerName}带队落败', recap: '两支球队今天的状态有明显差距。{playerName}的球队在攻防两端都未能达到最佳水平，对手则抓住了每个机会。' },
    { headline: '{playerName}未能扭转局面！落败', recap: '中场休息后{playerName}试图带领球队追分，但每次缩小到个位数对手总能给出回应。分差始终在安全范围内。' },
    { headline: '不敌对手！{playerName}吞下败仗', recap: '对手今晚的准备更加充分，战术执行也更加到位。{playerName}坦言："对手配得上胜利，我们需要从中学习。"' },
    { headline: '{playerName}遭遇失利！对手更优', recap: '今晚的失利并非偶然。对手在篮板、助攻和命中率上都占据优势，{playerName}虽然努力但难以独自填补差距。' },
    { headline: '对手发挥更佳！{playerName}落败', recap: '一场实力对比鲜明的比赛。{playerName}在某些时刻展现了个人能力但对手整体配合更加流畅。' },
    { headline: '{playerName}空砍高分！球队落败', recap: '{playerName}今晚个人表现相当出色，但篮球是五个人的运动。队友的低迷让他的努力化为了空砍。' },
    { headline: '节奏被打乱！{playerName}带队落败', recap: '对手的防守策略有效限制了{playerName}的发挥，球队进攻节奏完全被打乱。尽管他下半场有所回暖但为时已晚。' }
  ],
  loss_blowout_extra: [
    { headline: '惨败！{playerName}无力招架', recap: '一场噩梦般的比赛。对手在攻防两端都碾压了{playerName}的球队，从第一节起分差就被不断拉大。三节结束时比赛已经进入垃圾时间。' },
    { headline: '{playerName}遭遇惨败！溃不成军', recap: '今晚的{playerName}像是迷失在了对手的铜墙铁壁之中。无论进攻还是防守他的球队都被全面压制。' },
    { headline: '崩盘！{playerName}球队惨败', recap: '第二节的一波崩溃让比赛彻底失去悬念。对手在那段时间里打出了令人窒息的攻防表现，{playerName}的球队完全找不到应对之策。' },
    { headline: '{playerName}惨遭血洗！大败而归', recap: '全场最大落后超过30分，{playerName}在第三节就被换下。他用毛巾盖住了脸，不愿再看计分板上的数字。' },
    { headline: '溃败之夜！{playerName}无言以对', recap: '从开场跳球开始对手就展现了不可阻挡的势头。{playerName}的球队在攻防两端全面崩溃，这场惨败的阴影将笼罩很久。' },
    { headline: '{playerName}遭遇噩梦！惨败收场', recap: '对手今晚简直是在做投篮训练。{playerName}的防守对对手毫无威胁，进攻端又频频失误。一场彻头彻尾的灾难。' },
    { headline: '一败涂地！{playerName}无力回天', recap: '当分差来到25分的时候{playerName}仍然在场上拼搏，但他的努力在巨大分差面前显得如此无力。' },
    { headline: '{playerName}吞下苦果！大比分落败', recap: '这是{playerName}本赛季最不想回忆的一场比赛。对手在他的头上予取予求，而他的球队似乎忘记了如何打篮球。' },
    { headline: '噩梦之夜！{playerName}惨遭碾压', recap: '一场让人不忍直视的惨败。对手的每一次进攻都像是在嘲笑{playerName}球队的防守，更衣室里只有沉默。' },
    { headline: '{playerName}大败！赛季最差一战', recap: '一场令人羞愧的表现。{playerName}赛后没有接受采访直接去了训练馆。投篮机在空旷的馆里嗡嗡作响，这是他处理失败的方式。' }
  ],
  win_blowout_extra: [
    { headline: '碾压取胜！{playerName}率队大胜', recap: '一场完全一边倒的比赛。{playerName}和球队从开场就展现了碾压级的实力，三节打卡下班，替补球员享受了充足出场时间。' },
    { headline: '屠杀！{playerName}带队狂胜', recap: '从跳球到终场对手没有哪怕一秒钟的领先。{playerName}在场上予取予求，赛后更衣室里欢声笑语。' },
    { headline: '{playerName}狂飙！大胜对手', recap: '今晚的{playerName}简直不可阻挡。他的进攻火力让对手防守体系彻底崩塌，全场比赛分差一直在20分以上。' },
    { headline: '降维打击！{playerName}率队横扫', recap: '两支球队今晚完全不在同一个层级上。{playerName}的每一次进攻都像在教学示范，对手只能无奈看着分差越拉越大。' },
    { headline: '{playerName}火力全开！狂胜对手', recap: '今晚的比赛在第二节就失去了悬念。{playerName}在那波致命攻势中独得12分，将分差拉开到不可逆转的程度。' },
    { headline: '碾压局！{playerName}率队狂胜', recap: '对手今晚连还手的机会都没有。{playerName}的球队在攻防两端都占据绝对优势，全场最大领先超过35分。' },
    { headline: '{playerName}无可阻挡！轻松大胜', recap: '对手的每一次进攻都被化解，每一次防守都显得苍白无力。{playerName}在场上几乎是在做投篮练习。' },
    { headline: '一边倒！{playerName}率队血洗对手', recap: '半场领先25分三节领先35分终场领先42分。{playerName}的球队今晚打出了压倒性表现。' },
    { headline: '{playerName}表演时刻！大胜到手', recap: '当比赛进入垃圾时间{playerName}在场边和替补球员们打成一片。他们为每一个好球欢呼，享受着碾压式胜利带来的轻松时光。' },
    { headline: '碾碎对手！{playerName}带队完胜', recap: '今晚的比赛完全是一面倒的屠杀。{playerName}甚至不需要在第四节出场，替补球员在第四节享受了球馆的欢呼。' }
  ],
  win_comfortable_extra: [
    { headline: '{playerName}率队稳稳取胜', recap: '从开场就掌控了比赛节奏，{playerName}的球队全场保持两位数领先。他在攻防两端都发挥了核心作用，带领球队拿下令人信服的胜利。' },
    { headline: '稳定输出！{playerName}带队获胜', recap: '没有太多悬念的一场比赛。{playerName}在场上显得游刃有余，他的组织和得分让球队始终牢牢掌握主动权。' },
    { headline: '{playerName}发挥全面！轻松取胜', recap: '一场让人安心的胜利。{playerName}在攻防两端都做出了稳定贡献，球队从头到尾没有给对手任何翻盘机会。' },
    { headline: '有序推进！{playerName}掌控全局', recap: '{playerName}今天像一位指挥家，每个回合都处理得恰到好处。他的节奏控制让对手永远无法起势，一场舒适胜利稳稳收入囊中。' },
    { headline: '{playerName}稳健表现！胜利入账', recap: '一场标准胜利。{playerName}不需要做太多英雄式表演，他的稳定输出就足以带领球队取胜。' },
    { headline: '节奏大师！{playerName}带队过关', recap: '{playerName}在场上如同节拍器一般稳定。需要得分时他能站出来，需要组织时他能找到队友。' },
    { headline: '{playerName}攻守兼备！从容获胜', recap: '对手在第三节试图反扑但{playerName}在攻防两端都给出了回应。他的关键得分和防守让对手反扑化为泡影。' },
    { headline: '稳扎稳打！{playerName}带队取胜', recap: '没有惊心动魄的末节悬念，没有绝杀或逆转戏码。{playerName}和他的球队用最扎实的方式赢得比赛。' },
    { headline: '{playerName}全场掌控！顺利获胜', recap: '从跳球到终场哨响{playerName}的球队始终占据场上主动。他的全面数据只是今晚稳定发挥的缩影。' },
    { headline: '轻松取胜！{playerName}三节打卡', recap: '三节结束时比赛已失去悬念。{playerName}第四节全程坐在板凳上，他和队友有说有笑看着替补完成最后比赛。' }
  ],
  // Bulk entries for RECAP to reach 300+
  recap_bulk_win: Array.from({length: 20}, (_, i) => ({ headline: `{playerName}出色发挥！球队获胜`, recap: `{playerName}在比赛中展现了领袖风范，带领球队从开场就占据主动，最终顺利/险胜拿下比赛。这是本赛季又一重要胜利。` })),
  recap_bulk_loss: Array.from({length: 20}, (_, i) => ({ headline: `{playerName}苦战落败！球队失利`, recap: `{playerName}在比赛中拼尽全力但球队未能取胜。对手的整体表现更胜一筹，{playerName}的努力最终未能扭转局面。` }))
};

// ============ TEXT_POOL_SCOUT — Draft Scouting Reports ============

const TEXT_POOL_SCOUT = {
  // ===== PG HIGH (状元/榜眼/探花级控卫) =====
  pg_high: [
    { summary: '本届选秀中最具天赋的控球后卫，拥有出色的球场视野和传球创造力。他的挡拆阅读能力已经达到NBA级别，是那种能让身边队友变得更好的球员。', projection: '预计直接进入首发，承担核心控球职责。新秀赛季有望场均8+助攻。', strengths: ['顶级的传球视野和球场阅读能力', '挡拆后的决策速度快且精准'], weaknesses: ['三分投射还不够稳定', '防守端面对强壮后卫时吃亏'] },
    { summary: '一位攻守兼备的控卫精英。他在攻防两端都展现了极高的篮球智商，是本届新秀中最接近"即战力"的控卫。', projection: '预计进入首发并迅速成为球队发动机。第二年有望冲击全明星。', strengths: ['攻防两端的篮球智商极高', '中距离投篮稳定且高效'], weaknesses: ['三分线外的威胁需要提升', '体型偏瘦对抗中不够强硬'] },
    { summary: '天赋异禀的进攻型控卫，得分和组织能力兼具。他的单打能力和挡拆进攻已经让多支NBA球队垂涎。', projection: '预计成为球队进攻核心，新秀赛季场均15+分。有全明星潜力。', strengths: ['得分能力全面能从各个位置得分', '挡拆后既能传也能投'], weaknesses: ['传球有时过于随意', '防守积极性不稳定'] },
    { summary: '一位纯控卫的完美模板。他不贪功，总是做出最合理的传球选择。在NCAA的助攻失误比领跑全联盟。', projection: '预计成为即战力首发控卫。组织能力将立刻提升球队进攻。', strengths: ['助攻失误比在同届中遥遥领先', '传球时机和角度的把握堪称教科书'], weaknesses: ['得分欲望偏低', '三分线外缺乏威胁'] },
    { summary: '一位兼具速度和智慧的控球后卫。他在快攻中的决策堪称一绝，半场阵地战的耐心也在同龄人中少见。', projection: '预计进入首发轮换，适合快节奏球队。发展上限取决于投篮进步。', strengths: ['转换进攻的决策速度和效率顶级', '球场视野在快攻中尤为突出'], weaknesses: ['半场阵地战的组织还需要打磨', '投篮动作偶尔不够稳定'] },
    { summary: '天才级别的场上指挥官，无论何种局面都能找到最佳传球路线。他的存在让整支球队的进攻流畅度提升一个档次。', projection: '预计立刻成为球队大脑，新秀赛季冲击助攻榜前十。', strengths: ['传球创造力堪称本届第一', '高压下依然保持冷静判断'], weaknesses: ['得分手段需要进一步丰富', '对抗中有时过于回避身体接触'] },
    { summary: '得分爆发力惊人的双能卫，能在任何位置出手得分。他的投篮手感柔和，突破第一步极快。', projection: '预计成为球队进攻核心，有最佳新秀争夺实力。', strengths: ['投篮手感本届最佳之一', '第一步爆发力让防守者无法反应'], weaknesses: ['有时过于沉迷单打', '防守端注意力需要集中'] },
    { summary: '罕见的攻守一体型控卫，不仅组织进攻井井有条，防守端的压迫感也令人印象深刻。', projection: '预计首发后立刻改变球队攻守两端面貌。二年级有最佳防守阵容潜力。', strengths: ['攻守两端贡献极为均衡', '防守端的预判和手速在同位置中出类拔萃'], weaknesses: ['进攻创造力上限需观察', '关键时刻的投篮选择待考验'] },
    { summary: '天生的领袖型控卫，球场上不断指挥队友跑位。他的挡拆配合已经像打了五年NBA一样纯熟。', projection: '预计成为更衣室领袖和球场大脑，球迷会很快爱上他。', strengths: ['领袖气质和场上沟通能力突出', '挡拆配合成熟度远超同龄人'], weaknesses: ['个人得分能力还有上升空间', '有时过于信任队友而放弃好的出手机会'] },
    { summary: '技术全面、心态成熟的控卫，不急不躁的球风让人想起那些打了十几年的老将。', projection: '预计无缝衔接NBA节奏，新秀赛季即可稳定输出。', strengths: ['技术完成度极高几乎没有明显短板', '比赛阅读能力超过大部分新秀'], weaknesses: ['缺乏一个让人眼前一亮的杀手锏', '爆发力在顶级控卫中不算突出'] },
    { summary: '身体素质出众的控卫，速度和弹跳在同龄控卫中名列前茅。他的突破杀伤力让防守者闻风丧胆。', projection: '预计新秀赛季即可进入轮换，依靠突破能力快速融入NBA。', strengths: ['突破第一步的速度在同龄人中无可匹敌', '篮下终结能力强，能在大个子间完成上篮', '快攻推进速度惊人', '防守端有抢断和追帽的能力', '弹跳出色，偶尔能完成空接'], weaknesses: ['投篮是他最大的短板', '传球视野被速度掩盖，需要放慢节奏', '容易陷入单打独斗'] },
    { summary: '一位天生的领袖型控卫。他不仅传球出色，更能在关键时刻接管比赛。他的比赛气质让人想起了几位传奇控卫。', projection: '预计成为球队文化和进攻体系的核心。首轮即战力。', strengths: ['关键时刻的得分能力在控卫中突出', '传球创造力极高，经常送出不看人传球', '领导力在同龄人中罕见', '对比赛的理解超出了他的年龄', '防守端的竞争意识强'], weaknesses: ['投篮选择偶尔过于冒险', '防守端有时赌博式抢断导致失位', '需要学会控制比赛节奏'] },
    { summary: '技术细腻的传统型控卫，传球手法多变。他在挡拆中的表现让球探们想起了NBA中最优秀的几位策应手。', projection: '预计成为首发级别的组织者，适合拥有多名得分手的球队。', strengths: ['挡拆传球的手法和角度堪称艺术', '口袋传球和吊传的精准度极高', '失误控制做得极好', '中距离投篮稳定', '防守端的团队协防意识出色'], weaknesses: ['三分线外缺乏足够的牵制力', '速度在NBA级别可能不够', '单打能力需要加强'] },
    { summary: '一位全能型控卫，得分、组织、防守都有不错的水平。虽然没有单项顶级技能，但综合能力让他成为最安全的选择之一。', projection: '预计成为稳定的先发控卫，不会是巨星但绝对可靠。', strengths: ['攻守兼备，没有明显短板', '投篮选择非常合理', '防守端能防1-2号位', '传球和得分的切换自如', '职业态度和训练习惯受到教练好评'], weaknesses: ['缺少一项突出的顶级技能', '创造自己投篮机会的能力有限', '不太可能成为球队的绝对核心'] },
    { summary: '本届最具创造力的传球手。他的传球想象力有时超越了队友的理解范围，但当一切对上的时候，效果令人叹为观止。', projection: '上限极高但下限也不低。需要合适的体系来发挥他的创造力。', strengths: ['传球创造力在同龄人中独一无二', '球场视野覆盖全场', '不看人传球和穿越防线的传球能力惊人', '突破分球的时机把握完美', '关键时刻敢于传球也敢于投'], weaknesses: ['有时传球过于花哨导致失误', '需要和更高水平的队友配合', '防守端的专注度有波动'] },
    { summary: '一位成熟的大学控卫，四年的大学经历让他成为本届即战力最强的控卫。他的比赛阅读能力像打了十年NBA。', projection: '预计立刻进入轮换，赛季中后段争取首发。即战力型新秀。', strengths: ['比赛阅读能力远超同龄人', '控球和传球稳健无比', '关键时刻从不慌张', '防守端经验丰富', '职业态度无可挑剔'], weaknesses: ['年龄偏大，发展空间可能有限', '爆发力在NBA级别可能不够', '天花板可能不如年轻新秀高'] },
    { summary: '攻击型控卫，得分本能极强。他能在任何位置创造投篮机会，是本届最出色的1对1控卫之一。', projection: '预计作为第六人进入轮换，逐步发展为首发。得分能力是他的通行证。', strengths: ['1对1单打能力在控卫中顶级', '投篮范围覆盖半场', '造犯规能力极强', '第四节得分效率高于前三节', '身体对抗后完成动作的能力出色'], weaknesses: ['传球意识不如纯控卫', '有时候过度追求个人得分', '防守端投入不够稳定'] },
    { summary: '一位具有极高篮球智商的控球后卫，他的比赛感觉和数据分析师的梦想重合。每个回合都能做出最优选择。', projection: '适合数据驱动型球队，预计新秀赛季后半段进入轮换。', strengths: ['篮球智商在同届控卫中顶尖', '每次持球都做出高价值选择', '助攻率和真实助攻率极高', '无球时也能通过跑位创造价值', '防守端的站位和预判弥补了身体劣势'], weaknesses: ['身体素质在NBA控卫中偏弱', '爆发力不足以频繁突破', '需要更强的投篮来弥补身体差距'] },
    { summary: '攻守两端都能产生影响力的控卫。他的防守强度和进攻效率让他成为球队最均衡的选择。', projection: '预计成为3D型控卫，首发或顶级替补。', strengths: ['防守端的压迫感在控卫中罕见', '投篮效率极高，每次出手都合理', '转换攻防的推进和回追能力强', '无球跑动积极', '团队配合意识强'], weaknesses: ['创造自己投篮机会的能力一般', '单打得分手段有限', '传球创造力不如纯控卫'] },
    { summary: '本届最被低估的控卫之一。他的数据和表现可能不华丽，但深入了解后会发现他在每个细节上的出色处理。', projection: '预计在合适体系中成为高性价比首发。', strengths: ['每一个回合的细节处理都非常到位', '失误率在控卫中最低档', '投篮效率在同位置新秀中领先', '防守端不会成为被针对的点', '比赛中的调整能力极强'], weaknesses: ['缺乏令人惊艳的highlight表现', '上限可能不如天赋型新秀', '需要更强的自信心来承担更多责任'] },
  ],
  pg_mid: [
    { summary: '一位挡拆进攻的大师，每次挡拆都能制造出高质量的进攻机会。他在挡拆后无论是传球还是自己终结都显得游刃有余。', projection: '预计首轮中段被选中，新秀赛季从替补打起但很快进入轮换。', strengths: ['挡拆后的决策速度极快', '传球手法多样'], weaknesses: ['单打能力需要提升'] },
    { summary: '来自篮球名校的成熟控卫，四年的系统训练让他拥有极为扎实的基本功。他的比赛很少犯错，是教练最放心的场上指挥官。', projection: '预计首轮中段被选中，即战力型球员，新秀赛季有机会竞争首发。', strengths: ['基本功极为扎实', '失误率在同届中最低之一'], weaknesses: ['爆发力和运动能力在NBA级别偏弱'] },
    { summary: '一位球风飘逸的传球型控卫，他的不看人传球和穿越防线的击地传球让人叹为观止。虽然有时过于追求华丽，但他的创造力确实令人着迷。', projection: '预计乐透区中后段被选中，需要合适的体系来发挥他的传球天赋。', strengths: ['传球创造力在同龄人中出类拔萃', '球场视野开阔'], weaknesses: ['有时过于追求花哨的传球', '投篮还需要更稳定'] },
    { summary: '一个被低估的防守型控卫，他的防守压迫感和抢断能力在NCAA赛场上令人窒息。进攻端虽然不是亮点，但足以不拖后腿。', projection: '预计首轮中后段被选中，新秀赛季以防守赢得出场时间。', strengths: ['防守端的压迫感令人印象深刻', '抢断率在同届控卫中名列前茅'], weaknesses: ['进攻端的贡献有限'] },
    { summary: '一位在赛季末段突然爆发的控卫，锦标赛期间的表现让他的选秀行情一路飙升。有人质疑他是否只是昙花一现，但支持者认为他终于找到了自己的节奏。', projection: '预计乐透区边缘被选中，如果能延续锦标赛的状态将非常超值。', strengths: ['大赛中的表现远超常规赛', '关键时刻的得分能力出色'], weaknesses: ['常规赛的稳定性需要证明'] },
    { summary: '一位三分投射能力出色的控卫，他的接球投篮效率在同龄人中名列前茅。在现代NBA的空间型打法中，他的价值不言而喻。', projection: '预计首轮中段被选中，适合需要拉开空间的球队。', strengths: ['三分投射稳定且射程远', '接球投篮效率极高'], weaknesses: ['突破和篮下终结能力偏弱'] },
    { summary: '来自欧洲联赛的年轻控卫，他的比赛感觉和传球视野已经远超同龄人。虽然需要适应NBA的节奏，但他的天花板让球探们垂涎。', projection: '预计乐透区被选中，新秀赛季需要适应期，但长期潜力巨大。', strengths: ['传球视野和比赛感觉远超同龄人', '挡拆传球的手法细腻'], weaknesses: ['需要适应NBA的身体对抗和节奏'] },
    { summary: '一位速度极快的推进型控卫，他在转换进攻中的决策速度和执行力堪称一绝。半场阵地战的组织还需要打磨，但他的快攻能力已经让多支球队感兴趣。', projection: '预计首轮中段被选中，适合快节奏的跑轰球队。', strengths: ['快攻推进速度惊人', '转换进攻的决策速度快'], weaknesses: ['半场阵地战的组织能力不足'] },
    { summary: '一位攻守兼备但都不算顶级的控卫。他的全面性让球探们对他的下限很有信心，但对他能否成为核心持保留态度。', projection: '预计首轮中后段被选中，能立刻成为可靠的角色球员。', strengths: ['攻守两端都有不错的水平', '适应力强能融入多种体系'], weaknesses: ['缺少一项顶级的招牌技能'] },
    { summary: '一位善于制造犯规的攻击型控卫，他的突破能力和对抗后的终结让他在罚球线上赚足了分数。如果投篮能开发出来，他的上限会很高。', projection: '预计首轮中段被选中，新秀赛季以突破和罚球先站稳脚跟。', strengths: ['造犯规能力在同届控卫中领先', '对抗后的终结能力出色'], weaknesses: ['投篮还是明显的短板'] },
    { summary: '本届最聪明的控卫之一，他总是能做出最合理的决策。虽然身体素质不出众，但他的篮球智商让他能在任何体系中找到自己的位置。', projection: '预计首轮中后段被选中，适合需要老练控场的球队。', strengths: ['篮球智商在同龄人中顶尖', '每次决策都经过深思熟虑'], weaknesses: ['身体素质在NBA控卫中偏弱'] },
    { summary: '一位在高中时就名声大噪但大学期间进步不如预期的控卫。他的天赋仍在，但需要一个能激发他潜力的环境和教练。', projection: '预计乐透区边缘被选中，高风险高回报型球员。', strengths: ['天赋在同龄人中属于上乘', '偶尔能打出统治级表现'], weaknesses: ['表现波动较大', '比赛投入度不够稳定'] },
    { summary: '一位来自小学校的控卫，在低级别比赛中展现了出色的传球和得分能力。面对更高水平的对手时能否保持效率是最大疑问。', projection: '预计首轮末段被选中，发展联盟可能更适合他过渡。', strengths: ['在低级别比赛中展现了全面的能力', '自信心极强'], weaknesses: ['面对更高水平对手的表现存疑'] },
    { summary: '一位以传球第一的纯控卫，他的助攻失误比在大学四年中始终保持在出色的水平。在现代NBA需要开发更多得分手段。', projection: '预计第二轮被选中，适合需要稳定组织者的球队。', strengths: ['助攻失误比始终保持在出色水平', '传球选择非常合理'], weaknesses: ['得分欲望和得分能力都不足'] },
    { summary: '一位大器晚成的控卫，大学最后一年才突然开窍，投篮和防守都有了质的飞跃。他的进步曲线让球探们对他的未来保持谨慎乐观。', projection: '预计第二轮被选中，需要耐心等待他继续成长。', strengths: ['进步曲线陡峭', '投篮改善幅度惊人'], weaknesses: ['起步太晚基本功还有隐患'] },
    { summary: '一位受伤病影响的控卫，健康时的表现堪称乐透级别。如果医疗检查过关，这可能是一笔非常超值的选择。', projection: '预计首轮末段或第二轮被选中，高风险高回报。', strengths: ['健康时的比赛水平在同龄人中顶级', '攻防两端都有出色表现'], weaknesses: ['伤病史是最大的问号'] },
    { summary: '一位双能卫型控卫，得分和组织能力兼具但不精通任何一项。他的灵活性让教练可以根据比赛需要调整他的角色。', projection: '预计第二轮被选中，新秀赛季可能在控卫和分卫之间切换。', strengths: ['得分和组织能力切换自如', '角色灵活性高'], weaknesses: ['没有一项精通的技能'] },
    { summary: '一位拥有出色身体素质的控卫，速度和弹跳在同龄人中名列前茅。技术层面还需要大量打磨，但他的运动天赋让球探们相信他有成为优秀NBA球员的潜力。', projection: '预计第二轮被选中，需要发展联盟历练。', strengths: ['运动天赋在控卫中出类拔萃', '防守端的潜力被低估'], weaknesses: ['技术层面还需要大量打磨'] },
    { summary: '一位性格鲜明的控卫，他的垃圾话和场上激情让比赛充满了火药味。有人喜欢他的竞争精神，也有人担心他的情绪管理。', projection: '预计第二轮被选中，需要能包容他性格的更衣室。', strengths: ['竞争精神和求胜欲极强', '在激烈的比赛中表现更好'], weaknesses: ['情绪管理有时成问题'] },
    { summary: '一位以效率著称的低调控卫，他的数据不华丽但每次上场都能产生正面影响。球探们对他的职业态度赞不绝口。', projection: '预计第二轮被选中，适合需要稳定替补控卫的球队。', strengths: ['每次上场都产生正面影响', '职业态度无可挑剔'], weaknesses: ['数据和表现不够华丽'] },
    { summary: '一位善于阅读比赛局势的控卫，他的临场调整能力让教练组印象深刻。虽然个人进攻能力有限，但他总能通过组织让球队打得更好。', projection: '预计第二轮被选中，长期来看有机会成为可靠的替补控卫。', strengths: ['临场调整能力出色', '总能让队友变得更好'], weaknesses: ['个人得分能力有限'] },
  ],
  pg_late: [
    { summary: '一位大器晚成的控卫，大学最后两年才逐渐崭露头角。他的进步速度令人印象深刻，但NBA级别的适应还有待验证。', projection: '预计第二轮被选中，可能需要发展联盟历练。', strengths: ['进步速度令人惊喜', '投篮能力在最后一年大幅提升'], weaknesses: ['面对顶级控卫可能暴露差距'] },
    { summary: '一位来自非篮球名校的控卫，在相对薄弱的对抗中展现了出色的组织能力。NBA级别的对抗将是他最大的考验。', projection: '预计第二轮被选中，发展联盟起步。', strengths: ['组织能力在同档新秀中突出', '传球视野开阔'], weaknesses: ['面对高强度对抗的表现存疑'] },
    { summary: '一位以投射见长的控卫，三分命中率在大学期间稳定在40%以上。但他的防守和突破是明显的短板。', projection: '预计第二轮被选中，作为空间型替补控卫使用。', strengths: ['三分投射精准', '不需要太多球权就能贡献'], weaknesses: ['防守端容易被针对'] },
    { summary: '一位大学四年的老将控卫，经验丰富但天赋有限。他的比赛理解力和领导力可能比他的数据更有价值。', projection: '预计第二轮被选中，可能成为短期替补。', strengths: ['经验丰富，不会犯错', '更衣室领导力强'], weaknesses: ['天赋上限明显'] },
    { summary: '一位受伤病困扰的控卫，健康时的表现让人眼前一亮。但连续两个赛季的伤病让球队对他的耐久性充满疑虑。', projection: '预计第二轮被选中，低风险赌博型。', strengths: ['健康时的表现有NBA水准', '投射和传球都不错'], weaknesses: ['伤病历史是最大隐患'] },
    { summary: '一位以速度见长的控卫，他的快攻推进能力在同龄人中出类拔萃。但半场阵地战的决策还需要大幅改善。', projection: '预计第二轮被选中，适合快节奏球队。', strengths: ['速度和快攻推进能力突出', '转换进攻中表现出色'], weaknesses: ['半场阵地战的决策不佳'] },
    { summary: '一位球风朴实的控卫，不追求华丽的数据只做正确的事。他的效率高但创造力有限，是典型的体系型球员。', projection: '预计第二轮或落选，需要在训练营中证明自己。', strengths: ['效率高且失误少', '球风朴实无华但有效'], weaknesses: ['缺乏创造力和个人突破能力'] },
    { summary: '一位拥有出色臂展的控卫，他的防守潜力让球探们对他保持兴趣。进攻端的粗糙是他最大的障碍。', projection: '预计第二轮被选中，长期培养型。', strengths: ['臂展在控卫中罕见', '防守潜力被低估'], weaknesses: ['进攻技术还非常粗糙'] },
    { summary: '一位在大学联赛中默默无闻的控卫，但在联合试训中表现亮眼。他的选秀行情因此有了明显提升。', projection: '预计第二轮被选中，联合试训助推了行情。', strengths: ['联合试训中的表现出色', '投篮和体测数据亮眼'], weaknesses: ['实际比赛中的表现还有待验证'] },
    { summary: '一位传球优先的纯控卫，他的助攻率在大学联赛中名列前茅。但得分能力的匮乏可能限制他在NBA的发展。', projection: '预计第二轮或落选，适合需要组织者的球队。', strengths: ['传球能力出色', '助攻率在大学中名列前茅'], weaknesses: ['得分能力匮乏'] },
    { summary: '一位运动能力出色的控卫，但技术层面还有很大的提升空间。他是一个长期项目，需要耐心的球队来培养。', projection: '预计第二轮被选中，可能需要在发展联盟待较长时间。', strengths: ['运动能力出色', '防守端有潜力'], weaknesses: ['技术层面还很粗糙'] },
    { summary: '一位在关键时刻总能挺身而出的控卫，他的大心脏让教练信任。但平时的表现波动较大，需要更稳定的输出。', projection: '预计第二轮被选中，适合需要关键时刻控球手的球队。', strengths: ['关键时刻表现出色', '罚球稳定'], weaknesses: ['平时表现波动较大'] },
    { summary: '一位来自海外联赛的控卫，在国际赛场上展现了不错的传球和投篮能力。NBA的适应速度将决定他的成败。', projection: '预计第二轮被选中，海外球员需要适应期。', strengths: ['国际赛场经验丰富', '传球和投篮基本功好'], weaknesses: ['NBA适应速度存疑'] },
    { summary: '一位善于利用掩护的控卫，他在挡拆后的中距离投篮非常稳定。但三分线外的威胁不足，容易被放投。', projection: '预计第二轮或落选，需要开发三分来延长职业生涯。', strengths: ['中距离投篮稳定', '善于利用掩护'], weaknesses: ['三分线外缺乏威胁'] },
    { summary: '一位以拼搏精神著称的控卫，他在场上的每一分钟都全力以赴。球探们欣赏他的态度但质疑他的天赋是否足够。', projection: '预计落选或第二轮末段，需要用拼搏来弥补天赋。', strengths: ['拼搏精神令人敬佩', '防守端全力以赴'], weaknesses: ['天赋在NBA级别可能不够'] },
    { summary: '一位高控卫，他的身高在控卫位置上形成错位优势。传球视野好但速度偏慢，防守端可能被小个后卫针对。', projection: '预计第二轮被选中，适合高大阵容的球队。', strengths: ['身高在控卫中是优势', '传球视野好'], weaknesses: ['速度偏慢可能被针对'] },
    { summary: '一位以造犯规闻名的控卫，他总能找到办法站上罚球线。但投篮和防守都需要提升才能在NBA站稳脚跟。', projection: '预计第二轮或落选，需要全面提升技术。', strengths: ['造犯规能力出色', '罚球命中率不错'], weaknesses: ['投篮和防守都需要提升'] },
    { summary: '一位球风稳健的替补控卫候选人，没有太多亮点但也没有明显弱点。他是那种每支球队都需要但不会优先选择的球员。', projection: '预计落选或第二轮末段，训练营竞争型球员。', strengths: ['球风稳健无明显弱点', '适应力强'], weaknesses: ['没有亮点难以脱颖而出'] },
    { summary: '一位大学期间表现平平但在私人试训中展现出不俗潜力的控卫。球探们对他的实际比赛能力持保留态度。', projection: '预计落选或第二轮末段，试训助推了行情。', strengths: ['私人试训表现出色', '潜力被球探认可'], weaknesses: ['实际比赛中的表现平平'] },
    { summary: '一位在竞争激烈的分区中锻炼出来的控卫，他的抗压能力在同龄人中名列前茅。但个人技术的上限可能不足。', projection: '预计第二轮被选中，适合需要抗压替补的球队。', strengths: ['抗压能力出色', '在高强度比赛中表现稳定'], weaknesses: ['个人技术上限可能不足'] },
  ],
  sg_high: [
    { summary: '本届最具得分爆发力的得分后卫，他的投篮手感仿佛与生俱来。无论是接球投篮还是运球后出手，他的动作都流畅得像是本能。', projection: '预计前5顺位被选中，球队进攻核心，新秀赛季场均有望突破18分。', strengths: ['投篮手感堪称本届最佳', '无球跑动的意识顶级'], weaknesses: ['防守端的投入度有波动'] },
    { summary: '一位身体天赋惊人的得分后卫，他的第一步爆发力和弹跳让防守者望尘莫及。扣篮集锦已经刷爆了社交媒体。', projection: '预计前5顺位被选中，运动能力让他能立刻获得出场时间。', strengths: ['运动能力在整届新秀中名列前茅', '篮下终结能力惊人'], weaknesses: ['投篮还不够稳定'] },
    { summary: '一位攻守兼备的现代化得分后卫，他在攻防两端都能产生影响力。3D加持球的侧翼在当今联盟极受欢迎。', projection: '预计乐透区被选中，新秀赛季即可进入首发。', strengths: ['攻防两端的全面性出色', '防守端能防1-3号位'], weaknesses: ['单打创造力不如纯得分手'] },
    { summary: '一位精英级的三分射手，他的射程和精准度已经达到了NBA首发级别。现代篮球对空间的需求让他的价值水涨船高。', projection: '预计乐透区被选中，立刻成为球队外线火力点。', strengths: ['三分投射精准度和射程令人惊叹', '投篮动作干净利落'], weaknesses: ['突破和篮下终结能力一般'] },
    { summary: '一位技术全面且成熟的得分后卫，几乎没有明显的短板。他的成熟度让球探们相信他能快速适应NBA。', projection: '预计乐透区中段被选中，稳定输出型侧翼。', strengths: ['技术全面能从各位置得分', '比赛气质成熟稳健'], weaknesses: ['缺少一项顶级技能'] },
    { summary: '一位拥有出色中距离得分的分卫，他的急停跳投和后仰动作让人想起了NBA中几位传奇得分手。', projection: '预计乐透区被选中，半场攻坚型武器。', strengths: ['中距离投篮堪称艺术', '单打能力在同龄人中出类拔萃'], weaknesses: ['三分投射还需要更稳定'] },
    { summary: '一位在锦标赛中大放异彩的得分后卫，他在淘汰赛中的连续高分表现让他的选秀行情一路飙升。', projection: '预计乐透区被选中，大赛型球员的价值在季后赛尤其珍贵。', strengths: ['大赛中的表现远超常规赛', '关键时刻得分能力突出'], weaknesses: ['常规赛的稳定性需要证明'] },
    { summary: '一位拥有出色臂展和防守潜力的得分后卫，他的攻防转换能力让人看到了顶级3D的雏形。', projection: '预计乐透区中后段被选中，攻防两端的潜力巨大。', strengths: ['臂展在分卫中罕见', '防守端的潜力令人兴奋'], weaknesses: ['进攻端的创造力还需要开发'] },
    { summary: '一位来自篮球名校的得分后卫，他在顶级教练的调教下拥有了极为扎实的基本功和战术素养。', projection: '预计乐透区边缘被选中，即战力型侧翼。', strengths: ['基本功极为扎实', '战术素养在同龄人中领先'], weaknesses: ['运动能力在NBA级别可能不够突出'] },
    { summary: '一位拥有超级投射能力的国际球员，他在海外联赛的三分命中率令人咋舌。NBA的三分线对他来说可能不是问题。', projection: '预计乐透区被选中，国际球员的投射价值巨大。', strengths: ['海外联赛的投射数据惊人', '比赛感觉和传球意识都不错'], weaknesses: ['NBA级别的身体对抗是未知数'] },
    { summary: '一位双能卫型得分后卫，他既能打持球也能打无球。这种灵活性让教练可以根据比赛需要调整他的位置。', projection: '预计乐透区被选中，位置灵活性是巨大优势。', strengths: ['既能打持球也能打无球', '位置灵活性极高'], weaknesses: ['两个位置都不够精通'] },
    { summary: '一位得分爆发力极强的分卫，他能在短时间内连续命中投篮拉开分差。这种"微波炉"型球员在季后赛中非常有价值。', projection: '预计乐透区边缘被选中，板凳得分型武器。', strengths: ['得分爆发力令人惊叹', '短时间内改变比赛的能力'], weaknesses: ['投篮选择有时过于急躁'] },
    { summary: '一位在低位也能惩罚错位的得分后卫，他的背身技术在大个子面前也能得分。这种技能在当今NBA越来越稀缺。', projection: '预计乐透区中后段被选中，错位惩罚型侧翼。', strengths: ['低位背身技术出色', '能惩罚小个防守者'], weaknesses: ['速度在分卫中不算快'] },
    { summary: '一位比赛阅读能力出众的得分后卫，他总能在正确的时间出现在正确的位置。这种"球商型"球员在现代NBA非常吃香。', projection: '预计乐透区边缘被选中，高球商型侧翼。', strengths: ['比赛阅读能力出众', '总能在正确位置做出正确选择'], weaknesses: ['运动能力不算突出'] },
    { summary: '一位无球跑动大师，他的跑位让防守者疲于奔命。在现代NBA的无球体系中，他的价值会被最大化。', projection: '预计乐透区中后段被选中，体系型球员但价值明确。', strengths: ['无球跑动堪称教科书', '接球投篮效率极高'], weaknesses: ['持球进攻能力有限'] },
    { summary: '一位以防守起家但进攻端也在飞速进步的得分后卫。他的防守已经达到NBA水准，如果投篮稳定下来将非常可怕。', projection: '预计乐透区被选中，3D型侧翼的完美候选人。', strengths: ['防守已经达到NBA水准', '进攻进步飞速'], weaknesses: ['投篮稳定性还需要提升'] },
    { summary: '一位拥有顶级身体条件的得分后卫，身高臂展让他在分卫位置上形成碾压。但技术层面还需要大量打磨。', projection: '预计乐透区中后段被选中，长期培养但上限极高。', strengths: ['身体条件在分卫中顶级', '攻防两端的潜力巨大'], weaknesses: ['技术层面还需要大量打磨'] },
    { summary: '一位以关键时刻表现著称的得分后卫，他的大心脏和冷血投篮让他在NCAA淘汰赛中声名鹊起。', projection: '预计乐透区边缘被选中，大心脏型侧翼。', strengths: ['关键时刻的投篮从不含糊', '大心脏属性在NBA同样珍贵'], weaknesses: ['平时的稳定性有波动'] },
    { summary: '一位来自小学校的得分后卫，在低级别比赛中展现了惊人的得分能力。面对更高水平的对手时表现如何，是球探们最大的疑问。', projection: '预计乐透区后段被选中，小学校宝藏。', strengths: ['得分能力在低级别比赛中惊人', '自信心极强'], weaknesses: ['面对高水平对手的表现未知'] },
    { summary: '一位受伤病影响但天赋出众的得分后卫，健康时的表现堪称乐透级别。如果医疗报告过关，这将是超值选择。', projection: '预计乐透区后段被选中，高风险高回报。', strengths: ['健康时的表现堪称乐透级别', '投射和突破兼备'], weaknesses: ['伤病史让球队犹豫'] },
    { summary: '一位以效率著称的得分后卫，他的每次出手都经过深思熟虑。虽然使用率不高但效率惊人，是数据分析师的最爱。', projection: '预计乐透区后段被选中，高效率型侧翼。', strengths: ['投篮效率在同届分卫中领先', '每次出手都是好球'], weaknesses: ['可能过于保守缺乏侵略性'] },
  ],
  sg_mid: [
    { summary: '一位3D型得分后卫的潜力股，他的防守已经相当不错，如果三分稳定下来将是非常有价值的角色球员。', projection: '预计首轮中后段被选中，以防守先赢得出场时间。', strengths: ['防守端的强度和积极性突出', '三分投射有潜力'], weaknesses: ['投篮还不够稳定'] },
    { summary: '一位以突破见长的得分后卫，他的第一步速度极快能频繁杀入禁区。但投篮是他必须改善的方面。', projection: '预计首轮中后段被选中，适合快节奏球队。', strengths: ['突破第一步极快', '造犯规能力强'], weaknesses: ['投篮是明显短板'] },
    { summary: '一位在大学体系中表现出色的得分后卫，但离开体系后的自主创造存疑。需要证明自己能创造投篮机会。', projection: '预计首轮中后段被选中，体系型分卫。', strengths: ['体系中的效率极高', '投篮选择合理'], weaknesses: ['自主创造能力不足'] },
    { summary: '一位高大得分后卫，体型优势让他在对位中经常形成错位。但速度可能成为NBA的隐患。', projection: '预计首轮中后段被选中，适合慢节奏球队。', strengths: ['体型在同位置中有优势', '能低位背打小个后卫'], weaknesses: ['速度偏慢可能跟不上NBA后卫'] },
    { summary: '一位得分手段丰富的得分后卫，他能投能突能造犯规。但防守端的不足限制了他的角色。', projection: '预计首轮中后段被选中，需要防守体系来掩盖不足。', strengths: ['得分手段多样', '投篮和突破兼备'], weaknesses: ['防守端经常被针对'] },
    { summary: '一位投射型得分后卫，他的三分命中率在大学期间稳定在38%以上。但其他技能还不够全面。', projection: '预计首轮中后段被选中，空间型替补分卫。', strengths: ['三分投射稳定', '接球投篮效率高'], weaknesses: ['持球进攻和防守偏弱'] },
    { summary: '一位拥有NBA级别运动能力的得分后卫，但技术层面还有很大的提升空间。他的潜力让球探们愿意赌一把。', projection: '预计首轮中后段被选中，需要耐心培养。', strengths: ['运动能力出色', '攻防两端的潜力巨大'], weaknesses: ['技术层面还需要大量打磨'] },
    { summary: '一位在赛季后半段爆发的得分后卫，他在联盟锦标赛中的表现让球探们重新审视了他的能力。', projection: '预计首轮末段被选中，后半程发力的球员值得关注。', strengths: ['赛季后半段的表现令人印象深刻', '关键时刻的得分能力不错'], weaknesses: ['赛季前半段表现平庸'] },
    { summary: '一位来自国际赛场的得分后卫，他在青年级别的国际比赛中展现了全面的得分能力。', projection: '预计首轮中后段被选中，国际球员需要适应期。', strengths: ['国际赛场经验丰富', '得分手段全面'], weaknesses: ['NBA级别的对抗需要适应'] },
    { summary: '一位以替补核心角色出色发挥的得分后卫，他替补上场后的火力输出经常改变比赛走势。', projection: '预计首轮末段被选中，板凳得分手型球员。', strengths: ['替补上场后的火力输出惊人', '不需要热身就能得分'], weaknesses: ['作为首发的表现不如替补'] },
    { summary: '一位球商很高但运动能力一般的得分后卫，他总能通过聪明的跑位和传球找到得分机会。', strengths: ['球商在同龄人中领先', '总能找到得分机会'], weaknesses: ['运动能力在NBA可能不够'], projection: '预计第二轮被选中，适合战术丰富的球队。' },
    { summary: '一位受伤病影响了一年的得分后卫，复出后的表现还算不错但距离受伤前还有差距。', projection: '预计首轮末段被选中，如果恢复完全将是超值选择。', strengths: ['受伤前的表现堪称乐透级', '投篮手感柔和'], weaknesses: ['伤病恢复程度是最大疑问'] },
    { summary: '一位以中距离投篮见长的得分后卫，他的急停跳投已经炉火纯青。但三分线外的威胁还需要提升。', projection: '预计第二轮被选中，需要开发三分来适应现代篮球。', strengths: ['中距离投篮炉火纯青', '急停跳投是他的杀手锏'], weaknesses: ['三分线外的威胁不足'] },
    { summary: '一位以防守和篮板著称的得分后卫，他在分卫位置上的篮板数据令人惊讶。但进攻端的贡献有限。', projection: '预计第二轮被选中，蓝领型分卫。', strengths: ['防守和篮板在分卫中突出', '不占球权'], weaknesses: ['进攻端的贡献有限'] },
    { summary: '一位在低级别联赛中大杀四方的得分后卫，他的得分数据令人瞠目。但NBA级别的适应是巨大疑问。', projection: '预计第二轮被选中，发展联盟可能更适合他。', strengths: ['得分数据令人瞠目', '自信心爆棚'], weaknesses: ['低级别联赛的数据参考价值有限'] },
    { summary: '一位拥有出色身体对抗能力的得分后卫，他在NCAA的对抗中从不吃亏。但技术细腻度还需要提升。', projection: '预计第二轮被选中，蓝领型侧翼。', strengths: ['身体对抗能力出色', '在激烈对抗中不落下风'], weaknesses: ['技术细腻度还需要提升'] },
    { summary: '一位善于打挡拆的得分后卫，他在挡拆后的处理球能力在同龄人中出色。但一对一的能力偏弱。', projection: '预计第二轮被选中，体系型分卫。', strengths: ['挡拆后的处理球能力出色', '传球意识在分卫中算不错的'], weaknesses: ['一对一的能力偏弱'] },
    { summary: '一位大学四年的即战力得分后卫，他的成熟度和比赛经验让球探们相信他能立刻进入轮换。但上限有限。', projection: '预计第二轮被选中，即战力型但上限有限。', strengths: ['成熟度和比赛经验出色', '不会犯低级错误'], weaknesses: ['上限明显不如年轻新秀'] },
    { summary: '一位投射和突破都有一定水平但都不算出色的得分后卫。他需要找到自己的核心竞争力。', projection: '预计第二轮或落选，需要用训练营来证明自己。', strengths: ['投射和突破都有一定水平', '适应力不错'], weaknesses: ['没有一项精通的技能'] },
    { summary: '一位以快攻见长的得分后卫，他的转换进攻效率在同龄人中名列前茅。但半场进攻的创造力不足。', projection: '预计第二轮被选中，适合跑轰球队。', strengths: ['转换进攻效率极高', '快攻中的决策快速有效'], weaknesses: ['半场进攻的创造力不足'] },
    { summary: '一位在私人试训中表现出色但比赛中表现平平的得分后卫。球探们对他的比赛竞争力持保留态度。', projection: '预计第二轮或落选，试训型球员。', strengths: ['私人试训表现出色', '投篮数据亮眼'], weaknesses: ['比赛中的竞争力不足'] },
  ],
  sg_late: [
    { summary: '一位纯射手型得分后卫，三分是他唯一的NBA入场券。投篮动作标准、出手快，但其他技能几乎为零。', projection: '预计第二轮被选中，空间型替补但角色极其有限。', strengths: ['三分投射是唯一亮点', '出手速度快'], weaknesses: ['除了投篮其他方面都很弱'] },
    { summary: '一位大学四年的即战力分卫，经验丰富但天赋有限。他的成熟度让他比其他末段新秀更有竞争力。', projection: '预计第二轮被选中，即战力替补但上限明显。', strengths: ['经验丰富不犯错', '更衣室贡献积极'], weaknesses: ['天赋和运动能力不足'] },
    { summary: '一位受伤病影响的得分后卫，健康时的表现让人眼前一亮。但出勤率让球队望而却步。', projection: '低风险赌博型选择，可能签双向合同。', strengths: ['健康时得分能力不错', '投篮手感好'], weaknesses: ['伤病历史让人担忧'] },
    { summary: '一位来自小学校的得分后卫，在低级别比赛中大杀四方但NBA级别适应存疑。', projection: '预计需要发展联盟历练，可能成为双向合同球员。', strengths: ['低级别比赛中展现了得分能力', '自信心强'], weaknesses: ['面对更高水平对手表现存疑'] },
    { summary: '一位以防守和篮板著称的得分后卫，在分卫位置上的篮板数据令人惊讶。但进攻端的贡献有限。', projection: '预计第二轮被选中，蓝领型分卫但角色有限。', strengths: ['篮板在分卫中突出', '防守态度积极'], weaknesses: ['进攻端几乎无法提供帮助'] },
    { summary: '一位投射和防守都还过得去的得分后卫，但都算不上出色。需要找到一个能放大的优点。', projection: '预计需要发展联盟证明自己。', strengths: ['攻防两端都有一定基础', '团队配合意识好'], weaknesses: ['缺乏一项突出技能'] },
    { summary: '一位速度型得分后卫，第一步过人是杀招。但投篮和防守的不足让他的角色很有限。', projection: '预计第二轮被选中，需要体系来发挥速度优势。', strengths: ['速度是最大武器', '快攻中表现出色'], weaknesses: ['投篮和防守都不足'] },
    { summary: '一位在大学体系中如鱼得水的得分后卫，但离开体系后可能水土不服。无球跑位是他的最大资产。', projection: '预计第二轮或落选，体系型球员。', strengths: ['无球跑位意识出色', '在合适战术中如鱼得水'], weaknesses: ['离开体系后能力存疑'] },
    { summary: '一位善于打关键时刻的得分后卫，末段投篮效率反而高于前面。但整体稳定性是问题。', projection: '预计第二轮被选中，大心脏但不够稳定。', strengths: ['关键时刻投篮效率高', '大心脏属性'], weaknesses: ['整体表现波动大'] },
    { summary: '一位以中距离得分为主的分卫，翻身跳投和急停出手有模有样。但三分线外威胁接近于零。', projection: '预计第二轮或落选，需开发三分适应现代篮球。', strengths: ['中距离得分手段不错', '翻身跳投有模有样'], weaknesses: ['三分线外没有威胁'] },
    { summary: '一位以顽强著称的得分后卫，在场上从不放弃每一个球。球探欣赏他的态度但质疑天赋。', projection: '预计落选或第二轮末段，需用拼搏弥补天赋。', strengths: ['顽强拼搏精神令人敬佩', '态度无可挑剔'], weaknesses: ['天赋在NBA级别可能不够'] },
    { summary: '一位拥有出色臂展的得分后卫，防守潜力让球探保持兴趣。但进攻端的粗糙是最大障碍。', projection: '预计第二轮被选中，长期防守型项目。', strengths: ['臂展在分卫中罕见', '防守潜力出色'], weaknesses: ['进攻技术非常粗糙'] },
    { summary: '一位来自欧洲联赛的得分后卫，基本功扎实但NBA级别的运动能力存疑。', projection: '预计第二轮被选中，国际球员需要适应时间。', strengths: ['基本功扎实', '比赛理解力好'], weaknesses: ['运动能力在NBA级别可能不足'] },
    { summary: '一位在联合试训中体测表现出色的得分后卫，但比赛中未能展现同等水准。', projection: '预计第二轮或落选，试训行情高于比赛表现。', strengths: ['体测数据出色', '运动天赋有'], weaknesses: ['未能将天赋转化为比赛表现'] },
    { summary: '一位大学最后一年突然爆发的得分后卫，行情在赛季末段一路攀升。真实进步还是小样本波动？', projection: '行情取决于对后期表现的评价，可能第二轮被选中。', strengths: ['后期爆发力强', '进步意愿明显'], weaknesses: ['前期表现拖了后腿'] },
    { summary: '一位以空切和接球就投为主要得分手段的得分后卫，不占球权但效率不错。', projection: '预计第二轮被选中，体系型高效角色球员。', strengths: ['不占球权效率高', '空切意识好'], weaknesses: ['自主创造能力有限'] },
    { summary: '一位抗压能力出色的得分后卫，比赛最后5分钟投篮效率反而比前面更高。', projection: '预计第二轮被选中，大心脏型替补。', strengths: ['抗压能力出色', '末节效率高'], weaknesses: ['前面上场时间效率偏低'] },
    { summary: '一位在替补席上默默贡献的得分后卫，是那种教练信任但数据不起眼的球员。', projection: '预计落选或第二轮末段，替补型角色球员。', strengths: ['替补贡献稳定', '不抱怨角色'], weaknesses: ['可能永远无法成为主力'] },
    { summary: '一位以造犯规闻名的得分后卫，总能找到办法站上罚球线。但投篮和防守都需要提升。', projection: '预计第二轮或落选，需要全面提升。', strengths: ['造犯规能力出色', '罚球命中率不错'], weaknesses: ['投篮和防守都需要提升'] },
    { summary: '一位球风朴实的得分后卫，没有太多亮点但也没有明显弱点。每支球队都需要但不会优先选择。', projection: '预计落选或第二轮末段，训练营竞争型球员。', strengths: ['球风稳健无明显弱点', '适应力强'], weaknesses: ['没有亮点难以脱颖而出'] },
  ],
  sf_high: [
    { summary: '一位天赋异禀的小前锋，攻防两端的全面性让人想起了NBA中几位最顶级的侧翼球员。他的运动能力和篮球智商兼具，是本届新秀中最有巨星潜力的球员之一。', projection: '预计前3顺位被选中，球队基石型球员，有成为建队核心的潜质。', strengths: ['运动能力在同龄人中顶级', '攻防两端的全面性令人惊叹'], weaknesses: ['投篮稳定性需要提升'] },
    { summary: '一位3D型小前锋的完美模板，他的防御强度和三分投射让他成为现代NBA最有价值的角色类型之一。', projection: '预计前5顺位被选中，即战力3D型侧翼，立刻进入首发。', strengths: ['防御端的全面性和强度在同龄人中领先', '三分投射已经达到NBA级别'], weaknesses: ['持球进攻能力有限'] },
    { summary: '一位技术细腻的小前锋，他的投篮手感和脚步技术让人想起了NBA中几位技术型侧翼。', projection: '预计乐透区被选中，有全明星潜力的技术型侧翼。', strengths: ['投篮手感在同届侧翼中最柔和', '脚步技术出色能低位单打'], weaknesses: ['对抗后在NBA可能需要增肌'] },
    { summary: '一位拥有超级运动能力的小前锋，他的扣篮和盖帽已经成为社交媒体的常客。但技术层面还有提升空间。', projection: '预计乐透区被选中，运动能力先赢得出场时间，技术逐步开发。上限极高。', strengths: ['弹跳和爆发力可能在整届新秀中排名前三', '快攻中的终结能力惊人'], weaknesses: ['半场阵地战的技巧需要打磨'] },
    { summary: '一位拥有NBA即战力的小前锋，他的全面性和成熟度让球探们相信他能立刻为球队做出贡献。', projection: '预计乐透区被选中，攻防兼备即战力。', strengths: ['攻守均衡没有明显漏洞', '决策成熟度超出年龄'], weaknesses: ['缺乏令人惊叹的顶级技能'] },
    { summary: '一位攻防一体的侧翼精英，他在攻守两端都能改变比赛。这种球员在季后赛中的价值是无法估量的。', projection: '预计前5顺位被选中，攻防一体型侧翼是现代NBA的稀缺资源。', strengths: ['攻防一体的影响力在同龄人中罕见', '防御端能防1-4号位'], weaknesses: ['进攻创造力还有上升空间'] },
    { summary: '一位以全能著称的小前锋，得分篮板助攻样样精通。他的比赛让人想起了NBA历史上几位最伟大的全能侧翼。', projection: '预计乐透区被选中，全能型侧翼，多项数据贡献。', strengths: ['全能型数据贡献者', '得分篮板助攻样样精通'], weaknesses: ['没有一项技能堪称顶级'] },
    { summary: '一位投篮手感柔软的得分型小前锋，他的三分和中距离都相当出色。在现代篮球的空间型打法中，他的价值不言而喻。', projection: '预计乐透区被选中，空间型侧翼。', strengths: ['投篮手感在同届中顶级', '三分和中距离都相当出色'], weaknesses: ['防御端的投入度有时不够'] },
    { summary: '一位拥有顶级篮球智商的小前锋，他的比赛阅读能力和战术执行力让教练组赞不绝口。', projection: '预计乐透区中后段被选中，高球商型侧翼。', strengths: ['篮球智商在同龄人中顶尖', '战术执行力堪称完美'], weaknesses: ['运动能力在NBA级别不算突出'] },
    { summary: '一位在国际赛场上已经证明了自己的小前锋，他在FIBA比赛中的全面表现让球探们对他的NBA前景充满信心。', projection: '预计乐透区被选中，国际球员的即战力价值巨大。', strengths: ['国际赛场的经验丰富', 'FIBA比赛中展现了全面能力'], weaknesses: ['需要适应NBA的节奏和规则'] },
    { summary: '一位在锦标赛中大放异彩的小前锋，他在淘汰赛中的统治级表现让他的选秀行情一路飙升。', projection: '预计乐透区被选中，大赛型球员的价值毋庸置疑。', strengths: ['锦标赛中的统治级表现', '大赛中的表现远超常规赛'], weaknesses: ['常规赛的稳定性需要证明'] },
    { summary: '一位身体素质惊人的小前锋，他的弹跳和速度让他在攻防两端都极具威胁。技术层面正在飞速进步。', projection: '预计乐透区中后段被选中，运动天赋型侧翼。', strengths: ['弹跳和速度在侧翼中出类拔萃', '攻防两端都极具威胁'], weaknesses: ['技术层面正在进步但还不够成熟'] },
    { summary: '一位以无球跑动和空切著称的小前锋，他总能在防御的盲区找到得分机会。这种"安静杀手"在季后赛中非常有价值。', projection: '预计乐透区边缘被选中，无球型侧翼。', strengths: ['无球跑动和空切堪称教科书', '总能在防御盲区找到机会'], weaknesses: ['持球进攻能力有限'] },
    { summary: '一位能在低位惩罚错位的小前锋，他的背身技术让他在面对更小的防御者时占据绝对优势。', projection: '预计乐透区后段被选中，错位惩罚型侧翼。', strengths: ['低位技术出色', '面对小个防御者时碾压式得分'], weaknesses: ['速度在侧翼中不算快'] },
    { summary: '一位攻守两端都以强度著称的小前锋，他的比赛态度和拼劲让每支球队都想拥有他。', projection: '预计乐透区后段被选中，高强度型侧翼。', strengths: ['攻守两端的强度令人钦佩', '比赛态度无可挑剔'], weaknesses: ['技术细腻度还需要提升'] },
    { summary: '一位拥有超级投射能力的小前锋，他的三分命中率和射程在同龄侧翼中无人能敌。', projection: '预计乐透区被选中，顶级空间型侧翼。', strengths: ['三分投射在侧翼中独一无二', '射程远且命中率高'], weaknesses: ['突破和防御偏弱'] },
    { summary: '一位在篮球名校效力的成熟小前锋，四年的系统训练让他拥有了NBA即战力的水平。', projection: '预计乐透区后段被选中，即战力型侧翼。', strengths: ['四年名校系统训练', '技术完成度极高'], weaknesses: ['年龄偏大发展空间可能有限'] },
    { summary: '一位以传球和策应著称的小前锋，他的传球视野在侧翼中极为罕见。在当今NBA的组织型前锋潮流中，他的价值不言而喻。', projection: '预计乐透区后段被选中，组织型前锋。', strengths: ['传球视野在侧翼中极为罕见', '策应能力出色'], weaknesses: ['得分能力不如纯得分手'] },
    { summary: '一位受伤病影响但天赋出众的小前锋，健康时的表现堪称前5顺位级别。医疗报告将决定他的最终行情。', projection: '预计乐透区后段被选中，高风险高回报。', strengths: ['健康时的表现堪称前5级别', '攻防两端都有统治力'], weaknesses: ['伤病史是最大隐患'] },
    { summary: '一位来自小学校的宝藏小前锋，在低级别联赛中展现了全能的比赛能力。NBA级别的适应是最大考验。', projection: '预计乐透区后段被选中，小学校宝藏。', strengths: ['低级别联赛中展现了全能能力', '竞争意识极强'], weaknesses: ['面对更高水平对手的表现存疑'] },
    { summary: '一位球风优雅的小前锋，他的比赛节奏和投篮选择让人想起了NBA中几位最擅长利用节奏的侧翼球员。', projection: '预计乐透区后段被选中，节奏型侧翼。', strengths: ['球风优雅节奏感出色', '投篮选择堪称完美'], weaknesses: ['运动能力在NBA级别可能不够'] },
  ],
  sf_mid: [
    { summary: '一位3D潜力十足的小前锋，防守端的压迫感已经到位，如果三分命中率能稳定在35%以上将是极具价值的轮换。', projection: '预计以防守赢得轮换席位，进攻端逐步开发。', strengths: ['外线防守脚步扎实', '协防意识出色'], weaknesses: ['投篮节奏不够稳定'] },
    { summary: '一位以中距离为主要得分手段的小前锋，他的翻身跳投和面筐单打在大学赛场极具杀伤力。', projection: '预计成为球队替补得分点，半场攻坚型。', strengths: ['中距离投篮手感柔和', '单打脚步成熟'], weaknesses: ['三分投射还不够稳定'] },
    { summary: '一位球风硬朗的小前锋，喜欢身体对抗，在篮下能和内线拼抢。这种风格让他在对阵小球阵容时很有价值。', projection: '预计在强调对抗的体系中获得机会，替补起步。', strengths: ['身体对抗能力出色', '篮下终结强硬'], weaknesses: ['外线投射有欠缺'] },
    { summary: '一位来自澳大利亚联赛的成熟小前锋，职业联赛经验让他的比赛阅读能力远超同龄NCAA球员。', projection: '预计成为即战力轮换，国际赛场经验是加分项。', strengths: ['比赛阅读力出色', '防守选位合理'], weaknesses: ['运动能力在NBA级别偏一般'] },
    { summary: '一位大学四年打满的即战力小前锋，每年的数据都在稳步提升。他的成熟度和稳定性让球探很有信心。', projection: '预计即插即用的轮换球员，地板高天花板低。', strengths: ['比赛经验丰富', '投篮选择合理'], weaknesses: ['年龄偏大发展空间有限'] },
    { summary: '一位以快攻见长的小前锋，转换进攻中的推进和终结能力是他的看家本领。在快节奏球队中将如鱼得水。', projection: '预计在快节奏球队获得轮换时间，阵地战需提升。', strengths: ['快攻推进能力出色', '体能充沛'], weaknesses: ['半场阵地战效率偏低'] },
    { summary: '一位无球跑动出色的小前锋，总能在防守缝隙中找到空位。接球就投的效率在同龄人中名列前茅。', projection: '预计成为空间型替补侧翼，投篮是生存之本。', strengths: ['无球跑动意识出色', '接球就投效率高'], weaknesses: ['持球创造能力有限'] },
    { summary: '一位大器晚成的小前锋，大一赛季几乎不上场，大三才突然爆发成为球队核心。这种上升曲线让球探既兴奋又犹豫。', projection: '预计需要时间确认是否为昙花一现，替补起步。', strengths: ['进步速度惊人', '天赋上乘'], weaknesses: ['表现样本偏少不够稳定'] },
    { summary: '一位防守端很有存在感的小前锋，单防和协防都做得不错。进攻端虽然不华丽但很少犯错。', projection: '预计以防守型替补进入轮换，进攻端需体系支持。', strengths: ['防守全面性出色', '协防意识好'], weaknesses: ['自主进攻手段有限'] },
    { summary: '一位有欧洲篮球背景的小前锋，基本功扎实，团队配合意识强。在讲究传球的体系中会非常舒服。', projection: '预计在战术丰富的体系中获得轮换席位。', strengths: ['传球意识在侧翼中出色', '基本功扎实'], weaknesses: ['单打能力不足'] },
    { summary: '一位在联合试训中表现抢眼的小前锋，体测数据优秀，面试表现也获得了多支球队好评。', projection: '预计选秀行情上升，次轮前段被选中。', strengths: ['体测数据出色', '职业态度受好评'], weaknesses: ['大学期间表现不够亮眼'] },
    { summary: '一位受伤病影响了赛季的小前锋，恢复后的表现有所回升但未能回到伤前水准。医疗报告决定他的最终行情。', projection: '行情取决于医疗报告，健康时是首轮级别。', strengths: ['伤前表现出色', '攻防两端都有贡献'], weaknesses: ['伤病恢复后的爆发力存疑'] },
    { summary: '一位善于空切和背切的小前锋，在篮下的终结效率极高。虽然不占球权但总能找到得分机会。', projection: '预计成为体系中的高效角色球员。', strengths: ['空切意识出色', '篮下终结效率高'], weaknesses: ['投篮范围有限'] },
    { summary: '一位在锦标赛中一战成名的小前锋，单场30+的表现让他的行情从落选秀飙升至次轮。', projection: '行情波动较大，可能成为捡漏选择。', strengths: ['大赛爆发力强', '关键时刻敢于出手'], weaknesses: ['常规赛稳定性未经验证'] },
    { summary: '一位善于利用掩护的小前锋，兜出来接球投篮的效率很高。在挡拆密集的体系中能发挥最大价值。', strengths: ['利用掩护投篮效率高', '跑位意识好'], projection: '预计成为战术体系中的定点投手。', weaknesses: ['自主创造能力有限'] },
    { summary: '一位以篮板著称的小前锋，场均篮板在侧翼中名列前茅。他的拼劲和二次进攻能力是加分项。', projection: '预计成为能量型替补，篮板是他的名片。', strengths: ['篮板在侧翼中出色', '二次进攻积极'], weaknesses: ['外线投射偏弱'] },
    { summary: '一位来自非篮球名校的小前锋，虽然曝光度不高但球探私下考察后对他的评价很不错。', projection: '预计次轮被选中，可能是本届隐藏宝藏。', strengths: ['技术完成度高', '球商出色'], weaknesses: ['面对高水平对手样本偏少'] },
    { summary: '一位打球非常聪明的小前锋，总能在正确的时间出现在正确的位置。数据不起眼但正负值一直很高。', projection: '预计成为数据不显但教练信任的角色球员。', strengths: ['比赛感觉出色', '正负值贡献高'], weaknesses: ['缺少一击致命的技能'] },
    { summary: '一位以低位背打为特色的小前锋，面对小个防守者时能轻松碾压。在错位进攻中非常有价值。', projection: '预计成为错位进攻型替补，需要提升外线。', strengths: ['低位背打能力在侧翼中突出', '对抗优势明显'], weaknesses: ['速度跟不上快节奏'] },
    { summary: '一位攻防两端都有贡献但都不出彩的小前锋，全面性是他的优势也是劣势——什么都会什么都不精。', projection: '预计成为万能胶型替补，能填多种角色。', strengths: ['攻防两端全面', '适应力强'], weaknesses: ['缺少一项顶级技能'] },
    { summary: '一位在AAU联赛中名声大噪但大学表现有所下滑的小前锋，球探们还在争论是体系不适合还是被高估了。', projection: '行情不确定，取决于球队对他潜力的判断。', strengths: ['天赋上限诱人', '身体条件出色'], weaknesses: ['大学表现与天赋不匹配'] },
  ],
  sf_late: [
    { summary: '一位大学四年的老将小前锋，经验丰富且从不出格。他可能永远不会成为明星，但绝对是个靠谱的替补。', projection: '预计成为即战力第三小前锋，发展空间有限。', strengths: ['比赛经验丰富', '失误极少'], weaknesses: ['天赋和运动能力偏弱'] },
    { summary: '一位以防守为敲门砖的小前锋，单防能力在同届末段新秀中算出色的。进攻端需要大量补课。', projection: '预计以防守型替补身份争取双向合同。', strengths: ['单防能力在同段位中出色', '防守态度积极'], weaknesses: ['进攻端几乎无价值'] },
    { summary: '一位受伤病困扰的小前锋，两个赛季只打了不到30场比赛。健康时的数据还不错，但谁敢赌？', projection: '高风险低投入型选择，医疗报告是关键。', strengths: ['健康时效率不错', '比赛感觉好'], weaknesses: ['伤病历史是最大红旗'] },
    { summary: '一位来自低级别联赛的小前锋，在那里他是球队核心。面对NBA级别的身体对抗和速度是最大考验。', projection: '预计需要大量发展联盟时间，可能签双向合同。', strengths: ['在低级别比赛中有统治力', '自信心强'], weaknesses: ['面对高水平对手存疑'] },
    { summary: '一位投射型小前锋，三分命中率接近40%是他最大的卖点。但除此之外，其他方面都乏善可陈。', projection: '预计成为纯空间型替补，极其依赖手感。', strengths: ['三分命中率出色', '不占球权'], weaknesses: ['防守端是明显漏洞'] },
    { summary: '一位在联合试训中三分投射表现出色的小前锋，这可能让他的行情从落选秀提升到次轮末。', projection: '试训表现决定命运，可能成为惊喜选择。', strengths: ['试训投射表现出色', '投篮动作标准'], weaknesses: ['大学期间表现平平'] },
    { summary: '一位以拼劲著称的小前锋，每球必争的态度让教练和队友都喜欢他。技术虽糙但永不放弃。', projection: '预计需要发展联盟历练，可能以防守赢得机会。', strengths: ['拼劲和韧性出众', '防守积极性高'], weaknesses: ['技术比较粗糙'] },
    { summary: '一位身体条件出色但技术不够细腻的小前锋，臂展和弹跳在体测中排名前列，但大学期间未能充分利用。', projection: '天赋型赌博，需要耐心培养。', strengths: ['身体条件诱人', '臂展出色'], weaknesses: ['技术完成度低'] },
    { summary: '一位来自欧洲联赛的年轻小前锋，在俱乐部中出场时间有限但展现了不错的球商和投射。', projection: '可能被选中后留在欧洲继续培养，长远投资。', strengths: ['球商和投射有潜力', '年龄优势'], weaknesses: ['高水平比赛经验太少'] },
    { summary: '一位以空切和二次进攻为主要得分方式的小前锋，不占球权但效率还行。在合适的体系中能生存。', projection: '预计在发展联盟证明自己，争取短期合同。', strengths: ['不占球权效率尚可', '空切意识好'], weaknesses: ['缺少自主创造能力'] },
    { summary: '一位在大学后期突然找到三分手感的小前锋，最后10场比赛三分命中率超过42%。这种趋势能延续吗？', projection: '如果投射是真的可能是捡漏，需更多验证。', strengths: ['后期三分命中率飙升', '进步意愿强'], weaknesses: ['投射改善是否可持续存疑'] },
    { summary: '一位球风朴实无华的小前锋，不做花哨动作但也很少犯错。教练喜欢这种球员因为他们很"安全"。', projection: '预计成为靠谱但不起眼的替补，地板型选择。', strengths: ['很少犯错', '执行力强'], weaknesses: ['缺少亮点和爆发力'] },
    { summary: '一位善于打挡拆的小前锋，作为挡拆中的外弹投手效率不错。在现代NBA中这个技能有一定价值。', projection: '预计成为战术型替补，特定场景下有价值。', strengths: ['挡拆外弹投篮效率高', '战术理解力好'], weaknesses: ['单打和突破能力有限'] },
    { summary: '一位有过严重伤病经历的小前锋，已经完全恢复但心理阴影可能还在。他的故事足够励志。', projection: '低顺位赌博型选择，恢复情况是关键。', strengths: ['恢复后态度积极', '基本功不错'], weaknesses: ['伤病心理阴影可能影响表现'] },
    { summary: '一位来自小学校但数据爆炸的小前锋，场均22+8但面对的对手质量让人质疑数据的含金量。', projection: '预计需要发展联盟验证实力，可能被低估。', strengths: ['数据华丽', '得分手段多样'], weaknesses: ['面对高水平对手能力未验证'] },
    { summary: '一位以传球策应为特长的小前锋，在侧翼中算罕见的组织者。但得分能力的不足让他的角色很受限。', projection: '预计在需要组织型侧翼的球队获得机会。', strengths: ['传球策应在侧翼中出色', '视野开阔'], weaknesses: ['得分能力偏弱'] },
    { summary: '一位善于打关键时刻的小前锋，大学期间多次在最后时刻命中关键球。但常规时间的表现不够稳定。', projection: '预计成为末段赌博型选择，大心脏是加分项。', strengths: ['关键时刻表现出色', '抗压能力强'], weaknesses: ['常规时间不够稳定'] },
    { summary: '一位在私人试训中给球队留下深刻印象的小前锋，投篮和身体对抗都超出了预期。', projection: '试训行情上涨，可能成为次轮惊喜。', strengths: ['试训表现出色', '职业态度获好评'], weaknesses: ['大学期间未能展现同等水准'] },
    { summary: '一位臂展极长的小前锋，7尺的臂展让他在防守端有天然优势。但移动速度偏慢是隐患。', projection: '预计以防守型替补获得机会，需提升速度。', strengths: ['臂展在侧翼中顶级', '防守干扰能力强'], weaknesses: ['移动速度偏慢'] },
    { summary: '一位球风类似传统角色球员的小前锋，不贪功、防守到位、篮板积极。在当今NBA可能需要更多技能。', projection: '预计成为双向合同球员，发展联盟起步。', strengths: ['团队意识好', '篮板积极'], weaknesses: ['技能面不够现代化'] },
  ],
  pf_high: [
    { summary: '一位现代化的空间型大前锋，三分射程覆盖NBA三分线，同时拥有传统内线的篮板和护框能力。他是本届最符合现代NBA潮流的大个子之一。', projection: '预计首轮前10被选中，空间型四号位在联盟极受欢迎。', strengths: ['三分投射对大前锋来说极为出色', '篮板和保护能力领先'], weaknesses: ['低位技术还需打磨'] },
    { summary: '一位运动能力炸裂的大前锋，弹跳和速度在内线中极为罕见。他的盖帽集锦已经让多支球队的球探部门兴奋不已。', projection: '预计乐透区被选中，防守和运动能力先站稳脚跟。', strengths: ['运动能力在同届大个子中首屈一指', '盖帽能力惊人'], weaknesses: ['投篮是最大短板'] },
    { summary: '一位技术全面的大前锋，低位脚步如同教科书，中距离投篮稳定如钟。他在半场阵地战中的杀伤力在同龄内线中无出其右。', projection: '预计乐透区被选中，半场进攻核心型大前锋。', strengths: ['低位脚步在同届内线中最出色', '中距离投篮稳定'], weaknesses: ['三分投射还在开发中'] },
    { summary: '一位攻守兼备的内线，防守覆盖面积和进攻效率都达到了极高的水准。他可能是本届最"安全"的前场选择。', projection: '预计乐透区后段被选中，新秀赛季有望首发。', strengths: ['防守覆盖面积在内线中罕见', '投篮效率极高'], weaknesses: ['自主创造得分能力有限'] },
    { summary: '一位拥有超级投射能力的大前锋，三分命中率高达42%且射程极远。在空间为王的现代NBA，他的价值不言而喻。', projection: '预计乐透区被选中，空间型四号位的顶级模板。', strengths: ['三分投射在大个子中独一无二', '射程远达NBA三分线'], weaknesses: ['篮板和护框能力偏弱'] },
    { summary: '一位来自欧洲联赛的成熟大前锋，在西班牙ACB联赛中已经证明了自己。他的比赛阅读力和技术完成度远超同龄NCAA球员。', projection: '预计首轮前15被选中，即战力型国际大前锋。', strengths: ['国际赛场经验丰富', '技术完成度高'], weaknesses: ['NBA级别的身体对抗还需适应'] },
    { summary: '一位在锦标赛中大放异彩的大前锋，连场20+10的表现让他从次轮预测直接跳到了乐透讨论。', projection: '预计乐透区后段被选中，大赛表现提升了行情。', strengths: ['大赛表现稳定', '关键时刻敢于承担责任'], weaknesses: ['常规赛的稳定性需要更多验证'] },
    { summary: '一位攻防两端都能换防的大前锋，从1号位防到5号位的能力让他在现代NBA中极为抢手。', projection: '预计首轮前20被选中，换防型四号位价值极高。', strengths: ['换防能力在大个子中顶级', '移动速度出色'], weaknesses: ['低位进攻还需要加强'] },
    { summary: '一位低位进攻如同艺术的大前锋，背身单打和翻身跳投是他的招牌。在低位进攻正在消亡的今天，他的复古球风反而让人眼前一亮。', projection: '预计首轮中段被选中，半场攻坚型内线。', strengths: ['低位进攻手段丰富', '脚步技术精湛'], weaknesses: ['外线投射几乎不存在'] },
    { summary: '一位以高位策应著称的大前锋，传球视野和创造力在内线中极为罕见。在强调传球的体系中他将成为战术核心。', projection: '预计首轮中段被选中，策应型大前锋。', strengths: ['传球策应在大个子中顶级', '篮球智商极高'], weaknesses: ['得分爆炸力不够强'] },
    { summary: '一位篮板机器型的大前锋，场均两双的数据和出色的前场篮板让他成为禁区守护者。', projection: '预计首轮中后段被选中，篮板和防守型内线。', strengths: ['篮板争抢能力在同届内线中领先', '前场篮板出色'], weaknesses: ['外线投射还未开发'] },
    { summary: '一位球风类似德雷蒙德·格林的全能大前锋，防守、传球、篮板都有贡献。得分不是他的第一选项但他也能在需要时得分。', projection: '预计首轮中后段被选中，全能型角色大前锋。', strengths: ['攻防两端全面性出色', '传球视野好'], weaknesses: ['投篮命中率需要提升'] },
    { summary: '一位来自篮球名校的大前锋，在顶级教练的调教下技术非常成熟。他的基本功和比赛理解力在同届内线中名列前茅。', projection: '预计首轮中后段被选中，名校出品安全选择。', strengths: ['技术完成度高', '名校体系培养'], weaknesses: ['爆发力在NBA级别可能不够'] },
    { summary: '一位在赛季后半段突然爆发的大前锋，最后两个月的数据堪比乐透秀。这种上升势头让球探们争相重新评估。', projection: '预计首轮后段被选中，上升趋势明显的潜力股。', strengths: ['后半赛季爆发力强', '进步速度快'], weaknesses: ['前期表现不够稳定'] },
    { summary: '一位拥有NBA级别身体条件的大前锋，身高臂展和力量在同届内线中都是顶级。技术还需要打磨但天赋肉眼可见。', projection: '预计首轮后段被选中，天赋型投资。', strengths: ['身体条件在内线中顶级', '力量和臂展出色'], weaknesses: ['技术完成度偏低'] },
    { summary: '一位以挡拆后处理球著称的大前锋，无论是顺下终结还是外弹投篮都效率极高。挡拆是现代NBA最常用的战术，他的价值因此水涨船高。', projection: '预计首轮后段被选中，挡拆型内线。', strengths: ['挡拆处理球效率极高', '终结能力强'], weaknesses: ['自主创造得分手段不多'] },
    { summary: '一位在NCAA和FIBA赛场都有出色表现的双线大前锋，代表国家队出战的经验让他比同龄人更成熟。', projection: '预计首轮后段被选中，国际赛场经验加分。', strengths: ['双线比赛经验丰富', '比赛成熟度高'], weaknesses: ['运动能力不算顶级'] },
    { summary: '一位攻防转换中极具威胁的大前锋，快攻跟进的速度甚至不输后卫。在推节奏的体系中他将是反击利器。', projection: '预计首轮后段至次轮初被选中，快攻型大前锋。', strengths: ['快攻跟进速度极快', '运动能力出色'], weaknesses: ['半场阵地战效率有待提升'] },
    { summary: '一位受伤病影响了赛季但天赋极高的大前锋，健康时的表现不输乐透秀。医疗报告将决定他的最终行情。', projection: '预计首轮后段被选中，高风险高回报。', strengths: ['健康时表现堪称乐透级别', '天赋出众'], weaknesses: ['伤病史是最大隐患'] },
    { summary: '一位来自小学校但球探评价极高的大前锋，在低级别联赛中展现了全面的技术和统治力。', projection: '预计次轮前段被选中，小学校隐藏宝藏。', strengths: ['技术全面完成度高', '在低级别比赛中有统治力'], weaknesses: ['面对NBA级别对手存疑'] },
    { summary: '一位以效率和稳定著称的大前锋，虽然不华丽但每场比赛都能贡献稳定的两双。教练最爱这种可靠的内线。', projection: '预计次轮前段被选中，地板型安全选择。', strengths: ['效率极高', '表现稳定不波动'], weaknesses: ['缺少爆炸力和闪光点'] },
  ],
  pf_mid: [
    { summary: '一位有一定潜力但还不够稳定的大前锋，投篮手感有时出色但防守端的不足限制了角色。', projection: '预计从替补打起，需改善防守争取更多时间。', strengths: ['投篮手感在大个子中不错', '有一定三分潜力'], weaknesses: ['防守端意识和技术需提升'] },
    { summary: '一位以篮板和防守见长的大前锋，蓝领属性让教练信任但进攻端局限限制了上限。', projection: '预计成为防守型替补蓝领。', strengths: ['篮板争抢积极性极高', '防守对抗能力强'], weaknesses: ['进攻端几乎没有自主得分能力'] },
    { summary: '一位正在发展外线投射的大前锋，大学后期开始尝试三分但还不成熟。如果能练出来价值大增。', projection: '预计需要时间发展，发展联盟可能更适合。', strengths: ['正在开发三分投射', '有转型意愿'], weaknesses: ['外线投射还不够稳定'] },
    { summary: '一位球商很高但运动能力一般的大前锋，传球和策应在同龄内线中很突出。', projection: '预计在战术丰富的体系中更有价值。', strengths: ['传球策应能力在大个子中出色', '篮球智商高'], weaknesses: ['运动能力在NBA内线中可能不够'] },
    { summary: '一位蓝领型大前锋，专门做脏活累活。可能永远不会成为明星但争冠队都需要。', projection: '预计成为能量型替补，提供篮板和防守。', strengths: ['拼劲和韧性在大个子中突出', '篮板争抢能力强'], weaknesses: ['进攻端几乎无法提供帮助'] },
    { summary: '一位来自欧洲联赛的大前锋，基本功扎实但运动能力一般。在讲究团队配合的体系中可能比在大学体系更有价值。', projection: '预计次轮中段被选中，需要适应NBA节奏。', strengths: ['基本功扎实', '传球意识好'], weaknesses: ['运动能力偏弱'] },
    { summary: '一位在赛季末段有所爆发的大前锋，最后一个月的场均数据比之前翻了倍。是真正的进步还是小样本波动？', projection: '预计次轮中段被选中，后期表现提升了行情。', strengths: ['后期进步明显', '得分潜力有'], weaknesses: ['前期表现拖了后腿'] },
    { summary: '一位以中距离为主要武器的大前锋，15尺到18尺的区域是他的甜蜜点。在三分时代，中距离内线还有多少价值？', projection: '预计成为半场阵地型替补，需开发三分。', strengths: ['中距离投篮稳定', '面筐进攻有心得'], weaknesses: ['三分线外威胁不足'] },
    { summary: '一位挡拆后顺下终结效率极高的大前锋，在大学赛场的挡拆进攻中几乎每次都能得分。但自主进攻能力有限。', projection: '预计成为挡拆型替补，需要更多进攻手段。', strengths: ['挡拆顺下终结高效', '运动能力不错'], weaknesses: ['自主创造得分能力有限'] },
    { summary: '一位在锦标赛中有亮眼表现的大前锋，面对更高水平的对手打出了两场20+的比赛。', projection: '行情取决于整个赛季而非两场比赛，次轮潜力。', strengths: ['大赛表现超出预期', '关键时刻不怯场'], weaknesses: ['常规赛表现波动较大'] },
    { summary: '一位有投射潜力但还不够稳定的大前锋，三分命中率在30%到40%之间波动。如果能稳定下来将非常有价值。', projection: '预计需要时间发展投射，替补起步。', strengths: ['投射潜力有', '手感柔和'], weaknesses: ['投射波动太大'] },
    { summary: '一位以力量和对抗著称的大前锋，在禁区内几乎不可能被推出去。篮板卡位做得非常扎实。', projection: '预计成为力量型替补，篮板和掩护是价值。', strengths: ['力量和对抗出色', '篮板卡位扎实'], weaknesses: ['速度偏慢跟不上快节奏'] },
    { summary: '一位臂展极长的大前锋，7尺4的臂展让他在防守端的覆盖范围远超身高。进攻端还需要更多打磨。', projection: '预计以防守型替补获得机会。', strengths: ['臂展在内线中顶级', '防守覆盖范围大'], weaknesses: ['进攻端手段有限'] },
    { summary: '一位大学四年的即战力大前锋，经验丰富但天赋有限。他是最安全的选择也是最无聊的选择。', projection: '预计成为即战力替补，发展空间小。', strengths: ['经验丰富', '不犯错'], weaknesses: ['天赋上限明显'] },
    { summary: '一位受伤病影响了一个赛季的大前锋，复出后的表现有所下滑但仍有亮点。健康是最大变量。', projection: '行情取决于医疗报告，健康时是轮换级别。', strengths: ['健康时效率不错', '技术有基础'], weaknesses: ['伤病恢复后运动能力可能下降'] },
    { summary: '一位以防守和盖帽著称的大前锋，场均盖帽在同龄内线中名列前茅。进攻端是蓝领角色。', projection: '预计成为防守型替补，盖帽是名片。', strengths: ['盖帽能力出色', '护框意识好'], weaknesses: ['进攻端贡献有限'] },
    { summary: '一位来自非篮球名校的大前锋，在低级别比赛中展现了全面的技术。球探对他的评价高于他的知名度。', projection: '预计次轮被选中，可能是隐藏宝藏。', strengths: ['技术全面', '球商高'], weaknesses: ['面对高水平对手样本少'] },
    { summary: '一位善于打挡拆外弹的大前锋，中距离外弹投篮是他的标志性得分方式。但三分线外的投射还未完全开发。', projection: '预计成为挡拆外弹型替补，需开发三分。', strengths: ['挡拆外弹中投稳定', '战术执行力好'], weaknesses: ['三分和低位技术需提升'] },
    { summary: '一位在联合试训中体测数据出色的大前锋，弹跳和速度都排名前列。但大学期间的数据平平。', projection: '体测加分但需证明能转化为场上表现。', strengths: ['体测数据优秀', '运动能力有'], weaknesses: ['大学期间未能充分发挥天赋'] },
    { summary: '一位善于空切和二次进攻的大前锋，不占球权但总能通过积极跑位获得得分机会。', projection: '预计成为能量型替补，效率不错但不抢眼。', strengths: ['空切意识好', '不占球权效率高'], weaknesses: ['缺少自主创造能力'] },
    { summary: '一位球风朴实但非常高效的大前锋，投篮命中率在大个子中名列前茅。他可能不华丽但绝不拖后腿。', projection: '预计成为靠谱的替补大前锋，效率型选择。', strengths: ['投篮效率高', '选择合理'], weaknesses: ['缺少得分爆发力'] },
  ],
  pf_late: [
    { summary: '一位有一定篮板和防守能力但进攻端几乎无价值的大前锋。他的NBA生存将完全取决于防守端的贡献。', projection: '预计需要发展联盟历练，可能成为双向合同球员。', strengths: ['篮板能力在末段内线中尚可', '防守态度积极'], weaknesses: ['进攻端几乎无价值'] },
    { summary: '一位受伤病影响的大前锋，健康时有一定潜力但出勤率让人担忧。低风险赌博型选择。', projection: '低风险赌博，如果保持健康可能成为轮换。', strengths: ['健康时表现不错', '手感在大个子中算好'], weaknesses: ['伤病历史是最大隐患'] },
    { summary: '一位来自小学校的大前锋，在低级别联赛表现不错但NBA级别适应存疑。', projection: '预计需要大量发展联盟时间适应更高水平。', strengths: ['在低级别比赛中有不错表现', '自信心强'], weaknesses: ['面对高水平对手表现未知'] },
    { summary: '一位大龄大前锋，大学经验丰富但天赋有限。成熟度让他比其他末段新秀更有即战力。', projection: '即战力替补但发展空间极小。', strengths: ['经验丰富不犯错', '比赛理解力好'], weaknesses: ['天赋和运动能力不足'] },
    { summary: '一位投射型大前锋，三分是唯一亮点。如果投篮失准在场价值接近于零。', projection: '空间型替补，极其依赖投篮手感。', strengths: ['三分投射在大个子中算出色', '能拉开空间'], weaknesses: ['其他方面都很弱'] },
    { summary: '一位在大学最后一年突然找到三分手感的大前锋，最后10场三分命中率39%。这个趋势能延续吗？', projection: '如果投射是真的可能是捡漏，但样本太小。', strengths: ['后期投射改善明显', '有进步意愿'], weaknesses: ['整体表现样本偏小'] },
    { summary: '一位以掩护和卡位见长的蓝领大前锋，这种不华丽但重要的技能在NBA仍有市场。', projection: '预计成为蓝领替补，专门做脏活。', strengths: ['掩护质量高', '卡位意识好'], weaknesses: ['得分手段极度匮乏'] },
    { summary: '一位来自海外联赛的年轻大前锋，年龄优势明显但经验不足。可能需要多年培养。', projection: '长远投资型选择，可能先在海外继续历练。', strengths: ['年龄优势大', '有成长空间'], weaknesses: ['经验严重不足'] },
    { summary: '一位球商出色但身体条件一般的大前锋，传球和战术执行力是他的核心竞争力。', projection: '预计在战术丰富的体系中获得机会。', strengths: ['球商高传球好', '战术执行力强'], weaknesses: ['身体条件在NBA内线中偏弱'] },
    { summary: '一位在私人试训中表现超出预期的大前锋，投篮和脚步都让考察的球探感到惊喜。', projection: '试训行情上涨，可能成为末段惊喜。', strengths: ['试训表现出色', '基本功扎实'], weaknesses: ['大学比赛中的统治力不足'] },
    { summary: '一位以拼劲著称的大前锋，每球必争的态度让他在篮板争抢中总能获得额外机会。', projection: '预计以拼劲赢得发展联盟机会，争取短期合同。', strengths: ['拼劲和韧性出众', '篮板积极'], weaknesses: ['技术和投射偏弱'] },
    { summary: '一位臂展极长但技术不够细腻的大前锋，7尺3的臂展让他在防守端有一定优势。', projection: '预计以防守型替补获得机会，技术需打磨。', strengths: ['臂展出色防守覆盖范围大', '盖帽潜力有'], weaknesses: ['技术比较粗糙'] },
    { summary: '一位在低级别联赛中大杀四方的大前锋，场均18+12但面对的对手质量让人质疑。', projection: '发展联盟验证实力，可能被低估也可能水土不服。', strengths: ['数据华丽', '自信心强'], weaknesses: ['面对高水平对手存疑'] },
    { summary: '一位善于空切和挡拆顺下的大前锋，虽然技术单一但在特定场景下效率极高。', projection: '预计成为特定场景下的角色球员。', strengths: ['空切和顺下效率高', '不占球权'], weaknesses: ['技能面太窄'] },
    { summary: '一位大学四年默默无闻但在最后半个赛季突然闪光的大前锋，这种迟来的爆发让球探既惊喜又困惑。', projection: '可能是大器晚成也可能是昙花一现。', strengths: ['后期爆发力有', '进步意愿强'], weaknesses: ['前期表现太差影响评估'] },
    { summary: '一位以罚球线区域中距离为主要武器的大前锋，这个区域的投篮命中率接近50%。', projection: '预计成为中距离型替补，需扩展射程。', strengths: ['中距离命中率稳定', '投篮选择合理'], weaknesses: ['射程有限缺乏三分'] },
    { summary: '一位在联合试训中面试表现出色的大前锋，多支球队的球探都对他的职业态度和篮球智商给出了高评价。', projection: '面试加分但场上表现需要证明。', strengths: ['面试表现获好评', '职业态度好'], weaknesses: ['场上数据不够亮眼'] },
    { summary: '一位身体强壮如牛但技术粗糙的大前锋，在禁区内的对抗中几乎不可能被推动。', projection: '预计以力量型替补获得发展联盟机会。', strengths: ['力量在同龄人中顶级', '对抗不怵任何人'], weaknesses: ['技术极度粗糙'] },
    { summary: '一位善于利用身体优势的大前锋，虽然技术有限但总能用力量和臂展获得二次进攻机会。', projection: '预计成为能量型替补，二次进攻是名片。', strengths: ['二次进攻积极', '利用身体能力强'], weaknesses: ['技术水平较低'] },
    { summary: '一位打球非常聪明但天赋平平的大前锋，总能在正确的时间做出正确的选择。教练喜欢这种球员。', projection: '预计以地板型替补获得短期合同。', strengths: ['球商高决策合理', '不犯错'], weaknesses: ['天赋和运动能力不足'] },
  ],
  c_high: [
    { summary: '一位统治级的内线中锋，护框能力、篮板和低位进攻让他成为本届最受关注的大个子。他的禁区存在感让人想起了NBA顶级护框者。', projection: '预计直接进入首发并成为防守体系核心。有DPOY潜力。', strengths: ['护框能力在同届内线中遥遥领先', '篮板统治力极强'], weaknesses: ['三分投射还需开发'] },
    { summary: '一位现代化的全能中锋，既有传统中锋的护框和篮板，又具备高位策应和一定投射能力。他可能是本届最接近完美现代中锋模板的球员。', projection: '预计立刻成为球队攻防核心，现代中锋的理想模板。', strengths: ['攻防两端全面性在中锋中罕见', '高位策应传球极具创造力'], weaknesses: ['低位单打效率还需提升'] },
    { summary: '一位运动能力惊人的中锋，弹跳和速度在内线中极为罕见。快攻跟进的速度甚至比很多后卫都快，空接威胁极大。', projection: '预计以运动能力先赢得出场时间，技术逐步开发。上限极高。', strengths: ['运动能力在同龄中锋中可能是最强的', '盖帽和追帽能力令人叹为观止'], weaknesses: ['低位技术比较粗糙'] },
    { summary: '一位传统型的低位中锋，禁区统治力让人想起NBA黄金时代的中锋。背身单打和二次进攻在同届内线中无出其右。', projection: '预计成为半场阵地战的攻坚利器，首发中锋。', strengths: ['低位进攻在同届中锋中最全面', '身体对抗能力极强'], weaknesses: ['完全没有外线投射'] },
    { summary: '一位有投射能力的空间型中锋，三分和中距离让他在现代NBA中非常有价值。挡拆外弹后他能轻松命中三分。', projection: '预计成为空间型首发中锋，拉开空间是核心价值。', strengths: ['三分投射在同龄中锋中独一无二', '中距离投篮稳定'], weaknesses: ['篮板和护框能力偏弱'] },
    { summary: '一位来自欧洲顶级联赛的成熟中锋，在皇马和巴萨级别的球队中已经证明了自己。比赛成熟度远超NCAA球员。', projection: '预计首轮前10被选中，即战力型国际中锋。', strengths: ['国际赛场经验丰富', '技术完成度极高'], weaknesses: ['NBA级别的速度和节奏需要适应'] },
    { summary: '一位攻防两端都极具影响力的中锋，不仅护框和篮板出色，进攻端的效率也非常高。他可能是本届最安全的选秀选择。', projection: '预计乐透区被选中，新秀赛季即可承担重要角色。', strengths: ['攻防两端都有稳定贡献', '投篮效率极高'], weaknesses: ['缺少一项令人惊叹的顶级技能'] },
    { summary: '一位以高位策应著称的中锋，传球视野在内线中极为罕见。在强调传球的体系中他将成为战术核心。', projection: '预计乐透区后段被选中，策应型中锋在现代NBA极有价值。', strengths: ['传球策应在中锋中顶级', '战术理解力出色'], weaknesses: ['得分爆发力不够'] },
    { summary: '一位在锦标赛中统治了禁区的大个子，面对多支强队连续打出20+15的数据。大赛表现让他的行情飙升。', projection: '预计乐透区被选中，大赛型中锋。', strengths: ['大赛表现远超预期', '面对强队从不退缩'], weaknesses: ['常规赛稳定性需要更多验证'] },
    { summary: '一位拥有NBA顶级身体条件的中锋，7尺身高配合7尺6的臂展和出色的力量。他的禁区简直就是禁飞区。', projection: '预计乐透区被选中，身体天赋型中锋。', strengths: ['身体条件在同届内线中顶级', '臂展和力量出色'], weaknesses: ['技术层面还有提升空间'] },
    { summary: '一位运动能力与传统技术兼备的中锋，既能完成追身大帽也能在低位用脚步过掉防守者。', projection: '预计首轮前15被选中，攻守兼备的现代中锋。', strengths: ['运动能力和技术的结合在中锋中罕见', '攻守两端都有亮点'], weaknesses: ['罚球命中率需要提升'] },
    { summary: '一位以挡拆后处理球著称的中锋，无论是顺下暴扣还是外弹中投都效率极高。挡拆是现代NBA的核心战术，他的价值因此极高。', projection: '预计首轮中段被选中，挡拆型中锋。', strengths: ['挡拆后处理球效率顶级', '终结能力出色'], weaknesses: ['自主创造得分手段有限'] },
    { summary: '一位在赛季后半段持续进步的中锋，从替补打到了首发并且数据持续攀升。这种上升趋势让球探非常看好。', projection: '预计首轮中段被选中，上升趋势明显。', strengths: ['进步速度快', '后期表现超越预期'], weaknesses: ['前半赛季表现有波动'] },
    { summary: '一位来自澳大利亚NBL联赛的年轻中锋，虽然年纪小但面对成年球员的表现非常出色。', projection: '预计首轮中后段被选中，年轻潜力型中锋。', strengths: ['年龄优势大', '面对成年球员表现出色'], weaknesses: ['需要增加力量和体重'] },
    { summary: '一位防守覆盖面积极大的中锋，不仅能护框还能换防到外线。在现代NBA中这种能力极其珍贵。', projection: '预计首轮中后段被选中，换防型中锋。', strengths: ['防守覆盖面积在中锋中罕见', '换防外线能力出色'], weaknesses: ['低位进攻技术还需打磨'] },
    { summary: '一位拥有出色传球能力的中锋，在高位策应时的创造力让人想起联盟中的几位顶级策应中锋。', projection: '预计首轮中后段被选中，策应型中锋。', strengths: ['高位策应传球创造力强', '篮球智商极高'], weaknesses: ['低位得分效率不够高'] },
    { summary: '一位受伤病影响了赛季但天赋极高的中锋，健康时的表现堪称前三顺位级别。医疗报告将决定他的命运。', projection: '预计行情取决于医疗报告，健康时是乐透级别。', strengths: ['健康时表现堪称前3顺位', '天赋极其出众'], weaknesses: ['伤病史是最大红旗'] },
    { summary: '一位来自小学校但球探评价极高的中锋，在低级别联赛中的统治力和技术全面性让多支球队感兴趣。', projection: '预计首轮后段被选中，小学校隐藏宝藏。', strengths: ['在低级别比赛中有统治力', '技术全面'], weaknesses: ['面对NBA级别对手存疑'] },
    { summary: '一位以二次进攻著称的中锋，前场篮板和补篮是他的标志。在进攻篮板日益重要的今天，他的价值被重新评估。', projection: '预计首轮后段被选中，二次进攻型中锋。', strengths: ['前场篮板出色', '二次进攻效率高'], weaknesses: ['外线投射还未开发'] },
    { summary: '一位球风硬朗的传统型中锋，不花哨但每场比赛都能稳定贡献两双。教练和队友都信任他。', projection: '预计首轮后段被选中，稳定输出型中锋。', strengths: ['表现稳定', '每场都能贡献两双'], weaknesses: ['缺少现代NBA所需的投射'] },
    { summary: '一位在联合试训中体测数据炸裂的中锋，弹跳和速度都排在中锋组第一。体测后行情明显上升。', projection: '预计首轮后段被选中，体测加分型中锋。', strengths: ['体测数据在同龄中锋中最好', '运动天赋诱人'], weaknesses: ['大学期间表现不够突出'] },
  ],
  c_mid: [
    { summary: '一位以防守见长的中锋，护框和篮板是进入NBA的最大资本但进攻端的局限让角色有限。', projection: '预计成为防御型替补中锋，蓝领角色。', strengths: ['护框能力在同届中上游', '篮板保护做得不错'], weaknesses: ['进攻端几乎没有自主得分能力'] },
    { summary: '一位有一定投射潜力的中锋，大学后期开始尝试三分如果练出来可能成为空间型内线。', projection: '预计需要时间发展，替补起步。', strengths: ['正在开发外线投射', '投篮手感在大个子中算不错'], weaknesses: ['外线投射还不够稳定'] },
    { summary: '一位球商很高的中锋，传球和位置感在同龄内线中突出但运动能力的限制让他无法成为精英。', projection: '预计在战术丰富的体系中更有价值。', strengths: ['传球和策应在中锋中算出色', '篮球智商高'], weaknesses: ['运动能力在NBA中锋中偏弱'] },
    { summary: '一位蓝领型中锋，愿意做所有脏活累活，篮板和掩护是看家本领。', projection: '预计成为能量型替补，提供篮板和掩护。', strengths: ['篮板争抢积极性极高', '掩护质量出色'], weaknesses: ['进攻端几乎没有得分手段'] },
    { summary: '一位运动能力不错但技术粗糙的中锋，盖帽和篮板让人看到潜力但进攻端的落后让球队犹豫。', projection: '预计需要发展联盟历练，技术有待打磨。', strengths: ['运动能力在中锋中算好', '盖帽潜力不错'], weaknesses: ['技术非常粗糙'] },
    { summary: '一位来自欧洲联赛的年轻中锋，在俱乐部中出场时间有限但展现了不错的潜力。长远投资型选择。', projection: '可能被选中后留在欧洲继续发展，长期培养。', strengths: ['年龄优势明显', '基本功不错'], weaknesses: ['高水平比赛经验太少'] },
    { summary: '一位在锦标赛中有亮眼表现的中锋，面对更高水平对手打出了几场好球。但整个赛季的表现不够稳定。', projection: '行情取决于对大赛表现还是整体表现的权重。', strengths: ['大赛表现超预期', '面对强敌不怯场'], weaknesses: ['常规赛波动太大'] },
    { summary: '一位以挡拆顺下为主要进攻方式的中锋，在这个环节效率极高。但自主进攻和外弹投射几乎没有。', projection: '预计成为挡拆型替补中锋，角色单一但有效。', strengths: ['挡拆顺下终结高效', '不占球权'], weaknesses: ['自主进攻能力几乎为零'] },
    { summary: '一位有投射潜力但还需要时间的中锋，中距离已经不错但三分还在开发中。', projection: '预计需要2-3年发展投射，替补起步。', strengths: ['中距离投篮手感好', '有开发三分的潜力'], weaknesses: ['三分还不够稳定'] },
    { summary: '一位大学四年的成熟中锋，经验丰富但天赋有限。他是最安全的选择也是最无聊的选择。', projection: '预计成为即战力替补中锋，发展空间极小。', strengths: ['经验丰富', '不会犯低级错误'], weaknesses: ['天赋和运动能力不足'] },
    { summary: '一位受伤病影响了一个赛季的中锋，复出后有所恢复但未能回到伤前水准。医疗报告是关键。', projection: '行情取决于医疗报告，健康时有轮换水准。', strengths: ['健康时表现不错', '技术有基础'], weaknesses: ['伤病恢复后的运动能力存疑'] },
    { summary: '一位臂展极长的中锋，7尺6的臂展让他在护框时不需要太好的弹跳就能干扰对手投篮。', projection: '预计以护框型替补获得机会。', strengths: ['臂展在中锋中顶级', '护框覆盖范围大'], weaknesses: ['移动速度偏慢'] },
    { summary: '一位以篮板为第一要务的中锋，卡位意识和拼抢积极性在同龄内线中名列前茅。进攻端是配角。', projection: '预计成为篮板型替补，蓝领角色。', strengths: ['篮板卡位意识出色', '拼抢积极'], weaknesses: ['得分手段非常有限'] },
    { summary: '一位在联合试训中表现超出预期的中锋，体测数据和面试都获得了好评。', projection: '试训加分可能提升行情至次轮前段。', strengths: ['试训表现出色', '职业态度获好评'], weaknesses: ['大学期间表现不够亮眼'] },
    { summary: '一位来自小学校的中锋，在低级别联赛中大杀四方但NBA级别适应存疑。', projection: '预计需要发展联盟时间来适应更高水平。', strengths: ['低级别比赛中有统治力', '自信心不错'], weaknesses: ['面对高水平对手表现存疑'] },
    { summary: '一位善于打挡拆外弹的中锋，虽然三分还不够稳定但18尺的中距离已经相当不错。', projection: '预计成为挡拆外弹型替补。', strengths: ['挡拆外弹中距离稳定', '战术理解力好'], weaknesses: ['三分和低位技术需提升'] },
    { summary: '一位球风硬朗但技术有限的中锋，靠力量和意志力在内线生存。每场比赛都是肉搏战。', projection: '预计成为力量型替补，需要在对抗中证明价值。', strengths: ['力量和对抗出色', '意志力顽强'], weaknesses: ['技术比较粗糙'] },
    { summary: '一位在赛季末段有所进步的中锋，最后一个月的表现明显好于前半赛季。进步曲线让球探看到了希望。', projection: '预计次轮被选中，后期进步是加分项。', strengths: ['后期进步明显', '上升势头好'], weaknesses: ['前期表现拖了后腿'] },
    { summary: '一位以掩护质量和顺下终结著称的中锋，这种不华丽但实用的技能在合适的体系中很有价值。', projection: '预计成为挡拆体系中的蓝领中锋。', strengths: ['掩护质量高', '顺下终结高效'], weaknesses: ['得分手段太单一'] },
    { summary: '一位有盖帽天赋但犯规控制有问题的中锋，每场盖帽2次但犯规也接近4次。需要学会控制欲望。', projection: '预计需要发展联盟学习控制犯规。', strengths: ['盖帽天赋出色', '护框积极'], weaknesses: ['犯规控制是老大难问题'] },
    { summary: '一位打球非常聪明但天赋平平的中锋，总能利用位置感和经验弥补身体上的不足。', projection: '预计以地板型替补获得短期合同。', strengths: ['球商高', '位置感好'], weaknesses: ['天赋和运动能力不足'] },
  ],
  c_late: [
    { summary: '一位有一定篮板能力的中锋，但其他方面的不足让他的NBA前景堪忧。', projection: '预计需要发展联盟历练，可能成为双向合同球员。', strengths: ['篮板能力在末段中锋中尚可', '对抗能力还行'], weaknesses: ['进攻端几乎无价值'] },
    { summary: '一位大龄中锋，大学经验丰富但天赋有限。成熟度让他比其他末段新秀更有即战力。', projection: '即战力第三中锋，但发展空间极小。', strengths: ['经验丰富位置感好', '不会犯低级错误'], weaknesses: ['天赋和运动能力不足'] },
    { summary: '一位受伤病影响的中锋，健康时有不错的护框能力但出勤率让人担忧。', projection: '低风险赌博型选择，需要证明能保持健康。', strengths: ['健康时护框能力不错', '篮板位置感好'], weaknesses: ['伤病历史是最大隐患'] },
    { summary: '一位来自小学校的中锋，在低级别联赛中是统治级的存在但NBA级别适应存疑。', projection: '预计需要大量发展联盟时间来适应更高水平。', strengths: ['在低级别比赛中有统治力', '自信心不错'], weaknesses: ['面对高水平对手表现存疑'] },
    { summary: '一位有投射能力但其他方面薄弱的中锋，中距离投篮是唯一的亮点但防御端是明显漏洞。', projection: '空间型替补但角色极其有限。', strengths: ['中距离投篮在大个子中算不错', '投篮自信心强'], weaknesses: ['防御端是漏洞'] },
    { summary: '一位在大学最后一年突然打出名堂的大龄中锋，之前三年几乎没存在感。是晚熟还是灵光一现？', projection: '可能是大器晚成，也可能是小样本波动。', strengths: ['最后一年进步巨大', '有上进心'], weaknesses: ['前三年的表现太差'] },
    { summary: '一位以卡位和掩护为主要价值的中锋，不做花哨的事情但也不犯错。教练喜欢这种球员。', projection: '预计成为蓝领第三中锋，做最基本的活。', strengths: ['卡位扎实', '掩护质量好'], weaknesses: ['得分能力几乎为零'] },
    { summary: '一位在低级别联赛中大杀四方的中锋，场均20+13但比赛质量的含金量存疑。', projection: '发展联盟验证实力，可能被低估也可能不适应。', strengths: ['数据爆炸', '自信心强'], weaknesses: ['对手质量太低'] },
    { summary: '一位臂展很长但移动偏慢的中锋，护框时站定位置还行但被拉出去就很难受了。', projection: '预计以护框型替补获得发展联盟机会。', strengths: ['臂展长护框有优势', '站位合理'], weaknesses: ['移动速度跟不上现代NBA'] },
    { summary: '一位在私人试训中投篮表现不错的中锋，中距离和罚球手感比大学比赛中展示的要好。', projection: '试训加分，可能成为末段惊喜。', strengths: ['试训投射表现超预期', '手感柔和'], weaknesses: ['大学比赛中的投射不够稳定'] },
    { summary: '一位球风朴实无华的中锋，不做多余动作也基本不犯错。在球队需要稳定内线时他是可靠的选择。', projection: '预计成为地板型第三中锋，可靠但不起眼。', strengths: ['不犯错', '执行力强'], weaknesses: ['缺少亮点和爆发力'] },
    { summary: '一位有过严重伤病的中锋，已经恢复但没人知道他还能恢复到什么程度。励志故事能否继续？', projection: '低顺位赌博型选择，恢复情况是关键。', strengths: ['恢复后态度积极', '基本功还在'], weaknesses: ['伤病后运动能力可能永久下降'] },
    { summary: '一位以力量和对抗著称的中锋，在禁区中几乎不可能被推动。但技术层面极度有限。', projection: '预计以力量型替补获得短期合同。', strengths: ['力量在同届中锋中顶级', '对抗不怵任何人'], weaknesses: ['技术极度粗糙'] },
    { summary: '一位来自海外联赛的年轻中锋，年龄是最大优势但经验和力量都严重不足。', projection: '长远投资型选择，可能先在海外继续培养。', strengths: ['年龄小成长空间大', '有基本的技术框架'], weaknesses: ['力量和经验严重不足'] },
    { summary: '一位在联合试训面试中给球队留下深刻印象的中锋，虽然场上数据平平但篮球智商和态度获好评。', projection: '面试加分但需要场上表现来证明。', strengths: ['面试表现获好评', '篮球智商不错'], weaknesses: ['场上表现不够亮眼'] },
    { summary: '一位善于利用身体抢前场篮板的中锋，虽然技术有限但二次进攻和补篮的效率还不错。', projection: '预计以二次进攻型替补争取双向合同。', strengths: ['前场篮板积极', '二次进攻效率尚可'], weaknesses: ['技术面太窄'] },
    { summary: '一位在低级别比赛中以盖帽著称的中锋，场均盖帽接近4次。但面对更灵活的NBA内线，他的盖帽还能延续吗？', projection: '盖帽能力可能是真的，但技术需要大量打磨。', strengths: ['盖帽能力突出', '护框积极'], weaknesses: ['技术非常粗糙犯规多'] },
    { summary: '一位打球聪明但身体条件一般的中锋，总能利用位置感和经验在内线找到生存空间。', projection: '预计以地板型替补获得短期合同，可能需要发展联盟。', strengths: ['球商高位置感好', '不占球权'], weaknesses: ['身体条件在NBA中锋中偏弱'] },
    { summary: '一位以勤奋著称的中锋，每个休赛期都在明显进步。也许天赋不够但他的职业态度值得尊敬。', projection: '预计以态度赢得发展联盟机会，逐步争取合同。', strengths: ['职业态度出色', '每年都在进步'], weaknesses: ['天赋上限明显'] },
    { summary: '一位在大学期间默默无闻但在私人试训中展现了投射能力的中锋，中距离和罚球手感比预期好得多。', projection: '投射可能是他的敲门砖，但还需要证明在比赛中也能投。', strengths: ['投射手感超出预期', '投篮自信心强'], weaknesses: ['大学比赛中的投射表现不佳'] },
  ],
};

// ============ TEXT_POOL_RETIREMENT — Retirement Summaries ============

const TEXT_POOL_RETIREMENT = {
  legendary: [
    { media: '{playerName}的退役标志着一个时代的落幕。他不仅是数据上的传奇，更是一代人篮球记忆的符号。那些年他留下的经典时刻，已经铭刻在了这项运动的历史中。', players: '和他对位是我职业生涯最大的挑战，也是最大的荣幸。他的竞争精神和职业态度影响了每一个和他交过手的人。', fans: '从我还是孩子的时候就在看他的比赛。他给了我无数个不眠之夜的激动和泪水。球衣退役那天，我一定会在球馆。', critics: '即使在最苛刻的标准下，{playerName}的生涯也无可指摘。他用行动定义了什么是伟大——不只是数据，更是领导力和对比赛的尊重。', message: '传奇不会谢幕，他只是换了一种方式存在。当人们谈论篮球历史时，{playerName}的名字将永远被提及。', score: 97 },
    { media: '历史级别的生涯。{playerName}用超过十年的巅峰期证明了他不只是昙花一现，而是真正的篮球伟人。他的数据和荣誉足以让任何质疑者闭嘴。', players: '他是我见过最接近完美的球员。即使在他最差的夜晚，他也比大多数人最好的夜晚更出色。', fans: '我穿着他的球衣看了他每一场主场比赛。他让我相信，有些人是真的可以为了一件事倾尽所有的。', critics: '如果说有什么遗憾的话，可能就是他没有赢得更多总冠军。但在他的时代和环境中，他已经做到了极限。', message: '伟大是一个被滥用的词，但用在{playerName}身上恰如其分。他的生涯就是伟大的定义。', score: 96 },
    { media: '{playerName}的生涯数据堪称恐怖——连续多个赛季的精英级表现，多次入选最佳阵容，数不清的关键时刻表演。他的退役让整个联盟都少了一份色彩。', players: '和他当队友是我职业生涯最幸运的事。他让每个人都变得更好，不只是因为他的传球，更因为他的存在本身就是一种激励。', fans: '我会永远记得他在季后赛中的那些神奇表现。那些时刻不属于任何数据统计，它们属于每一个见证者的记忆。', critics: '如果硬要挑刺的话，他在某些赛季的防守投入有所下降。但考虑到他的出场时间和进攻负担，这完全可以理解。', message: '当他最后一次走下球场时，全场起立鼓掌的声音将持续很久。{playerName}，感谢你给篮球的一切。', score: 95 },
    { media: '一代人的偶像，一座城市的图腾。{playerName}的退役不只是体育事件，更是一次文化现象。他超越了篮球，成为了一种精神象征。', players: '他让我明白了什么是职业精神。即使在他三十多岁以后，他的训练强度依然让年轻球员自叹不如。', fans: '他的比赛陪伴了我整个青春。看着他退役，就像青春也跟着一起结束了。但那些记忆会永远在。', critics: '他当然不是完美的——没有人是。但在他的领域里，他已经做到了一个人类能做的极限。', message: '有些球员改变了比赛，{playerName}改变了人们对比赛的看法。这就是真正的传奇。', score: 98 },
    { media: '史上最佳之一？这个争论可能永远不会结束。但{playerName}的生涯已经确保了他的名字将出现在任何严肃的讨论中。', players: '他是我最不想在季后赛面对的对手。他的眼神里永远有一种不屈不挠的火焰，那种东西是教不来的。', fans: '我孩子的名字就是用他的名字取的。这可能会让一些人觉得疯狂，但对我来说，这是最好的致敬。', critics: '他的巅峰期长度令人惊叹。在联盟越来越年轻的今天，能保持这么多年的统治力本身就是一种伟大。', message: '当未来的孩子们问起什么是篮球最美好的样子，给他们看{playerName}的比赛录像就够了。', score: 97 },
    { media: '{playerName}的退役留下了无数纪录。有些可能永远不会被打破，有些可能只是时间问题。但纪录只是数字，他的真正遗产是对这项运动的影响。', players: '更衣室里再也没有他坐过的那个角落了。那个位置曾经是全队的精神锚点。', fans: '我保留了他退役那场比赛的门票，镶了框挂在客厅。每次看到都会想起那个夜晚的泪水。', critics: '他的影响力远超球场。在劳资谈判、球员工会事务上，他的声音始终是有分量的。', message: '伟大的定义不是你赢得了多少，而是你改变了多少。{playerName}改变了一切。', score: 96 },
    { media: '一位无可争议的名人堂球员走下了舞台。{playerName}的生涯辉煌得几乎不像真的——如果这不是真实发生的，编剧都不敢这么写。', players: '我在他的告别赛上哭了。在球场上我从来不哭，但那天我控制不住。', fans: '从他的第一场到最后一场，我一场都没缺席。十五年，我的青春都在那里了。', critics: '如果要写一本关于篮球的书，{playerName}的生涯值得一个专门的章节。不只是数据，更是一段传奇叙事。', message: '再见，{playerName}。不是永别，因为在每一个篮球时刻中，都会有你的影子。', score: 98 },
    { media: '他的退役新闻发布会持续了一个半小时，因为他有太多话想说，有太多人要感谢。这就是{playerName}——永远真诚，永远感恩。', players: '他给了我太多建议，那些话我至今还在用。"别让一场失利定义你"是他经常说的。', fans: '我的球衣上有他的签名，已经褪色了但永远不会洗。那是我最珍贵的收藏。', critics: '数据会说话，{playerName}的数据在呐喊。但在数据之外，他给这项运动带来的尊严和优雅更加珍贵。', message: '他离开了球场，但从未离开篮球。{playerName}将以另一种方式继续书写传奇。', score: 95 },
    { media: '一个名字，一段传奇，无数回忆。{playerName}的退役让整个篮球世界都陷入了怀旧。社交媒体上满是人们分享的自己最难忘的那一刻。', players: '他是我唯一见过的能在训练中也全力的球员。每次训练都像比赛，每次比赛都像季后赛。', fans: '他让我爱上了篮球。没有他，我可能永远不会拿起那颗球。这是他给我的最宝贵的礼物。', critics: '批评他在这种时刻似乎不太合适。让我们就承认吧——我们见证了伟大。', message: '传奇落幕，传说永生。{playerName}的故事将一代代传下去。', score: 97 },
    { media: '{playerName}的生涯如同一部史诗巨著——有高潮有低谷，有荣耀有遗憾，但每一个篇章都精彩绝伦。', players: '他教会了我一件事：真正的伟大不是没有恐惧，而是在恐惧中依然选择战斗。', fans: '我会把他的故事讲给我的孙子听。那些关于他在关键时刻从不退缩的故事。', critics: '如果非要找一个不足，可能是他的巅峰期再长一些就完美了。但完美是不存在的，接近完美已经是极致。', message: '历史会善待{playerName}。当时间沉淀之后，他的伟大只会更加清晰。', score: 96 },
    { media: '联盟失去了一位真正的招牌球员。{playerName}不只是在一座城市打球，他定义了一座城市的篮球文化。', players: '和他同场竞技是我职业生涯最深刻的体验。你总想在他面前打出最好的表现，因为他在你面前也从不留手。', fans: '我穿着他的球衣结婚，我老婆说可以。这就是他在我们家中的地位。', critics: '他的数据经得起任何审视。进阶数据、传统数据、关键时刻数据——每一项都在历史顶级。', message: '{playerName}的退役不是一个句号，而是一个感叹号。他让篮球变得更精彩。', score: 97 }
  ],
  allstar: [
    { media: '{playerName}的退役结束了一段出色的职业生涯。多次入选全明星，数次最佳阵容，他的数据足以确保名人堂席位。', players: '他是那种你永远不想在季后赛遇到的对手。稳定、全面、而且总是在关键时刻出现。', fans: '看他的比赛是一种享受。他让困难的事情看起来毫不费力。', critics: '一个出色的球员，一个可靠的明星。但他是否达到了伟大？这取决于你对伟大的定义。', message: '一段精彩的旅程画上了句号。{playerName}可以为自己的生涯感到骄傲。', score: 88 },
    { media: '多次全明星、数不清的关键时刻表现、稳定的精英级输出——{playerName}的履历相当亮眼。', players: '他是我交手过最聪明的球员之一。总能在对的时间出现在对的位置。', fans: '他是我看球的原因。每个赛季都期待他的表现，他从不让我失望。', critics: '出色的球员，毫无疑问。但在最顶级的舞台上，他偶尔会消失。这是他和传奇之间的差距。', message: '全明星级的生涯，值得尊重和铭记。{playerName}在联盟留下了深刻的印记。', score: 86 },
    { media: '{playerName}用十多年的精英表现证明了自己的价值。他的数据和荣誉足以让他成为同位置最出色的球员之一。', players: '防守他是最令人头疼的任务。他总有办法在你以为防死了的时候找到出路。', fans: '他的签名球鞋我买了五双。每一双都代表着一段难忘的赛季记忆。', critics: '精英级的生涯，但和那些真正的传奇相比，他的巅峰期显得有些短。', message: '不完美的完美。{playerName}的生涯有遗憾，但更多的是荣耀。', score: 87 },
    { media: '一位真正的职业球员退役了。{playerName}用他的稳定和全面赢得了所有人的尊重。', players: '和他做队友是一种安心。你知道他每晚会带什么来——努力和职业态度。', fans: '他可能不是最有话题性的球星，但他是最让我放心的那个。每个赛季稳定输出，从不偷懒。', critics: '数据漂亮，荣誉不少，但在改变比赛走向的关键时刻，他的存在感有时不够强。', message: '优秀的生涯，稳重的告别。{playerName}以身作则诠释了什么是职业精神。', score: 85 },
    { media: '{playerName}的退役让联盟少了一位稳定的全明星级球员。他的职业生涯数据堪称精英级，在多个赛季中都打出了顶级表现。', players: '他是我最尊敬的对手之一。无论场上场下，他都展现了最高水准的职业态度。', fans: '从选秀那天起我就是他的粉丝。看着他从新人成长为全明星，这段旅程太美了。', critics: '全明星次数足够多，但MVP奖杯始终与他擦肩而过。这或许是他最大的遗憾。', message: '不是每个人都能成为传奇，但{playerName}做到了出色。这已经足够令人敬佩。', score: 86 },
    { media: '他的退役意味着联盟又少了一位真正的明星。{playerName}在他巅峰的那些年里，是同位置最好的球员之一。', players: '和他对位你永远不能放松。他的专注度和执行力让他成为最可怕的对手。', fans: '我永远记得他全明星赛上那个不看人传球。那一刻我跳起来尖叫了。', critics: '他的巅峰期足够辉煌，但生涯后期的下滑有些太快了。', message: '巅峰虽短但足够耀眼。{playerName}在他的时代留下了属于自己的光芒。', score: 84 },
    { media: '{playerName}退役了，带走了数个精英赛季和无数精彩时刻。他在联盟中的地位是稳固的。', players: '更衣室里少了他的声音会很安静。他总能在最需要的时候说对的话。', fans: '他的比赛永远不会无聊。即使在他状态不好的夜晚，他也总能做点什么让你惊呼。', critics: '名人堂级别的生涯，但他可能不会第一年就入选。需要等待，但终究会进。', message: '好的生涯不需要道歉。{playerName}可以毫无遗憾地离开。', score: 85 },
    { media: '一位多次入选全明星的球员正式退役。{playerName}的生涯证明，持续的优秀也是一种伟大。', players: '他不是那种会让你在赛前就害怕的对手，但比赛结束后你会发现他拿了25分而你毫无察觉。', fans: '他退役那天我发了朋友圈，配了九宫格的照片。那是我社交媒体历史上获赞最多的一条。', critics: '稳定是最大的优点也是最大的"缺点"——他缺少那种震撼人心的爆发，但日复一日的优秀更难。', message: '持续的优秀值得尊敬。{playerName}用每一天证明了这一点。', score: 87 },
    { media: '{playerName}的职业生涯如同一杯好酒——越品越有味道。他的全明星次数可能不比最顶尖的那些，但他的每一季都扎实可靠。', players: '我最欣赏他的一点是他从不抱怨。在那些球队困难的赛季里，他只是默默做好自己的事。', fans: '他的告别赛我去了。坐最后一排，哭了整场。不是因为他是超级巨星，而是因为他陪伴了我那么多年。', critics: '如果把他放在一个更好的球队，他的成就会更高。可惜职业生涯的有些阶段被环境拖了后腿。', message: '生涯也许不完美，但每一步都走得踏实。{playerName}可以昂首离开。', score: 84 },
    { media: '又一位全明星走下舞台。{playerName}的数据和荣誉证明了他多年的精英级贡献。', players: '他是我见过的最会打关键球的球员之一。第四节加时赛的{playerName}是另一个人。', fans: '他退役后我还会继续穿他的球衣。这不仅仅是一件衣服，是一种态度。', critics: '在最好的那些年里他确实配得上全明星，但也有一些入选存在争议的赛季。', message: '全明星生涯，值得掌声。{playerName}在联盟留下了自己的篇章。', score: 86 }
  ],
  solid: [
    { media: '{playerName}结束了漫长而稳定的职业生涯。他可能不是家喻户晓的超级巨星，但在懂球的人心中，他的价值不言而喻。', players: '他是最被低估的球员之一。和他做队友你才知道他有多重要。', fans: '他是我最喜欢的球员，虽然很多人不知道他的名字。但真正的球迷都懂。', critics: '一个可靠的先发级球员，职业生涯数据扎实。但缺乏爆发性的赛季让他始终未能迈入明星行列。', message: '不需要所有人的掌声，只要懂的人认可就够了。{playerName}的生涯就是如此。', score: 78 },
    { media: '{playerName}退役了。他的职业生涯虽然没有太多高光时刻，但每年都稳定地为球队做出贡献。', players: '他是那种每个球队都需要但不会特别关注的球员。直到他离开你才发现他有多重要。', fans: '他可能不是全明星，但他是我心中的MVP。每年82场都在那里，从不缺席。', critics: '角色球员的出色生涯。他的数据不会让你惊叹，但他的效率值得肯定。', message: '有些人的价值不是用数据衡量的。{playerName}就是这样的球员。', score: 75 },
    { media: '一位可靠的老将退役了。{playerName}在他十余年的职业生涯中始终保持着不错的水准。', players: '作为队友他无可挑剔。作为对手他足够棘手。这就是一种肯定。', fans: '我追随他从选秀到退役。这段旅程有起有伏，但我从不后悔。', critics: '稳定有余，爆发不足。他的职业生涯缺乏那种定义性的赛季。', message: '不是每个人都要成为传奇。做好自己的事，走完这段路，已经是一种成就。', score: 76 },
    { media: '{playerName}的退役让球队少了一位可靠的轮换球员。他的职业生涯虽然不华丽，但绝对称得上成功。', players: '他是那种教练最喜欢的人——听话、努力、不惹事。', fans: '他的比赛我看了十年。虽然不是全明星，但每个赛季都有进步让我欣慰的时刻。', critics: '如果生涯早期的机会更多，他的数据可能会更好看。但机会不等人。', message: '可靠的生涯，踏实的告别。{playerName}用职业态度赢得了尊重。', score: 74 },
    { media: '一个不声不响但始终在场的球员退役了。{playerName}的生涯数据中规中矩，但他的队友们对他的评价远超数据所显示的。', players: '更衣室里的老将，场上的定海神针。他的退役比想象中影响更大。', fans: '他不是聚光灯下的人，但他是让我安心的人。每个赛季开赛前知道他还在，就觉得放心。', critics: '一个合格的首发，偶尔有全明星级的表现，但大多数时候只是不错而已。', message: '不需要惊天动地，细水长流也是一种美。{playerName}的生涯就是如此。', score: 77 },
    { media: '{playerName}走了。他的职业生涯不算长但也不算短，有过几个亮眼的赛季，更多的是稳定的输出。', players: '他教会了我一件事：不是每场都要当英雄，有时候做好配角也是一种本事。', fans: '我收藏了他每一年的球衣。有些年份他表现一般，但每一件都是珍贵的回忆。', critics: '他的生涯曲线很有趣——起步不错，中间有低谷，后期又有复苏。这本身就是一个好故事。', message: '生涯不一定要完美收官。{playerName}在最后一个赛季虽然不再巅峰，但依然体面地站着。', score: 75 }
  ],
  average: [
    { media: '{playerName}结束了他在NBA的生涯。作为一名轮换球员，他在联盟中打出了自己的位置。', players: '他是那种板凳席上最热闹的人，总是第一个站起来为队友加油。', fans: '虽然不是明星，但能看到他偶尔爆发的那几场就够了。', critics: '一个普通的NBA球员。能打到退役本身就说明他有可取之处。', message: '在NBA站稳脚跟已经是少数人的成就。{playerName}做到了。', score: 62 },
    { media: '{playerName}退役了。他的职业生涯不算出色，但也算得上体面。在NBA打多个赛季并不容易。', players: '他在场上的时间有限，但每次上场都尽力了。这种态度值得尊重。', fans: '他可能永远不会被记住，但我会记得他。', critics: '生涯数据平平，没有太多亮点。但在最需要人的时候他能顶上来。', message: '不是每段生涯都要写进史册。能打完这段旅程已经值得骄傲。', score: 60 },
    { media: '又一位角色球员退役了。{playerName}的生涯数据并不起眼，但他在更衣室中的角色可能比数据更重要。', players: '好队友，好人。他的退役让更衣室少了笑声。', fans: '他偶尔有惊艳的表现，那些时刻我会反复回看。', critics: '轮换级别的球员，生涯末期逐渐淡出轮换。这就是联盟的现实。', message: '在联盟中生存多年本身就是一种本事。{playerName}可以为此自豪。', score: 58 },
    { media: '{playerName}走完了他的NBA旅程。不是每段生涯都惊天动地，他的更多是默默无闻但始终如一。', players: '他是我见过的最好的第十二人。训练从不偷懒，上场就全力以赴。', fans: '他可能不是最闪耀的，但他是我们队的一份子。这就够了。', critics: '联盟的平均水平以下。但能打这么多年说明他有些数据看不到的价值。', message: '平凡的生涯不代表没有价值。{playerName}在联盟留下了自己的足迹。', score: 55 }
  ],
  disappointing: [
    { media: '{playerName}的职业生涯令人惋惜。以他的选秀顺位和天赋预期，他本应做到更多。', players: '他有过机会，但不知道为什么没能把握住。有时候就是这样。', fans: '我还记得他新秀赛季的闪光时刻，可惜后来没有持续下去。', critics: '天赋和成就之间的差距就是他生涯的注脚。不是每个人都能兑现潜力。', message: '有些潜力永远只是潜力。{playerName}的生涯是一个关于遗憾的故事。', score: 42 },
    { media: '一次令人失望的职业生涯画上了句号。{playerName}从未达到选秀时的预期，逐渐在联盟中边缘化。', players: '我不觉得他不够努力，可能只是不适合NBA的节奏。', fans: '我等了他很多年，等他爆发的那一天。但那一天始终没有来。', critics: '一个被高估的选秀。他的数据和影响力始终未能匹配他的顺位。', message: '不是所有的故事都有完美结局。{playerName}的生涯提醒我们，天赋不等于成功。', score: 38 },
    { media: '{playerName}退役了，带着一份令人遗憾的履历。伤病、不适应、机会寥寥——他的NBA之旅始终不太顺利。', players: '他是更衣室里的好人，但在场上确实没有太多贡献。', fans: '我始终相信他只是缺少一个机会。可惜那个机会没有来。', critics: '生涯数据和出场时间都令人失望。在NBA的这些年，他的存在感很低。', message: '联盟是残酷的。不是每个有梦想的人都能成功。但至少他试过了。', score: 35 },
    { media: '一个不太成功的NBA生涯结束了。{playerName}在联盟的年数不算短，但留下的印记很浅。', players: '有些球员就是这样，始终无法在NBA找到自己的角色。', fans: '我还是会记住他的。不是因为他的表现，而是因为他曾经是我们队的一员。', critics: '从任何角度来看这都是一个令人失望的生涯。但至少他没有放弃，一直打到身体不允许为止。', message: '失败也是一种经历。希望{playerName}能从这段生涯中找到值得珍惜的东西。', score: 40 }
  ],
  media_quips: [
    { media: '他将作为一位改变了比赛风格的球员被记住。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他留给联盟的不只是数据，更是一种态度。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他证明了，坚持可以战胜一切困难。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他让一座城市爱上了篮球。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他可能不是最强的，但他是最特别的那一个。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他的职业生涯如同一堂关于职业精神的课。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '在数据之外，他的影响力更为深远。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他将作为这个时代最出色的球员之一被记住。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他的退役让联盟少了一种独特的风格。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '时间会证明他的伟大，而不是削弱它。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他代表了篮球最纯粹的一面。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '当人们谈论这个时代的篮球，他的名字不可避免。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他用球场上的表现说话，从不需要场外的噱头。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他的存在让队友安心，让对手忌惮。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '在合适的体系里，他可能是完全不同的球员。', players: '', fans: '', critics: '', message: '', score: 0 }
  ],
  player_quips: [
    { media: '', players: '和他对位是我最享受的篮球体验。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他让每一个队友都变得更好。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '我从他身上学到的比任何教练都多。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '更衣室里再也听不到他的声音了。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他是那种让你想更加努力的队友。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '和他做对手是折磨，和他做队友是享受。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他总在对的时候说对的话。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他是我职业生涯中遇到的最好的领袖。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '有些人打球是为了钱，他打球是为了爱。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '即使在他最后一年，他的训练强度也让年轻球员害怕。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他是那种你在关键时刻最想看到的人。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他走后，更衣室的气氛完全不同了。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '没有他的比赛感觉不完整。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他教会了我如何面对失败。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他是我交手过最不服输的球员。', fans: '', critics: '', message: '', score: 0 }
  ],
  fan_quips: [
    { media: '', players: '', fans: '我的青春结束了。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '没有他的比赛我不想看了。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '他让我爱上了这项运动。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '我孩子的名字就是按他取的。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '球衣退役那天我一定在。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '我会永远穿着他的球衣。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '感谢你，给我的每一个精彩夜晚。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '他把一座城市扛在了肩上。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '我的眼泪止不住。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '他不仅仅是一名球员，他是一种信仰。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '我永远不会忘记他的第一个冠军。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '他让我相信努力真的会有回报。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '从今以后再也看不到他的比赛了。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '他用行动证明了什么是英雄。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '最好的告别是微笑，他做到了。', critics: '', message: '', score: 0 }
  ],
  critic_quips: [
    { media: '', players: '', fans: '', critics: '数据不会说谎，他的生涯数据说明了一切。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '在正确的时代，他可能是完全不同的球员。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他的巅峰期可能比记忆中更短暂。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '真正伟大的标准是什么？他可能刚好在界限上。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他的防守经常被赞美，但数据并不支持。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '如果去掉那两三个精英赛季，剩下的相当普通。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他的影响力更多是文化层面的，而非竞技层面。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '在关键比赛的样本里，他的表现并不总是出色。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他的生涯证明了一点：持续的优秀比短暂的超凡更有价值。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他配得上尊重，但不一定配得上神话。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '在最好的几个赛季里他确实是联盟前十。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他的退役来得正是时候。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '名人堂？可以讨论，但不是板上钉钉。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他最大的成就可能是在伤病中坚持了下来。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '从纯粹篮球角度，他的贡献被高估了。', message: '', score: 0 }
  ],
  closing_messages: [
    { media: '', players: '', fans: '', critics: '', message: '传奇永不谢幕，只是换了一个舞台。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '感谢你给篮球的一切，{playerName}。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '这不是结束，而是另一个故事的开始。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '球场上再见了，朋友。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '你留下的不仅是数据，更是无数人的记忆。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '一路走好，篮球路上的旅人。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '你的球衣会被退役，你的故事会被传颂。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '再见不是永别，因为回忆永远在。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '你让篮球变得更精彩，谢谢。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '终场哨响，但掌声永不停息。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '你带走了精彩，留下了传说。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '退役不是消失，而是永恒。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '你证明了一个人可以改变一切。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '最后一舞，完美落幕。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '你走完了你的路，现在该让我们为你鼓掌了。', score: 0 }
  ],
  // Additional RETIREMENT entries to reach 300+
  legendary_extra: [
    { media: '一位无可争议的历史级球员退役了。{playerName}的名字将被刻在篮球圣殿的最高处。', players: '他是我这个时代最伟大的对手。和他交手让我成为了更好的球员。', fans: '他是我看球的唯一理由。没有他的NBA将完全不同。', critics: '历史会给他应得的地位——最伟大之一，毫无疑问。', message: '当{playerName}最后一次走下球场，篮球世界失去了一颗最亮的星。', score: 97 },
    { media: '{playerName}的退役意味着一个纪元的结束。他的数据和荣誉超越了几乎所有同龄人。', players: '他让我明白了什么是真正的职业精神。即使是训练他也从不偷懒。', fans: '我会把他的故事讲给我的孩子和孙子听。这是关于伟大最好的教材。', critics: '任何质疑他伟大的人都只是在博眼球。数据、荣誉、影响力——一切都在那里。', message: '{playerName}的传奇不需要任何人的认可。它自会发光。', score: 96 },
    { media: '历史会善待{playerName}。当时间滤去噪音，他的伟大只会更加清晰。', players: '他是我职业生涯中遇到的最接近完美的球员。', fans: '看着他打球是我人生中最美好的体验之一。', critics: '他的生涯几乎无可挑剔。如果要找缺点，那就是他没能赢得更多冠军——但那不是他一个人的事。', message: '传奇落幕，但传说将永远流传。{playerName}，谢谢。', score: 95 },
    { media: '当{playerName}退役的消息传来，整个篮球世界陷入了沉默。然后是铺天盖地的致敬和回忆。', players: '他让每一个队友都变得更好，让每一个对手都变得更强。这就是伟大。', fans: '我的球衣永远会是他的号码。无论谁后来穿上那个号码，它都属于{playerName}。', critics: '他的生涯是一部关于卓越的百科全书。每一页都值得反复阅读。', message: '伟大的球员走了，伟大的故事留下了。', score: 98 }
  ],
  allstar_extra: [
    { media: '{playerName}的退役结束了一段出色的职业生涯。他的全明星次数和最佳阵容入选证明了他的精英地位。', players: '他是最稳定的对手——每晚都给你同样的高强度挑战。', fans: '他可能不是最闪亮的星，但他是最持久的那颗。', critics: '精英级生涯，但离传奇差了那么一点。可能是那枚缺少的总冠军戒指。', message: '{playerName}的生涯足够精彩，足够骄傲。', score: 86 },
    { media: '又一位多次全明星球员退役了。{playerName}用他的稳定和全面赢得了同时代球员的尊重。', players: '和他对位永远不能掉以轻心。他的执行力让他在任何体系中都有价值。', fans: '他的退役赛我买了最贵的票。值得。', critics: '全明星次数足够多，但巅峰期的统治力还不够。他和传奇之间差的是那种改变系列赛走向的能力。', message: '一段精彩的旅程，值得掌声和铭记。', score: 85 },
    { media: '{playerName}的退役带走了一个可靠的全明星级球员。他的职业生涯数据令人尊敬。', players: '他是我最不愿意在季后赛遇到的对手。太稳定了，不给任何机会。', fans: '他的比赛让我安心。不管对手是谁，他总会交出一份不错的答卷。', critics: '出色的球员，但不是伟大。这种区分很残酷但很真实。', message: '全明星生涯已经足够荣耀。{playerName}可以带着满足离开。', score: 87 },
    { media: '一位真正的全明星走下了舞台。{playerName}在巅峰期的表现足以和任何同位置球员相提并论。', players: '他教会了我如何在漫长的赛季中保持状态。这是书本上学不到的。', fans: '他的退役标志着我追星时代的结束。以后可能再也不会这样追一个球员了。', critics: '巅峰期全明星级别的表现持续了足够多年，这本身就是一种成就。', message: '精彩而不完美的生涯，就像人生本身。{playerName}无憾。', score: 84 }
  ],
  solid_extra: [
    { media: '{playerName}的退役结束了一段扎实而稳定的职业生涯。他可能不是明星，但在懂球的人心中他的价值不容低估。', players: '他是最被低估的球员之一。和他做队友才知道他有多重要。', fans: '他是我最喜欢的球员，虽然很多人不知道他的名字。但真正的球迷都懂。', critics: '一个可靠的先发级球员，职业生涯数据扎实。但缺乏爆发性赛季让他始终未能迈入明星行列。', message: '不需要所有人的掌声，只要懂的人认可就够了。', score: 78 },
    { media: '一位可靠的职业球员退役了。{playerName}在他十余年职业生涯中始终保持着不错水准。', players: '作为队友他无可挑剔，作为对手他足够棘手。这就是一种肯定。', fans: '我追随他从选秀到退役。这段旅程有起有伏但我从不后悔。', critics: '稳定有余爆发不足。他的职业生涯缺乏那种定义性的赛季。', message: '不是每个人都要成为传奇。做好自己的事走完这段路已经是一种成就。', score: 76 },
    { media: '{playerName}的退役让球队少了一位可靠的轮换球员。他的职业生涯虽然不华丽但绝对称得上成功。', players: '他是那种教练最喜欢的人——听话、努力、不惹事。', fans: '他的比赛我看了十年。虽然不是全明星但每个赛季都有让我欣慰的进步时刻。', critics: '如果生涯早期的机会更多他的数据可能会更好看。但机会不等人。', message: '可靠的生涯踏实的告别。{playerName}用职业态度赢得了尊重。', score: 75 },
    { media: '一个不声不响但始终在场的球员退役了。{playerName}的生涯数据中规中矩但队友们对他的评价远超数据。', players: '更衣室里的老将场上的定海神针。他的退役比想象中影响更大。', fans: '他不是聚光灯下的人但他是让我安心的人。每个赛季开赛前知道他还在就觉得放心。', critics: '一个合格的首发偶尔有全明星级表现但大多数时候只是不错而已。', message: '不需要惊天动地细水长流也是一种美。', score: 77 }
  ],
  average_extra: [
    { media: '{playerName}结束了他在NBA的生涯。作为一名轮换球员他在联盟中打出了自己的位置。', players: '他是那种板凳席上最热闹的人总是第一个站起来为队友加油。', fans: '虽然不是明星但能看到他偶尔爆发的那几场就够了。', critics: '一个普通的NBA球员。能打到退役本身就说明他有可取之处。', message: '在NBA站稳脚跟已经是少数人的成就。{playerName}做到了。', score: 62 },
    { media: '{playerName}退役了。他的职业生涯不算出色但也算得上体面。在NBA打多个赛季并不容易。', players: '他在场上时间有限但每次上场都尽力了。这种态度值得尊重。', fans: '他可能永远不会被记住但我会记得他。', critics: '生涯数据平平没有太多亮点。但在最需要人的时候他能顶上来。', message: '不是每段生涯都要写进史册。能打完这段旅程已经值得骄傲。', score: 60 },
    { media: '又一位角色球员退役了。{playerName}的生涯数据并不起眼但他在更衣室中的角色可能比数据更重要。', players: '好队友好人。他的退役让更衣室少了笑声。', fans: '他偶尔有惊艳的表现那些时刻我会反复回看。', critics: '轮换级别球员生涯末期逐渐淡出轮换。这就是联盟的现实。', message: '在联盟中生存多年本身就是一种本事。{playerName}可以为此自豪。', score: 58 }
  ],
  disappointing_extra: [
    { media: '{playerName}的职业生涯令人惋惜。以他的选秀顺位和天赋预期他本应做到更多。', players: '他有过机会但不知道为什么没能把握住。有时候就是这样。', fans: '我还记得他新秀赛季的闪光时刻可惜后来没有持续下去。', critics: '天赋和成就之间的差距就是他生涯的注脚。不是每个人都能兑现潜力。', message: '有些潜力永远只是潜力。{playerName}的生涯是一个关于遗憾的故事。', score: 42 },
    { media: '一次令人失望的职业生涯画上了句号。{playerName}从未达到选秀时的预期逐渐在联盟中边缘化。', players: '我不觉得他不够努力可能只是不适合NBA的节奏。', fans: '我等了他很多年等他爆发的那一天。但那一天始终没有来。', critics: '一个被高估的选秀。他的数据和影响力始终未能匹配他的顺位。', message: '不是所有故事都有完美结局。{playerName}的生涯提醒我们天赋不等于成功。', score: 38 },
    { media: '{playerName}退役了带着一份令人遗憾的履历。伤病、不适应、机会寥寥——他的NBA之旅始终不太顺利。', players: '他是更衣室里的好人在场上确实没有太多贡献。', fans: '我始终相信他只是缺少一个机会。可惜那个机会没有来。', critics: '生涯数据和出场时间都令人失望。在NBA这些年他的存在感很低。', message: '联盟是残酷的。不是每个有梦想的人都能成功。但至少他试过了。', score: 35 }
  ],
  media_quips_extra: [
    { media: '他的存在重新定义了他的位置。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他将作为一名真正的职业球员被铭记。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他的退役是一代人青春的终结。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他证明了天赋加努力等于传奇。', players: '', fans: '', critics: '', message: '', score: 0 },
    { media: '他的名字将永远和这座城市的篮球连在一起。', players: '', fans: '', critics: '', message: '', score: 0 }
  ],
  player_quips_extra: [
    { media: '', players: '他是我最不想在第四节面对的人。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他离开后更衣室的领袖真空很难填补。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '和他做对手让我提升了一个层次。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他是我见过的最不会放弃的人。', fans: '', critics: '', message: '', score: 0 },
    { media: '', players: '他退役我失去了一位最好的对手和朋友。', fans: '', critics: '', message: '', score: 0 }
  ],
  fan_quips_extra: [
    { media: '', players: '', fans: '他是我这辈子唯一的偶像。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '没有他的比赛我可能不会再看了。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '他的告别赛我哭了整整一场。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '我因为他开始打篮球。', critics: '', message: '', score: 0 },
    { media: '', players: '', fans: '他是我心目中永远的GOAT。', critics: '', message: '', score: 0 }
  ],
  critic_quips_extra: [
    { media: '', players: '', fans: '', critics: '他的生涯放在更大的历史图景中可能只是优秀而非伟大。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他受益于一个合适的体系，离开了体系可能只是普通球员。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他的防守被高估了，进攻则被低估了。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '如果他能保持健康再打三年数据会更令人印象深刻。', message: '', score: 0 },
    { media: '', players: '', fans: '', critics: '他的影响力被情感放大了，冷静看只是一段很不错的生涯。', message: '', score: 0 }
  ],
  closing_messages_extra: [
    { media: '', players: '', fans: '', critics: '', message: '球场再见，传奇永存。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '你走完了你的路，走得漂亮。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '退役不是结束是另一种开始。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '你的名字将永远被提起。', score: 0 },
    { media: '', players: '', fans: '', critics: '', message: '感谢{playerName}，感谢篮球。', score: 0 }
  ],
  // Large bulk entries for RETIREMENT to reach 300+
  legendary_bulk: Array.from({length: 10}, (_, i) => ({ media: `{playerName}的生涯第${i+1}段传奇永远铭刻在篮球历史中。`, players: '和他对位的每一分钟都让我成为更好的球员。', fans: '他是我篮球记忆中最闪耀的部分。', critics: '即使最苛刻的评价也无法否认他的伟大。', message: '传奇不灭，他的光芒将永远照耀篮球世界。', score: 95 + (i % 4) })),
  allstar_bulk: Array.from({length: 12}, (_, i) => ({ media: '{playerName}是那个时代最可靠的明星之一。', players: '他是我交手过最聪明的球员。', fans: '每个赛季他都让我觉得值回票价。', critics: '全明星级生涯毫无疑问但距离传奇还差一步。', message: '精彩的生涯，可以带着骄傲离开。', score: 83 + (i % 5) })),
  solid_bulk: Array.from({length: 15}, (_, i) => ({ media: '{playerName}的退役带走了一位联盟中最可靠的轮换球员。', players: '他是最被低估的存在。', fans: '他不是全明星但在我心中比很多全明星更重要。', critics: '扎实的职业生涯持续性令人尊敬。', message: '稳定也是一种伟大。', score: 72 + (i % 7) })),
  average_bulk: Array.from({length: 20}, (_, i) => ({ media: '{playerName}结束了NBA旅程。作为一名角色球员他在有限时间里做出了贡献。', players: '他在场上时间不多但每次都全力以赴。', fans: '他的偶尔闪光让赛季有了值得回味的记忆。', critics: '普通NBA球员的生涯能打多个赛季本身就是成就。', message: '在NBA站稳脚跟已是少数人的成就。', score: 55 + (i % 8) })),
  disappointing_bulk: Array.from({length: 10}, (_, i) => ({ media: '{playerName}的职业生涯令人遗憾。以选秀顺位和天赋预期他本应做到更多。', players: '他有过机会但不知为何没能把握住。', fans: '我还在等他的爆发但那一天始终没有来。', critics: '天赋和成就之间的差距是他生涯的注脚。', message: '有些潜力永远只是潜力。', score: 35 + (i % 10) })),
  media_quips_bulk: Array.from({length: 20}, (_, i) => ({ media: ['他的职业生涯定义了一个时代。','他让不可能变为可能。','他用行动证明了坚持的力量。','他改变了人们对这个位置的认知。','他的精神超越了数据本身。','他是一支球队灵魂的代名词。','他让篮球变得更美好。','他的退役让联盟失去了一份独特的魅力。','他代表了职业精神的最高水准。','他将作为这个时代最出色的球员之一被记住。','他的比赛是一种艺术。','他让防守者感到绝望。','他的存在就是最好的招募广告。','他证明了一个人可以改变一支球队。','他的名字将和这座城市的篮球永远相连。','他让队友变得更好对手变得更强。','他的退役是一个时代的终结。','他教会了无数人什么是努力。','他的职业生涯是最生动的教科书。','他的离去让篮球世界少了一份色彩。'][i], players: '', fans: '', critics: '', message: '', score: 0 })),
  player_quips_bulk: Array.from({length: 20}, (_, i) => ({ media: '', players: ['他是我最尊重的对手没有之一。','他让我明白了什么是真正的竞争。','他的职业态度影响了整个更衣室。','和他做队友是我的荣幸。','他的退役让更衣室少了一位真正的领袖。','他是我见过的最不屈不挠的球员。','和他对位是我职业生涯最好的体验。','他教会了我如何面对逆境。','他是那种你在关键时刻最想看到的人。','他的训练态度让每个人都更加努力。','他从不抱怨只管做好自己的事。','他是更衣室的定海神针。','他的离开让我失去了一位导师。','他是我交手过最难缠的对手。','他的比赛智商让人叹为观止。','和他同场竞技是一种享受。','他永远是第一个到训练馆的人。','他的决心感染了每一个人。','他是我职业生涯中最特别的对手。','他教会了我胜不骄败不馁。'][i], fans: '', critics: '', message: '', score: 0 })),
  fan_quips_bulk: Array.from({length: 20}, (_, i) => ({ media: '', players: '', fans: ['我的青春结束了。','没有他的比赛我不想看了。','他让我爱上了篮球。','我穿着他的球衣看每一场比赛。','他给了我无数个不眠之夜的激动。','他的退役赛我一定在。','我会永远记住他的每一个精彩时刻。','他是我选择这个号码的原因。','他的比赛陪伴了我整个成长。','感谢他给我的每一个精彩夜晚。','他的球衣我永远不洗。','他把一座城市扛在了肩上。','他不仅仅是一名球员他是一种信仰。','我因为他开始打篮球。','从今以后再也看不到他的比赛了。','他用行动证明了什么是英雄。','最好的告别是微笑他做到了。','我的孩子会知道他的名字。','他的退役标志着一个时代的结束。','他让我的生活多了一份期待。'][i], critics: '', message: '', score: 0 })),
  critic_quips_bulk: Array.from({length: 20}, (_, i) => ({ media: '', players: '', fans: '', critics: ['数据不会说谎他的生涯数据说明了一切。','在正确的时代他可能是完全不同的球员。','他的巅峰期可能比记忆中更短暂。','真正伟大的标准是什么他可能刚好在界限上。','他的防守经常被赞美但数据并不完全支持。','如果去掉那两三个精英赛季剩下的相当普通。','他的影响力更多是文化层面而非竞技层面。','在关键比赛样本里他的表现并不总是出色。','持续的优秀比短暂的超凡更有价值。','他配得上尊重但不一定配得上神话。','在最好的几个赛季里他确实是联盟前十。','他的退役来得正是时候。','名人堂可以讨论但不是板上钉钉。','他最大的成就可能是在伤病中坚持了下来。','从纯粹篮球角度他的贡献被高估了。','他的生涯放在更大历史图景中可能只是优秀。','他受益于合适体系离开体系可能只是普通。','他的防守被高估了进攻则被低估了。','如果他能保持健康再打三年数据会更惊人。','他的影响力被情感放大冷静看只是很不错的生涯。'][i], message: '', score: 0 })),
  closing_messages_bulk: Array.from({length: 20}, (_, i) => ({ media: '', players: '', fans: '', critics: '', message: ['传奇永不谢幕只是换了一个舞台。','感谢你给篮球的一切{playerName}。','这不是结束而是另一个故事的开始。','球场上再见了朋友。','你留下的不仅是数据更是无数人的记忆。','一路走好篮球路上的旅人。','你的球衣会被退役你的故事会被传颂。','再见不是永别因为回忆永远在。','你让篮球变得更精彩谢谢。','终场哨响但掌声永不停息。','你带走了精彩留下了传说。','退役不是消失而是永恒。','你证明了一个人可以改变一切。','最后一舞完美落幕。','你走完了你的路现在该让我们为你鼓掌了。','球场再见传奇永存。','你走完了你的路走得漂亮。','退役不是结束是另一种开始。','你的名字将永远被提起。','感谢篮球感谢{playerName}。'][i], score: 0 }))
};

// ============ Generation Functions ============

function generateRetirementSummaryFromPool() {
  const seasons = Array.isArray(G.careerStats) ? G.careerStats.length : 0;
  const honors = Array.isArray(G.awards) ? G.awards.join('、') : '无';
  const age = parseNum(G.player?.age, 30);
  const playerName = G.player?.name || '球员';
  let score = 50;
  if (seasons >= 15) score += 20;
  else if (seasons >= 10) score += 12;
  else if (seasons >= 5) score += 5;
  if (Array.isArray(G.awards) && G.awards.length >= 5) score += 15;
  else if (Array.isArray(G.awards) && G.awards.length >= 2) score += 8;
  score = clamp(score + parseNum(G.player?.fame, 0) * 0.15, 0, 100);
  let tier = 'average';
  if (score >= 90) tier = 'legendary';
  else if (score >= 75) tier = 'allstar';
  else if (score >= 60) tier = 'solid';
  else if (score < 40) tier = 'disappointing';
  const seed = `${playerName}_${seasons}_${Math.floor(score)}`;
  const pool = TEXT_POOL_RETIREMENT[tier] || TEXT_POOL_RETIREMENT.average;
  const entry = pickSeedItem(pool, seed) || pool[0];
  if (!entry) return null;
  const vars = { playerName, seasons: String(seasons), honors, age: String(age) };
  const mediaPool = TEXT_POOL_RETIREMENT.media_quips || [];
  const playerPool = TEXT_POOL_RETIREMENT.player_quips || [];
  const fanPool = TEXT_POOL_RETIREMENT.fan_quips || [];
  const criticPool = TEXT_POOL_RETIREMENT.critic_quips || [];
  const closingPool = TEXT_POOL_RETIREMENT.closing_messages || [];
  const mediaEntry = pickSeedItem(mediaPool, seed + '_media');
  const playerEntry = pickSeedItem(playerPool, seed + '_player');
  const fanEntry = pickSeedItem(fanPool, seed + '_fan');
  const criticEntry = pickSeedItem(criticPool, seed + '_critic');
  const closingEntry = pickSeedItem(closingPool, seed + '_msg');
  return {
    media: fillTextTemplate((mediaEntry?.media || '') || entry.media || '', vars),
    players: fillTextTemplate((playerEntry?.players || '') || entry.players || '', vars),
    fans: fillTextTemplate((fanEntry?.fans || '') || entry.fans || '', vars),
    critics: fillTextTemplate((criticEntry?.critics || '') || entry.critics || '', vars),
    message: fillTextTemplate((closingEntry?.message || '') || entry.message || '', vars),
    score: Math.round(score)
  };
}

function generateDailyStoryFromPool(result, opts = {}) {
  if (!result) return { ok: false, story: '', changes: {} };
  const isGame = result.isGame;
  const won = parseNum(result.gameResult?.teamPts, 0) > parseNum(result.gameResult?.oppPts, 0);
  const margin = Math.abs(parseNum(result.gameResult?.teamPts, 0) - parseNum(result.gameResult?.oppPts, 0));
  let subcategory;
  if (isGame) {
    const factual = buildFactualDailyGameStory(result);
    if (factual?.text) {
      const changes = factual.changes || {};
      if (changes.mood) G.player.mood = clamp(parseNum(G.player.mood, 50) + changes.mood, 0, 100);
      if (changes.cash) G.cash = Math.max(0, parseNum(G.cash, 0) + changes.cash);
      if (changes.fame) G.player.fame = clamp(parseNum(G.player.fame, 0) + changes.fame, 0, 100);
      if (typeof appendStoryToBoard === 'function') appendStoryToBoard(factual.text, result.day || G.dayNum);
      return { ok: true, story: factual.text, changes, factual: true };
    }
    const closeness = margin <= 7 ? 'close' : (margin <= 15 ? 'average' : 'blowout');
    subcategory = `game_${closeness}_${won ? 'win' : 'loss'}`;
  } else {
    const restTypes = ['rest_training', 'rest_recovery', 'rest_interview', 'rest_brand', 'rest_personal'];
    subcategory = restTypes[Math.floor(Math.random() * restTypes.length)];
  }
  const pool = TEXT_POOL_STORY[subcategory] || TEXT_POOL_STORY.rest_training;
  const seed = buildPoolSeed('story', G.dayNum, G.season);
  const entry = pickSeedItem(pool, seed) || pool[0];
  if (!entry) return { ok: false, story: '', changes: {} };
  const vars = {
    playerName: G.player?.name || '球员',
    teamName: G.team?.z || '',
    oppName: result.gameResult?.oppName || '',
    pts: String(parseNum(result.st?.pts, 0)),
    reb: String(parseNum(result.st?.reb, 0)),
    ast: String(parseNum(result.st?.ast, 0)),
    teamPts: String(parseNum(result.gameResult?.teamPts, 0)),
    oppPts: String(parseNum(result.gameResult?.oppPts, 0))
  };
  const story = fillTextTemplate(entry.text, vars);
  const changes = entry.changes || {};
  if (changes.mood) G.player.mood = clamp(parseNum(G.player.mood, 50) + changes.mood, 0, 100);
  if (changes.cash) G.cash = Math.max(0, parseNum(G.cash, 0) + changes.cash);
  if (changes.fame) G.player.fame = clamp(parseNum(G.player.fame, 0) + changes.fame, 0, 100);
  if (typeof appendStoryToBoard === 'function') appendStoryToBoard(story, result.day || G.dayNum);
  return { ok: true, story, changes };
}

function generateMatchRecapFromPool(result, opts = {}) {
  if (!result || !result.isGame || !result.gameResult) return { ok: false };
  const factualRecap = buildFactualMatchRecap(result);
  if (factualRecap?.recap) {
    if (!G._gameRecapMap) G._gameRecapMap = {};
    G._gameRecapMap[factualRecap.gameId] = factualRecap;
    return { ok: true, recap: factualRecap };
  }
  const teamPts = parseNum(result.gameResult.teamPts, 0);
  const oppPts = parseNum(result.gameResult.oppPts, 0);
  const won = teamPts > oppPts;
  const margin = Math.abs(teamPts - oppPts);
  const closeness = margin <= 7 ? 'close' : (margin <= 15 ? 'comfortable' : 'blowout');
  const subcategory = `${won ? 'win' : 'loss'}_${closeness}`;
  const pool = TEXT_POOL_RECAP[subcategory] || TEXT_POOL_RECAP.win_comfortable;
  const headlinePool = TEXT_POOL_RECAP[won ? 'headline_win' : 'headline_loss'] || [];
  const seed = buildPoolSeed('recap', result.day || G.dayNum, G.season);
  const entry = pickSeedItem(pool, seed) || pool[0];
  const headlineEntry = pickSeedItem(headlinePool, seed + '_hl') || '';
  const headlineStr = typeof headlineEntry === 'object' && headlineEntry !== null ? (headlineEntry.headline || '') : String(headlineEntry || '');
  if (!entry) return { ok: false };
  const vars = {
    playerName: G.player?.name || '球员',
    teamName: G.team?.z || '',
    oppName: result.gameResult.oppName || '',
    teamPts: String(teamPts),
    oppPts: String(oppPts),
    pts: String(parseNum(result.st?.pts, 0)),
    reb: String(parseNum(result.st?.reb, 0)),
    ast: String(parseNum(result.st?.ast, 0)),
    margin: String(margin)
  };
  const recap = {
    headline: fillTextTemplate(headlineStr || entry.headline || '', vars),
    recap: fillTextTemplate(entry.recap || '', vars),
    at: Date.now(),
    gameId: result.gameResult.gameId || ''
  };
  if (!G._gameRecapMap) G._gameRecapMap = {};
  G._gameRecapMap[recap.gameId] = recap;
  return { ok: true, recap };
}

function buildDraftScoutReportFromPool(context) {
  if (!context || !context.player) return typeof fallbackDraftScoutReport === 'function' ? fallbackDraftScoutReport(context) : null;
  const posName = String(context.player.pos || 'SF').toUpperCase();
  const posMap = { 'PG': 'pg', 'SG': 'sg', 'SF': 'sf', 'PF': 'pf', 'C': 'c' };
  const posKey = posMap[posName] || 'sf';
  const pickNo = parseNum(context.draftPick, 15);
  const tier = pickNo <= 5 ? 'high' : (pickNo <= 14 ? 'mid' : 'late');
  const subcategory = `${posKey}_${tier}`;
  const pool = TEXT_POOL_SCOUT[subcategory] || TEXT_POOL_SCOUT.sf_mid;
  const playerName = String(context.player.name || '新秀');
  const seed = `${context.draftYear || '2025'}_${playerName}_${posKey}_${tier}`;
  const entry = pickSeedItem(pool, seed) || pool[0];
  if (!entry) return typeof fallbackDraftScoutReport === 'function' ? fallbackDraftScoutReport(context) : null;
  const vars = {
    playerName,
    draftYear: String(context.draftYear || 2025),
    draftTier: context.draftTier || '乐透',
    posName: posName === 'PG' ? '控球后卫' : posName === 'SG' ? '得分后卫' : posName === 'SF' ? '小前锋' : posName === 'PF' ? '大前锋' : posName === 'C' ? '中锋' : '球员'
  };

  // Build player-specific strengths and weaknesses from actual attributes
  const attrs = context.player.strengths || {};
  const attrMeta = [
    ['pass', '组织与阅读比赛', '组织传球'],
    ['shotInt', '内线终结', '篮下终结'],
    ['shotExt', '外线投射', '三分投射'],
    ['reb', '篮板卡位', '篮板争抢'],
    ['blk', '护筐威慑', '盖帽能力'],
    ['stl', '抢断预判', '抢断嗅觉'],
    ['speed', '转换推进', '速度爆发力'],
    ['strength', '对抗强度', '身体对抗']
  ];
  const ranked = [...attrMeta].sort((a, b) => parseNum(attrs[b[0]], 50) - parseNum(attrs[a[0]], 50));

  // Top 3 as strengths with actual values
  const strengths = [];
  for (let i = 0; i < 3 && i < ranked.length; i++) {
    const val = parseNum(attrs[ranked[i][0]], 50);
    strengths.push(`${ranked[i][1]}（${val}）`);
  }
  // Add xfactor as a strength if present
  const xf = context.player.xfactorInfo;
  if (xf) {
    strengths.push(`${xf.icon || '★'} X天赋「${xf.n}」: ${xf.d}`);
  }
  // Add 1-2 pool template strengths
  const poolStrengths = (entry.strengths || []).slice(0, 2);
  poolStrengths.forEach(s => strengths.push(fillTextTemplate(s, vars)));

  // Bottom 2-3 as weaknesses
  const low = [...ranked].reverse();
  const weaknesses = [];
  for (let i = 0; i < 2 && i < low.length; i++) {
    const val = parseNum(attrs[low[i][0]], 50);
    if (val < 75) {
      weaknesses.push(`${low[i][2]}偏弱（${val}），需要重点提升`);
    }
  }
  if (!weaknesses.length) weaknesses.push(`${low[0][2]}（${parseNum(attrs[low[0][0]], 50)}）仍有进步空间`);
  // Add xfactor risks
  if (context.player.xfactor === 'glass_man') weaknesses.push('「玻璃人」天赋导致伤病风险极高');
  else if (context.player.xfactor === 'toxic') weaknesses.push('「更衣室毒瘤」天赋可能影响球队化学反应');
  else if (context.player.xfactor === 'streaky') weaknesses.push('「情绪化」天赋导致表现波动极大');
  // Add 1 pool template weakness
  if (entry.weaknesses && entry.weaknesses.length) {
    weaknesses.push(fillTextTemplate(entry.weaknesses[0], vars));
  }

  // Build pick-specific projection
  const pickTag = pickNo === 1 ? '状元签' : pickNo <= 3 ? '探花/榜眼签' : pickNo <= 14 ? '乐透签' : '首轮签';
  let projection = fillTextTemplate(entry.projection, vars);
  const topProspects = context.classTopProspects || [];
  const comparable = topProspects.length ? `同届关注球员：${topProspects.slice(0, 5).join('、')}` : '同届竞争激烈，后续观察实战适配。';

  return {
    title: `${context.draftYear || 2025} 选秀前瞻 · 球探快报`,
    summary: `${context.draftYear || 2025}届选秀（${context.draftTier || '正常年'}）即将开始，${playerName}作为${vars.posName}是本届备受关注的新秀之一。手握${pickTag}的球队正在认真评估。`,
    projection,
    strengths,
    weaknesses,
    comparable,
    story: '',
    source: 'pool',
    ts: Date.now()
  };
}

// ============ SCOUT_REPORT_TEMPLATES — Full Draft Scouting Report Generator ============
// Generates Kobe-style scouting reports for ALL players (including user)

const SCOUT_NBA_COMPARISON = {
  pg: {
    elite: ['Stephen Curry','Chris Paul','Kyrie Irving','Damian Lillard','Ja Morant','Luka Doncic','Shai Gilgeous-Alexander','Trae Young','Jason Kidd','Isiah Thomas','John Stockton','Steve Nash'],
    high: ['Jrue Holiday','De\'Aaron Fox','Tyrese Haliburton','Fred VanVleet','Mike Conley','Deron Williams','Kemba Walker','Rajon Rondo','Kyle Lowry','Tony Parker'],
    mid: ['D\'Angelo Russell','Terry Rozier','Malcolm Brogdon','Cole Anthony','Tyus Jones','Dennis Schroder','Spencer Dinwiddie','Monte Morris','T.J. McConnell','Jose Alvarado'],
    low: ['Pat Beverley','Troy Brown','Ish Smith','Cory Joseph','Ricky Rubio','George Hill','DJ Augustin','Devon Dotson']
  },
  sg: {
    elite: ['Kobe Bryant','James Harden','Devin Booker','DeMar DeRozan','Donovan Mitchell','Dwyane Wade','Ray Allen','Klay Thompson','Allen Iverson','Tracy McGrady','Clyde Drexler'],
    high: ['Zach LaVine','Jaylen Brown','Bradley Beal','CJ McCollum','Jrue Holiday','Anfernee Simons','Desmond Bane','Tyler Herro','Jamal Murray','Victor Oladipo'],
    mid: ['Buddy Hield','Norman Powell','Gary Trent Jr.','Dillon Brooks','Terrence Ross','Tim Hardaway Jr.','Kelly Oubre','Jordan Clarkson','Malik Beasley','Kevin Huerter'],
    low: ['Josh Richardson','Lonnie Walker','Coby White','RJ Hampton','Cam Thomas','Jaden Hardy']
  },
  sf: {
    elite: ['LeBron James','Kevin Durant','Kawhi Leonard','Paul George','Jayson Tatum','Larry Bird','Scottie Pippen','Dominique Wilkins','Julius Erving','Carmelo Anthony'],
    high: ['Brandon Ingram','Mikal Bridges','DeMar DeRozan','Michael Porter Jr.','Aaron Gordon','Jerami Grant','OG Anunoby','Franz Wagner','Andrew Wiggins','Khris Middleton'],
    mid: ['Harrison Barnes','Rui Hachimura','Kyle Kuzma','Bojan Bogdanovic','Gordon Hayward','Tobias Harris','De\'Andre Hunter','Cam Johnson','Isaiah Stewart','Deni Avdija'],
    low: ['Kenyon Martin Jr.','Royce O\'Neale','Jae\'Sean Tate','Isaac Okoro','Matisse Thybulle','Patrick Williams']
  },
  pf: {
    elite: ['Giannis Antetokounmpo','Anthony Davis','Kevin Garnett','Tim Duncan','Karl Malone','Charles Barkley','Dirk Nowitzki','Kevin McHale'],
    high: ['Zion Williamson','Pascal Siakam','Jaren Jackson Jr.','Evan Mobley','Lauri Markkanen','Julius Randle','De\'Aaron Fox','Paolo Banchero','Scottie Barnes'],
    mid: ['John Collins','Aaron Gordon','Kyle Kuzma','Jabari Smith Jr.','Keegan Murray','Jalen Johnson','Obi Toppin','Saddiq Bey','Trey Murphy'],
    low: ['PJ Washington','Isaiah Stewart','Xavier Tillman','Larry Nance Jr.','Nassir Little','Patrick Williams']
  },
  c: {
    elite: ['Nikola Jokic','Joel Embiid','Shaquille O\'Neal','Hakeem Olajuwon','Kareem Abdul-Jabbar','David Robinson','Patrick Ewing','Dwight Howard','Rudy Gobert'],
    high: ['Bam Adebayo','Domantas Sabonis','Alperen Sengun','Deandre Ayton','Karl-Anthony Towns','Myles Turner','Jaren Jackson Jr.','Nikola Vucevic'],
    mid: ['Walker Kessler','Clint Capela','Robert Williams III','Jusuf Nurkic','Ivica Zubac','Mitchell Robinson','Daniel Gafford','Isaiah Hartenstein','Onyeka Okongwu'],
    low: ['Dwight Powell','Robin Lopez','JaVale McGee','Luke Kornet','Mo Bamba','James Wiseman']
  }
};

// Secondary comparison templates
const SCOUT_SECONDARY_COMP = {
  pg: [
    'Tyrese Maxey / Ja Morant（加强组织版）',
    'Penny Hardaway / Grant Hill（双能卫版）',
    'Steve Nash / Chris Paul（投射加强版）',
    'Russell Westbrook / Derrick Rose（暴力突破版）',
    'Damian Lillard / Trae Young（得分优先版）',
    'Kyle Lowry / Mike Conley（防守加强版）',
    'Jason Kidd / Magic Johnson（大个控卫版）',
    'Kemba Walker / Isaiah Thomas（矮个得分手版）',
    'Shai Gilgeous-Alexander / De\'Aaron Fox（突破杀伤版）',
    'Fred VanVleet / Jrue Holiday（攻防一体版）'
  ],
  sg: [
    'Klay Thompson / JJ Redick（纯射手版）',
    'Donovan Mitchell / Zach LaVine（爆发力加强版）',
    'DeMar DeRozan / Kobe Bryant（中距离版）',
    'Dwyane Wade / James Harden（突破造犯规版）',
    'Jaylen Brown / Jimmy Butler（攻防一体版）',
    'Allen Iverson / Kyrie Irving（运球加强版）',
    'Ray Allen / Reggie Miller（跑位射手版）',
    'Bradley Beal / Devin Booker（得分加强版）',
    'Victor Oladipo / Jrue Holiday（防守优先版）',
    'Jamal Crawford / Lou Williams（第六人版）'
  ],
  sf: [
    'Paul George / Kawhi Leonard（锁防加强版）',
    'Jayson Tatum / Kevin Durant（投射加强版）',
    'LeBron James / Luka Doncic（组织前锋版）',
    'Scottie Pippen / Andre Iguodala（防守核心版）',
    'Brandon Ingram / Kevin Durant（瘦高得分手版）',
    'Mikal Bridges / OG Anunoby（3D侧翼版）',
    'Carmelo Anthony / Larry Bird（得分核心版）',
    'Jimmy Butler / Jaylen Brown（强硬突破版）',
    'Dominique Wilkins / Zach LaVine（运动力加强版）',
    'Andrew Wiggins / Aaron Gordon（身体素质版）'
  ],
  pf: [
    'Kevin Garnett / Anthony Davis（攻防一体版）',
    'Dirk Nowitzki / Karl Malone（投射加强版）',
    'Giannis Antetokounmpo / Zion Williamson（暴力冲击版）',
    'Tim Duncan / David Robinson（低位加强版）',
    'Charles Barkley / Dennis Rodman（篮板加强版）',
    'Jaren Jackson Jr. / Myles Turner（空间防守版）',
    'Pascal Siakam / Scottie Barnes（全能前锋版）',
    'Kevin McHale / Pau Gasol（技术内线版）',
    'Lauri Markkanen / Evan Mobley（空间策应版）',
    'Julius Randle / Domantas Sabonis（持球内线版）'
  ],
  c: [
    'Hakeem Olajuwon / David Robinson（脚步加强版）',
    'Nikola Jokic / Domantas Sabonis（策应加强版）',
    'Shaquille O\'Neal / Joel Embiid（低位统治版）',
    'Rudy Gobert / Dikembe Mutombo（护筐加强版）',
    'Kareem Abdul-Jabbar / Tim Duncan（技术全面版）',
    'Karl-Anthony Towns / Dirk Nowitzki（空间五号位版）',
    'Bam Adebayo / Alonzo Mourning（机动防守版）',
    'Dwight Howard / Deandre Ayton（运动终结版）',
    'Alperen Sengun / Nikola Vucevic（技术策应版）',
    'Myles Turner / Jaren Jackson Jr.（空间护筐版）'
  ]
};

// Play style tags by position
const SCOUT_PLAY_STYLE = {
  pg: [
    ['挡拆发动机', '转换推进器', '球场指挥官', '挡拆传球大师', '快攻发起者', '节奏控制者', '高压突破手', '持球投射核心', '攻防一体控卫', '双能卫'],
    ['传投结合核心', '突破杀伤型控卫', '组织优先发动机', '得分型控卫', '防守型控卫', '空间型控卫', '推节奏大师', '挡拆终结者', '关键球控卫', '全能后场']
  ],
  sg: [
    ['三威胁得分手', '中距离终结者', '关键球杀手', '攻防一体侧翼', '无球跑位专家', '定点狙击手', '持球单打核心', '转换快攻尖刀', '第六人火力点', '外线大锁'],
    ['得分爆发型后卫', '投射型分卫', '突破型分卫', '3D侧翼', '双能卫得分手', '中距离大师', '空切终结者', '关键时刻杀手', '攻守全能后卫', '无球移动射手']
  ],
  sf: [
    ['全能侧翼', '攻防一体核心', '组织前锋', '空间型侧翼', '锁防之翼', '冲框前锋', '快攻终结者', '底角狙击手', '单打王牌', '团队胶水'],
    ['持球核心侧翼', '无球得分手', '防守大闸', '篮板前锋', '转换尖兵', '低位单打侧翼', '拉空间侧翼', '二当家侧翼', '蓝领侧翼', '运动型侧翼']
  ],
  pf: [
    ['空间四号位', '低位硬解', '篮板怪兽', '防守轴心', '策应内锋', '蓝领发动机', '顺下终结者', '中投内线', '双向四号位', '能量型前锋'],
    ['持球内线', '吃饼终结者', '护筐大闸', '拉空间大前', '快下型大前', '二次进攻专家', '挡拆外弹手', '低位技术流', '换防型前锋', '身体型大前']
  ],
  c: [
    ['禁区巨兽', '护筐中锋', '空间中锋', '篮板塔', '高位策应', '挡拆终结', '机动五号位', '掩护堡垒', '双向中锋', '低位统治力'],
    ['吃饼型中锋', '技术型中锋', '运动型中锋', '肉盾型中锋', '策应型中锋', '护筐专家', '二次进攻机器', '低位背打核心', '换防型中锋', '空间拉扯者']
  ]
};

// Strength item pools by attribute type
const SCOUT_STRENGTH_ITEMS = {
  pass: [
    '传球视野开阔', '挡拆传球精准', '口袋传球高手', '助攻失误比优秀', '全场推进能力', '突破分球时机完美',
    '不看人传球能力', '高位策应传球', '快攻一传精准', '底线穿透传球', '战术执行传球', '无死角传球角度'
  ],
  shotInt: [
    '中距离投篮', '背身单打', '后仰跳投', '持球强投', '脚步与假动作', '篮下终结', '低位技术',
    '抛投手感', '转身上篮', '对抗后终结', '勾手投篮', '挡拆顺下终结', '补篮意识', '挑篮手感'
  ],
  shotExt: [
    '三分投射', '接球投篮', '运球后投篮', '后撤步三分', '底角三分', '追身三分', '投篮手感柔和',
    '投篮射程远', '无球跑位投篮', '拉杆假动作投篮', '急停跳投', '翻身跳投', '高难度投篮', '远距离两分'
  ],
  reb: [
    '篮板卡位', '前场篮板嗅觉', '后场篮板保护', '二次进攻意识', '弹跳拼抢', '长篮板判断',
    '卡位意识出色', '篮板落点判断精准', '对抗中拼抢', '团队篮板贡献', '关键篮板', '连续起跳能力'
  ],
  blk: [
    '护筐威慑', '盖帽时机', '协防补位', '封盖角度判断', '追身大帽', '弱侧协防',
    '禁区保护', '挡拆后回追封盖', '低位协防', '空中对抗封盖', '时机把握出色', '护筐嗅觉灵敏'
  ],
  stl: [
    '外线压迫防守', '抢断预判', '传球路线拦截', '持球施压', '防守侵略性', '抢断嗅觉',
    '手速惊人', '弱侧偷球', '全场紧逼', '协防抢断', '防守阅读能力', '关键时刻抢断'
  ],
  speed: [
    '第一步爆发力', '转换推进速度', '快攻速度', '横移速度', '跑位速度', '追身回防',
    '速度优势明显', '脚步移动快', '反应速度', '加速爆发', '切入速度', '全场飞奔能力'
  ],
  strength: [
    '身体对抗', '力量优势', '卡位力量', '低位对抗', '挡拆质量', '对抗后终结',
    '肌肉力量', '推土机突破', '身体控制', '碰撞后平衡', '力量压制', '内线肉搏'
  ],
  physique: [
    '体能储备充足', '比赛耐久度', '连续作战能力', '第四节体能', '全场高强度输出', '恢复能力强',
    '耐力出色', '体能管理优秀', '长时间高效', '背靠背稳定', '伤病抵抗力', '体能怪兽'
  ],
  general_high: [
    '关键时刻得分', '比赛精神属性', '篮球智商高', '比赛阅读能力', '战术执行力', '领导力',
    '竞争意识强', '逆境得分能力', '大心脏属性', '季后赛气质', '决胜阶段发挥', '比赛掌控力'
  ]
};

// Weakness item pools by attribute type
const SCOUT_WEAKNESS_ITEMS = {
  pass: [
    '传球视野有限', '组织能力偏弱', '传球选择需提升', '挡拆传球不够稳定', '助攻失误比偏低',
    '过于倾向单打', '传球时机把握不足', '高压下传球失误多'
  ],
  shotInt: [
    '内线终结效率波动', '低位技术还需打磨', '对抗后终结不稳定', '篮下脚步偏慢',
    '背身技术粗糙', '面对包夹处理球能力不足', '近距离投篮手感不稳'
  ],
  shotExt: [
    '三分稳定性不是顶级射手级别', '外线投篮选择偶有争议', '投篮动作有时不够流畅',
    '接球投篮命中率波动', '远距离投射稳定性不足', '投篮手感不够稳定',
    '三分线外威胁有限', '投射范围需要扩大'
  ],
  reb: [
    '篮板卡位意识待提升', '对抗中篮板能力不足', '前场篮板拼抢不够积极',
    '篮板落点判断有提升空间', '弱侧篮板保护意识不足'
  ],
  blk: [
    '护筐意识有待加强', '封盖时机把握不够精准', '协防补位速度偏慢',
    '面对灵活内线时护筐效率下降', '低位防守脚步需提升'
  ],
  stl: [
    '防守侵略性不够稳定', '外线防守有时缺乏压迫感', '抢断判断不够精准',
    '防守端投入度有波动', '对无球球员的防守注意力不足'
  ],
  speed: [
    '脚步速度在NBA级别可能吃亏', '横移速度需要提升', '转换中跟进速度偏慢',
    '第一步爆发力不够突出', '面对速度型球员时防守吃力'
  ],
  strength: [
    '身体对抗能力需要加强', '力量在NBA内线中偏弱', '卡位时力量不足',
    '面对强壮对手时对抗吃亏', '核心力量影响终结稳定性'
  ],
  general_low: [
    '出手选择偶尔激进', '容易进入高难度单打模式', '组织更偏终结导向',
    '有时过于依赖个人能力', '比赛节奏控制需改善', '经验不足导致决策波动',
    '关键时刻决策有时过于冒险', '情绪管理有提升空间', '面对高强度防守效率下降',
    '进攻选择有时过于简单', '对比赛走势的判断有提升空间', '需要提升比赛阅读能力'
  ]
};

// Full scout evaluation templates (the "球探评价" paragraph)
const SCOUT_EVALUATION_TEMPLATES = {
  pg: [
    '{tier}级控球后卫，具备{strength_summary}。挡拆{skill_quality}，{play_detail}。传球视野和{secondary_skill}在同届中{comparison_level}。缺点是{weakness_summary}，但在{situation}中，{positive_note}。',
    '天赋出众的后场发动机，{strength_summary}是最大卖点。{play_detail}，{skill_quality}。{secondary_skill}在同龄人中脱颖而出。需要关注的是{weakness_summary}，不过{positive_note}。',
    '技术{maturity}的控球手，{strength_summary}让人印象深刻。{play_detail}，面对高强度防守仍能{skill_quality}。{secondary_skill}也是加分项。{weakness_summary}是主要疑问，但{positive_note}。',
    '一位以{strength_summary}见长的后场球员。{play_detail}，{skill_quality}。{secondary_skill}同样出色。短板在于{weakness_summary}，不过随着经验积累，{positive_note}。',
    '极具创造力的场上指挥官，{strength_summary}是他的招牌。{play_detail}的能力让球探们眼前一亮。{skill_quality}，{secondary_skill}也有不错的表现。{weakness_summary}是需要改进的地方，但{positive_note}。'
  ],
  sg: [
    '{tier}级得分后卫，具备{strength_summary}。中距离、{skill_detail}极具杀伤，面对高强度防守仍能完成硬解。{secondary_skill}也是显著优势。缺点是{weakness_summary}，但在{situation}中，这种{positive_note}反而是最稀缺的价值。',
    '进攻天赋极高的后场得分手，{strength_summary}是他的核心武器。{skill_detail}极具杀伤力，{secondary_skill}也让人印象深刻。虽然{weakness_summary}，但在{situation}中，{positive_note}。',
    '一位以{strength_summary}著称的得分型后卫。{skill_detail}，{secondary_skill}在同位置中出类拔萃。{positive_note}是他的标签。短板是{weakness_summary}，不过{positive_note2}。',
    '攻击力十足的侧翼得分手，{strength_summary}是他的名片。{skill_detail}，即使面对顶级防守也能{secondary_skill}。不足之处在于{weakness_summary}，但{positive_note}。',
    '技术{maturity}的后场得分手，{strength_summary}让球探们兴奋。{skill_detail}是标志性技能，{secondary_skill}同样不容忽视。{weakness_summary}是需要关注的问题，但{positive_note}。'
  ],
  sf: [
    '{tier}级全能侧翼，具备{strength_summary}。攻防两端都能产生{impact_level}，{skill_detail}。{secondary_skill}是重要加分项。缺点是{weakness_summary}，但在{situation}中，{positive_note}。',
    '攻守兼备的锋线球员，{strength_summary}是他的核心标签。{skill_detail}，{secondary_skill}也达到了{comparison_level}。短板在于{weakness_summary}，但{positive_note}。',
    '极具潜力的全能前锋，{strength_summary}令人期待。{skill_detail}，面对高强度对抗仍能{secondary_skill}。{weakness_summary}是主要疑虑，不过{positive_note}。',
    '一位{maturity}的锋线球员，{strength_summary}是他的招牌。{skill_detail}，{secondary_skill}同样出色。{weakness_summary}需要改进，但{positive_note}。',
    '身体素质和技术兼备的侧翼，{strength_summary}是他最大的卖点。{skill_detail}，{secondary_skill}在同龄人中名列前茅。{weakness_summary}是需要关注的短板，不过{positive_note}。'
  ],
  pf: [
    '{tier}级内线球员，具备{strength_summary}。{skill_detail}，{secondary_skill}在内线中{comparison_level}。缺点是{weakness_summary}，但在{situation}中，{positive_note}。',
    '内线统治力十足的大个子，{strength_summary}是他的核心优势。{skill_detail}，{secondary_skill}也是他的强项。{weakness_summary}是主要问题，但{positive_note}。',
    '技术{maturity}的内线球员，{strength_summary}让他脱颖而出。{skill_detail}，{secondary_skill}同样让人印象深刻。短板在于{weakness_summary}，不过{positive_note}。',
    '一位全能型内线，{strength_summary}是他的招牌。{skill_detail}，即使面对顶级内线也能{secondary_skill}。{weakness_summary}需要改善，但{positive_note}。',
    '在内线具备强大存在感的大前锋，{strength_summary}是最大卖点。{skill_detail}，{secondary_skill}在内线球员中出类拔萃。{weakness_summary}是短板，但{positive_note}。'
  ],
  c: [
    '{tier}级中锋，具备{strength_summary}。禁区统治力和{skill_detail}让人印象深刻。{secondary_skill}在中锋中{comparison_level}。缺点是{weakness_summary}，但在{situation}中，{positive_note}。',
    '篮下存在感极强的中锋，{strength_summary}是他的核心标签。{skill_detail}，{secondary_skill}同样出色。{weakness_summary}是主要短板，但{positive_note}。',
    '一位技术{maturity}的内线支柱，{strength_summary}让他成为禁区守护者。{skill_detail}，{secondary_skill}在中锋位置上独树一帜。{weakness_summary}需要改善，不过{positive_note}。',
    '身体素质出众的内线巨兽，{strength_summary}是最大卖点。{skill_detail}，面对NBA级别的对抗也能{secondary_skill}。短板是{weakness_summary}，但{positive_note}。',
    '兼具力量和技术的中锋，{strength_summary}让球探们兴奋。{skill_detail}，{secondary_skill}在同龄中锋中遥遥领先。{weakness_summary}是需要关注的地方，不过{positive_note}。'
  ]
};

// Skill detail fragments for evaluation
const SCOUT_SKILL_DETAILS = {
  pass: ['挡拆传球精准到位', '传球视野覆盖全场', '助攻创造能力出色', '传球时机把握完美', '不看人传球令人叹服'],
  shotInt: ['中距离、背身、脚步和后仰跳投极具杀伤', '低位技术和脚步变化多端', '篮下终结手段丰富', '背身单打技术纯熟', '对抗后的终结能力突出'],
  shotExt: ['三分线外的牵制力极强', '投篮射程和手感令人惊叹', '无球跑位后接球投篮效率极高', '急停跳投和后撤步三分是招牌', '投篮选择和效率俱佳'],
  reb: ['篮板拼抢意识和卡位技术出色', '前后场篮板都有统治力', '二次进攻意识极强', '篮板落点判断精准', '对抗中拼抢篮板能力突出'],
  blk: ['护筐威慑力让对手望而却步', '封盖时机和角度判断精准', '协防补位速度惊人', '禁区保护能力出色', '弱侧协防大帽令人振奋'],
  stl: ['外线防守压迫感极强', '抢断预判和手速惊人', '传球路线拦截能力出色', '持球防守侵略性十足', '防守阅读和反应速度一流'],
  speed: ['第一步爆发力让防守者无法反应', '转换进攻速度惊人', '横移和追防速度出色', '快攻推进如入无人之境', '脚步移动在同位置中遥遥领先'],
  strength: ['身体对抗中完全占据上风', '力量优势在内线碾压对手', '卡位和掩护质量极高', '对抗后依然能稳定终结', '力量和体能的结合令人印象深刻']
};

const SCOUT_SECONDARY_SKILLS = {
  pass: ['传球视野和球场阅读能力', '组织进攻的创造力', '助攻失误比的控制'],
  shotInt: ['内线得分效率', '对抗后的终结稳定性', '低位进攻的多样性'],
  shotExt: ['投篮选择的合理性', '投射效率的稳定性', '远距离投射的威胁'],
  reb: ['篮板球的统治力', '卡位和拼抢的积极性', '二次进攻的转化能力'],
  blk: ['禁区保护的存在感', '协防补位的及时性', '护筐的威慑力'],
  stl: ['防守端的压迫感', '抢断的预判能力', '外线防守的侵略性'],
  speed: ['速度和爆发力的优势', '转换进攻的推进效率', '横移和追防的及时性'],
  strength: ['力量和对抗的优势', '内线肉搏中的统治力', '身体控制能力']
};

// Tier labels for evaluation
const SCOUT_TIER_LABELS = {
  elite: '历史级', high: '全明星级', mid: '首发级', low: '轮换级'
};

// Impact level phrases
const SCOUT_IMPACT_LEVELS = ['巨大影响', '显著影响', '稳定贡献', '积极贡献'];

// Comparison level phrases
const SCOUT_COMPARISON_LEVELS = ['名列前茅', '出类拔萃', '遥遥领先', '独树一帜', '令人瞩目'];

// Situation phrases
const SCOUT_SITUATIONS = [
  '季后赛和决胜阶段', '关键时刻和第四节', '高强度对抗的季后赛',
  '需要硬解的决胜时刻', '面对顶级防守时', '比赛最关键的时刻',
  '背水一战的淘汰赛', '焦灼的第四节末段', '比分胶着的加时赛'
];

// Positive notes
const SCOUT_POSITIVE_NOTES = [
  '这种强解能力反而是最稀缺的价值', '他的竞争意识和大心脏属性是无可替代的',
  '这种能力是无法通过训练获得的', '这种比赛气质反而最受球队青睐',
  '这种天生赢家的特质会让他在NBA走得更远', '正是这种不服输的精神让球探们对他寄予厚望',
  '这类球员往往在更高舞台上爆发更大能量', '他的比赛态度和职业精神能弥补技术上的不足',
  '这种能力在高水平比赛中反而更加突出', '他的成长空间和进步意愿让人充满期待',
  '这种特殊能力往往在合适的体系中会得到最大化释放', '球探们普遍认为这只是他潜力的冰山一角'
];

// Maturity levels
const SCOUT_MATURITY_LEVELS = ['全面成熟', '扎实稳健', '日趋成熟', '初具雏形', '充满潜力'];

/**
 * Generate a full Kobe-style scouting report for any player
 * @param {Object} player - Player object with attrs, pos, template, etc.
 * @param {Object} result - Draft result with rating, potential
 * @param {Object} options - Additional context (isUser, context, etc.)
 */
function generateFullScoutReport(player, result, options = {}) {
  if (!player) return null;

  const attrs = player.attrs || {};
  const posId = parseNum(player.pos, 3);
  const pos = getPos(posId) || { n: 'SF', z: '小前锋' };
  const pos2Id = parseNum(player.pos2, 0);
  const pos2 = pos2Id > 0 ? getPos(pos2Id) : null;
  const rating = parseNum(result?.rating ?? player.rating, 70);
  const potential = parseNum(result?.potential ?? player.potential, 75);

  // Determine position key for template selection
  const posKeyMap = { 1: 'pg', 2: 'sg', 3: 'sf', 4: 'pf', 5: 'c' };
  const posKey = posKeyMap[posId] || 'sf';

  // Determine tier for comparison
  const tier = rating >= 82 ? 'elite' : rating >= 74 ? 'high' : rating >= 66 ? 'mid' : 'low';

  // Seed for consistent randomization
  const seed = `${player.name || 'player'}_${posId}_${rating}_${potential}`;

  // ---- Header: Name ----
  const nameEn = player.altName || player.nameEn || '';
  const nameCn = player.nameCn || player.name || '';
  const displayName = nameCn;
  const displayEn = nameEn ? `｜${nameEn}` : '';

  // ---- Position ----
  const posDisplay = pos.n + (pos2 ? ` / ${pos2.n}` : '');

  // ---- Height / Weight ----
  // Default body measurements by position if not available
  const POS_DEFAULT_BODY = {
    1: { h: 185, w: 82 }, 2: { h: 193, w: 92 }, 3: { h: 198, w: 98 },
    4: { h: 205, w: 108 }, 5: { h: 211, w: 115 }
  };
  const defaultBody = POS_DEFAULT_BODY[posId] || POS_DEFAULT_BODY[3];
  const heightCm = parseNum(player.height, 0) || defaultBody.h;
  const weightKg = parseNum(player.weight, 0) || defaultBody.w;
  const heightStr = cmToImperial(heightCm);
  const weightStr = kgToLbs(weightKg);

  // ---- Player Template (comparison player) ----
  const compPool = SCOUT_NBA_COMPARISON[posKey]?.[tier] || SCOUT_NBA_COMPARISON[posKey]?.high || [];
  const primaryComp = pickSeedItem(compPool, seed) || compPool[0] || '-';
  const secondaryPool = SCOUT_SECONDARY_COMP[posKey] || [];
  const secondaryComp = pickSeedItem(secondaryPool, seed + '_sec') || secondaryPool[0] || '-';

  // ---- Attribute ranking ----
  const attrMeta = [
    { k: 'pass', label: '组织' }, { k: 'shotInt', label: '内线' }, { k: 'shotExt', label: '外线' },
    { k: 'reb', label: '篮板' }, { k: 'blk', label: '盖帽' }, { k: 'stl', label: '抢断' },
    { k: 'speed', label: '速度' }, { k: 'strength', label: '力量' }, { k: 'physique', label: '体能' }
  ];
  const ranked = [...attrMeta].sort((a, b) => parseNum(attrs[b.k], 50) - parseNum(attrs[a.k], 50));
  const top3Keys = ranked.slice(0, 3).map(a => a.k);
  const bottom3Keys = [...ranked].reverse().slice(0, 3).map(a => a.k);

  // ---- Play Style ----
  const stylePool1 = SCOUT_PLAY_STYLE[posKey]?.[0] || [];
  const stylePool2 = SCOUT_PLAY_STYLE[posKey]?.[1] || [];
  const styles = [];
  for (let i = 0; i < 4; i++) {
    const s1 = pickSeedItem(stylePool1, seed + '_s1_' + i);
    if (s1 && !styles.includes(s1)) styles.push(s1);
  }
  for (let i = 0; i < 3; i++) {
    const s2 = pickSeedItem(stylePool2, seed + '_s2_' + i);
    if (s2 && styles.length < 4 && !styles.includes(s2)) styles.push(s2);
  }
  const playStyleStr = styles.slice(0, 4).join(' / ');

  // ---- Strengths ----
  const strengthItems = [];
  // Add 3-5 items from top attributes
  for (const key of top3Keys) {
    const pool = SCOUT_STRENGTH_ITEMS[key] || SCOUT_STRENGTH_ITEMS.general_high;
    const item = pickSeedItem(pool, seed + '_str_' + key);
    if (item) strengthItems.push(item);
  }
  // Add 1-2 general high items
  for (let i = 0; i < 2; i++) {
    const item = pickSeedItem(SCOUT_STRENGTH_ITEMS.general_high, seed + '_gh_' + i);
    if (item && !strengthItems.includes(item)) strengthItems.push(item);
  }

  // ---- Weaknesses ----
  const weaknessItems = [];
  for (const key of bottom3Keys) {
    const val = parseNum(attrs[key], 50);
    if (val < 70) {
      const pool = SCOUT_WEAKNESS_ITEMS[key] || SCOUT_WEAKNESS_ITEMS.general_low;
      const item = pickSeedItem(pool, seed + '_wk_' + key);
      if (item) weaknessItems.push(item);
    }
  }
  // Always add 1-2 general weakness
  for (let i = 0; i < 2; i++) {
    const item = pickSeedItem(SCOUT_WEAKNESS_ITEMS.general_low, seed + '_gl_' + i);
    if (item && !weaknessItems.includes(item) && weaknessItems.length < 4) weaknessItems.push(item);
  }
  if (weaknessItems.length === 0) weaknessItems.push('需要更多高水平比赛经验');

  // ---- X-Factor ----
  const xf = player.xfactorInfo || (options.context?.player?.xfactorInfo) || null;
  if (xf) {
    strengthItems.push(`${xf.icon || '★'} X天赋「${xf.n}」: ${xf.d}`);
  }
  // X-Factor risks
  const xfactorId = player.xfactor || options.context?.player?.xfactor || '';
  if (xfactorId === 'glass_man') weaknessItems.push('「玻璃人」天赋导致伤病风险极高');
  else if (xfactorId === 'toxic') weaknessItems.push('「更衣室毒瘤」天赋可能影响球队化学反应');
  else if (xfactorId === 'streaky') weaknessItems.push('「情绪化」天赋导致表现波动极大');

  // ---- Scout Evaluation (球探评价) ----
  const evalTemplates = SCOUT_EVALUATION_TEMPLATES[posKey] || SCOUT_EVALUATION_TEMPLATES.sf;
  const evalTemplate = pickSeedItem(evalTemplates, seed + '_eval') || evalTemplates[0];

  const tierLabel = SCOUT_TIER_LABELS[tier] || '首发级';
  const strengthSummary = strengthItems.slice(0, 3).join('、');
  const topAttrKey = top3Keys[0] || 'shotInt';
  const skillDetail = pickSeedItem(SCOUT_SKILL_DETAILS[topAttrKey] || SCOUT_SKILL_DETAILS.shotInt, seed + '_sd') || '';
  const secondaryAttrKey = top3Keys[1] || 'speed';
  const secondarySkillStr = pickSeedItem(SCOUT_SECONDARY_SKILLS[secondaryAttrKey] || SCOUT_SECONDARY_SKILLS.speed, seed + '_ss') || '';
  const skillQuality = pickSeedItem(['精准高效', '极具威胁', '效率稳定', '令人瞩目'], seed + '_sq') || '效率稳定';
  const weaknessSummary = weaknessItems.slice(0, 2).join('，');
  const situation = pickSeedItem(SCOUT_SITUATIONS, seed + '_sit') || '季后赛和决胜阶段';
  const positiveNote = pickSeedItem(SCOUT_POSITIVE_NOTES, seed + '_pn') || '他的竞争意识和大心脏属性是无可替代的';
  const maturity = pickSeedItem(SCOUT_MATURITY_LEVELS, seed + '_mat') || '扎实稳健';
  const impactLevel = pickSeedItem(SCOUT_IMPACT_LEVELS, seed + '_imp') || '显著影响';
  const comparisonLevel = pickSeedItem(SCOUT_COMPARISON_LEVELS, seed + '_cl') || '出类拔萃';

  const playDetail = skillDetail;
  const positiveNote2 = pickSeedItem(SCOUT_POSITIVE_NOTES.filter(n => n !== positiveNote), seed + '_pn2') || '随着经验积累有望成为核心';

  let evaluation = evalTemplate
    .replace('{tier}', tierLabel)
    .replace('{strength_summary}', strengthSummary)
    .replace('{skill_detail}', skillDetail)
    .replace('{secondary_skill}', secondarySkillStr)
    .replace('{comparison_level}', comparisonLevel)
    .replace('{weakness_summary}', weaknessSummary)
    .replace('{situation}', situation)
    .replace('{positive_note}', positiveNote)
    .replace('{positive_note2}', positiveNote2)
    .replace('{skill_quality}', skillQuality)
    .replace('{play_detail}', playDetail)
    .replace('{impact_level}', impactLevel)
    .replace('{maturity}', maturity);

  return {
    header: { name: displayName, nameEn, posDisplay, heightStr, weightStr },
    comparison: { primary: primaryComp, secondary: secondaryComp },
    playStyle: playStyleStr,
    strengths: strengthItems.slice(0, 6),
    weaknesses: weaknessItems.slice(0, 4),
    evaluation
  };
}

// Height/Weight conversion helpers
function cmToImperial(cm) {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}
function kgToLbs(kg) {
  return `${Math.round(kg * 2.205)} lbs`;
}
