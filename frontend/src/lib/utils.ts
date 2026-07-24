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

export const getFlashcardTimeAgo = (date: any) => {
  if (!date) return "Chưa học";
  return "Gần đây";
};

export const RANK_CONFIG: any = {
  1: { name: "Bạc", maxTiers: 3, starsPerTier: 3 },
  2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4 },
  3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5 },
  4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5 },
  5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: 99 },
};

export const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

export const LANG_MAP: Record<string, string> = {
  en: "Anh",
  zh: "Trung",
  ja: "Nhật",
  ko: "Hàn",
  fr: "Pháp",
  de: "Đức",
  es: "Tây Ban Nha",
  th: "Thái",
  vi: "Việt",
};

export const FOLDER_THEMES: Record<string, { bg: string; text: string; fill: string }> = {
  blue: { bg: "bg-blue-50/50", text: "text-blue-600", fill: "fill-blue-600/20" },
  red: { bg: "bg-red-50/50", text: "text-red-600", fill: "fill-red-600/20" },
  yellow: { bg: "bg-yellow-50/50", text: "text-yellow-600", fill: "fill-yellow-600/20" },
  green: { bg: "bg-green-50/50", text: "text-green-600", fill: "fill-green-600/20" },
  purple: { bg: "bg-purple-50/50", text: "text-purple-600", fill: "fill-purple-600/20" },
  pink: { bg: "bg-pink-50/50", text: "text-pink-600", fill: "fill-pink-600/20" },
  orange: { bg: "bg-orange-50/50", text: "text-orange-600", fill: "fill-orange-600/20" },
  teal: { bg: "bg-teal-50/50", text: "text-teal-600", fill: "fill-teal-600/20" },
};
