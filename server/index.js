
import "dotenv/config";
import express from "express";
import { createServer } from  "http";
import { Server } from "socket.io";
import cors from "cors";
import leoProfanity from "leo-profanity";
import { addToQueue, removeFromQueue, findMatch, waitingUsers } from "./matchmaker.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function categorizeInterest(interest) {
  if (!interest?.trim()) return null;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 20,
      messages: [{
        role: "user",
        content: `Categorize this student interest into ONE short topic label (e.g. "gaming", "academics", "music", "sports", "art", "tech", "anime", "fitness"). Respond with only the label, lowercase.
        
Interest: "${interest.trim()}"`
      }]
    });
    return response.choices[0].message.content.trim().toLowerCase();
  } catch (e) {
    console.error("[AI] Categorization failed:", e.message);
    return null;
  }
}

async function generateIcebreaker(user1, user2) {
  const sharedCategory = user1.category && user1.category === user2.category;
  
  if (sharedCategory) {
    return `You're both interested in ${user1.category}!`;
  }

  try {
    const context = [
      user1.interest ? `Person 1 is into: ${user1.interest}` : null,
      user2.interest ? `Person 2 is into: ${user2.interest}` : null,
    ].filter(Boolean).join(". ");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 60,
      messages: [{
        role: "user",
        content: `Two students are about to chat anonymously. ${context || "They have no listed interests."}
        
Write a single, short, friendly icebreaker question or conversation starter (max 15 words). No quotes, no preamble.`
      }]
    });
    return response.choices[0].message.content.trim();
  } catch (e) {
    console.error("[AI] Icebreaker failed:", e.message);
    return null;
  }
}

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
  socket.on("join_queue", async ({ email, preferSameSchool, interest }) => {
    if (!email || !email.includes("@")) {
      socket.emit("error", { message: "Invalid email." });
      return;
    }
    const category = await categorizeInterest(interest);
    console.log(`[Q] ${socket.id} joining queue | category: ${category}`);
    addToQueue(socket.id, email, preferSameSchool, category, interest);
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

async function attemptMatch(socketId, fallback = false) {
  const result = findMatch(socketId, fallback);
  if (!result) {
    if (!fallback) {
      setTimeout(() => {
        if (waitingUsers.find((u) => u.socketId === socketId)) {
          attemptMatch(socketId, true);
        }
      }, 10000);
    }
    return;
  }

  const { match, reason } = result;
  const user = waitingUsers.find((u) => u.socketId === socketId);
  
  const icebreaker = await generateIcebreaker(user, match);
  
  removeFromQueue(socketId);
  removeFromQueue(match.socketId);
  const roomId = `room_${Date.now()}`;
  rooms[roomId] = [socketId, match.socketId];

  io.to(socketId).emit("match_found", { roomId, reason, icebreaker });
  io.to(match.socketId).emit("match_found", { roomId, reason, icebreaker });

  console.log(`[MATCH] Room ${roomId}: ${socketId} <-> ${match.socketId} (${reason}) | icebreaker: ${icebreaker}`);
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