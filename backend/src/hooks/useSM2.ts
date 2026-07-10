import { useFlashcardStore } from "../services/flashcardService";
import { getBeginnerSetById } from "../config/rankTopicConfig";
import { useAuth } from "../contexts/AuthContext";
import type { PracticeMode } from "../pages/Flashcard/FlashcardPractice";

/**
 * Tính T_target (ms) dựa trên số ký tự của từ.
 * T_target = 1500ms (phản xạ gốc) + (số ký tự × 150ms/phím)
 *
 * Ví dụ:
 * - "Cat" (3 ký tự): 1500 + 450 = 1950ms
 * - "Family" (6 ký tự): 1500 + 900 = 2400ms
 * - "Beautiful" (9 ký tự): 1500 + 1350 = 2850ms
 * - "Entertainment" (13 ký tự): 1500 + 1950 = 3450ms
 */
export function getTypingTargetTime(term: string): number {
  const charCount = term.replace(/\s/g, "").length; // không tính khoảng trắng
  return 1500 + charCount * 150;
}

/**
 * Tính quality score cho nhóm Gõ (typing/fill_blank/listening)
 * dựa trên thời gian phản xạ so với T_target.
 *
 * Đúng:
 *   - responseMs <= T_target → 5 (phản xạ siêu tốc)
 *   - responseMs >  T_target → 4 (phản xạ bình thường)
 * Sai: → 1 (mặc định)
 */
function getTypingQuality(isCorrect: boolean, term: string, responseMs?: number): number {
  if (!isCorrect) return 1;
  if (responseMs === undefined) return 4; // không đo được thì coi bình thường
  const tTarget = getTypingTargetTime(term);
  return responseMs <= tTarget ? 5 : 4;
}

/**
 * Tính quality score cho nhóm Guess (ghép chữ cái)
 * dựa trên 3 mức thời gian.
 *
 * Đúng:
 *   - Hoàn thành nhanh  (< 5s)  → 4
 *   - Hoàn thành vừa   (5-12s) → 3.5
 *   - Hoàn thành chậm  (>12s)  → 3
 * Sai: → 1
 */
function getGuessQuality(isCorrect: boolean, responseMs?: number): number {
  if (!isCorrect) return 1;
  if (responseMs === undefined) return 3.5;
  if (responseMs < 5000) return 4;
  if (responseMs < 12000) return 3.5;
  return 3;
}

/**
 * Tính quality score cho nhóm Chọn (quiz/match/bubble)
 * dựa trên 3 mức thời gian.
 *
 * Đúng:
 *   - Chọn nhanh    (< 2s) → 3.5
 *   - Chọn vừa     (2-5s) → 3
 *   - Chọn chậm    (>5s)  → 2.5
 * Sai: → 1
 */
function getSelectionQuality(isCorrect: boolean, responseMs?: number): number {
  if (!isCorrect) return 1;
  if (responseMs === undefined) return 3;
  if (responseMs < 2000) return 3.5;
  if (responseMs < 5000) return 3;
  return 2.5;
}

/**
 * Hook SM-2 dành cho các Mode components.
 *
 * reportCorrect(cardId, mode, term?, responseMs?) — truyền thêm thời gian phản xạ để tính quality động.
 * reportWrong(cardId, mode) — mặc định sai ở mọi trường hợp.
 */
export function useSM2(setId: string) {
  const { recordAnswer, flushProgress, recordBeginnerAnswer } = useFlashcardStore();
  const { user } = useAuth();
  const isBeginnerSet = !!getBeginnerSetById(setId);

  /**
   * @param cardId   - ID của thẻ
   * @param mode     - Chế độ luyện tập
   * @param term     - Từ vựng (dùng để tính T_target cho nhóm gõ)
   * @param responseMs - Thời gian phản xạ tính bằng ms (tùy chọn)
   */
  const reportCorrect = (cardId: string, mode: PracticeMode, term?: string, responseMs?: number) => {
    let quality: number;

    switch (mode) {
      // Nhóm 1: Nhập liệu — quality động theo T_target
      case "typing":
      case "fill_blank":
      case "listening":
        quality = getTypingQuality(true, term ?? "", responseMs);
        break;

      // Nhóm 2: Ghép chữ cái — quality động theo thời gian
      case "guess":
        quality = getGuessQuality(true, responseMs);
        break;

      // Nhóm 3: Chọn đáp án — quality động theo thời gian
      case "quiz":
      case "match":
      case "bubble":
        quality = getSelectionQuality(true, responseMs);
        break;

      // Nhóm đặc biệt: Thẻ lật — user tự đánh giá
      case "flashcard":
        quality = 3; // "Đã thuộc"
        break;

      default:
        quality = 3;
    }

    if (isBeginnerSet) {
      // Beginner mode: if answered correctly, mark as learned (batched 5 items)
      recordBeginnerAnswer(cardId);
    } else {
      recordAnswer(cardId, setId, quality, mode);
    }
  };

  /**
   * Báo cáo sai. Tất cả modes khi sai đều trả về quality = 1,
   * ngoại trừ flashcard "Chưa thuộc" = 2.
   */
  const reportWrong = (cardId: string, mode: PracticeMode) => {
    if (isBeginnerSet) return; // Beginner mode doesn't track wrong answers for progress
    const quality = mode === "flashcard" ? 2 : 1;
    recordAnswer(cardId, setId, quality, mode);
  };

  const flushProgressCombined = async () => {
    if (isBeginnerSet) {
      await useFlashcardStore.getState().flushBeginnerProgress();
    } else {
      await flushProgress();
    }
  };

  return { reportCorrect, reportWrong, flushProgress: flushProgressCombined, getTypingTargetTime };
}
