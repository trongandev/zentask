import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trophy,
  Flame,
  Star,
  BookOpen,
  Clock,
  Target,
  Award,
  Edit3,
  UserPlus,
  MapPin,
  Calendar,
  Link as LinkIcon,
  ChevronRight,
  Lock,
  Check,
  Medal,
  Gamepad2,
  UserCheck,
  Users,
  MessageSquare,
  UserMinus,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { UserLevelBadge } from "../components/UserLevelBadge";
import { RankCard } from "../components/shared/RankCard";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useConfigStore } from "../services/configService";
import { useEtcStore } from "../services/etcService";
import { useUserStore } from "../services/userService";
import { RANK_NAMES } from "../config/rankTopicConfig";
import toastService from "@/src/services/toastService";
import { friendsService } from "../services/friendsService";
import { Modal } from "../components/shared/Modal";

const API_URL = import.meta.env.VITE_API_BACKEND;

const RECENT_ACTIVITIES = [
  { id: 1, action: "Đã hoàn thành bài Quiz", target: "Ngữ pháp cơ bản - Thì Hiện Tại", time: "2 giờ trước", icon: Target, color: "text-green-500" },
  { id: 2, action: "Đã học bộ Flashcard", target: "50 Động từ bất quy tắc", time: "Hôm qua", icon: BookOpen, color: "text-blue-500" },
  { id: 3, action: "Đạt danh hiệu mới", target: "Chăm chỉ - Học 7 ngày liên tiếp", time: "Hôm qua", icon: Award, color: "text-yellow-500" },
  { id: 4, action: "Vượt qua mốc", target: "Level 12 - Bậc Thầy Tân Cấp", time: "2 ngày trước", icon: Star, color: "text-blue-500" },
  { id: 5, action: "Đạt danh hiệu mới", target: "Cú đêm - Học sau 10h tối", time: "3 ngày trước", icon: Award, color: "text-indigo-500" },
  { id: 6, action: "Bắt đầu bài học mới", target: "Phát âm chuẩn IPA", time: "1 tuần trước", icon: BookOpen, color: "text-purple-500" },
];

export function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { levels: SYSTEM_LEVELS, badges: SYSTEM_BADGES } = useConfigStore();
  const { getUserProfile } = useEtcStore();
  const isCurrentUser = !id || id === authUser?.uid;
  const [activeTab, setActiveTab] = useState("overview"); // overview, badges, activities, levels
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [friendStatus, setFriendStatus] = useState<string>("none"); // none, sent, received, friend
  const [isFriendLoading, setIsFriendLoading] = useState(false);
  const [showFriendMenu, setShowFriendMenu] = useState(false);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);

  const [rankConfig, setRankConfig] = useState<any>(null);

  useEffect(() => {
    if (activeTab === "ranks" && !rankConfig) {
      fetch(`${API_URL}/api/beginner/ranks?lang=en`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data) setRankConfig(data);
        })
        .catch(console.error);
    }
  }, [activeTab, rankConfig]);

  useEffect(() => {
    const fetchProfile = async () => {
      const targetId = id || authUser?.uid;
      if (targetId) {
        setLoading(true);
        const data = await getUserProfile(targetId);
        setProfileData(data);

        if (id && authUser && authUser.uid !== id) {
          try {
            const [friends, requests] = await Promise.all([friendsService.listFriends(), friendsService.getRequests()]);
            if (friends.find((f) => f.friendId === id)) {
              setFriendStatus("friend");
            } else if (requests.outgoing.find((r) => r.toId === id)) {
              setFriendStatus("sent");
            } else if (requests.incoming.find((r) => r.fromId === id)) {
              setFriendStatus("received");
            } else {
              setFriendStatus("none");
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (!id || authUser?.uid === id) {
          try {
            const friends = await friendsService.listFriends();
            setFriendsList(friends);
          } catch (e) {}
        }

        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, authUser, getUserProfile]);

  const handleToggleFriend = async () => {
    if (!id || !authUser) return toastService.error("Vui lòng đăng nhập!");
    if (isFriendLoading) return;
    setIsFriendLoading(true);

    try {
      if (friendStatus === "none") {
        await friendsService.sendRequest(id);
        setFriendStatus("sent");
        toastService.success("Đã gửi lời mời kết bạn");
      } else if (friendStatus === "friend") {
        toastService.success("Hai bạn đã là bạn bè");
      } else if (friendStatus === "received") {
        // Find request id
        const requests = await friendsService.getRequests();
        const req = requests.incoming.find((r: any) => r.fromId === id);
        if (req) {
          await friendsService.respondRequest(req.id, "accept");
          setFriendStatus("friend");
          toastService.success("Đã chấp nhận kết bạn");
        }
      }
    } catch (error: any) {
      toastService.error(error.message || "Có lỗi xảy ra");
    } finally {
      setIsFriendLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!id) return;
    setIsFriendLoading(true);
    try {
      await friendsService.unfriend(id);
      setFriendStatus("none");
      setShowUnfriendModal(false);
      setShowFriendMenu(false);
      toastService.success("Đã hủy kết bạn");
    } catch (error: any) {
      toastService.error(error.message || "Có lỗi xảy ra");
    } finally {
      setIsFriendLoading(false);
    }
  };

  const user = profileData
    ? {
        name: profileData.name,
        username: profileData.username,
        avatar: profileData.avatar,
        cover: profileData.cover,
        bio: profileData.bio,
        location: "Việt Nam",
        joined: profileData.joined,
        website: "",
        level: profileData.level,
        xp: profileData.xp,
        following: profileData.following || 0,
        followers: profileData.followers || 0,
        achievedBadges: profileData.achievedBadges || [],
        rankId: profileData.rankId,
        tier: profileData.tier,
        stars: profileData.stars,
        streak: profileData.streak,
        stats: profileData.stats || {},
        recentActivities: profileData.recentActivities || [],
      }
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-20 text-gray-500 font-medium text-lg">Không tìm thấy người dùng</div>;
  }

  const RANK_CONFIG: Record<number, any> = {
    1: { name: "Bạc", maxTiers: 3, starsPerTier: 3 },
    2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4 },
    3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5 },
    4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5 },
    5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: 99 }, // infinity representation
  };
  const TIER_NAMES: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };
  const currentRank = {
    rankId: user.rankId,
    name: RANK_CONFIG[user.rankId]?.name || "Bạc",
    tier: TIER_NAMES[user.tier] || "III",
    stars: user.stars,
    maxStars: RANK_CONFIG[user.rankId]?.starsPerTier || 3,
    position: isCurrentUser ? 142 : 1,
  };

  const backendStats = user?.stats || {};
  const stats = [
    { label: "Chuỗi ngày", value: `${user.streak || 0} ngày`, icon: Flame, color: "text-orange-500", bgColor: "bg-orange-50" },
    { label: "Thẻ lật đã học", value: (backendStats.flashcardsLearned || 0).toLocaleString(), icon: BookOpen, color: "text-blue-500", bgColor: "bg-blue-50" },
    { label: "Quiz hoàn thành", value: (backendStats.quizzesCompleted || 0).toLocaleString(), icon: Target, color: "text-green-500", bgColor: "bg-green-50" },
    { label: "Giờ học", value: `${backendStats.studyHours || 0}h`, icon: Clock, color: "text-purple-500", bgColor: "bg-purple-50" },
  ];

  const currentLevelInfo = SYSTEM_LEVELS.find((l) => l.level === user.level) || SYSTEM_LEVELS[0];
  const nextLevelInfo = SYSTEM_LEVELS.find((l) => l.level === user.level + 1);
  const xpNeeded = nextLevelInfo ? nextLevelInfo.xp - currentLevelInfo.xp : 0;
  const xpProgress = nextLevelInfo ? user.xp - currentLevelInfo.xp : 0;
  const progressPercent = nextLevelInfo ? Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100)) : 100;

  const tabs = [
    { id: "overview", label: "Tổng quan" },
    { id: "badges", label: "Danh hiệu" },
    { id: "activities", label: "Hoạt động gần đây" },
    { id: "levels", label: "Cấp độ (Level)" },
    { id: "friends", label: "Bạn bè" },
    { id: "frames", label: "Khung Avatar" },
    { id: "ranks", label: "Cấp bậc (Ranks)" },
  ];

  return (
    <div className="w-full md:max-w-5xl mx-auto space-y-6">
      {/* Cover & Profile Header */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        {/* Cover Image */}
        <div className="h-48 md:h-64 w-full relative">
          <img src={user.cover} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        {/* Profile Info */}
        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 md:-mt-20 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-5">
              <div className="relative">
                <UserAvatar src={user.avatar} level={user.level} className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-full shadow-lg" />
              </div>

              <div className="text-center md:text-left mt-2 md:mt-0 md:mb-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{user.name}</h1>
                <p className="text-gray-500 font-medium">{user.username}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 md:mb-4">
              {isCurrentUser ? (
                <button onClick={() => navigate("/settings")} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl flex items-center gap-2 transition-colors">
                  <Edit3 className="w-4 h-4" />
                  Chỉnh sửa hồ sơ
                </button>
              ) : friendStatus === "friend" ? (
                <div className="relative">
                  <button
                    onClick={() => setShowFriendMenu(!showFriendMenu)}
                    className="px-6 py-2.5 font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    <UserCheck className="w-4 h-4" /> Bạn bè
                  </button>

                  {showFriendMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowFriendMenu(false)}></div>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            setShowFriendMenu(false);
                            // handle message (this will just open FloatingChat if we set the active chat friend somewhere, or redirect to /friends)
                            navigate("/friends");
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          Nhắn tin
                        </button>
                        <button
                          onClick={() => {
                            setShowFriendMenu(false);
                            setShowUnfriendModal(true);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-gray-50"
                        >
                          <UserMinus className="w-4 h-4" />
                          Hủy kết bạn
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleToggleFriend}
                  disabled={isFriendLoading || friendStatus === "sent"}
                  className={cn(
                    "px-6 py-2.5 font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50",
                    friendStatus !== "none" ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-blue-600 hover:bg-blue-700 text-white",
                  )}
                >
                  {friendStatus === "sent" ? (
                    <>
                      <Check className="w-4 h-4" /> Đã gửi lời mời
                    </>
                  ) : friendStatus === "received" ? (
                    <>
                      <Check className="w-4 h-4" /> Chấp nhận kết bạn
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Thêm bạn bè
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 border-b border-gray-100 mt-8 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn("pb-4 font-semibold text-sm transition-colors relative whitespace-nowrap", activeTab === tab.id ? "text-blue-600" : "text-gray-500 hover:text-gray-700")}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Bio & Details */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-gray-700 leading-relaxed mb-4">{user.bio}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {user.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <a href={`https://${user.website}`} className="text-blue-600 hover:underline">
                      {user.website}
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Tham gia {user.joined}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col items-center text-center">
                      <div className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center mb-2`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <p className="text-xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
                      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Preview Activities */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Hoạt động gần đây
                  </h3>
                  <button onClick={() => setActiveTab("activities")} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Xem tất cả
                  </button>
                </div>

                <div className="relative border-l-2 border-gray-100 ml-3 md:ml-4 space-y-6 pb-2">
                  {!user.recentActivities || user.recentActivities.length === 0 ? (
                    <div className="pl-6 text-sm text-gray-500">Chưa có hoạt động nào gần đây.</div>
                  ) : (
                    user.recentActivities.slice(0, 3).map((activity: any) => {
                      const getIconForType = (type: string) => {
                        switch (type) {
                          case "quiz":
                            return { icon: Target, color: "text-green-500", bg: "bg-green-50" };
                          case "flashcard":
                            return { icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50" };
                          case "arena":
                            return { icon: Gamepad2, color: "text-orange-500", bg: "bg-orange-50" };
                          default:
                            return { icon: Clock, color: "text-purple-500", bg: "bg-purple-50" };
                        }
                      };

                      const style = getIconForType(activity.type);
                      const Icon = style.icon;

                      // Format time nicely
                      const actDate = new Date(activity.time);
                      const timeStr = actDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

                      return (
                        <div key={activity.id} className="relative pl-6 md:pl-8">
                          <div className="absolute -left-[11px] top-0.5 w-5 h-5 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center">
                            <div className={`w-2 h-2 rounded-full bg-current ${style.color}`}></div>
                          </div>

                          <div className={`rounded-2xl p-4 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all ${style.bg}`}>
                            <div className="flex items-start justify-between gap-4 mb-1">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${style.color}`} />
                                <p className="text-sm font-bold text-gray-900">{activity.action}</p>
                              </div>
                              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{timeStr}</span>
                            </div>
                            <p className="text-sm text-gray-600 font-medium">{activity.target}</p>
                            {activity.xpEarned > 0 && <p className="text-xs font-bold text-yellow-600 mt-2">+{activity.xpEarned} XP</p>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Side Info */}
            <div className="space-y-6">
              {/* Follower Stats */}
              <div className="flex gap-4">
                <div onClick={() => setActiveTab("friends")} className="flex-1 bg-white shadow-sm rounded-2xl p-4 border border-gray-100 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <p className="text-xl font-bold text-gray-900">{isCurrentUser ? friendsList.length : "---"}</p>
                  <p className="text-xs text-gray-500 font-medium">Bạn bè</p>
                </div>
              </div>

              {/* Current Rank Card */}
              <div className="bg-gradient-to-b from-blue-900 to-indigo-950 rounded-2xl p-5 text-white shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-all">
                <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-20 pointer-events-none scale-150">
                  <img src={`/rank/${currentRank.rankId}.png`} alt="Rank Background" className="w-40 h-40 object-contain drop-shadow-2xl" />
                </div>

                <RankCard user={user} />
              </div>

              {/* Level Card Preview */}
              <div
                className="bg-gradient-to-b from-purple-900 to-indigo-950 rounded-2xl p-5 text-white shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-all group"
                onClick={() => setActiveTab("levels")}
              >
                <div className="absolute top-1/2 -translate-y-1/2 right-0 opacity-20 pointer-events-none scale-150">
                  <div className="w-40 h-40 bg-purple-500/30 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10">
                  <h2 className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Cấp Độ (Level)
                  </h2>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl p-2 border border-white/20 shadow-inner flex items-center justify-center drop-shadow-md">
                      <UserLevelBadge level={user.level} size="lg" showText={false} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-100 to-white leading-tight">Level {user.level}</span>
                      <span className="text-xs font-bold text-purple-200 mt-0.5">{currentLevelInfo.title}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-purple-200">
                      <span>{user.xp.toLocaleString()} XP</span>
                      <span>{nextLevelInfo ? nextLevelInfo.xp.toLocaleString() : "MAX"} XP</span>
                    </div>
                    <div className="h-2.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full relative" style={{ width: `${progressPercent}%` }}>
                        <div
                          className="absolute inset-0 bg-white/20"
                          style={{
                            backgroundImage:
                              "linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)",
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-purple-800/50">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span className="text-purple-300">Tiến trình</span>
                      <span className="text-white font-bold bg-white/10 px-2.5 py-1 rounded-lg">{progressPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Preview */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Danh hiệu ({user.achievedBadges.length})
                  </h3>
                  <button onClick={() => setActiveTab("badges")} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Xem tất cả
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SYSTEM_BADGES.filter((b) => user.achievedBadges.includes(b.id))
                    .slice(0, 5)
                    .map((badge) => (
                      <div key={badge.id} className="w-12 h-12 flex items-center justify-center drop-shadow-sm" title={badge.name}>
                        <img src={badge.icon} alt={badge.name} className="w-full h-full object-contain" />
                      </div>
                    ))}
                  {user.achievedBadges.length > 5 && (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold bg-gray-50 text-gray-500 border border-gray-200">+{user.achievedBadges.length - 5}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BADGES TAB */}
        {activeTab === "badges" && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-100 text-yellow-600 mb-4">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Bộ Sưu Tập Danh Hiệu</h2>
              <p className="text-gray-500 font-medium">Hoàn thành các nhiệm vụ và thử thách để mở khóa toàn bộ danh hiệu hệ thống.</p>

              <div className="mt-6 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-black text-gray-900">{user.achievedBadges.length}</p>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Đã đạt</p>
                </div>
                <div className="w-px h-10 bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-3xl font-black text-gray-400">{SYSTEM_BADGES.length}</p>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Tổng số</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {SYSTEM_BADGES.map((badge) => {
                const isAchieved = user.achievedBadges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                      isAchieved ? `bg-white border-gray-200 shadow-sm hover:shadow-md` : "bg-gray-50/50 border-dashed border-gray-200 opacity-60 grayscale hover:grayscale-0",
                    )}
                  >
                    <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 drop-shadow-sm">
                      {isAchieved ? (
                        <img src={badge.icon} alt={badge.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                          <Lock className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className={cn("font-bold text-base mb-0.5", isAchieved ? "text-gray-900" : "text-gray-600")}>{badge.name}</h4>
                      <p className="text-xs text-gray-500 font-medium line-clamp-2">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === "activities" && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-500" />
              Lịch sử hoạt động
            </h2>

            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4 max-w-3xl">
              {!user.recentActivities || user.recentActivities.length === 0 ? (
                <div className="pl-8 text-gray-500 font-medium">Chưa có hoạt động nào được ghi nhận.</div>
              ) : (
                user.recentActivities.map((activity: any) => {
                  const getIconForType = (type: string) => {
                    switch (type) {
                      case "quiz":
                        return { icon: Target, color: "text-green-500", bg: "bg-green-50" };
                      case "flashcard":
                        return { icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50" };
                      case "arena":
                        return { icon: Gamepad2, color: "text-orange-500", bg: "bg-orange-50" };
                      default:
                        return { icon: Clock, color: "text-purple-500", bg: "bg-purple-50" };
                    }
                  };

                  const style = getIconForType(activity.type);
                  const Icon = style.icon;

                  const actDate = new Date(activity.time);
                  const timeStr = actDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

                  return (
                    <div key={activity.id} className="relative pl-8">
                      <div className="absolute -left-[17px] top-0.5 w-8 h-8 rounded-full bg-white border-4 border-gray-50 flex items-center justify-center shadow-sm">
                        <div className={`w-3 h-3 rounded-full bg-current ${style.color}`}></div>
                      </div>

                      <div className={`rounded-2xl p-5 border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all ${style.bg}`}>
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-white shadow-sm border border-gray-100`}>
                              <Icon className={`w-5 h-5 ${style.color}`} />
                            </div>
                            <div>
                              <p className="text-base font-bold text-gray-900">{activity.action}</p>
                              <span className="text-xs font-medium text-gray-500">{timeStr}</span>
                            </div>
                          </div>
                          {activity.xpEarned > 0 && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-lg whitespace-nowrap">+{activity.xpEarned} XP</span>}
                        </div>
                        <div className="mt-3 p-3 bg-white rounded-xl border border-gray-100 text-sm text-gray-700 font-medium inline-block">{activity.target}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* LEVELS TAB */}
        {activeTab === "levels" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0 relative">
                  <UserAvatar src={user.avatar} level={user.level} className="w-32 h-32 md:w-40 md:h-40" />
                </div>

                <div className="flex-1 text-center md:text-left w-full">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm font-bold backdrop-blur-md mb-3 border border-white/20">
                    <UserLevelBadge level={user.level} size="sm" className="text-white" />
                    <span>• {currentLevelInfo.title}</span>
                  </div>

                  <h2 className="text-2xl font-bold mb-4">{user.xp.toLocaleString()} XP Hiện tại</h2>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm font-bold text-blue-100 mb-2">
                      <span>Tiến trình lên Level {nextLevelInfo ? user.level + 1 : "MAX"}</span>
                      <span>{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full relative" style={{ width: `${progressPercent}%` }}>
                        <div
                          className="absolute inset-0 bg-white/20"
                          style={{
                            backgroundImage:
                              "linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)",
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-blue-100/80 font-medium">
                    {nextLevelInfo ? `Học thêm ${xpNeeded - xpProgress} XP nữa để thăng cấp. Mỗi ngày học chăm chỉ sẽ được ~150-200 XP.` : "Tuyệt vời! Bạn đã đạt cấp độ cao nhất."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Lộ Trình Thăng Cấp (1 - 20)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {SYSTEM_LEVELS.map((lvl) => {
                  const isCurrent = lvl.level === user.level;
                  const isPassed = lvl.level < user.level;

                  return (
                    <div
                      key={lvl.level}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        isCurrent ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-500" : isPassed ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100",
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center p-1",
                            isCurrent ? "bg-blue-100/50 shadow-md ring-1 ring-blue-200" : isPassed ? "bg-gray-100/50" : "bg-gray-50 opacity-50 grayscale",
                          )}
                        >
                          <UserLevelBadge level={lvl.level} size="lg" showText={false} />
                        </div>
                        <div>
                          <h4 className={cn("font-bold text-base", isCurrent ? "text-blue-900" : isPassed ? "text-gray-900" : "text-gray-500")}>{lvl.title}</h4>
                          <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Cần <span className="text-yellow-600 font-bold">{lvl.xp.toLocaleString()} XP</span>
                          </p>
                        </div>
                      </div>

                      {isCurrent && <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Hiện tại</div>}
                      {isPassed && (
                        <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      {!isCurrent && !isPassed && <Lock className="w-5 h-5 text-gray-300" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FRIENDS TAB */}
        {activeTab === "friends" && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              Bạn bè ({friendsList.length})
            </h3>

            {friendsList.length === 0 ? (
              <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">Chưa có bạn bè nào.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friendsList.map((friend) => (
                  <div
                    key={friend.friendId}
                    className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:shadow-md transition-all bg-white cursor-pointer"
                    onClick={() => navigate(`/profile/${friend.friendId}`)}
                  >
                    <UserAvatar src={friend.photoURL} level={friend.level} className="w-14 h-14" />
                    <div>
                      <h4 className="font-bold text-gray-900">{friend.displayName}</h4>
                      <p className="text-sm text-gray-500">Level {friend.level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FRAMES TAB */}
        {activeTab === "frames" && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-500" />
              Khung Avatar Hệ Thống
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: "Khung Tân binh", src: "/level-frame/frame-lv1-5.png", level: "Lv 1 - 5", minLevel: 1, maxLevel: 5 },
                { name: "Khung Triển vọng", src: "/level-frame/frame-lv6-10.png", level: "Lv 6 - 10", minLevel: 6, maxLevel: 10 },
                { name: "Khung Chuyên gia", src: "/level-frame/frame-lv11-15.png", level: "Lv 11 - 15", minLevel: 11, maxLevel: 15 },
                { name: "Khung Huyền thoại", src: "/level-frame/frame-lv16-20.png", level: "Lv 16 - 20", minLevel: 16, maxLevel: 20 },
              ].map((frame, index) => {
                const isCurrentFrame = user.level >= frame.minLevel && user.level <= frame.maxLevel;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col items-center rounded-2xl p-6 border transition-all",
                      isCurrentFrame ? "bg-purple-50 border-purple-400 ring-2 ring-purple-200 shadow-md" : "bg-gray-50 border-gray-100 hover:border-purple-200 hover:bg-purple-50/50",
                    )}
                  >
                    <div className="w-24 h-24 mb-4 relative flex items-center justify-center drop-shadow-sm">
                      <img src={user.avatar || "https://ui-avatars.com/api/?name=User"} className="w-14 h-14 rounded-full object-cover" />
                      <img src={frame.src} alt={frame.name} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-center">{frame.name}</h4>
                    <p className="text-sm font-medium text-purple-600 mt-1">{frame.level}</p>
                    {isCurrentFrame && <div className="mt-3 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">Đang dùng</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RANKS TAB */}
        {activeTab === "ranks" && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Lộ Trình Cấp Bậc (Ranks)
            </h3>

            <div className="flex flex-col gap-8 relative">
              {/* Timeline line */}
              <div className="absolute left-[39px] md:left-[55px] top-4 bottom-4 w-1 bg-gray-100 rounded-full z-0 hidden sm:block"></div>

              {[
                { id: 1, name: "Bạc", src: "/rank/1.png", color: "text-gray-500", border: "border-gray-400", bg: "bg-gray-50", ring: "ring-gray-200", badge: "bg-gray-100 text-gray-700" },
                {
                  id: 2,
                  name: "Lục bảo",
                  src: "/rank/2.png",
                  color: "text-emerald-600",
                  border: "border-emerald-400",
                  bg: "bg-emerald-50",
                  ring: "ring-emerald-200",
                  badge: "bg-emerald-100 text-emerald-700",
                },
                { id: 3, name: "Tinh Anh", src: "/rank/3.png", color: "text-blue-600", border: "border-blue-400", bg: "bg-blue-50", ring: "ring-blue-200", badge: "bg-blue-100 text-blue-700" },
                {
                  id: 4,
                  name: "Kim Cương",
                  src: "/rank/4.png",
                  color: "text-indigo-600",
                  border: "border-indigo-400",
                  bg: "bg-indigo-50",
                  ring: "ring-indigo-200",
                  badge: "bg-indigo-100 text-indigo-700",
                },
                { id: 5, name: "Cao Thủ", src: "/rank/5.png", color: "text-rose-600", border: "border-rose-400", bg: "bg-rose-50", ring: "ring-rose-200", badge: "bg-rose-100 text-rose-700" },
              ].map((rankInfo, index) => {
                const rankData = rankConfig ? rankConfig[rankInfo.id] : null;
                // Sort tiers from lowest (highest number) to highest (lowest number)
                const tiersKeys = rankData?.tiers ? Object.keys(rankData.tiers).sort((a, b) => Number(b) - Number(a)) : [];
                const isCurrentRank = user.rankId === rankInfo.id;

                return (
                  <div key={index} className="relative z-10 flex flex-col sm:flex-row gap-6 md:gap-8 items-start">
                    <div
                      className={cn(
                        "w-20 h-20 md:w-28 md:h-28 shrink-0 rounded-2xl border-2 p-3 flex items-center justify-center drop-shadow-sm transition-all",
                        isCurrentRank ? `${rankInfo.bg} ${rankInfo.border} ring-4 ${rankInfo.ring} md:scale-110` : "bg-white border-gray-200",
                      )}
                    >
                      <img src={rankInfo.src} alt={rankInfo.name} className="w-full h-full object-contain drop-shadow-md hover:scale-110 transition-transform" />
                    </div>

                    <div
                      className={cn(
                        "flex-1 rounded-2xl p-5 md:p-6 border shadow-sm w-full transition-colors",
                        isCurrentRank ? `bg-white ${rankInfo.border} shadow-md ring-1 ${rankInfo.ring}` : "bg-white border-gray-100 hover:border-gray-300",
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 pb-4 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className={`text-xl font-bold ${rankInfo.color}`}>{rankInfo.name}</h4>
                            {isCurrentRank && <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded ${rankInfo.badge}`}>Hiện tại</span>}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Gồm {tiersKeys.length} bậc</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rankData && tiersKeys.map((tierKey) => {
                          const tier = rankData.tiers[tierKey];
                          const isCurrentTier = isCurrentRank && user.tier === Number(tierKey);

                          return (
                            <div
                              key={tierKey}
                              className={cn(
                                "rounded-xl p-4 border flex flex-col transition-all",
                                isCurrentTier ? `${rankInfo.bg} ${rankInfo.border} ring-2 ${rankInfo.ring} shadow-md` : "bg-gray-50 border-gray-100 hover:shadow-md hover:border-gray-300",
                              )}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className={cn("font-bold text-sm", isCurrentTier ? rankInfo.color : "text-gray-800")}>
                                  {rankInfo.name} {tierKey}
                                </span>
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded-md text-xs font-bold border shadow-sm",
                                    isCurrentTier ? "bg-white text-gray-900 border-gray-200" : "bg-white text-blue-600 border-blue-100",
                                  )}
                                >
                                  {tier.cefr}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mt-2 flex-1">
                                <span className="font-semibold text-gray-700 block mb-1">Chủ đề:</span>
                                <ul className="list-disc pl-4 space-y-1">
                                  {tier.data && tier.data.map((topic: any, i: number) => (
                                    <li key={i}>{topic.title}</li>
                                  ))}
                                </ul>
                              </div>
                              {isCurrentTier && <div className={`mt-3 self-start px-2 py-1 rounded text-xs font-bold ${rankInfo.badge}`}>Đang ở bậc này</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* Modal Hủy Kết Bạn */}
      <Modal isOpen={showUnfriendModal} onClose={() => setShowUnfriendModal(false)} title="Hủy kết bạn">
        <div className="p-6">
          <p className="text-gray-600 font-medium mb-6">
            Bạn có chắc chắn muốn hủy kết bạn với <strong className="text-gray-900">{user.name}</strong> không? Hai bạn sẽ không thể nhắn tin hay chia sẻ với nhau nữa.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowUnfriendModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              Hủy
            </button>
            <button
              onClick={handleUnfriend}
              disabled={isFriendLoading}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isFriendLoading ? "Đang xử lý..." : "Xóa bạn bè"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
