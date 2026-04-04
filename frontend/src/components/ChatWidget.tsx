"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getChatGreeting, getMe, sendChatMessage, createBooking,
  type ChatMessage, type BookingAction,
} from "@/lib/api";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  booking_action?: BookingAction | null;
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookingState, setBookingState] = useState<Record<number, "idle" | "confirming" | "done" | "error">>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Re-check auth on every route change (widget persists across navigation)
  useEffect(() => {
    getMe().then(() => setIsLoggedIn(true)).catch(() => setIsLoggedIn(false));
  }, [pathname]);

  // Load greeting the first time the widget opens
  useEffect(() => {
    if (open && messages.length === 0) {
      getChatGreeting()
        .then((res) => setMessages([{ role: "assistant", content: res.reply }]))
        .catch(() => {});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const next: DisplayMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(text, history);
      setMessages([...next, { role: "assistant", content: res.reply, booking_action: res.booking_action }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, I couldn't reach the server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmBooking(idx: number, action: BookingAction) {
    setBookingState((s) => ({ ...s, [idx]: "confirming" }));
    try {
      await createBooking({
        date: action.date,
        start_time: action.start_time,
        end_time: action.end_time,
        purpose: action.purpose,
        attendees: action.attendees,
      });
      setBookingState((s) => ({ ...s, [idx]: "done" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed.";
      // Show error inline by appending an assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't submit the booking: ${msg}` }]);
      setBookingState((s) => ({ ...s, [idx]: "error" }));
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: "480px" }}>
          {/* Header */}
          <div className="bg-spc-navy px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white text-sm font-medium">SPC Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-xl leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-spc-purple text-white rounded-br-sm"
                      : "bg-spc-blue/10 text-spc-navy rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Booking confirmation card */}
                {msg.booking_action && (
                  <div className="mt-2 w-full max-w-[85%] bg-white border border-spc-blue/30 rounded-xl p-3 text-xs text-spc-navy space-y-1">
                    <p className="font-semibold text-spc-navy mb-1">Booking summary</p>
                    <p>Date: <span className="font-medium">{msg.booking_action.date}</span></p>
                    <p>Time: <span className="font-medium">{msg.booking_action.start_time}–{msg.booking_action.end_time}</span></p>
                    <p>Purpose: <span className="font-medium">{msg.booking_action.purpose}</span></p>
                    <p>Attendees: <span className="font-medium">{msg.booking_action.attendees}</span></p>
                    {bookingState[i] === "done" ? (
                      <p className="text-green-600 font-semibold pt-1">Booking submitted!</p>
                    ) : bookingState[i] === "confirming" ? (
                      <p className="text-spc-gray pt-1">Submitting...</p>
                    ) : !isLoggedIn ? (
                      <Link
                        href="/login"
                        className="mt-2 block w-full bg-spc-blue text-white rounded-lg py-1.5 font-medium hover:bg-spc-blue/90 transition-colors text-center"
                      >
                        Sign in to confirm booking
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleConfirmBooking(i, msg.booking_action!)}
                        className="mt-2 w-full bg-spc-purple text-white rounded-lg py-1.5 font-medium hover:bg-spc-purple/90 transition-colors"
                      >
                        Confirm Booking
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-start">
                <div className="bg-spc-blue/10 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-spc-gray">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything..."
              disabled={loading}
              className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-1.5 outline-none focus:border-spc-blue transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-full bg-spc-purple text-white flex items-center justify-center hover:bg-spc-purple/90 transition-colors disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-spc-purple shadow-lg text-white flex items-center justify-center hover:bg-spc-purple/90 transition-colors font-bold text-lg"
        aria-label="Open AI assistant"
      >
        AI
      </button>
    </div>
  );
}
