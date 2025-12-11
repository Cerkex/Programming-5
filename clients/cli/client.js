const readline = require("readline");
const WebSocket = require("ws");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:4001";
const ROOM_SERVICE_URL = process.env.ROOM_SERVICE_URL || "http://localhost:4002";
const GAME_RULES_HTTP_URL = process.env.GAME_RULES_URL || "http://localhost:4003";
const GAME_RULES_WS_URL = GAME_RULES_HTTP_URL.replace("http", "ws");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function main() {
  console.log("=== Two-Person Word Guessing Game (CLI Client) ===");

  const username = (await ask("Enter username: ")).trim();
  if (!username) {
    console.log("Username is required. Exiting.");
    rl.close();
    return;
  }

  const loginResp = await fetch(`${USER_SERVICE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  });
  const user = await loginResp.json();
  console.log("Logged in as:", user);

  const roomResp = await fetch(`${ROOM_SERVICE_URL}/rooms/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.userId })
  });
  const room = await roomResp.json();
  console.log("Joined room:", room);

  const roomId = room.roomId;

  const ws = new WebSocket(GAME_RULES_WS_URL);

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "SUBSCRIBE", roomId }));
    console.log("Subscribed to room:", roomId);
    console.log("Waiting for updates / second player...");
  });

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.event !== "GAME_UPDATE" || msg.roomId !== roomId) return;

    console.log("\n=== GAME UPDATE ===");
    console.log("Word:            ", msg.maskedWord);
    console.log("Remaining tries: ", msg.remainingAttempts);
    console.log("Current turn:    ", msg.currentTurnUserId);
    console.log("Winner:          ", msg.winnerUserId);

    if (msg.winnerUserId || msg.remainingAttempts === 0) {
      if (msg.winnerUserId === user.userId) {
        console.log("\n*** YOU WON! ***");
      } else if (!msg.winnerUserId && msg.remainingAttempts === 0) {
        console.log("\nGame over. No winner.");
      } else {
        console.log("\nGame over. You lost.");
      }
      rl.close();
      ws.close();
      return;
    }

    if (msg.currentTurnUserId === user.userId) {
      const guess = (await ask("Your turn! Enter a LETTER or WORD: ")).trim();
      if (!guess) {
        console.log("Empty guess, skipping.");
        return;
      }
      await fetch(`${GAME_RULES_HTTP_URL}/game/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId: user.userId,
          guess
        })
      });
    } else {
      console.log("Waiting for opponent's move...");
    }
  });

  ws.on("close", () => {
    console.log("Disconnected from game server.");
    rl.close();
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });
}

main().catch(err => {
  console.error("Client error:", err);
  rl.close();
});
