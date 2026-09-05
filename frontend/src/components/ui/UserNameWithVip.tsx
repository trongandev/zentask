import React from "react";
import { cn } from "@/src/lib/utils";

interface UserNameWithVipProps {
  name: string;
  isVip?: boolean;
  className?: string;
  iconClassName?: string;
}

export function UserNameWithVip({ name, isVip, className, iconClassName }: UserNameWithVipProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        className={cn(
          "truncate",
          isVip ? "animate-rainbow-text font-black drop-shadow-sm" : "font-bold"
        )}
      >
        {name}
      </span>
      {isVip && (
        <img
          src="/etc/upgrade.png"
          className={cn("object-contain flex-shrink-0", iconClassName || "w-7")}
          alt="VIP"
          title="Thành viên VIP"
        />
      )}
    </div>
  );
}
