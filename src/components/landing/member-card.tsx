import Image from "next/image";

interface memberCardProps {
  name: string;
  profilePhotoSrc: string;
  role: string;
  bg: string;
}

const MemberCard = ({ name, profilePhotoSrc, role, bg }: memberCardProps) => {
  return (
    <div className="p-2 rounded-[10px] min-w-40 border bg-[#062458]">
      <h6
        className="text-white font-semibold rounded-tr-[10px] rounded-tl-[10px] p-1"
        style={{ backgroundColor: bg }}
      >
        {name}
      </h6>
      <div className="flex flex-col items-center">
        <Image
          width={160}
          height={70}
          src={profilePhotoSrc}
          alt="Team Member"
          className="w-full"
        />
        <span className="h-8 flex items-center px-2.5 rounded-[8px] border-2 border-white text-white w-fit bg-[#062458] whitespace-nowrap -mt-4">
          {role}
        </span>
      </div>
    </div>
  );
};

export default MemberCard;
