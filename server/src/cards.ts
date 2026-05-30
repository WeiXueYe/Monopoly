import { Card, CardEffectType } from '../../shared/types';

/**
 * 机会卡牌 - 玩家停在"机会"格时随机抽取
 */
export const CHANCE_CARDS: Card[] = [
  {
    id: 1,
    description: '银行分红，获得 200 金币',
    effectType: CardEffectType.GET_MONEY,
    value: 200,
  },
  {
    id: 2,
    description: '医疗费，支付 50 金币',
    effectType: CardEffectType.LOSE_MONEY,
    value: 50,
  },
  {
    id: 3,
    description: '前进到起点，获得 200 金币',
    effectType: CardEffectType.GO_TO_START,
    value: 0,
  },
  {
    id: 4,
    description: '直接入狱',
    effectType: CardEffectType.GO_TO_JAIL,
    value: 0,
  },
  {
    id: 5,
    description: '前进 3 格',
    effectType: CardEffectType.MOVE_FORWARD,
    value: 3,
  },
  {
    id: 6,
    description: '后退 2 格',
    effectType: CardEffectType.MOVE_BACKWARD,
    value: 2,
  },
  {
    id: 7,
    description: '获得建筑贷款，获得 150 金币',
    effectType: CardEffectType.GET_MONEY,
    value: 150,
  },
  {
    id: 8,
    description: '交通罚款，支付 30 金币',
    effectType: CardEffectType.LOSE_MONEY,
    value: 30,
  },
];

/**
 * 命运卡牌 - 玩家停在"命运"格时随机抽取
 */
export const FATE_CARDS: Card[] = [
  {
    id: 1,
    description: '生日快乐！获得 100 金币',
    effectType: CardEffectType.GET_MONEY,
    value: 100,
  },
  {
    id: 2,
    description: '学费到期，支付 100 金币',
    effectType: CardEffectType.LOSE_MONEY,
    value: 100,
  },
  {
    id: 3,
    description: '前进 2 格',
    effectType: CardEffectType.MOVE_FORWARD,
    value: 2,
  },
  {
    id: 4,
    description: '后退 3 格',
    effectType: CardEffectType.MOVE_BACKWARD,
    value: 3,
  },
  {
    id: 5,
    description: '获得竞赛奖金 50 金币',
    effectType: CardEffectType.GET_MONEY,
    value: 50,
  },
  {
    id: 6,
    description: '缴纳罚款 80 金币',
    effectType: CardEffectType.LOSE_MONEY,
    value: 80,
  },
  {
    id: 7,
    description: '直接入狱',
    effectType: CardEffectType.GO_TO_JAIL,
    value: 0,
  },
  {
    id: 8,
    description: '回到起点',
    effectType: CardEffectType.GO_TO_START,
    value: 0,
  },
];
