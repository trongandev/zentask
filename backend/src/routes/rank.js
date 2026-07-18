import { Router } from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import { UserActivity, UserLanguageProgress } from "../models/Schemas.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { incrementDailyTask, addXpToUser } from "./user.js";

const router = Router();

const RANK_CONFIG = {
  1: { name: "Bạc", maxTiers: 3, starsPerTier: 3, loseProtection: true, winStreakBonus: false },
  2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4, loseProtection: false, winStreakBonus: false },
  3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5, loseProtection: false, winStreakBonus: true },
  4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5, loseProtection: true, winStreakBonus: true },
  5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: Infinity, loseProtection: true, winStreakBonus: false },
};

router.use(verifyToken);

router.post(
  "/win",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    let progress = await UserLanguageProgress.findOne({ uid: user._id, language: user.targetLanguage });
    if (!progress) {
      progress = await UserLanguageProgress.create({
        uid: user._id,
        language: user.targetLanguage,
        rankId: 1, tier: 3, stars: 0, arenaMatchesPlayed: 0
      });
    }

    let { rankId = 1, tier = 3, stars = 0 } = progress;
    const config = RANK_CONFIG[rankId];

    // Cao thủ (Rank 5) just adds stars
    if (rankId === 5) {
      stars += 1;
    } else {
      stars += 1;

      // Check if user has enough stars to promote tier or rank
      if (stars > config.starsPerTier) {
        if (tier > 1) {
          // Promote to next tier (lower number)
          tier -= 1;
          stars = 1;
        } else {
          // Promote to next rank
          rankId += 1;
          tier = RANK_CONFIG[rankId].maxTiers;
          stars = 1;
        }
      }
    }

    progress.rankId = rankId;
    progress.tier = tier;
    progress.stars = stars;
    progress.arenaMatchesPlayed = (progress.arenaMatchesPlayed || 0) + 1;
    await progress.save();

    const taskResult = await incrementDailyTask(req.user.uid, "winning", 1);
    let xpResult = null;
    let earnedXp = 0;
    if (taskResult.success && taskResult.xpToAdd > 0) {
      xpResult = await addXpToUser(req.user.uid, taskResult.xpToAdd);
      earnedXp = taskResult.xpToAdd;
    }

    await UserActivity.create({
      uid: req.user.uid,
      action: "Đấu Trường (Thắng)",
      target: "Đấu hạng 1vs1",
      type: "arena",
      xpEarned: earnedXp
    });

    res.json({ 
      status: "success", 
      rankId, 
      tier, 
      stars, 
      arenaMatchesPlayed: progress.arenaMatchesPlayed,
      xpResult,
      taskProgress: taskResult.success ? { winning: taskResult.progress } : {}
    });
  }),
);

router.post(
  "/lose",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    let progress = await UserLanguageProgress.findOne({ uid: user._id, language: user.targetLanguage });
    if (!progress) {
      progress = await UserLanguageProgress.create({
        uid: user._id,
        language: user.targetLanguage,
        rankId: 1, tier: 3, stars: 0, arenaMatchesPlayed: 0
      });
    }

    let { rankId = 1, tier = 3, stars = 0 } = progress;
    const config = RANK_CONFIG[rankId];

    // Rank 1 lose protection
    if (config.loseProtection && rankId === 1) {
      progress.arenaMatchesPlayed = (progress.arenaMatchesPlayed || 0) + 1;
      await progress.save();
      
      await UserActivity.create({
        uid: req.user.uid,
        action: "Đấu Trường (Thua)",
        target: "Đấu hạng 1vs1",
        type: "arena",
        xpEarned: 0
      });

      return res.json({ status: "protected", message: "Không bị trừ sao ở Rank Đồng", rankId, tier, stars, arenaMatchesPlayed: progress.arenaMatchesPlayed });
    }

    if (stars > 0) {
      stars -= 1;
    } else {
      // stars == 0
      if (tier < config.maxTiers) {
        // Drop tier
        tier += 1;
        stars = config.starsPerTier - 1;
      } else {
        // Drop rank (if rankId > 1 and not protected)
        if (rankId > 1) {
          if (config.loseProtection && rankId === 4) {
            await UserActivity.create({
              uid: req.user.uid,
              action: "Đấu Trường (Thua)",
              target: "Đấu hạng 1vs1",
              type: "arena",
              xpEarned: 0
            });
            return res.json({ status: "protected", message: "Bảo hiểm hạng Kim Cương, không rớt hạng.", rankId, tier, stars });
          }
          if (config.loseProtection && rankId === 5) {
            await UserActivity.create({
              uid: req.user.uid,
              action: "Đấu Trường (Thua)",
              target: "Đấu hạng 1vs1",
              type: "arena",
              xpEarned: 0
            });
            return res.json({ status: "protected", message: "Bảo hiểm hạng Cao Thủ, không rớt hạng.", rankId, tier, stars });
          }

          rankId -= 1;
          tier = 1; // Drop to highest tier of previous rank
          stars = RANK_CONFIG[rankId].starsPerTier - 1;
        }
      }
    }

    progress.rankId = rankId;
    progress.tier = tier;
    progress.stars = stars;
    progress.arenaMatchesPlayed = (progress.arenaMatchesPlayed || 0) + 1;
    await progress.save();

    await UserActivity.create({
      uid: req.user.uid,
      action: "Đấu Trường (Thua)",
      target: "Đấu hạng 1vs1",
      type: "arena",
      xpEarned: 0
    });

    res.json({ status: "success", rankId, tier, stars, arenaMatchesPlayed: progress.arenaMatchesPlayed });
  }),
);

export default router;
