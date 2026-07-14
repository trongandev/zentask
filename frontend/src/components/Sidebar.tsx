import { cn } from "../lib/utils";
import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { PricingModal } from "./PricingModal";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  Copy,
  HelpCircle,
  BookOpen,
  Clock,
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
      items: [{ icon: Home, label: "Tổng quan", to: "/" }],
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
      label: "CỐT LÕI",
      items: [
        { icon: BookOpen, label: "Ngữ pháp", to: "/grammar" },
        { icon: Clock, label: "Thì", to: "/tenses" },
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
      <Link to="/" className={cn("p-6 flex items-center", isOpen ? "gap-3" : "justify-center px-4")}>
        <img src="/logo.png" className={cn("flex-shrink-0", isOpen ? "w-10" : "w-10")} alt="Logo" />
        {isOpen && (
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-blue-600 tracking-tight font-heading">Zentask</h1>
            <p className="text-[10px] text-gray-500 font-medium truncate">Học tập hiệu quả hơn mỗi ngày</p>
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
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover/label:text-blue-500 transition-colors">{group.label}</h2>
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isCollapsed ? "-rotate-90" : "")} />
                </div>
              )}
              {!isOpen && group.label && <div className="w-8 h-px bg-gray-200 mx-auto my-4"></div>}
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
                            "flex items-center rounded-xl font-medium transition-colors",
                            isOpen ? "gap-3 px-3 py-2.5 text-sm" : "justify-center p-3",
                            isActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className={cn("flex-shrink-0", isOpen ? "w-5 h-5" : "w-6 h-6", isActive ? "text-blue-600" : "text-gray-400")} />
                            {isOpen && <span>{item.label}</span>}
                          </>
                        )}
                      </NavLink>
                      {!isOpen && (
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover/nav:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl">
                          {item.label}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-r-gray-900"></div>
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
            <div onClick={() => setIsPricingModalOpen(true)} className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 hover:border-blue-200 transition-colors cursor-pointer group">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <img src="/etc/upgrade.png" className="w-9" />
                  <h3 className="text-sm font-bold text-blue-900">Nâng cấp Pro</h3>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-blue-700/80 leading-relaxed">Mở khóa mọi tính năng và học không giới hạn</p>
            </div>
            <CTAZaloZentaskCommunity className="mt-5" />
          </>
        ) : (
          <button onClick={onToggle} className="hidden lg:block p-4 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
            {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
        )}
      </div>

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </aside>
  );
}
