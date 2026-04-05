"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Clock, CheckCircle2, Ban, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  getMe, getAdminBookings, updateBookingStatus,
  getBlockedDates, blockDate, unblockDate,
} from "@/lib/api";
import type { User, Booking } from "@/lib/api";

const statusColors: Record<string, string> = {
  pending: "bg-spc-yellow/15 text-spc-yellow",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<{ date: string; reason: string }[]>([]);
  const [blockInput, setBlockInput] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "blocked">("bookings");

  useEffect(() => {
    getMe()
      .then((u) => {
        if (u.role !== "admin" && u.role !== "superadmin") {
          router.push("/login");
          return;
        }
        setUser(u);
        return Promise.all([getAdminBookings(), getBlockedDates()]);
      })
      .then((results) => {
        if (results) {
          setBookings(results[0]);
          setBlockedDates(results[1]);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function handleUpdateStatus(id: number, status: "approved" | "rejected") {
    await updateBookingStatus(id, status);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  }

  async function handleAddBlock() {
    if (!blockInput) return;
    await blockDate(blockInput, blockReason || "Admin block");
    setBlockedDates((prev) => [...prev, { date: blockInput, reason: blockReason || "Admin block" }]);
    setBlockInput("");
    setBlockReason("");
  }

  async function handleRemoveBlock(date: string) {
    await unblockDate(date);
    setBlockedDates((prev) => prev.filter((b) => b.date !== date));
  }

  if (!user) return null;

  const pending = bookings.filter((b) => b.status === "pending");
  const others = bookings.filter((b) => b.status !== "pending");

  const stats = [
    { label: "Total", value: bookings.length, color: "text-spc-blue", icon: CalendarDays },
    { label: "Pending", value: pending.length, color: "text-spc-yellow", icon: Clock },
    { label: "Approved", value: bookings.filter((b) => b.status === "approved").length, color: "text-green-600", icon: CheckCircle2 },
    { label: "Blocked Dates", value: blockedDates.length, color: "text-red-500", icon: Ban },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-spc-navy">Admin Dashboard</h1>
            {user.role === "superadmin" && (
              <span className="inline-block mt-1 bg-spc-purple/15 text-spc-purple text-xs px-2.5 py-0.5 rounded-full font-medium">Super Admin</span>
            )}
          </div>
          <Link href="/admin/users" className="text-sm text-spc-blue hover:underline">
            Manage Users
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {stats.map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100">
              <Icon className={`w-4 h-4 ${color} mb-2`} />
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
              {tab === "bookings" ? `Booking Requests${pending.length > 0 ? ` (${pending.length})` : ""}` : "Blocked Dates"}
            </button>
          ))}
        </div>

        {activeTab === "bookings" && (
          <div className="space-y-4">
            {/* Pending section */}
            {pending.length > 0 && (
              <div className="bg-white rounded-2xl border border-spc-yellow/30 overflow-hidden">
                <div className="px-5 sm:px-6 py-3 border-b border-spc-yellow/20 bg-spc-yellow/5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-spc-yellow" />
                  <h2 className="text-spc-navy font-semibold text-sm">Pending — Needs Action</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {pending.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} onUpdateStatus={handleUpdateStatus} />
                  ))}
                </div>
              </div>
            )}

            {/* Processed section */}
            {others.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 sm:px-6 py-3 border-b border-gray-100">
                  <h2 className="text-spc-navy font-semibold text-sm">Processed Bookings</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {others.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} onUpdateStatus={handleUpdateStatus} />
                  ))}
                </div>
              </div>
            )}

            {bookings.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-spc-gray text-sm">No booking requests yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "blocked" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
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
                  onClick={handleAddBlock}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                  Block Date
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
                <h2 className="text-spc-navy font-semibold">Blocked Dates</h2>
              </div>
              {blockedDates.length === 0 ? (
                <div className="p-8 text-center text-spc-gray text-sm">No blocked dates.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {blockedDates.map((b) => (
                    <div key={b.date} className="px-5 sm:px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-spc-navy font-medium text-sm">{b.date}</p>
                        <p className="text-spc-gray text-xs">{b.reason}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveBlock(b.date)}
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

function BookingRow({
  booking,
  onUpdateStatus,
}: {
  booking: Booking;
  onUpdateStatus: (id: number, status: "approved" | "rejected") => void;
}) {
  return (
    <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-spc-navy font-medium text-sm">{booking.userName}</p>
        </div>
        <p className="text-spc-gray text-xs">{booking.userEmail}</p>
        <p className="text-spc-navy text-sm mt-1">{booking.purpose}</p>
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
              onClick={() => onUpdateStatus(booking.id, "approved")}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200 transition-colors"
            >
              <Check className="w-3 h-3" /> Approve
            </button>
            <button
              onClick={() => onUpdateStatus(booking.id, "rejected")}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium hover:bg-red-100 transition-colors"
            >
              <X className="w-3 h-3" /> Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
