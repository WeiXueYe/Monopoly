import { useState } from 'react';
import { socket } from '../socket';

interface Props {
  error: string;
}

export function HomePage({ error }: Props) {
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const handleCreate = () => {
    if (!playerName.trim()) return;
    socket.emit('create_room', { playerName: playerName.trim() });
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinRoomId.trim()) return;
    socket.emit('join_room', { roomId: joinRoomId.trim().toUpperCase(), playerName: playerName.trim() });
  };

  return (
    <div className="home-page">
      <div className="home-card">
        <h1>大富翁</h1>
        <p className="subtitle">多人在线联机版</p>

        <div className="form-group">
          <label>你的昵称</label>
          <input
            type="text"
            placeholder="输入昵称..."
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={10}
          />
        </div>

        {!showJoin ? (
          <>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!playerName.trim()}
            >
              创建房间
            </button>

            <div className="divider"><span>或</span></div>

            <button
              className="btn btn-secondary"
              onClick={() => setShowJoin(true)}
              disabled={!playerName.trim()}
            >
              加入房间
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>房间号</label>
              <input
                type="text"
                placeholder="输入房间号..."
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value)}
                maxLength={6}
              />
            </div>

            <button
              className="btn btn-success"
              onClick={handleJoin}
              disabled={!playerName.trim() || !joinRoomId.trim()}
            >
              加入
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setShowJoin(false)}
              style={{ marginTop: 8 }}
            >
              返回
            </button>
          </>
        )}

        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}
