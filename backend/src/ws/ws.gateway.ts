import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameState } from 'src/game/types/game.types';
import { WsEvents } from './enums/ws-events.enum';
import {
  CreateRoomPayload,
  GuessSubmitPayload,
  JoinRoomPayload,
  SetReadyPayload,
  StartGamePayload,
} from './types/ws-payloads.types';
import { WsService } from './ws.service';

@ApiTags('websocket')
@WebSocketGateway({ cors: { origin: '*' }, transports: ['websocket'] })
export class WsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly wsService: WsService) {}

  public afterInit(server: Server): void {
    this.wsService.setServer(server);
  }

  public handleConnection(client: Socket): Promise<void> {
    return this.wsService.handleConnection(client);
  }

  public handleDisconnect(client: Socket): Promise<void> {
    return this.wsService.handleDisconnect(client);
  }

  private emitError(
    client: Socket,
    error: unknown,
    fallback = 'Unknown error',
  ): void {
    const message = error instanceof Error ? error.message : fallback;
    client.emit('error', { message });
  }

  @SubscribeMessage(WsEvents.CREATE_ROOM)
  @ApiOperation({ summary: 'Create a new game room' })
  public async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { playerId }: CreateRoomPayload,
  ): Promise<void> {
    try {
      await this.wsService.createRoom(client, playerId);
    } catch (e) {
      this.emitError(client, e, 'Failed to create room');
    }
  }

  @SubscribeMessage(WsEvents.JOIN_ROOM)
  @ApiOperation({ summary: 'Join an existing room' })
  public async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, playerId }: JoinRoomPayload,
  ): Promise<void> {
    try {
      await this.wsService.joinRoom(client, roomId, playerId);
    } catch (e) {
      this.emitError(client, e, 'Failed to join room');
    }
  }

  @SubscribeMessage(WsEvents.SET_READY)
  @ApiOperation({ summary: 'Set player ready status' })
  public async handleSetReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, playerId, isReady }: SetReadyPayload,
  ): Promise<void> {
    try {
      await this.wsService.setPlayerReady(client, roomId, playerId, isReady);
    } catch (e) {
      this.emitError(client, e, 'Failed to set ready');
    }
  }

  @SubscribeMessage(WsEvents.GAME_STARTED)
  @ApiOperation({ summary: 'Start a new game via WebSocket' })
  public async handleGameStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: StartGamePayload,
  ): Promise<GameState | { error: string }> {
    try {
      return await this.wsService.startGame(roomId);
    } catch (e) {
      this.emitError(client, e, 'Failed to start game');
      return { error: e instanceof Error ? e.message : 'Failed to start game' };
    }
  }

  @SubscribeMessage(WsEvents.GUESS_SUBMIT)
  @ApiOperation({ summary: 'Submit a guess via WebSocket' })
  public async handleGuess(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GuessSubmitPayload,
  ): Promise<void> {
    try {
      await this.wsService.handleGuess(client, payload);
    } catch (e) {
      this.emitError(client, e, 'Failed to submit guess');
    }
  }

  @SubscribeMessage(WsEvents.GET_ROOMS)
  @ApiOperation({ summary: 'Get list of available rooms' })
  public handleGetRooms(@ConnectedSocket() client: Socket): Promise<void> {
    return this.wsService.getRooms(client);
  }

  @SubscribeMessage(WsEvents.ADD_BOT)
  @ApiOperation({ summary: 'Add bot to room' })
  public async handleAddBot(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: string },
  ): Promise<void> {
    try {
      await this.wsService.addBotToRoom(client, roomId);
    } catch (e) {
      this.emitError(client, e, 'Failed to add bot');
    }
  }

  @SubscribeMessage(WsEvents.REMOVE_BOT)
  @ApiOperation({ summary: 'Remove bot from room' })
  public async handleRemoveBot(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId, botId }: { roomId: string; botId: string },
  ): Promise<void> {
    try {
      await this.wsService.removeBotFromRoom(client, roomId, botId);
    } catch (e) {
      this.emitError(client, e, 'Failed to remove bot');
    }
  }

  @SubscribeMessage(WsEvents.LEAVE_ROOM)
  @ApiOperation({ summary: 'Leave room' })
  public async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() { playerId, roomId }: { playerId: string; roomId: string },
  ): Promise<void> {
    try {
      await this.wsService.leaveRoom(client, playerId, roomId);
    } catch (e) {
      this.emitError(client, e, 'Failed to leave room');
    }
  }
}
