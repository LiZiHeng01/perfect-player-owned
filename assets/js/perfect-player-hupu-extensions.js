(function () {
  'use strict';

  // Browser-test hook used by the game QA harness. The game itself remains
  // timer-driven; this helper simply lets tests advance through short UI waits.
  if (typeof window.advanceTime !== 'function') {
    window.advanceTime = function (ms) {
      return new Promise(function (resolve) { setTimeout(resolve, Math.max(0, Number(ms) || 0)); });
    };
  }

  var PROFILE_KEY = 'perfect-player-profile-v1';
  var AVATARS = [
    'assets/images/Player/ai-avatars/avatar-01.png',
    'assets/images/Player/ai-avatars/avatar-02.png',
    'assets/images/Player/ai-avatars/avatar-03.png',
    'assets/images/Player/ai-avatars/avatar-04.png',
    'assets/images/Player/ai-avatars/avatar-05.png',
    'assets/images/Player/ai-avatars/avatar-06.png'
  ];

  function readProfile() {
    try {
      var saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      if (saved && saved.name && AVATARS.indexOf(saved.avatar) >= 0) return saved;
    } catch (e) {}
    return null;
  }

  function applyProfile(profile) {
    window.PERFECT_PLAYER_PROFILE = profile;
    if (!profile) return;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) {}
    try { localStorage.setItem('buildplayer_nickname', profile.name); } catch (e) {}
    if (typeof HUPU_USER !== 'undefined') {
      HUPU_USER.loaded = true;
      HUPU_USER.requested = true;
      HUPU_USER.isLogin = true;
      HUPU_USER.nickname = profile.name;
      HUPU_USER.avatar = profile.avatar;
      HUPU_USER.source = 'perfect-player-character';
    }
  }

  applyProfile(readProfile());
  var selectedAvatar = window.PERFECT_PLAYER_PROFILE ? window.PERFECT_PLAYER_PROFILE.avatar : AVATARS[0];

  window.renderCharacterCreator = function () {
    var grid = document.getElementById('character-avatar-grid');
    var input = document.getElementById('character-name');
    if (!grid || !input) return;
    input.value = window.PERFECT_PLAYER_PROFILE ? window.PERFECT_PLAYER_PROFILE.name : '';
    grid.innerHTML = AVATARS.map(function (src, index) {
      var selected = src === selectedAvatar ? ' selected' : '';
      return '<button type="button" class="character-avatar' + selected + '" data-avatar="' + src + '" onclick="selectCharacterAvatar(\'' + src + '\')" aria-label="选择头像' + (index + 1) + '">' +
        '<img src="' + src + '" alt="球员头像' + (index + 1) + '">' +
      '</button>';
    }).join('');
    input.oninput = function () {
      var error = document.getElementById('character-error');
      if (error) error.textContent = '';
    };
  };

  window.selectCharacterAvatar = function (src) {
    if (AVATARS.indexOf(src) < 0) return;
    selectedAvatar = src;
    document.querySelectorAll('.character-avatar').forEach(function (button) {
      button.classList.toggle('selected', button.getAttribute('data-avatar') === src);
    });
    var error = document.getElementById('character-error');
    if (error) error.textContent = '';
  };

  window.showCharacterCreate = function () {
    window.renderCharacterCreator();
    if (typeof showScreen === 'function') showScreen('screen-character');
    setTimeout(function () {
      var input = document.getElementById('character-name');
      if (input) input.focus();
    }, 80);
  };

  window.confirmCharacter = function () {
    var input = document.getElementById('character-name');
    var error = document.getElementById('character-error');
    var name = input ? input.value.trim() : '';
    if (!name) {
      if (error) error.textContent = '请输入球员姓名';
      if (input) input.focus();
      return;
    }
    var profile = { name: name.slice(0, 12), avatar: selectedAvatar };
    applyProfile(profile);
    if (typeof showScreen === 'function') showScreen('screen-position');
  };

  var TEAM_TO_ABBR = {
    '凯尔特人':'BOS', '篮网':'BKN', '尼克斯':'NYK', '76人':'PHI', '猛龙':'TOR',
    '公牛':'CHI', '骑士':'CLE', '活塞':'DET', '步行者':'IND', '雄鹿':'MIL',
    '老鹰':'ATL', '黄蜂':'CHA', '热火':'MIA', '魔术':'ORL', '奇才':'WAS',
    '掘金':'DEN', '森林狼':'MIN', '雷霆':'OKC', '开拓者':'POR', '爵士':'UTA',
    '勇士':'GSW', '快船':'LAC', '湖人':'LAL', '太阳':'PHX', '国王':'SAC',
    '独行侠':'DAL', '火箭':'HOU', '灰熊':'MEM', '鹈鹕':'NOP', '马刺':'SAS'
  };
  var POSITIONS = { 1:'PG', 2:'SG', 3:'SF', 4:'PF', 5:'C' };
  var POSITION_HEIGHT = { PG:"6'2'", SG:"6'5'", SF:"6'7'", PF:"6'9'", C:"6'11'" };

  function clamp(value, low, high) {
    value = Math.round(Number(value) || low);
    return Math.max(low, Math.min(high, value));
  }

  function average(a, b) {
    return Math.round(((Number(a) || 50) + (Number(b) || 50)) / 2);
  }

  function convertPlayer(player) {
    var attrs = player.attrs || {};
    var mainPos = POSITIONS[player.pos] || 'SF';
    var secondPos = POSITIONS[player.pos2];
    var pos = mainPos + (secondPos && secondPos !== mainPos ? ' / ' + secondPos : '');
    var historical = player.source && player.source.kind !== 'current';
    var clutchBoost = Math.min(8, Math.round((Number(player.starScore) || 0) / 35));
    return {
      name: player.nameEn || player.altName || player.name,
      cname: player.nameCn || player.name,
      pos: pos,
      height: POSITION_HEIGHT[mainPos],
      type: historical ? '历史全明星' : '现役球员',
      ovr: clamp(player.rating, 50, 99),
      threePT: clamp(attrs.shotExt, 35, 99),
      MID: clamp(attrs.shotInt, 35, 99),
      FIN: clamp(average(attrs.shotInt, attrs.physique), 35, 99),
      DNK: clamp(average(attrs.shotInt, attrs.strength), 35, 99),
      HAN: clamp(average(attrs.pass, attrs.speed), 35, 99),
      PAS: clamp(attrs.pass, 35, 99),
      PDEF: clamp(average(attrs.stl, attrs.speed), 35, 99),
      IDEF: clamp(average(attrs.blk, attrs.reb), 35, 99),
      BLK: clamp(attrs.blk, 35, 99),
      REB: clamp(attrs.reb, 35, 99),
      ATH: clamp(average(attrs.speed, attrs.physique), 35, 99),
      STR: clamp(attrs.strength, 35, 99),
      CLU: clamp((Number(player.rating) || 70) + clutchBoost, 35, 99),
      _sourceKind: historical ? 'historical' : 'current',
      _sourceYear: player.source ? player.source.year : 2025,
      _sourceLabel: player.source ? player.source.label : '2025-26',
      _photoLocal: player.photoLocal,
      _photoUrl: player.photoUrl || '',
      _poolUid: player.uid
    };
  }

  window.PERFECT_PLAYER_PHOTO_BY_NAME = window.PERFECT_PLAYER_PHOTO_BY_NAME || {};
  window.PERFECT_PLAYER_DISPLAY_BY_NAME = window.PERFECT_PLAYER_DISPLAY_BY_NAME || {};
  window.PERFECT_PLAYER_BUILD_DATA = window.PERFECT_PLAYER_BUILD_DATA || {};
  window.PERFECT_PLAYER_DATA_READY = fetch('assets/data/perfect-player-pool.json?v=20260807')
    .then(function (response) {
      if (!response.ok) throw new Error('球员库加载失败：' + response.status);
      return response.json();
    })
    .then(function (payload) {
      var report = {
        teams: 0,
        teamsWithTarget18: 0,
        current: 0,
        historical: 0,
        total: 0,
        historicalBuildOnly: true,
        competitionRosterSource: 'NBA2K_DATA (current-only)'
      };
      Object.keys(payload.teams || {}).forEach(function (teamId) {
        var sourceTeam = payload.teams[teamId];
        var abbr = TEAM_TO_ABBR[sourceTeam.name];
        if (!abbr || typeof NBA2K_DATA === 'undefined' || !NBA2K_DATA[abbr]) return;
        var converted = (sourceTeam.players || []).map(convertPlayer);
        converted.forEach(function (player) {
          window.PERFECT_PLAYER_PHOTO_BY_NAME[player.name] = player._photoLocal || player._photoUrl || '';
          window.PERFECT_PLAYER_DISPLAY_BY_NAME[player.name] = player.cname || player.name;
          report[player._sourceKind] += 1;
        });
        window.PERFECT_PLAYER_BUILD_DATA[abbr] = converted;
        report.teams += 1;
        if (sourceTeam.currentCount === 12 && sourceTeam.historicalCount === 6) report.teamsWithTarget18 += 1;
        report.total += converted.length;
      });
      window.PERFECT_PLAYER_POOL_REPORT = report;
      return report;
    })
    .catch(function (error) {
      window.PERFECT_PLAYER_POOL_ERROR = String(error && error.message ? error.message : error);
      return null;
    });

  function signed(value) {
    value = Math.round(Number(value) || 0);
    return value > 0 ? '+' + value : String(value);
  }

  window.renderPlayerStateStrip = function () {
    var career = typeof STATE !== 'undefined' && STATE.career ? STATE.career : {};
    var profile = career.profile || {};
    var mods = typeof getNextSeasonMods === 'function' ? getNextSeasonMods() : {};
    var values = [
      { key:'pressure', label:'压力', value:typeof getMentalPressure === 'function' ? Math.round(getMentalPressure()) : 0, badHigh:true, raw:true },
      { key:'staminaLoad', label:'体能负荷', value:mods.staminaLoad, badHigh:true },
      { key:'moraleBonus', label:'士气', value:mods.moraleBonus, goodHigh:true },
      { key:'formVariance', label:'状态波动', value:mods.formVariance, badHigh:true },
      { key:'injuryRiskBonus', label:'伤病风险', value:mods.injuryRiskBonus, badHigh:true },
      { key:'teamChemistry', label:'球队默契', value:mods.teamChemistry, goodHigh:true },
      { key:'mediaPressure', label:'媒体压力', value:mods.mediaPressure, badHigh:true },
      { key:'fame', label:'人气', value:profile.fame, goodHigh:true },
      { key:'businessValue', label:'商业价值', value:profile.businessValue, goodHigh:true },
      { key:'mediaTrust', label:'媒体信任', value:profile.mediaTrust, goodHigh:true },
      { key:'controversy', label:'争议', value:profile.controversy, badHigh:true },
      { key:'chinaPopularity', label:'中国人气', value:profile.chinaPopularity, goodHigh:true },
      { key:'loyalty', label:'忠诚', value:profile.loyalty, goodHigh:true },
      { key:'leadership', label:'领导力', value:profile.leadership, goodHigh:true },
      { key:'coachTrust', label:'教练信任', value:profile.coachTrust, goodHigh:true },
      { key:'lockerRoomTrust', label:'更衣室信任', value:profile.lockerRoomTrust, goodHigh:true },
      { key:'fanSupport', label:'球迷支持', value:profile.fanSupport, goodHigh:true },
      { key:'legacyBonus', label:'传奇加成', value:profile.legacyBonus, goodHigh:true }
    ];
    return '<div class="player-state-strip" id="player-state-strip" aria-label="球员完整状态">' + values.map(function (item) {
      var value = Math.round(Number(item.value) || 0);
      var stateClass = item.badHigh && value > 0 ? ' alert' : (item.goodHigh && value > 0 ? ' good' : (item.goodHigh && value < 0 ? ' alert' : ''));
      return '<div class="player-state-item' + stateClass + '" data-status-key="' + item.key + '" title="' + item.label + '">' +
        '<span class="player-state-value">' + (item.raw ? value : signed(value)) + '</span><span class="player-state-label">' + item.label + '</span></div>';
    }).join('') + '</div>';
  };

  function draftPending() {
    if (typeof STATE === 'undefined') return null;
    STATE._draftPending = STATE._draftPending || { draftStockBonus:0, randomEventIds:[] };
    STATE._draftPending.randomEventIds = STATE._draftPending.randomEventIds || [];
    return STATE._draftPending;
  }

  function changeDraftStock(amount) {
    var pending = draftPending();
    if (pending) pending.draftStockBonus = (Number(pending.draftStockBonus) || 0) + amount;
  }

  var DRAFT_RANDOM_EVENTS = [
    { id:'medical_recheck', stage:'pre', title:'医疗复查', scene:'一支握有高顺位签的球队临时要求追加膝盖检查。检查室外已经站了几名记者，经纪人问你要不要公开结果。', choices:[
      { label:'公开检查结果', hint:'透明，但结果也可能改变行情', apply:function() { var clean = Math.random() < 0.72; addProfileDelta('mediaTrust', 1); changeDraftStock(clean ? 1 : -1); if (!clean) addSeasonMod('injuryRiskBonus', 1, -4, 8); return clean ? '报告没有异常，球队对你的透明态度很满意。<br><br>效果：媒体信任+1；选秀行情上升。' : '报告里出现一处需要观察的小问题，消息很快传到各队。<br><br>效果：媒体信任+1；选秀行情下降；伤病风险+1。'; } },
      { label:'只交给球队', hint:'控制消息，不让媒体介入', apply:function() { addProfileDelta('controversy', 1); addProfileDelta('mediaTrust', -1); return '报告只在球队之间流转。你避免了公开讨论，但媒体开始猜测你在隐瞒什么。<br><br>效果：争议+1；媒体信任-1。'; } }
    ]},
    { id:'elite_workout', stage:'pre', title:'加赛试训', scene:'试训结束后，球探临时安排你和另一名热门新秀打一组五分钟对抗。所有摄像机又重新开了起来。', choices:[
      { label:'接下单挑', hint:'赢了大涨，输了也会被看见', apply:function() { var won = Math.random() < 0.58; changeDraftStock(won ? 2 : -1); if (won) addProfileDelta('fame', 1); else addSeasonMod('formVariance', 1, -10, 10); return won ? '你连续打成两个关键回合，球探席明显躁动起来。<br><br>效果：人气+1；选秀行情明显上升。' : '你强行接管比赛，却在最后两个回合失误。<br><br>效果：选秀行情下降；状态波动+1。'; } },
      { label:'按战术打完', hint:'不抢镜，展示执行力', apply:function() { addProfileDelta('coachTrust', 1); changeDraftStock(1); return '你没有把它当单挑，而是连续做出正确传球。主教练在报告上圈出了你的名字。<br><br>效果：教练信任+1；选秀行情小幅上升。'; } }
    ]},
    { id:'viral_interview', stage:'pre', title:'采访突然走红', scene:'你在训练馆门口的一段即兴采访突然登上热搜。经纪人建议趁热再录一段完整回应。', choices:[
      { label:'趁热回应', hint:'扩大曝光，也增加压力', apply:function() { addProfileDelta('fame', 2); addSeasonMod('mediaPressure', 1, -10, 10); if (Math.random() < 0.35) changeDraftStock(1); return '第二段采访的播放量继续上涨，你的名字第一次冲出球探圈。<br><br>效果：人气+2；媒体压力+1。'; } },
      { label:'回训练馆', hint:'让热度自然过去', apply:function() { addSeasonMod('formVariance', -1, -10, 10); addProfileDelta('coachTrust', 1); return '你没有继续追热点。第二天球探收到的是你加练到深夜的消息。<br><br>效果：状态波动-1；教练信任+1。'; } }
    ]},
    { id:'team_promise', stage:'pre', title:'口头承诺', scene:'一支球队私下暗示会在自己的顺位选你，条件是你取消后面的所有试训。经纪人提醒：口头承诺随时可能变化。', choices:[
      { label:'接受承诺', hint:'锁定下限，但把主动权交出去', apply:function() { var kept = Math.random() < 0.76; changeDraftStock(kept ? 1 : -2); addProfileDelta('loyalty', 1); return kept ? '球队兑现了大部分承诺，你的团队也停止向外放消息。<br><br>效果：忠诚+1；选秀行情稳定上升。' : '交易流言改变了球队计划，原来的承诺开始松动。<br><br>效果：忠诚+1；选秀行情明显下降。'; } },
      { label:'继续全部试训', hint:'保留选择，承担体能消耗', apply:function() { addProfileDelta('coachTrust', 1); addSeasonMod('staminaLoad', 1, -10, 10); return '你按原计划完成剩余试训。几支球队认可你的职业态度，但连续奔波留下了疲劳。<br><br>效果：教练信任+1；体能负荷+1。'; } }
    ]},
    { id:'flight_delay', stage:'pre', title:'航班延误', scene:'前往最后一站试训的航班延误六小时。改签红眼航班还能赶上，推迟则可能错过球队最后的决策会。', choices:[
      { label:'连夜赶过去', hint:'保住机会，状态未必在线', apply:function() { addSeasonMod('staminaLoad', 1, -10, 10); var sharp = Math.random() < 0.55; changeDraftStock(sharp ? 1 : -1); return sharp ? '你几乎没睡，却在投篮测试里保持了准度。<br><br>效果：体能负荷+1；选秀行情上升。' : '疲劳让你的横移和投篮都慢了半拍。<br><br>效果：体能负荷+1；选秀行情下降。'; } },
      { label:'申请改期', hint:'保护身体，但球队未必等你', apply:function() { addSeasonMod('formVariance', -1, -10, 10); if (Math.random() < 0.35) changeDraftStock(-1); return '你选择先恢复身体。球队接受了说明，但没有保证会重新安排。<br><br>效果：状态波动-1。'; } }
    ]},
    { id:'film_room_test', stage:'pre', title:'临场录像问答', scene:'试训结束前，教练突然暂停一段比赛录像，让你在十秒内说出场上五个人下一步该怎么站位。', choices:[
      { label:'立刻回答', hint:'相信第一判断', apply:function() { var right = Math.random() < 0.66; changeDraftStock(right ? 1 : -1); return right ? '你的答案和教练的战术板几乎一致。<br><br>效果：选秀行情上升。' : '你看到了第一层机会，却漏掉弱侧轮转。<br><br>效果：选秀行情小幅下降。'; } },
      { label:'先问战术原则', hint:'展示沟通和学习能力', apply:function() { addProfileDelta('coachTrust', 2); return '你先确认球队的防守原则，再给出完整答案。教练对这种沟通方式很满意。<br><br>效果：教练信任+2。'; } }
    ]},
    { id:'family_phone', stage:'post', title:'家人的电话', scene:'选秀结果出来后，家里第一个电话打了进来。电话那头很吵，所有人都在等你说第一句话。', choices:[
      { label:'把这一刻留给家人', hint:'先离开镜头几分钟', apply:function() { addProfileDelta('loyalty', 2); addProfileDelta('fanSupport', 1); return '你走到走廊尽头，和家人安静地说完这通电话。<br><br>效果：忠诚+2；球迷支持+1。'; } },
      { label:'开免提一起庆祝', hint:'让镜头记录这一刻', apply:function() { addProfileDelta('fame', 1); addProfileDelta('fanSupport', 2); return '欢呼声通过免提传遍房间，这段画面很快被转发。<br><br>效果：人气+1；球迷支持+2。'; } }
    ]},
    { id:'suit_sponsor', stage:'post', title:'西装赞助邀约', scene:'一家新品牌当晚提出赞助，希望你立刻穿着他们的西装接受采访，但经纪人还没来得及审合同。', choices:[
      { label:'先签短约', hint:'抓住第一笔商业机会', apply:function() { addProfileDelta('businessValue', 2); addProfileDelta('mediaTrust', -1); return '你完成了第一次商业合作，合同细节却被记者追问了整晚。<br><br>效果：商业价值+2；媒体信任-1。'; } },
      { label:'等团队审核', hint:'少赚一点，避免仓促决定', apply:function() { addProfileDelta('mediaTrust', 1); addProfileDelta('businessValue', 1); return '你没有被当晚的热度催着签字，品牌最终仍保留了合作。<br><br>效果：媒体信任+1；商业价值+1。'; } }
    ]},
    { id:'trade_rumor', stage:'post', title:'交易流言', scene:'你的名字刚出现在选秀字幕上，记者就说选中你的球队正在讨论交易。经纪人问你是否要公开回应。', choices:[
      { label:'不评论流言', hint:'等官方消息', apply:function() { addProfileDelta('mediaTrust', 1); addSeasonMod('mediaPressure', -1, -10, 10); return '你只说自己会为任何球队做好准备，流言没有从你这里得到第二轮热度。<br><br>效果：媒体信任+1；媒体压力-1。'; } },
      { label:'表达加盟意愿', hint:'先向选中你的球队示好', apply:function() { addProfileDelta('loyalty', 1); addProfileDelta('controversy', 1); return '你的表态赢得一部分球迷，也让潜在交易对象感到尴尬。<br><br>效果：忠诚+1；争议+1。'; } }
    ]},
    { id:'veteran_message', stage:'post', title:'老将的短信', scene:'一名球队老将发来短信：欢迎，但轮换位置不会因为顺位自动交给你。', choices:[
      { label:'约他第二天训练', hint:'直接用行动回应', apply:function() { addProfileDelta('lockerRoomTrust', 2); addSeasonMod('teamChemistry', 1, -10, 10); return '你们约好第二天早上见。第一堂训练课比发布会更早开始。<br><br>效果：更衣室信任+2；球队默契+1。'; } },
      { label:'回复会靠自己争取', hint:'明确竞争态度', apply:function() { addProfileDelta('leadership', 1); addProfileDelta('controversy', 1); return '老将只回了一个拳头表情。更衣室已经知道你不会安静等待。<br><br>效果：领导力+1；争议+1。'; } }
    ]},
    { id:'social_reaction', stage:'post', title:'社交媒体评价', scene:'评论区同时出现“最大遗珠”和“严重高估”两种声音。团队问你要不要转发其中一条。', choices:[
      { label:'转发支持者', hint:'回应球迷，扩大热度', apply:function() { addProfileDelta('fanSupport', 2); addSeasonMod('mediaPressure', 1, -10, 10); return '支持你的话题迅速聚集起来，新的关注也意味着新的审视。<br><br>效果：球迷支持+2；媒体压力+1。'; } },
      { label:'关闭评论', hint:'把注意力拉回篮球', apply:function() { addSeasonMod('formVariance', -1, -10, 10); addProfileDelta('mediaTrust', 1); return '你把手机交给团队，回到训练计划。第二天采访时，你的回答明显更平静。<br><br>效果：状态波动-1；媒体信任+1。'; } }
    ]},
    { id:'rookie_number', stage:'post', title:'号码选择', scene:'装备经理发来可选号码。你最熟悉的号码不在其中，只能在纪念过去和开启新身份之间做选择。', choices:[
      { label:'选有纪念意义的号码', hint:'向来路致意', apply:function() { addProfileDelta('loyalty', 1); addProfileDelta('chinaPopularity', 1); return '你选了一个只有家人和老球迷能看懂的号码。它很快有了自己的故事。<br><br>效果：忠诚+1；中国人气+1。'; } },
      { label:'选一个全新号码', hint:'从 NBA 重新开始', apply:function() { addProfileDelta('fame', 1); addProfileDelta('leadership', 1); return '你决定让新号码只代表 NBA 里的自己。第一批球衣很快开始印刷。<br><br>效果：人气+1；领导力+1。'; } }
    ]},
    // ===== 追加事件：扩充池子（弹出概率已在 runPerfectPlayerDraftRandomEvent 中收紧） =====
    { id:'shoe_deal_bidding', stage:'pre', title:'球鞋竞标', scene:'两家球鞋品牌在选秀前争抢你的签名。一家给的钱更多，另一家承诺给你专属产品线，但要你现在就站队。', choices:[
      { label:'选高报价合同', hint:'先把钱拿到手', apply:function() { addProfileDelta('businessValue', 3); addProfileDelta('loyalty', -1); return '你签下了报价更高的一份。数字很漂亮，但另一家在社媒上意味深长地祝你好运。<br><br>效果：商业价值+3；忠诚-1。'; } },
      { label:'选专属产品线', hint:'赌长期价值', apply:function() { addProfileDelta('businessValue', 1); addProfileDelta('fame', 1); if (Math.random() < 0.4) changeDraftStock(1); return '你押注在能长期陪你成长的品牌上。发布会当天，你的名字第一次和一双鞋绑在了一起。<br><br>效果：商业价值+1；人气+1。'; } }
    ]},
    { id:'draft_night_outfit', stage:'pre', title:'选秀夜造型', scene:'造型团队准备了三套方案：低调经典、大胆先锋、还是带有家乡元素的定制款。镜头会记住你走上舞台的第一个画面。', choices:[
      { label:'大胆先锋造型', hint:'博眼球，也可能被议论', apply:function() { addProfileDelta('fame', 2); addProfileDelta('controversy', 1); return '你的造型当晚就上了时尚版热搜，评价两极，但没有人记不住你。<br><br>效果：人气+2；争议+1。'; } },
      { label:'家乡元素定制', hint:'讲好自己的故事', apply:function() { addProfileDelta('chinaPopularity', 2); addProfileDelta('fanSupport', 1); return '你把家乡的图案缝进西装内衬。采访里你讲起它的含义，很多人因此记住了你从哪来。<br><br>效果：中国人气+2；球迷支持+1。'; } },
      { label:'低调经典造型', hint:'让实力说话', apply:function() { addProfileDelta('mediaTrust', 1); return '你穿了一套挑不出毛病的西装，把所有话题都留给了球场。<br><br>效果：媒体信任+1。'; } }
    ]},
    { id:'mock_draft_slip', stage:'pre', title:'模拟选秀下滑', scene:'一份权威模拟选秀把你的顺位往后调了几位，理由是"上限存疑"。经纪人问你要不要公开回应这份榜单。', choices:[
      { label:'用训练视频回应', hint:'把质疑变成动力', apply:function() { if (Math.random() < 0.55) { changeDraftStock(1); return '你放出一段高强度训练视频，几家球队重新把你列入试训名单。<br><br>效果：选秀行情回升。'; } addSeasonMod('formVariance', 1, -10, 10); return '视频没有改变太多风向，但至少证明了你没有松懈。<br><br>效果：状态波动+1。'; } },
      { label:'不予理会', hint:'专注自己的节奏', apply:function() { addProfileDelta('mediaTrust', 1); addSeasonMod('formVariance', -1, -10, 10); return '你没有回应任何一份榜单，只是照常训练。安静反而让人高看一眼。<br><br>效果：媒体信任+1；状态波动-1。'; } }
    ]},
    { id:'agent_dinner', stage:'pre', title:'球队高层晚宴', scene:'一支彩票区球队约你共进晚餐。饭桌上没有谈篮球，全在聊你的性格和抗压能力。你意识到这也是一场考试。', choices:[
      { label:'坦诚展现自己', hint:'真实，但风险自负', apply:function() { if (Math.random() < 0.6) { changeDraftStock(1); addProfileDelta('mediaTrust', 1); return '你没有背稿子，聊得很真诚。第二天球队管理层给了你很正面的评价。<br><br>效果：选秀行情上升；媒体信任+1。'; } addProfileDelta('controversy', 1); return '你说得太直接，有句玩笑被理解偏了。<br><br>效果：争议+1。'; } },
      { label:'滴水不漏地应对', hint:'安全，但少了记忆点', apply:function() { addProfileDelta('coachTrust', 1); return '你把每个问题都答得四平八稳。球队觉得你成熟，但也没什么惊喜。<br><br>效果：教练信任+1。'; } }
    ]},
    { id:'draft_charity', stage:'post', title:'第一笔慈善', scene:'签约奖金还没到账，家乡的青少年篮球营就发来求助信息。经纪团队提醒你现金流还很紧张。', choices:[
      { label:'个人出资支持', hint:'回馈家乡', apply:function() { addProfileDelta('chinaPopularity', 3); addProfileDelta('fanSupport', 1); addProfileDelta('businessValue', -1); return '你悄悄捐了第一笔钱，直到孩子们的照片被传上网，大家才知道。<br><br>效果：中国人气+3；球迷支持+1；商业价值-1。'; } },
      { label:'承诺赛季后再帮', hint:'先稳住自己的脚跟', apply:function() { addProfileDelta('loyalty', 1); return '你回复说等站稳脚跟一定回来。这句话被截图保存，很多人在等你兑现。<br><br>效果：忠诚+1。'; } }
    ]},
    { id:'summer_league_buzz', stage:'post', title:'夏季联赛焦点', scene:'夏季联赛第一场你就打出亮眼表现，媒体开始造势。教练组却提醒你别被夏联的数据冲昏头。', choices:[
      { label:'继续保持火力', hint:'趁热证明自己', apply:function() { if (Math.random() < 0.55) { addProfileDelta('fame', 2); return '你在夏联持续爆发，新秀榜上开始有了你的名字。<br><br>效果：人气+2。'; } addSeasonMod('staminaLoad', 1, -10, 10); return '你太想证明自己，出手选择有些勉强，教练在场边皱了眉。<br><br>效果：体能负荷+1。'; } },
      { label:'打磨短板', hint:'把夏联当训练场', apply:function() { addProfileDelta('coachTrust', 2); return '你主动要求多打自己不擅长的位置。数据没那么华丽，但教练组记住了你的态度。<br><br>效果：教练信任+2。'; } }
    ]},
    { id:'hometown_return', stage:'post', title:'衣锦还乡', scene:'选秀结束后的第一个休息日，家乡想为你办一场欢迎仪式。这会占掉你宝贵的适应期时间。', choices:[
      { label:'回去参加仪式', hint:'和家乡一起庆祝', apply:function() { addProfileDelta('chinaPopularity', 2); addProfileDelta('fanSupport', 2); addSeasonMod('staminaLoad', 1, -10, 10); return '你站在挤满人的广场上，忽然明白自己代表的不只是一个人。<br><br>效果：中国人气+2；球迷支持+2；体能负荷+1。'; } },
      { label:'留队投入训练', hint:'先抓住立足机会', apply:function() { addProfileDelta('coachTrust', 1); addSeasonMod('formVariance', -1, -10, 10); return '你婉拒了仪式，把时间全给了训练馆。家乡人有点失落，但更多人说理解。<br><br>效果：教练信任+1；状态波动-1。'; } }
    ]}
  ];

  var DRAFT_EVENT_STAGE_CHANCE = { pre: 0.65, post: 0.55 };
  var DRAFT_EVENT_PRE_COUNT = DRAFT_RANDOM_EVENTS.filter(function(event) { return event.stage === 'pre'; }).length;
  var DRAFT_EVENT_POST_COUNT = DRAFT_RANDOM_EVENTS.filter(function(event) { return event.stage === 'post'; }).length;
  var DRAFT_EVENT_MAX_PER_RUN = 2;
  window.PERFECT_PLAYER_DRAFT_EVENT_REPORT = {
    total: DRAFT_RANDOM_EVENTS.length,
    pre: DRAFT_EVENT_PRE_COUNT,
    post: DRAFT_EVENT_POST_COUNT,
    perRun: DRAFT_EVENT_MAX_PER_RUN,
    stageChance: DRAFT_EVENT_STAGE_CHANCE
  };
  window.pickPerfectPlayerDraftEventId = function(stage, seen) {
    seen = seen || [];
    var pool = DRAFT_RANDOM_EVENTS.filter(function(event) { return event.stage === stage && seen.indexOf(event.id) < 0; });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)].id;
  };
  // Probability that a random event actually fires at each draft stage.
  // Why: the draft already runs a long fixed narrative chain (前夜→经纪→试训→结果→合同…),
  // so firing a guaranteed extra modal both pre- and post-draft felt like event spam.
  // Gate each stage and cap the whole draft at two events. The seen-id filter
  // keeps the pre/post pulls from repeating within one draft run.

  window.runPerfectPlayerDraftRandomEvent = function(stage, done) {
    var pending = draftPending();
    if (!pending || typeof showDraftChoiceModal !== 'function') { if (done) done(); return; }
    // Hard cap: at most two random events across the entire draft run.
    if ((pending.randomEventIds || []).length >= DRAFT_EVENT_MAX_PER_RUN) { if (done) done(); return; }
    var chance = DRAFT_EVENT_STAGE_CHANCE[stage];
    if (chance == null) chance = 0.4;
    if (Math.random() >= chance) { if (done) done(); return; }
    var id = window.pickPerfectPlayerDraftEventId(stage, pending.randomEventIds);
    var event = DRAFT_RANDOM_EVENTS.find(function(item) { return item.id === id; });
    if (!event) { if (done) done(); return; }
    pending.randomEventIds.push(event.id);
    showDraftChoiceModal('draft_random_' + event.id, event.title, event.scene, event.choices, done);
  };

  window.render_game_to_text = function () {
    var active = document.querySelector('.screen.active');
    var state = typeof STATE !== 'undefined' ? STATE : {};
    var career = state.career || {};
    var season = state.season || {};
    return JSON.stringify({
      screen: active ? active.id : null,
      character: window.PERFECT_PLAYER_PROFILE || null,
      build: { team:state.currentTeam || null, locked:state.lockedCount || 0, candidates:document.querySelectorAll('.br-player').length, candidatesUnique: (function () { var names = []; document.querySelectorAll('.br-player .bp-name').forEach(function (el) { names.push(el.textContent.trim()); }); return new Set(names).size === names.length; })(), mockAdRerollsLeft: state._mockAdRerollsLeft == null ? 3 : state._mockAdRerollsLeft, pool:window.PERFECT_PLAYER_POOL_REPORT || null },
      competition: { team:state.careerTeam || null, rosterSize:state.careerTeam && typeof NBA2K_DATA !== 'undefined' && NBA2K_DATA[state.careerTeam] ? NBA2K_DATA[state.careerTeam].length : 0, historical:state.careerTeam && typeof NBA2K_DATA !== 'undefined' && NBA2K_DATA[state.careerTeam] ? NBA2K_DATA[state.careerTeam].filter(function (p) { return p && p._sourceKind === 'historical'; }).length : 0, source:'NBA2K_DATA (current-only)' },
      career: { team:state.careerTeam || null, season:career.seasonCount || 0, record:[season.wins || 0, season.losses || 0], profile:career.profile || {}, modifiers:career.nextSeasonMods || {} },
      draftEvents: window.PERFECT_PLAYER_DRAFT_EVENT_REPORT || null,
      simulation: window.PERFECT_PLAYER_SIM_REPORT || null
    });
  };

  function registerExpandedEvents() {
    if (typeof EVENT_REGISTRY === 'undefined') return;
    var expanded = [
      { id:'ankle_landing', emoji:'🦶', title:'落地踩脚', desc:'脚踝扭伤', body:'一次争抢篮板落地时，你踩到防守人的鞋面，脚踝立刻肿了起来。队医要求你休战观察。', min:2, max:5 },
      { id:'knee_contusion', emoji:'🦵', title:'膝盖碰撞', desc:'膝盖挫伤', body:'突破过程中对手的膝盖撞上你的膝侧。影像检查没有结构损伤，但疼痛让你无法正常发力。', min:2, max:4 },
      { id:'finger_jam', emoji:'🖐️', title:'手指戳伤', desc:'手指关节扭伤', body:'抢断时篮球正面撞上指尖。你坚持打完比赛，赛后手指已经无法弯曲。', min:1, max:3 },
      { id:'back_spasm', emoji:'⚕️', title:'背部痉挛', desc:'背部痉挛', body:'连续客场和高负荷训练引发背部痉挛，队医建议暂停对抗训练并进行恢复。', min:2, max:6 },
      { id:'hamstring_tightness', emoji:'🩹', title:'腿筋拉紧', desc:'腿筋不适', body:'一次全速回防后，你感觉大腿后侧突然发紧。球队选择谨慎处理，避免演变成拉伤。', min:2, max:5 },
      { id:'shoulder_stinger', emoji:'💥', title:'肩部撞击', desc:'肩部挫伤', body:'掩护碰撞让你的肩膀一阵麻木。力量测试没有通过，队医暂时不允许你上场。', min:1, max:4 },
      { id:'wrist_sprain', emoji:'🤕', title:'手腕扭伤', desc:'手腕扭伤', body:'救球时你用手掌撑地，手腕承受了全部冲击。投篮动作受到明显影响。', min:2, max:5 },
      { id:'calf_strain', emoji:'🩺', title:'小腿拉伤', desc:'小腿肌肉拉伤', body:'启动的一瞬间，小腿像被拉住一样疼。检查确认轻度肌肉拉伤，需要一段恢复期。', min:4, max:8 },
      { id:'rib_bruise', emoji:'🛡️', title:'肋骨挫伤', desc:'肋骨挫伤', body:'冲击篮筐时你被撞出底线，肋部重重磕在摄影席。呼吸疼痛迫使你休战。', min:2, max:5 },
      { id:'concussion_protocol', emoji:'🧠', title:'触发脑震荡保护程序', desc:'脑震荡观察', body:'防守回合中你与对手头部相撞。虽然意识清醒，联盟保护程序仍要求你通过全部检测。', min:3, max:7 },
      { id:'meniscus_major', emoji:'🏥', title:'半月板损伤', desc:'半月板损伤', body:'一次急停变向后，膝盖出现卡顿和肿胀。进一步检查确认半月板损伤，你将长期缺阵。', min:18, max:32, major:true },
      { id:'achilles_major', emoji:'🚑', title:'跟腱重伤', desc:'跟腱损伤', body:'无对抗启动时，你突然回头看向身后，像是有人踢了你。检查结果让整个更衣室沉默。', min:35, max:55, major:true }
    ];
    expanded.forEach(function (def) {
      var id = 'injury_pp_' + def.id;
      if (EVENT_REGISTRY.some(function (event) { return event.id === id; })) return;
      EVENT_REGISTRY.push({
        id: id,
        name: def.title,
        weight: def.major ? 2 : 5,
        majorInjury: !!def.major,
        condition: function () { return true; },
        execute: function () {
          var games = def.min + Math.floor(Math.random() * (def.max - def.min + 1));
          return { emoji:def.emoji, title:def.title, body:def.body, desc:def.desc, _consequence:'injury', _games:games, _majorInjury:!!def.major };
        }
      });
    });
    window.PERFECT_PLAYER_EVENT_REPORT = { added: expanded.length, total: EVENT_REGISTRY.length };
  }

  registerExpandedEvents();
  document.addEventListener('DOMContentLoaded', window.renderCharacterCreator);
})();
