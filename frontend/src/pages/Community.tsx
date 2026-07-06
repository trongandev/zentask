import { useState } from "react";
import { UserAvatar } from "../components/UserAvatar";
import { UserLevelBadge } from "../components/UserLevelBadge";
import { Heart, MessageSquare, Share2, MoreHorizontal, Send, Image as ImageIcon, Smile, Hash } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";

// Mock data
const INITIAL_POSTS = [
  {
    id: 1,
    user: {
      name: "Minh Anh",
      username: "@minhanh_study",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
      level: 15,
    },
    time: "2 giờ trước",
    content: "Chào mọi người, mình đang gặp chút khó khăn với việc phân biệt thì Hiện tại hoàn thành và Quá khứ đơn. Có ai có mẹo nào dễ nhớ không ạ? Cảm ơn nhiều! 😭😭",
    tags: ["#grammar", "#english", "#help"],
    likes: 24,
    comments: [
      {
        id: 1,
        user: { name: "Bảo Trâm", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop", level: 13 },
        content: "Quá khứ đơn là hành động đã chấm dứt hoàn toàn trong quá khứ (có thời gian rõ ràng như yesterday, last year). Hiện tại hoàn thành là hành động xảy ra trong quá khứ nhưng kết quả còn lưu tới hiện tại nha bạn ơi!",
        time: "1 giờ trước"
      }
    ],
    isLiked: false
  },
  {
    id: 2,
    user: {
      name: "Trần Tuấn",
      username: "@tuantran_99",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
      level: 8,
    },
    time: "5 giờ trước",
    content: "Cuối cùng cũng hoàn thành mục tiêu 100 ngày học liên tiếp trên Zentask! Cảm giác thật tuyệt vời. Mọi người cùng cố gắng nhé! 🔥🔥🚀",
    tags: ["#achievement", "#motivation"],
    likes: 156,
    comments: [],
    isLiked: true
  }
];

export function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [newPostContent, setNewPostContent] = useState("");
  const [activeCommentPost, setActiveCommentPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          isLiked: !post.isLiked
        };
      }
      return post;
    }));
  };

  const handlePostSubmit = () => {
    if (!newPostContent.trim()) return;

    const newPost = {
      id: Date.now(),
      user: {
        name: user?.displayName || "Bạn",
        username: "@" + (user?.email?.split('@')[0] || "user"),
        avatar: user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
        level: user?.level || 1,
      },
      time: "Vừa xong",
      content: newPostContent,
      tags: [],
      likes: 0,
      comments: [],
      isLiked: false
    };

    setPosts([newPost, ...posts]);
    setNewPostContent("");
  };

  const handleCommentSubmit = (postId: number) => {
    if (!commentText.trim()) return;

    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [
            ...post.comments,
            {
              id: Date.now(),
              user: { name: user?.displayName || "Bạn", avatar: user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop", level: user?.level || 1 },
              content: commentText,
              time: "Vừa xong"
            }
          ]
        };
      }
      return post;
    }));
    setCommentText("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Cộng đồng</h1>
          <p className="text-gray-500 font-medium">Kết nối, chia sẻ và học hỏi cùng hàng ngàn học viên khác.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm">
            {posts.length} Bài viết
          </div>
        </div>
      </div>

      {/* Create Post */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex gap-4">
          <UserAvatar src={user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"} level={user?.level || 1} className="w-12 h-12 flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <textarea
              placeholder="Bạn đang nghĩ gì? Cần giúp đỡ về ngữ pháp hay từ vựng?"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all min-h-[100px]"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-colors">
                  <Hash className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={handlePostSubmit}
                disabled={!newPostContent.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold rounded-xl transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Đăng bài
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
            {/* Post Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserAvatar src={post.user.avatar} level={post.user.level} className="w-12 h-12" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-gray-900">{post.user.name}</h3>
                    <UserLevelBadge level={post.user.level} size="sm" showText={false} />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <span>{post.user.username}</span>
                    <span>•</span>
                    <span>{post.time}</span>
                  </div>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Post Content */}
            <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map(tag => (
                  <span key={tag} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between py-3 border-y border-gray-100 mb-4">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => handleLike(post.id)}
                  className={cn(
                    "flex items-center gap-2 font-bold text-sm transition-colors",
                    post.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                  )}
                >
                  <Heart className={cn("w-5 h-5", post.isLiked && "fill-current")} />
                  {post.likes} <span className="hidden sm:inline">Thích</span>
                </button>
                <button 
                  onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                  className="flex items-center gap-2 text-gray-500 hover:text-blue-500 font-bold text-sm transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  {post.comments.length} <span className="hidden sm:inline">Bình luận</span>
                </button>
              </div>
              <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 font-bold text-sm transition-colors">
                <Share2 className="w-5 h-5" />
                <span className="hidden sm:inline">Chia sẻ</span>
              </button>
            </div>

            {/* Comments Section */}
            {activeCommentPost === post.id && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                {/* Existing Comments */}
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                  {post.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <UserAvatar src={comment.user.avatar} level={comment.user.level} className="w-8 h-8 flex-shrink-0 mt-1" />
                      <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-gray-900">{comment.user.name}</span>
                          <UserLevelBadge level={comment.user.level} size="sm" showText={false} />
                          <span className="text-[10px] font-medium text-gray-400 ml-auto">{comment.time}</span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {post.comments.length === 0 && (
                    <p className="text-sm text-center text-gray-500 py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex gap-3 pt-2">
                  <UserAvatar src={user?.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop"} level={user?.level || 1} className="w-8 h-8 flex-shrink-0" />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Viết bình luận..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-full py-2 pl-4 pr-10 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommentSubmit(post.id);
                      }}
                    />
                    <button 
                      onClick={() => handleCommentSubmit(post.id)}
                      disabled={!commentText.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 disabled:text-gray-300 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
