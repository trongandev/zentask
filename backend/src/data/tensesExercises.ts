export type ExerciseType = 'conjugation' | 'multiple_choice' | 'scramble' | 'error_identification' | 'transformation';

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  options?: string[]; // for multiple choice, scramble pieces, or error options
  correctAnswer: string | string[]; // string for conjugation/multiple choice/error, array for scramble
  explanation?: string;
  hint?: string; // for transformation
}

export interface Stage {
  id: number;
  title: string;
  description: string;
  exercises: Exercise[];
}

export const TENSES_STAGES: Stage[] = [
  {
    id: 1,
    title: "Nhập môn (Thì Hiện tại)",
    description: "Hiện tại đơn, Hiện tại tiếp diễn, Hiện tại hoàn thành.",
    exercises: [
      {
        id: "1_1",
        type: "conjugation",
        question: "She ________ (go) to school by bus every day.",
        correctAnswer: "goes",
        explanation: "Dấu hiệu 'every day' -> Hiện tại đơn. Chủ ngữ 'She' số ít nên động từ thêm 'es'."
      },
      {
        id: "1_2",
        type: "multiple_choice",
        question: "I ________ my homework yet.",
        options: ["didn't finish", "haven't finished", "don't finish", "am not finishing"],
        correctAnswer: "haven't finished",
        explanation: "Từ 'yet' -> Hiện tại hoàn thành dạng phủ định (haven't + V3/ed)."
      },
      {
        id: "1_3",
        type: "scramble",
        question: "Xếp các từ sau thành câu đúng:",
        options: ["soccer", "They", "playing", "are", "now"],
        correctAnswer: ["They", "are", "playing", "soccer", "now"],
        explanation: "Dấu hiệu 'now' -> Hiện tại tiếp diễn: S + am/is/are + V-ing."
      },
      {
        id: "1_4",
        type: "conjugation",
        question: "Listen! Someone ________ (knock) at the door.",
        correctAnswer: "is knocking",
        explanation: "'Listen!' chỉ hành động đang diễn ra tại thời điểm nói -> Hiện tại tiếp diễn."
      },
      {
        id: "1_5",
        type: "multiple_choice",
        question: "He ________ this book three times.",
        options: ["reads", "is reading", "has read", "read"],
        correctAnswer: "has read",
        explanation: "Số lần thực hiện hành động ('three times') -> Hiện tại hoàn thành."
      }
    ]
  },
  {
    id: 2,
    title: "Quá khứ & Tương lai cơ bản",
    description: "Quá khứ đơn, Quá khứ tiếp diễn, Tương lai đơn, Be going to.",
    exercises: [
      {
        id: "2_1",
        type: "conjugation",
        question: "Yesterday, I ________ (see) him at the park.",
        correctAnswer: "saw",
        explanation: "'Yesterday' -> Quá khứ đơn. Động từ bất quy tắc của 'see' là 'saw'."
      },
      {
        id: "2_2",
        type: "multiple_choice",
        question: "While I ________ TV, the phone rang.",
        options: ["was watching", "watched", "am watching", "watch"],
        correctAnswer: "was watching",
        explanation: "Hành động đang diễn ra trong quá khứ (Quá khứ tiếp diễn) thì có hành động khác xen vào (Quá khứ đơn)."
      },
      {
        id: "2_3",
        type: "scramble",
        question: "Xếp các từ sau thành câu đúng:",
        options: ["going", "am", "to", "I", "visit", "tomorrow", "her"],
        correctAnswer: ["I", "am", "going", "to", "visit", "her", "tomorrow"],
        explanation: "Dự định đã được lên kế hoạch từ trước -> Dùng cấu trúc 'Be going to'."
      },
      {
        id: "2_4",
        type: "conjugation",
        question: "I think it ________ (rain) tomorrow.",
        correctAnswer: "will rain",
        explanation: "'I think' diễn tả một dự đoán không có căn cứ chắc chắn -> Tương lai đơn (will + V)."
      },
      {
        id: "2_5",
        type: "multiple_choice",
        question: "At 8 PM last night, we ________ dinner.",
        options: ["ate", "were eating", "have eaten", "eat"],
        correctAnswer: "were eating",
        explanation: "Một thời điểm xác định trong quá khứ ('At 8 PM last night') -> Quá khứ tiếp diễn."
      }
    ]
  },
  {
    id: 3,
    title: "Nâng cao",
    description: "Các thì Hoàn thành tiếp diễn và Quá khứ hoàn thành.",
    exercises: [
      {
        id: "3_1",
        type: "conjugation",
        question: "By the time he arrived, we ________ (already finish) dinner.",
        correctAnswer: "had already finished",
        explanation: "Hành động kết thúc trước một hành động khác trong quá khứ -> Quá khứ hoàn thành."
      },
      {
        id: "3_2",
        type: "multiple_choice",
        question: "She ________ for 3 hours before she took a break.",
        options: ["has been studying", "had been studying", "was studying", "studied"],
        correctAnswer: "had been studying",
        explanation: "Hành động kéo dài liên tục đến một thời điểm trong quá khứ -> Quá khứ hoàn thành tiếp diễn."
      },
      {
        id: "3_3",
        type: "scramble",
        question: "Xếp các từ sau thành câu đúng:",
        options: ["waiting", "We", "have", "been", "for", "here", "an hour"],
        correctAnswer: ["We", "have", "been", "waiting", "here", "for", "an hour"],
        explanation: "Hành động bắt đầu từ quá khứ và kéo dài liên tục đến hiện tại -> Hiện tại hoàn thành tiếp diễn."
      },
      {
        id: "3_4",
        type: "conjugation",
        question: "By next month, I ________ (work) here for 5 years.",
        correctAnswer: "will have been working",
        explanation: "Nhấn mạnh tính liên tục của hành động cho đến một mốc thời gian trong tương lai -> Tương lai hoàn thành tiếp diễn."
      },
      {
        id: "3_5",
        type: "multiple_choice",
        question: "I ________ my keys. I can't find them anywhere now.",
        options: ["have lost", "lost", "had lost", "lose"],
        correctAnswer: "have lost",
        explanation: "Hành động xảy ra trong quá khứ nhưng để lại kết quả ở hiện tại ('can't find them now') -> Hiện tại hoàn thành."
      }
    ]
  },
  {
    id: 4,
    title: "Master (Phối hợp thì)",
    description: "Cấu trúc đặc biệt, phối hợp thì, câu phức.",
    exercises: [
      {
        id: "4_1",
        type: "error_identification",
        question: "Look! The birds flies in the sky.",
        options: ["Look!", "The birds", "flies", "in the sky"],
        correctAnswer: "flies", // Need user to type "are flying"
        explanation: "'Look!' là dấu hiệu của Hiện tại tiếp diễn. Cần sửa thành 'are flying'."
      },
      {
        id: "4_2",
        type: "transformation",
        question: "The last time I saw her was 2 years ago.",
        hint: "I haven't",
        correctAnswer: "seen her for 2 years",
        explanation: "Cấu trúc: The last time S + V2 + was + time ago => S + haven't/hasn't + V3 + for + time."
      },
      {
        id: "4_3",
        type: "error_identification",
        question: "If I was you, I would study harder.",
        options: ["If", "was", "would", "study"],
        correctAnswer: "was", // Need user to type "were"
        explanation: "Câu điều kiện loại 2: Tobe luôn dùng 'were' cho mọi ngôi. Sửa thành 'were'."
      },
      {
        id: "4_4",
        type: "transformation",
        question: "She started working here in 2020.",
        hint: "She has",
        correctAnswer: "been working here since 2020",
        explanation: "S + started + V-ing + in + year => S + has/have + been + V-ing + since + year."
      },
      {
        id: "4_5",
        type: "error_identification",
        question: "By the time we will get to the cinema, the movie will have started.",
        options: ["By the time", "will get", "to", "will have started"],
        correctAnswer: "will get", // Need user to type "get"
        explanation: "Trong mệnh đề trạng ngữ chỉ thời gian (By the time), không dùng thì tương lai mà dùng hiện tại đơn. Sửa thành 'get'."
      }
    ]
  }
];
