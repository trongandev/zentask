import { builtinIeltsFlashcards } from "./builtinIeltsFlashcards.js";
import { builtinToeicFlashcards } from "./builtinToeicFlashcards.js";
import { builtinIeltsQuizzes } from "./builtinIeltsQuizzes.js";
import { builtinToeicQuizzes } from "./builtinToeicQuizzes.js";

export const BUILTIN_LEARNING_CONFIG = {
  ielts: { name: "IELTS", color: "bg-indigo-500", flashcards: builtinIeltsFlashcards, quizzes: builtinIeltsQuizzes },
  toeic: { name: "TOEIC", color: "bg-emerald-500", flashcards: builtinToeicFlashcards, quizzes: builtinToeicQuizzes },
};

export const BUILTIN_FLASHCARD_SETS = [...builtinIeltsFlashcards, ...builtinToeicFlashcards];
export const BUILTIN_QUIZZES = [...builtinIeltsQuizzes, ...builtinToeicQuizzes];

export const getBuiltinFlashcardSetById = (id) => BUILTIN_FLASHCARD_SETS.find((set) => set.id === id) || null;
export const getBuiltinQuizById = (id) => BUILTIN_QUIZZES.find((quiz) => quiz.id === id) || null;
export const getBuiltinLearningSummary = () => ({
  flashcardCount: BUILTIN_FLASHCARD_SETS.length,
  quizCount: BUILTIN_QUIZZES.length,
  wordCount: BUILTIN_FLASHCARD_SETS.reduce((sum, set) => sum + set.words.length, 0),
});
