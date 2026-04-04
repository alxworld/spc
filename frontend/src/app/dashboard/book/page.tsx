"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredUser } from "@/lib/auth";
import { store } from "@/lib/store";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function BookPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3); // April 2026
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [purpose, setPurpose] = useState("");
  const [attendees, setAttendees] = useState("5");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getStoredUser()) {
      router.push("/login");
      return;
    }
    setAuthed(true);
  }, [router]);

  if (!authed) return null;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function toDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function getDateStatus(day: number): "blocked" | "booked" | "available" {
    const d = toDateStr(day);
    if (store.blockedDates.some((b) => b.date === d)) return "blocked";
    if (store.getApprovedDates().includes(d)) return "booked";
    return "available";
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate("");
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate) { setError("Please select a date."); return; }
    if (endTime <= startTime) { setError("End time must be after start time."); return; }
    if (!purpose.trim()) { setError("Please describe the purpose of your booking."); return; }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-10 max-w-sm w-full text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
          </div>
          <h2 className="text-spc-navy font-bold text-xl mb-2">Booking Submitted</h2>
          <p className="text-spc-gray text-sm mb-2">
            Your request for <strong>{selectedDate}</strong> ({startTime}–{endTime}) has been submitted.
          </p>
          <p className="text-spc-gray text-sm mb-6">An admin will review and approve your request shortly.</p>
          <Link
            href="/dashboard"
            className="block w-full bg-spc-purple text-white rounded-xl py-2.5 font-medium hover:bg-spc-purple/90 transition-colors text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const cells = Array.from({ length: firstDay }).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-spc-navy px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors text-sm">
          ← Dashboard
        </Link>
        <span className="text-white font-medium">Book the Prayer Hall</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="text-spc-gray hover:text-spc-navy transition-colors">←</button>
              <span className="text-spc-navy font-semibold">{MONTH_NAMES[month]} {year}</span>
              <button onClick={nextMonth} className="text-spc-gray hover:text-spc-navy transition-colors">→</button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="text-center text-xs text-spc-gray font-medium py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, i) => {
                if (!cell) return <div key={`e-${i}`} />;
                const day = cell as number;
                const status = getDateStatus(day);
                const dateStr = toDateStr(day);
                const isSelected = selectedDate === dateStr;
                const isAvailable = status === "available";

                return (
                  <button
                    key={day}
                    disabled={!isAvailable}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      text-xs rounded-lg py-1.5 transition-colors font-medium
                      ${isSelected ? "bg-spc-purple text-white" : ""}
                      ${!isSelected && isAvailable ? "hover:bg-spc-blue/10 text-spc-navy" : ""}
                      ${status === "blocked" ? "bg-red-50 text-red-300 cursor-not-allowed" : ""}
                      ${status === "booked" ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-spc-gray">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-spc-purple inline-block" /> Selected</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" /> Blocked</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Booked</span>
            </div>
          </div>

          {/* Booking form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-spc-navy font-semibold">Booking Details</h2>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div>
              <label className="block text-sm text-spc-gray mb-1.5">Selected Date</label>
              <input
                readOnly
                value={selectedDate || "Select a date on the calendar"}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-spc-navy bg-gray-50 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-spc-gray mb-1.5">Start Time</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-spc-navy outline-none focus:border-spc-blue"
                >
                  {["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-spc-gray mb-1.5">End Time</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-spc-navy outline-none focus:border-spc-blue"
                >
                  {["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-spc-gray mb-1.5">Purpose</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Brief description of your gathering..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-spc-navy placeholder:text-gray-300 outline-none focus:border-spc-blue resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-spc-gray mb-1.5">Expected Attendees</label>
              <input
                type="number"
                min="1"
                max="50"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-spc-navy outline-none focus:border-spc-blue"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-spc-purple text-white rounded-xl py-2.5 font-medium hover:bg-spc-purple/90 transition-colors text-sm"
            >
              Submit Booking Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
