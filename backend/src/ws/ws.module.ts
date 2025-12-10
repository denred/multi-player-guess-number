import { Module } from '@nestjs/common';
import { GameModule } from 'src/game/game.module';
import { WsGateway } from './ws.gateway';
import { WsService } from './ws.service';

@Module({
  imports: [GameModule],
  providers: [WsGateway, WsService],
  exports: [WsService],
})
export class WsModule {}
