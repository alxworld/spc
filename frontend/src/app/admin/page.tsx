"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredUser, clearUser } from "@/lib/auth";
import { store } from "@/lib/store";
import type { User, Booking, BookingStatus, BlockedDate } from "@/types";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-spc-yellow/15 text-spc-yellow",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockInput, setBlockInput] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "blocked">("bookings");

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || (stored.role !== "admin" && stored.role !== "superadmin")) {
      router.push("/login");
      return;
    }
    setUser(stored);
    setBookings([...store.bookings]);
    setBlockedDates([...store.blockedDates]);
  }, [router]);

  function updateStatus(id: string, status: BookingStatus) {
    store.updateBookingStatus(id, status);
    setBookings([...store.bookings]);
  }

  function addBlock() {
    if (!blockInput) return;
    store.addBlockedDate(blockInput, blockReason || "Admin block");
    setBlockedDates([...store.blockedDates]);
    setBlockInput("");
    setBlockReason("");
  }

  function removeBlock(date: string) {
    store.removeBlockedDate(date);
    setBlockedDates([...store.blockedDates]);
  }

  if (!user) return null;

  const pending = bookings.filter((b) => b.status === "pending");
  const approved = bookings.filter((b) => b.status === "approved");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-spc-navy px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-8 h-8 rounded-full bg-spc-yellow flex items-center justify-center">
            <span className="text-spc-navy font-bold text-xs">SPC</span>
          </Link>
          <span className="text-white font-medium">Admin Dashboard</span>
          {user.role === "superadmin" && (
            <span className="bg-spc-purple/30 text-spc-yellow text-xs px-2 py-0.5 rounded-full">Super Admin</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/users" className="text-white/60 hover:text-white text-sm transition-colors">Users</Link>
          <button onClick={() => { clearUser(); router.push("/"); }} className="text-white/60 hover:text-white text-sm transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Bookings", value: bookings.length, color: "text-spc-blue" },
            { label: "Pending", value: pending.length, color: "text-spc-yellow" },
            { label: "Approved", value: approved.length, color: "text-green-600" },
            { label: "Blocked Dates", value: blockedDates.length, color: "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-spc-gray text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["bookings", "blocked"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-spc-navy text-white"
                  : "bg-white text-spc-gray border border-gray-200 hover:border-spc-blue/40"
              }`}
            >
              {tab === "bookings" ? "Booking Requests" : "Blocked Dates"}
            </button>
          ))}
        </div>

        {activeTab === "bookings" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-spc-navy font-semibold">All Booking Requests</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {bookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-spc-navy font-medium text-sm">{booking.userName}</p>
                      <span className="text-spc-gray text-xs">·</span>
                      <p className="text-spc-gray text-xs">{booking.userEmail}</p>
                    </div>
                    <p className="text-spc-navy text-sm">{booking.purpose}</p>
                    <p className="text-spc-gray text-xs mt-0.5">
                      {booking.date} · {booking.startTime}–{booking.endTime} · {booking.attendees} attendees
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                      {booking.status}
                    </span>
                    {booking.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatus(booking.id, "approved")}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(booking.id, "rejected")}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "blocked" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-spc-navy font-semibold mb-4">Block a Date</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="date"
                  value={blockInput}
                  onChange={(e) => setBlockInput(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-spc-navy outline-none focus:border-spc-blue"
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-spc-navy placeholder:text-gray-300 outline-none focus:border-spc-blue"
                />
                <button
                  onClick={addBlock}
                  className="px-6 py-2.5 bg-spc-purple text-white rounded-xl text-sm font-medium hover:bg-spc-purple/90 transition-colors"
                >
                  Block
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-spc-navy font-semibold">Blocked Dates</h2>
              </div>
              {blockedDates.length === 0 ? (
                <div className="p-8 text-center text-spc-gray text-sm">No blocked dates.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {blockedDates.map((b) => (
                    <div key={b.date} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-spc-navy font-medium text-sm">{b.date}</p>
                        <p className="text-spc-gray text-xs">{b.reason}</p>
                      </div>
                      <button
                        onClick={() => removeBlock(b.date)}
                        className="text-red-400 hover:text-red-600 text-sm transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
