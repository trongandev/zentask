import express from "express";
import crypto from "crypto";
import { ArenaMatchmakingStat, ArenaTournamentRoom, Friendship } from "../models/Schemas.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { verifyToken } from "../middleware/auth.js";
import { addXpToUser } from "./user.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();
router.use(verifyToken);

const generateTournamentCode = () => crypto.randomInt(100000, 1000000).toString();
const toPublicUser = (user) => user ? ({ uid: user._id?.toString?.() || user.uid, displayName: user.displayName || user.email || "Học viên", photoURL: user.photoURL || "" }) : null;

router.post("/stats/matchmaking", asyncHandler(async (req, res) => {
  const { durationMs, rankId, tier } = req.body;

  await ArenaMatchmakingStat.create({
    uid: req.user.uid,
    durationMs,
    rankId: rankId || 1,
    tier: tier || 1,
  });

  res.json({ success: true });
}));

router.post("/tournaments", asyncHandler(async (req, res) => {
  const { title = "Giải đấu ZenTask", inviteUserIds = [], settings = {} } = req.body;
  let code = generateTournamentCode();
  while (await ArenaTournamentRoom.findOne({ code })) code = generateTournamentCode();

  const uniqueInvites = [...new Set((inviteUserIds || []).map(String).filter((id) => id && id !== req.user.uid))];
  const room = await ArenaTournamentRoom.create({
    code,
    title: String(title || "Giải đấu ZenTask").slice(0, 80),
    hostId: req.user.uid,
    participantIds: [req.user.uid],
    invitedUserIds: uniqueInvites,
    status: "waiting",
    settings: {
      size: 16,
      rewardXpOnce: 10,
      rankEnabled: false,
      ...settings,
    },
  });

  const host = await User.findById(req.user.uid).lean();
  const hostName = host?.displayName || "Một người bạn";
  for (const invitedId of uniqueInvites) {
    await createNotification(req.app, invitedId, "arena_tournament_invite", "Lời mời giải đấu", `${hostName} đã mời bạn tham gia giải đấu ${room.title}.`, req.user.uid);
  }

  res.json({ id: room._id, ...room.toObject() });
}));

router.get("/tournaments", asyncHandler(async (req, res) => {
  const rooms = await ArenaTournamentRoom.find({
    $or: [
      { hostId: req.user.uid },
      { participantIds: req.user.uid },
      { invitedUserIds: req.user.uid },
    ],
  }).sort({ createdAt: -1 }).limit(30).lean();
  res.json(rooms.map((room) => ({ id: room._id, ...room })));
}));

router.get("/tournaments/:code", asyncHandler(async (req, res) => {
  const room = await ArenaTournamentRoom.findOne({ code: req.params.code }).lean();
  if (!room) return res.status(404).json({ error: "Không tìm thấy phòng giải đấu" });
  const participants = await User.find({ _id: { $in: room.participantIds || [] } }).select("displayName photoURL email").lean();
  res.json({ id: room._id, ...room, participants: participants.map(toPublicUser) });
}));

router.post("/tournaments/:code/join", asyncHandler(async (req, res) => {
  const room = await ArenaTournamentRoom.findOne({ code: req.params.code });
  if (!room) return res.status(404).json({ error: "Không tìm thấy phòng giải đấu" });
  if (room.status !== "waiting") return res.status(400).json({ error: "Giải đấu đã bắt đầu hoặc đã kết thúc" });

  const uid = req.user.uid;
  const participants = (room.participantIds || []).map(String);
  if (!participants.includes(uid)) room.participantIds.push(uid);
  await room.save();
  res.json({ id: room._id, ...room.toObject() });
}));

router.post("/tournaments/:code/invite", asyncHandler(async (req, res) => {
  const { userIds = [] } = req.body;
  const room = await ArenaTournamentRoom.findOne({ code: req.params.code });
  if (!room) return res.status(404).json({ error: "Không tìm thấy phòng giải đấu" });
  if (room.hostId.toString() !== req.user.uid) return res.status(403).json({ error: "Chỉ chủ phòng được mời thêm" });

  const uniqueInvites = [...new Set(userIds.map(String).filter((id) => id && id !== req.user.uid))];
  const currentInvites = new Set((room.invitedUserIds || []).map(String));
  uniqueInvites.forEach((id) => currentInvites.add(id));
  room.invitedUserIds = [...currentInvites];
  await room.save();

  const host = await User.findById(req.user.uid).lean();
  for (const invitedId of uniqueInvites) {
    await createNotification(req.app, invitedId, "arena_tournament_invite", "Lời mời giải đấu", `${host?.displayName || "Một người bạn"} đã mời bạn tham gia giải đấu ${room.title}.`, req.user.uid);
  }

  res.json({ success: true, invitedUserIds: room.invitedUserIds });
}));

router.post("/tournaments/:code/complete", asyncHandler(async (req, res) => {
  const room = await ArenaTournamentRoom.findOne({ code: req.params.code });
  if (!room) return res.status(404).json({ error: "Không tìm thấy phòng giải đấu" });
  const uid = req.user.uid;
  const participants = (room.participantIds || []).map(String);
  if (!participants.includes(uid)) return res.status(403).json({ error: "Bạn chưa tham gia giải đấu này" });

  const awarded = (room.xpAwardedUserIds || []).map(String);
  let xpResult = null;
  if (!awarded.includes(uid)) {
    xpResult = await addXpToUser(uid, 10);
    room.xpAwardedUserIds.push(uid);
    await room.save();
  }

  res.json({ success: true, awardedXp: xpResult ? 10 : 0, xpResult });
}));

router.get("/friends", asyncHandler(async (req, res) => {
  const docs = await Friendship.find({ users: req.user.uid }).lean();
  const friendIds = docs.flatMap((doc) => doc.users || []).map(String).filter((id) => id !== req.user.uid);
  const users = await User.find({ _id: { $in: friendIds } }).select("displayName photoURL email").lean();
  res.json(users.map(toPublicUser));
}));

export default router;
