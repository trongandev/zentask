import { cn } from "../lib/utils";
import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { PricingModal } from "./PricingModal";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  Copy,
  HelpCircle,
  Trophy,
  Globe,
  FileText,
  ChevronRight,
  ChevronDown,
  PanelLeftOpen,
  PanelLeftClose,
  ShieldAlert,
  MountainSnow,
  // Diamond,
  // Users,
  // MessageCircle,
  // NotebookPen,
  // Wrench,
  UserRoundPlus,
} from "lucide-react";
import CTAZaloZentaskCommunity from "./dashboard/CTAZaloZentaskCommunity";
import { Button } from "@/src/components/ui/Button";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("sidebarCollapsedGroups");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      "NHÓM HỌC TẬP": false,
      "CỐT LÕI": false,
      "CỘNG ĐỒNG": true,
      "CÔNG CỤ": true,
    };
  });

  const toggleGroup = (label: string) => {
    if (!label) return;
    setCollapsedGroups((prev) => {
      const newState = {
        ...prev,
        [label]: !prev[label],
      };
      localStorage.setItem("sidebarCollapsedGroups", JSON.stringify(newState));
      return newState;
    });
  };

  const menuGroups = [
    {
      label: "",
      items: [{ icon: Home, label: "Tổng quan", to: "/dashboard" }],
    },
    {
      label: "NHÓM HỌC TẬP",
      items: [
        { icon: MountainSnow, label: "Người mới bắt đầu", to: "/beginner" },
        { icon: Copy, label: "Thẻ lật", to: "/flashcards" },
        { icon: HelpCircle, label: "Trắc nghiệm nhanh", to: "/quiz" },
      ],
    },
    {
      label: "CỘNG ĐỒNG",
      items: [
        { icon: Trophy, label: "Bảng xếp hạng", to: "/leaderboard" },
        { icon: Globe, label: "Cộng đồng", to: "/community" },
        { icon: UserRoundPlus, label: "Bạn bè", to: "/friends" },
        { icon: FileText, label: "Bài viết", to: "/posts" },
      ],
    },
    // {
    //   label: "CÔNG CỤ",
    //   items: [
    //     { icon: MessageCircle, label: "Trợ lý AI", to: "/ai-chat" },
    //     { icon: NotebookPen, label: "Sổ tay", to: "/notebook" },
    //     { icon: Wrench, label: "Tiện ích", to: "/utilities" },
    //   ],
    // },
  ];

  if (user?.role === "admin") {
    menuGroups.push({
      label: "HỆ THỐNG",
      items: [{ icon: ShieldAlert, label: "Quản trị viên", to: "/admin" }],
    });
  }

  return (
    <aside className={cn("w-full bg-white h-full flex flex-col border-r border-gray-100 overflow-y-auto")}>
      {/* Logo */}
      <Link to="/" className={cn("p-6 flex items-center transition-opacity hover:opacity-80", isOpen ? "gap-3" : "justify-center px-4")}>
        <img src="/logo.png" className={cn("flex-shrink-0 drop-shadow-sm", isOpen ? "w-10" : "w-10")} alt="Logo" />
        {isOpen && (
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight font-heading">Zentask</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate mt-0.5">Learn better</p>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav className={cn("flex-1 pb-6 space-y-6 mt-2", isOpen ? "px-4" : "px-3")}>
        {menuGroups.map((group, idx) => {
          const isCollapsed = collapsedGroups[group.label] || false;
          return (
            <div key={idx}>
              {isOpen && group.label && (
                <div className="flex items-center justify-between mb-3 px-3 cursor-pointer group/label" onClick={() => toggleGroup(group.label)}>
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/label:text-slate-600 transition-colors">{group.label}</h2>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isCollapsed ? "-rotate-90" : "")} />
                </div>
              )}
              {!isOpen && group.label && <div className="w-8 h-px bg-slate-200 mx-auto my-4"></div>}
              <ul className={cn("space-y-1.5", isOpen && isCollapsed ? "hidden" : "block")}>
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <li key={itemIdx} className="relative group/nav">
                      <NavLink
                        to={item.to}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center rounded-2xl font-bold transition-all border-2",
                            isOpen ? "gap-3 px-3 py-2.5 text-sm" : "justify-center p-3",
                            isActive ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className={cn("flex-shrink-0", isOpen ? "w-5 h-5" : "w-6 h-6", isActive ? "text-blue-600" : "text-slate-400")} />
                            {isOpen && <span>{item.label}</span>}
                          </>
                        )}
                      </NavLink>
                      {!isOpen && (
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover/nav:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl">
                          {item.label}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-r-slate-900"></div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 mt-auto">
        {isOpen ? (
          <>
            {user?.isVip ? (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-5 border-2 border-amber-200 shadow-sm" onClick={() => setIsPricingModalOpen(true)}>
                <div className="flex items-center gap-2 mb-2">
                  <img src="/etc/upgrade.png" className="w-9 h-9 object-contain drop-shadow-sm" alt="VIP" />
                  <h3 className="text-sm font-black text-amber-900">VIP Member</h3>
                </div>
                <p className="text-xs text-amber-700/90 leading-relaxed font-bold">
                  {user?.vipUntil ? `Hết hạn: ${new Date(user.vipUntil).toLocaleDateString("vi-VN")}` : "Thành viên VIP trọn đời"}
                </p>
              </div>
            ) : (
              <div onClick={() => setIsPricingModalOpen(true)} className="bg-white rounded-3xl p-5 border-2 border-slate-100 border-b-4 hover:border-blue-300 hover:-translate-y-1 hover:shadow-xl active:border-b-2 active:translate-y-1 transition-all cursor-pointer group">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <img src="/etc/upgrade.png" className="w-9" />
                    <h3 className="text-sm font-black text-slate-800">Nâng cấp Pro</h3>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Mở khóa mọi tính năng và học không giới hạn</p>
              </div>
            )}
            <CTAZaloZentaskCommunity className="mt-5" />
          </>
        ) : (
          <Button onClick={onToggle} className="hidden lg:block p-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors">
            {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </Button>
        )}
      </div>

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} isVip={user?.isVip} />
    </aside>
  );
}
