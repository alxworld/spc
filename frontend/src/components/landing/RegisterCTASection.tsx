import Link from "next/link";

export default function RegisterCTASection() {
  return (
    <section className="py-24 bg-spc-yellow">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-spc-navy/10 border border-spc-navy/20 rounded-full px-4 py-1.5 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-spc-navy/60" />
          <span className="text-spc-navy/70 text-sm font-medium">Join the community</span>
        </div>

        <h2 className="text-4xl sm:text-5xl font-bold text-spc-navy mb-4">Gather. Pray. Serve.</h2>
        <p className="text-spc-navy/60 text-lg mb-10 max-w-xl mx-auto">
          Create your account to book the Prayer Hall, stay connected, and be part of a community devoted to intercession and revival.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 rounded-full bg-spc-navy text-white font-medium hover:bg-spc-navy/90 hover:-translate-y-0.5 transition-all duration-200 shadow-lg shadow-spc-navy/20"
          >
            Register Now
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-full border-2 border-spc-navy/30 text-spc-navy font-medium hover:border-spc-navy/60 hover:-translate-y-0.5 transition-all duration-200"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}
