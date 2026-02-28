"use client"
import { Button } from "@/components/ui/button"
import StarRating from "@/components/star-rating"   // ← adjust path if your folder is different, e.g. "@/components/StarRating"
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, ArrowLeft, LogOut, Users, Globe, RefreshCw} from "lucide-react"
import { useSocket } from "@/hooks/useSocket"
import { Plus, Wind } from "lucide-react"  // Wind icon for breathing (or use Heart if you prefer)
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"  // you already have Dialog imported, but keep it
import { Flag } from "lucide-react"  // flag icon for report
import { Textarea } from "@/components/ui/textarea"  // shadcn textarea
import { Label } from "@/components/ui/label"  // optional label for the report textarea
import { useToast } from "@/components/ui/use-toast"
import { Smile, Frown, Meh, Heart, Angry, Coffee, Zap, Cloud, LifeBuoy } from "lucide-react"

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
  const isMood = msg.isMoodDeclaration === true
  const isHelp = msg.isHelpSuggestion === true

  return (
    <div 
      className={`flex ${isYou ? "justify-end" : "justify-start"}`} 
      style={{ animation: "message-in 0.25s ease-out both" }}
    >
      <div className={`flex max-w-[80%] flex-col gap-1 ${isYou ? "items-end" : "items-start"}`}>
        <span className="px-1 text-[11px] font-medium text-muted-foreground/50">
          {isYou ? "You" : "Stranger"}
        </span>

        <div 
          className={`
            rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap
            ${isYou 
              ? "rounded-br-md bg-primary/90 text-primary-foreground" 
              : "rounded-bl-md bg-secondary/80 text-secondary-foreground"}
            ${isMood 
              ? "!bg-gray-300/90 !text-gray-900 !text-base !font-medium border border-gray-400 shadow-sm" 
              : ""}
            ${isHelp 
              ? "!bg-green-100/90 !text-green-900 !text-base !font-medium border border-green-300 shadow-sm" 
              : ""}
          `}
        >
          {msg.text}
        </div>
      </div>
    </div>
  )
}

export function ChatScreen({ matchType, matchReason, icebreaker, sharedCategory, onDisconnect, onNextChat, roomId, socket }) {
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
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState("")  // text input value
  const { toast } = useToast()
  const [showMoodSheet, setShowMoodSheet] = useState(false)
  const [showHelpSheet, setShowHelpSheet] = useState(false)

  const { 
    messages, 
    setMessages, 
    strangerTyping, 
    strangerLeft, 
    sendMessage, 
    sendTyping, 
    leaveChat 
  } = useSocket({ roomId, socket })

  const systemText = {
    "same-school-same-interest": `You're chatting with someone from your school — you're both into ${sharedCategory}!`,    
    "same-school-diff-interest": "You're chatting with someone from your school!",
    "same-interest-diff-school": `You're chatting with someone from another school - you're both into ${sharedCategory}!`,
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

        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          onClick={() => setShowReportDialog(true)}
          aria-label="Report this user"
          title="Report this user"
        >
          <Flag className="size-4" />
        </Button>

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
          <SheetContent side="bottom" className="rounded-t-2xl pt-0"> {/* reduced from pt-6 to pt-4 */}
            <SheetHeader className="pb-4"> {/* added pb-2 for tight bottom spacing */}
              <SheetTitle className="text-left text-lg">Quick Actions</SheetTitle> {/* optional: smaller text size */}
            </SheetHeader>

            <div className="mt-3 flex flex-wrap justify-center gap-4"> {/* reduced mt-6 to mt-3 */}
              {/* Breathing Break button – square and compact */}
              <Button
                variant="outline"
                className="h-24 w-24 flex flex-col items-center justify-center gap-2 p-3 text-center hover:bg-blue-50/50 border-blue-200"
                onClick={() => {
                  setShowOptions(false);
                  setShowBreathing(true);

                  setMessages(prev => [...prev, {
                    id: Date.now(),
                    sender: "system",
                    text: "Taking a moment to breathe deeply 💙 You're doing great."
                  }]);

                  socket.emit("breathing_break", { roomId });
                }}
              >
                <Wind className="size-8 text-blue-600" />
                <span className="text-xs font-medium leading-tight">
                  Breathing<br />Break
                </span>
              </Button>
                
              <Button
                variant="outline"
                className="h-24 w-24 flex flex-col items-center justify-center gap-2 p-3 text-center hover:bg-purple-50/50 border-purple-200"
                onClick={() => {
                  setShowMoodSheet(true)
                }}
              >
                <Smile className="size-8 text-purple-600" />
                <span className="text-xs font-medium leading-tight">
                  Declare<br />Mood
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-24 w-24 flex flex-col items-center justify-center gap-2 p-3 text-center hover:bg-green-50/50 border-green-200"
                onClick={() => {
                  setShowOptions(false)
                  setShowHelpSheet(true)
                }}
              >
                <LifeBuoy className="size-8 text-green-600" />
                <span className="text-xs font-medium leading-tight">
                  Suggest<br />Help
                </span>
              </Button>
              {/* Add more square buttons here later if needed */}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={showHelpSheet} onOpenChange={setShowHelpSheet}>
          <SheetContent side="bottom" className="rounded-t-2xl pt-4 pb-6 max-h-[80vh] overflow-y-auto">
            <SheetHeader className="pb-3 border-b border-border/50">
              <SheetTitle className="text-left text-lg font-semibold text-foreground">
                Crisis & Support Resources
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                Tap any to share in chat (both of you will see it).
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-3">
              {[
                {
                  title: "988 Suicide & Crisis Lifeline",
                  text: "Call or text 988 • Chat: 988lifeline.org",
                  desc: "24/7 free, confidential support for anyone in distress."
                },
                {
                  title: "Crisis Text Line",
                  text: "Text HOME to 741741",
                  desc: "Text with a trained counselor, anytime."
                },
                {
                  title: "Trevor Project (LGBTQ+ Youth)",
                  text: "Call 1-866-488-7386 • Text START to 678-678",
                  desc: "24/7 crisis intervention for LGBTQ+ young people."
                },
                {
                  title: "Trans Lifeline",
                  text: "Call 877-565-8860",
                  desc: "Peer support for trans people, by trans people."
                },
                {
                  title: "National Domestic Violence Hotline",
                  text: "Call 1-800-799-7233 • Text START to 88788",
                  desc: "Confidential support for anyone experiencing abuse."
                },
                {
                  title: "SAMHSA National Helpline",
                  text: "Call 1-800-662-4357 (free, confidential, 24/7)",
                  desc: "Free treatment referral and information for substance abuse and mental health."
                },
                {
                  title: "National Eating Disorders Association",
                  text: "Call 1-800-931-2237 • Text 'NEDA' to 741741",
                  desc: "Support for eating disorders, body image, and related mental health issues."
                },
                {
                  title: "NAMI Helpline",
                  text: "Call 1-800-950-6264 • Text 'HELLO' to 741741",
                  desc: "Information and support for mental illness, for you and your loved ones."
                },
                {
                  title: "IMAlive Crisis Chat",
                  text: "Chat at imalive.org • Available 24/7",
                  desc: "Anonymous online chat for people in suicidal crisis."
                },
                {
                  title: "LGBTQ+ National Youth Talkline",
                  text: "Call 1-800-246-7743 (4-9pm ET, daily)",
                  desc: "Peer support for LGBTQ+ youth. Trained volunteer counselors."
                },
                {
                  title: "National Alliance on Mental Illness",
                  text: "Visit nami.org for local support groups",
                  desc: "Community-based support groups and educational programs."
                },
              ].map((resource, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full h-auto py-4 px-5 flex flex-col items-start gap-1 text-left border-green-300 hover:bg-green-50/70 hover:border-green-400 transition-all"
                  onClick={() => {
                    const fullMessage = `${resource.title}\n${resource.text}\n${resource.desc}`;

                    // Send as help resource message via socket (bypasses moderation)
                    socket.emit("suggest_help", { 
                      roomId,
                      helpText: fullMessage
                    });

                    // Confirmation toast
                    toast({
                      title: "Shared in Chat",
                      description: `${resource.title} info sent to the conversation.`,
                      duration: 4000,
                    });

                    // Close sheets
                    setShowHelpSheet(false);
                    setShowOptions(false);
                  }}
                >
                  <span className="font-semibold text-green-800 text-base">{resource.title}</span>
                  <span className="text-sm text-green-700 whitespace-pre-line">{resource.text}</span>
                  <span className="text-xs text-muted-foreground mt-1">{resource.desc}</span>
                </Button>
              ))}
            </div>

            <div className="mt-6 text-center text-xs text-muted-foreground">
              You're taking a brave step by looking out for help 💚
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={showMoodSheet} onOpenChange={setShowMoodSheet}>
          <SheetContent side="bottom" className="rounded-t-2xl pt-4">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-left text-lg">How are you feeling right now?</SheetTitle>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { emoji: <Smile className="size-10 text-green-600" />, label: "Happy", value: "happy", emojiChar: "😊" },
                { emoji: <Heart className="size-10 text-pink-600" />, label: "Loved", value: "loved", emojiChar: "💖" },
                { emoji: <Coffee className="size-10 text-amber-600" />, label: "Calm", value: "calm", emojiChar: "☕" },
                { emoji: <Meh className="size-10 text-yellow-600" />, label: "Okay", value: "okay", emojiChar: "😐" },
                { emoji: <Frown className="size-10 text-blue-600" />, label: "Sad", value: "sad", emojiChar: "😔" },
                { emoji: <Angry className="size-10 text-red-600" />, label: "Frustrated", value: "frustrated", emojiChar: "😠" },
                { emoji: <Zap className="size-10 text-orange-600" />, label: "Anxious", value: "anxious", emojiChar: "😟" },
                { emoji: <Cloud className="size-10 text-gray-600" />, label: "Tired", value: "tired", emojiChar: "☁️" },
              ].map((moodItem) => (
                <Button
                  key={moodItem.value}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-1 p-2 hover:bg-gray-50"
                  onClick={() => {
                    setShowMoodSheet(false);
                    setShowOptions(false); // Also close quick actions

                    const moodText = `I'm feeling ${moodItem.label} ${moodItem.emojiChar}`;

                    setMessages(prev => {
                      console.log("Adding mood message to sender:", prev.length + 1);
                      return [...prev, {
                        id: Date.now(),
                        sender: "you",
                        text: moodText,
                        isMoodDeclaration: true
                      }];
                    });

                    // Send to other user
                    console.log("Emitting declare_mood:", { roomId, mood: moodItem.value, emoji: moodItem.emojiChar });
                    socket.emit("declare_mood", {
                      roomId,
                      mood: moodItem.value,
                      emoji: moodItem.emojiChar
                    });
                  }}
                >
                  {moodItem.emoji}
                  <span className="text-xs">{moodItem.label}</span>
                </Button>
              ))}
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

        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report this conversation</DialogTitle>
              <DialogDescription>
                Please describe what happened. Your report helps keep Whisper safe.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label htmlFor="report-reason" className="mb-2 block text-sm font-medium">
                Reason / Details
              </Label>
              <Textarea
                id="report-reason"
                placeholder="Tell us what happened... (e.g., inappropriate behavior, spam, etc.)"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            <DialogFooter className="flex justify-between sm:justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowReportDialog(false)
                  setReportReason("")  // clear on cancel
                }}
              >
                Cancel
              </Button>
              <Button   
                variant="destructive"
                disabled={!reportReason.trim()}
                onClick={() => {
                  console.log("Report submitted:", reportReason)  // keep your proof-of-concept log
                  toast({
                    title: "Report Sent",
                    description: "Thank you — our team will review this to keep Whisper safe.",
                    duration: 5000,
                  })
                  setShowReportDialog(false)
                  setReportReason("")
                }}
              >
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}