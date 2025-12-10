import { ZodError } from 'zod';

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Cannot connect to backend';
  }

  if (error instanceof ZodError) {
    return error.issues[0]?.message || 'Validation error';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error';
};
