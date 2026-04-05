import Link from "next/link";
import { Cross, MapPin, Mail, Smartphone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-spc-navy border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
        {/* Col 1: Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-spc-yellow flex items-center justify-center shrink-0">
              <Cross className="w-4 h-4 text-spc-navy" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-sm">Saturday Prayer Cell</span>
          </div>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Jesus is our message. People are our heart. Praying together for nations, communities, the needy, and revival.
          </p>
          <p className="text-white/30 text-xs mt-4 italic">"My house shall be called a house of prayer." — Matthew 21:13</p>
        </div>

        {/* Col 2: Quick links */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-4">Quick Links</h3>
          <ul className="space-y-2.5">
            {[
              { href: "/#who-we-are", label: "Who We Are" },
              { href: "/#our-team", label: "Our Team" },
              { href: "/register", label: "Register" },
              { href: "/login", label: "Login" },
              { href: "/dashboard", label: "Member Dashboard" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-white/50 hover:text-white text-sm transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Contact + App download */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-4">Connect With Us</h3>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-white/50 text-sm">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Prayer Hall, Available Every Saturday</span>
            </li>
            <li className="flex items-center gap-2 text-white/50 text-sm">
              <Mail className="w-4 h-4 shrink-0" />
              <a href="mailto:info@saturdayprayercell.org" className="hover:text-white transition-colors">
                info@saturdayprayercell.org
              </a>
            </li>
          </ul>

          <h3 className="text-white font-semibold text-sm mb-3">Get the App</h3>
          <div className="flex flex-col gap-2">
            <a
              href="#app-download-ios"
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 hover:bg-white/10 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-white/60 shrink-0" />
              <div>
                <p className="text-white/40 text-xs leading-none mb-0.5">Download on the</p>
                <p className="text-white text-sm font-medium">App Store</p>
              </div>
            </a>
            <a
              href="#app-download-android"
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 hover:bg-white/10 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-white/60 shrink-0" />
              <div>
                <p className="text-white/40 text-xs leading-none mb-0.5">Get it on</p>
                <p className="text-white text-sm font-medium">Google Play</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} Saturday Prayer Cell. All rights reserved.</p>
          <p className="text-white/20 text-xs">Booking platform for the Prayer Hall community.</p>
        </div>
      </div>
    </footer>
  );
}
