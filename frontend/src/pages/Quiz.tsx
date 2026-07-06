import { HelpCircle, Clock, Target, Play, Award, RotateCcw } from "lucide-react";

export function Quiz() {
  const quizzes = [
    {
      id: 1,
      title: "Kiểm tra Từ vựng - Unit 1-5",
      description: "Ôn tập lại toàn bộ từ vựng đã học trong 5 bài đầu tiên.",
      questions: 20,
      duration: 15, // minutes
      difficulty: "Trung bình",
      difficultyColor: "text-orange-600 bg-orange-50 border-orange-100",
      completed: true,
      score: 85,
      color: "bg-blue-500",
    },
    {
      id: 2,
      title: "Ngữ pháp: Các thì hiện tại",
      description: "Phân biệt Thì hiện tại đơn, tiếp diễn và hoàn thành.",
      questions: 15,
      duration: 10,
      difficulty: "Dễ",
      difficultyColor: "text-green-600 bg-green-50 border-green-100",
      completed: false,
      score: 0,
      color: "bg-teal-500",
    },
    {
      id: 3,
      title: "TOEIC Reading Part 5 Mini Test",
      description: "Bài kiểm tra rút gọn mô phỏng part 5 đề thi TOEIC.",
      questions: 30,
      duration: 25,
      difficulty: "Khó",
      difficultyColor: "text-red-600 bg-red-50 border-red-100",
      completed: false,
      score: 0,
      color: "bg-purple-500",
    },
    {
      id: 4,
      title: "Phrasal Verbs thông dụng",
      description: "Kiểm tra cách sử dụng 50 cụm động từ phổ biến nhất.",
      questions: 25,
      duration: 20,
      difficulty: "Trung bình",
      difficultyColor: "text-orange-600 bg-orange-50 border-orange-100",
      completed: false,
      score: 0,
      color: "bg-indigo-500",
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src="/mascot/Lopy (12).png" className="w-16 h-16 object-contain drop-shadow-md" alt="Mascot" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Trắc nghiệm nhanh (Quiz)</h1>
            <p className="text-gray-500">Đánh giá kiến thức và kiểm tra trình độ của bạn.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4">
                <div className={`w-14 h-14 rounded-2xl ${quiz.color} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                  <HelpCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {quiz.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{quiz.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-6">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${quiz.difficultyColor}`}>
                {quiz.difficulty}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                <Target className="w-3.5 h-3.5" />
                {quiz.questions} câu
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                <Clock className="w-3.5 h-3.5" />
                {quiz.duration} phút
              </span>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
              {quiz.completed ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Điểm số</p>
                    <p className="text-sm font-bold text-green-600">{quiz.score}/100</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-medium text-gray-400">
                  Chưa làm
                </div>
              )}

              <button className={`px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                quiz.completed 
                  ? "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200" 
                  : "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-transparent"
              }`}>
                {quiz.completed ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Làm lại
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Bắt đầu thi
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
