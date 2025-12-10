import { z } from 'zod';

export const playerNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[\p{L}\p{N}\s_-]+$/u, 'Name contains invalid characters');

export const guessSchema = z
  .string()
  .min(1, 'Please enter a number')
  .refine((val) => !isNaN(Number(val)), 'Must be a valid number')
  .refine((val) => Number(val) >= 1 && Number(val) <= 100, 'Number must be between 1 and 100')
  .refine((val) => Number.isInteger(Number(val)), 'Must be a whole number');
