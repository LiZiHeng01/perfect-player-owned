(function () {
  'use strict';

  var contexts = [
    { id:'home', tag:'主场训练日', opening:'主场训练结束后，球馆里只剩工作人员', result:'这次处理很快在主场更衣室里形成了新的默契。' },
    { id:'road', tag:'客场比赛日', opening:'客场比赛日的清晨，球队刚从机场赶到酒店', result:'客场行程放大了这次选择的影响。' },
    { id:'streak', tag:'连胜期间', opening:'三连胜后，全队气氛轻松，但教练提醒大家别放松', result:'连胜没有掩盖问题，你的态度被队友记住了。' },
    { id:'slump', tag:'连败之后', opening:'连续失利后，更衣室里每个人说话都格外谨慎', result:'连败压力下的决定，让球队重新认识了你。' },
    { id:'national', tag:'全国直播前', opening:'全国直播前，媒体和工作人员挤满了球馆通道', result:'聚光灯让这次普通决定获得了更多关注。' },
    { id:'deadline', tag:'截止日前夕', opening:'交易截止日前夕，所有人的手机都在不断震动', result:'流言最密集的时候，你给出了清晰信号。' }
  ];

  var topics = [
    { id:'bench_role', title:'替补角色调整', scene:'教练希望你临时带第二阵容，出手会减少，但控球责任更重。', body:'球队需要有人让替补席保持秩序。', a:{label:'接受组织任务',hint:'牺牲出手换取球队执行',profile:{coachTrust:2},mods:{teamChemistry:2},result:'你把节奏压稳，替补阵容第一次没有在衔接段丢分。'}, b:{label:'争取保留进攻权',hint:'维持个人威胁',profile:{leadership:1,coachTrust:-1},mods:{moraleBonus:1},result:'你保留了几套持球战术，也接受了更严格的效率要求。'} },
    { id:'film_session', title:'额外录像课', scene:'录像师整理出你最近五场的所有防守回合，邀请你晚上留下复盘。', body:'细节不会出现在数据栏，却会决定下一次轮换。', a:{label:'留下逐回合复盘',hint:'用时间修正细节',profile:{coachTrust:2},mods:{formVariance:-1,staminaLoad:1},result:'你记下每次站位偏差，下一场提前半步堵住了路线。'}, b:{label:'带走剪辑自己看',hint:'保留恢复安排',profile:{leadership:1},mods:{staminaLoad:-1},result:'你把视频带回酒店，按自己的节奏完成了复盘。'} },
    { id:'switch_defense', title:'换防沟通', scene:'训练赛里连续两次换防失误，内线队友认为口令一直不够清楚。', body:'防守默契往往从一句准确的提醒开始。', a:{label:'统一全队口令',hint:'主动解决沟通问题',profile:{lockerRoomTrust:2},mods:{teamChemistry:2},result:'你们重新约定了口令，训练赛再也没有出现同样的空位。'}, b:{label:'先强化个人判断',hint:'减少对队友提醒的依赖',profile:{coachTrust:1},mods:{formVariance:-1},result:'你把每套掩护路线单独记熟，判断速度明显加快。'} },
    { id:'shot_map', title:'投篮分布报告', scene:'数据组递来一张投篮热区图，建议你主动放弃效率最低的两个位置。', body:'优化数据可能提高效率，也可能让进攻变得容易预测。', a:{label:'严格执行热区方案',hint:'提高出手质量',profile:{coachTrust:1},mods:{formVariance:-2},result:'你的出手更集中，命中率很快回升。'}, b:{label:'保留低效位置训练',hint:'维护进攻完整性',profile:{leadership:1},mods:{formVariance:1,moraleBonus:1},result:'你没有删掉那些出手，而是给自己增加了专项训练。'} },
    { id:'late_pass', title:'关键传球选择', scene:'助教指出你在关键回合总晚半拍传球，队友已经开始提前放弃跑位。', body:'明星处理球和信任队友并不冲突。', a:{label:'下场优先寻找队友',hint:'重新建立传球预期',profile:{lockerRoomTrust:2},mods:{teamChemistry:2},result:'你开场连续送出助攻，弱侧跑动重新活了起来。'}, b:{label:'和队友重画终结战术',hint:'明确谁在何时接管',profile:{leadership:2},mods:{teamChemistry:1},result:'你们把最后两分钟的每个选择都讲清楚，不再靠猜。'} },
    { id:'free_throw', title:'罚球节奏变化', scene:'投篮教练发现你的罚球准备动作越来越长，建议立刻缩短流程。', body:'越简单的动作，改变起来越需要勇气。', a:{label:'马上采用新节奏',hint:'快速修正但承担波动',profile:{coachTrust:1},mods:{formVariance:1},result:'动作变短后前几球不稳，但身体明显更放松。'}, b:{label:'赛季后再重做动作',hint:'维持当前稳定性',mods:{formVariance:-1},result:'你只调整呼吸，没有在赛季中拆掉整套动作。'} },
    { id:'weight_room', title:'力量房加码', scene:'体能教练希望你增加下肢力量课，以应对最近明显增多的身体对抗。', body:'力量提升和赛季疲劳需要同时计算。', a:{label:'增加力量训练',hint:'提高对抗准备',profile:{coachTrust:1},mods:{staminaLoad:2,injuryRiskBonus:-1},result:'训练很累，但你在对抗中终于不再轻易失去平衡。'}, b:{label:'维持原有负荷',hint:'保护赛季体能',mods:{staminaLoad:-1,formVariance:-1},result:'你没有追求短期增重，把恢复质量放在第一位。'} },
    { id:'recovery_slot', title:'恢复时间争夺', scene:'按摩治疗名额只剩一个，另一名刚复出的队友也急需使用。', body:'职业球队的资源并不总是无限。', a:{label:'把名额让给队友',hint:'保护队友关系',profile:{lockerRoomTrust:2},mods:{staminaLoad:1,teamChemistry:1},result:'队友恢复得很好，并主动帮你预约了下一时段。'}, b:{label:'按预约正常使用',hint:'优先处理自己的疲劳',profile:{coachTrust:1},mods:{staminaLoad:-2},result:'你完成了恢复，也向队友解释了自己的身体状态。'} },
    { id:'meal_plan', title:'营养计划分歧', scene:'营养师要求你在客场严格执行新食谱，但队友邀请你参加传统赛后聚餐。', body:'身体管理和更衣室生活有时会撞在一起。', a:{label:'坚持营养方案',hint:'维持身体状态',mods:{staminaLoad:-1,formVariance:-1},result:'你提前准备好餐食，第二天身体数据非常稳定。'}, b:{label:'参加队友聚餐',hint:'维护团队连接',profile:{lockerRoomTrust:2},mods:{teamChemistry:1,staminaLoad:1},result:'你没有吃得太放纵，却听到了许多平时不会谈的话。'} },
    { id:'sleep_tracker', title:'睡眠数据公开', scene:'球队要求球员共享睡眠监测数据，你发现自己的报告会被整个教练组看到。', body:'科学管理和个人边界需要找到平衡。', a:{label:'完整共享数据',hint:'接受团队管理',profile:{coachTrust:2},mods:{staminaLoad:-1},result:'训练团队据此调整了你的恢复时间，疲劳明显下降。'}, b:{label:'只共享趋势',hint:'保留私人边界',profile:{leadership:1},mods:{mediaPressure:-1},result:'你提供了足够的训练信息，也守住了自己的生活空间。'} },
    { id:'flight_seat', title:'航班座位安排', scene:'长途飞行前，工作人员误把你的宽敞座位安排给了一名带伤队友。', body:'一次座位安排也能反映球队里的优先级。', a:{label:'让队友保留座位',hint:'照顾伤员',profile:{lockerRoomTrust:2},mods:{staminaLoad:1,teamChemistry:1},result:'队友一路都在冰敷，落地后认真向你道谢。'}, b:{label:'请工作人员重新协调',hint:'保证自己的恢复',profile:{coachTrust:1},mods:{staminaLoad:-1},result:'工作人员找到折中方案，没有让任何人带着怨气下飞机。'} },
    { id:'jersey_issue', title:'比赛装备错版', scene:'装备经理发现你的备用球衣尺码不对，而正确版本还在另一座城市。', body:'小故障可能在比赛前被无限放大。', a:{label:'穿训练版临时上场',hint:'不让装备影响准备',profile:{coachTrust:1},mods:{moraleBonus:1},result:'你把注意力留在比赛，赛后这件特殊球衣反而成了纪念品。'}, b:{label:'等待紧急调货',hint:'保持正式比赛习惯',mods:{mediaPressure:1,formVariance:-1},result:'球衣在热身结束前送到，你的准备时间因此被压缩。'} },
    { id:'practice_foul', title:'训练中的重犯规', scene:'队友一次危险犯规让你摔出场外，他却认为那只是正常对抗。', body:'训练强度不能以伤害队友为代价。', a:{label:'当场把话说清楚',hint:'建立安全边界',profile:{leadership:2,controversy:1},mods:{teamChemistry:-1,injuryRiskBonus:-1},result:'气氛一度紧张，但之后所有人的动作都更有分寸。'}, b:{label:'训练后私下沟通',hint:'避免公开冲突',profile:{lockerRoomTrust:2},mods:{teamChemistry:1},result:'你们在空球场里谈了十分钟，彼此都退了一步。'} },
    { id:'rookie_advice', title:'年轻队友求助', scene:'一名轮换边缘的新秀问你，是否应该无视教练安排去展示自己的得分能力。', body:'你的回答可能改变另一个人的职业道路。', a:{label:'劝他先赢得信任',hint:'强调团队角色',profile:{leadership:2,coachTrust:1},mods:{teamChemistry:1},result:'他下一场从防守做起，终于获得了第二段出场时间。'}, b:{label:'鼓励他抓住机会',hint:'支持个人竞争',profile:{lockerRoomTrust:2},mods:{formVariance:1},result:'他打得更大胆，也开始承担选择失误的后果。'} },
    { id:'veteran_rest', title:'老将轮休请求', scene:'队内老将私下希望你替他向教练说明身体情况，他不想被认为是在逃避比赛。', body:'替别人发声也意味着承担责任。', a:{label:'陪他一起找教练',hint:'公开支持队友',profile:{lockerRoomTrust:2,leadership:1},mods:{teamChemistry:1},result:'教练接受了轮休安排，也感谢你没有让问题拖到赛前。'}, b:{label:'建议他亲自沟通',hint:'让当事人承担表达',profile:{coachTrust:1},mods:{teamChemistry:1},result:'老将最终自己敲开办公室，你在门外等他出来。'} },
    { id:'coach_callout', title:'教练公开点名', scene:'训练结束时，教练当着全队点名批评你的防守投入。', body:'回应方式会决定批评是转折点还是裂痕。', a:{label:'当场接受批评',hint:'先用行动回应',profile:{coachTrust:2},mods:{moraleBonus:-1,formVariance:-1},result:'你没有争辩，下一组训练第一个站上防守位置。'}, b:{label:'训练后要求解释',hint:'明确评价依据',profile:{leadership:1,coachTrust:-1},mods:{mediaPressure:1},result:'你拿着录像逐条讨论，最终争取到更具体的要求。'} },
    { id:'medical_opinion', title:'第二医疗意见', scene:'队医认为你可以继续出场，经纪团队却建议寻找独立医生复查。', body:'健康判断里同时存在信任、风险和职业利益。', a:{label:'接受球队评估',hint:'维持比赛计划',profile:{coachTrust:2},mods:{injuryRiskBonus:1},result:'你继续出场，同时要求训练师每天更新风险指标。'}, b:{label:'申请独立复查',hint:'把长期健康放在前面',profile:{coachTrust:-1},mods:{injuryRiskBonus:-2,mediaPressure:1},result:'复查让你更安心，也让外界开始猜测球队的伤情管理。'} },
    { id:'fan_letter', title:'一封球迷来信', scene:'工作人员转交一封手写信，写信的孩子说因为你才开始接受康复训练。', body:'公众影响力有时会以非常私人的方式出现。', a:{label:'录一段私人回复',hint:'建立真实连接',profile:{fanSupport:2,fame:1},mods:{staminaLoad:1},result:'视频没有公开，但孩子的家人回信说他完成了整周训练。'}, b:{label:'邀请他参加主场活动',hint:'让球队共同参与',profile:{fanSupport:2,businessValue:1},mods:{mediaPressure:1},result:'球队把一次见面安排成了完整公益活动，影响了更多家庭。'} },
    { id:'rumor_clip', title:'剪辑引发争议', scene:'一段训练视频被剪成你无视队友击掌的样子，社交平台迅速开始争论。', body:'解释可能灭火，也可能让短视频获得更长生命。', a:{label:'发布完整视频',hint:'用事实还原现场',profile:{mediaTrust:2,controversy:-1},mods:{mediaPressure:1},result:'完整画面证明你只是没有看到，讨论很快降温。'}, b:{label:'不回应继续训练',hint:'不给流量更多燃料',profile:{coachTrust:1},mods:{mediaPressure:-1},result:'话题两天后自然消失，队友在采访中替你说明了情况。'} },
    { id:'local_radio', title:'本地电台追问', scene:'本地节目主持人连续批评你的关键球选择，并邀请你直播连线。', body:'地方媒体能建立长期关系，也最了解球迷情绪。', a:{label:'接受直播连线',hint:'直接面对质疑',profile:{mediaTrust:2,fanSupport:1},mods:{mediaPressure:1},result:'你逐回合解释判断，主持人仍不同意，却认可你的坦诚。'}, b:{label:'让表现作答',hint:'把精力留给比赛',profile:{coachTrust:1},mods:{formVariance:-1},result:'你没有上节目，下一场最后时刻做出了正确选择。'} },
    { id:'tv_feature', title:'全国专题拍摄', scene:'电视台想跟拍你完整的一天，包括训练、治疗和回家后的生活。', body:'曝光能提升影响力，也会占用原本属于自己的空间。', a:{label:'开放全天跟拍',hint:'提升公众认知',profile:{fame:2,businessValue:1},mods:{mediaPressure:2},result:'节目播出后更多人认识了真实的你，私人时间也明显减少。'}, b:{label:'只开放训练环节',hint:'控制曝光边界',profile:{mediaTrust:1},mods:{mediaPressure:-1},result:'成片不算轰动，但准确展示了你的职业态度。'} },
    { id:'brand_script', title:'广告台词争议', scene:'赞助商给你的广告脚本里有一句贬低对手的玩笑，品牌认为会很有传播度。', body:'商业表达也会影响联盟中的关系。', a:{label:'要求删除玩笑',hint:'保护同行关系',profile:{mediaTrust:2,businessValue:-1},mods:{teamChemistry:1},result:'广告少了一个爆点，却没有给任何对手留下话柄。'}, b:{label:'按脚本完成拍摄',hint:'兑现品牌传播目标',profile:{businessValue:2,controversy:1},mods:{mediaPressure:1},result:'广告迅速走红，对手也在下一场比赛前记住了那句话。'} },
    { id:'charity_match', title:'公益赛邀请', scene:'休息日出现一场临时公益赛邀请，活动很重要，但训练组担心额外对抗。', body:'公益承诺和身体风险都是真实成本。', a:{label:'亲自参加但限制时间',hint:'兼顾公益与保护',profile:{fanSupport:2,leadership:1},mods:{staminaLoad:1,injuryRiskBonus:1},result:'你只打了十分钟，却帮助活动完成了募款目标。'}, b:{label:'到场支持不上场',hint:'避免额外比赛负荷',profile:{mediaTrust:1,fanSupport:1},mods:{staminaLoad:-1},result:'你在场边完成互动，把出场机会留给了当地球员。'} },
    { id:'family_call', title:'家人的紧急电话', scene:'赛前会议前，家人打来电话，希望你立刻处理一件并不严重但很棘手的私事。', body:'职业赛程不会为家庭问题自动暂停。', a:{label:'先处理家事',hint:'回应家人的依赖',profile:{loyalty:2},mods:{mediaPressure:1,formVariance:1},result:'你解决了问题，却错过了战术会议的前半段。'}, b:{label:'赛后再回电话',hint:'保持赛前专注',profile:{coachTrust:1,loyalty:-1},mods:{formVariance:-1},result:'你把手机交给工作人员，赛后第一时间打了回去。'} },
    { id:'agent_plan', title:'经纪团队路线', scene:'经纪团队建议你增加个人曝光，球队公关则希望你减少场外安排。', body:'个人品牌和球队节奏需要重新排序。', a:{label:'优先个人曝光',hint:'扩大商业影响',profile:{businessValue:2,fame:1,coachTrust:-1},mods:{mediaPressure:1},result:'你的关注度快速上升，行程也变得更加拥挤。'}, b:{label:'配合球队节奏',hint:'减少场外干扰',profile:{coachTrust:2},mods:{mediaPressure:-1,formVariance:-1},result:'你推掉了几次邀约，把注意力重新集中在比赛。'} },
    { id:'trade_source', title:'交易消息来源', scene:'一名记者暗示球队正在讨论涉及你的交易，并愿意用消息交换匿名回应。', body:'提前知道去向很诱人，但泄露内部态度也有代价。', a:{label:'拒绝匿名交换',hint:'不参与消息交易',profile:{mediaTrust:1,loyalty:1},mods:{mediaPressure:-1},result:'你没有得到更多消息，却保住了和球队双方的信任。'}, b:{label:'提供有限回应',hint:'换取更多信息',profile:{fame:1,controversy:1},mods:{mediaPressure:2},result:'你提前知道了谈判方向，自己的态度也很快出现在报道里。'} },
    { id:'extension_talk', title:'续约窗口', scene:'管理层提出提前续约，但要求你在很短时间内决定是否接受。', body:'稳定、市场价值和未来角色无法同时确定。', a:{label:'表达长期留下意愿',hint:'优先稳定和球队关系',profile:{loyalty:2,fanSupport:1},mods:{mediaPressure:-1},result:'谈判进入实质阶段，球迷也开始期待你长期留队。'}, b:{label:'等赛季结束再谈',hint:'保留市场选择',profile:{businessValue:2},mods:{mediaPressure:1},result:'你把决定推迟，接下来的每场表现都被放进合同讨论。'} },
    { id:'school_visit', title:'校园访问', scene:'当地学校邀请你参加一堂篮球与成长主题课，时间和个人训练冲突。', body:'一次普通访问可能成为孩子很久以后的记忆。', a:{label:'调整训练亲自参加',hint:'投入社区关系',profile:{fanSupport:2,leadership:1},mods:{staminaLoad:1},result:'你没有只讲篮球，而是回答了孩子们关于失败的问题。'}, b:{label:'安排赛后线上交流',hint:'保留训练完整性',profile:{coachTrust:1,fanSupport:1},mods:{formVariance:-1},result:'训练没有中断，晚上的线上课堂也准时开始。'} },
    { id:'union_vote', title:'球员工会表决', scene:'球员工会就赛程保护方案征求意见，队友希望你代表球队公开发言。', body:'联盟规则不会直接赢下一场球，却会影响所有球员。', a:{label:'公开支持保护方案',hint:'承担球员代表责任',profile:{leadership:2,controversy:1},mods:{staminaLoad:-1},result:'你的发言得到许多球员响应，也引发部分媒体讨论。'}, b:{label:'只提交内部意见',hint:'专注球队内部角色',profile:{lockerRoomTrust:1},mods:{mediaPressure:-1},result:'你详细写下建议，但没有让个人立场成为新闻。'} },
    { id:'privacy_leak', title:'私人行程泄露', scene:'有人在网上发布了你的酒店楼层和出行时间，安保建议立刻改变全部安排。', body:'公众人物的安全和球迷接近感存在边界。', a:{label:'全面升级安保',hint:'优先个人与球队安全',profile:{mediaTrust:1},mods:{mediaPressure:-2},result:'行程变得更封闭，但潜在风险被迅速控制。'}, b:{label:'只调整关键节点',hint:'避免与球迷完全隔离',profile:{fanSupport:1},mods:{mediaPressure:1},result:'你保留了公开活动，同时让安保重新检查每条路线。'} }
  ];

  var definitions = [];
  topics.forEach(function (topic, topicIndex) {
    contexts.forEach(function (context, contextIndex) {
      if (topicIndex === topics.length - 1 && contextIndex === contexts.length - 1) return;
      definitions.push({
        id: 'library_' + topic.id + '_' + context.id,
        topicId: topic.id,
        contextId: context.id,
        title: '赛季事件：' + context.tag + '·' + topic.title,
        scene: context.opening + '，' + topic.scene,
        body: topic.body,
        choices: [topic.a, topic.b].map(function (choice) {
          return {
            label: choice.label,
            hint: choice.hint,
            profile: choice.profile || {},
            mods: choice.mods || {},
            result: choice.result + '<br><br>' + context.result
          };
        })
      });
    });
  });
  definitions = definitions.slice(0, 179);

  window.PERFECT_PLAYER_EXTRA_SEASON_EVENT_DEFINITIONS = definitions;
  window.PERFECT_PLAYER_EVENT_LIBRARY_REPORT = {
    generated: definitions.length,
    topics: topics.length,
    contexts: contexts.length
  };
})();
