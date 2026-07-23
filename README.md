# Hand Cricket Multiplayer

Modern real-time private-room Hand Cricket built with React, Vite, TypeScript, Tailwind CSS, Framer Motion, Express, and Socket.IO.

## Architecture

```text
client/                 React + Vite UI
  src/components/       Reusable cards, controls, scoreboard, lobby, toss, match views
  src/hooks/            Socket, audio, latency, local session helpers
  src/pages/            Home and room game shell
  src/types/            Client-only view types

server/                 Express + Socket.IO API
  src/controllers/      SocketController event boundary
  src/game/             GameManager, Room, MatchEngine
  src/http/             Express app and health routes
  src/types/            Server runtime types

shared/                 Shared strict TypeScript contracts
  src/events.ts         Socket payload and response types
  src/game.ts           Game-state DTOs and enums
```

## Component hierarchy

```text
App
  HomeScreen
  GameRoom
    ShellHeader
    ConnectionPanel
    LobbyPanel
    TossPanel
    MatchPanel
      Scoreboard
      NumberPad
      RevealPanel
      MatchSummary
    RematchPanel
```

## Run locally

```bash
npm install
npm run dev:server
npm run dev:client
```

Client: http://localhost:5173
Server: http://localhost:3000

## Production

```bash
npm run build
npm start
```

## Docker

```bash
docker compose up --build
```

## Kubernetes

Example manifests live in `k8s/`.
