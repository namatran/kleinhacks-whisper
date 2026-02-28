
import "dotenv/config";
import express from "express";
import { createServer } from  "http";
import { Server } from "socket.io";
import cors from "cors";
import leoProfanity from "leo-profanity";
import { addToQueue, removeFromQueue, findMatch, waitingUsers } from "./matchmaker.js";

leoProfanity.loadDictionary();

const app = express();
const server = createServer(app);

const CRISIS_KEYWORDS = [
  "kill myself", "want to die", "end my life", "suicide", "self harm",
  "cut myself", "overdose", "don't want to live"
];

const EXTRA_PATTERNS = [
  /b+i+t+c+h/i,
  /a+s+s/i,
  /f+u+c+k/i,
  /s+h+i+t/i,
  /n+i+g+g/i,
  /f+a+g+g/i,
];

function moderateMessage(message) {
  const lower = message.toLowerCase();

  for (const keyword of CRISIS_KEYWORDS) {
    if (lower.includes(keyword)) return { action: "crisis" };
  }

  // Check extra patterns (handles misspells + compounds)
  for (const pattern of EXTRA_PATTERNS) {
    if (pattern.test(message)) return { action: "block" };
  }

  if (leoProfanity.check(message)) return { action: "block" };

  return { action: "allow" };
}

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Track active rooms: roomId -> [socketId, socketId]
const rooms = {};

io.on("connection", (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // JOIN QUEUE
  socket.on("join_queue", ({ email, preferSameSchool }) => {
    if (!email || !email.includes("@")) {
      socket.emit("error", { message: "Invalid email." });
      return;
    }
    console.log(`[Q] ${socket.id} joining queue`);
    addToQueue(socket.id, email, preferSameSchool);
    socket.emit("queue_joined", { position: waitingUsers.length });
    attemptMatch(socket.id);
  });

  // REJOIN ROOM (when chat screen mounts with a new socket)
  socket.on("rejoin_room", ({ roomId }) => {
    if (!rooms[roomId]) return;
    const room = rooms[roomId];
    if (!room.includes(socket.id)) room.push(socket.id);
    console.log(`[REJOIN] ${socket.id} rejoined room ${roomId}`);
  });

  // SEND MESSAGE
  socket.on("send_message", ({ roomId, message }) => {
    if (!roomId || !message?.trim()) return;

    const result = moderateMessage(message);

    if (result.action === "crisis") {
      socket.emit("crisis_detected");
      return;
    }

    if (result.action === "block") {
      socket.emit("message_blocked");
      return;
    }

    const room = rooms[roomId];
    if (!room) return;
    const recipientId = room.find((id) => id !== socket.id);
    if (!recipientId) return;

    const timestamp = Date.now();

    socket.emit("receive_message", { message: message.trim(), timestamp, fromSelf: true });
    io.to(recipientId).emit("receive_message", { message: message.trim(), timestamp, fromSelf: false });

    console.log(`[MSG] ${socket.id} → ${recipientId}`);
  });

  // TYPING INDICATOR
  socket.on("typing", ({ roomId, isTyping }) => {
    const room = rooms[roomId];
    if (!room) return;
    const recipientId = room.find((id) => id !== socket.id);
    if (recipientId) io.to(recipientId).emit("stranger_typing", { isTyping });
  });

  // LEAVE CHAT
  socket.on("leave_chat", ({ roomId }) => {
    handleLeave(socket, roomId);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    removeFromQueue(socket.id);
    for (const [roomId, members] of Object.entries(rooms)) {
      if (members.includes(socket.id)) {
        handleLeave(socket, roomId);
        break;
      }
    }
  });
});

function attemptMatch(socketId) {
  const match = findMatch(socketId);
  if (!match) return;
  removeFromQueue(socketId);
  removeFromQueue(match.socketId);
  const roomId = `room_${Date.now()}`;
  rooms[roomId] = [socketId, match.socketId];
  io.to(socketId).emit("match_found", { roomId });
  io.to(match.socketId).emit("match_found", { roomId });
  console.log(`[MATCH] Room ${roomId}: ${socketId} <-> ${match.socketId}`);
}

function handleLeave(socket, roomId) {
  if (!roomId || !rooms[roomId]) return;
  const members = rooms[roomId];
  const recipientId = members.find((id) => id !== socket.id);
  if (recipientId) io.to(recipientId).emit("stranger_left");
  delete rooms[roomId];
  console.log(`[LEAVE] Room ${roomId} closed`);
}

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Whisper server running on port ${PORT}`);
});