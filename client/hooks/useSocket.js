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

    function onMessage({ message, timestamp }) {
      setMessages((prev) => [...prev, { id: timestamp, sender: "stranger", text: message }])
    }

    function onTyping({ isTyping }) {
      setStrangerTyping(isTyping)
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

    return () => {
      socket.off("receive_message", onMessage)
      socket.off("stranger_typing", onTyping)
      socket.off("stranger_left", onStrangerLeftHandler)
    }
  }, [roomId, existingSocket])

  const sendMessage = useCallback(
    (text) => {
      const socket = socketRef.current
      console.log("sendMessage — socket:", socket?.id, "roomId:", roomId)
      if (!socket || !roomId || !text.trim()) return
      const msg = { id: Date.now(), sender: "you", text: text.trim() }
      setMessages((prev) => [...prev, msg])
      socket.emit("send_message", { roomId, message: text.trim() })
      socket.emit("typing", { roomId, isTyping: false })
    },
    [roomId]
  )

  const sendTyping = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !roomId) return
    socket.emit("typing", { roomId, isTyping: true })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { roomId, isTyping: false })
    }, 1500)
  }, [roomId])

  const leaveChat = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !roomId) return
    socket.emit("leave_chat", { roomId })
    socket.disconnect()
  }, [roomId])

  return { messages, strangerTyping, strangerLeft, sendMessage, sendTyping, leaveChat }
}