import { Router } from "express";
import { auth, db } from "../firebase.js";

const router = Router();

const RANK_CONFIG = {
  1: { name: "Bạc", maxTiers: 3, starsPerTier: 3, loseProtection: true, winStreakBonus: false },
  2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4, loseProtection: false, winStreakBonus: false },
  3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5, loseProtection: false, winStreakBonus: true },
  4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5, loseProtection: true, winStreakBonus: true },
  5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: Infinity, loseProtection: true, winStreakBonus: false },
};

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

router.post("/win", authenticate, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    let { rankId = 1, tier = 3, stars = 0 } = doc.data();
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
          stars = 1; // 0 sao là điểm xuất phát, 1 sao là dư 1?
          // No wait, if starsPerTier is 3, having 3 stars means you filled it up, next win gives 4 stars.
          // Actually, normally if you have 3/3 stars, the next win promotes you and gives you 1 star.
          // Let's implement: if stars > starsPerTier (e.g. 4 > 3), promote to next tier with 1 star.
        } else {
          // Promote to next rank
          rankId += 1;
          tier = RANK_CONFIG[rankId].maxTiers;
          stars = 1;
        }
      }
    }

    await userRef.update({ rankId, tier, stars });
    res.json({ status: "success", rankId, tier, stars });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/lose", authenticate, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    let { rankId = 1, tier = 3, stars = 0 } = doc.data();
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
            // Kim cương protected from dropping to Vàng
            return res.json({ status: "protected", message: "Bảo hiểm hạng Kim Cương, không rớt hạng.", rankId, tier, stars });
          }
          if (config.loseProtection && rankId === 5) {
            // Cao thủ cannot drop back to Kim Cương? Or it can drop? Prompt says "Bảo hiểm không rớt xuống Rank 3" for Kim cương. For Cao Thủ: "loseProtection: true".
            // Let's protect Cao Thủ from dropping back to Kim Cương if stars == 0.
            return res.json({ status: "protected", message: "Bảo hiểm hạng Cao Thủ, không rớt hạng.", rankId, tier, stars });
          }

          rankId -= 1;
          tier = 1; // Drop to highest tier of previous rank
          stars = RANK_CONFIG[rankId].starsPerTier - 1;
        }
      }
    }

    await userRef.update({ rankId, tier, stars });
    res.json({ status: "success", rankId, tier, stars });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
