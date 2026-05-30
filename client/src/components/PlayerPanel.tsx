import type { GameState } from '@shared/types';

interface Props {
  gameState: GameState;
}

/** 状态标签 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return '';
    case 'in_jail': return '监狱中';
    case 'bankrupt': return '已破产';
    default: return '';
  }
}

export function PlayerPanel({ gameState }: Props) {
  return (
    <div>
      {gameState.players.map((player, idx) => {
        const isActive = idx === gameState.currentPlayerIndex;
        const isBankrupt = player.status === 'bankrupt';
        const ownedCells = gameState.board.filter(c => player.properties.includes(c.id));

        return (
          <div
            key={player.id}
            className={`player-info-card ${isActive ? 'active' : ''} ${isBankrupt ? 'bankrupt' : ''}`}
          >
            <div
              className="player-info-color"
              style={{ background: player.color }}
            />
            <div className="player-info-details">
              <div className="player-info-name">
                {player.name}
                {player.isBot && <span className="bot-badge">AI</span>}
                {isActive && ' 🎯'}
              </div>
              <div className="player-info-money">
                {isBankrupt ? '破产' : `${player.money} 金币`}
              </div>
              {getStatusLabel(player.status) && (
                <div className="player-info-status">
                  {getStatusLabel(player.status)}
                </div>
              )}
              {ownedCells.length > 0 && (
                <div className="player-info-props">
                  地产：{ownedCells.map(c => c.name).join('、')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
