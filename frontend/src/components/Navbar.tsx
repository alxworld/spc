"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Navbar() {
  const { isSignedIn: isAuthenticated } = useAuth();
  const { signOut } = useClerk();
  const me = useQuery(api.users.getMe);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut(() => { window.location.href = "/"; });
    setMenuOpen(false);
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
        <Link href="/" className="flex items-center" onClick={() => setMenuOpen(false)}>
          <Image src="/landing/spc-logo.svg" alt="Saturday Prayer Cell" width={128} height={32} className="h-8 w-auto" priority />
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
