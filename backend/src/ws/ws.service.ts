import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from 'src/game/services/game.service';
import { RoomService } from 'src/game/services/room.service';
import { GameState, RoomState } from 'src/game/types/game.types';
import { PlayersService } from 'src/players/players.service';
import { BOT_PREFIX, BotConfig } from './config/bot.config';
import { WsEvents } from './enums/ws-events.enum';
import {
  ConnectedPlayer,
  GameStateUpdatePayload,
  GuessResultPayload,
  GuessSubmitPayload,
  PlayerGuessBroadcastPayload,
  RoomStateUpdatePayload,
} from './types/ws-payloads.types';
import { generateBotName } from './utils/bot.util';
import { sleep } from './utils/sleep.util';

@Injectable()
export class WsService {
  private readonly logger = new Logger(WsService.name);
  private readonly connectedPlayers = new Map<string, ConnectedPlayer>();
  private server!: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly playersService: PlayersService,
    private readonly roomService: RoomService,
  ) {}

  public setServer(server: Server): void {
    this.server = server;
  }

  public async handleConnection(client: Socket): Promise<void> {
    await this.cleanupDisconnectedRooms();
    const rooms = await this.roomService.getAllRooms();
    client.emit(WsEvents.AVAILABLE_ROOMS, { rooms });
  }

  public async handleDisconnect(client: Socket): Promise<void> {
    const playerData = this.connectedPlayers.get(client.id);

    if (!playerData) {
      return;
    }

    const { playerId, roomId } = playerData;
    this.connectedPlayers.delete(client.id);

    const player = await this.playersService.getPlayer(playerId);
    const playerName = player?.name ?? 'Unknown';

    if (roomId) {
      await this.roomService.removePlayerFromRoom(roomId, playerId);
      await this.handleRoomAfterPlayerChange(roomId);
    }

    await this.playersService.deletePlayer(playerId);

    this.logger.log(
      `Player ${playerName} (${playerId}) disconnected and removed`,
    );
  }

  public async createRoom(client: Socket, playerId: string): Promise<void> {
    const player = await this.playersService.getPlayer(playerId);

    if (!player) {
      client.emit('error', { message: 'Player not found' });
      return;
    }

    const room = await this.roomService.createRoom(playerId);
    await client.join(room.id);

    this.connectedPlayers.set(client.id, { playerId, roomId: room.id });

    const roomState = await this.roomService.getRoomState(room.id);
    client.emit(WsEvents.ROOM_CREATED, this.mapRoomStateToPayload(roomState));

    await this.broadcastAvailableRooms();

    this.logger.log(`Player ${player.name} created room ${room.id}`);
  }

  public async joinRoom(
    client: Socket,
    roomId: string,
    playerId: string,
  ): Promise<void> {
    const player = await this.playersService.getPlayer(playerId);

    if (!player) {
      client.emit('error', { message: 'Player not found' });
      return;
    }

    try {
      await this.roomService.joinRoom(roomId, playerId);
      await client.join(roomId);

      this.connectedPlayers.set(client.id, { playerId, roomId });

      const roomState = await this.roomService.getRoomState(roomId);

      this.server
        .to(roomId)
        .emit(
          WsEvents.ROOM_STATE_UPDATE,
          this.mapRoomStateToPayload(roomState),
        );

      await this.broadcastAvailableRooms();

      this.logger.log(`Player ${player.name} joined room ${roomId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to join room';
      client.emit('error', { message });
    }
  }

  public async setPlayerReady(
    client: Socket,
    roomId: string,
    playerId: string,
    isReady: boolean,
  ): Promise<void> {
    try {
      await this.roomService.setPlayerReady(roomId, playerId, isReady);

      const roomState = await this.roomService.getRoomState(roomId);

      this.server
        .to(roomId)
        .emit(
          WsEvents.ROOM_STATE_UPDATE,
          this.mapRoomStateToPayload(roomState),
        );

      const [allReady, freshRoomState] = await Promise.all([
        this.roomService.areAllPlayersReady(roomId),
        this.roomService.getRoomState(roomId),
      ]);

      this.logger.log(
        `Room ${roomId}: ${freshRoomState.players.length} players, ${freshRoomState.readyPlayers.length} ready. All ready: ${allReady}`,
      );

      if (allReady) {
        await this.startGame(roomId);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to set ready';
      client.emit('error', { message });
    }
  }

  public async startGame(roomId: string): Promise<GameState> {
    try {
      const payload = await this.gameService.startGameInRoom(roomId);

      const [socketsInRoom, roomState, rooms] = await Promise.all([
        this.server.in(roomId).fetchSockets(),
        this.roomService.getRoomState(roomId),
        this.roomService.getAllRooms(),
      ]);

      this.logger.log(
        `Emitting game_started to room ${roomId}, ${socketsInRoom.length} socket(s) connected`,
      );

      this.server.to(roomId).emit(WsEvents.GAME_STARTED, payload);

      const stateUpdatePayload = this.buildGameStatePayload(payload);
      this.server
        .to(roomId)
        .emit(WsEvents.GAME_STATE_UPDATE, stateUpdatePayload);

      this.server
        .to(roomId)
        .emit(
          WsEvents.ROOM_STATE_UPDATE,
          this.mapRoomStateToPayload(roomState),
        );

      this.server.emit(WsEvents.AVAILABLE_ROOMS, { rooms });

      if (payload.currentTurnPlayerId) {
        await this.processBotTurnIfNeeded(roomId, payload.currentTurnPlayerId);
      }

      return payload;
    } catch (error) {
      this.logger.error('Failed to start game:', error);
      throw error;
    }
  }

  public async handleGuess(
    client: Socket,
    data: GuessSubmitPayload,
  ): Promise<void> {
    const { playerId, guess, roomId } = data;

    const player = await this.playersService.getPlayer(playerId);

    if (!player) {
      client.emit('exception', { message: 'Player not found' });
      return;
    }

    try {
      await this.processGuess({
        roomId,
        playerId,
        playerName: player.name,
        guess,
        sourceClient: client,
        emitResultToClient: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to process guess';
      client.emit('exception', { message });
    }
  }

  public async makeGuess(
    roomId: string,
    playerId: string,
    guess: number,
  ): Promise<void> {
    const player = await this.playersService.getPlayer(playerId);
    if (!player) {
      this.logger.error(`Player ${playerId} not found`);
      return;
    }

    try {
      await this.processGuess({
        roomId,
        playerId,
        playerName: player.name,
        guess,
        emitResultToClient: false,
      });
    } catch (error) {
      this.logger.error('Failed to process guess:', error);
    }
  }

  public async getRooms(client: Socket): Promise<void> {
    await this.cleanupDisconnectedRooms();
    const rooms = await this.roomService.getAllRooms();
    client.emit(WsEvents.AVAILABLE_ROOMS, { rooms });
  }

  public async addBotToRoom(client: Socket, roomId: string): Promise<void> {
    try {
      const botName = generateBotName();
      const bot = await this.playersService.createPlayer({ name: botName });

      await this.roomService.joinRoom(roomId, bot.id);
      await this.roomService.setPlayerReady(roomId, bot.id, true);

      const roomState = await this.roomService.getRoomState(roomId);

      this.server
        .to(roomId)
        .emit(
          WsEvents.ROOM_STATE_UPDATE,
          this.mapRoomStateToPayload(roomState),
        );

      this.logger.log(
        `Bot ${bot.name} added to room ${roomId} and set to ready`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add bot';
      client.emit('error', { message });
    }
  }

  public async removeBotFromRoom(
    client: Socket,
    roomId: string,
    botId: string,
  ): Promise<void> {
    try {
      const bot = await this.playersService.getPlayer(botId);

      if (!bot || !this.isBotName(bot.name)) {
        client.emit('error', { message: 'Not a bot or bot not found' });
        return;
      }

      await Promise.all([
        this.roomService.removePlayerFromRoom(roomId, botId),
        this.playersService.deletePlayer(botId),
      ]);

      const roomState = await this.roomService.getRoomState(roomId);

      this.server
        .to(roomId)
        .emit(
          WsEvents.ROOM_STATE_UPDATE,
          this.mapRoomStateToPayload(roomState),
        );

      this.logger.log(`Bot ${bot.name} removed from room ${roomId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove bot';
      client.emit('error', { message });
    }
  }

  public async leaveRoom(
    client: Socket,
    playerId: string,
    roomId: string,
  ): Promise<void> {
    try {
      await client.leave(roomId);

      if (this.connectedPlayers.has(client.id)) {
        this.connectedPlayers.delete(client.id);
      }

      await this.roomService.removePlayerFromRoom(roomId, playerId);
      await this.handleRoomAfterPlayerChange(roomId);

      this.logger.log(`Player ${playerId} left room ${roomId}`);
    } catch (error) {
      this.logger.error('Failed to leave room:', error);
      throw error;
    }
  }

  private async processGuess(params: {
    roomId: string;
    playerId: string;
    playerName: string;
    guess: number;
    sourceClient?: Socket;
    emitResultToClient: boolean;
  }): Promise<void> {
    const {
      roomId,
      playerId,
      playerName,
      guess,
      sourceClient,
      emitResultToClient,
    } = params;

    const result = await this.gameService.guessInRoom(roomId, playerId, guess);

    const broadcastPayload: PlayerGuessBroadcastPayload = {
      playerId,
      playerName,
      guess,
      result: result.result,
      timestamp: new Date().toISOString(),
    };

    this.server
      .to(roomId)
      .emit(WsEvents.PLAYER_GUESS_BROADCAST, broadcastPayload);

    if (emitResultToClient && sourceClient) {
      const guessResultPayload: GuessResultPayload = {
        playerId,
        result: result.result,
        winner: result.winner,
      };
      sourceClient.emit(WsEvents.GUESS_RESULT, guessResultPayload);
    }

    if (result.winner) {
      this.server.to(roomId).emit(WsEvents.GAME_FINISHED, {
        winner: result.winner,
        winnerName: playerName,
        totalAttempts: result.totalAttempts ?? 0,
      });
    }

    const gameState = await this.gameService.getGameStateForRoom(roomId);
    const gameStatePayload = this.buildGameStatePayload(gameState);

    this.server.to(roomId).emit(WsEvents.GAME_STATE_UPDATE, gameStatePayload);

    if (gameState.currentTurnPlayerId && !result.winner) {
      await this.processBotTurnIfNeeded(roomId, gameState.currentTurnPlayerId);
    }
  }

  private async processBotTurnIfNeeded(
    roomId: string,
    playerId: string,
  ): Promise<void> {
    try {
      const player = await this.playersService.getPlayer(playerId);

      if (!player || !this.isBotName(player.name)) {
        return;
      }

      this.logger.log(`Bot ${player.name} is making a move in room ${roomId}`);

      const thinkingTime =
        BotConfig.THINKING_MIN_MS +
        Math.random() * (BotConfig.THINKING_MAX_MS - BotConfig.THINKING_MIN_MS);

      await sleep(thinkingTime);

      const guess =
        Math.floor(
          Math.random() * (BotConfig.GUESS_MAX - BotConfig.GUESS_MIN + 1),
        ) + BotConfig.GUESS_MIN;

      await this.makeGuess(roomId, playerId, guess);
    } catch (error) {
      this.logger.error('Failed to process bot turn:', error);
    }
  }

  private mapRoomStateToPayload(roomState: RoomState): RoomStateUpdatePayload {
    return {
      room: roomState.room,
      players: roomState.players,
      readyPlayers: roomState.readyPlayers,
      currentTurnPlayerId: roomState.currentTurnPlayerId,
      totalGuesses: roomState.totalGuesses,
    };
  }

  private buildGameStatePayload(state: GameState): GameStateUpdatePayload {
    return {
      activePlayers: state.activePlayers ?? [],
      totalGuesses: state.totalGuesses ?? 0,
      gameStatus: state.status,
      currentTurnPlayerId: state.currentTurnPlayerId,
      roomId: state.roomId,
    };
  }

  private async broadcastAvailableRooms(): Promise<void> {
    const rooms = await this.roomService.getAllRooms();
    this.server.emit(WsEvents.AVAILABLE_ROOMS, { rooms });
  }

  private isBotName(name: string): boolean {
    return name.startsWith(BOT_PREFIX);
  }

  private async handleRoomAfterPlayerChange(roomId: string): Promise<void> {
    const roomState = await this.roomService.getRoomState(roomId);

    const hasRealPlayers = roomState.players.some(
      (p) => !this.isBotName(p.name),
    );

    if (!hasRealPlayers) {
      await Promise.all(
        roomState.players.map((player) =>
          Promise.all([
            this.roomService.removePlayerFromRoom(roomId, player.id),
            this.playersService.deletePlayer(player.id),
          ]),
        ),
      );
      await this.roomService.deleteRoomIfEmpty(roomId);
    } else {
      this.server
        .to(roomId)
        .emit(
          WsEvents.ROOM_STATE_UPDATE,
          this.mapRoomStateToPayload(roomState),
        );
    }

    await this.broadcastAvailableRooms();
  }

  private async cleanupDisconnectedRooms(): Promise<void> {
    try {
      const rooms = await this.roomService.getAllRooms();
      const connectedPlayerIds = Array.from(this.connectedPlayers.values()).map(
        (data) => data.playerId,
      );

      await Promise.all(
        rooms.map(async (room) => {
          const roomState = await this.roomService.getRoomState(room.id);

          const hasConnectedRealPlayers = roomState.players.some(
            (player) =>
              !this.isBotName(player.name) &&
              connectedPlayerIds.includes(player.id),
          );

          if (!hasConnectedRealPlayers) {
            this.logger.log(
              `Cleaning up room ${room.id} - no connected real players`,
            );

            await Promise.all(
              room.playerIds.map((playerId) =>
                Promise.all([
                  this.roomService.removePlayerFromRoom(room.id, playerId),
                  this.playersService.deletePlayer(playerId),
                ]),
              ),
            );

            await this.roomService.deleteRoomIfEmpty(room.id);
          }
        }),
      );
    } catch (error) {
      this.logger.error('Error cleaning up disconnected rooms:', error);
    }
  }
}
