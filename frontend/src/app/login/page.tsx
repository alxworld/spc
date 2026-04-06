"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cross, AlertCircle } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-spc-navy flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-full bg-spc-yellow flex items-center justify-center">
              <Cross className="w-5 h-5 text-spc-navy" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold">Saturday Prayer Cell</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-white/50 text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/8 border border-white/15 rounded-2xl p-8 space-y-4 shadow-xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-spc-blue transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm outline-none focus:border-spc-blue transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-spc-purple text-white rounded-xl py-2.5 font-medium hover:bg-spc-purple/90 transition-colors mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : "Sign In"}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-spc-blue hover:underline">Register</Link>
        </p>
        <p className="text-center text-white/20 text-xs mt-4 italic">&quot;Where two or three gather in my name, I am with them.&quot; — Matthew 18:20</p>
      </div>
    </div>
  );
}
