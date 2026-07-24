import { useParams, useNavigate } from "react-router-dom";
import { FEATURED_POST, POSTS } from "./Posts";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { UserAvatar } from "../components/ui/UserAvatar";
import { Button } from "@/src/components/ui/Button";

export function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find the post
  const postId = Number(id);
  const post = FEATURED_POST.id === postId ? FEATURED_POST : POSTS.find((p) => p.id === postId);

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Không tìm thấy bài viết</h1>
        <Button onClick={() => navigate("/posts")} className="text-blue-600 font-bold hover:underline">
          Quay lại danh sách bài viết
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <Button onClick={() => navigate("/posts")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Quay lại
      </Button>

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        <div className="w-full h-[400px] relative">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        </div>

        <div className="p-8 md:p-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-blue-50 text-blue-600">{post.category}</span>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Calendar className="w-4 h-4" />
              {post.date}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 leading-tight">{post.title}</h1>

          <div className="flex items-center gap-4 mb-10 pb-10 border-b border-gray-100">
            <UserAvatar src={post.author.avatar} level={post.author.level} className="w-12 h-12" />
            <div>
              <p className="text-base font-bold text-gray-900">{post.author.name}</p>
              <p className="text-sm text-gray-500 font-medium">Tác giả</p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
            <p className="text-xl font-medium text-gray-900 leading-relaxed mb-8">{post.excerpt}</p>
            <p>
              Đây là nội dung chi tiết giả lập cho bài viết. Trong thực tế, nội dung này sẽ được tải từ database chứa đầy đủ các đoạn văn, hình ảnh minh họa, trích dẫn, và các thành phần HTML khác.
            </p>
            <p>Việc duy trì thói quen học tập đóng vai trò rất quan trọng trong việc tiếp thu kiến thức mới. Hãy đặt ra các mục tiêu nhỏ mỗi ngày để đạt được kết quả lớn trong dài hạn.</p>
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 my-8">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Mẹo hay:</h3>
              <p className="text-blue-800 m-0">
                Sử dụng phương pháp Spaced Repetition (Lặp lại ngắt quãng) kết hợp với Flashcard sẽ giúp bạn ghi nhớ từ vựng lâu hơn gấp 3 lần so với cách học truyền thống.
              </p>
            </div>
            <p>Cuối cùng, đừng quên nghỉ ngơi hợp lý. Não bộ cần thời gian để tổng hợp và lưu trữ thông tin sau mỗi phiên học căng thẳng.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
