import { create } from "zustand";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_BACKEND;

export interface UserSnippet {
  uid: string;
  name: string;
  username?: string;
  avatar: string;
  level: number;
}

export interface Post {
  id: string;
  content: string;
  tags: string[];
  likes: string[];
  commentsCount: number;
  createdAt: any;
  user: UserSnippet;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  likes: string[];
  createdAt: any;
  user: UserSnippet;
}

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

interface CommunityState {
  loading: boolean;
  posts: Post[];
  
  getPosts: (tags?: string) => Promise<Post[]>;
  createPost: (content: string, tags: string[]) => Promise<any | null>;
  updatePost: (id: string, content: string, tags: string[]) => Promise<any | null>;
  deletePost: (id: string) => Promise<any | null>;
  togglePostLike: (id: string) => Promise<any | null>;
  
  getComments: (postId: string) => Promise<Comment[]>;
  createComment: (postId: string, content: string, parentId?: string) => Promise<any | null>;
  toggleCommentLike: (commentId: string) => Promise<any | null>;
  updateComment: (commentId: string, content: string) => Promise<any | null>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  loading: false,
  posts: [],

  getPosts: async (tags?: string) => {
    set({ loading: true });
    try {
      const url = tags ? `/community/posts?tags=${tags}` : `/community/posts`;
      const data = await fetchApi(url);
      set({ posts: data, loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return [];
    }
  },

  createPost: async (content: string, tags: string[]) => {
    set({ loading: true });
    try {
      const result = await fetchApi("/community/posts", {
        method: "POST",
        body: JSON.stringify({ content, tags }),
      });
      // Optionally re-fetch posts
      get().getPosts();
      toast.success("Đăng bài thành công");
      set({ loading: false });
      return result;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  updatePost: async (id: string, content: string, tags: string[]) => {
    set({ loading: true });
    try {
      const result = await fetchApi(`/community/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ content, tags }),
      });
      get().getPosts();
      toast.success("Cập nhật bài viết thành công");
      set({ loading: false });
      return result;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  deletePost: async (id: string) => {
    set({ loading: true });
    try {
      const result = await fetchApi(`/community/posts/${id}`, {
        method: "DELETE",
      });
      set((state) => ({ posts: state.posts.filter((p) => p.id !== id), loading: false }));
      toast.success("Xóa bài viết thành công");
      return result;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  togglePostLike: async (id: string) => {
    try {
      const result = await fetchApi(`/community/posts/${id}/like`, {
        method: "POST",
      });
      return result;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  },

  getComments: async (postId: string) => {
    set({ loading: true });
    try {
      const data = await fetchApi(`/community/posts/${postId}/comments`);
      set({ loading: false });
      return data;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return [];
    }
  },

  createComment: async (postId: string, content: string, parentId?: string) => {
    set({ loading: true });
    try {
      const result = await fetchApi(`/community/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentId }),
      });
      set({ loading: false });
      return result;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  },

  toggleCommentLike: async (commentId: string) => {
    try {
      const result = await fetchApi(`/community/comments/${commentId}/like`, {
        method: "POST",
      });
      return result;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  },

  updateComment: async (commentId: string, content: string) => {
    set({ loading: true });
    try {
      const result = await fetchApi(`/community/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
      set({ loading: false });
      return result;
    } catch (error: any) {
      toast.error(error.message);
      set({ loading: false });
      return null;
    }
  }
}));

