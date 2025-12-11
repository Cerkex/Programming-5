const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 4002;
const GAME_RULES_URL = process.env.GAME_RULES_URL || "http://localhost:4003";

app.use(cors());
app.use(express.json());

// In-memory rooms: roomId -> room
let rooms = new Map();
let roomCounter = 1;

function createRoom(firstUserId) {
  const roomId = "r" + roomCounter++;
  const room = {
    roomId,
    players: [firstUserId],
    status: "WAITING", // WAITING / IN_PROGRESS / FINISHED
    currentTurnUserId: null,
    remainingAttempts: 6
  };
  rooms.set(roomId, room);
  return room;
}

function findWaitingRoom() {
  for (const room of rooms.values()) {
    if (room.status === "WAITING" && room.players.length === 1) {
      return room;
    }
  }
  return null;
}

async function notifyGameStart(room) {
  try {
    await fetch(`${GAME_RULES_URL}/game/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: room.roomId,
        players: room.players,
        currentTurnUserId: room.currentTurnUserId,
        remainingAttempts: room.remainingAttempts
      })
    });
  } catch (err) {
    console.error("Failed to notify Game Rules Service:", err.message);
  }
}

// Join a room (matchmaking). If no waiting room, create one.
app.post("/rooms/join", async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  let room = findWaitingRoom();
  if (!room) {
    room = createRoom(userId);
    return res.status(201).json(room);
  }

  if (room.players.includes(userId)) {
    return res.status(400).json({ error: "user already in the room" });
  }

  room.players.push(userId);
  room.status = "IN_PROGRESS";
  room.currentTurnUserId = room.players[0];
  room.remainingAttempts = 6;
  rooms.set(room.roomId, room);

  await notifyGameStart(room);

  res.json(room);
});

// Get room info
app.get("/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "room not found" });
  }
  res.json(room);
});

// Update room state from Game Rules Service
app.post("/rooms/update-state", (req, res) => {
  const { roomId, currentTurnUserId, remainingAttempts, status } = req.body || {};
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "room not found" });
  }
  if (typeof currentTurnUserId === "string") {
    room.currentTurnUserId = currentTurnUserId;
  }
  if (typeof remainingAttempts === "number") {
    room.remainingAttempts = remainingAttempts;
  }
  if (typeof status === "string") {
    room.status = status;
  }
  rooms.set(roomId, room);
  res.json(room);
});

app.get("/", (_req, res) => {
  res.send("Room Service is running");
});

app.listen(PORT, () => {
  console.log(`Room Service listening on port ${PORT}`);
});
