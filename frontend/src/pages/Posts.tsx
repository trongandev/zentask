import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "../components/ui/UserAvatar";
import { Calendar, Clock, ChevronRight, BookOpen, Star, Zap } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "@/src/components/ui/Button";

export const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "tips", label: "Kinh nghiệm học" },
  { id: "exam", label: "Kinh nghiệm thi" },
  { id: "news", label: "Tin tức Zentask" },
];

export const FEATURED_POST = {
  id: 1,
  title: "Bí kíp đạt điểm tuyệt đối trong bài kiểm tra TOEIC Reading",
  excerpt:
    "Khám phá những phương pháp làm bài và mẹo phân bổ thời gian hiệu quả nhất giúp bạn chinh phục phần thi TOEIC Reading dễ dàng hơn bao giờ hết. Chúng tôi đã tổng hợp từ kinh nghiệm của hơn 100 học viên xuất sắc.",
  category: "Kinh nghiệm thi",
  date: "12 Tháng 4, 2024",
  readTime: "5 phút đọc",
  image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop",
  author: {
    name: "Zentask Team",
    avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop",
    level: 99,
  },
};

export const POSTS = [
  {
    id: 2,
    title: "Lộ trình học từ vựng tiếng Anh cơ bản cho người mới bắt đầu",
    excerpt: "Bạn không biết bắt đầu học từ vựng từ đâu? Bài viết này sẽ cung cấp cho bạn một lộ trình 30 ngày để làm chủ 1000 từ vựng cơ bản nhất.",
    category: "Kinh nghiệm học",
    date: "10 Tháng 4, 2024",
    readTime: "4 phút đọc",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop",
    author: {
      name: "Zentask Team",
      avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop",
      level: 99,
    },
  },
  {
    id: 3,
    title: "Cập nhật tính năng mới: Thẻ lật thông minh với AI",
    excerpt: "Bản cập nhật tháng này mang đến công nghệ AI giúp bạn tạo thẻ lật tự động từ đoạn văn bản. Tìm hiểu ngay cách sử dụng!",
    category: "Tin tức Zentask",
    date: "05 Tháng 4, 2024",
    readTime: "3 phút đọc",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop",
    author: {
      name: "Zentask Team",
      avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop",
      level: 99,
    },
  },
  {
    id: 4,
    title: "5 lỗi ngữ pháp phổ biến người Việt hay mắc phải",
    excerpt: "Cùng điểm qua những lỗi sai cơ bản mà hầu hết người học tiếng Anh tại Việt Nam đều từng mắc phải và cách khắc phục triệt để.",
    category: "Kinh nghiệm học",
    date: "01 Tháng 4, 2024",
    readTime: "6 phút đọc",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop",
    author: {
      name: "Zentask Team",
      avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop",
      level: 99,
    },
  },
  {
    id: 5,
    title: "Cách duy trì động lực học tập mỗi ngày",
    excerpt: "Học ngôn ngữ là một chặng đường dài. Hãy cùng tìm hiểu các phương pháp khoa học giúp duy trì thói quen học tập bền vững.",
    category: "Kinh nghiệm học",
    date: "28 Tháng 3, 2024",
    readTime: "5 phút đọc",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600&auto=format&fit=crop",
    author: {
      name: "Zentask Team",
      avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop",
      level: 99,
    },
  },
];

export function Posts() {
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();

  const filteredPosts = activeCategory === "all" ? POSTS : POSTS.filter((post) => post.category === CATEGORIES.find((c) => c.id === activeCategory)?.label);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Kinh nghiệm học":
        return "text-blue-600 bg-blue-50";
      case "Kinh nghiệm thi":
        return "text-orange-600 bg-orange-50";
      case "Tin tức Zentask":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Kinh nghiệm học":
        return <BookOpen className="w-3 h-3" />;
      case "Kinh nghiệm thi":
        return <Star className="w-3 h-3" />;
      case "Tin tức Zentask":
        return <Zap className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full md:max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Bài viết & Chia sẻ</h1>
          <p className="text-lg text-gray-500 font-medium">Nơi tổng hợp những kinh nghiệm học tập, bí quyết luyện thi và thông tin mới nhất từ đội ngũ Zentask.</p>
        </div>
      </div>

      {/* Featured Post */}
      {activeCategory === "all" && (
        <div
          onClick={() => navigate(`/posts/${FEATURED_POST.id}`)}
          className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col lg:flex-row group cursor-pointer transition-all hover:shadow-md"
        >
          <div className="lg:w-1/2 relative overflow-hidden h-64 lg:h-auto">
            <img src={FEATURED_POST.image} alt={FEATURED_POST.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent lg:hidden" />
          </div>
          <div className="p-6 md:p-8 lg:p-10 lg:w-1/2 flex flex-col justify-center bg-white relative">
            <div className="flex items-center gap-2 mb-4">
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5", getCategoryColor(FEATURED_POST.category))}>
                {getCategoryIcon(FEATURED_POST.category)}
                {FEATURED_POST.category}
              </span>
              <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {FEATURED_POST.readTime}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">{FEATURED_POST.title}</h2>

            <p className="text-gray-600 mb-8 line-clamp-3 leading-relaxed">{FEATURED_POST.excerpt}</p>

            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar src={FEATURED_POST.author.avatar} level={FEATURED_POST.author.level} className="w-10 h-10" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{FEATURED_POST.author.name}</p>
                  <p className="text-xs text-gray-500 font-medium">{FEATURED_POST.date}</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map((category) => (
          <Button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all",
              activeCategory === category.id ? "bg-gray-900 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200",
            )}
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Post Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => navigate(`/posts/${post.id}`)}
            className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col group cursor-pointer hover:shadow-md transition-all"
          >
            <div className="relative h-48 overflow-hidden">
              <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute top-4 left-4">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm backdrop-blur-md",
                    post.category === "Kinh nghiệm học" ? "bg-blue-500/90 text-white" : post.category === "Kinh nghiệm thi" ? "bg-orange-500/90 text-white" : "bg-green-500/90 text-white",
                  )}
                >
                  {getCategoryIcon(post.category)}
                  {post.category}
                </span>
              </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">{post.title}</h3>

              <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed flex-1">{post.excerpt}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readTime}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có bài viết nào</h3>
          <p className="text-gray-500">Chưa có bài viết nào trong chuyên mục này. Hãy quay lại sau nhé!</p>
        </div>
      )}
    </div>
  );
}
