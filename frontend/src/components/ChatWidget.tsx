"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface BookingAction {
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
}

interface UpdateAction {
  bookingId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
}

interface CancelAction {
  bookingId: string;
}

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  bookingAction?: BookingAction | null;
  updateAction?: UpdateAction | null;
  cancelAction?: CancelAction | null;
}

type ActionState = "idle" | "confirming" | "done" | "error";

export default function ChatWidget() {
  const { isSignedIn: isAuthenticated } = useAuth();
  const greeting = useQuery(api.chat.getGreeting);
  const doSendMessage = useAction(api.chat.sendMessage);
  const doCreateBooking = useMutation(api.bookings.createBooking);
  const doUpdateBooking = useMutation(api.bookings.updateBooking);
  const doCancelBooking = useMutation(api.bookings.cancelBooking);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionState, setActionState] = useState<Record<number, ActionState>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show greeting the first time widget opens
  useEffect(() => {
    if (open && messages.length === 0 && greeting) {
      setMessages([{ role: "assistant", content: greeting.reply }]);
    }
  }, [open, greeting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input when widget opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Focus input after response arrives
  useEffect(() => {
    if (!loading && open) inputRef.current?.focus();
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const next: DisplayMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await doSendMessage({ message: text, history });
      setMessages([...next, {
        role: "assistant",
        content: res.reply,
        bookingAction: res.bookingAction,
        updateAction: res.updateAction,
        cancelAction: res.cancelAction,
      }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, I couldn't reach the server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmBooking(idx: number, action: BookingAction) {
    setActionState((s) => ({ ...s, [idx]: "confirming" }));
    try {
      await doCreateBooking({
        date: action.date,
        startTime: action.startTime,
        endTime: action.endTime,
        purpose: action.purpose,
        attendees: action.attendees,
      });
      setActionState((s) => ({ ...s, [idx]: "done" }));
    } catch (err: unknown) {
      const e = err as { data?: string } & Error;
      const msg = e.data ?? e.message ?? "Booking failed.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't submit the booking: ${msg}` }]);
      setActionState((s) => ({ ...s, [idx]: "error" }));
    } finally {
      inputRef.current?.focus();
    }
  }

  async function handleConfirmUpdate(idx: number, action: UpdateAction) {
    setActionState((s) => ({ ...s, [idx]: "confirming" }));
    try {
      await doUpdateBooking({
        bookingId: action.bookingId as Id<"bookings">,
        date: action.date,
        startTime: action.startTime,
        endTime: action.endTime,
        purpose: action.purpose,
        attendees: action.attendees,
      });
      setActionState((s) => ({ ...s, [idx]: "done" }));
    } catch (err: unknown) {
      const e = err as { data?: string } & Error;
      const msg = e.data ?? e.message ?? "Update failed.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't update the booking: ${msg}` }]);
      setActionState((s) => ({ ...s, [idx]: "error" }));
    } finally {
      inputRef.current?.focus();
    }
  }

  async function handleConfirmCancel(idx: number, action: CancelAction) {
    setActionState((s) => ({ ...s, [idx]: "confirming" }));
    try {
      await doCancelBooking({ bookingId: action.bookingId as Id<"bookings"> });
      setActionState((s) => ({ ...s, [idx]: "done" }));
    } catch (err: unknown) {
      const e = err as { data?: string } & Error;
      const msg = e.data ?? e.message ?? "Cancellation failed.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't cancel the booking: ${msg}` }]);
      setActionState((s) => ({ ...s, [idx]: "error" }));
    } finally {
      inputRef.current?.focus();
    }
  }

  function renderActionCard(msg: DisplayMessage, i: number) {
    const state = actionState[i] ?? "idle";

    if (msg.bookingAction) {
      const a = msg.bookingAction;
      return (
        <div className="mt-2 w-full max-w-[85%] bg-white border border-spc-blue/30 rounded-xl p-3 text-xs text-spc-navy space-y-1">
          <p className="font-semibold mb-1">Booking summary</p>
          <p>Date: <span className="font-medium">{a.date}</span></p>
          <p>Time: <span className="font-medium">{a.startTime}–{a.endTime}</span></p>
          <p>Purpose: <span className="font-medium">{a.purpose}</span></p>
          <p>Attendees: <span className="font-medium">{a.attendees}</span></p>
          {renderActionButton(state, () => handleConfirmBooking(i, a), "Confirm Booking", "Booking submitted!")}
        </div>
      );
    }

    if (msg.updateAction) {
      const a = msg.updateAction;
      return (
        <div className="mt-2 w-full max-w-[85%] bg-white border border-spc-blue/30 rounded-xl p-3 text-xs text-spc-navy space-y-1">
          <p className="font-semibold mb-1">Update booking</p>
          <p>Date: <span className="font-medium">{a.date}</span></p>
          <p>Time: <span className="font-medium">{a.startTime}–{a.endTime}</span></p>
          <p>Purpose: <span className="font-medium">{a.purpose}</span></p>
          <p>Attendees: <span className="font-medium">{a.attendees}</span></p>
          {renderActionButton(state, () => handleConfirmUpdate(i, a), "Confirm Update", "Booking updated!")}
        </div>
      );
    }

    if (msg.cancelAction) {
      const a = msg.cancelAction;
      return (
        <div className="mt-2 w-full max-w-[85%] bg-white border border-red-200 rounded-xl p-3 text-xs text-spc-navy space-y-1">
          <p className="font-semibold mb-1">Cancel booking</p>
          <p className="text-red-600">This action cannot be undone.</p>
          {renderActionButton(state, () => handleConfirmCancel(i, a), "Confirm Cancellation", "Booking cancelled!", true)}
        </div>
      );
    }

    return null;
  }

  function renderActionButton(
    state: ActionState,
    onConfirm: () => void,
    label: string,
    doneLabel: string,
    danger = false,
  ) {
    if (state === "done") {
      return <p className="text-green-600 font-semibold pt-1">{doneLabel}</p>;
    }
    if (state === "confirming") {
      return <p className="text-spc-gray pt-1">Processing...</p>;
    }
    if (!isAuthenticated) {
      return (
        <Link
          href="/login"
          className="mt-2 block w-full bg-spc-blue text-white rounded-lg py-1.5 font-medium hover:bg-spc-blue/90 transition-colors text-center"
        >
          Sign in to continue
        </Link>
      );
    }
    return (
      <button
        onClick={onConfirm}
        className={`mt-2 w-full text-white rounded-lg py-1.5 font-medium transition-colors ${
          danger
            ? "bg-red-600 hover:bg-red-700"
            : "bg-spc-purple hover:bg-spc-purple/90"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50">
      {open && (
        <div
          className="mb-4 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "min(480px, calc(100vh - 6rem))" }}
        >
          {/* Header */}
          <div className="bg-spc-navy px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-spc-yellow" />
              <span className="text-white text-sm font-medium">SPC Prayer Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto chat-scroll p-4 flex flex-col gap-3">
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
                {renderActionCard(msg, i)}
              </div>
            ))}

            {loading && (
              <div className="flex items-start">
                <div className="bg-spc-blue/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-spc-blue/50 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-spc-blue/50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-spc-blue/50 animate-bounce [animation-delay:300ms]" />
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
              ref={inputRef}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything..."
              disabled={loading}
              className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-spc-blue transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full bg-spc-purple text-white flex items-center justify-center hover:bg-spc-purple/90 transition-colors disabled:opacity-40 shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-spc-purple shadow-lg shadow-spc-purple/30 text-white flex items-center justify-center hover:bg-spc-purple/90 transition-colors"
        aria-label={open ? "Close prayer assistant" : "Open prayer assistant"}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
