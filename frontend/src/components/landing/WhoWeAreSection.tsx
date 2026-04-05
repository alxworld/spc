import Image from "next/image";
import { Sprout, Building2, Share2 } from "lucide-react";

const cards = [
  {
    icon: Sprout,
    title: "Our Beginning",
    body: "We began as a small team gathering every week on a terrace to pray together for nations and communities. As a team, we are committed to prayer, serving God, and fulfilling the Great Commission.",
  },
  {
    icon: Building2,
    title: "From 10×10 to 750 sq ft",
    body: "What started in a small 10×10 space has now grown into a 750 sq ft prayer hall by God's grace. Today, we joyfully offer this hall free of cost for God's people to gather and pray.",
  },
  {
    icon: Share2,
    title: "Saturday Prayer Cell to Satellite Prayer Cell",
    body: "What began locally has extended its reach, with satellite prayer cells forming in the surrounding communities — spreading the spirit of intercession and revival.",
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

        {/* Group photo */}
        <div className="mb-14 rounded-2xl overflow-hidden shadow-xl">
          <Image
            src="/group_img.png"
            alt="SPC prayer group"
            width={1200}
            height={500}
            className="w-full object-cover"
            priority
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-spc-blue/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-spc-blue/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-spc-blue" />
              </div>
              <h3 className="text-spc-navy font-semibold text-lg mb-3">{title}</h3>
              <p className="text-spc-gray text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
