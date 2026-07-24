import { useState, useEffect } from "react";
import { UserAvatar } from "../components/ui/UserAvatar";
import { UserLevelBadge } from "@/src/components/ui/UserLevelBadge";
import { Heart, MessageSquare, Share2, MoreHorizontal, Send, Image as ImageIcon, Smile, Hash, Edit2, Trash2, X, CornerDownRight } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useCommunityStore, Post as ApiPost, Comment as ApiComment } from "../services/communityService";
import DOMPurify from "dompurify";
import { RichTextEditor } from "../components/RichTextEditor";
import toastService from "@/src/services/toastService";
import { SEO } from "../components/SEO";
import { Button } from "@/src/components/ui/Button";
import { Textarea } from "@/src/components/ui/Textarea";
import { Input } from "@/src/components/ui/Input";

// Cấu hình DOMPurify để chặn các thẻ và style độc hại
DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if (data.attrName === "style") {
    // Chỉ cho phép color và font-size (từ Tiptap config của bạn)
    const allowedProps = ["color", "font-size"];
    const styles = data.attrValue
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    const safeStyles = styles.filter((style) => {
      const prop = style.split(":")[0].trim().toLowerCase();
      return allowedProps.includes(prop);
    });

    if (safeStyles.length > 0) {
      data.attrValue = safeStyles.join("; ");
    } else {
      data.keepAttr = false; // Xóa luôn thuộc tính style nếu không có gì hợp lệ
    }
  }
});

const sanitizeConfig = {
  // Chỉ cho phép các thẻ bạn dùng trong Tiptap
  ALLOWED_TAGS: ["p", "strong", "b", "i", "em", "s", "strike", "ul", "ol", "li", "span", "br"],
  // Chỉ cho phép thuộc tính style và class (nếu có dùng class)
  ALLOWED_ATTR: ["style", "class"],
};

function timeAgo(dateInput: any) {
  if (!dateInput) return "Vừa xong";
  const date = dateInput._seconds ? new Date(dateInput._seconds * 1000) : new Date(dateInput);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " năm trước";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " tháng trước";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " ngày trước";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " giờ trước";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " phút trước";
  return "Vừa xong";
}

const extractTags = (html: string) => {
  const text = html.replace(/<[^>]+>/g, " ");
  const matches = text.match(/#[\wÀ-ỹ]+/g);
  return matches ? matches.map((tag) => tag.toLowerCase()) : [];
};

export function Community() {
  const { user } = useAuth();
  const { posts, loading, getPosts, createPost, togglePostLike, deletePost, updatePost, getComments, createComment, toggleCommentLike, updateComment } = useCommunityStore();

  const [newPostContent, setNewPostContent] = useState(() => localStorage.getItem("community_draft") || "");
  const [showEditor, setShowEditor] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentsMap, setCommentsMap] = useState<Record<string, ApiComment[]>>({});

  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    localStorage.setItem("community_draft", newPostContent);
  }, [newPostContent]);

  const fetchPosts = async () => {
    await getPosts(filterTag || undefined);
  };

  useEffect(() => {
    fetchPosts();
  }, [filterTag, getPosts]);

  const handleLike = async (postId: string) => {
    if (!user) return toastService.error("Vui lòng đăng nhập");
    // The optimistic update would require us to manipulate store's state,
    // For simplicity, we just toggle and re-fetch if needed.
    const res = await togglePostLike(postId);
    if (res) {
      getPosts(filterTag || undefined, true);
    }
  };

  const handlePostSubmit = async () => {
    if (!newPostContent.trim()) return;

    // Validate length >= 50 chars (ignore HTML tags)
    const plainText = newPostContent
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (plainText.length < 50) {
      toastService.error("Bài viết phải có ít nhất 50 ký tự");
      return;
    }

    const tags = extractTags(newPostContent);
    const res = await createPost(newPostContent, tags);
    if (res) {
      setNewPostContent("");
      setShowEditor(false);
      localStorage.removeItem("community_draft");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài đăng này?")) return;
    await deletePost(postId);
    setActiveMenuId(null);
  };

  const startEditPost = (post: ApiPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setActiveMenuId(null);
  };

  const submitEditPost = async () => {
    if (!editingPostId || !editContent.trim()) return;
    const tags = extractTags(editContent);
    const res = await updatePost(editingPostId, editContent, tags);
    if (res) {
      setEditingPostId(null);
      setEditContent("");
    }
  };

  const fetchCommentsForPost = async (postId: string) => {
    const comments = await getComments(postId);
    setCommentsMap((prev) => ({ ...prev, [postId]: comments }));
  };

  const toggleCommentSection = async (postId: string) => {
    if (activeCommentPost === postId) {
      setActiveCommentPost(null);
    } else {
      setActiveCommentPost(postId);
      if (!commentsMap[postId]) {
        await fetchCommentsForPost(postId);
      }
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!commentText.trim() || !user) return;
    const res = await createComment(postId, commentText, replyingToCommentId || undefined);
    if (res) {
      setCommentText("");
      setReplyingToCommentId(null);
      await fetchCommentsForPost(postId);
      getPosts(filterTag || undefined, true);
    }
  };

  const handleCommentLike = async (postId: string, commentId: string) => {
    if (!user) return toastService.error("Vui lòng đăng nhập");
    const res = await toggleCommentLike(commentId);
    if (res) {
      await fetchCommentsForPost(postId);
    }
  };

  const handleCommentEditSubmit = async (postId: string) => {
    if (!editingCommentId || !editCommentContent.trim()) return;
    const res = await updateComment(editingCommentId, editCommentContent);
    if (res) {
      setEditingCommentId(null);
      setEditCommentContent("");
      await fetchCommentsForPost(postId);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
      <SEO title="Cộng đồng học tập" description="Tham gia cộng đồng học viên Zentask để thảo luận, chia sẻ kinh nghiệm học tiếng Anh." />
      {/* Main Feed */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Cộng đồng</h1>
            <p className="text-gray-500 font-medium">Kết nối, chia sẻ và học hỏi cùng hàng ngàn học viên khác.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm">{posts.length} Bài viết</div>
          </div>
        </div>

        {filterTag && (
          <div className="flex items-center justify-between bg-blue-50 text-blue-800 p-4 rounded-xl">
            <div className="font-bold flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Đang lọc theo: <span className="text-blue-600">{filterTag}</span>
            </div>
            <Button onClick={() => setFilterTag(null)} className="p-1 hover:bg-blue-100 rounded-full transition">
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Create Post */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex gap-4">
            <UserAvatar
              src={user?.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg"}
              level={user?.level || 1}
              className="w-12 h-12 flex-shrink-0"
              uid={user?.uid}
            />
            <div className="flex-1 space-y-4">
              {!showEditor && !newPostContent.trim() ? (
                <Textarea
                  placeholder="Bạn đang nghĩ gì? Cần giúp đỡ về ngữ pháp hay từ vựng? Thêm hashtag với ký tự # (VD: #grammar)"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all min-h-[50px] cursor-text"
                  onFocus={() => setShowEditor(true)}
                  readOnly
                  rows={2}
                  value=""
                />
              ) : (
                <div
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node) && !newPostContent.trim()) {
                      setShowEditor(false);
                    }
                  }}
                  tabIndex={-1}
                >
                  <RichTextEditor
                    content={newPostContent}
                    onChange={setNewPostContent}
                    placeholder="Bạn đang nghĩ gì? Cần giúp đỡ về ngữ pháp hay từ vựng? Thêm hashtag với ký tự # (VD: #grammar)"
                    minHeight="100px"
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors cursor-not-allowed opacity-50" title="Chưa hỗ trợ ảnh">
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                  <Button className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition-colors">
                    <Smile className="w-5 h-5" />
                  </Button>
                </div>
                <Button
                  onClick={handlePostSubmit}
                  disabled={!newPostContent.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Đăng bài
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {loading && posts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Đang tải...</div>
          ) : posts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Không có bài đăng nào.</div>
          ) : (
            posts.map((post) => {
              const isLiked = user ? post.likes.includes(user.uid) : false;
              const isOwnPost = user?.uid === post.user.uid;

              return (
                <div key={post.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-4 relative">
                    <div className="flex items-center gap-3">
                      <UserAvatar src={post.user.avatar} level={post.user.level} uid={post.user.uid} className="w-12 h-12" />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-gray-900">{post.user.name}</h3>
                          <UserLevelBadge level={post.user.level} size="sm" showText={false} />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                          <span>{post.user.username}</span>
                          <span>•</span>
                          <span>{timeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {isOwnPost && (
                      <div className="relative">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === post.id ? null : post.id);
                          }}
                          className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                        {activeMenuId === post.id && (
                          <div className="absolute right-0 top-10 bg-white border border-gray-100 shadow-xl rounded-xl w-40 py-2 z-50">
                            <Button onClick={() => startEditPost(post)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 font-medium">
                              <Edit2 className="w-4 h-4" /> Sửa
                            </Button>
                            <Button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 font-medium">
                              <Trash2 className="w-4 h-4" /> Xóa
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  {editingPostId === post.id ? (
                    <div className="mb-4 space-y-3">
                      <RichTextEditor content={editContent} onChange={setEditContent} minHeight="100px" />
                      <div className="flex gap-2 justify-end">
                        <Button onClick={() => setEditingPostId(null)} className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-50 rounded-lg">
                          Hủy
                        </Button>
                        <Button onClick={submitEditPost} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg">
                          Lưu
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-4 break-words" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, sanitizeConfig) }} />
                  )}

                  {/* Tags */}
                  {post.tags.length > 0 && !editingPostId && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={() => setFilterTag(tag)}
                          className="cursor-pointer text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {user ? (
                    <div className="flex items-center justify-between py-3 border-y border-gray-100 mb-4">
                      <div className="flex items-center gap-6">
                        <Button
                          onClick={() => handleLike(post.id)}
                          className={cn("flex items-center gap-2 font-bold text-sm transition-colors", isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500")}
                        >
                          <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                          {post.likes.length} <span className="hidden sm:inline">Thích</span>
                        </Button>
                        <Button onClick={() => toggleCommentSection(post.id)} className="flex items-center gap-2 text-gray-500 hover:text-blue-500 font-bold text-sm transition-colors">
                          <MessageSquare className="w-5 h-5" />
                          {post.commentsCount} <span className="hidden sm:inline">Bình luận</span>
                        </Button>
                      </div>
                      <Button className="flex items-center gap-2 text-gray-500 hover:text-green-500 font-bold text-sm transition-colors">
                        <Share2 className="w-5 h-5" />
                        <span className="hidden sm:inline">Chia sẻ</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-3 border-y border-gray-100 mb-4 text-gray-500 text-sm">Vui lòng đăng nhập để tương tác</div>
                  )}

                  {/* Comments Section */}
                  {activeCommentPost === post.id && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="space-y-4 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                        {(commentsMap[post.id] || []).map((comment) => {
                          const isCommentLiked = comment.likes.includes(user?.uid || "");
                          const isOwnComment = comment.user.uid === user?.uid;

                          return (
                            <div key={comment.id} className="flex gap-3">
                              <UserAvatar src={comment.user.avatar} level={comment.user.level} uid={comment.user.uid} className="w-8 h-8 flex-shrink-0 mt-1" />
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-gray-900">{comment.user.name}</span>
                                    {comment.parentId && (
                                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                                        <CornerDownRight className="w-3 h-3" /> Reply
                                      </span>
                                    )}
                                    <UserLevelBadge level={comment.user.level} size="sm" showText={false} />
                                    <span className="text-[10px] font-medium text-gray-400 ml-auto">{timeAgo(comment.createdAt)}</span>
                                  </div>

                                  {editingCommentId === comment.id ? (
                                    <div className="mt-2 space-y-2">
                                      <Input
                                        type="text"
                                        value={editCommentContent}
                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <Button onClick={() => setEditingCommentId(null)} className="text-xs font-bold text-gray-500 hover:text-gray-700">
                                          Hủy
                                        </Button>
                                        <Button onClick={() => handleCommentEditSubmit(post.id)} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                                          Lưu
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-700">{comment.content}</p>
                                  )}
                                </div>

                                {/* Comment Actions */}
                                {!editingCommentId && (
                                  <div className="flex items-center gap-4 mt-1 ml-2">
                                    <Button
                                      onClick={() => handleCommentLike(post.id, comment.id)}
                                      className={cn("text-[11px] font-bold transition-colors flex items-center gap-1", isCommentLiked ? "text-red-500" : "text-gray-500 hover:text-gray-700")}
                                    >
                                      Thích {comment.likes.length > 0 && `(${comment.likes.length})`}
                                    </Button>
                                    <Button onClick={() => setReplyingToCommentId(comment.id)} className="text-[11px] font-bold text-gray-500 hover:text-gray-700 transition-colors">
                                      Trả lời
                                    </Button>
                                    {isOwnComment && (
                                      <Button
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditCommentContent(comment.content);
                                        }}
                                        className="text-[11px] font-bold text-gray-500 hover:text-blue-500 transition-colors"
                                      >
                                        Sửa
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {commentsMap[post.id]?.length === 0 && <p className="text-sm text-center text-gray-500 py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>}
                      </div>

                      {/* Add Comment */}
                      <div className="flex gap-3 pt-2">
                        <UserAvatar
                          src={user?.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg"}
                          level={user?.level || 1}
                          className="w-8 h-8 flex-shrink-0"
                          uid={user?.uid}
                        />
                        <div className="flex-1 relative flex flex-col gap-2">
                          {replyingToCommentId && (
                            <div className="flex items-center justify-between bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg w-fit">
                              <span className="flex items-center gap-1">
                                <CornerDownRight className="w-3 h-3" /> Đang trả lời bình luận
                              </span>
                              <Button onClick={() => setReplyingToCommentId(null)} className="ml-2 hover:text-blue-900">
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Viết bình luận..."
                              className="w-full bg-gray-50 border border-gray-100 rounded-full py-2 pl-4 pr-10 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCommentSubmit(post.id);
                              }}
                            />
                            <Button
                              onClick={() => handleCommentSubmit(post.id)}
                              disabled={!commentText.trim()}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 disabled:text-gray-300 transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar for Tags */}
      <div className="w-full md:w-64 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-500" />
            Chủ đề nổi bật
          </h3>
          <div className="flex flex-wrap gap-2">
            {["#grammar", "#english", "#help", "#achievement", "#motivation"].map((tag) => (
              <Button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all", filterTag === tag ? "bg-blue-600 text-white shadow-md" : "bg-gray-50 text-gray-600 hover:bg-gray-100")}
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
