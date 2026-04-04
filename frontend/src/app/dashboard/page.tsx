"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, getMyBookings, signout } from "@/lib/api";
import type { User, Booking } from "@/lib/api";

const statusColors: Record<string, string> = {
  pending: "bg-spc-yellow/15 text-spc-yellow",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        return getMyBookings();
      })
      .then(setBookings)
      .catch(() => router.push("/login"));
  }, [router]);

  async function handleSignOut() {
    await signout().catch(() => {});
    router.push("/");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-spc-navy px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-spc-yellow flex items-center justify-center">
            <span className="text-spc-navy font-bold text-xs">SPC</span>
          </Link>
          <span className="text-white font-medium">Member Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm hidden sm:block">{user.email}</span>
          <button onClick={handleSignOut} className="text-white/60 hover:text-white text-sm transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-spc-navy">Welcome, {user.name}</h1>
          <p className="text-spc-gray text-sm mt-1">Manage your Prayer Hall bookings</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Bookings", value: bookings.length, color: "text-spc-blue" },
            { label: "Approved", value: bookings.filter((b) => b.status === "approved").length, color: "text-green-600" },
            { label: "Pending", value: bookings.filter((b) => b.status === "pending").length, color: "text-spc-yellow" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-spc-gray text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-spc-navy rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Book the Prayer Hall</h2>
            <p className="text-white/50 text-sm mt-1">Check availability and submit a booking request</p>
          </div>
          <Link
            href="/dashboard/book"
            className="shrink-0 px-6 py-2.5 bg-spc-purple text-white rounded-full text-sm font-medium hover:bg-spc-purple/90 transition-colors"
          >
            Book Now
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-spc-navy font-semibold">My Bookings</h2>
          </div>
          {bookings.length === 0 ? (
            <div className="p-10 text-center text-spc-gray text-sm">No bookings yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bookings.map((booking) => (
                <div key={booking.id} className="px-6 py-4 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <p className="text-spc-navy font-medium text-sm">{booking.purpose}</p>
                    <p className="text-spc-gray text-xs mt-0.5">
                      {booking.date} · {booking.startTime}–{booking.endTime} · {booking.attendees} attendees
                    </p>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
