import { socket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';
import type { GameState, Room, RoomState } from '@/types/game.types';
import { SocketEvent } from '@/types/socket.types';
import { useEffect } from 'react';

export const useSocketEvents = () => {
  const { yourId, setCurrentRoom, setGameState, setAvailableRooms, addLog, reset } = useGameStore();

  useEffect(() => {
    socket.on(SocketEvent.CONNECT, () => {
      addLog('Connected to server');
    });

    socket.on(SocketEvent.DISCONNECT, () => {
      addLog('Disconnected from server');
      reset();
    });

    socket.on(SocketEvent.AVAILABLE_ROOMS, (data: { rooms: Room[] }) => {
      setAvailableRooms(data.rooms);
    });

    socket.on(SocketEvent.ROOM_CREATED, (roomState: RoomState) => {
      setCurrentRoom(roomState);
      setAvailableRooms([]);
    });

    socket.on(SocketEvent.ROOM_JOINED, (roomState: RoomState) => {
      setCurrentRoom(roomState);
      setAvailableRooms([]);
    });

    socket.on(SocketEvent.ROOM_STATE_UPDATE, (roomState: RoomState) => {
      setCurrentRoom(roomState);
    });

    socket.on(SocketEvent.GAME_STARTED, (state: GameState) => {
      setGameState(state);
      addLog('Game started!');
    });

    socket.on(SocketEvent.GAME_STATE_UPDATE, (state: GameState) => {
      setGameState(state);
    });

    socket.on(
      SocketEvent.PLAYER_GUESS_BROADCAST,
      (data: { playerId: string; playerName: string; guess?: number; result: string }) => {
        if (data.playerId === yourId && data.guess !== undefined) {
          addLog(`Your guess ${data.guess}: ${data.result}`);
        } else {
          addLog(`${data.playerName}: ${data.result}`);
        }
      }
    );

    socket.on(SocketEvent.GAME_FINISHED, (data: { winnerName: string; totalAttempts: number }) => {
      addLog(`🏆 ${data.winnerName} won in ${data.totalAttempts} attempts!`);
    });

    socket.on(SocketEvent.ERROR, (data: { message: string }) => {
      addLog(`Error: ${data.message}`);
    });

    socket.on(SocketEvent.EXCEPTION, (data: { message: string }) => {
      addLog(`Exception: ${data.message}`);
    });

    return () => {
      socket.off(SocketEvent.CONNECT);
      socket.off(SocketEvent.DISCONNECT);
      socket.off(SocketEvent.AVAILABLE_ROOMS);
      socket.off(SocketEvent.ROOM_CREATED);
      socket.off(SocketEvent.ROOM_JOINED);
      socket.off(SocketEvent.ROOM_STATE_UPDATE);
      socket.off(SocketEvent.GAME_STARTED);
      socket.off(SocketEvent.GAME_STATE_UPDATE);
      socket.off(SocketEvent.PLAYER_GUESS_BROADCAST);
      socket.off(SocketEvent.GAME_FINISHED);
      socket.off(SocketEvent.ERROR);
      socket.off(SocketEvent.EXCEPTION);
    };
  }, [yourId, setCurrentRoom, setGameState, setAvailableRooms, addLog, reset]);
};
