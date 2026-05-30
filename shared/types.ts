// ============================================================
// 共享类型定义 - 前后端共用
// ============================================================

/** 棋盘格子类型 */
export enum CellType {
  START = 'start',           // 起点
  PROPERTY = 'property',     // 地产
  CHANCE = 'chance',         // 机会
  FATE = 'fate',             // 命运
  JAIL_VISIT = 'jail_visit', // 入狱格（路过）
  JAIL = 'jail',             // 监狱（被关）
  FREE_PARKING = 'free_parking', // 免费停车
  TAX = 'tax',               // 税务
}

/** 地产颜色组 */
export enum ColorGroup {
  BROWN = 'brown',
  LIGHT_BLUE = 'light_blue',
  PINK = 'pink',
  ORANGE = 'orange',
  RED = 'red',
  YELLOW = 'yellow',
  GREEN = 'green',
  DARK_BLUE = 'dark_blue',
}

/** 棋盘格子定义 */
export interface Cell {
  id: number;
  name: string;
  type: CellType;
  /** 地产价格（仅地产格） */
  price?: number;
  /** 租金（仅地产格） */
  rent?: number;
  /** 颜色组（仅地产格） */
  colorGroup?: ColorGroup;
  /** 税务金额（仅税务格） */
  taxAmount?: number;
}

/** 卡牌效果类型 */
export enum CardEffectType {
  GET_MONEY = 'get_money',
  LOSE_MONEY = 'lose_money',
  MOVE_FORWARD = 'move_forward',
  MOVE_BACKWARD = 'move_backward',
  GO_TO_JAIL = 'go_to_jail',
  GO_TO_START = 'go_to_start',
}

/** 卡牌定义 */
export interface Card {
  id: number;
  description: string;
  effectType: CardEffectType;
  value: number;
}

/** 游戏状态 */
export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

/** 玩家状态 */
export enum PlayerStatus {
  ACTIVE = 'active',
  IN_JAIL = 'in_jail',
  BANKRUPT = 'bankrupt',
}

/** 操作阶段 - 限制玩家当前可以做什么 */
export enum ActionPhase {
  ROLL_DICE = 'roll_dice',       // 需要掷骰子
  BUY_OR_PASS = 'buy_or_pass',   // 可以购买地产或跳过
  PAY_RENT = 'pay_rent',         // 需要支付租金（自动）
  DRAW_CARD = 'draw_card',       // 需要抽卡（自动）
  END_TURN = 'end_turn',         // 可以结束回合
  WAITING = 'waiting',           // 等待其他玩家
}

/** 玩家信息 */
export interface Player {
  id: string;
  name: string;
  money: number;
  position: number;
  status: PlayerStatus;
  /** 拥有的地产格子ID列表 */
  properties: number[];
  /** 在监狱中已停留的轮数 */
  jailTurns: number;
  /** 是否是房主 */
  isHost: boolean;
  /** 棋子颜色 */
  color: string;
  /** 是否是电脑玩家 */
  isBot?: boolean;
}

/** 房间信息（发送给客户端的精简版） */
export interface RoomInfo {
  roomId: string;
  players: Player[];
  hostId: string;
  status: GameStatus;
}

/** 游戏状态（发送给客户端） */
export interface GameState {
  roomId: string;
  players: Player[];
  currentPlayerIndex: number;
  status: GameStatus;
  board: Cell[];
  /** 当前玩家的操作阶段 */
  actionPhase: ActionPhase;
  /** 最近一次掷骰子结果 */
  lastDice?: { dice1: number; dice2: number };
  /** 当前可以购买的地产 */
  buyableProperty?: Cell;
  /** 游戏日志 */
  logs: string[];
  /** 获胜者 */
  winner?: string;
}

// ============================================================
// Socket.IO 事件定义
// ============================================================

/** 客户端 -> 服务端 事件 */
export interface ClientToServerEvents {
  create_room: (data: { playerName: string }) => void;
  join_room: (data: { roomId: string; playerName: string }) => void;
  leave_room: () => void;
  start_game: () => void;
  roll_dice: () => void;
  buy_property: () => void;
  pass_buy: () => void;
  end_turn: () => void;
  pay_jail_fine: () => void;
  try_doubles: () => void;
  add_bot: () => void;
}

/** 服务端 -> 客户端 事件 */
export interface ServerToClientEvents {
  room_created: (data: { roomId: string }) => void;
  room_joined: (data: { roomId: string }) => void;
  room_error: (data: { message: string }) => void;
  room_update: (data: RoomInfo) => void;
  game_state: (data: GameState) => void;
  notification: (data: { message: string; type: 'info' | 'success' | 'warning' | 'danger' }) => void;
  game_over: (data: { winnerName: string }) => void;
}
