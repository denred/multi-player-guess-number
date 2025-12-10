# Multi-Player Guess Number — Backend (NestJS · Redis · WebSocket)

## Overview

Backend service for a real-time multi-player “Guess the Number” game.
Built with NestJS, Redis, and Socket.IO.
Provides REST API (Swagger) and WebSocket event-driven gameplay.

## Features

- Start and reset game sessions
- Track active players
- Maintain guess history
- Server-side evaluation of guesses
- Real-time broadcasting of:
  - player join/leave
  - new guesses
  - guess results
  - game status updates
  - game completion

## Environment Variables

```bash
NODE_ENV=development
PORT=3000
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
```

## Docker Compose

```bash
docker-compose up --build
```

Default exposed endpoints:

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
