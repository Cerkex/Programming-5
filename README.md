# Programming-5
Distributed Tic-Tac-Toe Arena

Author: Berk Vurdum
Student Code: XW87E6
Course: Programming 5 – Distributed Systems Project

1. Project Overview

This project implements a distributed, turn-based Tic-Tac-Toe game running on a microservices architecture and communicating with multiple client applications via WebSockets.
The focus aligns fully with the Programming 5 project requirements:

3 independent backend microservices

Real-time communication using WebSockets

3 different types of clients (CLI, Web, Mobile)

HTTP-based inter-service communication

In-memory storage (no database)

2. Technologies
Backend (Microservices – Node.js + TypeScript)
Service	Description	Port
User Service	Handles user registration/login and user lookup	4001
Room Service	Creates/join rooms, stores game state, hosts WebSocket server	4002
Game Rules Service	Validates moves and computes win/draw state	4003

All services use:

Express.js (HTTP API)

TypeScript

In-memory state (Map, Arrays)

Clients
Client	Tech	Notes
CLI Client	Python + websocket-client	Terminal gameplay
Web Client	HTML, CSS, Vanilla JavaScript	Click-based board UI
Mobile Client	Hybrid (Capacitor / wrapper of Web Client)	Satisfies mobile requirement
3. Microservice Architecture
+--------------------+         +-----------------------+         +-----------------------+
|    User Service    | <--->   |     Room Service      | <--->   |  Game Rules Service   |
|   (HTTP REST)      |         |  (HTTP + WebSocket)   |         |     (HTTP REST)       |
+--------------------+         +-----------------------+         +-----------------------+
                                     |
                                     |  WebSocket
                                     v
                   +------------------------- Clients -------------------------+
                   | CLI Client | Web Client | Mobile Client |
                   +-----------------------------------------------------------+

4. Service-to-Service API (HTTP)
User Service
Method	Endpoint	Description
POST	/users/register	Registers a username
POST	/users/login	Logs in (or auto-registers) a user
GET	/users/:userId	Returns user info
Room Service
Method	Endpoint	Description
POST	/rooms	Creates a new room
POST	/rooms/:roomId/join	Adds second player and starts game
GET	/rooms/:roomId	Returns room status
Game Rules Service
Method	Endpoint	Description
POST	/games/validate	Validates a move and computes new board / winner / draw
5. WebSocket Message Schema
Client → Server
{
  "type": "auth",
  "payload": { "roomId": "r1", "userId": "u123" }
}

{
  "type": "make_move",
  "payload": { "roomId": "r1", "userId": "u123", "moveIndex": 4 }
}

Server → Client

room_update

{
  "type": "room_update",
  "payload": { "roomId": "r1", "players": [...], "status": "playing" }
}


board_update

{
  "type": "board_update",
  "payload": { "roomId": "r1", "board": [...], "currentTurnUserId": "u456" }
}


game_over

{
  "type": "game_over",
  "payload": { "winnerUserId": "u123", "winnerSymbol": "X", "isDraw": false }
}

6. Running the System
Start User Service
cd backend/user-service
npm install
npm run build
npm start

Start Game Rules Service
cd backend/game-rules-service
npm install
npm run build
npm start

Start Room Service
cd backend/room-service
npm install
npm run build
npm start

7. Running Clients
CLI Client
cd clients/cli-client
pip install -r requirements.txt
python main.py

Web Client

Open clients/web-client/index.html in a browser or run through a static server.

Mobile Client

Uses a hybrid wrapper (Capacitor / React Native WebView) to load the Web Client.
This satisfies the Programming 5 "Mobile Client" requirement.
