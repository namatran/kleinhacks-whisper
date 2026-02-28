"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, ArrowLeft, LogOut, Users, Globe, RefreshCw} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/hooks/useSocket"

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[80%] flex-col gap-1 items-start">
        <span className="px-1 text-[11px] font-medium text-muted-foreground/50">Stranger</span>
        <div className="rounded-2xl rounded-bl-md bg-secondary/80 px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-muted-foreground/50" style={{ animation: "typing-dot 1.4s ease-in-out infinite" }} />
            <span className="size-1.5 rounded-full bg-muted-foreground/50" style={{ animation: "typing-dot 1.4s ease-in-out 0.2s infinite" }} />
            <span className="size-1.5 rounded-full bg-muted-foreground/50" style={{ animation: "typing-dot 1.4s ease-in-out 0.4s infinite" }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  if (msg.sender === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-secondary/40 px-4 py-1.5 text-xs text-muted-foreground/60">
          {msg.text}
        </span>
      </div>
    )
  }
  const isYou = msg.sender === "you"
  return (
    <div className={`flex ${isYou ? "justify-end" : "justify-start"}`} style={{ animation: "message-in 0.25s ease-out both" }}>
      <div className={`flex max-w-[80%] flex-col gap-1 ${isYou ? "items-end" : "items-start"}`}>
        <span className="px-1 text-[11px] font-medium text-muted-foreground/50">{isYou ? "You" : "Stranger"}</span>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isYou ? "rounded-br-md bg-primary/90 text-primary-foreground" : "rounded-bl-md bg-secondary/80 text-secondary-foreground"}`}>
          {msg.text}
        </div>
      </div>
    </div>
  )
}

export function ChatScreen({ matchType, matchReason, icebreaker, onDisconnect, onNextChat, roomId, socket }) {  
  const isSchool = matchType === "school"

  const initialSystemMessage = {
    id: 1,
    sender: "system",
    text: isSchool
      ? "You're now chatting with someone from your school."
      : "You're now chatting with a fellow student.",
  }

  const [input, setInput] = useState("")
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const { messages, strangerTyping, strangerLeft, sendMessage, sendTyping, leaveChat } = useSocket({
    roomId,
    socket,
  })

  const systemText = {
    "same-school-same-interest": "You're chatting with someone from your school with similar interests!",
    "same-school-diff-interest": "You're chatting with someone from your school!",
    "same-interest-diff-school": "You're chatting with someone from a different school with similar interests!",
    "diff-school-diff-interest": "You're chatting with a random fellow student!",
  }

  const allMessages = [
    { id: "system-intro", sender: "system", text: systemText[matchReason] ?? "You're now chatting with a fellow student." },
    ...(matchReason === "diff-school-diff-interest" || matchReason === "same-school-diff-interest"
      ? [{ id: "system-diff", sender: "system", text: "You have different interests — here's a conversation starter:" }]
      : []),
    ...(icebreaker ? [{ id: "system-icebreaker", sender: "system", text: icebreaker }] : []),
    ...messages,
  ]

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, strangerTyping, scrollToBottom])
  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed) return
    sendMessage(trimmed)
    setInput("")
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleNextChat() {
    if (!onNextChat) {
      console.error("onNextChat prop is missing in ChatScreen!");
      return;
    }
    console.log("Next Chat clicked — leaving room and re-queuing with", matchType);

    // Step 1: Leave current chat → triggers "stranger_left" on other user
    leaveChat();

    // Step 2: Trigger new matching (goes to WaitingRoom, which re-emits join_queue)
    onNextChat(matchType);
  }

  function handleDisconnectClick() {
    leaveChat()
    onDisconnect?.()
  }

  return (
    <div
      className="flex h-svh w-full flex-col bg-background"
      style={{ animation: "fade-in 0.4s ease-out both" }}
    >
      {/* Header – added smaller Next Chat button here */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border/30 px-4 py-3">
        {/* Left side: Stranger info */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">Stranger</span>
          <span className="text-xs text-muted-foreground/60">
            {isSchool ? "From your school" : "Student somewhere"}
          </span>
        </div>

        {/* Right side: Status → Next Chat → Leave */}
        <div className="ml-auto flex items-center gap-4">
          {/* Status – moved leftmost */}
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${strangerLeft ? "bg-destructive/60" : "bg-emerald-400/80"}`} />
            <span className="text-xs text-muted-foreground/50">
              {strangerLeft ? "Left" : "Online"}
            </span>
          </div>

          {/* Next Chat button */}
          <Button
            variant="default"
            size="sm"
            className="
              bg-primary text-primary-foreground 
              hover:bg-primary/90 
              hover:scale-105 
              transition-all duration-200 
              gap-1 px-3 py-1.5
              shadow-sm
            "
            onClick={handleNextChat}
            aria-label="Start a new chat"
            title="Start a new chat"
          >
            <RefreshCw className="size-4" />
            Next Chat
          </Button>

          {/* Leave button – now matches Next Chat style, but you already changed to primary */}
          <Button
            variant="default"
            size="sm"
            className="
              bg-destructive text-primary-foreground 
              hover:bg-destructive/90 
              hover:scale-105 
              transition-all duration-200 
              gap-1 px-3 py-1.5
              shadow-sm
            "
            onClick={handleDisconnectClick}
            aria-label="Disconnect"
            title="End this chat"
          >
            <LogOut className="size-4" />
            Leave
          </Button>
        </div>
      </header>

      {/* Messages area – unchanged */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 scroll-smooth">
        {allMessages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {strangerTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area – removed the big Next Chat button from here */}
      <div className="shrink-0 border-t border-border/30 bg-card/50 px-4 py-3 backdrop-blur-sm">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="h-10 flex-1 rounded-xl border border-border/40 bg-input/30 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-primary/40 focus:bg-input/50"
            aria-label="Message input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            className="size-10 shrink-0 rounded-xl bg-primary/90 hover:bg-primary text-primary-foreground disabled:opacity-30 transition-all"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}