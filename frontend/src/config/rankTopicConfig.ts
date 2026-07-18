export type Example = {
  en: string;
  vi: string;
};

export type Word = {
  id: string;
  term: string;
  phonetic: string;
  translation: string;
  examples: Example[];
  notes: string;
};

export type FLASHCARD_STRUCTURE = {
  id: string;
  category: string;
  title: string;
  words: Word[];
};

export const RANK_NAMES: Record<number, string> = {
  1: "Bạc",
  2: "Lục bảo",
  3: "Tinh Anh",
  4: "Kim cương",
  5: "Cao Thủ",
};
