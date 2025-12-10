export const formatTime = () => new Date().toLocaleTimeString();

export const formatRoomId = (roomId: string) => roomId.slice(0, 8);

export const isBot = (playerName: string) => playerName.startsWith('Bot_');
