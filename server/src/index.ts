import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './GameRoom';
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/types';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 房间管理 - 内存存储
const rooms = new Map<string, GameRoom>();
// socket -> roomId 映射
const playerRooms = new Map<string, string>();

/** 生成 6 位房间号 */
function generateRoomId(): string {
  let id: string;
  do {
    id = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms.has(id));
  return id;
}

/** 向房间内所有玩家广播游戏状态 */
function broadcastState(room: GameRoom): void {
  const state = room.getState();
  io.to(room.roomId).emit('game_state', state);
}

/** 向房间广播通知 */
function broadcastNotification(roomId: string, message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info'): void {
  io.to(roomId).emit('notification', { message, type });
}

/**
 * Bot 自动操作引擎
 * 检查当前回合玩家是否是 Bot，如果是则延迟 1 秒后自动执行操作
 */
function scheduleBotTurn(room: GameRoom): void {
  if (room.status !== 'playing') return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isBot) return;
  if (currentPlayer.status === 'bankrupt') return;

  setTimeout(() => {
    // 再次验证状态（防止延迟期间状态变化）
    if (room.status !== 'playing') return;
    const bot = room.players[room.currentPlayerIndex];
    if (!bot || !bot.isBot || bot.id !== currentPlayer.id) return;

    switch (room.actionPhase) {
      case 'roll_dice':
        // 监狱中：有钱就付罚金，否则尝试掷双数
        if (bot.status === 'in_jail' && bot.money >= 50) {
          room.payJailFine(bot.id);
          broadcastState(room);
          // 付完罚金后继续掷骰子
          setTimeout(() => {
            if (room.actionPhase === 'roll_dice') {
              room.rollDice(bot.id);
              broadcastState(room);
              scheduleBotTurn(room);
            }
          }, 1000);
          return;
        }
        room.rollDice(bot.id);
        broadcastState(room);
        scheduleBotTurn(room);
        break;

      case 'buy_or_pass':
        // 规则引擎决策
        if (shouldBotBuy(bot, room)) {
          room.buyProperty(bot.id);
        } else {
          room.passBuy(bot.id);
        }
        broadcastState(room);
        scheduleBotTurn(room);
        break;

      case 'end_turn':
        room.endTurn(bot.id);
        broadcastState(room);
        scheduleBotTurn(room);
        break;
    }
  }, 1000);
}

/**
 * Bot 购买决策规则引擎
 * 规则：
 * 1. 购买后余额 < 200 → 不买（余额保护）
 * 2. 已拥有同色组地产 → 买（凑齐租金翻倍）
 * 3. 默认 → 买
 */
function shouldBotBuy(bot: any, room: GameRoom): boolean {
  const property = (room as any).buyableProperty;
  if (!property || !property.price) return false;

  const afterBuyMoney = bot.money - property.price;

  // 规则 1：余额保护
  if (afterBuyMoney < 200) return false;

  // 规则 2：同色优先
  if (property.colorGroup) {
    const sameGroupCells = room.board.filter(c => c.colorGroup === property.colorGroup);
    const ownsInGroup = sameGroupCells.some(c => bot.properties.includes(c.id));
    if (ownsInGroup) return true;
  }

  // 规则 3：默认购买
  return true;
}

io.on('connection', (socket) => {
  console.log(`玩家连接: ${socket.id}`);

  // ---- 创建房间 ----
  socket.on('create_room', ({ playerName }: { playerName: string }) => {
    const roomId = generateRoomId();
    const room = new GameRoom(roomId);
    room.addPlayer(socket.id, playerName);
    rooms.set(roomId, room);
    playerRooms.set(socket.id, roomId);

    socket.join(roomId);
    socket.emit('room_created', { roomId });

    // 广播房间信息
    io.to(roomId).emit('room_update', {
      roomId: room.roomId,
      players: room.players,
      hostId: room.getHostId(),
      status: room.status,
    });

    console.log(`房间 ${roomId} 已创建，房主: ${playerName}`);
  });

  // ---- 加入房间 ----
  socket.on('join_room', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room_error', { message: '房间不存在' });
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('room_error', { message: '游戏已经开始，无法加入' });
      return;
    }
    if (room.players.length >= 4) {
      socket.emit('room_error', { message: '房间已满（最多 4 人）' });
      return;
    }

    const success = room.addPlayer(socket.id, playerName);
    if (!success) {
      socket.emit('room_error', { message: '加入房间失败' });
      return;
    }

    playerRooms.set(socket.id, roomId);
    socket.join(roomId);
    socket.emit('room_joined', { roomId });

    io.to(roomId).emit('room_update', {
      roomId: room.roomId,
      players: room.players,
      hostId: room.getHostId(),
      status: room.status,
    });

    broadcastNotification(roomId, `${playerName} 加入了房间`, 'info');
    console.log(`${playerName} 加入房间 ${roomId}`);
  });

  // ---- 离开房间 ----
  socket.on('leave_room', () => {
    handlePlayerLeave(socket.id);
  });

  // ---- 开始游戏 ----
  socket.on('start_game', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('room_error', { message: '只有房主可以开始游戏' });
      return;
    }

    const success = room.startGame();
    if (!success) {
      socket.emit('room_error', { message: '至少需要 2 名玩家才能开始' });
      return;
    }

    broadcastNotification(roomId, '游戏开始！', 'success');
    broadcastState(room);
    scheduleBotTurn(room);
  });

  // ---- 添加电脑玩家 ----
  socket.on('add_bot', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('room_error', { message: '只有房主可以添加电脑玩家' });
      return;
    }

    const success = room.addBot();
    if (!success) {
      socket.emit('room_error', { message: '无法添加电脑玩家（房间已满或游戏已开始）' });
      return;
    }

    io.to(roomId).emit('room_update', {
      roomId: room.roomId,
      players: room.players,
      hostId: room.getHostId(),
      status: room.status,
    });

    broadcastNotification(roomId, '电脑玩家加入房间', 'info');
  });

  // ---- 掷骰子 ----
  socket.on('roll_dice', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const result = room.rollDice(socket.id);
    if (result) {
      broadcastState(room);
      scheduleBotTurn(room);
    }
  });

  // ---- 购买地产 ----
  socket.on('buy_property', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const success = room.buyProperty(socket.id);
    if (success) {
      broadcastNotification(roomId, `${room.players.find(p => p.id === socket.id)?.name} 购买了地产！`, 'success');
      broadcastState(room);
      scheduleBotTurn(room);
    }
  });

  // ---- 跳过购买 ----
  socket.on('pass_buy', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.passBuy(socket.id);
    broadcastState(room);
    scheduleBotTurn(room);
  });

  // ---- 支付出狱罚金 ----
  socket.on('pay_jail_fine', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.payJailFine(socket.id);
    broadcastState(room);
    scheduleBotTurn(room);
  });

  // ---- 尝试掷双数出狱 ----
  socket.on('try_doubles', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.tryDoublesInJail(socket.id);
    broadcastState(room);
    scheduleBotTurn(room);
  });

  // ---- 结束回合 ----
  socket.on('end_turn', () => {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.endTurn(socket.id);
    broadcastState(room);
    scheduleBotTurn(room);
  });

  // ---- 断开连接 ----
  socket.on('disconnect', () => {
    console.log(`玩家断开: ${socket.id}`);
    handlePlayerLeave(socket.id);
  });

  /** 处理玩家离开 */
  function handlePlayerLeave(playerId: string): void {
    const roomId = playerRooms.get(playerId);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const playerName = room.players.find(p => p.id === playerId)?.name || '未知玩家';
    room.removePlayer(playerId);
    playerRooms.delete(playerId);

    // 如果房间为空，删除房间
    if (room.players.length === 0) {
      rooms.delete(roomId);
      console.log(`房间 ${roomId} 已删除（空房间）`);
      return;
    }

    // 如果游戏已结束，清理
    if (room.status === 'finished') {
      const state = room.getState();
      io.to(roomId).emit('game_state', state);
      if (room.winner) {
        io.to(roomId).emit('game_over', { winnerName: room.winner });
      }
    } else {
      io.to(roomId).emit('room_update', {
        roomId: room.roomId,
        players: room.players,
        hostId: room.getHostId(),
        status: room.status,
      });
      broadcastNotification(roomId, `${playerName} 离开了房间`, 'warning');

      // 如果游戏进行中，广播状态
      if (room.status === 'playing') {
        broadcastState(room);
        scheduleBotTurn(room);
      }
    }
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`大富翁服务器已启动，端口: ${PORT}`);
});
