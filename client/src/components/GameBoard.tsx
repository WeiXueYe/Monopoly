import type { GameState, Cell, ColorGroup } from '@shared/types';

interface Props {
  gameState: GameState;
}

/** 颜色组对应的 CSS 颜色 */
const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  light_blue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#FF0000',
  yellow: '#FFD700',
  green: '#008000',
  dark_blue: '#00008B',
};

/** 格子类型对应的图标 */
function getCellIcon(cell: Cell): string {
  switch (cell.type) {
    case 'start': return '🏁';
    case 'property': return '';
    case 'chance': return '❓';
    case 'fate': return '🔮';
    case 'jail_visit': return '👮';
    case 'jail': return '🔒';
    case 'free_parking': return '🅿️';
    case 'tax': return '💰';
    default: return '';
  }
}

/** 渲染单个格子 */
function CellView({ cell, gameState }: { cell: Cell; gameState: GameState }) {
  const playersHere = gameState.players.filter(
    p => p.position === cell.id && p.status !== 'bankrupt'
  );

  return (
    <div
      className={`cell ${cell.type === 'property' ? 'cell-property' : ''}`}
      title={`${cell.name}${cell.price ? ` - 价格:${cell.price} 租金:${cell.rent}` : ''}`}
    >
      {/* 地产颜色条 */}
      {cell.colorGroup && (
        <div
          className="cell-color-bar"
          style={{ background: COLOR_MAP[cell.colorGroup] || '#888' }}
        />
      )}

      {/* 图标 */}
      {getCellIcon(cell) && <span className="cell-type-icon">{getCellIcon(cell)}</span>}

      {/* 名称 */}
      <span className="cell-name">{cell.name}</span>

      {/* 玩家棋子 */}
      {playersHere.length > 0 && (
        <div className="cell-players">
          {playersHere.map(p => (
            <div
              key={p.id}
              className="player-piece"
              style={{ background: p.color }}
              title={p.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 游戏棋盘组件 - 环形布局
 *
 * 棋盘 20 格分布：
 * - 上边（右到左）：格 10, 11, 12, 13, 14
 * - 右边（上到下）：格 15, 16, 17, 18, 19
 * - 下边（左到右）：格 0, 1, 2, 3, 4
 * - 左边（下到上）：格 5, 6, 7, 8, 9
 */
export function GameBoard({ gameState }: Props) {
  const board = gameState.board;

  // 上边：格 10-14（从右到左排列，所以反转）
  const topCells = board.slice(10, 15).reverse();
  // 右边：格 15-19
  const rightCells = board.slice(15, 20);
  // 下边：格 0-4
  const bottomCells = board.slice(0, 5);
  // 左边：格 5-9
  const leftCells = board.slice(5, 10);

  return (
    <div className="board-container">
      {/* 上边 */}
      <div className="board-row board-row-top">
        {topCells.map(cell => (
          <CellView key={cell.id} cell={cell} gameState={gameState} />
        ))}
      </div>

      {/* 右边 */}
      <div className="board-row board-row-right">
        {rightCells.map(cell => (
          <CellView key={cell.id} cell={cell} gameState={gameState} />
        ))}
      </div>

      {/* 下边 */}
      <div className="board-row board-row-bottom">
        {bottomCells.map(cell => (
          <CellView key={cell.id} cell={cell} gameState={gameState} />
        ))}
      </div>

      {/* 左边 */}
      <div className="board-row board-row-left">
        {leftCells.map(cell => (
          <CellView key={cell.id} cell={cell} gameState={gameState} />
        ))}
      </div>
    </div>
  );
}
