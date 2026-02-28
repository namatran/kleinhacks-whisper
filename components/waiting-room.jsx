"use client"

import { useEffect, useState } from "react"
import { Users, Globe } from "lucide-react"

export function WaitingRoom({ matchType, onMatched }) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)

    const transitionTimeout = setTimeout(() => {
      onMatched?.()
    }, 3000)

    return () => {
      clearInterval(dotInterval)
      clearTimeout(transitionTimeout)
    }
  }, [onMatched])

  const isSchool = matchType === "school"

  return (
    <div
      className="flex w-full max-w-md flex-col items-center gap-8 text-center"
      style={{ animation: "fade-in 0.5s ease-out both" }}
    >
      {/* Pulsing orb */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute size-28 rounded-full bg-primary/10"
          style={{ animation: "soft-pulse 2.4s ease-in-out infinite" }}
        />
        <div
          className="absolute size-20 rounded-full bg-primary/15"
          style={{ animation: "soft-pulse 2.4s ease-in-out infinite 0.3s" }}
        />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-primary/20">
          {isSchool ? (
            <Users className="size-6 text-primary" />
          ) : (
            <Globe className="size-6 text-primary" />
          )}
        </div>
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Finding you someone to talk to
          <span className="inline-block w-6 text-left">{dots}</span>
        </h2>
        <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-4 py-2">
          {isSchool ? (
            <Users className="size-3.5 text-muted-foreground" />
          ) : (
            <Globe className="size-3.5 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {isSchool ? "Matching with your school" : "Matching with any student"}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-48 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary/60"
          style={{
            animation: "progress-fill 3s ease-in-out forwards",
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground/50">
        You can close this anytime to go back
      </p>
    </div>
  )
}
