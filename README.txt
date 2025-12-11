Word Guessing Game
NEPTUN: XW87E6
=============================

Structure:
- backend/
  - user-service/        (port 4001)
  - room-service/        (port 4002)
  - game-rules-service/  (port 4003, WebSocket)
- clients/
  - cli/                 (terminal client)
  - web/                 (simple browser client)

How to run backend:
1) In three separate terminals:

  cd backend/user-service
  npm install
  npm start

  cd backend/room-service
  npm install
  npm start

  cd backend/game-rules-service
  npm install
  npm start

CLI client (two players on same PC):
------------------------------------
Open two more terminals:

Terminal A:
  cd clients/cli
  npm install   (only first time)
  npm start
  # enter username, e.g. player1

Terminal B:
  cd clients/cli
  npm start
  # enter username, e.g. player2

Web client:
-----------
After backend is running:

Open file clients/web/index.html in browser (or serve via simple HTTP server).
Each browser tab acts like one client.

Game:
- Join room, wait until two players are connected.
- Turn-based guessing via WebSocket updates.
