import {
  GameStatus, PlayerStatus, ActionPhase,
  Player, GameState, Cell, Card,
  CellType, CardEffectType,
} from '../../shared/types';
import { BOARD_CELLS, PLAYER_COLORS } from './board';
import { CHANCE_CARDS, FATE_CARDS } from './cards';

/**
 * 游戏房间 - 管理一个房间内的完整游戏逻辑
 * 所有随机操作（掷骰子、抽卡）都在服务端执行，防止作弊
 */
export class GameRoom {
  roomId: string;
  players: Player[] = [];
  currentPlayerIndex: number = 0;
  status: GameStatus = GameStatus.WAITING;
  board: Cell[] = BOARD_CELLS;
  actionPhase: ActionPhase = ActionPhase.WAITING;
  lastDice?: { dice1: number; dice2: number };
  logs: string[] = [];
  winner?: string;

  // 当前可购买的地产（停在地产格且无人拥有时）
  private buyableProperty?: Cell;
  // 卡牌抽取结果缓存
  private lastCard?: Card;
  // Bot 计数器
  private botCounter: number = 0;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  // ================================================================
  // 房间管理
  // ================================================================

  /** 添加玩家到房间 */
  addPlayer(playerId: string, playerName: string): boolean {
    if (this.status !== GameStatus.WAITING) return false;
    if (this.players.length >= 4) return false;
    if (this.players.some(p => p.id === playerId)) return false;

    const player: Player = {
      id: playerId,
      name: playerName,
      money: 1500,
      position: 0,
      status: PlayerStatus.ACTIVE,
      properties: [],
      jailTurns: 0,
      isHost: this.players.length === 0,
      color: PLAYER_COLORS[this.players.length],
    };
    this.players.push(player);
    return true;
  }

  /** 添加电脑玩家 */
  addBot(): boolean {
    this.botCounter++;
    const botId = `bot_${this.botCounter}`;
    const botName = `电脑${this.botCounter}号`;
    const success = this.addPlayer(botId, botName);
    if (success) {
      const bot = this.players[this.players.length - 1];
      bot.isBot = true;
    }
    return success;
  }

  /** 移除玩家 */
  removePlayer(playerId: string): void {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx === -1) return;

    // 如果游戏进行中，该玩家破产处理
    if (this.status === GameStatus.PLAYING) {
      this.players[idx].status = PlayerStatus.BANKRUPT;
      this.addLog(`${this.players[idx].name} 离开了游戏`);
      // 如果轮到该玩家，跳过
      if (this.currentPlayerIndex === idx) {
        this.advanceToNextPlayer();
      }
      this.checkGameOver();
    } else {
      this.players.splice(idx, 1);
      // 如果房主离开，转移房主
      if (this.players.length > 0 && idx === 0) {
        this.players[0].isHost = true;
      }
    }
  }

  /** 获取房主ID */
  getHostId(): string {
    const host = this.players.find(p => p.isHost);
    return host ? host.id : '';
  }

  // ================================================================
  // 游戏流程
  // ================================================================

  /** 开始游戏 */
  startGame(): boolean {
    if (this.status !== GameStatus.WAITING) return false;
    if (this.players.length < 2) return false;

    this.status = GameStatus.PLAYING;
    this.currentPlayerIndex = 0;
    this.actionPhase = ActionPhase.ROLL_DICE;
    this.addLog('游戏开始！');
    this.addLog(`当前回合：${this.players[0].name}`);
    return true;
  }

  /** 掷骰子 */
  rollDice(playerId: string): { dice1: number; dice2: number; isDoubles: boolean } | null {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return null;
    if (this.actionPhase !== ActionPhase.ROLL_DICE) return null;

    // 后端生成随机骰子
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const isDoubles = dice1 === dice2;
    this.lastDice = { dice1, dice2 };

    this.addLog(`${player.name} 掷出了 ${dice1} + ${dice2} = ${dice1 + dice2}${isDoubles ? '（双数！）' : ''}`);

    // 如果在监狱中
    if (player.status === PlayerStatus.IN_JAIL) {
      if (isDoubles) {
        // 掷出双数出狱
        player.status = PlayerStatus.ACTIVE;
        player.jailTurns = 0;
        this.addLog(`${player.name} 掷出双数，成功出狱！`);
        // 出狱后前进
        this.movePlayer(player, dice1 + dice2);
        this.handleLanding(player);
      } else {
        player.jailTurns++;
        if (player.jailTurns >= 3) {
          // 三轮未出狱，强制支付
          player.money -= 50;
          player.status = PlayerStatus.ACTIVE;
          player.jailTurns = 0;
          this.addLog(`${player.name} 三轮未出狱，强制支付 50 金币`);
          this.checkBankrupt(player);
          if ((player.status as string) !== PlayerStatus.BANKRUPT) {
            this.movePlayer(player, dice1 + dice2);
            this.handleLanding(player);
          }
        } else {
          this.addLog(`${player.name} 未能掷出双数，在监狱中等待（第 ${player.jailTurns} 轮）`);
          this.actionPhase = ActionPhase.END_TURN;
          return { dice1, dice2, isDoubles };
        }
      }
    } else {
      // 正常移动
      this.movePlayer(player, dice1 + dice2);
      this.handleLanding(player);
    }

    return { dice1, dice2, isDoubles };
  }

  /** 购买地产 */
  buyProperty(playerId: string): boolean {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return false;
    if (this.actionPhase !== ActionPhase.BUY_OR_PASS) return false;
    if (!this.buyableProperty) return false;

    const property = this.buyableProperty;
    if (player.money < property.price!) return false;

    player.money -= property.price!;
    player.properties.push(property.id);
    this.addLog(`${player.name} 购买了 ${property.name}，花费 ${property.price} 金币`);
    this.buyableProperty = undefined;
    this.actionPhase = ActionPhase.END_TURN;
    return true;
  }

  /** 跳过购买 */
  passBuy(playerId: string): boolean {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return false;
    if (this.actionPhase !== ActionPhase.BUY_OR_PASS) return false;

    this.addLog(`${player.name} 放弃购买`);
    this.buyableProperty = undefined;
    this.actionPhase = ActionPhase.END_TURN;
    return true;
  }

  /** 支付出狱罚金 */
  payJailFine(playerId: string): boolean {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return false;
    if (player.status !== PlayerStatus.IN_JAIL) return false;
    if (player.money < 50) return false;

    player.money -= 50;
    player.status = PlayerStatus.ACTIVE;
    player.jailTurns = 0;
    this.addLog(`${player.name} 支付 50 金币出狱`);
    this.checkBankrupt(player);
    this.actionPhase = ActionPhase.ROLL_DICE;
    return true;
  }

  /** 尝试掷双数出狱 */
  tryDoublesInJail(playerId: string): boolean {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return false;
    if (player.status !== PlayerStatus.IN_JAIL) return false;

    // 直接走掷骰子逻辑
    this.actionPhase = ActionPhase.ROLL_DICE;
    return true;
  }

  /** 结束回合 */
  endTurn(playerId: string): boolean {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return false;
    if (this.actionPhase !== ActionPhase.END_TURN) return false;

    this.advanceToNextPlayer();
    this.actionPhase = ActionPhase.ROLL_DICE;
    this.lastDice = undefined;
    this.addLog(`当前回合：${this.getCurrentPlayer()!.name}`);
    return true;
  }

  // ================================================================
  // 内部逻辑
  // ================================================================

  /** 移动玩家 */
  private movePlayer(player: Player, steps: number): void {
    const oldPos = player.position;
    player.position = (player.position + steps) % this.board.length;

    // 经过起点获得金币
    if (player.position < oldPos) {
      player.money += 200;
      this.addLog(`${player.name} 经过起点，获得 200 金币`);
    }

    const cell = this.board[player.position];
    this.addLog(`${player.name} 前进到 [${cell.name}]`);
  }

  /** 处理玩家停在某格的效果 */
  private handleLanding(player: Player): void {
    const cell = this.board[player.position];

    switch (cell.type) {
      case CellType.START:
        // 停在起点也获得金币
        player.money += 200;
        this.addLog(`${player.name} 停在起点，获得 200 金币`);
        this.actionPhase = ActionPhase.END_TURN;
        break;

      case CellType.PROPERTY:
        this.handlePropertyLanding(player, cell);
        break;

      case CellType.CHANCE:
        this.drawCard(player, CHANCE_CARDS, '机会');
        break;

      case CellType.FATE:
        this.drawCard(player, FATE_CARDS, '命运');
        break;

      case CellType.JAIL_VISIT:
        this.addLog(`${player.name} 只是路过监狱`);
        this.actionPhase = ActionPhase.END_TURN;
        break;

      case CellType.JAIL:
        // 停在监狱格 = 被关进监狱
        player.status = PlayerStatus.IN_JAIL;
        player.jailTurns = 0;
        this.addLog(`${player.name} 被关进监狱！`);
        this.actionPhase = ActionPhase.END_TURN;
        break;

      case CellType.FREE_PARKING:
        this.addLog(`${player.name} 免费停车，休息一下`);
        this.actionPhase = ActionPhase.END_TURN;
        break;

      case CellType.TAX:
        player.money -= cell.taxAmount!;
        this.addLog(`${player.name} 缴纳税款 ${cell.taxAmount} 金币`);
        this.checkBankrupt(player);
        if (player.status !== PlayerStatus.BANKRUPT) {
          this.actionPhase = ActionPhase.END_TURN;
        }
        break;

      default:
        this.actionPhase = ActionPhase.END_TURN;
    }
  }

  /** 处理停在地产格 */
  private handlePropertyLanding(player: Player, cell: Cell): void {
    // 检查是否有人拥有这块地产
    const owner = this.players.find(
      p => p.status !== PlayerStatus.BANKRUPT && p.properties.includes(cell.id)
    );

    if (!owner) {
      // 无人拥有，可以选择购买
      if (player.money >= cell.price!) {
        this.buyableProperty = cell;
        this.actionPhase = ActionPhase.BUY_OR_PASS;
        this.addLog(`${player.name} 可以购买 ${cell.name}（价格：${cell.price} 金币）`);
      } else {
        this.addLog(`${player.name} 金币不足，无法购买 ${cell.name}`);
        this.actionPhase = ActionPhase.END_TURN;
      }
    } else if (owner.id === player.id) {
      // 自己的地，不用付租金
      this.addLog(`${player.name} 来到自己的地产`);
      this.actionPhase = ActionPhase.END_TURN;
    } else {
      // 别人的地，付租金
      let rent = cell.rent!;
      // 检查是否拥有同色全部地产，租金翻倍
      if (cell.colorGroup) {
        const sameGroupProperties = this.board.filter(
          c => c.colorGroup === cell.colorGroup
        );
        const ownerOwnsAll = sameGroupProperties.every(
          c => owner.properties.includes(c.id)
        );
        if (ownerOwnsAll) {
          rent *= 2;
          this.addLog(`${owner.name} 拥有 ${cell.colorGroup} 全部地产，租金翻倍！`);
        }
      }

      player.money -= rent;
      owner.money += rent;
      this.addLog(`${player.name} 向 ${owner.name} 支付租金 ${rent} 金币`);
      this.checkBankrupt(player);
      if (player.status !== PlayerStatus.BANKRUPT) {
        this.actionPhase = ActionPhase.END_TURN;
      }
    }
  }

  /** 抽卡 */
  private drawCard(player: Player, cards: Card[], cardType: string): void {
    const card = cards[Math.floor(Math.random() * cards.length)];
    this.lastCard = card;
    this.addLog(`${player.name} 抽到${cardType}卡：${card.description}`);

    switch (card.effectType) {
      case CardEffectType.GET_MONEY:
        player.money += card.value;
        this.addLog(`${player.name} 获得 ${card.value} 金币`);
        break;

      case CardEffectType.LOSE_MONEY:
        player.money -= card.value;
        this.addLog(`${player.name} 失去 ${card.value} 金币`);
        this.checkBankrupt(player);
        break;

      case CardEffectType.MOVE_FORWARD:
        this.movePlayer(player, card.value);
        // 移动后重新处理落地
        this.handleLanding(player);
        return; // handleLanding 已经设置了 actionPhase

      case CardEffectType.MOVE_BACKWARD:
        const oldPos = player.position;
        player.position = (player.position - card.value + this.board.length) % this.board.length;
        this.addLog(`${player.name} 后退 ${card.value} 格到 [${this.board[player.position].name}]`);
        this.handleLanding(player);
        return;

      case CardEffectType.GO_TO_JAIL:
        player.position = 15; // 监狱位置
        player.status = PlayerStatus.IN_JAIL;
        player.jailTurns = 0;
        this.addLog(`${player.name} 被直接送入监狱！`);
        break;

      case CardEffectType.GO_TO_START:
        player.position = 0;
        player.money += 200;
        this.addLog(`${player.name} 回到起点，获得 200 金币`);
        break;
    }

    if (player.status !== PlayerStatus.BANKRUPT) {
      this.actionPhase = ActionPhase.END_TURN;
    }
  }

  /** 检查玩家是否破产 */
  private checkBankrupt(player: Player): void {
    if (player.money <= 0) {
      player.status = PlayerStatus.BANKRUPT;
      player.properties = [];
      this.addLog(`${player.name} 破产了！`);
      this.checkGameOver();
    }
  }

  /** 推进到下一个活跃玩家 */
  private advanceToNextPlayer(): void {
    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    let attempts = 0;
    while (this.players[nextIndex].status === PlayerStatus.BANKRUPT && attempts < this.players.length) {
      nextIndex = (nextIndex + 1) % this.players.length;
      attempts++;
    }
    this.currentPlayerIndex = nextIndex;
  }

  /** 检查游戏是否结束 */
  private checkGameOver(): void {
    const activePlayers = this.players.filter(p => p.status !== PlayerStatus.BANKRUPT);
    if (activePlayers.length <= 1) {
      this.status = GameStatus.FINISHED;
      if (activePlayers.length === 1) {
        this.winner = activePlayers[0].name;
        this.addLog(`游戏结束！${activePlayers[0].name} 获胜！`);
      } else {
        this.addLog('游戏结束！所有玩家都破产了');
      }
      this.actionPhase = ActionPhase.WAITING;
    }
  }

  /** 获取当前玩家 */
  private getCurrentPlayer(): Player | null {
    if (this.currentPlayerIndex >= 0 && this.currentPlayerIndex < this.players.length) {
      return this.players[this.currentPlayerIndex];
    }
    return null;
  }

  /** 添加游戏日志 */
  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.push(`[${timestamp}] ${message}`);
    // 最多保留 50 条日志
    if (this.logs.length > 50) {
      this.logs.shift();
    }
  }

  // ================================================================
  // 状态序列化
  // ================================================================

  /** 获取发送给客户端的游戏状态 */
  getState(): GameState {
    return {
      roomId: this.roomId,
      players: this.players.map(p => ({ ...p })),
      currentPlayerIndex: this.currentPlayerIndex,
      status: this.status,
      board: this.board,
      actionPhase: this.actionPhase,
      lastDice: this.lastDice,
      buyableProperty: this.buyableProperty,
      logs: [...this.logs],
      winner: this.winner,
    };
  }
}
