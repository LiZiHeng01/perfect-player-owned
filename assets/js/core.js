// core.js
// ============ GAME DATA ============

const TEAMS = [
  { id: 1, n: "Celtics", z: "凯尔特人", a: "BOS", c: "East", cl: "#007A33", r: 88 },
  { id: 2, n: "Nets", z: "篮网", a: "BKN", c: "East", cl: "#000", r: 75 },
  { id: 3, n: "Knicks", z: "尼克斯", a: "NYK", c: "East", cl: "#006BB6", r: 82 },
  { id: 4, n: "76ers", z: "76人", a: "PHI", c: "East", cl: "#006BB6", r: 80 },
  { id: 5, n: "Raptors", z: "猛龙", a: "TOR", c: "East", cl: "#CE1141", r: 76 },
  { id: 6, n: "Bulls", z: "公牛", a: "CHI", c: "East", cl: "#CE1141", r: 74 },
  { id: 7, n: "Cavaliers", z: "骑士", a: "CLE", c: "East", cl: "#860038", r: 85 },
  { id: 8, n: "Pistons", z: "活塞", a: "DET", c: "East", cl: "#C8102E", r: 70 },
  { id: 9, n: "Pacers", z: "步行者", a: "IND", c: "East", cl: "#002D62", r: 81 },
  { id: 10, n: "Bucks", z: "雄鹿", a: "MIL", c: "East", cl: "#00471B", r: 84 },
  { id: 11, n: "Hawks", z: "老鹰", a: "ATL", c: "East", cl: "#E03A3E", r: 77 },
  { id: 12, n: "Hornets", z: "黄蜂", a: "CHA", c: "East", cl: "#1D1160", r: 71 },
  { id: 13, n: "Heat", z: "热火", a: "MIA", c: "East", cl: "#98002E", r: 79 },
  { id: 14, n: "Magic", z: "魔术", a: "ORL", c: "East", cl: "#0077C0", r: 83 },
  { id: 15, n: "Wizards", z: "奇才", a: "WAS", c: "East", cl: "#002B5C", r: 68 },
  { id: 16, n: "Nuggets", z: "掘金", a: "DEN", c: "West", cl: "#0E2240", r: 86 },
  { id: 17, n: "Timberwolves", z: "森林狼", a: "MIN", c: "West", cl: "#0C2340", r: 84 },
  { id: 18, n: "Thunder", z: "雷霆", a: "OKC", c: "West", cl: "#007AC1", r: 87 },
  { id: 19, n: "Trail Blazers", z: "开拓者", a: "POR", c: "West", cl: "#E03A3E", r: 72 },
  { id: 20, n: "Jazz", z: "爵士", a: "UTA", c: "West", cl: "#002B5C", r: 69 },
  { id: 21, n: "Warriors", z: "勇士", a: "GSW", c: "West", cl: "#1D428A", r: 80 },
  { id: 22, n: "Clippers", z: "快船", a: "LAC", c: "West", cl: "#C8102E", r: 78 },
  { id: 23, n: "Lakers", z: "湖人", a: "LAL", c: "West", cl: "#552583", r: 81 },
  { id: 24, n: "Suns", z: "太阳", a: "PHX", c: "West", cl: "#1D1160", r: 79 },
  { id: 25, n: "Kings", z: "国王", a: "SAC", c: "West", cl: "#5A2D81", r: 77 },
  { id: 26, n: "Mavericks", z: "独行侠", a: "DAL", c: "West", cl: "#00538C", r: 82 },
  { id: 27, n: "Rockets", z: "火箭", a: "HOU", c: "West", cl: "#CE1141", r: 73 },
  { id: 28, n: "Grizzlies", z: "灰熊", a: "MEM", c: "West", cl: "#5D76A9", r: 83 },
  { id: 29, n: "Pelicans", z: "鹈鹕", a: "NOP", c: "West", cl: "#0C2340", r: 76 },
  { id: 30, n: "Spurs", z: "马刺", a: "SAS", c: "West", cl: "#C4CED4", r: 74 }
];

const POS = [
  { id: 1, n: "PG", z: "控球后卫", d: "组织进攻，传球为主", tend: { pass: 15, shotInt: -5, shotExt: 10, blk: -15, reb: -10, stl: 10 } },
  { id: 2, n: "SG", z: "得分后卫", d: "外线得分，投射能力强", tend: { pass: 5, shotInt: 0, shotExt: 15, blk: -10, reb: -5, stl: 5 } },
  { id: 3, n: "SF", z: "小前锋", d: "全能型，攻防兼备", tend: { pass: 0, shotInt: 5, shotExt: 5, blk: 0, reb: 0, stl: 0 } },
  { id: 4, n: "PF", z: "大前锋", d: "内线进攻，篮板能力强", tend: { pass: -5, shotInt: 10, shotExt: -5, blk: 5, reb: 10, stl: -5 } },
  { id: 5, n: "C", z: "中锋", d: "护筐，内线统治力", tend: { pass: -10, shotInt: 15, shotExt: -15, blk: 15, reb: 15, stl: -10 } }
];

const ATTRS = [
  { k: "pass", n: "传球", e: "Pass" }, { k: "shotInt", n: "内线", e: "Interior" },
  { k: "shotExt", n: "三分", e: "3PT" }, { k: "shotFree", n: "罚球", e: "FT" },
  { k: "physique", n: "体能", e: "Athletic" }, { k: "blk", n: "盖帽", e: "Block" },
  { k: "reb", n: "篮板", e: "Rebound" }, { k: "stl", n: "抢断", e: "Steal" },
  { k: "speed", n: "速度", e: "Speed" }, { k: "strength", n: "力量", e: "Strength" }
];

const TEMPLATES_BY_POS = {
  1: [
    { id: "pg_floor_general", n: "场上大脑", z: "Floor General", d: "高传控，组织优先", boost: { pass: 14, shotFree: 5, speed: 4 }, nerf: { strength: -4, blk: -8 } },
    { id: "pg_speed_breaker", n: "极速突破", z: "Speed Breaker", d: "爆发第一步，强突篮下", boost: { speed: 12, shotInt: 8, physique: 4 }, nerf: { strength: -4, reb: -4 } },
    { id: "pg_shot_creator", n: "持球投射", z: "Shot Creator", d: "挡拆后自主终结", boost: { shotExt: 10, shotInt: 5, shotFree: 6 }, nerf: { reb: -5, blk: -8 } },
    { id: "pg_pick_roll", n: "挡拆大师", z: "Pick & Roll", d: "传投兼备的挡拆发动机", boost: { pass: 10, shotExt: 7, shotInt: 4 }, nerf: { strength: -3, reb: -3 } },
    { id: "pg_two_way", n: "攻防指挥官", z: "Two-Way Guard", d: "后场防守与组织并重", boost: { pass: 8, stl: 9, speed: 4 }, nerf: { reb: -4, blk: -7 } },
    { id: "pg_press_break", n: "压迫破解", z: "Press Breaker", d: "高压下稳定控失误", boost: { pass: 11, speed: 5, physique: 3 }, nerf: { shotInt: -3, reb: -4 } },
    { id: "pg_clutch", n: "关键控卫", z: "Clutch Guard", d: "关键球处理能力突出", boost: { shotExt: 8, shotFree: 8, pass: 6 }, nerf: { blk: -7, strength: -3 } },
    { id: "pg_transition", n: "快攻发起者", z: "Transition Lead", d: "推反击节奏，转换得分", boost: { speed: 10, pass: 8, shotInt: 4 }, nerf: { strength: -4, blk: -8 } },
    { id: "pg_balanced", n: "均衡核心", z: "Balanced Creator", d: "无明显短板的核心控卫", boost: { pass: 8, shotExt: 6, speed: 4 }, nerf: { blk: -5 } }
  ],
  2: [
    { id: "sg_sniper", n: "纯射手", z: "Sniper", d: "定点与跑位投射顶级", boost: { shotExt: 14, shotFree: 7, speed: 3 }, nerf: { reb: -4, blk: -8 } },
    { id: "sg_three_level", n: "三威胁得分手", z: "Three-Level", d: "内外线都能稳定得分", boost: { shotInt: 8, shotExt: 8, shotFree: 6 }, nerf: { pass: -3, reb: -3 } },
    { id: "sg_slasher", n: "切入终结者", z: "Slasher", d: "冲击篮筐和造罚球", boost: { shotInt: 11, speed: 7, physique: 5 }, nerf: { shotExt: -6, pass: -3 } },
    { id: "sg_lock", n: "外线大锁", z: "Perimeter Lock", d: "防守对位尖兵", boost: { stl: 10, physique: 5, speed: 4 }, nerf: { pass: -4, shotFree: -3 } },
    { id: "sg_offball", n: "无球专家", z: "Off-Ball Ace", d: "空切与接球投篮兼备", boost: { shotExt: 9, speed: 6, shotInt: 4 }, nerf: { pass: -4, reb: -3 } },
    { id: "sg_microwave", n: "第六人火力", z: "Microwave", d: "上场即得分的爆发手", boost: { shotExt: 9, shotInt: 6, shotFree: 5 }, nerf: { pass: -5, reb: -4 } },
    { id: "sg_combo", n: "双能后卫", z: "Combo Guard", d: "持球与无球都能打", boost: { pass: 6, shotExt: 7, speed: 5 }, nerf: { blk: -6, reb: -3 } },
    { id: "sg_transition", n: "反击尖刀", z: "Transition Wing", d: "快攻与追身三分", boost: { speed: 8, shotInt: 6, shotExt: 5 }, nerf: { strength: -3, blk: -6 } },
    { id: "sg_two_way_star", n: "攻防明星", z: "Two-Way Star", d: "高产得分并保持防守强度", boost: { shotExt: 7, stl: 8, physique: 4 }, nerf: { reb: -3 } }
  ],
  3: [
    { id: "sf_two_way", n: "全能侧翼", z: "Two-Way Wing", d: "攻防全面的锋线核心", boost: { shotInt: 6, shotExt: 6, stl: 6 }, nerf: { pass: -2 } },
    { id: "sf_point_forward", n: "组织前锋", z: "Point Forward", d: "锋线持球组织", boost: { pass: 9, shotInt: 5, reb: 4 }, nerf: { blk: -3, shotExt: -2 } },
    { id: "sf_slasher", n: "冲框前锋", z: "Rim Wing", d: "对篮筐持续施压", boost: { shotInt: 10, speed: 6, physique: 5 }, nerf: { shotExt: -5, shotFree: -2 } },
    { id: "sf_corner_sniper", n: "底角狙击", z: "Corner Sniper", d: "高效空间型侧翼", boost: { shotExt: 11, shotFree: 5, speed: 3 }, nerf: { pass: -3, blk: -3 } },
    { id: "sf_lockdown", n: "锁防之翼", z: "Lockdown Wing", d: "盯防顶级得分点", boost: { stl: 9, physique: 6, blk: 4 }, nerf: { pass: -3, shotFree: -3 } },
    { id: "sf_rebounder", n: "篮板前锋", z: "Rebound Wing", d: "二次进攻和防守篮板", boost: { reb: 10, strength: 6, shotInt: 4 }, nerf: { shotExt: -5, pass: -3 } },
    { id: "sf_iso", n: "单打王牌", z: "Iso Wing", d: "中距离和背身单打能力", boost: { shotInt: 8, shotExt: 6, shotFree: 6 }, nerf: { pass: -4, reb: -2 } },
    { id: "sf_fastbreak", n: "快攻终结", z: "Fastbreak Wing", d: "速度型转换得分手", boost: { speed: 8, shotInt: 6, stl: 4 }, nerf: { strength: -3, blk: -3 } },
    { id: "sf_glue", n: "团队胶水", z: "Glue Wing", d: "什么都能做一点", boost: { pass: 6, reb: 6, stl: 5 }, nerf: { shotExt: -2, shotInt: -2 } }
  ],
  4: [
    { id: "pf_stretch", n: "空间四号位", z: "Stretch Four", d: "外线拉开空间", boost: { shotExt: 10, shotFree: 6, pass: 3 }, nerf: { blk: -4, strength: -3 } },
    { id: "pf_post", n: "低位硬解", z: "Post Scorer", d: "背身和中距离终结", boost: { shotInt: 11, strength: 7, shotFree: 4 }, nerf: { speed: -4, stl: -3 } },
    { id: "pf_rim_runner", n: "顺下终结者", z: "Rim Runner", d: "吃饼与空接威胁", boost: { shotInt: 9, speed: 5, physique: 6 }, nerf: { shotExt: -7, pass: -3 } },
    { id: "pf_glass", n: "篮板怪兽", z: "Glass Cleaner", d: "前后场篮板压制", boost: { reb: 12, strength: 7, blk: 5 }, nerf: { shotExt: -8, pass: -3 } },
    { id: "pf_def_anchor", n: "防守轴心", z: "Defensive Anchor", d: "护筐和协防覆盖", boost: { blk: 10, reb: 8, physique: 4 }, nerf: { shotExt: -7, shotFree: -3 } },
    { id: "pf_playmaker", n: "策应内锋", z: "Playmaking Four", d: "高位策应串联", boost: { pass: 8, shotInt: 5, reb: 5 }, nerf: { shotExt: -4, stl: -2 } },
    { id: "pf_midrange", n: "中投内线", z: "Midrange Four", d: "肘区中投和挡拆外弹", boost: { shotInt: 7, shotExt: 6, shotFree: 5 }, nerf: { blk: -3, speed: -2 } },
    { id: "pf_energy", n: "蓝领发动机", z: "Energy Four", d: "拼抢、补防、快下", boost: { reb: 8, physique: 6, speed: 4 }, nerf: { shotExt: -6, pass: -3 } },
    { id: "pf_two_way_star", n: "双向四号位", z: "Two-Way Four", d: "稳定攻防产出", boost: { shotInt: 7, reb: 7, blk: 6 }, nerf: { shotExt: -3 } }
  ],
  5: [
    { id: "c_paint_beast", n: "禁区巨兽", z: "Paint Beast", d: "篮下终结与护筐统治", boost: { shotInt: 12, strength: 9, reb: 8 }, nerf: { shotExt: -12, speed: -5 } },
    { id: "c_rim_protector", n: "护筐中锋", z: "Rim Protector", d: "协防补位和封盖", boost: { blk: 13, reb: 9, physique: 5 }, nerf: { shotExt: -10, pass: -4 } },
    { id: "c_stretch5", n: "空间中锋", z: "Stretch Five", d: "拉开禁区的外线中锋", boost: { shotExt: 10, shotFree: 6, pass: 4 }, nerf: { shotInt: -4, blk: -4 } },
    { id: "c_rebound", n: "篮板塔", z: "Rebound Tower", d: "控制篮板和二次进攻", boost: { reb: 13, strength: 7, shotInt: 5 }, nerf: { shotExt: -10, speed: -4 } },
    { id: "c_high_post", n: "高位策应", z: "High-Post Hub", d: "肘区传导和手递手", boost: { pass: 9, shotInt: 6, shotFree: 5 }, nerf: { shotExt: -6, speed: -3 } },
    { id: "c_pickroll", n: "挡拆终结", z: "P&R Finisher", d: "顺下终结和吃饼", boost: { shotInt: 10, physique: 7, speed: 3 }, nerf: { shotExt: -10, pass: -4 } },
    { id: "c_mobile5", n: "机动五号位", z: "Mobile Five", d: "换防和快速回防", boost: { speed: 7, blk: 8, reb: 6 }, nerf: { strength: -4, shotExt: -7 } },
    { id: "c_brickwall", n: "掩护堡垒", z: "Brick Wall", d: "高质量掩护和内线对抗", boost: { strength: 10, physique: 7, shotInt: 6 }, nerf: { shotExt: -12, stl: -4 } },
    { id: "c_two_way_star", n: "双向中锋", z: "Two-Way Center", d: "攻防两端稳定高效", boost: { shotInt: 8, reb: 8, blk: 8 }, nerf: { shotExt: -6 } }
  ]
};
const ALL_TEMPLATES = Object.values(TEMPLATES_BY_POS).flat();

// ============ X-FACTOR 天赋系统 ============
// 分为5类：进攻型(7)、防守型(5)、身体型(5)、精神型(5)、成长型(3)
const XFACTORS = [
  // ========== 进攻型天赋 ==========
  { id: "sniper", n: "神射手", d: "三分命中率+8%，罚球命中率+6%", icon: "🎯", effect: { tpPctBonus: 0.08, ftPctBonus: 0.06 } },
  { id: "finisher", n: "终结者", d: "内线得分+3，命中率+3%", icon: "💪", effect: { attrBoost: { shotInt: 6 }, fgPctBonus: 0.03 } },
  { id: "microwave", n: "微波炉", d: "上场即爆发，得分+12%，命中率+3%", icon: "🌶️", effect: { usageBoost: 0.12, fgPctBonus: 0.03 } },
  { id: "clutch", n: "关键先生", d: "关键时刻属性+18%，命中率+4%", icon: "🔥", effect: { clutchBoost: 0.18, fgPctBonus: 0.04 } },
  { id: "floor_general", n: "持球核心", d: "助攻+2，失误-20%", icon: "🧠", effect: { astFlat: 2, tovMult: -0.20 } },
  { id: "showtime", n: "花式大师", d: "高光表现几率+15%，士气+3", icon: "✨", effect: { highlightBoost: 0.15, teamBoost: 3 } },
  { id: "deep_range", n: "空间炸弹", d: "三分命中率+5%，三分能力+5", icon: "💣", effect: { tpPctBonus: 0.05, attrBoost: { shotExt: 5 } } },

  // ========== 防守型天赋 ==========
  { id: "rim_wall", n: "禁飞区", d: "盖帽+2，伤病率-15%", icon: "🚧", effect: { blkFlat: 2, injuryMult: 0.85 } },
  { id: "board_king", n: "篮板之王", d: "篮板+3，力量+6", icon: "🧲", effect: { rebFlat: 3, attrBoost: { strength: 6 } } },
  { id: "pickpocket", n: "抢断专家", d: "抢断+1.5，失误-10%", icon: "🕵️", effect: { stlFlat: 1.5, tovMult: -0.10 } },
  { id: "two_way_force", n: "双向统治", d: "全属性+6%，抢断+1，盖帽+1", icon: "🌓", effect: { attrPct: 0.06, stlFlat: 1, blkFlat: 1 } },
  { id: "clamps", n: "钳子防守", d: "防守属性+8，抢断+1", icon: "🔒", effect: { attrBoost: { stl: 8, blk: 4 }, stlFlat: 1 } },

  // ========== 身体型天赋 ==========
  { id: "iron", n: "铁人", d: "伤病率-80%，体力消耗-30%，恢复+12", icon: "🛡️", effect: { injuryMult: 0.20, staminaCostMult: 0.70, staminaRegen: 12 } },
  { id: "glass_man", n: "玻璃人", d: "全属性+10，但伤病率+150%", icon: "🩹", effect: { attrBonus: 10, injuryMult: 2.50 } },
  { id: "speedster", n: "风驰电掣", d: "速度+10，但体力消耗+10%", icon: "⚡", effect: { attrBoost: { speed: 10 }, staminaCostMult: 1.10 } },
  { id: "bruiser", n: "重型坦克", d: "力量+10，体能+8，伤病率-15%", icon: "🦬", effect: { attrBoost: { strength: 10, physique: 8 }, injuryMult: 0.85 } },
  { id: "workhorse", n: "高负荷引擎", d: "体力消耗-25%，恢复+10", icon: "🐎", effect: { staminaCostMult: 0.75, staminaRegen: 10 } },

  // ========== 精神型天赋 ==========
  { id: "mentor", n: "领袖", d: "团队胜率+6%，经验获取+15%", icon: "👑", effect: { teamBoost: 6, xpMult: 1.15 } },
  { id: "streaky", n: "情绪化", d: "表现波动极大(±12分)", icon: "🎭", effect: { varianceRange: 12 } },
  { id: "underdog", n: "逆境之王", d: "落后时属性+18%", icon: "💥", effect: { underdogBoost: 0.18 } },
  { id: "calm_mind", n: "冷静心态", d: "波动减半，罚球+6%，失误-12%", icon: "🧘", effect: { varianceRange: 2, ftPctBonus: 0.06, tovMult: -0.12 } },
  { id: "toxic", n: "更衣室毒瘤", d: "个人得分+10%，但团队胜率降低", icon: "☠️", effect: { toxicAura: true, usageBoost: 0.10 } },

  // ========== 成长型天赋 ==========
  { id: "quick_learner", n: "快速学习", d: "经验获取+25%，年度成长+40%", icon: "📚", effect: { xpMult: 1.25, growthBoost: 0.40 } },
  { id: "late_bloomer", n: "大器晚成", d: "成长曲线+30%，抗衰退+60%", icon: "🌱", effect: { growthBoost: 0.30, declineResist: 0.60 } },
  { id: "prodigy", n: "天才新秀", d: "新秀赛季+15%，经验获取+15%", icon: "🌟", effect: { rookieBoost: 0.15, xpMult: 1.15 } }
];

const APK_BADGE_IMG_BASE = 'assets/images/badges';


// ============ RANDOM EVENTS DATA ============
// 随机事件已移除

const EVENTS_LEAGUE = [
  { id: "rule_change", n: "规则变动", d: "联盟修改了比赛规则", effects: ["三分线外移，外线投篮难度+5%", "增加挑战次数，比赛节奏变慢", "缩短暂停时间，体力消耗增加"] },
  { id: "injury_wave", n: "伤病潮", d: "本赛季伤病频发", effects: ["多名球星受伤，竞争减弱", "你的球队受到影响", "医疗团队升级，恢复加快"] },
  { id: "trade_deadline", n: "交易截止日", d: "联盟交易市场火热", effects: ["你的球队进行了补强", "竞争对手变得更强", "有球队对你感兴趣"] }
];

const KEY_MOMENTS = [
  {
    id: "clutch_shot", n: "关键投篮", d: "比赛最后时刻，你持球面对防守",
    choices: [{ t: "强行出手", attr: "shotExt", diff: 75, reward: { pts: 3, grade: 15 } }, { t: "突破上篮", attr: "shotInt", diff: 70, reward: { pts: 2, grade: 12 } }, { t: "传给空位队友", attr: "pass", diff: 60, reward: { ast: 1, grade: 10 } }]
  },
  {
    id: "fast_break", n: "快攻机会", d: "你带球快攻，身后有追防球员",
    choices: [{ t: "暴扣", attr: "physique", diff: 65, reward: { pts: 2, grade: 12 } }, { t: "拉杆上篮", attr: "shotInt", diff: 70, reward: { pts: 2, grade: 15 } }, { t: "传球助攻", attr: "pass", diff: 55, reward: { ast: 1, grade: 8 } }]
  },
  {
    id: "post_up", n: "低位单打", d: "你在低位要到位置，背身面对防守",
    choices: [{ t: "转身跳投", attr: "shotInt", diff: 68, reward: { pts: 2, grade: 10 } }, { t: "强打篮下", attr: "strength", diff: 72, reward: { pts: 2, grade: 12 } }, { t: "分球外线", attr: "pass", diff: 50, reward: { ast: 1, grade: 6 } }]
  },
  {
    id: "defense_stop", n: "防守关键", d: "对手持球进攻，你需要做出防守选择",
    choices: [{ t: "贴身防守", attr: "stl", diff: 70, reward: { stl: 1, grade: 12 } }, { t: "协防盖帽", attr: "blk", diff: 75, reward: { blk: 1, grade: 15 } }, { t: "保守站位", attr: "speed", diff: 55, reward: { grade: 6 } }]
  },
  {
    id: "screen_play", n: "挡拆配合", d: "队友为你做了一个掩护",
    choices: [{ t: "中距离急停", attr: "shotExt", diff: 62, reward: { pts: 2, grade: 10 } }, { t: "顺下突破", attr: "speed", diff: 65, reward: { pts: 2, grade: 12 } }, { t: "回传挡拆", attr: "pass", diff: 55, reward: { ast: 1, grade: 8 } }]
  },
  {
    id: "rebound_battle", n: "篮板争夺", d: "球弹出篮筐，你和对手同时起跳",
    choices: [{ t: "卡位抢板", attr: "reb", diff: 60, reward: { reb: 1, grade: 10 } }, { t: "点拨给队友", attr: "reb", diff: 50, reward: { grade: 6 } }, { t: "直接补篮", attr: "shotInt", diff: 75, reward: { pts: 2, grade: 15 } }]
  }
];

// ============ GAME STATE ============
let G = {
  phase: "create",
  player: {
    name: "", pos: 0, template: "", xfactor: "", age: 19, height: 0, weight: 0, wingspan: 0,
    attrs: {}, tendencies: { in: 55, mid: 55, ex: 55 }, potential: 0, badges: {}, xp: 0, stamina: 100, maxStamina: 100,
    fame: 10, trust: 50, tradeValue: 50, salary: 0, contractYears: 0, cash: 0,
    teamsPlayed: [], injury: { active: false, games: 0, type: "" },
    rivalId: 0, mood: 50
  },
  team: null, teamId: 0,
  teamMorale: 50, winStreak: 0, // 士气系统
  season: 1, year: 2025, startYear: 2025, gameNum: 0, totalGames: 82,
  dayNum: 0, seasonDays: 180, gameDays: [], // 天数模拟系统
  trades: [], pendingTrade: null, pendingUserTrade: null, // 交易系统
  tradeDeadline: 120, renewalDeadline: 160, // 截止日
  schedule: [], results: [],
  seasonStats: { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, mins: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, gp: 0, wins: 0, losses: 0 },
  careerStats: [],
  standings: { East: [], West: [] },
  playoffs: { active: false, round: 0, eliminated: false, champion: false, bracket: [], series: null },
  allStar: { held: false, day: 90, east: [], west: [], mvp: null, userSelected: false, userMVP: false },
  aiTradeLog: [],
  eraConfig: { salaryCapM: 170, luxuryTaxMult: 1.18, eraName: 'modern' },
  teamPicks: {},
  awards: [], allAwards: [],
  leagueAwards: [],
  hallOfFame: [],
  hallOfFameThreshold: 120,
  news: [], phone: [], events: [],
  draftPick: 0, draftBoard: null,
  leagueSeason: { round: 0, teamRecords: {}, playerStats: {}, roundSchedule: [], teamGameLogs: {}, gameDetails: [] },
  social: {
    posts: [],
    nextPostId: 1,
    lastGeneratedDay: -1,
    generatedDayCounts: {},
    pendingRequiredDay: -1,
    playerRepliedPostIds: {},
    playerPostsByDay: {},
    playerStatementLog: [],
    playerLinks: {},
    rivalry: { lastPreviewGameKey: '', lastResultGameKey: '' },
    starProfiles: {}
  },
  coachRelations: { byKey: {} },
  coachDynamics: { lastConversationDay: -99, lastDailyPromptDay: -99, lastRenewalBriefSeason: 0, directives: { usageDemandUntilDay: -1, startingDemandUntilDay: -1, buyInUntilDay: -1 } },
  // ========== 队内关系系统 ==========
  teamRelations: {
    teammates: {},
    chemistry: { overall: 50, offenseSynergy: 50, defenseSynergy: 50, lockerRoomMood: 50, leadershipScore: 0, dramaLevel: 0, lastUpdated: -1 },
    events: [],
    lastPromptDay: -99
  },
  // ========== 游戏化生涯循环 ==========
  gameplay: {
    postgameDirector: {
      lastEventDayByType: {},
      lastEventGameIdByType: {},
      forcedModalCountByGameId: {},
      suppressedEvents: [],
      pendingInboxEvents: []
    },
    pregamePlanByGame: {},
    latestPostgame: null,
    careerLines: {
      coach: { score: 50, stage: 'rotation_watch', lastDelta: 0 },
      rotation: { score: 35, stage: 'bench', lastDelta: 0 },
      lockerRoom: { score: 50, stage: 'neutral', lastDelta: 0 },
      media: { score: 20, stage: 'local_notice', heat: 0, lastDelta: 0 },
      starCircle: { score: 8, stage: 'unknown', lastDelta: 0 }
    }
  },
  // ========== 赛季目标系统 ==========
  seasonGoals: {
    active: {
      streaks: { doubleFigures: { active: true, current: 0, best: 0 }, over20: { active: true, current: 0, best: 0 }, winStreak: { current: 0, best: 0 } },
      season: {},
      milestones: {}
    },
    completed: [],
    claimed: []
  },
  // ========== 比赛解释器 ==========
  matchInterpreter: {
    lastGame: { gameId: null, explanations: [], factors: {} }
  },
  economy: {
    staminaCoachLevel: 0,
    trainingCoachLevel: 0,
    recoveryTeamLevel: 0,
    prTeamLevel: 0,
    agentTeamLevel: 0,
    analyticsLevel: 0,
    ownedItems: [],
    ownedFacilities: [],
    logs: [],
    salaryPaidSeason: 0,
    totalSpent: 0,
    visibilityMomentum: 0,
    visibilityMomentumUntilDay: -1,
    lastOpportunityDay: -99
  },
  offseasonStage: 0,
  offseasonSummary: [],
  _pendingRegularSeasonAwardsModal: false,
  settings: { simSpeed: 1 },
  nomadCount: 0
};

if (typeof globalThis !== 'undefined') globalThis.G = G;

const LEAGUE = {
  loaded: false,
  teams: {},
  coaches: [],
  rookieCatalog: [],
  rootHandle: null,
  loadError: null,
  rookiesBySeason: {},
  namesPool: [],
  availableScriptYears: [],
  years: { roster: 25, coach: 1, rosterCode: 1 },
  historicalDb: { loaded: false, error: null }
};

const LEAGUE_SALARY_CAP_M = 170;
const APK_NBA_START_YEARS = [
  2025, 2009, 2003, 1996, 1983
];
const APK_ROSTER_INDEX_TO_START_YEAR = {
  1: 2025, 12: 2009, 14: 2003, 15: 1996, 16: 1983
};
const APK_START_YEAR_TO_ROSTER_INDEXES = {
  2025: [1],
  2009: [12],
  2003: [14],
  1996: [15],
  1983: [16]
};
const APK_RAW_BASE_PATH = 'APK/resources/res/raw';

// ============ UTILITY FUNCTIONS ============
const $ = id => document.getElementById(id);
const rng = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick = arr => arr[rng(0, arr.length - 1)];
const pct = v => (v * 100).toFixed(1) + "%";
const ovr = attrs => { const vals = Object.values(attrs); return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };

function barClass(v) { return v >= 75 ? 'hi' : v >= 55 ? 'md' : 'lo' }
function badgeTierClass(lv) { return ['t-none', 'b-bronze', 'b-silver', 'b-gold', 'b-hof'][clamp(parseNum(lv, 0), 0, 4)] || 't-none'; }
function badgeTierName(lv) { return ['无', '铜', '银', '金', '名人堂'][clamp(parseNum(lv, 0), 0, 4)] || '无'; }
function gradeClass(g) { return g >= 90 ? 'grade-a' : g >= 75 ? 'grade-b' : g >= 55 ? 'grade-c' : g >= 35 ? 'grade-d' : 'grade-f' }
function gradeLetter(g) { return g >= 95 ? 'A+' : g >= 90 ? 'A' : g >= 85 ? 'A-' : g >= 80 ? 'B+' : g >= 75 ? 'B' : g >= 70 ? 'B-' : g >= 65 ? 'C+' : g >= 55 ? 'C' : g >= 45 ? 'D+' : g >= 35 ? 'D' : 'F' }

function pad2(v) { return String(v).padStart(2, '0') }
function pad4(v) { return String(v).padStart(4, '0') }
function parseNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
const MATCH_EFFECTIVE_ATTR_CAP = 125;
function getMatchEffectiveAttrCap() {
  return MATCH_EFFECTIVE_ATTR_CAP;
}
function clampMatchEffectiveAttr(v, min = 20, max = getMatchEffectiveAttrCap()) {
  return clamp(Math.round(parseNum(v, 0)), min, max);
}
function normalizeSalaryMillion(v) {
  const n = parseNum(v, 0);
  if (n <= 0) return 0;
  return n > 500000 ? +(n / 1000000).toFixed(2) : +n.toFixed(2);
}
function formatSalaryMillion(v, digits = 2) {
  return normalizeSalaryMillion(v).toFixed(digits);
}
function normalizeLeagueSalaryUnits({ includeUser = true } = {}) {
  if (includeUser && G?.player) {
    G.player.salary = normalizeSalaryMillion(G.player.salary);
  }
  if (!LEAGUE?.loaded || !LEAGUE?.teams) return;
  Object.values(LEAGUE.teams).forEach(t => {
    (t.players || []).forEach(p => {
      p.salary = normalizeSalaryMillion(p.salary);
    });
  });
}
function teamPayrollMillion(teamId, { includeUser = false } = {}) {
  const tid = parseNum(teamId, 0);
  if (!tid || !LEAGUE?.loaded || !LEAGUE?.teams?.[tid]) {
    return includeUser && tid === parseNum(G.teamId, 0) ? normalizeSalaryMillion(G.player?.salary) : 0;
  }
  let total = (LEAGUE.teams[tid].players || []).reduce((sum, player) => sum + normalizeSalaryMillion(player?.salary), 0);
  if (includeUser && tid === parseNum(G.teamId, 0)) total += normalizeSalaryMillion(G.player?.salary);
  return +total.toFixed(2);
}
function parseCSV(text) {
  const rows = (text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];
  const headers = rows[0].split(';').map(h => h.trim());
  return rows.slice(1).map(line => {
    const cols = line.split(';');
    const o = {};
    headers.forEach((h, i) => o[h] = cols[i] !== undefined ? cols[i].trim() : '');
    return o;
  });
}
function normalizeTeamToken(v) {
  return String(v || '').toLowerCase().trim()
    .replace(/[·\.\-_']/g, '')
    .replace(/\s+/g, '')
    .replace(/队$/, '');
}
const TEAM_NAME_ID_MAP = (() => {
  const m = new Map();
  TEAMS.forEach(t => {
    [t.z, t.n, t.a].forEach(v => {
      const key = normalizeTeamToken(v);
      if (key) m.set(key, t.id);
    });
  });
  m.set('76人', 4);
  m.set('trailblazers', 19);
  m.set('blazers', 19);
  m.set('okcthunder', 18);
  m.set('lalakers', 23);
  m.set('laclippers', 22);
  m.set('gswarriors', 21);
  m.set('nyknicks', 3);
  m.set('phxsuns', 24);
  return m;
})();
const RAW_TEAM_ID_REMAP = {
  16: 26, 17: 27, 18: 28, 19: 29, 20: 30,
  21: 16, 22: 17, 23: 19, 24: 18, 25: 20,
  26: 21, 27: 22, 28: 23, 29: 24, 30: 25
};
function resolveTeamId(rawTeamId, rawTeamName = '') {
  const byId = parseNum(rawTeamId, 0);
  const token = normalizeTeamToken(rawTeamName);
  if (byId >= 1 && byId <= 30) {
    const byIdTeam = TEAMS.find(t => t.id === byId);
    if (byIdTeam) {
      const matchById = [byIdTeam.z, byIdTeam.n, byIdTeam.a].some(v => normalizeTeamToken(v) === token);
      if (matchById) return byId;
    }
  }
  const remappedId = RAW_TEAM_ID_REMAP[byId];
  if (remappedId) {
    const remappedTeam = TEAMS.find(t => t.id === remappedId);
    const matchRemapped = remappedTeam
      ? [remappedTeam.z, remappedTeam.n, remappedTeam.a].some(v => normalizeTeamToken(v) === token)
      : false;
    if (matchRemapped) return remappedId;
    if ((rawTeamName || '').trim()) return remappedId;
  }
  const byName = TEAM_NAME_ID_MAP.get(token);
  if (byName && byName >= 1 && byName <= 30) return byName;
  if (byId >= 1 && byId <= 30) return byId;
  return 0;
}
function teamNameFallback(id) {
  const t = TEAMS.find(x => x.id === id);
  return t ? t.z : `Team ${id}`;
}
function getTeamAltLogoPath(id) {
  return `assets/images/Team/cbaTeam${pad2(id)}.png`;
}
function getTeamLogoPath(id, abbr = '') {
  // Use current year to determine era, default to 2023 if undefined
  const currentYear = (typeof G !== 'undefined' && G.year) ? G.year : 2023;

  // Available logo sets: 1984, 1996, 2003, 2008, 2018, 2023
  let yearPrefix = 2023;
  if (currentYear < 1996) yearPrefix = 1984;
  else if (currentYear < 2003) yearPrefix = 1996;
  else if (currentYear < 2008) yearPrefix = 2003;
  else if (currentYear < 2018) yearPrefix = 2008;
  else if (currentYear < 2023) yearPrefix = 2018;

  return `assets/images/Team/team${yearPrefix}${pad2(id)}.png`;
}
function getPlayerPhotoPath(imageId) {
  const id = clamp(parseNum(imageId, 0), 0, 9999);
  return `assets/images/Player/IMG${pad4(id)}.png`;
}
function stripUndefinedTokens(text) {
  return String(text == null ? '' : text).replace(/\b(?:undefined|underfined)\b/gi, '').trim();
}
function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
function getPlayerPhotoSrc(player) {
  // Support uploaded avatar/photo (data URL / remote URL / local blob URL)
  const avatar = stripUndefinedTokens(player && typeof player.avatar === 'string' ? player.avatar : '');
  const photoRaw = stripUndefinedTokens(player && typeof player.photo === 'string' ? player.photo : '');
  const photoLocal = stripUndefinedTokens(player && typeof player.photoLocal === 'string' ? player.photoLocal : '');
  if (avatar && avatar !== 'null') return avatar;
  if (photoRaw && (photoRaw.startsWith('data:image/') || photoRaw.startsWith('blob:') || /^https?:\/\//i.test(photoRaw))) return photoRaw;
  const imageId = clamp(parseNum(player?.image, 0), 0, 9999);
  return photoRaw || photoLocal || getPlayerPhotoPath(imageId);
}
function resolveDisplayName(name, nameBirth, fallback = '') {
  const n = (name || '').trim();
  const b = (nameBirth || '').trim();
  if (!n && !b) return fallback;
  if (!n) return b || fallback;
  if (/[�]/.test(n) && b) return b;
  return n;
}
function toTeamMeta(id, teamName = '') {
  const base = TEAMS.find(t => t.id === id);
  return {
    id,
    n: base ? base.n : teamNameFallback(id),
    z: teamName || (base ? base.z : '') || teamNameFallback(id),
    a: base ? base.a : `T${pad2(id)}`,
    c: base ? base.c : (id <= 15 ? 'East' : 'West'),
    cl: base ? base.cl : '#2d5ab8',
    r: base ? base.r : 75,
    logo: getTeamLogoPath(id, base?.a || ''),
    logoFallback: getTeamAltLogoPath(id)
  };
}
function calcPlayerRating(row) {
  const att = parseNum(row.ATT, -1);
  const def = parseNum(row.DEF, -1);
  if (att >= 0 && def >= 0) return Math.round((att + def) / 2);
  const vals = [
    parseNum(row.skillPass, 55), parseNum(row.skillShotInterior, 55), parseNum(row.skillShotExterior, 55),
    parseNum(row.skillShotFree, 55), parseNum(row.skillPhysique, 55), parseNum(row.skillBlock, 55),
    parseNum(row.skillRebound, 55), parseNum(row.skillSteal, 55)
  ];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
function parsePlayerAttrs(row) {
  const physique = parseNum(row.skillPhysique, 55);
  // 从 physique + 位置推导 speed / strength（CSV 无独立列）
  // 参考 NBA 2K 属性分布：PG 速度快力量弱，C 速度慢力量强
  const pos = clamp(parseNum(row.positionFirst, 3), 1, 5);
  const speedBias = { 1: 6, 2: 3, 3: 0, 4: -4, 5: -8 }[pos] || 0;
  const strengthBias = { 1: -6, 2: -3, 3: 0, 4: 4, 5: 8 }[pos] || 0;
  return {
    pass: parseNum(row.skillPass, 55),
    shotInt: parseNum(row.skillShotInterior, 55),
    shotExt: parseNum(row.skillShotExterior, 55),
    shotFree: parseNum(row.skillShotFree, 55),
    physique,
    blk: parseNum(row.skillBlock, 55),
    reb: parseNum(row.skillRebound, 55),
    stl: parseNum(row.skillSteal, 55),
    speed: clamp(physique + speedBias + rng(-3, 3), 25, 99),
    strength: clamp(physique + strengthBias + rng(-3, 3), 25, 99)
  };
}
function normalizePotentialValue(v, rating = 70) {
  const n = parseNum(v, 0);
  if (n <= 0) return clamp(rating + rng(5, 14), 58, 95);
  // CSV potential字段使用6~11的小整数等级
  // 11→99（历史级）, 10→95（超巨）, 9→88（全明星）, 8→82（首发）, 7→75（角色）, 6→68（板凳）, ≤5→60
  if (n <= 11) {
    const potMap = { 11: 99, 10: 95, 9: 88, 8: 82, 7: 75, 6: 68, 5: 62, 4: 58, 3: 55, 2: 55, 1: 55 };
    const base = potMap[n] || 55;
    return clamp(base + rng(-1, 1), 55, 99);
  }
  if (n <= 120) return clamp(Math.round(n), 55, 99);
  return clamp(rating + rng(4, 12), 58, 95);
}
function calcPlayerAtt(attrs) {
  const v = [
    parseNum(attrs.shotExt, 55),
    parseNum(attrs.shotInt, 55),
    parseNum(attrs.pass, 55),
    parseNum(attrs.speed, 55),
    parseNum(attrs.shotFree, 55)
  ];
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}
function calcPlayerDef(attrs) {
  const v = [
    parseNum(attrs.stl, 55),
    parseNum(attrs.blk, 55),
    parseNum(attrs.reb, 55),
    parseNum(attrs.strength, 55),
    parseNum(attrs.physique, 55)
  ];
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

function rowToPlayer(row, fallbackId, extra = {}) {
  const yearsLeague = parseNum(row.yearsLeague, 0);
  const rating = calcPlayerRating(row);
  const potential = normalizePotentialValue(row.potential, rating);
  const nameCn = cleanText(row.name);
  const nameEn = cleanText(row.nameBirth);
  const ovrValue = rating; // Assuming ovrValue is rating
  const potValue = potential; // Assuming potValue is potential
  const attrs = parsePlayerAttrs(row); // Assuming attrs is parsed from row
  const imgId = parseNum(row.image, 0); // Assuming imgId is parsed from row.image
  const draftValue = parseNum(row.draft, 0) > 0
    ? parseNum(row.draft, 0)
    : (parseNum(row.draftYear, 0) * 100 + parseNum(row.draftRound, 0));

  const player = {
    id: parseNum(row.id, fallbackId),
    uid: row.uid ? String(row.uid) : `p_${parseNum(row.id, fallbackId)}`,
    name: cleanText(row.name),
    altName: cleanText(row.nameBirth || row.altName), // use nameBirth as english
    nameCn: cleanText(row.name),
    nameEn: cleanText(row.nameBirth || row.altName),
    teamId: extra.teamId || 0,
    pos: clamp(parseNum(row.positionFirst, 3), 1, 5),
    pos2: clamp(parseNum(row.positionSecond, 0), 0, 5),
    rating: ovrValue,
    potential: potValue,
    att: calcPlayerAtt(attrs),
    def: calcPlayerDef(attrs),
    age: clamp(parseNum(row.age, 24), 18, 45),
    yearsLeague,
    draft: draftValue,
    draftPick: parseDraftPickValue(draftValue),
    contract: { amount: parseNum(row.contractAmount, 50), years: parseNum(row.contractExpDifference, 1) },
    photo: getPlayerPhotoPath(imgId),
    image: imgId,
    info: row.info || '',
    historicalRosterHonors: rosterRowHonorCounter(row),
    attrs,
    tendencies: {
      in: parseNum(row.tendencyIn, 55),
      mid: 55,
      ex: parseNum(row.tendencyEx, 55),
      fr: parseNum(row.tendencyFr, 55),
      foul: parseNum(row.tendencyFr, 55)
    },
    ...extra
  };

  // Assign initial badges
  player.badges = assignInitialBadges({ ...player, attrs });

  return player;
}

function rookieDraftYearFromRow(row = {}) {
  const yearsField = parseNum(row.yearsLeague, 0);
  if (yearsField >= 1900 && yearsField <= 2100) return yearsField;
  const draftValue = parseNum(row.draft, 0);
  if (draftValue >= 190000) return Math.floor(draftValue / 100);
  const directYear = parseNum(row.draftYear, 0);
  return directYear >= 1900 && directYear <= 2100 ? directYear : 0;
}

function realRookieCatalogFromRows(rows = []) {
  const normalized = (rows || []).map((row, idx) => {
    const draftYear = rookieDraftYearFromRow(row);
    const draftValue = parseNum(row.draft, 0);
    return { row, idx, draftYear, draftValue, parsedPick: parseDraftPickValue(draftValue) };
  }).filter(item => item.draftYear >= 1947 && item.draftYear <= 2100);
  const maxPickByYear = new Map();
  normalized.forEach(item => {
    if (item.parsedPick <= 0) return;
    maxPickByYear.set(item.draftYear, Math.max(maxPickByYear.get(item.draftYear) || 0, item.parsedPick));
  });
  const nextUnsignedPickByYear = new Map();
  return normalized.map(item => {
    let draftPick = item.parsedPick;
    if (draftPick <= 0) {
      const next = (nextUnsignedPickByYear.get(item.draftYear) || Math.max(maxPickByYear.get(item.draftYear) || 60, 60)) + 1;
      nextUnsignedPickByYear.set(item.draftYear, next);
      draftPick = next;
    }
    const player = rowToPlayer(item.row, 710000 + item.idx + 1, {
      teamId: 0,
      yearsLeague: 0,
      rookie: true,
      source: 'real_rookie_csv',
      sourceDraftYear: item.draftYear,
      draftPick,
      draft: item.draftValue > 0 ? item.draftValue : item.draftYear * 100 + draftPick,
      injury: { active: false, games: 0, type: "" }
    });
    hydratePlayerWithHistoricalData(player, item.draftYear);
    player.realRookieAttributes = true;
    return player;
  });
}
function toRotation(players) {
  const ranked = (players || [])
    .map(p => ({ ...p, isSelf: false, roleScore: roleScoreForPlayer(p) }))
    .sort((a, b) => b.roleScore - a.roleScore);
  const ordered = buildOrderedRotationCandidates(ranked, 10);
  const template = [35, 34, 33, 32, 31, 24, 19, 17, 15, 10];
  const rotation = ordered.map((p, i) => ({
    id: p.id,
    name: p.name,
    pos: parseNum(p.pos, 3),
    pos2: parseNum(p.pos2, 0),
    slotPos: parseNum(p.slotPos, 0),
    rotationRole: p.rotationRole || (i < 5 ? 'starter' : (i === 5 ? 'sixth' : 'role')),
    minutes: clamp(template[i] || 10, 6, 40),
    rating: parseNum(p.rating, 65),
    roleScore: parseNum(p.roleScore, 0),
    photo: p.photo,
    avatar: p.avatar || '',
    image: p.image
  }));
  // 分配7层角色并用角色目标分钟覆盖模板
  const byRat2 = [...rotation].sort((a, b) => b.rating - a.rating);
  const topIds2 = ['alpha', 'second', 'third'];
  const done2 = new Set();
  byRat2.slice(0, 3).forEach((p, i) => { p.teamTier = topIds2[i]; done2.add(p.id); });
  rotation.forEach((p, idx) => {
    if (done2.has(p.id)) return;
    const role = p.rotationRole || (idx < 5 ? 'starter' : (idx === 5 ? 'sixth' : 'role'));
    if (role === 'starter' || idx < 5) p.teamTier = 'rolestarter';
    else if (role === 'sixth' || idx === 5) p.teamTier = 'sixthman';
    else if (idx <= 8) p.teamTier = 'bench';
    else p.teamTier = 'end';
  });
  rotation.forEach(p => {
    const td = typeof getTierDef === 'function' ? getTierDef(p.teamTier) : null;
    if (td) p.minutes = clamp(td.minTarget, Math.max(td.minRange[0], 0), td.minRange[1]);
  });
  normalizeRotationMinutes(rotation, 240);
  return rotation;
}
function rotationIdKey(player) {
  return String(player?.id ?? '');
}
function positionFitBonus(player, targetPos) {
  const pos = parseNum(player?.pos, 0);
  const pos2 = parseNum(player?.pos2, 0);
  if (pos === targetPos) return 28;
  if (pos2 === targetPos && pos2 > 0) return 21;
  if (targetPos === 1 && pos === 2) return 15;
  if (targetPos === 2 && pos === 1) return 15;
  if (targetPos === 2 && pos === 3) return 10;
  if (targetPos === 3 && pos === 2) return 10;
  if (targetPos === 3 && pos === 4) return 10;
  if (targetPos === 4 && pos === 3) return 10;
  if (targetPos === 4 && pos === 5) return 13;
  if (targetPos === 5 && pos === 4) return 14;
  return 0;
}
function pickStarterForSlot(candidates, used, targetPos) {
  let best = null;
  let bestScore = -1e9;
  candidates.forEach(p => {
    const key = rotationIdKey(p);
    if (used.has(key)) return;
    const fit = positionFitBonus(p, targetPos);
    if (fit <= 0) return;
    const score = parseNum(p.roleScore, 0) + fit + parseNum(p.rating, 65) * 0.06;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  });
  if (best) return best;
  return candidates.find(p => !used.has(rotationIdKey(p))) || null;
}
function buildOrderedRotationCandidates(candidates, maxPlayers = 10) {
  const used = new Set();
  const ordered = [];
  const starterSlots = [1, 2, 3, 4, 5];
  starterSlots.forEach(slotPos => {
    if (ordered.length >= maxPlayers) return;
    const picked = pickStarterForSlot(candidates, used, slotPos);
    if (!picked) return;
    const key = rotationIdKey(picked);
    if (used.has(key)) return;
    used.add(key);
    ordered.push({ ...picked, slotPos, rotationRole: 'starter' });
  });
  while (ordered.length < Math.min(5, maxPlayers)) {
    const fallback = candidates.find(p => !used.has(rotationIdKey(p)));
    if (!fallback) break;
    const key = rotationIdKey(fallback);
    used.add(key);
    ordered.push({ ...fallback, slotPos: starterSlots[ordered.length] || 0, rotationRole: 'starter' });
  }
  const bench = candidates.filter(p => !used.has(rotationIdKey(p)));
  if (bench.length && ordered.length < maxPlayers) {
    const sixth = bench.shift();
    used.add(rotationIdKey(sixth));
    ordered.push({ ...sixth, slotPos: 0, rotationRole: 'sixth' });
  }
  bench.forEach(p => {
    if (ordered.length >= maxPlayers) return;
    const key = rotationIdKey(p);
    if (used.has(key)) return;
    used.add(key);
    ordered.push({ ...p, slotPos: 0, rotationRole: 'role' });
  });
  return ordered;
}
function getRotationRoleLabel(role, player) {
  // 优先使用7层角色名
  if (player?.teamTier && typeof getTierDef === 'function') {
    const td = getTierDef(player.teamTier);
    if (td) return td.name;
  }
  if (role === 'starter') return '首发';
  if (role === 'sixth') return '第六人';
  return '角色球员';
}
function getRotationPositionDisplay(player, index = 0) {
  const tier = player?.teamTier;
  const posStr = posLabel(parseNum(player?.pos, 3));
  if (tier && typeof getTierDef === 'function') {
    const td = getTierDef(tier);
    if (td) return `${td.name} (${posStr})`;
  }
  const role = player?.rotationRole || (index < 5 ? 'starter' : (index === 5 ? 'sixth' : 'role'));
  const slotPos = parseNum(player?.slotPos, 0);
  if (role === 'starter') {
    return slotPos > 0 ? posLabel(slotPos) : posStr;
  }
  return `角色 (${posStr})`;
}
function parseDraftPickValue(v) {
  const n = parseNum(v, 0);
  if (n <= 0) return 0;
  if (n <= 60) return n;
  if (n >= 1000) return n % 100;
  return 0;
}
function isFirstRoundRookiePlayer(player) {
  if (player?.isSelf) {
    return G.season === 1 && G.draftPick > 0 && G.draftPick <= 30;
  }
  const years = parseNum(player?.yearsLeague, 0);
  const pick = parseNum(player?.draftPick, 0) || parseDraftPickValue(player?.draft);
  return years <= 1 && pick > 0 && pick <= 30;
}
function getPlayerBadgePower(player) {
  if (!player || !player.badges) return 0;
  if (Array.isArray(player.badges)) {
    return player.badges.filter(id => BADGES.some(b => b.id === id)).length;
  }
  if (typeof player.badges === 'object') {
    return Object.entries(player.badges).reduce((sum, [id, lv]) => {
      if (!BADGES.some(b => b.id === id)) return sum;
      return sum + clamp(parseNum(lv, 0), 0, 4);
    }, 0);
  }
  return 0;
}
function roleScoreForPlayer(player) {
  const rating = parseNum(player?.rating, ovr(player?.attrs || {}));
  const att = parseNum(player?.att, rating);
  const def = parseNum(player?.def, rating);
  const potential = parseNum(player?.potential, rating);
  const age = parseNum(player?.age, 24);
  let score = rating * 0.82 + att * 0.1 + def * 0.08 + (potential - rating) * 0.15;
  if (age <= 24) score += 1.1;
  if (age >= 33) score -= 1.1;
  if (player?.isSelf) {
    const trust = clamp(parseNum(G.player?.trust, 50), 0, 100);
    const mood = clamp(parseNum(G.player?.mood, 50), 0, 100);
    const coach = getTeamCoach(parseNum(G.teamId, 0));
    const coachTreatment = typeof getUserCoachTreatmentProfile === 'function'
      ? getUserCoachTreatmentProfile(player, coach)
      : null;
    score += 0.6 + (trust - 50) * 0.12 + (mood - 50) * 0.05;
    score += parseNum(coachTreatment?.roleScoreBonus, 0);
  }
  score += Math.min(3.5, getPlayerBadgePower(player) * 0.18);
  return score + rng(-2, 2);
}
function adjustUserMinutesByTrust(rotation) {
  const self = rotation.find(r => r.isSelf || String(r.id) === 'USER_SELF');
  if (!self) return;
  const trust = clamp(parseNum(G.player?.trust, 50), 0, 100);
  const mood = clamp(parseNum(G.player?.mood, 50), 0, 100);
  const rating = parseNum(self.rating, ovr(G.player?.attrs || {}));
  const coach = getTeamCoach(parseNum(G.teamId, 0));
  const coachTreatment = typeof getUserCoachTreatmentProfile === 'function'
    ? getUserCoachTreatmentProfile(self, coach)
    : null;
  const sortedRatings = (rotation || []).map(r => parseNum(r?.rating, 65)).sort((a, b) => b - a);
  const second = parseNum(sortedRatings[1], rating);

  // 用7层角色的分钟范围
  const tier = self.teamTier || 'bench';
  const td = typeof getTierDef === 'function' ? getTierDef(tier) : null;
  let min = td ? td.minRange[0] : 10, max = td ? td.minRange[1] : 22;
  if (rating >= 84) { min = Math.max(min, 33); max = Math.max(max, 40); }

  const current = clamp(Math.round(parseNum(self.minutes, 22)), 6, 40);
  const trustAdj = Math.round((trust - 50) / 16);
  const moodAdj = Math.round((mood - 50) / 35);
  const ratingAdj = Math.round((rating - Math.max(70, second)) / 5);
  const coachAdj = Math.round(parseNum(coachTreatment?.minuteDelta, 0));
  const target = current + trustAdj + moodAdj + ratingAdj + coachAdj;
  const minAdj = clamp(min + Math.min(0, coachAdj), 6, 40);
  const maxAdj = clamp(max + Math.max(0, coachAdj), minAdj, 40);
  self.minutes = clamp(Math.max(target, minAdj), minAdj, maxAdj);
}
function normalizeRotationMinutes(rotation, target = 240) {
  rotation.forEach(r => r.minutes = clamp(Math.round(parseNum(r.minutes, 0)), 0, 40));
  let total = rotation.reduce((s, r) => s + r.minutes, 0);
  // 角色优先级: end=0, bench=1, sixthman=2, rolestarter=3, third=4, second=5, alpha=6
  const tierPri = { end: 0, bench: 1, sixthman: 2, rolestarter: 3, third: 4, second: 5, alpha: 6 };
  const cutOrder = () => {
    const arr = [];
    for (let i = 0; i < rotation.length; i++) {
      const pri = tierPri[rotation[i].teamTier] ?? 1;
      arr.push({ i, pri });
    }
    arr.sort((a, b) =>
      a.pri - b.pri ||
      rotation[b.i].minutes - rotation[a.i].minutes ||
      parseNum(rotation[a.i].roleScore, 0) - parseNum(rotation[b.i].roleScore, 0)
    );
    return arr.map(x => x.i);
  };
  const addOrder = () => {
    const arr = [];
    for (let i = 0; i < rotation.length; i++) {
      const pri = tierPri[rotation[i].teamTier] ?? 1;
      arr.push({ i, pri });
    }
    arr.sort((a, b) =>
      b.pri - a.pri ||
      parseNum(rotation[b.i].roleScore, 0) - parseNum(rotation[a.i].roleScore, 0) ||
      rotation[a.i].minutes - rotation[b.i].minutes
    );
    return arr.map(x => x.i);
  };
  let guard = 0;
  while (total > target && guard < 700) {
    const idx = cutOrder().find(i => rotation[i].minutes > 0);
    if (idx == null) break;
    rotation[idx].minutes--;
    total--;
    guard++;
  }
  guard = 0;
  while (total < target && guard < 700) {
    const idx = addOrder().find(i => rotation[i].minutes < 40);
    if (idx == null) break;
    rotation[idx].minutes++;
    total++;
    guard++;
  }
}
function buildDynamicTeamRotation(teamId, { includeUser = false } = {}) {
  const pool = (getTeamPlayers(teamId) || []).map(p => ({ ...p, isSelf: false }));
  if (includeUser) {
    const self = createUserRosterSnapshot();
    self.isSelf = true;
    self.id = 'USER_SELF';
    pool.push(self);
  }
  if (!pool.length) return [];
  const ranked = pool.map(p => ({ ...p, roleScore: roleScoreForPlayer(p) })).sort((a, b) => b.roleScore - a.roleScore);
  const template = [35, 34, 33, 32, 31, 24, 19, 17, 15, 10];
  const ordered = buildOrderedRotationCandidates(ranked, 10);
  let rotation = ordered.map((p, i) => ({
    id: p.id, name: p.name, pos: parseNum(p.pos, 3), pos2: parseNum(p.pos2, 0), slotPos: parseNum(p.slotPos, 0),
    rotationRole: p.rotationRole || (i < 5 ? 'starter' : (i === 5 ? 'sixth' : 'role')),
    rating: parseNum(p.rating, 65), photo: p.photo, avatar: p.avatar || '', image: p.image, isSelf: !!p.isSelf,
    minutes: clamp((template[i] || 10) + rng(-1, 1), 8, 40), roleScore: p.roleScore, rookie: !!p.rookie, draftPick: p.draftPick, draft: p.draft, yearsLeague: p.yearsLeague
  }));

  // 分配7层角色并用角色目标分钟覆盖模板
  const byRat = [...rotation].sort((a, b) => b.rating - a.rating);
  const topTierIds = ['alpha', 'second', 'third'];
  const assignedIds = new Set();
  byRat.slice(0, 3).forEach((p, i) => { p.teamTier = topTierIds[i]; assignedIds.add(p.id); });
  rotation.forEach((p, idx) => {
    if (assignedIds.has(p.id)) return;
    const role = p.rotationRole || (idx < 5 ? 'starter' : (idx === 5 ? 'sixth' : 'role'));
    if (role === 'starter' || idx < 5) p.teamTier = 'rolestarter';
    else if (role === 'sixth' || idx === 5) p.teamTier = 'sixthman';
    else if (idx <= 8) p.teamTier = 'bench';
    else p.teamTier = 'end';
  });
  rotation.forEach(p => {
    const td = typeof getTierDef === 'function' ? getTierDef(p.teamTier) : null;
    if (td) p.minutes = clamp(td.minTarget + rng(-1, 1), Math.max(td.minRange[0], 0), td.minRange[1]);
  });

  const firstRoundRookies = ranked.filter(p => isFirstRoundRookiePlayer(p));
  firstRoundRookies.forEach(rk => {
    let slot = rotation.find(r => String(r.id) === String(rk.id));
    if (!slot) {
      const benchMin = rng(8, 12);
      if (rotation.length < 10) {
        rotation.push({
          id: rk.id, name: rk.name, pos: parseNum(rk.pos, 3), pos2: parseNum(rk.pos2, 0), slotPos: 0, rotationRole: 'role',
          rating: parseNum(rk.rating, 65), photo: rk.photo, avatar: rk.avatar || '', image: rk.image, isSelf: !!rk.isSelf,
          minutes: benchMin, roleScore: rk.roleScore, rookie: !!rk.rookie, draftPick: rk.draftPick, draft: rk.draft, yearsLeague: rk.yearsLeague
        });
        return;
      }
      let replaceIdx = -1;
      for (let i = rotation.length - 1; i >= 0; i--) {
        if (rotation[i].rotationRole === 'role' && !rotation[i].isSelf) { replaceIdx = i; break; }
      }
      if (replaceIdx < 0) {
        for (let i = rotation.length - 1; i >= 0; i--) {
          if (rotation[i].rotationRole !== 'starter' && !rotation[i].isSelf) { replaceIdx = i; break; }
        }
      }
      if (replaceIdx < 0) replaceIdx = rotation.length - 1;
      const old = rotation[replaceIdx];
      rotation[replaceIdx] = {
        id: rk.id, name: rk.name, pos: parseNum(rk.pos, 3), pos2: parseNum(rk.pos2, 0), slotPos: 0, rotationRole: 'role',
        rating: parseNum(rk.rating, 65), photo: rk.photo, avatar: rk.avatar || '', image: rk.image, isSelf: !!rk.isSelf,
        minutes: benchMin, roleScore: rk.roleScore, rookie: !!rk.rookie, draftPick: rk.draftPick, draft: rk.draft, yearsLeague: rk.yearsLeague
      };
      if (old && old.minutes > benchMin) old.minutes = Math.max(6, old.minutes - (benchMin - 6));
    } else if (slot.minutes < 8) {
      slot.minutes = rng(8, 12);
    }
  });
  if (includeUser) {
    adjustUserMinutesByTrust(rotation);
  }
  normalizeRotationMinutes(rotation, 240);
  rotation.forEach(r => {
    if (isFirstRoundRookiePlayer(r) && r.minutes < 8) r.minutes = 8;
  });
  normalizeRotationMinutes(rotation, 240);
  return rotation;
}
function ensureGameRotation(force = false) {
  if (!force && Array.isArray(G._currentRotation) && G._rotationGame === G.gameNum && G._rotationTeam === G.teamId) {
    return G._currentRotation;
  }
  const rot = buildDynamicTeamRotation(G.teamId, { includeUser: true });
  G._currentRotation = rot;
  G._rotationGame = G.gameNum;
  G._rotationTeam = G.teamId;
  const teamObj = LEAGUE.teams?.[G.teamId];
  if (teamObj) {
    const aiRot = buildDynamicTeamRotation(G.teamId, { includeUser: false });
    teamObj.rotation = aiRot.map(r => ({
      id: r.id, name: r.name, pos: r.pos, pos2: r.pos2, slotPos: r.slotPos, rotationRole: r.rotationRole,
      minutes: r.minutes, rating: r.rating, photo: r.photo, avatar: r.avatar || ''
    }));
    teamObj.strength = calcTeamStrength(teamObj);
  }
  return rot;
}
function calcTeamStrength(teamObj) {
  const teamId = teamObj.meta.id;
  let pool = [...(teamObj.rotation || [])];

  // 如果是玩家所在球队，把玩家也加入计算池
  if (parseNum(G.teamId, 0) === parseNum(teamId, 0) && G.player) {
    // 检查rotation里是否已经包含了玩家(避免重复)
    const inRot = pool.some(r => r.isSelf || String(r.id) === 'USER_SELF');
    if (!inRot) {
      pool.push({
        id: 'USER_SELF',
        isSelf: true,
        rating: ovr(G.player.attrs || {}),
        badges: G.player.badges
      });
    }
  }

  // 取能力值最高的8人
  pool.sort((a, b) => parseNum(b.rating, 0) - parseNum(a.rating, 0));
  const core = pool.slice(0, 8);

  if (!core.length) return teamObj.meta.r || 75;
  const weight = [1, 1, 1, 1, 1, 0.7, 0.6, 0.5];
  let wSum = 0, val = 0;
  const coachFx = getCoachEffectsByCoach(teamObj.coach);
  core.forEach((p, i) => {
    const w = weight[i] || 0.4;
    wSum += w;
    const r = parseNum(p.rating, 70);
    const badgeBonus = Math.min(6, getPlayerBadgePower(p) * 0.22);
    const boosted = (r + badgeBonus) * coachFx.teamRatingMult;
    val += boosted * w;
  });
  return clamp(Math.round(val / Math.max(wSum, 1)), 50, 98);
}
const FILE_ACCESS = {
  dbName: 'nba_career_sim',
  store: 'fs',
  key: 'root'
};

// ============ IMAGE CACHE (IndexedDB) ============
const IMAGE_CACHE_DB = 'nba_image_cache';
const IMAGE_CACHE_STORE = 'images';

function openImageCacheDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IMAGE_CACHE_DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IMAGE_CACHE_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedImageData(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return url;
  try {
    const db = await openImageCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IMAGE_CACHE_STORE, 'readonly');
      const req = tx.objectStore(IMAGE_CACHE_STORE).get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

async function setImageCacheData(url, dataUrl) {
  if (!url || !dataUrl) return;
  try {
    const db = await openImageCacheDB();
    const tx = db.transaction(IMAGE_CACHE_STORE, 'readwrite');
    tx.objectStore(IMAGE_CACHE_STORE).put(dataUrl, url);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
  } catch (e) {}
}

const isFileMode = () => location.protocol === 'file:';
const canUseFS = () => typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';

async function resolveImageSrc(src) {
  if (!src || typeof src !== 'string') return src;
  if (src.startsWith('data:')) return src;
  if (src.startsWith('<svg') || src.startsWith('<SVG')) return src;
  return src;
}
function normalizePath(path) {
  return String(path || '').replace(/\\/g, '/').replace(/^\.?\//, '');
}
function decodeTextBuffer(buf) {
  const utf8 = new TextDecoder('utf-8').decode(buf);
  if (!/�/.test(utf8)) return utf8;
  try {
    const gbk = new TextDecoder('gbk').decode(buf);
    if (!/�/.test(gbk)) return gbk;
  } catch (e) { }
  return utf8;
}
function openFSDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FILE_ACCESS.dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_ACCESS.store)) {
        db.createObjectStore(FILE_ACCESS.store);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
  });
}
async function loadSavedRootHandle() {
  if (!canUseFS()) return null;
  try {
    const db = await openFSDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_ACCESS.store, 'readonly');
      const st = tx.objectStore(FILE_ACCESS.store);
      const req = st.get(FILE_ACCESS.key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('indexedDB get failed'));
    });
  } catch (e) {
    return null;
  }
}
async function saveRootHandle(handle) {
  if (!canUseFS() || !handle) return;
  try {
    const db = await openFSDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_ACCESS.store, 'readwrite');
      const st = tx.objectStore(FILE_ACCESS.store);
      const req = st.put(handle, FILE_ACCESS.key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('indexedDB put failed'));
    });
  } catch (e) { }
}
async function clearSavedRootHandle() {
  if (!canUseFS()) return;
  LEAGUE.rootHandle = null;
  try {
    const db = await openFSDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_ACCESS.store, 'readwrite');
      const st = tx.objectStore(FILE_ACCESS.store);
      const req = st.delete(FILE_ACCESS.key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('indexedDB delete failed'));
    });
  } catch (e) { }
}
async function getRootHandle(autoOnly = true, forcePick = false) {
  if (!canUseFS()) return null;
  if (forcePick) {
    const picked = await window.showDirectoryPicker({ mode: 'read' });
    if (!picked) return null;
    const pp = await picked.requestPermission({ mode: 'read' });
    if (pp !== 'granted') return null;
    LEAGUE.rootHandle = picked;
    await saveRootHandle(picked);
    return picked;
  }
  if (LEAGUE.rootHandle) {
    try {
      const p = await LEAGUE.rootHandle.queryPermission({ mode: 'read' });
      if (p === 'granted') return LEAGUE.rootHandle;
      if (!autoOnly) {
        const asked = await LEAGUE.rootHandle.requestPermission({ mode: 'read' });
        if (asked === 'granted') return LEAGUE.rootHandle;
      }
    } catch (e) { }
  }
  const saved = await loadSavedRootHandle();
  if (saved) {
    LEAGUE.rootHandle = saved;
    try {
      const p = await saved.queryPermission({ mode: 'read' });
      if (p === 'granted') return saved;
      if (!autoOnly) {
        const asked = await saved.requestPermission({ mode: 'read' });
        if (asked === 'granted') {
          await saveRootHandle(saved);
          return saved;
        }
      }
    } catch (e) { }
  }
  if (autoOnly) return null;
  const picked = await window.showDirectoryPicker({ mode: 'read' });
  if (!picked) return null;
  const pp = await picked.requestPermission({ mode: 'read' });
  if (pp !== 'granted') return null;
  LEAGUE.rootHandle = picked;
  await saveRootHandle(picked);
  return picked;
}
function localPathVariants(path) {
  const norm = normalizePath(path);
  const set = new Set([norm]);
  // Support simplified asset structure
  if (norm.startsWith('assets/data/')) {
    set.add(norm.replace('assets/data/', ''));
    set.add(norm.replace('assets/data/', 'raw/')); // Legacy fallback just in case
  }
  return [...set].filter(Boolean);
}
async function readFromHandle(handle, path) {
  const segs = normalizePath(path).split('/').filter(Boolean);
  if (!segs.length) throw new Error('invalid path');
  let dir = handle;
  for (let i = 0; i < segs.length - 1; i++) {
    dir = await dir.getDirectoryHandle(segs[i], { create: false });
  }
  const fh = await dir.getFileHandle(segs[segs.length - 1], { create: false });
  const file = await fh.getFile();
  const buf = await file.arrayBuffer();
  return decodeTextBuffer(buf);
}
async function readFromRootHandle(path) {
  const root = await getRootHandle(true);
  if (!root) throw new Error(`LOCAL_FS_PERMISSION_REQUIRED:${path}`);
  const variants = localPathVariants(path);
  for (const p of variants) {
    try {
      return await readFromHandle(root, p);
    } catch (e) {
      if (e?.name !== 'NotFoundError') throw e;
    }
  }
  throw new Error(`LOCAL_FS_PATH_NOT_FOUND:${path}`);
}
async function fetchText(path) {
  const norm = normalizePath(path);
  if (isFileMode()) {
    return readFromRootHandle(norm);
  }
  const tried = [];
  for (const p of localPathVariants(norm)) {
    try {
      const res = await fetch(p);
      tried.push(p);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      return decodeTextBuffer(buf);
    } catch (e) {
      tried.push(`${p} (${e?.name || 'ERR'})`);
    }
  }
  throw new Error(`load failed: ${norm}; tried=${tried.join(', ')}`);
}
function isPermissionErr(e) {
  const m = String(e?.message || '');
  return m.startsWith('LOCAL_FS_PERMISSION_REQUIRED:');
}
function parseYearFromPath(path, prefix) {
  const m = String(path || '').match(new RegExp(`${prefix}(\\d{2})\\.csv$`));
  return m ? parseInt(m[1], 10) : null;
}
function uniquePaths(paths) {
  return [...new Set((paths || []).filter(Boolean))];
}
function resolveRosterIndexesByStartYear(startYear) {
  const y = parseNum(startYear, 0);
  const list = APK_START_YEAR_TO_ROSTER_INDEXES[y];
  if (Array.isArray(list) && list.length) return [...new Set(list.map(v => parseNum(v, 0)).filter(v => v >= 1 && v <= 99))];
  return [];
}
function buildRosterPathCandidatesByIndex(index) {
  const idx = clamp(parseNum(index, 1), 1, 99);
  const p = pad2(idx);
  return uniquePaths([
    `assets/data/rosters${p}.csv`
  ]);
}
function buildCoachPathCandidatesByIndex(index) {
  const idx = clamp(parseNum(index, 1), 1, 99);
  const p = pad2(idx);
  return uniquePaths([
    `assets/data/coaches${p}.csv`,
    `assets/data/coaches01.csv`
  ]);
}
function buildRookiePathCandidates() {
  const paths = [`assets/data/rostersRookiesReal.csv`];
  for (let y = 25; y >= 1; y--) {
    paths.push(`assets/data/rostersRookie${pad2(y)}.csv`);
  }
  return uniquePaths(paths);
}
function buildNamesPathCandidates() {
  return uniquePaths([`assets/data/names.json`]);
}
function buildRosterCandidatesByStartYear(startYear, { strictRoster = false } = {}) {
  const preferred = resolveRosterIndexesByStartYear(startYear);
  const candidates = [];
  preferred.forEach(idx => candidates.push(...buildRosterPathCandidatesByIndex(idx)));
  if (!strictRoster) {
    for (let idx = 1; idx <= 25; idx++) {
      if (preferred.includes(idx)) continue;
      candidates.push(...buildRosterPathCandidatesByIndex(idx));
    }
  }
  return uniquePaths(candidates);
}
async function fetchFirstText(candidates, { required = true, label = '' } = {}) {
  let lastErr = null;
  for (const p of candidates) {
    try {
      const text = await fetchText(p);
      return { path: p, text };
    } catch (e) {
      if (isPermissionErr(e)) throw e;
      lastErr = e;
    }
  }
  if (!required) return { path: '', text: '' };
  throw lastErr || new Error(`DATA_FILE_NOT_FOUND:${label || candidates[0] || 'unknown'}`);
}
const HISTORICAL_DB_BASE = 'assets/data/historical';
function normalizeHistoricalNameKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function historicalHonorCounter() {
  return {
    rings: 0, mvp: 0, fmvp: 0, dpoy: 0, roy: 0, allStar: 0, allStarMvp: 0,
    allNba1: 0, allNba2: 0, allNba3: 0, allDefensive: 0, scoring: 0,
    rebound: 0, assist: 0, block: 0, steal: 0
  };
}
function normalizeHistoricalHonors(raw = null) {
  const out = historicalHonorCounter();
  if (!raw || typeof raw !== 'object') return out;
  Object.keys(out).forEach(key => { out[key] = Math.max(0, Math.floor(parseNum(raw[key], 0))); });
  return out;
}
function rosterRowHonorCounter(row = {}) {
  return normalizeHistoricalHonors({
    rings: row.rings,
    mvp: row.mvps,
    fmvp: row.fmvps,
    allNba1: row.allTeam1,
    allNba2: row.allTeam2,
    allNba3: row.allTeam3
  });
}
function computeHistoricalSeasonTotals(rows = []) {
  const totals = rows.reduce((acc, row) => {
    const gp = parseNum(row.gp, 0);
    acc.gp += gp;
    acc.pts += parseNum(row.ppg, 0) * gp;
    acc.reb += parseNum(row.rpg, 0) * gp;
    acc.ast += parseNum(row.apg, 0) * gp;
    acc.stl += parseNum(row.spg, 0) * gp;
    acc.blk += parseNum(row.bpg, 0) * gp;
    return acc;
  }, { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 });
  const gp = Math.max(1, totals.gp);
  return {
    ...totals,
    averages: {
      ppg: +(totals.pts / gp).toFixed(1),
      rpg: +(totals.reb / gp).toFixed(1),
      apg: +(totals.ast / gp).toFixed(1),
      spg: +(totals.stl / gp).toFixed(1),
      bpg: +(totals.blk / gp).toFixed(1)
    }
  };
}
function historicalHonorsSummary(honors = {}) {
  const c = normalizeHistoricalHonors(honors);
  const parts = [
    ['rings', '总冠军'], ['mvp', 'MVP'], ['fmvp', 'FMVP'], ['dpoy', 'DPOY'], ['roy', 'ROY'],
    ['allStar', '全明星'], ['allStarMvp', '全明星MVP'], ['allNba1', '一阵'], ['allNba2', '二阵'],
    ['allNba3', '三阵'], ['allDefensive', '一防'], ['scoring', '得分王'], ['rebound', '篮板王'],
    ['assist', '助攻王'], ['block', '盖帽王'], ['steal', '抢断王']
  ].filter(([key]) => parseNum(c[key], 0) > 0).map(([key, label]) => `${label}x${c[key]}`);
  return parts.length ? parts.join(' / ') : '暂无已验证荣誉';
}
function hasHistoricalHonors(honors = {}) {
  const c = normalizeHistoricalHonors(honors);
  return Object.keys(c).some(key => parseNum(c[key], 0) > 0);
}
function historicalHonorBadgeItems(honors = {}) {
  const c = normalizeHistoricalHonors(honors);
  return [
    ['rings', '总冠军', 'b-gold'], ['mvp', 'MVP', 'b-gold'], ['fmvp', 'FMVP', 'b-gold'],
    ['dpoy', 'DPOY', 'b-cyan'], ['roy', 'ROY', 'b-pri'], ['allNba1', '一阵', 'b-gold'],
    ['allNba2', '二阵', 'b-pri'], ['allNba3', '三阵', 'b-pri'], ['allDefensive', '一防', 'b-cyan'],
    ['allStar', '全明星', 'b-pri'], ['allStarMvp', '全明星MVP', 'b-gold'], ['scoring', '得分王', 'b-no'],
    ['rebound', '篮板王', 'b-cyan'], ['assist', '助攻王', 'b-cyan'], ['block', '盖帽王', 'b-cyan'],
    ['steal', '抢断王', 'b-cyan']
  ]
    .filter(([key]) => parseNum(c[key], 0) > 0)
    .map(([key, label, cls]) => ({ key, label, count: parseNum(c[key], 0), cls }));
}
function renderHistoricalHonorBadges(honors = {}) {
  const items = historicalHonorBadgeItems(honors);
  if (!items.length) return '<div class="t-2 fs-xs">暂无可验证 NBA 历史荣誉</div>';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px">${items.map(item => (
    `<span class="badge ${item.cls}" title="${escapeHtml(item.label)}">${escapeHtml(item.label)} x${item.count}</span>`
  )).join('')}</div>`;
}
function renderHistoricalHonorSeasonList(seasons = []) {
  const rows = (Array.isArray(seasons) ? seasons : [])
    .filter(row => Array.isArray(row.awards) && row.awards.length)
    .slice()
    .sort((a, b) => parseNum(b.seasonEndYear, 0) - parseNum(a.seasonEndYear, 0))
    .slice(0, 8);
  if (!rows.length) return '<div class="t-2 fs-xs mt-8">暂无可验证逐年荣誉明细</div>';
  return `<div class="mt-8">${rows.map(row => {
    const year = parseNum(row.seasonEndYear, parseNum(row.year, 0));
    const awards = row.awards.map(item => escapeHtml(item)).join(' / ');
    const sourceNote = row.approximate ? ' · 聚合口径' : '';
    return `<div class="t-2 fs-xs mt-8"><span class="fw-b">${year}</span>：${awards}${sourceNote}</div>`;
  }).join('')}</div>`;
}
async function fetchHistoricalJson(fileName, fallback = null) {
  try {
    return JSON.parse(await fetchText(`${HISTORICAL_DB_BASE}/${fileName}`));
  } catch (e) {
    return fallback;
  }
}
function indexHistoricalDb(raw = {}) {
  const players = Array.isArray(raw.players?.players) ? raw.players.players : [];
  const playersById = {};
  const playersByKey = {};
  players.forEach(player => {
    if (!player?.realId) return;
    playersById[player.realId] = player;
    const keys = [
      player.historyKey,
      player.name,
      player.displayName,
      player.nameEn,
      player.nameCn,
      ...(Array.isArray(player.aliases) ? player.aliases : [])
    ].map(normalizeHistoricalNameKey).filter(Boolean);
    keys.forEach(key => { if (!playersByKey[key]) playersByKey[key] = player; });
  });
  const seasonsByPlayer = {};
  (raw.seasonPacks || []).forEach(pack => {
    (Array.isArray(pack?.rows) ? pack.rows : []).forEach(row => {
      if (!row?.realId) return;
      if (!seasonsByPlayer[row.realId]) seasonsByPlayer[row.realId] = { regular: [], playoffs: [] };
      const type = String(row.type || 'regular').toLowerCase() === 'playoffs' ? 'playoffs' : 'regular';
      seasonsByPlayer[row.realId][type].push(row);
    });
  });
  Object.values(seasonsByPlayer).forEach(bucket => {
    bucket.regular.sort((a, b) => parseNum(a.season, 0) - parseNum(b.season, 0));
    bucket.playoffs.sort((a, b) => parseNum(a.season, 0) - parseNum(b.season, 0));
  });
  return {
    loaded: true,
    error: null,
    manifest: raw.manifest || {},
    players,
    playersById,
    playersByKey,
    seasonsByPlayer,
    draftClasses: raw.draftClasses?.classes || {},
    awardsByPlayer: raw.awards?.playerAwards || {},
    awardSeasonsByPlayer: raw.awards?.awardSeasons || {},
    awardsMeta: raw.awards?.sourceCoverage || {},
    awardsVersion: parseNum(raw.awards?.version, 0),
    eraTop100: raw.eraTop100 || { rankings: {} },
    transactions: raw.transactions || {},
    salaries: raw.salaries || {}
  };
}
async function loadHistoricalDb({ force = false } = {}) {
  if (!force && LEAGUE.historicalDb?.loaded) return LEAGUE.historicalDb;
  try {
    const manifest = await fetchHistoricalJson('manifest.json', null);
    if (!manifest) throw new Error('historical manifest missing');
    const [players, draftClasses, awards, eraTop100, transactions, salaries] = await Promise.all([
      fetchHistoricalJson(manifest.files?.players || 'players.json', { players: [] }),
      fetchHistoricalJson(manifest.files?.draftClasses || 'draft_classes.json', { classes: {} }),
      fetchHistoricalJson(manifest.files?.awards || 'awards.json', { playerAwards: {}, awardSeasons: {} }),
      fetchHistoricalJson(manifest.files?.eraTop100 || 'era_top100.json', { rankings: {} }),
      fetchHistoricalJson(manifest.files?.transactions || 'transactions.json', { transactions: [] }),
      fetchHistoricalJson(manifest.files?.salaries || 'salaries.json', { salaries: [] })
    ]);
    const seasonFiles = Array.isArray(manifest.files?.playerSeasons) ? manifest.files.playerSeasons : [];
    const seasonPacks = await Promise.all(seasonFiles.map(file => fetchHistoricalJson(file, { rows: [] })));
    LEAGUE.historicalDb = indexHistoricalDb({ manifest, players, draftClasses, awards, eraTop100, transactions, salaries, seasonPacks });
  } catch (e) {
    LEAGUE.historicalDb = { loaded: false, error: e, manifest: {}, playersById: {}, playersByKey: {}, seasonsByPlayer: {}, draftClasses: {}, awardsByPlayer: {}, awardSeasonsByPlayer: {}, awardsMeta: {}, eraTop100: { rankings: {} } };
    console.warn('Historical DB load failed; continuing without verified history.', e);
  }
  return LEAGUE.historicalDb;
}
function getHistoricalDb() {
  return LEAGUE.historicalDb?.loaded ? LEAGUE.historicalDb : null;
}
function findHistoricalPlayer(playerOrRow = {}) {
  const db = getHistoricalDb();
  if (!db) return null;
  const keys = [
    playerOrRow.realId,
    playerOrRow.historyKey,
    playerOrRow.nameEn,
    playerOrRow.altName,
    playerOrRow.nameBirth,
    playerOrRow.displayName,
    playerOrRow.name,
    playerOrRow.nameCn
  ];
  for (const keyRaw of keys) {
    const id = String(keyRaw || '').trim();
    if (id && db.playersById[id]) return db.playersById[id];
    const key = normalizeHistoricalNameKey(keyRaw);
    if (key && db.playersByKey[key]) return db.playersByKey[key];
  }
  return null;
}
function getHistoricalHonorsForPlayer(realId, asOfYear, fallback = null) {
  const db = getHistoricalDb();
  const byYear = db?.awardsByPlayer?.[realId] || {};
  const years = Object.keys(byYear).map(Number).filter(year => year <= asOfYear).sort((a, b) => a - b);
  if (years.length) return normalizeHistoricalHonors(byYear[years[years.length - 1]]);
  return normalizeHistoricalHonors(fallback || null);
}
function getHistoricalHonorSeasonsForPlayer(realId, asOfYear) {
  const db = getHistoricalDb();
  const rows = Array.isArray(db?.awardSeasonsByPlayer?.[realId]) ? db.awardSeasonsByPlayer[realId] : [];
  return rows
    .filter(row => parseNum(row.seasonEndYear, parseNum(row.year, 0)) <= asOfYear)
    .map(row => ({
      seasonEndYear: parseNum(row.seasonEndYear, parseNum(row.year, 0)),
      year: parseNum(row.year, parseNum(row.seasonEndYear, 0)),
      awards: Array.isArray(row.awards) ? row.awards.map(item => String(item || '').trim()).filter(Boolean) : [],
      counter: normalizeHistoricalHonors(row.counter || null),
      cumulative: normalizeHistoricalHonors(row.cumulative || null),
      source: String(row.source || 'historical_awards'),
      approximate: !!row.approximate
    }))
    .sort((a, b) => parseNum(a.seasonEndYear, 0) - parseNum(b.seasonEndYear, 0));
}
function mapHistoricalSeasonRow(row = {}) {
  return {
    year: parseNum(row.season, 0),
    seasonEndYear: parseNum(row.seasonEndYear, parseNum(row.season, 0) + 1),
    team: parseNum(row.teamId, 0),
    teamAbbr: String(row.team || '').trim(),
    gp: parseNum(row.gp, 0),
    mins: parseNum(row.mins, 0),
    ppg: parseNum(row.ppg, 0),
    rpg: parseNum(row.rpg, 0),
    apg: parseNum(row.apg, 0),
    spg: parseNum(row.spg, 0),
    bpg: parseNum(row.bpg, 0),
    fgPct: parseNum(row.fgPct, 0),
    tpPct: parseNum(row.tpPct, 0),
    ftPct: parseNum(row.ftPct, 0),
    source: String(row.source || 'historical_db')
  };
}
function getHistoricalEraEntries(asOfYear = null) {
  const db = getHistoricalDb();
  if (!db) return [];
  const year = parseNum(asOfYear, parseNum(G.startYear, G.year || 2025));
  const rankings = db.eraTop100?.rankings || {};
  const direct = rankings[String(year)] || rankings[year];
  if (Array.isArray(direct)) return direct;
  const years = Object.keys(rankings).map(Number).filter(y => y <= year).sort((a, b) => a - b);
  return years.length ? (rankings[String(years[years.length - 1])] || []) : [];
}
function getHistoricalRankForPlayer(realId, asOfYear = null) {
  const list = getHistoricalEraEntries(asOfYear);
  return list.find(entry => String(entry.realId || entry.id) === String(realId)) || null;
}
function hydratePlayerWithHistoricalData(player, asOfYear = null) {
  if (!player) return player;
  const year = parseNum(asOfYear, parseNum(G.startYear, G.year || 2025));
  const historical = findHistoricalPlayer(player);
  if (!historical) return player;
  const realId = historical.realId;
  const db = getHistoricalDb();
  const bucket = db?.seasonsByPlayer?.[realId] || { regular: [], playoffs: [] };
  const regularRows = bucket.regular.filter(row => parseNum(row.seasonEndYear, 0) <= year).map(mapHistoricalSeasonRow);
  const playoffRows = bucket.playoffs.filter(row => parseNum(row.seasonEndYear, 0) <= year).map(mapHistoricalSeasonRow);
  const fallbackHonors = historical.honorsFromRosters?.[year] || player.historicalRosterHonors || null;
  const honors = getHistoricalHonorsForPlayer(realId, year, fallbackHonors);
  const honorSeasons = getHistoricalHonorSeasonsForPlayer(realId, year);
  const totals = computeHistoricalSeasonTotals(regularRows);
  const firstRegular = regularRows[0] || null;
  const lastRegular = regularRows[regularRows.length - 1] || null;
  const rankEntry = getHistoricalRankForPlayer(realId, year);
  player.realId = realId;
  player.historyKey = historical.historyKey || player.historyKey || normalizeHistoricalNameKey(player.nameEn || player.altName || player.name);
  player.sourceCoverage = {
    ...(historical.sourceCoverage || {}),
    asOfYear: year,
    awards: hasHistoricalHonors(honors),
    awardSeasons: honorSeasons.length
  };
  if (historical.image && !parseNum(player.image, 0)) player.image = parseNum(historical.image, 0);
  if (historical.photoLocal && !player.photoLocal) player.photoLocal = historical.photoLocal;
  if (historical.photoStatus && !player.photoStatus) player.photoStatus = historical.photoStatus;
  if (historical.photoSource && !player.photoSource) player.photoSource = historical.photoSource;
  if (historical.photoLocal && (!player.photo || /IMG0000\.png$/i.test(String(player.photo)))) player.photo = historical.photoLocal;
  player.seasonHistory = regularRows;
  player.playoffHistory = playoffRows;
  player.careerHistory = regularRows;
  player.historicalStatsBySeason = regularRows.reduce((acc, row) => {
    const key = String(row.seasonEndYear || row.year || '').trim();
    if (key) acc[key] = row;
    return acc;
  }, {});
  player.honorSeasons = honorSeasons;
  player.salaryHistory = [];
  player.transactionHistory = [];
  player.careerBeforeStart = {
    asOfYear: year,
    seasons: regularRows.length,
    playoffSeasons: playoffRows.length,
    firstSeason: firstRegular?.year || null,
    firstSeasonEndYear: firstRegular?.seasonEndYear || null,
    lastSeason: lastRegular?.year || null,
    lastSeasonEndYear: lastRegular?.seasonEndYear || null,
    totals,
    honors,
    honorSummary: historicalHonorsSummary(honors),
    honorSeasons,
    honorSource: 'historical_awards_v2',
    sourceCoverage: player.sourceCoverage
  };
  if (rankEntry) {
    player.historicalRankAsOfStart = {
      rank: parseNum(rankEntry.rank, 0),
      legacyScore: parseNum(rankEntry.legacyScore, 0),
      peakScore: parseNum(rankEntry.peakScore, 0),
      asOfYear: year
    };
  }
  return player;
}
function historicalDraftYears() {
  const db = getHistoricalDb();
  return Object.keys(db?.draftClasses || {}).map(Number).filter(year => year >= 1947 && year <= 2100).sort((a, b) => a - b);
}
function historicalRookieAttrs(rating, pos) {
  const r = clamp(parseNum(rating, 68), 45, 92);
  const attrs = {
    pass: r - 2,
    shotInt: r,
    shotExt: r - 2,
    shotFree: r - 1,
    physique: r,
    blk: r - 5,
    reb: r - 2,
    stl: r - 4,
    speed: r,
    strength: r - 1
  };
  if (pos <= 2) { attrs.pass += 5; attrs.speed += 4; attrs.blk -= 8; attrs.reb -= 5; }
  if (pos >= 4) { attrs.reb += 5; attrs.blk += 5; attrs.pass -= 4; attrs.shotExt -= 5; attrs.strength += 5; }
  Object.keys(attrs).forEach(key => { attrs[key] = clamp(Math.round(attrs[key]), 35, 96); });
  return attrs;
}
function historicalRookieToPlayer(item = {}, index = 0) {
  const pick = parseNum(item.pick, index + 1);
  const draftYear = parseNum(item.draftYear, 0);
  const pos = clamp(parseNum(item.pos, 3), 1, 5);
  const rating = clamp(parseNum(item.ratingSeed, pick <= 1 ? 78 : pick <= 5 ? 75 : pick <= 14 ? 71 : 66), 45, 90);
  const rawPot = parseNum(item.potentialSeed, pick <= 1 ? 95 : pick <= 5 ? 90 : pick <= 14 ? 84 : 76);
  const potential = rawPot <= 11 ? normalizePotentialValue(rawPot, rating) : clamp(rawPot, rating, 99);
  const attrs = historicalRookieAttrs(rating, pos);
  const imageId = clamp(parseNum(item.image, 0), 0, 9999);
  const photoLocal = cleanText(item.photoLocal || '');
  const photo = cleanText(item.photo || photoLocal || (imageId ? getPlayerPhotoPath(imageId) : getPlayerPhotoPath(0)));
  return {
    id: 730000 + draftYear * 1000 + pick,
    uid: `hist_${draftYear}_${pick}_${item.historyKey || index}`,
    realId: item.realId || '',
    historyKey: item.historyKey || normalizeHistoricalNameKey(item.nameEn || item.name || ''),
    name: cleanText(item.nameCn || item.name || item.displayName || `新秀${pick}号`),
    altName: cleanText(item.nameEn || item.name || item.displayName || ''),
    nameCn: cleanText(item.nameCn || item.name || item.displayName || ''),
    nameEn: cleanText(item.nameEn || item.name || item.displayName || ''),
    pos,
    pos2: clamp(parseNum(item.pos2, 0), 0, 5),
    rating,
    potential,
    att: calcPlayerAtt(attrs),
    def: calcPlayerDef(attrs),
    age: clamp(parseNum(item.age, 20), 18, 30),
    yearsLeague: 0,
    draft: parseNum(item.draft, draftYear * 100 + pick),
    draftPick: pick,
    draftTeam: item.draftTeam || '',
    teamId: parseNum(item.teamId, 0),
    sourceDraftYear: draftYear,
    source: item.source || 'historical_db',
    photo,
    photoLocal,
    photoSource: item.photoSource || (photoLocal ? 'historical_headshot_cache' : ''),
    photoStatus: item.photoStatus || (photoLocal ? 'cached' : 'missing'),
    image: imageId,
    info: item.college ? `真实选秀来源：${item.college}` : '真实历史选秀库',
    attrs,
    tendencies: { in: pos >= 4 ? 70 : 58, mid: 58, ex: pos <= 3 ? 65 : 48 },
    rookie: true,
    injury: { active: false, games: 0, type: "" }
  };
}
function getHistoricalDraftClass(targetYear) {
  const db = getHistoricalDb();
  const year = parseNum(targetYear, 0);
  const list = db?.draftClasses?.[String(year)] || db?.draftClasses?.[year] || [];
  return (Array.isArray(list) ? list : []).map(historicalRookieToPlayer);
}
function buildHistoricalRookieCatalog() {
  const db = getHistoricalDb();
  if (!db) return [];
  return Object.entries(db.draftClasses || {}).flatMap(([year, list]) =>
    (Array.isArray(list) ? list : []).map((item, idx) => historicalRookieToPlayer({ ...item, draftYear: parseNum(item.draftYear, year) }, idx))
  );
}
function renderLocalFileHint() {
  if (!isFileMode()) return '';
  if (LEAGUE.loaded) {
    return `<div class="ev pos mb-16">✅ 已从本地文件夹自动读取名单数据（球员/教练/新秀）</div>`;
  }
  if (!canUseFS()) {
    return `<div class="ev neg mb-16">⚠️ 当前浏览器不支持文件夹授权读取。请改用本地 HTTP 服务打开页面。</div>`;
  }
  const err = String(LEAGUE.loadError?.message || '');
  const badPath = err.startsWith('LOCAL_FS_PATH_NOT_FOUND:');
  const needPerm = err.startsWith('LOCAL_FS_PERMISSION_REQUIRED:');
  if (badPath) {
    return `<div class="ev neg mb-16">
      ⚠️ 已授权目录中未找到名单文件。请重新选择目录。<br>
      可选目录：项目根目录（推荐，需包含 \`assets/data\` 名单）或 \`assets/data\` 本身。<br>
      <div class="mt-12"><button class="btn btn-cyan" onclick="grantLocalFolderAccess(true)">重新选择数据目录</button></div>
    </div>`;
  }
  if (needPerm) {
    return `<div class="ev neg mb-16">
      ⚠️ 需要本地目录读取权限。<br>
      <div class="mt-12"><button class="btn btn-cyan" onclick="grantLocalFolderAccess(true)">授权本地数据目录</button></div>
    </div>`;
  }
  return `<div class="ev neg mb-16">
    ⚠️ 检测到你用 file:// 打开页面，浏览器默认禁止 fetch 读取本地 CSV（CORS）。<br>
    点击按钮授权数据目录（根目录或 assets/data）后，可自动读取并记住权限。<br>
    <div class="mt-12"><button class="btn btn-cyan" onclick="grantLocalFolderAccess(true)">授权本地数据目录</button></div>
  </div>`;
}
async function grantLocalFolderAccess(forcePick = true) {
  if (!isFileMode() || !canUseFS()) return;
  try {
    const handle = await getRootHandle(false, forcePick);
    if (!handle) {
      alert('未获得目录读取权限');
      return;
    }
    await loadLeagueData({ startYear: G.startYear });
    renderCreate();
    if (LEAGUE.loaded) {
      alert('名单读取成功，后续将自动读取');
    } else {
      alert('已授权目录，但未读取到数据。请确认你选择的是项目根目录（包含 raw）或 raw 目录本身。');
    }
  } catch (e) {
    console.warn('grant local folder failed', e);
    alert('目录授权失败，请重试');
  }
}
function pickRookieTemplateFile(season) {
  const idx = ((season - 1) % 5) + 1;
  return `assets/data/rostersRookie${pad2(idx)}.csv`;
}
function pickRandomName() {
  if (!LEAGUE.namesPool.length) return `Rookie ${rng(1000, 9999)}`;
  const bucket = pick(LEAGUE.namesPool);
  const first = (bucket.male && bucket.male.length) ? pick(bucket.male) : 'Alex';
  const last = (bucket.surnames && bucket.surnames.length) ? pick(bucket.surnames) : 'Stone';
  return `${first} ${last}`;
}
async function loadLeagueData({ startYear = null, strictRoster = false } = {}) {
  try {
    const requestedStartYear = clamp(parseNum(startYear, parseNum(G.startYear, G.year || 2025)), 1946, 2100);
    const rosterCandidates = buildRosterCandidatesByStartYear(requestedStartYear, { strictRoster });
    const rosterPack = await fetchFirstText(rosterCandidates, { required: true, label: `roster@${requestedStartYear}` });
    const detectedRosterYear = parseYearFromPath(rosterPack.path, 'rosters');
    const preferredCoachIndex = detectedRosterYear || resolveRosterIndexesByStartYear(requestedStartYear)[0] || 1;
    const coachCandidates = buildCoachPathCandidatesByIndex(preferredCoachIndex);

    const [coachPack, namesPack, rookiePack] = await Promise.all([
      fetchFirstText(coachCandidates, { required: true, label: 'coach' }),
      fetchFirstText(buildNamesPathCandidates(), { required: false, label: 'names' }),
      fetchFirstText(buildRookiePathCandidates(), { required: false, label: 'rookies' })
    ]);

    const rosterText = rosterPack.text;
    const coachText = coachPack.text;
    const namesText = namesPack.text || '[]';
    await loadHistoricalDb();

    const detectedCoachYear = parseYearFromPath(coachPack.path, 'coaches');
    const mappedRosterYear = resolveRosterScriptStartYear(detectedRosterYear);
    if (mappedRosterYear) LEAGUE.years.roster = mappedRosterYear;
    else LEAGUE.years.roster = requestedStartYear;
    LEAGUE.years.rosterCode = detectedRosterYear || preferredCoachIndex;
    if (detectedCoachYear) LEAGUE.years.coach = detectedCoachYear;

    const rosterRows = parseCSV(rosterText);
    const coachRows = parseCSV(coachText);
    try {
      LEAGUE.namesPool = JSON.parse(namesText);
    } catch (e) {
      LEAGUE.namesPool = [];
    }
    LEAGUE.teams = {};
    LEAGUE.coaches = [];
    LEAGUE.rookieCatalog = [];
    LEAGUE.rookiesBySeason = {};
    rosterRows.forEach((r, idx) => {
      const teamId = resolveTeamId(r.teamID, r.team);
      if (teamId <= 0 || teamId > 30) return;
      // 跳过选秀年份晚于开档年份的球员（他们还未被选秀）
      const draftCode = parseNum(r.draft, 0);
      const draftYear = draftCode > 0 ? Math.floor(draftCode / 100) : 0;
      if (draftYear > requestedStartYear) return;
      if (!LEAGUE.teams[teamId]) {
        LEAGUE.teams[teamId] = { meta: toTeamMeta(teamId, r.team), players: [], rotation: [], coach: null, strength: 75 };
      }
      const player = rowToPlayer(r, idx + 1, { teamId });
      hydratePlayerWithHistoricalData(player, requestedStartYear);
      LEAGUE.teams[teamId].players.push(player);
    });
    coachRows.forEach((c, idx) => {
      const teamId = resolveTeamId(c.teamID, c.team);
      if (teamId <= 0 || teamId > 30) return;
      if (!LEAGUE.teams[teamId]) {
        LEAGUE.teams[teamId] = { meta: toTeamMeta(teamId, c.team), players: [], rotation: [], coach: null, strength: 75 };
      }
      const systemId = resolveCoachSystemIdByName(c.name, c);
      const systemProfile = getCoachSystemProfile(systemId);
      const coach = {
        id: idx + 1,
        name: c.name || 'Coach',
        teamId,
        age: parseNum(c.age, 45),
        yearsContract: parseNum(c.yearsContract, 3),
        salary: parseNum(c.salary, 0),
        techLevel: parseNum(c.techLevel, 2),
        techDev: parseNum(c.techDev, 2),
        baseShotIntPercent: parseNum(c.baseShotIntPercent, 40),
        baseShotTriplePercent: parseNum(c.baseShotTriplePercent, 40),
        baseOffensive: parseNum(c.baseOffensive, 40),
        baseDefense: parseNum(c.baseDefense, 40),
        currentShotIntPercent: parseNum(c.baseShotIntPercent, 40),
        currentShotTriplePercent: parseNum(c.baseShotTriplePercent, 40),
        currentOffensive: parseNum(c.baseOffensive, 40),
        currentDefense: parseNum(c.baseDefense, 40),
        loyalty: parseNum(c.loyalty, 5),
        systemId,
        systemLabel: systemProfile.label,
        secondaryLean: systemProfile.secondaryLean
      };
      LEAGUE.teams[teamId].coach = coach;
      LEAGUE.coaches.push({ ...coach, teamMeta: LEAGUE.teams[teamId].meta });
    });
    // 从名单中提取球龄=0的球员作为新秀池，从各队中移除，然后重新选秀分配
    const extractedRookies = [];
    Object.values(LEAGUE.teams).forEach(t => {
      const kept = [];
      (t.players || []).forEach(p => {
        if (parseNum(p.yearsLeague, -1) === 0) {
          extractedRookies.push({ ...p, originalTeamId: p.teamId, draftTeamId: p.teamId, teamId: 0, rookie: true, realRookieAttributes: true, source: p.source || 'roster_extracted_rookie' });
        } else {
          kept.push(p);
        }
      });
      t.players = kept;
    });
    const realRookies = realRookieCatalogFromRows(parseCSV(rookiePack.text || ''));
    const historicalRookies = buildHistoricalRookieCatalog();
    const rookieKeys = new Set();
    LEAGUE.rookieCatalog = [...extractedRookies, ...realRookies, ...historicalRookies].filter(p => {
      const key = playerIdentityKey(p) || `${p.sourceDraftYear || rookieDraftYear(p)}:${p.draftPick || p.id}`;
      if (!key || rookieKeys.has(key)) return false;
      rookieKeys.add(key);
      return true;
    });
    LEAGUE.rookiesBySeason = {};

    const scriptYears = getAvailableScriptYears();
    const preferredStart = resolveRosterScriptStartYear(LEAGUE.years.roster) || scriptYears[0] || parseNum(G.startYear, G.year || 2025);
    if (!scriptYears.includes(parseNum(G.startYear, 0))) {
      G.startYear = preferredStart;
    }
    if (!Number.isFinite(parseNum(G.year, 0)) || parseNum(G.year, 0) < 1900) {
      G.year = G.startYear;
    }

    normalizeLeagueSalaryUnits({ includeUser: false });
    Object.values(LEAGUE.teams).forEach(t => {
      t.rotation = toRotation(t.players);
      t.strength = calcTeamStrength(t);
    });
    LEAGUE.loaded = true;
    LEAGUE.loadError = null;
    ensureLeagueBadges();
  } catch (e) {
    LEAGUE.loaded = false;
    LEAGUE.loadError = e;
    console.warn('League data load failed, fallback to static teams.', e);
  }
}
function cloneLeagueDataValue(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value == null ? fallback : value));
  } catch (e) {
    return JSON.parse(JSON.stringify(fallback));
  }
}
function snapshotLeagueDataState() {
  return {
    loaded: !!LEAGUE.loaded,
    teams: cloneLeagueDataValue(LEAGUE.teams, {}),
    coaches: cloneLeagueDataValue(LEAGUE.coaches, []),
    rookieCatalog: cloneLeagueDataValue(LEAGUE.rookieCatalog, []),
    rootHandle: LEAGUE.rootHandle || null,
    loadError: LEAGUE.loadError || null,
    rookiesBySeason: cloneLeagueDataValue(LEAGUE.rookiesBySeason, {}),
    namesPool: cloneLeagueDataValue(LEAGUE.namesPool, []),
    availableScriptYears: cloneLeagueDataValue(LEAGUE.availableScriptYears, []),
    historicalDb: cloneLeagueDataValue(LEAGUE.historicalDb, { loaded: false, error: null }),
    years: cloneLeagueDataValue(LEAGUE.years, { roster: 25, coach: 1, rosterCode: 1 })
  };
}
function restoreLeagueDataState(snapshot = null) {
  const next = snapshot && typeof snapshot === 'object' ? snapshot : {};
  LEAGUE.loaded = !!next.loaded;
  LEAGUE.teams = cloneLeagueDataValue(next.teams, {});
  LEAGUE.coaches = cloneLeagueDataValue(next.coaches, []);
  LEAGUE.rookieCatalog = cloneLeagueDataValue(next.rookieCatalog, []);
  LEAGUE.rootHandle = next.rootHandle || null;
  LEAGUE.loadError = next.loadError || null;
  LEAGUE.rookiesBySeason = cloneLeagueDataValue(next.rookiesBySeason, {});
  LEAGUE.namesPool = cloneLeagueDataValue(next.namesPool, []);
  LEAGUE.availableScriptYears = cloneLeagueDataValue(next.availableScriptYears, []);
  LEAGUE.historicalDb = cloneLeagueDataValue(next.historicalDb, { loaded: false, error: null });
  LEAGUE.years = cloneLeagueDataValue(next.years, { roster: 25, coach: 1, rosterCode: 1 });
}
async function buildLeagueReferenceState(startYear = null) {
  const leagueSnapshot = snapshotLeagueDataState();
  const startYearSnapshot = G.startYear;
  const yearSnapshot = G.year;
  try {
    await loadLeagueData({ startYear });
    return snapshotLeagueDataState();
  } finally {
    restoreLeagueDataState(leagueSnapshot);
    G.startYear = startYearSnapshot;
    G.year = yearSnapshot;
  }
}
function normalizePersonToken(v) {
  return String(v || '').toLowerCase().trim().replace(/[·\.\-_'"`\s]/g, '');
}
function repairLeagueTeamsFromReference(referenceState = null) {
  const refTeams = referenceState && typeof referenceState === 'object' ? referenceState.teams : null;
  if (!refTeams || typeof refTeams !== 'object' || !LEAGUE || typeof LEAGUE !== 'object') {
    return { repairedTeams: [], movedPlayers: 0, clonedPlayers: 0, repairedCoaches: 0 };
  }
  const repairedTeams = new Set();
  const donorTeams = new Set();
  let movedPlayers = 0;
  let clonedPlayers = 0;
  let repairedCoaches = 0;
  const playerToken = (player) => normalizePersonToken(player?.name || player?.nameCn || player?.nameEn || player?.altName);
  const coachToken = (coach) => normalizePersonToken(coach?.name);
  const ensureTeam = (teamId, refTeam = null) => {
    const tid = parseNum(teamId, 0);
    if (!tid) return null;
    if (!LEAGUE.teams[tid]) {
      LEAGUE.teams[tid] = {
        meta: cloneLeagueDataValue(refTeam?.meta, toTeamMeta(tid, refTeam?.meta?.z || '')),
        players: [],
        rotation: [],
        coach: null,
        strength: parseNum(refTeam?.strength, getTeamStrength(tid))
      };
    }
    if (!LEAGUE.teams[tid].meta) {
      LEAGUE.teams[tid].meta = cloneLeagueDataValue(refTeam?.meta, toTeamMeta(tid, refTeam?.meta?.z || ''));
    }
    if (!Array.isArray(LEAGUE.teams[tid].players)) LEAGUE.teams[tid].players = [];
    if (!Array.isArray(LEAGUE.teams[tid].rotation)) LEAGUE.teams[tid].rotation = [];
    return LEAGUE.teams[tid];
  };
  const movePlayerFromDonor = (targetId, token) => {
    if (!token) return null;
    for (const [donorIdRaw, donorTeam] of Object.entries(LEAGUE.teams || {})) {
      const donorId = parseNum(donorIdRaw, 0);
      if (!donorTeam || donorId === targetId || !Array.isArray(donorTeam.players)) continue;
      const idx = donorTeam.players.findIndex(candidate => playerToken(candidate) === token);
      if (idx < 0) continue;
      const [player] = donorTeam.players.splice(idx, 1);
      donorTeams.add(donorId);
      return { ...player, teamId: targetId };
    }
    return null;
  };
  const moveCoachFromDonor = (targetId, token) => {
    if (!token) return null;
    for (const [donorIdRaw, donorTeam] of Object.entries(LEAGUE.teams || {})) {
      const donorId = parseNum(donorIdRaw, 0);
      if (!donorTeam || donorId === targetId || !donorTeam.coach) continue;
      if (coachToken(donorTeam.coach) !== token) continue;
      const coach = { ...donorTeam.coach, teamId: targetId };
      donorTeam.coach = null;
      donorTeams.add(donorId);
      return coach;
    }
    return null;
  };

  Object.entries(refTeams).forEach(([teamIdRaw, refTeamRaw]) => {
    const teamId = parseNum(teamIdRaw, 0);
    const refTeam = refTeamRaw && typeof refTeamRaw === 'object' ? refTeamRaw : null;
    if (!teamId || !refTeam) return;
    const liveTeam = ensureTeam(teamId, refTeam);
    if (!liveTeam) return;
    const refPlayers = Array.isArray(refTeam.players) ? refTeam.players : [];
    if (!liveTeam.players.length && refPlayers.length) {
      const rebuiltPlayers = [];
      const seenTokens = new Set();
      refPlayers.forEach(refPlayer => {
        const token = playerToken(refPlayer);
        const dedupeKey = token || `${teamId}_${rebuiltPlayers.length}`;
        if (seenTokens.has(dedupeKey)) return;
        seenTokens.add(dedupeKey);
        let nextPlayer = movePlayerFromDonor(teamId, token);
        if (nextPlayer) {
          movedPlayers += 1;
        } else {
          nextPlayer = { ...refPlayer, teamId };
          clonedPlayers += 1;
        }
        rebuiltPlayers.push(nextPlayer);
      });
      if (rebuiltPlayers.length) {
        liveTeam.players = rebuiltPlayers;
        repairedTeams.add(teamId);
      }
    }
    if (!liveTeam.coach && refTeam.coach) {
      const token = coachToken(refTeam.coach);
      liveTeam.coach = moveCoachFromDonor(teamId, token) || { ...refTeam.coach, teamId };
      repairedCoaches += 1;
      repairedTeams.add(teamId);
    }
  });

  repairedTeams.forEach(teamId => {
    const team = ensureTeam(teamId, refTeams[teamId]);
    if (!team) return;
    team.rotation = typeof toRotation === 'function' ? toRotation(team.players || []) : (team.rotation || []);
    if (typeof calcTeamStrength === 'function') team.strength = calcTeamStrength(team);
  });
  donorTeams.forEach(teamId => {
    const team = LEAGUE.teams[teamId];
    if (!team) return;
    team.rotation = typeof toRotation === 'function' ? toRotation(team.players || []) : (team.rotation || []);
    if (typeof calcTeamStrength === 'function') team.strength = calcTeamStrength(team);
  });

  return {
    repairedTeams: [...repairedTeams].sort((a, b) => a - b),
    movedPlayers,
    clonedPlayers,
    repairedCoaches
  };
}
function getTeam(id) {
  if (!id) return null;
  if (typeof id === 'object' && id.id !== undefined) return id;
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].meta;
  return TEAMS.find(t => t.id === id) || null;
}
function getTeamStrength(id) {
  if (typeof id === 'object' && id.id !== undefined) id = id.id;
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].strength;
  return getTeam(id)?.r || 75;
}
function getTeamRotation(id) {
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].rotation || [];
  return [];
}
function getTeamPlayers(id) {
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].players || [];
  return [];
}
function getTeamCoach(id) {
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].coach;
  return null;
}
function getLeagueCoaches() {
  return LEAGUE.coaches || [];
}
function coachRelationshipKey(coach) {
  if (!coach || typeof coach !== 'object') return '';
  const id = parseNum(coach.id, 0);
  if (id > 0) return `coach_${id}`;
  const normName = String(coach.name || '').trim().toLowerCase().replace(/\s+/g, '_');
  return normName ? `coach_${normName}` : '';
}
function getDefaultCoachFavorability(coach, teamId = null) {
  const trust = clamp(parseNum(G.player?.trust, 50), 0, 100);
  const morale = clamp(parseNum(G.teamMorale, 50), 0, 100);
  const loyalty = clamp(parseNum(coach?.loyalty, 5), 0, 10);
  const currentTeamId = parseNum(teamId, parseNum(coach?.teamId, parseNum(G.teamId, 0)));
  let base = 48 + (trust - 50) * 0.24 + (morale - 50) * 0.10 + (loyalty - 5) * 1.3;
  if (currentTeamId !== parseNum(G.teamId, 0)) base -= 4;
  return clamp(Math.round(base), 28, 78);
}
function ensureCoachRelationshipState() {
  if (!G.coachRelations || typeof G.coachRelations !== 'object') G.coachRelations = { byKey: {} };
  if (!G.coachRelations.byKey || typeof G.coachRelations.byKey !== 'object') G.coachRelations.byKey = {};
  const currentCoach = getTeamCoach(parseNum(G.teamId, 0));
  const key = coachRelationshipKey(currentCoach);
  if (currentCoach && key && !G.coachRelations.byKey[key]) {
    G.coachRelations.byKey[key] = {
      coachId: parseNum(currentCoach.id, 0) || null,
      coachName: String(currentCoach.name || 'Coach'),
      favorability: getDefaultCoachFavorability(currentCoach),
      lastTeamId: parseNum(currentCoach.teamId, parseNum(G.teamId, 0)),
      lastSeason: parseNum(G.season, 1),
      games: 0
    };
  }
  return G.coachRelations;
}
function ensureCoachDynamicsState() {
  if (!G.coachDynamics || typeof G.coachDynamics !== 'object') {
    G.coachDynamics = {
      lastConversationDay: -99,
      lastDailyPromptDay: -99,
      lastRenewalBriefSeason: 0,
      directives: { usageDemandUntilDay: -1, startingDemandUntilDay: -1, buyInUntilDay: -1 }
    };
  }
  if (!G.coachDynamics.directives || typeof G.coachDynamics.directives !== 'object') {
    G.coachDynamics.directives = { usageDemandUntilDay: -1, startingDemandUntilDay: -1, buyInUntilDay: -1 };
  }
  G.coachDynamics.lastConversationDay = parseNum(G.coachDynamics.lastConversationDay, -99);
  G.coachDynamics.lastDailyPromptDay = parseNum(G.coachDynamics.lastDailyPromptDay, -99);
  G.coachDynamics.lastRenewalBriefSeason = parseNum(G.coachDynamics.lastRenewalBriefSeason, 0);
  G.coachDynamics.directives.usageDemandUntilDay = parseNum(G.coachDynamics.directives.usageDemandUntilDay, -1);
  G.coachDynamics.directives.startingDemandUntilDay = parseNum(G.coachDynamics.directives.startingDemandUntilDay, -1);
  G.coachDynamics.directives.buyInUntilDay = parseNum(G.coachDynamics.directives.buyInUntilDay, -1);
  return G.coachDynamics;
}
function ensureCoachRelationEntry(coach, seedValue = null) {
  if (!coach || typeof coach !== 'object') return null;
  const state = ensureCoachRelationshipState();
  const key = coachRelationshipKey(coach);
  if (!key) return null;
  if (!state.byKey[key] || typeof state.byKey[key] !== 'object') {
    state.byKey[key] = {
      coachId: parseNum(coach.id, 0) || null,
      coachName: String(coach.name || 'Coach'),
      favorability: clamp(Math.round(parseNum(seedValue, getDefaultCoachFavorability(coach))), 0, 100),
      lastTeamId: parseNum(coach.teamId, parseNum(G.teamId, 0)),
      lastSeason: parseNum(G.season, 1),
      games: 0
    };
  }
  const entry = state.byKey[key];
  entry.coachId = parseNum(coach.id, entry.coachId || 0) || entry.coachId || null;
  entry.coachName = String(coach.name || entry.coachName || 'Coach');
  entry.lastTeamId = parseNum(coach.teamId, entry.lastTeamId || parseNum(G.teamId, 0));
  entry.lastSeason = parseNum(G.season, entry.lastSeason || 1);
  entry.favorability = clamp(Math.round(parseNum(entry.favorability, getDefaultCoachFavorability(coach, entry.lastTeamId))), 0, 100);
  entry.games = Math.max(0, Math.floor(parseNum(entry.games, 0)));
  return entry;
}
function getCoachFavorability(coach = null) {
  const target = coach || getTeamCoach(parseNum(G.teamId, 0));
  const entry = ensureCoachRelationEntry(target);
  return entry ? clamp(parseNum(entry.favorability, 50), 0, 100) : 50;
}
function setCoachFavorability(coach, value, meta = {}) {
  const entry = ensureCoachRelationEntry(coach, value);
  if (!entry) return 50;
  entry.favorability = clamp(Math.round(parseNum(value, entry.favorability || 50)), 0, 100);
  if (Number.isFinite(parseNum(meta.teamId, NaN))) entry.lastTeamId = parseNum(meta.teamId, entry.lastTeamId);
  if (Number.isFinite(parseNum(meta.season, NaN))) entry.lastSeason = parseNum(meta.season, entry.lastSeason);
  if (Number.isFinite(parseNum(meta.games, NaN))) entry.games = Math.max(0, Math.floor(parseNum(meta.games, entry.games)));
  return entry.favorability;
}
function changeCoachFavorability(coach, delta, meta = {}) {
  const entry = ensureCoachRelationEntry(coach);
  if (!entry) return 50;
  const current = clamp(parseNum(entry.favorability, 50), 0, 100);
  const next = clamp(Math.round(current + parseNum(delta, 0)), 0, 100);
  return setCoachFavorability(coach, next, meta);
}
function getCoachFavorabilityTier(value = 50) {
  const score = clamp(parseNum(value, 50), 0, 100);
  if (score >= 85) return { label: '强绑定', hint: '极大降低休赛期换帅概率' };
  if (score >= 72) return { label: '高度信任', hint: '会明显提升留任倾向' };
  if (score >= 58) return { label: '稳定认可', hint: '基本愿意继续合作' };
  if (score >= 42) return { label: '一般', hint: '仍会优先看战绩和合同' };
  if (score >= 28) return { label: '紧张', hint: '一旦战绩下滑就容易换帅' };
  return { label: '危险', hint: '管理层与教练都可能倾向拆开' };
}
function getCoachPlayerSystemFit(player = null, coach = null) {
  const targetPlayer = player && typeof player === 'object' ? player : G.player;
  const targetCoach = coach || getTeamCoach(parseNum(targetPlayer?.teamId, parseNum(G.teamId, 0))) || null;
  const attrs = (targetPlayer?.attrs && Object.keys(targetPlayer.attrs).length) ? targetPlayer.attrs : parsePlayerAttrs(targetPlayer || {});
  const pos = clamp(parseNum(targetPlayer?.pos, 3), 1, 5);
  const rating = clamp(parseNum(targetPlayer?.rating, ovr(attrs)), 40, 99);
  const shotExt = parseNum(attrs.shotExt, 55);
  const shotInt = parseNum(attrs.shotInt, 55);
  const pass = parseNum(attrs.pass, 55);
  const reb = parseNum(attrs.reb, 55);
  const stl = parseNum(attrs.stl, 55);
  const blk = parseNum(attrs.blk, 55);
  const speed = parseNum(attrs.speed, 55);
  const physique = parseNum(attrs.physique, 55);
  const strength = parseNum(attrs.strength, physique);
  const balanceScore = 100 - Math.min(40, Math.abs(shotExt - shotInt));
  const systemId = String(targetCoach?.systemId || resolveCoachSystemIdByName(targetCoach?.name, targetCoach) || 'balance').trim() || 'balance';
  let raw = 55;
  switch (systemId) {
    case 'defense':
      raw = 10 + ((stl + blk) * 0.28) + reb * 0.16 + physique * 0.12 + rating * 0.12 + (pos >= 3 ? 8 : 4);
      break;
    case 'grit':
      raw = 8 + shotInt * 0.18 + reb * 0.22 + physique * 0.18 + strength * 0.16 + (pos >= 4 ? 10 : 2);
      break;
    case 'pace_space':
      raw = 10 + shotExt * 0.28 + speed * 0.18 + pass * 0.15 + rating * 0.10 + (pos <= 3 ? 10 : 4);
      break;
    case 'perimeter_star':
      raw = 6 + shotExt * 0.28 + pass * 0.22 + speed * 0.12 + rating * 0.12 + (pos <= 3 ? 14 : -2);
      break;
    case 'interior_star':
      raw = 6 + shotInt * 0.28 + reb * 0.22 + physique * 0.12 + strength * 0.14 + (pos >= 4 ? 14 : -4);
      break;
    case 'triangle':
      raw = 8 + pass * 0.24 + shotInt * 0.12 + shotExt * 0.12 + balanceScore * 0.14 + (pos !== 5 ? 6 : 2);
      break;
    case 'seven_seconds':
      raw = 4 + speed * 0.26 + shotExt * 0.18 + pass * 0.16 + physique * 0.08 + (pos <= 3 ? 16 : -4);
      break;
    case 'balance':
    default:
      raw = 10 + rating * 0.18 + pass * 0.12 + reb * 0.08 + balanceScore * 0.18 + (pos <= 3 ? 4 : 6);
      break;
  }
  const fitScore = clamp(Math.round(raw), 18, 96);
  let fitLabel = '错配';
  let fitHint = '这套体系不会优先照顾你的强项。';
  if (fitScore >= 84) {
    fitLabel = '完美适配';
    fitHint = '你的特点就是这位教练最想放大的那一档。';
  } else if (fitScore >= 70) {
    fitLabel = '顺手适配';
    fitHint = '体系会主动给你更多舒服的回合。';
  } else if (fitScore >= 56) {
    fitLabel = '可用适配';
    fitHint = '你能打，但不会吃满体系红利。';
  } else if (fitScore >= 42) {
    fitLabel = '勉强适配';
    fitHint = '你还能上场，但教练会更谨慎分配球权。';
  }
  return { systemId, fitScore, fitLabel, fitHint };
}
function getUserCoachTreatmentProfile(player = null, coach = null) {
  const targetPlayer = player && typeof player === 'object' ? player : G.player;
  const targetCoach = coach || getTeamCoach(parseNum(targetPlayer?.teamId, parseNum(G.teamId, 0))) || null;
  const favorability = getCoachFavorability(targetCoach);
  const favorTier = getCoachFavorabilityTier(favorability);
  const fit = getCoachPlayerSystemFit(targetPlayer, targetCoach);
  const dynamics = ensureCoachDynamicsState();
  const directives = dynamics.directives || {};
  const day = parseNum(G.dayNum, 0);
  const usageDemandActive = parseNum(directives.usageDemandUntilDay, -1) >= day;
  const startingDemandActive = parseNum(directives.startingDemandUntilDay, -1) >= day;
  const buyInActive = parseNum(directives.buyInUntilDay, -1) >= day;
  let effectiveFitScore = fit.fitScore;
  let directiveLeverage = 0;
  let directiveMinuteAdj = 0;
  let directiveRoleAdj = 0;
  let directiveUsageAdj = 0;
  let directiveCreationAdj = 0;
  const directiveLabels = [];
  const directiveHints = [];
  if (usageDemandActive) {
    effectiveFitScore -= 2;
    directiveLeverage -= 3.5;
    directiveUsageAdj += 0.016;
    directiveRoleAdj += 0.6;
    directiveLabels.push('球权施压');
    directiveHints.push('你近期公开抱怨球权，短期会多拿一些回合，但关系也会更紧。');
  }
  if (startingDemandActive) {
    effectiveFitScore -= 4;
    directiveLeverage -= 4.5;
    directiveMinuteAdj += 1;
    directiveRoleAdj += 1.3;
    directiveLabels.push('首发施压');
    directiveHints.push('你要求更大位置，短期有机会抢分钟，但教练不会完全舒服。');
  }
  if (buyInActive) {
    effectiveFitScore += 6;
    directiveLeverage += 4.5;
    directiveUsageAdj -= 0.010;
    directiveCreationAdj += 0.008;
    directiveRoleAdj += 0.8;
    directiveLabels.push('服从体系');
    directiveHints.push('你主动服从体系，球权未必更多，但教练更愿意长期重用你。');
  }
  effectiveFitScore = clamp(effectiveFitScore, 20, 99);
  const leverage = clamp((favorability - 50) * 0.62 + (effectiveFitScore - 50) * 0.48 + directiveLeverage, -42, 42);
  const minuteDelta = clamp(Math.round(leverage / 11) + directiveMinuteAdj, -5, 5);
  const roleScoreBonus = clamp(+((leverage / 7.5 + directiveRoleAdj).toFixed(2)), -6, 6);
  const usageDelta = clamp(+(leverage / 650 + directiveUsageAdj).toFixed(3), -0.075, 0.075);
  const creationDelta = clamp(+(leverage / 900 + directiveCreationAdj).toFixed(3), -0.05, 0.05);
  let label = '正常轮换';
  let summary = '教练会按正常轮换和体系要求使用你。';
  if (leverage >= 22) {
    label = '绝对重用';
    summary = '教练愿意把关键回合、球权和高分钟都压给你。';
  } else if (leverage >= 10) {
    label = '稳定重用';
    summary = '教练会持续给你稳定分钟和较高战术优先级。';
  } else if (leverage <= -20) {
    label = '冷处理';
    summary = '教练会明显压缩你的球权和末节存在感。';
  } else if (leverage <= -8) {
    label = '观望使用';
    summary = '你还能打，但教练更愿意把回合给更适配的球员。';
  }
  if (directiveHints.length) summary = `${summary} ${directiveHints[directiveHints.length - 1]}`.trim();
  return {
    favorability,
    favorTier,
    fitScore: effectiveFitScore,
    fitLabel: fit.fitLabel,
    fitHint: fit.fitHint,
    label,
    summary,
    leverage,
    minuteDelta,
    roleScoreBonus,
    usageDelta,
    creationDelta,
    directives: directiveLabels,
    directiveText: directiveLabels.length ? directiveLabels.join(' / ') : '无额外沟通指令'
  };
}
function syncLeagueCoachList() {
  LEAGUE.coaches = Object.entries(LEAGUE.teams || {})
    .map(([tid, teamObj]) => {
      if (!teamObj?.coach) return null;
      teamObj.coach.teamId = parseNum(tid, parseNum(teamObj.coach.teamId, 0));
      return { ...teamObj.coach, teamMeta: teamObj.meta };
    })
    .filter(Boolean);
  return LEAGUE.coaches;
}

// ============ 队内关系系统 ============
function ensureTeamRelationsState() {
  if (!G.teamRelations || typeof G.teamRelations !== 'object') {
    G.teamRelations = { teammates: {}, chemistry: { overall: 50, offenseSynergy: 50, defenseSynergy: 50, lockerRoomMood: 50, leadershipScore: 0, dramaLevel: 0, lastUpdated: -1 }, events: [], lastPromptDay: -99 };
  }
  if (!G.teamRelations.teammates) G.teamRelations.teammates = {};
  if (!G.teamRelations.chemistry) G.teamRelations.chemistry = { overall: 50, offenseSynergy: 50, defenseSynergy: 50, lockerRoomMood: 50, leadershipScore: 0, dramaLevel: 0, lastUpdated: -1 };
  if (!Array.isArray(G.teamRelations.events)) G.teamRelations.events = [];
  if (!Number.isFinite(Number(G.teamRelations.lastPromptDay))) G.teamRelations.lastPromptDay = -99;
  return G.teamRelations;
}

function teammateRelationKey(player, teamId) {
  const tid = parseNum(teamId || G.teamId, 0);
  const pid = parseNum(player?.id, 0);
  if (!tid || !pid) return '';
  return `${tid}_${pid}`;
}

function ensureTeammateRelation(player, teamId = null) {
  const state = ensureTeamRelationsState();
  const tid = parseNum(teamId || G.teamId, 0);
  const pid = parseNum(player?.id, 0);
  const key = teammateRelationKey(player, tid);
  if (!key || !pid) return null;

  const yearsLeague = parseNum(player?.yearsLeague, 0);
  const isVeteran = yearsLeague >= 5;
  const isRookie = yearsLeague <= 1;

  if (!state.teammates[key] || typeof state.teammates[key] !== 'object') {
    state.teammates[key] = {
      key,
      playerId: pid,
      name: String(player?.name || player?.nameCn || '队友').trim(),
      pos: parseNum(player?.pos, 3),
      rating: parseNum(player?.rating, 75),
      favorability: 50,
      usageSatisfaction: 0,
      bondType: 'neutral',
      veteranEndorsement: 0,
      interactions: 0,
      lastInteractionDay: -1,
      isVeteran,
      isRookie,
      contractYear: false
    };
  }

  const entry = state.teammates[key];
  entry.rating = parseNum(player?.rating, entry.rating);
  entry.isVeteran = yearsLeague >= 5;
  entry.isRookie = yearsLeague <= 1;
  entry.name = String(player?.name || player?.nameCn || entry.name).trim();

  return entry;
}

function findTeamPlayerById(teamId, playerId) {
  const tid = parseNum(teamId || G.teamId, 0);
  const pid = parseNum(playerId, 0);
  if (!tid || !pid) return null;
  return (getTeamPlayers(tid) || []).find(p => parseNum(p?.id, 0) === pid) || null;
}

function resolveTeammateRelationPlayer(playerOrId, teamId = null) {
  if (playerOrId && typeof playerOrId === 'object') {
    const resolvedId = parseNum(playerOrId?.id, 0);
    if (!resolvedId) return null;
    const livePlayer = findTeamPlayerById(teamId, resolvedId);
    return livePlayer ? { ...livePlayer, ...playerOrId } : playerOrId;
  }
  return findTeamPlayerById(teamId, playerOrId) || { id: parseNum(playerOrId, 0) };
}

function getTeammateRelationEntry(playerId, teamId = null) {
  const tid = parseNum(teamId || G.teamId, 0);
  const pid = parseNum(playerId, 0);
  if (!tid || !pid) return null;
  return ensureTeamRelationsState().teammates?.[`${tid}_${pid}`] || null;
}

function getTeammateFavorability(playerId, teamId = null) {
  const tid = parseNum(teamId || G.teamId, 0);
  const pid = parseNum(playerId, 0);
  const key = `${tid}_${pid}`;
  const entry = G.teamRelations?.teammates?.[key];
  return entry ? clamp(parseNum(entry.favorability, 50), 0, 100) : 50;
}

function setTeammateFavorability(playerId, value, teamId = null) {
  const entry = ensureTeammateRelation(resolveTeammateRelationPlayer(playerId, teamId), teamId);
  if (!entry) return 50;
  entry.favorability = clamp(Math.round(parseNum(value, 50)), 0, 100);
  recalculateTeamChemistry();
  return entry.favorability;
}

function changeTeammateFavorability(playerId, delta, teamId = null, source = '') {
  const entry = ensureTeammateRelation(resolveTeammateRelationPlayer(playerId, teamId), teamId);
  if (!entry) return 50;
  const old = parseNum(entry.favorability, 50);
  const next = clamp(Math.round(old + parseNum(delta, 0)), 0, 100);
  entry.favorability = next;
  entry.interactions = (entry.interactions || 0) + 1;
  entry.lastInteractionDay = parseNum(G.dayNum, 0);
  if (source) entry.lastSource = String(source).trim();
  recalculateTeamChemistry();
  return next;
}

function setTeammateUsageSatisfaction(playerId, value, teamId = null) {
  const entry = ensureTeammateRelation(resolveTeammateRelationPlayer(playerId, teamId), teamId);
  if (!entry) return 0;
  entry.usageSatisfaction = clamp(Math.round(parseNum(value, 0)), -40, 40);
  recalculateTeamChemistry();
  return entry.usageSatisfaction;
}

function changeTeammateUsageSatisfaction(playerId, delta, teamId = null, source = '') {
  const entry = ensureTeammateRelation(resolveTeammateRelationPlayer(playerId, teamId), teamId);
  if (!entry) return 0;
  const old = parseNum(entry.usageSatisfaction, 0);
  const next = clamp(Math.round(old + parseNum(delta, 0)), -40, 40);
  entry.usageSatisfaction = next;
  entry.interactions = (entry.interactions || 0) + 1;
  entry.lastInteractionDay = parseNum(G.dayNum, 0);
  if (source) entry.lastSource = String(source).trim();
  recalculateTeamChemistry();
  return next;
}

function pushTeamRelationEvent(evt = {}) {
  const state = ensureTeamRelationsState();
  const player = resolveTeammateRelationPlayer(evt.player || evt.playerId, evt.teamId);
  const playerId = parseNum(evt.playerId ?? player?.id, 0);
  const playerName = String(evt.playerName || player?.name || player?.nameCn || '').trim();
  const favorDelta = Math.round(parseNum(evt.favorDelta, 0));
  const usageDelta = Math.round(parseNum(evt.usageDelta, 0));
  const veteranDelta = Math.round(parseNum(evt.veteranDelta, 0));
  const detail = String(evt.detail || '').trim();
  const item = {
    day: parseNum(evt.day, G.dayNum),
    teamId: parseNum(evt.teamId || G.teamId, 0),
    playerId,
    playerName,
    title: String(evt.title || '更衣室动态').trim(),
    detail,
    type: String(evt.type || (favorDelta + usageDelta + veteranDelta >= 0 ? 'pos' : 'neg')).trim(),
    favorDelta,
    usageDelta,
    veteranDelta,
    source: String(evt.source || '').trim(),
    ts: Date.now()
  };
  state.events.unshift(item);
  if (state.events.length > 24) state.events.length = 24;
  return item;
}

function getRecentTeamRelationEvents(limit = 5, teamId = null) {
  const tid = parseNum(teamId || G.teamId, 0);
  return (ensureTeamRelationsState().events || [])
    .filter(evt => !tid || parseNum(evt?.teamId, 0) === tid)
    .slice(0, Math.max(1, parseNum(limit, 5)));
}

function getTeammateAttitudeLabel(favorability, usageSatisfaction = 0) {
  const favor = clamp(parseNum(favorability, 50), 0, 100);
  const usage = parseNum(usageSatisfaction, 0);
  if (favor >= 80 && usage >= 0) return { label: '铁哥们', icon: '🤝', hint: '愿意为你做挡拆、传球，更衣室里站你这边' };
  if (favor >= 65) return { label: '关系不错', icon: '👍', hint: '场上场下都配合得来' };
  if (favor >= 45) return { label: '一般队友', icon: '😐', hint: '正常职业关系' };
  if (usage < -20) return { label: '球权积怨', icon: '😤', hint: '觉得你太独，可能影响传球' };
  if (favor < 30) return { label: '更衣室矛盾', icon: '⚠️', hint: '关系紧张，可能影响化学反应' };
  return { label: '微妙', icon: '🤨', hint: '有点不太对劲' };
}

function recalculateTeamChemistry() {
  const state = ensureTeamRelationsState();
  const teammates = Object.values(state.teammates);
  if (teammates.length === 0) {
    state.chemistry = { overall: 50, offenseSynergy: 50, defenseSynergy: 50, lockerRoomMood: 50, leadershipScore: 0, dramaLevel: 0, lastUpdated: parseNum(G.dayNum, 0) };
    return state.chemistry;
  }

  const avgFavor = teammates.reduce((sum, t) => sum + parseNum(t.favorability, 50), 0) / teammates.length;
  const usageVariance = teammates.reduce((sum, t) => sum + Math.abs(parseNum(t.usageSatisfaction, 0)), 0) / teammates.length;
  const veteranSupport = teammates.filter(t => t.isVeteran).reduce((sum, t) => sum + parseNum(t.veteranEndorsement, 0), 0);
  const lockerRoomMood = clamp(avgFavor - usageVariance * 0.5 + veteranSupport * 0.3, 0, 100);
  const overall = clamp(avgFavor * 0.6 + lockerRoomMood * 0.4, 0, 100);
  const dramaLevel = clamp(Math.floor(teammates.filter(t => parseNum(t.favorability, 50) < 35 || parseNum(t.usageSatisfaction, 0) < -25).length), 0, 5);

  state.chemistry = {
    overall,
    offenseSynergy: clamp(overall + (parseNum(G.seasonStats?.wins, 0) > parseNum(G.seasonStats?.losses, 0) ? 5 : -5), 0, 100),
    defenseSynergy: clamp(overall - dramaLevel * 3, 0, 100),
    lockerRoomMood,
    leadershipScore: clamp(veteranSupport, -20, 20),
    dramaLevel,
    lastUpdated: parseNum(G.dayNum, 0)
  };

  return state.chemistry;
}

function initTeamRelationsForCurrentTeam() {
  const state = ensureTeamRelationsState();
  const players = getTeamPlayers(parseNum(G.teamId, 0)) || [];
  players.forEach(p => {
    if (String(p.id) === String(G.player?.id)) return;
    ensureTeammateRelation(p, G.teamId);
  });
  recalculateTeamChemistry();
  return state;
}

function getRookieCatalog() {
  return LEAGUE.rookieCatalog || [];
}
function rookieDraftYear(p) {
  const y1 = parseNum(p?.yearsLeague, 0);
  if (y1 >= 1900 && y1 <= 2100) return y1;
  const d = parseNum(p?.draft, 0);
  if (d >= 190000) return Math.floor(d / 100);
  return 0;
}
function detachCurrentDraftClassFromLeague(startYear) {
  const targetYear = clamp(parseNum(startYear, parseNum(G.startYear, G.year || 2025)), 1947, 2100);
  if (targetYear < 1947) return [];
  if (!Array.isArray(LEAGUE.rookieCatalog)) LEAGUE.rookieCatalog = [];
  const catalogKeys = new Set(LEAGUE.rookieCatalog.map(playerIdentityKey).filter(Boolean));
  const stripped = [];
  Object.values(LEAGUE.teams || {}).forEach(team => {
    const kept = [];
    (team.players || []).forEach(player => {
      const draftYear = rookieDraftYear(player);
      const draftPick = parseNum(player?.draftPick, 0) || parseDraftPickValue(player?.draft);
      const isCurrentDraftPick = draftYear === targetYear && draftPick > 0 && parseNum(player?.yearsLeague, 0) <= 0;
      if (!isCurrentDraftPick) {
        kept.push(player);
        return;
      }
      const draftPoolPlayer = {
        ...player,
        teamId: 0,
        rookie: true,
        yearsLeague: 0,
        injury: { active: false, games: 0, type: "" }
      };
      stripped.push(draftPoolPlayer);
      const key = playerIdentityKey(draftPoolPlayer);
      if (key && !catalogKeys.has(key)) {
        LEAGUE.rookieCatalog.push(draftPoolPlayer);
        catalogKeys.add(key);
      }
    });
    team.players = kept;
  });
  return stripped;
}
function resolveRosterScriptStartYear(rosterCode) {
  const code = parseNum(rosterCode, 0);
  if (code >= 1900 && code <= 2100) return code;
  return APK_ROSTER_INDEX_TO_START_YEAR[code] || 0;
}
function hasCjkText(v) {
  return /[\u3400-\u9fff]/.test(String(v || ''));
}
function cleanText(v) {
  return String(v || '').trim();
}
function cleanSocialText(v) {
  return String(v || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
// 英文名音译为中文名的映射表
const EN_TO_CN_SYLLABLE = {
  'le': '勒', 'la': '拉', 'li': '利', 'lo': '洛', 'lu': '卢', 'ly': '利',
  'ba': '巴', 'be': '贝', 'bi': '比', 'bo': '博', 'bu': '布', 'by': '拜',
  'ca': '卡', 'ce': '塞', 'ci': '西', 'co': '科', 'cu': '库', 'cy': '赛',
  'da': '达', 'de': '德', 'di': '迪', 'do': '多', 'du': '杜', 'dy': '戴',
  'fa': '法', 'fe': '费', 'fi': '菲', 'fo': '福', 'fu': '富',
  'ga': '加', 'ge': '格', 'gi': '吉', 'go': '戈', 'gu': '古',
  'ha': '哈', 'he': '赫', 'hi': '希', 'ho': '霍', 'hu': '胡',
  'ja': '贾', 'je': '杰', 'ji': '吉', 'jo': '乔', 'ju': '朱',
  'ka': '卡', 'ke': '克', 'ki': '基', 'ko': '科', 'ku': '库',
  'ma': '马', 'me': '梅', 'mi': '米', 'mo': '莫', 'mu': '穆',
  'na': '纳', 'ne': '内', 'ni': '尼', 'no': '诺', 'nu': '努',
  'pa': '帕', 'pe': '佩', 'pi': '皮', 'po': '波', 'pu': '普',
  'ra': '拉', 're': '雷', 'ri': '里', 'ro': '罗', 'ru': '鲁',
  'sa': '萨', 'se': '塞', 'si': '西', 'so': '索', 'su': '苏',
  'ta': '塔', 'te': '特', 'ti': '蒂', 'to': '托', 'tu': '图',
  'va': '瓦', 've': '维', 'vi': '维', 'vo': '沃', 'vu': '武',
  'wa': '瓦', 'we': '韦', 'wi': '威', 'wo': '沃', 'wu': '伍',
  'xa': '哈', 'xe': '泽', 'xi': '希',
  'ya': '亚', 'ye': '耶', 'yi': '伊', 'yo': '约', 'yu': '尤',
  'za': '扎', 'ze': '泽', 'zi': '齐', 'zo': '佐', 'zu': '祖',
  'cha': '查', 'che': '切', 'chi': '奇', 'cho': '乔', 'chu': '丘',
  'sha': '沙', 'she': '谢', 'shi': '希', 'sho': '肖', 'shu': '舒',
  'tha': '萨', 'the': '瑟', 'thi': '西', 'tho': '索', 'thu': '瑟',
  'wha': '瓦', 'whe': '惠', 'whi': '惠', 'who': '胡',
  'ph': '夫', 'th': '斯', 'sh': '什', 'ch': '奇', 'ck': '克',
  'an': '安', 'en': '恩', 'in': '因', 'on': '翁', 'un': '恩',
  'al': '阿尔', 'el': '埃尔', 'il': '伊尔', 'ol': '奥尔', 'ul': '乌尔',
  'ar': '阿', 'er': '尔', 'ir': '尔', 'or': '奥', 'ur': '尔',
  'ey': '伊', 'ay': '艾', 'oy': '奥伊', 'ow': '奥',
  'ton': '顿', 'son': '森', 'man': '曼', 'ner': '纳', 'ler': '勒',
  'ber': '伯', 'ter': '特', 'den': '登', 'ven': '文', 'ren': '伦',
  'kin': '金', 'lin': '林', 'win': '温', 'don': '顿', 'ron': '伦',
  'ian': '伊安', 'ean': '恩', 'ard': '阿德', 'ell': '埃尔',
  'ght': '特', 'tion': '申', 'sion': '申',
  'a': '阿', 'b': '布', 'c': '克', 'd': '德', 'e': '', 'f': '夫',
  'g': '格', 'h': '赫', 'i': '伊', 'j': '杰', 'k': '克', 'l': '尔',
  'm': '姆', 'n': '恩', 'o': '奥', 'p': '普', 'q': '奎', 'r': '尔',
  's': '斯', 't': '特', 'u': '乌', 'v': '夫', 'w': '', 'x': '克斯',
  'y': '伊', 'z': '兹'
};
function transliterateToChineseName(enName) {
  if (!enName) return '新秀球员';
  const parts = enName.trim().split(/\s+/);
  const result = parts.map(part => {
    let s = part.toLowerCase().replace(/[^a-z]/g, '');
    if (!s) return '';
    let out = '';
    let i = 0;
    while (i < s.length) {
      let matched = false;
      for (let len = Math.min(4, s.length - i); len >= 1; len--) {
        const sub = s.substring(i, i + len);
        if (EN_TO_CN_SYLLABLE[sub] !== undefined) {
          out += EN_TO_CN_SYLLABLE[sub];
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) { out += EN_TO_CN_SYLLABLE[s[i]] || ''; i++; }
    }
    return out;
  });
  return result.filter(Boolean).join('·') || '新秀球员';
}
function resolveRookieDisplayName(nameCn, nameEn, fallback = '') {
  const cn = cleanText(nameCn);
  const en = cleanText(nameEn);
  // 优先使用中文名
  if (cn && !/[�]/.test(cn) && hasCjkText(cn)) return cn;
  // 英文名尝试音译为中文
  if (en && !/[�]/.test(en)) return transliterateToChineseName(en);
  if (cn && !/[�]/.test(cn)) return cn;
  return fallback || '新秀球员';
}
function getAvailableDraftYears() {
  const historicalYears = historicalDraftYears();
  if (historicalYears.length) return historicalYears;
  // 历史库不可用时，回退到名单年份映射。
  const years = [...APK_NBA_START_YEARS].filter(y => y >= 1946 && y <= 2100).sort((a, b) => a - b);
  if (years.length) return years;
  const y = clamp(parseNum(G.startYear, G.year || 2025), 1947, 2100);
  return [y];
}
function resolveDraftScriptYear(targetYear) {
  const years = getAvailableDraftYears();
  if (!years.length) return clamp(parseNum(targetYear, G.year || 2025), 1947, 2100);
  const y = parseNum(targetYear, years[years.length - 1]);
  if (years.includes(y)) return y;
  if (y < years[0]) return years[0];
  if (y > years[years.length - 1]) return years[years.length - 1];
  return years.reduce((best, cur) => Math.abs(cur - y) < Math.abs(best - y) ? cur : best, years[0]);
}
function getAvailableScriptYears() {
  const draftYears = getAvailableDraftYears();
  const startYears = APK_NBA_START_YEARS.filter(y => {
    if (y === 1946) return draftYears.includes(1947) || draftYears[0] <= 1947;
    return draftYears.includes(y);
  });
  if (startYears.length) return startYears;
  const fallback = resolveRosterScriptStartYear(LEAGUE.years?.roster) || parseNum(G.startYear, G.year || 2025);
  return [fallback];
}
function potential99ToApkTier(potential99) {
  const p = clamp(parseNum(potential99, 75), 50, 99);
  return clamp(Math.round((p - 50) / 4.9) + 1, 1, 11);
}
function getPlayerRawSkillByNum(player, skillNum) {
  const attrs = player?.attrs || {};
  const tend = player?.tendencies || {};
  if (skillNum === 1) return parseNum(attrs.physique, 55);
  if (skillNum === 2) return parseNum(attrs.blk, 55);
  if (skillNum === 3) return parseNum(attrs.stl, 55);
  if (skillNum === 4) return parseNum(attrs.reb, 55);
  if (skillNum === 5) return parseNum(attrs.pass, 55);
  if (skillNum === 6) return parseNum(attrs.shotInt, 55);
  if (skillNum === 7) return parseNum(attrs.shotExt, 55);
  if (skillNum === 8) return parseNum(attrs.shotFree, 55);
  if (skillNum === 9) return parseNum(tend.in, 70);
  if (skillNum === 10) return parseNum(tend.ex, 70);
  if (skillNum === 11) return parseNum(tend.fr, 70);
  return 50;
}
function attrKeyToSkillNum(key) {
  if (key === 'physique') return 1;
  if (key === 'blk') return 2;
  if (key === 'stl') return 3;
  if (key === 'reb') return 4;
  if (key === 'pass') return 5;
  if (key === 'shotInt') return 6;
  if (key === 'shotExt') return 7;
  if (key === 'shotFree') return 8;
  return 0;
}
function getCoachSkillValue(coach, skillNum) {
  if (!coach) {
    return skillNum > 2 ? 40 : -2;
  }
  if (skillNum === 1) return clamp(parseNum(coach.techDev, 0), -2, 3);
  if (skillNum === 2) return clamp(parseNum(coach.techLevel, 0), -2, 3);
  if (skillNum === 3) return clamp(parseNum(coach.currentShotIntPercent, coach.baseShotIntPercent), 35, 45);
  if (skillNum === 4) return clamp(parseNum(coach.currentShotTriplePercent, coach.baseShotTriplePercent), 35, 45);
  if (skillNum === 5) return clamp(parseNum(coach.currentOffensive, coach.baseOffensive), 35, 45);
  if (skillNum === 6) return clamp(parseNum(coach.currentDefense, coach.baseDefense), 35, 45);
  if (skillNum === 7) return clamp(parseNum(coach.baseShotIntPercent, 40), 35, 45);
  if (skillNum === 8) return clamp(parseNum(coach.baseShotTriplePercent, 40), 35, 45);
  if (skillNum === 9) return clamp(parseNum(coach.baseOffensive, 40), 35, 45);
  if (skillNum === 10) return clamp(parseNum(coach.baseDefense, 40), 35, 45);
  return skillNum > 2 ? 40 : -2;
}
function getSimEnergyValue(player) {
  const stamina = clamp(parseNum(player?.stamina, 78), 10, 100);
  return stamina;
}
function getPlayerModifierPosition(player, lineupPos) {
  const lp = clamp(parseNum(lineupPos, parseNum(player?.pos, 3)), 1, 5);
  const p1 = parseNum(player?.pos, 3);
  const p2 = parseNum(player?.pos2, 0);
  if (lp === p1 || lp === p2) return 0;
  return -7;
}
function getPlayerSkillCoachAddition(player, skillNum, { teamId = 0 } = {}) {
  const actualSkill = clamp(parseNum(getPlayerRawSkillByNum(player, skillNum), 55), 25, 99);
  const coach = getTeamCoach(teamId || parseNum(player?.teamId, 0));
  const coachOff = getCoachSkillValue(coach, 5);
  const coachDef = getCoachSkillValue(coach, 6);
  if (skillNum > 4) {
    if (skillNum >= 9 || skillNum <= 5) return actualSkill;
    return clamp(Math.round((actualSkill * (coachOff + 160)) / 200), 25, 99);
  }
  const coachSkill = actualSkill * (140 - coachOff);
  if (skillNum === 2) {
    return clamp(Math.round((coachSkill * (coachDef + 60)) / 10000), 15, 99);
  }
  if (skillNum === 3) {
    return clamp(Math.round((coachSkill * (140 - coachDef)) / 10000), 15, 99);
  }
  return clamp(Math.round(coachSkill / 100), 15, 99);
}
function getPlayerMatchSkillWithEnergy(player, skillNum, { teamId = 0, lineupPos = 0 } = {}) {
  const base = getPlayerSkillCoachAddition(player, skillNum, { teamId });
  const energy = getSimEnergyValue(player);
  const modifierEnergy = Math.round(((120 - energy) * (-1)) / 8);
  const modifierPos = getPlayerModifierPosition(player, lineupPos || parseNum(player?.pos, 3));

  // Speed Bonus: 速度略微增强进攻(6,7)和防守(2,3)属性
  // 10% of (Speed - 50)
  let speedBonus = 0;
  if ([2, 3, 6, 7].includes(skillNum)) {
    const speed = parseNum(player?.attrs?.speed, 55);
    speedBonus = Math.max(0, Math.round((speed - 50) * 0.1));
  }

  return clamp(base + (modifierEnergy * 2) + modifierPos + speedBonus, 10, 99);
}
function getOpponentDefenseForSkill(player, opponent, skillNum, { playerTeamId = 0, opponentTeamId = 0, lineupPos = 0 } = {}) {
  let blockInf = 5;
  let stealInf = 6;
  if (skillNum === 6 || skillNum === 9) {
    blockInf = 7;
    stealInf = 3;
  } else if (skillNum === 8 || skillNum === 11) {
    blockInf = 5;
    stealInf = 4;
  }
  const oppBlock = getPlayerMatchSkillWithEnergy(opponent, 2, { teamId: opponentTeamId, lineupPos: parseNum(opponent?.pos, 3) });
  const oppSteal = getPlayerMatchSkillWithEnergy(opponent, 3, { teamId: opponentTeamId, lineupPos: parseNum(opponent?.pos, 3) });
  const defense = ((oppBlock * blockInf) + (oppSteal * stealInf)) / 10 + 10;
  const own = getPlayerMatchSkillWithEnergy(player, skillNum, { teamId: playerTeamId, lineupPos });
  const twice = own * 2;
  const val = twice - defense;
  return Math.round(Math.min(val, twice / 2));
}
function getPlayerShotPercentByType(player, opponent, type, { playerTeamId = 0, opponentTeamId = 0, lineupPos = 0, minutes = 30 } = {}) {
  const lp = clamp(parseNum(lineupPos, parseNum(player?.pos, 3)), 1, 5);
  if (type === 'do') {
    // 使用内线(6)与三分(7)属性的加权平均值替代原本错误的罚球(8)加成
    const skill6 = getOpponentDefenseForSkill(player, opponent, 6, { playerTeamId, opponentTeamId, lineupPos: lp });
    const skill7 = getOpponentDefenseForSkill(player, opponent, 7, { playerTeamId, opponentTeamId, lineupPos: lp });
    let shotSkillNum = Math.round((skill6 * 0.4 + skill7 * 0.6)) - 55;
    if (shotSkillNum < 0) shotSkillNum = 0;
    let base = ((shotSkillNum * 56) / 100) + 30;
    if (parseNum(minutes, 0) > 41) base = (base * 9) / 10;
    return clamp(Math.round(base), 32, 60);
  }
  if (type === 'ex') {
    let shotSkillNum = getOpponentDefenseForSkill(player, opponent, 7, { playerTeamId, opponentTeamId, lineupPos: lp }) - 55;
    if (shotSkillNum < 0) shotSkillNum = 0;
    let base = ((shotSkillNum * 4) / 10) + 28;
    if (parseNum(minutes, 0) > 41) base = (base * 9) / 10;
    return clamp(Math.round(base), 22, 48);
  }
  if (type === 'fr') {
    const shotExSkill = getPlayerMatchSkillWithEnergy(player, 7, { teamId: playerTeamId, lineupPos: lp }) * 6;
    const shotFrSkill = getPlayerMatchSkillWithEnergy(player, 8, { teamId: playerTeamId, lineupPos: lp }) * 5;
    const shotSkillAll = (shotExSkill + shotFrSkill) / 10;
    let about = ((shotSkillAll + 10) - lp) - 55;
    if (about < 0) about = 0;
    let base = ((about * 9) / 10) + 50;
    if (parseNum(minutes, 0) > 41) base = (base * 9) / 10;
    return clamp(Math.round(base), 40, 95);
  }
  let shotSkillNum = getOpponentDefenseForSkill(player, opponent, 6, { playerTeamId, opponentTeamId, lineupPos: lp }) - 5;
  let about = (shotSkillNum + lp) - 55;
  if (about < 0) about = 0;
  let base = ((about * 8) / 10) + 40;
  if (parseNum(minutes, 0) > 41) base = (base * 9) / 10;
  return clamp(Math.round(base), 40, 80);
}
function getApkPlayerDevelopmentValue(player, coach) {
  const rating = parseNum(player?.rating, ovr(player?.attrs || {}));
  const age = parseNum(player?.age, 24);
  const potTier = potential99ToApkTier(parseNum(player?.potential, 75));
  if (age <= 33) {
    let value = ((rating - 36) * 2) + ((age - 10) * 8) - (potTier * 2);
    value += getCoachSkillValue(coach, 1) * (-12);
    if (rating >= 90) value += value;
    else if (rating >= 85) value += Math.round(value / 2);
    return value;
  }
  let value = rating + ((46 - age) * 8) + (potTier * 2);
  if (rating >= 90) value -= Math.round(value / 2);
  else if (rating >= 85) value -= Math.round(value / 3);
  return value;
}
function getApkNpcYearDelta(player, coach) {
  const rating = parseNum(player?.rating, 70);
  const age = parseNum(player?.age, 24);
  const potential = clamp(parseNum(player?.potential, 75), 55, 99);
  const potGap = potential - rating; // 潜力差距

  // ── 已达到或超过潜力天花板：只做老化 ──
  if (potGap <= 0) {
    // 最高潜力(≥95)：老化极慢——可以打到很晚
    if (potential >= 95) {
      if (age >= 39) return rng(-3, -1);
      if (age >= 37) return rng(-2, 0);
      if (age >= 34) return rng(-1, 0);
      return 0;
    }
    // 高潜力(≥88)：老化较慢
    if (potential >= 88) {
      if (age >= 37) return rng(-4, -1);
      if (age >= 34) return rng(-2, 0);
      if (age >= 31) return rng(-1, 0);
      return 0;
    }
    // 中等潜力(≥80)
    if (potential >= 80) {
      if (age >= 36) return rng(-4, -1);
      if (age >= 33) return rng(-2, 0);
      if (age >= 30) return rng(-1, 0);
      return 0;
    }
    // 低潜力：正常老化
    if (age >= 34) return rng(-5, -1);
    if (age >= 31) return rng(-3, 0);
    if (age >= 29) return rng(-1, 0);
    return 0;
  }

  // ── 未达到潜力天花板：成长期 ──
  let delta = 0;

  if (age <= 26) {
    // 黄金成长期
    if (potential >= 95 && potGap >= 10) {
      delta = rng(7, 10);
    } else if (potential >= 95) {
      delta = rng(5, 7);
    } else if (potential >= 88) {
      delta = rng(3, 5);
    } else if (potential >= 80) {
      delta = rng(1, 3);
    } else {
      delta = rng(0, 2);
    }
  } else if (age <= 30) {
    // 巅峰期：成长放缓
    if (potential >= 95 && potGap >= 5) {
      delta = rng(3, 5);
    } else if (potential >= 88) {
      delta = rng(1, 3);
    } else if (potential >= 80) {
      delta = rng(0, 2);
    } else {
      delta = rng(0, 1);
    }
  } else if (age <= 34) {
    // 30+仍有潜力空间：最高潜力可继续微涨
    if (potential >= 95 && potGap >= 3) {
      delta = rng(1, 3);
    } else if (potGap >= 5) {
      delta = rng(0, 2);
    } else {
      delta = rng(-1, 1);
    }
  } else {
    // 34+衰退期，但最高潜力衰退很慢
    if (potential >= 95) delta = rng(-1, 1);
    else delta = rng(-3, 0);
  }

  // 确保不超过潜力天花板
  delta = Math.min(delta, potGap);
  return clamp(delta, -6, 10);
}
function applyOvrDeltaToAttrs(attrs, delta = 0, potential = 99, age = 24) {
  if (!attrs || typeof attrs !== 'object') return attrs;
  const change = Math.trunc(parseNum(delta, 0));
  if (!change) return attrs;

  const keys = Object.keys(attrs).filter(k => Number.isFinite(parseNum(attrs[k], NaN)));
  if (!keys.length) return attrs;

  const startOvr = ovr(attrs);
  const cap = clamp(parseNum(potential, 99), 25, 99);
  const targetOvr = change > 0 ? Math.min(startOvr + Math.abs(change), cap) : Math.max(25, startOvr - Math.abs(change));

  const growthPriority = age <= 26
    ? ['shotExt', 'shotInt', 'pass', 'speed', 'reb', 'blk', 'stl', 'strength', 'physique']
    : age <= 30
      ? ['shotExt', 'shotInt', 'pass', 'reb', 'stl', 'blk', 'speed', 'strength', 'physique']
      : ['shotExt', 'shotInt', 'pass', 'reb', 'stl', 'blk', 'strength', 'speed', 'physique'];
  const declinePriority = age >= 34
    ? ['speed', 'physique', 'strength', 'shotExt', 'shotInt', 'pass', 'reb', 'stl', 'blk']
    : ['speed', 'physique', 'strength', 'shotExt', 'shotInt', 'pass', 'reb', 'stl', 'blk'];

  const pickKey = (ordered, wantsRaise) => {
    const orderedKeys = ordered.filter(k => keys.includes(k));
    const available = orderedKeys.filter(k => wantsRaise ? parseNum(attrs[k], 0) < 99 : parseNum(attrs[k], 0) > 25);
    if (available.length) return available[0];
    const sorted = keys.slice().sort((a, b) => wantsRaise
      ? parseNum(attrs[a], 0) - parseNum(attrs[b], 0)
      : parseNum(attrs[b], 0) - parseNum(attrs[a], 0));
    return sorted.find(k => wantsRaise ? parseNum(attrs[k], 0) < 99 : parseNum(attrs[k], 0) > 25) || null;
  };

  let guard = 0;
  while (guard++ < 600) {
    const curOvr = ovr(attrs);
    if (change > 0 && curOvr >= targetOvr) break;
    if (change < 0 && curOvr <= targetOvr) break;

    const wantsRaise = change > 0;
    const key = pickKey(wantsRaise ? growthPriority : declinePriority, wantsRaise);
    if (!key) break;

    const current = parseNum(attrs[key], 0);
    const step = wantsRaise ? (curOvr < targetOvr - 3 ? 2 : 1) : (curOvr > targetOvr + 3 ? 2 : 1);
    const next = wantsRaise ? clamp(current + step, 20, 99) : clamp(current - step, 20, 99);
    if (next === current) break;
    attrs[key] = next;
  }

  return attrs;
}

function applyNpcSeasonDevelopment(player, coach) {
  const attrs = player.attrs && Object.keys(player.attrs).length ? { ...player.attrs } : parsePlayerAttrs(player);
  const potential = clamp(parseNum(player.potential, 75), 50, 99);
  const currentOvr = ovr(attrs);
  const delta = getApkNpcYearDelta(player, coach);
  // 确保成长后不超过潜力天花板
  const cappedDelta = currentOvr + delta > potential && delta > 0 ? Math.max(0, potential - currentOvr) : delta;
  applyOvrDeltaToAttrs(attrs, cappedDelta, potential, parseNum(player.age, 24));
  player.attrs = attrs;
  player.rating = ovr(attrs);
  player.att = calcPlayerAtt(attrs);
  player.def = calcPlayerDef(attrs);
  player.age = parseNum(player.age, 24) + 1;
  player.yearsLeague = Math.max(0, parseNum(player.yearsLeague, 0) + 1);
  player.rookie = false;
  // Contract year decrement
  if (player.contract && typeof player.contract === 'object') {
    player.contract.years = Math.max(0, parseNum(player.contract.years, 1) - 1);
  }
}
// 全年分散成长：每轮比赛有概率触发NPC属性微调（替代赛季末一次性成长）
function applyNpcIncrementalGrowth(player, coach) {
  // 每轮比赛约 1/20 概率触发一次属性变化
  if (Math.random() > 0.05) return;
  const potential = clamp(parseNum(player?.potential, 75), 50, 99);
  const currentOvr = parseNum(player?.rating, ovr(player?.attrs || {}));
  const yearDelta = getApkNpcYearDelta(player, coach);
  // 方向与全年趋势一致
  const direction = yearDelta >= 0 ? 1 : -1;
  // 潜力天花板检查：正向成长时总评不得超过潜力
  if (direction > 0 && currentOvr >= potential) return;
  const attrs = player.attrs && Object.keys(player.attrs).length ? { ...player.attrs } : parsePlayerAttrs(player);
  const attrKeys = Object.keys(attrs).filter(k => typeof attrs[k] === 'number');
  if (!attrKeys.length) return;
  const key = attrKeys[rng(0, attrKeys.length - 1)];
  attrs[key] = clamp(attrs[key] + direction, 25, 99);
  player.attrs = attrs;
  player.rating = ovr(attrs);
  player.att = calcPlayerAtt(attrs);
  player.def = calcPlayerDef(attrs);
  player._seasonDevApplied = true;
}
function ageUserOneYear() {
  G.player.age = parseNum(G.player.age, 19) + 1;
  G.player.stamina = 100;
  G.player.maxStamina = 100;
  // Age 33+ stamina cap decrease
  const age = parseNum(G.player.age, 20);
  if (age >= 36) G.player.maxStamina = Math.max(70, (G.player.maxStamina || 100) - 5);
  else if (age >= 34) G.player.maxStamina = Math.max(78, (G.player.maxStamina || 100) - 3);
  else if (age >= 33) G.player.maxStamina = Math.max(85, (G.player.maxStamina || 100) - 2);
}
function teamLogoMarkup(team, size = 50) {
  if (!team) return '';
  const src = team.logo || getTeamLogoPath(team.id, team.a || '');
  const fb = team.logoFallback || getTeamAltLogoPath(team.id);
  return `<img src="${src}" data-fallback="${fb}" alt="${team.a}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback='';}else{this.style.display='none';this.parentNode.textContent='${team.a || '??'}';this.parentNode.style.background='${team.cl || '#2d5ab8'}';}">`;
}
function nameKey(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '') }
function playerIdentityKey(player) {
  const en = nameKey(player?.nameEn || player?.altName || '');
  if (en) return `en:${en}`;
  const n1 = nameKey(player?.name || player?.nameCn || '');
  if (n1) return `nm:${n1}`;
  const image = clamp(parseNum(player?.image, 0), 0, 9999);
  if (image > 0) return `img:${image}`;
  const id = parseNum(player?.id, 0);
  if (id > 0) return `id:${id}`;
  return '';
}
function realDraftValue(player) {
  return parseNum(player?.rating, 70) * 0.7 + parseNum(player?.potential, 75) * 0.3;
}
function evaluateDraftTierByRealClass(players) {
  if (!players.length) return 'normal';
  const ordered = [...players].sort((a, b) => realDraftValue(b) - realDraftValue(a));
  const top = ordered.slice(0, Math.min(5, ordered.length));
  const avg = top.reduce((s, p) => s + parseNum(p?.rating, 70), 0) / Math.max(top.length, 1);
  if (avg >= 79) return 'big';
  if (avg <= 74) return 'weak';
  return 'normal';
}

function badgeWeightedPick(pool) {
  const list = (pool || []).filter(x => x && x.id);
  if (!list.length) return '';
  const total = list.reduce((sum, item) => sum + Math.max(0.01, parseNum(item.w, 1)), 0);
  let r = Math.random() * total;
  for (const item of list) {
    r -= Math.max(0.01, parseNum(item.w, 1));
    if (r <= 0) return item.id;
  }
  return list[list.length - 1].id;
}
// ============ BADGE SYSTEM WITH LEVELS ============
const BADGES = [
  {
    id: 'goat', apkNo: 1, n: 'GOAT', d: '全能传奇，全面提升比赛统治力',
    req: '荣誉积分≥500', cat: 'legend',
    img: `${APK_BADGE_IMG_BASE}/badge_01.png`,
    effect: {
      fgPctBonus: 0.008, tpPctBonus: 0.008, ftPctBonus: 0.008,
      astFlat: 0.3, rebFlat: 0.3, stlFlat: 0.12, blkFlat: 0.12,
      attrBoost: { pass: 1, shotInt: 1, shotExt: 1, physique: 1, reb: 1, stl: 1, blk: 1 },
      injuryMult: 0.98
    }
  },
  {
    id: 'middy_magician', apkNo: 2, n: '运投高手', d: '持球节奏与中距离终结更稳定',
    req: '身体素质≥85；外线投射≥85', cat: 'shooting',
    img: `${APK_BADGE_IMG_BASE}/badge_02.png`,
    effect: { fgPctBonus: 0.008, insidePctBonus: 0.005, attrBoost: { shotExt: 1, physique: 0.5 }, clutchShot: 0.005 }
  },
  {
    id: 'cannon', apkNo: 3, n: '高位炮台', d: '大个子外线炮台，拉开空间',
    req: '外线倾向≥80；外线投射≥85；PF/C', cat: 'shooting',
    img: `${APK_BADGE_IMG_BASE}/badge_03.png`,
    effect: { tpPctBonus: 0.012, fgPctBonus: 0.003, attrBoost: { shotExt: 1, pass: 0.5 } }
  },
  {
    id: 'marksman', apkNo: 4, n: '百步穿杨', d: '纯射手徽章，三分稳定性显著提升',
    req: '外线投射≥90', cat: 'shooting',
    img: `${APK_BADGE_IMG_BASE}/badge_04.png`,
    effect: { tpPctBonus: 0.015, attrBoost: { shotExt: 1 }, clutchShot: 0.005 }
  },
  {
    id: 'rebounder', apkNo: 5, n: '篮板好手', d: '卡位和拼抢能力明显提升',
    req: '篮板争抢≥90', cat: 'rebounding',
    img: `${APK_BADGE_IMG_BASE}/badge_05.png`,
    effect: { rebFlat: 0.7, attrBoost: { reb: 1, strength: 1 } }
  },
  {
    id: 'interior_ruler', apkNo: 6, n: '内线主宰', d: '禁区终结与护筐压制力更强',
    req: '内线倾向≥80；内线终结≥85；PF/C', cat: 'finishing',
    img: `${APK_BADGE_IMG_BASE}/badge_06.png`,
    effect: { insidePctBonus: 0.012, blkFlat: 0.3, rebFlat: 0.3, attrBoost: { shotInt: 1, blk: 1, reb: 0.5 } }
  },
  {
    id: 'midrange_shooter', apkNo: 7, n: '中投靓仔', d: '中距离效率和关键终结能力更优',
    req: '中投倾向≥80；中投技巧≥80', cat: 'shooting',
    img: `${APK_BADGE_IMG_BASE}/badge_07.png`,
    effect: { fgPctBonus: 0.01, insidePctBonus: 0.004, attrBoost: { shotInt: 0.5, shotExt: 1 } }
  },
  {
    id: 'rhythm_master', apkNo: 8, n: '节奏大师', d: '组织梳理与控失误能力提升',
    req: '组织进攻≥85', cat: 'playmaking',
    img: `${APK_BADGE_IMG_BASE}/badge_08.png`,
    effect: { astFlat: 0.6, tovMult: 0.95, attrBoost: { pass: 1 } }
  }
];

function badgeById(id) {
  return BADGES.find(b => b.id === id) || null;
}
function getBadgeRequirementText(badgeOrId) {
  const b = typeof badgeOrId === 'string' ? badgeById(badgeOrId) : badgeOrId;
  return b?.req || '无';
}
function buildBadgeRuleContext(player = {}) {
  const attrs = (player?.attrs && Object.keys(player.attrs).length) ? player.attrs : parsePlayerAttrs(player || {});
  const shotInt = parseNum(attrs.shotInt, 55);
  const shotExt = parseNum(attrs.shotExt, 55);
  const pass = parseNum(attrs.pass, 55);
  const reb = parseNum(attrs.reb, 55);
  const physique = parseNum(attrs.physique, 55);
  const tendencyIn = parseNum(player?.tendencies?.in ?? player?.tendencyIn, 55);
  const tendencyMid = parseNum(player?.tendencies?.mid ?? player?.tendencyMid, 55);
  const tendencyExt = parseNum(player?.tendencies?.ex ?? player?.tendencyExt ?? player?.tendencyEx, 55);
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const isBig = pos === 4 || pos === 5;
  const shotMid = Math.round((shotInt + shotExt) / 2);
  const rating = clamp(parseNum(player?.rating, ovr(attrs)), 40, 99);
  const potential = clamp(parseNum(player?.potential, rating), 40, 99);
  const yearsLeague = Math.max(0, parseNum(player?.yearsLeague, 0));
  const hofScore = (() => {
    // 修复：如果传入的是 G.player (即玩家自己)，或者显式带有 USER_SELF 标识，则必须走真实的荣誉分计算
    if ((String(player?.id) === 'USER_SELF' || (typeof G !== 'undefined' && G && player === G.player)) && typeof getUserHallOfFameProfile === 'function') {
      const profile = getUserHallOfFameProfile();
      return parseNum(profile?.score, 0);
    }
    if (Number.isFinite(parseNum(player?.hallScore, NaN))) return parseNum(player?.hallScore, 0);
    return Math.max(0, Math.round((rating - 70) * 7 + (potential - 72) * 3 + yearsLeague * 9 + parseNum(player?.fame, 10) * 2));
  })();
  return {
    attrs, shotInt, shotExt, shotMid, pass, reb, physique,
    tendencyIn, tendencyMid, tendencyExt, pos, isBig, rating, potential, yearsLeague, hofScore
  };
}

// 检查是否满足基础要求 (Bronze Level)
function isBadgeRequirementMet(player, badgeOrId, { allowLegendFallback = true } = {}) {
  const badge = typeof badgeOrId === 'string' ? badgeById(badgeOrId) : badgeOrId;
  if (!badge) return false;
  const c = buildBadgeRuleContext(player);
  if (badge.id === 'goat') return c.hofScore >= 500;
  if (badge.id === 'middy_magician') return c.physique >= 85 && c.shotExt >= 85;
  if (badge.id === 'cannon') return c.tendencyExt >= 80 && c.shotExt >= 85 && c.isBig;
  if (badge.id === 'marksman') return c.shotExt >= 90;
  if (badge.id === 'rebounder') return c.reb >= 90;
  if (badge.id === 'interior_ruler') return c.tendencyIn >= 80 && c.shotInt >= 85 && c.isBig;
  if (badge.id === 'midrange_shooter') return c.tendencyMid >= 80 && c.shotMid >= 80; // Adjusted per user request
  if (badge.id === 'rhythm_master') return c.pass >= 85;
  return false;
}

// 计算徽章等级 (0=None, 1=Bronze, 2=Silver, 3=Gold, 4=HOF)
function getBadgeLevel(player, badgeOrId) {
  const badge = typeof badgeOrId === 'string' ? badgeById(badgeOrId) : badgeOrId;
  if (!badge) return 0;

  if (!isBadgeRequirementMet(player, badge)) return 0;

  const c = buildBadgeRuleContext(player);
  let excess = 0;

  // Define primary attribute for leveling calculation
  if (badge.id === 'goat') excess = Math.max(0, c.hofScore - 500) / 200; // Harder to level GOAT
  else if (badge.id === 'middy_magician') excess = Math.min(c.physique - 85, c.shotExt - 85);
  else if (badge.id === 'cannon') excess = c.shotExt - 85;
  else if (badge.id === 'marksman') excess = c.shotExt - 90;
  else if (badge.id === 'rebounder') excess = c.reb - 90;
  else if (badge.id === 'interior_ruler') excess = c.shotInt - 85;
  else if (badge.id === 'midrange_shooter') excess = c.shotMid - 80;
  else if (badge.id === 'rhythm_master') excess = c.pass - 85;

  // Level 1 (Bronze) is base. +1 level per 5 points excess
  const level = 1 + Math.floor(excess / 5);
  return clamp(level, 1, 4);
}

// 获取徽章属性加成量 (仅bonus部分)
function getBadgeAttrBonuses(player) {
  const bonuses = {};
  if (!player || !player.badges || typeof player.badges !== 'object') return bonuses;
  Object.keys(player.badges).forEach(badgeId => {
    const badge = badgeById(badgeId);
    if (!badge || !badge.effect || !badge.effect.attrBoost) return;
    const level = parseNum(player.badges[badgeId], 1);
    if (level <= 0) return;
    Object.entries(badge.effect.attrBoost).forEach(([attrKey, boostVal]) => {
      const bonus = boostVal * level;
      if (bonus !== 0) bonuses[attrKey] = (bonuses[attrKey] || 0) + bonus;
    });
  });
  return bonuses;
}

// 获取徽章+X天赋加成后的属性
function getEffectivePlayerAttrs(player) {
  const baseAttrs = (player?.attrs && Object.keys(player.attrs).length) ? { ...player.attrs } : parsePlayerAttrs(player || {});
  const effective = { ...baseAttrs };

  // X-Factor 全属性加成（玻璃人等）
  if (player?.xfactor) {
    const xf = typeof XFACTORS !== 'undefined' && XFACTORS.find(x => x.id === player.xfactor);
    if (xf && xf.effect && xf.effect.attrBonus) {
      const allKeys = ['pass', 'shotInt', 'shotExt', 'shotFree', 'speed', 'strength', 'reb', 'blk', 'stl'];
      allKeys.forEach(k => {
        if (effective[k] !== undefined) effective[k] += xf.effect.attrBonus;
      });
    }
  }

  // 徽章属性加成
  if (player?.badges) {
    Object.keys(player.badges).forEach(badgeId => {
      const badge = badgeById(badgeId);
      if (!badge || !badge.effect || !badge.effect.attrBoost) return;
      const level = parseNum(player.badges[badgeId], 1);
      Object.entries(badge.effect.attrBoost).forEach(([attrKey, boostVal]) => {
        const bonus = boostVal * level;
        if (effective[attrKey] !== undefined) {
          effective[attrKey] += bonus;
        }
      });
    });
  }

  if (typeof getPlayerLiveAttrBoosts === 'function') {
    const liveBoosts = getPlayerLiveAttrBoosts(player);
    if (liveBoosts && typeof liveBoosts === 'object') {
      Object.entries(liveBoosts).forEach(([attrKey, boostVal]) => {
        if (effective[attrKey] !== undefined) {
          effective[attrKey] += parseNum(boostVal, 0);
        }
      });
    }
  }

  Object.keys(effective).forEach(attrKey => {
    if (!Number.isFinite(parseNum(effective[attrKey], NaN))) return;
    effective[attrKey] = clampMatchEffectiveAttr(effective[attrKey]);
  });

  return effective;
}

function getBadgeRequirementStatusText(player, badgeOrId) {
  const badge = typeof badgeOrId === 'string' ? badgeById(badgeOrId) : badgeOrId;
  if (!badge) return '要求: -';
  const met = isBadgeRequirementMet(player, badge, { allowLegendFallback: false });
  return `${met ? '✅' : '⛔'} 要求: ${getBadgeRequirementText(badge)}`;
}

// 重新计算并赋予玩家徽章 (Deterministic)
function recalcPlayerBadges(player) {
  const newBadges = {};
  const currentBadges = Array.isArray(player?.badges)
    ? player.badges.reduce((acc, id) => {
      const badgeId = String(id || '').trim();
      if (!BADGES.some(b => b.id === badgeId)) return acc;
      acc[badgeId] = Math.max(acc[badgeId] || 0, 1);
      return acc;
    }, {})
    : ((player?.badges && typeof player.badges === 'object') ? player.badges : {});

  BADGES.forEach(badge => {
    const computedLevel = getBadgeLevel(player, badge);
    if (computedLevel <= 0) return;
    const storedLevel = clamp(parseNum(currentBadges[badge.id], 0), 0, 4);
    const level = Math.max(computedLevel, storedLevel);
    if (level > 0) {
      newBadges[badge.id] = level;
    }
  });

  player.badges = newBadges;
  return newBadges;
}

// Deprecated: Randomized initial logic replaced by deterministic logic
// Replaced by deterministic logic
function assignInitialBadges(player) {
  return recalcPlayerBadges(player);
}
function normalizePlayerBadges(player, { assignIfEmpty = true } = {}) {
  if (!player || typeof player !== 'object') return {};
  const out = {};
  const put = (id, lv = 1) => {
    if (!BADGES.some(b => b.id === id)) return;
    const level = clamp(parseNum(lv, 0), 0, 4);
    if (level <= 0) return;
    out[id] = Math.max(out[id] || 0, level);
  };

  if (Array.isArray(player.badges)) {
    player.badges.forEach(id => put(String(id || '').trim(), 1));
  } else if (player.badges && typeof player.badges === 'object') {
    Object.entries(player.badges).forEach(([id, lv]) => put(String(id || '').trim(), lv));
  }

  player.badges = out;
  if (!assignIfEmpty && Object.keys(out).length === 0) {
    return out;
  }
  return recalcPlayerBadges(player);
}
function ensureLeagueBadges() {
  if (LEAGUE.teams) {
    Object.values(LEAGUE.teams).forEach(t => {
      if (!Array.isArray(t.players)) return;
      t.players.forEach(p => normalizePlayerBadges(p, { assignIfEmpty: true }));
    });
  }
  if (Array.isArray(LEAGUE.rookieCatalog)) {
    LEAGUE.rookieCatalog.forEach(p => normalizePlayerBadges(p, { assignIfEmpty: true }));
  }
  if (G.player) normalizePlayerBadges(G.player, { assignIfEmpty: true });
}
function getBadgeCategoryIcon(cat) {
  const map = {
    legend: '👑',
    shooting: '🎯',
    finishing: '💥',
    playmaking: '🧠',
    defense: '🛡',
    rebounding: '🧲',
    athletic: '⚡',
    mental: '🔥'
  };
  return map[String(cat || '').trim()] || '🎖️';
}
function getBadgeIconMarkup(badge, size = 18) {
  if (!badge) return getBadgeCategoryIcon('');
  const src = stripUndefinedTokens(badge.img || '');
  if (!src) return getBadgeCategoryIcon(badge.cat);
  const s = clamp(parseNum(size, 18), 12, 96);
  return `<img src="${src}" alt="${badge.n || 'badge'}" style="width:${s}px;height:${s}px;object-fit:cover;border-radius:4px;vertical-align:middle" onerror="this.style.display='none';this.nextSibling && (this.nextSibling.style.display='inline');"><span style="display:none">${getBadgeCategoryIcon(badge.cat)}</span>`;
}
function scaleBadgeEffectValue(key, value, level = 1) {
  const lv = clamp(parseNum(level, 1), 1, 4);
  if (typeof value !== 'number') return value;
  if (String(key || '').toLowerCase().includes('mult')) {
    return 1 + (value - 1) * lv;
  }
  return value * lv;
}
function getBadgeEffectShortText(effect, level = 1) {
  if (!effect || typeof effect !== 'object') return '';
  const parts = [];
  const pct = v => `${(parseNum(v, 0) * 100).toFixed(0)}%`;
  const signed = v => `${parseNum(v, 0) >= 0 ? '+' : ''}${parseNum(v, 0).toFixed(0)}`;
  const scaled = key => scaleBadgeEffectValue(key, effect[key], level);

  const fgPct = parseNum(scaled('fgPct'), 0) + parseNum(scaled('fgPctBonus'), 0);
  const tpPct = parseNum(scaled('tpPctBonus'), 0) + parseNum(scaled('deep3'), 0) + parseNum(scaled('corner3'), 0) * 0.3;
  const ftPct = parseNum(scaled('ftPctBonus'), 0);
  if (fgPct) parts.push(`投篮命中率 ${fgPct >= 0 ? '+' : ''}${pct(fgPct)}`);
  if (tpPct) parts.push(`三分命中率 ${tpPct >= 0 ? '+' : ''}${pct(tpPct)}`);
  if (ftPct) parts.push(`罚球命中率 ${ftPct >= 0 ? '+' : ''}${pct(ftPct)}`);

  if (effect.attrBoost && typeof effect.attrBoost === 'object') {
    const attrText = Object.entries(effect.attrBoost).map(([k, v]) => {
      const at = ATTRS.find(a => a.k === k);
      const val = scaleBadgeEffectValue(k, v, level);
      return `${at?.n || k}${signed(val)}`;
    }).slice(0, 4).join(' / ');
    if (attrText) parts.push(attrText);
  }

  const staminaCostMult = parseNum(scaled('staminaCostMult'), 1) * (1 - parseNum(scaled('staminaSave'), 0));
  if (staminaCostMult !== 1) {
    const delta = (1 - staminaCostMult) * 100;
    parts.push(`体力消耗 ${delta >= 0 ? '-' : '+'}${Math.abs(delta).toFixed(0)}%`);
  }
  const injuryMult = parseNum(scaled('injuryMult'), 1);
  if (injuryMult !== 1) {
    const delta = (1 - injuryMult) * 100;
    parts.push(`伤病风险 ${delta >= 0 ? '-' : '+'}${Math.abs(delta).toFixed(0)}%`);
  }
  const tovMult = parseNum(scaled('tovMult'), 1);
  if (tovMult !== 1) {
    const delta = (1 - tovMult) * 100;
    parts.push(`失误率 ${delta >= 0 ? '-' : '+'}${Math.abs(delta).toFixed(0)}%`);
  }
  if (effect.clutchShot || effect.clutchBoost) {
    const clutch = parseNum(scaled('clutchShot'), 0) + parseNum(scaled('clutchBoost'), 0);
    if (clutch) parts.push(`关键时刻加成 ${clutch >= 0 ? '+' : ''}${pct(clutch)}`);
  }
  if (effect.rebRange || effect.boxoutStrength || effect.wormMove) {
    const reb = parseNum(scaled('rebRange'), 0) + parseNum(scaled('boxoutStrength'), 0) + parseNum(scaled('wormMove'), 0);
    parts.push(`篮板能力 ${reb >= 0 ? '+' : ''}${pct(reb)}`);
  }
  if (effect.blockBoost || effect.chaseDownBlock || effect.paintIntimidate) {
    const blk = parseNum(scaled('blockBoost'), 0) + parseNum(scaled('chaseDownBlock'), 0) * 0.6 + parseNum(scaled('paintIntimidate'), 0) * 0.5;
    parts.push(`护筐影响 ${blk >= 0 ? '+' : ''}${pct(blk)}`);
  }

  return parts.slice(0, 3).join(' | ');
}
function getPlayerBadgeList(player) {
  const out = [];
  if (!player || !player.badges) return out;
  if (Array.isArray(player.badges)) {
    player.badges.forEach(id => {
      const b = BADGES.find(x => x.id === id);
      if (b) out.push({ id: b.id, lv: 1, badge: b });
    });
  } else if (typeof player.badges === 'object') {
    Object.entries(player.badges).forEach(([id, lv]) => {
      const b = BADGES.find(x => x.id === id);
      const level = clamp(parseNum(lv, 0), 0, 4);
      if (b && level > 0) out.push({ id: b.id, lv: level, badge: b });
    });
  }
  out.sort((a, b) =>
    b.lv - a.lv ||
    parseNum(a.badge?.apkNo, 99) - parseNum(b.badge?.apkNo, 99) ||
    String(a.badge.n).localeCompare(String(b.badge.n), 'zh-CN')
  );
  return out;
}

// ============ UPGRADE / XP SPENDING FUNCTIONS ============
// 属性升级XP花费（2K风格递增曲线）
function getUpgradeCost(currentValue) {
  const v = parseNum(currentValue, 50);
  if (v >= 99) return Infinity;
  if (v >= 95) return 50;
  if (v >= 90) return 35;
  if (v >= 85) return 25;
  if (v >= 80) return 18;
  if (v >= 75) return 14;
  if (v >= 70) return 10;
  if (v >= 60) return 7;
  return 5;
}

// 花费XP提升属性（返回是否成功）
function spendXP(attrKey, cost) {
  const p = G.player;
  if (!p || !p.attrs) return false;
  const curVal = parseNum(p.attrs[attrKey], 50);
  if (curVal >= 99) return false;
  const c = parseNum(cost, getUpgradeCost(curVal));
  if (parseNum(p.xp, 0) < c) return false;
  p.xp = parseNum(p.xp, 0) - c;
  p.attrs[attrKey] = Math.min(99, curVal + 1);
  p.rating = ovr(p.attrs);
  p.att = calcPlayerAtt(p.attrs);
  p.def = calcPlayerDef(p.attrs);
  // 重新计算徽章（属性变化可能解锁/升级徽章）
  recalcPlayerBadges(p);
  return true;
}

// 徽章升级XP花费：0=None→Bronze 30, Bronze→Silver 80, Silver→Gold 180, Gold→HOF 400
function getBadgeUpgradeCost(currentLevel) {
  const lv = clamp(parseNum(currentLevel, 0), 0, 4);
  if (lv >= 4) return 0;
  return [30, 80, 180, 400][lv]; // 下一级费用
}

// 执行徽章升级（返回是否成功）
function upgradeBadge(badgeId) {
  const p = G.player;
  if (!p) return false;
  const badge = badgeById(badgeId);
  if (!badge) return false;
  if (!p.badges || typeof p.badges !== 'object') p.badges = {};
  const lv = clamp(parseNum(p.badges[badgeId], 0), 0, 4);
  if (lv >= 4) return false;
  // 检查基础要求（首次解锁必须满足要求，已拥有则允许升级）
  if (lv === 0 && !isBadgeRequirementMet(p, badgeId, { allowLegendFallback: false })) return false;
  const cost = getBadgeUpgradeCost(lv);
  if (parseNum(p.xp, 0) < cost) return false;
  p.xp = parseNum(p.xp, 0) - cost;
  p.badges[badgeId] = lv + 1;
  recalcPlayerBadges(p);
  return true;
}

// 倾向升级XP花费
function getTendencyUpgradeCost(currentValue) {
  const v = parseNum(currentValue, 55);
  if (v >= 100) return Infinity;
  if (v >= 90) return 20;
  if (v >= 80) return 15;
  return 10;
}

// 花费XP提升倾向值（返回是否成功）
function spendTendencyXP(tendencyKey, cost) {
  const p = G.player;
  if (!p) return false;
  if (!p.tendencies || typeof p.tendencies !== 'object') p.tendencies = {};
  const curVal = parseNum(p.tendencies[tendencyKey], 55);
  if (curVal >= 100) return false;
  const c = parseNum(cost, getTendencyUpgradeCost(curVal));
  if (parseNum(p.xp, 0) < c) return false;
  p.xp = parseNum(p.xp, 0) - c;
  p.tendencies[tendencyKey] = Math.min(100, curVal + 1);
  // 倾向变化可能影响徽章解锁
  recalcPlayerBadges(p);
  return true;
}

function cloneRealRookie(base, pick, draftYear = G.year) {
  const nameCn = cleanText(base?.nameCn || base?.name || '');
  const nameEn = cleanText(base?.nameEn || base?.altName || base?.nameBirth || '');
  const displayName = resolveRookieDisplayName(nameCn, nameEn, `新秀${pick}号`);
  const imageId = clamp(parseNum(base?.image, 0), 0, 9999);
  const attrs = base?.attrs && Object.keys(base.attrs).length ? { ...base.attrs } : parsePlayerAttrs(base || {});
  const rating = clamp(parseNum(base?.rating, ovr(attrs)), 45, 99);
  const potential = clamp(parseNum(base?.potential, normalizePotentialValue(base?.potential, rating)), 50, 99);
  return {
    ...base,
    id: 720000 + draftYear * 1000 + pick,
    uid: `real_${draftYear}_${pick}_${parseNum(base?.id, pick)}`,
    name: displayName,
    altName: nameEn,
    nameCn,
    nameEn,
    pos: clamp(parseNum(base?.pos, parseNum(base?.positionFirst, 3)), 1, 5),
    pos2: clamp(parseNum(base?.pos2, parseNum(base?.positionSecond, 0)), 0, 5),
    rating,
    potential,
    att: clamp(parseNum(base?.att, rating), 35, 99),
    def: clamp(parseNum(base?.def, rating), 35, 99),
    age: clamp(parseNum(base?.age, 20), 18, 28),
    yearsLeague: 0,
    draft: draftYear * 100,
    photo: getPlayerPhotoPath(imageId),
    image: imageId,
    info: base?.info || '',
    attrs,
    rookie: true,
    injury: { active: false, games: 0, type: "" },
    draftPick: pick,
    sourceDraftYear: rookieDraftYear(base),
    badges: assignInitialBadges({ ...base, rating, potential, attrs, yearsLeague: 0, badges: {} })
  };
}
function collectRealDraftCandidates(targetYear, classSize, activeNameSet) {
  const requestedYear = clamp(parseNum(targetYear, G.year || 2025), 1947, 2100);
  const exactHistorical = getHistoricalDraftClass(requestedYear)
    .filter(p => {
      const key = playerIdentityKey(p);
      return !!key && !activeNameSet.has(key);
    })
    .sort((a, b) => {
      const pa = parseNum(a.draftPick, 999), pb = parseNum(b.draftPick, 999);
      if (pa !== pb) return pa - pb;
      return realDraftValue(b) - realDraftValue(a);
    });
  if (exactHistorical.length) {
    return { year: requestedYear, players: exactHistorical.slice(0, classSize) };
  }
  const year = resolveDraftScriptYear(targetYear);
  const all = [...getRookieCatalog()].filter(p => {
    if (!p) return false;
    const key = playerIdentityKey(p);
    return !!key && !activeNameSet.has(key);
  });
  const byYear = new Map();
  all.forEach(p => {
    const y = rookieDraftYear(p);
    if (y < 1947 || y > 2100) return;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(p);
  });
  byYear.forEach(list => list.sort((a, b) => realDraftValue(b) - realDraftValue(a)));
  const years = [...byYear.keys()].sort((a, b) => {
    const da = Math.abs(a - year), db = Math.abs(b - year);
    if (da !== db) return da - db;
    if (a === year) return -1;
    if (b === year) return 1;
    return a - b;
  });
  const usedNames = new Set(activeNameSet);
  const selected = [];
  for (const y of years) {
    const list = byYear.get(y) || [];
    for (const p of list) {
      const key = playerIdentityKey(p);
      if (!key || usedNames.has(key)) continue;
      usedNames.add(key);
      selected.push(p);
      if (selected.length >= classSize) break;
    }
    if (selected.length >= classSize) break;
  }
  // 根据实际选中的球员决定显示的届年份，而非使用映射后的目标年份
  let actualYear = year;
  if (selected.length) {
    const yearCount = new Map();
    for (const p of selected) {
      const py = rookieDraftYear(p);
      if (py >= 1947 && py <= 2100) yearCount.set(py, (yearCount.get(py) || 0) + 1);
    }
    let maxC = 0;
    for (const [y2, c] of yearCount) { if (c > maxC) { maxC = c; actualYear = y2; } }
  }
  return { year: actualYear, players: selected };
}
function generateDraftClass(classSize = 64, { targetYear = G.year } = {}) {
  classSize = Math.max(8, Math.min(128, Math.round(classSize || 64)));
  const activeNames = new Set();
  Object.values(LEAGUE.teams).forEach(t => {
    (t.players || []).forEach(p => {
      const key = playerIdentityKey(p);
      if (key) activeNames.add(key);
    });
  });
  const selfKey = playerIdentityKey(G.player);
  if (selfKey) activeNames.add(selfKey);
  const picked = collectRealDraftCandidates(targetYear, classSize, activeNames);
  const classPlayers = picked.players.slice(0, classSize).map((base, idx) => cloneRealRookie(base, idx + 1, picked.year));
  const tier = evaluateDraftTierByRealClass(classPlayers);
  return { tier, year: picked.year, players: classPlayers };
}
function generateDraftClass64() {
  return generateDraftClass(64, { targetYear: G.year });
}
async function injectSeasonRookies() {
  if (!LEAGUE.loaded) return;
  try {
    const board = G.draftBoard;
    const stored = Array.isArray(board?._pickResults) ? board._pickResults : [];

    // Use draft results from simulateDraft if available (first season)
    if (stored.length) {
      const injected = [];
      stored.forEach(r => {
        if (!r.player || r.player.id === 'USER_PROSPECT') return;
        const tid = parseNum(r.teamId, 0);
        const t = LEAGUE.teams[tid];
        if (!t) return;
        t.players.push({ ...r.player, teamId: tid });
        injected.push(r.player);
      });
      if (!LEAGUE.rookiesBySeason) LEAGUE.rookiesBySeason = {};
      LEAGUE.rookiesBySeason[G.year] = injected;
    } else {
      // Fallback for subsequent seasons: generate fresh draft class
      const draftClass = generateDraftClass64();
      if (!LEAGUE.rookiesBySeason) LEAGUE.rookiesBySeason = {};
      LEAGUE.rookiesBySeason[G.year] = draftClass.players;
      const teamIds = Object.keys(LEAGUE.teams).map(Number).filter(id => id >= 1 && id <= 30);
      if (!teamIds.length) return;
      const draftOrder = [...teamIds].sort((a, b) => getTeamStrength(a) - getTeamStrength(b));
      const assign = [];
      draftOrder.forEach(id => assign.push(id));
      while (assign.length < 64) assign.push(teamIds[rng(0, teamIds.length - 1)]);
      draftClass.players.forEach((rk, i) => {
        let targetTeamId = 0;
        if (rk.teamId) targetTeamId = parseNum(rk.teamId, 0);
        else if (rk.draftTeam) {
          const abbr = String(rk.draftTeam).trim().toUpperCase();
          const found = Object.values(LEAGUE.teams).find(t => t.a === abbr || t.n.toUpperCase() === abbr);
          if (found) targetTeamId = found.id;
        }
        if (!targetTeamId || !LEAGUE.teams[targetTeamId]) targetTeamId = assign[i];
        const t = LEAGUE.teams[targetTeamId];
        if (!t) return;
        t.players.push({ ...rk, teamId: targetTeamId });
      });
      const top = draftClass.players[0];
      const tierText = draftClass.tier === 'big' ? '大年' : (draftClass.tier === 'weak' ? '小年' : '正常年');
      addNews(`🎓 ${G.year}届选秀完成（${tierText}）：状元 ${top.name} OVR ${top.rating} POT ${top.potential}`, 'neu');
    }

    Object.values(LEAGUE.teams).forEach(t => {
      t.rotation = toRotation(t.players);
      t.strength = calcTeamStrength(t);
    });
  } catch (e) {
    console.warn('Rookie injection failed', e);
  }
}
function getPos(id) { return POS.find(p => p.id === id) }
function getTemplatesForPos(posId) {
  return TEMPLATES_BY_POS[parseNum(posId, 0)] || [];
}
function getTemplate(id, posId = 0) {
  if (!id) return null;
  const list = posId ? getTemplatesForPos(posId) : ALL_TEMPLATES;
  return list.find(t => t.id === id) || ALL_TEMPLATES.find(t => t.id === id) || null;
}
function getXFactor(id) { return XFACTORS.find(x => x.id === id) }
function getPlayerXFactorEffect(player = G.player) {
  const xf = getXFactor(player?.xfactor);
  return xf ? xf.effect : {};
}
const COACH_SYSTEMS = Object.freeze({
  balance: {
    id: 'balance',
    label: '均衡体系',
    secondaryLean: '按阵容灵活分配球权',
    summary: '回合分配平均，强调稳定和阵容均衡。',
    paceMult: 1.00, threeRateMult: 1.00, paintRateMult: 1.00, astMult: 1.02, rebMult: 1.00, stocksMult: 1.00,
    usageByPos: { 1: 0.000, 2: 0.000, 3: 0.000, 4: 0.000, 5: 0.000 }
  },
  defense: {
    id: 'defense',
    label: '防守体系',
    secondaryLean: '防守纪律与轮转保护',
    summary: '优先保证防守纪律、轮转和篮板保护。',
    paceMult: 0.96, threeRateMult: 0.96, paintRateMult: 1.03, astMult: 0.98, rebMult: 1.08, stocksMult: 1.10,
    usageByPos: { 1: -0.010, 2: -0.005, 3: 0.000, 4: 0.012, 5: 0.020 }
  },
  grit: {
    id: 'grit',
    label: '强硬磨阵体系',
    secondaryLean: '慢节奏对抗与冲板',
    summary: '偏慢节奏和身体对抗，强调冲板、罚球和硬仗属性。',
    paceMult: 0.93, threeRateMult: 0.92, paintRateMult: 1.10, astMult: 0.96, rebMult: 1.08, stocksMult: 1.05,
    usageByPos: { 1: -0.020, 2: -0.015, 3: -0.005, 4: 0.018, 5: 0.028 }
  },
  pace_space: {
    id: 'pace_space',
    label: '节奏与空间体系',
    secondaryLean: '快速推进与拉开空间',
    summary: '强调快节奏、外拆内切和空间拉扯。',
    paceMult: 1.08, threeRateMult: 1.16, paintRateMult: 1.04, astMult: 1.08, rebMult: 0.97, stocksMult: 0.98,
    usageByPos: { 1: 0.022, 2: 0.018, 3: 0.010, 4: -0.008, 5: -0.022 }
  },
  perimeter_star: {
    id: 'perimeter_star',
    label: '外线核心体系',
    secondaryLean: '持球大核与外线强投',
    summary: '围绕持球后场或侧翼核心设计出手和回合。',
    paceMult: 1.05, threeRateMult: 1.12, paintRateMult: 0.96, astMult: 1.06, rebMult: 0.98, stocksMult: 0.98,
    usageByPos: { 1: 0.032, 2: 0.024, 3: 0.010, 4: -0.018, 5: -0.032 }
  },
  interior_star: {
    id: 'interior_star',
    label: '内线核心体系',
    secondaryLean: '低位、顺下和二次进攻',
    summary: '围绕内线支点、肘区和篮下终结建立回合。',
    paceMult: 0.97, threeRateMult: 0.90, paintRateMult: 1.18, astMult: 0.97, rebMult: 1.10, stocksMult: 1.06,
    usageByPos: { 1: -0.018, 2: -0.015, 3: -0.006, 4: 0.020, 5: 0.032 }
  },
  triangle: {
    id: 'triangle',
    label: '三角进攻体系',
    secondaryLean: '肘区中转与弱侧联动',
    summary: '通过肘区、低位和弱侧空切形成连续传导。',
    paceMult: 0.98, threeRateMult: 0.94, paintRateMult: 1.08, astMult: 1.12, rebMult: 1.02, stocksMult: 1.00,
    usageByPos: { 1: -0.008, 2: 0.004, 3: 0.010, 4: 0.008, 5: 0.004 }
  },
  seven_seconds: {
    id: 'seven_seconds',
    label: '七秒炮轰体系',
    secondaryLean: '早攻推进与转换外线',
    summary: '第一时间推进回合，追求转换速度和早攻投射。',
    paceMult: 1.14, threeRateMult: 1.10, paintRateMult: 1.02, astMult: 1.05, rebMult: 0.96, stocksMult: 0.97,
    usageByPos: { 1: 0.026, 2: 0.020, 3: 0.012, 4: -0.010, 5: -0.026 }
  }
});
const _COACH_SYSTEM_GROUPS = {
  pace_space: [
    // 当前NBA
    '乔-马祖拉', '肯尼-阿特金森', '里克-卡莱尔', '奎因-斯奈德', '威尔-哈迪', 'JJ-雷迪克',
    // 历史NBA
    '布拉德-史蒂文斯', '迈克-布登霍尔泽', '泰勒-詹金斯', '特里-斯托茨', '卢克-沃顿', '布雷特-布朗',
    '里克-阿德尔曼', '里德-阿德尔曼', '杰克-拉姆西', '科顿-菲茨西蒙斯', '克顿-菲茨西蒙斯',
    '斯蒂夫-纳什', '劳埃德-皮尔斯', '莱恩-桑德斯',
    // 虚构变体
    'Kenny Atkinson', 'Fred Hoiberg', 'Randy Carlisle', 'Quentin Snyder', 'Thomas Stotts', 'Lion Walton',
    // CBA
    '杨鸣', '王博', '刘炜', '布拉尼斯拉夫-维琴蒂奇',
    // 国际
    '詹马尔科-波泽科', '亚历山大-凯撒', '亚历山德罗斯-法莱卡斯'
  ],
  defense: [
    // 当前NBA
    '约迪-费尔南德斯', '迈克-布朗', '尼克-纳斯', '斯蒂夫-克里福德', '埃里克-斯波尔斯特拉', '贾马尔-莫斯利',
    // 历史NBA
    '汤姆-锡伯杜', '杰夫-范甘迪', '拉里-布朗', '斯坦-范甘迪', '弗兰克-沃格尔', '达尔文-哈姆',
    '迈克-伍德森', '莱昂内尔-霍林斯', '布兰登-马龙', '蒂龙-科尔宾',
    '迈克-弗雷特洛', '迈克-弗拉特洛', '比尔-费奇', '帕特-莱利', '胡比-布朗',
    '斯科特-斯凯尔斯', '斯科特-斯基尔斯', '戴夫-乔格尔', '埃托雷-梅西纳',
    '詹姆斯-伯雷格',
    // 虚构变体
    'Stuart VanGundy', 'Ernest Spoelstra', 'Ferry Vogel', 'Terry Thibodeau', 'Shawn Clifford', 'Donald Joerger',
    // CBA
    '杜锋', '郭士强', '刘维伟', '闵鹿蕾', '许利民', '李维刚', '张成',
    // 国际
    '斯韦蒂斯拉夫-佩希奇', '瑟吉欧-史卡利欧罗', '吉姆-奥布莱恩'
  ],
  grit: [
    // 当前NBA
    'JB-比克斯塔夫', '艾米-乌度卡', '昌西-比卢普斯',
    // 历史NBA
    '拜伦-斯科特', '内特-麦克米兰', '莫里斯-奇克斯', '保罗-塞拉斯', '小韦斯-昂塞尔德',
    '艾弗里-约翰逊', '查克-戴利', '伯尼-比克斯塔夫', '伯尼-比克斯达夫',
    '约翰-卢卡斯', '波比-希尔', 'PJ-卡勒西莫', '戴夫-考恩斯',
    // 虚构变体
    'Norris McMillan', 'Barry Brown',
    // CBA
    '邱彪', '钟诚', '卢伟'
  ],
  seven_seconds: [
    // 当前NBA
    '托马斯-伊萨洛',
    // 历史NBA
    '唐-尼尔森', '保罗-韦斯特法尔', '阿尔文-金特里', '迈克-德安东尼', '乔治-卡尔',
    // 虚构变体
    'Alvin Gentry', 'Miles Danthony',
    // CBA
    '杨学增', '潘江', '丁伟'
  ],
  perimeter_star: [
    // 当前NBA
    '贾森-基德', '泰伦-卢', '乔丹-奥特',
    // 历史NBA
    '蒙蒂-威廉姆斯', '马克-杰克逊', '艾迪-乔丹',
    // 虚构变体
    'Juan Kidd', 'Timmy Lue',
    // CBA
    '西热力江', '易立', '梅米-贝西洛维奇',
    // 国际
    '瓦斯里斯-斯潘诺里斯'
  ],
  interior_star: [
    // 当前NBA
    '威利-格林', '大卫-阿德尔曼', '克里斯-芬奇',
    // 历史NBA
    '杰里-斯隆', '鲁迪-汤姆贾诺维奇', '格雷格-波波维奇', '凯文-麦克海尔',
    // 虚构变体
    'Morry Malone',
    // CBA
    '阿的江', '于梁', '张勇', '郑武', '李骏'
  ],
  triangle: [
    // 当前NBA
    '斯蒂夫-科尔',
    // 历史NBA
    '菲尔-杰克逊',
    // 虚构变体
    'Shawn Kerr'
  ],
  balance: [
    // 当前NBA
    '达尔科-拉亚科维奇', '比利-多诺万', '道格-里弗斯', '布莱恩-基夫', '米奇-约翰逊',
    '马克-戴格诺特', '道格-克里斯蒂',
    // 历史NBA
    '道格-科林斯', '迈克-邓利维', '老迈克-邓利维', '斯科特-布鲁克斯',
    '德维恩-凯西', '德韦恩-凯西', '雅克-沃恩', '斯蒂芬-塞拉斯',
    '大卫-费兹戴尔', '大卫-菲兹戴尔', '劳伦斯-弗兰克', '吉姆-博伊兰',
    '迈克尔-库里', '肯尼-奈特', '布莱恩-希尔', '布莱恩-温特斯', '凯文-朗格里',
    '托尼-迪莱奥', '杰-特里亚诺', '艾德-泰普斯科特',
    '吉姆-利耶姆', '吉姆-利那姆', '朗-克鲁格', '德尔-哈里斯',
    '鲍勃-希尔', '鲍勃-巴斯', '弗兰克-雷登', '约翰-巴赫', '约翰-克劳德',
    '迪克-莫塔', '斯坦-艾尔贝克', '比利-康宁汉姆', '吉姆-弗洛伊德',
    '兰尼-威尔肯斯', '阿兰-布里斯托', '比利-巴雷', '加里-圣-吉恩',
    '菲利普-桑德斯', '拉里-德鲁', '萨姆-米切尔', '德里克-费舍尔',
    '文尼-德尔-尼格罗', '维尼-德纳格罗', '乔治-欧文', '以赛亚-托马斯',
    '丹-伊赛尔', '布奇-贝尔德', '迈克-蒙哥马利', '迈克-斯科特',
    // 虚构变体
    'Berni Stevens', 'Josh Hornacek', 'Daniel Casey', 'Scott Brooks', 'Donald Fizdale',
    'Buck Donovan', 'Danny Rivers', 'Jeter Hornaceck', 'Geoff Popovic', 'M-L-凯尔',
    // CBA
    '王非', '朱世龙', '郑永刚', '高俊超', '刘鹏', '刘铁', '杨钦',
    '王世龙', '王伟力', '赵俊培', '代勇', '解立彬', '张伟',
    '周鹏', '周金利', '邓宇', '鲁刚', '张庆鹏', '韩硕',
    '黄文龙', '热夏提-克里木', '史利平', '卢伟',
    '乔里欧-格里乔里', '佩罗-卡梅隆', '纳撒尼尔-米歇尔',
    '内特·米切尔', '马科普洛斯·哈里斯',
    // 国际
    '汤姆-霍瓦斯', '蒂姆-孔恩', '亚当-卡彭', '贾德-弗拉维尔',
    '亚历山大-德兹基奇', '亚历山大-塞库利奇', '博斯科-拉多维奇',
    '米奥德拉格-佩里希奇', '罗伊-拉纳', '穆罕默德-穆尼尔-优素福-凯尔达尼',
    '洛尔-邓', '何塞-克拉罗斯-卡纳尔斯', '埃马努埃尔-特罗瓦达',
    '拉西-托维', '卢卡-班奇', '里马斯-库尔蒂奈蒂斯', '阿莱克斯-默布鲁',
    '弗雷德里克-福图', '亚历山大-彼得罗维奇', '罗纳德-吉恩',
    '奧马尔-昆特罗', '内斯托-加西亚', '卡洛斯-冈萨雷斯',
    // 占位教练 (XX主教练 / XX教练)
    '凯尔特人主教练', '篮网主教练', '尼克斯主教练', '76人主教练', '猛龙主教练',
    '公牛主教练', '骑士主教练', '活塞主教练', '步行者主教练', '雄鹿主教练',
    '老鹰主教练', '黄蜂主教练', '热火主教练', '魔术主教练', '奇才主教练',
    '独行侠主教练', '火箭主教练', '灰熊主教练', '鹈鹕主教练', '马刺主教练',
    '掘金主教练', '森林狼主教练', '开拓者主教练', '雷霆主教练', '爵士主教练',
    '勇士主教练', '快船主教练', '湖人主教练', '太阳主教练', '国王主教练',
    '猛龙教练', '山猫教练', '热火教练', '魔术教练', '灰熊教练',
    '黄蜂教练', '森林狼教练', '基恩-苏', '吉克-迈克尼', '豆格-莫',
    '米肯-弗兰特罗', '德克-马丁', 'K.C-琼斯'
  ]
};
const COACH_SYSTEM_MAP = Object.freeze(
  Object.fromEntries(
    Object.entries(_COACH_SYSTEM_GROUPS).flatMap(([sys, names]) => names.map(n => [n, sys]))
  )
);
function getCoachSystemProfile(systemId = 'balance') {
  const key = String(systemId || '').trim().toLowerCase();
  return COACH_SYSTEMS[key] || COACH_SYSTEMS.balance;
}
function getCoachSystemLabel(systemId = 'balance') {
  return getCoachSystemProfile(systemId).label;
}
function deriveSystemFromBaseValues(coach) {
  if (!coach) return 'balance';
  const int = parseNum(coach.baseShotIntPercent, 40);
  const tri = parseNum(coach.baseShotTriplePercent, 40);
  const off = parseNum(coach.baseOffensive, 40);
  const def = parseNum(coach.baseDefense, 40);
  if (int === 40 && tri === 40 && off === 40 && def === 40) return 'balance';
  if (tri >= 44 && off >= 43) return 'seven_seconds';
  if (tri >= 43 && off >= 42) return 'pace_space';
  if (tri >= 44 && off >= 41) return 'pace_space';
  if (def >= 44) return 'defense';
  if (def >= 43 && tri <= 39) return 'defense';
  if (int >= 44 && def >= 43) return 'grit';
  if (int >= 43 && tri <= 37) return 'grit';
  if (int >= 43 && tri <= 39) return 'interior_star';
  if (int >= 42 && def >= 41 && tri <= 39) return 'interior_star';
  if (off >= 43 && tri >= 39 && tri <= 42) return 'triangle';
  if (tri >= 43 && off >= 40) return 'perimeter_star';
  if (tri >= 42 && off >= 41) return 'perimeter_star';
  return 'balance';
}
function resolveCoachSystemIdByName(name = '', coach) {
  const raw = String(name || '').trim();
  if (COACH_SYSTEM_MAP[raw]) return COACH_SYSTEM_MAP[raw];
  if (coach) return deriveSystemFromBaseValues(coach);
  return 'balance';
}
function getCoachEffectsByCoach(coach) {
  const system = getCoachSystemProfile(coach?.systemId || resolveCoachSystemIdByName(coach?.name, coach));
  if (!coach) {
    return {
      offPct: 0, defPct: 0, tacticsPct: 0, xpPct: 0, xpMult: 1, teamRatingMult: 1,
      coachSkill1: -2, coachSkill2: -2, coachSkill5: 40, coachSkill6: 40,
      insideBias: 0, threeBias: 0, offensiveBias: 0, defensiveBias: 0,
      tacticsMult: 1, devMult: 1, loyaltyMod: 0,
      systemId: system.id, systemLabel: system.label, secondaryLean: system.secondaryLean, systemSummary: system.summary,
      paceMult: system.paceMult, threeRateMult: system.threeRateMult, paintRateMult: system.paintRateMult,
      astMult: system.astMult, rebMult: system.rebMult, stocksMult: system.stocksMult,
      usageByPos: { ...system.usageByPos }
    };
  }
  // 原有技能
  const coachSkill1 = getCoachSkillValue(coach, 1); // techDev 培养
  const coachSkill2 = getCoachSkillValue(coach, 2); // techLevel 战术
  const coachSkill5 = getCoachSkillValue(coach, 5); // baseOffensive
  const coachSkill6 = getCoachSkillValue(coach, 6); // baseDefense

  // 新增：从CSV字段直接读取
  const baseShotInt = parseNum(coach.baseShotIntPercent, 40);
  const baseShotTriple = parseNum(coach.baseShotTriplePercent, 40);
  const baseOff = parseNum(coach.baseOffensive, 40);
  const baseDef = parseNum(coach.baseDefense, 40);
  const techLevel = parseNum(coach.techLevel, 0);
  const techDev = parseNum(coach.techDev, 0);
  const loyalty = parseNum(coach.loyalty, 5);

  // 投篮倾向偏差（-0.15 到 +0.15）
  const insideBias = clamp((baseShotInt - 40) / 100, -0.15, 0.15); // 内线倾向
  const threeBias = clamp((baseShotTriple - 40) / 100, -0.15, 0.15); // 三分倾向

  // 攻防体系偏差
  const offensiveBias = clamp((baseOff - 40) / 100, -0.12, 0.12);
  const defensiveBias = clamp((baseDef - 40) / 100, -0.12, 0.12);

  // 战术和培养倍率
  const tacticsMult = clamp(1 + techLevel * 0.04, 0.92, 1.08); // 战术执行
  const devMult = clamp(1 + techDev * 0.08, 0.84, 1.16); // 培养能力

  // 忠诚度影响信任
  const loyaltyMod = clamp((loyalty - 5) * 0.8, -4, 4);

  // 原有计算
  const offPct = clamp((coachSkill5 - 40) / 100, -0.12, 0.12);
  const defPct = clamp((coachSkill6 - 40) / 100, -0.12, 0.12);
  const tacticsPct = clamp(coachSkill2 * 0.015, -0.08, 0.08);
  const xpPct = clamp(coachSkill1 * 0.12 + techDev * 0.06, -0.4, 0.6); // 加入techDev影响
  const teamRatingMult = clamp(1 + tacticsPct + ((offPct + defPct) * 0.5) + techLevel * 0.015, 0.85, 1.15);
  const paceMult = clamp(system.paceMult + threeBias * 0.12 - insideBias * 0.08, 0.88, 1.18);
  const threeRateMult = clamp(system.threeRateMult + threeBias * 0.45 - insideBias * 0.10, 0.82, 1.30);
  const paintRateMult = clamp(system.paintRateMult + insideBias * 0.45 - threeBias * 0.12, 0.82, 1.30);
  const astMult = clamp(system.astMult + tacticsPct * 0.25 + offensiveBias * 0.10, 0.90, 1.22);
  const rebMult = clamp(system.rebMult + defensiveBias * 0.18 + insideBias * 0.08, 0.90, 1.20);
  const stocksMult = clamp(system.stocksMult + defensiveBias * 0.28, 0.90, 1.22);
  const usageByPos = {
    1: clamp(parseNum(system.usageByPos?.[1], 0) + threeBias * 0.16 - insideBias * 0.05, -0.09, 0.09),
    2: clamp(parseNum(system.usageByPos?.[2], 0) + threeBias * 0.12 - insideBias * 0.04, -0.09, 0.09),
    3: clamp(parseNum(system.usageByPos?.[3], 0) + threeBias * 0.05 + insideBias * 0.02, -0.08, 0.08),
    4: clamp(parseNum(system.usageByPos?.[4], 0) + insideBias * 0.10 - threeBias * 0.05, -0.08, 0.08),
    5: clamp(parseNum(system.usageByPos?.[5], 0) + insideBias * 0.16 - threeBias * 0.08, -0.10, 0.10)
  };

  return {
    offPct, defPct, tacticsPct, xpPct, xpMult: 1 + xpPct, teamRatingMult,
    coachSkill1, coachSkill2, coachSkill5, coachSkill6,
    insideBias, threeBias, offensiveBias, defensiveBias,
    tacticsMult, devMult, loyaltyMod,
    baseShotInt, baseShotTriple, baseOff, baseDef, techLevel, techDev, loyalty,
    systemId: system.id,
    systemLabel: system.label,
    secondaryLean: system.secondaryLean,
    systemSummary: system.summary,
    paceMult,
    threeRateMult,
    paintRateMult,
    astMult,
    rebMult,
    stocksMult,
    usageByPos
  };
}
function getCoachEffects(teamId) {
  return getCoachEffectsByCoach(getTeamCoach(teamId));
}
function getPotentialXpMultiplier(player = G.player) {
  const pot = clamp(parseNum(player?.potential, 50), 0, 99);
  if (pot <= 50) return 1;
  return 1 + (pot - 50) / 100;
}
function addPlayerXP(baseXp) {
  const coachFx = getCoachEffects(G.teamId);
  const xfFx = getPlayerXFactorEffect(G.player);
  const xfactorMult = xfFx.xpMult || 1;
  const potMult = getPotentialXpMultiplier(G.player);
  const extraTrainMult = typeof getTrainingCoachXpMultiplier === 'function'
    ? parseNum(getTrainingCoachXpMultiplier(), 1)
    : 1;
  const gain = Math.max(0, Math.round(baseXp * coachFx.xpMult * xfactorMult * potMult * Math.max(0.75, extraTrainMult)));
  G.player.xp += gain;
  return gain;
}
function createUserRosterSnapshot() {
  const attrs = { ...G.player.attrs };
  const rating = ovr(attrs);
  const avatar = stripUndefinedTokens(G.player.avatar || G.player.photo || '');
  const rawBadges = G.player.badges;
  const badges = Array.isArray(rawBadges)
    ? rawBadges.reduce((acc, id) => {
      if (BADGES.some(b => b.id === id)) acc[id] = 1;
      return acc;
    }, {})
    : ((rawBadges && typeof rawBadges === 'object') ? { ...rawBadges } : {});
  return {
    id: 'USER_SELF',
    name: G.player.name,
    pos: G.player.pos,
    pos2: 0,
    rating,
    potential: G.player.potential,
    att: rating,
    def: rating,
    age: G.player.age,
    yearsLeague: Math.max(0, G.season - 1),
    photo: avatar || getPlayerPhotoPath(0),
    avatar,
    badges,
    xfactor: G.player.xfactor || '',
    attrs,
    tendencies: { ...G.player.tendencies },
    rookie: G.season === 1,
    isSelf: true
  };
}

function showModal(html, opts = {}) {
  const box = $('modalBox');
  box.className = 'modal';
  if (opts && opts.className) box.classList.add(opts.className);
  box.innerHTML = stripUndefinedTokens(html);
  $('modalBg').classList.add('active');
}
function hideModal() {
  const box = $('modalBox');
  box.className = 'modal';
  box.innerHTML = '';
  $('modalBg').classList.remove('active');
}
$('modalBg').addEventListener('click', e => {
  if (e.target === $('modalBg')) {
    if (typeof G !== 'undefined' && G._offseasonModalDismiss) { G._offseasonModalDismiss(); return; }
    hideModal();
  }
});
function posLabel(pos) {
  const p = getPos(parseNum(pos, 0));
  return p ? p.n : (pos || '-');
}
function openPlayerDetailModal(player, teamMeta = null, title = '球员详情') {
  if (!player) return;
  const attrs = player.attrs || {};
  const photo = getPlayerPhotoSrc(player);
  const p1 = posLabel(player.pos);
  const p2 = parseNum(player.pos2, 0) > 0 ? ` / ${posLabel(player.pos2)}` : '';
  const teamText = teamMeta ? `${teamMeta.z || teamMeta.n} (${teamMeta.a || '--'})` : '新秀池';

  const badgelist = getPlayerBadgeList(player);
  const badgeHtml = badgelist.map(({ lv, badge: b }) => {
    const tierName = ["", "铜", "银", "金", "名人堂"][Math.min(4, lv)] || "铜";
    const tierColor = lv === 4 ? '#9c27b0' : lv === 3 ? '#ffc107' : lv === 2 ? '#c0c0c0' : '#cd7f32';
    const icon = getBadgeIconMarkup(b, 16);
    const effectText = getBadgeEffectShortText(b.effect, lv);
    const reqText = getBadgeRequirementText(b);
    const tooltipTitle = [b.d, effectText, `要求: ${reqText}`].filter(Boolean).join(' | ');
    return `<span class="badge" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);margin-right:4px;margin-bottom:4px;cursor:help;display:inline-flex;align-items:center;padding:2px 8px" title="${tooltipTitle}">
      ${icon} <span style="margin:0 4px">${b.n}</span> <span style="font-size:10px;padding:0 4px;border-radius:2px;background:${tierColor};color:#fff">${tierName}</span>
    </span>`;
  }).join('');
  const badgeDetailHtml = badgelist.map(({ lv, badge: b }) => {
    const tierName = ["", "铜", "银", "金", "名人堂"][Math.min(4, lv)] || "铜";
    const icon = getBadgeIconMarkup(b, 18);
    const effectText = getBadgeEffectShortText(b.effect, lv);
    const reqStatus = getBadgeRequirementStatusText(player, b);
    return `<div class="ev neu" style="margin-bottom:6px;padding:8px 10px">
      <div class="fw-b fs-sm">${icon} ${b.n}（${tierName}）</div>
      <div class="t-2 fs-xs mt-12">${b.d || '暂无描述'}</div>
      <div class="t-2 fs-xs mt-12">${reqStatus}</div>
      ${effectText ? `<div class="t-2 fs-xs mt-12">效果：${effectText}</div>` : ''}
    </div>`;
  }).join('');


  showModal(`
    <div class="modal-hd"><h3>${title}</h3><button class="modal-x" onclick="hideModal()">✕</button></div>
    <div class="grid g2">
      <div>
        <div class="player-head mb-16">
          <img class="player-avatar" src="${photo}" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${getPlayerPhotoPath(0)}';}else{this.style.opacity=.2}">
          <div>
            <div class="fw-b fs-lg">${player.name || 'Unknown'}</div>
            ${player.altName ? `<div class="t-2 fs-sm">${player.altName}</div>` : ''}
            <div class="t-2 fs-sm mt-12">${teamText}</div>
            <div class="mt-12"><span class="badge b-pri">${p1}${p2}</span> <span class="badge b-gold">OVR ${player.rating || 0}</span> <span class="badge b-cyan">POT ${player.potential || 0}</span></div>
            ${player.injury?.active ? `<div class="mt-12"><span class="badge b-no">🩹 ${player.injury.type}（缺阵${player.injury.games}场）</span></div>` : ''}
          </div>
        </div>
        ${badgeHtml ? `<div class="mb-16"><div class="fw-b mb-8" style="font-size:13px">徽章</div><div style="display:flex;flex-wrap:wrap">${badgeHtml}</div></div>` : ''}
        ${badgeDetailHtml ? `<div class="mb-16"><div class="fw-b mb-8" style="font-size:13px">徽章作用</div>${badgeDetailHtml}</div>` : ''}
        <div class="grid g2">
          <div class="stat-box"><div class="stat-val">${player.att ?? '-'}</div><div class="stat-lbl">ATT</div></div>
          <div class="stat-box"><div class="stat-val">${player.def ?? '-'}</div><div class="stat-lbl">DEF</div></div>
          <div class="stat-box"><div class="stat-val">${player.age ?? '-'}</div><div class="stat-lbl">年龄</div></div>
          <div class="stat-box"><div class="stat-val">${player.yearsLeague ?? 0}</div><div class="stat-lbl">球龄</div></div>
        </div>
${(() => {
      const hist = player.careerBeforeStart || null;
      if (!hist) return '';
      const honors = hist.honors || {};
      return `<div class="ev neu" style="margin-top:12px">
        <div class="fw-b fs-sm">历史荣誉</div>
        <div class="mt-8">${renderHistoricalHonorBadges(honors)}</div>
      </div>`;
    })()}
${(() => {
      const t = player.tendencies || {};
      const tIn = parseNum(t.in, 55), tMid = parseNum(t.mid, 55), tEx = parseNum(t.ex, 55);
      return `<div class="mb-16" style="margin-top:12px">
        <div class="fw-b mb-8" style="font-size:13px">倾向值</div>
        <div class="flex fb" style="margin-bottom:6px"><span class="fs-sm" style="width:58px">内线</span>
          <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill" style="width:${tIn}%;background:#e74c3c"></div></div>
          <span class="fw-b" style="width:30px;text-align:right">${tIn}</span></div>
        <div class="flex fb" style="margin-bottom:6px"><span class="fs-sm" style="width:58px">中投</span>
          <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill" style="width:${tMid}%;background:#f39c12"></div></div>
          <span class="fw-b" style="width:30px;text-align:right">${tMid}</span></div>
        <div class="flex fb" style="margin-bottom:6px"><span class="fs-sm" style="width:58px">外线</span>
          <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill" style="width:${tEx}%;background:#3498db"></div></div>
          <span class="fw-b" style="width:30px;text-align:right">${tEx}</span></div>
      </div>`;
    })()}
      </div>
      <div>
        <div class="fw-b mb-16">属性明细</div>
${(() => {
      const effective = typeof getEffectivePlayerAttrs === 'function' ? getEffectivePlayerAttrs(player) : attrs;
      return ATTRS.map(at => {
        const v = parseNum(attrs[at.k], 0);
        const eff = parseNum(effective[at.k], 0);
        const bonus = eff - v;
        return `<div class="flex fb" style="margin-bottom:8px">
              <span class="fs-sm" style="width:58px">${at.n}</span>
              <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill ${barClass(eff)}" style="width:${clamp(eff, 0, 99)}%"></div></div>
              <div style="width:48px;text-align:right;line-height:1">
                <div class="fw-b">${v}</div>
                ${bonus > 0 ? `<div style="font-size:10px;color:var(--ok)">(+${bonus})</div>` : ''}
              </div>
            </div>`;
      }).join('');
    })()}
      </div>
    </div>
${(() => {
      // --- 赛季数据表格 ---
      const isUser = player.isSelf;
      let seasonRows = [];

      if (isUser) {
        // 用户球员：取 G.careerStats + 当前赛季
        seasonRows = (G.careerStats || []).map(c => ({
          year: c.year || '-', team: c.team, gp: c.gp || 0,
          ppg: c.ppg || 0, rpg: c.rpg || 0, apg: c.apg || 0,
          spg: c.spg || 0, bpg: c.bpg || 0,
          fgPct: c.fgPct || 0, tpPct: c.tpPct || 0, ftPct: c.ftPct || 0
        }));
        // 加入当前赛季（如果已经打过比赛）
        const cs = G.seasonStats;
        if (cs && cs.gp > 0) {
          const cgp = Math.max(cs.gp, 1);
          seasonRows.push({
            year: G.year, team: G.teamId, gp: cs.gp,
            ppg: +(cs.pts / cgp).toFixed(1), rpg: +(cs.reb / cgp).toFixed(1), apg: +(cs.ast / cgp).toFixed(1),
            spg: +(cs.stl / cgp).toFixed(1), bpg: +(cs.blk / cgp).toFixed(1),
            fgPct: cs.fga > 0 ? +(cs.fgm / cs.fga * 100).toFixed(1) : 0,
            tpPct: cs.tpa > 0 ? +(cs.tpm / cs.tpa * 100).toFixed(1) : 0,
            ftPct: cs.fta > 0 ? +(cs.ftm / cs.fta * 100).toFixed(1) : 0,
            current: true
          });
        }
      } else {
        // NPC球员：取 careerHistory + 当前赛季
        seasonRows = (player.careerHistory || []).map(c => ({
          year: c.year || '-', team: c.team, gp: c.gp || 0,
          ppg: c.ppg || 0, rpg: c.rpg || 0, apg: c.apg || 0,
          spg: c.spg || 0, bpg: c.bpg || 0,
          fgPct: c.fgPct || 0, tpPct: c.tpPct || 0, ftPct: c.ftPct || 0
        }));
        // 查找NPC当前赛季数据
        if (G.leagueSeason?.playerStats) {
          const npcKey = Object.keys(G.leagueSeason.playerStats).find(k => {
            const ps = G.leagueSeason.playerStats[k];
            return !ps.isSelf && String(ps.playerId) === String(player.id);
          });
          if (npcKey) {
            const ns = G.leagueSeason.playerStats[npcKey];
            if (ns && ns.gp > 0) {
              const ngp = Math.max(ns.gp, 1);
              seasonRows.push({
                year: G.year, team: ns.teamId, gp: ns.gp,
                ppg: +(ns.pts / ngp).toFixed(1), rpg: +(ns.reb / ngp).toFixed(1), apg: +(ns.ast / ngp).toFixed(1),
                spg: +(ns.stl / ngp).toFixed(1), bpg: +(ns.blk / ngp).toFixed(1),
                fgPct: ns.fga > 0 ? +(ns.fgm / ns.fga * 100).toFixed(1) : 0,
                tpPct: ns.tpa > 0 ? +(ns.tpm / ns.tpa * 100).toFixed(1) : 0,
                ftPct: ns.fta > 0 ? +(ns.ftm / ns.fta * 100).toFixed(1) : 0,
                current: true
              });
            }
          }
        }
      }

      if (seasonRows.length === 0) return '<div class="t-2 fs-sm" style="margin-top:16px;text-align:center">暂无赛季数据</div>';

      // 查找球队缩写
      const getTeamAbbr = (tid) => {
        if (typeof TEAMS !== 'undefined') {
          const t = TEAMS.find(t => t.id === tid);
          if (t) return t.a || t.abbr || String(tid);
        }
        return String(tid);
      };

      // 计算生涯平均
      const totalGp = seasonRows.reduce((s, r) => s + (r.gp || 0), 0);
      const n = seasonRows.length;
      const avg = (key) => n > 0 ? +(seasonRows.reduce((s, r) => s + parseFloat(r[key] || 0), 0) / n).toFixed(1) : 0;
      const avgWeighted = (key) => {
        const totalW = seasonRows.reduce((s, r) => s + (r.gp || 1), 0);
        return totalW > 0 ? +(seasonRows.reduce((s, r) => s + parseFloat(r[key] || 0) * (r.gp || 1), 0) / totalW).toFixed(1) : 0;
      };

      const thStyle = 'padding:4px 6px;font-size:11px;text-align:center;white-space:nowrap;border-bottom:2px solid var(--bd);background:rgba(255,255,255,0.05)';
      const tdStyle = 'padding:4px 6px;font-size:11px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.06)';
      const tdBold = 'padding:4px 6px;font-size:11px;text-align:center;white-space:nowrap;font-weight:bold;border-top:2px solid var(--bd);background:rgba(255,255,255,0.05)';

      const headerRow = `<tr>
    <th style="${thStyle}">赛季</th><th style="${thStyle}">球队</th><th style="${thStyle}">GP</th>
    <th style="${thStyle}">PPG</th><th style="${thStyle}">RPG</th><th style="${thStyle}">APG</th>
    <th style="${thStyle}">SPG</th><th style="${thStyle}">BPG</th>
    <th style="${thStyle}">FG%</th><th style="${thStyle}">3P%</th><th style="${thStyle}">FT%</th>
  </tr>`;

      const dataRows = seasonRows.map(r => `<tr${r.current ? ' style="background:rgba(52,152,219,0.12)"' : ''}>
    <td style="${tdStyle}">${r.year}-${(parseInt(r.year) + 1).toString().slice(-2)}</td>
    <td style="${tdStyle}">${getTeamAbbr(r.team)}</td>
    <td style="${tdStyle}">${r.gp}</td>
    <td style="${tdStyle}">${r.ppg}</td><td style="${tdStyle}">${r.rpg}</td><td style="${tdStyle}">${r.apg}</td>
    <td style="${tdStyle}">${r.spg}</td><td style="${tdStyle}">${r.bpg}</td>
    <td style="${tdStyle}">${r.fgPct}</td><td style="${tdStyle}">${r.tpPct}</td><td style="${tdStyle}">${r.ftPct}</td>
  </tr>`).join('');

      const careerRow = `<tr>
    <td style="${tdBold}">生涯</td><td style="${tdBold}">${n}季</td><td style="${tdBold}">${totalGp}</td>
    <td style="${tdBold}">${avgWeighted('ppg')}</td><td style="${tdBold}">${avgWeighted('rpg')}</td><td style="${tdBold}">${avgWeighted('apg')}</td>
    <td style="${tdBold}">${avgWeighted('spg')}</td><td style="${tdBold}">${avgWeighted('bpg')}</td>
    <td style="${tdBold}">${avgWeighted('fgPct')}</td><td style="${tdBold}">${avgWeighted('tpPct')}</td><td style="${tdBold}">${avgWeighted('ftPct')}</td>
  </tr>`;

      return `<div style="margin-top:16px;grid-column:1/-1">
    <div class="fw-b mb-8" style="font-size:13px">📊 赛季数据</div>
    <div style="overflow-x:auto;max-height:300px;overflow-y:auto;border:1px solid var(--bd);border-radius:8px">
      <table style="width:100%;border-collapse:collapse">
        <thead>${headerRow}</thead>
        <tbody>${dataRows}${careerRow}</tbody>
      </table>
    </div>
  </div>`;
    })()}
  `);
}
function showMyPlayerModal() {
  openPlayerDetailModal(createUserRosterSnapshot(), G.team, '我的球员');
}
function showTeamPlayerModal(teamId, playerId) {
  const teamObj = LEAGUE.teams?.[teamId];
  if (!teamObj) return;
  const player = (teamObj.players || []).find(p => String(p.id) === String(playerId));
  if (!player) return;
  openPlayerDetailModal(player, teamObj.meta, '球员详情');
}
function showRookieModal(rookieId) {
  const p = getRookieCatalog().find(r => String(r.id) === String(rookieId));
  if (!p) return;
  openPlayerDetailModal(p, null, '新秀详情');
}

function addNews(text, type = 'neu') {
  G.news.unshift({ text, type, season: G.season, game: G.gameNum, ts: Date.now() });
  if (G.news.length > 100) G.news.pop();
}
function addPhone(from, text, type = 'info') {
  G.phone.unshift({ from, text, type, season: G.season, read: false, ts: Date.now() });
  if (G.phone.length > 50) G.phone.pop();
}
