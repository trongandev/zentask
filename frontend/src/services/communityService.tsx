import { create } from "zustand";
import toastService from "@/src/services/toastService";
import { assertPublicContentSafe } from "../utils/publicContentGuard";
import axiosInstance from "./axiosConfig";

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

interface CommunityState {
  loading: boolean;
  posts: Post[];

  getPosts: (tags?: string, background?: boolean) => Promise<Post[]>;
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

  getPosts: async (tags?: string, background = false) => {
    if (!background) set({ loading: true });
    try {
      const url = tags ? `/api/community/posts?tags=${tags}` : `/api/community/posts`;
      const res = await axiosInstance.get(url);
      set({ posts: res.data, loading: false });
      return res.data;
    } catch (error: any) {
      set({ loading: false });
      return [];
    }
  },

  createPost: async (content: string, tags: string[]) => {
    try {
      assertPublicContentSafe(content, "Bài viết");
      tags.forEach((tag) => assertPublicContentSafe(tag, "Hashtag"));
      const res = await axiosInstance.post("/api/community/posts", { content, tags });
      get().getPosts(undefined, true);
      toastService.success("Đăng bài thành công");
      return res.data;
    } catch (error: any) {
      if (!error.isAxiosError) toastService.error(error.message);
      return null;
    }
  },

  updatePost: async (id: string, content: string, tags: string[]) => {
    try {
      assertPublicContentSafe(content, "Bài viết");
      tags.forEach((tag) => assertPublicContentSafe(tag, "Hashtag"));
      const res = await axiosInstance.put(`/api/community/posts/${id}`, { content, tags });
      get().getPosts(undefined, true);
      toastService.success("Cập nhật bài viết thành công");
      return res.data;
    } catch (error: any) {
      if (!error.isAxiosError) toastService.error(error.message);
      return null;
    }
  },

  deletePost: async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/api/community/posts/${id}`);
      set((state) => ({ posts: state.posts.filter((p) => p.id !== id) }));
      toastService.success("Xóa bài viết thành công");
      return res.data;
    } catch (error: any) {
      return null;
    }
  },

  togglePostLike: async (id: string) => {
    try {
      const res = await axiosInstance.post(`/api/community/posts/${id}/like`);
      return res.data;
    } catch (error: any) {
      return null;
    }
  },

  getComments: async (postId: string) => {
    try {
      const res = await axiosInstance.get(`/api/community/posts/${postId}/comments`);
      return res.data;
    } catch (error: any) {
      return [];
    }
  },

  createComment: async (postId: string, content: string, parentId?: string) => {
    try {
      assertPublicContentSafe(content, "Bình luận");
      const res = await axiosInstance.post(`/api/community/posts/${postId}/comments`, { content, parentId });
      return res.data;
    } catch (error: any) {
      if (!error.isAxiosError) toastService.error(error.message);
      return null;
    }
  },

  toggleCommentLike: async (commentId: string) => {
    try {
      const res = await axiosInstance.post(`/api/community/comments/${commentId}/like`);
      return res.data;
    } catch (error: any) {
      return null;
    }
  },

  updateComment: async (commentId: string, content: string) => {
    try {
      assertPublicContentSafe(content, "Bình luận");
      const res = await axiosInstance.put(`/api/community/comments/${commentId}`, { content });
      return res.data;
    } catch (error: any) {
      if (!error.isAxiosError) toastService.error(error.message);
      return null;
    }
  },
}));
