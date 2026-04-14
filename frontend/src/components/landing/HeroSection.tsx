import Link from "next/link";
import { Globe, Users, Heart, Flame } from "lucide-react";

const pillars = [
  { label: "Nations", icon: Globe },
  { label: "Communities", icon: Users },
  { label: "The Needy", icon: Heart },
  { label: "Revival", icon: Flame },
];

export default function HeroSection() {
  return (
    <section className="relative bg-spc-navy min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-spc-blue/15 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-spc-purple/15 blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-spc-yellow/5 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 bg-spc-yellow/15 border border-spc-yellow/30 rounded-full px-4 py-1.5 mb-8">
          <svg className="w-3.5 h-3.5 text-spc-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="text-spc-yellow text-sm font-medium">Jesus is our message. People are our heart.</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight">
          Saturday{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-spc-blue to-spc-purple">
            Prayer Cell
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-4">
          Praying together for nations, communities, the needy, and revival.
        </p>

        <p className="text-white/30 text-sm italic mb-12">"My house shall be called a house of prayer." — Matthew 21:13</p>

        {/* Prayer pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14 max-w-2xl mx-auto">
          {pillars.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white/70 text-sm font-medium hover:bg-white/10 hover:-translate-y-1 transition-all duration-200"
            >
              <Icon className="w-5 h-5 text-spc-yellow mx-auto mb-2" />
              <span className="block text-white/50 text-xs mb-0.5">Praying for</span>
              <span className="text-white font-semibold">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 rounded-full bg-spc-purple text-white font-medium hover:bg-spc-purple/90 hover:-translate-y-0.5 transition-all duration-200 shadow-lg shadow-spc-purple/20"
          >
            Register Now
          </Link>
          <Link
            href="/#who-we-are"
            className="px-8 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:-translate-y-0.5 transition-all duration-200"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
