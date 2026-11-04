import Image from "next/image";

interface MemberCardProps {
  name: string;
  role: string;
  photo: string;
}

export function MemberCard({ name, role, photo }: MemberCardProps) {
  return (
    <li className="member-card">
      <h3 className="member-card__name">{name}</h3>
      <div className="flex flex-col items-center">
        <Image
          src={photo}
          alt=""
          width={400}
          height={400}
          sizes="(min-width: 640px) 25vw, 50vw"
          className="aspect-square w-full object-cover object-top"
        />
        <span className="member-card__role">{role}</span>
      </div>
    </li>
  );
}
