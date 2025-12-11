const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 4003;
const ROOM_SERVICE_URL = process.env.ROOM_SERVICE_URL || "http://localhost:4002";

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// roomId -> game state
let gameStates = new Map();
// roomId -> Set<WebSocket>
let roomSubscriptions = new Map();

const WORDS = ["APPLE", "BANANA", "MANGO", "PEACH", "GRAPE", "ORANGE"];

function maskWord(word, guessedLetters) {
  return word
    .split("")
    .map(ch => (guessedLetters.includes(ch) ? ch : "_"))
    .join("");
}

function broadcastUpdate(roomId) {
  const state = gameStates.get(roomId);
  const subs = roomSubscriptions.get(roomId);
  if (!state || !subs) return;

  const payload = JSON.stringify({
    event: "GAME_UPDATE",
    roomId: state.roomId,
    maskedWord: state.maskedWord,
    remainingAttempts: state.remainingAttempts,
    currentTurnUserId: state.currentTurnUserId,
    winnerUserId: state.winnerUserId
  });

  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// WebSocket for clients
wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "SUBSCRIBE" && msg.roomId) {
        const roomId = msg.roomId;
        if (!roomSubscriptions.has(roomId)) {
          roomSubscriptions.set(roomId, new Set());
        }
        roomSubscriptions.get(roomId).add(ws);
        ws.roomId = roomId;
      }
    } catch (err) {
      console.error("WebSocket message error:", err);
    }
  });

  ws.on("close", () => {
    const roomId = ws.roomId;
    if (roomId && roomSubscriptions.has(roomId)) {
      roomSubscriptions.get(roomId).delete(ws);
    }
  });
});

// Start game
app.post("/game/start", (req, res) => {
  const { roomId, players, currentTurnUserId, remainingAttempts } = req.body || {};
  if (!roomId || !Array.isArray(players) || players.length !== 2) {
    return res.status(400).json({ error: "roomId and two players are required" });
  }

  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const guessedLetters = [];
  const maskedWord = maskWord(word, guessedLetters);

  const state = {
    roomId,
    players,
    word,
    guessedLetters,
    maskedWord,
    remainingAttempts: typeof remainingAttempts === "number" ? remainingAttempts : 6,
    currentTurnUserId: currentTurnUserId || players[0],
    winnerUserId: null
  };

  gameStates.set(roomId, state);
  broadcastUpdate(roomId);

  res.json({
    roomId: state.roomId,
    maskedWord: state.maskedWord,
    remainingAttempts: state.remainingAttempts
  });
});

// Handle move
app.post("/game/move", async (req, res) => {
  const { roomId, userId, guess } = req.body || {};
  if (!roomId || !userId || !guess) {
    return res.status(400).json({ error: "roomId, userId and guess are required" });
  }

  const state = gameStates.get(roomId);
  if (!state) {
    return res.status(404).json({ error: "game state not found" });
  }
  if (state.winnerUserId) {
    return res.status(400).json({ error: "game already finished" });
  }
  if (state.currentTurnUserId !== userId) {
    return res.status(400).json({ error: "not your turn" });
  }

  const upperGuess = String(guess).trim().toUpperCase();

  // Letter guess
  if (upperGuess.length === 1) {
    const letter = upperGuess;
    if (!/^[A-Z]$/.test(letter)) {
      return res.status(400).json({ error: "invalid letter guess" });
    }
    if (!state.guessedLetters.includes(letter)) {
      state.guessedLetters.push(letter);
    }
    if (!state.word.includes(letter)) {
      state.remainingAttempts -= 1;
    }
  } else {
    // Full word guess
    if (upperGuess === state.word) {
      state.maskedWord = state.word;
      state.winnerUserId = userId;
    } else {
      state.remainingAttempts -= 1;
    }
  }

  // Update masked word
  state.maskedWord = maskWord(state.word, state.guessedLetters);

  // Check win
  if (!state.maskedWord.includes("_")) {
    state.winnerUserId = state.winnerUserId || userId;
  }

  // Attempts
  if (state.remainingAttempts <= 0 && !state.winnerUserId) {
    state.remainingAttempts = 0;
  }

  // Switch turn
  const otherPlayer = state.players.find(p => p !== userId);
  state.currentTurnUserId = otherPlayer;

  gameStates.set(roomId, state);

  // Notify Room Service
  try {
    const status = state.winnerUserId || state.remainingAttempts === 0 ? "FINISHED" : "IN_PROGRESS";
    await fetch(`${ROOM_SERVICE_URL}/rooms/update-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        currentTurnUserId: state.currentTurnUserId,
        remainingAttempts: state.remainingAttempts,
        status
      })
    });
  } catch (err) {
    console.error("Failed to update Room Service:", err.message);
  }

  broadcastUpdate(roomId);

  res.json({
    roomId: state.roomId,
    maskedWord: state.maskedWord,
    remainingAttempts: state.remainingAttempts,
    currentTurnUserId: state.currentTurnUserId,
    winnerUserId: state.winnerUserId
  });
});

app.get("/", (_req, res) => {
  res.send("Game Rules Service is running");
});

server.listen(PORT, () => {
  console.log(`Game Rules Service listening on port ${PORT}`);
});
