import { cn } from "@/src/lib/utils";

interface UserLevelBadgeProps {
  level: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showText?: boolean;
}

export function UserLevelBadge({ level, className, size = "md", showText = true }: UserLevelBadgeProps) {
  const getLevelImage = (lvl: number) => {
    if (lvl >= 18) return "/level/18.png";
    return `/level/${lvl}.png`;
  };

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-10 h-10",
    xl: "w-20 h-20",
    "2xl": "w-36 h-36",
  };

  return (
    <div className={cn("inline-flex items-center gap-1.5", className || "text-blue-700")}>
      <img src={getLevelImage(level)} alt={`Level ${level}`} className={cn("object-contain drop-shadow-sm", sizeClasses[size])} />
      {showText && <span className={cn("font-bold ", size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base")}>Lv.{level}</span>}
    </div>
  );
}
