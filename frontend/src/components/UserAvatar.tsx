import { cn } from "../lib/utils";

interface UserAvatarProps {
  src: string;
  level: number;
  alt?: string;
  className?: string;
  avatarClassName?: string;
}

export function UserAvatar({ src, level, alt = "Avatar", className, avatarClassName }: UserAvatarProps) {
  const getFrameSrc = (level: number) => {
    if (level >= 1 && level <= 5) return "/level-frame/frame-lv1-5.png";
    if (level >= 6 && level <= 10) return "/level-frame/frame-lv6-10.png";
    if (level >= 11 && level <= 15) return "/level-frame/frame-lv11-15.png";
    if (level >= 16 && level <= 20) return "/level-frame/frame-lv16-20.png";
    return "/level-frame/frame-lv1-5.png"; // Default
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center flex-shrink-0", className)}>
      <img 
        src={src} 
        alt={alt} 
        className={cn("w-[78%] h-[78%] rounded-full object-cover absolute", avatarClassName)}
      />
      <img 
        src={getFrameSrc(level)} 
        alt={`Level ${level} frame`}
        className="w-full h-full object-contain relative z-10 drop-shadow-sm"
      />
    </div>
  );
}
