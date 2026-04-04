import Image from "next/image";
import { teamMembers } from "@/lib/mockData";

export default function TeamSection() {
  return (
    <section id="our-team" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-spc-blue text-sm font-semibold uppercase tracking-wider">The people</span>
          <h2 className="text-4xl font-bold text-spc-navy mt-2 mb-4">Meet the Team Behind the Mission.</h2>
          <p className="text-spc-gray max-w-xl mx-auto">
            A growing community of people devoted to prayer, hospitality, and making room for others to seek God together.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {teamMembers.map((member, i) => (
            <div key={member.id} className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden">
                <Image
                  src={`/team/member_${i + 1}.png`}
                  alt={member.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-spc-navy font-semibold text-sm">{member.name}</p>
              <p className="text-spc-gray text-xs mt-1">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
