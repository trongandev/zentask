import { builtinIeltsFlashcards } from "./builtinIeltsFlashcards";
import { builtinToeicFlashcards } from "./builtinToeicFlashcards";
import { builtinIeltsQuizzes } from "./builtinIeltsQuizzes";
import { builtinToeicQuizzes } from "./builtinToeicQuizzes";

export type BuiltinExample = { en: string; vi: string };
export type BuiltinWord = { id: string; term: string; phonetic: string; translation: string; examples: BuiltinExample[]; notes: string };
export type BuiltinFlashcardSet = { id: string; title: string; category: "IELTS" | "TOEIC"; categoryName: string; description: string; color: string; isBuiltIn: true; isSystem: true; source: string; cardCount: number; learnedCount: number; lastStudied: null; isNew: false; isPublic: true; words: BuiltinWord[] };
export type BuiltinQuiz = { id: string; title: string; description: string; category: "IELTS" | "TOEIC"; categoryName: string; difficulty: string; duration: number; questions: any[]; creatorId: "system"; isPublic: true; isFeatured: true; isDefault: true; isBuiltIn: true; source: string; createdAt: string };

export const BUILTIN_LEARNING_CONFIG = {
  ielts: { name: "IELTS", color: "bg-indigo-500", flashcards: builtinIeltsFlashcards, quizzes: builtinIeltsQuizzes },
  toeic: { name: "TOEIC", color: "bg-emerald-500", flashcards: builtinToeicFlashcards, quizzes: builtinToeicQuizzes },
};

export const BUILTIN_FLASHCARD_SETS = [...builtinIeltsFlashcards, ...builtinToeicFlashcards] as BuiltinFlashcardSet[];
export const BUILTIN_QUIZZES = [...builtinIeltsQuizzes, ...builtinToeicQuizzes] as BuiltinQuiz[];

export const getBuiltinFlashcardSetById = (id: string) => BUILTIN_FLASHCARD_SETS.find((set) => set.id === id) || null;
export const getBuiltinQuizById = (id: string) => BUILTIN_QUIZZES.find((quiz) => quiz.id === id) || null;
export const getBuiltinLearningSummary = () => ({
  flashcardCount: BUILTIN_FLASHCARD_SETS.length,
  quizCount: BUILTIN_QUIZZES.length,
  wordCount: BUILTIN_FLASHCARD_SETS.reduce((sum, set) => sum + set.words.length, 0),
});
