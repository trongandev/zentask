export type GrammarExerciseType = 'classification' | 'matching' | 'cloze' | 'transformation';

export interface GrammarExercise {
  id: string;
  type: GrammarExerciseType;
  question: string;
  explanation?: string;
  
  // Classification (Drag & Drop / Click to select)
  categories?: string[];
  items?: { word: string; category: string }[];
  
  // Matching (Connect clauses)
  leftPairs?: { id: string; text: string }[];
  rightPairs?: { id: string; text: string }[];
  correctMatches?: Record<string, string>; // leftId -> rightId
  
  // Cloze Test (Fill in blanks in text)
  textWithBlanks?: string; // e.g. "I have [1] apple and [2] bananas."
  blanksOptions?: Record<string, string[]>; // { "1": ["a", "an", "the"], "2": ["some", "any"] }
  blanksAnswers?: Record<string, string>; // { "1": "an", "2": "some" }
  
  // Transformation (Rewrite sentence)
  hint?: string;
  correctAnswer?: string;
}

export interface GrammarStage {
  id: number;
  title: string;
  description: string;
  exercises: GrammarExercise[];
}

export const GRAMMAR_STAGES: GrammarStage[] = [
  {
    id: 1,
    title: "Thành phần câu (Word Classes)",
    description: "Danh từ (Số ít/nhiều, đếm được/không đếm được), Đại từ, Tính từ, Trạng từ, Giới từ, Quán từ.",
    exercises: [
      {
        id: "1_1",
        type: "classification",
        question: "Phân loại các danh từ sau thành Đếm được và Không đếm được:",
        categories: ["Đếm được (Countable)", "Không đếm được (Uncountable)"],
        items: [
          { word: "Apple", category: "Đếm được (Countable)" },
          { word: "Information", category: "Không đếm được (Uncountable)" },
          { word: "Car", category: "Đếm được (Countable)" },
          { word: "Water", category: "Không đếm được (Uncountable)" },
          { word: "Knowledge", category: "Không đếm được (Uncountable)" },
        ],
        explanation: "Các từ chỉ khái niệm trừu tượng (Information, Knowledge) hoặc chất lỏng (Water) thường không đếm được."
      },
      {
        id: "1_2",
        type: "cloze",
        question: "Điền quán từ (A/An/The) hoặc để trống thích hợp vào đoạn văn:",
        textWithBlanks: "Yesterday, I saw [1] old man walking in [2] park. [3] man was holding [4] umbrella.",
        blanksOptions: {
          "1": ["a", "an", "the", "Ø"],
          "2": ["a", "an", "the", "Ø"],
          "3": ["A", "An", "The", "Ø"],
          "4": ["a", "an", "the", "Ø"]
        },
        blanksAnswers: {
          "1": "an",
          "2": "the",
          "3": "The",
          "4": "an"
        },
        explanation: "Lần đầu nhắc đến dùng 'an old man', 'an umbrella'. Lần sau nhắc lại dùng 'The man'. 'the park' xác định trong ngữ cảnh."
      }
    ]
  },
  {
    id: 2,
    title: "Cấu trúc liên kết (Sentence Structures)",
    description: "Sự hòa hợp Chủ - Vị, Câu so sánh, Câu bị động.",
    exercises: [
      {
        id: "2_1",
        type: "matching",
        question: "Ghép hai vế để tạo thành câu bị động đúng:",
        leftPairs: [
          { id: "A", text: "The house" },
          { id: "B", text: "My wallet" },
          { id: "C", text: "These books" }
        ],
        rightPairs: [
          { id: "1", text: "was stolen yesterday." },
          { id: "2", text: "were written by Shakespeare." },
          { id: "3", text: "was built in 1990." }
        ],
        correctMatches: {
          "A": "3",
          "B": "1",
          "C": "2"
        },
        explanation: "The house was built (nhà được xây), My wallet was stolen (ví bị trộm), These books were written (sách được viết)."
      },
      {
        id: "2_2",
        type: "transformation",
        question: "They are building a new hospital in the city.",
        hint: "A new hospital",
        correctAnswer: "is being built in the city",
        explanation: "Câu bị động của thì Hiện tại tiếp diễn: S + am/is/are + being + V3/ed."
      }
    ]
  },
  {
    id: 3,
    title: "Mệnh đề nâng cao",
    description: "Câu gián tiếp, Câu điều kiện (0-3), Mệnh đề quan hệ.",
    exercises: [
      {
        id: "3_1",
        type: "matching",
        question: "Ghép hai vế để tạo thành Câu điều kiện đúng:",
        leftPairs: [
          { id: "A", text: "If it rains tomorrow," },
          { id: "B", text: "If I had a million dollars," },
          { id: "C", text: "If you had studied harder," }
        ],
        rightPairs: [
          { id: "1", text: "you would have passed the exam." },
          { id: "2", text: "we will stay at home." },
          { id: "3", text: "I would buy a big house." }
        ],
        correctMatches: {
          "A": "2",
          "B": "3",
          "C": "1"
        },
        explanation: "A-2 (Loại 1), B-3 (Loại 2 - không có thật ở hiện tại), C-1 (Loại 3 - không có thật ở quá khứ)."
      },
      {
        id: "3_2",
        type: "cloze",
        question: "Chọn đại từ quan hệ (Who, Whom, Which, Whose, That) thích hợp:",
        textWithBlanks: "The man [1] I met yesterday is a doctor. He has a daughter [2] name is Lily. They live in a house [3] is very old.",
        blanksOptions: {
          "1": ["who", "whom", "which", "whose"],
          "2": ["who", "whom", "which", "whose"],
          "3": ["who", "whom", "which", "whose"]
        },
        blanksAnswers: {
          "1": "whom",
          "2": "whose",
          "3": "which"
        },
        explanation: "'whom' thay cho tân ngữ chỉ người, 'whose' chỉ sở hữu, 'which' thay cho vật."
      }
    ]
  },
  {
    id: 4,
    title: "Master Ngữ pháp",
    description: "Đảo ngữ, Câu giả định, Động từ khuyết thiếu, Phân từ/Danh động từ.",
    exercises: [
      {
        id: "4_1",
        type: "transformation",
        question: "He had never seen such a beautiful sunset before.",
        hint: "Never before",
        correctAnswer: "had he seen such a beautiful sunset",
        explanation: "Đảo ngữ với Never: Never + trợ động từ + S + V."
      },
      {
        id: "4_2",
        type: "classification",
        question: "Phân loại các động từ sau dựa theo từ đi kèm phía sau (To V hay V-ing):",
        categories: ["+ V-ing (Gerund)", "+ To V (Infinitive)"],
        items: [
          { word: "Enjoy", category: "+ V-ing (Gerund)" },
          { word: "Decide", category: "+ To V (Infinitive)" },
          { word: "Avoid", category: "+ V-ing (Gerund)" },
          { word: "Plan", category: "+ To V (Infinitive)" },
          { word: "Mind", category: "+ V-ing (Gerund)" }
        ],
        explanation: "Enjoy, Avoid, Mind đi với V-ing. Decide, Plan đi với To V."
      }
    ]
  }
];
