const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// In-memory user storage: username -> user object
let users = new Map();
let idCounter = 1;

function createUser(username) {
  const userId = "u" + idCounter++;
  const user = {
    userId,
    username,
    createdAt: new Date().toISOString()
  };
  users.set(username, user);
  return user;
}

// Simple username-based login (auto-register)
app.post("/users/login", (req, res) => {
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }
  if (users.has(username)) {
    return res.json(users.get(username));
  }
  const user = createUser(username);
  return res.json(user);
});

// Get user by id
app.get("/users/:userId", (req, res) => {
  const { userId } = req.params;
  const user = Array.from(users.values()).find(u => u.userId === userId);
  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }
  res.json(user);
});

app.get("/", (_req, res) => {
  res.send("User Service is running");
});

app.listen(PORT, () => {
  console.log(`User Service listening on port ${PORT}`);
});
