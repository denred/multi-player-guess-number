# Multiplayer Guess Number — Frontend

This is the frontend client for the Multiplayer Guess Number game.  
The application communicates with the backend via REST API and WebSockets (Socket.io).

## Requirements

- Node.js 18+
- npm or yarn

## Installation

```bash
npm install
```

## Local Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

Create a .env file:

```bash
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
```
