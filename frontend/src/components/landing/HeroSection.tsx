import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative bg-spc-navy min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-spc-blue/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-spc-purple/10 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-spc-yellow/15 border border-spc-yellow/30 rounded-full px-4 py-1.5 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-spc-yellow" />
          <span className="text-spc-yellow text-sm font-medium">Jesus is our message. People are our heart.</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight">
          Saturday{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-spc-blue to-spc-purple">
            Prayer Cell
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-12">
          Praying together for nations, communities, the needy, and revival.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14 max-w-2xl mx-auto">
          {["Nations", "Communities", "The Needy", "Revival"].map((pillar) => (
            <div
              key={pillar}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm font-medium"
            >
              Praying for<br />
              <span className="text-white font-semibold">{pillar}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 rounded-full bg-spc-purple text-white font-medium hover:bg-spc-purple/90 transition-colors"
          >
            Register Now
          </Link>
          <Link
            href="/#who-we-are"
            className="px-8 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
