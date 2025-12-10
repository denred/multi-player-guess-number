import type { GameState, Room, RoomState } from '@/types/game.types';
import { create } from 'zustand';

type GameStore = {
  yourId: string;
  yourName: string;
  currentRoom: RoomState | null;
  gameState: GameState | null;
  logs: string[];
  availableRooms: Room[];

  setPlayer: (id: string, name: string) => void;
  setCurrentRoom: (room: RoomState | null) => void;
  setGameState: (state: GameState | null) => void;
  setAvailableRooms: (rooms: Room[]) => void;
  addLog: (message: string) => void;
  reset: () => void;
};

export const useGameStore = create<GameStore>((set) => ({
  yourId: '',
  yourName: '',
  currentRoom: null,
  gameState: null,
  logs: [],
  availableRooms: [],

  setPlayer: (id, name) => set({ yourId: id, yourName: name }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setGameState: (state) => set({ gameState: state }),
  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),
  addLog: (message) =>
    set((state) => ({
      logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${message}`],
    })),
  reset: () => set({ currentRoom: null, gameState: null }),
}));
