import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, Mic, BookOpen, PenTool, PlayCircle, Trophy, CheckCircle2, Circle } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import axiosInstance from "@/src/services/axiosConfig";
import toastService from "@/src/services/toastService";

const SKILLS = [
  {
    id: "listening",
    title: "Luyện Nghe",
    description: "Nghe chép chính tả và hiểu các đoạn hội thoại thực tế.",
    icon: <Headphones className="w-8 h-8" />,
    color: "bg-blue-500",
    lightColor: "bg-blue-100",
    textColor: "text-blue-500",
    level: "Cơ bản",
  },
  {
    id: "speaking",
    title: "Luyện Nói",
    description: "Luyện phát âm chuẩn AI và shadowing theo mẫu.",
    icon: <Mic className="w-8 h-8" />,
    color: "bg-green-500",
    lightColor: "bg-green-100",
    textColor: "text-green-500",
    level: "Cơ bản",
  },
  {
    id: "reading",
    title: "Luyện Đọc",
    description: "Đọc hiểu đoạn văn ngắn và tìm kiếm thông tin.",
    icon: <BookOpen className="w-8 h-8" />,
    color: "bg-purple-500",
    lightColor: "bg-purple-100",
    textColor: "text-purple-500",
    level: "Nâng cao",
  },
  {
    id: "writing",
    title: "Luyện Viết",
    description: "Sắp xếp từ thành câu và viết đoạn văn miêu tả.",
    icon: <PenTool className="w-8 h-8" />,
    color: "bg-orange-500",
    lightColor: "bg-orange-100",
    textColor: "text-orange-500",
    level: "Nâng cao",
  },
];

const PREFERENCES = [
  {
    id: "entertainment",
    title: "Entertainment (Giải trí)",
    desc: "Movies, TV shows, talk shows, songs.",
    benefit: "Phù hợp cho ai muốn học tiếng Anh một cách thoải mái, tự nhiên qua những nội dung yêu thích.",
  },
  {
    id: "academic",
    title: "Academic Listening (Học thuật)",
    desc: "IELTS/TOEIC practice tests, audiobooks, TED Talks.",
    benefit: "Dành cho người học tiếng Anh vì mục tiêu thi cử, học tập, nghiên cứu.",
  },
  {
    id: "daily",
    title: "Daily Life (Đời sống hàng ngày)",
    desc: "Vlogs về cooking, shopping, beauty, routines…",
    benefit: "Giúp người học làm quen với cách nói tiếng Anh trong ngữ cảnh đời thường.",
  },
  {
    id: "news",
    title: "News & Information (Tin tức & thông tin)",
    desc: "BBC News, VOA, News Reviews…",
    benefit: "Thích hợp cho ai muốn cập nhật tin tức thế giới đồng thời nâng cao kỹ năng nghe.",
  },
];

export function BeginnerSkills() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && (!user.listeningPreferences || user.listeningPreferences.length === 0)) {
      setShowModal(true);
    }
  }, [user]);

  const togglePref = (id: string) => {
    setSelectedPrefs((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (selectedPrefs.length === 0) {
      toastService.error("Vui lòng chọn ít nhất 1 sở thích!");
      return;
    }
    setIsSaving(true);
    try {
      await axiosInstance.put("/api/user/profile", {
        listeningPreferences: selectedPrefs,
      });
      updateUser({ listeningPreferences: selectedPrefs });
      setStep(2);
    } catch (err) {
      toastService.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-24 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden mt-8">
        <div className="z-10 text-center md:text-left space-y-4 max-w-lg">
          <h1 className="text-3xl font-black">Luyện tập 4 Kỹ Năng</h1>
          <p className="text-indigo-100 text-lg">Áp dụng ngay từ vựng và ngữ pháp bạn đã học vào 4 kỹ năng Nghe - Nói - Đọc - Viết để ghi nhớ sâu hơn.</p>
          <div className="flex items-center gap-3 justify-center md:justify-start bg-indigo-700/30 px-4 py-2 rounded-xl w-fit backdrop-blur-sm">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <span className="font-bold text-sm">Thử thách hằng ngày: 0/4 hoàn thành</span>
          </div>
        </div>
        <img src="/mascot/Lopy (1).png" alt="Mascot" className="w-44 h-44 object-contain z-10 mt-6 md:mt-0 animate-bounce-slow" />
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SKILLS.map((skill) => (
          <div
            key={skill.id}
            className="group bg-white rounded-3xl p-6 border-2 border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm", skill.lightColor, skill.textColor)}>{skill.icon}</div>
              <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{skill.level}</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{skill.title}</h3>
            <p className="text-slate-500 line-clamp-2 flex-1 mb-6">{skill.description}</p>

            <Button
              onClick={() => {
                if (skill.id === "listening") {
                  navigate("/beginner/listening");
                } else {
                  navigate(`/beginner/skill/${skill.id}`);
                }
              }}
              className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200 hover:border-indigo-200"
            >
              <PlayCircle className="w-5 h-5" /> Bắt đầu luyện
            </Button>
          </div>
        ))}
      </div>

      {/* Daily Challenge Banner */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
          <Trophy className="w-10 h-10 text-yellow-500" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-slate-800">Thử thách tổng hợp (Sắp ra mắt)</h3>
          <p className="text-slate-500 mt-1">Bài test 15 phút trộn lẫn cả 4 kỹ năng giúp bạn đánh giá toàn diện năng lực của mình.</p>
        </div>
        <Button disabled className="px-6 py-3 bg-slate-200 text-slate-400 rounded-2xl font-bold whitespace-nowrap cursor-not-allowed">
          Chưa mở khoá
        </Button>
      </div>

      <Modal isOpen={showModal} onClose={() => step === 2 && setShowModal(false)} hideCloseButton={step === 1}>
        {step === 1 ? (
          <div className="p-6">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Chọn nội dung bạn thích nghe</h2>
            <p className="text-slate-500 mb-6 text-sm">Zentask sẽ lưu lại sở thích của bạn để thiết kế các bài học phù hợp nhất! (Có thể chọn nhiều)</p>

            <div className="space-y-3 mb-8">
              {PREFERENCES.map((pref) => {
                const isSelected = selectedPrefs.includes(pref.id);
                return (
                  <div
                    key={pref.id}
                    onClick={() => togglePref(pref.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3",
                      isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-100 hover:border-indigo-200 bg-white",
                    )}
                  >
                    <div className="mt-1">{isSelected ? <CheckCircle2 className="w-5 h-5 text-indigo-600" /> : <Circle className="w-5 h-5 text-slate-300" />}</div>
                    <div>
                      <h3 className={cn("font-bold", isSelected ? "text-indigo-900" : "text-slate-800")}>{pref.title}</h3>
                      <p className="text-sm text-slate-500 my-1">{pref.desc}</p>
                      <p className="text-xs text-indigo-600 font-medium">=&gt; {pref.benefit}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg">
              {isSaving ? "Đang lưu..." : "Lưu và Tiếp tục"}
            </Button>
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">Mẹo nhỏ giúp bạn luyện nghe</h2>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <h3 className="font-bold text-red-700 mb-2">Sai lầm thường gặp khi luyện nghe</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Một sai lầm phổ biến (và mình cũng từng mắc phải) là chọn bài nghe quá khó so với trình độ hiện tại. Vì muốn “thử thách bản thân”, nhiều bạn tra hàng trăm từ vựng mỗi ngày nhưng lại
                  không áp dụng được trong nghe – nói. Kết quả là học xong thấy chán nản, không tiến bộ.
                </p>
                <p className="text-sm font-bold text-red-800 mt-2">👉 Bài học rút ra: hãy luyện nghe theo đúng trình độ của mình, và tăng độ khó từ từ.</p>
              </div>

              <div>
                <h3 className="font-bold text-indigo-900 mb-3 text-lg border-b pb-2">Listening Focus cho từng trình độ</h3>

                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Beginner (A1–A2)
                    </h4>
                    <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside ml-2">
                      <li>Nghe đi nghe lại các video đã dịch để tăng phản xạ.</li>
                      <li>Tập trung vào ý chính (main ideas) thay vì cố hiểu từng chi tiết.</li>
                      <li>Chú ý ngữ điệu, trọng âm, cách lên xuống giọng.</li>
                      <li>Học những mẫu câu thông dụng (daily expressions) để áp dụng ngay.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Intermediate (B1–B2)
                    </h4>
                    <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside ml-2">
                      <li>Nghe các đoạn hội thoại nhanh hơn.</li>
                      <li>Làm quen với idioms và slangs trong đời sống.</li>
                      <li>Phân biệt và luyện theo accent (US, UK, AUS).</li>
                      <li>Luyện kỹ năng context guessing: dựa vào ngữ cảnh, cử chỉ, biểu cảm để đoán nghĩa.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      Advanced (C1–C2)
                    </h4>
                    <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside ml-2">
                      <li>Tập trung vào fast speech (tốc độ tự nhiên, thậm chí nhanh).</li>
                      <li>Học idioms nâng cao, từ vựng chuyên ngành (law, business…).</li>
                      <li>Chú ý đến cultural jokes – câu chuyện cười, lối nói dí dỏm phản ánh văn hóa.</li>
                      <li>Mở rộng nhiều chủ đề khác nhau để xây dựng bản sắc ngôn ngữ riêng.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => setShowModal(false)} className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg">
              Đã hiểu và Bắt đầu luyện!
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
