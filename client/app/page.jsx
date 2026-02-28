"use client"

import { useState, useCallback } from "react"
import { EntryRoom, EntryCard } from "@/components/entry-room"
import { WaitingRoom } from "@/components/waiting-room"
import { ChatScreen } from "@/components/chat-room"
import { Toaster } from "@/components/ui/toaster"  // make sure this import exists

export default function Home() {
  const [screen, setScreen] = useState("entry")
  const [matchType, setMatchType] = useState(null)
  const [email, setEmail] = useState("")
  const [interest, setInterest] = useState("")
  const [matchReason, setMatchReason] = useState(null)
  const [preferSameSchool, setPreferSameSchool] = useState(false)
  const [roomId, setRoomId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [icebreaker, setIcebreaker] = useState(null)
  const [sharedCategory, setSharedCategory] = useState(null)

  function handleConnect(type, userEmail, preferSchool, userInterest) {
    setMatchType(type)
    setEmail(userEmail)
    setPreferSameSchool(preferSchool)
    setInterest(userInterest || "")
    setScreen("waiting")
  }
  
  const handleMatched = useCallback((rid, sock, reason, ice, theirInterest, shared) => {
    setRoomId(rid)
    setSocket(sock)
    setMatchReason(reason)
    setIcebreaker(ice)
    setSharedCategory(shared)
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
        sharedCategory={sharedCategory}
        onDisconnect={handleDisconnect}
        onNextChat={(type) => handleConnect(type, email, preferSameSchool, interest)}
      />
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8">
      {screen === "entry" && (
        <EntryRoom 
          onConnect={(type, userEmail, preferSchool, userInterest) => 
            handleConnect(type, userEmail, preferSchool, userInterest)
          } 
        />
      )}

      {screen !== "entry" && (
        <>
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/[0.06] via-transparent to-transparent" />
          <div className="relative z-10 w-full max-w-md">
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
            {screen === "chat" && (
              <ChatScreen
                matchType={matchType}
                roomId={roomId}
                socket={socket}
                matchReason={matchReason}
                icebreaker={icebreaker}
                sharedCategory={sharedCategory}
                onDisconnect={handleDisconnect}
                onNextChat={(type) => handleConnect(type, email, preferSameSchool, interest)}
              />
            )}
          </div>
        </>
      )}

      {/* Always render Toaster here – outside conditionals */}
      <Toaster />
    </main>
  )
}