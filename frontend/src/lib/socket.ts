import { io } from 'socket.io-client';
import { WS_URL } from './config';

export const socket = io(WS_URL, {
  transports: ['websocket'],
});
