/**
 * Module-level mutable store for mock state shared across pages.
 * This simulates what a real API + state management layer would provide.
 */
import { mockBookings, blockedDates as initialBlockedDates } from "@/lib/mockData";
import type { Booking, BlockedDate, BookingStatus } from "@/types";

export const store = {
  bookings: [...mockBookings] as Booking[],
  blockedDates: [...initialBlockedDates] as BlockedDate[],

  getBookingsByUser(userId: string): Booking[] {
    return this.bookings.filter((b) => b.userId === userId);
  },

  updateBookingStatus(id: string, status: BookingStatus): void {
    const booking = this.bookings.find((b) => b.id === id);
    if (booking) booking.status = status;
  },

  addBlockedDate(date: string, reason: string): void {
    if (!this.blockedDates.some((b) => b.date === date)) {
      this.blockedDates.push({ date, reason });
    }
  },

  removeBlockedDate(date: string): void {
    this.blockedDates = this.blockedDates.filter((b) => b.date !== date);
  },

  getApprovedDates(): string[] {
    return this.bookings.filter((b) => b.status === "approved").map((b) => b.date);
  },
};
