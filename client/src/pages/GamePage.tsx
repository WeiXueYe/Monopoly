import { useState, useEffect } from 'react';
import { socket } from '../socket';
import { GameBoard } from '../components/GameBoard';
import { PlayerPanel } from '../components/PlayerPanel';
import { GameLog } from '../components/GameLog';
import type { GameState, ActionPhase } from '@shared/types';

interface Props {
  gameState: GameState;
}

/** 获取当前操作阶段的中文提示 */
function getPhaseHint(phase: ActionPhase, isMyTurn: boolean, isBotTurn: boolean): string {
  if (isBotTurn) return '电脑玩家思考中...';
  if (!isMyTurn) return '等待其他玩家操作...';
  switch (phase) {
    case 'roll_dice': return '请掷骰子';
    case 'buy_or_pass': return '是否购买此地产？';
    case 'end_turn': return '请结束回合';
    case 'waiting': return '等待中...';
    default: return '';
  }
}

export function GamePage({ gameState }: Props) {
  const myId = socket.id;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId;
  const isBotTurn = currentPlayer?.isBot === true;
  const me = gameState.players.find(p => p.id === myId);
  const isBankrupt = me?.status === 'bankrupt';
  const isJailed = me?.status === 'in_jail';
  const [rolling, setRolling] = useState(false);

  // 掷骰子动画
  const handleRollDice = () => {
    setRolling(true);
    socket.emit('roll_dice');
    setTimeout(() => setRolling(false), 600);
  };

  // 游戏结束
  const [showGameOver, setShowGameOver] = useState(false);
  useEffect(() => {
    if (gameState.status === 'finished' && gameState.winner) {
      setShowGameOver(true);
    }
  }, [gameState.status, gameState.winner]);

  return (
    <div className="game-page">
      {/* 棋盘区域 */}
      <div className="board-area">
        <div className="board-container">
          <GameBoard gameState={gameState} />

          {/* 棋盘中心 - 骰子和信息 */}
          <div className="board-center">
            <h2>大富翁</h2>
            {currentPlayer && (
              <p className="current-player-name" style={{ color: currentPlayer.color }}>
                当前：{currentPlayer.name}
              </p>
            )}
            <p className="phase-hint">{getPhaseHint(gameState.actionPhase, isMyTurn, isBotTurn)}</p>

            {/* 骰子显示 */}
            <div className="dice-display">
              {gameState.lastDice ? (
                <>
                  <div className="dice">{gameState.lastDice.dice1}</div>
                  <div className="dice">{gameState.lastDice.dice2}</div>
                </>
              ) : (
                <>
                  <div className="dice-placeholder">?</div>
                  <div className="dice-placeholder">?</div>
                </>
              )}
            </div>

            {rolling && <p style={{ color: '#f1c40f' }}>掷骰子中...</p>}
          </div>
        </div>
      </div>

      {/* 右侧信息面板 */}
      <div className="info-panel">
        {/* 玩家信息 */}
        <div className="panel-section">
          <h3>玩家信息</h3>
          <PlayerPanel gameState={gameState} />
        </div>

        {/* 操作按钮 */}
        <div className="action-panel">
          {/* Bot 回合 - 显示思考中 */}
          {isBotTurn && (
            <div className="bot-thinking">
              <p>电脑玩家正在思考...</p>
              <div className="bot-thinking-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          )}

          {/* 监狱中的操作 */}
          {isMyTurn && !isBotTurn && isJailed && gameState.actionPhase === 'roll_dice' && (
            <>
              <button className="btn btn-warning" onClick={handleRollDice}>
                掷骰子（尝试双数出狱）
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => socket.emit('pay_jail_fine')}
                disabled={(me?.money ?? 0) < 50}
              >
                支付 50 金币出狱
              </button>
            </>
          )}

          {/* 正常掷骰子 */}
          {isMyTurn && !isBotTurn && !isJailed && gameState.actionPhase === 'roll_dice' && !isBankrupt && (
            <button className="btn btn-primary" onClick={handleRollDice}>
              掷骰子
            </button>
          )}

          {/* 购买选项 */}
          {isMyTurn && !isBotTurn && gameState.actionPhase === 'buy_or_pass' && gameState.buyableProperty && (
            <div className="buy-option">
              <p>
                {gameState.buyableProperty.name}
                <br />
                价格：{gameState.buyableProperty.price} 金币
                <br />
                租金：{gameState.buyableProperty.rent} 金币
              </p>
              <div className="buy-buttons">
                <button className="btn btn-success btn-sm" onClick={() => socket.emit('buy_property')}>
                  购买
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => socket.emit('pass_buy')}>
                  跳过
                </button>
              </div>
            </div>
          )}

          {/* 结束回合 */}
          {isMyTurn && !isBotTurn && gameState.actionPhase === 'end_turn' && !isBankrupt && (
            <button className="btn btn-warning" onClick={() => socket.emit('end_turn')}>
              结束回合
            </button>
          )}

          {/* 不是我的回合（且不是 Bot） */}
          {!isMyTurn && !isBotTurn && !isBankrupt && (
            <p style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
              等待 {currentPlayer?.name} 操作...
            </p>
          )}

          {/* 已破产 */}
          {isBankrupt && (
            <p style={{ textAlign: 'center', color: '#e74c3c', fontSize: '0.9rem' }}>
              你已破产，观战中...
            </p>
          )}
        </div>

        {/* 游戏日志 */}
        <div className="game-log">
          <h3>游戏日志</h3>
          <div className="log-messages">
            <GameLog logs={gameState.logs} />
          </div>
        </div>
      </div>

      {/* 游戏结束弹窗 */}
      {showGameOver && (
        <div className="game-over-overlay" onClick={() => setShowGameOver(false)}>
          <div className="game-over-card">
            <h2>游戏结束</h2>
            <p>{gameState.winner} 获胜！</p>
            <button className="btn btn-primary" onClick={() => setShowGameOver(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
