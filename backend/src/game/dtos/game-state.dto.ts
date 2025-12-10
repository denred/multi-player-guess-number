import { ApiProperty } from '@nestjs/swagger';
import { GameStatus } from '../enums/game-status.enum';

export class GameStateDto {
  @ApiProperty({
    description: 'Current game status',
    enum: GameStatus,
    example: GameStatus.INACTIVE,
  })
  status: GameStatus;

  @ApiProperty({
    description: 'Secret number to guess (only shown when game is active)',
    example: 42,
    required: false,
  })
  secret?: number;
}