import Image from "next/image";

const teamMembers = [
  { id: 1, name: "Pastor Samuel", role: "Lead Pastor" },
  { id: 2, name: "Grace Thomas", role: "Worship Leader" },
  { id: 3, name: "Daniel Raj", role: "Prayer Coordinator" },
  { id: 4, name: "Ruth Matthew", role: "Hospitality" },
  { id: 5, name: "Joseph Philip", role: "Youth Ministry" },
  { id: 6, name: "Mary John", role: "Intercessor" },
  { id: 7, name: "Thomas Abraham", role: "Outreach" },
  { id: 8, name: "Esther George", role: "Children's Ministry" },
  { id: 9, name: "Aaron David", role: "Media & Tech" },
  { id: 10, name: "Lydia Paul", role: "Admin" },
  { id: 11, name: "Simon Peter", role: "Community Care" },
];

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
          {teamMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
              <div className="relative w-16 h-16 rounded-full overflow-hidden mx-auto mb-3">
                <Image
                  src={`/landing/team-${member.id}.jpg`}
                  alt={member.name}
                  fill
                  className="object-cover"
                  sizes="64px"
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
