"use client"

import { useState, useCallback } from "react"
import { EntryCard } from "@/components/entry-room"  // ← note: you had entry-room, probably typo?
import { WaitingRoom } from "@/components/waiting-room"
import { ChatScreen } from "@/components/chat-room"   // ← note: chat-room.jsx

export default function Home() {
  const [screen, setScreen] = useState("entry")
  const [matchType, setMatchType] = useState(null)
  const [email, setEmail] = useState("")                     // string, not null
  const [preferSameSchool, setPreferSameSchool] = useState(false)  // ← added this
  const [roomId, setRoomId] = useState(null)
  const [socket, setSocket] = useState(null)

  function handleConnect(type, userEmail, preferSchool) {
    setMatchType(type)
    setEmail(userEmail)
    setPreferSameSchool(preferSchool)
    setScreen("waiting")
  }

  const handleMatched = useCallback((rid, sock) => {
    setRoomId(rid)
    setSocket(sock)
    setScreen("chat")
  }, [])

  function handleDisconnect() {
    setMatchType(null)
    setEmail("")
    setPreferSameSchool(false)
    setRoomId(null)
    setSocket(null)
    setScreen("entry")
  }

  if (screen === "chat") {
    return (
      <ChatScreen
        matchType={matchType}
        roomId={roomId}
        socket={socket}
        onDisconnect={handleDisconnect}
        onNextChat={(type) => handleConnect(type, email, preferSameSchool)}  // ← wrapped to pass saved values
      />
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/[0.06] via-transparent to-transparent" />
      <div className="relative z-10 w-full max-w-md">
        {screen === "entry" && (
          <EntryCard 
            onConnect={(type, userEmail, preferSchool) => 
              handleConnect(type, userEmail, preferSchool)
            } 
          />
        )}
        {screen === "waiting" && (
          <WaitingRoom
            matchType={matchType}
            email={email}
            preferSameSchool={preferSameSchool}
            onMatched={handleMatched}
            onExit={handleDisconnect}
          />
        )}
      </div>
    </main>
  )
}