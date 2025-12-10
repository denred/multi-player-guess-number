import { GameStatus } from '../enums/game-status.enum';
import { GuessResult } from '../enums/guess-result.enum';

export interface PlayerInfo {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  status: string;
  createdAt: string;
  playerIds: string[];
}

export interface RoomState {
  room: Room;
  players: PlayerInfo[];
  readyPlayers: string[];
  currentTurnPlayerId?: string;
  totalGuesses?: number;
}

export interface GameState {
  secret?: number;
  status: GameStatus;
  activePlayers: PlayerInfo[];
  totalGuesses: number;
  currentTurnPlayerId?: string;
  roomId?: string;
}

export type PlayerGuess = {
  playerId: string;
  guess: number;
  result: GuessResult;
  timestamp: string;
};

export type GameHistory = {
  allGuesses: PlayerGuess[];
  activePlayers: Set<string>;
  totalGuesses: number;
};
