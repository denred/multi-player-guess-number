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
import { GuessSubmitDto, PlayerIdDto } from './dtos/guess-submit.dto';
import { WsEvents } from './enums/ws-events.enum';
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

  public async handleConnection(client: Socket): Promise<void> {
    await this.wsService.handleConnection(client);
  }

  public async handleDisconnect(client: Socket): Promise<void> {
    await this.wsService.handleDisconnect(client);
  }

  @SubscribeMessage(WsEvents.GAME_STARTED)
  @ApiOperation({ summary: 'Start a new game via WebSocket' })
  public async handleGameStart(): Promise<GameState> {
    return this.wsService.startGame();
  }

  @SubscribeMessage(WsEvents.GUESS_SUBMIT)
  @ApiOperation({ summary: 'Submit a guess via WebSocket' })
  public async handleGuess(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GuessSubmitDto,
  ): Promise<void> {
    await this.wsService.handleGuess(client, data);
  }

  @SubscribeMessage(WsEvents.PLAYER_JOINED)
  @ApiOperation({ summary: 'Player joins the game' })
  public async handlePlayerJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PlayerIdDto,
  ): Promise<void> {
    await this.wsService.handlePlayerJoin(client, data.playerId);
  }
}
