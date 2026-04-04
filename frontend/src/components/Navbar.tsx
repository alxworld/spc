"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredUser, clearUser } from "@/lib/auth";
import type { User } from "@/types";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function handleSignOut() {
    clearUser();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-spc-navy/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-spc-yellow flex items-center justify-center">
            <span className="text-spc-navy font-bold text-sm">SPC</span>
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">Saturday Prayer Cell</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/#who-we-are" className="text-white/70 hover:text-white text-sm transition-colors">
            Who we are
          </Link>
          <Link href="/#our-team" className="text-white/70 hover:text-white text-sm transition-colors">
            Our Team
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {(user.role === "admin" || user.role === "superadmin") && (
                <Link
                  href="/admin"
                  className="text-spc-yellow hover:text-spc-yellow/80 text-sm transition-colors"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm px-4 py-1.5 rounded-full border border-white/30 text-white/70 hover:text-white hover:border-white/60 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm px-4 py-1.5 rounded-full border border-white/30 text-white/70 hover:text-white hover:border-white/60 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-1.5 rounded-full bg-spc-blue text-white hover:bg-spc-blue/90 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
