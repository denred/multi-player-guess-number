import { ApiProperty } from '@nestjs/swagger';

export class PlayerResponseDto {
  @ApiProperty({
    description: 'Player unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Player name',
    example: 'John Doe',
  })
  name: string;
}
