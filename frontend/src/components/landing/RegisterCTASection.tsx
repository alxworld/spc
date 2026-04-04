import Link from "next/link";

export default function RegisterCTASection() {
  return (
    <section className="py-24 bg-spc-navy">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-spc-blue/15 border border-spc-blue/30 rounded-full px-4 py-1.5 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-spc-blue" />
          <span className="text-spc-blue text-sm font-medium">Join the community</span>
        </div>

        <h2 className="text-4xl font-bold text-white mb-4">Register for the Community</h2>
        <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
          Create your account to stay connected, receive updates, and access the member dashboard after you sign in.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 rounded-full bg-spc-purple text-white font-medium hover:bg-spc-purple/90 transition-colors"
          >
            Register Now
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}
