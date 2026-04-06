"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const roleBadge: Record<string, string> = {
  user: "bg-spc-blue/15 text-spc-blue",
  admin: "bg-spc-yellow/20 text-amber-600",
  superadmin: "bg-spc-purple/15 text-spc-purple",
};

const avatarColor: Record<string, string> = {
  user: "bg-spc-blue",
  admin: "bg-spc-yellow",
  superadmin: "bg-spc-purple",
};

export default function UsersPage() {
  const router = useRouter();
  const { isSignedIn: isAuthenticated, isLoaded } = useAuth();
  const isLoading = !isLoaded;
  const me = useQuery(api.users.getMe);
  const users = useQuery(api.admin.listUsers, isAuthenticated ? undefined : "skip");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (me !== undefined && me !== null && me.role !== "admin" && me.role !== "superadmin") {
      router.push("/dashboard");
    }
  }, [me, router]);

  if (isLoading || !me || users === undefined) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-spc-gray hover:text-spc-navy transition-colors p-1 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-spc-navy">All Users</h1>
            <p className="text-spc-gray text-sm mt-0.5">{users.length} registered member{users.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-spc-gray uppercase tracking-wider">
            <div className="col-span-5">Name</div>
            <div className="col-span-5">Email</div>
            <div className="col-span-2">Role</div>
          </div>

          {users.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-spc-gray text-sm">No users found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="px-5 sm:px-6 py-4 flex items-center gap-4 sm:grid sm:grid-cols-12">
                  <div className="flex items-center gap-3 sm:col-span-5">
                    <div className={`w-9 h-9 rounded-full ${avatarColor[u.role] ?? "bg-spc-navy"} flex items-center justify-center shrink-0`}>
                      <span className="text-white font-bold text-xs">
                        {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-spc-navy font-medium text-sm truncate">{u.name}</p>
                  </div>
                  <p className="text-spc-gray text-sm hidden sm:block sm:col-span-5 truncate">{u.email}</p>
                  <div className="ml-auto sm:ml-0 sm:col-span-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
