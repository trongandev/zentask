export const RANK_NAMES = {
  1: "Bạc",
  2: "Lục bảo",
  3: "Tinh Anh",
  4: "Kim cương",
  5: "Cao Thủ",
};

export const RANK_CONFIG = {
  1: { name: "Bạc", maxTiers: 3, starsPerTier: 3, loseProtection: true, winStreakBonus: false },
  2: { name: "Lục bảo", maxTiers: 4, starsPerTier: 4, loseProtection: false, winStreakBonus: false },
  3: { name: "Tinh Anh", maxTiers: 5, starsPerTier: 5, loseProtection: false, winStreakBonus: true },
  4: { name: "Kim Cương", maxTiers: 5, starsPerTier: 5, loseProtection: false, winStreakBonus: true },
  5: { name: "Cao Thủ", maxTiers: 1, starsPerTier: Infinity, loseProtection: false, winStreakBonus: false },
};

export const getRankName = (rankId: number, tier: number): string => {
  const config = RANK_CONFIG[rankId as keyof typeof RANK_CONFIG] || RANK_CONFIG[1];
  const romanNumerals = ["I", "II", "III", "IV", "V"];
  const tierText = rankId === 5 ? "" : ` ${romanNumerals[tier - 1] || tier}`;
  return `${config.name}${tierText}`;
};
