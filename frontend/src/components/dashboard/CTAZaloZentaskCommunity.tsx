import { Link } from "react-router-dom";

export default function CTAZaloZentaskCommunity({ className }: { className?: string }) {
  return (
    <div className={`${className} bg-gradient-to-br from-[#0068FF] to-[#0052CC] rounded-2xl p-6 shadow-sm text-white relative overflow-hidden flex flex-col justify-center min-h-[160px]`}>
      <div className="relative z-10 w-2/3 lg:w-3/4">
        <h3 className="font-bold text-xl mb-2 font-heading">Cộng đồng ZenTask</h3>
        <p className="text-sm text-blue-100 mb-4 line-clamp-2">Tham gia Group Zalo để cùng học hỏi, nhận tài liệu và được hỗ trợ nhanh nhất nhé!</p>
        <Link
          to="https://zalo.me/g/vappqohaaewiockcc9zc"
          target="_blank"
          className="inline-block bg-white text-[#0068FF] font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-sm"
        >
          Tham gia ngay
        </Link>
      </div>
      <img src="/mascot/Lopy (9).png" className="absolute -right-4 -bottom-4 w-36 h-36 object-contain drop-shadow-xl" alt="Mascot" />
    </div>
  );
}
