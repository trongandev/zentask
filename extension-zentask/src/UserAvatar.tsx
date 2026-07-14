interface UserAvatarProps {
  src: string;
  level: number;
  alt?: string;
  className?: string;
  avatarClassName?: string;
  uid?: string;
}

export function UserAvatar({ src, level, alt = "Avatar", className, avatarClassName, uid }: UserAvatarProps) {
  const getFrameSrc = (level: number) => {
    let path = "/level-frame/frame-lv1-5.png";
    if (level >= 1 && level <= 5) path = "/level-frame/frame-lv1-5.png";
    else if (level >= 6 && level <= 10) path = "/level-frame/frame-lv6-10.png";
    else if (level >= 11 && level <= 15) path = "/level-frame/frame-lv11-15.png";
    else if (level >= 16 && level <= 20) path = "/level-frame/frame-lv16-20.png";

    return chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL(path) : path;
  };

  const Content = (
    <>
      <img src={src} alt={alt} className={`w-[78%] h-[78%] rounded-full object-cover absolute ${avatarClassName}`} />
      <img src={getFrameSrc(level)} alt={`Level ${level} frame`} className="w-full h-full object-contain relative z-10 drop-shadow-sm" />
    </>
  );

  const containerClass = `relative inline-flex items-center justify-center flex-shrink-0 ${className}`;

  if (!uid) {
    return <div className={containerClass}>{Content}</div>;
  }

  return (
    <a href={`${import.meta.env.VITE_API_FRONTEND}/profile/${uid}`} className={containerClass}>
      {Content}
    </a>
  );
}
