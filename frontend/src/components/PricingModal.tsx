import React from "react";
import { Check, Sparkles, Zap } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Link } from "react-router-dom";
import { Button } from "@/src/components/ui/Button";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl p-0 w-full" hideCloseButton>
      <div className="flex flex-col md:flex-row h-full">
        {/* Free Plan */}
        <div className="flex-1 p-8 bg-white md:border-r border-slate-100 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-800">Gói Miễn phí</h3>
            <p className="text-slate-500 mt-2 font-medium">Trải nghiệm các tính năng cơ bản</p>
          </div>
          <div className="text-4xl font-black text-slate-900 mb-8 flex items-baseline gap-1">
            0đ <span className="text-lg font-bold text-slate-400">/tháng</span>
          </div>
          <ul className="space-y-5 mb-8 flex-1">
            <FeatureItem text="Tạo Flashcard tối đa 30 từ/ngày" />
            <FeatureItem text="Tạo Quiz tối đa 3 bài/ngày" />
            <FeatureItem text="Tạo bài Ngữ pháp tối đa 2 lần/ngày" />
            <FeatureItem text="Tạo bài Các thì tối đa 2 lần/ngày" />
            <FeatureItem text="Đăng Community tối đa 2 bài/ngày" />
          </ul>

          <Button onClick={onClose} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all">
            Tiếp tục miễn phí
          </Button>
        </div>

        {/* Pro Plan */}
        <div className="flex-1 p-8 bg-gradient-to-br from-blue-600 to-indigo-800 text-white relative overflow-hidden flex flex-col justify-center">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
            <Sparkles className="w-64 h-64 text-blue-200" />
          </div>
          <div className="absolute -bottom-10 -left-10 opacity-20 pointer-events-none blur-3xl bg-blue-400 w-64 h-64 rounded-full" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 text-blue-50 text-sm font-bold mb-6 border border-white/20 backdrop-blur-md shadow-sm">
              <Zap className="w-4 h-4 text-yellow-300" fill="currentColor" /> Khuyên dùng
            </div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-black text-white tracking-tight">Gói Pro</h3>
                <p className="text-blue-100 mt-2 font-medium text-lg">Mở khóa toàn bộ tiềm năng học tập</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400/30 blur-xl rounded-full"></div>
                <img src="/mascot/Lopy (16).png" className="relative w-28 h-28 object-contain drop-shadow-2xl hover:scale-110 transition-transform origin-bottom" alt="Lopy Mascot" />
              </div>
            </div>

            <div className="text-5xl font-black text-white mb-8 flex items-baseline gap-1">
              30k <span className="text-xl font-bold text-blue-200">/tháng</span>
            </div>
            <ul className="space-y-5 mb-10">
              <FeatureItem text="Tạo Flashcard tối đa 150 từ/ngày" pro />
              <FeatureItem text="Tạo Quiz tối đa 15 bài/ngày" pro />
              <FeatureItem text="Tạo bài cá nhân hóa Ngữ pháp tối đa 10 lần/ngày" pro />
              <FeatureItem text="Tạo bài cá nhân hóa Các thì tối đa 10 lần/ngày" pro />
              <FeatureItem text="Đăng Community tối đa 10 bài/ngày" pro />
            </ul>

            <Link to={"https://zalo.me/g/vappqohaaewiockcc9zc"} target="_blank">
              <Button className="w-full py-4 bg-white hover:bg-blue-50 text-blue-700 cursor-pointer font-black text-lg rounded-2xl shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] transform hover:-translate-y-0.5">
                Nâng cấp ngay
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FeatureItem({ text, pro = false }: { text: string; pro?: boolean }) {
  return (
    <li className="flex items-center gap-4">
      <div className={`shrink-0 rounded-full p-1.5 ${pro ? "bg-white/20 text-white backdrop-blur-sm" : "bg-emerald-100 text-emerald-600"}`}>
        <Check className="w-4 h-4" strokeWidth={3} />
      </div>
      <span className={`text-base font-semibold ${pro ? "text-blue-50" : "text-slate-700"}`}>{text}</span>
    </li>
  );
}
