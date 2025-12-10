import { GuessResult } from '../enums/guess-result.enum';

export type GuessResponse = {
  result: GuessResult;
  winner?: string;
  totalAttempts?: number;
};
