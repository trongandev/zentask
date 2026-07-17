export const BEGINNER_GRAMMAR_DATA: Record<string, any> = {
  "c1-1": {
    discovery: [
      { en: "I am tired.", vi: "Tôi mệt.", highlight: "am" },
      { en: "She is happy.", vi: "Cô ấy vui.", highlight: "is" },
      { en: "They are here.", vi: "Họ ở đây.", highlight: "are" },
    ],
    guidedQuestion: {
      question: "Bạn thấy điểm khác biệt lớn nhất giữa câu 'I am tired' và 'Tôi mệt' là gì?",
      options: [
        { id: 1, text: "Tiếng Anh luôn cần động từ 'tobe' (am/is/are) trước tính từ, còn tiếng Việt thì không cần chữ 'là'." },
        { id: 2, text: "Tiếng Anh dùng sai từ vựng, đáng lẽ phải là 'I tired'." }
      ],
      correctId: 1
    },
    rule: {
      title: "Trong tiếng Anh, TẤT CẢ các câu đều phải có Động từ.",
      description: "Nếu câu không có động từ hành động (như chạy, nhảy, ăn), bạn bắt buộc phải dùng động từ To-be (am/is/are)."
    },
    trueFalse: {
      sentence: "I am a student.",
      translation: "Tôi là học sinh.",
      isActuallyCorrect: true
    },
    fixError: {
      incorrect: "I tired.",
      translation: "Tôi mệt.",
      correct: "I am tired."
    },
    freeOutput: {
      prompt: "Hãy viết 1 câu tiếng Anh miêu tả cảm xúc hiện tại của bạn (có sử dụng to-be)."
    }
  },
  "c1-2": {
    discovery: [
      { en: "I have one apple.", vi: "Tôi có một quả táo.", highlight: "apple" },
      { en: "I have two apples.", vi: "Tôi có hai quả táo.", highlight: "apples" },
      { en: "She has three cats.", vi: "Cô ấy có ba con mèo.", highlight: "cats" },
    ],
    guidedQuestion: {
      question: "Khi nói về số lượng từ 2 trở lên, từ trong tiếng Anh thay đổi thế nào so với tiếng Việt?",
      options: [
        { id: 1, text: "Tiếng Anh phải thêm 's' hoặc 'es' vào cuối danh từ, còn tiếng Việt chỉ cần thêm số từ đằng trước." },
        { id: 2, text: "Cả tiếng Anh và tiếng Việt đều không thay đổi danh từ." }
      ],
      correctId: 1
    },
    rule: {
      title: "Danh từ đếm được số nhiều luôn có đuôi -s hoặc -es.",
      description: "Khác với tiếng Việt (chỉ thêm 'những/các' hoặc số đếm), tiếng Anh bắt buộc phải biến đổi hình thái của danh từ."
    },
    trueFalse: {
      sentence: "I have two dog.",
      translation: "Tôi có hai con chó.",
      isActuallyCorrect: false
    },
    fixError: {
      incorrect: "I have three book.",
      translation: "Tôi có 3 quyển sách.",
      correct: "I have three books."
    },
    freeOutput: {
      prompt: "Viết 1 câu tiếng Anh kể về số lượng đồ vật bạn đang có trên bàn (ví dụ: I have two pens)."
    }
  },
  // Các bài sau sẽ có cấu trúc tương tự, lấy tạm mock data
};
