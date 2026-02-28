"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export function useSocket({ roomId, socket: existingSocket, onStrangerLeft }) {
  const socketRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [strangerTyping, setStrangerTyping] = useState(false)
  const [strangerLeft, setStrangerLeft] = useState(false)
  const typingTimeoutRef = useRef(null)

  // Keep socketRef in sync with existingSocket prop
  useEffect(() => {
    if (existingSocket) {
      socketRef.current = existingSocket
    }
  }, [existingSocket])

  useEffect(() => {
    const socket = existingSocket
    console.log("useSocket effect — socket:", socket?.id, "roomId:", roomId, "connected:", socket?.connected)
    if (!socket || !roomId) return

    function onMessage({ message, timestamp, fromSelf }) {
      setMessages((prev) => [...prev, { 
        id: timestamp, 
        sender: fromSelf ? "you" : "stranger", 
        text: message 
      }])
    }

    function onTyping({ isTyping }) {
      console.log("stranger_typing event received! isTyping =", isTyping);
      setStrangerTyping(isTyping);
    }

    function onStrangerLeftHandler() {
      setStrangerTyping(false)
      setStrangerLeft(true)
      setMessages((prev) => [...prev, { id: Date.now(), sender: "system", text: "Stranger has left the chat." }])
      onStrangerLeft?.()
    }

    socket.on("receive_message", onMessage)
    socket.on("stranger_typing", onTyping)
    socket.on("stranger_left", onStrangerLeftHandler)
    socket.on("message_blocked", () => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        sender: "system",
        text: "⚠️ Message removed — keep it respectful."
      }])
    })

    socket.on("mood_declared", ({ mood, emoji }) => {
      console.log("Received mood_declared:", { mood, emoji });

      const displayText = `Stranger is feeling ${mood || "unknown"} ${emoji || ""}`;

      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: "stranger",
        text: displayText,
        isMoodDeclaration: true
      }]);
    });

    socket.on("suggest_help", ({ helpText, fromSelf }) => {
      console.log("Received suggest_help:", helpText, "fromSelf:", fromSelf);

      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: fromSelf ? "you" : "stranger",
        text: helpText,
        isHelpSuggestion: true  // flag for green bubble
      }]);
    });

    socket.on("crisis_detected", () => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        sender: "system",
        text: "It sounds like you're going through something really tough. You don't have to face it alone. Someone who can help is at 988 (Suicide & Crisis Lifeline) or at 988lifeline.org"
      }])
    })
    

    socket.on("breathing_prompt", ({ message }) => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        sender: "system",
        text: message || "Your stranger is taking a quick breathing break to stay calm 😮‍💨"
      }]);
    });

    return () => {
      socket.off("receive_message", onMessage)
      socket.off("stranger_typing", onTyping)
      socket.off("stranger_left", onStrangerLeftHandler)
      socket.off("message_blocked")
      socket.off("crisis_detected")
      socket.off("breathing_prompt")
      socket.off("mood_declared");
      socket.off("suggest_help");
    }
  }, [roomId, existingSocket])

  const sendMessage = useCallback(
    (text) => {
      const socket = socketRef.current;
      if (!socket || !roomId || !text.trim()) return;
      socket.emit("send_message", { roomId, message: text.trim() })
      socket.emit("typing", { roomId, isTyping: false })
    },
    [roomId]
  )
  
  const sendTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;

    // Only emit "true" if we haven't sent it recently
    if (!typingTimeoutRef.current) {
      console.log("Emitting typing: true");
      socket.emit("typing", { roomId, isTyping: true });
    }

    // Clear any existing timeout and set a new one to stop after 2.5s of no typing
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      console.log("Auto-stop typing emit: false");
      socket.emit("typing", { roomId, isTyping: false });
      typingTimeoutRef.current = null;
    }, 10000);  // ← increased to 2.5s so it doesn't flip off too fast
  }, [roomId]);

  const leaveChat = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !roomId) return
    socket.emit("leave_chat", { roomId })
    socket.disconnect()
  }, [roomId])

  return { 
    messages, 
    setMessages,               
    strangerTyping, 
    strangerLeft, 
    sendMessage, 
    sendTyping, 
    leaveChat 
  }
}