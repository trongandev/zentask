import { tierDiamondI } from "./tierDiamondI";
import { tierDiamondII } from "./tierDiamondII";
import { tierDiamondIII } from "./tierDiamondIII";
import { tierDiamondIV } from "./tierDiamondIV";
import { tierDiamondV } from "./tierDiamondV";
import { tierEliteI } from "./tierEliteI";
import { tierEliteII } from "./tierEliteII";
import { tierEliteIII } from "./tierEliteIII";
import { tierEliteIV } from "./tierEliteIV";
import { tierEliteV } from "./tierEliteV";
import { tierEmeraldI } from "./tierEmeraldI";
import { tierEmeraldII } from "./tierEmeraldII";
import { tierEmeraldIII } from "./tierEmeraldIII";
import { tierEmeraldIV } from "./tierEmeraldIV";
import { tierMasterI } from "./tierMasterI";
import { tierSilverI } from "./tierSilverI";
import { tierSilverII } from "./tierSilverII";
import { tierSilverIII } from "./tierSilverIII";

export const RANK_TOPIC_CONFIG = {
  1: {
    // Bạc (Rank 1) - Level: A1 đến A2 (Người mới bắt đầu)
    name: "Bạc",
    tiers: {
      3: {
        // Thấp nhất
        cefr: "A1",
        topics: ["Chào hỏi & Giới thiệu", "Số đếm & Màu sắc", "Các bộ phận cơ thể", "Đồ dùng học tập"],
        data: tierSilverIII,
      },
      2: {
        cefr: "A1-A2",
        topics: ["Gia đình", "Động vật nuôi", "Đồ ăn & Thức uống", "Thời tiết"],
        data: tierSilverII,
      },
      1: {
        // Cao nhất của Bạc
        cefr: "A2",
        topics: ["Trang phục", "Nhà cửa & Phòng ốc", "Hoạt động hàng ngày", "Động vật hoang dã"],
        data: tierSilverI,
      },
    },
  },

  2: {
    // Lục bảo (Rank 2) - Level: A2 đến B1 (Sơ trung cấp)
    name: "Lục bảo",
    tiers: {
      4: {
        cefr: "A2+",
        topics: ["Phương tiện giao thông", "Địa điểm trong thành phố", "Sở thích & Giải trí"],
        data: tierEmeraldIV,
      },
      3: {
        cefr: "A2-B1",
        topics: ["Mua sắm & Giá cả", "Mô tả ngoại hình & Tính cách", "Thể thao"],
        data: tierEmeraldIII,
      },
      2: {
        cefr: "B1",
        topics: ["Du lịch & Khách sạn", "Sức khỏe & Lối sống", "Cảm xúc & Tâm trạng"],
        data: tierEmeraldII,
      },
      1: {
        cefr: "B1",
        topics: ["Lễ hội & Văn hóa", "Công việc cơ bản", "Phương tiện truyền thông"],
        data: tierEmeraldI,
      },
    },
  },

  3: {
    // Tinh Anh (Rank 3) - Level: B1+ đến B2 (Trung cấp)
    name: "Tinh Anh",
    tiers: {
      5: {
        cefr: "B1+",
        topics: ["Giáo dục & Trường học", "Môi trường & Thiên nhiên", "Công nghệ thông tin"],
        data: tierEliteV,
      },
      4: {
        cefr: "B2",
        topics: ["Việc làm & Tuyển dụng", "Đời sống đô thị & Nông thôn", "Khoa học thường thức"],
        data: tierEliteIV,
      },
      3: {
        cefr: "B2",
        topics: ["Nghệ thuật & Điện ảnh", "Lịch sử & Sự kiện quốc tế", "Ẩm thực thế giới"],
        data: tierEliteIII,
      },
      2: {
        cefr: "B2",
        topics: ["Luật pháp cơ bản", "Kinh doanh & Khởi nghiệp", "Y học phổ thông"],
        data: tierEliteII,
      },
      1: {
        cefr: "B2+",
        topics: ["Tài chính cá nhân", "Giao tiếp công sở", "Truyền thông & Quảng cáo"],
        data: tierEliteI,
      },
    },
  },

  4: {
    // Kim Cương (Rank 4) - Level: B2+ đến C1 (Cao cấp)
    name: "Kim Cương",
    tiers: {
      5: {
        cefr: "B2-C1",
        topics: ["Chính trị & Xã hội", "Toàn cầu hóa", "Công nghệ cao (AI, Big Data)"],
        data: tierDiamondV,
      },
      4: {
        cefr: "C1",
        topics: ["Kinh tế vĩ mô", "Văn học & Triết học cơ bản", "Biến đổi khí hậu"],
        data: tierDiamondIV,
      },
      3: {
        cefr: "C1",
        topics: ["Tâm lý học hành vi", "Luật pháp quốc tế", "Nghiên cứu khoa học"],
        data: tierDiamondIII,
      },
      2: {
        cefr: "C1",
        topics: ["Tài chính doanh nghiệp", "Năng lượng & Tài nguyên", "Y học chuyên sâu"],
        data: tierDiamondII,
      },
      1: {
        cefr: "C1+",
        topics: ["Cụm động từ (Phrasal Verbs)", "Thành ngữ (Idioms)", "Từ ghép cố định (Collocations)"],
        data: tierDiamondI,
      },
    },
  },

  5: {
    // Cao Thủ (Rank 5) - Level: C2 (Thông thạo / Học thuật)
    name: "Cao Thủ",
    tiers: {
      1: {
        // Chỉ có 1 Tier vô hạn sao
        cefr: "C2",
        topics: [
          "Từ vựng học thuật chuyên sâu (IELTS/TOEFL advanced)",
          "Thành ngữ cổ & Tiếng lóng phức tạp (Slang & Idioms)",
          "Từ đồng nghĩa phân biệt sắc thái (Synonyms with nuances)",
          "Thuật ngữ chuyên ngành chuyên sâu (Y sinh, Cơ điện tử, Luật thương mại quốc tế)",
        ],
        data: tierMasterI,
      },
    },
  },
};

export type FLASHCARD_STRUCTURE = {
  id: string;
  title: string;
  category: string;
  description: string;
  color: string;
  words: Word[];
};

export type Word = {
  id: string;
  term: string;
  phonetic: string;
  translation: string;
  examples: Example[];
  notes: string;
};

export type Example = {
  en: string;
  vi: string;
};

export const getBeginnerSetById = (id: string): FLASHCARD_STRUCTURE | null => {
  for (const rank of Object.values(RANK_TOPIC_CONFIG)) {
    for (const tier of Object.values(rank.tiers)) {
      const set = tier.data.find((s) => s.id === id);
      if (set) return set;
    }
  }
  return null;
};

export const generateArenaDeck = (rankId: number, tierNum: number): { cards: Word[]; modes: string[]; x2Indices: number[] } => {
  let currentTierWords: Word[] = [];
  let lowerTierWords: Word[] = [];

  // Gather words
  for (const [rId, rank] of Object.entries(RANK_TOPIC_CONFIG)) {
    const currentRId = parseInt(rId);
    for (const [tNum, tier] of Object.entries(rank.tiers)) {
      const currentTNum = parseInt(tNum);
      const tierWords = tier.data.flatMap((set: FLASHCARD_STRUCTURE) => set.words);

      // Since tierNum in rank is backwards (3,2,1), lower tier means higher number in current rank, or lower rankId
      // Actually, rankId 1 is lowest. So rId < rankId is lower rank.
      // If same rank, tNum > tierNum is lower tier (e.g. tier 3 is lower than tier 1).
      const isLower = currentRId < rankId || (currentRId === rankId && currentTNum > tierNum);
      const isCurrent = currentRId === rankId && currentTNum === tierNum;

      if (isCurrent) currentTierWords.push(...tierWords);
      else if (isLower) lowerTierWords.push(...tierWords);
    }
  }

  // Fallback if not enough words
  if (currentTierWords.length === 0) {
    // If somehow empty, fallback to any available word
    const all = Object.values(RANK_TOPIC_CONFIG).flatMap((r) => Object.values(r.tiers).flatMap((t) => t.data.flatMap((s) => s.words)));
    currentTierWords = all;
  }

  // Shuffle arrays
  currentTierWords = currentTierWords.sort(() => 0.5 - Math.random());
  lowerTierWords = lowerTierWords.sort(() => 0.5 - Math.random());

  let selectedCards: Word[] = [];

  if (lowerTierWords.length >= 2 && currentTierWords.length >= 8) {
    selectedCards = [...currentTierWords.slice(0, 8), ...lowerTierWords.slice(0, 2)];
  } else {
    // Just take 10 from current if we don't have enough lower
    const combined = [...currentTierWords, ...lowerTierWords];
    selectedCards = combined.slice(0, 10);
  }

  selectedCards = selectedCards.sort(() => 0.5 - Math.random()); // Final shuffle

  // Select random modes for 10 questions that work well with 10s timeout
  const validModes = ["quiz", "fill_blank", "listening", "guess", "typing"];
  const randomModes = Array.from({ length: 10 }, () => validModes[Math.floor(Math.random() * validModes.length)]);

  // Random 1 or 2 indices for x2 points
  const numX2 = Math.random() > 0.5 ? 2 : 1;
  const x2Indices: number[] = [];
  while (x2Indices.length < numX2) {
    const r = Math.floor(Math.random() * 10);
    if (!x2Indices.includes(r)) x2Indices.push(r);
  }

  return { cards: selectedCards, modes: randomModes, x2Indices };
};
