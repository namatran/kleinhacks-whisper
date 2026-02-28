"use client"
import { Button } from "@/components/ui/button"
import StarRating from "@/components/star-rating"   // ← adjust path if your folder is different, e.g. "@/components/StarRating"
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, ArrowLeft, LogOut, Users, Globe, RefreshCw} from "lucide-react"
import { useSocket } from "@/hooks/useSocket"
import { Plus, Wind } from "lucide-react"  // Wind icon for breathing (or use Heart if you prefer)
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"  // you already have Dialog imported, but keep it

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

export function ChatScreen({ matchType, onDisconnect, onNextChat, roomId, socket }) {
  const isSchool = matchType === "school"

  const initialSystemMessage = {
    id: 1,
    sender: "system",
    text: isSchool
      ? "You're now chatting with someone from your school."
      : "You're now chatting with a fellow student.",
  }

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const [input, setInput] = useState("")
  const [showRatingDialog, setShowRatingDialog] = useState(false)
  const [rating, setRating] = useState(0)
  const [exitType, setExitType] = useState(null);
  const [showOptions, setShowOptions] = useState(false)
  const [showBreathing, setShowBreathing] = useState(false)

  const { messages, strangerTyping, strangerLeft, sendMessage, sendTyping, leaveChat } = useSocket({
    roomId,
    socket,
  })

  const allMessages = [
    { id: "system-intro", sender: "system", text: isSchool ? "You're now chatting with someone from your school." : "You're now chatting with a fellow student." },
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
      console.error("onNextChat prop is missing!")
      return
    }
    setExitType("next")
    setShowRatingDialog(true)
  }

  const proceedToExit = () => {
    setShowRatingDialog(false)
    setRating(0)
    setExitType(null)  // reset

    leaveChat()  // always notify the other person that you left

    // Then do the specific navigation/exit
    if (exitType === "next") {
      onNextChat(matchType)     // re-queue with same preferences
    } else if (exitType === "leave") {
      onDisconnect?.()          // go back to entry / home / whatever it did before
    }
  }

  const handleSubmitRating = () => {
    if (rating > 0) {
      console.log(`Rated this chat ${rating}/5 (room: ${roomId}) - exit type: ${exitType}`)
      // Future: socket.emit("chat_rating", { roomId, rating, exitType })
    }
    proceedToExit()
  }

  const handleSkipRating = () => {
    proceedToExit()
  }

  function handleDisconnectClick() {
    setExitType("leave")
    setShowRatingDialog(true)
  }

  console.log("Rendering chat - strangerTyping is currently:", strangerTyping);

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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 rounded-full hover:bg-primary/10"
            onClick={() => setShowOptions(true)}
            aria-label="More options"
          >
            <Plus className="size-5 text-muted-foreground" />
          </Button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              sendTyping();
              // optional: console.log("Input changed - calling sendTyping");
            }}
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
        <Dialog 
          open={showRatingDialog} 
          onOpenChange={(open) => {
            if (!open) handleSkipRating()   // clicking outside / pressing Esc → treat as skip
          }}
        >
          <DialogContent className="sm:max-w-md text-center">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl">Rate Your Chat</DialogTitle>
              <DialogDescription className="text-base">
                How was the conversation? (optional)
              </DialogDescription>
            </DialogHeader>

            <div className="py-8">
              <StarRating 
                value={rating} 
                onChange={setRating} 
                size={52} 
              />
            </div>

            <DialogFooter className="flex justify-center gap-6">
              <Button 
                variant="outline" 
                onClick={handleSkipRating}
                className="min-w-[110px]"
              >
                Skip
              </Button>
              
              <Button 
                onClick={handleSubmitRating}
                disabled={rating === 0}
                className="min-w-[110px]"
              >
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet open={showOptions} onOpenChange={setShowOptions}>
          <SheetContent side="bottom" className="rounded-t-2xl pt-6">
            <SheetHeader>
              <SheetTitle className="text-left">Quick Actions</SheetTitle>
            </SheetHeader>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="outline"
                className="h-14 justify-start text-left px-4"
                onClick={() => {
                  setShowOptions(false)
                  setShowBreathing(true)
                  socket.emit("breathing_break", { roomId })  // tell the other person
                }}
              >
                <Wind className="mr-3 size-5 text-blue-500" />
                Take a Breathing Break
              </Button>

              {/* You can add more buttons later, e.g. */}
              {/* <Button variant="outline" className="h-14 justify-start text-left px-4"> */}
              {/*   <Heart className="mr-3 size-5 text-pink-500" /> */}
              {/*   Share a Positive Affirmation */}
              {/* </Button> */}
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={showBreathing} onOpenChange={setShowBreathing}>
          <DialogContent className="sm:max-w-md text-center">
            <DialogHeader>
              <DialogTitle>4-7-8 Breathing Break</DialogTitle>
              <DialogDescription className="pt-2">
                Inhale for 4 seconds, hold for 7 seconds, exhale for 8 seconds.<br />
                Repeat 4–5 times to feel calmer.
              </DialogDescription>
            </DialogHeader>

            <div className="py-10">
              <div className="mx-auto size-40 rounded-full bg-blue-100/30 flex items-center justify-center animate-pulse">
                <Wind className="size-16 text-blue-600" />
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Pausing for some calm breaths 💙 You've got this.
              </p>
            </div>

            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setShowBreathing(false)}>
                I'm Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}