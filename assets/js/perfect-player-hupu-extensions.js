(function () {
  'use strict';

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
      _poolUid: player.uid
    };
  }

  window.PERFECT_PLAYER_PHOTO_BY_NAME = window.PERFECT_PLAYER_PHOTO_BY_NAME || {};
  window.PERFECT_PLAYER_DATA_READY = fetch('assets/data/perfect-player-pool.json?v=20260807')
    .then(function (response) {
      if (!response.ok) throw new Error('球员库加载失败：' + response.status);
      return response.json();
    })
    .then(function (payload) {
      var report = { teams: 0, current: 0, historical: 0, total: 0 };
      Object.keys(payload.teams || {}).forEach(function (teamId) {
        var sourceTeam = payload.teams[teamId];
        var abbr = TEAM_TO_ABBR[sourceTeam.name];
        if (!abbr || typeof NBA2K_DATA === 'undefined' || !NBA2K_DATA[abbr]) return;
        var converted = (sourceTeam.players || []).map(convertPlayer);
        converted.forEach(function (player) {
          window.PERFECT_PLAYER_PHOTO_BY_NAME[player.name] = player._photoLocal;
          report[player._sourceKind] += 1;
        });
        NBA2K_DATA[abbr].splice.apply(NBA2K_DATA[abbr], [0, NBA2K_DATA[abbr].length].concat(converted));
        report.teams += 1;
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
    var pressure = typeof getMentalPressure === 'function' ? Math.round(getMentalPressure()) : 0;
    var stamina = Math.round(Number(mods.staminaLoad) || 0);
    var morale = Math.round(Number(mods.moraleBonus) || 0);
    var media = Math.round(Number(profile.mediaTrust) || 0);
    var coach = Math.round(Number(profile.coachTrust) || 0);
    return '<div class="player-state-strip" id="player-state-strip">' +
      '<div class="player-state-item' + (pressure >= 8 ? ' alert' : '') + '"><span class="player-state-value">' + pressure + '</span><span class="player-state-label">压力</span></div>' +
      '<div class="player-state-item' + (stamina >= 3 ? ' alert' : '') + '"><span class="player-state-value">' + signed(stamina) + '</span><span class="player-state-label">体能负荷</span></div>' +
      '<div class="player-state-item' + (morale > 0 ? ' good' : (morale < 0 ? ' alert' : '')) + '"><span class="player-state-value">' + signed(morale) + '</span><span class="player-state-label">士气</span></div>' +
      '<div class="player-state-item' + (media > 0 ? ' good' : (media < 0 ? ' alert' : '')) + '"><span class="player-state-value">' + signed(media) + '</span><span class="player-state-label">媒体信任</span></div>' +
      '<div class="player-state-item' + (coach > 0 ? ' good' : (coach < 0 ? ' alert' : '')) + '"><span class="player-state-value">' + signed(coach) + '</span><span class="player-state-label">教练信任</span></div>' +
    '</div>';
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
