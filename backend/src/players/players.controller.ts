import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreatePlayerDto } from './dtos/create-player.dto';
import { PlayerResponseDto } from './dtos/player-response.dto';
import { PlayersService } from './players.service';
import { Player } from './types/player.type';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new player' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Player created successfully',
    type: PlayerResponseDto,
  })
  public async createPlayer(
    @Body() createPlayerDto: CreatePlayerDto,
  ): Promise<Player> {
    return this.playersService.createPlayer(createPlayerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all players' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all players',
    type: [PlayerResponseDto],
  })
  public async getAllPlayers(): Promise<Player[]> {
    return this.playersService.getAllPlayers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Player found',
    type: PlayerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Player not found',
  })
  public async getPlayer(@Param('id') id: string): Promise<Player | null> {
    return this.playersService.getPlayer(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete player by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Player deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Player not found',
  })
  public async deletePlayer(@Param('id') id: string): Promise<void> {
    const removed = await this.playersService.deletePlayer(id);

    if (!removed) {
      throw new NotFoundException('Player not found');
    }
  }
}
