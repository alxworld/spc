"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send } from "lucide-react";
import {
  getChatGreeting, getMe, sendChatMessage, createBooking, cancelBooking, updateBooking,
  type ChatMessage, type BookingAction, type UpdateAction, type CancelAction,
} from "@/lib/api";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  booking_action?: BookingAction | null;
  update_action?: UpdateAction | null;
  cancel_action?: CancelAction | null;
}

type ActionState = "idle" | "confirming" | "done" | "error";

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [actionState, setActionState] = useState<Record<number, ActionState>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-check auth on every route change
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

  // Focus input when widget opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Focus input after response arrives (runs post-commit, so disabled is already removed)
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

    const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const next: DisplayMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(text, history);
      setMessages([...next, {
        role: "assistant",
        content: res.reply,
        booking_action: res.booking_action,
        update_action: res.update_action,
        cancel_action: res.cancel_action,
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
      await createBooking({
        date: action.date,
        start_time: action.start_time,
        end_time: action.end_time,
        purpose: action.purpose,
        attendees: action.attendees,
      });
      setActionState((s) => ({ ...s, [idx]: "done" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't submit the booking: ${msg}` }]);
      setActionState((s) => ({ ...s, [idx]: "error" }));
    } finally {
      inputRef.current?.focus();
    }
  }

  async function handleConfirmUpdate(idx: number, action: UpdateAction) {
    setActionState((s) => ({ ...s, [idx]: "confirming" }));
    try {
      await updateBooking(action.booking_id, {
        date: action.date,
        start_time: action.start_time,
        end_time: action.end_time,
        purpose: action.purpose,
        attendees: action.attendees,
      });
      setActionState((s) => ({ ...s, [idx]: "done" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't update the booking: ${msg}` }]);
      setActionState((s) => ({ ...s, [idx]: "error" }));
    } finally {
      inputRef.current?.focus();
    }
  }

  async function handleConfirmCancel(idx: number, action: CancelAction) {
    setActionState((s) => ({ ...s, [idx]: "confirming" }));
    try {
      await cancelBooking(action.booking_id);
      setActionState((s) => ({ ...s, [idx]: "done" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I couldn't cancel the booking: ${msg}` }]);
      setActionState((s) => ({ ...s, [idx]: "error" }));
    } finally {
      inputRef.current?.focus();
    }
  }

  function renderActionCard(msg: DisplayMessage, i: number) {
    const state = actionState[i] ?? "idle";

    if (msg.booking_action) {
      const a = msg.booking_action;
      return (
        <div className="mt-2 w-full max-w-[85%] bg-white border border-spc-blue/30 rounded-xl p-3 text-xs text-spc-navy space-y-1">
          <p className="font-semibold mb-1">Booking summary</p>
          <p>Date: <span className="font-medium">{a.date}</span></p>
          <p>Time: <span className="font-medium">{a.start_time}–{a.end_time}</span></p>
          <p>Purpose: <span className="font-medium">{a.purpose}</span></p>
          <p>Attendees: <span className="font-medium">{a.attendees}</span></p>
          {renderActionButton(state, () => handleConfirmBooking(i, a), "Confirm Booking", "Booking submitted!")}
        </div>
      );
    }

    if (msg.update_action) {
      const a = msg.update_action;
      return (
        <div className="mt-2 w-full max-w-[85%] bg-white border border-spc-blue/30 rounded-xl p-3 text-xs text-spc-navy space-y-1">
          <p className="font-semibold mb-1">Update booking #{a.booking_id}</p>
          <p>Date: <span className="font-medium">{a.date}</span></p>
          <p>Time: <span className="font-medium">{a.start_time}–{a.end_time}</span></p>
          <p>Purpose: <span className="font-medium">{a.purpose}</span></p>
          <p>Attendees: <span className="font-medium">{a.attendees}</span></p>
          {renderActionButton(state, () => handleConfirmUpdate(i, a), "Confirm Update", "Booking updated!")}
        </div>
      );
    }

    if (msg.cancel_action) {
      const a = msg.cancel_action;
      return (
        <div className="mt-2 w-full max-w-[85%] bg-white border border-red-200 rounded-xl p-3 text-xs text-spc-navy space-y-1">
          <p className="font-semibold mb-1">Cancel booking #{a.booking_id}</p>
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
    if (!isLoggedIn) {
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
