import type { User, Booking, BlockedDate } from "@/types";

export const mockUsers: User[] = [
  { id: "1", name: "Alex Johnson", email: "alex@example.com", role: "user", createdAt: "2026-01-10" },
  { id: "2", name: "Sarah Williams", email: "sarah@example.com", role: "user", createdAt: "2026-01-15" },
  { id: "3", name: "Michael Chen", email: "michael@example.com", role: "user", createdAt: "2026-02-03" },
  { id: "4", name: "Priya Nair", email: "priya@example.com", role: "user", createdAt: "2026-02-18" },
  { id: "5", name: "Admin User", email: "admin@spc.com", role: "admin", createdAt: "2025-12-01" },
  { id: "6", name: "Super Admin", email: "superadmin@spc.com", role: "superadmin", createdAt: "2025-11-01" },
];

export const mockBookings: Booking[] = [
  {
    id: "b1", userId: "1", userName: "Alex Johnson", userEmail: "alex@example.com",
    date: "2026-04-12", startTime: "09:00", endTime: "11:00",
    purpose: "Prayer and intercession for family", attendees: 5,
    status: "approved", createdAt: "2026-04-01",
  },
  {
    id: "b2", userId: "2", userName: "Sarah Williams", userEmail: "sarah@example.com",
    date: "2026-04-19", startTime: "10:00", endTime: "12:00",
    purpose: "Youth prayer group", attendees: 12,
    status: "pending", createdAt: "2026-04-02",
  },
  {
    id: "b3", userId: "3", userName: "Michael Chen", userEmail: "michael@example.com",
    date: "2026-04-26", startTime: "14:00", endTime: "16:00",
    purpose: "Community intercession", attendees: 8,
    status: "pending", createdAt: "2026-04-03",
  },
  {
    id: "b4", userId: "4", userName: "Priya Nair", userEmail: "priya@example.com",
    date: "2026-03-29", startTime: "09:00", endTime: "11:00",
    purpose: "Women's prayer circle", attendees: 6,
    status: "rejected", createdAt: "2026-03-20",
  },
  {
    id: "b5", userId: "1", userName: "Alex Johnson", userEmail: "alex@example.com",
    date: "2026-05-03", startTime: "08:00", endTime: "10:00",
    purpose: "Personal prayer retreat", attendees: 2,
    status: "pending", createdAt: "2026-04-04",
  },
];

export const blockedDates: BlockedDate[] = [
  { date: "2026-04-10", reason: "Hall maintenance" },
  { date: "2026-04-17", reason: "Private event" },
  { date: "2026-05-01", reason: "Public holiday" },
];

export const approvedDates: string[] = mockBookings
  .filter((b) => b.status === "approved")
  .map((b) => b.date);

export const teamMembers = [
  { id: 1, name: "Pastor Samuel", role: "Lead Pastor" },
  { id: 2, name: "Grace Thomas", role: "Worship Leader" },
  { id: 3, name: "Daniel Raj", role: "Prayer Coordinator" },
  { id: 4, name: "Ruth Matthew", role: "Hospitality" },
  { id: 5, name: "Joseph Philip", role: "Youth Ministry" },
  { id: 6, name: "Mary John", role: "Intercessor" },
  { id: 7, name: "Thomas Abraham", role: "Outreach" },
  { id: 8, name: "Esther George", role: "Children's Ministry" },
  { id: 9, name: "Aaron David", role: "Media & Tech" },
  { id: 10, name: "Lydia Paul", role: "Admin" },
  { id: 11, name: "Simon Peter", role: "Community Care" },
];
