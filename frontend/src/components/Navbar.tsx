"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Cross } from "lucide-react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Navbar() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.getMe);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    setMenuOpen(false);
    window.location.href = "/";
  }

  const navLinks = [
    { href: "/#who-we-are", label: "Who We Are" },
    { href: "/#our-team", label: "Our Team" },
  ];

  const isAdmin = me?.role === "admin" || me?.role === "superadmin";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-spc-navy/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <div className="w-8 h-8 rounded-full bg-spc-yellow flex items-center justify-center shrink-0">
            <Cross className="w-4 h-4 text-spc-navy" strokeWidth={2.5} />
          </div>
          <span className="text-white font-semibold text-sm">Saturday Prayer Cell</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="text-white/70 hover:text-white text-sm transition-colors">
              {label}
            </Link>
          ))}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link href="/admin" className="text-spc-yellow hover:text-spc-yellow/80 text-sm transition-colors">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="text-white/70 hover:text-white text-sm transition-colors">
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
                className="text-sm px-4 py-1.5 rounded-full bg-spc-yellow text-spc-navy font-medium hover:bg-spc-yellow/90 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white/70 hover:text-white transition-colors p-1"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-spc-navy/98 px-6 py-4 flex flex-col gap-4">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              {label}
            </Link>
          ))}

          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="text-spc-yellow text-sm"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="text-left text-sm text-white/60 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-sm px-4 py-2 rounded-full border border-white/30 text-white/70 hover:text-white text-center transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="text-sm px-4 py-2 rounded-full bg-spc-yellow text-spc-navy font-medium text-center hover:bg-spc-yellow/90 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
