"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, BookOpen, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const statusColors: Record<string, string> = {
  pending: "bg-spc-yellow/15 text-spc-yellow",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn: isAuthenticated, isLoaded } = useAuth();
  const isLoading = !isLoaded;
  const me = useQuery(api.users.getMe);
  const bookings = useQuery(api.bookings.getMyBookings, isAuthenticated ? undefined : "skip");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, router]);

  // Redirect admins to the admin dashboard
  useEffect(() => {
    if (me && (me.role === "admin" || me.role === "superadmin")) {
      router.push("/admin");
    }
  }, [me, router]);

  // me === null means authenticated but user record missing — redirect to login
  if (!isLoading && isAuthenticated && me === null) {
    router.push("/login");
    return null;
  }

  if (isLoading || !me || bookings === undefined) return null;

  const stats = [
    { label: "Total Bookings", value: bookings.length, color: "text-spc-blue", icon: CalendarDays },
    { label: "Approved", value: bookings.filter((b) => b.status === "approved").length, color: "text-green-600", icon: CheckCircle2 },
    { label: "Pending", value: bookings.filter((b) => b.status === "pending").length, color: "text-spc-yellow", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-spc-navy">Welcome, {me.name}</h1>
          <p className="text-spc-gray text-sm mt-1">Manage your Prayer Hall bookings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          {stats.map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl p-3 sm:p-5 border border-gray-100">
              <Icon className={`w-4 h-4 ${color} mb-2`} />
              <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-spc-gray text-xs mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Book CTA */}
        <div className="bg-spc-navy rounded-2xl p-5 sm:p-6 mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-spc-yellow" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Book the Prayer Hall</h2>
              <p className="text-white/50 text-sm mt-0.5 hidden sm:block">Check availability and submit a booking request</p>
            </div>
          </div>
          <Link
            href="/dashboard/book"
            className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 bg-spc-purple text-white rounded-full text-sm font-medium hover:bg-spc-purple/90 transition-colors"
          >
            Book Now
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bookings list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-spc-navy font-semibold">My Bookings</h2>
          </div>
          {bookings.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-spc-blue/10 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-7 h-7 text-spc-blue" />
              </div>
              <p className="text-spc-navy font-semibold mb-1">No bookings yet</p>
              <p className="text-spc-gray text-sm mb-5">Book the Prayer Hall for your gathering, prayer meeting, or event.</p>
              <Link
                href="/dashboard/book"
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-spc-purple text-white rounded-full text-sm font-medium hover:bg-spc-purple/90 transition-colors"
              >
                Make Your First Booking
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map((booking) => (
                <div key={booking.id} className="px-5 sm:px-6 py-4 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
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
