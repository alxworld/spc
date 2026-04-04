"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredUser, clearUser } from "@/lib/auth";
import { mockUsers } from "@/lib/mockData";
import type { User, UserRole } from "@/types";

const roleBadge: Record<UserRole, string> = {
  user: "bg-spc-blue/10 text-spc-blue",
  admin: "bg-spc-yellow/15 text-spc-yellow",
  superadmin: "bg-spc-purple/15 text-spc-purple",
};

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || (stored.role !== "admin" && stored.role !== "superadmin")) {
      router.push("/login");
      return;
    }
    setCurrentUser(stored);
  }, [router]);

  function promoteToAdmin(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: "admin" as UserRole } : u));
  }

  function demoteToUser(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: "user" as UserRole } : u));
  }

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === "superadmin";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-spc-navy px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-white/60 hover:text-white transition-colors text-sm">
            ← Admin
          </Link>
          <span className="text-white font-medium">Manage Users</span>
        </div>
        <button
          onClick={() => { clearUser(); router.push("/"); }}
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-spc-navy">All Users</h1>
          <p className="text-spc-gray text-sm mt-1">{users.length} registered users</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-spc-navy/10 flex items-center justify-center">
                    <span className="text-spc-navy font-bold text-sm">
                      {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-spc-navy font-medium text-sm">{u.name}</p>
                    <p className="text-spc-gray text-xs">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>
                    {u.role}
                  </span>
                  {isSuperAdmin && u.role === "user" && (
                    <button
                      onClick={() => promoteToAdmin(u.id)}
                      className="px-3 py-1 bg-spc-blue/10 text-spc-blue rounded-full text-xs font-medium hover:bg-spc-blue/20 transition-colors"
                    >
                      Make Admin
                    </button>
                  )}
                  {isSuperAdmin && u.role === "admin" && (
                    <button
                      onClick={() => demoteToUser(u.id)}
                      className="px-3 py-1 bg-red-50 text-red-500 rounded-full text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      Remove Admin
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
