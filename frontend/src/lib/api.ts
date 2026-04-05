"use client";

/**
 * Thin API client. All requests go to /api/* (same origin in production,
 * or NEXT_PUBLIC_API_URL for local dev against a separate backend).
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? "Request failed");
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// --- Auth ---

export interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin" | "superadmin";
  created_at: string;
}

export async function signup(name: string, email: string, password: string): Promise<User> {
  return request("POST", "/api/auth/signup", { name, email, password });
}

export async function signin(email: string, password: string): Promise<User> {
  return request("POST", "/api/auth/signin", { email, password });
}

export async function signout(): Promise<void> {
  await request("POST", "/api/auth/signout");
}

export async function getMe(): Promise<User> {
  return request("GET", "/api/auth/me");
}

// --- Bookings ---

export interface Booking {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Availability {
  approvedDates: string[];
  blockedDates: { date: string; reason: string }[];
}

export async function getMyBookings(): Promise<Booking[]> {
  return request("GET", "/api/bookings");
}

export async function createBooking(data: {
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  attendees: number;
}): Promise<{ id: number; status: string }> {
  return request("POST", "/api/bookings", data);
}

export async function getAvailability(): Promise<Availability> {
  return request("GET", "/api/bookings/availability");
}

export async function cancelBooking(id: number): Promise<void> {
  await request("DELETE", `/api/bookings/${id}`);
}

export async function updateBooking(id: number, data: {
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  attendees: number;
}): Promise<{ id: number; status: string }> {
  return request("PUT", `/api/bookings/${id}`, data);
}

// --- Admin ---

export async function getAdminBookings(): Promise<Booking[]> {
  return request("GET", "/api/admin/bookings");
}

export async function updateBookingStatus(id: number, status: "approved" | "rejected" | "pending"): Promise<void> {
  await request("PUT", `/api/admin/bookings/${id}`, { status });
}

export async function getBlockedDates(): Promise<{ date: string; reason: string }[]> {
  return request("GET", "/api/admin/blocked-dates");
}

export async function blockDate(date: string, reason: string): Promise<void> {
  await request("POST", "/api/admin/blocked-dates", { date, reason });
}

export async function unblockDate(date: string): Promise<void> {
  await request("DELETE", `/api/admin/blocked-dates/${date}`);
}

export async function getAdminUsers(): Promise<User[]> {
  return request("GET", "/api/admin/users");
}

// --- Chat ---

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BookingAction {
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  attendees: number;
}

export interface UpdateAction {
  booking_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  attendees: number;
}

export interface CancelAction {
  booking_id: number;
}

export interface ChatResponse {
  reply: string;
  booking_action: BookingAction | null;
  update_action: UpdateAction | null;
  cancel_action: CancelAction | null;
}

export async function getChatGreeting(): Promise<ChatResponse> {
  return request("GET", "/api/chat/greeting");
}

export async function sendChatMessage(message: string, history: ChatMessage[]): Promise<ChatResponse> {
  return request("POST", "/api/chat/message", { message, history });
}
