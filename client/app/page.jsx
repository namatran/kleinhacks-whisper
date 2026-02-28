"use client"

import { useState, useCallback } from "react"
import { EntryCard } from "@/components/entry-room"  // ← note: you had entry-room, probably typo?
import { WaitingRoom } from "@/components/waiting-room"
import { ChatScreen } from "@/components/chat-room"   // ← note: chat-room.jsx

export default function Home() {
  const [screen, setScreen] = useState("entry")
  const [matchType, setMatchType] = useState(null)
  const [email, setEmail] = useState("")                     // string, not null
  const [interest, setInterest] = useState("")
  const [matchReason, setMatchReason] = useState(null)
  const [preferSameSchool, setPreferSameSchool] = useState(false)  // ← added this
  const [roomId, setRoomId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [icebreaker, setIcebreaker] = useState(null)

  function handleConnect(type, userEmail, preferSchool, userInterest) {
    setMatchType(type)
    setEmail(userEmail)
    setPreferSameSchool(preferSchool)
    setInterest(userInterest || "")
    setScreen("waiting")
  }

  const handleMatched = useCallback((rid, sock, reason, ice) => {
    setRoomId(rid)
    setSocket(sock)
    setMatchReason(reason)
    setIcebreaker(ice)
    setScreen("chat")
  }, [])

  function handleDisconnect() {
    setMatchType(null)
    setEmail("")
    setPreferSameSchool(false)
    setInterest("")
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
        matchReason={matchReason}
        icebreaker={icebreaker}
        onDisconnect={handleDisconnect}
        onNextChat={(type) => handleConnect(type, email, preferSameSchool, interest)}
      />
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/[0.06] via-transparent to-transparent" />
      <div className="relative z-10 w-full max-w-md">
        {screen === "entry" && (
          <EntryCard 
            onConnect={(type, userEmail, preferSchool, userInterest) => 
              handleConnect(type, userEmail, preferSchool, userInterest)
            } 
          />
        )}
        {screen === "waiting" && (
          <WaitingRoom
            matchType={matchType}
            email={email}
            preferSameSchool={preferSameSchool}
            interest={interest}
            onMatched={handleMatched}
            onExit={handleDisconnect}
          />
        )}
      </div>
    </main>
  )
}