import { BOT_PREFIX } from '../config/bot.config';

export const generateBotName = (): string => {
  const suffix = Date.now().toString().slice(-4);
  return `${BOT_PREFIX}${suffix}`;
};
