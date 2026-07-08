import { Diamond, ChevronRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Recommendations() {
  const navigate = useNavigate();

  const items = [
    {
      title: "Đấu trường",
      desc: "Thi đấu thời gian thực",
      path: "/arena",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-500 drop-shadow-md">
          <rect x="4" y="4" width="12" height="16" rx="2" fill="currentColor" fillOpacity="0.2" />
          <rect x="8" y="6" width="12" height="16" rx="2" fill="currentColor" />
          <path d="M11 14l2-2 2 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: "Bài thi",
      desc: "Kiểm tra kiến thức",
      path: "/quiz",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-500 drop-shadow-md">
          <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="3" y="5" width="14" height="16" rx="2" fill="currentColor" fillOpacity="0.2" />
          <rect x="5" y="7" width="14" height="16" rx="2" fill="currentColor" />
          <circle cx="10" cy="12" r="1.5" fill="white" />
          <line x1="13" y1="12" x2="16" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="10" cy="16" r="1.5" fill="white" />
          <line x1="13" y1="16" x2="16" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      title: "Ngữ pháp",
      desc: "Nắm vững lý thuyết",
      path: "/grammar",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-500 drop-shadow-md">
           <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" stroke="currentColor" fill="currentColor" fillOpacity="0.2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
           <line x1="8" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
           <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      title: "Cộng đồng",
      desc: "Học hỏi và chia sẻ",
      path: "/community",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-500 drop-shadow-md">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Diamond className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900 text-lg">Đề xuất cho bạn</h3>
        </div>
        <button className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors">
          Xem tất cả
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, idx) => (
          <div key={idx} onClick={() => navigate(item.path)} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 transition-colors shadow-sm hover:shadow-md flex flex-col group cursor-pointer">
            <h4 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{item.title}</h4>
            <p className="text-xs text-gray-500 mb-6">{item.desc}</p>
            
            <div className="flex items-end justify-between mt-auto">
              <button className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                Bắt đầu
                <Play className="w-3 h-3 fill-current" />
              </button>
              <div className="transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
