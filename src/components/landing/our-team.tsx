import MemberCard from "./member-card";

const team = [
  {
    id: 1,
    name: "Ashraf Qopiah",
    role: "Software Founder",
    profile: "/teamPhotos/ashraf.png",
    bg: "#10EAFB",
  },
  {
    id: 2,
    name: "Mahmoud Saber",
    role: "Software Engineer",
    profile: "/teamPhotos/mahmoudSaber.png",
    bg: "#672EFB",
  },
  {
    id: 3,
    name: "Ziad Zamel",
    role: "Frontend Developer",
    profile: "/teamPhotos/ziadZamel.png",
    bg: "#0060FC",
  },
  {
    id: 4,
    name: "Djourni Abdel Ali",
    role: "Frontend Developer",
    profile: "/teamPhotos/ali.png",
    bg: "#0060FC",
  },
];

const OurTeam = () => {
  return (
    <section className="text-center min-w-170 my-25 flex flex-col">
      <div className="mb-6">
        <h2 className="text-4xl mb-2">Meet Our Team</h2>
        <p className="text-md">"The team behind FSD CLI"</p>
      </div>
      <div className="flex justify-center gap-x-2">
        {team.map((member) => (
          <MemberCard
            key={member.id}
            name={member.name}
            profilePhotoSrc={member.profile}
            role={member.role}
            bg={member.bg}
          />
        ))}
      </div>
    </section>
  );
};

export default OurTeam;
