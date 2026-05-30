import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/types';

/** Socket.IO 客户端实例 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  // 开发模式下通过 Vite proxy 连接
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin,
  {
    autoConnect: false,
  }
);
