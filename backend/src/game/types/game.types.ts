import { GameStatus } from '../enums/game-status.enum';
import { GuessResult } from '../enums/guess-result.enum';

export interface GameState {
  secret?: number;
  status: GameStatus;
  activePlayers?: string[];
  totalGuesses?: number;
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
