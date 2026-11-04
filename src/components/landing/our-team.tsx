import { MemberCard } from "./member-card";

const team = [
  {
    id: 1,
    name: "Ashraf Qopiah",
    role: "Software Founder",
    photo: "/team/ashraf.webp",
  },
  {
    id: 2,
    name: "Mahmoud Saber",
    role: "Software Engineer",
    photo: "/team/mahmoud-saber.webp",
  },
  {
    id: 3,
    name: "Ziad Zamel",
    role: "Frontend Developer",
    photo: "/team/ziad-zamel.webp",
  },
  {
    id: 4,
    name: "Djourni Abdel Ali",
    role: "Frontend Developer",
    photo: "/team/ali.webp",
  },
];

export function OurTeam() {
  return (
    <section className="landing-team" aria-labelledby="team-heading">
      <p className="section-kicker">THE PEOPLE</p>
      <h2 id="team-heading">Meet our team</h2>
      <p className="landing-team__subtitle">The team behind FSD CLI</p>
      <ul className="landing-team__grid grid grid-cols-2 gap-4 sm:grid-cols-4">
        {team.map((member) => (
          <MemberCard key={member.id} {...member} />
        ))}
      </ul>
    </section>
  );
}
