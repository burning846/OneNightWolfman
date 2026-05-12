// 一夜终极狼人 - 角色定义（前端展示用）
// 服务端有自己的 roles.js，权威逻辑以服务端为准。
// team: 'werewolf' | 'village' | 'tanner'

export const ROLES = {
  werewolf: {
    id: 'werewolf',
    name: '狼人',
    team: 'werewolf',
    emoji: '🐺',
    desc: '夜晚睁眼互认。若只有一名狼人，可查看一张中央牌。',
  },
  minion: {
    id: 'minion',
    name: '爪牙',
    team: 'werewolf',
    emoji: '😈',
    desc: '看到所有狼人是谁，但狼人不知道你。',
  },
  mason: {
    id: 'mason',
    name: '守夜人',
    team: 'village',
    emoji: '🛡️',
    desc: '夜晚睁眼互认。若只有一个守夜人，则没人。',
  },
  seer: {
    id: 'seer',
    name: '预言家',
    team: 'village',
    emoji: '🔮',
    desc: '可以查看一名玩家的牌，或两张中央底牌。',
  },
  robber: {
    id: 'robber',
    name: '强盗',
    team: 'village',
    emoji: '🦹',
    desc: '与一名其他玩家交换身份，并查看新身份。你将以新身份阵营结算。',
  },
  troublemaker: {
    id: 'troublemaker',
    name: '捣蛋鬼',
    team: 'village',
    emoji: '👹',
    desc: '互换两名其他玩家的牌，但不查看。',
  },
  drunk: {
    id: 'drunk',
    name: '酒鬼',
    team: 'village',
    emoji: '🍺',
    desc: '与一张中央底牌交换，但不查看。',
  },
  insomniac: {
    id: 'insomniac',
    name: '失眠者',
    team: 'village',
    emoji: '👁️',
    desc: '夜晚结束前查看自己最终的身份牌。',
  },
  villager: {
    id: 'villager',
    name: '村民',
    team: 'village',
    emoji: '🧑‍🌾',
    desc: '没有夜晚行动。',
  },
  hunter: {
    id: 'hunter',
    name: '猎人',
    team: 'village',
    emoji: '🏹',
    desc: '若被投票淘汰，你投票的玩家也会一同死亡。',
  },
  tanner: {
    id: 'tanner',
    name: '皮匠',
    team: 'tanner',
    emoji: '🥁',
    desc: '只有你被投票淘汰才算赢。',
  },
};
