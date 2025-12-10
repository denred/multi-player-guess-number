export enum WsEvents {
  PLAYER_CONNECTED = 'player_connected',
  PLAYER_DISCONNECTED = 'player_disconnected',
  GUESS_SUBMIT = 'guess_submit',
  GUESS_RESULT = 'guess_result',
  GAME_STARTED = 'game_started',
  GAME_FINISHED = 'game_finished',
  PLAYER_GUESS_BROADCAST = 'player_guess_broadcast',
  GAME_STATE_UPDATE = 'game_state_update',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
}
