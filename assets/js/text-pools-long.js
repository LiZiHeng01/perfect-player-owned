// text-pools-long.js
// ============ LONG-FORM TEMPLATE EXPANSION ============
// Loaded after text-pools.js and text-pools-extra.js. This file only appends
// local deterministic templates; it does not call any remote or LLM service.

(function() {
'use strict';

function appendPoolEntries(pool, key, entries) {
  if (!pool || !Array.isArray(pool[key]) || !Array.isArray(entries) || !entries.length) return 0;
  pool[key].push(...entries);
  return entries.length;
}

function pickCycle(list, index, fallback = '') {
  if (!Array.isArray(list) || !list.length) return fallback;
  return list[((index % list.length) + list.length) % list.length];
}

function makeLongSocialEntries(category, persona, tone, count, cfg) {
  const subjects = cfg.subjects || ['{playerName}今晚的存在感'];
  const lenses = cfg.lenses || ['比赛走势'];
  const details = cfg.details || ['关键回合里的细节'];
  const stakes = cfg.stakes || ['这会影响接下来几天的舆论温度'];
  const endings = cfg.endings || ['如果后续还能延续这种状态，讨论会继续升温。'];
  return Array.from({ length: count }, (_, i) => {
    const subject = pickCycle(subjects, i);
    const lens = pickCycle(lenses, i * 3 + 1);
    const detail = pickCycle(details, i * 5 + 2);
    const stake = pickCycle(stakes, i * 7 + 3);
    const ending = pickCycle(endings, i * 11 + 4);
    return {
      persona,
      tone,
      text: `${subject}不能只看一句赛后热搜，要放回${lens}里理解。${detail}，这说明{teamName}和{oppName}之间的差距不是单纯比分能解释的。${stake}。${ending}`
    };
  });
}

function makeLongStoryEntries(category, count, changes, cfg) {
  const openers = cfg.openers || ['赛后更衣室里，{playerName}没有立刻换衣服。'];
  const scenes = cfg.scenes || ['他坐在自己的柜子前，把今晚几个关键回合在脑子里重新过了一遍。'];
  const beats = cfg.beats || ['助教拿着平板走过来，指出一个容易被忽视的跑位细节。'];
  const reflections = cfg.reflections || ['这不是一个能被简单定义为好或坏的夜晚，它更像是一段漫长赛季里的坐标。'];
  const endings = cfg.endings || ['离开球馆前，他把训练鞋重新放回包里，知道明天还有新的课题要处理。'];
  return Array.from({ length: count }, (_, i) => ({
    text: `${pickCycle(openers, i)}${pickCycle(scenes, i * 2 + 1)}${pickCycle(beats, i * 3 + 2)}${pickCycle(reflections, i * 5 + 3)}${pickCycle(endings, i * 7 + 4)}`,
    changes: { ...changes }
  }));
}

function makeLongRecaps(category, count, cfg) {
  const headlineThemes = cfg.headlines || ['{playerName}成为比赛焦点'];
  const starts = cfg.starts || ['这场比赛的走势并不简单。'];
  const middles = cfg.middles || ['{playerName}的数据之外，更值得注意的是他在攻防转换中的选择。'];
  const tactical = cfg.tactical || ['教练组在暂停后的布置改变了节奏，弱侧跑位和高位掩护连续制造机会。'];
  const endings = cfg.endings || ['这场比赛会成为球队后续复盘的重要样本。'];
  return Array.from({ length: count }, (_, i) => ({
    headline: pickCycle(headlineThemes, i),
    recap: `${pickCycle(starts, i)}比分是{teamPts}:{oppPts}，{playerName}交出{pts}分{reb}篮板{ast}助攻，但真正决定比赛气质的是那些没有完全写进数据栏的回合。${pickCycle(middles, i * 2 + 1)}${pickCycle(tactical, i * 3 + 2)}${pickCycle(endings, i * 5 + 3)}`
  }));
}

function makeLongStarPosts(key, count) {
  const isRival = key.includes('rival');
  const isFriend = key.includes('friend');
  const isRest = key.includes('rest');
  const isWeak = key.includes('weak');
  const isSamePos = key.includes('samePos');
  const relation = isRival ? '{oppTeam}这种对手' : isFriend ? '{playerName}这种朋友兼对手' : isSamePos ? '同位置竞争' : '{oppTeam}这场对抗';
  const tone = isRival ? 'competitive' : isFriend ? 'positive' : isWeak ? 'neutral' : 'positive';
  const openers = isRest
    ? ['休息日没有比赛，但真正的竞争不会停。', '今天训练结束后，我又看了一段录像。', '没有灯光和观众的时候，很多答案反而更清楚。']
    : isWeak
      ? ['今晚不是我想要的结果。', '这场球让我很不舒服，但也很必要。', '输球之后最重要的不是解释，而是找到下一步。']
      : ['今晚的对抗质量很高。', '这种比赛会让人记很久。', '我喜欢这种需要每回合都全神贯注的夜晚。'];
  const middles = [
    `面对${relation}，你不能只靠情绪打球，必须把脚步、身体对抗和阅读比赛全部放在同一个节奏里。`,
    `我尊重${relation}带来的压力，因为压力会暴露问题，也会把一个球员真正的准备程度逼出来。`,
    `很多人只看最后的比分，但球员自己知道，几个不起眼的回合、一次卡位、一次提前沟通，才是差距的来源。`,
    `我会把这场球放进自己的训练计划里，不是为了发泄，而是为了让下次交手时每一个选择都更快、更准。`
  ];
  const endings = isFriend
    ? ['场上我们互不相让，场下我依然希望他越来越好。真正的关系经得起竞争。', '下次见面我们还会全力以赴，这才是互相尊重的方式。']
    : isRival
      ? ['下次碰面，不需要多说，球场会给出答案。', '这段竞争还没结束，我会记住今晚的每一个细节。']
      : ['赛季很长，今晚只是其中一页，但这一页值得认真读。', '继续工作，继续调整，下一场见。'];
  const afterthoughts = [
    '真正重要的是录像室里的下一次暂停、训练馆里的下一次重复，以及队友之间有没有把同一个细节讲清楚。',
    '球迷看到的是情绪，球员必须把情绪拆成站位、沟通、出手选择和防守纪律，这才是赛季里最有价值的部分。',
    '这种夜晚会提醒所有人，天赋只是入场券，能不能在压力下稳定执行，才决定一支球队能走多远。'
  ];
  return Array.from({ length: count }, (_, i) => ({
    text: `${pickCycle(openers, i)}${pickCycle(middles, i * 3 + 1)}${pickCycle(endings, i * 5 + 2)}${pickCycle(afterthoughts, i * 7 + 3)}`,
    tone,
    affinityDelta: isFriend ? 3 : isRival ? -2 : 0,
    respectDelta: isWeak ? 1 : 3,
    heatDelta: isRival ? 5 : isWeak ? 2 : 3
  }));
}

function makeLongCommercialStrings(category, count, cfg) {
  const hooks = cfg.hooks || ['{playerName}的商业团队完成了一次重要沟通'];
  const details = cfg.details || ['品牌方关注的不只是曝光量，还有球员在年轻人群中的长期信任度'];
  const business = cfg.business || ['这类合作会影响接下来几个赛季的商业定位'];
  const endings = cfg.endings || ['如果球场表现继续稳定，后续报价还会继续上浮。'];
  return Array.from({ length: count }, (_, i) => (
    `${pickCycle(hooks, i)}，围绕{brand}的{category}业务展开了更细的方案讨论。${pickCycle(details, i * 2 + 1)}，而{label}级别的合作不再只是拍一支广告那么简单。${pickCycle(business, i * 3 + 2)}。${pickCycle(endings, i * 5 + 3)}`
  ));
}

function makeLongScoutEntries(category, count, cfg) {
  const summaries = cfg.summaries || ['这名新秀的比赛样本比表面数据更有信息量。'];
  const projections = cfg.projections || ['如果球队愿意给他清晰角色，他有机会在新秀合同内进入稳定轮换。'];
  const strengths = cfg.strengths || ['比赛阅读比同龄人成熟', '训练习惯和职业态度可靠', '能在体系内完成多种小任务'];
  const weaknesses = cfg.weaknesses || ['高压防守下处理球还需要加速', '身体对抗进入NBA后需要重新适应', '投篮稳定性仍需更长样本验证'];
  return Array.from({ length: count }, (_, i) => ({
    summary: `${pickCycle(summaries, i)}球探组最看重的不是单场高分，而是他在连续赛程里能否维持决策质量、对抗强度和无球纪律。把他放进{draftYear}届整体环境里看，他不是最容易剪出高光的新秀，却是那种越看录像越能发现细节价值的球员。`,
    projection: `${pickCycle(projections, i * 2 + 1)}他的落点会很依赖球队耐心：如果被要求立刻承担过多自主进攻，短板会被放大；如果从防守、转换和简单终结切入，成长曲线会更顺。真正适合他的环境，是能给清晰角色、稳定训练反馈，并允许他在第二阵容里逐步增加处理球责任的球队。`,
    strengths: [
      pickCycle(strengths, i),
      pickCycle(strengths, i + 1),
      pickCycle(strengths, i + 2),
      '能够接受明确分工，不会因为球权少就脱离体系'
    ],
    weaknesses: [
      pickCycle(weaknesses, i),
      pickCycle(weaknesses, i + 1),
      '需要把训练中的稳定性转化到更长赛程和更强对抗中'
    ]
  }));
}

function expandSocialPools() {
  if (typeof TEXT_POOL_SOCIAL === 'undefined') return 0;
  const configs = {
    game_analysis: {
      persona: 'tactical',
      tone: 'neutral',
      subjects: ['{playerName}的比赛影响力', '{teamName}今晚的攻防选择', '{oppName}给出的防守压力', '第四节几个关键回合', '替补阵容的衔接问题'],
      lenses: ['挡拆质量、弱侧站位和退防速度', '教练临场调整和球员执行力', '转换进攻与阵地战切换', '犯规尺度、体能分配和轮换深度'],
      details: ['弱侧底角连续被放空，说明沟通链条出现了断点', '高位掩护后的第二选择越来越清晰，说明训练内容正在兑现', '对手每次暂停回来都能改变防守站位，逼出了更多中距离和抛投', '篮板保护不只是内线责任，后卫回收和卡位同样影响二次进攻'],
      stakes: ['这会决定{teamName}接下来是否敢继续使用小阵容', '这会影响教练组对{playerName}的信任和末节球权', '这会成为下一次交手前最重要的录像课内容'],
      endings: ['真正成熟的球队，会把这种比赛拆成几十个能训练的细节。', '如果只看数据，很容易错过今晚最有价值的部分。']
    },
    trade_rumors: {
      persona: 'news',
      tone: 'neutral',
      subjects: ['{teamName}管理层的动作', '{oppName}近期的人员评估', '截止日前的交易流言', '{teamName}的薪资空间和选秀权', '更衣室角色分配的变化'],
      lenses: ['合同年、轮换需求和未来首轮价值', '球队窗口期、老板耐心和奢侈税压力', '买断市场、双向合同和发展联盟储备'],
      details: ['有球员对出场时间产生疑问，前台需要判断这是短期情绪还是长期结构问题', '几支重建队已经开始听取报价，但要价仍然停留在试探阶段', '医疗报告和合同年限正在成为谈判桌上的关键阻力'],
      stakes: ['这会影响{playerName}未来几周的轮换环境', '这可能改变球队季后赛前的真实上限', '这类传闻会让更衣室在短期内变得更敏感'],
      endings: ['交易市场最难的部分不是找到目标，而是判断什么时候该停止加价。', '如果战绩继续波动，这些消息会越来越密集。']
    },
    injuries: {
      persona: 'news',
      tone: 'neutral',
      subjects: ['{teamName}的伤病管理', '{playerName}的身体状态', '背靠背后的恢复情况', '医疗组给出的保守计划', '训练负荷的调整'],
      lenses: ['软组织风险、赛程密度和出场时间控制', '康复训练、力量测试和复出窗口', '球队轮换深度和临时替代方案'],
      details: ['队医更关心连续高强度移动后的反应，而不是一次投篮训练的手感', '教练组已经把部分对抗训练改成低冲击内容，避免小伤拖成长期问题', '球员本人想尽快回到场上，但医疗团队会优先看长期健康'],
      stakes: ['这会直接影响接下来几场的分钟安排', '这会改变球队对训练和休息日的规划', '这会让球迷重新关注负荷管理的重要性'],
      endings: ['健康从来不是新闻里最响的词，但它往往决定赛季走向。', '越接近关键阶段，越不能用一场比赛赌掉整个赛季。']
    },
    rankings: {
      persona: 'data',
      tone: 'neutral',
      subjects: ['最新实力榜里的{teamName}', '{playerName}的进阶数据', '同位置排名的变化', '{teamName}的净效率', '本周最佳候选讨论'],
      lenses: ['真实命中率、使用率和在场正负值', '关键球胜率、第四节净效率和失误率', '主客场差异、赛程强度和背靠背表现'],
      details: ['单看场均数据会低估无球跑动和防守协防的价值', '排名上升不是因为一场爆发，而是连续多场保持了稳定下限', '效率下滑的背后可能是角色变化，而不只是状态问题'],
      stakes: ['这会影响媒体对{playerName}赛季定位的判断', '这会进入奖项讨论和全明星投票的参考范围', '这会决定外界是否把{teamName}当成真正竞争者'],
      endings: ['数据不是答案本身，但它能逼人提出更好的问题。', '如果接下来两周样本继续扩大，这个趋势就很难被忽视。']
    },
    draft_preview: {
      persona: 'data',
      tone: 'neutral',
      subjects: ['本届新秀观察', '{teamName}的选秀策略', '联合试训后的行情变化', '球探部门的最后排序', '首轮中段的选择难题'],
      lenses: ['年龄、体测、投篮样本和防守可迁移性', '球队需求、最好可用球员和培养周期', '面试反馈、训练态度和医疗报告'],
      details: ['有些球员高光很多，但球探更在意他们低迷时能否继续做正确的小事', '国际球员的评估难点在于节奏转换和对抗强度差异', '即战力和潜力的取舍会让很多前台在选秀夜犹豫'],
      stakes: ['这会影响{teamName}未来两三年的建队弹性', '这会决定年轻核心身边需要什么类型的拼图', '这类选择一旦做错，代价不会只体现在新秀赛季'],
      endings: ['选秀不是找最会得分的人，而是找最适合被长期投资的人。', '真正好的球探报告，会把风险写得和天赋一样清楚。']
    },
    coaching: {
      persona: 'tactical',
      tone: 'neutral',
      subjects: ['教练组今天的调整', '{teamName}的战术纪律', '轮换表背后的信号', '暂停之后的第一攻', '主教练对{playerName}的使用方式'],
      lenses: ['体系契合、信任曲线和球权分配', '防守优先级、错位惩罚和临场换人', '训练内容、录像复盘和长期角色规划'],
      details: ['末节是否留在场上，比单场出手数更能说明教练的真实态度', '暂停回来连续打同一侧战术，说明教练组已经锁定了对手防守弱点', '有些换人看似保守，其实是在保护球员体能和犯规数'],
      stakes: ['这会影响{playerName}之后的对话策略', '这会让更衣室重新判断谁是真正被信任的人', '这会决定年轻球员能否在体系里稳定成长'],
      endings: ['教练和球员之间的关系，很多时候不是一句话改变，而是几十个回合慢慢累积。', '真正的战术地位，往往藏在最后五分钟的换人里。']
    },
    rest_day: {
      persona: 'casual',
      tone: 'neutral',
      subjects: ['没有比赛的休息日', '{playerName}的恢复安排', '{teamName}训练馆的轻量课', '球队客场旅途中的空档', '赛季中期的身体维护'],
      lenses: ['睡眠、饮食、拉伸和录像', '心理恢复、家庭联系和商业行程', '投篮手感、核心力量和低冲击有氧'],
      details: ['这种日子不会出现在精彩集锦里，却会在两个月后的体能储备里体现出来', '老将最懂得休息不是偷懒，而是把身体留给真正重要的比赛', '年轻球员往往想多练，训练师则不断提醒他们学会停下来'],
      stakes: ['这会影响下一场比赛的爆发力和专注度', '这会让教练组判断球员是否懂得管理职业生涯', '这类细节会慢慢变成稳定性的来源'],
      endings: ['漫长赛季不是靠热血撑完的，而是靠每个休息日的正确选择。', '真正职业的球员，知道什么时候该练，也知道什么时候该恢复。']
    },
    culture: {
      persona: 'casual',
      tone: 'neutral',
      subjects: ['更衣室里的小细节', '{teamName}球迷文化', '{playerName}和城市的连接', '球队内部的日常氛围', '年轻球员融入球队的方式'],
      lenses: ['音乐、餐厅、社区活动和球迷互动', '队友玩笑、老将规矩和新秀任务', '城市认同、媒体期待和本地传统'],
      details: ['一个球员是否真正属于一座城市，往往不是看广告牌，而是看普通球迷怎么谈起他', '更衣室气氛有时候比战术板更早反映球队状态', '年轻球员学会的不只是打法，还有如何在联盟里生活'],
      stakes: ['这会影响{playerName}的长期声望和队友关系', '这会让球迷更愿意接受他的低谷期', '这类文化连接会慢慢转化成主场的耐心'],
      endings: ['篮球不只是48分钟，很多故事发生在计分板之外。', '真正让人记住的球员，通常也会留下属于城市的细节。']
    },
    gambling: {
      persona: 'data',
      tone: 'neutral',
      subjects: ['盘口变化里的{teamName}', '{playerName}出场状态对赔率的影响', '背靠背赛程下的市场反应', '临场伤病消息后的指数波动', '大小分走势'],
      lenses: ['出场时间、节奏预期和防守效率', '主客场差异、休息天数和轮换深度', '末节得分能力、罚球稳定性和垃圾时间风险'],
      details: ['盘口不是预测未来的水晶球，它更多反映市场对信息的即时定价', '一条分钟限制消息就足以改变整场比赛的投注逻辑', '真正有价值的信息通常不是谁更强，而是谁的状态被市场低估了'],
      stakes: ['这会让外界更关注{playerName}是否进入稳定轮换', '这会放大赛前每一条训练和伤病更新', '这类讨论会让比赛之外的舆论更吵'],
      endings: ['看盘口可以理解市场情绪，但球场上仍然要靠回合说话。', '数字会波动，真正稳定的是球队每天的准备质量。']
    },
    deep_stats: {
      persona: 'data',
      tone: 'neutral',
      subjects: ['进阶数据里的{playerName}', '{teamName}的阵容组合样本', '五人组净效率', '真实命中率与使用率的关系', '防守端隐形贡献'],
      lenses: ['on/off、助攻率、失误率和篮板保护', '半场阵地效率、转换频率和罚球率', '对位难度、协防次数和弱侧轮转'],
      details: ['有些回合他没有得分也没有助攻，但提前站位让对手放弃了第一选择', '当他和第二阵容同时在场时，球队节奏更快，失误却没有明显增加', '真实命中率上升的同时使用率没有暴涨，说明他不是靠堆出手制造数据'],
      stakes: ['这会改变外界对{playerName}角色价值的评价', '这会给教练组继续调整轮换提供证据', '这会让奖项讨论变得更有层次'],
      endings: ['进阶数据不是为了替代眼睛，而是提醒我们该看哪里。', '当录像和数据指向同一个结论时，那个结论通常值得重视。']
    }
  };
  let added = 0;
  Object.entries(configs).forEach(([key, cfg]) => {
    added += appendPoolEntries(TEXT_POOL_SOCIAL, key, makeLongSocialEntries(key, cfg.persona, cfg.tone, 44, cfg));
  });
  return added;
}

function expandStoryPools() {
  if (typeof TEXT_POOL_STORY === 'undefined') return 0;
  const commonGame = {
    openers: ['终场哨响后，{playerName}没有立刻走向球员通道。', '回到更衣室时，{playerName}先把毛巾盖在头上安静坐了很久。', '媒体区的灯光还没熄，{playerName}已经在脑子里复盘最后几个回合。'],
    scenes: ['队友们有的在笑，有的在低头看数据板，空气里混着汗味、冰袋声和助教翻录像的声音。', '教练没有马上讲话，只是把战术板放在椅子上，让所有人先把情绪沉下来。', '一名老将走过来拍了拍他的肩膀，没有长篇大论，只说了一句明天继续。'],
    beats: ['他想起第二节那个没有传出去的空位，也想起第四节自己主动要球的瞬间。', '数据员把关键回合剪出来，几个看似普通的站位变化突然变得刺眼。', '手机里不断弹出球迷和记者的消息，但他先点开的是球队内部的复盘片段。'],
    reflections: ['这种夜晚最真实的部分不在采访里，而在球员愿不愿意承认自己还有细节可以修。', '漫长赛季不会因为一场球定型，但一场球足以暴露一个阶段的成长方向。', '他知道外界会给出简单标签，可真正的答案只存在于下一次训练和下一场比赛里。'],
    endings: ['离开球馆时，走廊只剩保洁车的声音，他把耳机戴上，开始想下一场。', '睡前他在笔记里写下三个词：节奏、对抗、选择。', '第二天的训练计划已经发到手机上，他没有回复，只把闹钟调早了半小时。']
  };
  const rest = {
    openers: ['休息日的早晨，{playerName}没有被比赛日闹钟吵醒。', '训练馆今天没有观众，也没有转播镜头。', '客场酒店的窗帘拉开时，城市的声音已经从街道传了上来。'],
    scenes: ['他先完成了拉伸和低强度有氧，然后在理疗室里做了二十分钟冰敷。', '助理教练带来一段剪辑，里面全是他最近几场的无球跑位和防守站位。', '经纪人打来电话，提醒他下午还有一个品牌会议，但训练师要求他先把恢复做完。'],
    beats: ['这种安排看起来不精彩，却是职业球员能否撑完整个赛季的底层工程。', '他开始明白，休息不是脱离篮球，而是用另一种方式为比赛做准备。', '几个年轻队友路过时还想加练，他笑着提醒他们先去吃饭。'],
    reflections: ['比起一场爆发，教练组更看重球员能不能连续三周保持同样的准备质量。', '真正的成长经常发生在没有掌声的日子里。', '职业生涯很长，懂得管理身体的人才有机会把天赋兑现到最后。'],
    endings: ['晚上回到家，他没有打开游戏机，而是把下一场对手的录像看完。', '睡前他给家里打了一个电话，声音听起来比前几天轻松很多。', '他在训练日志最后写了一句：今天不是空白日。']
  };
  const configs = {
    game_close_win: { ...commonGame, changes: { mood: 12, fame: 9 } },
    game_close_loss: { ...commonGame, changes: { mood: -12, fame: -2 } },
    game_blowout_win: { ...commonGame, changes: { mood: 8, fame: 5 } },
    game_blowout_loss: { ...commonGame, changes: { mood: -14, fame: -4 } },
    game_average_win: { ...commonGame, changes: { mood: 7, fame: 4 } },
    game_average_loss: { ...commonGame, changes: { mood: -7, fame: -2 } },
    rest_training: { ...rest, changes: { mood: -1, fame: 1 } },
    rest_recovery: { ...rest, changes: { mood: 5, fame: 0 } },
    rest_interview: { ...rest, changes: { mood: 2, cash: 0.08, fame: 5 } },
    rest_brand: { ...rest, changes: { mood: 2, cash: 0.15, fame: 4 } },
    rest_personal: { ...rest, changes: { mood: 6, fame: 1 } }
  };
  let added = 0;
  Object.entries(configs).forEach(([key, cfg]) => {
    added += appendPoolEntries(TEXT_POOL_STORY, key, makeLongStoryEntries(key, 28, cfg.changes, cfg));
  });
  return added;
}

function expandRecapPools() {
  if (typeof TEXT_POOL_RECAP === 'undefined') return 0;
  const configs = {
    win_close: {
      headlines: ['{playerName}关键回合定胜负', '{playerName}冷静收尾险胜', '最后一分钟见真章，{playerName}守住胜利'],
      starts: ['这是一场每个回合都被放大的比赛。', '胜利一直悬在空中，直到最后一次防守才真正落地。'],
      middles: ['他在末节的选择明显更耐心，几次没有直接攻框，而是先观察底角和顺下路线。', '最关键的不是某一个进球，而是他连续几个回合都没有把球权浪费在低质量出手上。'],
      tactical: ['防守端的换防沟通也很关键，尤其是最后两分钟连续把对手赶向边线。', '暂停之后球队把球交给他发起高位挡拆，弱侧射手的站位让包夹变得困难。'],
      endings: ['险胜不会掩盖问题，但它会给球队足够的信心继续修正问题。']
    },
    win_comfortable: {
      headlines: ['{playerName}稳控节奏拿下比赛', '{playerName}带队完成控制性胜利', '不靠奇迹，{playerName}稳稳收下胜利'],
      starts: ['这场胜利没有太多戏剧性，但含金量并不低。', '从第二节开始，比赛逐渐进入{teamName}熟悉的节奏。'],
      middles: ['他把个人进攻和团队传导结合得很顺，既没有沉迷单打，也没有在该出手时犹豫。', '球队最舒服的地方在于每次对手试图追分，他都能用一个稳妥选择把局面拉回来。'],
      tactical: ['教练组的轮换也更从容，主力没有被迫透支，替补得到了一段有质量的比赛时间。', '防守端收缩和外扑的节奏保持得很好，对手始终很难连续打出高潮。'],
      endings: ['这种胜利最适合漫长赛季，因为它消耗可控，也能巩固体系信心。']
    },
    win_blowout: {
      headlines: ['{playerName}三节打卡，球队大胜', '{playerName}率队早早打花比赛', '从开局压到终场，{playerName}完成碾压局'],
      starts: ['这场比赛很早就失去了悬念。', '分差不是突然被拉开的，而是在一个个高质量回合里慢慢堆出来的。'],
      middles: ['他没有因为领先就放松细节，退防、卡位和无球跑动依然保持标准。', '三节结束时教练就让他坐下，说明球队已经完全控制了风险和节奏。'],
      tactical: ['对手的防守策略被连续拆解，先是挡拆被打穿，随后弱侧轮转也开始迟疑。', '替补阵容延续了主力的防守强度，这是大胜最让教练组满意的部分。'],
      endings: ['大胜当然值得高兴，但真正有价值的是球队用低消耗完成了高质量执行。']
    },
    loss_close: {
      headlines: ['{playerName}拼到最后仍惜败', '差一个回合，{playerName}遗憾吞败', '{playerName}末节追分未果'],
      starts: ['这是一场很难马上消化的失利。', '比分只差一点，但复盘时会发现问题远不止最后一球。'],
      middles: ['他在最后几分钟承担了很重的进攻责任，几次选择并不糟糕，只是对手的防守给得更坚决。', '真正刺痛球队的是几个本可以提前处理好的细节：一次篮板保护、一次边线球、一次退防沟通。'],
      tactical: ['对手最后选择夹击持球点，迫使{teamName}让其他人完成终结，这个策略收到了效果。', '暂停之后的战术没有完全跑出来，第一接应点被卡住后，进攻只能进入临时单打。'],
      endings: ['惜败不会毁掉赛季，但它会把球队最需要修的地方摆到所有人面前。']
    },
    loss_comfortable: {
      headlines: ['{playerName}苦撑全场，球队仍被压制', '{playerName}难阻失利，体系问题暴露', '分差被拉开，{playerName}无力回天'],
      starts: ['这场失利不是单一回合造成的。', '从比赛中段开始，{teamName}就一直在追赶对手的节奏。'],
      middles: ['他试图通过个人进攻止血，但球队在防守端给出的回应不够连续。', '几次追分势头刚起来，就被对手用进攻篮板或转换得分压了回去。'],
      tactical: ['对手明显针对了{teamName}的弱侧轮转，连续把球转移到底角和肘区。', '教练组尝试过小阵容和双塔，但都没有解决退防慢和篮板保护不足的问题。'],
      endings: ['这类失利需要的是系统性修正，而不是赛后几句情绪化总结。']
    },
    loss_blowout: {
      headlines: ['{playerName}经历赛季低谷一夜', '{playerName}和球队遭遇惨败', '大比分失利，{playerName}赛后沉默'],
      starts: ['这是一场从录像课开始就会很难看的比赛。', '分差很早被拉开，之后每一次追分都像撞在墙上。'],
      middles: ['他在场上仍然试图沟通和调整，但球队整体的脚步、对抗和注意力都慢了一拍。', '数据已经不是最重要的问题，真正的问题是球队在连续失误后失去了基本的比赛秩序。'],
      tactical: ['对手不断攻击同一个防守弱点，直到{teamName}被迫改变阵容，却依然没有找到答案。', '垃圾时间提前到来，教练组更关心的是如何让主力少受伤、让年轻球员吸取教训。'],
      endings: ['惨败没有任何体面可言，但它至少能让球队无法继续忽视那些长期存在的问题。']
    }
  };
  let added = 0;
  Object.entries(configs).forEach(([key, cfg]) => {
    added += appendPoolEntries(TEXT_POOL_RECAP, key, makeLongRecaps(key, 30, cfg));
  });
  return added;
}

function expandStarPools() {
  if (typeof TEXT_POOL_STAR === 'undefined') return 0;
  let added = 0;
  Object.keys(TEXT_POOL_STAR).forEach(key => {
    added += appendPoolEntries(TEXT_POOL_STAR, key, makeLongStarPosts(key, 26));
  });
  return added;
}

function expandCommercialPools() {
  if (typeof TEXT_POOL_COMMERCIAL === 'undefined') return 0;
  const configs = {
    endorsement_sign: {
      hooks: ['{playerName}正式把商业版图推进到新阶段', '{brand}今天完成了与{playerName}的核心签约', '围绕{playerName}的品牌发布会现场气氛很热'],
      details: ['品牌希望把他的球场成长故事转化成更长期的年轻化叙事', '经纪团队争取到了更高比例的激励条款和区域活动自主权'],
      business: ['签约后会安排城市快闪、线上短片和赛季节点联动', '这份合同会把球场表现、社媒热度和产品销量直接绑定'],
      endings: ['这不是一次短线曝光，而是一次明确的人设投资。']
    },
    endorsement_reject: {
      hooks: ['{playerName}团队经过评估后按下了暂停键', '{brand}的报价没有被马上接受', '这次{category}邀约最终没有进入签约阶段'],
      details: ['球员方面担心排他条款压缩未来更大品牌的合作空间', '报价并不低，但品牌调性和球员正在建立的人设不完全一致'],
      business: ['拒绝短期现金有时是为了保护长期议价能力', '商业团队希望等赛季表现更稳定后再重新定价'],
      endings: ['这类决定不会马上带来收益，但能避免错误标签过早贴上。']
    },
    signature_shoe: {
      hooks: ['{playerName}的签名鞋项目进入真正落地阶段', '{brand}把{playerName}的比赛风格写进了鞋款设计', '球鞋圈终于等到{playerName}的个人系列'],
      details: ['设计团队把他的第一步爆发、急停节奏和城市记忆都做成了细节语言', '首发配色不只追求抢眼，也试图讲清楚球员从新秀到核心的成长线'],
      business: ['签名鞋会成为商业身份的核心锚点', '销售表现会影响后续配色、海外市场和儿童线规划'],
      endings: ['如果球场上继续打出代表作，这双鞋会很快拥有自己的故事。']
    },
    luxury_purchase: {
      hooks: ['{playerName}完成了一笔高调消费', '社交媒体注意到了{playerName}的新收藏', '商业收入增长后，{playerName}开始调整个人资产配置'],
      details: ['外界看到的是奢华，团队内部更关注保值、曝光和个人品牌形象', '这笔消费被拍到后迅速发酵，球迷开始讨论球员该如何平衡享受和职业专注'],
      business: ['高端消费会带来关注，也会带来更严格的舆论审视', '经纪团队需要把生活方式包装成可控的人设，而不是炫耀风险'],
      endings: ['球场表现稳定时，这会被看作品味；表现下滑时，它就会变成争议。']
    },
    coach_upgrade: {
      hooks: ['{playerName}对训练团队做了实际投入', '私人教练团队今天完成升级', '围绕{playerName}的训练体系开始变得更专业'],
      details: ['新教练不会只改一个动作，而是从力量、出手节奏和疲劳后的决策一起调整', '团队要求每次训练都留下数据报告，避免只凭感觉判断进步'],
      business: ['这类投入短期看不见热搜，长期会体现在出勤率和效率稳定性上', '高质量训练团队也是商业团队说服品牌的重要素材'],
      endings: ['真正聪明的球员，会把第一笔大钱花在延长职业生命上。']
    },
    facility_upgrade: {
      hooks: ['{playerName}的私人训练空间完成新一轮升级', '训练基地新增了一批针对性设备', '恢复和力量区的改造今天正式启用'],
      details: ['新系统会记录疲劳状态、起跳高度和左右脚发力差异，帮助训练师更早发现风险', '球员可以在非球队训练时间完成投篮、恢复和力量维护，不再完全依赖赛程安排'],
      business: ['训练设施本身也会成为媒体内容和品牌合作场景', '这类基础设施投入会提高长期稳定性，也会强化职业形象'],
      endings: ['看似是场外消费，实际是把职业生涯的主动权握得更紧。']
    },
    media_event: {
      hooks: ['{playerName}今天完成了一场高密度媒体活动', '{brand}把{playerName}安排在发布会最核心的位置', '媒体日的最大话题落在了{playerName}身上'],
      details: ['他没有只说套话，而是把训练、城市和球队目标串成了一个完整故事', '几个回答很快被剪成短视频，尤其是谈到责任和成长的部分传播很快'],
      business: ['高质量媒体表现会提高品牌对他的安全感', '采访能力会直接影响他能否从单纯代言人升级为品牌叙事中心'],
      endings: ['镜头前的成熟，正在成为他球场外竞争力的一部分。']
    },
    brand_interest: {
      hooks: ['{brand}已经把{playerName}列入下一阶段观察名单', '商业市场开始重新评估{playerName}的上升空间', '{category}品牌方近期频繁关注{playerName}的比赛和社媒数据'],
      details: ['品牌还没有正式报价，但已经在收集城市影响力、球迷画像和比赛曝光曲线', '他们最看重的不是一场高分，而是能否稳定出现在正面讨论里'],
      business: ['意向阶段最重要的是保持人设一致，不要急着接低匹配度合作', '如果未来一个月表现继续走高，正式报价会很快出现'],
      endings: ['商业机会通常先以传闻出现，然后才会变成合同。']
    },
    default: {
      hooks: ['{playerName}的商业日程又多了一项新内容', '经纪团队今天处理了一次常规商业沟通', '围绕{playerName}的场外价值仍在增长'],
      details: ['团队把曝光、现金流和长期人设放在同一张表里评估', '每个合作都会被拆成短期收入、信任风险和未来议价三部分'],
      business: ['球场表现仍然是所有商业价值的底盘', '只要竞技状态不掉线，场外机会就会持续堆积'],
      endings: ['真正健康的商业成长，应该让球员更自由，而不是更分心。']
    },
    _extra: {
      hooks: ['场外团队为{playerName}准备了一个备用商业方案', '一个临时出现的{category}机会进入评估流程', '品牌侧提出了新的活动创意'],
      details: ['方案需要兼顾赛程、恢复和球队内部对球员专注度的看法', '创意听起来热闹，但团队会先判断它是否消耗过多精力'],
      business: ['不是所有曝光都值得接，尤其是在赛季密集阶段', '越是年轻球员，越需要控制商业节奏'],
      endings: ['这次机会是否推进，取决于下一周的比赛和身体反馈。']
    }
  };
  let added = 0;
  Object.entries(configs).forEach(([key, cfg]) => {
    added += appendPoolEntries(TEXT_POOL_COMMERCIAL, key, makeLongCommercialStrings(key, 26, cfg));
  });
  return added;
}

function expandScoutPools() {
  if (typeof TEXT_POOL_SCOUT === 'undefined') return 0;
  const byPos = {
    pg: { summaries: ['这名控卫的价值在于他能把混乱回合重新整理成可执行的战术。'], projections: ['他最理想的起步方式是先从第二阵容控场开始。'], strengths: ['挡拆阅读成熟', '助攻失误比稳定', '能控制比赛节奏'], weaknesses: ['对抗后的终结需要提升', '三分稳定性还需验证'] },
    sg: { summaries: ['这名得分后卫的无球移动和接球投篮让球探组反复暂停录像。'], projections: ['如果投射能立刻适应NBA距离，他很快会成为轮换射手。'], strengths: ['接球投篮流畅', '无球跑动积极', '转换跟进意识好'], weaknesses: ['持球创造有限', '防守端容易被强壮侧翼点名'] },
    sf: { summaries: ['这名侧翼的稀缺性来自尺寸、移动和多位置适配。'], projections: ['他适合从3D侧翼角色起步，再慢慢扩展持球内容。'], strengths: ['多位置防守潜力', '转换进攻价值高', '底角投射可培养'], weaknesses: ['控球稳定性一般', '半场阵地战存在感波动'] },
    pf: { summaries: ['这名前锋的卖点是能在四号位提供空间和协防。'], projections: ['合适体系下，他有机会成为现代空间四号位轮换。'], strengths: ['协防覆盖面积大', '顺下和外弹都有威胁', '篮板卡位习惯好'], weaknesses: ['低位单打不够成熟', '面对重型内线对抗吃亏'] },
    c: { summaries: ['这名中锋的价值不只在盖帽，而在他能改变对手进攻路线。'], projections: ['他会先靠护筐和篮板进入轮换，进攻端逐步加内容。'], strengths: ['护筐位置感好', '掩护质量扎实', '防守篮板保护稳定'], weaknesses: ['罚球和中距离需要打磨', '换防到外线时脚步压力较大'] }
  };
  let added = 0;
  Object.keys(TEXT_POOL_SCOUT).forEach(key => {
    const pos = key.split('_')[0];
    added += appendPoolEntries(TEXT_POOL_SCOUT, key, makeLongScoutEntries(key, 10, byPos[pos] || byPos.sf));
  });
  return added;
}

const addedByCategory = {
  social: expandSocialPools(),
  story: expandStoryPools(),
  recap: expandRecapPools(),
  star: expandStarPools(),
  commercial: expandCommercialPools(),
  scout: expandScoutPools()
};
const addedTotal = Object.values(addedByCategory).reduce((sum, count) => sum + count, 0);

if (typeof window !== 'undefined') {
  window.TEXT_POOL_LONG_EXPANSION_COUNT = addedTotal;
  window.TEXT_POOL_LONG_EXPANSION_BY_CATEGORY = addedByCategory;
}

})();
