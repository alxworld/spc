export type UserRole = "user" | "admin" | "superadmin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type BookingStatus = "pending" | "approved" | "rejected";

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  status: BookingStatus;
  createdAt: string;
}

export interface BlockedDate {
  date: string;
  reason: string;
}
