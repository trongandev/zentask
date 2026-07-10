import { FileText } from "lucide-react";

export function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Điều khoản dịch vụ</h1>
            <p className="text-gray-500 mt-1">Cập nhật lần cuối: Tháng 7, 2026</p>
          </div>
        </div>
        
        <div className="space-y-8 text-gray-600 leading-relaxed text-lg">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Chấp nhận điều khoản</h2>
            <p>Bằng việc đăng ký và sử dụng Zentask, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu tại đây. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng dịch vụ.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Quyền và Trách nhiệm của người dùng</h2>
            <p>Bạn chịu trách nhiệm bảo mật thông tin tài khoản và mật khẩu của mình. Bạn cam kết không sử dụng ứng dụng vào mục đích vi phạm pháp luật, phát tán nội dung độc hại hoặc gây ảnh hưởng xấu đến cộng đồng người dùng khác.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Bản quyền nội dung</h2>
            <p>Toàn bộ tài liệu, bài giảng, bài kiểm tra và các nội dung khác trên Zentask thuộc sở hữu của chúng tôi hoặc các đối tác cung cấp nội dung. Bạn không được sao chép, phân phối hoặc sử dụng cho mục đích thương mại khi chưa có sự cho phép.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Thay đổi điều khoản</h2>
            <p>Chúng tôi có quyền sửa đổi các điều khoản này bất cứ lúc nào. Những thay đổi sẽ có hiệu lực ngay khi được đăng tải trên ứng dụng. Việc bạn tiếp tục sử dụng dịch vụ đồng nghĩa với việc chấp nhận các thay đổi đó.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
