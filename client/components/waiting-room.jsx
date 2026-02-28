"use client"

import { useEffect, useState, useRef } from "react"
import { Users, Globe, X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { io } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002"

export function WaitingRoom({ matchType, email, preferSameSchool, interest, onMatched, onExit }) {
  const [dots, setDots] = useState("")
  const [waitTime, setWaitTime] = useState(0)
  const [noOneOnline, setNoOneOnline] = useState(false)
  const [matched, setMatched] = useState(false)
  const [matchReason, setMatchReason] = useState(null)

  const socketRef = useRef(null)
  const matchedRef = useRef(false) // prevent double-fire
  const isSchool = matchType === "school"

  useEffect(() => {
    matchedRef.current = false

    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)

    const waitInterval = setInterval(() => {
      setWaitTime((prev) => {
        const next = prev + 1
        if (next >= 15) setNoOneOnline(true)
        return next
      })
    }, 1000)

    const socket = io(SOCKET_URL, { transports: ["websocket"] })
    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit("join_queue", { email, preferSameSchool, interest: interest || null })
    })

    socket.on("match_found", ({ roomId, reason, icebreaker }) => {
      if (matchedRef.current) return
      matchedRef.current = true
      setMatched(true)
      setMatchReason(reason)
      setNoOneOnline(false)
      setTimeout(() => onMatched?.(roomId, socket, reason, icebreaker), 1500)
    })


    return () => {
      clearInterval(dotInterval)
      clearInterval(waitInterval)
    }
  }, [email, preferSameSchool, onMatched])

  function handleExit() {
    socketRef.current?.disconnect()
    onExit?.()
  }

  return (
    <div
      className="flex w-full max-w-md flex-col items-center gap-8 text-center"
      style={{ animation: "fade-in 0.5s ease-out both" }}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute size-28 rounded-full bg-primary/10" style={{ animation: "soft-pulse 2.4s ease-in-out infinite" }} />
        <div className="absolute size-20 rounded-full bg-primary/15" style={{ animation: "soft-pulse 2.4s ease-in-out infinite 0.3s" }} />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-primary/20">
          {matched ? (
            <CheckCircle className="size-6 text-emerald-400" />
          ) : isSchool ? (
            <Users className="size-6 text-primary" />
          ) : (
            <Globe className="size-6 text-primary" />
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          {matched ? "Someone's here — connecting you" : (
            <>
              Finding you someone to talk to
              <span className="inline-block w-6 text-left">{dots}</span>
            </>
          )}
        </h2>

        {!matched ? (
          <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-4 py-2">
            {isSchool ? <Users className="size-3.5 text-muted-foreground" /> : <Globe className="size-3.5 text-muted-foreground" />}
            <span className="text-sm text-muted-foreground">
              {isSchool ? "Matching with your school" : "Matching with any student"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-4 py-2" style={{ animation: "fade-in 0.4s ease-out both" }}>
            <span className="text-sm text-muted-foreground">
              {matchReason === "same-school-same-interest" && "Found someone from your school with similar interests!"}
              {matchReason === "same-school-diff-interest" && "Found someone from your school!"}
              {matchReason === "same-interest-diff-school" && "Found someone with similar interests from another school!"}
              {matchReason === "diff-school-diff-interest" && "Couldn't find a perfect match — connecting you with someone!"}
              {!matchReason && "Someone's here — connecting you"}
            </span>
          </div>
        )}

        {noOneOnline && !matched && (
          <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2" style={{ animation: "fade-in 0.4s ease-out both" }}>
            <span className="size-1.5 rounded-full bg-destructive/60" />
            <span className="text-sm text-destructive/80">No one online right now — still looking</span>
          </div>
        )}

        {waitTime > 5 && !matched && (
          <p className="text-xs text-muted-foreground/40">Waiting {waitTime}s</p>
        )}
      </div>

      {!matched && (
        <Button variant="ghost" size="sm" onClick={handleExit} className="gap-2 text-muted-foreground/60 hover:text-foreground">
          <X className="size-3.5" />
          Cancel and go back
        </Button>
      )}
    </div>
  )
}