// index.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { addToQueue, removeFromQueue, findMatch, waitingUsers } = require("./matchmaker");

const app = express();
const server = http.createServer(app);

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
    const room = rooms[roomId];
    if (!room) return;
    const recipientId = room.find((id) => id !== socket.id);
    if (!recipientId) return;
    io.to(recipientId).emit("receive_message", {
      message: message.trim(),
      timestamp: Date.now(),
    });
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