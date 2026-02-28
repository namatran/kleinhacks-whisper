"use client"

import { useState, useCallback } from "react"
import { EntryCard } from "@/components/entry-room"
import { WaitingRoom } from "@/components/waiting-room"
import { ChatScreen } from "@/components/chat-room"

export default function Home() {
  const [screen, setScreen] = useState("entry")
  const [matchType, setMatchType] = useState(null)

  function handleConnect(type) {
    setMatchType(type)
    setScreen("waiting")
  }

  const handleMatched = useCallback(() => {
    setScreen("chat")
  }, [])

  function handleDisconnect() {
    setMatchType(null)
    setScreen("entry")
  }

  if (screen === "chat") {
    return <ChatScreen matchType={matchType} onDisconnect={handleDisconnect} />
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/[0.06] via-transparent to-transparent" />
      <div className="relative z-10 w-full max-w-md">
        {screen === "entry" && <EntryCard onConnect={handleConnect} />}
        {screen === "waiting" && (
          <WaitingRoom matchType={matchType} onMatched={handleMatched} />
        )}
      </div>
    </main>
  )
}
