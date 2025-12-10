import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from 'src/game/game.service';
import { GameState } from 'src/game/types/game.types';
import { WsEvents } from './enums/ws-events.enum';
import {
  GameFinishedPayload,
  GameStateUpdatePayload,
  GuessResultPayload,
  GuessSubmitPayload,
  PlayerGuessBroadcastPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
} from './types/ws-payloads.types';

@Injectable()
export class WsService {
  private readonly logger = new Logger(WsService.name);

  private server!: Server;
  private readonly connectedPlayers = new Map<string, string>();

  constructor(private readonly gameService: GameService) {}

  public setServer(server: Server): void {
    this.server = server;
  }

  public async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`WS Client connected: ${client.id}`);

    const gameState = await this.gameService.getGameState();

    const payload: GameStateUpdatePayload = {
      activePlayers: gameState.activePlayers ?? [],
      totalGuesses: gameState.totalGuesses ?? 0,
      gameStatus: gameState.status,
    };

    client.emit(WsEvents.GAME_STATE_UPDATE, payload);
  }

  public async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`WS Client disconnected: ${client.id}`);

    const playerId = this.connectedPlayers.get(client.id);

    if (!playerId) {
      return;
    }

    this.connectedPlayers.delete(client.id);

    const activePlayers = await this.gameService.removeActivePlayer(playerId);

    const payload: PlayerLeftPayload = {
      playerId,
      totalPlayers: activePlayers.length,
    };

    this.server.emit(WsEvents.PLAYER_LEFT, payload);
  }

  public async startGame(): Promise<GameState> {
    const payload = await this.gameService.startGame();

    this.connectedPlayers.clear();

    this.server.emit(WsEvents.GAME_STARTED, payload);
    return payload;
  }

  public async handleGuess(
    client: Socket,
    data: GuessSubmitPayload,
  ): Promise<void> {
    const { playerId, guess } = data;

    this.logger.log(`Player ${playerId} submitted guess: ${guess}`);

    const result = await this.gameService.guess(playerId, guess);

    const broadcastPayload: PlayerGuessBroadcastPayload = {
      playerId,
      guess,
      result: result.result,
      timestamp: new Date().toISOString(),
    };
    this.server.emit(WsEvents.PLAYER_GUESS_BROADCAST, broadcastPayload);

    const response: GuessResultPayload = {
      playerId,
      result: result.result,
      winner: result.winner,
    };
    client.emit(WsEvents.GUESS_RESULT, response);

    const gameState = await this.gameService.getGameState();
    const stateUpdatePayload: GameStateUpdatePayload = {
      activePlayers: gameState.activePlayers || [],
      totalGuesses: gameState.totalGuesses || 0,
      gameStatus: gameState.status,
    };
    this.server.emit(WsEvents.GAME_STATE_UPDATE, stateUpdatePayload);

    this.logger.log(`Guess processed for ${playerId}: ${result.result}`);

    if (result.winner) {
      const finishedPayload: GameFinishedPayload = {
        winner: result.winner,
        totalAttempts: result.totalAttempts || 0,
      };

      this.server.emit(WsEvents.GAME_FINISHED, finishedPayload);
      this.logger.log(`Game finished! Winner: ${result.winner}`);
    }
  }

  public async handlePlayerJoin(
    client: Socket,
    playerId: string,
  ): Promise<void> {
    if (this.connectedPlayers.has(client.id)) {
      this.logger.warn(`Player ${playerId} already connected`);
      return;
    }

    this.connectedPlayers.set(client.id, playerId);

    const activePlayers = await this.gameService.addActivePlayer(playerId);

    const payload: PlayerJoinedPayload = {
      playerId,
      totalPlayers: activePlayers.length,
    };
    this.server.emit(WsEvents.PLAYER_JOINED, payload);

    const gameState = await this.gameService.getGameState();
    const stateUpdatePayload: GameStateUpdatePayload = {
      activePlayers: gameState.activePlayers || [],
      totalGuesses: gameState.totalGuesses || 0,
      gameStatus: gameState.status,
    };
    client.emit(WsEvents.GAME_STATE_UPDATE, stateUpdatePayload);

    this.logger.log(
      `Player ${playerId} joined. Total players: ${activePlayers.length}`,
    );
  }
}
