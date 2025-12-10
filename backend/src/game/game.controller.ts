import { Controller, Get, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GameStateDto } from './dtos/game-state.dto';
import { GameService } from './services/game.service';
import { GameState } from './types/game.types';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new game' })
  @ApiBody({ required: false, description: 'No body required' })
  @ApiResponse({ status: HttpStatus.CREATED, type: GameStateDto })
  public async startGame(): Promise<GameState> {
    return this.gameService.startGame();
  }

  @Get('state')
  @ApiOperation({ summary: 'Get current game state' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current game state',
    type: GameStateDto,
  })
  public async getGameState(): Promise<GameState> {
    return this.gameService.getGameState();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get game history with all player guesses' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Game history',
  })
  public async getGameHistory() {
    return this.gameService.getGameHistory();
  }

  @Get('players')
  @ApiOperation({ summary: 'Get active players in the game' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active players list',
  })
  public async getActivePlayers(): Promise<string[]> {
    return this.gameService.getActivePlayers();
  }
}
