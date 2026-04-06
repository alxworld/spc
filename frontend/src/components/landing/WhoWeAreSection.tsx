import Image from "next/image";
import { Satellite } from "lucide-react";

const cards = [
  {
    title: "Our Beginning",
    body: "We began as a small team gathering every week on a terrace to pray together for nations and communities. As a team, we are committed to prayer, serving God, and fulfilling the Great Commission.",
    image: "/landing/story-beginning-overlay.png",
    imageAlt: "Prayer gathering on a terrace — the beginning of SPC",
  },
  {
    title: "From 10×10 to 750 sq ft",
    body: "What started in a small 10×10 space has now grown into a 750 sq ft prayer hall by God's grace. Today, we joyfully offer this hall free of cost for God's people to gather and pray.",
    image: "/landing/who-we-are-group.jpg",
    imageAlt: "The SPC prayer hall community",
  },
];

export default function WhoWeAreSection() {
  return (
    <section id="who-we-are" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-spc-blue text-sm font-semibold uppercase tracking-wider">Our Story</span>
          <h2 className="text-4xl font-bold text-spc-navy mt-2 mb-4">Who We Are</h2>
          <p className="text-spc-gray max-w-xl mx-auto">
            What began as a faithful prayer gathering has grown into a shared space for intercession, worship, and ministry.
          </p>
        </div>

        {/* Group photo — positioned at 28% from top to frame faces, not ceiling */}
        <div className="mb-14 rounded-2xl overflow-hidden shadow-xl h-72 relative">
          <Image
            src="/landing/who-we-are-group.jpg"
            alt="SPC prayer group"
            fill
            className="object-cover object-[center_28%]"
            priority
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* First two cards */}
          {cards.map(({ title, body, image, imageAlt }) => (
            <div
              key={title}
              className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-spc-blue/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={image}
                  alt={imageAlt}
                  fill
                  className="object-cover object-[center_40%]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <h3 className="text-spc-navy font-semibold text-lg mb-3">{title}</h3>
                <p className="text-spc-gray text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}

          {/* Satellite card — deep-space themed */}
          <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-spc-blue/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
            <div
              className="relative h-48 w-full overflow-hidden flex items-center justify-center"
              style={{
                background: "linear-gradient(145deg, #010d1e 0%, #021630 30%, #032147 60%, #0d1b3e 80%, #160a2e 100%)",
              }}
            >
              {/* Star field — three layers for depth */}
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.95) 1px, transparent 1px)", backgroundSize: "55px 45px", backgroundPosition: "3px 7px" }} />
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "30px 28px", backgroundPosition: "14px 18px" }} />
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)", backgroundSize: "18px 22px", backgroundPosition: "9px 4px" }} />

              {/* Blue/purple nebula glow centered on satellite */}
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(32,157,215,0.3) 0%, rgba(117,57,145,0.15) 50%, transparent 80%)" }} />

              {/* Orbit ring 1 — large */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border border-spc-blue/30" />
              </div>
              {/* Orbit ring 2 — medium */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border border-spc-blue/20" />
              </div>
              {/* Orbit ring 3 — small */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border border-white/15" />
              </div>

              {/* Satellite icon */}
              <div
                className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(32,157,215,0.25) 0%, transparent 70%)" }}
              >
                <Satellite className="w-10 h-10 text-spc-blue drop-shadow-[0_0_8px_rgba(32,157,215,1)]" strokeWidth={1.25} />
              </div>

              {/* Signal dots on orbits */}
              {[
                { top: "18%", left: "17%", color: "bg-spc-yellow" },
                { top: "72%", left: "75%", color: "bg-spc-blue" },
                { top: "60%", left: "18%", color: "bg-spc-purple" },
              ].map((dot, i) => (
                <div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${dot.color} shadow-[0_0_6px_2px_currentColor]`}
                  style={{ top: dot.top, left: dot.left }}
                />
              ))}
            </div>
            <div className="p-6">
              <h3 className="text-spc-navy font-semibold text-lg mb-3">
                Saturday Prayer Cell to Satellite Prayer Cell
              </h3>
              <p className="text-spc-gray text-sm leading-relaxed">
                What began locally has extended its reach, with satellite prayer cells forming in the surrounding communities — spreading the spirit of intercession and revival.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
