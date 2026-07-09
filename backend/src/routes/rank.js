import { Router } from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

const RANK_CONFIG = {
  1: { name: "Bạc", maxTiers: 3, starsPerTier: 3, loseProtection: true, winStreakBonus: false },
  2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4, loseProtection: false, winStreakBonus: false },
  3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5, loseProtection: false, winStreakBonus: true },
  4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5, loseProtection: true, winStreakBonus: true },
  5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: Infinity, loseProtection: true, winStreakBonus: false },
};

router.use(verifyToken);

router.post("/win", asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.uid);
  if (!user) return res.status(404).json({ error: "User not found" });

  let { rankId = 1, tier = 3, stars = 0 } = user;
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

  user.rankId = rankId;
  user.tier = tier;
  user.stars = stars;
  await user.save();

  res.json({ status: "success", rankId, tier, stars });
}));

router.post("/lose", asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.uid);
  if (!user) return res.status(404).json({ error: "User not found" });

  let { rankId = 1, tier = 3, stars = 0 } = user;
  const config = RANK_CONFIG[rankId];

  // Rank 1 lose protection
  if (config.loseProtection && rankId === 1) {
    return res.json({ status: "protected", message: "Không bị trừ sao ở Rank Đồng", rankId, tier, stars });
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
          return res.json({ status: "protected", message: "Bảo hiểm hạng Kim Cương, không rớt hạng.", rankId, tier, stars });
        }
        if (config.loseProtection && rankId === 5) {
          return res.json({ status: "protected", message: "Bảo hiểm hạng Cao Thủ, không rớt hạng.", rankId, tier, stars });
        }

        rankId -= 1;
        tier = 1; // Drop to highest tier of previous rank
        stars = RANK_CONFIG[rankId].starsPerTier - 1;
      }
    }
  }

  user.rankId = rankId;
  user.tier = tier;
  user.stars = stars;
  await user.save();

  res.json({ status: "success", rankId, tier, stars });
}));

export default router;
