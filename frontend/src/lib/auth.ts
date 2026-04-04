"use client";

import type { User, UserRole } from "@/types";
import { mockUsers } from "@/lib/mockData";

const STORAGE_KEY = "spc_user";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function storeUser(user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Sign in with email + password. Password must be non-empty (mock: any value accepted for regular users). */
export function mockSignIn(email: string, password: string): User | null {
  if (!email || !password) return null;

  // Check known mock users first (preserves deterministic IDs)
  const existing = mockUsers.find((u) => u.email === email);
  if (existing) {
    storeUser(existing);
    return existing;
  }

  // Unknown email: create a regular user with deterministic ID from email
  const roleMap: Record<string, UserRole> = {
    "admin@spc.com": "admin",
    "superadmin@spc.com": "superadmin",
  };
  const role: UserRole = roleMap[email] ?? "user";
  const name = email.split("@")[0];
  // Deterministic ID: simple hash of email
  const id = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0).toString();
  const user: User = {
    id,
    name,
    email,
    role,
    createdAt: new Date().toISOString().split("T")[0],
  };
  storeUser(user);
  return user;
}

/** Register a new user with a given name and email. */
export function mockRegister(name: string, email: string): User {
  const id = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0).toString();
  const user: User = {
    id,
    name,
    email,
    role: "user",
    createdAt: new Date().toISOString().split("T")[0],
  };
  storeUser(user);
  return user;
}
