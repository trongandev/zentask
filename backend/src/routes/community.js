import { Router } from "express";
import { auth, db } from "../firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { createNotification } from "../utils/notifications.js";

const router = Router();

// Middleware to authenticate
const authenticate = async (req, res, next) => {
  const sessionCookie = req.cookies.session || "";
  if (!sessionCookie) return res.status(401).json({ error: "Unauthenticated" });
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    req.uid = decodedClaims.uid;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthenticated" });
  }
};

router.use(authenticate);

// --- POSTS ---

// GET /posts (with optional tag filter)
router.get("/posts", async (req, res) => {
  try {
    const { tags } = req.query;
    let postsQuery = db.collection("community_posts").orderBy("createdAt", "desc").limit(50);

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      postsQuery = db.collection("community_posts")
        .where("tags", "array-contains-any", tagArray)
        .orderBy("createdAt", "desc")
        .limit(50);
    }

    const snapshot = await postsQuery.get();
    
    // Fetch users for posts
    const uids = [...new Set(snapshot.docs.map(doc => doc.data().uid))];
    const usersMap = {};
    if (uids.length > 0) {
      for (let i = 0; i < uids.length; i += 30) {
        const chunk = uids.slice(i, i + 30);
        const usersSnap = await db.collection("users").where("uid", "in", chunk).get();
        usersSnap.docs.forEach(d => {
          usersMap[d.data().uid] = d.data();
        });
      }
    }

    const posts = snapshot.docs.map(doc => {
      const data = doc.data();
      const user = usersMap[data.uid] || {};
      return {
        id: doc.id,
        content: data.content,
        tags: data.tags || [],
        likes: data.likes || [],
        commentsCount: data.commentsCount || 0,
        createdAt: data.createdAt,
        user: {
          uid: data.uid,
          name: user.displayName || "Người dùng",
          username: user.username || "@" + (user.email ? user.email.split('@')[0] : "user"),
          avatar: user.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
          level: user.level || 1,
        }
      };
    });

    res.json(posts);
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /posts
router.post("/posts", async (req, res) => {
  try {
    const { content, tags } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const cleanContent = content.replace(/#[\wÀ-ỹ]+/g, "").trim();

    const newPost = {
      uid: req.uid,
      content: cleanContent,
      tags: tags || [],
      likes: [],
      commentsCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("community_posts").add(newPost);
    res.json({ id: docRef.id, status: "success" });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// PUT /posts/:id
router.put("/posts/:id", async (req, res) => {
  try {
    const { content, tags } = req.body;
    const postRef = db.collection("community_posts").doc(req.params.id);
    const doc = await postRef.get();
    
    if (!doc.exists) return res.status(404).json({ error: "Post not found" });
    if (doc.data().uid !== req.uid) return res.status(403).json({ error: "Forbidden" });

    const cleanContent = content.replace(/#[\wÀ-ỹ]+/g, "").trim();

    await postRef.update({
      content: cleanContent,
      tags: tags || [],
      updatedAt: FieldValue.serverTimestamp()
    });

    res.json({ status: "success" });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// DELETE /posts/:id
router.delete("/posts/:id", async (req, res) => {
  try {
    const postRef = db.collection("community_posts").doc(req.params.id);
    const doc = await postRef.get();
    
    if (!doc.exists) return res.status(404).json({ error: "Post not found" });
    if (doc.data().uid !== req.uid) return res.status(403).json({ error: "Forbidden" });

    await postRef.delete();
    // In a real app we might also delete comments here

    res.json({ status: "success" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /posts/:id/like
router.post("/posts/:id/like", async (req, res) => {
  try {
    const postRef = db.collection("community_posts").doc(req.params.id);
    let postOwnerId = null;
    let isLiking = false;

    await db.runTransaction(async (t) => {
      const doc = await t.get(postRef);
      if (!doc.exists) throw new Error("Post not found");
      
      postOwnerId = doc.data().uid;
      const likes = doc.data().likes || [];
      
      if (likes.includes(req.uid)) {
        t.update(postRef, { likes: FieldValue.arrayRemove(req.uid) });
        isLiking = false;
      } else {
        t.update(postRef, { likes: FieldValue.arrayUnion(req.uid) });
        isLiking = true;
      }
    });

    if (isLiking && postOwnerId && postOwnerId !== req.uid) {
      const userDoc = await db.collection("users").doc(req.uid).get();
      const name = userDoc.data()?.displayName || "Một người dùng";
      await createNotification(
        req.app,
        postOwnerId,
        "community_like",
        "Có người thích bài viết của bạn",
        `${name} đã thích bài viết của bạn.`,
        req.params.id
      );
    }

    res.json({ status: "success" });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// --- COMMENTS ---

// GET /posts/:id/comments
router.get("/posts/:id/comments", async (req, res) => {
  try {
    const snapshot = await db.collection("community_comments")
      .where("postId", "==", req.params.id)
      .orderBy("createdAt", "asc")
      .get();
      
    const uids = [...new Set(snapshot.docs.map(doc => doc.data().uid))];
    const usersMap = {};
    if (uids.length > 0) {
      for (let i = 0; i < uids.length; i += 30) {
        const chunk = uids.slice(i, i + 30);
        const usersSnap = await db.collection("users").where("uid", "in", chunk).get();
        usersSnap.docs.forEach(d => {
          usersMap[d.data().uid] = d.data();
        });
      }
    }

    const comments = snapshot.docs.map(doc => {
      const data = doc.data();
      const user = usersMap[data.uid] || {};
      return {
        id: doc.id,
        postId: data.postId,
        parentId: data.parentId || null,
        content: data.content,
        likes: data.likes || [],
        createdAt: data.createdAt,
        user: {
          uid: data.uid,
          name: user.displayName || "Người dùng",
          avatar: user.photoURL || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
          level: user.level || 1,
        }
      };
    });

    res.json(comments);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /posts/:id/comments
router.post("/posts/:id/comments", async (req, res) => {
  try {
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const newComment = {
      postId: req.params.id,
      uid: req.uid,
      content,
      parentId: parentId || null,
      likes: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("community_comments").add(newComment);
    
    // Increment commentsCount on post
    const postRef = db.collection("community_posts").doc(req.params.id);
    await postRef.update({
      commentsCount: FieldValue.increment(1)
    });

    const postDoc = await postRef.get();
    const postOwnerId = postDoc.data()?.uid;

    if (postOwnerId && postOwnerId !== req.uid) {
      const userDoc = await db.collection("users").doc(req.uid).get();
      const name = userDoc.data()?.displayName || "Một người dùng";
      await createNotification(
        req.app,
        postOwnerId,
        "community_comment",
        "Có bình luận mới",
        `${name} đã bình luận bài viết của bạn.`,
        req.params.id
      );
    }

    // Notify parent comment owner if it's a reply
    if (parentId) {
      const parentDoc = await db.collection("community_comments").doc(parentId).get();
      if (parentDoc.exists) {
        const parentOwnerId = parentDoc.data().uid;
        if (parentOwnerId && parentOwnerId !== req.uid) {
          const userDoc = await db.collection("users").doc(req.uid).get();
          const name = userDoc.data()?.displayName || "Một người dùng";
          await createNotification(
            req.app,
            parentOwnerId,
            "community_reply",
            "Có phản hồi mới",
            `${name} đã trả lời bình luận của bạn.`,
            req.params.id
          );
        }
      }
    }

    res.json({ id: docRef.id, status: "success" });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /comments/:id/like
router.post("/comments/:id/like", async (req, res) => {
  try {
    const commentRef = db.collection("community_comments").doc(req.params.id);
    let commentOwnerId = null;
    let isLiking = false;
    let postId = null;

    await db.runTransaction(async (t) => {
      const doc = await t.get(commentRef);
      if (!doc.exists) throw new Error("Comment not found");
      
      commentOwnerId = doc.data().uid;
      postId = doc.data().postId;
      const likes = doc.data().likes || [];

      if (likes.includes(req.uid)) {
        t.update(commentRef, { likes: FieldValue.arrayRemove(req.uid) });
        isLiking = false;
      } else {
        t.update(commentRef, { likes: FieldValue.arrayUnion(req.uid) });
        isLiking = true;
      }
    });

    if (isLiking && commentOwnerId && commentOwnerId !== req.uid) {
      const userDoc = await db.collection("users").doc(req.uid).get();
      const name = userDoc.data()?.displayName || "Một người dùng";
      await createNotification(
        req.app,
        commentOwnerId,
        "community_like",
        "Có người thích bình luận của bạn",
        `${name} đã thích bình luận của bạn.`,
        postId
      );
    }

    res.json({ status: "success" });
  } catch (error) {
    console.error("Toggle comment like error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// PUT /comments/:id
router.put("/comments/:id", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    const commentRef = db.collection("community_comments").doc(req.params.id);
    const doc = await commentRef.get();
    
    if (!doc.exists) return res.status(404).json({ error: "Comment not found" });
    if (doc.data().uid !== req.uid) return res.status(403).json({ error: "Unauthorized" });

    await commentRef.update({
      content,
      updatedAt: FieldValue.serverTimestamp()
    });

    res.json({ status: "success" });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
