"use client";

import { useState } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-spc-navy px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white text-sm font-medium">SPC Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex-1 p-4 min-h-48 flex flex-col gap-3">
            <div className="bg-spc-blue/10 rounded-xl px-3 py-2 text-sm text-spc-navy max-w-[85%]">
              Hello! I&apos;m the SPC Assistant. I can help you learn about the Prayer Hall, timings, and bookings.
            </div>
            <p className="text-center text-xs text-spc-gray mt-auto">
              AI assistant coming soon
            </p>
          </div>
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <input
              type="text"
              placeholder="Ask me anything..."
              disabled
              className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-1.5 outline-none bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <button
              disabled
              className="w-8 h-8 rounded-full bg-spc-purple/40 text-white flex items-center justify-center cursor-not-allowed"
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
