import { Module } from '@nestjs/common';
import { GameModule } from 'src/game/game.module';
import { PlayersModule } from 'src/players/players.module';
import { WsGateway } from './ws.gateway';
import { WsService } from './ws.service';

@Module({
  imports: [GameModule, PlayersModule],
  providers: [WsGateway, WsService],
  exports: [WsService],
})
export class WsModule {}
