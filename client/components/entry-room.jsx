"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MessageCircle, Shield, Users, Globe } from "lucide-react"
import { useState, useEffect } from "react"
import { io } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002"

export function EntryCard({ onConnect }) {
  const [onlineCount, setOnlineCount] = useState(null)

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] })
    socket.on("online_count", ({ count }) => setOnlineCount(count))
    return () => socket.disconnect()
  }, [])

  const [email, setEmail] = useState(() => {
    // Remember email domain from localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem("whisper_email") || ""
    }
    return ""
  })
  const [interest, setInterest] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("whisper_interest") || ""
    }
    return ""
    })
  const [error, setError] = useState("")

  function validateEmail(value) {
    if (!value) {
      setError("Please enter your school email")
      return false
    }
    if (!value.includes("@")) {
      setError("Please enter a valid email address")
      return false
    }
    setError("")
    return true
  }

  function handleConnect(type, userEmail, preferSchool) {
    if (validateEmail(userEmail)) {
      localStorage.setItem("whisper_email", userEmail)
      localStorage.setItem("whisper_interest", interest.trim())
      onConnect?.(type, userEmail, preferSchool, interest.trim() || null)
    }
  }

  return (
    <Card className="w-full max-w-md border-border/50 shadow-lg shadow-primary/5">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <MessageCircle className="size-6 text-primary" />
        </div>
        <CardTitle className="text-2xl tracking-tight text-foreground">
          Whisper
        </CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          Talk to other students anonymously. Safe, private, and completely judgment-free.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="school-email" className="text-sm font-medium text-muted-foreground">
            School email
          </label>
          <Input
            id="school-email"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError("")
            }}
            className="h-11 rounded-lg bg-input/50 border-border/60 placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-primary/30"
            aria-describedby={error ? "email-error" : undefined}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p id="email-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="interest" className="text-sm font-medium text-muted-foreground">
            What's on your mind? <span className="text-muted-foreground/50 font-normal">(optional)</span>
          </label>
          <Input
            id="interest"
            type="text"
            placeholder="e.g. AP exams, Valorant, college apps..."
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="h-11 rounded-lg bg-input/50 border-border/60 placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-primary/30"
          />
        </div>

        <div className="flex flex-col items-center gap-2 -mb-4">
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/5 px-4 py-2.5 w-full">
            <span className="text-xs text-primary/60">✦ AI-powered matchmaking — matched by shared interests</span>
          </div>
          {onlineCount !== null && (
            <div className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 w-full">
              <span className="text-xs text-muted-foreground">
                {onlineCount} student{onlineCount !== 1 ? "s" : ""} online right now
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={() => handleConnect("school", email, true)}
            className="h-12 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/85 transition-colors"
          >
            <Users className="size-4" />
            Talk to someone from my school
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => handleConnect("any", email, false)}
            className="h-12 w-full rounded-lg border-border/60 text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
          >
            <Globe className="size-4" />
            Talk to any student
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Shield className="size-3.5 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground/60">
            Your identity is never shared with anyone
          </p>
        </div>
      </CardContent>
    </Card>
  )
}