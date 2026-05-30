import { socket } from '../socket';
import type { RoomInfo } from '@shared/types';

interface Props {
  roomInfo: RoomInfo;
  onBack: () => void;
}

export function WaitingRoom({ roomInfo, onBack }: Props) {
  const myId = socket.id;
  const isHost = roomInfo.hostId === myId;
  const canStart = isHost && roomInfo.players.length >= 2;
  const canAddBot = isHost && roomInfo.players.length < 4;

  const handleStart = () => {
    socket.emit('start_game');
  };

  const handleAddBot = () => {
    socket.emit('add_bot');
  };

  return (
    <div className="waiting-room">
      <div className="waiting-card">
        <h2>等待室</h2>
        <div className="room-id-display">{roomInfo.roomId}</div>
        <p className="room-id-hint">分享房间号给朋友，让他们加入！</p>

        <ul className="player-list">
          {roomInfo.players.map(p => (
            <li key={p.id}>
              <span className="player-dot" style={{ background: p.color }} />
              <span>{p.name}</span>
              {p.isBot && <span className="bot-badge">AI</span>}
              {p.isHost && <span className="host-badge">房主</span>}
            </li>
          ))}
        </ul>

        <div className="waiting-actions">
          {isHost && (
            <>
              <button
                className="btn btn-success"
                onClick={handleStart}
                disabled={!canStart}
              >
                {canStart ? '开始游戏' : `需要 ${2 - roomInfo.players.length} 名以上玩家`}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddBot}
                disabled={!canAddBot}
              >
                添加电脑
              </button>
            </>
          )}

          {!isHost && (
            <p className="waiting-hint">等待房主开始游戏...</p>
          )}

          <p className="waiting-hint">
            当前 {roomInfo.players.length}/4 名玩家
          </p>

          <button className="btn btn-danger btn-sm" onClick={onBack}>
            离开房间
          </button>
        </div>
      </div>
    </div>
  );
}
