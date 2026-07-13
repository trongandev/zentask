import { UserPlus, CheckCircle2, MessageSquare, BookOpen, Trophy, Heart, Flame, Bell, LucideIcon } from "lucide-react";

export const getNotificationStyles = (type: string): { Icon: LucideIcon; color: string; bg: string } => {
  switch (type) {
    case "friend_request":
      return { Icon: UserPlus, color: "text-blue-600", bg: "bg-blue-100" };
    case "friend_accept":
      return { Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" };
    case "friend_message":
      return { Icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-100" };
    case "friend_share":
      return { Icon: BookOpen, color: "text-orange-600", bg: "bg-orange-100" };
    case "leaderboard":
      return { Icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-100" };
    case "community_like":
      return { Icon: Heart, color: "text-red-600", bg: "bg-red-100" };
    case "community_comment":
      return { Icon: MessageSquare, color: "text-green-600", bg: "bg-green-100" };
    case "learning_reminder":
      return { Icon: Flame, color: "text-orange-600", bg: "bg-orange-100" };
    default:
      return { Icon: Bell, color: "text-blue-600", bg: "bg-blue-100" };
  }
};

export const getNotificationLink = (n: any): string => {
  let link = "/";
  if (n.type === "friend_request" || n.type === "friend_accept") {
    link = `/profile/${n.referenceId}`;
  } else if (n.type === "leaderboard") {
    link = "/leaderboard";
  } else if (n.type?.startsWith("community")) {
    link = "/community";
  } else if (n.type === "learning_reminder") {
    link = "/flashcards";
  } else if (n.type === "friend_message" || n.type === "friend_share") {
    link = "/friends";
  }
  return link;
};
