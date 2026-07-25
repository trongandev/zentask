import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

const SKILLS_MAP: Record<string, string> = {
  listening: "Luyện Nghe",
  speaking: "Luyện Nói",
  reading: "Luyện Đọc",
  writing: "Luyện Viết",
};

export function BeginnerSkillComingSoon() {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const skillName = skillId && SKILLS_MAP[skillId] ? SKILLS_MAP[skillId] : "Kỹ Năng";

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full flex justify-start mb-8">
        <Button onClick={() => navigate("/beginner/skills")} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent shadow-none hover:bg-slate-100 border-none">
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-8 md:p-12 border-2 border-indigo-100 shadow-xl w-full flex flex-col items-center">
        <img src="/mascot/Lopy (10).png" alt="Mascot" className="w-40 h-40 object-contain mb-6 animate-bounce-slow" />
        
        <h1 className="text-3xl font-black text-slate-800 mb-4">
          {skillName}
        </h1>
        
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 text-indigo-900 text-lg leading-relaxed">
          <p className="font-medium">
            Tính năng này đang được bổ sung, bạn vui lòng chờ.
          </p>
          <p className="mt-2">
            Bạn có thể tham gia cộng đồng zalo để được kết nối cùng nhau, học tập chia sẻ dễ dàng, cũng như gửi tâm thư feedback về trang web nhé!
          </p>
        </div>

        <Link to="https://zalo.me/g/vappqohaaewiockcc9zc" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-[#0068FF] hover:bg-[#0054cc] text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3 text-lg">
            <MessageCircle className="w-6 h-6" />
            Tham gia Cộng đồng Zalo
          </Button>
        </Link>
      </div>
    </div>
  );
}
