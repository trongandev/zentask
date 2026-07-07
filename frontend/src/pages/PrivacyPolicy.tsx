import { Shield } from "lucide-react";

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Chính sách bảo mật</h1>
            <p className="text-gray-500 mt-1">Cập nhật lần cuối: Tháng 7, 2026</p>
          </div>
        </div>
        
        <div className="space-y-8 text-gray-600 leading-relaxed text-lg">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Thu thập thông tin</h2>
            <p>Chúng tôi thu thập thông tin cá nhân của bạn khi bạn đăng ký tài khoản, sử dụng các dịch vụ của Zentask, bao gồm tên, địa chỉ email, và các thông tin liên quan đến quá trình học tập của bạn.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Sử dụng thông tin</h2>
            <p>Thông tin của bạn được sử dụng để cá nhân hóa trải nghiệm học tập, cải thiện dịch vụ, và liên lạc với bạn về các cập nhật, thông báo hoặc các vấn đề liên quan đến tài khoản.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Bảo vệ dữ liệu</h2>
            <p>Chúng tôi áp dụng các biện pháp an ninh nghiêm ngặt để bảo vệ dữ liệu cá nhân của bạn khỏi việc truy cập, thay đổi, hoặc phá hoại không được phép.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Chia sẻ thông tin</h2>
            <p>Zentask cam kết không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba. Chúng tôi chỉ chia sẻ thông tin khi có yêu cầu hợp pháp từ cơ quan chức năng hoặc để bảo vệ quyền lợi của ứng dụng.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
