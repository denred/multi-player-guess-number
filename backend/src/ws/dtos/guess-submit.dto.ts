import { ApiProperty } from '@nestjs/swagger';

export class PlayerIdDto {
  @ApiProperty({
    description: 'Player unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  playerId: string;
}

export class GuessSubmitDto extends PlayerIdDto {
  @ApiProperty({
    description: 'Player guess number',
    example: 42,
    minimum: 1,
    maximum: 100,
  })
  guess: number;
}
