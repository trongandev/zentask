import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(dateInput: any) {
  if (!dateInput) return "Vừa xong";
  const date = dateInput._seconds ? new Date(dateInput._seconds * 1000) : new Date(dateInput);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " năm trước";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " tháng trước";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " ngày trước";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " giờ trước";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " phút trước";
  return "Vừa xong";
}
