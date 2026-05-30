import { useState, useEffect, useCallback } from 'react';
import { socket } from './socket';
import { HomePage } from './pages/HomePage';
import { WaitingRoom } from './pages/WaitingRoom';
import { GamePage } from './pages/GamePage';
import type { GameState, RoomInfo } from '@shared/types';

type Page = 'home' | 'waiting' | 'game';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [roomId, setRoomId] = useState<string>('');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  // 通知自动消失
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    // 连接服务器
    socket.connect();

    socket.on('room_created', ({ roomId: id }) => {
      setRoomId(id);
      setPage('waiting');
      setError('');
    });

    socket.on('room_joined', ({ roomId: id }) => {
      setRoomId(id);
      setPage('waiting');
      setError('');
    });

    socket.on('room_error', ({ message }) => {
      setError(message);
    });

    socket.on('room_update', (data) => {
      setRoomInfo(data);
    });

    socket.on('game_state', (data) => {
      setGameState(data);
      setPage('game');
    });

    socket.on('notification', (data) => {
      setNotification(data);
    });

    socket.on('game_over', ({ winnerName }) => {
      setNotification({ message: `游戏结束！${winnerName} 获胜！`, type: 'success' });
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_error');
      socket.off('room_update');
      socket.off('game_state');
      socket.off('notification');
      socket.off('game_over');
      socket.disconnect();
    };
  }, []);

  const handleBackToHome = useCallback(() => {
    socket.emit('leave_room');
    setPage('home');
    setRoomId('');
    setRoomInfo(null);
    setGameState(null);
    setError('');
  }, []);

  return (
    <div className="app">
      {/* 通知条 */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {page === 'home' && (
        <HomePage error={error} />
      )}
      {page === 'waiting' && roomInfo && (
        <WaitingRoom roomInfo={roomInfo} onBack={handleBackToHome} />
      )}
      {page === 'game' && gameState && (
        <GamePage gameState={gameState} />
      )}
    </div>
  );
}

export default App;
