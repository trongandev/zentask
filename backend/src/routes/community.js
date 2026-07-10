import { Router } from "express";
import User from "../models/User.js";
import { CommunityPost, CommunityComment, UserActivity } from "../models/Schemas.js";
import { createNotification } from "../../utils/notifications.js";
import { addXpToUser, incrementDailyTask } from "./user.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { consumeDailyLimit } from "../../utils/usageLimits.js";
import { cleanAndValidateCommunityHtml, cleanAndValidateCommunityText } from "../../utils/moderation.js";

const router = Router();
router.use(verifyToken);

// --- POSTS ---

// GET /posts (with optional tag filter)
router.get(
  "/posts",
  asyncHandler(async (req, res) => {
    const { tags } = req.query;
    let query = {};

    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      query = { tags: { $in: tagArray } };
    }

    const postsDocs = await CommunityPost.find(query).sort({ createdAt: -1 }).limit(50).populate("uid", "displayName username email photoURL level").lean();

    const posts = postsDocs.map((doc) => {
      const user = doc.uid || {};
      return {
        id: doc._id,
        content: doc.content,
        tags: doc.tags || [],
        likes: doc.likes || [],
        commentsCount: doc.commentsCount || 0,
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
        user: {
          uid: user._id,
          name: user.displayName || "Người dùng",
          username: user.username || "@" + (user.email ? user.email.split("@")[0] : "user"),
          avatar: user.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
          level: user.level || 1,
        },
      };
    });

    res.json(posts);
  }),
);

// POST /posts
router.post(
  "/posts",
  asyncHandler(async (req, res) => {
    const { content, tags } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const cleanContent = await cleanAndValidateCommunityHtml(content.replace(/#[\wÀ-ỹ]+/g, "").trim(), "Bài viết cộng đồng", { maxLength: 20000 });
    const cleanTags = [];
    for (const tag of tags || []) {
      const safeTag = await cleanAndValidateCommunityText(tag, "Hashtag", { maxLength: 40 });
      if (safeTag) cleanTags.push(safeTag.replace(/^#/, ""));
    }
    await consumeDailyLimit({
      uid: req.user.uid,
      key: "community_post",
      amount: 1,
      message: "Bạn đã tạo đủ 2 bài viết cộng đồng hôm nay. Nâng VIP để đăng không giới hạn.",
    });

    const newPost = await CommunityPost.create({
      uid: req.user.uid,
      content: cleanContent,
      tags: cleanTags,
      likes: [],
      commentsCount: 0,
    });

    const taskResult = await incrementDailyTask(req.user.uid, "community_share", 1);
    let xpResult = null;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(req.user.uid, taskResult.xpToAdd);
    }

    await UserActivity.create({
      uid: req.user.uid,
      action: "Đăng bài cộng đồng",
      target: "Chia sẻ kiến thức",
      type: "other",
      xpEarned: taskResult.success ? taskResult.xpToAdd : 0
    });

    res.json({
      id: newPost._id,
      status: "success",
      xpResult,
      taskProgress: taskResult.success ? { community_share: taskResult.progress } : {},
    });
  }),
);

// PUT /posts/:id
router.put(
  "/posts/:id",
  asyncHandler(async (req, res) => {
    const { content, tags } = req.body;
    const post = await CommunityPost.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.uid.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    const cleanContent = await cleanAndValidateCommunityHtml(content.replace(/#[\wÀ-ỹ]+/g, "").trim(), "Bài viết cộng đồng", { maxLength: 20000 });
    const cleanTags = [];
    for (const tag of tags || []) {
      const safeTag = await cleanAndValidateCommunityText(tag, "Hashtag", { maxLength: 40 });
      if (safeTag) cleanTags.push(safeTag.replace(/^#/, ""));
    }

    post.content = cleanContent;
    if (tags) post.tags = cleanTags;
    await post.save();

    res.json({ status: "success" });
  }),
);

// DELETE /posts/:id
router.delete(
  "/posts/:id",
  asyncHandler(async (req, res) => {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.uid.toString() !== req.user.uid) return res.status(403).json({ error: "Forbidden" });

    await CommunityPost.findByIdAndDelete(req.params.id);
    await CommunityComment.deleteMany({ postId: req.params.id });

    res.json({ status: "success" });
  }),
);

// POST /posts/:id/like
router.post(
  "/posts/:id/like",
  asyncHandler(async (req, res) => {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    let isLiking = false;
    const userIndex = post.likes.indexOf(req.user.uid);

    if (userIndex > -1) {
      post.likes.splice(userIndex, 1);
    } else {
      post.likes.push(req.user.uid);
      isLiking = true;
    }
    await post.save();

    const postOwnerId = post.uid.toString();

    if (isLiking && postOwnerId !== req.user.uid) {
      const user = await User.findById(req.user.uid).lean();
      const name = user?.displayName || "Một người dùng";
      await createNotification(req.app, postOwnerId, "community_like", "Có người thích bài viết của bạn", `${name} đã thích bài viết của bạn.`, req.params.id);
    }

    res.json({ status: "success" });
  }),
);

// --- COMMENTS ---

// GET /posts/:id/comments
router.get(
  "/posts/:id/comments",
  asyncHandler(async (req, res) => {
    const commentsDocs = await CommunityComment.find({ postId: req.params.id }).sort({ createdAt: 1 }).populate("uid", "displayName photoURL level").lean();

    const comments = commentsDocs.map((doc) => {
      const user = doc.uid || {};
      return {
        id: doc._id,
        postId: doc.postId,
        parentId: doc.parentId || null,
        content: doc.content,
        likes: doc.likes || [],
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
        user: {
          uid: user._id,
          name: user.displayName || "Người dùng",
          avatar: user.photoURL || "https://phukiennillkin.com/wp-content/uploads/2026/03/meme-hai-huoc-7.jpg",
          level: user.level || 1,
        },
      };
    });

    res.json(comments);
  }),
);

// POST /posts/:id/comments
router.post(
  "/posts/:id/comments",
  asyncHandler(async (req, res) => {
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const cleanContent = await cleanAndValidateCommunityHtml(content, "Bình luận", { maxLength: 8000 });

    const newComment = await CommunityComment.create({
      postId: req.params.id,
      uid: req.user.uid,
      content: cleanContent,
      parentId: parentId || null,
      likes: [],
    });

    post.commentsCount += 1;
    await post.save();

    const postOwnerId = post.uid.toString();

    if (postOwnerId && postOwnerId !== req.user.uid) {
      const user = await User.findById(req.user.uid).lean();
      const name = user?.displayName || "Một người dùng";
      await createNotification(req.app, postOwnerId, "community_comment", "Có bình luận mới", `${name} đã bình luận bài viết của bạn.`, req.params.id);
    }

    // Notify parent comment owner if it's a reply
    if (parentId) {
      const parentComment = await CommunityComment.findById(parentId).lean();
      if (parentComment) {
        const parentOwnerId = parentComment.uid.toString();
        if (parentOwnerId && parentOwnerId !== req.user.uid) {
          const user = await User.findById(req.user.uid).lean();
          const name = user?.displayName || "Một người dùng";
          await createNotification(req.app, parentOwnerId, "community_reply", "Có phản hồi mới", `${name} đã trả lời bình luận của bạn.`, req.params.id);
        }
      }
    }

    res.json({ id: newComment._id, status: "success" });
  }),
);

// POST /comments/:id/like
router.post(
  "/comments/:id/like",
  asyncHandler(async (req, res) => {
    const comment = await CommunityComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    let isLiking = false;
    const userIndex = comment.likes.indexOf(req.user.uid);

    if (userIndex > -1) {
      comment.likes.splice(userIndex, 1);
    } else {
      comment.likes.push(req.user.uid);
      isLiking = true;
    }
    await comment.save();

    const commentOwnerId = comment.uid.toString();
    const postId = comment.postId.toString();

    if (isLiking && commentOwnerId !== req.user.uid) {
      const user = await User.findById(req.user.uid).lean();
      const name = user?.displayName || "Một người dùng";
      await createNotification(req.app, commentOwnerId, "community_like", "Có người thích bình luận của bạn", `${name} đã thích bình luận của bạn.`, postId);
    }

    res.json({ status: "success" });
  }),
);

// PUT /comments/:id
router.put(
  "/comments/:id",
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const comment = await CommunityComment.findById(req.params.id);

    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.uid.toString() !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

    comment.content = await cleanAndValidateCommunityHtml(content, "Bình luận", { maxLength: 8000 });
    await comment.save();

    res.json({ status: "success" });
  }),
);

export default router;
