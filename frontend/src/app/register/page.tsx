"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signup } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    try {
      await signup(name, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-spc-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-full bg-spc-yellow flex items-center justify-center">
              <span className="text-spc-navy font-bold">SPC</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="text-white/50 text-sm mt-1">Join the Saturday Prayer Cell community</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-spc-blue transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-spc-blue transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-spc-blue transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-spc-purple text-white rounded-xl py-2.5 font-medium hover:bg-spc-purple/90 transition-colors mt-2 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-spc-blue hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
