import { socket } from '@/lib/socket';
import { SocketEvent } from '@/types/socket.types';

export const socketService = {
  createRoom: (playerId: string) => {
    socket.emit(SocketEvent.CREATE_ROOM, { playerId });
  },

  joinRoom: (roomId: string, playerId: string) => {
    socket.emit(SocketEvent.JOIN_ROOM, { roomId, playerId });
  },

  setReady: (roomId: string, playerId: string) => {
    socket.emit(SocketEvent.SET_READY, { roomId, playerId, isReady: true });
  },

  addBot: (roomId: string) => {
    socket.emit(SocketEvent.ADD_BOT, { roomId });
  },

  removeBot: (roomId: string, botId: string) => {
    socket.emit(SocketEvent.REMOVE_BOT, { roomId, botId });
  },

  leaveRoom: (playerId: string, roomId: string) => {
    socket.emit(SocketEvent.LEAVE_ROOM, { playerId, roomId });
  },

  submitGuess: (playerId: string, guess: number, roomId: string) => {
    socket.emit(SocketEvent.GUESS_SUBMIT, { playerId, guess, roomId });
  },

  getRooms: () => {
    socket.emit(SocketEvent.GET_ROOMS);
  },
};
